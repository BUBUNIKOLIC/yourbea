/* LE PROVE DEI DATI — nuova Yourbea
   ============================================================
   «Vabbè ma troviamo sempre e solo errori» (Vince, 22/10 sera).
   Ha ragione, e il punto non è che gli errori ci sono: è che per
   trovarli bisognava che qualcuno si mettesse a guardare. Le 437 schede
   che parlavano di un altro posto — all'Auditorium attaccato a una
   fontana, «Alberi» che spiegava cos'è un albero — stavano lì da
   giorni, e nessuna prova le vedeva: il banco provava il CODICE, e il
   codice era giusto. Erano i DATI a essere storti.
   Da qui in poi li guarda il banco, a ogni pubblicazione, su tutti i
   20.836 luoghi d'Italia. Si lancia:  node nuova/prove/dati.js        */

'use strict';
const fs = require('fs');
const path = require('path');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.slice(0, 6).forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* le parole che non distinguono niente: «chiesa» ce l'hanno tutte le
   chiese, e se contasse la chiesa di Sant'Antonio e quella di Santa Rita
   sarebbero lo stesso posto */
const GENERICHE = new Set(('di del della dello dei degli delle da a al alla il lo la i gli le un uno una e ed in su con per ' +
  'chiesa chiesetta cappella basilica cattedrale duomo santuario oratorio pieve abbazia monastero convento collegiata tempio ' +
  'palazzo palazzina casa villa castello torre porta ponte fontana piazza piazzale largo corso viale strada via vicolo ' +
  'museo teatro cinema stadio parco giardino cimitero santa santo sant san santi sante beata beato madonna maria ' +
  'monumento edificio complesso antica antico vecchia vecchio nuova nuovo grande piccola piccolo italiano italiana').split(' '));

function paroleProprie(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !GENERICHE.has(w));
}

function tuttiILuoghi() {
  const dir = path.join(__dirname, '..', 'dati', 'cultura');
  const fuori = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { fuori.push({ __rotto: f }); continue; }
    const lista = Array.isArray(d) ? d : Object.values(d)[0];
    if (Array.isArray(lista)) for (const p of lista) if (p && typeof p === 'object') fuori.push(p);
  }
  return fuori;
}

const LUOGHI = tuttiILuoghi();
console.log('    (' + LUOGHI.length + ' luoghi in tutta Italia)');

prova('I FILE SI LEGGONO TUTTI', () => {
  const rotti = LUOGHI.filter((p) => p.__rotto);
  rotti.forEach((p) => guasto('file illeggibile: ' + p.__rotto));
});

prova('LA SCHEDA PARLA DEL POSTO, non di un altro', () => {
  /* 437 sbagliate trovate il 22/10: la fontana con l Auditorium Parco
     della Musica, «Alberi» con la voce botanica sull albero. */
  for (const p of LUOGHI) {
    if (!p.d || !p.n) continue;
    const forti = paroleProprie(p.n);
    if (!forti.length) continue;
    const corpo = ' ' + paroleProprie(p.d).join(' ') + ' ';
    if (!forti.some((w) => corpo.includes(' ' + w + ' '))) {
      guasto(p.n + ' -> ' + String(p.d).slice(0, 70));
    }
  }
});

prova('NESSUN EDIFICIO E LARGO DUE METRI', () => {
  /* i «250px» del riquadro di Wikipedia letti come centimetri: «il
     palazzo del Quirinale, largo 2,6 metri» */
  for (const p of LUOGHI) {
    if (p.l && p.l < 4) guasto(p.n + ' largo ' + p.l + ' m');
    if (p.p && p.p < 4) guasto(p.n + ' lungo ' + p.p + ' m');
    if (p.h && (p.h < 2 || p.h > 180)) guasto(p.n + ' alto ' + p.h + ' m');
  }
});

prova('NIENTE MARCATURE DI WIKIPEDIA DENTRO LE SCHEDE', () => {
  for (const p of LUOGHI) {
    if (p.d && /\{\{|\[\[|<ref|\bpx\b|\|\s*\w+\s*=/.test(p.d)) guasto(p.n + ' -> ' + String(p.d).slice(0, 60));
  }
});

prova('LA STESSA FORMA NON SI DICE DUE VOLTE', () => {
  /* «ha una navata, un abside e delle navate» */
  for (const p of LUOGHI) {
    const fr = (p.frm || []).map((x) => String(x).toLowerCase());
    if (fr.length !== new Set(fr).size) guasto(p.n + ' -> ' + fr.join(', '));
    if (fr.includes('navata') && fr.includes('navate')) guasto(p.n + ' -> navata e navate insieme');
  }
});

prova('I LUOGHI STANNO IN ITALIA, e hanno un nome', () => {
  for (const p of LUOGHI) {
    if (p.__rotto) continue;
    if (!p.n) { guasto('un luogo senza nome'); continue; }
    if (!(p.lat > 35 && p.lat < 48 && p.lon > 6 && p.lon < 19)) guasto(p.n + ' a ' + p.lat + ',' + p.lon);
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei dati');
process.exit(passate === fatti.length ? 0 : 1);
