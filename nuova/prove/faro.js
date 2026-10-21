/* LE PROVE DEL FARO — nuova Yourbea
   L'idea viene da Microsoft Soundscape (licenza MIT), coi suoi numeri:
   trenta gradi in rotta, dieci metri per «ci sei», cinquanta metri fra un
   annuncio e l'altro.
   Si lancia:  node nuova/prove/faro.js                                   */

'use strict';
const Faro = require('../parti/faro.js');

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
function verso(la1, lo1, la2, lo2) {
  const r = Math.PI / 180;
  const y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
const f = () => Faro({ dist, verso });
const QUI = { lat: 41.9000, lon: 12.4900 };
const NORD = { lat: 41.9030, lon: 12.4900 };      // circa 330 metri a nord

prova('IN ROTTA a trenta gradi, fuori rotta oltre', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  if (!x.dove(QUI, 0, true).inRotta) guasto('guardando dritto si è in rotta');
  if (!x.dove(QUI, 25, true).inRotta) guasto('venticinque gradi è ancora in rotta');
  if (x.dove(QUI, 50, true).inRotta) guasto('cinquanta gradi è fuori rotta');
  if (x.dove(QUI, 180, true).inRotta) guasto('di spalle non si è in rotta');
});

prova('DA CHE PARTE: il segno dice destra o sinistra', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  /* guardando a est, la meta a nord sta a sinistra: rel negativo */
  if (!(x.dove(QUI, 90, true).rel < 0)) guasto('guardando a est, il nord è a sinistra');
  if (!(x.dove(QUI, 270, true).rel > 0)) guasto('guardando a ovest, il nord è a destra');
});

prova('SI SPEGNE DA SOLO a dieci metri', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  const addosso = { lat: NORD.lat - 0.00005, lon: NORD.lon };
  const d = x.passo(addosso, 0, true);
  if (!d || d.tipo !== 'faro-arrivato') { guasto('arrivati, si spegne: ' + JSON.stringify(d)); return; }
  if (x.acceso()) guasto('è rimasto acceso');
});

prova('LA DISTANZA ogni cinquanta metri, e solo scendendo', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  x.passo(QUI, 0, true);                                   // il primo giro si segna e tace
  let dette = 0;
  for (let i = 1; i <= 30; i++) {
    const avanti = { lat: QUI.lat + i * 0.0001, lon: QUI.lon };
    const d = x.passo(avanti, 0, true);
    if (d && d.tipo === 'faro-manca') dette++;
    if (d && d.tipo === 'faro-arrivato') break;
  }
  if (dette < 3 || dette > 8) guasto('su trecento metri gli annunci sono ' + dette + ', dovrebbero essere una manciata');
});

prova('tornando indietro NON ridice la distanza', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  x.passo({ lat: QUI.lat + 0.002, lon: QUI.lon }, 0, true);
  const indietro = x.passo(QUI, 0, true);
  if (indietro && indietro.tipo === 'faro-manca') guasto('allontanandosi non si annuncia');
});

prova('SENZA BUSSOLA non si accende: il suono finirebbe dalla parte sbagliata', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  if (x.dove(QUI, 0, false)) guasto('senza direzione buona non si può puntare');
  if (x.dove(QUI, undefined, true)) guasto('senza direzione non si può puntare');
});

prova('si spegne quando lo si chiede, e due volte non scoppia', () => {
  const x = f();
  x.accendi('casa', NORD.lat, NORD.lon);
  if (!x.spegni()) guasto('deve spegnersi');
  if (x.acceso()) guasto('è rimasto acceso');
  if (x.spegni()) guasto('spegnerlo due volte non dice niente');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove del faro');
process.exit(passate === fatti.length ? 0 : 1);
