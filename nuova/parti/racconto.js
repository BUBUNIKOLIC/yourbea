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
  /* CINQUE SECONDI, NON DIECI. «Ti fermi 5 secondi sennò è lenta»
     (Vince, 23/10). Dieci secondi davanti a una chiesa sono tanti: uno
     si ferma, non succede niente, e riparte prima che l'app apra bocca.
     Erano dieci dal 16/10, quando il problema era l'opposto — partiva
     a ogni sosta al semaforo — ma da allora e' arrivato il passometro,
     che sa se stai camminando, e il cerchio del fermo e' di dodici
     metri: cinque secondi adesso reggono. */
  var FERMO_PER = o.fermoPer || 5000;
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
  var inCorsoDove = null;    // e da dove lo stavo raccontando

  /* ---------- PRIMA COS'HAI DAVANTI, POI LA STORIA ----------
     «Non basta leggere la pagina Wikipedia: serve un'audiodescrizione
     orientativa» — ed era vero. Fermandosi davanti alla Basilica di
     Massenzio si sentiva «fu fatta costruire da Massenzio agli inizi del
     IV secolo»: a chi non vede non dice niente di quello che ha davanti.
     Adesso il primo gradino e' COM'E' FATTA — quanto e' grande, di che e'
     fatta, che forma ha — e la storia e' il gradino dopo, per chi dice
     «ancora». Senza quei dati non cambia niente: resta la storia subito.
     LA DIREZIONE NON SI RIPETE: il cenno l'ha appena detta («sulla
     destra, a ottanta metri»), e ridirla dieci secondi dopo e' il
     «troppo frenetico» di Dario. */
  var fatteCosi = {};
  function comeEFatta(p) {
    if (!o.descrizione || !p || !p.n) return '';
    if (Object.prototype.hasOwnProperty.call(fatteCosi, p.n)) return fatteCosi[p.n];
    var ha = p.h || p.pi || p.l || (p.mat && p.mat.length) || (p.frm && p.frm.length);
    if (!ha) { fatteCosi[p.n] = ''; return ''; }
    /* si chiama UNA VOLTA SOLA per posto: la descrizione gira le parole da
       se', e chiamarla due volte (una per contare i gradini, una per
       dirla) la farebbe girare a vuoto. */
    var f = o.descrizione.frase({ n: p.n, t: p.t, dove: '', metri: 0,
                                  altezza: p.h, piani: p.pi, larghezza: p.l,
                                  materiali: p.mat, forme: p.frm,
                                  catalogo: p.cf, pianta: p.pl });
    fatteCosi[p.n] = (f && f.testo) || '';
    return fatteCosi[p.n];
  }

  function quantiGradini(p) {
    var n = 1;               // la scheda (o, se manca, quella del ministero)
    if (comeEFatta(p)) n++;  // com'è fatta, e viene prima
    if (p.i) n++;            // cosa vedere
    if (p.a) n++;            // l'approfondimento
    /* ============================================================
       E POI I CAPITOLI, per i monumenti dove la gente sta molto tempo
       «La gente sta molto tempo: il Pantheon, il Colosseo, il Cristo
       velato» (Vince, 24/10). Prima ogni pezzo era tagliato a 700
       caratteri e dopo due minuti l'app taceva, mentre l'articolo del
       Colosseo ne ha 61.456. Adesso 1.706 monumenti hanno i loro
       capitoli — la facciata, l'interno, la cupola, le cappelle, la
       storia — e ciascuno e' un gradino: uno per ogni «ancora», finche'
       ce ne sono.
       ============================================================ */
    if (p.cap && p.cap.length) n += p.cap.length;
    return n;
  }
  function giaDetto(p, qui) {
    var v = detti[p.n];
    if (!v) return false;
    if (ora() - v.quando < RIDILLO_DOPO) return true;
    /* TE NE SEI ANDATO E SEI TORNATO: si puo' ridire. Ma «andato» vuol
       dire andato davvero. Camminando su viale di Trastevere l'app ha
       detto «Palazzo degli Esami» al metro 60 e di nuovo al metro 300,
       la seconda volta «dietro di te»: duecentoquaranta metri piu' in
       la' ma sempre la stessa strada, e sentirsi ridire una cosa che
       hai gia' passato e' il modo piu' veloce per spegnere l'app.
       Mezzo chilometro, che e' anche fin dove guarda il racconto. */
    return dist(qui.lat, qui.lon, v.lat, v.lon) < 500;
  }

  /* QUELLO CHE STAVI GUARDANDO, SE TE NE VAI, NON LO GUARDI PIU'.
     22/10 notte, facendo camminare l'app sui Fori Imperiali dentro
     l'emulatore: «Qui c'e' il Palazzo Guidiccioni». Quel palazzo sta a
     **Lucca**, duecentosettanta chilometri piu' in la'. Era il luogo
     «in corso» della camminata di prima, e `inCorso` non ha mai avuto
     un controllo di distanza: bastava fermarsi dieci secondi, dovunque
     nel mondo, e l'app riprendeva a raccontare quello.
     Non e' un caso di laboratorio: succede a chiunque prenda un treno,
     o apra l'app il giorno dopo in un'altra citta'. E vale anche per
     «ancora», che riprende da li' senza sapere dove sei.
     Duecento metri: oltre, quel posto non ce l'hai piu' davanti. */
  var TROPPO_LONTANO = o.troppoLontano || 200;
  function lasciaQuelloLontano(qui) {
    if (!inCorso || !inCorsoDove || !qui) return;
    if (dist(qui.lat, qui.lon, inCorsoDove.lat, inCorsoDove.lon) > TROPPO_LONTANO) {
      inCorso = null;
      inCorsoDove = null;
    }
  }

  /* dove(): aggiorna il senso di «fermo». Si chiama a ogni posizione nuova. */
  function dove(qui) {
    lasciaQuelloLontano(qui);
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
    /* FERMO LO SA LA POSIZIONE, non noi: lei ha il contapassi, noi solo
       il GPS — e col GPS «fermo» scattava mentre si camminava, perche'
       in cinque secondi un uomo non esce da un cerchio di dodici metri.
       Se la posizione non lo dice (un telefono senza contapassi) si
       torna a guardarlo da qui. */
    var fermo = (typeof situazione.fermo === 'boolean') ? situazione.fermo : dove(qui);
    if (situazione.fermo === false) { fermoLat = qui.lat; fermoLon = qui.lon; fermoDa = ora(); }
    if (typeof situazione.fermo === 'boolean') lasciaQuelloLontano(qui);

    // 1. SE SONO FERMO DAVANTI A QUALCOSA: si scende di gradino
    if (fermo) {
      var vicino = (inCorso && daRaccontare(inCorso, modo)) ? inCorso : primoBuono(intorno, modo);
      if (vicino) {
        /* UTILITA' NON E' TURISMO, E FIN QUI NON SI VEDEVA.
           «Non c'è differenza tra modalità utilità e modalità turismo»
           (Vince, 19/10, provando a Fuorigrotta e a Torre del Greco). Il
           quaderno gli dà ragione: fermandosi, in UTILITA', l'app leggeva
           «Il palazzetto dello sport Mario Argento era un'opera…», «La
           piscina Felice Scandone è un complesso infrastrutturale…», «Lo
           zoo di Napoli, situato nel quartiere Fuorigrotta…». Sono schede
           da Turismo, dette a chi sta cercando di muoversi.
           Parole sue: «un non vedente in modalità utilità vuole sapere
           cosa c'è — davanti hai il municipio, lo stadio — oltre le
           fermate dell'autobus; invece il turismo vuole sapere le cose
           artistiche, storiche e architettoniche».
           Quindi: in UTILITA' si dice COS'E' e basta, e la storia resta lì
           per chi la chiede («ancora»). In TURISMO si racconta. */
        if (modo === 'servizi') {
          var quandoFermo = fermiDetti[vicino.n] || 0;
          if (ora() - quandoFermo > 180000) {
            fermiDetti[vicino.n] = ora();
            inCorso = vicino; inCorsoDove = { lat: qui.lat, lon: qui.lon };
            return { tipo: 'aCosaServe', luogo: vicino, livello: 'guida',
                     testo: 'Qui c\'è ' + conArticolo(vicino) + '.' };
          }
          return null;
        }
        if ((gradino[vicino.n] || 0) < quantiGradini(vicino)) {
          inCorso = vicino; inCorsoDove = { lat: qui.lat, lon: qui.lon };
          var sceso = scendiDiUnGradino(vicino);
          if (sceso && sceso.tipo !== 'finito') return sceso;
        }
      }
    }

    /* 2. IL CENNO DEL PROSSIMO LUOGO — SOLO CAMMINANDO.
       «Deve essere tarata sul camminare sempre. Scooter, taxi e auto non
       serve» (Vince, 22/10, dopo averla provata in scooter). E prima:
       «turismo e' storia, arte, architettura». Sono la stessa frase
       detta due volte: il Turismo e' una cosa che si fa a piedi, perche'
       la storia di un palazzo la ascolti stando davanti al palazzo. Da
       un mezzo non ci sei davanti: ci passi accanto, e un attimo dopo sei
       altrove.
       Ci ho provato due volte in un giorno — prima sei volte piu'
       lontano come fa Soundscape in macchina, poi stretto a 150 metri —
       e il quaderno della sua corsa in scooter dice che avevo torto tutte
       e due: alle 15:13 «sulla sinistra, a 950 metri, cattedrale di San
       Marco», mentre lui entrava nel palazzetto dall'altra parte.
       QUI NON SI CONSUMA NIENTE: il luogo non si segna come detto, cosi'
       quando scendi e cammini te lo ritrovi. Prima il cenno veniva
       prodotto, segnato, e buttato dalla regola piu' in la': un posto
       bruciato in silenzio, che sceso dall'autobus non te lo diceva piu'
       nessuno. */
    /* ---------- IN MACCHINA, SOLO I GRANDI ---------- 29/10/2026
       Qui c'era un «return null» secco: in macchina nessun cenno, mai.
       Giusto per le chiesette, sbagliato per lo Stadio Olimpico, che
       Vince si e' lasciato alle spalle a settecento metri in silenzio.
       Adesso in macchina si va avanti, e il filtro lo fa raggio(): per i
       luoghi non importanti torna zero, quindi restano fuori da se'; i
       grandi passano e il loro cenno esce col tipo «cenno-lontano», che
       la regola in parti/aChiServe.js fa passare anche in movimento.
       In Utilita' resta come prima: chi deve muoversi, in macchina, non
       ha bisogno dei monumenti. */
    if (situazione.aPiedi === false && modo !== 'cultura') return null;
    /* L'ARIA FRA UNA COSA E L'ALTRA.
       La camminata vera ai Fori, provata il 23/10: CINQUANTA frasi in
       cinquecento metri, una ogni dieci passi — «Tempio di Augusto»,
       «Basilica Sempronia», «Basilica Giulia», «Foro Romano», «Lacus
       Curtius»... Nessuno ascolta un elenco cosi': si spegne l'app.
       Dove i monumenti sono tanti non se ne dicono di piu': se ne dice
       UNO, il migliore, e poi si cammina. Quaranta metri o mezzo minuto,
       quello che viene prima. */
    var adesso = ora();
    if (!situazione.chiesto && ultimoCenno.quando &&
        (adesso - ultimoCenno.quando) < FRA_UN_CENNO_E_L_ALTRO &&
        fraPunti(qui, ultimoCenno) < QUANTO_CAMMINI_PRIMA) return null;

    /* E SI DICE IL MIGLIORE, NON IL PRIMO CHE CAPITA. L'elenco arriva
       ordinato per distanza, e prendendo il primo che passa la regola
       usciva il muretto davanti al Colosseo. Fra quelli che si possono
       dire si sceglie: prima quanto conta, poi quanto e' vicino. */
    var candidati = [];
    for (var i = 0; i < intorno.length; i++) {
      var o = intorno[i], p = o.p;
      /* il modo va passato: senza, in Turismo passavano anche i luoghi
         senza scheda — un cenno per una cosa che poi, fermandosi, non si
         puo' raccontare */
      if (!daRaccontare(p, modo)) continue;
      if (giaDetto(p, qui)) continue;
      /* QUELLO CHE TI SEI GIÀ LASCIATO DIETRO. «E hai passato questo
         monumento altrettanto importante… se non lo è, dietro di te hai
         superato» (Vince, 16/10). Camminando si passa accanto a una chiesa
         senza accorgersene, e un secondo dopo è alle spalle: tacere vuol
         dire fargliela perdere per sempre. */
      var dietro = Math.abs(o.rel) > (modo === 'cultura' ? 170 : 150);
      if (dietro) {
        if (situazione.direzioneBuona === false) continue;   // senza bussola «dietro» è una bugia
        if (rango(p) >= 2 ? o.m > 120 : o.m > 45) continue;
      }
      if (o.m > raggio(p, modo, situazione.aPiedi)) continue;
      candidati.push({ o: o, p: p, dietro: dietro, punti: quantoVale(p, o, modo) });
    }
    /* ============================================================
       SE QUI NON C'E' NIENTE, SI DICE CHE NON C'E' NIENTE
       «Oppure in turismo dice: in questa zona di rilevante non c'e'
       molto» (Vince, 25/10). Con il raggio rifatto — si racconta quello
       che si vede — in un quartiere senza monumenti l'app tace, e chi
       non vede non sa se sta tacendo perche' non c'e' niente o perche'
       si e' rotta. Una frase, ogni tanto, lo dice.
       Quando: solo in Turismo (in Utilita' si parla di servizi), solo
       camminando, e solo dopo QUATTROCENTO METRI di niente — non e' un
       avviso, e' una rassicurazione, e ripetuta diventa una lagna. Poi
       non si ridice per cinque minuti e comunque non prima di altri
       quattrocento metri.
       ============================================================ */
    if (!candidati.length) {
      if (modo === 'cultura' && situazione.aPiedi !== false && qui) {
        if (!zonaScarica.da) { zonaScarica.da = { lat: qui.lat, lon: qui.lon, quando: adesso }; }
        var fattiSenzaNiente = fraPunti(qui, zonaScarica.da);
        var passatoDallUltima = adesso - (zonaScarica.quando || 0);
        var lontanoDallUltima = zonaScarica.dove ? fraPunti(qui, zonaScarica.dove) : 1e9;
        if (fattiSenzaNiente > ZONA_SCARICA_METRI &&
            passatoDallUltima > ZONA_SCARICA_RIPOSO &&
            lontanoDallUltima > ZONA_SCARICA_METRI) {
          zonaScarica.quando = adesso;
          zonaScarica.dove = { lat: qui.lat, lon: qui.lon };
          zonaScarica.da = null;
          return { tipo: 'zona-scarica', livello: 'cenno',
                   testo: 'In questa zona non c\u2019\u00e8 molto di rilevante.' };
        }
      }
      return null;
    }
    /* appena c'e' qualcosa da dire, il conto del niente ricomincia */
    zonaScarica.da = null;
    candidati.sort(function (a, b) { return b.punti - a.punti; });
    var scelto = candidati[0];
    var o = scelto.o, p = scelto.p, dietro = scelto.dietro;

    detti[p.n] = { quando: adesso, lat: qui.lat, lon: qui.lon };
    ultimoCenno = { quando: adesso, lat: qui.lat, lon: qui.lon };
    inCorso = p; inCorsoDove = { lat: qui.lat, lon: qui.lon };
    gradino[p.n] = 0;
    /* In Utilità un luogo importante è GUIDA: deve aspettare il suo turno,
       non essere gettato. Era il difetto di Gabri a Parma. */
    var liv = (modo === 'servizi' && rango(p) >= 2) ? 'guida' : 'cenno';
    if (dietro && rango(p) < 2) {
      /* uno minore, già superato: una riga e si va avanti — non si fa
         tornare indietro nessuno per una cosa che non lo merita */
      return { tipo: 'superato', luogo: p, livello: 'cenno',
               rel: o.rel, metri: Math.round(o.m), direzioneBuona: true,
               cardinale: situazione.cardinale || null,
               testo: 'Hai appena passato ' + comeSiChiama(p) + ', ' + metri(o.m) + ' dietro di te.' };
    }
    /* in macchina il cenno di un monumento importante esce con un tipo
       suo, perche' la regola generale («il cenno non regge il
       movimento») resta giusta per tutto il resto. */
    return { tipo: (situazione && situazione.aPiedi === false) ? 'cenno-lontano' : 'cenno',
             luogo: p, livello: liv,
             rel: o.rel, metri: Math.round(o.m),
             direzioneBuona: situazione.direzioneBuona !== false,
             cardinale: situazione.cardinale || null,
             /* «e a pochi passi hai…»: prima dove, poi quanto, poi cosa.
                Dietro si dice con parole sue, se no sembra un posto nuovo
                invece di uno che ti sei perso. */
             /* IN MACCHINA I METRI, A PIEDI I PASSI. «A 900 passi, Stadio
                Olimpico» non si cammina: a cinquanta all'ora sono venti
                secondi, e la misura che si capisce sono i metri. */
             testo: dietro
               ? ('Hai appena passato ' + comeSiChiama(p) + ', ' +
                  quanto(o.m, situazione.aPiedi) + ' dietro di te.')
               : ((situazione.direzioneBuona !== false ? versoTesto(o) + ', ' : '') +
                  quanto(o.m, situazione.aPiedi) + ', ' + comeSiChiama(p) + '.') };
    return null;
  }

  /* «DOVE C'ERA», PER QUELLO CHE NON C'E' PIU'. Vince, 25/10: «fai dire
     "qui c'era" per i posti demoliti». Nei dati ci sono 400 luoghi la cui
     scheda dice da sé che sono spariti — «San Salvatore a Ponte Rotto era
     una chiesa di Roma, demolita nel 1886», «la Meta Sudans era una
     fontana», «la stazione di Catania Ognina era una fermata». L'app li
     annunciava come se ci fossero, e a chi non vede «sulla destra, a
     ottanta passi, la chiesa di Santa Maria della Sanità» è un'indicazione
     da seguire: ci va, e non trova niente.
     La direzione e la distanza restano — servono a orientarsi, e il posto
     è comunque un riferimento — ma il nome arriva preceduto da «dove
     c'era». Il segno nei dati è `ex`. */
  function comeSiChiama(p) {
    if (!p) return '';
    /* con l'articolo, se no viene «dove c'era chiesa di San Rocco»: si
       riusa `conArticolo`, che e' gia' quella che mette «la» e «l'» e
       non ripete il tipo quando il nome lo dice gia'. */
    if (!p.ex) return p.n;
    /* UN NOME PROPRIO NON VUOLE IL TIPO DAVANTI: «dove c'era il sito
       Arco di Augusto» non lo direbbe nessuno. Quando il nome comincia
       per maiuscola, e' gia' il nome della cosa: basta l'articolo,
       accordato con la sua prima parola. */
    var n = String(p.n || '');
    var prima = n.split(' ')[0];
    if (/^[A-ZÀ-Ý]/.test(n)) {
      if (/^(il |la |lo |i |le |l'|gli )/i.test(n)) return 'dove c\'era ' + n;
      if (/^[aeiouàèéìòóù]/i.test(prima)) return 'dove c\'era ' + loIl(prima) + n;
      return 'dove c\'era ' + (femminile(prima) ? 'la ' : loIl(prima)) + n;
    }
    /* e se il nome comincia GIA' con un tipo — «cappella di San
       Lazzaro», «oratorio dei Santi» — il tipo del luogo non si rimette
       davanti: usciva «dove c'era la chiesa cappella di San Lazzaro». */
    /* e se il nome comincia GIA' con un tipo — «cappella di San Lazzaro»,
       «oratorio dei Santi» — il tipo del luogo non si rimette davanti:
       usciva «dove c'era la chiesa cappella di San Lazzaro». */
    if (/^(chiesa|chiesetta|cappella|basilica|duomo|cattedrale|collegiata|santuario|oratorio|pieve|abbazia|badia|battistero|convento|monastero|palazzo|palazzina|villa|villino|castello|rocca|torre|porta|ponte|fontana|teatro|museo|stazione|casa|edificio|complesso|arco|terme)\b/i.test(prima)) {
      if (/^[aeiouàèéìòóù]/i.test(prima)) return 'dove c\'era ' + loIl(prima) + n;
      return 'dove c\'era ' + (femminile(prima) ? 'la ' : loIl(prima)) + n;
    }
    return 'dove c\'era ' + conArticolo(p);
  }

  /* daRaccontare(): cosa è un luogo e cosa è un servizio.
     Nei dati k vale 0 per i servizi — negozi, studi medici, attraversamenti —
     e da 1 in su per i luoghi: 1 i normali, 2 e 3 quelli grossi, chiese e
     ville. Due difetti nello stesso punto, trovati il 15/10 a Roma:
     - CAMMINANDO si chiedeva k uguale a 1, e così le ventinove chiese e ville
       segnate 2 e 3 non si raccontavano MAI, in nessuna modalità;
     - DA FERMI non si guardava affatto che cosa fosse: in Turismo, fermo in
       Via dei Corazzieri, l'app ha raccontato la ferramenta.
     La regola è una sola e non cambia con la modalità: il racconto è dei
     luoghi. I servizi in Utilità si dicono, ma per la loro strada — la via,
     i civici, le farmacie — non diventano mai racconti. */
  /* quello che si e' gia' detto stando fermi: in Utilita' non si ripete
     «qui c'e' lo stadio» ogni dieci secondi */
  var fermiDetti = {};

  /* L'ARIA FRA UNA COSA E L'ALTRA, e quanto vale quello che si dice.
     La camminata vera ai Fori (nuova/prove/camminata.js) diceva
     CINQUANTA frasi in cinquecento metri. Ora se ne dice UNA, la
     migliore, e poi si cammina. */
  var ultimoCenno = { quando: 0, lat: 0, lon: 0 };
  var FRA_UN_CENNO_E_L_ALTRO = o.fraUnCenno || 45000;      // mezzo minuto buono
  /* «in questa zona di rilevante non c'e' molto»: da dove si e'
     cominciato a tacere, quando l'abbiamo detto e dove. */
  var zonaScarica = { da: null, quando: 0, dove: null };
  var ZONA_SCARICA_METRI = o.zonaScaricaMetri || 400;
  var ZONA_SCARICA_RIPOSO = o.zonaScaricaRiposo || 300000;   // cinque minuti
  var QUANTO_CAMMINI_PRIMA = o.quantoCammini || 60;        // o sessanta metri

  /* QUANTO C'E' FRA DUE PUNTI, dati come oggetti.
     Si chiamava `dist` come quella che c'e' gia' — che prende quattro
     numeri — e la copriva: `dove()`, che decide se sei fermo, le passava
     quattro numeri e si ritrovava `a.lat` di un numero. Da allora
     rispondeva sempre «lontanissimo», e la guardia che doveva mettere
     l'aria fra un monumento e l'altro non scattava mai. Due funzioni
     diverse non possono chiamarsi uguale. */
  function fraPunti(a, b) {
    if (!a || !b || !a.lat || !b.lat) return 1e9;
    return dist(a.lat, a.lon, b.lat, b.lon);
  }

  /* quantoVale(): fra tutti quelli che si potrebbero dire, QUALE.
     Prima quanto conta — un duomo batte un muretto — poi quanto e'
     vicino, e quello che hai davanti batte quello che hai di lato.
     Prendendo il primo dell'elenco (che e' il piu' vicino e basta)
     camminando ai Fori usciva «Lacus Curtius» mentre avevi il Foro
     Romano davanti. */
  function quantoVale(p, o2, modo) {
    var punti = rango(p) * 100;
    punti -= o2.m;                                   // ogni metro toglie un punto
    if (Math.abs(o2.rel) <= 45) punti += 60;         // ce l'hai davanti
    else if (Math.abs(o2.rel) > 135) punti -= 80;    // te lo sei lasciato dietro
    if (p.d) punti += 40;                            // ha qualcosa da dire
    if (p.i || p.a || p.cf) punti += 30;
    if (modo === 'cultura' && p.senzaScheda) punti -= 200;
    return punti;
  }

  /* conArticolo(): «lo stadio Diego Armando Maradona», «la chiesa di San
     Vitale». Il tipo davanti al nome, perche' il nome da solo non dice a
     che cosa serve — ed e' proprio quello che in Utilita' serve sapere. */
  function conArticolo(p) {
    var t = String(p.t || '').toLowerCase().trim();
    var n = String(p.n || '');
    if (!t) return n;
    /* SI USA LA PRIMA PAROLA DEL TIPO, non il tipo intero. Dal quaderno di
       Vince, 20/10: «Qui c'è la chiesa cattolica chiesa di San Marco
       evangelista». Il tipo era «chiesa cattolica» e il nome cominciava
       con «chiesa»: confrontando il tipo INTERO non combaciava, e ci
       infilavamo tutto davanti. E anche quando serve, davanti si mette
       solo la prima parola: «la cattedrale Santa Maria Assunta», non «la
       cattedrale cattolica Santa Maria Assunta». */
    var capo = t.split(' ')[0];
    /* IL NOME COMINCIA GIA' COL SUO TIPO: «Chiesa del Carmine», «Palazzo
       Reale». Il tipo davanti non si rimette — sarebbe il doppione del
       20/10 — ma L'ARTICOLO SI': togliendo tutto usciva «Qui c'è Chiesa
       del Carmine», e in italiano non si dice. L'articolo si accorda con
       la prima parola del NOME, che qui è anche il tipo. */
    if (n.toLowerCase().indexOf(capo) === 0) {
      var prima = n.split(' ')[0];
      if (/^[aeiouàèéìòóù]/i.test(prima)) return loIl(prima) + n;   // «l'Isola», non «la Isola»
      return (femminile(prima) ? 'la ' : loIl(prima)) + n;
    }
    if (/^(il |la |lo |i |le |l'|gli )/i.test(n)) return n;
    /* un nome di una parola sola E' gia' il tipo: «Municipio», «Colosseo»,
       «Duomo». «Il palazzo comunale Municipio» non lo direbbe nessuno. */
    if (n.indexOf(' ') < 0) {
      if (/^[aeiouàèéìòóù]/i.test(n)) return loIl(n) + n;
      return (femminile(n) ? 'la ' : loIl(n)) + n;
    }
    /* «la chiesa DI San Luigi dei Francesi», non «la chiesa San Luigi»:
       davanti a un santo o a un nome proprio ci vuole il «di». */
    var di = /^(San |Sant'|Santa |Santo |Santi |SS\.|Ss\.)/i.test(n) ? 'di ' : '';
    if (/^[aeiouàèéìòóù]/i.test(capo)) return loIl(capo) + capo + ' ' + di + n;
    return (femminile(capo) ? 'la ' : loIl(capo)) + capo + ' ' + di + n;
  }

  /* In italiano la -e finale non dice il genere: «il ponte» ma «la
     cattedrale». Le parole che ci servono sono poche e si contano. */
  var FEMMINE_IN_E = { cattedrale: 1, torre: 1, pieve: 1, corte: 1, croce: 1,
                       valle: 1, fonte: 1, sede: 1, arte: 1, chiese: 1, parte: 1 };
  function femminile(t) {
    var w = String(t || '').toLowerCase();
    if (FEMMINE_IN_E[w]) return true;
    return /(zione|sione|gione|ione|tà|tù|trice|ice)$/.test(w) || /a$/.test(w);
  }
  function loIl(t) {
    /* «lo» va davanti a s+CONSONANTE — sbaglio, scempio, studio — non a
       s+vocale. Nella lista c'era per errore anche la «i», e usciva «lo
       sito mura serviane» (quaderno del 21/10). */
    var w = String(t).toLowerCase();
    /* DAVANTI A VOCALE L'APOSTROFO, e vale per tutt'e due i generi: «il
       edificio» e «la Isola» non si dicono. Trovato il 21/10 guardando
       le descrizioni vere: «il edificio palazzo del Consorzio agrario». */
    if (/^[aeiouàèéìòóù]/.test(w)) return "l'";
    return /^(s[bcdfglmnpqrtv]|z|ps|pn|gn|x|y)/.test(w) ? 'lo ' : 'il ';
  }

  /* QUELLO DENTRO CUI SEI GIA'. Camminando ai Fori l'app ha detto
     «sulla sinistra, a 70 passi, Roma»: Roma non e' una cosa che passi,
     e' il posto dove sei. Lo stesso per il quartiere, la frazione, il
     rione. Si dicono quando si arriva (ed e' un'altra funzione), non
     mentre ci cammini dentro. */
  var CI_SEI_DENTRO = {
    'comune italiano': 1, 'comune': 1, 'quartiere': 1, 'frazione': 1,
    'rione': 1, 'insediamento umano': 1, 'città': 1, 'citta': 1,
    'zona': 1, 'municipio di roma': 1, 'circoscrizione': 1,
    'località': 1, 'contrada': 1, 'regione storica': 1, 'città antica': 1
  };

  /* E IL POSTO NON SI ANNUNCIA DA SOLO. Ai Fori l'app diceva «sulla
     sinistra, a 45 passi, Roma»: l'articolo «Roma» di Wikipedia ha le
     coordinate sul Foro e nei dati e' un «sito archeologico», quindi
     nessun elenco di tipi lo prende. Ma sappiamo in che comune sta
     ogni luogo: se un luogo si chiama come il comune dove sei, non e'
     una cosa che passi — e' il posto dove sei. */
  function siChiamaComeIlPosto(p) {
    if (!p || !p.n || !p.c) return false;
    function osso(t) {
      return String(t).toLowerCase()
        .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
        .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
        .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
    }
    return osso(p.n) === osso(p.c);
  }

  function daRaccontare(p, modo) {
    if (p && CI_SEI_DENTRO[String(p.t || '').toLowerCase()]) return false;
    if (siChiamaComeIlPosto(p)) return false;
    if (!p || !(p.k >= 1)) return false;
    /* in TURISMO un luogo senza scheda non si racconta: «Qui c'è lo
       stadio» a chi e' uscito per vedere l'arte e' rumore. In UTILITA'
       invece e' proprio quello che serve — «davanti hai il municipio, lo
       stadio» — e infatti ci resta. */
    if (modo === 'cultura' && p.senzaScheda) return false;
    return true;
  }
  function primoBuono(intorno, modo) {
    for (var i = 0; i < intorno.length; i++) {
      if (daRaccontare(intorno[i].p, modo)) return intorno[i].p;
    }
    return null;
  }

  /* IL RANGO — e perche' fino al 22/10 non esisteva.
     La regola era «scheda lunga E "cosa vedere"», ma il campo `i` nei dati
     veri non c'e' su NESSUNO dei 20.836 luoghi d'Italia, e il campo `r`
     nemmeno: contati uno per uno, i luoghi di rango 2 erano zero. Cioe'
     tutto quello che dipende dal rango — il raggio piu' largo per le cose
     grandi, la regola di cosa si dice in movimento, quanto in la si
     guarda indietro — era codice che non si accendeva mai.
     Adesso il rango si ricava da quello che i dati HANNO davvero:
     - 3, si vede da lontano: un tipo che e' un punto di riferimento
       (basilica, castello, teatro, museo, sito archeologico...) e una
       scheda che ha qualcosa da dire; oppure alto piu' di trenta metri,
       e allora il tipo non conta.
     - 2, merita un raggio piu' largo: ha una scheda vera.
     - 1, tutto il resto.
     Contati sui dati veri: 995 luoghi di rango 3 su 20.836 (il 4,8%) —
     78 entro un chilometro e due dal centro di Roma, 8 a Lucca, 2 a
     Latina. E' la misura giusta per una cosa che si dice andando in
     macchina. */
  var NOTEVOLI = ['basilica', 'cattedrale', 'duomo', 'castello', 'rocca',
                  'fortezza', 'reggia', 'anfiteatro', 'arena', 'abbazia',
                  'certosa', 'santuario', 'acquedotto', 'obelisco', 'faro',
                  'stadio', 'porta cittadina', 'mura', 'teatro', 'monastero',
                  'sito archeologico', 'torre', 'ponte', 'museo',
                  'parco cittadino'];
  function tipoNotevole(p) {
    var t = String(p.t || '').toLowerCase();
    if (!t) return false;
    for (var i = 0; i < NOTEVOLI.length; i++) {
      if (t.indexOf(NOTEVOLI[i]) === 0 || t.indexOf(' ' + NOTEVOLI[i]) >= 0) return true;
    }
    return false;
  }
  function rango(p) {
    /* IL RANGO STA IN `k`, ED E' LO STESSO DI daRaccontare().
       Qui si leggeva `r`, che nei dati non c'e' in nessuno dei 20.836
       luoghi: due nomi per la stessa cosa, e questa meta' non vedeva
       quello che l'altra usava per decidere se parlare. Risultato: il
       raggio restava quello minimo anche per un duomo. */
    if (p.r) return p.r;
    if (p.k >= 1) return Math.min(3, p.k);
    var quanto = (p.d || '').length;
    if ((p.h || 0) >= 30 || (p.pi || 0) >= 10) return 3;              // alto cosi', lo vedi comunque
    if (tipoNotevole(p) && quanto >= 400) return 3;
    if (quanto >= 240) return 2;
    return 1;
  }
  /* ============================================================
     SI RACCONTA QUELLO CHE PUOI VEDERE DA DOVE SEI
     «Ma quale museo storico di Fiume?» (Vince, 25/10, rifacendo la sua
     camminata). L'app gli aveva detto «davanti a te, a 325 passi,
     Archivio museo storico di Fiume»: duecentotrentacinque metri, una
     palazzina in un quartiere — non la vedi, non sai di cosa parli.
     Il raggio era 240 metri in Turismo, fino a **408** per le cose di
     rango alto. Ma il rango viene dalla LUNGHEZZA DELLA SCHEDA: un posto
     di cui Wikipedia parla molto non e' un posto che si vede da lontano.
     La regola, la stessa del paesaggio: **conta quanto e' grande.** Un
     campanile di quaranta metri lo vedi da trecento; una palazzina no,
     per quanto ne scrivano. Le misure ce le abbiamo (`h` l'altezza, `pi`
     i piani, `l` la larghezza) e dove non ci sono si sta vicini, che e'
     il caso in cui non si sa.
     ============================================================ */
  /* QUANTO E' GRANDE, in metri. Le misure vere prima di tutto; dove non
     ci sono, le dice il TIPO — e non e' un numero a caso: un duomo e'
     grande, una fontana e' piccola, e questo si sa senza misurarlo.
     Serve perche' il raggio non sia un numero deciso a tavolino. */
  var GRANDE_COSI = {
    'cattedrale': 70, 'duomo': 70, 'basilica': 60, 'collegiata': 50,
    'santuario': 45, 'abbazia': 60, 'monastero': 60, 'convento': 50,
    'castello': 70, 'rocca': 60, 'fortezza': 80, 'palazzo': 40,
    'villa': 40, 'teatro': 40, 'museo': 25, 'biblioteca': 25,
    'chiesa': 30, 'cappella': 12, 'oratorio': 15, 'torre': 12,
    'ponte': 30, 'porta cittadina': 15, 'fontana': 6, 'monumento': 8,
    'obelisco': 4, 'statua': 3, 'casa': 15, 'stazione ferroviaria': 50,
    'piazza': 60, 'parco': 120, 'giardino': 60, 'stadio': 150,
    'area archeologica': 150, 'anfiteatro': 100, 'tempio': 40,
    /* LO STADIO OLIMPICO ERA PICCOLO — 29/10/2026. Vince: «sono passato
       davanti allo stadio olimpico e non ne ha parlato». Nei dati c'e',
       col suo testo, ma il tipo e' «impianto di calcio» e qui dentro
       stava solo «stadio»: non combaciava, e un impianto da
       settantamila posti valeva come una palazzina. */
    'impianto di calcio': 150, 'impianto sportivo': 120, 'arena': 100,
    'ippodromo': 150, 'autodromo': 200, 'velodromo': 80,
    'palazzetto dello sport': 60, 'palasport': 60, 'piscina': 40,
    'aeroporto': 300, 'porto': 200, 'acquedotto': 150, 'mura': 200,
    'necropoli': 120, 'terme': 100, 'foro': 150, 'circo': 200,
    'reggia': 100, 'cimitero': 120, 'universita': 80, 'ospedale': 70
  };
  function quantoEGrande(p) {
    if (p.l) return Number(p.l);
    if (p.h) return Number(p.h) * 1.5;            // alto trenta, largo quarantacinque
    if (p.pi) return Number(p.pi) * 4.5;
    var t = String(p.t || '').toLowerCase();
    if (GRANDE_COSI[t]) return GRANDE_COSI[t];
    for (var k in GRANDE_COSI) {
      if (t.indexOf(k) >= 0) return GRANDE_COSI[k];
    }
    /* ultima spiaggia: il rango, quando qualcuno l'ha messo a mano. Vale
       meno delle misure e meno del tipo — e' il nostro giudizio, non un
       dato — ma un luogo segnato come importante non e' una palazzina:
       il Battistero di Parma, nei dati, ha il rango e non le misure. */
    var r = Number(p.r || 0);
    if (r >= 3) return 50;
    if (r === 2) return 30;
    return 20;                                    // non si sa: si sta vicini
  }
  /* ============================================================
     SI RACCONTA QUELLO CHE PUOI VEDERE DA DOVE SEI
     «Ma quale museo storico di Fiume?» (Vince, 25/10, rifacendo la sua
     camminata). L'app gli aveva detto «davanti a te, a 325 passi,
     Archivio museo storico di Fiume»: duecentotrentacinque metri, una
     palazzina in un quartiere — non la vedi, non sai di cosa parli.
     Il raggio era 240 metri in Turismo e fino a **408** per le cose di
     rango alto; ma il rango viene dalla LUNGHEZZA DELLA SCHEDA, e un
     posto di cui Wikipedia parla molto non e' un posto che si vede da
     lontano.
     LA REGOLA E' LA STESSA DEL PAESAGGIO, e vale dappertutto: **una
     cosa si dice se e' grande rispetto a quanto e' lontana**, piu' di un
     ottavo dell'orizzonte. Quindi il raggio e' otto volte la sua
     grandezza: un duomo largo settanta metri si dice da cinquecento, una
     fontana da cinquanta, il museo di via Cippico da duecento — e Vince
     era a duecentotrentacinque.
     ============================================================ */
  /* ---------- IN MACCHINA, SOLO I GRANDI, E DA LONTANO ----------
     29/10, Vince: «in macchina i monumenti grandi si devono sentire
     anche a cinquecento-ottocento metri» — «se sono particolarmente
     importanti».
     Misurato sulla sua traccia: alle 13:05, sul lungotevere Maresciallo
     Diaz a 50 all'ora, lo Stadio Olimpico era a SETTECENTO metri e
     l'app ha taciuto. A piedi settecento metri sono dieci minuti e non
     si dicono; in macchina sono quaranta secondi, e un monumento che
     vedi dal finestrino va nominato.
     Chi e' «particolarmente importante»: rango 3 (3.505 luoghi su
     25.325, il 14%) oppure grande almeno cento metri — lo stadio, il
     foro, le mura, un parco. Tutto il resto, in macchina, tace come
     prima: «deve essere tarata sul camminare sempre» resta vero per i
     palazzi e le chiesette. */
  var LONTANO_IN_MACCHINA = o.lontanoInMacchina || 800;
  var GRANDE_DA_LONTANO = 100;       // metri di larghezza
  function eImportante(p) {
    return rango(p) >= 3 || quantoEGrande(p) >= GRANDE_DA_LONTANO;
  }
  function raggio(p, modo, aPiedi) {
    if (aPiedi === false) {
      /* in macchina: i grandi si sentono da lontano, gli altri niente */
      return eImportante(p) ? LONTANO_IN_MACCHINA : 0;
    }
    var m = quantoEGrande(p) * 8;
    /* IN UTILITA' NON SI STRINGE. «In utilita invece bisogna aumentare le
       descrizioni» (Vince, 25/10): a chi cammina senza vedere serve
       sapere cosa ha intorno PIU' che al turista, non meno. Prima qui
       c'era un meno venti per cento, ed era un'idea mia. */
    return Math.max(50, Math.min(500, Math.round(m)));
  }
  /* FIN DOVE SI GUARDA. Mezzo chilometro, e sta scritto qui dentro — non
     in app.js — perche' chi raccoglie i posti intorno deve guardare
     esattamente fin dove guarda il racconto: scritto in due posti, al
     primo ritocco si scolla. E' gia' successo coi gradini. */
  function finDove(aPiedi) {
    /* in macchina si guarda fino a ottocento metri, perche' li' dentro
       stanno i monumenti grandi che si vedono dal finestrino (lo Stadio
       Olimpico era a 672). A piedi resta mezzo chilometro: oltre, non ci
       vai. Chi raccoglie i posti intorno chiama questa, cosi' guarda
       esattamente fin dove guarda il racconto. */
    return aPiedi === false ? LONTANO_IN_MACCHINA : 500;
  }
  /* QUATTRO PAROLE, NON SETTE. «In Utilità metti avanti, dietro, destra,
     sinistra. Non nord» (Vince, 16/10). «Proprio a destra» e «indietro a
     destra» sembrano precise e invece fanno fermare a pensare: chi
     cammina senza vedere ha bisogno di una parola sola, che il corpo
     esegue senza tradurla. */
  function versoTesto(o) {
    var r = o.rel;
    /* venticinque gradi, non trentacinque: a trenta gradi e ottanta metri
       una cosa è già quaranta metri di lato, e «davanti a te» manderebbe
       una persona a cercarla dritto. La prova lo ha preso al volo. */
    if (Math.abs(r) <= 25) return 'davanti a te';
    if (Math.abs(r) > 145) return 'dietro di te';
    return r > 0 ? 'sulla destra' : 'sulla sinistra';
  }
  /* LA DISTANZA LA DICE UNA PARTE SOLA: parti/distanza.js (7 prove).
     «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
     21/10): ce n'erano quattro, con arrotondamenti diversi, e questa
     diceva i METRI mentre il resto dell'app diceva i passi. */
  /* si PASSA, come dist e verso: in questa cartella le parti non si
     cercano fra loro, se le fa dare. Senza, resta il modo vecchio — piu'
     grezzo, ma nessuno resta muto. */
  var laMisura = o.distanza || null;
  function metri(m) {
    return laMisura ? laMisura.passi(m) : ('a ' + Math.round(m) + ' metri');
  }
  /* camminando si contano i passi, in movimento i metri: la misura segue
     il corpo di chi ascolta, non il numero */
  function quanto(m, aPiedi) {
    if (aPiedi === false && laMisura && laMisura.inMetri) return laMisura.inMetri(m);
    return metri(m);
  }

  /* ancora(): quello che succede quando l'utente dice «ancora». Scende di un
     gradino sul luogo in corso, e se è finito lo dice. */
  /* I GRADINI IN UN POSTO SOLO. Erano scritti due volte — qui e dentro
     prossimo(), nel ramo di chi si ferma dieci secondi — e il 21/10 ne ho
     corretto uno solo: i dati per le descrizioni orientative c'erano,
     la parte produceva la frase giusta, la regola la lasciava passare, e
     l'app diceva lo stesso la voce di Wikipedia, perche' passava
     dall'altra copia. Una copia sola, e non succede piu'. */
  /* ---------- SI DICE DI CHE POSTO SI PARLA ----------
     28/10, via di Santa Maria in Via: Vince si ferma e l'app attacca
     «Il portico è fatto con sedici colonne ioniche vere, prelevate...».
     Il portico DI CHE COSA? E' la scheda di Palazzo Wedekind, che su
     Wikipedia comincia cosi' — e lui: «poi ha iniziato con palazzo
     wekein ma non sapevo dove era».
     Chi vede alza gli occhi e capisce di quale palazzo si parla. Chi non
     vede ha solo la voce: se la prima frase non nomina il posto, il
     posto non esiste. Quindi quando il testo non lo dice, il nome si
     mette davanti; quando lo dice gia' — «La chiesa di Santa Maria in
     Via e' un luogo di culto...» — non si tocca niente. */
  function diceIlNome(p, testo) {
    var n = String((p && p.n) || '');
    if (!n) return true;
    var piatto = String(testo || '').slice(0, 140).toLowerCase();
    var forti = n.toLowerCase()
      .replace(/[^a-zà-ÿ0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 3 && ['chiesa', 'palazzo', 'basilica', 'cappella',
          'oratorio', 'museo', 'teatro', 'villa', 'casa', 'santa', 'santo',
          'della', 'delle', 'degli', 'tempio', 'galleria', 'piazza',
          'complesso', 'istituto'].indexOf(w) < 0;
      });
    if (!forti.length) return piatto.indexOf(n.toLowerCase().split(' ')[0]) >= 0;
    for (var i = 0; i < forti.length; i++) if (piatto.indexOf(forti[i]) >= 0) return true;
    return false;
  }
  function colNomeDavanti(p, testo) {
    if (diceIlNome(p, testo)) return testo;
    return p.n.charAt(0).toUpperCase() + p.n.slice(1) + '. ' + testo;
  }

  function scendiDiUnGradino(p) {
    if (!p) return null;
    var g = gradino[p.n] || 0;
    if (g >= quantiGradini(p)) return { tipo: 'finito', luogo: p, livello: 'guida',
                                        testo: 'Di questo ti ho detto tutto.' };
    gradino[p.n] = g + 1;
    var fatta = comeEFatta(p);
    if (fatta) {
      if (g === 0) return { tipo: 'scheda-orientativa', luogo: p, testo: fatta, livello: 'guida' };
      g = g - 1;             // da qui in poi i gradini sono quelli di sempre
    }
    if (g === 0 && p.d) return { tipo: 'scheda', luogo: p, testo: colNomeDavanti(p, p.d), livello: 'guida' };
    /* E SE LA SCHEDA NON C'E', C'E' QUELLA DEL MINISTERO. 227 luoghi
       hanno la descrizione del Catalogo generale dei Beni Culturali nel
       campo `cf` e l'app non la diceva MAI: `cf` si usava solo dentro
       «com'e' fatta», che pero' esce solo se ci sono le misure (altezza,
       piani, materiali). Senza misure l'app annunciava il posto e al
       primo «ancora» rispondeva «Di questo ti ho detto tutto», con la
       descrizione li' dentro. Sono proprio le chiese e i palazzi di
       paese, quelli che una voce su Wikipedia non ce l'hanno. */
    if (g === 0 && p.cf) return { tipo: 'scheda', luogo: p, testo: colNomeDavanti(p, p.cf), livello: 'guida' };
    if (g === 0) return { tipo: 'finito', luogo: p, livello: 'guida', testo: 'Di questo ti ho detto tutto.' };
    if (g === 1 && p.i) return { tipo: 'cosa-vedere', luogo: p, testo: 'Cosa vedere: ' + p.i, livello: 'guida' };
    /* quanti gradini stanno PRIMA dei capitoli: la scheda, cosa vedere e
       l'approfondimento (com'e' fatta l'ha gia' tolta la riga sopra). */
    var prima = 1 + (p.i ? 1 : 0) + (p.a ? 1 : 0);
    if (p.a && g === prima - 1) {
      return { tipo: 'approfondimento', luogo: p, testo: colNomeDavanti(p, p.a), livello: 'guida' };
    }
    /* I CAPITOLI, uno per «ancora». Si dice anche di COSA parlano: chi
       non vede non ha un indice da guardare, e «la facciata» prima del
       testo e' il modo di sapere dove sei nel racconto. */
    if (p.cap && p.cap.length) {
      var quale = g - prima;
      if (quale >= 0 && quale < p.cap.length) {
        var c = p.cap[quale];
        return { tipo: 'approfondimento', luogo: p, livello: 'guida',
                 testo: c.t ? (c.t.replace(/\.$/, '') + '. ' + c.d) : colNomeDavanti(p, c.d) };
      }
    }
    if (p.a && !p.cap) return { tipo: 'approfondimento', luogo: p, testo: colNomeDavanti(p, p.a), livello: 'guida' };
    return { tipo: 'finito', luogo: p, livello: 'guida', testo: 'Di questo ti ho detto tutto.' };
  }

  function ancora() {
    if (!inCorso) return null;
    return scendiDiUnGradino(inCorso);
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
        if (p.k >= 1 && (p.d || p.a) && intorno[i].m < 260) { inCorso = p; gradino[p.n] = 0; break; }
      }
      if (!inCorso) return { tipo: 'niente', livello: 'guida',
                             testo: 'Qui intorno non ho niente da raccontare.' };
    }
    return ancora();
  }

  function salta() {
    if (inCorso) { detti[inCorso.n] = { quando: ora(), lat: fermoLat, lon: fermoLon }; inCorso = null; }
    /* CHI CHIEDE «VAI OLTRE» VUOLE IL PROSSIMO ADESSO. L'aria fra un
       monumento e l'altro serve a non riempire chi non ha chiesto
       niente; a chi chiede non si fa aspettare mezzo minuto. */
    ultimoCenno = { quando: 0, lat: 0, lon: 0 };
    return { tipo: 'avanti', livello: 'guida', testo: 'Andiamo avanti.' };
  }

  return {
    prossimo: prossimo, ancora: ancora, approfondisci: approfondisci, salta: salta,
    conArticolo: conArticolo,
    /* la chiama anche app.js, nel giro di parole: senza, ogni giro si
       schiantava con «racconto.daRaccontare is not a function» e il
       Turismo restava quasi muto camminando. Non era mai stata
       esportata, e il banco non poteva accorgersene perche' non carica
       app.js: adesso c'e' prove/chiamate.js. */
    daRaccontare: daRaccontare,
    finDove: finDove, rango: rango,
    fermoDaQuanto: fermoDaQuanto,
    inCorso: function () { return inCorso; },
    gradinoDi: function (p) { return gradino[p.n] || 0; },
    dimentica: function () { detti = {}; gradino = {}; fatteCosi = {}; inCorso = null; inCorsoDove = null; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Racconto;
if (typeof window !== 'undefined') window.Racconto = Racconto;
