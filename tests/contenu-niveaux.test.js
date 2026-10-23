/* Contenu par niveau : textes primaire et collège de la carte elec-bases, objectifs par niveau des TP. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const racine = path.join(__dirname, "..");
const cartes = {}, tps = {};
global.window = global;
global.LS = { lire: (k, d) => d, ecrire: () => {}, ajouterCarte: c => { cartes[c.id] = c; }, ajouterTP: t => { tps[t.id] = t; } };
require(path.join(racine, "contenu", "parcours.js"));
require(path.join(racine, "assets", "js", "niveaux.js"));
require(path.join(racine, "contenu", "cartes", "elec-bases.js"));
["elec-01-premier-circuit", "elec-04-serie-parallele", "elec-bac-a-sable"].forEach(f => require(path.join(racine, "contenu", "tps", f + ".js")));
const LS = global.LS;
const noeuds = c => { const l = []; (function p(n) { l.push(n); (n.c || []).forEach(p); })(c.racine); return l; };

test("chaque notion d'elec-bases a un texte primaire et un texte collège", () => {
  const manque = noeuds(cartes["elec-bases"]).filter(n => n.d && !(n.d1 && n.d2)).map(n => n.t);
  assert.deepStrictEqual(manque, []);
});

test("textes primaire sans formule ni unité composée", () => {
  const pb = noeuds(cartes["elec-bases"]).filter(n => n.d1 && (/=/.test(n.d1) || /Ω·|W\/|·s|kWh|\/s\b|×|÷/.test(n.d1))).map(n => n.t);
  assert.deepStrictEqual(pb, []);
});

test("chaque TP modifié garde au moins un objectif à chaque niveau", () => {
  const pb = [];
  ["elec-01-premier-circuit", "elec-04-serie-parallele"].forEach(id => {
    for (let n = 1; n <= 4; n++) if (!LS.tpAuNiveau(tps[id], n).objectifs.length) pb.push(id + " niveau " + n);
  });
  assert.deepStrictEqual(pb, []);
  assert.ok(tps["elec-bac-a-sable"].intro1);
});

test("au primaire, des objectifs et des questions propres, et une intro simple", () => {
  ["elec-01-premier-circuit", "elec-04-serie-parallele"].forEach(id => {
    const p = LS.tpAuNiveau(tps[id], 1);
    assert.ok(p.intro === tps[id].intro1, id + " : intro primaire");
    assert.ok(p.objectifs.some(o => Array.isArray(o.niv) && o.niv[1] === 1), id + " : objectif propre au primaire");
    assert.ok(p.questions.length >= 1 && p.questions.every(q => q.choix.length <= 3), id + " : questions simples");
  });
});
