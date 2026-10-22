/* Tests des modèles solaires (panneau, batterie, régulateur, installation). Lancer : node --test tests/*.test.js */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "solaire.js"));
const LS = global.LS;
const dans = (v, a, b, msg) => assert.ok(v >= a && v <= b, `${msg} : ${v} hors de [${a}, ${b}]`);

test("panneau 60 cellules aux conditions standard : Voc, Isc, Pmp d'une fiche technique", () => {
  const r = LS.ivPanneau({ module: "m60", G: 1000, Tc: 25 });
  dans(r.Voc, 37, 41, "Voc"); dans(r.Isc, 9, 11, "Isc"); dans(r.Pmp, 270, 330, "Pmp"); dans(r.Vmp / r.Voc, 0.75, 0.85, "Vmp/Voc");
  const p36 = LS.ivPanneau({ module: "m36", G: 1000, Tc: 25 });
  dans(p36.Vmp, 17, 19, "Vmp 36 cellules"); dans(p36.Pmp, 90, 110, "Pmp 36 cellules");
});

test("la puissance baisse d'environ 0,35-0,45 %/°C, le courant suit l'éclairement", () => {
  const a = LS.ivPanneau({ module: "m60", G: 1000, Tc: 25 }), b = LS.ivPanneau({ module: "m60", G: 1000, Tc: 65 });
  dans(100 * (b.Pmp / a.Pmp - 1) / 40, -0.45, -0.3, "coefficient de Pmax (%/°C)");
  const c = LS.ivPanneau({ module: "m60", G: 200, Tc: 25 });
  dans(c.Isc / a.Isc, 0.19, 0.21, "Isc à 200 W/m²"); dans(c.Voc / a.Voc, 0.88, 0.97, "Voc à 200 W/m²");
});

test("ombrage : les diodes bypass limitent la perte à environ un tiers, sans elles point chaud", () => {
  const ref = LS.ivPanneau({ module: "m60", G: 1000, Tc: 25 }).Pmp;
  const avec = LS.ivPanneau({ module: "m60", G: 1000, Tc: 25, ombre: 0.75, bypass: true }).Pmp;
  const sans = LS.ivPanneau({ module: "m60", G: 1000, Tc: 25, ombre: 0.75, bypass: false }).Pmp;
  dans(avec / ref, 0.6, 0.7, "avec bypass"); assert.ok(sans < avec, "sans bypass plus faible");
  const op = LS.pointSurCharge({ module: "m60", G: 1000, Tc: 25, ombre: 0.75, bypass: false }, 2);
  assert.ok(op.Pcellule > 50, "la cellule ombragée dissipe " + op.Pcellule + " W");
});

test("régulateur : MPPT ≥ PWM, et un 60 cellules sur PWM perd plus de la moitié", () => {
  for (const module of ["m36", "m60"]) for (const Ta of [-5, 25, 40]) for (const G of [200, 600, 1000]) {
    const q = { module, G, Tc: LS.tempCellule(Ta, G) };
    const a = LS.regulateur(q, "pwm", 12.6), b = LS.regulateur(q, "mppt", 12.6);
    assert.ok(b.P >= a.P * 0.99, `${module} ${Ta} °C ${G} W/m² : MPPT ${b.P} < PWM ${a.P}`);
    assert.ok(b.P <= b.Pmp && a.P <= b.Pmp + 1e-6, "pas plus que la puissance disponible");
  }
  const q = { module: "m60", G: 1000, Tc: 25 };
  assert.ok(LS.regulateur(q, "pwm", 12.6).P < 0.5 * LS.regulateur(q, "mppt", 12.6).Pmp);
  const j = LS.journeeSolaire({ module: "m36", Gcrete: 1000, Ta: 25 }, 12.6);
  dans(j.Emppt / j.Epwm, 1.05, 1.35, "gain MPPT sur une journée (36 cellules)");
});

test("batterie : Peukert pour le plomb, capacité presque entière en lithium, charge CC puis CV", () => {
  const decharge = (chimie, I) => { const b = { chimie, C: 100, soc: 1 }; let ah = 0; for (let t = 0; t < 40; t += 0.01) { const r = LS.pasBatterie(b, I, 0.01); if (r.coupure) break; ah += I * 0.01; } return ah; };
  dans(decharge("plomb", 5), 95, 101, "plomb à C/20"); dans(decharge("plomb", 50), 55, 80, "plomb à 0,5 C"); dans(decharge("lifepo4", 50), 90, 100, "LiFePO4 à 0,5 C");
  dans(LS.BATTERIES.plomb.ocv(1), 12.6, 12.85, "plomb plein"); dans(LS.BATTERIES.plomb.ocv(0.5), 12.1, 12.35, "plomb 50 %");
  const b = { chimie: "plomb", C: 100, soc: 0.4 }; let cv = null, t = 0, r;
  for (; t < 24; t += 0.01) { r = LS.pasBatterie(b, -15, 0.01); if (!cv && r.phase.startsWith("CV")) cv = b.soc; }
  dans(cv, 0.7, 0.9, "début de la phase CV (plomb)"); assert.ok(b.soc > 0.99 && Math.abs(r.I) < 3, "fin de charge lente, courant faible");
  dans(LS.BATTERIES.plomb.cycles(0.5), 450, 700, "cycles plomb à 50 %"); dans(LS.BATTERIES.lifepo4.cycles(0.8), 3000, 6000, "cycles LiFePO4 à 80 %");
});

test("installation : bilan d'énergie cohérent heure par heure", () => {
  const base = { site: "bamako", mois: 6, panneaux: 2, wc: 400, regulateur: "mppt", chimie: "plomb", tension: 12, capacite: 200, couverts: 0, lampes: 6, telephones: 3, ventilateur: 6, tv: 4, ordinateur: 0, frigo: true, pompe: false };
  for (const p of [base, Object.assign({}, base, { panneaux: 1 }), Object.assign({}, base, { couverts: 3, chimie: "lifepo4", tension: 24 }), Object.assign({}, base, { site: "paris", mois: 11 })]) {
    const r = LS.simulerInstallation(p);
    const besoin = r.h.reduce((a, q) => a + q.besoin, 0), servi = r.h.reduce((a, q) => a + q.servie, 0);
    assert.ok(Math.abs(besoin - servi - r.deleste) < 1e-6, "besoin = servi + délesté");
    r.h.forEach(q => assert.ok(q.soc >= r.socLimite - 1e-9 && q.soc <= 1 + 1e-9, "état de charge dans les limites"));
    // Conservation : ce qui est servi vient des panneaux (moins le surplus perdu) ou du stock, avec des pertes de stockage.
    const prod = r.h.reduce((a, q) => a + q.prod, 0), socFin = r.h[r.h.length - 1].soc;
    assert.ok(servi <= prod - r.perdu + r.Eb * (1 - socFin) + 1e-6, "pas d'énergie créée");
    assert.ok(servi >= 0.8 * (prod - r.perdu + r.Eb * (1 - socFin)), "pertes de stockage plausibles");
    dans(r.consoJour, 1400, 2000, "consommation journalière");
  }
  const r1 = LS.simulerInstallation(Object.assign({}, base, { panneaux: 1 })), r2 = LS.simulerInstallation(base);
  assert.ok(r1.deleste > 0 && r2.deleste === 0, "un panneau ne suffit pas, deux oui");
  const pa = LS.simulerInstallation(Object.assign({}, base, { site: "paris", mois: 11 }));
  assert.ok(pa.prodJour < 0.3 * r2.prodJour, "Paris en décembre produit beaucoup moins que Bamako en juillet");
});
