// Scimmie infinite: salva il gioco sul dispositivo, così si apre anche senza connessione.
// Quando carichi una nuova versione di index.html, cambia il numero qui sotto (v2, v3...).
const VERSIONE = "scimmie-infinite-v5";

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
  // la pagina: prima dalla rete (sempre l'ultima versione), senza rete dalla copia salvata
  if (richiesta.mode === "navigate") {
    evento.respondWith(
      fetch(richiesta)
        .then(risposta => {
          const copia = risposta.clone();
          caches.open(VERSIONE).then(cache => cache.put("./index.html", copia));
          return risposta;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // il resto (i caratteri di Google): prima dalla copia salvata, poi dalla rete
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
