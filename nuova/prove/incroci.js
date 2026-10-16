/* LE PROVE DEGLI INCROCI — nuova Yourbea
   «Superavo gli incroci e non mi dicevi quali strade superavo» (Vince,
   16/10, camminando a Roma). Per chi non vede l'incrocio col nome è il
   punto fermo che dice dove sei arrivato.
   Si lancia:  node nuova/prove/incroci.js                                   */

'use strict';
const Incroci = require('../parti/incroci.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

function dist(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const a = Math.sin((la2 - la1) * r / 2) ** 2 +
            Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function verso(la1, lo1, la2, lo2) {
  const r = Math.PI / 180;
  const y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function mondo(t0) {
  let adesso = t0 || 1000000;
  return { i: Incroci({ dist, verso, ora: () => adesso }), passano(ms) { adesso += ms; } };
}

/* sto camminando in via dei Corazzieri verso nord; via Laurentina taglia
   una dozzina di metri più avanti, sulla destra. Le misure contano: a
   ventisei metri la prova diceva «niente da dire» e sembrava un difetto del
   codice — era la mia geometria, oltre il raggio. */
const QUI = { lat: 41.8230, lon: 12.4814 };
const VIE = [
  { nome: 'Via dei Corazzieri', punti: [[41.8225, 12.4814], [41.8235, 12.4814]] },
  { nome: 'Via Laurentina', punti: [[41.82309, 12.48150], [41.82309, 12.48240]] },
  { nome: 'Via Lontana', punti: [[41.8300, 12.4900], [41.8310, 12.4910]] }
];

prova('dice il nome della strada che stai incrociando', () => {
  const w = mondo();
  const d = w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true });
  if (!d) guasto('venti metri e non ha detto niente');
  if (d && !/Laurentina/.test(d.testo)) guasto('ha detto: ' + d.testo);
});

prova('da che parte rispetto a come cammini, mai il nord', () => {
  const w = mondo();
  const d = w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true });
  if (d && !/destra/.test(d.testo)) guasto('andando a nord, una strada a est è a destra: ' + d.testo);
  /* coi confini di parola: «est» sta dentro «destra», e la prova si
     bocciava da sola */
  if (d && /\b(?:nord|sud|est|ovest)\b/i.test(d.testo)) guasto('i punti cardinali no: ' + d.testo);
});

prova('senza sapere come cammini, il nome sì e la parte no', () => {
  const w = mondo();
  const d = w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri' });
  if (!d) guasto('il nome si dice lo stesso');
  if (d && /destra|sinistra|davanti/.test(d.testo)) guasto('destra e sinistra inventate: ' + d.testo);
});

prova('la strada dove sei non è un incrocio', () => {
  const w = mondo();
  const d = w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true });
  if (d && /Corazzieri/.test(d.testo)) guasto('ha annunciato la strada su cui cammina');
});

prova('quelle lontane non si annunciano', () => {
  const w = mondo();
  const d = w.i.quale({ qui: QUI, vie: [VIE[2]], strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true });
  if (d) guasto('a un chilometro non è un incrocio: ' + d.testo);
});

prova('lo stesso incrocio non si ripete subito', () => {
  const w = mondo();
  const primo = w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true });
  if (!primo) guasto('il primo si dice');
  w.passano(30000);
  if (w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true })) {
    guasto('trenta secondi dopo lo ha ridetto');
  }
  w.passano(200000);
  if (!w.i.quale({ qui: QUI, vie: VIE, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true })) {
    guasto('dopo tre minuti, ripassandoci, si può ridire');
  }
});

prova('fra due incroci insieme si dice il più vicino', () => {
  const w = mondo();
  const vicine = VIE.concat([{ nome: 'Via Vicinissima', punti: [[41.82302, 12.48142], [41.82302, 12.48150]] }]);
  const d = w.i.quale({ qui: QUI, vie: vicine, strada: 'Via dei Corazzieri', direzione: 0, direzioneBuona: true });
  if (d && !/Vicinissima/.test(d.testo)) guasto('doveva dire quella a due metri: ' + d.testo);
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove degli incroci');
process.exit(passate === fatti.length ? 0 : 1);
