/* Tests des fonctions de calcul des TP de maths : lancer avec `node --test tests/*.test.js` */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "maths.js"));
const LS = global.LS;
const proche = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} attendu ${b}, obtenu ${a}`);

test("impédance RLC : |Z| = R à la résonance, 159 Hz pour 0,1 H et 10 µF", () => {
  const f0 = LS.impedanceRLC(100, 0.1, 1e-5, 50).f0;
  proche(f0, 159.15, 0.01, "f0");
  const z = LS.impedanceRLC(100, 0.1, 1e-5, f0);
  proche(z.module, 100, 1e-6, "|Z|");
  proche(z.argument, 0, 1e-9, "déphasage");
  assert.ok(LS.impedanceRLC(100, 0.1, 1e-5, 10 * f0).argument > 0, "inductif au-dessus de f0");
  proche(LS.impedanceRLC(100, 0.1, 1e-5, 50).XC, 318.3, 0.1, "1/(Cω) à 50 Hz");
});

test("complexes : module, argument, produit = rotation", () => {
  const C = LS.complexe;
  proche(C.module([3, 4]), 5, 1e-12);
  const p = C.produit([3, 4], [0, 1]);
  proche(p[0], -4, 1e-12); proche(p[1], 3, 1e-12);
  const q = C.produit([3, 4], C.polaire(2, -Math.PI / 4));
  proche(C.module(q), 10, 1e-9);
  proche(C.argument(q), Math.atan2(4, 3) - Math.PI / 4, 1e-9);
});

test("méthode des rectangles : converge, plus vite au point milieu", () => {
  const f = x => x * x, exact = 9; // ∫₀³ x² dx
  const e = n => Math.abs(LS.integraleRectangles(f, 0, 3, n, "gauche") - exact);
  const m = n => Math.abs(LS.integraleRectangles(f, 0, 3, n, "milieu") - exact);
  assert.ok(e(10) > e(100) && e(100) > e(1000));
  proche(e(10) / e(100), 10, 1.5, "erreur en 1/n à gauche");
  proche(m(10) / m(100), 100, 1, "erreur en 1/n² au milieu");
});

test("courbes du TP dérivées : primitives et dérivées cohérentes", () => {
  for (const [nom, k] of Object.entries(LS.COURBES_MATHS)) {
    for (let i = 1; i < 10; i++) {
      const x = k.a + (k.b - k.a) * (i / 10 + 0.013), h = 1e-5 * (k.b - k.a);
      proche((k.f(x + h) - k.f(x - h)) / (2 * h), k.df(x), 1e-3 * Math.max(1, Math.abs(k.df(x))), nom + " dérivée");
      proche((k.F(x + h) - k.F(x - h)) / (2 * h), k.f(x), 1e-3 * Math.max(1, Math.abs(k.f(x))), nom + " primitive");
    }
  }
  const v = LS.COURBES_MATHS.vitesse;
  proche(v.F(20) - v.F(0), 135, 1e-9, "distance de la voiture");
  const p = LS.COURBES_MATHS.puissance;
  proche(p.F(24) - p.F(0), 36000, 1e-6, "énergie de la maison sur 24 h (Wh)");
});

test("régression linéaire : retrouve une droite exacte et r = 1", () => {
  const xs = [0, 1, 2, 3, 4], ys = xs.map(x => 2 * x + 1);
  const r = LS.regressionLineaire(xs, ys);
  proche(r.a, 2, 1e-12); proche(r.b, 1, 1e-12); proche(r.r, 1, 1e-12);
  const n = LS.nuageCorrele(5000, 0.8, 7);
  proche(LS.regressionLineaire(n.xs, n.ys).r, 0.8, 0.03, "nuage corrélé à 0,8");
});

test("hasard à graine : reproductible, loi normale et loi des grands nombres", () => {
  const a = LS.alea(42), b = LS.alea(42);
  for (let i = 0; i < 5; i++) assert.strictEqual(a(), b());
  const r = LS.alea(3), g = [];
  for (let i = 0; i < 20000; i++) g.push(LS.tirageGauss(r));
  const s = LS.statsDescriptives(g);
  proche(s.moyenne, 0, 0.03); proche(s.ecartType, 1, 0.03);
  proche(g.filter(x => Math.abs(x) <= 1).length / g.length, 0.6827, 0.015, "68 % à ±1σ");
  const d = LS.alea(1), des = [];
  for (let i = 0; i < 20000; i++) des.push(LS.LOIS_STATS.de.tirer(d));
  proche(LS.statsDescriptives(des).moyenne, 3.5, 0.05, "moyenne d'un dé");
  assert.strictEqual(LS.statsDescriptives([1, 3, 2, 10]).mediane, 2.5);
});

test("décibels et temps de doublement", () => {
  proche(LS.decibels.versRapport(-3, "puissance"), 0.501, 0.001);
  proche(LS.decibels.versRapport(20, "tension"), 10, 1e-9);
  proche(LS.decibels.depuisRapport(100, "puissance"), 20, 1e-9);
  proche(LS.tempsDoublement(7), 10.24, 0.01);
});
