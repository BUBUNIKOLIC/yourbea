/* LE PROVE DEL RACCONTO A GRADINI — nuova Yourbea
   Il contratto detto da Vince: «il codice che non si blocca, che approfondisce
   i monumenti se uno si ferma 10 secondi».
   Si lancia senza telefono:  node nuova/prove/racconto.js                    */

'use strict';
const Distanza = require('../parti/distanza.js');
const LADISTANZA = Distanza({});
const Racconto = require('../parti/racconto.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* un palazzo con tutti i gradini, e una farmacia che non è un luogo */
const PALAZZO = { n: 'Palazzo del Governatore', lat: 44.8030, lon: 10.3288, k: 1,
  d: 'Occupa tutto il lato nord della piazza: nacque come Palazzo dei Mercanti fra il 1283 e il 1285.',
  i: 'La torre del 1673 sopra il voltone.',
  a: 'Da manuale: il 27 gennaio 1606 crollò la Torre civica...' };
const BATTISTERO = { n: 'Battistero di Parma', lat: 44.8035, lon: 10.3300, k: 1,
  d: 'Rosa di Verona, otto lati, fra romanico e gotico: lo cominciò Benedetto Antelami nel 1196.',
  i: 'I portali con i mesi e le stagioni.', a: 'Da manuale: la copertura a otto spicchi...' , r: 3 };
const FARMACIA = { n: 'Farmacia Pirani', lat: 44.8028, lon: 10.3290, k: 0, d: 'Farmacia Pirani' };

function mondo(t0) {
  let adesso = t0 || 1000000;
  const r = Racconto({ distanza: LADISTANZA,  ora: () => adesso });
  return {
    r,
    passano(ms) { adesso += ms; },
    quando() { return adesso; }
  };
}
const QUI = { lat: 44.8029, lon: 10.3289 };
function intorno(lista, qui) {
  // {p, m, rel} grezzo, come lo passerà la parte che guarda la posizione
  return lista.map(([p, m, rel]) => ({ p, m, rel }));
}

/* ==================== LE PROVE ==================== */

/* IN PASSI, NON IN METRI. «Dovrebbe essere più precisa con le distanze»
   (la sorella di Vince, 21/10): qui si diceva «a 80 metri» mentre tutto
   il resto dell'app diceva i passi, e si arrotondava a dieci metri. Ora
   la misura la dà parti/distanza.js, una per tutti. */
prova('camminando dà il cenno: da che parte e quanti passi', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (!d) return guasto('non ha detto niente camminando');
  if (d.tipo !== 'cenno') guasto('primo gradino sbagliato: ' + d.tipo);
  if (!/sulla destra/.test(d.testo)) guasto('il cenno non dice da che parte: ' + d.testo);
  if (!/\d+ passi/.test(d.testo)) guasto('il cenno non dice quanti passi: ' + d.testo);
  if (/metri/.test(d.testo)) guasto('dice ancora i metri: ' + d.testo);
  console.log('      → ' + d.testo);
  if (!/Palazzo del Governatore/.test(d.testo)) guasto('il cenno non dice il nome');
});

prova('lo stesso luogo non si annuncia due volte', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  const due = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 75, 30]]), modo: 'cultura' });
  if (due && due.tipo === 'cenno') guasto('ha ripetuto il cenno dello stesso luogo');
});

prova('FERMI CINQUE SECONDI: parte la scheda (il contratto di Vince)', () => {
  /* Erano dieci dal 16/10, quando il problema era l opposto: partiva a
     ogni sosta al semaforo. «Ti fermi 5 secondi sennò è lenta» (Vince,
     23/10): dieci secondi davanti a una chiesa sono tanti, uno si ferma,
     non succede niente e riparte. Da allora è arrivato il passometro,
     che sa se stai camminando davvero. */
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  // resto fermo: quattro secondi non bastano
  m.passano(4000);
  let d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (d && d.tipo === 'scheda') guasto('ha approfondito dopo quattro secondi');
  m.passano(1500);
  d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (!d || d.tipo !== 'scheda') guasto('fermo da cinque secondi e non parte la scheda: ' + (d && d.tipo));
  if (!/Palazzo dei Mercanti/.test(d.testo)) guasto('la scheda non è quella del luogo');
});

prova('fermi ancora: cosa vedere, poi l\'approfondimento, poi basta', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  m.passano(11000);
  const a = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  const b = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  const c = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (!a || a.tipo !== 'scheda') guasto('primo gradino: ' + (a && a.tipo));
  if (!b || b.tipo !== 'cosa-vedere') guasto('secondo gradino: ' + (b && b.tipo));
  if (!c || c.tipo !== 'approfondimento') guasto('terzo gradino: ' + (c && c.tipo));
  const d = m.r.ancora();
  if (!d || d.tipo !== 'finito') guasto('dopo il terzo gradino deve dire che ha finito');
});

prova('camminando invece NON approfondisce: si muove, quindi solo cenni', () => {
  const m = mondo();
  let qui = { lat: 44.8029, lon: 10.3289 };
  m.r.prossimo({ qui, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  for (let i = 0; i < 6; i++) {
    m.passano(3000);
    qui = { lat: qui.lat + 0.0002, lon: qui.lon };   // venti metri per volta
    const d = m.r.prossimo({ qui, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
    if (d && d.tipo !== 'cenno') guasto('camminando ha approfondito: ' + d.tipo);
  }
});

prova('«ancora» scende di un gradino anche camminando', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[BATTISTERO, 120, 10]]), modo: 'cultura' });
  const a = m.r.ancora();
  if (!a || a.tipo !== 'scheda') guasto('«ancora» non dà la scheda: ' + (a && a.tipo));
  const b = m.r.ancora();
  if (!b || b.tipo !== 'cosa-vedere') guasto('«ancora» non dà il cosa vedere');
  const c = m.r.ancora();
  if (!c || c.tipo !== 'approfondimento') guasto('«ancora» non arriva all\'approfondimento');
});

prova('IL DIFETTO DI GABRI: in Utilità «approfondisci» parla del monumento, non della farmacia', () => {
  const m = mondo();
  const lista = intorno([[FARMACIA, 43, -70], [BATTISTERO, 160, 5]]);
  const d = m.r.approfondisci({ qui: QUI, intorno: lista, modo: 'servizi' });
  if (!d) return guasto('non ha risposto');
  if (d.luogo && d.luogo.n === 'Farmacia Pirani') guasto('ha approfondito la farmacia: è il difetto di Gabri');
  if (!d.luogo || d.luogo.n !== 'Battistero di Parma') guasto('non ha scelto il monumento: ' + (d.luogo && d.luogo.n));
  if (!/Antelami/.test(d.testo)) guasto('non ha detto la scheda del monumento');
});

prova('IL DIFETTO DI GABRI: in Utilità un luogo importante è guida, non un cenno sacrificabile', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[BATTISTERO, 150, 10]]), modo: 'servizi' });
  if (!d) return guasto('in Utilità non annuncia il monumento: è quello che ha visto Gabri a Parma');
  if (d.livello !== 'guida') guasto('il monumento è stato messo a livello cenno: verrà buttato quando parla la strada');
});

prova('in Utilità i servizi non diventano racconti', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[FARMACIA, 30, 10]]), modo: 'servizi' });
  if (d && d.luogo && d.luogo.n === 'Farmacia Pirani') guasto('ha raccontato una farmacia come se fosse un luogo');
});

prova('niente intorno: lo dice, non resta zitto', () => {
  const m = mondo();
  const d = m.r.approfondisci({ qui: QUI, intorno: [], modo: 'servizi' });
  if (!d || d.tipo !== 'niente') guasto('non dice che non c\'è niente: il silenzio sembra un blocco');
});

prova('«vai oltre» passa al prossimo e non ripete quello saltato', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  const s = m.r.salta();
  if (!s || s.tipo !== 'avanti') guasto('«vai oltre» non risponde');
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30], [BATTISTERO, 150, 10]]), modo: 'cultura' });
  if (!d || !d.luogo || d.luogo.n !== 'Battistero di Parma') guasto('dopo «vai oltre» non passa al prossimo: ' + (d && d.luogo && d.luogo.n));
});

prova('un luogo lontano non si annuncia: il raggio dipende da quanto conta', () => {
  const m = mondo();
  const lontano = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 400, 10]]), modo: 'cultura' });
  if (lontano) guasto('ha annunciato un palazzo minore a quattrocento metri');
  const m2 = mondo();
  const grande = m2.r.prossimo({ qui: QUI, intorno: intorno([[BATTISTERO, 380, 10]]), modo: 'cultura' });
  if (!grande) guasto('un luogo grande a 380 metri in Turismo va detto');
});

/* I DUE DIFETTI DI VIA DEI CORAZZIERI, Roma, 15/10 la sera.
   Fermo in Turismo, l'app ha raccontato la ferramenta accanto. E guardando
   i dati si è visto il secondo, che nessuno aveva ancora sentito: chiese e
   ville segnate k 2 e 3 non si raccontavano in nessuna modalità. */
const FERRAMENTA = { n: 'Negozio di ferramenta e fai da te', lat: 44.80292, lon: 10.32892, k: 0,
  d: 'Negozio di ferramenta e fai da te, su Via dei Corazzieri.' };
const CHIESA = { n: 'Chiesa di Santa Maria delle Grazie', lat: 44.8031, lon: 10.3291, k: 2,
  d: 'Nel 1794 la colata alzò il livello del suolo di circa sei metri.', i: 'Il portale.' };

prova('in Turismo, da fermo, non racconta la ferramenta', () => {
  const m = mondo();
  const lista = intorno([[FERRAMENTA, 8, 0], [CHIESA, 40, 20]]);
  m.r.prossimo({ qui: QUI, intorno: lista, modo: 'cultura' });
  m.passano(11000);
  const d = m.r.prossimo({ qui: QUI, intorno: lista, modo: 'cultura' });
  if (d && /ferramenta/i.test(d.luogo.n)) guasto('da fermo in Turismo ha raccontato il negozio');
  if (!d) guasto('aveva una chiesa accanto e non ha detto niente');
});

prova('nemmeno in Utilità il negozio diventa un racconto', () => {
  const m = mondo();
  const lista = intorno([[FERRAMENTA, 8, 0]]);
  m.r.prossimo({ qui: QUI, intorno: lista, modo: 'servizi' });
  m.passano(11000);
  const d = m.r.prossimo({ qui: QUI, intorno: lista, modo: 'servizi' });
  if (d && /ferramenta/i.test(d.luogo.n)) guasto('ha letto la scheda del negozio invece di tacere');
});

prova('le chiese segnate 2 e 3 si raccontano', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[CHIESA, 60, 10]]), modo: 'cultura' });
  if (!d) guasto('una chiesa k=2 non veniva raccontata mai');
});

/* QUELLO CHE TI SEI LASCIATO DIETRO, chiesto da Vince il 16/10: «e hai
   passato questo monumento altrettanto importante… se non lo è, dietro di
   te hai superato». Camminando si passa accanto a una chiesa senza
   accorgersene: tacere vuol dire fargliela perdere per sempre. */
prova('un monumento importante superato si dice lo stesso', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[BATTISTERO, 70, 178]]),
                           modo: 'cultura', direzioneBuona: true });
  if (!d) guasto('un luogo importante a settanta metri dietro va detto');
  if (d && !/dietro di te/i.test(d.testo)) guasto('deve dire che è dietro: ' + d.testo);
  if (d && d.tipo !== 'cenno') guasto('e si deve poter chiedere «ancora»: è un racconto come gli altri');
});

prova('uno minore superato è solo una riga, e solo se è vicino', () => {
  const m = mondo();
  const vicino = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 30, 175]]),
                                modo: 'cultura', direzioneBuona: true });
  if (!vicino || vicino.tipo !== 'superato') guasto('a trenta metri si dice, in una riga: ' + JSON.stringify(vicino));
  const m2 = mondo();
  const lontano = m2.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 90, 175]]),
                                  modo: 'cultura', direzioneBuona: true });
  if (lontano) guasto('a novanta metri dietro non si fa tornare indietro nessuno');
});

prova('senza bussola non si dice mai «dietro»', () => {
  /* se non si sa come sei girato, «dietro di te» è una bugia */
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[BATTISTERO, 70, 178]]),
                           modo: 'cultura', direzioneBuona: false });
  if (d && /dietro/i.test(d.testo)) guasto('inventato: ' + d.testo);
});

/* ==================== il conto ==================== */
/* ============================================================
   UTILITA' NON E' TURISMO — 19/10/2026
   «Non c'è differenza tra modalità utilità e modalità turismo… un non
   vedente in modalità utilità vuole sapere cosa c'è: davanti hai il
   municipio, lo stadio, oltre le fermate dell'autobus. Invece il turismo
   vuole sapere le cose artistiche, storiche e architettoniche» (Vince,
   provando a Fuorigrotta e a Torre del Greco).
   Il quaderno: fermandosi in UTILITA' l'app leggeva la scheda storica del
   PalArgento, della piscina Scandone e dello zoo.                        */

const STADIO = { n: 'Diego Armando Maradona', t: 'stadio', k: 2, lat: 40.8280, lon: 14.1930,
                 d: 'Lo stadio fu costruito nel 1959 su progetto di Carlo Cocchia e '.repeat(4),
                 i: 'la copertura ellittica', a: 'Fu ampliato per i Mondiali del 1990. '.repeat(3) };

prova('IN UTILITA, da fermi, si dice COS E e non la storia', () => {
  const w = mondo();
  const qui = { lat: STADIO.lat + 0.0001, lon: STADIO.lon };
  const intorno = [{ p: STADIO, m: 12, rel: 0 }];
  w.r.prossimo({ qui, intorno, modo: 'servizi', direzioneBuona: true });   // primo giro: si muove
  w.passano(20000);
  const d = w.r.prossimo({ qui, intorno, modo: 'servizi', direzioneBuona: true });
  if (!d) { guasto('non ha detto niente'); return; }
  if (d.tipo === 'scheda' || /costruito nel 1959/.test(d.testo))
    guasto('in Utilita ha letto la scheda storica: ' + d.testo.slice(0, 60));
  if (!/stadio/.test(d.testo)) guasto('non dice che cosa e: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('IN TURISMO, da fermi, la storia si racconta', () => {
  const w = mondo();
  const qui = { lat: STADIO.lat + 0.0001, lon: STADIO.lon };
  const intorno = [{ p: STADIO, m: 12, rel: 0 }];
  w.r.prossimo({ qui, intorno, modo: 'cultura', direzioneBuona: true });
  w.passano(20000);
  const d = w.r.prossimo({ qui, intorno, modo: 'cultura', direzioneBuona: true });
  if (!d) { guasto('non ha detto niente'); return; }
  if (!/costruito nel 1959/.test(d.testo)) guasto('in Turismo deve raccontare: ' + (d.testo || '').slice(0, 60));
});

prova('IN UTILITA non si ripete «qui c e lo stadio» ogni dieci secondi', () => {
  const w = mondo();
  const qui = { lat: STADIO.lat + 0.0001, lon: STADIO.lon };
  const intorno = [{ p: STADIO, m: 12, rel: 0 }];
  w.r.prossimo({ qui, intorno, modo: 'servizi', direzioneBuona: true });
  w.passano(20000);
  const uno = w.r.prossimo({ qui, intorno, modo: 'servizi', direzioneBuona: true });
  if (!uno) { guasto('la prima non e uscita'); return; }
  w.passano(20000);
  const due = w.r.prossimo({ qui, intorno, modo: 'servizi', direzioneBuona: true });
  if (due && /stadio/.test(due.testo || '')) guasto('lo ha ridetto dopo venti secondi: ' + due.testo);
});

/* ---------- L'ARTICOLO NON SI PERDE QUANDO IL NOME E' GIA' IL TIPO ----------
   Il 20/10 si tolse il tipo doppio («la chiesa cattolica chiesa di San
   Marco»): giusto, ma insieme al doppione se n'e' andato anche
   l'articolo, e in Utilita' usciva «Qui c'e' Chiesa del Carmine», «Qui
   c'e' Palazzo Reale», «Qui c'e' Fontana di Trevi». Trovato il 21/10
   scrivendo le descrizioni orientative. */
prova('«Qui c e LA Chiesa del Carmine», non «Qui c e Chiesa del Carmine»', () => {
  const r = Racconto({ distanza: LADISTANZA, });
  const casi = [
    { n: 'Chiesa del Carmine',    t: 'chiesa',     vuole: /^la Chiesa del Carmine$/ },
    { n: 'Basilica di Massenzio', t: 'basilica',   vuole: /^la Basilica di Massenzio$/ },
    { n: 'Palazzo Reale',         t: 'palazzo',    vuole: /^il Palazzo Reale$/ },
    { n: 'Fontana di Trevi',      t: 'fontana',    vuole: /^la Fontana di Trevi$/ },
    { n: 'Teatro Massimo',        t: 'teatro',     vuole: /^il Teatro Massimo$/ },
    { n: 'Stadio Olimpico',       t: 'stadio',     vuole: /^lo Stadio Olimpico$/ }
  ];
  casi.forEach((c) => {
    const d = r.conArticolo({ n: c.n, t: c.t });
    if (!c.vuole.test(d)) guasto('«' + c.n + '» → «' + d + '»');
  });
  console.log('      → ' + casi.map((c) => r.conArticolo({ n: c.n, t: c.t })).join(' · '));
});

prova('e quello che gia aveva l articolo non ne prende un altro', () => {
  const r = Racconto({ distanza: LADISTANZA, });
  const d = r.conArticolo({ n: 'Il Vittoriano', t: 'monumento' });
  if (/^(il|la|lo)\s+(Il|La|Lo)\s/i.test(d)) guasto('due articoli: ' + d);
});

/* ---------- PRIMA COS'HAI DAVANTI, POI LA STORIA ----------
   Il cenno dice gia' da che parte e quanto manca: «sulla destra, a 80
   metri, la Basilica di Massenzio». Fermandosi dieci secondi, quello che
   serve NON e' la voce di Wikipedia — «fu fatta costruire da Massenzio
   agli inizi del IV secolo» — ma cos'hai davanti: quanto e' grande, di
   che e' fatta, che forma ha. La storia viene dopo, dicendo «ancora».
   I gradini diventano: 0 com'e' fatta, 1 la storia, 2 cosa vedere... */
prova('la scheda dice com e FATTA, e la storia passa ad «ancora»', () => {
  const Descrizione = require('../parti/descrizione.js');
  const r = Racconto({ distanza: LADISTANZA,  descrizione: Descrizione({ conArticolo: Racconto({ distanza: LADISTANZA, }).conArticolo }) });
  const p = { n: 'Basilica di Massenzio', t: 'basilica', k: 3, lat: 41.8925, lon: 12.4889,
              h: 35, l: 65, mat: ['marmo'], frm: ['abside', 'colonne'],
              d: 'Fu fatta costruire da Massenzio agli inizi del IV secolo.' };
  const qui = { lat: 41.8923, lon: 12.4889 };
  // il cenno, camminando
  const cenno = r.prossimo({ qui: qui, intorno: [{ p: p, m: 22 }], modo: 'cultura', direzioneBuona: true });
  if (!cenno || cenno.tipo !== 'cenno') { guasto('niente cenno: ' + JSON.stringify(cenno)); return; }
  // fermandosi: la prima cosa che si sente
  const uno = r.ancora();
  if (!uno) { guasto('niente scheda'); return; }
  if (/IV secolo/.test(uno.testo)) guasto('la prima cosa e ancora la storia: ' + uno.testo);
  if (!/marmo|palazzo di|larga/.test(uno.testo)) guasto('non dice com e fatta: ' + uno.testo);
  console.log('      → ' + uno.testo);
  // «ancora»: adesso la storia
  const due = r.ancora();
  if (!due || !/IV secolo/.test(due.testo)) guasto('«ancora» non da la storia: ' + JSON.stringify(due && due.testo));
  console.log('      → ' + (due && due.testo));
});

prova('senza dati su com e fatta, tutto resta come prima', () => {
  const Descrizione = require('../parti/descrizione.js');
  const r = Racconto({ distanza: LADISTANZA,  descrizione: Descrizione({ conArticolo: Racconto({ distanza: LADISTANZA, }).conArticolo }) });
  const p = { n: 'Chiesa di San Luigi dei Francesi', t: 'chiesa', k: 3, lat: 41.8991, lon: 12.4745,
              d: 'La chiesa fu costruita fra il 1518 e il 1589.' };
  r.prossimo({ qui: { lat: 41.8989, lon: 12.4745 }, intorno: [{ p: p, m: 22 }], modo: 'cultura', direzioneBuona: true });
  const uno = r.ancora();
  if (!uno || !/1518/.test(uno.testo)) guasto('senza dati doveva dire la storia subito: ' + JSON.stringify(uno && uno.testo));
});

prova('e «ti ho detto tutto» arriva alla fine, non prima', () => {
  const Descrizione = require('../parti/descrizione.js');
  const r = Racconto({ distanza: LADISTANZA,  descrizione: Descrizione({ conArticolo: Racconto({ distanza: LADISTANZA, }).conArticolo }) });
  const p = { n: 'Torre A', t: 'torre', k: 3, lat: 41.9, lon: 12.5, h: 40, mat: ['pietra'],
              d: 'Fu eretta nel Trecento.' };
  r.prossimo({ qui: { lat: 41.8998, lon: 12.5 }, intorno: [{ p: p, m: 22 }], modo: 'cultura', direzioneBuona: true });
  const detti = [];
  for (let i = 0; i < 5; i++) { const x = r.ancora(); if (!x) break; detti.push(x.tipo); }
  /* «ti ho detto tutto» si ripete a chi richiede, ed e' giusto cosi':
     quello che conta e' che venga DOPO tutti e due i gradini veri. */
  if (detti[0] !== 'scheda-orientativa') guasto('non comincia da com e fatta: ' + detti.join(','));
  if (detti[1] !== 'scheda') guasto('la storia non e il secondo gradino: ' + detti.join(','));
  if (detti.indexOf('finito') < 2) guasto('finisce troppo presto: ' + detti.join(','));
  console.log('      → i gradini: ' + detti.join(' → '));
});

prova('«l edificio», non «il edificio»: davanti a vocale ci vuole l apostrofo', () => {
  const r = Racconto({ distanza: LADISTANZA, });
  const casi = [
    { n: 'edificio palazzo del Consorzio agrario', t: 'edificio', vuole: /^l'edificio/ },
    { n: 'Arco di Augusto',  t: 'arco',       vuole: /^l'Arco/ },
    { n: 'Ospedale Maggiore', t: 'ospedale',  vuole: /^l'Ospedale/ },
    { n: 'Isola Tiberina',    t: 'isola',     vuole: /^l'Isola/ }
  ];
  casi.forEach((c) => {
    const d = r.conArticolo({ n: c.n, t: c.t });
    if (!c.vuole.test(d)) guasto('«' + c.n + '» → «' + d + '»');
  });
  console.log('      → ' + casi.map((c) => r.conArticolo({ n: c.n, t: c.t })).join(' · '));
});

/* ---------- FERMANDOSI: ANCHE DI LI' ESCE COM'E' FATTA ----------
   Il 21/10, nel banco: i dati c'erano, la parte produceva la frase
   giusta, la regola la lasciava passare — e l'app diceva lo stesso la
   voce di Wikipedia. Causa: i gradini erano scritti DUE VOLTE, in
   ancora() e dentro prossimo() (il ramo di chi si ferma dieci secondi), e
   io ne avevo corretta una sola. Adesso il conto dei gradini sta in un
   posto solo: se si sdoppia di nuovo, questa prova se ne accorge. */
prova('FERMANDOSI davanti, la prima cosa e com e fatta — non la storia', () => {
  const Descrizione = require('../parti/descrizione.js');
  let adesso = 1000000;
  const r = Racconto({ distanza: LADISTANZA, ora: () => adesso,
                       descrizione: Descrizione({ distanza: LADISTANZA, conArticolo: Racconto({}).conArticolo }) });
  const p = { n: 'Chiesa di Prova', t: 'chiesa', k: 3, lat: 44.8030, lon: 10.3290,
              mat: ['mattoni'], frm: ['campanile'],
              d: 'La chiesa fu edificata nel 1450 e rifatta nel Settecento.' };
  const qui = { lat: 44.8029, lon: 10.3289 };
  const giro = () => r.prossimo({ qui: qui, intorno: intorno([[p, 30, 10]], qui), modo: 'cultura', direzioneBuona: true });
  giro();                     // il cenno, camminando
  adesso += 11000;            // e adesso sono fermo da undici secondi
  const d = giro();
  if (!d) { guasto('fermandosi non ha detto niente'); return; }
  if (d.tipo !== 'scheda-orientativa') guasto('fermandosi dice ancora la storia per prima: ' + d.tipo + ' — ' + d.testo.slice(0, 60));
  else console.log('      → ' + d.testo);
});

/* ==================== IL MOVIMENTO: NON SI TACE, SI GUARDA PIU' LONTANO ====================
   «Turismo non ha mai parlato» (Vince, 21/10, da Termini a casa, fino a 77
   km/h). La regola del cenno buttava via tutto. Adesso vale la regola di
   Soundscape: raggio per sei, solo le cose grandi, e i metri al posto dei
   passi. Queste quattro prove sono quelle che il quaderno di quella sera
   avrebbe fatto fallire. */

const BASILICA = { n: 'Basilica di Prova', lat: 44.8100, lon: 10.3289, k: 1, r: 3,
  d: 'Una basilica grande abbastanza da vedersi da lontano.', i: 'Il portale.' };
const CHIESETTA = { n: 'Chiesetta di Prova', lat: 44.8030, lon: 10.3289, k: 1,
  d: 'Una chiesetta che camminando si racconta e in macchina no.' };

prova('IN MOVIMENTO NON SI RACCONTA NIENTE, ne vicino ne lontano', () => {
  /* «Deve essere tarata sul camminare sempre. Scooter, taxi e auto non
     serve» (Vince, 22/10). La storia di un palazzo la ascolti stando
     davanti al palazzo. */
  const m = mondo();
  for (const quanto of [60, 120, 600]) {
    const d = m.r.prossimo({ qui: QUI, intorno: intorno([[BASILICA, quanto, 10]], QUI),
                             modo: 'cultura', direzioneBuona: true, aPiedi: false });
    if (d) guasto('a ' + quanto + ' metri parla lo stesso: ' + d.testo);
  }
});

prova('in movimento la chiesetta non si dice: a quella velocita e rumore', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[CHIESETTA, 100, 10]], QUI),
                           modo: 'cultura', direzioneBuona: true, aPiedi: false });
  if (d) guasto('in macchina dice anche le cose piccole: ' + d.testo);
});

prova('quello che non si e detto in macchina non si e consumato', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[CHIESETTA, 100, 10]], QUI),
                 modo: 'cultura', direzioneBuona: true, aPiedi: false });
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[CHIESETTA, 100, 10]], QUI),
                           modo: 'cultura', direzioneBuona: true, aPiedi: true });
  if (!d) return guasto('sceso dalla macchina, la chiesetta e sparita per sempre');
  console.log('      → ' + d.testo);
});

prova('camminando la basilica a 900 metri resta troppo lontana', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[BASILICA, 900, 10]], QUI),
                           modo: 'cultura', direzioneBuona: true, aPiedi: true });
  if (d) guasto('a piedi annuncia roba a 900 metri: ' + d.testo);
});

prova('in Turismo un luogo senza scheda non prende il cenno', () => {
  const m = mondo();
  const senza = { n: 'Ferramenta Prova', lat: 44.8030, lon: 10.3290, k: 1, senzaScheda: true };
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[senza, 50, 10]], QUI),
                           modo: 'cultura', direzioneBuona: true, aPiedi: true });
  if (d) guasto('in Turismo accenna una cosa che poi non sa raccontare: ' + d.testo);
});

prova('QUELLO CHE HAI LASCIATO A 270 KM NON TE LO RACCONTA PIU', () => {
  /* 22/10 notte, camminando sui Fori Imperiali dentro l emulatore: «Qui
     c e il Palazzo Guidiccioni». Quel palazzo sta a Lucca. Era il luogo
     «in corso» della camminata di prima, e inCorso non ha mai avuto un
     controllo di distanza: bastava fermarsi dieci secondi, dovunque nel
     mondo. Succede a chiunque prenda un treno. */
  const m = mondo();
  const lucca = { n: 'Palazzo Guidiccioni', t: 'palazzo', lat: 43.84403, lon: 10.5048,
                  k: 1, d: 'Un palazzo che sta a Lucca.' };
  const aLucca = { lat: 43.8440, lon: 10.5047 };
  m.r.prossimo({ qui: aLucca, intorno: intorno([[lucca, 20, 0]], aLucca),
                 modo: 'cultura', direzioneBuona: true, aPiedi: true });
  if (!m.r.inCorso()) return guasto('a Lucca non lo ha nemmeno preso in carico');
  const aiFori = { lat: 41.8902, lon: 12.4922 };
  m.passano(60000);
  let d = null;
  for (let i = 0; i < 3; i++) { m.passano(5000); d = m.r.prossimo({ qui: aiFori, intorno: [], modo: 'cultura', direzioneBuona: true, aPiedi: true }); }
  if (d) guasto('ai Fori racconta ancora Lucca: ' + d.testo);
  if (m.r.ancora()) guasto('e «ancora» riprende da Lucca');
  if (m.r.inCorso()) guasto('il luogo in corso e ancora quello di Lucca');
});

prova('MA A VENTI METRI RESTA QUELLO CHE STAI GUARDANDO', () => {
  const m = mondo();
  const p = { n: 'Chiesa di Prova', t: 'chiesa', lat: 44.8030, lon: 10.3290, k: 1,
              d: 'La chiesa fu edificata nel 1450.', i: 'Il portale.' };
  m.r.prossimo({ qui: QUI, intorno: intorno([[p, 25, 0]], QUI), modo: 'cultura', direzioneBuona: true, aPiedi: true });
  if (!m.r.inCorso()) return guasto('non lo ha preso in carico');
  /* ci si sposta di una ventina di metri: sei ancora davanti, e «ancora»
     deve continuare a parlare di quello */
  const poco = { lat: QUI.lat + 0.00018, lon: QUI.lon };
  m.passano(5000);
  m.r.prossimo({ qui: poco, intorno: intorno([[p, 30, 0]], poco), modo: 'cultura', direzioneBuona: true, aPiedi: true });
  if (!m.r.inCorso()) guasto('spostandosi di venti metri lo ha gia lasciato perdere');
  if (!m.r.ancora()) guasto('e «ancora» non dice piu niente');
});

/* ============================================================
   IL RANGO: UN CAMPO SOLO, NON DUE
   Vince, 23/10, tornando dal medico: «passavo davanti ai monumenti e
   non mi diceva nulla». La causa: daRaccontare() guardava `k` e nei
   20.836 luoghi d'Italia `k` non c'era in nessuno; e rango() guardava
   `r`, che non c'e' in nessuno nemmeno adesso.
   ============================================================ */
prova('un luogo col rango nei dati si racconta', () => {
  const r = Racconto({ distanza: LADISTANZA });
  const p = { n: 'Duomo di Siracusa', t: 'duomo', lat: 37.0590, lon: 15.2936,
              k: 3, d: 'Il duomo di Siracusa ingloba un tempio dorico.' };
  const qui = { lat: 37.0592, lon: 15.2936, direzione: 0, direzioneBuona: true };
  const d = r.prossimo({ qui: qui, intorno: [{ p: p, m: 22, rel: 0 }],
                         modo: 'servizi', direzioneBuona: true, aPiedi: true });
  if (!d) { guasto('un duomo a ventidue passi e non dice niente'); return; }
  if (!/Duomo/.test(d.testo)) guasto('dice altro: ' + d.testo);
  console.log('      \u2192 ' + d.testo);
});

/* IL RAGGIO SEGUE IL RANGO, e il rango sta in `k`. Un duomo si dice da
   piu' lontano di una casa: se rango() non legge `k`, resta il raggio
   minimo per tutti e i monumenti importanti passano inosservati. */
prova('il raggio di un luogo importante e piu largo', () => {
  const grande = { n: 'Duomo di Prova', t: 'duomo', lat: 44.0, lon: 11.0, k: 3,
                   d: 'Una scheda.' };
  const piccolo = { n: 'Casa Prova', t: 'casa', lat: 44.0, lon: 11.0, k: 1,
                    d: 'Una scheda.' };
  const qui = { lat: 44.0, lon: 11.0, direzione: 0, direzioneBuona: true };
  const a = Racconto({ distanza: LADISTANZA }).prossimo({ qui: qui, intorno: [{ p: grande, m: 230, rel: 0 }],
                           modo: 'servizi', direzioneBuona: true, aPiedi: true });
  const b = Racconto({ distanza: LADISTANZA }).prossimo({ qui: qui, intorno: [{ p: piccolo, m: 230, rel: 0 }],
                           modo: 'servizi', direzioneBuona: true, aPiedi: true });
  if (!a) guasto('il duomo a 230 metri non si dice');
  if (b) guasto('la casa a 230 metri si dice, e non dovrebbe');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove del racconto');
process.exit(passate === fatti.length ? 0 : 1);
