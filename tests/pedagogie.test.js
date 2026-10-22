/* Objectifs à réponse saisie : les valeurs attendues des TP sont recalculées avec les modèles des
   simulations. Lancer : node --test tests/*.test.js */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const racine = path.join(__dirname, "..");
global.window = global;
const tps = {};
global.LS = { sims: {}, ajouterTP: t => { tps[t.id] = t; } };
require(path.join(racine, "assets", "js", "tp.js"));
require(path.join(racine, "assets", "js", "sims", "telecom.js"));
for (const f of fs.readdirSync(path.join(racine, "contenu", "tps"))) require(path.join(racine, "contenu", "tps", f));
const LS = global.LS;
const ok = (o, v, sim) => LS.controlerReponse(o, v, sim || {}).ok;
const valeur = o => typeof o.reponse.valeur === "function" ? o.reponse.valeur({}) : o.reponse.valeur;

test("lecture des nombres saisis (virgule, espaces, unité, préfixe)", () => {
  assert.strictEqual(LS.lireNombre("1 022"), 1022);
  assert.strictEqual(LS.lireNombre("94,5 %"), 94.5);
  assert.strictEqual(LS.lireNombre("1e3"), 1000);
  assert.ok(isNaN(LS.lireNombre("beaucoup")));
  assert.strictEqual(LS.normaliserReponse(" Fréquence  Haute "), "frequencehaute");
});

test("chaque objectif à réponse accepte sa valeur et refuse une valeur voisine fausse", () => {
  const pb = [];
  for (const t of Object.values(tps)) (t.objectifs || []).forEach((o, i) => {
    if (!o.reponse) return;
    const v = valeur(o);
    if (!ok(o, String(v))) pb.push(`${t.id} objectif ${i + 1} refuse sa propre valeur`);
    if (typeof v === "number" && ok(o, String(v + Math.max(1, 3 * (o.reponse.tolerance || 0)) + 1))) pb.push(`${t.id} objectif ${i + 1} accepte une valeur fausse`);
    if (typeof v === "string" && ok(o, v + "0")) pb.push(`${t.id} objectif ${i + 1} accepte un texte faux`);
  });
  assert.deepStrictEqual(pb, []);
});

test("tel-06 : réponses conformes au calcul IPv4", () => {
  const o = tps["tel-06-ipv4"].objectifs;
  const a = LS.calculIPv4([192, 168, 1, 10], 24), b = LS.calculIPv4([10, 0, 0, 1], 22);
  assert.strictEqual(valeur(o[0]), a.hotes);
  assert.strictEqual(valeur(o[1]), LS.ipEnTexte(a.diffusion));
  let n = 30; while (LS.calculIPv4([192, 168, 1, 10], n).hotes < 50) n--;
  assert.ok(ok(o[3], "/" + n) && ok(o[3], String(n)) && !ok(o[3], String(n - 1)) && !ok(o[3], String(n + 1)));
  assert.strictEqual(valeur(o[4]), b.hotes);
  assert.strictEqual(valeur(o[5]), LS.ipEnTexte(b.diffusion));
});

test("tel-05 : réponses conformes au calcul d'encapsulation", () => {
  const o = tps["tel-05-encapsulation"].objectifs;
  assert.strictEqual(valeur(o[0]), LS.calculEncapsulation(10, "UDP").bourrage);
  assert.strictEqual(LS.calculEncapsulation(10, "TCP").bourrage, 0);
  assert.strictEqual(valeur(o[1]), LS.calculEncapsulation(10, "TCP").trame);
  assert.strictEqual(valeur(o[2]), LS.calculEncapsulation(4000, "TCP").nb);
  assert.ok(ok(o[3], String(100 * LS.calculEncapsulation(4000, "TCP").eff)));
});

test("tel-04, tel-02, num-05 : réponses justes", () => {
  const u = tps["tel-04-liaison-serie"].objectifs;
  const bits = [0, 1, 2, 3, 4, 5, 6, 7].map(k => (97 >> k) & 1).join("");
  assert.ok(ok(u[0], bits) && ok(u[0], bits.replace(/(....)/, "$1 ")) && !ok(u[0], "01100001"));
  assert.strictEqual(valeur(u[1]), bits.split("").filter(b => b === "1").length % 2);
  assert.ok(ok(u[3], String(100 * 0.5 / 9.5)));
  const m = tps["tel-02-modulation"].objectifs;
  assert.ok(ok(m[2], "fréquence haute") && !ok(m[2], "basse") && !ok(m[2], "pas haute mais basse"));
  const e = tps["num-05-echantillonnage"].objectifs;
  assert.strictEqual(valeur(e[2]), Math.pow(2, 12));
  assert.strictEqual(valeur(e[3]), Math.abs(7 - Math.round(7 / 10) * 10));
});

test("elec-11 : il faut nommer les bons éléments", () => {
  const o = tps["elec-11-panne"].objectifs;
  assert.ok(ok(o[1], "entre L2 et L3") && !ok(o[1], "L1 et L2"));
  assert.ok(ok(o[3], "L2, OL") && !ok(o[3], "L2") && !ok(o[3], "L3, OL"));
});
