/* ============================================================
   SI OBBEDISCE SOLO A CHI CHIAMA «YOURBEA» — nuova Yourbea, 5/11/2026
   Il diario di Vince del 5/11, 19:40-19:43: il microfono sempre aperto
   sente tutto, e una frase detta da altri — «devi andare a firmare in
   questura…» — e' diventata un «portami a». Poco dopo «quale», ed e'
   ripartita a cercare. Vince ha deciso: si obbedisce solo alle frasi che
   cominciano (o finiscono) con il nome dell'app.

   LE REGOLE
   1. COL NOME DAVANTI O DIETRO, PASSA — e passa INTERA, col nome: i
      comandi lo sanno gia' leggere, e «stop» da solo per scelta non
      chiude, mentre «Europea stop» si'. Questo pezzo decide solo SE si
      obbedisce. Valgono le storpiature contate nei diari (Bea, Urbe...).
   2. SENZA NOME PASSA SOLO QUANDO E' CHIARO CHE PARLI CON LEI:
      - hai toccato «Tocca e parla», o sei nei dieci secondi del
        telefono alla bocca;
      - sei alla porta e lei ti ha appena chiesto turismo o utilita';
      - ti ha appena fatto una domanda e la risposta e' corta.
   3. «ZITTO», «SILENZIO», «BASTA» DA SOLI PASSANO SEMPRE: farla tacere
      deve costare una parola, non due.
   4. TUTTO IL RESTO NON E' PER LEI: si scrive nel diario quante parole
      erano, non le parole (le conversazioni degli altri non si tengono).
   ============================================================ */
'use strict';

function IlNome(o) {
  o = o || {};
  var NOMI = o.nomi || 'yourbea';
  var diario = o.diario || function () {};
  var PRIMA = '(?:(?:ok|okay|ehi|hey|ei|senti|scusa|ciao|di)[, ]+)?';
  var DAVANTI = new RegExp('^' + PRIMA + '(?:' + NOMI + ')\\b[,.!:]?\\s*(.*)$', 'i');
  var DIETRO = new RegExp('^(.+?)[,\\s]+(?:' + NOMI + ')[.!?]?$', 'i');
  var SILENZIO = /^(?:zitto|zitta|zitti|silenzio|basta)[.!]?$/i;
  var RISPOSTA_CORTA = 6;

  function parole(t) { return String(t || '').split(/\s+/).filter(Boolean).length; }

  /* una frase sola: torna la frase da eseguire, o null */
  function una(frase, stato) {
    var t = String(frase || '').trim();
    if (!t) return null;
    if (DAVANTI.test(t) || DIETRO.test(t)) return t;      // REGOLA 1
    if (stato.toccato) return t;                          // REGOLA 2
    if (stato.allaPorta && parole(t) <= RISPOSTA_CORTA) return t;
    if (stato.aspetta && parole(t) <= RISPOSTA_CORTA) return t;
    if (SILENZIO.test(t)) return t;                       // REGOLA 3
    return null;
  }

  /* filtra(): una frase o le ipotesi del riconoscitore (fino a tre).
     Torna lo stesso tipo che riceve, o null. */
  function filtra(testo, stato) {
    stato = stato || {};
    var lista = Array.isArray(testo) ? testo : [testo];
    for (var i = 0; i < lista.length; i++) {
      var buona = una(lista[i], stato);
      if (buona !== null) {
        if (!Array.isArray(testo)) return buona;
        /* l'ipotesi buona passa per prima, le altre dietro come sono */
        return [buona].concat(lista.filter(function (x, j) { return j !== i; }));
      }
    }
    diario('SENZA IL NOME: una frase di ' + parole(lista[0]) + ' parole, non era per me');   // REGOLA 4
    return null;
  }

  return { filtra: filtra };
}

if (typeof module !== 'undefined' && module.exports) module.exports = IlNome;
if (typeof window !== 'undefined') window.IlNome = IlNome;
