/* LA MAPPA — Yourbea, 15/10/2026
   ============================================================
   Questo file NON disegna: decide. Dice dove va il centro, quali puntini
   mettere e di che colore. Il disegno vero lo fa Leaflet dentro app.js.
   Così le regole si possono provare senza schermo e senza rete.

   A CHE SERVE UNA MAPPA IN UN'APP PER CHI NON VEDE: a chi è accanto. Un
   amico, un figlio, chi ti accompagna la prima volta in un posto nuovo:
   guarda lo schermo e capisce in un secondo quello che l'app sta dicendo.
   Per questo la mappa non ruba mai la parola: non è nel giro del lettore
   di schermo, e nessun puntino chiede di essere toccato.

   LE REGOLE, e perché:
   1. NON SI RICENTRA MENTRE QUALCUNO GUARDA. Se uno ha trascinato la mappa
      per vedere più in là, per venti secondi resta dove l'ha messa. Una
      mappa che torna al centro da sola è inservibile in due.
   2. NON SI RICENTRA PER TRE METRI. Il GPS a piedi balla: sotto i quindici
      metri la mappa tremerebbe e basta.
   3. AL MASSIMO QUARANTA PUNTINI, e i più grossi entrano per primi. Con
      novecento luoghi addosso lo schermo diventa una macchia.
   4. I SERVIZI SI VEDONO SOLO IN UTILITÀ. In Turismo la mappa mostra quello
      che l'app racconta: luoghi. La ferramenta no.
   5. QUELLO DI CUI STA PARLANDO È PIÙ GRANDE DEGLI ALTRI. Chi guarda deve
      poter seguire il racconto con gli occhi.
*/

'use strict';

function Mappa(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;                        // (lat,lon,lat,lon) -> metri
  var ora = o.ora || function () { return Date.now(); };
  var QUANTI = o.quanti || 40;
  var RAGGIO = o.raggio || 600;
  var MOSSA = o.mossa || 15;                // metri sotto i quali non si ricentra
  var PAZIENZA = o.pazienza || 20000;       // quanto si lascia stare dopo un trascinamento

  var centro = null;
  var toccataAlle = 0;

  /* laTocca(): chiamata quando qualcuno trascina o allarga la mappa. */
  function laTocca() { toccataAlle = ora(); }

  function vaCentrata(qui) {
    if (!qui || !qui.lat) return false;
    if (ora() - toccataAlle < PAZIENZA) return false;   // REGOLA 1
    if (!centro) return true;
    return dist(centro.lat, centro.lon, qui.lat, qui.lon) > MOSSA;  // REGOLA 2
  }

  function centrata(qui) { centro = { lat: qui.lat, lon: qui.lon }; }
  function ilCentro() { return centro; }

  /* puntini(): quali luoghi mostrare, in che ordine e di che colore.
     `intorno` arriva già ordinato per distanza: [{p, m}]. */
  function puntini(intorno, modo, inCorso) {
    var buoni = (intorno || []).filter(function (o) {
      if (o.m > RAGGIO) return false;
      if (modo === 'cultura' && !o.p.k) return false;   // REGOLA 4
      return true;
    });
    /* REGOLA 3: i grossi entrano per primi, poi i vicini. */
    buoni.sort(function (a, b) {
      var ra = rango(b.p) - rango(a.p);
      return ra !== 0 ? ra : a.m - b.m;
    });
    return buoni.slice(0, QUANTI).map(function (o) {
      var parla = !!(inCorso && o.p.n === inCorso);
      return {
        n: o.p.n, lat: o.p.lat, lon: o.p.lon, p: o.p,
        colore: !o.p.k ? 'spento' : (rango(o.p) >= 2 ? 'oro' : 'neon'),
        raggio: parla ? 11 : (rango(o.p) >= 2 ? 7 : 5),   // REGOLA 5
        parla: parla
      };
    });
  }

  function rango(p) { return p.r || (!p.k ? 0 : 1); }

  /* tracciato(): la linea del percorso, se c'è una meta. */
  function tracciato(percorso) {
    if (!percorso || !percorso.linea || percorso.linea.length < 2) return null;
    return percorso.linea;
  }

  return {
    laTocca: laTocca, vaCentrata: vaCentrata, centrata: centrata,
    ilCentro: ilCentro, puntini: puntini, tracciato: tracciato
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Mappa;
if (typeof window !== 'undefined') window.Mappa = Mappa;
