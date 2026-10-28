/* LA SCENA INTORNO — Yourbea, 15/10/2026
   ============================================================
   «Turismo descrive la realtà circostante… anche per non vedenti» (Vince).
   Le schede dei luoghi raccontano i monumenti; questo file racconta il
   POSTO in cui sei adesso: che forma ha, cosa c'è e da che parte, quanto
   manca in passi. È la parte che serve a chi non vede più di ogni altra, e
   fino a stasera i dati della mappa — aree, alberi, attraversamenti,
   negozi — si scaricavano e non li diceva nessuno.

   COME SI DESCRIVE A CHI NON VEDE, e perché:
   1. PRIMA DOVE SEI, POI DA CHE PARTE, POI QUANTO MANCA. Chi vede abbraccia
      la scena in un colpo; chi ascolta la riceve in fila, e l'ordine è
      quello che si tiene a mente.
   2. IN PASSI, NON SOLO IN METRI. «Una quarantina di passi» si cammina;
      «trenta metri» si deve convertire. Un passo = 75 centimetri.
   3. TRE COSE, NON DIECI. Una descrizione lunga non si ricorda: si dice
      quello che orienta — la forma del posto, gli alberi, due servizi — e
      il resto si chiede («cosa c'è qui intorno»).
   4. GLI ATTRAVERSAMENTI SI CONTANO, NON SI ELENCANO. Era la prima cosa che
      Vince ha chiesto provandola in strada: «se ce ne sono ogni cinque
      metri, basta dire che c'è una serie di attraversamenti».
   5. MAI DIRE DOVE METTERE I PIEDI. Il GPS a piedi sbaglia dai dieci ai
      trenta metri: «attraversa qui» è una frase che può far male.
   6. LA STESSA SCENA NON SI RIPETE. Si dice quando cambia davvero.
*/

'use strict';

function Scena(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var verso = o.verso;
  var ora = o.ora || function () { return Date.now(); };
  var PASSO = 0.75;                       // metri
  var VICINO = o.vicino || 60;            // oltre, non orienta più
  var DI_NUOVO = o.diNuovo || 90000;      // la stessa scena non prima di così

  var ultima = '', ultimaQuando = 0;
  /* ogni PEZZO si ricorda da solo quando è stato detto: la frase intera
     cambia sempre un po' — un passo, un metro, un negozio diverso — e
     bastava quello per ridire la stessa cosa. */
  var dettiPezzi = {};
  var QUANTO = { forma: 240000, alberi: 300000, attraversamenti: 180000, servizio: 150000 };

  function passi(m) { return 'a ' + passiNudi(m); }
  /* passiNudi(): «pochi passi», «una ventina di passi», «110 passi» — la
     stessa misura serve dentro due frasi diverse («a una ventina di passi»
     e «larga 110 passi»), e incollare l'articolo a mano dava «larga una
     110 passi». */
  /* LA DISTANZA LA DICE UNA PARTE SOLA: parti/distanza.js (7 prove).
     «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
     21/10): ce n'erano quattro, con arrotondamenti diversi, e questa
     diceva i METRI mentre il resto dell'app diceva i passi. */
  /* E NIENTE PIU' «UNA VENTINA DI PASSI». Era un modo di dire gentile, ma
     chi non vede conta i passi davvero: «una ventina» gli toglie proprio
     la cosa che gli serve. */
  /* si PASSA, come dist e verso: in questa cartella le parti non si
     cercano fra loro, se le fa dare. Senza, resta il modo vecchio — piu'
     grezzo, ma nessuno resta muto. */
  var laMisura = o.distanza || null;
  function passiNudi(m) {
    return laMisura ? laMisura.nudi(m) : (Math.round(m / PASSO) + ' passi');
  }
  function dentina(p) {
    var nomi = { 10: 'decina di passi', 20: 'ventina di passi', 30: 'trentina di passi',
                 40: 'quarantina di passi', 50: 'cinquantina di passi', 60: 'sessantina di passi',
                 70: 'settantina di passi', 80: 'ottantina di passi', 90: 'novantina di passi' };
    var d = Math.round(p / 10) * 10;
    return nomi[d] || (p + ' passi');
  }

  /* daCheParte(): «davanti», «a destra»… e NIENTE punti cardinali.
     «Ma io non so nord sud est dove sono» (Vince, 16/10, camminando). Il
     nord non ce l'ha in testa nessuno per strada, e a chi non vede non
     serve a niente. Se non si sa come sei girato non si dice la parte: si
     dice solo quanto manca, che è vero lo stesso. */
  function daCheParte(qui, lat, lon, direzione, buona) {
    var g = verso(qui.lat, qui.lon, lat, lon);
    if (!buona || typeof direzione !== 'number') return null;
    var r = ((g - direzione + 540) % 360) - 180;
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (r > 25 && r <= 115) return 'sulla destra';
    if (r < -25 && r >= -115) return 'sulla sinistra';
    return 'dietro di te';
  }

  /* laForma(): la piazza, il parco, il cortile in cui sei — e quanto è
     grande, misurato sul suo contorno. */
  function laForma(qui, aree) {
    var dentro = null;
    (aree || []).forEach(function (a) {
      if (!a.punti || !a.punti.length) return;
      var dm = Infinity, dM = 0;
      a.punti.forEach(function (p) {
        var d = dist(qui.lat, qui.lon, p[0], p[1]);
        if (d < dm) dm = d;
        if (d > dM) dM = d;
      });
      /* DENTRO VUOL DIRE DENTRO. Prima bastava essere vicini al contorno, e
         camminando in strada l'app diceva «Sei in Chiesa di Santa Lucia»
         mentre la chiesa era lì accanto, chiusa. Adesso si guarda se il
         punto cade davvero dentro il poligono. */
      if (!dentroIlContorno(qui, a.punti)) return;
      if (!dentro || dM < dentro.largo) {
        dentro = { cosa: a.cosa, nome: a.nome, largo: Math.round(dM) };
      }
    });
    return dentro;
  }

  /* dentroIlContorno(): il raggio che esce dal punto taglia il contorno un
     numero dispari di volte solo se il punto è dentro. È il modo più
     vecchio e più solido che ci sia, e non serve altro. */
  function dentroIlContorno(qui, punti) {
    if (!punti || punti.length < 3) return false;
    var dentro = false;
    for (var i = 0, j = punti.length - 1; i < punti.length; j = i++) {
      var yi = punti[i][0], xi = punti[i][1];
      var yj = punti[j][0], xj = punti[j][1];
      var taglia = ((xi > qui.lon) !== (xj > qui.lon)) &&
                   (qui.lat < (yj - yi) * (qui.lon - xi) / ((xj - xi) || 1e-12) + yi);
      if (taglia) dentro = !dentro;
    }
    return dentro;
  }

  function alberi(qui, elenco, direzione, buona) {
    var vicini = (elenco || []).filter(function (p) { return dist(qui.lat, qui.lon, p[0], p[1]) < VICINO; });
    if (vicini.length < 3) return null;
    var parti = {};
    vicini.forEach(function (p) {
      var d = daCheParte(qui, p[0], p[1], direzione, buona);
      if (d) parti[d] = (parti[d] || 0) + 1;
    });
    var dove = Object.keys(parti).sort(function (a, b) { return parti[b] - parti[a]; })[0];
    var tanti = vicini.length >= 8;
    if (!dove) return tanti ? 'alberi lungo la strada' : 'qualche albero vicino';
    return tanti ? ('alberi in fila ' + dove) : ('qualche albero ' + dove);
  }

  function attraversamenti(qui, punti) {
    var a = (punti || []).filter(function (p) {
      return p.cosa === 'attraversamento' && dist(qui.lat, qui.lon, p.lat, p.lon) < VICINO;
    });
    if (!a.length) return null;
    /* REGOLA 4: si contano. E si dice l'unica cosa che cambia qualcosa:
       se uno di quelli ha il semaforo, e se c'è il percorso tattile. */
    var conSemaforo = a.filter(function (p) { return p.semaforo; }).length;
    var tattili = a.filter(function (p) { return p.tattile; }).length;
    /* IL SEMAFORO CHE SUONA viene prima di tutto il resto: è la differenza
       fra attraversare da soli e aspettare qualcuno. */
    var suonano = a.filter(function (p) { return p.suona; }).length;
    /* L'AVVERTENZA, SEMPRE. «Ci deve essere sempre annuncio che la guida
       indica non e' precisa negli attraversamenti — per non avere
       problemi» (Vince, 24/10). Il GPS a piedi sbaglia dai dieci ai
       trenta metri, e chi non vede esegue quello che sente.
       Le parole sono le sue: «nell'arco di 20/30 metri prestare
       attenzione... oppure chiedi dove e' l'attraversamento» — non «non
       e' precisa», scartata dopo aver letto il campione. La seconda
       parte non e' un riempitivo: dice l'unica cosa che funziona
       sempre, cioe' chiedere a chi passa. Si dice «chiedi a qualcuno
       dov'e'» e non «chiedi dov'e' l'attraversamento» perche' la parola
       «attraversamento» sta gia' nella frase: ripeterla, a voce, fa una
       frase che nessuno direbbe. */
    if (a.length === 1) {
      return 'un attraversamento' +
             (suonano ? ' col semaforo acustico' : (conSemaforo ? ' col semaforo' : ' senza semaforo')) +
             (tattili ? ', col percorso tattile' : '') + NON_PRECISO;
    }
    if (suonano) {
      return 'una serie di attraversamenti, ' +
             (suonano === a.length ? 'tutti col semaforo acustico' : suonano + ' col semaforo acustico') +
             (tattili ? ', e il percorso tattile' : '') + NON_PRECISO;
    }
    return 'una serie di attraversamenti' +
           (conSemaforo ? (conSemaforo === a.length ? ', tutti col semaforo' : ', ' + conSemaforo + ' col semaforo') : ', nessuno col semaforo') +
           (tattili ? ', e il percorso tattile' : '') + NON_PRECISO;
  }

  /* ============================================================
     L'ATTRAVERSAMENTO SI DICE SEMPRE CON L'AVVERTENZA
     «Ci deve essere sempre annuncio che la guida indica non e' precisa
     negli attraversamenti — per non avere problemi» (Vince, 24/10).
     Il GPS a piedi sbaglia dai dieci ai trenta metri: dire «a venti
     passi l'attraversamento» a chi non vede e' un ordine che esegue, e
     l'attraversamento puo' essere qualche metro piu' avanti o piu'
     indietro. Finora la regola era non dare imperativi; adesso l'app lo
     DICE, ogni volta che nomina un attraversamento.
     «Secondo me non bisogna dire "non e' preciso"» — e poi: «bisogna dire
     nell'arco di 20/30 metri prestare attenzione» (Vince, 24/10, dopo
     aver letto il campione). La prima versione diceva «ma la posizione
     non e' precisa»: ripetuta a ogni attraversamento spaventa e non dice
     cosa fare. Questa da' la stessa informazione — l'attraversamento e'
     da cercare in un tratto di strada, non in un punto — e dice la cosa
     utile: fai attenzione.
     ============================================================ */
  var NON_PRECISO = o.nonPreciso || ', nell\'arco di 20 o 30 metri: presta attenzione, o chiedi a qualcuno dov\u2019\u00e8';

  function servizi(qui, punti, direzione, buona, quanti) {
    var buoni = (punti || []).filter(function (p) {
      return p.servizio && p.cosa !== 'attraversamento' && dist(qui.lat, qui.lon, p.lat, p.lon) < VICINO;
    });
    buoni.sort(function (a, b) {
      return dist(qui.lat, qui.lon, a.lat, a.lon) - dist(qui.lat, qui.lon, b.lat, b.lon);
    });
    return buoni.slice(0, quanti || 2).map(function (p) {
      var m = dist(qui.lat, qui.lon, p.lat, p.lon);
      var parte = daCheParte(qui, p.lat, p.lon, direzione, buona);
      /* IL NOME DA SOLO NON DICE CHE COSA E'. «Pirani sulla destra, a 35
         passi» non dice che e' una farmacia: lo stesso difetto corretto
         in aiLati il 18/10, e qui era restato. comeSiChiama() mette il
         tipo davanti, e lo lascia stare quando il nome lo contiene gia'
         («stazione di Roma San Pietro»). */
      return (p.nome ? comeSiChiama(p) : p.cosa) + (parte ? ' ' + parte : '') + ', ' + passi(m);
    });
  }

  /* descrivi(): la scena, in una frase sola. null se non c'è niente da dire
     o se è la stessa di poco fa. */
  /* fresco(): questo pezzo si può dire, o l'ha già sentito poco fa?
     REGOLA 7, nata camminando: «diceva sempre più avanti ci sono dei
     passaggi pedonali». Gli attraversamenti ci sono a ogni incrocio, e a
     ogni descrizione finivano dentro: la seconda volta non dicono più
     niente di nuovo, la terza danno fastidio. Ogni genere di cosa ha il suo
     tempo di riposo, e il confronto è sul SENSO — «due attraversamenti» e
     «tre attraversamenti» sono la stessa notizia. */
  function fresco(genere, chiave) {
    var k = genere + '|' + String(chiave);
    var quando = dettiPezzi[k] || 0;
    if (ora() - quando < (QUANTO[genere] || 120000)) return false;
    dettiPezzi[k] = ora();
    return true;
  }

  function descrivi(s) {
    var qui = s.qui, d = s.direzione, buona = s.direzioneBuona !== false;
    var mappa = s.mappa || { punti: [], aree: [], alberi: [] };
    var pezzi = [];
    var capo1 = null;

    var forma = laForma(qui, mappa.aree);
    if (forma) {
      capo1 = 'Sei ' + (forma.nome ? 'in ' + forma.nome : 'in ' + unA(forma.cosa)) +
              (forma.largo >= 25 ? ', larg' + (femmina(forma.cosa) ? 'a' : 'o') + ' ' + passiNudi(forma.largo) : '');
      if (!fresco('forma', forma.nome || forma.cosa)) capo1 = null;
    } else if (s.strada) {
      capo1 = 'Sei in ' + s.strada;
      if (!fresco('forma', s.strada)) capo1 = null;
    }
    if (capo1) pezzi.push(capo1);

    var alb = alberi(qui, mappa.alberi, d, buona);
    if (alb && fresco('alberi', alb.replace(/\d+/g, ''))) pezzi.push(alb);

    var att = attraversamenti(qui, mappa.punti);
    /* il senso, non le parole: cambia il numero ma la notizia è la stessa */
    var conAvviso = false;
    if (att && fresco('attraversamenti', att.replace(/\d+/g, 'n'))) { pezzi.push(att); conAvviso = true; }

    /* REGOLA 3: tre cose. I servizi entrano solo se c'è ancora posto. */
    var quanti = Math.max(0, 4 - pezzi.length);
    if (quanti) {
      servizi(qui, mappa.punti, d, buona, quanti + 3).forEach(function (t) {
        if (pezzi.length >= 4) return;
        var nome = t.split(' ')[0];
        if (fresco('servizio', nome)) pezzi.push(t);
      });
    }

    /* FERMANDOSI NON SI STA ZITTI — 28/10/2026.
       «E se mi fermo cinque secondi inizia la descrizione», «ma non può
       stare zitta» (Vince). Nel diario del 28/10, in via dei Corazzieri,
       «SCENA: niente da dire» 29 volte con CENTOVENTUNO punti intorno:
       la strada l'aveva già detta (e il riposo dura due minuti), alberi
       zero, attraversamenti già detti — restava un pezzo solo, e due era
       il minimo. Camminando due pezzi sono giusti: una frase corta a ogni
       passo e' un apparecchio. Ma se uno si FERMA sta chiedendo col
       corpo «dove sono?», e un pezzo e' meglio del silenzio. */
    if (pezzi.length < (s.fermo ? 1 : 2)) return null;
    /* E CON UN PEZZO SOLO NON SI DICE «Sei in via Roma. .» — uscito al
       banco il 28/10, appena il minimo e' sceso a uno: il primo pezzo
       se ne va con lo shift e dietro resta la stringa vuota. */
    var primo = pezzi.shift();
    var testo = pezzi.length ? (primo + '. ' + capo(pezzi.join('; ')) + '.') : (primo + '.');

    // REGOLA 6: la stessa scena non si ripete
    if (testo === ultima && ora() - ultimaQuando < DI_NUOVO) return null;
    ultima = testo; ultimaQuando = ora();
    /* REGOLA 8: la scena è un CENNO, non una guida. Camminando, Vince ha
       sentito una chiesa raccontata a metà e tagliata in faccia dalla voce
       che diceva gli attraversamenti: era la scena, che a livello di guida
       passava sopra al racconto. La scena non taglia mai niente — aspetta
       il suo turno, e se non c'è posto si butta: fra un minuto ce n'è
       un'altra. Quello che FERMA uno per strada (svolte, attraversamenti
       dentro una guida, emergenza) viaggia su altri livelli. */
    /* se dentro ci sono gli attraversamenti è un AVVISO: non aspetta il
       respiro e non si spegne col filtro «solo monumenti». «Importanti
       sono gli avvisi» (Vince, 19/10). */
    return { tipo: 'scena', livello: conAvviso ? 'guida' : 'cenno',
             avviso: conAvviso, testo: testo };
  }

  function unA(c) { return (femmina(c) ? 'una ' : 'un ') + c; }
  /* MASCHILE O FEMMINILE. Prima bastava la «a» finale, e usciva «il
     stazione Vietri sul Mare» (provando a Vietri, 18/10). In italiano
     finiscono in -e tutte e due i generi: le desinenze che decidono sono
     poche e si contano. */
  function femmina(c) {
    var t = String(c || '').toLowerCase();
    if (/(zione|sione|gione|ione|tà|tù|trice|ice)$/.test(t)) return true;
    if (/a$/.test(t)) return true;
    return false;
  }
  function capo(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }

  function dimentica() { ultima = ''; ultimaQuando = 0; }
  function dimenticaTutto() { dimentica(); dettiPezzi = {}; dimenticaILati(); }

  /* ============================================================
     QUANDO LA VIA NON SI SA: SI DICE COSA HAI AI LATI
     «Cioè basta dire: a destra trovi il ristorante, a sinistra questo —
     così copri il buco e descrivi» (Vince, 16/10).

     Il buco: la via arriva da Photon, e in mezzo a un viale può non
     arrivare affatto (la cosa più vicina è un bar senza indirizzo). Prima
     si prendeva il nome del bar per il nome della strada; adesso quel nome
     si butta — e senza una frase al suo posto resterebbe silenzio, che per
     chi non vede è la cosa peggiore.

     Le sue regole:
     a. UNA PER LATO, NON UN ELENCO. Vale la REGOLA 3 di qui sopra: a destra
        una cosa, a sinistra una cosa. Il resto si chiede.
     b. SENZA BUSSOLA NON SI DICE NIENTE. «A destra» con la direzione
        sbagliata manda una persona dalla parte opposta: senza direzione
        buona questa frase non esiste.
     c. SOLO QUELLO CHE È DAVVERO DI FIANCO. Da 30 a 150 gradi per lato:
        quello che hai davanti non è «a destra», e quello che hai dietro
        nemmeno.
     d. NON SI RIPETE. Gli stessi due nomi non si ridicono per tre minuti:
        camminando piano si tornerebbe a dirli ogni venti secondi.          */
  var AI_LATI = o.aiLati || 180000;
  var ultimiLati = '', ultimiLatiQuando = 0;

  function aiLati(situazione) {
    var qui = situazione.qui;
    if (!qui || situazione.direzioneBuona === false) return null;        // REGOLA b
    if (typeof situazione.direzione !== 'number') return null;

    var destra = null, sinistra = null, dD = 1e9, dS = 1e9;
    (situazione.punti || []).forEach(function (p) {
      if (!p.nome) return;
      var m = dist(qui.lat, qui.lon, p.lat, p.lon);
      if (m > (situazione.fin || 60)) return;
      var rel = ((verso(qui.lat, qui.lon, p.lat, p.lon) - situazione.direzione + 540) % 360) - 180;
      var a = Math.abs(rel);
      if (a < 30 || a > 150) return;                                    // REGOLA c
      if (rel > 0) { if (m < dD) { dD = m; destra = p; } }
      else { if (m < dS) { dS = m; sinistra = p; } }
    });
    if (!destra && !sinistra) return null;

    var pezzi = [];
    /* «trovi» sono le parole sue: «a destra trovi il ristorante, a sinistra
       questo». Si dice una volta, sul primo lato, e sull'altro si sottintende:
       «a destra trovi X, a sinistra Y» — ripeterlo due volte suona a elenco. */
    if (destra) pezzi.push('a destra ' + (pezzi.length ? '' : 'trovi ') + comeSiChiama(destra));   // REGOLA a
    if (sinistra) pezzi.push('a sinistra ' + (pezzi.length ? '' : 'trovi ') + comeSiChiama(sinistra));
    var testo = capo(pezzi.join(', ')) + '.';

    if (testo === ultimiLati && ora() - ultimiLatiQuando < AI_LATI) return null;   // REGOLA d
    ultimiLati = testo; ultimiLatiQuando = ora();
    /* è un cenno: non taglia un racconto a metà, e se non c'è posto si
       butta — fra un po' se ne presenta un altro */
    return { tipo: 'lati', livello: 'cenno', testo: testo };
  }

  /* comeSiChiama(): «il ristorante Da Mario» se so cos'è, «Da Mario» se no.
     Il nome da solo non dice niente a chi non lo conosce: «a destra Da
     Mario» non si capisce se è un bar, un negozio o un portone. */
  function comeSiChiama(p) {
    var c = p.cosa || p.categoria || '';
    if (!c) return p.nome;
    if (p.nome.toLowerCase().indexOf(String(c).toLowerCase()) === 0) return p.nome;
    return (femmina(c) ? 'la ' : 'il ') + c + ' ' + p.nome;
  }

  function dimenticaILati() { ultimiLati = ''; ultimiLatiQuando = 0; }

  return { descrivi: descrivi, passi: passi, passiNudi: passiNudi, dimenticaTutto: dimenticaTutto, attraversamenti: attraversamenti,
           laForma: laForma, dimentica: dimentica,
           aiLati: aiLati, dimenticaILati: dimenticaILati };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Scena;
if (typeof window !== 'undefined') window.Scena = Scena;
