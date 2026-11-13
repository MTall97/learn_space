/* Interface : chaque TP trouve les scripts de sa simulation (tp.html ne charge que ceux-là). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const racine = path.join(__dirname, "..");
const tps = {};
global.window = global;
global.LS = Object.assign(global.LS || {}, { ajouterTP: t => { tps[t.id] = t; }, ajouterCarte: () => {} });
require(path.join(racine, "assets", "js", "tp.js"));
for (const f of fs.readdirSync(path.join(racine, "contenu", "tps"))) require(path.join(racine, "contenu", "tps", f));

test("chaque simulation de TP a ses scripts, et le dernier la définit", () => {
  const pb = [];
  for (const t of Object.values(tps)) {
    const liste = global.LS.FICHIERS_SIMS[t.sim];
    if (!liste) { pb.push(`${t.id} : aucune liste de scripts pour « ${t.sim} »`); continue; }
    liste.forEach(f => { if (!fs.existsSync(path.join(racine, "assets", "js", f + ".js"))) pb.push(`${t.id} : ${f}.js introuvable`); });
    if (t.sim === "circuit" || t.sim === "logique") continue;
    const src = fs.readFileSync(path.join(racine, "assets", "js", liste[liste.length - 1] + ".js"), "utf8");
    if (!new RegExp("LS\\.sims\\." + t.sim + " = function").test(src)) pb.push(`${t.id} : « ${t.sim} » n'est pas défini dans ${liste[liste.length - 1]}.js`);
  }
  assert.deepStrictEqual(pb, []);
});

/* Identité « cahier d'écolier » : pas de symboles Unicode décoratifs dans l'interface (les pictogrammes
   sont des SVG au trait de LS.icone), et les jetons que lisent les simulations existent toujours. */
test("interface : pas de symbole décoratif, jetons des simulations présents, ancienne carte électronique retirée", () => {
  const lire = f => fs.readFileSync(path.join(racine, f), "utf8");
  const sansCommentaires = t => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const pb = [];
  for (const f of ["index.html", "tp.html", "carte.html", "confidentialite.html", "hors-ligne.html", "assets/js/commun.js", "assets/js/tp.js", "assets/js/carte-mentale.js", "assets/js/jeu.js"]) {
    const m = sansCommentaires(lire(f)).match(/[✓✗✔✘★☆§•→←⚡]/g);
    if (m) pb.push(f + " : " + [...new Set(m)].join(" "));
  }
  // Simulations et contenu : pas de ⚠ ⚡ ✓ ✗ ● ★ (remplacés par du texte ou des tracés) ; dans le contenu, pas
  // de flèche → non plus. Les flèches de direction d'axe des simulations et les symboles techniques restent.
  const parcourir = d => fs.readdirSync(path.join(racine, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? parcourir(d + "/" + e.name) : e.name.endsWith(".js") ? [d + "/" + e.name] : []);
  for (const f of parcourir("assets/js/sims").concat(parcourir("assets/js/circuit"), parcourir("contenu"))) {
    const t = sansCommentaires(lire(f)).replace(/^.*\/\/.*$/gm, l => l.replace(/\/\/[^"']*$/, ""));
    const m = t.match(f.startsWith("contenu") ? /[⚠⚡✓✗✔✘●★☆→]/g : /[⚠⚡✓✗✔✘●★☆]/g);
    if (m) pb.push(f + " : " + [...new Set(m)].join(" "));
  }
  assert.deepStrictEqual(pb, []);
  const css = lire("assets/css/style.css");
  for (const j of ["--texte", "--texte-doux", "--fond", "--carte", "--accent", "--accent-fort", "--noeud", "--bordure", "--ok", "--alerte", "--info"])
    assert.ok(new RegExp("\\s" + j + ":").test(css), "jeton " + j);
  assert.ok(/prefers-color-scheme: dark/.test(css) && /data-theme="dark"/.test(css), "mode sombre");
  assert.ok(/body\[data-niveau="primaire"\] \.outil-avance/.test(css), "mode primaire");
  assert.ok(!/tracerPistes|carte-mere|pistes-cuivre/.test(lire("index.html")), "carte électronique retirée");
});
