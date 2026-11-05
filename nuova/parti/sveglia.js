/* TENERLA SVEGLIA COL TELEFONO IN TASCA — Yourbea, 5/11/2026
   ============================================================
   Vince, dal diario di sua sorella: «e quando diventa icona non parla
   piu'». Non e' che smette di parlare: il telefono la SPEGNE.

   Il diario di MARIA-0002 (Samsung, pagina nel browser) lo conta:

       17:17:45  ultima frase
         ...     cinquanta secondi di niente
       17:18:37  riparte da capo — «c'era cultura di 47 s fa»

   Una pagina web che nessuno guarda, per Android e per iOS, non sta
   facendo niente: la sospendono e poi la buttano. Un'app che SUONA
   invece no — e' come una radio, e la radio in tasca continua. Quindi
   si fa suonare un silenzio: trenta secondi di niente, in cerchio, che
   nessuno sente e che al telefono bastano per lasciarla vivere.

   QUESTO FILE NON SUONA: DECIDE. Riceve com'e' messa l'app e risponde
   se il silenzio deve andare. Il suono lo fa app.js con un elemento
   audio, cosi' le regole si provano senza altoparlanti — come per la
   musica (parti/musica.js).

   LE REGOLE, e ognuna ha una ragione:

   1. SOLO QUANDO L'APP E' ACCESA. Alla porta, o spenta, non c'e'
      niente da tenere sveglio.

   2. SOLO QUANDO NESSUNO LA GUARDA. Una pagina davanti agli occhi non
      viene sospesa da nessuno, e il silenzio li' servirebbe solo a
      tenere occupato l'audio del telefono. Appena torna davanti, si
      spegne e l'audio torna agli altri.

   3. NON SI ATTACCA MENTRE LA VOCE PARLA, e dopo un avvio tre secondi
      di respiro. E' la lezione del 22/10, pagata con 34 interruzioni
      su 49 in una giornata: far partire un audio mentre l'app parla
      riconfigura la sessione e tronca la frase, e riprovarci subito
      apre un cerchio senza fine. → memoria: il-balbettio-era-la-musica

   4. L'EMERGENZA LA ZITTISCE. Se uno sta chiedendo aiuto, il telefono
      non deve avere nient'altro per le mani.

   IL PREZZO, e va detto chiaro: su Android un'app che suona si prende
   il fuoco audio, quindi mentre Yourbea e' in tasca la radio o la
   musica dell'utente possono andare in pausa. E' il motivo della
   regola 2: finche' il telefono e' in mano, l'audio resta loro.
   → memoria: app-che-sparisce, app-muta-in-tasca                       */

'use strict';

function Sveglia(opzioni) {
  var o = opzioni || {};
  var ora = o.ora || function () { return Date.now(); };
  var RESPIRO = o.respiro || 3000;     // fra un tentativo e l'altro

  var ultimoAvvio = 0;

  /* com'e' messa l'app  ->  { suona, perche } */
  function decidi(s) {
    var m = s || {};

    if (m.emergenza) return no('emergenza');
    if (!m.accesa) return no('spenta');
    if (!m.nascosta) return no('la guardano');

    /* da qui in poi il silenzio servirebbe: resta da vedere se e' il
       momento di farlo partire */
    if (m.giaSuona) return si('gia va');
    if (m.staParlando) return no('sta parlando');
    if (ora() - ultimoAvvio < RESPIRO) return no('respiro');

    ultimoAvvio = ora();
    return si('parte');
  }

  function si(perche)  { return { suona: true,  perche: perche }; }
  function no(perche)  { return { suona: false, perche: perche }; }

  return {
    decidi: decidi,
    /* serve solo alle prove e al diario */
    quandoHoProvato: function () { return ultimoAvvio; }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Sveglia;
if (typeof window !== 'undefined') window.Sveglia = Sveglia;
