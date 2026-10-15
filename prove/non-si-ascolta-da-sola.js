/* L'APP NON DEVE SENTIRE SE STESSA.
   Il 15/10 Vince ha provato Yourbea e ha trovato tre cose insieme: voci
   accavallate, spiegazioni sbagliate, blocchi. Una causa sola le spiega
   tutte e tre: in modalita' voce il microfono resta aperto per i comandi,
   la clip di Alice esce dall'altoparlante a venti centimetri da quel
   microfono, il riconoscimento la sente e dentro la frase trova «avanti»
   o «racconta» — parole che l'app dice continuamente. Esegue un comando
   che nessuno ha dato: parte un secondo annuncio sopra quello in corso
   (due voci), risponde a quello che ha capito male (spiegazione sbagliata)
   e nel guscio dell'iPhone, dopo ogni frase riconosciuta, il microfono si
   chiude: se nessuno lo riapre non arrivano piu' comandi (blocco).

   Il banco della voce non poteva vederlo: gira sul Mac, dove non ci sono
   ne' microfono ne' altoparlante. Allora qui il microfono c'e', finto, e
   gli si fa sentire quello che l'app sta dicendo. */
const fs = require('fs');
const path = require('path');

const SCALA = 100;
const veroSetTimeout = setTimeout;
global.setTimeout = (fn, ms) => veroSetTimeout(fn, Math.max(0, (ms || 0) / SCALA));

let errori = [];
function guasto(m) { errori.push(m); }

/* ---- un orologio che posso spostare a mano ---- */
const veroNow = Date.now;
let adesso = veroNow();
Date.now = () => adesso;
function avanza(ms) { adesso += ms; }

/* ---- il mondo finto: clip, sintetizzatore, microfono ---- */
let clipEsistenti = new Set();
let vive = [];
let attivi = 0;
let detteDalSintetizzatore = [];

class FintoAudio {
  constructor(src) {
    this.src = src;
    this.id = path.basename(String(src), '.m4a');
    this.paused = true; this.onended = null; this.onerror = null;
    this.preload = ''; this.loop = false; this.currentTime = 0;
    vive.push(this);
  }
  play() {
    if (!clipEsistenti.has(this.id)) {
      veroSetTimeout(() => { if (this.onerror) this.onerror({}); }, 1);
      return Promise.resolve();
    }
    this.paused = false; attivi++;
    return new Promise((res, rej) => { this._res = res; this._rej = rej; });
  }
  pause() {
    if (!this.paused) {
      this.paused = true; attivi--;
      if (this._rej) { const e = new Error('interrotto'); e.name = 'AbortError'; const r = this._rej; this._rej = null; this._res = null; r(e); }
    }
  }
  finisci() {
    if (this.paused) return;
    this.paused = true; attivi--;
    if (this._res) { const r = this._res; this._res = null; this._rej = null; r(); }
    if (this.onended) this.onended();
  }
}

global.window = {
  speechSynthesis: {
    speak(u) { detteDalSintetizzatore.push(u.text); },
    cancel() {},
    getVoices() { return [{ lang: 'it-IT', name: 'Alice' }]; }
  }
};
global.Audio = FintoAudio;
global.SpeechSynthesisUtterance = function (t) { this.text = t; };
global.MediaMetadata = function (o) { Object.assign(this, o); };
global.navigator = {};
global.document = { hidden: false };

/* ---- quello che il motore chiede al resto dell'app ---- */
var LING = { cod: 'it-IT' }, LINGUA = 'it';
var liveEl = { textContent: '' };
var staParlando = false, ultimaFrase = '', inCorso = null;
var POI = [];
var LIBERO = '_parlato_';
function inLingua(ids, testo) { return { t: testo, italiano: false }; }
function cardinale() { return 'a nord'; }
function side() { return 'a destra'; }
function normalizza(t) {
  return (t || '').toLowerCase()
    .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
    .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/* IL MICROFONO FINTO.
   Nel browser il microfono e' l'oggetto `ascolto`: se c'e', il microfono e'
   aperto e sente; se e' null, e' chiuso. Nel guscio dell'iPhone sono invece
   le due funzioni del guscio. Qui tengo il conto di tutt'e due. */
var ascolto = null, ascoltoAcceso = false;
let apertureBrowser = 0;
function avviaAscolto() { ascolto = { aperto: true }; apertureBrowser++; return true; }
function microfonoAperto() {
  if (global.window.urbeaNativo) return !!global.window._nativoAscolta;
  return !!ascolto;
}

/* ---- il codice vero, estratto da index.html ---- */
const SORGENTE = process.env.PAGINA || path.join(__dirname, '..', 'index.html');
const pagina = fs.readFileSync(SORGENTE, 'utf8');
const da = pagina.indexOf('  function speak(text,forzaItaliano)');
const a = pagina.indexOf('  function serveQui(p)');
if (da < 0 || a < 0 || a <= da) {
  console.log('NON TROVO IL MOTORE DELLA VOCE in index.html: se hai rinominato speak() o serveQui(), aggiorna questo banco.');
  process.exit(2);
}
eval(pagina.slice(da, a));

if (typeof micSpegni !== 'function' || typeof micRiaccendi !== 'function' || typeof echoDiNoiStessi !== 'function') {
  console.log('NO  il motore non chiude piu il microfono quando parla: mancano micSpegni/micRiaccendi/echoDiNoiStessi');
  process.exit(1);
}

const attesa = ms => new Promise(r => veroSetTimeout(r, ms));
function reset(clip) {
  errori = []; vive = []; detteDalSintetizzatore = [];
  attivi = 0; staParlando = false; inCoda = null; inCorso = null; riserva = {};
  ultimoTesto = ''; ultimoQuando = 0;
  ignoraFinoA = 0; dettoDaNoi = ''; micSpento = false;
  clipEsistenti = new Set(clip || []);
  ascolto = null; ascoltoAcceso = true; apertureBrowser = 0;
  global.window.urbeaNativo = false;
  avviaAscolto();                       // modalita' voce accesa: microfono aperto
}
async function finisciTutte(giri) {
  for (let g = 0; g < (giri || 8); g++) {
    vive.filter(a => !a.paused && !a.loop).forEach(a => a.finisci());
    await attesa(12);
  }
}

/* IL CANCELLO, come sta scritto in index.html dentro eseguiComando: e'
   quello che decide se una frase riconosciuta e' un comando o la nostra
   stessa voce. Qui si prova la decisione; che la riga sia davvero al suo
   posto nell'app lo controlla la prova «il cancello e' al suo posto». */
function comandoAccettato(testo) {
  if (echoDiNoiStessi(testo)) return false;
  return true;
}

const prove = [];
function prova(nome, fn) { prove.push({ nome, fn }); }

/* ---------------- le prove ---------------- */

prova('mentre l\'app parla il microfono e\' chiuso', async () => {
  reset(['uno', 'due']);
  if (!microfonoAperto()) guasto('il microfono era gia chiuso prima di cominciare');
  dire(['uno', 'due'], 'Palazzo Farnese, a destra, a ottanta metri');
  await attesa(20);
  if (microfonoAperto()) guasto('il microfono e rimasto aperto mentre la clip suona: l\'app si sente da sola');
});

prova('la clip che suona non diventa un comando', async () => {
  reset(['uno']);
  dire(['uno'], 'Puoi dire: approfondisci, avanti, ripeti, dove sono, oppure ferma');
  await attesa(20);
  // il microfono finto sente l'app: sono le stesse parole, di fila
  if (comandoAccettato('approfondisci avanti ripeti')) guasto('ha preso per comando la propria voce');
  if (comandoAccettato('puoi dire approfondisci avanti ripeti dove sono')) guasto('ha preso per comando la propria frase intera');
});

/* IL SECONDO ERRORE MIO, 15/10, trovato ancora provando l'app vera: l'app
   chiede «vuoi camminare libero, o seguire un percorso?» e la risposta
   dell'utente — «percorso» — e' una parola della domanda. Scartandola,
   chi non vede resta davanti a una domanda che non accetta risposta. */
prova('la risposta a una domanda non e\' l\'eco della domanda', async () => {
  reset(['uno']);
  dire(['uno'], 'Vuoi camminare libero, o seguire un percorso?');
  await attesa(20);
  if (!comandoAccettato('percorso')) guasto('«percorso» (la risposta) viene buttato come se fosse la nostra voce');
  if (!comandoAccettato('libero')) guasto('«libero» (la risposta) viene buttato come se fosse la nostra voce');
  if (!comandoAccettato('avanti')) guasto('una parola sola della nostra frase viene presa per eco');
});

prova('finito l\'annuncio il microfono si riapre (se no l\'app sembra bloccata)', async () => {
  reset(['uno', 'due']);
  dire(['uno', 'due'], 'Chiesa del Carmine, a sinistra, a trenta metri');
  await attesa(20);
  await finisciTutte();
  await attesa(40);
  if (staParlando) guasto('resta "sta parlando" a annuncio finito');
  if (!microfonoAperto()) guasto('il microfono non si e riaperto: i comandi non arriverebbero piu');
});

/* L'ERRORE CHE HO FATTO IO, 15/10, e che si e' visto solo provando l'app
   vera nel browser: il primo cancello buttava via TUTTO quello che
   arrivava mentre l'app parlava. Risultato: chi non vede parla sopra la
   guida — che e' il modo naturale di usarla — e non succede niente.
   Un comando che non somiglia a quello che stiamo dicendo e' dell'utente,
   e si esegue. */
prova('l\'utente che parla sopra la guida viene eseguito', async () => {
  reset(['uno', 'due']);
  dire(['uno', 'due'], 'Palazzo Reale, a destra, a sessanta metri');
  await attesa(20);
  if (!staParlando) guasto('il banco non sta provando quello che crede: l\'app non sta parlando');
  if (!comandoAccettato('portami alla farmacia')) guasto('un comando dell\'utente detto sopra la guida viene buttato');
  if (!comandoAccettato('ferma')) guasto('«ferma» detto sopra la guida viene buttato: non si puo nemmeno zittirla');
});

prova('passata la frase, un comando vero passa', async () => {
  reset(['uno']);
  dire(['uno'], 'Puoi dire: approfondisci, avanti, ripeti, dove sono, oppure ferma');
  await attesa(20);
  await finisciTutte();
  await attesa(40);
  avanza(5000);                       // l'utente parla cinque secondi dopo
  if (!comandoAccettato('avanti')) guasto('«avanti» detto dall\'utente dopo la frase viene ancora buttato');
  if (!comandoAccettato('dove sono')) guasto('«dove sono» detto dall\'utente dopo la frase viene ancora buttato');
});

prova('un pezzo di quello che ha detto non e\' un comando, una frase estranea si', async () => {
  reset(['uno']);
  dire(['uno'], 'Sei in via dei Fori Imperiali, attraversamento qui intorno con il semaforo');
  await attesa(20);
  if (echoDiNoiStessi('via dei fori imperiali') !== true) guasto('non riconosce come propria voce tre parole di fila che ha appena detto');
  if (echoDiNoiStessi('portami alla farmacia') !== false) guasto('scarta una frase che non ha detto lui');
});

prova('nel guscio dell\'iPhone chiude e riapre il microfono del guscio', async () => {
  reset(['uno']);
  global.window.urbeaNativo = true;
  global.window._nativoAscolta = true;
  global.window.urbeaChiudiAscolto = function () { global.window._nativoAscolta = false; };
  global.window.urbeaAscolta = function () { global.window._nativoAscolta = true; };
  dire(['uno'], 'Basilica di Santa Chiara, davanti a te, a quaranta metri');
  await attesa(20);
  if (microfonoAperto()) guasto('nel guscio il microfono resta aperto mentre l\'app parla');
  await finisciTutte();
  await attesa(40);
  if (!microfonoAperto()) guasto('nel guscio il microfono non si riapre: dopo un comando l\'app diventa sorda');
});

prova('«ferma» non deve lasciare il microfono chiuso', async () => {
  reset(['uno', 'due']);
  dire(['uno', 'due'], 'Annuncio da fermare');
  await attesa(20);
  zittisci(); staParlando = false; livelloInCorso = 0; inCoda = null;
  ignoraFinoA = 0; dettoDaNoi = ''; micRiaccendi();      // le righe del comando «ferma»
  await attesa(20);
  if (!microfonoAperto()) guasto('dopo «ferma» il microfono resta chiuso');
});

/* ---- e le righe che devono restare dove sono ---- */
function controlliSulTesto() {
  const s = pagina;

  // 1. il cancello all'inizio di eseguiComando
  const i = s.indexOf('function eseguiComando(');
  const testa = i < 0 ? '' : s.slice(i, i + 900);
  const haCancello = /if\s*\(\s*echoDiNoiStessi\s*\(\s*testo\s*\)\s*\)/.test(testa) && /return true;/.test(testa);
  if (!haCancello) {
    console.log('NO  il cancello non e piu all\'inizio di eseguiComando: l\'app puo tornare a rispondere a se stessa');
    return false;
  }

  // e il «non ho capito» non deve partire mentre l'app parla: sarebbe una
  // voce sopra l'altra, provocata dalla nostra stessa clip riconosciuta male
  /* solo il «non ho capito» che risponde a una frase NON riconosciuta come
     comando: quello e' il figlio dell'eco. Il «non ho capito quale», che
     risponde a un comando vero a cui manca un pezzo, e' un'altra cosa. */
  const nonCapito = s.split('\n').filter((r) => /Non ho capito\. Prova con/.test(r));
  const senzaFreno = nonCapito.filter((r) => !/zittoSeNonCapito\(\)/.test(r));
  if (!nonCapito.length || senzaFreno.length) {
    console.log('NO  «non ho capito» puo partire mentre l\'app parla:');
    senzaFreno.forEach((r) => console.log('      - ' + r.trim().slice(0, 78)));
    return false;
  }

  // 2. il microfono si chiude dentro dire(), prima di fare rumore
  const d = s.search(/function dire\(ids,testo,livello/);
  const corpo = d < 0 ? '' : s.slice(d, s.indexOf('function serveQui(p)'));
  if (corpo.indexOf('micSpegni()') < 0) {
    console.log('NO  dire() non chiude piu il microfono: la clip rientra dal microfono');
    return false;
  }

  // 3. il riconoscimento non si riaccende da se' mentre l'app parla
  const riaccensioni = s.split('\n').filter((r) => /onend\s*=\s*function/.test(r));
  const senzaGuardia = riaccensioni.filter((r) => !/micSpento/.test(r));
  if (senzaGuardia.length) {
    console.log('NO  ' + senzaGuardia.length + ' riaccensioni del microfono non guardano micSpento:');
    senzaGuardia.forEach((r) => console.log('      - ' + r.trim().slice(0, 78)));
    return false;
  }

  // 4. il guardiano, per quando una riapertura si perde per strada
  if (!/setInterval\(function\(\)\{[\s\S]{0,400}micRiaccendi\(\)/.test(s)) {
    console.log('NO  manca il guardiano del microfono: se una riapertura si perde, l\'app resta sorda e non lo dice');
    return false;
  }
  return true;
}

(async () => {
  let passate = 0;
  for (const p of prove) {
    errori = [];
    try { await p.fn(); } catch (e) { guasto('e\' scoppiato: ' + e.message); }
    if (errori.length) {
      console.log('NO  ' + p.nome);
      errori.forEach((e) => console.log('      ' + e));
    } else {
      console.log('SI  ' + p.nome);
      passate++;
    }
  }
  const testo = controlliSulTesto();
  if (testo) console.log('SI  il cancello, la chiusura e il guardiano sono al loro posto nell\'app');
  console.log('');
  console.log(passate + '/' + prove.length + ' prove sul microfono passate');
  process.exit(passate === prove.length && testo ? 0 : 1);
})();
