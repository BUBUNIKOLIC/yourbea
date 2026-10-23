#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LE MISURE DEGLI EDIFICI, DA OPENSTREETMAP — Yourbea, 22/10/2026
   ============================================================
   Le descrizioni di com'e' fatto un monumento finora venivano solo da
   Wikipedia, cioe' da PROSA da interpretare: ed e' li' che nascono i
   guai di oggi — «larga due metri e mezzo» (era la foto), «su un rialzo
   di pietra» preso per il materiale della chiesa.

   OpenStreetMap ha un'altra cosa: i TAG dell'edificio. Non frasi,
   numeri, messi da chi c'e' stato, e attaccati alla sagoma del palazzo —
   quindi non possono finire su quello accanto.
   Misurato sul centro di Roma prima di scrivere questo: sui 244
   monumenti con un nome, il 23% ha gia' almeno un dato — altezza, piani,
   forma del tetto, architetto, anno.

   QUELLO CHE SI PRENDE, e perche' quello:
     height            -> h    l'altezza vera, in metri
     building:levels   -> pi   i piani CONTATI (battono quelli calcolati
                               dividendo l'altezza per tre)
     building:material -> mat  di cosa e' fatto
     roof:shape        -> frm  la forma del tetto, se e' una che si sente
     start_date        -> y    l'anno
     architect         -> arch chi l'ha fatto

   COME SI ATTACCA AL POSTO GIUSTO. La lezione della notte del 22/10:
   le coordinate dicono DOVE, non CHE COSA. Quindi: o l'edificio ha un
   nome che ha una parola propria in comune col nostro (e allora bastano
   cento metri), oppure non ha nome e si sta sotto i venticinque metri —
   cioe' ci sei dentro.

   Si lancia:   python3 strumenti/misure-da-osm.py --tutta
                python3 strumenti/misure-da-osm.py 41.88 41.92 12.46 12.52
"""
import io
import json
import math
import os
import re
import subprocess
import sys
import time
import unicodedata

QUI = os.path.dirname(os.path.abspath(__file__))
DATI = os.path.join(QUI, '..', 'nuova', 'dati', 'cultura')
AGENTE = 'Yourbea/1.0 (app per non vedenti; viarkdimeglio@gmail.com)'
OVERPASS = 'https://overpass-api.de/api/interpreter'

GENERICHE = set(('di del della dello dei degli delle da a al alla il lo la i gli le '
                 'un uno una e ed in su con per '
                 'chiesa chiesetta cappella basilica cattedrale duomo santuario '
                 'oratorio pieve abbazia monastero convento collegiata tempio '
                 'palazzo palazzina casa villa castello torre porta ponte '
                 'fontana piazza piazzale largo corso viale strada via vicolo '
                 'museo teatro cinema stadio parco giardino cimitero '
                 'santa santo sant san santi sante beata beato madonna maria '
                 'monumento edificio complesso antica antico vecchia vecchio '
                 'nuova nuovo grande piccola piccolo italiano italiana').split())


def nudo(t):
    t = unicodedata.normalize('NFD', (t or '').lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return set(w for w in re.sub(r'[^a-z0-9 ]', ' ', t).split()
               if len(w) > 3 and w not in GENERICHE)


def dist(a, b, c, d):
    R = 6371000.0
    P = math.pi / 180
    x = (c - a) * P
    y = (d - b) * P
    h = math.sin(x / 2) ** 2 + math.cos(a * P) * math.cos(c * P) * math.sin(y / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def chiedi(query, prove=4):
    """curl e non urllib: python3 di Xcode non stringe la mano a overpass."""
    for n in range(prove):
        p = subprocess.run(['curl', '-s', '-A', AGENTE, '--data-urlencode', 'data=' + query,
                            OVERPASS, '--max-time', '180'], capture_output=True)
        try:
            return json.loads(p.stdout.decode('utf-8'))
        except Exception:
            time.sleep(20 * (n + 1))
    return {}


# le forme del tetto che uno SENTE stando davanti. «Flat» non si dice: un
# tetto piatto, da sotto, non e' niente.
TETTI = {'dome': 'cupola', 'onion': 'cupola', 'pyramidal': 'tetto a punta',
         'conical': 'tetto a punta', 'spherical': 'cupola',
         'gabled': 'tetto a due spioventi', 'hipped': 'tetto a quattro spioventi',
         'round': 'tetto tondo', 'skillion': 'tetto a una falda'}

MATERIE = {'brick': 'mattoni', 'stone': 'pietra', 'marble': 'marmo',
           'concrete': 'cemento', 'wood': 'legno', 'tuff': 'tufo',
           'travertine': 'travertino', 'granite': 'granito',
           'limestone': 'calcare', 'sandstone': 'arenaria', 'plaster': 'intonaco',
           'glass': 'vetro', 'metal': 'metallo', 'steel': 'acciaio'}


def numero(t, minimo, massimo):
    m = re.search(r'(\d{1,4}(?:[.,]\d+)?)', str(t or ''))
    if not m:
        return None
    try:
        v = float(m.group(1).replace(',', '.'))
    except ValueError:
        return None
    return round(v, 1) if minimo <= v <= massimo else None


def anno(t):
    m = re.search(r'(\d{3,4})', str(t or ''))
    if not m:
        return None
    v = int(m.group(1))
    return v if 500 <= v <= 2030 else None


# ============================================================
# CHE COSA PUO' AVERE UNA MISURA, E CHE COSA NO
# Provato sul centro di Roma prima di scrivere questa parte, e il primo
# giro era pieno di roba falsa: «piazza del Quirinale alta 14,6 metri»,
# «Fontana del Mascherone di un piano», «chiesa di Santa Maria in
# Monticelli alta 6 piani», e lo stesso architetto appiccicato al portico
# di Ottavia, al portico di Filippo e a piazza Campitelli.
# Tre regole, che nascono tutte da li':
#  1. UN POSTO APERTO NON HA ALTEZZA. Una piazza, un largo, un parco,
#     una via: l'edificio che ci affaccia non e' la piazza.
#  2. I PIANI LI HA SOLO CHI HA I PIANI. Una chiesa non ha sei piani: il
#     numero viene dal palazzo attaccato. Una fontana e un arco nemmeno.
#     `building:levels` si prende solo da palazzi, case, musei, scuole.
#  3. UN NOME IN COMUNE NON BASTA DA LONTANO. «piazza di Campitelli» e
#     «Fontana di piazza Campitelli» hanno una parola in comune e sono
#     due cose diverse: da vicino (trenta metri) una parola basta, piu'
#     in la' devono chiamarsi praticamente uguale.
# LA REGOLA E' AL CONTRARIO: si prende SOLO per le cose che sono un
# edificio, e per niente altro.
# Primo giro sul centro di Roma: «piazza del Quirinale alta 14,6 metri»,
# «Fontana del Mascherone di un piano», «la chiesa alta sei piani».
# Secondo giro, con la lista di quello che si butta: meglio, ma ancora
# «statua di Pan alta 22 metri» (e' l'altezza del museo che la contiene),
# «Tempio di Giove Tonante» e «Tempio di Giove Feretrio» tutt'e due alti
# 21 — sono rovine, l'edificio e' di qualcun altro — e «piazza del Gesu'»
# con l'anno di costruzione.
# Una lista di cose da buttare non finisce mai: si rovescia. Un tag
# dell'edificio si attacca solo a un EDIFICIO, e di quelli si sa il nome:
# chiese, palazzi, case, torri, musei, teatri, conventi. Una statua, una
# fontana, una piazza, un tempio in rovina non sono un edificio, e
# l'altezza del palazzo intorno non e' la loro.
EDIFICI = re.compile(r'\b(chiesa|chiesetta|cappella|basilica|cattedrale|duomo|'
                     r'santuario|oratorio|pieve|abbazia|collegiata|'
                     r'palazzo|palazzina|casa|villa|castello|rocca|torre|'
                     r'museo|teatro|biblioteca|scuola|liceo|universit|'
                     r'ospedale|albergo|collegio|convento|monastero|seminario|'
                     r'caserma|municipio|tribunale|stazione|mercato|'
                     r'edificio|grattacielo|faro)\b', re.I)
# e i piani li ha solo chi ha i piani: una chiesa non ha sei piani, quel
# numero viene dal palazzo attaccato
CON_I_PIANI = re.compile(r'\b(palazzo|palazzina|casa|villa|museo|biblioteca|'
                         r'scuola|liceo|universit|ospedale|albergo|teatro|'
                         r'collegio|convento|monastero|seminario|caserma|'
                         r'municipio|tribunale|stazione|mercato|edificio|'
                         r'grattacielo|torre)\b', re.I)


def daiTag(t, cosaE=''):
    """quello che di questi tag si puo' dire a voce, e nient'altro"""
    fuori = {}
    eUnEdificio = bool(EDIFICI.search(cosaE))
    haPiani = bool(CON_I_PIANI.search(cosaE))
    if not eUnEdificio:
        return {}                 # non e' un edificio: non ha misure sue
    if True:
        h = numero(t.get('height'), 3, 180)
        if h:
            fuori['h'] = h
    if haPiani:
        pi = numero(t.get('building:levels'), 1, 60)
        if pi:
            fuori['pi'] = int(pi)
    mat = []
    for pezzo in re.split(r'[;,]', str(t.get('building:material') or '')):
        k = MATERIE.get(pezzo.strip().lower())
        if k and k not in mat:
            mat.append(k)
    if mat:
        fuori['mat'] = mat[:2]
    if True:
        tetto = TETTI.get(str(t.get('roof:shape') or '').strip().lower())
        if tetto:
            fuori['frm'] = [tetto]
    y = anno(t.get('start_date'))
    if y:
        fuori['y'] = y
    a = str(t.get('architect') or '').strip()
    if a and len(a) < 60:
        fuori['arch'] = [x.strip() for x in a.split(';')][:2]
    return fuori


def edificiNelRiquadro(la1, la2, lo1, lo2):
    q = ('[out:json][timeout:180];(way["building"]["name"](%f,%f,%f,%f);'
         'way["building"]["height"](%f,%f,%f,%f);'
         'way["building"]["building:levels"](%f,%f,%f,%f););out tags center;'
         % (la1, lo1, la2, lo2, la1, lo1, la2, lo2, la1, lo1, la2, lo2))
    fuori = []
    for e in chiedi(q).get('elements', []):
        c = e.get('center') or {}
        if not c.get('lat'):
            continue
        t = e.get('tags', {})
        if not any(t.get(k) for k in ('height', 'building:levels', 'building:material',
                                      'roof:shape', 'start_date', 'architect')):
            continue
        fuori.append({'lat': c['lat'], 'lon': c['lon'],
                      'n': t.get('name') or '', 'tag': t})
    return fuori


def quadretto(lat, lon):
    return '%04d_%04d' % (int(lat * 100), int(lon * 100))


def faiIlRiquadro(nome, la1, la2, lo1, lo2):
    edifici = edificiNelRiquadro(la1, la2, lo1, lo2)
    print('  %s: %d edifici con qualcosa da dire' % (nome, len(edifici)), flush=True)
    if not edifici:
        return 0
    perQuadretto = {}
    for e in edifici:
        perQuadretto.setdefault(quadretto(e['lat'], e['lon']), []).append(e)
    toccati = 0
    for q, elenco in perQuadretto.items():
        f = os.path.join(DATI, q + '.json')
        if not os.path.exists(f):
            continue
        dati = json.load(io.open(f, encoding='utf-8'))
        lista = dati if isinstance(dati, list) else list(dati.values())[0]
        cambiato = False
        for p in lista:
            if not isinstance(p, dict) or not p.get('lat'):
                continue
            for e in elenco:
                d = dist(p['lat'], p['lon'], e['lat'], e['lon'])
                suo, nostro = nudo(e['n']), nudo(p['n'])
                if e['n'] and suo and nostro:
                    uguali = (suo == nostro) or suo <= nostro or nostro <= suo
                    if d <= 30 and (suo & nostro):
                        pass                      # vicino, e una parola in comune: basta
                    elif d <= 100 and uguali:
                        pass                      # piu' lontano, ma si chiamano uguale
                    else:
                        continue
                else:
                    # SENZA UN NOME CHE COMBACIA NON SI PRENDE NIENTE.
                    # Anche stando a dieci metri: «Arx» — la cittadella
                    # del Campidoglio, che non c'e' piu' — si prendeva i
                    # 45 metri dell'Aracoeli, e due chiese scomparse
                    # l'altezza del palazzo che ci sta sopra adesso. Un
                    # edificio senza nome non si puo' dimostrare che sia
                    # questo: meglio meno dati che un dato falso detto a
                    # chi non vede.
                    continue
                roba = daiTag(e['tag'], (p.get('t') or '') + ' ' + (p.get('n') or ''))
                if not roba:
                    continue
                prima = {k: p.get(k) for k in ('h', 'pi', 'mat', 'frm', 'y', 'arch')}
                for k, v in roba.items():
                    if not p.get(k):          # non si tocca quello che c'e' gia'
                        p[k] = v
                if {k: p.get(k) for k in prima} != prima:
                    toccati += 1
                    cambiato = True
                break
        if cambiato:
            json.dump(dati, io.open(f, 'w', encoding='utf-8'),
                      ensure_ascii=False, separators=(',', ':'))
    print('    arricchiti %d luoghi' % toccati, flush=True)
    return toccati


def riquadriNostri():
    """solo dove abbiamo luoghi a cui manca qualcosa.
       RIQUADRI GRANDI, non piccoli. Con riquadri da cinque chilometri
       venivano 427 richieste e quattordici ore: Overpass ci mette lo
       stesso tempo per un riquadro piccolo e per uno grande — il costo
       e' la richiesta, non l'area. Uno da venti chilometri (tutta Roma)
       torna 17.000 edifici in 38 secondi. Cosi' sono una cinquantina di
       richieste, e si finisce in un'ora."""
    import collections
    zone = collections.Counter()
    for g in sorted(os.listdir(DATI)):
        if not g.endswith('.json'):
            continue
        try:
            d = json.load(io.open(os.path.join(DATI, g), encoding='utf-8'))
        except Exception:
            continue
        v = d if isinstance(d, list) else list(d.values())[0]
        for x in v:
            if not isinstance(x, dict) or not x.get('lat'):
                continue
            if x.get('h') or x.get('pi') or x.get('mat') or x.get('frm'):
                continue
            zone[(int(x['lat'] * 5), int(x['lon'] * 5))] += 1
    return [('%d_%d (%d luoghi)' % (a, o, n), a / 5.0, a / 5.0 + 0.2,
             o / 5.0, o / 5.0 + 0.2)
            for ((a, o), n) in sorted(zone.items(), key=lambda t: -t[1])]


if __name__ == '__main__':
    if '--tutta' in sys.argv:
        riquadri = riquadriNostri()
        print('TUTTA ITALIA: %d riquadri' % len(riquadri))
        T = 0
        for (nome, la1, la2, lo1, lo2) in riquadri:
            try:
                T += faiIlRiquadro(nome, la1, la2, lo1, lo2)
            except Exception as e:
                print('  %s: NON FATTO — %s' % (nome, e), flush=True)
            print('    (totale %d)' % T, flush=True)
            time.sleep(8)        # Overpass e' di tutti: si respira
        print('')
        print('TOTALE: %d luoghi arricchiti da OpenStreetMap' % T)
        sys.exit(0)
    n = [float(x) for x in sys.argv[1:5]] if len(sys.argv) >= 5 else None
    if not n:
        print('dimmi un riquadro: la1 la2 lo1 lo2, oppure --tutta')
        sys.exit(1)
    faiIlRiquadro('riquadro', n[0], n[1], n[2], n[3])
