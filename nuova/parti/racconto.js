/* IL RACCONTO A GRADINI — Yourbea, rifatto il 15/10/2026
   ============================================================
   Questo file decide COSA dire e QUANDO. Non parla: restituisce una frase e
   chi la riceve la passa al motore della voce. Non sa niente di audio, di
   mappe, di schermo: per questo si può provare in un secondo, senza telefono.

   IL CONTRATTO, detto da Vince il 15/10 sera:
   «il codice che non si blocca, che approfondisce i monumenti se uno si
    ferma 10 secondi».

   I GRADINI, nell'ordine:
   0. camminando → IL CENNO: «sulla destra, a ottanta metri, Palazzo Reale».
      Uno per volta, e mai due volte lo stesso luogo.
   1. fermi dieci secondi davanti a qualcosa → LA SCHEDA: com'è fatto.
   2. ancora fermi, o «ancora» → COSA VEDERE.
   3. ancora, e solo per i luoghi grandi → L'APPROFONDIMENTO «da manuale».
   4. finito: «di questo ti ho detto tutto».

   LE REGOLE CHE NASCONO DAI DIFETTI VISTI:
   - un luogo importante non si perde mai: se non si può dirlo adesso,
     resta in attesa e si dice appena si può (Gabri a Parma);
   - in Utilità (la modalità di chi non vede) i luoghi importanti si dicono
     come la guida, non come un cenno sacrificabile;
   - fermarsi si misura sullo SPOSTAMENTO, non sulla velocità dichiarata dal
     telefono: a piedi, fermi, il GPS continua a muoversi di qualche metro;
   - niente distanze esatte per gli attraversamenti: quello lo fa un altro
     file. Qui si parla solo di luoghi da raccontare.
*/

'use strict';

function Racconto(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var FERMO_PER = o.fermoPer || 10000;      // dieci secondi, come ha detto Vince
  var FERMO_RAGGIO = o.fermoRaggio || 12;   // entro dodici metri si è «fermi»
  var RIDILLO_DOPO = o.ridilloDopo || 90000;
  var dist = o.dist || function (a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // stato: dove sono fermo da quando, cosa ho già detto, a che gradino sono
  var fermoDa = 0, fermoLat = null, fermoLon = null;
  var detti = {};            // nome -> {quando, lat, lon}
  var gradino = {};          // nome -> quanti gradini ho già detto
  var inCorso = null;        // il luogo di cui sto raccontando
  var ultimoInCorsa = 0;     // l'ultima cosa detta mentre si va in macchina
  var IN_CORSA_OGNI = o.inCorsaOgni || 45000;

  /* ---------- PRIMA COS'HAI DAVANTI, POI LA STORIA ----------
     «Non basta leggere la pagina Wikipedia: serve un'audiodescrizione
     orientativa» — ed era vero. Fermandosi davanti alla Basilica di
     Massenzio si sentiva «fu fatta costruire da Massenzio agli inizi del
     IV secolo»: a chi non vede non dice niente di quello che ha davanti.
     Adesso il primo gradino e' COM'E' FATTA — quanto e' grande, di che e'
     fatta, che forma ha — e la storia e' il gradino dopo, per chi dice
     «ancora». Senza quei dati non cambia niente: resta la storia subito.
     LA DIREZIONE NON SI RIPETE: il cenno l'ha appena detta («sulla
     destra, a ottanta metri»), e ridirla dieci secondi dopo e' il
     «troppo frenetico» di Dario. */
  var fatteCosi = {};
  function comeEFatta(p) {
    if (!o.descrizione || !p || !p.n) return '';
    if (Object.prototype.hasOwnProperty.call(fatteCosi, p.n)) return fatteCosi[p.n];
    var ha = p.h || p.l || (p.mat && p.mat.length) || (p.frm && p.frm.length);
    if (!ha) { fatteCosi[p.n] = ''; return ''; }
    /* si chiama UNA VOLTA SOLA per posto: la descrizione gira le parole da
       se', e chiamarla due volte (una per contare i gradini, una per
       dirla) la farebbe girare a vuoto. */
    var f = o.descrizione.frase({ n: p.n, t: p.t, dove: '', metri: 0,
                                  altezza: p.h, larghezza: p.l,
                                  materiali: p.mat, forme: p.frm });
    fatteCosi[p.n] = (f && f.testo) || '';
    return fatteCosi[p.n];
  }

  function quantiGradini(p) {
    var n = 1;               // la scheda
    if (comeEFatta(p)) n++;  // com'è fatta, e viene prima
    if (p.i) n++;            // cosa vedere
    if (p.a) n++;            // l'approfondimento
    return n;
  }
  function giaDetto(p, qui) {
    var v = detti[p.n];
    if (!v) return false;
    if (ora() - v.quando < RIDILLO_DOPO) return true;
    // te ne sei andato e sei tornato: si può ridire
    return dist(qui.lat, qui.lon, v.lat, v.lon) < 200;
  }

  /* dove(): aggiorna il senso di «fermo». Si chiama a ogni posizione nuova. */
  function dove(qui) {
    if (fermoLat === null || dist(qui.lat, qui.lon, fermoLat, fermoLon) > FERMO_RAGGIO) {
      fermoLat = qui.lat; fermoLon = qui.lon; fermoDa = ora();
      return false;
    }
    return ora() - fermoDa >= FERMO_PER;
  }
  function fermoDaQuanto() { return fermoLat === null ? 0 : ora() - fermoDa; }

  /* prossimo(): la decisione. Restituisce null, o
     { tipo, luogo, testo, clip, livello } — niente effetti collaterali. */
  function prossimo(situazione) {
    var qui = situazione.qui;                    // {lat,lon,direzione}
    var intorno = situazione.intorno || [];      // [{p, m, rel}] già ordinati
    var modo = situazione.modo || 'tutto';       // 'servizi' | 'cultura' | 'tutto'
    var fermo = dove(qui);

    // 1. SE SONO FERMO DAVANTI A QUALCOSA: si scende di gradino
    if (fermo) {
      var vicino = (inCorso && daRaccontare(inCorso, modo)) ? inCorso : primoBuono(intorno, modo);
      if (vicino) {
        /* UTILITA' NON E' TURISMO, E FIN QUI NON SI VEDEVA.
           «Non c'è differenza tra modalità utilità e modalità turismo»
           (Vince, 19/10, provando a Fuorigrotta e a Torre del Greco). Il
           quaderno gli dà ragione: fermandosi, in UTILITA', l'app leggeva
           «Il palazzetto dello sport Mario Argento era un'opera…», «La
           piscina Felice Scandone è un complesso infrastrutturale…», «Lo
           zoo di Napoli, situato nel quartiere Fuorigrotta…». Sono schede
           da Turismo, dette a chi sta cercando di muoversi.
           Parole sue: «un non vedente in modalità utilità vuole sapere
           cosa c'è — davanti hai il municipio, lo stadio — oltre le
           fermate dell'autobus; invece il turismo vuole sapere le cose
           artistiche, storiche e architettoniche».
           Quindi: in UTILITA' si dice COS'E' e basta, e la storia resta lì
           per chi la chiede («ancora»). In TURISMO si racconta. */
        if (modo === 'servizi') {
          var quandoFermo = fermiDetti[vicino.n] || 0;
          if (ora() - quandoFermo > 180000) {
            fermiDetti[vicino.n] = ora();
            inCorso = vicino;
            return { tipo: 'aCosaServe', luogo: vicino, livello: 'guida',
                     testo: 'Qui c\'è ' + conArticolo(vicino) + '.' };
          }
          return null;
        }
        if ((gradino[vicino.n] || 0) < quantiGradini(vicino)) {
          inCorso = vicino;
          var sceso = scendiDiUnGradino(vicino);
          if (sceso && sceso.tipo !== 'finito') return sceso;
        }
      }
    }

    /* 2. IL CENNO DEL PROSSIMO LUOGO NON ANCORA DETTO — CAMMINANDO, E
       ANCHE IN MOVIMENTO, MA NON ALLO STESSO MODO.
       «Turismo non ha mai parlato» (Vince, 21/10, da Termini a casa). Il
       quaderno del telefono dava fino a 77 km/h e decine di righe «REGOLA:
       cenno non va in cultura (non a piedi)»: la regola del movimento
       buttava via tutto, e il silenzio durava venti minuti. Tacere non era
       la risposta, e non lo e' nemmeno spiegare perche' si tace.
       Lo risolve in una riga sola Microsoft Soundscape (sorgente aperto,
       licenza MIT), l'app per non vedenti di Microsoft: in macchina NON
       tace — guarda SEI VOLTE PIU' LONTANO e dice SOLO le cose grandi
       (`CalloutRangeContext.automotive`, moltiplicatore 6, piu' il filtro
       che tiene solo i landmark e le fermate). Ed e' giusto: a cinquanta
       all'ora il problema non e' che la basilica non interessa, e' che a
       duecentoquaranta metri la annunci quando ci sei gia' passato.
       Quindi in movimento: raggio per sei, solo i luoghi di rango 2 in su,
       le distanze in metri e non in passi (i passi li capisci perche' li
       fai, e seduto non ne fai nessuno), e niente «dietro di te hai
       superato» — a quella velocita' e' gia' perso. */
    var aPiedi = situazione.aPiedi !== false;
    /* E NON PIU' DI UNO OGNI TRE QUARTI DI MINUTO. Camminando il respiro
       di app.js basta, perche' i posti si presentano a passo d'uomo. In
       macchina no: a cinquanta all'ora, con un chilometro e due di
       raggio, nel centro di Roma ce ne sono settantotto a portata, e
       senza un freno uscirebbero uno ogni sei secondi — cioe' una radio
       che elenca. Quarantacinque secondi sono circa seicento metri: il
       tempo di sentirlo e di passarci davanti. */
    if (!aPiedi && ora() - ultimoInCorsa < IN_CORSA_OGNI) return null;
    for (var i = 0; i < intorno.length; i++) {
      var o = intorno[i], p = o.p;
      /* il modo va passato: senza, in Turismo passavano anche i luoghi
         senza scheda — un cenno per una cosa che poi, fermandosi, non si
         puo' raccontare */
      if (!daRaccontare(p, modo)) continue;     // qui si raccontano i luoghi
      if (giaDetto(p, qui)) continue;
      if (!aPiedi && rango(p) < 3) continue;    // in corsa, solo i punti di riferimento
      /* QUELLO CHE TI SEI GIÀ LASCIATO DIETRO. «E hai passato questo
         monumento altrettanto importante… se non lo è, dietro di te hai
         superato» (Vince, 16/10). Camminando si passa accanto a una chiesa
         senza accorgersene, e un secondo dopo è alle spalle: tacere vuol
         dire fargliela perdere per sempre. Si dice in due modi: quello che
         conta si racconta come gli altri, dicendo che è dietro; quello che
         conta meno è una riga sola, e solo finché è a portata di mano. */
      var dietro = Math.abs(o.rel) > (modo === 'cultura' ? 170 : 150);
      if (dietro) {
        if (!aPiedi) continue;                  // in corsa, quello che è dietro è già perso
        if (situazione.direzioneBuona === false) continue;   // senza bussola «dietro» è una bugia
        if (rango(p) >= 2 ? o.m > 120 : o.m > 45) continue;
      }
      if (o.m > soglia(p, modo, aPiedi)) continue;
      detti[p.n] = { quando: ora(), lat: qui.lat, lon: qui.lon };
      if (!aPiedi) ultimoInCorsa = ora();
      inCorso = p;
      gradino[p.n] = 0;
      /* In Utilità un luogo importante è GUIDA: deve aspettare il suo turno,
         non essere gettato. Era il difetto di Gabri a Parma. */
      var liv = (modo === 'servizi' && rango(p) >= 2) ? 'guida' : 'cenno';
      /* si restituiscono anche i pezzi — da che parte, quanti metri — perché
         le clip incise sono pezzi: «sulla destra» + «a 80 metri» + il nome.
         Chi riceve questa risposta non deve ricalcolarli, se no il testo e
         l'audio si disallineano. */
      if (dietro && rango(p) < 2) {
        /* uno minore, già superato: una riga e si va avanti — non si fa
           tornare indietro nessuno per una cosa che non lo merita */
        return { tipo: 'superato', luogo: p, livello: 'cenno',
                 rel: o.rel, metri: Math.round(o.m), direzioneBuona: true,
                 testo: 'Dietro di te hai superato ' + p.n + '.' };
      }
      return { tipo: 'cenno', luogo: p, livello: liv, dietro: dietro,
               rel: o.rel, metri: Math.round(o.m), aPiedi: aPiedi,
               direzioneBuona: situazione.direzioneBuona !== false,
               cardinale: situazione.cardinale || null,
               /* senza sapere come sei girato, «sulla destra» sarebbe una
                  bugia e «a nord» non dice niente: restano i metri */
               /* «e a pochi passi hai…»: prima dove, poi quanto, poi cosa.
                  Dietro si dice con parole sue, se no sembra un posto
                  nuovo invece di uno che ti sei perso. */
               testo: dietro
                 ? ('Hai appena passato ' + p.n + ', ' + metri(o.m) + ' dietro di te.')
                 : ((situazione.direzioneBuona !== false ? versoTesto(o) + ', ' : '') +
                    quanto(o.m, aPiedi) + ', ' + p.n + '.') };
    }
    return null;
  }

  /* daRaccontare(): cosa è un luogo e cosa è un servizio.
     Nei dati k vale 0 per i servizi — negozi, studi medici, attraversamenti —
     e da 1 in su per i luoghi: 1 i normali, 2 e 3 quelli grossi, chiese e
     ville. Due difetti nello stesso punto, trovati il 15/10 a Roma:
     - CAMMINANDO si chiedeva k uguale a 1, e così le ventinove chiese e ville
       segnate 2 e 3 non si raccontavano MAI, in nessuna modalità;
     - DA FERMI non si guardava affatto che cosa fosse: in Turismo, fermo in
       Via dei Corazzieri, l'app ha raccontato la ferramenta.
     La regola è una sola e non cambia con la modalità: il racconto è dei
     luoghi. I servizi in Utilità si dicono, ma per la loro strada — la via,
     i civici, le farmacie — non diventano mai racconti. */
  /* quello che si e' gia' detto stando fermi: in Utilita' non si ripete
     «qui c'e' lo stadio» ogni dieci secondi */
  var fermiDetti = {};

  /* conArticolo(): «lo stadio Diego Armando Maradona», «la chiesa di San
     Vitale». Il tipo davanti al nome, perche' il nome da solo non dice a
     che cosa serve — ed e' proprio quello che in Utilita' serve sapere. */
  function conArticolo(p) {
    var t = String(p.t || '').toLowerCase().trim();
    var n = String(p.n || '');
    if (!t) return n;
    /* SI USA LA PRIMA PAROLA DEL TIPO, non il tipo intero. Dal quaderno di
       Vince, 20/10: «Qui c'è la chiesa cattolica chiesa di San Marco
       evangelista». Il tipo era «chiesa cattolica» e il nome cominciava
       con «chiesa»: confrontando il tipo INTERO non combaciava, e ci
       infilavamo tutto davanti. E anche quando serve, davanti si mette
       solo la prima parola: «la cattedrale Santa Maria Assunta», non «la
       cattedrale cattolica Santa Maria Assunta». */
    var capo = t.split(' ')[0];
    /* IL NOME COMINCIA GIA' COL SUO TIPO: «Chiesa del Carmine», «Palazzo
       Reale». Il tipo davanti non si rimette — sarebbe il doppione del
       20/10 — ma L'ARTICOLO SI': togliendo tutto usciva «Qui c'è Chiesa
       del Carmine», e in italiano non si dice. L'articolo si accorda con
       la prima parola del NOME, che qui è anche il tipo. */
    if (n.toLowerCase().indexOf(capo) === 0) {
      var prima = n.split(' ')[0];
      if (/^[aeiouàèéìòóù]/i.test(prima)) return loIl(prima) + n;   // «l'Isola», non «la Isola»
      return (femminile(prima) ? 'la ' : loIl(prima)) + n;
    }
    if (/^(il |la |lo |i |le |l'|gli )/i.test(n)) return n;
    /* un nome di una parola sola E' gia' il tipo: «Municipio», «Colosseo»,
       «Duomo». «Il palazzo comunale Municipio» non lo direbbe nessuno. */
    if (n.indexOf(' ') < 0) {
      if (/^[aeiouàèéìòóù]/i.test(n)) return loIl(n) + n;
      return (femminile(n) ? 'la ' : loIl(n)) + n;
    }
    /* «la chiesa DI San Luigi dei Francesi», non «la chiesa San Luigi»:
       davanti a un santo o a un nome proprio ci vuole il «di». */
    var di = /^(San |Sant'|Santa |Santo |Santi |SS\.|Ss\.)/i.test(n) ? 'di ' : '';
    if (/^[aeiouàèéìòóù]/i.test(capo)) return loIl(capo) + capo + ' ' + di + n;
    return (femminile(capo) ? 'la ' : loIl(capo)) + capo + ' ' + di + n;
  }

  /* In italiano la -e finale non dice il genere: «il ponte» ma «la
     cattedrale». Le parole che ci servono sono poche e si contano. */
  var FEMMINE_IN_E = { cattedrale: 1, torre: 1, pieve: 1, corte: 1, croce: 1,
                       valle: 1, fonte: 1, sede: 1, arte: 1, chiese: 1, parte: 1 };
  function femminile(t) {
    var w = String(t || '').toLowerCase();
    if (FEMMINE_IN_E[w]) return true;
    return /(zione|sione|gione|ione|tà|tù|trice|ice)$/.test(w) || /a$/.test(w);
  }
  function loIl(t) {
    /* «lo» va davanti a s+CONSONANTE — sbaglio, scempio, studio — non a
       s+vocale. Nella lista c'era per errore anche la «i», e usciva «lo
       sito mura serviane» (quaderno del 21/10). */
    var w = String(t).toLowerCase();
    /* DAVANTI A VOCALE L'APOSTROFO, e vale per tutt'e due i generi: «il
       edificio» e «la Isola» non si dicono. Trovato il 21/10 guardando
       le descrizioni vere: «il edificio palazzo del Consorzio agrario». */
    if (/^[aeiouàèéìòóù]/.test(w)) return "l'";
    return /^(s[bcdfglmnpqrtv]|z|ps|pn|gn|x|y)/.test(w) ? 'lo ' : 'il ';
  }

  function daRaccontare(p, modo) {
    if (!p || !(p.k >= 1)) return false;
    /* in TURISMO un luogo senza scheda non si racconta: «Qui c'è lo
       stadio» a chi e' uscito per vedere l'arte e' rumore. In UTILITA'
       invece e' proprio quello che serve — «davanti hai il municipio, lo
       stadio» — e infatti ci resta. */
    if (modo === 'cultura' && p.senzaScheda) return false;
    return true;
  }
  function primoBuono(intorno, modo) {
    for (var i = 0; i < intorno.length; i++) {
      if (daRaccontare(intorno[i].p, modo)) return intorno[i].p;
    }
    return null;
  }

  /* IL RANGO — e perche' fino al 22/10 non esisteva.
     La regola era «scheda lunga E "cosa vedere"», ma il campo `i` nei dati
     veri non c'e' su NESSUNO dei 20.836 luoghi d'Italia, e il campo `r`
     nemmeno: contati uno per uno, i luoghi di rango 2 erano zero. Cioe'
     tutto quello che dipende dal rango — il raggio piu' largo per le cose
     grandi, la regola di cosa si dice in movimento, quanto in la si
     guarda indietro — era codice che non si accendeva mai.
     Adesso il rango si ricava da quello che i dati HANNO davvero:
     - 3, si vede da lontano: un tipo che e' un punto di riferimento
       (basilica, castello, teatro, museo, sito archeologico...) e una
       scheda che ha qualcosa da dire; oppure alto piu' di trenta metri,
       e allora il tipo non conta.
     - 2, merita un raggio piu' largo: ha una scheda vera.
     - 1, tutto il resto.
     Contati sui dati veri: 995 luoghi di rango 3 su 20.836 (il 4,8%) —
     78 entro un chilometro e due dal centro di Roma, 8 a Lucca, 2 a
     Latina. E' la misura giusta per una cosa che si dice andando in
     macchina. */
  var NOTEVOLI = ['basilica', 'cattedrale', 'duomo', 'castello', 'rocca',
                  'fortezza', 'reggia', 'anfiteatro', 'arena', 'abbazia',
                  'certosa', 'santuario', 'acquedotto', 'obelisco', 'faro',
                  'stadio', 'porta cittadina', 'mura', 'teatro', 'monastero',
                  'sito archeologico', 'torre', 'ponte', 'museo',
                  'parco cittadino'];
  function tipoNotevole(p) {
    var t = String(p.t || '').toLowerCase();
    if (!t) return false;
    for (var i = 0; i < NOTEVOLI.length; i++) {
      if (t.indexOf(NOTEVOLI[i]) === 0 || t.indexOf(' ' + NOTEVOLI[i]) >= 0) return true;
    }
    return false;
  }
  function rango(p) {
    if (p.r) return p.r;                         // rango già calcolato dai dati
    var quanto = (p.d || '').length;
    if ((p.h || 0) >= 30) return 3;              // alto cosi', lo vedi comunque
    if (tipoNotevole(p) && quanto >= 400) return 3;
    if (quanto >= 240) return 2;
    return 1;
  }
  function raggio(p, modo) {
    var base = modo === 'cultura' ? 240 : 150;
    var r = rango(p);
    return r >= 3 ? Math.round(base * 1.7) : (r === 2 ? Math.round(base * 1.3) : base);
  }
  /* FIN DOVE SI GUARDA QUANDO NON CAMMINI, e perche' si e' stretto.
     Il 22/10 l'avevo aperto a mille e duecento metri: sei volte il
     raggio, come fa Microsoft Soundscape in macchina. Vince l'ha provata
     in scooter la sera stessa: «sono entrato nel palazzetto e mi diceva
     che a 900 passi c'era la chiesa di San Marco». La cattedrale era a
     seicento metri buoni, e lui stava entrando da un'altra parte.
     L'errore non era il moltiplicatore, era l'idea: a Soundscape
     quel raggio serve per ANNUNCIARE IN ANTICIPO qualcosa verso cui stai
     andando. Chi gira in citta' per i fatti suoi non sta andando da
     nessuna parte in particolare, e una cosa a seicento metri non la
     incontra mai: la sente e basta.
     «Non spegnerli, ma stringi: solo quelli molto vicini» (Vince).
     Centocinquanta metri: a trenta all'ora sono venti secondi, cioe'
     glielo si dice mentre ci passa davanti — non mentre e' da un'altra
     parte. E restano solo i luoghi di rango 3, uno ogni 45 secondi.
     E l'elenco dei posti intorno torna a mezzo chilometro per tutti:
     allargarlo serviva solo a questo, e intanto allargava anche le
     altre parti che lo usano. */
  var MOLTO_VICINO = 150;         // in movimento, e basta
  function finDove() { return 500; }
  function soglia(p, modo, aPiedi) {
    return aPiedi === false ? MOLTO_VICINO : raggio(p, modo);
  }
  /* QUATTRO PAROLE, NON SETTE. «In Utilità metti avanti, dietro, destra,
     sinistra. Non nord» (Vince, 16/10). «Proprio a destra» e «indietro a
     destra» sembrano precise e invece fanno fermare a pensare: chi
     cammina senza vedere ha bisogno di una parola sola, che il corpo
     esegue senza tradurla. */
  function versoTesto(o) {
    var r = o.rel;
    /* venticinque gradi, non trentacinque: a trenta gradi e ottanta metri
       una cosa è già quaranta metri di lato, e «davanti a te» manderebbe
       una persona a cercarla dritto. La prova lo ha preso al volo. */
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (Math.abs(r) > 145) return 'dietro di te';
    return r > 0 ? 'sulla destra' : 'sulla sinistra';
  }
  /* LA DISTANZA LA DICE UNA PARTE SOLA: parti/distanza.js (7 prove).
     «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
     21/10): ce n'erano quattro, con arrotondamenti diversi, e questa
     diceva i METRI mentre il resto dell'app diceva i passi. */
  /* si PASSA, come dist e verso: in questa cartella le parti non si
     cercano fra loro, se le fa dare. Senza, resta il modo vecchio — piu'
     grezzo, ma nessuno resta muto. */
  var laMisura = o.distanza || null;
  function metri(m) {
    return laMisura ? laMisura.passi(m) : ('a ' + Math.round(m) + ' metri');
  }
  /* camminando si contano i passi, in movimento i metri: la misura segue
     il corpo di chi ascolta, non il numero */
  function quanto(m, aPiedi) {
    if (aPiedi === false && laMisura && laMisura.inMetri) return laMisura.inMetri(m);
    return metri(m);
  }

  /* ancora(): quello che succede quando l'utente dice «ancora». Scende di un
     gradino sul luogo in corso, e se è finito lo dice. */
  /* I GRADINI IN UN POSTO SOLO. Erano scritti due volte — qui e dentro
     prossimo(), nel ramo di chi si ferma dieci secondi — e il 21/10 ne ho
     corretto uno solo: i dati per le descrizioni orientative c'erano,
     la parte produceva la frase giusta, la regola la lasciava passare, e
     l'app diceva lo stesso la voce di Wikipedia, perche' passava
     dall'altra copia. Una copia sola, e non succede piu'. */
  function scendiDiUnGradino(p) {
    if (!p) return null;
    var g = gradino[p.n] || 0;
    if (g >= quantiGradini(p)) return { tipo: 'finito', luogo: p, livello: 'guida',
                                        testo: 'Di questo ti ho detto tutto.' };
    gradino[p.n] = g + 1;
    var fatta = comeEFatta(p);
    if (fatta) {
      if (g === 0) return { tipo: 'scheda-orientativa', luogo: p, testo: fatta, livello: 'guida' };
      g = g - 1;             // da qui in poi i gradini sono quelli di sempre
    }
    if (g === 0 && p.d) return { tipo: 'scheda', luogo: p, testo: p.d, livello: 'guida' };
    if (g === 0) return { tipo: 'finito', luogo: p, livello: 'guida', testo: 'Di questo ti ho detto tutto.' };
    if (g === 1 && p.i) return { tipo: 'cosa-vedere', luogo: p, testo: 'Cosa vedere: ' + p.i, livello: 'guida' };
    if (p.a) return { tipo: 'approfondimento', luogo: p, testo: p.a, livello: 'guida' };
    return { tipo: 'finito', luogo: p, livello: 'guida', testo: 'Di questo ti ho detto tutto.' };
  }

  function ancora() {
    if (!inCorso) return null;
    return scendiDiUnGradino(inCorso);
  }

  /* approfondisci(): l'utente chiede di sapere di più, in qualunque modalità.
     Se non c'è un luogo in corso si prende il più vicino che abbia qualcosa
     da dire — anche in Utilità, dove di sua iniziativa l'app parla solo di
     servizi. Era il difetto di Gabri: chiedeva «approfondisci» e si sentiva
     rispondere «Farmacia Pirani». */
  function approfondisci(situazione) {
    if (!inCorso) {
      var intorno = situazione.intorno || [];
      for (var i = 0; i < intorno.length; i++) {
        var p = intorno[i].p;
        if (p.k >= 1 && (p.d || p.a) && intorno[i].m < 260) { inCorso = p; gradino[p.n] = 0; break; }
      }
      if (!inCorso) return { tipo: 'niente', livello: 'guida',
                             testo: 'Qui intorno non ho niente da raccontare.' };
    }
    return ancora();
  }

  function salta() {
    if (inCorso) { detti[inCorso.n] = { quando: ora(), lat: fermoLat, lon: fermoLon }; inCorso = null; }
    return { tipo: 'avanti', livello: 'guida', testo: 'Andiamo avanti.' };
  }

  return {
    prossimo: prossimo, ancora: ancora, approfondisci: approfondisci, salta: salta,
    conArticolo: conArticolo,
    finDove: finDove, rango: rango,
    fermoDaQuanto: fermoDaQuanto,
    inCorso: function () { return inCorso; },
    gradinoDi: function (p) { return gradino[p.n] || 0; },
    dimentica: function () { detti = {}; gradino = {}; fatteCosi = {}; inCorso = null; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Racconto;
if (typeof window !== 'undefined') window.Racconto = Racconto;
