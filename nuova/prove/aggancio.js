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

/* ============================================================
   IL PERCORSO — regola 5, 23/10
   «E perche' loro riescono a essere precisi e guidare la macchina e noi
   neanche a camminare» (Vince). Perche' un navigatore sa su quale linea
   stai andando. Quando «portami a» e' accesa, quella linea l'abbiamo
   anche noi.
   ============================================================ */

/* un percorso che va su via Roma e poi gira in via Milano */
const PERCORSO = [[41.9000, 12.4900], [41.9015, 12.4900], [41.9015, 12.49024]];

prova('CON LA GUIDA ACCESA la lettura si posa sul PERCORSO, non sulla via piu vicina', () => {
  const w = mondo();
  /* la lettura cade fra le due vie: via Milano e' a 8 metri, il percorso
     (che va su via Roma) a 12. Vince il percorso, pur essendo il piu'
     lontano dei due — e' quello il senso della regola 5. */
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49014, prec: 8, aPiedi: true }, VIE, PERCORSO);
  if (!d) return guasto('non ha agganciato niente');
  if (!d.sulPercorso) guasto('ha agganciato alle vie invece che al percorso');
  if (Math.abs(d.lon - 12.4900) > 0.00002) guasto('non e finita sulla linea del percorso: ' + d.lon);
  console.log('      → spostata di ' + d.spostato + ' metri, sul percorso');
});

prova('SE SEI LONTANO DAL PERCORSO NON TI CI INCHIODA', () => {
  /* il difetto che questa prova esiste per impedire: uno sbaglia strada,
     cammina su una parallela, e l app gli mette il punto sul percorso
     giusto — cosi la sua posizione sembra perfetta e la guida non si
     accorge mai che e fuori. */
  const w = mondo();
  const LONTANO = [[41.9000, 12.4940], [41.9020, 12.4940]];   // 300 metri di la
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49012, prec: 8, aPiedi: true }, VIE, LONTANO);
  if (d && d.sulPercorso) guasto('lo ha inchiodato a un percorso a 300 metri');
  if (!d) return guasto('ha smesso di agganciare alle vie');
  if (d.via !== 'via Roma') guasto('non e tornata alle vie: ' + d.via);
});

prova('IL PERCORSO NON SALVA UNA LETTURA CHE IL TELEFONO DICE INCERTA', () => {
  const w = mondo();
  if (w.a.aggancia({ lat: 41.9010, lon: 12.49012, prec: 90, aPiedi: true }, VIE, PERCORSO)) {
    guasto('ha agganciato al percorso una lettura a 90 metri di errore');
  }
});

prova('IN MACCHINA NON SI AGGANCIA NEANCHE AL PERCORSO', () => {
  const w = mondo();
  if (w.a.aggancia({ lat: 41.9010, lon: 12.49012, prec: 8, aPiedi: false }, VIE, PERCORSO)) {
    guasto('ha agganciato in macchina');
  }
});

prova('CON IL PERCORSO E SENZA VIE funziona comunque', () => {
  /* fuori dalle citta' mappate le vie possono non esserci: il percorso
     basta da solo. */
  const w = mondo();
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49008, prec: 8, aPiedi: true }, [], PERCORSO);
  if (!d || !d.sulPercorso) guasto('senza vie non ha usato il percorso');
});

prova('IL PERCORSO NON CANCELLA LA VIA SU CUI SEI', () => {
  /* il nome della via serve a chi parla: la linea e geometria e non ha
     nomi, e chi ci sta sopra non ha cambiato strada. */
  const w = mondo();
  w.a.aggancia({ lat: 41.9005, lon: 12.49002, prec: 8, aPiedi: true }, VIE);
  if (w.a.laVia() !== 'via Roma') return guasto('non aveva la via di prima');
  w.passano(3000);
  const d = w.a.aggancia({ lat: 41.9010, lon: 12.49008, prec: 8, aPiedi: true }, VIE, PERCORSO);
  if (!d || !d.sulPercorso) return guasto('non ha agganciato al percorso');
  if (d.via !== 'via Roma') guasto('ha perso il nome della via: ' + d.via);
});

prova('IL GPS CHE RIMBALZA SUI PALAZZI: a distanza ferma, dopo otto secondi si aggancia', () => {
  /* in un vicolo il segnale arriva riflesso e il punto si sposta sempre
     dallo stesso lato, di quindici metri. Non e' rumore: e' un errore
     fisso, e si vede perche' la distanza non cambia. */
  const w = mondo();
  const dlon = 15 / (111320 * Math.cos(41.9 * Math.PI / 180));
  let agganciato = null, primi = 0;
  for (let i = 0; i < 14; i++) {
    const lat = 41.9000 + (i * 1.4) / 111320;
    const d = w.a.aggancia({ lat, lon: 12.4900 + dlon, prec: 8, aPiedi: true }, [], PERCORSO);
    if (i < 8 && d) primi++;
    if (i >= 9 && d) agganciato = d;
    w.passano(1000);
  }
  if (primi) guasto('ha agganciato subito, senza aspettare di vedere se la distanza era ferma');
  if (!agganciato) return guasto('non ha mai agganciato: in un vicolo resti a quindici metri da dove sei');
  console.log('      → dopo otto secondi a distanza ferma: riportato indietro di ' + agganciato.spostato + ' m');
});

prova('MA SE TI ALLONTANI SEMPRE DI PIU, hai sbagliato strada e non ti si aggancia', () => {
  /* questa e la prova che tiene onesta quella di sopra: chi ha preso
     un'altra via si allontana di passo in passo, e la sua posizione
     deve restare dove e, perche la guida si accorga che e fuori. */
  const w = mondo();
  const perMetro = 1 / (111320 * Math.cos(41.9 * Math.PI / 180));
  let agganci = 0;
  for (let i = 0; i < 16; i++) {
    const lontano = 2 + i * 1.4;                       // si allontana camminando
    const d = w.a.aggancia({ lat: 41.9010, lon: 12.4900 + lontano * perMetro, prec: 8, aPiedi: true },
                           [], PERCORSO);
    if (d && lontano > 12) agganci++;
    w.passano(1000);
  }
  if (agganci) guasto('lo ha inchiodato al percorso mentre se ne andava: ' + agganci + ' volte');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dell\'aggancio');
process.exit(passate === fatti.length ? 0 : 1);
