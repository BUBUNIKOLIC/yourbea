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
  var sintesi = {
    parla: function (t) {
      try {
        if (!window.speechSynthesis) return;
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
    if (cosa.dove !== undefined) el('dove').textContent = cosa.dove || '—';
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

  var clip = Clip();

  /* ---------- l'emergenza e la guida ---------- */
  var contatto = null;
  try { contatto = JSON.parse(localStorage.getItem('yourbea2-contatto') || 'null'); } catch (e) {}
  var emergenza = Emergenza({ contatto: contatto });
  var guida = Guida({ dist: function (a, b, c, d) { return posizione.dist(a, b, c, d); },
                      verso: function (a, b, c, d) { return posizione.verso(a, b, c, d); },
                      diario: diario });

  /* esegui(): le mosse che l'emergenza chiede — chiamare, mandare un
     messaggio. Si fanno QUI, dopo che la frase e' stata detta: se no la
     chiamata parte mentre l'app sta ancora parlando e non si sente niente. */
  function esegui(mosse) {
    if (!mosse) return;
    mosse.forEach(function (m) {
      setTimeout(function () {
        try {
          if (m.cosa === 'chiama') location.href = 'tel:' + m.numero;
          else if (m.cosa === 'messaggio') location.href = 'sms:' + m.numero + '&body=' + encodeURIComponent(m.testo);
        } catch (e) { diario('MOSSA non riuscita: ' + m.cosa); }
      }, m.fraMillisecondi || 1500);
    });
  }
  function dilloSubito(d) {
    if (!d) return;
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
    return el('cosa').textContent;
  }

  /* portamiA(): trova la meta e chiede il percorso. Prima fra i luoghi
     nostri, poi fra i servizi, poi fra gli indirizzi — e la citta' detta
     dall'utente vince sempre (il difetto che portava a Cisterna di Latina). */
  function portamiA(cosa) {
    var s = posizione.leggi();
    if (!s.pronto) { voce.parla('Prima devo sapere dove sei.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    var qui = { lat: s.lat, lon: s.lon };
    var parole = guida.cittaNelTesto(cosa);
    var cerca = cosa.toLowerCase();
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
    var cercatore = tipo ? intorno.cercaServizio(tipo, qui) : intorno.cercaIndirizzo(cosa, qui);
    cercatore.then(function (candidati) {
      var scelto = guida.scegli(candidati, parole, qui);
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
      partiVerso({ n: nome, lat: scelto.lat, lon: scelto.lon }, qui);
    });
  }
  function partiVerso(m, qui) {
    Promise.all([intorno.strada(qui.lat, qui.lon), intorno.percorso(qui, m)]).then(function (r) {
      dilloSubito(guida.vaiA(m, qui, r[0], r[1]));
    });
  }
  /* quando non si sa come sei girato, si dice il punto cardinale: «a nord».
     Le clip si chiamano card-a-nord, card-a-nord-est... */
  function cardinaleVerso(o) {
    if (!o) return null;
    var s = posizione.leggi();
    var g = posizione.verso(s.lat, s.lon, o.p.lat, o.p.lon);
    var punti = ['a nord','a nord-est','a est','a sud-est','a sud','a sud-ovest','a ovest','a nord-ovest'];
    return punti[Math.round(g / 45) % 8];
  }
  function clipDi(d) {
    // i nomi dei file incisi con Alice; se una manca o è lenta, il motore
    // passa alla voce di sistema da sé — senza silenzio
    try { return clip.per(d); } catch (e) { return null; }
  }

  function dillo(d) {
    if (!d) return;
    var liv = d.livello === 'guida' ? voce.GUIDA : (d.livello === 'emergenza' ? voce.EMERGENZA : voce.CENNO);
    var preso = voce.parla(d.testo, { clip: clipDi(d), livello: liv });
    if (!preso) { diario('non detta: ' + String(d.testo).slice(0, 40)); return; }
    if (d.luogo) {
      mostra({ dove: d.tipo === 'cenno' ? d.testo.split(',').slice(0, 2).join(',') : '',
               titolo: d.luogo.n, testo: d.tipo === 'cenno' ? (d.luogo.t || '') : d.testo,
               gradino: gradinoScritto(d) });
    } else {
      mostra({ titolo: el('cosa').textContent, testo: d.testo });
    }
    alLettore(d.testo);
  }
  function gradinoScritto(d) {
    if (d.tipo === 'cenno') return 'Fermati dieci secondi e te lo racconto. Oppure dimmi «ancora».';
    if (d.tipo === 'scheda') return 'Dimmi «ancora» per sapere cosa guardare.';
    if (d.tipo === 'cosa-vedere') return 'Dimmi «ancora» per l\'approfondimento.';
    if (d.tipo === 'approfondimento') return 'Di questo ti ho detto tutto.';
    return '';
  }

  /* ---------- il giro: a ogni posizione nuova ---------- */
  var ultimaStrada = '', ultimaStradaQuando = 0;
  posizione.quando(function (cosa, s) {
    if (cosa === 'problema') {
      var dice = s.comeVa === 'negata'
        ? 'Non ho il permesso di sapere dove sei: dallo nelle impostazioni del telefono, se no non posso accompagnarti.'
        : 'Questo telefono non mi dà la posizione.';
      stato('posizione <b>' + s.comeVa + '</b>', true);
      mostra({ titolo: 'Non so dove sei', testo: dice, attesa: true, dove: '—', gradino: '' });
      voce.parla(dice, { livello: voce.GUIDA });
      return;
    }
    if (!s.pronto) { stato('cerco la posizione…'); return; }
    stato('posizione attiva · <b>' + Math.round(s.prec || 0) + ' m</b>' + (s.fermo ? ' · fermo' : ''));
    if (!acceso) return;

    var lista = vicini();
    // la strada, una volta al minuto
    if (Date.now() - ultimaStradaQuando > 60000) {
      ultimaStradaQuando = Date.now();
      intorno.strada(s.lat, s.lon).then(function (v) {
        if (!v || !v.via) return;
        var dove = v.via + (v.civico ? ' ' + v.civico : '');
        if (dove === ultimaStrada) return;
        ultimaStrada = dove;
        dillo({ tipo: 'strada', testo: 'Sei in ' + dove + '.', livello: 'guida' });
      });
      intorno.servizi(s.lat, s.lon).then(function (v) { if (v) SERVIZI = v; });
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
      var g = guida.passo({ lat: s.lat, lon: s.lon }, Date.now());
      if (g) dilloSubito(g);
      return;
    }
    // e il racconto
    var d = racconto.prossimo({ qui: { lat: s.lat, lon: s.lon }, intorno: lista, modo: modo,
                                direzioneBuona: s.direzioneBuona,
                                cardinale: s.direzioneBuona ? null : cardinaleVerso(lista[0]) });
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
    intorno: ['cosa c e qui intorno', 'cosa c e intorno', 'elenco', 'che cosa c e'],
    turismo: ['turismo', 'turista'],
    utilita: ['utilita', 'servizi'],
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
    function ha(chiave) { return PAROLE[chiave].some(function (p) { return t.indexOf(p) >= 0; }); }

    if (!el('porta').hidden) {
      if (ha('turismo')) { entra('cultura'); return true; }
      if (ha('utilita')) { entra('servizi'); return true; }
    }
    if (ha('ferma')) { voce.ferma(); guida.lascia(); return true; }
    // l'emergenza viene prima di tutto
    var s0 = posizione.leggi();
    var dove0 = { via: ultimaStrada, lat: s0.lat, lon: s0.lon };
    var em = emergenza.comando(t, ultimaStrada ? dove0 : null);
    if (em) {
      if (em.tipo === 'cerca') { portamiA(em.cosa); dilloSubito(em); return true; }
      dilloSubito(em); return true;
    }
    var meta = guida.dalComando(t);
    if (meta) { portamiA(meta); return true; }
    if (ha('lascia perdere', 'annulla', 'non importa')) { dilloSubito(guida.lascia()); return true; }
    if (ha('ancora')) { dillo(racconto.approfondisci({ qui: posizione.leggi(), intorno: vicini(), modo: modo })); return true; }
    if (ha('avanti')) { dillo(racconto.salta()); return true; }
    if (ha('dove')) { diciDove(); return true; }
    if (ha('intorno')) { diciIntorno(); return true; }
    if (ha('aiuto')) {
      voce.parla('Puoi dire: ancora, avanti, dove sono, cosa c\'è qui intorno, ferma.', { livello: voce.GUIDA, ancheSeUguale: true });
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
  function diciIntorno() {
    var lista = vicini().slice(0, 5);
    if (!lista.length) { voce.parla('Qui intorno non ho niente da dirti.', { livello: voce.GUIDA, ancheSeUguale: true }); return; }
    var frasi = lista.map(function (o) { return o.p.n + ', ' + versoParole(o); });
    dillo({ tipo: 'elenco', testo: frasi.join('. ') + '.', livello: 'guida' });
  }

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
    voce.parla(quale === 'cultura'
      ? 'Turismo. Ti racconto quello che hai intorno. Camminando ti dico cosa passi; se ti fermi dieci secondi te lo racconto.'
      : 'Utilità. Ti dico la strada, i numeri civici, i negozi e gli attraversamenti, e i luoghi importanti. Dimmi «ancora» per saperne di più.',
      { livello: voce.GUIDA });
    mostra({ titolo: 'Ci siamo', testo: 'Cerco la posizione…', attesa: true, dove: '—', gradino: '' });
  }

  el('scelta-utilita').addEventListener('click', function () { entra('servizi'); });
  el('scelta-turismo').addEventListener('click', function () { entra('cultura'); });
  el('avvia').addEventListener('click', function () {
    acceso = !acceso;
    this.textContent = acceso ? 'Ferma' : 'Avvia';
    if (acceso) { posizione.comincia(); apriAscolto(); }
    else { voce.ferma(); chiudiAscolto(); ascoltoVoluto = false; }
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
  el('altro').addEventListener('click', function () {
    var c = el('cassetto'), aperto = c.classList.toggle('aperto');
    this.setAttribute('aria-expanded', aperto ? 'true' : 'false');
  });
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
  fetch('dati/luoghi.json').then(function (r) { return r.json(); }).then(function (l) {
    LUOGHI = l;
    diario('dati: ' + LUOGHI.length + ' luoghi, ' + LUOGHI.filter(function (x) { return x.a; }).length + ' approfondimenti');
    stato('pronta · <b>' + LUOGHI.length + '</b> luoghi');
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
      inCorso: racconto.inCorso() ? racconto.inCorso().n : null
    };
  };
})();
