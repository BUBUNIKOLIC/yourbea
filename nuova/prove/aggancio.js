/* LE PROVE DELL'AGGANCIO ALLA STRADA — nuova Yourbea
   «La APP deve avere una posizione precisa» (Vince, 23/10, regola 1).
   Si lancia:  node nuova/prove/aggancio.js                            */

'use strict';
const Aggancio = require('../parti/aggancio.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* due vie parallele a venti metri l'una dall'altra, come in un centro */
const ROMA = { nome: 'via Roma', punti: [[41.9000, 12.4900], [41.9020, 12.4900]] };
const MILANO = { nome: 'via Milano', punti: [[41.9000, 12.49024], [41.9020, 12.49024]] };
const VIE = [ROMA, MILANO];

function mondo(t) {
  let adesso = t || 1000000;
  return { a: Aggancio({ ora: () => adesso }), passano(ms) { adesso += ms; } };
}

prova('CAMMINANDO, la lettura si posa sulla strada', () => {
  const w = mondo();
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49012, prec: 10, aPiedi: true }, VIE);
  if (!d) return guasto('non ha agganciato niente');
  if (d.via !== 'via Roma') guasto('l ha messa sulla via sbagliata: ' + d.via);
  if (Math.abs(d.lon - 12.4900) > 0.00002) guasto('non e finita sulla linea: ' + d.lon);
  console.log('      → spostata di ' + d.spostato + ' metri, su ' + d.via);
});

prova('UNA LETTURA CHE IL TELEFONO DICE INCERTA NON SI AGGANCIA', () => {
  /* mettere un punto incerto sopra una strada lo fa SEMBRARE sicuro:
     e peggio che lasciarlo dov e */
  const w = mondo();
  if (w.a.aggancia({ lat: 41.9010, lon: 12.49012, prec: 90, aPiedi: true }, VIE)) {
    guasto('ha agganciato una lettura a 90 metri di errore');
  }
});

prova('IN MACCHINA NON SI AGGANCIA: la strada e un altra', () => {
  const w = mondo();
  if (w.a.aggancia({ lat: 41.9010, lon: 12.49012, prec: 8, aPiedi: false }, VIE)) {
    guasto('ha agganciato mentre eri su un mezzo');
  }
});

prova('DA LONTANO SI LASCIA STARE: magari sei in un parco', () => {
  const w = mondo();
  if (w.a.aggancia({ lat: 41.9010, lon: 12.4920, prec: 8, aPiedi: true }, VIE)) {
    guasto('ha agganciato una via a piu di cento metri');
  }
});

prova('NON SI SALTA DA UNA VIA ALL ALTRA a ogni lettura', () => {
  /* due vie parallele a venti metri: camminando in mezzo, il GPS che
     balla farebbe rimbalzare la posizione da una all altra */
  const w = mondo();
  w.a.aggancia({ lat: 41.9008, lon: 12.49004, prec: 8, aPiedi: true }, VIE);
  if (w.a.laVia() !== 'via Roma') return guasto('non ha preso via Roma: ' + w.a.laVia());
  w.passano(4000);
  // adesso il GPS sbanda di poco verso l altra via: non deve cambiare
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49013, prec: 8, aPiedi: true }, VIE);
  if (!d) return guasto('ha smesso di agganciare');
  if (d.via !== 'via Roma') guasto('e saltata su ' + d.via + ' per tre metri di differenza');
});

prova('MA SE GIRI DAVVERO, la via cambia', () => {
  const w = mondo();
  w.a.aggancia({ lat: 41.9008, lon: 12.49002, prec: 8, aPiedi: true }, VIE);
  w.passano(5000);
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49023, prec: 8, aPiedi: true }, VIE);
  if (!d || d.via !== 'via Milano') guasto('non si e accorta che hai cambiato strada: ' + (d && d.via));
});

prova('SENZA VIE NON SUCCEDE NIENTE', () => {
  const w = mondo();
  if (w.a.aggancia({ lat: 41.9010, lon: 12.4901, prec: 8, aPiedi: true }, [])) guasto('ha inventato una via');
  if (w.a.aggancia({ lat: 41.9010, lon: 12.4901, prec: 8, aPiedi: true }, null)) guasto('e scoppiata con niente');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dell\'aggancio');
process.exit(passate === fatti.length ? 0 : 1);
