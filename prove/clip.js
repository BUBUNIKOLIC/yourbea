/* Controlla che ogni pezzo di voce che l'app può pronunciare esista
   davvero come clip incisa. Se manca, l'app ripiega sulla voce del
   telefono: nello stesso annuncio si sentono due voci diverse. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const pagina = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cartella = path.join(root, 'voce', 'clip', 'it');
const incise = new Set(
  fs.readdirSync(cartella).filter((f) => f.endsWith('.m4a')).map((f) => f.slice(0, -4))
);

let guasti = 0;

// 1. gli id scritti a mano nel codice
const citate = new Set(
  (pagina.match(/'(?:frase|card|dir|m|dl|poi|percorso)-[a-z0-9\-àèéìòóù']+'/g) || [])
    .map((x) => x.slice(1, -1))
);
const mancanti = [...citate].filter((id) => !incise.has(id));
if (mancanti.length) {
  guasti++;
  console.log('NO  clip citate nel codice e mai incise: ' + mancanti.length);
  mancanti.slice(0, 20).forEach((m) => console.log('      - ' + m));
} else {
  console.log('SI  ogni clip citata nel codice esiste');
}

// 2. l'elenco dei testi e le clip sul disco devono combaciare
const testi = JSON.parse(fs.readFileSync(path.join(root, 'voce', 'testi.json'), 'utf8'));
const senza = testi.filter((t) => !incise.has(t.id));
if (senza.length) {
  guasti++;
  console.log('NO  voci in testi.json senza clip incisa: ' + senza.length);
  senza.slice(0, 20).forEach((t) => console.log('      - ' + t.id));
  console.log('      rimedio: voce/genera-voce.sh "Alice (Enhanced)" it');
} else {
  console.log('SI  tutte le ' + testi.length + ' voci di testi.json sono incise');
}

// 3. clip vuote o troncate: una clip di pochi byte non si sente
const corte = [...incise].filter((id) => {
  try { return fs.statSync(path.join(cartella, id + '.m4a')).size < 1200; } catch (e) { return false; }
});
if (corte.length) {
  guasti++;
  console.log('NO  clip troppo corte per contenere una voce: ' + corte.length);
  corte.slice(0, 20).forEach((c) => console.log('      - ' + c));
} else {
  console.log('SI  nessuna clip vuota o troncata');
}

process.exit(guasti ? 1 : 0);
