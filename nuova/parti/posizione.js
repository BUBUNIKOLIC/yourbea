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
  var guscio = o.guscio || null;            // { haPosizione:bool } — l'app iPhone
  var diario = o.diario || function () {};
  var RIPIEGO_DOPO = o.ripiegoDopo || 5000;
  var FERMO_RAGGIO = o.fermoRaggio || 12;
  var FERMO_PER = o.fermoPer || 10000;
  var PASSO_BUONO = o.passoBuono || 5;      // oltre cinque metri la direzione è credibile
  var VERSO_VALE = o.versoVale || 20000;    // e vale per venti secondi

  var stato = {
    pronto: false, lat: null, lon: null, prec: null,
    direzione: 0, direzioneBuona: false, direzioneQuando: 0,
    fermo: false, fermoDa: 0, ultimoPunto: null, ancora: null,
    comeVa: 'spenta'                        // spenta | cerco | attiva | negata | assente
  };
  var ascoltatori = [];
  var orologioRipiego = null;
  var vigilanza = null;

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
      direzione: stato.direzione, direzioneBuona: direzioneBuona(),
      fermo: stato.fermo, fermoDa: stato.fermo ? ora() - stato.fermoDa : 0,
      comeVa: stato.comeVa
    };
  }
  function direzioneBuona() {
    return stato.direzioneQuando > 0 && (ora() - stato.direzioneQuando) < VERSO_VALE;
  }

  /* arriva(): il cuore. Una posizione nuova, da qualunque porta venga. */
  function arriva(lat, lon, prec) {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;
    if (orologioRipiego) { annulla(orologioRipiego); orologioRipiego = null; }
    var prima = stato.ultimoPunto;
    stato.lat = lat; stato.lon = lon; stato.prec = prec;
    stato.pronto = true;
    stato.comeVa = 'attiva';

    if (prima) {
      var passo = dist(prima.lat, prima.lon, lat, lon);
      // REGOLA 4: la direzione si crede solo se ci si è mossi davvero
      if (passo > PASSO_BUONO) {
        stato.direzione = verso(prima.lat, prima.lon, lat, lon);
        stato.direzioneQuando = ora();
      }
      // REGOLA 5: fermo è restare dentro un cerchio piccolo per dieci secondi
      if (!stato.ancora || dist(stato.ancora.lat, stato.ancora.lon, lat, lon) > FERMO_RAGGIO) {
        stato.ancora = { lat: lat, lon: lon };
        stato.fermoDa = ora();
        stato.fermo = false;
      } else if (ora() - stato.fermoDa >= FERMO_PER) {
        if (!stato.fermo) diario('FERMO da dieci secondi');
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
      }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    } catch (e) { problema('assente'); }
  }

  /* dalGuscio(): la porta che l'app iPhone chiama. */
  function dalGuscio(lat, lon, prec) { arriva(lat, lon, prec); }

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
