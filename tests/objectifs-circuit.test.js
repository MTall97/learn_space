/* Rejoue les TP de circuit : on construit le montage « solution » à partir du schéma du TP, on fait
   tourner le simulateur et on appelle les vérifications des objectifs, comme la page le fait.
   Lancer : node --test tests/*.test.js */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const racine = path.join(__dirname, "..");
global.window = global;
global.LS = global.LS || {};
require(path.join(racine, "assets", "js", "circuit", "reseau.js"));
require(path.join(racine, "assets", "js", "circuit", "moteur-electrique.js"));
global.LS.si = global.LS.si || ((v, u) => v + " " + u);
global.LS.nombre = global.LS.nombre || (v => String(v));
require(path.join(racine, "assets", "js", "circuit", "composants-elec.js"));
const LS = global.LS, REG = LS.composantsElec;

const tps = {};
const ajouter = LS.ajouterTP;
LS.ajouterTP = t => { tps[t.id] = t; };
const charger = id => { delete require.cache[require.resolve(path.join(racine, "contenu", "tps", id + ".js"))]; require(path.join(racine, "contenu", "tps", id + ".js")); return tps[id]; };
if (ajouter) LS.ajouterTP = ajouter;

let n = 0;
/* Banc d'essai : imite l'objet `s` (l'éditeur) que reçoivent les vérifications des objectifs. */
function banc(tp) {
  const schema = JSON.parse(JSON.stringify(tp.config.schema));
  const prep = c => { c.id = c.id || "c" + (++n); c.rot = c.rot || 0; const p = {}; (REG[c.type].props || []).forEach(q => { p[q.k] = q.defaut; }); c.p = Object.assign(p, c.p || {}); return c; };
  schema.compos.forEach(prep);
  schema.fils.forEach(f => { f.id = "f" + (++n); });
  const sim = new LS.SimulateurElectrique(schema, REG);
  const memos = tp.objectifs.map(() => ({}));
  const atteints = tp.objectifs.map(() => false);
  const s = {
    schema, sim, choix: null,
    trouver: nom => schema.compos.find(c => c.nom === nom) || null,
    liste: type => schema.compos.filter(c => !type || c.type === type),
    U: c => c && c._nets ? sim.tension(c._nets[0]) - sim.tension(c._nets[1]) : 0,
    I: c => c && c._i ? c._i[0] : 0,
    memeNet: (c1, b1, c2, b2) => c1 && c2 && c1._nets && c2._nets && c1._nets[b1] !== undefined && c1._nets[b1] === c2._nets[b2],
    ajouter(type, x, y, rot, p, nom) { const c = prep({ type, x, y, rot, p, nom: nom || type + (++n) }); schema.compos.push(c); sim.preparer(); return c; },
    fil(...pts) { schema.fils.push({ id: "f" + (++n), pts }); sim.preparer(); },
    enlever(...noms) { schema.compos = schema.compos.filter(c => !noms.includes(c.nom)); sim.schema = schema; sim.preparer(); },
    enleverFils(pred) { schema.fils = schema.fils.filter(f => !pred(f)); sim.preparer(); },
    /* Avance de « duree » secondes et vérifie les objectifs toutes les 3,7 ms. */
    avancer(duree) {
      let dt = tp.config.dt || 1e-3;
      schema.compos.forEach(c => { if (c.type === "generateur") dt = Math.min(dt, 1 / (60 * c.p.f)); });
      const fin = sim.t + duree;
      let prochain = sim.t;
      while (sim.t < fin - 1e-12) {
        sim.pas(dt);
        if (sim.t >= prochain) {
          sim.courants();
          tp.objectifs.forEach((o, i) => { if (!atteints[i] && o.verif(s, memos[i])) atteints[i] = true; });
          prochain = sim.t + 0.0037; // pas commensurable avec 50 Hz
        }
      }
      sim.courants();
    },
    atteint: i => atteints[i]
  };
  return s;
}

test("elec-06 : LED rouge avec 390 Ω, LED bleue avec 330 Ω, LED sans résistance qui grille", () => {
  const tp = charger("elec-06-led");
  let s = banc(tp);
  // Pile : + en (6,16), − en (10,16).
  const r = s.ajouter("resistance", 0, 10, 0, { R: 390 }, "R1");
  const d = s.ajouter("led", 12, 10, 0, { couleur: "rouge" }, "D1");
  s.fil([6, 16], [0, 16], [0, 10]); s.fil([4, 10], [12, 10]); s.fil([16, 10], [16, 16], [10, 16]);
  s.avancer(0.2);
  assert.ok(s.atteint(0), "LED rouge : " + s.I(d));
  d.p.couleur = "bleue"; r.p.R = 330;
  s.avancer(0.2);
  assert.ok(s.atteint(2), "LED bleue : " + s.I(d));
  s = banc(tp);
  s.ajouter("led", 12, 10, 0, { couleur: "rouge" }, "D1");
  s.fil([6, 16], [0, 16], [0, 10], [12, 10]); s.fil([16, 10], [16, 16], [10, 16]);
  s.avancer(0.5);
  assert.ok(s.atteint(3), "la LED sans résistance doit griller");
});

test("elec-09 : charge, décharge et constantes de temps du condensateur", () => {
  const tp = charger("elec-09-condensateur");
  const s = banc(tp);
  s.trouver("K1").p.haut = false; // position « pile »
  s.avancer(6);
  assert.ok(s.atteint(0), "charge > 9,9 V : " + s.trouver("C1")._v);
  s.trouver("K1").p.haut = true;
  s.avancer(7);
  assert.ok(s.atteint(1), "décharge : " + s.trouver("C1")._v);
  s.trouver("R1").p.R = 47000; s.trouver("K1").p.haut = false;
  s.avancer(6);
  assert.ok(s.atteint(2));
  s.trouver("R1").p.R = 1000;
  s.avancer(0.1);
  assert.ok(s.atteint(3));
});

test("elec-10 : la diode de roue libre supprime l'étincelle et valide l'objectif 3", () => {
  const tp = charger("elec-10-bobine");
  const s = banc(tp), k = s.trouver("K1");
  k.p.ferme = true; s.avancer(1);
  assert.ok(s.atteint(0), "courant établi");
  k.p.ferme = false; s.avancer(0.5);
  assert.ok(s.atteint(1), "étincelle sans diode");
  assert.ok(!s.atteint(2), "sans diode, l'objectif 3 ne doit pas être validé");
  // Diode : cathode (borne 1) en haut de la bobine (côté +), anode en bas.
  s.ajouter("diode", 24, 12, 270, {}, "D1");
  s.fil([24, 8], [22, 8], [20, 8]); s.fil([24, 12], [20, 12]);
  k.p.ferme = true; s.avancer(1);
  k.p.ferme = false; s.avancer(1);
  assert.ok(s.atteint(2), "avec la diode, tension inverse " + s.trouver("L1")._uinv);
  assert.ok(!(s.trouver("D1").etat && s.trouver("D1").etat.grille), "la diode de roue libre ne grille pas");
});

test("elec-10 : une diode branchée dans le mauvais sens court-circuite la pile et grille", () => {
  const tp = charger("elec-10-bobine");
  const s = banc(tp), k = s.trouver("K1");
  s.ajouter("diode", 24, 8, 90, {}, "D1"); // anode en haut (côté +) : conduit en direct
  s.fil([24, 8], [22, 8], [20, 8]); s.fil([24, 12], [20, 12]);
  k.p.ferme = true; s.avancer(0.2);
  assert.ok(s.trouver("D1").etat.grille);
  assert.ok(!s.atteint(2));
});

test("elec-14 : redressement simple alternance et lissage sans griller la diode", () => {
  const tp = charger("elec-14-redressement");
  const s = banc(tp);
  s.avancer(0.1);
  assert.ok(s.atteint(0), "simple alternance");
  s.ajouter("condensateur", 26, 8, 90, { C: 470e-6 }, "C1");
  s.fil([26, 8], [22, 8]); s.fil([26, 12], [22, 12]);
  s.avancer(3.2);
  assert.ok(s.atteint(2), "ondulation < 1,5 V");
  assert.ok(!(s.trouver("D1").etat && s.trouver("D1").etat.grille), "la diode supporte l'appel de courant du condensateur");
});

test("elec-15 : la Zener régule entre 9 et 15 V, et grille sans résistance série", () => {
  const tp = charger("elec-15-zener");
  const s = banc(tp), g = s.trouver("G1");
  g.p.U = 9; s.avancer(1);
  g.p.U = 15; s.avancer(1);
  assert.ok(s.atteint(0), "V1 = " + s.trouver("V1")._mesure);
  g.p.U = 12; s.trouver("Rch").p.R = 100; s.avancer(1);
  assert.ok(s.atteint(1), "décrochage avec Rch = 100 Ω");
  const z = s.trouver("DZ1");
  s.trouver("R1").p.R = 1; s.trouver("R1").p.Pmax = 5; s.trouver("Rch").p.R = 1000; s.avancer(1);
  assert.ok(z.etat.grille, "Zener sans résistance série : grillée");
});

test("elec-16 : LED commandée, régime linéaire, moteur avec TIP31 et diode de roue libre", () => {
  const tp = charger("elec-16-transistor");
  const s = banc(tp), t = s.trouver("T1");
  s.trouver("K1").p.ferme = true; s.avancer(0.2);
  assert.ok(s.atteint(0));
  s.trouver("Rb").p.R = 1e6; s.avancer(0.2);
  assert.ok(s.atteint(2), "linéaire : Ic = " + (t._i && t._i[1]));
  // Moteur à la place de Rc et de la LED, diode en inverse sur le moteur, TIP31, Rb = 220 Ω.
  s.enlever("Rc", "D1");
  s.enleverFils(f => JSON.stringify(f.pts) === "[[24,2],[24,4]]" || JSON.stringify(f.pts) === "[[24,8],[18,8]]");
  s.ajouter("moteur", 20, 2, 90, { charge: 10 }, "M1");
  s.fil([20, 6], [20, 8], [18, 8]);
  s.ajouter("diode", 24, 6, 270, {}, "DRL");
  s.fil([24, 2], [20, 2]); s.fil([24, 6], [20, 6]);
  s.trouver("Rb").p.R = 220; t.p.modele = "TIP31 (puissance)";
  s.avancer(2);
  assert.ok(s.atteint(3), "moteur : " + s.trouver("M1")._w);
});

test("elec-16 : avec un BC547, le courant de démarrage du moteur le grille ; sans diode, surtension à la coupure", () => {
  const tp = charger("elec-16-transistor");
  let s = banc(tp);
  s.enlever("Rc", "D1");
  s.enleverFils(f => JSON.stringify(f.pts) === "[[24,2],[24,4]]" || JSON.stringify(f.pts) === "[[24,8],[18,8]]");
  s.ajouter("moteur", 20, 2, 90, { charge: 10 }, "M1");
  s.fil([20, 6], [20, 8], [18, 8]);
  s.trouver("Rb").p.R = 220; s.trouver("K1").p.ferme = true;
  s.avancer(1);
  assert.ok(s.trouver("T1").etat.grille, "BC547 grillé par 4 A");
  s = banc(tp);
  s.enlever("Rc", "D1");
  s.enleverFils(f => JSON.stringify(f.pts) === "[[24,2],[24,4]]" || JSON.stringify(f.pts) === "[[24,8],[18,8]]");
  s.ajouter("moteur", 20, 2, 90, { charge: 10 }, "M1");
  s.fil([20, 6], [20, 8], [18, 8]);
  const t = s.trouver("T1");
  t.p.modele = "TIP31 (puissance)"; s.trouver("Rb").p.R = 220; s.trouver("K1").p.ferme = true;
  s.avancer(1);
  s.trouver("K1").p.ferme = false; s.avancer(0.05);
  assert.ok((t.etat.avalanches || 0) > 0, "avalanche C-E à la coupure sans diode");
  assert.ok(!s.atteint(3));
});

test("em-01 : relais, étincelle sans diode, plus d'étincelle avec la diode de roue libre", () => {
  const tp = charger("em-01-relais-moteur");
  const s = banc(tp), bp = s.trouver("BP1");
  bp._appui = true; s.avancer(1.5);
  assert.ok(s.atteint(0), "moteur : " + s.trouver("M1")._w);
  bp._appui = false; s.avancer(0.2);
  assert.ok((bp.etat.etincelles || 0) > 0, "étincelle sur le bouton sans diode");
  s.ajouter("diode", 13, 10, 270, {}, "DRL");
  s.fil([13, 6], [16, 6]); s.fil([13, 10], [16, 10]);
  bp._appui = true; s.avancer(0.5);
  bp._appui = false; s.avancer(0.5);
  assert.ok(s.atteint(3), "objectif 4 avec la diode");
});

test("elec-08 : le fusible de 10 A coupe un court-circuit phase-neutre ; voltmètre AC ≈ 220 V", () => {
  const tp = charger("elec-08-va-et-vient");
  const s = banc(tp);
  // Navettes : sorties de S1 (14,5) et (14,7) vers celles de S2 (22,5) et (22,7).
  s.fil([14, 5], [22, 5]); s.fil([14, 7], [22, 7]);
  s.trouver("S2").p.haut = false;
  s.ajouter("voltmetre", 36, 10, 90, { mode: "alternatif (AC, efficace)" }, "V1");
  s.fil([36, 10], [32, 10]); s.fil([36, 14], [32, 14]);
  s.avancer(1);
  assert.ok(s.atteint(0), "lampe allumée : " + s.trouver("L1")._ueff);
  assert.ok(s.atteint(2), "voltmètre AC : " + s.trouver("V1")._mesure);
  // Court-circuit : de la sortie de S2 au neutre.
  s.fil([26, 6], [26, 22]);
  s.avancer(0.1);
  assert.ok(s.trouver("F1").etat.grille, "fusible fondu");
  s.enleverFils(f => JSON.stringify(f.pts) === "[[26,6],[26,22]]");
  s.trouver("F1").etat.grille = false; s.trouver("F1").etat.chauffe = 0;
  s.avancer(0.5);
  assert.ok(s.atteint(3), "lampe rallumée après réparation");
});
