/* Journal d'utilisation : fonctions pures du navigateur, et le serveur Node de bout en bout. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");
const stock = {};
global.window = global;
global.LS = { lire: (k, d) => (k in stock ? JSON.parse(stock[k]) : d), ecrire: (k, v) => { stock[k] = JSON.stringify(v); } };
require(path.join(__dirname, "..", "assets", "js", "journal.js"));
const J = global.LS.journal;
const APP = path.join(__dirname, "..", "serveur", "app.js");

test("catégorie d'appareil sans garder l'user-agent", () => {
  const android = "Mozilla/5.0 (Linux; Android 12; itel A70) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  assert.deepStrictEqual(J.categorieAppareil(android, 393, 5), { type: "telephone", os: "android", largeur: 400 });
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36", 800, 5).type, "tablette");
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", 820, 5).os, "ios");
  assert.deepStrictEqual(J.categorieAppareil("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", 1366, 0), { type: "ordinateur", os: "windows", largeur: 1350 });
});

test("file bornée : on garde les plus récents ; opposition : rien n'est gardé", () => {
  let f = [];
  for (let i = 0; i < 12; i++) f = J.ajouterFile(f, { n: i }, false, 10);
  assert.strictEqual(f.length, 10);
  assert.strictEqual(f[0].n, 2);
  assert.deepStrictEqual(J.ajouterFile(f, { n: 99 }, true, 10), []);
  // Par défaut (pas d'opposition), les événements sont notés.
  global.LS.journal.noter({ e: "page", p: "accueil" });
  assert.strictEqual(global.LS.journal.enAttente(), 1);
  global.LS.journal.opposer(true);
  global.LS.journal.noter({ e: "page", p: "accueil" });
  assert.strictEqual(global.LS.journal.enAttente(), 0, "opposition : file vidée et plus rien noté");
  global.LS.journal.opposer(false);
});

test("lot non confirmé renvoyé avec le même identifiant", () => {
  let n = 0;
  const id = () => "lot" + (++n);
  const a = J.prochainLot([1, 2, 3], null, id, 2);
  assert.deepStrictEqual(a.lot, { id: "lot1", evs: [1, 2] });
  assert.deepStrictEqual(a.file, [3]);
  const b = J.prochainLot(a.file, a.lot, id, 2);  // pas de confirmation : même lot
  assert.strictEqual(b.lot.id, "lot1");
  assert.deepStrictEqual(b.file, [3]);
  assert.strictEqual(J.prochainLot([], null, id).lot, null);
});

test("temps actif : seulement page visible et interaction de moins de 60 s", () => {
  let e = { dernierTic: 0, derniereInteraction: 0, actifMs: 0 };
  e = J.tic(e, 5000, true);
  e = J.tic(e, 10000, false);
  e = J.tic(e, 15000, true);
  assert.strictEqual(e.actifMs, 10000);
  e = J.tic(e, 70000, true);
  assert.strictEqual(e.actifMs, 10000, "plus de 60 s sans interaction");
  e = Object.assign(e, { derniereInteraction: 95000 });
  e = J.tic(e, 100000, true);
  assert.strictEqual(e.actifMs, 20000, "trou de 30 s (veille) plafonné à deux intervalles");
});

test("pages et gains traduits en événements", () => {
  assert.deepStrictEqual(J.pageDe("/learn/tp.html", "?id=elec-06-led"), { p: "tp", id: "elec-06-led" });
  assert.deepStrictEqual(J.pageDe("/learn/", ""), { p: "accueil", id: "" });
  assert.deepStrictEqual(J.pageDe("/learn/confidentialite.html", ""), { p: "autre", id: "confidentialite" });
  assert.deepStrictEqual(J.evenementDeGain("o:elec-06-led@1:2", 5), { t: 5, e: "objectif", id: "elec-06-led@1", i: 2 });
  assert.deepStrictEqual(J.evenementDeGain("n:elec-bases/loi-d-ohm", 5), { t: 5, e: "notion", noeud: "elec-bases/loi-d-ohm" });
  assert.strictEqual(J.evenementDeGain("tp:x", 5), null);
  assert.match(J.nouvelIdentifiant(), /^[0-9a-f]{32}$/);
});

test("serveur Node : accepté, dédoublonné, refusé, limite de débit, aucune IP, tableau de bord protégé", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const hash = spawnSync(process.execPath, [APP, "--hacher", "mot-de-passe-essai"]).stdout.toString().trim();
  const config = path.join(dossier, "config.json");
  fs.writeFileSync(config, JSON.stringify({ origines: ["https://learnspace.exemple"], dossierDonnees: path.join(dossier, "donnees"), adminHash: hash, base: "/api", limiteLots10min: 3, cookieSecure: false }));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const serveur = spawn(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: String(port), LS_CONFIG: config }), stdio: "ignore" });
  const url = `http://127.0.0.1:${port}/api`;
  try {
    for (let k = 0; k < 50; k++) { try { if ((await fetch(url + "/sante")).ok) break; } catch (e) { /* pas encore prêt */ } await new Promise(r => setTimeout(r, 100)); }
    const t = Math.floor(Date.now() / 1000), appareil = "0123456789abcdef0123456789abcdef";
    const lot = id => ({ v: 1, lot: id, appareil, cat: { type: "telephone", os: "android", largeur: 400 }, niveau: 1,
      evs: [{ t, e: "page", p: "tp", id: "elec-06-led" }, { t, e: "temps", p: "tp", id: "elec-06-led", ms: 12000 }, { t, e: "objectif", id: "elec-06-led", i: 0, ms: 30000 },
        { t, e: "piratage", id: "x" }, { t, e: "page", p: "tp", id: "<script>" }] });
    const poster = (corps, entetes) => fetch(url + "/journal", { method: "POST", body: JSON.stringify(corps), headers: Object.assign({ "X-Forwarded-For": "41.73.1.2" }, entetes || {}) });
    const id1 = "a".repeat(32);
    assert.strictEqual((await poster(lot(id1))).status, 204);
    assert.strictEqual((await poster(lot(id1))).status, 204, "lot renvoyé : confirmé sans être recompté");
    assert.strictEqual((await poster(Object.assign(lot("b".repeat(32)), { appareil: "pas-un-numero" }))).status, 400);
    assert.strictEqual((await poster(lot("c".repeat(32)), { Origin: "https://autre-site.example" })).status, 403);
    const cors = await poster(lot("d".repeat(32)), { Origin: "https://learnspace.exemple" });
    assert.strictEqual(cors.status, 204);
    assert.strictEqual(cors.headers.get("access-control-allow-origin"), "https://learnspace.exemple");
    assert.strictEqual((await fetch(url + "/journal")).status, 405);
    let r;
    for (let k = 0; k < 3; k++) r = await poster(lot((k + 1).toString(16).repeat(32)));
    assert.strictEqual(r.status, 429, "limite de débit");
    // Fichiers : 3 lots enregistrés (id1, d…, puis un seul avant la limite), sans adresse IP ni user-agent.
    const fichiers = fs.readdirSync(path.join(dossier, "donnees", "evenements"));
    const contenu = fichiers.map(f => fs.readFileSync(path.join(dossier, "donnees", "evenements", f), "utf8")).join("");
    const lots = contenu.trim().split("\n").map(l => JSON.parse(l));
    assert.strictEqual(new Set(lots.map(l => l.lot)).size, lots.length, "aucun lot en double");
    assert.ok(lots.every(l => l.evs.length === 3), "les 2 événements invalides sont ignorés");
    assert.ok(!contenu.includes("41.73") && !/forwarded|ip|agent|Mozilla/i.test(contenu), "aucune IP ni user-agent dans les fichiers");
    if (process.platform !== "win32") assert.strictEqual(fs.statSync(path.join(dossier, "donnees", "evenements", fichiers[0])).mode & 0o077, 0, "fichier lisible par son seul propriétaire");
    // Tableau de bord
    let p = await fetch(url + "/admin/export.csv", { redirect: "manual" });
    assert.strictEqual(p.status, 401, "export refusé sans session");
    p = await fetch(url + "/admin/connexion", { method: "POST", body: "mdp=faux", headers: { "Content-Type": "application/x-www-form-urlencoded" }, redirect: "manual" });
    assert.strictEqual(p.status, 401);
    p = await fetch(url + "/admin/connexion", { method: "POST", body: "mdp=mot-de-passe-essai", headers: { "Content-Type": "application/x-www-form-urlencoded" }, redirect: "manual" });
    assert.strictEqual(p.status, 303);
    const cookie = p.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
    const jeton = cookie.split(";")[0];
    const tab = await (await fetch(url + "/admin", { headers: { Cookie: jeton } })).text();
    assert.match(tab, /appareils actifs/);
    assert.match(tab, /elec-06-led/);
    const csv = await (await fetch(url + "/admin/export.csv", { headers: { Cookie: jeton } })).text();
    assert.match(csv, /objectif/);
    const purge = await (await fetch(url + "/admin/purger", { method: "POST", body: "quoi=tout&confirmer=EFFACER&csrf=mauvais", headers: { Cookie: jeton, "Content-Type": "application/x-www-form-urlencoded" } })).text();
    assert.match(purge, /Session expirée/, "purge refusée sans jeton CSRF");
  } finally {
    serveur.kill();
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});
