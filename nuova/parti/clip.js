/* LE CLIP — Yourbea, rifatta il 15/10/2026
   ============================================================
   Questo file fa UNA cosa: dato quello che l'app vuole dire, dice QUALI file
   audio metterne in fila. Le clip sono 4.257 pezzi incisi con Alice
   (Enhanced): «sulla destra», «a 80 metri», «Battistero di Parma», la sua
   scheda, il suo approfondimento. La frase si compone al momento.

   Perché esistono le clip e non si usa la voce del telefono: la voce incisa
   suona sempre uguale, funziona senza rete e non costa a ogni ascolto. Ma
   **se una clip manca o è lenta, il motore della voce parla col
   sintetizzatore** — non si resta mai in silenzio. Qui si dicono solo i nomi;
   chi non c'è, non c'è.

   I NOMI, come sono stati incisi (verificati sui file, 15/10):
     dir-sulla-destra      «sulla destra»
     m-80                  «a 80 metri»    (di dieci in dieci, fino a 1000)
     m-passi               «a pochi passi» (sotto i 25 metri)
     poi-NN-nome           il nome del luogo
     poi-NN-intro          il tipo e l'anno: «palazzo del 1455»
     poi-NN-scheda         la scheda
     poi-NN-dentro         il «cosa vedere»
     poi-NN-ancora         l'approfondimento da manuale
     frase-cosa-vedere     «Cosa vedere:»
     frase-chiedi          «Vuoi approfondire, o andiamo avanti?»

   Il numero NN sta scritto nei dati, nel campo `c`: non si conta sull'ordine
   della lista, che un domani può cambiare.
*/

'use strict';

function Clip() {

  /* NIENTE PUNTI CARDINALI. «Ma io non so nord sud est dove sono» (Vince,
     16/10, camminando): il nord non ce l'ha in testa nessuno per strada, e
     a chi non vede non serve a niente. Se non si sa come sei girato non si
     dice da che parte: si dicono i metri, che sono veri lo stesso. Le clip
     card-a-nord restano incise ma non le chiama più nessuno. */
  function direzione(rel, buona, cardinale) {
    if (!buona) return null;
    var p;
    var r = rel;
    if (Math.abs(r) <= 20) p = 'dritto-davanti';
    else if (r > 20 && r <= 70) p = 'sulla-destra';
    else if (r > 70 && r <= 110) p = 'proprio-a-destra';
    else if (r > 110) p = 'indietro-a-destra';
    else if (r < -20 && r >= -70) p = 'sulla-sinistra';
    else if (r < -70 && r >= -110) p = 'proprio-a-sinistra';
    else p = 'indietro-a-sinistra';
    return 'dir-' + p;
  }

  function metri(m) {
    if (m < 25) return 'm-passi';
    /* sopra i 995 metri l'arrotondamento darebbe «m-1000», che non esiste e
       non avrebbe senso: i chilometri li dice la voce di sistema. */
    if (m >= 995) return null;
    return 'm-' + (Math.round(m / 10) * 10);
  }

  /* per(): dato il risultato del racconto, la fila delle clip. */
  function per(d) {
    if (!d || !d.luogo || !d.luogo.c) return null;
    var c = d.luogo.c;
    if (d.tipo === 'cenno') {
      var fila = [];
      var dir = direzione(d.rel, d.direzioneBuona, d.cardinale);
      if (dir) fila.push(dir);
      var me = metri(d.metri);
      if (me) fila.push(me);
      fila.push(c + '-nome');
      if (d.luogo.t || d.luogo.y) fila.push(c + '-intro');
      fila.push('frase-chiedi');
      return fila;
    }
    if (d.tipo === 'scheda') return [c + '-nome', c + '-scheda'];
    if (d.tipo === 'cosa-vedere') return ['frase-cosa-vedere', c + '-dentro'];
    if (d.tipo === 'approfondimento') return [c + '-ancora'];
    return null;
  }

  return { per: per, direzione: direzione, metri: metri };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Clip;
if (typeof window !== 'undefined') window.Clip = Clip;
