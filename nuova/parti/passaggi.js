/* QUELLO CHE PASSI, MENTRE LO PASSI — Yourbea, 16/10/2026
   ============================================================
   «Serve uno strumento per avere dati su quello che c'è intorno MAN MANO
   CHE AVANZIAMO su una strada» (Vince, 16/10).

   La scena (parti/scena.js) fa il riassunto del posto: dove sei, com'è
   fatto, cosa c'è nei dintorni. Questo file fa un'altra cosa, e per chi
   non vede è quella che conta di più: dice le cose UNA PER UNA, nel
   momento in cui ci passi davanti. È la differenza fra una cartina letta
   ad alta voce e qualcuno che cammina con te.

   Non costa niente: sono gli stessi dati della mappa che già scarichiamo.

   LE REGOLE, e perché:

   1. SI DICE QUANDO CI SEI AL TRAVERSO, non quando è davanti. Una vetrina
      annunciata a quaranta metri non si trova: annunciata quando ce l'hai
      di fianco, la tocchi. Quindici metri.

   2. SOLO QUELLO CHE HA UN NOME O SERVE. «Negozio» non dice niente;
      «Farmacia Pirani» sì, e «panchina» pure, perché ci si siede.

   3. UNA COSA ALLA VOLTA, E MAI DUE VOLTE. Passando si incontra di tutto:
      si dice la più vicina, e quella cosa lì non si ripete più finché non
      si cambia strada.

   4. NON PIÙ DI UNA OGNI OTTO SECONDI. In un corso pieno di negozi
      sarebbe una filastrocca, e sopra ci deve passare la guida.

   5. DA CHE PARTE SEI GIRATO, O NIENTE. Mai i punti cardinali: a chi
      cammina non dicono niente.
*/

'use strict';

/* statoDi(): «il bar, chiuso adesso», non «il bar, chiusa adesso».
   Sentito il 21/10 nel banco di prova: «Romolo — bar, chiusa adesso».
   L'aggettivo era femminile fisso, e meta' dei posti sono maschili. */
function statoDi(tipo, aperto) {
  if (aperto !== true && aperto !== false) return '';
  var w = String(tipo || '').toLowerCase().split(' ')[0];
  var FEMMINE_IN_E = { stazione: 1, pensione: 1 };
  var f = !!FEMMINE_IN_E[w] ||
          /(zione|sione|gione|ione|tà|tù|trice|ice)$/.test(w) || /a$/.test(w);
  if (aperto) return f ? ', aperta' : ', aperto';
  return f ? ', chiusa adesso' : ', chiuso adesso';
}

function Passaggi(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var ora = o.ora || function () { return Date.now(); };
  var TRAVERSO = o.traverso || 15;
  var OGNI = o.ogni || 8000;

  var detti = {};
  var ultimaVolta = 0;

  /* COSE CHE SI DICONO ANCHE SENZA NOME: sono utili per sé. */
  var UTILI_DA_SOLE = { panchina: 1, fontanella: 1, 'bagno pubblico': 1, 'fermata': 1,
                        "fermata dell'autobus": 1, 'fermata del tram': 1, stazione: 1,
                        'ingresso della metropolitana': 1,
                        parcheggio: 1, 'cassetta postale': 1, bancomat: 1,
                        /* quelle che si prendono addosso, o che aiutano a
                           scegliere la strada: valgono anche senza nome */
                        paletto: 1, scalini: 1, 'scivolo del marciapiede': 1, ascensore: 1 };

  /* GLI AVVISI. «Importanti sono gli avvisi» (Vince, 19/10, prima di
     andare a Napoli). Scalini, paletti, scivoli, ascensori e
     attraversamenti non sono descrizione: sono quello su cui uno inciampa,
     o quello che gli fa scegliere da che parte passare. Un avviso non
     aspetta il suo turno e non si spegne col filtro «solo monumenti»: chi
     chiede meno chiacchiere non sta chiedendo meno sicurezza. */
  var DA_MACCHINA = { distributore: 1, 'pompa di benzina': 1, benzinaio: 1,
    officina: 1, autofficina: 1, autolavaggio: 1, gommista: 1, carrozzeria: 1,
    concessionario: 1, autonoleggio: 1, 'noleggio auto': 1, autoscuola: 1,
    'ricambi auto': 1, 'stazione di servizio': 1 };

  var AVVISI = { paletto: 1, scalini: 1, 'scivolo del marciapiede': 1,
                 ascensore: 1, attraversamento: 1, 'scala mobile': 1,
                 cordolo: 1, dissuasore: 1 };
  function eUnAvviso(cosa) { return !!AVVISI[cosa]; }

  function chiave(p) {
    return (p.nome || p.cosa || '?') + '@' + Math.round((p.lat || 0) * 100000) + ',' + Math.round((p.lon || 0) * 100000);
  }

  function daCheParte(qui, p, direzione, buona) {
    if (typeof direzione !== 'number' || buona === false) return null;   // REGOLA 5
    var g = verso(qui.lat, qui.lon, p.lat, p.lon);
    var r = ((g - direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 30) return 'davanti a te';
    if (r > 30) return 'sulla destra';
    return 'sulla sinistra';
  }

  function vaDetto(p) {
    if (!p || !p.servizio) return false;
    if (p.cosa === 'attraversamento') return false;      // li dice la scena, riassunti
    /* NIENTE ROBA DA MACCHINA. «Dà indicazioni di autofficine, pompe di
       benzina, che per un non vedente sono un ossimoro» (Vince, 20/10).
       Non servono nemmeno al turista a piedi: un distributore non e' un
       punto di riferimento per chi cammina. Se uno lo chiede, si trova
       lo stesso — questo filtro vale solo per quello che l'app dice da
       sola. */
    if (DA_MACCHINA[String(p.cosa || '').toLowerCase()]) return false;
    return !!p.nome || !!UTILI_DA_SOLE[p.cosa];          // REGOLA 2
  }

  /* ============================================================
     GLI AVVISI ARRIVANO PRIMA, IN PASSI
     «È importante che in Utilità guidi il non vedente, non dica "sei
     qui"… dica dove deve andare o descriva, non dica dove è» (Vince,
     21/10). È la frase che regge tutto, e condanna anche gli avvisi com'erano:
     «stai passando lo scivolo del marciapiede» arriva quando ci sei
     sopra — è ancora «sei qui», e non serve a nessuno. Un attraversamento
     si dice PRIMA, con quanti passi mancano, se no non è un avviso: è una
     cronaca.
     Qui si guarda davanti — un cono stretto, quaranta gradi — fino a
     trentacinque metri, e si dice in passi. Il nome resta per dopo:
     quello che serve subito è quanto manca e cos'è. */
  /* QUANTO PRIMA SI DICE UN ATTRAVERSAMENTO.
     Erano 35 metri, cioe' quasi cinquanta passi, e il 22/10 Vince l'ha
     sentito in strada: «non dire a quaranta passi trovi attraversamento
     pedonale». Quaranta passi sono mezzo minuto: li conti, ti distrai, e
     quando ci arrivi non te ne ricordi piu'. E nel frattempo il marciapiede
     puo' girare.
     Ma toglierlo no: «dovrebbe esserci, sennò un non vedente attraversa e
     viene investito». Quindi si dice piu' tardi, non meno: quindici metri
     sono venti passi, un quarto di minuto a passo d'uomo — il tempo di
     rallentare e cercare il bordo, senza perdere il conto. E quando ci sei
     sopra lo ridice `prossimo()`, che e' l'avviso che conta. */
  var DAVANTI = o.davanti || 15;        // metri: prima e' troppo presto
  var CONO = o.cono || 40;              // gradi: dev'essere davvero davanti
  var PASSO = 0.75;

  function inPassi(m) {
    var p = Math.round(m / PASSO / 5) * 5;
    if (p <= 5) return 'pochi passi';
    return p + ' passi';
  }

  /* ============================================================
     L'ATTRAVERSAMENTO SI DICE SEMPRE CON L'AVVERTENZA
     «Ci deve essere sempre annuncio che la guida indica non e' precisa
     negli attraversamenti — per non avere problemi» (Vince, 24/10).
     Il GPS a piedi sbaglia dai dieci ai trenta metri: dire «a venti
     passi l'attraversamento» a chi non vede e' un ordine che esegue, e
     l'attraversamento puo' essere qualche metro piu' avanti o piu'
     indietro. Finora la regola era non dare imperativi; adesso l'app lo
     DICE, ogni volta che nomina un attraversamento.
     «Secondo me non bisogna dire "non e' preciso"» — e poi: «bisogna dire
     nell'arco di 20/30 metri prestare attenzione» (Vince, 24/10, dopo
     aver letto il campione). La prima versione diceva «ma la posizione
     non e' precisa»: ripetuta a ogni attraversamento spaventa e non dice
     cosa fare. Questa da' la stessa informazione — l'attraversamento e'
     da cercare in un tratto di strada, non in un punto — e dice la cosa
     utile: fai attenzione.
     ============================================================ */
  var NON_PRECISO = o.nonPreciso || ', nell\'arco di 20 o 30 metri: presta attenzione, o chiedi a qualcuno dov\'e\'';

  /* comeSiChiama(): di un avviso conta cos'e' e cosa ha, non il nome. */
  function dettagli(p) {
    if (p.cosa === 'attraversamento') {
      var pezzi = [];
      if (p.suona) pezzi.push('col semaforo acustico');
      else if (p.semaforo) pezzi.push('col semaforo');
      else pezzi.push('senza semaforo');
      if (p.tattile) pezzi.push('col percorso tattile');
      return 'un attraversamento ' + pezzi.join(', ') + NON_PRECISO;
    }
    if (p.cosa === 'scalini') {
      return (p.quanti ? p.quanti + ' scalini' : 'degli scalini') +
             (p.corrimano ? ', col corrimano' : '');
    }
    if (p.cosa === 'scivolo del marciapiede') {
      return 'lo scivolo del marciapiede' + (p.tattile ? ', col percorso tattile' : '');
    }
    if (p.cosa === 'paletto' || p.cosa === 'dissuasore') return 'un paletto';
    if (p.cosa === 'ascensore') return 'un ascensore';
    if (p.cosa === 'scala mobile') return 'una scala mobile';
    return p.nome || p.cosa;
  }

  /* inArrivo(): quello che hai davanti e che devi sapere PRIMA. */
  function inArrivo(s) {
    var qui = s.qui, punti = s.punti || [];
    if (!qui || typeof s.direzione !== 'number' || s.direzioneBuona === false) return null;
    if (ora() - ultimaVolta < OGNI) return null;

    var mig = null, dmin = Infinity;
    punti.forEach(function (p) {
      if (!p || !eUnAvviso(p.cosa)) return;
      var k = 'avanti:' + chiave(p);
      if (detti[k]) return;
      var d = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d > DAVANTI) return;
      var rel = ((verso(qui.lat, qui.lon, p.lat, p.lon) - s.direzione + 540) % 360) - 180;
      if (Math.abs(rel) > CONO) return;
      if (d < dmin) { dmin = d; mig = p; }
    });
    if (!mig) return null;
    detti['avanti:' + chiave(mig)] = ora();
    ultimaVolta = ora();
    return {
    tipo: 'passaggio', livello: 'guida', avviso: true, cosa: mig,
             testo: 'Fra ' + inPassi(dmin) + ', ' + dettagli(mig) + '.' };
  }

  /* prossimo(): la cosa che stai passando adesso, o null. */
  function prossimo(s) {
    var qui = s.qui, punti = s.punti || [];
    if (ora() - ultimaVolta < OGNI) return null;         // REGOLA 4

    var mig = null, dmin = Infinity;
    punti.forEach(function (p) {
      if (!vaDetto(p)) return;
      var k = chiave(p);
      if (detti[k]) return;                              // REGOLA 3
      var d = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (d > TRAVERSO) return;                          // REGOLA 1
      if (d < dmin) { dmin = d; mig = p; }
    });
    if (!mig) return null;

    detti[chiave(mig)] = true;
    ultimaVolta = ora();
    var parte = daCheParte(qui, mig, s.direzione, s.direzioneBuona);
    var nome = mig.nome || capo(mig.cosa);
    /* di una scala la cosa che conta sono i gradini e il corrimano; di uno
       scivolo, se c'è il percorso tattile. Il resto è contorno. */
    if (mig.cosa === 'scalini') {
      nome = 'Scalini' + (mig.quanti ? ', ' + mig.quanti : '') + (mig.corrimano ? ', col corrimano' : '');
    }
    if (mig.cosa === 'scivolo del marciapiede' && mig.tattile) nome = 'Scivolo col percorso tattile';
    /* di una fermata la cosa che serve sono le LINEE: senza, sapere che
       c'è una fermata non ti porta da nessuna parte. */
    if (/fermata|stazione|metropolitana/.test(mig.cosa)) {
      nome = (mig.nome ? capo(mig.cosa) + ' ' + mig.nome : capo(mig.cosa));
      if (mig.linee) nome += ', ' + (String(mig.linee).indexOf(';') >= 0 ? 'linee ' : 'linea ') +
                              String(mig.linee).replace(/;/g, ', ');
      return { tipo: 'passaggio', livello: 'guida', cosa: mig,
               avviso: eUnAvviso(mig.cosa),
               testo: nome + (parte ? ', ' + parte : '') + '.' };
    }
    /* se il nome non dice che cosa è, si aggiunge il tipo: «Da Mario» da
       solo non fa capire che è un bar */
    var tipo = (mig.nome && mig.cosa && mig.nome.toLowerCase().indexOf(mig.cosa.toLowerCase()) < 0)
      ? (' — ' + mig.cosa) : '';
    /* se la mappa sa gli orari e sono semplici, si dice se è aperto
       adesso: andare fino a una farmacia chiusa è una camminata buttata.
       Gli orari di OpenStreetMap sanno essere complicatissimi: se non si
       capiscono con certezza non si dice niente, mai un «è aperto» a caso. */
    var aperto = apertoAdesso(mig.orari, s.quando);
    var stato = statoDi(mig.cosa || '', aperto);
    return { tipo: 'passaggio', livello: eUnAvviso(mig.cosa) ? 'guida' : 'cenno', cosa: mig,
             avviso: eUnAvviso(mig.cosa),
             testo: 'Stai passando ' + nome + tipo + stato + (parte ? ', ' + parte : '') + '.' };
  }

  function capo(t) { return String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1); }

  /* apertoAdesso(): true, false, o null quando non si capisce.
     Si leggono solo le forme semplici — «Mo-Fr 08:00-20:00», «Mo-Sa
     09:00-13:00,16:00-19:30», «24/7». Tutto il resto (festivi, eccezioni,
     «sunrise-sunset») torna null: meglio tacere che mandare qualcuno
     davanti a una serranda. */
  function apertoAdesso(orari, quando) {
    if (!orari) return null;
    var o = String(orari).trim();
    if (/24\/7/.test(o)) return true;
    if (/PH|SH|sunrise|sunset|week|easter|off/i.test(o)) return null;
    var d = quando ? new Date(quando) : new Date(ora());
    var giorni = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    var oggi = giorni[d.getDay()];
    var adesso = d.getHours() * 60 + d.getMinutes();
    var pezzi = o.split(';');
    var visto = false;
    for (var i = 0; i < pezzi.length; i++) {
      var m = pezzi[i].trim().match(/^([A-Za-z,\-]+)\s+(.+)$/);
      if (!m) return null;
      if (!giorniCompresi(m[1], oggi, giorni)) continue;
      visto = true;
      var fasce = m[2].split(',');
      for (var j = 0; j < fasce.length; j++) {
        var f = fasce[j].trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
        if (!f) return null;
        var da = parseInt(f[1], 10) * 60 + parseInt(f[2], 10);
        var a = parseInt(f[3], 10) * 60 + parseInt(f[4], 10);
        if (adesso >= da && adesso <= a) return true;
      }
    }
    return visto ? false : null;
  }
  function giorniCompresi(spec, oggi, giorni) {
    var dentro = false;
    spec.split(',').forEach(function (p) {
      var r = p.trim().match(/^([A-Za-z]{2})\s*-\s*([A-Za-z]{2})$/);
      if (r) {
        var a = giorni.indexOf(capo2(r[1])), b = giorni.indexOf(capo2(r[2])), q = giorni.indexOf(oggi);
        if (a < 0 || b < 0) return;
        if (a <= b ? (q >= a && q <= b) : (q >= a || q <= b)) dentro = true;
      } else if (capo2(p.trim()) === oggi) dentro = true;
    });
    return dentro;
  }
  function capo2(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1, 2).toLowerCase(); }

  /* stradaNuova(): si ricomincia da capo — le stesse cose, in un'altra
     strada o ripassandoci dopo, si possono ridire. */
  function stradaNuova() { detti = {}; }

  return { eUnAvviso: eUnAvviso, inArrivo: inArrivo, prossimo: prossimo, stradaNuova: stradaNuova, vaDetto: vaDetto, apertoAdesso: apertoAdesso, statoDi: statoDi };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Passaggi;
if (typeof window !== 'undefined') window.Passaggi = Passaggi;
