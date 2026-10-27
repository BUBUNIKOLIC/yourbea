/* IL SERVICE WORKER CHE SI SPEGNE DA SOLO — 15/10/2026
   ============================================================
   Qui c'era la cassaforte della vecchia Yourbea. L'app e' stata rifatta e
   vive in /yourbea/nuova/, ma chi aveva installato la vecchia ha ancora
   QUESTO worker nel telefono, e un worker installato serve i suoi file
   dalla propria cassaforte: avrebbe continuato a dare la vecchia app per
   sempre, qualunque cosa pubblichiamo. L'unico modo di liberarli e'
   pubblicare un worker che si disinstalla.

   Non si cancella e basta il file: un worker gia' installato resta a
   lavorare finche' il browser non scarica una versione NUOVA di questo
   stesso indirizzo. Per questo il file resta, e dentro c'e' questo. */

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try {
      /* le sue, non quelle della nuova app. `caches.keys()` elenca TUTTE
         le cassaforti del sito: buttando senza guardare il nome, un
         provatore che aveva la vecchia installata si ritrovava la nuova
         senza i suoi 186 file, e in mezzo a una strada senza rete la nuova
         non avrebbe avuto piu' niente da aprire. Le sue si chiamano
         `yourbea-vNNN`, quelle della nuova `yourbea-nuova-vN`. */
      var nomi = await caches.keys();
      var mie = nomi.filter(function (n) { return n.indexOf('nuova') < 0; });
      await Promise.all(mie.map(function (n) { return caches.delete(n); }));
    } catch (x) {}
    try { await self.registration.unregister(); } catch (x) {}
    try {
      var aperti = await self.clients.matchAll({ type: 'window' });
      aperti.forEach(function (c) { c.navigate(c.url); });
    } catch (x) {}
  })());
});

/* finche' e' vivo non si mette in mezzo: tutto va alla rete */
self.addEventListener('fetch', function () {});
