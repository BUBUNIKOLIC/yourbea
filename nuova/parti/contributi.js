/* QUELLO CHE AGGIUNGONO I TESTER — Yourbea, 25/10/2026
   ============================================================
   «Sarebbe interessante che tutti, vedenti e non vedenti, contribuissero
   in maniera attiva e semplice ad arricchire la mappa. Ad esempio io dico
   a Yourbea: qui c'è Elite. Qui c'è un attraversamento con semaforo. E in
   automatico su un server si aggiorna la mappa che tutti, accedendo a
   Yourbea, trovano» (Vince, 25/10). Mille persone selezionate, che
   chiamiamo TESTER, e si aggiungono mano a mano.

   PERCHE' CONTA: gli attraversamenti col semaforo acustico e i percorsi
   tattili NON STANNO IN NESSUNA MAPPA DEL MONDO. Non li ha OpenStreetMap,
   non li ha Google, non li hanno i Comuni — che per legge dovrebbero
   saperlo da quarant'anni. Chi cammina col bastone li conosce tutti, e
   dirli costa una frase.

   LE REGOLE, e nascono da cos'e' un contributo sbagliato: un
   attraversamento che non c'e' e' un ordine dato a un cieco.
   1. SI SEGNA DOVE SEI, NON DOVE CREDI. Il punto e' quello del motore,
      agganciato alla strada: niente indirizzi, niente «vicino a».
   2. SE LA POSIZIONE NON E' BUONA, NON SI SEGNA. Sopra i venti metri di
      errore dichiarato si dice di riprovare fra qualche passo: un punto
      incerto nella mappa di tutti vale meno di niente.
   3. SI RIPETE QUELLO CHE SI E' CAPITO, SEMPRE. «Segnato: attraversamento
      col semaforo, in via dei Corazzieri.» Chi non vede non ha modo di
      controllare, e un contributo sbagliato resta.
   4. OGNI PUNTO PORTA IL NOME DI CHI L'HA MESSO. Non per punire nessuno:
      perche' se uno sbaglia si tolgono i suoi punti in un colpo, invece
      di non fidarsi piu' di nessuno.
   5. SE IL SERVER NON C'E', IL CONTRIBUTO NON SI PERDE. Resta in coda sul
      telefono e parte da solo appena c'e' rete. Chi cammina non deve
      sapere niente di tutto questo.
*/

'use strict';

function Contributi(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var manda = o.manda || null;            // (roba) -> Promise
  var leggiCoda = o.leggiCoda || function () { return []; };
  var scriviCoda = o.scriviCoda || function () {};
  var chi = o.chi || '';                  // il codice del tester
  var PRECISIONE_BUONA = o.precisioneBuona || 20;
  var diario = o.diario || function () {};

  /* ============================================================
     COSA SI PUO' SEGNARE, e come si dice
     Le parole sono quelle che userebbe uno camminando, non quelle di una
     mappa: «con il semaforo», «che suona», «col percorso tattile».
     ============================================================ */
  var COSE = [
    { t: 'attraversamento', dice: 'attraversamento',
      parole: /attraversament|strisce|passaggio pedonale/ },
    { t: 'scalini', dice: 'scalini', parole: /scalin|gradin|scal[ae]\b/ },
    { t: 'scivolo', dice: 'scivolo del marciapiede', parole: /scivol|rampa/ },
    { t: 'fermata', dice: 'fermata dell’autobus',
      parole: /fermata|autobus|bus\b|ferma(?:no)? (?:il|lo|i|gli|la|le)\b|tram|filobus/ },
    { t: 'metro', dice: 'ingresso della metropolitana', parole: /metro|metropolitana/ },
    { t: 'ostacolo', dice: 'ostacolo', parole: /ostacol|palo|transenn|lavori|buca|dissuasor/ },
    { t: 'semaforo', dice: 'semaforo', parole: /semaforo/ },
    { t: 'tattile', dice: 'percorso tattile', parole: /tattil|loges|podotattil/ },
    /* «Qui c'e' un albero» (Vince, 25/10): per chi cammina col bastone un
       albero e' un riferimento e un ostacolo insieme. */
    { t: 'albero', dice: 'albero', parole: /alber|aiuola/ },
    { t: 'panchina', dice: 'panchina', parole: /panchin|sedut/ },
    { t: 'fontanella', dice: 'fontanella', parole: /fontanell|nasone/ },
    { t: 'bagno', dice: 'bagno pubblico', parole: /bagno pubblico|toilette|servizi igienic/ }
  ];
  /* ============================================================
     LE LINEE DELLA FERMATA
     «Nelle fermate si puo' mettere anche le linee» (Vince, 25/10). E'
     la prima cosa che serve a una fermata: non «c'e' una fermata», ma
     «da qui passa il 671». Si prendono i numeri e le sigle come li dice
     (671, 30, N1, C5), e l'app li ripete per far sentire se ha capito.
     ============================================================ */
  function leLinee(t) {
    /* si guardano le linee SOLO se la frase parla di fermate o di linee:
       se no «un attraversamento a 30 metri» diventerebbe la linea 30. */
    if (!/fermat|linea|linee|passa|ferma|autobus|bus\b|tram|filobus/.test(t)) return [];
    /* e poi si prendono TUTTE. Il primo giro cercava una lista scritta a
       un modo solo, e di «il 30 e il 671» prendeva solo il 30. */
    var tutti = t.match(/\b[a-z]?\d{1,4}[a-z]?\b/g) || [];
    var fuori = [];
    tutti.forEach(function (x) {
      var n = String(x).trim().toUpperCase();
      if (!/\d/.test(n)) return;
      if (fuori.indexOf(n) < 0) fuori.push(n);
    });
    return fuori.slice(0, 8);
  }

  /* i dettagli che cambiano tutto per chi non vede */
  function dettagli(t) {
    return {
      linee: leLinee(t),
      semaforo: /semaforo|verde|rosso/.test(t) && !/senza semaforo|non c.e il semaforo/.test(t),
      acustico: /acustic|che suona|sonoro|suona/.test(t),
      tattile: /tattil|loges|podotattil/.test(t),
      senzaSemaforo: /senza semaforo|non c.e il semaforo|niente semaforo/.test(t)
    };
  }

  function sbassa(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e')
      .replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o')
      .replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9’' ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ============================================================
     E ANCHE QUELLO CHE NON C'E' PIU'
     «Oppure: qui non c'e' piu' il ferramenta» (Vince, 25/10). Una mappa
     invecchia, e chi ci cammina e' l'unico che se ne accorge. Dire a un
     cieco «sulla destra il ferramenta» quando il ferramenta non c'e'
     piu' e' lo stesso danno di un punto inventato.
     Si segna come SMENTITA, e non si cancella niente da qui: un punto si
     spegne quando due persone diverse dicono che non c'e' piu'.
     ============================================================ */
  function laSmentita(grezzo, t) {
    /* ANCHE AL PLURALE. «Si puo' aggiungere qui NON CI SONO strisce
       pedonali» (Vince, 26/10, tornando dalla camminata): la smentita
       capiva solo «non c'e'», al singolare, e una frase naturale come
       quella non entrava. Dire che un attraversamento NON c'e' vale
       quanto dire che c'e': chi non vede si regola su quello. */
    var m = t.match(/^(?:qui|qua)\s+non\s+(?:ci\s+sono|ce\s+ne\s+sono|c\u2019e|c'e|ce|ci\s+e)\s+(?:piu\s+)?(.+)$/)
         || t.match(/^non\s+(?:ci\s+sono|ce\s+ne\s+sono)\s+(?:piu\s+)?(.+?)(?:\s+(?:qui|qua))?$/)
         || t.match(/^non\s+(?:c\u2019e|c'e|ce)\s+piu\s+(.+?)(?:\s+(?:qui|qua))?$/)
         || t.match(/^(?:ha chiuso|hanno chiuso|hanno tolto|hanno levato)\s+(.+)$/)
         || t.match(/^(.+?)\s+(?:ha chiuso|non c\u2019e piu|non c'e piu|e chiuso|e chiusa)$/);
    if (!m) return null;
    var resto = m[1].replace(/^(?:un|uno|una|il|lo|la|i|gli|le|l|dei|delle|degli)\s+/, '').trim();
    if (!resto || resto.length < 2) return null;
    for (var i = 0; i < COSE.length; i++) {
      if (COSE[i].parole.test(resto)) {
        return { cosa: 'contributo', tipo: 'tolto', che: COSE[i].t,
                 dice: COSE[i].dice, come: {}, nome: '' };
      }
    }
    var nome = resto.replace(/\s+(?:ha chiuso|e chiuso|e chiusa)$/, '').trim();
    if (nome.length < 2 || nome.length > 60) return null;
    return { cosa: 'contributo', tipo: 'tolto', che: 'posto', dice: nome, come: {}, nome: nome };
  }

  /* dallaVoce(): «qui c'e' un attraversamento col semaforo» ->
     { cosa:'contributo', tipo:'attraversamento', come:{...}, nome:'' }
     «qui c'e' Elite» -> tipo 'posto', nome 'Elite'.
     Torna null se la frase non e' un contributo. */
  /* ---------- «QUI SULLA SINISTRA C'E' MONDADORI» ----------
     28/10, via del Corso, 15:26:28. L'unico contributo che Vince ha
     provato a mandare in cinque ore, e l'app non l'ha preso: le regole
     volevano «qui» attaccato a «c'e'», e lui in mezzo ci aveva messo il
     lato — che e' il modo in cui si parla, non un disturbo. Sul server
     quel punto non e' mai arrivato.
     Fra «qui» e «c'e'» adesso ci puo' stare dove sta la cosa. */
  var LATO = '(?:[,\\s]*(?:a|al|alla|sul|sulla|su|di|in|verso)?\\s*' +
             '(?:destra|sinistra|fronte|davanti|dietro|angolo|lato|fianco)\\s*)?';
  var QUI_CE = new RegExp('^(?:qui|qua)' + LATO + '[,\\s]*(?:c\u2019e|c\'e|ce|e|sta|si trova|abbiamo)\\s+(.+)$');
  /* ---------- \u00abC'E' IL BENZINAIO QUI\u00bb ----------
     30/10, Via Laurentina. Tre delle otto segnalazioni di Vince sono
     arrivate sul server col nome sporco: \u00abC'\u00e8 il benzinaio qui\u00bb, \u00abC'\u00e8
     una siciliana gastronomia da 7 kg\u00bb, \u00abC'\u00e8 iPhone\u00bb. Nella mappa di
     tutti restavano scritte cosi'.
     Il taglio voleva \u00abqui\u00bb PRIMA di \u00abc'e'\u00bb: lui il \u00abqui\u00bb l'ha messo in
     coda, o non l'ha detto affatto \u2014 che e' come si parla. Quando il
     taglio non scattava, il nome diventava tutta la frase.
     Adesso il \u00abqui\u00bb davanti e' facoltativo e quello in coda si butta.
     Provati gli otto modi veri: i quattro sbagliati si raddrizzano e i
     tre che funzionavano (\u00abqui c'\u00e8 Elite\u00bb, \u00abqui sulla sinistra c'\u00e8
     Mondadori\u00bb, \u00abqui c'\u00e8 la farmacia Pirani\u00bb) vengono identici. */
  var TAGLIA_NOME = new RegExp('^.*?(?:(?:qui|qua)' + LATO +
    '[,\\s]*)?(?:c[\'\u2019]?[e\u00e8]|ce|sta|si trova|abbiamo)\\s+', 'i');
  var QUI_IN_CODA = /[,\s]+(?:qui|qua)\s*$/i;

  function dallaVoce(testo) {
    var grezzo = String(testo || '').trim().replace(/[?!.]+$/, '');
    /* ============================================================
       IL NOME DAVANTI SI TOGLIE
       «Secondo me dovremmo dire: Yourbea, qui passa la linea 30» (Vince,
       25/10). Chiamare l'app per nome e' il modo naturale di parlarle, e
       dentro l'app il nome non serve a niente: si toglie e si guarda il
       resto. Valgono anche «ehi Yourbea» e «senti Yourbea».
       ============================================================ */
    /* e «bea» come lo scrive la dettatura: il nome intero non arriva
       quasi mai. Dei sei nomi storpiati nei diari, quattro sono «Bea». */
    grezzo = grezzo.replace(/^(?:ehi|hey|ei|senti|scusa|ciao)?\s*(?:yourbea|urbea|bea)\s*[,:]?\s*/i, '').trim();
    var t = sbassa(grezzo);
    if (!t) return null;
    /* la smentita prima: «qui NON c'e' piu' il ferramenta» comincia come
       «qui c'e'» e finirebbe nel ramo sbagliato. */
    var smentita = laSmentita(grezzo, t);
    if (smentita) return smentita;

    /* «qui ferma il 671», «qui passano il 30 e il 671»: una fermata si
       dice anche cosi', senza «c'e'». */
    var mf = t.match(/^(?:qui|qua)\s+((?:ferma|fermano|passa|passano)\s+.+)$/);
    if (mf) {
      return { cosa: 'contributo', tipo: 'fermata', dice: 'fermata dell\u2019autobus',
               come: dettagli(mf[1]), nome: '' };
    }

    /* ============================================================
       E ANCHE SENZA «C'E'»: «QUI ATTRAVERSAMENTO PEDONALE»
       (Vince, 25/10) Camminando si parla stretto, e «qui
       attraversamento pedonale» e' il modo in cui viene. Si accetta,
       ma SOLO per le cose che conosciamo: per un posto col nome serve
       «c'e'», se no «qui vicino» o «qui intorno» — che sono domande —
       diventerebbero contributi.
       ============================================================ */
    var ms = t.match(/^(?:qui|qua)\s+(.+)$/);
    if (ms && !/^(?:c’e|c'e|ce|e|sta|si trova|abbiamo|vicino|intorno|accanto|davanti|dietro|dove|cosa|che)\b/.test(ms[1])) {
      var secco = ms[1].replace(/^(?:un|uno|una|il|lo|la|i|gli|le)\s+/, '').trim();
      for (var k = 0; k < COSE.length; k++) {
        if (COSE[k].parole.test(secco)) {
          return { cosa: 'contributo', tipo: COSE[k].t, dice: COSE[k].dice,
                   come: dettagli(secco), nome: '' };
        }
      }
    }

    var m = t.match(QUI_CE) ||
            t.match(/^(?:segnala|segna|aggiungi|metti|c’e|c'e)\s+(?:qui\s+)?(.+)$/);
    if (!m) return null;
    var resto = m[1].replace(/^(?:un|uno|una|il|lo|la|i|gli|le|dei|delle|degli)\s+/, '').trim();
    if (!resto) return null;
    for (var i = 0; i < COSE.length; i++) {
      if (COSE[i].parole.test(resto)) {
        return { cosa: 'contributo', tipo: COSE[i].t, dice: COSE[i].dice,
                 come: dettagli(resto), nome: '' };
      }
    }
    /* non e' una delle cose che conosciamo: allora e' un POSTO col suo
       nome — «qui c'e' Elite» — e il nome si tiene come l'ha detto, con
       le maiuscole. */
    /* IL NOME SI TAGLIA DAL PARLATO VERO, con gli accenti come li scrive
       il riconoscimento: «qui c'\u00e8 Elite» ha la e ACCENTATA, e il primo
       taglio cercava «c'e» — cosi' il nome restava tutta la frase. */
    var nome = grezzo
      .replace(TAGLIA_NOME, '')
      .replace(QUI_IN_CODA, '')
      .replace(/^(?:segnala|segna|aggiungi|metti)\s+(?:qui\s+)?/i, '')
      .replace(/^(?:un|uno|una|il|lo|la|i|gli|le)\s+/i, '')
      /* e NON si tolgono i tipi: «la farmacia Pirani» resta «farmacia
         Pirani», perche' a chi cammina serve sapere che e' una farmacia.
         Togliendoli restava «Pirani», che non dice niente. */
      .trim();
    if (nome.length < 2 || nome.length > 60) return null;
    return { cosa: 'contributo', tipo: 'posto', dice: nome, come: {}, nome: nome };
  }

  /* laFrase(): quello che l'app ripete, e che deve bastare a capire se ha
     sbagliato (regola 3). */
  function laFrase(c, via) {
    var pezzi = [];
    if (c.tipo === 'tolto') {
      return 'Segnato che non c\u2019\u00e8 pi\u00f9: ' + c.dice + (via ? ', in ' + via : '') + '.';
    }
    if (c.tipo === 'posto') pezzi.push(c.nome);
    else {
      pezzi.push(c.dice);
      if (c.come.acustico) pezzi.push('col semaforo acustico');
      else if (c.come.semaforo) pezzi.push('col semaforo');
      else if (c.come.senzaSemaforo) pezzi.push('senza semaforo');
      if (c.come.tattile && c.tipo !== 'tattile') pezzi.push('col percorso tattile');
      if (c.come.linee && c.come.linee.length) {
        pezzi.push('con ' + (c.come.linee.length > 1 ? 'le linee ' : 'la linea ') +
                   c.come.linee.join(', '));
      }
    }
    return 'Segnato: ' + pezzi.join(', ') + (via ? ', in ' + via : '') + '.';
  }

  /* segna(): il contributo vero. Torna la frase da dire, o il motivo per
     cui non si e' potuto segnare. */
  function segna(c, dove) {
    if (!c) return null;
    if (!dove || typeof dove.lat !== 'number') {
      return { tipo: 'niente', testo: 'Non so ancora dove siamo: riprova fra qualche passo.' };
    }
    if (dove.prec && dove.prec > PRECISIONE_BUONA) {
      /* REGOLA 2: un punto incerto nella mappa di tutti vale meno di
         niente. Si dice perche', se no sembra che l'app non abbia capito. */
      return { tipo: 'niente',
               testo: 'Qui la posizione non è abbastanza precisa per segnarlo: riprova fra qualche passo.' };
    }
    var roba = {
      v: 1, t: c.tipo, n: c.nome || '', che: c.che || '',
      lat: Math.round(dove.lat * 1e6) / 1e6,
      lon: Math.round(dove.lon * 1e6) / 1e6,
      prec: Math.round(dove.prec || 0),
      via: dove.via || '',
      quando: ora(), chi: chi
    };
    if (c.come) {
      if (c.come.semaforo) roba.sem = 1;
      if (c.come.acustico) roba.ac = 1;
      if (c.come.tattile) roba.tat = 1;
      if (c.come.senzaSemaforo) roba.sem = 0;
      if (c.come.linee && c.come.linee.length) roba.lin = c.come.linee;
    }
    inCoda(roba);
    provaAMandare();
    return { tipo: 'segnato', roba: roba, testo: laFrase(c, dove.via) };
  }

  /* ============================================================
     LA CODA: UN CONTRIBUTO NON SI PERDE (regola 5)
     Camminando la rete va e viene, e in metropolitana non c'e'. Il
     contributo resta sul telefono e parte da solo: chi cammina non deve
     sapere niente di tutto questo.
     ============================================================ */
  function inCoda(roba) {
    var coda = leggiCoda() || [];
    coda.push(roba);
    while (coda.length > 200) coda.shift();
    scriviCoda(coda);
    diario('CONTRIBUTO in coda: ' + roba.t + (roba.n ? ' «' + roba.n + '»' : '') +
           ' (in coda: ' + coda.length + ')');
  }

  var staMandando = false;
  function provaAMandare() {
    if (staMandando || !manda) return Promise.resolve(0);
    var coda = leggiCoda() || [];
    if (!coda.length) return Promise.resolve(0);
    staMandando = true;
    var quanti = coda.length;
    return Promise.resolve(manda(coda)).then(function (ok) {
      staMandando = false;
      /* IL SERVER PUO' DIRE SI' E NON PRENDERE NIENTE. Capita a chi non ha
         il codice del tester («tester sconosciuto»): e' una cosa che si
         rimedia dopo, col link, percio' i punti RESTANO in coda e
         ripartono da soli. Buttarli e' perdere per sempre quello che una
         persona ha camminato e detto. */
      if (ok && typeof ok === 'object' && ok.presi === 0 &&
          (ok.scartati || []).some(function (s) { return s.perche === 'tester sconosciuto'; })) {
        diario('CONTRIBUTI: il server non mi conosce come tester, restano in coda (' + quanti + ')');
        return 0;
      }
      if (ok) {
        scriviCoda([]);
        diario('CONTRIBUTI mandati: ' + quanti);
        return quanti;
      }
      diario('CONTRIBUTI: il server non ha preso niente, restano in coda (' + quanti + ')');
      return 0;
    }, function (e) {
      staMandando = false;
      diario('CONTRIBUTI: niente rete, restano in coda (' + quanti + ')');
      return 0;
    });
  }

  function quantiInCoda() { return (leggiCoda() || []).length; }

  return { dallaVoce: dallaVoce, segna: segna, laFrase: laFrase,
           provaAMandare: provaAMandare, quantiInCoda: quantiInCoda };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Contributi;
if (typeof window !== 'undefined') window.Contributi = Contributi;
