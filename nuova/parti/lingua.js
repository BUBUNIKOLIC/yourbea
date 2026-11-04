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

   LE FRASI MONTATE — 04/11/2026, e prima qui c'era scritto che non si
   potevano tradurre. Si puo', e senza toccare nessuna chiamata: una
   chiave della tabella puo' avere dei BUCHI.
       "Sei entrato in {}."  ->  "Du bist in {1} angekommen."
   La frase che arriva («Sei entrato in Via dei Corazzieri.») non e' in
   tabella, ma combacia col modello: i buchi si prendono da lei e si
   rimettono dentro la traduzione. Nella traduzione i buchi sono
   numerati, {1} {2} {3}, perche' in tedesco e in giapponese l'ordine
   delle parole e' un altro e va poter cambiare.
   E I PEZZI DENTRO AL BUCO si cercano a loro volta in tabella: cosi'
   «davanti a te, a 170 passi» diventa tedesco in due passaggi, senza
   che nessuno debba scrivere la frase intera con tutti i numeri
   possibili. Un nome proprio — «Via dei Corazzieri» — non sta in
   tabella e resta com'e': giusto cosi'.
   LE DUE REGOLE CHE TENGONO IN PIEDI LA COSA:
     — un modello con poco testo fisso non si usa (sotto i 6 caratteri
       prenderebbe qualunque frase e la stravolgerebbe);
     — il piu' specifico vince: i modelli si provano dal piu' lungo.    */
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
      preparaIModelli();
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

    /* ---------- I MODELLI, le frasi montate ----------
       FISSO_MINIMO: quanto testo fisso deve avere un modello per
       potersi usare. Con «{}» da solo, o «a {}», un modello
       combacerebbe con QUALUNQUE frase e la stravolgerebbe: sei
       caratteri sono la misura sotto la quale non si rischia. */
    var FISSO_MINIMO = 6;
    var modelli = [];

    function fuggi(t) { return String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function preparaIModelli() {
      modelli = [];
      for (var k in tabella) {
        if (!Object.prototype.hasOwnProperty.call(tabella, k)) continue;
        if (k.indexOf('{}') < 0) continue;
        var fisso = k.split('{}').join('');
        if (fisso.length < FISSO_MINIMO) continue;
        var pezzi = k.split('{}');
        var re = [];
        for (var i = 0; i < pezzi.length; i++) re.push(fuggi(pezzi[i]));
        try {
          modelli.push({ re: new RegExp('^' + re.join('([\\s\\S]*?)') + '$'),
                         quanti: pezzi.length - 1, fisso: fisso.length, a: tabella[k] });
        } catch (e) {}
      }
      /* il piu' specifico vince */
      modelli.sort(function (a, b) { return b.fisso - a.fisso; });
    }

    /* daUnModello(): la frase montata, rifatta nella lingua del turista.
       `giu` e' la profondita': un pezzo dentro un buco si puo' tradurre
       a sua volta, ma non all'infinito. */
    function daUnModello(frase, giu) {
      if (giu > 3) return null;
      for (var i = 0; i < modelli.length; i++) {
        var mo = modelli[i];
        var r = String(frase).match(mo.re);
        if (!r) continue;
        /* UN BUCO E' UN NOME, NON UN'ALTRA FRASE — e la misura viene
           dai quaderni veri, non da un'idea: il buco piu' lungo che
           l'app mette davvero in una frase e' un nome di via con la
           mossa davanti, «svolta a destra su Via Antonio Cippico.»,
           39 caratteri. Ottanta lascia respiro e tiene fuori il caso
           che fa danno: «Sei in {}.» che si mangia «Sei in Via Roma,
           ma il numero civico qui non e' segnato sulla mappa.».
           La prima difesa resta l'ordine: il modello col testo fisso
           piu' lungo si prova per primo, e quello giusto vince prima
           che il generico ci arrivi.
           PRIMA C'ERA il triplo del testo fisso, e scartava proprio la
           frase della guida che si sente a ogni svolta. */
        var buchi = [], troppo = false, j;
        for (j = 1; j < r.length; j++) {
          if (String(r[j]).length > 80) troppo = true;
          buchi.push(dentro(r[j], giu + 1));
        }
        if (troppo) continue;
        return String(mo.a).replace(/\{(\d+)\}/g, function (tutto, n) {
          var v = buchi[Number(n) - 1];
          return v === undefined || v === null ? '' : v;
        });
      }
      return null;
    }

    /* dentro(): la traduzione di un pezzo, senza segnarlo fra i
       mancanti — un nome di via non e' una frase da tradurre. */
    function dentro(pezzo, giu) {
      if (!pezzo) return pezzo;
      var t = tabella[pezzo];
      if (t) return t;
      var m = daUnModello(pezzo, giu);
      return m === null ? pezzo : m;
    }

    /* la traduzione, o l'italiano. Mai niente. */
    function di(frase) {
      if (quale === 'it' || !frase) return frase;
      var t = tabella[frase];
      if (t) return t;
      var m = daUnModello(frase, 0);
      if (m !== null) return m;
      /* una frase che manca si segna una volta sola: serve a sapere
         cosa resta da tradurre, non a riempire il quaderno. */
      if (!mancanti[frase]) {
        mancanti[frase] = 1;
        diario('LINGUA: manca in ' + quale + ' — ' + String(frase).slice(0, 160));
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
