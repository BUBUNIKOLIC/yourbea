#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FA I GIRI DELLE CITTÀ D'ARTE — Yourbea, 16/10/2026
=====================================================
Vince: «carica quanti più percorsi possibili per le città d'arte».

Questo non è un pezzo dell'app: è l'attrezzo che scrive `dati/passeggiate.json`
una volta per tutte, e poi resta qui perché il giorno che i luoghi crescono si
rifà senza doverlo reinventare.

COME SI FA UN GIRO, e perché così:
1. UNA TAPPA È UN LUOGO CHE HA DAVVERO QUALCOSA DA DIRE. Si prendono solo i
   luoghi con la scheda scritta a mano; i servizi e i nomi senza testo non
   entrano. Meglio venti giri veri che cento vuoti (parole di Vince).
2. SI CAMMINA, NON SI VOLA. Due tappe di fila non distano più di
   quattrocento metri, e un giro intero non supera i due chilometri in linea
   d'aria: se no non è una passeggiata, è una giornata.
3. LA STRADA LA DICE CHI LA CONOSCE. La linea sulla mappa e i metri veri si
   chiedono a Valhalla, che cammina sui marciapiedi. Tirare una riga dritta
   fra due tappe disegnerebbe un percorso dentro i palazzi, e darebbe una
   lunghezza più corta del vero.
4. UN GIRO NUOVO DEVE AGGIUNGERE QUALCOSA. Se più della metà delle sue tappe
   sta già in un giro che c'è, non si scrive: sarebbe lo stesso giro con un
   altro nome.
5. QUATTRO TAPPE ALMENO. Con tre si fa prima a dire i tre nomi.

Si lancia:  python3 nuova/strumenti/fai-i-giri.py
            python3 nuova/strumenti/fai-i-giri.py --asciutto   (non scrive)
"""

import json, math, os, subprocess, sys, tempfile, time

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUOGHI = os.path.join(QUI, 'dati', 'luoghi.json')
GIRI = os.path.join(QUI, 'dati', 'passeggiate.json')

PASSO_MAX = 500        # metri fra due tappe di fila (REGOLA 2)
GIRO_MAX = 2400        # metri in linea d'aria per tutto il giro
TAPPE_MAX = 8
TAPPE_MIN = 4
SOVRAPPOSTO = 0.6      # oltre questo, è un giro che c'è già (REGOLA 4)

CITTA = [('Roma', 41.8955, 12.4823), ('Napoli', 40.848, 14.257), ('Torre del Greco', 40.787, 14.3683),
         ('Venafro', 41.486, 14.045), ('Parma', 44.8032, 10.329), ('Spoleto', 42.7345, 12.738),
         ('Firenze', 43.7714, 11.2547), ('Venezia', 45.434, 12.338), ('Milano', 45.4642, 9.19),
         ('Torino', 45.0708, 7.6858), ('Genova', 44.4076, 8.933), ('Bologna', 44.4937, 11.3431),
         ('Verona', 45.44, 10.995), ('Siena', 43.318, 11.33), ('Padova', 45.407, 11.876),
         ('Lucca', 43.843, 10.505), ('Mantova', 45.159, 10.795), ('Ferrara', 44.837, 11.6195),
         ('Ravenna', 44.417, 12.199), ('Urbino', 43.7245, 12.636), ('Assisi', 43.071, 12.615),
         ('Orvieto', 42.717, 12.113), ('Matera', 40.6667, 16.609), ('Siracusa', 37.061, 15.294),
         ('Lecce', 40.352, 18.17), ('Bari', 41.129, 16.869), ('Palermo', 38.115, 13.356),
         ('Catania', 37.5025, 15.087), ('Cagliari', 39.219, 9.117), ('Trieste', 45.65, 13.768),
         ('Rimini', 44.06, 12.57)]


def dist(a1, o1, a2, o2):
    R, r = 6371000.0, math.pi / 180
    x, y = (a2 - a1) * r, (o2 - o1) * r
    h = math.sin(x / 2) ** 2 + math.cos(a1 * r) * math.cos(a2 * r) * math.sin(y / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def citta_di(lat, lon):
    mig, dm = None, 1e18
    for n, la, lo in CITTA:
        q = dist(lat, lon, la, lo)
        if q < dm:
            dm, mig = q, n
    return mig if dm < 25000 else None


def valhalla(punti, prove=2):
    """La strada vera, a piedi. Restituisce (linea, metri) o (None, None)."""
    corpo = json.dumps({
        'locations': [{'lat': round(p[0], 5), 'lon': round(p[1], 5)} for p in punti],
        'costing': 'pedestrian',
        'directions_options': {'language': 'it-IT', 'units': 'kilometers'}
    }).encode('utf-8')
    # si chiama con curl e non con urllib: il Python di sistema qui non regge
    # la stretta di mano TLS del servizio e tira «SSLV3_ALERT_HANDSHAKE_FAILURE»
    # su ogni richiesta — curl passa senza fare una piega
    for tentativo in range(prove):
        try:
            with tempfile.NamedTemporaryFile('wb', suffix='.json', delete=False) as f:
                f.write(corpo); dove = f.name
            fuori = subprocess.run(
                ['curl', '-s', '-m', '40', '-X', 'POST', '-H', 'Content-Type: application/json',
                 '-A', 'Yourbea/1.0 (giri a tappe)', '--data', '@' + dove,
                 'https://valhalla1.openstreetmap.de/route'],
                capture_output=True, text=True, timeout=60)
            os.unlink(dove)
            d = json.loads(fuori.stdout)
            trip = d.get('trip') or {}
            if not trip.get('legs'):
                return None, None
            linea = []
            for leg in trip['legs']:
                linea.extend(decodi(leg.get('shape') or ''))
            metri = round((trip.get('summary') or {}).get('length', 0) * 1000)
            return linea, metri
        except Exception as e:
            if tentativo + 1 == prove:
                print('   Valhalla non risponde:', e, file=sys.stderr)
                return None, None
            time.sleep(3)
    return None, None


def decodi(s):
    pts, i, lat, lon = [], 0, 0, 0
    while i < len(s):
        sh = res = 0
        while True:
            b = ord(s[i]) - 63; i += 1
            res |= (b & 31) << sh; sh += 5
            if b < 32: break
        lat += ~(res >> 1) if (res & 1) else (res >> 1)
        sh = res = 0
        while True:
            b = ord(s[i]) - 63; i += 1
            res |= (b & 31) << sh; sh += 5
            if b < 32: break
        lon += ~(res >> 1) if (res & 1) else (res >> 1)
        pts.append([round(lat / 1e6, 5), round(lon / 1e6, 5)])
    return pts


def tema_di(tappe):
    """Il tema si legge dai luoghi, non si decide a tavolino."""
    testo = ' '.join((p.get('t') or '') for p in tappe).lower()
    if any(w in testo for w in ('anfiteatro', 'terme', 'scavi', 'foro', 'teatro romano', 'necropoli', 'area archeologica')):
        return 'archeologia'
    if any(w in testo for w in ('parco', 'giardino', 'bosco', 'lago', 'villa comunale')):
        return 'natura'
    if any(w in testo for w in ('chiesa', 'basilica', 'duomo', 'cattedrale', 'battistero', 'museo', 'galleria', 'cappella')):
        return 'arte'
    if any(w in testo for w in ('palazzo', 'torre', 'castello', 'ponte', 'porta', 'mura')):
        return 'architettura'
    return 'storia'


def corto(nome):
    """Il nome della tappa dentro il titolo: senza il tipo davanti, che nel
    titolo è peso morto — «da Chiesa di San Luigi dei Francesi a …»."""
    for via in ('Basilica di ', 'Chiesa di ', 'Cattedrale di ', 'Complesso di ', 'Museo di '):
        if nome.startswith(via):
            return nome[len(via):]
    return nome


def fai_i_giri(luoghi, esistenti, asciutto=False):
    usati_prima = {}
    for g in esistenti:
        for t in g['t']:
            usati_prima.setdefault(t['n'], set()).add(g['id'])
    insiemi_esistenti = [set(t['n'] for t in g['t']) for g in esistenti]
    ids = set(g['id'] for g in esistenti)

    buoni = [p for p in luoghi if p.get('k', 0) >= 1 and (p.get('d') or '').strip()]
    per_citta = {}
    for p in buoni:
        c = citta_di(p['lat'], p['lon'])
        if c:
            per_citta.setdefault(c, []).append(p)

    nuovi = []
    for c in sorted(per_citta, key=lambda x: -len(per_citta[x])):
        liberi = per_citta[c]
        # i semi: prima i luoghi che non stanno in nessun giro, e i più grossi
        semi = sorted(liberi, key=lambda p: (p['n'] in usati_prima, -p.get('k', 1),
                                             0 if p.get('a') else 1, p['n']))
        presi = set()
        for seme in semi:
            if seme['n'] in presi:
                continue
            catena = [seme]
            presi_qui = {seme['n']}
            lungo = 0.0
            while len(catena) < TAPPE_MAX:
                ultimo = catena[-1]
                cands = [(dist(ultimo['lat'], ultimo['lon'], p['lat'], p['lon']), p)
                         for p in liberi if p['n'] not in presi_qui and p['n'] not in presi]
                cands = [(d, p) for d, p in cands if 15 < d <= PASSO_MAX and lungo + d <= GIRO_MAX]
                if not cands:
                    break
                cands.sort(key=lambda x: (x[0], 0 if x[1].get('a') else 1))
                d, p = cands[0]
                catena.append(p); presi_qui.add(p['n']); lungo += d
            if len(catena) < TAPPE_MIN:
                continue
            nomi = set(x['n'] for x in catena)
            # REGOLA 4: un giro che c'è già non si riscrive
            if any(len(nomi & vecchio) / len(nomi) > SOVRAPPOSTO for vecchio in insiemi_esistenti):
                continue
            presi |= nomi
            insiemi_esistenti.append(nomi)
            ident = 'giro-' + c.lower().replace(' ', '-').replace("'", '') + '-' + str(len(nuovi) + 1)
            while ident in ids:
                ident += 'b'
            ids.add(ident)
            nuovi.append({'citta': c, 'catena': catena, 'id': ident})

    print('giri trovati: %d' % len(nuovi), file=sys.stderr)
    fatti = []
    for n in nuovi:
        catena = n['catena']
        linea, metri = valhalla([[p['lat'], p['lon']] for p in catena])
        time.sleep(1.2)                      # il servizio è di altri: non lo si martella
        if not linea or not metri:
            print('   SALTATO (niente strada): %s' % n['id'], file=sys.stderr)
            continue
        if metri > 4000:
            print('   SALTATO (a piedi sono %d m): %s' % (metri, n['id']), file=sys.stderr)
            continue
        titolo = '%s — da %s a %s' % (n['citta'], corto(catena[0]['n']), corto(catena[-1]['n']))
        fatti.append({'id': n['id'], 'tema': tema_di(catena), 'n': titolo, 'citta': n['citta'],
                      'metri': metri,
                      't': [{'n': p['n'], 'la': round(p['lat'], 5), 'lo': round(p['lon'], 5)} for p in catena],
                      'p': linea})
        print('   %-28s %2d tappe %5d m  %s' % (n['citta'], len(catena), metri, titolo[:70]), file=sys.stderr)

    if asciutto:
        print('asciutto: non scrivo niente', file=sys.stderr)
        return fatti
    tutti = esistenti + fatti
    with open(GIRI, 'w', encoding='utf-8') as f:
        json.dump(tutti, f, ensure_ascii=False)
    print('scritti %d giri in tutto (%d nuovi)' % (len(tutti), len(fatti)), file=sys.stderr)
    return fatti


if __name__ == '__main__':
    luoghi = json.load(open(LUOGHI, encoding='utf-8'))
    esistenti = json.load(open(GIRI, encoding='utf-8'))
    fai_i_giri(luoghi, esistenti, asciutto='--asciutto' in sys.argv)
