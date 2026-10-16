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
git add nuova sw.js index.html vecchia.html manifest.webmanifest icons prove PROVA-TUTTO.command 2>/dev/null
echo "— quello che va in linea —"
git diff --cached --name-only | sed 's/^/   /'
fuori=$(git status --short | grep -v '^[MARD]' | grep -v '^??' | sed 's/^/   /')
[ -n "$fuori" ] && { echo "— lasciato fuori (lo pubblica chi ci sta lavorando) —"; echo "$fuori"; }
git diff --cached --quiet && { echo "niente da pubblicare."; exit 0; }
git commit -q -m "${1:-Nuova Yourbea: versione $nuova}" && git push -q origin HEAD
echo "in linea: https://bubunikolic.github.io/yourbea/nuova/"
