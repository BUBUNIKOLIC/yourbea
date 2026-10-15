/* Banco di prova del motore della voce di Yourbea.
   Prende il codice VERO estratto da index.html (motore-voce.js) e lo mette
   in un mondo finto dove posso rompere le cose a comando: clip che non
   arrivano, telefono che nega l'audio, «ferma» detto a metà, annuncio
   urgente sopra un altro.
   Cosa non deve mai accadere:
   - due suoni insieme (clip+clip, o clip+voce di sistema) → era il difetto
     della sorella di Vince;
   - la guida che resta muta per sempre → era il blocco di Gabri. */
const fs = require('fs');
const path = require('path');

const SCALA = 100; // i tempi veri /100, così il banco finisce in un attimo
const veroSetTimeout = setTimeout;
global.setTimeout = (fn, ms) => veroSetTimeout(fn, Math.max(0, (ms || 0) / SCALA));

let errori = [];
let diario = [];
function guasto(m) { errori.push(m); }

/* ---- il mondo finto ---- */
let attivi = 0;            // quante clip stanno suonando ADESSO
let clipEsistenti = new Set();
let modoPlay = 'ok';       // 'ok' | 'negato' | 'abortito'
let vive = [];             // le clip create, per poterle far finire

class FintoAudio {
  constructor(src) {
    this.src = src;
    this.id = path.basename(String(src), '.m4a');
    this.paused = true;
    this.onended = null;
    this.onerror = null;
    this.preload = '';
    this.loop = false;
    this.currentTime = 0;
    vive.push(this);
  }
  play() {
    if (modoPlay === 'negato') {
      const e = new Error('non permesso'); e.name = 'NotAllowedError';
      return Promise.reject(e);
    }
    if (modoPlay === 'abortito') {
      const e = new Error('interrotto'); e.name = 'AbortError';
      return Promise.reject(e);
    }
    if (!clipEsistenti.has(this.id)) {
      // clip che non c'è: il browser chiama onerror poco dopo
      veroSetTimeout(() => { if (this.onerror) this.onerror({}); }, 1);
      return Promise.resolve();
    }
    this.paused = false;
    attivi++;
    diario.push('suona ' + this.id + ' (attivi ' + attivi + ')');
    if (attivi > 1) guasto('DUE CLIP INSIEME: ' + diario.slice(-3).join(' | '));
    // come il browser vero: la promessa resta pendente mentre suona, si
    // risolve a fine clip e RIGETTA con AbortError se qualcuno fa pause().
    return new Promise((res, rej) => { this._res = res; this._rej = rej; });
  }
  pause() {
    if (!this.paused) {
      this.paused = true; attivi--; diario.push('pausa ' + this.id);
      if (this._rej) { const e = new Error('interrotto'); e.name = 'AbortError'; const r = this._rej; this._rej = null; this._res = null; r(e); }
    }
  }
  finisci() { // la clip arriva alla fine da sola
    if (this.paused) return;
    this.paused = true; attivi--;
    diario.push('fine ' + this.id);
    if (this._res) { const r = this._res; this._res = null; this._rej = null; r(); }
    if (this.onended) this.onended();
  }
}

let detteDalSintetizzatore = [];
global.window = {
  speechSynthesis: {
    speak(u) {
      detteDalSintetizzatore.push(u.text);
      diario.push('SINTETIZZATORE: ' + String(u.text).slice(0, 30));
      if (attivi > 0) guasto('VOCE DI SISTEMA SOPRA UNA CLIP: ' + diario.slice(-3).join(' | '));
    },
    cancel() { diario.push('zitto sintetizzatore'); },
    getVoices() { return [{ lang: 'it-IT', name: 'Alice' }]; }
  }
};
global.Audio = FintoAudio;
global.SpeechSynthesisUtterance = function (t) { this.text = t; };
global.MediaMetadata = function (o) { Object.assign(this, o); };
global.navigator = {};
global.document = { hidden: false };

/* ---- quello che il motore si aspetta dal resto dell'app ---- */
var LING = { cod: 'it-IT' }, LINGUA = 'it';
var liveEl = { textContent: '' };
var staParlando = false, ultimaFrase = '', inCorso = null;
var POI = [];
function inLingua(ids, testo) { return { t: testo, italiano: false }; }
/* LIBERO e' l'id finto con cui l'app dice le frasi che contengono un nome
   proprio — una via, un luogo trovato in diretta — che non hanno una clip
   incisa. Sta fuori dal pezzo di codice che questo banco estrae, quindi
   va nominato qui, se no il motore non parte. */
var LIBERO = '_parlato_';
function cardinale() { return 'a nord'; }
function side() { return 'a destra'; }

/* ---- il codice vero ---- */
// il motore si estrae da index.html al volo: così il banco prova sempre il
// codice vero dell'app, non una copia che può restare indietro.
const pagina = fs.readFileSync(process.env.PAGINA || path.join(__dirname, '..', 'index.html'), 'utf8');
const da = pagina.indexOf('  function speak(text,forzaItaliano)');
const a = pagina.indexOf('  function serveQui(p)');
if (da < 0 || a < 0 || a <= da) {
  console.log('NON TROVO IL MOTORE DELLA VOCE in index.html: se hai rinominato speak() o serveQui(), aggiorna questo banco.');
  process.exit(2);
}
const motore = pagina.slice(da, a);

// se la pagina sotto prova non ha ancora la scala delle priorità, il banco
// la nomina da sé: così le prove di priorità falliscono con un messaggio
// leggibile invece di esplodere.

eval(motore);
if (typeof EMERGENZA === 'undefined') {
  global.EMERGENZA = 3; global.GUIDA = 2; global.RACCONTO = 1;
  console.log('(questa versione non ha la scala delle priorità)');
}

/* ---- utilità del banco ---- */
const attesa = ms => new Promise(r => veroSetTimeout(r, ms));
function reset(clip) {
  errori = []; diario = []; vive = []; detteDalSintetizzatore = [];
  attivi = 0; modoPlay = 'ok'; staParlando = false; inCoda = null; inCorso = null;
  riserva = {};
  clipEsistenti = new Set(clip || []);
}
async function finisciTutte(giri) {
  for (let g = 0; g < (giri || 8); g++) {
    const suonanti = vive.filter(a => !a.paused && !a.loop);
    suonanti.forEach(a => a.finisci());
    await attesa(12);
  }
}

const prove = [];
function prova(nome, fn) { prove.push({ nome, fn }); }

/* ---------------- le prove ---------------- */

prova('annuncio normale: una clip per volta, poi la guida è libera', async () => {
  reset(['uno', 'due', 'tre']);
  dire(['uno', 'due', 'tre'], 'Testo intero');
  await finisciTutte();
  if (staParlando) guasto('resta "sta parlando" a annuncio finito');
  if (detteDalSintetizzatore.length) guasto('ha usato il sintetizzatore pur avendo le clip');
});

prova('clip che non arrivano: ripiego e nessun blocco', async () => {
  reset([]); // nessuna clip esiste
  dire(['a', 'b', 'c'], 'Testo di ripiego');
  await attesa(300);
  if (!detteDalSintetizzatore.length) guasto('non ha ripiegato sulla voce di sistema');
  if (staParlando) guasto('resta "sta parlando": la guida non parlerebbe più');
});

prova('telefono che nega l\'audio: ripiego e nessun blocco (il caso di Gabri)', async () => {
  reset(['uno']);
  modoPlay = 'negato';
  dire(['uno'], 'Testo negato');
  await attesa(300);
  if (!detteDalSintetizzatore.length) guasto('non ha ripiegato sulla voce di sistema');
  if (staParlando) guasto('resta "sta parlando": la guida resterebbe muta per sempre');
});

prova('annuncio urgente sopra uno in corso: una voce sola (il caso della sorella)', async () => {
  reset(['uno', 'due', 'tre', 'quattro']);
  dire(['uno', 'due'], 'Primo annuncio');
  await attesa(20);
  dire(['tre', 'quattro'], 'Secondo annuncio', true); // urgente
  await attesa(20);
  // la clip interrotta fa rigettare la sua promessa con AbortError: il
  // ripiego dell'annuncio vecchio NON deve parlare sopra quello nuovo
  await attesa(20);
  await finisciTutte();
  if (staParlando) guasto('resta "sta parlando" dopo l\'urgente');
});

prova('«ferma» a metà annuncio, poi riparla', async () => {
  reset(['uno', 'due']);
  dire(['uno', 'due'], 'Annuncio da fermare');
  await attesa(20);
  if (typeof zittisci === 'function') { zittisci(); staParlando = false; inCoda = null; }
  else { if (inCorso) { try { inCorso.pause(); } catch (e) {} inCorso = null; } window.speechSynthesis.cancel(); } // il comando «ferma»
  await attesa(20);
  if (attivi !== 0) guasto('dopo «ferma» qualcosa suona ancora');
  dire(['uno'], 'Annuncio dopo il ferma');
  await attesa(20);
  if (attivi !== 1) guasto('dopo «ferma» la guida non riparla');
  await finisciTutte();
});

prova('coda: il secondo annuncio aspetta il suo turno e poi parte', async () => {
  reset(['uno', 'due']);
  dire(['uno'], 'Primo');
  await attesa(20);
  dire(['due'], 'Secondo'); // non urgente: va in coda
  if (!inCoda) guasto('il secondo non è stato messo in coda');
  await finisciTutte();
  if (staParlando) guasto('resta "sta parlando" alla fine della coda');
  const partito = diario.some(r => r.indexOf('suona due') === 0);
  if (!partito) guasto('l\'annuncio in coda non è mai partito');
});

prova('promessa rifiutata con AbortError: nessuna voce doppia', async () => {
  reset(['uno']);
  modoPlay = 'abortito';
  dire(['uno'], 'Testo abortito');
  await attesa(300);
  if (detteDalSintetizzatore.length) guasto('ha ripiegato su un\'interruzione normale: voce doppia in arrivo');
  if (staParlando) guasto('resta "sta parlando" dopo l\'interruzione');
});

prova('lingua straniera: parla col sintetizzatore e libera il turno', async () => {
  reset(['uno']);
  LINGUA = 'en';
  dire(['uno'], 'Foreign text');
  await attesa(300);
  LINGUA = 'it';
  if (!detteDalSintetizzatore.length) guasto('in lingua straniera non ha parlato');
  if (staParlando) guasto('resta "sta parlando" in lingua straniera');
});

/* ---------------- la scala delle priorità ---------------- */

prova('emergenza: interrompe il racconto in corso', async () => {
  reset(['racconto', 'sos']);
  dire(['racconto'], 'Un monumento lungo');
  await attesa(20);
  dire(['sos'], 'Chiamo il 112.', EMERGENZA);
  await attesa(20);
  const suona = vive.filter(a => !a.paused).map(a => a.id);
  if (suona.indexOf('sos') < 0) guasto('l\'emergenza non ha preso la parola');
  if (suona.indexOf('racconto') >= 0) guasto('il racconto parla ancora sotto l\'emergenza');
  await finisciTutte();
});

prova('racconto durante un\'emergenza: si butta, non torna dopo', async () => {
  reset(['sos', 'racconto']);
  dire(['sos'], 'Chiamo il 112.', EMERGENZA);
  await attesa(20);
  dire(['racconto'], 'Una chiesa del Seicento'); // livello racconto
  if (inCoda) guasto('il racconto è stato messo in coda invece di buttarlo');
  await finisciTutte();
  if (diario.some(r => r.indexOf('suona racconto') === 0)) guasto('il racconto è uscito dopo l\'emergenza');
});

prova('guida durante un\'emergenza: aspetta, non interrompe, e poi parte', async () => {
  reset(['sos', 'strada']);
  dire(['sos'], 'Chiamo il 112.', EMERGENZA);
  await attesa(20);
  dire(['strada'], 'A trenta metri a destra', GUIDA);
  const suona = vive.filter(a => !a.paused).map(a => a.id);
  if (suona.indexOf('strada') >= 0) guasto('la guida ha interrotto l\'emergenza');
  if (!inCoda) guasto('la guida non è stata messa in coda');
  await finisciTutte();
  if (!diario.some(r => r.indexOf('suona strada') === 0)) guasto('la guida non è mai partita dopo l\'emergenza');
});

prova('guida: interrompe il racconto', async () => {
  reset(['racconto', 'strada']);
  dire(['racconto'], 'Un monumento lungo');
  await attesa(20);
  dire(['strada'], 'A trenta metri a destra', GUIDA);
  await attesa(20);
  const suona = vive.filter(a => !a.paused).map(a => a.id);
  if (suona.indexOf('strada') < 0) guasto('la guida non ha preso la parola sul racconto');
  if (suona.indexOf('racconto') >= 0) guasto('il racconto parla ancora sotto la guida');
  await finisciTutte();
});

prova('in coda resta la più importante, non l\'ultima arrivata', async () => {
  reset(['sos', 'strada', 'racconto']);
  dire(['sos'], 'Emergenza', EMERGENZA);
  await attesa(20);
  dire(['strada'], 'Guida', GUIDA);       // va in coda
  dire(['racconto'], 'Racconto');          // più basso: si butta
  if (!inCoda || inCoda.liv !== GUIDA) guasto('la coda non tiene la frase di guida');
  await finisciTutte();
});

prova('emergenza su emergenza: parla l\'ultima', async () => {
  reset(['sos1', 'sos2']);
  dire(['sos1'], 'Prima emergenza', EMERGENZA);
  await attesa(20);
  dire(['sos2'], 'Seconda emergenza', EMERGENZA);
  await attesa(20);
  const suona = vive.filter(a => !a.paused).map(a => a.id);
  if (suona.indexOf('sos2') < 0) guasto('la seconda emergenza non ha preso la parola');
  if (suona.length > 1) guasto('due emergenze insieme');
  await finisciTutte();
});

(async () => {
  let falliti = 0;
  for (const p of prove) {
    errori = [];
    await p.fn();
    if (errori.length) {
      falliti++;
      console.log('NO  ' + p.nome);
      errori.forEach(e => console.log('      ' + e));
    } else {
      console.log('SI  ' + p.nome);
    }
  }
  console.log('\n' + (prove.length - falliti) + '/' + prove.length + ' prove passate');
  process.exit(falliti ? 1 : 0);
})();

/* Una copia in primo piano deve parlare SEMPRE.
   Il 15/10 il lucchetto fra copie ha reso l'app completamente muta in mano
   a Vince: una copia dimenticata altrove teneva la parola. Da allora il
   lucchetto vale solo per chi sta in secondo piano. */
(function(){
  const s = require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  const m = /function altreCopieStannoParlando\(\)\{([\s\S]*?)\n  \}/.exec(s);
  if(!m){ console.log('NO  non trovo il controllo delle copie'); process.exitCode=1; return; }
  const corpo = m[1];
  const primaIlNascosto = corpo.indexOf('if(!nascosto) return false');
  const poiIlLucchetto  = corpo.indexOf('leggiLucchetto');
  if(primaIlNascosto<0 || (poiIlLucchetto>=0 && poiIlLucchetto<primaIlNascosto)){
    console.log('NO  il lucchetto puo zittire una copia in primo piano: l app resta muta');
    process.exitCode=1;
  } else {
    console.log('SI  una copia in primo piano parla sempre');
  }
})();
