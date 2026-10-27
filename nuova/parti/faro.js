/* IL FARO ACUSTICO — Yourbea, 21/10/2026
   ============================================================
   «Il codice di Soundscape è aperto: non possiamo prendere tutti i
   riferimenti possibili e ottimizzare Yourbea?» (Vince, 21/10).

   Da Soundscape — l'app di Microsoft Research per non vedenti, chiusa
   nell'agosto 2023 e pubblicata con licenza MIT — non si prende il codice,
   che è un'app iOS intera, ma LA SUA IDEA MIGLIORE e i numeri a cui erano
   arrivati dopo anni di prove con persone cieche. I numeri sono questi, e
   stanno nel loro client web (soundscape-community/soundscape-web-client,
   licenza MIT, di Daniel W. Steinbrook):
     - trenta gradi per dire «sei in rotta»;
     - dieci metri per dire «ci sei» e spegnersi da solo;
     - cinquanta metri fra un annuncio di distanza e l'altro;
     - due suoni in anello, uno «in rotta» e uno «fuori rotta», che si
       sfumano l'uno nell'altro invece di accendersi e spegnersi.

   PERCHÉ CI SERVE, e non è una funzione in più
   Il 21/10, alla Laurentina, il telefono sbagliava di 653 metri e l'app
   diceva «a destra, a 130 metri, la stazione» mentre Vince ce l'aveva
   davanti. Lui l'ha detta nel modo giusto: «se dico così a un non vedente,
   lui non continua dritto: va a destra». Una parola sbagliata diventa un
   ordine sbagliato.
   Un suono no. Il faro non DICE da che parte: mette un tono sulla meta, e
   chi cammina lo sente spostarsi mentre gira la testa. Se la direzione è
   imprecisa lo sente e corregge da solo, come si fa con una voce che
   chiama da lontano. Non c'è niente da credere sulla parola.

   LE REGOLE:
   1. IL FARO NON DICE DOVE ANDARE, FA SENTIRE DOVE SEI DIRETTO. Non è una
      guida passo passo: è un richiamo.
   2. SI SPEGNE DA SOLO QUANDO SEI ARRIVATO, a dieci metri. Un suono che
      continua quando sei arrivato diventa un fastidio.
   3. LA DISTANZA SI DICE OGNI CINQUANTA METRI, non di continuo.
   4. SENZA BUSSOLA NON SI ACCENDE. Senza sapere come sei girato, il suono
      finirebbe dalla parte sbagliata: peggio di niente.
*/

'use strict';

function Faro(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var IN_ROTTA = o.inRotta || 30;         // gradi, da Soundscape
  var CI_SEI = o.ciSei || 10;             // metri, da Soundscape
  var OGNI = o.ogni || 50;                // metri fra un annuncio e l'altro

  var meta = null;
  var dettaA = null;

  function accendi(nome, lat, lon) {
    meta = { n: nome || '', lat: lat, lon: lon };
    dettaA = null;
    return { tipo: 'faro-acceso', livello: 'guida', meta: meta,
             testo: 'Faro acceso' + (nome ? ' su ' + nome : '') +
                    '. Senti il suono: gira finché non lo hai davanti, poi cammina.' };
  }

  function spegni() {
    var c = meta;
    meta = null; dettaA = null;
    return c ? { tipo: 'faro-spento', livello: 'guida', testo: 'Faro spento.' } : null;
  }

  function acceso() { return !!meta; }
  function laMeta() { return meta; }

  /* dove(): quanto manca e da che parte, per l'audio. Numeri, non parole:
     le parole sono quelle che sbagliavano. */
  function dove(qui, direzione, direzioneBuona) {
    if (!meta || !qui) return null;
    if (direzioneBuona === false || typeof direzione !== 'number') return null;   // REGOLA 4
    var m = dist(qui.lat, qui.lon, meta.lat, meta.lon);
    var rel = ((verso(qui.lat, qui.lon, meta.lat, meta.lon) - direzione + 540) % 360) - 180;
    return { metri: m, rel: rel, inRotta: Math.abs(rel) <= IN_ROTTA, ciSei: m <= CI_SEI };
  }

  /* passo(): cosa dire, se c'è qualcosa da dire. Il suono lo fa chi
     chiama: qui si decide soltanto. */
  function passo(qui, direzione, direzioneBuona) {
    var d = dove(qui, direzione, direzioneBuona);
    if (!d) return null;

    if (d.ciSei) {                                     // REGOLA 2
      var n = meta.n;
      meta = null; dettaA = null;
      return { tipo: 'faro-arrivato', livello: 'guida',
               testo: 'Ci siamo' + (n ? ': ' + n : '') + '. Spengo il faro.' };
    }

    /* REGOLA 3: la distanza ogni cinquanta metri, e solo scendendo */
    var scalino = Math.ceil(d.metri / OGNI) * OGNI;
    if (dettaA === null) { dettaA = scalino; return null; }
    if (scalino < dettaA) {
      dettaA = scalino;
      return { tipo: 'faro-manca', livello: 'cenno',
               testo: 'Mancano ' + scalino + ' metri.' };
    }
    return null;
  }

  return { accendi: accendi, spegni: spegni, acceso: acceso, laMeta: laMeta,
           dove: dove, passo: passo };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Faro;
if (typeof window !== 'undefined') window.Faro = Faro;
