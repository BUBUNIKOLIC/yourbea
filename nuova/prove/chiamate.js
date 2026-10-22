/* LE PROVE DELLE CHIAMATE — nuova Yourbea
   ============================================================
   Il 22/10 sera, facendo camminare l'app vera dentro un emulatore
   Android, nel quaderno e' comparso:

       pagina: Uncaught TypeError: racconto.daRaccontare is not a function

   `daRaccontare` non era MAI stata esportata da parti/racconto.js. Il
   giro di parole del Turismo — il paesaggio, cosa hai davanti, la strada
   — si schiantava a ogni passaggio, e camminando l'app restava quasi
   muta. Nessuna prova poteva vederlo: le prove caricano le PARTI, e
   app.js, che e' il pezzo che le mette insieme, non lo carica nessuno.
   Qui si legge app.js come testo e si controlla che ogni `parte.cosa(`
   che chiama esista davvero fra quelle che la parte esporta.
   Si lancia:  node nuova/prove/chiamate.js                             */

'use strict';
const fs = require('fs');
const path = require('path');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.slice(0, 10).forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

/* come si chiama, in app.js, la cosa che ogni parte restituisce */
const PARTI = {
  racconto: 'racconto.js', posizione: 'posizione.js', faro: 'faro.js',
  guida: 'guida.js', miei: 'percorsiMiei.js', passaggi: 'passaggi.js',
  incroci: 'incroci.js', scena: 'scena.js', fermate: 'fermate.js',
  paesaggio: 'paesaggio.js', musica: 'musica.js', aChiServe: 'aChiServe.js',
  negozi: 'negozi.js', passeggiata: 'passeggiata.js', emergenza: 'emergenza.js',
  descrizione: 'descrizione.js', laDistanza: 'distanza.js', intorno: 'intorno.js',
  dettatura: 'dettatura.js', pronuncia: 'pronuncia.js', clip: 'clip.js',
  lettura: 'lettura.js', mappa: 'mappa.js', modi: 'modi.js', voce: 'voce.js'
};

/* le parti sono funzioni che tornano un oggetto: si montano e si guarda
   cosa hanno davvero dentro. Montarle a vuoto basta, perché quello che
   esportano non dipende da come le si chiama. */
function cosaEsporta(file) {
  const p = path.join(__dirname, '..', 'parti', file);
  if (!fs.existsSync(p)) return null;
  let f;
  try { f = require(p); } catch (e) { return null; }
  if (typeof f !== 'function') return null;
  let o;
  try { o = f({}); } catch (e) {
    try { o = f({ dist: () => 0, ora: () => 0, distanza: {}, diario: () => {} }); }
    catch (e2) { return null; }
  }
  return (o && typeof o === 'object') ? Object.keys(o) : null;
}

prova('APP.JS NON CHIAMA NIENTE CHE NON ESISTA', () => {
  for (const [nome, file] of Object.entries(PARTI)) {
    const ha = cosaEsporta(file);
    if (!ha) continue;                       // parte che non si monta a vuoto: si salta
    /* (?<![\w/\'"]) perche «parti/faro.js(» dentro un percorso non e una
       chiamata: e il nome di un file */
    const cerca = new RegExp('(?<![\\w/\'"])' + nome + '\\.([A-Za-z_][\\w]*)\\s*\\(', 'g');
    const chiamate = new Set();
    let m;
    while ((m = cerca.exec(APP))) chiamate.add(m[1]);
    for (const c of chiamate) {
      if (c === 'js') continue;
      if (!ha.includes(c)) guasto(nome + '.' + c + '() non esiste in parti/' + file);
    }
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove delle chiamate');
process.exit(passate === fatti.length ? 0 : 1);
