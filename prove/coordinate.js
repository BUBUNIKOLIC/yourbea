/* Controlli sulle coordinate che si possono fare senza rete, in un secondo.
   Il 14/10 tre coordinate sbagliate (Due Torri di Bologna 400 m, San Zeno
   700 m, un segnaposto 40.0/11.0 in un percorso di Firenze) sono passate
   e le ho trovate solo dopo. Per una guida a chi non vede, mandare nel
   posto sbagliato è peggio che tacere.
   Il confronto con Wikidata (che ha bisogno di rete) resta a parte. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function blocco(nome) {
  const i = src.indexOf('var ' + nome + '=[');
  if (i < 0) throw new Error('non trovo ' + nome);
  let j = src.indexOf('[', i), liv = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '[') liv++;
    else if (src[k] === ']') { liv--; if (liv === 0) break; }
  }
  return eval(src.slice(j, k + 1));
}

const POI = blocco('POI');
const ROUTES = blocco('ROUTES');
let guasti = 0, avvisi = 0;

// l'Italia, con un margine
const DENTRO = (la, lo) => la > 35.2 && la < 47.2 && lo > 6.4 && lo < 18.7;
const R = 6371000, D2R = Math.PI / 180;
function dist(a1, o1, a2, o2) {
  const p1 = a1 * D2R, p2 = a2 * D2R, dp = (a2 - a1) * D2R, dl = (o2 - o1) * D2R;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// 1. luoghi fuori dall'Italia, o senza coordinate
const fuori = POI.filter((p) => !(typeof p.lat === 'number' && typeof p.lon === 'number') || !DENTRO(p.lat, p.lon));
if (fuori.length) {
  guasti++;
  console.log('NO  luoghi con coordinate impossibili: ' + fuori.length);
  fuori.slice(0, 10).forEach((p) => console.log('      - ' + p.n + ' (' + p.lat + ', ' + p.lon + ')'));
} else {
  console.log('SI  tutti i ' + POI.length + ' luoghi cadono in Italia');
}

// 2. segnaposto dimenticati: coordinate troppo tonde
const tondi = [];
POI.forEach((p) => { if (p.lat === Math.round(p.lat * 10) / 10 && p.lon === Math.round(p.lon * 10) / 10) tondi.push(p.n + ' (' + p.lat + ', ' + p.lon + ')'); });
ROUTES.forEach((r) => (r.p || []).forEach((q) => {
  if (q[0] === Math.round(q[0] * 10) / 10 && q[1] === Math.round(q[1] * 10) / 10) tondi.push('percorso ' + r.id + ' → ' + q[0] + ', ' + q[1]);
}));
if (tondi.length) {
  guasti++;
  console.log('NO  coordinate da segnaposto (un solo decimale): ' + tondi.length);
  tondi.slice(0, 10).forEach((t) => console.log('      - ' + t));
} else {
  console.log('SI  nessun segnaposto dimenticato nelle coordinate');
}

// 3. due luoghi diversi sullo stesso punto esatto. Non sono per forza lo
//    stesso posto scritto due volte: più spesso sono due luoghi veri, e uno
//    dei due ha preso in prestito la coordinata dell'altro. Va misurata,
//    non unita.
const visti = new Map(), doppi = [];
POI.forEach((p) => {
  const k = p.lat.toFixed(5) + '/' + p.lon.toFixed(5);
  if (visti.has(k) && visti.get(k) !== p.n) doppi.push(visti.get(k) + ' = ' + p.n + ' (' + k + ')');
  else visti.set(k, p.n);
});
if (doppi.length) {
  guasti++;
  console.log('NO  luoghi diversi sulla stessa coordinata esatta (uno dei due è nel posto sbagliato): ' + doppi.length);
  doppi.slice(0, 10).forEach((d) => console.log('      - ' + d));
} else {
  console.log('SI  nessun luogo copiato sulla coordinata di un altro');
}

// 4. percorsi: ogni punto dovrebbe avere un luogo nostro vicino.
//    I percorsi calcolati su strada hanno nodi di svolta che sforano: è
//    normale, quindi qui è un avviso, non una bocciatura.
let lontani = 0, totPunti = 0;
const peggiori = [];
ROUTES.forEach((r) => (r.p || []).forEach((q) => {
  totPunti++;
  let min = Infinity;
  for (const p of POI) { const d = dist(q[0], q[1], p.lat, p.lon); if (d < min) min = d; }
  if (min > 400) { lontani++; peggiori.push({ r: r.id, d: Math.round(min), q }); }
}));
peggiori.sort((a, b) => b.d - a.d);
if (lontani) {
  avvisi++;
  console.log('--  ' + lontani + ' punti di percorso su ' + totPunti + ' a più di 400 m da ogni luogo (nodi di strada: da guardare se sono tanti)');
  peggiori.slice(0, 5).forEach((p) => console.log('      - percorso ' + p.r + ': ' + p.d + ' m (' + p.q[0] + ', ' + p.q[1] + ')'));
} else {
  console.log('SI  ogni punto dei ' + ROUTES.length + ' percorsi ha un luogo vicino');
}

// 5. percorsi vuoti o di un solo punto
const monchi = ROUTES.filter((r) => !r.p || r.p.length < 2).map((r) => r.id);
if (monchi.length) {
  guasti++;
  console.log('NO  percorsi senza tragitto: ' + monchi.join(', '));
} else {
  console.log('SI  nessun percorso monco');
}

process.exit(guasti ? 1 : 0);
