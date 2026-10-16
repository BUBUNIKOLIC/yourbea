#!/bin/bash
# I monumenti di tutte le città della lista, da Wikidata e Wikipedia.
cd "$(dirname "$0")"
grep -v '^#' citta-italiane.txt | grep -v '^$' | while read -r nome a b c d; do
  [ -z "$d" ] && continue
  [ "$nome" = "firenze" ] && continue        # già fatta
  python3 prendi-monumenti.py "$nome" "$a" "$b" "$c" "$d" 2>&1 | tail -1
  sleep 2                                    # gentili con Wikidata
done
for c in "roma 12.35 12.65 41.78 42.00" "napoli 14.14 14.34 40.80 40.92" "parma 10.28 10.38 44.76 44.84" \
         "latina 12.86 12.95 41.43 41.50" "spoleto 12.70 12.78 42.71 42.76" "torre-del-greco 14.33 14.40 40.75 40.81"; do
  python3 prendi-monumenti.py $c 2>&1 | tail -1
  sleep 2
done
echo "— in tutto:"; du -sh ../nuova/dati/cultura; ls ../nuova/dati/cultura | wc -l
