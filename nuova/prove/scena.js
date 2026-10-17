/* LE PROVE DELLA SCENA — nuova Yourbea
   «Turismo descrive la realtà circostante, anche per non vedenti. I non
   vedenti sono i nostri utenti, e per i turisti.» (Vince, 15/10)
   Si lancia:  node nuova/prove/scena.js                                     */

'use strict';
const Scena = require('../parti/scena.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* metri veri, così le distanze delle prove sono quelle che si camminano */
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
  const s = Scena({ dist, verso, ora: () => adesso });
  return { s, passano(ms) { adesso += ms; } };
}
const QUI = { lat: 44.8029, lon: 10.3289 };
function spostato(dlat, dlon) { return [QUI.lat + dlat, QUI.lon + dlon]; }

prova('le distanze si dicono in passi, non solo in metri', () => {
  /* «una quarantina di passi» si cammina; «trenta metri» si deve convertire */
  const w = mondo();
  if (!/pochi passi/.test(w.s.passi(2))) guasto('due metri sono pochi passi');
  if (!/passi/.test(w.s.passi(30))) guasto('trenta metri vanno detti in passi: ' + w.s.passi(30));
});

prova('gli attraversamenti si contano, non si elencano', () => {
  /* la prima cosa che Vince ha chiesto provandola in strada */
  const w = mondo();
  const tanti = [];
  for (let i = 0; i < 5; i++) tanti.push({ cosa: 'attraversamento', semaforo: false, lat: QUI.lat + 0.0001 * i, lon: QUI.lon });
  const t = w.s.attraversamenti(QUI, tanti);
  if (!/serie di attraversamenti/.test(t)) guasto('cinque attraversamenti vanno riassunti: ' + t);
  if (/\. .*attraversamento.*\. /.test(t)) guasto('non si elencano uno per uno');
});

prova('di un attraversamento si dice la cosa che cambia qualcosa', () => {
  const w = mondo();
  const uno = w.s.attraversamenti(QUI, [{ cosa: 'attraversamento', semaforo: true, tattile: true, lat: QUI.lat + 0.0002, lon: QUI.lon }]);
  if (!/semaforo/.test(uno)) guasto('il semaforo è la cosa che conta: ' + uno);
  if (!/tattile/.test(uno)) guasto('il percorso tattile pure');
});

prova('dice che forma ha il posto e quanto è largo', () => {
  const w = mondo();
  const piazza = { cosa: 'piazza', nome: 'Piazza Garibaldi', punti: [
    spostato(0.0003, 0), spostato(0, 0.0004), spostato(-0.0003, 0), spostato(0, -0.0004)] };
  const d = w.s.descrivi({ qui: QUI, direzione: 0, mappa: { aree: [piazza], punti: [
    { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0002, lon: QUI.lon }], alberi: [] } });
  if (!d) guasto('con una piazza e una farmacia qualcosa da dire c\'è');
  if (d && !/Piazza Garibaldi/.test(d.testo)) guasto('il nome della piazza: ' + d.testo);
  if (d && !/pass/.test(d.testo)) guasto('quanto è larga, in passi: ' + d.testo);
});

prova('una chiesa lì accanto non è il posto dove sei', () => {
  /* 16/10, provando in Utilità: «Sei in Chiesa di Santa Lucia, larga una
     ottantina di passi» — e la chiesa era dall'altra parte della strada */
  const w = mondo();
  const chiesa = { cosa: 'chiesa', nome: 'Chiesa di Santa Lucia', punti: [
    [QUI.lat + 0.0004, QUI.lon + 0.0002], [QUI.lat + 0.0004, QUI.lon + 0.0008],
    [QUI.lat + 0.0009, QUI.lon + 0.0008], [QUI.lat + 0.0009, QUI.lon + 0.0002]] };
  if (w.s.laForma(QUI, [chiesa])) guasto('ha detto che sei dentro una chiesa che hai accanto');
  const dentro = { lat: QUI.lat + 0.00065, lon: QUI.lon + 0.0005 };
  if (!w.s.laForma(dentro, [chiesa])) guasto('standoci dentro invece va detto');
});

prova('dice da che parte rispetto a te, non i gradi', () => {
  const w = mondo();
  const d = w.s.descrivi({ qui: QUI, direzione: 0, direzioneBuona: true, strada: 'Via Mazzini',
    mappa: { aree: [], alberi: [], punti: [
      { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0003, lon: QUI.lon },
      { cosa: 'bar', servizio: 'bar', nome: 'Bar Roma', lat: QUI.lat, lon: QUI.lon + 0.0004 }] } });
  if (!d) guasto('due servizi vicini sono una scena');
  if (d && !/davanti a te/.test(d.testo)) guasto('quella dritta davanti va detta così: ' + d.testo);
  if (d && !/destra/.test(d.testo)) guasto('e quella a est, con la faccia a nord, è a destra: ' + d.testo);
});

prova('senza bussola NON si dicono i punti cardinali', () => {
  const w = mondo();
  const d = w.s.descrivi({ qui: QUI, direzione: 0, direzioneBuona: false, strada: 'Via Mazzini',
    mappa: { aree: [], alberi: [], punti: [
      { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0003, lon: QUI.lon },
      { cosa: 'bar', servizio: 'bar', nome: 'Bar Roma', lat: QUI.lat, lon: QUI.lon + 0.0004 }] } });
  if (d && /destra|sinistra|davanti a te/.test(d.testo)) guasto('senza sapere come sei girato, destra e sinistra sono bugie: ' + d.testo);
  /* «ma io non so nord sud est dove sono»: si dice solo quanto manca */
  if (d && /\ba nord\b|\ba est\b|\ba sud\b|\ba ovest\b/.test(d.testo)) guasto('il nord a chi cammina non dice niente: ' + d.testo);
  if (d && !/passi/.test(d.testo)) guasto('resta la distanza, che è vera lo stesso: ' + d.testo);
});

prova('non dice mai dove mettere i piedi', () => {
  const w = mondo();
  const d = w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via Mazzini', mappa: { aree: [], alberi: [], punti: [
    { cosa: 'attraversamento', semaforo: true, lat: QUI.lat + 0.0001, lon: QUI.lon },
    { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0003, lon: QUI.lon }] } });
  /* «attraversamento» è un nome e va detto; «attraversa» è un ordine e no */
  if (d && /\battraversa\b|\bgira a\b|\bvai (?:a destra|dritto)\b|\bprosegui\b|\battraversa qui\b/i.test(d.testo)) {
    guasto('il GPS sbaglia di venti metri: ' + d.testo);
  }
});

prova('non più di quattro cose in una frase', () => {
  const w = mondo();
  const punti = [];
  for (let i = 0; i < 9; i++) punti.push({ cosa: 'bar', servizio: 'bar', nome: 'Bar ' + i, lat: QUI.lat + 0.00005 * (i + 1), lon: QUI.lon });
  const d = w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via Mazzini', mappa: { aree: [], alberi: [], punti } });
  const quante = d.testo.split(';').length;
  if (quante > 3) guasto('una descrizione lunga non si ricorda: ' + d.testo);
});

prova('la stessa scena non si ripete subito', () => {
  const w = mondo();
  const mappa = { aree: [], alberi: [], punti: [
    { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0003, lon: QUI.lon },
    { cosa: 'bar', servizio: 'bar', nome: 'Bar Roma', lat: QUI.lat, lon: QUI.lon + 0.0004 }] };
  const primo = w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via Mazzini', mappa });
  if (!primo) guasto('la prima volta si dice');
  if (w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via Mazzini', mappa })) guasto('due volte di fila no');
  /* e ogni PEZZO ha il suo riposo: i servizi 150 secondi, gli
     attraversamenti 180, gli alberi 300. Passati quelli, si ridice. */
  w.passano(320000);
  if (!w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via Mazzini', mappa })) guasto('passato il riposo si può ridire');
});

prova('non ripete gli attraversamenti a ogni frase', () => {
  /* «diceva sempre più avanti ci sono dei passaggi pedonali» (Vince, 16/10,
     camminando a Roma): ce n'è uno a ogni incrocio, e finivano in ogni
     descrizione. La seconda volta non dicono più niente di nuovo. */
  const w = mondo();
  const attr = [];
  for (let i = 0; i < 4; i++) attr.push({ cosa: 'attraversamento', semaforo: false, lat: QUI.lat + 0.0001 * i, lon: QUI.lon });
  const mappa = { aree: [], alberi: [], punti: attr.concat([
    { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0002, lon: QUI.lon },
    { cosa: 'bar', servizio: 'bar', nome: 'Bar Roma', lat: QUI.lat, lon: QUI.lon + 0.0003 },
    { cosa: 'panetteria', servizio: 'panetteria', nome: 'Forno Anna', lat: QUI.lat - 0.0002, lon: QUI.lon }]) };
  const primo = w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via dei Corazzieri', mappa });
  if (!primo || !/attraversamenti/.test(primo.testo)) guasto('la prima volta gli attraversamenti si dicono');
  w.passano(25000);
  const dopo = w.s.descrivi({ qui: { lat: QUI.lat + 0.0006, lon: QUI.lon }, direzione: 0, strada: 'Via dei Corazzieri', mappa });
  if (dopo && /attraversamenti/.test(dopo.testo)) guasto('venticinque secondi dopo li ha ridetti: ' + dopo.testo);
});

prova('la scena è un cenno: non taglia mai un racconto', () => {
  const w = mondo();
  const d = w.s.descrivi({ qui: QUI, direzione: 0, strada: 'Via Mazzini', mappa: { aree: [], alberi: [], punti: [
    { cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani', lat: QUI.lat + 0.0002, lon: QUI.lon },
    { cosa: 'bar', servizio: 'bar', nome: 'Bar Roma', lat: QUI.lat, lon: QUI.lon + 0.0003 }] } });
  if (!d) guasto('aveva qualcosa da dire');
  if (d && d.livello !== 'cenno') guasto('a livello di guida taglia in faccia una chiesa raccontata a metà');
});

prova('gli alberi si dicono da che lato stanno', () => {
  const w = mondo();
  const alberi = [];
  for (let i = 0; i < 9; i++) alberi.push(spostato(0.00004 * (i + 1), 0.0002));
  const d = w.s.descrivi({ qui: QUI, direzione: 0, direzioneBuona: true, strada: 'Via Mazzini',
    mappa: { aree: [], alberi, punti: [] } });
  if (!d || !/alberi/i.test(d.testo)) guasto('nove alberi sono una cosa che orienta: ' + (d && d.testo));
});

prova('il semaforo che SUONA viene prima di tutto', () => {
  /* per chi non vede è la differenza fra attraversare da solo e aspettare
     qualcuno: se c'è, è la prima cosa da dire di un attraversamento */
  const w = mondo();
  const uno = w.s.attraversamenti(QUI, [{ cosa: 'attraversamento', semaforo: true, suona: true,
                                          lat: QUI.lat + 0.0002, lon: QUI.lon }]);
  if (!/acustico/.test(uno)) guasto('non ha detto che suona: ' + uno);
  const tanti = [];
  for (let i = 0; i < 3; i++) tanti.push({ cosa: 'attraversamento', semaforo: true, suona: true, lat: QUI.lat + 0.0001 * i, lon: QUI.lon });
  const piu = w.s.attraversamenti(QUI, tanti);
  if (!/acustico/.test(piu)) guasto('anche quando sono tanti: ' + piu);
});

/* ============================================================
   AI LATI — «cioè basta dire: a destra trovi il ristorante, a sinistra
   questo; così copri il buco e descrivi» (Vince, 16/10).
   Il buco: in mezzo a un viale la via può non arrivare da Photon, e dove
   prima si diceva il nome di un bar al posto della strada ora si tacerebbe.
   Qui si controlla che al posto del silenzio arrivi una descrizione, e che
   non dica mai una parte sbagliata.                                        */

/* guardando a nord (direzione 0): est è a destra, ovest a sinistra */
const A_DESTRA = { lat: QUI.lat, lon: QUI.lon + 0.00035, nome: 'Da Mario', cosa: 'ristorante' };
const A_SINISTRA = { lat: QUI.lat, lon: QUI.lon - 0.00035, nome: 'Pirani', cosa: 'farmacia' };
const DAVANTI = { lat: QUI.lat + 0.00035, lon: QUI.lon, nome: 'Il Portico', cosa: 'bar' };

prova('AI LATI: a destra una cosa, a sinistra una cosa', () => {
  const w = mondo();
  const d = w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true,
                         punti: [A_DESTRA, A_SINISTRA] });
  if (!d) { guasto('non ha detto niente'); return; }
  if (!/^A destra trovi il ristorante Da Mario/.test(d.testo)) guasto('destra sbagliata: ' + d.testo);
  if (!/a sinistra la farmacia Pirani\.$/.test(d.testo)) guasto('sinistra sbagliata: ' + d.testo);
  if (d.livello !== 'cenno') guasto('deve essere un cenno, non tagliare un racconto');
  console.log('      → ' + d.testo);
});

prova('REGOLA b — senza bussola non si dice destra e sinistra', () => {
  const w = mondo();
  if (w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: false, punti: [A_DESTRA, A_SINISTRA] }))
    guasto('ha detto una parte senza sapere come sei girato');
  if (w.s.aiLati({ qui: QUI, direzioneBuona: true, punti: [A_DESTRA, A_SINISTRA] }))
    guasto('ha detto una parte senza direzione');
});

prova('REGOLA c — quello che hai davanti non è «a destra»', () => {
  const w = mondo();
  const d = w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [DAVANTI] });
  if (d) guasto('ha messo di lato una cosa che hai davanti: ' + d.testo);
});

prova('REGOLA c — e nemmeno quello che hai dietro', () => {
  const w = mondo();
  const dietro = { lat: QUI.lat - 0.00035, lon: QUI.lon, nome: 'Il Portico', cosa: 'bar' };
  if (w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [dietro] }))
    guasto('ha messo di lato una cosa che hai dietro');
});

prova('REGOLA a — una per lato, non un elenco', () => {
  const w = mondo();
  const tre = [A_DESTRA,
               { lat: QUI.lat, lon: QUI.lon + 0.00045, nome: 'Conad', cosa: 'supermercato' },
               { lat: QUI.lat, lon: QUI.lon + 0.00055, nome: 'Rossi', cosa: 'tabaccheria' }];
  const d = w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: tre });
  if (!d) { guasto('non ha detto niente'); return; }
  if (/Conad|Rossi/.test(d.testo)) guasto('ha elencato: ' + d.testo);
  if (!/Da Mario/.test(d.testo)) guasto('non ha preso il più vicino: ' + d.testo);
});

prova('REGOLA d — gli stessi due nomi non si ridicono subito', () => {
  const w = mondo();
  const uno = w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [A_DESTRA, A_SINISTRA] });
  if (!uno) { guasto('la prima non è uscita'); return; }
  w.passano(20000);
  if (w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [A_DESTRA, A_SINISTRA] }))
    guasto('ha ridetto le stesse due cose dopo venti secondi');
  w.passano(200000);
  if (!w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [A_DESTRA, A_SINISTRA] }))
    guasto('dopo tre minuti si può ridire');
});

prova('un lato solo: si dice quello e basta', () => {
  const w = mondo();
  const d = w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [A_SINISTRA] });
  if (!d) { guasto('non ha detto niente'); return; }
  if (/a destra/.test(d.testo)) guasto('ha inventato la destra: ' + d.testo);
  if (!/^A sinistra trovi la farmacia Pirani\.$/.test(d.testo)) guasto('frase sgangherata: ' + d.testo);
});

prova('niente intorno: niente da dire, e non scoppia', () => {
  const w = mondo();
  if (w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [] })) guasto('ha parlato nel vuoto');
  if (w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true })) guasto('ha parlato senza punti');
  const senzaNome = { lat: QUI.lat, lon: QUI.lon + 0.00035, cosa: 'panchina' };
  if (w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [senzaNome] }))
    guasto('ha detto una cosa senza nome');
});

prova('il nome da solo non dice niente: si dice anche cos\'è', () => {
  const w = mondo();
  const d = w.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true,
                         punti: [{ lat: QUI.lat, lon: QUI.lon + 0.0003, nome: 'Farmacia Pirani', cosa: 'farmacia' }] });
  if (!d) { guasto('non ha detto niente'); return; }
  if (/farmacia Farmacia/i.test(d.testo)) guasto('ha raddoppiato la parola: ' + d.testo);
});

/* «IL STAZIONE» — provando a Vietri il 18/10 nel banco del browser.
   L'articolo si decideva dalla «a» finale, e in italiano finiscono in -e
   tutti e due i generi.                                                   */
prova('l\'articolo giusto davanti al tipo', () => {
  const w = mondo();
  const casi = [
    [{ lat: QUI.lat, lon: QUI.lon + 0.00035, nome: 'Vietri sul Mare-Amalfi', cosa: 'stazione' }, /la stazione/],
    [{ lat: QUI.lat, lon: QUI.lon + 0.00035, nome: 'Da Mario', cosa: 'ristorante' }, /il ristorante/],
    [{ lat: QUI.lat, lon: QUI.lon + 0.00035, nome: 'Pirani', cosa: 'farmacia' }, /la farmacia/],
    [{ lat: QUI.lat, lon: QUI.lon + 0.00035, nome: 'Centrale', cosa: 'fermata' }, /la fermata/]
  ];
  casi.forEach(([p2, atteso]) => {
    const w2 = mondo();
    const d = w2.s.aiLati({ qui: QUI, direzione: 0, direzioneBuona: true, punti: [p2] });
    if (!d) { guasto('non ha detto niente per ' + p2.cosa); return; }
    if (!atteso.test(d.testo)) guasto('articolo sbagliato: ' + d.testo);
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della scena');
process.exit(passate === fatti.length ? 0 : 1);
