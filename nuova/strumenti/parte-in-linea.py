#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""L'APP PUBBLICATA PARTE DAVVERO? — 29/10/2026

Vince: «non è il singolo errore, è la gestione di tutto che non mi
torna». Aveva ragione: PUBBLICA.command diceva «in linea» e finiva lì.
Controllava che i file ci fossero, non che l'app si accendesse. Il 29/10
l'app pubblicata moriva al primo istante e nessuno se n'è accorto fino a
quando Vince l'ha aperta in strada.

Questo scarica dal sito LA PAGINA VERA — app.js e i pezzi, con la
versione che la pagina stessa dichiara — la fa partire nel finto
telefono di `nuova/prove/avvio.js`, con dentro le memorie sporche di un
telefono vero, e guarda se arriva a dire la sua versione.

Se non parte, la pubblicazione è andata male anche se tutti i file
rispondono 200.

    python3 nuova/strumenti/parte-in-linea.py [indirizzo]
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
NUOVA = os.path.dirname(QUI)
SITO = sys.argv[1] if len(sys.argv) > 1 else 'https://yourbea.it/nuova/'


def prendi(u):
    r = urllib.request.Request(u, headers={'User-Agent': 'Yourbea/controllo'})
    return urllib.request.urlopen(r, timeout=40).read().decode('utf-8')


def main():
    print('  controllo che la pagina in linea parta: ' + SITO)
    try:
        index = prendi(SITO)
    except Exception as e:
        print('  NON RAGGIUNGIBILE: %s' % e)
        return 1
    pezzi = re.findall(r'src="(parti/[^"?]+)(\?v=\d+)?"', index)
    ver = ''
    m = re.search(r'app\.js(\?v=\d+)', index)
    if m:
        ver = m.group(1)
    if not pezzi:
        print('  la pagina non nomina nessun pezzo: non e\' lei')
        return 1
    dove = tempfile.mkdtemp(prefix='yourbea-in-linea-')
    try:
        os.makedirs(os.path.join(dove, 'parti'))
        for p, _ in pezzi:
            io.open(os.path.join(dove, p), 'w', encoding='utf-8').write(prendi(SITO + p + ver))
        io.open(os.path.join(dove, 'app.js'), 'w', encoding='utf-8').write(prendi(SITO + 'app.js' + ver))
        # i dati li legge il banco dal disco: quelli sono gli stessi
        for c in ('dati', 'mappa', 'index.html'):
            s = os.path.join(NUOVA, c)
            d = os.path.join(dove, c)
            if os.path.isdir(s):
                os.symlink(s, d)
            elif os.path.exists(s):
                shutil.copy(s, d)
        banco = os.path.join(dove, 'prove')
        os.makedirs(banco)
        shutil.copy(os.path.join(NUOVA, 'prove', 'avvio.js'), os.path.join(banco, 'avvio.js'))
        r = subprocess.run(['node', os.path.join(banco, 'avvio.js')],
                           capture_output=True, text=True, timeout=300)
        coda = [x for x in (r.stdout or '').strip().split('\n') if x.strip()]
        for x in coda[-8:]:
            print('   ' + x)
        if r.returncode != 0:
            print('  LA PAGINA IN LINEA NON PARTE.')
            return 1
        print('  la pagina in linea parte' + (' (' + ver.replace('?v=', 'versione ') + ')' if ver else ''))
        return 0
    finally:
        shutil.rmtree(dove, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
