#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""INCIDE LE CLIP DI UN LUOGO — Yourbea, 16/10/2026
====================================================
Le 4.300 clip di `voce/clip/it/` furono incise in blocco da `voce/genera-voce.sh`,
che legge `voce/testi.json` — e quel file nasceva dalla VECCHIA index.html, che
non c'è più. Quando un luogo cambia scheda, o se ne aggiunge uno, serve
incidere solo le sue: questo attrezzo fa quello.

Perché conta: se la clip manca, l'app parla lo stesso con la voce di sistema —
ma si sente il cambio di voce in mezzo a una frase. E se la clip C'È ma dice il
testo di prima, è peggio: lo schermo scrive una cosa e l'altoparlante ne dice
un'altra, e nessuno dei due sa di essere sbagliato. Per questo la cache tiene
il testo inciso accanto al file: cambiato il testo, si reincide.

Si lancia:  python3 nuova/strumenti/incidi-clip.py "Nome del luogo" ["Altro nome"]
            python3 nuova/strumenti/incidi-clip.py --tutti-senza-clip
"""

import json, os, subprocess, sys

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RADICE = os.path.dirname(QUI)
LUOGHI = os.path.join(QUI, 'dati', 'luoghi.json')
CLIP = os.path.join(RADICE, 'voce', 'clip', 'it')
VOCE = 'Alice (Enhanced)'          # la stessa delle altre 4.300: due voci si sentono


def pezzi(p):
    """I cinque pezzi che l'app sa comporre, con gli stessi nomi di sempre."""
    return [(p['c'] + '-nome', p['n']),
            (p['c'] + '-intro', (p.get('t') or '') + (' del ' + p['y'] if p.get('y') else '')),
            (p['c'] + '-scheda', p.get('d')),
            (p['c'] + '-dentro', p.get('i')),
            (p['c'] + '-ancora', p.get('a'))]


def incidi(ident, testo):
    testo = (testo or '').strip()
    if not testo:
        return 'niente da dire'
    os.makedirs(os.path.join(CLIP, '.testi'), exist_ok=True)
    segno = os.path.join(CLIP, '.testi', ident + '.txt')
    fatta = os.path.join(CLIP, ident + '.m4a')
    atteso = VOCE + '|' + testo
    if os.path.exists(fatta) and os.path.exists(segno):
        if open(segno, encoding='utf-8').read() == atteso:
            return 'già incisa'
    aiff = os.path.join(CLIP, ident + '.aiff')
    subprocess.run(['say', '-v', VOCE, '-o', aiff, testo], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', aiff, '-c:a', 'aac', '-b:a', '40k',
                    '-ac', '1', fatta], check=True)
    os.unlink(aiff)
    with open(segno, 'w', encoding='utf-8') as f:
        f.write(atteso)
    return 'incisa (%d KB)' % (os.path.getsize(fatta) // 1024)


def numero_libero(luoghi):
    """Un numero che non sia già di qualcun altro — NÉ NEI DATI NÉ FRA LE
    CLIP. La cartella delle clip porta la numerazione della vecchia app, che
    non è la stessa dei dati di adesso: cento di quei numeri non stanno in
    nessun luogo nuovo. Chi guarda solo i dati trova «libero» un poi-951 che
    sul disco è già inciso, e ci registra sopra la voce di un altro luogo."""
    usati = set()
    for p in luoghi:
        if p.get('c', '').startswith('poi-'):
            try:
                usati.add(int(p['c'][4:]))
            except ValueError:
                pass
    import re as _re
    if os.path.isdir(CLIP):
        for f in os.listdir(CLIP):
            m = _re.match(r'poi-(\d+)-', f)
            if m:
                usati.add(int(m.group(1)))
    n = 1
    while n in usati:
        n += 1
    return 'poi-%03d' % n


if __name__ == '__main__':
    luoghi = json.load(open(LUOGHI, encoding='utf-8'))
    if '--tutti-senza-clip' in sys.argv:
        quali = [p['n'] for p in luoghi if not p.get('c')]
    else:
        quali = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not quali:
        print(__doc__); sys.exit(1)

    cambiati = False
    for nome in quali:
        p = next((x for x in luoghi if x['n'] == nome), None)
        if not p:
            print('non lo trovo fra i luoghi: ' + nome); continue
        if not p.get('c'):
            p['c'] = numero_libero(luoghi); cambiati = True
            print('%s: nuovo nome delle clip %s' % (nome, p['c']))
        print('— ' + nome)
        for ident, testo in pezzi(p):
            print('   %-18s %s' % (ident, incidi(ident, testo)))
    if cambiati:
        json.dump(luoghi, open(LUOGHI, 'w', encoding='utf-8'), ensure_ascii=False)
        print('luoghi.json aggiornato')
