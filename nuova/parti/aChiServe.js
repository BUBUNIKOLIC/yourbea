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
  /* Le colonne: Utilità, Turismo, regge il movimento, REGGE L'IMPRECISIONE.
     L'ultima è del 21/10, e nasce da un giro vero alla Laurentina: il
     telefono dava ±653 metri e l'app diceva lo stesso «a destra, a 130
     metri, la stazione» — mentre lui ce l'aveva davanti. Vince: «stando
     così non serve a nulla per i non vedenti», e ha ragione: chi vede
     corregge con un'occhiata, chi non vede si fida e sbaglia strada.
     Regge l'imprecisione solo quello che resta vero anche sbagliando di
     mezzo chilometro: il paesaggio (il Vesuvio è là comunque), la strada
     (se confermata due volte), le risposte ai comandi e l'emergenza.
     Tutto il resto — le parti, i passi, i metri, «qui c'è» — è finzione
     se non sappiamo dove siamo, e si tace. */
  var REGOLA = {
    /*                     utilità  turismo  non-a-piedi  imprecisi */
    'avviso':            [ true,    true,    true,        false ],
    'strada':            [ true,    true,    true,        true  ],
    /* la fermata serve PROPRIO quando non sei a piedi: e' il momento in
       cui conta, e senza precisione non si dice (sbagliare fermata e'
       peggio che tacere). */
    'fermata':           [ true,    true,    true,        false ],
    'paesaggio':         [ true,    true,    true,        true  ],
    'aCosaServe':        [ true,    false,   false,       false ],
    'orientamento':      [ true,    true,    false,       false ],
    'civico':            [ true,    false,   false,       false ],
    'scena':             [ true,    true,    false,       false ],
    'lati':              [ true,    true,    false,       false ],
    'passaggio':         [ true,    true,    false,       false ],
    'incrocio':          [ true,    true,    false,       false ],
    /* IL CENNO NON REGGE IL MOVIMENTO. Provato nei due sensi il 22/10 —
       prima aperto a 1.200 metri come fa Soundscape in macchina, poi
       stretto a 150 — e richiuso: «deve essere tarata sul camminare
       sempre, scooter taxi e auto non serve» (Vince, dopo la corsa in
       scooter). La storia di un palazzo la ascolti stando davanti al
       palazzo. */
    'cenno':             [ true,    true,    false,       false ],
    'superato':          [ true,    true,    false,       false ],
    /* COM'E' FATTA NON E' STORIA DELL'ARTE. «Alta come un palazzo di
       dodici piani, larga ottantacinque passi, di marmo» e' cos'hai
       davanti: in Utilita' e' la cosa che un bastone non ti puo' dare, e
       quindi passa in tutt'e due i modi. Ma non in macchina (i materiali
       dei palazzi che sfrecciano sono rumore) e non quando non sappiamo
       dove sei: descrivere il palazzo sbagliato e' peggio che tacere. */
    'scheda-orientativa': [ true,    true,    false,       false ],
    'scheda':            [ false,   true,    true,        true  ],
    'cosa-vedere':       [ false,   true,    true,        true  ],
    'approfondimento':   [ false,   true,    true,        true  ],
    'passeggiata':       [ false,   true,    true,        false ],
    /* «Qui c'è il percorso Bernini»: una proposta da visita. Non in
       Utilità, non in movimento, e MAI senza precisione — offrire un
       percorso che non è dove dici è peggio che tacere. */
    'percorso-qui':      [ false,   true,    false,       false ],
    /* I RIFERIMENTI SUOI. Valgono in tutt'e due i modi — li ha messi
       lui, e non è roba nostra da filtrare. Non in movimento (un
       ostacolo a piedi è una cosa, in auto è rumore) e mai senza
       precisione: dire «attento, scalino» nel posto sbagliato è
       peggio che tacere, perché chi non vede si ferma davvero. */
    'mio-avviso':        [ true,    true,    false,       false ],
    'mio-posto':         [ true,    true,    false,       false ]
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
    /* SENZA SAPERE DOVE SIAMO, NON SI DICONO LE PARTI NE' I PASSI. */
    if (c.preciso === false && !r[3]) return false;
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

  /* ============================================================
     QUELLO CHE NON SERVE A CHI NON GUIDA
     «Poi per i non vedenti dà indicazioni di autofficine, pompe di
     benzina, che per un non vedente sono un ossimoro» (Vince, 20/10).
     Ha ragione, ed e' la stessa regola di prima vista da un altro lato:
     Utilita' e' quello che serve a chi si muove A PIEDI. Un distributore
     non e' un punto di riferimento per chi cammina, e' un posto dove uno
     in macchina si ferma. Restano fuori, in Utilita' come in Turismo.
     NON e' una regola sulla cecita': non servono nemmeno al turista a
     piedi. Tornano utili solo se uno li CHIEDE. */
  var ROBA_DA_MACCHINA = {
    distributore: 1, 'pompa di benzina': 1, benzinaio: 1, officina: 1,
    autofficina: 1, autolavaggio: 1, gommista: 1, carrozzeria: 1,
    concessionario: 1, autonoleggio: 1, 'noleggio auto': 1, autoscuola: 1,
    'ricambi auto': 1, 'stazione di servizio': 1, 'autostrada': 1,
    'area di servizio': 1, 'casello': 1
  };
  function daMacchina(cosa) { return !!ROBA_DA_MACCHINA[String(cosa || '').toLowerCase()]; }

  return { serve: serve, quantoConta: quantoConta, daMacchina: daMacchina,
           REGOLA: REGOLA };
}

if (typeof module !== 'undefined' && module.exports) module.exports = AChiServe;
if (typeof window !== 'undefined') window.AChiServe = AChiServe;
