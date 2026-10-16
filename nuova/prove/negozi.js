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

prova('senza scheda non si prende: non c\'è niente da dire', () => {
  const nuovi = n.perIlRacconto([{ n: 'chiesa senza voce', t: 'chiesa', lat: 43.77, lon: 11.25 }], []);
  if (nuovi.length) guasto('un nome da solo non è un racconto');
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

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove dei negozi');
process.exit(passate === fatti.length ? 0 : 1);
