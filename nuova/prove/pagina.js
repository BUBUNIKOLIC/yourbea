/* LE PROVE DELLA PAGINA — nuova Yourbea
   Non provano il comportamento: provano che la pagina sia cucita bene.
   Sono nate da due difetti che le prove in node non potevano vedere, perché
   non stanno nel codice ma nel modo in cui il codice è attaccato alla pagina:
   la porta che restava sullo schermo, e i file vecchi tenuti dalla cache.
   Si lancia:  node nuova/prove/pagina.js                                    */

'use strict';
const fs = require('fs');
const path = require('path');
const qui = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(qui, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(qui, 'stile.css'), 'utf8');
const app = fs.readFileSync(path.join(qui, 'app.js'), 'utf8');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

prova('quello che l\'app nasconde sparisce davvero', () => {
  /* `elemento.hidden = true` non basta se il CSS gli dà un display: la
     regola dell'id vince sull'[hidden] del browser. Il 15/10 la porta
     d'ingresso restava sopra tutto anche dopo aver scelto. */
  const nascosti = new Set();
  const re = /el\('([\w-]+)'\)\.hidden\s*=/g;
  let m;
  while ((m = re.exec(app))) nascosti.add(m[1]);
  nascosti.forEach((id) => {
    const haDisplay = new RegExp('#' + id + '\\{[^}]*display:', 'i').test(css);
    const loSpegne = new RegExp('#' + id + '\\[hidden\\]\\{[^}]*display:\\s*none', 'i').test(css);
    if (haDisplay && !loSpegne) guasto('#' + id + ' ha un display nel CSS e nessun #' + id + '[hidden]{display:none}');
  });
});

prova('tutti i file della pagina portano il numero di versione', () => {
  const re = /(?:src|href)="([^"]+\.(?:js|css))"/g;
  let m;
  while ((m = re.exec(html))) {
    if (!/\?v=\d+/.test(m[1])) guasto(m[1] + ' senza ?v=: browser e telefoni terranno il vecchio');
  }
});

prova('i file che la pagina chiama esistono', () => {
  const re = /(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^"]*)?"/g;
  let m;
  while ((m = re.exec(html))) {
    if (!fs.existsSync(path.join(qui, m[1]))) guasto('manca ' + m[1]);
  }
});

prova('la mappa resta fuori dal giro del lettore di schermo', () => {
  const riga = (html.match(/<div id="mappa"[^>]*>/) || [''])[0];
  if (!riga) guasto('non c\'è il riquadro della mappa');
  if (!/aria-hidden="true"/.test(riga)) guasto('la mappa deve essere aria-hidden: quello che conta lo dice la voce');
});

prova('il riquadro del parlato non viene letto due volte', () => {
  /* se aria-live fosse acceso, il lettore di schermo leggerebbe quello che
     l'app sta già dicendo: due voci sopra la stessa frase. */
  const riga = (html.match(/<section class="dice"[^>]*>/) || [''])[0];
  if (!/aria-live="off"/.test(riga)) guasto('il riquadro .dice deve avere aria-live="off"');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della pagina');
process.exit(passate === fatti.length ? 0 : 1);
