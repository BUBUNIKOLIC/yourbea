#!/bin/bash
# PUBBLICA LA NUOVA YOURBEA
# Alza il numero di versione sui file, prova tutto, e solo se è tutto a posto
# manda in linea. Il numero serve perché browser e telefoni tengono i file
# vecchi anche per dieci minuti: senza, si corregge un difetto, si pubblica,
# si riapre e si sente ancora quello di prima.
cd "$(dirname "$0")/.." || exit 1
vecchia=$(grep -o 'v=[0-9]\+' nuova/index.html | head -1 | cut -d= -f2)
nuova=$((vecchia + 1))
sed -i '' "s/?v=$vecchia\"/?v=$nuova\"/g" nuova/index.html
echo "versione $vecchia → $nuova"
./nuova/PROVA-LA-NUOVA.command | tee /tmp/prove-yourbea.txt
grep -q "TUTTO A POSTO" /tmp/prove-yourbea.txt || { echo "NON pubblico: qualcosa non passa."; exit 1; }
git add -A && git commit -q -m "${1:-Nuova Yourbea: versione $nuova}" && git push -q origin HEAD
echo "in linea: https://bubunikolic.github.io/yourbea/nuova/"
