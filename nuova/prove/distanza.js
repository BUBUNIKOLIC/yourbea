/* LE PROVE DELLA DISTANZA — Yourbea, 21/10/2026
   «Dovrebbe essere più precisa con le distanze» (la sorella di Vince,
   provando il guscio Android).
   Aveva ragione, e il difetto si contava: c'erano QUATTRO misure diverse
   per la stessa cosa.
     racconto     arrotondava a 10 METRI   — e diceva «metri», non passi
     guida        a 10 passi
     descrizione  a 5 passi
     scena        a 5 passi, poi «una ventina di passi»
   Quindi la stessa distanza usciva in unità diverse a seconda di chi
   parlava. E sotto i 25 metri il cenno diceva solo «a pochi passi»: a
   venti metri da una porta non basta.

   LA REGOLA: LA PRECISIONE SEGUE L'ERRORE.
   Il GPS sbaglia tredici metri (misurato sul quaderno di Vince in una
   giornata vera). Allora vicino si contano i passi uno per uno, perché
   l'errore è piccolo e tu stai per arrivare; lontano no, perché fingere
   la precisione è una bugia. Una sola unità: i passi.
   Si lancia:  node nuova/prove/distanza.js                              */

'use strict';
const Distanza = require('../parti/distanza.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
const d = Distanza();

prova('VICINO si contano i passi uno per uno', () => {
  if (!/\b10 passi\b/.test(d.passi(7.5))) guasto('7,5 m dovevano essere 10 passi: ' + d.passi(7.5));
  if (!/\b16 passi\b/.test(d.passi(12))) guasto('12 m dovevano essere 16 passi: ' + d.passi(12));
  console.log('      → 7,5 m = ' + d.passi(7.5) + '   ·   12 m = ' + d.passi(12));
});

prova('«pochi passi» solo quando sono DAVVERO pochi', () => {
  if (!/pochi/.test(d.passi(2))) guasto('due metri sono pochi passi: ' + d.passi(2));
  if (/pochi/.test(d.passi(20))) guasto('venti metri NON sono «pochi passi»: ' + d.passi(20));
  if (/pochi/.test(d.passi(12))) guasto('dodici metri NON sono «pochi passi»: ' + d.passi(12));
});

prova('LONTANO non si finge la precisione', () => {
  const a = d.passi(205);
  const n = Number((a.match(/(\d+)/) || [])[1]);
  if (!n) { guasto('niente numero: ' + a); return; }
  /* oltre i duecento metri il passo e' di venticinque: dire «a 273 passi»
     non sarebbe piu' preciso, sarebbe solo piu' falso */
  if (n % 25 !== 0) guasto('a duecento metri non arrotonda: ' + a);
  if (Math.abs(n - 273) > 25) guasto('e nemmeno sbaglia la misura: ' + a);
  console.log('      → 205 m = ' + a);
});

prova('UNA SOLA UNITA: passi, mai metri, finche si cammina', () => {
  [8, 25, 60, 120, 250].forEach((m) => {
    if (/metri/.test(d.passi(m))) guasto(m + ' m detto in metri: ' + d.passi(m));
  });
});

prova('ma a un chilometro i passi non si dicono piu', () => {
  const a = d.passi(1400);
  if (/passi/.test(a)) guasto('milleottocento passi non li conta nessuno: ' + a);
  if (!/chilometr/.test(a)) guasto('a un chilometro si dicono i chilometri: ' + a);
  console.log('      → 1400 m = ' + a);
});

prova('cresce sempre: piu lontano, numero piu grande', () => {
  let prima = -1;
  for (let m = 1; m < 900; m += 3) {
    const n = Number((d.passi(m).match(/(\d+)/) || [])[1] || 0);
    if (n && n < prima) guasto('a ' + m + ' m dice ' + n + ', meno di prima (' + prima + ')');
    if (n) prima = n;
  }
});

prova('la forma nuda serve dentro un altra frase', () => {
  if (/^a /.test(d.nudi(30))) guasto('«nudi» non deve avere l articolo: ' + d.nudi(30));
  if (!/^a /.test(d.passi(30))) guasto('«passi» deve avere l articolo: ' + d.passi(30));
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della distanza');
process.exit(passate === fatti.length ? 0 : 1);
