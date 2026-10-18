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
          wd:Q1081138 wd:Q24354 wd:Q207694 wd:Q2065736 wd:Q56242440 wd:Q317557
          wd:Q16560 wd:Q2651004 wd:Q82117 wd:Q537127 wd:Q158438 wd:Q91312
          wd:Q19899465 wd:Q96371632 wd:Q81851 wd:Q108325 wd:Q39614 wd:Q1497375
          wd:Q22746 wd:Q55177716 wd:Q179700 wd:Q839954 wd:Q57831 wd:Q1128397
          wd:Q44613 wd:Q96371565 wd:Q210077 wd:Q797765 wd:Q72926449 wd:Q2977
          wd:Q163687 wd:Q120560 wd:Q160742 wd:Q3329412 wd:Q2087181 wd:Q1970365
          wd:Q3867560 wd:Q17431399 wd:Q16735822 wd:Q12104174 wd:Q97662266
          wd:Q2398990 wd:Q92755865 wd:Q124830213 wd:Q124830411 wd:Q94701721
          wd:Q56242215 wd:Q1129743 wd:Q1370598 wd:Q2977
          wd:Q23442 wd:Q1134686 wd:Q93352 wd:Q8502 wd:Q54050 wd:Q4022
          wd:Q1322134 wd:Q40080 wd:Q473972 wd:Q6063204 wd:Q133056 wd:Q44782
          wd:Q23397 wd:Q39816 wd:Q747074 wd:Q3950 wd:Q697295 wd:Q1293150
          wd:Q55488 wd:Q55678 wd:Q1088552 wd:Q97588309 wd:Q740437
          wd:Q8072"""
# Q8072 VULCANO, aggiunto il 19/10. Vince, tornando da Napoli in autostrada:
# «a sinistra c'era il Vesuvio, a destra il golfo con le isole; erano
# lontani ma c'era un panorama che un non vedente magari puo' apprezzare».
# Il Vesuvio non c'era: in Wikidata e' un VULCANO, e noi prendevamo
# «montagna». Nel golfo ce ne sono otto, fra Vesuvio, Epomeo, Solfatara e i
# crateri flegrei.
# IL PAESAGGIO, dal 18/10. Vince, tornando da Vietri: «il non vedente vuole
# che sia descritta la realta' circostante — di fronte, davanti a te hai il
# golfo, Raito, i Due Fratelli». Nei dati non c'era niente di tutto questo:
# chiedevamo chiese, palazzi e musei, e intorno a Vietri uscivano 110 luoghi
# tutti edifici. Chiesto a Wikidata cosa c'e' davvero sulla costiera:
#   «I Due Fratelli» e' un'ISOLA (Q23442), «Raito» una FRAZIONE (Q1134686),
#   la «Costiera amalfitana» una COSTA (Q93352).
# Aggiunte anche montagna, collina, fiume, baia, spiaggia, lago, valle,
# area protetta, parco regionale, passo, porto, comune, villa, santuario,
# torre costiera e le stazioni: sono i punti fermi del paesaggio, quelli che
# uno vedrebbe alzando gli occhi — ed e' esattamente quello che a chi non
# vede nessuno racconta.
# LA LISTA ERA TROPPO CORTA, E SI VEDEVA SOLO CONTANDO.
# Pisa, 16/10: 143 luoghi trovati e dentro non c'erano la Torre, il Duomo, il
# Battistero e il Camposanto. Chiesto a Wikidata cosa c'e' davvero in quel
# pezzo di citta' con una voce su Wikipedia: 134 classi diverse, e la lista ne
# chiedeva 19. Mancava perfino «palazzo» — trentasei solo a Pisa.
# Provato prima con «wdt:P31/wdt:P279*», che segue le sottoclassi e le
# prenderebbe tutte: la domanda va in timeout, ed e' esattamente il modo in
# cui Roma e' rimasta vuota il 15/10. Quindi la classe resta esatta e la
# lista si allunga: le classi nuove sono quelle viste a Pisa piu' le grandi
# famiglie che mancavano (cattedrale, basilica, abbazia, battistero,
# campanile, torre pendente).
# FUORI DI PROPOSITO: dipinti, sculture e pulpiti (sono DENTRO una chiesa,
# non posti dove si cammina), la citta' stessa, le universita' come ente e
# gli istituti di ricerca.

def chiedi(url, dati=None, prove=6):
    """SI RIPROVA, E SE NON SI RIESCE SI GRIDA.
    Questo e' il punto dove Roma e' rimasta vuota il 15/10: Wikidata ha dato
    502, nessuno ha riprovato, lo script e' andato avanti zitto e la citta' e'
    finita in linea con i negozi e zero monumenti. Se n'e' accorto Vince
    chiedendo «verificato?», un giorno dopo.
    Due regole, e valgono per qualunque cosa si scarichi:
    1. UN 502 NON E' UNA RISPOSTA. Si aspetta e si riprova, sei volte, con
       l'attesa che si allunga: Wikidata va a ondate e dopo un minuto passa.
    2. NON SI RESTITUISCE MAI «NIENTE» COME SE FOSSE UN RISULTATO. Se dopo sei
       tentativi non risponde, si alza l'eccezione e il programma muore con
       un errore: meglio fermarsi e rifare, che pubblicare una citta' vuota."""
    ultimo = None
    for tentativo in range(prove):
        r = urllib.request.Request(url, data=dati, headers={'User-Agent': CHIAMATA,
                                                            'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(r, timeout=120) as f:
                return json.load(f)
        except Exception as e:
            ultimo = e
            if tentativo + 1 == prove:
                break
            attesa = 10 * (tentativo + 1)
            print('   %s non risponde (%s): riprovo fra %d s'
                  % (NOME, str(e)[:48], attesa), file=sys.stderr)
            time.sleep(attesa)
    raise RuntimeError('%s: dopo %d tentativi non risponde nessuno (%s)'
                       % (NOME, prove, ultimo))

def daWikidata():
    q = """
SELECT ?x ?xLabel ?tipoLabel ?anno ?architettoLabel ?coord ?art WHERE {
  SERVICE wikibase:box {
    ?x wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(%s %s)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(%s %s)"^^geo:wktLiteral .
  }
  # LA CLASSE ESATTA, E LA LISTA VA TENUTA COMPLETA. Provato con
  # «wdt:P31/wdt:P279*», che segue le sottoclassi: la domanda va in timeout —
  # ed e' esattamente il modo in cui Roma e' rimasta vuota il 15/10. Quindi
  # la classe resta esatta e le classi che mancano si aggiungono a TIPI: si
  # scoprono chiedendo a Wikidata cosa c'e' in un pezzo di citta' che ha una
  # voce su Wikipedia e che la lista non prende (vedi cosa-manca.py).
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
