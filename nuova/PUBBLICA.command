#!/bin/bash
# PUBBLICA LA NUOVA YOURBEA
# Alza il numero di versione sui file, prova tutto, e solo se è tutto a posto
# manda in linea. Il numero serve perché browser e telefoni tengono i file
# vecchi anche per dieci minuti: senza, si corregge un difetto, si pubblica,
# si riapre e si sente ancora quello di prima.
cd "$(dirname "$0")/.." || exit 1
vecchia=$(grep -o 'v=[0-9]\+' nuova/index.html | head -1 | cut -d= -f2)
nuova=$((vecchia + 1))
# il ?v= su ogni file della pagina, con le virgolette di qualunque tipo
sed -i '' "s/?v=$vecchia\([\"']\)/?v=$nuova\1/g" nuova/index.html
# e lo STESSO numero come nome della cassaforte del service worker: se i due
# si scollano, la cassaforte resta quella di ieri e il provatore sente il
# difetto corretto ieri. nuova/prove/pagina.js non lascia pubblicare se
# non coincidono, quindi un numero dimenticato qui blocca la pubblicazione.
sed -i '' "s/^const VERSIONE = $vecchia;/const VERSIONE = $nuova;/" nuova/sw.js
echo "versione $vecchia → $nuova (pagina e cassaforte)"
./nuova/PROVA-LA-NUOVA.command | tee /tmp/prove-yourbea.txt
grep -q "TUTTO A POSTO" /tmp/prove-yourbea.txt || { echo "NON pubblico: qualcosa non passa."; exit 1; }
# NON `git add -A`: il 16/10 si e' portato dentro il guscio iOS lasciato a
# meta' da chi ci stava lavorando in quel momento, e l'ha committato con il
# messaggio di un'altra cosa. Qui si pubblica il sito, e il sito e' questo:
# privacy.html fa parte del sito dal 25/10: Apple e Google chiedono un
# indirizzo pubblico dove sta scritto cosa l'app fa dei dati, e la prima
# volta e' rimasta fuori da questa riga — pubblicata la home, la privacy
# rispondeva 404.
# scarica.html e l'apk: dal 26/10 i tester Android prendono il file da
# yourbea.it/Yourbea.apk, e la pagina spiega come si fa sui due telefoni.
git add nuova sw.js index.html privacy.html segnalazioni.html scarica.html LICENSE CREDITI-E-LICENZE.md Yourbea.apk CNAME manifest.webmanifest icons 2>/dev/null
echo "— quello che va in linea —"
git diff --cached --name-only | sed 's/^/   /'
fuori=$(git status --short | grep -v '^[MARD]' | grep -v '^??' | sed 's/^/   /')
[ -n "$fuori" ] && { echo "— lasciato fuori (lo pubblica chi ci sta lavorando) —"; echo "$fuori"; }
git diff --cached --quiet && { echo "niente da pubblicare."; exit 0; }
git commit -q -m "${1:-Nuova Yourbea: versione $nuova}" || {
  echo "NON PUBBLICATO: il commit non è riuscito."
  exit 1
}

# IL PUSH SI GUARDA, NON SI SPERA (26/10/2026).
# Prima questa riga era `git push -q origin HEAD` seguita da un echo
# «in linea» che usciva comunque: quel giorno GitHub aveva messo due
# commit suoi sul repository (togliendo e rimettendo il dominio per il
# certificato), il push è stato rifiutato — «Note about fast-forwards» —
# e il comando ha detto lo stesso che era tutto in linea. Una correzione
# data per pubblicata e rimasta sul Mac è peggio di un errore: nessuno
# la cerca più.
if ! git push origin HEAD 2>/tmp/yourbea-push.txt; then
  echo "— il push è stato rifiutato, provo a prendere quello che c'è su GitHub —"
  if git pull --rebase origin "$(git rev-parse --abbrev-ref HEAD)" >/dev/null 2>&1 \
     && git push origin HEAD >/dev/null 2>&1; then
    echo "  risolto: c'erano commit nuovi sul repository, li ho messi sotto i miei."
  else
    echo ""
    echo "NON PUBBLICATO. Quello che hai corretto è rimasto sul Mac."
    echo "Git dice:"
    sed 's/^/   /' /tmp/yourbea-push.txt
    echo ""
    echo "Di solito: ci sono modifiche non salvate (git status) oppure"
    echo "il repository su GitHub è andato avanti e va unito a mano."
    rm -f /tmp/yourbea-push.txt
    exit 1
  fi
fi
rm -f /tmp/yourbea-push.txt
echo "in linea: https://bubunikolic.github.io/yourbea/nuova/"
