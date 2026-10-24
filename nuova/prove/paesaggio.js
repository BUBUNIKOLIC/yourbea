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
/* I DUE FRATELLI SONO UN'ISOLA, e dal 24/10 le isole non sono paesaggio:
   l'Isola Tiberina, a via dei Corazzieri, era la stessa classe. Qui resta
   per le prove che controllano proprio questo, e dove serviva una cosa
   «davanti a te» si usa il GOLFO, che si vede e non si raggiunge. */
const FRATELLI = { n: 'I Due Fratelli', t: 'isola', gr: 200, lat: 40.6680, lon: 14.7180, d: 'x'.repeat(300) };
const GOLFO = { n: 'golfo di Salerno', t: 'golfo', gr: 30000, lat: 40.6680, lon: 14.7180, d: 'g'.repeat(300) };
const RAITO = { n: 'Raito', t: 'frazione', gr: 700, lat: 40.6750, lon: 14.7180, d: 'y'.repeat(250) };
const COSTIERA = { n: 'Costiera amalfitana', t: 'costa', gr: 40000, lat: 40.6500, lon: 14.6000, d: 'z'.repeat(400) };
const MONTE = { n: 'Monte Finestra', t: 'montagna', gr: 2500, lat: 40.7100, lon: 14.6700, d: 'w'.repeat(300) };
const CHIESA = { n: 'chiesa di San Giovanni', t: 'chiesa', lat: 40.6700, lon: 14.7200, d: 'c'.repeat(300) };

prova('LA FRASE DI VINCE: davanti a te hai, e dall\'altra parte', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true,
                          luoghi: [GOLFO, RAITO, COSTIERA, MONTE] });
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
  const fiumeLontano = { n: 'Irno', t: 'fiume', gr: 60, lat: 40.70, lon: 14.78 };   // ~5 km, largo 60 metri
  const d = w.p.intorno({ qui: VIETRI, direzione: 45, direzioneBuona: true, luoghi: [fiumeLontano] });
  if (d) guasto('un fiume a cinque chilometri non si vede: ' + d.testo);
  /* CAMBIATA IL 24/10, e Vince deve saperlo. Prima questa prova diceva:
     «la Costiera amalfitana, il cui centro nei dati sta a undici
     chilometri da Vietri, non si dice, perche' indicare un punto a
     undici chilometri sarebbe una bugia». Con la regola sola —
     grandezza diviso distanza — la Costiera SI DICE: e' larga quaranta
     chilometri, la vedi. Il limite che la escludeva («se ci sei dentro
     non e' paesaggio») l'ho provato e spegneva il golfo di Salerno, che
     e' la cosa che Vince vuole sentire. Per distinguere i due casi
     servirebbe la FORMA e non il centro: finche' non ce l'abbiamo, si
     dice, ed e' meglio cosi'. */
  const w2 = mondo();
  if (!w2.p.intorno({ qui: VIETRI, direzione: 300, direzioneBuona: true, luoghi: [COSTIERA] }))
    guasto('ha indicato un punto a undici chilometri come se fosse davanti');
  const w3 = mondo();
  const costaVicina = { n: 'Costiera amalfitana', t: 'costa', gr: 40000, lat: 40.665, lon: 14.70, d: 'z'.repeat(400) };
  if (!w3.p.intorno({ qui: VIETRI, direzione: 250, direzioneBuona: true, luoghi: [costaVicina] }))
    guasto('una costa a due chilometri va detta: e grande');
});

prova('REGOLA 2 — mai in passi', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [GOLFO, RAITO] });
  if (/passi/.test(d.testo)) guasto('ha misurato in passi: ' + d.testo);
  if (!/(qui vicino|mezzo chilometro|paio di chilometri|in lontananza)/.test(d.testo))
    guasto('non dice quanto è lontano: ' + d.testo);
});

prova('REGOLA 3 — mai il nord, e senza bussola non si parla', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true, luoghi: [GOLFO, RAITO] });
  if (/\b(nord|sud|est|ovest)\b/i.test(d.testo)) guasto('ha detto un punto cardinale: ' + d.testo);
  const w2 = mondo();
  if (w2.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: false, luoghi: [GOLFO] }))
    guasto('ha detto una parte senza sapere come sei girato');
  const w3 = mondo();
  if (w3.p.intorno({ qui: VIETRI, direzioneBuona: true, luoghi: [FRATELLI] }))
    guasto('ha parlato senza direzione');
});

prova('REGOLA 4 — due cose, non un elenco', () => {
  const w = mondo();
  const d = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true,
                          luoghi: [GOLFO, RAITO, COSTIERA, MONTE] });
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
  /* RIFATTA IL 24/10 con la regola nuova. Prima diceva: «a piedi una
     montagna a venti chilometri non si annuncia», perche' il raggio a
     piedi era cinque chilometri per tutti. Ma Vince il 24/10 ha chiesto
     il contrario — «il Vesuvio o l'Etna valgono una descrizione» — e il
     Vesuvio da Napoli sta a dodici chilometri: largo dieci, lo vedi
     benissimo. Quindi non e' la distanza a decidere, e' quanto occupa
     dell'orizzonte. Il fattore della macchina resta, e si prova con una
     cosa PICCOLA: un paese largo settecento metri a sette chilometri, a
     piedi, non si vede (un decimo); in macchina, che guarda quattro
     volte piu' lontano, si'. */
  /* una collina piccola: il fattore della macchina vale per le cose di
     natura (vedi il commento nel codice: l'Isola Tiberina del 23/10). */
  const piccolo = { n: 'Monte Pergola', t: 'collina', gr: 600, lat: 40.7350, lon: 14.7180, d: 'r'.repeat(300) };
  const w = mondo();
  if (w.p.intorno({ qui: VIETRI, direzione: 0, direzioneBuona: true, luoghi: [piccolo] }))
    guasto('a piedi un paese di settecento metri a sette chilometri non si vede');
  const w3 = mondo();
  const dPiccolo = w3.p.intorno({ qui: VIETRI, direzione: 0, direzioneBuona: true,
                                  aPiedi: false, luoghi: [piccolo] });
  if (!dPiccolo) guasto('in macchina quel paese si deve dire');
  /* e la montagna, quella si dice in tutt'e due i modi: la vedi */
  const lontano = { n: 'Monte Finestra', t: 'montagna', gr: 2500, lat: 40.7600, lon: 14.6300, d: 'v'.repeat(400) };
  const w4 = mondo();
  const d = w4.p.intorno({ qui: VIETRI, direzione: 325, direzioneBuona: true, luoghi: [lontano] });
  if (!d) guasto('una montagna larga due chilometri e mezzo si vede, anche a piedi');
  else console.log('      → ' + d.testo);
});

prova('REGOLA 7 — e si parla piu spesso, perche il panorama cambia', () => {
  const w = mondo();
  const uno = w.p.intorno({ qui: VIETRI, direzione: 210, direzioneBuona: true,
                            aPiedi: false, luoghi: [FRATELLI, RAITO] });
  if (!uno) { guasto('la prima non e uscita'); return; }
  w.passano(300000);                      // cinque minuti
  const nuovi = [{ n: 'Costa di Amalfi', t: 'costa', gr: 40000, lat: 40.650, lon: 14.700, d: 'c'.repeat(300) }];
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
  const isola = { n: 'Isola Tiberina', t: 'isola', gr: 300, lat: 41.8905, lon: 12.4777, d: 'x'.repeat(300) };
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
  const vesuvio = { n: 'Vesuvio', t: 'montagna', gr: 10000, lat: 40.8220, lon: 14.4260, d: 'v'.repeat(300) };
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
  const golfo = { n: 'Salerno', t: 'golfo', gr: 30000, lat: 40.6600, lon: 14.7400, d: 'g'.repeat(300) };
  const d = p.intorno({ qui: qui, direzione: 130, direzioneBuona: true,
                        luoghi: [golfo], aPiedi: true });
  if (!d || !/golfo/.test(d.testo)) guasto('non lo dice: ' + (d ? d.testo : 'niente'));
});

/* «In via dei Corazzieri mi ha indicato l'Isola Tiberina, sara' a sei
   chilometri minimo» (Vince, 23/10). Sei chilometri: ci arrivava perche'
   l'app credeva che non fosse a piedi e moltiplicava per quattro. */
prova('un isolotto a sei chilometri non si dice, nemmeno in macchina', () => {
  const { p } = mondo();
  const isola = { n: 'Isola Tiberina', t: 'isola', gr: 300, lat: 41.8905, lon: 12.4777, d: 'x'.repeat(300) };
  const qui = { lat: 41.8360, lon: 12.4790 };     // sei chilometri a sud
  const d = p.intorno({ qui: qui, direzione: 0, direzioneBuona: true,
                        luoghi: [isola], aPiedi: false });
  if (d) guasto('lo dice lo stesso: ' + d.testo);
});

/* ma il Vesuvio dall'autostrada, a venti chilometri, si vede: e' una
   montagna, ed e' per questo che il moltiplicatore esiste. */
prova('una montagna lontana dal finestrino si dice ancora', () => {
  const { p } = mondo();
  const vesuvio = { n: 'Vesuvio', t: 'montagna', gr: 10000, lat: 40.8220, lon: 14.4260, d: 'v'.repeat(300) };
  const qui = { lat: 40.9000, lon: 14.2500 };   // sedici chilometri
  const d = p.intorno({ qui: qui, direzione: 120, direzioneBuona: true,
                        luoghi: [vesuvio], aPiedi: false });
  if (!d || !/Vesuvio/.test(d.testo)) guasto('non lo dice: ' + (d ? d.testo : 'niente'));
});

prova('L ISOLA TIBERINA NON SI DICE A VIA DEI CORAZZIERI', () => {
  /* «Mai piu che a via dei corazzieri dica in lontananza c e isola
     tiberina» (Vince, 24/10). La spiegazione era scritta nel commento
     dal 23/10, ma la tabella diceva ancora isola: 5000 metri: questa
     prova esiste perche non possa tornare una terza volta. */
  const p = Paesaggio({ dist, verso });
  const qui = { lat: 41.9000, lon: 12.4950, direzione: 0, direzioneBuona: true };
  const punti = [
    { n: 'Isola Tiberina', t: 'isola', gr: 300, lat: 41.8906, lon: 12.4780, d: 'x'.repeat(300) },
    { n: 'spiaggia di Ostia', t: 'spiaggia', gr: 400, lat: 41.8950, lon: 12.4900, d: 'x'.repeat(300) },
    { n: 'porto di Ripa Grande', t: 'porto', gr: 150, lat: 41.8930, lon: 12.4790, d: 'x'.repeat(300) }
  ];
  punti.forEach((x) => {
    const d = p.quiVicino ? p.quiVicino({ qui, punti: [x] })
                          : (p.cosaSiVede ? p.cosaSiVede({ qui, punti: [x] }) : null);
    const t = d && d.testo ? d.testo : (typeof d === 'string' ? d : '');
    if (t && /tiberina|ostia|ripa/i.test(t)) guasto('ha detto «' + t + '»');
  });
  console.log('      → isola, spiaggia e porto: il paesaggio non li dice piu');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove del paesaggio');
process.exit(passate === fatti.length ? 0 : 1);
