/* LE PROVE DELL'AVANZAMENTO
   «È fondamentale per guidare un non vedente» (Vince, 23/10/2026).
   Qui si prova il conto su cui sta in piedi tutta la guida: dove sono
   sul percorso, quanto ne ho fatto, qual è la prossima svolta.
   Si lancia:  node nuova/prove/avanzamento.js                        */

'use strict';
const Avanzamento = require('../parti/avanzamento.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

function metri(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const x = (la2 - la1) * r, y = (lo2 - lo1) * r * Math.cos((la1 + la2) / 2 * r);
  return Math.sqrt(x * x + y * y) * R;
}

/* una strada dritta verso nord, cento metri, un punto ogni dieci */
function dritta(da, quanti, passo) {
  const l = [];
  for (let i = 0; i <= quanti; i++) l.push([da[0] + i * passo, da[1]]);
  return l;
}
const DA = [41.9000, 12.4800];
const PASSO = 0.00009;              // circa dieci metri

prova('quanti metri ne ho fatti', () => {
  const a = Avanzamento({});
  const lungo = a.conPercorso(dritta(DA, 10, PASSO));
  if (Math.abs(lungo - 100) > 6) guasto('la linea dovrebbe essere lunga 100 m, e invece ' + Math.round(lungo));
  const d = a.dove(DA[0] + PASSO * 3, DA[1]);
  if (Math.abs(d.metri - 30) > 4) guasto('a trenta metri dice ' + Math.round(d.metri));
  if (d.lontano > 2) guasto('sulla linea, e dice di essere fuori di ' + Math.round(d.lontano));
});

/* IL PONTE MARCONI. Si passa VENTI METRI DI LATO al punto della svolta:
   col vecchio conto — la distanza da un punto — non si entrava mai nel
   cerchio, e la svolta non si consumava mai. */
prova('una svolta passata di lato risulta passata', () => {
  const a = Avanzamento({});
  a.conPercorso(dritta(DA, 10, PASSO));
  a.conSvolte([{ lat: DA[0] + PASSO * 5, lon: DA[1], testo: 'Attraversa il ponte' },
               { lat: DA[0] + PASSO * 9, lon: DA[1], testo: 'Gira a destra' }]);
  /* cammino sulla linea ma spostato di venti metri di lato */
  const lato = 0.00024;
  a.dove(DA[0] + PASSO * 2, DA[1] + lato);
  let p = a.prossima();
  if (!p || !/ponte/.test(p.svolta.testo)) guasto('prima del ponte non lo aspetta');
  a.dove(DA[0] + PASSO * 7, DA[1] + lato);      // l'ho superato, di lato
  p = a.prossima();
  if (!p) { guasto('dopo il ponte non ha piu niente da dire'); return; }
  if (/ponte/.test(p.svolta.testo)) guasto('ripete il ponte che ho gia passato');
  if (!/destra/.test(p.svolta.testo)) guasto('non passa alla svolta dopo: ' + p.svolta.testo);
});

prova('quanto manca alla prossima e una sottrazione, non una diagonale', () => {
  const a = Avanzamento({});
  a.conPercorso(dritta(DA, 10, PASSO));
  a.conSvolte([{ lat: DA[0] + PASSO * 8, lon: DA[1], testo: 'Gira a destra' }]);
  /* trenta metri di lato: in linea d'aria la svolta e' lontanissima,
     ma sul percorso mancano cinquanta metri */
  a.dove(DA[0] + PASSO * 3, DA[1] + 0.00036);
  const p = a.prossima();
  if (!p) { guasto('non trova la svolta'); return; }
  if (Math.abs(p.manca - 50) > 10) guasto('dice che mancano ' + Math.round(p.manca) + ' metri invece di 50');
});

/* FUORI STRADA E' LA DISTANZA DALLA LINEA, non da un punto: in una via
   curva la distanza dal prossimo punto non dice niente. */
prova('fuori strada si misura dalla linea', () => {
  const a = Avanzamento({});
  a.conPercorso(dritta(DA, 10, PASSO));
  const dentro = a.dove(DA[0] + PASSO * 5, DA[1]);
  if (dentro.lontano > 2) guasto('sulla linea dice ' + Math.round(dentro.lontano) + ' m');
  const fuori = a.dove(DA[0] + PASSO * 5, DA[1] + 0.0009);   // settantacinque metri di lato
  if (fuori.lontano < 50) guasto('settantacinque metri fuori e dice ' + Math.round(fuori.lontano));
});

/* NON SI TORNA INDIETRO PER IL GPS CHE BALLA: se il numero scendesse e
   salisse, la prossima svolta cambierebbe avanti e indietro, e chi non
   vede si fermerebbe in mezzo alla strada. */
prova('il GPS che balla non fa tornare indietro il conto', () => {
  const a = Avanzamento({});
  a.conPercorso(dritta(DA, 20, PASSO));
  a.dove(DA[0] + PASSO * 10, DA[1]);
  const prima = a.fatti();
  a.dove(DA[0] + PASSO * 9.5, DA[1]);     // cinque metri indietro: e' il GPS
  if (a.fatti() < prima - 1) guasto('e tornato indietro di ' + Math.round(prima - a.fatti()) + ' m');
});

prova('ma se torni davvero indietro, il conto ti segue', () => {
  const a = Avanzamento({});
  a.conPercorso(dritta(DA, 20, PASSO));
  a.dove(DA[0] + PASSO * 15, DA[1]);
  a.dove(DA[0] + PASSO * 5, DA[1]);       // cento metri indietro: ci sei tornato
  if (a.fatti() > 70) guasto('resta a ' + Math.round(a.fatti()) + ' m come se non fossi tornato');
});

prova('senza percorso non si inventa niente', () => {
  const a = Avanzamento({});
  const d = a.dove(41.9, 12.48);
  if (d.suLinea) guasto('dice di essere su una linea che non c e');
  if (a.prossima()) guasto('si inventa una svolta');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dell\'avanzamento');
process.exit(passate === fatti.length ? 0 : 1);
