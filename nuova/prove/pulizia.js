/* LE PROVE DELLA PULIZIA — nuova Yourbea
   «Fai in modo che chi scarica la nuova butti in automatico la vecchia».
   La prova che conta è quella che impedisce di buttare la roba della NUOVA:
   è già successo una volta, il 15/10, col worker che si spegneva.
   Si lancia:  node nuova/prove/pulizia.js                                   */

'use strict';
const Pulizia = require('../parti/pulizia.js');
const p = Pulizia();

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

prova('butta le casseforti della vecchia, MAI quelle della nuova', () => {
  const via = p.casseforti(['yourbea-v103', 'urbea-v12', 'yourbea-nuova-v24', 'altro']);
  if (via.indexOf('yourbea-nuova-v24') >= 0) guasto('ha buttato la cassaforte della nuova: è già successo una volta');
  if (via.length !== 3) guasto('doveva buttare le altre tre: ' + via.join(', '));
});

prova('spegne il worker della vecchia e lascia vivere quello della nuova', () => {
  if (!p.spegnereIlWorker('https://bubunikolic.github.io/yourbea/')) guasto('quello della radice governa tutto: va spento');
  if (p.spegnereIlWorker('https://bubunikolic.github.io/yourbea/nuova/')) guasto('ha spento il worker della nuova');
});

prova('butta le chiavi della vecchia e non tocca le nostre', () => {
  const via = p.chiaviDaButtare(['urbea-casa', 'urbea-soccorso', 'yourbea-diario', 'yourbea2-casa', 'yourbea2-contatto', 'altra-roba']);
  if (via.indexOf('yourbea2-casa') >= 0 || via.indexOf('yourbea2-contatto') >= 0) guasto('ha buttato le chiavi della nuova');
  if (via.indexOf('altra-roba') >= 0) guasto('ha buttato roba che non è nostra');
  if (via.length !== 3) guasto('doveva buttare le tre della vecchia: ' + via.join(', '));
});

prova('il contatto di soccorso si travasa, non si fa riscrivere', () => {
  const t = p.travaso({ soccorso: { n: 'Mariolina', tel: '+393331234567' } }, {});
  if (!t.contatto || t.contatto.nome !== 'Mariolina') guasto('ha perso il nome');
  if (!t.contatto || t.contatto.telefono !== '+393331234567') guasto('ha perso il numero');
});

prova('casa della vecchia era un punto, e il punto si tiene', () => {
  const t = p.travaso({ casa: { lat: 41.9, lon: 12.5, n: 'casa' } }, {});
  if (!t.casaPunto || t.casaPunto.lat !== 41.9) guasto('ha perso casa');
});

prova('quello che la nuova ha già non si tocca: è più recente', () => {
  const t = p.travaso(
    { soccorso: { n: 'Vecchio', tel: '+390000' }, casa: { lat: 1, lon: 2 }, testo: 'grande' },
    { contatto: { nome: 'Nuovo', telefono: '+391111' }, casa: 'Via Gioberti, Latina', testo: 'enorme' });
  if (t.contatto) guasto('ha sovrascritto il contatto nuovo con quello vecchio');
  if (t.casaPunto) guasto('ha sovrascritto casa');
  if (t.testo) guasto('ha sovrascritto la grandezza del testo');
});

prova('una grandezza di testo che non conosciamo non si travasa', () => {
  const t = p.travaso({ testo: 'gigantesco' }, {});
  if (t.testo) guasto('si sarebbe portata dietro un valore che la nuova non sa leggere');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della pulizia');
process.exit(passate === fatti.length ? 0 : 1);
