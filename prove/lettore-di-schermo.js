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
const s = fs.readFileSync(process.env.PAGINA || path.join(__dirname, '..', 'index.html'), 'utf8');
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

/* 6 - UN TASTO PREMUTO DEVE RISPONDERE SUBITO.
   Chi non vede non ha modo di sapere se il tasto ha preso: se l'app tace,
   per lui e' rotta e lo premera' di nuovo. Due casi veri, trovati provando
   la 89 il 15/10:
   - il 🆘 diceva le scelte dopo 2.600 ms: quasi tre secondi di silenzio
     dopo aver premuto il tasto dell'emergenza;
   - «Approfondisci» premuto senza una domanda aperta non diceva niente. */
const aiuto = /YB\.vaiAiuto\s*=\s*function\(\)\{([\s\S]*?)\n  \};/.exec(s);
if (!aiuto) note.push('non trovo YB.vaiAiuto: controlla a mano che il 🆘 parli subito');
else {
  const ritardi = [...aiuto[1].matchAll(/setTimeout\([\s\S]{0,400}?,\s*(\d+)\s*\)/g)].map((m) => +m[1]);
  const tardi = ritardi.filter((n) => n > 800);
  if (tardi.length) guai.push('il 🆘 parla dopo ' + tardi.join(', ') + ' ms: chi lo preme sente silenzio e lo premera di nuovo');
}
const prof = /function deepen\(\)\{([\s\S]*?)\n  \}/.exec(s);
if (!prof) note.push('non trovo deepen(): controlla a mano che «approfondisci» risponda sempre');
else if (/if\(!pending\)return;/.test(prof[1]))
  guai.push('«approfondisci» senza una domanda aperta non dice niente: chi non vede preme e non sa perche tace');

if (guai.length) { console.log('NO  lettore di schermo: ' + guai.length + ' cose da sistemare');
  guai.forEach((g) => console.log('      - ' + g)); }
else console.log('SI  usabile con VoiceOver e TalkBack: nomi, annunci, lingua');
note.forEach((n) => console.log('--  ' + n));
process.exit(guai.length ? 1 : 0);
