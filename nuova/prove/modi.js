/* LE PROVE DEI MODI DI DIRE — nuova Yourbea
   «Forse più parole, un linguaggio più articolato, potrebbe fare più
   compagnia» (Vince, 16/10). Il difetto non è che le frasi sono corte: è
   che sono sempre le stesse. Qui si controlla che cambi il contorno e non
   il contenuto, e che le frasi che servono a camminare restino intatte.
   Si lancia:  node nuova/prove/modi.js                                    */

'use strict';
const Modi = require('../parti/modi.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
/* un caso finto, così le prove non dipendono dalla fortuna */
function conCaso(valori) { let i = 0; return () => valori[i++ % valori.length]; }

prova('REGOLA 1 — parte, metri e nome restano, in quell\'ordine', () => {
  const m = Modi({ caso: conCaso([0.9, 0.1]) });
  const f = 'Sulla destra, a 30 metri, Farmacia Pirani.';
  const v = m.veste('cenno', f);
  if (v.indexOf('ulla destra, a 30 metri, Farmacia Pirani.') < 0) guasto('ha cambiato i fatti: ' + v);
});

prova('REGOLA 2 — non attacca due volte di fila nello stesso modo', () => {
  const m = Modi({ caso: conCaso([0.9, 0.0, 0.9, 0.0]) });
  const a = m.veste('cenno', 'Sulla destra, Bar Roma.');
  const b = m.veste('cenno', 'Sulla sinistra, il panificio.');
  const inizio = (t) => t.split(' ')[0];
  if (inizio(a) === inizio(b)) guasto('stesso attacco due volte: ' + a + ' / ' + b);
});

prova('REGOLA 3 — una volta su tre non ricama niente', () => {
  const m = Modi({ caso: conCaso([0.1]) });
  const f = 'Sulla destra, Bar Roma.';
  if (m.veste('cenno', f) !== f) guasto('ha ricamato quando non doveva: ' + m.veste('cenno', f));
});

prova('REGOLA 4 — il nome col contagocce', () => {
  const raro = Modi({ caso: conCaso([0.5]), nome: 'Vince' });
  if (/^Vince/.test(raro.colNome('Sei in via Rossi.'))) guasto('lo usa troppo spesso');
  const ogniTanto = Modi({ caso: conCaso([0.05]), nome: 'Vince' });
  if (!/^Vince, /.test(ogniTanto.colNome('Sei in via Rossi.'))) guasto('non lo usa mai');
});

prova('REGOLA 4 — senza nome non si inventa nessuno', () => {
  const m = Modi({ caso: conCaso([0.01]) });
  const f = 'Sei in via Rossi.';
  if (m.colNome(f) !== f) guasto('ha messo un nome che non ha: ' + m.colNome(f));
});

prova('REGOLA 5 — le frasi per camminare non si toccano', () => {
  const m = Modi({ caso: conCaso([0.9]) });
  ['svolta', 'preavviso', 'incrocio', 'arrivato', 'fuori', 'avvisa', 'chiama', 'elenco'].forEach((tipo) => {
    const f = 'Fra 20 metri gira a destra.';
    if (m.veste(tipo, f) !== f) guasto('ha ricamato su «' + tipo + '»: ' + m.veste(tipo, f));
  });
});

prova('REGOLA 5 — niente parole di vista', () => {
  const m = Modi({ caso: conCaso([0.9, 0.0, 0.9, 0.33, 0.9, 0.66, 0.9, 0.99]) });
  for (let i = 0; i < 40; i++) {
    ['cenno', 'scena', 'passaggio', 'lati'].forEach((tipo) => {
      const v = m.veste(tipo, 'Il marciapiede è largo.');
      if (/\b(guarda|guardi|vedi|vede|osserva)\b/i.test(v)) guasto('parola di vista in «' + tipo + '»: ' + v);
    });
  }
});

prova('le tre frasi vere, vestite, si leggono bene', () => {
  const m = Modi({ caso: conCaso([0.9, 0.0]) });
  const casi = [
    ['cenno', 'Hai appena passato il Teatro Regio, 40 metri dietro di te.'],
    ['lati', 'A destra trovi il ristorante Da Mario, a sinistra la farmacia Pirani.'],
    ['scena', 'Il marciapiede è largo. Ci sono tre alberi; due attraversamenti.'],
    ['passaggio', 'Stai passando lo scivolo del marciapiede, col percorso tattile.']
  ];
  casi.forEach(([tipo, f]) => {
    const v = m.veste(tipo, f);
    if (!/^[A-ZÀ-Ý]/.test(v)) guasto('non comincia con la maiuscola: ' + v);
    if (/\s\s/.test(v)) guasto('doppio spazio: ' + v);
    if (/,\s*[a-zà-ÿ]/.test(v.slice(0, 3))) guasto('virgola appiccicata: ' + v);
    console.log('      → ' + v);
  });
});

prova('senza attacco la frase prende la maiuscola, ma solo se la vesto io', () => {
  const m = Modi({ caso: conCaso([0.1]) });   // sotto la soglia: nessun attacco
  const c = m.veste('cenno', 'sulla sinistra, a 140 metri, Vietri sul Mare.');
  if (!/^Sulla sinistra/.test(c)) guasto('il cenno doveva prendere la maiuscola: ' + c);
  const i = 'adesso: gira a destra.';
  if (m.veste('svolta', i) !== i) guasto('una indicazione non si tocca nemmeno nella maiuscola: ' + m.veste('svolta', i));
});

prova('niente da vestire: non scoppia', () => {
  const m = Modi({ caso: conCaso([0.9]) });
  [null, undefined, '', 0].forEach((v) => { m.veste('cenno', v); m.colNome(v); });
});


/* ============================================================
   LE FRASI DI ROUTINE
   «Metti una serie di frasi di routine: ciao Vincenzo, come stai, ecc.»
   (Vince, 16/10). E subito dopo la domanda giusta: «ma le indicazioni e le
   illustrazioni sonore restano uguali ad ora?». Sì, e qui si controlla.  */

prova('REGOLA A — si saluta con l\'ora del giorno', () => {
  const m = Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' });
  const atteso = { 9: 'mattina', 15: 'pomeriggio', 20: 'sera', 3: 'notte' };
  Object.keys(atteso).forEach((h) => {
    if (m.oraDelGiorno(Number(h)) !== atteso[h]) guasto(h + ' non è ' + atteso[h]);
  });
  if (!/^Buongiorno Vincenzo/.test(Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' }).saluto({ ora: 9 }).testo))
    guasto('alle nove non dice buongiorno');
  if (!/^Buonasera Vincenzo/.test(Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' }).saluto({ ora: 20 }).testo))
    guasto('alle venti non dice buonasera');
});

prova('REGOLA B — mai due volte di fila lo stesso saluto', () => {
  const m = Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' });
  const a = m.saluto({ ora: 9 }).testo, b = m.saluto({ ora: 9 }).testo;
  if (a === b) guasto('due saluti identici di fila: ' + a);
});

prova('REGOLA C — chi chiede «come stai» lo dichiara', () => {
  const chiede = Modi({ caso: conCaso([0.0, 0.1, 0.0]), nome: 'Vincenzo' }).saluto({ ora: 9 });
  if (chiede.chiede && !/\?$/.test(chiede.testo)) guasto('dice di chiedere e non chiede: ' + chiede.testo);
  if (!chiede.chiede && /\?/.test(chiede.testo)) guasto('chiede senza dirlo: ' + chiede.testo);
  const muto = Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' }).saluto({ ora: 9 });
  if (muto.chiede) guasto('ha chiesto quando non doveva');
});

prova('REGOLA C — di notte non si chiede come sta', () => {
  for (const c of [0.0, 0.3, 0.6, 0.9]) {
    const s2 = Modi({ caso: conCaso([c]), nome: 'Vincenzo' }).saluto({ ora: 3 });
    if (s2.chiede) guasto('alle tre di notte chiede come sta: ' + s2.testo);
  }
});

prova('REGOLA D — la seconda volta è «bentornato», non «ciao»', () => {
  const m = Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' });
  const t = m.saluto({ ora: 15, tornato: true }).testo;
  if (!/^(Bentornato|Rieccoci|Di nuovo qui)/.test(t)) guasto('non è un bentornato: ' + t);
});

prova('senza nome le frasi di routine stanno in piedi comunque', () => {
  const m = Modi({ caso: conCaso([0.0, 0.1, 0.0]) });
  [m.saluto({ ora: 9 }).testo, m.comeSta('bene'), m.congedo()].forEach((t) => {
    if (/undefined|null|  |\s\.|,\s*\./.test(t)) guasto('frase sgangherata senza nome: «' + t + '»');
  });
});

prova('la risposta a «come stai» è corta e cambia col tono', () => {
  const m = Modi({ caso: conCaso([0.5]), nome: 'Vincenzo' });
  const male = m.comeSta('male'), bene = m.comeSta('bene');
  if (male === bene) guasto('risponde uguale a chi sta male e a chi sta bene');
  if (male.length > 80 || bene.length > 80) guasto('risposta troppo lunga');
  if (!/dispiace/.test(male)) guasto('a chi sta male non dice niente: ' + male);
});

prova('il congedo dice che si è fermata lei', () => {
  const m = Modi({ caso: conCaso([0.0, 0.9]), nome: 'Vincenzo' });
  const t = m.congedo();
  if (t.indexOf('Vincenzo') < 0) guasto('non lo chiama per nome: ' + t);
  if (!/^(A dopo|Ci sentiamo|Quando vuoi sono qui|Alla prossima)/.test(t)) guasto('non è un congedo: ' + t);
});

/* LA DOMANDA DI VINCE, 16/10: «ma le indicazioni e le illustrazioni sonore
   restano uguali ad ora?». Questa prova è la risposta, e deve restare. */
prova('LE INDICAZIONI RESTANO IDENTICHE — parola per parola', () => {
  const m = Modi({ caso: conCaso([0.99, 0.99, 0.99]), nome: 'Vincenzo' });
  const indicazioni = [
    ['preavviso', 'Fra 70 metri gira a destra in via dei Corazzieri.'],
    ['svolta',    'Adesso: gira a destra in via dei Corazzieri.'],
    ['incrocio',  'Sei all\'incrocio con viale Marconi.'],
    ['prossima',  'Il prossimo incrocio è con via Tiburtina.'],
    ['arrivato',  'Ci siamo: è sulla tua destra, accanto al bar.'],
    ['fuori',     'Ti sei allontanato dal percorso: ti rifaccio la strada.'],
    ['elenco',    'Per arrivare: via Rossi, poi viale Marconi, e poi ancora due.'],
    ['avvisa',    'Mando un messaggio a Maria con la tua posizione.'],
    ['chiama',    'Chiamo il 112.'],
    ['tappa',     'Prima tappa: la fontana, a 200 metri.'],
    ['scheda',    'La chiesa fu costruita nel 1620 su disegno di...'],
    ['cosa-vedere', 'Cosa vedere: il portale, e il campanile a vela.'],
    ['approfondimento', 'Fu restaurata nel 1890 dopo il terremoto...'],
    ['superato',  'Dietro di te hai superato il Teatro Regio.']
  ];
  indicazioni.forEach(([tipo, f]) => {
    if (m.veste(tipo, f) !== f) guasto(tipo + ' è stato cambiato: ' + m.veste(tipo, f));
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei modi di dire');
process.exit(passate === fatti.length ? 0 : 1);
