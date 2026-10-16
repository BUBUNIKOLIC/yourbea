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
import Contacts

let INDIRIZZO = "https://bubunikolic.github.io/yourbea/nuova/"

final class Schermo: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {

  private var pagina: WKWebView!
  private let gps = CLLocationManager()
  private let riconoscitore = SFSpeechRecognizer(locale: Locale(identifier: "it-IT"))
  private var motore: AVAudioEngine?
  private var richiesta: SFSpeechAudioBufferRecognitionRequest?
  private var ascolto: SFSpeechRecognitionTask?
  private var quaderno: FileHandle?
  private var ultimaScritta = Date(timeIntervalSince1970: 0)
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
    apriIlQuaderno()
  }

  /* IL QUADERNO DEL PERCORSO — idea di Vince, 16/10:
     «tenere un registro del percorso che faccio ed avere un riscontro con
     quello che ti dirò, per capire cosa non ha funzionato».
     Finora il diario dell'app viveva solo nel log del Mac, e il log si
     legge solo col cavo attaccato — cioè mai, mentre si cammina. Adesso
     ogni riga e ogni posizione finiscono in un file dentro l'app, uno al
     giorno. Si rilegge dopo, col cavo, e si confronta con quello che la
     persona racconta: «qui non ha detto niente» diventa una riga con
     l'ora e le coordinate, non un ricordo.
     Resta nel telefono: non parte niente verso nessuno. */
  private func apriIlQuaderno() {
    let giorno = DateFormatter()
    giorno.dateFormat = "yyyy-MM-dd"
    guard let cartella = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
    let f = cartella.appendingPathComponent("traccia-\(giorno.string(from: Date())).txt")
    if !FileManager.default.fileExists(atPath: f.path) {
      FileManager.default.createFile(atPath: f.path, contents: nil)
    }
    quaderno = try? FileHandle(forWritingTo: f)
    quaderno?.seekToEndOfFile()
    scrivi("— acceso —")
    NSLog("YOURBEA quaderno: %@", f.path)
  }

  private func scrivi(_ riga: String) {
    let ora = DateFormatter()
    ora.dateFormat = "HH:mm:ss"
    guard let dati = (ora.string(from: Date()) + " " + riga + "\n").data(using: .utf8) else { return }
    quaderno?.write(dati)
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
  window.urbeaRubrica = function (nome) { webkit.messageHandlers.guscio.postMessage({ cosa: 'rubrica', nome: String(nome) }); };
  """

  /* TELEFONATE E MESSAGGI. Una WKWebView non apre da sé tel: e sms:, li
     blocca e basta: «avvisa Mariolina» non faceva NIENTE, e nel log non
     compariva niente, perché per la pagina il messaggio era partito. Qui si
     passano al telefono, che apre Telefono o Messaggi col testo già
     scritto. L'invio lo preme la persona: nessuna app su iOS può mandare un
     SMS di nascosto, e prometterlo sarebbe una bugia pericolosa. */
  func webView(_ w: WKWebView, decidePolicyFor azione: WKNavigationAction,
               decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    let fuori = ["tel", "sms", "mailto", "facetime", "maps", "whatsapp"]
    /* wa.me è un indirizzo normale ma porta a WhatsApp: dentro la pagina
       non deve entrarci, se no l'app sparisce dietro una pagina web. */
    let aWhatsApp = ["wa.me", "api.whatsapp.com"].contains(azione.request.url?.host?.lowercased() ?? "")
    if let u = azione.request.url, let schema = u.scheme?.lowercased(),
       fuori.contains(schema) || aWhatsApp {
      UIApplication.shared.open(u, options: [:], completionHandler: nil)
      /* nel log va anche l'indirizzo intero: quando «non la chiama» bisogna
         sapere SE il numero era buono, non indovinarlo. */
      NSLog("YOURBEA apro: %@", u.absoluteString)
      decisionHandler(.cancel)
      return
    }
    decisionHandler(.allow)
  }

  func userContentController(_ c: WKUserContentController, didReceive messaggio: WKScriptMessage) {
    guard let d = messaggio.body as? [String: Any], let cosa = d["cosa"] as? String else { return }
    switch cosa {
    case "ascolta": vuoleAscoltare = true; apriMicrofono()
    case "chiudi": vuoleAscoltare = false; chiudiMicrofono()
    case "diario":
      let t = (d["testo"] as? String) ?? ""
      NSLog("YOURBEA %@", t)
      scrivi(t)
    case "rubrica": cercaInRubrica((d["nome"] as? String) ?? "")
    default: break
    }
  }

  private func allaPagina(_ js: String) {
    DispatchQueue.main.async { self.pagina.evaluateJavaScript(js, completionHandler: nil) }
  }

  /* LA RUBRICA. «E bisogna scrivere», ha detto Vince: per registrare chi
     avvisare bisognava dettare un numero cifra per cifra, quando quel
     numero sta gia nel telefono. Si dice il nome e basta: il guscio cerca
     in rubrica e passa il numero alla pagina. Il permesso lo chiede iOS la
     prima volta, e se dice di no si torna al numero dettato: non si resta
     senza strada. */
  private func cercaInRubrica(_ nome: String) {
    let cercato = nome.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cercato.isEmpty else { return }
    let store = CNContactStore()
    store.requestAccess(for: .contacts) { [weak self] concesso, _ in
      guard let self = self else { return }
      guard concesso else { self.rispondiRubrica(cercato, nil, "niente-permesso"); return }
      let chiavi = [CNContactGivenNameKey, CNContactFamilyNameKey,
                    CNContactPhoneNumbersKey] as [CNKeyDescriptor]
      do {
        let trovati = try store.unifiedContacts(
          matching: CNContact.predicateForContacts(matchingName: cercato), keysToFetch: chiavi)
        /* si prende il cellulare, se c'e': a chi ti deve venire a prendere
           si telefona sul cellulare, non in ufficio */
        for c in trovati {
          let numeri = c.phoneNumbers
          let cellulare = numeri.first(where: { $0.label == CNLabelPhoneNumberMobile || $0.label == CNLabelPhoneNumberiPhone })
          if let n = (cellulare ?? numeri.first)?.value.stringValue {
            let nomeIntero = [c.givenName, c.familyName].filter { !$0.isEmpty }.joined(separator: " ")
            self.rispondiRubrica(nomeIntero.isEmpty ? cercato : nomeIntero, n, nil)
            return
          }
        }
        self.rispondiRubrica(cercato, nil, "non-trovato")
      } catch {
        self.rispondiRubrica(cercato, nil, "non-trovato")
      }
    }
  }

  private func rispondiRubrica(_ nome: String, _ numero: String?, _ guaio: String?) {
    func pulito(_ t: String) -> String {
      return t.replacingOccurrences(of: "\\", with: "").replacingOccurrences(of: "\"", with: "")
    }
    let n = numero == nil ? "null" : "\"\(pulito(numero!))\""
    let g = guaio == nil ? "null" : "\"\(guaio!)\""
    NSLog("YOURBEA rubrica: %@ -> %@", nome, guaio ?? (numero ?? "?"))
    allaPagina("window.urbeaDallaRubrica && window.urbeaDallaRubrica(\"\(pulito(nome))\", \(n), \(g))")
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
    /* la traccia: una riga ogni cinque secondi basta a ricostruire il
       cammino, e il file resta leggero */
    if Date().timeIntervalSince(ultimaScritta) > 5 {
      ultimaScritta = Date()
      scrivi(String(format: "DOVE %.6f %.6f ±%.0fm %.0f km/h",
                    p.coordinate.latitude, p.coordinate.longitude,
                    max(p.horizontalAccuracy, 0), max(p.speed, 0) * 3.6))
    }
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
    scrivi("DETTO: " + pulito)
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
