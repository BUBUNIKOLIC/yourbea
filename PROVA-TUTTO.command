#!/bin/bash
# Prova tutta l'app prima di consegnarla a qualcuno.
# Si lancia con un doppio clic, oppure:  ./PROVA-TUTTO.command
#
#   senza argomenti   pochi secondi, nessuna rete: pagina, voce, clip, coordinate
#   --rete            aggiunge i due controlli che hanno bisogno di rete:
#                     le coordinate contro Wikidata, e se la versione è
#                     davvero quella che i telefoni scaricano
#   --rete --tutti    rimisura su Wikidata anche i luoghi già misurati
cd "$(dirname "$0")" || exit 1

RETE=0; TUTTI=""
for a in "$@"; do
  [ "$a" = "--rete" ] && RETE=1
  [ "$a" = "--tutti" ] && TUTTI="--tutti"
done

echo
echo "================ PROVA DI YOURBEA ================"
echo
mal=0

echo "— la pagina —"
node prove/pagina.js || mal=1
echo
echo "— la voce (clip, turni, blocchi, priorità) —"
node prove/voce.js || mal=1
echo
echo "— le clip incise —"
node prove/clip.js || mal=1
echo
echo "— le coordinate —"
node prove/coordinate.js || mal=1
node prove/schede-al-posto-giusto.js || mal=1
echo
echo "— chi non vede: lettore di schermo e una voce sola —"
node prove/lettore-di-schermo.js || mal=1
node prove/una-voce-sola.js || mal=1
echo
echo "— il microfono: l'app non deve sentire se stessa —"
node prove/non-si-ascolta-da-sola.js || mal=1

if [ "$RETE" = 1 ]; then
  echo
  echo "— le coordinate contro Wikidata (serve rete) —"
  node prove/wikidata.js $TUTTI || mal=1
  echo
  echo "— i servizi: 41 tipi su piu' citta' (serve rete) —"
  node prove/servizi.js || mal=1
  echo
  echo "— quello che i telefoni scaricano davvero (serve rete) —"
  node prove/in-linea.js || mal=1
else
  echo
  echo "(saltati i due controlli con la rete: per farli, ./PROVA-TUTTO.command --rete)"
fi

echo
echo "=================================================="
if [ "$mal" = 0 ]; then
  echo "TUTTO A POSTO: si può consegnare."
else
  echo "C'E' QUALCOSA DA SISTEMARE: guarda le righe che cominciano con NO."
fi
echo
