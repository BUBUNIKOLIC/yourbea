#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CONTROLLA I SALTI NEI PERCORSI — Yourbea, 20/10/2026
================================================================
Il controllo di tutta l'Italia segnala 31 salti sopra i 900 metri fra due
tappe. Guardandoli a occhio, molti NON sono errori:
  «Chiesa di San Michele in Isola» a Venezia e' su un'isola — ci si va in
  vaporetto; le «Bocche del 1861» stanno sul Vesuvio; il «Piazzale
  Seggiovia» e' la seggiovia.
Un salto lungo puo' essere tre cose diverse, e vanno distinte:
  1. UNA CAMMINATA LUNGA MA VERA: fra due monumenti ci sono ottocento
     metri di strada. Va bene, si dice e basta.
  2. UN TRATTO CHE NON SI CAMMINA: acqua di mezzo, una funivia, una strada
     che a piedi non esiste. Valhalla o non lo sa fare, o lo fa fare lungo
     il triplo. Chi cammina deve SAPERLO prima di partire.
  3. UNA COORDINATA SBAGLIATA: la tappa non e' dove dice.
Questo file chiede a Valhalla, per ogni salto, la strada vera a piedi, e
dice in quale dei tre casi siamo. Non scrive niente: guarda e riferisce.

   python3 -I strumenti/controlla-i-salti.py
"""

import io
import json
import math
import os
import subprocess
import sys
import tempfile
import time

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERCORSI = os.path.join(QUI, 'nuova', 'dati', 'passeggiate.json')
SALTO = 700          # sotto questo non si guarda nemmeno


def dist(a1, o1, a2, o2):
    r = math.pi / 180
    a = (math.sin((a2 - a1) * r / 2) ** 2 +
         math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2)
    return 2 * 6371000 * math.asin(math.sqrt(a))


def aPiedi(da, a, prove=3):
    """La strada vera fra due punti. (metri, None) oppure (None, perche')."""
    corpo = json.dumps({
        'locations': [{'lat': round(da[0], 5), 'lon': round(da[1], 5)},
                      {'lat': round(a[0], 5), 'lon': round(a[1], 5)}],
        'costing': 'pedestrian',
        'directions_options': {'language': 'it-IT', 'units': 'kilometers'}
    }).encode('utf-8')
    for tentativo in range(prove):
        dove = None
        try:
            with tempfile.NamedTemporaryFile('wb', suffix='.json', delete=False) as f:
                f.write(corpo)
                dove = f.name
            fuori = subprocess.run(
                ['curl', '-s', '-m', '40', '-X', 'POST', '-H', 'Content-Type: application/json',
                 '-A', 'Yourbea/1.0 (giri a tappe)', '--data', '@' + dove,
                 'https://valhalla1.openstreetmap.de/route'],
                capture_output=True, text=True, timeout=60)
            d = json.loads(fuori.stdout)
            if d.get('error'):
                return None, d.get('error')
            trip = d.get('trip') or {}
            if not trip.get('legs'):
                return None, 'nessun percorso'
            return round((trip.get('summary') or {}).get('length', 0) * 1000), None
        except Exception as e:
            if tentativo + 1 == prove:
                return None, str(e)[:50]
            time.sleep(3)
        finally:
            if dove:
                try:
                    os.unlink(dove)
                except OSError:
                    pass
    return None, 'non risponde'


def main():
    giri = json.load(io.open(PERCORSI, encoding='utf-8'))
    conti = {'cammina': 0, 'non si cammina': 0, 'da guardare': 0}
    print('I SALTI SOPRA I %d METRI, chiesti a Valhalla uno per uno' % SALTO)
    print('=' * 72)
    for g in giri:
        t = g.get('t') or []
        for i in range(len(t) - 1):
            a, b = t[i], t[i + 1]
            aria = dist(a['la'], a['lo'], b['la'], b['lo'])
            if aria < SALTO:
                continue
            strada, guaio = aPiedi((a['la'], a['lo']), (b['la'], b['lo']))
            time.sleep(1.1)
            dove = '%s: da %s a %s' % (g.get('citta', '?'), a['n'][:26], b['n'][:26])
            if strada is None:
                conti['non si cammina'] += 1
                print('NON SI CAMMINA  %s' % dove)
                print('                %d m in linea d\'aria — Valhalla: %s' % (aria, guaio))
                continue
            rapporto = strada / aria if aria else 0
            if rapporto > 3:
                conti['non si cammina'] += 1
                print('GIRO ENORME     %s' % dove)
                print('                %d m in linea, %d m a piedi (%.1f volte)' % (aria, strada, rapporto))
            elif strada > 1500:
                conti['da guardare'] += 1
                print('LUNGO           %s' % dove)
                print('                %d m a piedi' % strada)
            else:
                conti['cammina'] += 1
                print('si cammina      %s (%d m a piedi)' % (dove, strada))
    print('')
    print('=' * 72)
    for k in conti:
        print('   %-18s %d' % (k, conti[k]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
