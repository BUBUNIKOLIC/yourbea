/* ============================================================
   TOCCA E PARLA — nuova Yourbea, 5/11/2026
   Nel browser il telefono apre il microfono solo dopo un tocco: e' una
   regola di Safari e di Chrome, non nostra, e nessun codice la aggira.
   I diari di Maria (Samsung Internet) e di Jacopo (Safari) lo mostrano:
   l'app chiede «come ti chiami?» e non riceve mai una risposta, mentre
   il tester preme dieci volte il tasto grande che ha sotto il dito.
   Allora il tasto grande, nel browser, e' questo: si tocca una volta
   (anche col doppio tocco di VoiceOver e TalkBack, che il tenere premuto
   non lo fanno bene) e si dice UNA frase.
   Nell'app installata non serve: li' il microfono e' sempre aperto e
   c'e' il telefono alla bocca. Questo pezzo e' la scorta del browser.

   LE REGOLE
   1. UN TOCCO, UNA FRASE. Si ascolta finche' arriva una frase, al
      massimo dieci secondi. Un secondo tocco mentre ascolta, smette.
   2. PRIMA DI ASCOLTARE, L'APP TACE: se no il microfono sente lei.
   3. NON SI RESTA MAI MUTI. Se non ha sentito niente lo dice; se il
      telefono nega il microfono lo dice, con dove si da' il permesso.
   4. L'ASCOLTO SEMPRE APERTO SI SOSPENDE E POI RIPRENDE: due
      riconoscitori insieme non li regge nessun telefono.
   5. OGNI COSA VA NEL DIARIO, compresi gli errori: senza, un diario
      non sa dire se il microfono e' sordo o capisce male.
   ============================================================ */
'use strict';

function Parla(o) {
  o = o || {};
  var diario = o.diario || function () {};
  var fraPoco = o.fraPoco || function (f, ms) { return setTimeout(f, ms); };
  var annulla = o.annulla || function (id) { clearTimeout(id); };
  var MASSIMO = o.massimo || 10000;
  var attivo = null, orologio = null, sentito = false, guaio = '';

  function chiudi() {
    if (orologio) { annulla(orologio); orologio = null; }
    var r = attivo; attivo = null;
    return r;
  }

  function finito() {
    chiudi();
    if (!sentito) {
      if (guaio === 'not-allowed' || guaio === 'service-not-allowed') {
        o.dice('Il telefono non mi lascia usare il microfono. Va dato il permesso al microfono nelle impostazioni del browser.');
      } else if (guaio && guaio !== 'no-speech' && guaio !== 'aborted') {
        o.dice('Il microfono non ha funzionato. Tocca e riprova.');
      } else {
        o.dice('Non ti ho sentito. Tocca e riprova.');
      }
    }
    if (o.dopo) o.dopo();
  }

  /* tocca(): il tasto. Torna cosa ha fatto, per le prove e per il diario. */
  function tocca() {
    if (attivo) {                                   // REGOLA 1: secondo tocco
      diario('PARLA: secondo tocco, smetto');
      var r = chiudi();
      sentito = true;                               // non dire «non ti ho sentito»: l'ha deciso lui
      try { r.abort ? r.abort() : r.stop(); } catch (e) {}
      if (o.dopo) o.dopo();
      return 'smetto';
    }
    var r2 = null;
    try { r2 = o.crea ? o.crea() : null; } catch (e) { r2 = null; }
    if (!r2) {
      diario('PARLA: questo browser non ha il riconoscimento della voce');
      o.dice('Questo browser non sa ascoltare. Serve l’app installata.');
      return 'niente';
    }
    if (o.zittisci) o.zittisci();                   // REGOLA 2
    if (o.prima) o.prima();                         // REGOLA 4
    sentito = false; guaio = '';
    attivo = r2;
    r2.continuous = false;
    r2.interimResults = false;
    r2.maxAlternatives = 3;
    if (o.lingua) r2.lang = o.lingua();
    r2.onstart = function () { diario('PARLA: ascolto (' + (r2.lang || '?') + ')'); };
    r2.onresult = function (e) {
      var ipotesi = [];
      for (var i = e.resultIndex || 0; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        for (var j = 0; j < e.results[i].length && j < 3; j++) {
          var t = e.results[i][j] && e.results[i][j].transcript;
          if (t && String(t).trim()) ipotesi.push(String(t).trim());
        }
      }
      if (!ipotesi.length) return;
      sentito = true;
      diario('PARLA: sentito — ' + ipotesi.join(' | '));
      o.alSentito(ipotesi);
    };
    r2.onerror = function (ev) {
      guaio = (ev && ev.error) || 'errore ignoto';
      diario('PARLA: errore — ' + guaio);               // REGOLA 5
    };
    r2.onend = function () { if (attivo === r2) finito(); };
    orologio = fraPoco(function () {
      diario('PARLA: dieci secondi senza una frase, chiudo');
      try { r2.stop(); } catch (e) {}
    }, MASSIMO);
    try { r2.start(); }
    catch (e) {
      guaio = (e && (e.name || e.message)) || 'non parte';
      diario('PARLA: non parte — ' + guaio);
      finito();
      return 'guasto';
    }
    if (o.segnale) o.segnale();
    return 'ascolto';
  }

  return { tocca: tocca, staAscoltando: function () { return !!attivo; } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Parla;
if (typeof window !== 'undefined') window.Parla = Parla;
