/* IL PAESAGGIO INTORNO — Yourbea, 18/10/2026
   ============================================================
   «Il non vedente vuole che sia descritta la realtà circostante: di fronte,
   davanti a te hai il golfo, Raito, i Due Fratelli… sennò numeri civici»
   (Vince, tornando da Vietri sul Mare).

   È la critica più dura che abbia fatto all'app, ed è giusta. Camminando a
   Vietri l'app diceva: stai percorrendo via Osvaldo Costabile, sei in via
   Osvaldo Costabile 18, il prossimo incrocio è via Diego Taliani. Tutte
   cose vere, e tutte su DOVE SEI — a uno che ci sta camminando. Di quello
   che aveva intorno — il mare, il golfo, i paesi aggrappati alla costa, gli
   scogli davanti — non diceva niente, perché nei dati non c'era niente:
   chiedevamo a Wikidata chiese, palazzi e musei, e intorno a Vietri
   uscivano centodieci luoghi tutti edifici.

   Chi vede alza gli occhi e il paesaggio ce l'ha. Chi non vede ce l'ha solo
   se glielo si racconta. Questo file lo racconta.

   LE REGOLE, e perché:
   1. IL PAESAGGIO È LONTANO. Una chiesa a due chilometri non si dice: non
      ci arrivi e non ti orienta. Una collina a due chilometri sì — è lì che
      stai andando, o è lì che il sole tramonta. Il raggio arriva a cinque
      chilometri, e cresce con quanto la cosa è grande.
   2. NIENTE PASSI. I passi servono per ANDARCI. Al golfo non ci vai: si
      dice «in lontananza», «a mezzo chilometro», «qui sopra».
   3. LE QUATTRO PAROLE — davanti, dietro, destra, sinistra — e mai il nord.
      Senza sapere come sei girato non si dice niente: «davanti a te» con la
      bussola sbagliata è una bugia, e sul paesaggio è una bugia grossa.
   4. DUE COSE, NON UN ELENCO. Una davanti e una di lato: «Davanti a te hai
      il golfo, e sulla destra Raito». Il terzo nome non lo tiene a mente
      nessuno.
   5. RARAMENTE. Il paesaggio non cambia camminando: lo stesso golfo detto
      ogni minuto diventa la cosa che fa spegnere l'app. Dieci minuti di
      riposo per ciascuno, e un quarto d'ora fra una frase e l'altra.
   6. SI DICE COS'È, NON SOLO COME SI CHIAMA. «Raito» da solo non dice
      niente a chi non è di lì: «il paese di Raito» sì. Ma se il nome lo
      dice già — «Monte Finestra», «I Due Fratelli» — non si raddoppia.
*/

'use strict';

function Paesaggio(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var ora = o.ora || function () { return Date.now(); };
  var RIPOSO = o.riposo || 600000;        // REGOLA 5: dieci minuti per ciascuno
  var FRA_UNA_E_L_ALTRA = o.fraDiLoro || 900000;   // e un quarto d'ora fra le frasi

  /* REGOLA 1: quanto lontano si vede una cosa, secondo cos'è. In metri. */
  var QUANTO_LONTANO = {
    'costa': 5000, 'golfo': 5000, 'baia': 5000, 'isola': 5000, 'montagna': 5000,
    'area protetta': 5000, 'parco regionale': 5000, 'lago': 4000, 'valle': 4000,
    'collina': 3500, 'passo di montagna': 3500, 'comune italiano': 3000,
    'frazione': 2500, 'porto': 2500, 'spiaggia': 2000, 'fiume': 1200
  };

  /* REGOLA 6: come si nomina. La parola davanti al nome, quando il nome
     non la dice già da sé. */
  var COME_SI_CHIAMA = {
    /* «di» o niente: si dice «il paese di Raito» ma «il fiume Irno», e
       «il fiume di Irno» suona come scritto da uno straniero. */
    'costa': ['la costa', ' di '], 'golfo': ['il golfo', ' di '],
    'baia': ['la baia', ' di '], 'isola': ["l'isola", ' di '],
    'montagna': ['il monte', ' '], 'collina': ['la collina', ' '],
    'lago': ['il lago', ' di '], 'valle': ['la valle', ' di '],
    'fiume': ['il fiume', ' '], 'spiaggia': ['la spiaggia', ' di '],
    'porto': ['il porto', ' di '], 'comune italiano': ['il paese', ' di '],
    'frazione': ['il paese', ' di '], 'area protetta': ['il parco', ' '],
    'parco regionale': ['il parco', ' '], 'passo di montagna': ['il valico', ' di ']
  };

  var detti = {};            // nome -> quando l'ho detto
  var ultimaVolta = 0;

  function eDelPaesaggio(p) {
    return !!QUANTO_LONTANO[p && p.t];
  }

  /* nome(): «il golfo di Salerno», «I Due Fratelli», «il paese di Raito». */
  function nome(p) {
    var come = COME_SI_CHIAMA[p.t];
    if (!come) return p.n;
    var n = String(p.n || '');
    /* il nome lo dice gia'? Si guardano le prime quattro lettere della
       parola, non la parola intera: «Costiera amalfitana» non comincia con
       «costa» ma con «cost», e «la costa di Costiera amalfitana» e' quello
       che usciva prima. Stessa cosa per «Colle Bellara» e «collina». */
    var parola = come[0].replace(/^(il |la |l')/, '').trim();
    var radice = parola.slice(0, 4);
    var conArticolo = "^(il |la |lo |i |le |l'|gli )?";
    if (new RegExp(conArticolo + radice, 'i').test(n)) return n;
    if (/^(il |la |lo |i |le |l'|gli )/i.test(n)) return n;
    return come[0] + come[1] + n;
  }


  /* REGOLA 2: quanto lontano, a parole. Mai in passi. */
  function quanto(m) {
    if (m < 600) return 'qui vicino';
    if (m < 1200) return 'a mezzo chilometro';
    if (m < 2500) return 'a un paio di chilometri';
    return 'in lontananza';
  }

  /* REGOLA 3: le quattro parole, e basta. */
  function dove(rel) {
    var r = Math.abs(rel);
    if (r <= 45) return 'davanti a te';
    if (r > 135) return 'alle tue spalle';
    return rel > 0 ? 'sulla destra' : 'sulla sinistra';
  }

  /* quanto vale: quello che ha una storia scritta viene prima, e fra due
     cose uguali viene prima la più grande (che si vede da più lontano) */
  function peso(p, m) {
    var v = (p.d && p.d.length > 200) ? 2 : (p.d ? 1 : 0);
    return v * 10000 + (QUANTO_LONTANO[p.t] || 0) - m;
  }

  /* intorno(): la frase, o niente. */
  function intorno(situazione) {
    var s = situazione || {};
    var qui = s.qui;
    if (!qui || s.direzioneBuona === false) return null;          // REGOLA 3
    if (typeof s.direzione !== 'number') return null;
    if (ora() - ultimaVolta < FRA_UNA_E_L_ALTRA) return null;     // REGOLA 5

    var avanti = null, lato = null;
    (s.luoghi || []).forEach(function (p) {
      if (!p || !p.n || !eDelPaesaggio(p)) return;
      if (ora() - (detti[p.n] || 0) < RIPOSO) return;             // REGOLA 5
      var m = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (m > QUANTO_LONTANO[p.t]) return;                        // REGOLA 1
      var rel = ((verso(qui.lat, qui.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180;
      var pt = { p: p, m: m, rel: rel, peso: peso(p, m) };
      if (Math.abs(rel) <= 45) {
        if (!avanti || pt.peso > avanti.peso) avanti = pt;
      } else if (Math.abs(rel) <= 135) {
        if (!lato || pt.peso > lato.peso) lato = pt;
      }
    });
    if (!avanti && !lato) return null;

    /* REGOLA 4: due, e la prima è quella davanti. */
    var pezzi = [];
    if (avanti) {
      pezzi.push('davanti a te hai ' + nome(avanti.p) +
                 (avanti.m > 600 ? ', ' + quanto(avanti.m) : ''));
      detti[avanti.p.n] = ora();
    }
    if (lato) {
      /* da sola la frase del lato si gira: «sulla sinistra hai Raito», non
         «hai sulla sinistra Raito» */
      pezzi.push(pezzi.length
        ? (dove(lato.rel) + ' ' + nome(lato.p) + (lato.m > 600 ? ', ' + quanto(lato.m) : ''))
        : (dove(lato.rel) + ' hai ' + nome(lato.p) + (lato.m > 600 ? ', ' + quanto(lato.m) : '')));
      detti[lato.p.n] = ora();
    }
    ultimaVolta = ora();
    /* si uniscono con una «e», non con un punto: «davanti a te hai il
       golfo, e sulla destra Raito» è come l'ha detto Vince, e si ascolta
       come una frase sola invece che come due annunci */
    var testo = pezzi.join(', e ') + '.';
    testo = testo.charAt(0).toUpperCase() + testo.slice(1);
    /* è un cenno: non taglia mai un racconto, e se non c'è posto si butta */
    return { tipo: 'paesaggio', livello: 'cenno', testo: testo };
  }

  function dimentica() { detti = {}; ultimaVolta = 0; }

  return { intorno: intorno, eDelPaesaggio: eDelPaesaggio, nome: nome,
           quanto: quanto, dimentica: dimentica };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Paesaggio;
if (typeof window !== 'undefined') window.Paesaggio = Paesaggio;
