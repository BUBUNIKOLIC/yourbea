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

  /* ---------- la voce ---------- */
  /* la pronuncia: gli accenti scritti, che la voce rispetta. Sta qui,
     all'ultimo momento, perché il testo che si vede sullo schermo resti
     scritto come si scrive. */
  var pronuncia = Pronuncia();
  var sintesi = {
    parla: function (t) {
      try {
        if (!window.speechSynthesis) return;
        t = pronuncia.sistema(t);
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(t);
        u.lang = 'it-IT'; u.rate = 0.98;
        var voci = window.speechSynthesis.getVoices().filter(function (v) { return /^it/i.test(v.lang.replace('_', '-')); });
        // la stessa voce delle clip, se c'è: due voci diverse si sentono
        for (var i = 0; i < voci.length; i++) if (/alice/i.test(voci[i].name || '')) { u.voice = voci[i]; break; }
        if (!u.voice && voci.length) u.voice = voci[0];
        window.speechSynthesis.speak(u);
      } catch (e) {}
    },
    taci: function () { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }
  };
  var microfono = {
    chiudi: function () { chiudiAscolto(); },
    apri: function () { if (acceso) apriAscolto(); }
  };
  var voce = MotoreVoce({ sintesi: sintesi, diario: diario, microfono: microfono,
                          cartellaClip: '../voce/clip/it/' });

  /* ---------- il racconto, la posizione, le fonti ---------- */
  var racconto = Racconto({});
  var posizione = Posizione({
    geo: navigator.geolocation || null,
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
  window.urbeaPosizione = function (lat, lon, prec) { posizione.dalGuscio(lat, lon, prec); };

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
  function alLettore(t) { try { el('muto').textContent = t; } catch (e) {} }

  /* ---------- quello che c'è intorno, pronto per il racconto ---------- */
  var SERVIZI = { punti: [], aree: [], alberi: [] };
  function vicini() {
    var s = posizione.leggi();
    if (!s.pronto) return [];
    var lista = [];
    LUOGHI.forEach(function (p) {
      if (Math.abs(p.lat - s.lat) > 0.008 || Math.abs(p.lon - s.lon) > 0.008) return;
      var m = posizione.dist(s.lat, s.lon, p.lat, p.lon);
      if (m > 500) return;
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
  var scena = Scena({ dist: posizione.dist, verso: posizione.verso });
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

    /* i monumenti: stessi quadretti, altra cartella. Entrano fra i luoghi
       da raccontare, non fra i servizi. */
    voluti.filter(function (q) { return CULTURA[q] === undefined; }).forEach(function (q) {
      CULTURA[q] = null;
      fetch('dati/cultura/' + q + '.json' + VER).then(function (r) {
        return r.ok ? r.json() : [];
      }).then(function (roba) {
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
  function rifaiNostri(voluti) {
    var tutti = [];
    voluti.forEach(function (q) {
      if (QUADRETTI[q] && QUADRETTI[q].length) tutti = tutti.concat(QUADRETTI[q]);
    });
    NOSTRI = tutti;
  }
  function raccontaScena() {
    var s = posizione.leggi();
    if (!s.pronto || !acceso) return;
    /* LA SCENA E' DI UTILITA'. Piazze, alberi, attraversamenti e negozi
       servono a orientarsi e a sbrigare le cose. In Turismo no: li si parla
       di arte, architettura e storia, e basta. Parole di Vince, il 15/10:
       «aspetta, questa e' utilita'; turismo informazioni artistiche,
       architettoniche e storiche». */
    if (modo !== 'servizi') return;
    var d = scena.descrivi({ qui: { lat: s.lat, lon: s.lon }, direzione: s.direzione,
                             direzioneBuona: s.direzioneBuona, strada: ultimaStrada, mappa: SERVIZI });
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
  var guida = Guida({ dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
                      verso: function (a, b, c, d) { return posizione.verso(a, b, c, d); },
                      diario: diario });

  /* la musica sotto il racconto: solo in Turismo e piano, con le regole in
     parti/musica.js (8 prove). Qui c'è solo l'elemento audio. */
  var musica = Musica({});
  try { musica.accendi(localStorage.getItem('yourbea2-musica') !== 'no'); } catch (e) {}
  var tappeto = null, tappetoQuale = '';
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
    tappeto.volume = d.volume;
    if (tappeto.paused) {
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
  function stradaERiepilogo() {
    var s = posizione.leggi();
    if (!acceso || !s.pronto || s.fermo || guida.meta()) return;
    if (!ultimaVia || !s.direzioneBuona) return;
    if (Date.now() - ultimoRiepilogo < 90000) return;
    ultimoRiepilogo = Date.now();

    var qui = { lat: s.lat, lon: s.lon };
    var pezzi = ['Stai percorrendo ' + ultimaVia + '.'];
    var inc = incroci.ilProssimo({ qui: qui, vie: SERVIZI.vie || [], strada: ultimaVia,
                                   direzione: s.direzione, direzioneBuona: true });
    if (inc) pezzi.push('Il prossimo incrocio è ' + inc.nome + ', ' + scena.passi(inc.metri) + '.');

    /* cosa trovi continuando dritto: la prima cosa con un nome davanti a
       te, che non sia quella che hai appena passato */
    var avanti = null, da = 1e9;
    (SERVIZI.punti || []).forEach(function (p) {
      if (!p.nome || !p.servizio) return;
      var d = posizione.dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d < 25 || d > 250 || d >= da) return;
      var rel = ((posizione.verso(qui.lat, qui.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180;
      if (Math.abs(rel) > 50) return;
      da = d; avanti = p;
    });
    if (avanti) pezzi.push('Se continui dritto trovi ' + avanti.nome + ', ' + scena.passi(da) + '.');
    if (pezzi.length < 2) return;        // «stai percorrendo» da solo non serve
    dillo({ tipo: 'strada', livello: 'cenno', testo: pezzi.join(' ') });
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
            testo: ultimaStrada ? ('Sei sempre in ' + ultimaStrada + '. Ti sto seguendo.')
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
  function dalDettato(t) {
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
      if (!secco) {
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
      inAttesaDi = { cosa: 'nome', poi: poi, giaChiesto: true };
      voce.parla('Non ho capito il nome. Dimmelo di nuovo, da solo, oppure dì: lascia perdere.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (inAttesaDi && inAttesaDi.cosa === 'nome') inAttesaDi = null;   // è arrivato un comando: vince lui

    // sto aspettando il numero, o un sì
    if (inAttesaDi && r && r.cosa === 'numero' && inAttesaDi.cosa === 'numero') {
      inAttesaDi = { cosa: 'conferma', nome: inAttesaDi.nome, numero: r.numero };
      voce.parla('Ho sentito: ' + dettatura.leggiCifre(r.numero) + '. È giusto? Dì sì, oppure ripeti il numero.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (inAttesaDi && inAttesaDi.cosa === 'conferma' && r && (r.cosa === 'si' || r.cosa === 'no' || r.cosa === 'numero')) {
      if (r.cosa === 'numero') {
        inAttesaDi = { cosa: 'conferma', nome: inAttesaDi.nome, numero: r.numero };
        voce.parla('Allora: ' + dettatura.leggiCifre(r.numero) + '. È giusto?', { livello: voce.GUIDA, ancheSeUguale: true });
        return true;
      }
      if (r.cosa === 'no') {
        inAttesaDi = { cosa: 'numero', nome: inAttesaDi.nome };
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
      inAttesaDi = { cosa: 'conferma', nome: r.nome, numero: r.numero };
      voce.parla(r.nome + ', numero: ' + dettatura.leggiCifre(r.numero) + '. È giusto? Dì sì, oppure ripeti il numero.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    if (r.cosa === 'contatto-senza-numero') {
      if (chiediAllaRubrica(r.nome, 'niente')) return true;
      inAttesaDi = { cosa: 'numero', nome: r.nome };
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
  var cercatoInRubrica = null;      // { nome, poi: 'chiamata' | 'messaggio' }

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
    inAttesaDi = { cosa: 'numero', nome: maiuscolaNome(chi) };
    voce.parla(guaio === 'niente-permesso'
      ? 'Non posso guardare la tua rubrica: se vuoi, dallo nelle impostazioni. Intanto dimmi il numero di ' + chi + ', una cifra per volta.'
      : 'In rubrica ' + chi + ' non lo trovo. Dimmi il suo numero, una cifra per volta.',
      { livello: voce.GUIDA, ancheSeUguale: true });
  };
  function maiuscolaNome(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }

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

  function dilloSubito(d) {
    if (!d) return;
    if (!hoLaParola) return;
    laStradaVienePrima(d);
    var liv = d.livello === 'emergenza' ? voce.EMERGENZA : (d.livello === 'guida' ? voce.GUIDA : voce.CENNO);
    voce.parla(d.testo, { livello: liv, ancheSeUguale: true });
    mostra({ titolo: titoloDi(d), testo: d.testo, gradino: '' });
    alLettore(d.testo);
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
    return el('cosa').textContent;
  }

  /* aCasa(): il tasto e la voce finiscono tutti e due qui.
     Se non sa dove abiti non si inventa niente e non lascia in silenzio:
     lo dice, e apre il posto dove scriverlo. */
  function aCasa() {
    /* chi veniva dalla vecchia ha casa come PUNTO, non come indirizzo: si
       va lì diritti, senza cercare niente. */
    if (!casa && casaPunto) {
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

    // 1. un luogo nostro col nome che somiglia
    var mio = null, dmin = Infinity;
    LUOGHI.forEach(function (p) {
      if (p.n.toLowerCase().indexOf(cerca) < 0) return;
      var d = posizione.dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d < dmin) { dmin = d; mio = p; }
    });
    if (mio) { partiVerso({ n: mio.n, lat: mio.lat, lon: mio.lon }, qui); return; }

    // 2. un servizio (farmacia, commissariato, fermata...)
    var tipo = ['farmacia', 'commissariato', 'pronto soccorso', 'fermata', 'supermercato', 'bagno', 'bancomat', 'ufficio postale', 'bar', 'ristorante']
      .find(function (x) { return cerca.indexOf(x) >= 0; });
    var cercatore = tipo ? intorno.cercaServizio(tipo, qui) : intorno.cercaIndirizzo(pulita, qui);
    cercatore.then(function (candidati) {
      var scelto = guida.scegli(candidati, parole, qui, tipo ? '' : pulita);
      if (!scelto) {
        voce.parla("Questo indirizzo non l'ho trovato.", { livello: voce.GUIDA, ancheSeUguale: true });
        return;
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

  function dillo(d) {
    if (!d) return;
    if (!hoLaParola) return;
    ultimaParola = Date.now();
    laStradaVienePrima(d);
    var liv = d.livello === 'guida' ? voce.GUIDA : (d.livello === 'emergenza' ? voce.EMERGENZA : voce.CENNO);
    /* LE PAROLE INTORNO. Solo cenni, scene e passaggi: modi.veste() lascia
       perdere da sé tutto il resto. I fatti e il loro ordine non cambiano,
       quindi le clip incise restano allineate — e la clip, se c'è, la dice
       per intero lei: l'attacco va solo sul testo della voce di sistema. */
    var detto = modi.veste(d.tipo, d.testo);
    var preso = voce.parla(detto, { clip: clipDi(d), livello: liv, uguale: d.testo });
    if (!preso) { diario('non detta: ' + String(detto).slice(0, 40)); return; }
    /* DOPO IL RACCONTO, DOVE SEI. «Quando ha finito il racconto ti dice:
       ora ti trovi qui» (Vince, 16/10). Dopo mezzo minuto di storia uno ha
       perso il filo di dove si trova — e chi non vede non può recuperarlo
       con un'occhiata. Si dice solo dopo le schede lunghe, non dopo i
       cenni, e solo se nel frattempo non è arrivato niente di più
       importante: se l'app sta già dicendo una svolta, questa si butta. */
    if (d.tipo === 'scheda' || d.tipo === 'cosa-vedere' || d.tipo === 'approfondimento') {
      var viaOra = ultimaStrada;
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
    alLettore(d.testo);
  }
  function gradinoScritto(d) {
    if (d.tipo === 'cenno') return 'Fermati dieci secondi e te lo racconto. Oppure dimmi «ancora».';
    if (d.tipo === 'scheda') return 'Dimmi «ancora» per sapere cosa guardare.';
    if (d.tipo === 'cosa-vedere') return 'Dimmi «ancora» per l\'approfondimento.';
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
  posizione.quando(function (cosa, s) {
    if (cosa === 'problema') {
      var dice = s.comeVa === 'negata'
        ? 'Non ho il permesso di sapere dove sei: dallo nelle impostazioni del telefono, se no non posso accompagnarti.'
        : 'Questo telefono non mi dà la posizione.';
      stato('posizione <b>' + s.comeVa + '</b>', true);
      mostra({ titolo: 'Non so dove sei', testo: dice, attesa: true, dove: '—', gradino: '' });
      /* se intanto la posizione arriva — dal guscio, o perché l'utente ha
         appena dato il permesso — questa frase non si dice più. */
      voce.parla(dice, { livello: voce.GUIDA, valida: function () { return !posizione.leggi().pronto; } });
      return;
    }
    if (!s.pronto) { stato('cerco la posizione…'); return; }
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
    var inViaggio = !!guida.meta();
    var pass = inViaggio ? null : passaggi.prossimo({ qui: { lat: s.lat, lon: s.lon }, punti: SERVIZI.punti || [],
                                   direzione: s.direzione, direzioneBuona: s.direzioneBuona,
                                   quando: Date.now() });
    if (pass) dillo(pass);
    if (!inViaggio && modo === 'servizi' && SERVIZI.vie && SERVIZI.vie.length) {
      var inc = incroci.quale({ qui: { lat: s.lat, lon: s.lon }, vie: SERVIZI.vie,
                                strada: ultimaStrada, direzione: s.direzione,
                                direzioneBuona: s.direzioneBuona });
      if (inc) dillo(inc);
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
        if (!viaOra || viaOra.toLowerCase() === (ultimaVia || '').toLowerCase()) return;
        var prima = ultimaVia;
        ultimaVia = viaOra;
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
    // e il racconto
    var d = racconto.prossimo({ qui: { lat: s.lat, lon: s.lon }, intorno: lista, modo: modo,
                                direzioneBuona: s.direzioneBuona,
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
    aiuto: ['aiuto', 'comandi', 'che posso dire']
  };
  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function comando(testo) {
    var t = normalizza(testo);
    if (!t) return false;
    diario('COMANDO: ' + t.slice(0, 50));
    /* ha(): o il nome di un gruppo di PAROLE, o le frasi scritte lì per lì —
       si usano tutt'e due gli stili qui sotto. Scritta che accettava solo i
       gruppi, `ha('portami a casa', ...)` cercava il gruppo «portami a casa»,
       non lo trovava e SCOPPIAVA: da lì in giù non funzionava più nessun
       comando parlato — né «ancora», né «avanti», né «dove sono». */
    function ha() {
      var quali = [].slice.call(arguments);
      return quali.some(function (k) {
        var frasi = PAROLE[k] || [k];
        return frasi.some(function (p) { return t.indexOf(p) >= 0; });
      });
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
    var dove0 = { via: ultimaStrada, lat: s0.lat, lon: s0.lon };
    var em = emergenza.comando(t, ultimaStrada ? dove0 : null);
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
    if (dalDettato(t)) return true;
    /* LEGGERE: prima di «portami a» e delle passeggiate, perché «leggi il
       cartello» non è un posto dove andare; e prima di «intorno», perché
       «che c'è scritto» contiene «che c'è» e finirebbe a elencare i
       monumenti invece di leggere il cartello che hai in mano. */
    if (lettura.inCorso() && ha('ancora')) { diciLaLettura(lettura.ancora()); return true; }
    if (ha('leggi')) { leggiIlCartello(); return true; }
    /* «portami a casa» PRIMA del «portami a» generico: se no cercherebbe
       un posto che si chiama «casa», e ce ne sono a decine. */
    if (ha('portami a casa', 'torniamo a casa', 'riportami a casa', 'andiamo a casa', 'voglio tornare a casa')) { aCasa(); return true; }
    var meta = guida.dalComando(t);
    if (meta) {
      if (/^(?:casa|casa mia|a casa)$/.test(meta.trim())) { aCasa(); return true; }
      portamiA(meta); return true;
    }
    if (ha('lascia perdere', 'annulla', 'non importa')) { dilloSubito(guida.lascia()); return true; }
    /* LE PASSEGGIATE. Viene dopo «portami a», perché «portami alla stazione»
       è una cosa e «facciamo una passeggiata» è un'altra, e prima di
       «ancora» e «avanti», che durante una passeggiata vogliono dire la
       tappa, non il luogo che ti capita accanto. */
    var pq = passeggiata.dallaVoce(t);
    if (pq) {
      var sp = posizione.leggi();
      if (!sp.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return true; }
      var dovesono = { lat: sp.lat, lon: sp.lon, direzione: sp.direzione, direzioneBuona: sp.direzioneBuona };
      if (pq.cosa === 'elenco') { dillo(passeggiata.elenco(dovesono)); return true; }
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
    if (ha('aiuto')) {
      voce.parla('Puoi dire: ancora. Avanti. Dove sono. Cosa c\'è qui intorno. Ferma. ' +
                 'Leggi, e ti leggo quello che la fotocamera ha davanti: un cartello, un citofono, il numero dell\'autobus. ' +
                 'Passeggiate, e ti dico i giri a tappe che ci sono qui: poi «comincia la prima». ' +
                 'Musica, per accenderla o spegnerla. ' +
                 'Portami a, e un indirizzo. Portami a casa. Avvisa, e il nome del tuo contatto. ' +
                 'E per registrare: mi chiamo, e il tuo nome. Casa mia è, e la via. ' +
                 'Il mio contatto è, il nome, e poi il numero.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      return true;
    }
    /* non capito: si risponde solo a chi parlava con noi */
    if (sembraRivoltoANoi(t)) {
      voce.parla('Questa non l\'ho capita. Se vuoi, dimmi «comandi» e ti dico cosa so fare.',
                 { livello: voce.GUIDA, ancheSeUguale: true });
      diario('NON CAPITO (ma era per noi): ' + t.slice(0, 40));
      return true;
    }
    return false;
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
                               direzioneBuona: s.direzioneBuona, strada: ultimaStrada, mappa: SERVIZI });
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
      /* nel browser la fotocamera non si apre così: non si promette una
         cosa che non si può fare, e non si resta zitti. */
      diario('LEGGO: niente porta urbeaLeggi (non siamo nel guscio)');
      diciLaLettura(lettura.senzaGuscio());
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
  function apriAscolto() {
    micChiuso = false;
    if (window.urbeaAscolta) { try { window.urbeaAscolta(); } catch (e) {} return; }
    var R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R || ascolto) return;
    try {
      ascolto = new R();
      ascolto.lang = 'it-IT'; ascolto.continuous = true; ascolto.interimResults = false;
      ascolto.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          var t = e.results[i][0].transcript;
          comando(t);
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

  window.urbeaComando = function (testo) {
    if (voce.staParlando()) diario('comando mentre parlavo: lo eseguo comunque');
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
    inAttesaDi = { cosa: 'nome', poi: quale };
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
    if (sal.chiede) inAttesaDi = { cosa: 'come-stai' };
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
    var testo = capo + DIARIO.join('\n');
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
