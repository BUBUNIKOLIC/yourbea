/* A CHI SERVE QUESTA COSA — Yourbea, 19/10/2026
   ============================================================
   «Non m'interessa ciò che è dentro, voglio ci sia la regola» (Vince).

   Fin qui la regola c'era, ma sparsa: un «se modo è servizi» qui, un «se
   modo è cultura» là, e ogni volta che se ne aggiungeva uno il confine si
   spostava di un pezzo senza che nessuno lo decidesse. Infatti si era
   spostato: in Utilità l'app leggeva le schede storiche del PalArgento e
   dello zoo di Napoli, e Vince ha detto la cosa giusta — «non c'è
   differenza tra modalità utilità e modalità turismo».

   Qui la regola sta scritta una volta sola, in una tabella, e chiunque
   voglia dire qualcosa passa da qui. Se domani il confine cambia, cambia
   in questo file e basta.

   ============================================================
   LA REGOLA, in parole sue
   ============================================================
   UTILITÀ — «un non vedente vuole sapere cosa c'è: davanti hai il
     municipio, lo stadio, oltre le fermate dell'autobus», «qualche numero
     civico», «ed anche la descrizione della realtà».
       → i punti che ORIENTANO (municipio, stadio, ospedale, stazione,
         mercato, le fermate), detti per quello che SONO;
       → la DESCRIZIONE della realtà intorno (com'è fatto il posto, gli
         alberi, il paesaggio);
       → gli AVVISI;
       → QUALCHE numero civico, non a raffica;
       → la storia solo SE LA CHIEDI.

   TURISMO — «vuole sapere le cose artistiche, storiche e architettoniche,
     le principali emergenze, gli edifici che spiccano», «monumenti,
     percorsi eccetera».
       → le SCHEDE dei monumenti, cosa vedere, l'approfondimento;
       → le PASSEGGIATE a tappe;
       → la descrizione della realtà e gli avvisi restano, perché chi non
         vede non smette di non vedere quando fa il turista.

   TUTTE E DUE, SEMPRE — gli avvisi e la strada. «Importanti sono gli
     avvisi»: chi sceglie una modalità non sta scegliendo di inciampare.

   E SOPRA TUTTO, LA REGOLA DEL MOVIMENTO — «eravamo in autostrada e dava
     gli incroci… non è il particolare, è la regola generale»: tutto
     quello che si misura in passi vale solo se i passi li stai facendo.
     Il paesaggio fa il contrario: più vai forte, più lontano si guarda.
*/

'use strict';

function AChiServe() {

  /* la tabella: per ogni tipo di cosa che l'app può dire, a chi serve e se
     regge il movimento. Quello che non è qui dentro si dice sempre: sono
     le risposte ai comandi, e a quelle non si mette un filtro. */
  var REGOLA = {
    /*                        utilità  turismo  anche-non-a-piedi */
    'avviso':               [ true,    true,    true  ],
    'strada':               [ true,    true,    true  ],
    'paesaggio':            [ true,    true,    true  ],
    'aCosaServe':           [ true,    false,   false ],
    'orientamento':         [ true,    true,    false ],
    'civico':               [ true,    false,   false ],
    'scena':                [ true,    true,    false ],
    'lati':                 [ true,    true,    false ],
    'passaggio':            [ true,    true,    false ],
    'incrocio':             [ true,    true,    false ],
    'scheda':               [ false,   true,    true  ],
    'cosa-vedere':          [ false,   true,    true  ],
    'approfondimento':      [ false,   true,    true  ],
    'passeggiata':          [ false,   true,    true  ]
  };

  /* serve(): la domanda che fa il resto dell'app.
     cosa  — una delle righe qui sopra
     modo  — 'servizi' (Utilità) o 'cultura' (Turismo)
     come  — { aPiedi: true/false, chiesto: true/false }
     «chiesto» vuol dire che l'ha chiesto l'utente a voce: una richiesta
     non si filtra mai. Se uno in Utilità dice «raccontamelo», glielo si
     racconta — il confine serve a non riempirlo di roba che non ha
     chiesto, non a negargli quello che chiede. */
  function serve(cosa, modo, come) {
    var c = come || {};
    if (c.chiesto) return true;
    var r = REGOLA[cosa];
    if (!r) return true;                       // quello che non è in tabella si dice
    var perQuestoModo = (modo === 'cultura') ? r[1] : r[0];
    if (!perQuestoModo) return false;
    if (c.aPiedi === false && !r[2]) return false;
    return true;
  }

  /* quantoConta(): in Utilità contano i punti che ORIENTANO, in Turismo
     quelli che hanno una storia. Lo stesso luogo pesa diverso a seconda di
     chi cammina — ed è questa, in una riga, «la suddivisione in funzione
     dell'utente». */
  var CHE_ORIENTANO = {
    stadio: 4, municipio: 4, 'palazzo comunale': 4, ospedale: 4,
    'stazione ferroviaria': 4, stazione: 4, 'fermata ferroviaria': 3, porto: 3,
    'università': 3, scuola: 2, mercato: 3, teatro: 2, museo: 2,
    'parco cittadino': 3, piazza: 3, 'giardino pubblico': 3, zoo: 3,
    biblioteca: 2, cimitero: 2, castello: 3, torre: 2, chiesa: 2,
    basilica: 3, caserma: 2, tribunale: 3, 'comune italiano': 4,
    frazione: 3, 'area protetta': 3
  };

  function quantoConta(p, modo) {
    if (!p) return 1;
    if (modo === 'cultura') {
      var d = String(p.d || '');
      return d.length > 200 ? 4 : (d ? 2 : 1);
    }
    return CHE_ORIENTANO[String(p.t || '').toLowerCase()] || 1;
  }

  return { serve: serve, quantoConta: quantoConta, REGOLA: REGOLA };
}

if (typeof module !== 'undefined' && module.exports) module.exports = AChiServe;
if (typeof window !== 'undefined') window.AChiServe = AChiServe;
