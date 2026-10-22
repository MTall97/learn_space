/* Tests des calculs d'électricité du bâtiment : node --test tests/*.test.js */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
global.LS.sims = global.LS.sims || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "batiment.js"));
const LS = global.LS;
const proche = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} attendu ${b}, obtenu ${a}`);

test("chute de tension : 2 000 W à 50 m en 1,5 mm² cuivre ≈ 12,6 V (5,5 %)", () => {
  const r = LS.chuteTension({ I: 2000 / 230, longueur: 50, section: 1.5, matiere: "cuivre", cosphi: 1 });
  proche(r.dU, 2 * 0.0225 * 50 / 1.5 * 2000 / 230, 1e-9, "ΔU");
  proche(r.pourcent, 5.67, 0.05, "%");
  // L'aluminium chute 1,6 fois plus à section égale.
  const a = LS.chuteTension({ I: 2000 / 230, longueur: 50, section: 1.5, matiere: "alu", cosphi: 1 });
  proche(a.dU / r.dU, 0.036 / 0.0225, 1e-9, "rapport alu/cuivre");
});

test("déclenchement magnétique selon la courbe", () => {
  assert.strictEqual(LS.declenchementMagnetique(40, 16, "B"), "non");       // 2,5 In
  assert.strictEqual(LS.declenchementMagnetique(64, 16, "B"), "possible");  // 4 In
  assert.strictEqual(LS.declenchementMagnetique(80, 16, "B"), "certain");   // 5 In
  assert.strictEqual(LS.declenchementMagnetique(120, 16, "C"), "possible"); // 7,5 In
  assert.strictEqual(LS.declenchementMagnetique(160, 16, "C"), "certain");  // 10 In
  assert.strictEqual(LS.declenchementMagnetique(160, 16, "D"), "possible");
});

test("déclencheur thermique : points conventionnels de la CEI 60898", () => {
  assert.strictEqual(LS.tempsThermique(1.13 * 16, 16), Infinity);
  assert.ok(LS.tempsThermique(1.45 * 16, 16) < 3600, "1,45 In : moins d'1 h");
  const t255 = LS.tempsThermique(2.55 * 16, 16);
  assert.ok(t255 >= 1 && t255 <= 60, "2,55 In : entre 1 et 60 s (" + t255 + ")");
  assert.ok(LS.tempsThermique(3 * 16, 16) < LS.tempsThermique(2 * 16, 16), "décroissant");
});

test("défaut d'isolement en TT : Uc = Id × RA", () => {
  const r = LS.defautTT({ Rd: 0, RA: 30, RB: 10, touche: false });
  proche(r.Id, 230 / 40, 1e-9, "Id");
  proche(r.Uc, 230 / 40 * 30, 1e-9, "Uc");
  // Sans terre, tout passe par la personne.
  const p = LS.defautTT({ Rd: 0, RA: Infinity, RB: 10, Rh: 1000, touche: true });
  proche(p.Ib, 230 / 1010, 1e-9, "courant dans le corps");
  // Pas de défaut : rien.
  assert.strictEqual(LS.defautTT({ Rd: Infinity, RA: 30, touche: true, Rh: 2000 }).Id, 0);
});

test("différentiel et zones d'effets du courant", () => {
  assert.strictEqual(LS.tempsDifferentiel(0.01, 0.03), Infinity);
  proche(LS.tempsDifferentiel(0.03, 0.03), 0.3, 1e-9);
  proche(LS.tempsDifferentiel(0.06, 0.03), 0.15, 1e-9);
  proche(LS.tempsDifferentiel(0.2, 0.03), 0.04, 1e-9);
  assert.strictEqual(LS.zoneCourant(0.3, 10), "AC-1");
  assert.strictEqual(LS.zoneCourant(5, 10), "AC-2");
  assert.strictEqual(LS.zoneCourant(80, 10), "AC-4");   // 80 mA pendant 10 s
  assert.strictEqual(LS.zoneCourant(230, 0.04), "AC-3"); // 230 mA coupés en 40 ms
});
