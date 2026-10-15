/* LE PROVE DEL RACCONTO A GRADINI — nuova Yourbea
   Il contratto detto da Vince: «il codice che non si blocca, che approfondisce
   i monumenti se uno si ferma 10 secondi».
   Si lancia senza telefono:  node nuova/prove/racconto.js                    */

'use strict';
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
  const r = Racconto({ ora: () => adesso });
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

prova('camminando dà il cenno: da che parte e quanti metri', () => {
  const m = mondo();
  const d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (!d) return guasto('non ha detto niente camminando');
  if (d.tipo !== 'cenno') guasto('primo gradino sbagliato: ' + d.tipo);
  if (!/sulla destra/.test(d.testo) || !/80 metri/.test(d.testo)) guasto('il cenno non dice parte e metri: ' + d.testo);
  if (!/Palazzo del Governatore/.test(d.testo)) guasto('il cenno non dice il nome');
});

prova('lo stesso luogo non si annuncia due volte', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  const due = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 75, 30]]), modo: 'cultura' });
  if (due && due.tipo === 'cenno') guasto('ha ripetuto il cenno dello stesso luogo');
});

prova('FERMI DIECI SECONDI: parte la scheda (il contratto di Vince)', () => {
  const m = mondo();
  m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  // resto fermo: nove secondi non bastano
  m.passano(9000);
  let d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (d && d.tipo === 'scheda') guasto('ha approfondito dopo nove secondi, non dieci');
  m.passano(1500);
  d = m.r.prossimo({ qui: QUI, intorno: intorno([[PALAZZO, 80, 30]]), modo: 'cultura' });
  if (!d || d.tipo !== 'scheda') guasto('fermo da dieci secondi e non parte la scheda: ' + (d && d.tipo));
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

/* ==================== il conto ==================== */
const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove del racconto');
process.exit(passate === fatti.length ? 0 : 1);
