/* YOURBEA — il montaggio, 15/10/2026
   ============================================================
   Questo file non contiene regole: tiene insieme i pezzi. Le regole stanno
   nei pezzi, ognuno con le sue prove:
     parti/voce.js       come escono le parole        (11 prove)
     parti/racconto.js   cosa dire e quando           (12 prove)
     parti/posizione.js  dove sei, fermo o cammini    (10 prove)
     parti/intorno.js    mappa, Wikipedia, percorsi   (8 prove)

   Qui si fa solo: leggere i dati, accendere la posizione, chiedere al
   racconto cosa dire, passarlo alla voce, aggiornare lo schermo, e ascoltare
   i comandi. Se qualcosa non va, il diario lo scrive.
*/

'use strict';
(function () {

  var el = function (id) { return document.getElementById(id); };
  var LUOGHI = [];
  var modo = 'servizi';              // 'servizi' = Utilità | 'cultura' = Turismo
  var acceso = false;
  var DIARIO = [];

  /* ---------- il diario: resta nel telefono, si può mandare ---------- */
  function diario(t) {
    var d = new Date();
    var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
    DIARIO.push(hh + ' ' + t);
    if (DIARIO.length > 300) DIARIO.shift();
    if (window.urbeaDiario) try { window.urbeaDiario(t); } catch (e) {}
  }
  try {
    var vecchio = localStorage.getItem('yourbea2-diario');
    if (vecchio) { DIARIO = vecchio.split('\n').slice(-150); DIARIO.push('— sessione precedente, sopra —'); }
    setInterval(function () { try { localStorage.setItem('yourbea2-diario', DIARIO.slice(-300).join('\n')); } catch (e) {} }, 15000);
  } catch (e) {}
  window.YB = { diario: function () { return DIARIO.join('\n'); } };

  /* ============================================================
     LA TRACCIA — perche' una camminata sbagliata si possa rifare
     «Voglio che trovi il modo di risolvere una volta per tutte»
     (Vince, 23/10, dopo l'ennesima prova andata male).
     Il modo c'e' ed e' uno solo: smettere di indovinare. Il diario
     racconta cosa l'app ha DECISO; la traccia registra cosa l'app ha
     VISTO — ogni punto del GPS, i passi, il modo — e cosa ha DETTO.
     Con questi due, una camminata storta si rifa' identica sul
     computer: si vede la frase, si vede il perche', si corregge, e
     quella camminata resta nel banco per sempre.
     Pesa poco: un punto ogni secondo per un'ora sono 3.600 righe da
     una quarantina di caratteri. Si tengono le ultime 5.000.
     ============================================================ */
  var TRACCIA = [];
  var TRACCIA_MAX = 5000;
  function segna(riga) {
    TRACCIA.push(riga);
    if (TRACCIA.length > TRACCIA_MAX) TRACCIA.shift();
  }
  function segnaPunto(s) {
    if (!s || !s.pronto) return;
    segna('P ' + Date.now() + ' ' + s.lat.toFixed(6) + ' ' + s.lon.toFixed(6) +
          ' ' + Math.round(s.prec || 0) +
          ' ' + (typeof s.direzione === 'number' ? Math.round(s.direzione) : '-') +
          ' ' + (s.direzioneBuona ? 1 : 0) +
          ' ' + (s.aPiedi === false ? 0 : 1) +
          ' ' + (s.fermo ? 1 : 0) +
          ' ' + (passiOra || 0));
  }
  function segnaDetto(tipo, testo) {
    segna('D ' + Date.now() + ' ' + (tipo || '?') + ' ' +
          String(testo || '').replace(/[\r\n]+/g, ' ').slice(0, 200));
  }
  window.YB.traccia = function () {
    return 'Yourbea traccia v1\nmodo ' + modo + '\n' + TRACCIA.join('\n');
  };

  /* ---------- la voce ---------- */
  /* la pronuncia: gli accenti scritti, che la voce rispetta. Sta qui,
     all'ultimo momento, perché il testo che si vede sullo schermo resti
     scritto come si scrive. */
  var pronuncia = Pronuncia();
  var sintesi = {
    /* parla(testo, quandoFinisce): il secondo pezzo e' la cosa importante.
       Prima il motore NON sapeva quando la voce di sistema aveva finito: la
       indovinava dalla lunghezza, 55 millesimi per lettera, e allo scadere
       faceva partire la frase dopo. Vince, 17/10: «mentre spiegava la
       Basilica di Massenzio ne iniziava un'altra sopra, e non si capiva
       nulla». La scheda e' lunga settecento lettere: la stima da' quaranta
       secondi, la voce ce ne mette quarantatre. Negli ultimi tre parte
       l'altra — e se quella usa le clip incise, la prima continua sotto,
       perche' una clip non spegne la voce di sistema.
       L'utterance sa quando ha finito: basta chiederglielo. */
    parla: function (t, quandoFinisce) {
      try {
        if (!window.speechSynthesis) { if (quandoFinisce) quandoFinisce(); return; }
        t = pronuncia.sistema(t);
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(t);
        u.lang = 'it-IT'; u.rate = 0.98;
        var voci = window.speechSynthesis.getVoices().filter(function (v) { return /^it/i.test(v.lang.replace('_', '-')); });
        // la stessa voce delle clip, se c'è: due voci diverse si sentono
        for (var i = 0; i < voci.length; i++) if (/alice/i.test(voci[i].name || '')) { u.voice = voci[i]; break; }
        if (!u.voice && voci.length) u.voice = voci[0];
        /* onend arriva anche quando la frase viene annullata da un'altra
           che comincia: chi riceve la chiamata controlla il turno, e di
           quella vecchia non fa niente. */
        if (quandoFinisce) { u.onend = quandoFinisce; u.onerror = quandoFinisce; }
        window.speechSynthesis.speak(u);
      } catch (e) { if (quandoFinisce) quandoFinisce(); }
    },
    taci: function () { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }
  };
  var microfono = {
    chiudi: function () { chiudiAscolto(); },
    /* ANCHE ALLA PORTA, e non solo quando l'app e' accesa. «Utilita' non
       l'ha presa» (Vince, 25/10, col telefono in mano): il guscio apriva
       il microfono una volta, l'app diceva «Dimmi: utilita', oppure
       turismo», per parlare chiudeva il microfono — giusto, per non
       sentire se stessa — e quando aveva finito NON lo riapriva, perche'
       qui c'era scritto solo `if (acceso)` e alla porta `acceso` e'
       false. Cioe' restava sorda **proprio sulla domanda a cui si deve
       rispondere a voce**: nel quaderno del telefono, due minuti interi
       senza una sola riga «DETTO:». Chi non vede non ha un'altra strada
       che la voce. */
    apri: function () {
      if (acceso || !el('porta').hidden) apriAscolto();
    }
  };
  /* LE LINGUE DEI TURISTI — 28/10/2026
     La traduzione si fa nell'ultimo momento, dentro voce.parla: le frasi
     restano in italiano nel codice e qui si cerca la loro traduzione.
     Se manca, si dice l'italiano. I testi stanno in dati/testi/<lingua>.json
     e si chiedono una volta sola, quando serve. */
  var LINGUE = ['de', 'en', 'fr', 'nl', 'pl', 'es', 'cs', 'zh', 'ro', 'pt',
                'da', 'hu', 'sv', 'ja', 'ru', 'ko', 'nb', 'fi', 'el', 'ar'];
  var lingua = Lingua({
    diario: diario,
    chiedi: function (codice) {
      /* le frasi e i comandi di quella lingua. I comandi possono
         mancare: allora si capiscono solo quelli italiani, che e' come
         stava prima e non rompe niente. */
      /* le frasi possono mancare — oggi sono tradotte solo alcune lingue —
         e i comandi no: chi ha i comandi della sua lingua deve poterla
         comandare anche se l'app gli parla ancora in italiano. Se qui si
         buttasse tutto, un francese non sarebbe capito. */
      return Promise.all([
        fetch('dati/testi/' + codice + '.json' + VER)
          .then(function (r) { return r.ok ? r.json() : {}; })
          .catch(function () { return {}; }),
        fetch('dati/testi/comandi-' + codice + '.json' + VER)
          .then(function (r) { return r.ok ? r.json() : {}; })
          .catch(function () { return {}; })
      ]).then(function (due) { return { frasi: due[0], comandi: due[1] }; });
    }
  });

  var voce = MotoreVoce({ sintesi: sintesi, diario: diario, microfono: microfono,
                          cartellaClip: '../voce/clip/it/' });

  /* ---------- il racconto, la posizione, le fonti ---------- */
  /* LA REGOLA, in un posto solo: parti/aChiServe.js (10 prove). «Non
     m'interessa ciò che è dentro, voglio ci sia la regola» (Vince, 19/10).
     Chi vuole dire qualcosa passa di lì. */
  /* UNA MISURA SOLA PER TUTTI: parti/distanza.js (7 prove). «Dovrebbe
     essere più precisa con le distanze» (la sorella di Vince, 21/10):
     c'erano quattro arrotondamenti diversi e due unità, e il cenno
     diceva i metri mentre il resto diceva i passi. */
  var laDistanza = Distanza({});
  var aChiServe = AChiServe();
  /* ---------- PRIMA COS'HAI DAVANTI, POI LA STORIA ----------
     parti/descrizione.js (15 prove). La scheda che si sentiva fermandosi
     era l'incipit di Wikipedia — «fu fatta costruire da Massenzio agli
     inizi del IV secolo» — e a chi non vede non dice niente di quello che
     ha davanti. Adesso il primo gradino e' com'e' fatta: quanto e'
     grande, di che e' fatta, che forma ha. La storia e' il gradino dopo.
     L'articolo lo mette racconto.conArticolo, che ha gia' pagato tutte le
     trappole: si passa quello invece di riscriverlo. Qui `racconto` non
     esiste ancora, ma la funzione viene CHIAMATA dopo, quando c'e'. */
  var descrizione = Descrizione({ distanza: laDistanza, conArticolo: function (p) { return racconto.conArticolo(p); } });
  var racconto = Racconto({ descrizione: descrizione, distanza: laDistanza });
  /* IL PAESAGGIO: parti/paesaggio.js (10 prove). «Il non vedente vuole che
     sia descritta la realtà circostante: di fronte, davanti a te hai il
     golfo, Raito, i Due Fratelli… sennò numeri civici» (Vince, 18/10). */
  /* LE FERMATE QUANDO SEI SU UN MEZZO: parti/fermate.js (8 prove).
     «Potrebbe dire: stai per entrare in stazione Colosseo, appena esci
     eccetera. A Cavour puoi…» (Vince, 21/10, tornando in metro). */
  /* I PERCORSI CHE SI FA LUI: parti/percorsiMiei.js (10 prove).
     «Penso sia la migliore idea che ho avuto per ovviare al problema»
     (Vince, 21/10) — e il problema era: se diciamo che c'è un
     attraversamento e non c'è? Un percorso registrato da lui, coi suoi
     segni, è l'unico dato che non abbiamo preso da una mappa. */
  /* IL FARO ACUSTICO: parti/faro.js (7 prove). L'idea e i numeri vengono
     da Microsoft Soundscape (licenza MIT) — trenta gradi in rotta, dieci
     metri per «ci sei», cinquanta fra un annuncio e l'altro. */
  var faro = Faro({ dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
                    verso: function (a, b, c, d) { return posizione.verso(a, b, c, d); } });

  /* ============================================================
     IL SUONO DEL FARO
     Due toni in anello — uno chiaro quando ce l'hai davanti, uno sordo
     quando sei fuori rotta — messi nello spazio con l'audio del browser,
     così lo senti arrivare dalla sua parte. È il modo di Soundscape, e
     funziona anche su Android perché il browser ce l'ha già.
     Non si usano i loro file audio: i toni si fanno qui, con un
     oscillatore, così non c'è niente da scaricare e niente da pesare. */
  var ilSuono = null;
  function accendiIlSuono() {
    if (ilSuono) return ilSuono;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      var ctx = new AC();
      var panner = ctx.createPanner();
      panner.panningModel = 'HRTF';          // due orecchie, non due casse
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 20;
      panner.connect(ctx.destination);

      /* il tono: un battito, non un fischio continuo — un fischio in
         mezzo al traffico si confonde e stanca */
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      var porta = ctx.createGain();
      porta.gain.value = 0;
      osc.connect(porta); porta.connect(panner);
      osc.start();
      ilSuono = { ctx: ctx, panner: panner, osc: osc, porta: porta, ultimo: 0 };
      return ilSuono;
    } catch (e) { return null; }
  }

  function spegniIlSuono() {
    if (!ilSuono) return;
    try { ilSuono.porta.gain.value = 0; } catch (e) {}
  }

  /* suonaIlFaro(): un battito, messo da quella parte. Più sei in rotta,
     più il battito è chiaro e fitto: è il modo in cui si capisce di
     essere girati bene senza che nessuno lo dica. */
  /* ============================================================
     LA BACCHETTA: QUANDO SEI GIRATO BENE, LA MANO LO SENTE
     Il faro suona da sempre, e piu' sei in rotta piu' batte fitto. Ma
     per strada il suono lo copre un autobus, e chi non vede tiene
     l'orecchio occupato dal traffico: e' l'organo che gli serve per non
     farsi male, e noi ci parliamo sopra. La mano invece e' libera.
     Microsoft Soundscape lo fa cosi' (`Haptics/HapticWandBeacon`): il
     telefono diventa una bacchetta, e vibra quando lo punti verso la
     meta. Non dice niente, non ruba l'udito: o vibra o non vibra.
     Qui si vibra SOLO in rotta — dentro i trenta gradi — perche' il
     senso e' tutto li': giri su te stesso e la mano ti dice quando
     fermarti. Una vibrazione continua non direbbe niente.
     Su iPhone dentro la WKWebView `navigator.vibrate` non esiste: la fa
     il guscio (window.urbeaVibra). Su Android la fa la pagina. Dove non
     c'e' ne' l'uno ne' l'altro non succede niente e il suono resta. */
  function vibra(forza) {
    try {
      if (window.urbeaVibra) { window.urbeaVibra(String(forza || 'piano')); return; }
      if (navigator.vibrate) {
        navigator.vibrate(forza === 'arrivato' ? [60, 70, 60] : (forza === 'forte' ? 45 : 18));
      }
    } catch (e) {}
  }

  function suonaIlFaro(d) {
    var a = accendiIlSuono();
    if (!a) return;
    try { if (a.ctx.state === 'suspended') a.ctx.resume(); } catch (e) {}
    var adesso = a.ctx.currentTime;
    var ogni = d.inRotta ? 0.45 : 1.1;        // in rotta batte più spesso
    if (adesso - a.ultimo < ogni) return;
    a.ultimo = adesso;
    /* e la mano, insieme al suono: solo quando sei girato bene */
    if (d.inRotta) vibra(d.ciSei ? 'forte' : 'piano');

    /* dove sta, rispetto a chi ascolta: a sinistra x negativo, davanti z
       negativo. Il panner fa il resto. */
    var rad = d.rel * Math.PI / 180;
    var x = Math.sin(rad), z = -Math.cos(rad);
    try {
      if (a.panner.positionX) {
        a.panner.positionX.setValueAtTime(x, adesso);
        a.panner.positionY.setValueAtTime(0, adesso);
        a.panner.positionZ.setValueAtTime(z, adesso);
      } else { a.panner.setPosition(x, 0, z); }
    } catch (e) {}
    a.osc.frequency.setValueAtTime(d.inRotta ? 880 : 420, adesso);
    a.porta.gain.cancelScheduledValues(adesso);
    a.porta.gain.setValueAtTime(0, adesso);
    a.porta.gain.linearRampToValueAtTime(d.inRotta ? 0.22 : 0.12, adesso + 0.02);
    a.porta.gain.exponentialRampToValueAtTime(0.0001, adesso + (d.inRotta ? 0.18 : 0.3));
  }

  var miei = PercorsiMiei({ distanza: laDistanza,  dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); } });
  try { miei.carica(JSON.parse(localStorage.getItem('yourbea2-percorsi-miei') || '[]')); } catch (e) {}
  /* mandaIlPercorso(): il percorso diventa un link e parte col pannello di
     condivisione del telefono — WhatsApp, posta, quello che uno usa. */
  var percorsoDaMandare = null;         // quello in attesa di un destinatario
  function mandaIlPercorso(percorso, aChi) {
    var dati = miei.perMandare(percorso);
    var chiave = '';
    try { chiave = btoa(unescape(encodeURIComponent(dati))); } catch (e) { chiave = ''; }
    if (!chiave) {
      voce.parla('Non sono riuscito a preparare il percorso.', { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    var link = location.origin + location.pathname + '?p=' + encodeURIComponent(chiave);
    /* «per medico» non si dice: l'articolo lo mette aPosto(), che e'
       provato — «dal medico», «alla edicola» no, «all'edicola» si'. */
    var comeSiDice = percorso.nome ? miei.aPosto(percorso.nome) : '';
    var frase = 'Il percorso' + (comeSiDice ? ' per andare ' + comeSiDice : '') +
                ', da Yourbea. Apri questo link e ce l\'hai anche tu:';
    diario('MANDO IL PERCORSO: ' + (percorso.nome || '?') + ', ' + link.length + ' caratteri' +
           (aChi ? ', a ' + aChi : ', a nessuno ancora'));

    /* A CHI, DETTO A VOCE. «Tutto vocalmente» (Vince, 21/10): il pannello
       di condivisione del telefono e' una griglia di icone, e chi non vede
       la deve attraversare col lettore di schermo per mandare una cosa che
       aveva gia' detto a parole. Se il nome l'ha detto, si va diritti al
       messaggio: una schermata, un tasto, invia. */
    if (aChi) {
      var suo = contatto && somigliano(contatto.nome, aChi) ? contatto : null;
      if (suo && suo.telefono) {
        voce.parla('Mando a ' + suo.nome + ' il percorso' +
                   (comeSiDice ? ' per andare ' + comeSiDice : '') +
                   '. Apro WhatsApp col messaggio già scritto: premi invia.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        esegui([{ cosa: 'messaggio', numero: suo.telefono, testo: frase + ' ' + link }]);
        return;
      }
      /* il numero lo ha il telefono: si guarda in rubrica prima di chiederlo */
      percorsoDaMandare = percorso;
      if (chiediAllaRubrica(aChi, 'percorso')) return;
      percorsoDaMandare = null;
      voce.parla('Il numero di ' + maiuscolaNome(aChi) + ' non ce l\'ho. Scrivilo nel cassetto, oppure dimmi «manda il percorso» e lo scelgo dal telefono.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }

    if (navigator.share) {
      navigator.share({ title: 'Percorso Yourbea', text: frase, url: link }).catch(function () {});
      voce.parla('Scegli a chi mandarlo.', { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(frase + ' ' + link).then(function () {
        voce.parla('Il percorso è negli appunti: incollalo dove vuoi.', { livello: voce.GUIDA, ancheSeUguale: true });
      });
      return;
    }
    voce.parla('Questo telefono non sa condividere.', { livello: voce.GUIDA, ancheSeUguale: true });
  }

  /* ============================================================
     IL PERCORSO COME FILE, PER CHI NON HA YOURBEA
     «Mano a mano che i non vedenti mettono i propri riferimenti sara'
     possibile arricchire la mappa generale» (Vince, 21/10). Il link
     che si manda su WhatsApp e' la via facile e resta quella; ma si
     apre solo con Yourbea, e un percorso camminato — con scritto dove
     sta il gradino e dove l'attraversamento — e' un dato che vale
     anche fuori di qui. Il GPX lo legge chiunque: OpenStreetMap, il
     comune, un'altra app. Esce come file, e non serve nessun server.
     Si dice «salva il percorso come file». */
  function percorsoComeFile(percorso) {
    var testo = miei.comeGpx(percorso);
    if (!testo) {
      voce.parla('Questo percorso è troppo corto per salvarlo.', { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    var comeSiChiama = (percorso.nome || 'percorso').replace(/[^\w\sàèéìòù-]/gi, '').trim() || 'percorso';
    var file = comeSiChiama.replace(/\s+/g, '-').toLowerCase() + '.gpx';
    try {
      var b = new Blob([testo], { type: 'application/gpx+xml' });
      /* se il telefono sa condividere un file, si condivide: su iPhone
         finisce in «Salva su File» o dentro un messaggio, e la griglia
         qui ci sta — e' una cosa che si fa una volta, non camminando. */
      var f2 = (typeof File !== 'undefined') ? new File([b], file, { type: 'application/gpx+xml' }) : null;
      if (f2 && navigator.canShare && navigator.canShare({ files: [f2] })) {
        navigator.share({ files: [f2], title: comeSiChiama }).catch(function () {});
        voce.parla('Il percorso è un file: scegli dove metterlo.', { livello: voce.GUIDA, ancheSeUguale: true });
        return;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = file;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      voce.parla('Salvato: ' + file + '. È un file GPX, lo apre qualunque mappa.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
    } catch (e) {
      diario('GPX: non riesco a salvare — ' + e.message);
      voce.parla('Non sono riuscito a salvare il file.', { livello: voce.GUIDA, ancheSeUguale: true });
    }
  }

  /* e quando ne arriva uno: si chiede, non si prende di nascosto. */
  (function percorsoInArrivo() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('p'); } catch (e) {}
    if (!q) return;
    var dati = null;
    try { dati = decodeURIComponent(escape(atob(q))); } catch (e) { return; }
    var arrivato = miei.daUnLink(dati);
    if (!arrivato) { diario('PERCORSO RICEVUTO: non si legge'); return; }
    diario('PERCORSO RICEVUTO: ' + (arrivato.nome || '?') + ', ' + arrivato.segni.length + ' segni');
    setTimeout(function () {
      inAttesaDi = { da: Date.now(), cosa: 'percorso-arrivato', percorso: arrivato };
      voce.parla('Ti hanno mandato un percorso' + (arrivato.nome ? ' per ' + arrivato.nome : '') +
                 ': ' + Math.round(arrivato.metri / 0.75) + ' passi, ' + arrivato.segni.length +
                 (arrivato.segni.length === 1 ? ' punto segnato' : ' punti segnati') +
                 '. Lo tengo? Dimmi sì o no.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
    }, 2500);
  })();

  function salvaIMiei() {
    try { localStorage.setItem('yourbea2-percorsi-miei', JSON.stringify(miei.perSalvare())); } catch (e) {}
  }

  /* ============================================================
     I POSTI MIEI — «ogni non vedente puo' registrare i suoi riferimenti»
     Le parole e le regole stanno in parti/postiMiei.js, con 24 prove.
     Qui si attaccano alla voce, alla posizione e a WhatsApp.
     ============================================================ */
  var posti = PostiMiei({
    dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
    aPosto: miei.aPosto, nudo: miei.soloIlNome
  });
  voce.attaccaLaLingua(lingua);
  /* la lingua del telefono, se la sappiamo parlare. Chi ha l'italiano non
     scarica niente e non cambia niente. */
  (function () {
    var q = lingua.dalTelefono(LINGUE);
    if (q !== 'it') lingua.cambia(q);
  }());

  try { posti.carica(JSON.parse(localStorage.getItem('yourbea2-posti-miei') || '[]')); } catch (e) {}
  function salvaIPosti() {
    try { localStorage.setItem('yourbea2-posti-miei', JSON.stringify(posti.perSalvare())); } catch (e) {}
  }

  /* ============================================================
     QUELLO CHE AGGIUNGONO I TESTER
     «Qui c'è Elite. Qui c'è un attraversamento con semaforo» — e in
     automatico la mappa che trovano tutti si aggiorna (Vince, 25/10).
     Le regole stanno in parti/contributi.js, con 10 prove. Qui c'è solo
     l'attacco: la coda sul telefono, il codice del tester, e la rete.
     Il codice del tester si mette una volta, e finche' non c'è i
     contributi restano in coda: non si perde niente.
     ============================================================ */
  /* l'indirizzo vero del server, in linea dal 25/10 (Cloudflare Worker,
     `URBEA/server-contributi/`). Non e' su vdmdata: vive per conto suo e
     non tocca il sito. */
  var DOVE_MANDARE = 'https://contributi-yourbea.server-contributi.workers.dev/punti';
  var contributi = Contributi({
    chi: (function () {
      try { return localStorage.getItem('yourbea2-tester') || ''; } catch (e) { return ''; }
    })(),
    leggiCoda: function () {
      try { return JSON.parse(localStorage.getItem('yourbea2-contributi') || '[]'); }
      catch (e) { return []; }
    },
    scriviCoda: function (coda) {
      try { localStorage.setItem('yourbea2-contributi', JSON.stringify(coda)); } catch (e) {}
    },
    /* La risposta si legge, non si guarda solo se e' arrivata: il server
       risponde 200 anche quando SCARTA tutto (per esempio «tester
       sconosciuto», che e' quello che capita a chi apre l'app senza il
       link col codice). Prima tornavo r.ok e la coda si svuotava: la
       camminata del 26/10 ha segnato 15 punti e sul server ce n'erano 0.
       Chi non vede ha parlato quindici volte a vuoto. */
    manda: function (coda) {
      return fetch(DOVE_MANDARE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: 1, punti: coda })
      }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (risposta) { return risposta || true; },
                             function () { return true; });
      });
    },
    diario: diario
  });
  /* ============================================================
     IL CODICE DEL TESTER ARRIVA DA UN LINK
     «Potrei iniziare io» (Vince, 25/10). Il codice non si dice a voce —
     una sfilza di lettere e numeri detta al microfono si sbaglia — e non
     si scrive a mano su un telefono da chi non vede. Arriva in un link:
     si apre una volta, resta per sempre, e si puo' mandare su WhatsApp a
     ciascuno dei mille.
         .../nuova/?t=NOME-0000
     ============================================================ */
  (function ilCodiceDelTester() {
    var codice = null;
    try { codice = new URLSearchParams(location.search).get('t'); } catch (e) {}
    if (!codice) return;
    codice = String(codice).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (codice.length < 4) return;
    try { localStorage.setItem('yourbea2-tester', codice); } catch (e) {}
    diario('TESTER: codice ' + codice);
    /* e si dice, perche' chi non vede non ha modo di sapere che e'
       andata: «sei un tester» e' anche una responsabilita'. */
    setTimeout(function () {
      voce.parla('Sei registrato come tester, codice ' + codice.split('').join(' ') +
                 '. Da adesso quello che segni arriva a tutti: dimmi «qui c\u2019\u00e8» e cosa c\u2019\u00e8.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
    }, 2500);
    try {
      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + location.hash);
      }
    } catch (e) {}
  })();

  /* e appena c'è rete si riprova da soli, senza che l'utente sappia
     niente: ogni due minuti, e all'avvio. */
  setTimeout(function () { contributi.provaAMandare(); }, 8000);
  setInterval(function () { contributi.provaAMandare(); }, 120000);

  /* I RIFERIMENTI CHE ARRIVANO DA UN ALTRO. Come i percorsi: si chiede,
     non si prendono di nascosto. */
  (function riferimentiInArrivo() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('r'); } catch (e) {}
    if (!q) return;
    var dati = null;
    try { dati = decodeURIComponent(escape(atob(q))); } catch (e) { return; }
    var da = '';
    try { da = new URLSearchParams(location.search).get('da') || ''; } catch (e) {}
    var arrivati = posti.daUnLink(dati, da);
    if (!arrivati) { diario('RIFERIMENTI RICEVUTI: non si leggono'); return; }
    diario('RIFERIMENTI RICEVUTI: ' + arrivati.length + (da ? ' da ' + da : ''));
    setTimeout(function () {
      inAttesaDi = { da: Date.now(), cosa: 'riferimenti-arrivati', roba: arrivati };
      voce.parla('Ti hanno mandato ' + arrivati.length +
                 (arrivati.length === 1 ? ' riferimento' : ' riferimenti') +
                 (da ? ' da ' + da : '') + ': ' +
                 arrivati.slice(0, 4).map(function (x) { return x.n; }).join(', ') +
                 (arrivati.length > 4 ? ' e altri' : '') +
                 '. Li tengo? Dimmi s\u00ec o no.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
    }, 3500);
  })();

  /* mandaIRiferimenti(): gli stessi binari del percorso — un link che si
     apre e basta, senza conto e senza rete. «In attesa di avere un server
     che faccia quello» (Vince, 23/10): quando il server ci sarà, questa
     resta la via che funziona anche senza. */
  function mandaIRiferimenti(aChi) {
    if (!posti.quanti()) {
      voce.parla('Non hai ancora segnato nessun riferimento.', { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    var dati = posti.perMandare();
    var chiave = '';
    try { chiave = btoa(unescape(encodeURIComponent(dati))); } catch (e) { chiave = ''; }
    if (!chiave) {
      voce.parla('Non sono riuscito a preparare i riferimenti.', { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    var link = location.origin + location.pathname + '?r=' + encodeURIComponent(chiave) +
               (ioSonoIo ? '&da=' + encodeURIComponent(ioSonoIo) : '');
    var frase = 'I miei riferimenti da Yourbea: ' + posti.quanti() +
                ' punti segnati camminando. Apri questo link e ce li hai anche tu:';
    diario('MANDO I RIFERIMENTI: ' + posti.quanti() + ', ' + link.length + ' caratteri' +
           (aChi ? ', a ' + aChi : ''));
    if (aChi) {
      var suo = contatto && somigliano(contatto.nome, aChi) ? contatto : null;
      if (suo && suo.telefono) {
        voce.parla('Mando a ' + suo.nome + ' i tuoi riferimenti. Apro WhatsApp col messaggio gi\u00e0 scritto: premi invia.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        esegui([{ cosa: 'messaggio', numero: suo.telefono, testo: frase + ' ' + link }]);
        return;
      }
    }
    if (navigator.share) {
      navigator.share({ title: 'Riferimenti Yourbea', text: frase, url: link }).catch(function () {});
      voce.parla('Scegli a chi mandarli.', { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(frase + ' ' + link).then(function () {
        voce.parla('I riferimenti sono negli appunti: incollali dove vuoi.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      });
      return;
    }
    voce.parla('Questo telefono non sa condividere.', { livello: voce.GUIDA, ancheSeUguale: true });
  }

  var fermate = Fermate({ distanza: laDistanza, dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); } });
  var paesaggio = Paesaggio({ dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
                              verso: function (a, b, c, d) { return posizione.verso(a, b, c, d); } });
  var agganciatore = Aggancio({ dist: function (a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  } });
  var posizione = Posizione({
    geo: navigator.geolocation || null,
    /* le vie le abbiamo gia' scaricate per gli incroci: servono anche a
       posare la lettura del GPS dove uno cammina davvero */
    aggancia: function (lat, lon, prec, aPiedi, direzione, direzioneBuona) {
      /* se «portami a» e' accesa, il tracciato: la lettura si posa su
         quella linea invece di cercarla fra tutte le vie (regola 5).
         `guida` nasce piu' sotto di qui, e a quel punto esiste. */
      var linea = (typeof guida !== 'undefined' && guida) ? guida.laLinea() : null;
      return agganciatore.aggancia({ lat: lat, lon: lon, prec: prec, aPiedi: aPiedi,
                                     direzione: direzione, direzioneBuona: direzioneBuona },
                                   SERVIZI.vie || [], linea);
    },
    /* LA FALCATA VERA, quella misurata mentre registrava un percorso:
       serve anche al motore della posizione, che coi 75 centimetri di
       tutti sbaglia di tre metri ogni venti passi su chi ha il passo
       corto. */
    falcata: function () { return laDistanza.quantoEIlPasso(); },
    /* si legge OGNI VOLTA, non una volta sola: il guscio dell'iPhone inietta
       la sua bandierina quando vuole, e leggendola al volo della partenza
       l'app credeva di essere nel browser e annunciava «non ho il permesso»
       mentre il guscio le stava passando le posizioni */
    guscio: { get haPosizione() { return !!window.urbeaHaPosizione; } },
    diario: diario
  });
  var intorno = Intorno({
    prendi: function (url, opz) {
      var o = opz || {};
      return fetch(url, o.metodo === 'POST'
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: o.corpo }
        : undefined).then(function (r) { return r.text(); });
    },
    leggiXML: function (t) { return new DOMParser().parseFromString(t, 'application/xml'); },
    diario: diario
  });
  // la porta che il guscio dell'iPhone chiama
  /* dal guscio arrivano anche il corso e la velocita' che calcola il
     telefono, con la loro accuratezza: i vecchi gusci mandano solo i
     primi tre numeri, e quelli restano undefined. */
  window.urbeaPosizione = function (lat, lon, prec, corso, corsoPrec, vel, velPrec) {
    posizione.dalGuscio(lat, lon, prec,
                        { corso: corso, corsoPrec: corsoPrec, vel: vel, velPrec: velPrec });
  };
  /* il passometro del telefono: fermo, cammina, corre, bici, mezzo. Vale
     piu' della velocita' del GPS, e da sottoterra arriva lo stesso. */
  window.urbeaAttivita = function (come, sicuro) { posizione.comeMiMuovo(come, sicuro); };
  /* L'AUDIO E' TORNATO DOPO UNA TELEFONATA. «Ieri mi hanno chiamato e dopo
     non si e' riattaccata» (Vince, 24/10): iOS mette in pausa l'audio, la
     frase resta ferma a meta' e la coda non riparte piu'. */
  window.urbeaAudioTornato = function () {
    try { voce.riprendi(); } catch (e) {}
  };
  /* ============================================================
     QUANTO E' LUNGO IL TUO PASSO, misurato e non supposto
     L'app conta tutto in passi, e usava 75 centimetri: la media di una
     popolazione, che non e' il passo di nessuno. Cambia con l'altezza,
     con la fretta, e chi cammina col bastone lo fa piu' corto. A sedici
     passi da una porta, fra 0,60 e 0,80 ci sono quattro metri — cioe' la
     porta sbagliata, e chi non vede ci va a sbattere.
     Non si chiede niente a nessuno: si misura mentre registra un
     percorso, cosa che fa gia'. Il GPS da' i metri, il telefono i passi,
     e la falcata e' la divisione. Si dice una volta sola, e resta. */
  var passiOra = 0, passiAllInizio = null;
  window.urbeaPassi = function (n) {
    passiOra = Number(n) || 0;
    /* e i passi dicono anche se sei FERMO: il GPS da solo non lo sa —
       camminando resta dentro il suo cerchio e l'app credeva che ti
       fossi fermato davanti a ogni monumento. */
    try { posizione.quantiPassi(passiOra); } catch (e) {}
  };
  try {
    var p0 = Number(localStorage.getItem('yourbea2-passo') || 0);
    if (p0 && laDistanza.metti(p0)) diario('IL TUO PASSO: ' + p0 + ' m (misurato prima d\'ora)');
  } catch (e) {}
  function cominciaAMisurareIlPasso() {
    passiAllInizio = passiOra;
  }
  function finisciDiMisurareIlPasso(metri) {
    if (passiAllInizio === null) return;
    var fatti = passiOra - passiAllInizio;
    passiAllInizio = null;
    if (laDistanza.eMisurato()) return;        // si misura una volta sola
    var l = laDistanza.regola(metri, fatti);
    if (!l) { diario('IL TUO PASSO: non misurabile (' + Math.round(metri) + ' m, ' + fatti + ' passi)'); return; }
    try { localStorage.setItem('yourbea2-passo', String(l)); } catch (e) {}
    diario('IL TUO PASSO: ' + l + ' m (' + Math.round(metri) + ' m in ' + fatti + ' passi)');
    voce.parla('E ho misurato il tuo passo: ' + Math.round(l * 100) +
               ' centimetri. Da adesso quando ti dico «a venti passi» sono i tuoi.',
               { livello: voce.GUIDA, ancheSeUguale: true });
  }

  /* ============================================================
     COM'E' MESSO IL TELEFONO: VOICEOVER E IL TESTO GRANDE
     Il guscio lo sa e adesso lo dice (Guscio.swift, mandaAccessibilita).
     Verificato sul telefono di Vince il 20/10:
       «accessibilita: VoiceOver spento, testo UICTContentSizeCategoryXL».
     Serve a due cose, e nessuna delle due si puo' chiedere a parole:
     1. IL TESTO. Se uno ha messo il testo grande nelle impostazioni del
        telefono, lo vuole grande dappertutto — non deve venire qui a
        premere «Testo più grande» per la terza volta nella sua vita. Si
        parte come l'ha messo lui; se poi lo cambia nell'app, la sua scelta
        vince e non la si tocca piu'.
     2. VOICEOVER. Chi lo tiene acceso non vede: e' il modo onesto di
        saperlo senza chiederglielo, e vale per il prezzo (Turismo gratis
        con VoiceOver) e per non parlargli sopra. */
  var voiceOver = false;
  window.urbeaAccessibilita = function (vo, testoGrande, taglia) {
    voiceOver = !!vo;
    document.body.dataset.voiceover = voiceOver ? 'si' : 'no';
    diario('ACCESSIBILITA: VoiceOver ' + (voiceOver ? 'acceso' : 'spento') + ', testo ' + (taglia || '?'));
    var scelto = null;
    try { scelto = localStorage.getItem('yourbea2-testo'); } catch (e) {}
    if (scelto) return;                     // la sua scelta vince
    var t = String(taglia || '');
    var grande = testoGrande || /XXL|XXXL|Accessibility/i.test(t);
    var medio = /\bXL\b/.test(t) || /_XL$/.test(t);
    if (grande) document.body.dataset.testo = 'enorme';
    else if (medio) document.body.dataset.testo = 'grande';
  };
  window.conVoiceOver = function () { return voiceOver; };

  /* ============================================================
     L'ABBONAMENTO
     «Ora abbonamento settimanale per i turisti», «App Store iPhone»
     (Vince, 21/10). Il pagamento lo fa Apple dentro il guscio
     (guscio-ios/Yourbea/Acquisti.swift); qui si sa soltanto com'è messo, e
     lo si può dire e chiedere a voce.
     TRE COSE CHE NON SI TOCCANO:
     - Utilità è gratis per sempre: è la modalità di chi non vede.
     - Con VoiceOver acceso anche Turismo è gratis, senza chiedere niente a
       nessuno e senza farsi dimostrare niente.
     - Dove non si può pagare non si chiude: sul web il negozio non c'è, e
       mettere un muro davanti a una porta che non si apre è peggio che
       lasciarla aperta. */
  var abbonamento = { attivo: false, scadenza: null, prezzo: null };
  window.urbeaAbbonamento = function (attivo, scadenza, prezzo) {
    abbonamento = { attivo: !!attivo, scadenza: scadenza || null, prezzo: prezzo || null };
    diario('ABBONAMENTO: ' + (abbonamento.attivo ? 'attivo' : 'no') +
           (abbonamento.prezzo ? ', ' + abbonamento.prezzo : ''));
  };
  window.urbeaEsitoAcquisto = function (frase) {
    voce.parla(String(frase || ''), { livello: voce.GUIDA, ancheSeUguale: true });
  };

  /* QUANDO IL PASS FINISCE, LO DICE. Una volta sola.
     «Si deve rinnovare o no?» — no, e per una ragione sola: un turista sta
     in città tre o quattro giorni, e un abbonamento che si rinnova lo
     addebiterebbe proprio quando l'app è diventata inutile. Quello non è
     un cliente, è un rimborso con una stella attaccata.
     Ma il silenzio non va bene lo stesso: se il pass finisce e l'app
     smette di raccontare senza spiegare, uno pensa che si sia rotta. Lo
     dice una volta, e decide lui. È il rinnovo onesto.
     Si segna la scadenza di cui si è già parlato, così non lo ripete a
     ogni avvio: ogni pass ha la sua data, e vale come firma. */
  var scadenzaDetta = 0;
  try { scadenzaDetta = Number(localStorage.getItem('yourbea2-pass-detto') || 0); } catch (e) {}
  setInterval(function () {
    if (!acceso || !abbonamento.scadenza) return;
    if (abbonamento.attivo) return;
    if (abbonamento.scadenza > Date.now()) return;
    if (scadenzaDetta === abbonamento.scadenza) return;
    scadenzaDetta = abbonamento.scadenza;
    try { localStorage.setItem('yourbea2-pass-detto', String(scadenzaDetta)); } catch (e) {}
    diario('PASS finito: lo dico una volta');
    voce.parla('Il pass di sette giorni è finito. Se vuoi continuare a sentire i racconti, dimmi «compra» e ne prendo un altro. Per il resto — le strade, i negozi, «portami a» — l\'app resta come prima, e non si paga.',
               { livello: voce.GUIDA, ancheSeUguale: true });
  }, 60000);

  /* turismoPagato(): chi ha diritto al racconto. */
  function turismoPagato() {
    if (voiceOver) return true;                 // chi non vede non paga
    if (!window.urbeaSaComprare) return true;   // qui non si può comprare: non si chiude
    return abbonamento.attivo;
  }

  function diciAbbonamento() {
    if (voiceOver) {
      voce.parla('Con VoiceOver acceso Turismo è gratis: non c\'è niente da pagare.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    if (!window.urbeaSaComprare) {
      voce.parla('Da qui non si può ancora comprare: l\'abbonamento si prende dall\'app dell\'iPhone.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    if (abbonamento.attivo) {
      var q = '';
      if (abbonamento.scadenza) {
        var g = Math.max(0, Math.round((abbonamento.scadenza - Date.now()) / 86400000));
        q = g <= 1 ? ' Finisce domani.' : (' Finisce fra ' + g + ' giorni.');
      }
      voce.parla('Turismo è aperto.' + q + ' Quando finisce, se vuoi, ne prendi un altro.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    voce.parla('Turismo si apre con un pass di sette giorni' +
               (abbonamento.prezzo ? ', ' + abbonamento.prezzo : '') +
               '. Non si rinnova da solo. Dimmi «compra» per prenderlo, oppure «ripristina» se l\'hai già pagato.',
               { livello: voce.GUIDA, ancheSeUguale: true });
  }

  /* la pagina (index.html) ha bisogno di far dire una frase: il tasto
     «come si mette sulla Home» su iPhone, che spiega i due tocchi. */
  /* il guscio la chiama quando avvicini il telefono alla faccia: chi fa
     quel gesto vuole parlare adesso, non aspettare la fine della frase. */
  window.YBzitta = function () { voce.ferma(); };

  /* SE UN'ALTRA APP STA SUONANDO, YOURBEA TACE — scelta di Vince, 21/10,
     dopo aver scoperto che l'app si addormentava proprio quando apriva
     Radio 24. Tace, ma resta viva e continua a seguire la strada: appena
     la radio finisce riprende. Se nel frattempo qualcuno chiede qualcosa,
     gli si risponde — una domanda non si lascia cadere. */
  var altraRadio = false;
  var ultimoSegnoDiVita = 0;
  window.YBaltraRadio = function (acceso) {
    altraRadio = !!acceso;
    diario('ALTRA APP CON L\'AUDIO: ' + (altraRadio ? 'taccio' : 'posso riparlare'));
    if (altraRadio) voce.ferma();
  };

  window.YBdillo = function (t) {
    voce.parla(t, { livello: voce.GUIDA, ancheSeUguale: true });
  };

  /* ---------- lo schermo ---------- */
  function mostra(cosa) {
    /* la riga di sopra vuota resta VUOTA: col trattino al posto suo, sullo
       schermo restava un segno che non voleva dire niente. */
    if (cosa.dove !== undefined) el('dove').textContent = cosa.dove || '';
    if (cosa.titolo !== undefined) el('cosa').textContent = cosa.titolo;
    if (cosa.testo !== undefined) {
      el('corpo').textContent = cosa.testo;
      el('corpo').className = 'corpo' + (cosa.attesa ? ' attesa' : '');
    }
    if (cosa.gradino !== undefined) el('gradino').textContent = cosa.gradino;
  }
  function stato(t, male) {
    el('stato').innerHTML = t;
    el('stato').className = 'stato' + (male ? ' male' : '');
  }
  /* IL RIQUADRO PER IL LETTORE DI SCHERMO, e perché quasi sempre deve
     restare vuoto.
     «Mia sorella ha sentito tre voci», e lei ha ANDROID — quindi TalkBack,
     che è il lettore di schermo di Android come VoiceOver lo è di iPhone.
     Chi non vede lo tiene acceso sempre: è il modo in cui usa il telefono.
     Questo riquadro è aria-live, cioè il lettore di schermo legge ad alta
     voce tutto quello che ci finisce dentro. E noi ci scrivevamo LA STESSA
     FRASE che la nostra voce stava dicendo: ogni cosa detta due volte, la
     nostra voce e il lettore sopra. Il commento nella pagina diceva già la
     regola giusta — «qui va quello che l'app NON dice» — ma il codice
     faceva il contrario.
     Adesso ci va solo quando la voce non c'è: telefono senza sintesi, o
     audio negato. Allora il lettore di schermo è l'unica uscita e serve. */
  function alLettore(t, laVoceLoDice) {
    try {
      if (laVoceLoDice && window.speechSynthesis) { el('muto').textContent = ''; return; }
      el('muto').textContent = t;
    } catch (e) {}
  }

  /* ---------- quello che c'è intorno, pronto per il racconto ---------- */
  var SERVIZI = { punti: [], aree: [], alberi: [] };
  /* cosaHoIntorno(): com'è fatto il posto dove sei, in tre cose.
     «Per i non vedenti la descrizione del luogo in cui si è» — «è
     inutile mettere il meccanico, l'autosalone e queste cose: meglio
     mettere negozi di utilità. Commissariato. Polizia. Tabaccaio. Poste.
     Bar. Ristoranti» (Vince, 23/10).
     Si pesca da tutt'e due le parti — i monumenti, che orientano e si
     vedono da lontano, e i negozi, che sono quelli di cui si dice il
     nome al telefono — e si ordina per quanto serve a chi cammina,
     non per distanza: una farmacia a ottanta metri vale più di un
     concessionario a dieci. Le cose da macchina non entrano. */
  function conCosaE(p) {
    var n = String(p.nome || '').trim();
    var c = String(p.cosa || '').trim();
    if (!n) return c;
    if (!c) return n;
    return n.toLowerCase().indexOf(c.toLowerCase()) >= 0 ? n : (n + ', ' + c);
  }

  function cosaHoIntorno(quanti) {
    var s = posizione.leggi();
    if (!s.pronto) return [];
    var qui = { lat: s.lat, lon: s.lon };
    var roba = [];
    vicini().forEach(function (o) {
      if (!o.p || !o.p.n) return;
      if (aChiServe.daMacchina(o.p.t)) return;
      roba.push({ nome: o.p.n, m: o.m, rel: o.rel,
                  peso: Math.max(2, aChiServe.utileAPiedi(o.p.t)) });
    });
    (SERVIZI.punti || []).forEach(function (p) {
      if (!p.servizio || p.cosa === 'attraversamento') return;
      var peso = aChiServe.utileAPiedi(p.cosa);
      if (!peso || aChiServe.daMacchina(p.cosa)) return;
      var m = posizione.dist(qui.lat, qui.lon, p.lat, p.lon);
      if (m > 220) return;
      /* IL NOME NON BASTA, SERVE COSA È. A Fontana di Trevi la prova ha
         detto «Ruggeri Massimo sulla destra, a 130 metri»: a un operatore
         del 112 quel nome non dice niente, e a chi non vede nemmeno. Si
         dice tutt'e due — «Ruggeri Massimo, tabaccheria» — tranne quando
         il nome già lo contiene («Farmacia Pesci»). */
      roba.push({ nome: conCosaE(p), m: m, peso: peso, cosa: String(p.cosa || '').toLowerCase(),
                  rel: ((posizione.verso(qui.lat, qui.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180 });
    });
    /* QUANTO SERVE, MENO QUANTO E' LONTANO. Solo per peso, alla prova a
       Fontana di Trevi, usciva l'alimentari a 130 metri prima del bar a
       20: per descrivere un posto conta anche averci davanti la cosa.
       Cento metri valgono un gradino di utilità. */
    roba.forEach(function (x) { x.punti = x.peso - x.m / 100; });
    roba.sort(function (a, b) { return b.punti - a.punti; });
    /* UNO PER TIPO. Alla prova a Fontana di Trevi sono usciti due
       alimentari di fila: due negozi uguali dicono meno di un negozio e
       un bar, perché descrivere un posto vuol dire dire com'è fatto. */
    var visti = {}, tipi = {}, fuori = [];
    for (var i = 0; i < roba.length && fuori.length < (quanti || 3); i++) {
      var k = String(roba[i].nome).toLowerCase();
      if (visti[k]) continue;
      if (roba[i].cosa && tipi[roba[i].cosa]) continue;
      visti[k] = 1;
      if (roba[i].cosa) tipi[roba[i].cosa] = 1;
      /* «bar, sulla destra» comincia la frase in minuscolo: i punti senza
         nome proprio portano solo il tipo, ed è un nome comune. */
      fuori.push(roba[i].nome.charAt(0).toUpperCase() + roba[i].nome.slice(1) + ', ' +
                 (s.direzioneBuona ? versoParole(roba[i]) : ('a ' + Math.round(roba[i].m / 10) * 10 + ' metri')));
    }
    return fuori;
  }

  function vicini() {
    var s = posizione.leggi();
    if (!s.pronto) return [];
    var lista = [];
    /* QUANTO LONTANO SI GUARDA DIPENDE DA QUANTO VAI FORTE. Camminando,
       mezzo chilometro e' gia' dieci minuti. In macchina mezzo chilometro
       sono venti secondi: un luogo entra nell'elenco e ne sei gia' fuori
       prima che l'app apra bocca — ed era questo, insieme alla regola del
       cenno, a far tacere il Turismo da Termini a casa. In movimento si
       guarda un chilometro e mezzo, che e' il raggio per sei di
       parti/racconto (la regola di Soundscape): se qui si tagliasse a
       cinquecento metri, quel raggio non servirebbe a niente. */
    /* fin dove lo decide parti/racconto: e' la stessa regola del raggio,
       e deve restare una copia sola. La scatola e' solo un prefiltro
       veloce: larga abbastanza da non tagliare niente nemmeno in cima
       all'Italia, dove un grado di longitudine e' piu' corto. */
    var FIN_DOVE = racconto.finDove(s.aPiedi);
    var SCATOLA = FIN_DOVE / 70000;
    LUOGHI.forEach(function (p) {
      if (Math.abs(p.lat - s.lat) > SCATOLA || Math.abs(p.lon - s.lon) > SCATOLA) return;
      var m = posizione.dist(s.lat, s.lon, p.lat, p.lon);
      if (m > FIN_DOVE) return;
      var rel = ((posizione.verso(s.lat, s.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180;
      lista.push({ p: p, m: m, rel: rel });
    });
    lista.sort(function (a, b) { return a.m - b.m; });
    return lista;
  }

  /* ---------- la mappa ----------
     Serve a chi sta ACCANTO a chi non vede: guarda lo schermo e capisce in
     un secondo quello che l'app sta dicendo. Per questo il riquadro è fuori
     dal giro del lettore di schermo (aria-hidden nella pagina): quello che
     conta lo dice la voce, e due racconti insieme non si seguono.
     Le regole di cosa disegnare stanno in parti/mappa.js e si provano senza
     schermo; qui c'è solo Leaflet. */
  var mappa = Mappa({ dist: posizione.dist });
  var PERCORSO = null;
  var LE = null, alone = null, ioSono = null, laMeta = null, laLinea = null;
  var segni = [], segniDi = '', ultimoDisegno = 0;

  function apriMappa(s) {
    if (LE || typeof L === 'undefined') return;
    /* il riquadro si scopre PRIMA di fare la mappa: Leaflet misura il
       contenitore quando nasce, e dentro un display:none misura zero —
       veniva fuori una sola tessera in alto a sinistra. */
    el('mappa').classList.remove('vuota');
    LE = L.map('mappa', { zoomControl: true, attributionControl: true, tap: true });
    LE.setView([s.lat, s.lon], 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(LE);
    alone = L.circleMarker([s.lat, s.lon], { radius: 16, color: '#5BE3FF', weight: 1, opacity: .45,
      fillColor: '#5BE3FF', fillOpacity: .12, interactive: false }).addTo(LE);
    ioSono = L.circleMarker([s.lat, s.lon], { radius: 7, color: '#fff', weight: 2,
      fillColor: '#5BE3FF', fillOpacity: 1, interactive: false }).addTo(LE);
    /* chi trascina o allarga se la tiene: niente ricentrate in faccia */
    LE.on('dragstart zoomstart', function () { mappa.laTocca(); });
    /* e si rimisura appena il riquadro ha la sua altezza vera */
    setTimeout(function () { try { LE.invalidateSize(); } catch (e) {} }, 300);
    diario('MAPPA aperta');
  }

  var COLORI = { oro: '#E7C65A', neon: '#5BE3FF', spento: '#8F98A3' };

  function disegnaMappa(s, lista) {
    if (!s || !s.pronto) return;
    apriMappa(s);
    if (!LE) return;
    ioSono.setLatLng([s.lat, s.lon]); alone.setLatLng([s.lat, s.lon]);
    /* il disegno dei puntini è la cosa più cara che facciamo: si rifà al
       massimo ogni tre secondi, e intanto il puntino blu si muove lo
       stesso — quello costa niente. */
    if (Date.now() - ultimoDisegno < 3000 && segniDi) return;
    if (mappa.vaCentrata(s)) { LE.panTo([s.lat, s.lon]); mappa.centrata(s); }

    /* i puntini si rifanno solo se sono cambiati: ridisegnarli a ogni passo
       farebbe lampeggiare la mappa sotto gli occhi di chi la guarda. */
    var inCorso = passeggiata.tappa() || racconto.inCorso();
    var punti = mappa.puntini(lista, modo, inCorso ? inCorso.n : null);
    var firma = punti.map(function (x) { return x.n + x.raggio; }).join('|');
    if (firma !== segniDi || Date.now() - ultimoDisegno > 30000) {
      segniDi = firma; ultimoDisegno = Date.now();
      segni.forEach(function (m) { LE.removeLayer(m); });
      segni = punti.map(function (x) {
        var m = L.circleMarker([x.lat, x.lon], {
          radius: x.raggio, color: x.parla ? '#fff' : COLORI[x.colore], weight: x.parla ? 2 : 1,
          fillColor: COLORI[x.colore], fillOpacity: x.parla ? .95 : .55
        }).addTo(LE);
        /* toccare un puntino lo fa raccontare: è per il turista che vede, e
           per chi accompagna e vuole sapere cos'è quella cosa lì. */
        m.on('click', function () {
          dillo({ tipo: 'scheda', luogo: x.p, testo: x.p.d || x.p.n, livello: 'guida' });
        });
        return m;
      });
    }

    if (laLinea) { LE.removeLayer(laLinea); laLinea = null; }
    if (laMeta) { LE.removeLayer(laMeta); laMeta = null; }
    var m = guida.meta();
    if (m) {
      laMeta = L.circleMarker([m.lat, m.lon], { radius: 9, color: '#4FD38A', weight: 2,
        fillColor: '#4FD38A', fillOpacity: .8 }).addTo(LE);
      var linea = mappa.tracciato(PERCORSO);
      if (linea) laLinea = L.polyline(linea, { color: '#4FD38A', weight: 4, opacity: .6 }).addTo(LE);
    }
    /* la passeggiata: il giro in oro, e la tappa di adesso segnata. È per
       chi accompagna — guarda lo schermo e sa dove si sta andando. */
    if (!m && passeggiata.inCorso()) {
      var giro = passeggiata.linea();
      if (giro && giro.length > 1) laLinea = L.polyline(giro, { color: COLORI.oro, weight: 4, opacity: .5 }).addTo(LE);
      var t = passeggiata.tappa();
      if (t) laMeta = L.circleMarker([t.lat, t.lon], { radius: 10, color: '#fff', weight: 2,
        fillColor: COLORI.oro, fillOpacity: .9 }).addTo(LE);
    }
  }

  /* la scena intorno: la mappa la scaricavamo e non la diceva nessuno */
  var scena = Scena({ distanza: laDistanza,  dist: posizione.dist, verso: posizione.verso });
  /* gli incroci: «superavo gli incroci e non mi dicevi quali strade
     superavo». È roba di Utilità: in Turismo si parla d'arte. */
  var incroci = Incroci({ dist: posizione.dist, verso: posizione.verso });
  /* quello che passi, mentre lo passi — e in TUTTE E DUE le modalità:
     «lo stesso sia per utilità che per turismo» (Vince, 16/10). Una
     fermata o uno scalino servono anche a chi sta guardando una chiesa. */
  var passaggi = Passaggi({ dist: posizione.dist, verso: posizione.verso });

  /* ---------- i negozi della nostra mappa ----------
     Scaricati una volta da Overture, filtrati a quello che si incontra
     camminando, tradotti e tagliati a quadretti da un chilometro. Qui si
     prendono solo i quadretti dove sei, e si uniscono a quello che la
     mappa viva dice adesso — senza ripetere le stesse cose. */
  var negozi = Negozi({ dist: posizione.dist });
  var QUADRETTI = {};            // quelli già scaricati, o che non esistono
  var NOSTRI = [];               // i luoghi dei quadretti intorno
  var CONTRIBUTI = {};           // e i punti messi dai tester, per quadretto

  var CULTURA = {};              // i monumenti, quadretto per quadretto

  function prendiPerIlGiro(tappe) {
    var voluti = {};
    (tappe || []).forEach(function (t) {
      if (t && t.lat) negozi.quadretti(t.lat, t.lon).forEach(function (q) { voluti[q] = true; });
    });
    var elenco = Object.keys(voluti);
    if (!elenco.length) return;
    diario('GIRO: mi porto avanti con ' + elenco.length + ' quadretti');
    elenco.forEach(function (q) {
      ['negozi', 'cultura'].forEach(function (dove) {
        fetch('dati/' + dove + '/' + q + '.json' + VER).catch(function () {});
      });
    });
  }
  function prendiQuadretti(s) {
    var voluti = negozi.quadretti(s.lat, s.lon);
    var mancano = voluti.filter(function (q) { return QUADRETTI[q] === undefined; });
    mancano.forEach(function (q) {
      QUADRETTI[q] = null;                            // segnato: non si richiede
      fetch('dati/negozi/' + q + '.json' + VER).then(function (r) {
        return r.ok ? r.json() : [];
      }).then(function (roba) {
        QUADRETTI[q] = roba || [];
        if (roba && roba.length) diario('NOSTRI: ' + roba.length + ' luoghi nel quadretto ' + q);
        rifaiNostri(voluti);
      }).catch(function () { QUADRETTI[q] = []; });
    });
    rifaiNostri(voluti);

    /* ============================================================
       I CONTRIBUTI DEI TESTER: STESSI QUADRETTI, ALTRA CARTELLA
       «Nella notte il server aggiorna la mappa e il giorno dopo c'e'
       nelle mappe di tutti quelli che hanno Yourbea» (Vince, 25/10).
       Un semaforo acustico segnato ieri da chi ci cammina non sta in
       nessun'altra mappa del mondo: qui entra fra i punti della zona e
       da quel momento l'app lo dice come dice gli altri.
       ============================================================ */
    voluti.filter(function (q) { return CONTRIBUTI[q] === undefined; }).forEach(function (q) {
      CONTRIBUTI[q] = null;
      fetch('dati/contributi/' + q + '.json' + VER).then(function (r) {
        return r.ok ? r.json() : [];
      }).then(function (roba) {
        CONTRIBUTI[q] = roba || [];
        if (roba && roba.length) {
          diario('CONTRIBUTI: ' + roba.length + ' punti dei tester nel quadretto ' + q);
        }
        rifaiNostri(voluti);
      }).catch(function () { CONTRIBUTI[q] = []; });
    });

    /* i monumenti: stessi quadretti, altra cartella. Entrano fra i luoghi
       da raccontare, non fra i servizi. */
    voluti.filter(function (q) { return CULTURA[q] === undefined; }).forEach(function (q) {
      CULTURA[q] = null;
      Promise.all([
        fetch('dati/cultura/' + q + '.json' + VER).then(function (r) {
          return r.ok ? r.json() : [];
        }),
        leMisureDiOsm()
      ]).then(function (due) {
        var roba = due[0], misure = due[1];
        /* le misure stavano dentro le schede; adesso arrivano da un file
           loro e si rimettono qui. Se quel file non c'e' o non arriva,
           l'app racconta lo stesso: perde «larga venti metri», non la
           strada. */
        if (roba && roba.length && misure) {
          var rimesse = 0;
          for (var i = 0; i < roba.length; i++) {
            var m = misure[laChiaveDelleMisure(roba[i])];
            if (!m) continue;
            rimesse++;
            for (var k in m) if (roba[i][k] === undefined) roba[i][k] = m[k];
          }
          /* scritto nel quaderno: se un giorno la chiave cambia da una
             parte sola, qui si legge «0 edifici» e si capisce subito,
             invece di accorgersene dal fatto che l'app non dice piu'
             quanto e' grande una chiesa. */
          if (rimesse) diario('MISURE rimesse: ' + rimesse + ' edifici nel quadretto ' + q);
        }
        CULTURA[q] = roba || [];
        if (!roba || !roba.length) return;
        var nuovi = negozi.perIlRacconto(roba, LUOGHI);
        if (nuovi.length) {
          LUOGHI = LUOGHI.concat(nuovi);
          diario('MONUMENTI: ' + nuovi.length + ' nuovi dal quadretto ' + q + ' (totali ' + LUOGHI.length + ')');
          stato('pronta · <b>' + LUOGHI.length + '</b> luoghi');
        }
      }).catch(function () { CULTURA[q] = []; });
    });
  }
  /* ============================================================
     LE MISURE DI OPENSTREETMAP ARRIVANO A PARTE — 26/10/2026
     Quanto e' grande un edificio, di che materiale e', quanti piani ha,
     di che anno e': queste cinque cose vengono da OpenStreetMap, che le
     da' con la licenza ODbL — la quale chiede che un database derivato
     resti aperto. Finche' stavano dentro le nostre schede, tutto
     l'archivio era discutibile. Adesso stanno in un file loro, con la
     licenza scritta dentro, e l'app le rimette insieme al volo.
     E' un file solo per tutta l'Italia, 218 KB, chiesto una volta e
     poi tenuto: non aggiunge una richiesta per ogni quadretto.
     Lo scrive strumenti/separa-i-dati.py.
     ============================================================ */
  var MISURE = null;
  function leMisureDiOsm() {
    if (!MISURE) {
      MISURE = fetch('dati/osm/misure.json' + VER).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (roba) {
        var quante = roba && roba.misure ? Object.keys(roba.misure).length : 0;
        diario('MISURE da OpenStreetMap: ' + quante + ' edifici');
        return roba ? roba.misure : null;
      }).catch(function () { return null; });
    }
    return MISURE;
  }
  /* la stessa chiave di separa-i-dati.py: il punto a cinque decimali
     (poco piu' di un metro) e il nome. */
  function laChiaveDelleMisure(p) {
    return (p.lat || 0).toFixed(5) + ',' + (p.lon || 0).toFixed(5) + '|' + (p.n || '');
  }

  function rifaiNostri(voluti) {
    var tutti = [];
    voluti.forEach(function (q) {
      if (QUADRETTI[q] && QUADRETTI[q].length) tutti = tutti.concat(QUADRETTI[q]);
      /* e i contributi dei tester, messi in forma di punto come gli altri:
         `t` e' il tipo, e per gli attraversamenti il semaforo e il tattile
         sono quelli che contano. */
      if (CONTRIBUTI[q] && CONTRIBUTI[q].length) {
        CONTRIBUTI[q].forEach(function (c) {
          var p = { lat: c.lat, lon: c.lon, cosa: COME_SI_CHIAMA[c.t] || c.t,
                    nome: c.n || '', daUnTester: c.da || '', quanti: c.quanti || 1 };
          if (c.t === 'attraversamento' || c.t === 'semaforo') {
            p.cosa = 'attraversamento';
            if (c.sem) p.semaforo = true;
            if (c.ac) { p.semaforo = true; p.suona = true; }
            if (c.tat) p.tattile = true;
          } else if (c.t === 'tattile') {
            p.cosa = 'percorso tattile';
          } else if (c.t === 'fermata') {
            p.cosa = 'fermata dell\u2019autobus';
            p.servizio = p.cosa;
            if (c.lin && c.lin.length) p.linee = c.lin.join(', ');
          } else if (c.t === 'posto') {
            /* un posto col nome e' un servizio come gli altri: lo si dice
               passandoci davanti. */
            p.servizio = c.n || 'posto';
          } else {
            p.servizio = p.cosa;
          }
          tutti.push(p);
        });
      }
    });
    NOSTRI = tutti;
  }
  /* come si chiama a voce quello che segnano i tester */
  var COME_SI_CHIAMA = {
    attraversamento: 'attraversamento', scalini: 'scalini',
    scivolo: 'scivolo del marciapiede', fermata: 'fermata dell\u2019autobus',
    metro: 'ingresso della metropolitana', ostacolo: 'ostacolo',
    semaforo: 'attraversamento', tattile: 'percorso tattile',
    albero: 'albero', panchina: 'panchina', fontanella: 'fontanella',
    bagno: 'bagno pubblico'
  };
  function raccontaScena() {
    var s = posizione.leggi();
    if (!s.pronto || !acceso) return;
    /* LA SCENA E' DI UTILITA'. Piazze, alberi, attraversamenti e negozi
       servono a orientarsi e a sbrigare le cose. In Turismo no: li si parla
       di arte, architettura e storia, e basta. Parole di Vince, il 15/10:
       «aspetta, questa e' utilita'; turismo informazioni artistiche,
       architettoniche e storiche». */
    if (modo !== 'servizi') return;
    if (s.aPiedi === false) return;      // la scena si misura in passi: vale se cammini
    if (s.prec > 50) return;             // e vale solo se sappiamo dove siamo
    /* I NUMERI CIVICI MAI. «Poi mi diceva i numeri civici» (Vince, 16/10)
       e di nuovo il 18/10, piu' secco: «numeri civici mai». Qui passavo
       `ultimaStrada`, che e' via PIU' numero — e la scena apriva con «Sei
       in Via Osvaldo Costabile 18», poi 6, poi 22, poi 57: quattro volte
       la stessa via in cento secondi, che e' poi il «dice sempre le stesse
       cose». Il numero resta in `ultimaStrada` per chi lo CHIEDE («che
       numero siamo»), e non esce mai da solo. */
    var d = scena.descrivi({ qui: { lat: s.lat, lon: s.lon }, direzione: s.direzione,
                             direzioneBuona: s.direzioneBuona, strada: ultimaVia, mappa: SERVIZI });
    if (d) { dillo(d); return; }
    /* se non dice niente deve restare scritto PERCHÉ: «all'andata non c'era
       una descrizione della realtà» (Vince, 16/10) e dal di fuori una
       scena muta e una scena che non ha niente da dire sono identiche. */
    diario('SCENA: niente da dire — ' + (SERVIZI.punti || []).length + ' punti, ' +
           (SERVIZI.aree || []).length + ' aree, ' + (SERVIZI.alberi || []).length + ' alberi, strada «' +
           (ultimaStrada || '?') + '»');
  }

  /* LA SCENA SI PROVA A DIRE OGNI VENTI SECONDI, non una volta al minuto.
     Prima poteva parlare solo nell'istante in cui arrivava la risposta
     della mappa — cioè al massimo una volta al minuto, e solo se quella
     richiesta partiva: camminando, in mezzo, c'era il silenzio. Qui si
     prova spesso; a non ripetersi ci pensa parti/scena.js, che la stessa
     scena non la dice due volte. */
  setInterval(function () { if (acceso && modo === 'servizi' && !guida.meta()) raccontaScena(); }, 20000);

  var clip = Clip();

  /* ---------- l'emergenza e la guida ---------- */
  var contatto = null;
  try { contatto = JSON.parse(localStorage.getItem('yourbea2-contatto') || 'null'); } catch (e) {}
  var casa = '';
  try { casa = localStorage.getItem('yourbea2-casa') || ''; } catch (e) {}
  var ioSonoIo = '';
  try { ioSonoIo = localStorage.getItem('yourbea2-io') || ''; } catch (e) {}
  /* chi ha detto «lascia perdere» non se lo sente richiedere mai più:
     sta in una chiave sua, perché nel posto del nome diventerebbe la voce
     che dice «Ciao meno». */
  var nienteNome = false;
  try { nienteNome = localStorage.getItem('yourbea2-niente-nome') === 'si'; } catch (e) {}
  var dettatura = Dettatura();

  /* LEGGERE QUELLO CHE LA FOTOCAMERA HA DAVANTI. Lo scatto e il
     riconoscimento del testo li fa il guscio con Vision, dentro iOS: gratis,
     senza rete e senza chiavi di nessuno. Cosa dire di quelle righe — quale
     viene prima, quali sono rumore, quante per volta — sta in
     parti/lettura.js, con le sue prove. */
  var lettura = Lettura({});

  /* ---------- UNA SOLA APP CHE PARLA ----------
     La sorella di Vince, provandola in centro: «sentivo tre voci», «e si
     bloccava». Non erano tre voci: era Yourbea aperta in tre posti —
     l'icona sulla schermata Home, una scheda del browser, magari la
     vecchia. Ognuna col suo GPS, la sua voce e i suoi scaricamenti, tutte
     e tre sullo stesso telefono: ecco anche il blocco.
     Adesso si parlano fra loro: chi apre per ultimo prende la parola, gli
     altri si zittiscono e lo dicono invece di sovrapporsi. */
  var SONO_IO = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7);
  var hoLaParola = true;
  function zittisciti(chi) {
    if (!hoLaParola) return;
    hoLaParola = false;
    try { voce.ferma(); } catch (e) {}
    diario('ZITTA: Yourbea è aperta anche altrove (' + chi + ')');
    mostra({ titolo: 'Aperta un\'altra volta', dove: '', gradino: '', attesa: true,
             testo: 'Yourbea è aperta in un\'altra finestra, e parla quella. Chiudi questa, oppure ricaricala per riprendere la parola.' });
  }
  var canale = null;
  try { canale = new BroadcastChannel('yourbea'); } catch (e) {}
  if (canale) {
    canale.onmessage = function (e) {
      if (!e.data || e.data.chi === SONO_IO) return;
      if (e.data.cosa === 'sono-qui') zittisciti('altra finestra');
    };
    try { canale.postMessage({ cosa: 'sono-qui', chi: SONO_IO }); } catch (e) {}
  }
  /* la memoria condivisa arriva anche dove il canale non c'è */
  try {
    localStorage.setItem('yourbea2-chi-parla', SONO_IO);
    window.addEventListener('storage', function (e) {
      if (e.key === 'yourbea2-chi-parla' && e.newValue && e.newValue !== SONO_IO) zittisciti('altra scheda');
    });
  } catch (e) {}

  /* ---------- la vecchia Yourbea si butta da sé ----------
     «Fai in modo che chi scarica la nuova butti in automatico la vecchia».
     Chi aveva la vecchia si porta dietro il suo service worker — che se
     resta vivo continua a servire i file di prima — decine di megabyte di
     casseforti, e le sue chiavi. Prima però si travasa quello che dentro
     c'è di suo: casa e il numero di chi avvisare. Farli riscrivere a un non
     vedente perché abbiamo cambiato programma sarebbe una mancanza di
     rispetto. Le regole stanno in parti/pulizia.js e si provano. */
  var casaPunto = null;
  try { casaPunto = JSON.parse(localStorage.getItem('yourbea2-casa-punto') || 'null'); } catch (e) {}
  (function buttaLaVecchia() {
    var pul = Pulizia();
    var vecchie = {};
    try {
      vecchie.casa = JSON.parse(localStorage.getItem('urbea-casa') || 'null');
      vecchie.soccorso = JSON.parse(localStorage.getItem('urbea-soccorso') || 'null');
      vecchie.testo = localStorage.getItem('urbea-testo') || '';
    } catch (e) {}
    var nuove = {};
    try {
      nuove.contatto = JSON.parse(localStorage.getItem('yourbea2-contatto') || 'null');
      nuove.casa = localStorage.getItem('yourbea2-casa') || '';
      nuove.casaPunto = casaPunto;
      nuove.testo = localStorage.getItem('yourbea2-testo') || '';
    } catch (e) {}

    var salvo = pul.travaso(vecchie, nuove);
    try {
      if (salvo.contatto) localStorage.setItem('yourbea2-contatto', JSON.stringify(salvo.contatto));
      if (salvo.casaPunto) { localStorage.setItem('yourbea2-casa-punto', JSON.stringify(salvo.casaPunto)); casaPunto = salvo.casaPunto; }
      if (salvo.testo) localStorage.setItem('yourbea2-testo', salvo.testo);
    } catch (e) {}
    if (salvo.contatto || salvo.casaPunto || salvo.testo) diario('DALLA VECCHIA: travasato quello che c\'era');

    var chiavi = [];
    try { for (var i = 0; i < localStorage.length; i++) chiavi.push(localStorage.key(i)); } catch (e) {}
    var via = pul.chiaviDaButtare(chiavi);
    via.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    if (via.length) diario('DALLA VECCHIA: buttate ' + via.length + ' chiavi');

    if (window.caches && caches.keys) {
      caches.keys().then(function (nomi) {
        var fuori = pul.casseforti(nomi);
        if (fuori.length) diario('DALLA VECCHIA: butto ' + fuori.length + ' casseforti');
        return Promise.all(fuori.map(function (n2) { return caches.delete(n2); }));
      }).catch(function () {});
    }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) {
          if (pul.spegnereIlWorker(r.scope)) { diario('DALLA VECCHIA: spengo il worker ' + r.scope); r.unregister(); }
        });
      }).catch(function () {});
    }
  })();
  var inAttesaDi = null;       // { cosa:'numero', nome } | { cosa:'conferma', nome, numero }
  var emergenza = Emergenza({ contatto: contatto, io: ioSonoIo });
  /* COME si dicono le cose: parti/modi.js (9 prove). Cambia la parolina
     davanti ai cenni, alle scene e ai passaggi — mai ai fatti, mai alle
     frasi che servono a girare. «Più parole, un linguaggio più articolato,
     potrebbe fare più compagnia» (Vince, 16/10). */
  var modi = Modi({ nome: ioSonoIo });
  /* IL MOTORE CHE USANO TUTTI I NAVIGATORI. «Devi riprendere il motore
     di qualsiasi navigatore open source» (Vince, 23/10): non e' il
     calcolo della strada — quello ce l'abbiamo da Valhalla — e' il
     conto di DOVE SEI SULLA STRADA. Si proietta la posizione sulla
     linea e si contano i metri fatti: da li' escono la prossima
     svolta, quanto manca e il fuori strada, senza casi particolari.
     parti/avanzamento.js, 7 prove. */
  var avanzamento = Avanzamento({ dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); } });
  var guida = Guida({ distanza: laDistanza,  dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
                      verso: function (a, b, c, d) { return posizione.verso(a, b, c, d); },
                      avanzamento: avanzamento,
                      diario: diario });

  /* la musica sotto il racconto: solo in Turismo e piano, con le regole in
     parti/musica.js (8 prove). Qui c'è solo l'elemento audio. */
  var musica = Musica({});
  try { musica.accendi(localStorage.getItem('yourbea2-musica') !== 'no'); } catch (e) {}
  var tappeto = null, tappetoQuale = '';
  var ultimoAvvioMusica = 0;
  /* ============================================================
     LA MUSICA NON PARTE MENTRE L'APP PARLA
     «All'inizio balbettava come ieri, poi è andata» (Vince, 22/10, in
     scooter). Il quaderno di quella corsa lo conta: 49 interruzioni
     dell'audio in una giornata, e **34 su 49 entro due secondi da un
     "MUSICA: suona". Non era una telefonata, non era un'altra app: era
     la nostra musica di sottofondo.
     Il meccanismo, riga per riga, alle 15:10:38 — l'app dice «Ciao
     Vincenzo, ti racconto quello che hai intorno», due secondi dopo
     parte il tappeto, e nello stesso secondo arriva «audio interrotto»:
     la frase muore a meta'. Poi il microfono si apre, l'elemento audio
     viene messo in pausa dal sistema, noi vediamo `paused` e chiamiamo
     `play()`, che riconfigura di nuovo la sessione e interrompe di
     nuovo. Un cerchio: interruzione → pausa → play → interruzione.
     DUE REGOLE, e sono le stesse che si userebbero con una persona:
     1. NON SI ATTACCA A PARLARE MENTRE PARLA UN ALTRO. Se la voce sta
        dicendo qualcosa, la musica aspetta: il volume lo si puo'
        cambiare (non tocca la sessione), ma `play()` no.
     2. E NON SI RIPROVA A RAFFICA. Dopo un avvio, tre secondi di
        respiro: se il sistema l'ha messa in pausa per una ragione sua,
        riprovarci dopo mezzo secondo riapre il cerchio.
     La musica e' un di piu'; la voce e' l'app. Nel dubbio, tace lei. */
  function suonaMusica(d) {
    if (!d.suona) {
      if (tappeto && !tappeto.paused) { try { tappeto.pause(); } catch (e) {} }
      return;
    }
    if (!tappeto || tappetoQuale !== d.brano) {
      if (tappeto) { try { tappeto.pause(); } catch (e) {} }
      try { tappeto = new Audio('musica/' + d.brano + '.m4a' + VER); } catch (e) { diario('MUSICA: non riesco a prepararla'); return; }
      tappeto.loop = true;              // sono cuciti per girare senza stacco
      /* SE NON SUONA, DEVE RESTARE SCRITTO. Prima l'errore veniva inghiottito
         in silenzio: dal di fuori la musica che non parte e la musica
         spenta erano identiche, e nel browser l'audio è negato, quindi la
         prova vera si può fare solo sul telefono. Adesso lo dice il
         quaderno della camminata. */
      tappeto.onerror = function () { diario('MUSICA: il file non si carica (' + tappetoQuale + ')'); };
      tappetoQuale = d.brano;
    }
    /* il volume si puo' cambiare sempre: non tocca la sessione audio */
    tappeto.volume = d.volume;
    if (tappeto.paused) {
      /* ma riattaccare no, non mentre l'app parla o sta per parlare */
      if (voce.staParlando()) { diario('MUSICA: aspetto, sta parlando'); return; }
      if (Date.now() - ultimoAvvioMusica < 3000) return;
      ultimoAvvioMusica = Date.now();
      var p = tappeto.play();
      if (p && p.then) {
        p.then(function () { diario('MUSICA: suona ' + tappetoQuale + ', volume ' + d.volume); })
         .catch(function (e) { diario('MUSICA: non parte — ' + ((e && e.name) || 'motivo ignoto')); });
      } else {
        diario('MUSICA: avviata ' + tappetoQuale);
      }
    }
  }
  /* STAI PERCORRENDO VIA MARCONI. «Il prossimo incrocio, se continui
     dritto trovi…» (Vince, 16/10): su un viale lungo, ripetere «sei
     entrato in via Marconi» è inutile — ci sei già — ma il silenzio è
     peggio. Ogni minuto e mezzo, camminando sulla stessa strada, si dice
     dove sei, cosa incroci più avanti e cosa trovi continuando dritto.
     È la differenza fra essere avvisati ed essere guidati. */
  var ultimoRiepilogo = 0;
  var ultimoGiro = '';        // di che cosa ho parlato l'ultima volta
  var ultimoCivico = 0;       // «qualche numero civico», non a raffica
  function aPiediOra() { return posizione.leggi().aPiedi !== false; }
  /* ============================================================
     IL GIRO DI PAROLE — ogni minuto e mezzo, e mai la stessa cosa
     «Dice sempre le stesse cose: stai percorrendo questa strada, incrocio,
     numeri civici… non e' una compagnia per il non vedente» (Vince, 18/10,
     tornando da Vietri). E poi la frase che fa da modello: «di fronte,
     davanti a te hai il golfo, Raito».

     Prima qui usciva sempre la stessa formula — strada, prossimo incrocio,
     cosa trovi dritto — ogni novanta secondi, con dentro anche il numero
     civico. Tre famiglie di frasi che dicono tutte DOVE SEI, a uno che lo
     sa gia' perche' ci sta camminando.

     Adesso si gira: a ogni turno si dice UNA cosa, la prima della lista che
     ha qualcosa da dire e che non e' quella di prima. In ordine di quanto
     tiene compagnia:
       1. COSA HAI DAVANTI, per nome. E' la frase di Vince.
       2. L'INCROCIO che arriva, che serve a camminare.
       3. LA STRADA, e solo se non l'ho gia' detta da poco.
     I numeri civici non ci sono piu' in nessuna delle tre: si dicono solo
     a chi li chiede.                                                      */
  function stradaERiepilogo() {
    var s = posizione.leggi();
    if (!acceso || !s.pronto || s.fermo || guida.meta()) return;
    if (!ultimaVia || !s.direzioneBuona) return;
    if (Date.now() - ultimoRiepilogo < 90000) return;

    var qui = { lat: s.lat, lon: s.lon };
    var fatte = [];

    /* 0. IL PAESAGGIO, e viene prima di tutto. Il golfo, i paesi sulla
       costa, gli scogli davanti: è quello che chi vede ha alzando gli
       occhi, e chi non vede ha solo se glielo si racconta. Le sue regole
       stanno in parti/paesaggio.js: lontano, senza passi, due cose per
       volta, e lo stesso golfo non si ridice ogni minuto. */
    var pae = paesaggio.intorno({ qui: qui, direzione: s.direzione,
                                  direzioneBuona: s.direzioneBuona,
                                  aPiedi: s.aPiedi,
                                  luoghi: LUOGHI });
    if (pae) fatte.push({ che: 'paesaggio', testo: pae.testo });

    /* 1. QUELLO CHE HAI DAVANTI. Si guarda prima fra i luoghi che hanno una
       storia — e' quello che tiene compagnia — e solo se non ce n'e'
       nessuno si ripiega sui servizi. Il cono e' stretto, quaranta gradi:
       «davanti a te» dev'essere davvero davanti. */
    var avanti = null, da = 1e9;
    /* CHE COSA CONTA, E PER CHI. «La differenza la farà la qualità delle
       informazioni e la suddivisione di esse in funzione dell'utente»
       (Vince, 19/10). In UTILITA' vengono prima i punti che ORIENTANO — il
       municipio, lo stadio, l'ospedale, la stazione, il mercato: quelli che
       uno userebbe per dire «ci vediamo davanti a». E le fermate, che a chi
       deve muoversi servono piu' di tutto. In TURISMO vengono prima quelli
       che hanno una storia scritta. */
    var perUtilita = (modo === 'servizi');

    /* 0-bis. I NUMERI CIVICI, saliti di posto tre volte in tre giorni.
       18/10: «numeri civici mai», perche' li diceva a raffica — «sei in Via
       Osvaldo Costabile 18», poi 6, poi 22, poi 57 in cento secondi.
       19/10: «qualche numero civico». 20/10, dopo «portami a casa»:
       «aumenta la frequenza dei numeri civici».
       Non e' un cambio d'idea: camminando, i numeri sono il contachilometri
       di chi non vede — dicono a che punto della via sei, e nient'altro lo
       dice. Il guaio era la raffica, non il numero. Qui il civico sta nel
       giro, quindi non puo' uscire due volte di fila per costruzione; e
       adesso e' fra i primi, e aspetta un minuto invece di quattro. */
    /* ============================================================
       «SIAMO AL NUMERO ZATORI» — 25/10, dalla camminata vera di Vince
       Il civico si ricavava TAGLIANDO dalla scritta completa la
       lunghezza del nome della via: `ultimaStrada.slice(ultimaVia.length)`.
       Ma `ultimaVia` e' la via di PRIMA, e in via dei Sommozzatori,
       arrivando da via Laurentina (quattordici lettere), il taglio
       lasciava «zatori». Vince: «ha detto 13 e 14... ma non c'era una
       logica». Non c'era: erano pezzi di nomi di strada.
       Adesso il numero si CERCA, e deve essere un numero: se non c'e',
       non si dice niente. E si dice con la via, perche' «numero 13» da
       solo non orienta nessuno.
       ============================================================ */
    if (perUtilita && aPiediOra() && ultimaStrada &&
        Date.now() - ultimoCivico > 60000) {
      var trovato = /(?:^|[\s,])(\d{1,4}[a-zA-Z]?)\s*$/.exec(ultimaStrada.trim());
      var numero = trovato ? trovato[1] : '';
      /* E IL CIVICO DEVE ESSERE DI QUESTA VIA. La scritta intera arriva
         dalla rete e resta finche' non ne arriva un'altra: se intanto
         l'aggancio locale ti ha portato in una via nuova, dire il numero
         di quella scritta vuol dire mandare qualcuno al civico di
         un'altra strada. Se le due vie non combaciano, si tace. */
      var viaDellaScritta = (ultimaStrada.replace(/(?:^|[\s,])\d{1,4}[a-zA-Z]?\s*$/, '')).trim();
      if (numero && ultimaVia && viaDellaScritta && !uguali(ultimaVia, viaDellaScritta)) {
        numero = '';
      }
      if (numero) {
        var viaDelCivico = ultimaVia || viaDellaScritta;
        fatte.push({ che: 'civico',
                     testo: viaDelCivico ? ('Siamo a ' + viaDelCivico + ' ' + numero + '.')
                                         : ('Siamo al numero ' + numero + '.') });
      }
    }

    function guarda(lat, lon, nome, quanto) {
      var d = posizione.dist(qui.lat, qui.lon, lat, lon);
      if (d < 30 || d > 400) return;
      var rel = ((posizione.verso(qui.lat, qui.lon, lat, lon) - s.direzione + 540) % 360) - 180;
      if (Math.abs(rel) > 40) return;
      var peso = d / Math.max(1, quanto);
      if (peso >= da) return;
      da = peso; avanti = { nome: nome, metri: d };
    }
    vicini().forEach(function (x) {
      if (!x.p.n || !racconto.daRaccontare(x.p, modo)) return;
      var quanto = aChiServe.quantoConta(x.p, modo);
      guarda(x.p.lat, x.p.lon, racconto.conArticolo(x.p), quanto);
    });
    (SERVIZI.punti || []).forEach(function (p) {
      if (!p.nome || !p.servizio) return;
      var quanto = perUtilita && /fermata|stazione|metropolitana/.test(p.servizio || '') ? 3 : 1;
      guarda(p.lat, p.lon, p.nome, quanto);
    });
    if (avanti) fatte.push({ che: 'avanti',
      testo: 'Davanti a te hai ' + avanti.nome + ', ' + scena.passi(avanti.metri) + '.' });

    /* 2. L'INCROCIO CHE ARRIVA — ma solo a piedi: in macchina un incrocio
       pedonale e' gia' passato quando lo dici. */
    var inc = !aPiediOra() ? null : incroci.ilProssimo({ qui: qui, vie: SERVIZI.vie || [], strada: ultimaVia,
                                   direzione: s.direzione, direzioneBuona: true });
    if (inc) fatte.push({ che: 'incrocio',
      testo: 'Il prossimo incrocio è ' + inc.nome + ', ' + scena.passi(inc.metri) + '.' });

    /* 3. LA STRADA, se non l'ho gia' detta da poco */
    if (Date.now() - (stradeDette[senzaAccenti(ultimaVia)] || 0) > 240000) {
      fatte.push({ che: 'strada', testo: 'Stai percorrendo ' + ultimaVia + '.' });
    }

    if (!fatte.length) return;
    /* la prima che non e' quella di prima; se c'e' solo quella, si aspetta
       il giro dopo invece di ripeterla */
    var scelta = null;
    for (var i = 0; i < fatte.length; i++) {
      if (fatte[i].che !== ultimoGiro) { scelta = fatte[i]; break; }
    }
    if (!scelta) { diario('GIRO: ho solo «' + fatte[0].che + '», gia detto: taccio'); return; }
    ultimoGiro = scelta.che;
    ultimoRiepilogo = Date.now();
    if (scelta.che === 'strada') stradeDette[senzaAccenti(ultimaVia)] = Date.now();
    if (scelta.che === 'civico') ultimoCivico = Date.now();
    dillo({ tipo: 'strada', livello: 'cenno', testo: scelta.testo });
  }

  setInterval(stradaERiepilogo, 20000);

  /* IL SEGNO DI VITA. Chi non vede non può dare un'occhiata allo schermo
     per sapere se l'app sta ancora lavorando: se tace per minuti, non sa
     se è spenta, se si è persa, o se davvero non c'è niente da dire. Ogni
     due minuti di silenzio, mentre cammina, dice dove si trova — una frase
     breve e vera, non un «sono qui» che non serve a niente. Fermo in casa
     non parla: lì il silenzio non preoccupa nessuno. */
  var ultimaParola = Date.now();
  setInterval(function () {
    if (!acceso || voce.staParlando()) { ultimaParola = Date.now(); return; }
    if (Date.now() - ultimaParola < 120000) return;
    var s = posizione.leggi();
    if (!s.pronto || s.fermo) { ultimaParola = Date.now(); return; }
    ultimaParola = Date.now();
    diario('SEGNO DI VITA');
    dillo({ tipo: 'strada', livello: 'cenno',
            testo: ultimaVia ? ('Sei sempre in ' + ultimaVia + '. Ti sto seguendo.')
                                : 'Ti sto seguendo: qui intorno non ho niente di segnato.' });
  }, 20000);

  /* il giro della musica: una volta ogni mezzo secondo, così l'abbassata
     sotto la voce si sente morbida e non a scatti. */
  setInterval(function () {
    if (!acceso) { suonaMusica({ suona: false }); return; }
    suonaMusica(musica.decide({ modo: modo, staParlando: voce.staParlando(),
                                livello: voce.livello() === voce.EMERGENZA ? 'emergenza' : 'guida' }));
  }, 500);

  /* le passeggiate: i giri a tappe della vecchia app. Le regole stanno in
     parti/passeggiata.js, con 21 prove; qui si attaccano soltanto alla voce,
     alla posizione e alla mappa. */
  var passeggiata = Passeggiata({ dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
                                  verso: function (a, b, c, d) { return posizione.verso(a, b, c, d); } });

  /* esegui(): le mosse che l'emergenza chiede — chiamare, mandare un
     messaggio. Si fanno QUI, dopo che la frase e' stata detta: se no la
     chiamata parte mentre l'app sta ancora parlando e non si sente niente. */
  /* le mosse in attesa si possono fermare: finché la chiamata non è
     partita, «messaggio» o «ferma» la annullano. Senza questo la doppia
     strada sarebbe finta. */
  var mosseInAttesa = [];
  function fermaLeMosse() {
    mosseInAttesa.forEach(function (id) { clearTimeout(id); });
    if (mosseInAttesa.length) diario('MOSSE annullate');
    mosseInAttesa = [];
  }
  function esegui(mosse) {
    if (!mosse) return;
    mosse.forEach(function (m) {
      mosseInAttesa.push(setTimeout(function () {
        try {
          if (m.cosa === 'chiama') location.href = 'tel:' + m.numero;
          else if (m.cosa === 'messaggio') location.href = suWhatsApp(m.numero, m.testo);
        } catch (e) { diario('MOSSA non riuscita: ' + m.cosa); }
      }, m.fraMillisecondi || 1500));
    });
  }
  /* suWhatsApp(): il messaggio si manda da WhatsApp, non con gli SMS —
     e' quello che la gente ha aperto davvero. wa.me vuole il numero in
     cifre, col prefisso del paese e senza il piu'. Se il numero e' stato
     scritto all'italiana — 333... — si mette il 39 davanti: non si
     indovina un paese, si completa il nostro. */
  function suWhatsApp(numero, testo) {
    return 'https://wa.me/' + emergenza.numeroWhatsApp(numero) + '?text=' + encodeURIComponent(testo);
  }

  /* avvisaOra(): il tasto. Se il contatto non c'e' non si inventa niente:
     lo dice e apre il posto dove scriverlo. */
  function avvisaOra(come) {
    if (!contatto || !contatto.telefono) {
      voce.parla('Non ho ancora nessuno da avvisare. Scrivi qui il nome e il numero, col prefisso, e poi basta un tasto.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      apriCassetto(true);
      el('riga-contatto').hidden = false;
      el('contatto-nome').focus();
      return;
    }
    var s = posizione.leggi();
    var dove = { via: ultimaStrada || '', lat: s.lat, lon: s.lon };
    fermaLeMosse();
    dilloSubito(come === 'messaggio' ? emergenza.avvisaContatto(dove) : emergenza.chiamaContatto(dove));
  }

  function scriviTastoAvvisa() {
    var n = contatto && contatto.nome;
    /* solo la parola, non il tasto: l'icona è disegnata nella pagina e
       riscrivendo tutto il contenuto sparirebbe */
    el('avvisa-contatto').querySelector('span').textContent = n ? ('Chiama ' + n) : 'Chiama il mio contatto';
    el('messaggio-contatto').querySelector('span').textContent = n ? ('Messaggio a ' + n) : 'Mandagli un messaggio';
  }

  /* ---------- le frasi che impostano le cose ----------
     «Un non vedente deve fare tutto a voce»: niente dev'essere raggiungibile
     solo col dito. Qui si risponde alle frasi capite da parti/dettatura.js. */
  function dalDettato(t, grezzo) {
    /* `grezzo` e' il testo come l'ha detto: serve dove si tengono le sue
       parole o un nome con la maiuscola. `t` e' sbassato, e serve a
       riconoscere. */
    grezzo = String(grezzo == null ? t : grezzo);
    var r = dettatura.capisci(t);

    /* STO ASPETTANDO IL NOME (prima volta che si apre).
       Tre modi di rispondere, e tutti e tre vanno bene:
       - «Vince», secco: una o due parole e nient'altro;
       - «mi chiamo Vince»: lo capisce già parti/dettatura.js, e passa dal
         ramo r.cosa === 'io' qui sotto;
       - «lascia perdere»: si va avanti senza nome, e non si richiede più.
       Se invece arriva un comando vero — «portami a casa», «dove sono» —
       vince il comando: chi chiede una cosa non vuole rispondere a una
       domanda. L'emergenza non passa nemmeno da qui: è più in alto. */
    /* HO CHIESTO COME STA, E HA RISPOSTO. Due parole e si va al lavoro:
       non è una conversazione. Se invece di rispondere chiede una cosa,
       vince la cosa — l'attesa cade e il comando passa. */
    if (inAttesaDi && inAttesaDi.cosa === 'percorso-arrivato') {
      var ilSuo = inAttesaDi.percorso;
      inAttesaDi = null;
      if (/^(si|si grazie|va bene|certo|tienilo|lo tengo|ok)$/.test(normalizza(t))) {
        if (miei.aggiungi(ilSuo)) {
          salvaIMiei();
          voce.parla('Tenuto. Quando vuoi dimmi «portami ' + miei.aPosto(ilSuo.nome || 'lì') + '».',
                     { livello: voce.GUIDA, ancheSeUguale: true });
        } else {
          voce.parla('Questo percorso non si può tenere.', { livello: voce.GUIDA, ancheSeUguale: true });
        }
        return true;
      }
      voce.parla('Va bene, non lo tengo.', { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }

    /* E LO STESSO PER I RIFERIMENTI CHE TI HANNO MANDATO. */
    if (inAttesaDi && inAttesaDi.cosa === 'riferimenti-arrivati') {
      var roba = inAttesaDi.roba;
      inAttesaDi = null;
      if (/^(si|si grazie|va bene|certo|tienili|li tengo|ok)$/.test(normalizza(t))) {
        var esito = posti.unisci(roba);
        salvaIPosti();
        voce.parla('Tenuti' + (esito.messi.length ? ': ' + esito.messi.length : '') +
                   (esito.gia ? ', e ' + esito.gia + ' li avevi gi\u00e0' : '') +
                   '. Dimmi «che posti ho» per sentirli.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      voce.parla('Va bene, non li tengo.', { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }

    /* HO CHIESTO COME SI CHIAMA IL PERCORSO, e lui risponde. Due parole:
       «il medico», «da mia sorella». Se invece di rispondere chiede una
       cosa, vince la cosa — il percorso resta senza nome e si puo'
       nominare dopo. */
    if (inAttesaDi && inAttesaDi.cosa === 'nome-percorso') {
      var ilP = inAttesaDi.percorso;
      if (/^(?:lascia perdere|niente|non importa|senza nome|no)$/.test(normalizza(t))) {
        inAttesaDi = null;
        voce.parla('Va bene, resta senza nome.', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      /* VIA L'ARTICOLO DAL NOME. «Il medico» tenuto cosi' com'e' faceva
         dire «portami all'il medico»: il nome si tiene nudo — «medico» —
         e l'articolo lo mette aPosto() quando serve. */
      var comeSiChiama = miei.soloIlNome(String(grezzo || '').replace(/[?!.]+$/, ''));
      if (comeSiChiama && comeSiChiama.split(/\s+/).length <= 5 && !miei.dallaVoce(comeSiChiama)) {
        inAttesaDi = null;
        if (ilP) { ilP.nome = comeSiChiama; salvaIMiei(); }
        voce.parla('Segnato. Quando vuoi dimmi «portami ' + miei.aPosto(comeSiChiama) +
                   '». E per darlo a qualcuno: «manda il percorso», e ti chiedo a chi.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      inAttesaDi = null;            // era un comando: vince lui
    }

    /* HO CHIESTO A CHI MANDARLO. Il nome e basta: «a Lucia», «mia
       sorella», «Lucia». */
    if (inAttesaDi && inAttesaDi.cosa === 'a-chi-percorso') {
      var daMand = inAttesaDi.percorso;
      if (/^(?:lascia perdere|niente|non importa|a nessuno|no)$/.test(normalizza(t))) {
        inAttesaDi = null;
        voce.parla('Va bene, non lo mando.', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      var chi0 = String(grezzo || '').trim().replace(/[?!.]+$/, '')
                   .replace(/^(?:a|ad|al|alla|allo|con|mandalo a|lo mando a|mandalo)\s+/i, '').trim();
      if (chi0 && chi0.split(/\s+/).length <= 4 && !miei.dallaVoce(chi0)) {
        inAttesaDi = null;
        mandaIlPercorso(daMand, chi0);
        return true;
      }
      inAttesaDi = null;            // era un comando: vince lui
    }

    if (inAttesaDi && inAttesaDi.cosa === 'come-stai') {
      var tono = null;
      if (/\b(bene|benissimo|tutto bene|ottimamente|alla grande|tutto ok|tutto a posto)\b/.test(t)) tono = 'bene';
      else if (/\b(male|malissimo|non bene|un disastro|sto male)\b/.test(t)) tono = 'male';
      else if (/\b(insomma|cosi cosi|così così|potrebbe andare meglio|non c'e male|non c'è male)\b/.test(t)) tono = 'insomma';
      inAttesaDi = null;
      if (tono) {
        voce.parla(modi.comeSta(tono), { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      /* non era una risposta: era un comando. Si prosegue senza dire niente. */
    }
    /* IL COMANDO VINCE SULLA DOMANDA. Non basta non prenderlo per un
       nome: va lasciato PASSARE. Al banco, dopo la prima correzione,
       «crea percorso» non diventava più un nome ma si sentiva «non ho
       capito il nome» e il percorso non partiva: la domanda si mangiava
       il comando invece di cedergli il posto. E nemmeno si rilegge il
       menu a chi ha già chiesto una cosa precisa — è il «troppo
       frenetico» di Dario. */
    if (inAttesaDi && inAttesaDi.cosa === 'nome' && unComando(t)) {
      inAttesaDi = null;
      diario('NOME: arriva un comando, vince lui');
    }
    if (inAttesaDi && inAttesaDi.cosa === 'nome' && (!r || r.cosa === 'io')) {
      var poi = inAttesaDi.poi;
      if (/^(?:lascia perdere|niente|non importa|preferisco no|non voglio|no)$/.test(t)) {
        inAttesaDi = null;
        nienteNome = true;
        try { localStorage.setItem('yourbea2-niente-nome', 'si'); } catch (e) {}
        ioSonoIo = '';
        voce.parla('Va bene, niente nome. Se cambi idea dimmi: io sono, e il tuo nome.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        apertura(poi);
        return true;
      }
      var secco = (r && r.cosa === 'io') ? r.nome : null;
      if (!secco && !unComando(t)) {
        var m = String(t || '').trim().match(/^([a-zà-ÿ]{2,})(?:\s+([a-zà-ÿ]{2,}))?$/i);
        if (m) secco = maiuscolaNome(m[1]) + (m[2] ? ' ' + maiuscolaNome(m[2]) : '');
      }
      if (secco) {
        inAttesaDi = null;
        ioSonoIo = secco;
        try { localStorage.setItem('yourbea2-io', ioSonoIo); } catch (e) {}
        emergenza.chiSono(ioSonoIo);
        modi.conNome(ioSonoIo);
        voce.parla('Piacere, ' + ioSonoIo + '.', { livello: voce.GUIDA, ancheSeUguale: true });
        apertura(poi);
        return true;
      }
      /* non ho capito: si richiede una volta, e poi si va avanti comunque —
         nessuno resta chiuso fuori dall'app per un nome */
      if (inAttesaDi.giaChiesto) {
        inAttesaDi = null;
        apertura(poi);
        return true;
      }
      inAttesaDi = { da: Date.now(), cosa: 'nome', poi: poi, giaChiesto: true };
      voce.parla('Non ho capito il nome. Dimmelo di nuovo, da solo, oppure dì: lascia perdere.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (inAttesaDi && inAttesaDi.cosa === 'nome') inAttesaDi = null;   // è arrivato un comando: vince lui

    // sto aspettando il numero, o un sì
    if (inAttesaDi && r && r.cosa === 'numero' && inAttesaDi.cosa === 'numero') {
      inAttesaDi = { da: Date.now(), cosa: 'conferma', nome: inAttesaDi.nome, numero: r.numero };
      voce.parla('Ho sentito: ' + dettatura.leggiCifre(r.numero) + '. È giusto? Dì sì, oppure ripeti il numero.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (inAttesaDi && inAttesaDi.cosa === 'conferma' && r && (r.cosa === 'si' || r.cosa === 'no' || r.cosa === 'numero')) {
      if (r.cosa === 'numero') {
        inAttesaDi = { da: Date.now(), cosa: 'conferma', nome: inAttesaDi.nome, numero: r.numero };
        voce.parla('Allora: ' + dettatura.leggiCifre(r.numero) + '. È giusto?', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      if (r.cosa === 'no') {
        inAttesaDi = { da: Date.now(), cosa: 'numero', nome: inAttesaDi.nome };
        voce.parla('Va bene, dimmi di nuovo il numero, una cifra per volta.', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      salvaContatto(inAttesaDi.nome, inAttesaDi.numero);
      inAttesaDi = null;
      return true;
    }
    if (!r) return false;

    if (r.cosa === 'casa') {
      casa = r.indirizzo;
      try { localStorage.setItem('yourbea2-casa', casa); } catch (e) {}
      el('casa-indirizzo').value = casa;
      voce.parla('Casa tua è ' + casa + '. Quando vuoi, dimmi «portami a casa».', { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (r.cosa === 'io') {
      ioSonoIo = r.nome;
      try { localStorage.setItem('yourbea2-io', ioSonoIo); } catch (e) {}
      emergenza.chiSono(ioSonoIo);
      modi.conNome(ioSonoIo);
      voce.parla('Ciao ' + ioSonoIo + '. Nel messaggio d\'aiuto dirò che sei tu.', { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (r.cosa === 'contatto') {
      inAttesaDi = { da: Date.now(), cosa: 'conferma', nome: r.nome, numero: r.numero };
      voce.parla(r.nome + ', numero: ' + dettatura.leggiCifre(r.numero) + '. È giusto? Dì sì, oppure ripeti il numero.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (r.cosa === 'contatto-senza-numero') {
      if (chiediAllaRubrica(r.nome, 'niente')) return true;
      inAttesaDi = { da: Date.now(), cosa: 'numero', nome: r.nome };
      voce.parla(r.nome + '. Adesso dimmi il suo numero, col prefisso, una cifra per volta.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    return false;
  }

  /* ---------- la rubrica del telefono ----------
     «E bisogna digitare. Un non vedente come fa?» (Vince, stasera). Non fa:
     per questo il numero non si chiede più se il telefono ce l'ha già. Si
     dice «avvisa Mariolina», il guscio cerca in rubrica e la chiama. Il
     numero dettato resta come seconda strada: nel browser, o se la rubrica
     non si può guardare. */
  var cercatoInRubrica = null;      // { nome, poi: 'chiamata' | 'messaggio' | 'percorso' | 'niente' }

  function chiediAllaRubrica(nome, poi) {
    if (!window.urbeaRubrica) return false;
    var bello = maiuscolaNome(nome);
    cercatoInRubrica = { nome: bello, poi: poi || 'chiamata' };
    diario('RUBRICA: cerco ' + bello);
    voce.parla('Cerco ' + bello + ' nella tua rubrica.', { livello: voce.GUIDA, ancheSeUguale: true });
    try { window.urbeaRubrica(nome); } catch (e) { return false; }
    return true;
  }

  window.urbeaDallaRubrica = function (nome, numero, guaio) {
    var chiesto = cercatoInRubrica; cercatoInRubrica = null;
    diario('RUBRICA: ' + nome + ' → ' + (guaio || numero));
    /* UN PERCORSO MANDATO A QUALCUNO NON CAMBIA CHI SI AVVISA. Senza
       questo salto, «manda il percorso a Lucia» faceva di Lucia il
       contatto d'emergenza: la prossima volta che uno dice «aiuto»,
       chiamerebbe lei invece di chi aveva scelto. */
    if (chiesto && chiesto.poi === 'percorso') {
      var pm = percorsoDaMandare; percorsoDaMandare = null;
      if (numero && pm) { mandaIlPercorso(pm, nome || chiesto.nome); return; }
      voce.parla(numero
        ? 'Ho perso il percorso per strada. Ridimmi: manda il percorso.'
        : 'In rubrica ' + (chiesto.nome || nome) + ' non lo trovo. Dimmi «manda il percorso» e lo scelgo dal telefono.',
        { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    if (numero) {
      salvaContatto(nome, numero, chiesto && chiesto.poi !== 'niente');
      if (!chiesto || chiesto.poi === 'niente') return;   // registrato e basta
      var s = posizione.leggi();
      var dove = { via: ultimaStrada || '', lat: s.lat, lon: s.lon };
      dilloSubito(chiesto.poi === 'messaggio'
        ? emergenza.avvisaContatto(dove) : emergenza.chiamaContatto(dove));
      return;
    }
    /* niente numero: si dice perché, e si offre la strada che resta —
       dettarlo. Mai lasciare in sospeso chi ha chiesto aiuto. */
    var chi = (chiesto && chiesto.nome) || nome;
    inAttesaDi = { da: Date.now(), cosa: 'numero', nome: maiuscolaNome(chi) };
    voce.parla(guaio === 'niente-permesso'
      ? 'Non posso guardare la tua rubrica: se vuoi, dallo nelle impostazioni. Intanto dimmi il numero di ' + chi + ', una cifra per volta.'
      : 'In rubrica ' + chi + ' non lo trovo. Dimmi il suo numero, una cifra per volta.',
      { livello: voce.GUIDA, ancheSeUguale: true });
  };
  function maiuscolaNome(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }

  /* somigliano(): il nome detto a voce contro quello in rubrica. «Mia
     sorella» deve trovare «Sorella», e «lucia» deve trovare «Lucia». */
  function somigliano(a, b) {
    var x = senzaAccenti(String(a || '').toLowerCase()).replace(/\b(?:mio|mia|il|la|lo)\b/g, ' ').replace(/\s+/g, ' ').trim();
    var y = senzaAccenti(String(b || '').toLowerCase()).replace(/\b(?:mio|mia|il|la|lo)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (!x || !y) return false;
    return x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0;
  }

  function salvaContatto(nome, numero, dallaRubrica) {
    contatto = { nome: nome, telefono: numero };
    try { localStorage.setItem('yourbea2-contatto', JSON.stringify(contatto)); } catch (e) {}
    emergenza.conContatto(contatto);
    scriviTastoAvvisa();
    el('contatto-nome').value = nome; el('contatto-tel').value = numero;
    if (dallaRubrica) return;       // qui la frase la dice chi ha chiamato
    voce.parla('Registrato. ' + nome + ' è chi avviso: basta dire «avvisa ' + nome + '» e la chiamo.',
               { livello: voce.GUIDA, ancheSeUguale: true });
  }

  /* laStradaVienePrima(): quando l'app dice dove si gira, o nomina un
     attraversamento, la musica tace per qualche secondo. Anche in Turismo
     chi ascolta può essere una persona che non vede. */
  function laStradaVienePrima(d) {
    if (!d) return;
    if (d.livello === 'emergenza' || d.tipo === 'svolta' || d.tipo === 'parto' ||
        d.tipo === 'manca' || d.tipo === 'arrivato' || /attraversament/i.test(d.testo || '')) {
      musica.taciPerLaStrada();
    }
  }

  /* ---------- IL NUMERO INVECCHIA MENTRE LO DICI ----------
     «Correggi la precisione nelle distanze a piedi» (Vince, 21/10).
     A piedi si fa un passo e mezzo al secondo, e fra il momento in cui
     decidiamo «a 40 passi» e quello in cui lui lo SENTE passano secondi:
     la frase aspetta in coda dietro a un'altra, e la voce ci mette il
     suo. Quando senti «40» sei a 33 — e l'errore va sempre nella stessa
     direzione, quindi non si compensa: si accumula.
     Qui si attacca alla frase il modo di rifarsi: parti/voce.js la
     ricalcola nel momento esatto in cui apre bocca. In macchina non
     serve (il cenno lì non si dice nemmeno), a piedi sì. */
  function rifaiLaDistanza(d, testo) {
    if (!d || !d.luogo || !(d.luogo.lat > 0) || !testo) return null;
    if (!/\d+ passi|pochi passi/.test(testo)) return null;
    return function () {
      var s = posizione.leggi();
      if (!s.pronto) return null;                  // non si sa: resta quella di prima
      var m = posizione.dist(s.lat, s.lon, d.luogo.lat, d.luogo.lon);
      return testo.replace(/\d+ passi|pochi passi/, laDistanza.nudi(m));
    };
  }

  function dilloSubito(d) {
    if (!d) return;
    if (!hoLaParola) return;
    segnaDetto(d.tipo, d.testo);
    laStradaVienePrima(d);
    var liv = d.livello === 'emergenza' ? voce.EMERGENZA : (d.livello === 'guida' ? voce.GUIDA : voce.CENNO);
    voce.parla(d.testo, { livello: liv, ancheSeUguale: true, avviso: !!d.avviso,
                          rifai: rifaiLaDistanza(d, d.testo) });
    mostra({ titolo: titoloDi(d), testo: d.testo, gradino: '' });
    alLettore(d.testo, true);        // la voce la sta gia dicendo
    esegui(d.mosse);
  }
  function titoloDi(d) {
    if (d.tipo === 'furto' || d.tipo === 'scelte' || d.tipo === 'chiama') return 'Aiuto';
    if (d.tipo === 'parto' || d.tipo === 'svolta' || d.tipo === 'manca') return guida.meta() ? ('→ ' + guida.meta().n) : 'In cammino';
    if (d.tipo === 'arrivato') return 'Arrivato';
    /* una frase che non parla di un monumento non si tiene il titolo del
       monumento di prima: sullo schermo si leggeva «Basilica della
       Steccata» sopra un testo che parlava di panchine. */
    if (d.tipo === 'scena' || d.tipo === 'intorno' || d.tipo === 'lati') return 'Qui intorno';
    if (String(d.tipo).indexOf('lettura') === 0) return 'Quello che c\'è scritto';
    if (d.tipo === 'strada' || d.tipo === 'dove') return 'Dove sei';
    if (d.tipo === 'chiama-contatto' || d.tipo === 'avvisa' || d.tipo === 'chi-e') return 'Aiuto';
    if (d.tipo === 'lascio' || d.tipo === 'avanti' || d.tipo === 'niente') return 'Yourbea';
    if (d.tipo === 'percorso-qui') return 'Un percorso, qui';
    return el('cosa').textContent;
  }

  /* aCasa(): il tasto e la voce finiscono tutti e due qui.
     Se non sa dove abiti non si inventa niente e non lascia in silenzio:
     lo dice, e apre il posto dove scriverlo. */
  /* segnaCasaQui(): «e quando sono arrivato a casa mi diceva torna
     indietro di 400 metri» (Vince, 20/10). Quattrocento metri non sono un
     errore del GPS: sono l'errore di chi cerca l'indirizzo. Photon, di una
     via col numero civico, spesso restituisce il CENTRO DELLA VIA — e in
     una via lunga il centro sta a quattrocento metri dal tuo portone.
     Per chi non vede non c'e' modo di accorgersene e correggere: arriva, e
     l'app gli dice di tornare indietro.
     La soluzione non e' un geocodificatore migliore: e' stare sulla porta
     di casa e dire «casa è qui». Un punto preso dove sei vale piu' di
     qualunque indirizzo, e da quel momento l'arrivo e' esatto. */
  function segnaCasaQui() {
    var s2 = posizione.leggi();
    if (!s2.pronto) {
      voce.parla('Prima devo sapere dove sei. Aspetta che trovo la posizione, poi dimmelo di nuovo.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    casaPunto = { lat: s2.lat, lon: s2.lon };
    try { localStorage.setItem('yourbea2-casa-punto', JSON.stringify(casaPunto)); } catch (e) {}
    diario('CASA segnata qui: ' + s2.lat.toFixed(5) + ',' + s2.lon.toFixed(5) + ' ±' + Math.round(s2.prec || 0) + 'm');
    var preciso = (s2.prec || 999) <= 25;
    voce.parla(preciso
      ? 'Fatto: casa tua è questo punto. Da adesso «portami a casa» ti porta esattamente qui.'
      : 'Ho segnato casa qui, ma il telefono non è sicuro della posizione: se puoi, dimmelo di nuovo quando sei fuori dal portone.',
      { livello: voce.GUIDA, ancheSeUguale: true });
  }

  function aCasa() {
    /* IL PUNTO BATTE L'INDIRIZZO, sempre: l'ha segnato lui stando li', e
       non c'e' geocodificatore che possa fare meglio. */
    if (casaPunto) {
      var s0 = posizione.leggi();
      if (!s0.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
      var qui0 = { lat: s0.lat, lon: s0.lon, direzione: s0.direzione, direzioneBuona: s0.direzioneBuona };
      var meta0 = { n: 'casa tua', lat: casaPunto.lat, lon: casaPunto.lon };
      diario('A CASA: il punto segnato nella vecchia');
      Promise.all([intorno.strada(qui0.lat, qui0.lon), intorno.percorso(qui0, meta0)]).then(function (r) {
        PERCORSO = r[1];
        dilloSubito(guida.vaiA(meta0, qui0, r[0], r[1]));
      });
      return;
    }
    if (!casa) {
      voce.parla('Non so ancora dove abiti. Aprimi il cassetto, «dove abito», e scrivi la via: poi ti ci porto quando vuoi.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      apriCassetto(true);
      var r = el('riga-casa'); r.hidden = false; el('casa-indirizzo').focus();
      return;
    }
    diario('A CASA: ' + casa);
    portamiA(casa, true);
  }

  /* ilPercorsoFra(): «fai il percorso casa medico».
     NON E' «portami a»: qui non si parte da dove sei. Uno lo chiede la
     sera prima, seduto, per sapere quanto è lunga e quante svolte ha; e
     per poterla mandare a un altro. Valhalla sa fare la strada fra due
     punti qualunque, quindi non serve essere lì.
     Il risultato diventa un percorso suo, con un nome: così si può
     seguire quando ci sarà, e mandare su WhatsApp con quello che c'è
     già. */
  function ilPercorsoFra(da, a) {
    voce.parla('Calcolo la strada da ' + da.n + ' a ' + a.n + ', un momento.',
               { livello: voce.GUIDA, ancheSeUguale: true });
    intorno.percorso({ lat: da.lat, lon: da.lon }, { lat: a.lat, lon: a.lon }).then(function (p) {
      if (!p || !p.svolte || !p.svolte.length) {
        voce.parla('Questa strada non sono riuscito a calcolarla. Riprova fra poco.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return;
      }
      var nome = da.n + ' – ' + a.n;
      var suo = { nome: nome, punti: p.linea || [], metri: p.metri, quando: Date.now(),
                  segni: p.svolte.map(function (sv) {
                    return { lat: sv.lat, lon: sv.lon, da: 0, n: sv.testo };
                  }) };
      if (miei.aggiungi(suo)) salvaIMiei();
      diario('PERCORSO FRA: ' + nome + ', ' + p.metri + ' m, ' + p.svolte.length + ' svolte');
      /* i passi, non i metri: è la regola 6 della guida, e questi sono i
         passi suoi se ha misurato il passo. */
      voce.parla('Da ' + da.n + ' a ' + a.n + ': ' + laDistanza.passi(p.metri) + ', ' +
                 p.svolte.length + (p.svolte.length === 1 ? ' svolta' : ' svolte') +
                 '. L\'ho tenuta col nome «' + nome + '»: dimmi «segui ' + nome +
                 '» quando sei alla partenza, oppure «manda il percorso» per darla a qualcuno.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      percorsoDaMandare = suo;
    });
  }

  /* portamiA(): trova la meta e chiede il percorso. Prima fra i luoghi
     nostri, poi fra i servizi, poi fra gli indirizzi — e la citta' detta
     dall'utente vince sempre (il difetto che portava a Cisterna di Latina). */
  var metaInDubbio = null;
  function portamiA(cosa, eCasa) {
    metaInDubbio = null;
    var s = posizione.leggi();
    if (!s.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    /* alla guida serve anche come sei girato: senza, non può dire
       «continua così» e finirebbe a dire il nord, che a chi cammina non
       dice niente. */
    var qui = { lat: s.lat, lon: s.lon, direzione: s.direzione, direzioneBuona: s.direzioneBuona };
    var parole = guida.cittaNelTesto(cosa);
    /* «n. 47», «numero 47», «civico 47» mandano in confusione il cercatore
       di indirizzi: il 16/10 «via dei Corazzieri n. 47» ha tirato fuori un
       ristorante a undici chilometri. Il numero si tiene, la parola no. */
    var pulita = String(cosa).replace(/\b(?:n\.?|numero|civico)\s*(\d+)/gi, '$1')
                             .replace(/\s+/g, ' ').trim();
    var cerca = pulita.toLowerCase();
    diario('PORTAMI A: ' + cerca);
    voce.parla("Cerco l'indirizzo, un momento.", { livello: voce.GUIDA, ancheSeUguale: true });

    /* 0. UN POSTO SUO. Viene prima di tutto: l'ha segnato lui stando
       davanti alla porta, e non c'è geocodificatore che possa fare
       meglio — è la lezione dei 400 metri del 20/10. */
    var suo0 = posti.trova(cerca);
    if (suo0) {
      diario('PORTAMI A: è un posto suo, ' + suo0.n);
      partiVerso({ n: suo0.n, lat: suo0.lat, lon: suo0.lon }, qui);
      return;
    }

    // 1. un luogo nostro col nome che somiglia
    var mio = null, dmin = Infinity;
    LUOGHI.forEach(function (p) {
      if (p.n.toLowerCase().indexOf(cerca) < 0) return;
      var d = posizione.dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d < dmin) { dmin = d; mio = p; }
    });
    if (mio) { partiVerso({ n: mio.n, lat: mio.lat, lon: mio.lon }, qui); return; }

    // 2. un servizio (farmacia, commissariato, fermata...)
    /* LA METRO E LE STAZIONI mancavano, e sono la cosa che si chiede di
       piu' in citta'. Vince, 21/10: «ho detto sia portami alla stazione
       Laurentina sia portami alla stazione metro piu' vicina», e l'app non
       ha fatto niente. */
    var tipo = ['farmacia', 'commissariato', 'pronto soccorso', 'metropolitana', 'metro',
                'stazione', 'fermata', 'supermercato', 'bagno', 'bancomat',
                'ufficio postale', 'bar', 'ristorante']
      .find(function (x) { return cerca.indexOf(x) >= 0; });
    /* «metro» e «metropolitana» sono la stessa cosa per il cercatore */
    if (tipo === 'metro') tipo = 'metropolitana';
    var cercatore = tipo ? intorno.cercaServizio(tipo, qui) : intorno.cercaIndirizzo(pulita, qui);
    cercatore.then(function (candidati) {
      var scelto = guida.scegli(candidati, parole, qui, tipo ? '' : pulita);
      if (!scelto) {
        /* E QUANDO NON LO TROVA, SI DICE LA VIA D'USCITA.
           Provato il 20/10 con l'indirizzo vero di Vince: Photon, a «Via
           dei Corazzieri 47 Latina», risponde «Via dei Marrucini 47» —
           un'altra strada a due chilometri. Adesso quella risposta la
           buttiamo, ed e' giusto; ma «non l'ho trovato» da solo lascia a
           piedi chi non vede. La via d'uscita c'e' e non la sa nessuno:
           mettersi sulla porta e dire «casa è qui». */
        voce.parla(eCasa
          ? 'Questo indirizzo non lo trovo sulla mappa. Facciamo così: quando sei a casa, fermati sulla porta e dimmi «casa è qui». Me lo segno esatto, e da quel momento ti ci porto sempre.'
          : "Questo indirizzo non l'ho trovato. Se puoi, ripetimelo con la città.",
          { livello: voce.GUIDA, ancheSeUguale: true });
        return;
      }
      /* SI DICE CHE E' APPROSSIMATO, invece di far finta di niente.
         «Via dei Corazzieri 47, Roma»: il civico 47 in OpenStreetMap non
         c'e' — verificato con Photon e con Nominatim — e la via arriva a
         tre pezzi distanti mezzo chilometro. Adesso puntiamo al mezzo, ma
         l'errore resta: tacerlo vuol dire far camminare uno che non vede
         fino a un punto sbagliato e poi dirgli di tornare indietro. Lo si
         dice prima, e si dice come risolverlo per sempre. */
      if (scelto.aPezzi && scelto.incerto > 120) {
        var comeRisolvere = eCasa
          ? ' Quando ci sei, fermati sulla porta e dimmi «casa è qui»: me lo segno esatto e non succede più.'
          : '';
        voce.parla('Attento: di questa via la mappa non ha i numeri civici, quindi ti porto a metà strada. Posso sbagliare di ' +
                   (Math.round(scelto.incerto / 10) * 10) + ' metri.' + comeRisolvere,
                   { livello: voce.GUIDA, ancheSeUguale: true });
      }
      /* il nome che arriva dal cercatore spesso contiene gia' la citta'
         («Via Vincenzo Gioberti, Latina»): aggiungerla di nuovo faceva dire
         «Latina, Latina» */
      var nome = scelto.nome;
      if (scelto.citta && parole.length && nome.toLowerCase().indexOf(scelto.citta.toLowerCase()) < 0) {
        nome += ', ' + scelto.citta;
      }
      /* IL PARACADUTE. Se l'unico posto trovato è lontanissimo e nessuno ha
         nominato un'altra città, quasi sempre è l'indirizzo sbagliato: si
         chiede, non ci si incammina per undici chilometri a piedi. */
      var quanto = posizione.dist(qui.lat, qui.lon, scelto.lat, scelto.lon);
      /* per CASA TUA non si chiede: l'indirizzo l'hai dato tu, e che sia
         lontano è normale — il 16/10, da Trastevere, l'app ha chiesto
         conferma per via dei Corazzieri a 5,6 chilometri, che era
         esattamente casa sua. */
      if (quanto > 3000 && !parole.length && !eCasa) {
        diario('LONTANO: ' + nome + ' a ' + Math.round(quanto) + ' m, chiedo');
        metaInDubbio = { n: nome, lat: scelto.lat, lon: scelto.lon };
        voce.parla('Il più vicino che trovo è ' + nome + ', a ' + (Math.round(quanto / 100) / 10) +
                   ' chilometri. Se è quello, dimmi: sì. Se no, ripeti l\'indirizzo con la città.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return;
      }
      partiVerso({ n: nome, lat: scelto.lat, lon: scelto.lon }, qui);
    });
  }
  function partiVerso(m, qui) {
    Promise.all([intorno.strada(qui.lat, qui.lon), intorno.percorso(qui, m)]).then(function (r) {
      PERCORSO = r[1];                       // la mappa ci disegna la strada
      dilloSubito(guida.vaiA(m, qui, r[0], r[1]));
    });
  }

  function clipDi(d) {
    // i nomi dei file incisi con Alice; se una manca o è lenta, il motore
    // passa alla voce di sistema da sé — senza silenzio
    try { return clip.per(d); } catch (e) { return null; }
  }

  /* staAspettando(): l'app ha fatto una domanda e aspetta.
     Dario, provandola a Napoli: «mi chiede il nome, ma non mi dà il tempo di
     darlo: comincia subito a parlare di quello che c'è intorno a me».
     Il difetto l'ho fatto io stamattina mettendo la domanda del nome: la
     domanda parte, e insieme partono la posizione e tutto quello che ne
     segue — i passaggi, la scena, i cenni — che si mettono in fila dietro e
     arrivano addosso a chi sta rispondendo.
     La regola che mancava: QUANDO L'APP CHIEDE UNA COSA, ASPETTA. Niente di
     ambientale si dice finché non ha una risposta — tranne l'emergenza, che
     passa sempre. E l'attesa ha una vita: se nessuno risponde entro mezzo
     minuto l'app non resta muta per sempre, riprende a raccontare. */
  /* CHIUDERE A VOCE, e solo quando lo si intende davvero. La frase deve
     ESSERE il comando: «chiudi», «chiudi l'app», «esci», «buonanotte».
     «Chiudi il microfono» e «chiudi la finestra» non chiudono niente. */
  /* ============================================================
     COME SI CHIUDE, DETTO COME LO DICE UNA PERSONA
     «Quando sono arrivato a casa ho detto: Yourbea basta, siamo arrivati
     a casa — e non sono riuscito a chiuderla. Mi ha detto: non ho
     capito» (Vince, 25/10).
     La regola era che la frase dovesse ESSERE il comando, parola per
     parola, e nasceva da un motivo giusto: «chiudi il microfono» e
     «chiudi la finestra» non devono spegnere l'app. Ma nessuno parla
     cosi' arrivando a casa.
     Adesso: la frase puo' avere il nome dell'app e una coda («siamo
     arrivati a casa»), e valgono anche i modi veri di dire che hai
     finito. Quello che NON chiude resta fuori: il microfono, la
     finestra, la musica, la voce.
     ============================================================ */
  var NON_CHIUDE = /\b(microfono|finestra|musica|radio|voce|tappeto|schermo|mappa|cassetto|porta|sportello|occhi)\b/;
  /* IL NOME COME LO SENTE IL TELEFONO. Il 26/10 Vince ha provato due
     volte a chiudere e il riconoscitore ha scritto «Ok Urbe fermati» e
     «Curve affermati»: il nome non arriva quasi mai intero, e davanti
     c'e' un «ok» che la regola non prevedeva. Due tentativi, zero
     chiusure — e la terza volta che succede. */
  var SI_RIVOLGE_A_ME = '(?:(?:ok|okay|ehi|hey|ei|senti|scusa|ciao)[, ]+)?' +
                        '(?:(?:yourbea|yourbe|your bea|urbea|urbe|curve|curbe|jurbea|iurbea)[, ]+)?';
  var CHIUDI_TUTTO = new RegExp(
    '^(?:' +
    /* il nome, davanti o dietro: «yourbea basta», «basta yourbea» */
    SI_RIVOLGE_A_ME +
    '(?:' +
      /* «affermati» e' «fermati» con la a attaccata dal riconoscitore */
      '(?:chiudi|chiudete|chiudiamo|chiuditi|spegni|spegniti|spegnila|(?:af)?fermati|ferma tutto|smetti|basta|finito|ho finito|abbiamo finito)' +
      '(?:\\s+(?:l[ae]?\\s*|il\\s+|la\\s+)?(?:app|applicazione|yourbea|tutto|adesso|cosi|qui))?' +
    '|esci|arrivederci|buonanotte|buona notte|ciao yourbea|addio|ti saluto|a domani|a dopo' +
    '|(?:siamo|sono)\\s+(?:arrivat[oi]|a casa|tornat[oi])' +
    ')' +
    /* e una coda qualunque, purche' non nomini una cosa che non si chiude:
       «basta, siamo arrivati a casa», «chiudi che sono arrivato» */
    '(?:[,.!]?\\s+.{0,40})?' +
    '[,.!]?)$');
  var ATTESA_VIVE = 30000;

  /* ============================================================
     CHE COSA VUOI SENTIRE
     Dario, provandola a Napoli: «Turismo mi dà comunque troppe informazioni:
     mi dà i ristoranti, mi dà i monumenti, mi dà le vie, mi dice se c'è il
     semaforo. È troppo. Deve esserci un comando per selezionare io cosa
     voglio: deve essere facilmente accessibile, che io dico solo monumenti».
     Ha ragione, e non e' in contrasto con l'altra richiesta — «un non
     vedente non deve sentirsi solo»: sono due persone diverse con due
     bisogni diversi, e la differenza la decide chi ascolta, non noi.
     Si dice a voce («solo monumenti», «dimmi tutto») o col tasto nel
     cassetto. Quello che serve a camminare — svolte, arrivi, emergenza —
     non si spegne mai: quello non e' informazione in piu', e' la strada. */
  var soloMonumenti = false;
  try { soloMonumenti = localStorage.getItem('yourbea2-solo-monumenti') === 'si'; } catch (e) {}

  var SEMPRE = { svolta: 1, preavviso: 1, prossima: 1, arrivato: 1, fuori: 1, parto: 1,
                 manca: 1, tappa: 1, finita: 1, lascio: 1, elenco: 1, avvisa: 1,
                 chiama: 1, 'chiama-contatto': 1, furto: 1, scelte: 1, 'chi-e': 1,
                 'niente-contatto': 1, 'non-capito': 1, niente: 1, dove: 1, strada: 1 };

  function daDire(d) {
    if (!soloMonumenti) return true;
    /* GLI AVVISI NON SI SPENGONO MAI. «Importanti sono gli avvisi» (Vince,
       19/10). Chi dice «solo monumenti» chiede meno chiacchiere, non meno
       sicurezza: scalini, paletti e attraversamenti passano comunque. */
    if (d.avviso) return true;
    if (d.livello === 'emergenza' || SEMPRE[d.tipo]) return true;
    /* un monumento e' un luogo (k da 1 in su), non un servizio: la regola e'
       la stessa di parti/racconto.js, e non cambia qui */
    if (d.luogo && (d.luogo.k === undefined || d.luogo.k >= 1)) return true;
    if (d.tipo === 'scheda' || d.tipo === 'cosa-vedere' || d.tipo === 'approfondimento') return true;
    return false;
  }

  /* IL RESPIRO: «è troppo frenetico» (Dario). Quello che si dice per
     raccontare il posto — passaggi, scena, lati, cenni — aspetta qualche
     secondo dall'ultima volta. Non vale per la strada e per l'emergenza. */
  var RESPIRO = 8000;
  var ultimoAmbiente = 0;
  var AMBIENTE = { passaggio: 1, scena: 1, lati: 1, cenno: 1, superato: 1, incrocio: 1 };
  function staAspettando() {
    return !!(inAttesaDi && inAttesaDi.da && Date.now() - inAttesaDi.da < ATTESA_VIVE);
  }

  function dillo(d) {
    if (!d) return;
    if (!hoLaParola) return;
    /* ============================================================
       MENTRE LA RADIO PARLA: POCO, MA NON NIENTE
       «Se la radio parla l'app sta in silenzio… oppure può dire
       un'informazione utile, ma poco, per far capire che è ancora lì»
       (Vince, 21/10). La seconda frase è la più importante, e nasce da
       quello che gli è successo: l'app è ammutolita e lui ha pensato che
       fosse uscita — infatti era sospesa davvero.
       Il silenzio totale, a chi non vede, non dice «sto rispettando la
       tua radio»: dice «non ci sono più». Quindi:
       - GLI AVVISI passano sempre. Un attraversamento o uno scalino non
         sono informazione, sono dove metti i piedi: la radio non li
         rimanda.
       - UNA COSA OGNI TRE MINUTI passa lo stesso — la strada in cui sei
         entrato, la fermata che arriva — e basta quella per sapere che
         c'è ancora.
       - IL RESTO tace, e tornerà quando la radio finisce. */
    if (altraRadio && d.livello !== 'emergenza' && !d.chiesto) {
      var SEGNO_DI_VITA = 180000;
      var vale = d.avviso || d.tipo === 'strada' || d.tipo === 'fermata' ||
                 d.tipo === 'svolta' || d.tipo === 'preavviso' || d.tipo === 'arrivato';
      if (!vale) { diario('RADIO: taccio ' + d.tipo); return; }
      if (!d.avviso && Date.now() - ultimoSegnoDiVita < SEGNO_DI_VITA) {
        diario('RADIO: taccio ' + d.tipo + ' (già detto qualcosa da poco)');
        return;
      }
      if (!d.avviso) ultimoSegnoDiVita = Date.now();
    }
    if (staAspettando() && d.livello !== 'emergenza') {
      diario('ZITTO: sto aspettando una risposta (' + inAttesaDi.cosa + ')');
      return;
    }
    /* LA REGOLA: a chi serve questa cosa, e regge il movimento?
       Una cosa CHIESTA non si filtra mai: il confine serve a non riempire
       di roba chi non l'ha chiesta, non a negargliela se la chiede. */
    var qui0 = posizione.leggi();
    /* LA PRECISIONE, e perché è una regola e non una cautela.
       «Se dico così a un non vedente, lui non continua dritto: va a
       destra» (Vince, 21/10, alla Laurentina, col telefono che dava ±653
       metri mentre l'app diceva «a destra, a 130 metri, la stazione»).
       A chi vede una parte sbagliata è un'imprecisione da correggere con
       un'occhiata. A chi non vede è un ORDINE, e lo esegue. */
    var preciso = !(qui0.prec > 50);
    if (!aChiServe.serve(d.avviso ? 'avviso' : d.tipo, modo,
                         { aPiedi: qui0.aPiedi !== false, preciso: preciso, chiesto: !!d.chiesto })) {
      diario('REGOLA: ' + d.tipo + ' non va in ' + modo +
             (qui0.aPiedi === false ? ' (non a piedi)' : '') +
             (!preciso ? ' (±' + Math.round(qui0.prec) + ' m)' : ''));
      return;
    }
    if (!daDire(d)) { diario('solo monumenti: salto ' + d.tipo); return; }
    /* IL RESPIRO SI MISURA SUL PARLATO, non sulle decisioni.
       Provando il Turismo a piazza Navona (20/10): il respiro scattava
       regolarmente — il quaderno è pieno di «RESPIRO: cenno aspetta» — e
       nonostante questo uscivano «Fontana dei Quattro Fiumi», «Palazzo
       Giustiniani» e «Basilica di Sant'Agostino» in sette secondi. Perché
       il respiro distanziava il momento in cui una frase veniva ACCETTATA,
       e quelle accettate si mettevano in coda dietro a una frase lunga,
       per poi uscire tutte attaccate quando quella finiva.
       Chi ascolta non sente le decisioni, sente le voci. Quindi: una cosa
       ambientale non si mette MAI in coda dietro a qualcos'altro. O c'è
       posto adesso, o si lascia perdere — tanto camminando se ne
       presenta un'altra fra poco. */
    if (AMBIENTE[d.tipo] && !d.avviso && d.livello !== 'emergenza') {
      if (Date.now() - ultimoAmbiente < RESPIRO) {
        diario('RESPIRO: ' + d.tipo + ' aspetta');
        return;
      }
      if (voce.staParlando()) {
        diario('RESPIRO: sta già parlando, lascio perdere ' + d.tipo);
        return;
      }
    }
    if (AMBIENTE[d.tipo]) ultimoAmbiente = Date.now();
    ultimaParola = Date.now();
    laStradaVienePrima(d);
    var liv = d.livello === 'guida' ? voce.GUIDA : (d.livello === 'emergenza' ? voce.EMERGENZA : voce.CENNO);
    /* LE PAROLE INTORNO. Solo cenni, scene e passaggi: modi.veste() lascia
       perdere da sé tutto il resto. I fatti e il loro ordine non cambiano,
       quindi le clip incise restano allineate — e la clip, se c'è, la dice
       per intero lei: l'attacco va solo sul testo della voce di sistema. */
    segnaDetto(d.tipo, d.testo);
    var detto = modi.veste(d.tipo, d.testo);
    var preso = voce.parla(detto, { clip: clipDi(d), livello: liv, uguale: d.testo,
                                    rifai: rifaiLaDistanza(d, detto) });
    if (!preso) { diario('non detta: ' + String(detto).slice(0, 40)); return; }
    /* DOPO IL RACCONTO, DOVE SEI. «Quando ha finito il racconto ti dice:
       ora ti trovi qui» (Vince, 16/10). Dopo mezzo minuto di storia uno ha
       perso il filo di dove si trova — e chi non vede non può recuperarlo
       con un'occhiata. Si dice solo dopo le schede lunghe, non dopo i
       cenni, e solo se nel frattempo non è arrivato niente di più
       importante: se l'app sta già dicendo una svolta, questa si butta. */
    /* UNA SVOLTA SI SENTE ANCHE CON LA MANO. La voce dice «fra venti
       passi gira a destra»; se un camion la copre, la vibrazione no. */
    if (d.tipo === 'svolta' || d.tipo === 'arrivato' || d.tipo === 'percorso-arrivato') {
      vibra(d.tipo === 'svolta' ? 'forte' : 'arrivato');
    }
    if (d.tipo === 'scheda' || d.tipo === 'cosa-vedere' || d.tipo === 'approfondimento') {
      var viaOra = ultimaVia;        // il nome, non il numero
      if (viaOra) {
        voce.parla('Adesso sei in ' + viaOra + '.', {
          livello: voce.CENNO, ancheSeUguale: true,
          valida: function () { return !guida.meta(); }
        });
      }
    }
    if (d.luogo) {
      mostra({ dove: d.tipo === 'cenno' ? d.testo.split(',').slice(0, 2).join(',') : '',
               titolo: d.luogo.n, testo: d.tipo === 'cenno' ? (d.luogo.t || '') : d.testo,
               gradino: gradinoScritto(d) });
    } else {
      mostra({ titolo: titoloDi(d), testo: d.testo, dove: '', gradino: '' });
    }
    alLettore(d.testo, true);        // la voce la sta gia dicendo
  }
  function gradinoScritto(d) {
    if (d.tipo === 'aCosaServe') return 'Dimmi «ancora» se vuoi che te lo racconti.';
    if (d.tipo === 'percorso-qui') return 'Dimmi «sì» per seguirlo, «continuo» per tirare dritto.';
    if (d.tipo === 'cenno') return modo === 'servizi'
      ? 'Dimmi «ancora» se vuoi sapere cos\u2019\u00e8.'
      : 'Fermati dieci secondi e te lo racconto. Oppure dimmi «ancora».';
    /* NON SI PROMETTE QUELLO CHE NON C'E'. La riga scritta diceva sempre
       «Dimmi "ancora" per sapere cosa guardare», e poi «ancora» rispondeva
       «Di questo ti ho detto tutto»: nei dati veri il campo «cosa vedere»
       non ce l'ha NESSUNO dei 20.836 luoghi d'Italia, e l'approfondimento
       nemmeno. Una promessa che l'app non puo' mantenere, scritta
       ventimila volte. Adesso la riga guarda cosa c'e' davvero. */
    if (d.tipo === 'scheda' || d.tipo === 'cosa-vedere') {
      var l = d.luogo || {};
      if (d.tipo === 'scheda' && l.i) return 'Dimmi «ancora» per sapere cosa guardare.';
      if (l.a) return 'Dimmi «ancora» per l\'approfondimento.';
      return 'Di questo ti ho detto tutto.';
    }
    if (d.tipo === 'approfondimento') return 'Di questo ti ho detto tutto.';
    /* la passeggiata: a che punto siamo, e i tre comandi, scritti perché chi
       accompagna li possa leggere invece di indovinarli */
    var punto = d.quale !== undefined && d.quante ? ('Tappa ' + (d.quale + 1) + ' di ' + d.quante + '. ') : '';
    if (d.tipo === 'parto' || d.tipo === 'prossima') return punto + 'Dimmi «ancora», «avanti», oppure «ferma».';
    if (d.tipo === 'tappa') return punto + 'Dimmi «ancora» per saperne di più, «avanti» per la prossima.';
    if (d.tipo === 'finita') return 'Passeggiata finita.';
    return '';
  }

  /* IL RIQUADRO RESPIRA MENTRE PARLA. Chi accompagna capisce a colpo
     d'occhio se l'app sta dicendo qualcosa o se e' muta: prima, da fuori,
     erano identiche. Per chi non vede non cambia niente. */
  setInterval(function () {
    var ora = voce.staParlando() ? 'si' : 'no';
    if (document.body.dataset.parla !== ora) document.body.dataset.parla = ora;
  }, 300);

  /* ---------- il giro: a ogni posizione nuova ---------- */
  var ultimaStrada = '', ultimaVia = '', ultimaStradaQuando = 0, ultimaStradaDove = null;
  /* la via che dice l'aggancio, e quante letture di fila la confermano */
  var agganciataInProva = '', agganciataConferme = 0;
  var stradeDette = {};        // quale via, e quando l'ho annunciata
  var viaInProva = '';         // vista una volta: aspetto che si confermi

  /* uguali(): «Via Álvaro del Portillo» e «Via Alvaro del Portillo» sono la
     STESSA VIA. Dal quaderno del 20/10: dette tutte e due, a ottanta
     secondi di distanza, perché il confronto guardava le lettere com'erano
     scritte e l'accento le rendeva diverse. Il cercatore scrive lo stesso
     nome in due modi a seconda del pezzo di strada. */
  function senzaAccenti(t) {
    return String(t || '').toLowerCase()
      .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function uguali(a, b) { return senzaAccenti(a) === senzaAccenti(b); }
  var ultimoAnnuncioStrada = 0;   // quando ho annunciato una strada, qualunque
  var ultimoAvvisoPrecisione = 0;
  posizione.quando(function (cosa, s) {
    if (cosa === 'posizione') segnaPunto(s);
    if (cosa === 'problema') {
      var dice = s.comeVa === 'negata'
        ? 'Non ho il permesso di sapere dove sei: dallo nelle impostazioni del telefono, se no non posso accompagnarti.'
        : 'Questo telefono non mi dà la posizione.';
      stato('posizione <b>' + s.comeVa + '</b>', true);
      mostra({ titolo: 'Non so dove sei', testo: dice, attesa: true, dove: '—', gradino: '' });
      /* se intanto la posizione arriva — dal guscio, o perché l'utente ha
         appena dato il permesso — questa frase non si dice più. */
      /* e nemmeno questa si dice sopra una domanda: «valida» la tiene buona
         finche' l'app sta aspettando una risposta, e la butta se intanto la
         posizione e' arrivata. Cosi' chi sta rispondendo al nome non si
         sente interrompere. */
      voce.parla(dice, { livello: voce.GUIDA,
                         valida: function () { return !staAspettando() && !posizione.leggi().pronto; } });
      return;
    }
    if (!s.pronto) { stato('cerco la posizione…'); return; }

    /* IL SALTO — la metro, il treno, l'autobus sotto un cavalcavia.
       «Ho preso la metro e non si è accorto» (Vince, 20/10): sottoterra il
       GPS sparisce, e quando torna uno e' tre chilometri piu' in la'.
       L'app proseguiva con la strada di prima. Adesso se ne accorge, lo
       dice, e se stava accompagnando qualcuno rifa il percorso da dove si
       trova davvero — che e' l'unica cosa utile da fare. */
    if (s.saltato) {
      var quantoLa = ultimaStradaDove
        ? posizione.dist(ultimaStradaDove.lat, ultimaStradaDove.lon, s.lat, s.lon) : 0;
      diario('SALTO: ripartenza da capo');
      ultimaVia = ''; ultimaStrada = ''; stradeDette = {};
      scena.dimenticaTutto(); passaggi.stradaNuova(); paesaggio.dimentica();
      if (guida.meta()) {
        var m5 = guida.meta();
        var qui5 = { lat: s.lat, lon: s.lon, direzione: s.direzione, direzioneBuona: s.direzioneBuona };
        voce.parla('Ti sei spostato di ' + (Math.round(quantoLa / 100) / 10) +
                   ' chilometri. Rifaccio la strada da qui.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        intorno.percorso(qui5, m5).then(function (nuovo) {
          PERCORSO = nuovo;
          dilloSubito(guida.vaiA(m5, qui5, { via: '' }, nuovo));
        });
      } else {
        voce.parla('Ti sei spostato. Guardo dove siamo adesso.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      }
    }

    /* LA POSIZIONE IMPRECISA, detta invece che nascosta.
       «La posizione non era precisa» (Vince, 20/10), e nel quaderno del
       17/10, a Termini: precisione ±1414 metri, e l'app diceva lo stesso
       «a 230 metri, la basilica». Per chi vede e' una stranezza; per chi
       non vede e' un'istruzione sbagliata data con sicurezza, e si fida.
       Sopra i cinquanta metri d'errore tutto quello che si misura in passi
       diventa finzione: si tace, e si dice perche'. */
    var preciso = !(s.prec > 50);
    if (!preciso && Date.now() - ultimoAvvisoPrecisione > 120000) {
      ultimoAvvisoPrecisione = Date.now();
      diario('PRECISIONE: ±' + Math.round(s.prec) + ' m, taccio le distanze');
      voce.parla('Il telefono non è sicuro di dove siamo: posso sbagliare di ' +
                 (Math.round(s.prec / 10) * 10) + ' metri. Ti dico solo le cose grandi finché non migliora.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
    }
    stato('posizione attiva · <b>' + Math.round(s.prec || 0) + ' m</b>' + (s.fermo ? ' · fermo' : ''));
    if (!acceso) return;

    var lista = vicini();
    disegnaMappa(s, lista);
    /* l'incrocio si guarda a ogni passo: venticinque metri si attraversano
       in dieci secondi, e dirlo dopo non serve a niente */
    /* MENTRE TI PORTA DA QUALCHE PARTE, SOLO LA STRADA. «Poi però ho detto
       di portarmi a casa e mi diceva le strade e gli incroci» (Vince,
       16/10, provandola in scooter). Quando c'è una meta, i nomi degli
       incroci e i negozi che passi diventano rumore sopra le svolte: le
       svolte li dicono già, i nomi delle strade. Qui si tace tutto il
       resto, e parla solo la guida. */
    /* LA REGOLA GENERALE: QUELLO CHE SI DICE DIPENDE DA COME TI MUOVI.
       «Eravamo in autostrada e dava gli incroci» (Vince, 19/10). A ottanta
       all'ora gli attraversamenti, i paletti, gli scivoli del marciapiede e
       i nomi degli incroci non sono informazione: sono rumore, e per di
       piu' arrivano quando sei gia' un chilometro piu' avanti. Tutto
       quello che si misura in passi vale solo se i passi li stai facendo.
       Quello che resta, e che anzi conta di piu', e' il paesaggio: «a
       sinistra il Vesuvio, a destra il golfo con le isole». */
    var aPiedi = s.aPiedi !== false;
    /* IL FARO: un battito da quella parte, a ogni passo. Non dice niente:
       si sente, e basta. */
    if (faro.acceso()) {
      var df = faro.dove({ lat: s.lat, lon: s.lon }, s.direzione, s.direzioneBuona);
      if (df) suonaIlFaro(df);
      var pf = faro.passo({ lat: s.lat, lon: s.lon }, s.direzione, s.direzioneBuona);
      if (pf) {
        if (pf.tipo === 'faro-arrivato') { spegniIlSuono(); vibra('arrivato'); }
        dillo(pf);
      }
    }

    /* I PERCORSI SUOI: si registra camminando, o si segue quello che ha
       gia' camminato. Viene prima di tutto il resto, perche' e' l'unico
       dato di cui siamo sicuri. */
    if (miei.staRegistrando()) miei.passo({ lat: s.lat, lon: s.lon });
    if (miei.sto()) {
      var pm = miei.passoSuPercorso({ lat: s.lat, lon: s.lon }, Date.now());
      if (pm) {
        dilloSubito(pm);
        if (pm.tipo === 'percorso-arrivato') miei.smetti();
      }
    }

    /* SU UN MEZZO, LE FERMATE. A piedi le dice parti/passaggi.js; qui
       servono per sapere quando scendere, che in metro e' l'unica cosa
       che conta — e per chi non vede e' la parte piu' difficile di un
       viaggio in citta'. */
    if (!aPiedi) {
      var fe = fermate.prossima({ qui: { lat: s.lat, lon: s.lon },
                                  punti: SERVIZI.punti || [], luoghi: LUOGHI,
                                  aPiedi: false, preciso: !(s.prec > 50) });
      if (fe) dillo(fe);
    }
    /* senza precisione, le cose che si misurano in passi tacciono: e' la
       stessa regola del movimento, per un altro motivo */
    var inViaggio = !!guida.meta() || !aPiedi || !preciso;
    /* PRIMA QUELLO CHE ARRIVA, POI QUELLO CHE PASSI. «È importante che in
       Utilità guidi il non vedente, non dica "sei qui"… dica dove deve
       andare o descriva, non dica dove è» (Vince, 21/10). Un
       attraversamento detto quando ci sei sopra è una cronaca; detto
       trenta passi prima è una guida. Questo viene prima di tutto il
       resto, e vale anche mentre ti accompagna da qualche parte: gli
       avvisi non si spengono mai. */
    if (aPiedi && !(s.prec > 50)) {
      var arriva = passaggi.inArrivo({ qui: { lat: s.lat, lon: s.lon },
                                       punti: SERVIZI.punti || [],
                                       direzione: s.direzione,
                                       direzioneBuona: s.direzioneBuona });
      if (arriva) dillo(arriva);
    }
    /* ============================================================
       CHI E' FERMO NON STA PASSANDO NIENTE
       «Mentre ero nel supermercato Elite mi ha detto che stavo superando
       Magico Sorriso» (Vince, 25/10). «Stai passando» e «stai superando»
       sono frasi di chi cammina: dentro un negozio, da fermo, il GPS
       balla di qualche metro e l'app leggeva quel ballo come un
       passaggio. I passi lo sanno: se non ne fai, non passi niente.
       Gli AVVISI restano accesi (un attraversamento, uno scalino: quelli
       valgono anche da fermi, e li gestisce `inArrivo` qui sopra).
       ============================================================ */
    var pass = (inViaggio || s.fermo) ? null
             : passaggi.prossimo({ qui: { lat: s.lat, lon: s.lon }, punti: SERVIZI.punti || [],
                                   direzione: s.direzione, direzioneBuona: s.direzioneBuona,
                                   quando: Date.now() });
    if (pass) dillo(pass);
    if (!inViaggio && modo === 'servizi' && SERVIZI.vie && SERVIZI.vie.length) {
      var inc = incroci.quale({ qui: { lat: s.lat, lon: s.lon }, vie: SERVIZI.vie,
                                strada: ultimaVia, direzione: s.direzione,
                                direzioneBuona: s.direzioneBuona });
      if (inc) dillo(inc);
    }
    /* ============================================================
       LA VIA LA SA GIA' L'AGGANCIO: NON SI ASPETTA LA RETE
       «Mi ha detto che ero in via dei Sommozzatori a meta'» — e al
       ritorno la stessa cosa in via dei Corazzieri (Vince, 25/10).
       Misurato sulla sua traccia: l'annuncio e' arrivato a **79 metri**
       dall'imbocco, su una via di 258. Il perche': il nome della via lo
       chiedevamo alla rete (Photon) dopo quaranta metri di cammino, e
       poi serviva la CONFERMA alla risposta successiva — altri quaranta
       metri. Ottanta metri di ritardo, per costruzione.
       Ma il nome della via ce l'abbiamo in casa: le vie di OpenStreetMap
       le scarichiamo per gli incroci, e l'aggancio ci posa sopra la
       posizione a ogni lettura (`viaAgganciata`). Quello non costa rete
       e non ha ritardo: due letture di conferma sono due secondi.
       La rete resta, per quando le vie non ci sono.
       ============================================================ */
    if (!inViaggio && s.viaAgganciata) {
      if (s.viaAgganciata === agganciataInProva) {
        agganciataConferme++;
      } else {
        agganciataInProva = s.viaAgganciata;
        agganciataConferme = 1;
      }
      if (agganciataConferme === 2 && !uguali(s.viaAgganciata, ultimaVia)) {
        var AD = Date.now();
        var aspetta = aPiediOra() ? 25000 : 120000;
        var dettaQuando = stradeDette[senzaAccenti(s.viaAgganciata)] || 0;
        if (AD - ultimoAnnuncioStrada >= aspetta && AD - dettaQuando >= 180000) {
          var primaEra = ultimaVia;
          ultimaVia = s.viaAgganciata;
          /* ATTENZIONE: QUI NON SI SCRIVE IL CIVICO, E NON SI INVENTA.
             `ultimaStrada` e' la scritta INTERA che arriva dalla rete —
             via PIU' numero — ed e' l'unico posto da cui si ricava il
             civico da dire. L'aggancio locale conosce solo il NOME della
             via: mettendolo qui (fatto il 25/10 per annunciare la strada
             senza aspettare la rete) il numero spariva, e il 26/10, su
             1.808 metri di camminata vera in Utilita', **l'app non ha
             detto un solo civico**. Qui si svuota: nessun numero e'
             meglio del numero di un'altra via, e appena la rete risponde
             per questa via i civici ricominciano. */
          ultimaStrada = '';
          stradeDette[senzaAccenti(s.viaAgganciata)] = AD;
          ultimoAnnuncioStrada = AD;
          diario('STRADA dall aggancio (senza rete): ' + s.viaAgganciata);
          dillo({ tipo: 'strada', livello: 'guida',
                  testo: (primaEra ? 'Sei entrato in ' : 'Sei in ') + s.viaAgganciata + '.' });
          scena.dimentica();
          passaggi.stradaNuova();
        } else {
          ultimaVia = s.viaAgganciata;
          stradeDette[senzaAccenti(s.viaAgganciata)] = AD;
        }
      }
    }

    // la strada, una volta al minuto
    /* LA STRADA SI CHIEDE QUANDO TI SEI MOSSO, non all'ora.
       «Ho girato da via Laurentina a via dei Corazzieri e non mi ha detto
       nulla; solo dopo, a casa, mi ha detto sei in via dei Corazzieri»
       (Vince, 16/10). Chiedendola una volta al minuto, la svolta si scopre
       quando ormai non serve più. Adesso si chiede dopo quaranta metri —
       una curva sta tutta lì dentro — o comunque ogni quaranta secondi se
       si sta fermi. */
    var mossoDi = ultimaStradaDove
      ? posizione.dist(ultimaStradaDove.lat, ultimaStradaDove.lon, s.lat, s.lon) : 9999;
    if (mossoDi > 40 || Date.now() - ultimaStradaQuando > 40000) {
      ultimaStradaQuando = Date.now();
      ultimaStradaDove = { lat: s.lat, lon: s.lon };
      intorno.strada(s.lat, s.lon).then(function (v) {
        /* LA VIA NON SI SA: SI DESCRIVE QUELLO CHE HAI AI LATI.
           «Cioè basta dire: a destra trovi il ristorante, a sinistra
           questo; così copri il buco e descrivi» (Vince, 16/10).
           Photon in mezzo a un viale può non dare la strada, e da quando
           il nome di un negozio non passa più per nome di via (il difetto
           del «Sei entrato in Bar Roma») qui resterebbe silenzio. Per chi
           non vede il silenzio è la cosa peggiore: al suo posto va una
           descrizione, che è poi il mestiere dell'app. */
        if (!v || !v.via) {
          var lati = scena.aiLati({ qui: { lat: s.lat, lon: s.lon },
                                    direzione: s.direzione,
                                    direzioneBuona: s.direzioneBuona,
                                    punti: SERVIZI.punti || [] });
          if (lati) { diario('VIA SCONOSCIUTA: descrivo i lati'); dillo(lati); }
          return;
        }
        var dove = v.via + (v.civico ? ' ' + v.civico : '');
        /* SI ANNUNCIA LA STRADA, NON IL CIVICO. «Ero in via Guglielmo
           Marconi e mi continuava a dire: hai imboccato via Marconi, ma
           ero già a metà» (Vince, 16/10, in scooter). Il confronto era
           sull'intera scritta — via PIÙ numero — e in un viale lungo il
           numero cambia ogni venti metri: ogni volta sembrava una strada
           nuova. Adesso si guarda solo il nome; il civico si porta dietro
           per chi lo chiede, ma non fa parlare nessuno. */
        var viaOra = (v.via || '').trim();
        ultimaStrada = dove;
        if (!viaOra || uguali(viaOra, ultimaVia)) { viaInProva = ''; return; }

        /* ============================================================
           UNA VIA SI ANNUNCIA SOLO SE LA VEDO DUE VOLTE DI FILA
           «L'errore che fa è quando passi un incrocio: dice "stai
           imboccando questa strada" ma invece stiamo percorrendo la
           stessa strada» (Vince, 20/10, dopo un giro in macchina).
           La diagnosi è sua ed è giusta: attraversando un incrocio, il
           punto sulla mappa per un attimo cade sulla via TRASVERSALE —
           il cercatore risponde con quella — e subito dopo torna sulla
           nostra. Una sbandata di due secondi diventava un annuncio.
           Il riposo di venticinque secondi non basta, perché la via
           trasversale è un nome nuovo e passa.
           La conferma invece la coglie: una via nuova si segna e si tace;
           se alla risposta dopo c'è ancora, allora ci siamo entrati
           davvero e lo si dice. Se è sparita, era l'incrocio. */
        if (viaInProva !== viaOra.toLowerCase()) {
          viaInProva = viaOra.toLowerCase();
          diario('STRADA: «' + viaOra + '» vista una volta, aspetto conferma');
          return;
        }
        viaInProva = '';
        /* UNA STRADA GIA' ANNUNCIATA NON SI RIANNUNCIA SUBITO.
           Dal quaderno del 18/10, a Vietri: «Sei entrato in Via Osvaldo
           Costabile» alle 29:44 e di nuovo alle 30:09; Via Giuseppe
           Pellegrino alle 31:42 e alle 33:19. Non aveva girato: il punto
           sulla mappa balla fra due vie vicine, e ogni ballo sembrava una
           strada nuova. Chi cammina lo sente come «dice sempre le stesse
           cose». Una via detta da meno di tre minuti si registra ma si
           tace. */
        var ADESSO = Date.now();
        /* E NON PIU' DI UNA STRADA PER VOLTA. Provando a Vietri nel
           browser: «Sei entrato in Via Roma» alle 20:08, «Strada Statale
           Amalfitana» alle 20:16, «Via Osvaldo Costabile» alle 20:40 —
           tre strade in mezzo minuto, senza aver girato. Il riposo per
           NOME non basta: il punto balla fra vie DIVERSE, e ogni ballo
           era un annuncio nuovo. Fra un annuncio di strada e il prossimo
           passano almeno venticinque secondi, chiunque sia la via: se nel
           frattempo si e' girato davvero, lo si dice un attimo dopo. */
        /* IN MACCHINA LE STRADE SI DICONO DI RADO. Dal quaderno del
           20/10: sul Grande Raccordo Anulare, a cinquanta all'ora, ha
           annunciato venticinque vie una dietro l'altra — «sei entrato in
           Via Bruno de Finetti», «Strada provinciale 95/b»... A quella
           velocità una via dura trenta secondi e non e' informazione: e'
           un elenco. A piedi venticinque secondi vanno bene, in macchina
           ce ne vogliono due minuti. */
        var quantoAspettare = aPiediOra() ? 25000 : 120000;
        if (ADESSO - ultimoAnnuncioStrada < quantoAspettare) {
          diario('STRADA: ' + viaOra + ' troppo presto dopo l altra, taccio');
          ultimaVia = viaOra;
          stradeDette[senzaAccenti(viaOra)] = ADESSO;
          return;
        }
        var quandoDetta = stradeDette[senzaAccenti(viaOra)] || 0;
        var prima = ultimaVia;
        ultimaVia = viaOra;
        stradeDette[senzaAccenti(viaOra)] = ADESSO;
        if (ADESSO - quandoDetta < 180000) {
          diario('STRADA: ' + viaOra + ' gia detta da ' + Math.round((ADESSO - quandoDetta) / 1000) + 's, taccio');
          scena.dimentica();
          passaggi.stradaNuova();
          return;
        }
        ultimoAnnuncioStrada = ADESSO;
        dillo({ tipo: 'strada', livello: 'guida',
                testo: (prima ? 'Sei entrato in ' : 'Sei in ') + viaOra + '.' });
        scena.dimentica();          // strada nuova, scena nuova: si può ridire
        passaggi.stradaNuova();
      });
      prendiQuadretti(s);
      intorno.servizi(s.lat, s.lon).then(function (v) {
        if (!v) return;
        /* SOLO QUELLI INTORNO. Dario, provandola a Napoli: «non è al
           massimo fluida». Una causa certa era qui: i quadretti portano
           novecento luoghi e la mappa viva centosessanta punti, e si
           confrontavano tutti con tutti a ogni giro — centoquarantamila
           conti di distanza al minuto, su un telefono che intanto deve
           parlare. Dei novecento, camminando, ne contano trenta: quelli a
           meno di trecento metri. */
        var vicini300 = NOSTRI.filter(function (x) {
          return Math.abs(x.lat - s.lat) < 0.0035 && Math.abs(x.lon - s.lon) < 0.0045;
        });
        v.punti = negozi.unisci(v.punti || [], vicini300);
        SERVIZI = v;
        /* appena si sa cosa c'è intorno, lo si dice: è la cosa che a chi non
           vede serve più di tutte, e al turista racconta dov'è capitato. */
        raccontaScena();
      });
      intorno.luoghi(s.lat, s.lon).then(function (nuovi) {
        if (!nuovi || !nuovi.length) return;
        /* Wikipedia risponde anche su luoghi che abbiamo già scritti a mano,
           e le nostre schede sono migliori: se c'è qualcosa di nostro entro
           sessanta metri, o col nome che somiglia, il doppione si scarta.
           Provando la nuova app il Battistero di Parma compariva due volte. */
        var aggiunti = 0;
        nuovi.forEach(function (x) {
          var doppio = LUOGHI.some(function (p) {
            if (posizione.dist(p.lat, p.lon, x.lat, x.lon) < 60) return true;
            var a = p.n.toLowerCase(), b = x.n.toLowerCase();
            return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
          });
          if (doppio) return;
          LUOGHI.push(x); aggiunti++;
        });
        if (aggiunti) diario('da Wikipedia: ' + aggiunti + ' luoghi nuovi (totali ' + LUOGHI.length + ')');
      });
    }
    // se ti sto portando da qualche parte, parla la guida e basta
    if (guida.meta()) {
      /* cosa c'è accanto alla meta: serve per riconoscerla arrivando */
      var m4 = guida.meta();
      var accanto = '';
      if (m4) {
        var piuVicino = null, dpiu = 30;
        (SERVIZI.punti || []).forEach(function (p) {
          if (!p.nome) return;
          var dd = posizione.dist(m4.lat, m4.lon, p.lat, p.lon);
          if (dd < dpiu) { dpiu = dd; piuVicino = p; }
        });
        if (piuVicino) accanto = piuVicino.nome;
      }
      var g = guida.passo({ lat: s.lat, lon: s.lon, direzione: s.direzione,
                            direzioneBuona: s.direzioneBuona }, Date.now(), { accanto: accanto });
      if (g) dilloSubito(g);
      /* FUORI STRADA: un navigatore non si limita a dirlo, ne cerca un
         altro. Il percorso si richiede da dove sei adesso, verso la stessa
         meta: se la rete non risponde resta la bussola, e si sente. */
      if (g && g.tipo === 'fuori') {
        var m3 = guida.meta();
        var qui3 = { lat: s.lat, lon: s.lon, direzione: s.direzione, direzioneBuona: s.direzioneBuona };
        diario('FUORI STRADA: rifaccio il percorso');
        intorno.percorso(qui3, m3).then(function (nuovo) {
          PERCORSO = nuovo;
          if (!nuovo) { diario('FUORI STRADA: percorso non arrivato, resta la bussola'); }
          dilloSubito(guida.vaiA(m3, qui3, { via: ultimaStrada }, nuovo));
        });
      }
      return;
    }
    /* I RIFERIMENTI SUOI, PRIMA DI TUTTO IL RESTO.
       «Durante il percorso è possibile registrare scivolo, percorso
       tattile, ostacolo, panchina, ritrovo, bar» (Vince, 23/10). Un
       ostacolo che uno si è segnato lui vale più di qualunque cosa
       abbiamo nei dati: l'ha messo lì perché ci ha sbattuto. Quindi
       passa prima della passeggiata e prima del racconto, e se è un
       pericolo esce come avviso — che vuol dire anche che non lo ferma
       il respiro né il «solo monumenti».
       Solo a piedi e solo con la posizione buona: le regole stanno in
       parti/aChiServe.js come per tutto il resto. */
    /* LA REGOLA SI GUARDA PRIMA DI CHIEDERE, non dopo. quiVicino() si
       segna che l'ha detto, e se poi la regola lo butta (non a piedi,
       posizione incerta) quel riferimento resta zitto per due minuti
       senza che nessuno l'abbia sentito. Provandolo nell'app: «REGOLA:
       mio-posto non va in servizi (non a piedi)», e la panchina non si
       è più fatta sentire. */
    if (aPiedi && preciso && hoLaParola && !staAspettando()) {
      var rif = posti.quiVicino({ lat: s.lat, lon: s.lon }, Date.now());
      if (rif) diario('MIO: ' + rif.posto.n + ' a ' + Math.round(rif.metri) + ' m');
      /* SEMPRE dilloSubito, anche per la panchina. quiVicino() si segna
         che l'ha detto e poi tace due minuti su quel riferimento: se
         intanto dillo() lo butta — il respiro, «solo monumenti», una
         domanda in sospeso — quel riferimento resta muto senza che
         nessuno l'abbia sentito. Provandolo nell'app è successo due
         volte: «REGOLA: mio-posto non va in servizi» e «ZITTO: sto
         aspettando una risposta», e lo scivolo non si è mai fatto
         sentire. E poi il respiro serve a limitare le NOSTRE chiacchiere:
         questi punti li ha messi lui, uno per uno, apposta. */
      if (rif) { dilloSubito(rif); return; }
    }

    /* SE SI STA FACENDO UNA PASSEGGIATA, PARLA LA PASSEGGIATA. Una tappa per
       volta: se intanto parlasse anche il racconto, al Battistero si
       sentirebbero due voci dire due cose diverse sullo stesso luogo. La
       strada, la scena e l'emergenza restano, perché quelle servono sempre. */
    if (passeggiata.inCorso()) {
      var dove = { lat: s.lat, lon: s.lon, direzione: s.direzione, direzioneBuona: s.direzioneBuona };
      var pp = passeggiata.passo(dove);
      if (pp) { dillo(pp); return; }
      /* e fra una tappa e l'altra, il filo che le lega: esce come cenno,
         quindi una svolta o un'emergenza gli passano sopra. */
      var f = passeggiata.filo(dove, Date.now());
      if (f) dillo(f);
      return;
    }
    /* QUI C'È UN PERCORSO. «Quando camminando mi avvicino a un percorso
       potremmo dire: qui c'è il percorso Bernini o Borromini», e «secondo
       me i percorsi devono essere legati alla posizione» (Vince, 23/10).
       Solo in Turismo e solo a piedi: le regole di quando si offre e di
       quante volte stanno in parti/passeggiata.js. Esce come cenno, quindi
       una svolta o un'emergenza gli passano sopra. */
    if (modo === 'cultura' && s.aPiedi !== false) {
      var off = passeggiata.quiCeIlPercorso({ lat: s.lat, lon: s.lon }, Date.now());
      if (off) { dillo(off); return; }
    }
    // e il racconto
    /* COME TI MUOVI DECIDE COSA SENTI: senza questo il racconto credeva
       di avere sempre davanti uno che cammina, e in macchina produceva
       cenni a ottanta passi che la regola poi buttava via in silenzio. */
    var d = racconto.prossimo({ qui: { lat: s.lat, lon: s.lon }, intorno: lista, modo: modo,
                                direzioneBuona: s.direzioneBuona,
                                aPiedi: s.aPiedi,
                                /* fermo lo decide il contapassi, non il GPS */
                                fermo: s.fermo,
                                cardinale: null });
    if (d) dillo(d);
  });

  // la vigilanza: se la posizione non arriva, si parla
  posizione.vigila(function (comeVa) {
    if (comeVa === 'cerco') {
      voce.parla('Sto ancora cercando la tua posizione. Se sei al chiuso, prova a uscire.', { livello: voce.GUIDA });
    }
  }, 12000);

  /* ---------- i comandi ---------- */
  var PAROLE = {
    ancora: ['ancora', 'approfondisci', 'di piu', 'raccontami', 'dimmi di piu', 'continua'],
    avanti: ['avanti', 'vai oltre', 'prossimo', 'salta'],
    ferma: ['ferma', 'basta', 'silenzio', 'zitto', 'stop'],
    dove: ['dove sono', 'dove mi trovo', 'in che strada sono'],
    /* LE PAROLE, NON LE FRASI. Il 16/10 Vince ha chiesto tre volte, a voce:
       «mi puoi descrivere che c'è intorno», «mi puoi dire i numeri civici
       cosa c'è intorno», «oltre agli attraversamenti mi puoi descrivere…» —
       e l'app è rimasta zitta tutte e tre, perché cercava la frase esatta.
       Chi parla non ripete una formula: si riconosce la parola che conta. */
    intorno: ['intorno', 'descriv', 'cosa c e', 'che c e', 'elenco', 'cosa vedi'],
    civico: ['civic', 'che numero', 'numero sono', 'numero siamo'],
    negozi: ['negozi', 'un negozio', 'negozio', 'che negozi', 'botteghe'],
    casamia: ['dove abito', 'dov e casa', 'qual e casa', 'che indirizzo ho', 'casa mia dov'],
    turismo: ['turismo', 'turista'],
    utilita: ['utilita', 'servizi'],
    /* LA LETTURA. «Scritto» da solo tiene tutte le forme in cui la gente la
       chiede — «che c'è scritto», «cosa c'è scritto qui», «leggimi quello
       che è scritto» — e «cartello» la frase più naturale di tutte. */
    leggi: ['leggi', 'scritto', 'cartello', 'targa', 'citofono'],
    aiuto: ['aiuto', 'comandi', 'che posso dire'],
    /* CHIUDERE A VOCE. «La app deve aprirsi e chiudersi facilmente,
       vocalmente ed agevolmente» (Vince, 23/10, regola 3). Il 22/10 la
       sorella di Vince l'ha disinstallata perche' non trovava il modo di
       uscirne. Aprirla a voce lo fa gia' il telefono — «Ehi Siri, apri
       Yourbea» — chiuderla no, e tocca a noi. */
    /* niente elenco di parole per questo: «chiudi» dentro una frase
       qualunque chiuderebbe l'app. Provato al banco, «chiudi il
       microfono» e «chiudi la finestra» la chiudevano. Serve che la
       frase SIA il comando, non che lo contenga: la regola sta piu'
       sotto, in CHIUDI_TUTTO. */
    /* CHE COSA VUOI SENTIRE. «Deve essere facilmente accessibile, che io
       dico solo monumenti» (Dario, 16/10). Si riconosce la parola che
       conta — «solo monumenti», «soltanto i monumenti», «niente negozi» —
       e la via di ritorno, «dimmi tutto», perche' una strada che si chiude
       e non si riapre e' una trappola. */
    solomonumenti: ['solo monument', 'soltanto monument', 'solo i monument',
                    'soltanto i monument', 'niente negozi', 'solo le cose belle'],
    dimmitutto: ['dimmi tutto', 'raccontami tutto', 'dimmi di nuovo tutto',
                 'voglio sentire tutto', 'torna a dirmi tutto']
  };
  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /* LE IPOTESI SI PROVANO IN FILA, e ci si ferma alla prima capita.
     Se nessuna e' un comando, si esegue comunque la PRIMA: e' quella che
     il riconoscitore ritiene piu' probabile, ed e' lei che deve arrivare
     a chi segna un contributo a voce («qui c'e' un albero») — li' contano
     le parole sue, non la somiglianza con un comando. */
  function comandoFraLeIpotesi(ipotesi) {
    var lista = (ipotesi || []).filter(function (x) { return String(x || '').trim(); });
    if (!lista.length) return false;
    if (lista.length > 1) diario('SENTITO, le ipotesi: ' + lista.join(' | '));
    /* PRIMA si cercano i comandi in TUTTE e tre — compresa la prima:
       se la prima si prendesse anche la strada del «questa non l'ho
       capita», risponderebbe li' e la fila non arriverebbe mai alla
       seconda. E' proprio il caso che vogliamo chiudere. */
    for (var i = 0; i < lista.length; i++) {
      if (comando(lista[i], true)) {
        if (i > 0) diario('COMANDO: ha funzionato l\'ipotesi numero ' + (i + 1) + ' — ' + lista[i]);
        return true;
      }
    }
    /* nessuna era un comando: vale la prima, con tutto quello che comando()
       fa anche quando non riconosce (segnare un contributo, rispondere a
       chi ci parlava). */
    return comando(lista[0]);
  }

  /* `soloComandi`: quando si sta provando la SECONDA o la TERZA ipotesi
     del riconoscitore, si accettano solo i comandi veri. Senza questo,
     un'ipotesi fantasiosa che «sembra rivolta a noi» farebbe rispondere
     «questa non l'ho capita» e la fila si fermerebbe li', proprio come
     se avesse funzionato. */
  function comando(testo, soloComandi) {
    var t = normalizza(testo);
    /* IL TESTO COME L'HA DETTO, accanto a quello sbassato. normalizza()
       butta via tutto quello che non e' una lettera, apostrofi compresi:
       al banco «qui c'è un attraversamento» si era segnato «qui c e un
       attraversamento», e quelle sono le parole SUE — REGOLA 2 dei
       percorsi. Chi riconosce i comandi lavora sullo sbassato; chi tiene
       le sue parole lavora su questo. */
    var grezzo = String(testo || '').trim();
    if (!t) return false;
    if (!soloComandi) diario('COMANDO: ' + t.slice(0, 50));
    /* ha(): o il nome di un gruppo di PAROLE, o le frasi scritte lì per lì —
       si usano tutt'e due gli stili qui sotto. Scritta che accettava solo i
       gruppi, `ha('portami a casa', ...)` cercava il gruppo «portami a casa»,
       non lo trovava e SCOPPIAVA: da lì in giù non funzionava più nessun
       comando parlato — né «ancora», né «avanti», né «dove sono». */
    function ha() {
      var quali = [].slice.call(arguments);
      return quali.some(function (k) {
        var frasi = PAROLE[k] || [k];
        if (frasi.some(function (p) { return t.indexOf(p) >= 0; })) return true;
        /* e nella lingua del turista: l'ascolto alterna italiano e la
           sua lingua, quindi qui puo' arrivare «bring mich nach Hause»
           invece di «portami a casa». L'italiano vale sempre. */
        return lingua.suoComando(k, t) || lingua.suoComando(k, grezzo);
      });
    }

    /* SCEGLIERE LA LINGUA A VOCE — 28/10/2026, Vince: «dove si sceglie?».
       Di suo l'app prende la lingua del telefono: per un cieco e' la cosa
       giusta, non deve cercare niente. Ma un telefono in inglese in mano
       a un tedesco, o una prova, hanno bisogno di un modo — e dev'essere
       a voce, come tutto il resto. Si dice nella lingua che si vuole
       («sprich deutsch», «speak english») oppure in italiano («parla
       tedesco»), perche' chi la chiede magari l'italiano non lo sa. */
    var CHIESTA = {
      it: /\b(italiano|italian|italienisch|italien)\b/, de: /\b(deutsch|tedesco|german)\b/,
      en: /\b(english|inglese|englisch|anglais)\b/, fr: /\b(francais|français|francese|french)\b/,
      es: /\b(espanol|español|spagnolo|spanish)\b/, nl: /\b(nederlands|olandese|dutch)\b/,
      pl: /\b(polski|polacco|polish)\b/, cs: /\b(cesky|čes|ceco|czech)\b/,
      zh: /(中文|cinese|chinese)/, ro: /\b(romana|română|rumeno|romanian)\b/,
      pt: /\b(portugues|português|portoghese|portuguese)\b/, da: /\b(dansk|danese|danish)\b/,
      hu: /\b(magyar|ungherese|hungarian)\b/, sv: /\b(svenska|svedese|swedish)\b/,
      ja: /(日本語|giapponese|japanese)/, ru: /(русский|russo|russian)/,
      ko: /(한국어|coreano|korean)/, nb: /\b(norsk|norvegese|norwegian)\b/,
      fi: /\b(suomi|finlandese|finnish)\b/, el: /(ελλην|greco|greek)/,
      ar: /(العربية|arabo|arabic)/
    };
    if (/\b(parla|parlare|lingua|speak|sprich|sprache|language|parle|habla|idioma)\b/.test(t)) {
      for (var qq in CHIESTA) {
        if (!Object.prototype.hasOwnProperty.call(CHIESTA, qq)) continue;
        if (!CHIESTA[qq].test(t)) continue;
        lingua.cambia(qq).then(function (fatta) {
          voce.parla(fatta === 'it' ? 'Parlo italiano.' : lingua.di('Va bene.'),
                     { livello: voce.GUIDA, ancheSeUguale: true });
          diario('LINGUA: chiesta a voce → ' + fatta);
        });
        return true;
      }
    }

    if (!el('porta').hidden) {
      if (ha('turismo')) { entra('cultura'); return true; }
      if (ha('utilita')) { entra('servizi'); return true; }
    }
    /* «annulla»: ferma la chiamata al 112 nei cinque secondi che ha di
       conto alla rovescia. Dario: «per poco non ho chiamato il 112». */
    if (/^(?:annulla|non chiamare|aspetta|no aspetta|ferma tutto)$/.test(t)) {
      fermaLeMosse();
      voce.parla('Va bene, non chiamo nessuno.', { livello: voce.EMERGENZA, ancheSeUguale: true });
      return true;
    }
    /* CHIUDERE VIENE PRIMA DI ZITTIRE — 28/10/2026
       «Non mi ha fatto chiudere l'app vocalmente», detto da Vince piu'
       volte. Non era il microfono e non era il riconoscitore: `ferma`
       contiene «ferma», «basta», «stop», e `ha()` cerca la parola DENTRO
       la frase. Cosi' «yourbea fermati» trovava «ferma» QUI, faceva
       silenzio, e la regola della chiusura — quattrocentocinquanta righe
       piu' in basso — non la raggiungeva mai. Misurato nel browser il
       28/10: «yourbea chiudi» e «ho finito» dicevano «Chiudo. A presto.»,
       «yourbea fermati» e «basta» non facevano niente.
       (Il 25 avevo allargato la regola della chiusura per far entrare
       «affermati»: era giusto, ma inutile, perche' li' non si arrivava.)
       UNA PAROLA SOLA NON CHIUDE. «basta», «ferma», «stop», «zitto»,
       «silenzio» dette da sole restano quello che sono sempre state —
       «adesso taci» — perche' chiudere l'app a uno che cammina al buio
       non si fa per una parola che puo' voler dire due cose. Con
       qualunque altra cosa intorno («basta yourbea», «basta, siamo
       arrivati») la frase e' una chiusura, e chiude. */
    if (!/^(?:basta|ferma|stop|zitto|zitta|silenzio)$/.test(t) &&
        CHIUDI_TUTTO.test(t) && !NON_CHIUDE.test(t)) {
      chiudiTutto();
      return true;
    }
    if (ha('ferma')) {
      fermaLeMosse(); voce.ferma(); guida.lascia();
      /* «ferma» durante una passeggiata la lascia, e si dice: se si zittisse
         soltanto la voce, l'app resterebbe a seguire un giro che l'utente
         ha lasciato, e al primo monumento ricomincerebbe da sé.
         Ma «zitto» e «silenzio» no: quelli vogliono dire «non parlare
         adesso», e la passeggiata resta. Quali parole lasciano il giro lo
         decide la parte, dove è provato. */
      var q = passeggiata.dallaVoce(t);
      if (q && q.cosa === 'ferma') {
        var lascio = passeggiata.ferma();
        if (lascio) dilloSubito(lascio);
      }
      return true;
    }
    /* «messaggio» da solo, subito dopo «avvisa»: ferma la chiamata e manda
       lo scritto. È la seconda strada della doppia opzione. */
    if (/^(?:messaggio|il messaggio|manda il messaggio|scrivi|whatsapp)$/.test(t) && contatto && contatto.telefono) {
      fermaLeMosse();
      var sm = posizione.leggi();
      dilloSubito(emergenza.avvisaContatto({ via: ultimaStrada || '', lat: sm.lat, lon: sm.lon }));
      return true;
    }
    // l'emergenza viene prima di tutto
    var s0 = posizione.leggi();
    /* SEMPRE, anche senza la via. Prima si passava `null` quando la strada
       non si sapeva, e così si buttavano via anche le coordinate: a chi
       chiama i soccorsi resta meglio dire due numeri che niente.
       E con quello che ha intorno: «per i non vedenti la descrizione del
       luogo in cui si è» (Vince, 23/10). All'operatore del 112 «davanti
       alla basilica, accanto alla fontana» dice più di un civico, e chi
       non vede non può guardarsi intorno per rispondere. */
    var dove0 = { via: ultimaStrada, lat: s0.lat, lon: s0.lon, accanto: cosaHoIntorno() };
    var em = emergenza.comando(t, dove0);
    if (em) {
      if (em.tipo === 'cerca') { portamiA(em.cosa); dilloSubito(em); return true; }
      /* chiede di avvisare qualcuno di cui non ho il numero: lo dico e apro
         subito il posto dove scriverlo, se no resta una frase e basta. */
      if (em.tipo === 'chi-e') {
        /* il numero lo ha il telefono: si guarda lì prima di chiederlo */
        if (chiediAllaRubrica(em.nome, /messaggio|whatsapp|scrivi/.test(t) ? 'messaggio' : 'chiamata')) return true;
        dilloSubito(em);
        apriCassetto(true);
        var rc = el('riga-contatto'); rc.hidden = false;
        el('contatto-nome').value = maiuscolaNome(em.nome);
        el('contatto-tel').focus();
        return true;
      }
      dilloSubito(em); return true;
    }
    if (metaInDubbio && /^(?:si|si grazie|va bene|esatto|confermo|quello)$/.test(t)) {
      var m2 = metaInDubbio; metaInDubbio = null;
      partiVerso(m2, { lat: posizione.leggi().lat, lon: posizione.leggi().lon,
                       direzione: posizione.leggi().direzione, direzioneBuona: posizione.leggi().direzioneBuona });
      return true;
    }
    /* QUESTO VIENE PRIMA DI dalDettato E DI miei.dallaVoce, e non è
       un vezzo: provandolo nell'app vera, «registra casa» finiva nel
       giro dei contatti («Casa. Adesso dimmi il suo numero») e «fai il
       percorso casa medico» faceva partire la registrazione di un
       percorso camminato chiamato «casa medico». Chi arriva prima
       vince, e questi comandi sono più stretti degli altri due. */
    /* I POSTI MIEI. «Registra casa», «registra medico», «fai il percorso
       casa medico». Vengono PRIMA di «portami a»: «portami dal medico»
       deve trovare il punto che ha segnato lui, non un medico qualunque
       su OpenStreetMap a tre isolati. */
    /* I CONTRIBUTI alla mappa di tutti: «qui c'è un attraversamento con
       semaforo», «qui c'è Elite». Vengono prima dei posti miei perche'
       sono piu' stretti (cominciano per «qui c'è») e perche' non sono la
       stessa cosa: un posto mio lo sento solo io, un contributo lo
       sentono tutti. */
    var co0 = contributi.dallaVoce(grezzo);
    if (co0) {
      var sc0 = posizione.leggi();
      var ris0 = contributi.segna(co0, sc0.pronto
        ? { lat: sc0.lat, lon: sc0.lon, prec: sc0.prec, via: sc0.viaAgganciata || ultimaVia || '' }
        : null);
      if (ris0) {
        dilloSubito({ tipo: ris0.tipo === 'segnato' ? 'segnato' : 'niente',
                      livello: voce.GUIDA, testo: ris0.testo });
        return true;
      }
    }

    var pq0 = posti.dallaVoce(grezzo);
    if (pq0) {
      var sp0 = posizione.leggi();
      if (pq0.cosa === 'registra') {
        /* DURANTE UNA PASSEGGIATA REGISTRATA IL SEGNO VA SUL PERCORSO.
           «Durante il percorso è possibile registrare scivolo, percorso
           tattile, ostacolo, panchina» (Vince, 23/10): mentre si registra
           un percorso quei punti sono parte di quel percorso, e li tiene
           percorsiMiei. Fuori, sono riferimenti tuoi e basta. */
        if (miei.staRegistrando() && sp0.pronto) {
          var sg = miei.segna({ lat: sp0.lat, lon: sp0.lon }, pq0.nome);
          if (sg) { salvaIMiei(); dilloSubito(sg); return true; }
        }
        var d0 = posti.registra(pq0.nome, sp0.pronto
          ? { lat: sp0.lat, lon: sp0.lon, prec: sp0.prec } : null);
        if (d0.tipo === 'posto-segnato') {
          salvaIPosti();
          /* casa resta casa: «portami a casa» e il tasto grande guardano
             casaPunto, e non si spacca in due la stessa cosa. */
          if (/^casa( mia)?$/i.test(pq0.nome)) {
            casaPunto = { lat: sp0.lat, lon: sp0.lon };
            try { localStorage.setItem('yourbea2-casa-punto', JSON.stringify(casaPunto)); } catch (e) {}
          }
        }
        /* una RISPOSTA a un comando non si filtra mai: dillo() la
           passa per il respiro e per la regola di chi serve, e al
           banco nell'app vera «registra casa» restava muta. */
        dilloSubito(d0);
        return true;
      }
      if (pq0.cosa === 'elenco-posti') { dilloSubito(posti.elenco(sp0.pronto ? { lat: sp0.lat, lon: sp0.lon } : null)); return true; }
      if (pq0.cosa === 'butta') {
        var via = posti.butta(pq0.nome);
        salvaIPosti();
        voce.parla(via ? ('Tolto: ' + via.n + '.') : 'Quello non ce l\'ho.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      if (pq0.cosa === 'percorso-fra-chi') {
        voce.parla('Non so quali sono. Dimmi «che posti ho» e te li elenco.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      if (pq0.cosa === 'percorso-fra') { ilPercorsoFra(pq0.da, pq0.a); return true; }
    }
    if (ha('manda i riferimenti', 'manda i miei riferimenti', 'manda i posti', 'manda i miei posti')) {
      mandaIRiferimenti(null);
      return true;
    }

    if (dalDettato(t, grezzo)) return true;
    /* LEGGERE: prima di «portami a» e delle passeggiate, perché «leggi il
       cartello» non è un posto dove andare; e prima di «intorno», perché
       «che c'è scritto» contiene «che c'è» e finirebbe a elencare i
       monumenti invece di leggere il cartello che hai in mano. */
    if (lettura.inCorso() && ha('ancora')) { diciLaLettura(lettura.ancora()); return true; }
    if (ha('leggi')) { leggiIlCartello(); return true; }
    /* «portami a casa» PRIMA del «portami a» generico: se no cercherebbe
       un posto che si chiama «casa», e ce ne sono a decine. */
    /* PRIMA di «portami a casa», se no «casa» da sola lo prenderebbe */
    /* ============================================================
       I PERCORSI SUOI, a voce. Tre comandi e basta: si comincia, si
       segna camminando, si finisce. Le parole sono le sue — «qui ho la
       panchina», «qui c'è un attraversamento» — non una formula da
       imparare. */
    /* TUTTO A VOCE. Le parole le riconosce la parte, dove sono provate
       (parti/percorsiMiei.js, 27 prove). Qui c'erano quattro espressioni
       scritte a mano e nessuna prova sopra: «manda il percorso del medico
       a Lucia» finiva per cercare un percorso chiamato «medico a lucia»,
       non lo trovava, e chiedeva «quale percorso?» a chi l'aveva appena
       detto. */
    var pv = miei.dallaVoce(grezzo);

    if (pv && pv.cosa === 'crea') {
      var sp0 = posizione.leggi();
      if (!sp0.pronto) {
        voce.parla('Prima devo sapere dove sei. Aspetta che trovo la posizione e ridimmelo.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      cominciaAMisurareIlPasso();
      dilloSubito(miei.comincia(pv.nome, { lat: sp0.lat, lon: sp0.lon }));
      return true;
    }

    if (pv && pv.cosa === 'segna' && miei.staRegistrando()) {
      var sp1 = posizione.leggi();
      dilloSubito(miei.segna({ lat: sp1.lat, lon: sp1.lon }, pv.nota));
      return true;
    }

    if (pv && pv.cosa === 'finito' && miei.staRegistrando()) {
      var fine = miei.finisci();
      salvaIMiei();
      dilloSubito(fine);
      if (fine && fine.percorso) finisciDiMisurareIlPasso(fine.percorso.metri || 0);
      /* IL NOME SI CHIEDE ALLA FINE, non all'inizio. «Crea percorso» e
         basta registrava un percorso senza nome: trova() non lo trovava
         piu' e l'elenco lo diceva vuoto. Chiederlo alla partenza vuol
         dire fermare uno che sta per camminare; alla fine e' fermo, e sa
         dove e' arrivato. */
      if (fine && fine.percorso && !fine.percorso.nome) {
        inAttesaDi = { da: Date.now(), cosa: 'nome-percorso', percorso: fine.percorso };
        voce.parla('Come lo chiamo? Dimmi per esempio: il medico, la farmacia, da mia sorella.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      }
      return true;
    }

    /* AGGIUNGERE E TOGLIERE RIFERIMENTI mentre cammini un percorso tuo:
       la seconda volta ti accorgi del palo, la terza che dopo la panchina
       c'e' il gradino. Il percorso impara, la mappa no. */
    if (pv && miei.sto()) {
      if (pv.cosa === 'segna') {
        var sq = posizione.leggi();
        var esito = miei.aggiungiSegno({ lat: sq.lat, lon: sq.lon }, pv.nota);
        if (esito) { salvaIMiei(); dilloSubito(esito); return true; }
      }
      if (pv.cosa === 'togli-segno') {
        var st = posizione.leggi();
        var tolto = miei.toglieSegno({ lat: st.lat, lon: st.lon });
        if (tolto) { salvaIMiei(); dilloSubito(tolto); return true; }
      }
      if (pv.cosa === 'lascia') {
        miei.smetti();
        voce.parla('Va bene, lascio il percorso.', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
    }

    /* IL FARO, a voce. «Accendi il faro su casa» — oppure, senza dire
       niente, si accende da sé quando si va verso un posto segnato. */
    if (ha('accendi il faro', 'faro acceso', 'metti il faro', 'suonalo', 'fammi sentire dove')) {
      var sf = posizione.leggi();
      var metaF = faro.laMeta() || (guida.meta()) || (casaPunto ? { n: 'casa tua', lat: casaPunto.lat, lon: casaPunto.lon } : null);
      if (!metaF) {
        voce.parla('Su cosa? Dimmi prima dove vuoi andare, oppure segna casa con «casa è qui».',
                   { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      accendiIlSuono();
      dilloSubito(faro.accendi(metaF.n, metaF.lat, metaF.lon));
      return true;
    }
    if (ha('spegni il faro', 'basta il suono', 'togli il faro', 'spegni il suono')) {
      spegniIlSuono();
      var sp3 = faro.spegni();
      if (sp3) dilloSubito(sp3); else voce.parla('Il faro è già spento.', { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }

    /* MANDARE UN PERCORSO A QUALCUNO. «Un volontario dell'UICI registra
       la strada dalla fermata alla sede e la manda ai soci»: diventa un
       link, si manda come un messaggio qualunque, e chi lo apre ce l'ha.
       Nessun server, nessun dato di nessuno su una macchina nostra. */
    /* MANDARE UN PERCORSO A QUALCUNO, dicendo il nome. «Un volontario
       dell'UICI registra la strada dalla fermata alla sede e la manda ai
       soci»: diventa un link, si manda come un messaggio qualunque, e chi
       lo apre ce l'ha. Nessun server, nessun dato di nessuno su una
       macchina nostra. */
    if (pv && pv.cosa === 'manda') {
      var daMandare = (pv.quale && miei.trova(pv.quale)) || (!pv.quale && miei.sto()) || null;
      var quanti = miei.elenco();
      if (!daMandare && !pv.quale && quanti.length === 1) daMandare = miei.trova(quanti[0].nome);
      if (!daMandare) {
        voce.parla(quanti.length
          ? ((pv.quale ? 'Un percorso per ' + pv.quale + ' non ce l\'ho. ' : 'Quale? ') +
             'Hai: ' + quanti.map(function (x) { return x.nome || 'uno senza nome'; }).join(', ') + '.')
          : 'Non hai ancora nessun percorso tuo. Dimmi «crea percorso» e cammina: lo imparo da te.',
          { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      if (!pv.a) {
        /* NON SI APRE UN PANNELLO A CHI NON VEDE: si chiede il nome. */
        inAttesaDi = { da: Date.now(), cosa: 'a-chi-percorso', percorso: daMandare };
        voce.parla('A chi lo mando?', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      mandaIlPercorso(daMandare, pv.a);
      return true;
    }

    if (pv && pv.cosa === 'elenco') {
      var lista = miei.elenco();
      voce.parla(lista.length
        ? ('Hai ' + lista.length + (lista.length === 1 ? ' percorso: ' : ' percorsi: ') +
           lista.map(function (x) { return x.nome; }).join(', ') + '.')
        : 'Non hai ancora nessun percorso tuo. Dimmi «crea percorso» e cammina: lo imparo da te.',
        { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }

    /* l'abbonamento, a voce: chi non vede non cerca un tasto */
    if (ha('abbonamento', 'quanto costa', 'devo pagare', 'quanto manca all abbonamento')) {
      diciAbbonamento(); return true;
    }
    /* «salva il percorso come file»: il GPX, per portarlo fuori di qui */
    if (/^(?:salva|esporta|scarica)\b.*\b(?:file|gpx|mappa)\b/.test(t) ||
        /^(?:il percorso come file|percorso come file|esporta il percorso|esporta percorso)$/.test(t)) {
      var quali = miei.elenco();
      var quale = null;
      if (quali.length === 1) quale = miei.trova(quali[0].nome);
      else {
        var dettoDentro = miei.dallaVoce(t);
        if (dettoDentro && dettoDentro.cosa === 'manda') quale = miei.trova(dettoDentro.nome);
        if (!quale && miei.sto()) quale = miei.sto();
      }
      if (!quale) {
        voce.parla(quali.length
          ? ('Quale? Hai: ' + quali.map(function (x) { return x.nome || 'uno senza nome'; }).join(', ') + '.')
          : 'Non hai ancora nessun percorso tuo.', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      percorsoComeFile(quale);
      return true;
    }
    /* «quanto e' lungo il mio passo» — e «rimisura il mio passo», che lo
       butta e lo rifa al prossimo percorso: uno cambia scarpe, si rompe
       una gamba, o lo ha misurato una volta di corsa. */
    if (/\b(il mio passo|quanto .*(lungo|misura).*passo|la mia falcata)\b/.test(t) &&
        !/rimisura|misura di nuovo|rifai/.test(t)) {
      voce.parla(laDistanza.eMisurato()
        ? ('Il tuo passo è ' + Math.round(laDistanza.quantoEIlPasso() * 100) + ' centimetri, misurato camminando.')
        : 'Il tuo passo non l\'ho ancora misurato: uso settantacinque centimetri. Registra un percorso camminando e lo misuro da solo.',
        { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (/\b(rimisura|misura di nuovo|rifai la misura)\b.*\bpass/.test(t) ||
        /\bmisura(mi)? il (mio )?passo\b/.test(t)) {
      try { localStorage.removeItem('yourbea2-passo'); } catch (e) {}
      laDistanza.dimentica();
      voce.parla('Va bene. Dimmi «crea un percorso» e cammina un centinaio di metri: lo rimisuro mentre cammini.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (ha('compra', 'comprare', 'prendi l abbonamento', 'voglio abbonarmi')) {
      if (window.urbeaCompra) { window.urbeaCompra(); }
      else { diciAbbonamento(); }
      return true;
    }
    if (ha('ripristina', 'ho gia pagato', 'ho già pagato', 'ripristina acquisti')) {
      if (window.urbeaRipristina) { window.urbeaRipristina(); }
      else { diciAbbonamento(); }
      return true;
    }
    if (ha('casa e qui', 'casa è qui', 'questa e casa mia', 'questa è casa mia',
            'segna casa qui', 'sono a casa', 'siamo a casa', 'casa mia e qui')) {
      segnaCasaQui(); return true;
    }
    if (ha('portami a casa', 'torniamo a casa', 'riportami a casa', 'andiamo a casa', 'voglio tornare a casa')) { aCasa(); return true; }

    /* NON TUTTI DICONO «PORTAMI A». Dal quaderno del 21/10: lui ha detto
       «portami alla stazione Laurentina» e la dettatura ha capito «nella
       stazione più vicina della metro Roma» — e noi, che cercavamo le
       parole «portami a», non abbiamo fatto niente. Una persona che non
       vede non ripete la formula giusta: dice quello che le viene.
       Qui si riconosce la COSA chiesta, comunque sia stata detta. */
    /* PRIMA I SUOI PERCORSI, POI LA MAPPA. Se quella strada l'ha
       camminata lui, non c'è geocodificatore che possa fare meglio. */
    var suo = /(portami|accompagnami|andiamo|voglio andare|devo andare)/.test(normalizza(t))
      ? miei.trova(t.replace(/^.*?(portami|accompagnami|andiamo|voglio andare|devo andare)\s*/i, ''))
      : null;
    if (suo) {
      var sp2 = posizione.leggi();
      if (!sp2.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return true; }
      diario('PERCORSO MIO: ' + suo.nome);
      dilloSubito(miei.segui(suo, { lat: sp2.lat, lon: sp2.lon }));
      return true;
    }

    var chiesto = normalizza(t);
    var cose = [
      { parole: ['metro', 'metropolitana', 'la metro'], cerca: 'metropolitana' },
      { parole: ['stazione'], cerca: 'stazione' },
      { parole: ['fermata', 'autobus', 'bus'], cerca: 'fermata' },
      { parole: ['farmacia'], cerca: 'farmacia' },
      { parole: ['bagno', 'toilette'], cerca: 'bagno' },
      { parole: ['bancomat'], cerca: 'bancomat' },
      { parole: ['supermercato'], cerca: 'supermercato' }
    ];
    var vuoleAndare = /(portami|accompagnami|andiamo|voglio andare|devo andare|come arrivo|come ci arrivo|dove sta|dov e|dove si trova|la piu vicina|il piu vicino|piu vicina|piu vicino|cerco|trovami)/.test(chiesto);
    if (vuoleAndare) {
      for (var ci = 0; ci < cose.length; ci++) {
        var c = cose[ci];
        var trovata = c.parole.some(function (w) { return chiesto.indexOf(w) >= 0; });
        if (!trovata) continue;
        /* se ha detto anche un NOME — «stazione Laurentina» — si cerca
           quello, che e' piu' preciso di «la piu' vicina». */
        var conNome = t.replace(/^(.*?)(portami|accompagnami|andiamo|voglio andare|devo andare|cerco|trovami)\s+(a|al|alla|allo|ai|alle|in|verso)?\s*/i, '');
        diario('CHIESTO: ' + c.cerca + (conNome && conNome.length > c.cerca.length + 3 ? ' — «' + conNome + '»' : ' (la piu vicina)'));
        portamiA(conNome && conNome.length > c.cerca.length + 3 ? conNome : c.cerca);
        return true;
      }
    }
    var meta = guida.dalComando(t);
    if (meta) {
      if (/^(?:casa|casa mia|a casa)$/.test(meta.trim())) { aCasa(); return true; }
      portamiA(meta); return true;
    }
    if (ha('solo monument', 'soltanto monument', 'solo i monument',
            'soltanto i monument', 'niente negozi', 'solo le cose belle')) {
      cosaSentire(true); return true;
    }
    if (ha('dimmi tutto', 'raccontami tutto', 'voglio sentire tutto', 'torna a dirmi tutto')) {
      cosaSentire(false); return true;
    }
    if (ha('lascia perdere', 'annulla', 'non importa')) { dilloSubito(guida.lascia()); return true; }
    /* LE PASSEGGIATE. Viene dopo «portami a», perché «portami alla stazione»
       è una cosa e «facciamo una passeggiata» è un'altra, e prima di
       «ancora» e «avanti», che durante una passeggiata vogliono dire la
       tappa, non il luogo che ti capita accanto. */
    var pq = passeggiata.dallaVoce(t, Date.now());
    if (pq) {
      var sp = posizione.leggi();
      if (!sp.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return true; }
      var dovesono = { lat: sp.lat, lon: sp.lon, direzione: sp.direzione, direzioneBuona: sp.direzioneBuona };
      if (pq.cosa === 'elenco') { dillo(passeggiata.elenco(dovesono)); return true; }
      /* «continuo»: ha detto di no al percorso offerto. Non si insiste e
         non si fa una predica: si conferma in tre parole e si torna a
         camminare. Il giro non verrà più offerto in questa sessione. */
      if (pq.cosa === 'continuo') {
        voce.parla('Va bene, continuiamo.', { livello: voce.CENNO, ancheSeUguale: true });
        return true;
      }
      dillo(passeggiata.comincia(pq.quale !== undefined ? pq.quale : pq.nome, dovesono));
      /* I QUADRETTI DEL GIRO, PRESI SUBITO. «O i percorsi principali»
         (Vince, 16/10): quando si comincia una passeggiata si sa già dove
         si passerà, e la rete adesso c'è — in un vicolo fra due palazzi
         magari no. Si scaricano in anticipo i quadretti di tutte le tappe:
         restano nella cassaforte dei quadretti, che tiene i 250 più usati. */
      prendiPerIlGiro(passeggiata.tappeTutte());
      return true;
    }
    if (passeggiata.inCorso()) {
      var sp2 = posizione.leggi();
      var qui2 = { lat: sp2.lat, lon: sp2.lon, direzione: sp2.direzione, direzioneBuona: sp2.direzioneBuona };
      if (ha('ancora')) { dillo(passeggiata.ancora()); return true; }
      if (ha('avanti')) { dillo(passeggiata.avanti(qui2)); return true; }
    }
    if (/\bmusica\b/.test(t)) {
      if (/spegni|togli|basta|senza|no/.test(t)) { cambiaMusica(false); return true; }
      if (/accendi|metti|voglio|si/.test(t)) { cambiaMusica(true); return true; }
      cambiaMusica(); return true;
    }
    if (ha('ancora')) { dillo(racconto.approfondisci({ qui: posizione.leggi(), intorno: vicini(), modo: modo })); return true; }
    if (ha('avanti')) { dillo(racconto.salta()); return true; }
    if (ha('dove')) { diciDove(); return true; }
    /* «dov'è casa mia»: chi non vede non può aprire le impostazioni per
       controllare cosa abbiamo salvato. Glielo si dice. */
    if (ha('casamia')) {
      if (casa) {
        voce.parla('Casa tua è ' + casa + '. Dimmi «portami a casa» e ti ci porto.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      } else if (casaPunto) {
        voce.parla('Casa tua è un punto che avevi segnato: non ne so l\'indirizzo, ma so arrivarci.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      } else {
        voce.parla('Non so ancora dove abiti. Dimmi: casa mia è, e poi la via e il numero.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      }
      return true;
    }
    if (ha('negozi')) { diciINegozi(); return true; }
    if (ha('civico')) { diciIlCivico(); return true; }
    if (ha('intorno')) { diciIntorno(); return true; }
    if (CHIUDI_TUTTO.test(t) && !NON_CHIUDE.test(t)) { chiudiTutto(); return true; }
    /* COSA SO FARE — e perche' sono due elenchi.
       «Poi non ho trovato il comando per creare il percorso» (Vince,
       23/10). Il comando c'era, e risponde a dieci modi di dirlo: non
       c'era nell'elenco. Una funzione che l'app non nomina non esiste
       per chi non vede lo schermo.
       Ma un elenco di trenta comandi detto tutto d'un fiato non si
       ricorda: si dicono prima quelli di tutti i giorni, e si dice
       che ce n'e' un secondo gruppo. Chi ne ha bisogno lo chiede. */
    if (ha('altri comandi', 'altro', 'cos altro sai fare', 'i percorsi')) {
      voce.parla('I tuoi posti: dì «registra casa», oppure «registra il medico», e me lo segno dove sei. ' +
                 'Poi «portami dal medico», e «che posti ho» per sentirli tutti. ' +
                 'E «fai il percorso casa medico», per sapere la strada fra due dei tuoi posti. ' +
                 'I percorsi camminati: dì «crea percorso» e cammina, e io me lo imparo; ' +
                 'quando passi in un punto che conta dimmi «segna qui» e cosa c\'è. Alla fine, «ho finito». ' +
                 'Poi «che percorsi ho», «seguimi il percorso del medico», «manda il percorso». ' +
                 'In Turismo: «passeggiate» per i giri a tappe, e «comincia la prima». ' +
                 'E «solo monumenti», oppure «dimmi tutto».',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (ha('aiuto')) {
      voce.parla('Puoi dire: dove sono. Cosa c\'è qui intorno. Ancora, per saperne di più. Avanti. Ferma. ' +
                 'Portami a, e un indirizzo; oppure portami a casa. ' +
                 'Leggi, e ti leggo quello che la fotocamera ha davanti: un cartello, un citofono, il numero dell\'autobus. ' +
                 'Chiedi aiuto, e chiamo i soccorsi dicendoti prima dove sei. ' +
                 'Avvisa, e il nome del tuo contatto. ' +
                 'Musica, per accenderla o spegnerla. ' +
                 'Per i tuoi posti e i percorsi, dimmi: altri comandi.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    /* non capito: si risponde solo a chi parlava con noi */
    if (!soloComandi && sembraRivoltoANoi(t)) {
      voce.parla('Questa non l\'ho capita. Se vuoi, dimmi «comandi» e ti dico cosa so fare.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      diario('NON CAPITO (ma era per noi): ' + t.slice(0, 40));
      return true;
    }
    return false;
  }
  /* si saluta, si spegne tutto, e poi si chiude per davvero dove si puo'.
     Su iPhone un'app non puo' terminarsi da sola: allora tace, lascia
     andare microfono e posizione, e lo dice. */
  function chiudiTutto() {
    voce.parla('Chiudo. A presto.', { livello: voce.GUIDA, ancheSeUguale: true });
    setTimeout(function () {
      try { suonaMusica({ suona: false }); } catch (e) {}
      try { faro.spegni(); spegniIlSuono(); } catch (e) {}
      try { miei.smetti(); } catch (e) {}
      try { passeggiata.ferma && passeggiata.ferma(); } catch (e) {}
      acceso = false;
      try { voce.ferma(); } catch (e) {}
      if (window.urbeaChiudi) { window.urbeaChiudi(); return; }
      /* nel browser o dove non si puo' chiudere: resta ferma e muta */
      mostra({ titolo: 'Yourbea', testo: 'Chiusa. Premi Avvia per riaprirla.', dove: '', gradino: '' });
    }, 1600);
  }

  function diciDove() {
    var s = posizione.leggi();
    if (!s.pronto) { voce.parla('Non so ancora dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    intorno.strada(s.lat, s.lon).then(function (v) {
      var dove = v && v.via ? ('Sei in ' + v.via + (v.civico ? ' ' + v.civico : '') + '.') : 'La strada non la so dire.';
      var lista = vicini();
      if (lista.length) dove += ' ' + lista[0].p.n + ' ' + versoParole(lista[0]) + '.';
      dillo({ tipo: 'dove', testo: dove, livello: 'guida' });
    });
  }
  function versoParole(o) {
    var r = o.rel, p;
    if (Math.abs(r) <= 20) p = 'dritto davanti';
    else if (r > 20 && r <= 110) p = 'sulla destra';
    else if (r > 110) p = 'indietro a destra';
    else if (r < -20 && r >= -110) p = 'sulla sinistra';
    else p = 'indietro a sinistra';
    return p + ', a ' + (Math.round(o.m / 10) * 10) + ' metri';
  }
  /* diciINegozi(): «ti cerco un negozio?» è una delle tre cose che l'app
     offre aprendosi, quindi deve saperlo fare: qui si dicono quelli veri,
     presi dalla mappa, con da che parte stanno e quanti passi mancano. */
  function diciINegozi() {
    var s = posizione.leggi();
    if (!s.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    var qui = { lat: s.lat, lon: s.lon };
    var roba = (SERVIZI.punti || []).filter(function (p) {
      return p.servizio && p.cosa !== 'attraversamento' && p.cosa !== 'fermata' &&
             posizione.dist(qui.lat, qui.lon, p.lat, p.lon) < 220;
    });
    if (!roba.length) {
      voce.parla('Qui intorno non trovo negozi segnati sulla mappa. Se ne cerchi uno in particolare dimmelo: per esempio, portami alla farmacia.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return;
    }
    roba.sort(function (x, y) {
      return posizione.dist(qui.lat, qui.lon, x.lat, x.lon) - posizione.dist(qui.lat, qui.lon, y.lat, y.lon);
    });
    var frasi = roba.slice(0, 4).map(function (p) {
      var m = posizione.dist(qui.lat, qui.lon, p.lat, p.lon);
      var o = { p: p, m: m, rel: ((posizione.verso(qui.lat, qui.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180 };
      return (p.nome || p.cosa) + ', ' + (s.direzioneBuona ? versoParole(o) : scena.passi(m));
    });
    dillo({ tipo: 'elenco', livello: 'guida',
            testo: 'Qui vicino: ' + frasi.join('. ') + '. Dimmi «portami» e il nome, e ti ci porto.' });
  }

  /* diciIlCivico(): «i numeri civici» — chiesto a voce il 16/10. */
  function diciIlCivico() {
    var s = posizione.leggi();
    if (!s.pronto) { voce.parla('Non so ancora dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    intorno.strada(s.lat, s.lon).then(function (v) {
      if (!v || !v.via) { dillo({ tipo: 'dove', testo: 'La strada non la so dire.', livello: 'guida' }); return; }
      dillo({ tipo: 'dove', livello: 'guida',
              testo: v.civico ? ('Sei davanti al civico ' + v.civico + ' di ' + v.via + '.')
                              : ('Sei in ' + v.via + ', ma il numero civico qui non è segnato sulla mappa.') });
    });
  }

  /* diciIntorno(): quando lo CHIEDE la persona, si dice tutto quello che
     c'è — la scena (la piazza, gli alberi, i negozi, gli attraversamenti) e
     i luoghi. E si dice ANCHE se l'abbiamo appena detto: i tempi di riposo
     servono per quando parla l'app di sua iniziativa, non per quando una
     domanda la fa qualcuno. Il 16/10 Vince ha chiesto «oltre agli
     attraversamenti mi puoi descrivere, se c'è un parco sulla destra, il
     benzinaio sulla sinistra» e si è sentito elencare solo i monumenti. */
  function diciIntorno() {
    var s = posizione.leggi();
    var pezzi = [];
    if (s.pronto) {
      scena.dimenticaTutto();
      var d = scena.descrivi({ qui: { lat: s.lat, lon: s.lon }, direzione: s.direzione,
                               direzioneBuona: s.direzioneBuona, strada: ultimaVia, mappa: SERVIZI });
      if (d) pezzi.push(d.testo);
    }
    var lista = vicini().filter(function (o) { return o.p.k; }).slice(0, 3);
    if (lista.length) {
      pezzi.push(lista.map(function (o) { return o.p.n + ', ' + versoParole(o); }).join('. ') + '.');
    }
    if (!pezzi.length) { voce.parla('Qui intorno non ho niente da dirti.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    dillo({ tipo: 'elenco', testo: pezzi.join(' '), livello: 'guida' });
  }

  /* ---------- leggere i cartelli ----------
     «E se si usassero degli occhiali con la fotocamera?» (Vince). Per
     leggere non servono: la fotocamera ce l'ha il telefono, e il
     riconoscimento del testo sta dentro iOS. Qui si chiede lo scatto al
     guscio e si dice quello che ha letto. Le regole stanno in
     parti/lettura.js (18 prove). */
  function leggiIlCartello() {
    if (!window.urbeaLeggi) {
      /* DUE SITUAZIONI, DUE FRASI. Nel browser la fotocamera non si apre:
         non si promette una cosa che non si può fare, e non si resta
         zitti. Ma DENTRO L'APP la stessa frase — «mi serve l'app
         installata sul telefono» — è falsa e non lascia niente da fare: è
         il caso del guscio Android, dove la lettura non c'è ancora.
         Che si sia in un guscio lo dice urbeaHaPosizione, che è l'unica
         cosa che tutt'e due i gusci mettono sempre. */
      var nelGuscio = !!window.urbeaHaPosizione;
      diario('LEGGO: niente porta urbeaLeggi (' + (nelGuscio ? 'guscio senza lettura' : 'non siamo nel guscio') + ')');
      diciLaLettura(nelGuscio ? lettura.nonSaLeggere() : lettura.senzaGuscio());
      return;
    }
    diario('LEGGO: chiedo lo scatto');
    /* si dice subito che sta guardando: per chi non vede il silenzio e
       l'app rotta sono la stessa cosa, e lo scatto può volere un secondo. */
    voce.parla(lettura.aspetta().testo, { livello: voce.GUIDA, ancheSeUguale: true });
    mostra({ titolo: 'Leggo', dove: '', gradino: '',
             testo: 'Tieni il telefono fermo verso quello che vuoi leggere.', attesa: true });
    try { window.urbeaLeggi(); }
    catch (e) { diario('LEGGO: la porta non risponde'); diciLaLettura(lettura.senzaGuscio()); }
  }

  /* diciLaLettura(): si dice SEMPRE, anche se è la stessa frase di prima —
     l'ha chiesta la persona, e due cartelli identici esistono. */
  function diciLaLettura(d) {
    if (!d) return;
    dilloSubito(d);
    if (d.quante) {
      /* ALL'ULTIMA RIGA NON SI OFFRE LA PROSSIMA. Provandola nel browser lo
         schermo diceva «dimmi ancora per la prossima» sulla riga tre di
         tre: chi legge lo schermo — chi accompagna — ci casca. */
      var ultima = ((d.quale || 0) + 1) >= d.quante;
      mostra({ gradino: 'Riga ' + ((d.quale || 0) + 1) + ' di ' + d.quante +
                        (ultima ? '. Era l\'ultima.' : '. Dimmi «ancora» per la prossima.') });
    }
  }

  /* la porta che il guscio richiama con le righe lette. Nel quaderno resta
     cosa ha letto e quanto ci ha messo: «non ha letto» e «ha letto una cosa
     sbagliata» non devono essere la stessa riga di diario. */
  window.urbeaLetto = function (righe, ms, guaio) {
    var grezze = (righe && righe.length) || 0;
    var d = lettura.risposta(righe || [], guaio || null);
    diario('LETTO: ' + grezze + ' righe grezze in ' + (ms === undefined ? '?' : ms) + ' ms → ' +
           (guaio ? ('guaio ' + guaio) : (lettura.tutte().join(' | ') || 'niente di leggibile')));
    diciLaLettura(d);
  };

  /* ---------- l'ascolto ---------- */
  var ascolto = null, ascoltoVoluto = false, micChiuso = false;
  var ascoltoItaliano = true;
  var LINGUA_ASCOLTO = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', es: 'es-ES', nl: 'nl-NL',
                         pl: 'pl-PL', cs: 'cs-CZ', zh: 'zh-CN', ro: 'ro-RO', pt: 'pt-PT',
                         da: 'da-DK', hu: 'hu-HU', sv: 'sv-SE', ja: 'ja-JP', ru: 'ru-RU',
                         ko: 'ko-KR', nb: 'nb-NO', fi: 'fi-FI', el: 'el-GR', ar: 'ar-SA' };
  function laLinguaDellAscolto() {
    var q = lingua.quale();
    var sua = LINGUA_ASCOLTO[q];
    if (!sua) return 'it-IT';
    ascoltoItaliano = !ascoltoItaliano;
    var scelta = ascoltoItaliano ? 'it-IT' : sua;
    diario('ASCOLTO: ' + scelta);
    return scelta;
  }
  function apriAscolto() {
    micChiuso = false;
    /* al guscio si dice in che lingua ascoltare: lui ha un
       riconoscitore solo, e la lingua gliela cambiamo noi a ogni giro. */
    if (window.urbeaAscolta) { try { window.urbeaAscolta(laLinguaDellAscolto()); } catch (e) {} return; }
    var R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R || ascolto) return;
    try {
      ascolto = new R();
      /* SI ASCOLTA IN DUE LINGUE, A TURNO — 28/10/2026.
         Un riconoscitore ha una lingua sola, e il turista deve poter
         dire sia «portami a casa» sia «bring mich nach Hause». Ma
         l'ascolto si richiude dopo ogni frase e si riapre da se': a
         ogni riapertura si cambia lingua. Una frase su due, quindi, e
         quella giusta — e con tre ipotesi per volta ne resta fuori
         poco. In italiano non cambia niente: si resta sempre su it-IT. */
      ascolto.lang = laLinguaDellAscolto();
      ascolto.continuous = true; ascolto.interimResults = false;
      /* TRE IPOTESI, NON UNA — 28/10/2026
         Il riconoscitore ne ha sempre piu' d'una in mano, ma di suo ne
         consegna una sola: se quella e' sbagliata, il comando e' perso.
         E' il difetto della chiusura a voce, quello che Vince ha visto
         «le altre volte»: lui diceva «Yourbea, fermati» e arrivava
         «Ok Urbe fermati», oppure «Curve affermati». La seconda o la
         terza ipotesi erano quelle buone, e le buttavamo via.
         Tre e non dieci: piu' giu' le ipotesi diventano fantasiose, e
         una frase qualunque finirebbe per somigliare a un comando. */
      ascolto.maxAlternatives = 3;
      ascolto.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          var ipotesi = [];
          for (var j = 0; j < e.results[i].length && j < 3; j++) {
            if (e.results[i][j] && e.results[i][j].transcript) ipotesi.push(e.results[i][j].transcript);
          }
          comandoFraLeIpotesi(ipotesi);
        }
      };
      ascolto.onend = function () { ascolto = null; if (ascoltoVoluto && !micChiuso) apriAscolto(); };
      ascolto.onerror = function (ev) { if (ev.error === 'not-allowed') ascoltoVoluto = false; };
      ascoltoVoluto = true;
      ascolto.start();
    } catch (e) { ascolto = null; }
  }
  function chiudiAscolto() {
    micChiuso = true;
    if (window.urbeaChiudiAscolto) { try { window.urbeaChiudiAscolto(); } catch (e) {} return; }
    if (ascolto) { try { ascolto.abort ? ascolto.abort() : ascolto.stop(); } catch (e) {} ascolto = null; }
  }
  /* UN COMANDO DELL'UTENTE NON SI BUTTA MAI, nemmeno se l'app sta parlando:
     chi parla sopra la guida ha ragione, ed e' il modo naturale di usarla.
     (Nella vecchia app questo scarto faceva sembrare l'app sorda: «portami a
     via Gioberti» detto mentre diceva la via non faceva niente.)
     L'eco della propria voce non arriva qui, perche' il microfono e' chiuso
     mentre l'app parla; e se arriva, il diario lo scrive. */
  /* ---------- «UN NON VEDENTE NON DEVE SENTIRSI SOLO» ----------
     Parole di Vince, 16/10, e sono la regola che tiene insieme tutte le
     altre. Due silenzi la rompevano:

     1. PARLARE ALL'APP E NON RICEVERE NIENTE. I comandi che non si
        capiscono venivano ignorati di proposito — il microfono sta aperto
        tutto il giorno e sente conversazioni intere, e rispondere a tutto
        sarebbe peggio. Ma se uno si rivolge PROPRIO a lei e lei tace, è
        come essere lasciati a metà discorso. Allora: se la frase sembra
        rivolta all'app — la chiama per nome, o è corta e comincia con un
        verbo — si risponde che non si è capito. Altrimenti, silenzio.
     2. NON SENTIRLA PIÙ PER MINUTI. Chi non vede non può controllare lo
        schermo per sapere se funziona ancora. */
  function sembraRivoltoANoi(t) {
    if (/\b(?:urbea|yourbea|urbe|erbe|rube)\b/.test(t)) return true;
    var parole = t.split(' ');
    if (parole.length > 14) return false;                // un discorso, non una domanda
    /* PRIMA come comincia, poi quanto è lunga. Al contrario — come l'avevo
       scritta — «dimmi una cosa a caso che non esiste» veniva buttata per
       via delle otto parole, senza nemmeno guardare che cominciava con
       «dimmi»: e uno che chiede qualcosa resta senza risposta. */
    return /^(?:dimmi|dammi|fammi|portami|leggi|cerca|trova|cosa|dove|quanto|quanti|chi |come|quando|puoi|mi |ti |che )/.test(t);
  }

  /* ---------- «CREA PERCORSO» NON E' UN NOME DI PERSONA ----------
     Trovato al banco il 21/10, e non era un difetto nuovo: appena entrato
     l'app chiede «come ti chiami?», e lì accettava come nome QUALUNQUE
     cosa di una o due parole di sole lettere. Ho detto «crea percorso» e
     ho sentito «Piacere, Crea Percorso» — e da quel momento ogni comando
     finiva nella domanda sbagliata. «Dove sono», «ho finito», «portami
     casa»: tutti nomi, per lei.
     Chi non vede apre l'app e comincia a parlare: non aspetta il turno. */
  function unComando(t) {
    var n = normalizza(t);
    if (!n) return false;
    if (miei.dallaVoce(n)) return true;
    if (passeggiata.dallaVoce(n)) return true;
    for (var g in PAROLE) {
      if (!Object.prototype.hasOwnProperty.call(PAROLE, g)) continue;
      for (var i = 0; i < PAROLE[g].length; i++) if (n.indexOf(PAROLE[g][i]) >= 0) return true;
    }
    return /^(?:crea|registra|segna|impara|memorizza|manda|invia|condividi|spedisci|portami|porta|dimmi|dammi|fammi|leggi|cerca|trova|apri|chiudi|accendi|spegni|chiama|avvisa|aiuto|ferma|vai|torna|compra|ripristina|abbonamento|si|no|ok)\b/.test(n);
  }

  /* il guscio passa UNA frase (com'era prima) oppure l'elenco delle sue
     ipotesi: tutt'e due vanno bene, cosi' un'app vecchia e una nuova
     parlano con la stessa pagina. */
  window.urbeaComando = function (testo) {
    if (voce.staParlando()) diario('comando mentre parlavo: lo eseguo comunque');
    if (Array.isArray(testo)) { comandoFraLeIpotesi(testo); return; }
    comando(testo || '');
  };

  /* ---------- la porta e i tasti ---------- */
  function entra(quale) {
    modo = quale;
    document.body.dataset.modo = (quale === 'cultura' ? 'turismo' : 'utilita');
    el('porta').hidden = true;
    try { localStorage.setItem('yourbea2-modo', quale); } catch (e) {}
    acceso = true;
    el('avvia').textContent = 'Ferma';
    diario('ENTRATO in ' + (quale === 'cultura' ? 'Turismo' : 'Utilità'));
    posizione.comincia();
    apriAscolto();
    /* L'APERTURA È UNA DOMANDA, NON UN ELENCO DI FUNZIONI.
       Parole di Vince, 16/10: «per i non vedenti, secondo me, una voce che
       dice: ciao Vincenzo, cosa vuoi che facciamo? Devi andare da qualche
       parte? Ti illustro in modalità libera cosa c'è intorno? Ti cerco un
       negozio?… è come personalizzare, fa compagnia».
       Chi non vede non ha una schermata da guardare per sapere cosa può
       chiedere: o glielo si dice, o non esiste. E si chiama per nome, se
       ce l'ha detto — cambia tutto fra un apparecchio e qualcuno che ti
       accompagna. */
    /* IL NOME SI CHIEDE, NON SI ASPETTA. Il nome c'era già — serve al
       messaggio d'aiuto — ma si poteva darlo solo dicendo «io sono Vince»,
       e nessuno indovina una frase che non gli è stata detta. Così non lo
       aveva nessuno, e la voce diceva «Ciao.» a tutti. Lo si chiede la
       prima volta e basta: dalla seconda non si chiede più niente. */
    if (!ioSonoIo && !nienteNome) { chiediIlNome(quale); return; }
    apertura(quale);
  }

  /* chiediIlNome(): una domanda sola, e si può non rispondere. */
  function chiediIlNome(quale) {
    inAttesaDi = { da: Date.now(), cosa: 'nome', poi: quale };
    /* e se non risponde? Non si resta fermi su una domanda: dopo mezzo
       minuto si tira avanti, e il nome si potra' dare quando vuole. */
    setTimeout(function () {
      if (inAttesaDi && inAttesaDi.cosa === 'nome') {
        inAttesaDi = null;
        diario('NOME: nessuna risposta, vado avanti');
        apertura(quale);
      }
    }, 26000);
    voce.parla('Ciao. Prima di cominciare: come ti chiami? Dimmi solo il tuo nome. ' +
               'Se preferisci non dirmelo, dì: lascia perdere.',
               { livello: voce.GUIDA, ancheSeUguale: true });
    mostra({ titolo: 'Come ti chiami?', testo: 'Dillo a voce, oppure dì «lascia perdere».', dove: '—', gradino: '' });
  }

  function apertura(quale) {
    /* IL SALUTO È VARIO, IL RESTO NO. «Solo devi creare un eloquio più
       vario» (Vince, 16/10): cambia il modo di salutare — l'ora del giorno,
       il nome, il «come stai» — e non cambia una parola di quello che l'app
       dice dopo, che è l'elenco di cosa può fare. Chi riapre dopo meno di
       sei ore non è appena arrivato: si dice «bentornato». */
    var tornato = false;
    try {
      var prima = Number(localStorage.getItem('yourbea2-ultima-apertura') || 0);
      tornato = prima > 0 && (Date.now() - prima) < 6 * 3600 * 1000;
      localStorage.setItem('yourbea2-ultima-apertura', String(Date.now()));
    } catch (e) {}
    var sal = modi.saluto({ tornato: tornato });
    voce.parla(sal.testo + ' ' + (quale === 'cultura'
      ? 'Ti racconto quello che hai intorno: camminando ti dico cosa passi, e se ti fermi dieci secondi te lo racconto. Vuoi che cominciamo, o preferisci una passeggiata a tappe?'
      : 'Cosa facciamo? Devi andare da qualche parte? Ti illustro cosa c\'è intorno? O ti cerco un negozio?'),
      { livello: voce.GUIDA });
    /* REGOLA C di parti/modi.js: se ha chiesto come sta, si sta a sentire.
       Una domanda a cui l'app non reagisce è peggio del silenzio. */
    if (sal.chiede) inAttesaDi = { da: Date.now(), cosa: 'come-stai' };
    mostra({ titolo: 'Ci siamo', testo: 'Cerco la posizione…', attesa: true, dove: '—', gradino: '' });
  }

  el('scelta-utilita').addEventListener('click', function () { entra('servizi'); });
  el('scelta-turismo').addEventListener('click', function () { entra('cultura'); });
  el('avvia').addEventListener('click', function () {
    acceso = !acceso;
    this.textContent = acceso ? 'Ferma' : 'Avvia';
    if (acceso) { posizione.comincia(); apriAscolto(); }
    else {
      voce.ferma(); chiudiAscolto(); ascoltoVoluto = false;
      /* CHI NON VEDE SPEGNE L'APP E RESTA IN STRADA. Un «a dopo» dice che
         si è fermata lei, su richiesta, e non che è caduta: senza una
         parola, il silenzio dopo un tasto è indistinguibile da un guasto. */
      voce.parla(modi.congedo(), { livello: voce.GUIDA, ancheSeUguale: true });
    }
    diario(acceso ? 'ACCESO' : 'SPENTO');
  });
  el('parla').addEventListener('click', function () {
    voce.ferma();                       // chi preme vuole parlare adesso
    apriAscolto();
    this.classList.add('ascolta');
    var b = this;
    setTimeout(function () { b.classList.remove('ascolta'); }, 6000);
  });
  /* SCRITTO O DETTO, È LO STESSO COMANDO. «In turismo si può scrivere o
     parlare» (Vince, 23/10). Passa da comando(), la stessa porta del
     microfono: se domani nasce un comando nuovo, nasce per tutt'e due —
     due elenchi separati si scollano, e quello scritto resta indietro.
     E come quando si preme il microfono, quello che l'app sta dicendo si
     ferma: chi scrive vuole una risposta adesso, non in coda. */
  if (el('scrivi')) {
    el('scrivi').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var t = this.value.trim();
      this.value = '';
      if (!t) return;
      voce.ferma();
      /* QUELLO CHE SI SCRIVE È SEMPRE PER NOI. comando() tace quando la
         frase non sembra rivolta all'app — serve a non rispondere a chi
         parla con un amico accanto. Ma una frase scritta nel campo non
         può essere di nessun altro: se non si capisce, si dice. */
      if (!comando(t)) {
        voce.parla('Questa non l\'ho capita. Se vuoi, dimmi «comandi» e ti dico cosa so fare.',
                   { livello: voce.GUIDA, ancheSeUguale: true });
      }
    });
  }
  el('sos').addEventListener('click', function () { dilloSubito(emergenza.scelte()); });
  function apriCassetto(aperto) {
    el('cassetto').classList.toggle('aperto', aperto !== false);
    el('altro').setAttribute('aria-expanded', aperto !== false ? 'true' : 'false');
  }
  el('altro').addEventListener('click', function () {
    var aperto = el('cassetto').classList.toggle('aperto');
    this.setAttribute('aria-expanded', aperto ? 'true' : 'false');
  });

  /* il tasto di casa, e il posto dove si scrive l'indirizzo */
  el('vai-a-casa').addEventListener('click', aCasa);
  el('leggi-cartello').addEventListener('click', leggiIlCartello);
  el('avvisa-contatto').addEventListener('click', function () { avvisaOra('chiamata'); });
  el('messaggio-contatto').addEventListener('click', function () { avvisaOra('messaggio'); });
  scriviTastoAvvisa();
  el('dove-abito').addEventListener('click', function () {
    var r = el('riga-casa');
    r.hidden = !r.hidden;
    if (!r.hidden) {
      el('casa-indirizzo').value = casa || '';
      voce.parla('Scrivi la via, il numero e la città di casa tua, poi salva.', { livello: voce.GUIDA, ancheSeUguale: true });
    }
  });
  el('casa-salva').addEventListener('click', function () {
    var v = el('casa-indirizzo').value.trim();
    if (!v) { voce.parla('Mi serve l\'indirizzo: via, numero e città.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    casa = v;
    try { localStorage.setItem('yourbea2-casa', casa); } catch (e) {}
    el('riga-casa').hidden = true;
    voce.parla('Casa tua è ' + casa + '. Da adesso basta dire «portami a casa».', { livello: voce.GUIDA, ancheSeUguale: true });
  });
  function scriviTastoMusica() {
    try { el('musica').textContent = musica.eAccesa() ? 'Musica: accesa' : 'Musica: spenta'; } catch (e) {}
  }
  function cambiaMusica(accendere) {
    var ora = accendere === undefined ? !musica.eAccesa() : !!accendere;
    musica.accendi(ora);
    try { localStorage.setItem('yourbea2-musica', ora ? 'si' : 'no'); } catch (e) {}
    scriviTastoMusica();
    voce.parla(ora
      ? (modo === 'cultura' ? 'Musica accesa, piano, sotto il racconto.'
                            : 'Musica accesa: si sentirà in Turismo. In Utilità resta muta.')
      : 'Musica spenta.', { livello: voce.GUIDA, ancheSeUguale: true });
  }
  el('musica').addEventListener('click', function () { cambiaMusica(); });

  /* cosaSentire(): l'interruttore fra «tutto» e «solo i monumenti». Si dice
     cosa cambia, non «fatto»: chi non vede non ha una spunta da guardare. */
  function cosaSentire(solo) {
    soloMonumenti = !!solo;
    try { localStorage.setItem('yourbea2-solo-monumenti', soloMonumenti ? 'si' : 'no'); } catch (e) {}
    scriviTastoCosaSentire();
    voce.parla(soloMonumenti
      ? 'Da adesso ti dico solo i monumenti e i luoghi. Negozi, incroci e attraversamenti li lascio stare. Le strade e gli avvisi te li dico sempre. Per tornare a sentire tutto, dimmi: dimmi tutto.'
      : 'Da adesso ti dico tutto quello che c\'è: luoghi, negozi, incroci e attraversamenti.',
      { livello: voce.GUIDA, ancheSeUguale: true });
  }
  function scriviTastoCosaSentire() {
    try {
      el('cosa-sentire').textContent = soloMonumenti ? 'Dico: solo monumenti' : 'Dico: tutto';
    } catch (e) {}
  }
  el('cosa-sentire').addEventListener('click', function () { cosaSentire(!soloMonumenti); });

  /* IL TASTO DEI PERCORSI TUOI. La voce li sapeva fare da sempre, ma
     nessuno poteva scoprirli: non erano scritti da nessuna parte.
     Il tasto fa esattamente quello che fa la voce — stessa strada, stesso
     codice provato — e cambia faccia mentre registri, cosi' si vede a
     colpo d'occhio che l'app sta imparando la strada. */
  function scriviTastoPercorso() {
    try {
      el('percorso').textContent = miei.staRegistrando() ? 'Ho finito il percorso' : 'Crea un percorso';
    } catch (e) {}
  }
  el('percorso').addEventListener('click', function () {
    comando(miei.staRegistrando() ? 'ho finito' : 'crea percorso');
    scriviTastoPercorso();
  });
  scriviTastoPercorso();

  /* IL TASTO DELLE PASSEGGIATE. «Nella modalita' turismo deve essere
     agevole sceglierli» (Vince, 23/10). I 137 giri c'erano gia' e si
     potevano avere solo sapendo la parola: «passeggiate». E' lo stesso
     difetto di «crea percorso» — una funzione che esiste solo come
     formula da sapere a memoria non esiste per chi non vede.
     Il tasto dice l'elenco e poi si sceglie a voce, «comincia la
     prima», oppure si ripreme: il secondo tocco comincia la prima,
     perche' chi ha premuto una volta ha gia' detto che vuole andare. */
  var elencoDetto = 0;
  function scriviTastoPasseggiate() {
    try {
      var t = el('passeggiate');
      if (!t) return;
      t.hidden = (modo !== 'cultura');
      t.textContent = passeggiata.inCorso() ? 'Ferma la passeggiata'
        : (Date.now() - elencoDetto < 30000 ? 'Comincia la prima' : 'Passeggiate qui');
    } catch (e) {}
  }
  if (el('passeggiate')) {
    el('passeggiate').addEventListener('click', function () {
      if (passeggiata.inCorso()) { comando('ferma'); elencoDetto = 0; }
      else if (Date.now() - elencoDetto < 30000) { comando('comincia la prima'); elencoDetto = 0; }
      else { comando('passeggiate'); elencoDetto = Date.now(); }
      scriviTastoPasseggiate();
    });
    setInterval(scriviTastoPasseggiate, 1500);
    scriviTastoPasseggiate();
  }
  setInterval(scriviTastoPercorso, 2000);
  scriviTastoCosaSentire();
  scriviTastoMusica();

  el('testo-piu').addEventListener('click', function () {
    var ora = document.body.dataset.testo;
    var prossimo = ora === 'normale' ? 'grande' : (ora === 'grande' ? 'enorme' : 'normale');
    document.body.dataset.testo = prossimo;
    try { localStorage.setItem('yourbea2-testo', prossimo); } catch (e) {}
    voce.parla('Testo ' + prossimo + '.', { livello: voce.GUIDA, ancheSeUguale: true });
  });
  el('cambia-modo').addEventListener('click', function () {
    el('porta').hidden = false; acceso = false; voce.ferma();
  });
  el('dimmi-dove').addEventListener('click', diciDove);
  el('chi-chiamare').addEventListener('click', function () {
    var r = el('riga-contatto');
    r.hidden = !r.hidden;
    if (!r.hidden && contatto) { el('contatto-nome').value = contatto.nome || ''; el('contatto-tel').value = contatto.telefono || ''; }
    if (!r.hidden) voce.parla('Scrivi il nome e il numero di chi deve venire ad aiutarti, poi salva.', { livello: voce.GUIDA, ancheSeUguale: true });
  });
  el('contatto-salva').addEventListener('click', function () {
    var nome = el('contatto-nome').value.trim(), tel = el('contatto-tel').value.trim();
    if (!nome || !tel) { voce.parla('Mi servono il nome e il numero.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    contatto = { nome: nome, telefono: tel };
    try { localStorage.setItem('yourbea2-contatto', JSON.stringify(contatto)); } catch (e) {}
    emergenza.conContatto(contatto);
    scriviTastoAvvisa();
    el('riga-contatto').hidden = true;
    voce.parla('Ho registrato ' + nome + '. In emergenza posso avvisarlo e dirgli dove sei.', { livello: voce.GUIDA, ancheSeUguale: true });
  });
  el('manda-diario').addEventListener('click', function () {
    var s = posizione.leggi();
    var capo = 'Yourbea nuova — diario\n' + (navigator.userAgent || '') +
               '\nmodo: ' + modo + ' | posizione: ' + (s.pronto ? s.lat.toFixed(5) + ',' + s.lon.toFixed(5) : 'no') + '\n\n';
    var testo = capo + DIARIO.join('\n') +
                '\n\n===== TRACCIA (serve a rifare la camminata) =====\n' +
                window.YB.traccia();
    if (navigator.share) { navigator.share({ title: 'Diario di Yourbea', text: testo }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(testo).then(function () {
      voce.parla('Il diario è negli appunti.', { livello: voce.GUIDA, ancheSeUguale: true });
    });
  });

  /* ---------- i dati, e si parte ---------- */
  try {
    var t = localStorage.getItem('yourbea2-testo');
    if (t) document.body.dataset.testo = t;
  } catch (e) {}
  /* il ?v= dei dati si legge dal proprio tag <script>, cosi' non c'e' un
     secondo posto dove ricordarsi di alzarlo a mano. Senza, la cassaforte
     terrebbe i luoghi di ieri mentre tutto il resto e' nuovo: lo stesso
     difetto che il 15/10 ha fatto perdere due giorni, solo sui dati. */
  var VER = ((document.querySelector('script[src^="app.js"]') || {}).src || '').replace(/^.*(\?v=\d+).*$/, '$1');
  if (VER.indexOf('?v=') !== 0) VER = '';
  fetch('dati/luoghi.json' + VER).then(function (r) { return r.json(); }).then(function (l) {
    LUOGHI = l;
    diario('dati: ' + LUOGHI.length + ' luoghi, ' + LUOGHI.filter(function (x) { return x.a; }).length + ' approfondimenti');
    stato('pronta · <b>' + LUOGHI.length + '</b> luoghi');
    /* le passeggiate DOPO i luoghi, non in parallelo: le tappe sono luoghi, e
       senza i luoghi ogni tappa resterebbe muta e la passeggiata si
       butterebbe da sé. Se le passeggiate non arrivano, l'app funziona
       comunque: è il racconto che porta il peso. */
    return fetch('dati/passeggiate.json' + VER).then(function (r) { return r.json(); }).then(function (pp) {
      var quante = passeggiata.conDati(pp, LUOGHI);
      diario('passeggiate: ' + quante + ' giri, ' +
             pp.reduce(function (n, x) { return n + (x.t ? x.t.length : 0); }, 0) + ' tappe');
    }).catch(function () { diario('PASSEGGIATE NON CARICATE'); });
  }).catch(function () {
    diario('DATI NON CARICATI');
    stato('dati non caricati', true);
  });

  /* ============================================================
     ENTRARE NELL'APP PARLANDO
     «Fai in modo che la app si possa attivare vocalmente» (Vince, 21/10).
     Alla porta i comandi «turismo» e «utilità» c'erano gia' — e la pagina
     li prometteva per scritto, «puoi anche dirlo» — ma il microfono alla
     porta non lo apriva nessuno: apriAscolto() veniva chiamato DOPO
     entra(), cioe' dopo che uno aveva premuto. Chi non vede non premeva
     mai, e la promessa scritta sulla pagina era muta.

     DUE COSE CHE NON POSSIAMO FARE, e vanno dette:
     - APRIRE L'APP CHIUSA non lo puo' fare una pagina. Lo fa il sistema:
       su Android, installata dal Play Store, «Ok Google, apri Yourbea»;
       su iPhone serve una scorciatoia di Siri nel guscio.
     - IL MICROFONO, la prima volta, lo apre il telefono solo dopo un
       tocco. Allora: si prova subito (se il permesso c'e' gia', come
       nell'app installata, funziona), e se non va basta sfiorare lo
       schermo in qualunque punto — non c'e' un tasto da trovare.
     ============================================================ */
  (function allaPorta() {
    if (el('porta').hidden) return;
    var giaFatto = false;
    function apri(perche) {
      if (giaFatto) return;
      giaFatto = true;
      diario('PORTA: apro il microfono (' + perche + ')');
      apriAscolto();
      /* la frase solo se NON c'e' un lettore di schermo: con VoiceOver o
         TalkBack acceso la pagina viene gia' letta, e due voci sopra la
         stessa cosa e' quello che Dario ha chiamato «troppo frenetico». */
      if (!voiceOver) {
        voce.parla('Dimmi: utilità, oppure turismo.', { livello: voce.GUIDA, ancheSeUguale: true });
      }
    }
    setTimeout(function () { apri('da sola'); }, 1200);
    /* la rete di sicurezza: il primo tocco, dovunque sia */
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (q) {
      document.addEventListener(q, function () { apri('col tocco'); }, { once: true, passive: true });
    });
  })();

  window.YB.diagnosi = function () {
    var s = posizione.leggi();
    return {
      versione: 'nuova 0.1', modo: modo, acceso: acceso,
      posizione: s.pronto ? (s.lat.toFixed(5) + ',' + s.lon.toFixed(5)) : s.comeVa,
      fermoDa: Math.round(s.fermoDa / 1000) + ' s', direzioneBuona: s.direzioneBuona,
      luoghi: LUOGHI.length, vicini: vicini().slice(0, 5).map(function (o) { return o.p.n + ' ' + Math.round(o.m) + 'm'; }),
      staParlando: voce.staParlando(), inCoda: voce.inCoda().length,
      inCorso: racconto.inCorso() ? racconto.inCorso().n : null,
      saLeggere: !!window.urbeaLeggi, lettura: lettura.aChePunto(),
      passeggiate: passeggiata.quante(),
      passeggiata: passeggiata.inCorso() ? passeggiata.inCorso().n : null,
      tappa: passeggiata.tappa() ? (passeggiata.tappa().n + ' — ' + JSON.stringify(passeggiata.aChePunto())) : null
    };
  };
})();
