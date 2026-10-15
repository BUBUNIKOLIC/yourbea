/* Urbea — service worker: la città resta nel telefono */
const CACHE = 'yourbea-v96';

// la pagina può chiedere di passare subito alla versione nuova
self.addEventListener('message', e => {
  if (e.data && e.data.azione === 'subito') self.skipWaiting();
});
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './voce/silenzio.m4a',
  './mappa/leaflet.js',
  './mappa/leaflet.css',
  './mappa/images/marker-icon.png',
  './mappa/images/marker-shadow.png',
  './luoghi/campania.json',
  './luoghi/molise.json',
  './lingue/en.json','./lingue/de.json','./lingue/fr.json','./lingue/es.json',
  './lingue/nl.json','./lingue/pt.json','./lingue/pl.json','./lingue/zh.json',
  './lingue/ja.json','./lingue/ru.json','./lingue/sv.json','./lingue/ko.json',
  './lingue/ar.json','./lingue/he.json',
  /* Le frasi fisse stanno qui dentro, non nello scaricamento in sottofondo:
     all'apertura la clip non era ancora arrivata e a parlare era la voce di
     sistema del telefono — una voce diversa da Alice, che partiva sopra la
     clip vera appena questa si scaricava. Due voci insieme, e poi silenzio.
     Sono 126 file per 1.3 MB: ci stanno nell'installazione. */
  './voce/clip/it/frase-aiuto.m4a','./voce/clip/it/frase-apertura.m4a','./voce/clip/it/frase-apro-auto.m4a','./voce/clip/it/frase-apro-taxi.m4a','./voce/clip/it/frase-avanti.m4a','./voce/clip/it/frase-bentornato.m4a',
  './voce/clip/it/frase-casa-non-segnata.m4a','./voce/clip/it/frase-casa-segnata.m4a','./voce/clip/it/frase-casa-senza-posizione.m4a','./voce/clip/it/frase-cerco.m4a','./voce/clip/it/frase-chiamo-112.m4a','./voce/clip/it/frase-chiamo.m4a',
  './voce/clip/it/frase-chiedi.m4a','./voce/clip/it/frase-ci-siamo.m4a','./voce/clip/it/frase-come-cammini.m4a','./voce/clip/it/frase-comincia-a.m4a','./voce/clip/it/frase-cosa-vedere.m4a','./voce/clip/it/frase-da-qui-passa.m4a',
  './voce/clip/it/frase-derubato.m4a','./voce/clip/it/frase-e-lontano.m4a','./voce/clip/it/frase-indirizzo-non-trovato.m4a','./voce/clip/it/frase-lascio-perdere.m4a','./voce/clip/it/frase-lungo.m4a','./voce/clip/it/frase-nessun-numero.m4a',
  './voce/clip/it/frase-niente-di-questi.m4a','./voce/clip/it/frase-niente-intorno.m4a','./voce/clip/it/frase-niente-microfono.m4a','./voce/clip/it/frase-niente-partenza.m4a','./voce/clip/it/frase-non-capito.m4a','./voce/clip/it/frase-non-coperta.m4a',
  './voce/clip/it/frase-parto-libero.m4a','./voce/clip/it/frase-percorsi-vicini.m4a','./voce/clip/it/frase-scelte-aiuto.m4a','./voce/clip/it/frase-sei-arrivato.m4a','./voce/clip/it/frase-solo-cultura.m4a','./voce/clip/it/frase-testo-grande.m4a',
  './voce/clip/it/frase-ti-porto-a.m4a','./voce/clip/it/frase-tutto-detto.m4a','./voce/clip/it/frase-tutto.m4a','./voce/clip/it/frase-vengo-a-prenderti.m4a','./voce/clip/it/frase-voce-attiva.m4a','./voce/clip/it/dir-alle-tue-spalle.m4a',
  './voce/clip/it/dir-dritto-davanti.m4a','./voce/clip/it/dir-indietro-a-destra.m4a','./voce/clip/it/dir-indietro-a-sinistra.m4a','./voce/clip/it/dir-proprio-a-destra.m4a','./voce/clip/it/dir-proprio-a-sinistra.m4a','./voce/clip/it/dir-sulla-destra.m4a',
  './voce/clip/it/dir-sulla-sinistra.m4a','./voce/clip/it/m-10.m4a','./voce/clip/it/m-100.m4a','./voce/clip/it/m-110.m4a','./voce/clip/it/m-120.m4a','./voce/clip/it/m-130.m4a',
  './voce/clip/it/m-140.m4a','./voce/clip/it/m-150.m4a','./voce/clip/it/m-160.m4a','./voce/clip/it/m-170.m4a','./voce/clip/it/m-180.m4a','./voce/clip/it/m-190.m4a',
  './voce/clip/it/m-20.m4a','./voce/clip/it/m-200.m4a','./voce/clip/it/m-210.m4a','./voce/clip/it/m-220.m4a','./voce/clip/it/m-230.m4a','./voce/clip/it/m-240.m4a',
  './voce/clip/it/m-250.m4a','./voce/clip/it/m-260.m4a','./voce/clip/it/m-270.m4a','./voce/clip/it/m-280.m4a','./voce/clip/it/m-290.m4a','./voce/clip/it/m-30.m4a',
  './voce/clip/it/m-300.m4a','./voce/clip/it/m-310.m4a','./voce/clip/it/m-320.m4a','./voce/clip/it/m-330.m4a','./voce/clip/it/m-340.m4a','./voce/clip/it/m-350.m4a',
  './voce/clip/it/m-360.m4a','./voce/clip/it/m-370.m4a','./voce/clip/it/m-380.m4a','./voce/clip/it/m-390.m4a','./voce/clip/it/m-40.m4a','./voce/clip/it/m-400.m4a',
  './voce/clip/it/m-410.m4a','./voce/clip/it/m-420.m4a','./voce/clip/it/m-430.m4a','./voce/clip/it/m-440.m4a','./voce/clip/it/m-450.m4a','./voce/clip/it/m-460.m4a',
  './voce/clip/it/m-470.m4a','./voce/clip/it/m-480.m4a','./voce/clip/it/m-490.m4a','./voce/clip/it/m-50.m4a','./voce/clip/it/m-500.m4a','./voce/clip/it/m-60.m4a',
  './voce/clip/it/m-70.m4a','./voce/clip/it/m-80.m4a','./voce/clip/it/m-90.m4a','./voce/clip/it/m-passi.m4a','./voce/clip/it/dl-100.m4a','./voce/clip/it/dl-1000.m4a',
  './voce/clip/it/dl-1500.m4a','./voce/clip/it/dl-200.m4a','./voce/clip/it/dl-2000.m4a','./voce/clip/it/dl-2500.m4a','./voce/clip/it/dl-300.m4a','./voce/clip/it/dl-3000.m4a',
  './voce/clip/it/dl-3500.m4a','./voce/clip/it/dl-400.m4a','./voce/clip/it/dl-4000.m4a','./voce/clip/it/dl-4500.m4a','./voce/clip/it/dl-500.m4a','./voce/clip/it/dl-5000.m4a',
  './voce/clip/it/dl-600.m4a','./voce/clip/it/dl-700.m4a','./voce/clip/it/dl-800.m4a','./voce/clip/it/dl-900.m4a','./voce/clip/it/card-a-est.m4a','./voce/clip/it/card-a-nord-est.m4a',
  './voce/clip/it/card-a-nord-ovest.m4a','./voce/clip/it/card-a-nord.m4a','./voce/clip/it/card-a-ovest.m4a','./voce/clip/it/card-a-sud-est.m4a','./voce/clip/it/card-a-sud-ovest.m4a','./voce/clip/it/card-a-sud.m4a',
  './voce/clip/it/frase-chi-chiamare.m4a','./voce/clip/it/frase-manca-numero.m4a','./voce/clip/it/frase-contatto-salvato.m4a'
];

// la voce incisa: si scarica in sottofondo, senza far aspettare l'avvio
function scaricaVoce() {
  return fetch('./voce/clip/it/elenco.json')
    .then(r => r.ok ? r.json() : [])
    .then(ids => caches.open(CACHE).then(c => {
      // prima le frasi di servizio: direzioni, metri, risposte. Sono poche e
      // servono sempre. Le schede dei luoghi si salvano quando si ascoltano,
      // se no il telefono scaricherebbe decine di megabyte per niente.
      const prima = ids.filter(id => !id.startsWith('poi-'));
      const dopo  = ids.filter(id =>  id.startsWith('poi-'));
      const coda  = prima.concat(dopo);
      const soloServizio = prima.length;
      let i = 0;
      const giu = () => {
        if (i >= soloServizio) return;            // il resto arriva all'uso
        const u = './voce/clip/it/' + coda[i++] + '.m4a';
        return c.match(u).then(hit => hit ? null : c.add(u)).catch(() => {}).then(giu);
      };
      return giu();
    }))
    .catch(() => {});
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
  scaricaVoce();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // la pagina: prima la rete, così le correzioni arrivano subito;
  // se la rete non c'è, quella salvata (la guida deve funzionare offline)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
