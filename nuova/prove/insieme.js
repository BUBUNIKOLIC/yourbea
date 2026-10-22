/* LE PROVE DELL'APP INTERA CHE CAMMINA — Yourbea, 22/10/2026
   ============================================================
   «Trovi sempre difetti ma escono sempre» (Vince, 22/10). Vero, e la
   ragione si contava: TUTTI i difetti del 21/10 stavano nelle GIUNTURE,
   non dentro i pezzi. I pezzi hanno le loro prove e passavano; l'app era
   rotta lo stesso.
     - negozi.perIlRacconto() ricostruiva i luoghi e buttava altezza,
       materiale e forma: i dati non arrivavano mai all'app;
     - i gradini del racconto erano scritti in DUE copie e ne avevo
       corretta una: la descrizione non usciva mai;
     - il nome uguale a 500 km cancellava 1.790 monumenti.
   Nessuno di questi sta dentro un pezzo. Qui si mettono insieme i pezzi
   VERI, come fa app.js, si cammina con dei dati VERI, e si pretende di
   sentirsi dire le cose.
   Si lancia:  node nuova/prove/insieme.js                                */

'use strict';
const fs = require('fs');
const path = require('path');

const Distanza    = require('../parti/distanza.js');
const Racconto    = require('../parti/racconto.js');
const Descrizione = require('../parti/descrizione.js');
const AChiServe   = require('../parti/aChiServe.js');
const Negozi      = require('../parti/negozi.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

const R = 6371000, P = Math.PI / 180;
function dist(a, b, c, d) {
  const x = (c - a) * P, y = (d - b) * P;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function verso(a, b, c, d) {
  const y = Math.sin((d - b) * P) * Math.cos(c * P);
  const x = Math.cos(a * P) * Math.sin(c * P) - Math.sin(a * P) * Math.cos(c * P) * Math.cos((d - b) * P);
  return (Math.atan2(y, x) / P + 360) % 360;
}

/* ---------- L'APP FINTA: gli stessi pezzi, montati come in app.js ---------- */
function App(modo) {
  let adesso = 1000000;
  const laDistanza = Distanza({});
  const aChiServe = AChiServe();
  let racconto;
  const descrizione = Descrizione({ distanza: laDistanza, conArticolo: (p) => racconto.conArticolo(p) });
  racconto = Racconto({ distanza: laDistanza, descrizione: descrizione, ora: () => adesso });
  const negozi = Negozi({ dist });
  const dette = [];
  let LUOGHI = [];

  return {
    laDistanza, racconto, descrizione, negozi, dette,
    passano(ms) { adesso += ms; },
    /* carica un quadretto VERO, passando dal filtro vero */
    caricaQuadretto(nome) {
      const f = path.join(__dirname, '..', 'dati', 'cultura', nome + '.json');
      if (!fs.existsSync(f)) return 0;
      const d = JSON.parse(fs.readFileSync(f, 'utf8'));
      const lista = Array.isArray(d) ? d : Object.values(d)[0];
      const nuovi = negozi.perIlRacconto(lista, LUOGHI);
      LUOGHI = LUOGHI.concat(nuovi);
      return nuovi.length;
    },
    vicini(qui, aPiedi) {
      /* fin dove si guarda lo dice il racconto, come in app.js */
      const finDove = racconto.finDove(aPiedi);
      return LUOGHI.map((p) => ({ p, m: dist(qui.lat, qui.lon, p.lat, p.lon),
                                  rel: ((verso(qui.lat, qui.lon, p.lat, p.lon) - (qui.direzione || 0) + 540) % 360) - 180 }))
                   .filter((o) => o.m < finDove).sort((a, b) => a.m - b.m);
    },
    /* un passo: come il giro di app.js — racconto, poi la regola, poi si dice */
    passo(qui, aPiedi) {
      const a = aPiedi !== false;
      const d = racconto.prossimo({ qui, intorno: this.vicini(qui, a), modo,
                                    direzioneBuona: true, aPiedi: a, cardinale: null });
      if (!d) return null;
      if (!aChiServe.serve(d.avviso ? 'avviso' : d.tipo, modo === 'cultura' ? 'cultura' : 'servizi',
                           { aPiedi: a, preciso: true, chiesto: false })) return null;
      dette.push(d.testo);
      return d;
    },
    ancora() {
      const d = racconto.ancora();
      if (d) dette.push(d.testo);
      return d;
    },
    quanteLuoghi() { return LUOGHI.length; }
  };
}

/* ---------- un posto VERO, con i dati veri ---------- */
function unPostoConIDati() {
  const dir = path.join(__dirname, '..', 'dati', 'cultura');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    const lista = Array.isArray(d) ? d : Object.values(d)[0];
    for (const x of lista) {
      if ((x.mat || x.frm || x.h) && x.d && x.d.length > 200) {
        return { quadretto: f.replace('.json', ''), luogo: x };
      }
    }
  }
  return null;
}

prova('CAMMINANDO: il cenno arriva, e dice da che parte e quanti passi', () => {
  const posto = unPostoConIDati();
  if (!posto) { guasto('nei dati non c è nessun luogo con i campi nuovi'); return; }
  const a = App('cultura');
  const quanti = a.caricaQuadretto(posto.quadretto);
  if (!quanti) { guasto('il filtro non ha fatto passare niente dal quadretto'); return; }
  const qui = { lat: posto.luogo.lat - 0.0004, lon: posto.luogo.lon, direzione: 0 };
  const d = a.passo(qui);
  if (!d) { guasto('camminando non ha detto niente'); return; }
  if (d.tipo !== 'cenno') { guasto('il primo non è un cenno: ' + d.tipo); return; }
  if (!/\d+ passi|pochi passi/.test(d.testo)) guasto('il cenno non dice i passi: ' + d.testo);
  if (/\d+ metri/.test(d.testo)) guasto('il cenno dice ancora i metri: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('FERMANDOSI: la prima cosa è COM È FATTO, non la storia', () => {
  const posto = unPostoConIDati();
  if (!posto) { guasto('niente dati'); return; }
  const a = App('cultura');
  a.caricaQuadretto(posto.quadretto);
  const qui = { lat: posto.luogo.lat - 0.0001, lon: posto.luogo.lon, direzione: 0 };
  a.passo(qui);              // il cenno
  a.passano(11000);          // fermo da undici secondi
  const d = a.passo(qui);
  if (!d) { guasto('fermandosi non ha detto niente'); return; }
  if (d.tipo !== 'scheda-orientativa') {
    guasto('fermandosi dice ' + d.tipo + ' invece di com è fatto: ' + String(d.testo).slice(0, 70));
    return;
  }
  if (!/^[A-ZÀ-Ý]/.test(d.testo)) guasto('comincia minuscola: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('E POI «ancora» dà la storia, non prima', () => {
  const posto = unPostoConIDati();
  if (!posto) { guasto('niente dati'); return; }
  const a = App('cultura');
  a.caricaQuadretto(posto.quadretto);
  const qui = { lat: posto.luogo.lat - 0.0001, lon: posto.luogo.lon, direzione: 0 };
  a.passo(qui); a.passano(11000); a.passo(qui);
  const d = a.ancora();
  if (!d) { guasto('«ancora» non ha dato niente'); return; }
  if (d.tipo !== 'scheda') guasto('«ancora» doveva dare la storia, ha dato: ' + d.tipo);
});

prova('I CAMPI NUOVI ARRIVANO FINO IN FONDO, passando dal filtro vero', () => {
  /* il difetto del 21/10: negozi.perIlRacconto ricostruiva i luoghi con un
     elenco fisso di campi, e altezza/materiale/forma restavano nel file. */
  const posto = unPostoConIDati();
  if (!posto) { guasto('niente dati'); return; }
  const a = App('cultura');
  a.caricaQuadretto(posto.quadretto);
  const trovato = a.vicini({ lat: posto.luogo.lat, lon: posto.luogo.lon, direzione: 0 })
                   .map((o) => o.p).find((p) => p.n === posto.luogo.n);
  if (!trovato) { guasto('il luogo non è arrivato nell app: ' + posto.luogo.n); return; }
  const avevaPrima = !!(posto.luogo.h || posto.luogo.l || posto.luogo.mat || posto.luogo.frm);
  const haAdesso = !!(trovato.h || trovato.l || trovato.mat || trovato.frm);
  if (avevaPrima && !haAdesso) guasto('i campi si sono persi per strada: ' + posto.luogo.n);
});

prova('IN MACCHINA non si tace: si guarda piu lontano e si dice meno', () => {
  /* Questa prova diceva il contrario fino al 22/10 mattina — «in macchina i
     monumenti tacciono, e non e un guasto» — e fissava nel banco il difetto
     che Vince aveva appena trovato camminando da Termini a casa: venti
     minuti di silenzio in Turismo. La regola giusta e quella di Microsoft
     Soundscape: in macchina il filtro non spegne, allarga. */
  const aChiServe = AChiServe();
  if (!aChiServe.serve('cenno', 'cultura', { aPiedi: false, preciso: true })) {
    guasto('in macchina il Turismo tace di nuovo');
  }
  if (!aChiServe.serve('strada', 'cultura', { aPiedi: false, preciso: true })) {
    guasto('ma le strade in macchina si devono dire');
  }
  /* e senza sapere dove sei non si annuncia niente lo stesso: la regola
     della precisione non l ha scalzata nessuno */
  if (aChiServe.serve('cenno', 'cultura', { aPiedi: false, preciso: false })) {
    guasto('annuncia monumenti senza sapere dove sei');
  }
});

prova('IN MACCHINA l app guarda un chilometro e mezzo, non cinquecento metri', () => {
  /* il raggio per sei di parti/racconto non serve a niente se l elenco dei
     posti intorno si ferma prima: era li che moriva, nell app vera. */
  const posto = unPostoConIDati();
  if (!posto) { guasto('niente dati'); return; }
  const a = App('cultura');
  a.caricaQuadretto(posto.quadretto);
  const qui = { lat: posto.luogo.lat - 0.008, lon: posto.luogo.lon, direzione: 0 };
  const camminando = a.vicini(qui, true).length;
  const inMacchina = a.vicini(qui, false).length;
  if (!(inMacchina > camminando)) {
    guasto('in macchina guarda lontano come a piedi: ' + inMacchina + ' contro ' + camminando);
  }
});

/* ---------- un quadretto VERO che contenga un punto di riferimento ---------- */
function unQuadrettoConUnGrande(r) {
  const dir = path.join(__dirname, '..', 'dati', 'cultura');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    const lista = Array.isArray(d) ? d : Object.values(d)[0];
    if (!Array.isArray(lista)) continue;
    for (const x of lista) {
      if (x && x.lat && r.rango(x) >= 3) return { quadretto: f.replace('.json', ''), luogo: x };
    }
  }
  return null;
}

prova('IL RANGO ESISTE DAVVERO NEI DATI, non solo nelle prove inventate', () => {
  /* Fino al 22/10 valeva «scheda lunga E cosa vedere», e il campo «cosa
     vedere» nei dati veri non c e su nessuno dei 20.836 luoghi d Italia:
     i luoghi di rango 2 erano ZERO, e tutto quello che dipende dal rango
     era codice spento. Questa prova e li apposta perche non succeda piu. */
  const r = Racconto({});
  const g = unQuadrettoConUnGrande(r);
  if (!g) guasto('nei dati veri non c e un solo punto di riferimento: il rango e di nuovo morto');
  else console.log('      → ' + g.luogo.n + ' (' + g.luogo.t + ')');
});

prova('IN MACCHINA, davanti a un punto di riferimento VERO, l app parla', () => {
  /* la prova che il 21/10 sarebbe fallita: venti minuti da Termini a casa
     senza una parola. Qui si va in macchina, con dati veri, e si pretende
     di sentire qualcosa. */
  const a = App('cultura');
  const g = unQuadrettoConUnGrande(a.racconto);
  if (!g) { guasto('niente punti di riferimento nei dati'); return; }
  a.caricaQuadretto(g.quadretto);
  const qui = { lat: g.luogo.lat - 0.007, lon: g.luogo.lon, direzione: 0 };   // ~780 metri
  const d = a.passo(qui, false);
  if (!d) { guasto('in macchina tace ancora a 780 metri da ' + g.luogo.n); return; }
  if (/passi/.test(d.testo)) guasto('in macchina conta i passi: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('IN MACCHINA non diventa una radio: uno ogni tre quarti di minuto', () => {
  const a = App('cultura');
  const g = unQuadrettoConUnGrande(a.racconto);
  if (!g) { guasto('niente punti di riferimento nei dati'); return; }
  a.caricaQuadretto(g.quadretto);
  const qui = { lat: g.luogo.lat - 0.007, lon: g.luogo.lon, direzione: 0 };
  if (!a.passo(qui, false)) { guasto('la prima non e uscita'); return; }
  a.passano(6000);
  if (a.passo(qui, false)) guasto('sei secondi dopo ne dice un altro: e una radio');
  a.passano(50000);
  a.passo(qui, false);                 // dopo il freno puo riparlare (se c e altro)
});

prova('UN NOME UGUALE LONTANO non cancella un monumento (1.790 persi il 21/10)', () => {
  const n = Negozi({ dist });
  const lontano = [{ n: 'Chiesa di Santa Maria delle Grazie', lat: 45.4659, lon: 9.1709 }];
  const qui = [{ n: 'Chiesa di Santa Maria delle Grazie alle Fornaci', t: 'chiesa',
                 lat: 41.89746, lon: 12.45521 }];
  if (!n.perIlRacconto(qui, lontano).length) guasto('cancellata da una chiesa a 480 km');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dell\'app intera');
process.exit(passate === fatti.length ? 0 : 1);
