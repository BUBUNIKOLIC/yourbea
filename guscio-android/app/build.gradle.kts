plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

/* LA CHIAVE VERA, QUELLA DI OTTOBRE.
   L'apk del 14/10 e' firmato «CN=Urbea, OU=VDM, L=Torre del Greco»: la
   chiave sta in ~/.urbea-build/twa/urbea.keystore, alias «urbea», e la
   password nel file accanto. Serve quella e non un'altra: due apk firmati
   diverso NON si sostituiscono — Android rifiuta l'aggiornamento, e chi
   aveva quello di ottobre dovrebbe disinstallare prima.
   LA PASSWORD NON ENTRA NEL CODICE e non passa dalla riga di comando: si
   legge dal file dov'e' gia', al momento di firmare. Se il file non c'e',
   si firma di prova e lo si dice — non si fallisce in silenzio. */
val casa: String = System.getProperty("user.home")
val portachiavi = File("$casa/.urbea-build/twa/urbea.keystore")
val laPassword = File("$casa/.urbea-build/twa/.chiave-password.txt")
val chiaveVera = portachiavi.exists() && laPassword.exists()

android {
  namespace = "it.vdmdata.urbea"
  compileSdk = 35

  signingConfigs {
    if (chiaveVera) {
      create("urbea") {
        storeFile = portachiavi
        keyAlias = "urbea"
        val p = laPassword.readText().trim()
        storePassword = p
        keyPassword = p
      }
    }
  }

  defaultConfig {
    /* LO STESSO NOME DEL PACCHETTO DI OTTOBRE. Il .apk fatto il 14/10 con
       PWABuilder era it.vdmdata.urbea: cambiarlo vorrebbe dire una seconda
       app sul Play Store, e chi l'aveva installata non riceverebbe piu'
       niente. */
    applicationId = "it.vdmdata.urbea"
    minSdk = 26                 // Android 8: sotto, il WebView e' troppo vecchio
    targetSdk = 35
    /* IL NUMERO VA AVANTI, MAI INDIETRO. Avevo scritto 2 pensando che la
       TWA di ottobre fosse l'1: e' il SETTE (versionName 1.3.0). Android
       rifiuta di installare un numero piu' basso sopra uno piu' alto, e il
       Play Console rifiuta il caricamento. Quel 7 dice anche un'altra
       cosa: di build ce ne sono state parecchie, quindi un'inserzione sul
       Play Store potrebbe esserci gia'. */
    versionCode = 9
    versionName = "1.5.0"
  }

  buildTypes {
    release {
      isMinifyEnabled = false   // niente offuscamento: il guscio e' tutto qui
      /* LA CHIAVE VERA NON E' QUESTA. L'apk di ottobre e' firmato
         «CN=Urbea, OU=VDM, L=Torre del Greco»: una chiave che esiste
         davvero, e che sta dove l'ha messa PWABuilder. Due apk firmati
         diverso NON si sostituiscono: Android rifiuta, e chi ha quello di
         ottobre deve prima disinstallarlo.
         Per lo Store serve quella chiave (o il reset della chiave di
         caricamento, se il Play App Signing e' acceso) — e la password e'
         di Vince, non mia. Finche' non c'e', questo build resta firmato di
         prova: buono per provarlo su un telefono, non per vendere. */
      /* la vera se c'e', quella di prova se no — e il build lo dice */
      signingConfig = signingConfigs.findByName(if (chiaveVera) "urbea" else "debug")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = "17" }
}

tasks.register("diChiave") {
  doLast {
    println(if (chiaveVera) "FIRMA: la chiave vera di Urbea" else "FIRMA: di prova — il portachiavi non c'e'")
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.appcompat:appcompat:1.7.0")
  /* addDocumentStartJavaScript(): il rattoppo della voce DEVE essere in
     piedi prima che parta app.js, o la pagina trova speechSynthesis
     mancante e resta muta per sempre. Questo e' l'unico modo pulito. */
  implementation("androidx.webkit:webkit:1.12.1")
  /* I SOLDI. Il pass di sette giorni e' un prodotto a consumo, non un
     abbonamento: «e chi vuole rinnova» (Vince, 21/10). */
  implementation("com.android.billingclient:billing-ktx:7.1.1")
}
