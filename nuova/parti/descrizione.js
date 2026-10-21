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
    /* LA FACCIATA NON C'E' PIU'. Ce l'hanno tutti gli edifici, quindi non
       distingue niente — e «piatta» ce lo eravamo inventato: dall'articolo
       sappiamo solo che una facciata viene NOMINATA, non com'e' fatta.
       REGOLA 6: quello che non si sa non si dice. */
    portico: 'un portico',
    colonne: 'delle colonne', navate: 'più navate', navata: 'una navata sola',
    arcate: 'delle arcate', loggia: 'una loggia', rosone: 'un rosone',
    guglia: 'una guglia', scalinata: 'una scalinata davanti',
    abside: 'un fondo tondo', gradini: 'dei gradini'
  };

  /* LA DISTANZA LA DICE UNA PARTE SOLA: parti/distanza.js (7 prove).
     «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
     21/10): ce n'erano quattro, con arrotondamenti diversi, e questa
     diceva i METRI mentre il resto dell'app diceva i passi. */
  /* si PASSA, come dist e verso: in questa cartella le parti non si
     cercano fra loro, se le fa dare. Senza, resta il modo vecchio — piu'
     grezzo, ma nessuno resta muto. */
  var laMisura = o.distanza || null;
  function passi(m) {
    return laMisura ? laMisura.nudi(m) : (Math.round(m / PASSO) + ' passi');
  }

  /* inPiani(): REGOLA 2. Sotto i due piani non si contano i piani — si
     dice che è bassa, che è l'informazione vera. Sopra, si arrotonda:
     nessuno ha bisogno della virgola. */
  /* L'ACCORDO. «Il ponte larga sedici passi» e «il battistero bassa» si
     sentivano nei dati veri: l'aggettivo era femminile fisso. In italiano
     la -e finale non dice il genere («il ponte» ma «la torre»), quindi le
     poche parole che contano si contano. */
  var FEMMINE_IN_E = { torre: 1, cattedrale: 1, pieve: 1, croce: 1, corte: 1,
                       valle: 1, fonte: 1, sede: 1, arte: 1, chiese: 1 };
  function femminile(tipo) {
    var w = String(tipo || '').toLowerCase().split(' ')[0];
    if (!w) return true;                        // senza tipo, il femminile e' il caso piu' comune (chiesa)
    if (FEMMINE_IN_E[w]) return true;
    return /(zione|sione|ione|tà|tù|trice|ice)$/.test(w) || /a$/.test(w);
  }

  function inPiani(metri, f) {
    if (!metri || metri <= 0) return '';
    if (metri < 6) return (f ? 'bassa' : 'basso') + ', meno di due piani';
    var p = Math.round(metri / PIANO);
    return (f ? 'alta' : 'alto') + ' come un palazzo di ' + p + ' piani';
  }

  /* LARGA QUANTO? REGOLA 2 applicata alla misura piu' utile di tutte.
     L'altezza non si cammina; la larghezza si': «larga ottantacinque
     passi» dice quanto ci metti a costeggiarla, ed e' il dato che un
     bastone non ti puo' dare. Sotto i cinque metri non si dice: una
     facciata stretta e' normale, e il numero diventa rumore. */
  function larga(metri, f) {
    if (!metri || metri < 5) return '';
    return (f ? 'larga ' : 'largo ') + passi(metri);
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

  /* forma(gia): «la Torre del Mangia. Ha una torre» non si dice, e
     nemmeno «la Cupola del Brunelleschi. Ha una cupola». Quello che il
     nome dice gia' non si ripete come se fosse una scoperta: si salta, e
     si dice il pezzo DOPO — le colonne, il rosone, la scalinata. */
  function forma(lista, gia) {
    if (!lista || !lista.length) return '';
    var detto = String(gia || '').toLowerCase();
    var visti = [];
    for (var i = 0; i < lista.length && visti.length < 2; i++) {
      var k = String(lista[i] || '').toLowerCase().replace(/[^a-zà-ÿ]/g, '');
      if (k && detto.indexOf(k) >= 0) continue;
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
    var fem = femminile(x.t || x.n);
    var alt = inPiani(x.altezza, fem);

    // 4. di cosa è fatta
    var mat = materiale(x.materiali);

    // 5. che forma ha
    var fo = forma(x.forme, (x.n || '') + ' ' + (x.t || ''));
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
    var lar = larga(x.larghezza, fem);
    if (lar) seconda.push(lar);
    if (mat) seconda.push(mat);
    /* NIENTE DA DIRE, NIENTE FRASE. Senza altezza, larghezza, materiale
       ne' forma resterebbe «la Chiesa X.» — il nome che l'utente ha gia'
       sentito nel cenno — e si porterebbe via un gradino per non dire
       niente. Meglio passare subito alla storia. */
    if (!seconda.length && !fo) return null;
    var testo = pezzi.join('');
    /* LA MAIUSCOLA. Senza l'apertura («Davanti a te…») la frase parte
       dall'articolo, e dall'app si sentiva «la chiesa di Santa Maria
       delle Grazie alle Fornaci: di mattoni»: sullo schermo si legge
       male, e il lettore di schermo la attacca alla frase prima. */
    if (testo) testo = testo.charAt(0).toUpperCase() + testo.slice(1);
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

  return { frase: frase, inPiani: inPiani, passi: passi, larga: larga, femminile: femminile,
           materiale: materiale, forma: forma };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Descrizione;
