/* LE PROVE DEI NEGOZI — nuova Yourbea
   I luoghi di Overture, scaricati una volta e tagliati a quadretti, uniti a
   quelli della mappa viva. La prova che conta è che non si dica due volte
   la stessa farmacia.
   Si lancia:  node nuova/prove/negozi.js                                    */

'use strict';
const Negozi = require('../parti/negozi.js');
const fs = require('fs');
const path = require('path');

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
const n = Negozi({ dist });

prova('il nome del quadretto si calcola dalla posizione', () => {
  if (n.nome(41.8232, 12.4814) !== '4182_1248') guasto('Roma: ' + n.nome(41.8232, 12.4814));
  if (n.nome(44.8029, 10.3289) !== '4480_1032') guasto('Parma: ' + n.nome(44.8029, 10.3289));
});

prova('si prende anche il quadretto accanto: il confine non si vede', () => {
  /* camminando verso il bordo, i negozi di là sono a cinquanta metri */
  const q = n.quadretti(41.8299, 12.4899);
  if (q.length < 4) guasto('solo ' + q.length + ' quadretti');
  if (q.indexOf('4183_1249') < 0) guasto('manca quello di là dal confine: ' + q.join(' '));
});

prova('quello che la mappa viva ha già non si ripete', () => {
  const dallaMappa = [{ cosa: 'farmacia', servizio: 'farmacia', nome: 'Farmacia Pirani',
                        orari: 'Mo-Sa 08:00-20:00', lat: 41.8232, lon: 12.4814 }];
  const nostri = [{ n: 'FARMACIA PIRANI', t: 'farmacia', lat: 41.82322, lon: 12.48143 }];
  const uniti = n.unisci(dallaMappa, nostri);
  if (uniti.length !== 1) guasto('ha detto due volte la stessa farmacia');
  if (uniti[0].orari !== 'Mo-Sa 08:00-20:00') guasto('ha buttato gli orari, che solo OSM ha');
});

prova('quello che la mappa viva non ha, si aggiunge', () => {
  const uniti = n.unisci([], [{ n: 'Irish Pub Doolin', t: 'pub', lat: 41.4668, lon: 12.9036, a: 'Via Adua, 10' }]);
  if (uniti.length !== 1) guasto('non lo ha aggiunto');
  if (!uniti[0].nostro) guasto('deve restare scritto che viene dai nostri dati');
  if (uniti[0].servizio !== 'pub') guasto('senza il tipo non si può dire «stai passando un pub»');
});

prova('due cose nello stesso punto sono la stessa cosa, anche con nomi diversi', () => {
  const dallaMappa = [{ cosa: 'bar', servizio: 'bar', nome: 'Bar Centrale', lat: 41.8232, lon: 12.4814 }];
  const uniti = n.unisci(dallaMappa, [{ n: 'Caffetteria del Corso', t: 'bar', lat: 41.82321, lon: 12.48141 }]);
  if (uniti.length !== 1) guasto('a cinque metri è lo stesso locale che ha cambiato insegna');
});

prova('i nomi si confrontano senza maiuscole né accenti', () => {
  const dallaMappa = [{ cosa: 'bar', servizio: 'bar', nome: "Caffè Perù", lat: 41.8232, lon: 12.4814 }];
  const uniti = n.unisci(dallaMappa, [{ n: 'CAFFE PERU', t: 'bar', lat: 41.82340, lon: 12.48160 }]);
  if (uniti.length !== 1) guasto('«Caffè Perù» e «CAFFE PERU» sono lo stesso bar');
});

prova('i dati che abbiamo scaricato esistono davvero', () => {
  const cartella = path.join(__dirname, '..', 'dati', 'negozi');
  if (!fs.existsSync(cartella)) { guasto('manca la cartella dei negozi'); return; }
  const file = fs.readdirSync(cartella).filter((f) => f.endsWith('.json'));
  if (file.length < 100) guasto('solo ' + file.length + ' quadretti');
  const uno = JSON.parse(fs.readFileSync(path.join(cartella, file[0]), 'utf8'));
  if (!uno.length) guasto('un quadretto vuoto');
  ['n', 't', 'lat', 'lon'].forEach((c) => {
    if (uno[0][c] === undefined) guasto('manca il campo ' + c);
  });
  if (/[a-z]_[a-z]/.test(uno[0].t)) guasto('il tipo è rimasto in inglese: ' + uno[0].t);
});

prova('i monumenti di Wikipedia diventano luoghi da raccontare', () => {
  const cultura = [{ n: 'basilica di Santo Spirito', t: 'chiesa', y: 1252,
                     arch: ['Filippo Brunelleschi'], lat: 43.7670, lon: 11.2470,
                     d: 'La basilica di Santo Spirito è una delle principali chiese di Firenze.' }];
  const nuovi = n.perIlRacconto(cultura, []);
  if (nuovi.length !== 1) guasto('non lo ha preso');
  if (nuovi[0].k !== 1) guasto('deve essere un luogo, non un servizio');
  if (!/1252/.test(nuovi[0].intro) || !/Brunelleschi/.test(nuovi[0].intro)) {
    guasto('anno e architetto si dicono in due secondi, l\'articolo no: ' + nuovi[0].intro);
  }
});

/* LA REGOLA E' CAMBIATA IL 20/10, e di proposito.
   Prima: «senza scheda non si prende, non c'è niente da dire». Ma cosi' si
   buttavano 8.122 luoghi su 19.113 — e dentro c'erano gli stadi, i
   municipi, le stazioni, cioe' esattamente quello che in Utilita' serve
   per orientarsi: «un non vedente in modalita' utilita' vuole sapere cosa
   c'è: davanti hai il municipio, lo stadio» (Vince, 19/10).
   Adesso restano, con quello che sappiamo — il nome e che cosa sono — e
   sono marcati, cosi' Turismo li lascia stare e Utilita' li usa. */
prova('senza scheda RESTA, ma marcato e in una riga sola', () => {
  const nuovi = n.perIlRacconto([{ n: 'Domenico Francioni', t: 'stadio', lat: 43.77, lon: 11.25 }], []);
  if (!nuovi.length) { guasto('uno stadio senza voce su Wikipedia serve lo stesso'); return; }
  const x = nuovi[0];
  if (!x.senzaScheda) guasto('deve essere marcato, se no Turismo lo racconta');
  if (!x.minore) guasto('deve stare in una riga sola');
  if (!/Qui c'è lo stadio Domenico Francioni\./.test(x.d)) guasto('dice male cos\'è: ' + x.d);
});

prova('un nome di una parola sola non si raddoppia col tipo', () => {
  const nuovi = n.perIlRacconto([{ n: 'Municipio', t: 'palazzo comunale', lat: 43.77, lon: 11.25 }], []);
  if (!/Qui c'è il Municipio\./.test(nuovi[0].d)) guasto('«il palazzo comunale Municipio» non lo direbbe nessuno: ' + nuovi[0].d);
});

prova('quello che abbiamo scritto a mano vince su Wikipedia', () => {
  /* le nostre schede sono fatte per essere ascoltate camminando, quelle di
     Wikipedia per essere lette */
  const nostri = [{ n: 'Battistero di San Giovanni', lat: 43.7731, lon: 11.2549, k: 1,
                    d: 'Ottagono rivestito di marmo bianco e verde…' }];
  const cultura = [{ n: 'battistero di San Giovanni', t: 'battistero', lat: 43.77311, lon: 11.25491,
                     d: 'Il battistero di San Giovanni è un edificio religioso di Firenze.' }];
  if (n.perIlRacconto(cultura, nostri).length) guasto('lo ha aggiunto due volte');
});

prova('la chiesa di quartiere si dice in una riga, non in mezzo minuto', () => {
  /* Dario, girando all'Arenella: «mi ha raccontato di una chiesa che
     artisticamente non vale niente». Su Wikipedia c'è dentro tutto, anche
     la parrocchia del 1960: giusto che ci sia, non che si prenda mezzo
     minuto di racconto. */
  const minore = [{ n: 'chiesa di Santa Maria della Provvidenza', t: 'chiesa', y: 1962,
                    lat: 40.8550, lon: 14.2350,
                    d: 'La chiesa di Santa Maria della Provvidenza è una chiesa di Napoli, nel quartiere Arenella.' }];
  const fuori = n.perIlRacconto(minore, []);
  if (!fuori.length) guasto('non sparisce: si dice che c\'è');
  if (fuori[0] && !fuori[0].minore) guasto('doveva essere segnata come minore');
  if (fuori[0] && fuori[0].d.length > 120) guasto('la scheda lunga non si dice: ' + fuori[0].d);
});

prova('quella che conta si racconta per intero', () => {
  const grande = [{ n: 'Certosa di San Martino', t: 'certosa', y: 1325,
                    arch: ['Tino di Camaino'], lat: 40.8440, lon: 14.2410,
                    d: 'La certosa di San Martino è un complesso monumentale di Napoli, fra i più importanti della città. '.repeat(5) }];
  const fuori = n.perIlRacconto(grande, []);
  if (!fuori.length || fuori[0].minore) guasto('questa merita il racconto intero');
  if (fuori[0].d.length < 200) guasto('e la scheda vera');
});

/* ---------- COM'E' FATTA DEVE ARRIVARE FINO IN FONDO ----------
   Il 21/10 i dati per le descrizioni orientative — altezza, larghezza,
   materiale, forma — sono stati messi nei quadretti e pubblicati. Poi non
   si sentivano. Causa: qui dentro ogni luogo del quadretto viene
   RICOSTRUITO da zero con un elenco fisso di campi, e quei quattro non
   c'erano: restavano nel file e non arrivavano mai all'app. */
prova('i dati di com e fatta non si perdono per strada', () => {
  const n = Negozi({});
  const dal = [{ n: 'Chiesa di Prova', t: 'chiesa', lat: 41.9, lon: 12.5,
                 d: 'Una scheda abbastanza lunga da passare la soglia. '.repeat(12),
                 y: 1300, arch: ['Tizio'],
                 h: 35, l: 65, mat: ['marmo'], frm: ['campanile', 'navata'] }];
  const fuori = n.perIlRacconto(dal, []);
  if (!fuori.length) { guasto('non e passata nessuna scheda'); return; }
  const p = fuori[0];
  if (p.h !== 35) guasto('persa l altezza: ' + JSON.stringify(p.h));
  if (p.l !== 65) guasto('persa la larghezza: ' + JSON.stringify(p.l));
  if (!p.mat || p.mat[0] !== 'marmo') guasto('perso il materiale: ' + JSON.stringify(p.mat));
  if (!p.frm || p.frm.length !== 2) guasto('persa la forma: ' + JSON.stringify(p.frm));
});

prova('e non si perdono nemmeno per i luoghi minori', () => {
  const n = Negozi({});
  const dal = [{ n: 'Chiesetta', t: 'chiesa', lat: 41.9, lon: 12.5, mat: ['mattoni'], h: 8 }];
  const p = n.perIlRacconto(dal, [])[0];
  if (!p) { guasto('non e passata'); return; }
  if (p.h !== 8 || !p.mat) guasto('un luogo minore perde com e fatto: ' + JSON.stringify(p));
});

/* ---------- UN NOME UGUALE A CINQUECENTO CHILOMETRI NON E' LO STESSO POSTO ----------
   Misurato il 21/10: 1.790 monumenti su 20.836 — l'8,6% di tutta Italia —
   sparivano perche' il confronto fra i nomi non guardava DOVE sono. La
   chiesa di Santa Maria delle Grazie alle Fornaci, a Roma, veniva
   cancellata da chiese con un nome simile a 95, 96, 202 e 477 km.
   In Italia «Santa Maria delle Grazie», «San Giovanni», «Duomo» si
   ripetono in ogni provincia: un nome uguale lontano non e' un doppione,
   e' un altro posto. */
prova('un nome simile LONTANO non cancella un monumento', () => {
  const R = 6371000, P = Math.PI / 180;
  const dist = (a, b, c, d) => {
    const x = (c - a) * P, y = (d - b) * P;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const n = Negozi({ dist });
  const aMilano = [{ n: 'Chiesa di Santa Maria delle Grazie', lat: 45.4659, lon: 9.1709 }];
  const aRoma = [{ n: 'Chiesa di Santa Maria delle Grazie alle Fornaci', t: 'chiesa',
                   lat: 41.89746, lon: 12.45521, mat: ['mattoni'], frm: ['campanile'] }];
  const fuori = n.perIlRacconto(aRoma, aMilano);
  if (!fuori.length) guasto('cancellata da una chiesa a 480 km');
  if (fuori.length && !fuori[0].mat) guasto('passata ma senza i dati');
});

prova('ma lo stesso posto scritto due volte resta un doppione', () => {
  const R = 6371000, P = Math.PI / 180;
  const dist = (a, b, c, d) => {
    const x = (c - a) * P, y = (d - b) * P;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a * P) * Math.cos(c * P) * Math.sin(y / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const n = Negozi({ dist });
  /* stesso nome, 80 metri: e' la stessa chiesa segnata due volte — oltre
     i 60 m del controllo sulle coordinate, ma col nome che combacia */
  const gia = [{ n: 'Chiesa di San Rocco', lat: 41.9000, lon: 12.5000 }];
  const uguale = [{ n: 'Chiesa di San Rocco', t: 'chiesa', lat: 41.9007, lon: 12.5000 }];
  if (n.perIlRacconto(uguale, gia).length) guasto('ha tenuto lo stesso posto due volte');
});

prova('«Qui c e LA stazione», non «Qui c e stazione»', () => {
  /* visto il 21/10 facendo camminare l'app a Roma: «Qui c'è stazione di
     Roma San Pietro». Quando il nome comincia col suo tipo qui si
     restituiva il nome nudo — stesso difetto gia' corretto in
     racconto.conArticolo, ma questa e' un'altra funzione. */
  const n = Negozi({ dist: () => 9999 });
  const casi = [
    { n: 'stazione di Roma San Pietro', t: 'stazione', vuole: /^la stazione/ },
    { n: 'Palazzo Reale',               t: 'palazzo',  vuole: /^il Palazzo/ },
    { n: 'Chiesa del Carmine',          t: 'chiesa',   vuole: /^la Chiesa/ },
    { n: 'Ospedale Maggiore',           t: 'ospedale', vuole: /^l'Ospedale/ }
  ];
  casi.forEach((c) => {
    const d = n.perIlRacconto([{ n: c.n, t: c.t, lat: 41.9, lon: 12.5 }], [])[0];
    if (!d) { guasto('scartato: ' + c.n); return; }
    const dentro = d.d.replace(/^Qui c'è /, '').replace(/\.$/, '');
    if (!c.vuole.test(dentro)) guasto('«' + c.n + '» → «' + dentro + '»');
  });
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei negozi');
process.exit(passate === fatti.length ? 0 : 1);
