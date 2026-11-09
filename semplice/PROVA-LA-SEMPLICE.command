#!/bin/bash
# IL BANCO DELLA SEMPLICE — le tredici cose, e nient'altro.
cd "$(dirname "$0")" || exit 1
echo
echo "============ LA SEMPLICE ============"
node prove/le-13-cose.js
esito=$?
echo "====================================="
exit $esito
