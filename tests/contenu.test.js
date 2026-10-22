/* Cohérence du contenu : parcours, cartes mentales, TP. Lancer : node --test tests/*.test.js */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const racine = path.join(__dirname, "..");
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cartes = {}, tps = {};
global.window = global;
global.LS = { ajouterCarte: c => { cartes[c.id] = c; }, ajouterTP: t => { tps[t.id] = t; } };
require(path.join(racine, "contenu", "parcours.js"));
for (const f of fs.readdirSync(path.join(racine, "contenu", "cartes"))) require(path.join(racine, "contenu", "cartes", f));
for (const f of fs.readdirSync(path.join(racine, "contenu", "tps"))) require(path.join(racine, "contenu", "tps", f));
const noeuds = c => { const l = []; (function p(n, niv) { l.push([n, niv]); (n.c || []).forEach(e => p(e, niv + 1)); })(c.racine, 0); return l; };
const sims = new Set(["circuit", "logique"]);
for (const f of fs.readdirSync(path.join(racine, "assets", "js", "sims"))) {
  const src = fs.readFileSync(path.join(racine, "assets", "js", "sims", f), "utf8");
  for (const m of src.matchAll(/LS\.sims\.(\w+) = function/g)) sims.add(m[1]);
}

test("chaque étape du parcours existe", () => {
  const manquants = [];
  LS.parcours.forEach(d => d.etapes.forEach(e => { if (!(e.type === "carte" ? cartes[e.id] : tps[e.id])) manquants.push(e.type + ":" + e.id); }));
  assert.deepStrictEqual(manquants, []);
});

test("chaque carte et chaque TP figure dans le parcours", () => {
  const ids = new Set();
  LS.parcours.forEach(d => d.etapes.forEach(e => ids.add(e.type + ":" + e.id)));
  const orphelins = Object.keys(cartes).map(k => "carte:" + k).concat(Object.keys(tps).map(k => "tp:" + k)).filter(k => !ids.has(k));
  assert.deepStrictEqual(orphelins, []);
});

test("libellés uniques dans chaque carte, définitions présentes sur les feuilles", () => {
  const pb = [];
  for (const c of Object.values(cartes)) {
    const vus = {};
    noeuds(c).forEach(([n, niv]) => {
      const s = slug(n.t);
      if (vus[s]) pb.push(`${c.id} : libellé en double « ${n.t} »`);
      vus[s] = true;
      if (niv > 0 && !(n.c && n.c.length) && !n.d) pb.push(`${c.id} : « ${n.t} » sans définition`);
    });
  }
  assert.deepStrictEqual(pb, []);
});

test("liens « voir aussi » et TP cités par les cartes", () => {
  const pb = [];
  for (const c of Object.values(cartes)) {
    const index = new Set(noeuds(c).map(([n]) => slug(n.t)));
    noeuds(c).forEach(([n]) => {
      (n.voir || []).forEach(v => { if (!index.has(slug(v))) pb.push(`${c.id} : « ${n.t} » voit « ${v} » absent`); });
      [].concat(n.tp || []).forEach(t => { if (!tps[t]) pb.push(`${c.id} : « ${n.t} » cite le TP inconnu ${t}`); });
    });
  }
  assert.deepStrictEqual(pb, []);
});

test("notions des TP présentes dans les cartes, simulations existantes", () => {
  const pb = [];
  for (const t of Object.values(tps)) {
    if (!sims.has(t.sim)) pb.push(`${t.id} : simulation inconnue ${t.sim}`);
    (t.notions || []).forEach(([c, n]) => {
      if (!cartes[c]) pb.push(`${t.id} : carte inconnue ${c}`);
      else if (!noeuds(cartes[c]).some(([x]) => slug(x.t) === slug(n))) pb.push(`${t.id} : notion « ${n} » absente de ${c}`);
    });
    (t.questions || []).forEach((q, i) => { if (!(q.bonne >= 0 && q.bonne < q.choix.length)) pb.push(`${t.id} : question ${i + 1} sans bonne réponse valide`); });
    (t.objectifs || []).forEach((o, i) => {
      const reponse = typeof o.saisie === "function" || (o.reponse && o.reponse.valeur !== undefined);
      if (typeof o.verif !== "function" && !reponse) pb.push(`${t.id} : objectif ${i + 1} sans vérification ni réponse attendue`);
    });
  }
  assert.deepStrictEqual(pb, []);
});
