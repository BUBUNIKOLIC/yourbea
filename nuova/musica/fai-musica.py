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
BPM = 92.0   # 54 era un funerale, 72 ancora lento: «deve essere piu movimentata, una primavera»
BATTUTA = 60.0 / BPM * 4          # 4/4

def nota(n):
    """numero MIDI -> hertz"""
    return 440.0 * (2 ** ((n - 69) / 12.0))

def pad(freq, durata, ampiezza, pizzicato=True):
    """una voce del tappeto: tre sinusoidi appena stonate fra loro, che è
    quello che fa 'respirare' un accordo invece di farlo sembrare un organo
    elettronico."""
    t = np.linspace(0, durata, int(SR * durata), endpoint=False)
    v = np.zeros_like(t)
    for scarto, peso in ((0.0, 1.0), (0.14, 0.5), (-0.11, 0.5), (0.0, 0.28)):
        f = freq * (2 if peso == 0.28 else 1) + scarto
        v += peso * np.sin(2 * np.pi * f * t + np.random.rand() * 6.28)
    # entra e esce piano: un attacco secco su un pad suona come un errore
    salita = int(SR * min(0.7, durata / 3))
    inviluppo = np.ones_like(v)
    inviluppo[:salita] = np.linspace(0, 1, salita) ** 2
    inviluppo[-salita:] = np.linspace(1, 0, salita) ** 2
    # un respiro lentissimo, perché un suono immobile stanca
    respiro = 1 + 0.12 * np.sin(2 * np.pi * 0.07 * t + np.random.rand() * 6.28)
    # IL SUONO TENUTO ERA UN ORGANO. «Penso sia l'organo che fa tanto di
    # funerale» (Vince, 16/10), e aveva ragione: quattro sinusoidi tenute
    # ferme per tutta la battuta sono la registrazione di un organo da
    # chiesa. Adesso ogni accordo DECADE come una corda pizzicata: resta
    # l'armonia, sparisce la messa.
    if pizzicato:
        inviluppo = inviluppo * np.exp(-t * 1.5)
    return v * inviluppo * respiro * ampiezza

def corda(freq, durata, ampiezza):
    """la nota singola, tipo arpa o celesta.

    Tre cose che la fanno smettere di sembrare un sintetizzatore:
    - IL PIZZICO. Una nota vera comincia con un rumore — la corda che
      viene lasciata — non con una sinusoide che appare dal niente.
    - LE ARMONICHE STONATE. Su una corda vera la seconda e la terza non
      sono esattamente il doppio e il triplo: scostarle di pochissimo è
      la differenza fra un'arpa e un oscillatore.
    - LE ARMONICHE ALTE MUOIONO PRIMA delle basse, sempre.
    """
    t = np.linspace(0, durata, int(SR * durata), endpoint=False)
    v = np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.0)
    v += 0.38 * np.sin(2 * np.pi * freq * 2.003 * t) * np.exp(-t * 3.2)
    v += 0.14 * np.sin(2 * np.pi * freq * 3.009 * t) * np.exp(-t * 4.6)
    v += 0.05 * np.sin(2 * np.pi * freq * 4.02 * t) * np.exp(-t * 7.0)
    # il pizzico: due centesimi di secondo di rumore che si spegne subito
    pizzico = np.random.randn(len(t)) * np.exp(-t * 180) * 0.1
    attacco = np.minimum(1, t * 900)
    return (v + pizzico) * attacco * ampiezza

def arpeggio(accordo, durata, inizio, semi=0):
    """note staccate che salgono e scendono dentro l'accordo: danno il passo
    senza diventare una melodia. Un tappeto fermo, in maggiore, suonava
    comunque come una veglia."""
    note = [g + 12 for g in accordo[1:]] + [accordo[-1] + 12]
    v = np.zeros(int(SR * (durata + 2.0)))
    # IL PASSO. Dopo il funerale (54 battiti, accordi lunghissimi) e la
    # chiesa (il pad tenuto come un organo): note fitte, ma con la PAUSA
    # ogni quattro. È la pausa che fa il ritmo — senza, viene un muro di
    # suono; con, si cammina. Sotto una voce che racconta, il vuoto conta
    # quanto le note.
    passo = 0.42
    i = 0
    t = 0.35
    while t < durata - 0.2:
        if i % 4 == 3:                     # la pausa, a tempo
            t += passo; i += 1; continue
        f = nota(note[i % len(note)] + semi)
        # mai a tempo perfetto e mai con la stessa forza: a dieci
        # millesimi e a un quinto di volume non si sente il dettaglio, si
        # sente che è suonato da qualcuno
        quando = t + np.random.uniform(-0.012, 0.012)
        n = corda(f, 1.5, 0.07 * np.random.uniform(0.78, 1.15))
        a = int(SR * max(0, quando))
        fine = min(len(v), a + len(n))
        v[a:fine] += n[:fine - a]
        # la seconda voce, un'ottava sopra e mezzo passo dopo: due mani
        if i % 2 == 0:
            n2 = corda(nota(note[(i + 2) % len(note)] + semi) * 2, 0.9, 0.028)
            a2 = int(SR * (t + passo / 2))
            fine2 = min(len(v), a2 + len(n2))
            if fine2 > a2:
                v[a2:fine2] += n2[:fine2 - a2]
        t += passo
        i += 1
    return v


def riverbero(x, secondi=1.9, quanto=0.24):
    """una coda di riverbero fatta con rumore che si spegne: è il trucco più
    vecchio che ci sia e basta e avanza per un tappeto."""
    n = int(SR * secondi)
    ir = np.random.randn(n) * np.exp(-np.linspace(0, 7, n))
    ir[0] = 1.0
    bagnato = np.convolve(x, ir)[:len(x)]
    bagnato /= (np.max(np.abs(bagnato)) + 1e-9)
    return (1 - quanto) * x + quanto * bagnato * np.max(np.abs(x))

def brano(accordi, motivo, battute_per_accordo=1, semi=0):
    durata = BATTUTA * battute_per_accordo
    # il giro si ripete finche il brano non dura almeno cinquanta secondi
    giri = max(1, int(np.ceil(50.0 / (durata * len(accordi)))))
    accordi = accordi * giri
    lungo = int(SR * durata * len(accordi))
    mix = np.zeros(lungo + SR * 4)
    for i, acc in enumerate(accordi):
        inizio = int(SR * durata * i)
        for k, grado in enumerate(acc):
            v = pad(nota(grado + semi), durata + 1.2, 0.06)
            a = inizio + int(SR * 0.035 * k)      # sfalsate: una strimpellata, non un tasto premuto
            fine2 = min(len(mix), a + len(v))
            mix[a:fine2] += v[:fine2 - a]
        # il basso, una nota sola per accordo, due ottave sotto: tiene
        # insieme l'armonia senza farsi sentire come strumento
        b = corda(nota(acc[0] - 12 + semi), durata * 0.9, 0.05)
        fineB = min(len(mix), inizio + len(b))
        mix[inizio:fineB] += b[:fineB - inizio]
        ar = arpeggio(acc, durata, inizio, semi)
        fine = min(len(mix), inizio + len(ar))
        mix[inizio:fine] += ar[:fine - inizio]
    # il motivo: poche note, lasciate suonare
    for quando, grado in motivo:
        inizio = int(SR * quando)
        if inizio >= len(mix) - SR:      # una nota fuori dal brano non si mette
            continue
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
    # lo stereo stretto, con le due orecchie appena diverse: largo fa
    # perdere il centro a chi ascolta in cuffia camminando
    r1 = np.interp(np.arange(len(x)) - 0.012 * SR, np.arange(len(x)), x)
    r2 = np.interp(np.arange(len(x)) + 0.008 * SR, np.arange(len(x)), x)
    stereo = np.stack([0.84 * x + 0.16 * r1, 0.84 * x + 0.16 * r2], axis=1)
    crudo = (stereo * 32767).astype('<i2').tobytes()
    grezzo = nome + '.raw'
    open(grezzo, 'wb').write(crudo)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR),
                    '-ac', '2', '-i', grezzo, '-c:a', 'aac', '-b:a', '64k', nome + '.m4a'], check=True)
    os.remove(grezzo)
    return picco

np.random.seed(7)                        # così si rifà uguale

# RE MAGGIORE, e il giro si muove: otto accordi da una battuta invece di
# quattro lunghissimi. «Deve essere piu movimentata, una primavera» (Vince,
# 16/10). L'arpeggio batte ogni mezzo secondo: e quello che da il passo.
PEZZI = {
  'cammino': (
      [[50, 57, 62, 66], [57, 61, 64, 69], [52, 59, 66, 71], [55, 62, 67, 71],
       [50, 57, 62, 66], [55, 62, 67, 71], [57, 64, 69, 73], [50, 57, 62, 69]],
      [(2.6, 81), (7.8, 83), (13.0, 86), (18.2, 81), (23.4, 78), (28.6, 83), (34.0, 85)]),
  'chiostro': (
      [[53, 60, 65, 69], [55, 62, 67, 71], [57, 64, 69, 72], [53, 60, 65, 72],
       [55, 62, 67, 74], [52, 59, 64, 71], [57, 64, 69, 76], [55, 62, 67, 71]],
      [(3.0, 84), (8.0, 86), (13.5, 81), (19.0, 88), (24.5, 83), (30.0, 86)]),
  'notturno': (
      [[52, 59, 64, 68], [55, 62, 67, 71], [50, 57, 62, 66], [57, 64, 69, 73],
       [52, 59, 64, 71], [55, 62, 67, 74], [59, 66, 71, 74], [57, 64, 69, 73]],
      [(2.8, 79), (8.4, 83), (14.0, 86), (19.6, 80), (25.2, 85), (31.0, 88)]),
}

for nome, (accordi, motivo) in PEZZI.items():
    x = brano(accordi, motivo)
    x = in_cerchio(x)
    picco = salva(nome, x)
    secondi = len(x) / SR
    print('%-10s %5.1f s   picco %.2f   %6.0f KB' %
          (nome, secondi, picco, os.path.getsize(nome + '.m4a') / 1024))
