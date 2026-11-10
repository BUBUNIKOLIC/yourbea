#!/bin/bash
# Prova la nuova Yourbea: tutti i banchi, nessuna rete, pochi secondi.
cd "$(dirname "$0")/.." || exit 1
echo
echo "========= LA NUOVA YOURBEA ========="
mal=0
for p in avvio chiusura lingua insieme aggancio distanza faro descrizione percorsiMiei postiMiei avanzamento fermate aChiServe paesaggio modi pronuncia voce racconto posizione intorno clip emergenza-guida mappa dettatura scena incroci passaggi negozi passeggiata musica sveglia lettura pulizia pagina dati chiamate camminata guidami portami-a-casa contributi latina corazzieri stamattina corazzieri-mezzogiorno corazzieri-una mattina-1-11 dagli-altri laurentina-2-11 chiesa-ancora-2-11 macchina-3-11 menu-3-11 comandi-a-voce-3-11 modelli-4-11 fitto-4-11 arte-4-11 parla ilNome metro fermati-sigillato farmacia-6-11 turno onesti-8-11 segnalazioni-8-11 bussola-9-11; do
  echo
  echo "— $p —"
  node nuova/prove/$p.js || mal=1
done
echo
echo "===================================="
if [ "$mal" = 0 ]; then echo "TUTTO A POSTO."; else echo "C'E' QUALCOSA DA SISTEMARE."; fi
echo

# E LE CAMMINATE VERE. Quando Vince manda il diario di una camminata
# andata storta, si salva in nuova/prove/camminate/ e da quel momento il
# banco la rifa' a ogni giro: quel difetto non puo' piu' tornare.
if ls nuova/prove/camminate/*.txt >/dev/null 2>&1; then
  echo
  echo "— camminate vere —"
  node nuova/prove/rifai-la-camminata.js || mal=1
fi
