/* Prova dei servizi: per ogni tipo che l'app sa dire, da piu' punti d'Italia,
   si verifica che la risposta sia DAVVERO di quel tipo e davvero vicina.
   Nasce il 15/10 dopo che «tabaccheria» rispondeva «Banca Fideuram» e
   «bagno» rispondeva con il nome di una via: mandare un non vedente nel
   posto sbagliato e' la cosa peggiore che questa app possa fare.
   Si lancia da solo dentro ./PROVA-TUTTO.command --rete */
const fs = require('fs');
const path = require('path');
const radice = path.join(__dirname, '..');
const sorgente = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

function tavola(nome) {
  const i = sorgente.indexOf('var ' + nome + '=');
  if (i < 0) throw new Error('non trovo ' + nome);
  let j = sorgente.indexOf('{', i), liv = 0, k = j;
  for (; k < sorgente.length; k++) {
    if (sorgente[k] === '{') liv++;
    else if (sorgente[k] === '}') { liv--; if (liv === 0) break; }
  }
  return eval('(' + sorgente.slice(j, k + 1) + ')');
}
const PAROLA = tavola('PAROLA_OSM');
const ATTESO = tavola('TIPO_ATTESO');

const PUNTI = [
  ['Roma, via dei Corazzieri', 41.82301, 12.48121],
  ['Napoli, Spaccanapoli', 40.84850, 14.25600],
  ['Firenze, Duomo', 43.77306, 11.25583],
];
const d = (a, b, c, e) => Math.hypot((a - c) * 111320, (b - e) * 111320 * Math.cos(a * Math.PI / 180));

function delTipoGiusto(tipo, x) {
  const atteso = ATTESO[tipo];
  if (!atteso) return true;
  const t = (x.type || '') + '|' + (x.class || '');
  return atteso.split('|').some((p) => t.indexOf(p) >= 0);
}

async function cerca(tipo, la, lo) {
  const parola = PAROLA[tipo];
  if (!parola) return { errore: 'manca la parola per la ricerca' };
  const dla = 0.009, dlo = 0.012 / Math.cos((la * Math.PI) / 180);
  const vb = `${lo - dlo},${la + dla},${lo + dlo},${la - dla}`;
  const u = 'https://nominatim.openstreetmap.org/search?format=json&limit=20&bounded=1' +
            '&q=' + encodeURIComponent('[' + parola + ']') + '&viewbox=' + encodeURIComponent(vb);
  let risposta;
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Yourbea/1.0 (viarkdimeglio@gmail.com)' } });
    risposta = await r.json();
  } catch (e) { return { errore: 'la fonte non risponde' }; }
  let buoni = 0, scartati = 0, best = null;
  for (const x of risposta) {
    if (!delTipoGiusto(tipo, x)) { scartati++; continue; }
    buoni++;
    const m = d(la, lo, parseFloat(x.lat), parseFloat(x.lon));
    if (!best || m < best.m) best = { m, nome: (x.display_name || '').split(',')[0], tipo: x.type };
  }
  return { buoni, scartati, best };
}

(async () => {
  const tipi = Object.keys(PAROLA);
  console.log(`— i servizi, ${tipi.length} tipi su ${PUNTI.length} punti (serve rete) —`);
  let guasti = [], vuoti = [];
  for (const tipo of tipi) {
    const righe = [];
    for (const [dove, la, lo] of PUNTI) {
      const r = await cerca(tipo, la, lo);
      await new Promise((s) => setTimeout(s, 1300));
      if (r.errore) { righe.push('?'); continue; }
      if (!r.best) { righe.push('—'); continue; }
      righe.push(Math.round(r.best.m) + ' m');
      if (r.best.m > 1600) guasti.push(`${tipo} a ${dove}: il piu vicino e a ${Math.round(r.best.m)} m`);
    }
    if (righe.every((x) => x === '—')) vuoti.push(tipo);
    console.log(`  ${tipo.padEnd(22)} ${righe.map((x) => x.padStart(8)).join('')}`);
  }
  console.log('');
  if (guasti.length) { console.log('NO  risposte troppo lontane:'); guasti.forEach((g) => console.log('      - ' + g)); }
  else console.log('SI  nessuna risposta piu lontana di 1,6 km');
  if (vuoti.length) console.log('--  tipi che in nessuno dei punti esistono (puo essere giusto): ' + vuoti.join(', '));
  else console.log('SI  ogni tipo trovato almeno in un punto');
  process.exit(guasti.length ? 1 : 0);
})();
