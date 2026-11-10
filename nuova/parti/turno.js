/* ============================================================
   IL VIGILE DEL TURNO — Yourbea 2.0, 7/11/2026
   «Riuscire a gestire l'ascolto e il parlato, sennò è tutto inutile»
   (Vince). Prima: una quindicina di regole sparse su quattro strati, e
   nessuno che avesse in mano il turno — il microfono riavviato a metà
   frase, la sua voce presa per un comando, le chiese «bruciate» perché la
   voce sembrava occupata. Adesso decide UNO solo, con le regole che Vince
   ha approvato il 7/11 alle 11 (claude/MAPPA-CUORE.md nel progetto):

   1. Un solo vigile: quattro momenti — ASCOLTO, PARLA LEI, PARLI TU,
      ASPETTA RISPOSTA (piu' INTERROTTO). Solo lui dice se il microfono
      sta aperto e se lei puo' parlare.
   2. Quando parli tu, lei tace: nessun avviso sopra di te, salvo pericolo.
   3. La sua voce non e' mai un comando, da qualunque strada arrivi.
   4. Nessuna frase persa: il microfono non si riavvia mentre parli.
   5. Telefono alla bocca e «Yourbea…»; ma risponde anche in tasca se dici
      «Yourbea…». Alla sua domanda si risponde senza nome.
   6. Mentre aspetta una risposta, svolte e attraversamenti li dice.
   7. Qualunque interruzione dell'audio: si ferma, poi riprende.
   8. «Fermati» e «zitto» vincono sempre.
   9. Uguale su iPhone, Android e browser: qui dentro non c'e' niente che
      sappia su quale telefono gira. Il guscio dice solo se ha la pulizia
      dell'eco (`eco: true`), e consegna inizio e fine delle frasi.

   Questo file non apre microfoni e non parla: DECIDE. Chi parla e chi
   ascolta chiedono a lui.
   ============================================================ */
'use strict';

function Turno(o) {
  o = o || {};
  var ora = o.ora || function () { return Date.now(); };
  var diario = o.diario || function () {};
  /* il guscio pulisce l'eco: il microfono puo' restare aperto mentre
     parla. Puo' essere una funzione: l'iPhone lo scrive nella pagina solo
     quando ha acceso il microfono. */
  function eco() { return typeof o.eco === 'function' ? !!o.eco() : !!o.eco; }
  var NOMI = o.nomi || 'yourbea';
  var ECO_MEMORIA = 60000;                 // quanto si ricorda cosa ha detto lei (l'eco piu' tarda vista: 45 s, 6/11)
  var BOCCA = 10000;                       // dopo il gesto, dieci secondi in cui parli con lei
  var ASPETTA = 30000;                     // quanto aspetta una risposta
  var RISPOSTA_CORTA = 6;
  /* L'INTERRUZIONE NON E' PER SEMPRE (revisione del 7/11). Il 28/10 la fine
     dell'interruzione non e' arrivata MAI: se si aspettasse solo quella,
     l'app resterebbe muta per sempre, avvisi di pericolo compresi. Dopo
     venti secondi si torna comunque, e si torna subito se tu le parli. */
  /* due minuti, non venti secondi: durante una telefonata vera non deve
     rimettersi a parlare (seconda revisione del 7/11). Prima di allora la
     riporta indietro solo il guscio («audio tornato»), un tocco, o una
     frase che comincia proprio con «Yourbea» — non «ciao bea» detto a chi
     e' al telefono. */
  var INTERRUZIONE_MAX = o.interruzioneMax || 120000;
  /* ---------- E NEANCHE «PARLI TU» E' PER SEMPRE ---------- 7/11/2026
     Chi dice «stai parlando» e' il guscio (iPhone: il primo pezzo di
     frase; Android: onBeginningOfSpeech). Se il «hai finito» non arriva
     — app messa in tasca, riconoscitore ammazzato da iOS, guscio vecchio
     — qui si resterebbe in «parli tu» per sempre, cioe' app muta e
     microfono che non si riavvia mai. I gusci hanno la loro guardia, ma
     la rete sta anche qui, che vale per tutti e tre (regola 9). */
  var PARLI_MAX = o.parliMax || 15000;
  var tuDa = 0;
  var interrottaDa = 0;
  var TOCCO_VALE = 12000;                  // un tocco vale per la frase che segue, non per sempre

  var LIVELLI = { pericolo: 3, percorso: 2, normale: 1 };
  var stato = 'ascolto';                   // ascolto | parlaLei | parliTu | aspetta | interrotto
  var aspettaFino = 0, boccaFino = 0, toccatoFino = 0;
  var detteDaLei = [];                     // [{t, parole}]
  var prima = null;                        // lo stato a cui tornare dopo un'interruzione o dopo che hai parlato

  function cambia(nuovo, perche) {
    if (nuovo === stato) return;
    diario('TURNO: ' + stato + ' → ' + nuovo + (perche ? ' (' + perche + ')' : ''));
    stato = nuovo;
  }
  function aspettaViva() { return aspettaFino && ora() < aspettaFino; }
  function base() { return aspettaViva() ? 'aspetta' : 'ascolto'; }

  /* ---------- parole, per l'eco ---------- */
  function normalizza(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  }
  /* ---------- «IO BEA FERMATI» ---------- 10/11/2026
     Primo giro del banco sul telefono: l'orecchio ha sentito benissimo
     («Io bea portami alla farmacia piu' vicina», «Io Bea fermati») e
     l'app non ha risposto, perche' davanti al nome il riconoscitore ci
     mette una parolina — «io», «e», «ho», «oh» — e la lista delle
     parole ammesse davanti non le aveva. Una frase che comincia con una
     di queste e poi col nome e' per lei. */
  var NOME_RE = new RegExp('^(?:(?:ok|okay|ehi|hey|ei|senti|scusa|ciao|di|io|e|ho|oh|allora|ma|va)\\s+){0,2}(?:' + NOMI + ')\\b', 'i');
  var NOME_DIETRO = new RegExp('(?:^|\\s)(?:' + NOMI + ')[.!?]?$', 'i');
  /* «stop» da solo per scelta non passa (5/11): si dice per tante cose */
  var NOME_FORTE = /^(?:yourbea|your bea|yourbe|urbea|iurbea|jurbea)\b/i;
  var SILENZIO = /^(?:yourbea\s+)?(?:zitto|zitta|zitti|silenzio|basta|fermati)[.!]?$/i;

  /* ============================================================
     «QUI C'E' …» E' UNA SEGNALAZIONE, ANCHE SENZA IL NOME — 8/11/2026
     Acqua Acetosa, stamattina. Tre segnalazioni perse e una passata:
       12:24:44  «Qui c'e' un attraversamento pedonale con semaforo»  senza nome
       12:25:11  «In Urbania qui c'e' un semaforo»                   nome storpiato
       12:27:37  «Qui c'e' ingresso Urbe qui c'e' ingresso centro...»  nome IN MEZZO
       12:27:45  «Urbe qui e' Largo Giulio onesti»                   -> segnata
     «Qui c'e' …» non e' una chiacchiera: nessuno lo dice a un altro
     cristiano mentre cammina. E il nome, quando lo dice, gli esce dove
     capita: in mezzo, storpiato, o non gli esce.
     CONTATO sui quaderni veri del 7 e dell'8/11 prima di scriverlo: su
     136 frasi consegnate, queste due regole fanno entrare OTTO frasi, e
     sono tutte e otto segnalazioni vere o comandi. Le 115 chiacchiere di
     Venafro e di Acqua Acetosa («Offerta quattro euro», «No no che ha
     comprato la titina») restano fuori tutte.
     L'eco si guarda PRIMA, perche' «Qui c'e' il percorso Venafro — il
     centro» lo dice lei.
     ============================================================ */
  var SEGNALAZIONE = /\bqu[ia]\b.{0,24}?\b(?:c['\u2019]?[e\u00e8]|ce|ci sono|ci stanno|sta|stanno|e|\u00e8)\s+\S/i;
  /* il nome in mezzo alla frase: solo quelli che NON sono parole italiane.
     «curve», «bea» ed «europea» stanno nella lista dei nomi perche' la
     dettatura li scrive cosi', ma in mezzo a una chiacchiera sono parole
     normali, e aprirebbero la porta a tutto. */
  var NOME_IN_MEZZO = /\b(?:yourbea|yourbe|your bea|urbea|urbe|urbania|eubea|jurbea|iurbea|rube)\b/i;

  /* REGOLA 3. Una frase sentita e' la sua voce se le sue parole stanno,
     quasi tutte e nello stesso ordine, in qualcosa che lei ha detto nel
     minuto prima. Niente piu' «almeno cinque parole» o «almeno 25
     lettere»: «Dimmi.» e «vuoi utilita' o turismo» sono eco anche loro. */
  /* quante parole nello stesso ordine (la sottosequenza comune piu'
     lunga): una parola sbagliata non blocca le altre */
  function inComune(a, b) {
    var riga = new Array(b.length + 1).fill(0);
    for (var i = 1; i <= a.length; i++) {
      var prec = 0;
      for (var j = 1; j <= b.length; j++) {
        var tmp = riga[j];
        riga[j] = a[i - 1] === b[j - 1] ? prec + 1 : Math.max(riga[j], riga[j - 1]);
        prec = tmp;
      }
    }
    return riga[b.length];
  }
  function eSuaVoce(testo) {
    var p = normalizza(testo);
    if (!p.length) return false;
    var limite = ora() - ECO_MEMORIA;
    detteDaLei = detteDaLei.filter(function (d) { return d.t >= limite; });
    for (var i = 0; i < detteDaLei.length; i++) {
      var sua = detteDaLei[i].parole;
      /* UNA O DUE PAROLE SONO UNA RISPOSTA, NON UN'ECO — a meno che lei
         abbia detto proprio solo quelle («Dimmi.»). Alla domanda «vuoi
         utilita' o turismo?» la risposta «turismo» sta dentro la domanda,
         ma e' tua. */
      /* le frasi corte (fino a quattro parole): «cosa c'e' intorno» non
         e' l'eco di una scheda, e «turismo» non e' l'eco di «Turismo o
         utilita'?» (revisione del 7/11: dopo la domanda ripetuta, la porta
         non sentiva piu' la risposta). */
      /* corta: e' eco solo se contiene TUTTA la sua frase («Dimmi.»,
         «vuoi tornare a casa»). Un pezzo della domanda e' una risposta. */
      if (p.length <= 4) {
        /* «dimmi dove sono» dopo il suo «Dimmi.» e' una frase tua */
        if (sua.length && p.length <= sua.length + 1 && inComune(sua, p) === sua.length) return true;
        continue;
      }
      var uguali = inComune(sua, p);
      /* tutte se la frase e' corta, l'80% se e' lunga: il riconoscitore
         sbaglia qualche parola anche quando riascolta lei */
      /* fino a sette parole servono tutte: «portami alla farmacia piu'
         vicina» non e' l'eco di «vuoi che ti porti alla farmacia piu'
         vicina?» (seconda revisione del 7/11) */
      var serve = p.length <= 7 ? p.length : Math.ceil(p.length * 0.8);
      if (uguali >= serve) return true;
    }
    return false;
  }

  return {
    LIVELLI: LIVELLI,
    stato: function () {
      if (stato === 'interrotto' && ora() - interrottaDa > INTERRUZIONE_MAX) {
        cambia(base(), 'l\'interruzione non ha detto di essere finita: riprendo da sola');
      }
      if (stato === 'parliTu' && ora() - tuDa > PARLI_MAX) {
        cambia(prima || 'ascolto', 'quindici secondi senza la fine della frase: la chiudo io');
      }
      if (stato === 'aspetta' && !aspettaViva()) cambia('ascolto', 'nessuna risposta');
      if (stato === 'ascolto' && aspettaViva()) cambia('aspetta', 'ha fatto una domanda');
      return stato;
    },

    /* ---------- lei ---------- */
    leiInizia: function (frase) {
      detteDaLei.push({ t: ora(), parole: normalizza(frase) });
      if (stato === 'interrotto') return;
      cambia('parlaLei');
    },
    leiFinisce: function () {
      /* la memoria dell'eco si conta da quando ha FINITO di parlare: una
         scheda lunga un minuto rientra nel microfono anche alla fine */
      if (detteDaLei.length) detteDaLei[detteDaLei.length - 1].t = ora();
      /* la memoria dell'eco resta: la sua voce rientra nel microfono anche dopo */
      if (stato === 'parlaLei') cambia(base(), 'ha finito');
    },
    /* REGOLA 2 e 6 e 7: puo' dire questa frase adesso? */
    puoParlare: function (livello) {
      var l = LIVELLI[livello] || 1;
      var s = this.stato();
      if (s === 'interrotto') return false;
      if (s === 'parliTu') return l >= LIVELLI.pericolo;
      if (s === 'aspetta') return l >= LIVELLI.percorso;
      return true;
    },
    faiUnaDomanda: function () { aspettaFino = ora() + ASPETTA; },

    /* ---------- tu ---------- */
    tuInizi: function () {
      if (stato === 'interrotto') return;
      if (stato !== 'parliTu') prima = base();
      tuDa = ora();
      cambia('parliTu');
    },
    tuFinisci: function () {
      if (stato === 'parliTu') cambia(base(), 'hai finito');
    },
    boccaVicina: function () { boccaFino = ora() + BOCCA; },
    tocco: function () { toccatoFino = ora() + TOCCO_VALE; },

    /* REGOLA 3 e 5 e 8: la frase sentita e' per lei?
       torna { perLei: bool, perche: '...' } */
    frase: function (testo, info) {
      info = info || {};
      var t = String(testo || '').trim();
      var dalTocco = ora() < toccatoFino;
      if (!t) return { perLei: false, perche: 'vuota' };
      if (SILENZIO.test(t)) return { perLei: true, perche: 'fermati vince sempre' };       // 8
      var colNome = NOME_RE.test(t) || NOME_DIETRO.test(t);
      /* l'eco si guarda SEMPRE, anche col nome: fra i nomi ci sono parole
         vere («curve», «bea»), e «qui la strada fa due curve» detto da lei
         passava per un comando (revisione del 7/11) */
      if (eSuaVoce(t)) return { perLei: false, perche: 'eco: era la sua voce' };               // 3
      if (colNome) return { perLei: true, perche: 'col nome' };                               // 5
      if (NOME_IN_MEZZO.test(t)) return { perLei: true, perche: 'il nome, in mezzo alla frase' };
      if (SEGNALAZIONE.test(t)) return { perLei: true, perche: 'e\' una segnalazione: «qui c\'e\'…»' };
      if (dalTocco) return { perLei: true, perche: 'tocco' };
      if (ora() < boccaFino) return { perLei: true, perche: 'telefono alla bocca' };
      /* le parole si contano a spazi, come le conta chi parla: «c'è»
         e «dell'autobus» sono una parola, non due */
      var corta = t.split(/\s+/).filter(Boolean).length <= RISPOSTA_CORTA;
      if ((aspettaViva() || info.aspetta || info.allaPorta) && corta) {
        aspettaFino = 0;
        return { perLei: true, perche: 'risposta alla sua domanda' };
      }
      return { perLei: false, perche: 'senza nome, non era per lei' };
    },

    /* consegna(testi, info): le ipotesi del riconoscitore, una o piu'.
       Torna la prima che e' per lei (stesso tipo dell'ingresso: testo o
       lista), o null. Il diario dice perche' le altre no, senza le
       parole degli altri. */
    consegna: function (testi, info) {
      var lista = Array.isArray(testi) ? testi : [testi];
      var ultimo = null;
      for (var i = 0; i < lista.length; i++) {
        var r = this.frase(lista[i], info);
        if (r.perLei) {
          if (stato === 'interrotto' && (NOME_FORTE.test(String(lista[i]).trim()) || ora() < toccatoFino)) {
            cambia(base(), 'mi hai parlato');
          }
          toccatoFino = 0;      // il tocco e' servito: vale una frase sola
          return Array.isArray(testi) ? lista.slice(i) : lista[i];
        }
        ultimo = r.perche;
      }
      toccatoFino = 0;          // una frase e' arrivata: il tocco e' consumato anche se non era per lei
      var n = String(lista[0] || '').split(/\s+/).filter(Boolean).length;
      diario('TURNO: una frase di ' + n + ' parole non e\' per me (' + ultimo + ')');
      return null;
    },

    /* ---------- il microfono (REGOLA 1, 3, 4) ---------- */
    microfono: function () {
      var s = this.stato();
      if (s === 'interrotto') return 'chiuso';
      if (s === 'parlaLei' && !eco()) return 'chiuso';          // senza pulizia dell'eco si sentirebbe da sola
      return 'aperto';
    },
    puoRiavviareIlMicrofono: function () { return stato !== 'parliTu'; },     // 4

    /* ---------- le interruzioni (REGOLA 7) ---------- */
    interruzioneInizia: function (chi) {
      if (stato !== 'interrotto') prima = stato === 'parlaLei' ? 'parlaLei' : base();
      interrottaDa = ora();
      cambia('interrotto', chi || 'audio preso da fuori');
    },
    interruzioneFinisce: function () {
      if (stato !== 'interrotto') return null;
      var torna = prima || base();
      /* chi parlava prima riprende: si dice alla voce di ridire la frase */
      cambia(torna === 'parlaLei' ? base() : torna, 'interruzione finita');
      return torna === 'parlaLei' ? 'riprendi' : null;
    },

    /* REGOLA 8: «fermati» */
    fermati: function () { aspettaFino = 0; cambia('ascolto', 'fermati'); },

    // per le prove
    _eSuaVoce: eSuaVoce
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Turno;
if (typeof window !== 'undefined') window.Turno = Turno;
