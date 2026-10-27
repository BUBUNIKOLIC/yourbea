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

  /* ============================================================
     REGOLA 1, RIFATTA IL 24/10: UNA REGOLA SOLA, VALIDA DAPPERTUTTO
     «Non serve la regola singola, serve che sia valido dappertutto. Il
     mare si fa» — e poi: «non e' l'Etna, e' la regola che deve valere
     dappertutto» (Vince).
     Prima c'era una TABELLA DI CLASSI: costa 5 km, montagna 5 km, isola
     5 km... e ogni volta che una cosa finiva nella classe sbagliata si
     aggiustava la tabella. Cosi' l'Isola Tiberina (trecento metri, in
     mezzo ai palazzi) era un'«isola» come Capri; togliendo la classe si
     perdeva anche Capri, cioe' il mare.
     LA REGOLA, una sola: **una cosa si vede se e' grande rispetto a
     quanto e' lontana.** Non e' un'opinione, e' quanto occupa
     dell'orizzonte davanti a te:
         grandezza / distanza  >  un ottavo
     Capri, larga 10 km, da 15 km: 0,67 — mezzo orizzonte, si vede.
     Il Vesuvio, largo 10 km, da 12: 0,8.
     L'Isola Tiberina, larga 300 m, da 3 km: 0,1 — dietro i palazzi, no.
     I Due Fratelli, larghi 200 m, da 600: 0,33 — ce li hai davanti, si.
     La grandezza e' un dato vero, non una classe: la prende
     `strumenti/quanto-e-grande.py` dal poligono di OpenStreetMap e la
     scrive nel campo `gr`, in metri. Se la grandezza non c'e', la cosa
     non si dice: meglio tacere che indovinare quanto e' grande.
     ============================================================ */
  var QUANTO_DELL_ORIZZONTE = o.quantoDellOrizzonte || 0.125;
  /* PROVATO E SCARTATO (24/10): un limite «se ci sei dentro non e'
     paesaggio» (grandezza piu' di tre volte la distanza). Sembrava
     giusto per la Costiera amalfitana, che nei dati e' un punto a undici
     chilometri da Vietri mentre comincia sotto i piedi — ma spegneva il
     GOLFO di Salerno, largo trenta chilometri e a settecento metri, che
     e' esattamente la cosa che Vince vuole sentire. Una cosa grande che
     ti circonda la vedi comunque. Quindi niente secondo limite: resta
     la regola sola. */
  var SI_VEDE_AL_MASSIMO = o.siVedeAlMassimo || 30000;   // oltre, c'e' la curva della Terra e la foschia

  function siVede(p, m) {
    var gr = Number(p && p.gr);
    if (!isFinite(gr) || gr <= 0) return false;
    if (m > SI_VEDE_AL_MASSIMO) return false;
    if (m < 1) return true;
    return (gr / m) > QUANTO_DELL_ORIZZONTE;
  }

  /* la tabella di prima resta solo per dire COS'E' paesaggio (un monte
     si, una chiesa no): quanto lontano lo decide la regola qui sopra. */
  /* ISOLE, FIUMI, SPIAGGE E PORTI NON SONO PAESAGGIO, e la soglia non
     c'entra. L'Isola Tiberina e' lunga trecento metri e sta in mezzo ai
     palazzi: per la regola era un'«isola» come Capri. Ho provato a
     cavarmela contando quanti luoghi hai intorno — «se sono tanti sei
     in citta'» — e il numero sbagliato l'ha fatta passare lo stesso:
     ventidue luoghi invece di venticinque, e l'isola e' tornata.
     Un numero scelto a occhio non e' una regola. La regola vera e':
     il paesaggio e' quello che vedi e non puoi raggiungere — un monte,
     il golfo, la costa, un lago, una valle, un parco, un paese sul
     fianco della collina. Un'isola nel fiume, una spiaggia, un porto,
     un fiume: quelli sono POSTI, e li racconta il racconto quando ci
     passi accanto, come tutto il resto.
     Capri vista da Napoli ci perde. Pazienza: meglio perdere Capri che
     dire «in lontananza l'Isola Tiberina» a uno in via dei Corazzieri. */
  var QUANTO_LONTANO = {
    'costa': 5000, 'golfo': 5000, 'baia': 5000, 'montagna': 5000,
    'area protetta': 5000, 'parco regionale': 5000, 'lago': 4000, 'valle': 4000,
    'collina': 3500, 'passo di montagna': 3500, 'comune italiano': 3000,
    'frazione': 2500
    /* ISOLA, SPIAGGIA, PORTO E FIUME NON STANNO QUI, e il 24/10 c'erano
       ancora: la spiegazione sopra era stata scritta nel commento ma non
       nel codice, e Vince l'ha sentito di nuovo — «mai piu' che a via
       dei Corazzieri dica: in lontananza c'e' l'Isola Tiberina». Un
       commento che dice una cosa e una tabella che ne fa un'altra e'
       peggio di niente. */
  };

  /* E LA DIFFERENZA FRA I DUE FRATELLI E L'ISOLA TIBERINA.
     Gli scogli davanti a Vietri sono paesaggio: sono il motivo per cui
     questo file esiste. L'Isola Tiberina no: e' lunga trecento metri e
     sta in mezzo ai palazzi.
     Togliere le isole dalla tabella faceva sparire tutt'e due. Contare
     quanti luoghi hai intorno — «se sono tanti sei in citta'» — non e'
     una regola: e' un numero scelto a occhio, e a Trastevere ne ha
     contati ventidue invece di venticinque e l'isola e' passata.
     La differenza vera e' il MARE. Un'isola, una spiaggia, un porto
     sono paesaggio se intorno c'e' del mare: una costa, un golfo, una
     baia. A Vietri ci sono; a Roma no — e il Tevere non e' il mare.
     Non e' una soglia: e' quello che distingue le due cose. */
  var VUOLE_IL_MARE = { 'isola': 1, 'spiaggia': 1, 'porto': 1 };
  var MARE = { 'costa': 1, 'golfo': 1, 'baia': 1, 'mare': 1 };
  /* venti chilometri: nei dati una costa o un golfo sono UN punto
     per una cosa lunga decine di chilometri, e il punto della
     Costiera amalfitana sta a undici chilometri da Vietri — che
     sul mare ci sta dentro. */
  var QUANTO_LONTANO_IL_MARE = o.quantoLontanoIlMare || 20000;
  function cEIlMare(luoghi, qui) {
    for (var i = 0; i < (luoghi || []).length; i++) {
      var p = luoghi[i];
      if (p && p.t && MARE[p.t] && p.lat &&
          dist(qui.lat, qui.lon, p.lat, p.lon) < QUANTO_LONTANO_IL_MARE) return true;
    }
    return false;
  }

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
    /* e si parla piu' spesso, perche' andando forte il panorama cambia
       per davvero: a piedi un quarto d'ora, in macchina quattro minuti. */
    var aspetta = (s.aPiedi === false) ? Math.round(FRA_UNA_E_L_ALTRA / 4) : FRA_UNA_E_L_ALTRA;
    if (ora() - ultimaVolta < aspetta) return null;               // REGOLA 5

    /* REGOLA 7: QUANTO LONTANO SI GUARDA DIPENDE DA COME TI MUOVI.
       «In autostrada a sinistra c'era il Vesuvio, a destra il golfo con le
       isole: erano lontani, ma c'era un panorama che un non vedente magari
       può apprezzare» (Vince, 19/10). E subito dopo, la cosa che conta:
       «non è il particolare, è la regola generale».
       La regola: a piedi si guarda vicino, perché il mondo arriva piano e
       quello che conta è a portata di passi; in macchina si guarda lontano,
       perché il vicino sfila via prima di poterlo dire e quello che resta
       fermo all'orizzonte è il paesaggio. Quattro volte piu' lontano. */
    /* IL QUATTRO VOLTE NON VALE PER TUTTO.
       Vince, 23/10, in via dei Corazzieri: «in Turismo mi ha indicato
       l'Isola Tiberina, sara' a sei chilometri minimo». L'isola e'
       segnata 5.000 metri, ma se l'app crede che tu non sia a piedi
       moltiplica per quattro e arriva a VENTI chilometri. Da un
       finestrino il Vesuvio a venti chilometri lo vedi davvero; un
       isolotto no, e nemmeno un fiume o una spiaggia.
       Il moltiplicatore resta solo per le cose che sono grandi di
       natura: le montagne, il golfo, la costa, i parchi, i laghi. */
    var GRANDI_DI_NATURA = {
      'montagna': 1, 'collina': 1, 'golfo': 1, 'costa': 1, 'baia': 1,
      'area protetta': 1, 'parco regionale': 1, 'lago': 1, 'valle': 1,
      'passo di montagna': 1
    };
    var quantoSiVede = (s.aPiedi === false) ? 4 : 1;

    var ilMare = cEIlMare(s.luoghi, qui);
    var avanti = null, lato = null;
    (s.luoghi || []).forEach(function (p) {
      if (!p || !p.n || !eDelPaesaggio(p)) return;
      if (ora() - (detti[p.n] || 0) < RIPOSO) return;             // REGOLA 5
        var m = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (VUOLE_IL_MARE[p.t] && !ilMare) return;
      var fattore = GRANDI_DI_NATURA[p.t] ? quantoSiVede : 1;
      /* REGOLA 1: non «la sua classe arriva a tanti metri», ma «quanto
         occupa dell'orizzonte da qui». Il fattore resta perche' in
         movimento si guarda piu' lontano (regola 7). */
      if (!siVede(p, m / (fattore || 1))) return;
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
