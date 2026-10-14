/* Urbea — service worker: la città resta nel telefono */
const CACHE = 'yourbea-v31';

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
  './lingue/ar.json','./lingue/he.json'
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
