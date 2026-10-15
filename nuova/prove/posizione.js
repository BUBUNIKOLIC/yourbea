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
const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della posizione');
process.exit(passate === fatti.length ? 0 : 1);
