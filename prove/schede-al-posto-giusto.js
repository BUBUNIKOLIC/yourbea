/* La scheda parla del monumento su cui sta?
   Il 15/10 ho scritto 187 approfondimenti cercando i luoghi per NOME, e i
   nomi si ripetono: il testo della cattedrale di Bari e' finito su quella di
   Venafro, quello di San Sebastiano di Mantova pure. Da allora i luoghi si
   cercano per coordinata, e questa prova controlla il resto: se una scheda
   nomina una citta' diversa da quella dove sta il luogo, va guardata. */
const fs = require('fs');
const path = require('path');
const sorgente = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const i = sorgente.indexOf('var POI=[');
let j = sorgente.indexOf('[', i), liv = 0, k = j;
for (; k < sorgente.length; k++) {
  if (sorgente[k] === '[') liv++;
  else if (sorgente[k] === ']') { liv--; if (liv === 0) break; }
}
const POI = eval(sorgente.slice(j, k + 1));

const CITTA = [
  ['Roma', 41.9028, 12.4964, 25], ['Napoli', 40.8518, 14.2681, 14],
  ['Torre del Greco', 40.7890, 14.3700, 5], ['Venafro', 41.4840, 14.0420, 6],
  ['Firenze', 43.7730, 11.2558, 10], ['Venezia', 45.4400, 12.3300, 8],
  ['Milano', 45.4642, 9.1900, 12], ['Torino', 45.0700, 7.6900, 12],
  ['Genova', 44.4100, 8.9300, 12], ['Bologna', 44.4940, 11.3420, 10],
  ['Verona', 45.4400, 10.9900, 8], ['Padova', 45.4100, 11.8800, 8],
  ['Parma', 44.8015, 10.3279, 8], ['Siena', 43.3180, 11.3310, 6],
  ['Lucca', 43.8430, 10.5050, 6], ['Mantova', 45.1600, 10.7900, 6],
  ['Ferrara', 44.8380, 11.6200, 6], ['Ravenna', 44.4180, 12.2030, 8],
  ['Urbino', 43.7260, 12.6360, 5], ['Assisi', 43.0700, 12.6200, 5],
  ['Orvieto', 42.7180, 12.1100, 5], ['Matera', 40.6670, 16.6040, 6],
  ['Siracusa', 37.0600, 15.2900, 8], ['Lecce', 40.3520, 18.1730, 7],
  ['Bari', 41.1280, 16.8670, 10], ['Palermo', 38.1157, 13.3614, 14],
  ['Catania', 37.5020, 15.0870, 12], ['Cagliari', 39.2180, 9.1170, 10],
  ['Trieste', 45.6500, 13.7800, 10], ['Rimini', 44.0600, 12.5700, 8],
  ['Spoleto', 42.7330, 12.7380, 6],
];
const dist = (a, b, c, d) => Math.hypot((a - c) * 111, (b - d) * 111 * Math.cos((a * Math.PI) / 180));
function dove(p) {
  for (const [nome, la, lo, r] of CITTA) if (dist(p.lat, p.lon, la, lo) < r) return nome;
  return null;
}
/* Guardate a mano e giuste: il confronto con un'altra citta' fa parte del
   racconto. Si tolgono dall'elenco per non coprire quelle vere. */
const GIUSTE = new Set(['Teatro romano di Verona']);
let sospette = [];
for (const p of POI) {
  if (!p.a || p.a.length < 40) continue;
  const sua = dove(p);
  if (!sua) continue;
  for (const [nome] of CITTA) {
    if (nome === sua) continue;
    // la scheda cita un'altra citta' per nome
    const re = new RegExp('\\b' + nome.replace(/ /g, '\\s') + '\\b');
    if (!re.test(p.a)) continue;
    // citarla di sfuggita e' lecito («il modello venne da Firenze»):
    // conta solo se la nomina piu' volte della propria, o se la propria
    // non compare mai e l'altra sta nelle prime righe
    const quanteAltra = (p.a.match(new RegExp(nome, 'g')) || []).length;
    const quanteSua = (p.a.match(new RegExp(sua, 'g')) || []).length;
    // si segnala solo se la scheda non nomina MAI la propria citta' e
    // nomina l'altra almeno due volte: se no saltano fuori i casi giusti,
    // come la tomba di Dante a Ravenna che parla di Firenze
    if (quanteSua === 0 && quanteAltra >= 2 && p.a.slice(0, 400).match(re)) {
      if (!GIUSTE.has(p.n)) sospette.push(`${p.n} (sta a ${sua}) parla di ${nome} ${quanteAltra} volte`);
      break;
    }
  }
}
if (sospette.length) {
  console.log('NO  schede che parlano di un\'altra citta\': ' + sospette.length);
  sospette.forEach((x) => console.log('      - ' + x));
} else {
  console.log('SI  ogni approfondimento parla della citta\' in cui sta');
}
// e i nomi ripetuti con approfondimenti diversi: vanno guardati a vista
const perNome = {};
POI.forEach((p) => { if (p.a) (perNome[p.n] = perNome[p.n] || []).push(p); });
const doppi = Object.entries(perNome).filter(([, l]) => l.length > 1);
if (doppi.length) console.log('--  nomi uguali con approfondimento, da tenere d\'occhio: ' +
                              doppi.map(([n, l]) => n + ' ×' + l.length).join(', '));
process.exit(sospette.length ? 1 : 0);
