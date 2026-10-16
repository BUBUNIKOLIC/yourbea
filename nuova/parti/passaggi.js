/* QUELLO CHE PASSI, MENTRE LO PASSI — Yourbea, 16/10/2026
   ============================================================
   «Serve uno strumento per avere dati su quello che c'è intorno MAN MANO
   CHE AVANZIAMO su una strada» (Vince, 16/10).

   La scena (parti/scena.js) fa il riassunto del posto: dove sei, com'è
   fatto, cosa c'è nei dintorni. Questo file fa un'altra cosa, e per chi
   non vede è quella che conta di più: dice le cose UNA PER UNA, nel
   momento in cui ci passi davanti. È la differenza fra una cartina letta
   ad alta voce e qualcuno che cammina con te.

   Non costa niente: sono gli stessi dati della mappa che già scarichiamo.

   LE REGOLE, e perché:

   1. SI DICE QUANDO CI SEI AL TRAVERSO, non quando è davanti. Una vetrina
      annunciata a quaranta metri non si trova: annunciata quando ce l'hai
      di fianco, la tocchi. Quindici metri.

   2. SOLO QUELLO CHE HA UN NOME O SERVE. «Negozio» non dice niente;
      «Farmacia Pirani» sì, e «panchina» pure, perché ci si siede.

   3. UNA COSA ALLA VOLTA, E MAI DUE VOLTE. Passando si incontra di tutto:
      si dice la più vicina, e quella cosa lì non si ripete più finché non
      si cambia strada.

   4. NON PIÙ DI UNA OGNI OTTO SECONDI. In un corso pieno di negozi
      sarebbe una filastrocca, e sopra ci deve passare la guida.

   5. DA CHE PARTE SEI GIRATO, O NIENTE. Mai i punti cardinali: a chi
      cammina non dicono niente.
*/

'use strict';

function Passaggi(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var ora = o.ora || function () { return Date.now(); };
  var TRAVERSO = o.traverso || 15;
  var OGNI = o.ogni || 8000;

  var detti = {};
  var ultimaVolta = 0;

  /* COSE CHE SI DICONO ANCHE SENZA NOME: sono utili per sé. */
  var UTILI_DA_SOLE = { panchina: 1, fontanella: 1, 'bagno pubblico': 1, 'fermata': 1,
                        "fermata dell'autobus": 1, 'fermata del tram': 1, stazione: 1,
                        'ingresso della metropolitana': 1,
                        parcheggio: 1, 'cassetta postale': 1, bancomat: 1,
                        /* quelle che si prendono addosso, o che aiutano a
                           scegliere la strada: valgono anche senza nome */
                        paletto: 1, scalini: 1, 'scivolo del marciapiede': 1, ascensore: 1 };

  function chiave(p) {
    return (p.nome || p.cosa || '?') + '@' + Math.round((p.lat || 0) * 100000) + ',' + Math.round((p.lon || 0) * 100000);
  }

  function daCheParte(qui, p, direzione, buona) {
    if (typeof direzione !== 'number' || buona === false) return null;   // REGOLA 5
    var g = verso(qui.lat, qui.lon, p.lat, p.lon);
    var r = ((g - direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 30) return 'davanti a te';
    if (r > 30) return 'sulla destra';
    return 'sulla sinistra';
  }

  function vaDetto(p) {
    if (!p || !p.servizio) return false;
    if (p.cosa === 'attraversamento') return false;      // li dice la scena, riassunti
    return !!p.nome || !!UTILI_DA_SOLE[p.cosa];          // REGOLA 2
  }

  /* prossimo(): la cosa che stai passando adesso, o null. */
  function prossimo(s) {
    var qui = s.qui, punti = s.punti || [];
    if (ora() - ultimaVolta < OGNI) return null;         // REGOLA 4

    var mig = null, dmin = Infinity;
    punti.forEach(function (p) {
      if (!vaDetto(p)) return;
      var k = chiave(p);
      if (detti[k]) return;                              // REGOLA 3
      var d = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d > TRAVERSO) return;                          // REGOLA 1
      if (d < dmin) { dmin = d; mig = p; }
    });
    if (!mig) return null;

    detti[chiave(mig)] = true;
    ultimaVolta = ora();
    var parte = daCheParte(qui, mig, s.direzione, s.direzioneBuona);
    var nome = mig.nome || capo(mig.cosa);
    /* di una scala la cosa che conta sono i gradini e il corrimano; di uno
       scivolo, se c'è il percorso tattile. Il resto è contorno. */
    if (mig.cosa === 'scalini') {
      nome = 'Scalini' + (mig.quanti ? ', ' + mig.quanti : '') + (mig.corrimano ? ', col corrimano' : '');
    }
    if (mig.cosa === 'scivolo del marciapiede' && mig.tattile) nome = 'Scivolo col percorso tattile';
    /* di una fermata la cosa che serve sono le LINEE: senza, sapere che
       c'è una fermata non ti porta da nessuna parte. */
    if (/fermata|stazione|metropolitana/.test(mig.cosa)) {
      nome = (mig.nome ? capo(mig.cosa) + ' ' + mig.nome : capo(mig.cosa));
      if (mig.linee) nome += ', ' + (String(mig.linee).indexOf(';') >= 0 ? 'linee ' : 'linea ') +
                              String(mig.linee).replace(/;/g, ', ');
      return { tipo: 'passaggio', livello: 'guida', cosa: mig,
               testo: nome + (parte ? ', ' + parte : '') + '.' };
    }
    /* se il nome non dice che cosa è, si aggiunge il tipo: «Da Mario» da
       solo non fa capire che è un bar */
    var tipo = (mig.nome && mig.cosa && mig.nome.toLowerCase().indexOf(mig.cosa.toLowerCase()) < 0)
      ? (' — ' + mig.cosa) : '';
    return { tipo: 'passaggio', livello: 'cenno', cosa: mig,
             testo: 'Stai passando ' + nome + tipo + (parte ? ', ' + parte : '') + '.' };
  }

  function capo(t) { return String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1); }

  /* stradaNuova(): si ricomincia da capo — le stesse cose, in un'altra
     strada o ripassandoci dopo, si possono ridire. */
  function stradaNuova() { detti = {}; }

  return { prossimo: prossimo, stradaNuova: stradaNuova, vaDetto: vaDetto };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Passaggi;
if (typeof window !== 'undefined') window.Passaggi = Passaggi;
