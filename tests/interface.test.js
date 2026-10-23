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
