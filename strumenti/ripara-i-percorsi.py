#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RIPARA I PERCORSI A PIEDI — Yourbea, 16/10/2026
================================================================
Il controllo di tutta l'Italia (strumenti/controlla-tutto.py) ha trovato
tre guai nei 137 percorsi, e Vince ha detto di cominciare da qui.

NON era un guaio, e va detto: le misure. «metri» viene da Valhalla ed è la
strada VERA a piedi, che è sempre più lunga della linea d'aria fra le tappe:
il rapporto sta fra 1,07 e 3,56, mediana 1,59, e nessun percorso dichiara
meno della linea d'aria. Il primo controllo le aveva segnate come sbagliate
perché confrontava due misure diverse.

I GUAI VERI, e come si riparano:
1. TAPPE SOVRAPPOSTE. «Fontana dei Quattro Fiumi» e «Piazza Navona» a due
   metri l'una dall'altra sono due fermate per lo stesso posto: chi cammina
   sente due volte «ci siamo». Si tiene quella che ha più da raccontare.
2. SALTI LUNGHI, e sono il sintomo, non la malattia. Le tappe erano
   nell'ordine in cui erano state trovate, non in ordine di cammino: un giro
   che va avanti e torna indietro fa salti da un chilometro fra due posti
   che distano trecento metri. Si rimettono in ordine di cammino, e la
   maggior parte dei salti sparisce da sola.
3. QUELLO CHE RESTA FUORI REGOLA. Se dopo il riordino un salto supera i 500
   metri (PASSO_MAX dello script che li fa) il giro si taglia: si tiene il
   tratto più lungo che la regola rispetta. Un «giro a piedi» di 17 chilometri
   non è un giro a piedi, e lasciarlo lì è peggio che accorciarlo.

NIENTE SI INVENTA: non si aggiungono tappe, non si spostano coordinate, non
si scrivono titoli nuovi se non quando una tappa nominata nel titolo è stata
tagliata — e allora il titolo si rifà con la stessa regola di chi li ha
scritti (le tre tappe più importanti, in ordine di cammino).

Si lancia:
    python3 -I strumenti/ripara-i-percorsi.py            (guarda e dice)
    python3 -I strumenti/ripara-i-percorsi.py --scrivi   (ripara davvero)
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
LUOGHI = os.path.join(QUI, 'nuova', 'dati', 'luoghi.json')

PASSO_MAX = 500        # metri fra due tappe di fila, come in fai-i-giri.py
A_PIEDI_MAX = 4000     # metri di strada vera: oltre, non è un giro a piedi
# la strada vera è in mediana 1,6 volte la linea d'aria (misurato sui 137
# percorsi: da 1,07 a 3,56). Per decidere quanto accorciare si guarda la
# linea d'aria, che non costa una chiamata a Valhalla per ogni tentativo;
# poi la misura vera si chiede una volta sola, alla fine, e se è ancora
# troppa lo si scrive nel rapporto invece di accorciare alla cieca.
LIMITE_ARIA = round(A_PIEDI_MAX / 1.6)
SALTO_DA_GUARDARE = 900   # oltre, lo si riferisce; non lo si taglia
# E NON SI ACCORCIA UN GIRO SOLO PERCHE' E' LUNGO. Seconda cosa che i numeri
# mi hanno smentito: col limite dei 4000 metri, «Roma — il barocco lungo»
# passava da 29 tappe a 16. Quel giro e' lungo DI PROPOSITO, e A_PIEDI_MAX e'
# la regola di chi fa i giri nuovi, non il metro per giudicare quelli scritti
# a mano. Si accorcia solo quello che davvero non si cammina — un «giro a
# piedi» da diciassette chilometri — e tutto il resto si riferisce.
NON_SI_CAMMINA = 6000     # metri in linea d'aria: oltre, non e' un giro a piedi
SOVRAPPOSTE = 25       # sotto questi metri sono la stessa fermata

SCRIVI = '--scrivi' in sys.argv


def dist(a1, o1, a2, o2):
    r = math.pi / 180
    a = (math.sin((a2 - a1) * r / 2) ** 2 +
         math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2)
    return 2 * 6371000 * math.asin(math.sqrt(a))


def lunghezza(t):
    return sum(dist(t[i]['la'], t[i]['lo'], t[i + 1]['la'], t[i + 1]['lo'])
               for i in range(len(t) - 1))


def salto_piu_lungo(t):
    if len(t) < 2:
        return 0
    return max(dist(t[i]['la'], t[i]['lo'], t[i + 1]['la'], t[i + 1]['lo'])
               for i in range(len(t) - 1))


# ---------- la strada vera, da Valhalla ----------
def decodi(s, prec=6):
    """la linea compressa di Valhalla: la stessa funzione di fai-i-giri.py"""
    punti, i, lat, lon = [], 0, 0, 0
    f = 10.0 ** prec
    while i < len(s):
        for quale in (0, 1):
            turno, risultato = 0, 0
            while True:
                b = ord(s[i]) - 63
                i += 1
                risultato |= (b & 0x1f) << turno
                turno += 5
                if b < 0x20:
                    break
            d = ~(risultato >> 1) if (risultato & 1) else (risultato >> 1)
            if quale == 0:
                lat += d
            else:
                lon += d
        punti.append([round(lat / f, 6), round(lon / f, 6)])
    return punti


def valhalla(punti, prove=3):
    corpo = json.dumps({
        'locations': [{'lat': round(p[0], 5), 'lon': round(p[1], 5)} for p in punti],
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
            trip = d.get('trip') or {}
            if not trip.get('legs'):
                return None, None
            linea = []
            for leg in trip['legs']:
                linea.extend(decodi(leg.get('shape') or ''))
            return linea, round((trip.get('summary') or {}).get('length', 0) * 1000)
        except Exception as e:
            if tentativo + 1 == prove:
                print('   Valhalla non risponde: %s' % str(e)[:60], file=sys.stderr)
                return None, None
            time.sleep(3)
        finally:
            if dove:
                try:
                    os.unlink(dove)
                except OSError:
                    pass
    return None, None


# ---------- 1. le tappe sovrapposte ----------
def togli_sovrapposte(t, schede):
    """Due fermate per lo stesso posto: si tiene quella che ha più da
    raccontare. Non si media niente e non si inventa un nome nuovo."""
    def quanto_racconta(tp):
        s = schede.get(tp['n'].lower())
        if not s:
            return (0, 0, 0)
        return (s.get('k') or 1, 1 if s.get('a') else 0, len(s.get('d') or ''))

    fuori = []
    tenute = []
    for tp in t:
        gemella = None
        for altra in tenute:
            if dist(tp['la'], tp['lo'], altra['la'], altra['lo']) < SOVRAPPOSTE:
                gemella = altra
                break
        if gemella is None:
            tenute.append(tp)
            continue
        if quanto_racconta(tp) > quanto_racconta(gemella):
            tenute[tenute.index(gemella)] = tp
            fuori.append(gemella['n'])
        else:
            fuori.append(tp['n'])
    return tenute, fuori


# ---------- 2. l'ordine di cammino ----------
def in_ordine_di_cammino(t):
    """Il più vicino di volta in volta, provando ogni partenza, e poi 2-opt:
    con dieci o dodici tappe è esatto quanto serve e dura un attimo. Non
    cambia NIENTE del contenuto: solo l'ordine in cui si incontrano."""
    if len(t) < 3:
        return t
    migliore, suo_costo = t, lunghezza(t)
    for p in range(len(t)):
        resto = list(t)
        catena = [resto.pop(p)]
        while resto:
            ultimo = catena[-1]
            k = min(range(len(resto)),
                    key=lambda j: dist(ultimo['la'], ultimo['lo'], resto[j]['la'], resto[j]['lo']))
            catena.append(resto.pop(k))
        # 2-opt: si rigira un pezzo se accorcia
        migliorato = True
        while migliorato:
            migliorato = False
            for i in range(len(catena) - 1):
                for j in range(i + 2, len(catena)):
                    nuova = catena[:i + 1] + catena[i + 1:j + 1][::-1] + catena[j + 1:]
                    if lunghezza(nuova) < lunghezza(catena) - 0.5:
                        catena = nuova
                        migliorato = True
        c = lunghezza(catena)
        if c < suo_costo - 0.5:
            migliore, suo_costo = catena, c
    return migliore


# ---------- 3. accorciare, ma solo quello che non si cammina ----------
def accorcia(t, limite_aria):
    """PRIMA VERSIONE SBAGLIATA, e i numeri l'hanno detto subito: tenevo il
    tratto di fila più lungo senza salti sopra i 500 metri, e «Roma — scale e
    scalinate» passava da 6060 a 104 metri. Un giro di cento metri non è un
    giro: il rimedio era peggio del guaio.

    PASSO_MAX = 500 è la regola di chi FA i giri nuovi, non il metro per
    giudicare quelli scritti a mano: fra due monumenti, novecento metri di
    strada sono una passeggiata, non un difetto. Quello che davvero non si
    cammina è un giro da diciassette chilometri.

    Quindi: si toglie una tappa per volta — quella che accorcia di più il
    cammino, cioè la più fuori mano — finché il giro sta nel limite. E non si
    scende sotto quattro tappe né sotto la metà di quelle che c'erano: a quel
    punto non è più lo stesso giro, e un giro snaturato si lascia stare e si
    riferisce."""
    minimo = max(4, math.ceil(len(t) * 0.7))
    t = list(t)
    while lunghezza(t) > limite_aria and len(t) > minimo:
        # quale tappa, togliendola, accorcia di più
        scelta, meglio = None, None
        for i in range(len(t)):
            resto = t[:i] + t[i + 1:]
            q = lunghezza(resto)
            if meglio is None or q < meglio:
                scelta, meglio = i, q
        t.pop(scelta)
    return t


# ---------- il titolo, se una tappa nominata è stata tagliata ----------
def corto(nome):
    for via in ('Basilica di ', 'Chiesa di ', 'Cattedrale di ', 'Complesso di ', 'Museo di '):
        if nome.startswith(via):
            return nome[len(via):]
    return nome


def titolo_di(citta, catena, schede):
    def peso(tp):
        s = schede.get(tp['n'].lower()) or {}
        return (-(s.get('k') or 1), 0 if s.get('a') else 1, -len(s.get('d') or ''))
    grosse = sorted(catena, key=peso)[:3]
    grosse = [p for p in catena if p in grosse]
    nomi = [corto(p['n']) for p in grosse]
    if len(nomi) >= 3:
        return '%s — %s, %s e %s' % (citta, nomi[0], nomi[1], nomi[2])
    if len(nomi) == 2:
        return '%s — %s e %s' % (citta, nomi[0], nomi[1])
    return '%s — %s' % (citta, nomi[0]) if nomi else citta


def main():
    giri = json.load(io.open(PERCORSI, encoding='utf-8'))
    luoghi = json.load(io.open(LUOGHI, encoding='utf-8'))
    schede = {}
    for x in luoghi:
        if x.get('n'):
            schede[x['n'].lower()] = x

    print('RIPARAZIONE DEI PERCORSI A PIEDI%s' % ('' if SCRIVI else '  (solo guardo: aggiungi --scrivi)'))
    print('=' * 70)

    nuovi = []
    conti = {'intatti': 0, 'sovrapposte': 0, 'riordinati': 0, 'tagliati': 0,
             'buttati': 0, 'senza strada': 0, 'da guardare': 0}
    da_rifare = []

    for g in giri:
        t = list(g.get('t') or [])
        nome = g.get('n', '?')
        if len(t) < 2:
            print('BUTTATO (meno di due tappe): %s' % nome)
            conti['buttati'] += 1
            continue

        prima_salto = salto_piu_lungo(t)
        prima_metri = g.get('metri') or 0
        # si mette mano quando c'e' un motivo: una misura che non corrisponde
        # alle tappe, un salto fuori mano, o un giro che non si cammina
        rotto = (lunghezza(t) > NON_SI_CAMMINA or prima_salto > SALTO_DA_GUARDARE)
        t2, fuori = togli_sovrapposte(t, schede)
        if fuori:
            conti['sovrapposte'] += 1
            print('SOVRAPPOSTE  %s' % nome)
            for f in fuori:
                print('             togliere: %s (stesso punto di un\'altra tappa)' % f)
        if not rotto and not fuori:
            conti['intatti'] += 1
            nuovi.append(g)
            continue

        t3 = in_ordine_di_cammino(t2)
        riordinato = [x['n'] for x in t3] != [x['n'] for x in t2]
        if riordinato:
            conti['riordinati'] += 1
        t4 = accorcia(t3, NON_SI_CAMMINA) if lunghezza(t3) > NON_SI_CAMMINA else t3
        tagliate = [x['n'] for x in t3 if x not in t4]
        if tagliate:
            conti['tagliati'] += 1

        print('%-10s %s' % ('RIPARATO', nome))
        print('             %d tappe → %d;  salto piu lungo %d → %d m%s'
              % (len(t), len(t4), prima_salto, salto_piu_lungo(t4),
                 ';  riordinato in ordine di cammino' if riordinato else ''))
        for c in tagliate:
            print('             tagliata (la piu fuori mano): %s' % c)
        if salto_piu_lungo(t4) > SALTO_DA_GUARDARE:
            print('             DA GUARDARE A MANO: resta un salto di %d m'
                  % salto_piu_lungo(t4))
            conti['da guardare'] += 1

        g2 = dict(g)
        g2['t'] = t4
        # il titolo non deve nominare una tappa che non c'e' piu'
        if tagliate and any(corto(c) in g.get('n', '') for c in tagliate):
            g2['n'] = titolo_di(g.get('citta', ''), t4, schede)
            print('             titolo rifatto: %s' % g2['n'])
        da_rifare.append(g2)
        nuovi.append(g2)

    # ---- la strada vera per quelli cambiati ----
    if da_rifare:
        print('')
        print('LA STRADA VERA, da Valhalla, per i %d percorsi cambiati' % len(da_rifare))
        for i, g2 in enumerate(da_rifare, 1):
            linea, metri = valhalla([[tp['la'], tp['lo']] for tp in g2['t']])
            if not linea or not metri:
                conti['senza strada'] += 1
                print('   %2d/%d  NIENTE STRADA: %s (resta la misura di prima)'
                      % (i, len(da_rifare), g2.get('n', '?')[:50]))
                continue
            vecchi = g2.get('metri')
            g2['p'] = linea
            g2['metri'] = metri
            print('   %2d/%d  %-46s %5d → %5d m' % (i, len(da_rifare), g2.get('n', '?')[:46], vecchi or 0, metri))
            if metri > A_PIEDI_MAX:
                print('          ATTENZIONE: a piedi sono ancora %d m' % metri)
            time.sleep(1.1)        # il servizio è gratis: non si martella

    print('')
    print('=' * 70)
    print('ERANO %d, RESTANO %d' % (len(giri), len(nuovi)))
    for k in ('intatti', 'sovrapposte', 'riordinati', 'tagliati', 'buttati',
              'senza strada', 'da guardare'):
        print('   %-14s %d' % (k, conti[k]))

    if SCRIVI:
        with io.open(PERCORSI, 'w', encoding='utf-8') as f:
            json.dump(nuovi, f, ensure_ascii=False, separators=(',', ':'))
        print('')
        print('SCRITTO: %s' % PERCORSI)
    else:
        print('')
        print('Niente scritto. Per riparare davvero: --scrivi')
    return 0


if __name__ == '__main__':
    sys.exit(main())
