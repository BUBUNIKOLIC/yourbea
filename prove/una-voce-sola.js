/* UNA VOCE SOLA, SEMPRE.
   Questo difetto e' tornato tre volte in due giorni, e ogni volta per lo
   stesso motivo: da qualche parte del codice la voce parte scavalcando la
   coda. Chi scrive una riga nuova non se ne accorge, perche' da solo quel
   punto funziona: si sente solo quando capita che un'altra frase stia
   ancora parlando.
   Allora la regola diventa una legge controllata: TUTTO cio' che parla
   passa da dire() o da parlaLibero(). Le uniche chiamate dirette ammesse
   sono i ripieghi dentro al motore stesso, elencati qui sotto per numero.
   Se domani qualcuno — io — ne aggiunge un'altra, questa prova la trova e
   la pubblicazione si ferma. */
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const righe = s.split('\n');

// i ripieghi del motore: speak() li' dentro e' il suo mestiere
const AMMESSE = [
  'function ripiego',          // il ripiego vero e proprio
  'speak(tr.t, tr.italiano)',  // dentro dire(), per le lingue straniere
  'catch(_){ try{ speak',      // ripiego se dire() lancia
  'catch(e){ try{ speak',
  'catch(_){ speak',
];
function ammessa(riga, intorno) {
  return AMMESSE.some((a) => riga.includes(a) || intorno.includes(a));
}

let fuorilegge = [];
righe.forEach((riga, i) => {
  if (!/\bspeak\s*\(/.test(riga)) return;
  if (/function speak\s*\(/.test(riga)) return;          // la definizione
  if (/speechSynthesis\.speak\s*=/.test(riga)) return;    // il banco di prova
  if (/window\.speechSynthesis\.speak\(/.test(riga)) return; // dentro speak()
  if (/^\s*(\/\/|\*|\/\*)/.test(riga)) return;            // un commento
  const intorno = righe.slice(Math.max(0, i - 3), i + 2).join('\n');
  if (ammessa(riga, intorno)) return;
  fuorilegge.push(`riga ${i + 1}: ${riga.trim().slice(0, 78)}`);
});

// e il contrario: parlaLibero deve esistere e passare da dire()
const haParlaLibero = /function parlaLibero\s*\([^)]*\)\s*\{[^}]*dire\s*\(/.test(s.replace(/\n/g, ' '));

if (fuorilegge.length) {
  console.log('NO  ' + fuorilegge.length + ' punti fanno parlare l\'app scavalcando la coda:');
  fuorilegge.forEach((f) => console.log('      - ' + f));
  console.log('      (usa dire(ids, testo, livello) o parlaLibero(testo, livello))');
} else if (!haParlaLibero) {
  console.log('NO  parlaLibero non passa piu da dire(): le frasi coi nomi propri scavalcano la coda');
} else {
  console.log('SI  una voce sola: tutto quello che parla passa dalla coda');
}
process.exit(fuorilegge.length || !haParlaLibero ? 1 : 0);
