# Yourbea, rifatta — 15/10/2026

Vince, la sera del 15/10: «secondo me è meglio rifare tutto daccapo, questa
app è storta dalla nascita. Rifai tutto, anche come grafica».

Ha ragione per una ragione misurabile: la vecchia app è **un file di ottomila
righe con tutto dentro, in un unico spazio di nomi**. In tre giorni ogni
correzione ne ha rotta un'altra parte — la voce che zittiva i monumenti, il
lucchetto che rendeva muta l'app, una variabile dichiarata in una funzione e
letta in un'altra. Non è sfortuna: è la forma del file.

## Come è fatta adesso

Ogni pezzo fa **una** cosa, non sa niente degli altri, e si prova senza
telefono e senza rete.

    nuova/
      dati/luoghi.json      950 luoghi, 576 approfondimenti, 102 percorsi
      parti/voce.js         il motore della voce: una porta sola
      parti/racconto.js     cosa dire e quando: il racconto a gradini
      prove/voce.js         11 prove — ognuna è un difetto che qualcuno ha sentito
      prove/racconto.js     12 prove — compreso il difetto di Gabri a Parma
      parti/passeggiata.js  i giri a tappe             (38 prove)
      parti/musica.js       il tappeto sotto la voce   (8 prove)
      dati/passeggiate.json 136 passeggiate, 977 tappe, 31 città
      strumenti/            gli attrezzi che scrivono i dati

## Le regole, e chi le ha dettate

**La voce** (`parti/voce.js`)
1. una voce sola: tutto passa da `parla()`, niente scorciatoie — *la sorella
   di Vince, che sentiva due voci insieme*;
2. mai silenzio oltre quattro secondi: una clip che non parte entro 3,5 s
   lascia il posto alla voce di sistema — *prima si aspettavano trenta
   secondi: è il «si blocca» di tutti e quattro i provatori*;
3. non si resta mai occupati: qualunque guasto libera il turno — *Gabri*;
4. le priorità non buttano i monumenti: aspettano il turno — *Gabri a Parma*;
5. la stessa frase non due volte in otto secondi;
6. il microfono tace mentre l'app parla — *l'app che si sentiva da sola*.

**Il racconto** (`parti/racconto.js`), il contratto detto da Vince:
camminando il **cenno**; **fermi dieci secondi** la **scheda**; poi **cosa
vedere**; poi, per i grandi, l'**approfondimento da manuale**; poi «di questo
ti ho detto tutto». «Ancora» scende di un gradino anche camminando.
In **Utilità** — la modalità di chi non vede — i luoghi importanti si dicono
come la guida, non come un cenno sacrificabile, e «approfondisci» parla del
monumento, non della farmacia accanto.

**Le passeggiate** (`parti/passeggiata.js`), portate dalla vecchia app il
15/10 sera. Erano 102 polilinee senza tappe: le tappe sono i luoghi che la
linea tocca entro ottanta metri, nell'ordine in cui li tocca — 101 giri e 732
tappe (quella della Laurentina è rimasta fuori: tutti attraversamenti, zero
luoghi da raccontare).
1. una tappa per volta, e «avanti», «ancora», «ferma» — il contratto di Vince;
2. la tappa si racconta **quando ci sei** (trentacinque metri): dire com'è
   fatta una facciata mentre sei a quattrocento metri è una bugia detta a chi
   non la può controllare. «Avanti» dice il nome e da che parte, non la scheda;
3. la tappa è quella **dove sei**, non quella che tocca all'app: chi fa il
   giro al contrario non resta bloccato;
4. distanze in passi fino a trecento metri, mai un imperativo sui piedi, e
   niente direzione per una tappa che hai sotto i piedi;
5. si propongono solo quelle **entro cinque chilometri**: a Parma l'app
   offriva come seconda un giro di Mantova «a 52 chilometri da te»;
6. «zitto» zittisce, «ferma» lascia il giro: non sono la stessa cosa;
7. la scena intorno — piazze, alberi, attraversamenti, negozi — resta di
   Utilità: in una passeggiata si parla di arte, architettura e storia;
8. una passeggiata **a tema** porta il testo suo, tappa per tappa — in
   «Caravaggio a Roma» di San Luigi dei Francesi si dice la cappella
   Contarelli, non la facciata — e allora le clip incise del luogo si
   buttano, perché direbbero un'altra cosa;
9. se si entra pagando, la tappa lo dice.

**Il filo fra una tappa e l'altra** (16/10). Fra due chiese c'era silenzio, e
sono i minuti in cui uno cammina e ascolta meglio: adesso lì va il racconto
che le lega — perché si va da questa a quella, cosa è successo in mezzo. Esce
come **cenno**, cioè al livello che il motore della voce butta quando c'è di
meglio da dire: una svolta, un attraversamento o l'emergenza gli passano
sopra. Tace a sessanta metri dalla tappa, per non tagliare l'arrivo; tace se
sei fermo, perché fermo il racconto è quello della chiesa; e chi cammina
veloce si perde dei pezzi senza ritrovarseli addosso dopo.

**La musica** (`parti/musica.js`). Tre tappeti fatti in casa in `musica/`
(licenza nostra, vedi `musica/DA-DOVE-VIENE.md`). Le regole, dette da Vince:
solo in Turismo — in Utilità mai, nemmeno accesa a mano —, volume basso, e si
spegne con un tasto o dicendo «musica». Sotto la voce scende, in emergenza si
ferma, e su una svolta o un attraversamento tace per otto secondi: anche in
Turismo chi ascolta può essere una persona che non vede.

**I giri, e da dove vengono** (16/10). Dalle 102 linee della vecchia app ne
sono rimasti 101; `strumenti/fai-i-giri.py` ne ha aggiunti 33 nelle città
d'arte, mettendo in fila i luoghi che hanno davvero la scheda — mai più di
cinquecento metri fra una tappa e l'altra — e chiedendo a Valhalla la strada
vera, perché una riga dritta passa dentro i palazzi. `strumenti/caravaggio.py`
scrive i due giri a tema, con le opere verificate una per una il 16/10: è lì
dentro che sta scritto dove sono oggi. `strumenti/bernini-borromini.py` scrive
il terzo, raccontato «come un documentario» (parole di Vince): una scena in
apertura, un filo che tiene tutte le tappe, la riga finale che lancia la
prossima — e la leggenda del Nilo che si copre gli occhi detta per quello che
è, una leggenda, perché la fontana è del 1651 e la facciata viene dopo.
Due correzioni ai dati vecchi, trovate facendo questo lavoro:
- il Martirio di sant'Orsola non è più a Palazzo Zevallos dal 2022 — è alle
  Gallerie d'Italia, in via Toledo 177 — e l'app ci mandava ancora la gente;
- 83 giri si dicevano più corti del vero, perché i metri erano quelli della
  linea disegnata a mano e non del cammino fra le tappe.

Mentre una passeggiata è in corso parla solo lei: il racconto tace, se no al
Battistero si sentono due voci dire due cose diverse sullo stesso luogo.

## Come si prova

    node nuova/prove/voce.js
    node nuova/prove/racconto.js
    node nuova/prove/passeggiata.js

Nessuna delle due prove tocca la rete, l'audio o il telefono: girano in un
secondo. Se una si rompe, il difetto che descrive è tornato.

## Cosa manca

- `parti/posizione.js` (GPS, direzione, fermo/in movimento)
- `parti/intorno.js` (OSM, Wikipedia, Valhalla: una porta per ogni fonte)
- `parti/interfaccia.js` + la grafica nuova, pensata prima per chi non vede
- `app.js` che tiene insieme i pezzi, e l'indirizzo separato per provarla
  senza toccare il link che è in mano ai provatori.

## Installarla sul telefono, e il numero di versione

I provatori non hanno il guscio iOS: si aprono
`https://bubunikolic.github.io/yourbea/nuova/` e fanno **Aggiungi a Home**
(iPhone) o **Installa** (Android). Tre file lo rendono possibile:

    nuova/manifest.webmanifest   nome, icone, standalone, colore #070A0E
    nuova/sw.js                  la cassaforte: parte anche senza rete
    nuova/index.html             li collega, e registra sw.js?v=N

**La regola che si e' pagata cara.** Ogni file che la pagina chiama porta
`?v=N`; `VERSIONE` in `sw.js` e' lo STESSO numero, ed e' il nome della
cassaforte. `PUBBLICA.command` li alza insieme, e `prove/pagina.js` non
lascia pubblicare se non coincidono. Al cambio di versione il service
worker butta la cassaforte di prima e **la pagina si ricarica da se'**: la
correzione arriva al provatore appena si pubblica, non quando gli viene in
mente di riavviare. Senza questo si corregge un difetto, si pubblica, e il
provatore continua a sentire quello di prima.

Nella cassaforte entrano la pagina, le parti, lo stile, Leaflet, i 950
luoghi e le 161 clip delle frasi fisse (2 MB). I **nomi dei luoghi** no:
sono 4.026 clip per 243 MB, si scaricano quando servono e restano nel
telefono da se'. Le fonti di fuori — OSM, Wikipedia, Valhalla — non si
tengono: cambiano a ogni passo.

**Non si pesta i piedi alla vecchia app.** Alla radice del sito c'e' un
altro service worker. `caches.keys()` elenca TUTTE le cassaforti del sito,
quindi ognuno dei due butta solo quelle col suo prefisso — `yourbea-vNNN`
la vecchia, `yourbea-nuova-vN` la nuova. Senza questo, la vecchia app
svuotava la nuova a ogni avvio. Lo controlla `prove/pagina.js`.
