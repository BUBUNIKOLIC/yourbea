#!/bin/bash
# Prova la nuova Yourbea: tutti i banchi, nessuna rete, pochi secondi.
cd "$(dirname "$0")/.." || exit 1
echo
echo "========= LA NUOVA YOURBEA ========="
mal=0
for p in chiusura lingua insieme aggancio distanza faro descrizione percorsiMiei postiMiei avanzamento fermate aChiServe paesaggio modi pronuncia voce racconto posizione intorno clip emergenza-guida mappa dettatura scena incroci passaggi negozi passeggiata musica lettura pulizia pagina dati chiamate camminata guidami portami-a-casa contributi; do
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
