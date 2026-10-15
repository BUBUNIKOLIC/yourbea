/* LE PROVE DELLA MAPPA — nuova Yourbea
   La mappa è per chi sta accanto a chi non vede: deve stare ferma quando la
   si guarda, e mostrare quello che l'app racconta.
   Si lancia senza schermo:  node nuova/prove/mappa.js                       */

'use strict';
const Mappa = require('../parti/mappa.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* una distanza finta, in metri, che basta per le regole */
function dist(a, b, c, d) {
  return Math.round(Math.sqrt(Math.pow((a - c) * 111320, 2) + Math.pow((b - d) * 80000, 2)));
}
function mondo(t0) {
  let adesso = t0 || 1000000;
  const m = Mappa({ dist, ora: () => adesso });
  return { m, passano(ms) { adesso += ms; } };
}

const DUOMO = { n: 'Duomo', lat: 44.8035, lon: 10.3300, k: 1, r: 3 };
const PALAZZO = { n: 'Palazzo', lat: 44.8031, lon: 10.3291, k: 1 };
const FERRAMENTA = { n: 'Ferramenta', lat: 44.80292, lon: 10.32892, k: 0 };
const QUI = { lat: 44.8029, lon: 10.3289 };
function intorno(lista) { return lista.map(([p, m]) => ({ p, m })); }

prova('la prima volta si centra', () => {
  const w = mondo();
  if (!w.m.vaCentrata(QUI)) guasto('senza centro la mappa va centrata');
});

prova('chi trascina la mappa se la tiene: venti secondi non si ricentra', () => {
  const w = mondo();
  w.m.centrata(QUI);
  w.m.laTocca();
  const lontano = { lat: 44.8100, lon: 10.3400 };
  if (w.m.vaCentrata(lontano)) guasto('gliel\'ha riportata al centro mentre la guardava');
  w.passano(21000);
  if (!w.m.vaCentrata(lontano)) guasto('passata la pazienza doveva ricentrare');
});

prova('non si ricentra per tre metri: la mappa tremerebbe', () => {
  const w = mondo();
  w.m.centrata(QUI);
  const unPasso = { lat: QUI.lat + 0.00002, lon: QUI.lon };   // ~2 metri
  if (w.m.vaCentrata(unPasso)) guasto('due metri e già ricentrava');
  const venti = { lat: QUI.lat + 0.0002, lon: QUI.lon };      // ~22 metri
  if (!w.m.vaCentrata(venti)) guasto('venti metri sono uno spostamento vero');
});

prova('in Turismo la ferramenta non si disegna', () => {
  const w = mondo();
  const p = w.m.puntini(intorno([[FERRAMENTA, 8], [PALAZZO, 40]]), 'cultura');
  if (p.some((x) => x.n === 'Ferramenta')) guasto('in Turismo la mappa mostrava un negozio');
  if (!p.some((x) => x.n === 'Palazzo')) guasto('il palazzo doveva esserci');
});

prova('in Utilità i servizi si vedono, ma spenti', () => {
  const w = mondo();
  const p = w.m.puntini(intorno([[FERRAMENTA, 8]]), 'servizi');
  if (!p.length) guasto('in Utilità i servizi servono');
  if (p[0].colore !== 'spento') guasto('un negozio non è oro come un monumento');
});

prova('i luoghi grossi entrano per primi, e sono più grandi', () => {
  const w = mondo();
  const tanti = [];
  for (let i = 0; i < 60; i++) tanti.push([{ n: 'minore ' + i, lat: 44.8029, lon: 10.3289, k: 1 }, 10 + i]);
  tanti.push([DUOMO, 500]);
  const p = w.m.puntini(intorno(tanti), 'cultura');
  if (p.length > 40) guasto('più di quaranta puntini: lo schermo diventa una macchia');
  if (p[0].n !== 'Duomo') guasto('il Duomo a 500 metri conta più di un minore a 10');
  if (!(p[0].raggio > p[1].raggio)) guasto('il grande deve vedersi più grande');
});

prova('quello di cui sta parlando si vede più grande di tutti', () => {
  const w = mondo();
  const p = w.m.puntini(intorno([[DUOMO, 60], [PALAZZO, 20]]), 'cultura', 'Palazzo');
  const pal = p.find((x) => x.n === 'Palazzo');
  const duo = p.find((x) => x.n === 'Duomo');
  if (!pal.parla) guasto('non ha segnato quello in corso');
  if (!(pal.raggio > duo.raggio)) guasto('chi guarda deve seguire il racconto con gli occhi');
});

prova('niente percorso, niente linea', () => {
  const w = mondo();
  if (w.m.tracciato(null)) guasto('ha disegnato una linea senza percorso');
  if (w.m.tracciato({ linea: [[1, 2]] })) guasto('un punto solo non è una linea');
  if (!w.m.tracciato({ linea: [[1, 2], [3, 4]] })) guasto('due punti sono una linea');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della mappa');
process.exit(passate === fatti.length ? 0 : 1);
