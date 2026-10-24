/* PORTAMI A CASA — il giro intero, MA PASSANDO DAL MOTORE
   ============================================================
   «Portami a casa deve funzionare» e «mi diceva di andare a destra ma
   dovevo andare dritto» (Vince, 23/10/2026, camminando).

   PERCHE' QUESTO BANCO ESISTE, visto che c'e' gia' `guidami.js`.
   Quello fa il giro intero, ma alla guida passa la direzione VERA
   (`direzione: dir, direzioneBuona: true`): cioe' prova la guida come
   se il motore della posizione fosse perfetto. Il difetto di Vince
   nasce prima della guida — nel motore: con il nostro rumore vero, la
   direzione sbagliava di piu' di 45 gradi in 53 letture su 289, e 45
   gradi sono «dritto» detto «a destra». Da qui non si vedeva.

   Qui la posizione e la direzione le dice `parti/posizione.js`, come
   nell'app: lettura sbagliata, filtro, contapassi, aggancio alla linea
   del percorso. La guida riceve quello che riceverebbe davvero.

   Si lancia:  node nuova/prove/portami-a-casa.js                      */

'use strict';
const fs = require('fs');
const path = require('path');
const Posizione = require('../parti/posizione.js');
const Aggancio = require('../parti/aggancio.js');
const Guida = require('../parti/guida.js');
const Avanzamento = require('../parti/avanzamento.js');
const Distanza = require('../parti/distanza.js');
const PostiMiei = require('../parti/postiMiei.js');
const PercorsiMiei = require('../parti/percorsiMiei.js');
const LADISTANZA = Distanza({});

function dist(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const x = (la2 - la1) * r, y = (lo2 - lo1) * r * Math.cos((la1 + la2) / 2 * r);
  return Math.sqrt(x * x + y * y) * R;
}
function verso(la1, lo1, la2, lo2) {
  const r = Math.PI / 180;
  const y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) -
            Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function quantoGira(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* IL GPS COME SBAGLIA DAVVERO, misurato su una giornata di giro:
   mediana 13 metri, il 13% sopra i 50, con punte oltre il centinaio. */
function gpsFinto(seme) {
  let s = seme || 7;
  function caso() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
  function gauss() { return (caso() + caso() + caso() + caso() - 2) * 1.2; }
  return function (lat, lon) {
    const d = caso();
    const sigma = d < 0.70 ? 8 : (d < 0.87 ? 25 : 60);
    return [lat + (gauss() * sigma) / 111320,
            lon + (gauss() * sigma) / (111320 * Math.cos(lat * Math.PI / 180)),
            sigma];
  };
}

const INGLESE = [
  [/\bTake the stairs\b/gi, 'Ci sono dei gradini'],
  [/\bthe crosswalk\b/gi, "l'attraversamento"],
  [/\bthe stairs\b/gi, 'i gradini'],
  [/\bsulla passerella\b/gi, 'sul marciapiede'],
  [/\bla passerella\b/gi, 'il marciapiede'],
  [/\bsu the\b/gi, 'su'],
  [/\bsu l'/gi, "sull'"]
];
function inItaliano(t) { for (const [a, b] of INGLESE) t = t.replace(a, b); return t; }

function decodi(t) {
  const punti = [];
  let i = 0, lat = 0, lon = 0;
  while (i < t.length) {
    let b, turno = 0, risultato = 0;
    do { b = t.charCodeAt(i++) - 63; risultato |= (b & 0x1f) << turno; turno += 5; } while (b >= 0x20);
    lat += ((risultato & 1) ? ~(risultato >> 1) : (risultato >> 1));
    turno = 0; risultato = 0;
    do { b = t.charCodeAt(i++) - 63; risultato |= (b & 0x1f) << turno; turno += 5; } while (b >= 0x20);
    lon += ((risultato & 1) ? ~(risultato >> 1) : (risultato >> 1));
    punti.push([lat / 1e6, lon / 1e6]);
  }
  return punti;
}

function caricaPercorso() {
  const f = path.join(__dirname, 'percorsi', 'trastevere.json');
  if (!fs.existsSync(f)) return null;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const leg = d.trip && d.trip.legs && d.trip.legs[0];
  if (!leg) return null;
  const pts = decodi(leg.shape || '');
  const fino = [0];
  for (let i = 1; i < pts.length; i++) {
    fino.push(fino[i - 1] + dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  }
  const svolte = [];
  leg.maneuvers.forEach((m, k) => {
    const pt = pts[m.begin_shape_index || 0];
    if (!pt) return;
    let t = String(m.verbal_pre_transition_instruction || m.instruction || '')
      .replace(/\s+poi\s+.*$/i, '')
      .replace(/\s+verso\s+(?:nord|sud|est|ovest)(?:[- ](?:est|ovest))?/gi, '');
    if (!t) return;
    if ([4, 5, 6].includes(m.type)) return;
    const metri = Math.round((m.length || 0) * 1000);
    if (k && metri < 15) return;
    svolte.push({ lat: pt[0], lon: pt[1], testo: inItaliano(t), metri, quale: k,
                  metroVero: fino[m.begin_shape_index || 0] || 0 });
  });
  return { svolte, linea: pts,
           metri: Math.round((leg.summary && leg.summary.length || 0) * 1000) };
}

const percorso = caricaPercorso();
if (!percorso) {
  console.log('    (manca prove/percorsi/trastevere.json — la prova si salta)');
  console.log('');
  console.log('0/0 prove di portami a casa');
  process.exit(0);
}

/* cammina(): un secondo per volta, come nella vita. La lettura la
   sbaglia il GPS, i passi li conta il telefono, e la posizione che
   arriva alla guida e' quella che calcola il motore — non la verita'. */
function cammina(opz) {
  const o = opz || {};
  let corsoVero = null;
  let adesso = 1000000, seguito = null;
  const agg = Aggancio({ dist });
  const avan = Avanzamento({ dist });
  let laLinea = null;
  const pos = Posizione({
    ora: () => adesso,
    fraPoco: () => null, annulla: () => {},
    geo: { watchPosition(ok) { seguito = ok; } },
    aggancia: function (lat, lon, prec, aPiedi) {
      return agg.aggancia({ lat, lon, prec, aPiedi }, [], o.aggancioAlPercorso ? laLinea : null);
    },
    diario: () => {}
  });
  pos.comincia();
  const g = Guida({ distanza: LADISTANZA, dist, verso, avanzamento: avan });
  const linea = percorso.linea;
  laLinea = linea;
  const meta = { n: 'casa', lat: linea[linea.length - 1][0], lon: linea[linea.length - 1][1] };
  const sbaglia = gpsFinto(11);

  /* la partenza: come nell'app, si parte da dove dice il motore */
  sbagliaEMetti(linea[0][0], linea[0][1]);
  const dette = [];
  const apertura = g.vaiA(meta, leggi(), null, percorso);
  if (apertura) dette.push({ m: 0, testo: apertura.testo });

  function sbagliaEMetti(la, lo) {
    const [gla, glo, prec] = sbaglia(la, lo);
    if (o.corsoDalTelefono && corsoVero !== null) {
      /* come fa iOS: il corso fuso coi sensori, con dieci gradi di
         errore dichiarati */
      pos.dalGuscio(gla, glo, prec,
                    { corso: (corsoVero + 360) % 360, corsoPrec: 10, vel: 1.4, velPrec: 1 });
    } else {
      seguito({ coords: { latitude: gla, longitude: glo, accuracy: prec } });
    }
  }
  function leggi() {
    const s = pos.leggi();
    return { lat: s.lat, lon: s.lon, direzione: s.direzione,
             direzioneBuona: s.direzioneBuona, prec: s.prec };
  }

  let fattiM = 0, passi = 0;
  const versiStorti = [], storte = [];
  for (let i = 1; i < linea.length; i++) {
    const a0 = linea[i - 1], b0 = linea[i];
    const lungo = dist(a0[0], a0[1], b0[0], b0[1]);
    const quanti = Math.max(1, Math.round(lungo / 1.4));    // un secondo di cammino
    const veroVerso = verso(a0[0], a0[1], b0[0], b0[1]);
    corsoVero = veroVerso;
    for (let k = 1; k <= quanti; k++) {
      adesso += 1000;
      passi += 2;
      pos.quantiPassi(passi);
      const la = a0[0] + (b0[0] - a0[0]) * k / quanti;
      const lo = a0[1] + (b0[1] - a0[1]) * k / quanti;
      fattiM += lungo / quanti;
      sbagliaEMetti(la, lo);
      const qui = leggi();
      /* quanto sbaglia la PARTE: e' questo che diventa «a destra»
         invece di «dritto» */
      if (qui.direzioneBuona) {
        const e = quantoGira(qui.direzione, veroVerso);
        versiStorti.push(e);
        if (e > 45) storte.push({ m: Math.round(fattiM), e: Math.round(e), daSvolta: null, i: i });
      }
      const d = g.passo(qui);
      if (d && d.testo) {
        dette.push({ m: Math.round(fattiM), tipo: d.tipo, testo: d.testo,
                     rimaste: g.svolteRimaste() });
      }
    }
  }
  versiStorti.sort((a, b) => a - b);
  return { dette, metri: Math.round(fattiM),
           versoMediano: versiStorti.length ? versiStorti[Math.floor(versiStorti.length / 2)] : null,
           versiOltre45: versiStorti.filter((x) => x > 45).length,
           versiQuanti: versiStorti.length, storte };
}

const giro = cammina({ aggancioAlPercorso: true });
const giroColCorso = cammina({ aggancioAlPercorso: true, corsoDalTelefono: true });

console.log('');
console.log('      percorso vero di Trastevere: ' + percorso.metri + ' metri, ' +
            percorso.svolte.length + ' svolte');
console.log('      l\'app dice ' + giro.dette.length + ' frasi in ' + giro.metri + ' metri:');
for (const d of giro.dette.slice(0, 14)) {
  console.log('      ' + String(d.m).padStart(4) + ' m  ' + d.testo.slice(0, 90));
}
if (giro.dette.length > 14) console.log('      ... e altre ' + (giro.dette.length - 14));
console.log('');

prova('LA PARTE E GIUSTA: non dice «a destra» a chi deve andare dritto', () => {
  if (giro.versoMediano === null) return guasto('non ha mai avuto una direzione: non puo dire ne destra ne dritto');
  console.log('      → direzione: sbaglia di ' + giro.versoMediano + '° in mediana, ' +
              'oltre 45° in ' + giro.versiOltre45 + ' letture su ' + giro.versiQuanti);
  if (giro.versoMediano > 25) guasto('direzione storta di ' + giro.versoMediano + ' gradi in mediana');
  /* oltre 45 gradi «dritto» diventa «a destra»: una su venti e' il
     massimo che si puo' accettare a chi cammina col bastone */
  if (giro.versiOltre45 > giro.versiQuanti * 0.05) {
    guasto('la parte e sbagliata in ' + giro.versiOltre45 + ' letture su ' + giro.versiQuanti);
  }
});

prova('COL CORSO DEL TELEFONO la parte sbaglia molto meno', () => {
  /* regola 1, punto 4, e regola 5: «da casa al dottore e viceversa, con
     estrema precisione» (Vince, 24/10). */
  console.log('      → direzione dedotta da noi : oltre 45° in ' + giro.versiOltre45 +
              ' letture su ' + giro.versiQuanti);
  console.log('      → corso detto dal telefono : oltre 45° in ' + giroColCorso.versiOltre45 +
              ' letture su ' + giroColCorso.versiQuanti);
  if (giroColCorso.versiOltre45 > giro.versiOltre45) {
    guasto('col corso del telefono va peggio: ' + giroColCorso.versiOltre45 + ' contro ' + giro.versiOltre45);
  }
  if (giroColCorso.versiOltre45 > giroColCorso.versiQuanti * 0.02) {
    guasto('col corso del telefono sbaglia ancora in ' + giroColCorso.versiOltre45 + ' letture');
  }
});

prova('OGNI FRASE SUGLI ATTRAVERSAMENTI PORTA L AVVERTENZA', () => {
  /* «Ci deve essere sempre annuncio che la guida indica non e precisa
     negli attraversamenti — per non avere problemi» (Vince, 24/10).
     Questa prova esiste perche quella frase non possa sparire in una
     riscrittura: il percorso di Trastevere ha tre attraversamenti. */
  const dette = giro.dette.filter((d) => /attravers/i.test(d.testo));
  if (!dette.length) return guasto('in questo percorso non si parla di attraversamenti: prova inutile');
  let senza = 0;
  dette.forEach((d) => {
    if (!/presta attenzione/.test(d.testo)) { senza++; console.log('      MANCA: ' + d.testo); }
  });
  console.log('      → ' + dette.length + ' frasi parlano di attraversamenti, tutte con «presta attenzione»');
  if (senza) guasto(senza + ' frasi parlano di attraversamento senza dire che la posizione non e precisa');
});

prova('arriva fino in fondo', () => {
  if (!giro.dette.filter((d) => /sei arrivato/i.test(d.testo)).length) {
    guasto('non dice mai che sei arrivato');
  }
});

prova('non ripete una svolta gia passata', () => {
  /* NON si guarda il testo: su questo percorso «svolta a destra sul
     marciapiede» sono tre attraversamenti diversi, e contarli come una
     ripetizione sarebbe un falso guaio. Si guarda QUALE svolta parla,
     cioe' quante ne restano quando lo dice. */
  const visti = {};
  for (const d of giro.dette) {
    if (d.tipo !== 'svolta') continue;
    if (visti[d.rimaste]) {
      guasto('ripete la stessa svolta (ne restavano ' + d.rimaste + '): «' +
             d.testo.slice(0, 50) + '»');
    }
    visti[d.rimaste] = 1;
  }
});

prova('non tace: le svolte si sentono', () => {
  const svolte = giro.dette.filter((d) => d.tipo === 'svolta').length;
  if (svolte < Math.min(3, percorso.svolte.length)) {
    guasto('solo ' + svolte + ' svolte dette su ' + percorso.svolte.length);
  }
});

prova('e non parla a vanvera', () => {
  if (giro.dette.length > giro.metri / 10) {
    guasto(giro.dette.length + ' frasi in ' + giro.metri + ' metri');
  }
});

if (process.env.DETTAGLI) {
  console.log('');
  console.log('DOVE SBAGLIA LA PARTE (oltre 45 gradi), e quanto manca alla svolta piu vicina:');
  const sv = percorso.svolte.map(s => s.metroVero);
  for (const x of giro.storte) {
    let piu = null;
    for (const m of sv) { const d = Math.abs(m - x.m); if (piu === null || d < piu) piu = d; }
    console.log('   ' + String(x.m).padStart(5) + ' m   sbaglia ' + String(x.e).padStart(3) + ' gradi   ' +
                'svolta piu vicina a ' + Math.round(piu) + ' m');
  }
  console.log('');
  console.log('TUTTE LE FRASI:');
  for (const d of giro.dette) console.log('   ' + String(d.m).padStart(5) + ' m  [' + (d.tipo||'apertura') + ']  ' + d.testo);
}

/* ============================================================
   I PERCORSI FRA I POSTI SUOI, E LA CONDIVISIONE
   «Poi i percorsi casa dottore, casa farmacia ecc. E condivisione»
   (Vince, 23/10). I posti li registra lui stando li': quelli battono
   qualunque indirizzo (→ memoria: casa-e-qui).
   ============================================================ */
function posti() {
  const pm = PercorsiMiei({ dist, distanza: () => Promise.resolve(null) });
  return PostiMiei({ dist, ora: () => 1000000, aPosto: pm.aPosto, nudo: pm.nudo });
}
const PARTENZA = percorso.linea[0];
const ARRIVO = percorso.linea[percorso.linea.length - 1];

prova('CASA DOTTORE: due posti suoi, e il percorso parte', () => {
  const p = posti();
  p.registra('casa', { lat: PARTENZA[0], lon: PARTENZA[1], prec: 8 });
  p.registra('dottore', { lat: ARRIVO[0], lon: ARRIVO[1], prec: 8 });
  const due = p.dueNomi('casa dottore');
  if (!due) return guasto('non ha capito «casa dottore»');
  if (due.da.n !== 'casa' || due.a.n !== 'dottore') {
    guasto('ha preso i posti al rovescio: da ' + due.da.n + ' a ' + due.a.n);
  }
  /* e i due punti sono quelli giusti, non il centro di una via */
  if (dist(due.da.lat, due.da.lon, PARTENZA[0], PARTENZA[1]) > 1) guasto('casa e finita altrove');
  if (dist(due.a.lat, due.a.lon, ARRIVO[0], ARRIVO[1]) > 1) guasto('il dottore e finito altrove');
  console.log('      → da casa al dottore: ' + Math.round(dist(due.da.lat, due.da.lon, due.a.lat, due.a.lon)) +
              ' metri in linea d\'aria, ' + percorso.metri + ' a piedi');
});

prova('CASA FARMACIA: anche con le preposizioni, «da casa alla farmacia»', () => {
  const p = posti();
  p.registra('casa', { lat: PARTENZA[0], lon: PARTENZA[1], prec: 8 });
  p.registra('farmacia', { lat: ARRIVO[0], lon: ARRIVO[1], prec: 8 });
  const due = p.dueNomi('da casa alla farmacia');
  if (!due) return guasto('non ha capito «da casa alla farmacia»');
  if (due.da.n !== 'casa' || due.a.n !== 'farmacia') {
    guasto('da ' + due.da.n + ' a ' + due.a.n);
  }
});

prova('LA CONDIVISIONE: i posti arrivano a un altro telefono come li hai segnati', () => {
  const mio = posti();
  mio.registra('casa', { lat: PARTENZA[0], lon: PARTENZA[1], prec: 8 });
  mio.registra('dottore', { lat: ARRIVO[0], lon: ARRIVO[1], prec: 8 });
  mio.registra('farmacia', { lat: percorso.linea[10][0], lon: percorso.linea[10][1], prec: 8 });
  const link = mio.perMandare();
  if (!link) return guasto('non ha prodotto niente da mandare');
  console.log('      → tre posti in ' + link.length + ' caratteri');

  const suo = posti();
  const arrivati = suo.daUnLink(link, 'Vince');
  if (!arrivati || arrivati.length !== 3) {
    return guasto('sono arrivati ' + (arrivati ? arrivati.length : 0) + ' posti su 3');
  }
  suo.unisci(arrivati);
  const casa = suo.trova('casa'), dot = suo.trova('dottore');
  if (!casa || !dot) return guasto('dall altra parte non si trovano per nome');
  /* i gradi si mandano con cinque decimali: un metro e' il massimo che
     si puo' perdere, e un metro non sposta un portone. */
  const sposta = Math.max(dist(casa.lat, casa.lon, PARTENZA[0], PARTENZA[1]),
                          dist(dot.lat, dot.lon, ARRIVO[0], ARRIVO[1]));
  console.log('      → i punti si spostano al massimo di ' + sposta.toFixed(1) + ' m');
  if (sposta > 1.5) guasto('i punti si sono spostati di ' + sposta.toFixed(1) + ' metri');
  /* e chi li riceve puo' chiedere il percorso fra due di essi */
  const due = suo.dueNomi('casa dottore');
  if (!due) guasto('chi li riceve non puo fare il percorso casa dottore');
});

prova('E I POSTI SUOI NON SI SOVRASCRIVONO con quelli di un altro', () => {
  /* il «medico» di Lucia non e' il tuo. */
  const suo = posti();
  suo.registra('dottore', { lat: 41.8000, lon: 12.4000, prec: 8 });
  const altro = posti();
  altro.registra('dottore', { lat: ARRIVO[0], lon: ARRIVO[1], prec: 8 });
  suo.unisci(altro.daUnLink(altro.perMandare(), 'Lucia'));
  const mio = suo.trova('dottore');
  if (!mio) return guasto('ha perso il suo dottore');
  if (dist(mio.lat, mio.lon, 41.8000, 12.4000) > 1) {
    guasto('il dottore di un altro ha coperto il suo');
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove di portami a casa');
process.exit(passate === fatti.length ? 0 : 1);
