/* LE PROVE DEI POSTI MIEI
   «Con il comando registra casa. Registra medico. E dopo sarà possibile
   per loro: fai il percorso casa medico» — «durante il percorso è
   possibile registrare scivolo, percorso tattile, ostacolo, panchina,
   ritrovo, bar ecc.» — «ogni non vedente può registrare i suoi
   riferimenti» (Vince, 23/10).
   Si lancia:  node nuova/prove/postiMiei.js                             */

'use strict';
const PostiMiei = require('../parti/postiMiei.js');

function dist(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const x = (c - a) * r, y = (d - b) * r * Math.cos((a + c) / 2 * r);
  return Math.sqrt(x * x + y * y) * R;
}
/* l'articolo vero, quello di percorsiMiei: le prove devono sentire le
   stesse parole che sentira' chi usa l'app */
const PercorsiMiei = require('../parti/percorsiMiei.js');
const pm = PercorsiMiei({ dist: dist, distanza: () => Promise.resolve(null) });

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

let adesso = 1000000;
function nuovo() {
  return PostiMiei({ dist: dist, ora: () => adesso, aPosto: pm.aPosto, nudo: pm.soloIlNome });
}
const CASA = { lat: 41.9028, lon: 12.4964, prec: 8 };
const MEDICO = { lat: 41.9050, lon: 12.4990, prec: 10 };
const ZIO = { lat: 41.9075, lon: 12.5020, prec: 9 };

prova('«registra casa» segna il punto dove sei', () => {
  const p = nuovo();
  const d = p.registra('casa', CASA);
  if (d.tipo !== 'posto-segnato') { guasto('non ha segnato: ' + d.testo); return; }
  if (p.quanti() !== 1) guasto('non e finito nell elenco');
  const c = p.trova('casa');
  if (!c || c.lat !== CASA.lat) guasto('il punto non e quello dove sei');
  console.log('      → ' + d.testo);
});

/* «Portami all'il medico» e' la figura che abbiamo gia' fatto coi
   percorsi: l'articolo lo mette aPosto(), il nome si tiene nudo. */
prova('«registra il medico» tiene il nome senza articolo', () => {
  const p = nuovo();
  p.registra('il medico', MEDICO);
  if (!p.trova('medico')) { guasto('non lo ritrova per nome'); return; }
  const d = p.registra('il medico', MEDICO);
  if (/all.il medico|a il medico/.test(d.testo)) guasto('dice male: ' + d.testo);
  if (!/dal medico/.test(d.testo)) guasto('non dice «dal medico»: ' + d.testo);
});

prova('lo stesso nome due volte corregge, non raddoppia', () => {
  const p = nuovo();
  p.registra('medico', MEDICO);
  const altro = { lat: 41.9060, lon: 12.4999, prec: 7 };
  p.registra('medico', altro);
  if (p.quanti() !== 1) guasto('ce ne sono ' + p.quanti() + ', doveva correggere');
  if (p.trova('medico').lat !== altro.lat) guasto('ha tenuto il punto vecchio');
});

/* I 400 METRI DEL 20/10: un punto preso male e taciuto manda chi non
   vede in mezzo alla strada sbagliata. Si dice. */
prova('se il telefono non sa dov e, lo dice', () => {
  const p = nuovo();
  const d = p.registra('medico', { lat: 41.9050, lon: 12.4990, prec: 90 });
  if (!/non è sicuro|non e sicuro/.test(d.testo)) guasto('tace sull imprecisione: ' + d.testo);
});

prova('senza posizione non segna niente', () => {
  const p = nuovo();
  const d = p.registra('medico', null);
  if (d.tipo !== 'niente-posizione') guasto('ha segnato un punto che non ha: ' + d.tipo);
  if (p.quanti()) guasto('e lo ha pure tenuto');
});

/* ============================================================
   FAI IL PERCORSO A B
   ============================================================ */
function conTre() {
  const p = nuovo();
  p.registra('casa', CASA);
  p.registra('medico', MEDICO);
  p.registra('zio Gianni', ZIO);
  return p;
}

prova('«fai il percorso casa medico»', () => {
  const p = conTre();
  const r = p.dallaVoce('fai il percorso casa medico');
  if (!r || r.cosa !== 'percorso-fra') { guasto('non l ha capito: ' + JSON.stringify(r)); return; }
  if (r.da.n !== 'casa' || r.a.n !== 'medico') guasto('ha preso i posti sbagliati: ' + r.da.n + ' → ' + r.a.n);
});

/* IL NOME DI DUE PAROLE. «Medico zio gianni» non si puo' tagliare
   contando le parole: si prova ogni taglio e vince quello dove tutt'e due
   i pezzi sono posti che esistono. */
prova('«fai il percorso medico zio gianni», col nome di due parole', () => {
  const p = conTre();
  const r = p.dallaVoce('fai il percorso medico zio gianni');
  if (!r || r.cosa !== 'percorso-fra') { guasto('non l ha capito: ' + JSON.stringify(r)); return; }
  if (r.da.n !== 'medico') guasto('la partenza e ' + r.da.n);
  if (r.a.n !== 'zio Gianni') guasto('l arrivo e ' + r.a.n);
});

prova('«percorso da casa al medico», con le preposizioni', () => {
  const p = conTre();
  const r = p.dallaVoce('fai il percorso da casa al medico');
  if (!r || r.cosa !== 'percorso-fra') { guasto('non l ha capito: ' + JSON.stringify(r)); return; }
  if (r.da.n !== 'casa' || r.a.n !== 'medico') guasto(r.da.n + ' → ' + r.a.n);
});

prova('un posto che non c e non diventa un percorso inventato', () => {
  const p = conTre();
  const r = p.dallaVoce('fai il percorso casa dentista');
  if (!r || r.cosa !== 'percorso-fra-chi') guasto('doveva dire che non sa quali: ' + JSON.stringify(r));
});

/* ============================================================
   I RIFERIMENTI LUNGO LA STRADA
   ============================================================ */
prova('«registra ostacolo» e poi ripassandoci lo avvisa prima', () => {
  const p = nuovo();
  const palo = { lat: 41.9030, lon: 12.4966, prec: 6 };
  p.registra('ostacolo', palo);
  adesso += 600000;
  /* venti metri prima: un avviso si deve dire mentre si puo' ancora
     cambiare strada, non quando ci sei addosso */
  const venti = { lat: palo.lat + 0.00018, lon: palo.lon };
  const d = p.quiVicino(venti, adesso);
  if (!d) { guasto('a ' + Math.round(dist(venti.lat, venti.lon, palo.lat, palo.lon)) + ' m non dice niente'); return; }
  if (!d.avviso) guasto('un ostacolo non e un avviso: ' + JSON.stringify(d));
  console.log('      → ' + d.testo);
});

prova('la panchina si dice solo quando ci sei', () => {
  const p = nuovo();
  const pan = { lat: 41.9030, lon: 12.4966, prec: 6 };
  p.registra('panchina', pan);
  adesso += 600000;
  const venti = { lat: pan.lat + 0.00018, lon: pan.lon };
  if (p.quiVicino(venti, adesso)) guasto('annuncia una panchina da venti metri');
  const cinque = { lat: pan.lat + 0.000045, lon: pan.lon };
  const d = p.quiVicino(cinque, adesso);
  if (!d) { guasto('e a cinque metri non la dice'); return; }
  if (d.avviso) guasto('una panchina non e un avviso');
  console.log('      → ' + d.testo);
});

prova('non lo ripete a ogni passo', () => {
  const p = nuovo();
  const pan = { lat: 41.9030, lon: 12.4966, prec: 6 };
  p.registra('scivolo', pan);
  adesso += 600000;
  const qui = { lat: pan.lat + 0.000045, lon: pan.lon };
  if (!p.quiVicino(qui, adesso)) { guasto('non lo dice la prima volta'); return; }
  if (p.quiVicino(qui, adesso + 2000)) guasto('lo ridice due secondi dopo');
  if (!p.quiVicino(qui, adesso + 300000)) guasto('cinque minuti dopo deve poterlo ridire');
});

prova('fra la panchina e il palo vince il palo', () => {
  const p = nuovo();
  const dove = { lat: 41.9030, lon: 12.4966, prec: 6 };
  p.registra('panchina', dove);
  p.registra('palo', { lat: dove.lat + 0.00002, lon: dove.lon, prec: 6 });
  adesso += 600000;
  const d = p.quiVicino(dove, adesso);
  if (!d || d.posto.n !== 'palo') guasto('ha detto ' + (d ? d.posto.n : 'niente'));
});

prova('lontano da tutto non dice niente', () => {
  const p = conTre();
  adesso += 600000;
  if (p.quiVicino({ lat: 41.8500, lon: 12.4000 }, adesso)) guasto('parla di posti a chilometri');
});

/* ============================================================
   LE PAROLE
   ============================================================ */
prova('«registra il percorso» resta a chi lo registra camminando', () => {
  const p = conTre();
  if (p.dallaVoce('registra il percorso')) guasto('si e preso il comando dei percorsi camminati');
  if (p.dallaVoce('registra percorso per il medico')) guasto('idem, con un nome dietro');
});

prova('«zio Gianni» si tiene con la maiuscola', () => {
  const p = nuovo();
  const r = p.dallaVoce('registra zio Gianni');
  if (!r || r.cosa !== 'registra') { guasto('non l ha capito: ' + JSON.stringify(r)); return; }
  if (r.nome !== 'zio Gianni') guasto('ha tenuto «' + r.nome + '»');
});

prova('«che posti ho» li elenca, e se non ce ne sono lo dice', () => {
  const vuoto = nuovo();
  const d0 = vuoto.elenco(CASA);
  if (!/non hai ancora segnato/i.test(d0.testo)) guasto('con zero posti dice: ' + d0.testo);
  const p = conTre();
  const d = p.elenco(CASA);
  if (!/casa/.test(d.testo)) guasto('non li elenca: ' + d.testo);
  /* i piu' vicini per primi: a chi chiede cosa ha intorno non serve un
     posto a tre chilometri */
  if (d.posti[0].n !== 'casa') guasto('non parte dal piu vicino: ' + d.posti[0].n);
  console.log('      → ' + d.testo);
});

prova('«cancella medico» lo toglie, e solo se c e', () => {
  const p = conTre();
  const r = p.dallaVoce('cancella il medico');
  if (!r || r.cosa !== 'butta') { guasto('non l ha capito: ' + JSON.stringify(r)); return; }
  p.butta(r.nome);
  if (p.trova('medico')) guasto('c e ancora');
  if (p.dallaVoce('cancella il dentista')) guasto('butta un posto che non esiste');
});

prova('una frase qualunque non segna niente', () => {
  const p = conTre();
  ['dove sono', 'portami a casa', 'ho registrato male la panchina ieri',
   'che ore sono'].forEach((t) => {
    const r = p.dallaVoce(t);
    if (r && r.cosa === 'registra') guasto('«' + t + '» ha segnato un posto');
  });
});

/* ============================================================
   DARLI A UN ALTRO
   «Può inviarli tramite WhatsApp agli altri, in attesa di avere un
   server» (Vince, 23/10).
   ============================================================ */
prova('i riferimenti viaggiano in un link e arrivano uguali', () => {
  const p = conTre();
  const dati = p.perMandare();
  const altro = nuovo();
  const arrivati = altro.daUnLink(dati, 'Lucia');
  if (!arrivati || arrivati.length !== 3) { guasto('arrivati ' + (arrivati ? arrivati.length : 0) + ' su 3'); return; }
  altro.unisci(arrivati);
  const m = altro.trova('medico');
  if (!m) { guasto('il medico non e arrivato'); return; }
  /* un metro di tolleranza: nel link le coordinate stanno a cinque
     decimali, ed e' il punto di tenerlo corto */
  if (dist(m.lat, m.lon, MEDICO.lat, MEDICO.lon) > 1.5) {
    guasto('il punto si e spostato di ' + Math.round(dist(m.lat, m.lon, MEDICO.lat, MEDICO.lon)) + ' m');
  }
  console.log('      → tre riferimenti in ' + dati.length + ' caratteri');
});

/* WHATSAPP TAGLIA I MESSAGGI LUNGHI: l'abbiamo gia' imparato coi
   percorsi, 8.000 caratteri che arrivavano monchi. */
prova('venti riferimenti stanno in un messaggio', () => {
  const p = nuovo();
  for (let i = 0; i < 20; i++) {
    p.registra('riferimento ' + i, { lat: 41.90 + i * 0.0004, lon: 12.49 + i * 0.0004, prec: 8 });
  }
  const dati = p.perMandare();
  const link = Buffer.from(dati, 'utf8').toString('base64').length + 60;
  if (link > 1400) guasto('il link e lungo ' + link + ' caratteri');
  console.log('      → venti riferimenti: link di ' + link + ' caratteri');
});

prova('lo stesso posto che arriva due volte non si raddoppia', () => {
  const p = conTre();
  const dati = p.perMandare();
  const r = p.unisci(p.daUnLink(dati, 'Lucia'));
  if (p.quanti() !== 3) guasto('adesso sono ' + p.quanti());
  if (r.gia !== 3) guasto('non si e accorto che ce li aveva gia: ' + JSON.stringify(r));
});

/* IL MEDICO DI LUCIA NON E' IL TUO. Stesso nome, altro punto: si tengono
   tutt'e due, sennò «portami dal medico» non si sa dove va. */
prova('stesso nome ma un altro posto: si tengono tutt e due', () => {
  const mio = nuovo();
  mio.registra('medico', MEDICO);
  const diLucia = nuovo();
  diLucia.registra('medico', { lat: 41.8800, lon: 12.4700, prec: 8 });
  const r = mio.unisci(mio.daUnLink(diLucia.perMandare(), 'Lucia'));
  if (mio.quanti() !== 2) { guasto('ce ne sono ' + mio.quanti()); return; }
  if (!mio.trova('medico di Lucia')) guasto('non si capisce di chi e: ' + JSON.stringify(r.messi));
  if (dist(mio.trova('medico').lat, mio.trova('medico').lon, MEDICO.lat, MEDICO.lon) > 1.5) {
    guasto('il tuo medico si e spostato');
  }
});

prova('un link storto non fa danni', () => {
  const p = conTre();
  ['', 'ciao', '{}', '{"v":2,"r":[]}', '{"v":1,"r":[["a","b","c"]]}'].forEach((t) => {
    if (p.daUnLink(t)) guasto('ha accettato «' + t + '»');
  });
  if (p.quanti() !== 3) guasto('e ha anche toccato i miei');
});

/* PROVANDOLA NELL'APP: «registra zio Gianni» rispondeva «portami a zio
   gianni». L'articolo si sbassa, il nome di una persona no. */
prova('il nome di una persona tiene la maiuscola anche nella risposta', () => {
  const p = nuovo();
  const d = p.registra('zio Gianni', ZIO);
  if (!/zio Gianni/.test(d.testo)) guasto('lo sbassa: ' + d.testo);
  const e = p.elenco(ZIO);
  if (!/zio Gianni/.test(e.testo)) guasto('e anche nell elenco: ' + e.testo);
  /* ma l'articolo resta quello giusto */
  const q = nuovo();
  q.registra('edicola', CASA);
  if (!/all.edicola/.test(q.registra('edicola', CASA).testo)) guasto('l articolo s e rotto');
});

/* PROVANDOLA NELL'APP: tre riferimenti nello stesso punto hanno prodotto
   «casa, qui», «scivolo, qui» e un monumento in due secondi. */
prova('due riferimenti vicini non escono attaccati', () => {
  const p = nuovo();
  const dove = { lat: 41.9030, lon: 12.4966, prec: 6 };
  p.registra('panchina', dove);
  p.registra('fontanella', { lat: dove.lat + 0.00002, lon: dove.lon, prec: 6 });
  adesso += 600000;
  const primo = p.quiVicino(dove, adesso);
  if (!primo) { guasto('il primo non esce'); return; }
  if (p.quiVicino(dove, adesso + 2000)) guasto('il secondo esce due secondi dopo');
  if (!p.quiVicino(dove, adesso + 20000)) guasto('dopo venti secondi deve poter uscire');
});

/* ma un pericolo non aspetta il suo turno */
prova('un pericolo passa sopra all attesa', () => {
  const p = nuovo();
  const panca = { lat: 41.9030, lon: 12.4966, prec: 6 };
  /* la buca sta trecento metri piu' in la': cosi' la panchina esce da
     sola, e la buca arriva dopo due secondi di cammino immaginario */
  const buca = { lat: 41.9057, lon: 12.4966, prec: 6 };
  p.registra('panchina', panca);
  p.registra('buca', buca);
  adesso += 600000;
  if (!p.quiVicino(panca, adesso)) { guasto('la panchina non esce'); return; }
  const d = p.quiVicino(buca, adesso + 2000);
  if (!d || d.posto.n !== 'buca') guasto('la buca ha aspettato il turno: ' + (d ? d.posto.n : 'niente'));
  if (!d.avviso) guasto('e non e un avviso');
});

/* E DOVE CI SONO TUTT'E DUE, parla il pericolo: una panchina la trovi
   col bastone, una buca ci cadi dentro. */
prova('fra la panchina sotto i piedi e la buca piu in la, parla la buca', () => {
  const p = nuovo();
  const dove = { lat: 41.9030, lon: 12.4966, prec: 6 };
  p.registra('panchina', dove);
  p.registra('buca', { lat: dove.lat + 0.00018, lon: dove.lon, prec: 6 });
  adesso += 600000;
  const d = p.quiVicino(dove, adesso);
  if (!d || d.posto.n !== 'buca') guasto('ha detto ' + (d ? d.posto.n : 'niente'));
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei posti miei');
process.exit(passate === fatti.length ? 0 : 1);
