/* LE PROVE DELLA REGOLA — nuova Yourbea
   «Non m'interessa ciò che è dentro, voglio ci sia la regola» (Vince,
   19/10). Questa è la regola, e queste sono le prove che tiene.
   Si lancia:  node nuova/prove/aChiServe.js                              */

'use strict';
const AChiServe = require('../parti/aChiServe.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
const a = AChiServe();
const PIEDI = { aPiedi: true };
const RUOTE = { aPiedi: false };

prova('UTILITÀ non racconta la storia, TURISMO sì', () => {
  ['scheda', 'cosa-vedere', 'approfondimento'].forEach((c) => {
    if (a.serve(c, 'servizi', PIEDI)) guasto('in Utilità non si racconta ' + c);
    if (!a.serve(c, 'cultura', PIEDI)) guasto('in Turismo si deve raccontare ' + c);
  });
});

prova('UTILITÀ dice cos\'è, TURISMO no (lì si racconta)', () => {
  if (!a.serve('aCosaServe', 'servizi', PIEDI)) guasto('in Utilità si dice cos\'è');
  if (a.serve('aCosaServe', 'cultura', PIEDI)) guasto('in Turismo non serve: lì si racconta');
});

prova('LE PASSEGGIATE sono di Turismo', () => {
  if (a.serve('passeggiata', 'servizi', PIEDI)) guasto('non si propongono in Utilità');
  if (!a.serve('passeggiata', 'cultura', PIEDI)) guasto('in Turismo sì');
});

prova('GLI AVVISI non si spengono mai: nessuna modalità, nessuna velocità', () => {
  [['servizi', PIEDI], ['cultura', PIEDI], ['servizi', RUOTE], ['cultura', RUOTE]].forEach(([m, c]) => {
    if (!a.serve('avviso', m, c)) guasto('avviso spento in ' + m + ' aPiedi=' + c.aPiedi);
  });
});

prova('LA DESCRIZIONE DELLA REALTÀ sta in tutte e due', () => {
  ['scena', 'lati', 'paesaggio'].forEach((c) => {
    if (!a.serve(c, 'servizi', PIEDI)) guasto(c + ' manca in Utilità');
    if (!a.serve(c, 'cultura', PIEDI)) guasto(c + ' manca in Turismo');
  });
});

prova('I CIVICI solo in Utilità, e solo a piedi', () => {
  if (!a.serve('civico', 'servizi', PIEDI)) guasto('in Utilità, a piedi, sì');
  if (a.serve('civico', 'cultura', PIEDI)) guasto('in Turismo no');
  if (a.serve('civico', 'servizi', RUOTE)) guasto('in macchina no');
});

prova('LA REGOLA DEL MOVIMENTO: quello che si misura in passi tace se non cammini', () => {
  ['scena', 'lati', 'passaggio', 'incrocio', 'civico', 'orientamento'].forEach((c) => {
    if (a.serve(c, 'servizi', RUOTE)) guasto(c + ' non si dice in macchina');
  });
  /* e quello che resta fermo all'orizzonte invece sì */
  if (!a.serve('paesaggio', 'servizi', RUOTE)) guasto('il paesaggio in macchina vale di più, non di meno');
  if (!a.serve('strada', 'servizi', RUOTE)) guasto('la strada si dice sempre');
});

prova('UNA COSA CHIESTA NON SI FILTRA MAI', () => {
  if (!a.serve('scheda', 'servizi', { aPiedi: true, chiesto: true }))
    guasto('se in Utilità chiede «raccontamelo», glielo si racconta');
  if (!a.serve('passeggiata', 'servizi', { aPiedi: false, chiesto: true }))
    guasto('una passeggiata chiesta non si nega');
});

prova('LA SUDDIVISIONE IN FUNZIONE DELL\'UTENTE: lo stesso luogo pesa diverso', () => {
  const stadio = { n: 'Maradona', t: 'stadio', d: '' };
  const chiesetta = { n: 'San Vitale', t: 'cappella', d: 'x'.repeat(400) };
  if (!(a.quantoConta(stadio, 'servizi') > a.quantoConta(chiesetta, 'servizi')))
    guasto('in Utilità lo stadio orienta più di una cappella');
  if (!(a.quantoConta(chiesetta, 'cultura') > a.quantoConta(stadio, 'cultura')))
    guasto('in Turismo la cappella con la storia conta più dello stadio senza');
});

prova('quello che non è in tabella si dice, non si perde', () => {
  if (!a.serve('una-cosa-nuova', 'servizi', PIEDI)) guasto('una cosa non prevista non deve sparire');
});

/* ============================================================
   SENZA PRECISIONE NON SI DICONO LE PARTI — 21/10/2026
   Alla Laurentina il telefono dava ±653 metri e l'app diceva «a destra, a
   130 metri, la stazione» mentre lui ce l'aveva davanti. Vince: «stando
   così non serve a nulla per i non vedenti». Chi vede corregge con
   un'occhiata; chi non vede si fida e sbaglia strada.                    */
const SBALLATO = { aPiedi: true, preciso: false };

prova('IMPRECISI: tace tutto quello che dice una parte o una distanza', () => {
  ['cenno', 'superato', 'lati', 'scena', 'passaggio', 'incrocio',
   'aCosaServe', 'civico', 'orientamento', 'avviso'].forEach((c) => {
    if (a.serve(c, 'servizi', SBALLATO)) guasto(c + ' non si puo dire a 650 metri di errore');
  });
});

prova('IMPRECISI: resta quello che e vero lo stesso', () => {
  /* il paesaggio e a chilometri: mezzo chilometro di errore non lo sposta.
     La strada la conferma il cercatore, non il GPS. E una scheda non dice
     dove sei: racconta una cosa. */
  ['paesaggio', 'strada'].forEach((c) => {
    if (!a.serve(c, 'servizi', SBALLATO)) guasto(c + ' resta vero anche impreciso');
  });
  if (!a.serve('scheda', 'cultura', SBALLATO)) guasto('una scheda si puo raccontare lo stesso');
});

prova('IMPRECISI: una cosa chiesta si risponde comunque', () => {
  if (!a.serve('cenno', 'servizi', { aPiedi: true, preciso: false, chiesto: true }))
    guasto('se la chiede, gli si risponde — sara lui a sapere quanto fidarsi');
});

prova('PRECISI: non cambia niente di quello che c era prima', () => {
  const buono = { aPiedi: true, preciso: true };
  ['cenno', 'scena', 'passaggio', 'incrocio', 'avviso'].forEach((c) => {
    if (!a.serve(c, 'servizi', buono)) guasto(c + ' con la posizione buona si dice');
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della regola');
process.exit(passate === fatti.length ? 0 : 1);
