/* LA SCENA INTORNO — Yourbea, 15/10/2026
   ============================================================
   «Turismo descrive la realtà circostante… anche per non vedenti» (Vince).
   Le schede dei luoghi raccontano i monumenti; questo file racconta il
   POSTO in cui sei adesso: che forma ha, cosa c'è e da che parte, quanto
   manca in passi. È la parte che serve a chi non vede più di ogni altra, e
   fino a stasera i dati della mappa — aree, alberi, attraversamenti,
   negozi — si scaricavano e non li diceva nessuno.

   COME SI DESCRIVE A CHI NON VEDE, e perché:
   1. PRIMA DOVE SEI, POI DA CHE PARTE, POI QUANTO MANCA. Chi vede abbraccia
      la scena in un colpo; chi ascolta la riceve in fila, e l'ordine è
      quello che si tiene a mente.
   2. IN PASSI, NON SOLO IN METRI. «Una quarantina di passi» si cammina;
      «trenta metri» si deve convertire. Un passo = 75 centimetri.
   3. TRE COSE, NON DIECI. Una descrizione lunga non si ricorda: si dice
      quello che orienta — la forma del posto, gli alberi, due servizi — e
      il resto si chiede («cosa c'è qui intorno»).
   4. GLI ATTRAVERSAMENTI SI CONTANO, NON SI ELENCANO. Era la prima cosa che
      Vince ha chiesto provandola in strada: «se ce ne sono ogni cinque
      metri, basta dire che c'è una serie di attraversamenti».
   5. MAI DIRE DOVE METTERE I PIEDI. Il GPS a piedi sbaglia dai dieci ai
      trenta metri: «attraversa qui» è una frase che può far male.
   6. LA STESSA SCENA NON SI RIPETE. Si dice quando cambia davvero.
*/

'use strict';

function Scena(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var ora = o.ora || function () { return Date.now(); };
  var PASSO = 0.75;                       // metri
  var VICINO = o.vicino || 60;            // oltre, non orienta più
  var DI_NUOVO = o.diNuovo || 90000;      // la stessa scena non prima di così

  var ultima = '', ultimaQuando = 0;

  function passi(m) { return 'a ' + passiNudi(m); }
  /* passiNudi(): «pochi passi», «una ventina di passi», «110 passi» — la
     stessa misura serve dentro due frasi diverse («a una ventina di passi»
     e «larga 110 passi»), e incollare l'articolo a mano dava «larga una
     110 passi». */
  function passiNudi(m) {
    var p = Math.round(m / PASSO / 5) * 5;
    if (p <= 5) return 'pochi passi';
    if (p < 100) return 'una ' + dentina(p);
    return (Math.round(p / 10) * 10) + ' passi';
  }
  function dentina(p) {
    var nomi = { 10: 'decina di passi', 20: 'ventina di passi', 30: 'trentina di passi',
                 40: 'quarantina di passi', 50: 'cinquantina di passi', 60: 'sessantina di passi',
                 70: 'settantina di passi', 80: 'ottantina di passi', 90: 'novantina di passi' };
    var d = Math.round(p / 10) * 10;
    return nomi[d] || (p + ' passi');
  }

  function daCheParte(qui, lat, lon, direzione, buona) {
    var g = verso(qui.lat, qui.lon, lat, lon);
    if (!buona) {
      var card = ['a nord', 'a nord-est', 'a est', 'a sud-est', 'a sud', 'a sud-ovest', 'a ovest', 'a nord-ovest'];
      return card[Math.round(g / 45) % 8];
    }
    var r = ((g - direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (r > 25 && r <= 115) return 'sulla destra';
    if (r < -25 && r >= -115) return 'sulla sinistra';
    return 'dietro di te';
  }

  /* laForma(): la piazza, il parco, il cortile in cui sei — e quanto è
     grande, misurato sul suo contorno. */
  function laForma(qui, aree) {
    var dentro = null;
    (aree || []).forEach(function (a) {
      if (!a.punti || !a.punti.length) return;
      var dm = Infinity, dM = 0;
      a.punti.forEach(function (p) {
        var d = dist(qui.lat, qui.lon, p[0], p[1]);
        if (d < dm) dm = d;
        if (d > dM) dM = d;
      });
      /* DENTRO VUOL DIRE DENTRO. Prima bastava essere vicini al contorno, e
         camminando in strada l'app diceva «Sei in Chiesa di Santa Lucia»
         mentre la chiesa era lì accanto, chiusa. Adesso si guarda se il
         punto cade davvero dentro il poligono. */
      if (!dentroIlContorno(qui, a.punti)) return;
      if (!dentro || dM < dentro.largo) {
        dentro = { cosa: a.cosa, nome: a.nome, largo: Math.round(dM) };
      }
    });
    return dentro;
  }

  /* dentroIlContorno(): il raggio che esce dal punto taglia il contorno un
     numero dispari di volte solo se il punto è dentro. È il modo più
     vecchio e più solido che ci sia, e non serve altro. */
  function dentroIlContorno(qui, punti) {
    if (!punti || punti.length < 3) return false;
    var dentro = false;
    for (var i = 0, j = punti.length - 1; i < punti.length; j = i++) {
      var yi = punti[i][0], xi = punti[i][1];
      var yj = punti[j][0], xj = punti[j][1];
      var taglia = ((xi > qui.lon) !== (xj > qui.lon)) &&
                   (qui.lat < (yj - yi) * (qui.lon - xi) / ((xj - xi) || 1e-12) + yi);
      if (taglia) dentro = !dentro;
    }
    return dentro;
  }

  function alberi(qui, elenco, direzione, buona) {
    var vicini = (elenco || []).filter(function (p) { return dist(qui.lat, qui.lon, p[0], p[1]) < VICINO; });
    if (vicini.length < 3) return null;
    var parti = {};
    vicini.forEach(function (p) {
      var d = daCheParte(qui, p[0], p[1], direzione, buona);
      parti[d] = (parti[d] || 0) + 1;
    });
    var dove = Object.keys(parti).sort(function (a, b) { return parti[b] - parti[a]; })[0];
    return vicini.length >= 8 ? ('alberi in fila ' + dove) : ('qualche albero ' + dove);
  }

  function attraversamenti(qui, punti) {
    var a = (punti || []).filter(function (p) {
      return p.cosa === 'attraversamento' && dist(qui.lat, qui.lon, p.lat, p.lon) < VICINO;
    });
    if (!a.length) return null;
    /* REGOLA 4: si contano. E si dice l'unica cosa che cambia qualcosa:
       se uno di quelli ha il semaforo, e se c'è il percorso tattile. */
    var conSemaforo = a.filter(function (p) { return p.semaforo; }).length;
    var tattili = a.filter(function (p) { return p.tattile; }).length;
    if (a.length === 1) {
      return 'un attraversamento' + (conSemaforo ? ' col semaforo' : ' senza semaforo') +
             (tattili ? ', col percorso tattile' : '');
    }
    return 'una serie di attraversamenti' +
           (conSemaforo ? (conSemaforo === a.length ? ', tutti col semaforo' : ', ' + conSemaforo + ' col semaforo') : ', nessuno col semaforo') +
           (tattili ? ', e il percorso tattile' : '');
  }

  function servizi(qui, punti, direzione, buona, quanti) {
    var buoni = (punti || []).filter(function (p) {
      return p.servizio && p.cosa !== 'attraversamento' && dist(qui.lat, qui.lon, p.lat, p.lon) < VICINO;
    });
    buoni.sort(function (a, b) {
      return dist(qui.lat, qui.lon, a.lat, a.lon) - dist(qui.lat, qui.lon, b.lat, b.lon);
    });
    return buoni.slice(0, quanti || 2).map(function (p) {
      var m = dist(qui.lat, qui.lon, p.lat, p.lon);
      return (p.nome ? p.nome : p.cosa) + ' ' + daCheParte(qui, p.lat, p.lon, direzione, buona) + ', ' + passi(m);
    });
  }

  /* descrivi(): la scena, in una frase sola. null se non c'è niente da dire
     o se è la stessa di poco fa. */
  function descrivi(s) {
    var qui = s.qui, d = s.direzione, buona = s.direzioneBuona !== false;
    var mappa = s.mappa || { punti: [], aree: [], alberi: [] };
    var pezzi = [];

    var forma = laForma(qui, mappa.aree);
    if (forma) {
      pezzi.push('Sei ' + (forma.nome ? 'in ' + forma.nome : 'in ' + unA(forma.cosa)) +
                 (forma.largo >= 25 ? ', larg' + (femmina(forma.cosa) ? 'a' : 'o') + ' ' + passiNudi(forma.largo) : ''));
    } else if (s.strada) {
      pezzi.push('Sei in ' + s.strada);
    }

    var alb = alberi(qui, mappa.alberi, d, buona);
    if (alb) pezzi.push(alb);

    var att = attraversamenti(qui, mappa.punti);
    if (att) pezzi.push(att);

    /* REGOLA 3: tre cose. I servizi entrano solo se c'è ancora posto. */
    var quanti = Math.max(0, 4 - pezzi.length);
    if (quanti) servizi(qui, mappa.punti, d, buona, quanti).forEach(function (t) { pezzi.push(t); });

    if (pezzi.length < 2) return null;
    var testo = pezzi.shift() + '. ' + capo(pezzi.join('; ')) + '.';

    // REGOLA 6: la stessa scena non si ripete
    if (testo === ultima && ora() - ultimaQuando < DI_NUOVO) return null;
    ultima = testo; ultimaQuando = ora();
    return { tipo: 'scena', livello: 'guida', testo: testo };
  }

  function unA(c) { return (femmina(c) ? 'una ' : 'un ') + c; }
  function femmina(c) { return /a$/.test(String(c)); }
  function capo(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }

  function dimentica() { ultima = ''; ultimaQuando = 0; }

  return { descrivi: descrivi, passi: passi, passiNudi: passiNudi, attraversamenti: attraversamenti,
           laForma: laForma, dimentica: dimentica };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Scena;
if (typeof window !== 'undefined') window.Scena = Scena;
