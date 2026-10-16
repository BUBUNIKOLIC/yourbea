/* LA PULIZIA DELLA VECCHIA — Yourbea, 16/10/2026
   ============================================================
   «Fai in modo che chi scarica la nuova butti in automatico la vecchia»
   (Vince). Chi aveva la vecchia Yourbea si porta dietro tre cose che non
   servono più e una che serve eccome:

   - il suo service worker, che se resta vivo continua a servire i file
     vecchi dalla propria cassaforte: è il motivo per cui si corregge, si
     pubblica, e il telefono mostra sempre la stessa app;
   - le sue casseforti, decine di megabyte di clip e mappe;
   - le sue chiavi in memoria, che non legge più nessuno;
   - e DENTRO quelle chiavi, casa sua e il numero di chi avvisare: quelli
     si travasano PRIMA di buttare. Far riscrivere a un non vedente
     l'indirizzo di casa perché abbiamo cambiato programma sarebbe una
     mancanza di rispetto.

   Qui si decide soltanto. Chi chiama esegue: così si può provare senza
   browser, e soprattutto si può provare la cosa che fa paura — cancellare
   per sbaglio la roba della NUOVA. È già successo una volta. */

'use strict';

function Pulizia() {

  var NOSTRO = 'yourbea-nuova-';        // il nome delle casseforti della nuova
  var NOSTRE_CHIAVI = 'yourbea2-';      // le chiavi della nuova

  /* casseforti(): quali buttare. Tutto quello che non è della nuova. */
  function casseforti(nomi) {
    return (nomi || []).filter(function (n) { return String(n).indexOf(NOSTRO) !== 0; });
  }

  /* spegnereIlWorker(): un worker si spegne se non è quello della nuova.
     Si guarda lo SCOPE, non il nome del file: il worker della vecchia sta
     alla radice del sito e governa tutto, compresa la cartella della nuova. */
  function spegnereIlWorker(scope) {
    return String(scope || '').indexOf('/nuova/') < 0;
  }

  /* chiaviDaButtare(): le chiavi della vecchia, mai quelle della nuova. */
  function chiaviDaButtare(chiavi) {
    return (chiavi || []).filter(function (k) {
      var s = String(k);
      if (s.indexOf(NOSTRE_CHIAVI) === 0) return false;
      return s.indexOf('urbea-') === 0 || s.indexOf('yourbea-') === 0;
    });
  }

  /* travaso(): cosa si salva prima di buttare, e in che forma.
     `vecchie` è quello che c'era in memoria, già passato da JSON.parse dove
     serviva; `nuove` è quello che la nuova ha già — e quello che c'è non si
     tocca mai, perché è più recente. */
  function travaso(vecchie, nuove) {
    var v = vecchie || {}, n = nuove || {}, fuori = {};

    // il contatto: {n, tel} diventa {nome, telefono}
    var s = v.soccorso;
    if (s && s.tel && !(n.contatto && n.contatto.telefono)) {
      fuori.contatto = { nome: (s.n || 'il tuo contatto').trim(), telefono: String(s.tel).trim() };
    }

    /* casa: la vecchia teneva il PUNTO, non l'indirizzo. Si tiene il punto:
       è perfino meglio di un indirizzo da cercare, perché non si sbaglia. */
    if (v.casa && typeof v.casa.lat === 'number' && typeof v.casa.lon === 'number' && !n.casa && !n.casaPunto) {
      fuori.casaPunto = { lat: v.casa.lat, lon: v.casa.lon };
    }

    // la grandezza del testo, se è una di quelle che conosciamo
    if (v.testo && ['normale', 'grande', 'enorme'].indexOf(v.testo) >= 0 && !n.testo) {
      fuori.testo = v.testo;
    }
    return fuori;
  }

  return {
    casseforti: casseforti,
    spegnereIlWorker: spegnereIlWorker,
    chiaviDaButtare: chiaviDaButtare,
    travaso: travaso
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Pulizia;
if (typeof window !== 'undefined') window.Pulizia = Pulizia;
