/* PORTAMI A — Yourbea, rifatta il 15/10/2026
   ============================================================
   Questo file porta qualcuno da qualche parte: sceglie la meta, chiede il
   percorso a piedi, e dice le svolte al momento giusto. Non parla e non
   scarica: riceve le fonti da fuori e restituisce frasi.

   LE REGOLE, e il difetto che le ha dettate:
   1. SE DICI LA CITTÀ, SI RISPETTA LA CITTÀ. «Portami a via Vincenzo
      Gioberti, Latina» portava a Cisterna di Latina, venti chilometri più in
      là: in Italia le vie si chiamano tutte uguali. Si confronta il COMUNE
      per intero — «Latina» non è «Cisterna di Latina» — e solo dopo la
      provincia.
   2. LE SVOLTE SI DICONO QUANDO CI SEI QUASI SOPRA. Venticinque metri. Una
      svolta annunciata a cento metri, chi non vede non la può usare.
   3. PRIMA DI TUTTO, DOVE SEI E QUANTO MANCA. «Sei in via Fabio Filzi. Per
      arrivare a via Gioberti, 250 metri a piedi. Cammina verso sud-est.»
   4. L'ARRIVO LO DICE L'APP, UNA VOLTA SOLA. Valhalla aggiunge un suo «sei
      arrivato a destinazione» e spezza la stessa svolta in due manovre
      uguali: entrambe le cose si scartano dove si legge il percorso.
   5. SE IL PERCORSO NON ARRIVA, RESTA LA BUSSOLA. Direzione e distanza in
      linea d'aria: poco, ma meglio di niente.
   6. NIENTE IMPERATIVI SUGLI ATTRAVERSAMENTI. Non si dice mai dove mettere i
      piedi: il GPS a piedi sbaglia dai dieci ai trenta metri.
*/

'use strict';

function Guida(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;                           // (lat,lon,lat,lon) -> metri
  var verso = o.verso;                         // (lat,lon,lat,lon) -> gradi
  var diario = o.diario || function () {};
  var VICINO_SVOLTA = o.vicinoSvolta || 25;
  /* quanto bisogna essersi avvicinati perche' allontanarsi voglia dire
     «l'ho passata», e di quanto bisogna allontanarsi */
  var SONO_STATO_VICINO = o.sonoStatoVicino || 60;
  var MI_STO_ALLONTANANDO = o.miStoAllontanando || 25;
  var SALTA_AVANTI = o.saltaAvanti || 50;
  var piuVicinoMai = null, quandoMisurata = -1;
  var PREAVVISO = o.preavviso || 70;        // «fra settanta metri, gira a destra»
  var ARRIVATO = o.arrivato || 22;
  var FILO = o.filo || 20000;        // non si tace mai piu' di venti secondi
  var FUORI = o.fuori || 45;                // quanto ci si può scostare dal tracciato
  var FUORI_DA = o.fuoriDa || 15000;        // e per quanto, prima di dirlo

  var meta = null;                 // { n, lat, lon }
  var svolte = [];
  var prossima = 0;
  var preavvisata = -1;            // quale svolta è già stata annunciata da lontano
  var linea = [];                  // il tracciato, per accorgersi se si esce
  var fuoriDa = 0;                 // da quando si è fuori strada
  var quantoManca = 0;
  var ultimoAvviso = 0;

  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* cittaNelTesto(): le parole che possono essere il nome del comune. Chi
     parla non mette le virgole, quindi si guardano le ultime parole. */
  function cittaNelTesto(testo) {
    var pezzi = String(testo).split(',');
    var coda = pezzi.length > 1 ? normalizza(pezzi[pezzi.length - 1]) : '';
    if (!coda) {
      var p = normalizza(testo).split(' ');
      coda = p.slice(-2).join(' ');
    }
    var fuori = ['via', 'viale', 'piazza', 'corso', 'largo', 'vicolo', 'strada', 'numero',
                 'il', 'lo', 'la', 'di', 'del', 'della', 'dei', 'a', 'al', 'in', 'su', 'per'];
    return coda.split(' ').filter(function (w) { return w.length > 3 && fuori.indexOf(w) < 0; });
  }

  /* cittaCombacia(): OGNI parola del comune deve essere fra quelle dette.
     «Latina» passa, «Cisterna di Latina» no. */
  function cittaCombacia(dove, parole) {
    var d = normalizza(dove);
    if (!d || !parole.length) return false;
    var minori = ['di', 'del', 'della', 'dei', 'degli', 'in', 'sul', 'sui', 'a', 'al', 'la', 'il', 'lo', 'd'];
    var sue = d.split(' ').filter(function (w) { return w && minori.indexOf(w) < 0; });
    if (!sue.length) return false;
    for (var i = 0; i < sue.length; i++) if (parole.indexOf(sue[i]) < 0) return false;
    return true;
  }

  /* parolePiene(): le parole che contano in una richiesta — via, piazza,
     numero e gli articoli non distinguono niente. */
  function parolePiene(testo) {
    var fuori = ['via', 'viale', 'piazza', 'corso', 'largo', 'vicolo', 'strada', 'numero',
                 'civico', 'del', 'dei', 'della', 'degli', 'delle', 'portami', 'casa'];
    return normalizza(testo).split(' ').filter(function (w) {
      return w.length >= 4 && fuori.indexOf(w) < 0 && !/^\d+$/.test(w);
    });
  }

  /* scegli(): fra i candidati di un cercatore di indirizzi, quello giusto.
     Il 16/10 «portami a casa», con casa scritta «Via dei Corazzieri n. 47»,
     ha portato Vince a UNDICI CHILOMETRI, da un posto che si chiama «Non si
     mangia», in via degli Equi. Il cercatore, confuso dal «n. 47», aveva
     risposto con quello; e noi lo abbiamo preso senza guardare se c'entrava
     qualcosa. Adesso un candidato che non ha NESSUNA parola in comune con
     quello che è stato chiesto si scarta: se restano solo quelli, si dice
     che non si è trovato, invece di incamminarsi. */
  function scegli(candidati, parole, qui, testo) {
    if (!candidati || !candidati.length) return null;

    /* ============================================================
       IL NOME DELLA VIA DEVE COMBACIARE, NON UNA PAROLA QUALSIASI
       Provato il 20/10 col suo indirizzo vero, chiedendolo a Photon:
         «Via dei Corazzieri 47 Latina» → Via dei MARRUCINI 47, a due
             chilometri: il cercatore ha preso il numero civico e ha
             buttato via il nome della strada;
         «Via dei Corazzieri Latina»   → tre Via dei Corazzieri a ROMA.
       Il controllo che c'era passava tutti e due. Chiedeva che UNA delle
       parole piene comparisse da qualche parte nel candidato — e «latina»
       e' una parola piena, quindi «Via dei Marrucini, Latina» passava.
       Una via sbagliata nella citta' giusta e' sbagliata uguale: a chi non
       vede fai fare due chilometri a vuoto.
       Adesso: la parola che distingue la STRADA deve stare nel NOME del
       candidato, e la citta' si guarda a parte. */
    var dellaCitta = {};
    (parole || []).forEach(function (w) { dellaCitta[normalizza(w)] = 1; });

    if (testo) {
      var piene = parolePiene(testo);
      var dellaVia = piene.filter(function (w) { return !dellaCitta[w]; });
      if (dellaVia.length) {
        var pertinenti = candidati.filter(function (c) {
          /* SOLO il nome, non la citta': se no «Latina» fa passare
             qualunque via di Latina */
          var suo = normalizza(c.nome || '');
          return dellaVia.some(function (w) { return suo.indexOf(w) >= 0; });
        });
        if (!pertinenti.length) {
          diario('SCELTA: nessun candidato ha «' + dellaVia.join(' ') + '» nel nome');
          return null;
        }
        candidati = pertinenti;
      }
    }

    /* LA CITTA' SBAGLIATA SI BUTTA, non si mette in fondo. Se uno ha detto
       «Latina», tre Via dei Corazzieri a Roma non sono «meno buone»: sono
       un'altra cosa. Se pero' nessun candidato e' nella citta' chiesta, si
       restituisce niente — meglio «non l'ho trovato» che portarlo a Roma. */
    if (parole.length) {
      /* LA SCALA, che c'era e che avevo buttato via rifacendo questa
         funzione: prima il comune esatto, poi la frazione o il nome, poi
         la provincia. Senza, fra tre «Via Vincenzo Gioberti» tutte in
         provincia di Latina sceglieva la piu' vicina a chi cerca — e cioe'
         Aprilia invece di Latina. La prova vecchia l'ha preso al volo.
         La novita' e' solo che chi non sta in NESSUNO di quei gradini
         adesso si butta, invece di finire in fondo alla lista: tre Via dei
         Corazzieri a Roma, per chi ha detto «Latina», non sono una
         scelta peggiore — sono un'altra cosa. */
      var gradini = [
        function (c) { return cittaCombacia(c.citta, parole); },
        function (c) { return cittaCombacia(c.frazione, parole) || cittaCombacia(c.nome, parole); },
        function (c) { return parole.some(function (p) { return normalizza([c.provincia, c.regione].join(' ')).indexOf(p) >= 0; }); }
      ];
      var trovati = null;
      for (var g = 0; g < gradini.length && !trovati; g++) {
        var q = candidati.filter(gradini[g]);
        if (q.length) trovati = q;
      }
      if (!trovati) {
        diario('SCELTA: nessun candidato in «' + parole.join(' ') + '»');
        return null;
      }
      candidati = trovati;
    }

    /* ============================================================
       UNA VIA LUNGA ARRIVA A PEZZI: SI PRENDE IL MEZZO, NON L'IMBOCCO
       Provato il 20/10 con l'indirizzo vero di Vince, «Via dei Corazzieri
       47, Roma»: Photon risponde con TRE pezzi della stessa via, distanti
       513 metri fra loro, e il numero civico lo ignora del tutto —
       verificato anche con Nominatim: il 47 in OpenStreetMap non c'e'.
       Noi prendevamo il piu' vicino a chi cerca, cioe' l'imbocco: e
       arrivando all'imbocco l'app diceva «sei arrivato» mentre casa sua
       stava quattrocento metri piu' avanti. Parole sue, il 20/10: «quando
       sono arrivato a casa mi diceva torna indietro di 400 metri».
       Se i candidati sono pezzi della STESSA via, si prende il punto di
       mezzo: l'errore peggiore si dimezza, e soprattutto non e' piu'
       sistematicamente dalla parte sbagliata. E si segna `aPezzi`, perche'
       chi chiama lo possa DIRE invece di far finta di niente. */
    /* STESSA VIA vuol dire: stesso nome, STESSA CITTA', e vicine fra loro.
       Senza le ultime due, «Via Roma» di Milano e «Via Roma» di Latina
       hanno lo stesso nome e il punto di mezzo cade in Toscana, a
       duecentosettanta chilometri da tutte e due. L'ha preso la prova
       vecchia, e aveva ragione lei. Due chilometri e' la lunghezza di una
       via lunga: oltre, sono due vie diverse che si chiamano uguale. */
    /* e dev'essere una VIA. Due farmacie che si chiamano tutte e due
       «Farmacia», a settecento metri, sono due farmacie: mediarle vuol dire
       mandare uno in mezzo alla strada fra le due. Una via la si riconosce
       da come comincia. */
    var PAROLE_DI_STRADA = /^(via|viale|piazza|piazzale|corso|largo|vicolo|strada|lungo|circonvallazione|salita|discesa|borgo|contrada|traversa)\b/i;
    var stessaVia = candidati.length > 1 &&
      PAROLE_DI_STRADA.test(String(candidati[0].nome || '').trim()) &&
      candidati.every(function (c) {
      return normalizza(c.nome || '') === normalizza(candidati[0].nome || '') &&
             normalizza(c.citta || '') === normalizza(candidati[0].citta || '') &&
             dist(candidati[0].lat, candidati[0].lon, c.lat, c.lon) < 2000;
    });
    if (stessaVia) {
      var la = 0, lo = 0;
      candidati.forEach(function (c) { la += c.lat; lo += c.lon; });
      var mezzo = { nome: candidati[0].nome, citta: candidati[0].citta,
                    frazione: candidati[0].frazione, provincia: candidati[0].provincia,
                    regione: candidati[0].regione,
                    lat: la / candidati.length, lon: lo / candidati.length,
                    aPezzi: candidati.length };
      var piuLontano = 0;
      candidati.forEach(function (c) {
        var q = dist(mezzo.lat, mezzo.lon, c.lat, c.lon);
        if (q > piuLontano) piuLontano = q;
      });
      mezzo.incerto = Math.round(piuLontano);
      diario('SCELTA: ' + candidati.length + ' pezzi della stessa via, prendo il mezzo (±' + mezzo.incerto + ' m)');
      return mezzo;
    }

    var mig = candidati[0], dm = Infinity;
    candidati.forEach(function (c) {
      var d = dist(qui.lat, qui.lon, c.lat, c.lon);
      if (d < dm) { dm = d; mig = c; }
    });
    return mig;
  }


  /* leStrade(): i nomi delle vie che si percorreranno, in ordine.
     «Invece di dirmi, per andare in via dei Corazzieri, quali strade
     dovevo percorrere… poi mi diceva i numeri civici» (Vince, 16/10,
     provandola in scooter). Prima di partire uno vuole il disegno del
     percorso in testa: tre nomi bastano a farselo. Le istruzioni del
     percorso i nomi ce li hanno già dentro — «svolta a destra su via
     Ettore Rolli» — e non li stavamo usando. */
  function leStrade(svolte) {
    var nomi = [];
    (svolte || []).forEach(function (sv) {
      var m = String(sv.testo || '').match(/\b(?:su|in|lungo)\s+((?:via|viale|piazza|piazzale|corso|largo|vicolo|strada|lungotevere|ponte|salita|discesa|borgo|contrada)\b[^,.;]*)/i);
      if (!m) return;
      var n2 = m[1].trim().replace(/\s+/g, ' ');
      if (!nomi.length || nomi[nomi.length - 1].toLowerCase() !== n2.toLowerCase()) nomi.push(n2);
    });
    return nomi;
  }

  function elencoStrade(nomi) {
    if (!nomi.length) return '';
    /* tre, non dieci: un elenco lungo non si tiene a mente camminando, e
       le svolte le ridirà una per una al momento giusto. */
    var tre = nomi.slice(0, 3);
    var coda = nomi.length > 3 ? ', e poi ancora' : '';
    if (tre.length === 1) return tre[0] + coda;
    return tre.slice(0, -1).join(', ') + ' e ' + tre[tre.length - 1] + coda;
  }

  /* verso(): la meta è fissata. Restituisce la frase d'apertura. */
  function vaiA(m, qui, dove, percorso) {
    meta = m; svolte = []; prossima = 0; piuVicinoMai = null; quandoMisurata = -1; ultimoAvviso = 0; preavvisata = -1; fuoriDa = 0;
    linea = (percorso && percorso.linea && percorso.linea.length > 1) ? percorso.linea : [];
    quantoManca = dist(qui.lat, qui.lon, m.lat, m.lon);
    var dovesei = dove && dove.via ? ('Sei in ' + dove.via + (dove.civico ? ' ' + dove.civico : '') + '. ') : '';
    if (percorso && percorso.svolte && percorso.svolte.length) {
      svolte = percorso.svolte;
      prossima = 1;                             // la prima si dice adesso
      diario('GUIDA: ' + svolte.length + ' svolte per ' + m.n);
      var strade = elencoStrade(leStrade(svolte));
      return { tipo: 'parto', livello: 'guida',
               testo: 'Per arrivare a ' + m.n + ': ' + metri(percorso.metri) + ' a piedi' +
                      (svolte.length > 1 ? ', ' + (svolte.length - 1) + (svolte.length === 2 ? ' svolta' : ' svolte') : '') + '. ' +
                      (strade ? 'Si passa per ' + strade + '. ' : '') +
                      minuscolaPrima(svolte[0].testo) };
    }
    // REGOLA 5: senza percorso, resta la bussola
    diario('GUIDA: senza percorso, uso la bussola');
    return { tipo: 'parto', livello: 'guida',
             testo: dovesei + 'Ti porto a ' + m.n + ', ' + metri(quantoManca) + '. ' +
                    capo(versoDove(qui, m)) + '. Non ho la strada passo passo: ti dico da che parte mano a mano.' };
  }

  /* passi(): la stessa misura in passi, come in parti/scena.js. Un passo
     e' settantacinque centimetri. */
  /* LA DISTANZA LA DICE UNA PARTE SOLA: parti/distanza.js (7 prove).
     «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
     21/10): ce n'erano quattro, con arrotondamenti diversi, e questa
     diceva i METRI mentre il resto dell'app diceva i passi. */
  /* si PASSA, come dist e verso: in questa cartella le parti non si
     cercano fra loro, se le fa dare. Senza, resta il modo vecchio — piu'
     grezzo, ma nessuno resta muto. */
  var laMisura = o.distanza || null;
  function passi(m) {
    return laMisura ? laMisura.nudi(m) : (Math.round(m / 0.75) + ' passi');
  }

  /* puoi(): «gira a destra in via Rossi» diventa «puoi svoltare a destra in
     via Rossi». E' la differenza fra un ordine e un avviso: nel preavviso
     non devi fare niente adesso, devi solo saperlo. Parole di Vince:
     «poi puoi svoltare a destra». */
  /* puoi(): «poi PUOI svoltare a destra». Dopo «puoi» ci va l'infinito,
     e l'elenco dei verbi era corto: le istruzioni vere ne usano molti
     altri, e quelli che mancavano uscivano cosi' com'erano — «poi puoi
     attraversa il ponte», «poi puoi mantieni la destra». Scritto fa
     ridere; detto da una voce sintetica a chi non vede fa dubitare di
     tutta la frase. */
  var INFINITO = [
    [/^gira a /, 'svoltare a '], [/^svolta a /, 'svoltare a '],
    [/^svolta /, 'svoltare '], [/^gira /, 'girare '],
    [/^continua /, 'continuare '], [/^prendi /, 'prendere '],
    [/^cammina /, 'camminare '], [/^attraversa /, 'attraversare '],
    [/^mantieni /, 'mantenere '], [/^tieni /, 'tenere '],
    [/^imbocca /, 'imboccare '], [/^entra /, 'entrare '],
    [/^esci /, 'uscire '], [/^sali /, 'salire '], [/^scendi /, 'scendere '],
    [/^segui /, 'seguire '], [/^percorri /, 'percorrere '],
    [/^resta /, 'restare '], [/^rimani /, 'rimanere '],
    [/^torna /, 'tornare '], [/^fai /, 'fare '], [/^passa /, 'passare '],
    [/^vai /, 'andare '], [/^procedi /, 'procedere '],
    [/^svolta leggermente a /, 'svoltare leggermente a ']
  ];
  function puoi(testo) {
    var t = minuscola(String(testo || ''));
    for (var i = 0; i < INFINITO.length; i++) {
      if (INFINITO[i][0].test(t)) { t = t.replace(INFINITO[i][0], INFINITO[i][1]); break; }
    }
    t = t.replace(/[.\s]+$/, '');          // il punto lo mette chi compone la frase
    return /^puoi /.test(t) ? t : ('puoi ' + t);
  }

  /* passo(): si chiama a ogni posizione nuova mentre si va verso la meta. */
  function passo(qui, adesso, s) {
    if (!meta) return null;
    var d = dist(qui.lat, qui.lon, meta.lat, meta.lon);
    if (d < ARRIVATO) {
      var n = meta.n;
      /* ARRIVARE NON BASTA: BISOGNA SAPERE DOVE VOLTARSI. Un navigatore
         per chi guida dice «sei arrivato» e ha finito, perché poi uno
         guarda. A piedi, e senza vedere, il numero giusto non serve a
         niente se non sai da che parte è la porta. Si dice da che lato
         rispetto a come stai camminando, e cosa ha accanto — una
         tabaccheria, un bar — che è il modo in cui si riconoscono i posti
         davvero. L'accanto lo passa chi chiama, dai dati dei negozi. */
      var lato = direzione(qui, meta);
      var dove = lato === 'continua così' ? 'proprio davanti a te'
               : lato === 'gira a destra' ? 'sulla destra'
               : lato === 'gira a sinistra' ? 'sulla sinistra'
               : lato ? 'dietro di te' : '';
      var accanto = s && s.accanto ? ' Accanto c\'è ' + s.accanto + '.' : '';
      meta = null; svolte = []; prossima = 0; preavvisata = -1; linea = [];
      return { tipo: 'arrivato', livello: 'emergenza',
               testo: 'Sei arrivato: ' + n + (dove ? ', ' + dove : '') + '.' + accanto };
    }
    /* ============================================================
       UNA SVOLTA SI PASSA ANCHE SENZA PASSARCI SOPRA
       «Avevo superato il ponte Marconi e mi diceva che a 200 metri
       dovevo superare il ponte Marconi» (Vince, 23/10).
       Era questa riga: una svolta si considerava fatta SOLO entrando
       nei venticinque metri dal suo punto. Se ci passi di lato — un
       marciapiede largo, un ponte preso dall'altra corsia, il GPS che
       sbaglia di trenta metri fra i palazzi — quel cerchio non lo
       tocchi mai. E l'app resta ferma su quella svolta per sempre,
       ripetendola mentre la distanza CRESCE: duecento metri, trecento.
       Chi non vede torna indietro a cercare un ponte che ha gia'
       attraversato.
       Due modi di accorgersene, tutt'e due necessari:
       1. ti sei avvicinato e poi ti stai allontanando: l'hai passata;
       2. una svolta PIU' AVANTI nell'elenco e' molto piu' vicina di
          questa: sei gia' oltre, e si salta li'.
       ============================================================ */
    if (svolte.length && prossima < svolte.length) {
      var q0 = dist(qui.lat, qui.lon, svolte[prossima].lat, svolte[prossima].lon);
      if (piuVicinoMai === null || prossima !== quandoMisurata) {
        piuVicinoMai = q0; quandoMisurata = prossima;
      } else if (q0 < piuVicinoMai) {
        piuVicinoMai = q0;
      } else if (piuVicinoMai < SONO_STATO_VICINO && q0 - piuVicinoMai > MI_STO_ALLONTANANDO) {
        diario('SVOLTA PASSATA: ero a ' + Math.round(piuVicinoMai) +
               ' m, adesso a ' + Math.round(q0) + ' — vado alla prossima');
        prossima++;
        piuVicinoMai = null;
      }
      /* e se una piu' avanti e' molto piu' vicina, sei gia' oltre */
      for (var sa = prossima + 1; sa < svolte.length; sa++) {
        var qa = dist(qui.lat, qui.lon, svolte[sa].lat, svolte[sa].lon);
        if (qa + SALTA_AVANTI < q0) {
          diario('SVOLTE SALTATE: la ' + sa + ' e a ' + Math.round(qa) +
                 ' m, la ' + prossima + ' a ' + Math.round(q0));
          prossima = sa; piuVicinoMai = null;
          break;
        }
      }
    }
    // REGOLA 2: la svolta quando ci sei quasi sopra
    if (svolte.length && prossima < svolte.length) {
      var s = svolte[prossima];
      var quanto = dist(qui.lat, qui.lon, s.lat, s.lon);
      if (quanto < VICINO_SVOLTA) {
        prossima++;
        piuVicinoMai = null;
        ultimoAvviso = adesso;
        return { tipo: 'svolta', livello: 'guida', testo: 'Adesso: ' + minuscola(s.testo) };
      }
      /* IL PREAVVISO. «Penso debba avere quasi la funzione di navigatore
         camminando» (Vince, 16/10). Un navigatore dice la svolta DUE volte:
         una da lontano, per prepararti, e una quando ci sei. A piedi i
         settanta metri sono una ventina di secondi: il tempo di spostarsi
         sul lato giusto del marciapiede, che per chi non vede è tutto. */
      if (quanto < PREAVVISO && preavvisata !== prossima) {
        preavvisata = prossima;
        ultimoAvviso = adesso;
        /* LE PAROLE SUE, 20/10: «mancano 50 metri all'incrocio, poi puoi
           svoltare a destra». Due cose in una frase: quanto manca, e cosa
           farai dopo. «Fra 70 metri gira a destra» e' un ordine da
           eseguire adesso che pero' si eseguira' fra venti secondi; cosi'
           invece uno sa che deve solo continuare, e cosa lo aspetta. */
        return { tipo: 'preavviso', livello: 'guida',
                 testo: 'Mancano ' + (Math.round(quanto / 10) * 10) + ' metri, ' +
                        passi(quanto) + '. Poi ' + puoi(s.testo) + '.' };
      }
    }
    /* FUORI STRADA. Un navigatore se ne accorge e lo dice, invece di
       continuare a dare svolte che non c'entrano più niente. */
    if (linea.length > 1) {
      var scarto = dalTracciato(qui);
      if (scarto > FUORI) {
        if (!fuoriDa) fuoriDa = adesso;
        if (adesso - fuoriDa > FUORI_DA) {
          fuoriDa = 0;
          return { tipo: 'fuori', livello: 'guida', metri: Math.round(scarto),
                   testo: 'Ti sei allontanato dal percorso di ' + Math.round(scarto) +
                          ' metri. Aspetta che te ne cerco un altro.' };
        }
      } else { fuoriDa = 0; }
    }
    /* ============================================================
       IL FILO: «CONTINUA COSÌ PER 200 PASSI»
       «In pratica non guida nessuno: ti dice solo in che strada sei e
       qualche volta qual è l'incrocio» (Vince, 20/10, dopo «portami a
       casa»). E poi la frase che spiega tutto: «lungo una strada avrei
       bisogno d'indicazioni tipo continua così per 200 passi, oppure 50
       metri; poi puoi svoltare a destra».
       Un navigatore per chi vede TACE fra una svolta e l'altra, perché chi
       guida guarda la strada e sa di essere sulla strada giusta. Chi non
       vede non lo sa: ogni secondo di silenzio è un dubbio, e dopo venti
       secondi di dubbio uno si ferma. Il filo non dà un ordine nuovo: dice
       che quello di prima vale ancora, e per quanto.
       In passi E in metri, perché i passi si camminano e i metri si
       controllano. */
    if (adesso - ultimoAvviso > FILO) {
      ultimoAvviso = adesso;
      quantoManca = d;
      var manca = d;
      var poi = '';
      if (svolte.length && prossima < svolte.length) {
        manca = dist(qui.lat, qui.lon, svolte[prossima].lat, svolte[prossima].lon);
        poi = ' Poi ' + puoi(svolte[prossima].testo) + '.';
      }
      return { tipo: 'filo', livello: 'cenno',
               testo: 'Continua così per ' + passi(manca) + ', ' +
                      (Math.round(manca / 10) * 10) + ' metri.' + poi };
    }
    return null;
  }

  /* direzione(): da che parte, detto a chi CAMMINA.
     «Ma io non so nord sud est dove sono… forse dovresti dirmi continua
     così» — Vince, 16/10, in strada. Ed è esatto: il nord non ce l'ha
     nessuno in testa mentre cammina, e a chi non vede non serve a niente.
     Quello che si può sapere è da che parte stai andando, perché lo dice lo
     spostamento fra due posizioni; e allora si parla rispetto a TE.
     Se non si sa ancora come sei girato non si inventa un punto cardinale:
     si chiede di fare due passi, e dopo si sa. */
  /* dalTracciato(): quanto sei lontano dalla strada che ti avevo dato. */
  function dalTracciato(qui) {
    var d = Infinity;
    for (var i = 0; i < linea.length; i++) {
      var q = dist(qui.lat, qui.lon, linea[i][0], linea[i][1]);
      if (q < d) d = q;
    }
    return d;
  }
  function minuscola(t) {
    var s2 = String(t || '');
    return s2.charAt(0).toLowerCase() + s2.slice(1);
  }

  function direzione(qui, m) {
    var g = verso(qui.lat, qui.lon, m.lat, m.lon);
    if (!qui || typeof qui.direzione !== 'number' || qui.direzioneBuona === false) return null;
    var r = ((g - qui.direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 30) return 'continua così';
    if (r > 30 && r <= 110) return 'gira a destra';
    if (r < -30 && r >= -110) return 'gira a sinistra';
    return 'torna indietro';
  }
  function versoDove(qui, m) {
    var d = direzione(qui, m);
    return d || 'fai qualche passo e ti dico da che parte';
  }
  function capo(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }
  function minuscolaPrima(t) { return capo(String(t || '')); }
  function metri(m) {
    if (m < 25) return 'a pochi passi';
    if (m < 1000) return 'a ' + (Math.round(m / 10) * 10) + ' metri';
    return 'a ' + (Math.round(m / 100) / 10) + ' chilometri';
  }

  function lascia() {
    if (!meta) return null;
    meta = null; svolte = []; prossima = 0; preavvisata = -1; linea = [];
    return { tipo: 'lascio', livello: 'guida', testo: 'Va bene, lascio perdere.' };
  }

  /* dalComando(): «portami a ...» → il testo della meta, o null. */
  function dalComando(testo) {
    var t = normalizza(testo);
    var m = t.match(/(?:portami|accompagnami|voglio andare|andare)\s+(?:in|a|al|alla|allo|ai|alle|verso)\s+(.{3,})/);
    return m ? m[1] : null;
  }

  return {
    vaiA: vaiA, passo: passo, lascia: lascia, dalComando: dalComando,
    scegli: scegli, cittaNelTesto: cittaNelTesto, cittaCombacia: cittaCombacia,
    leStrade: leStrade, elencoStrade: elencoStrade,
    parolePiene: parolePiene,
    /* esportata perche' il banco possa provarla: «poi puoi attraversa
       il ponte» non si vede finche' non si guarda la frase intera. */
    puoi: puoi,
    meta: function () { return meta; },
    svolteRimaste: function () { return Math.max(0, svolte.length - prossima); }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Guida;
if (typeof window !== 'undefined') window.Guida = Guida;
