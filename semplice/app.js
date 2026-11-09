/* ============================================================
   LA SEMPLICE — il cuore, e nient'altro.  9 novembre 2026
   «Rifarla daccapo»: qui ci sono le tredici cose di COSA-E.md e zero
   altro. Ogni riga che non serve a una delle tredici non entra.
   Si prova con:  node semplice/prove/le-13-cose.js
   ============================================================ */
'use strict';

function Semplice(o) {
  o = o || {};
  var finestra = o.finestra;                 // il telefono (vero o finto)
  var parti = o.parti;                       // i motori buoni: turno, posizione, voce...
  var ora = o.ora || function () { return Date.now(); };
  var quaderno = [];
  function diario(t) {
    quaderno.push(t);
    if (finestra && finestra.urbeaDiario) { try { finestra.urbeaDiario(t); } catch (e) {} }
  }

  var NOMI = 'yourbea|yourbe|your bea|urbea|urbe|urbania|eubea|europea|curve|curbe|jurbea|iurbea|rube|bea';
  var turno = parti.Turno({ diario: diario, nomi: NOMI, ora: ora,
                            eco: function () { return !!finestra.urbeaNonSenteSeStessa; } });
  var posizione = parti.Posizione({ diario: diario, ora: ora });
  /* la voce vuole due cose: chi dice le parole (`sintesi`) e il microfono
     da chiudere/riaprire. Qui sono due oggetti di tre righe: la sintesi
     e' quella del telefono, e il microfono e' il guscio. */
  var sintesi = {
    parla: function (testo, quandoFinisce) {
      try {
        if (!finestra.speechSynthesis) { if (quandoFinisce) quandoFinisce(); return; }
        var u = { text: testo, lang: 'it-IT', onend: quandoFinisce, onerror: quandoFinisce };
        if (finestra.SpeechSynthesisUtterance) {
          u = new finestra.SpeechSynthesisUtterance(testo);
          u.lang = 'it-IT'; u.onend = quandoFinisce; u.onerror = quandoFinisce;
        }
        finestra.speechSynthesis.speak(u);
      } catch (e) { if (quandoFinisce) quandoFinisce(); }
    },
    taci: function () { try { finestra.speechSynthesis.cancel(); } catch (e) {} }
  };
  var microfono = {
    apri: function () { try { if (finestra.urbeaAscolta) finestra.urbeaAscolta('it-IT'); } catch (e) {} },
    chiudi: function () { try { if (finestra.urbeaChiudiAscolto) finestra.urbeaChiudiAscolto(); } catch (e) {} }
  };
  var voce = parti.Voce({ diario: diario, ora: ora, vigile: turno,
                          sintesi: sintesi, microfono: microfono, cartellaClip: null });
  var modo = null;                            // 'utilita' | 'turismo'
  var casa = null;

  /* ---------- quello che l'app dice ---------- */
  function dice(frase, livello) {
    if (!frase) return;
    voce.parla(frase, { livello: livello || voce.GUIDA, ancheSeUguale: true });
  }

  /* ============================================================
     1. DOVE SONO
     ============================================================ */
  function doveSono() {
    var s = posizione.leggi();
    if (!s.pronto) { dice('Non so ancora dove siamo, aspetta un momento.'); return; }
    /* la via: prima quella su cui il motore ti ha posato (l'aggancio),
       se no quella che la mappa dice in questo punto. Se non c'e' ne'
       l'una ne' l'altra non si inventa: si dice che non si sa. */
    var via = s.viaAgganciata || (o.laVia ? o.laVia() : null) || null;
    if (!via) { dice('Non ho il nome della strada. ' + quantoPreciso(s)); return; }
    dice('Sei in ' + via + '.' + (quantoPreciso(s) ? ' ' + quantoPreciso(s) : ''));
  }
  /* la precisione si dice SOLO quando cambia la risposta (LOGICA.md 3-ter) */
  function quantoPreciso(s) {
    if (typeof s.prec !== 'number' || s.prec <= 20) return '';
    return 'Il telefono non è sicuro: posso sbagliare di ' + Math.round(s.prec) + ' metri.';
  }

  /* ============================================================
     7. COSA C'E' QUI INTORNO — una volta, e solo quello che è vero
     ============================================================ */
  var dettoIntorno = {};
  function quiIntorno() {
    var s = posizione.leggi();
    if (!s.pronto) { dice('Non so ancora dove siamo.'); return; }
    var roba = (o.intorno ? o.intorno(s) : []) || [];
    if (!roba.length) { dice('Qui intorno non ho niente da dirti.'); return; }
    var pezzi = roba.slice(0, 3).map(function (p) {
      var lato = p.lato && s.direzioneBuona ? ', ' + p.lato : '';
      return p.nome + ' a ' + Math.round(p.metri) + ' metri' + lato;
    });
    dice(pezzi.join('. ') + '.');
  }

  /* ============================================================
     8. FERMATI — vince sempre, anche mentre parla
     ============================================================ */
  function fermati() {
    voce.ferma('me l\'hai chiesto');
    diario('FERMATI: zitta');
  }

  /* ============================================================
     10. CHIUDI
     ============================================================ */
  function chiudi() {
    dice('Chiudo. A presto.');
    diario('CHIUDO');
    if (finestra.urbeaChiudi) { try { finestra.urbeaChiudi(); } catch (e) {} }
  }

  /* ============================================================
     9. MANDA IL DIARIO
     ============================================================ */
  function mandaIlDiario() {
    diario('DIARIO: lo mando');
    if (finestra.urbeaMandaDiario) { try { finestra.urbeaMandaDiario(quaderno.join('\n')); } catch (e) {} }
    dice('Ti apro il messaggio col diario.');
  }

  /* ============================================================
     2-6. PORTAMI A ...
     Tre strade, nell'ordine: un posto TUO («casa»), un TIPO di posto
     («la farmacia piu' vicina», «la fermata dell'autobus»), o un
     indirizzo. La prima che risponde vince, e **il nome di dove si va si
     dice sempre**: se l'app ha capito un altro posto, lo devi sentire
     prima di camminare (LOGICA.md: e' una guida).
     ============================================================ */
  var TIPI = {
    'farmacia': 'farmacia', 'fermata': 'fermata', 'autobus': 'fermata',
    'fermata autobus': 'fermata', 'fermata bus': 'fermata', 'bus': 'fermata',
    'metro': 'metropolitana', 'metropolitana': 'metropolitana',
    'stazione': 'stazione', 'supermercato': 'supermercato', 'bar': 'bar',
    'ufficio postale': 'ufficio postale', 'ospedale': 'ospedale',
    'pronto soccorso': 'ospedale', 'bancomat': 'bancomat'
  };
  /* «LA FARMACIA PIU' VICINA» E' UN TIPO; «LA FARMACIA CORSETTI» E' UN
     NOME. Il 6/11 l'app ha preso «farmacia» per il nome di una citta' e
     non ha trovato niente: qui si decide prima. Si levano gli articoli e
     i «piu' vicina»: se quello che resta E' il tipo, e' un tipo; se resta
     anche un nome proprio, e' un nome. */
  function cheTipo(t) {
    var pulito = String(t || '')
      /* l'apostrofo si butta: «dell'autobus» lasciava «'autobus» e il
         tipo non combaciava (preso dal banco) */
      .replace(/['\u2019]/g, ' ')
      .replace(/\b(?:il|lo|la|un|uno|una|del|dello|della|dei|degli|delle|di|dell|d)\b/g, ' ')
      .replace(/\b(?:piu|più)\s+vicin[oa]\b/g, ' ')
      .replace(/\bqui\s+vicin[oa]\b/g, ' ')
      .replace(/\bprossim[oa]\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
    var chiavi = Object.keys(TIPI);
    for (var i = 0; i < chiavi.length; i++) {
      if (pulito === chiavi[i]) return TIPI[chiavi[i]];
    }
    return null;
  }

  function portamiA(dove) {
    var s = posizione.leggi();
    if (!s.pronto) { dice('Non so ancora dove siamo: aspetta un momento e richiedimelo.'); return; }
    diario('PORTAMI A: ' + dove);
    if (/^(?:casa|a casa|casa mia)$/.test(dove)) {
      if (!casa) {
        dice('Non so dove abiti. Quando sei sulla porta di casa dimmi: Yourbea, casa è qui.');
        return;
      }
      avvia(casa, 'casa');
      return;
    }
    var mio = o.unPostoMio ? o.unPostoMio(dove) : null;
    if (mio) { avvia(mio, mio.nome || dove); return; }
    var tipo = cheTipo(dove);
    if (tipo && o.cercaTipo) {
      dice('Cerco, un momento.');
      o.cercaTipo(tipo, s, function (trovato) {
        if (!trovato) { dice('Qui intorno non trovo niente del genere.'); return; }
        avvia(trovato, trovato.nome || tipo);
      });
      return;
    }
    if (!o.cercaIndirizzo) { dice('Questa non l\'ho capita.'); return; }
    dice('Cerco l\'indirizzo, un momento.');
    o.cercaIndirizzo(dove, s, function (trovato) {
      if (!trovato) { dice('Questo indirizzo non l\'ho trovato. Se puoi, ripetimelo con la citta\'.'); return; }
      avvia(trovato, trovato.nome || dove);
    });
  }

  function avvia(meta, nome) {
    var s = posizione.leggi();
    var quanto = Math.round(posizione.dist(s.lat, s.lon, meta.lat, meta.lon));
    diario('VADO A: ' + nome + ', ' + quanto + ' m');
    function parti2(p) {
      if (o.guida) o.guida.vaiA(meta, s, { via: s.viaAgganciata }, p || null);
      var quante = p && p.svolte ? p.svolte.length : null;
      dice('Vado a ' + nome + ': ' + quanto + ' metri' +
           (quante ? ', ' + quante + (quante === 1 ? ' svolta' : ' svolte') : '') + '.');
    }
    if (o.percorso) { o.percorso(s, meta, parti2); return; }
    parti2(null);
  }

  /* ============================================================
     I COMANDI — una strada sola per capire una frase (LOGICA.md 2)
     ============================================================ */
  function normalizza(t) {
    return String(t || '').toLowerCase()
      /* l'apostrofo tipografico diventa quello normale: il riconoscitore
         scrive «c’è», e senza questa riga diventava «c e» con lo spazio e il
         comando non si riconosceva piu'. */
      .replace(/[’ʼ]/g, "'")
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var SENZA_NOME = new RegExp('\\b(?:' + NOMI + ')\\b', 'g');
  function senzaIlNome(t) { return normalizza(t).replace(SENZA_NOME, ' ').replace(/\s+/g, ' ').trim(); }

  var COMANDI = [
    { che: 'fermati', quando: /^(?:fermati|zitta|zitto|basta|silenzio)$/, fa: fermati },
    { che: 'chiudi', quando: /^(?:chiudi|chiuditi|spegniti|esci)$/, fa: chiudi },
    { che: 'dove sono', quando: /^(?:dove (?:sono|siamo|sto|mi trovo)|dimmi dove sono)$/, fa: doveSono },
    /* l'apostrofo a volte il riconoscitore non lo mette: «cosa ce qui
       intorno» e «cosa c'è qui intorno» sono la stessa domanda. */
    { che: 'qui intorno',
      quando: /^(?:(?:dimmi\s+)?(?:cosa|che)\s+(?:c['\u2019]?e|ce|ho)\s*)?(?:qui\s+)?(?:intorno|vicino|attorno)(?:\s+a\s+me)?$/,
      fa: quiIntorno },
    { che: 'manda il diario', quando: /^(?:manda(?:mi)? il (?:diario|quaderno))$/, fa: mandaIlDiario },
    { che: 'utilita', quando: /^(?:utilita|utilit)$/, fa: function () { entra('utilita'); } },
    { che: 'turismo', quando: /^turismo$/, fa: function () { entra('turismo'); } }
  ];

  function entra(quale) {
    modo = quale;
    diario('MODO: ' + quale);
    dice(quale === 'turismo' ? 'Turismo. Camminiamo.' : 'Utilità. Dimmi dove devi andare, o cammina.');
  }

  /* ---------- la porta: una frase sentita ---------- */
  function sentita(testo, info) {
    var preso = turno.consegna(testo, info || {});
    if (!preso) return false;
    var t = senzaIlNome(Array.isArray(preso) ? preso[0] : preso);
    diario('CAPISCO: «' + t + '»');
    for (var i = 0; i < COMANDI.length; i++) {
      if (COMANDI[i].quando.test(t)) {
        diario('COMANDO: ' + COMANDI[i].che);
        COMANDI[i].fa();
        return true;
      }
    }
    /* 2-6: «portami a ...» — la meta la trova portamiA(), il percorso lo
       fa la guida. Qui dentro non c'e' rete: chi la vuole la passa. */
    /* ATTENZIONE: le alternative lunghe PRIMA, se no «alla farmacia»
       diventa «lla farmacia» (preso dal banco al primo giro). */
    var meta = t.match(/^(?:portami|riportami|accompagnami|guidami|voglio andare|devo andare)\s+(?:(?:alla|allo|alle|agli|ai|al|in|a)\s+)?(.+)$/);
    if (meta) { portamiA(meta[1]); return true; }
    /* e la segnalazione: solo dentro la finestra del gesto (LOGICA.md 9) */
    if (info && info.dalGesto && o.segnala) { diario('SEGNALO: ' + t); o.segnala(preso); return true; }
    diario('NON CAPITO (ma era per me): ' + t);
    dice('Questa non l\'ho capita.');
    return true;
  }

  return {
    sentita: sentita, portamiA: portamiA,
    doveSono: doveSono, quiIntorno: quiIntorno, fermati: fermati, chiudi: chiudi,
    entra: entra,
    modo: function () { return modo; },
    casa: function (c) { if (c) casa = c; return casa; },
    turno: turno, posizione: posizione, voce: voce,
    quaderno: function () { return quaderno; }
  };
}

if (typeof module !== 'undefined') module.exports = Semplice;
