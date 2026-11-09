/* ============================================================
   LA COLLA — fra il cuore (app.js), i motori buoni e il telefono.
   Qui dentro non c'e' logica: solo i fili. Se una riga decide qualcosa,
   e' nel posto sbagliato e va in app.js.
   ============================================================ */
(function () {
  'use strict';
  var el = function (q) { return document.getElementById(q); };

  /* ---------- il quaderno: va al guscio, che lo scrive sul telefono ---------- */
  function diario(t) {
    try { if (window.urbeaDiario) window.urbeaDiario(t); } catch (e) {}
  }

  /* ---------- i motori ---------- */
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
  function dist(a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  var laDistanza = typeof Distanza === 'function' ? Distanza({}) : null;
  var guida = Guida({ diario: diario, dist: dist, distanza: laDistanza });
  var posti = typeof PostiMiei === 'function'
    ? PostiMiei({ dist: dist, aPosto: function (t) { return t; }, nudo: function (t) { return t; } })
    : null;
  var contributi = typeof Contributi === 'function'
    ? Contributi({ diario: diario,
                   manda: function (corpo) {
                     return fetch('https://contributi-yourbea.server-contributi.workers.dev/punti', {
                       method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(corpo) }).then(function (r) { return r.json(); });
                   },
                   memoria: window.localStorage })
    : null;

  /* ---------- il cuore ---------- */
  var app = Semplice({
    finestra: window,
    parti: { Turno: Turno, Posizione: Posizione, Voce: MotoreVoce },
    guida: guida,
    /* cosa ho intorno: i luoghi veri entro 150 metri, i piu' vicini */
    intorno: function (s) {
      if (!ultimiLuoghi.length) return [];
      return ultimiLuoghi.map(function (p) {
        return { nome: p.nome || p.n, metri: dist(s.lat, s.lon, p.lat, p.lon) };
      }).filter(function (p) { return p.metri < 150; })
        .sort(function (a, b) { return a.metri - b.metri; });
    },
    laVia: function () { return ultimaVia; },
    unPostoMio: function (dove) {
      if (!posti || !posti.trova) return null;
      var p = posti.trova(dove);
      return p && p.lat ? { nome: p.n || p.nome, lat: p.lat, lon: p.lon } : null;
    },
    cercaTipo: function (tipo, s, poi) {
      intorno.cercaServizio(tipo, { lat: s.lat, lon: s.lon }).then(function (lista) {
        poi(guida.scegli(lista || [], [], { lat: s.lat, lon: s.lon }, ''));
      }).catch(function () { poi(null); });
    },
    cercaIndirizzo: function (dove, s, poi) {
      intorno.cercaIndirizzo(dove, { lat: s.lat, lon: s.lon }).then(function (lista) {
        poi(guida.scegli(lista || [], guida.cittaNelTesto(dove), { lat: s.lat, lon: s.lon }, dove));
      }).catch(function () { poi(null); });
    },
    percorso: function (s, meta, poi) {
      intorno.percorso({ lat: s.lat, lon: s.lon }, { lat: meta.lat, lon: meta.lon })
        .then(function (p) { poi(p); }).catch(function () { poi(null); });
    },
    segnala: function (frase) {
      if (!contributi) return;
      var c = contributi.dallaVoce(Array.isArray(frase) ? frase[0] : frase);
      var s = app.posizione.leggi();
      if (!c) { mostra('Non ho capito cosa segnare.'); return; }
      contributi.inCoda(c, { lat: s.lat, lon: s.lon, prec: s.prec }, s.viaAgganciata || '');
      mostra('Segnato: ' + (c.nome || c.dice) + '.');
    }
  });

  /* ---------- lo schermo: solo per chi vede ---------- */
  function mostra(t) {
    var p = document.createElement('p');
    p.textContent = t;
    el('dice').prepend(p);
    while (el('dice').children.length > 12) el('dice').lastChild.remove();
  }
  /* la voce passa da qui, cosi' sullo schermo c'e' sempre l'ultima frase */
  var parlaVera = app.voce.parla;
  app.voce.parla = function (frase, come) { mostra(frase); return parlaVera.call(app.voce, frase, come); };

  /* ---------- i bottoni ---------- */
  el('b-utilita').onclick = function () { app.entra('utilita'); el('porta').hidden = true; };
  el('b-turismo').onclick = function () { app.entra('turismo'); el('porta').hidden = true; };
  el('b-dove').onclick = function () { app.doveSono(); };
  el('b-intorno').onclick = function () { app.quiIntorno(); };
  el('b-fermati').onclick = function () { app.fermati(); };
  /* TOCCA E PARLA: e' la porta delle segnalazioni, come il telefono alla
     bocca (LOGICA.md 9). Dentro i dieci secondi, il nome non serve. */
  var gestoFino = 0;
  el('parla').onclick = function () {
    gestoFino = Date.now() + 10000;
    app.turno.tocco();
    el('parla').setAttribute('aria-pressed', 'true');
    el('stato').textContent = 'Ti ascolto: dimmi la cosa.';
    setTimeout(function () {
      el('parla').setAttribute('aria-pressed', 'false');
      el('stato').textContent = '';
    }, 10000);
    app.voce.parla('Dimmi.', { livello: app.voce.GUIDA, ancheSeUguale: true });
  };

  /* ---------- le porte del guscio ---------- */
  var ultimiLuoghi = [];
  window.urbeaPosizione = function (lat, lon, prec, corso, corsoPrec, vel, velPrec) {
    app.posizione.dalGuscio(lat, lon, prec,
      { corso: corso, corsoPrec: corsoPrec, vel: vel, velPrec: velPrec });
    chiediIntorno(lat, lon);
  };
  window.urbeaBussola = function (gradi, prec) { app.posizione.laBussola(gradi, prec); };
  window.urbeaAttivita = function (come, sicuro) { app.posizione.comeMiMuovo(come, sicuro); };
  window.urbeaPassi = function (n) { app.posizione.quantiPassi(n); };
  window.urbeaComando = function (testo) {
    app.sentita(testo, { dalGesto: Date.now() < gestoFino });
  };
  window.YBtuInizi = function () { app.turno.tuInizi(); };
  window.YBtuFinisci = function () { app.turno.tuFinisci(); };
  window.YBalLaBocca = function () { gestoFino = Date.now() + 10000; app.turno.boccaVicina(); };
  window.YBzitta = function () { app.fermati(); };
  window.urbeaAudioInterrotto = function () { app.turno.interruzioneInizia('audio preso da fuori'); };
  window.urbeaAudioTornato = function () { app.turno.interruzioneFinisce(); };

  /* i luoghi intorno, una volta per zona */
  var ultimaZona = '';
  var ultimaVia = null;
  function chiediIntorno(lat, lon) {
    var z = lat.toFixed(2) + ',' + lon.toFixed(2);
    if (z === ultimaZona) return;
    ultimaZona = z;
    intorno.strada(lat, lon).then(function (d) {
      ultimaVia = (d && (d.via || d.nome)) || null;
      if (ultimaVia) diario('STRADA: ' + ultimaVia);
    }).catch(function () {});
    intorno.servizi(lat, lon).then(function (lista) {
      ultimiLuoghi = (lista || []).filter(function (p) { return p && p.lat && (p.nome || p.n); });
      diario('INTORNO: ' + ultimiLuoghi.length + ' cose nella zona');
    }).catch(function () {});
  }

  /* ---------- e si parte ---------- */
  app.posizione.comincia();
  diario('SEMPLICE: partita');
  mostra('Ciao. Scegli Utilità o Turismo, o dimmelo a voce.');
  app.voce.parla('Ciao. Vuoi utilità o turismo?', { livello: app.voce.GUIDA, ancheSeUguale: true });
  if (window.urbeaAscolta) { try { window.urbeaAscolta('it-IT'); } catch (e) {} }
})();
