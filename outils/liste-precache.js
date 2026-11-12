/* Génère, à partir des fichiers du site :
   - sw-fichiers.js : la liste de TOUS les fichiers que le service worker garde en cache (pages, styles,
     polices, icônes, scripts, toutes les cartes, tous les TP, toutes les simulations) et une empreinte
     de leur contenu. Quand un fichier change, l'empreinte change, donc sw-fichiers.js change : le
     navigateur installe la nouvelle version et propose « Recharger ».
   - serveur/liste-blanche.json : les identifiants que le serveur du journal accepte (TP et leurs
     variantes de niveau, nombre d'objectifs et de questions, cartes, notions, pages). Tout autre
     identifiant est refusé : impossible de remplir les totaux avec des clés inventées.
   À relancer après chaque modification du site :  node outils/liste-precache.js
   (tests/pwa.test.js et tests/journal.test.js vérifient que les deux fichiers sont à jour.) */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
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
function pages() { return fs.readdirSync(RACINE).filter(f => /\.html$/.test(f)).sort(); }
function liste() {
  return ["./"].concat(pages(), ["manifest.webmanifest"], parcourir("assets").sort(), parcourir("contenu").sort());
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

// Liste blanche du journal : le contenu est chargé dans un bac à sable, comme le ferait la page.
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function listeBlanche() {
  const cartes = {}, tps = {};
  const bac = { LS: { ajouterCarte: c => { cartes[c.id] = c; }, ajouterTP: t => { tps[t.id] = t; } }, console };
  bac.window = bac;
  vm.createContext(bac);
  for (const d of ["cartes", "tps"])
    for (const f of fs.readdirSync(path.join(RACINE, "contenu", d)).sort()) vm.runInContext(fs.readFileSync(path.join(RACINE, "contenu", d, f), "utf8"), bac, { filename: f });
  const sortie = { tps: {}, cartes: {}, autres: pages().map(p => p.replace(/\.html$/, "")).filter(p => !["index", "tp", "carte"].includes(p)) };
  for (const id of Object.keys(tps).sort()) {
    const t = tps[id], elts = (t.objectifs || []).concat(t.questions || []);
    sortie.tps[id] = { o: (t.objectifs || []).length, q: (t.questions || []).length, variantes: elts.some(x => x.niv !== undefined) };
  }
  for (const id of Object.keys(cartes).sort()) {
    const l = [];
    (function p(n) { l.push(slug(n.t)); (n.c || []).forEach(p); })(cartes[id].racine);
    sortie.cartes[id] = l;
  }
  return JSON.stringify(sortie) + "\n";
}

module.exports = { liste, empreinte, contenu, listeBlanche, RACINE };
if (require.main === module) {
  fs.writeFileSync(path.join(RACINE, "sw-fichiers.js"), contenu());
  fs.writeFileSync(path.join(RACINE, "serveur", "liste-blanche.json"), listeBlanche());
  const lb = JSON.parse(listeBlanche());
  console.log("sw-fichiers.js : " + liste().length + " fichiers. serveur/liste-blanche.json : " + Object.keys(lb.tps).length + " TP, " + Object.keys(lb.cartes).length + " cartes.");
}
