/* Jeu : niveaux, série de jours, registre de gains idempotent. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const stock = {};
global.window = global;
global.LS = { lire: (k, d) => (k in stock ? JSON.parse(stock[k]) : d), ecrire: (k, v) => { stock[k] = JSON.stringify(v); } };
require(path.join(__dirname, "..", "assets", "js", "progression.js"));
require(path.join(__dirname, "..", "assets", "js", "jeu.js"));
const J = global.LS.jeu;

test("niveaux : seuils 0, 100, 300, 600", () => {
  assert.strictEqual(J.niveau(0).n, 1);
  assert.strictEqual(J.niveau(99).n, 1);
  assert.strictEqual(J.niveau(100).n, 2);
  assert.strictEqual(J.niveau(600).n, 4);
  assert.ok(Math.abs(J.niveau(200).ratio - 0.5) < 1e-9);
});

test("série : jours consécutifs jusqu'à aujourd'hui ou hier", () => {
  const auj = new Date(2026, 9, 23, 12);
  const j = d => J.jourISO(new Date(2026, 9, d, 12));
  assert.strictEqual(J.serie({ [j(23)]: 10, [j(22)]: 5, [j(21)]: 5, [j(19)]: 5 }, auj), 4, "un jour manqué isolé ne casse pas la série");
  assert.strictEqual(J.serie({ [j(23)]: 10, [j(22)]: 5, [j(19)]: 5 }, auj), 2, "deux jours manqués la cassent");
  assert.strictEqual(J.serie({ [j(22)]: 10, [j(21)]: 5 }, auj), 2, "la série tient encore si on n'a rien fait aujourd'hui");
  assert.strictEqual(J.serie({ [j(20)]: 10 }, auj), 0);
});

test("gains : un objectif ne rapporte qu'une fois, le TP terminé donne un bonus", () => {
  global.LS.enregistrerTP("t1", { objectifs: { 0: true }, questions: {}, total: 2 });
  global.LS.enregistrerTP("t1", { objectifs: { 0: true }, questions: {}, total: 2 });
  assert.strictEqual(J.total(), J.POINTS.objectif);
  global.LS.enregistrerTP("t1", { objectifs: { 0: true }, questions: { 0: true }, total: 2 });
  assert.strictEqual(J.total(), J.POINTS.objectif + J.POINTS.question + J.POINTS.tp);
});
