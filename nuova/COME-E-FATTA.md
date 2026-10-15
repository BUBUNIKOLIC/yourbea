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

## Come si prova

    node nuova/prove/voce.js
    node nuova/prove/racconto.js

Nessuna delle due prove tocca la rete, l'audio o il telefono: girano in un
secondo. Se una si rompe, il difetto che descrive è tornato.

## Cosa manca

- `parti/posizione.js` (GPS, direzione, fermo/in movimento)
- `parti/intorno.js` (OSM, Wikipedia, Valhalla: una porta per ogni fonte)
- `parti/interfaccia.js` + la grafica nuova, pensata prima per chi non vede
- `app.js` che tiene insieme i pezzi, e l'indirizzo separato per provarla
  senza toccare il link che è in mano ai provatori.
