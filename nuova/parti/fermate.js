/* LE FERMATE, QUANDO SEI SU UN MEZZO — Yourbea, 21/10/2026
   ============================================================
   «Poi non riconosce che siamo in metro… invece potrebbe dire: stai per
   entrare in stazione Colosseo, appena esci eccetera. A Cavour puoi…»
   (Vince, tornando dalla Laurentina a Termini).

   Il quaderno dice una cosa che non mi aspettavo: in metro il GPS
   funzionava benissimo — sessanta all'ora, cinque metri di errore. Quindi
   l'app SAPEVA che non stava camminando, e infatti taceva tutto quello
   che si misura in passi. Giusto, ma insufficiente: tacere non è
   accompagnare. Su un mezzo l'unica cosa che conta è QUANDO SCENDERE, e
   nessuno la diceva.

   Per chi non vede è la cosa più difficile di un viaggio in città: in
   metro non ci sono riferimenti, l'annuncio a bordo a volte non c'è o non
   si sente, e sbagliare fermata vuol dire ritrovarsi in un posto che non
   si conosce. Un'app che dice «stai per arrivare a Cavour» risolve il
   problema vero.

   LE REGOLE, e perché:
   1. SOLO SU UN MEZZO. A piedi le fermate le dice già parti/passaggi.js,
      e con altre parole: lì servono per prenderle, qui per scendere.
   2. PRIMA CHE ARRIVI, NON QUANDO SEI FERMO. «Stai per arrivare» deve
      uscire mentre il treno rallenta, non quando le porte sono già
      aperte: chi non vede ha bisogno dei secondi per alzarsi.
   3. UNA FERMATA, UNA VOLTA. E se si torna indietro sulla stessa linea,
      dopo qualche minuto si può ridire.
   4. APPENA ESCI. Il nome della fermata da solo non dice niente a chi non
      è di lì: «Colosseo» vale perché fuori c'è il Colosseo. Si dice la
      cosa più grossa lì intorno, una sola.
   5. SENZA PRECISIONE NON SI DICE NIENTE. Sbagliare fermata e' peggio che
      non dirla: uno scende dove non deve.
*/

'use strict';

function Fermate(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var ora = o.ora || function () { return Date.now(); };
  var AVVISO = o.avviso || 500;        // REGOLA 2: si avvisa da mezzo chilometro
  var CI_SEI = o.ciSei || 120;         // sotto: ci sei
  var RIPOSO = o.riposo || 240000;     // REGOLA 3
  var FUORI = o.fuori || 400;          // REGOLA 4: cosa c'è appena esci

  var dette = {};
  var avvisate = {};

  function senzaAccenti(t) {
    return String(t || '').toLowerCase()
      .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function eUnaFermata(p) {
    var c = String((p && (p.servizio || p.cosa || p.t)) || '').toLowerCase();
    return /stazione|fermata|metropolitana/.test(c);
  }

  /* cosaCEfuori(): la cosa più grossa a due passi dalla fermata. Si prende
     da quello che l'app già sa dei luoghi, non da un elenco scritto a
     mano: così vale per ogni fermata d'Italia. */
  function cosaCEfuori(fermata, luoghi) {
    /* e non si dice due volte la stessa cosa: la fermata «Colosseo» si
       chiama cosi' perche' fuori c'e' il Colosseo, e «Colosseo. Appena
       esci, Colosseo» fa ridere. Se il nome e' lo stesso, il nome della
       fermata basta gia'. */
    var suo = senzaAccenti(fermata.nome);
    var mig = null, meglio = -1;
    (luoghi || []).forEach(function (x) {
      if (!x || !x.n || !(x.k >= 1)) return;
      var n = senzaAccenti(x.n);
      if (n === suo || n.indexOf(suo) >= 0 || suo.indexOf(n) >= 0) return;
      var d = dist(fermata.lat, fermata.lon, x.lat, x.lon);
      if (d > FUORI) return;
      /* conta quanto è raccontato: una scheda lunga vuol dire che la gente
         ci viene apposta — ed è esattamente quello che serve dire */
      var peso = (x.d ? x.d.length : 0) - d;
      if (peso > meglio) { meglio = peso; mig = { p: x, m: d }; }
    });
    if (!mig) return '';
    var quanto = mig.m < 120 ? '' : (', a ' + (Math.round(mig.m / 50) * 50) + ' metri');
    return ' Appena esci, ' + mig.p.n + quanto + '.';
  }

  /* prossima(): la frase, o niente. */
  function prossima(s) {
    var situazione = s || {};
    var qui = situazione.qui;
    if (!qui) return null;
    if (situazione.aPiedi !== false) return null;      // REGOLA 1
    if (situazione.preciso === false) return null;     // REGOLA 5

    var mig = null, dmin = Infinity;
    (situazione.punti || []).forEach(function (p) {
      if (!p || !p.nome || !eUnaFermata(p)) return;
      var d = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d > AVVISO) return;
      if (d < dmin) { dmin = d; mig = p; }
    });
    if (!mig) return null;

    var nome = mig.nome;
    var adesso = ora();
    if (dmin > CI_SEI) {
      /* REGOLA 2: l'avviso, mentre si rallenta */
      if (adesso - (avvisate[nome] || 0) < RIPOSO) return null;
      avvisate[nome] = adesso;
      return { tipo: 'fermata', livello: 'guida', fermata: mig,
               testo: 'Stai per arrivare a ' + nome + '.' +
                      cosaCEfuori(mig, situazione.luoghi) };
    }
    /* ci sei */
    if (adesso - (dette[nome] || 0) < RIPOSO) return null;
    dette[nome] = adesso;
    avvisate[nome] = adesso;
    return { tipo: 'fermata', livello: 'guida', fermata: mig,
             testo: nome + '.' + cosaCEfuori(mig, situazione.luoghi) };
  }

  function dimentica() { dette = {}; avvisate = {}; }

  return { prossima: prossima, eUnaFermata: eUnaFermata, dimentica: dimentica };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Fermate;
if (typeof window !== 'undefined') window.Fermate = Fermate;
