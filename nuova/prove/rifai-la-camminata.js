/* RIFAI UNA CAMMINATA VERA, QUELLA CHE E' ANDATA STORTA
   ============================================================
   «Voglio che trovi il modo di risolvere una volta per tutte»
   (Vince, 23/10/2026).

   Il modo è smettere di indovinare. Finora funzionava così: Vince
   provava l'app in strada, tornava e diceva cos'era andato male; io
   leggevo il codice, trovavo una riga plausibile, la cambiavo e dicevo
   «risolto». Poi lui riprovava e non era risolto, perché la riga
   plausibile non era la riga vera.

   Adesso l'app REGISTRA: ogni punto del GPS, i passi, il modo, e ogni
   frase che dice, con l'ora. Si manda col diario («Manda il diario»).
   Questo strumento prende quella registrazione e la rifà girare qui,
   sugli stessi dati e con lo stesso tempo: esce la stessa camminata,
   frase per frase. Da lì si vede COSA ha detto e, riga per riga,
   PERCHÉ.

   E quando è corretta, quella camminata si lascia qui dentro: diventa
   una prova del banco, e quel difetto non può più tornare.

       node nuova/prove/rifai-la-camminata.js <file della traccia>
       node nuova/prove/rifai-la-camminata.js          (tutte quelle salvate)

   Le camminate salvate stanno in nuova/prove/camminate/.               */

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

/* leggi(): la traccia è righe di testo, una per punto o per frase.
     P <quando> <lat> <lon> <prec> <direzione> <buona> <aPiedi> <fermo> <passi>
     D <quando> <tipo> <la frase>
   Il resto — il diario, le intestazioni — si butta: così si può
   incollare il messaggio intero senza ritagliarlo. */
function leggi(testo) {
  const punti = [], dette = [];
  let modo = 'servizi';
  for (const riga of String(testo).split(/\r?\n/)) {
    const m = riga.match(/^modo\s+(\w+)/);
    if (m) { modo = m[1]; continue; }
    const p = riga.match(/^P (\d+) (-?[\d.]+) (-?[\d.]+) (\d+) (-|\d+) ([01]) ([01]) ([01]) (\d+)/);
    if (p) {
      punti.push({ quando: +p[1], lat: +p[2], lon: +p[3], prec: +p[4],
                   direzione: p[5] === '-' ? null : +p[5],
                   direzioneBuona: p[6] === '1', aPiedi: p[7] === '1',
                   fermo: p[8] === '1', passi: +p[9] });
      continue;
    }
    const d = riga.match(/^D (\d+) (\S+) (.*)$/);
    if (d) dette.push({ quando: +d[1], tipo: d[2], testo: d[3] });
  }
  return { punti, dette, modo };
}

function luoghiIntorno(lat, lon) {
  const dir = path.join(qui, 'dati', 'cultura');
  const fuori = [];
  for (let dla = -2; dla <= 2; dla++) {
    for (let dlo = -2; dlo <= 2; dlo++) {
      const q = ('0000' + Math.trunc(lat * 100 + dla)).slice(-4) + '_' +
                ('0000' + Math.trunc(lon * 100 + dlo)).slice(-4);
      const f = path.join(dir, q + '.json');
      if (!fs.existsSync(f)) continue;
      try {
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (Array.isArray(d)) for (const p of d) fuori.push(p);
      } catch (e) { /* lo dicono le prove dei dati */ }
    }
  }
  return fuori;
}

/* rifai(): la camminata, come l'ha vista l'app. */
function rifai(traccia) {
  const { punti, modo } = traccia;
  if (!punti.length) return { dette: [], metri: 0, luoghi: 0 };
  let adesso = punti[0].quando;
  const descrizione = Descrizione({ distanza: LADISTANZA, conArticolo: (p) => (p.n || '') });
  const racconto = Racconto({ descrizione, distanza: LADISTANZA, ora: () => adesso });
  const paesaggio = Paesaggio({ dist, verso, ora: () => adesso });
  const LUOGHI = luoghiIntorno(punti[0].lat, punti[0].lon);

  const dette = [];
  let percorsi = 0;
  for (let i = 0; i < punti.length; i++) {
    const s = punti[i];
    adesso = s.quando;
    if (i) percorsi += dist(punti[i - 1].lat, punti[i - 1].lon, s.lat, s.lon);
    const qui0 = { lat: s.lat, lon: s.lon, direzione: s.direzione,
                   direzioneBuona: s.direzioneBuona };
    const intorno = LUOGHI
      .map((p) => ({ p, m: dist(s.lat, s.lon, p.lat, p.lon),
                     rel: s.direzione === null ? 0
                       : ((verso(s.lat, s.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180 }))
      .filter((x) => x.m <= 500)
      .sort((a, b) => a.m - b.m);

    const d = racconto.prossimo({ qui: qui0, intorno, modo,
                                  direzioneBuona: s.direzioneBuona,
                                  aPiedi: s.aPiedi, fermo: s.fermo, cardinale: null });
    if (d) dette.push({ m: Math.round(percorsi), quando: s.quando, tipo: d.tipo,
                        testo: d.testo,
                        lontano: d.luogo ? Math.round(dist(s.lat, s.lon, d.luogo.lat, d.luogo.lon)) : 0 });
    const pa = paesaggio.intorno({ qui: qui0, direzione: s.direzione,
                                   direzioneBuona: s.direzioneBuona,
                                   luoghi: LUOGHI, aPiedi: s.aPiedi });
    if (pa) dette.push({ m: Math.round(percorsi), quando: s.quando, tipo: 'paesaggio',
                         testo: pa.testo, lontano: 0 });
  }
  return { dette, metri: Math.round(percorsi), luoghi: LUOGHI.length, modo };
}

function stampa(nome, traccia, r) {
  console.log('');
  console.log('  ' + nome + ' — ' + r.metri + ' metri, ' + r.modo +
              ', ' + r.luoghi + ' luoghi nei dati');
  console.log('  quello che ha detto allora: ' + traccia.dette.length +
              ' frasi; quello che direbbe adesso: ' + r.dette.length);
  for (const d of r.dette.slice(0, 20)) {
    console.log('    ' + String(d.m).padStart(5) + ' m  ' + d.testo.slice(0, 92));
  }
  if (r.dette.length > 20) console.log('    ... e altre ' + (r.dette.length - 20));
}

function main() {
  const dato = process.argv[2];
  const cartella = path.join(__dirname, 'camminate');
  let files = [];
  if (dato) files = [dato];
  else if (fs.existsSync(cartella)) {
    files = fs.readdirSync(cartella).filter((f) => f.endsWith('.txt'))
      .map((f) => path.join(cartella, f));
  }
  if (!files.length) {
    console.log('Nessuna camminata da rifare.');
    console.log('Mandami il diario dal telefono e salva il messaggio in');
    console.log('  nuova/prove/camminate/<nome>.txt');
    return;
  }
  let guasti = 0;
  for (const f of files) {
    const traccia = leggi(fs.readFileSync(f, 'utf8'));
    if (!traccia.punti.length) {
      console.log('  ' + path.basename(f) + ': nessun punto — la traccia non c\'è');
      guasti++;
      continue;
    }
    const r = rifai(traccia);
    stampa(path.basename(f), traccia, r);
    /* LE TRE DOMANDE, su ogni camminata vera:
       in mezzo ai monumenti parla? non parla troppo? e dice cose che
       stanno dove sei? */
    if (r.luoghi >= 30 && !r.dette.length) {
      console.log('    GUASTO: ' + r.metri + ' metri in mezzo a ' + r.luoghi +
                  ' luoghi senza dire niente');
      guasti++;
    }
    const ogniQuanti = r.dette.length ? r.metri / r.dette.length : 1e9;
    if (r.dette.length > 3 && ogniQuanti < 25) {
      console.log('    GUASTO: una frase ogni ' + Math.round(ogniQuanti) +
                  ' metri — è un elenco, non una guida');
      guasti++;
    }
    for (const d of r.dette) {
      if (d.lontano > 600) {
        console.log('    GUASTO: «' + d.testo.slice(0, 50) + '» sta a ' + d.lontano + ' metri');
        guasti++;
        break;
      }
    }
  }
  console.log('');
  console.log(guasti ? (guasti + ' camminate da sistemare') : 'tutte le camminate vere vanno bene');
  process.exit(guasti ? 1 : 0);
}

main();
