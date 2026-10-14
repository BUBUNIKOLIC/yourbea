// Estrae da index.html i testi che vanno detti a voce e li scrive in voce/testi.json
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function blocco(nome) {
  const i = src.indexOf('var ' + nome + '=[');
  if (i < 0) throw new Error('non trovo ' + nome);
  let j = src.indexOf('[', i), liv = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '[') liv++;
    else if (src[k] === ']') { liv--; if (liv === 0) break; }
  }
  return eval(src.slice(j, k + 1));
}

const POI = blocco('POI');
const ROUTES = blocco('ROUTES');

const clip = [];
const vis = new Set();
function agg(id, testo) {
  if (!testo || vis.has(id)) return;
  vis.add(id);
  clip.push({ id, testo: String(testo).trim() });
}

POI.forEach((p, n) => {
  const b = 'poi-' + String(n + 1).padStart(2, '0');
  agg(b + '-nome', p.n);
  agg(b + '-intro', (p.t || '') + (p.y ? ' del ' + p.y : ''));
  agg(b + '-scheda', p.d);
  agg(b + '-dentro', p.i);
  agg(b + '-ancora', p.a);
});
ROUTES.forEach((r) => agg('percorso-' + r.id, r.n));

// spezzoni fissi, uguali a quelli che l'app compone a voce
['dritto davanti', 'sulla destra', 'sulla sinistra', 'proprio a destra',
 'proprio a sinistra', 'indietro a destra', 'indietro a sinistra',
 'alle tue spalle'].forEach((t) => agg('dir-' + t.replace(/ /g, '-'), t));

agg('m-passi', 'a pochi passi');

// i punti cardinali, per quando la bussola non dice da che parte sei girato
['a nord','a nord-est','a est','a sud-est','a sud','a sud-ovest','a ovest','a nord-ovest']
  .forEach((t) => agg('card-' + t.replace(/ /g, '-'), t));

// distanze larghe, per i riferimenti lontani
for (let v = 100; v <= 900; v += 100) agg('dl-' + v, 'a ' + v + ' metri');
for (let v = 1000; v <= 5000; v += 500) {
  const k = Math.floor(v / 1000), mezzo = (v % 1000) >= 500;
  const nome = ['', 'un', 'due', 'tre', 'quattro', 'cinque'][k] || k;
  agg('dl-' + v, 'a ' + nome + ' chilometr' + (k === 1 ? 'o' : 'i') + (mezzo ? ' e mezzo' : ''));
}
for (let m = 10; m <= 500; m += 10) agg('m-' + m, 'a ' + m + ' metri');

[['vengo-a-prenderti', 'Sto preparando il messaggio: tocca Invia per mandarlo. Se preferisci, dimmi: chiama.'],
 ['chiamo', 'Chiamo adesso.'],
 ['nessun-numero', 'Non ho un numero da chiamare: va registrato prima.'],
 ['casa-segnata', 'Ho segnato casa qui. Quando vuoi tornare, dimmi: portami a casa.'],
 ['casa-non-segnata', "Non so dove sia casa. Quando ci sei, tocca «Segna casa qui»."],
 ['casa-senza-posizione', 'Prima devo sapere dove sei: premi Avvia.'],
 ['non-capito', 'Non ho capito. Prova con: approfondisci, avanti, dove sono.'],
 ['niente-microfono', 'Questo telefono non capisce i comandi a voce.'],
 ['cerco', "Cerco l'indirizzo, un momento."],
 ['indirizzo-non-trovato', "Questo indirizzo non l'ho trovato."],
 ['niente-partenza', 'Non ho segnato un punto di partenza.'],
 ['ti-porto-a', 'Ti porto a'],
 ['sei-arrivato', 'Sei arrivato:'],
 ['niente-di-questi', 'Qui vicino non ne trovo.'],
 ['lascio-perdere', 'Va bene, lascio perdere.'],
 ['solo-cultura', 'Va bene: ti dico solo i luoghi da vedere.'],
 ['tutto', 'Va bene: ti dico tutto, anche negozi e fermate.'],
 ['testo-grande', 'Ho ingrandito il testo.'],
 ['non-coperta', "Qui intorno non trovo nulla da raccontare. Prova a camminare un po': appena passi davanti a qualcosa, te lo dico."],
 ['lungo', 'Il percorso è lungo'],
 ['comincia-a', 'e comincia a'],
 ['come-cammini', 'Vuoi camminare libero, o seguire un percorso?'],
 ['aiuto', 'Puoi dire: approfondisci, avanti, ripeti, dove sono, oppure ferma.'],
 ['niente-intorno', 'Qui intorno non ho niente da dirti.'],
 ['chiedi', 'Vuoi approfondire, o andiamo avanti?'],
 ['cosa-vedere', 'Cosa vedere:'],
 ['avanti', 'Andiamo avanti.'],
 ['voce-attiva', 'Modalità voce attiva. Ti annuncio ogni luogo che passi, da che parte e a quanti metri.'],
 ['parto-libero', 'Comincio col cammino libero. Quando vuoi, dimmi: percorsi.'],
 ['bentornato', 'Guida vocale attiva. Ti dico quello che passi, da che parte e a quanti metri.'],
 ['apro-taxi', 'Apro il taxi con la tua posizione. La corsa la confermi tu.'],
 ['chiamo-112', 'Chiamo il 112.'],
 ['apertura', "Sto cercando la tua posizione. Appena la trovo partiamo. Senza premere tasti puoi comandarmi parlando: dì aiuto, dove sono, oppure cosa c'è qui intorno."],
 ['ci-siamo', 'Ci siamo, ti ho trovato. Cammina pure.'],
 ['percorsi-vicini', 'Ecco i percorsi più vicini a te.'],
 ['scelte-aiuto', 'Dì: chiama, per il 112. Commissariato. Pronto soccorso. Farmacia. Portami a casa. Oppure: mi hanno rubato il portafoglio.'],
 ['derubato', "Mi dispiace. Dì chiama per il 112, oppure commissariato e ti ci porto. Per bloccare le carte chiama la tua banca: il numero è dietro la carta, e se non ce l'hai, il numero verde del tuo circuito."],
 ['da-qui-passa', 'Da qui passa un percorso. Dì percorso, se vuoi seguirlo.'],
 ['tutto-detto', 'Di questo ti ho detto tutto.'],
 ['e-lontano', 'È lontano: se è urgente, chiama il 112.']
].forEach(([k, t]) => agg('frase-' + k, t));

fs.writeFileSync(path.join(__dirname, 'testi.json'), JSON.stringify(clip, null, 1), 'utf8');
console.log('luoghi:', POI.length, '| percorsi:', ROUTES.length, '| clip da generare:', clip.length);
