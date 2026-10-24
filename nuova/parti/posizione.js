/* LA POSIZIONE — Yourbea, rifatta il 15/10/2026
   ============================================================
   Questo file fa UNA cosa: sapere dove sei, da che parte sei girato, e se sei
   fermo o cammini. Niente voce, niente mappa, niente schermo.

   Perché è un file a sé: nella vecchia app la posizione era intrecciata con
   tutto il resto, e «non partiva» — il difetto di Dario a Napoli — poteva
   nascere da cinque punti diversi senza che si capisse quale.

   LE REGOLE, e il difetto che le ha dettate:
   1. UNA PORTA SOLA. Dentro il guscio dell'iPhone la posizione la passa
      l'app; nel browser la chiede il browser. Chi usa questo file non deve
      sapere quale dei due: chiama `comincia()` e riceve le posizioni.
      (Nel guscio, chiedere la posizione dalla pagina faceva comparire un
      SECONDO dialogo col nome del dominio: chi non vede non lo vedeva, non
      lo toccava, e l'app restava ferma per sempre.)
   2. SI DICE SEMPRE COSA STA SUCCEDENDO. Se la posizione non arriva, questo
      file lo dice a chi lo usa — «sto cercando», «negata», «spenta» — e chi
      lo usa può parlare. Il silenzio è il difetto, non la mancanza di GPS.
   3. SE IL GUSCIO TACE, SI RIPIEGA SUL BROWSER. Dopo cinque secondi senza
      niente si chiede comunque al browser: meglio un dialogo in più che
      un'app ferma. (È il guasto corretto il 15/10 alle 12.23.)
   4. LA DIREZIONE SI CREDE SOLO SE SI STA MUOVENDO. Fermi, la direzione del
      GPS gira a caso: «a destra» detto a chi non vede, sbagliato, è peggio
      del silenzio. Si usa lo spostamento fra due punti, non la bussola.
      (La sorella di Vince: «diceva solo a destra».)
   5. FERMO È UNO SPOSTAMENTO PICCOLO, NON VELOCITÀ ZERO. A piedi, fermi, il
      punto balla di qualche metro: fermo = dentro dodici metri per dieci
      secondi.
*/

'use strict';

function Posizione(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var fraPoco = o.fraPoco || function (f, ms) { return setTimeout(f, ms); };
  var annulla = o.annulla || function (id) { clearTimeout(id); };
  var geo = o.geo || null;                  // navigator.geolocation, o finto
  /* chi sa dove passano le strade: se c'e', ogni lettura si posa sulla
     via piu' probabile prima di essere usata. Le regole stanno in
     parti/aggancio.js — e sono quattro, tutte per non far sembrare
     sicura una lettura che non lo e'. */
  var aggancia = o.aggancia || null;
  var guscio = o.guscio || null;            // { haPosizione:bool } — l'app iPhone
  var diario = o.diario || function () {};
  var RIPIEGO_DOPO = o.ripiegoDopo || 5000;
  var FERMO_RAGGIO = o.fermoRaggio || 12;
  /* cinque secondi, non dieci: vedi parti/racconto.js */
  var FERMO_PER = o.fermoPer || 5000;
  var PASSO_BUONO = o.passoBuono || 5;      // oltre cinque metri la direzione è credibile
  var VERSO_VALE = o.versoVale || 20000;    // e vale per venti secondi
  var ATTIVITA_VALE = o.attivitaVale || 90000;   // il passometro, se tace, scade
  var CORSA_VALE = o.corsaVale || 120000;        // e quanto forte andavi, due minuti

  /* ============================================================
     IL FILTRO — perche' il punto non balli
     «Trova il modo per essere preciso» (Vince, 23/10).
     Il GPS di un telefono, fermo in mezzo alla strada, sposta il punto
     di cinque o dieci metri a ogni lettura. Finora l'app usava ogni
     lettura com'era: cosi' la stessa porta diventava «a 30 passi», poi
     «a 45», poi «a 25». A chi vede non cambia niente; a chi cammina col
     bastone cambia la porta.
     Il filtro e' quello di Kalman, in una riga per coordinata: si tiene
     una stima e di quanto e' incerta, e ogni lettura la corregge in
     proporzione a quanto e' precisa. Una lettura a ±5 m sposta molto,
     una a ±60 m quasi niente. Fra una lettura e l'altra l'incertezza
     cresce di quanto si puo' aver camminato, cosi' il filtro non si
     impunta se uno si muove davvero.
     Non e' un abbellimento: e' la differenza fra una distanza che si
     puo' dire a voce e una che balla.
     ============================================================ */
  var CAMMINATA = o.quantoCammino || 1.4;      // metri al secondo, il peggio
  var filtro = null;
  /* il contapassi all'ultima lettura: serve a sapere quanti passi hai
     fatto DA ALLORA, cioe' quanto ti sei spostato per davvero. */
  var passiAllaLettura = null;
  /* il filo degli ultimi punti, per prendere la direzione su un tratto
     invece che fra due letture appiccicate */
  var filo = [];
  var TRATTO_DIREZIONE = o.trattoDirezione || 10;

  function filtra(lat, lon, prec, quando) {
    var p = Math.max(3, Math.min(prec || 20, 100));
    var R = p * p;                                   // quanto sbaglia la lettura
    if (!filtro) {
      filtro = { lat: lat, lon: lon, vlat: 0, vlon: 0, varianza: R, quando: quando };
      /* anche il contapassi si segna QUI, non solo in fondo: senza
         questa riga la seconda lettura non sapeva quanti passi avevi
         fatto dalla prima, e da fermo il punto le andava dietro di
         cinque metri (banco: «FERMO CON I PASSI FERMI»). */
      if (typeof stato.passi === 'number') passiAllaLettura = stato.passi;
      return { lat: lat, lon: lon, prec: p };
    }
    var dt = Math.max(0, (quando - filtro.quando) / 1000);
    /* ============================================================
       FRA UNA LETTURA E L'ALTRA, COMANDANO I PASSI
       (regola 1, punto 2 — 23/10)
       Fin qui la previsione usava la velocita' ricavata dalle letture
       stesse: quando il GPS balla, quella velocita' e' il ballo. Il
       contapassi invece non sbaglia — se non fai passi non ti sei
       mosso, e se li fai ti sei spostato di una falcata per passo.
       Due casi, e cambiano entrambi quello che si crede:
       - PASSI FERMI: la previsione non avanza di un metro, e
         l'incertezza cresce di poco. Cosi' una lettura che sbanda,
         mentre tu sei fermo davanti a una chiesa, non sposta il punto:
         prima lo spostava, ed era la distanza che ballava fra «a 30
         passi» e «a 45».
       - PASSI CHE CRESCONO: quanto hai avanzato lo dicono loro, non il
         GPS, e la direzione e' quella in cui stavi andando. */
    var passiFatti = null;
    if (typeof stato.passi === 'number' && passiAllaLettura !== null &&
        stato.passiQuando && (quando - stato.passiQuando) < ATTIVITA_VALE) {
      passiFatti = Math.max(0, stato.passi - passiAllaLettura);
    }
    /* PRIMA SI INDOVINA DOV'E' ADESSO, POI SI CORREGGE.
       La prima versione teneva solo la posizione, e camminando restava
       indietro di sei metri — cioe' diceva «a trenta passi» di una cosa
       che avevi gia' superato. Il filtro deve sapere anche QUANTO E DA
       CHE PARTE ti stavi muovendo: con quello sposta avanti la stima di
       suo, e la lettura serve solo a correggerla. */
    var attesaLat = filtro.lat + filtro.vlat * dt;
    var attesaLon = filtro.lon + filtro.vlon * dt;
    /* fra una lettura e l'altra uno puo' aver cambiato passo o
       direzione: e' quello che l'incertezza deve coprire. */
    var Q = (CAMMINATA * dt) * (CAMMINATA * dt) * 0.6;
    if (passiFatti === 0) {
      /* fermo: la previsione resta dov'e', e si copre solo il
         tremolio di chi sta in piedi, non una camminata intera. */
      attesaLat = filtro.lat; attesaLon = filtro.lon;
      Q = (0.3 * dt) * (0.3 * dt);
      /* e alla lettura si crede meta': se non ti sei mosso, tutto
         quello che cambia fra una lettura e l'altra E' rumore. Senza
         questo, la seconda lettura da fermo spostava il punto di
         cinque metri (banco: «FERMO CON I PASSI FERMI»). */
      R = R * 2;
    } else if (passiFatti > 0 && direzioneBuona() && dt > 0) {
      var avanti = passiFatti * unPasso();
      var r = Math.PI / 180;
      attesaLat = filtro.lat + (avanti * Math.cos(stato.direzione * r)) / 111320;
      attesaLon = filtro.lon + (avanti * Math.sin(stato.direzione * r)) /
                  (111320 * Math.cos(lat * r) || 1);
      /* i passi dicono QUANTO con precisione, la direzione meno: si
         copre un terzo di quello che hai camminato. */
      Q = (avanti / 3) * (avanti / 3);
    }
    var varianza = filtro.varianza + Q;
    var K = varianza / (varianza + R);               // quanto si crede alla lettura
    /* in gradi: K e' un numero puro, e le differenze sono piccole. */
    var nuovaLat = attesaLat + K * (lat - attesaLat);
    var nuovaLon = attesaLon + K * (lon - attesaLon);
    /* e la velocita' si impara piano, perche' una lettura storta non
       deve far credere che tu sia partito di corsa. */
    if (dt > 0.2) {
      var vLat = (nuovaLat - filtro.lat) / dt;
      var vLon = (nuovaLon - filtro.lon) / dt;
      filtro.vlat = filtro.vlat * 0.4 + vLat * 0.6;
      filtro.vlon = filtro.vlon * 0.4 + vLon * 0.6;
    }
    filtro.lat = nuovaLat; filtro.lon = nuovaLon;
    filtro.varianza = (1 - K) * varianza;
    filtro.quando = quando;
    if (typeof stato.passi === 'number') passiAllaLettura = stato.passi;
    return { lat: nuovaLat, lon: nuovaLon, prec: Math.max(3, Math.sqrt(filtro.varianza)) };
  }

  /* e quando si salta da un'altra parte — la metro, il treno — il filtro
     si butta: tenerlo vorrebbe dire trascinarsi dietro Roma mentre sei
     a Milano. */
  function scordaIlFiltro() {
    filtro = null; filo = []; passiAllaLettura = null; direzioniRecenti = [];
  }

  var stato = {
    pronto: false, lat: null, lon: null, prec: null,
    velocita: null, ultimoQuando: 0, saltato: false,
    direzione: 0, direzioneBuona: false, direzioneQuando: 0,
    fermo: false, fermoDa: 0, ultimoPunto: null, ancora: null,
    /* i passi contati dal telefono: li manda il guscio, e sono l'unica
       cosa che sa davvero se stai camminando */
    passi: null, passiPrima: null, passiCambiati: 0, passiQuando: 0,
    attivita: null, attivitaQuando: 0, attivitaSicura: false,
    viaAgganciata: null,
    velocitaAlta: 0, velocitaAltaQuando: 0,
    /* il corso che dice il telefono, se lo dice */
    corsoSuo: null, corsoSuoPrec: null, corsoSuoQuando: 0,
    comeVa: 'spenta'                        // spenta | cerco | attiva | negata | assente
  };
  var ascoltatori = [];
  var orologioRipiego = null;
  var vigilanza = null;
  var buttate = 0;            // letture impossibili scartate di fila

  function dist(a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function verso(a, b, c, d) {
    var P = Math.PI / 180;
    var y = Math.sin((d - b) * P) * Math.cos(c * P);
    var x = Math.cos(a * P) * Math.sin(c * P) - Math.sin(a * P) * Math.cos(c * P) * Math.cos((d - b) * P);
    return (Math.atan2(y, x) / P + 360) % 360;
  }
  function avvisa(cosa) {
    for (var i = 0; i < ascoltatori.length; i++) {
      try { ascoltatori[i](cosa, leggi()); } catch (e) {}
    }
  }
  function leggi() {
    return {
      pronto: stato.pronto, lat: stato.lat, lon: stato.lon, prec: stato.prec,
      velocita: stato.velocita,
      saltato: !!stato.saltato,
      /* a piedi si va fino a otto o nove chilometri all'ora correndo; sopra
         i dodici si e' su qualcosa con le ruote. Senza misura si suppone
         di si': meglio parlare a chi e' in macchina che tacere a chi
         cammina. */
      /* LO DICE IL PASSOMETRO, NON IL SATELLITE.
         La soglia sulla velocita' sbaglia nei due sensi: un non vedente
         che va piano col bastone, o fermo in galleria col GPS che salta,
         risultava su un mezzo; e una lettura sballata di cinquanta metri
         vale 180 all'ora anche da seduto. Il telefono i passi li conta
         col passometro, e sottoterra funziona uguale (e' la strada di
         Microsoft Soundscape). Quando il guscio lo manda comanda lui;
         se tace per un minuto e mezzo, o non c'e', si torna alla
         velocita' — meglio la misura grezza che nessuna. */
      aPiedi: comeTiMuovi(),
      /* e si dice anche COME, perche' «fermo» non e' «cammina»: a chi sta
         fermo si puo' raccontare, a chi e' su un mezzo no. */
      attivita: attivitaFresca() ? stato.attivita : null,
      viaAgganciata: stato.viaAgganciata,
      direzione: stato.direzione, direzioneBuona: direzioneBuona(),
      fermo: stato.fermo, fermoDa: stato.fermo ? ora() - stato.fermoDa : 0,
      comeVa: stato.comeVa
    };
  }
  function attivitaFresca() {
    return !!stato.attivita && (ora() - stato.attivitaQuando) < ATTIVITA_VALE;
  }
  function comeTiMuovi() {
    if (attivitaFresca() && stato.attivitaSicura) {
      /* «boh» non e' una risposta: il telefono dice che non lo sa, e
         allora decide la velocita' come prima. */
      if (stato.attivita === 'cammina' || stato.attivita === 'corre' ||
          stato.attivita === 'fermo') return true;
      if (stato.attivita === 'bici' || stato.attivita === 'mezzo') return false;
    }
    /* i passi battono la velocita' dedotta dalle letture: una lettura
       sballata non ti fa salire in macchina (vedi «la cadenza dei passi
       dice che sei un pedone»). */
    if (cadenzaDaPedone()) return true;
    /* e prima di dire «cammina», si guarda se poco fa correva */
    if (stato.velocitaAlta && (ora() - stato.velocitaAltaQuando) < CORSA_VALE) return false;
    return stato.velocita === null || stato.velocita < 3.4;
  }
  /* dalGuscio, ma per il modo di muoversi: lo chiama window.urbeaAttivita */
  function comeMiMuovo(come, sicuro) {
    var c = String(come || '');
    if (c !== stato.attivita || !!sicuro !== stato.attivitaSicura) {
      diario('PASSOMETRO: ' + c + (sicuro ? '' : ' (incerto)'));
    }
    stato.attivita = c;
    stato.attivitaSicura = !!sicuro;
    stato.attivitaQuando = ora();
  }

  /* ============================================================
     MENTRE GIRI L'ANGOLO, LA PARTE NON SI DICE
     «Mi diceva di andare a destra ma dovevo andare dritto» (Vince,
     23/10, camminando). Misurato sul percorso vero di Trastevere, con
     il nostro rumore: la direzione sbaglia di piu' di 45 gradi in 55
     letture su 981 — e TUTTE E 55 cadono entro undici metri da una
     svolta. Non e' il GPS: e' che la direzione si prende sullo
     spostamento degli ultimi dieci metri, e mentre giri quei dieci
     metri sono metA' vecchia strada e metA' nuova. Quarantacinque
     gradi di errore sono «dritto» detto «a destra», e a chi non vede
     e' un ordine.
     Quindi: finche' la direzione sta cambiando, non e' buona. Si tace
     la parte per i tre o quattro secondi della svolta, e si riprende
     quando e' ferma. Tacere per tre secondi non ha mai fatto male a
     nessuno; «a destra» nel posto sbagliato si'.
     ============================================================ */
  var direzioniRecenti = [];
  var GIRA_SE = o.giraSe || 25;                 // gradi di ballo che vogliono dire «sto girando»
  var GIRA_ENTRO = o.giraEntro || 6000;         // e per quanto si guarda indietro
  function quantoGira(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  function segnaLaDirezione(d) {
    direzioniRecenti.push({ d: d, t: ora() });
    while (direzioniRecenti.length > 1 &&
           (ora() - direzioniRecenti[0].t) > GIRA_ENTRO * 2) {
      direzioniRecenti.shift();
    }
  }
  /* stoGirando(): si confronta la direzione del tratto lungo (dieci
     metri, quella che l'app usa) con quella degli ultimi tre metri. Se
     non vanno d'accordo, la strada sta cambiando sotto i piedi: siamo
     in mezzo a una svolta, e la parte non si dice. */
  function stoGirando() {
    if (filo.length < 2) return false;
    var ultimo = filo[filo.length - 1];
    var lungo = null, corto = null;
    for (var i = filo.length - 2; i >= 0; i--) {
      var d = dist(filo[i].lat, filo[i].lon, ultimo.lat, ultimo.lon);
      if (corto === null && d >= 3) corto = filo[i];
      if (d >= TRATTO_DIREZIONE) { lungo = filo[i]; break; }
    }
    if (!lungo || !corto || lungo === corto) return false;
    var a = verso(lungo.lat, lungo.lon, ultimo.lat, ultimo.lon);
    var b = verso(corto.lat, corto.lon, ultimo.lat, ultimo.lon);
    return quantoGira(a, b) > GIRA_SE;
  }

  function direzioneBuona() {
    if (stato.direzioneQuando <= 0) return false;
    if ((ora() - stato.direzioneQuando) >= VERSO_VALE) return false;
    return !stoGirando();
  }

  /* arriva(): il cuore. Una posizione nuova, da qualunque porta venga. */
  function arriva(lat, lon, prec) {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;
    /* IL FILTRO PRIMA DELL'AGGANCIO, e non e' indifferente: il punto che
       balla saltava da una via all'altra, e l'aggancio ci andava dietro
       — «sei entrato in via Roma», «sei entrato in via Costabile» in
       mezzo minuto. Prima si ferma il ballo, poi si posa sulla via. */
    var pulito = filtra(lat, lon, prec, ora());
    lat = pulito.lat; lon = pulito.lon;
    prec = Math.min(prec || pulito.prec, pulito.prec);
    /* POI LA SI POSA SULLA STRADA. «La APP deve avere una
       posizione precisa» (Vince, 23/10, regola 1). Tredici metri di
       errore, in una via stretta, vuol dire stare dentro il palazzo di
       fronte — e l'errore che conta e' quello di LATO: dieci metri
       avanti sono «fra trenta passi» invece di venti, dieci metri di
       lato sono l'altro marciapiede. Si aggancia qui, in un posto solo,
       cosi' tutto quello che viene dopo — la strada, i passaggi, i
       monumenti, il faro — lavora sul punto buono. */
    if (aggancia) {
      var posato = aggancia(lat, lon, prec, comeTiMuovi());
      if (posato) {
        lat = posato.lat; lon = posato.lon;
        stato.viaAgganciata = posato.via || null;
        if (posato.spostato >= 5) diario('AGGANCIO: spostata di ' + posato.spostato + ' m su ' + (posato.via || 'una via'));
      } else {
        stato.viaAgganciata = null;
      }
    }
    /* ============================================================
       LE LETTURE IMPOSSIBILI SI BUTTANO
       «Migliora il posizionamento» (Vince, 20/10). Fra i palazzi il GPS
       ogni tanto spara una lettura di trenta metri fuori, e poi torna: e'
       quella che faceva ballare il punto fra due vie, e da li' «sei
       entrato in via Roma», «sei entrato in Strada Statale», «sei entrato
       in via Costabile» in mezzo minuto.
       Una lettura si butta quando dice che in un secondo hai fatto piu' di
       quindici metri — cioe' cinquanta chilometri all'ora a piedi — E la
       sua precisione e' peggiore di quella di prima. Se invece e' precisa,
       si crede: magari ti sei davvero spostato (o sei in macchina, e lo
       dice la velocita'). Due di fila si credono comunque: se il mondo e'
       cambiato davvero, non si resta ancorati al passato. */
    var adessoE = ora();
    if (stato.pronto && stato.ultimoPunto && !stato.saltato) {
      var salto = dist(stato.lat, stato.lon, lat, lon);
      var dt = Math.max(0.3, (adessoE - (stato.ultimoQuando || adessoE)) / 1000);
      var troppoVeloce = (salto / dt) > 15;
      var piuSgangherata = (prec || 0) > (stato.prec || 0) + 10;
      if (troppoVeloce && piuSgangherata && buttate < 2) {
        buttate++;
        diario('LETTURA BUTTATA: ' + Math.round(salto) + ' m in ' + dt.toFixed(1) + ' s, ±' + Math.round(prec || 0) + ' m');
        return;
      }
      buttate = 0;
    }
    if (orologioRipiego) { annulla(orologioRipiego); orologioRipiego = null; }
    stato.alBuio = 0;                 // il GPS e' tornato: la stima coi passi finisce qui
    var prima = stato.ultimoPunto;
    stato.lat = lat; stato.lon = lon; stato.prec = prec;
    stato.pronto = true;
    stato.comeVa = 'attiva';

    if (prima) {
      var passo = dist(prima.lat, prima.lon, lat, lon);
      /* QUANTO VAI FORTE. «Eravamo in autostrada e dava gli incroci»
         (Vince, 19/10, tornando da Napoli). A ottanta all'ora gli
         attraversamenti, i paletti e i nomi degli incroci non sono
         informazione: sono rumore, e per di piu' arrivano quando sei gia'
         un chilometro piu' avanti. L'app deve sapere se sei a piedi, e
         finora non se lo chiedeva.
         Si misura a media mobile: una posizione sola puo' saltare di
         trenta metri per un rimbalzo del GPS, e darebbe quaranta
         all'ora a uno fermo al semaforo. */
      var quando = ora();
      var passatoDa = quando - (stato.ultimoQuando || quando);
      /* IL SALTO: «ho preso la metro e non si è accorto» (Vince, 20/10).
         Sottoterra il GPS non c'e': non arriva niente, e quando si
         riaffaccia uno e' tre chilometri piu' in la'. Per l'app, che
         guarda solo l'ultima posizione, e' come se avesse camminato — e
         continua a dare la strada di prima, che non c'entra piu' niente.
         Un salto si riconosce da due cose insieme: tanto tempo senza
         sentire niente, e tanta distanza. Chi riceve questa posizione lo
         deve sapere, per rifare la strada invece di proseguire. */
      stato.saltato = (passatoDa > 45000 && passo > 300);
      if (stato.saltato) {
        stato.velocita = null;           // la vecchia non vale piu'
        scordaIlFiltro();                // ne' la stima di dov'eri
        diario('SALTO: ' + Math.round(passo) + ' m dopo ' + Math.round(passatoDa / 1000) + ' s senza posizione');
      }
      if (passatoDa > 300 && passatoDa < 30000) {
        var adesso = passo / (passatoDa / 1000);              // metri al secondo
        stato.velocita = stato.velocita === null ? adesso
                                                 : (stato.velocita * 0.7 + adesso * 0.3);
        /* FERMO AL SEMAFORO NON VUOL DIRE A PIEDI.
           Dal quaderno vero di Vince, 22/10, in scooter: alle 15:10:54
           andava a 53 all'ora, alle 15:11:09 l'app gli diceva «fra 20
           passi, un attraversamento senza semaforo». In mezzo c'e' un
           semaforo rosso: appena ci si ferma il guscio ribatte la stessa
           posizione ogni tre secondi, la media mobile legge zero, e in
           una quindicina di secondi la velocita' scende sotto i dodici
           all'ora. Da li' in poi, per l'app, sei uno che cammina — e
           ricominciano gli attraversamenti contati in passi, cioe'
           proprio il «eravamo in autostrada e dava gli incroci» del
           19/10, arrivato per un'altra strada.
           Quindi si tiene da parte quanto forte si andava: chi faceva
           cinquanta all'ora un minuto fa non e' diventato un pedone
           perche' si e' fermato al rosso. Due minuti, e poi decade. */
        if (adesso > 3.4) {
          stato.velocitaAlta = Math.max(stato.velocitaAlta, adesso);
          stato.velocitaAltaQuando = quando;
        } else if (quando - stato.velocitaAltaQuando > CORSA_VALE) {
          stato.velocitaAlta = 0;
        }
      }
      stato.ultimoQuando = quando;
      /* REGOLA 4: LA DIREZIONE SI PRENDE SU UN TRATTO, non fra due punti.
         Due punti vicini bastano a dire «da che parte» solo se il GPS
         fosse esatto: con l'errore vero, due letture a sei metri l'una
         dall'altra possono dare una direzione sbagliata di quaranta
         gradi — e quaranta gradi, detti a chi non vede, sono il
         marciapiede di fronte.
         Allora si tiene il filo degli ultimi punti e si guarda da dove
         si veniva DIECI METRI FA: su dieci metri l'errore conta molto
         meno, e la direzione sta ferma. */
      filo.push({ lat: lat, lon: lon, quando: quando });
      while (filo.length > 40) filo.shift();
      var daDove = null;
      for (var fi = filo.length - 2; fi >= 0; fi--) {
        if (dist(filo[fi].lat, filo[fi].lon, lat, lon) >= TRATTO_DIREZIONE) { daDove = filo[fi]; break; }
      }
      /* IL CORSO DEL TELEFONO VIENE PRIMA DEL NOSTRO, se c'e' ed e'
         fresco: lui lo fonde coi sensori, noi lo deduciamo da due punti.
         Vale mezzo minuto come il nostro, e solo mentre ci si muove. */
      var suo = (stato.corsoSuo !== null && (ora() - stato.corsoSuoQuando) < 3000);
      if (suo) {
        stato.direzione = stato.corsoSuo;
        stato.direzioneQuando = ora();
        segnaLaDirezione(stato.direzione);
      } else if (daDove) {
        stato.direzione = verso(daDove.lat, daDove.lon, lat, lon);
        stato.direzioneQuando = ora();
        segnaLaDirezione(stato.direzione);
      } else if (passo > PASSO_BUONO) {
        /* appena partito, il filo e' corto: meglio una direzione
           approssimata che nessuna. */
        stato.direzione = verso(prima.lat, prima.lon, lat, lon);
        stato.direzioneQuando = ora();
        segnaLaDirezione(stato.direzione);
      }
      /* REGOLA 5: FERMO LO DICONO I PASSI, NON IL GPS.
         Era «restare dentro un cerchio di dodici metri per cinque
         secondi». Ma chi cammina fa 1,3 metri al secondo: in cinque
         secondi ne fa sei e mezzo, cioe' RESTA DENTRO IL CERCHIO. Per
         l'app eri fermo mentre camminavi, e si metteva a raccontarti la
         scheda del monumento come se ti fossi fermato davanti.
         E' il difetto che ha fatto dire a Vince «appena la provo fa
         schifo»: camminando ai Fori sentiva una frase ogni dieci passi.
         Il cerchio non si puo' nemmeno stringere: fermo sul posto il
         GPS salta di otto metri da solo, e non diremmo mai «fermo».
         Il contapassi invece non sbaglia: se non fai passi sei fermo, e
         se li fai no. Il GPS resta solo per i telefoni che il
         contapassi non ce l'hanno. */
      var passiAdesso = stato.passi;
      if (typeof passiAdesso === 'number' && stato.passiQuando) {
        if (passiAdesso !== stato.passiPrima) {
          stato.passiPrima = passiAdesso;
          stato.passiCambiati = ora();
          stato.fermo = false;
          stato.fermoDa = ora();
        } else if (ora() - (stato.passiCambiati || 0) >= FERMO_PER) {
          if (!stato.fermo) diario('FERMO: non fa passi da ' + Math.round(FERMO_PER / 1000) + ' s');
          stato.fermo = true;
        }
      } else if (!stato.ancora || dist(stato.ancora.lat, stato.ancora.lon, lat, lon) > FERMO_RAGGIO) {
        stato.ancora = { lat: lat, lon: lon };
        stato.fermoDa = ora();
        stato.fermo = false;
      } else if (ora() - stato.fermoDa >= FERMO_PER) {
        if (!stato.fermo) diario('FERMO da dieci secondi (senza contapassi)');
        stato.fermo = true;
      }
      if (passo > PASSO_BUONO) stato.ultimoPunto = { lat: lat, lon: lon };
    } else {
      stato.ultimoPunto = { lat: lat, lon: lon };
      stato.ancora = { lat: lat, lon: lon };
      stato.fermoDa = ora();
    }
    avvisa('posizione');
  }

  /* ============================================================
     LA CADENZA DEI PASSI DICE CHE SEI UN PEDONE
     (misurato il 23/10 sul banco) Una sola lettura sballata di otto
     metri in un secondo sono otto metri al secondo: sopra la soglia
     della macchina. Da li' l'app si teneva «andavi forte» per due
     minuti — ed e' giusto per chi e' al semaforo in auto, ma a un
     pedone spegneva l'AGGANCIO ALLA STRADA proprio nei momenti in cui
     serve: nella misura, su 301 letture se ne agganciavano 12.
     Il contapassi non si fa ingannare: in macchina non conta due passi
     al secondo. Se la cadenza e' da pedone, sei un pedone — e lo si
     guarda prima della velocita' dedotta dalle letture.
     ============================================================ */
  var passiStoria = [];
  var CADENZA_SU = o.cadenzaSu || 15000;       // quanto indietro si guarda
  function cadenzaDaPedone() {
    if (passiStoria.length < 2) return false;
    var primo = passiStoria[0], ultimo = passiStoria[passiStoria.length - 1];
    var dt = (ultimo.t - primo.t) / 1000;
    if (dt < 4) return false;
    var cadenza = (ultimo.v - primo.v) / dt;            // passi al secondo
    if (cadenza < 0.5 || cadenza > 3) return false;     // fermo, o non e' camminare
    return cadenza * unPasso() < 3.4;                   // e non e' una corsa in bici
  }

  /* quantiPassi(): il contapassi del telefono. Il guscio lo manda ogni
     volta che cambia; se questo telefono non ce l'ha, non chiama mai e
     il «fermo» resta quello del GPS. */
  function quantiPassi(n) {
    var v = Number(n);
    if (!isFinite(v)) return;
    var primaErano = stato.passi;
    stato.passi = v;
    stato.passiQuando = ora();
    passiStoria.push({ v: v, t: stato.passiQuando });
    while (passiStoria.length > 1 && (stato.passiQuando - passiStoria[0].t) > CADENZA_SU) {
      passiStoria.shift();
    }
    if (stato.passiPrima === null) { stato.passiPrima = v; stato.passiCambiati = ora(); }
    if (typeof primaErano === 'number' && v > primaErano) avanzaCoiPassi(v - primaErano);
  }

  /* ============================================================
     QUANDO IL GPS SPARISCE, CONTANO I PASSI
     Sotto un portico, in un vicolo stretto, fra due palazzi alti: il
     GPS non arriva per dieci, venti secondi. L'app restava ferma dov'era
     — e un non vedente che cammina sentiva «a trenta passi» di una cosa
     che intanto aveva superato, oppure niente.
     Il telefono pero' i passi li conta lo stesso, e un passo sono
     settantacinque centimetri nella direzione in cui stavi andando. Non
     e' preciso come il GPS: dopo venti metri cosi' l'errore si vede. Ma
     e' molto meglio di stare fermi, e appena il GPS torna la prima
     lettura rimette tutto a posto.
     Si fa solo A PIEDI, solo se si e' in movimento, e per non piu' di
     una trentina di metri: oltre, si preferisce dire che non si sa.
     ============================================================ */
  var PASSO_METRI = o.passoMetri || 0.75;
  /* LA FALCATA VERA, se e' stata misurata. L'app la misura mentre uno
     registra un percorso (app.js, «quanto e' lungo il tuo passo»), e
     quella misura serve anche qui: con 0,75 supposti, venti passi al
     buio sono tre metri di errore in piu' su chi cammina col bastone
     e fa il passo corto. */
  var falcata = o.falcata || function () { return PASSO_METRI; };
  function unPasso() {
    var l = 0;
    try { l = Number(falcata()) || 0; } catch (e) { l = 0; }
    return (l >= 0.4 && l <= 1.1) ? l : PASSO_METRI;
  }
  var SENZA_GPS_DA = o.senzaGpsDa || 3000;
  var AL_BUIO_AL_MASSIMO = o.alBuioAlMassimo || 30;

  function avanzaCoiPassi(quanti) {
    if (!stato.pronto || !filtro) return;
    var adesso = ora();
    if (adesso - (stato.ultimoQuando || 0) < SENZA_GPS_DA) return;   // il GPS c'e'
    if (stato.aPiedi === false) return;
    if (!direzioneBuona()) return;              // senza sapere dove guardi, non si inventa
    var avanti = quanti * unPasso();
    if (avanti < 0.5) return;
    stato.alBuio = (stato.alBuio || 0) + avanti;
    if (stato.alBuio > AL_BUIO_AL_MASSIMO) return;   // troppo: meglio fermi che inventati
    var r = Math.PI / 180;
    var dLat = (avanti * Math.cos(stato.direzione * r)) / 111320;
    var dLon = (avanti * Math.sin(stato.direzione * r)) /
               (111320 * Math.cos(stato.lat * r) || 1);
    stato.lat += dLat; stato.lon += dLon;
    filtro.lat += dLat; filtro.lon += dLon;
    /* e si dice che e' una stima: l'incertezza cresce di un metro ogni
       tre passi, perche' la direzione puo' essere cambiata. */
    stato.prec = (stato.prec || 10) + avanti / 3;
    filtro.varianza += (avanti / 3) * (avanti / 3);
    diario('AL BUIO: avanti ' + Math.round(avanti) + ' m coi passi (totale ' +
           Math.round(stato.alBuio) + ' m)');
    avvisa('posizione');
  }

  function problema(quale) {
    /* Se una posizione è già arrivata — tipicamente dal guscio dell'iPhone —
       un rifiuto del browser non è un problema dell'utente: non si annuncia.
       Provando la nuova app il 15/10 l'app diceva «non ho il permesso di
       sapere dove sei» mentre stava ricevendo le posizioni dal guscio. */
    if (stato.pronto) { diario('POSIZIONE: ' + quale + ', ma ne ho già una: non lo dico'); return; }
    stato.comeVa = quale;                   // negata | assente
    diario('POSIZIONE: ' + quale);
    avvisa('problema');
  }

  /* comincia(): accende la posizione. Chi chiama non deve sapere da dove
     arriva: guscio o browser, e se il guscio tace si ripiega sul browser. */
  function comincia() {
    stato.comeVa = 'cerco';
    avvisa('cerco');

    if (guscio && guscio.haPosizione) {
      diario('POSIZIONE: la passa il guscio');
      // REGOLA 3: se dopo cinque secondi il guscio non ha dato niente, si
      // chiede al browser. Senza questo l'app restava ferma per sempre.
      orologioRipiego = fraPoco(function () {
        if (stato.pronto) return;
        diario('POSIZIONE: il guscio tace, chiedo al browser');
        dalBrowser();
      }, RIPIEGO_DOPO);
      return;
    }
    dalBrowser();
  }

  function dalBrowser() {
    if (!geo) { problema('assente'); return; }
    try {
      geo.watchPosition(function (p) {
        arriva(p.coords.latitude, p.coords.longitude, p.coords.accuracy);
      }, function (err) {
        problema(err && err.code === 1 ? 'negata' : 'assente');
      /* maximumAge ZERO, non cinque secondi. Il browser, potendo, dava una
         posizione presa fino a cinque secondi prima: camminando sono sette
         metri di ritardo costante, e per chi non vede sette metri sono il
         marciapiede di fronte. */
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    } catch (e) { problema('assente'); }
  }

  /* dalGuscio(): la porta che l'app iPhone chiama. */
  /* dalGuscio(): dal telefono arriva anche quello che LUI calcola — il
     corso (la direzione del movimento) con la sua accuratezza in gradi,
     e la velocita'. Il corso del telefono e' fuso coi sensori, il
     nostro e' dedotto da due punti: dove c'e' il suo, vince il suo.
     I gusci vecchi mandano solo i primi tre numeri: allora `altro` e'
     vuoto e tutto va come prima. */
  function dalGuscio(lat, lon, prec, altro) {
    if (altro) corsoDalTelefono(altro);
    arriva(lat, lon, prec);
  }

  /* IL CORSO CHE DICE IL TELEFONO (regola 1, punto 4: al telefono si
     chiede tutto quello che da'). iOS lo da' con `courseAccuracy` in
     gradi, negativa quando non lo sa; Android col `bearingAccuracyDegrees`
     del Fused Location Provider. Si crede solo se:
       - il telefono dichiara di saperlo (accuratezza fra 0 e 25 gradi);
       - e ci stiamo muovendo (fermi, il corso non vuol dire niente:
         e' la regola 4 di questo file, e non cambia).
     Quando c'e', e' meglio del nostro dedotto da due punti — che mentre
     giri l'angolo sta in mezzo fra la vecchia strada e la nuova. */
  var CORSO_PREC_BUONA = o.corsoPrecBuona || 25;
  function corsoDalTelefono(a) {
    var c = Number(a.corso), p = Number(a.corsoPrec);
    if (!isFinite(c) || c < 0 || !isFinite(p) || p < 0 || p > CORSO_PREC_BUONA) {
      stato.corsoSuo = null;
      return;
    }
    stato.corsoSuo = c; stato.corsoSuoPrec = p; stato.corsoSuoQuando = ora();
  }

  /* vigila(): se la posizione non arriva mai, qualcuno deve dirlo a voce.
     Chiama la funzione data ogni volta che lo stato è brutto da troppo. */
  function vigila(quando, ogni) {
    if (vigilanza) annulla(vigilanza);
    var passo = ogni || 8000;
    (function giro() {
      vigilanza = fraPoco(function () {
        if (!stato.pronto) {
          try { quando(stato.comeVa); } catch (e) {}
        }
        giro();
      }, passo);
    })();
  }

  return {
    quantiPassi: quantiPassi,
    comeMiMuovo: comeMiMuovo,
    comincia: comincia, dalGuscio: dalGuscio, leggi: leggi,
    quando: function (f) { ascoltatori.push(f); },
    vigila: vigila,
    dist: dist, verso: verso,
    // per le prove e la diagnosi
    stato: function () { return stato; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Posizione;
if (typeof window !== 'undefined') window.Posizione = Posizione;
