/* Copie dans _site/ les seuls fichiers publics du site (ceux de la liste de précache, plus le
   service worker), pour un hébergeur statique comme Cloudflare Pages : ni serveur/, ni docs/, ni
   tests/. Aucune dépendance. Usage : node outils/site-public.js [dossier] */
"use strict";
const fs = require("fs");
const path = require("path");

const racine = path.join(__dirname, "..");
const sortie = path.resolve(racine, process.argv[2] || "_site");
const self = {};
new Function("self", fs.readFileSync(path.join(racine, "sw-fichiers.js"), "utf8"))(self);

const fichiers = self.LS_FICHIERS.filter(f => f !== "./").concat(["sw.js", "sw-fichiers.js"]);
fs.rmSync(sortie, { recursive: true, force: true });
for (const f of fichiers) {
  const dest = path.join(sortie, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(racine, f), dest);
}
// En-têtes (Cloudflare Pages, Netlify) : le service worker et la configuration du journal sont
// toujours revérifiés, pour que les mises à jour arrivent.
fs.writeFileSync(path.join(sortie, "_headers"), [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: same-origin",
  "/sw.js",
  "  Cache-Control: no-cache",
  "/sw-fichiers.js",
  "  Cache-Control: no-cache",
  "/assets/js/config-journal.js",
  "  Cache-Control: no-cache",
  ""
].join("\n"));
console.log(fichiers.length + " fichiers copiés dans " + path.relative(racine, sortie) + "/");
