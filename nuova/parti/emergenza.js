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

  /* scelte(): cosa dice il tasto rosso, subito. */
  function scelte() {
    var t = 'Aiuto. Dì: chiama il 112, oppure commissariato, pronto soccorso, farmacia, portami a casa.';
    if (contatto && contatto.nome) t += ' Oppure: chiama ' + contatto.nome + '.';
    return { tipo: 'scelte', livello: 'emergenza', subito: true, testo: t };
  }

  /* chiama112(): si dice cosa si sta facendo, e che la posizione parte da sé. */
  function chiama112() {
    return {
      tipo: 'chiama', numero: '112', livello: 'emergenza', subito: true,
      testo: 'Chiamo il 112. La tua posizione parte insieme alla chiamata: non devi spiegare dove sei.',
      mosse: [{ cosa: 'chiama', numero: '112', fraMillisecondi: 1200 }]
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
    var messaggio = 'Ho bisogno di aiuto. Sono in ' + via +
                    (dove && dove.lat ? ' — https://maps.google.com/?q=' + dove.lat + ',' + dove.lon : '') + '.';
    return {
      tipo: 'avvisa', livello: 'emergenza', subito: true,
      /* onesta: nessuna app su iPhone manda un SMS di nascosto. Si apre il
         messaggio già scritto, con la via e il punto sulla mappa, e l'invio
         lo preme la persona — un tasto solo, ma va detto. */
      testo: 'Apro il messaggio per ' + contatto.nome + ', con la via e il punto sulla mappa. Premi invia.',
      mosse: [{ cosa: 'messaggio', numero: contatto.telefono, testo: messaggio }]
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
    if (ha('112', 'chiama i soccorsi', 'ambulanza', 'numero di emergenza', 'chiama il 118')) return chiama112();
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
    var chiesto = t.match(/\b(?:avvisa|avverti|chiama|telefona a)\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/);
    if (chiesto) {
      var chi = chiesto[1].replace(/\b(?:il|lo|la|mio|mia|suo|sua|per favore|subito)\b/g, '').trim();
      var suo = contatto && contatto.nome ? String(contatto.nome).toLowerCase() : '';
      if (chi && suo && (suo.indexOf(chi) >= 0 || chi.indexOf(suo) >= 0)) return avvisaContatto(dove);
      if (chi) {
        return { tipo: 'chi-e', nome: chi, livello: 'emergenza', subito: true,
                 testo: 'Non ho il numero di ' + chi + '. Dimmelo scrivendolo nel cassetto, in «chi avvisare»: da li in poi lo avviso io, con la via e il punto sulla mappa.' };
      }
    }
    if (contatto && contatto.nome && ha('avvisa', 'chiama il contatto')) {
      return avvisaContatto(dove);
    }
    if (ha('aiuto', 'emergenza', 'soccorso', 'ho bisogno')) return scelte();
    return null;
  }

  return {
    scelte: scelte, chiama112: chiama112, derubato: derubato,
    avvisaContatto: avvisaContatto, cerca: cerca, comando: comando,
    conContatto: function (c) { contatto = c; },
    contatto: function () { return contatto; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Emergenza;
if (typeof window !== 'undefined') window.Emergenza = Emergenza;
