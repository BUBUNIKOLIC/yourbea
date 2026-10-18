#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PULISCE I NOMI E TOGLIE I DOPPIONI — Yourbea, 16/10/2026
================================================================
Il controllo di tutta l'Italia ha trovato 1.400 nomi sporchi e 150 doppioni.
Non sono dettagli da niente: QUESTI NOMI LI LEGGE UNA VOCE. «New  Afrodite
beauty  center» con due spazi in mezzo la voce lo spezza, «&amp;» lo legge
«e commerciale punto e virgola», e un nome che finisce con il quadratino
dell'accento rotto diventa un rumore. Chi non vede ha solo quello.

COSA FA, e perche' ogni cosa:
1. SPAZI. Via quelli ai bordi e i doppi in mezzo. Vengono da OpenStreetMap,
   dove li scrive la gente a mano.
2. HTML. «&amp;» torna «&», «&#39;» torna l'apostrofo. Sono passati dentro
   da chi ha copiato un nome da una pagina web.
3. ACCENTI ROTTI. Il carattere U+FFFD — il quadratino — e' quello che resta
   quando un testo e' stato letto con la codifica sbagliata: la lettera vera
   NON si puo' piu' recuperare, nessuno sa quale fosse. Si toglie il
   quadratino e si ricuce il nome; se quello che resta non e' piu' un nome
   (meno di due lettere) il punto si butta, perche' un nome che la voce non
   sa dire e' peggio di un punto in meno.
4. DOPPIONI. Lo stesso nome a meno di quindici metri dentro lo stesso
   quadretto: e' la stessa cosa arrivata da due fonti. Si tiene quella che
   ha piu' roba (la scheda, l'anno, l'architetto, l'indirizzo).
   QUINDICI METRI, non cinquanta: «Attraversamento di Via Laurentina» torna
   sei volte lungo la stessa via e sono sei attraversamenti VERI, uno per
   incrocio. A cinquanta metri si cancellavano cinque passaggi pedonali.

Si lancia:
    python3 -I strumenti/pulisci-i-nomi.py            (guarda e dice)
    python3 -I strumenti/pulisci-i-nomi.py --scrivi   (pulisce davvero)
"""

import html
import io
import json
import math
import os
import re
import sys

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATI = os.path.join(QUI, 'nuova', 'dati')
SCRIVI = '--scrivi' in sys.argv
VICINO = 15            # metri: sotto, lo stesso nome e' la stessa cosa

conti = {'spazi': 0, 'html': 0, 'accenti rotti': 0, 'buttati': 0, 'doppioni': 0, 'nomi in inglese': 0}
esempi = {k: [] for k in conti}


def nota(tipo, prima, dopo=None):
    conti[tipo] += 1
    if len(esempi[tipo]) < 5:
        esempi[tipo].append(prima + (' → ' + dopo if dopo is not None else ''))


def dist(a1, o1, a2, o2):
    r = math.pi / 180
    a = (math.sin((a2 - a1) * r / 2) ** 2 +
         math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2)
    return 2 * 6371000 * math.asin(math.sqrt(a))


# ============================================================
# I NOMI IN INGLESE, 20/10. Sul telefono di Vince, a trecento metri da
# casa: «Fountain», tre volte. Sono 998 luoghi su 20.841, e la voce
# italiana li legge in inglese — per chi non vede e' un rumore che non
# vuol dire niente.
# Quasi tutti sono fontane: in Wikidata hanno l'etichetta inglese e basta.
# E fra queste ci sono i NASONI di Roma, che per chi cammina sono acqua da
# bere: dirlo in italiano non e' questione di eleganza, e' la differenza
# fra sapere e non sapere che li' si beve.
# Il pezzo fra parentesi, quando c'e', e' quasi sempre il nome vero.
PARENTESI = re.compile(r'^Fountain\s*\((.+)\)\s*$', re.I)
INGLESI = {
    'fountain': 'fontana', 'church': 'chiesa', 'tower': 'torre',
    'bridge': 'ponte', 'museum': 'museo', 'castle': 'castello',
    'monument': 'monumento', 'statue': 'statua', 'chapel': 'cappella',
    'cathedral': 'cattedrale', 'gate': 'porta', 'theatre': 'teatro',
    'theater': 'teatro', 'library': 'biblioteca', 'cemetery': 'cimitero',
    'market': 'mercato', 'square': 'piazza', 'palace': 'palazzo',
    'drinking water': 'acqua potabile', 'miracle water': 'acqua miracolosa'
}


def initaliano(n):
    """Il nome in italiano, o None se va bene com'e'."""
    if not isinstance(n, str):
        return None
    t = n.strip()
    m = PARENTESI.match(t)
    if m:
        dentro = m.group(1).strip().strip('"\'')
        # «Fountain (Nasone)» e' un nasone; «Fountain (Fontana della Pigna)»
        # e' la Fontana della Pigna. Il nome vero e' quello fra parentesi.
        basso = dentro.lower()
        if basso in INGLESI:
            return INGLESI[basso]
        if re.match(r'^(fontan|nasone|fonte|acqua)', basso):
            return dentro
        return dentro
    basso = t.lower()
    if basso in INGLESI:
        return INGLESI[basso]
    return None


def pulisci(t):
    """Restituisce (testo pulito, cosa e' stato toccato). None se non e' testo."""
    if not isinstance(t, str):
        return t, None
    prima = t
    tocco = None
    if re.search(r'&[a-zA-Z]{2,8};|&#\d+;', t):
        t = html.unescape(t)
        tocco = 'html'
    if '�' in t:
        # il quadratino e quello che gli sta appiccicato: la lettera vera e'
        # persa, e il resto del nome si ricuce
        t = t.replace('�', '')
        t = re.sub(r'^[\s"\'`_,.;:-]+|[\s"\'`_,.;:-]+$', '', t)
        tocco = 'accenti rotti'
    if t != t.strip() or '  ' in t:
        t = re.sub(r'\s+', ' ', t).strip()
        if tocco is None:
            tocco = 'spazi'
    if t == prima:
        return t, None
    return t, tocco


def quanta_roba(x):
    """Quale dei due doppioni si tiene: quello che ha piu' da dire."""
    return (len(x.get('d') or ''), 1 if x.get('y') else 0,
            len(x.get('arch') or []), len(x.get('a') or ''), len(x.get('t') or ''))


def una_cartella(cartella):
    strada = os.path.join(DATI, cartella)
    cambiati = 0
    for f in sorted(os.listdir(strada)):
        if not f.endswith('.json'):
            continue
        p = os.path.join(strada, f)
        try:
            d = json.load(io.open(p, encoding='utf-8'))
        except Exception:
            continue
        if not isinstance(d, list):
            continue
        nuovi, cambiato = [], False
        for x in d:
            if not isinstance(x, dict):
                continue
            if isinstance(x.get('n'), str):
                it = initaliano(x['n'])
                if it and it != x['n']:
                    nota('nomi in inglese', x['n'][:40], it[:40])
                    x['n'] = it
                    cambiato = True
            for campo in ('n', 't', 'd', 'a', 'i', 'y'):
                if campo in x:
                    v, tocco = pulisci(x[campo])
                    if tocco:
                        if campo == 'n':
                            nota(tocco, x[campo][:52], v[:52])
                        else:
                            conti[tocco] += 1
                        x[campo] = v
                        cambiato = True
            n = x.get('n')
            # SI BUTTA SOLO QUELLO CHE NON HA PIU' UN NOME. Prima la soglia
            # era due lettere, e si e' portata via quattro negozi che si
            # chiamano davvero «Z», «M», «G», «Ò»: un nome di una lettera e'
            # strano, ma e' il loro, e non e' spazzatura. Rimessi a mano dal
            # commit di prima.
            if not isinstance(n, str) or not n.strip():
                nota('buttati', repr(x.get('n'))[:40])
                cambiato = True
                continue
            nuovi.append(x)
        # i doppioni, dentro il quadretto
        tenuti = []
        for x in nuovi:
            gemello = None
            for y in tenuti:
                if y['n'].lower() == x['n'].lower() and \
                   dist(x['lat'], x['lon'], y['lat'], y['lon']) < VICINO:
                    gemello = y
                    break
            if gemello is None:
                tenuti.append(x)
                continue
            cambiato = True
            if quanta_roba(x) > quanta_roba(gemello):
                tenuti[tenuti.index(gemello)] = x
            nota('doppioni', cartella + '/' + f[:-5] + ' — ' + x['n'][:40])
        if cambiato:
            cambiati += 1
            if SCRIVI:
                with io.open(p, 'w', encoding='utf-8') as g:
                    json.dump(tenuti, g, ensure_ascii=False, separators=(',', ':'))
    return cambiati


def luoghi():
    p = os.path.join(DATI, 'luoghi.json')
    d = json.load(io.open(p, encoding='utf-8'))
    nuovi, cambiato = [], False
    for x in d:
        for campo in ('n', 't', 'd', 'i', 'a', 'y'):
            if campo in x:
                v, tocco = pulisci(x[campo])
                if tocco:
                    conti[tocco] += 1
                    if campo == 'n':
                        esempi[tocco].append(x[campo][:52] + ' → ' + v[:52]) if len(esempi[tocco]) < 5 else None
                    x[campo] = v
                    cambiato = True
        nuovi.append(x)
    tenuti = []
    for x in nuovi:
        gemello = None
        for y in tenuti:
            if y.get('n', '').lower() == x.get('n', '').lower() and \
               dist(x['lat'], x['lon'], y['lat'], y['lon']) < VICINO:
                gemello = y
                break
        if gemello is None:
            tenuti.append(x)
            continue
        cambiato = True
        if quanta_roba(x) > quanta_roba(gemello):
            tenuti[tenuti.index(gemello)] = x
        nota('doppioni', 'luoghi.json — ' + x.get('n', '')[:40])
    if cambiato and SCRIVI:
        with io.open(p, 'w', encoding='utf-8') as g:
            json.dump(tenuti, g, ensure_ascii=False, separators=(',', ':'))
    return len(d) - len(tenuti)


def main():
    print('PULIZIA DEI NOMI%s' % ('' if SCRIVI else '  (solo guardo: aggiungi --scrivi)'))
    print('=' * 66)
    a = una_cartella('cultura')
    b = una_cartella('negozi')
    c = luoghi()
    print('quadretti toccati: %d di cultura, %d di negozi; luoghi.json: %d tolti' % (a, b, c))
    print('')
    for k in conti:
        print('  %-16s %d' % (k, conti[k]))
        for e in esempi[k][:4]:
            print('       ' + e)
    print('')
    print('Niente scritto. Per pulire davvero: --scrivi' if not SCRIVI else 'SCRITTO.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
