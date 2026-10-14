#!/bin/bash
# Prova tutta l'app prima di consegnarla a qualcuno.
# Si lancia con un doppio clic, oppure:  ./PROVA-TUTTO.command
# Nessuna rete, nessun telefono: dura qualche secondo.
cd "$(dirname "$0")" || exit 1

echo
echo "================ PROVA DI YOURBEA ================"
echo
mal=0

echo "— la pagina —"
node prove/pagina.js || mal=1
echo
echo "— la voce (clip, turni, blocchi) —"
node prove/voce.js || mal=1
echo
echo "— le clip incise —"
node prove/clip.js || mal=1
echo
echo "— le coordinate —"
node prove/coordinate.js || mal=1
echo
echo "=================================================="
if [ "$mal" = 0 ]; then
  echo "TUTTO A POSTO: si può consegnare."
else
  echo "C'E' QUALCOSA DA SISTEMARE: guarda le righe che cominciano con NO."
fi
echo
