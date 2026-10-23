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
        /* COME FA IL BROWSER DAVVERO con una clip che non c'è: prima
           l'elemento va in errore, e SUBITO DOPO la promessa di play()
           viene rigettata con NotSupportedError. Qui dentro, fino al
           15/10 sera, la promessa si risolveva e basta: per questo il
           motore sembrava a posto mentre nel riquadro del browser diceva
           la stessa frase quattro volte. */
        return new Promise((res, rej) => {
          m.tempi.push({ quando: m.adesso + 10, f: () => {
            if (this.onerror) this.onerror({});
            const e = new Error('non si può suonare'); e.name = 'NotSupportedError'; rej(e);
          } });
        });
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
      /* COME FA LA VOCE VERA: prende una funzione da chiamare quando ha
         finito, e la chiama quando finisce — non quando pensiamo noi.
         m.finisciLaVoce() e' la voce che arriva in fondo alla frase. */
      parla(t, quandoFinisce) {
        m.sistema.push(t); m.dette.push('[sistema] ' + t);
        if (m.suonando > 0) guasto('VOCE DI SISTEMA SOPRA UNA CLIP: ' + t.slice(0, 30));
        m.staParlando = true;
        m.finisciLaVoce = () => {
          if (!m.staParlando) return;
          m.staParlando = false;
          if (quandoFinisce) quandoFinisce();
        };
      },
      taci() {
        /* annullare fa arrivare «onend» alla frase vecchia, come nel
           browser: il motore deve accorgersi da se' che non e' piu' la sua */
        m.zittita = (m.zittita || 0) + 1;
        if (m.staParlando) { const f = m.finisciLaVoce; m.staParlando = false; if (f) f(); }
      }
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

prova('la stessa frase non si dice quattro volte quando mancano le clip', async () => {
  /* 15/10 sera, provando le passeggiate nel riquadro del browser: per UN
     cenno solo, il diario segnava quattro «VOCE DI SISTEMA» con la stessa
     frase. Succede perché ogni clip che non c'è bussa due volte — l'errore
     dell'elemento e la promessa di play() rigettata — e il secondo colpo
     passava il controllo. Non è un caso di laboratorio: sul telefono le
     4.026 clip dei nomi non stanno in cassaforte, si scaricano quando
     servono, e finché non ci sono questa è la normalità. */
  const m = Mondo(); m.clipEsistenti = new Set([]);
  m.motore.parla('proprio a destra, a pochi passi, Battistero di Parma.',
                 { clip: ['dir-proprio-a-destra', 'm-passi', 'poi-688-nome', 'poi-688-intro', 'frase-chiedi'] });
  for (let g = 0; g < 8; g++) { m.passano(500); await respira(); }
  if (!m.sistema.length) guasto('senza clip la frase va detta lo stesso');
  if (m.sistema.length > 1) guasto('detta ' + m.sistema.length + ' volte: ' + m.sistema.join(' | '));
});

prova('la clip saltata non parla sopra quella che sta suonando', async () => {
  /* Il colpo in ritardo di una clip saltata — la promessa di play()
     rigettata dopo che la catena è già andata avanti — azzerava `inCorso`,
     cioè il riferimento alla clip che in quel momento stava suonando, e
     faceva partire la voce di sistema sopra di lei: due voci insieme, il
     difetto della sorella di Vince. */
  const m = Mondo(); m.clipEsistenti = new Set(['esiste']);
  m.motore.parla('Battistero di Parma.', { clip: ['manca', 'esiste'] });
  m.passano(20);              // «manca» va in errore, parte «esiste»
  await respira();            // e qui arriva il rifiuto in ritardo di «manca»
  m.passano(20);
  await respira();
  if (m.suonando !== 1) guasto('«esiste» doveva restare in suono: ' + m.suonando);
  if (m.sistema.length) guasto('e nessuno doveva parlarci sopra: ' + m.sistema.join(' | '));
  /* e la clip che suona deve restare afferrabile: se «inCorso» è stato
     azzerato, un'emergenza non riesce più a zittirla */
  m.motore.ferma();
  if (m.suonando !== 0) guasto('«ferma» non è riuscito a zittire la clip: resta ' + m.suonando);
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
  /* un attraversamento E un avviso: quello taglia, ed e giusto cosi — e
     l unica cosa che puo interrompere una frase a meta */
  m.motore.parla('Attraversamento qui intorno.', { clip: ['avviso'], livello: m.motore.GUIDA, avviso: true });
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

/* LA SCHEDA LUNGA NON SI TAGLIA A META.
   16/10, domanda di Vince: «mentre descrivi un monumento, s'interrompe?».
   Il tetto per frase era fisso a nove secondi — serve perché una frase non
   resti appesa se l'audio si blocca — ma la scheda di un monumento dura
   mezzo minuto: dopo nove secondi il motore la dava per finita e ci
   montava sopra la frase dopo. Con le 633 schede scritte da noi non si
   vedeva quasi mai; con le 4.964 di Wikipedia sarebbe successo sempre. */
prova('una scheda lunga non viene tagliata dopo nove secondi', () => {
  const m = Mondo();
  const lunga = 'La basilica di Santo Spirito è una delle principali chiese di Firenze. ' +
    'Sorge nel quartiere di Oltrarno, e la sua costruzione fu avviata su progetto di ' +
    'Filippo Brunelleschi nel 1444, proseguita dopo la sua morte da Antonio Manetti, ' +
    'Giovanni da Gaiole e Salvi d\'Andrea, che completò la cupola nel 1481.';
  m.motore.parla(lunga, { livello: 2 });
  m.passano(9500);
  if (!m.motore.staParlando()) guasto('a nove secondi e mezzo stava ancora parlando, e invece l\'ha chiusa');
  if (m.diario.some((r) => /TETTO/.test(r))) guasto('il tetto è scattato su una frase che stava andando bene');
  m.passano(40000);
  if (m.motore.staParlando()) guasto('dopo quaranta secondi deve comunque essere finita');
});

prova('una frase corta resta col suo tetto di nove secondi', () => {
  const m = Mondo();
  m.motore.parla('Sei in via dei Corazzieri.', { livello: 2 });
  m.passano(9500);
  if (m.motore.staParlando()) guasto('una frase corta non può restare appesa dieci secondi');
});

/* ==================== il conto ==================== */
prova('la stessa frase, vestita in due modi, non si dice due volte', () => {
  const m = Mondo();
  const nuda = 'Sulla destra, a 30 metri, la farmacia.';
  const uno = m.motore.parla('Senti, sulla destra, a 30 metri, la farmacia.', { uguale: nuda });
  m.passano(500);
  const due = m.motore.parla('Ecco, sulla destra, a 30 metri, la farmacia.', { uguale: nuda });
  if (!uno) guasto('la prima non è stata presa');
  if (due) guasto('ha ridetto la stessa cosa cambiando solo l\'attacco');
});

prova('senza «uguale» si confronta il testo, come sempre', () => {
  const m = Mondo();
  if (!m.motore.parla('Sei in via Rossi.')) guasto('la prima non è stata presa');
  m.passano(500);
  if (m.motore.parla('Sei in via Rossi.')) guasto('ha ridetto la stessa frase');
});

/* ============================================================
   IL DIFETTO DELLA BASILICA DI MASSENZIO — 17/10/2026
   «Mentre spiegava la Basilica di Massenzio ne iniziava un'altra sopra, e
   non si capiva nulla» (Vince). Il motore non sapeva quando la voce di
   sistema aveva finito: lo indovinava dalla lunghezza, 55 millesimi per
   lettera. Su una scheda da settecento lettere la stima dava quaranta
   secondi e la voce ce ne metteva quarantatre.                            */

prova('LA SCHEDA LUNGA: la frase dopo aspetta che la voce abbia finito DAVVERO', () => {
  const m = Mondo();
  const lunga = 'La Basilica di Massenzio. ' + 'Fu iniziata dall\'imperatore Massenzio. '.repeat(18);
  m.motore.parla(lunga, { livello: m.motore.GUIDA });
  m.motore.parla('Sulla destra, a 30 metri, la farmacia.', { livello: m.motore.CENNO });
  // passa piu' tempo della vecchia stima (1200 + lettere*55)
  m.passano(1200 + lunga.length * 55 + 5000);
  if (m.sistema.length > 1) guasto('ha cominciato la seconda mentre diceva la prima: ' + m.sistema[1].slice(0, 40));
  // adesso la voce arriva in fondo davvero
  m.finisciLaVoce();
  m.passano(1000);
  if (m.sistema.length !== 2) guasto('finita la prima, la seconda non e\' partita');
});

prova("LA SECONDA VOCE SOTTO LE CLIP: cominciando con le clip si spegne quella di prima", () => {
  const m = Mondo(); m.clipEsistenti = new Set(['uno']);
  m.motore.parla('Una scheda lunga che la voce di sistema sta ancora leggendo.', { livello: m.motore.GUIDA });
  if (!m.staParlando) guasto('la voce di sistema non e\' partita');
  // arriva qualcosa di piu' importante, con la clip incisa
  m.motore.parla('Adesso: gira a destra.', { clip: ['uno'], livello: m.motore.EMERGENZA });
  if (m.staParlando) guasto('la voce di sistema continua sotto la clip: due voci insieme');
});

prova('se la voce non dice mai di aver finito, la rete scatta e prima la spegne', () => {
  const m = Mondo();
  const t = 'Una frase che la voce comincia e non finisce mai.';
  m.motore.parla(t, { livello: m.motore.GUIDA });
  m.motore.parla('La frase dopo.', { livello: m.motore.GUIDA });
  m.passano(1200 + t.length * 55 + 500);          // scaduta la stima, non la rete
  if (m.sistema.length > 1) guasto('e\' ripartito sulla stima, non sulla fine vera');
  m.passano((1200 + t.length * 55) * 2);          // oltre la rete
  if (m.sistema.length !== 2) guasto('la rete non ha fatto proseguire: il motore resta occupato per sempre');
  if (!m.zittita) guasto('ha proseguito senza spegnere la voce rimasta accesa');
});

/* IL TETTO DI TREDICI SECONDI — il quaderno del 17/10, stazione Termini.
   «Mentre spiegava la Basilica di Massenzio ne iniziava un'altra sopra, e
   non si capiva nulla» (Vince). La prova di prima — «una scheda lunga non
   viene tagliata dopo nove secondi» — passava perche' la frase andava senza
   clip. Con UNA clip il tetto tornava a 13,5 secondi, e una scheda da
   quaranta veniva data per finita a un terzo.                            */
prova('UNA SCHEDA LUNGA CON UNA SOLA CLIP non si da per finita a tredici secondi', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['x-ancora']);
  const lunga = 'Da manuale: fu il tempio piu grande di Roma. ' + 'Centodieci metri di navata. '.repeat(20);
  m.motore.parla(lunga, { clip: ['x-ancora'], livello: m.motore.GUIDA });
  m.motore.parla('La basilica di Santa Francesca Romana.', { livello: m.motore.GUIDA });
  m.passano(14000);                       // il vecchio tetto scattava a 13,5
  if (m.dette.some(x => /Santa Francesca/.test(x))) guasto('a quattordici secondi ha gia cominciato la seconda');
  m.passano(16000);                       // trenta: la clip sta ancora raccontando
  if (m.dette.some(x => /Santa Francesca/.test(x))) guasto('a trenta secondi ha gia cominciato la seconda');
  const c = m.vive.find(v => v.id === 'x-ancora');
  if (c) c.finisci();                     // la clip arriva in fondo davvero
  m.passano(1000);
  if (!m.dette.some(x => /Santa Francesca/.test(x))) guasto('finita la clip, la seconda non e partita');
});

prova('i cenni a pezzi tengono il loro tetto: tante clip corte', () => {
  const m = Mondo();
  // cinque pezzi incisi su una frase corta: la stima del testo sarebbe
  // troppo bassa, quella delle clip e giusta
  const t = tetto => tetto;
  m.clipEsistenti = new Set(['a','b','c','d','e']);
  m.motore.parla('Sulla destra, a 80 metri, Palazzo Chigi.', { clip: ['a','b','c','d','e'], livello: m.motore.CENNO });
  m.motore.parla('Un altra cosa.', { livello: m.motore.CENNO });
  m.passano(12000);     // 1200+40*55 = 3400 *1.5 = 5100: col solo testo sarebbe gia scattato
  if (m.dette.length > 1) guasto('ha buttato via le clip a meta: ' + m.dette[1]);
});

/* ---------- IL NUMERO INVECCHIA MENTRE LO DICI ----------
   A piedi si fa un passo e mezzo al secondo. Fra il momento in cui l'app
   decide «a 40 passi» e quello in cui lo SENTI passano secondi: la frase
   si mette in coda dietro a un'altra, e la voce ci mette il suo. Quando
   senti «40» sei a 33 — e l'errore va sempre nella stessa direzione,
   quindi non si compensa mai.
   `valida` sapeva solo BUTTARE una frase scaduta. `rifai` la RISCRIVE: la
   distanza si ricalcola quando la frase esce dalla coda. */
prova('«rifai» riscrive la frase quando esce dalla coda, non prima', () => {
  const m = Mondo();
  let giri = 0;
  m.motore.parla('Prima frase, che tiene occupato il motore.', { livello: 2 });
  m.motore.parla('a 40 passi', {
    livello: 2, ancheSeUguale: true,
    rifai: function () { giri++; return 'a ' + (40 - 7 * giri) + ' passi'; }
  });
  m.passano(50); m.finisciLaVoce(); m.passano(400);
  const dette = m.sistema.join(' | ');
  if (!/a 33 passi/.test(dette)) guasto('non ha ricalcolato uscendo dalla coda: ' + dette);
  if (/a 40 passi/.test(dette)) guasto('ha detto il numero vecchio: ' + dette);
});

prova('se «rifai» non ha piu niente da dire, la frase si butta', () => {
  const m = Mondo();
  m.motore.parla('Prima frase.', { livello: 2 });
  m.motore.parla('a 40 passi', { livello: 2, ancheSeUguale: true, rifai: function () { return ''; } });
  m.passano(50); m.finisciLaVoce(); m.passano(400);
  if (/passi/.test(m.sistema.join(' | '))) guasto('ha detto una frase che non valeva piu');
});

prova('senza coda, «rifai» vale lo stesso', () => {
  const m = Mondo();
  m.motore.parla('x', { livello: 2, ancheSeUguale: true, rifai: function () { return 'a 12 passi'; } });
  m.passano(50);
  if (!/a 12 passi/.test(m.sistema.join(' | '))) guasto('subito non lo usa: ' + m.sistema.join(' | '));
});

  
/* LA FRASE VESTITA RESTA UN DOPPIONE. Da quando parti/modi.js cambia la
   parolina davanti, la stessa frase arriva scritta in due modi: se il
   confronto guardasse il testo intero tornerebbe il difetto di via Marconi,
   ripetuta perché nel paragone c'era un pezzo che cambiava. */

prova('UNA FRASE NON SI TAGLIA A META: aspetta che finisca', () => {
  /* «La app non si deve bloccare o balbettare con la voce» (Vince,
     23/10, regola 2). Il balbettio non era solo la musica: una frase
     piu importante zittiva quella in corso a meta parola. Chi ascolta
     non sente «e arrivata una cosa urgente»: sente l app che si inceppa.
     Adesso taglia solo un avviso o l emergenza. */
  const m = Mondo(); m.clipEsistenti = new Set(['racconto', 'strada']);
  m.motore.parla('Il racconto lungo di un monumento.', { clip: ['racconto'], livello: m.motore.CENNO });
  m.passano(50);
  const detto = m.motore.parla('Sei in via Roma.', { clip: ['strada'], livello: m.motore.GUIDA });
  if (!detto) return guasto('la strada e stata buttata');
  if (!m.motore.inCoda().length) guasto('non l ha messa in coda: ha tagliato la frase in corso');
});

prova('MA UN AVVISO TAGLIA SEMPRE: sono i piedi', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['racconto', 'scalini']);
  m.motore.parla('Il racconto lungo di un monumento.', { clip: ['racconto'], livello: m.motore.CENNO });
  m.passano(50);
  m.motore.parla('Tre scalini.', { clip: ['scalini'], livello: m.motore.GUIDA, avviso: true });
  if (m.motore.inCoda().length) guasto('un avviso e finito in coda invece di tagliare');
});

prova('E L EMERGENZA TAGLIA ANCHE SENZA BANDIERINA', () => {
  const m = Mondo(); m.clipEsistenti = new Set(['racconto', 'aiuto']);
  m.motore.parla('Il racconto lungo di un monumento.', { clip: ['racconto'], livello: m.motore.CENNO });
  m.passano(50);
  m.motore.parla('Chiamo il tuo contatto.', { clip: ['aiuto'], livello: m.motore.EMERGENZA });
  if (m.motore.inCoda().length) guasto('l emergenza ha aspettato il turno');
});


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
