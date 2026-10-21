/* LE PROVE DEI PASSAGGI — nuova Yourbea
   «Serve uno strumento per avere dati su quello che c'è intorno man mano
   che avanziamo su una strada» (Vince, 16/10). Dire le cose nel momento in
   cui ci passi davanti è la differenza fra una cartina letta ad alta voce e
   qualcuno che cammina con te.
   Si lancia:  node nuova/prove/passaggi.js                                  */

'use strict';
const Passaggi = require('../parti/passaggi.js');

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
function mondo(t0) {
  let adesso = t0 || 1000000;
  return { p: Passaggi({ dist, verso, ora: () => adesso }), passano(ms) { adesso += ms; } };
}

const QUI = { lat: 41.8230, lon: 12.4814 };
const vicino = (dlat, dlon) => ({ lat: QUI.lat + dlat, lon: QUI.lon + dlon });
const FARMACIA = Object.assign({ cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani' }, vicino(0, 0.00012));
const PANCHINA = Object.assign({ cosa: 'panchina', servizio: 'panchina', nome: '' }, vicino(0.00008, 0));
const NEGOZIO_MUTO = Object.assign({ cosa: 'negozio di vestiti', servizio: 'negozio di vestiti', nome: '' }, vicino(0, 0.00010));
const LONTANO = Object.assign({ cosa: 'bar', servizio: 'bar', nome: 'Bar Roma' }, vicino(0.0009, 0));

prova('dice quello che passi quando ce l\'hai di fianco', () => {
  const w = mondo();
  const d = w.p.prossimo({ qui: QUI, punti: [FARMACIA], direzione: 0, direzioneBuona: true });
  if (!d) guasto('a dieci metri va detto');
  if (d && !/Farmacia Pirani/.test(d.testo)) guasto('ha detto: ' + d.testo);
  if (d && !/destra/.test(d.testo)) guasto('andando a nord, una cosa a est è a destra: ' + d.testo);
});

prova('quello lontano non si annuncia: a quaranta metri non lo trovi', () => {
  const w = mondo();
  if (w.p.prossimo({ qui: QUI, punti: [LONTANO], direzione: 0, direzioneBuona: true })) guasto('ha annunciato un bar a cento metri');
});

prova('la stessa cosa non si dice due volte', () => {
  const w = mondo();
  if (!w.p.prossimo({ qui: QUI, punti: [FARMACIA], direzione: 0, direzioneBuona: true })) guasto('la prima volta si dice');
  w.passano(20000);
  if (w.p.prossimo({ qui: QUI, punti: [FARMACIA], direzione: 0, direzioneBuona: true })) guasto('ripassandoci davanti l\'ha ridetta');
});

prova('cambiando strada si ricomincia da capo', () => {
  const w = mondo();
  w.p.prossimo({ qui: QUI, punti: [FARMACIA], direzione: 0, direzioneBuona: true });
  w.p.stradaNuova();
  w.passano(20000);
  if (!w.p.prossimo({ qui: QUI, punti: [FARMACIA], direzione: 0, direzioneBuona: true })) guasto('in una strada nuova si ridice');
});

prova('non più di una ogni otto secondi: non è una filastrocca', () => {
  const w = mondo();
  const altra = Object.assign({ cosa: 'bar', servizio: 'bar', nome: 'Bar Poeta' }, vicino(0.00005, 0.00005));
  if (!w.p.prossimo({ qui: QUI, punti: [FARMACIA, altra], direzione: 0, direzioneBuona: true })) guasto('la prima si dice');
  if (w.p.prossimo({ qui: QUI, punti: [FARMACIA, altra], direzione: 0, direzioneBuona: true })) guasto('due nello stesso istante');
  w.passano(9000);
  if (!w.p.prossimo({ qui: QUI, punti: [FARMACIA, altra], direzione: 0, direzioneBuona: true })) guasto('dopo nove secondi tocca alla seconda');
});

prova('un negozio senza nome non si dice, una panchina sì', () => {
  /* «negozio di vestiti» non dice niente a nessuno; una panchina serve,
     perché ci si siede */
  const w = mondo();
  if (w.p.vaDetto(NEGOZIO_MUTO)) guasto('un negozio senza nome è rumore');
  if (!w.p.vaDetto(PANCHINA)) guasto('la panchina serve anche senza nome');
});

prova('gli attraversamenti no: quelli li riassume la scena', () => {
  const w = mondo();
  const att = Object.assign({ cosa: 'attraversamento', servizio: 'attraversamento', semaforo: false }, vicino(0, 0.00008));
  if (w.p.vaDetto(att)) guasto('detti uno per uno diventano la filastrocca di cui Vince si è lamentato');
});

prova('senza sapere come cammini, niente destra e sinistra e niente nord', () => {
  const w = mondo();
  const d = w.p.prossimo({ qui: QUI, punti: [FARMACIA] });
  if (!d) guasto('il nome si dice lo stesso');
  if (d && /destra|sinistra|davanti/.test(d.testo)) guasto('inventate: ' + d.testo);
  if (d && /\b(?:nord|sud|est|ovest)\b/i.test(d.testo)) guasto('i cardinali no: ' + d.testo);
});

prova('se il nome non dice cos\'è, si aggiunge il tipo', () => {
  const w = mondo();
  const daMario = Object.assign({ cosa: 'bar', servizio: 'bar', nome: 'Da Mario' }, vicino(0, 0.00012));
  const d = w.p.prossimo({ qui: QUI, punti: [daMario], direzione: 0, direzioneBuona: true });
  if (d && !/bar/.test(d.testo)) guasto('«Da Mario» da solo non fa capire che è un bar: ' + d.testo);
});

prova('di una fermata si dicono le LINEE, non che esiste', () => {
  /* «è importante per i non vedenti: fermate autobus, treni, metro»
     (Vince, 16/10). Sapere che c'è una fermata non porta da nessuna
     parte: serve sapere cosa ci passa. */
  const w = mondo();
  const fermata = Object.assign({ cosa: "fermata dell'autobus", servizio: "fermata dell'autobus",
                                  nome: 'Corazzieri', linee: '671;773' }, vicino(0, 0.00012));
  const d = w.p.prossimo({ qui: QUI, punti: [fermata], direzione: 0, direzioneBuona: true });
  if (!d) guasto('una fermata a dieci metri va detta');
  if (d && !/671/.test(d.testo)) guasto('senza le linee non serve: ' + d.testo);
  if (d && !/Corazzieri/.test(d.testo)) guasto('e col suo nome: ' + d.testo);
  if (d && d.livello !== 'guida') guasto('una fermata non è un cenno: è il modo di andarsene da lì');
});

prova('l\'ingresso della metropolitana si dice anche senza nome', () => {
  const w = mondo();
  const metro = Object.assign({ cosa: 'ingresso della metropolitana', servizio: 'ingresso della metropolitana', nome: '' }, vicino(0.00008, 0));
  if (!w.p.vaDetto(metro)) guasto('un vedente lo trova dalla scalinata, chi non vede no');
});

prova('gli orari: si dice aperto o chiuso solo quando si è sicuri', () => {
  /* andare fino a una farmacia chiusa è una camminata buttata; ma gli
     orari di OpenStreetMap sanno essere complicatissimi, e un «è aperto»
     sbagliato è peggio del silenzio */
  const w = mondo();
  const giovediMattina = new Date('2026-10-15T10:30:00').getTime();
  const seraTardi = new Date('2026-10-15T22:30:00').getTime();
  if (w.p.apertoAdesso('Mo-Sa 08:00-20:00', giovediMattina) !== true) guasto('alle 10:30 di giovedì è aperta');
  if (w.p.apertoAdesso('Mo-Sa 08:00-20:00', seraTardi) !== false) guasto('alle 22:30 no');
  if (w.p.apertoAdesso('Mo-Fr 09:00-13:00,16:00-19:30', giovediMattina) !== true) guasto('due fasce in un giorno');
  if (w.p.apertoAdesso('24/7', giovediMattina) !== true) guasto('24/7 è sempre aperto');
  if (w.p.apertoAdesso('Mo-Fr 08:00-20:00; PH off', giovediMattina) !== null) guasto('coi festivi non si indovina: si tace');
  if (w.p.apertoAdesso('sunrise-sunset', giovediMattina) !== null) guasto('non si sa: si tace');
  if (w.p.apertoAdesso('', giovediMattina) !== null) guasto('senza orari si tace');
});

prova('di un negozio con gli orari si dice se è aperto adesso', () => {
  const w = mondo();
  const farmacia = Object.assign({ cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani',
                                   orari: 'Mo-Sa 08:00-20:00' }, vicino(0, 0.00012));
  const d = w.p.prossimo({ qui: QUI, punti: [farmacia], direzione: 0, direzioneBuona: true,
                           quando: new Date('2026-10-15T10:30:00').getTime() });
  if (!d || !/aperta/.test(d.testo)) guasto('doveva dire che è aperta: ' + (d && d.testo));
});

/* GLI AVVISI — «importanti sono gli avvisi» (Vince, 19/10).
   Scalini, paletti e scivoli non sono descrizione: sono quello su cui uno
   inciampa. Devono uscire marcati, perche' l'app non li faccia aspettare
   e non li spenga quando chi ascolta ha chiesto «solo monumenti».       */
prova('scalini e paletti escono marcati come AVVISO, e a livello di guida', () => {
  const casi = ['scalini', 'paletto', 'scivolo del marciapiede', 'ascensore'];
  casi.forEach((cosa) => {
    const w = mondo();
    const d = w.p.prossimo({ qui: QUI, direzione: 0, direzioneBuona: true,
                             punti: [Object.assign({ cosa: cosa, servizio: cosa }, vicino(0, 0.00012))] });
    if (!d) { guasto('non ha detto niente per ' + cosa); return; }
    if (!d.avviso) guasto(cosa + ' non e marcato come avviso');
    if (d.livello !== 'guida') guasto(cosa + ' deve aspettare il suo turno, non essere buttato');
  });
});

prova('un bar non e un avviso', () => {
  const w = mondo();
  const d = w.p.prossimo({ qui: QUI, direzione: 0, direzioneBuona: true,
                           punti: [Object.assign({ cosa: 'bar', servizio: 'bar', nome: 'Da Mario' }, vicino(0, 0.00012))] });
  if (d && d.avviso) guasto('un bar marcato come avviso: ' + d.testo);
});

/* «Dà indicazioni di autofficine, pompe di benzina, che per un non vedente
   sono un ossimoro» (Vince, 20/10). Non servono nemmeno al turista a piedi:
   un distributore non e' un punto di riferimento per chi cammina.        */
prova('la roba da macchina non si annuncia a chi cammina', () => {
  ['distributore', 'benzinaio', 'officina', 'autolavaggio', 'gommista', 'carrozzeria'].forEach((cosa) => {
    const w = mondo();
    const d = w.p.prossimo({ qui: QUI, direzione: 0, direzioneBuona: true,
                             punti: [Object.assign({ cosa: cosa, servizio: cosa, nome: 'Da Gino' }, vicino(0, 0.00012))] });
    if (d) guasto('ha annunciato ' + cosa + ': ' + d.testo);
  });
});

prova('ma una farmacia si annuncia eccome', () => {
  const w = mondo();
  if (!w.p.prossimo({ qui: QUI, punti: [FARMACIA], direzione: 0, direzioneBuona: true }))
    guasto('la farmacia serve: non deve sparire col filtro');
});

/* ============================================================
   GLI AVVISI ARRIVANO PRIMA — 21/10/2026
   «È importante che in Utilità guidi il non vedente, non dica "sei qui"…
   dica dove deve andare o descriva, non dica dove è» (Vince).
   «Stai passando lo scivolo» arriva quando ci sei sopra: è una cronaca.
   Trenta passi prima è una guida.                                        */
prova('UN ATTRAVERSAMENTO SI DICE PRIMA, e in passi', () => {
  const w = mondo();
  const davanti = Object.assign({ cosa: 'attraversamento', semaforo: true, suona: true, tattile: true },
                                vicino(0.00022, 0));
  const d = w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [davanti] });
  if (!d) { guasto('a venticinque metri va detto prima'); return; }
  if (!/^Fra \d+ passi/.test(d.testo)) guasto('deve dire quanti passi mancano: ' + d.testo);
  if (!/semaforo acustico/.test(d.testo)) guasto('il semaforo che suona e la cosa piu importante: ' + d.testo);
  if (!d.avviso) guasto('e un avviso: non si spegne e non aspetta');
  console.log('      → ' + d.testo);
});

prova('quello che hai DI FIANCO non e «in arrivo»', () => {
  const w = mondo();
  const diLato = Object.assign({ cosa: 'attraversamento' }, vicino(0, 0.00025));
  if (w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [diLato] }))
    guasto('un attraversamento a novanta gradi non e davanti');
});

prova('troppo lontano non serve ancora', () => {
  const w = mondo();
  const lontano = Object.assign({ cosa: 'scalini' }, vicino(0.0006, 0));
  if (w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [lontano] }))
    guasto('a settanta metri non e ancora un avviso');
});

prova('senza bussola non si dice «davanti»', () => {
  const w = mondo();
  const davanti = Object.assign({ cosa: 'scalini', quanti: 7 }, vicino(0.00022, 0));
  if (w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: false, punti: [davanti] }))
    guasto('senza sapere come sei girato, «davanti» e una bugia');
});

prova('lo stesso avviso non si ripete mentre ci cammini verso', () => {
  const w = mondo();
  const davanti = Object.assign({ cosa: 'attraversamento' }, vicino(0.00022, 0));
  if (!w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [davanti] })) { guasto('la prima esce'); return; }
  w.passano(20000);
  if (w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [davanti] }))
    guasto('lo ha ridetto mentre ci andava');
});

prova('i gradini si contano in gradini, non in numeri sciolti', () => {
  const w = mondo();
  const sc = Object.assign({ cosa: 'scalini', quanti: 7, corrimano: true }, vicino(0.00022, 0));
  const d = w.p.inArrivo({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [sc] });
  if (/scalini, 7/.test(d.testo)) guasto('«degli scalini, 7» non si dice: ' + d.testo);
  if (!/7 scalini, col corrimano/.test(d.testo)) guasto('dice male: ' + d.testo);
  console.log('      → ' + d.testo);
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei passaggi');
process.exit(passate === fatti.length ? 0 : 1);
