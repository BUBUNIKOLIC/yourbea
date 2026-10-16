#!/bin/bash
# I monumenti di tutte le città della lista, da Wikidata e Wikipedia.
cd "$(dirname "$0")"
grep -v '^#' citta-italiane.txt | grep -v '^$' | while read -r nome a b c d; do
  [ -z "$d" ] && continue
  # NIENTE PIU' «GIA' FATTA». Il 16/10 la lista delle classi e' passata da 19
  # a 63 — mancava perfino «palazzo» — quindi tutte le citta' vanno rifatte,
  # Firenze compresa. Lo script aggiunge e non cancella: rifarla non perde
  # niente di quello che c'e' gia'.
  if ! python3 prendi-monumenti.py "$nome" "$a" "$b" "$c" "$d"; then
    echo "!! FALLITA: $nome" >> fallite.txt      # si grida, non si va avanti zitti
  fi
  sleep 2                                    # gentili con Wikidata
done
for c in "roma 12.35 12.65 41.78 42.00" "napoli 14.14 14.34 40.80 40.92" "parma 10.28 10.38 44.76 44.84" \
         "latina 12.86 12.95 41.43 41.50" "spoleto 12.70 12.78 42.71 42.76" "torre-del-greco 14.33 14.40 40.75 40.81"; do
  if ! python3 prendi-monumenti.py $c; then
    echo "!! FALLITA: $c" >> fallite.txt
  fi
  sleep 2
done
echo "— in tutto:"; du -sh ../nuova/dati/cultura; ls ../nuova/dati/cultura | wc -l
