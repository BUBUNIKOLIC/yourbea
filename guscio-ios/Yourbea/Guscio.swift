/*  IL GUSCIO — Yourbea su iPhone, 15/10/2026
    ============================================================
    L'app vera è la pagina web: https://bubunikolic.github.io/yourbea/nuova/
    Questo guscio non ha schermate sue. Serve per le tre cose che dentro
    Safari non si possono fare, e che per chi non vede sono tutto:

    1. LA POSIZIONE CONTINUA ANCHE A SCHERMO SPENTO. In Safari il GPS si
       ferma appena il telefono va in tasca: l'app smetterebbe di
       raccontare proprio mentre cammini.
    2. IL MICROFONO SENZA PREMERE OGNI VOLTA. Il riconoscimento del
       browser chiede un gesto a ogni ascolto: un gesto che chi non vede
       deve cercare sullo schermo.
    3. L'AUDIO IN SOTTOFONDO. Le clip di Alice continuano con lo schermo
       spento e in cuffia.

    Il guscio apre quattro porte alla pagina, e niente altro:
       window.urbeaHaPosizione    c'è il GPS nativo
       window.urbeaPosizione()    il guscio la chiama a ogni passo
       window.urbeaAscolta()      apri il microfono, una frase
       window.urbeaChiudiAscolto()
       window.urbeaComando()      il guscio la chiama con la frase capita
       window.urbeaDiario()       la pagina scrive, il guscio stampa nel log

    Nessuna regola dell'app sta qui dentro: se una frase va detta o no lo
    decide la pagina. Così il guscio si installa una volta e le correzioni
    arrivano da sé, aggiornando il sito.
*/

import UIKit
import WebKit
import CoreLocation
import AVFoundation
import Speech

let INDIRIZZO = "https://bubunikolic.github.io/yourbea/nuova/"

final class Schermo: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {

  private var pagina: WKWebView!
  private let gps = CLLocationManager()
  private let riconoscitore = SFSpeechRecognizer(locale: Locale(identifier: "it-IT"))
  private var motore: AVAudioEngine?
  private var richiesta: SFSpeechAudioBufferRecognitionRequest?
  private var ascolto: SFSpeechRecognitionTask?
  private var vuoleAscoltare = false
  private var ultimaPosizione: CLLocation?
  private var battito: Timer?
  private var ultimoParlato = ""
  private var chiusuraRitardata: DispatchWorkItem?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.04, green: 0.05, blue: 0.09, alpha: 1)
    apriLaPagina()
    preparaAudio()
    preparaGps()
    SFSpeechRecognizer.requestAuthorization { _ in }
  }

  // MARK: la pagina

  private func apriLaPagina() {
    /* LA CACHE SI BUTTA A OGNI AVVIO. Senza, il telefono tiene i file per
       dieci minuti: si corregge un difetto, si pubblica, si riapre l'app e
       si sente ancora quello vecchio — e si cerca un errore che non c'è
       più. Ci sono andati via due giorni, in questo modo. */
    URLCache.shared.removeAllCachedResponses()
    HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }

    let config = WKWebViewConfiguration()
    config.allowsInlineMediaPlayback = true
    /* le clip partono da sole: chi non vede non può premere «play» */
    config.mediaTypesRequiringUserActionForPlayback = []
    let porte = WKUserScript(source: Schermo.ponte, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    config.userContentController.addUserScript(porte)
    config.userContentController.add(self, name: "guscio")

    pagina = WKWebView(frame: view.bounds, configuration: config)
    pagina.navigationDelegate = self
    pagina.scrollView.bounces = false
    pagina.isOpaque = false
    pagina.backgroundColor = view.backgroundColor
    pagina.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(pagina)
    NSLayoutConstraint.activate([
      pagina.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      pagina.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      pagina.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      pagina.trailingAnchor.constraint(equalTo: view.trailingAnchor)
    ])
    var u = URLComponents(string: INDIRIZZO)!
    u.queryItems = [URLQueryItem(name: "guscio", value: "ios")]
    var richiesta = URLRequest(url: u.url!)
    richiesta.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
    pagina.load(richiesta)
  }

  /* IL PONTE: le quattro porte, scritte nella pagina prima che parta. */
  static let ponte = """
  window.urbeaHaPosizione = true;
  window.urbeaAscolta = function () { webkit.messageHandlers.guscio.postMessage({ cosa: 'ascolta' }); };
  window.urbeaChiudiAscolto = function () { webkit.messageHandlers.guscio.postMessage({ cosa: 'chiudi' }); };
  window.urbeaDiario = function (t) { webkit.messageHandlers.guscio.postMessage({ cosa: 'diario', testo: String(t) }); };
  """

  func userContentController(_ c: WKUserContentController, didReceive messaggio: WKScriptMessage) {
    guard let d = messaggio.body as? [String: Any], let cosa = d["cosa"] as? String else { return }
    switch cosa {
    case "ascolta": vuoleAscoltare = true; apriMicrofono()
    case "chiudi": vuoleAscoltare = false; chiudiMicrofono()
    case "diario": NSLog("YOURBEA %@", (d["testo"] as? String) ?? "")
    default: break
    }
  }

  private func allaPagina(_ js: String) {
    DispatchQueue.main.async { self.pagina.evaluateJavaScript(js, completionHandler: nil) }
  }

  // MARK: la posizione

  private func preparaGps() {
    gps.delegate = self
    gps.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    /* ogni cinque metri: più fitto non serve e scalda il telefono */
    gps.distanceFilter = 5
    gps.activityType = .fitness
    gps.pausesLocationUpdatesAutomatically = false
    gps.requestWhenInUseAuthorization()
    gps.startUpdatingLocation()
    /* IL BATTITO. iOS manda una posizione nuova solo quando ti SPOSTI di
       cinque metri: fermo in casa il guscio taceva, e la pagina — che dopo
       cinque secondi di silenzio si arrende e chiede al browser — finiva a
       chiedere il permesso dentro la WKWebView, dove non ce l'ha, e si
       lamentava di non sapere dove sei. Quindi l'ultima posizione si
       ribatte ogni tre secondi: costa niente e la pagina sa che ci siamo. */
    battito = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
      guard let self = self, let p = self.ultimaPosizione else { return }
      self.mandaPosizione(p)
    }
  }

  private func mandaPosizione(_ p: CLLocation) {
    allaPagina(String(format: "window.urbeaPosizione && window.urbeaPosizione(%f,%f,%f)",
                      p.coordinate.latitude, p.coordinate.longitude, max(p.horizontalAccuracy, 1)))
  }

  func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
    /* «sempre» si chiede DOPO il primo sì, mai all'apertura: chiesta
       subito, iOS la mostra come una pretesa e la gente dice no. */
    if m.authorizationStatus == .authorizedWhenInUse {
      m.allowsBackgroundLocationUpdates = true
      m.requestAlwaysAuthorization()
      m.startUpdatingLocation()
    }
    if m.authorizationStatus == .authorizedAlways {
      m.allowsBackgroundLocationUpdates = true
      m.startUpdatingLocation()
    }
    /* quella che iOS ha già in tasca parte subito: non si fa aspettare chi
       apre l'app in casa, dove il GPS ci mette venti secondi a decidersi */
    if let p = m.location { ultimaPosizione = p; mandaPosizione(p) }
  }

  func locationManager(_ m: CLLocationManager, didUpdateLocations punti: [CLLocation]) {
    guard let p = punti.last else { return }
    ultimaPosizione = p
    mandaPosizione(p)
  }

  func locationManager(_ m: CLLocationManager, didFailWithError e: Error) {
    NSLog("YOURBEA gps: %@", e.localizedDescription)
  }

  // MARK: l'audio e il microfono

  private func preparaAudio() {
    /* playAndRecord con defaultToSpeaker: la voce esce dall'altoparlante
       anche quando il microfono è aperto, e continua a schermo spento. */
    let s = AVAudioSession.sharedInstance()
    try? s.setCategory(.playAndRecord, mode: .spokenAudio,
                       options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
    try? s.setActive(true)
  }

  private func apriMicrofono() {
    guard SFSpeechRecognizer.authorizationStatus() == .authorized,
          let r = riconoscitore, r.isAvailable else {
      NSLog("YOURBEA microfono non disponibile")
      return
    }
    chiudiMicrofono()
    ultimoParlato = ""
    let m = AVAudioEngine()
    let richiesta = SFSpeechAudioBufferRecognitionRequest()
    richiesta.shouldReportPartialResults = true
    let ingresso = m.inputNode
    ingresso.installTap(onBus: 0, bufferSize: 1024, format: ingresso.outputFormat(forBus: 0)) { buf, _ in
      richiesta.append(buf)
    }
    m.prepare()
    do { try m.start() } catch { NSLog("YOURBEA motore audio: %@", error.localizedDescription); return }
    motore = m
    self.richiesta = richiesta

    ascolto = r.recognitionTask(with: richiesta) { [weak self] risultato, errore in
      guard let self = self else { return }
      if let risultato = risultato {
        self.ultimoParlato = risultato.bestTranscription.formattedString
        /* una frase sola: appena sta zitto un attimo, si manda e si chiude.
           Senza questo il microfono resterebbe aperto a sentire noi stessi. */
        self.rimandaChiusura(fra: risultato.isFinal ? 0.05 : 1.1)
      }
      if errore != nil || (risultato?.isFinal ?? false) { self.rimandaChiusura(fra: 0.05) }
    }
    /* se non dice niente per dieci secondi si ricomincia da capo: il
       riconoscimento di iOS non regge sessioni lunghe, e comunque va
       rinfrescato. Non si SPEGNE: spegnerlo era il difetto del 15/10 —
       «portami a via Corsetti» detto dopo un minuto di silenzio non lo
       sentiva nessuno, perché il microfono era chiuso e la pagina lo
       credeva aperto. Finché la pagina non dice «chiudi», si ascolta. */
    rimandaChiusura(fra: 10)
  }

  private func rimandaChiusura(fra secondi: Double) {
    chiusuraRitardata?.cancel()
    let c = DispatchWorkItem { [weak self] in self?.consegnaEChiudi() }
    chiusuraRitardata = c
    DispatchQueue.main.asyncAfter(deadline: .now() + secondi, execute: c)
  }

  private func consegnaEChiudi() {
    let detto = ultimoParlato.trimmingCharacters(in: .whitespacesAndNewlines)
    chiudiMicrofono()
    /* e si torna ad ascoltare: una frase consegnata non è la fine della
       conversazione. Il mezzo secondo serve a non riprendere la coda della
       stessa frase. */
    if vuoleAscoltare {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        guard let self = self, self.vuoleAscoltare, self.motore == nil else { return }
        self.apriMicrofono()
      }
    }
    guard !detto.isEmpty else { return }
    let pulito = detto.replacingOccurrences(of: "\\", with: "")
                      .replacingOccurrences(of: "\"", with: "")
    NSLog("YOURBEA detto: %@", pulito)
    allaPagina("window.urbeaComando && window.urbeaComando(\"\(pulito)\")")
  }

  private func chiudiMicrofono() {
    chiusuraRitardata?.cancel(); chiusuraRitardata = nil
    ascolto?.cancel(); ascolto = nil
    richiesta?.endAudio(); richiesta = nil
    if let m = motore { m.inputNode.removeTap(onBus: 0); m.stop() }
    motore = nil
  }

  override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}

@main
final class Avvio: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  func application(_ a: UIApplication, didFinishLaunchingWithOptions o: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let w = UIWindow(frame: UIScreen.main.bounds)
    w.rootViewController = Schermo()
    w.makeKeyAndVisible()
    window = w
    return true
  }
}
