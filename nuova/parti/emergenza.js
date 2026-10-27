/* L'EMERGENZA — Yourbea, rifatta il 15/10/2026
   ============================================================
   Questo file decide cosa dire e cosa fare quando qualcosa va storto: il
   tasto rosso, «mi hanno rubato il portafoglio», «chiama il 112», il
   contatto da avvisare. Non chiama e non scrive: restituisce le mosse, e chi
   lo usa le esegue. Per questo si può provare senza fare squillare nessuno.

   LE REGOLE, e perché sono queste:
   1. IL TASTO ROSSO PARLA SUBITO. Prima diceva le scelte dopo 2.600
      millisecondi: chi lo preme ha un problema adesso, e al buio tre secondi
      di silenzio vogliono dire «non ha funzionato», quindi lo premeva di
      nuovo. Si parla entro un battito, il resto arriva dopo.
   2. IL 112 RICEVE LA POSIZIONE DA SOLO. Sugli smartphone europei è
      obbligatorio dal 17 marzo 2022 (si chiama AML): quando chiami il 112,
      la tua posizione parte con la chiamata. Va detto, perché toglie
      l'angoscia di dover spiegare dove sei.
   3. UN'APP NON PUÒ AVVISARE LA POLIZIA. Quel canale non esiste: nessuna app
      manda un allarme a una centrale operativa. Si può chiamare il 112,
      portare al commissariato più vicino, avvisare una persona. Dire altro
      sarebbe una bugia pericolosa.
   4. PRIMA DI TUTTO, DOVE SEI. In un furto o in un malore la prima cosa che
      serve è la via e il civico, detti a voce, da ripetere a chi risponde.
   5. NIENTE IMPERATIVI SULLA STRADA. Non si dice mai a chi non vede di
      attraversare o dove mettere i piedi: il GPS a piedi sbaglia dai dieci
      ai trenta metri.
*/

'use strict';

function Emergenza(opzioni) {
  var o = opzioni || {};
  var contatto = o.contatto || null;          // { nome, telefono }
  var io_ = o.io || '';                       // come si chiama chi usa l'app

  /* scelte(): cosa dice il tasto rosso, subito. */
  function scelte() {
    var t = 'Aiuto. Dì: chiama il 112, oppure commissariato, pronto soccorso, farmacia, portami a casa.';
    if (contatto && contatto.nome) t += ' Oppure: chiama ' + contatto.nome + '.';
    return { tipo: 'scelte', livello: 'emergenza', subito: true, testo: t };
  }

  /* chiama112(): si dice cosa si sta facendo, e che la posizione parte da sé. */
  /* IL 112 NON PARTE DI SOPPIATTO. Dario, provandola a Napoli: «per poco
     non ho chiamato il 112». Il microfono sta aperto tutto il giorno e
     sente le conversazioni: una frase presa male non può far partire una
     chiamata di emergenza. Ma nemmeno si può chiedere una conferma lunga
     a chi sta male davvero. Allora si fa come la chiamata d'emergenza del
     telefono: si annuncia, si conta fino a cinque, e in quei cinque
     secondi basta dire «annulla» o premere qualsiasi cosa. Chi ha bisogno
     aspetta cinque secondi; chi non ne ha bisogno li ha per fermarla. */
  /* doveSei(): la posizione DETTA, non solo mandata.
     «[Chiedi aiuto] deve chiamare i soccorsi, e dice la posizione in cui
     si è» (Vince, 23/10). L'AML manda il punto alla centrale da sé, ma
     l'operatore la prima cosa che chiede è «dove si trova?» — e chi non
     vede non può guardarsi intorno per rispondere. Gliela si dice prima,
     mentre il telefono squilla: così la ripete e basta.
     E SE LA VIA NON SI SA, si dicono i numeri. Sono brutti da dire, ma
     una centrale operativa ci lavora tutti i giorni, e il silenzio no. */
  function doveSei(dove) {
    if (!dove) return '';
    if (dove.via) {
      return 'Sei in ' + dove.via + (dove.civico ? ' ' + dove.civico : '') +
             (dove.citta ? ', ' + dove.citta : '') + '.';
    }
    if (typeof dove.lat === 'number' && typeof dove.lon === 'number') {
      return 'La via non la so. Le tue coordinate sono: latitudine ' +
             dove.lat.toFixed(5).replace('.', ' virgola ') + ', longitudine ' +
             dove.lon.toFixed(5).replace('.', ' virgola ') + '.';
    }
    return '';
  }

  /* comeEFatto(): cosa c'è intorno, per dirlo all'operatore. Chi non vede
     non può guardarsi intorno quando glielo chiedono, e «davanti alla
     farmacia, accanto al tabaccaio» porta un'ambulanza più in fretta di
     un civico che sul portone magari non c'è. */
  function comeEFatto(dove) {
    var a = (dove && dove.accanto) || [];
    if (!a.length) return '';
    return 'Intorno a te: ' + a.join('. ') + '.';
  }

  function chiama112(dove) {
    var qui = doveSei(dove);
    return {
      tipo: 'chiama', numero: '112', livello: 'emergenza', subito: true, annullabile: true,
      dove: qui,
      testo: (qui ? qui + ' ' : '') + (comeEFatto(dove) ? comeEFatto(dove) + ' ' : '') +
             'Chiamo il 112 fra cinque secondi. Se non vuoi, dì: annulla. ' +
             'La tua posizione parte insieme alla chiamata: non devi spiegare dove sei.',
      mosse: [{ cosa: 'chiama', numero: '112', fraMillisecondi: 5000 }]
    };
  }

  /* derubato(): la sequenza del furto. Prima dove sei, poi le strade vere. */
  function derubato(dove) {
    var via = dove && dove.via ? (dove.via + (dove.civico ? ' ' + dove.civico : '')) : null;
    var t = via
      ? 'Sei in ' + via + '. Ripetilo a chi risponde. '
      : 'La via non la so dire con certezza. ';
    t += 'Posso chiamare il 112, portarti al commissariato più vicino';
    if (contatto && contatto.nome) t += ', o avvisare ' + contatto.nome;
    t += '. Dimmi quale.';
    /* REGOLA 3: non si promette nessun allarme automatico alla polizia. */
    return { tipo: 'furto', livello: 'emergenza', subito: true, testo: t,
             puoi: ['112', 'commissariato'].concat(contatto && contatto.nome ? ['contatto'] : []) };
  }

  /* avvisaContatto(): un messaggio pronto, con la via, da mandare. */
  function avvisaContatto(dove) {
    if (!contatto || !contatto.telefono) {
      return { tipo: 'niente-contatto', livello: 'emergenza', subito: true,
               testo: 'Non ho un contatto da avvisare. Puoi registrarlo nel cassetto, con nome e numero.' };
    }
    var via = dove && dove.via ? (dove.via + (dove.civico ? ' ' + dove.civico : '')) : 'non lo so dire';
    /* PRIMA CHI SEI, POI DOVE SEI. Vince, il 15/10: «il primo messaggio è
       sono io, il secondo sono in via dei Corazzieri». Un messaggio che
       arriva da un numero e non dice chi è, chi lo riceve lo guarda due
       volte prima di capire — e nel frattempo tu aspetti. */
    var messaggio = (io_ ? 'Sono ' + io_ + '. ' : '') + 'Ho bisogno di aiuto. Sono in ' + via +
                    (dove && dove.lat ? ' — https://maps.google.com/?q=' + dove.lat + ',' + dove.lon : '') + '.';
    return {
      tipo: 'avvisa', livello: 'emergenza', subito: true,
      /* onesta: nessuna app su iPhone manda un SMS di nascosto. Si apre il
         messaggio già scritto, con la via e il punto sulla mappa, e l'invio
         lo preme la persona — un tasto solo, ma va detto. */
      testo: 'Apro WhatsApp su ' + contatto.nome + ', col messaggio già scritto: la via e il punto sulla mappa. Premi invia.',
      mosse: [{ cosa: 'messaggio', numero: contatto.telefono, testo: messaggio }]
    };
  }

  /* chiamaContatto(): la cosa che funziona DAVVERO senza mani.
     Vince, il 15/10: «un non vedente deve fare tutto a voce… e lo invia
     anche a voce». Un messaggio scritto no: nessuna app su iPhone manda un
     SMS o un WhatsApp da sola, l'invio lo preme una persona — e dire di
     averlo mandato quando non è partito sarebbe la bugia peggiore di tutte.
     La TELEFONATA invece parte da sola. Quindi «avvisa Mariolina» la chiama,
     e intanto l'app dice a voce dove sei, così chi ha bisogno sa cosa dire
     appena quella risponde. Il messaggio scritto resta per chi può premere:
     «manda un messaggio a Mariolina». */
  function chiamaContatto(dove) {
    if (!contatto || !contatto.telefono) {
      return { tipo: 'niente-contatto', livello: 'emergenza', subito: true,
               testo: 'Non ho ancora nessuno da avvisare. Dimmi: il mio contatto è, il nome, e poi il numero.' };
    }
    var via = dove && dove.via ? (dove.via + (dove.civico ? ' ' + dove.civico : '')) : '';
    return {
      tipo: 'chiama-contatto', livello: 'emergenza', subito: true,
      /* DOPPIA STRADA, e il tempo di cambiare idea: la chiamata parte dopo
         quasi tre secondi, e in quei tre secondi basta dire «messaggio».
         Chi non vede non ha un tasto «annulla» da cercare. */
      /* L'ULTIMO TOCCO ESISTE E SI DICE. Apple non lascia telefonare
         nessuna app di nascosto: esce una finestra di sistema, e ci scrive
         il numero, non il nome — provato il 15/10, anche col prefisso
         giusto. Non si può cambiare quella finestra; si può dire a chi non
         vede che sta per uscire e cosa farci, invece di lasciarlo davanti a
         uno schermo muto a chiedersi se la chiamata è partita. */
      testo: 'Chiamo ' + contatto.nome + '. Esce la finestra del telefono: premi Chiama.' +
             (via ? ' Poi dille che sei in ' + via + '.' : '') +
             ' Se preferisci il messaggio scritto, dì: messaggio.',
      mosse: [{ cosa: 'chiama', numero: numeroTelefono(contatto.telefono), fraMillisecondi: 2600 }]
    };
  }

  /* portamiA(): il commissariato, il pronto soccorso, la farmacia — chi usa
     questo file sa cercarli; qui si dice solo cosa annunciare. */
  function cerca(tipo) {
    var nomi = { commissariato: 'il commissariato più vicino',
                 'pronto soccorso': 'il pronto soccorso più vicino',
                 farmacia: 'la farmacia più vicina' };
    return { tipo: 'cerca', cosa: tipo, livello: 'emergenza', subito: true,
             testo: 'Cerco ' + (nomi[tipo] || tipo) + ', un momento.' };
  }

  /* numeroWhatsApp(): wa.me vuole le cifre col prefisso del paese e senza
     il più. Se il numero è stato scritto all'italiana — 333 123 4567, o
     0333... — si mette il 39 davanti: non si indovina un paese straniero,
     si completa il nostro. Con un prefisso già scritto non si tocca niente. */
  function numeroWhatsApp(n) {
    var scritto = String(n || '');
    var cifre = scritto.replace(/[^0-9]/g, '');
    if (cifre.indexOf('00') === 0) cifre = cifre.slice(2);
    else if (scritto.indexOf('+') < 0 && cifre.length <= 10) cifre = '39' + cifre.replace(/^0+/, '');
    return cifre;
  }

  /* numeroTelefono(): col prefisso e col più davanti.
     Il 15/10 Vince ha detto «chiama Mariolina» e iOS gli ha mostrato IL
     NUMERO, non il nome: senza +39 il telefono non lo riconosce come quello
     della rubrica, e chi non vede si sente leggere dieci cifre invece di
     «Chiamare Mariolina?». L'ultimo tocco Apple lo chiede comunque — nessuna
     app può telefonare di nascosto — ma almeno dice chi. */
  function numeroTelefono(n) {
    var c = numeroWhatsApp(n);
    return c ? '+' + c : '';
  }

  /* comando(): riconosce le parole dell'emergenza. Restituisce null se la
     frase non è un'emergenza, così chi chiama prova gli altri comandi. */
  function comando(testo, dove) {
    var t = String(testo || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    function ha() {
      for (var i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) >= 0) return true;
      return false;
    }
    /* «CHIEDI AIUTO» CHIAMA I SOCCORSI. Fin qui «aiuto» apriva un menu
       — «dì: chiama il 112, oppure commissariato...» — e chi sta male
       doveva ascoltare un elenco e poi dire un'altra frase. «Chiedi
       aiuto» è già la decisione: si chiama, e si dice dov'è.
       Ma la frase dev'ESSERE il comando. «Aiuto» da solo no: il
       microfono sta aperto tutto il giorno e sente le conversazioni —
       Dario, a Napoli: «per poco non ho chiamato il 112». Quello
       resta il menu, e i cinque secondi per dire «annulla» restano. */
    if (/^(?:chiedi|chiedimi|chiama|chiamami|voglio|mi serve)\s+(?:i\s+|il\s+|un\s+|l\s+)?(?:aiuto|soccorso|soccorsi|aiutami)$/.test(t) ||
        t === 'chiedi aiuto' || t === 'aiutami') return chiama112(dove);
    if (ha('112', 'chiama i soccorsi', 'ambulanza', 'numero di emergenza', 'chiama il 118')) return chiama112(dove);
    if (ha('mi hanno rubato', 'mi hanno derubato', 'mi hanno scippato', 'furto', 'borseggio',
           'ho perso il portafoglio', 'rubato il telefono', 'scippo')) return derubato(dove);
    if (ha('commissariato', 'polizia', 'carabinieri')) return cerca('commissariato');
    if (ha('pronto soccorso', 'ospedale', 'primo soccorso')) return cerca('pronto soccorso');
    if (ha('farmacia')) return cerca('farmacia');
    /* «AVVISA MARIOLINA». Vince l'ha chiesto il 15/10 e l'app è rimasta
       zitta, perché il nome non era quello registrato. Un'app non può
       leggere la rubrica da dentro una pagina web: il numero non ce l'ha e
       non se lo inventa. Ma il silenzio su una richiesta d'aiuto è la cosa
       peggiore che possa fare: dice che non ce l'ha, e dove scriverlo. */
    /* «manda un messaggio» chiede il testo; tutto il resto è una chiamata */
    var scritto = /\b(?:messaggio|whatsapp|scrivi|sms)\b/.test(t);
    var chiesto = t.match(/\b(?:avvisa|avverti|chiama|telefona a|manda un messaggio a|manda un whatsapp a|scrivi a)\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/);
    if (chiesto) {
      var chi = chiesto[1].replace(/\b(?:il|lo|la|mio|mia|suo|sua|per favore|subito)\b/g, '').trim();
      var suo = contatto && contatto.nome ? String(contatto.nome).toLowerCase() : '';
      if (chi && suo && (suo.indexOf(chi) >= 0 || chi.indexOf(suo) >= 0)) {
        return scritto ? avvisaContatto(dove) : chiamaContatto(dove);
      }
      if (chi) {
        return { tipo: 'chi-e', nome: chi, livello: 'emergenza', subito: true,
                 testo: 'Non ho il numero di ' + chi + '. Dimmelo scrivendolo nel cassetto, in «chi avvisare»: da li in poi lo avviso io, con la via e il punto sulla mappa.' };
      }
    }
    if (contatto && contatto.nome && ha('avvisa', 'chiama il contatto')) {
      return scritto ? avvisaContatto(dove) : chiamaContatto(dove);
    }
    if (ha('aiuto', 'emergenza', 'soccorso', 'ho bisogno')) return scelte();
    return null;
  }

  return {
    scelte: scelte, chiama112: chiama112, derubato: derubato, doveSei: doveSei, comeEFatto: comeEFatto,
    avvisaContatto: avvisaContatto, chiamaContatto: chiamaContatto, cerca: cerca, comando: comando,
    numeroWhatsApp: numeroWhatsApp, numeroTelefono: numeroTelefono,
    conContatto: function (c) { contatto = c; },
    chiSono: function (n) { io_ = n; },
    contatto: function () { return contatto; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Emergenza;
if (typeof window !== 'undefined') window.Emergenza = Emergenza;
