/* LE PROVE DELL'EMERGENZA E DELLA GUIDA — nuova Yourbea
   Ogni prova è una cosa che deve funzionare quando qualcuno è nei guai, o il
   difetto vero che l'ha fatta scrivere così.
   Si lancia:  node nuova/prove/emergenza-guida.js                            */

'use strict';
const Distanza = require('../parti/distanza.js');
const LADISTANZA = Distanza({});
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
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  if (g.dalComando('portami a via Vincenzo Gioberti') !== 'via vincenzo gioberti') guasto('non estrae la meta');
  if (g.dalComando('che tempo fa')) guasto('ha preso per meta una frase qualunque');
});

prova('IL DIFETTO DI LATINA: se dici la città, si rispetta la città', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
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
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  if (g.cittaCombacia('Cisterna di Latina', ['latina'])) guasto('ha confuso Cisterna con Latina');
  if (!g.cittaCombacia('Latina', ['gioberti', 'latina'])) guasto('non riconosce Latina');
  if (!g.cittaCombacia('Torre del Greco', ['torre', 'greco'])) guasto('non riconosce i nomi di più parole');
});

prova('senza città detta, si prende la più vicina', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const candidati = [
    { nome: 'Farmacia', citta: 'Roma', lat: 41.9000, lon: 12.4900 },
    { nome: 'Farmacia', citta: 'Roma', lat: 41.8960, lon: 12.4825 }
  ];
  const s = g.scegli(candidati, [], { lat: 41.8955, lon: 12.4823 });
  if (s.lat !== 41.8960) guasto('non ha preso la più vicina');
});

prova('si parte dicendo dove sei, quanto manca e la prima mossa', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const p = { metri: 250, svolte: [
    { lat: 41.4660, lon: 12.9080, testo: 'Cammina verso sud-est su Via Fabio Filzi.' },
    { lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra su Via Vincenzo Monti.' }
  ] };
  const d = g.vaiA({ n: 'Via Vincenzo Gioberti', lat: 41.4665, lon: 12.9086 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  /* la frase d'apertura e' cambiata il 16/10: prima diceva dove sei (col
     civico!), adesso dice il percorso — «quali strade dovevo percorrere»
     e' la cosa che Vince ha chiesto provandola in strada */
  if (!/Via Fabio Filzi/.test(d.testo)) guasto('non dice le strade del percorso: ' + d.testo);
  if (/\d+\/\d+/.test(d.testo)) guasto('il civico di dove sei non serve a partire');
  if (!/250 metri a piedi/.test(d.testo)) guasto('non dice quanto manca a piedi: ' + d.testo);
  if (!/Cammina verso sud-est/.test(d.testo)) guasto('non dice la prima mossa');
});

prova('LA SVOLTA si dice a venticinque metri, non a cento', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const svolta = { lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra su Via Vincenzo Monti.' };
  const p = { metri: 250, svolte: [{ lat: 41.4658, lon: 12.9078, testo: 'Cammina.' }, svolta] };
  g.vaiA({ n: 'meta', lat: 41.4700, lon: 12.9120 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  // a cento metri dalla svolta: zitto
  let d = g.passo({ lat: 41.46560, lon: 12.90760 }, 1000);
  if (d && d.tipo === 'svolta') guasto('ha detto la svolta da lontano: chi non vede non la può usare');
  // a una decina di metri: si dice
  d = g.passo({ lat: 41.46632, lon: 12.90832 }, 2000);
  if (!d || d.tipo !== 'svolta') guasto('a dieci metri dalla svolta non l\'ha detta: ' + JSON.stringify(d));
  if (!/svolta a destra/i.test(d.testo)) guasto('ha detto la svolta sbagliata');
  if (!/^Adesso/.test(d.testo)) guasto('quando ci sei sopra si dice «adesso»: ' + d.testo);
});

/* IL NAVIGATORE. «Penso debba avere quasi la funzione di navigatore
   camminando» (Vince, 16/10). Un navigatore dice la svolta due volte: una
   da lontano per prepararti, una quando ci sei. A piedi settanta metri sono
   venti secondi: il tempo di spostarsi sul lato giusto del marciapiede. */
prova('la svolta si preannuncia da settanta metri', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const svolta = { lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra su Via Vincenzo Monti.' };
  const p = { metri: 250, svolte: [{ lat: 41.4658, lon: 12.9078, testo: 'Cammina.' }, svolta] };
  g.vaiA({ n: 'meta', lat: 41.4700, lon: 12.9120 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  const lontano = g.passo({ lat: 41.46580, lon: 12.90780 }, 1000);
  if (!lontano || lontano.tipo !== 'preavviso') guasto('a una sessantina di metri va preannunciata: ' + JSON.stringify(lontano));
  /* LE PAROLE DI VINCE, 20/10: «mancano 50 metri all'incrocio, poi puoi
     svoltare a destra». Quanto manca in metri E in passi, e cosa farai
     dopo — non un ordine da eseguire fra venti secondi. */
  if (lontano && !/^Mancano \d+ metri/.test(lontano.testo)) guasto('il preavviso dice quanto manca: ' + lontano.testo);
  if (lontano && !/passi/.test(lontano.testo)) guasto('e lo dice anche in passi: ' + lontano.testo);
  if (lontano && !/Poi puoi svoltare a destra/.test(lontano.testo)) guasto('e cosa farai dopo: ' + lontano.testo);
  if (lontano && /\.\./.test(lontano.testo)) guasto('due punti di fila: ' + lontano.testo);
  const ancora = g.passo({ lat: 41.46582, lon: 12.90782 }, 2000);
  if (ancora && ancora.tipo === 'preavviso') guasto('lo ha preannunciato due volte');
});

prova('se ti allontani dal percorso, lo dice', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso, fuoriDa: 5000 });
  const p = { metri: 250, linea: [[41.4658, 12.9078], [41.4663, 12.9083], [41.4670, 12.9090]],
              svolte: [{ lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra.' }] };
  g.vaiA({ n: 'meta', lat: 41.4700, lon: 12.9120 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  const fuori = { lat: 41.4658, lon: 12.9100 };     // un paio di isolati di lato
  const primo = g.passo(fuori, 1000);
  if (primo && primo.tipo === 'fuori') guasto('non si allarma al primo passo storto');
  const dopo = g.passo(fuori, 9000);
  if (!dopo || dopo.tipo !== 'fuori') guasto('dopo un po\' fuori strada va detto: ' + JSON.stringify(dopo));
  if (dopo && !/percorso/.test(dopo.testo)) guasto('deve dire che sei fuori dal percorso');
});

prova('L\'ARRIVO si dice una volta sola, e la guida finisce', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  g.vaiA({ n: 'Via Vincenzo Gioberti', lat: 41.4665, lon: 12.9086 }, { lat: 41.4658, lon: 12.9078 }, DOVE, null);
  const d = g.passo({ lat: 41.46651, lon: 12.90861 }, 3000);
  if (!d || d.tipo !== 'arrivato') guasto('non dice che sei arrivato');
  if (!/Via Vincenzo Gioberti/.test(d.testo)) guasto('non dice dove sei arrivato');
  if (g.meta()) guasto('la guida è ancora accesa dopo l\'arrivo');
  const due = g.passo({ lat: 41.46651, lon: 12.90861 }, 4000);
  if (due) guasto('dice l\'arrivo due volte');
});

prova('SENZA PERCORSO si dice da che parte, rispetto a chi cammina', () => {
  /* «Ma io non so nord sud est dove sono… forse dovresti dirmi continua
     così» — Vince, 16/10, camminando. Il nord non ce l'ha in testa nessuno,
     e a chi non vede non serve a niente: conta da che parte sei girato,
     e quello si sa dallo spostamento. */
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const meta = { n: 'Farmacia Pirani', lat: 41.4700, lon: 12.9120 };
  const d = g.vaiA(meta, { lat: 41.4658, lon: 12.9078, direzione: 45, direzioneBuona: true }, DOVE, null);
  if (!/Ti porto a Farmacia Pirani/.test(d.testo)) guasto('non dice dove ti porta');
  if (!/non ho la strada passo passo/i.test(d.testo)) guasto('non ammette che non ha il percorso');
  if (/\b(?:nord|sud|est|ovest)\b/i.test(d.testo)) guasto('i punti cardinali a chi cammina non dicono niente: ' + d.testo);
  if (!/continua così/i.test(d.testo)) guasto('andando verso la meta si dice continua così: ' + d.testo);

  const g2 = Guida({ distanza: LADISTANZA,  dist, verso });
  const indietro = g2.vaiA(meta, { lat: 41.4658, lon: 12.9078, direzione: 225, direzioneBuona: true }, DOVE, null);
  if (!/torna indietro/i.test(indietro.testo)) guasto('andando dalla parte opposta si dice torna indietro: ' + indietro.testo);

  const g3 = Guida({ distanza: LADISTANZA,  dist, verso });
  const fermo = g3.vaiA(meta, { lat: 41.4658, lon: 12.9078 }, DOVE, null);
  if (!/qualche passo/i.test(fermo.testo)) guasto('senza sapere come sei girato non si inventa: ' + fermo.testo);
});

prova('«lascia perdere» spegne la guida', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
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

/* GLI UNDICI CHILOMETRI, 16/10. «Portami a casa» con casa scritta «Via dei
   Corazzieri n. 47»: il cercatore, confuso dal «n. 47», ha risposto con un
   posto che si chiama «Non si mangia» in via degli Equi, e l'app ci è
   andata. Un candidato che non ha nemmeno una parola in comune con quello
   che è stato chiesto non è un candidato. */
prova('un candidato che non c\'entra niente si scarta', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const qui = { lat: 41.8232, lon: 12.4814 };
  const candidati = [
    { nome: 'Non si mangia, Via degli Equi', citta: 'Roma', lat: 41.8925, lon: 12.5160 },
    { nome: 'Via dei Corazzieri, Roma', citta: 'Roma', lat: 41.8250, lon: 12.4820 }
  ];
  const scelto = g.scegli(candidati, [], qui, 'via dei corazzieri n. 47');
  if (!scelto || !/Corazzieri/.test(scelto.nome)) guasto('ha scelto: ' + (scelto && scelto.nome));
});

prova('se nessun candidato c\'entra, non ci si incammina', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const qui = { lat: 41.8232, lon: 12.4814 };
  const scelto = g.scegli([{ nome: 'Non si mangia, Via degli Equi', citta: 'Roma', lat: 41.89, lon: 12.51 }],
                          [], qui, 'via dei corazzieri 47');
  if (scelto) guasto('meglio dire che non si trova che portare a undici chilometri');
});

prova('le parole che contano: via e numero non distinguono niente', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const p = g.parolePiene('portami a via dei corazzieri numero 47');
  if (p.indexOf('corazzieri') < 0) guasto('ha perso la parola che conta');
  if (p.indexOf('via') >= 0 || p.indexOf('numero') >= 0) guasto('via e numero stanno in ogni indirizzo: ' + p.join(','));
});

/* ARRIVARE NON BASTA. «Descrizione indirizzo di casa… navigatore
   pedonale» (Vince, 16/10): un navigatore per chi guida dice «sei
   arrivato» e ha finito, perché poi uno guarda. A piedi e senza vedere,
   il numero giusto non serve se non sai da che parte è la porta. */
prova('all\'arrivo si dice da che parte è, e cosa ha accanto', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const meta = { n: 'Via dei Corazzieri 47', lat: 41.8240, lon: 12.4814 };
  g.vaiA(meta, { lat: 41.8230, lon: 12.4814, direzione: 0, direzioneBuona: true }, DOVE, null);
  /* arrivo camminando verso nord, con la meta appena a destra */
  const d = g.passo({ lat: 41.82398, lon: 12.48128, direzione: 0, direzioneBuona: true },
                    5000, { accanto: 'la Tabaccheria Focone' });
  if (!d || d.tipo !== 'arrivato') guasto('non ha detto che sei arrivato: ' + JSON.stringify(d));
  if (d && !/destra|sinistra|davanti|dietro/.test(d.testo)) guasto('non dice da che parte: ' + d.testo);
  if (d && !/Tabaccheria/.test(d.testo)) guasto('non dice cosa c\'è accanto: ' + d.testo);
});

prova('senza bussola si dice comunque che sei arrivato', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const meta = { n: 'casa tua', lat: 41.8240, lon: 12.4814 };
  g.vaiA(meta, { lat: 41.8230, lon: 12.4814 }, DOVE, null);
  const d = g.passo({ lat: 41.82399, lon: 12.48141 }, 5000, {});
  if (!d || d.tipo !== 'arrivato') guasto('l\'arrivo si dice sempre');
  if (d && /destra|sinistra/.test(d.testo)) guasto('ma non si inventa il lato: ' + d.testo);
});

/* LE STRADE DEL PERCORSO, DETTE PRIMA DI PARTIRE. «Invece di dirmi, per
   andare in via dei Corazzieri, quali strade dovevo percorrere… poi mi
   diceva i numeri civici» (Vince, 16/10, in scooter). Prima di muoversi
   uno vuole il disegno del percorso in testa: tre nomi bastano. */
prova('prima di partire si dicono le strade che si faranno', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const p = { metri: 700, svolte: [
    { lat: 41.4658, lon: 12.9078, testo: 'Cammina su Via Giovanni Volpato.' },
    { lat: 41.4663, lon: 12.9083, testo: 'Svolta a destra su Via Portuense.' },
    { lat: 41.4668, lon: 12.9090, testo: 'Svolta a sinistra su Via Ettore Rolli.' } ] };
  const d = g.vaiA({ n: 'Via dei Corazzieri 47', lat: 41.4700, lon: 12.9120 },
                   { lat: 41.4658, lon: 12.9078, direzione: 45, direzioneBuona: true }, DOVE, p);
  if (!/Volpato/.test(d.testo) || !/Portuense/.test(d.testo)) guasto('non dice le strade: ' + d.testo);
  if (!/700 metri/.test(d.testo)) guasto('e quanto è lunga');
  if (!/svolte/.test(d.testo)) guasto('e quante svolte');
});

prova('tre strade, non dieci', () => {
  /* un elenco lungo non si tiene a mente camminando, e le svolte le
     ridirà una per una al momento giusto */
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const nomi = g.elencoStrade(['Via A', 'Via B', 'Via C', 'Via D', 'Via E']);
  if ((nomi.match(/Via/g) || []).length > 3) guasto('troppe: ' + nomi);
  if (!/e poi ancora/.test(nomi)) guasto('deve dire che ce ne sono altre: ' + nomi);
});

/* ==================== il conto ==================== */
prova('il 112 non parte di soppiatto: cinque secondi per fermarlo', () => {
  /* Dario, provandola a Napoli: «per poco non ho chiamato il 112». Il
     microfono sta aperto tutto il giorno e sente le conversazioni. */
  const e = Emergenza({ contatto: null });
  const d = e.chiama112();
  if (!/annulla/i.test(d.testo)) guasto('non dice come fermarla: ' + d.testo);
  if (!d.mosse || d.mosse[0].fraMillisecondi < 4000) guasto('troppo poco tempo per fermarla');
  if (!/posizione/i.test(d.testo)) guasto('e deve dire che la posizione parte da sé');
});

/* ============================================================
   IL FILO — «continua così per 200 passi»
   «In pratica non guida nessuno: ti dice solo in che strada sei e qualche
   volta qual è l'incrocio» (Vince, 20/10, dopo «portami a casa»).
   Un navigatore per chi vede tace fra una svolta e l'altra. Chi non vede,
   nel silenzio, non sa se sta ancora andando bene.                       */
prova('IL FILO: non resta zitto piu di venti secondi mentre ti accompagna', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const svolta = { lat: 41.4700, lon: 12.9120, testo: 'Svolta a destra su Via Rossi.' };
  const p = { metri: 400, svolte: [{ lat: 41.4658, lon: 12.9078, testo: 'Cammina.' }, svolta] };
  g.vaiA({ n: 'casa tua', lat: 41.4710, lon: 12.9130 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  /* fermi nello stesso punto: niente svolte, niente fuori strada, niente
     da dire — ed e' proprio li' che prima calava il silenzio */
  const zitto = g.passo({ lat: 41.46580, lon: 12.90780 }, 5000);
  const filo = g.passo({ lat: 41.46580, lon: 12.90780 }, 40000);
  if (!filo) { guasto('dopo venti secondi deve dire qualcosa'); return; }
  if (!/Continua così per/.test(filo.testo)) guasto('non e il filo: ' + filo.testo);
  if (!/passi/.test(filo.testo)) guasto('in passi, che si camminano: ' + filo.testo);
  if (!/metri/.test(filo.testo)) guasto('e in metri, che si controllano: ' + filo.testo);
  if (filo.livello !== 'cenno') guasto('il filo non taglia niente: e un cenno');
  console.log('      → ' + filo.testo);
});

prova('IL FILO dice anche cosa farai dopo', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const svolta = { lat: 41.4700, lon: 12.9120, testo: 'Svolta a sinistra su Via Verdi.' };
  const p = { metri: 400, svolte: [{ lat: 41.4658, lon: 12.9078, testo: 'Cammina.' }, svolta] };
  g.vaiA({ n: 'casa tua', lat: 41.4710, lon: 12.9130 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  const filo = g.passo({ lat: 41.46580, lon: 12.90780 }, 40000);
  if (!/Poi puoi svoltare a sinistra/.test(filo.testo)) guasto('manca il poi: ' + filo.testo);
});

prova('IL FILO non parla sopra una svolta', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const svolta = { lat: 41.46585, lon: 12.90785, testo: 'Svolta a destra su Via Rossi.' };
  const p = { metri: 100, svolte: [{ lat: 41.4658, lon: 12.9078, testo: 'Cammina.' }, svolta] };
  g.vaiA({ n: 'casa tua', lat: 41.4660, lon: 12.9080 }, { lat: 41.4658, lon: 12.9078 }, DOVE, p);
  const d = g.passo({ lat: 41.46584, lon: 12.90784 }, 40000);
  if (d && d.tipo === 'filo') guasto('con una svolta addosso deve dire la svolta, non il filo');
});

/* ============================================================
   I DUE CASI VERI DEL 20/10 — chiesti a Photon con l'indirizzo di Vince
     «Via dei Corazzieri 47 Latina» → Via dei MARRUCINI 47, due chilometri
     «Via dei Corazzieri Latina»   → tre Via dei Corazzieri a ROMA
   Tutti e due passavano il controllo, perche' bastava che UNA parola piena
   comparisse: e «latina» e' una parola piena.                            */
prova('LA VIA SBAGLIATA NELLA CITTA GIUSTA si butta', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const candidati = [{ nome: 'Via dei Marrucini, Latina', citta: 'Latina',
                       lat: 41.45932, lon: 12.92574 }];
  const scelto = g.scegli(candidati, ['latina'], { lat: 41.4676, lon: 12.9036 },
                          'via dei corazzieri 47 latina');
  if (scelto) guasto('ha preso una via che non si chiama cosi: ' + scelto.nome);
});

prova('LA VIA GIUSTA NELLA CITTA SBAGLIATA si butta', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const candidati = [
    { nome: 'Via dei Corazzieri', citta: 'Roma', lat: 41.82586, lon: 12.48608 },
    { nome: 'Via dei Corazzieri', citta: 'Roma', lat: 41.82301, lon: 12.48121 }
  ];
  const scelto = g.scegli(candidati, ['latina'], { lat: 41.4676, lon: 12.9036 },
                          'via dei corazzieri latina');
  if (scelto) guasto('lo ha mandato a Roma: ' + scelto.nome);
});

prova('e quella giusta si prende', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const candidati = [
    { nome: 'Via dei Marrucini, Latina', citta: 'Latina', lat: 41.45932, lon: 12.92574 },
    { nome: 'Via dei Corazzieri, Latina', citta: 'Latina', lat: 41.4701, lon: 12.9050 },
    { nome: 'Via dei Corazzieri', citta: 'Roma', lat: 41.82586, lon: 12.48608 }
  ];
  const scelto = g.scegli(candidati, ['latina'], { lat: 41.4676, lon: 12.9036 },
                          'via dei corazzieri 47 latina');
  if (!scelto) { guasto('quella giusta c era'); return; }
  if (!/Corazzieri/.test(scelto.nome) || scelto.citta !== 'Latina')
    guasto('ha scelto male: ' + JSON.stringify(scelto));
});

prova('senza citta detta, fra due vie con lo stesso nome si prende la piu vicina', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const candidati = [
    { nome: 'Via Roma', citta: 'Milano', lat: 45.46, lon: 9.19 },
    { nome: 'Via Roma', citta: 'Latina', lat: 41.4680, lon: 12.9040 }
  ];
  const scelto = g.scegli(candidati, [], { lat: 41.4676, lon: 12.9036 }, 'via roma');
  if (!scelto || scelto.citta !== 'Latina') guasto('doveva prendere quella sotto casa: ' + JSON.stringify(scelto));
});

/* I 400 METRI DI CASA — «quando sono arrivato a casa mi diceva torna
   indietro di 400 metri» (Vince, 20/10). Chiesto a Photon il suo indirizzo
   vero: tre pezzi della stessa via, 513 metri fra loro, e il civico 47 non
   c'e' ne' su Photon ne' su Nominatim. Prendendo il piu' vicino a chi
   cerca si finiva sempre all'imbocco.                                     */
prova('UNA VIA A PEZZI: si prende il mezzo, e si dice di quanto si puo sbagliare', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const c = [
    { nome: 'Via dei Corazzieri', citta: 'Roma', lat: 41.82586, lon: 12.48608 },
    { nome: 'Via dei Corazzieri', citta: 'Roma', lat: 41.82301, lon: 12.48121 },
    { nome: 'Via dei Corazzieri', citta: 'Roma', lat: 41.82514, lon: 12.48595 }
  ];
  const s = g.scegli(c, g.cittaNelTesto('via dei corazzieri 47 roma'),
                     { lat: 41.89, lon: 12.48 }, 'via dei corazzieri 47 roma');
  if (!s) { guasto('la via c era'); return; }
  if (!s.aPezzi) guasto('deve dire che la via e arrivata a pezzi');
  if (!s.incerto || s.incerto < 100) guasto('deve dire di quanto puo sbagliare: ' + s.incerto);
  /* il mezzo e piu vicino a TUTTI i pezzi di quanto lo sia l imbocco */
  const allImbocco = Math.max(...c.map((x) => dist(c[0].lat, c[0].lon, x.lat, x.lon)));
  if (!(s.incerto < allImbocco)) guasto('il mezzo deve sbagliare meno dell imbocco');
});

prova('due vie DIVERSE non si mediano: sarebbe un punto in mezzo al niente', () => {
  const g = Guida({ distanza: LADISTANZA,  dist, verso });
  const c = [
    { nome: 'Via Roma', citta: 'Latina', lat: 41.4680, lon: 12.9040 },
    { nome: 'Via Milano', citta: 'Latina', lat: 41.4700, lon: 12.9100 }
  ];
  const s = g.scegli(c, [], { lat: 41.4676, lon: 12.9036 }, '');
  if (s && s.aPezzi) guasto('ha mediato due vie diverse: ' + JSON.stringify(s));
});

/* ============================================================
   «CHIEDI AIUTO»
   «Che deve chiamare i soccorsi, e dice la posizione in cui si è» —
   «per i non vedenti la descrizione del luogo in cui si è» (Vince,
   23/10).
   ============================================================ */
const INTORNO = ['Farmacia Comunale sulla destra, a 40 metri',
                 'Tabaccheria dritto davanti, a 20 metri',
                 'Basilica di San Marco sulla sinistra, a 90 metri'];
const DOVE_PIENO = { via: 'Via Fabio Filzi', civico: '12', citta: 'Latina',
                     lat: 41.4665, lon: 12.9086, accanto: INTORNO };

prova('«chiedi aiuto» chiama i soccorsi', () => {
  const e = Emergenza({});
  const d = e.comando('chiedi aiuto', DOVE_PIENO);
  if (!d) { guasto('non l ha capito'); return; }
  if (d.numero !== '112') guasto('non chiama il 112: ' + JSON.stringify(d));
  if (!d.annullabile) guasto('parte senza i cinque secondi per annullare');
  console.log('      → ' + d.testo);
});

prova('e dice dove sei, e cosa hai intorno', () => {
  const e = Emergenza({});
  const d = e.comando('chiedi aiuto', DOVE_PIENO);
  if (!/Via Fabio Filzi 12, Latina/.test(d.testo)) guasto('non dice la via: ' + d.testo);
  if (!/Farmacia/.test(d.testo)) guasto('non dice cosa hai intorno: ' + d.testo);
  /* e la via viene prima delle cose intorno: all operatore serve quella */
  if (d.testo.indexOf('Via Fabio Filzi') > d.testo.indexOf('Farmacia')) {
    guasto('dice prima i negozi e poi la via');
  }
});

/* SE LA VIA NON SI SA si dicono i numeri: una centrale operativa ci
   lavora tutti i giorni, il silenzio no. */
prova('senza la via, i soccorsi hanno le coordinate', () => {
  const e = Emergenza({});
  const d = e.comando('chiedi aiuto', { lat: 41.4665, lon: 12.9086, accanto: [] });
  if (!/41 virgola 46650/.test(d.testo)) guasto('non le dice: ' + d.testo);
});

/* IL 112 NON PARTE DI SOPPIATTO (Dario, Napoli: «per poco non ho
   chiamato il 112»). Il microfono sente le conversazioni tutto il
   giorno: «aiuto» dentro una frase non può far partire una chiamata. */
prova('«aiuto» dentro una frase non chiama nessuno', () => {
  const e = Emergenza({});
  ['ho bisogno di un aiuto per capire', 'mi serve aiuto col telefono',
   'chiedi aiuto a tuo fratello', 'aiuto che bello'].forEach((t) => {
    const d = e.comando(t, DOVE_PIENO);
    if (d && d.numero === '112') guasto('«' + t + '» ha chiamato il 112');
  });
});

prova('«aiuto» da solo resta il menu, non la chiamata', () => {
  const e = Emergenza({});
  const d = e.comando('aiuto', DOVE_PIENO);
  if (!d) { guasto('non risponde niente'); return; }
  if (d.numero === '112') guasto('chiama il 112 su «aiuto» secco');
  if (d.tipo !== 'scelte') guasto('doveva essere il menu: ' + d.tipo);
});

/* ============================================================
   IL PONTE MARCONI
   «Avevo superato il ponte Marconi e mi diceva che a 200 metri dovevo
   superare il ponte Marconi» (Vince, 23/10). La svolta si considerava
   fatta solo entrando nei venticinque metri dal suo punto: passandoci
   di lato — un ponte largo, il GPS che sbaglia fra i palazzi — quel
   cerchio non si tocca mai, e l'app ripeteva la stessa svolta mentre
   la distanza cresceva.
   ============================================================ */
function stradaDritta(g, da, a, quante) {
  /* un percorso finto con tre svolte lungo una retta */
  const svolte = [];
  for (let i = 1; i <= quante; i++) {
    svolte.push({ lat: da[0] + (a[0] - da[0]) * i / (quante + 1),
                  lon: da[1] + (a[1] - da[1]) * i / (quante + 1),
                  testo: 'Attraversa il ponte numero ' + i, metri: 100 });
  }
  return { svolte: svolte, metri: 400, linea: [] };
}

prova('una svolta passata di lato non si ripete all infinito', () => {
  const g = Guida({ distanza: LADISTANZA, dist, verso });
  const da = [41.8500, 12.4700], a = [41.8560, 12.4700];
  const percorso = stradaDritta(g, da, a, 3);
  /* si passa a quaranta metri di lato dal punto della svolta: il
     cerchio dei venticinque non lo tocchiamo mai */
  const lato = 0.00048;
  g.vaiA({ n: 'casa', lat: a[0], lon: a[1] }, { lat: da[0], lon: da[1], direzione: 0, direzioneBuona: true },
         null, percorso);
  let detto = [];
  for (let i = 0; i <= 20; i++) {
    const la = da[0] + (a[0] - da[0]) * i / 20;
    const d = g.passo({ lat: la, lon: da[1] + lato, direzione: 0, direzioneBuona: true });
    if (d && d.testo) detto.push(d.testo);
  }
  /* la prima svolta non deve essere l'unica cosa che dice per tutto il
     percorso: dopo averla passata deve parlare della seconda e terza */
  const primo = detto.filter((t) => /ponte numero 1/.test(t)).length;
  const altri = detto.filter((t) => /ponte numero 2|ponte numero 3/.test(t)).length;
  if (!altri) guasto('non arriva mai alla seconda svolta: ' + JSON.stringify(detto.slice(0, 4)));
  if (primo > 3) guasto('ripete la prima svolta ' + primo + ' volte');
  console.log('      \u2192 ' + detto.slice(0, 3).join(' | ').slice(0, 110));
});

/* «Poi puoi ATTRAVERSA il ponte»: dopo «puoi» ci va l'infinito, e
   l'elenco dei verbi era corto. Detto da una voce sintetica a chi non
   vede, fa dubitare di tutta la frase. */
prova('dopo «puoi» ci va sempre l infinito', () => {
  const g = Guida({ distanza: LADISTANZA, dist, verso });
  const prove = [
    ['Attraversa il ponte Marconi', 'attraversare'],
    ['Mantieni la destra', 'mantenere'],
    ['Svolta a destra su via Roma', 'svoltare'],
    ['Imbocca via Garibaldi', 'imboccare'],
    ['Prendi le scale', 'prendere'],
    ['Continua su viale di Trastevere', 'continuare'],
    ['Sali le scale', 'salire'],
    ['Esci dalla rotonda', 'uscire']
  ];
  prove.forEach(([dentro, atteso]) => {
    const fuori = g.puoi ? g.puoi(dentro) : null;
    if (!fuori) { guasto('puoi() non e esportata'); return; }
    if (fuori.indexOf(atteso) < 0) guasto('«' + dentro + '» -> «' + fuori + '»');
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove di emergenza e guida');
process.exit(passate === fatti.length ? 0 : 1);
