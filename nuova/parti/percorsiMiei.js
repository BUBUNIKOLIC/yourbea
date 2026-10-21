/* I PERCORSI CHE SI FA LUI — Yourbea, 21/10/2026
   ============================================================
   «Forse per un non vedente può essere utile avere la funzione di segnare
   i percorsi che fa abitualmente: casa, bar, edicola, comune, parenti. E
   se mette in modalità crea percorso…» (Vince, 21/10).
   E poi la frase che spiega perché funziona: «tu hai una griglia fissa e
   lui ha riferimenti precisi».

   PERCHÉ QUESTA È LA COSA PIÙ SICURA CHE ABBIAMO
   Tutto il resto lo prendiamo da OpenStreetMap, che è fatta da volontari:
   un attraversamento può essere stato spostato, tolto, o non esserci mai
   stato. Vince l'ha detto nel modo giusto: «se diciamo che c'è un
   attraversamento pedonale e non c'è, e un non vedente va sotto un'auto?».
   Un percorso registrato no: l'ha camminato lui, e i punti li ha segnati
   lui col bastone in mano. Non stiamo insegnandogli la città — gli stiamo
   ricordando quello che sa già. È l'unico dato di cui siamo sicuri.

   E C'È UNA RAGIONE TECNICA, non solo di fiducia
   In mezzo a una città dobbiamo sapere DOVE SEI, e il GPS sbaglia dai
   dieci ai trenta metri (e ogni tanto molto di più). Su un percorso già
   camminato la domanda è un'altra: non «dove sei» ma «QUANTO HAI
   CAMMINATO». I riferimenti stanno in fila — la panchina, l'attraversamento,
   il portone — e la distanza LUNGO il percorso si misura molto meglio
   della posizione assoluta, perché gli errori si compensano invece di
   sommarsi. Risultato: più uno cammina su una sua strada, più su quella
   strada l'app diventa precisa. È l'opposto di come funziona il resto.

   LE REGOLE:
   1. LO REGISTRA CAMMINANDO, non disegnando su una mappa.
   2. I SEGNI SONO SUOI, con le sue parole: «qui si attraversa», «qui
      finisce il marciapiede», «il portone col gradino».
   3. SEGUENDOLO SI DICE QUANTO MANCA AL PROSSIMO SEGNO, mai «sei qui».
   4. I SUOI SEGNI BATTONO LA MAPPA. Dove lui ha detto «qui si attraversa»,
      vale quello che ha detto lui.
   5. SE SI ESCE DAL PERCORSO LO SI DICE SUBITO, e si dice di quanto: su
      una strada che conosce, tornarci è facile — ma solo se lo sa.
*/

'use strict';

function PercorsiMiei(opzioni) {
  var o = opzioni || {};
  var dist = o.dist;
  var ora = o.ora || function () { return Date.now(); };
  var PASSO = 0.75;
  var PASSO_MINIMO = o.passoMinimo || 6;     // sotto, è il GPS che balla
  var FUORI = o.fuori || 30;                 // REGOLA 5: oltre, sei fuori strada
  var VICINO = o.vicino || 25;               // un segno è "raggiunto" entro questo

  var tutti = [];
  var inRegistrazione = null;
  var inCorso = null;                        // { percorso, quale, avvisato }

  function passi(m) {
    var p = Math.round(m / PASSO / 5) * 5;
    if (p <= 5) return 'pochi passi';
    return p + ' passi';
  }

  function lungo(punti) {
    var t = 0;
    for (var i = 1; i < punti.length; i++) {
      t += dist(punti[i - 1][0], punti[i - 1][1], punti[i][0], punti[i][1]);
    }
    return t;
  }

  /* ---------- REGISTRARE ---------- */

  function comincia(nome, qui) {
    inRegistrazione = { nome: String(nome || '').trim(), punti: [[qui.lat, qui.lon]],
                        segni: [], quando: ora() };
    return { tipo: 'percorso-inizio', livello: 'guida',
             testo: 'Registro il percorso' + (inRegistrazione.nome ? ' per ' + inRegistrazione.nome : '') +
                    '. Cammina come fai di solito. Quando passi in un punto che conta, dimmi «segna qui» e cosa c\'è. Alla fine dimmi «ho finito».' };
  }

  function staRegistrando() { return !!inRegistrazione; }

  /* passo(): un punto nuovo, se ci si è mossi davvero. REGOLA 1. */
  function passo(qui) {
    if (!inRegistrazione) return null;
    var p = inRegistrazione.punti;
    var ultimo = p[p.length - 1];
    if (dist(ultimo[0], ultimo[1], qui.lat, qui.lon) < PASSO_MINIMO) return null;
    p.push([qui.lat, qui.lon]);
    return null;
  }

  /* segna(): un riferimento suo, con le sue parole. REGOLA 2. */
  function segna(qui, nota) {
    if (!inRegistrazione) return null;
    var p = inRegistrazione.punti;
    var ultimo = p[p.length - 1];
    if (dist(ultimo[0], ultimo[1], qui.lat, qui.lon) > 1) p.push([qui.lat, qui.lon]);
    var quanto = lungo(p);
    var testo = String(nota || '').trim();
    inRegistrazione.segni.push({ lat: qui.lat, lon: qui.lon, da: quanto, n: testo });
    return { tipo: 'percorso-segno', livello: 'guida',
             testo: testo ? ('Segnato: ' + testo + '.') : 'Segnato.' };
  }

  function finisci(nome) {
    if (!inRegistrazione) return null;
    var p = inRegistrazione;
    inRegistrazione = null;
    if (p.punti.length < 3) {
      return { tipo: 'percorso-corto', livello: 'guida',
               testo: 'Troppo corto: non ho registrato niente. Riprova camminando tutto il percorso.' };
    }
    p.nome = String(nome || p.nome || '').trim();
    p.metri = Math.round(lungo(p.punti));
    tutti.push(p);
    return { tipo: 'percorso-fatto', livello: 'guida', percorso: p,
             testo: 'Percorso' + (p.nome ? ' per ' + p.nome : '') + ' registrato: ' +
                    passi(p.metri) + ', ' + p.segni.length +
                    (p.segni.length === 1 ? ' punto segnato' : ' punti segnati') +
                    '. Quando vuoi, dimmi «portami' + (p.nome ? ' ' + aPosto(p.nome) : ' lì') + '».' };
  }

  function aPosto(n) {
    var t = String(n).toLowerCase();
    if (/^(dal|dalla|al|alla|allo|ai|in|a) /.test(t)) return t;
    if (/^(medico|dentista|parrucchiere|barbiere)/.test(t)) return 'dal ' + t;
    /* «alla edicola» non si dice: davanti a una vocale l'articolo si
       taglia — all'edicola, all'ospedale. */
    if (/^[aeiou]/.test(t)) return "all'" + t;
    if (/^(farmacia|posta|chiesa|fermata|stazione|banca|scuola)/.test(t)) return 'alla ' + t;
    if (/^(bar|comune|mercato|supermercato|ospedale)/.test(t)) return 'al ' + t;
    return 'a ' + t;
  }

  /* ---------- SEGUIRE ---------- */

  function trova(nome) {
    var t = normalizza(nome);
    if (!t) return null;
    for (var i = 0; i < tutti.length; i++) {
      var n = normalizza(tutti[i].nome);
      if (n && (n === t || n.indexOf(t) >= 0 || t.indexOf(n) >= 0)) return tutti[i];
    }
    return null;
  }

  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u')
      .replace(/\b(dal|dalla|al|alla|allo|ai|alle|in|a|il|la|lo|i|le)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function segui(percorso, qui) {
    if (!percorso) return null;
    inCorso = { percorso: percorso, fatti: {}, fuoriDa: 0 };
    var d = dovunqueSiaSulPercorso(percorso, qui);
    var manca = Math.max(0, percorso.metri - d.quanto);
    var primo = prossimoSegno(percorso, d.quanto);
    return { tipo: 'percorso-parto', livello: 'guida', percorso: percorso,
             testo: 'Andiamo' + (percorso.nome ? ' ' + aPosto(percorso.nome) : '') + '. ' +
                    passi(manca) + ' in tutto.' +
                    (primo ? ' Il primo punto è ' + (primo.n || 'un tuo segno') + ', fra ' + passi(primo.da - d.quanto) + '.' : '') };
  }

  /* dovunqueSiaSulPercorso(): QUANTO hai camminato, non dove sei.
     Si cerca il pezzo di percorso più vicino e si somma quello che c'è
     prima: è la misura che regge l'errore del GPS (REGOLA tecnica). */
  function dovunqueSiaSulPercorso(percorso, qui) {
    var p = percorso.punti;
    var mig = 0, dmin = Infinity, quanto = 0, somma = 0;
    for (var i = 1; i < p.length; i++) {
      var d = dist(qui.lat, qui.lon, p[i][0], p[i][1]);
      somma += dist(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]);
      if (d < dmin) { dmin = d; mig = i; quanto = somma; }
    }
    return { quanto: quanto, scarto: dmin, dove: mig };
  }

  function prossimoSegno(percorso, quanto) {
    var mig = null;
    (percorso.segni || []).forEach(function (s) {
      if (s.da <= quanto + 2) return;
      if (!mig || s.da < mig.da) mig = s;
    });
    return mig;
  }

  /* passoSuPercorso(): cosa dire mentre lo segue. REGOLA 3 e 5. */
  function passoSuPercorso(qui, adesso) {
    if (!inCorso) return null;
    var percorso = inCorso.percorso;
    var d = dovunqueSiaSulPercorso(percorso, qui);

    /* REGOLA 5: fuori dal percorso */
    if (d.scarto > FUORI) {
      if (!inCorso.fuoriDa) inCorso.fuoriDa = adesso;
      if (adesso - inCorso.fuoriDa > 12000) {
        inCorso.fuoriDa = adesso;
        return { tipo: 'percorso-fuori', livello: 'guida',
                 testo: 'Ti sei allontanato di ' + Math.round(d.scarto) + ' metri dal percorso che conosci.' };
      }
      return null;
    }
    inCorso.fuoriDa = 0;

    /* sei arrivato? */
    if (percorso.metri - d.quanto < VICINO) {
      if (inCorso.fatti['arrivato']) return null;
      inCorso.fatti['arrivato'] = true;
      var f = (percorso.segni || [])[percorso.segni.length - 1];
      return { tipo: 'percorso-arrivato', livello: 'guida',
               testo: 'Ci siamo' + (percorso.nome ? ': ' + percorso.nome : '') + '.' +
                      (f && f.n ? ' ' + capo(f.n) + '.' : '') };
    }

    /* REGOLA 3: quanto manca al prossimo segno, mai «sei qui».
       E il segno su cui si e' ARRIVATI non va escluso: cercandolo come
       «quello che viene dopo» spariva proprio nell'istante in cui ci si
       arriva, e non lo diceva mai. Si guarda da due metri PRIMA del punto
       in poi, cosi' il segno resta finche' non lo si e' passato davvero. */
    var s = prossimoSegno(percorso, d.quanto - VICINO);
    if (!s) return null;
    var manca = s.da - d.quanto;
    var k = 's' + Math.round(s.da);
    if (manca <= VICINO && !inCorso.fatti[k]) {
      inCorso.fatti[k] = true;
      return { tipo: 'percorso-segno', livello: 'guida', avviso: true,
               testo: capo(s.n || 'il tuo segno') + '.' };
    }
    if (manca <= 60 && !inCorso.fatti['av' + k]) {
      inCorso.fatti['av' + k] = true;
      return { tipo: 'percorso-prossimo', livello: 'guida',
               testo: 'Fra ' + passi(manca) + ', ' + (s.n || 'il tuo segno') + '.' };
    }
    return null;
  }

  /* ============================================================
     AGGIUNGERE RIFERIMENTI A UN PERCORSO GIÀ FATTO
     «Ed è possibile aggiungere riferimenti?» (Vince, 21/10). Sì, e deve
     esserlo: un percorso non si finisce di conoscere la prima volta che lo
     si cammina. La seconda uno si accorge del palo, la terza che dopo la
     panchina c'è il gradino. Così il percorso migliora ogni volta che lo
     si fa — che è poi la ragione per cui questa idea batte la mappa: la
     mappa resta ferma, questo impara.
     Il segno si aggancia a QUANTO HAI CAMMINATO, non alle coordinate: se
     il GPS sbaglia di dieci metri di lato, il punto lungo il percorso
     resta giusto lo stesso. */
  function aggiungiSegno(qui, nota) {
    if (!inCorso) return null;
    var percorso = inCorso.percorso;
    var d = dovunqueSiaSulPercorso(percorso, qui);
    var testo = String(nota || '').trim();
    /* se c'e' gia' un segno a pochi passi, si sostituisce invece di
       accatastarne due: la seconda volta uno lo dice meglio. */
    var vicinoC = null;
    (percorso.segni || []).forEach(function (x) {
      if (Math.abs(x.da - d.quanto) < 12) vicinoC = x;
    });
    if (vicinoC) {
      var prima = vicinoC.n;
      vicinoC.n = testo || vicinoC.n;
      vicinoC.lat = qui.lat; vicinoC.lon = qui.lon; vicinoC.da = d.quanto;
      return { tipo: 'percorso-segno', livello: 'guida', cambiato: true,
               testo: 'Cambiato: qui adesso c\'è ' + (testo || prima) + '.' };
    }
    percorso.segni.push({ lat: qui.lat, lon: qui.lon, da: d.quanto, n: testo });
    percorso.segni.sort(function (a, b) { return a.da - b.da; });
    /* e non si ridice subito quello appena messo */
    inCorso.fatti['s' + Math.round(d.quanto)] = true;
    inCorso.fatti['avs' + Math.round(d.quanto)] = true;
    return { tipo: 'percorso-segno', livello: 'guida',
             testo: 'Segnato' + (testo ? ': ' + testo : '') + '. Adesso questo percorso ha ' +
                    percorso.segni.length + (percorso.segni.length === 1 ? ' punto.' : ' punti.') };
  }

  /* toglieSegno(): le cose cambiano — una panchina si toglie, un cantiere
     finisce. Chi ha messo un segno dev'essere capace di toglierlo. */
  function toglieSegno(qui) {
    if (!inCorso) return null;
    var percorso = inCorso.percorso;
    var d = dovunqueSiaSulPercorso(percorso, qui);
    var quale = null;
    (percorso.segni || []).forEach(function (x) {
      if (Math.abs(x.da - d.quanto) < 20) quale = x;
    });
    if (!quale) {
      return { tipo: 'percorso-niente', livello: 'guida',
               testo: 'Qui non avevi segnato niente.' };
    }
    percorso.segni = percorso.segni.filter(function (x) { return x !== quale; });
    return { tipo: 'percorso-tolto', livello: 'guida',
             testo: 'Tolto' + (quale.n ? ': ' + quale.n : '') + '.' };
  }

  function capo(t) { return String(t).charAt(0).toUpperCase() + String(t).slice(1); }
  function smetti() { inCorso = null; }
  function sto() { return inCorso ? inCorso.percorso : null; }

  /* ============================================================
     MANDARE UN PERCORSO A UN'ALTRA PERSONA
     «Il passo successivo sarà fare una mappa dove tutti i non vedenti
     potranno aggiungere posti, con un server — ma vediamo se i comuni
     vogliono farlo» (Vince, 21/10).
     Giusto l'ordine, e intanto c'e' un passo che costa zero: un percorso
     diventa un LINK. Un volontario dell'UICI registra la strada dalla
     fermata alla sede e la manda ai soci su WhatsApp; loro aprono il link
     e ce l'hanno. Nessun server da pagare, nessun dato di nessuno su una
     macchina nostra, e funziona domani.
     Il link dev'essere corto: WhatsApp e la posta tagliano quelli lunghi.
     Quindi la linea si assottiglia — un punto ogni quindici metri basta
     per ritrovare la strada — mentre i SEGNI si tengono tutti, perche'
     sono la cosa che conta. */
  function perMandare(percorso) {
    if (!percorso) return '';
    var p = percorso.punti || [];
    var magri = [];
    var ultimo = null;
    for (var i = 0; i < p.length; i++) {
      if (!ultimo || i === p.length - 1 || dist(ultimo[0], ultimo[1], p[i][0], p[i][1]) > 15) {
        magri.push([Math.round(p[i][0] * 100000), Math.round(p[i][1] * 100000)]);
        ultimo = p[i];
      }
    }
    /* differenze invece di numeri interi: un punto a quindici metri dal
       precedente sta in tre cifre invece che in sette */
    var fila = [];
    for (var j = 0; j < magri.length; j++) {
      fila.push(j === 0 ? magri[j] : [magri[j][0] - magri[j - 1][0], magri[j][1] - magri[j - 1][1]]);
    }
    return JSON.stringify({
      v: 1, n: percorso.nome || '', m: Math.round(percorso.metri || 0), l: fila,
      s: (percorso.segni || []).map(function (x) {
        return [Math.round(x.da), x.n || ''];
      })
    });
  }

  /* daUnLink(): il percorso che arriva da un'altra persona. */
  function daUnLink(testo) {
    var d;
    try { d = JSON.parse(testo); } catch (e) { return null; }
    if (!d || d.v !== 1 || !d.l || d.l.length < 2) return null;
    var punti = [];
    var la = 0, lo = 0;
    for (var i = 0; i < d.l.length; i++) {
      if (i === 0) { la = d.l[i][0]; lo = d.l[i][1]; }
      else { la += d.l[i][0]; lo += d.l[i][1]; }
      punti.push([la / 100000, lo / 100000]);
    }
    var percorso = {
      nome: String(d.n || '').slice(0, 60), punti: punti,
      metri: d.m || Math.round(lungo(punti)), quando: ora(), daAltri: true,
      segni: (d.s || []).map(function (x) {
        return { da: x[0], n: String(x[1] || '').slice(0, 80),
                 lat: puntoA(punti, x[0])[0], lon: puntoA(punti, x[0])[1] };
      })
    };
    return percorso;
  }

  /* puntoA(): dove si trova, sulla linea, una certa distanza percorsa.
     Serve perche' nel link i segni viaggiano come «al metro 120», che e'
     piu' corto e piu' robusto di due coordinate. */
  function puntoA(punti, quanto) {
    var somma = 0;
    for (var i = 1; i < punti.length; i++) {
      var d = dist(punti[i - 1][0], punti[i - 1][1], punti[i][0], punti[i][1]);
      if (somma + d >= quanto) return punti[i];
      somma += d;
    }
    return punti[punti.length - 1];
  }

  function aggiungi(percorso) {
    if (!percorso || !percorso.punti || percorso.punti.length < 3) return false;
    /* se ce n'e' gia' uno con quel nome, il nuovo prende un seguito */
    if (trova(percorso.nome)) percorso.nome = percorso.nome + ' (ricevuto)';
    tutti.push(percorso);
    return true;
  }

  function carica(roba) { tutti = (roba || []).filter(function (p) { return p && p.punti && p.punti.length > 2; }); return tutti.length; }
  function elenco() { return tutti.map(function (p) { return { nome: p.nome, metri: p.metri, segni: (p.segni || []).length }; }); }
  function perSalvare() { return tutti; }
  function butta(nome) {
    var p = trova(nome);
    if (!p) return false;
    tutti = tutti.filter(function (x) { return x !== p; });
    return true;
  }

  return { comincia: comincia, staRegistrando: staRegistrando, passo: passo,
           aggiungiSegno: aggiungiSegno, toglieSegno: toglieSegno,
           segna: segna, finisci: finisci, trova: trova, segui: segui,
           passoSuPercorso: passoSuPercorso, smetti: smetti, sto: sto,
           perMandare: perMandare, daUnLink: daUnLink, aggiungi: aggiungi,
           carica: carica, elenco: elenco, perSalvare: perSalvare, butta: butta,
           aPosto: aPosto };
}

if (typeof module !== 'undefined' && module.exports) module.exports = PercorsiMiei;
if (typeof window !== 'undefined') window.PercorsiMiei = PercorsiMiei;
