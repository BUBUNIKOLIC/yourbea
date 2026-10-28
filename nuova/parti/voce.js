/* IL MOTORE DELLA VOCE — Yourbea, rifatto il 15/10/2026
   ============================================================
   Questo file fa UNA cosa: far uscire le parole dall'altoparlante, una per
   volta, nell'ordine giusto, senza mai restare in silenzio.

   Perché è stato riscritto: nella versione vecchia la voce stava dentro un
   file di ottomila righe insieme a tutto il resto, e tre giorni di difetti
   raccontati dai provatori — «si accavallano», «si blocca», «non parla» —
   sono venuti tutti da lì. Le regole sotto non sono idee: ognuna è un
   difetto che qualcuno ha sentito camminando.

   LE REGOLE, e chi le ha dettate:
   1. UNA VOCE SOLA. Tutto quello che parla passa da qui. Niente scorciatoie:
      chi vuol far parlare l'app chiama `parla()`. (La sorella di Vince, che
      sentiva due voci diverse raccontare la stessa cosa.)
   2. MAI SILENZIO OLTRE QUATTRO SECONDI. Se una clip non comincia a suonare
      entro tre secondi e mezzo, si dice la frase con la voce di sistema.
      Prima l'app aspettava trenta secondi, e trenta secondi di silenzio
      mentre cammini sono un'app bloccata. (Gabri, Dario, la sorella, Vince:
      tutti e quattro.)
   3. NON SI RESTA MAI OCCUPATI. Qualunque cosa accada — audio negato, clip
      che non arriva, promessa rifiutata — il turno si libera. Un motore che
      resta «occupato» è muto per sempre. (Gabri, 14/10.)
   4. LE PRIORITÀ NON ZITTISCONO I MONUMENTI. Un annuncio importante aspetta
      il suo turno; non viene gettato. Solo i cenni ripetibili si buttano.
      (Gabri a Parma: ha camminato in centro e non ha sentito un monumento.)
   5. LA STESSA FRASE NON DUE VOLTE. Entro otto secondi, la stessa cosa non
      si ridice — tranne se è una risposta a un comando dell'utente.
   6. IL MICROFONO TACE MENTRE L'APP PARLA. Se no l'app si sente da sola e
      esegue comandi che nessuno ha dato.

   Non conosce: mappe, luoghi, GPS, interfaccia. Si prova senza telefono.
*/

'use strict';

function MotoreVoce(opzioni) {
  var o = opzioni || {};
  /* chi traduce: lo attacca app.js con `attaccaLaLingua(...)`. Finche'
     non c'e', o finche' la lingua e' l'italiano, qui non cambia niente. */
  var laLingua = null;

  // --- il mondo fuori: tutto iniettato, così il motore si prova da solo ---
  var Audio_ = o.Audio || (typeof Audio !== 'undefined' ? Audio : null);
  var sintesi = o.sintesi || null;          // { parla(testo), taci() }
  var cartellaClip = o.cartellaClip || 'voce/clip/it/';
  var ora = o.ora || function () { return Date.now(); };
  var fraPoco = o.fraPoco || function (f, ms) { return setTimeout(f, ms); };
  var annulla = o.annulla || function (id) { clearTimeout(id); };
  var diario = o.diario || function () {};
  var microfono = o.microfono || { chiudi: function () {}, apri: function () {} };

  // --- le soglie, tutte in un posto, tutte spiegate ---
  var TEMPO_CLIP = o.tempoClip || 3500;     // una clip che non parte entro questo si abbandona
  var TEMPO_FRASE = o.tempoFrase || 9000;   // tetto per una frase corta
  /* IL TETTO DEVE CRESCERE COL TESTO. Il tetto esiste perché una frase non
     resti appesa per sempre se l'audio si blocca — ma era FISSO a nove
     secondi, e la scheda di un monumento dura mezzo minuto: dopo nove
     secondi il motore la dava per finita e ci montava sopra la frase dopo.
     Con le nostre 633 schede scritte a mano non si vedeva quasi mai; con
     le 4.964 di Wikipedia, lunghe il doppio, sarebbe successo di continuo.
     Adesso il tetto è la stima della durata più metà, e non scende mai
     sotto i nove secondi né sale oltre il minuto e mezzo. */
  function tetto(testo, quanteClip) {
    /* SI PRENDE LA STIMA PIU' LUNGA DELLE DUE, NON QUELLA DELLE CLIP.
       Il quaderno del 17/10, stazione Termini, ore 16:16:
           16:15:54  PARLA: «Da manuale: fu il tempio piu' grande di Roma…»
           16:16:07  TETTO: la frase non si e' chiusa, vado avanti
           16:16:07  PARLA: «La basilica di Santa Francesca Romana…»
       Tredici secondi su una scheda che ne dura quaranta. Il conto era
       «nove secondi per clip, per una e mezzo»: un approfondimento ha UNA
       clip sola (c + '-ancora') e faceva 13,5 secondi — ma quella clip e'
       la registrazione dell'intero approfondimento, lunga quanto il testo.
       Nove secondi vanno bene per le clip-pezzo di un cenno («sulla
       destra» + «a 80 metri» + il nome), non per una che racconta.
       Il testo e' la misura giusta in tutti e due i casi, perche' la clip
       dice le stesse parole; la stima delle clip resta come minimo per i
       cenni, dove il testo e' corto ma i pezzi sono tanti. */
    var daTesto = 1200 + String(testo || '').length * 55;
    var daClip = quanteClip ? (quanteClip * 9000) : 0;
    var stima = Math.max(daTesto, daClip);
    return Math.max(TEMPO_FRASE, Math.min(150000, Math.round(stima * 1.5)));
  }
  var DOPPIONE = o.doppione || 8000;        // la stessa frase non si ridice entro questo
  var CODA_MAX = o.codaMax || 4;

  // --- i livelli: più alto interrompe più basso ---
  var EMERGENZA = 3, GUIDA = 2, CENNO = 1;

  // --- lo stato, tutto qui dentro: nessuna variabile globale ---
  var turno = 0;
  var parlando = false;
  var livelloInCorso = 0;
  var coda = [];
  var inCorso = null;            // la clip che sta suonando
  var ultimoTesto = '', ultimoQuando = 0;
  var orologi = [];              // i tempi in corso, per annullarli tutti

  function scorda() {
    for (var i = 0; i < orologi.length; i++) annulla(orologi[i]);
    orologi = [];
  }
  function fra(f, ms) { var id = fraPoco(f, ms); orologi.push(id); return id; }
  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* zittisci(): tutto quello che sta parlando smette, e quello che stava per
     parlare non parla più. Alza il turno: i richiami delle cose vecchie
     trovano un turno diverso dal loro e tacciono. */
  function zittisci() {
    turno++;
    scorda();
    if (inCorso) {
      try { inCorso.pause(); } catch (e) {}
      try { inCorso.onended = null; inCorso.onerror = null; } catch (e) {}
      inCorso = null;
    }
    if (sintesi) try { sintesi.taci(); } catch (e) {}
  }

  /* finito(): la frase è finita per davvero. Libera il turno, riapre il
     microfono e fa partire quella in coda, se c'è. */
  function finito(mio) {
    if (mio !== turno) return;
    parlando = false;
    livelloInCorso = 0;
    inCorso = null;
    var prossima = saltaLeScadute();
    if (prossima) { avvia(prossima); return; }
    // niente più da dire: il microfono torna ad ascoltare, ma non subito —
    // l'ultima sillaba sta ancora uscendo dall'altoparlante
    fra(function () { if (!parlando) microfono.apri(); }, 900);
  }

  /* ============================================================
     DOPO LA TELEFONATA, LA VOCE DEVE RIATTACCARE
     «Ieri mi hanno chiamato e dopo non si e' riattaccata» (Vince,
     24/10). Quando arriva una telefonata iOS mette in pausa l'audio
     dell'app: l'elemento che stava parlando resta li', fermo a meta'
     frase, e `onended` non arriva mai — quindi `finito()` non viene
     chiamato, il turno non si libera, e tutto quello che c'e' in coda
     non parla piu'. L'app resta viva e muta, che per chi non vede e' la
     cosa peggiore.
     Il guscio ora, appena l'interruzione finisce, chiama questa
     funzione. Qui si guarda cosa c'e':
       - se la frase in corso e' in pausa a meta', si riprova a farla
         ripartire; se il telefono non la fa ripartire, la si considera
         finita e si passa a quella dopo — meglio la frase successiva che
         il silenzio;
       - se non c'era niente in corso ma la coda non e' vuota, si
         riparte da quella.
     ============================================================ */
  function riprendi() {
    diario('VOCE: l\'audio e\' tornato, riprendo');
    if (inCorso) {
      var fermo = false;
      try { fermo = !!inCorso.paused; } catch (e) { fermo = true; }
      if (fermo) {
        var mio = turno;
        var ripartita = false;
        try {
          var p = inCorso.play();
          if (p && typeof p.then === 'function') {
            p.then(function () { ripartita = true; }).catch(function () {});
          } else { ripartita = true; }
        } catch (e) {}
        /* se dopo un secondo e' ancora ferma, la si lascia andare e si
           passa alla prossima: non si resta appesi a una frase morta. */
        fra(function () {
          var ancoraFerma = true;
          try { ancoraFerma = !inCorso || inCorso.paused; } catch (e) {}
          if (ancoraFerma && mio === turno) { finito(mio); }
        }, 1000);
        return;
      }
      return;                      // sta parlando: non si tocca
    }
    if (coda.length) {
      var prossima = saltaLeScadute();
      if (prossima) { avvia(prossima); return; }
    }
    /* niente da dire: almeno il microfono torna ad ascoltare */
    if (!parlando) { try { microfono.apri(); } catch (e) {} }
  }

  /* saltaLeScadute(): una frase può restare in coda dieci, dodici secondi.
     In quel tempo il mondo cambia, e certe frasi diventano false: provando
     la mappa il 15/10 l'app ha detto «non ho il permesso di sapere dove
     sei» dodici secondi dopo che le posizioni erano arrivate — la frase era
     giusta quando è nata, e bugiarda quando è uscita. Chi mette in coda una
     frase così le attacca una condizione, e qui si ricontrolla PRIMA di
     aprire bocca. Le frasi senza condizione non cambiano niente. */
  function saltaLeScadute() {
    while (coda.length) {
      var f = coda.shift();
      if (f.valida && !f.valida()) { diario('SCADUTA, non la dico: ' + String(f.testo).slice(0, 40)); continue; }
      if (!rifaiLaFrase(f)) continue;
      return f;
    }
    return null;
  }

  /* ---------- IL NUMERO INVECCHIA MENTRE LO DICI ----------
     A piedi si fa un passo e mezzo al secondo. Fra il momento in cui
     l'app decide «a 40 passi» e quello in cui uno lo SENTE passano
     secondi: la frase aspetta in coda dietro a un'altra, e la voce ci
     mette il suo. Quando senti «40» sei a 33 — e l'errore va SEMPRE
     nella stessa direzione, quindi non si compensa mai: si accumula.
     `valida` sapeva soltanto buttare una frase diventata falsa. `rifai`
     la riscrive: chi la mette in coda passa una funzione, e la distanza
     si ricalcola nel momento in cui la frase esce. Se non ha più niente
     da dire, torna vuoto e la frase si butta. */
  function rifaiLaFrase(f) {
    if (!f || typeof f.rifai !== 'function') return true;
    var nuovo;
    try { nuovo = f.rifai(); } catch (e) { return true; }   // meglio la vecchia che niente
    if (nuovo === null || nuovo === undefined) return true;
    nuovo = String(nuovo).trim();
    if (!nuovo) { diario('RIFATTA a vuoto, non la dico: ' + String(f.testo).slice(0, 40)); return false; }
    if (nuovo !== f.testo) {
      diario('RIFATTA uscendo dalla coda: «' + String(f.testo).slice(0, 40) + '» → «' + nuovo.slice(0, 40) + '»');
      f.testo = nuovo;
      /* il confronto dei doppioni segue il testo nuovo, se non gliene
         hanno dato uno apposta */
      if (!f.uguale || f.uguale === f.testo) f.uguale = nuovo;
    }
    return true;
  }

  var dettaDaSistema = -1;        // il turno in cui la voce di sistema ha già parlato
  function conLaVoceDiSistema(mio, testo) {
    if (mio !== turno) return;
    /* UNA FRASE, UNA VOLTA. Qualunque strada porti qui — clip mancante,
       clip lenta, audio negato — per un turno si ripiega una volta sola.
       È l'ultima difesa: le strade che ci arrivano sono tre e si
       incrociano in ordini diversi a seconda del telefono. */
    if (dettaDaSistema === mio) { diario('GIÀ DETTA A VOCE, non la ripeto'); return; }
    dettaDaSistema = mio;
    if (!sintesi) { finito(mio); return; }
    diario('VOCE DI SISTEMA: ' + String(testo).slice(0, 40));
    /* SI ASPETTA CHE ABBIA FINITO DAVVERO, non che sia passato il tempo che
       pensavamo. La stima resta, ma solo come rete: su certi telefoni
       «onend» non arriva mai, e senza rete il motore resterebbe occupato per
       sempre. La rete e' larga — due volte e mezzo la stima — perche' farla
       scattare su una frase ancora in corso e' esattamente il difetto che
       stiamo chiudendo. */
    var chiuso = false;
    function hoFinito() {
      if (chiuso || mio !== turno) return;
      chiuso = true;
      finito(mio);
    }
    try { sintesi.parla(testo, hoFinito); } catch (e) { hoFinito(); return; }
    var stima = 1200 + String(testo).length * 55;
    fra(function () {
      if (chiuso || mio !== turno) return;
      diario('LA VOCE NON HA DETTO DI AVER FINITO: vado avanti');
      if (sintesi) try { sintesi.taci(); } catch (e) {}   // prima si spegne, poi si prosegue
      hoFinito();
    }, Math.min(150000, Math.round(stima * 2.5)));
  }

  /* avvia(): fa parlare una frase. Qui dentro non si decide niente: le
     decisioni sono state prese in parla(). */
  function avvia(f) {
    var mio = ++turno;           // il turno nuovo: le cose vecchie tacciono
    scorda();
    /* E LE COSE VECCHIE TACCIONO DAVVERO. «Il turno nuovo» fermava i tempi
       ma non il suono: se la frase di prima era uscita dalla voce di
       sistema e questa qui ha le clip incise, la voce vecchia continuava
       sotto le clip nuove — due voci insieme, ed e' quello che Vince ha
       sentito sulla Basilica di Massenzio il 17/10. Qui si spegne tutto
       quello che sta ancora suonando, qualunque strada abbia preso. */
    if (inCorso) {
      try { inCorso.pause(); } catch (e) {}
      try { inCorso.onended = null; inCorso.onerror = null; } catch (e) {}
      inCorso = null;
    }
    if (sintesi) try { sintesi.taci(); } catch (e) {}
    parlando = true;
    livelloInCorso = f.livello;
    ultimoTesto = normalizza(f.uguale || f.testo);
    ultimoQuando = ora();
    microfono.chiudi();
    diario('PARLA (' + f.livello + '): ' + String(f.testo).slice(0, 60));

    // il tetto: qualunque cosa vada storta, entro il tetto si va avanti
    fra(function () {
      if (mio === turno && parlando) { diario('TETTO: la frase non si è chiusa, vado avanti'); finito(mio); }
    }, tetto(f.testo, f.clip && f.clip.length));

    if (!f.clip || !f.clip.length || !Audio_) { conLaVoceDiSistema(mio, f.testo); return; }

    var i = 0, saltate = 0;
    (function prossimaClip() {
      if (mio !== turno) return;
      if (i >= f.clip.length) { inCorso = null; fra(function () { finito(mio); }, 250); return; }
      var nome = f.clip[i++];
      var a;
      try { a = new Audio_(cartellaClip + nome + '.m4a'); } catch (e) { conLaVoceDiSistema(mio, f.testo); return; }
      a.preload = 'auto';
      inCorso = a;
      var gestita = false;

      a.onended = function () { if (mio === turno) prossimaClip(); };
      a.onerror = function () {
        if (mio !== turno || gestita) return;
        gestita = true;
        saltate++;
        diario('CLIP MANCANTE: ' + nome);
        // una o due clip mancanti si saltano; di più, si dice tutto a voce
        if (saltate <= 2 && i < f.clip.length) { prossimaClip(); return; }
        inCorso = null;
        conLaVoceDiSistema(mio, f.testo);
      };

      /* LA REGOLA 2, scritta: se entro TEMPO_CLIP la clip non ha cominciato
         a suonare — e lo si vede dal tempo che avanza — non si aspetta
         altro. Una clip finita ha il tempo avanzato: non la si confonde con
         una mai partita. */
      fra(function () {
        if (mio !== turno || gestita) return;
        if (a.currentTime > 0) return;
        gestita = true;
        diario('CLIP LENTA: ' + nome + ', passo alla voce di sistema');
        try { a.pause(); } catch (e) {}
        inCorso = null;
        conLaVoceDiSistema(mio, f.testo);
      }, TEMPO_CLIP);

      var p;
      try { p = a.play(); } catch (e) { p = null; }
      if (p && p.catch) p.catch(function (err) {
        /* UNA CLIP BUSSA DUE VOLTE. Quando il file non c'è, il browser fa
           partire l'errore dell'elemento E POI rigetta la promessa di
           play(): due colpi per la stessa clip. Qui `gestita` si segnava
           ma non si guardava, così il secondo colpo ripiegava di nuovo
           sulla voce di sistema — e con cinque clip la stessa frase si
           sentiva quattro volte (15/10, provando le passeggiate). */
        if (gestita) return;
        gestita = true;
        if (mio !== turno) return;
        // pause() fa rigettare con AbortError: è un'interruzione voluta,
        // non un guasto, e non si ripiega
        if (err && err.name === 'AbortError') return;
        diario('AUDIO NEGATO: ' + (err && err.name));
        try { a.pause(); } catch (e2) {}
        inCorso = null;
        conLaVoceDiSistema(mio, f.testo);
      });
    })();
  }

  /* parla(): l'unica porta. Restituisce true se la frase è stata presa in
     carico (detta o messa in coda), false se è stata scartata — e chi
     chiama deve poterlo sapere, se no apre domande su frasi mai dette. */
  function parla(testo, opz) {
    var p = opz || {};
    /* LA LINGUA, nell'ultimo momento utile — 28/10/2026.
       Qui passa tutto quello che l'app dice: e' il solo punto da cui si
       puo' tradurre senza toccare le trecento chiamate sparse nel
       codice. Se la traduzione manca, `di()` restituisce l'italiano e
       non si perde niente — meglio un'app tradotta a meta' che un'app
       muta a meta'. */
    if (laLingua && typeof laLingua.di === 'function') testo = laLingua.di(testo);
    var livello = p.livello || CENNO;
    var clip = p.clip || null;
    var ancheSeUguale = !!p.ancheSeUguale;
    var valida = typeof p.valida === 'function' ? p.valida : null;
    var rifai = typeof p.rifai === 'function' ? p.rifai : null;
    /* COSA SI CONFRONTA, PER LA REGOLA 5. Da quando parti/modi.js cambia la
       parolina davanti ai cenni — «Senti, sulla destra…», «Ecco, sulla
       destra…» — la stessa frase arriva qui scritta in due modi, e il
       confronto sul testo intero non la riconoscerebbe più: tornerebbe il
       difetto di via Marconi, ripetuta perché il paragone includeva un
       pezzo che cambiava. Chi veste una frase passa qui quella nuda. */
    var daConfrontare = p.uguale || testo;

    if (!testo) return false;

    // REGOLA 5: la stessa frase non due volte
    if (!ancheSeUguale && normalizza(daConfrontare) === ultimoTesto && ora() - ultimoQuando < DOPPIONE) {
      diario('GIÀ DETTA: ' + String(testo).slice(0, 40));
      return false;
    }

    if (!parlando) {
      /* anche senza coda si rifà: fra il decidere e l'aprire bocca c'è
         comunque il tempo del motore, e la regola dev'essere una sola. */
      var subito = { testo: testo, clip: clip, livello: livello, uguale: daConfrontare, rifai: rifai };
      if (!rifaiLaFrase(subito)) return false;
      avvia(subito);
      return true;
    }

    /* REGOLA 4, RIFATTA IL 23/10: UNA FRASE NON SI TAGLIA A META'.
       «La app non si deve bloccare o balbettare con la voce» (Vince).
       Il balbettio non veniva solo dalla musica: era scritto qui. Una
       frase piu' importante zittiva quella in corso a meta' parola, e
       chi ascolta non sente «e' arrivata una cosa piu' urgente»: sente
       l'app che si inceppa. E una frase troncata, a chi non vede, e'
       un'informazione persa — non sa nemmeno cosa si e' perso.
       Adesso si taglia SOLO per quello che riguarda i piedi: un avviso
       (uno scalino, un attraversamento) e l'emergenza. Tutto il resto —
       una strada, un monumento, una risposta — aspetta che la frase in
       corso finisca, e passa davanti agli altri in coda. Al massimo
       sono tre secondi. */
    var puoTagliare = (livello >= EMERGENZA) || !!p.avviso;
    if (livello > livelloInCorso && puoTagliare) {
      zittisci();
      avvia({ testo: testo, clip: clip, livello: livello, uguale: daConfrontare });
      return true;
    }
    if (livello > livelloInCorso) {
      /* non taglia, ma non si mette in fondo: parla appena l'altra finisce */
      coda.unshift({ testo: testo, clip: clip, livello: livello, valida: valida,
                     rifai: rifai, uguale: daConfrontare });
      if (coda.length > CODA_MAX) coda.length = CODA_MAX;
      diario('APPENA FINISCE (' + livello + '): ' + String(testo).slice(0, 40));
      return true;
    }
    for (var i = 0; i < coda.length; i++) {
      if (normalizza(coda[i].uguale || coda[i].testo) === normalizza(daConfrontare)) { diario('GIÀ IN CODA'); return true; }
    }
    if (livello === CENNO && coda.length >= CODA_MAX) { diario('CODA PIENA, cenno buttato'); return false; }
    coda.push({ testo: testo, clip: clip, livello: livello, valida: valida, rifai: rifai, uguale: daConfrontare });
    coda.sort(function (a, b) { return b.livello - a.livello; });
    if (coda.length > CODA_MAX) coda.length = CODA_MAX;
    diario('IN CODA (' + livello + '): ' + String(testo).slice(0, 40));
    return true;
  }

  function ferma() { zittisci(); parlando = false; livelloInCorso = 0; coda = []; microfono.apri(); }

  return {
    parla: parla,
    attaccaLaLingua: function (l) { laLingua = l; },
    ferma: ferma,
    /* la chiama il guscio quando la telefonata e' finita */
    riprendi: riprendi,
    staParlando: function () { return parlando; },
    livello: function () { return livelloInCorso; },
    inCoda: function () { return coda.slice(); },
    EMERGENZA: EMERGENZA, GUIDA: GUIDA, CENNO: CENNO
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = MotoreVoce;
if (typeof window !== 'undefined') window.MotoreVoce = MotoreVoce;
