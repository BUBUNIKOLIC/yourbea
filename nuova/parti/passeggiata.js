/* LE PASSEGGIATE — Yourbea, 15/10/2026
   ============================================================
   Una passeggiata è un giro a tappe dentro una città: il Duomo, il
   Battistero, la Steccata, la Pilotta. Nella vecchia app c'erano 102
   percorsi; qui ci sono, con le loro tappe, e si fanno a voce.

   Questo file non parla, non scarica e non disegna: riceve le passeggiate,
   i luoghi e dove sei, e restituisce una decisione per volta. Così si prova
   in un secondo, senza telefono.

   IL CONTRATTO, detto da Vince: «le tappe una per volta, e si deve poter
   dire avanti, ancora, ferma».

   LE REGOLE, e il difetto che le ha dettate:
   1. UNA TAPPA PER VOLTA. Ogni chiamata restituisce al massimo una
      decisione. Nella vecchia app l'annuncio del primo luogo copriva la
      conferma «seguiamo questo percorso», e sembrava non aver fatto niente.
   2. LA TAPPA SI RACCONTA QUANDO CI SEI. Entro trentacinque metri. Dire
      com'è fatta una facciata mentre sei a quattrocento metri è una bugia
      detta a chi non può controllare. «Avanti» quindi non racconta la tappa
      che viene: dice COME SI CHIAMA e DOVE È, e la racconta quando ci arrivi.
   3. LA TAPPA È QUELLA DOVE SEI, non quella che tocca all'app. Chi fa il
      giro al contrario, o salta un pezzo, arriva alla quinta tappa mentre
      l'app aspetta la terza: si racconta quella dove sei e si tira avanti
      da lì.
   4. «ANCORA» SCENDE DI UN GRADINO sulla tappa in corso — com'è fatta,
      cosa vedere, l'approfondimento da manuale — e quando è finita lo dice.
      Sono gli stessi gradini del racconto: chi segue una passeggiata non
      deve imparare altri comandi.
   5. SI DICE SEMPRE IN CHE CITTÀ È. Nella vecchia app i percorsi di Torre
      del Greco finivano in cima solo perché erano i primi dell'archivio:
      il nome da solo — «Il centro sepolto» — non dice dove sia.
   6. DISTANZE IN PASSI, finché i passi si contano: sotto i trecento metri.
      Sopra, metri e chilometri: «quattromila passi» non è una misura.
   7. NIENTE IMPERATIVI. Mai «attraversa», mai «gira a destra»: il GPS a
      piedi sbaglia dai dieci ai trenta metri. Si dice da che parte è la
      tappa e quanto manca, e il passo lo scegli tu.
   8. NIENTE PROMESSE CHE L'APP NON MANTIENE. Non «ti guido», non «ti porto
      per mano»: l'app dice ogni tappa quando ci arrivi. Nella vecchia
      prometteva «quando vuoi, dimmi: percorsi» e poi restava zitta.
   9. LA SCENA INTORNO NON È ROBA DI QUI. Piazze, alberi, attraversamenti e
      negozi sono di Utilità e li dice parti/scena.js. In una passeggiata si
      parla di arte, architettura e storia, cioè delle schede dei luoghi.
      Per questo una tappa che non è un luogo da raccontare non entra.
*/

'use strict';

function Passeggiata(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;                        // (lat,lon,lat,lon) -> metri
  var verso = o.verso;                      // (lat,lon,lat,lon) -> gradi
  var ora = o.ora || function () { return Date.now(); };
  var ARRIVATO = o.arrivato || 35;          // REGOLA 2: entro questi metri ci sei
  var PASSO = 0.75;                         // metri, come in parti/scena.js
  var PASSI_FINO_A = o.passiFinoA || 300;   // REGOLA 6
  var VICINO_MAX = o.vicinoMax || 5000;     // oltre, non è «qui»: vedi elenco()

  var tutte = [];                           // le passeggiate con le tappe risolte
  var in_corso = null;                      // quella che si sta facendo
  var quale = 0;                            // a che tappa siamo (indice)
  var gradino = {};                         // nome tappa -> gradini già detti
  var raccontate = {};                      // le tappe già raccontate
  var proposte = [];                        // l'ultimo elenco detto, per «comincia la prima»
  var annunciate = {};                      // tappa -> quando ne ho detto il nome
  var filoFatto = {};                       // i pezzi di racconto già detti
  var filoQuando = 0, filoDove = null;      // quando e dove ho detto l'ultimo
  var FILO_OGNI = o.filoOgni || 18000;      // non più spesso di così
  var FILO_PASSI = o.filoPassi || 25;       // e solo se ti sei mosso di tanto
  var FILO_BASTA = o.filoBasta || 60;       // vicino alla tappa, si tace
  var APPENA = o.appena || 30000;           // vedi racconta(): niente nome due volte di fila

  /* conDati(): lega le tappe ai luoghi. Una tappa è il NOME di un luogo più
     le sue coordinate: il nome da solo non basta, perché «Basilica di Santa
     Croce» c'è a Torre del Greco e a Firenze. Se una tappa non si ritrova
     fra i luoghi, o non è un luogo da raccontare (REGOLA 9), si butta: una
     tappa muta è peggio di una tappa che non c'è. */
  function conDati(passeggiate, luoghi) {
    var perNome = {};
    (luoghi || []).forEach(function (p) {
      if (!perNome[p.n]) perNome[p.n] = [];
      perNome[p.n].push(p);
    });
    tutte = (passeggiate || []).map(function (pa) {
      var tappe = [];
      (pa.t || []).forEach(function (t) {
        var fra = perNome[t.n] || [], mig = null, dm = Infinity;
        fra.forEach(function (p) {
          var d = dist(p.lat, p.lon, t.la, t.lo);
          if (d < dm) { dm = d; mig = p; }
        });
        if (!mig || dm > 150) return;               // non si ritrova: si butta
        if (!(mig.k >= 1)) return;                  // REGOLA 9: non è un luogo
        tappe.push(suoTesto(t, mig));
      });
      return { id: pa.id, n: pa.n, tema: pa.tema, citta: pa.citta || '',
               metri: pa.metri || 0, linea: pa.p || [], tappe: tappe };
    }).filter(function (pa) { return pa.tappe.length >= 2; });
    return tutte.length;
  }

  /* suoTesto(): UNA PASSEGGIATA A TEMA PARLA DEL SUO TEMA. In «Caravaggio a
     Roma» la tappa è San Luigi dei Francesi, ma quello che si va a vedere
     non è la facciata di Giacomo della Porta: sono le tre tele della
     cappella Contarelli. Allora la tappa può portarsi il suo testo, e quello
     vince sulla scheda del luogo.
     E QUANDO IL TESTO CAMBIA, LE CLIP SI BUTTANO: le clip incise dicono la
     scheda del luogo, parola per parola. Tenerle farebbe sentire la facciata
     mentre sullo schermo c'è scritto il quadro — il testo e l'audio che si
     scollano è il difetto peggiore di tutti, perché nessuno dei due sa di
     essere sbagliato. */
  function suoTesto(t, p) {
    /* «come» dice come ci si arriva quando non ci si arriva a piedi — a
       Venezia, San Michele in Isola. Si perdeva qui: la tappa veniva
       ricostruita dal luogo e questo campo non passava. */
    if (!t.d && !t.i && !t.a && !t.poi && !t.come) return p;
    return { n: p.n, lat: p.lat, lon: p.lon, k: p.k, t: p.t, y: p.y,
             d: t.d || p.d, i: t.i || p.i, a: t.a || p.a, poi: t.poi || null,
             come: t.come || '' };
  }

  /* vicine(): le passeggiate in ordine di vicinanza, misurata sulla tappa
     più vicina — non sulla partenza: se una passeggiata ti passa accanto a
     metà strada, la puoi prendere da lì. */
  function vicine(qui, quante) {
    var ord = tutte.map(function (pa) {
      var dm = Infinity;
      pa.tappe.forEach(function (p) {
        var d = dist(qui.lat, qui.lon, p.lat, p.lon);
        if (d < dm) dm = d;
      });
      return { pa: pa, m: dm, dallaPrima: dist(qui.lat, qui.lon, pa.tappe[0].lat, pa.tappe[0].lon) };
    });
    ord.sort(function (a, b) { return a.m - b.m; });
    return quante ? ord.slice(0, quante) : ord;
  }

  /* ============================================================
     «QUI C'E' IL PERCORSO BERNINI»
     «Quando camminando mi avvicino a un percorso potremmo dire: qui c'e'
     il percorso Bernini o Borromini» (Vince, 23/10).
     I 137 giri c'erano e bisognava chiederli. Ma un turista che passa
     davanti all'inizio di una passeggiata non sa che esiste: non puo'
     chiedere una cosa di cui non sa il nome. Glielo si dice.
     LE REGOLE, perche' non diventi un venditore ambulante:
     1. IL PERCORSO STA IN UN POSTO, non a un punto di partenza: «secondo
        me i percorsi devono essere legati alla posizione» (Vince, 23/10).
        Si misura sulla tappa PIÙ VICINA, così chi lo incrocia a metà
        strada se lo sente offrire — e comincia() lo fa già partire da lì.
        Centocinquanta metri: oltre, non ci sei sopra.
     2. UNA VOLTA SOLA. Ogni giro si offre una volta per sessione: se uno
        ha detto di no camminando, non glielo si ripete ogni due minuti.
     3. UNA OGNI CINQUE MINUTI, e mai mentre ne sta gia' facendo una.
     4. SOLO A PIEDI E SOLO IN TURISMO: e' una cosa da visita.
     5. SI CHIEDE, NON SI ANNUNCIA: «vuoi seguire questo o continuare?».
        Chi cammina sta già andando da qualche parte; buttargli addosso una
        passeggiata senza chiedere gliela fa spegnere. */
  var offerte = {};
  var ultimaOfferta = 0;
  var inAttesa = null;                      // l'offerta appena fatta, in attesa di sì o no
  var VICINO = o.vicinoPercorso || 150;
  var FRA_UNA_E_L_ALTRA = o.fraUnOfferta || 300000;
  var RISPOSTA_VALE = 90000;

  function quiCeIlPercorso(qui, quando) {
    if (in_corso) return null;
    if (!qui || typeof qui.lat !== 'number') return null;
    var adesso = quando || ora();
    if (adesso - ultimaOfferta < FRA_UNA_E_L_ALTRA) return null;
    var meglio = null;
    for (var i = 0; i < tutte.length; i++) {
      var pa = tutte[i];
      if (!pa.tappe || !pa.tappe.length) continue;
      if (offerte[pa.id]) continue;
      /* REGOLA 1: la tappa PIÙ VICINA, non la prima. */
      var dm = Infinity;
      for (var j = 0; j < pa.tappe.length; j++) {
        var d = dist(qui.lat, qui.lon, pa.tappe[j].lat, pa.tappe[j].lon);
        if (d < dm) dm = d;
      }
      if (dm > VICINO) continue;
      if (!meglio || dm < meglio.m) meglio = { pa: pa, m: dm };
    }
    if (!meglio) return null;
    offerte[meglio.pa.id] = true;
    ultimaOfferta = adesso;
    proposte = [meglio.pa.id];
    inAttesa = { id: meglio.pa.id, quando: adesso };
    return { tipo: 'percorso-qui', livello: 'cenno', quale: meglio.pa.id,
             /* «qui c'è il percorso Bernini o Borromini»: la parola di
                Vince è «percorso», e nessuno dei 137 nomi veri comincia con
                «passeggiata» — sono titoli, e vanno fra virgolette. */
             testo: 'Qui c\u2019\u00e8 il percorso \u00ab' + meglio.pa.n + '\u00bb. ' +
                    'Vuoi seguire questo o continuare?' };
  }

  /* rispostaAllOfferta(): «sì», «seguiamo», «continuo». Dopo la domanda una
     parola sola basta, e vale per un minuto e mezzo: passato quello, «sì»
     non è più una risposta a niente. */
  function rispostaAllOfferta(t, quando) {
    if (!inAttesa) return null;
    if ((quando || ora()) - inAttesa.quando > RISPOSTA_VALE) { inAttesa = null; return null; }
    if (/\b(?:continuo|continuiamo|continua|dopo|magari dopo|lascia stare|niente|no grazie|no)\b/.test(t)) {
      var q = inAttesa; inAttesa = null;
      return { cosa: 'continuo', quale: q.id };
    }
    if (/\b(?:si|certo|va bene|volentieri|questo|seguiamo|seguilo|segui|lo seguo|facciamolo|ok)\b/.test(t)) {
      var q2 = inAttesa; inAttesa = null;
      return { cosa: 'comincia', nomeId: q2.id };
    }
    return null;
  }


  /* elenco(): «che passeggiate ci sono». Tre, non dieci: un elenco parlato
     più lungo di tre non si tiene a mente.
     E SOLO QUELLE DOVE SEI. Provandola a Parma, dove di passeggiate ce n'è
     una, l'app offriva come seconda e terza due giri di Mantova «a 52
     chilometri da te»: a chi ha chiesto cosa può fare adesso, non servono.
     Se qui non c'è niente si dice, e si dice dov'è la più vicina — che è
     un'informazione, non una proposta. */
  function elenco(qui, quante) {
    var tutte_ord = vicine(qui);
    var tre = tutte_ord.filter(function (x) { return x.m <= VICINO_MAX; }).slice(0, quante || 3);
    if (!tre.length) {
      proposte = [];
      if (!tutte_ord.length) return { tipo: 'niente', livello: 'guida',
                                      testo: 'Non ho passeggiate da nessuna parte.' };
      var piu = tutte_ord[0];
      return { tipo: 'niente', livello: 'guida',
               testo: 'Qui intorno non ho passeggiate. La più vicina è ' + piu.pa.n +
                      (piu.pa.citta ? ', a ' + piu.pa.citta : '') + ', ' + quanto(piu.m) + ' da qui.' };
    }
    proposte = tre.map(function (x) { return x.pa.id; });
    var frasi = tre.map(function (x, i) {
      return (i === 0 ? 'La prima' : i === 1 ? 'La seconda' : 'La terza') + ': ' + dillaCosi(x);
    });
    return { tipo: 'elenco', livello: 'guida', proposte: proposte.slice(),
             testo: frasi.join(' ') + ' Per cominciarne una, dimmi: comincia la prima.' };
  }

  /* dillaCosi(): come si presenta una passeggiata. REGOLA 5: la città c'è
     sempre, e si dice quante tappe e quanto è lunga, perché «la seconda»
     non si scegli al buio. */
  function dillaCosi(x) {
    var pa = x.pa;
    return pa.n + citta(pa) + ', ' +
           pa.tappe.length + ' tappe, ' + lunga(pa.metri) +
           (x.m > 120 ? ', comincia ' + quanto(x.dallaPrima) + ' da te' : '') + '.';
  }
  /* citta(): «a Parma», ma non quando il nome la dice già — «Parma — il
     centro: Duomo, Battistero, Steccata, Pilotta, a Parma» era la stessa
     figura del «Latina, Latina» della guida. */
  function citta(pa) {
    if (!pa.citta) return '';
    if (pulisci(pa.n).indexOf(pulisci(pa.citta)) >= 0) return '';
    return ', a ' + pa.citta;
  }

  /* comincia(): per numero («la prima» dell'ultimo elenco), per id, o per
     nome. Non si inventa niente: se non si capisce quale, lo si dice. */
  function comincia(cosa, qui) {
    var pa = null;
    if (typeof cosa === 'number') {
      var id = proposte[cosa];
      if (!id) {                                  // nessun elenco prima: la più vicina
        var tre = vicine(qui, cosa + 1);
        pa = tre.length > cosa ? tre[cosa].pa : null;
      } else {
        pa = trovaId(id);
      }
    } else if (cosa && cosa.id) {
      pa = cosa;
    } else if (typeof cosa === 'string') {
      pa = trovaId(cosa) || perNomeDetto(cosa, qui);
    }
    if (!pa) return { tipo: 'non-capito', livello: 'guida',
                      testo: 'Non ho capito quale passeggiata. Dimmi «passeggiate» e te le elenco.' };

    in_corso = pa; gradino = {}; raccontate = {}; annunciate = {};
    filoFatto = {}; filoQuando = 0; filoDove = null;
    /* REGOLA 3: si parte dalla tappa più vicina a dove sei, non sempre dalla
       prima: chi è già in mezzo al giro non deve tornare al punto di partenza. */
    quale = 0;
    var dm = Infinity;
    pa.tappe.forEach(function (p, i) {
      var d = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d < dm && d < 120) { dm = d; quale = i; }
    });
    var t = pa.tappe[quale];
    var d0 = dist(qui.lat, qui.lon, t.lat, t.lon);
    annunciate[t.n] = ora();
    /* REGOLA 1: una cosa per volta. Qui si dice solo che si comincia e dov'è
       la prima tappa; raccontarla è un'altra decisione, e arriva quando ci
       sei. REGOLA 8: niente «ti guido». */
    return { tipo: 'parto', livello: 'guida', passeggiata: pa, luogo: t,
             quale: quale, quante: pa.tappe.length,
             testo: 'Passeggiata ' + pa.n + citta(pa) + '. ' +
                    pa.tappe.length + ' tappe, ' + lunga(pa.metri) + '. ' +
                    numeroTappa(quale, pa) + ': ' + t.n + ', ' + dove(qui, t) + ', ' + quanto(d0) + '. ' +
                    (d0 <= ARRIVATO ? 'Ci siamo.' : 'Te la racconto quando ci arrivi.') + ' ' +
                    'Dimmi «ancora» per saperne di più, «avanti» per la prossima, «ferma» per lasciarla.' };
  }

  function trovaId(id) {
    for (var i = 0; i < tutte.length; i++) if (tutte[i].id === id) return tutte[i];
    return null;
  }
  /* perNomeDetto(): «comincia la passeggiata del corallo». Si cerca fra le
     parole del nome, e a pari merito vince la più vicina. */
  function perNomeDetto(testo, qui) {
    var parole = pulisci(testo).split(' ').filter(function (w) { return w.length > 3; });
    if (!parole.length) return null;
    var mig = null, punti = 0, dmin = Infinity;
    vicine(qui).forEach(function (x) {
      var n = pulisci(x.pa.n + ' ' + x.pa.citta + ' ' + x.pa.tema);
      var p = parole.filter(function (w) { return n.indexOf(w) >= 0; }).length;
      if (p > punti || (p === punti && p > 0 && x.m < dmin)) { punti = p; dmin = x.m; mig = x.pa; }
    });
    return punti ? mig : null;
  }
  function pulisci(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* passo(): si chiama a ogni posizione nuova. Quando arrivi a una tappa, la
     racconta. Niente altro: le distanze che calano non si annunciano, se no
     una passeggiata di otto tappe diventa un conto alla rovescia. */
  function passo(qui) {
    if (!in_corso) return null;
    var tappe = in_corso.tappe;
    // REGOLA 3: la tappa è quella dove sei
    for (var i = quale; i < tappe.length; i++) {
      var p = tappe[i];
      if (raccontate[p.n]) continue;
      if (dist(qui.lat, qui.lon, p.lat, p.lon) <= ARRIVATO) {
        quale = i;
        return racconta(p);
      }
    }
    return null;
  }

  /* racconta(): il primo gradino di una tappa — com'è fatta.
     IL NOME NON SI DICE DUE VOLTE DI FILA. Cominciando la passeggiata con la
     prima tappa sotto i piedi si sentiva «Tappa 1 di 13: Battistero di
     Parma, a est, a una ventina di passi. Ci siamo» e subito dopo «Tappa 1
     di 13: Battistero di Parma. Romanica…»: l'app sembrava incantata. Se il
     nome è stato detto da poco si attacca la scheda e basta; se invece
     l'annuncio era di dieci minuti prima, il nome ci vuole — chi cammina
     intanto ha pensato ad altro. */
  function racconta(p) {
    /* REGOLA d del filo: quello che restava da dire sulla strada non si
       recupera davanti alla chiesa. E il filo della strada SEGUENTE non
       parte finché non ti sei rimesso in cammino: si segna qui il punto
       della tappa, così chi resta a guardarla non se lo sente addosso. */
    filoQuando = ora(); filoDove = { lat: p.lat, lon: p.lon };
    raccontate[p.n] = true;
    gradino[p.n] = 1;
    var appena = annunciate[p.n] && (ora() - annunciate[p.n]) < APPENA;
    annunciate[p.n] = ora();
    return { tipo: 'tappa', livello: 'guida', luogo: p, passeggiata: in_corso,
             quale: quale, quante: in_corso.tappe.length,
             testo: appena ? (p.d || p.n) : (numeroTappa(quale, in_corso) + ': ' + p.n + '. ' + (p.d || '')) };
  }

  /* avanti(): la prossima tappa. REGOLA 2: si dice come si chiama e dov'è,
     non com'è fatta — quello si sente arrivando. */
  function avanti(qui) {
    if (!in_corso) return null;
    var tappe = in_corso.tappe;
    if (quale >= tappe.length - 1) {
      var nome = in_corso.n;
      in_corso = null; quale = 0; gradino = {}; raccontate = {};
      return { tipo: 'finita', livello: 'guida',
               testo: 'La passeggiata ' + nome + ' finisce qui. Di tappe non ne ho altre.' };
    }
    quale++;
    var t = tappe[quale];
    var d = dist(qui.lat, qui.lon, t.lat, t.lon);
    if (d <= ARRIVATO && !raccontate[t.n]) return racconta(t);   // ci sei già: si racconta
    annunciate[t.n] = ora();
    /* COME CI SI ARRIVA, quando non ci si arriva a piedi.
       Controllati tutti i salti dei 137 giri chiedendo a Valhalla la strada
       vera (strumenti/controlla-i-salti.py): su 54 salti sopra i 700 metri,
       35 si camminano normalmente — fra due monumenti in centro 800 metri
       sono niente — 18 sono lunghi, e UNO non si cammina affatto: a
       Venezia, da Ca' Vendramin Calergi alla chiesa di San Michele in
       Isola, 1.462 metri in linea d'aria e 4.454 a piedi, perche' San
       Michele e' l'isola del cimitero e ci si va in vaporetto.
       Togliere quella tappa dal giro di Codussi vorrebbe dire togliere
       proprio la sua chiesa. Si tiene, e si dice come arrivarci — che e'
       quello che farebbe una persona che ti accompagna. */
    var come = t.come ? ' ' + t.come : '';
    /* e se e' lontana, lo si dice prima: due chilometri a piedi non sono
       una sorpresa da scoprire camminando */
    var lontana = (!t.come && d > 1200) ? ' È lontana: mettiti comodo.' : '';
    return { tipo: 'prossima', livello: 'guida', luogo: t, passeggiata: in_corso,
             quale: quale, quante: tappe.length,
             testo: numeroTappa(quale, in_corso) + ': ' + t.n + ', ' + dove(qui, t) + ', ' + quanto(d) + '.' + come + lontana };
  }

  /* filo(): IL RACCONTO FRA UNA TAPPA E L'ALTRA.
     Fra due tappe oggi c'era silenzio, e sono i minuti in cui uno cammina e
     avrebbe più voglia di ascoltare. Lì va quello che le lega: perché si va
     da questa chiesa a quella, cosa è successo in mezzo.
     LE REGOLE, e perché:
     a. SI DICE CAMMINANDO, A PEZZI BREVI. Un pezzo per volta, non più
        spesso di diciotto secondi, e solo se ti sei spostato: fermo, il
        racconto è quello della tappa, non il filo.
     b. NON COPRE MAI UNA FRASE CHE SERVE A MUOVERSI. Esce come «cenno»,
        il livello che il motore della voce butta quando c'è di meglio da
        dire: una svolta, un attraversamento, l'emergenza passano sopra.
     c. SI TACE QUANDO SEI QUASI ARRIVATO. Sessanta metri: l'arrivo alla
        tappa non si taglia a metà.
     d. CHI CAMMINA VELOCE SI PERDE DEI PEZZI, E NON LI RECUPERA. Arrivato
        alla tappa, quello che restava del filo si butta: rimetterlo in
        coda farebbe sentire il racconto della strada mentre sei davanti
        alla chiesa. */
  function filo(qui, adesso) {
    if (!in_corso) return null;
    var tappe = in_corso.tappe;
    if (quale >= tappe.length) return null;
    var da = tappe[quale];
    var pezzi = (da && da.poi) || [];
    if (!pezzi.length) return null;
    if (!raccontate[da.n]) return null;              // la tappa viene prima del filo
    var prossima = tappe[quale + 1];
    if (!prossima) return null;
    if (dist(qui.lat, qui.lon, prossima.lat, prossima.lon) < FILO_BASTA) return null;   // REGOLA c
    adesso = adesso || ora();
    if (adesso - filoQuando < FILO_OGNI) return null;                                   // REGOLA a
    if (filoDove && dist(qui.lat, qui.lon, filoDove.lat, filoDove.lon) < FILO_PASSI) return null;
    for (var i = 0; i < pezzi.length; i++) {
      var chiave = da.n + '#' + i;
      if (filoFatto[chiave]) continue;
      filoFatto[chiave] = true;
      filoQuando = adesso;
      filoDove = { lat: qui.lat, lon: qui.lon };
      return { tipo: 'filo', livello: 'cenno', testo: pezzi[i],      // REGOLA b
               passeggiata: in_corso, quale: quale, quante: tappe.length };
    }
    return null;
  }

  /* ancora(): REGOLA 4, gli stessi gradini del racconto. */
  function ancora() {
    if (!in_corso) return null;
    var p = in_corso.tappe[quale];
    var g = gradino[p.n] || 0;
    if (g === 0) { gradino[p.n] = 1; raccontate[p.n] = true;
                   return { tipo: 'tappa', livello: 'guida', luogo: p, passeggiata: in_corso,
                            quale: quale, quante: in_corso.tappe.length,
                            testo: numeroTappa(quale, in_corso) + ': ' + p.n + '. ' + (p.d || '') }; }
    if (g === 1 && p.i) { gradino[p.n] = 2;
                          return { tipo: 'cosa-vedere', livello: 'guida', luogo: p,
                                   testo: 'Cosa vedere: ' + p.i }; }
    if (g <= 2 && p.a) { gradino[p.n] = 3;
                         return { tipo: 'approfondimento', livello: 'guida', luogo: p, testo: p.a }; }
    gradino[p.n] = 9;
    return { tipo: 'finito', livello: 'guida', luogo: p,
             testo: 'Di questa tappa ti ho detto tutto. Dimmi «avanti» per la prossima.' };
  }

  function ferma() {
    if (!in_corso) return null;
    var nome = in_corso.n;
    in_corso = null; quale = 0; gradino = {}; raccontate = {}; annunciate = {};
    return { tipo: 'lascio', livello: 'guida', testo: 'Lascio la passeggiata ' + nome + '.' };
  }

  /* dallaVoce(): cosa ha chiesto l'utente. Restituisce la richiesta, non la
     risposta: chi la riceve decide. */
  function dallaVoce(testo, quando) {
    var t = pulisci(testo);
    if (!t) return null;
    /* PRIMA DI TUTTO LA RISPOSTA ALLA DOMANDA. Se ho appena chiesto «vuoi
       seguire questo o continuare?», «continua» vuol dire «no grazie», non
       «raccontami di più»; e «sì» da solo non vuol dire niente altrove. */
    var r = rispostaAllOfferta(t, quando);
    if (r) return r.cosa === 'comincia' ? { cosa: 'comincia', nome: r.quale || r.nomeId }
                                        : { cosa: 'continuo' };
    /* ZITTIRE NON È LASCIARE. «Ferma», «basta», «stop» lasciano il giro —
       l'ha chiesto Vince così. Ma «zitto», «silenzio», «taci» vogliono dire
       soltanto «non parlare adesso»: chi li dice sta ancora facendo la
       passeggiata, e buttarla gli toglie le tappe che aveva davanti. */
    if (/\b(?:zitto|zitta|silenzio|taci|muto)\b/.test(t)) return null;
    if (/\b(?:ferma|fermati|basta|stop|lascia)\b/.test(t)) return { cosa: 'ferma' };
    var numeri = { prima: 0, primo: 0, uno: 0, seconda: 1, secondo: 1, due: 1, terza: 2, terzo: 2, tre: 2 };
    if (/^(?:comincia|cominciamo|inizia|iniziamo|parti|partiamo|facciamo|seguiamo|voglio fare|fammi fare)\b/.test(t) ||
        /\b(?:passeggiata|percorso)\b/.test(t)) {
      var m = t.match(/\b(prima|primo|seconda|secondo|terza|terzo|uno|due|tre)\b/);
      if (m && /^(?:comincia|cominciamo|inizia|iniziamo|parti|partiamo|facciamo|seguiamo|voglio fare|fammi fare)\b/.test(t)) {
        return { cosa: 'comincia', quale: numeri[m[1]] };
      }
      if (/^(?:comincia|cominciamo|inizia|iniziamo|parti|partiamo|facciamo|seguiamo|voglio fare|fammi fare)\b/.test(t)) {
        return { cosa: 'comincia', nome: t };
      }
    }
    if (/\b(?:passeggiate|passeggiata|percorsi|itinerari)\b/.test(t)) return { cosa: 'elenco' };
    return null;
  }

  /* ---------- le parole ---------- */
  function numeroTappa(i, pa) {
    return 'Tappa ' + (i + 1) + ' di ' + pa.tappe.length;
  }
  /* REGOLA 7: da che parte, non dove mettere i piedi. Senza bussola buona
     restano i punti cardinali: destra e sinistra, se non si sa come sei
     girato, sono bugie. */
  function dove(qui, t) {
    /* ADDOSSO NON C'È UN «DA CHE PARTE». A dodici metri la direzione la
       calcola il GPS su un rumore: provandola al Duomo di Parma, con la
       tappa sotto i piedi, l'app ha detto «dietro di te». */
    if (dist(qui.lat, qui.lon, t.lat, t.lon) < 12) return 'qui';
    var g = verso(qui.lat, qui.lon, t.lat, t.lon);
    if (qui.direzioneBuona === false || typeof qui.direzione !== 'number') {
      var card = ['a nord', 'a nord-est', 'a est', 'a sud-est', 'a sud', 'a sud-ovest', 'a ovest', 'a nord-ovest'];
      return card[Math.round(g / 45) % 8];
    }
    var r = ((g - qui.direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (r > 25 && r <= 115) return 'sulla destra';
    if (r < -25 && r >= -115) return 'sulla sinistra';
    return 'dietro di te';
  }
  /* REGOLA 6: in passi finché i passi si contano. */
  function quanto(m) {
    if (m < 8) return 'a pochi passi';
    if (m <= PASSI_FINO_A) {
      var p = Math.round(m / PASSO / 5) * 5;
      if (p <= 5) return 'a pochi passi';
      if (p < 100) return 'a una ' + dentina(p);
      return 'a ' + (Math.round(p / 10) * 10) + ' passi';
    }
    if (m < 1000) return 'a ' + (Math.round(m / 50) * 50) + ' metri';
    return 'a ' + (Math.round(m / 100) / 10).toString().replace('.', ',') + ' chilometri';
  }
  function dentina(p) {
    var nomi = { 10: 'decina di passi', 20: 'ventina di passi', 30: 'trentina di passi',
                 40: 'quarantina di passi', 50: 'cinquantina di passi', 60: 'sessantina di passi',
                 70: 'settantina di passi', 80: 'ottantina di passi', 90: 'novantina di passi' };
    var d = Math.round(p / 10) * 10;
    return nomi[d] || (p + ' passi');
  }
  function lunga(m) {
    if (!m) return 'un giro breve';
    if (m < 1000) return 'lunga ' + (Math.round(m / 50) * 50) + ' metri';
    return 'lunga ' + (Math.round(m / 100) / 10).toString().replace('.', ',') + ' chilometri';
  }

  return {
    conDati: conDati, vicine: vicine, elenco: elenco, comincia: comincia,
    passo: passo, filo: filo, avanti: avanti, ancora: ancora, ferma: ferma, dallaVoce: dallaVoce,
    quanto: quanto, dove: dove,
    quiCeIlPercorso: quiCeIlPercorso, rispostaAllOfferta: rispostaAllOfferta,
    inCorso: function () { return in_corso; },
    /* tutte le tappe del giro in corso: servono a chi scarica i dati per
       prenderseli PRIMA, mentre la rete c'è ancora */
    tappeTutte: function () { return in_corso ? in_corso.tappe.slice() : []; },
    tappa: function () { return in_corso ? in_corso.tappe[quale] : null; },
    aChePunto: function () { return in_corso ? { quale: quale + 1, quante: in_corso.tappe.length } : null; },
    linea: function () { return in_corso ? in_corso.linea : null; },
    quante: function () { return tutte.length; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Passeggiata;
if (typeof window !== 'undefined') window.Passeggiata = Passeggiata;
