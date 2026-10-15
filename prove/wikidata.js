/* Misura le coordinate delle nostre schede contro Wikidata. Serve rete.

   Il 14/10 tre coordinate sbagliate sono andate in linea (Due Torri di
   Bologna 400 m, San Zeno 700 m) e le ho trovate solo dopo: un errore di
   coordinate non si vede rileggendo il testo, si vede solo misurando. Per
   chi non vede, essere mandato nel posto sbagliato è peggio del silenzio.

   Come: `wbsearchentities` dà i candidati per il nome, `wbgetentities` le
   loro coordinate (P625). Fra i candidati si tiene il più vicino al nostro
   punto, perché gli omonimi sono tanti — «Cattedrale di San Pietro» esiste
   in mezza Italia — e si guarda lo scarto. Sopra 250 m si controlla a mano.

   Le risposte restano in prove/.wikidata-cache.json: la prima volta ci
   vogliono alcuni minuti, dopo si misurano solo i luoghi nuovi o spostati.
   Con --tutti si rimisura tutto da capo. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const SOGLIA = 250;        // metri: sopra questo si guarda a mano
/* Oltre questa distanza non è più una nostra coordinata sbagliata: è un
   altro luogo con lo stesso nome. «Monumento ai caduti», «Edicola», «Banca
   Intesa Sanpaolo» esistono in mezza Italia, e il candidato più vicino
   trovato per nome sta a centinaia di chilometri: non dice niente su di noi. */
const OMONIMO = 5000;
const CACHE = path.join(__dirname, '.wikidata-cache.json');
const TUTTI = process.argv.indexOf('--tutti') >= 0;
const UA = 'yourbea-verifica/1.0 (guida vocale; uso personale)';

function blocco(nome) {
  const i = src.indexOf('var ' + nome + '=[');
  if (i < 0) throw new Error('non trovo ' + nome);
  let j = src.indexOf('[', i), liv = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '[') liv++;
    else if (src[k] === ']') { liv--; if (liv === 0) break; }
  }
  return eval(src.slice(j, k + 1));
}
const POI = blocco('POI');

const R = 6371000, D2R = Math.PI / 180;
function dist(a1, o1, a2, o2) {
  const p1 = a1 * D2R, p2 = a2 * D2R, dp = (a2 - a1) * D2R, dl = (o2 - o1) * D2R;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/* La chiave tiene dentro la coordinata, se no due nostre schede con lo
   stesso nome (San Lorenzo Maggiore a Napoli e a Milano) si sovrascrivono a
   vicenda e il rapporto attribuisce a una lo scarto dell'altra: la prima
   misura ne ha segnalate due a 656 km, che erano a 9 metri. Cambiando la
   coordinata cambia la chiave, quindi un luogo spostato si rimisura da sé. */
const chiaveDi = (p) => p.n + '@' + p.lat + ',' + p.lon;

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; }

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(u) {
  for (let tent = 0; tent < 3; tent++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.status === 429 || r.status >= 500) { await attesa(1500 * (tent + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { await attesa(800 * (tent + 1)); }
  }
  return null;
}

async function candidati(nome) {
  const u = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=it&uselang=it&limit=6&search=' + encodeURIComponent(nome);
  const d = await json(u);
  return d && d.search ? d.search.map((s) => s.id) : [];
}

async function coordinate(qids) {
  const fuori = {};
  for (let i = 0; i < qids.length; i += 45) {
    const lotto = qids.slice(i, i + 45);
    const u = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + lotto.join('|');
    const d = await json(u);
    if (!d || !d.entities) continue;
    for (const q of lotto) {
      const c = d.entities[q] && d.entities[q].claims && d.entities[q].claims.P625;
      const v = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value;
      if (v) fuori[q] = { lat: v.latitude, lon: v.longitude };
    }
    await attesa(120);
  }
  return fuori;
}

/* Secondo parere, solo per le schede sospette. Delle cinque segnalate il
   15/10, quattro erano buone: OSM dava esattamente il nostro punto (zero
   metri) e Wikidata un altro — la sede vecchia di una biblioteca, un oggetto
   diverso con lo stesso nome, un bene diffuso come i portici di Bologna.
   Una sola era da guardare. Quindi: se OSM conferma noi, non è un errore
   nostro; se OSM sta con Wikidata e non con noi, allora sì. */
async function secondoParere(nome, lat, lon) {
  /* cercato per nome e basta, Nominatim pesca gli omonimi: «Castello
     Pandone» gli ha fatto tirare fuori un castello a 19 km. Quindi si cerca
     solo dentro un riquadro di una trentina di chilometri attorno al nostro
     punto: se il luogo è dove diciamo noi, lì dentro lo trova. */
  const d0 = 0.15;
  const riquadro = (lon - d0) + ',' + (lat + d0) + ',' + (lon + d0) + ',' + (lat - d0);
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&bounded=1&viewbox=' +
    riquadro + '&q=' + encodeURIComponent(nome);
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const d = await r.json();
    let meglio = null;
    for (const x of d) {
      const dd = dist(lat, lon, parseFloat(x.lat), parseFloat(x.lon));
      if (!meglio || dd < meglio.d) meglio = { d: dd, lat: parseFloat(x.lat), lon: parseFloat(x.lon), nome: x.display_name };
    }
    return meglio;
  } catch (e) { return null; }
}

(async () => {
  const daFare = POI.filter((p) => TUTTI || !cache[chiaveDi(p)]);

  console.log('luoghi da misurare: ' + daFare.length + ' su ' + POI.length +
    (daFare.length ? ' (le risposte restano in prove/.wikidata-cache.json)' : ' — tutto già misurato'));

  let muti = 0, misurati = 0;
  for (const p of daFare) {
    const qids = await candidati(p.n);
    await attesa(120);
    if (!qids.length) {
      cache[chiaveDi(p)] = { niente: true };
      muti++;
      continue;
    }
    const co = await coordinate(qids);
    let meglio = null;
    for (const q of Object.keys(co)) {
      const d = dist(p.lat, p.lon, co[q].lat, co[q].lon);
      if (!meglio || d < meglio.d) meglio = { q, d, lat: co[q].lat, lon: co[q].lon };
    }
    if (!meglio) { cache[chiaveDi(p)] = { niente: true }; muti++; continue; }
    cache[chiaveDi(p)] = { qid: meglio.q, lat: meglio.lat, lon: meglio.lon, scarto: Math.round(meglio.d) };
    misurati++;
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1), 'utf8');
  }

  // il conto finale, su tutti i luoghi: quelli misurati ora e quelli già in cache
  const conScarto = POI.map((p) => ({ p, c: cache[chiaveDi(p)] })).filter((x) => x.c && typeof x.c.scarto === 'number');
  const sbagliate = conScarto.filter((x) => x.c.scarto > SOGLIA && x.c.scarto <= OMONIMO);
  const omonimi = conScarto.filter((x) => x.c.scarto > OMONIMO);
  const giuste = conScarto.filter((x) => x.c.scarto <= SOGLIA);

  console.log('misurati ora: ' + misurati + ' | senza riscontro su Wikidata: ' + muti);
  console.log('confrontabili in tutto: ' + conScarto.length + ' — in posizione: ' + giuste.length +
    ' | da guardare: ' + sbagliate.length + ' | omonimi lontani, ignorati: ' + omonimi.length);

  if (sbagliate.length) {
    console.log('schede lontane dal punto di Wikidata: ' + sbagliate.length + '. Chiedo a OpenStreetMap chi ha ragione.');
    const vere = [], confermate = [];
    for (const x of sbagliate.sort((a, b) => b.c.scarto - a.c.scarto)) {
      const osm = await secondoParere(x.p.n, x.p.lat, x.p.lon);
      await attesa(1100); // Nominatim: una richiesta al secondo, non di più
      const daNoi = osm ? Math.round(osm.d) : null;
      const daLoro = osm ? Math.round(dist(x.c.lat, x.c.lon, osm.lat, osm.lon)) : null;
      if (osm && daNoi <= 150) confermate.push({ x, daNoi, daLoro });
      else vere.push({ x, osm, daNoi, daLoro });
    }
    if (confermate.length) {
      console.log('--  ' + confermate.length + ' le conferma OpenStreetMap al nostro punto: Wikidata indica un altro oggetto, non è un errore nostro');
      confermate.forEach((c) => console.log('      - ' + c.x.p.n + ': OSM a ' + c.daNoi + ' m da noi, ' + c.daLoro + ' m da Wikidata'));
    }
    if (vere.length) {
      console.log('NO  ' + vere.length + ' schede da guardare a mano: né Wikidata né OSM stanno al nostro punto');
      vere.forEach((v) => {
        console.log('      - ' + v.x.p.n + ': ' + v.x.c.scarto + ' m da Wikidata | nostro ' + v.x.p.lat + ',' + v.x.p.lon +
          ' | ' + v.x.c.qid + ' ' + v.x.c.lat.toFixed(5) + ',' + v.x.c.lon.toFixed(5) +
          (v.osm ? ' | OSM ' + v.osm.lat.toFixed(5) + ',' + v.osm.lon.toFixed(5) + ' (' + v.daNoi + ' m da noi)' : ' | OSM: niente'));
      });
      process.exit(1);
    }
    console.log('SI  nessun errore nostro: tutte quelle lontane da Wikidata sono confermate da OSM');
    process.exit(0);
  }
  console.log('SI  nessuna scheda lontana dal punto di Wikidata (soglia ' + SOGLIA + ' m)');
  process.exit(0);
})();
