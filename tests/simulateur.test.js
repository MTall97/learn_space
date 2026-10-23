/* Tests du simulateur électrique : lancer avec `node --test tests/*.test.js` */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const racine = path.join(__dirname, "..", "assets", "js", "circuit");
require(path.join(racine, "reseau.js"));
require(path.join(racine, "moteur-electrique.js"));
global.LS.si = (v, u) => v + " " + u; // formatage simplifié (commun.js n'est pas chargé sous Node)
global.LS.nombre = v => String(v);
require(path.join(racine, "composants-elec.js"));
const LS = global.LS, REG = LS.composantsElec;

let id = 0;
function compo(type, x, y, p, rot) {
  const def = REG[type], props = {};
  (def.props || []).forEach(q => { props[q.k] = q.defaut; });
  return { id: "c" + (++id), type, x, y, rot: rot || 0, p: Object.assign(props, p || {}) };
}
const fil = (...pts) => ({ id: "f" + (++id), pts });
function simuler(schema, duree, dt) {
  const s = new LS.SimulateurElectrique(schema, REG);
  dt = dt || 1e-4;
  for (let t = 0; t < duree; t += dt) s.pas(dt);
  s.courants();
  return s;
}
const proche = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} attendu ${b}, obtenu ${a}`);

test("loi d'Ohm : 6 V sur 100 Ω donne 60 mA", () => {
  // Pile de (0,0) à (4,0) ; résistance de (0,4) à (4,4) ; deux fils verticaux.
  const pile = compo("pile", 0, 0, { U: 6, r: 0.01 });
  const r = compo("resistance", 0, 4, { R: 100, Pmax: 5 });
  const s = simuler({ compos: [pile, r], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, 0.001);
  proche(r._i[0], 0.06, 1e-4, "courant");
});

test("diviseur de tension : 9 V, 1 kΩ et 2 kΩ", () => {
  const pile = compo("pile", 0, 0, { U: 9, r: 0.01 });
  const r1 = compo("resistance", 0, 4, { R: 1000 });
  const r2 = compo("resistance", 4, 4, { R: 2000 });
  const v = compo("voltmetre", 4, 8);
  const s = simuler({ compos: [pile, r1, r2, v], fils: [fil([0, 0], [0, 4]), fil([4, 0], [8, 0], [8, 4]), fil([4, 4], [4, 8]), fil([8, 4], [8, 8])] }, 0.001);
  proche(v._mesure, 6, 0.01, "tension aux bornes de R2");
});

test("LED rouge avec 330 Ω sur 9 V : environ 21 mA, pas grillée", () => {
  const pile = compo("pile", 0, 0, { U: 9 });
  const r = compo("resistance", 0, 4, { R: 330 });
  const led = compo("led", 4, 4);
  const s = simuler({ compos: [pile, r, led], fils: [fil([0, 0], [0, 4]), fil([4, 0], [8, 0], [8, 4])] }, 0.05);
  proche(led._i[0], 0.021, 0.002, "courant LED");
  assert.ok(!(led.etat && led.etat.grille));
});

test("LED sans résistance sur 9 V : elle grille", () => {
  const pile = compo("pile", 0, 0, { U: 9 });
  const led = compo("led", 0, 4);
  simuler({ compos: [pile, led], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, 0.3);
  assert.ok(led.etat.grille);
});

test("charge d'un condensateur : 63 % au bout de τ = RC", () => {
  const pile = compo("pile", 0, 0, { U: 10, r: 0.01 });
  const r = compo("resistance", 0, 4, { R: 1000, Pmax: 5 });
  const c = compo("condensateur", 4, 4, { C: 1e-3 });
  simuler({ compos: [pile, r, c], fils: [fil([0, 0], [0, 4]), fil([4, 0], [8, 0], [8, 4])] }, 1.0, 1e-4);
  proche(c._v, 6.32, 0.05, "tension du condensateur");
});

test("transistor NPN en commutation : la LED s'allume quand la base est alimentée", () => {
  // 9 V ; base par 10 kΩ ; collecteur : 330 Ω + LED ; émetteur à la masse.
  const pile = compo("pile", 0, 0, { U: 9 });           // + en (0,0), − en (4,0)
  const rb = compo("resistance", 0, 4, { R: 10000 });    // (0,4)→(4,4) = base
  const t = compo("npn", 4, 4);                          // B (4,4), C (6,2), E (6,6)
  const rc = compo("resistance", 0, -4, { R: 330 });     // (0,-4)→(4,-4)
  const led = compo("led", 4, -4);                       // (4,-4)→(8,-4)
  const fils = [fil([0, 0], [0, 4]), fil([0, 0], [0, -4]), fil([8, -4], [8, 2], [6, 2]), fil([6, 6], [6, 8], [10, 8], [10, 0], [4, 0])];
  simuler({ compos: [pile, rb, t, rc, led], fils }, 0.01);
  assert.ok(led._i[0] > 0.015, "courant LED " + led._i[0]);
  assert.ok(t._i[0] > 5e-4 && t._i[0] < 1e-3, "courant de base " + t._i[0]);
});

test("moteur : il démarre puis tourne à vitesse stable", () => {
  const pile = compo("pile", 0, 0, { U: 6, r: 0.1 });
  const m = compo("moteur", 0, 4, { charge: 0 });
  simuler({ compos: [pile, m], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, 2, 1e-3);
  const rpm = m._w * 60 / (2 * Math.PI);
  assert.ok(rpm > 4000 && rpm < 5000, "vitesse " + rpm);
});

test("relais : la bobine colle et ferme le contact", () => {
  const pile = compo("pile", 0, 0, { U: 6 });
  const k = compo("relais", 10, 0, { Ub: 6 }); // bobine (10,0)-(10,4), contact (13,0)-(13,4)
  simuler({ compos: [pile, k], fils: [fil([0, 0], [0, -2], [10, -2], [10, 0]), fil([4, 0], [4, 4], [10, 4])] }, 0.01);
  assert.ok(k._colle);
});

test("redressement simple alternance : la charge ne voit que les alternances positives", () => {
  const g = compo("generateur", 0, 0, { A: 10, f: 50 });   // + (0,0), − (4,0)
  const d = compo("diode", 0, -4);                         // anode (0,-4), cathode (4,-4)
  const r = compo("resistance", 8, -4, { R: 1000 });       // (8,-4)→(12,-4)
  const s = new LS.SimulateurElectrique({ compos: [g, d, r], fils: [fil([0, 0], [0, -4]), fil([4, -4], [8, -4]), fil([12, -4], [12, 2], [4, 2], [4, 0])] }, REG);
  let min = 1e9, max = -1e9;
  for (let k = 0; k < 400; k++) { s.pas(1e-4); s.courants(); const u = r._i[0] * 1000; min = Math.min(min, u); max = Math.max(max, u); }
  assert.ok(min > -0.01, "min " + min);
  proche(max, 9.3, 0.25, "crête redressée (10 V − seuil de la diode)");
});

test("bobine : surtension et étincelle à l'ouverture, supprimées par une diode de roue libre", () => {
  function essai(avecDiode) {
    const pile = compo("pile", 0, 0, { U: 12, r: 0.1 });
    const k = compo("interrupteur", 0, -4, { ferme: true });        // (0,-4)→(4,-4)
    const l = compo("bobine", 8, -4, { L: 1, r: 10 });              // (8,-4)→(12,-4)
    const compos = [pile, k, l];
    const fils = [fil([0, 0], [0, -4]), fil([4, -4], [8, -4]), fil([12, -4], [12, 0], [4, 0])];
    if (avecDiode) { compos.push(compo("diode", 12, -8, {}, 180)); fils.push(fil([12, -8], [12, -4]), fil([8, -8], [8, -4])); }
    const s = new LS.SimulateurElectrique({ compos, fils }, REG);
    for (let t = 0; t < 0.6; t += 1e-4) s.pas(1e-4);  // courant établi : 12 / 10 ≈ 1,2 A
    proche(l._il, 1.19, 0.02, "courant établi");
    k.p.ferme = false; l._upic = 0;
    for (let t = 0; t < 0.05; t += 1e-5) s.pas(1e-5);
    return { pic: Math.abs(l._upic), arc: (k.etat.etincelles || 0) };
  }
  const sans = essai(false), avec = essai(true);
  assert.ok(sans.pic > 400 && sans.arc >= 1, "sans diode : pic " + sans.pic + ", arcs " + sans.arc);
  assert.ok(avec.pic < 2 && avec.arc === 0, "avec diode : pic " + avec.pic);
});

test("diode en direct sur une pile de 24 V sans résistance : elle grille", () => {
  const pile = compo("pile", 0, 0, { U: 24, r: 0.01 });
  const d = compo("diode", 0, 4);
  simuler({ compos: [pile, d], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, 0.05, 1e-4);
  assert.ok(d.etat.grille);
});

test("Zener 5,1 V : régulation réaliste (résistance dynamique ≈ 20 Ω à 10 mA)", () => {
  const tension = I => {
    const pile = compo("pile", 0, 0, { U: 12, r: 0.01 });
    const r = compo("resistance", 0, 4, { R: (12 - 5.1) / I, Pmax: 5 });
    const z = compo("zener", 8, 4, { Vz: 5.1 }, 180); // cathode à gauche, côté +
    simuler({ compos: [pile, r, z], fils: [fil([0, 0], [0, 4]), fil([4, 4], [4, 4]), fil([4, 0], [8, 0], [8, 4])] }, 0.01);
    return -(z._vd);
  };
  const v5 = tension(0.005), v15 = tension(0.015);
  proche(v5, 5.1, 0.15, "à 5 mA");
  const rd = (v15 - v5) / 0.01;
  assert.ok(rd > 8 && rd < 40, "résistance dynamique " + rd + " Ω");
});

test("générateur 220 V en court-circuit : alerte", () => {
  const g = compo("generateur", 0, 0, { A: 311, f: 50 });
  const k = compo("interrupteur", 0, 4, { ferme: true });
  simuler({ compos: [g, k], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, 0.02, 1e-4);
  assert.ok(/Court-circuit/.test(g.etat.alerte));
});

test("voltmètre en mode continu sur du 220 V alternatif : il lit la moyenne, ≈ 0 V", () => {
  const g = compo("generateur", 0, 0, { A: 311, f: 50 });
  const v = compo("voltmetre", 0, 4);
  const va = compo("voltmetre", 0, 8, { mode: "alternatif (AC, efficace)" });
  simuler({ compos: [g, v, va], fils: [fil([0, 0], [0, 4], [0, 8]), fil([4, 0], [4, 4], [4, 8])] }, 2, 1e-4);
  assert.ok(Math.abs(v._mesure) < 5, "DC : " + v._mesure);
  proche(va._mesure, 220, 5, "AC");
});

test("fusible : tient à 1,05 In, fond en ≈ 1 s à 1,5 In et en ≈ 12 ms à 10 In", () => {
  const essai = (I, duree) => {
    // Le courant est fixé par la résistance interne de la pile.
    const pile = compo("pile", 0, 0, { U: 10, r: 10 / I - 0.05 });
    const f = compo("fusible", 0, 4, { In: 1 });
    let t = 0;
    const s = new LS.SimulateurElectrique({ compos: [pile, f], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, REG);
    while (t < duree && !(f.etat && f.etat.grille)) { s.pas(1e-4); t += 1e-4; }
    return f.etat && f.etat.grille ? t : Infinity;
  };
  assert.strictEqual(essai(1.05, 5), Infinity);
  const t15 = essai(1.5, 5), t10 = essai(10, 1);
  assert.ok(t15 > 0.7 && t15 < 2, "1,5 In : " + t15);
  assert.ok(t10 > 0.005 && t10 < 0.03, "10 In : " + t10);
});

test("lampe : appel de courant à l'allumage (filament froid)", () => {
  const pile = compo("pile", 0, 0, { U: 12, r: 0.01 });
  const l = compo("lampe", 0, 4, { Un: 12, Pn: 21 });
  const s = new LS.SimulateurElectrique({ compos: [pile, l], fils: [fil([0, 0], [0, 4]), fil([4, 0], [4, 4])] }, REG);
  s.pas(1e-4); s.courants();
  const i0 = l._i[0];
  for (let k = 0; k < 5000; k++) s.pas(1e-4);
  s.courants();
  const i1 = l._i[0];
  proche(i1, 21 / 12, 0.05, "courant établi");
  assert.ok(i0 > 8 * i1, "appel " + i0 + " A contre " + i1 + " A");
  assert.ok(!l.etat.grille);
});

test("multimètre en ohmmètre posé sur une pile de 9 V : alerte « sous tension »", () => {
  const pile = compo("pile", 0, 0, { U: 9, r: 0.1 });
  const mm = compo("multimetre", 0, 0, { sel: "Ω", douille: "VΩ" });
  mm.bornes = [[0, 0], [4, 0]]; mm._posees = true;
  simuler({ compos: [pile, mm], fils: [] }, 0.01);
  assert.ok(/sous tension/.test(REG.multimetre.affichage(mm).alerte));
});
