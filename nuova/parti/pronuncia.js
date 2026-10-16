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
    // quelle che cambiano senso
    'ancora': 'ancòra',
    'ancore': 'ancòre',
    // quelle che la voce sbaglia e basta
    'tattile': 'tàttile',
    'tattili': 'tàttili',
    'mobili': 'mòbili',
    'subito': 'sùbito',
    'principi': 'prìncipi',
    'tenere': 'tenére',
    'dedica': 'dèdica',
    'abitano': 'àbitano',
    'edificio': 'edifìcio',
    'nuvola': 'nùvola',
    'portico': 'pòrtico',
    'portici': 'pòrtici',
    'cupola': 'cùpola',
    'cupole': 'cùpole',
    'basilica': 'basìlica',
    'basiliche': 'basìliche',
    'facciata': 'facciàta',
    'arcata': 'arcàta',
    'altare': 'altàre',
    'abside': 'àbside',
    'absidi': 'àbsidi',
    'navata': 'navàta',
    'cripta': 'crìpta',
    'battistero': 'battistèro',
    'campanile': 'campanìle',
    'chiostro': 'chiòstro',
    'loggia': 'lòggia',
    'nicchia': 'nìcchia',
    'statua': 'stàtua',
    'statue': 'stàtue'
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
