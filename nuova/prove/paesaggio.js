/* LE PROVE DEL PAESAGGIO — nuova Yourbea
   «Il non vedente vuole che sia descritta la realtà circostante: di fronte,
   davanti a te hai il golfo, Raito, i Due Fratelli… sennò numeri civici»
   (Vince, 18/10, tornando da Vietri sul Mare).
   Si lancia:  node nuova/prove/paesaggio.js                               */

'use strict';
const Paesaggio = require('../parti/paesaggio.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
function dist(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const a = Math.sin((la2 - la1) * r / 2) ** 2 +
            Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function verso(la1, lo1, la2, lo2) {
  const r = Math.PI / 180;
  const y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function mondo(t0) {
  let adesso = t0 || 1000000;
  const p = Paesaggio({ dist, verso, ora: () => adesso });
  return { p, passano(ms) { adesso += ms; } };
}

/* Vietri sul Mare, dove Vince ha fatto la prova del 18/10 */
const VIETRI = { lat: 40.6730, lon: 14.7270 };
const FRATELLI = { n: 'I Due Fratelli', t: 'isola', lat: 40.6680, lon: 14.7180, d: 'x'.repeat(300) };
const RAITO = { n: 'Raito', t: 'frazione', lat: 40.6750, lon: 14.7180, d: 'y'.repeat(250) };
const COSTIERA = { n: 'Costiera amalfitana', t: 'costa', lat: 40.6500, lon: 14.6000, d: 'z'.repeat(400) };
const MONTE = { n: 'Monte Finestra', t: 'montagna', lat: 40.7100, lon: 14.6700, d: 'w'.repeat(300) };
const CHIESA = { n: 'chiesa di San Giovanni', t: 'chiesa', lat: 40.6700, lon: 14.7200, d: 'c'.repeat(300) };

prova('LA FRASE DI VINCE: davanti a te hai, e dall\'altra parte', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true,
                          luoghi: [FRATELLI, RAITO, COSTIERA, MONTE] });
  if (!d) { guasto('non ha detto niente'); return; }
  if (!/^Davanti a te hai /.test(d.testo)) guasto('non comincia come deve: ' + d.testo);
  if (!/, e (sulla destra|sulla sinistra) /.test(d.testo)) guasto('non unisce con la e: ' + d.testo);
  if (d.livello !== 'cenno') guasto('deve essere un cenno: non taglia mai un racconto');
  console.log('      → ' + d.testo);
});

prova('REGOLA 1 — una chiesa non è paesaggio, per quanto vicina', () => {
  const w = mondo();
  if (w.p.eDelPaesaggio(CHIESA)) guasto('una chiesa non è paesaggio');
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [CHIESA] });
  if (d) guasto('ha raccontato una chiesa: ' + d.testo);
});

prova('REGOLA 1 — il lontano si vede, il vicino piccolo no', () => {
  const w = mondo();
  const fiumeLontano = { n: 'Irno', t: 'fiume', lat: 40.70, lon: 14.78 };   // ~5 km
  const d = w.p.intorno({ qui: VIETRI, direzione: 45, direzioneBuona: true, luoghi: [fiumeLontano] });
  if (d) guasto('un fiume a cinque chilometri non si vede: ' + d.testo);
  /* e il contrario: anche una cosa grande, se e' davvero lontana, si tace.
     La Costiera amalfitana su Wikidata e' un punto solo — il suo centro —
     che da Vietri sta a undici chilometri: dire «davanti a te hai la
     costiera» indicando un punto a undici chilometri sarebbe una bugia,
     anche se la costiera comincia sotto i piedi. */
  const w2 = mondo();
  if (w2.p.intorno({ qui: VIETRI, direzione: 300, direzioneBuona: true, luoghi: [COSTIERA] }))
    guasto('ha indicato un punto a undici chilometri come se fosse davanti');
  const w3 = mondo();
  const costaVicina = { n: 'Costiera amalfitana', t: 'costa', lat: 40.665, lon: 14.70, d: 'z'.repeat(400) };
  if (!w3.p.intorno({ qui: VIETRI, direzione: 250, direzioneBuona: true, luoghi: [costaVicina] }))
    guasto('una costa a due chilometri va detta: e grande');
});

prova('REGOLA 2 — mai in passi', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [FRATELLI, RAITO] });
  if (/passi/.test(d.testo)) guasto('ha misurato in passi: ' + d.testo);
  if (!/(qui vicino|mezzo chilometro|paio di chilometri|in lontananza)/.test(d.testo))
    guasto('non dice quanto è lontano: ' + d.testo);
});

prova('REGOLA 3 — mai il nord, e senza bussola non si parla', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [FRATELLI, RAITO] });
  if (/\b(nord|sud|est|ovest)\b/i.test(d.testo)) guasto('ha detto un punto cardinale: ' + d.testo);
  const w2 = mondo();
  if (w2.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: false, luoghi: [FRATELLI] }))
    guasto('ha detto una parte senza sapere come sei girato');
  const w3 = mondo();
  if (w3.p.intorno({ qui: VIETRI, direzioneBuona: true, luoghi: [FRATELLI] }))
    guasto('ha parlato senza direzione');
});

prova('REGOLA 4 — due cose, non un elenco', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true,
                          luoghi: [FRATELLI, RAITO, COSTIERA, MONTE] });
  const quanti = (d.testo.match(/,/g) || []).length;
  if (d.testo.split(', e ').length > 2) guasto('ha elencato: ' + d.testo);
});

prova('REGOLA 5 — lo stesso golfo non si ridice ogni minuto', () => {
  const w = mondo();
  const uno = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [FRATELLI, RAITO] });
  if (!uno) { guasto('la prima non è uscita'); return; }
  w.passano(60000);
  if (w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [FRATELLI, RAITO] }))
    guasto('ha ridetto le stesse cose dopo un minuto');
  w.passano(1000000);
  if (!w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [FRATELLI, RAITO] }))
    guasto('dopo un quarto d\'ora si può ridire');
});

prova('REGOLA 6 — si dice cos\'è, ma non si raddoppia', () => {
  const w = mondo();
  if (w.p.nome(RAITO) !== 'il paese di Raito') guasto('Raito: ' + w.p.nome(RAITO));
  if (w.p.nome(MONTE) !== 'Monte Finestra') guasto('ha raddoppiato il monte: ' + w.p.nome(MONTE));
  if (w.p.nome(FRATELLI) !== 'I Due Fratelli') guasto('ha raddoppiato l\'isola: ' + w.p.nome(FRATELLI));
  if (w.p.nome(COSTIERA) !== 'Costiera amalfitana') guasto('ha raddoppiato la costa: ' + w.p.nome(COSTIERA));
});

prova('da sola, la frase del lato si gira bene', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 30, direzioneBuona: true, luoghi: [RAITO] });
  if (!d) { guasto('non ha detto niente'); return; }
  if (/^Hai sulla/.test(d.testo)) guasto('frase storta: ' + d.testo);
  if (!/^(Sulla destra|Sulla sinistra) hai /.test(d.testo)) guasto('non si è girata: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('niente intorno: niente da dire, e non scoppia', () => {
  const w = mondo();
  if (w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [] })) guasto('ha parlato nel vuoto');
  if (w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true })) guasto('ha parlato senza luoghi');
  if (w.p.intorno({})) guasto('ha parlato senza niente');
});

/* REGOLA 7 — «non è il particolare, è la regola generale» (Vince, 19/10).
   Quello che si guarda dipende da come ti muovi: a piedi vicino, in
   macchina lontano, perche' il vicino sfila via e il lontano resta.      */
prova('REGOLA 7 — in macchina si guarda quattro volte piu lontano', () => {
  /* una montagna a dodici chilometri: fuori dai cinque del raggio a piedi,
     dentro i venti di chi va in macchina */
  const lontano = { n: 'Monte Finestra', t: 'montagna', lat: 40.7600, lon: 14.6300, d: 'v'.repeat(400) };
  const w = mondo();
  if (w.p.intorno({ qui: VIETRI, direzione: 325, direzioneBuona: true, luoghi: [lontano] }))
    guasto('a piedi non si annuncia una montagna a venti chilometri');
  const w2 = mondo();
  const d = w2.p.intorno({ qui: VIETRI, direzione: 325, direzioneBuona: true,
                           aPiedi: false, luoghi: [lontano] });
  if (!d) guasto('in macchina il panorama lontano va detto');
  else console.log('      → ' + d.testo);
});

prova('REGOLA 7 — e si parla piu spesso, perche il panorama cambia', () => {
  const w = mondo();
  const uno = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true,
                            aPiedi: false, luoghi: [FRATELLI, RAITO] });
  if (!uno) { guasto('la prima non e uscita'); return; }
  w.passano(300000);                      // cinque minuti
  const nuovi = [{ n: 'Costa di Amalfi', t: 'costa', lat: 40.650, lon: 14.700, d: 'c'.repeat(300) }];
  if (!w.p.intorno({ qui: VIETRI, direzione: 250, direzioneBuona: true, aPiedi: false, luoghi: nuovi }))
    guasto('in macchina dopo cinque minuti si puo ridire');
  const w2 = mondo();
  w2.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [FRATELLI, RAITO] });
  w2.passano(300000);
  if (w2.p.intorno({ qui: VIETRI, direzione: 250, direzioneBuona: true, luoghi: nuovi }))
    guasto('a piedi dopo cinque minuti e troppo presto');
});

/* IN CITTA' NON C'E' ORIZZONTE (Vince, 23/10: «mi diceva in lontananza
   Isola Tiberina»). L'isola e' lunga trecento metri e sta fra i palazzi:
   era un'«isola», e le isole le guardavamo fino a cinque chilometri. */
function cittaIntorno(lat, lon, quanti) {
  const fuori = [];
  for (let i = 0; i < quanti; i++) {
    fuori.push({ n: 'palazzo ' + i, t: 'palazzo',
                 lat: lat + (i % 7) * 0.0004, lon: lon + (i % 5) * 0.0004 });
  }
  return fuori;
}

prova('in citta un isolotto a un chilometro e mezzo non si dice', () => {
  const p = Paesaggio({ dist, verso });
  const isola = { n: 'Isola Tiberina', t: 'isola', lat: 41.8905, lon: 12.4777 };
  const qui = { lat: 41.9009, lon: 12.4833 };    // fontana di Trevi
  const luoghi = cittaIntorno(qui.lat, qui.lon, 40).concat([isola]);
  const d = p.intorno({ qui: qui, direzione: 200, direzioneBuona: true,
                        luoghi: luoghi, aPiedi: true });
  if (d && /Tiberina/.test(d.testo)) guasto('lo dice lo stesso: ' + d.testo);
});

/* ma il Vesuvio da Napoli si vede eccome: dieci chilometri, e in citta' */
prova('in citta una montagna lontana si dice', () => {
  const p = Paesaggio({ dist, verso });
  const qui = { lat: 40.8518, lon: 14.2681 };
  const vesuvio = { n: 'Vesuvio', t: 'montagna', lat: 40.8220, lon: 14.4260 };
  const luoghi = cittaIntorno(qui.lat, qui.lon, 40).concat([vesuvio]);
  const d = p.intorno({ qui: qui, direzione: 100, direzioneBuona: true,
                        luoghi: luoghi, aPiedi: false });
  if (!d || !/Vesuvio/.test(d.testo)) guasto('non lo dice: ' + (d ? d.testo : 'niente'));
  console.log('      \u2192 ' + d.testo);
});

/* e fuori citta' la regola non cambia niente: a Vietri il golfo e' li' */
prova('fuori citta il golfo vicino si dice come prima', () => {
  const p = Paesaggio({ dist, verso });
  const qui = { lat: 40.6700, lon: 14.7280 };
  const golfo = { n: 'Salerno', t: 'golfo', lat: 40.6600, lon: 14.7400 };
  const d = p.intorno({ qui: qui, direzione: 130, direzioneBuona: true,
                        luoghi: [golfo], aPiedi: true });
  if (!d || !/golfo/.test(d.testo)) guasto('non lo dice: ' + (d ? d.testo : 'niente'));
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove del paesaggio');
process.exit(passate === fatti.length ? 0 : 1);
