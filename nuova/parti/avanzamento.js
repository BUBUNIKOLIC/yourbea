/* QUANTO NE HAI FATTO — l'avanzamento sul percorso
   ============================================================
   «Secondo me devi riprendere il motore di qualsiasi navigatore open
   source, sicuramente funziona meglio di quello che c'è ora»
   (Vince, 23/10/2026). Ha ragione, e il pezzo che mancava è questo.

   COME LO FACEVAMO (e perché si rompeva). La guida teneva un indice —
   «la prossima è la svolta numero 3» — e lo faceva avanzare quando
   entravi in un cerchio di venticinque metri attorno al punto della
   svolta. Se ci passavi di lato, quel cerchio non lo toccavi mai:
   l'app restava ferma su quella svolta per sempre, ripetendola mentre
   la distanza cresceva. È il ponte Marconi.

   COME LO FANNO TUTTI I NAVIGATORI. Non guardano la distanza da un
   PUNTO: proiettano la posizione sulla LINEA del percorso e misurano
   quanti metri ne hai già percorsi. Da quel numero esce tutto, e senza
   casi particolari:
     — la prossima svolta è la prima che sta più avanti di dove sei;
     — quanto manca è una sottrazione, non una distanza in linea d'aria;
     — una svolta passata è passata: il numero è cresciuto;
     — e «fuori strada» è quanto sei lontano dalla LINEA, non da un
       punto: è la stessa misura che usa chiunque, ed è l'unica che
       funziona in una via curva.

   LA LINEA CE L'ABBIAMO GIÀ: la manda Valhalla con il percorso, e fin
   qui la usavamo solo per disegnare la mappa — cioè per chi vede.

   Si prova:  node nuova/prove/avanzamento.js                          */

'use strict';

function Avanzamento(opzioni) {
  var o = opzioni || {};
  var dist = o.dist || function (la1, lo1, la2, lo2) {
    var R = 6371000, r = Math.PI / 180;
    var x = (la2 - la1) * r;
    var y = (lo2 - lo1) * r * Math.cos((la1 + la2) / 2 * r);
    return Math.sqrt(x * x + y * y) * R;
  };
  /* QUANTO INDIETRO SI PUO' TORNARE. Senza questo, su un percorso che
     si ripiega — il giro intorno a un isolato, un ponte e ritorno — la
     proiezione puo' scegliere il pezzo sbagliato, perche' due tratti
     diversi passano vicini. Si cerca solo avanti e un po' indietro
     rispetto a dove si era: e' quello che fanno tutti. */
  var INDIETRO = o.indietro || 40;
  var AVANTI = o.avanti || 400;
  var TROPPO_FUORI = o.troppoFuori || 40;

  var linea = [];        // [[lat, lon], ...]
  var lungo = [];        // metri dall'inizio, per ogni punto della linea
  var fatti = 0;         // quanti metri ne abbiamo fatti
  var fuoriDa = 0;       // quanto siamo lontani dalla linea

  function conPercorso(punti) {
    linea = (punti || []).filter(function (p) {
      return p && typeof p[0] === 'number' && typeof p[1] === 'number';
    });
    lungo = [];
    var somma = 0;
    for (var i = 0; i < linea.length; i++) {
      if (i) somma += dist(linea[i - 1][0], linea[i - 1][1], linea[i][0], linea[i][1]);
      lungo.push(somma);
    }
    fatti = 0; fuoriDa = 0;
    return somma;
  }

  function quantoELungo() { return lungo.length ? lungo[lungo.length - 1] : 0; }

  /* suQuestoPezzo(): il punto della linea più vicino a dove sei, fra due
     estremi. Torna {metri: quanti ne hai fatti, lontano: quanto sei
     fuori dalla linea}. È la proiezione di un punto su un segmento,
     che è il conto di base di ogni navigatore. */
  function suQuestoPezzo(lat, lon, i) {
    var a = linea[i], b = linea[i + 1];
    var r = Math.PI / 180;
    /* si lavora in metri locali: la latitudine è uniforme, la
       longitudine si stringe col coseno. */
    var k = Math.cos(((a[0] + b[0]) / 2) * r);
    var ax = 0, ay = 0;
    var bx = (b[1] - a[1]) * k, by = (b[0] - a[0]);
    var px = (lon - a[1]) * k, py = (lat - a[0]);
    var lunghezza2 = bx * bx + by * by;
    var t = lunghezza2 ? ((px - ax) * bx + (py - ay) * by) / lunghezza2 : 0;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var qx = bx * t, qy = by * t;
    /* la distanza dal punto proiettato, in metri veri */
    var dLat = (py - qy) / r * 0 + (py - qy);     // in gradi
    var dLon = (px - qx) / (k || 1);
    var lontano = dist(lat, lon, lat - dLat, lon - dLon);
    var dentro = lungo[i] + t * (lungo[i + 1] - lungo[i]);
    return { metri: dentro, lontano: lontano };
  }

  /* dove(): la posizione nuova. Torna quanti metri ne hai fatti e
     quanto sei lontano dalla linea. */
  function dove(lat, lon) {
    if (linea.length < 2) return { metri: 0, lontano: 0, suLinea: false };
    var meglio = null;
    for (var i = 0; i < linea.length - 1; i++) {
      /* solo il pezzo di percorso che ha senso: un po' indietro e un
         bel pezzo avanti rispetto a dove eravamo */
      if (lungo[i + 1] < fatti - INDIETRO) continue;
      if (lungo[i] > fatti + AVANTI) break;
      var q = suQuestoPezzo(lat, lon, i);
      if (!meglio || q.lontano < meglio.lontano) meglio = q;
    }
    /* se in quella finestra non c'è niente di buono — sei tornato
       indietro, o sei saltato altrove — si guarda tutta la linea.
       La soglia era centocinquanta metri ed era troppo alta: tornando
       indietro di cento metri su una strada dritta, la proiezione si
       incollava all'inizio della finestra a sessanta metri di
       distanza, e il conto restava avanti come se non fossi tornato. */
    if (!meglio || meglio.lontano > TROPPO_FUORI) {
      for (var j = 0; j < linea.length - 1; j++) {
        var q2 = suQuestoPezzo(lat, lon, j);
        if (!meglio || q2.lontano < meglio.lontano) meglio = q2;
      }
    }
    if (!meglio) return { metri: fatti, lontano: 0, suLinea: false };
    /* NON SI TORNA INDIETRO DA SOLI. Il GPS che balla farebbe scendere
       e salire il numero, e la prossima svolta cambierebbe avanti e
       indietro. Si va avanti; indietro solo se si è davvero tornati
       sui propri passi (più di INDIETRO metri). */
    if (meglio.metri > fatti || meglio.metri < fatti - INDIETRO) fatti = meglio.metri;
    fuoriDa = meglio.lontano;
    return { metri: fatti, lontano: fuoriDa, suLinea: true };
  }

  /* prossima(): quale svolta viene adesso, e quanto manca.
     `svolte` sono quelle di Valhalla, con lat/lon: a ciascuna si
     calcola una volta sola a che metro del percorso sta. */
  var svolte = [];
  function conSvolte(elenco) {
    svolte = (elenco || []).map(function (s) {
      var dove = metroDi(s.lat, s.lon);
      return { s: s, metro: dove };
    });
    return svolte.length;
  }

  function metroDi(lat, lon) {
    var meglio = null;
    for (var i = 0; i < linea.length - 1; i++) {
      var q = suQuestoPezzo(lat, lon, i);
      if (!meglio || q.lontano < meglio.lontano) meglio = q;
    }
    return meglio ? meglio.metri : 0;
  }

  /* QUANTO PRIMA SI CONSIDERA FATTA. Un metro dopo il punto della
     svolta sei ancora in mezzo all'incrocio: si lascia qualche metro,
     se no la svolta sparisce mentre la stai facendo. */
  var APPENA_PASSATA = o.appenaPassata || 8;

  function prossima() {
    for (var i = 0; i < svolte.length; i++) {
      if (svolte[i].metro > fatti - APPENA_PASSATA) {
        return { quale: i, svolta: svolte[i].s,
                 manca: Math.max(0, svolte[i].metro - fatti) };
      }
    }
    return null;
  }

  function quanteRestano() {
    var n = 0;
    for (var i = 0; i < svolte.length; i++) if (svolte[i].metro > fatti - APPENA_PASSATA) n++;
    return n;
  }

  function quantoManca() { return Math.max(0, quantoELungo() - fatti); }
  function quantoFuori() { return fuoriDa; }
  function dimentica() { linea = []; lungo = []; svolte = []; fatti = 0; fuoriDa = 0; }

  return {
    conPercorso: conPercorso, conSvolte: conSvolte, dove: dove,
    prossima: prossima, quanteRestano: quanteRestano,
    quantoManca: quantoManca, quantoFuori: quantoFuori,
    quantoELungo: quantoELungo, fatti: function () { return fatti; },
    dimentica: dimentica
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Avanzamento;
if (typeof window !== 'undefined') window.Avanzamento = Avanzamento;
