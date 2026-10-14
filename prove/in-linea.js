/* Dice se la versione che sta sul disco è davvero quella che i telefoni
   scaricano. Serve rete.

   Il 14/10 un push di 200 MB di clip è morto con HTTP 408 e il controllo
   «è in linea?» si era fidato di UNA sola lettura: curl ha risposto 47
   mentre in rete c'era ancora la 45 (una cache fra noi e il sito, o la
   pubblicazione ancora a metà). Quindi qui si legge DUE volte, con due
   indirizzi diversi per non ricadere nella stessa cache, e si guarda anche
   sw.js: se la cache del service worker non cambia, i telefoni restano alla
   versione prima anche quando la pagina nuova è in linea. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

/* L'indirizzo buono è quello del repo «yourbea». Attenzione: resta in linea
   anche il vecchio https://bubunikolic.github.io/urbea/, che è fermo alla
   cache v22 e non riceve più niente: chi ha quel link sta provando l'app di
   settimane fa. */
const SITO = process.env.SITO || 'https://bubunikolic.github.io/yourbea/';
const VECCHIO = 'https://bubunikolic.github.io/urbea/';
let guasti = 0;

const locale = {
  versione: (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/var VERSIONE='(\d+)'/) || [])[1],
  cache: (fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const CACHE = 'yourbea-v(\d+)'/) || [])[1],
};

async function leggi(file, chiave) {
  // due letture, due indirizzi diversi: se una cache ci sta in mezzo, la
  // seconda non può rispondere dalla stessa copia della prima
  const fuoricache = [
    SITO + file + '?prova=' + Date.now(),
    SITO + file + '?v=' + Math.random().toString(36).slice(2) + '&t=' + (Date.now() + 1),
  ];
  const letture = [];
  for (const u of fuoricache) {
    try {
      const r = await fetch(u, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
      if (!r.ok) { letture.push({ errore: 'HTTP ' + r.status }); continue; }
      const t = await r.text();
      const m = t.match(chiave);
      letture.push({ versione: m ? m[1] : null, byte: t.length });
    } catch (e) {
      letture.push({ errore: String(e.message || e) });
    }
  }
  return letture;
}

(async () => {
  if (!locale.versione || !locale.cache) {
    console.log('NO  non trovo VERSIONE o CACHE nei file locali');
    process.exit(1);
  }

  const pagina = await leggi('index.html', /var VERSIONE='(\d+)'/);
  const sw = await leggi('sw.js', /const CACHE = 'yourbea-v(\d+)'/);

  for (const [nome, letture, atteso] of [['la pagina', pagina, locale.versione], ['sw.js', sw, locale.cache]]) {
    const err = letture.filter((l) => l.errore);
    if (err.length) {
      guasti++;
      console.log('NO  ' + nome + ' non si è potuta leggere: ' + err.map((e) => e.errore).join(', '));
      continue;
    }
    const v = letture.map((l) => l.versione);
    if (v[0] !== v[1]) {
      guasti++;
      console.log('NO  ' + nome + ': due letture, due risposte diverse (' + v[0] + ' e ' + v[1] + '): la pubblicazione è a metà, riprovare fra un minuto');
    } else if (v[0] !== atteso) {
      guasti++;
      console.log('NO  ' + nome + ': in rete c\'è ' + v[0] + ', sul disco ' + atteso + ' — il push non è arrivato');
    } else {
      console.log('SI  ' + nome + ' in linea alla ' + v[0] + ' (due letture d\'accordo)');
    }
  }

  if (!guasti && locale.versione !== locale.cache) {
    guasti++;
    console.log('NO  in linea, ma VERSIONE ' + locale.versione + ' e cache v' + locale.cache + ' non combaciano: i telefoni non rinnoveranno niente');
  }

  // il vecchio indirizzo: se risponde ancora, qualcuno può starci sopra
  try {
    const r = await fetch(VECCHIO + 'sw.js?x=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const t = await r.text();
      const m = t.match(/yourbea-v(\d+)/);
      console.log('--  attenzione: il vecchio indirizzo /urbea/ risponde ancora, fermo alla cache v' + (m ? m[1] : '?') + ': chi ha quel link non riceve nessuna correzione');
    }
  } catch (e) { /* non risponde più: meglio così */ }

  process.exit(guasti ? 1 : 0);
})();
