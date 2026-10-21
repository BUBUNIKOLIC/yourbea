/* LE PROVE DELLA DESCRIZIONE ORIENTATIVA — Yourbea, 21/10/2026
   «Non basta leggere la pagina Wikipedia: serve un'audiodescrizione
   orientativa — dimensioni, forme, posizione nello spazio, materiali.»
   La critica è giusta, e si vede dai nostri dati di oggi:
     «Gli Scogli Castelluccio sono delle isole dell'Italia site nel mar
      Ionio. Amministrativamente appartengono al comune di Siracusa.»
   A uno fermo lì davanti non dice niente.

   LE REGOLE, in ordine di quello che serve a chi non vede:
   1. PRIMA DOVE, poi cos'è. «Sulla tua destra, a quaranta passi.»
   2. LE MISURE SI DICONO IN COSE, non in numeri. Sessantotto metri non
      si immaginano: «alto come un palazzo di ventidue piani» sì.
   3. IL MATERIALE VIENE PRIMA DELLA STORIA: è la cosa che toccheresti.
   4. LA FORMA IN PEZZI RICONOSCIBILI: una facciata, un campanile, delle
      colonne — non «in stile tardobarocco».
   5. LA STORIA RESTA, MA DOPO. Non si butta: si mette in coda, e la
      dice solo chi la chiede con «ancora».
   6. QUELLO CHE NON SI SA NON SI DICE. Niente «forse», niente «circa
      venti metri» inventati: se l'altezza non c'è, la frase ne fa a meno.
   Si lancia:  node nuova/prove/descrizione.js                            */

'use strict';
const Descrizione = require('../parti/descrizione.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}
/* l'articolo lo sa gia' fare racconto.js, con tutte le trappole che ci
   sono costate: «la chiesa cattolica chiesa di San Marco», «lo sito»,
   «il cattedrale», «la chiesa San Luigi». Qui si passa quello, non se ne
   scrive un altro. */
const Racconto = require('../parti/racconto.js');
const conArticolo = Racconto({}).conArticolo;
const d = () => Descrizione({ conArticolo });

prova('REGOLA 1: prima dove sei rispetto a lui, poi cos e', () => {
  const f = d().frase({ n: 'Duomo di Milano', t: 'cattedrale', dove: 'destra', metri: 30 });
  if (!f) { guasto('niente frase'); return; }
  const posDove = f.testo.toLowerCase().indexOf('destra');
  const posNome = f.testo.indexOf('Duomo');
  if (posDove < 0) guasto('non dice da che parte: ' + f.testo);
  if (posNome >= 0 && posDove > posNome) guasto('dice il nome prima di dove sta: ' + f.testo);
  console.log('      → ' + f.testo);
});

prova('REGOLA 2: l altezza si dice in piani, non in metri', () => {
  const f = d().frase({ n: 'Duomo di Milano', t: 'cattedrale', dove: 'davanti', metri: 40, altezza: 68 });
  if (!f) { guasto('niente frase'); return; }
  if (/68\s*metri/.test(f.testo)) guasto('dice i metri invece dei piani: ' + f.testo);
  if (!/piani/.test(f.testo)) guasto('non traduce l altezza in piani: ' + f.testo);
  console.log('      → ' + f.testo);
});

prova('una casa bassa non diventa «un piano e mezzo»', () => {
  const f = d().frase({ n: 'Cappella', t: 'cappella', dove: 'sinistra', metri: 12, altezza: 4 });
  if (f && /piani/.test(f.testo) && !/un piano|bassa|bassa come/.test(f.testo)) {
    guasto('per quattro metri dice i piani: ' + f.testo);
  }
});

prova('REGOLA 3: il materiale c e, ed e prima della storia', () => {
  const f = d().frase({ n: 'Chiesa del Carmine', t: 'chiesa', dove: 'destra', metri: 25,
                        materiali: ['laterizio'], storia: 'Fu edificata nel 1328 dai Carmelitani.' });
  if (!f) { guasto('niente frase'); return; }
  const m = f.testo.toLowerCase().indexOf('mattoni');
  const s = f.testo.indexOf('1328');
  if (m < 0) guasto('il materiale non c e (laterizio si dice «mattoni»): ' + f.testo);
  if (s >= 0 && m > s) guasto('la storia viene prima del materiale: ' + f.testo);
  console.log('      → ' + f.testo);
});

prova('REGOLA 4: la forma in pezzi che si toccano, non lo stile', () => {
  const f = d().frase({ n: 'Basilica di Massenzio', t: 'basilica', dove: 'davanti', metri: 35,
                        forme: ['abside', 'colonne', 'navate'] });
  if (!f) { guasto('niente frase'); return; }
  if (!/colonne|navate|abside/.test(f.testo)) guasto('non dice la forma: ' + f.testo);
  if (/barocc|romanic|gotic|neoclassic/i.test(f.testo)) guasto('dice lo stile, che non si tocca: ' + f.testo);
  console.log('      → ' + f.testo);
});

prova('REGOLA 5: la storia resta, ma in coda e separata', () => {
  const f = d().frase({ n: 'Chiesa del Carmine', t: 'chiesa', dove: 'destra', metri: 25,
                        materiali: ['laterizio'], storia: 'Fu edificata nel 1328 dai Carmelitani.' });
  if (!f) { guasto('niente frase'); return; }
  if (!f.ancora || !/1328/.test(f.ancora)) guasto('la storia non e nel pezzo «ancora»: ' + JSON.stringify(f.ancora));
  if (/1328/.test(f.testo)) guasto('la storia e finita nella prima frase: ' + f.testo);
});

prova('REGOLA 6: quello che non si sa NON si dice', () => {
  const f = d().frase({ n: 'Chiesa di San Luigi dei Francesi', t: 'chiesa', dove: 'sinistra', metri: 20 });
  if (!f) { guasto('niente frase'); return; }
  if (/metri|piani|mattoni|pietra|marmo/.test(f.testo)) {
    guasto('si e inventato quello che non sapeva: ' + f.testo);
  }
  if (!/sinistra/.test(f.testo)) guasto('ma dove sta lo deve dire sempre: ' + f.testo);
  console.log('      → ' + f.testo);
});

prova('la distanza si dice in passi, come nel resto dell app', () => {
  const f = d().frase({ n: 'Fontana di Trevi', t: 'fontana', dove: 'davanti', metri: 30 });
  if (f && !/passi/.test(f.testo)) guasto('non dice i passi: ' + f.testo);
});

prova('senza niente da dire non si inventa una frase vuota', () => {
  const f = d().frase({ n: '', t: '', dove: '', metri: 0 });
  if (f && f.testo && /^\s*\.?\s*$/.test(f.testo)) guasto('ha prodotto una frase vuota');
});

prova('L ARTICOLO C E: «hai il Duomo», non «hai Duomo»', () => {
  const f = d().frase({ n: 'Duomo di Milano', t: 'cattedrale', dove: 'davanti', metri: 40 });
  if (!f) { guasto('niente frase'); return; }
  /* la forma esatta la decide racconto.conArticolo, che ha la sua
     convenzione («la cattedrale Duomo di Milano»): qui si pretende solo
     che un articolo ci sia, e che non esca mai «trovi Duomo». */
  if (/\b(hai|trovi|c'è|incontri) (Duomo|Chiesa|Palazzo|Basilica)\b/.test(f.testo)) {
    guasto('manca l articolo: ' + f.testo);
  }
  if (!/\b(il|lo|la|l')\s/.test(f.testo)) guasto('nessun articolo: ' + f.testo);
  const g = d().frase({ n: 'Chiesa del Carmine', t: 'chiesa', dove: 'destra', metri: 25 });
  if (g && /hai Chiesa/.test(g.testo)) guasto('manca l articolo al femminile: ' + g.testo);
  console.log('      → ' + f.testo);
  console.log('      → ' + (g && g.testo));
});

prova('due monumenti uguali non si raccontano con le stesse parole', () => {
  const dd = d();
  const a = dd.frase({ n: 'Chiesa A', t: 'chiesa', dove: 'destra', metri: 20, materiali: ['marmo'] });
  const b = dd.frase({ n: 'Chiesa B', t: 'chiesa', dove: 'destra', metri: 20, materiali: ['marmo'] });
  if (a && b && a.testo.replace('A','X') === b.testo.replace('B','X')) {
    guasto('frase identica due volte di fila: ' + a.testo);
  }
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della descrizione orientativa');
process.exit(passate === fatti.length ? 0 : 1);
