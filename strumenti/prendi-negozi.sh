#!/bin/bash
# PRENDI I NEGOZI DI UNA CITTÀ — Yourbea, 16/10/2026
# ===================================================
# «Usiamo tutto quello che c'è nel web per arricchire le nostre mappe»
# (Vince). Questo prende i luoghi di Overture Maps — dati aperti della
# fondazione Linux, dentro ci sono Meta, Microsoft, Amazon e TomTom — e ne
# ricava i file di una città per Yourbea. Gratis e senza chiavi.
#
# Perché Overture e non solo OpenStreetMap: per i NEGOZI ha molto di più —
# in Italia quasi cinque milioni di luoghi, tutti col nome, spesso con
# l'indirizzo e il civico. Per scalini, scivoli e semafori acustici resta
# OpenStreetMap, che è l'unica a mapparli: le due cose si sommano.
#
# A QUADRETTI, NON A CITTÀ. Roma intera sono 201.000 luoghi e 27 MB: un
# telefono non se li porta dietro, e scaricarli tutti per sapere cosa c'è
# all'angolo è uno spreco. Si taglia in quadretti di due centesimi di
# grado — poco più di due chilometri — e l'app prende solo quello dove sei
# e i vicini. Un quadretto di centro città sta sotto i 200 KB.
#
#   ./prendi-negozi.sh roma 12.35 12.65 41.78 42.00
#                      nome lon-min lon-max lat-min lat-max
set -e
NOME="$1"; XMIN="$2"; XMAX="$3"; YMIN="$4"; YMAX="$5"
[ -z "$YMAX" ] && { echo "serve: nome lon-min lon-max lat-min lat-max"; exit 1; }
VERSIONE="2026-09-23.1"
QUI="$(cd "$(dirname "$0")" && pwd)"
CARTELLA="$QUI/../nuova/dati/negozi"
mkdir -p "$CARTELLA"
GREZZO="/tmp/yourbea-negozi-$NOME.json"

duckdb -c "
INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';
COPY (
  SELECT
    names.primary        AS n,
    basic_category       AS t,
    round(bbox.ymin, 5)  AS lat,
    round(bbox.xmin, 5)  AS lon,
    addresses[1].freeform AS a
  FROM read_parquet('s3://overturemaps-us-west-2/release/$VERSIONE/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN $XMIN AND $XMAX
    AND bbox.ymin BETWEEN $YMIN AND $YMAX
    AND names.primary IS NOT NULL
    -- sotto la metà di fiducia sono quasi sempre doppioni o roba chiusa
    AND confidence >= 0.5
    -- quello che non si incontra camminando non serve a nessuno
    AND basic_category NOT IN ('business_to_business','professional_services',
        'structure_and_geography','religious_organization','community_services_non_profits')
) TO '$GREZZO' (FORMAT JSON, ARRAY true);
"
python3 "$QUI/taglia-a-quadretti.py" "$GREZZO" "$CARTELLA" "$NOME"
rm -f "$GREZZO"
