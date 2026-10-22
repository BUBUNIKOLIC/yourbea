/*  IL GUSCIO ANDROID — Yourbea, 21/10/2026
    ============================================================
    L'app vera e' la pagina: https://bubunikolic.github.io/yourbea/nuova/
    Qui dentro c'e' soltanto quello che una pagina web NON puo' fare.

    IL PONTE, identico a quello dell'iPhone (guscio-ios/Guscio.swift):
      window.urbeaHaPosizione    c'e' il GPS nativo
      window.urbeaPosizione()    il guscio la chiama a ogni passo
      window.urbeaAttivita()     fermo/cammina/mezzo, dal contapassi
      window.urbeaVibra()        un colpo alla mano: il faro e le svolte
      window.urbeaPassi()        quanti passi hai fatto da quando e' aperta
      window.urbeaAscolta()      apri il microfono
      window.urbeaChiudiAscolto()
      window.urbeaComando()      il guscio la chiama con la frase capita
      window.urbeaDiario()       la pagina scrive, il guscio mette su disco
      window.urbeaRubrica()      cerca un nome fra i contatti
      window.urbeaDallaRubrica() la risposta
      window.urbeaAccessibilita() TalkBack acceso? testo grande?
      window.urbeaSaComprare / urbeaCompra / urbeaRipristina
      window.urbeaAbbonamento / urbeaEsitoAcquisto
    Le funzioni sono le stesse e con le stesse firme: la pagina non sa su
    quale telefono sta, e non deve saperlo.

    LE TRE COSE CHE SU ANDROID SONO DIVERSE
    1. LA VOCE. Il WebView di Android non ha speechSynthesis — e' una cosa
       di Chrome, non del WebView. Senza rattoppo la pagina trova
       `!window.speechSynthesis`, chiama subito quandoFinisce() e NON DICE
       MAI NIENTE: un'app per non vedenti, muta. Qui sotto c'e' un
       rimpiazzo che gira tutto sul TextToSpeech di Android, con la stessa
       faccia: speak, cancel, getVoices, e onend quando ha finito davvero
       (l'onend vero e' quello che il 17/10 ha smesso di far accavallare le
       voci: non si torna a indovinarlo dalla lunghezza).
    2. IL MICROFONO. Nel WebView non c'e' nemmeno il riconoscimento: lo fa
       SpeechRecognizer qui, e la pagina lo usa gia' tramite urbeaAscolta.
    3. IL GPS CON LO SCHERMO SPENTO. Android lo spegne, se non c'e' un
       servizio in primo piano: ServizioCammino.kt.                      */

package it.vdmdata.urbea

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.os.Looper
import android.provider.ContactsContract
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import android.view.accessibility.AccessibilityManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

const val INDIRIZZO = "https://bubunikolic.github.io/yourbea/nuova/"
private const val TAG = "YOURBEA"

class Guscio : AppCompatActivity() {

  private lateinit var pagina: WebView
  private val aMano = Handler(Looper.getMainLooper())

  private var voce: TextToSpeech? = null
  private var voceProntaDa = false
  private var ascolto: SpeechRecognizer? = null
  private var vuoleAscoltare = false
  private var luoghi: LocationManager? = null
  private var ultima: Location? = null
  private var battito: Runnable? = null
  private var cercandoInRubrica: String? = null
  private var paginaCaricata = false
  private var andataMale = false
  private var riprove = 0
  private var riprovaInCoda = false

  val acquisti by lazy { Acquisti(this) }

  // ============================================================
  // l'avvio
  // ============================================================
  override fun onCreate(stato: Bundle?) {
    super.onCreate(stato)
    pagina = WebView(this)
    setContentView(pagina)

    pagina.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      databaseEnabled = true
      mediaPlaybackRequiresUserGesture = false   // il faro deve poter suonare da se'
      setGeolocationEnabled(true)
      cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
    }
    WebView.setWebContentsDebuggingEnabled(true)

    /* IL RATTOPPO DELLA VOCE, PRIMA DI TUTTO IL RESTO. Con
       addDocumentStartJavaScript gira a documento appena nato, quindi
       prima di app.js: se arrivasse dopo, la pagina avrebbe gia' deciso
       che non sa parlare. Se il WebView e' troppo vecchio per questa
       funzione, si ripiega su onPageStarted — meno sicuro, ma meglio di
       niente, e il diario lo scrive. */
    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      WebViewCompat.addDocumentStartJavaScript(pagina, ilPonte(), setOf("https://bubunikolic.github.io"))
      scrivi("ponte: a documento nuovo (il modo buono)")
    } else {
      scrivi("ponte: ATTENZIONE, WebView vecchio — ripiego su onPageStarted")
    }

    pagina.addJavascriptInterface(Ponte(), "guscioAndroid")

    pagina.webViewClient = object : WebViewClient() {
      override fun onPageStarted(v: WebView?, url: String?, icona: android.graphics.Bitmap?) {
        andataMale = false
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
          v?.evaluateJavascript(ilPonte(), null)
        }
      }
      override fun onPageFinished(v: WebView?, url: String?) {
        /* ATTENZIONE: onPageFinished ARRIVA ANCHE PER LA PAGINA D'ERRORE,
           e con l'indirizzo GIUSTO — non con «chrome-error://». Guardando
           solo l'indirizzo si segnava «caricata» proprio quando non si era
           caricata niente, e la riprova non partiva piu': al banco la rete
           e' tornata e l'app e' rimasta ferma sulla schermata bianca di
           Chrome, in inglese e muta. Per sempre.
           Quindi non ci si fida dell'indirizzo: ci si ricorda se durante
           QUESTO caricamento e' arrivato un errore. */
        if (andataMale) { riprovaFraPoco(); return }
        paginaCaricata = true
        riprove = 0
        mandaAccessibilita()
        acquisti.guarda()
      }

      /* ============================================================
         SENZA RETE NON SI RESTA MUTI
         Al banco la pagina non si e' caricata e l'app ha mostrato la
         pagina d'errore di Chrome: bianca, scritta in inglese, e senza
         una parola detta. Chi non vede apre Yourbea in un sottopasso o
         senza campo e trova il silenzio — e il silenzio, per lui, e'
         indistinguibile da un'app rotta (e' la stessa ragione per cui
         spegnendola si dice «a dopo»).
         Allora: lo si dice, in italiano, e si riprova da soli. La pagina
         non c'e' e non puo' parlare lei: parla il guscio.
         ============================================================ */
      override fun onReceivedError(v: WebView?, r: WebResourceRequest?, e: android.webkit.WebResourceError?) {
        super.onReceivedError(v, r, e)
        if (r?.isForMainFrame != true) return          // un'immagine che manca non e' un guasto
        andataMale = true
        paginaCaricata = false
        riprove++
        scrivi("RETE: la pagina non si carica (" + (e?.description ?: "?") + "), riprova n. " + riprove)
        if (riprove == 1) {
          diciDaSoli("Non riesco a collegarmi. Controlla la rete: appena torna, riprovo da solo.")
        } else if (riprove % 12 == 0) {
          diciDaSoli("Sto ancora aspettando la rete.")
        }
        riprovaFraPoco()
      }
      /* UN LINK DI FUORI NON SI APRE QUI DENTRO: il nostro sito si', tutto
         il resto va al browser. Un percorso mandato per WhatsApp e' del
         nostro sito, quindi si apre nell'app — ed e' quello che serve. */
      override fun shouldOverrideUrlLoading(v: WebView?, r: WebResourceRequest?): Boolean {
        val u = r?.url?.toString() ?: return false
        if (u.startsWith(INDIRIZZO) || u.startsWith("https://bubunikolic.github.io/yourbea")) return false
        return try { startActivity(Intent(Intent.ACTION_VIEW, r.url)); true } catch (e: Exception) { true }
      }
    }

    pagina.webChromeClient = object : WebChromeClient() {
      override fun onPermissionRequest(richiesta: PermissionRequest?) {
        /* il microfono dentro la pagina lo diamo noi: il permesso vero
           l'ha gia' chiesto il sistema all'app */
        richiesta?.grant(richiesta.resources)
      }
      override fun onGeolocationPermissionsShowPrompt(origine: String?, ok: android.webkit.GeolocationPermissions.Callback?) {
        ok?.invoke(origine, true, true)
      }
      override fun onConsoleMessage(m: android.webkit.ConsoleMessage?): Boolean {
        m?.let { Log.d(TAG, "pagina: " + it.message()) }
        return true
      }
    }

    preparaVoce()
    chiediIPermessi()
    pagina.loadUrl(INDIRIZZO)
    guardaLaProssimita()
    guardaIPassi()
  }

  // ============================================================
  // IL PONTE: il javascript che la pagina trova gia' pronto
  // ============================================================
  private fun ilPonte(): String = """
    (function () {
      if (window.__guscioAndroid) return;
      window.__guscioAndroid = true;

      /* ---------- LA VOCE ----------
         Il WebView non ha speechSynthesis: questa ne ha la faccia e dentro
         usa il TextToSpeech di Android. Solo quello che app.js chiede
         davvero: speak, cancel, getVoices, e l'onend VERO. */
      var inAttesa = {}, prossimo = 1;
      window.__guscioFinito = function (id, male) {
        var u = inAttesa[id]; delete inAttesa[id];
        if (!u) return;
        try { if (male && u.onerror) u.onerror({}); else if (u.onend) u.onend({}); } catch (e) {}
      };
      function Frase(t) { this.text = t == null ? '' : String(t);
        this.lang = 'it-IT'; this.rate = 1; this.pitch = 1; this.voice = null;
        this.onend = null; this.onerror = null; this.onstart = null; }
      window.SpeechSynthesisUtterance = Frase;
      window.speechSynthesis = {
        speaking: false, pending: false, paused: false,
        speak: function (u) {
          var id = prossimo++;
          inAttesa[id] = u;
          try { guscioAndroid.parla(u.text, u.rate || 1, id); }
          catch (e) { window.__guscioFinito(id, true); }
        },
        cancel: function () {
          var vecchi = inAttesa; inAttesa = {};
          try { guscioAndroid.taci(); } catch (e) {}
          for (var k in vecchi) { try { if (vecchi[k].onend) vecchi[k].onend({}); } catch (e) {} }
        },
        pause: function () {}, resume: function () {},
        getVoices: function () { try { return JSON.parse(guscioAndroid.leVoci()); } catch (e) { return []; } },
        addEventListener: function () {}, removeEventListener: function () {}
      };

      /* ---------- IL RESTO DEL PONTE, come sull'iPhone ---------- */
      window.urbeaHaPosizione = true;
      window.urbeaAscolta = function () { try { guscioAndroid.ascolta(); } catch (e) {} };
      window.urbeaChiudiAscolto = function () { try { guscioAndroid.chiudiAscolto(); } catch (e) {} };
      window.urbeaDiario = function (t) { try { guscioAndroid.diario(String(t)); } catch (e) {} };
      window.urbeaRubrica = function (n) { try { guscioAndroid.rubrica(String(n)); } catch (e) {} };
      window.urbeaSaComprare = true;
      window.urbeaCompra = function () { try { guscioAndroid.compra(); } catch (e) {} };
      window.urbeaRipristina = function () { try { guscioAndroid.ripristina(); } catch (e) {} };
      window.urbeaVibra = function (f) { try { guscioAndroid.vibra(String(f || 'piano')); } catch (e) {} };
      /* urbeaSaLeggere resta SPENTA: la lettura dei cartelli su iPhone la fa
         Vision, dentro il sistema e gratis. Su Android servirebbe ML Kit, e
         non l'abbiamo ancora messo: la pagina si accorge da se' che non c'e'
         e non offre la lettura, invece di offrirla e non farla. */
    })();
  """.trimIndent()

  inner class Ponte {
    @JavascriptInterface fun parla(testo: String, velocita: Float, id: Int) {
      aMano.post { diciAdesso(testo, velocita, id) }
    }
    @JavascriptInterface fun taci() { aMano.post { voce?.stop() } }
    @JavascriptInterface fun leVoci(): String {
      val fuori = JSONArray()
      try {
        voce?.voices?.forEach { v ->
          if (v.locale.language == "it") {
            fuori.put(JSONObject().put("name", v.name).put("lang", v.locale.toLanguageTag()))
          }
        }
      } catch (e: Exception) {}
      return fuori.toString()
    }
    @JavascriptInterface fun ascolta() { aMano.post { apriAscolto() } }
    @JavascriptInterface fun chiudiAscolto() { aMano.post { chiudiIlMicrofono() } }
    @JavascriptInterface fun diario(t: String) { scrivi(t) }
    @JavascriptInterface fun rubrica(nome: String) { aMano.post { cercaInRubrica(nome) } }
    @JavascriptInterface fun compra() { aMano.post { acquisti.compra() } }
    @JavascriptInterface fun ripristina() { aMano.post { acquisti.guarda() } }
    @JavascriptInterface fun vibra(forza: String) { aMano.post { colpoAllaMano(forza) } }
  }

  // ============================================================
  // LA VOCE
  // ============================================================
  private fun preparaVoce() {
    voce = TextToSpeech(this) { esito ->
      voceProntaDa = esito == TextToSpeech.SUCCESS
      if (voceProntaDa) {
        voce?.language = Locale.ITALIAN
        voce?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
          override fun onStart(id: String?) {}
          override fun onDone(id: String?) { finita(id, false) }
          override fun onError(id: String?) { finita(id, true) }
          override fun onError(id: String?, codice: Int) { finita(id, true) }
          override fun onStop(id: String?, avviato: Boolean) { finita(id, false) }
        })
        scrivi("voce: TextToSpeech pronto, italiano")
      } else {
        scrivi("voce: TextToSpeech NON pronto — l'app resterebbe muta")
      }
    }
  }

  /* riprovaFraPoco(): si ritenta FINCHE' non entra, non una volta sola.
     Una riprova sola voleva dire che chi era in un sottopasso restava
     fuori anche dopo essere uscito. Una in coda per volta, o se ne
     accatastano una per errore. */
  private fun riprovaFraPoco() {
    if (riprovaInCoda || paginaCaricata) return
    riprovaInCoda = true
    aMano.postDelayed({
      riprovaInCoda = false
      if (!paginaCaricata) { scrivi("RETE: riprovo a caricare"); pagina.loadUrl(INDIRIZZO) }
    }, 5000)
  }

  /* diciDaSoli(): una frase che non viene dalla pagina, perche' la pagina
     non c'e'. Se la voce non e' ancora pronta si aspetta un secondo e si
     riprova: all'avvio il TextToSpeech ci mette un attimo. */
  private fun diciDaSoli(frase: String) {
    if (!voceProntaDa) { aMano.postDelayed({ diciDaSoli(frase) }, 1200); return }
    /* si scrive che l'ha detta, e non solo che ha deciso di dirla: al banco
       il quaderno diceva «la pagina non si carica» e basta, e di quella
       frase — l'unica cosa che un non vedente avrebbe sentito — non c'era
       traccia. In strada e' la riga che serve. */
    val esito = try { voce?.speak(frase, TextToSpeech.QUEUE_ADD, null, "guscio") } catch (e: Exception) { null }
    scrivi("IL GUSCIO DICE" + (if (esito == TextToSpeech.SUCCESS) "" else " (NON E' USCITA)") + ": " + frase)
  }

  private fun finita(id: String?, male: Boolean) {
    val n = id?.toIntOrNull() ?: return
    aMano.post { allaPagina("window.__guscioFinito && window.__guscioFinito($n, ${if (male) "true" else "false"})") }
  }

  private fun diciAdesso(testo: String, velocita: Float, id: Int) {
    val v = voce
    if (v == null || !voceProntaDa) { finita(id.toString(), true); return }
    /* CHI PARLA ADESSO HA RAGIONE: la frase nuova spegne quella vecchia,
       com'e' su iPhone (speechSynthesis.cancel() prima di ogni speak). */
    v.stop()
    v.setSpeechRate(if (velocita > 0.1f) velocita else 1f)
    val esito = v.speak(testo, TextToSpeech.QUEUE_FLUSH, null, id.toString())
    if (esito != TextToSpeech.SUCCESS) finita(id.toString(), true)
  }

  // ============================================================
  // IL MICROFONO
  // ============================================================
  private fun apriAscolto() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) { scrivi("microfono: permesso non dato"); return }
    if (!SpeechRecognizer.isRecognitionAvailable(this)) { scrivi("microfono: questo telefono non riconosce il parlato"); return }
    vuoleAscoltare = true
    if (ascolto != null) return
    val r = SpeechRecognizer.createSpeechRecognizer(this)
    ascolto = r
    r.setRecognitionListener(object : RecognitionListener {
      override fun onResults(b: Bundle?) {
        val frasi = b?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val detto = frasi?.firstOrNull()
        if (!detto.isNullOrBlank()) {
          scrivi("SENTITO: $detto")
          allaPagina("window.urbeaComando && window.urbeaComando(${inJS(detto)})")
        }
        ricomincia()
      }
      override fun onError(codice: Int) {
        /* il permesso negato e' l'unico errore per cui si smette: su tutti
           gli altri — silenzio, rete, tempo scaduto — si riapre, perche'
           chi non vede non ha un tasto da premere per riprovare. */
        if (codice == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
          vuoleAscoltare = false; scrivi("microfono: permesso negato")
        }
        ricomincia()
      }
      override fun onEndOfSpeech() {}
      override fun onReadyForSpeech(p: Bundle?) {}
      override fun onBeginningOfSpeech() {}
      override fun onRmsChanged(v: Float) {}
      override fun onBufferReceived(b: ByteArray?) {}
      override fun onPartialResults(b: Bundle?) {}
      override fun onEvent(t: Int, b: Bundle?) {}
    })
    parti(r)
  }

  private fun parti(r: SpeechRecognizer) {
    val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT")
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
      if (Build.VERSION.SDK_INT >= 33) putExtra(RecognizerIntent.EXTRA_ENABLE_FORMATTING, RecognizerIntent.FORMATTING_OPTIMIZE_QUALITY)
    }
    try { r.startListening(i) } catch (e: Exception) { scrivi("microfono: non parte — " + e.message) }
  }

  /* IL MICROFONO SI RICHIUDE DA SE' DOPO OGNI FRASE: Android fa cosi'. Si
     riapre, con mezzo secondo di respiro per non mangiarsi la coda della
     voce dell'app. */
  private fun ricomincia() {
    val r = ascolto ?: return
    if (!vuoleAscoltare) { chiudiIlMicrofono(); return }
    aMano.postDelayed({ if (vuoleAscoltare && ascolto == r) parti(r) }, 500)
  }

  private fun chiudiIlMicrofono() {
    vuoleAscoltare = false
    try { ascolto?.cancel(); ascolto?.destroy() } catch (e: Exception) {}
    ascolto = null
  }

  /* PORTARE IL TELEFONO ALLA BOCCA, invece di cercare un tasto. «Devo
     premere il tasto per parlare: per un non vedente non va bene» (Vince,
     21/10). Il sensore di prossimita' ce l'hanno tutti: e' quello che
     spegne lo schermo durante una telefonata. */
  private fun guardaLaProssimita() {
    val sm = getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return
    val s = sm.getDefaultSensor(Sensor.TYPE_PROXIMITY) ?: return
    sm.registerListener(object : SensorEventListener {
      /* SI PARTE DA «VICINO», non da «lontano». Al banco il microfono si
         e' aperto da solo 0,3 secondi dopo l'avvio: il sensore diceva
         «vicino» (il telefono era appoggiato) e per noi era un passaggio
         da lontano a vicino, cioe' il gesto. Peggio ancora in tasca, dove
         il sensore dice «vicino» tutto il giorno.
         Partendo da «vicino» il gesto va guadagnato: prima si deve vedere
         il telefono LONTANO — tirato fuori, in mano — e solo il
         passaggio dopo vale. In tasca non succede mai. */
      private var vicinoPrima = true
      override fun onSensorChanged(e: SensorEvent?) {
        val v = (e?.values?.firstOrNull() ?: 99f) < 5f
        if (v && !vicinoPrima) { scrivi("prossimita': telefono alla bocca, apro il microfono"); apriAscolto() }
        vicinoPrima = v
      }
      override fun onAccuracyChanged(s: Sensor?, a: Int) {}
    }, s, SensorManager.SENSOR_DELAY_NORMAL)
  }

  // ============================================================
  // DOVE SEI
  // ============================================================
  private fun cominciaIlGPS() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        != PackageManager.PERMISSION_GRANTED) return
    val lm = getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return
    luoghi = lm
    val ascoltatore = object : LocationListener {
      override fun onLocationChanged(p: Location) { ultima = p; mandaPosizione(p) }
      override fun onProviderEnabled(p: String) {}
      override fun onProviderDisabled(p: String) {}
    }
    for (chi in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
      try { lm.requestLocationUpdates(chi, 1000L, 0f, ascoltatore) } catch (e: Exception) {}
    }
    /* IL BATTITO OGNI TRE SECONDI, come su iPhone e per lo stesso motivo:
       fermi in casa il GPS non manda niente, e la pagina dopo cinque
       secondi di silenzio si arrende e chiede al browser — dove il
       permesso non ce l'ha. Ribattere l'ultima costa nulla. */
    battito = object : Runnable {
      override fun run() { ultima?.let { mandaPosizione(it) }; aMano.postDelayed(this, 3000) }
    }
    aMano.postDelayed(battito!!, 3000)
    /* e il servizio in primo piano, che tiene il GPS vivo in tasca */
    try {
      val i = Intent(this, ServizioCammino::class.java)
      if (Build.VERSION.SDK_INT >= 26) startForegroundService(i) else startService(i)
    } catch (e: Exception) { scrivi("servizio cammino: non parte — " + e.message) }
  }

  private fun mandaPosizione(p: Location) {
    val prec = if (p.accuracy > 1f) p.accuracy else 1f
    /* al passometro serve per distinguere «fermo» da «su un mezzo»: senza
       passi da venti secondi, e' la velocita' a dire quale dei due. */
    velocitaOra = if (p.hasSpeed()) p.speed else 0f
    allaPagina("window.urbeaPosizione && window.urbeaPosizione(${p.latitude},${p.longitude},$prec)")
  }

  // ============================================================
  // IL PASSOMETRO: SE CAMMINI LO DICONO I PASSI, NON IL SATELLITE
  // ============================================================
  /* Fino al 22/10 la pagina decideva da sola, con una soglia sulla
     velocita' del GPS: sotto i 12 all'ora cammini, sopra no. Sbaglia nei
     due sensi — chi va piano col bastone, fermo a un semaforo o dentro
     un sottopasso risulta su un mezzo, e una lettura sballata di
     cinquanta metri vale 180 all'ora anche da seduto.
     Su iPhone lo risolve CMMotionActivity. Su Android la stessa cosa la
     darebbe ActivityRecognition, ma e' dentro i servizi Google: una
     dipendenza in piu' e un pezzo che su certi telefoni non c'e'. Il
     contapassi invece ce l'hanno tutti dal 2013, sta nel sistema, e dice
     esattamente la cosa che ci serve: se i passi li stai facendo.
     LA REGOLA: tre passi negli ultimi otto secondi e stai camminando.
     Nessun passo per venti secondi: se intanto ti muovi, sei su un mezzo;
     se non ti muovi, sei fermo. Nel dubbio non si manda niente, e la
     pagina tiene l'ultima cosa vera finche' non scade. */
  private var ultimoPasso = 0L
  private var quantiPassi = 0
  private var ultimaAttivita = ""
  private var velocitaOra = 0f
  /* i passi da quando l'app e' aperta: servono alla pagina per
     misurare quanto e' lunga la falcata di chi cammina */
  private var passiInTutto = 0

  private fun guardaIPassi() {
    val sm = getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return
    /* su Android 10 in su il contapassi vuole il suo permesso: senza, il
       sensore non arriva e basta — non si schianta niente, ma non si sa
       mai se cammini. Si chiede insieme agli altri. */
    if (Build.VERSION.SDK_INT >= 29 &&
        checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
      try { requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), 77) } catch (e: Exception) {}
    }
    val s = sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    if (s == null) { scrivi("passometro: questo telefono non ce l'ha"); return }
    sm.registerListener(object : SensorEventListener {
      override fun onSensorChanged(e: SensorEvent?) {
        val ora = System.currentTimeMillis()
        if (ora - ultimoPasso > 8000) quantiPassi = 0
        quantiPassi++
        ultimoPasso = ora
        if (quantiPassi >= 3) diLaAttivita("cammina")
        passiInTutto++
        /* si manda ogni dieci, non a ogni passo: la pagina somma lo stesso
           e il ponte non si intasa camminando */
        if (passiInTutto % 10 == 0) {
          allaPagina("window.urbeaPassi && window.urbeaPassi($passiInTutto)")
        }
      }
      override fun onAccuracyChanged(s: Sensor?, a: Int) {}
    }, s, SensorManager.SENSOR_DELAY_NORMAL)
    /* e ogni cinque secondi si guarda il silenzio: i passi che NON
       arrivano dicono quanto quelli che arrivano. */
    aMano.post(object : Runnable {
      override fun run() {
        val fermi = System.currentTimeMillis() - ultimoPasso
        if (fermi > 20000) diLaAttivita(if (velocitaOra >= 3.4f) "mezzo" else "fermo")
        aMano.postDelayed(this, 5000)
      }
    })
  }

  /* SI RIPETE ANCHE SE NON CAMBIA. La pagina, dopo un minuto e mezzo di
     silenzio, butta l'informazione e torna a indovinare dalla velocita':
     fermo a un semaforo in scooter, in quindici secondi la media mobile
     scende a zero e l'app ricomincia a dare gli attraversamenti contati
     in passi. Un fiato ogni mezzo minuto e non scade mai. */
  private var ultimoFiato = 0L

  private fun diLaAttivita(come: String) {
    val ora = System.currentTimeMillis()
    if (come == ultimaAttivita && ora - ultimoFiato < 30000) return
    if (come != ultimaAttivita) scrivi("passometro: " + come)
    ultimaAttivita = come
    ultimoFiato = ora
    allaPagina("window.urbeaAttivita && window.urbeaAttivita(\"" + come + "\", true)")
  }

  // ============================================================
  // IL COLPO ALLA MANO
  // ============================================================
  /* Serve al faro — il telefono diventa una bacchetta e vibra quando lo
     punti verso la meta, come in Microsoft Soundscape — e alle svolte.
     Per strada il suono lo copre un autobus, e l'udito di chi non vede e'
     gia' occupato a tenerlo vivo: la mano no.
     Nel WebView `navigator.vibrate` c'e' solo se il permesso c'e', e
     comunque non sa fare il colpo secco: lo facciamo qui, uguale
     all'iPhone. */
  private fun colpoAllaMano(forza: String) {
    try {
      val v: Vibrator? = if (Build.VERSION.SDK_INT >= 31) {
        (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
      } else {
        @Suppress("DEPRECATION") getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      }
      if (v == null || !v.hasVibrator()) return
      if (Build.VERSION.SDK_INT >= 26) {
        when (forza) {
          "arrivato" -> v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 60, 70, 60), -1))
          "forte" -> v.vibrate(VibrationEffect.createOneShot(45, VibrationEffect.DEFAULT_AMPLITUDE))
          else -> v.vibrate(VibrationEffect.createOneShot(18, 90))
        }
      } else {
        @Suppress("DEPRECATION")
        when (forza) {
          "arrivato" -> v.vibrate(longArrayOf(0, 60, 70, 60), -1)
          "forte" -> v.vibrate(45L)
          else -> v.vibrate(18L)
        }
      }
    } catch (e: Exception) { scrivi("vibrazione: " + e.message) }
  }

  // ============================================================
  // LA RUBRICA
  // ============================================================
  private fun cercaInRubrica(nome: String) {
    cercandoInRubrica = nome
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.READ_CONTACTS), 7)
      rispondiRubrica(nome, null, "niente-permesso")
      return
    }
    var numero: String? = null
    try {
      val c = contentResolver.query(
        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
        arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER),
        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
        arrayOf("%$nome%"), null)
      c?.use { if (it.moveToFirst()) numero = it.getString(1) }
    } catch (e: Exception) { scrivi("rubrica: " + e.message) }
    rispondiRubrica(nome, numero, if (numero == null) "niente" else null)
  }

  private fun rispondiRubrica(nome: String, numero: String?, guaio: String?) {
    scrivi("RUBRICA: $nome -> " + (guaio ?: numero ?: "?"))
    val n = if (numero == null) "null" else inJS(numero)
    val g = if (guaio == null) "null" else inJS(guaio)
    allaPagina("window.urbeaDallaRubrica && window.urbeaDallaRubrica(${inJS(nome)}, $n, $g)")
  }

  // ============================================================
  // COM'E' MESSO IL TELEFONO: TALKBACK E IL TESTO GRANDE
  // Su iPhone e' VoiceOver, qui e' TalkBack — e la sorella di Vince ha
  // Android, non un iPhone. La pagina vuole la stessa chiamata.
  // ============================================================
  private fun mandaAccessibilita() {
    val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
    val lettore = am?.isTouchExplorationEnabled == true
    val scala = resources.configuration.fontScale
    val grande = scala >= 1.3f
    scrivi("accessibilita: TalkBack " + (if (lettore) "acceso" else "spento") + ", testo x$scala")
    allaPagina("window.urbeaAccessibilita && window.urbeaAccessibilita($lettore, $grande, ${inJS("fontScale " + scala)})")
  }

  // ============================================================
  // i permessi, il diario, gli attrezzi
  // ============================================================
  private fun chiediIPermessi() {
    val mancano = mutableListOf<String>()
    for (p in listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.RECORD_AUDIO)) {
      if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) mancano.add(p)
    }
    if (Build.VERSION.SDK_INT >= 33 &&
        ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      mancano.add(Manifest.permission.POST_NOTIFICATIONS)
    }
    if (mancano.isEmpty()) cominciaIlGPS()
    else ActivityCompat.requestPermissions(this, mancano.toTypedArray(), 1)
  }

  override fun onRequestPermissionsResult(codice: Int, quali: Array<out String>, esiti: IntArray) {
    super.onRequestPermissionsResult(codice, quali, esiti)
    if (codice == 1) {
      cominciaIlGPS()
      /* «SEMPRE» SI CHIEDE DOPO IL PRIMO SI', mai all'apertura: chiesta
         subito, Android la mostra come una pretesa e la gente dice no.
         Identico al ragionamento del guscio iPhone. */
      if (Build.VERSION.SDK_INT >= 29 &&
          ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED &&
          ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 2)
      }
    }
    if (codice == 7) cercandoInRubrica?.let { cercaInRubrica(it) }
  }

  fun allaPagina(js: String) {
    aMano.post { try { pagina.evaluateJavascript(js, null) } catch (e: Exception) {} }
  }

  /* IL QUADERNO. Lo stesso nome di quello dell'iPhone —
     traccia-AAAA-MM-GG.txt — perche' e' da li' che si capisce cosa e'
     successo in strada, e non si vogliono due formati da leggere. */
  fun scrivi(riga: String) {
    Log.d(TAG, riga)
    try {
      val giorno = SimpleDateFormat("yyyy-MM-dd", Locale.ITALY).format(Date())
      val ora = SimpleDateFormat("HH:mm:ss", Locale.ITALY).format(Date())
      File(filesDir, "traccia-$giorno.txt").appendText("$ora  $riga\n")
    } catch (e: Exception) {}
  }

  override fun onDestroy() {
    chiudiIlMicrofono()
    battito?.let { aMano.removeCallbacks(it) }
    try { voce?.stop(); voce?.shutdown() } catch (e: Exception) {}
    try { stopService(Intent(this, ServizioCammino::class.java)) } catch (e: Exception) {}
    super.onDestroy()
  }

  override fun onBackPressed() {
    if (pagina.canGoBack()) pagina.goBack() else super.onBackPressed()
  }
}

/* inJS(): una stringa che si puo' infilare nel javascript senza che un
   apostrofo o un accapo mandi tutto all'aria. JSONObject.quote fa
   esattamente questo, virgolette comprese. */
fun inJS(t: String): String = JSONObject.quote(t)
