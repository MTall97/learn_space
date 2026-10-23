/* Hors ligne : chaque fichier du site est gardé en cache dès sa première visite (le site marche ensuite
   sans réseau, utile pendant un délestage ou sans forfait). Les pages principales sont mises en cache à
   l'installation. Actif seulement quand le site est servi en http(s), pas en ouvrant les fichiers. */
const CACHE = "learnspace-v2";
const DE_BASE = ["./", "index.html", "tp.html", "carte.html", "assets/css/style.css", "assets/css/carte.css", "assets/css/circuit.css",
  "assets/js/commun.js", "assets/js/progression.js", "assets/js/jeu.js", "assets/js/tp.js", "assets/js/carte-mentale.js", "contenu/parcours.js", "assets/js/niveaux.js",
  "assets/fonts/atkinson-400.woff2", "assets/fonts/atkinson-700.woff2", "assets/fonts/baloo2.woff2", "assets/fonts/jetbrains-mono.woff2"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(DE_BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord (pour avoir les mises à jour), cache si le réseau ne répond pas.
self.addEventListener("fetch", ev => {
  if (ev.request.method !== "GET" || new URL(ev.request.url).origin !== location.origin) return;
  ev.respondWith(fetch(ev.request).then(rep => {
    if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(ev.request, copie)); }
    return rep;
  }).catch(() => caches.match(ev.request, { ignoreSearch: ev.request.mode === "navigate" })));
});
