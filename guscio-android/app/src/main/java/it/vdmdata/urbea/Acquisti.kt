/*  I SOLDI, SU ANDROID — Yourbea, 21/10/2026
    ============================================================
    «Si fa su Google Play, ho un account non sfruttato» (Vince, 21/10).

    IL PASS E' DI SETTE GIORNI E NON SI RINNOVA. «E chi vuole rinnova»:
    un turista sta in citta' tre o quattro giorni, e un abbonamento che si
    rinnova da se' lo addebiterebbe proprio quando l'app e' diventata
    inutile — quello non e' un cliente, e' un rimborso con una stella
    attaccata.

    IL PREZZO NON STA SCRITTO QUI. Lo decide Vince nel Play Console, paese
    per paese, e il guscio lo legge da li' (formattedPrice) e lo passa alla
    pagina. Un numero scritto nel codice sarebbe un secondo prezzo che
    prima o poi non torna.

    PERCHE' UN PRODOTTO A CONSUMO E NON UN ABBONAMENTO
    Su Google Play un abbonamento si rinnova: non e' quello che vogliamo.
    Un prodotto una-volta-sola si compra una volta e MAI PIU', e allora
    nessuno potrebbe prendere un secondo pass. Quindi: prodotto a consumo —
    ma consumato QUANDO SCADE, non appena comprato. Finche' il pass vale,
    l'acquisto resta sul conto Google dell'utente, e cosi' «ho gia' pagato»
    funziona anche se cambia telefono o reinstalla. Se lo consumassimo
    subito, Google se ne dimenticherebbe e chi reinstalla avrebbe pagato
    per niente.

    I GIORNI SI SOMMANO, come su iPhone (Acquisti.swift): se compri mentre
    ne hai ancora uno aperto, i sette giorni partono dalla fine di quello.
*/

package it.vdmdata.urbea

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

class Acquisti(private val guscio: Guscio) {

  companion object {
    const val SETTIMANA = "it.vdmdata.urbea.turismo.settimana"
    const val GIORNI = 7L * 24 * 3600 * 1000      // sette giorni, in millesimi
  }

  private var cliente: BillingClient? = null
  private var scheda: ProductDetails? = null
  private var attaccato = false

  private val quandoCambia = PurchasesUpdatedListener { esito, acquisti ->
    when (esito.responseCode) {
      BillingClient.BillingResponseCode.OK -> {
        acquisti?.forEach { sistema(it) }
        conta()
      }
      BillingClient.BillingResponseCode.USER_CANCELED ->
        dillo("Va bene, non ho comprato niente.")
      else ->
        dillo("L'acquisto non è andato: " + perche(esito) + " Riprova quando vuoi, dicendo «compra».")
    }
  }

  /* guarda(): all'avvio e a ogni «ho già pagato». Si attacca al Play
     Store, si legge il prezzo e si contano i pass che ci sono. */
  fun guarda() {
    if (attaccato) { conta(); return }
    val c = BillingClient.newBuilder(guscio)
      .setListener(quandoCambia)
      .enablePendingPurchases()
      .build()
    cliente = c
    c.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(esito: BillingResult) {
        if (esito.responseCode != BillingClient.BillingResponseCode.OK) {
          guscio.scrivi("acquisti: non mi attacco al Play Store — " + esito.debugMessage)
          /* NIENTE MURO DAVANTI A UNA PORTA CHE NON SI APRE: se il Play
             Store non risponde non si blocca niente, si dice soltanto che
             non si sa. L'Utilita' non si paga e deve restare in piedi. */
          mandaAllaPagina(false, null, null)
          return
        }
        attaccato = true
        guscio.scrivi("acquisti: attaccato al Play Store")
        leggiIlPrezzo()
        conta()
      }
      override fun onBillingServiceDisconnected() {
        attaccato = false
        guscio.scrivi("acquisti: il Play Store si è staccato")
      }
    })
  }

  private fun leggiIlPrezzo() {
    val c = cliente ?: return
    val quale = QueryProductDetailsParams.Product.newBuilder()
      .setProductId(SETTIMANA)
      .setProductType(BillingClient.ProductType.INAPP)
      .build()
    c.queryProductDetailsAsync(
      QueryProductDetailsParams.newBuilder().setProductList(listOf(quale)).build()
    ) { esito, schede ->
      if (esito.responseCode == BillingClient.BillingResponseCode.OK) {
        scheda = schede.firstOrNull()
        guscio.scrivi("acquisti: prezzo dal Play Store = " +
          (scheda?.oneTimePurchaseOfferDetails?.formattedPrice ?: "prodotto non trovato"))
      }
    }
  }

  /* conta(): quanti giorni restano. I pass si sommano, e quelli scaduti si
     consumano — cosi' se ne puo' comprare un altro. */
  private fun conta() {
    val c = cliente ?: return
    c.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
    ) { esito, acquisti ->
      if (esito.responseCode != BillingClient.BillingResponseCode.OK) { mandaAllaPagina(false, null, null); return@queryPurchasesAsync }
      val nostri = acquisti.filter { it.products.contains(SETTIMANA) && it.purchaseState == Purchase.PurchaseState.PURCHASED }
        .sortedBy { it.purchaseTime }
      var fine: Long? = null
      for (a in nostri) {
        sistema(a)
        val da = maxOf(a.purchaseTime, fine ?: a.purchaseTime)
        fine = da + GIORNI
      }
      val adesso = System.currentTimeMillis()
      val attivo = fine != null && fine!! > adesso
      /* IL PASS SCADUTO SI CONSUMA, e solo allora: finche' vale resta sul
         conto Google, cosi' «ho già pagato» lo ritrova dopo una
         reinstallazione. */
      if (!attivo) nostri.forEach { butta(it) }
      guscio.scrivi("acquisti: " + (if (attivo) "pass attivo fino a " + java.util.Date(fine!!) else "nessun pass"))
      mandaAllaPagina(attivo, fine, scheda?.oneTimePurchaseOfferDetails?.formattedPrice)
    }
  }

  fun compra() {
    val c = cliente
    val s = scheda
    if (c == null || !attaccato) { dillo("Non riesco a parlare col Play Store. Riprova fra poco."); guarda(); return }
    if (s == null) { dillo("Il pass non è ancora in vendita su questo telefono."); leggiIlPrezzo(); return }
    val pezzo = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(s).build()
    val esito = c.launchBillingFlow(guscio,
      BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(pezzo)).build())
    if (esito.responseCode != BillingClient.BillingResponseCode.OK) {
      dillo("Non posso aprire il pagamento: " + perche(esito))
    }
  }

  /* sistema(): un acquisto nuovo va confermato entro tre giorni, o Google
     lo rimborsa da se'. */
  private fun sistema(a: Purchase) {
    if (a.purchaseState != Purchase.PurchaseState.PURCHASED) return
    if (a.isAcknowledged) return
    val c = cliente ?: return
    c.acknowledgePurchase(
      AcknowledgePurchaseParams.newBuilder().setPurchaseToken(a.purchaseToken).build()
    ) { esito ->
      guscio.scrivi("acquisti: confermato (" + esito.responseCode + ")")
      if (esito.responseCode == BillingClient.BillingResponseCode.OK) {
        dillo("Grazie. Hai sette giorni di racconti: ti faccio compagnia.")
      }
    }
  }

  private fun butta(a: Purchase) {
    val c = cliente ?: return
    c.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(a.purchaseToken).build()) { _, _ ->
      guscio.scrivi("acquisti: pass scaduto, consumato — se ne può comprare un altro")
    }
  }

  private fun mandaAllaPagina(attivo: Boolean, fino: Long?, prezzo: String?) {
    val f = fino?.toString() ?: "null"
    val p = if (prezzo == null) "null" else inJS(prezzo)
    guscio.allaPagina("window.urbeaAbbonamento && window.urbeaAbbonamento($attivo, $f, $p)")
  }

  private fun dillo(frase: String) {
    guscio.allaPagina("window.urbeaEsitoAcquisto && window.urbeaEsitoAcquisto(${inJS(frase)})")
  }

  private fun perche(esito: BillingResult): String = when (esito.responseCode) {
    BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> "ce l'hai già."
    BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> "il pass non è in vendita qui."
    BillingClient.BillingResponseCode.SERVICE_DISCONNECTED,
    BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> "il Play Store non risponde."
    BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> "su questo telefono non si può pagare."
    BillingClient.BillingResponseCode.NETWORK_ERROR -> "manca la rete."
    else -> "non so dire perché."
  }
}
