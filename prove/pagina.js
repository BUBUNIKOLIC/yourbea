/* Due controlli sulla pagina, quelli che il 14/10 sono costati mezza
   giornata e una figura:
   1. la pagina deve essere sintatticamente valida (altrimenti non parte
      niente e si vede solo una schermata bianca);
   2. nessun nome di una sola lettera fra le variabili globali dell'app:
      «L» è il nome con cui si registra Leaflet, e chiamare così le lingue
      aveva ucciso la mappa senza un solo messaggio d'errore. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const pagina = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let guasti = 0;

const pezzi = [...pagina.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
try {
  new vm.Script(pezzi.join('\n;\n'));
  console.log('SI  la pagina è sintatticamente valida (' + pezzi.length + ' blocchi di codice)');
} catch (e) {
  guasti++;
  console.log('NO  errore di sintassi nella pagina: ' + e.message);
}

// i nomi che appartengono alle librerie: se l'app li riusa, le oscura.
// «L» è Leaflet: chiamare così l'elenco delle lingue aveva ucciso la mappa
// per mezza giornata, senza un solo messaggio d'errore.
const RISERVATI = ['L', '$', '_'];
const rubati = new Set();
for (const p of pezzi) {
  // anche quando il nome sta in mezzo a un elenco: var LINGUA='it', L=null;
  for (const m of p.matchAll(/(?:^|[;{}\n])[ \t]*(?:var|let|const)[ \t]+([^;\n]+)/gm)) {
    for (const pezzo of m[1].split(',')) {
      const nome = pezzo.trim().split(/[\s=]/)[0];
      if (RISERVATI.indexOf(nome) >= 0) rubati.add(nome);
    }
  }
  for (const m of p.matchAll(/(?:^|[;{}\n])[ \t]*function[ \t]+(L|\$|_)[ \t]*\(/gm)) rubati.add(m[1]);
}
if (rubati.size) {
  guasti++;
  console.log('NO  l\'app usa nomi che sono di una libreria: ' + [...rubati].join(', '));
  console.log('      «L» è Leaflet, «$» e «_» sono di altre librerie: dare un nome intero.');
} else {
  console.log('SI  nessun nome di libreria riusato dall\'app (L, $, _)');
}

// la mappa si controlla come si deve, non con typeof (typeof null vale "object")
if (/typeof\s+L\s*===?\s*['"]undefined['"]/.test(pagina)) {
  guasti++;
  console.log('NO  controllo di Leaflet con typeof: usare !window.L');
} else {
  console.log('SI  Leaflet si controlla con !window.L');
}

process.exit(guasti ? 1 : 0);
