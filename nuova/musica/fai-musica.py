#!/usr/bin/env python3
"""
LA MUSICA DI YOURBEA — fatta in casa, 16/10/2026
================================================
Vince: «oppure la fai tu». Ed è la strada giusta: un brano scritto da noi
non ha diritti di nessuno, non si può ritirare, e l'app può finire sullo
store senza che qualcuno ci tolga la colonna sonora. Una registrazione di
Bach trovata in rete è libera come composizione ma NON come incisione: i
diritti del disco sono a parte, ed è lì che si inciampa.

COME DEVE SUONARE, e perché:
- sotto una voce che racconta, quindi niente melodie che tirano l'orecchio:
  accordi lunghi, poche note, nessuna percussione. La melodia è il racconto;
- a volume basso di suo, non abbassato dopo: il brano nasce a circa -26 dB
  di media, così anche se qualcosa va storto nel mixer non copre la voce;
- in cerchio, senza cuciture: la camminata fra due tappe dura quanto dura,
  e un brano che finisce e ricomincia con un buco si sente;
- niente frequenze basse forti: sull'altoparlante di un telefono fanno solo
  rimbombo, e in cuffia coprono il rumore del traffico — che chi non vede
  deve sentire.

Si rifà con:  python3 fai-musica.py
"""

import numpy as np, subprocess, os, math

SR = 44100
BPM = 54.0
BATTUTA = 60.0 / BPM * 4          # 4/4

def nota(n):
    """numero MIDI -> hertz"""
    return 440.0 * (2 ** ((n - 69) / 12.0))

def pad(freq, durata, ampiezza):
    """una voce del tappeto: tre sinusoidi appena stonate fra loro, che è
    quello che fa 'respirare' un accordo invece di farlo sembrare un organo
    elettronico."""
    t = np.linspace(0, durata, int(SR * durata), endpoint=False)
    v = np.zeros_like(t)
    for scarto, peso in ((0.0, 1.0), (0.14, 0.5), (-0.11, 0.5), (0.0, 0.28)):
        f = freq * (2 if peso == 0.28 else 1) + scarto
        v += peso * np.sin(2 * np.pi * f * t + np.random.rand() * 6.28)
    # entra e esce piano: un attacco secco su un pad suona come un errore
    salita = int(SR * min(1.6, durata / 3))
    inviluppo = np.ones_like(v)
    inviluppo[:salita] = np.linspace(0, 1, salita) ** 2
    inviluppo[-salita:] = np.linspace(1, 0, salita) ** 2
    # un respiro lentissimo, perché un suono immobile stanca
    respiro = 1 + 0.12 * np.sin(2 * np.pi * 0.07 * t + np.random.rand() * 6.28)
    return v * inviluppo * respiro * ampiezza

def corda(freq, durata, ampiezza):
    """la nota singola, tipo arpa o celesta: attacco veloce e coda lunga."""
    t = np.linspace(0, durata, int(SR * durata), endpoint=False)
    v = (np.sin(2 * np.pi * freq * t)
         + 0.35 * np.sin(2 * np.pi * freq * 2 * t)
         + 0.12 * np.sin(2 * np.pi * freq * 3 * t))
    coda = np.exp(-t * 2.2)
    attacco = np.minimum(1, t * 220)
    return v * coda * attacco * ampiezza

def riverbero(x, secondi=2.6, quanto=0.3):
    """una coda di riverbero fatta con rumore che si spegne: è il trucco più
    vecchio che ci sia e basta e avanza per un tappeto."""
    n = int(SR * secondi)
    ir = np.random.randn(n) * np.exp(-np.linspace(0, 7, n))
    ir[0] = 1.0
    bagnato = np.convolve(x, ir)[:len(x)]
    bagnato /= (np.max(np.abs(bagnato)) + 1e-9)
    return (1 - quanto) * x + quanto * bagnato * np.max(np.abs(x))

def brano(accordi, motivo, battute_per_accordo=4, semi=0):
    durata = BATTUTA * battute_per_accordo
    lungo = int(SR * durata * len(accordi))
    mix = np.zeros(lungo + SR * 4)
    for i, acc in enumerate(accordi):
        inizio = int(SR * durata * i)
        for grado in acc:
            v = pad(nota(grado + semi), durata + 1.2, 0.12)
            mix[inizio:inizio + len(v)] += v
    # il motivo: poche note, lasciate suonare
    for quando, grado in motivo:
        inizio = int(SR * quando)
        v = corda(nota(grado + semi), 3.4, 0.1)
        fine = min(len(mix), inizio + len(v))
        mix[inizio:fine] += v[:fine - inizio]
    return mix

def in_cerchio(x, cucitura=7.0):
    """l'inizio si sovrappone alla fine: il giro si chiude e non si sente.
    Sette secondi e non due: con una cucitura corta il brano arrivava in
    fondo quasi in silenzio e ripartiva da zero, e ogni giro si sentiva come
    un respiro mancato. Si misura: l'energia sulla cucitura deve somigliare
    a quella del resto del brano."""
    n = int(SR * cucitura)
    corpo = x[:len(x) - n]
    coda = x[len(x) - n:]
    # a potenza costante: col dosaggio lineare due suoni diversi si sommano
    # male, e la cucitura o si abbassa o gonfia. Misurato: 73% e 149%.
    dentro = np.sqrt(np.linspace(0, 1, n))
    fuori = np.sqrt(1 - np.linspace(0, 1, n))
    corpo[:n] = corpo[:n] * dentro + coda * fuori
    return corpo

def salva(nome, x, db=-26.0):
    x = riverbero(x)
    x = x - np.mean(x)
    rms = np.sqrt(np.mean(x ** 2)) + 1e-12
    x = x * (10 ** (db / 20.0) / rms)
    picco = np.max(np.abs(x))
    if picco > 0.7:                      # mai vicino al tetto: distorce
        x = x * (0.7 / picco)
    larghezza = 0.015                    # un filo di stereo, non di più
    sx = np.interp(np.arange(len(x)) - larghezza * SR, np.arange(len(x)), x)
    stereo = np.stack([sx, x], axis=1)
    crudo = (stereo * 32767).astype('<i2').tobytes()
    grezzo = nome + '.raw'
    open(grezzo, 'wb').write(crudo)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR),
                    '-ac', '2', '-i', grezzo, '-c:a', 'aac', '-b:a', '64k', nome + '.m4a'], check=True)
    os.remove(grezzo)
    return picco

np.random.seed(7)                        # così si rifà uguale

# RE MINORE, il passo lento delle cose antiche
PEZZI = {
  'cammino': (
      [[50, 57, 62, 65], [46, 53, 57, 62], [48, 55, 60, 64], [45, 52, 57, 60]],
      [(6.0, 74), (17.5, 77), (29.0, 72), (41.0, 69), (52.0, 74), (63.0, 81)]),
  'chiostro': (
      [[53, 60, 65, 69], [50, 57, 62, 65], [48, 55, 60, 67], [50, 57, 62, 65]],
      [(9.0, 77), (23.0, 81), (37.0, 76), (50.0, 72), (62.0, 77)]),
  'notturno': (
      [[45, 52, 57, 60], [43, 50, 55, 58], [41, 48, 53, 57], [43, 50, 55, 60]],
      [(11.0, 69), (27.0, 72), (43.0, 67), (58.0, 64)]),
}

for nome, (accordi, motivo) in PEZZI.items():
    x = brano(accordi, motivo)
    x = in_cerchio(x)
    picco = salva(nome, x)
    secondi = len(x) / SR
    print('%-10s %5.1f s   picco %.2f   %6.0f KB' %
          (nome, secondi, picco, os.path.getsize(nome + '.m4a') / 1024))
