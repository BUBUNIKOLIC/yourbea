#!/bin/bash
# Manda in linea LA SEMPLICE, su yourbea.it/semplice/.
# Prima il banco: se non passa, non esce niente.
cd "$(dirname "$0")/.." || exit 1
echo "=== il banco della semplice ==="
node semplice/prove/le-13-cose.js || { echo; echo "FERMO: il banco non passa."; exit 1; }
echo
MESSAGGIO="${1:-la semplice}"
git add semplice/index.html semplice/app.js semplice/avvio.js semplice/COSA-E.md \
        semplice/prove semplice/PROVA-LA-SEMPLICE.command semplice/PUBBLICA-LA-SEMPLICE.command
git commit -q -m "semplice: $MESSAGGIO" || { echo "niente da mandare"; exit 0; }
git push -q origin main || { echo "IL PUSH NON E' RIUSCITO"; exit 1; }
echo "in linea fra un minuto: https://yourbea.it/semplice/"
