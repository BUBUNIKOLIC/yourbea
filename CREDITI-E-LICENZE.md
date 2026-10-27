# CREDITI E LICENZE

Yourbea è © 2026 Vincenzo Di Meglio, tutti i diritti riservati (vedi
`LICENSE`). Questo file elenca quello che **non è mio** e a quali
condizioni è usato. Fa parte della licenza: le due cose si leggono
insieme.

Scritto il 26/10/2026, guardando il codice e non a memoria.

---

## IL SOFTWARE DI TERZI

| Cosa | Chi | Licenza | Dove sta |
|---|---|---|---|
| **Leaflet 1.9.4** — disegna la mappa | Vladimir Agafonkin, CloudMade | BSD a 2 clausole | `nuova/mappa/leaflet.js`, `leaflet.css`, `images/` |

La licenza BSD chiede una cosa sola: che il testo del copyright resti
dentro il file. C'è, in testa a `leaflet.js`, e non va tolto.

Tutto il resto del codice — il motore del racconto, la guida, la voce,
i contributi, i gusci iOS e Android — è scritto per Yourbea.

---

## I DATI DEI LUOGHI

I 24.966 luoghi non sono tutti miei. Vengono da tre fonti aperte, e
ciascuna chiede qualcosa in cambio.

### Wikipedia — le schede, le storie, le descrizioni
Licenza **CC BY-SA 4.0**. Chiede due cose: citare la fonte, e lasciare
quello che se ne deriva sotto la stessa licenza.
*Dove si cita oggi:* nel piede di `index.html` e in `privacy.html`.

### OpenStreetMap — strade, incroci, fermate, negozi, misure degli edifici
Licenza **ODbL 1.0**, più la licenza del contenuto (DbCL). È la più
esigente: un **database derivato** da OSM va messo a disposizione con la
stessa licenza. Le mappe disegnate che si vedono nell'app (le tessere di
`tile.openstreetmap.org`) vanno attribuite «© OpenStreetMap», e
l'attribuzione c'è, dentro la mappa.
*Servizi OSM che l'app interroga a ogni camminata:*
`nominatim.openstreetmap.org`, `valhalla1.openstreetmap.de`,
`api.openstreetmap.org`, `tile.openstreetmap.org`, e `photon.komoot.io`
(che gira su dati OSM).

**Il punto aperto, da chiarire prima di andare pubblici:** il file dei
luoghi di Yourbea mette insieme dati OSM e dati di altra origine. Se
quel file è un «database derivato» da OSM, l'ODbL chiede di
condividerlo. Finché le due cose stanno mescolate la domanda non ha una
risposta pulita. Vedi sotto.

### Catalogo generale dei Beni Culturali (ArCo) — Ministero della Cultura
Licenza **CC BY 4.0**: basta citare la fonte. Citata nel piede del sito.

---

## QUELLO CHE È MIO DAVVERO

Non viene da nessuna fonte aperta, perché **non esiste in nessuna mappa
al mondo**:

- gli attraversamenti col semaforo acustico;
- i percorsi tattili;
- i punti segnati camminando dalla rete dei tester, con chi li ha detti
  e quante persone li hanno confermati;
- le camminate registrate e il banco di prova costruito su quelle.

Questo è un database nuovo, raccolto a piedi, e ha una tutela sua: il
diritto del costitutore di banca dati (direttiva 96/9/CE), quindici
anni dalla raccolta.

**Da fare:** tenerlo separato, anche nei file, dai dati derivati dalle
fonti aperte. Oggi stanno insieme in `nuova/dati/cultura/`. Separarli
serve a due cose: a poter dire con precisione cosa è nostro, e a sapere
cosa dovremmo condividere se l'ODbL ce lo chiede.

---

## LA VOCE E IL RICONOSCIMENTO

Non sono nostri e non sono nel codice: li mette il telefono — la voce di
sistema di Apple o di Google, e il loro riconoscimento vocale. Per
questo l'app non manda la voce a nessun server nostro, ed è scritto
nella pagina sulla privacy.
