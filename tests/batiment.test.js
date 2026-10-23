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

test("chute de tension : 2 000 W sous 220 V à 50 m en 1,5 mm² cuivre ≈ 13,6 V (6,2 %)", () => {
  assert.strictEqual(LS.U_RESEAU, 220, "réseau malien");
  const r = LS.chuteTension({ I: 2000 / 220, longueur: 50, section: 1.5, matiere: "cuivre", cosphi: 1 });
  proche(r.dU, 2 * 0.0225 * 50 / 1.5 * 2000 / 220, 1e-9, "ΔU");
  proche(r.dU, 13.64, 0.01, "ΔU en V");
  proche(r.pourcent, 6.20, 0.05, "%");
  // L'aluminium chute 1,6 fois plus à section égale.
  const a = LS.chuteTension({ I: 2000 / 220, longueur: 50, section: 1.5, matiere: "alu", cosphi: 1 });
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
  proche(r.Id, 220 / 40, 1e-9, "Id");
  proche(r.Uc, 220 / 40 * 30, 1e-9, "Uc");
  // Sans terre, tout passe par la personne.
  const p = LS.defautTT({ Rd: 0, RA: Infinity, RB: 10, Rh: 1000, touche: true });
  proche(p.Ib, 220 / 1010, 1e-9, "courant dans le corps");
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
  assert.strictEqual(LS.zoneCourant(218, 0.04), "AC-3"); // 218 mA coupés en 40 ms
});

test("surcharge : In ≤ Iz et I2 ≤ 1,45 Iz, et ce qu'elles tolèrent", () => {
  // Associations usuelles de la NF C 15-100 (disjoncteurs) : toutes conformes.
  [[1.5, 16], [1.5, 10], [2.5, 20], [6, 32]].forEach(([S, In]) => assert.ok(LS.conditionSurcharge(In, S).ok, S + " mm² en " + In + " A"));
  assert.ok(!LS.conditionSurcharge(32, 1.5).ok, "32 A sur 1,5 mm² non conforme");
  // Un fusible gG (I2 ≈ 1,6 In) de 16 A sur 1,5 mm² ne respecte pas la seconde condition.
  assert.ok(!LS.conditionSurcharge(16, 1.5, 1.6).c2, "fusible gG 16 A sur 1,5 mm²");
  // Conforme ne veut pas dire « jamais au-dessus de 70 °C » : 19,1 A sur 1,5 mm² protégé en 16 A.
  const I = 4200 / 220;
  assert.ok(LS.temperatureCable(I, 1.5) > 70, "le câble dépasse 70 °C");
  assert.ok(LS.tempsThermique(I, 16) > 86400, "et le disjoncteur met plus d'un jour à couper");
  // À I2 = 1,45 In, la coupure est garantie en moins d'1 h.
  assert.ok(LS.tempsThermique(1.45 * 16, 16) < 3600);
});

test("tension limite : 50 V en local sec, 25 V en milieu mouillé", () => {
  assert.strictEqual(LS.tensionLimite(1300), 50);
  assert.strictEqual(LS.tensionLimite(500), 25);
});
