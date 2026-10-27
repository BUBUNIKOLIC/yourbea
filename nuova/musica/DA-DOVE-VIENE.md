# La musica di Yourbea

**Non viene da nessuna parte: è fatta qui.** I tre brani in questa cartella
sono generati da `fai-musica.py`, che li ricostruisce identici ogni volta.

Perché non si è presa musica già fatta: una registrazione di Bach trovata in
rete è libera come composizione ma **non come incisione** — i diritti del
disco sono a parte, e su quello si inciampa. Un brano nostro non si può
ritirare, non chiede attribuzione e non fa togliere l'app dallo store.

| brano | dura | a cosa serve |
|---|---|---|
| `cammino.m4a` | 68 s | il passo fra una tappa e l'altra |
| `chiostro.m4a` | 68 s | più chiaro, per i giri di giorno |
| `notturno.m4a` | 68 s | più basso, per la sera |

**Licenza: nostra.** Si possono usare, cambiare e rifare senza chiedere
niente a nessuno.

## Com'è fatta, e perché così

- **Accordi lunghi e poche note.** Va sotto una voce che racconta: la
  melodia è il racconto, non la musica.
- **Nasce a −26 dB di media**, non abbassata dopo: anche se qualcosa va
  storto nel mixer non copre la voce.
- **Gira in cerchio**, cucita a potenza costante su sette secondi: una
  camminata dura quanto dura, e un brano che riparte con un buco si sente.
- **Niente bassi forti** (sotto i 120 Hz c'è il 6% dell'energia): sul
  telefono fanno rimbombo e in cuffia coprono il traffico, che chi non vede
  deve sentire.

Si rifanno con:

    python3 nuova/musica/fai-musica.py
