/* UNA CAMMINATA VERA, DAL PRIMO ALL'ULTIMO PASSO
   ============================================================
   «Me lo hai detto cinquanta volte che hai risolto, ma il problema c'è
   sempre» (Vince, 23/10/2026, dopo essere tornato dal medico).

   Ha ragione, e il motivo è uno solo: finora ho provato le parti una per
   una — il racconto con un luogo finto, il paesaggio con un golfo finto —
   e poi ho scritto «risolto». Ma quello che sente uno che cammina non è
   una parte: è tutte insieme, sui dati veri, lungo una strada vera. È lì
   che è venuto fuori che il rango non c'era in nessuno dei 20.836 luoghi,
   e che l'app in via dei Fori Imperiali stava zitta.

   Questa prova CAMMINA. Prende una strada vera, ci fa passare sopra un
   punto ogni dieci metri come farebbe il GPS, e chiede all'app quello che
   l'app chiederebbe a sé stessa. Poi stampa tutto quello che avrebbe
   detto, metro per metro, e si arrabbia se:
     — in mezzo ai monumenti non dice niente;
     — ripete la stessa cosa;
     — dice una cosa che sta dall'altra parte della città.

   Si lancia:  node nuova/prove/camminata.js                           */

'use strict';
const fs = require('fs');
const path = require('path');
const qui = path.join(__dirname, '..');
const Racconto = require(path.join(qui, 'parti', 'racconto.js'));
const Descrizione = require(path.join(qui, 'parti', 'descrizione.js'));
const Distanza = require(path.join(qui, 'parti', 'distanza.js'));
const Paesaggio = require(path.join(qui, 'parti', 'paesaggio.js'));

const LADISTANZA = Distanza({});

function dist(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const x = (c - a) * r, y = (d - b) * r * Math.cos((a + c) / 2 * r);
  return Math.sqrt(x * x + y * y) * R;
}
function verso(a, b, c, d) {
  const r = Math.PI / 180;
  const y = Math.sin((d - b) * r) * Math.cos(c * r);
  const x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r);
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

/* I LUOGHI VERI del quadretto dove si cammina, piu' quelli intorno:
   camminando si esce dal quadretto, e se li caricassimo solo da uno
   l'app sembrerebbe muta per colpa della prova, non sua. */
function luoghiIntorno(lat, lon) {
  const dir = path.join(qui, 'dati', 'cultura');
  const fuori = [];
  /* L'APP CARICA ANCHE I 950 CURATI A MANO (dati/luoghi.json), e questa
     prova no: guardava solo i quadretti. Quindi provava un'app diversa
     da quella che cammina in strada — ed e' il modo migliore per non
     trovare mai il difetto vero. */
  try {
    const d = JSON.parse(fs.readFileSync(path.join(qui, 'dati', 'luoghi.json'), 'utf8'));
    const lista = Array.isArray(d) ? d : Object.values(d)[0];
    if (Array.isArray(lista)) for (const p of lista) fuori.push(p);
  } catch (e) { /* lo dice un'altra prova */ }
  for (let dla = -1; dla <= 1; dla++) {
    for (let dlo = -1; dlo <= 1; dlo++) {
      const q = ('0000' + Math.trunc(lat * 100 + dla)).slice(-4) + '_' +
                ('0000' + Math.trunc(lon * 100 + dlo)).slice(-4);
      const f = path.join(dir, q + '.json');
      if (!fs.existsSync(f)) continue;
      try {
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (Array.isArray(d)) for (const p of d) fuori.push(p);
      } catch (e) { /* un file rotto lo dice un'altra prova */ }
    }
  }
  return fuori;
}

/* cammina(): un punto ogni dieci metri lungo la strada data, e a ogni
   punto si chiede all'app cosa direbbe. Torna l'elenco delle frasi. */
function cammina(strada, modo, opzioni) {
  const o = opzioni || {};
  /* IL TEMPO DEVE SCORRERE COME IN STRADA.
     La prima versione di questa prova faceva i passi uno dopo l'altro
     in un millisecondo: per l'app eri fermo, e la parte «se sono fermo
     davanti a qualcosa» scattava a ogni passo. Il risultato — cinquanta
     frasi in cinquecento metri — non era quello che si sente
     camminando: era la prova fatta male.
     Un passo d'uomo e' 1,3 metri al secondo. Qui il tempo avanza con i
     metri, e l'app vede quello che vedrebbe davvero. */
  let adesso = 1700000000000;
  const PASSO_AL_SECONDO = 1.3;
  const descrizione = Descrizione({ distanza: LADISTANZA, conArticolo: (p) => (p.n || '') });
  const racconto = Racconto({ descrizione: descrizione, distanza: LADISTANZA, ora: () => adesso });
  const paesaggio = Paesaggio({ dist: dist, verso: verso, ora: () => adesso });
  const LUOGHI = luoghiIntorno(strada[0][0], strada[0][1]);

  const dette = [];
  let percorsi = 0;
  for (let i = 0; i < strada.length; i++) {
    const [lat, lon] = strada[i];
    const prossimo = strada[Math.min(i + 1, strada.length - 1)];
    const direzione = verso(lat, lon, prossimo[0], prossimo[1]);
    if (i) {
      const fatti = dist(strada[i - 1][0], strada[i - 1][1], lat, lon);
      percorsi += fatti;
      adesso += Math.round(fatti / PASSO_AL_SECONDO * 1000);
    }
    const qui0 = { lat, lon, direzione, direzioneBuona: true };

    const intorno = LUOGHI
      .map((p) => ({ p: p, m: dist(lat, lon, p.lat, p.lon),
                     rel: ((verso(lat, lon, p.lat, p.lon) - direzione + 540) % 360) - 180 }))
      .filter((x) => x.m <= 500)
      .sort((a, b) => a.m - b.m);

    /* CAMMINANDO NON SI E' FERMI. Nell'app lo decide il contapassi
       (parti/posizione.js); qui si dice all'app che si sta camminando,
       che e' quello che succede davvero su una strada. */
    const d = racconto.prossimo({ qui: qui0, intorno: intorno, modo: modo,
                                  direzioneBuona: true, aPiedi: true,
                                  fermo: false, cardinale: null });
    if (d) dette.push({ m: Math.round(percorsi), tipo: d.tipo, testo: d.testo,
                        luogo: d.luogo && d.luogo.n,
                        lontano: d.luogo ? Math.round(dist(lat, lon, d.luogo.lat, d.luogo.lon)) : 0 });

    if (!o.senzaPaesaggio) {
      const pa = paesaggio.intorno({ qui: qui0, direzione: direzione, direzioneBuona: true,
                                     luoghi: LUOGHI, aPiedi: true });
      if (pa) dette.push({ m: Math.round(percorsi), tipo: 'paesaggio', testo: pa.testo,
                           luogo: null, lontano: 0 });
    }
  }
  return { dette, luoghi: LUOGHI.length, metri: Math.round(percorsi) };
}

/* LE STRADE VERE. Punti presi sull'asse della strada, uno ogni ~10 m. */
function dritta(a, b, passo) {
  const n = Math.max(2, Math.round(dist(a[0], a[1], b[0], b[1]) / (passo || 10)));
  const fuori = [];
  for (let i = 0; i <= n; i++) {
    fuori.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  }
  return fuori;
}

const FORI = dritta([41.89150, 12.48480], [41.89480, 12.48880]);      // via dei Fori Imperiali
const TRASTEVERE = dritta([41.88370, 12.46980], [41.88900, 12.47520]); // viale di Trastevere

function stampa(titolo, r) {
  console.log('');
  console.log('      ' + titolo + ' — ' + r.metri + ' metri, ' + r.luoghi + ' luoghi intorno');
  if (!r.dette.length) { console.log('      (non ha detto NIENTE)'); return; }
  const visti = new Set();
  for (const d of r.dette) {
    if (visti.size >= 8) break;
    const riga = '      ' + String(d.m).padStart(4) + ' m  ' + d.testo.slice(0, 96);
    if (visti.has(d.testo)) continue;
    visti.add(d.testo);
    console.log(riga);
  }
  if (r.dette.length > visti.size) console.log('      ... e altre ' + (r.dette.length - visti.size));
}

/* ============================================================
   LE PROVE
   ============================================================ */

prova('IN MEZZO AI MONUMENTI L APP PARLA — via dei Fori Imperiali', () => {
  const r = cammina(FORI, 'cultura');
  stampa('Fori Imperiali, Turismo', r);
  if (r.luoghi < 50) { guasto('la prova non prova niente: solo ' + r.luoghi + ' luoghi caricati'); return; }
  if (!r.dette.length) guasto('ha camminato ' + r.metri + ' metri in mezzo a ' + r.luoghi +
                              ' monumenti senza dire niente');
  const nomi = new Set(r.dette.map((d) => d.luogo).filter(Boolean));
  if (nomi.size < 3) guasto('in ' + r.metri + ' metri ha nominato solo ' + nomi.size + ' cose');
});

prova('E LO FA ANCHE IN UTILITA', () => {
  const r = cammina(FORI, 'servizi');
  stampa('Fori Imperiali, Utilità', r);
  if (!r.dette.length) guasto('in Utilità non dice niente');
});

prova('VIALE DI TRASTEVERE non resta muto', () => {
  const r = cammina(TRASTEVERE, 'cultura');
  stampa('viale di Trastevere, Turismo', r);
  if (!r.dette.length) guasto('ha camminato ' + r.metri + ' metri senza dire niente');
});

/* QUELLO CHE DICE DEV'ESSERE DOVE SEI. «Gli diceva di un palazzo lontano
   e lei invece era a via dei Fori Imperiali» (la sorella di Vince). */
prova('non nomina cose dall altra parte della citta', () => {
  for (const [nome, strada, modo] of [['Fori', FORI, 'cultura'],
                                      ['Fori', FORI, 'servizi'],
                                      ['Trastevere', TRASTEVERE, 'cultura']]) {
    const r = cammina(strada, modo);
    for (const d of r.dette) {
      if (d.lontano > 500) {
        guasto(nome + ': «' + d.testo.slice(0, 50) + '» sta a ' + d.lontano + ' metri');
      }
    }
  }
});

/* E NON SI IMPUNTA. Due volte la stessa frase di fila vuol dire che
   l'app si è bloccata, e chi ascolta la spegne. */
prova('non ripete la stessa frase di fila', () => {
  for (const [nome, strada] of [['Fori', FORI], ['Trastevere', TRASTEVERE]]) {
    const r = cammina(strada, 'cultura');
    for (let i = 1; i < r.dette.length; i++) {
      if (r.dette[i].testo === r.dette[i - 1].testo) {
        guasto(nome + ': ripete «' + r.dette[i].testo.slice(0, 50) + '»');
        break;
      }
    }
  }
});

/* ============================================================
   E IL TURISMO: FERMARSI DAVANTI A UN MONUMENTO
   «Io turista cammino, la app rileva la posizione precisa e mi dice i
   monumenti che incontro; se mi fermo davanti a un monumento mi
   racconta architettura, arte e storia» (Vince, 23/10).
   Camminare lo prova la camminata qui sopra. Questa prova il FERMARSI:
   cinque secondi davanti a una chiesa, e poi «ancora», «ancora»,
   «ancora» — i gradini, fino a che finisce.
   ============================================================ */
prova('fermandosi davanti a un monumento lo racconta, un gradino per volta', () => {
  const descrizione = Descrizione({ distanza: LADISTANZA, conArticolo: (p) => (p.n || '') });
  let adesso = 1700000000000;
  const racconto = Racconto({ descrizione, distanza: LADISTANZA, ora: () => adesso });
  /* un luogo vero, coi testi veri dell'archivio */
  const LUOGHI = luoghiIntorno(41.8992, 12.4731);
  const ricco = LUOGHI.filter((p) => p.d && p.a && p.k >= 2)
    .sort((a, b) => (b.d.length + b.a.length) - (a.d.length + a.a.length))[0];
  if (!ricco) { guasto('nei dati non c e un luogo con scheda e approfondimento'); return; }
  const qui0 = { lat: ricco.lat + 0.0002, lon: ricco.lon, direzione: 180, direzioneBuona: true };
  const intorno = [{ p: ricco, m: dist(qui0.lat, qui0.lon, ricco.lat, ricco.lon), rel: 0 }];
  console.log('      ' + ricco.n + ' (' + ricco.t + ')');

  /* arrivo camminando: il cenno */
  const cenno = racconto.prossimo({ qui: qui0, intorno, modo: 'cultura',
                                    direzioneBuona: true, aPiedi: true, fermo: false });
  if (!cenno) { guasto('arrivandoci davanti non dice niente'); return; }
  console.log('      1. ' + cenno.testo.slice(0, 100));

  /* mi fermo cinque secondi */
  adesso += 6000;
  const gradini = [];
  for (let i = 0; i < 5; i++) {
    adesso += 2000;
    const d = racconto.prossimo({ qui: qui0, intorno, modo: 'cultura',
                                  direzioneBuona: true, aPiedi: true, fermo: true });
    if (!d) continue;
    if (d.tipo === 'finito') break;
    gradini.push(d);
    console.log('      ' + (gradini.length + 1) + '. [' + d.tipo + '] ' + d.testo.slice(0, 100));
  }
  if (gradini.length < 2) guasto('fermandosi dice solo ' + gradini.length + ' cose');
  const tipi = gradini.map((g) => g.tipo);
  if (tipi.indexOf('scheda') < 0 && tipi.indexOf('scheda-orientativa') < 0) {
    guasto('non dice mai cos e: ' + tipi.join(', '));
  }
  if (tipi.indexOf('approfondimento') < 0 && tipi.indexOf('cosa-vedere') < 0) {
    guasto('non arriva mai alla storia: ' + tipi.join(', '));
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della camminata');
process.exit(passate === fatti.length ? 0 : 1);
