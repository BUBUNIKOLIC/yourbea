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
const Distanza = require('../parti/distanza.js');
const LADISTANZA = Distanza({});
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
const d = () => Descrizione({ distanza: LADISTANZA,  conArticolo });

prova('REGOLA 1: prima dove sei rispetto a lui, poi cos e', () => {
  const f = d().frase({ n: 'Duomo di Milano', t: 'cattedrale', dove: 'destra', metri: 30, materiali: ['marmo'] });
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
  /* un dato lo sappiamo (il travertino): tutto il RESTO non si inventa */
  const f = d().frase({ n: 'Chiesa di San Luigi dei Francesi', t: 'chiesa', dove: 'sinistra',
                        metri: 20, materiali: ['travertino'] });
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
  const f = d().frase({ n: 'Duomo di Milano', t: 'cattedrale', dove: 'davanti', metri: 40, materiali: ['marmo'] });
  if (!f) { guasto('niente frase'); return; }
  /* la forma esatta la decide racconto.conArticolo, che ha la sua
     convenzione («la cattedrale Duomo di Milano»): qui si pretende solo
     che un articolo ci sia, e che non esca mai «trovi Duomo». */
  if (/\b(hai|trovi|c'è|incontri) (Duomo|Chiesa|Palazzo|Basilica)\b/.test(f.testo)) {
    guasto('manca l articolo: ' + f.testo);
  }
  if (!/\b(il|lo|la|l')\s/.test(f.testo)) guasto('nessun articolo: ' + f.testo);
  const g = d().frase({ n: 'Chiesa del Carmine', t: 'chiesa', dove: 'destra', metri: 25, materiali: ['laterizio'] });
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

/* ---------- LE MISURE A TERRA ----------
   L'altezza, per chi non vede, e' la meno utile delle tre: trentacinque
   metri in su non si camminano. La larghezza si'. Dal wikitesto della
   Basilica di Massenzio: altezza 35 m, larghezza 65 m, lunghezza 100 m —
   e «larga ottantacinque passi» dice quanto ci metti a costeggiarla. */
prova('la larghezza si dice in passi: e la misura che si cammina', () => {
  const f = d().frase({ n: 'Basilica di Massenzio', t: 'basilica', dove: 'davanti',
                        metri: 30, altezza: 35, larghezza: 65 });
  if (!f) { guasto('niente frase'); return; }
  if (!/larg/.test(f.testo)) guasto('non dice quanto e larga: ' + f.testo);
  if (/65\s*metri/.test(f.testo)) guasto('dice i metri invece dei passi: ' + f.testo);
  console.log('      → ' + f.testo);
});

prova('senza larghezza non se ne inventa una', () => {
  const f = d().frase({ n: 'Chiesa A', t: 'chiesa', dove: 'destra', metri: 20, altezza: 12 });
  if (f && /larg/.test(f.testo)) guasto('si e inventato la larghezza: ' + f.testo);
});

prova('una larghezza assurda non si dice', () => {
  const f = d().frase({ n: 'Chiesa B', t: 'chiesa', dove: 'destra', metri: 20, larghezza: 0.4 });
  if (f && /larg/.test(f.testo)) guasto('quaranta centimetri di larghezza: ' + f.testo);
});

prova('«la Torre del Mangia ha una torre» non si dice', () => {
  const casi = [
    { n: 'Torre del Mangia', t: 'torre', forme: ['torre'], materiali: ['marmo'] },
    { n: 'Cupola del Brunelleschi', t: 'cupola', forme: ['cupola'], materiali: ['mattoni'] },
    { n: 'Campanile di Giotto', t: 'campanile', forme: ['campanile', 'colonne'] }
  ];
  casi.forEach((c) => {
    const f = d().frase(Object.assign({ dove: 'destra', metri: 20 }, c));
    if (!f) { guasto('niente frase per ' + c.n); return; }
    const primaParola = c.n.split(' ')[0].toLowerCase();
    const dopoIlNome = f.testo.slice(f.testo.indexOf(c.n) + c.n.length);
    if (new RegExp('\\b' + primaParola, 'i').test(dopoIlNome)) {
      guasto('ripete quello che il nome dice gia: ' + f.testo);
    }
  });
  console.log('      → ' + d().frase({ n: 'Campanile di Giotto', t: 'campanile',
                                       dove: 'destra', metri: 20, forme: ['campanile', 'colonne'] }).testo);
});

prova('«una facciata piatta» non si dice: PIATTA non lo sappiamo', () => {
  const f = d().frase({ n: 'Chiesa X', t: 'chiesa', dove: 'destra', metri: 20, forme: ['facciata'] });
  if (f && /piatta|facciata/.test(f.testo)) {
    guasto('dice la facciata — che ce l hanno tutti — e per di piu «piatta», che non sappiamo: ' + f.testo);
  }
});

prova('L ACCORDO: «il ponte largo», non «il ponte larga»', () => {
  const p = d().frase({ n: 'Ponte dell\'Impero', t: 'ponte', dove: 'destra', metri: 30, larghezza: 12 });
  if (p && /larga/.test(p.testo)) guasto('«larga» per un ponte: ' + p.testo);
  const b = d().frase({ n: 'Battistero di San Giovanni', t: 'battistero', dove: 'destra', metri: 30, altezza: 5 });
  if (b && /\bbassa\b/.test(b.testo)) guasto('«bassa» per un battistero: ' + b.testo);
  const c = d().frase({ n: 'Chiesa di San Giusto', t: 'chiesa', dove: 'destra', metri: 30, larghezza: 12, altezza: 5 });
  if (c && /largo|basso/.test(c.testo)) guasto('«largo» per una chiesa: ' + c.testo);
  console.log('      → ' + (p && p.testo));
  console.log('      → ' + (b && b.testo));
  console.log('      → ' + (c && c.testo));
});

prova('se non si sa NIENTE di com e fatta, non si dice una frase vuota', () => {
  /* dopo aver tolto la facciata, restavano schede il cui unico dato era
     proprio quella: la frase diventava «la Chiesa X.» e si mangiava un
     gradino per non dire niente. */
  const f = d().frase({ n: 'Chiesa X', t: 'chiesa', dove: 'destra', metri: 20, forme: ['facciata'] });
  if (f && f.testo && !/palazzo|larg|di [a-z]/.test(f.testo)) {
    guasto('frase senza contenuto: ' + f.testo);
  }
  const g = d().frase({ n: 'Chiesa Y', t: 'chiesa', dove: 'destra', metri: 20 });
  if (g && g.testo && !/palazzo|larg|di [a-z]/.test(g.testo)) guasto('frase senza contenuto: ' + g.testo);
});

prova('la frase comincia con la maiuscola anche senza «davanti a te»', () => {
  /* sentito dall'app il 21/10: «la chiesa di Santa Maria delle Grazie
     alle Fornaci: di mattoni». Senza l'apertura, la frase partiva
     dall'articolo minuscolo. */
  const f = d().frase({ n: 'Chiesa del Carmine', t: 'chiesa', dove: '', metri: 0, materiali: ['mattoni'] });
  if (!f) { guasto('niente frase'); return; }
  if (!/^[A-ZÀ-Ý]/.test(f.testo)) guasto('comincia minuscola: ' + f.testo);
  console.log('      → ' + f.testo);
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della descrizione orientativa');
process.exit(passate === fatti.length ? 0 : 1);
