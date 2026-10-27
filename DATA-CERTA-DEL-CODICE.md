# LA DATA CERTA DEL CODICE DI YOURBEA

Il diritto d'autore sul codice nasce quando lo scrivi: non si registra e
non si deposita. Quello che in una causa serve dimostrare è **quando**
l'hai scritto — e questo è il modo di farlo senza spendere niente.

**Come funziona.** Un'impronta SHA-256 è un numero di 64 cifre che si
ricava dal file: cambia una virgola nel codice e l'impronta diventa
completamente diversa, e da quel numero non si può risalire al
contenuto. Mandandoti via PEC quel numero, la ricevuta della PEC fa
**data certa opponibile a terzi**: da quel giorno è provato che il file
con quell'impronta esisteva già, e che era tuo.

Il codice resta sul tuo computer: la PEC non lo trasporta, ne trasporta
solo l'impronta.

---

## LE IMPRONTE, AL 27 OTTOBRE 2026

**Il codice pubblicato** (il sito e l'applicazione, 25 MB)

    nome      yourbea-codice.zip
    SHA-256   840e45080068a93b551757cf75fba65551c71e8ff13db9bd5604b93447e7f829

**Tutto, compresa la storia di ogni modifica** (640 MB)

    nome      yourbea-tutto.bundle
    SHA-256   456be970a0a397c996a1293f1b21f6275f02246d25dfb2e6e36c1d65bacf78c6

**L'ultimo commit al momento di questa impronta**

    5a9e6f7e8b4edee9937d393ac289ad94eb099510   27/10/2026 08:53:59 +0100

---

## IL TESTO DA MANDARE PER PEC

Da te a te stesso. Oggetto e corpo sono questi, si copiano e si
incollano:

> **Oggetto:** Yourbea — deposito impronta del codice sorgente al 27/10/2026
>
> Il sottoscritto Vincenzo Di Meglio, autore del software **Yourbea**
> (applicazione di accompagnamento vocale per persone non vedenti,
> pubblicata su https://yourbea.it), dichiara di detenere alla data
> odierna il codice sorgente dell'opera, da lui interamente scritto,
> e ne deposita l'impronta digitale a fini di data certa:
>
> archivio del codice pubblicato — yourbea-codice.zip
> SHA-256: 840e45080068a93b551757cf75fba65551c71e8ff13db9bd5604b93447e7f829
>
> archivio completo con la storia delle modifiche — yourbea-tutto.bundle
> SHA-256: 456be970a0a397c996a1293f1b21f6275f02246d25dfb2e6e36c1d65bacf78c6
>
> ultimo commit del repository alla data: 5a9e6f7e8b4edee9937d393ac289ad94eb099510
> del 27/10/2026 08:53:59 +0100
>
> Gli archivi sono conservati dal sottoscritto. Chiunque può verificare
> che un archivio corrisponde a queste impronte eseguendo il comando
> `shasum -a 256` sul file.
>
> Roma, 27 ottobre 2026
> Vincenzo Di Meglio

---

## COSA CONSERVARE, E DOVE

1. **La ricevuta di accettazione e quella di avvenuta consegna** della
   PEC: sono loro a fare la data, non la mail.
2. **I due archivi**, da non modificare mai più: se cambi un byte,
   l'impronta non corrisponde più e il deposito non vale niente.
   Tienili su un disco esterno o in una cartella che non tocchi.
3. Quando il codice cambia in modo importante, si rifà: nuove impronte,
   nuova PEC. Una volta ogni tanto basta.

Gli archivi di oggi stanno in:

    ~/Desktop/ARCHIVIO DESKTOP/URBEA/impronte-27-10-2026/yourbea-codice.zip
    ~/Desktop/ARCHIVIO DESKTOP/URBEA/impronte-27-10-2026/yourbea-tutto.bundle

Insieme a loro c'è `IMPRONTE.txt`, che le riporta entrambe. Per
verificare in qualunque momento che gli archivi non siano stati
toccati:

    cd ~/Desktop/ARCHIVIO\ DESKTOP/URBEA/impronte-27-10-2026
    shasum -a 256 -c IMPRONTE.txt

Se risponde «OK» su tutte e due le righe, gli archivi sono quelli
depositati.

---

## E SE NON HAI UNA PEC

Vanno bene anche, in ordine di forza:

- il **registro pubblico speciale per il software** della SIAE: è un
  deposito vero e proprio, costa circa 130 € e produce un attestato da
  mostrare;
- una **marca temporale** (timestamp) da un certificatore accreditato:
  pochi euro;
- in mancanza d'altro, i **commit datati** su GitHub, che già esistono e
  che un giudice può leggere — più deboli, perché sono date che in
  teoria si possono manipolare, ma meglio di niente.
