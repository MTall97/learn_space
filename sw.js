/* Service worker : tout le site marche hors ligne après la première visite (délestage, pas de forfait).
   - À l'installation, TOUS les fichiers du site sont mis en cache (liste générée dans sw-fichiers.js
     par outils/liste-precache.js, avec une empreinte du contenu : un fichier modifié donne une
     nouvelle version, donc un nouveau cache).
   - Les fichiers du site sont servis depuis le cache (rapide sur un réseau faible) ; la nouvelle
     version s'installe en arrière-plan et la page propose « Recharger » (assets/js/pwa.js).
   - config-journal.js, rempli au déploiement, est relu d'abord sur le réseau.
   - Jamais de cache pour le journal et le tableau de bord (/api, /admin, /journal), ni pour les autres sites.
   - Une page absente du cache, sans réseau : hors-ligne.html.
   Actif seulement quand le site est servi en http(s), pas en ouvrant les fichiers. */
importScripts("sw-fichiers.js");
const CACHE = "learnspace-v4-" + self.LS_VERSION;
const RESEAU_D_ABORD = /\/assets\/js\/config-journal\.js$/;

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(self.LS_FICHIERS.map(f => new Request(f, { cache: "reload" })))));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k.startsWith("learnspace-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// « Recharger » dans la page : la nouvelle version prend la main.
self.addEventListener("message", ev => { if (ev.data && ev.data.type === "activer") self.skipWaiting(); });

self.addEventListener("fetch", ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (/\/(api|admin|journal)(\/|$)/.test(url.pathname)) return;
  if (RESEAU_D_ABORD.test(url.pathname)) {
    ev.respondWith(fetch(req).then(rep => { if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); } return rep; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Pages : tp.html?id=… et carte.html?id=… sont la même page en cache.
  const navigation = req.mode === "navigate";
  ev.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: navigation })).then(trouve => trouve || fetch(req).then(rep => {
    if (rep.ok && rep.type === "basic") { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
    return rep;
  }).catch(() => navigation ? caches.open(CACHE).then(c => c.match("hors-ligne.html")) : Response.error())));
});
