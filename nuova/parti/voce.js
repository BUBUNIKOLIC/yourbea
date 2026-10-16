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
    var stima = quanteClip ? (quanteClip * 9000) : (1200 + String(testo || '').length * 55);
    return Math.max(TEMPO_FRASE, Math.min(90000, Math.round(stima * 1.5)));
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
      return f;
    }
    return null;
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
    try { sintesi.parla(testo); } catch (e) {}
    // non sappiamo quando finisce: si stima dalla lunghezza, con un tetto
    fra(function () { finito(mio); }, 1200 + String(testo).length * 55);
  }

  /* avvia(): fa parlare una frase. Qui dentro non si decide niente: le
     decisioni sono state prese in parla(). */
  function avvia(f) {
    var mio = ++turno;           // il turno nuovo: le cose vecchie tacciono
    scorda();
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
    var livello = p.livello || CENNO;
    var clip = p.clip || null;
    var ancheSeUguale = !!p.ancheSeUguale;
    var valida = typeof p.valida === 'function' ? p.valida : null;
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

    if (!parlando) { avvia({ testo: testo, clip: clip, livello: livello, uguale: daConfrontare }); return true; }

    // REGOLA 4: più importante interrompe; pari o meno importante aspetta;
    // solo un cenno, che è ripetibile, si butta se non c'è posto
    if (livello > livelloInCorso) {
      var interrotta = null;
      if (livelloInCorso >= GUIDA && ultimoTesto) interrotta = null;  // le guide non si riprendono
      zittisci();
      avvia({ testo: testo, clip: clip, livello: livello, uguale: daConfrontare });
      return true;
    }
    for (var i = 0; i < coda.length; i++) {
      if (normalizza(coda[i].uguale || coda[i].testo) === normalizza(daConfrontare)) { diario('GIÀ IN CODA'); return true; }
    }
    if (livello === CENNO && coda.length >= CODA_MAX) { diario('CODA PIENA, cenno buttato'); return false; }
    coda.push({ testo: testo, clip: clip, livello: livello, valida: valida, uguale: daConfrontare });
    coda.sort(function (a, b) { return b.livello - a.livello; });
    if (coda.length > CODA_MAX) coda.length = CODA_MAX;
    diario('IN CODA (' + livello + '): ' + String(testo).slice(0, 40));
    return true;
  }

  function ferma() { zittisci(); parlando = false; livelloInCorso = 0; coda = []; microfono.apri(); }

  return {
    parla: parla,
    ferma: ferma,
    staParlando: function () { return parlando; },
    livello: function () { return livelloInCorso; },
    inCoda: function () { return coda.slice(); },
    EMERGENZA: EMERGENZA, GUIDA: GUIDA, CENNO: CENNO
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = MotoreVoce;
if (typeof window !== 'undefined') window.MotoreVoce = MotoreVoce;
