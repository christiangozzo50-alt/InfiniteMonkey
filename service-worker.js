// Scimmie infinite: salva il gioco sul dispositivo, così si apre anche senza connessione.
// Quando carichi una nuova versione dei file, cambia il numero qui sotto (v8, v9...).
const VERSIONE = "scimmie-infinite-v57";

self.addEventListener("install", evento => {
  evento.waitUntil(caches.open(VERSIONE).then(cache => cache.addAll(["./", "./index.html"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomi => Promise.all(nomi.filter(n => n !== VERSIONE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", evento => {
  const richiesta = evento.request;
  if (richiesta.method !== "GET") return;
  const url = new URL(richiesta.url);

  // i file del gioco (pagina e configurazione): prima dalla rete, senza rete dalla copia salvata
  if (url.origin === self.location.origin) {
    evento.respondWith(
      fetch(richiesta)
        .then(risposta => {
          if (risposta.ok) {
            const copia = risposta.clone();
            caches.open(VERSIONE).then(cache => cache.put(richiesta.mode === "navigate" ? "./index.html" : richiesta, copia));
          }
          return risposta;
        })
        .catch(() => caches.match(richiesta.mode === "navigate" ? "./index.html" : richiesta))
    );
    return;
  }

  // caratteri di Google e libreria della classifica: prima dalla copia salvata
  // (i dati della classifica invece passano sempre dalla rete)
  const daSalvare = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" ||
                    (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"));
  if (!daSalvare) return;
  evento.respondWith(
    caches.match(richiesta).then(salvato => salvato || fetch(richiesta).then(risposta => {
      if (risposta.ok || risposta.type === "opaque") {
        const copia = risposta.clone();
        caches.open(VERSIONE).then(cache => cache.put(richiesta, copia));
      }
      return risposta;
    }))
  );
});

// tocco su una notifica: riapre il gioco (o lo porta in primo piano se è già aperto)
self.addEventListener("notificationclick", evento => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(finestre => {
      for (const f of finestre) if ("focus" in f) return f.focus();
      return self.clients.openWindow("./");
    })
  );
});
