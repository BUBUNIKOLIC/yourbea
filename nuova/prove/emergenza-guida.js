/* LE PROVE DELL'EMERGENZA E DELLA GUIDA — nuova Yourbea
   Ogni prova è una cosa che deve funzionare quando qualcuno è nei guai, o il
   difetto vero che l'ha fatta scrivere così.
   Si lancia:  node nuova/prove/emergenza-guida.js                            */

'use strict';
const Emergenza = require('../parti/emergenza.js');
const Guida = require('../parti/guida.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
function dist(a, b, c, d) {
  const R = 6371000, P = Math.PI / 180;
  const x = (c - a) * P, y = (d - b) * P;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function verso(a, b, c, d) {
  const P = Math.PI / 180;
  const y = Math.sin((d - b) * P) * Math.cos(c * P);
  const x = Math.cos(a * P) * Math.sin(c * P) - Math.sin(a * P) * Math.cos(c * P) * Math.cos((d - b) * P);
  return (Math.atan2(y, x) / P + 360) % 360;
}
const DOVE = { via: 'Via Fabio Filzi', civico: '12', citta: 'Latina', lat: 41.4665, lon: 12.9086 };

/* ==================== L'EMERGENZA ==================== */

prova('il tasto rosso parla SUBITO, non dopo tre secondi', () => {
  const e = Emergenza({});
  const s = e.scelte();
  if (!s.subito) guasto('le scelte non sono marcate come «subito»: era il difetto del tasto rosso');
  if (s.livello !== 'emergenza') guasto('il tasto rosso deve interrompere tutto');
  if (!/112/.test(s.testo)) guasto('non dice il 112');
});

prova('il 112 riceve la posizione da sé, e lo si dice', () => {
  const e = Emergenza({});
  const c = e.chiama112();
  if (!/posizione parte/.test(c.testo)) guasto('non dice che la posizione parte con la chiamata: è la cosa che tolga l\'angoscia');
  const mossa = (c.mosse || [])[0];
  if (!mossa || mossa.cosa !== 'chiama' || mossa.numero !== '112') guasto('non chiama il 112');
  if (!mossa.fraMillisecondi) guasto('chiama senza lasciare il tempo di sentire la frase');
});

prova('FURTO: prima dove sei, poi le strade vere', () => {
  const e = Emergenza({ contatto: { nome: 'Vince', telefono: '+39333' } });
  const d = e.derubato(DOVE);
  if (!/Via Fabio Filzi 12/.test(d.testo)) guasto('non dice la via e il civico: è la prima cosa che serve');
  if (!/112/.test(d.testo) || !/commissariato/.test(d.testo)) guasto('non offre le strade vere');
  if (!/Vince/.test(d.testo)) guasto('non offre di avvisare il contatto');
  if (/allarme|segnalo alla polizia|invio la segnalazione/i.test(d.testo))
    guasto('promette un allarme alla polizia: quel canale non esiste, sarebbe una bugia pericolosa');
});

prova('furto senza posizione: lo dice invece di inventare una via', () => {
  const e = Emergenza({});
  const d = e.derubato(null);
  if (!/non la so dire/.test(d.testo)) guasto('non ammette di non sapere la via');
});

prova('il contatto: messaggio pronto con la via e il punto sulla mappa', () => {
  const e = Emergenza({ contatto: { nome: 'Vince', telefono: '+393331234' } });
  const a = e.avvisaContatto(DOVE);
  const m = (a.mosse || [])[0];
  if (!m || m.cosa !== 'messaggio') guasto('non prepara il messaggio');
  if (!/Via Fabio Filzi 12/.test(m.testo)) guasto('il messaggio non dice dove sei');
  if (!/maps\.google\.com/.test(m.testo)) guasto('il messaggio non porta il punto sulla mappa');
  if (m.numero !== '+393331234') guasto('numero sbagliato');
});

prova('senza contatto registrato: lo dice e spiega dove si registra', () => {
  const e = Emergenza({});
  const a = e.avvisaContatto(DOVE);
  if (!/non ho un contatto/i.test(a.testo)) guasto('non dice che il contatto manca');
  if (!/cassetto|registr/i.test(a.testo)) guasto('non dice come registrarlo');
});

prova('le parole dell\'emergenza si riconoscono', () => {
  const e = Emergenza({ contatto: { nome: 'Vince', telefono: '+39' } });
  const casi = [
    ['mi hanno rubato il portafoglio', 'furto'],
    ['chiama il 112', 'chiama'],
    ['ho bisogno di aiuto', 'scelte'],
    ['commissariato più vicino', 'cerca'],
    ['portami al pronto soccorso', 'cerca'],
    /* «avvisa» CHIAMA: la telefonata parte da sola, il messaggio no */
    ['avvisa Vince', 'chiama-contatto'],
    ['manda un messaggio a Vince', 'avvisa']
  ];
  casi.forEach(([frase, atteso]) => {
    const r = e.comando(frase, DOVE);
    if (!r) return guasto('«' + frase + '» non riconosciuta');
    if (r.tipo !== atteso) guasto('«' + frase + '» → ' + r.tipo + ', atteso ' + atteso);
  });
  if (e.comando('che ore sono', DOVE)) guasto('ha preso per emergenza una frase che non lo è');
});

/* ==================== PORTAMI A ==================== */

prova('«portami a via Gioberti» si riconosce e si estrae la meta', () => {
  const g = Guida({ dist, verso });
  if (g.dalComando('portami a via Vincenzo Gioberti') !== 'via vincenzo gioberti') guasto('non estrae la meta');
  if (g.dalComando('che tempo fa')) guasto('ha preso per meta una frase qualunque');
});

prova('IL DIFETTO DI LATINA: se dici la città, si rispetta la città', () => {
  const g = Guida({ dist, verso });
  const parole = g.cittaNelTesto('via vincenzo gioberti latina');
  if (parole.indexOf('latina') < 0) guasto('non ha capito che la città è Latina');
  const candidati = [
    { nome: 'Via Vincenzo Gioberti', citta: 'Cisterna di Latina', provincia: 'Latina', lat: 41.5919, lon: 12.8265 },
    { nome: 'Via Vincenzo Gioberti', citta: 'Latina', provincia: 'Latina', lat: 41.4665, lon: 12.9086 },
    { nome: 'Via Vincenzo Gioberti', citta: 'Aprilia', provincia: 'Latina', lat: 41.5328, lon: 12.6595 }
  ];
  const s = g.scegli(candidati, parole, { lat: 41.89, lon: 12.48 });
  if (!s) return guasto('non ha scelto niente');
  if (s.citta !== 'Latina') guasto('ha scelto ' + s.citta + ': è l\'errore che portava a Cisterna, venti chilometri più in là');
});

prova('«Cisterna di Latina» non è «Latina»: il comune si confronta per intero', () => {
  const g = Guida({ dist, verso });
  if (g.cittaCombacia('Cisterna di Latina', ['latina'])) guasto('ha confuso Cisterna con Latina');
  if (!g.cittaCombacia('Latina', ['gioberti', 'latina'])) guasto('non riconosce Latina');
  if (!g.cittaCombacia('Torre del Greco', ['torre', 'greco'])) guasto('non riconosce i nomi di più parole');
});

prova('senza città detta, si prende la più vicina', () => {
  const g = Guida({ dist, verso });
  const candidati = [
    { nome: 'Farmacia', citta: 'Roma', lat: 41.9000, lon: 12.4900 },
    { nome: 'Farmacia', citta: 'Roma', lat: 41.8960, lon: 12.4825 }
  ];
  const s = g.scegli(candidati, [], { lat: 41.8955, lon: 12.4823 });
  if (s.lat !== 41.8960) guasto('non ha preso la più vicina');
});

prova('si parte dicendo dove sei, quanto manca e la prima mossa', () => {
  const g = Guida({ dist, verso });
  const p = { metri: 250, svolte: [
    { lat: 41.4660, lon: 12.9080, testo: 'Cammina verso sud-est su Via Fabio Filzi.' },
    { lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra su Via Vincenzo Monti.' }
  ] };
  const d = g.vaiA({ n: 'Via Vincenzo Gioberti', lat: 41.4665, lon: 12.9086 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  if (!/Sei in Via Fabio Filzi/.test(d.testo)) guasto('non dice dove sei');
  if (!/250 metri a piedi/.test(d.testo)) guasto('non dice quanto manca a piedi: ' + d.testo);
  if (!/Cammina verso sud-est/.test(d.testo)) guasto('non dice la prima mossa');
});

prova('LA SVOLTA si dice a venticinque metri, non a cento', () => {
  const g = Guida({ dist, verso });
  const svolta = { lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra su Via Vincenzo Monti.' };
  const p = { metri: 250, svolte: [{ lat: 41.4658, lon: 12.9078, testo: 'Cammina.' }, svolta] };
  g.vaiA({ n: 'meta', lat: 41.4700, lon: 12.9120 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  // a cento metri dalla svolta: zitto
  let d = g.passo({ lat: 41.46560, lon: 12.90760 }, 1000);
  if (d && d.tipo === 'svolta') guasto('ha detto la svolta da lontano: chi non vede non la può usare');
  // a una decina di metri: si dice
  d = g.passo({ lat: 41.46632, lon: 12.90832 }, 2000);
  if (!d || d.tipo !== 'svolta') guasto('a dieci metri dalla svolta non l\'ha detta: ' + JSON.stringify(d));
  if (!/Svolta a destra/.test(d.testo)) guasto('ha detto la svolta sbagliata');
});

prova('L\'ARRIVO si dice una volta sola, e la guida finisce', () => {
  const g = Guida({ dist, verso });
  g.vaiA({ n: 'Via Vincenzo Gioberti', lat: 41.4665, lon: 12.9086 }, { lat: 41.4658, lon: 12.9078 }, DOVE, null);
  const d = g.passo({ lat: 41.46651, lon: 12.90861 }, 3000);
  if (!d || d.tipo !== 'arrivato') guasto('non dice che sei arrivato');
  if (!/Via Vincenzo Gioberti/.test(d.testo)) guasto('non dice dove sei arrivato');
  if (g.meta()) guasto('la guida è ancora accesa dopo l\'arrivo');
  const due = g.passo({ lat: 41.46651, lon: 12.90861 }, 4000);
  if (due) guasto('dice l\'arrivo due volte');
});

prova('SENZA PERCORSO resta la bussola, e si dice', () => {
  const g = Guida({ dist, verso });
  const d = g.vaiA({ n: 'Farmacia Pirani', lat: 41.4700, lon: 12.9120 }, { lat: 41.4658, lon: 12.9078 }, DOVE, null);
  if (!/Ti porto a Farmacia Pirani/.test(d.testo)) guasto('non dice dove ti porta');
  if (!/non ho il percorso/i.test(d.testo)) guasto('non ammette che non ha il percorso');
  if (!/a nord-est|a est|a nord/.test(d.testo)) guasto('non dice la direzione');
});

prova('«lascia perdere» spegne la guida', () => {
  const g = Guida({ dist, verso });
  g.vaiA({ n: 'meta', lat: 41.47, lon: 12.91 }, { lat: 41.4658, lon: 12.9078 }, DOVE, null);
  const d = g.lascia();
  if (!d || d.tipo !== 'lascio') guasto('non risponde');
  if (g.meta()) guasto('la guida è ancora accesa');
  if (g.passo({ lat: 41.47, lon: 12.91 }, 5000)) guasto('continua a guidare dopo «lascia perdere»');
});

/* «AVVISA MARIOLINA», il 15/10 la sera.
   Due difetti nella stessa frase: col nome non registrato l'app restava
   zitta, e col nome registrato diceva «Avviso Mariolina» ma non apriva
   niente, perché una WKWebView blocca sms: — quello si è corretto nel
   guscio. Qui resta la parola data: non si promette un invio che non c'è. */
prova('un nome che non conosco: lo dice, non resta zitta', () => {
  const e = Emergenza({ contatto: null });
  const d = e.comando('avvisa mariolina', { via: 'Via dei Corazzieri' });
  if (!d) guasto('ha ignorato una richiesta di aiuto');
  if (d && d.tipo !== 'chi-e') guasto('doveva dire che non ha il numero');
  if (d && !/numero/.test(d.testo)) guasto('deve dire chiaramente che il numero non ce l\'ha');
});

prova('il nome registrato apre il messaggio, e non promette l\'invio', () => {
  const e = Emergenza({ contatto: { nome: 'Mariolina', telefono: '+393331234567' } });
  const d = e.comando('manda un messaggio a mariolina', { via: 'Via dei Corazzieri', lat: 41.8, lon: 12.5 });
  if (!d || d.tipo !== 'avvisa') guasto('col numero in mano deve avvisare');
  if (!/premi invia/i.test(d.testo)) guasto('nessuna app manda un SMS di nascosto: va detto');
  const m = (d.mosse || [])[0];
  if (!m || m.cosa !== 'messaggio' || m.numero !== '+393331234567') guasto('il messaggio deve partire verso il suo numero');
  if (!/Via dei Corazzieri/.test(m.testo)) guasto('nel messaggio ci va la via');
});

prova('il numero per WhatsApp: col prefisso, in cifre', () => {
  const e = Emergenza({ contatto: null });
  const n = e.numeroWhatsApp;
  if (n('+39 333 123 4567') !== '393331234567') guasto('col prefisso scritto non si tocca: ' + n('+39 333 123 4567'));
  if (n('333 123 4567') !== '393331234567') guasto('un numero italiano senza prefisso va completato: ' + n('333 123 4567'));
  if (n('0039 333 1234567') !== '393331234567') guasto('lo 00 si toglie: ' + n('0039 333 1234567'));
  if (n('+44 7700 900123') !== '447700900123') guasto('un numero straniero non si tocca: ' + n('+44 7700 900123'));
});

/* LA DOPPIA STRADA, chiesta da Vince il 15/10: «metti doppia opzione».
   Chi non vede deve poter fare tutto a voce, e un messaggio scritto nessuna
   app lo manda da sola: la chiamata sì. Quindi «avvisa» chiama, e l'app
   offre il messaggio a chi preferisce quello. */
prova('«avvisa» chiama, e dice che si può avere il messaggio', () => {
  const e = Emergenza({ contatto: { nome: 'Mariolina', telefono: '+393331234567' }, io: 'Vince' });
  const d = e.comando('avvisa mariolina', { via: 'Via dei Corazzieri' });
  if (!d || d.tipo !== 'chiama-contatto') guasto('«avvisa» deve chiamare: la chiamata parte da sola');
  if (!/messaggio/i.test(d.testo)) guasto('deve offrire anche lo scritto');
  if (!/premi Chiama/i.test(d.testo)) guasto('chi non vede deve sapere che esce la finestra di Apple e cosa farci');
  if (!/Via dei Corazzieri/.test(d.testo)) guasto('deve dire cosa raccontare quando risponde');
  const m = (d.mosse || [])[0];
  if (!m || m.cosa !== 'chiama') guasto('manca la mossa della chiamata');
  if (!m || m.fraMillisecondi < 2000) guasto('serve il tempo di dire «messaggio» prima che parta');
});

prova('nel messaggio d\'aiuto c\'è prima chi sei', () => {
  /* «il primo messaggio è sono io, il secondo sono in via dei Corazzieri» */
  const e = Emergenza({ contatto: { nome: 'Mariolina', telefono: '+393331234567' }, io: 'Vince' });
  const d = e.avvisaContatto({ via: 'Via dei Corazzieri', lat: 41.8, lon: 12.5 });
  const t = d.mosse[0].testo;
  if (t.indexOf('Sono Vince') !== 0) guasto('deve cominciare dicendo chi è: ' + t);
  if (t.indexOf('Via dei Corazzieri') < 0) guasto('e poi dove sei');
});

prova('il numero della chiamata porta il prefisso, se no iOS mostra le cifre', () => {
  /* 15/10: «non c'era nulla, solo il numero e chiama» — senza +39 il
     telefono non lo riconosce come quello in rubrica e legge dieci cifre */
  const e = Emergenza({ contatto: { nome: 'Mariolina', telefono: '333 123 4567' } });
  const d = e.chiamaContatto({ via: 'Via dei Corazzieri' });
  const n = d.mosse[0].numero;
  if (n !== '+393331234567') guasto('numero da chiamare sbagliato: ' + n);
  const e2 = Emergenza({ contatto: { nome: 'John', telefono: '+44 7700 900123' } });
  if (e2.chiamaContatto({}).mosse[0].numero !== '+447700900123') guasto('un numero straniero non si tocca');
});

/* ==================== il conto ==================== */
const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove di emergenza e guida');
process.exit(passate === fatti.length ? 0 : 1);
