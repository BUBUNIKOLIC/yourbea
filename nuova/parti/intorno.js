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
        /* IL NOME DI UNA STRADA, NON QUELLO DI UN NEGOZIO.
           Photon, chiesto un punto, torna la cosa più vicina: se è un
           indirizzo ha «street», e va bene; ma se la cosa più vicina è un
           bar senza indirizzo, «street» è vuoto e «name» è «Bar Roma».
           Prendendo «name» alla cieca, in mezzo a un viale l'app diceva
           «Sei entrato in Bar Roma» e subito dopo «Sei entrato in viale
           Marconi»: l'annuncio della strada ripartiva da capo, col nome
           sbagliato, proprio il difetto che avevamo chiuso guardando il
           nome invece del civico (Vince, 16/10: «se faccio un viale mi
           dice sempre che lo sto imboccando?»).
           Il nome si accetta solo se quella cosa È una strada: in Photon
           lo dicono osm_key «highway» o il tipo «street». Se non lo è, la
           via resta vuota — e chi chiama non dice niente. Meglio tacere
           che dire il nome di un bar al posto della strada. */
        /* «highway» NON VUOL DIRE STRADA. In OpenStreetMap sono highway
           anche le fermate dell'autobus, gli attraversamenti e i lampioni:
           a Vietri l'app ha detto «sei in Fermata circolare» perche' la
           cosa piu' vicina era una fermata, osm_key highway. Si tengono
           solo i valori che sono davvero una via da percorrere. */
        var NON_SONO_STRADE = { bus_stop: 1, crossing: 1, traffic_signals: 1,
                                street_lamp: 1, stop: 1, give_way: 1, turning_circle: 1,
                                elevator: 1, platform: 1, milestone: 1, speed_camera: 1 };
        var eUnaStrada = p && ((p.osm_key === 'highway' && !NON_SONO_STRADE[p.osm_value]) ||
                               p.type === 'street');
        var v = p ? {
          via: p.street || (eUnaStrada ? (p.name || '') : ''),
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
    'shop:greengrocer': 'frutta e verdura', 'shop:hairdresser': 'parrucchiere',
    /* allargata il 16/10, dopo la camminata di Vince: «mi puoi descrivere
       cosa c'è, se c'è un parco sulla destra, il benzinaio sulla sinistra».
       Quello che si incontra davvero camminando in un quartiere — e che a
       chi non vede serve per sapere dov'è arrivato. */
    fast_food: 'tavola calda', pub: 'pub', doctors: 'ambulatorio',
    dentist: 'dentista', veterinary: 'veterinario', school: 'scuola',
    kindergarten: 'asilo', cinema: 'cinema', fountain: 'fontana',
    bureau_de_change: 'cambio', car_wash: 'autolavaggio', bus_station: 'stazione dei bus',
    'shop:convenience': 'alimentari', 'shop:doityourself': 'ferramenta',
    'shop:hardware': 'ferramenta', 'shop:florist': 'fioraio',
    'shop:optician': 'ottico', 'shop:shoes': 'negozio di scarpe',
    'shop:clothes': 'negozio di vestiti', 'shop:laundry': 'lavanderia',
    'shop:mobile_phone': 'negozio di telefonia', 'shop:bicycle': 'negozio di biciclette',
    'shop:books': 'libreria', 'shop:toys': 'negozio di giocattoli',
    'shop:electronics': 'negozio di elettronica', 'shop:furniture': 'negozio di mobili',
    'shop:car_repair': 'officina', 'shop:beauty': 'centro estetico',
    'shop:wine': 'enoteca', 'shop:deli': 'gastronomia', 'shop:pet': 'negozio di animali'
  };
  var AREE = o.aree || {
    'leisure:park': 'parco', 'leisure:garden': 'giardino',
    'amenity:place_of_worship': 'chiesa', 'amenity:school': 'scuola',
    'amenity:hospital': 'ospedale', 'amenity:townhall': 'municipio',
    'amenity:marketplace': 'mercato', 'tourism:museum': 'museo',
    'historic:monument': 'monumento', 'place:square': 'piazza',
    'office:government': 'ufficio pubblico', 'railway:station': 'stazione',
    'leisure:playground': 'parco giochi', 'leisure:pitch': 'campo sportivo',
    'leisure:sports_centre': 'centro sportivo', 'leisure:stadium': 'stadio',
    'amenity:university': 'università', 'amenity:parking': 'parcheggio',
    'amenity:theatre': 'teatro', 'amenity:library': 'biblioteca',
    'amenity:police': 'commissariato', 'amenity:fire_station': 'caserma dei pompieri',
    'tourism:attraction': 'luogo da vedere', 'tourism:gallery': 'galleria d\'arte',
    'historic:ruins': 'rovine', 'historic:archaeological_site': 'area archeologica',
    'historic:castle': 'castello', 'historic:church': 'chiesa',
    'place:neighbourhood': 'quartiere'
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
      var fuori = { punti: [], aree: [], alberi: [], vie: [], civici: [] };
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
          /* IL SEMAFORO ACUSTICO. È la cosa più importante che la mappa
             sappia di un attraversamento, e la buttavamo via: per chi non
             vede, un semaforo che suona è la differenza fra attraversare da
             solo e aspettare qualcuno. */
          var suona = (t['traffic_signals:sound'] === 'yes' || t['traffic_signals:sound'] === 'walk' ||
                       t['crossing:signals:sound'] === 'yes' || t.acoustic === 'yes');
          fuori.punti.push({ cosa: 'attraversamento', semaforo: sem, suona: suona,
            strisce: (t.crossing === 'marked' || t.crossing === 'zebra'),
            tattile: t.tactile_paving === 'yes', lat: la, lon: lo });
          continue;
        }
        /* IL NUMERO CIVICO. Camminando, i numeri dicono quanto manca meglio
           di qualunque distanza: «stai passando il 47» vale più di «fra
           ottanta metri». Sono nodi come gli altri e non li leggeva
           nessuno. */
        if (t['addr:housenumber']) {
          fuori.civici.push({ n: t['addr:housenumber'], via: t['addr:street'] || '', lat: la, lon: lo });
          if (!PUNTI[t.amenity] && !PUNTI['shop:' + t.shop]) continue;
        }
        /* LE COSE CHE SI PRENDONO ADDOSSO, e quelle che aiutano.
           Stavano nella mappa da sempre e non le leggeva nessuno: per chi
           cammina senza vedere un palo in mezzo al marciapiede conta più di
           un monumento, e uno scivolo al posto del gradino cambia la
           strada che sceglie. Aggiunte il 16/10, quando Vince ha chiesto
           «maggiori dettagli» su quello che si passa. */
        if (t.barrier === 'bollard' || t.barrier === 'block') {
          fuori.punti.push({ cosa: 'paletto', servizio: 'paletto', nome: '', lat: la, lon: lo });
          continue;
        }
        if (t.highway === 'street_lamp') {
          fuori.punti.push({ cosa: 'lampione', servizio: 'lampione', nome: '', lat: la, lon: lo });
          continue;
        }
        if (t.highway === 'elevator') {
          fuori.punti.push({ cosa: 'ascensore', servizio: 'ascensore', nome: t.name || '', lat: la, lon: lo });
          continue;
        }
        if (t.kerb === 'lowered' || t.barrier === 'kerb' && t.kerb === 'lowered') {
          fuori.punti.push({ cosa: 'scivolo del marciapiede', servizio: 'scivolo del marciapiede',
                             nome: '', tattile: t.tactile_paving === 'yes', lat: la, lon: lo });
          continue;
        }
        if (t.amenity === 'post_box') {
          fuori.punti.push({ cosa: 'cassetta postale', servizio: 'cassetta postale', nome: '', lat: la, lon: lo });
          continue;
        }
        if (t.entrance === 'main' && t.name) {
          fuori.punti.push({ cosa: 'ingresso', servizio: 'ingresso', nome: t.name, lat: la, lon: lo });
          continue;
        }
        /* I MEZZI PUBBLICI. «È importante per i non vedenti: fermate
           autobus, treni, metro» (Vince, 16/10). Per chi non vede la
           fermata non è un dettaglio del paesaggio: è il modo di andarsene
           da lì. E l'ingresso della metropolitana, che un vedente trova
           dalla scalinata, senza occhi non si trova affatto. */
        if (t.railway === 'subway_entrance' || t.entrance === 'subway') {
          fuori.punti.push({ cosa: 'ingresso della metropolitana', servizio: 'ingresso della metropolitana',
                             nome: t.name || '', lat: la, lon: lo });
          continue;
        }
        if (t.railway === 'tram_stop') {
          fuori.punti.push({ cosa: 'fermata del tram', servizio: 'fermata del tram',
                             nome: t.name || '', linee: t.route_ref || '', lat: la, lon: lo });
          continue;
        }
        if (t.railway === 'station' || t.railway === 'halt') {
          fuori.punti.push({ cosa: 'stazione', servizio: 'stazione', nome: t.name || '', lat: la, lon: lo });
          continue;
        }
        if (t.highway === 'bus_stop' || t.public_transport === 'platform') {
          fuori.punti.push({ cosa: 'fermata dell\'autobus', servizio: 'fermata dell\'autobus',
                             nome: t.name || '', linee: t.route_ref || '', lat: la, lon: lo });
          continue;
        }
        var tipo = PUNTI[t.amenity] || PUNTI['shop:' + t.shop] || PUNTI[t.leisure] || null;
        /* gli orari: «la farmacia è aperta» cambia se ci vai o no */
        if (tipo) fuori.punti.push({ cosa: tipo, servizio: tipo, nome: t.name || '',
                                     orari: t.opening_hours || '', lat: la, lon: lo });
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
        /* le scale sono una via, non un punto: si prende il primo gradino */
        if (tw.highway === 'steps') {
          var pr = dove[nd[0] && nd[0].getAttribute('ref')];
          if (pr) {
            fuori.punti.push({ cosa: 'scalini', servizio: 'scalini',
                               nome: tw.name || '', quanti: parseInt(tw.step_count || '0', 10) || 0,
                               corrimano: tw.handrail === 'yes', lat: pr[0], lon: pr[1] });
          }
          continue;
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
             fuori.alberi.length + ' alberi, ' + fuori.vie.length + ' strade, ' +
             fuori.civici.length + ' civici');
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
  /* inItaliano(): QUELLO CHE VALHALLA NON TRADUCE.
     Nelle istruzioni italiane restano pezzi d'inglese, e la voce li
     legge: «Svolta a sinistra su the crosswalk», «Take the stairs».
     A chi non vede «take the stairs» non dice che ci sono dei gradini.
     E «la passerella» e' la parola di Valhalla per un pezzo di strada
     pedonale senza nome: detta cosi' sembra un ponte sospeso. */
  var INGLESE = [
    [/\bTake the stairs\b/gi, 'Ci sono dei gradini'],
    [/\bTake the escalator\b/gi, 'C\'è una scala mobile'],
    [/\bTake the elevator\b/gi, 'C\'è un ascensore'],
    [/\bthe crosswalk\b/gi, 'l\'attraversamento'],
    [/\bthe stairs\b/gi, 'i gradini'],
    [/\bthe sidewalk\b/gi, 'il marciapiede'],
    [/\bthe footpath\b/gi, 'il sentiero'],
    [/\bthe path\b/gi, 'il sentiero'],
    [/\bthe walkway\b/gi, 'il passaggio'],
    [/\bthe alley\b/gi, 'il vicolo'],
    [/\bthe parking aisle\b/gi, 'il parcheggio'],
    /* «sulla passerella» e' la traduzione di Valhalla per footway: a
       piedi, in citta', quello e' il marciapiede. */
    [/\bsulla passerella\b/gi, 'sul marciapiede'],
    [/\bla passerella\b/gi, 'il marciapiede'],
    [/\bsu the\b/gi, 'su'],
    /* «su l'attraversamento» non si dice: l'articolo davanti a vocale
       si lega alla preposizione. Scritto si legge, detto a voce no. */
    [/\bsu l'/gi, "sull'"],
    [/\bsu il\b/gi, 'sul'],
    [/\bsu la\b/gi, 'sulla'],
    [/\bsu i\b/gi, 'sui']
  ];
  function inItaliano(t) {
    for (var i = 0; i < INGLESE.length; i++) t = t.replace(INGLESE[i][0], INGLESE[i][1]);
    return t;
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
        /* VIA I PUNTI CARDINALI. Valhalla apre sempre con «Cammina verso
           sud-est su corso della Repubblica»: a chi cammina, e soprattutto a
           chi non vede, il sud-est non dice niente. Resta «Cammina su corso
           della Repubblica», che è l'unica parte che si può eseguire. */
        testo = testo.replace(/\s+verso\s+(?:nord|sud|est|ovest)(?:[- ](?:est|ovest))?/gi, '');
        if (!testo) return;
        testo = inItaliano(testo);
        var metri = Math.round((m.length || 0) * 1000);
        if (m.type === 4 || m.type === 5 || m.type === 6) return;      // l'arrivo lo dice l'app
        if (k && metri < 20 && /rimanere su|mantieni/i.test(testo)) return;
        /* LE SVOLTE DI OTTO METRI NON SONO SVOLTE.
           Provato il percorso che ha fatto Vince a Trastevere il 23/10:
           «Svolta a destra sulla passerella» per OTTO metri, e subito
           dopo a sinistra. Non e' una svolta: e' lo scivolo del
           marciapiede, o le due meta' di un attraversamento, che in
           OpenStreetMap sono pezzi di strada a se'. Lui ha sentito
           «gira a destra» e doveva andare dritto.
           Sotto i quindici metri una svolta su un pezzo senza nome si
           butta: la direzione vera e' quella del pezzo dopo. I gradini
           no — quelli si dicono sempre, perche' chi non vede ci
           inciampa. */
        var senzaNome = /\b(?:passerella|marciapiede|attraversamento|sentiero|il percorso)\b/i.test(testo);
        var gradini = /gradin|scalin|scala/i.test(testo);
        /* ---------- NOVE METRI DI VIA NON SONO UNA SVOLTA ---------- 31/10/2026
           «Mentre eravamo in via dei Corazzieri mi ha detto di girare in
           via dei Guastatori, che stava alla nostra sinistra non a
           destra, ma non dovevo girare: dovevo andare diritto» (Vince).
           Rifatto stamattina il suo percorso vero (41.824512,12.491393 →
           casa) e contato: la manovra n. 9 era «Svolta a destra su Via
           dei Guastatori» per NOVE METRI, e la n. 10 subito dopo «Svolta
           a sinistra su Via dei Corazzieri». Quei nove metri sono la
           larghezza dell'incrocio: tu attraversi e tiri dritto, e la
           svolta vera e' quella dopo.
           Il filtro c'era dal 23/10 ma buttava solo i pezzi SENZA nome —
           passerella, marciapiede. Bastava che l'incrocio avesse un nome
           di via per rientrare dalla finestra. Da oggi il metro conta
           piu' del nome: sotto i quindici metri non e' una svolta,
           qualunque cosa ci sia scritto. I gradini restano sempre. */
        if (k && metri < 15 && !gradini) return;
        if (svolte.length && svolte[svolte.length - 1].testo === testo) return;  // Valhalla la spezza in due
        /* ---------- LA STESSA VIA NON SI SVOLTA DUE VOLTE ---------- 31/10/2026
           Dallo stesso percorso: n. 3 «Svolta a sinistra su Via Fratelli
           Laurana», e 17 metri dopo la n. 4 «Mantieni la destra per
           imboccare Via dei Fratelli Laurana». Poi la n. 5 «Svolta a
           destra su Viale Luca Gaurico» e la n. 6 «Mantieni la sinistra
           per rimanere su Viale Luca Gaurico». Sono quattro annunci per
           due svolte, e il secondo di ogni coppia dice un lato opposto al
           primo: stamattina Vince le ha sentite tutte e quattro, a dieci
           secondi l'una dall'altra.
           Quando due manovri di fila nominano la stessa via, la svolta e'
           una: vale la prima, quella che dice di girare. La seconda e'
           la corsia da tenere dopo — informazione per chi guida, non per
           chi cammina. */
        /* il nome della via dentro la frase, scritto sempre allo stesso
           modo: Valhalla dice «Via Fratelli Laurana» nella svolta e «Via
           dei Fratelli Laurana» nella corsia dopo, ed e' la stessa via —
           quindi gli articoli si levano prima di confrontare. Si cerca il
           nome da solo, senza la preposizione davanti: «per imboccare Via
           dei Fratelli Laurana» non ha nessun «su». */
        var viaDi = function (t) {
          var m2 = /\b((?:via|viale|corso|piazza|largo|vicolo|lungotevere|salita|strada|circonvallazione)\b[^,.;]*)/i.exec(t || '');
          return m2 ? m2[1].toLowerCase()
                        .replace(/\b(?:dei|degli|delle|del|della|dello|di|la|il|lo|le|l)\b/g, '')
                        .replace(/[^a-z\u00e0-\u00ff ]/g, '')
                        .replace(/\s+/g, ' ').trim() : '';
        };
        if (svolte.length) {
          var viaPrima = viaDi(svolte[svolte.length - 1].testo);
          var viaOra = viaDi(testo);
          if (viaPrima && viaOra && viaPrima === viaOra) {
            diario('PERCORSO: «' + testo.slice(0, 45) + '» e la stessa via di prima, la salto');
            return;
          }
        }
        svolte.push({ lat: pt[0], lon: pt[1], testo: testo, metri: metri, avviso: gradini });
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
