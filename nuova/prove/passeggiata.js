/* LE PROVE DELLE PASSEGGIATE — nuova Yourbea
   «Le tappe una per volta, e si deve poter dire avanti, ancora, ferma»
   (Vince, 15/10). Ogni prova qui sotto è un difetto vero: o uno che la
   vecchia app aveva, o uno che in una guida parlata fa male.
   Si lancia:  node nuova/prove/passeggiata.js                              */

'use strict';
const fs = require('fs');
const path = require('path');
const Passeggiata = require('../parti/passeggiata.js');

let errori = [], fatti = [];
function guasto(m) { errori.push(m); }
function prova(nome, f) {
  errori = [];
  try { f(); } catch (e) { guasto('è scoppiata: ' + e.message); }
  if (errori.length) { console.log('NO  ' + nome); errori.forEach((e) => console.log('      ' + e)); fatti.push(false); }
  else { console.log('SI  ' + nome); fatti.push(true); }
}

/* metri e gradi veri, così le distanze delle prove sono quelle che si camminano */
function dist(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const a = Math.sin((la2 - la1) * r / 2) ** 2 +
            Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function verso(la1, lo1, la2, lo2) {
  const r = Math.PI / 180;
  const y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

/* un pezzo di Parma finto, con le misure vere: il Duomo, il Battistero a
   settanta metri, la Steccata a quattrocento, la Pilotta a seicento. */
const DUOMO = { n: 'Duomo di Parma', lat: 44.80309, lon: 10.33024, k: 2,
                d: 'Romanica, consacrata nel 1106.', i: 'La cupola del Correggio.', a: 'Da manuale: il duomo fu consacrato nel 1106.' };
const BATTISTERO = { n: 'Battistero di Parma', lat: 44.80252, lon: 10.33039, k: 3,
                     d: 'Ottagono di marmo rosa di Verona.', i: 'I mesi di Antelami.', a: 'Da manuale: Benedetto Antelami, 1196.' };
const STECCATA = { n: 'Santa Maria della Steccata', lat: 44.80183, lon: 10.32700, k: 2,
                   d: 'Pianta a croce greca.', i: 'Le vergini del Parmigianino.' };
const PILOTTA = { n: 'Palazzo della Pilotta', lat: 44.80430, lon: 10.32690, k: 2,
                  d: 'Il grande isolato farnesiano.', a: 'Da manuale: cantiere mai finito.' };
const FERRAMENTA = { n: 'Ferramenta Bazzini', lat: 44.80300, lon: 10.33000, k: 0, d: 'Chiodi e viti.' };
/* e due luoghi a Mantova, cinquanta chilometri più in là: servono a provare
   che una passeggiata lontana non venga proposta come se fosse qui */
const SANTANDREA = { n: 'Basilica di Sant\'Andrea', lat: 45.15870, lon: 10.79630, k: 3,
                     d: 'L\'Alberti, 1472.', i: 'La volta a botte.' };
const DUCALE = { n: 'Palazzo Ducale di Mantova', lat: 45.16000, lon: 10.80000, k: 3,
                 d: 'La città dei Gonzaga dentro la città.', i: 'La Camera degli Sposi.' };
const LUOGHI = [DUOMO, BATTISTERO, STECCATA, PILOTTA, FERRAMENTA, SANTANDREA, DUCALE];

const DATI = [{
  id: 'parma-centro', tema: 'architettura', citta: 'Parma',
  n: 'Parma — il centro: Duomo, Battistero, Steccata, Pilotta',
  metri: 1500,
  p: [[44.80309, 10.33024], [44.80252, 10.33039], [44.80183, 10.32700], [44.80430, 10.32690]],
  t: [{ n: 'Duomo di Parma', la: 44.80309, lo: 10.33024 },
      { n: 'Battistero di Parma', la: 44.80252, lo: 10.33039 },
      { n: 'Santa Maria della Steccata', la: 44.80183, lo: 10.32700 },
      { n: 'Palazzo della Pilotta', la: 44.80430, lo: 10.32690 }]
}, {
  id: 'parma-oltretorrente', tema: 'storia', citta: 'Parma',
  n: 'L\'Oltretorrente: la città che lavorava', metri: 900,
  p: [[44.80000, 10.32000], [44.79900, 10.31900]],
  t: [{ n: 'Santa Maria della Steccata', la: 44.80183, lo: 10.32700 },
      { n: 'Palazzo della Pilotta', la: 44.80430, lo: 10.32690 }]
}, {
  id: 'mantova-gonzaga', tema: 'arte', citta: 'Mantova',
  n: 'I Gonzaga: il Ducale e Sant\'Andrea', metri: 700,
  p: [[45.15870, 10.79630], [45.16000, 10.80000]],
  t: [{ n: 'Basilica di Sant\'Andrea', la: 45.15870, lo: 10.79630 },
      { n: 'Palazzo Ducale di Mantova', la: 45.16000, lo: 10.80000 }]
}];

/* l'orologio è nostro, come nelle prove della scena: certe regole parlano
   di «appena detto» e con l'ora vera non si potrebbero provare */
function mondo() {
  let adesso = 1000000;
  const pa = Passeggiata({ dist, verso, ora: () => adesso });
  pa.conDati(DATI, LUOGHI);
  pa.passano = (ms) => { adesso += ms; };
  pa.quandoE = () => adesso;
  return pa;
}

/* un giro col filo: due tappe e tre pezzi di racconto da dire camminando */
const COL_FILO = [{
  id: 'filo', tema: 'arte', citta: 'Parma', n: 'Il filo', metri: 500,
  p: [[44.80309, 10.33024], [44.80430, 10.32690]],
  t: [{ n: 'Duomo di Parma', la: 44.80309, lo: 10.33024, d: 'La prima tappa.',
        poi: ['Primo pezzo del racconto.', 'Secondo pezzo.', 'Terzo pezzo.'] },
      { n: 'Palazzo della Pilotta', la: 44.80430, lo: 10.32690, d: 'La seconda tappa.',
        poi: ['Pezzo della seconda strada.'] },
      { n: 'Santa Maria della Steccata', la: 44.80183, lo: 10.32700, d: 'La terza tappa.' }]
}];
function mondoColFilo() {
  let adesso = 1000000;
  const pa = Passeggiata({ dist, verso, ora: () => adesso });
  pa.conDati(COL_FILO, LUOGHI);
  pa.passano = (ms) => { adesso += ms; };
  pa.quandoE = () => adesso;
  return pa;
}
/* un punto a tot metri dal Duomo verso la Pilotta, per camminare davvero */
function lungoLaStrada(frazione) {
  const a = { lat: 44.80309, lon: 10.33024 }, b = { lat: 44.80430, lon: 10.32690 };
  return { lat: a.lat + (b.lat - a.lat) * frazione, lon: a.lon + (b.lon - a.lon) * frazione,
           direzione: 0, direzioneBuona: true };
}
const AL_DUOMO = { lat: 44.80309, lon: 10.33024, direzione: 180, direzioneBuona: true };
const LONTANO = { lat: 44.81500, lon: 10.34500, direzione: 0, direzioneBuona: true };

prova('le tappe sono luoghi veri, non nomi scritti a mano', () => {
  /* se una tappa non si ritrova fra i luoghi, non ha niente da dire: una
     tappa muta è peggio di una tappa che non c'è */
  const pa = mondo();
  if (pa.quante() !== 3) guasto('tre passeggiate nel banco, non ' + pa.quante());
  const d = pa.comincia('parma-centro', AL_DUOMO);
  if (!/Duomo di Parma/.test(d.testo)) guasto('la prima tappa è il Duomo: ' + d.testo);
  if (!/4 tappe/.test(d.testo)) guasto('le tappe si contano: ' + d.testo);
});

prova('una tappa inventata o che non è un luogo da raccontare si butta', () => {
  /* REGOLA 9: la scena intorno — negozi, attraversamenti — è di Utilità e la
     dice parti/scena.js. In una passeggiata si parla di arte, architettura e
     storia. Il 15/10, in Turismo, la vecchia app ha raccontato la ferramenta. */
  const pa = Passeggiata({ dist, verso });
  pa.conDati([{ id: 'storta', n: 'Storta', citta: 'Parma', metri: 200, p: [],
                t: [{ n: 'Duomo di Parma', la: 44.80309, lo: 10.33024 },
                    { n: 'Ferramenta Bazzini', la: 44.80300, lo: 10.33000 },
                    { n: 'Chiesa che non esiste', la: 44.80300, lo: 10.33000 },
                    { n: 'Battistero di Parma', la: 44.80252, lo: 10.33039 }] }], LUOGHI);
  const d = pa.comincia('storta', AL_DUOMO);
  if (!/2 tappe/.test(d.testo)) guasto('restano due tappe, non ' + d.testo);
  const giro = [d.testo, pa.avanti(AL_DUOMO).testo, (pa.avanti(AL_DUOMO) || {}).testo || ''].join(' ');
  if (/[Ff]erramenta/.test(giro)) guasto('la ferramenta non è una tappa: ' + giro);
  if (/non esiste/.test(giro)) guasto('un nome senza scheda non è una tappa: ' + giro);
});

prova('una passeggiata a tema porta il suo testo, e butta le clip del luogo', () => {
  /* In «Caravaggio a Roma» la tappa è San Luigi dei Francesi, ma quello che
     si va a vedere sono le tele della cappella Contarelli, non la facciata.
     E le clip incise dicono la scheda del luogo: tenerle farebbe sentire la
     facciata mentre sullo schermo c'è scritto il quadro. */
  const pa = Passeggiata({ dist, verso });
  pa.conDati([{ id: 'tema', n: 'Il tema', citta: 'Parma', metri: 300, p: [],
                t: [{ n: 'Duomo di Parma', la: 44.80309, lo: 10.33024,
                      d: 'Qui sopra c\'è la cupola del Correggio: si guarda in alto, non in faccia.' },
                    { n: 'Battistero di Parma', la: 44.80252, lo: 10.33039 }] }],
             LUOGHI.map((p) => Object.assign({ c: 'poi-99' }, p)));
  const d = pa.comincia('tema', AL_DUOMO);
  const t = pa.passo(AL_DUOMO);
  if (!t) return guasto('la prima tappa si racconta');
  if (!/cupola del Correggio/.test(t.testo)) guasto('il testo della passeggiata vince: ' + t.testo);
  if (/consacrata nel 1106/.test(t.testo)) guasto('e la scheda del luogo non si sente: ' + t.testo);
  if (t.luogo.c) guasto('le clip del luogo direbbero un\'altra cosa: vanno buttate');
  /* la tappa senza testo suo resta quella di sempre, clip comprese */
  pa.avanti(AL_DUOMO);
  const b = pa.passo({ lat: BATTISTERO.lat, lon: BATTISTERO.lon, direzione: 0, direzioneBuona: true });
  if (b && !/marmo rosa/.test(b.testo)) guasto('il Battistero tiene la sua scheda: ' + (b && b.testo));
  if (b && b.luogo.c !== 'poi-99') guasto('e le sue clip');
});

prova('si dice sempre in che città è', () => {
  /* nella vecchia app i percorsi di Torre del Greco finivano in cima solo
     perché erano i primi dell'archivio, e «Il centro sepolto» non dice dove */
  const pa = mondo();
  /* si prova su quella il cui NOME non nomina la città: se no la prova
     passerebbe anche con la città mai detta, perché «Parma — il centro»
     contiene «Parma» da sé. */
  const e = pa.elenco({ lat: STECCATA.lat, lon: STECCATA.lon, direzione: 0, direzioneBuona: true });
  if (!/Oltretorrente/.test(e.testo)) guasto('nell\'elenco c\'è anche quella: ' + e.testo);
  if (!/a Parma/.test(e.testo)) guasto('la città manca: ' + e.testo);
  if (!/a Parma/.test(pa.comincia('parma-oltretorrente', AL_DUOMO).testo)) guasto('e manca anche quando si comincia');
});

prova('non racconta una tappa dove non sei', () => {
  /* dire com'è fatta una facciata mentre sei a quattrocento metri è una
     bugia detta a chi non la può controllare: «avanti» dice il nome e dove è */
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  const d = pa.avanti({ lat: 44.80309, lon: 10.33024, direzione: 180, direzioneBuona: true });
  const lontana = pa.avanti(AL_DUOMO);   // la Steccata, a quattrocento metri
  if (/croce greca/.test(lontana.testo)) guasto('la scheda si sente arrivando: ' + lontana.testo);
  if (!/Steccata/.test(lontana.testo)) guasto('il nome però si dice: ' + lontana.testo);
  if (!/passi|metri/.test(lontana.testo)) guasto('e quanto manca: ' + lontana.testo);
  if (!d) guasto('la seconda tappa c\'è');
});

prova('arrivando alla tappa la racconta da sé', () => {
  const pa = mondo();
  pa.comincia('parma-centro', LONTANO);
  const niente = pa.passo(LONTANO);
  if (niente) guasto('da un chilometro non si racconta niente: ' + niente.testo);
  pa.passano(4 * 60000);                 // un chilometro e mezzo a piedi
  const d = pa.passo(AL_DUOMO);
  if (!d) guasto('addosso al Duomo si racconta');
  if (d && !/consacrata nel 1106/.test(d.testo)) guasto('con la sua scheda: ' + d.testo);
  if (d && !/Tappa 1 di 4/.test(d.testo)) guasto('e a che punto siamo: ' + d.testo);
});

prova('non dice due volte di fila il nome della tappa', () => {
  /* cominciando con la prima tappa sotto i piedi si sentiva «Tappa 1 di 4:
     Duomo di Parma… Ci siamo» e subito dopo «Tappa 1 di 4: Duomo di Parma.
     Romanica…»: l'app sembrava incantata */
  const pa = mondo();
  const via = pa.comincia('parma-centro', AL_DUOMO);
  if (!/Duomo di Parma/.test(via.testo)) guasto('il nome si dice una volta: ' + via.testo);
  const d = pa.passo(AL_DUOMO);
  if (!d) guasto('la scheda arriva');
  if (d && /Tappa 1 di 4/.test(d.testo)) guasto('ma non ridicendo tutto: ' + d.testo);
  if (d && !/consacrata nel 1106/.test(d.testo)) guasto('la scheda però sì: ' + d.testo);
  /* mentre dieci minuti dopo il nome ci vuole: chi cammina ha pensato ad altro */
  const pa2 = mondo();
  pa2.comincia('parma-centro', LONTANO);
  pa2.passano(10 * 60000);
  const d2 = pa2.passo(AL_DUOMO);
  if (d2 && !/Duomo di Parma/.test(d2.testo)) guasto('dopo dieci minuti il nome torna: ' + d2.testo);
});

prova('la tappa è quella dove sei, non quella che tocca all\'app', () => {
  /* chi fa il giro al contrario, o salta un pezzo, arriva alla quarta tappa
     mentre l'app aspetta la seconda: restare bloccati li' è il difetto */
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  pa.passo(AL_DUOMO);
  const d = pa.passo({ lat: PILOTTA.lat, lon: PILOTTA.lon, direzione: 0, direzioneBuona: true });
  if (!d) guasto('alla Pilotta si racconta la Pilotta');
  if (d && !/Pilotta/.test(d.testo)) guasto('e non la terza tappa: ' + d.testo);
  if (d && !/Tappa 4 di 4/.test(d.testo)) guasto('il conto si aggiorna: ' + d.testo);
});

prova('«ancora» scende di un gradino, e quando è finita lo dice', () => {
  /* gli stessi gradini del racconto: chi segue una passeggiata non deve
     imparare altri comandi */
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  pa.passo(AL_DUOMO);                       // la scheda
  const due = pa.ancora();
  if (!due || due.tipo !== 'cosa-vedere') guasto('secondo gradino: cosa vedere, non ' + (due && due.tipo));
  if (due && !/Correggio/.test(due.testo)) guasto('cosa vedere del Duomo: ' + due.testo);
  const tre = pa.ancora();
  if (!tre || tre.tipo !== 'approfondimento') guasto('terzo gradino: l\'approfondimento, non ' + (tre && tre.tipo));
  const fine = pa.ancora();
  if (!fine || fine.tipo !== 'finito') guasto('finiti i gradini si dice: ' + (fine && fine.tipo));
  if (fine && !/avanti/.test(fine.testo)) guasto('e si dice come andare avanti: ' + fine.testo);
});

prova('una tappa senza approfondimento non ne inventa uno', () => {
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  pa.avanti(AL_DUOMO); pa.avanti(AL_DUOMO);                 // la Steccata, che non ha «a»
  pa.passo({ lat: STECCATA.lat, lon: STECCATA.lon, direzione: 0, direzioneBuona: true });
  const due = pa.ancora();
  if (!due || due.tipo !== 'cosa-vedere') guasto('la Steccata ha il cosa vedere: ' + (due && due.tipo));
  const tre = pa.ancora();
  if (tre && tre.tipo === 'approfondimento') guasto('ma non l\'approfondimento: ' + tre.testo);
  if (!tre || tre.tipo !== 'finito') guasto('quindi è finita: ' + (tre && tre.tipo));
});

prova('«ferma» lascia la passeggiata, e una volta sola', () => {
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  const f = pa.ferma();
  if (!f || !/[Ll]ascio/.test(f.testo)) guasto('si dice che si lascia: ' + (f && f.testo));
  if (pa.inCorso()) guasto('e non si sta più seguendo niente');
  if (pa.ferma()) guasto('due volte no: non c\'è più niente da lasciare');
  if (pa.passo(AL_DUOMO)) guasto('e lasciata non parla più addosso al Duomo');
});

prova('fra una tappa e l\'altra racconta, un pezzo per volta', () => {
  /* fra due tappe c'era silenzio, e sono i minuti in cui uno cammina e
     avrebbe più voglia di ascoltare */
  const pa = mondoColFilo();
  pa.comincia('filo', lungoLaStrada(0));
  pa.passo(lungoLaStrada(0));                       // la prima tappa, raccontata
  pa.passano(20000);
  const uno = pa.filo(lungoLaStrada(0.2), pa.quandoE());
  if (!uno) return guasto('camminando il filo parte');
  if (!/Primo pezzo/.test(uno.testo)) guasto('si comincia dal primo: ' + uno.testo);
  /* uno per volta: subito dopo, niente */
  if (pa.filo(lungoLaStrada(0.25), pa.quandoE())) guasto('due pezzi di fila no');
  pa.passano(20000);
  const due = pa.filo(lungoLaStrada(0.4), pa.quandoE());
  if (!due || !/Secondo pezzo/.test(due.testo)) guasto('poi il secondo: ' + (due && due.testo));
});

prova('il filo non copre mai una frase che serve a muoversi', () => {
  /* esce come «cenno»: è il livello che il motore della voce butta quando
     c'è di meglio da dire — una svolta, un attraversamento, l'emergenza */
  const pa = mondoColFilo();
  pa.comincia('filo', lungoLaStrada(0));
  pa.passo(lungoLaStrada(0));
  pa.passano(20000);
  const d = pa.filo(lungoLaStrada(0.2), pa.quandoE());
  if (!d) return guasto('il filo c\'è');
  if (d.livello !== 'cenno') guasto('deve essere sacrificabile, non «' + d.livello + '»');
});

prova('fermo non si racconta il filo: fermo si racconta la tappa', () => {
  /* il filo è il racconto della strada: chi sta fermo davanti a una chiesa
     vuole sentire della chiesa */
  const pa = mondoColFilo();
  pa.comincia('filo', lungoLaStrada(0));
  pa.passo(lungoLaStrada(0));
  pa.passano(20000);
  const primo = pa.filo(lungoLaStrada(0.2), pa.quandoE());
  if (!primo) return guasto('il primo pezzo parte camminando');
  pa.passano(60000);
  if (pa.filo(lungoLaStrada(0.2), pa.quandoE())) guasto('fermo nello stesso punto, il filo tace');
});

prova('vicino alla tappa il filo tace, per non tagliare l\'arrivo', () => {
  const pa = mondoColFilo();
  pa.comincia('filo', lungoLaStrada(0));
  pa.passo(lungoLaStrada(0));
  pa.passano(30000);
  if (pa.filo(lungoLaStrada(0.97), pa.quandoE())) guasto('a venti passi dalla tappa non si comincia un racconto');
});

prova('chi cammina veloce perde dei pezzi e non se li ritrova addosso', () => {
  /* rimettere in coda quello che restava farebbe sentire il racconto della
     strada mentre sei già davanti alla chiesa */
  const pa = mondoColFilo();
  pa.comincia('filo', lungoLaStrada(0));
  pa.passo(lungoLaStrada(0));
  pa.passano(20000);
  pa.filo(lungoLaStrada(0.2), pa.quandoE());                  // solo il primo pezzo
  const arrivo = { lat: PILOTTA.lat, lon: PILOTTA.lon, direzione: 0, direzioneBuona: true };
  const t = pa.passo(arrivo);
  if (!t || !/seconda tappa/.test(t.testo)) guasto('arrivato, si racconta la tappa: ' + (t && t.testo));
  pa.passano(60000);
  const dopo = pa.filo(arrivo, pa.quandoE());
  if (dopo) guasto('e il filo di prima non torna: ' + dopo.testo);
});

prova('appena arrivato a una tappa il filo tace: parla la tappa', () => {
  /* se il pezzo di strada seguente partisse subito, si sentirebbe il
     racconto del cammino sopra la scheda della chiesa a cui sei appena
     arrivato: due cose diverse nello stesso momento */
  const pa = mondoColFilo();
  pa.comincia('filo', lungoLaStrada(0));
  pa.passo(lungoLaStrada(0));
  pa.passano(60000);
  const arrivo = { lat: PILOTTA.lat, lon: PILOTTA.lon, direzione: 0, direzioneBuona: true };
  const t = pa.passo(arrivo);
  if (!t) return guasto('alla seconda tappa si racconta la tappa');
  if (pa.filo(arrivo, pa.quandoE())) guasto('e il filo della strada dopo aspetta');
  /* ma ripartendo, dopo un po\' di strada, riprende */
  pa.passano(20000);
  const verso3 = { lat: 44.80300, lon: 10.32695, direzione: 0, direzioneBuona: true };
  const d = pa.filo(verso3, pa.quandoE());
  if (!d || !/seconda strada/.test(d.testo)) guasto('rimesso in cammino, riprende: ' + (d && d.testo));
});

prova('un giro senza filo non inventa niente da dire', () => {
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  pa.passo(AL_DUOMO);
  pa.passano(40000);
  if (pa.filo({ lat: 44.80280, lon: 10.33030, direzione: 0, direzioneBuona: true }, pa.quandoE())) {
    guasto('dove non c\'è racconto scritto, si tace');
  }
});

prova('«zitto» zittisce, «ferma» lascia il giro', () => {
  /* provandola a Parma: detto «ferma» per far tacere la voce, la
     passeggiata era sparita e «ancora» raccontava di nuovo la stessa
     scheda. Chi dice «zitto» sta ancora camminando. */
  const pa = mondo();
  if (pa.dallaVoce('zitto')) guasto('«zitto» non lascia niente');
  if (pa.dallaVoce('silenzio un attimo')) guasto('«silenzio» nemmeno');
  const f = pa.dallaVoce('ferma');
  if (!f || f.cosa !== 'ferma') guasto('«ferma» lascia il giro: ' + JSON.stringify(f));
  const b = pa.dallaVoce('basta');
  if (!b || b.cosa !== 'ferma') guasto('e «basta» pure: ' + JSON.stringify(b));
});

prova('non promette quello che l\'app non fa', () => {
  /* la vecchia prometteva «quando vuoi, dimmi: percorsi» e poi restava
     zitta. E «ti guido» non è vero: l'app dice le tappe, non ti porta. */
  const pa = mondo();
  const frasi = [pa.elenco(AL_DUOMO).testo, pa.comincia(0, AL_DUOMO).testo,
                 pa.avanti(AL_DUOMO).testo];
  frasi.forEach((t) => {
    if (/ti guido|ti porto|ti accompagno|passo passo|mano nella mano/i.test(t)) guasto('promessa che non mantiene: ' + t);
  });
});

prova('non dice mai dove mettere i piedi', () => {
  /* il GPS a piedi sbaglia dai dieci ai trenta metri: «attraversa qui» è
     una frase che può far male */
  const pa = mondo();
  const frasi = [pa.elenco(AL_DUOMO).testo, pa.comincia(0, AL_DUOMO).testo,
                 pa.avanti(AL_DUOMO).testo, pa.avanti(AL_DUOMO).testo];
  frasi.forEach((t) => {
    if (/\battraversa\b|\bgira a\b|\bprosegui\b|\bvai dritto\b|\bsvolta\b/i.test(t)) guasto('ordine sui piedi: ' + t);
  });
});

prova('le distanze si dicono in passi, e i passi si contano fino a un punto', () => {
  /* «una quarantina di passi» si cammina; «quattromila passi» non è una
     misura, e sopra i trecento metri si torna a metri e chilometri */
  const pa = mondo();
  if (!/passi/.test(pa.quanto(30))) guasto('trenta metri sono passi: ' + pa.quanto(30));
  if (!/pochi passi/.test(pa.quanto(3))) guasto('tre metri sono pochi passi: ' + pa.quanto(3));
  if (/passi/.test(pa.quanto(800))) guasto('ottocento metri non si contano in passi: ' + pa.quanto(800));
  if (!/chilometr/.test(pa.quanto(2300))) guasto('due chilometri e tre: ' + pa.quanto(2300));
  if (/\./.test(pa.quanto(2300))) guasto('il punto decimale si legge male: ' + pa.quanto(2300));
});

prova('senza bussola buona niente destra e sinistra', () => {
  /* se non si sa come sei girato, «sulla destra» è una bugia */
  const pa = mondo();
  /* la direzione ARRIVA COMUNQUE, vecchia di un minuto: il telefono la dà
     sempre, ed è direzioneBuona a dire se vale. Se la prova non la passasse,
     non proverebbe niente. */
  const storto = { lat: AL_DUOMO.lat, lon: AL_DUOMO.lon, direzione: 0, direzioneBuona: false };
  pa.comincia('parma-centro', storto);
  const d = pa.avanti(storto);
  if (/destra|sinistra|davanti a te/.test(d.testo)) guasto('senza bussola si tace su destra e sinistra: ' + d.testo);
  if (!/a nord|a sud|a est|a ovest/.test(d.testo)) guasto('restano i punti cardinali: ' + d.testo);
});

prova('la stessa tappa non si racconta due volte', () => {
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  const primo = pa.passo(AL_DUOMO);
  if (!primo) guasto('la prima volta si racconta');
  if (pa.passo(AL_DUOMO)) guasto('fermo davanti al Duomo non si risente la stessa scheda');
});

prova('l\'ultima tappa chiude la passeggiata', () => {
  const pa = mondo();
  pa.comincia('parma-centro', AL_DUOMO);
  pa.avanti(AL_DUOMO); pa.avanti(AL_DUOMO); pa.avanti(AL_DUOMO);     // 2, 3, 4
  const fine = pa.avanti(AL_DUOMO);
  if (!fine || fine.tipo !== 'finita') guasto('dopo l\'ultima si chiude: ' + (fine && fine.tipo));
  if (fine && !/finisce qui/.test(fine.testo)) guasto('e si dice: ' + fine.testo);
  if (pa.inCorso()) guasto('e non si sta più seguendo niente');
});

prova('«comincia la prima» funziona anche senza aver chiesto l\'elenco', () => {
  /* nella vecchia, «comincia il primo» senza elenco rispondeva «non ho
     capito quale»: l'utente non ha fatto niente di sbagliato */
  const pa = mondo();
  const d = pa.comincia(0, AL_DUOMO);
  if (!d || d.tipo !== 'parto') guasto('si comincia la più vicina: ' + (d && d.tipo));
  if (d && !/Duomo/.test(d.testo)) guasto('cioè quella del centro: ' + d.testo);
});

prova('una passeggiata si può prendere a metà strada', () => {
  /* se ti passa accanto alla terza tappa, non si torna al punto di partenza */
  const pa = mondo();
  const d = pa.comincia('parma-centro', { lat: STECCATA.lat, lon: STECCATA.lon, direzione: 0, direzioneBuona: true });
  if (!/Tappa 3 di 4/.test(d.testo)) guasto('si parte da dove sei: ' + d.testo);
  if (!/Steccata/.test(d.testo)) guasto('cioè dalla Steccata: ' + d.testo);
});

prova('dalla voce si distingue l\'elenco dal cominciare', () => {
  const pa = mondo();
  const e = pa.dallaVoce('che passeggiate ci sono');
  if (!e || e.cosa !== 'elenco') guasto('«che passeggiate ci sono» è un elenco: ' + JSON.stringify(e));
  const p = pa.dallaVoce('comincia la prima');
  if (!p || p.cosa !== 'comincia' || p.quale !== 0) guasto('«comincia la prima» è la prima: ' + JSON.stringify(p));
  const s = pa.dallaVoce('cominciamo la seconda');
  if (!s || s.quale !== 1) guasto('«la seconda» è la seconda: ' + JSON.stringify(s));
  const n = pa.dallaVoce('seguiamo la passeggiata dell oltretorrente');
  if (!n || n.cosa !== 'comincia') guasto('anche per nome si comincia: ' + JSON.stringify(n));
  if (pa.dallaVoce('dove sono')) guasto('«dove sono» non è una passeggiata');
  if (pa.dallaVoce('portami a via mazzini')) guasto('«portami a» è della guida, non delle passeggiate');
});

prova('per nome si prende quella giusta', () => {
  const pa = mondo();
  const d = pa.comincia('seguiamo la passeggiata dell oltretorrente', AL_DUOMO);
  if (!d || d.tipo !== 'parto') guasto('la trova: ' + (d && d.tipo));
  if (d && !/Oltretorrente/.test(d.testo)) guasto('quella dell\'Oltretorrente: ' + d.testo);
  const no = pa.comincia('la passeggiata dei sommergibili', AL_DUOMO);
  if (no && no.tipo === 'parto') guasto('e quella che non c\'è non si comincia a caso: ' + no.testo);
});

prova('una passeggiata a cinquanta chilometri non si propone come se fosse qui', () => {
  /* provandola a Parma — dove di passeggiate ce n'è una — l'app offriva come
     seconda e terza due giri di Mantova, «comincia a 52 chilometri da te»:
     a chi chiede cosa può fare adesso, non servono */
  const pa = mondo();
  const e = pa.elenco(AL_DUOMO);
  if (/Mantova|Gonzaga/.test(e.testo)) guasto('cinquanta chilometri non sono qui: ' + e.testo);
  if (!/Duomo|centro/.test(e.testo)) guasto('quella di qui però c\'è: ' + e.testo);
  /* e se qui non c'è niente, si dice dov'è la più vicina: è
     un'informazione, non una proposta */
  const lontano = { lat: 43.0000, lon: 12.0000, direzione: 0, direzioneBuona: true };
  const v = pa.elenco(lontano);
  if (v.tipo !== 'niente') guasto('in mezzo all\'Umbria non ne ha: ' + v.testo);
  if (!/non ho passeggiate/.test(v.testo)) guasto('e lo dice: ' + v.testo);
  if (!/chilometri/.test(v.testo)) guasto('dicendo quanto è lontana la più vicina: ' + v.testo);
});

prova('non dice da che parte è una tappa su cui sei già', () => {
  /* al Duomo di Parma, con la tappa sotto i piedi, diceva «dietro di te»:
     a dodici metri la direzione è rumore del GPS, e detta a chi non vede
     lo fa girare su se stesso */
  const pa = mondo();
  const d = pa.comincia('parma-centro', AL_DUOMO);
  if (/dietro di te|sulla destra|sulla sinistra|davanti a te|a nord|a sud/.test(d.testo)) {
    guasto('sei sopra la tappa: la direzione non vuol dire niente: ' + d.testo);
  }
  if (!/pochi passi|qui/.test(d.testo)) guasto('si dice che ci sei: ' + d.testo);
  /* ma su una tappa lontana la direzione serve */
  const via = pa.avanti(AL_DUOMO);
  if (!/destra|sinistra|davanti|dietro|a nord|a sud|a est|a ovest/.test(via.testo)) {
    guasto('per quella a settanta metri la direzione ci vuole: ' + via.testo);
  }
});

prova('la città non si dice due volte', () => {
  /* «Parma — il centro: Duomo, Battistero, Steccata, Pilotta, a Parma» è la
     stessa figura del «Latina, Latina» che faceva la guida */
  const pa = mondo();
  const d = pa.comincia('parma-centro', AL_DUOMO);
  /* «Duomo di Parma» è il nome della tappa e ci vuole: quello che non ci
     vuole è il «, a Parma» appiccicato a un nome che già dice Parma */
  if (/, a Parma/.test(d.testo)) guasto('la città appiccicata due volte: ' + d.testo);
  /* nell'elenco il «, a Parma» ci sta per l'Oltretorrente, il cui nome non
     la dice: quello che non ci deve stare è dopo un nome che già la dice */
  if (/Pilotta, a Parma/.test(pa.elenco(AL_DUOMO).testo)) guasto('e nell\'elenco uguale');
  /* ma dove il nome non la dice, la città ci vuole */
  const o = pa.comincia('parma-oltretorrente', AL_DUOMO);
  if (!/a Parma/.test(o.testo)) guasto('qui invece serve: ' + o.testo);
});

/* ---------- e adesso i dati veri: 101 passeggiate, 732 tappe ---------- */
prova('le passeggiate vere si leggono tutte, e ogni tappa ha una scheda', () => {
  /* una tappa che non si ritrova nei luoghi resterebbe muta: qui si
     controlla che non ce ne sia nessuna, sui dati che vanno sul telefono */
  const qui = path.join(__dirname, '..');
  const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati/passeggiate.json'), 'utf8'));
  const luoghi = JSON.parse(fs.readFileSync(path.join(qui, 'dati/luoghi.json'), 'utf8'));
  const pa = Passeggiata({ dist, verso });
  const quante = pa.conDati(dati, luoghi);
  if (quante !== dati.length) guasto(dati.length + ' passeggiate nei dati, ' + quante + ' buone: qualche tappa non si ritrova');
  if (quante < 100) guasto('erano 102 nella vecchia app, adesso sono ' + quante);
  dati.forEach((x) => {
    if (!x.citta) guasto(x.id + ' non dice in che città è');
    if (!x.t || x.t.length < 2) guasto(x.id + ' ha meno di due tappe');
    if (!x.metri) guasto(x.id + ' non dice quanto è lunga');
  });
});

prova('un giro a tema dice sempre se si paga', () => {
  /* Vince, 16/10: «se una tappa è dentro un museo a pagamento, va detto
     nella scheda». Chi non vede non può leggere il cartello all'ingresso, e
     il turista che arriva davanti a una biglietteria che non si aspettava
     ha già perso il giro. Vale per le tappe che si portano il testo loro:
     quelle sono le tappe dei giri a tema, scritte a mano. */
  const qui = path.join(__dirname, '..');
  const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati/passeggiate.json'), 'utf8'));
  const tema = dati.filter((g) => (g.t || []).some((t) => t.d));
  if (!tema.length) return guasto('di giri a tema non ce n\'è nessuno');
  tema.forEach((g) => {
    g.t.forEach((t) => {
      if (!t.d) return guasto(g.id + ': la tappa ' + t.n + ' non ha il suo testo');
      if (!/si paga|senza pagare|bigliett|ingresso libero|gratis|non si paga/i.test(t.d)) {
        guasto(g.id + ' — ' + t.n + ': non dice come si entra');
      }
    });
  });
});

prova('un giro a tema ha il filo fra una tappa e l\'altra', () => {
  /* «arricchirli di racconti fra una tappa e l'altra» (Vince, 16/10): fra
     due chiese ci sono i minuti in cui uno cammina e ascolta meglio. Un
     giro a tema senza filo è un elenco di schede. L'ultima tappa non ne ha
     bisogno: dopo non si cammina più. */
  const qui = path.join(__dirname, '..');
  const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati/passeggiate.json'), 'utf8'));
  const tema = dati.filter((g) => (g.t || []).some((t) => t.d));
  tema.forEach((g) => {
    const conFilo = g.t.slice(0, -1).filter((t) => (t.poi || []).length).length;
    if (conFilo < g.t.length - 2) {
      guasto(g.id + ': solo ' + conFilo + ' tappe su ' + (g.t.length - 1) + ' hanno il racconto della strada');
    }
    g.t.forEach((t) => (t.poi || []).forEach((pz) => {
      if (pz.length > 320) guasto(g.id + ' — ' + t.n + ': un pezzo di filo lungo ' + pz.length + ' caratteri non si ascolta camminando');
      if (/\battraversa\b|\bgira a\b|\bprosegui\b/i.test(pz)) guasto(g.id + ': il filo non dà ordini sui piedi — ' + pz);
    }));
  });
});

prova('le lunghezze dei giri sono quelle che si camminano', () => {
  /* una riga dritta fra due tappe passa dentro i palazzi e dà una
     lunghezza più corta del vero: i metri li deve dire chi conosce le
     strade. Un cammino non può essere più corto della linea d'aria che
     unisce le stesse tappe: se lo è, qualcuno ha tirato righe. */
  const qui = path.join(__dirname, '..');
  const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati/passeggiate.json'), 'utf8'));
  dati.forEach((g) => {
    let aria = 0;
    for (let i = 1; i < g.t.length; i++) aria += dist(g.t[i - 1].la, g.t[i - 1].lo, g.t[i].la, g.t[i].lo);
    if (g.metri < Math.round(aria) - 1) guasto(g.id + ': ' + g.metri + ' m dichiarati, ma in linea d\'aria sono già ' + Math.round(aria));
    if (!g.p || g.p.length < 2) guasto(g.id + ': senza la linea della strada la mappa non disegna niente');
  });
});

prova('nessun giro ripassa dalla stessa tappa, e due giri non sono lo stesso giro', () => {
  const qui = path.join(__dirname, '..');
  const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati/passeggiate.json'), 'utf8'));
  const insiemi = [];
  dati.forEach((g) => {
    const nomi = g.t.map((t) => t.n);
    if (new Set(nomi).size !== nomi.length) guasto(g.id + ' passa due volte dallo stesso luogo');
    /* due giri con lo stesso nome in codice: «comincia quello» ne prende
       sempre uno solo, e l'altro non si può chiedere. Nei dati della vecchia
       app ce n'erano due chiamati «napoli-sanita». */
    if (insiemi.some((x) => x.id === g.id)) guasto('due giri si chiamano tutti e due ' + g.id);
    const mio = new Set(nomi);
    insiemi.forEach((altro) => {
      /* il giro «al contrario» è voluto, e nella vecchia app si chiamava
         così: «roma» e «roma-rev», dal Colosseo a Palazzo Chigi e indietro.
         Quello non è un doppione: è l'altro senso di marcia. */
      if (g.id === altro.id + '-rev' || altro.id === g.id + '-rev') return;
      const comuni = [...mio].filter((n) => altro.nomi.has(n)).length;
      if (comuni / mio.size > 0.8 && comuni / altro.nomi.size > 0.8) {
        guasto(g.id + ' e ' + altro.id + ' sono lo stesso giro con due nomi');
      }
    });
    insiemi.push({ id: g.id, nomi: mio });
  });
});

prova('una passeggiata vera si fa da capo a fondo', () => {
  /* il giro di Parma, la città dove la nuova app è stata provata: si comincia, si arriva
     al Duomo, si sente la scheda, si va avanti, e alla fine si chiude */
  const qui = path.join(__dirname, '..');
  const dati = JSON.parse(fs.readFileSync(path.join(qui, 'dati/passeggiate.json'), 'utf8'));
  const luoghi = JSON.parse(fs.readFileSync(path.join(qui, 'dati/luoghi.json'), 'utf8'));
  const pa = Passeggiata({ dist, verso });
  pa.conDati(dati, luoghi);
  const parma = dati.filter((x) => x.citta === 'Parma')[0];
  if (!parma) return guasto('fra le passeggiate vere Parma non c\'è');
  const dove = { lat: parma.t[0].la, lon: parma.t[0].lo, direzione: 0, direzioneBuona: true };
  const via = pa.comincia(parma.id, dove);
  if (!via || via.tipo !== 'parto') guasto('non parte: ' + JSON.stringify(via));
  const prima = pa.passo(dove);
  if (!prima) guasto('addosso alla prima tappa si racconta');
  if (prima && prima.testo.length < 40) guasto('con la sua scheda, non col solo nome: ' + (prima && prima.testo));
  let giri = 0, ultima = null;
  while (giri < 60) {
    const d = pa.avanti(dove);
    giri++;
    if (!d) { guasto('si è fermata senza chiudere'); break; }
    if (d.tipo === 'finita') { ultima = d; break; }
  }
  if (!ultima) guasto('dopo ' + giri + ' «avanti» non ha mai chiuso');
  if (pa.inCorso()) guasto('e alla fine non resta in corso');
});

/* COME CI SI ARRIVA — controllati tutti i salti dei 137 giri chiedendo a
   Valhalla la strada vera: uno solo non si cammina, San Michele in Isola a
   Venezia (1.462 m in linea, 4.454 a piedi: e' l'isola del cimitero).    */
prova('una tappa che non si cammina dice come arrivarci', () => {
  const adesso = 1000000;
  const pa = Passeggiata({ dist, verso, ora: () => adesso });
  const giro = [{ id: 'venezia-codussi', tema: 'arte', citta: 'Venezia',
    n: 'Codussi', metri: 1500, t: [
      { n: 'Ca Vendramin Calergi', la: 45.4425, lo: 12.3290 },
      { n: 'Chiesa di San Michele in Isola', la: 45.4458, lo: 12.3470,
        come: 'Ci si arriva in vaporetto, dalle Fondamente Nove.' }
    ] }];
  const luoghi = giro[0].t.map((t) => ({ n: t.n, lat: t.la, lon: t.lo, k: 1, d: 'Una scheda.' }));
  pa.conDati(giro, luoghi);
  pa.comincia('venezia-codussi', { lat: 45.4425, lon: 12.3290, direzione: 0, direzioneBuona: true });
  const d = pa.avanti({ lat: 45.4425, lon: 12.3290, direzione: 0, direzioneBuona: true });
  if (!d) { guasto('la seconda tappa non e arrivata'); return; }
  if (!/vaporetto/.test(d.testo)) guasto('non dice come arrivarci: ' + d.testo);
  console.log('      → ' + d.testo);
});


/* ============================================================
   QUI C'E' UN PERCORSO
   «Quando camminando mi avvicino a un percorso potremmo dire: qui c'e' il
   percorso Bernini o Borromini», e «secondo me i percorsi devono essere
   legati alla posizione» (Vince, 23/10).
   ============================================================ */
function giroDiProva() {
  return [{ id: 'roma-bernini', tema: 'arte', citta: 'Roma', n: 'Bernini a Roma',
            metri: 900, t: [
    { n: 'Fontana dei Quattro Fiumi', la: 41.8992, lo: 12.4731 },
    { n: 'Sant Andrea al Quirinale', la: 41.9008, lo: 12.4890 },
    { n: 'Palazzo Barberini', la: 41.9036, lo: 12.4895 }
  ] }];
}
function conIlGiro(adesso) {
  const g = giroDiProva();
  const pa = Passeggiata({ dist, verso, ora: () => adesso });
  const luoghi = g[0].t.map((t) => ({ n: t.n, lat: t.la, lon: t.lo, k: 1, d: 'Una scheda.' }));
  pa.conDati(g, luoghi);
  return pa;
}

prova('sopra al percorso lo offre, e chiede', () => {
  const pa = conIlGiro(1000000);
  const d = pa.quiCeIlPercorso({ lat: 41.8992, lon: 12.4731 }, 1000000);
  if (!d) { guasto('non ha offerto niente stando sulla prima tappa'); return; }
  if (!/Bernini/.test(d.testo)) guasto('non dice quale: ' + d.testo);
  if (!/vuoi seguire questo o continuare/i.test(d.testo)) guasto('non chiede: ' + d.testo);
  if (d.livello !== 'cenno') guasto('livello sbagliato: ' + d.livello);
  console.log('      → ' + d.testo);
});

/* LA COSA CHIESTA IL 23/10: legati alla posizione. In mezzo al giro, a
   duecento metri dalla partenza ma addosso alla seconda tappa, il percorso
   c'e' lo stesso — e comincia() parte da li', non torna indietro. */
prova('a meta strada lo offre lo stesso', () => {
  const pa = conIlGiro(1000000);
  const qui = { lat: 41.9008, lon: 12.4890, direzione: 0, direzioneBuona: true };
  const lontanoDallaPrima = dist(qui.lat, qui.lon, 41.8992, 12.4731);
  if (lontanoDallaPrima < 400) { guasto('la prova non prova niente: la partenza e vicina'); return; }
  const d = pa.quiCeIlPercorso(qui, 1000000);
  if (!d) { guasto('a ' + Math.round(lontanoDallaPrima) + ' m dalla partenza non lo offre'); return; }
  const p = pa.comincia(d.quale, qui);
  if (!/Tappa 2/.test(p.testo)) guasto('non parte dalla tappa dove sei: ' + p.testo);
  console.log('      → a ' + Math.round(lontanoDallaPrima) + ' m dalla partenza, parte dalla 2');
});

prova('lontano dal percorso non dice niente', () => {
  const pa = conIlGiro(1000000);
  if (pa.quiCeIlPercorso({ lat: 41.9200, lon: 12.5100 }, 1000000)) guasto('offre un giro a due chilometri');
});

prova('lo offre una volta sola', () => {
  const pa = conIlGiro(1000000);
  const qui = { lat: 41.8992, lon: 12.4731 };
  if (!pa.quiCeIlPercorso(qui, 1000000)) { guasto('la prima volta non lo offre'); return; }
  if (pa.quiCeIlPercorso(qui, 1000000 + 3600000)) guasto('lo rioffre dopo un ora: diventa un venditore');
});

prova('non ne offre due di fila', () => {
  const g = giroDiProva();
  g.push({ id: 'roma-borromini', tema: 'arte', citta: 'Roma', n: 'Borromini a Roma',
           metri: 800, t: [{ n: 'Sant Ivo alla Sapienza', la: 41.8985, lo: 12.4740 },
                           { n: 'Sant Agnese in Agone', la: 41.8989, lo: 12.4722 }] });
  const pa = Passeggiata({ dist, verso, ora: () => 1000000 });
  const luoghi = [];
  g.forEach((x) => x.t.forEach((t) => luoghi.push({ n: t.n, lat: t.la, lon: t.lo, k: 1, d: 'Una scheda.' })));
  pa.conDati(g, luoghi);
  const qui = { lat: 41.8990, lon: 12.4735 };
  if (!pa.quiCeIlPercorso(qui, 1000000)) { guasto('il primo non esce'); return; }
  if (pa.quiCeIlPercorso(qui, 1000000 + 60000)) guasto('un minuto dopo ne offre un altro');
  if (!pa.quiCeIlPercorso(qui, 1000000 + 400000)) guasto('dopo sette minuti il secondo deve poter uscire');
});

prova('mentre ne fai una non ne offre altre', () => {
  const pa = conIlGiro(1000000);
  pa.comincia('roma-bernini', { lat: 41.8992, lon: 12.4731, direzione: 0, direzioneBuona: true });
  if (pa.quiCeIlPercorso({ lat: 41.8992, lon: 12.4731 }, 1000000)) guasto('offre un giro mentre ne stai facendo uno');
});

prova('«si» dopo la domanda comincia quel percorso', () => {
  const pa = conIlGiro(1000000);
  const qui = { lat: 41.8992, lon: 12.4731, direzione: 0, direzioneBuona: true };
  pa.quiCeIlPercorso(qui, 1000000);
  const r = pa.dallaVoce('si', 1000000 + 4000);
  if (!r || r.cosa !== 'comincia') { guasto('«si» non l ha capito: ' + JSON.stringify(r)); return; }
  const p = pa.comincia(r.nome, qui);
  if (!pa.inCorso()) guasto('non e partita: ' + p.testo);
});

/* «Continua» durante una passeggiata vuol dire «raccontami di piu». Subito
   dopo la domanda vuol dire «no grazie»: e la domanda che cambia la
   parola, e per questo la risposta si guarda PRIMA di tutto il resto. */
prova('«continuo» dopo la domanda vuol dire no', () => {
  const pa = conIlGiro(1000000);
  const qui = { lat: 41.8992, lon: 12.4731 };
  pa.quiCeIlPercorso(qui, 1000000);
  const r = pa.dallaVoce('continuo', 1000000 + 3000);
  if (!r || r.cosa !== 'continuo') { guasto('non l ha capito come un no: ' + JSON.stringify(r)); return; }
  if (pa.inCorso()) guasto('e partita lo stesso');
});

prova('«si» senza domanda non comincia niente', () => {
  const pa = conIlGiro(1000000);
  if (pa.dallaVoce('si', 1000000)) guasto('un «si» qualunque fa partire una passeggiata');
});

prova('la risposta scade', () => {
  const pa = conIlGiro(1000000);
  pa.quiCeIlPercorso({ lat: 41.8992, lon: 12.4731 }, 1000000);
  if (pa.dallaVoce('si', 1000000 + 600000)) guasto('un «si» dieci minuti dopo fa ancora partire il giro');
});

const passate = fatti.filter(Boolean).length;
console.log('');
console.log(passate + '/' + fatti.length + ' prove delle passeggiate');
process.exit(passate === fatti.length ? 0 : 1);
