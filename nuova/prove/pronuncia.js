/* LE PROVE DELLA PRONUNCIA — nuova Yourbea
   «Percorso tattile con l'accento sulla a invece che sulla i… dobbiamo
   correggere questo, gli accenti» (Vince, 16/10, dopo la prova in strada).
   Si lancia:  node nuova/prove/pronuncia.js                                 */

'use strict';
const Pronuncia = require('../parti/pronuncia.js');
const p = Pronuncia();

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

prova('«ancora» è di nuovo, non quella della nave', () => {
  /* è il comando che l'app usa cento volte al giorno */
  const t = p.sistema('Dimmi ancora per saperne di più.');
  if (!/ancòra/.test(t)) guasto('non ha messo l\'accento: ' + t);
});

prova('il percorso tattile si legge con l\'accento giusto', () => {
  const t = p.sistema('un attraversamento col percorso tattile');
  if (!/tàttile/.test(t)) guasto('ha lasciato tattile senza accento: ' + t);
});

prova('la maiuscola a inizio frase resta', () => {
  const t = p.sistema('Ancora una cosa.');
  if (!/^Ancòra/.test(t)) guasto('ha perso la maiuscola: ' + t);
});

prova('le parole che la voce legge bene non si toccano', () => {
  /* ogni parola nel dizionario è un rischio: se la voce la diceva giusta,
     l'accento la peggiora */
  const t = 'Il ristorante e il bar sono sulla destra, dopo il semaforo.';
  if (p.sistema(t) !== t) guasto('ha cambiato una frase che andava bene: ' + p.sistema(t));
});

prova('non tocca i nomi propri né i pezzi di parola', () => {
  const t = p.sistema('Via Ancona e la Banca Ancora Srl');
  if (/Ancòna/.test(t)) guasto('ha storpiato Ancona: ' + t);
});

prova('il dizionario non è gonfio', () => {
  /* più parole ci sono, più è facile peggiorare qualcosa che andava bene */
  if (p.quante() > 60) guasto('troppe parole: ' + p.quante());
});

/* LE PARENTESI — dal quaderno del 21/10: «Qui c'è Laurentina
   (metropolitana di Roma)». Dette ad alta voce non vogliono dire niente. */
prova('le parentesi diventano una virgola', () => {
  const p = Pronuncia();
  const d = p.sistema("Qui c'è Laurentina (metropolitana di Roma).");
  if (/[()]/.test(d)) guasto('parentesi rimaste: ' + d);
  if (!/Laurentina, metropolitana di Roma\./.test(d)) guasto('letta male: ' + d);
});

prova('una frase senza parentesi non si tocca', () => {
  const p = Pronuncia();
  const t = 'Sei in via Roma.';
  if (p.sistema(t) !== t) guasto('ha cambiato una frase pulita: ' + p.sistema(t));
});

prova('LA METRO NON SI DICE «MB»', () => {
  /* «Anche la metro dice MB» (Vince, 24/10): nei dati della mappa la
     linea B di Roma si chiama MB, e la voce legge la sigla come viene. */
  const p = Pronuncia();
  const casi = [
    ['Ingresso della metropolitana, Piramide MB', 'metro B'],
    ['Colosseo MB, a 30 passi', 'metro B'],
    ['Termini MA', 'metro A'],
    ['Conca d\'Oro MB1', 'metro B1'],
    ['San Giovanni MC', 'metro C'],
    ['Duomo M1', 'metro 1']
  ];
  casi.forEach(([dentro, atteso]) => {
    const fuori = p.sistema(dentro);
    if (fuori.indexOf(atteso) < 0) guasto('«' + dentro + '» → «' + fuori + '»');
  });
  console.log('      → ' + p.sistema('Colosseo MB, a 30 passi'));
  /* e non si tocca quello che non c entra */
  ['Marco', 'MBA', 'Mbappe', 'M5S'].forEach((t) => {
    if (p.sistema(t) !== t) guasto('ha toccato «' + t + '»: ' + p.sistema(t));
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della pronuncia');
process.exit(passate === fatti.length ? 0 : 1);
