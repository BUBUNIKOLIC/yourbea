/* L'app e' usabile da chi non vede?
   Non basta che funzioni: deve funzionare con VoiceOver e TalkBack accesi.
   Questa prova controlla le cose che li rendono inservibili:
   - un tasto senza nome e' un tasto che il lettore chiama «pulsante»
   - un riquadro aria-live con dentro cio' che l'app sta gia' dicendo fa
     parlare in due
   - la mappa, in guida vocale, non deve finire fra i piedi
   Si lancia dentro PROVA-TUTTO (senza rete: legge il codice). */
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let guai = [], note = [];

// 1 - il riquadro del parlato non deve annunciarsi da solo
const live = /<div[^>]*id="live"[^>]*>/.exec(s);
if (!live) guai.push('non trovo il riquadro del parlato');
else if (/aria-live="(polite|assertive)"/.test(live[0]))
  guai.push('il riquadro del parlato ha aria-live: con VoiceOver si sentono due voci');

// 2 - deve esistere un riquadro per cio' che l'app non dice
if (!/id="muto"[^>]*aria-live="polite"/.test(s))
  guai.push('manca il riquadro muto per gli annunci che l\'app non pronuncia');

// 3 - ogni tasto con la sola emoji deve avere aria-label
const bottoni = s.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
for (const b of bottoni) {
  const dentro = b.replace(/<[^>]+>/g, '').trim();
  const senzaEmoji = dentro.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}×⋯]/gu, '').trim();
  const id = (/id="([^"]+)"/.exec(b) || [])[1] || '(senza id)';
  if (!senzaEmoji && !/aria-label=/.test(b)) guai.push(`il tasto ${id} ha solo un'icona e nessun nome`);
}

// 4 - la mappa va nascosta al lettore quando si cammina a voce
if (!/aria-hidden','true'\)/.test(s.replace(/"/g, "'")) || !/mp\.setAttribute/.test(s))
  note.push('controlla che la mappa venga nascosta al lettore in guida vocale');

// 5 - la lingua va dichiarata, se no legge con l'accento sbagliato
if (!/<html[^>]*lang="it"/.test(s)) guai.push('manca lang="it" sulla pagina');

if (guai.length) { console.log('NO  lettore di schermo: ' + guai.length + ' cose da sistemare');
  guai.forEach((g) => console.log('      - ' + g)); }
else console.log('SI  usabile con VoiceOver e TalkBack: nomi, annunci, lingua');
note.forEach((n) => console.log('--  ' + n));
process.exit(guai.length ? 1 : 0);
