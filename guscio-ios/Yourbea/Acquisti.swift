/* GLI ACQUISTI — Yourbea, 21/10/2026
   ============================================================
   «Ora abbonamento settimanale per i turisti», «App Store iPhone»
   (Vince, 21/10).

   COSA SI VENDE, E COSA NO
   Utilità è gratis per sempre: è la modalità di chi non vede — la strada,
   gli attraversamenti, «portami a». Non si tocca e non si chiude mai.
   Si paga solo TURISMO, che è il racconto dei monumenti.
   E se sul telefono è acceso VoiceOver, anche Turismo è gratis: chi non
   vede non deve trovare un pagamento per sentire la storia di una chiesa,
   né dimostrare niente a nessuno. Quel controllo sta in Guscio.swift
   (mandaAccessibilita) e la pagina lo sa già.

   UN PASS, NON UN ABBONAMENTO — scelto da Vince il 21/10: «e chi vuole
   rinnova». Si pagano 4,99 €, Turismo è aperto sette giorni, poi finisce.
   Non si rinnova da solo. Niente disdette da gestire, niente rimborsi di
   chi si è dimenticato, nessuna stella in meno per un addebito a
   sorpresa: chi ci tiene ricompra, e chi non ci tiene non si accorge
   nemmeno di aver smesso.
   È la stessa scelta già fatta per VDM: si vende una cosa, non un
   rubinetto aperto.

   SU APP STORE CONNECT NON È UN «ABBONAMENTO»
   Va creato come acquisto in-app di tipo «abbonamento non rinnovabile»
   (non-renewing subscription). Conseguenza tecnica, non dettaglio: un
   prodotto così NON compare fra i diritti che Apple tiene aggiornati, e
   la scadenza la deve calcolare l'app dalla data d'acquisto. Lo dice la
   documentazione Apple, ed è il motivo per cui qui sotto si legge
   `Transaction.all` e non `currentEntitlements`.

   COME SI PROVA SENZA SPENDERE
   In Xcode, con un file .storekit, si compra per finta. Senza quello, e
   senza il prodotto creato su App Store Connect, `Product.products` torna
   una lista vuota: l'app NON si rompe, semplicemente non offre niente e la
   pagina resta com'è. È voluto: meglio un'app che non vende che un'app
   che si blocca davanti a un negozio chiuso.
*/

import Foundation
import StoreKit

@MainActor
final class Acquisti: ObservableObject {

  /* L'IDENTIFICATIVO, da creare uguale su App Store Connect:
     Abbonamenti → gruppo «Yourbea Turismo» → settimanale. */
  static let settimana = "it.vdmdata.urbea.turismo.settimana"

  private(set) var prodotto: Product?
  private(set) var attivo = false
  private(set) var scadenza: Date?
  private var sentinella: Task<Void, Never>?

  /* quandoCambia: chiamata ogni volta che lo stato cambia davvero, così il
     guscio lo dice alla pagina senza doverlo chiedere. */
  var quandoCambia: ((Bool, Date?, String?) -> Void)?

  init() {
    /* LE TRANSAZIONI ARRIVANO ANCHE QUANDO NON LE ASPETTI: un rinnovo nella
       notte, un acquisto fatto su un altro telefono, un rimborso. Chi non
       sta in ascolto si ritrova l'abbonamento scaduto e l'app che lo crede
       ancora valido — o il contrario, che è peggio. */
    sentinella = Task.detached { [weak self] in
      for await risultato in Transaction.updates {
        if case .verified(let t) = risultato {
          await t.finish()
          await self?.guarda()
        }
      }
    }
  }

  deinit { sentinella?.cancel() }

  /* comincia(): si chiede ad Apple il prodotto e si guarda se c'è già un
     abbonamento in corso. Si chiama all'avvio. */
  func comincia() async {
    do {
      let trovati = try await Product.products(for: [Acquisti.settimana])
      prodotto = trovati.first
    } catch {
      prodotto = nil                       // negozio chiuso: l'app resta intera
    }
    await guarda()
  }

  /* guarda(): il pass è ancora buono?
     UN PASS CHE NON SI RINNOVA NON STA FRA I DIRITTI CHE APPLE TIENE
     AGGIORNATI. `Transaction.currentEntitlements` contiene gli abbonamenti
     che si rinnovano e gli acquisti per sempre: un «non-renewing» no, e
     chi lo cerca lì trova sempre vuoto. Apple lo dice chiaro: con questo
     tipo, LA SCADENZA È RESPONSABILITÀ DELL'APP.
     Quindi si guarda la STORIA degli acquisti — che Apple conserva legata
     all'Apple ID, non al telefono: chi cambia iPhone o reinstalla ritrova
     il suo pass — si prende l'acquisto più recente e si contano sette
     giorni da lì.
     E i pass si SOMMANO: chi ne compra due di fila ha quattordici giorni,
     non sette. Se no uno che ricompra il sesto giorno perde cinque giorni
     pagati, e ha ragione ad arrabbiarsi. */
  static let giorni: TimeInterval = 7 * 24 * 60 * 60

  func guarda() async {
    var fine: Date?
    for await d in Transaction.all {
      guard case .verified(let t) = d, t.productID == Acquisti.settimana else { continue }
      if let r = t.revocationDate, r <= Date() { continue }        // rimborsato
      /* i pass si sommano: si parte da quando finiva il precedente, se
         non era ancora finito, altrimenti da quando si è comprato */
      let da = max(t.purchaseDate, fine ?? t.purchaseDate)
      fine = da.addingTimeInterval(Acquisti.giorni)
    }
    let valido = (fine ?? Date.distantPast) > Date()
    let cambiato = (valido != attivo) || (fine != scadenza)
    attivo = valido
    scadenza = valido ? fine : nil
    if cambiato { quandoCambia?(attivo, scadenza, prezzo()) }
  }

  /* prezzo(): com'è scritto nella valuta di chi guarda. Non si scrive mai
     «7,99 €» a mano: il prezzo lo decide App Store Connect paese per paese,
     e inventarlo qui vuol dire dire una bugia a chi sta in Svizzera. */
  func prezzo() -> String? {
    return prodotto?.displayPrice
  }

  /* compra(): apre il pagamento di Apple. Restituisce come è andata, in
     parole che la pagina possa dire a voce. */
  func compra() async -> String {
    guard let p = prodotto else {
      return "Il negozio non risponde. Riprova fra poco."
    }
    do {
      switch try await p.purchase() {
      case .success(let d):
        if case .verified(let t) = d {
          await t.finish()
          await guarda()
          return "Fatto. Turismo è aperto per sette giorni. Non si rinnova da solo: quando finisce, se vuoi, ne prendi un altro."
        }
        return "L'acquisto non è stato verificato da Apple."
      case .userCancelled:
        return "Va bene, non ho comprato niente."
      case .pending:
        return "L'acquisto è in attesa: se serve un permesso, te lo chiederà il telefono."
      @unknown default:
        return "Non ho capito come è andata. Controlla fra poco."
      }
    } catch {
      return "Non sono riuscito a comprare: " + error.localizedDescription
    }
  }

  /* ripristina(): chi cambia telefono, o reinstalla, ha già pagato. Apple
     vuole che ci sia un modo per dirlo, e per chi non vede dev'essere una
     frase, non un tasto piccolo in fondo a una schermata. */
  func ripristina() async -> String {
    do {
      try await AppStore.sync()
      await guarda()
      return attivo
        ? "Ritrovato: il tuo pass è ancora buono."
        : "Non risulta nessun pass valido su questo Apple ID."
    } catch {
      return "Non sono riuscito a controllare: " + error.localizedDescription
    }
  }
}
