/* LA CASSAFORTE DELLA NUOVA YOURBEA — 15/10/2026
   ============================================================
   Serve a due cose, e a nient'altro:
   1. l'app si installa sul telefono («Aggiungi a Home») e si apre come
      un'app, senza barra del browser;
   2. si apre anche senza rete — in mezzo a una strada il telefono perde
      il segnale e l'app deve continuare a parlare.

   LA REGOLA CHE SI E' PAGATA CARA (15/10, due giorni persi): il numero di
   versione. Ogni file che la pagina chiama porta `?v=N`, e VERSIONE qui
   sotto e' lo STESSO numero: lo alza PUBBLICA.command a ogni pubblicazione,
   su index.html e su questo file insieme. Il nome della cassaforte contiene
   il numero, quindi a ogni pubblicazione nasce una cassaforte nuova, quella
   di prima si butta e la pagina si ricarica da se'. Senza questo si
   corregge un difetto, si pubblica, e il provatore continua a sentire
   quello di prima — convinto che non sia stato corretto niente.
   `nuova/prove/pagina.js` controlla che i due numeri coincidano.

   NON PESTARE I PIEDI ALLA VECCHIA APP: alla radice del sito c'e' un altro
   service worker, con le sue cassaforti chiamate `yourbea-vNNN`. Le nostre
   si chiamano `yourbea-nuova-vN` e nel fare pulizia ognuno butta soltanto
   quelle col suo prefisso: `caches.keys()` le elenca tutte, e chi butta
   senza guardare il prefisso svuota la cassaforte dell'altro. Lo scope e'
   diverso (`/yourbea/nuova/` contro `/yourbea/`) e per le pagine della
   nuova vince il piu' preciso, cioe' questo.                              */

const VERSIONE = 204;
const CASSAFORTE = 'yourbea-nuova-v' + VERSIONE;
const MIO_PREFISSO = 'yourbea-nuova-v';
const V = '?v=' + VERSIONE;

/* QUELLO CHE SERVE PER PARTIRE: se uno solo di questi manca, l'installazione
   deve fallire — meglio nessuna cassaforte che una mezza, che aprirebbe
   un'app rotta senza rete. */
const ESSENZIALI = [
  './',
  './index.html',
  './manifest.webmanifest',
  './stile.css' + V,
  './app.js' + V,
  './parti/faro.js' + V,
  './parti/percorsiMiei.js' + V,
  './parti/postiMiei.js' + V,
  './parti/contributi.js' + V,
  './parti/avanzamento.js' + V,
  './parti/fermate.js' + V,
  './parti/aChiServe.js' + V,
  './parti/paesaggio.js' + V,
  './parti/modi.js' + V,
  './parti/pronuncia.js' + V,
  './parti/lingua.js' + V,
  './dati/testi/it.json' + V,
  /* E LE ALTRE VENTI LINGUE, CHE QUI NON C’ERANO — 28/10/2026.
     Nella cassaforte stava solo l’italiano: chi scegliendo il tedesco
     uscisse dalla rete si ritrovava un’app che ascolta in tedesco e non
     ha una frase da dire. Pesano in tutto un paio di centinaia di
     chilobyte — i dati dei luoghi sono megabyte — e cosi la lingua si
     può cambiare anche in viaggio, senza campo.
     (Gli apostrofi qui sono quelli tipografici: la prova della pagina
     legge le righe fra apici semplici, e un commento con l’apostrofo
     diritto le finisce dentro.) */
  './dati/testi/ar.json' + V,
  './dati/testi/comandi-ar.json' + V,
  './dati/testi/cs.json' + V,
  './dati/testi/comandi-cs.json' + V,
  './dati/testi/da.json' + V,
  './dati/testi/comandi-da.json' + V,
  './dati/testi/de.json' + V,
  './dati/testi/comandi-de.json' + V,
  './dati/testi/el.json' + V,
  './dati/testi/comandi-el.json' + V,
  './dati/testi/en.json' + V,
  './dati/testi/comandi-en.json' + V,
  './dati/testi/es.json' + V,
  './dati/testi/comandi-es.json' + V,
  './dati/testi/fi.json' + V,
  './dati/testi/comandi-fi.json' + V,
  './dati/testi/fr.json' + V,
  './dati/testi/comandi-fr.json' + V,
  './dati/testi/hu.json' + V,
  './dati/testi/comandi-hu.json' + V,
  './dati/testi/ja.json' + V,
  './dati/testi/comandi-ja.json' + V,
  './dati/testi/ko.json' + V,
  './dati/testi/comandi-ko.json' + V,
  './dati/testi/nb.json' + V,
  './dati/testi/comandi-nb.json' + V,
  './dati/testi/nl.json' + V,
  './dati/testi/comandi-nl.json' + V,
  './dati/testi/pl.json' + V,
  './dati/testi/comandi-pl.json' + V,
  './dati/testi/pt.json' + V,
  './dati/testi/comandi-pt.json' + V,
  './dati/testi/ro.json' + V,
  './dati/testi/comandi-ro.json' + V,
  './dati/testi/ru.json' + V,
  './dati/testi/comandi-ru.json' + V,
  './dati/testi/sv.json' + V,
  './dati/testi/comandi-sv.json' + V,
  './dati/testi/zh.json' + V,
  './dati/testi/comandi-zh.json' + V,
  './parti/voce.js' + V,
  './parti/distanza.js' + V,
  './parti/descrizione.js' + V,
  './parti/racconto.js' + V,
  './parti/clip.js' + V,
  './parti/aggancio.js' + V,
  './parti/posizione.js' + V,
  './parti/intorno.js' + V,
  './parti/emergenza.js' + V,
  './parti/guida.js' + V,
  './parti/lettura.js' + V,
  './parti/passeggiata.js' + V,
  './parti/musica.js' + V,
  './parti/pulizia.js' + V,
  './parti/dettatura.js' + V,
  './parti/negozi.js' + V,
  './parti/passaggi.js' + V,
  './parti/incroci.js' + V,
  './parti/scena.js' + V,
  './parti/mappa.js' + V,
  './mappa/leaflet.css' + V,
  './mappa/leaflet.js' + V,
  './dati/luoghi.json' + V,
  './dati/passeggiate.json' + V,
  '../icons/icon-192.png',
  '../icons/icon-512.png',
  '../icons/icon-maskable.png',
  '../icons/icon-180.png'
];

/* IL CONTORNO: utile, ma se manca l'app parla comunque. I puntini della
   mappa e le 161 clip delle frasi fisse — «sulla destra», «a 80 metri»,
   «Cosa vedere:» — 2 MB in tutto. I nomi dei luoghi (4.026 clip, 243 MB)
   NON stanno qui: si scaricano quando servono e restano nella cassaforte
   da se'. Le frasi fisse invece devono esserci dalla prima apertura: senza,
   a parlare sarebbe il sintetizzatore del telefono, una voce diversa da
   quella delle clip, e si sentirebbero due voci nella stessa frase. */
/* E i tre tappeti della musica, 1,6 MB: stanno nel contorno e non fra gli
   essenziali perché l'app senza musica funziona benissimo, e chi naviga a
   dati non deve pagarseli per forza alla prima apertura. */
const CONTORNO = [
  './musica/cammino.m4a' + V,
  './musica/chiostro.m4a' + V,
  './musica/notturno.m4a' + V,
  './mappa/images/marker-icon.png',
  './mappa/images/marker-icon-2x.png',
  './mappa/images/marker-shadow.png',
  './mappa/images/layers.png',
  './mappa/images/layers-2x.png',
  '../voce/clip/it/card-a-est.m4a','../voce/clip/it/card-a-nord-est.m4a','../voce/clip/it/card-a-nord-ovest.m4a','../voce/clip/it/card-a-nord.m4a','../voce/clip/it/card-a-ovest.m4a','../voce/clip/it/card-a-sud-est.m4a',
  '../voce/clip/it/card-a-sud-ovest.m4a','../voce/clip/it/card-a-sud.m4a','../voce/clip/it/dir-alle-tue-spalle.m4a','../voce/clip/it/dir-dritto-davanti.m4a','../voce/clip/it/dir-indietro-a-destra.m4a','../voce/clip/it/dir-indietro-a-sinistra.m4a',
  '../voce/clip/it/dir-proprio-a-destra.m4a','../voce/clip/it/dir-proprio-a-sinistra.m4a','../voce/clip/it/dir-sulla-destra.m4a','../voce/clip/it/dir-sulla-sinistra.m4a','../voce/clip/it/frase-aiuto.m4a','../voce/clip/it/frase-apertura.m4a',
  '../voce/clip/it/frase-apro-auto.m4a','../voce/clip/it/frase-apro-taxi.m4a','../voce/clip/it/frase-avanti.m4a','../voce/clip/it/frase-bentornato.m4a','../voce/clip/it/frase-casa-non-segnata.m4a','../voce/clip/it/frase-casa-segnata.m4a',
  '../voce/clip/it/frase-casa-senza-posizione.m4a','../voce/clip/it/frase-cerco.m4a','../voce/clip/it/frase-chi-chiamare.m4a','../voce/clip/it/frase-chiamo-112.m4a','../voce/clip/it/frase-chiamo.m4a','../voce/clip/it/frase-chiedi.m4a',
  '../voce/clip/it/frase-ci-siamo.m4a','../voce/clip/it/frase-come-cammini.m4a','../voce/clip/it/frase-comincia-a.m4a','../voce/clip/it/frase-contatto-salvato.m4a','../voce/clip/it/frase-cosa-vedere.m4a','../voce/clip/it/frase-da-qui-passa.m4a',
  '../voce/clip/it/frase-derubato.m4a','../voce/clip/it/frase-e-lontano.m4a','../voce/clip/it/frase-indirizzo-non-trovato.m4a','../voce/clip/it/frase-lascio-perdere.m4a','../voce/clip/it/frase-lungo.m4a','../voce/clip/it/frase-manca-numero.m4a',
  '../voce/clip/it/frase-nessun-numero.m4a','../voce/clip/it/frase-niente-di-questi.m4a','../voce/clip/it/frase-niente-intorno.m4a','../voce/clip/it/frase-niente-microfono.m4a','../voce/clip/it/frase-niente-partenza.m4a','../voce/clip/it/frase-non-capito.m4a',
  '../voce/clip/it/frase-non-coperta.m4a','../voce/clip/it/frase-parto-libero.m4a','../voce/clip/it/frase-percorsi-vicini.m4a','../voce/clip/it/frase-scegli-percorso.m4a','../voce/clip/it/frase-scelte-aiuto.m4a','../voce/clip/it/frase-sei-arrivato.m4a',
  '../voce/clip/it/frase-solo-cultura.m4a','../voce/clip/it/frase-testo-grande.m4a','../voce/clip/it/frase-ti-porto-a.m4a','../voce/clip/it/frase-tutto-detto.m4a','../voce/clip/it/frase-tutto.m4a','../voce/clip/it/frase-vengo-a-prenderti.m4a',
  '../voce/clip/it/frase-voce-attiva.m4a','../voce/clip/it/m-10.m4a','../voce/clip/it/m-100.m4a','../voce/clip/it/m-110.m4a','../voce/clip/it/m-120.m4a','../voce/clip/it/m-130.m4a',
  '../voce/clip/it/m-140.m4a','../voce/clip/it/m-150.m4a','../voce/clip/it/m-160.m4a','../voce/clip/it/m-170.m4a','../voce/clip/it/m-180.m4a','../voce/clip/it/m-190.m4a',
  '../voce/clip/it/m-20.m4a','../voce/clip/it/m-200.m4a','../voce/clip/it/m-210.m4a','../voce/clip/it/m-220.m4a','../voce/clip/it/m-230.m4a','../voce/clip/it/m-240.m4a',
  '../voce/clip/it/m-250.m4a','../voce/clip/it/m-260.m4a','../voce/clip/it/m-270.m4a','../voce/clip/it/m-280.m4a','../voce/clip/it/m-290.m4a','../voce/clip/it/m-30.m4a',
  '../voce/clip/it/m-300.m4a','../voce/clip/it/m-310.m4a','../voce/clip/it/m-320.m4a','../voce/clip/it/m-330.m4a','../voce/clip/it/m-340.m4a','../voce/clip/it/m-350.m4a',
  '../voce/clip/it/m-360.m4a','../voce/clip/it/m-370.m4a','../voce/clip/it/m-380.m4a','../voce/clip/it/m-390.m4a','../voce/clip/it/m-40.m4a','../voce/clip/it/m-400.m4a',
  '../voce/clip/it/m-410.m4a','../voce/clip/it/m-420.m4a','../voce/clip/it/m-430.m4a','../voce/clip/it/m-440.m4a','../voce/clip/it/m-450.m4a','../voce/clip/it/m-460.m4a',
  '../voce/clip/it/m-470.m4a','../voce/clip/it/m-480.m4a','../voce/clip/it/m-490.m4a','../voce/clip/it/m-50.m4a','../voce/clip/it/m-500.m4a','../voce/clip/it/m-510.m4a',
  '../voce/clip/it/m-520.m4a','../voce/clip/it/m-530.m4a','../voce/clip/it/m-540.m4a','../voce/clip/it/m-550.m4a','../voce/clip/it/m-560.m4a','../voce/clip/it/m-570.m4a',
  '../voce/clip/it/m-580.m4a','../voce/clip/it/m-590.m4a','../voce/clip/it/m-60.m4a','../voce/clip/it/m-600.m4a','../voce/clip/it/m-610.m4a','../voce/clip/it/m-620.m4a',
  '../voce/clip/it/m-630.m4a','../voce/clip/it/m-640.m4a','../voce/clip/it/m-650.m4a','../voce/clip/it/m-660.m4a','../voce/clip/it/m-670.m4a','../voce/clip/it/m-680.m4a',
  '../voce/clip/it/m-690.m4a','../voce/clip/it/m-70.m4a','../voce/clip/it/m-700.m4a','../voce/clip/it/m-710.m4a','../voce/clip/it/m-720.m4a','../voce/clip/it/m-730.m4a',
  '../voce/clip/it/m-740.m4a','../voce/clip/it/m-750.m4a','../voce/clip/it/m-760.m4a','../voce/clip/it/m-770.m4a','../voce/clip/it/m-780.m4a','../voce/clip/it/m-790.m4a',
  '../voce/clip/it/m-80.m4a','../voce/clip/it/m-800.m4a','../voce/clip/it/m-810.m4a','../voce/clip/it/m-820.m4a','../voce/clip/it/m-830.m4a','../voce/clip/it/m-840.m4a',
  '../voce/clip/it/m-850.m4a','../voce/clip/it/m-860.m4a','../voce/clip/it/m-870.m4a','../voce/clip/it/m-880.m4a','../voce/clip/it/m-890.m4a','../voce/clip/it/m-90.m4a',
  '../voce/clip/it/m-900.m4a','../voce/clip/it/m-910.m4a','../voce/clip/it/m-920.m4a','../voce/clip/it/m-930.m4a','../voce/clip/it/m-940.m4a','../voce/clip/it/m-950.m4a',
  '../voce/clip/it/m-960.m4a','../voce/clip/it/m-970.m4a','../voce/clip/it/m-980.m4a','../voce/clip/it/m-990.m4a','../voce/clip/it/m-passi.m4a'
];

/* ---------- l'installazione ---------- */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CASSAFORTE).then((c) =>
      /* gli essenziali tutti insieme: se uno manca, addAll fallisce e
         l'installazione non va a buon fine. E' voluto. */
      c.addAll(ESSENZIALI).then(() =>
        /* il contorno uno per uno: una clip che manca non deve far cadere
           tutto il resto. */
        Promise.all(CONTORNO.map((u) => c.add(u).catch(() => {})))
      )
    ).then(() => self.skipWaiting())
  );
});

/* ---------- il cambio di versione ---------- */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      /* SOLO le mie: quelle della vecchia app alla radice si chiamano
         `yourbea-vNNN` e non si toccano. */
      .then((nomi) => Promise.all(
        nomi.filter((n) => n.startsWith(MIO_PREFISSO) && n !== CASSAFORTE)
            .map((n) => caches.delete(n))
      ))
      /* claim(): prende in mano le pagine già aperte senza aspettare che le
         si chiuda. E' quello che fa scattare il ricaricamento dalla parte
         della pagina (controllerchange in index.html): è così che la
         correzione arriva al provatore nello stesso momento in cui si
         pubblica, invece che quando gli viene in mente di riavviare. */
      .then(() => self.clients.claim())
  );
});

/* la pagina può chiedere di passare subito alla versione nuova */
self.addEventListener('message', (e) => {
  if (e.data && e.data.azione === 'subito') self.skipWaiting();
});

/* ---------- le richieste ---------- */
const QUADRETTI = 'yourbea-quadretti';
const QUANTI_QUADRETTI = 250;        // una ventina di megabyte

async function quadretto(richiesta) {
  const c = await caches.open(QUADRETTI);
  const trovato = await c.match(richiesta);
  if (trovato) {
    /* rimetterlo in fondo alla fila è il modo di dire «questo serve
       ancora»: la Cache API restituisce le chiavi nell'ordine in cui sono
       state scritte, e noi buttiamo dalla testa. */
    c.put(richiesta, trovato.clone()).catch(() => {});
    return trovato;
  }
  try {
    const r = await fetch(richiesta);
    if (r && r.ok) {
      await c.put(richiesta, r.clone());
      const chiavi = await c.keys();
      if (chiavi.length > QUANTI_QUADRETTI) {
        for (const vecchia of chiavi.slice(0, chiavi.length - QUANTI_QUADRETTI)) {
          c.delete(vecchia).catch(() => {});
        }
      }
    }
    return r;
  } catch (x) {
    /* senza rete e senza copia: un quadretto che non c'è vuol dire che lì
       l'app dirà solo quello che sa dalla mappa viva. Non è un guasto. */
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  /* le fonti di fuori — OpenStreetMap, Wikipedia, Valhalla, le mattonelle
     della mappa — non si toccano: sono risposte che cambiano a ogni passo e
     tenerle sarebbe peggio che non averle. Non chiamando respondWith, la
     richiesta va in rete come se noi non ci fossimo. */
  if (new URL(e.request.url).origin !== self.location.origin) return;

  /* LA PAGINA: prima la rete. index.html non porta `?v=`, quindi se la
     prendessimo dalla cassaforte il provatore non vedrebbe mai una versione
     nuova. Senza rete, quella salvata. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copia = r.clone();
        caches.open(CASSAFORTE).then((c) => c.put(e.request, copia)).catch(() => {});
        return r;
      }).catch(() => caches.match('./index.html').then((h) => h || caches.match('./')))
    );
    return;
  }

  /* I QUADRETTI DEI NEGOZI E DEI MONUMENTI: si tengono, ma con un tetto.
     «Un 20 mega magari si possono tenere… quelli importanti» (Vince,
     16/10). Sono 60 MB in tutto e non stanno in un telefono; ma le strade
     che uno fa tornano sempre, quindi quelli già camminati valgono oro
     quando la rete non c'è. Si tengono in una cassaforte a parte, con un
     tetto di 250 quadretti — una ventina di mega — e quando è piena si
     butta il PIÙ VECCHIO DI USO, non il più vecchio di scaricamento:
     ogni volta che un quadretto serve torna in fondo alla fila, così
     quelli di casa e del giro di tutti i giorni non se ne vanno mai. */
  if (/\/dati\/(negozi|cultura)\//.test(e.request.url)) {
    e.respondWith(quadretto(e.request));
    return;
  }

  /* TUTTO IL RESTO: prima la cassaforte. Si può, perché ogni file porta il
     suo `?v=`: a versione nuova l'indirizzo è nuovo, la cassaforte non lo ha
     e si va in rete da sé. Quello che arriva dalla rete si tiene — è così
     che i nomi dei luoghi (le 4.026 clip che non stanno in installazione)
     restano nel telefono dopo essere stati sentiti una volta. */
  e.respondWith(
    caches.match(e.request).then((trovato) => {
      if (trovato) return trovato;
      return fetch(e.request).then((r) => {
        /* una risposta andata male non si mette in cassaforte, altrimenti
           un errore di passaggio resta lì per sempre */
        if (r && r.ok) {
          const copia = r.clone();
          caches.open(CASSAFORTE).then((c) => c.put(e.request, copia)).catch(() => {});
        }
        return r;
      }).catch(() => {
        /* senza rete e senza copia: una clip che non c'è la voce la sa
           gestire (passa al sintetizzatore), quindi si risponde con un
           guasto onesto e non con la pagina al posto dell'audio. */
        return new Response('', { status: 504, statusText: 'niente rete' });
      });
    })
  );
});
