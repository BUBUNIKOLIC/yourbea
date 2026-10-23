/* AGGANCIARE LA POSIZIONE ALLA STRADA — Yourbea, 23/10/2026
   ============================================================
   «La APP deve avere una posizione precisa» (Vince, regola 1).

   Il GPS di un telefono, misurato su una giornata vera di giro: mediana
   13 metri, ma il 13% delle letture sopra i 50, con punte di 653 e
   1.414. Tredici metri, in una strada stretta, vuol dire stare dentro il
   palazzo di fronte — e a chi non vede «sulla destra» detto dal posto
   sbagliato non e' un'imprecisione, e' un ordine che esegue.

   Ma una cosa la sappiamo di sicuro: CHI CAMMINA STA SU UNA STRADA. Le
   vie le scarichiamo gia' da OpenStreetMap per gli incroci, e sono linee
   con dentro i punti. Proiettare la lettura sulla linea piu' probabile
   toglie quasi tutto l'errore di traverso, che e' quello che conta: se
   sbaglio di dieci metri AVANTI lungo la via, «fra venti passi
   l'attraversamento» diventa «fra trenta». Se sbaglio di dieci metri di
   LATO, sono dall'altra parte della strada.

   LE QUATTRO REGOLE, e nascono tutte dallo stesso timore.
   1. UNA LETTURA SBALLATA NON SI AGGANCIA. Sopra i quaranta metri di
      errore dichiarato non si tocca niente: mettere un punto incerto
      sopra una strada lo fa SEMBRARE sicuro, ed e' peggio che lasciarlo
      dov'e'. Il telefono dice di non sapere: si dice anche noi.
   2. NON SI AGGANCIA DA LONTANO. Oltre venticinque metri dalla via piu'
      vicina, quella via non e' detto che sia la tua: magari stai
      attraversando un parco, o sei in un cortile.
   3. NON SI SALTA DA UNA STRADA ALL'ALTRA. Chi cammina resta sulla
      stessa via per un pezzo. Quella di prima si tiene finche' e'
      ragionevole, e si cambia solo se un'altra e' piu' vicina di almeno
      otto metri: se no, a ogni incrocio la posizione ballerebbe fra due
      strade a ogni lettura.
   4. SI AGGANCIA SOLO CHI CAMMINA. In macchina la strada e' un'altra —
      le tangenziali, i cavalcavia — e sbagliare carreggiata e' facile.
*/

'use strict';

function Aggancio(opzioni) {
  var o = opzioni || {};
  var QUANTO_LONTANO = o.quantoLontano || 25;     // metri: oltre, non e' la tua via
  var PRECISIONE_MINIMA = o.precisioneMinima || 40;
  var PER_CAMBIARE = o.perCambiare || 8;          // metri di vantaggio per cambiare via
  var TIENE = o.tiene || 25000;                   // la via di prima vale mezzo minuto
  var ora = o.ora || function () { return Date.now(); };
  var dist = o.dist || function (a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  var viaDiPrima = null, quando = 0;

  /* il punto piu' vicino su un segmento, e quanto dista */
  function sulSegmento(la, lo, a, b) {
    var k = Math.cos(la * Math.PI / 180);
    var dx = (b[0] - a[0]), dy = (b[1] - a[1]) * k;
    var len = dx * dx + dy * dy;
    var t = len > 0 ? (((la - a[0]) * dx + (lo - a[1]) * k * dy) / len) : 0;
    t = Math.max(0, Math.min(1, t));
    var pla = a[0] + dx * t, plo = a[1] + (b[1] - a[1]) * t;
    return { lat: pla, lon: plo, m: dist(la, lo, pla, plo) };
  }

  function puntoPiuVicino(la, lo, via) {
    var p = via.punti || [];
    var meglio = null;
    for (var i = 1; i < p.length; i++) {
      var q = sulSegmento(la, lo, p[i - 1], p[i]);
      if (!meglio || q.m < meglio.m) meglio = q;
    }
    return meglio;
  }

  /* aggancia(): la posizione agganciata, oppure null se si lascia stare.
     s = { lat, lon, prec, aPiedi }  vie = [{ nome, punti: [[la,lo],…] }] */
  function aggancia(s, vie) {
    if (!s || !vie || !vie.length) return null;
    if (s.aPiedi === false) return null;                       // REGOLA 4
    if (s.prec > PRECISIONE_MINIMA) return null;               // REGOLA 1

    var migliore = null, suDiPrima = null;
    for (var i = 0; i < vie.length; i++) {
      var v = vie[i];
      if (!v || !v.punti || v.punti.length < 2) continue;
      var q = puntoPiuVicino(s.lat, s.lon, v);
      if (!q) continue;
      q.nome = v.nome || '';
      if (!migliore || q.m < migliore.m) migliore = q;
      if (viaDiPrima && q.nome && q.nome === viaDiPrima) {
        if (!suDiPrima || q.m < suDiPrima.m) suDiPrima = q;
      }
    }
    if (!migliore || migliore.m > QUANTO_LONTANO) { return null; }   // REGOLA 2

    /* REGOLA 3: si resta sulla propria strada, se e' ancora ragionevole */
    var scelto = migliore;
    if (suDiPrima && (ora() - quando) < TIENE && suDiPrima.m <= QUANTO_LONTANO &&
        suDiPrima.m - migliore.m < PER_CAMBIARE) {
      scelto = suDiPrima;
    }
    viaDiPrima = scelto.nome || viaDiPrima;
    quando = ora();
    return { lat: scelto.lat, lon: scelto.lon, via: scelto.nome,
             spostato: Math.round(dist(s.lat, s.lon, scelto.lat, scelto.lon)) };
  }

  function dimentica() { viaDiPrima = null; quando = 0; }
  function laVia() { return viaDiPrima; }

  return { aggancia: aggancia, dimentica: dimentica, laVia: laVia };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Aggancio;
if (typeof window !== 'undefined') window.Aggancio = Aggancio;
