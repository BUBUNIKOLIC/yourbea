#!/usr/bin/env python3
"""
PRENDI I MONUMENTI DI UNA CITTÀ — Yourbea, 16/10/2026
======================================================
«Ci sono nuove fonti per approfondimenti… e fallo» (Vince).

Due fonti, tutte e due aperte e senza chiavi:
- WIKIDATA dà i fatti in ordine: cos'è, di che anno, chi l'ha costruito.
  Sono gli stessi dati che stanno sotto Wikipedia, ma strutturati — e
  «chiesa del 1252 di Filippo Brunelleschi» si dice a voce in due secondi,
  mentre un articolo intero no.
- WIKIPEDIA dà il racconto: le prime righe della voce, che è quasi sempre
  la parte scritta meglio.

I file escono a quadretti da un chilometro come i negozi, così l'app
scarica solo dove sei: dati/cultura/4377_1125.json

   python3 prendi-monumenti.py firenze 11.19 11.32 43.74 43.82
"""
import json, os, sys, time, urllib.parse, urllib.request, collections

NOME, XMIN, XMAX, YMIN, YMAX = sys.argv[1], *map(float, sys.argv[2:6])
QUI = os.path.dirname(os.path.abspath(__file__))
CARTELLA = os.path.join(QUI, '..', 'nuova', 'dati', 'cultura')
CHIAMATA = 'Yourbea/1.0 (guida vocale per non vedenti; viarkdimeglio@gmail.com)'

# le cose che vale la pena raccontare camminando: chiese, palazzi, musei,
# castelli, torri, fontane, ponti, piazze, teatri, monumenti
TIPI = """wd:Q16970 wd:Q23413 wd:Q33506 wd:Q41176 wd:Q3947 wd:Q2080521 wd:Q811979
          wd:Q4989906 wd:Q44539 wd:Q483453 wd:Q12518 wd:Q174782 wd:Q43229
          wd:Q1081138 wd:Q24354 wd:Q207694 wd:Q2065736 wd:Q56242440 wd:Q317557"""

def chiedi(url, dati=None):
    r = urllib.request.Request(url, data=dati, headers={'User-Agent': CHIAMATA,
                                                        'Accept': 'application/json'})
    with urllib.request.urlopen(r, timeout=120) as f:
        return json.load(f)

def daWikidata():
    q = """
SELECT ?x ?xLabel ?tipoLabel ?anno ?architettoLabel ?coord ?art WHERE {
  SERVICE wikibase:box {
    ?x wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(%s %s)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(%s %s)"^^geo:wktLiteral .
  }
  ?x wdt:P31 ?tipo . VALUES ?tipo { %s }
  OPTIONAL { ?x wdt:P571 ?anno }
  OPTIONAL { ?x wdt:P84 ?architetto }
  OPTIONAL { ?art schema:about ?x ; schema:isPartOf <https://it.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en" }
}""" % (XMIN, YMIN, XMAX, YMAX, ' '.join(TIPI.split()))
    url = 'https://query.wikidata.org/sparql?format=json&query=' + urllib.parse.quote(q)
    righe = chiedi(url)['results']['bindings']
    # lo stesso monumento torna una riga per architetto: si uniscono
    roba = {}
    for r in righe:
        id_ = r['x']['value']
        p = r['coord']['value'].replace('Point(', '').replace(')', '').split()
        x = roba.setdefault(id_, {'n': r['xLabel']['value'],
                                  't': r.get('tipoLabel', {}).get('value', ''),
                                  'lon': round(float(p[0]), 5), 'lat': round(float(p[1]), 5),
                                  'arch': [], 'art': ''})
        if 'anno' in r and 'y' not in x:
            a = r['anno']['value'][:4].lstrip('-')
            if a.isdigit(): x['y'] = int(a)
        if 'architettoLabel' in r:
            a = r['architettoLabel']['value']
            if a and not a.startswith('Q') and a not in x['arch']: x['arch'].append(a)
        if 'art' in r:
            x['art'] = urllib.parse.unquote(r['art']['value'].split('/wiki/')[-1]).replace('_', ' ')
    return [v for v in roba.values() if v['n'] and not v['n'].startswith('Q')]

def daWikipedia(roba):
    """le prime righe della voce, venti per volta"""
    conArticolo = [x for x in roba if x['art']]
    for i in range(0, len(conArticolo), 20):
        mucchio = conArticolo[i:i + 20]
        titoli = '|'.join(x['art'] for x in mucchio)
        url = ('https://it.wikipedia.org/w/api.php?action=query&format=json&prop=extracts'
               '&exintro=1&explaintext=1&redirects=1&titles=' + urllib.parse.quote(titoli))
        try:
            d = chiedi(url)['query']
        except Exception:
            time.sleep(2); continue
        perTitolo = {}
        for p in d.get('pages', {}).values():
            if p.get('extract'):
                perTitolo[p['title']] = p['extract']
        # i rimandi cambiano il titolo: si riallinea
        rimandi = {r['from']: r['to'] for r in d.get('redirects', [])}
        for x in mucchio:
            t = rimandi.get(x['art'], x['art'])
            testo = perTitolo.get(t)
            if testo:
                x['d'] = ' '.join(testo.split())[:700]
        time.sleep(0.4)          # non si martella Wikipedia
    return roba

def quadretto(lat, lon):
    return '%04d_%04d' % (int(lat * 100), int(lon * 100))

roba = daWikidata()
roba = daWikipedia(roba)
os.makedirs(CARTELLA, exist_ok=True)
mucchi = collections.defaultdict(list)
for x in roba:
    r = {'n': x['n'], 't': x['t'], 'lat': x['lat'], 'lon': x['lon']}
    if x.get('y'): r['y'] = x['y']
    if x.get('arch'): r['arch'] = x['arch'][:2]
    if x.get('d'): r['d'] = x['d']
    mucchi[quadretto(x['lat'], x['lon'])].append(r)

scritti = conTesto = 0
for k, v in mucchi.items():
    f = os.path.join(CARTELLA, k + '.json')
    vecchi = []
    if os.path.exists(f):
        try: vecchi = json.load(open(f, encoding='utf-8'))
        except Exception: vecchi = []
    visti = {r['n'] for r in vecchi}
    for r in v:
        if r['n'] not in visti:
            vecchi.append(r); visti.add(r['n'])
    json.dump(vecchi, open(f, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    scritti += 1
conTesto = sum(1 for x in roba if x.get('d'))
print('%s: %d monumenti, %d con la scheda di Wikipedia, in %d quadretti' % (
    NOME, len(roba), conTesto, scritti))
