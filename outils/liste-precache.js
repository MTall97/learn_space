/* Génère sw-fichiers.js : la liste de TOUS les fichiers du site que le service worker garde en cache
   (pages, styles, polices, icônes, scripts, toutes les cartes, tous les TP, toutes les simulations),
   et une empreinte de leur contenu. Quand un fichier change, l'empreinte change, donc sw-fichiers.js
   change : le navigateur installe la nouvelle version et propose « Recharger ».
   À relancer après chaque modification du site :  node outils/liste-precache.js
   (tests/pwa.test.js vérifie que la liste et l'empreinte sont à jour.) */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const RACINE = path.join(__dirname, "..");
// config-journal.js est rempli au déploiement : il est en cache, mais hors de l'empreinte (le service
// worker le relit d'abord sur le réseau).
const HORS_EMPREINTE = new Set(["assets/js/config-journal.js"]);

function parcourir(dossier) {
  return fs.readdirSync(path.join(RACINE, dossier), { withFileTypes: true }).flatMap(e => {
    const rel = dossier + "/" + e.name;
    return e.isDirectory() ? parcourir(rel) : /\.(js|css|woff2|svg|png|json)$/.test(e.name) ? [rel] : [];
  });
}
function liste() {
  const pages = fs.readdirSync(RACINE).filter(f => /\.html$/.test(f)).sort();
  return ["./"].concat(pages, ["manifest.webmanifest"], parcourir("assets").sort(), parcourir("contenu").sort());
}
function empreinte(fichiers) {
  const h = crypto.createHash("sha256");
  for (const f of fichiers) if (f !== "./" && !HORS_EMPREINTE.has(f)) { h.update(f + "\0"); h.update(fs.readFileSync(path.join(RACINE, f))); }
  h.update(fs.readFileSync(path.join(RACINE, "sw.js")));
  return h.digest("hex").slice(0, 12);
}
function contenu() {
  const fichiers = liste();
  return "/* Généré par outils/liste-precache.js : ne pas modifier à la main. */\n" +
    "self.LS_VERSION = " + JSON.stringify(empreinte(fichiers)) + ";\n" +
    "self.LS_FICHIERS = [\n" + fichiers.map(f => "  " + JSON.stringify(f)).join(",\n") + "\n];\n";
}
module.exports = { liste, empreinte, contenu, RACINE };
if (require.main === module) {
  fs.writeFileSync(path.join(RACINE, "sw-fichiers.js"), contenu());
  console.log("sw-fichiers.js : " + liste().length + " fichiers.");
}
