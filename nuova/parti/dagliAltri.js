/* QUELLO CHE HANNO SEGNATO GLI ALTRI — Yourbea, 01/11/2026
   ============================================================
   «Avere una mappa online sul sito che si aggiorna in tempo reale dai
   vari tester e tutte le volte che si apre la app si fa riferimento a
   quella mappa, è impossibile?» — e poi: «un sistema misto?» (Vince).
   No, non è impossibile: metà c'era già. Dal 25/10 i contributi SALGONO
   al server (parti/contributi.js, 28 punti il 01/11), ma non sono mai
   tornati giù: «la discesa verso il laghetto dell'Eur» e «l'incrocio con
   Cristoforo Colombo passa sopra», segnati stamattina, non li sentiva
   nessuno — nemmeno chi li aveva detti.

   IL SISTEMA MISTO, e perché non può essere altro:
   1. I DATI LOCALI RESTANO LA BASE. 950 luoghi e 577 approfondimenti
      stanno sul telefono e funzionano in galleria. Se l'app avesse
      bisogno della rete per sapere dov'è sicuro camminare, in un
      sottopasso resterebbe muta: per chi non vede non è un disagio, è un
      pericolo.
   2. QUELLO CHE ARRIVA DAL SERVER SI TIENE SUL TELEFONO. Si scarica
      quando c'è rete e si salva: domani, senza campo, c'è ancora. Come i
      quadretti della mappa.
   3. SI SCARICA QUANDO SERVE, NON OGNI SECONDO. All'apertura, e poi non
      più di una volta ogni dieci minuti.
   4. UN PUNTO DI UN ALTRO NON È UN ORDINE. Lo si dice come l'ha detto
      chi l'ha segnato — «qui c'è una discesa verso il laghetto» — e si
      sa che viene da una persona, non da una mappa.
   ============================================================ */

'use strict';

function DagliAltri(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var prendi = o.prendi || null;            // () -> Promise con la risposta del server
  var leggiSalvati = o.leggiSalvati || function () { return null; };
  var salva = o.salva || function () {};
  var dist = o.dist;
  var diario = o.diario || function () {};
  var OGNI = o.ogni || 600000;              // dieci minuti
  var VALE = o.vale || 7 * 24 * 3600 * 1000;  // una copia vecchia di una settimana vale ancora

  var punti = [];
  var quando = 0;
  var ultimoGiro = 0;

  /* COME SI CHIAMA QUI QUELLO CHE LÌ È UN CODICE. Il server parla la
     lingua dei contributi (`t`: posto, attraversamento, scalini…), l'app
     quella dei luoghi (`cosa`, `nome`, `servizio`). La traduzione sta in
     un posto solo, qui, e tiene il nome di chi l'ha segnato. */
  function daServer(p) {
    if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return null;
    var t = String(p.t || '');
    var fuori = { lat: p.lat, lon: p.lon, tester: true, chi: p.chi || '',
                  quando: p.quando || 0, via: p.via || '' };
    if (t === 'attraversamento') {
      fuori.cosa = 'attraversamento';
      fuori.servizio = 'attraversamento';
      fuori.nome = '';
      fuori.semaforo = !!p.sem;
      fuori.suona = String(p.che || '').indexOf('suona') >= 0;
      fuori.tattile = String(p.che || '').indexOf('tattile') >= 0;
      return fuori;
    }
    if (t === 'scalini' || t === 'scivolo' || t === 'ostacolo' || t === 'semaforo') {
      fuori.cosa = (t === 'scivolo') ? 'scivolo del marciapiede' : t;
      fuori.servizio = fuori.cosa;
      fuori.nome = p.n || '';
      return fuori;
    }
    if (t === 'fermata' || t === 'metro') {
      fuori.cosa = (t === 'metro') ? 'stazione' : 'fermata';
      fuori.servizio = fuori.cosa;
      fuori.nome = p.n || '';
      return fuori;
    }
    /* «posto»: quello che una persona ha voluto dire, con le sue parole */
    if (!p.n) return null;
    fuori.cosa = p.che || '';
    fuori.servizio = p.che || 'posto';
    fuori.nome = p.n;
    return fuori;
  }

  function metti(risposta) {
    var crudi = (risposta && (risposta.punti || risposta.dati)) ||
                (Array.isArray(risposta) ? risposta : []);
    var buoni = [];
    for (var i = 0; i < crudi.length; i++) {
      var p = daServer(crudi[i]);
      if (p) buoni.push(p);
    }
    punti = buoni;
    quando = ora();
    try { salva({ quando: quando, punti: crudi }); } catch (e) {}
    diario('DAGLI ALTRI: ' + punti.length + ' punti dei tester');
    return punti.length;
  }

  /* all'avvio: prima la copia sul telefono (subito, anche senza rete),
     poi la rete se c'è. Così non si parte mai da zero. */
  function apri() {
    var copia = null;
    try { copia = leggiSalvati(); } catch (e) {}
    if (copia && copia.punti) {
      var eta = ora() - (copia.quando || 0);
      if (eta < VALE) {
        var n = metti({ punti: copia.punti });
        quando = copia.quando || ora();
        diario('DAGLI ALTRI: ' + n + ' punti dalla copia sul telefono, di ' +
               Math.round(eta / 60000) + ' minuti fa');
      } else {
        diario('DAGLI ALTRI: la copia sul telefono e\' vecchia di ' +
               Math.round(eta / 86400000) + ' giorni, aspetto la rete');
      }
    }
    return aggiorna('apertura');
  }

  function aggiorna(perche) {
    if (!prendi) return Promise.resolve(0);
    if (ora() - ultimoGiro < OGNI) return Promise.resolve(punti.length);
    ultimoGiro = ora();
    return Promise.resolve(prendi()).then(function (r) {
      return metti(r);
    })['catch'](function (e) {
      /* NIENTE RETE NON E' UN GUASTO: resta la copia di prima. */
      diario('DAGLI ALTRI: non arrivano (' + (e && e.message ? e.message : 'niente rete') +
             '), tengo i ' + punti.length + ' che ho');
      return punti.length;
    });
  }

  /* quelli che hai addosso, nel formato dei punti dell'app */
  function qui(lat, lon, raggio) {
    if (!dist || typeof lat !== 'number') return [];
    var r = raggio || 300;
    var vicini = [];
    for (var i = 0; i < punti.length; i++) {
      var d = dist(lat, lon, punti[i].lat, punti[i].lon);
      if (d <= r) vicini.push(punti[i]);
    }
    return vicini;
  }

  function quanti() { return punti.length; }
  function diQuando() { return quando; }

  return { apri: apri, aggiorna: aggiorna, qui: qui, quanti: quanti,
           diQuando: diQuando, daServer: daServer };
}

if (typeof module !== 'undefined' && module.exports) module.exports = DagliAltri;
if (typeof window !== 'undefined') window.DagliAltri = DagliAltri;
