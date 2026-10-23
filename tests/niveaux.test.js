/* Niveaux : choix du texte, filtrage des objectifs, test de placement. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const stock = {};
global.window = global;
global.LS = Object.assign(global.LS || {}, { lire: (k, d) => (k in stock ? JSON.parse(stock[k]) : d), ecrire: (k, v) => { stock[k] = JSON.stringify(v); } });
require(path.join(__dirname, "..", "contenu", "parcours.js"));
require(path.join(__dirname, "..", "assets", "js", "niveaux.js"));
const LS = global.LS;

test("texte d'une notion selon le niveau, avec repli", () => {
  const n = { d: "lycée", d1: "primaire", d4: "avancé" };
  assert.strictEqual(LS.texteNiveau(n, 1), "primaire");
  assert.strictEqual(LS.texteNiveau(n, 2), "lycée", "pas de texte collège : texte de base");
  assert.strictEqual(LS.texteNiveau(n, 3), "lycée");
  assert.strictEqual(LS.texteNiveau(n, 4), "avancé");
  assert.strictEqual(LS.texteNiveau({ d: "x", d2: "collège" }, 1), "collège", "primaire sans texte : on prend le collège");
});

test("objectifs filtrés par niveau, état séparé seulement s'il y a des variantes", () => {
  const tp = { id: "t", objectifs: [{ texte: "a" }, { texte: "b", niv: 3 }, { texte: "c", niv: [1, 1] }], questions: [{ q: "q", niv: 2 }] };
  const p = LS.tpAuNiveau(tp, 1);
  assert.deepStrictEqual(p.objectifs.map(o => o.texte), ["a", "c"]);
  assert.strictEqual(p.questions.length, 0);
  assert.strictEqual(p.cleEtat, "t@1");
  assert.strictEqual(LS.tpAuNiveau({ id: "u", objectifs: [{ texte: "a" }] }, 1).cleEtat, "u");
});

test("profil : niveau général, niveau par atelier, collège par défaut", () => {
  assert.strictEqual(LS.niveau(), 2);
  LS.choisirNiveau(1);
  LS.choisirNiveau(3, "maths");
  assert.strictEqual(LS.niveau("electricite"), 1);
  assert.strictEqual(LS.niveau("maths"), 3);
});

test("test de placement : on monte tant qu'une des deux questions du niveau est juste", () => {
  const Q = LS.TEST_PLACEMENT, rep = {};
  Q.forEach((q, i) => { if (q.niv <= 2) rep[i] = q.bonne; });
  assert.strictEqual(LS.niveauDuTest(rep), 2);
  assert.strictEqual(LS.niveauDuTest({}), 1);
  const tout = {}; Q.forEach((q, i) => { tout[i] = q.bonne; });
  assert.strictEqual(LS.niveauDuTest(tout), 4);
});
