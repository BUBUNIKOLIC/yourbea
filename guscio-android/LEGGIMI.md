# Il guscio Android di Yourbea

L'app vera è la pagina: <https://bubunikolic.github.io/yourbea/nuova/>.
Questo è il guscio, e fa soltanto le cose che una pagina web non può fare.

## Perché non bastava l'apk di ottobre

`Yourbea.apk` del 14/10/2026 è una **TWA** (Trusted Web Activity): Chrome
senza i bordi. Pacchetto `it.vdmdata.urbea`, lo stesso di questo — e va
tenuto, o su Google Play diventa una seconda app e chi aveva installato
la prima non riceve più niente.

Una TWA non può fare tre cose, e sono tre cose che servono:

1. **Vendere.** Il pass di sette giorni ha bisogno di Google Play Billing.
2. **Tenere il GPS acceso col telefono in tasca.** Android lo spegne
   appena lo schermo si spegne, se non c'è un servizio in primo piano.
3. **Parlare.** Il WebView di Android **non ha `speechSynthesis`** — è
   una cosa di Chrome, non del WebView. Senza rattoppo la pagina trova
   `!window.speechSynthesis`, chiama subito `quandoFinisce()` e **non dice
   mai niente**: un'app per non vedenti, muta.

## Come si compila

```
export JAVA_HOME=$(brew --prefix)/opt/openjdk@17
export ANDROID_HOME=$(brew --prefix)/share/android-commandlinetools
gradle assembleDebug          # con Gradle 8.11.1, non il 9
```
L'apk esce in `app/build/outputs/apk/debug/`.

Il 9 non va: l'Android Gradle Plugin 8.7 vuole il ramo 8.

## Cosa c'è dentro

| file | cosa fa |
|---|---|
| `Guscio.kt` | il WebView, il ponte, la voce, il microfono, il GPS, la rubrica, TalkBack, la prossimità, il quaderno |
| `Acquisti.kt` | Play Billing: il pass di 7 giorni, i giorni che si sommano |
| `ServizioCammino.kt` | il servizio in primo piano che tiene vivo il GPS |

Il ponte ha **le stesse funzioni con le stesse firme** del guscio iPhone
(`guscio-ios/Yourbea/Guscio.swift`): la pagina non sa su quale telefono
sta, e non deve saperlo.

## Quello che su Android ancora NON c'è

**La lettura dei cartelli.** Su iPhone la fa Vision, dentro il sistema e
gratis. Qui servirebbe ML Kit. Per ora `window.urbeaSaLeggere` resta
spenta, e la pagina si accorge da sé che non c'è: non offre la lettura
invece di offrirla e non farla.

## Prima di vendere, su Play Console

1. Creare il prodotto **a consumo** (in-app product, non abbonamento) con
   id esatto `it.vdmdata.urbea.turismo.settimana`.
2. Metterci il prezzo. **Il prezzo non sta scritto nel codice**: il guscio
   lo legge dal Play Store (`formattedPrice`) e lo passa alla pagina.
3. Caricare un apk firmato con la chiave di rilascio (adesso
   `signingConfig` è quella di prova: va bene per provarla sul telefono,
   non per lo Store).
