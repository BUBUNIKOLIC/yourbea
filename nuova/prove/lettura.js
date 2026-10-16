/* LE PROVE DELLA LETTURA — nuova Yourbea
   Leggere un cartello a chi non vede. Ogni prova qui sotto è un modo di
   sbagliare che si sentirebbe in strada: un nome di via spezzato in due, il
   numero dell'autobus buttato via perché corto, venti righe di un menu
   lette di fila, o il silenzio quando non c'è niente da leggere — che per
   chi non vede è indistinguibile da un'app rotta.
   Si lancia:  node nuova/prove/lettura.js                                   */

'use strict';
const fs = require('fs');
const path = require('path');
const Lettura = require('../parti/lettura.js');

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
  const l = Lettura({ ora: () => adesso });
  return { l, passano(ms) { adesso += ms; } };
}

/* IL CARTELLO VERO. Quello di via dei Corazzieri, dove Vince cammina: il
   nome grande su due pezzi affiancati, il civico piccolo in basso, e due
   schifezze che il riconoscimento tira su dal bordo di metallo. L'ordine è
   mescolato di proposito: Vision le consegna come vuole lui. */
const CARTELLO = [
  { t: '47', x: 0.10, y: 0.62, w: 0.08, h: 0.05 },
  { t: 'CORAZZIERI', x: 0.40, y: 0.305, w: 0.48, h: 0.115 },
  { t: 'I', x: 0.95, y: 0.80, w: 0.01, h: 0.03 },
  { t: 'VIA DEI', x: 0.10, y: 0.30, w: 0.28, h: 0.12 },
  { t: 'MUNICIPIO IX', x: 0.10, y: 0.74, w: 0.40, h: 0.035 },
  { t: '—', x: 0.05, y: 0.90, w: 0.20, h: 0.01 }
];

prova('la riga più grande si dice per prima, non quella che arriva prima', () => {
  /* su un cartello il nome della via è scritto grande e il resto è contorno:
     l'ordine in cui il riconoscimento le consegna non vuol dire niente */
  const { l } = mondo();
  const d = l.risposta(CARTELLO);
  if (!/VIA DEI CORAZZIERI/.test(d.testo)) {
    guasto('la prima cosa detta deve essere il nome grande, invece: ' + d.testo);
  }
  if (/^Ci sono \d+ righe\. La più grande: 47/.test(d.testo)) guasto('ha cominciato dal civico');
});

prova('«VIA DEI» e «CORAZZIERI» sono una riga sola, non due', () => {
  /* lette separate sembrano due cose diverse, e chi ascolta non sa che la
     via si chiama così */
  const { l } = mondo();
  const righe = l.pulisci(CARTELLO);
  const unita = righe.filter((r) => /VIA DEI CORAZZIERI/.test(r.t));
  if (unita.length !== 1) guasto('mi aspettavo una riga «VIA DEI CORAZZIERI», ho: ' + JSON.stringify(righe.map((r) => r.t)));
  if (righe.some((r) => r.t === 'VIA DEI' || r.t === 'CORAZZIERI')) guasto('i due pezzi sono rimasti separati');
  /* e nell'ordine giusto: da sinistra a destra, non «CORAZZIERI VIA DEI» */
  if (righe.some((r) => /CORAZZIERI VIA/.test(r.t))) guasto('rimesse insieme al contrario');
});

prova('le righe di una o due lettere e quelle di soli simboli si buttano', () => {
  /* sono rumore: un bordo, un'ombra, un graffio sul metallo */
  const { l } = mondo();
  const righe = l.pulisci(CARTELLO).map((r) => r.t);
  if (righe.indexOf('I') >= 0) guasto('«I» da sola è rumore, non si legge');
  if (righe.indexOf('—') >= 0) guasto('un trattino da solo non è scritto niente');
});

prova('MA le cifre corte restano: «64» è l\'autobus, «47» è il civico', () => {
  /* è esattamente la cosa che si stava cercando: buttarla perché è corta
     vorrebbe dire non saper leggere un numero di autobus */
  const { l } = mondo();
  if (l.pulisci(CARTELLO).map((r) => r.t).indexOf('47') < 0) guasto('il civico 47 è stato buttato');
  const bus = l.pulisci([{ t: '64', x: 0.3, y: 0.3, w: 0.2, h: 0.2 },
                         { t: '8', x: 0.3, y: 0.6, w: 0.1, h: 0.1 }]).map((r) => r.t);
  if (bus.indexOf('64') < 0) guasto('«64», il numero dell\'autobus, è stato buttato');
  if (bus.indexOf('8') < 0) guasto('«8», una cifra sola, è il numero del bus o del citofono: si legge');
});

prova('si dice quante righe sono, e poi la prima', () => {
  const { l } = mondo();
  const d = l.risposta(CARTELLO);
  if (!/\b3 righe\b/.test(d.testo)) guasto('deve dire quante sono (3, dopo la pulizia): ' + d.testo);
  if (d.quante !== 3) guasto('quante = ' + d.quante);
  if (!/ancora/i.test(d.testo)) guasto('e deve dire come si va avanti');
});

prova('venti righe di un menu NON si leggono di fila', () => {
  /* non si ricordano, e intanto non si sente la strada */
  const { l } = mondo();
  const menu = [];
  for (let i = 0; i < 20; i++) menu.push({ t: 'Piatto numero ' + (i + 1), x: 0.1, y: 0.05 * i, w: 0.6, h: 0.03 });
  const d = l.risposta(menu);
  if (d.testo.indexOf('Piatto numero 20') >= 0) guasto('ha letto tutto il menu in una volta');
  const quanti = menu.filter((m) => d.testo.indexOf(m.t) >= 0).length;
  if (quanti > 1) guasto('ha detto ' + quanti + ' piatti in una frase: uno per volta');
  if (!/\b20 righe\b/.test(d.testo)) guasto('ma deve dire che sono venti: ' + d.testo);
});

prova('«ancora» va avanti una riga per volta, e dice qual è l\'ultima', () => {
  const { l } = mondo();
  l.risposta(CARTELLO);                         // la prima l'ha già detta
  const due = l.ancora();
  if (!due) return guasto('«ancora» non ha risposto niente');
  if (!/Riga 2 di 3/.test(due.testo)) guasto('la seconda deve dire a che punto siamo: ' + due.testo);
  const tre = l.ancora();
  if (!/ultima/i.test(tre.testo)) guasto('l\'ultima lo deve dire, se no uno aspetta: ' + tre.testo);
  const quattro = l.ancora();
  if (!/finito/i.test(quattro.testo)) guasto('finite le righe lo dice: ' + quattro.testo);
  if (!/leggi/i.test(quattro.testo)) guasto('e dice come si guarda di nuovo');
  /* e dopo non si ricomincia da sola */
  if (l.inCorso()) guasto('finite le righe, «ancora» non è più della lettura');
});

prova('una riga sola non si annuncia: si dice quello che c\'è scritto', () => {
  /* «Una riga. La più grande: Farmacia» è un modo di parlare da macchina */
  const { l } = mondo();
  const d = l.risposta([{ t: 'FARMACIA', x: 0.1, y: 0.2, w: 0.7, h: 0.2 }]);
  if (/righe|riga/i.test(d.testo)) guasto('con una riga sola non si parla di righe: ' + d.testo);
  if (d.testo.indexOf('FARMACIA') < 0) guasto('e si dice cosa c\'è scritto: ' + d.testo);
  if (l.inCorso()) guasto('e non resta niente da continuare con «ancora»');
});

prova('se non si legge niente NON si tace', () => {
  /* chi non vede non può sapere se l'app sta pensando, se ha sbagliato o se
     davanti non c'è scritto niente */
  const { l } = mondo();
  const d = l.risposta([]);
  if (!d || !d.testo) return guasto('silenzio: è il difetto peggiore di tutti');
  if (!/avvicinarti/i.test(d.testo)) guasto('e si dice cosa provare: ' + d.testo);
  if (!/girare il telefono/i.test(d.testo)) guasto('compreso girare il telefono: ' + d.testo);
  /* e vale anche quando le righe c'erano ma erano tutte rumore */
  const d2 = l.risposta([{ t: 'I', x: 0, y: 0, w: 0.01, h: 0.01 }, { t: '/', x: 0.5, y: 0.5, w: 0.01, h: 0.01 }]);
  if (!/avvicinarti/i.test(d2.testo)) guasto('tutte righe di rumore: deve dire la stessa cosa, non tacere');
  if (l.inCorso()) guasto('e non resta niente da continuare');
});

prova('fotocamera negata: lo dice, e dice dove si dà il permesso', () => {
  const { l } = mondo();
  const d = l.risposta([], 'niente-permesso');
  if (!/permesso/i.test(d.testo)) guasto('deve dire che manca il permesso: ' + d.testo);
  if (!/impostazioni/i.test(d.testo)) guasto('e dove si dà: ' + d.testo);
  if (/avvicinarti/i.test(d.testo)) guasto('non è un problema di distanza: non si dice di avvicinarsi');
});

prova('scatto non riuscito: si dice, e si può riprovare', () => {
  const { l } = mondo();
  const d = l.risposta([], 'non-riesco');
  if (!/riprova/i.test(d.testo)) guasto('deve dire di riprovare: ' + d.testo);
});

prova('nel browser, dove la fotocamera non si apre, non si mente', () => {
  /* la pagina gira anche fuori dal guscio: lì non si promette una cosa che
     non si può fare, e non si resta zitti */
  const { l } = mondo();
  const d = l.senzaGuscio();
  if (!d || !d.testo) return guasto('niente da dire');
  if (!/installata|app/i.test(d.testo)) guasto('deve dire che serve l\'app sul telefono: ' + d.testo);
});

prova('«ancora» torna al monumento dopo due minuti', () => {
  /* passato un po', «ancora» vuol dire «raccontami di più di questa chiesa»,
     non «la riga due del cartello di prima» */
  const w = mondo();
  w.l.risposta(CARTELLO);
  if (!w.l.inCorso()) guasto('appena letto, «ancora» è della lettura');
  w.passano(30000);
  if (!w.l.inCorso()) guasto('dopo trenta secondi è ancora della lettura');
  w.passano(100000);
  if (w.l.inCorso()) guasto('dopo più di due minuti no: «ancora» è del racconto');
  if (w.l.ancora()) guasto('e non risponde');
});

prova('lo stesso testo riconosciuto due volte si dice una volta', () => {
  /* capita coi riflessi sul vetro di un citofono */
  const { l } = mondo();
  const righe = l.pulisci([
    { t: 'ROSSI', x: 0.1, y: 0.1, w: 0.3, h: 0.08 },
    { t: 'ROSSI', x: 0.1, y: 0.42, w: 0.3, h: 0.05 },
    { t: 'BIANCHI', x: 0.1, y: 0.7, w: 0.3, h: 0.08 }
  ]);
  if (righe.filter((r) => r.t === 'ROSSI').length !== 1) guasto('«ROSSI» detto due volte: ' + JSON.stringify(righe.map((r) => r.t)));
  if (righe.length !== 2) guasto('mi aspettavo due righe, ho ' + righe.length);
});

prova('un titolo grande e la didascalia attaccata restano due righe', () => {
  /* si sfiorano in verticale ma non sono la stessa cosa: unirle farebbe una
     frase che sul cartello non c'è */
  const { l } = mondo();
  const righe = l.pulisci([
    { t: 'MUSEO', x: 0.1, y: 0.20, w: 0.5, h: 0.18 },
    { t: 'ingresso da via Roma', x: 0.62, y: 0.36, w: 0.3, h: 0.03 }
  ]);
  if (righe.length !== 2) guasto('devono restare due righe: ' + JSON.stringify(righe.map((r) => r.t)));
  if (righe.some((r) => /MUSEO ingresso/.test(r.t))) guasto('fuse insieme');
  if (righe[0].t !== 'MUSEO') guasto('e la grande viene prima: ' + righe[0].t);
});

prova('senza riquadri resta l\'ordine di lettura', () => {
  /* se un domani il riconoscimento non desse le misure, l'app non deve
     mescolare le righe: si leggono come stanno */
  const { l } = mondo();
  const righe = l.pulisci([{ t: 'prima' }, { t: 'seconda' }, { t: 'terza' }]);
  if (righe.map((r) => r.t).join(' ') !== 'prima seconda terza') {
    guasto('ordine cambiato: ' + JSON.stringify(righe.map((r) => r.t)));
  }
});

prova('il ritorno a capo dentro una riga non diventa una pausa', () => {
  const { l } = mondo();
  const righe = l.pulisci([{ t: 'Via\nGaribaldi   12', x: 0.1, y: 0.1, w: 0.5, h: 0.1 }]);
  if (righe[0].t !== 'Via Garibaldi 12') guasto('ripulita male: «' + righe[0].t + '»');
});

prova('quello che si è letto si può rileggere dopo, nel quaderno', () => {
  /* «tenere un registro del percorso che faccio ed avere un riscontro con
     quello che ti dirò» (Vince, 16/10): senza questo, «non ha letto» e «ha
     letto una cosa sbagliata» sono la stessa riga di diario */
  const { l } = mondo();
  l.risposta(CARTELLO);
  const tutte = l.tutte();
  if (!tutte.length) return guasto('non si sa cosa ha letto');
  if (tutte.join(' | ').indexOf('VIA DEI CORAZZIERI') < 0) guasto('nel quaderno manca la riga principale: ' + tutte.join(' | '));
  if (tutte.length !== 3) guasto('nel quaderno vanno TUTTE le righe buone, non solo quella detta');
});

/* ============================================================
   IL GUSCIO: la porta che scatta la foto. La logica si prova qui, ma se la
   porta non esiste o non usa Vision, sul telefono non legge niente — e la
   prova in node non se ne accorgerebbe mai.
   ============================================================ */
const guscio = (() => {
  try { return fs.readFileSync(path.join(__dirname, '..', '..', 'guscio-ios', 'Yourbea', 'Guscio.swift'), 'utf8'); }
  catch (e) { return null; }
})();

prova('il guscio apre la porta urbeaLeggi e legge col riconoscimento di iOS', () => {
  if (guscio === null) return guasto('non trovo guscio-ios/Yourbea/Guscio.swift');
  if (!/window\.urbeaLeggi\s*=/.test(guscio)) guasto('il ponte non dichiara window.urbeaLeggi: la pagina non ha come chiedere la foto');
  if (!/window\.urbeaSaLeggere\s*=\s*true/.test(guscio)) guasto('manca window.urbeaSaLeggere: la pagina non sa se può offrire la lettura');
  if (!/urbeaLetto/.test(guscio)) guasto('il guscio non richiama window.urbeaLetto: il testo non torna alla pagina');
  /* Vision, dentro iOS: gratis, senza rete e senza chiavi di nessuno */
  if (!/VNRecognizeTextRequest/.test(guscio)) guasto('niente VNRecognizeTextRequest: il riconoscimento del testo è quello di iOS');
  if (!/recognitionLanguages\s*=\s*\[\s*"it-IT"\s*,\s*"en-US"\s*\]/.test(guscio)) guasto('le lingue devono essere italiano e inglese: i menu e i cartelli dei turisti');
  if (!/usesLanguageCorrection\s*=\s*true/.test(guscio)) guasto('senza usesLanguageCorrection le parole escono storte');
  if (!/AVCapturePhotoOutput/.test(guscio)) guasto('la foto si scatta con AVCapturePhotoOutput');
  /* nessuna chiave e nessun server: è la regola di questo lavoro */
  if (/api\.openai|api\.anthropic|googleapis\.com\/vision|Bearer /.test(guscio)) {
    guasto('nel guscio c\'è una chiamata a un servizio a pagamento: questa lettura è tutta dentro il telefono');
  }
  /* e nel quaderno deve restare cosa ha letto e quanto ci ha messo */
  if (!/scrivi\("LETTO|scrivi\("LETTO /.test(guscio) && !/LETTO/.test(guscio)) guasto('il quaderno della camminata non scrive cosa ha letto');
  if (!/ms\b/.test(guscio)) guasto('e nemmeno quanto ci ha messo');
});

prova('il permesso della fotocamera è spiegato per davvero', () => {
  /* Apple rifiuta le frasi generiche, e una frase generica non dice
     nemmeno alla persona perché dovrebbe dare il permesso */
  let yml;
  try { yml = fs.readFileSync(path.join(__dirname, '..', '..', 'guscio-ios', 'project.yml'), 'utf8'); }
  catch (e) { return guasto('non trovo guscio-ios/project.yml'); }
  const riga = (yml.match(/NSCameraUsageDescription:\s*"([^"]+)"/) || [])[1];
  if (!riga) return guasto('manca NSCameraUsageDescription: senza, l\'app cade appena apre la fotocamera');
  if (riga.length < 60) guasto('la spiegazione è troppo corta per dire davvero a cosa serve: «' + riga + '»');
  if (!/legg/i.test(riga)) guasto('deve dire che serve a LEGGERE quello che hai davanti: «' + riga + '»');
});

/* ============================================================
   LA CUCITURA: ogni file nuovo va in index.html col ?v= E nella lista del
   service worker. Dimenticarne uno è il difetto che il 15/10 ha fatto
   perdere due giorni: la pagina chiede un file che la cassaforte non ha, e
   senza rete non parte.
   ============================================================ */
prova('lettura.js è cucita nella pagina e nella cassaforte', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  if (!/<script src="parti\/lettura\.js\?v=\d+">/.test(html)) guasto('index.html non carica parti/lettura.js col ?v=');
  if (!/'\.\/parti\/lettura\.js' \+ V/.test(sw)) guasto('sw.js non tiene parti/lettura.js: senza rete l\'app non partirebbe');
  if (!/Lettura\(/.test(app)) guasto('app.js non monta la parte');
  if (!/window\.urbeaLetto\s*=/.test(app)) guasto('app.js non apre la porta che il guscio richiama');
  /* e il banco va nella fila delle prove, se no non lo lancia nessuno */
  const corri = fs.readFileSync(path.join(__dirname, '..', 'PROVA-LA-NUOVA.command'), 'utf8');
  if (!/\blettura\b/.test(corri)) guasto('PROVA-LA-NUOVA.command non lancia prove/lettura.js');
});

prova('si può chiedere a voce, e c\'è un tasto grande in Utilità', () => {
  /* «un non vedente deve fare tutto a voce»: ma il tasto grande serve a chi
     vede poco e a chi accompagna */
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'stile.css'), 'utf8');
  const parole = (app.match(/leggi:\s*\[([^\]]+)\]/) || [])[1] || '';
  ['leggi', 'scritto', 'cartello'].forEach((p) => {
    if (parole.indexOf(p) < 0) guasto('fra le parole della lettura manca «' + p + '»');
  });
  if (!/id="leggi-cartello"/.test(html)) guasto('manca il tasto nella pagina');
  if (!/tasto grande/.test((html.match(/<button[^>]*id="leggi-cartello"[^>]*>/) || [''])[0])) guasto('il tasto della lettura deve essere grande');
  if (!/body\[data-modo="utilita"\]\s*#leggi-cartello\{display:block\}/.test(css.replace(/\s+/g, ' ').replace(/ \{/g, '{'))) {
    guasto('il tasto deve comparire in Utilità (regola nel CSS come #vai-a-casa)');
  }
  if (!/el\('leggi-cartello'\)\.addEventListener/.test(app)) guasto('il tasto non è attaccato a niente');
});

prova('sullo schermo, all\'ultima riga non si offre la prossima', () => {
  /* trovato provandola nel browser: il riquadro diceva «dimmi ancora per la
     prossima» sulla riga tre di tre. Chi legge lo schermo è chi accompagna,
     e ci casca. */
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const dentro = (app.match(/function diciLaLettura[\s\S]*?\n  \}/) || [''])[0];
  if (!dentro) return guasto('non trovo diciLaLettura in app.js');
  if (!/ultima/.test(dentro)) guasto('il riquadro non distingue l\'ultima riga dalle altre');
  if (!/>=\s*d\.quante/.test(dentro)) guasto('e non guarda se la riga detta è l\'ultima');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove della lettura');
process.exit(passate === fatti.length ? 0 : 1);
