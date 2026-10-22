/* Tests du modèle de moteur thermique (assets/js/sims/modele-moteur.js et courbes de mecanique.js). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
global.LS.sims = global.LS.sims || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "modele-moteur.js"));
require(path.join(__dirname, "..", "assets", "js", "sims", "mecanique.js"));
const LS = global.LS;
const dans = (v, a, b, msg) => assert.ok(v >= a && v <= b, `${msg} : ${v} hors de [${a}, ${b}]`);

function courbe(nom) {
  const m = LS.MOTEURS[nom], pts = [];
  for (let N = 1000; N <= m.Nmax; N += 100) { const r = LS.courbeMoteur(m, N); pts.push([N, r.C, r.P]); }
  return { pts, Cmax: pts.reduce((a, b) => b[1] > a[1] ? b : a), Pmax: pts.reduce((a, b) => b[2] > a[2] ? b : a) };
}

test("moto 600 cm³ : ≈ 65-70 N·m, 80-92 kW vers 13 000-14 000 tr/min, couple positif partout", () => {
  const k = courbe("moto");
  dans(k.Cmax[1], 63, 72, "couple maxi (N·m)");
  dans(k.Pmax[2] / 1000, 80, 92, "puissance maxi (kW)");
  dans(k.Pmax[0], 12500, 14500, "régime de puissance maxi");
  k.pts.forEach(([N, C]) => assert.ok(C > 15, `couple trop faible à ${N} tr/min : ${C}`));
  // Pas de creux à bas régime : le couple croît jusqu'au maximum.
  for (let i = 1; i < k.pts.length && k.pts[i][0] <= 9000; i++) assert.ok(k.pts[i][1] >= k.pts[i - 1][1] - 0.5, `creux à ${k.pts[i][0]} tr/min`);
});

test("citadine, diesel turbo et scooter dans leurs ordres de grandeur", () => {
  const c = courbe("citadine"), d = courbe("diesel"), s = courbe("scooter");
  dans(c.Cmax[1], 100, 125, "citadine, couple"); dans(c.Pmax[2] / 1000, 45, 65, "citadine, kW");
  dans(d.Cmax[1], 200, 270, "diesel, couple"); dans(d.Cmax[0], 1500, 2500, "diesel, régime de couple maxi"); dans(d.Pmax[2] / 1000, 60, 90, "diesel, kW");
  dans(s.Cmax[1], 9, 13, "scooter, couple"); dans(s.Pmax[2] / 1000, 7, 11, "scooter, kW");
});

test("pression maximale du diesel : 70-100 bar atmosphérique, 120-180 bar suralimenté", () => {
  const base = { alesage: 76, course: 80.5, bielle: 140, mode: "diesel", avance: 8, Nopt: 2000, regime: 2000, charge: 100 };
  dans(LS.cycleMoteur(Object.assign({}, base, { eps: 18 })).pmax, 70, 100, "atmosphérique ε 18");
  dans(LS.cycleMoteur(Object.assign({}, base, { eps: 16, turbo: true })).pmax, 120, 180, "turbo ε 16");
  assert.ok(!LS.cycleMoteur(Object.assign({}, base, { eps: 13 })).allume, "pas d'auto-inflammation à ε 13");
});

test("frottements : plus forts quand le piston va plus vite", () => {
  assert.ok(LS.frottementsMoteur(85, 6000) > LS.frottementsMoteur(85, 3000));
  assert.ok(LS.frottementsMoteur(42.5, 12000) < LS.frottementsMoteur(85, 12000));
  dans(LS.frottementsMoteur(85, 3000), 1.5, 2.5, "pmf à 3 000 tr/min (bar)");
});
