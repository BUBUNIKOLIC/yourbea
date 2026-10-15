/* LE FRASI CHE IMPOSTANO LE COSE — Yourbea, 15/10/2026
   ============================================================
   «Un non vedente deve fare tutto a voce» (Vince, il 15/10). I tasti
   servono a chi vede e a chi accompagna; ma non deve esistere NIENTE che si
   possa fare solo col dito. Qui si capiscono le frasi che fino a stasera
   richiedevano di scrivere in una casella: dove abiti, chi avvisare.

   Questo file non parla e non salva: riceve una frase e restituisce cosa
   voleva dire. Così si può provare per iscritto, e si prova.

   LE REGOLE, e perché:
   1. I NUMERI DETTATI SI RILEGGONO SEMPRE. Il riconoscimento scrive «333»
      oppure «tre tre tre» a seconda di come parli, e sbagliare una cifra
      del numero di chi deve venire ad aiutarti è peggio che non averlo.
      Si rilegge cifra per cifra e si aspetta un sì.
   2. NON SI INDOVINA UN PAESE. Un numero senza prefisso è italiano: è il
      nostro, non un paese a caso.
   3. UNA FRASE CHE NON SI CAPISCE NON DIVENTA UN COMANDO. Meglio dire «non
      ho capito» che salvare l'indirizzo sbagliato di casa.
*/

'use strict';

function Dettatura() {

  var CIFRE = { zero: '0', uno: '1', due: '2', tre: '3', quattro: '4', cinque: '5',
                sei: '6', sette: '7', otto: '8', nove: '9' };

  function normalizza(t) {
    return String(t || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
      .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/\s+/g, ' ').trim();
  }

  /* cifre(): «tre tre tre uno due» e «333 12» finiscono tutti e due in
     cifre. Il riconoscimento di iOS passa dall'uno all'altro senza avvisare. */
  function cifre(testo) {
    var fuori = normalizza(testo).replace(/[^a-z0-9 ]/g, ' ').split(' ');
    var n = '';
    fuori.forEach(function (p) {
      if (!p) return;
      if (/^\d+$/.test(p)) { n += p; return; }
      if (CIFRE[p] !== undefined) { n += CIFRE[p]; return; }
      if (p === 'piu' || p === 'prefisso') return;
    });
    return n;
  }

  /* leggiCifre(): per rileggerlo a chi non vede, una cifra per volta e con
     le pause: «3, 3, 3, 1, 2, 3». Letto come numero intero non si
     controlla. */
  function leggiCifre(n) {
    return String(n).split('').join(', ');
  }

  /* capisci(): la frase → cosa voleva dire, o null. */
  function capisci(testo) {
    var t = normalizza(testo);
    if (!t) return null;

    // DOVE ABITO
    var casa = t.match(/(?:casa mia (?:e|sta|si trova in)|abito (?:in|a)|dove abito e|casa e in|segna casa (?:in|a))\s+(.{4,})/);
    if (casa) return { cosa: 'casa', indirizzo: ripulisci(casa[1]) };

    // COME MI CHIAMO: va nel messaggio d'aiuto, per primo
    var io_ = t.match(/(?:mi chiamo|sono io|il mio nome e|io sono)\s+([a-z]{2,}(?:\s+[a-z]{2,})?)$/);
    if (io_) return { cosa: 'io', nome: maiuscola(io_[1].trim()) };

    // CHI AVVISARE: nome e numero nella stessa frase
    var chi = t.match(/(?:il mio contatto e|avvisa sempre|chi mi aiuta e|registra(?:\s+come\s+contatto)?)\s+([a-z]{3,}(?:\s+[a-z]{3,})?)(?:[,\s]+(?:numero\s+)?(.+))?$/);
    if (chi) {
      var num = cifre(chi[2] || '');
      /* REGOLA 3: un contatto senza numero non si salva a metà — si chiede. */
      if (num.length >= 6) return { cosa: 'contatto', nome: maiuscola(chi[1].trim()), numero: num };
      return { cosa: 'contatto-senza-numero', nome: maiuscola(chi[1].trim()) };
    }

    // solo il numero, quando l'app l'ha chiesto
    var soloNumero = t.match(/^(?:il numero e|numero|e)?\s*([0-9 ]{6,}|(?:(?:zero|uno|due|tre|quattro|cinque|sei|sette|otto|nove)\s*){6,})$/);
    if (soloNumero) {
      var n2 = cifre(soloNumero[1]);
      if (n2.length >= 6) return { cosa: 'numero', numero: n2 };
    }

    if (/^(?:si|si giusto|esatto|confermo|va bene|giusto)$/.test(t)) return { cosa: 'si' };
    if (/^(?:no|sbagliato|non e giusto|rifaccio)$/.test(t)) return { cosa: 'no' };

    return null;
  }

  function ripulisci(t) {
    return maiuscola(String(t).replace(/\s+(?:grazie|per favore)$/, '').trim());
  }
  function maiuscola(t) {
    return String(t).replace(/(^|\s)([a-z])/g, function (x, s, c) { return s + c.toUpperCase(); });
  }

  return { capisci: capisci, cifre: cifre, leggiCifre: leggiCifre };
}

if (typeof module !== 'undefined' && module.exports) module.exports = Dettatura;
if (typeof window !== 'undefined') window.Dettatura = Dettatura;
