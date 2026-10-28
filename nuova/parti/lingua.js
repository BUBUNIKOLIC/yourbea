/* LA LINGUA — 28/10/2026
   ============================================================
   «Prima devi fare la traduzione nelle 20 lingue dei turisti» (Vince).

   COME E' FATTA, e perche' cosi'.
   Le frasi restano scritte in italiano dentro il codice. Qui non si
   cambia nessuna chiamata: la traduzione avviene nell'ultimo momento,
   quando la voce sta per parlare, cercando la frase italiana in una
   tabella. La chiave E' la frase italiana.
     — se la traduzione c'e', si dice quella;
     — se non c'e', si dice l'italiano, e l'app continua a funzionare
       come prima. Nessuna frase puo' sparire per colpa di una tabella
       incompleta: e' la differenza fra un'app tradotta a meta' e
       un'app muta a meta'.

   QUELLO CHE QUESTA PARTE NON PUO' FARE, e va detto chiaro: le frasi
   che l'app COMPONE — «sulla destra, a novanta passi, Tempio del Divo
   Giulio» — non sono stringhe fisse: sono regole. In tedesco l'ordine
   delle parole e' un altro, e non basta tradurre i pezzi. Quelle vanno
   riscritte parte per parte, ed e' un lavoro a se'.                  */
(function (radice) {
  'use strict';

  function Lingua(o) {
    o = o || {};
    var quale = 'it';
    var tabella = {};
    var comandiSuoi = {};        // i comandi nella lingua del turista
    var mancanti = {};
    var chiedi = o.chiedi;               // chi va a prendere il file
    var diario = o.diario || function () {};

    /* la lingua del telefono, se la sappiamo parlare */
    function dalTelefono(disponibili) {
      var n = (o.navigatore || (typeof navigator !== 'undefined' ? navigator : {})).language || 'it';
      var corta = String(n).toLowerCase().split('-')[0];
      return disponibili.indexOf(corta) >= 0 ? corta : 'it';
    }

    function metti(codice, testi, comandi) {
      quale = codice;
      tabella = testi || {};
      comandiSuoi = comandi || {};
      mancanti = {};
      diario('LINGUA: ' + codice + ', ' + Object.keys(tabella).length + ' frasi, ' +
             Object.keys(comandiSuoi).filter(function (k) { return k.charAt(0) !== '_'; }).length + ' comandi');
    }

    /* I COMANDI NELLA SUA LINGUA — 28/10/2026, Vince: «in tedesco».
       L'ascolto alterna italiano e lingua del turista, quindi qui arriva
       sia «portami a casa» sia «bring mich nach Hause». Questa funzione
       dice se una frase contiene uno dei comandi di quel gruppo nella
       lingua scelta; i comandi italiani continuano a valere sempre, e
       non si toccano. */
    function suoComando(gruppo, frase) {
      var elenco = comandiSuoi[gruppo];
      if (!elenco || !elenco.length || !frase) return false;
      var t = String(frase).toLowerCase();
      for (var i = 0; i < elenco.length; i++) {
        if (t.indexOf(String(elenco[i]).toLowerCase()) >= 0) return true;
      }
      return false;
    }

    /* la traduzione, o l'italiano. Mai niente. */
    function di(frase) {
      if (quale === 'it' || !frase) return frase;
      var t = tabella[frase];
      if (t) return t;
      /* una frase che manca si segna una volta sola: serve a sapere
         cosa resta da tradurre, non a riempire il quaderno. */
      if (!mancanti[frase]) {
        mancanti[frase] = 1;
        diario('LINGUA: manca in ' + quale + ' — ' + String(frase).slice(0, 40));
      }
      return frase;
    }

    function cambia(codice) {
      if (codice === 'it') { metti('it', {}); return Promise.resolve('it'); }
      if (!chiedi) return Promise.resolve(quale);
      return chiedi(codice).then(function (due) {
        /* `chiedi` puo' tornare le sole frasi (com'era) o frasi e
           comandi insieme: tutt'e due vanno bene. */
        if (due && due.frasi) metti(codice, due.frasi, due.comandi);
        else metti(codice, due);
        return codice;
      }).catch(function () {
        diario('LINGUA: non trovo i testi di ' + codice + ', resto in italiano');
        metti('it', {}); return 'it';
      });
    }

    return {
      di: di, cambia: cambia, quale: function () { return quale; },
      suoComando: suoComando,
      dalTelefono: dalTelefono,
      /* quello che non e' tradotto, per chi vuole completare la tabella */
      cheManca: function () { return Object.keys(mancanti); }
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Lingua;
  if (radice) radice.Lingua = Lingua;
}(typeof window !== 'undefined' ? window : null));
