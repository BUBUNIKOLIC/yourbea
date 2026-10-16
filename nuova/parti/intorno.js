/* QUELLO CHE C'È INTORNO — Yourbea, rifatta il 15/10/2026
   ============================================================
   Questo file parla con il mondo fuori: la mappa di OpenStreetMap, Wikipedia,
   il calcolatore di percorsi, il servizio che dice in che strada sei.
   Una porta per ogni fonte. Nessuna voce, nessuno schermo, nessun GPS.

   LE REGOLE, e il difetto che le ha dettate:
   1. OGNI CHIAMATA HA UN TEMPO MASSIMO. Una richiesta che non torna non deve
      mai lasciare l'app in attesa: scaduto il tempo, si risponde «niente».
   2. UNA PER VOLTA, E SI RICORDA. Si chiede una volta per zona, non a ogni
      passo: sono servizi gratuiti di altri (Wikipedia, OSM, Valhalla).
   3. NIENTE ECCEZIONI VERSO FUORI. Qualunque guasto diventa un risultato
      vuoto: chi chiama non deve mai mettere un try attorno.
   4. LE VOCI AMMINISTRATIVE NON SONO LUOGHI. «Latina è un comune italiano di
      127 379 abitanti» non è un monumento: si riconosce dal TESTO, non dal
      nome, e si tiene da parte come presentazione del paese.
      (A Latina l'app la annunciava come fosse una chiesa a settanta metri.)
   5. L'ARRIVO LO ANNUNCIA L'APP, NON VALHALLA. E le manovre doppie si
      scartano: Valhalla spezza la stessa svolta in due.
   6. LE COSE GRANDI SONO AREE, NON PUNTI. Un parco, una villa comunale, una
      prefettura in OpenStreetMap sono linee chiuse: di un'area conta il
      punto più vicino, non il centro.
      (A Latina l'app non le leggeva per niente.)
*/

'use strict';

function Intorno(opzioni) {
  var o = opzioni || {};
  var prendi = o.prendi;                       // (url, opzioni) -> Promise(testo)
  var ora = o.ora || function () { return Date.now(); };
  var diario = o.diario || function () {};
  var TEMPO = o.tempo || 8000;
  var leggiXML = o.leggiXML || null;           // (testo) -> documento, per OSM

  var memoria = { strada: {}, servizi: {}, luoghi: {}, percorso: {} };
  var cittaScheda = null;

  function chiave(lat, lon, quanto) {
    var q = quanto || 3;
    return lat.toFixed(q) + ',' + lon.toFixed(q);
  }
  function conTempo(p) {
    return new Promise(function (ok) {
      var chiuso = false;
      var t = setTimeout(function () { if (!chiuso) { chiuso = true; diario('SCADUTA una richiesta'); ok(null); } }, TEMPO);
      p.then(function (r) { if (!chiuso) { chiuso = true; clearTimeout(t); ok(r); } },
             function () { if (!chiuso) { chiuso = true; clearTimeout(t); ok(null); } });
    });
  }
  function json(url) {
    return conTempo(prendi(url).then(function (t) { try { return JSON.parse(t); } catch (e) { return null; } }));
  }

  /* ---------- 1. IN CHE STRADA SEI ---------- */
  function strada(lat, lon) {
    var k = chiave(lat, lon, 4);
    if (memoria.strada[k] && ora() - memoria.strada[k].quando < 60000) {
      return Promise.resolve(memoria.strada[k].valore);
    }
    return json('https://photon.komoot.io/reverse?lat=' + lat + '&lon=' + lon + '&limit=1')
      .then(function (d) {
        var p = (d && d.features && d.features[0] && d.features[0].properties) || null;
        var v = p ? {
          via: p.street || p.name || '',
          civico: p.housenumber || '',
          citta: p.city || p.county || p.district || ''
        } : null;
        memoria.strada[k] = { quando: ora(), valore: v };
        return v;
      });
  }

  /* ---------- 2. I SERVIZI E LE COSE GRANDI, DALLA MAPPA ---------- */
  var PUNTI = o.punti || {
    pharmacy: 'farmacia', hospital: 'ospedale', police: 'commissariato',
    post_office: 'ufficio postale', bank: 'banca', atm: 'bancomat',
    cafe: 'bar', bar: 'bar', restaurant: 'ristorante', ice_cream: 'gelateria',
    fuel: 'distributore', toilets: 'bagno pubblico', drinking_water: 'fontanella',
    bench: 'panchina', parking: 'parcheggio', townhall: 'municipio',
    place_of_worship: 'chiesa', theatre: 'teatro', library: 'biblioteca',
    'shop:supermarket': 'supermercato', 'shop:bakery': 'panificio',
    'shop:butcher': 'macelleria', 'shop:newsagent': 'edicola',
    'shop:tobacco': 'tabaccheria', 'shop:pastry': 'pasticceria',
    'shop:greengrocer': 'frutta e verdura', 'shop:hairdresser': 'parrucchiere'
  };
  var AREE = o.aree || {
    'leisure:park': 'parco', 'leisure:garden': 'giardino',
    'amenity:place_of_worship': 'chiesa', 'amenity:school': 'scuola',
    'amenity:hospital': 'ospedale', 'amenity:townhall': 'municipio',
    'amenity:marketplace': 'mercato', 'tourism:museum': 'museo',
    'historic:monument': 'monumento', 'place:square': 'piazza',
    'office:government': 'ufficio pubblico', 'railway:station': 'stazione'
  };
  var SENZA_NOME_VA_BENE = { parco: 1, piazza: 1, chiesa: 1, stazione: 1, mercato: 1, monumento: 1, museo: 1 };

  function servizi(lat, lon) {
    var k = chiave(lat, lon, 3);
    if (memoria.servizi[k] && ora() - memoria.servizi[k].quando < 120000) {
      return Promise.resolve(memoria.servizi[k].valore);
    }
    var dla = 0.0011, dlo = 0.0014 / Math.cos(lat * Math.PI / 180);
    var bb = (lon - dlo) + ',' + (lat - dla) + ',' + (lon + dlo) + ',' + (lat + dla);
    return conTempo(prendi('https://api.openstreetmap.org/api/0.6/map?bbox=' + bb)).then(function (xml) {
      var fuori = { punti: [], aree: [], alberi: [], vie: [] };
      if (!xml || !leggiXML) { memoria.servizi[k] = { quando: ora(), valore: fuori }; return fuori; }
      var doc;
      try { doc = leggiXML(xml); } catch (e) { return fuori; }
      var dove = {};
      var nodi = doc.getElementsByTagName('node');
      for (var i = 0; i < nodi.length; i++) {
        var n = nodi[i], t = {};
        var tg = n.getElementsByTagName('tag');
        for (var j = 0; j < tg.length; j++) t[tg[j].getAttribute('k')] = tg[j].getAttribute('v');
        var la = parseFloat(n.getAttribute('lat')), lo = parseFloat(n.getAttribute('lon'));
        dove[n.getAttribute('id')] = [la, lo];
        if (t.natural === 'tree') { fuori.alberi.push([la, lo]); continue; }
        if (t.highway === 'crossing') {
          var sem = (t.crossing === 'traffic_signals' || t['crossing:signals'] === 'yes');
          fuori.punti.push({ cosa: 'attraversamento', semaforo: sem,
            strisce: (t.crossing === 'marked' || t.crossing === 'zebra'),
            tattile: t.tactile_paving === 'yes', lat: la, lon: lo });
          continue;
        }
        if (t.highway === 'bus_stop' || t.public_transport === 'platform') {
          fuori.punti.push({ cosa: 'fermata', nome: t.name || '', linee: t.route_ref || '', lat: la, lon: lo });
          continue;
        }
        var tipo = PUNTI[t.amenity] || PUNTI['shop:' + t.shop] || PUNTI[t.leisure] || null;
        if (tipo) fuori.punti.push({ cosa: tipo, servizio: tipo, nome: t.name || '', lat: la, lon: lo });
      }
      var vie = doc.getElementsByTagName('way');
      for (var w = 0; w < vie.length; w++) {
        var tw = {}, tg2 = vie[w].getElementsByTagName('tag');
        for (var z = 0; z < tg2.length; z++) tw[tg2[z].getAttribute('k')] = tg2[z].getAttribute('v');
        var nd = vie[w].getElementsByTagName('nd');
        /* LE STRADE CON IL NOME. «Superavo gli incroci e non mi dicevi quali
           strade superavo» (Vince, 16/10): per chi non vede un incrocio con
           il nome è il punto fermo che dice dove sei arrivato, più di
           qualunque monumento. Erano già in questa risposta e non le
           leggeva nessuno. */
        if (tw.highway && tw.name &&
            ['motorway', 'trunk', 'motorway_link', 'trunk_link', 'raceway'].indexOf(tw.highway) < 0) {
          var linea = [];
          for (var q = 0; q < nd.length; q++) {
            var cc = dove[nd[q].getAttribute('ref')];
            if (cc) linea.push(cc);
          }
          if (linea.length > 1) fuori.vie.push({ nome: tw.name, punti: linea });
        }
        if (tw.natural === 'tree_row') {
          for (var y = 0; y < nd.length; y++) { var c = dove[nd[y].getAttribute('ref')]; if (c) fuori.alberi.push(c); }
          continue;
        }
        var tipoA = null;
        ['leisure', 'amenity', 'tourism', 'historic', 'place', 'office', 'railway'].forEach(function (ch) {
          if (!tipoA && tw[ch] && AREE[ch + ':' + tw[ch]]) tipoA = AREE[ch + ':' + tw[ch]];
        });
        if (!tipoA) continue;
        var nome = tw.name || '';
        // REGOLA: un'area senza nome si dice solo se il tipo da solo orienta
        if (!nome && !SENZA_NOME_VA_BENE[tipoA]) continue;
        var punti = [];
        for (var y2 = 0; y2 < nd.length && punti.length < 60; y2++) {
          var c2 = dove[nd[y2].getAttribute('ref')]; if (c2) punti.push(c2);
        }
        if (punti.length) fuori.aree.push({ cosa: tipoA, nome: nome, punti: punti, servizio: tipoA, grande: true });
      }
      memoria.servizi[k] = { quando: ora(), valore: fuori };
      diario('MAPPA: ' + fuori.punti.length + ' punti, ' + fuori.aree.length + ' aree, ' +
             fuori.alberi.length + ' alberi, ' + fuori.vie.length + ' strade');
      return fuori;
    });
  }

  /* ---------- 3. I LUOGHI DA WIKIPEDIA ---------- */
  function amministrativa(t) {
    var testa = String(t || '').slice(0, 320);
    if (/(?:^|[\s,;:])(?:è|e'|era|fu)\s+(?:un|una|il|la|uno)?\s*(?:ex\s+)?(?:comune|città|citta|provincia|regione|capoluogo)/i.test(testa)) return true;
    /* Il 15/10 a Roma l'app ha raccontato: «Villaggio Giuliano è la zona
       urbanistica 12B del Municipio Roma X». Non è un posto da visitare, è
       una riga di un registro: a chi cammina non dice niente. I rioni e i
       quartieri veri — Trastevere, il Vomero — restano, perché quelli un
       senso ce l'hanno: si tolgono solo le suddivisioni per numero. */
    if (/zona urbanistica|circoscrizione|suddivisione amministrativa|municipio roma|\bmunicipio\s+(?:[IVXLC]+|\d+)\b/i.test(testa)) return true;
    return /(?:^|[\s,;:])(?:circondario|mandamento|distretto|comunità montana|unione dei comuni|comune italiano|regione storica)\b/i.test(testa);
  }
  function pulisci(t) {
    var x = String(t || '')
      .replace(/\([^)]{0,90}(?:dialett|pronunc|AFI|IPA|in latino|in greco|in tedesco|in francese)[^)]{0,90}\)/gi, ' ')
      .replace(/\([^)]{0,3}\)/g, ' ')
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, ' ').trim();
    if (x.length <= 460) return x;
    var taglio = x.slice(0, 460), punto = taglio.lastIndexOf('. ');
    return punto > 200 ? taglio.slice(0, punto + 1) : taglio + '...';
  }
  function luoghi(lat, lon) {
    var k = chiave(lat, lon, 2);
    if (memoria.luoghi[k]) return Promise.resolve(memoria.luoghi[k]);
    memoria.luoghi[k] = [];                    // una volta per zona, anche se vuota
    var u = 'https://it.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=' +
            lat + '%7C' + lon + '&gsradius=1500&gslimit=30&format=json&origin=*';
    return json(u).then(function (d) {
      var elenco = (d && d.query && d.query.geosearch) || [];
      elenco = elenco.filter(function (x) {
        return !/^(Stazione meteorologica|Elenco|Lista|Provincia di|Comune di|Regione |Diocesi di|Arcidiocesi|Area metropolitana|Agro )/i.test(x.title);
      });
      if (!elenco.length) return [];
      var titoli = elenco.slice(0, 20).map(function (x) { return x.title; });
      // i testi tutti insieme: una richiesta, non venti
      var ut = 'https://it.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1' +
               '&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(titoli.join('|'));
      return json(ut).then(function (dd) {
        var testi = {};
        try {
          var pg = (dd && dd.query && dd.query.pages) || {};
          Object.keys(pg).forEach(function (kk) { if (pg[kk].title) testi[pg[kk].title] = pulisci(pg[kk].extract || ''); });
        } catch (e) {}
        var fuori = [];
        elenco.forEach(function (x) {
          var t = testi[x.title] || '';
          if (t && amministrativa(t)) {
            // REGOLA 4: la scheda del paese non si butta, si tiene da parte
            if (!cittaScheda) cittaScheda = { n: x.title, d: t };
            return;
          }
          fuori.push({ n: x.title, lat: x.lat, lon: x.lon, k: 1, d: t, i: '', a: '', w: 1 });
        });
        memoria.luoghi[k] = fuori;
        diario('WIKIPEDIA: ' + fuori.length + ' luoghi' + (cittaScheda ? ', e la scheda di ' + cittaScheda.n : ''));
        return fuori;
      });
    });
  }

  /* ---------- 4. IL PERCORSO A PIEDI ---------- */
  function decodi(s) {
    var pts = [], i = 0, lat = 0, lon = 0, b, sh, res;
    while (i < s.length) {
      sh = 0; res = 0;
      do { b = s.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32);
      lat += (res & 1) ? ~(res >> 1) : (res >> 1);
      sh = 0; res = 0;
      do { b = s.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32);
      lon += (res & 1) ? ~(res >> 1) : (res >> 1);
      pts.push([lat / 1e6, lon / 1e6]);
    }
    return pts;
  }
  function percorso(da, a) {
    var corpo = {
      locations: [{ lat: da.lat, lon: da.lon }, { lat: a.lat, lon: a.lon }],
      costing: 'pedestrian',
      directions_options: { language: 'it-IT', units: 'kilometers' }
    };
    return conTempo(prendi('https://valhalla1.openstreetmap.de/route', {
      metodo: 'POST', corpo: JSON.stringify(corpo)
    }).then(function (t) { try { return JSON.parse(t); } catch (e) { return null; } })).then(function (d) {
      var leg = d && d.trip && d.trip.legs && d.trip.legs[0];
      if (!leg || !leg.maneuvers) return null;
      var pts = decodi(leg.shape || '');
      var svolte = [];
      leg.maneuvers.forEach(function (m, k) {
        var pt = pts[m.begin_shape_index || 0]; if (!pt) return;
        var testo = String(m.verbal_pre_transition_instruction || m.instruction || '').replace(/\s+poi\s+.*$/i, '');
        if (!testo) return;
        var metri = Math.round((m.length || 0) * 1000);
        if (m.type === 4 || m.type === 5 || m.type === 6) return;      // l'arrivo lo dice l'app
        if (k && metri < 20 && /rimanere su|mantieni/i.test(testo)) return;
        if (svolte.length && svolte[svolte.length - 1].testo === testo) return;  // Valhalla la spezza in due
        svolte.push({ lat: pt[0], lon: pt[1], testo: testo, metri: metri });
      });
      if (!svolte.length) return null;
      diario('PERCORSO: ' + svolte.length + ' svolte, ' + Math.round((leg.summary && leg.summary.length || 0) * 1000) + ' m');
      /* `linea` serve solo alla mappa, per disegnare la strada: la guida
         parlata non la guarda nemmeno. */
      return { svolte: svolte, metri: Math.round((leg.summary && leg.summary.length || 0) * 1000),
               linea: pts };
    });
  }

  /* ---------- 5. CERCARE UN INDIRIZZO, O UN SERVIZIO ----------
     Restituisce CANDIDATI, non una risposta: la scelta la fa parti/guida.js,
     che sa la regola del comune. Chiedere «via Vincenzo Gioberti, Latina» e
     prendere il primo risultato portava a Cisterna di Latina. */
  function cercaIndirizzo(testo, qui) {
    var u = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(testo) +
            '&lat=' + qui.lat + '&lon=' + qui.lon + '&limit=8';
    return json(u).then(function (d) {
      var f = (d && d.features) || [];
      return f.filter(function (x) { return x.geometry && x.geometry.coordinates; }).map(function (x) {
        var p = x.properties || {};
        return {
          nome: [p.name, p.street, p.city].filter(Boolean).slice(0, 2).join(', ') || testo,
          citta: p.city || '', frazione: p.locality || p.district || '',
          provincia: p.county || '', regione: p.state || '',
          lat: x.geometry.coordinates[1], lon: x.geometry.coordinates[0]
        };
      });
    }).then(function (lista) {
      if (lista && lista.length) return lista;
      // ripiego: Nominatim, senza riquadro se e' stata detta un'altra citta'
      var u2 = 'https://nominatim.openstreetmap.org/search?format=json&limit=8&accept-language=it&q=' +
               encodeURIComponent(testo);
      return json(u2).then(function (j) {
        return (j || []).map(function (r) {
          var pezzi = String(r.display_name || '').split(',').map(function (x) { return x.trim(); });
          return { nome: pezzi.slice(0, 2).join(', '), citta: pezzi[1] || '', frazione: '',
                   provincia: pezzi[2] || '', regione: pezzi[3] || '',
                   lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
        });
      });
    });
  }

  /* cercaServizio(): la farmacia, il commissariato, il bagno — prima fra
     quello che la mappa ci ha già dato, poi chiedendo per etichetta.
     Si cerca PER ETICHETTA e non per parola: cercando «farmacia» a Milano
     rispondeva a 6,6 km avendone una a 212 metri. */
  var ETICHETTE = {
    farmacia: 'amenity=pharmacy', commissariato: 'amenity=police',
    'pronto soccorso': 'amenity=hospital', fermata: 'highway=bus_stop',
    supermercato: 'shop=supermarket', bagno: 'amenity=toilets',
    bancomat: 'amenity=atm', 'ufficio postale': 'amenity=post_office',
    bar: 'amenity=cafe', ristorante: 'amenity=restaurant'
  };
  function cercaServizio(tipo, qui) {
    var e = ETICHETTE[tipo];
    if (!e) return Promise.resolve([]);
    var d = 0.014;
    var box = (qui.lon - d) + ',' + (qui.lat + d) + ',' + (qui.lon + d) + ',' + (qui.lat - d);
    var u = 'https://nominatim.openstreetmap.org/search?format=json&limit=10&accept-language=it' +
            '&q=' + encodeURIComponent('[' + e + ']') + '&viewbox=' + box + '&bounded=1';
    return json(u).then(function (j) {
      return (j || []).map(function (r) {
        var pezzi = String(r.display_name || '').split(',').map(function (x) { return x.trim(); });
        return { nome: pezzi[0] || tipo, citta: pezzi[2] || '', frazione: '', provincia: '', regione: '',
                 lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
      });
    });
  }

  return {
    strada: strada, servizi: servizi, luoghi: luoghi, percorso: percorso,
    cercaIndirizzo: cercaIndirizzo, cercaServizio: cercaServizio,
    schedaDelPaese: function () { return cittaScheda; },
    // per le prove
    amministrativa: amministrativa, pulisci: pulisci, decodi: decodi
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Intorno;
if (typeof window !== 'undefined') window.Intorno = Intorno;
