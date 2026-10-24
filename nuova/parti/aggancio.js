/* AGGANCIARE LA POSIZIONE ALLA STRADA — Yourbea, 23/10/2026
   ============================================================
   «La APP deve avere una posizione precisa» (Vince, regola 1).

   Il GPS di un telefono, misurato su una giornata vera di giro: mediana
   13 metri, ma il 13% delle letture sopra i 50, con punte di 653 e
   1.414. Tredici metri, in una strada stretta, vuol dire stare dentro il
   palazzo di fronte — e a chi non vede «sulla destra» detto dal posto
   sbagliato non e' un'imprecisione, e' un ordine che esegue.

   Ma una cosa la sappiamo di sicuro: CHI CAMMINA STA SU UNA STRADA. Le
   vie le scarichiamo gia' da OpenStreetMap per gli incroci, e sono linee
   con dentro i punti. Proiettare la lettura sulla linea piu' probabile
   toglie quasi tutto l'errore di traverso, che e' quello che conta: se
   sbaglio di dieci metri AVANTI lungo la via, «fra venti passi
   l'attraversamento» diventa «fra trenta». Se sbaglio di dieci metri di
   LATO, sono dall'altra parte della strada.

   LE QUATTRO REGOLE, e nascono tutte dallo stesso timore.
   1. UNA LETTURA SBALLATA NON SI AGGANCIA. Sopra i quaranta metri di
      errore dichiarato non si tocca niente: mettere un punto incerto
      sopra una strada lo fa SEMBRARE sicuro, ed e' peggio che lasciarlo
      dov'e'. Il telefono dice di non sapere: si dice anche noi.
   2. NON SI AGGANCIA DA LONTANO. Oltre venticinque metri dalla via piu'
      vicina, quella via non e' detto che sia la tua: magari stai
      attraversando un parco, o sei in un cortile.
   3. NON SI SALTA DA UNA STRADA ALL'ALTRA. Chi cammina resta sulla
      stessa via per un pezzo. Quella di prima si tiene finche' e'
      ragionevole, e si cambia solo se un'altra e' piu' vicina di almeno
      otto metri: se no, a ogni incrocio la posizione ballerebbe fra due
      strade a ogni lettura.
   4. SI AGGANCIA SOLO CHI CAMMINA. In macchina la strada e' un'altra —
      le tangenziali, i cavalcavia — e sbagliare carreggiata e' facile.
   5. SE LA GUIDA E' ACCESA, IL PERCORSO BATTE LE VIE. «Perche' loro
      riescono a guidare la macchina e noi neanche a camminare» (Vince,
      23/10): perche' un navigatore non cerca la via piu' probabile fra
      tutte, sa GIA' su quale linea stai andando, e ci posa il punto
      sopra. Quando «portami a» e' attivo quella linea ce l'abbiamo
      anche noi, ed e' un'informazione piu' forte di tutte le vie
      intorno: una linea sola invece di dieci candidate.
      Ma con una soglia piu' stretta, DODICI metri, non venticinque, e
      il perche' e' il difetto che si eviterebbe: se si agganciasse al
      percorso anche da venticinque metri, uno che ha sbagliato strada e
      cammina sulla parallela verrebbe inchiodato sulla linea giusta —
      la sua posizione sembrerebbe perfetta e la guida non si
      accorgerebbe mai che e' fuori. Dodici metri e' sotto la mediana
      del nostro errore (13 m): dentro, e' rumore del GPS; fuori, puo'
      essere che tu sia andato da un'altra parte, e allora non si tocca.
*/

'use strict';

function Aggancio(opzioni) {
  var o = opzioni || {};
  var QUANTO_LONTANO = o.quantoLontano || 25;     // metri: oltre, non e' la tua via
  var PRECISIONE_MINIMA = o.precisioneMinima || 40;
  var PER_CAMBIARE = o.perCambiare || 8;          // metri di vantaggio per cambiare via
  /* REGOLA 5: quanto si puo' stare lontani dal percorso perche' sia ancora
     rumore del GPS e non una strada sbagliata */
  var LONTANO_DAL_PERCORSO = o.lontanoDalPercorso || 12;
  /* ma se il telefono sbaglia SEMPRE DALLO STESSO LATO, si arriva fino a
     trenta: vedi «il GPS che rimbalza sui palazzi», qui sotto. */
  var LONTANO_SE_FISSO = o.lontanoSeFisso || 30;
  var FISSO_PER = o.fissoPer || 8000;             // da quanto deve essere cosi'
  var FISSO_ENTRO = o.fissoEntro || 7;            // e di quanto puo' variare
  var TIENE = o.tiene || 25000;                   // la via di prima vale mezzo minuto
  var ora = o.ora || function () { return Date.now(); };
  var dist = o.dist || function (a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  var viaDiPrima = null, quando = 0;
  /* per cambiare via bisogna AVER GIRATO: l'orientamento della via su cui
     sei e l'ultima volta che ci hai camminato di traverso. */
  var versoDiPrima = null, giratoQuando = 0;
  /* quanto distavi dal percorso nelle ultime letture, per distinguere un
     errore di lato da una strada sbagliata */
  var lontananze = [];

  function quantoGira(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  /* due vie sono parallele se stanno dentro venticinque gradi, contando
     che una via nord-sud e una sud-nord sono la stessa via */
  function parallele(a, b) {
    if (a === null || b === null) return false;
    var d = quantoGira(a, b);
    return Math.min(d, 180 - d) < 25;
  }

  /* il punto piu' vicino su un segmento, e quanto dista */
  function sulSegmento(la, lo, a, b) {
    var k = Math.cos(la * Math.PI / 180);
    var dx = (b[0] - a[0]), dy = (b[1] - a[1]) * k;
    var len = dx * dx + dy * dy;
    var t = len > 0 ? (((la - a[0]) * dx + (lo - a[1]) * k * dy) / len) : 0;
    t = Math.max(0, Math.min(1, t));
    var pla = a[0] + dx * t, plo = a[1] + (b[1] - a[1]) * t;
    return { lat: pla, lon: plo, m: dist(la, lo, pla, plo) };
  }

  function puntoPiuVicino(la, lo, via) {
    var p = via.punti || [];
    var meglio = null;
    for (var i = 1; i < p.length; i++) {
      var q = sulSegmento(la, lo, p[i - 1], p[i]);
      if (!meglio || q.m < meglio.m) {
        meglio = q;
        /* come e' orientata la via QUI: serve a capire se un'altra via
           le e' parallela, cioe' se ci si puo' finire senza girare. */
        var k = Math.cos(la * Math.PI / 180);
        meglio.verso = (Math.atan2((p[i][1] - p[i - 1][1]) * k,
                                   (p[i][0] - p[i - 1][0])) * 180 / Math.PI + 360) % 360;
      }
    }
    return meglio;
  }

  /* aggancia(): la posizione agganciata, oppure null se si lascia stare.
     s = { lat, lon, prec, aPiedi }  vie = [{ nome, punti: [[la,lo],…] }]
     linea = il tracciato del «portami a», se la guida e' accesa: [[la,lo],…] */
  function aggancia(s, vie, linea) {
    if (!s) return null;
    if (s.aPiedi === false) return null;                       // REGOLA 4
    if (s.prec > PRECISIONE_MINIMA) return null;               // REGOLA 1

    /* REGOLA 5 — il percorso, se c'e', viene prima di tutto il resto. */
    if (linea && linea.length > 1) {
      var sul = puntoPiuVicino(s.lat, s.lon, { punti: linea });
      if (sul) {
        var adesso = ora();
        lontananze.push({ m: sul.m, t: adesso });
        while (lontananze.length > 1 && (adesso - lontananze[0].t) > FISSO_PER * 2) {
          lontananze.shift();
        }
        /* ============================================================
           IL GPS CHE RIMBALZA SUI PALAZZI
           (misurato il 23/10) In un vicolo il segnale arriva riflesso e
           il punto si sposta SEMPRE DALLO STESSO LATO, di quindici o
           venti metri: non e' rumore, e' un errore fisso. Nella misura,
           con quindici metri di spinta e una parallela a diciotto, la
           posizione finiva sulla via sbagliata 184 volte su 301.
           Come si distingue da uno che ha sbagliato strada: chi ha
           sbagliato strada si allontana SEMPRE DI PIU', chi ha il
           segnale riflesso resta alla stessa distanza. Quindi fino a
           trenta metri si aggancia, ma solo se quella distanza e'
           ferma da almeno otto secondi.
           ============================================================ */
        var distanzaFerma = false;
        if (sul.m > LONTANO_DAL_PERCORSO && sul.m <= LONTANO_SE_FISSO) {
          var vecchie = lontananze.filter(function (x) { return adesso - x.t <= FISSO_PER * 2; });
          if (vecchie.length >= 4 && (adesso - vecchie[0].t) >= FISSO_PER) {
            var min = null, max = null;
            vecchie.forEach(function (x) {
              if (min === null || x.m < min) min = x.m;
              if (max === null || x.m > max) max = x.m;
            });
            distanzaFerma = (max - min) <= FISSO_ENTRO;
          }
        }
        if (sul.m <= LONTANO_DAL_PERCORSO || distanzaFerma) {
          quando = adesso;
          /* IL NOME DELLA VIA SI PRENDE DOVE SEI FINITO, non dove eri.
             Ereditando il nome di prima, un nome sbagliato restava
             sbagliato per tutta la camminata. */
          var nome = viaDiPrima;
          if (vie && vie.length) {
            var piu = null;
            for (var k = 0; k < vie.length; k++) {
              var vv = vie[k];
              if (!vv || !vv.punti || vv.punti.length < 2) continue;
              var qq = puntoPiuVicino(sul.lat, sul.lon, vv);
              if (qq && (!piu || qq.m < piu.m)) { piu = qq; piu.nome = vv.nome || ''; }
            }
            if (piu && piu.m <= QUANTO_LONTANO) nome = piu.nome;
          }
          viaDiPrima = nome || viaDiPrima;
          return { lat: sul.lat, lon: sul.lon, via: viaDiPrima, sulPercorso: true,
                   spostato: Math.round(dist(s.lat, s.lon, sul.lat, sul.lon)) };
        }
      }
      /* piu' lontano di cosi', o sempre piu' lontano, non si tocca il
         percorso: puo' essere che tu sia andato da un'altra parte, e la
         guida deve poterlo vedere. Si prosegue con le vie. */
    }

    if (!vie || !vie.length) return null;

    var migliore = null, suDiPrima = null;
    for (var i = 0; i < vie.length; i++) {
      var v = vie[i];
      if (!v || !v.punti || v.punti.length < 2) continue;
      var q = puntoPiuVicino(s.lat, s.lon, v);
      if (!q) continue;
      q.nome = v.nome || '';
      if (!migliore || q.m < migliore.m) migliore = q;
      if (viaDiPrima && q.nome && q.nome === viaDiPrima) {
        if (!suDiPrima || q.m < suDiPrima.m) suDiPrima = q;
      }
    }
    if (!migliore || migliore.m > QUANTO_LONTANO) { return null; }   // REGOLA 2

    /* REGOLA 3: si resta sulla propria strada, se e' ancora ragionevole */
    var scelto = migliore;
    if (suDiPrima && (ora() - quando) < TIENE && suDiPrima.m <= QUANTO_LONTANO &&
        suDiPrima.m - migliore.m < PER_CAMBIARE) {
      scelto = suDiPrima;
    }
    /* ============================================================
       REGOLA 6: PER CAMBIARE VIA BISOGNA AVER GIRATO
       (24/10) Il GPS che rimbalza sui palazzi sposta il punto sempre
       dallo stesso lato, di quindici o venti metri. Se di la' c'e' una
       parallela — in centro ce n'e' una a ogni isolato — la posizione
       ci finisce sopra, e misurato era 152 volte su 301.
       Ma una cosa e' certa: a una via PARALLELA non ci si arriva
       camminando dritto. Per cambiare strada bisogna girare. Quindi se
       la via nuova e' parallela a quella di prima e NON abbiamo mai
       visto la direzione girare, non e' una strada nuova: e' il GPS che
       scivola, e si resta dove si era.
       Se invece hai girato davvero — la direzione e' stata di traverso
       alla tua via — allora si cambia subito, com'e' giusto.
       Senza direzione (fermi, o appena partiti) questa regola non si
       applica: meglio l'aggancio di prima che nessun aggancio.
       ============================================================ */
    if (scelto !== suDiPrima && viaDiPrima && scelto.nome !== viaDiPrima &&
        typeof s.direzione === 'number' && s.direzioneBuona) {
      if (parallele(scelto.verso, versoDiPrima)) {
        var giratoDaPoco = giratoQuando && (ora() - giratoQuando) < TIENE;
        if (!giratoDaPoco && suDiPrima && suDiPrima.m <= QUANTO_LONTANO) {
          scelto = suDiPrima;
        }
      }
    }
    /* e si tiene il conto di quando hai camminato di traverso alla tua
       via: e' quello che distingue una svolta da uno scivolamento. */
    if (typeof s.direzione === 'number' && s.direzioneBuona && versoDiPrima !== null) {
      var fuoriAsse = quantoGira(s.direzione, versoDiPrima);
      fuoriAsse = Math.min(fuoriAsse, 180 - fuoriAsse);
      if (fuoriAsse > 50) giratoQuando = ora();
    }
    if (scelto.nome !== viaDiPrima || versoDiPrima === null) {
      versoDiPrima = (scelto.verso === undefined ? versoDiPrima : scelto.verso);
    }
    viaDiPrima = scelto.nome || viaDiPrima;
    quando = ora();
    return { lat: scelto.lat, lon: scelto.lon, via: scelto.nome,
             spostato: Math.round(dist(s.lat, s.lon, scelto.lat, scelto.lon)) };
  }

  function dimentica() {
    viaDiPrima = null; quando = 0; lontananze = [];
    versoDiPrima = null; giratoQuando = 0;
  }
  function laVia() { return viaDiPrima; }

  return { aggancia: aggancia, dimentica: dimentica, laVia: laVia };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Aggancio;
if (typeof window !== 'undefined') window.Aggancio = Aggancio;
