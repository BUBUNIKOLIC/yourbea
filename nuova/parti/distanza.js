/* QUANTO MANCA — Yourbea, 21/10/2026
   ============================================================
   «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
   provando il guscio Android). Aveva ragione, e il difetto si contava:
   c'erano QUATTRO misure diverse per la stessa cosa.
     racconto     arrotondava a 10 METRI — e diceva «metri», non passi
     guida        a 10 passi
     descrizione  a 5 passi
     scena        a 5 passi, e poi «una ventina di passi»
   La stessa distanza usciva in unità diverse a seconda di chi parlava, e
   sotto i venticinque metri il cenno diceva soltanto «a pochi passi».
   A venti metri da una porta, «pochi passi» non è una misura.

   LA REGOLA: LA PRECISIONE SEGUE L'ERRORE.
   Il GPS sbaglia tredici metri (mediana, misurata sul quaderno di Vince
   in una giornata vera; nel caso peggiore 1414). Quindi:
   - VICINO si contano i passi uno per uno. L'errore in metri è lo stesso,
     ma tu stai per arrivare e ogni passo conta: «a 16 passi» è una cosa
     che puoi fare, «pochi passi» no.
   - LONTANO si arrotonda, perché fingere la precisione è una bugia. A
     duecento metri dire «a 271 passi» non è più preciso: è solo più
     falso, e chi non vede si fida.
   - UNA SOLA UNITÀ, i passi, finché si cammina. I metri non li ha in
     testa nessuno camminando; i passi sì, perché li fai.
   - E SOPRA IL CHILOMETRO i passi non si dicono più: milleottocento passi
     non li conta nessuno.
*/

'use strict';

function Distanza(opzioni) {
  var o = opzioni || {};
  /* QUANTO E' LUNGO UN PASSO — e perche' non e' 75 centimetri.
     Settantacinque e' la media di una popolazione, e non e' il passo di
     nessuno in particolare: cambia con l'altezza, con la fretta, e chi
     cammina col bastone fa il passo piu' corto di chi vede. A sedici
     passi da una porta la differenza fra 0,60 e 0,80 sono quattro metri:
     la porta sbagliata.
     Quindi si misura: si cammina un pezzo, il telefono conta i passi, il
     GPS conta i metri, e il passo e' la divisione. `regola()`.
     Finche' non l'ha misurato resta la media, che e' meglio di niente. */
  var PASSO = o.passo || 0.75;         // un passo, in metri
  var MISURATO = false;
  function regola(metri, passi) {
    var m = Number(metri) || 0, p = Number(passi) || 0;
    if (p < 30 || m < 20) return null;         // troppo poco per misurare
    var l = m / p;
    /* un passo umano sta fra mezzo metro e un metro: fuori di li' e'
       il GPS che ha sbandato o il contapassi che ha contato i sobbalzi
       dello scooter, e una misura sbagliata e' peggio della media. */
    if (l < 0.45 || l > 1.05) return null;
    PASSO = Math.round(l * 100) / 100;
    MISURATO = true;
    return PASSO;
  }
  /* e si puo' dimenticare: uno cambia scarpe, o l'ha misurato una volta
     camminando di fretta. Si torna alla media e si rimisura. */
  function dimentica() { PASSO = o.passo || 0.75; MISURATO = false; }
  function quantoEIlPasso() { return PASSO; }
  function eMisurato() { return MISURATO; }
  function metti(l) {
    var v = Number(l) || 0;
    if (v < 0.45 || v > 1.05) return false;
    PASSO = v; MISURATO = true; return true;
  }

  /* quanti(): il numero di passi, arrotondato come merita la distanza. */
  function quanti(metri) {
    var p = metri / PASSO;
    if (p < 6) return Math.max(1, Math.round(p));      // contati, uno per uno
    if (metri < 15) return Math.round(p);              // ancora esatti: sei quasi lì
    if (metri < 60) return Math.round(p / 5) * 5;      // a cinque
    if (metri < 200) return Math.round(p / 10) * 10;   // a dieci
    return Math.round(p / 25) * 25;                    // a venticinque: oltre, è una stima
  }

  /* nudi(): senza «a» davanti — serve dentro un'altra frase
     («larga 110 passi»). */
  function nudi(metri) {
    var m = Number(metri) || 0;
    if (m <= 3) return 'pochi passi';
    if (m >= 950) {
      var km = Math.round(m / 100) / 10;
      return String(km).replace('.', ' e ') + (km === 1 ? ' chilometro' : ' chilometri');
    }
    return quanti(m) + ' passi';
  }

  function passi(metri) { return 'a ' + nudi(metri); }

  /* IN MACCHINA I PASSI NON ESISTONO. «A ottocento passi la basilica»
     detto a chi va a cinquanta all'ora non e' una misura: i passi li
     capisci perche' li fai, e seduto non ne fai nessuno. In movimento si
     torna ai metri, arrotondati a cinquanta — fingere i dieci metri
     mentre ne percorri quindici al secondo sarebbe una bugia — e sopra il
     chilometro si dicono i chilometri, come per i passi. */
  function inMetri(m) {
    var v = Number(m) || 0;
    if (v >= 950) {
      var km = Math.round(v / 100) / 10;
      return 'a ' + String(km).replace('.', ' e ') +
             (km === 1 ? ' chilometro' : ' chilometri');
    }
    return 'a ' + Math.max(50, Math.round(v / 50) * 50) + ' metri';
  }

  return { passi: passi, nudi: nudi, quanti: quanti, inMetri: inMetri,
           regola: regola, metti: metti, dimentica: dimentica,
           quantoEIlPasso: quantoEIlPasso, eMisurato: eMisurato };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Distanza;
