/* I NEGOZI DALLA NOSTRA MAPPA — Yourbea, 16/10/2026
   ============================================================
   «Usiamo tutto quello che c'è nel web per arricchire le nostre mappe…
   e quindi arricchiamo la mappa dell'Italia in nostro possesso, per poi
   avere molto di più da offrire» (Vince, 16/10).

   Questi sono i luoghi di Overture Maps — dati aperti della fondazione
   Linux, con dentro Meta, Microsoft, Amazon e TomTom — scaricati una volta
   sola, filtrati a quello che si incontra camminando, tradotti in italiano
   e tagliati a quadretti da un chilometro: `dati/negozi/4182_1248.json`.
   Non costano niente e non chiedono chiavi a nessuno.

   PERCHÉ NON BASTAVA OPENSTREETMAP: per i negozi ha molto meno. A Roma,
   nello stesso riquadro, OSM ne dà qualche decina e questi sono migliaia,
   col nome e spesso col civico. Per scalini, scivoli, percorso tattile e
   semafori acustici resta invece OSM, che è l'unica a mapparli: le due
   cose si sommano, non si sostituiscono.

   Questo file NON scarica e NON parla: dice QUALI quadretti servono e
   come si uniscono i due elenchi. Il resto lo fa app.js.

   LE REGOLE, e perché:
   1. SI PRENDE IL QUADRETTO DOVE SEI E QUELLI CHE TOCCHI. Camminando
      verso un confine, i negozi di là sono a cinquanta metri: aspettare di
      attraversarlo vuol dire dirli in ritardo.
   2. QUELLO CHE LA MAPPA VERA HA GIÀ, VINCE. Se OpenStreetMap conosce
      quel posto si tiene il suo: è aggiornato da chi ci passa davanti, e
      ha dettagli che Overture non ha (gli orari, il percorso tattile).
   3. DOPPIONE VUOL DIRE STESSO NOME VICINO, o stesso punto. I nomi
      arrivano scritti in modi diversi — «Bar Roma» e «BAR ROMA» — quindi
      si confrontano senza accenti né maiuscole.
*/

'use strict';

function Negozi(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var VICINO = o.vicino || 40;          // due cose più vicine di così, con lo stesso nome, sono la stessa
  var SOPRA = o.sopra || 15;            // o proprio lo stesso punto

  /* quadretti(): i file che servono per questa posizione. */
  function quadretti(lat, lon) {
    var q = {};
    [-0.006, 0, 0.006].forEach(function (dla) {
      [-0.008, 0, 0.008].forEach(function (dlo) {
        q[nome(lat + dla, lon + dlo)] = true;
      });
    });
    return Object.keys(q);
  }

  function nome(lat, lon) {
    return pad(Math.floor(lat * 100)) + '_' + pad(Math.floor(lon * 100));
  }
  function pad(n) {
    var s = String(Math.abs(n));
    while (s.length < 4) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }

  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9]/g, '');
  }

  /* unisci(): i punti della mappa viva + i nostri, senza doppioni. */
  function unisci(dallaMappa, nostri) {
    var fuori = (dallaMappa || []).slice();
    (nostri || []).forEach(function (x) {
      var suo = normalizza(x.n);
      var doppio = fuori.some(function (p) {
        if (!p.lat) return false;
        var d = dist(p.lat, p.lon, x.lat, x.lon);
        if (d <= SOPRA) return true;                               // REGOLA 3
        if (d > VICINO) return false;
        var n2 = normalizza(p.nome);
        if (!n2 || !suo) return false;
        return n2 === suo || n2.indexOf(suo) >= 0 || suo.indexOf(n2) >= 0;
      });
      if (doppio) return;                                          // REGOLA 2
      fuori.push({ cosa: x.t || 'negozio', servizio: x.t || 'negozio', nome: x.n,
                   indirizzo: x.a || '', lat: x.lat, lon: x.lon, nostro: true });
    });
    return fuori;
  }

  /* perIlRacconto(): i monumenti scaricati da Wikidata e Wikipedia
     diventano luoghi da raccontare, nella forma che usa parti/racconto.js.
     Quello che abbiamo scritto a mano vince sempre: le nostre schede sono
     fatte per essere ascoltate camminando, quelle di Wikipedia sono fatte
     per essere lette. Si aggiunge solo quello che non abbiamo. */
  function perIlRacconto(cultura, nostri) {
    var fuori = [];
    (cultura || []).forEach(function (x) {
      if (!x.n || !x.d) return;                 // senza scheda non c'è niente da dire
      var suo = normalizza(x.n);
      var gia = (nostri || []).some(function (p) {
        if (dist(p.lat, p.lon, x.lat, x.lon) < 60) return true;
        var n2 = normalizza(p.n);
        return n2 && suo && (n2 === suo || n2.indexOf(suo) >= 0 || suo.indexOf(n2) >= 0);
      });
      if (gia) return;
      /* l'anno e l'architetto sono la cosa che si dice meglio a voce:
         «chiesa del 1252, di Filippo Brunelleschi» sta in due secondi,
         l'articolo intero no. */
      var intro = x.t || '';
      if (x.y) intro += (intro ? ' del ' : 'Del ') + x.y;
      if (x.arch && x.arch.length) intro += ', di ' + x.arch.join(' e ');
      fuori.push({ n: x.n, lat: x.lat, lon: x.lon, k: 1, t: x.t || '', y: x.y || 0,
                   d: x.d, i: '', a: '', intro: intro, daWiki: true });
    });
    return fuori;
  }

  return { quadretti: quadretti, unisci: unisci, nome: nome, perIlRacconto: perIlRacconto };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Negozi;
if (typeof window !== 'undefined') window.Negozi = Negozi;
