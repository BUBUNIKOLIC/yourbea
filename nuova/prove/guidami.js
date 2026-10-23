/* GUIDAMI FINO IN FONDO — una camminata guidata, dall'inizio alla fine
   ============================================================
   «Prova ancora» (Vince, 23/10/2026).

   Le prove di prima guardano un pezzo per volta. Questa fa il giro
   intero: prende un percorso VERO di Valhalla (quello di Trastevere che
   Vince ha fatto tornando dal medico), ci fa camminare sopra una persona
   col GPS che sbaglia come sbaglia davvero, e stampa TUTTO quello che
   l'app direbbe, dalla partenza all'arrivo.

   Poi controlla le quattro cose che devono valere sempre, perché chi
   non vede ci cammina davvero:
     1. ARRIVA: alla fine dice che sei arrivato.
     2. NON RIPETE una svolta che hai già passato.
     3. NON TACE: su un percorso con dieci svolte non puoi sentirne due.
     4. NON PARLA A VANVERA: non più di una frase ogni dieci metri.

   Il percorso sta in prove/percorsi/trastevere.json, preso una volta da
   Valhalla e salvato: così la prova gira senza rete e dà sempre lo
   stesso risultato.

   Si lancia:  node nuova/prove/guidami.js                             */

'use strict';
const fs = require('fs');
const path = require('path');
const Guida = require('../parti/guida.js');
const Avanzamento = require('../parti/avanzamento.js');
const Distanza = require('../parti/distanza.js');
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

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* UN GPS CHE SBAGLIA COME SBAGLIA DAVVERO. Non un numero a caso: un
   errore che cambia piano, come fa il GPS fra i palazzi, piu' qualche
   sobbalzo. Sempre uguale a ogni giro, cosi' la prova e' ripetibile. */
function gpsFinto(seme) {
  let s = seme || 7;
  let ex = 0, ey = 0;
  return function (lat, lon) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const a = (s / 2147483648) - 0.5;
    s = (s * 1103515245 + 12345) % 2147483648;
    const b = (s / 2147483648) - 0.5;
    ex = ex * 0.8 + a * 14;          // l'errore si trascina
    ey = ey * 0.8 + b * 14;
    return [lat + ey * 0.000009, lon + ex * 0.000012];
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
function inItaliano(t) {
  for (const [a, b] of INGLESE) t = t.replace(a, b);
  return t;
}

function caricaPercorso() {
  const f = path.join(__dirname, 'percorsi', 'trastevere.json');
  if (!fs.existsSync(f)) return null;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const leg = d.trip && d.trip.legs && d.trip.legs[0];
  if (!leg) return null;
  /* la linea e le svolte, come le prepara parti/intorno.js */
  const pts = decodi(leg.shape || '');
  /* quanti metri di percorso ci sono fino a ciascun punto della linea */
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
    /* le stesse parole che dice l'app: parti/intorno.js traduce i pezzi
       d'inglese e chiama «marciapiede» la passerella di Valhalla. Senza,
       la prova guarderebbe una frase che l'utente non sente mai. */
    t = inItaliano(t);
    /* a che metro del percorso sta davvero: Valhalla ci da' l'indice
       del punto sulla linea, e quello non si puo' sbagliare. Cercarlo
       per vicinanza no: su un giro che si ripiega, la stessa via passa
       due volte e si prendeva il metro sbagliato. */
    svolte.push({ lat: pt[0], lon: pt[1], testo: t, metri, quale: k,
                  metroVero: fino[m.begin_shape_index || 0] || 0 });
  });
  return { svolte, linea: pts,
           metri: Math.round((leg.summary && leg.summary.length || 0) * 1000) };
}

/* la polilinea di Valhalla, sei decimali */
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

const percorso = caricaPercorso();

if (!percorso) {
  console.log('    (manca prove/percorsi/trastevere.json — la prova si salta)');
  console.log('');
  console.log('0/0 prove della guida intera');
  process.exit(0);
}

/* cammina(): si va avanti un metro e mezzo per volta lungo la linea
   vera, col GPS che sbaglia, e si raccoglie tutto quello che l'app
   direbbe. */
function cammina(conMotore) {
  const a = conMotore ? Avanzamento({ dist }) : null;
  const g = Guida({ distanza: LADISTANZA, dist, verso, avanzamento: a });
  const linea = percorso.linea;
  const meta = { n: 'casa', lat: linea[linea.length - 1][0], lon: linea[linea.length - 1][1] };
  const sbaglia = gpsFinto(11);
  const dette = [];
  const apertura = g.vaiA(meta, { lat: linea[0][0], lon: linea[0][1], direzione: 0, direzioneBuona: true },
                          null, percorso);
  if (apertura) dette.push({ m: 0, testo: apertura.testo });

  let fatti = 0;
  for (let i = 1; i < linea.length; i++) {
    const a0 = linea[i - 1], b0 = linea[i];
    const lungo = dist(a0[0], a0[1], b0[0], b0[1]);
    const passi = Math.max(1, Math.round(lungo / 1.5));
    for (let k = 1; k <= passi; k++) {
      const la = a0[0] + (b0[0] - a0[0]) * k / passi;
      const lo = a0[1] + (b0[1] - a0[1]) * k / passi;
      fatti += lungo / passi;
      const [gla, glo] = sbaglia(la, lo);
      const dir = verso(a0[0], a0[1], b0[0], b0[1]);
      const d = g.passo({ lat: gla, lon: glo, direzione: dir, direzioneBuona: true });
      if (d && d.testo) dette.push({ m: Math.round(fatti), tipo: d.tipo, testo: d.testo });
    }
  }
  return { dette, metri: Math.round(fatti) };
}

const col = cammina(true);

console.log('');
console.log('      percorso vero di Trastevere: ' + percorso.metri + ' metri, ' +
            percorso.svolte.length + ' svolte');
console.log('      l\'app dice ' + col.dette.length + ' frasi in ' + col.metri + ' metri:');
for (const d of col.dette.slice(0, 16)) {
  console.log('      ' + String(d.m).padStart(4) + ' m  ' + d.testo.slice(0, 92));
}
if (col.dette.length > 16) console.log('      ... e altre ' + (col.dette.length - 16));
console.log('');

prova('la guida arriva fino in fondo', () => {
  const arrivo = col.dette.filter((d) => /sei arrivato/i.test(d.testo));
  if (!arrivo.length) guasto('non dice mai che sei arrivato');
});

prova('non ripete una svolta che hai gia passato', () => {
  /* DUE SVOLTE DIVERSE POSSONO DIRE LA STESSA FRASE: su questo percorso
     ci sono due marciapiedi senza nome, e tutt'e due fanno «svolta a
     destra sul marciapiede». Non e' una ripetizione: e' un'altra
     svolta, novecento metri piu' in la'. Si guarda che la stessa frase
     non torni A BREVE DISTANZA, che e' quello che faceva il difetto del
     ponte Marconi. */
  const visti = new Map();
  for (const d of col.dette) {
    if (!/^Adesso:/.test(d.testo)) continue;
    const prima = visti.get(d.testo);
    /* cento metri: su questo percorso due marciapiedi senza nome
       distano centonovanta metri e dicono tutt'e due «svolta a
       destra sul marciapiede». Sono due svolte vere. */
    if (prima !== undefined && d.m - prima < 100) {
      guasto('«' + d.testo.slice(0, 50) + '» al metro ' + prima + ' e di nuovo al ' + d.m);
      return;
    }
    visti.set(d.testo, d.m);
  }
});

/* E NON DEVE DIRE UNA SVOLTA QUANDO L'HAI GIA' PASSATA. E' il ponte
   Marconi: si controlla che ogni «Adesso» arrivi entro trenta metri dal
   punto vero della sua svolta. */
prova('ogni svolta si dice dove si fa, non dopo', () => {
  let guardate = 0;
  for (const d of col.dette) {
    if (!/^Adesso:/.test(d.testo)) continue;
    const testo = d.testo.replace(/^Adesso:\s*/, '').replace(/\.$/, '');
    /* DUE SVOLTE GEMELLE. Su questo percorso «svolta a destra sul
       marciapiede» c'e' al metro 1117 E al metro 1318: prendendo la
       prima che combacia, la prova accusava l'app di essere in ritardo
       di centosettantasei metri mentre stava annunciando l'altra. Si
       prende la PIU' VICINA. */
    let sv = null;
    for (const x of percorso.svolte) {
      if (x.testo.toLowerCase().slice(0, 30) !== testo.toLowerCase().slice(0, 30)) continue;
      if (!sv || Math.abs(x.metroVero - d.m) < Math.abs(sv.metroVero - d.m)) sv = x;
    }
    if (!sv) continue;
    guardate++;
    /* «Adesso» si dice entro VICINO_SVOLTA (25 m) prima del punto, e
       non piu' di quaranta metri dopo. */
    if (sv.metroVero - d.m > 30) {
      guasto('«' + testo.slice(0, 40) + '» detta al metro ' + d.m +
             ', troppo presto: la svolta e al ' + Math.round(sv.metroVero));
      return;
    }
    if (d.m - sv.metroVero > 40) {
      guasto('«' + testo.slice(0, 40) + '» detta al metro ' + d.m +
             ', ma la svolta era al ' + Math.round(sv.metroVero));
      return;
    }
  }
  if (!guardate) guasto('non ha trovato nessuna svolta da controllare');
  console.log('      \u2192 ' + guardate + ' svolte, tutte dette dove si fanno');
});

prova('non tace: le svolte si sentono', () => {
  const svolte = col.dette.filter((d) => /^Adesso:/.test(d.testo)).length;
  if (svolte < Math.min(3, percorso.svolte.length - 1)) {
    guasto('su ' + percorso.svolte.length + ' svolte ne ha dette ' + svolte);
  }
});

prova('e non parla a vanvera', () => {
  const ogni = col.metri / Math.max(1, col.dette.length);
  if (ogni < 10) guasto('una frase ogni ' + Math.round(ogni) + ' metri');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della guida intera');
process.exit(passate === fatti.length ? 0 : 1);
