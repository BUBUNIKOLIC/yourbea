#!/bin/bash
# Tutte le città della lista, una dopo l'altra.
# Serve a riempire la mappa dell'Italia man mano, come ha chiesto Vince.
cd "$(dirname "$0")"
grep -v '^#' citta-italiane.txt | grep -v '^$' | while read -r nome a b c d; do
  [ -z "$d" ] && continue
  ./prendi-negozi.sh "$nome" "$a" "$b" "$c" "$d" 2>&1 | tail -1
done
echo "— in tutto:"; du -sh ../nuova/dati/negozi; ls ../nuova/dati/negozi | wc -l
