/* LE PROVE DEI PERCORSI SUOI — nuova Yourbea
   «Forse per un non vedente può essere utile segnare i percorsi che fa
   abitualmente: casa, bar, edicola, comune, parenti… qui ho la panchina,
   qui c'è un attraversamento» (Vince, 21/10).
   «Penso sia la migliore idea che ho avuto per ovviare al problema» — e il
   problema era: se diciamo che c'è un attraversamento e non c'è?
   Si lancia:  node nuova/prove/percorsiMiei.js                           */

'use strict';
const Distanza = require('../parti/distanza.js');
const LADISTANZA = Distanza({});
const PercorsiMiei = require('../parti/percorsiMiei.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
function dist(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const a = Math.sin((la2 - la1) * r / 2) ** 2 +
            Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function mondo() {
  let adesso = 1000000;
  const p = PercorsiMiei({ distanza: LADISTANZA,  dist, ora: () => adesso });
  return { p, passano(ms) { adesso += ms; }, quando: () => adesso };
}
/* una camminata vera: duecento metri verso nord, un punto ogni dieci */
const CASA = { lat: 41.82315, lon: 12.48142 };
function avanti(n) { return { lat: CASA.lat + n * 0.00009, lon: CASA.lon }; }

function registraIlPercorso(w, segni) {
  w.p.comincia('edicola', CASA);
  for (let i = 1; i <= 22; i++) {
    const q = avanti(i);
    w.p.passo(q);
    const s = (segni || []).find((x) => x.a === i);
    if (s) w.p.segna(q, s.n);
  }
  return w.p.finisci();
}

prova('SI REGISTRA CAMMINANDO, coi suoi segni e le sue parole', () => {
  const w = mondo();
  const d = registraIlPercorso(w, [{ a: 8, n: 'qui ho la panchina' }, { a: 16, n: 'qui c\'è un attraversamento' }]);
  if (!d || d.tipo !== 'percorso-fatto') { guasto('non ha registrato: ' + JSON.stringify(d)); return; }
  if (d.percorso.segni.length !== 2) guasto('i segni erano due');
  if (d.percorso.segni[0].n !== 'qui ho la panchina') guasto('le parole sono sue, non nostre');
  if (!/2 punti segnati/.test(d.testo)) guasto('dice male: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('UN PERCORSO TROPPO CORTO non si salva: non e un percorso', () => {
  const w = mondo();
  w.p.comincia('niente', CASA);
  const d = w.p.finisci();
  if (!d || d.tipo !== 'percorso-corto') guasto('due passi non sono un percorso: ' + JSON.stringify(d));
});

prova('SEGUENDOLO dice QUANTO MANCA al prossimo segno, mai «sei qui»', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'qui ho la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  /* a metà strada dalla panchina */
  const d = w.p.passoSuPercorso(avanti(3), w.quando());
  if (!d) { guasto('deve dire quanto manca'); return; }
  if (/sei (in|qui|al)/i.test(d.testo)) guasto('non deve dire dove sei: ' + d.testo);
  if (!/^Fra \d+ passi, qui ho la panchina/.test(d.testo)) guasto('dice male: ' + d.testo);
  console.log('      → ' + d.testo);
});

prova('ARRIVATO AL SEGNO lo dice con le sue parole', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'qui c\'è un attraversamento' }]);
  w.p.segui(fatto.percorso, CASA);
  w.p.passoSuPercorso(avanti(3), w.quando());      // l'avviso da lontano
  const d = w.p.passoSuPercorso(avanti(8), w.quando());
  if (!d) { guasto('arrivati al segno, si dice'); return; }
  if (!/attraversamento/.test(d.testo)) guasto('dice male: ' + d.testo);
  if (!d.avviso) guasto('un segno suo è un avviso: non si spegne e non aspetta');
});

prova('LO STESSO SEGNO non si ripete camminandoci dentro', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  let quante = 0;
  for (let i = 1; i <= 12; i++) {
    const d = w.p.passoSuPercorso(avanti(i), w.quando());
    if (d && /panchina/.test(d.testo)) quante++;
    w.passano(4000);
  }
  if (quante > 2) guasto('ha ripetuto la panchina ' + quante + ' volte');
});

prova('FUORI DAL PERCORSO lo dice, e dice di quanto', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  const lontano = { lat: CASA.lat + 0.0005, lon: CASA.lon + 0.0012 };
  w.p.passoSuPercorso(lontano, w.quando());
  w.passano(20000);
  const d = w.p.passoSuPercorso(lontano, w.quando());
  if (!d) { guasto('deve accorgersene'); return; }
  if (!/allontanato di \d+ metri/.test(d.testo)) guasto('dice male: ' + d.testo);
});

prova('ARRIVATI, lo dice una volta sola', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, []);
  w.p.segui(fatto.percorso, CASA);
  const d = w.p.passoSuPercorso(avanti(22), w.quando());
  if (!d || d.tipo !== 'percorso-arrivato') { guasto('arrivati: ' + JSON.stringify(d)); return; }
  w.passano(5000);
  if (w.p.passoSuPercorso(avanti(22), w.quando())) guasto('lo ha ridetto');
});

prova('SI RITROVA COL NOME, anche detto in un altro modo', () => {
  const w = mondo();
  registraIlPercorso(w, []);
  if (!w.p.trova('edicola')) guasto('«edicola»');
  if (!w.p.trova("all'edicola")) guasto('«all\'edicola»');
  if (!w.p.trova('Edicola')) guasto('con la maiuscola');
  if (w.p.trova('farmacia')) guasto('ha trovato un percorso che non c\'è');
});

prova('LA MISURA E QUANTO HAI CAMMINATO, non dove sei', () => {
  /* è la ragione tecnica per cui questo funziona dove il resto sbaglia:
     scostandosi di dodici metri di lato — un errore GPS normale — il
     conto lungo il percorso non si sposta quasi */
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 14, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  /* a nove passi dalla panchina, ma dodici metri di lato */
  const sbandato = { lat: avanti(10).lat, lon: avanti(10).lon + 0.00014 };
  const d = w.p.passoSuPercorso(sbandato, w.quando());
  if (!d) { guasto('con dodici metri di scarto deve ancora funzionare'); return; }
  if (!/Fra \d+ passi, la panchina/.test(d.testo)) guasto('si è perso per dodici metri: ' + d.testo);
});

prova('si salvano e si ricaricano', () => {
  const w = mondo();
  registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  const roba = JSON.parse(JSON.stringify(w.p.perSalvare()));
  const w2 = mondo();
  if (w2.p.carica(roba) !== 1) guasto('non si è ricaricato');
  if (!w2.p.trova('edicola')) guasto('il nome si è perso');
});

/* AGGIUNGERE RIFERIMENTI A UN PERCORSO GIÀ FATTO — «ed è possibile
   aggiungere riferimenti?» (Vince, 21/10). La seconda volta uno si accorge
   del palo, la terza del gradino: il percorso impara, la mappa no.      */
prova('SI AGGIUNGE UN SEGNO mentre si cammina un percorso gia fatto', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  const d = w.p.aggiungiSegno(avanti(15), 'il palo della luce');
  if (!d) { guasto('deve poterlo aggiungere'); return; }
  if (!/2 punti/.test(d.testo)) guasto('dice male: ' + d.testo);
  if (fatto.percorso.segni.length !== 2) guasto('non l ha aggiunto');
  if (fatto.percorso.segni[1].n !== 'il palo della luce') guasto('le parole sono sue');
  console.log('      → ' + d.testo);
});

prova('un segno nuovo A DUE PASSI da uno vecchio lo SOSTITUISCE', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'una panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  const d = w.p.aggiungiSegno(avanti(8), 'la panchina col cestino');
  if (fatto.percorso.segni.length !== 1) guasto('non deve accatastarne due');
  if (fatto.percorso.segni[0].n !== 'la panchina col cestino') guasto('la seconda volta lo dice meglio');
  if (!/Cambiato/.test(d.testo)) guasto('deve dire che ha cambiato: ' + d.testo);
});

prova('IL SEGNO APPENA MESSO non si ridice subito', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, []);
  w.p.segui(fatto.percorso, CASA);
  w.p.aggiungiSegno(avanti(10), 'il palo');
  const d = w.p.passoSuPercorso(avanti(10), w.quando());
  if (d && /palo/.test(d.testo)) guasto('lo ha ridetto subito dopo averlo messo');
});

prova('SI TOGLIE un segno che non c e piu', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, [{ a: 8, n: 'la panchina' }]);
  w.p.segui(fatto.percorso, CASA);
  const d = w.p.toglieSegno(avanti(8));
  if (!d || !/Tolto/.test(d.testo)) guasto('deve poterlo togliere: ' + JSON.stringify(d));
  if (fatto.percorso.segni.length !== 0) guasto('non l ha tolto');
});

prova('togliere dove non c era niente lo dice, e non scoppia', () => {
  const w = mondo();
  const fatto = registraIlPercorso(w, []);
  w.p.segui(fatto.percorso, CASA);
  const d = w.p.toglieSegno(avanti(5));
  if (!d || !/non avevi segnato/.test(d.testo)) guasto('dice male: ' + JSON.stringify(d));
});

/* ---------- TUTTO A VOCE ----------
   «Rendi agevole creare un percorso e condividerlo, ma tutto vocalmente»
   (Vince, 21/10). Le parole stanno qui, dove si provano: in app.js c'erano
   quattro espressioni scritte a mano, e una — «manda il percorso del
   medico a Lucia» — metteva «medico a lucia» nel nome del percorso e non
   capiva a chi mandarlo. */

prova('«crea percorso per il medico»: capisce che si comincia, e come si chiama', () => {
  const p = mondo().p;
  const d = p.dallaVoce('crea percorso per il medico');
  if (!d || d.cosa !== 'crea') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && d.nome !== 'medico') guasto('nome storto: ' + JSON.stringify(d && d.nome));
});

prova('«crea percorso» da solo: il nome non c e, e si deve poter chiedere', () => {
  const p = mondo().p;
  const d = p.dallaVoce('crea percorso');
  if (!d || d.cosa !== 'crea') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && d.nome) guasto('si e inventato un nome: ' + d.nome);
});

prova('«registra la strada della farmacia» vale come «crea percorso»', () => {
  const p = mondo().p;
  const d = p.dallaVoce('registra la strada della farmacia');
  if (!d || d.cosa !== 'crea') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && d.nome !== 'farmacia') guasto('nome storto: ' + JSON.stringify(d && d.nome));
});

prova('«qui ho la panchina»: e un segno, con le parole sue', () => {
  const p = mondo().p;
  const d = p.dallaVoce('qui ho la panchina');
  if (!d || d.cosa !== 'segna') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && !/panchina/.test(d.nota)) guasto('ha perso le parole: ' + JSON.stringify(d && d.nota));
});

prova('«ho finito» chiude il percorso', () => {
  const p = mondo().p;
  ['ho finito', 'finito', 'siamo arrivati', 'basta cosi'].forEach((f) => {
    const d = p.dallaVoce(f);
    if (!d || d.cosa !== 'finito') guasto('«' + f + '» non chiude: ' + JSON.stringify(d));
  });
});

prova('«manda il percorso del medico a Lucia»: il percorso e il medico, la persona e Lucia', () => {
  const p = mondo().p;
  const d = p.dallaVoce('manda il percorso del medico a Lucia');
  if (!d || d.cosa !== 'manda') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && d.quale !== 'medico') guasto('percorso storto: ' + JSON.stringify(d && d.quale));
  if (d && d.a !== 'Lucia') guasto('persona storta: ' + JSON.stringify(d && d.a));
});

prova('«condividi il percorso con mia sorella»: anche «con» vale', () => {
  const p = mondo().p;
  const d = p.dallaVoce('condividi il percorso con mia sorella');
  if (!d || d.cosa !== 'manda') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && d.a !== 'mia sorella') guasto('persona storta: ' + JSON.stringify(d && d.a));
});

prova('«manda il percorso» senza dire a chi: non si inventa nessuno', () => {
  const p = mondo().p;
  const d = p.dallaVoce('manda il percorso');
  if (!d || d.cosa !== 'manda') guasto('non ha capito: ' + JSON.stringify(d));
  if (d && d.a) guasto('si e inventato una persona: ' + d.a);
});

prova('«manda un messaggio a Lucia» NON e un percorso', () => {
  const p = mondo().p;
  const d = p.dallaVoce('manda un messaggio a Lucia');
  if (d && d.cosa === 'manda') guasto('ha scambiato un messaggio per un percorso');
});

prova('«portami a casa» NON tocca i percorsi', () => {
  const p = mondo().p;
  ['portami a casa', 'dove sono', 'che ora e', 'accendi il faro'].forEach((f) => {
    const d = p.dallaVoce(f);
    if (d) guasto('«' + f + '» si e preso un comando che non e suo: ' + JSON.stringify(d));
  });
});

prova('«che percorsi ho» chiede l elenco', () => {
  const p = mondo().p;
  const d = p.dallaVoce('che percorsi ho');
  if (!d || d.cosa !== 'elenco') guasto('non ha capito: ' + JSON.stringify(d));
});

prova('il nome detto dopo, quando lo chiediamo, si tiene come e', () => {
  const w = mondo();
  w.p.comincia('', CASA);
  for (let i = 1; i <= 22; i++) w.p.passo(avanti(i));
  const d = w.p.finisci('dal dentista');
  if (d && d.percorso && d.percorso.nome !== 'dal dentista') guasto('nome perso: ' + JSON.stringify(d && d.percorso && d.percorso.nome));
  if (!w.p.trova('dentista')) guasto('col nome dato dopo non lo ritrova piu');
});

/* ==================== MANDARE UN PERCORSO A QUALCUNO ====================
   «Rendi agevole creare un percorso e condividerlo» (Vince, 21/10). Il
   codice c'era dal 21 e non aveva una prova: il 22/10, misurandolo, un
   percorso di due chilometri faceva un indirizzo WhatsApp di 3.400
   caratteri e uno di cinque chilometri 8.000 — WhatsApp e Safari a quelle
   lunghezze l'indirizzo lo tagliano, e il percorso parte e non arriva. */

/* una camminata per la citta: dritto, gira, dritto, gira */
function perLaCitta(metriTot) {
  const punti = [];
  let lat = 41.9028, lon = 12.4964, dir = 0;
  const g = 6 / 111320;
  for (let d = 0; d < metriTot; d += 6) {
    if (d % 300 < 6) dir = (dir + 1) % 4;
    if (dir === 0) lat += g; else if (dir === 1) lon += g * 1.34;
    else if (dir === 2) lat -= g; else lon -= g * 1.34;
    punti.push([lat, lon]);
  }
  return { nome: 'dal medico', metri: metriTot, punti,
           segni: [{ da: 120, n: 'il semaforo' }, { da: metriTot - 20, n: 'il portone' }] };
}
/* quanto un punto e lontano dalla linea del percorso rifatto */
function scartoDa(punti, q) {
  let m = 1e9;
  for (let i = 0; i < punti.length - 1; i++) {
    const a = punti[i], b = punti[i + 1];
    const L = dist(a[0], a[1], b[0], b[1]);
    let t = 0;
    if (L > 0.5) {
      t = (((q[0] - a[0]) * (b[0] - a[0])) + ((q[1] - a[1]) * (b[1] - a[1]) * 0.56)) /
          (((b[0] - a[0]) * (b[0] - a[0])) + ((b[1] - a[1]) * (b[1] - a[1]) * 0.56));
      t = Math.max(0, Math.min(1, t));
    }
    m = Math.min(m, dist(q[0], q[1], a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
  }
  return m;
}

prova('IL PERCORSO MANDATO STA IN UN INDIRIZZO CHE WhatsApp apre davvero', () => {
  const w = mondo();
  for (const km of [0.5, 1, 2, 5]) {
    const p = perLaCitta(km * 1000);
    const dati = w.p.perMandare(p);
    const b64 = Buffer.from(dati, 'utf8').toString('base64');
    const link = 'https://bubunikolic.github.io/yourbea/nuova/?p=' + encodeURIComponent(b64);
    const wa = 'https://wa.me/393331234567?text=' +
               encodeURIComponent('Il percorso per andare dal medico, da Yourbea. Apri questo link: ' + link);
    if (wa.length > 2000) guasto(km + ' km fa un indirizzo di ' + wa.length + ' caratteri: WhatsApp lo taglia');
    else if (km === 5) console.log('      → cinque chilometri in ' + wa.length + ' caratteri');
  }
});

prova('E LA FORMA RESTA QUELLA CAMMINATA: nessuno si sente «fuori percorso»', () => {
  /* buttare i punti per accorciare il link taglia le curve, e chi segue il
     percorso si sente dire «ti sei allontanato» stando sul marciapiede
     giusto: fuori strada e a trenta metri. */
  const w = mondo();
  const p = perLaCitta(2000);
  const rifatto = w.p.daUnLink(w.p.perMandare(p));
  if (!rifatto) { guasto('il percorso non si e rifatto dal link'); return; }
  let peggio = 0;
  for (const q of p.punti) peggio = Math.max(peggio, scartoDa(rifatto.punti, q));
  if (peggio > 15) guasto('la linea rifatta si scosta di ' + Math.round(peggio) + ' metri: fuori strada e a 30');
  else console.log('      → al massimo ' + Math.round(peggio) + ' metri dalla strada camminata');
});

prova('IL NOME E I SEGNI ARRIVANO DALL ALTRA PARTE', () => {
  const w = mondo();
  const p = perLaCitta(1000);
  const rifatto = w.p.daUnLink(w.p.perMandare(p));
  if (!rifatto) { guasto('niente percorso dal link'); return; }
  if (rifatto.nome !== 'dal medico') guasto('il nome si e perso: ' + rifatto.nome);
  if ((rifatto.segni || []).length !== 2) guasto('i segni erano 2, ne sono arrivati ' + (rifatto.segni || []).length);
  else if (rifatto.segni[0].n !== 'il semaforo') guasto('il primo segno e cambiato: ' + rifatto.segni[0].n);
  if (!rifatto.daAltri) guasto('non si vede che e di un altro');
});

prova('UN LINK ROTTO NON FA ESPLODERE NIENTE', () => {
  const w = mondo();
  for (const brutto of ['', 'abc', '{}', '{"v":2}', '{"v":1,"l":[]}', '{"v":1,"l":[[1,2]]}']) {
    if (w.p.daUnLink(brutto)) guasto('ha accettato un link rotto: ' + brutto);
  }
});

/* ==================== IL PERCORSO COME FILE GPX ====================
   Perche' un percorso camminato da un non vedente, con dentro dov e il
   gradino, vale anche fuori da Yourbea. */

prova('IL GPX ESCE BENE, e lo rilegge chi lo ha scritto', () => {
  const w = mondo();
  const p = { nome: 'dal medico', metri: 240, quando: 1000000,
              punti: perLaCitta(240).punti,
              segni: [{ da: 60, n: 'il gradino alto' }, { da: 180, n: "l'attraversamento" }] };
  const g = w.p.comeGpx(p);
  if (!/^<\?xml/.test(g)) return guasto('non comincia come un XML');
  if (!/<gpx version="1.1"/.test(g)) return guasto('non dice di essere GPX 1.1');
  if ((g.match(/<trkpt /g) || []).length !== p.punti.length) guasto('i punti della traccia non ci sono tutti');
  if ((g.match(/<wpt /g) || []).length !== 2) guasto('i segni non sono diventati waypoint');
  const r = w.p.daGpx(g);
  if (!r) return guasto('non si rilegge');
  if (r.nome !== 'dal medico') guasto('il nome si e perso: ' + r.nome);
  if (r.punti.length !== p.punti.length) guasto('i punti riletti sono ' + r.punti.length);
  if ((r.segni || []).length !== 2) guasto('i segni riletti sono ' + (r.segni || []).length);
  console.log('      → ' + g.split('\n').length + ' righe, ' + r.punti.length + ' punti, 2 segni');
});

prova('L APOSTROFO NON ROMPE IL FILE', () => {
  const w = mondo();
  const p = { nome: "dall'edicola & ritorno", metri: 240, punti: perLaCitta(240).punti,
              segni: [{ da: 60, n: '<il "gradino">' }] };
  const g = w.p.comeGpx(p);
  const nomi = (g.match(/<name>[\s\S]*?<\/name>/g) || []).join(' ');
  if (/['"&<>]/.test(nomi.replace(/&(?:amp|lt|gt|quot|apos);/g, '').replace(/<\/?name>/g, ''))) {
    guasto('marcature crude dentro il nome: ' + nomi);
  }
  const r = w.p.daGpx(g);
  if (!r || r.nome !== "dall'edicola & ritorno") guasto('il nome torna sbagliato: ' + (r && r.nome));
  if (!r.segni.length || r.segni[0].n !== '<il "gradino">') guasto('il segno torna sbagliato: ' + (r && r.segni[0] && r.segni[0].n));
});

prova('UN GPX DI UN ALTRO PROGRAMMA si cammina lo stesso', () => {
  const w = mondo();
  const fuori = ['<?xml version="1.0"?>',
    '<gpx version="1.1" creator="Komoot" xmlns="http://www.topografix.com/GPX/1/1">',
    '<metadata><name>Giro del centro</name></metadata>',
    '<wpt lat="41.9005" lon="12.4900"><name>la fontana</name></wpt>',
    '<trk><trkseg>',
    '<trkpt lat="41.9000" lon="12.4900"></trkpt>',
    '<trkpt lat="41.9010" lon="12.4900"></trkpt>',
    '<trkpt lat="41.9010" lon="12.4920"></trkpt>',
    '</trkseg></trk></gpx>'].join('\n');
  const r = w.p.daGpx(fuori);
  if (!r) return guasto('un GPX normale non lo legge');
  if (r.nome !== 'Giro del centro') guasto('nome: ' + r.nome);
  if (r.punti.length !== 3) guasto('punti: ' + r.punti.length);
  if (!r.daAltri) guasto('non si vede che e di un altro');
  if (!r.metri) guasto('non ha contato i metri');
});

prova('QUELLO CHE NON E UN GPX non diventa un percorso', () => {
  const w = mondo();
  for (const brutto of ['', 'ciao', '<gpx></gpx>', '<gpx><trkpt lat="41.9" lon="12.4"/></gpx>']) {
    if (w.p.daGpx(brutto)) guasto('accettato: ' + brutto.slice(0, 40));
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei percorsi suoi');
process.exit(passate === fatti.length ? 0 : 1);
