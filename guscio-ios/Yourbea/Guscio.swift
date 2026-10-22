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
    4. LEGGERE QUELLO CHE LA FOTOCAMERA HA DAVANTI. Cartelli, numeri
       dell'autobus, citofoni, menu: il riconoscimento del testo sta dentro
       iOS (Vision), quindi è gratis, funziona senza rete e nessuna
       fotografia esce dal telefono.

    Il guscio apre queste porte alla pagina, e niente altro:
       window.urbeaHaPosizione    c'è il GPS nativo
       window.urbeaPosizione()    il guscio la chiama a ogni passo
       window.urbeaAscolta()      apri il microfono, una frase
       window.urbeaChiudiAscolto()
       window.urbeaComando()      il guscio la chiama con la frase capita
       window.urbeaDiario()       la pagina scrive, il guscio stampa nel log
       window.urbeaRubrica()      cerca un nome fra i contatti
       window.urbeaSaLeggere      la fotocamera c'è: si può chiedere di leggere
       window.urbeaLeggi()        uno scatto, e il testo che c'è dentro
       window.urbeaLetto()        il guscio la chiama con le righe lette

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
import Vision

let INDIRIZZO = "https://bubunikolic.github.io/yourbea/nuova/"

final class Schermo: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, CLLocationManagerDelegate,
                     AVCapturePhotoCaptureDelegate {

  private var pagina: WKWebView!
  private let gps = CLLocationManager()
  private let riconoscitore = SFSpeechRecognizer(locale: Locale(identifier: "it-IT"))
  private var motore: AVAudioEngine?
  private var richiesta: SFSpeechAudioBufferRecognitionRequest?
  private var ascolto: SFSpeechRecognitionTask?
  private var quaderno: FileHandle?
  private let acquisti = Acquisti()
  private var ultimaScritta = Date(timeIntervalSince1970: 0)
  private var vuoleAscoltare = false
  private var ultimaRiconferma: TimeInterval = 0
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
    /* VoiceOver e il testo grande: si ascolta da subito, e si manda alla
       pagina appena ha finito di caricare (sotto, in didFinish). Scritte
       il 19/10 e rimaste SCOLLEGATE fino al 20: le funzioni c'erano e non
       le chiamava nessuno. Codice morto che sembra una funzione fatta. */
    ascoltaAccessibilita()
    ascoltaLaProssimita()
    segnaIlCiclo()
    /* il negozio si apre in sottofondo: se non risponde, l'app resta
       intera e semplicemente non offre niente */
    acquisti.quandoCambia = { [weak self] attivo, scadenza, prezzo in
      self?.mandaAbbonamento(attivo, scadenza, prezzo)
    }
    Task { @MainActor in await self.acquisti.comincia() }
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
  window.urbeaSaLeggere = true;
  window.urbeaLeggi = function () { webkit.messageHandlers.guscio.postMessage({ cosa: 'leggi' }); };
  window.urbeaSaComprare = true;
  window.urbeaCompra = function () { webkit.messageHandlers.guscio.postMessage({ cosa: 'compra' }); };
  window.urbeaRipristina = function () { webkit.messageHandlers.guscio.postMessage({ cosa: 'ripristina' }); };
  """

  /* TELEFONATE E MESSAGGI. Una WKWebView non apre da sé tel: e sms:, li
     blocca e basta: «avvisa Mariolina» non faceva NIENTE, e nel log non
     compariva niente, perché per la pagina il messaggio era partito. Qui si
     passano al telefono, che apre Telefono o Messaggi col testo già
     scritto. L'invio lo preme la persona: nessuna app su iOS può mandare un
     SMS di nascosto, e prometterlo sarebbe una bugia pericolosa. */
  /* appena la pagina e' in piedi le si dice com'e' messo il telefono:
     VoiceOver acceso o spento, e quanto e' grande il testo di sistema. */
  func webView(_ w: WKWebView, didFinish navigation: WKNavigation!) {
    mandaAccessibilita()
    mandaAbbonamento(acquisti.attivo, acquisti.scadenza, acquisti.prezzo())
  }

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
    case "leggi": leggiQuelloCheVedo()
    /* GLI ACQUISTI. Il pagamento lo mostra Apple, non noi: la pagina chiede
       e il telefono apre la sua schermata. Quello che torna indietro e' una
       frase da dire a voce, perche' chi non vede non legge un codice. */
    case "compra":
      Task { @MainActor in
        let come = await self.acquisti.compra()
        self.allaPagina("window.urbeaEsitoAcquisto && window.urbeaEsitoAcquisto(" + Schermo.inJS(come) + ")")
      }
    case "ripristina":
      Task { @MainActor in
        let come = await self.acquisti.ripristina()
        self.allaPagina("window.urbeaEsitoAcquisto && window.urbeaEsitoAcquisto(" + Schermo.inJS(come) + ")")
      }
    default: break
    }
  }

  /* ============================================================
     VOICEOVER E IL TESTO GRANDE
     VoiceOver e' il lettore di schermo dentro ogni iPhone: un non vedente
     lo tiene acceso sempre, perche' e' il modo in cui usa il telefono.
     Saperlo cambia tre cose, e fin qui l'app non se lo chiedeva.

     1. E' IL MODO ONESTO DI SAPERLO SENZA CHIEDERLO. Nessuno deve
        dichiarare di essere cieco per usare un'app.
     2. GLI STAVAMO PARLANDO SOPRA. La pagina scrive il testo in un
        riquadro aria-live, e VoiceOver lo legge ad alta voce MENTRE la
        nostra voce sta dicendo la stessa frase: due voci sovrapposte. E'
        quasi certamente quello che la sorella di Vince descriveva come
        «sentivo tre voci».
     3. IL PREZZO. «Gratis se c'e' VoiceOver» (Vince, 16/10).

     Si manda alla pagina all'avvio e ogni volta che cambia: VoiceOver si
     accende e si spegne col triplo clic, anche a meta' strada.           */
  /* inJS(): una frase italiana dentro una chiamata JavaScript. Senza
     virgolettarla per bene, un apostrofo — e in italiano ce n'e' uno ogni
     due parole — spezza il codice e il messaggio non arriva. */
  static func inJS(_ t: String) -> String {
    let d = (try? JSONSerialization.data(withJSONObject: [t])) ?? Data()
    let s = String(data: d, encoding: .utf8) ?? "[\"\"]"
    return String(s.dropFirst().dropLast())
  }

  /* ABBONAMENTO: si dice alla pagina com'e' messo, appena si sa e ogni
     volta che cambia (un rinnovo, una disdetta, un rimborso). */
  private func mandaAbbonamento(_ attivo: Bool, _ scadenza: Date?, _ prezzo: String?) {
    var fino = "null"
    if let s = scadenza { fino = String(Int(s.timeIntervalSince1970 * 1000)) }
    let p = prezzo.map { Schermo.inJS($0) } ?? "null"
    allaPagina("window.urbeaAbbonamento && window.urbeaAbbonamento(\(attivo ? "true" : "false"), \(fino), \(p))")
    scrivi("abbonamento: " + (attivo ? "attivo" : "no") + (prezzo != nil ? ", prezzo \(prezzo!)" : ", prodotto non trovato"))
  }

  /* ============================================================
     PARLARE SENZA PREMERE NIENTE
     «Devo premere il tasto per parlare: per un non vedente non va bene.
     Dovrebbe essere sufficiente portarlo vicino alla bocca» (Vince,
     21/10). Ha ragione, e la soluzione ce l'ha il telefono da sempre: il
     sensore di prossimita', quello che spegne lo schermo quando porti il
     telefono all'orecchio per rispondere.
     Avvicinandolo alla faccia il microfono si apre da solo; allontanandolo
     si chiude e la frase parte. E' il gesto che si fa gia' per parlare al
     telefono, quindi non c'e' niente da imparare — e soprattutto non c'e'
     niente da TROVARE con un dito su un vetro liscio.
     Il microfono continuo resta: questo e' il modo di dire «adesso parlo
     io» quando intorno c'e' rumore e l'ascolto continuo non basta. */
  private var vicinoAllaFaccia = false

  /* ============================================================
     PERCHÉ L'APP È SPARITA
     «Qualche volta pare sia uscita e ho dovuto riattivarla» (Vince,
     21/10). Il quaderno gli dà ragione: un'ora e tre minuti di silenzio
     (08:10 → 09:14) e poi un avvio nuovo. Prima del silenzio niente di
     strano — posizioni regolari, nessun errore.
     Le spiegazioni sono due e vogliono rimedi opposti:
       - iOS l'ha SOSPESA perché stava in sottofondo senza fare niente;
       - iOS l'ha CHIUSA per fare spazio a un'altra app (memoria).
     Il quaderno, com'era, non le distingue: in tutti e due i casi vede
     solo silenzio. Da qui in poi scrive quando esce di scena e quando
     torna, e quanta memoria sta usando. La prossima volta che succede, la
     riga ce lo dice senza doverlo indovinare. */
  private func segnaIlCiclo() {
    let c = NotificationCenter.default
    c.addObserver(forName: UIApplication.didEnterBackgroundNotification,
                  object: nil, queue: .main) { [weak self] _ in
      self?.scrivi("— in sottofondo — memoria \(self?.memoriaUsata() ?? "?")")
    }
    c.addObserver(forName: UIApplication.willEnterForegroundNotification,
                  object: nil, queue: .main) { [weak self] _ in
      self?.scrivi("— torno in primo piano —")
    }
    c.addObserver(forName: UIApplication.willTerminateNotification,
                  object: nil, queue: .main) { [weak self] _ in
      self?.scrivi("— chiusa dal sistema o dall'utente —")
    }
    c.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification,
                  object: nil, queue: .main) { [weak self] _ in
      self?.scrivi("!! MEMORIA AGLI SGOCCIOLI: \(self?.memoriaUsata() ?? "?") — qui iOS sta per chiuderci")
    }
    /* e un battito ogni due minuti: se il quaderno si ferma fra un battito
       e l'altro, il momento esatto lo sappiamo al minuto. */
    Timer.scheduledTimer(withTimeInterval: 120, repeats: true) { [weak self] _ in
      self?.scrivi("— vivo — memoria \(self?.memoriaUsata() ?? "?")")
    }
  }

  private func memoriaUsata() -> String {
    var info = task_vm_info_data_t()
    var conta = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size / MemoryLayout<natural_t>.size)
    let esito = withUnsafeMutablePointer(to: &info) {
      $0.withMemoryRebound(to: integer_t.self, capacity: Int(conta)) {
        task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &conta)
      }
    }
    guard esito == KERN_SUCCESS else { return "?" }
    return String(info.phys_footprint / (1024 * 1024)) + " MB"
  }

  private func ascoltaLaProssimita() {
    let d = UIDevice.current
    d.isProximityMonitoringEnabled = true
    guard d.isProximityMonitoringEnabled else {
      scrivi("prossimita: questo telefono non ce l'ha")
      return
    }
    NotificationCenter.default.addObserver(
      forName: UIDevice.proximityStateDidChangeNotification,
      object: d, queue: .main) { [weak self] _ in
        guard let self = self else { return }
        let vicino = UIDevice.current.proximityState
        if vicino == self.vicinoAllaFaccia { return }
        self.vicinoAllaFaccia = vicino
        self.scrivi("prossimita: " + (vicino ? "vicino, apro il microfono" : "lontano, chiudo"))
        if vicino {
          /* si zittisce: se sta parlando, uno che avvicina il telefono
             vuole interromperla, non sovrapporsi */
          self.allaPagina("window.YBzitta && window.YBzitta()")
          self.vuoleAscoltare = true
          self.apriMicrofono()
        } else {
          self.vuoleAscoltare = false
          self.chiudiMicrofono()
        }
      }
  }

  private func mandaAccessibilita() {
    let vo = UIAccessibility.isVoiceOverRunning
    let grande = UIApplication.shared.preferredContentSizeCategory.isAccessibilityCategory
    let taglia = UIApplication.shared.preferredContentSizeCategory.rawValue
    allaPagina(String(format:
      "window.urbeaAccessibilita && window.urbeaAccessibilita(%@,%@,'%@')",
      vo ? "true" : "false", grande ? "true" : "false",
      taglia.replacingOccurrences(of: "'", with: "")))
    scrivi("accessibilita: VoiceOver \(vo ? "acceso" : "spento"), testo \(taglia)")
  }

  private func ascoltaAccessibilita() {
    let c = NotificationCenter.default
    c.addObserver(forName: UIAccessibility.voiceOverStatusDidChangeNotification,
                  object: nil, queue: .main) { [weak self] _ in self?.mandaAccessibilita() }
    c.addObserver(forName: UIContentSizeCategory.didChangeNotification,
                  object: nil, queue: .main) { [weak self] _ in self?.mandaAccessibilita() }
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

  // MARK: leggere quello che la fotocamera ha davanti

  /* LEGGERE I CARTELLI — 16/10/2026.
     Vince ha chiesto se servivano degli occhiali con la fotocamera. Per
     LEGGERE no: la fotocamera ce l'ha il telefono, e il riconoscimento del
     testo sta DENTRO iOS — Vision. Gratis, senza rete, senza chiavi di
     nessuno e senza che una fotografia di un citofono esca dal telefono.
     (Descrivere una SCENA è un'altra cosa e verrà dopo: quella vuole un
     modello che guarda l'immagine, e un server che tenga la chiave.)

     Qui si fa solo il mestiere del guscio: UNO scatto, il testo con la
     posizione di ogni riga, e si consegna alla pagina. Cosa dire di quelle
     righe — quale viene prima, quali sono rumore, quante dirne per volta —
     lo decide `nuova/parti/lettura.js`, dove è provato senza telefono.

     Nessuna anteprima sullo schermo: chi non vede non la guarderebbe, e chi
     vede punta il telefono come punta un dito. */

  private var macchina: AVCaptureSession?
  private var scatto: AVCapturePhotoOutput?
  private let codaFoto = DispatchQueue(label: "yourbea.fotocamera")
  private var staLeggendo = false
  private var chiestoAlle = Date()

  private func leggiQuelloCheVedo() {
    /* due scatti insieme non servono a niente e si rubano la fotocamera */
    if staLeggendo { NSLog("YOURBEA lettura: ne sto gia facendo una"); return }
    staLeggendo = true
    chiestoAlle = Date()
    scrivi("LEGGO: chiesto")

    let permesso = AVCaptureDevice.authorizationStatus(for: .video)
    if permesso == .notDetermined {
      /* il permesso si chiede QUANDO serve, non all'apertura: chiesto subito
         sembra una pretesa e la gente dice no. */
      AVCaptureDevice.requestAccess(for: .video) { [weak self] concesso in
        guard let self = self else { return }
        if concesso { self.codaFoto.async { self.preparaEScatta() } }
        else { self.rispondiLettura([], "niente-permesso") }
      }
      return
    }
    guard permesso == .authorized else { rispondiLettura([], "niente-permesso"); return }
    codaFoto.async { self.preparaEScatta() }
  }

  private func preparaEScatta() {
    if macchina == nil {
      let s = AVCaptureSession()
      /* NON si fa riconfigurare la sessione audio dalla fotocamera: lo fa
         da sé, e si porterebbe dietro la voce e le clip — l'app resterebbe
         muta per il tempo dello scatto, cioè proprio mentre deve leggere. */
      s.automaticallyConfiguresApplicationAudioSession = false
      s.beginConfiguration()
      s.sessionPreset = .photo
      guard let occhio = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
            let ingresso = try? AVCaptureDeviceInput(device: occhio),
            s.canAddInput(ingresso) else {
        s.commitConfiguration()
        rispondiLettura([], "niente-fotocamera"); return
      }
      s.addInput(ingresso)
      let fuori = AVCapturePhotoOutput()
      guard s.canAddOutput(fuori) else {
        s.commitConfiguration()
        rispondiLettura([], "niente-fotocamera"); return
      }
      s.addOutput(fuori)
      s.commitConfiguration()
      /* messa a fuoco continua e al centro: il telefono lo si punta, e
         quello che si vuole leggere sta in mezzo. */
      if (try? occhio.lockForConfiguration()) != nil {
        if occhio.isFocusPointOfInterestSupported { occhio.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5) }
        if occhio.isFocusModeSupported(.continuousAutoFocus) { occhio.focusMode = .continuousAutoFocus }
        if occhio.isExposurePointOfInterestSupported { occhio.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5) }
        if occhio.isExposureModeSupported(.continuousAutoExposure) { occhio.exposureMode = .continuousAutoExposure }
        occhio.unlockForConfiguration()
      }
      macchina = s; scatto = fuori
    }
    guard let s = macchina, let fuori = scatto else { rispondiLettura([], "niente-fotocamera"); return }
    if !s.isRunning { s.startRunning() }

    /* MEZZO SECONDO PRIMA DI SCATTARE. Appena accesa, la fotocamera è
       sfocata e scura: lo scatto immediato dava una foto da cui Vision non
       tira su niente, e la persona sentiva «non riesco a leggere niente»
       con il cartello sotto il naso. */
    codaFoto.asyncAfter(deadline: .now() + 0.55) { [weak self] in
      guard let self = self, self.staLeggendo else { return }
      /* il JPEG, non l'HEIF: è quello che si riapre dappertutto senza
         sorprese, e la foto non la salva nessuno — vive un secondo. */
      let impostazioni = fuori.availablePhotoCodecTypes.contains(.jpeg)
        ? AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
        : AVCapturePhotoSettings()
      /* al buio, senza luce non c'è niente da leggere, e chi non vede non
         può accorgersi che è buio: decide il telefono. */
      if fuori.supportedFlashModes.contains(.auto) { impostazioni.flashMode = .auto }
      fuori.capturePhoto(with: impostazioni, delegate: self)
    }
  }

  func photoOutput(_ uscita: AVCapturePhotoOutput, didFinishProcessingPhoto foto: AVCapturePhoto,
                   error: Error?) {
    codaFoto.async { [weak self] in
      guard let s = self?.macchina, s.isRunning else { return }
      /* la fotocamera si spegne appena ha scattato: resta accesa solo il
         tempo di una lettura — la spia verde, la batteria, e il rispetto. */
      s.stopRunning()
    }
    if let e = error {
      NSLog("YOURBEA scatto: %@", e.localizedDescription)
      rispondiLettura([], "non-riesco"); return
    }
    guard let dati = foto.fileDataRepresentation(),
          let immagine = UIImage(data: dati), let cg = immagine.cgImage else {
      rispondiLettura([], "non-riesco"); return
    }
    riconosci(cg, verso: versoCG(immagine.imageOrientation))
  }

  /* riconosci(): Vision, in italiano e in inglese — i cartelli di casa e i
     menu dei posti per turisti. `usesLanguageCorrection` è quello che fa la
     differenza fra «CORAZZIERI» e «C0RAZZlERl». */
  private func riconosci(_ cg: CGImage, verso: CGImagePropertyOrientation) {
    let richiesta = VNRecognizeTextRequest()
    richiesta.recognitionLevel = .accurate
    richiesta.recognitionLanguages = ["it-IT", "en-US"]
    richiesta.usesLanguageCorrection = true
    let lettore = VNImageRequestHandler(cgImage: cg, orientation: verso, options: [:])
    do { try lettore.perform([richiesta]) }
    catch {
      NSLog("YOURBEA vision: %@", error.localizedDescription)
      rispondiLettura([], "non-riesco"); return
    }
    let viste = (richiesta.results ?? [])
    var righe: [[String: Any]] = []
    for vista in viste {
      guard let testo = vista.topCandidates(1).first?.string, !testo.isEmpty else { continue }
      /* il riquadro di Vision è in frazioni dell'immagine con lo zero in
         BASSO a sinistra; la pagina ragiona con lo zero in ALTO, come si
         legge. Si gira qui, una volta sola. */
      let b = vista.boundingBox
      func tre(_ v: CGFloat) -> Double { return (v * 1000).rounded() / 1000 }
      righe.append(["t": testo, "x": tre(b.origin.x), "y": tre(1 - b.origin.y - b.height),
                    "w": tre(b.width), "h": tre(b.height)])
    }
    rispondiLettura(righe, nil)
  }

  private func versoCG(_ v: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch v {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }

  /* rispondiLettura(): il testo torna alla pagina, e QUELLO CHE HA LETTO E
     QUANTO CI HA MESSO restano scritti nel quaderno della camminata. Senza,
     «non legge» e «legge una cosa sbagliata» sarebbero la stessa riga, e si
     cercherebbe il difetto a indovinare. */
  private func rispondiLettura(_ righe: [[String: Any]], _ guaio: String?) {
    let quanto = Int(Date().timeIntervalSince(chiestoAlle) * 1000)
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.staLeggendo = false
      var json = "[]"
      if let d = try? JSONSerialization.data(withJSONObject: righe, options: []),
         let t = String(data: d, encoding: .utf8) { json = t }
      /* U+2028 e U+2029 stanno dentro un JSON e NON dentro il codice
         JavaScript: una riga di cartello con quel carattere romperebbe la
         chiamata, e la lettura finirebbe in silenzio. */
      json = json.replacingOccurrences(of: "\u{2028}", with: " ")
                 .replacingOccurrences(of: "\u{2029}", with: " ")
      let testi = righe.compactMap { $0["t"] as? String }
      if let g = guaio {
        self.scrivi("LETTO niente in \(quanto) ms — guaio: \(g)")
      } else {
        self.scrivi("LETTO \(righe.count) righe in \(quanto) ms: " + testi.joined(separator: " | "))
      }
      NSLog("YOURBEA letto: %d righe in %d ms", righe.count, quanto)
      let g = guaio == nil ? "null" : "\"\(guaio!)\""
      self.allaPagina("window.urbeaLetto && window.urbeaLetto(\(json), \(quanto), \(g))")
    }
  }

  // MARK: l'audio e il microfono

  private func preparaAudio() {
    /* playAndRecord con defaultToSpeaker: la voce esce dall'altoparlante
       anche quando il microfono è aperto, e continua a schermo spento. */
    let s = AVAudioSession.sharedInstance()
    try? s.setCategory(.playAndRecord, mode: .spokenAudio,
                       options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
    try? s.setActive(true)

    /* ============================================================
       SE QUALCUNO CI TOGLIE L'AUDIO, LO RIPRENDIAMO
       «Qualche volta pare sia uscita e ho dovuto riattivarla» (Vince,
       21/10): un'ora di silenzio nel quaderno, e poi un avvio nuovo.
       L'app usava 21 MB, quindi iOS non l'ha chiusa per fare spazio: l'ha
       SOSPESA. E una cosa che la fa sospendere c'è: basta una telefonata,
       una sveglia o un'altra app che prende l'altoparlante, e la sessione
       audio si disattiva. Da quel momento l'app, ferma in tasca, non fa
       piu' rumore e non riceve posizioni nuove — per iOS non sta facendo
       niente, e la mette a dormire.
       Qui si sta in ascolto delle interruzioni e, appena finiscono, si
       riaccende tutto. Per chi non vede e' la differenza fra un'app che
       lo accompagna e una che smette senza dirlo. */
    let c = NotificationCenter.default
    c.addObserver(forName: AVAudioSession.interruptionNotification,
                  object: s, queue: .main) { [weak self] n in
      guard let self = self,
            let info = n.userInfo,
            let grezzo = info[AVAudioSessionInterruptionTypeKey] as? UInt,
            let tipo = AVAudioSession.InterruptionType(rawValue: grezzo) else { return }
      if tipo == .began {
        self.scrivi("audio interrotto (telefonata, sveglia o altra app)")
        return
      }
      /* la stessa ragione di sopra: se la ripresa arriva a raffica e'
         il nostro microfono, non una telefonata finita. */
      let adesso = Date().timeIntervalSince1970
      if adesso - self.ultimaRiconferma < 1.0 { return }
      self.ultimaRiconferma = adesso
      self.scrivi("audio: interruzione finita, riprendo")
      try? AVAudioSession.sharedInstance().setActive(true)
      if self.vuoleAscoltare { self.apriMicrofono() }
    }
    /* e quando cambia l'uscita — cuffie infilate o sfilate, bluetooth che
       si scollega — la sessione va riconfermata, se no la voce finisce
       in un altoparlante che non c'e' piu'. */
    /* ============================================================
       SE LA RADIO PARLA, YOURBEA TACE
       «No, se la radio parla l'app sta in silenzio» (Vince, 21/10, dopo
       aver scoperto che alle 08:10 aveva aperto Radio 24 ed e' li' che
       l'app si e' addormentata).
       Scelta sua, e si rispetta: non ci si mette sopra. Ma NON tacere
       morendo — e' quello che succedeva. L'app resta viva, continua a
       seguire la strada, e appena la radio finisce riprende a parlare.
       La pagina lo sa, cosi' puo' anche dirlo se qualcuno chiede perche'
       e' muta. */
    c.addObserver(forName: AVAudioSession.silenceSecondaryAudioHintNotification,
                  object: s, queue: .main) { [weak self] n in
      guard let self = self else { return }
      let grezzo = (n.userInfo?[AVAudioSessionSilenceSecondaryAudioHintTypeKey] as? UInt) ?? 0
      let devoTacere = (grezzo == AVAudioSession.SilenceSecondaryAudioHintType.begin.rawValue)
      self.scrivi("altra app con l'audio: " + (devoTacere ? "taccio" : "posso riparlare"))
      self.allaPagina("window.YBaltraRadio && window.YBaltraRadio(\(devoTacere ? "true" : "false"))")
    }

    /* ============================================================
       NON RICONFERMARE LA SESSIONE A OGNI RESPIRO
       Dal quaderno del 21/10, Termini-casa: 171 interruzioni e 296
       riconferme in venti minuti, e la voce che si troncava dopo poche
       sillabe. La causa e' qui: si riattivava la sessione a OGNI cambio
       di uscita, e i cambi di uscita li facciamo noi — ogni volta che il
       microfono si apre o si chiude, l'audio passa da riproduzione a
       registrazione e torna indietro. Mentre l'app parlava, il microfono
       riapriva, la sessione si riattivava, e la frase moriva.
       Adesso si riconferma SOLO quando l'uscita e' cambiata davvero:
       cuffie infilate o sfilate, bluetooth che si attacca o si stacca.
       Tutto il resto — i cambi che facciamo noi — si lascia stare. */
    c.addObserver(forName: AVAudioSession.routeChangeNotification,
                  object: s, queue: .main) { [weak self] n in
      guard let self = self else { return }
      let grezzo = (n.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt) ?? 0
      let motivo = AVAudioSession.RouteChangeReason(rawValue: grezzo) ?? .unknown
      guard motivo == .oldDeviceUnavailable || motivo == .newDeviceAvailable else {
        return                      // l'abbiamo fatto noi: non si tocca niente
      }
      /* e nemmeno due volte di fila nello stesso secondo */
      let adesso = Date().timeIntervalSince1970
      if adesso - self.ultimaRiconferma < 1.0 { return }
      self.ultimaRiconferma = adesso
      try? AVAudioSession.sharedInstance().setActive(true)
      self.scrivi("audio: cuffie o bluetooth cambiati, sessione riconfermata")
    }
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
