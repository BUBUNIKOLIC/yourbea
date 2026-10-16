/* COME SI DICE LA STESSA COSA — Yourbea, 16/10/2026
   ============================================================
   «Forse più parole, un linguaggio più articolato, potrebbe fare più
   compagnia» (Vince, 16/10, dopo mezza giornata in giro con l'app).

   Ha ragione, e il difetto non è che le frasi sono corte — camminando
   devono esserlo — ma che sono sempre LE STESSE. «Sulla destra, a ottanta
   metri, Palazzo X» detto quaranta volte in un pomeriggio diventa un
   apparecchio che annuncia le fermate. Basta cambiare il modo di
   attaccare la frase perché torni qualcuno che ti accompagna.

   LE REGOLE, e perché:
   1. CAMBIANO LE PAROLE INTORNO, MAI I FATTI. Da che parte, quanti metri e
      il nome restano identici e nello stesso ordine: quelli servono a
      muoversi, e le clip incise sono pezzi in quell'ordine.
   2. MAI DUE VOLTE DI FILA LO STESSO ATTACCO: è proprio la ripetizione che
      fa sembrare un apparecchio.
   3. UNA VOLTA SU TRE, NIENTE. Un'app che ricama a ogni frase stanca più di
      una secca: il bello è che ogni tanto sia diversa, non che sia sempre
      cerimoniosa.
   4. IL NOME COL CONTAGOCCE. «Vince, sulla destra…» ogni tanto scalda; a
      ogni frase diventa una presa in giro.
   5. SOLO TRE TIPI DI FRASE, E NESSUNA CHE SERVA A CAMMINARE. Svolte,
      preavvisi, incroci, arrivi ed emergenza non si toccano mai: lì le
      parole in più sono mezzo secondo rubato a chi deve girare adesso.
      Niente parole di vista — «guarda», «vedi»: per metà di chi la usa
      sarebbero una stonatura.
*/

'use strict';

function Modi(opzioni) {
  var o = opzioni || {};
  var caso = o.caso || Math.random;
  var nome = o.nome || '';

  /* REGOLA 5: questi tre, e nient'altro. Gli attacchi sono scelti perché
     stanno davanti alla frase così com'è:
       cenno     → «Sulla destra, a 30 metri, la farmacia.»
                   «Hai appena passato il teatro, 40 metri dietro di te.»
       scena     → «Il marciapiede è largo. Ci sono tre alberi…»
       passaggio → «Stai passando lo scivolo del marciapiede…»            */
  var ATTACCHI = {
    cenno:     ['Senti, ', 'Ecco, ', 'Allora, '],
    scena:     ['Allora, ', 'Dunque, ', 'Intorno a te, ', 'Qui '],
    passaggio: ['Adesso ', 'In questo momento ', 'Ecco, ']
  };

  var ultimo = {};

  /* attacco(): la parolina davanti, o niente. */
  function attacco(tipo) {
    var lista = ATTACCHI[tipo];
    if (!lista) return '';                             // REGOLA 5
    if (caso() < 0.34) return '';                      // REGOLA 3
    var i = Math.floor(caso() * lista.length) % lista.length;
    var scelto = lista[i];
    if (scelto === ultimo[tipo]) scelto = lista[(i + 1) % lista.length];   // REGOLA 2
    ultimo[tipo] = scelto;
    return scelto;
  }

  /* veste(): la frase vestita. I fatti non si toccano (REGOLA 1): si mette
     una parolina davanti e si abbassa la maiuscola che resta in mezzo. */
  function veste(tipo, testo) {
    if (!testo || typeof testo !== 'string') return testo;
    var a = attacco(tipo);
    if (!a) return testo;
    return a + testo.charAt(0).toLowerCase() + testo.slice(1);
  }

  /* colNome(): ogni tanto chiama per nome — REGOLA 4. Senza nome non si
     inventa nessuno. */
  function colNome(testo) {
    if (!nome || !testo) return testo;
    if (caso() > 0.12) return testo;
    return nome + ', ' + testo.charAt(0).toLowerCase() + testo.slice(1);
  }

  function conNome(n) { nome = n || ''; }
  function ilNome() { return nome; }

  /* ============================================================
     LE FRASI DI ROUTINE
     «Metti una serie di frasi di routine: ciao Vincenzo, come stai, ecc.»
     (Vince, 16/10). Sono le frasi che non dicono niente di utile e servono
     a tutt'altro: a non far sentire solo chi la usa. Per questo il nome si
     chiede al primo avvio — senza il nome queste frasi non esistono.

     Quattro regole loro:
     A. SI SALUTA COME SI SALUTA: con l'ora del giorno, non con un orario.
        «Buongiorno» alle nove, «buonasera» alle otto; «ciao» va sempre.
     B. MAI DUE VOLTE DI FILA LA STESSA. È il difetto di tutte le voci
        registrate: alla terza volta sai già cosa dirà.
     C. SI CHIEDE COME STA SOLO QUANDO SI PUÒ ASCOLTARE LA RISPOSTA. Una
        domanda a cui l'app non reagisce è peggio del silenzio: diventa
        chiaro che non c'è nessuno. Chi chiama saluto() sa, dal campo
        «chiede», se deve mettersi in ascolto.
     D. LA SECONDA VOLTA IN GIORNATA NON SI RICOMINCIA DA CAPO. «Bentornato»
        non è «ciao»: chi riapre l'app dopo un'ora non è appena arrivato.  */

  var SALUTI = {
    mattina:    ['Buongiorno', 'Ciao', 'Buongiorno'],
    pomeriggio: ['Ciao', 'Buon pomeriggio', 'Ciao'],
    sera:       ['Buonasera', 'Ciao', 'Buonasera'],
    notte:      ['Ciao', 'Buonanotte', 'Ciao']
  };
  var COME_STAI = ['Come stai?', 'Come va?', 'Tutto bene?', 'Come te la passi?'];
  var BENTORNATO = ['Bentornato', 'Rieccoci', 'Di nuovo qui'];
  var CONGEDI = ['A dopo', 'Ci sentiamo', 'Quando vuoi sono qui', 'Alla prossima'];

  function oraDelGiorno(h) {
    if (h >= 5 && h < 13) return 'mattina';
    if (h >= 13 && h < 18) return 'pomeriggio';
    if (h >= 18 && h < 23) return 'sera';
    return 'notte';
  }

  /* sceglie(): una della lista, mai quella di prima (REGOLA B). */
  function sceglie(lista, chiave) {
    var i = Math.floor(caso() * lista.length) % lista.length;
    var scelto = lista[i];
    if (lista.length > 1 && scelto === ultimo[chiave]) scelto = lista[(i + 1) % lista.length];
    ultimo[chiave] = scelto;
    return scelto;
  }

  /* saluto(): la prima frase. Restituisce anche «chiede», così chi la dice
     sa se dopo deve stare a sentire (REGOLA C). */
  function saluto(o2) {
    var q = o2 || {};
    var h = typeof q.ora === 'number' ? q.ora : new Date().getHours();
    var tornato = !!q.tornato;                                 // REGOLA D
    var testa = tornato
      ? sceglie(BENTORNATO, 'bentornato')
      : sceglie(SALUTI[oraDelGiorno(h)], 'saluto');            // REGOLA A
    var frase = testa + (nome ? ' ' + nome : '') + '.';
    /* il «come stai» non a ogni apertura: due volte su tre, e mai di notte,
       quando chi apre l'app alle quattro del mattino ha altro per la testa */
    var chiede = oraDelGiorno(h) !== 'notte' && caso() < 0.66;
    if (chiede) frase += ' ' + sceglie(COME_STAI, 'come-stai');
    return { testo: frase, chiede: chiede };
  }

  /* comeSta(): cosa si risponde a chi risponde. Corto, e poi si va al
     lavoro: non è una conversazione, è un saluto. */
  function comeSta(come) {
    if (come === 'male') return 'Mi dispiace. Vediamo di fare le cose con calma.';
    if (come === 'insomma') return 'Capito. Facciamo piano, allora.';
    return nome ? ('Bene, ' + nome.toLowerCase().charAt(0).toUpperCase() + nome.slice(1) + '. Allora andiamo.')
                : 'Bene. Allora andiamo.';
  }

  /* congedo(): quando si ferma. Chi non vede spegne l'app e resta in
     strada: un «a dopo» dice che l'app si è fermata lei, e non è caduta. */
  function congedo() {
    return sceglie(CONGEDI, 'congedo') + (nome ? ', ' + nome : '') + '.';
  }

  return { veste: veste, attacco: attacco, colNome: colNome,
           conNome: conNome, ilNome: ilNome,
           saluto: saluto, comeSta: comeSta, congedo: congedo,
           oraDelGiorno: oraDelGiorno };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Modi;
if (typeof window !== 'undefined') window.Modi = Modi;
