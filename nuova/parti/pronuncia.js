/* COME SI LEGGONO LE PAROLE — Yourbea, 16/10/2026
   ============================================================
   La voce del telefono indovina l'accento dalla grafia, e su certe parole
   sbaglia. Camminando, Vince ha sentito «percorso tattile» letto male —
   «e i semafori, i ristoranti, i bar» andavano bene, quello no.

   La cura è semplice e vecchia: si scrive la parola CON l'accento. I
   sintetizzatori italiani lo rispettano, e l'accento scritto non si sente
   come accento, si sente come la parola detta giusta.

   DUE REGOLE:
   1. SI TOCCA SOLO QUELLO CHE SBAGLIA. Ogni parola aggiunta qui è un
      rischio: se la voce la leggeva bene, l'accento la fa peggiorare.
   2. LE PAROLE CHE CAMBIANO SENSO VENGONO PRIMA DI TUTTE. «Ancòra» è di
      nuovo, «àncora» è quella della nave — e «ancora» è il comando che
      l'app usa cento volte al giorno.
*/

'use strict';

function Pronuncia(opzioni) {
  var o = opzioni || {};

  /* parola scritta -> come va detta. Si confronta senza maiuscole e si
     rimette la maiuscola se c'era. */
  var COME = o.come || {
    /* QUELLE CHE CAMBIANO SENSO — vengono prima di tutte */
    'ancora': 'ancòra',          // di nuovo, non quella della nave
    'ancore': 'ancòre',
    /* QUELLE CHE LA VOCE SBAGLIA DAVVERO, e che l'app dice spesso.
       Contate nella traccia di una giornata vera: «scivolo» 28 volte,
       «tattile» a ogni attraversamento col percorso per non vedenti. */
    'tattile': 'tàttile',
    'tattili': 'tàttili',
    'scivolo': 'scìvolo',
    'scivoli': 'scìvoli',
    'mobili': 'mòbili',
    'principi': 'prìncipi',
    'subito': 'sùbito',
    'abitano': 'àbitano',
    'abside': 'àbside',
    'absidi': 'àbsidi',
    'basilica': 'basìlica',
    'basiliche': 'basìliche',
    'cupola': 'cùpola',
    'cupole': 'cùpole',
    'portico': 'pòrtico',
    'portici': 'pòrtici',
    'nuvola': 'nùvola'
    /* NON si mettono qui: facciata, altare, navata, campanile, chiostro,
       statua, edificio. La voce le legge bene, e ogni accento scritto in
       più è un modo di peggiorare una parola che andava. Era la regola
       scritta due righe sopra, e l'avevo già tradita io. */
  };

  function sistema(testo) {
    if (!testo) return testo;
    return String(testo).replace(/[A-Za-zÀ-ÿ]+/g, function (p) {
      var k = p.toLowerCase();
      var giusta = COME[k];
      if (!giusta) return p;
      /* la maiuscola si conserva: a inizio frase «Ancòra» resta «Ancòra» */
      if (p[0] === p[0].toUpperCase() && p[0] !== p[0].toLowerCase()) {
        return giusta.charAt(0).toUpperCase() + giusta.slice(1);
      }
      return giusta;
    });
  }

  return { sistema: sistema, quante: function () { return Object.keys(COME).length; } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Pronuncia;
if (typeof window !== 'undefined') window.Pronuncia = Pronuncia;
