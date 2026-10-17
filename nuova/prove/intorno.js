/* LE PROVE DELLE FONTI ESTERNE — nuova Yourbea
   Niente rete: le risposte sono finte, scritte come quelle vere.
   Ogni prova è un difetto visto fra il 13 e il 15 ottobre 2026.
   Si lancia:  node nuova/prove/intorno.js                                    */

'use strict';
const Intorno = require('../parti/intorno.js');

let errori = [], fatti = [];
const prove = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) { prove.push({ nome, f }); }

/* un lettore XML minimo, quanto basta a queste prove: la mappa vera arriva
   come XML e nel browser la legge DOMParser */
function leggiXMLfinto(testo) {
  const nodi = [], vie = [];
  const reNodo = /<node id="(\d+)" lat="([-\d.]+)" lon="([-\d.]+)"\s*(\/)?>([\s\S]*?)(?:<\/node>|$)/g;
  let m;
  while ((m = reNodo.exec(testo))) {
    const tag = [...m[5].matchAll(/<tag k="([^"]+)" v="([^"]*)"\s*\/>/g)].map(t => ({ k: t[1], v: t[2] }));
    nodi.push({ id: m[1], lat: m[2], lon: m[3], tag });
  }
  const reVia = /<way id="(\d+)">([\s\S]*?)<\/way>/g;
  while ((m = reVia.exec(testo))) {
    const tag = [...m[2].matchAll(/<tag k="([^"]+)" v="([^"]*)"\s*\/>/g)].map(t => ({ k: t[1], v: t[2] }));
    const nd = [...m[2].matchAll(/<nd ref="(\d+)"\s*\/>/g)].map(t => t[1]);
    vie.push({ id: m[1], tag, nd });
  }
  const finto = (lista, tipo) => lista.map(x => ({
    getAttribute: (a) => x[a],
    getElementsByTagName: (t) => {
      if (t === 'tag') return x.tag.map(tt => ({ getAttribute: (a) => (a === 'k' ? tt.k : tt.v) }));
      if (t === 'nd') return (x.nd || []).map(r => ({ getAttribute: () => r }));
      return [];
    }
  }));
  return {
    getElementsByTagName: (t) => t === 'node' ? finto(nodi) : (t === 'way' ? finto(vie) : [])
  };
}

function mondo(risposte) {
  const chiamate = [];
  const i = Intorno({
    prendi: (url, opz) => {
      chiamate.push(url);
      const chiave = Object.keys(risposte).find(k => url.indexOf(k) >= 0);
      if (!chiave) return Promise.reject(new Error('non previsto: ' + url));
      const r = risposte[chiave];
      if (r === 'mai') return new Promise(() => {});   // non risponde mai
      return Promise.resolve(typeof r === 'string' ? r : JSON.stringify(r));
    },
    tempo: 50,
    leggiXML: leggiXMLfinto,
    diario: () => {}
  });
  return { i, chiamate };
}

/* ==================== LE PROVE ==================== */

prova('la strada: via, civico e città', async () => {
  const { i } = mondo({ 'photon.komoot.io/reverse': { features: [{ properties: { street: 'Piazza Cesare Battisti', housenumber: '13/a', city: 'Parma' } }] } });
  const s = await i.strada(44.8, 10.33);
  if (!s || s.via !== 'Piazza Cesare Battisti') guasto('via sbagliata: ' + JSON.stringify(s));
  if (s.civico !== '13/a') guasto('civico perso');
  if (s.citta !== 'Parma') guasto('città persa');
});

/* IL BUCO DEL 16/10, chiuso. «Se faccio un viale mi dice sempre che lo sto
   imboccando?» No — tranne qui: in mezzo al viale la cosa più vicina era un
   bar senza indirizzo, e il nome del bar passava per nome della strada. */
/* «SEI IN FERMATA CIRCOLARE» — provando a Vietri il 18/10. In OSM sono
   highway anche le fermate dell'autobus, e passavano per vie.            */
prova('UNA FERMATA DELL\'AUTOBUS NON È UNA STRADA', async () => {
  const { i } = mondo({ 'photon.komoot.io/reverse': { features: [{ properties: {
    name: 'Fermata circolare', osm_key: 'highway', osm_value: 'bus_stop', city: 'Vietri sul Mare' } }] } });
  const s = await i.strada(40.673, 14.727);
  if (s && s.via) guasto('ha preso una fermata per una strada: ' + s.via);
});

prova('IL NOME DI UN NEGOZIO NON È UNA STRADA', async () => {
  const { i } = mondo({ 'photon.komoot.io/reverse': { features: [{ properties: {
    name: 'Bar Roma', osm_key: 'amenity', osm_value: 'bar', city: 'Roma' } }] } });
  const s = await i.strada(41.9, 12.49);
  if (s && s.via) guasto('ha preso il nome del bar per una strada: ' + s.via);
  if (!s || s.citta !== 'Roma') guasto('la città si deve tenere comunque');
});

prova('una strada senza «street» ma che È una strada si prende', async () => {
  const { i } = mondo({ 'photon.komoot.io/reverse': { features: [{ properties: {
    name: 'Viale Guglielmo Marconi', osm_key: 'highway', osm_value: 'secondary', city: 'Roma' } }] } });
  const s = await i.strada(41.86, 12.47);
  if (!s || s.via !== 'Viale Guglielmo Marconi') guasto('ha buttato una strada vera: ' + JSON.stringify(s));
});

prova('«street» vince comunque, anche sopra un negozio', async () => {
  const { i } = mondo({ 'photon.komoot.io/reverse': { features: [{ properties: {
    name: 'Bar Roma', street: 'Viale Guglielmo Marconi', housenumber: '47',
    osm_key: 'amenity', osm_value: 'bar' } }] } });
  const s = await i.strada(41.861, 12.471);
  if (!s || s.via !== 'Viale Guglielmo Marconi') guasto('via sbagliata: ' + JSON.stringify(s));
  if (s.civico !== '47') guasto('civico perso');
});

prova('una richiesta che non torna non blocca: risponde niente', async () => {
  const { i } = mondo({ 'photon.komoot.io/reverse': 'mai' });
  const t0 = Date.now();
  const s = await i.strada(44.8, 10.33);
  if (s !== null) guasto('doveva rispondere niente');
  if (Date.now() - t0 > 2000) guasto('ha aspettato troppo: ' + (Date.now() - t0) + ' ms');
});

prova('la strada si chiede una volta al minuto, non a ogni passo', async () => {
  const { i, chiamate } = mondo({ 'photon.komoot.io/reverse': { features: [{ properties: { street: 'Via Roma' } }] } });
  await i.strada(44.8000, 10.3300);
  await i.strada(44.80001, 10.33001);
  if (chiamate.length !== 1) guasto('ha chiesto ' + chiamate.length + ' volte');
});

prova('LA MAPPA: legge i punti, le aree e gli alberi', async () => {
  const xml = `<osm>
    <node id="1" lat="44.8010" lon="10.3300"><tag k="highway" v="crossing"/><tag k="crossing" v="traffic_signals"/><tag k="tactile_paving" v="yes"/></node>
    <node id="2" lat="44.8011" lon="10.3301"><tag k="amenity" v="pharmacy"/><tag k="name" v="Farmacia Pirani"/></node>
    <node id="3" lat="44.8012" lon="10.3302"><tag k="natural" v="tree"/></node>
    <node id="4" lat="44.8013" lon="10.3303"></node>
    <node id="5" lat="44.8014" lon="10.3304"></node>
    <way id="10"><tag k="leisure" v="park"/><tag k="name" v="Parco Ducale"/><nd ref="4"/><nd ref="5"/></way>
    <way id="11"><tag k="leisure" v="garden"/><nd ref="4"/><nd ref="5"/></way>
  </osm>`;
  const { i } = mondo({ 'api.openstreetmap.org': xml });
  const s = await i.servizi(44.801, 10.33);
  const attr = s.punti.filter(p => p.cosa === 'attraversamento');
  if (!attr.length) guasto('non ha letto l\'attraversamento');
  if (!attr[0].semaforo) guasto('ha perso il semaforo');
  if (!attr[0].tattile) guasto('ha perso il percorso tattile');
  if (!s.punti.some(p => p.nome === 'Farmacia Pirani')) guasto('non ha letto la farmacia');
  if (s.alberi.length !== 1) guasto('alberi: ' + s.alberi.length);
  if (!s.aree.some(a => a.nome === 'Parco Ducale')) guasto('non ha letto il parco: le aree erano invisibili all\'app vecchia');
  if (s.aree.some(a => a.cosa === 'giardino' && !a.nome)) guasto('ha tenuto un giardino senza nome: sono le aiuole di Latina');
});

prova('WIKIPEDIA: prende i luoghi e i testi in una richiesta sola', async () => {
  const { i, chiamate } = mondo({
    'list=geosearch': { query: { geosearch: [
      { title: 'Battistero di Parma', lat: 44.8035, lon: 10.33 },
      { title: 'Parma', lat: 44.8010, lon: 10.3300 }
    ] } },
    'prop=extracts': { query: { pages: {
      '1': { title: 'Battistero di Parma', extract: 'Il battistero di Parma è un edificio di culto, cominciato nel 1196 da Benedetto Antelami.' },
      '2': { title: 'Parma', extract: 'Parma (Pärma nel dialetto locale) è un comune italiano di 198 292 abitanti.' }
    } } }
  });
  const l = await i.luoghi(44.803, 10.33);
  if (chiamate.filter(c => c.indexOf('prop=extracts') >= 0).length !== 1) guasto('ha chiesto i testi uno per uno');
  if (!l.some(x => x.n === 'Battistero di Parma')) guasto('ha perso il battistero');
  if (l.some(x => x.n === 'Parma')) guasto('ha tenuto la voce del comune come monumento: è il difetto di Latina');
  if (!/Antelami/.test(l[0].d)) guasto('il testo non è arrivato col luogo');
  const sc = i.schedaDelPaese();
  if (!sc || sc.n !== 'Parma') guasto('la scheda del paese doveva essere tenuta da parte, serve nei borghi');
  if (/dialetto/.test(sc.d)) guasto('la forma dialettale non è stata pulita: la voce non la sa pronunciare');
});

prova('le voci amministrative si riconoscono dal testo, non dal nome', () => {
  const { i } = mondo({});
  if (!i.amministrativa('Latina è un comune italiano di 127 379 abitanti.')) guasto('non riconosce «è un comune»');
  if (!i.amministrativa('Il circondario di Campobasso era uno dei circondari del Regno.')) guasto('non riconosce «circondario»');
  if (i.amministrativa('Il battistero di Parma è un edificio di culto del 1196.')) guasto('ha scartato un monumento');
  /* sentita col telefono in mano a Roma, il 15/10 */
  if (!i.amministrativa('Villaggio Giuliano è la zona urbanistica 12B del Municipio Roma X di Roma Capitale.'))
    guasto('ha raccontato una zona urbanistica come se fosse un posto da visitare');
  if (i.amministrativa('Trastevere è il tredicesimo rione di Roma, sulla riva destra del Tevere.'))
    guasto('ha scartato Trastevere: i rioni veri si raccontano');
});

prova('IL PERCORSO: svolte in italiano, senza doppioni e senza l\'arrivo', async () => {
  const { i } = mondo({ 'valhalla1.openstreetmap.de': { trip: { legs: [{
    shape: 'eg|anAka{rWwAzEgF`Q',
    summary: { length: 0.476 },
    maneuvers: [
      { type: 1, instruction: 'Cammina verso nord-ovest su Via Fabio Filzi.', verbal_pre_transition_instruction: 'Cammina verso nord-ovest su Via Fabio Filzi.', length: 0.081, begin_shape_index: 0 },
      { type: 15, instruction: 'Svolta a sinistra su Largo dei Maestri.', verbal_pre_transition_instruction: 'Svolta a sinistra su Largo dei Maestri. poi Svolta a destra.', length: 0.09, begin_shape_index: 1 },
      { type: 15, instruction: 'Svolta a sinistra su Largo dei Maestri.', verbal_pre_transition_instruction: 'Svolta a sinistra su Largo dei Maestri.', length: 0.02, begin_shape_index: 2 },
      { type: 4, instruction: 'Sei arrivato a destinazione.', verbal_pre_transition_instruction: 'Sei arrivato a destinazione.', length: 0, begin_shape_index: 2 }
    ]
  }] } } });
  const p = await i.percorso({ lat: 44.8, lon: 10.33 }, { lat: 44.81, lon: 10.34 });
  if (!p) return guasto('nessun percorso');
  if (p.svolte.some(s => /arrivato a destinazione/.test(s.testo))) guasto('ha tenuto l\'arrivo di Valhalla: si somma al nostro');
  if (p.svolte.filter(s => /Largo dei Maestri/.test(s.testo)).length > 1) guasto('ha tenuto la stessa svolta due volte');
  if (/poi/.test(p.svolte[1].testo)) guasto('ha tenuto il «poi...»: si dice al suo turno');
  if (p.metri !== 476) guasto('lunghezza sbagliata: ' + p.metri);
});

prova('se una fonte è rotta, il risultato è vuoto e non un errore', async () => {
  const { i } = mondo({});   // nessuna risposta prevista: tutte le chiamate falliscono
  const s = await i.strada(44.8, 10.33);
  const v = await i.servizi(44.8, 10.33);
  const l = await i.luoghi(44.8, 10.33);
  const p = await i.percorso({ lat: 1, lon: 1 }, { lat: 2, lon: 2 });
  if (s !== null) guasto('strada doveva essere niente');
  if (!v || v.punti.length) guasto('servizi doveva essere vuoto');
  if (l.length) guasto('luoghi doveva essere vuoto');
  if (p !== null) guasto('percorso doveva essere niente');
});

/* ==================== il conto ==================== */
(async () => {
  for (const p of prove) {
    errori = [];
    try { await p.f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
    if (errori.length) { console.log('NO  ' + p.nome); errori.forEach(e => console.log('      ' + e)); fatti.push(false); }
    else { console.log('SI  ' + p.nome); fatti.push(true); }
  }
  const passate = fatti.filter(Boolean).length;
  console.log('');
  console.log(passate + '/' + fatti.length + ' prove delle fonti esterne');
  process.exit(passate === fatti.length ? 0 : 1);
})();
