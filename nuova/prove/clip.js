/* LE PROVE DELLE CLIP — nuova Yourbea
   Questa è la prova più severa che abbiamo: i nomi che l'app chiede devono
   esistere DAVVERO fra i 4.257 file incisi con Alice. Non si finge niente:
   si guarda nella cartella.
   Si lancia:  node nuova/prove/clip.js                                       */

'use strict';
const fs = require('fs');
const path = require('path');
const Clip = require('../parti/clip.js');

const CARTELLA = path.join(__dirname, '..', '..', 'voce', 'clip', 'it');
const LUOGHI = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'dati', 'luoghi.json'), 'utf8'));

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.slice(0, 6).forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
const esiste = (c) => fs.existsSync(path.join(CARTELLA, c + '.m4a'));
const clip = Clip();

prova('la cartella delle clip c\'è e sono tante', () => {
  if (!fs.existsSync(CARTELLA)) return guasto('non trovo ' + CARTELLA);
  const quante = fs.readdirSync(CARTELLA).filter((f) => f.endsWith('.m4a')).length;
  if (quante < 4000) guasto('solo ' + quante + ' clip: me ne aspettavo più di quattromila');
});

prova('ogni luogo ha il nome delle sue clip scritto nei dati', () => {
  const senza = LUOGHI.filter((p) => !p.c);
  if (senza.length) guasto(senza.length + ' luoghi senza il campo c, per esempio: ' + senza[0].n);
});

prova('IL NOME E LA SCHEDA DI OGNI LUOGO SONO INCISI', () => {
  let mancanti = 0;
  LUOGHI.forEach((p) => {
    if (!esiste(p.c + '-nome')) { if (mancanti < 4) guasto('manca ' + p.c + '-nome (' + p.n + ')'); mancanti++; }
    if (p.d && !esiste(p.c + '-scheda')) { if (mancanti < 4) guasto('manca ' + p.c + '-scheda (' + p.n + ')'); mancanti++; }
  });
  if (mancanti) guasto('in tutto mancano ' + mancanti + ' clip di nome o scheda');
});

prova('OGNI APPROFONDIMENTO SCRITTO È ANCHE INCISO', () => {
  const conA = LUOGHI.filter((p) => p.a);
  let mancanti = conA.filter((p) => !esiste(p.c + '-ancora'));
  if (mancanti.length) guasto(mancanti.length + ' approfondimenti senza clip, per esempio ' + mancanti[0].n);
  if (conA.length < 500) guasto('solo ' + conA.length + ' approfondimenti: me ne aspettavo più di cinquecento');
});

prova('ogni «cosa vedere» scritto è anche inciso', () => {
  const conI = LUOGHI.filter((p) => p.i);
  const mancanti = conI.filter((p) => !esiste(p.c + '-dentro'));
  if (mancanti.length) guasto(mancanti.length + ' «cosa vedere» senza clip, per esempio ' + mancanti[0].n);
});

prova('le direzioni e i metri che l\'app può chiedere esistono tutti', () => {
  // tutte le direzioni possibili, girando di dieci gradi
  for (let r = -180; r <= 180; r += 10) {
    const c = clip.direzione(r, true, null);
    if (!c) { guasto('nessuna clip per la direzione ' + r); continue; }
    if (!esiste(c)) guasto('manca la clip di direzione ' + c + ' (per ' + r + ' gradi)');
  }
  /* e quando NON si sa come sei girato non si chiede nessuna clip di
     direzione: «ma io non so nord sud est dove sono» (Vince, 16/10). Le
     clip card-a-nord restano incise, ma non le chiama più nessuno. */
  ['a nord', 'a sud-ovest', null].forEach((p) => {
    if (clip.direzione(0, false, p)) guasto('ha chiesto un punto cardinale: ' + clip.direzione(0, false, p));
  });
  // i metri, di dieci in dieci
  for (let m = 5; m < 1000; m += 7) {
    const c = clip.metri(m);
    if (c && !esiste(c)) guasto('manca la clip dei metri ' + c + ' (per ' + m + ' m)');
  }
});

prova('le frasi fisse che l\'app compone esistono', () => {
  ['frase-chiedi', 'frase-cosa-vedere'].forEach((c) => { if (!esiste(c)) guasto('manca ' + c); });
});

prova('LA FILA COMPLETA DI UN CENNO: tutte le clip esistono', () => {
  const p = LUOGHI.find((x) => x.n === 'Battistero di Parma') || LUOGHI[0];
  const fila = clip.per({ tipo: 'cenno', luogo: p, rel: 35, metri: 82, direzioneBuona: true });
  if (!fila || !fila.length) return guasto('nessuna clip per il cenno');
  fila.forEach((c) => { if (!esiste(c)) guasto('nella fila manca ' + c); });
  if (fila[fila.length - 1] !== 'frase-chiedi') guasto('il cenno deve finire con la domanda');
});

prova('la fila della scheda, del cosa vedere e dell\'approfondimento', () => {
  const p = LUOGHI.find((x) => x.a && x.i && x.d);
  if (!p) return guasto('nessun luogo con tutti e tre i gradini');
  [['scheda', 2], ['cosa-vedere', 2], ['approfondimento', 1]].forEach(([tipo, quante]) => {
    const fila = clip.per({ tipo: tipo, luogo: p });
    if (!fila || fila.length !== quante) return guasto(tipo + ': fila sbagliata ' + JSON.stringify(fila));
    fila.forEach((c) => { if (!esiste(c)) guasto(tipo + ': manca ' + c); });
  });
});

prova('un luogo di Wikipedia, che non ha clip, non ne chiede', () => {
  const fila = clip.per({ tipo: 'cenno', luogo: { n: 'Museo della Terra Pontina', lat: 0, lon: 0 }, rel: 0, metri: 80, direzioneBuona: true });
  if (fila) guasto('ha chiesto clip per un luogo senza clip: parlerà la voce di sistema, e va bene');
});

/* ---------- il conto ---------- */
const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove delle clip');
process.exit(passate === fatti.length ? 0 : 1);
