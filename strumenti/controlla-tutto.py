#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CONTROLLA TUTTA L'ITALIA — Yourbea, 16/10/2026
================================================================
«Ora fai tutti i controlli possibili in tutta Italia, percorsi, dati ecc.,
e vediamo come siamo messi» (Vince).

Serve perche' un difetto nei dati non si vede provando l'app in una strada:
il 15/10 Roma aveva i negozi e ZERO monumenti — la richiesta a Wikidata era
andata in timeout e lo script era andato avanti zitto. L'ha trovato Vince
chiedendo «verificato?». Questo file e' la risposta a quella domanda, per
tutte le citta' in una volta.

Si lancia:  python3 -I strumenti/controlla-tutto.py
Non scrive niente: guarda e riferisce.
"""

import io
import json
import math
import os
import re
import sys
from collections import defaultdict

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATI = os.path.join(QUI, 'nuova', 'dati')
CITTA = os.path.join(QUI, 'strumenti', 'citta-italiane.txt')

# l'Italia, generosa: Lampedusa sta a 35.49, il Brennero a 47.09
IT = (35.2, 47.2, 6.4, 18.8)

guai = defaultdict(list)          # tipo -> [descrizione]
def guaio(tipo, cosa):
    guai[tipo].append(cosa)

def dist(la1, lo1, la2, lo2):
    r = math.pi / 180
    a = (math.sin((la2 - la1) * r / 2) ** 2 +
         math.cos(la1 * r) * math.cos(la2 * r) * math.sin((lo2 - lo1) * r / 2) ** 2)
    return 2 * 6371000 * math.asin(math.sqrt(a))

# ----- i testi rotti: come si riconoscono -----
MOJIBAKE = re.compile(r'Ã[\x80-\xbf]|â€|Â[\xa0-\xbf]|�')
HTML = re.compile(r'<[a-z/][^>]{0,40}>|&[a-z]{2,8};|&#\d+;')
WIKI = re.compile(r'\[\[|\]\]|\{\{|\}\}|==\s*[A-Z]|<ref')

def controlla_testo(dove, campo, t):
    if not isinstance(t, str):
        return
    if MOJIBAKE.search(t):
        guaio('testo con accenti rotti', dove + ' / ' + campo + ': ' + t[:70])
    if HTML.search(t):
        guaio('testo con HTML dentro', dove + ' / ' + campo + ': ' + HTML.search(t).group(0) + ' in ' + t[:50])
    if WIKI.search(t):
        guaio('testo con codice di Wikipedia', dove + ' / ' + campo + ': ' + t[:70])
    if t != t.strip():
        guaio('testo con spazi ai bordi', dove + ' / ' + campo)
    if '  ' in t:
        guaio('testo con spazi doppi', dove + ' / ' + campo + ': ' + t[:60])

# ============================================================
# 1. I QUADRETTI
# ============================================================
def nome_quadretto(lat, lon):
    return '%04d_%04d' % (math.floor(lat * 100), math.floor(lon * 100))

def controlla_quadretti(cartella, etichetta):
    strada = os.path.join(DATI, cartella)
    if not os.path.isdir(strada):
        guaio('cartella che non c\'e\'', strada)
        return {}, 0
    per_quadretto = {}
    punti_totali = 0
    for f in sorted(os.listdir(strada)):
        if not f.endswith('.json'):
            continue
        q = f[:-5]
        dove = etichetta + '/' + q
        if not re.match(r'^\d{4}_\d{4}$', q):
            guaio('quadretto col nome strano', dove)
            continue
        p = os.path.join(strada, f)
        try:
            d = json.load(io.open(p, encoding='utf-8'))
        except Exception as e:
            guaio('quadretto che non si legge', dove + ': ' + str(e)[:60])
            continue
        if not isinstance(d, list):
            guaio('quadretto che non e\' un elenco', dove)
            continue
        if len(d) == 0:
            guaio('quadretto vuoto', dove)
        buoni = []
        visti = []
        for x in d:
            if not isinstance(x, dict):
                guaio('punto che non e\' un punto', dove)
                continue
            n = x.get('n')
            lat, lon = x.get('lat'), x.get('lon')
            if not isinstance(n, str) or not n.strip():
                guaio('punto senza nome', dove)
                continue
            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) \
               or math.isnan(lat) or math.isnan(lon):
                guaio('punto con coordinate non valide', dove + ' / ' + n)
                continue
            if not (IT[0] <= lat <= IT[1] and IT[2] <= lon <= IT[3]):
                guaio('punto fuori dall\'Italia', '%s / %s (%.5f, %.5f)' % (dove, n, lat, lon))
                continue
            atteso = nome_quadretto(lat, lon)
            if atteso != q:
                guaio('punto nel quadretto sbagliato',
                      '%s / %s sta in %s' % (dove, n, atteso))
            if not isinstance(x.get('t'), str) or not x.get('t', '').strip():
                guaio('punto senza che cosa sia', dove + ' / ' + n)
            controlla_testo(dove, 'nome', n)
            k = x.get('k')
            if k is not None and (not isinstance(k, int) or k < 0 or k > 3):
                guaio('k fuori dai valori buoni (0-3)', dove + ' / ' + n + ': ' + repr(k))
            # doppioni dentro lo stesso quadretto
            for (n2, la2, lo2) in visti:
                if n2.lower() == n.lower() and dist(lat, lon, la2, lo2) < 15:
                    guaio('doppione nello stesso quadretto', dove + ' / ' + n)
                    break
            visti.append((n, lat, lon))
            buoni.append(x)
        per_quadretto[q] = buoni
        punti_totali += len(buoni)
    return per_quadretto, punti_totali

# ============================================================
# 2. LE SCHEDE (luoghi.json)
# ============================================================
def controlla_luoghi():
    p = os.path.join(DATI, 'luoghi.json')
    try:
        d = json.load(io.open(p, encoding='utf-8'))
    except Exception as e:
        guaio('luoghi.json non si legge', str(e)[:80])
        return []
    visti = []
    for x in d:
        n = x.get('n', '')
        dove = 'luoghi.json / ' + (n or '(senza nome)')
        if not n.strip():
            guaio('luogo senza nome', 'luoghi.json')
            continue
        lat, lon = x.get('lat'), x.get('lon')
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            guaio('luogo con coordinate non valide', dove)
            continue
        if not (IT[0] <= lat <= IT[1] and IT[2] <= lon <= IT[3]):
            guaio('luogo fuori dall\'Italia', '%s (%.5f, %.5f)' % (dove, lat, lon))
        k = x.get('k')
        if not isinstance(k, int) or k < 0 or k > 3:
            guaio('k fuori dai valori buoni (0-3)', dove + ': ' + repr(k))
        for campo in ('n', 't', 'd', 'i', 'a', 'y'):
            if campo in x:
                controlla_testo(dove, campo, x[campo])
        scheda = x.get('d', '')
        if k and k >= 1:
            if not isinstance(scheda, str) or len(scheda.strip()) < 60:
                guaio('luogo senza scheda vera (meno di 60 lettere)', dove)
            elif not scheda.rstrip().endswith(('.', '!', '?', '»', '"')):
                guaio('scheda che finisce a meta\'', dove + ': …' + scheda.rstrip()[-50:])
        # QUINDICI METRI, NON CINQUANTA. A cinquanta, «Attraversamento di
        # Via Laurentina» risultava doppio sei volte: ma sono sei
        # attraversamenti VERI, uno per incrocio lungo la stessa via.
        # Cancellarli sarebbe stato togliere a chi non vede cinque posti
        # dove si puo' passare.
        for (n2, la2, lo2) in visti:
            if n2.lower() == n.lower() and dist(lat, lon, la2, lo2) < 15:
                guaio('luogo doppio', dove)
                break
        visti.append((n, lat, lon))
    return d

# ============================================================
# 3. I PERCORSI (passeggiate.json)
# ============================================================
def controlla_passeggiate():
    p = os.path.join(DATI, 'passeggiate.json')
    try:
        d = json.load(io.open(p, encoding='utf-8'))
    except Exception as e:
        guaio('passeggiate.json non si legge', str(e)[:80])
        return []
    ids = {}
    for g in d:
        nome = g.get('n', '(senza nome)')
        dove = 'percorso «' + nome + '»'
        i = g.get('id')
        citta = g.get('citta', '')
        if not i:
            guaio('percorso senza id', dove)
        elif i in ids:
            guaio('due percorsi con lo stesso id', '%s e %s: %s' % (ids[i], nome, i))
        else:
            ids[i] = nome
        if not citta.strip():
            guaio('percorso senza citta\'', dove)
        if not g.get('tema'):
            guaio('percorso senza tema', dove)
        controlla_testo(dove, 'nome', nome)
        t = g.get('t') or []
        if len(t) < 2:
            guaio('percorso con meno di due tappe', dove + ' (%d)' % len(t))
            continue
        somma = 0.0
        prima = None
        for j, tp in enumerate(t):
            tn = tp.get('n', '')
            la, lo = tp.get('la'), tp.get('lo')
            if not isinstance(tn, str) or not tn.strip():
                guaio('tappa senza nome', dove + ' / tappa %d' % (j + 1))
            if not isinstance(la, (int, float)) or not isinstance(lo, (int, float)):
                guaio('tappa con coordinate non valide', dove + ' / ' + str(tn))
                prima = None
                continue
            if not (IT[0] <= la <= IT[1] and IT[2] <= lo <= IT[3]):
                guaio('tappa fuori dall\'Italia', '%s / %s (%.5f, %.5f)' % (dove, tn, la, lo))
            if prima:
                s = dist(prima[0], prima[1], la, lo)
                somma += s
                # un salto lungo in una passeggiata a piedi: o e' un errore di
                # coordinate, o la passeggiata non si cammina
                if s > 900:
                    guaio('salto troppo lungo fra due tappe',
                          '%s: da %s a %s, %d metri' % (dove, prima[2], tn, s))
                if s < 25:
                    guaio('due tappe nello stesso punto',
                          '%s: %s e %s, %d metri' % (dove, prima[2], tn, s))
            prima = (la, lo, tn)
        # LA MISURA: «metri» e' la strada VERA a piedi, da Valhalla, e la
        # somma qui sopra e' la linea d'aria fra le tappe. La strada e'
        # sempre piu' lunga: misurato sui 137 percorsi, da 1,07 a 3,56 volte,
        # mediana 1,59. Il primo controllo, il 16/10, le aveva segnate come
        # sbagliate confrontando due misure diverse — 91 falsi guai. Si
        # controlla quello che non puo' essere: una strada piu' corta della
        # linea d'aria, o quattro volte piu' lunga.
        dichiarati = g.get('metri')
        if not isinstance(dichiarati, (int, float)) or dichiarati <= 0:
            guaio('percorso senza lunghezza', dove)
        elif somma > 0 and dichiarati < somma * 0.95:
            guaio('strada piu\' corta della linea d\'aria: impossibile',
                  '%s: dice %d metri, in linea d\'aria ne fa %d' % (dove, dichiarati, somma))
        elif somma > 0 and dichiarati > somma * 4:
            guaio('strada quattro volte la linea d\'aria: da guardare',
                  '%s: dice %d metri, in linea d\'aria ne fa %d' % (dove, dichiarati, somma))
        if somma > 6000:
            guaio('percorso troppo lungo per andarci a piedi', '%s: %d metri in linea d\'aria' % (dove, somma))
    return d

# ============================================================
# 4. CITTA' PER CITTA'
# ============================================================
def le_citta():
    citta = []
    for riga in io.open(CITTA, encoding='utf-8'):
        riga = riga.strip()
        if not riga or riga.startswith('#'):
            continue
        p = riga.split()
        if len(p) < 5:
            guaio('riga strana in citta-italiane.txt', riga)
            continue
        citta.append((p[0], float(p[1]), float(p[2]), float(p[3]), float(p[4])))
    return citta

def dentro(lat, lon, c):
    return c[3] <= lat <= c[4] and c[1] <= lon <= c[2]

# ============================================================
def main():
    print('CONTROLLO DI TUTTA L\'ITALIA — i dati di Yourbea')
    print('=' * 64)

    cult, n_cult = controlla_quadretti('cultura', 'cultura')
    neg, n_neg = controlla_quadretti('negozi', 'negozi')
    luoghi = controlla_luoghi()
    giri = controlla_passeggiate()
    citta = le_citta()

    print('')
    print('QUANTO ABBIAMO')
    print('  quadretti di cultura : %5d  con %7d luoghi' % (len(cult), n_cult))
    print('  quadretti di negozi  : %5d  con %7d servizi' % (len(neg), n_neg))
    print('  schede scritte       : %5d' % len(luoghi))
    print('  percorsi a piedi     : %5d  in %d citta\'' % (len(giri), len({g.get('citta') for g in giri})))

    # le schede: quante sono vere
    con_scheda = [x for x in luoghi if isinstance(x.get('d'), str) and len(x['d']) > 200]
    con_vedere = [x for x in luoghi if x.get('i')]
    con_appro = [x for x in luoghi if x.get('a')]
    print('  di cui scheda lunga  : %5d   cosa vedere: %d   approfondimento: %d'
          % (len(con_scheda), len(con_vedere), len(con_appro)))

    # ---- citta' per citta' ----
    print('')
    print('CITTA\' PER CITTA\'')
    print('  %-22s %7s %8s %7s %7s %6s' % ('citta\'', 'quadr.', 'servizi', 'luoghi', 'schede', 'perc.'))
    vuote = []
    for c in citta:
        nome = c[0]
        q_neg = sum(len(v) for k, v in neg.items() if dentro(int(k[:4]) / 100 + 0.005, int(k[5:]) / 100 + 0.005, c))
        q_cul = sum(len(v) for k, v in cult.items() if dentro(int(k[:4]) / 100 + 0.005, int(k[5:]) / 100 + 0.005, c))
        quadr = len({k for k in list(neg) + list(cult)
                     if dentro(int(k[:4]) / 100 + 0.005, int(k[5:]) / 100 + 0.005, c)})
        sch = sum(1 for x in luoghi if dentro(x.get('lat', 0), x.get('lon', 0), c))
        per = sum(1 for g in giri
                  if g.get('t') and dentro(g['t'][0].get('la', 0), g['t'][0].get('lo', 0), c))
        print('  %-22s %7d %8d %7d %7d %6d' % (nome, quadr, q_neg, q_cul, sch, per))
        if q_neg == 0 or q_cul == 0:
            vuote.append((nome, q_neg, q_cul))

    if vuote:
        print('')
        print('CITTA\' A ZERO — il difetto di Roma del 15/10, se torna si vede qui:')
        for nome, a, b in vuote:
            manca = []
            if a == 0: manca.append('servizi')
            if b == 0: manca.append('luoghi')
            print('  %-22s manca: %s' % (nome, ' e '.join(manca)))

    # ---- LE ZONE FATTE A PARTE ----
    # Roma, Napoli, Spoleto, Parma, Torre del Greco non stanno in
    # citta-italiane.txt: sono state scaricate a mano, a fette. Se la
    # copertura si guardasse solo con quell'elenco, le citta' piu' grosse —
    # e piu' provate — resterebbero fuori dal controllo. Quindi non si
    # chiede a un elenco dove siamo: si guardano i quadretti che ci sono, e
    # quelli che nessuna citta' dell'elenco rivendica si mettono in gruppo
    # da soli, uno per zona, con dentro i nomi che ci sono: cosi' una zona
    # nuova si presenta da se' e non puo' scordarsi nessuno.
    tutti = set(neg) | set(cult)
    presi = {k for k in tutti
             for c in citta if dentro(int(k[:4]) / 100 + 0.005, int(k[5:]) / 100 + 0.005, c)}
    liberi = tutti - presi
    gruppi = []
    da_fare = set(liberi)
    while da_fare:
        seme = da_fare.pop()
        gruppo = {seme}
        bordo = [seme]
        while bordo:
            k = bordo.pop()
            la, lo = int(k[:4]), int(k[5:])
            for dla in (-1, 0, 1):
                for dlo in (-1, 0, 1):
                    v2 = '%04d_%04d' % (la + dla, lo + dlo)
                    if v2 in da_fare:
                        da_fare.discard(v2)
                        gruppo.add(v2)
                        bordo.append(v2)
        gruppi.append(gruppo)
    gruppi.sort(key=lambda g: -sum(len(neg.get(k, [])) for k in g))

    print('')
    print('LE ZONE FATTE A PARTE (non in citta-italiane.txt)')
    print('  %-30s %7s %8s %7s %7s %6s' % ('dove, dai nomi che ci sono', 'quadr.', 'servizi', 'luoghi', 'schede', 'perc.'))
    for g in gruppi:
        n_s = sum(len(neg.get(k, [])) for k in g)
        n_l = sum(len(cult.get(k, [])) for k in g)
        if n_s + n_l < 40:
            continue                     # un quadretto sperduto non e' una zona
        la = sum(int(k[:4]) for k in g) / len(g) / 100
        lo = sum(int(k[5:]) for k in g) / len(g) / 100
        def qui_dentro(lat, lon):
            return ('%04d_%04d' % (math.floor(lat * 100), math.floor(lon * 100))) in g
        sch = sum(1 for x in luoghi if qui_dentro(x.get('lat', 0), x.get('lon', 0)))
        per = [p2 for p2 in giri if p2.get('t') and qui_dentro(p2['t'][0].get('la', 0), p2['t'][0].get('lo', 0))]
        # come si chiama questa zona: lo dicono le passeggiate, se ci sono
        nomi = sorted({p2.get('citta', '') for p2 in per if p2.get('citta')})
        if nomi:
            come = ', '.join(nomi[:2])
        else:
            dentro_g = [x.get('n', '') for x in luoghi if qui_dentro(x.get('lat', 0), x.get('lon', 0))]
            come = (dentro_g[0][:26] if dentro_g else '%.2f, %.2f' % (la, lo))
        print('  %-30s %7d %8d %7d %7d %6d' % (come[:30], len(g), n_s, n_l, sch, len(per)))
        if n_l == 0:
            vuote.append((come[:22] + ' (a parte)', n_s, 0))

    # ---- i guai ----
    print('')
    print('=' * 64)
    if not guai:
        print('NESSUN GUAIO TROVATO.')
    else:
        tot = sum(len(v) for v in guai.values())
        print('GUAI: %d, in %d categorie' % (tot, len(guai)))
        for tipo in sorted(guai, key=lambda t: -len(guai[t])):
            v = guai[tipo]
            print('')
            print('  %s — %d' % (tipo.upper(), len(v)))
            for riga in v[:6]:
                print('     ' + riga)
            if len(v) > 6:
                print('     … e altri %d' % (len(v) - 6))
    return 0 if not guai else 1

if __name__ == '__main__':
    sys.exit(main())
