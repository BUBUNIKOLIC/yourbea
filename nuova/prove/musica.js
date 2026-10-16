/* LE PROVE DELLA MUSICA — nuova Yourbea
   «Sì, solo per il turismo e a basso volume» (Vince, 16/10). Ogni prova qui
   sotto è una cosa che, fatta male, mette in pericolo o dà fastidio a chi
   cammina: il nostro utente principale non vede e sta in strada.
   Si lancia:  node nuova/prove/musica.js                                    */

'use strict';
const fs = require('fs');
const path = require('path');
const Musica = require('../parti/musica.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

function mondo() {
  let adesso = 1000000;
  const m = Musica({ ora: () => adesso });
  return { m, passano(ms) { adesso += ms; },
           /* il volume sale piano: per vedere dove arriva si lascia girare */
           aRegime(stato) { let d; for (let i = 0; i < 30; i++) d = m.decide(stato); return d; } };
}
const TURISMO = { modo: 'cultura', staParlando: false };

prova('in Utilità non suona mai, nemmeno accesa a mano', () => {
  /* lì si cammina per arrivare da qualche parte, e chi non vede ha bisogno
     di tutte le orecchie che ha */
  const w = mondo();
  w.m.accendi(true);
  const d = w.aRegime({ modo: 'servizi', staParlando: false });
  if (d.suona) guasto('in Utilità deve restare muta: volume ' + d.volume);
});

prova('in Turismo suona, ma piano', () => {
  const w = mondo();
  const d = w.aRegime(TURISMO);
  if (!d.suona) guasto('in Turismo la musica c\'è');
  if (d.volume > 0.6) guasto('«a basso volume»: ' + d.volume + ' è troppo');
});

prova('se l\'utente la spegne, resta spenta', () => {
  const w = mondo();
  w.m.accendi(false);
  const d = w.aRegime(TURISMO);
  if (d.suona) guasto('spenta vuol dire spenta: ' + d.volume);
  w.m.accendi(true);
  if (!w.aRegime(TURISMO).suona) guasto('e riaccesa torna');
});

prova('mentre l\'app parla la musica si abbassa, e poi risale', () => {
  /* la voce non si deve mai capire a fatica */
  const w = mondo();
  const prima = w.aRegime(TURISMO).volume;
  const mentre = w.m.decide({ modo: 'cultura', staParlando: true, livello: 'guida' });
  if (mentre.volume >= prima) guasto('sotto la voce deve scendere: ' + prima + ' → ' + mentre.volume);
  if (!mentre.suona) guasto('ma non sparire del tutto, se no si sente lo stacco');
  const dopo = w.aRegime(TURISMO);
  if (dopo.volume <= mentre.volume) guasto('finita la frase deve risalire: ' + dopo.volume);
});

prova('l\'emergenza la zittisce del tutto', () => {
  /* se uno sta chiedendo aiuto, nessun sottofondo */
  const w = mondo();
  w.aRegime(TURISMO);
  const d = w.m.decide({ modo: 'cultura', staParlando: true, livello: 'emergenza' });
  if (d.suona) guasto('in emergenza niente musica, nemmeno piano: ' + d.volume);
});

prova('su una svolta o un attraversamento tace, e non torna subito', () => {
  /* anche in Turismo chi ascolta può essere una persona che non vede: la
     musica non deve stare addosso alla frase che dice dove si gira */
  const w = mondo();
  w.aRegime(TURISMO);
  w.m.taciPerLaStrada();
  if (w.m.decide(TURISMO).suona) guasto('sull\'attraversamento deve tacere');
  w.passano(3000);
  if (w.m.decide(TURISMO).suona) guasto('e non tornare dopo tre secondi');
  w.passano(10000);
  if (!w.aRegime(TURISMO).suona) guasto('passata la strada, torna');
});

prova('torna su piano, non di scatto', () => {
  /* il ritorno della musica a volume pieno sembra un errore dell'app */
  const w = mondo();
  w.aRegime(TURISMO);
  w.m.decide({ modo: 'cultura', staParlando: true, livello: 'guida' });
  const uno = w.m.decide(TURISMO).volume;
  const due = w.m.decide(TURISMO).volume;
  if (uno > 0.3) guasto('il primo passo dopo la voce è piccolo, non ' + uno);
  if (due <= uno) guasto('ma sale: ' + uno + ' → ' + due);
});

prova('il tappeto cambia con l\'ora, e i tre file ci sono davvero', () => {
  const w = mondo();
  if (w.m.quale(new Date('2026-10-16T22:30:00')) !== 'notturno') guasto('di notte, il notturno');
  if (w.m.quale(new Date('2026-10-16T13:00:00')) !== 'chiostro') guasto('di pomeriggio, il chiostro');
  if (w.m.quale(new Date('2026-10-16T08:00:00')) !== 'cammino') guasto('di mattina, il cammino');
  /* e non si chiede un file che non c'è: si guarda nella cartella */
  ['cammino', 'chiostro', 'notturno'].forEach((b) => {
    const dove = path.join(__dirname, '..', 'musica', b + '.m4a');
    if (!fs.existsSync(dove)) guasto('manca il file ' + b + '.m4a');
  });
  const dadove = path.join(__dirname, '..', 'musica', 'DA-DOVE-VIENE.md');
  if (!fs.existsSync(dadove)) guasto('senza DA-DOVE-VIENE.md non si sa con che licenza è');
  else {
    const t = fs.readFileSync(dadove, 'utf8');
    if (!/licenza/i.test(t)) guasto('e il file deve dire la licenza');
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della musica');
process.exit(passate === fatti.length ? 0 : 1);
