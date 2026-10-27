/* LA MUSICA SOTTO IL RACCONTO — Yourbea, 16/10/2026
   ============================================================
   Vince: «sì, solo per il turismo e a basso volume».

   Questo file non suona: decide. Riceve com'è messa l'app in questo momento
   e restituisce se la musica deve andare e a che volume. Il suono vero lo
   fa app.js con un elemento audio, e così le regole si provano senza
   altoparlanti.

   I tre tappeti stanno in `nuova/musica/`, fatti in casa: nascono già a
   −26 dB di media, cuciti per girare in cerchio senza stacco. Da dove
   vengono e con che licenza è scritto in `musica/DA-DOVE-VIENE.md`.

   LE REGOLE, e da dove vengono:
   1. SOLO IN TURISMO. In Utilità mai, nemmeno accesa a mano: lì si cammina
      per arrivare da qualche parte, e chi non vede ha bisogno di tutte le
      orecchie che ha. (Vince, 16/10.)
   2. VOLUME BASSO, E L'UTENTE PUÒ SPEGNERLA. Spenta una volta, resta spenta
      anche domani: chi l'ha tolta non la rivuole ogni mattina.
   3. SOTTO LA VOCE SI ABBASSA ANCORA. Mentre l'app parla la musica scende,
      e torna su quando ha finito: la voce non si deve capire a fatica.
   4. L'EMERGENZA LA ZITTISCE DEL TUTTO. Non abbassata: spenta. Se uno sta
      chiedendo aiuto, nessun sottofondo.
   5. MAI SU UN ATTRAVERSAMENTO O UNA SVOLTA. Anche in Turismo chi ascolta
      può essere una persona che non vede: quando l'app dice dove si gira o
      che c'è un attraversamento, la musica tace e resta zitta qualche
      secondo, finché la strada non è passata.
   6. NON RIPARTE DI SCATTO. Si risale piano, se no il ritorno della musica
      sembra un errore dell'app.
*/

'use strict';

function Musica(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var BASSO = o.basso || 0.5;              // il volume normale, già basso di suo
  var SOTTO_VOCE = o.sottoVoce || 0.12;    // quanto resta mentre l'app parla
  var DOPO_STRADA = o.dopoStrada || 8000;  // quanto tace dopo una svolta
  var SALITA = o.salita || 0.08;           // quanto può crescere a ogni passo

  var accesa = true;                       // la vuole l'utente?
  var zittaFino = 0;
  var volume = 0;

  /* leDaLUtente(): quello che l'utente ha scelto, e che si ricorda. */
  function accendi(si) { accesa = !!si; return accesa; }
  function eAccesa() { return accesa; }

  /* taci(): la strada viene prima. Chi dice una svolta o un attraversamento
     chiama questa, e per qualche secondo non c'è musica. */
  function taciPerLaStrada(quanto) {
    zittaFino = ora() + (quanto || DOPO_STRADA);
  }

  /* quale(): quale tappeto, in base all'ora. Non è gusto: di sera un
     tappeto più basso si sente meno addosso. */
  function quale(adesso) {
    var h = (adesso instanceof Date ? adesso : new Date(adesso || ora())).getHours();
    if (h >= 20 || h < 7) return 'notturno';
    if (h >= 11 && h < 17) return 'chiostro';
    return 'cammino';
  }

  /* decide(): la risposta, in una volta sola.
     stato = { modo, staParlando, livello, inPasseggiata } */
  function decide(stato) {
    var s = stato || {};
    var perche = '';
    var obiettivo = BASSO;

    if (s.modo !== 'cultura') { obiettivo = 0; perche = 'utilità: niente musica'; }   // REGOLA 1
    else if (!accesa) { obiettivo = 0; perche = 'spenta dall\'utente'; }              // REGOLA 2
    else if (ora() < zittaFino) { obiettivo = 0; perche = 'la strada viene prima'; }  // REGOLA 5
    else if (s.staParlando && s.livello === 'emergenza') { obiettivo = 0; perche = 'emergenza'; }  // REGOLA 4
    else if (s.staParlando) { obiettivo = SOTTO_VOCE; perche = 'sotto la voce'; }     // REGOLA 3

    // REGOLA 6: si scende subito, si risale piano
    if (obiettivo < volume) volume = obiettivo;
    else volume = Math.min(obiettivo, volume + SALITA);

    return { suona: volume > 0.001, volume: Math.round(volume * 1000) / 1000,
             brano: quale(), perche: perche };
  }

  function azzera() { volume = 0; zittaFino = 0; }

  return { decide: decide, accendi: accendi, eAccesa: eAccesa,
           taciPerLaStrada: taciPerLaStrada, quale: quale, azzera: azzera,
           volumeAdesso: function () { return volume; } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Musica;
if (typeof window !== 'undefined') window.Musica = Musica;
