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

  /* LE PARENTESI NON SI LEGGONO AD ALTA VOCE. Dal quaderno del 21/10:
     «Qui c'è Laurentina (metropolitana di Roma)». Una parentesi, detta, o
     diventa una pausa storta o la voce ci legge dentro il nome con un tono
     che non c'entra. Una persona direbbe «Laurentina, metropolitana di
     Roma»: la parentesi e' una virgola, e basta.
     Resta nel testo scritto sullo schermo, dove serve. */
  function senzaParentesi(t) {
    return String(t)
      .replace(/\s*\(([^)]{2,60})\)\s*$/g, ', $1')
      .replace(/\s*\(([^)]{2,60})\)/g, ', $1,')
      .replace(/\s*,\s*,/g, ',')
      .replace(/\s+,/g, ',')
      .replace(/,\s*([.!?])/g, '$1');
  }

  function sistema(testo) {
    if (!testo) return testo;
    return senzaParentesi(String(testo)).replace(/[A-Za-zÀ-ÿ]+/g, function (p) {
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

  return { sistema: sistema, senzaParentesi: senzaParentesi, quante: function () { return Object.keys(COME).length; } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Pronuncia;
if (typeof window !== 'undefined') window.Pronuncia = Pronuncia;
