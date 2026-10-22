/* Tests du moteur asynchrone et du transformateur (assets/js/sims/electromecanique.js). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
global.LS.sims = global.LS.sims || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "electromecanique.js"));
const LS = global.LS;
const dans = (v, a, b, msg) => assert.ok(v >= a && v <= b, `${msg} : ${v} hors de [${a}, ${b}]`);

test("asynchrone : couple de démarrage ≈ 0,6-0,8 × couple maximal", () => {
  const r = LS.regimeAsynchrone(50, 2, 10, true);
  dans(r.Cd / r.Cmax, 0.6, 0.8, "Cd / Cmax");
});

test("asynchrone : glissement toujours dans [0, 1], jamais de vitesse négative", () => {
  for (const f of [5, 10, 25, 50, 60]) for (let Cr = 0; Cr <= 40; Cr += 1) {
    const r = LS.regimeAsynchrone(f, 2, Cr, true);
    assert.ok(r.g >= 0 && r.g <= 1 && r.n >= 0, `f=${f} Cr=${Cr} : g=${r.g}, n=${r.n}`);
  }
});

test("asynchrone : 1 500 tr/min de synchronisme, quelques % de glissement à 10 N·m", () => {
  const r = LS.regimeAsynchrone(50, 2, 10, true);
  assert.strictEqual(r.ns, 1500); dans(r.g, 0.01, 0.06, "glissement");
});

test("asynchrone : à l'arrêt, une charge entre couple de démarrage et couple maximal ne démarre pas", () => {
  const lance = LS.regimeAsynchrone(50, 2, 25, true), arrete = LS.regimeAsynchrone(50, 2, 25, false);
  assert.ok(!lance.cale && lance.n > 1300); assert.ok(arrete.cale && arrete.n === 0);
  assert.ok(LS.regimeAsynchrone(50, 2, 35, true).cale, "décroche au-delà du couple maximal");
});

test("transformateur : 230 V / 1 150 spires normal, 500 spires saturé, 100 spires sous 400 V détruit", () => {
  const p = { U1: 230, N1: 1150, N2: 60, R: 12, continu: false };
  const n = LS.calcTransformateur(p);
  dans(n.U2, 11, 12.1, "U2"); assert.ok(!n.sature && n.Imag < 0.05);
  const s5 = LS.calcTransformateur(Object.assign({}, p, { N1: 500, N2: 26 }));
  assert.ok(s5.sature && s5.Imag > 1, "saturé, courant à vide > 1 A");
  const s1 = LS.calcTransformateur(Object.assign({}, p, { U1: 400, N1: 100 }));
  assert.ok(s1.sature && s1.grille);
  // Pertes fer en (U1/N1)² : même volts par spire, mêmes pertes.
  const a = LS.calcTransformateur(Object.assign({}, p, { U1: 115, N1: 575 })), b = LS.calcTransformateur(p);
  assert.ok(Math.abs(a.Pfer - b.Pfer) < 1e-9);
});
