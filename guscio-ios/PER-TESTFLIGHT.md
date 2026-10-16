# Yourbea su TestFlight — cosa resta da fare

Scritto il 16 ottobre 2026. Il pacchetto è già pronto: questo foglio dice
solo cosa devi premere tu, nell'ordine.

---

## Com'è adesso

Il pacchetto da mandare ad Apple è questo file:

    guscio-ios/build/export/Yourbea.ipa        (408 KB)

Dentro c'è: **versione 2.0.0, build 3**, firmata per la distribuzione
(«Apple Distribution: VINCENZO DI MEGLIO»), con l'icona 1024 senza
trasparenza, e la risposta sulla crittografia già dentro — quella domanda
non te la farà.

Su App Store Connect l'app **esiste già**: si chiama
*URBEA- un mueso intorno*, numero 6822450677. E c'è già salita una build
il 13 ottobre (build 2, versione 1.0.0): per questo la nuova è la build 3,
due pacchetti non possono avere lo stesso numero.

Ci sono già anche due gruppi di prova:

- **Staff** — gruppo interno, 0 persone dentro. La build 2 è in questo gruppo.
- **Famiglie** — gruppo esterno, con il link pubblico già acceso:
  https://testflight.apple.com/join/dsC2feyj — nessun build assegnato.

---

## Passo 1 — mandare il pacchetto ad Apple

Un comando solo, da incollare nel terminale:

```bash
cd "$HOME/Desktop/ARCHIVIO DESKTOP/vdm-app" && xcrun altool --upload-app -t ios \
  -f "$HOME/Desktop/ARCHIVIO DESKTOP/URBEA/guscio-ios/build/export/Yourbea.ipa" \
  --apiKey $(grep '^CHIAVE=' chiavi/notarizzazione.txt | cut -d= -f2) \
  --apiIssuer $(grep '^EMITTENTE=' chiavi/notarizzazione.txt | cut -d= -f2)
```

Sono 408 KB, ci mette meno di un minuto. Devi leggere l'ultima riga:
**`UPLOAD SUCCEEDED with no errors`**. Se in mezzo scrive `WILL RETRY PART`
o «connessione persa», non conta niente: riprova da sola.

**Caricare non manda niente in prova.** Dopo questo comando la build sta
lì e basta. Tutto il resto si fa nel browser.

---

## Passo 2 — aspettare che Apple la digerisca

Dieci, quindici minuti. Lo stato si guarda da qui, senza aprire il browser:
quando dice `VALID` è pronta.

```bash
cd "$HOME/Desktop/ARCHIVIO DESKTOP/vdm-app" && APPLE_API_KEY_ID=$(grep '^CHIAVE=' chiavi/notarizzazione.txt | cut -d= -f2) APPLE_API_ISSUER=$(grep '^EMITTENTE=' chiavi/notarizzazione.txt | cut -d= -f2) APPLE_P8="chiavi/AuthKey_$(grep '^CHIAVE=' chiavi/notarizzazione.txt | cut -d= -f2).p8" node strumenti/stato-apple.js GET "/v1/builds?filter%5Bapp%5D=6822450677&limit=3&fields%5Bbuilds%5D=version,processingState,uploadedDate"
```

---

## Passo 3 — scegliere chi prova, e qui c'è un bivio

Dario, tua sorella e Gabri possono entrare in due modi diversi. Non sono
uguali: uno è immediato, l'altro passa da Apple.

### A) Gruppo interno «Staff» — subito, senza Apple in mezzo

La build si può dare al gruppo interno **appena è VALID**, senza nessuna
verifica e senza aspettare. Il prezzo è questo: chi prova deve diventare
un utente del tuo account Apple (App Store Connect → Utenti e accessi →
il **+** → nome, cognome, la loro mail Apple, ruolo *Tester*). Gli arriva
un invito da accettare, e dopo vedono Yourbea in TestFlight.

Fino a 100 persone. **È la strada giusta per tre o quattro amici.**

### B) Gruppo esterno «Famiglie» — col link, ma Apple la guarda prima

Il link https://testflight.apple.com/join/dsC2feyj è già acceso: si manda
e chi lo apre si installa l'app da solo, senza entrare nel tuo account.
Ma la **prima build** che metti in un gruppo esterno passa dalla
*verifica beta* di Apple: uno o due giorni, e può anche essere rifiutata.

Per questa strada servono prima tre cose che adesso sono vuote
(App Store Connect → TestFlight):

1. **Informazioni sui test** — mail per i commenti e due righe su cos'è
   l'app. Testo pronto da incollare:

   > Yourbea racconta a voce dov'è chi cammina e cosa ha intorno. È fatta
   > per chi non vede: si usa con lo schermo spento, il telefono in tasca,
   > e si comanda parlando («dove sono», «approfondisci», «portami a»).

2. **Cosa provare** — anche questo pronto:

   > Cammina per strada col telefono in tasca e lo schermo spento: l'app
   > deve continuare a dirti dove sei. Prova a chiedere a voce «dove
   > sono», «approfondisci» e «portami a» seguito da una via.

3. **Contatto per la verifica** — nome, cognome, telefono e mail tue, nella
   pagina *Informazioni verifica app beta*.

---

## Passo 4 — attaccare la build al gruppo

TestFlight → il gruppo (*Staff* o *Famiglie*) → **Build** → il **+** →
scegli *2.0.0 (3)* → Aggiungi. Da quel momento ai tester arriva l'avviso.

Se hai scelto il gruppo esterno, qui parte la verifica di Apple e lo stato
diventa *In attesa di verifica*.

---

## Le due cose da sapere prima di cominciare

**1. Il nome che vedono i tester è ancora quello vecchio:**
*URBEA- un mueso intorno* (con «mueso» invece di «museo»). Si cambia a mano
in App Store Connect, nella scheda dell'app, e **io non posso cambiarlo**:
la chiave API legge, non scrive. Se vuoi che agli amici arrivi «Yourbea»,
va cambiato prima.

**2. È un guscio attorno a un sito, e Apple a volte questo lo rifiuta.**
Il guscio non ha schermate sue: apre la pagina. Per la verifica beta di un
gruppo esterno può non bastare (è la regola 4.2 di Apple, «funzionalità
minima»). Per il gruppo **interno** la domanda non si pone: nessuno la
guarda. Un motivo in più per cominciare da lì.

---

## Se devi rifare il pacchetto da zero

Tre comandi, in questa cartella. Prima alza di uno
`CURRENT_PROJECT_VERSION` dentro `project.yml` (ogni pacchetto mandato ad
Apple vuole un numero nuovo).

```bash
cd "$HOME/Desktop/ARCHIVIO DESKTOP/URBEA/guscio-ios" && xcodegen generate && xcodebuild -project Yourbea.xcodeproj -scheme Yourbea -configuration Release -destination 'generic/platform=iOS' -archivePath build/Yourbea.xcarchive -derivedDataPath build archive && xcodebuild -exportArchive -archivePath build/Yourbea.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath build/export
```

Deve finire con `** EXPORT SUCCEEDED **`.

---

## Cosa ho provato io, e cosa no

**Provato davvero, qui sul Mac:**

- l'archivio Release si fa senza errori;
- l'`.ipa` esce e si apre: dentro c'è versione 2.0.0, build 3, bundle
  `it.vdmdata.urbea`, minimo iOS 16;
- la firma è quella di distribuzione, non di sviluppo
  (`codesign` dice *Apple Distribution: VINCENZO DI MEGLIO*, con
  `get-task-allow` falso e `beta-reports-active` vero: è il profilo
  TestFlight giusto);
- l'icona 1024×1024 è dentro il pacchetto e **non ha trasparenza**;
- l'avviso di Xcode sui versi dello schermo è sparito: l'app ora è solo
  iPhone (con l'iPad dentro, Apple pretende tutti i versi e la finestra
  ridotta, e Yourbea è verticale).

**NON provato, perché vuol dire toccare l'account:**

- la salita ad Apple (passo 1) e quindi se Apple accetta il pacchetto.
  Il controllo vero lo fa Apple quando arriva: errori possibili sono i
  permessi scritti male o chiavi mancanti nell'Info.plist, e quelli li ho
  guardati uno per uno, ma «guardati» non è «provati»;
- la verifica beta di Apple per il gruppo esterno;
- l'installazione su un telefono che non è il tuo.
