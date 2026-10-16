/* GLI INCROCI — Yourbea, 16/10/2026
   ============================================================
   «Superavo gli incroci e non mi dicevi quali strade superavo.» (Vince,
   camminando a Roma.) Per chi non vede un incrocio col nome vale più di un
   monumento: è il punto fermo che dice dove sei arrivato, quanto manca, e
   dove girare. I nomi delle strade stavano già nella risposta della mappa —
   non li leggeva nessuno.

   LE REGOLE, e perché:
   1. SI DICE QUANDO CI SEI, non prima. Venticinque metri: più in là non si
      sa ancora se quella strada la prendi o la passi.
   2. DA CHE PARTE RISPETTO A TE, e solo se si sa come stai camminando. Mai
      il nord: non ce l'ha in testa nessuno.
   3. LA STRADA DOVE SEI NON È UN INCROCIO. Chi cammina in via dei
      Corazzieri non vuole sentirsi dire «via dei Corazzieri».
   4. UNO ALLA VOLTA E NON DUE VOLTE. Lo stesso incrocio, ripassandoci,
      dopo tre minuti; e se ce ne sono due insieme si dice il più vicino.
   5. È ROBA DA UTILITÀ. In Turismo si parla di arte: un incrocio lì non
      c'entra niente.
*/

'use strict';

function Incroci(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var ora = o.ora || function () { return Date.now(); };
  var VICINO = o.vicino || 25;
  var RIPOSO = o.riposo || 180000;

  var detti = {};

  function normalizza(t) {
    return String(t || '').toLowerCase().replace(/[^a-zà-ù0-9]+/g, ' ').trim();
  }

  /* quale(): l'incrocio da dire adesso, o null. */
  function quale(s) {
    var qui = s.qui, vie = s.vie || [];
    var dove = normalizza(s.strada || '');
    var mig = null, dmin = Infinity;

    vie.forEach(function (v) {
      var n = normalizza(v.nome);
      if (!n) return;
      // REGOLA 3: la strada dove sei non è un incrocio
      if (dove && (dove.indexOf(n) >= 0 || n.indexOf(dove) >= 0)) return;
      var vicino = null, d = Infinity;
      (v.punti || []).forEach(function (p) {
        var q = dist(qui.lat, qui.lon, p[0], p[1]);
        if (q < d) { d = q; vicino = p; }
      });
      if (d > VICINO) return;                      // REGOLA 1
      if (d < dmin) { dmin = d; mig = { nome: v.nome, lat: vicino[0], lon: vicino[1], metri: Math.round(d) }; }
    });

    if (!mig) return null;
    // REGOLA 4: non due volte
    var k = normalizza(mig.nome);
    if (ora() - (detti[k] || 0) < RIPOSO) return null;
    detti[k] = ora();

    var parte = daCheParte(qui, mig, s.direzione, s.direzioneBuona);
    return {
      tipo: 'incrocio', livello: 'guida', nome: mig.nome, metri: mig.metri,
      testo: parte ? ('Incroci ' + mig.nome + ', ' + parte + '.') : ('Incroci ' + mig.nome + '.')
    };
  }

  function daCheParte(qui, p, direzione, buona) {
    if (typeof direzione !== 'number' || buona === false) return null;   // REGOLA 2
    var g = verso(qui.lat, qui.lon, p.lat, p.lon);
    var r = ((g - direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (r > 25) return 'sulla destra';
    return 'sulla sinistra';
  }

  function dimentica() { detti = {}; }

  return { quale: quale, dimentica: dimentica };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Incroci;
if (typeof window !== 'undefined') window.Incroci = Incroci;
