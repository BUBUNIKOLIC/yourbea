/* I NEGOZI DALLA NOSTRA MAPPA — Yourbea, 16/10/2026
   ============================================================
   «Usiamo tutto quello che c'è nel web per arricchire le nostre mappe…
   e quindi arricchiamo la mappa dell'Italia in nostro possesso, per poi
   avere molto di più da offrire» (Vince, 16/10).

   Questi sono i luoghi di Overture Maps — dati aperti della fondazione
   Linux, con dentro Meta, Microsoft, Amazon e TomTom — scaricati una volta
   sola, filtrati a quello che si incontra camminando, tradotti in italiano
   e tagliati a quadretti da un chilometro: `dati/negozi/4182_1248.json`.
   Non costano niente e non chiedono chiavi a nessuno.

   PERCHÉ NON BASTAVA OPENSTREETMAP: per i negozi ha molto meno. A Roma,
   nello stesso riquadro, OSM ne dà qualche decina e questi sono migliaia,
   col nome e spesso col civico. Per scalini, scivoli, percorso tattile e
   semafori acustici resta invece OSM, che è l'unica a mapparli: le due
   cose si sommano, non si sostituiscono.

   Questo file NON scarica e NON parla: dice QUALI quadretti servono e
   come si uniscono i due elenchi. Il resto lo fa app.js.

   LE REGOLE, e perché:
   1. SI PRENDE IL QUADRETTO DOVE SEI E QUELLI CHE TOCCHI. Camminando
      verso un confine, i negozi di là sono a cinquanta metri: aspettare di
      attraversarlo vuol dire dirli in ritardo.
   2. QUELLO CHE LA MAPPA VERA HA GIÀ, VINCE. Se OpenStreetMap conosce
      quel posto si tiene il suo: è aggiornato da chi ci passa davanti, e
      ha dettagli che Overture non ha (gli orari, il percorso tattile).
   3. DOPPIONE VUOL DIRE STESSO NOME VICINO, o stesso punto. I nomi
      arrivano scritti in modi diversi — «Bar Roma» e «BAR ROMA» — quindi
      si confrontano senza accenti né maiuscole.
*/

'use strict';

function Negozi(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var VICINO = o.vicino || 40;          // due cose più vicine di così, con lo stesso nome, sono la stessa
  var SOPRA = o.sopra || 15;            // o proprio lo stesso punto

  /* quadretti(): i file che servono per questa posizione. */
  function quadretti(lat, lon) {
    var q = {};
    [-0.006, 0, 0.006].forEach(function (dla) {
      [-0.008, 0, 0.008].forEach(function (dlo) {
        q[nome(lat + dla, lon + dlo)] = true;
      });
    });
    return Object.keys(q);
  }

  function nome(lat, lon) {
    return pad(Math.floor(lat * 100)) + '_' + pad(Math.floor(lon * 100));
  }
  function pad(n) {
    var s = String(Math.abs(n));
    while (s.length < 4) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }

  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9]/g, '');
  }

  /* unisci(): i punti della mappa viva + i nostri, senza doppioni. */
  function unisci(dallaMappa, nostri) {
    var fuori = (dallaMappa || []).slice();
    (nostri || []).forEach(function (x) {
      var suo = normalizza(x.n);
      var doppio = fuori.some(function (p) {
        if (!p.lat) return false;
        var d = dist(p.lat, p.lon, x.lat, x.lon);
        if (d <= SOPRA) return true;                               // REGOLA 3
        if (d > VICINO) return false;
        var n2 = normalizza(p.nome);
        if (!n2 || !suo) return false;
        return n2 === suo || n2.indexOf(suo) >= 0 || suo.indexOf(n2) >= 0;
      });
      if (doppio) return;                                          // REGOLA 2
      fuori.push({ cosa: x.t || 'negozio', servizio: x.t || 'negozio', nome: x.n,
                   indirizzo: x.a || '', lat: x.lat, lon: x.lon, nostro: true });
    });
    return fuori;
  }

  /* perIlRacconto(): i monumenti scaricati da Wikidata e Wikipedia
     diventano luoghi da raccontare, nella forma che usa parti/racconto.js.
     Quello che abbiamo scritto a mano vince sempre: le nostre schede sono
     fatte per essere ascoltate camminando, quelle di Wikipedia sono fatte
     per essere lette. Si aggiunge solo quello che non abbiamo. */
  /* nomeCompleto(): «lo stadio Domenico Francioni», «la chiesa di San
     Marco», «Monte Finestra». Il tipo davanti al nome, se il nome non lo
     dice gia'. */
  function nomeCompleto(x) {
    var t = String(x.t || '').toLowerCase().trim();
    var n = String(x.n || '');
    if (!t) return n;
    if (n.toLowerCase().indexOf(t.slice(0, 4)) === 0) return n;
    if (/^(il |la |lo |i |le |l'|gli )/i.test(n)) return n;
    /* un nome di una parola sola E' gia' il tipo: «Municipio», «Duomo»,
       «Colosseo». «Il palazzo comunale Municipio» non lo direbbe nessuno. */
    if (n.indexOf(' ') < 0) {
      var f0 = /(zione|sione|gione|ione|tà|tù|trice|ice)$/i.test(n) || /a$/i.test(n);
      return (f0 ? 'la ' : (/^(S[bcdfgilmnpqrtv]|Z|Ps|Gn|X|Y)/.test(n) ? 'lo ' : 'il ')) + n;
    }
    var f = /(zione|sione|gione|ione|tà|tù|trice|ice)$/.test(t) || /a$/.test(t);
    var art = f ? 'la ' : (/^(s[bcdfgilmnpqrtv]|z|ps|gn|x|y)/.test(t) ? 'lo ' : 'il ');
    return art + t + ' ' + n;
  }

  function perIlRacconto(cultura, nostri) {
    var fuori = [];
    (cultura || []).forEach(function (x) {
      /* SENZA SCHEDA NON VUOL DIRE SENZA VALORE, e per mezza Italia era
         la differenza fra avere l'app e non averla.
         Qui si buttava via tutto quello che Wikipedia non racconta: 8.122
         luoghi su 19.113, e dentro ci sono gli stadi, i municipi, le
         stazioni, i mercati — cioe' esattamente quello che in Utilita'
         serve per orientarsi. «Un non vedente in modalita' utilita' vuole
         sapere cosa c'e': davanti hai il municipio, lo stadio» (Vince,
         19/10): se il municipio non ha una voce su Wikipedia, con la
         regola vecchia non esisteva.
         Adesso resta, con quello che sappiamo — il nome e che cosa e' —
         e si segna `senzaScheda`, cosi' chi racconta (Turismo) lo lascia
         stare e chi orienta (Utilita') lo usa. */
      if (!x.n) return;
      var suo = normalizza(x.n);
      /* UN NOME UGUALE LONTANO NON E' LO STESSO POSTO. Misurato il 21/10:
         1.790 monumenti su 20.836 — l'8,6% di tutta Italia — sparivano
         perche' qui il nome si confrontava senza guardare DOVE. La chiesa
         di Santa Maria delle Grazie alle Fornaci, a Roma, veniva
         cancellata da chiese con un nome simile a 95, 96, 202 e 477
         chilometri. In Italia «Santa Maria delle Grazie», «San Giovanni»,
         «Duomo» si ripetono in ogni provincia.
         Adesso il nome vale solo da vicino: entro trecento metri e' la
         stessa cosa segnata due volte, piu' in la' e' un altro posto che
         si chiama uguale. */
      var UGUALE_ENTRO = 300;
      var gia = (nostri || []).some(function (p) {
        var m = dist(p.lat, p.lon, x.lat, x.lon);
        if (m < 60) return true;
        if (m > UGUALE_ENTRO) return false;
        var n2 = normalizza(p.n);
        return n2 && suo && (n2 === suo || n2.indexOf(suo) >= 0 || suo.indexOf(n2) >= 0);
      });
      if (gia) return;
      /* l'anno e l'architetto sono la cosa che si dice meglio a voce:
         «chiesa del 1252, di Filippo Brunelleschi» sta in due secondi,
         l'articolo intero no. */
      var intro = x.t || '';
      if (x.y) intro += (intro ? ' del ' : 'Del ') + x.y;
      if (x.arch && x.arch.length) intro += ', di ' + x.arch.join(' e ');
      /* e il NOME, che nella riga corta e' la cosa che serve: «Qui c'è lo
         stadio Domenico Francioni», non «Qui c'è stadio». Se il nome dice
         gia' che cosa e' — «Stadio Francioni» — non si raddoppia. */
      var comeSiChiama = nomeCompleto(x);

      /* QUANTO MERITA DI ESSERE RACCONTATO. Dario, girando all'Arenella:
         «mi ha raccontato di una chiesa che artisticamente non vale
         niente». Su Wikipedia c'è dentro tutto, anche la parrocchia di
         quartiere del 1960 — ed è giusto che ci sia, ma non che si
         prenda mezzo minuto di racconto. Si pesa quello che la fonte
         stessa ci dice: chi l'ha costruita (se Wikidata sa l'architetto,
         qualcuno se n'è occupato), quanto è antica, e quanto è lunga la
         voce — che è il modo più onesto di misurare quanto importa a
         qualcuno. Chi non passa la soglia non sparisce: si dice in una
         riga, il nome e l'anno, e si va avanti. */
      var peso = 0;
      if (!x.d) peso = 0;
      if (x.arch && x.arch.length) peso += 2;
      if (x.y && x.y < 1800) peso += 1;
      if (x.d && x.d.length > 420) peso += 2;
      else if (x.d && x.d.length > 260) peso += 1;

      /* COM'E' FATTA VIENE DIETRO. Qui ogni luogo del quadretto viene
         RICOSTRUITO da zero, con un elenco fisso di campi: il 21/10 i dati
         per le descrizioni orientative — altezza, larghezza, materiale,
         forma — sono stati fatti, messi nei quadretti e pubblicati, e poi
         non si sentivano. Restavano nel file: di qui non passavano.
         E vengono dietro anche ai luoghi MINORI: una chiesetta di
         quartiere non merita mezzo minuto di storia dell'arte, ma «di
         mattoni, con un campanile» è proprio quello che serve a chi non
         vede, e costa due secondi. */
      function comeEFatta(y) {
        var c = {};
        if (x.h) c.h = x.h;
        if (x.l) c.l = x.l;
        if (x.mat && x.mat.length) c.mat = x.mat;
        if (x.frm && x.frm.length) c.frm = x.frm;
        for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) y[k] = c[k];
        return y;
      }

      if (!x.d || peso < 2) {
        fuori.push(comeEFatta({ n: x.n, lat: x.lat, lon: x.lon, k: 1, t: x.t || '', y: x.y || 0,
                     d: 'Qui c\'è ' + (comeSiChiama || intro || x.n) + '.', i: '', a: '',
                     intro: intro, daWiki: true, minore: true,
                     senzaScheda: !x.d }));
        return;
      }
      fuori.push(comeEFatta({ n: x.n, lat: x.lat, lon: x.lon, k: 1, t: x.t || '', y: x.y || 0,
                   d: x.d, i: '', a: '', intro: intro, daWiki: true }));
    });
    return fuori;
  }

  return { quadretti: quadretti, unisci: unisci, nome: nome, perIlRacconto: perIlRacconto };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Negozi;
if (typeof window !== 'undefined') window.Negozi = Negozi;
