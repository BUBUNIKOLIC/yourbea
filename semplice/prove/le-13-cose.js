/* LE TREDICI COSE — il banco della semplice.
   Una prova per cosa, e nessuna passa a vuoto: la prima riga controlla
   sempre che quello che si prova sia ARRIVATO (è l'errore di stamattina,
   otto prove su dieci che dicevano SI senza che il motore ricevesse
   niente).
   Si lancia:  node semplice/prove/le-13-cose.js                       */
'use strict';
const path = require('path');
const P = (f) => require(path.join(__dirname, '../../nuova/parti/', f));
const Semplice = require('../app.js');
let fatti = [];
function prova(nome, ok, come) { console.log((ok ? 'SI  ' : 'NO  ') + nome + (come ? '  — ' + come : '')); fatti.push(!!ok); }

/* il telefono finto: dice solo quello che il guscio dice davvero */
function telefono() {
  const detto = [];
  const f = {
    urbeaNonSenteSeStessa: true,
    urbeaDiario: () => {},
    chiuso: false,
    urbeaChiudi: function () { f.chiuso = true; },
    diarioMandato: null,
    urbeaMandaDiario: function (t) { f.diarioMandato = t; },
    detto: detto,
    /* la voce finta: scrive quello che direbbe e finisce subito */
    speechSynthesis: {
      speak: function (u) { detto.push(u.text); if (u.onend) setTimeout(u.onend, 0); },
      cancel: function () {}, getVoices: function () { return []; },
      addEventListener: function () {}, removeEventListener: function () {}
    }
  };
  return f;
}

function mondo(quello) {
  let t = 100000;
  const f = telefono();
  const parti = { Turno: P('turno.js'), Posizione: P('posizione.js'), Voce: P('voce.js') };
  const app = Semplice(Object.assign({
    finestra: f, parti: parti, ora: () => t
  }, quello || {}));
  app.passa = (ms) => { t += ms; };
  app.finta = f;
  app.dette = () => f.detto;
  return app;
}

/* ---------- 12. LE NOVE REGOLE: senza nome non e' per lei ---------- */
let a = mondo();
prova('12. senza il nome non e\' per lei', a.sentita('dove sono') === false);
prova('12. col nome si', a.sentita('yourbea dove sono') === true);
prova('12. «fermati» vince sempre', a.sentita('fermati') === true);

/* ---------- 1. DOVE SONO ---------- */
a = mondo();
a.posizione.dalGuscio(41.8263, 12.4754, 6);
a.posizione.quantiPassi(10);
let s = a.posizione.leggi();
prova('1. PRIMA DI TUTTO: la posizione e\' arrivata', s.pronto === true, 'pronto:' + s.pronto);
a.sentita('yourbea dove sono');
prova('1. dice dove sei, o che non lo sa', a.dette().length === 1, a.dette().join(' | '));

/* e se il telefono e' impreciso, lo dice */
a = mondo();
a.posizione.dalGuscio(41.8263, 12.4754, 70);
a.sentita('yourbea dove sono');
prova('1. se e\' impreciso lo dice', /posso sbagliare di/.test(a.dette().join(' ')), a.dette().join(' | '));

/* ---------- 7. QUI INTORNO ---------- */
a = mondo({ intorno: () => [{ nome: 'una panchina', metri: 12, lato: 'sulla destra' },
                            { nome: 'un bar', metri: 30 }] });
a.posizione.dalGuscio(41.8263, 12.4754, 6);
a.sentita('yourbea cosa c\'è qui intorno');
prova('7. dice quello che ha intorno', /panchina/.test(a.dette().join(' ')), a.dette().join(' | '));
a = mondo({ intorno: () => [] });
a.posizione.dalGuscio(41.8263, 12.4754, 6);
a.sentita('yourbea cosa c\'è qui intorno');
prova('7. e se non ha niente lo dice', /niente da dirti/.test(a.dette().join(' ')), a.dette().join(' | '));

/* ---------- 8. FERMATI, anche mentre parla ---------- */
a = mondo();
a.posizione.dalGuscio(41.8263, 12.4754, 6);
a.sentita('yourbea dove sono');
const quante = a.dette().length;
a.sentita('yourbea fermati');
prova('8. «fermati» non aggiunge una frase sopra', a.dette().length === quante, a.dette().join(' | '));
prova('8. e nel quaderno c\'e\' scritto', a.quaderno().some((r) => /FERMATI/.test(r)));

/* ---------- 10. CHIUDI ---------- */
a = mondo();
a.sentita('yourbea chiudi');
prova('10. chiude per davvero', a.finta.chiuso === true);

/* ---------- 9. MANDA IL DIARIO ---------- */
a = mondo();
a.sentita('yourbea manda il diario');
prova('9. manda il quaderno al guscio', typeof a.finta.diarioMandato === 'string' && a.finta.diarioMandato.length > 0);

/* ---------- 2-6. PORTAMI A ----------
   Tre strade: un posto tuo, un tipo di posto, un indirizzo. E la
   differenza che il 6/11 non c'era: «la farmacia piu' vicina» e' un
   TIPO, «la farmacia Corsetti» e' un NOME. */
function conLaGuida(extra) {
  const andati = [];
  const m = mondo(Object.assign({
    guida: { vaiA: function (meta, qui, dove, p) { andati.push(meta); } },
    cercaTipo: function (tipo, s, poi) { m.tipiChiesti.push(tipo); poi({ nome: 'la ' + tipo, lat: 41.827, lon: 12.476 }); },
    cercaIndirizzo: function (dove, s, poi) { m.indirizziChiesti.push(dove); poi({ nome: dove, lat: 41.828, lon: 12.477 }); }
  }, extra || {}));
  m.tipiChiesti = []; m.indirizziChiesti = []; m.andati = andati;
  m.posizione.dalGuscio(41.8263, 12.4754, 6);
  return m;
}

a = conLaGuida();
a.sentita('yourbea portami alla farmacia corsetti');
prova('2. «la farmacia Corsetti» e\' un NOME, non un tipo',
      a.indirizziChiesti[0] === 'farmacia corsetti' && a.tipiChiesti.length === 0,
      'nomi:' + a.indirizziChiesti.join(',') + ' tipi:' + a.tipiChiesti.join(','));
a = conLaGuida();
a.sentita('yourbea portami alla farmacia più vicina');
prova('3. «la farmacia piu\' vicina» e\' un TIPO', a.tipiChiesti[0] === 'farmacia',
      'tipi:' + a.tipiChiesti.join(','));
a = conLaGuida();
a.sentita('yourbea portami alla fermata dell\'autobus');
prova('4. «la fermata dell\'autobus» e\' un tipo', a.tipiChiesti[0] === 'fermata', a.tipiChiesti.join(','));
a = conLaGuida();
a.sentita('yourbea portami alla metro più vicina');
prova('5. «la metro piu\' vicina» e\' la metropolitana', a.tipiChiesti[0] === 'metropolitana', a.tipiChiesti.join(','));
prova('e la guida parte, con la meta', a.andati.length === 1 && typeof a.andati[0].lat === 'number');
/* la frase «Vado a ...» la dice la voce, che ha una coda sua: qui si
   guarda il quaderno, che e' sincrono — e il parlato lo prova il caso di
   casa qui sotto. */
prova('e nel quaderno c\'e\' scritto dove va',
      a.quaderno().some((r) => /^VADO A: la metropolitana/.test(r)),
      a.quaderno().filter((r) => /VADO A/.test(r)).join(' | '));

a = conLaGuida();
a.sentita('yourbea portami a casa');
prova('6. senza casa registrata, dice come si registra',
      /casa è qui/.test(a.dette().join(' ')) && a.andati.length === 0, a.dette().join(' | '));
a = conLaGuida();
a.casa({ nome: 'casa', lat: 41.8266, lon: 12.4757 });
a.sentita('yourbea portami a casa');
prova('6. con casa registrata, ci porta', a.andati.length === 1, a.dette().join(' | '));

/* ---------- LE SEGNALAZIONI: solo dentro la finestra del gesto ---------- */
let segnalato = null;
a = mondo({ segnala: (t) => { segnalato = t; } });
a.sentita('qui c\'è un attraversamento con semaforo');
prova('segnalazione senza nome e senza gesto: non entra', segnalato === null);
a.turno.tocco();
a.sentita('qui c\'è un attraversamento con semaforo', { dalGesto: true });
prova('segnalazione dentro il gesto: entra', segnalato !== null, String(segnalato));

/* ---------- COME LO DICE DAVVERO: le forme vere di una domanda ----------
   Il riconoscitore scrive «c'è», «c’è» (apostrofo tipografico), «cè» e
   «ce»: sono la stessa domanda, e il comando deve partire in tutte. La
   quarta non partiva, e si vedeva solo provandola. */
a = mondo({ intorno: () => [{ nome: 'un bar', metri: 20 }] });
a.posizione.dalGuscio(41.8263, 12.4754, 6);
const FORME = ['yourbea cosa cè qui intorno', 'yourbea cosa ce qui intorno',
               'yourbea qui intorno', 'yourbea cosa c\u2019è qui intorno',
               "yourbea che c'è intorno", 'yourbea cosa cè vicino'];
const partiti = FORME.filter((f) => {
  const prima = a.quaderno().length;
  a.sentita(f);
  return a.quaderno().slice(prima).some((r) => /^COMANDO: qui intorno/.test(r));
});
prova('7. «qui intorno» parte in tutte le ' + FORME.length + ' forme che scrive il telefono',
      partiti.length === FORME.length, partiti.length + ' su ' + FORME.length);

const ok = fatti.filter(Boolean).length;
console.log('\n' + ok + ' su ' + fatti.length);
process.exit(ok === fatti.length ? 0 : 1);
