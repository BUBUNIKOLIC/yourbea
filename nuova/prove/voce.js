/* LE PROVE DEL MOTORE DELLA VOCE — nuova Yourbea
   Ogni prova è un difetto che qualcuno ha sentito camminando, fra il 13 e il
   15 ottobre 2026. Se una di queste prove si rompe, quel difetto è tornato.
   Si lancia senza telefono e senza rete:  node nuova/prove/voce.js          */

'use strict';
const MotoreVoce = require('../parti/voce.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }

/* ---------- il mondo finto: un altoparlante e un orologio che comando io ---------- */
function Mondo() {
  const m = {
    adesso: 1000000,
    tempi: [],            // [{quando, f}]
    suonando: 0,          // quante clip stanno suonando ADESSO (deve essere 0 o 1)
    dette: [],            // le frasi uscite dall'altoparlante, in ordine
    sistema: [],          // quelle dette dalla voce di sistema
    clipEsistenti: new Set(),
    clipLente: new Set(),  // esistono ma non partono (rete lenta)
    audioNegato: false,
    vive: [],
    micChiuso: false, micAperture: 0,
    diario: []
  };
  class ClipFinta {
    constructor(src) {
      this.src = src; this.id = String(src).split('/').pop().replace('.m4a', '');
      this.paused = true; this.currentTime = 0;
      this.onended = null; this.onerror = null; this.preload = '';
      m.vive.push(this);
    }
    play() {
      if (m.audioNegato) { const e = new Error('no'); e.name = 'NotAllowedError'; return Promise.reject(e); }
      if (!m.clipEsistenti.has(this.id)) {
        m.tempi.push({ quando: m.adesso + 10, f: () => { if (this.onerror) this.onerror({}); } });
        return Promise.resolve();
      }
      if (m.clipLente.has(this.id)) {
        // la clip esiste ma non comincia mai: currentTime resta 0
        this.paused = false;
        return new Promise(() => {});
      }
      this.paused = false; this.currentTime = 0.01; m.suonando++;
      if (m.suonando > 1) guasto('DUE CLIP INSIEME: ' + this.id);
      return new Promise((res, rej) => { this._res = res; this._rej = rej; });
    }
    pause() {
      if (!this.paused) {
        this.paused = true;
        if (this.currentTime > 0) m.suonando--;
        if (this._rej) { const e = new Error('int'); e.name = 'AbortError'; const r = this._rej; this._rej = null; this._res = null; r(e); }
      }
    }
    finisci() {
      if (this.paused) return;
      this.paused = true; m.suonando--;
      this.currentTime = 1;
      if (this._res) { const r = this._res; this._res = null; this._rej = null; r(); }
      if (this.onended) this.onended();
    }
  }
  m.motore = MotoreVoce({
    Audio: ClipFinta,
    sintesi: {
      parla(t) {
        m.sistema.push(t); m.dette.push('[sistema] ' + t);
        if (m.suonando > 0) guasto('VOCE DI SISTEMA SOPRA UNA CLIP: ' + t.slice(0, 30));
      },
      taci() {}
    },
    ora: () => m.adesso,
    fraPoco: (f, ms) => { const id = { quando: m.adesso + (ms || 0), f }; m.tempi.push(id); return id; },
    annulla: (id) => { const i = m.tempi.indexOf(id); if (i >= 0) m.tempi.splice(i, 1); },
    diario: (t) => { m.diario.push(t); if (String(t).indexOf('PARLA') === 0) m.dette.push(String(t).slice(String(t).indexOf(': ') + 2)); },
    microfono: { chiudi() { m.micChiuso = true; }, apri() { m.micChiuso = false; m.micAperture++; } }
  });
  // il tempo passa: esegue i tempi scaduti, in ordine
  m.passano = function (ms) {
    const fine = m.adesso + ms;
    let giri = 0;
    while (giri++ < 1000) {
      const prossimi = m.tempi.filter(t => t.quando <= fine).sort((a, b) => a.quando - b.quando);
      if (!prossimi.length) break;
      const t = prossimi[0];
      m.tempi.splice(m.tempi.indexOf(t), 1);
      m.adesso = Math.max(m.adesso, t.quando);
      t.f();
    }
    m.adesso = fine;
  };
  m.finisciLaClip = function () { m.vive.filter(c => !c.paused && c.currentTime > 0).forEach(c => c.finisci()); };
  return m;
}

/* le prove sono asincrone, perché le promesse dell'audio (play() che viene
   rigettata) si risolvono dopo il codice che le ha chiamate: come nel
   browser vero. `respira()` lascia passare quei microtask. */
const respira = () => new Promise((r) => setImmediate(r));
const prove = [];
function prova(nome, f) { prove.push({ nome, f }); }

/* ==================== LE PROVE ==================== */

prova('una frase normale: la clip suona, poi il motore è libero', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['uno', 'due']);
  m.motore.parla('Palazzo Reale, a destra, a ottanta metri.', { clip: ['uno', 'due'] });
  if (!m.motore.staParlando()) guasto('non sta parlando dopo parla()');
  m.passano(10); m.finisciLaClip(); m.passano(10); m.finisciLaClip(); m.passano(400);
  if (m.motore.staParlando()) guasto('resta occupato a frase finita');
  if (m.sistema.length) guasto('ha usato la voce di sistema pur avendo le clip');
});

prova('MAI SILENZIO: una clip che non parte passa alla voce di sistema in 3,5 s', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['lenta']); m.clipLente = new Set(['lenta']);
  m.motore.parla('Chiesa del Carmine, a sinistra.', { clip: ['lenta'] });
  m.passano(3000);
  if (m.sistema.length) guasto('ha ripiegato troppo presto, prima dei 3,5 s');
  m.passano(1000);
  if (!m.sistema.length) guasto('dopo 4 secondi è ancora muto: è il difetto di tutti e quattro i provatori');
  m.passano(9000);
  if (m.motore.staParlando()) guasto('resta occupato dopo il ripiego');
});

prova('clip che non esiste: si salta e si prosegue, niente blocco', () => {
  const m = Mondo(); m.clipEsistenti = new Set([]);
  m.motore.parla('Testo senza clip.', { clip: ['a', 'b', 'c'] });
  m.passano(2000);
  if (!m.sistema.length) guasto('non ha detto la frase con la voce di sistema');
  m.passano(9000);
  if (m.motore.staParlando()) guasto('resta occupato');
});

prova('audio negato dal telefono: parla la voce di sistema e si libera (Gabri)', async () => {
  const m = Mondo(); m.clipEsistenti = new Set(['uno']); m.audioNegato = true;
  m.motore.parla('Qualcosa da dire.', { clip: ['uno'] });
  await respira();
  m.passano(100);
  if (!m.sistema.length) guasto('audio negato e nessun ripiego: app muta');
  m.passano(9000);
  if (m.motore.staParlando()) guasto('resta occupato per sempre: è il blocco di Gabri');
});

prova('UNA VOCE SOLA: un annuncio importante interrompe senza accavallarsi (la sorella)', async () => {
  const m = Mondo(); m.clipEsistenti = new Set(['racconto', 'avviso']);
  m.motore.parla('Il racconto lungo di un monumento.', { clip: ['racconto'], livello: m.motore.CENNO });
  m.passano(50);
  m.motore.parla('Attraversamento qui intorno.', { clip: ['avviso'], livello: m.motore.GUIDA });
  await respira();
  m.passano(50);
  if (m.suonando > 1) guasto('due clip insieme');
  m.passano(50); m.finisciLaClip(); m.passano(400);
  if (m.motore.staParlando()) guasto('resta occupato');
});

prova('I MONUMENTI NON SI BUTTANO: aspettano il turno (Gabri a Parma)', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['via', 'battistero']);
  m.motore.parla('Sei in piazza Garibaldi.', { clip: ['via'], livello: m.motore.GUIDA });
  m.passano(30);
  const preso = m.motore.parla('A centosessanta metri, Battistero di Parma.', { clip: ['battistero'], livello: m.motore.GUIDA });
  if (!preso) guasto('il monumento è stato rifiutato invece di essere messo in coda');
  if (!m.motore.inCoda().length) guasto('il monumento non è in coda: verrà perso');
  m.finisciLaClip(); m.passano(400);
  if (m.dette.filter(x => /Battistero/.test(x)).length !== 1)
    guasto('il monumento non è stato detto: ' + JSON.stringify(m.dette));
});

prova('la stessa frase non due volte entro otto secondi', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['uno']);
  m.motore.parla("Cerco l'indirizzo.", { clip: ['uno'] });
  m.finisciLaClip(); m.passano(500);
  const due = m.motore.parla("Cerco l'indirizzo.", { clip: ['uno'] });
  if (due) guasto('ha ridetto la stessa frase dopo mezzo secondo');
  const tre = m.motore.parla("Cerco l'indirizzo.", { clip: ['uno'], ancheSeUguale: true });
  if (!tre) guasto('una risposta a un comando deve poter ripetersi');
});

prova('il microfono tace mentre parla e riapre quando ha finito', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['uno']);
  m.motore.parla('Una frase.', { clip: ['uno'] });
  m.passano(20);
  if (!m.micChiuso) guasto('il microfono è rimasto aperto mentre l\'app parla: si sente da sola');
  m.finisciLaClip(); m.passano(1500);
  if (m.micChiuso) guasto('il microfono non si è riaperto: i comandi non arriverebbero più');
});

prova('«ferma» zittisce tutto e lascia il motore pronto', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['uno', 'due']);
  m.motore.parla('Da fermare.', { clip: ['uno', 'due'] });
  m.passano(30);
  m.motore.ferma();
  if (m.motore.staParlando()) guasto('dopo ferma resta occupato');
  if (m.suonando !== 0) guasto('dopo ferma qualcosa suona ancora');
  if (m.micChiuso) guasto('dopo ferma il microfono resta chiuso');
  const ok = m.motore.parla('Dopo il ferma.', { clip: ['uno'] });
  if (!ok || !m.motore.staParlando()) guasto('dopo ferma non riparla');
});

prova("niente resta occupato: il tetto di nove secondi libera sempre", () => {
  const m = Mondo(); m.clipEsistenti = new Set(['muta']); m.clipLente = new Set(['muta']);
  m.motore.parla('Frase con clip che non parte mai.', { clip: ['muta'] });
  m.passano(20000);
  if (m.motore.staParlando()) guasto('dopo venti secondi è ancora occupato');
});

prova('tre cenni in fila: la coda non supera quattro e nessuno si accavalla', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['a', 'b', 'c', 'd', 'e', 'f']);
  m.motore.parla('Primo.', { clip: ['a'] });
  ['Secondo.', 'Terzo.', 'Quarto.', 'Quinto.', 'Sesto.'].forEach((t, i) => m.motore.parla(t, { clip: [['b', 'c', 'd', 'e', 'f'][i]] }));
  if (m.motore.inCoda().length > 4) guasto('la coda è cresciuta oltre quattro');
  for (let k = 0; k < 8; k++) { m.finisciLaClip(); m.passano(400); }
  if (m.suonando > 1) guasto('due clip insieme');
  if (m.motore.staParlando()) guasto('resta occupato alla fine');
});

/* LA FRASE CHE SCADE IN CODA.
   Il 15/10, provando la mappa: «non ho il permesso di sapere dove sei»
   detta DODICI SECONDI dopo che le posizioni erano arrivate. Era vera
   quando è nata, falsa quando è uscita dalla coda. */
prova('una frase con la condizione non si dice se non vale più', () => {
  const m = Mondo();
  let permesso = false;
  m.motore.parla('Sei in Via dei Corazzieri.', { livello: 2 });
  m.motore.parla('Non ho il permesso di sapere dove sei.',
                 { livello: 2, valida: () => !permesso });
  permesso = true;                     // intanto la posizione arriva
  m.passano(30000);
  if (/permesso/.test(m.dette.join(' | '))) guasto('ha detto una frase che non era più vera');
});

prova('senza condizione la coda scorre come prima', () => {
  const m = Mondo();
  m.motore.parla('Sei in Via dei Corazzieri.', { livello: 2 });
  m.motore.parla('Museo Duilio Cambellotti, a ottanta metri.', { livello: 2 });
  m.passano(30000);
  if (!/Cambellotti/.test(m.dette.join(' | '))) guasto('la seconda frase doveva uscire lo stesso');
});

/* ==================== il conto ==================== */
(async () => {
  for (const p of prove) {
    errori = [];
    try { await p.f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
    if (errori.length) { console.log('NO  ' + p.nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
    else { console.log('SI  ' + p.nome); fatti.push(true); }
  }
  const passate = fatti.filter(Boolean).length;
  console.log('');
  console.log(passate + '/' + fatti.length + ' prove del motore nuovo');
  process.exit(passate === fatti.length ? 0 : 1);
})();
