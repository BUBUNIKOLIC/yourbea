/* LE PROVE DELLA POSIZIONE — nuova Yourbea
   «Non partiva» (Dario, Napoli, 15/10) e «diceva solo a destra» (la sorella
   di Vince, 14/10) sono difetti di questo pezzo. Qui sono prove.
   Si lancia senza telefono:  node nuova/prove/posizione.js                   */

'use strict';
const Posizione = require('../parti/posizione.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* il mondo finto: un orologio che comando io, un GPS che risponde come dico */
function mondo(come) {
  const c = come || {};
  let adesso = 1000000;
  const tempi = [];
  const avvisi = [];
  let seguiti = null, errori_ = null;
  const geo = c.senzaGeo ? null : {
    watchPosition(ok, no) { seguiti = ok; errori_ = no; if (c.negata) no({ code: 1 }); }
  };
  const p = Posizione({
    ora: () => adesso,
    fraPoco: (f, ms) => { const id = { quando: adesso + ms, f }; tempi.push(id); return id; },
    annulla: (id) => { const i = tempi.indexOf(id); if (i >= 0) tempi.splice(i, 1); },
    geo, guscio: c.guscio || null,
    diario: (t) => avvisi.push(t)
  });
  p.quando((cosa) => avvisi.push('avviso:' + cosa));
  return {
    p, avvisi,
    passano(ms) {
      const fine = adesso + ms;
      let giri = 0;
      while (giri++ < 500) {
        const pronti = tempi.filter(t => t.quando <= fine).sort((a, b) => a.quando - b.quando);
        if (!pronti.length) break;
        const t = pronti[0]; tempi.splice(tempi.indexOf(t), 1);
        adesso = Math.max(adesso, t.quando); t.f();
      }
      adesso = fine;
    },
    gps(lat, lon, prec) { if (seguiti) seguiti({ coords: { latitude: lat, longitude: lon, accuracy: prec || 8 } }); },
    seguitoDalBrowser() { return !!seguiti; }
  };
}

/* ==================== LE PROVE ==================== */

prova('nel browser: la posizione arriva e l\'app è pronta', () => {
  const m = mondo();
  m.p.comincia();
  m.gps(41.9, 12.48);
  const s = m.p.leggi();
  if (!s.pronto) guasto('non è pronta dopo la prima posizione');
  if (s.comeVa !== 'attiva') guasto('stato sbagliato: ' + s.comeVa);
});

prova('IL DIFETTO DI DARIO: se il guscio tace, dopo cinque secondi si chiede al browser', () => {
  const m = mondo({ guscio: { haPosizione: true } });
  m.p.comincia();
  if (m.seguitoDalBrowser()) guasto('ha chiesto subito al browser: nel guscio farebbe comparire un secondo dialogo');
  m.passano(5200);
  if (!m.seguitoDalBrowser()) guasto('il guscio tace e nessuno ripiega: l\'app resta ferma per sempre');
  m.gps(40.85, 14.26);
  if (!m.p.leggi().pronto) guasto('dopo il ripiego la posizione non arriva');
});

prova('se il guscio parla, non si disturba il browser', () => {
  const m = mondo({ guscio: { haPosizione: true } });
  m.p.comincia();
  m.p.dalGuscio(40.85, 14.26, 8);
  m.passano(8000);
  if (m.seguitoDalBrowser()) guasto('ha chiesto al browser anche se il guscio aveva già dato la posizione');
  if (!m.p.leggi().pronto) guasto('la posizione del guscio non è stata presa');
});

prova('posizione negata: lo stato lo dice, così l\'app può parlare', () => {
  const m = mondo({ negata: true });
  m.p.comincia();
  if (m.p.leggi().comeVa !== 'negata') guasto('non segna il permesso negato: il silenzio sembra un blocco');
});

prova('telefono senza GPS: lo stato lo dice', () => {
  const m = mondo({ senzaGeo: true });
  m.p.comincia();
  if (m.p.leggi().comeVa !== 'assente') guasto('non segna che il GPS non c\'è');
});

prova('IL DIFETTO DELLA SORELLA: fermi, la direzione non si crede', () => {
  const m = mondo();
  m.p.comincia();
  m.gps(41.9000, 12.4800);
  m.gps(41.90002, 12.48001);           // due metri: rumore, non movimento
  if (m.p.leggi().direzioneBuona) guasto('crede alla direzione dopo due metri: «a destra» sbagliato');
  m.gps(41.9002, 12.4800);             // venti metri: movimento vero
  if (!m.p.leggi().direzioneBuona) guasto('dopo venti metri la direzione deve valere');
});

prova('la direzione scade: dopo venti secondi fermi non vale più', () => {
  const m = mondo();
  m.p.comincia();
  m.gps(41.9000, 12.4800);
  m.gps(41.9002, 12.4800);
  if (!m.p.leggi().direzioneBuona) guasto('la direzione doveva valere');
  m.passano(21000);
  if (m.p.leggi().direzioneBuona) guasto('la direzione vale ancora dopo ventuno secondi fermi');
});

prova('FERMO: dieci secondi dentro dodici metri, non velocità zero', () => {
  const m = mondo();
  m.p.comincia();
  m.gps(41.9000, 12.4800);
  m.passano(4000); m.gps(41.90003, 12.48002);     // qualche metro: è il GPS che balla
  if (m.p.leggi().fermo) guasto('dice fermo dopo quattro secondi');
  m.passano(7000); m.gps(41.90004, 12.48001);
  if (!m.p.leggi().fermo) guasto('dopo undici secondi dentro dodici metri deve dire fermo');
  m.passano(1000); m.gps(41.9010, 12.4800);        // cento metri: cammina
  if (m.p.leggi().fermo) guasto('dice ancora fermo dopo cento metri');
});

prova('la vigilanza avvisa se la posizione non arriva mai', () => {
  const m = mondo({ senzaGeo: true });
  let avvisato = 0;
  m.p.vigila(function () { avvisato++; }, 8000);
  m.p.comincia();
  m.passano(9000);
  if (!avvisato) guasto('nessuno avvisa che la posizione non c\'è: è il «non partiva» di Dario');
});

prova('la distanza e la direzione: numeri giusti', () => {
  const m = mondo();
  const d = m.p.dist(41.9000, 12.4800, 41.9010, 12.4800);
  if (Math.abs(d - 111) > 4) guasto('cento metri misurati male: ' + Math.round(d));
  const v = m.p.verso(41.9000, 12.4800, 41.9010, 12.4800);
  if (Math.abs(v) > 2 && Math.abs(v - 360) > 2) guasto('verso nord misurato male: ' + Math.round(v));
});

/* ==================== il conto ==================== */
/* IL SALTO — «ho preso la metro e non si è accorto» (Vince, 20/10).
   Sottoterra il GPS non c'e': quando torna, uno e' chilometri piu' in la'
   e per l'app e' come se avesse camminato.                               */
prova('IL SALTO: tanto tempo senza posizione e tanta distanza', () => {
  const m = mondo();
  m.p.comincia();
  m.gps(41.9000, 12.4900, 8);
  m.passano(2000);
  m.gps(41.9002, 12.4902, 8);
  if (m.p.leggi().saltato) guasto('due passi non sono un salto');
  m.passano(600000);                       // dieci minuti di metro
  m.gps(41.9300, 12.5200, 20);          // quattro chilometri piu' in la'
  if (!m.p.leggi().saltato) guasto('quattro chilometri dopo dieci minuti sono un salto');
  m.passano(3000);
  m.gps(41.9301, 12.5201, 12);
  if (m.p.leggi().saltato) guasto('il salto vale per quella posizione, non per sempre');
});

prova('camminare a lungo NON e un salto', () => {
  const m = mondo();
  m.p.comincia();
  m.gps(41.9000, 12.4900, 8);
  for (let i = 1; i <= 20; i++) { m.passano(20000); m.gps(41.9000 + i * 0.0002, 12.4900, 8); }
  if (m.p.leggi().saltato) guasto('ha scambiato una camminata per un salto');
});

/* ==================== IL PASSOMETRO ====================
   «Che capisca davvero se cammino» (Vince, 22/10). La soglia sulla
   velocita' sbagliava nei due sensi; adesso comanda il passometro del
   telefono, e la velocita' resta solo come rete. */

/* dieci metri al secondo, trentasei all ora: un autobus, non un salto
   del GPS — un salto lo butterebbe e la velocita tornerebbe a zero */
function inAutobus(w) {
  let lat = 41.9;
  for (let i = 0; i < 5; i++) {
    w.p.dalGuscio(lat, 12.49, 10);
    w.passano(1000);
    lat += 10 / 111320;
  }
  w.p.dalGuscio(lat, 12.49, 10);
}

prova('IL PASSOMETRO COMANDA: dice cammina, e il GPS puo dire quello che vuole', () => {
  const w = mondo();
  inAutobus(w);
  w.p.comeMiMuovo('cammina', true);
  if (w.p.leggi().aPiedi !== true) guasto('col passometro che dice cammina crede ancora al GPS');
});

prova('FERMO E CAMMINARE sono tutt e due «a piedi»', () => {
  const w = mondo();
  w.p.comeMiMuovo('fermo', true);
  if (w.p.leggi().aPiedi !== true) guasto('fermo a un semaforo lo mette su un mezzo');
});

prova('IN MACCHINA, anche da fermo nel traffico, non sei a piedi', () => {
  const w = mondo();
  w.p.dalGuscio(41.9, 12.49, 10);
  w.p.comeMiMuovo('mezzo', true);
  if (w.p.leggi().aPiedi !== false) guasto('in macchina crede che tu stia camminando');
});

prova('SE IL TELEFONO NON E SICURO, decide la velocita come prima', () => {
  const w = mondo();
  inAutobus(w);
  w.p.comeMiMuovo('cammina', false);        // ma il telefono non ci crede
  if (w.p.leggi().aPiedi !== false) guasto('si fida di una lettura che il telefono stesso dice incerta');
});

prova('SE IL PASSOMETRO TACE PER UN MINUTO E MEZZO, scade', () => {
  const w = mondo();
  w.p.comeMiMuovo('mezzo', true);
  if (w.p.leggi().aPiedi !== false) guasto('non ha preso l attivita');
  w.passano(100000);
  if (w.p.leggi().aPiedi !== true) guasto('un attivita vecchia di due minuti comanda ancora');
});

prova('SENZA GUSCIO non cambia niente: comanda la velocita', () => {
  const w = mondo();
  inAutobus(w);
  if (w.p.leggi().aPiedi !== false) guasto('senza passometro non guarda piu nemmeno la velocita');
});

prova('FERMO AL SEMAFORO IN SCOOTER non vuol dire a piedi', () => {
  /* Dal quaderno vero del 22/10: alle 15:10:54 andava a 53 all'ora, alle
     15:11:09 l app gli diceva «fra 20 passi, un attraversamento». In
     mezzo, un semaforo rosso: fermandosi il guscio ribatte la stessa
     posizione ogni tre secondi, la media mobile legge zero, e in quindici
     secondi la velocita scende sotto i dodici all ora. */
  const w = mondo();
  inAutobus(w);                                  // 36 all ora
  if (w.p.leggi().aPiedi !== false) { guasto('non ha capito che correva'); return; }
  // adesso il rosso: la stessa posizione ribattuta
  const s = w.p.leggi();
  for (let i = 0; i < 10; i++) { w.passano(3000); w.p.dalGuscio(s.lat, s.lon, 10); }
  if (w.p.leggi().aPiedi !== false) guasto('fermo al rosso, dopo mezzo minuto lo crede a piedi');
});

prova('MA DOPO DUE MINUTI FERMO, sei sceso: torni a piedi', () => {
  const w = mondo();
  inAutobus(w);
  const s = w.p.leggi();
  for (let i = 0; i < 50; i++) { w.passano(3000); w.p.dalGuscio(s.lat, s.lon, 10); }
  if (w.p.leggi().aPiedi !== true) guasto('due minuti e mezzo fermo e ti crede ancora in scooter');
});

prova('E IL PASSOMETRO BATTE LA MEMORIA DELLA CORSA', () => {
  const w = mondo();
  inAutobus(w);
  w.p.comeMiMuovo('cammina', true);
  if (w.p.leggi().aPiedi !== true) guasto('sceso dall autobus, il telefono dice che cammina e non gli crede');
});

/* FERMO LO DICONO I PASSI, NON IL GPS.
   «Appena la provo fa schifo» (Vince, 23/10): camminando ai Fori l'app
   si comportava come se si fosse fermato davanti a ogni monumento,
   perche' in cinque secondi un uomo fa sei metri e mezzo e il cerchio
   del «fermo» era largo dodici. */
prova('camminando non si e fermi, anche se il GPS non se ne accorge', () => {
  const m = mondo();
  m.p.comincia();
  const passo = 0.000012;          // circa 1,3 metri
  let lat = 41.9000;
  m.p.quantiPassi(0);
  m.gps(lat, 12.48);
  for (let i = 1; i <= 8; i++) {   // otto secondi di cammino
    m.passano(1000);
    lat += passo;
    m.p.quantiPassi(i * 2);        // due passi al secondo
    m.gps(lat, 12.48);
  }
  if (m.p.leggi().fermo) guasto('dice che sei fermo mentre cammini');
});

prova('fermo davvero: i passi non cambiano', () => {
  const m = mondo();
  m.p.comincia();
  m.p.quantiPassi(100);
  m.gps(41.9, 12.48);
  for (let i = 1; i <= 8; i++) {
    m.passano(1000);
    m.p.quantiPassi(100);          // fermo: nessun passo nuovo
    /* e il GPS salta di qualche metro, come fa davvero stando fermi */
    m.gps(41.9 + (i % 2 ? 0.00005 : -0.00005), 12.48);
  }
  if (!m.p.leggi().fermo) guasto('non si accorge che sei fermo');
});

/* ============================================================
   IL FILTRO: IL PUNTO NON DEVE BALLARE
   «Trova il modo per essere preciso» (Vince, 23/10). Fermi in mezzo
   alla strada il GPS sposta il punto di cinque o dieci metri a ogni
   lettura, e la stessa porta diventava «a 30 passi», poi «a 45».
   ============================================================ */
function metri(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const x = (la2 - la1) * r, y = (lo2 - lo1) * r * Math.cos((la1 + la2) / 2 * r);
  return Math.sqrt(x * x + y * y) * R;
}

prova('fermi, il punto non balla piu di due metri', () => {
  const m = mondo();
  m.p.comincia();
  const VERO = [41.9000, 12.4800];
  /* dieci letture con l'errore vero di un telefono fra i palazzi */
  const sbalzi = [[0, 0], [8, -5], [-7, 6], [10, 3], [-4, -9],
                  [6, 7], [-9, -2], [3, 8], [-5, 4], [7, -6]];
  let massimo = 0;
  sbalzi.forEach(([dx, dy], i) => {
    m.passano(1000);
    m.gps(VERO[0] + dy * 0.000009, VERO[1] + dx * 0.000012, 12);
    const s = m.p.leggi();
    if (i >= 3) massimo = Math.max(massimo, metri(VERO[0], VERO[1], s.lat, s.lon));
  });
  if (massimo > 4) guasto('il punto balla fino a ' + Math.round(massimo) + ' metri');
  console.log('      \u2192 dopo il filtro resta entro ' + massimo.toFixed(1) + ' m dal vero');
});

/* MA SE CAMMINI DAVVERO, IL PUNTO TI SEGUE. Un filtro che non si fa
   muovere e' peggio di nessun filtro: diresti «a trenta passi» di una
   cosa che hai gia' superato. */
prova('camminando il punto segue, non resta indietro', () => {
  const m = mondo();
  m.p.comincia();
  let la = 41.9000;
  m.gps(la, 12.48, 8);
  for (let i = 0; i < 20; i++) {       // venti secondi a 1,3 m/s
    m.passano(1000);
    la += 0.0000117;
    m.gps(la, 12.48, 8);
  }
  const s = m.p.leggi();
  const indietro = metri(la, 12.48, s.lat, s.lon);
  if (indietro > 5) guasto('resta indietro di ' + Math.round(indietro) + ' metri');
  console.log('      \u2192 camminando resta a ' + indietro.toFixed(1) + ' m dal vero');
});

/* E UNA LETTURA MOLTO IMPRECISA NON DEVE TRASCINARE IL PUNTO. */
prova('una lettura a cinquanta metri d errore sposta poco', () => {
  const m = mondo();
  m.p.comincia();
  for (let i = 0; i < 5; i++) { m.passano(1000); m.gps(41.9, 12.48, 6); }
  const prima = m.p.leggi();
  m.passano(1000);
  m.gps(41.9 + 0.00045, 12.48, 60);     // cinquanta metri piu' in la, ±60
  const dopo = m.p.leggi();
  const spostato = metri(prima.lat, prima.lon, dopo.lat, dopo.lon);
  if (spostato > 12) guasto('una lettura sgangherata lo ha spostato di ' + Math.round(spostato) + ' m');
});

/* LA DIREZIONE SU UN TRATTO, non fra due letture appiccicate.
   Con l'errore vero del GPS, due punti a sei metri possono dare una
   direzione sbagliata di quaranta gradi — e a chi non vede quaranta
   gradi sono il marciapiede di fronte. */
prova('la direzione resta ferma anche se il GPS balla', () => {
  const m = mondo();
  m.p.comincia();
  let la = 41.9000;
  const storti = [[0,0],[6,0],[-5,0],[4,0],[-6,0],[5,0],[-3,0],[7,0],[-4,0],[2,0]];
  const direzioni = [];
  storti.forEach(([dx], i) => {
    m.passano(1000);
    la += 0.0000117;                      // cammina verso NORD, 1,3 m/s
    m.gps(la, 12.48 + dx * 0.000012, 10); // e il GPS lo sballotta di lato
    const s = m.p.leggi();
    if (i >= 5 && s.direzioneBuona) direzioni.push(s.direzione);
  });
  if (!direzioni.length) { guasto('non ha mai una direzione buona'); return; }
  /* verso nord: zero gradi. Si accetta venti gradi di sbaglio, non
     quaranta — con due punti sarebbero stati molti di piu'. */
  const peggio = Math.max(...direzioni.map((g) => Math.min(Math.abs(g), Math.abs(360 - g))));
  if (peggio > 20) guasto('la direzione sbaglia di ' + Math.round(peggio) + ' gradi');
  console.log('      \u2192 camminando verso nord sbaglia al massimo di ' +
              Math.round(peggio) + '\u00b0');
});

/* ============================================================
   SOTTO IL PORTICO IL GPS SPARISCE, I PASSI NO
   ============================================================ */
prova('senza GPS il punto avanza coi passi', () => {
  const m = mondo();
  m.p.comincia();
  let la = 41.9000, passi = 0;
  /* prima si cammina un po' col GPS, cosi' l'app sa da che parte vai */
  for (let i = 0; i < 12; i++) {
    m.passano(1000);
    la += 0.0000117;
    passi += 2;
    m.p.quantiPassi(passi);
    m.gps(la, 12.48, 8);
  }
  const prima = m.p.leggi();
  if (!prima.direzioneBuona) { guasto('non ha ancora una direzione'); return; }
  /* e adesso il GPS sparisce per quindici secondi, ma i passi no */
  for (let i = 0; i < 15; i++) {
    m.passano(1000);
    passi += 2;
    m.p.quantiPassi(passi);
  }
  const dopo = m.p.leggi();
  const avanti = metri(prima.lat, prima.lon, dopo.lat, dopo.lon);
  if (avanti < 10) guasto('al buio e avanzato solo di ' + Math.round(avanti) + ' metri');
  if (avanti > 30) guasto('al buio si e inventato ' + Math.round(avanti) + ' metri');
  /* e deve ammettere di essere meno sicuro */
  if (!(dopo.prec > prima.prec)) guasto('al buio non dice di essere meno preciso');
  console.log('      \u2192 quindici secondi senza GPS: avanti ' +
              Math.round(avanti) + ' m, precisione da \u00b1' +
              Math.round(prima.prec) + ' a \u00b1' + Math.round(dopo.prec) + ' m');
});

prova('al buio non si va avanti all infinito', () => {
  const m = mondo();
  m.p.comincia();
  let la = 41.9000, passi = 0;
  for (let i = 0; i < 12; i++) {
    m.passano(1000); la += 0.0000117; passi += 2;
    m.p.quantiPassi(passi); m.gps(la, 12.48, 8);
  }
  const prima = m.p.leggi();
  for (let i = 0; i < 120; i++) {      // due minuti senza GPS
    m.passano(1000); passi += 2; m.p.quantiPassi(passi);
  }
  const dopo = m.p.leggi();
  const avanti = metri(prima.lat, prima.lon, dopo.lat, dopo.lon);
  if (avanti > 35) guasto('si e inventato ' + Math.round(avanti) + ' metri di cammino');
});

prova('fermi, i passi non fanno avanzare niente', () => {
  const m = mondo();
  m.p.comincia();
  let la = 41.9000, passi = 0;
  for (let i = 0; i < 12; i++) {
    m.passano(1000); la += 0.0000117; passi += 2;
    m.p.quantiPassi(passi); m.gps(la, 12.48, 8);
  }
  const prima = m.p.leggi();
  for (let i = 0; i < 20; i++) { m.passano(1000); m.p.quantiPassi(passi); }  // fermo
  const dopo = m.p.leggi();
  if (metri(prima.lat, prima.lon, dopo.lat, dopo.lon) > 1) guasto('si muove da fermo');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della posizione');
process.exit(passate === fatti.length ? 0 : 1);
