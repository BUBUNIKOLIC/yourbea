#!/bin/bash
# Prova la nuova Yourbea: tutti i banchi, nessuna rete, pochi secondi.
cd "$(dirname "$0")/.." || exit 1
echo
echo "========= LA NUOVA YOURBEA ========="
mal=0
for p in insieme aggancio distanza faro descrizione percorsiMiei postiMiei fermate aChiServe paesaggio modi pronuncia voce racconto posizione intorno clip emergenza-guida mappa dettatura scena incroci passaggi negozi passeggiata musica lettura pulizia pagina dati chiamate camminata; do
  echo
  echo "— $p —"
  node nuova/prove/$p.js || mal=1
done
echo
echo "===================================="
if [ "$mal" = 0 ]; then echo "TUTTO A POSTO."; else echo "C'E' QUALCOSA DA SISTEMARE."; fi
echo
