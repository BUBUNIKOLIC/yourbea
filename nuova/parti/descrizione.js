/* LA DESCRIZIONE ORIENTATIVA — Yourbea, 21/10/2026
   ============================================================
   Yourbea prometteva di descrivere i monumenti a chi non vede, e invece
   leggeva Wikipedia — che è scritta per chi vede. Una scheda vera, dai
   nostri dati di stamattina:

     «Gli Scogli Castelluccio sono delle isole dell'Italia site nel mar
      Ionio, in Sicilia. Amministrativamente appartengono al comune di
      Siracusa.»

   A una persona ferma lì davanti non dice NIENTE: non quanto è alto, non
   di che è fatto, non da che parte ce l'ha. È l'unica promessa che non
   mantenevamo davvero.

   LE REGOLE (le prove stanno in nuova/prove/descrizione.js):
   1. PRIMA DOVE, POI COS'È. Chi non vede deve prima girarsi.
   2. LE MISURE SI DICONO IN COSE, NON IN NUMERI. «Sessantotto metri» non
      si immagina; «alto come un palazzo di ventidue piani» sì. Un piano
      vale tre metri: è la misura che tutti hanno in casa.
   3. IL MATERIALE PRIMA DELLA STORIA: è la cosa che toccheresti se
      allungassi la mano. E si dice come si dice: «mattoni», non
      «laterizio».
   4. LA FORMA IN PEZZI RICONOSCIBILI — una facciata, un campanile, delle
      colonne. Non lo stile: «tardobarocco» non si tocca.
   5. LA STORIA NON SI BUTTA, si mette in coda: la sente chi dice
      «ancora». Chi cammina vuole sapere cos'ha davanti; chi si ferma
      vuole sapere cos'è successo lì.
   6. QUELLO CHE NON SI SA NON SI DICE. Mai un'altezza inventata: una
      persona che non vede si fida, e su questo si costruisce tutto.
*/

'use strict';

function Descrizione(opzioni) {
  var o = opzioni || {};
  var PASSO = 0.75;
  /* L'ARTICOLO NON SI RIFA' QUI. racconto.js ce l'ha, e si porta dietro
     tutte le trappole gia' pagate: «la chiesa cattolica chiesa di San
     Marco», «lo sito», «il Zeno», «il cattedrale», «la chiesa San
     Luigi». Riscriverlo vorrebbe dire ricascarci una per una. */
  var conArticolo = o.conArticolo || function (p) { return String(p && p.n || ''); };
  var PIANO = 3;                       // metri, l'altezza di un piano di casa
  var ultimaForma = '';
  var giroDiParole = 0;

  /* COME SI DICE QUELLO CHE TOCCHERESTI. A sinistra la parola di
     Wikipedia, a destra quella che si usa parlando. «Laterizio» è una
     parola da manuale: nessuno dice «è di laterizio». */
  var MATERIALI = {
    laterizio: 'mattoni', mattoni: 'mattoni', cotto: 'mattoni',
    travertino: 'travertino', marmo: 'marmo', marmorea: 'marmo', marmoreo: 'marmo',
    tufo: 'tufo', granito: 'granito', calcare: 'pietra calcarea',
    pietra: 'pietra', cemento: 'cemento', legno: 'legno',
    bronzo: 'bronzo', ferro: 'ferro', vetro: 'vetro', intonaco: 'intonaco'
  };

  /* LA FORMA, detta come la toccherebbe uno. Singolare e plurale separati
     perché «una colonne» non si può sentire. */
  var FORME = {
    cupola: 'una cupola', campanile: 'un campanile', torre: 'una torre',
    facciata: 'una facciata piatta', portico: 'un portico',
    colonne: 'delle colonne', navate: 'più navate', navata: 'una navata sola',
    arcate: 'delle arcate', loggia: 'una loggia', rosone: 'un rosone',
    guglia: 'una guglia', scalinata: 'una scalinata davanti',
    abside: 'un fondo tondo', gradini: 'dei gradini'
  };

  function passi(m) {
    var p = Math.round(m / PASSO / 5) * 5;
    if (p <= 5) return 'pochi passi';
    return p + ' passi';
  }

  /* inPiani(): REGOLA 2. Sotto i due piani non si contano i piani — si
     dice che è bassa, che è l'informazione vera. Sopra, si arrotonda:
     nessuno ha bisogno della virgola. */
  function inPiani(metri) {
    if (!metri || metri <= 0) return '';
    if (metri < 6) return 'bassa, meno di due piani';
    var p = Math.round(metri / PIANO);
    return 'alta come un palazzo di ' + p + ' piani';
  }

  function materiale(lista) {
    if (!lista || !lista.length) return '';
    var visti = [];
    for (var i = 0; i < lista.length && visti.length < 2; i++) {
      var k = String(lista[i] || '').toLowerCase().replace(/[^a-zà-ÿ]/g, '');
      var m = MATERIALI[k];
      if (!m) {
        for (var q in MATERIALI) {
          if (Object.prototype.hasOwnProperty.call(MATERIALI, q) && k.indexOf(q) === 0) { m = MATERIALI[q]; break; }
        }
      }
      if (m && visti.indexOf(m) < 0) visti.push(m);
    }
    if (!visti.length) return '';
    return 'di ' + visti.join(' e ');
  }

  function forma(lista) {
    if (!lista || !lista.length) return '';
    var visti = [];
    for (var i = 0; i < lista.length && visti.length < 2; i++) {
      var k = String(lista[i] || '').toLowerCase().replace(/[^a-zà-ÿ]/g, '');
      var f = FORME[k];
      if (f && visti.indexOf(f) < 0) visti.push(f);
    }
    if (!visti.length) return '';
    return visti.join(' e ');
  }

  /* DA CHE PARTE. Le stesse quattro parole del paesaggio: non si
     inventano direzioni nuove per il lettore. */
  function daCheParte(dove) {
    var d = String(dove || '').toLowerCase();
    if (/davanti|dritto|avanti/.test(d)) return 'Davanti a te';
    if (/destra/.test(d)) return 'Sulla tua destra';
    if (/sinistra/.test(d)) return 'Sulla tua sinistra';
    if (/dietro|spalle/.test(d)) return 'Alle tue spalle';
    return '';
  }

  /* frase(): mette tutto in fila, e salta quello che non sa. REGOLA 6:
     ogni pezzo che manca sparisce, non diventa un «forse». */
  function frase(x) {
    if (!x || !x.n) return null;
    var pezzi = [];

    // 1. DOVE, e quanto manca
    var parte = daCheParte(x.dove);
    var quanto = x.metri > 0 ? ('a ' + passi(x.metri)) : '';
    var apertura = '';
    if (parte && quanto) apertura = parte + ', ' + quanto + ', ';
    else if (parte) apertura = parte + ' ';
    else if (quanto) apertura = 'A ' + passi(x.metri) + ', ';

    // 2. cos'è, con l'articolo e il tipo davanti
    var cosa = conArticolo({ n: x.n, t: x.t });
    if (apertura) giroDiParole = (giroDiParole + 1) % 4;
    var VERBO = ['hai ', 'trovi ', 'c\'è ', 'incontri '][giroDiParole];
    pezzi.push(apertura + (apertura ? VERBO : '') + cosa);

    // 3. quanto è grande — in piani, mai in metri
    var alt = inPiani(x.altezza);

    // 4. di cosa è fatta
    var mat = materiale(x.materiali);

    // 5. che forma ha
    var fo = forma(x.forme);
    /* due monumenti di fila non si raccontano uguali: cambia l'attacco
       della seconda frase, non quello che dice. */
    var attacchi = ['Ha ', 'Si riconosce da ', 'Davanti ha '];
    var att = attacchi[0];
    if (fo) {
      var i = 0;
      while (i < attacchi.length && attacchi[i] + fo === ultimaForma) i++;
      att = attacchi[i % attacchi.length];
      ultimaForma = att + fo;
    }
    /* DUE MONUMENTI DI FILA NON SI DICONO UGUALI. Non basta variare la
       frase della forma: senza forma — ed e' il caso piu' comune, perche'
       quei dati spesso non ci sono — due chiese vicine uscivano parola per
       parola identiche, e chi ascolta pensa che l'app si sia impuntata. */
    var VERBI = ['hai ', 'trovi ', 'c\'e\' ', 'incontri '];
    if (apertura) {
      giroDiParole = (giroDiParole + 1) % VERBI.length;
      apertura = apertura.replace(/, $/, ', ');
    }

    var seconda = [];
    if (alt) seconda.push(alt);
    if (mat) seconda.push(mat);
    var testo = pezzi.join('');
    if (seconda.length) testo += ': ' + seconda.join(', ');
    testo += '.';
    if (fo) testo += ' ' + att + fo + '.';

    return {
      tipo: 'scheda-orientativa',
      livello: 'cenno',
      testo: testo,
      /* REGOLA 5: la storia c'è, ma la dice chi la chiede. */
      ancora: x.storia ? String(x.storia).trim() : ''
    };
  }

  return { frase: frase, inPiani: inPiani, passi: passi,
           materiale: materiale, forma: forma };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Descrizione;
