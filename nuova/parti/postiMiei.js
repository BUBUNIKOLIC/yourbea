/* I POSTI MIEI — i punti che uno si segna stando li'
   «Con il comando registra casa. Registra medico. E dopo sarà possibile
   per loro: fai il percorso casa medico» (Vince, 23/10, parlando dei non
   vedenti).

   PERCHE' NON BASTAVA QUELLO CHE C'ERA GIA'.
   C'erano due cose e nessuna delle due e' questa:
   — «casa è qui» segna un punto, ma solo casa, e uno solo;
   — parti/percorsiMiei.js tiene i percorsi CAMMINATI: per avere «il
     medico» dovevi prima andarci a piedi con l'app accesa, registrando.
   Qui si tiene il POSTO, non la strada: uno si ferma davanti alla porta
   dello studio e dice «registra medico». Due secondi, e da quel momento
   quel punto esiste. La strada la calcola Valhalla quando serve, anche
   fra due posti dove non sei — «fai il percorso casa medico» si puo'
   chiedere dal divano.

   PERCHE' IL PUNTO E NON L'INDIRIZZO. E' la lezione dei 400 metri
   (20/10): di «via dei Corazzieri 47» i geocodificatori restituiscono il
   centro della via, e in una via lunga il centro sta a quattrocento metri
   dal portone. Chi non vede non ha modo di accorgersene: arriva, e l'app
   gli dice di tornare indietro. Un punto preso stando li' non sbaglia.

   LA PRECISIONE SI TIENE. Se quando l'ha segnato il telefono dava ±80
   metri, quel punto vale ±80 metri per sempre, e quando ci si torna va
   detto. Buttarla via vorrebbe dire far credere esatto un punto che non
   lo e'.                                                                */

function PostiMiei(o) {
  o = o || {};
  var dist = o.dist || function () { return 0; };
  var ora = o.ora || function () { return Date.now(); };
  /* l'articolo e il nome nudo li sa gia' fare percorsiMiei: si passano da
     fuori invece di riscriverli qui, sennò fra qualche mese «dal medico»
     lo diranno in due modi diversi. */
  var aPosto = o.aPosto || function (n) { return 'a ' + n; };
  var nudo = o.nudo || function (t) { return String(t || '').trim(); };
  var SCARSA = o.scarsa || 40;              // oltre, il punto e' da rifare

  var tutti = [];

  /* conArticolo(): aPosto() sbassa tutto, e per i percorsi andava bene —
     «dal medico», «all'edicola». Ma qui i nomi sono anche di persone:
     provandola nell'app, «registra zio Gianni» rispondeva «portami a zio
     gianni». L'articolo lo mette aPosto, il nome resta come l'ha detto. */
  function conArticolo(n) {
    var t = aPosto(n);
    var i = t.toLowerCase().lastIndexOf(String(n).toLowerCase());
    return i >= 0 ? (t.slice(0, i) + n) : t;
  }

  function sbassa(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function carica(roba) {
    tutti = [];
    (roba || []).forEach(function (p) {
      if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return;
      if (!p.n) return;
      tutti.push({ n: String(p.n), lat: p.lat, lon: p.lon,
                   prec: typeof p.prec === 'number' ? p.prec : null,
                   quando: p.quando || 0 });
    });
    return tutti.length;
  }
  function perSalvare() { return tutti.slice(); }
  function quanti() { return tutti.length; }

  /* registra(): il nome arriva come l'ha detto — «il medico», «casa mia»,
     «zio Gianni». Si tiene nudo, perche' «portami all'il medico» e' la
     figura che abbiamo gia' fatto con i percorsi. */
  function registra(nome, qui) {
    var n = nudo(nome);
    if (!n) return { tipo: 'non-capito', livello: 'guida',
                     testo: 'Non ho capito come chiamarlo. Dimmi: registra casa, oppure registra medico.' };
    if (!qui || typeof qui.lat !== 'number') {
      return { tipo: 'niente-posizione', livello: 'guida',
               testo: 'Prima devo sapere dove sei. Aspetta che trovo la posizione, poi dimmelo di nuovo.' };
    }
    var p = { n: n, lat: qui.lat, lon: qui.lon,
              prec: typeof qui.prec === 'number' ? qui.prec : null, quando: ora() };
    /* STESSO NOME, NUOVO PUNTO: si sostituisce. Chi ridice «registra
       medico» davanti alla porta sta correggendo, non aggiungendo un
       secondo medico — e due posti con lo stesso nome poi non si sanno
       distinguere a voce. */
    var c = 0;
    for (var i = 0; i < tutti.length; i++) if (sbassa(tutti[i].n) === sbassa(n)) { tutti[i] = p; c = 1; break; }
    if (!c) tutti.push(p);
    /* SI DICE QUANDO IL PUNTO NON E' BUONO. Con ±80 metri il punto e'
       mezza strada: tacerlo vuol dire mandarci qualcuno e poi dirgli di
       tornare indietro — di nuovo i 400 metri del 20/10. */
    var male = (p.prec !== null && p.prec > SCARSA);
    return { tipo: 'posto-segnato', livello: 'guida', posto: p, rifatto: !!c,
             testo: male
               ? ('Ho segnato ' + n + ' qui, ma il telefono non è sicuro della posizione: se puoi, dimmelo di nuovo quando sei all’aperto.')
               : ('Fatto: ' + n + ' è questo punto. Quando vuoi, dimmi «portami ' + conArticolo(n) + '».') };
  }

  /* trova(): per nome, com'e' stato detto. Prima l'uguale, poi chi
     contiene: «medico» trova «medico», «dal medico» trova «medico». */
  function trova(nome) {
    var t = sbassa(nudo(nome));
    if (!t) return null;
    var i;
    for (i = 0; i < tutti.length; i++) if (sbassa(tutti[i].n) === t) return tutti[i];
    for (i = 0; i < tutti.length; i++) {
      var n = sbassa(tutti[i].n);
      if (n && (n.indexOf(t) >= 0 || t.indexOf(n) >= 0)) return tutti[i];
    }
    return null;
  }

  function butta(nome) {
    var p = trova(nome);
    if (!p) return null;
    tutti = tutti.filter(function (x) { return x !== p; });
    return p;
  }

  /* elenco(): parlato, e corto. Un elenco di dieci nomi detto a voce non
     si tiene a mente: si dicono i primi e si dice quanti sono in tutto. */
  function elenco(qui, quanti_) {
    if (!tutti.length) {
      return { tipo: 'posti', livello: 'guida',
               testo: 'Non hai ancora segnato nessun posto. Quando sei davanti a uno, dimmi: registra casa, registra medico.' };
    }
    var ord = tutti.slice();
    if (qui && typeof qui.lat === 'number') {
      ord.sort(function (a, b) {
        return dist(qui.lat, qui.lon, a.lat, a.lon) - dist(qui.lat, qui.lon, b.lat, b.lon);
      });
    }
    var n = quanti_ || 5;
    var primi = ord.slice(0, n).map(function (p) { return p.n; });
    var testo = 'Hai segnato ' + primi.join(', ');
    if (ord.length > primi.length) testo += ', e altri ' + (ord.length - primi.length);
    return { tipo: 'posti', livello: 'guida', posti: ord.slice(),
             testo: testo + '. Per andarci: «portami ' + conArticolo(primi[0]) + '».' };
  }

  /* ============================================================
     IL PERCORSO FRA DUE POSTI MIEI
     «Fai il percorso casa medico», «fai il percorso medico zio gianni».
     Nessun «da» e nessun «a»: due nomi attaccati, e il secondo puo'
     essere di due parole. Non si puo' indovinare dove finisce il primo
     contando le parole — si prova ogni taglio e si tiene quello dove
     TUTT'E DUE i pezzi sono posti che esistono davvero. I nomi li ha
     scelti lui, e sono l'unico vocabolario che ci serve.
     ============================================================ */
  function dueNomi(testo) {
    var t = sbassa(testo);
    if (!t) return null;
    /* detto con le preposizioni: «da casa al medico». Piu' facile, e
       qualcuno lo dira' cosi'. */
    var m = t.match(/^(?:da|dal|dalla|dallo)\s+(.+?)\s+(?:a|al|alla|allo|ai|fino a|fino al|verso)\s+(.+)$/);
    if (m) {
      var d0 = trova(m[1]), a0 = trova(m[2]);
      if (d0 && a0 && d0 !== a0) return { da: d0, a: a0 };
    }
    /* due nomi attaccati: ogni taglio, e vince quello che li trova
       tutt'e due. A pari merito vince il taglio piu' a sinistra, cioe' il
       primo nome piu' corto: «medico zio gianni» e' il medico e zio
       Gianni, non «medico zio» e «gianni». */
    var parole = t.split(' ');
    for (var i = 1; i < parole.length; i++) {
      var d = trova(parole.slice(0, i).join(' '));
      var a = trova(parole.slice(i).join(' '));
      if (d && a && d !== a) return { da: d, a: a };
    }
    return null;
  }

  /* dallaVoce(): le parole. «Registra», «segna», «questo è» per prendere
     un punto; «fai il percorso A B» per la strada fra due.
     NIENTE SOTTOSTRINGHE. «Chiudi il microfono» che chiudeva l'app ci ha
     gia' insegnato che un comando riconosciuto dentro una frase qualunque
     fa danni: qui la frase deve COMINCIARE col comando. */
  function dallaVoce(testo) {
    var grezzo = String(testo || '').trim().replace(/[?!.]+$/, '').trim();
    var t = sbassa(grezzo);
    if (!t) return null;

    /* il percorso fra due posti. Prima di «registra», perche' «fai il
       percorso casa medico» contiene nomi e non va scambiato per altro. */
    var mp = t.match(/^(?:fai|fammi|calcola|dimmi|voglio|mi fai|preparami|prepara)?\s*(?:il\s+|un\s+|la\s+)?(?:percorso|strada|tragitto|cammino)\s+(.+)$/);
    if (mp) {
      var due = dueNomi(mp[1]);
      if (due) return { cosa: 'percorso-fra', da: due.da, a: due.a };
      return { cosa: 'percorso-fra-chi', detto: mp[1] };
    }

    /* segnare il posto dove sei */
    var mr = t.match(/^(?:registra|registrami|segna|segnami|memorizza|ricorda|tieni)\s+(?:questo come\s+|qui\s+)?(.+)$/);
    if (mr) {
      /* «registra il percorso» e' un'altra cosa: la fa percorsiMiei, che
         registra camminando. Qui si segna un punto, e non si ruba il
         comando all'altro. */
      if (/^(?:il\s+|un\s+)?(?:percorso|tragitto|cammino|strada)\b/.test(mr[1])) return null;
      return { cosa: 'registra', nome: dalGrezzo(grezzo, mr[1]) };
    }
    var mq = t.match(/^(?:questo e|questa e|qui c e|qui sta|qui e)\s+(.+?)(?:\s+mio|\s+mia)?$/);
    if (mq) return { cosa: 'registra', nome: dalGrezzo(grezzo, mq[1]) };

    if (/^(?:che posti ho|quali posti ho|i miei posti|posti miei|che posti ho segnato|elenco posti)$/.test(t)) {
      return { cosa: 'elenco-posti' };
    }
    var mb = t.match(/^(?:cancella|togli|butta|dimentica)\s+(?:il\s+|la\s+|lo\s+)?(.+)$/);
    if (mb && trova(mb[1])) return { cosa: 'butta', nome: mb[1] };
    return null;
  }

  /* IL NOME COME L'HA DETTO LUI. sbassa() butta le maiuscole, e «zio
     Gianni» tornerebbe «zio gianni»: il nome di una persona si tiene come
     l'ha detto. Si riprende dal testo grezzo lo stesso numero di parole
     finali che ha riconosciuto la regola. */
  function dalGrezzo(grezzo, pezzoSbassato) {
    var quante = sbassa(pezzoSbassato).split(' ').length;
    var p = grezzo.split(/\s+/);
    if (quante >= p.length) return nudo(pezzoSbassato);
    return nudo(p.slice(p.length - quante).join(' '));
  }

  /* ============================================================
     QUANDO CI RIPASSI DAVANTI
     «Durante il percorso è possibile registrare scivolo, percorso
     tattile, ostacolo, panchina, ritrovo, bar ecc.» (Vince, 23/10).
     Un ostacolo segnato e mai più detto non serve a niente: la ragione
     per cui uno si ferma a segnarlo è che la volta dopo vuole saperlo
     PRIMA di arrivarci. Quindi camminando si guarda se un posto suo è
     qui vicino, e lo si dice.
     E NON SONO TUTTI UGUALI. Un ostacolo è un avviso — si dice prima, e
     passa sopra al resto, perché arrivarci addosso fa male. Una panchina
     è una comodità: si dice se c'è spazio, e se non c'è pazienza.
     ============================================================ */
  var PERICOLI = /\b(?:ostacolo|buca|scalino|gradino|dislivello|palo|paletto|lavori|transenna|cantiere|pericolo|sporgenza|cassonetto|catena)\b/;
  var detti = {};
  var ultimoDetto = 0;
  /* UNO PER VOLTA. Provandola nell'app con tre riferimenti nello stesso
     punto sono usciti «casa, qui», «scivolo, qui» e un monumento in due
     secondi: un elenco, non una guida. Fra un riferimento e l'altro
     passano quindici secondi — ma un pericolo no: quello arriva quando
     arriva, perché è il motivo per cui ci si è fermati a segnarlo. */
  var FRA_UNO_E_L_ALTRO = o.fraUnoELAltro || 15000;
  var DA_LONTANO = o.daLontano || 25;       // un avviso si dice da piu' lontano
  var DA_VICINO = o.daVicino || 12;
  var RIDILLO_DOPO = o.ridilloDopo || 120000;

  function pericolo(p) { return PERICOLI.test(sbassa(p.n)); }

  function quiVicino(qui, quando) {
    if (!qui || typeof qui.lat !== 'number') return null;
    var adesso = quando || ora();
    var meglio = null;
    for (var i = 0; i < tutti.length; i++) {
      var p = tutti[i];
      var m = dist(qui.lat, qui.lon, p.lat, p.lon);
      var soglia = pericolo(p) ? DA_LONTANO : DA_VICINO;
      if (m > soglia) continue;
      if (detti[p.n] && adesso - detti[p.n] < RIDILLO_DOPO) continue;
      /* IL PERICOLO VINCE SEMPRE, anche se e' piu' lontano della
         panchina che hai sotto i piedi: la panchina la trovi col
         bastone, nella buca ci cadi dentro. */
      if (!meglio) { meglio = { p: p, m: m }; continue; }
      var suoPeggio = pericolo(meglio.p), questoPeggio = pericolo(p);
      if (questoPeggio && !suoPeggio) { meglio = { p: p, m: m }; continue; }
      if (questoPeggio === suoPeggio && m < meglio.m) meglio = { p: p, m: m };
    }
    if (!meglio) return null;
    if (!pericolo(meglio.p) && adesso - ultimoDetto < FRA_UNO_E_L_ALTRO) return null;
    detti[meglio.p.n] = adesso;
    ultimoDetto = adesso;
    var vicino = meglio.m < 8;
    return pericolo(meglio.p)
      ? { tipo: 'mio-avviso', livello: 'guida', avviso: true, posto: meglio.p, metri: meglio.m,
          testo: (vicino ? 'Attento, qui: ' : 'Attento, fra pochi passi: ') + meglio.p.n + '.' }
      : { tipo: 'mio-posto', livello: 'cenno', posto: meglio.p, metri: meglio.m,
          testo: vicino ? (meglio.p.n + ', qui.') : (meglio.p.n + ', a pochi passi.') };
  }

  function scordaDetti() { detti = {}; ultimoDetto = 0; }

  /* ============================================================
     DARLI A UN ALTRO — per ora con un link su WhatsApp
     «E può inviarli tramite WhatsApp agli altri, in attesa di avere un
     server che faccia quello, in maniera tale che loro da soli siano
     autonomi nell'aggiornamento dei percorsi» (Vince, 23/10).
     Il server non c'è, e intanto chi cammina non deve aspettarlo: i
     riferimenti stanno DENTRO il link, come già i percorsi. Niente conto
     da aprire, niente rete al momento di leggerlo — si apre e ci sono.
     Quando il server arriverà, questo resta la via che funziona offline.

     COME SI STRINGE. Le coordinate diventano interi a cinque decimali
     (un metro) e poi differenze dal punto prima: dieci riferimenti in
     un quartiere stanno in poche centinaia di caratteri, e WhatsApp
     taglia i messaggi lunghi — l'avevamo già imparato coi percorsi,
     8.000 caratteri che arrivavano monchi.
     ============================================================ */
  function perMandare(quali) {
    var lista = quali && quali.length ? quali : tutti;
    if (!lista.length) return '';
    var la = 0, lo = 0, fila = [];
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      var a = Math.round(p.lat * 100000), b = Math.round(p.lon * 100000);
      fila.push(i === 0 ? [a, b, p.n] : [a - la, b - lo, p.n]);
      la = a; lo = b;
    }
    return JSON.stringify({ v: 1, r: fila });
  }

  function daUnLink(testo, chiMeLoManda) {
    var d;
    try { d = JSON.parse(testo); } catch (e) { return null; }
    if (!d || d.v !== 1 || !d.r || !d.r.length) return null;
    var fuori = [], la = 0, lo = 0;
    for (var i = 0; i < d.r.length; i++) {
      var x = d.r[i];
      if (!x || typeof x[0] !== 'number' || typeof x[1] !== 'number') return null;
      if (i === 0) { la = x[0]; lo = x[1]; } else { la += x[0]; lo += x[1]; }
      var n = String(x[2] || '').slice(0, 60).trim();
      if (!n) continue;
      fuori.push({ n: n, lat: la / 100000, lon: lo / 100000, prec: null,
                   quando: ora(), da: chiMeLoManda || '' });
    }
    return fuori.length ? fuori : null;
  }

  /* unisci(): i riferimenti di un altro si AGGIUNGONO ai tuoi, non li
     sostituiscono. Il «medico» di Lucia non è il tuo: se portano lo
     stesso nome e stanno lontani, si tengono tutt'e due e quello che
     arriva prende il nome di chi l'ha mandato — «il medico di Lucia» —
     sennò uno dice «portami dal medico» e non si sa quale sia. Se invece
     sono lo stesso punto, è già tuo e non si fa niente. */
  var LO_STESSO = o.loStesso || 25;
  function unisci(nuovi) {
    var messi = [], gia = 0;
    (nuovi || []).forEach(function (p) {
      var uguale = null;
      for (var i = 0; i < tutti.length; i++) {
        if (sbassa(tutti[i].n) !== sbassa(p.n)) continue;
        uguale = tutti[i];
        break;
      }
      if (uguale && dist(uguale.lat, uguale.lon, p.lat, p.lon) <= LO_STESSO) { gia++; return; }
      var n = p.n;
      if (uguale) n = p.da ? (p.n + ' di ' + p.da) : (p.n + ' 2');
      var q = { n: n, lat: p.lat, lon: p.lon, prec: p.prec || null, quando: p.quando || ora() };
      tutti.push(q); messi.push(q);
    });
    return { messi: messi, gia: gia };
  }

  return { carica: carica, perSalvare: perSalvare, quanti: quanti,
           perMandare: perMandare, daUnLink: daUnLink, unisci: unisci,
           quiVicino: quiVicino, scordaDetti: scordaDetti, pericolo: pericolo,
           registra: registra, trova: trova, butta: butta, elenco: elenco,
           dueNomi: dueNomi, dallaVoce: dallaVoce, aPosto: aPosto, conArticolo: conArticolo };
}

if (typeof module !== 'undefined' && module.exports) module.exports = PostiMiei;
if (typeof window !== 'undefined') window.PostiMiei = PostiMiei;
