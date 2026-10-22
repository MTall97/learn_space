/* Tests des modèles de capteurs : lancer avec `node --test tests/*.test.js` */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
global.LS.sims = global.LS.sims || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "capteurs.js"));
const LS = global.LS;
const proche = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} attendu ${b}, obtenu ${a}`);

test("CTN : 10 kΩ à 25 °C, B ≈ 3950 entre 25 et 50 °C, Steinhart-Hart réversible", () => {
  proche(LS.ntcResistance(25), 10000, 1, "R25");
  const B = Math.log(10000 / LS.ntcResistance(50)) / (1 / 298.15 - 1 / 323.15);
  proche(B, 3950, 15, "B25/50");
  for (const T of [-20, 0, 60, 120]) proche(LS.ntcTemperatureSH(LS.ntcResistance(T)), T, 1e-6, "inversion à " + T);
});

test("chaîne de mesure : conversion corrigée juste, conversion naïve fausse", () => {
  const p = { T: 25, rf: 10000, conversion: "corrigee", calcul: "sh", alim: "gpio" };
  const m = LS.mesureThermistance(p, 0);
  proche(m.V, 1.65, 0.01, "tension au point milieu");
  proche(m.Test, 25, 0.1, "température estimée");
  const naive = LS.mesureThermistance(Object.assign({}, p, { conversion: "naive" }), 0);
  assert.ok(Math.abs(naive.err) > 3, "la conversion naïve devrait se tromper de plusieurs degrés");
  const sature = LS.mesureThermistance({ T: 120, rf: 100000, conversion: "corrigee", calcul: "sh", alim: "gpio" }, 0);
  assert.ok(sature.horsPlage && !isFinite(sature.Test), "hors de la plage de l'ADC, pas de température");
});

test("auto-échauffement : ordre de grandeur et suppression par alimentation intermittente", () => {
  const m = LS.mesureThermistance({ T: 25, rf: 1000, conversion: "corrigee", calcul: "sh", alim: "permanente" }, 0);
  proche(m.P, 0.9e-3, 0.1e-3, "puissance dissipée");
  proche(m.dT, 0.6, 0.1, "échauffement");
  assert.ok(LS.mesureThermistance({ T: 25, rf: 1000, conversion: "corrigee", calcul: "sh", alim: "gpio" }, 0).dT < 0.01);
});

test("ultrasons : vitesse du son, distance, erreur sans correction de température", () => {
  proche(LS.vitesseSon(20), 343.4, 0.1, "à 20 °C");
  proche(LS.vitesseSon(0), 331.3, 1e-9, "à 0 °C");
  const base = { distance: 100, decalage: 0, surface: "dur", angle: 0, tempAir: 20, correction: true, fond: "rien" };
  const m = LS.mesureUltrason(base, () => 0.5);
  proche(m.t, 2 * 1 / 343.42, 5e-6, "durée de l'écho");
  proche(m.dMes, 100, 0.5, "distance");
  const chaud = LS.mesureUltrason(Object.assign({}, base, { distance: 200, tempAir: 40, correction: false }), () => 0.5);
  proche(chaud.err, -6, 0.6, "erreur à 40 °C sans correction");
  assert.ok(!LS.mesureUltrason(Object.assign({}, base, { surface: "incline", angle: 30 }), () => 0.5).vu, "planche inclinée");
  assert.ok(!LS.mesureUltrason(Object.assign({}, base, { distance: 450 }), () => 0.5).vu, "au-delà de 4 m");
  proche(LS.mesureUltrason(Object.assign({}, base, { decalage: 100, fond: "mur" }), () => 0.5).dMes, 350, 1.5, "hors faisceau : le mur du fond");
});

test("centrale inertielle : le filtre complémentaire bat chaque capteur seul", () => {
  const r = LS.simulerIMU({ biais: 0.5, vibrations: true, alpha: 0.99, chariot: false }, 30, LS.capteurs.aleaGraine(42));
  assert.ok(r.rmsFusion < 1, "fusion " + r.rmsFusion);
  assert.ok(r.rmsAccel > 3 * r.rmsFusion, "accéléromètre seul " + r.rmsAccel);
  assert.ok(r.rmsGyro > 3 * r.rmsFusion, "gyroscope intégré seul " + r.rmsGyro);
});

test("filtrage : la moyenne de 16 mesures divise le bruit par environ 4", () => {
  const rnd = LS.capteurs.aleaGraine(7), brut = [], moy = [];
  for (let i = 0; i < 4000; i++) { brut.push(LS.lectureBalance(200, "hx711", 0, rnd)); if (brut.length >= 16 && i % 16 === 0) moy.push(LS.capteurs.moyenneGlissante(brut, 16)); }
  const rapport = LS.capteurs.ecartType(brut) / LS.capteurs.ecartType(moy);
  proche(rapport, 4, 0.6, "rapport des écarts types");
  proche(LS.capteurs.filtreExpo(0, 10, 0.2), 2, 1e-12, "passe-bas exponentiel");
});
