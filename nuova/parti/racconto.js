/* IL RACCONTO A GRADINI — Yourbea, rifatto il 15/10/2026
   ============================================================
   Questo file decide COSA dire e QUANDO. Non parla: restituisce una frase e
   chi la riceve la passa al motore della voce. Non sa niente di audio, di
   mappe, di schermo: per questo si può provare in un secondo, senza telefono.

   IL CONTRATTO, detto da Vince il 15/10 sera:
   «il codice che non si blocca, che approfondisce i monumenti se uno si
    ferma 10 secondi».

   I GRADINI, nell'ordine:
   0. camminando → IL CENNO: «sulla destra, a ottanta metri, Palazzo Reale».
      Uno per volta, e mai due volte lo stesso luogo.
   1. fermi dieci secondi davanti a qualcosa → LA SCHEDA: com'è fatto.
   2. ancora fermi, o «ancora» → COSA VEDERE.
   3. ancora, e solo per i luoghi grandi → L'APPROFONDIMENTO «da manuale».
   4. finito: «di questo ti ho detto tutto».

   LE REGOLE CHE NASCONO DAI DIFETTI VISTI:
   - un luogo importante non si perde mai: se non si può dirlo adesso,
     resta in attesa e si dice appena si può (Gabri a Parma);
   - in Utilità (la modalità di chi non vede) i luoghi importanti si dicono
     come la guida, non come un cenno sacrificabile;
   - fermarsi si misura sullo SPOSTAMENTO, non sulla velocità dichiarata dal
     telefono: a piedi, fermi, il GPS continua a muoversi di qualche metro;
   - niente distanze esatte per gli attraversamenti: quello lo fa un altro
     file. Qui si parla solo di luoghi da raccontare.
*/

'use strict';

function Racconto(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var FERMO_PER = o.fermoPer || 10000;      // dieci secondi, come ha detto Vince
  var FERMO_RAGGIO = o.fermoRaggio || 12;   // entro dodici metri si è «fermi»
  var RIDILLO_DOPO = o.ridilloDopo || 90000;
  var dist = o.dist || function (a, b, c, d) {
    var R = 6371000, P = Math.PI / 180;
    var x = (c - a) * P, y = (d - b) * P;
    var h = Math.sin(x / 2) * Math.sin(x / 2) +
            Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // stato: dove sono fermo da quando, cosa ho già detto, a che gradino sono
  var fermoDa = 0, fermoLat = null, fermoLon = null;
  var detti = {};            // nome -> {quando, lat, lon}
  var gradino = {};          // nome -> quanti gradini ho già detto
  var inCorso = null;        // il luogo di cui sto raccontando

  function quantiGradini(p) {
    var n = 1;               // la scheda
    if (p.i) n++;            // cosa vedere
    if (p.a) n++;            // l'approfondimento
    return n;
  }
  function giaDetto(p, qui) {
    var v = detti[p.n];
    if (!v) return false;
    if (ora() - v.quando < RIDILLO_DOPO) return true;
    // te ne sei andato e sei tornato: si può ridire
    return dist(qui.lat, qui.lon, v.lat, v.lon) < 200;
  }

  /* dove(): aggiorna il senso di «fermo». Si chiama a ogni posizione nuova. */
  function dove(qui) {
    if (fermoLat === null || dist(qui.lat, qui.lon, fermoLat, fermoLon) > FERMO_RAGGIO) {
      fermoLat = qui.lat; fermoLon = qui.lon; fermoDa = ora();
      return false;
    }
    return ora() - fermoDa >= FERMO_PER;
  }
  function fermoDaQuanto() { return fermoLat === null ? 0 : ora() - fermoDa; }

  /* prossimo(): la decisione. Restituisce null, o
     { tipo, luogo, testo, clip, livello } — niente effetti collaterali. */
  function prossimo(situazione) {
    var qui = situazione.qui;                    // {lat,lon,direzione}
    var intorno = situazione.intorno || [];      // [{p, m, rel}] già ordinati
    var modo = situazione.modo || 'tutto';       // 'servizi' | 'cultura' | 'tutto'
    var fermo = dove(qui);

    // 1. SE SONO FERMO DAVANTI A QUALCOSA: si scende di gradino
    if (fermo) {
      var vicino = inCorso || (intorno.length ? intorno[0].p : null);
      if (vicino) {
        var g = gradino[vicino.n] || 0;
        if (g < quantiGradini(vicino)) {
          gradino[vicino.n] = g + 1;
          inCorso = vicino;
          if (g === 0) return { tipo: 'scheda', luogo: vicino, testo: vicino.d, livello: 'guida' };
          if (g === 1 && vicino.i) return { tipo: 'cosa-vedere', luogo: vicino, testo: 'Cosa vedere: ' + vicino.i, livello: 'guida' };
          if (vicino.a) return { tipo: 'approfondimento', luogo: vicino, testo: vicino.a, livello: 'guida' };
        }
      }
    }

    // 2. CAMMINANDO: il cenno del prossimo luogo non ancora detto
    for (var i = 0; i < intorno.length; i++) {
      var o = intorno[i], p = o.p;
      if (p.k !== 1) continue;                   // qui si raccontano i luoghi
      if (giaDetto(p, qui)) continue;
      if (Math.abs(o.rel) > (modo === 'cultura' ? 170 : 150)) continue;
      if (o.m > raggio(p, modo)) continue;
      detti[p.n] = { quando: ora(), lat: qui.lat, lon: qui.lon };
      inCorso = p;
      gradino[p.n] = 0;
      /* In Utilità un luogo importante è GUIDA: deve aspettare il suo turno,
         non essere gettato. Era il difetto di Gabri a Parma. */
      var liv = (modo === 'servizi' && rango(p) >= 2) ? 'guida' : 'cenno';
      /* si restituiscono anche i pezzi — da che parte, quanti metri — perché
         le clip incise sono pezzi: «sulla destra» + «a 80 metri» + il nome.
         Chi riceve questa risposta non deve ricalcolarli, se no il testo e
         l'audio si disallineano. */
      return { tipo: 'cenno', luogo: p, livello: liv,
               rel: o.rel, metri: Math.round(o.m),
               direzioneBuona: situazione.direzioneBuona !== false,
               cardinale: situazione.cardinale || null,
               testo: versoTesto(o) + ', ' + metri(o.m) + ', ' + p.n + '.' };
    }
    return null;
  }

  function rango(p) {
    if (p.r) return p.r;                         // rango già calcolato dai dati
    if ((p.d || '').length >= 240 && p.i) return 2;
    return 1;
  }
  function raggio(p, modo) {
    var base = modo === 'cultura' ? 240 : 150;
    var r = rango(p);
    return r >= 3 ? Math.round(base * 1.7) : (r === 2 ? Math.round(base * 1.3) : base);
  }
  function versoTesto(o) {
    var r = o.rel;
    if (Math.abs(r) <= 20) return 'dritto davanti';
    if (r > 20 && r <= 70) return 'sulla destra';
    if (r > 70 && r <= 110) return 'proprio a destra';
    if (r > 110) return 'indietro a destra';
    if (r < -20 && r >= -70) return 'sulla sinistra';
    if (r < -70 && r >= -110) return 'proprio a sinistra';
    return 'indietro a sinistra';
  }
  function metri(m) {
    if (m < 25) return 'a pochi passi';
    if (m < 1000) return 'a ' + (Math.round(m / 10) * 10) + ' metri';
    return 'a ' + (Math.round(m / 100) / 10).toString().replace('.', ' e ') + ' chilometri';
  }

  /* ancora(): quello che succede quando l'utente dice «ancora». Scende di un
     gradino sul luogo in corso, e se è finito lo dice. */
  function ancora() {
    if (!inCorso) return null;
    var g = gradino[inCorso.n] || 0;
    if (g >= quantiGradini(inCorso)) return { tipo: 'finito', luogo: inCorso, livello: 'guida',
                                              testo: 'Di questo ti ho detto tutto.' };
    gradino[inCorso.n] = g + 1;
    if (g === 0) return { tipo: 'scheda', luogo: inCorso, testo: inCorso.d, livello: 'guida' };
    if (g === 1 && inCorso.i) return { tipo: 'cosa-vedere', luogo: inCorso, testo: 'Cosa vedere: ' + inCorso.i, livello: 'guida' };
    if (inCorso.a) return { tipo: 'approfondimento', luogo: inCorso, testo: inCorso.a, livello: 'guida' };
    return { tipo: 'finito', luogo: inCorso, livello: 'guida', testo: 'Di questo ti ho detto tutto.' };
  }

  /* approfondisci(): l'utente chiede di sapere di più, in qualunque modalità.
     Se non c'è un luogo in corso si prende il più vicino che abbia qualcosa
     da dire — anche in Utilità, dove di sua iniziativa l'app parla solo di
     servizi. Era il difetto di Gabri: chiedeva «approfondisci» e si sentiva
     rispondere «Farmacia Pirani». */
  function approfondisci(situazione) {
    if (!inCorso) {
      var intorno = situazione.intorno || [];
      for (var i = 0; i < intorno.length; i++) {
        var p = intorno[i].p;
        if (p.k === 1 && (p.d || p.a) && intorno[i].m < 260) { inCorso = p; gradino[p.n] = 0; break; }
      }
      if (!inCorso) return { tipo: 'niente', livello: 'guida',
                             testo: 'Qui intorno non ho niente da raccontare.' };
    }
    return ancora();
  }

  function salta() {
    if (inCorso) { detti[inCorso.n] = { quando: ora(), lat: fermoLat, lon: fermoLon }; inCorso = null; }
    return { tipo: 'avanti', livello: 'guida', testo: 'Andiamo avanti.' };
  }

  return {
    prossimo: prossimo, ancora: ancora, approfondisci: approfondisci, salta: salta,
    fermoDaQuanto: fermoDaQuanto,
    inCorso: function () { return inCorso; },
    gradinoDi: function (p) { return gradino[p.n] || 0; },
    dimentica: function () { detti = {}; gradino = {}; inCorso = null; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Racconto;
if (typeof window !== 'undefined') window.Racconto = Racconto;
