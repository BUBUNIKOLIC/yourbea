/* IL RACCONTO A GRADINI — Yourbea, rifatto il 15/10/2026
   ============================================================
   Questo file decide COSA dire e QUANDO. Non parla: restituisce una frase e
   chi la riceve la passa al motore della voce. Non sa niente di audio, di
   mappe, di schermo: per questo si può provare in un secondo, senza telefono.

   IL CONTRATTO, detto da Vince il 15/10 sera:
   «il codice che non si blocca, che approfondisce i monumenti se uno si
    ferma 10 secondi».

   I GRADINI, nell'ordine:
   0. camminando → IL CENNO: «sulla destra, a ottanta metri, Palazzo Reale».
      Uno per volta, e mai due volte lo stesso luogo.
   1. fermi dieci secondi davanti a qualcosa → LA SCHEDA: com'è fatto.
   2. ancora fermi, o «ancora» → COSA VEDERE.
   3. ancora, e solo per i luoghi grandi → L'APPROFONDIMENTO «da manuale».
   4. finito: «di questo ti ho detto tutto».

   LE REGOLE CHE NASCONO DAI DIFETTI VISTI:
   - un luogo importante non si perde mai: se non si può dirlo adesso,
     resta in attesa e si dice appena si può (Gabri a Parma);
   - in Utilità (la modalità di chi non vede) i luoghi importanti si dicono
     come la guida, non come un cenno sacrificabile;
   - fermarsi si misura sullo SPOSTAMENTO, non sulla velocità dichiarata dal
     telefono: a piedi, fermi, il GPS continua a muoversi di qualche metro;
   - niente distanze esatte per gli attraversamenti: quello lo fa un altro
     file. Qui si parla solo di luoghi da raccontare.
*/

'use strict';

function Racconto(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var FERMO_PER = o.fermoPer || 10000;      // dieci secondi, come ha detto Vince
  var FERMO_RAGGIO = o.fermoRaggio || 12;   // entro dodici metri si è «fermi»
  var RIDILLO_DOPO = o.ridilloDopo || 90000;
  var dist = o.dist || function (a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // stato: dove sono fermo da quando, cosa ho già detto, a che gradino sono
  var fermoDa = 0, fermoLat = null, fermoLon = null;
  var detti = {};            // nome -> {quando, lat, lon}
  var gradino = {};          // nome -> quanti gradini ho già detto
  var inCorso = null;        // il luogo di cui sto raccontando

  function quantiGradini(p) {
    var n = 1;               // la scheda
    if (p.i) n++;            // cosa vedere
    if (p.a) n++;            // l'approfondimento
    return n;
  }
  function giaDetto(p, qui) {
    var v = detti[p.n];
    if (!v) return false;
    if (ora() - v.quando < RIDILLO_DOPO) return true;
    // te ne sei andato e sei tornato: si può ridire
    return dist(qui.lat, qui.lon, v.lat, v.lon) < 200;
  }

  /* dove(): aggiorna il senso di «fermo». Si chiama a ogni posizione nuova. */
  function dove(qui) {
    if (fermoLat === null || dist(qui.lat, qui.lon, fermoLat, fermoLon) > FERMO_RAGGIO) {
      fermoLat = qui.lat; fermoLon = qui.lon; fermoDa = ora();
      return false;
    }
    return ora() - fermoDa >= FERMO_PER;
  }
  function fermoDaQuanto() { return fermoLat === null ? 0 : ora() - fermoDa; }

  /* prossimo(): la decisione. Restituisce null, o
     { tipo, luogo, testo, clip, livello } — niente effetti collaterali. */
  function prossimo(situazione) {
    var qui = situazione.qui;                    // {lat,lon,direzione}
    var intorno = situazione.intorno || [];      // [{p, m, rel}] già ordinati
    var modo = situazione.modo || 'tutto';       // 'servizi' | 'cultura' | 'tutto'
    var fermo = dove(qui);

    // 1. SE SONO FERMO DAVANTI A QUALCOSA: si scende di gradino
    if (fermo) {
      var vicino = (inCorso && daRaccontare(inCorso, modo)) ? inCorso : primoBuono(intorno, modo);
      if (vicino) {
        /* UTILITA' NON E' TURISMO, E FIN QUI NON SI VEDEVA.
           «Non c'è differenza tra modalità utilità e modalità turismo»
           (Vince, 19/10, provando a Fuorigrotta e a Torre del Greco). Il
           quaderno gli dà ragione: fermandosi, in UTILITA', l'app leggeva
           «Il palazzetto dello sport Mario Argento era un'opera…», «La
           piscina Felice Scandone è un complesso infrastrutturale…», «Lo
           zoo di Napoli, situato nel quartiere Fuorigrotta…». Sono schede
           da Turismo, dette a chi sta cercando di muoversi.
           Parole sue: «un non vedente in modalità utilità vuole sapere
           cosa c'è — davanti hai il municipio, lo stadio — oltre le
           fermate dell'autobus; invece il turismo vuole sapere le cose
           artistiche, storiche e architettoniche».
           Quindi: in UTILITA' si dice COS'E' e basta, e la storia resta lì
           per chi la chiede («ancora»). In TURISMO si racconta. */
        if (modo === 'servizi') {
          var quandoFermo = fermiDetti[vicino.n] || 0;
          if (ora() - quandoFermo > 180000) {
            fermiDetti[vicino.n] = ora();
            inCorso = vicino;
            return { tipo: 'aCosaServe', luogo: vicino, livello: 'guida',
                     testo: 'Qui c\'è ' + conArticolo(vicino) + '.' };
          }
          return null;
        }
        var g = gradino[vicino.n] || 0;
        if (g < quantiGradini(vicino)) {
          gradino[vicino.n] = g + 1;
          inCorso = vicino;
          if (g === 0) return { tipo: 'scheda', luogo: vicino, testo: vicino.d, livello: 'guida' };
          if (g === 1 && vicino.i) return { tipo: 'cosa-vedere', luogo: vicino, testo: 'Cosa vedere: ' + vicino.i, livello: 'guida' };
          if (vicino.a) return { tipo: 'approfondimento', luogo: vicino, testo: vicino.a, livello: 'guida' };
        }
      }
    }

    // 2. CAMMINANDO: il cenno del prossimo luogo non ancora detto
    for (var i = 0; i < intorno.length; i++) {
      var o = intorno[i], p = o.p;
      if (!daRaccontare(p)) continue;           // qui si raccontano i luoghi
      if (giaDetto(p, qui)) continue;
      /* QUELLO CHE TI SEI GIÀ LASCIATO DIETRO. «E hai passato questo
         monumento altrettanto importante… se non lo è, dietro di te hai
         superato» (Vince, 16/10). Camminando si passa accanto a una chiesa
         senza accorgersene, e un secondo dopo è alle spalle: tacere vuol
         dire fargliela perdere per sempre. Si dice in due modi: quello che
         conta si racconta come gli altri, dicendo che è dietro; quello che
         conta meno è una riga sola, e solo finché è a portata di mano. */
      var dietro = Math.abs(o.rel) > (modo === 'cultura' ? 170 : 150);
      if (dietro) {
        if (situazione.direzioneBuona === false) continue;   // senza bussola «dietro» è una bugia
        if (rango(p) >= 2 ? o.m > 120 : o.m > 45) continue;
      }
      if (o.m > raggio(p, modo)) continue;
      detti[p.n] = { quando: ora(), lat: qui.lat, lon: qui.lon };
      inCorso = p;
      gradino[p.n] = 0;
      /* In Utilità un luogo importante è GUIDA: deve aspettare il suo turno,
         non essere gettato. Era il difetto di Gabri a Parma. */
      var liv = (modo === 'servizi' && rango(p) >= 2) ? 'guida' : 'cenno';
      /* si restituiscono anche i pezzi — da che parte, quanti metri — perché
         le clip incise sono pezzi: «sulla destra» + «a 80 metri» + il nome.
         Chi riceve questa risposta non deve ricalcolarli, se no il testo e
         l'audio si disallineano. */
      if (dietro && rango(p) < 2) {
        /* uno minore, già superato: una riga e si va avanti — non si fa
           tornare indietro nessuno per una cosa che non lo merita */
        return { tipo: 'superato', luogo: p, livello: 'cenno',
                 rel: o.rel, metri: Math.round(o.m), direzioneBuona: true,
                 testo: 'Dietro di te hai superato ' + p.n + '.' };
      }
      return { tipo: 'cenno', luogo: p, livello: liv, dietro: dietro,
               rel: o.rel, metri: Math.round(o.m),
               direzioneBuona: situazione.direzioneBuona !== false,
               cardinale: situazione.cardinale || null,
               /* senza sapere come sei girato, «sulla destra» sarebbe una
                  bugia e «a nord» non dice niente: restano i metri */
               /* «e a pochi passi hai…»: prima dove, poi quanto, poi cosa.
                  Dietro si dice con parole sue, se no sembra un posto
                  nuovo invece di uno che ti sei perso. */
               testo: dietro
                 ? ('Hai appena passato ' + p.n + ', ' + metri(o.m) + ' dietro di te.')
                 : ((situazione.direzioneBuona !== false ? versoTesto(o) + ', ' : '') +
                    metri(o.m) + ', ' + p.n + '.') };
    }
    return null;
  }

  /* daRaccontare(): cosa è un luogo e cosa è un servizio.
     Nei dati k vale 0 per i servizi — negozi, studi medici, attraversamenti —
     e da 1 in su per i luoghi: 1 i normali, 2 e 3 quelli grossi, chiese e
     ville. Due difetti nello stesso punto, trovati il 15/10 a Roma:
     - CAMMINANDO si chiedeva k uguale a 1, e così le ventinove chiese e ville
       segnate 2 e 3 non si raccontavano MAI, in nessuna modalità;
     - DA FERMI non si guardava affatto che cosa fosse: in Turismo, fermo in
       Via dei Corazzieri, l'app ha raccontato la ferramenta.
     La regola è una sola e non cambia con la modalità: il racconto è dei
     luoghi. I servizi in Utilità si dicono, ma per la loro strada — la via,
     i civici, le farmacie — non diventano mai racconti. */
  /* quello che si e' gia' detto stando fermi: in Utilita' non si ripete
     «qui c'e' lo stadio» ogni dieci secondi */
  var fermiDetti = {};

  /* conArticolo(): «lo stadio Diego Armando Maradona», «la chiesa di San
     Vitale». Il tipo davanti al nome, perche' il nome da solo non dice a
     che cosa serve — ed e' proprio quello che in Utilita' serve sapere. */
  function conArticolo(p) {
    var t = String(p.t || '').toLowerCase().trim();
    var n = String(p.n || '');
    if (!t) return n;
    /* SI USA LA PRIMA PAROLA DEL TIPO, non il tipo intero. Dal quaderno di
       Vince, 20/10: «Qui c'è la chiesa cattolica chiesa di San Marco
       evangelista». Il tipo era «chiesa cattolica» e il nome cominciava
       con «chiesa»: confrontando il tipo INTERO non combaciava, e ci
       infilavamo tutto davanti. E anche quando serve, davanti si mette
       solo la prima parola: «la cattedrale Santa Maria Assunta», non «la
       cattedrale cattolica Santa Maria Assunta». */
    var capo = t.split(' ')[0];
    if (n.toLowerCase().indexOf(capo) === 0) return n;
    if (/^(il |la |lo |i |le |l'|gli )/i.test(n)) return n;
    /* un nome di una parola sola E' gia' il tipo: «Municipio», «Colosseo»,
       «Duomo». «Il palazzo comunale Municipio» non lo direbbe nessuno. */
    if (n.indexOf(' ') < 0) {
      return (femminile(n) ? 'la ' : loIl(n)) + n;
    }
    /* «la chiesa DI San Luigi dei Francesi», non «la chiesa San Luigi»:
       davanti a un santo o a un nome proprio ci vuole il «di». */
    var di = /^(San |Sant'|Santa |Santo |Santi |SS\.|Ss\.)/i.test(n) ? 'di ' : '';
    return (femminile(capo) ? 'la ' : loIl(capo)) + capo + ' ' + di + n;
  }

  /* In italiano la -e finale non dice il genere: «il ponte» ma «la
     cattedrale». Le parole che ci servono sono poche e si contano. */
  var FEMMINE_IN_E = { cattedrale: 1, torre: 1, pieve: 1, corte: 1, croce: 1,
                       valle: 1, fonte: 1, sede: 1, arte: 1, chiese: 1, parte: 1 };
  function femminile(t) {
    var w = String(t || '').toLowerCase();
    if (FEMMINE_IN_E[w]) return true;
    return /(zione|sione|gione|ione|tà|tù|trice|ice)$/.test(w) || /a$/.test(w);
  }
  function loIl(t) {
    return /^(s[bcdfgilmnpqrtv]|z|ps|gn|x|y)/.test(t) ? 'lo ' : 'il ';
  }

  function daRaccontare(p, modo) {
    if (!p || !(p.k >= 1)) return false;
    /* in TURISMO un luogo senza scheda non si racconta: «Qui c'è lo
       stadio» a chi e' uscito per vedere l'arte e' rumore. In UTILITA'
       invece e' proprio quello che serve — «davanti hai il municipio, lo
       stadio» — e infatti ci resta. */
    if (modo === 'cultura' && p.senzaScheda) return false;
    return true;
  }
  function primoBuono(intorno, modo) {
    for (var i = 0; i < intorno.length; i++) {
      if (daRaccontare(intorno[i].p, modo)) return intorno[i].p;
    }
    return null;
  }

  function rango(p) {
    if (p.r) return p.r;                         // rango già calcolato dai dati
    if ((p.d || '').length >= 240 && p.i) return 2;
    return 1;
  }
  function raggio(p, modo) {
    var base = modo === 'cultura' ? 240 : 150;
    var r = rango(p);
    return r >= 3 ? Math.round(base * 1.7) : (r === 2 ? Math.round(base * 1.3) : base);
  }
  /* QUATTRO PAROLE, NON SETTE. «In Utilità metti avanti, dietro, destra,
     sinistra. Non nord» (Vince, 16/10). «Proprio a destra» e «indietro a
     destra» sembrano precise e invece fanno fermare a pensare: chi
     cammina senza vedere ha bisogno di una parola sola, che il corpo
     esegue senza tradurla. */
  function versoTesto(o) {
    var r = o.rel;
    /* venticinque gradi, non trentacinque: a trenta gradi e ottanta metri
       una cosa è già quaranta metri di lato, e «davanti a te» manderebbe
       una persona a cercarla dritto. La prova lo ha preso al volo. */
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (Math.abs(r) > 145) return 'dietro di te';
    return r > 0 ? 'sulla destra' : 'sulla sinistra';
  }
  function metri(m) {
    if (m < 25) return 'a pochi passi';
    if (m < 1000) return 'a ' + (Math.round(m / 10) * 10) + ' metri';
    return 'a ' + (Math.round(m / 100) / 10).toString().replace('.', ' e ') + ' chilometri';
  }

  /* ancora(): quello che succede quando l'utente dice «ancora». Scende di un
     gradino sul luogo in corso, e se è finito lo dice. */
  function ancora() {
    if (!inCorso) return null;
    var g = gradino[inCorso.n] || 0;
    if (g >= quantiGradini(inCorso)) return { tipo: 'finito', luogo: inCorso, livello: 'guida',
                                              testo: 'Di questo ti ho detto tutto.' };
    gradino[inCorso.n] = g + 1;
    if (g === 0) return { tipo: 'scheda', luogo: inCorso, testo: inCorso.d, livello: 'guida' };
    if (g === 1 && inCorso.i) return { tipo: 'cosa-vedere', luogo: inCorso, testo: 'Cosa vedere: ' + inCorso.i, livello: 'guida' };
    if (inCorso.a) return { tipo: 'approfondimento', luogo: inCorso, testo: inCorso.a, livello: 'guida' };
    return { tipo: 'finito', luogo: inCorso, livello: 'guida', testo: 'Di questo ti ho detto tutto.' };
  }

  /* approfondisci(): l'utente chiede di sapere di più, in qualunque modalità.
     Se non c'è un luogo in corso si prende il più vicino che abbia qualcosa
     da dire — anche in Utilità, dove di sua iniziativa l'app parla solo di
     servizi. Era il difetto di Gabri: chiedeva «approfondisci» e si sentiva
     rispondere «Farmacia Pirani». */
  function approfondisci(situazione) {
    if (!inCorso) {
      var intorno = situazione.intorno || [];
      for (var i = 0; i < intorno.length; i++) {
        var p = intorno[i].p;
        if (p.k >= 1 && (p.d || p.a) && intorno[i].m < 260) { inCorso = p; gradino[p.n] = 0; break; }
      }
      if (!inCorso) return { tipo: 'niente', livello: 'guida',
                             testo: 'Qui intorno non ho niente da raccontare.' };
    }
    return ancora();
  }

  function salta() {
    if (inCorso) { detti[inCorso.n] = { quando: ora(), lat: fermoLat, lon: fermoLon }; inCorso = null; }
    return { tipo: 'avanti', livello: 'guida', testo: 'Andiamo avanti.' };
  }

  return {
    prossimo: prossimo, ancora: ancora, approfondisci: approfondisci, salta: salta,
    conArticolo: conArticolo,
    fermoDaQuanto: fermoDaQuanto,
    inCorso: function () { return inCorso; },
    gradinoDi: function (p) { return gradino[p.n] || 0; },
    dimentica: function () { detti = {}; gradino = {}; inCorso = null; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Racconto;
if (typeof window !== 'undefined') window.Racconto = Racconto;
