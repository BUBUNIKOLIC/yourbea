/* LE PROVE DELLE FRASI CHE IMPOSTANO — nuova Yourbea
   «Un non vedente deve fare tutto a voce» (Vince, 15/10): niente dev'essere
   raggiungibile solo col dito. Qui si prova che le frasi vengono capite, e
   che un numero dettato si rilegge prima di fidarsene.
   Si lancia:  node nuova/prove/dettatura.js                                 */

'use strict';
const Dettatura = require('../parti/dettatura.js');
const d = Dettatura();

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

prova('«casa mia è…» registra l\'indirizzo', () => {
  const r = d.capisci('casa mia è via Vincenzo Gioberti 5, Latina');
  if (!r || r.cosa !== 'casa') guasto('non ha capito dove abita');
  if (r && !/Gioberti/.test(r.indirizzo)) guasto('ha perso la via: ' + (r && r.indirizzo));
  const r2 = d.capisci('abito in via dei Corazzieri 12');
  if (!r2 || r2.cosa !== 'casa') guasto('«abito in» è il modo più normale di dirlo');
});

prova('«mi chiamo…» serve al messaggio d\'aiuto', () => {
  const r = d.capisci('mi chiamo Vince');
  if (!r || r.cosa !== 'io' || r.nome !== 'Vince') guasto('non ha capito il nome: ' + JSON.stringify(r));
});

prova('il contatto si detta tutto in una frase', () => {
  const r = d.capisci('il mio contatto è Mariolina, numero tre tre tre uno due tre quattro cinque sei sette');
  if (!r || r.cosa !== 'contatto') guasto('non ha capito: ' + JSON.stringify(r));
  if (r && r.nome !== 'Mariolina') guasto('nome sbagliato: ' + r.nome);
  if (r && r.numero !== '3331234567') guasto('numero sbagliato: ' + r.numero);
});

prova('le cifre scritte e quelle dette valgono uguale', () => {
  /* il riconoscimento di iOS passa dall'uno all'altro senza avvisare */
  if (d.cifre('tre tre tre 12 34 567') !== '3331234567') guasto('mischiate: ' + d.cifre('tre tre tre 12 34 567'));
  if (d.cifre('333 123 4567') !== '3331234567') guasto('solo cifre: ' + d.cifre('333 123 4567'));
});

prova('il numero si rilegge una cifra per volta', () => {
  /* letto come numero intero non si controlla: «tremiliardi...» */
  if (d.leggiCifre('3331234567') !== '3, 3, 3, 1, 2, 3, 4, 5, 6, 7') guasto('non si capisce a orecchio');
});

prova('il nome senza numero non diventa un contatto a metà', () => {
  const r = d.capisci('il mio contatto è Mariolina');
  if (!r || r.cosa !== 'contatto-senza-numero') guasto('deve chiedere il numero, non salvare a metà');
});

prova('il sì e il no, per confermare il numero', () => {
  if ((d.capisci('sì') || {}).cosa !== 'si') guasto('il sì non si capisce');
  if ((d.capisci('no') || {}).cosa !== 'no') guasto('il no non si capisce');
});

prova('una frase qualunque non diventa un comando', () => {
  /* il microfono è aperto tutto il giorno: sente conversazioni intere */
  if (d.capisci('allora come si trova')) guasto('ha preso per un comando una frase detta a un\'altra persona');
  if (d.capisci('ti è arrivato')) guasto('idem');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove delle frasi dettate');
process.exit(passate === fatti.length ? 0 : 1);
