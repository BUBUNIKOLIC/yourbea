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

/* LA REGOLA GENERALE, non la toppa. Il 21/10, sull'Android, il tasto
   «Come si mette sulla Home» stava in mezzo alla porta, grosso 372x290,
   con hidden=true addosso: `.tasto{display:inline-flex}` del nostro foglio
   batte l'[hidden] del browser, perche' il foglio dell'autore vince su
   quello del browser a parita' di peso.
   Nel CSS c'erano gia' tre toppe — #porta[hidden], #casa-riga[hidden],
   #riga-casa[hidden] — una per elemento, scritte dopo essersi scottati.
   Una regola sola le copre tutte, anche quelle che scriveremo domani. */
prova('«hidden» spegne QUALUNQUE cosa, non solo quelle gia scottate', () => {
  const re = /\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/i;
  if (!re.test(css)) {
    guasto('manca la regola generale [hidden]{display:none !important}: ' +
           'ogni .tasto nascosto resta visibile, com\'e\' successo col tasto «Installa» su Android');
  }
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

/* ============================================================
   L'INSTALLAZIONE SUL TELEFONO, E IL NUMERO DI VERSIONE
   ============================================================
   Queste prove guardano tre file insieme — index.html, sw.js e il manifest —
   perche' il difetto che il 15/10 ha fatto perdere due giorni non sta in
   nessuno dei tre: sta nel fatto che dicevano numeri diversi. Si pubblicava
   una correzione, il telefono teneva la cassaforte di ieri, e il provatore
   giurava che non fosse stato corretto niente.                            */

const sw = fs.readFileSync(path.join(qui, 'sw.js'), 'utf8');
const manifestVia = path.join(qui, 'manifest.webmanifest');

/* la fila di indirizzi di un array del service worker, con il `+ V` sciolto */
function listaDelSW(nome, v) {
  const blocco = (sw.match(new RegExp('const ' + nome + ' = \\[([\\s\\S]*?)\\n\\];')) || [, ''])[1];
  const fuori = [];
  const re = /'([^']+)'(\s*\+\s*V)?/g;
  let m;
  while ((m = re.exec(blocco))) fuori.push(m[1] + (m[2] ? '?v=' + v : ''));
  return fuori;
}

prova('la pagina e la cassaforte dicono lo stesso numero di versione', () => {
  const nellaPagina = [...html.matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
  if (!nellaPagina.length) return guasto('in index.html non c\'e\' nessun ?v=');
  const soli = [...new Set(nellaPagina)];
  if (soli.length > 1) guasto('index.html porta numeri diversi (' + soli.join(', ') + '): PUBBLICA.command non li ha alzati tutti');
  const v = soli[0];
  const nelSW = (sw.match(/^const VERSIONE = (\d+);/m) || [])[1];
  if (!nelSW) return guasto('in sw.js non c\'e\' `const VERSIONE = N;`');
  if (nelSW !== v) guasto('la pagina dice v=' + v + ' e sw.js dice VERSIONE = ' + nelSW + ': la cassaforte resterebbe quella di prima');
  /* il service worker va chiesto con il suo ?v=, o il telefono si tiene
     quello di prima e non si accorge di niente */
  const reg = (html.match(/serviceWorker\.register\(\s*"([^"]+)"/) || [])[1];
  if (!reg) return guasto('index.html non registra il service worker con le virgolette doppie: il sed di PUBBLICA.command non lo troverebbe');
  if (reg !== 'sw.js?v=' + v) guasto('registra ' + reg + ' invece di sw.js?v=' + v);
});

prova('il nome della cassaforte contiene la versione', () => {
  /* se il nome fosse fisso, la cassaforte vecchia non verrebbe mai buttata */
  if (!/const CASSAFORTE = '[^']*' \+ VERSIONE/.test(sw)) guasto('CASSAFORTE non e\' costruito con VERSIONE: a ogni pubblicazione resterebbe la stessa');
  if (!/caches\.delete/.test(sw)) guasto('nessuno butta la cassaforte vecchia');
  if (!/clients\.claim/.test(sw)) guasto('senza clients.claim la versione nuova aspetta che si chiuda l\'app');
});

prova('la nuova e la vecchia non si svuotano la cassaforte a vicenda', () => {
  /* `caches.keys()` elenca TUTTE le cassaforti del sito: chi fa pulizia
     senza guardare il prefisso cancella quella dell'altro. Finche' la
     vecchia app sta alla radice, questa prova e' quella che tiene i due
     service worker separati. */
  const mio = (sw.match(/const MIO_PREFISSO = '([^']+)'/) || [])[1];
  if (!mio) return guasto('sw.js non dichiara MIO_PREFISSO');
  if (!new RegExp('startsWith\\(MIO_PREFISSO\\)').test(sw)) guasto('la pulizia non si limita al suo prefisso');

  const radice = path.join(qui, '..', 'sw.js');
  if (!fs.existsSync(radice)) return;              // vecchia app tolta: niente da temere
  const vecchio = fs.readFileSync(radice, 'utf8');
  const suo = (vecchio.match(/const CACHE = '([^']+)'/) || [])[1];
  if (suo && suo.startsWith(mio)) guasto('la cassaforte della vecchia app (' + suo + ') comincia come la nostra: si buttano a vicenda');
  if (/keys\.filter\(k => k !== CACHE\)/.test(vecchio)) guasto('il sw della radice butta ogni cassaforte che non sia la sua, compresa la nostra');
  /* dal 15/10 il sw della radice non e' piu' una cassaforte ma un worker che
     si spegne da solo, per liberare chi aveva installato la vecchia. Nel
     farlo svuotava TUTTO, nostra compresa: chi aveva la vecchia si ritrovava
     la nuova senza i suoi 186 file, e senza rete non le restava niente da
     aprire. Qualunque cosa diventi quel file, se butta cassaforti deve dire
     da qualche parte che le nostre si risparmiano. */
  /* i commenti si tolgono prima di guardare: quel file PARLA della nuova
     app in cima, e una prova che si accontenta della parola passerebbe
     anche con il codice che butta tutto. */
  const codice = vecchio.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (/caches\.delete/.test(codice) && !/nuova/.test(codice)) {
    guasto('il sw della radice butta cassaforti e nel codice non risparmia quelle che dicono «nuova»');
  }
});

prova('il manifest c\'e\', e dice quello che serve per installarla', () => {
  if (!/<link rel="manifest" href="manifest\.webmanifest"/.test(html)) return guasto('index.html non collega il manifest: senza, Android non offre di installarla');
  if (!fs.existsSync(manifestVia)) return guasto('manca nuova/manifest.webmanifest');
  let m;
  try { m = JSON.parse(fs.readFileSync(manifestVia, 'utf8')); }
  catch (e) { return guasto('il manifest non e\' JSON valido: ' + e.message); }
  if (!m.name || !/Yourbea/i.test(m.name)) guasto('il nome non dice Yourbea');
  if (m.display !== 'standalone') guasto('display deve essere standalone, o si apre dentro il browser');
  if (!m.start_url) guasto('senza start_url si apre chissa\' dove');
  /* lo start_url deve stare QUI DENTRO: un ./ di troppo e l'icona sulla Home
     aprirebbe la vecchia app, che e' proprio quello che non deve capitare */
  if (/^(\/|https?:|\.\.)/.test(m.start_url)) guasto('start_url ' + m.start_url + ' esce dalla cartella nuova/');
  const tema = (html.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
  if (m.theme_color !== tema) guasto('theme_color ' + m.theme_color + ' e la pagina ' + tema + ': la barra in cima cambierebbe colore');
  if (!(m.icons || []).length) return guasto('niente icone: sulla Home ci sarebbe un quadrato bianco');
  m.icons.forEach((i) => {
    if (!fs.existsSync(path.join(qui, i.src))) guasto('l\'icona ' + i.src + ' non esiste');
  });
  if (!m.icons.some((i) => /maskable/.test(i.purpose || ''))) guasto('senza icona maskable Android la taglia a modo suo');
  /* su iPhone il manifest non basta: «Aggiungi a Home» guarda questi */
  if (!/apple-mobile-web-app-capable" content="yes"/.test(html)) guasto('senza apple-mobile-web-app-capable su iPhone si apre con la barra di Safari');
  const tocco = (html.match(/<link rel="apple-touch-icon" href="([^"?]+)"/) || [])[1];
  if (!tocco) guasto('manca l\'apple-touch-icon: su iPhone l\'icona sarebbe una fotografia della pagina');
  else if (!fs.existsSync(path.join(qui, tocco))) guasto('l\'apple-touch-icon ' + tocco + ' non esiste');
});

prova('tutto quello che la cassaforte si porta dietro esiste davvero', () => {
  /* `cache.addAll` e' tutto-o-niente: un solo indirizzo sbagliato e
     l'installazione fallisce in silenzio, l'app non parte senza rete e non
     si capisce perche'. */
  const v = ((sw.match(/^const VERSIONE = (\d+);/m) || [])[1]) || '0';
  const ess = listaDelSW('ESSENZIALI', v);
  if (!ess.length) return guasto('non ho trovato la lista ESSENZIALI in sw.js');
  ess.forEach((u) => {
    const f = u.replace(/\?v=\d+$/, '');
    if (f === './') return;                        // la cartella, non un file
    if (!fs.existsSync(path.join(qui, f))) guasto('ESSENZIALI chiede ' + f + ', che non c\'e\'');
  });
  listaDelSW('CONTORNO', v).forEach((u) => {
    const f = u.replace(/\?v=\d+$/, '');
    if (!fs.existsSync(path.join(qui, f))) guasto('CONTORNO chiede ' + f + ', che non c\'e\'');
  });
});

prova('la pagina e la cassaforte chiedono gli stessi indirizzi', () => {
  /* se la cassaforte salva `stile.css` e la pagina chiede `stile.css?v=4`,
     il telefono senza rete non trova niente: sono due indirizzi diversi.
     E' lo stesso difetto della cache, visto dall'altra parte. */
  const v = ((sw.match(/^const VERSIONE = (\d+);/m) || [])[1]) || '0';
  const ess = new Set(listaDelSW('ESSENZIALI', v));
  const re = /(?:src|href)="((?:\.\/)?[\w./-]+\.(?:js|css))(\?v=\d+)?"/g;
  let m;
  while ((m = re.exec(html))) {
    const chiesto = './' + m[1].replace(/^\.\//, '') + (m[2] || '');
    if (!ess.has(chiesto)) guasto('la pagina chiede ' + chiesto + ' e la cassaforte non lo tiene: senza rete non partirebbe');
  }
  /* i dati: la pagina li chiede da app.js, non da un tag */
  if (!/dati\/luoghi\.json' \+ VER/.test(app)) guasto('app.js chiede i dati senza ?v=: resterebbero quelli di ieri');
  if (![...ess].some((u) => u.indexOf('dati/luoghi.json') > -1)) guasto('la cassaforte non tiene i dati: senza rete l\'app non avrebbe luoghi');
});

prova('le fonti di fuori non finiscono in cassaforte', () => {
  /* OpenStreetMap, Wikipedia e Valhalla rispondono cose diverse a ogni
     passo: tenerle vorrebbe dire raccontare la strada di stamattina. */
  if (!/origin !== self\.location\.origin\) return/.test(sw)) guasto('il service worker non lascia passare le fonti di fuori');
  if (!/mode === 'navigate'/.test(sw)) guasto('la pagina deve andare prima in rete, o le correzioni non arrivano mai');
});

/* LE DUE VOCI DELLA SORELLA DI VINCE — Android, quindi TalkBack.
   Il riquadro .muto e' aria-live: il lettore di schermo legge ad alta voce
   tutto quello che ci finisce. Scrivendoci la stessa frase che la nostra
   voce sta dicendo, ogni cosa si sentiva due volte.                      */
prova('la frase che la voce dice NON finisce nel riquadro del lettore di schermo', () => {
  const righe = app.split('\n').filter((r) => /alLettore\(/.test(r) && !/function alLettore/.test(r));
  if (!righe.length) guasto('nessuno scrive al lettore: controllare il nome');
  righe.forEach((r) => {
    if (/alLettore\([^)]*\)/.test(r) && !/,\s*true\s*\)/.test(r))
      guasto('scrive al lettore senza dire che la voce lo sta gia dicendo: ' + r.trim().slice(0, 70));
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della pagina');
process.exit(passate === fatti.length ? 0 : 1);
