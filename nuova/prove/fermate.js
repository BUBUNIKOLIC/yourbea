/* LE PROVE DELLE FERMATE — nuova Yourbea
   «Poi non riconosce che siamo in metro… potrebbe dire: stai per entrare
   in stazione Colosseo, appena esci eccetera» (Vince, 21/10).
   Si lancia:  node nuova/prove/fermate.js                                */

'use strict';
const Fermate = require('../parti/fermate.js');

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
function mondo() {
  let adesso = 1000000;
  const f = Fermate({ dist, ora: () => adesso });
  return { f, passano(ms) { adesso += ms; } };
}

const CAVOUR = { nome: 'Cavour', servizio: 'ingresso della metropolitana', lat: 41.8940, lon: 12.4930 };
const COLOSSEO = { nome: 'Colosseo', servizio: 'ingresso della metropolitana', lat: 41.8902, lon: 12.4925 };
const LUOGHI = [
  { n: 'Colosseo', lat: 41.8902, lon: 12.4922, k: 3, d: 'x'.repeat(700) },
  { n: 'Basilica di San Pietro in Vincoli', lat: 41.8944, lon: 12.4936, k: 2, d: 'y'.repeat(400) }
];
const INMETRO = { aPiedi: false, preciso: true };

prova('LA FRASE DI VINCE: stai per arrivare, e cosa c\'è appena esci', () => {
  const w = mondo();
  const d = w.f.prossima(Object.assign({ qui: { lat: 41.8980, lon: 12.4940 }, punti: [CAVOUR], luoghi: LUOGHI }, INMETRO));
  if (!d) { guasto('a quattrocento metri va avvisato'); return; }
  if (!/^Stai per arrivare a Cavour\./.test(d.testo)) guasto('non avvisa: ' + d.testo);
  if (!/Appena esci, Basilica di San Pietro in Vincoli/.test(d.testo)) guasto('non dice cosa c\'è fuori: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('REGOLA 1 — a piedi non se ne occupa: lo fa già parti/passaggi.js', () => {
  const w = mondo();
  if (w.f.prossima({ qui: { lat: 41.8980, lon: 12.4940 }, punti: [CAVOUR], luoghi: LUOGHI, aPiedi: true, preciso: true }))
    guasto('a piedi le fermate le dice un altro');
});

prova('REGOLA 2 — prima si avvisa, poi si dice che ci sei', () => {
  const w = mondo();
  const lontano = w.f.prossima(Object.assign({ qui: { lat: 41.8980, lon: 12.4940 }, punti: [CAVOUR], luoghi: LUOGHI }, INMETRO));
  if (!/Stai per arrivare/.test(lontano.testo)) guasto('da lontano si avvisa');
  w.passano(300000);
  const addosso = w.f.prossima(Object.assign({ qui: { lat: 41.89405, lon: 12.49305 }, punti: [CAVOUR], luoghi: LUOGHI }, INMETRO));
  if (!addosso) { guasto('arrivati, si dice'); return; }
  if (/Stai per arrivare/.test(addosso.testo)) guasto('qui ci sei già: ' + addosso.testo);
  if (!/^Cavour\./.test(addosso.testo)) guasto('dice male: ' + addosso.testo);
});

prova('REGOLA 3 — la stessa fermata non si ripete ogni dieci secondi', () => {
  const w = mondo();
  const qui = { lat: 41.8980, lon: 12.4940 };
  if (!w.f.prossima(Object.assign({ qui, punti: [CAVOUR], luoghi: LUOGHI }, INMETRO))) { guasto('la prima esce'); return; }
  w.passano(20000);
  if (w.f.prossima(Object.assign({ qui, punti: [CAVOUR], luoghi: LUOGHI }, INMETRO)))
    guasto('l\'ha ridetta dopo venti secondi');
  w.passano(400000);
  if (!w.f.prossima(Object.assign({ qui, punti: [CAVOUR], luoghi: LUOGHI }, INMETRO)))
    guasto('tornando indietro sulla stessa linea si può ridire');
});

prova('REGOLA 4 — non si dice due volte la stessa cosa', () => {
  const w = mondo();
  const d = w.f.prossima(Object.assign({ qui: { lat: 41.8902, lon: 12.4925 }, punti: [COLOSSEO], luoghi: LUOGHI }, INMETRO));
  if (!d) { guasto('la fermata c\'era'); return; }
  if (/Appena esci, Colosseo/.test(d.testo)) guasto('«Colosseo. Appena esci, Colosseo»: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('REGOLA 5 — senza precisione non si dice la fermata', () => {
  const w = mondo();
  if (w.f.prossima({ qui: { lat: 41.8980, lon: 12.4940 }, punti: [CAVOUR], luoghi: LUOGHI, aPiedi: false, preciso: false }))
    guasto('sbagliare fermata è peggio che non dirla');
});

prova('quello che non è una fermata non si annuncia', () => {
  const w = mondo();
  const bar = { nome: 'Da Mario', servizio: 'bar', lat: 41.8980, lon: 12.4941 };
  if (w.f.prossima(Object.assign({ qui: { lat: 41.8980, lon: 12.4940 }, punti: [bar], luoghi: LUOGHI }, INMETRO)))
    guasto('ha annunciato un bar come fermata');
});

prova('niente intorno: niente da dire, e non scoppia', () => {
  const w = mondo();
  if (w.f.prossima(Object.assign({ qui: { lat: 41.8980, lon: 12.4940 }, punti: [], luoghi: [] }, INMETRO))) guasto('ha parlato nel vuoto');
  if (w.f.prossima({})) guasto('ha parlato senza niente');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove delle fermate');
process.exit(passate === fatti.length ? 0 : 1);
