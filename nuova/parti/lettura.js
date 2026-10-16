/* LEGGERE QUELLO CHE LA FOTOCAMERA HA DAVANTI — Yourbea, 16/10/2026
   ============================================================
   Vince ha chiesto se servivano degli occhiali con la fotocamera. Per
   LEGGERE no: il telefono ce l'ha già in tasca, e iOS sa riconoscere il
   testo da sé — dentro il sistema, gratis, senza rete e senza chiavi di
   nessuno. Il primo gradino è questo: cartelli, numeri dell'autobus,
   citofoni, targhe, menu, etichette.

   Questo file NON scatta e NON parla. Riceve le righe che il guscio ha
   riconosciuto — per ognuna il testo e il riquadro nell'immagine — e decide
   COSA dire. Lo scatto lo fa il guscio con Vision, la voce la fa
   parti/voce.js: così le regole si provano senza telefono e senza luce.

   LE REGOLE, e perché:

   1. PRIMA LE RIGHE GRANDI, non quelle che arrivano prima. Su un cartello
      il nome della via è scritto grande e tutto il resto è contorno: il
      riconoscimento le consegna nell'ordine che vuole lui. Si ordina per
      ALTEZZA del riquadro — quanto sono grandi le lettere — perché è quello
      che un vedente guarda per primo senza accorgersene.

   2. LE RIGHE SULLA STESSA ALTEZZA SONO UNA RIGA SOLA. «VIA DEI» e
      «CORAZZIERI» su un cartello stanno affiancate e il riconoscimento le
      dà separate: lette una per volta sembrano due cose diverse. Si
      rimettono insieme, da sinistra a destra.

   3. SI BUTTANO LE RIGHE DI UNA O DUE LETTERE E QUELLE DI SOLI SIMBOLI:
      sono rumore del riconoscimento — un bordo, un'ombra, un graffio.
      ATTENZIONE: le CIFRE no. «64» è il numero dell'autobus e «47» è il
      civico: sono corte e sono esattamente la cosa che si stava cercando.

   4. UNA RIGA PER VOLTA, E «ANCORA» VA AVANTI. Leggere di fila le venti
      righe di un menu non serve a nessuno: non si ricordano, e intanto non
      si sente la strada. Si dice quante sono e poi la prima.

   5. SE NON SI È LETTO NIENTE NON SI TACE. Chi non vede non può sapere se
      l'app sta pensando, se ha sbagliato o se davanti non c'è scritto
      niente: glielo si dice, e gli si dice cosa provare.
*/

'use strict';

function Lettura(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  /* quanto resta valido un «ancora» dopo una lettura: passati due minuti,
     «ancora» vuol dire un'altra cosa — il monumento che hai accanto. */
  var SCADENZA = o.scadenza || 120000;
  /* due righe sono la stessa riga se i riquadri si sovrappongono in verticale
     per più di METÀ della più bassa: le lettere di una stessa riga stanno
     quasi alla stessa altezza, quelle di righe diverse no. */
  var SOVRAPPOSIZIONE = o.sovrapposizione || 0.5;
  /* ...e se non sono di due misure diverse: un titolo grande e la sua
     didascalia minuscola possono sfiorarsi, ma non sono la stessa riga. */
  var MISURE_VICINE = o.misureVicine || 2.2;

  var righe = [];        // quelle buone, già unite e ordinate
  var quale = 0;         // a quale siamo arrivati col «ancora»
  var quando = 0;

  /* ---------- la pulizia ---------- */

  /* vale(): REGOLA 3. Si guarda il testo, non la lunghezza da sola. */
  function vale(t) {
    var pulito = String(t || '').trim();
    if (!pulito) return false;
    /* solo simboli: niente lettere e niente cifre. Non è scritto niente. */
    var utile = pulito.replace(/[^0-9a-zàáâäèéêëìíîïòóôöùúûüçñ]/gi, '');
    if (!utile) return false;
    /* corta: si tiene SOLO se dentro c'è una cifra. «64» è l'autobus,
       «47» è il civico, «ab» è un graffio sul muro. */
    if (pulito.length <= 2 && !/[0-9]/.test(pulito)) return false;
    return true;
  }

  function numero(x) { var n = Number(x); return isFinite(n) ? n : 0; }

  /* dentro(): da quello che manda il guscio a quello che serve qui.
     Il riquadro è in frazioni dell'immagine, con lo zero in alto a
     sinistra: y quanto sta in basso, h quanto sono alte le lettere. */
  function dentro(grezza) {
    var g = grezza || {};
    var t = String(g.t !== undefined ? g.t : (g.testo !== undefined ? g.testo : '')).trim();
    /* il riconoscimento rende a volte più spazi o un ritorno a capo in
       mezzo: a voce diventerebbero una pausa che non c'è. */
    t = t.replace(/\s+/g, ' ');
    return { t: t, x: numero(g.x), y: numero(g.y),
             w: numero(g.w !== undefined ? g.w : g.larghezza),
             h: numero(g.h !== undefined ? g.h : g.altezza) };
  }

  /* unisci(): REGOLA 2. */
  function unisci(buone) {
    var gruppi = [];
    buone.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).forEach(function (r) {
      for (var i = 0; i < gruppi.length; i++) {
        if (stessaRiga(gruppi[i], r)) { gruppi[i].pezzi.push(r); allarga(gruppi[i], r); return; }
      }
      gruppi.push({ pezzi: [r], cima: r.y, fondo: r.y + r.h });
    });
    return gruppi.map(function (g) {
      var pezzi = g.pezzi.slice().sort(function (a, b) { return a.x - b.x; });
      var somma = 0;
      pezzi.forEach(function (p) { somma += p.h; });
      return { t: pezzi.map(function (p) { return p.t; }).join(' '),
               /* l'altezza della riga è quella delle sue lettere, non la
                  somma: serve per ordinare per grandezza */
               h: somma / pezzi.length, y: g.cima,
               x: pezzi[0].x, pezzi: pezzi.length };
    });
  }

  function stessaRiga(gruppo, r) {
    var alto = gruppo.fondo - gruppo.cima;
    var piuBassa = Math.min(alto, r.h);
    if (piuBassa <= 0) return false;
    var insieme = Math.min(gruppo.fondo, r.y + r.h) - Math.max(gruppo.cima, r.y);
    if (insieme < piuBassa * SOVRAPPOSIZIONE) return false;
    var piuAlta = Math.max(alto, r.h);
    return piuAlta / piuBassa <= MISURE_VICINE;
  }

  function allarga(gruppo, r) {
    gruppo.cima = Math.min(gruppo.cima, r.y);
    gruppo.fondo = Math.max(gruppo.fondo, r.y + r.h);
  }

  /* ordina(): REGOLA 1. A pari grandezza vale l'ordine di lettura —
     dall'alto in basso, e da sinistra a destra. */
  function ordina(lista) {
    return lista.slice().sort(function (a, b) {
      if (Math.abs(b.h - a.h) > 0.004) return b.h - a.h;
      return a.y - b.y || a.x - b.x;
    });
  }

  /* senzaDoppioni(): lo stesso testo riconosciuto due volte — capita con i
     riflessi — si dice una volta sola, e si tiene quello scritto più grande. */
  function senzaDoppioni(lista) {
    var visti = {}, fuori = [];
    lista.forEach(function (r) {
      var k = r.t.toLowerCase().replace(/[^0-9a-z]/gi, '');
      if (visti[k]) return;
      visti[k] = true;
      fuori.push(r);
    });
    return fuori;
  }

  /* pulisci(): la fila di righe da dire, in ordine. Si può chiamare da
     fuori: è quello che il quaderno della camminata scrive. */
  function pulisci(grezze) {
    var buone = (grezze || []).map(dentro).filter(function (r) { return vale(r.t); });
    return senzaDoppioni(ordina(unisci(buone)));
  }

  /* ---------- cosa si dice ---------- */

  function frase(testo, tipo) {
    return { tipo: tipo || 'lettura', testo: testo, livello: 'guida' };
  }

  var NIENTE = 'Non riesco a leggere niente. Prova ad avvicinarti, o a girare il telefono.';

  /* risposta(): arriva lo scatto, si dice la prima cosa. REGOLE 4 e 5. */
  function risposta(grezze, guaio) {
    righe = []; quale = 0; quando = ora();

    if (guaio === 'niente-permesso') {
      return frase('Non ho il permesso di usare la fotocamera. Dallo nelle impostazioni del telefono, ' +
                   'alla voce Yourbea: senza, non posso leggere quello che hai davanti.', 'lettura-guaio');
    }
    if (guaio === 'niente-fotocamera') {
      return frase('Questo telefono non mi dà la fotocamera.', 'lettura-guaio');
    }
    if (guaio) {
      return frase('La fotocamera non è riuscita a scattare. Riprova.', 'lettura-guaio');
    }

    righe = pulisci(grezze);
    if (!righe.length) { quando = 0; return frase(NIENTE, 'lettura-niente'); }

    quale = 1;
    var prima = righe[0].t;
    if (righe.length === 1) { quando = 0; return frase('C\'è scritto: ' + prima + '.'); }
    var d = frase('Ci sono ' + righe.length + ' righe. La più grande: ' + prima +
                  '. Dimmi «ancora» per la prossima.');
    d.quante = righe.length; d.quale = 0;
    return d;
  }

  /* ancora(): la riga dopo. REGOLA 4. */
  function ancora() {
    if (!inCorso()) return null;
    if (quale >= righe.length) {
      quando = 0;
      return frase('Ho finito di leggere: non c\'è altro scritto. Dimmi «leggi» per guardare di nuovo.',
                   'lettura-finita');
    }
    var r = righe[quale];
    quale++;
    quando = ora();
    var d = frase('Riga ' + quale + ' di ' + righe.length + ': ' + r.t + '.');
    d.quante = righe.length; d.quale = quale - 1;
    /* l'ultima lo dice: se no uno sta lì ad aspettare che continui */
    if (quale >= righe.length) d.testo += ' Era l\'ultima.';
    return d;
  }

  /* inCorso(): c'è una lettura da continuare? Serve ad app.js per sapere a
     chi tocca «ancora»: alla lettura appena fatta, o al monumento che hai
     accanto. Passati due minuti, «ancora» non parla più del cartello. */
  function inCorso() {
    return !!quando && righe.length > 0 && (ora() - quando) < SCADENZA;
  }

  /* senzaGuscio(): la pagina gira anche nel browser, dove la fotocamera non
     la possiamo aprire così. Non si resta zitti e non si mente. */
  function senzaGuscio() {
    return frase('Per leggere i cartelli mi serve l\'app di Yourbea installata sul telefono: ' +
                 'dentro il browser non posso aprire la fotocamera.', 'lettura-guaio');
  }

  function aspetta() { return frase('Guardo.', 'lettura-aspetta'); }

  function azzera() { righe = []; quale = 0; quando = 0; }

  return { risposta: risposta, ancora: ancora, inCorso: inCorso, pulisci: pulisci,
           senzaGuscio: senzaGuscio, aspetta: aspetta, azzera: azzera,
           tutte: function () { return righe.map(function (r) { return r.t; }); },
           aChePunto: function () { return { quale: quale, quante: righe.length }; } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Lettura;
if (typeof window !== 'undefined') window.Lettura = Lettura;
