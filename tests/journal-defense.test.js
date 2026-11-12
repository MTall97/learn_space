/* Journal : défenses ajoutées après l'avis du juge du 12/11 (bourrage, liste blanche relue et rejets
   signalés, premières réussites, fichiers de forme inattendue, quarantaine purgée, secret sans hasard,
   course sur la reprise du verrou). Serveur Node lancé sur un port au hasard. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const RACINE = path.join(__dirname, "..");
const APP = path.join(RACINE, "serveur", "app.js");
const LISTE = path.join(RACINE, "serveur", "liste-blanche.json");
const hash = spawnSync(process.execPath, [APP, "--hacher"], { input: "mdp-essai\n" }).stdout.toString().trim();
const SECRET = crypto.randomBytes(32).toString("hex");
const maintenant = () => Math.floor(Date.now() / 1000);
const jourUTC = d => new Date(Date.now() + (d || 0) * 86400000).toISOString().slice(0, 10);
const id = () => crypto.randomBytes(16).toString("hex");
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "journal-def-"));

async function serveur(dossier, config) {
  const fichier = path.join(dossier, "config-" + id().slice(0, 6) + ".json");
  fs.writeFileSync(fichier, JSON.stringify(Object.assign({ dossierDonnees: path.join(dossier, "donnees"), adminHash: hash, secretSession: SECRET, base: "/api", cookieSecure: false }, config)));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: String(port), LS_CONFIG: fichier }), stdio: ["ignore", "ignore", "pipe"] });
  let erreurs = ""; p.stderr.on("data", d => { erreurs += d; });
  const url = `http://127.0.0.1:${port}/api`;
  for (let k = 0; k < 80; k++) { try { if ((await fetch(url + "/sante")).ok) break; } catch (e) { /* pas encore prêt */ } await new Promise(r => setTimeout(r, 100)); }
  return { url, arreter: () => p.kill(), erreurs: () => erreurs };
}
const poster = (url, corps, xff) => fetch(url + "/journal", { method: "POST", body: typeof corps === "string" ? corps : JSON.stringify(corps), headers: { "X-Forwarded-For": xff || "41.73.1.2" } });
const lot = (evs, plus) => Object.assign({ v: 2, lot: id(), envoi: maintenant(), evs }, plus || {});
const totaux = dossier => JSON.parse(fs.readFileSync(path.join(dossier, "donnees", "agregats", jourUTC() + ".json"), "utf8"));
async function connexion(url) {
  const r = await fetch(url + "/admin/connexion", { method: "POST", body: "mdp=mdp-essai", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Forwarded-For": "6.6.6.6" } });
  return { Cookie: r.headers.get("set-cookie").split(";")[0] };
}

test("bourrage : champs inconnus refusés, corps de 16 Ko au plus, octets validés comptés, plafond d'octets par adresse, ms borné", async () => {
  const dossier = temp();
  const a = await serveur(dossier, { plafondOctetsIpJour: 1500, limiteLots10min: 10000 });
  try {
    const t = maintenant(), page = { t, e: "page", p: "accueil", id: "" };
    assert.strictEqual((await poster(a.url, lot([page], { bourrage: "x".repeat(1000) }))).status, 400, "champ inconnu dans le lot");
    assert.strictEqual((await poster(a.url, lot([Object.assign({ b: "x" }, page)]))).status, 400, "champ inconnu dans un événement");
    assert.strictEqual((await poster(a.url, lot([page], { liste: "x".repeat(17000) }))).status, 413, "corps de plus de 16 Ko");
    // Tranche de temps de 40 min : refusée (comptée parmi les rejets), pas ajoutée au temps de la page.
    assert.strictEqual((await poster(a.url, lot([page, { t, e: "temps", p: "accueil", id: "", ms: 40 * 60000 }]), "9.9.9.9")).status, 204);
    let j = totaux(dossier);
    assert.strictEqual(j.pages.accueil.ms, 0);
    assert.strictEqual(j.rejetes, 1);
    assert.ok(j.octets < 200, "octets des événements validés : " + j.octets);
    // Une seule adresse ne peut pas dépasser son plafond d'octets du jour ; une autre adresse passe encore.
    let statut = 204, n = 0;
    while (statut === 204 && n < 200) { statut = (await poster(a.url, lot(Array.from({ length: 20 }, () => page)), "203.0.113.5")).status; n++; }
    assert.strictEqual(statut, 429, "plafond d'octets par adresse atteint après " + n + " lots");
    assert.ok(n < 50);
    assert.strictEqual((await poster(a.url, lot([page]), "198.51.100.7")).status, 204, "une autre adresse passe");
  } finally { a.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("liste blanche : rejets et version du site signalés, liste relue quand elle change (sans redémarrer)", async () => {
  const dossier = temp(), copie = path.join(dossier, "liste.json");
  const brut = JSON.parse(fs.readFileSync(LISTE, "utf8"));
  const sans = Object.assign({}, brut, { tps: Object.assign({}, brut.tps) });
  delete sans.tps["elec-06-led"];
  fs.writeFileSync(copie, JSON.stringify(sans));
  const a = await serveur(dossier, { listeBlanche: copie });
  try {
    const t = maintenant();
    assert.strictEqual((await poster(a.url, lot([{ t, e: "tp_debut", id: "elec-06-led" }], { liste: "ffff" }))).status, 204);
    let j = totaux(dossier);
    assert.strictEqual(j.rejetes, 1, "événement d'un TP inconnu compté parmi les rejets");
    assert.strictEqual(j.autreListe, 1, "lot d'une autre version du site compté");
    const html = await (await fetch(a.url + "/admin", { headers: await connexion(a.url) })).text();
    assert.match(html, /refusé\(s\) ces 7 derniers jours/);
    assert.match(html, /version du site différente de la liste blanche/);
    // Nouvelle liste recopiée : relue dans les 5 s.
    fs.writeFileSync(copie, JSON.stringify(brut));
    const futur = new Date(Date.now() + 2000); fs.utimesSync(copie, futur, futur);
    await new Promise(r => setTimeout(r, 5200));
    assert.strictEqual((await poster(a.url, lot([{ t, e: "tp_debut", id: "elec-06-led" }], { liste: brut.empreinte }))).status, 204);
    j = totaux(dossier);
    assert.strictEqual(j.tps["elec-06-led"].ouverts, 1, "le TP est accepté après relecture");
    assert.strictEqual(j.autreListe, 1, "même version : pas d'alerte de plus");
    assert.match(a.erreurs(), /liste blanche relue/);
  } finally { a.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("premières réussites : ouvertures avec objectifs déjà réussis et TP déjà terminé, taux sur les ouvertures sans réussite antérieure", async () => {
  const dossier = temp();
  fs.mkdirSync(path.join(dossier, "donnees", "agregats"), { recursive: true });
  // Hier : 10 ouvertures, dont 5 où l'objectif 1 était déjà réussi et le TP déjà terminé ; 5 premières réussites.
  fs.writeFileSync(path.join(dossier, "donnees", "agregats", jourUTC(-1) + ".json"), JSON.stringify({ lots: 10, octets: 1, visites: { total: 10, retour: {}, niveau: {}, type: {}, os: {}, largeur: {} },
    paliers: {}, pages: {}, tps: { "elec-06-led": { ouverts: 10, dejaTermines: 5, finis: 5, msFin: 50000 } },
    objectifs: { "elec-06-led|0": { reussis: 5, ms: 5000, essais: 0, rates: 0, dejaFaits: 5 } }, questions: {}, notions: {}, cartes: {} }));
  const a = await serveur(dossier, {});
  try {
    const t = maintenant();
    assert.strictEqual((await poster(a.url, lot([{ t, e: "tp_debut", id: "elec-06-led", faits: [0, 2], deja: true }, { t, e: "tp_debut", id: "elec-06-led", faits: [9] }]))).status, 204);
    const j = totaux(dossier);
    assert.strictEqual(j.tps["elec-06-led"].ouverts, 1, "indice hors limites : ouverture refusée");
    assert.strictEqual(j.tps["elec-06-led"].dejaTermines, 1);
    assert.strictEqual(j.objectifs["elec-06-led|0"].dejaFaits, 1);
    assert.strictEqual(j.objectifs["elec-06-led|2"].dejaFaits, 1);
    assert.strictEqual(j.rejetes, 1);
    const html = await (await fetch(a.url + "/admin?jours=7", { headers: await connexion(a.url) })).text();
    assert.match(html, /première réussite sur cet appareil/);
    assert.match(html, /Ouvertures sans réussite antérieure/);
    assert.match(html, /<td[^>]*>elec-06-led<\/td><td[^>]*>1<\/td><td[^>]*>5<\/td><td[^>]*>5<\/td><td[^>]*>100 %<\/td>/, "5 premières réussites sur 5 ouvertures sans réussite antérieure");
  } finally { a.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("fichiers : forme inattendue mise en quarantaine (pas d'erreur 500), quarantaine et temporaires purgés", async () => {
  const dossier = temp(), agg = path.join(dossier, "donnees", "agregats");
  fs.mkdirSync(agg, { recursive: true });
  const vieux = Date.now() - 800 * 86400000;
  fs.writeFileSync(path.join(agg, "2020-01-01.json.corrompu-" + vieux), "x");
  fs.writeFileSync(path.join(agg, "2026-01-01.json.tmp12345"), "x");
  fs.utimesSync(path.join(agg, "2026-01-01.json.tmp12345"), new Date(Date.now() - 7200000), new Date(Date.now() - 7200000));
  const a = await serveur(dossier, {});
  try {
    await new Promise(r => setTimeout(r, 300));
    assert.ok(!fs.existsSync(path.join(agg, "2020-01-01.json.corrompu-" + vieux)), "quarantaine plus vieille que la conservation : purgée");
    assert.ok(!fs.existsSync(path.join(agg, "2026-01-01.json.tmp12345")), "fichier temporaire abandonné : purgé");
    fs.writeFileSync(path.join(agg, jourUTC() + ".json"), JSON.stringify({ lots: "beaucoup", pages: [1, 2] }));
    const r = await poster(a.url, lot([{ t: maintenant(), e: "page", p: "accueil", id: "" }]));
    assert.strictEqual(r.status, 503, "forme inattendue : 503 (le lot sera renvoyé), pas 500");
    assert.ok(fs.readdirSync(agg).some(f => f.startsWith(jourUTC() + ".json.corrompu-")));
    assert.strictEqual((await poster(a.url, lot([{ t: maintenant(), e: "page", p: "accueil", id: "" }]))).status, 204);
    // « Tout effacer » efface aussi la quarantaine.
    const jeton = await connexion(a.url), html = await (await fetch(a.url + "/admin", { headers: jeton })).text();
    const csrf = /name="csrf" value="([^"]+)"/.exec(html)[1];
    await fetch(a.url + "/admin/purger", { method: "POST", body: "quoi=tout&confirmer=EFFACER&csrf=" + encodeURIComponent(csrf), headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, jeton) });
    assert.deepStrictEqual(fs.readdirSync(agg), []);
  } finally { a.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("secret de session sans hasard refusé au démarrage", () => {
  const dossier = temp();
  for (const secret of ["0".repeat(64), "ab".repeat(32), "0123456789abcdef".repeat(4)]) {
    const r = spawnSync(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: "0", LS_CONFIG: path.join(dossier, "absent.json"), LS_SECRET_SESSION: secret, LS_DONNEES: path.join(dossier, "d") }), timeout: 5000 });
    assert.strictEqual(r.status, 1, secret);
    assert.match(r.stderr.toString(), /secretSession/);
  }
  fs.rmSync(dossier, { recursive: true, force: true });
});

// Code de avecVerrou extrait tel quel d'app.js (comme le script course-verrou.js du juge).
function verrouDe(fsImpl, VERROU) {
  const src = fs.readFileSync(APP, "utf8");
  const code = src.slice(src.indexOf("  async function avecVerrou"), src.indexOf("  /* --- Lots déjà reçus"));
  return vm.runInNewContext("(function(){" + code + ";return avecVerrou;})()", { fs: fsImpl, crypto, VERROU, Date, console: { error() {} }, setTimeout, dormir: ms => new Promise(r => setTimeout(r, ms)) });
}

test("verrou : un verrou abandonné est repris ; un verrou pris entre-temps par un autre processus n'est pas volé", async () => {
  const dossier = temp(), VERROU = path.join(dossier, "verrou");
  const vieux = new Date(Date.now() - 60000);
  // 1. Verrou abandonné : repris, la section critique s'exécute, le verrou est retiré.
  fs.writeFileSync(VERROU, "mort"); fs.utimesSync(VERROU, vieux, vieux);
  let passe = false;
  await verrouDe(fs, VERROU)(() => { passe = true; });
  assert.ok(passe);
  assert.ok(!fs.existsSync(VERROU));
  // 2. Scénario du juge : P2 voit le verrou abandonné, mais P1 le reprend juste avant que P2 ne le renomme.
  fs.writeFileSync(VERROU, "mort"); fs.utimesSync(VERROU, vieux, vieux);
  let fait = false;
  const fsP2 = Object.assign({}, fs, { statSync: p => { const st = fs.statSync(p); if (!fait) { fait = true; fs.unlinkSync(VERROU); fs.writeFileSync(VERROU, "jeton-de-P1", { flag: "wx" }); } return st; } });
  let p2Dedans = false;
  await assert.rejects(verrouDe(fsP2, VERROU)(() => { p2Dedans = true; }), /verrou indisponible/);
  assert.strictEqual(p2Dedans, false, "P2 n'entre pas pendant que P1 tient le verrou");
  assert.strictEqual(fs.readFileSync(VERROU, "utf8"), "jeton-de-P1", "le verrou de P1 est remis en place");
  fs.rmSync(dossier, { recursive: true, force: true });
});
