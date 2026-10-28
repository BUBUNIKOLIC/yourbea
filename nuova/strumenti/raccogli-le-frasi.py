# -*- coding: utf-8 -*-
"""TUTTE LE FRASI CHE L'APP DICE DAVVERO.

   Il primo tentativo cercava «le stringhe che sembrano italiano»: ci
   finivano dentro i commenti, che in questo progetto sono lunghi e
   pieni di frasi fra virgolette. Qui invece si guarda DOVE la frase
   viene detta — le chiamate che parlano — e si prende quello che gli
   viene passato. Se una frase non passa di li', l'utente non la sente.

   Lancio:  python3 nuova/strumenti/raccogli-le-frasi.py
   Scrive:  nuova/dati/frasi-da-tradurre.json                        """
import json, os, re

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = ['app.js'] + ['parti/' + f for f in sorted(os.listdir(os.path.join(QUI, 'parti'))) if f.endswith('.js')]

# chi parla: la voce, le risposte, i testi che l'app mostra e legge
# solo le due vie vere della voce. Con `testo:` e `titolo:` (che non
# hanno la parentesi) il lettore correva fino in fondo al file e
# raccoglieva pezzi di codice: 435 «frasi» che non erano frasi.
CHIAMA = re.compile(r'\b(?:voce\.parla|dillo)\s*\(')


def senzaCommenti(testo):
    """Si svuotano i commenti tenendo i ritorni a capo, cosi' i numeri di
       riga restano quelli del file. Dentro un commento gli apostrofi non
       aprono niente: era il difetto del primo tentativo."""
    fuori, i, n = [], 0, len(testo)
    while i < n:
        c = testo[i]
        if c == '/' and i + 1 < n and testo[i + 1] == '*':
            j = testo.find('*/', i + 2)
            j = n if j < 0 else j + 2
            fuori.append(re.sub(r'[^\n]', ' ', testo[i:j])); i = j
        elif c == '/' and i + 1 < n and testo[i + 1] == '/':
            j = testo.find('\n', i)
            j = n if j < 0 else j
            fuori.append(' ' * (j - i)); i = j
        elif c in '\'"`':
            j = i + 1
            while j < n and testo[j] != c:
                j += 2 if testo[j] == '\\' else 1
            fuori.append(testo[i:j + 1]); i = j + 1
        else:
            fuori.append(c); i += 1
    return ''.join(fuori)


def stringheDaQui(testo, da):
    """Le stringhe di UNA chiamata: dalla parentesi aperta alla sua
       chiusa. Cosi' «'Ho sentito: ' + numero + '. È giusto?'» torna coi
       suoi due pezzi, e si vede che e' una frase sola spezzata."""
    i, liv, pezzi = da, 1, []          # `da` e' gia' dentro la parentesi
    while i < len(testo):
        c = testo[i]
        if c == '(':
            liv += 1
        elif c == ')':
            liv -= 1
            if liv <= 0: break
        elif c in '\'"':
            j = i + 1
            while j < len(testo) and testo[j] != c:
                j += 2 if testo[j] == '\\' else 1
            pezzi.append(testo[i + 1:j]); i = j
        i += 1
    return pezzi


frasi = {}
for f in FILE:
    pulito = senzaCommenti(open(os.path.join(QUI, f), encoding='utf-8').read())
    righe = pulito.split('\n')
    inizi = [0]
    for r in righe: inizi.append(inizi[-1] + len(r) + 1)
    for m in CHIAMA.finditer(pulito):
        n = next(k for k in range(len(inizi) - 1) if inizi[k] <= m.start() < inizi[k + 1]) + 1
        for p in stringheDaQui(pulito, m.end()):
            t = p.replace("\\'", "'").replace('\\"', '"').strip()
            if len(t) < 4 or not re.search(r'[a-zàèéìòù]', t):
                continue
            if re.match(r'^[a-z0-9_.\- ]+$', t) and ' ' not in t.strip():
                continue
            frasi.setdefault(t, {'dove': [], 'intera': False})['dove'].append(f + ':' + str(n))

for t, d in frasi.items():
    d['intera'] = bool(re.match(r'^[A-ZÀÈÉÌÒÙ«]', t)) and bool(re.search(r'[.!?»]$', t))

intere = [t for t, d in frasi.items() if d['intera']]
json.dump({'quante': len(frasi), 'intere': len(intere),
           'frasi': [{'it': t, 'intera': d['intera'], 'dove': d['dove']} for t, d in sorted(frasi.items())]},
          open(os.path.join(QUI, 'dati', 'frasi-da-tradurre.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('frasi che l\'app dice davvero:', len(frasi))
print('  intere:', len(intere), ' a pezzi:', len(frasi) - len(intere))
print('  parole:', sum(len(t.split()) for t in frasi))
