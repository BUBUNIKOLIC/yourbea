/* LE PROVE DEI PERCORSI SUOI — nuova Yourbea
   «Forse per un non vedente può essere utile segnare i percorsi che fa
   abitualmente: casa, bar, edicola, comune, parenti… qui ho la panchina,
   qui c'è un attraversamento» (Vince, 21/10).
   «Penso sia la migliore idea che ho avuto per ovviare al problema» — e il
   problema era: se diciamo che c'è un attraversamento e non c'è?
   Si lancia:  node nuova/prove/percorsiMiei.js                           */

'use strict';
const PercorsiMiei = require('../parti/percorsiMiei.js');

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
  const p = PercorsiMiei({ dist, ora: () => adesso });
  return { p, passano(ms) { adesso += ms; }, quando: () => adesso };
}
/* una camminata vera: duecento metri verso nord, un punto ogni dieci */
const CASA = { lat: 41.82315, lon: 12.48142 };
function avanti(n) { return { lat: CASA.lat + n * 0.00009, lon: CASA.lon }; }

function registraIlPercorso(w, segni) {
  w.p.comincia('edicola', CASA);
  for (let i = 1; i <= 22; i++) {
    const q = avanti(i);
    w.p.passo(q);
    const s = (segni || []).find((x) => x.a === i);
    if (s) w.p.segna(q, s.n);
  }
  return w.p.finisci();
}

prova('SI REGISTRA CAMMINANDO, coi suoi segni e le sue parole', () => {
  const w = mondo();
  const d = registraIlPercorso(w, [{ a: 8, n: 'qui ho la panchina' }, { a: 16, n: 'qui c\'è un attraversamento' }]);
  if (!d || d.tipo !== 'percorso-fatto') { guasto('non ha registrato: ' + JSON.stringify(d)); return; }
  if (d.percorso.segni.length !== 2) guasto('i segni erano due');
  if (d.percorso.segni[0].n !== 'qui ho la panchina') guasto('le parole sono sue, non nostre');
  if (!/2 punti segnati/.test(d.testo)) guasto('dice male: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('UN PERCORSO TROPPO CORTO non si salva: non e un percorso', () => {
  const w = mondo();
  w.p.comincia('niente', CASA);
  const d = w.p.finisci();
  if (!d || d.tipo !== 'percorso-corto') guasto('due passi non sono un percorso: ' + JSON.stringify(d));
});

prova('SEGUENDOLO dice QUANTO MANCA al prossimo segno, mai «sei qui»', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'qui ho la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  /* a metà strada dalla panchina */
  const d = w.p.passoSuPercorso(avanti(3), w.quando());
  if (!d) { guasto('deve dire quanto manca'); return; }
  if (/sei (in|qui|al)/i.test(d.testo)) guasto('non deve dire dove sei: ' + d.testo);
  if (!/^Fra \d+ passi, qui ho la panchina/.test(d.testo)) guasto('dice male: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('ARRIVATO AL SEGNO lo dice con le sue parole', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'qui c\'è un attraversamento' }]);
  w.p.segui(fatto.percorso, CASA);
  w.p.passoSuPercorso(avanti(3), w.quando());      // l'avviso da lontano
  const d = w.p.passoSuPercorso(avanti(8), w.quando());
  if (!d) { guasto('arrivati al segno, si dice'); return; }
  if (!/attraversamento/.test(d.testo)) guasto('dice male: ' + d.testo);
  if (!d.avviso) guasto('un segno suo è un avviso: non si spegne e non aspetta');
});

prova('LO STESSO SEGNO non si ripete camminandoci dentro', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  let quante = 0;
  for (let i = 1; i <= 12; i++) {
    const d = w.p.passoSuPercorso(avanti(i), w.quando());
    if (d && /panchina/.test(d.testo)) quante++;
    w.passano(4000);
  }
  if (quante > 2) guasto('ha ripetuto la panchina ' + quante + ' volte');
});

prova('FUORI DAL PERCORSO lo dice, e dice di quanto', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  const lontano = { lat: CASA.lat + 0.0005, lon: CASA.lon + 0.0012 };
  w.p.passoSuPercorso(lontano, w.quando());
  w.passano(20000);
  const d = w.p.passoSuPercorso(lontano, w.quando());
  if (!d) { guasto('deve accorgersene'); return; }
  if (!/allontanato di \d+ metri/.test(d.testo)) guasto('dice male: ' + d.testo);
});

prova('ARRIVATI, lo dice una volta sola', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, []);
  w.p.segui(fatto.percorso, CASA);
  const d = w.p.passoSuPercorso(avanti(22), w.quando());
  if (!d || d.tipo !== 'percorso-arrivato') { guasto('arrivati: ' + JSON.stringify(d)); return; }
  w.passano(5000);
  if (w.p.passoSuPercorso(avanti(22), w.quando())) guasto('lo ha ridetto');
});

prova('SI RITROVA COL NOME, anche detto in un altro modo', () => {
  const w = mondo();
  registraIlPercorso(w, []);
  if (!w.p.trova('edicola')) guasto('«edicola»');
  if (!w.p.trova("all'edicola")) guasto('«all\'edicola»');
  if (!w.p.trova('Edicola')) guasto('con la maiuscola');
  if (w.p.trova('farmacia')) guasto('ha trovato un percorso che non c\'è');
});

prova('LA MISURA E QUANTO HAI CAMMINATO, non dove sei', () => {
  /* è la ragione tecnica per cui questo funziona dove il resto sbaglia:
     scostandosi di dodici metri di lato — un errore GPS normale — il
     conto lungo il percorso non si sposta quasi */
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 14, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  /* a nove passi dalla panchina, ma dodici metri di lato */
  const sbandato = { lat: avanti(10).lat, lon: avanti(10).lon + 0.00014 };
  const d = w.p.passoSuPercorso(sbandato, w.quando());
  if (!d) { guasto('con dodici metri di scarto deve ancora funzionare'); return; }
  if (!/Fra \d+ passi, la panchina/.test(d.testo)) guasto('si è perso per dodici metri: ' + d.testo);
});

prova('si salvano e si ricaricano', () => {
  const w = mondo();
  registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  const roba = JSON.parse(JSON.stringify(w.p.perSalvare()));
  const w2 = mondo();
  if (w2.p.carica(roba) !== 1) guasto('non si è ricaricato');
  if (!w2.p.trova('edicola')) guasto('il nome si è perso');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei percorsi suoi');
process.exit(passate === fatti.length ? 0 : 1);
