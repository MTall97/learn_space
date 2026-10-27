/* Journal d'utilisation anonyme : fonctions pures du navigateur, client complet dans un navigateur
   simulé, et serveur Node de bout en bout (un ou deux processus sur le même dossier). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const vm = require("node:vm");
const nodeCrypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const RACINE = path.join(__dirname, "..");
const APP = path.join(RACINE, "serveur", "app.js");
const SOURCE_CLIENT = fs.readFileSync(path.join(RACINE, "assets", "js", "journal.js"), "utf8");

// Fonctions pures : le script se charge sous Node sans document.
const pur = { LS: {} };
pur.window = pur;
vm.runInNewContext(SOURCE_CLIENT, pur);
const J = pur.LS.journal;

test("catégorie d'appareil grossière, combinaisons rares simplifiées", () => {
  const android = "Mozilla/5.0 (Linux; Android 12; itel A70) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  assert.deepStrictEqual({ ...J.categorieAppareil(android, 393, 5) }, { type: "telephone", os: "android", largeur: "<400" });
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36", 800, 5).type, "tablette");
  assert.deepStrictEqual({ ...J.categorieAppareil("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", 1366, 0) }, { type: "ordinateur", os: "windows", largeur: "1280+" });
  // Téléphone sous Linux : combinaison rare, système simplifié en « autre ».
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (X11; Linux x86_64) Mobile", 360, 5).os, "autre");
});

test("catégorie de retour sans envoyer la date", () => {
  assert.strictEqual(J.categorieRetour(null, "2026-10-23"), "premiere");
  assert.strictEqual(J.categorieRetour("2026-10-20", "2026-10-23"), "moins7");
  assert.strictEqual(J.categorieRetour("2026-10-01", "2026-10-23"), "7a30");
  assert.strictEqual(J.categorieRetour("2026-08-01", "2026-10-23"), "plus30");
  assert.deepStrictEqual([...J.paliersFranchis(50000, 70000)], [1]);
  assert.deepStrictEqual([...J.paliersFranchis(0, 16 * 60000)], [1, 5, 15]);
});

test("file bornée, tranches de temps fusionnées, lot renvoyé avec le même identifiant", () => {
  let f = [];
  for (let i = 0; i < 12; i++) f = J.ajouterFile(f, { e: "page", n: i }, false, 10);
  assert.strictEqual(f.length, 10);
  assert.strictEqual(f[0].n, 2);
  assert.strictEqual(J.ajouterFile(f, { e: "page" }, true, 10).length, 0);
  let g = J.ajouterFile([], { e: "temps", p: "tp", id: "a", ms: 5000 }, false);
  g = J.ajouterFile(g, { e: "temps", p: "tp", id: "a", ms: 3000 }, false);
  assert.strictEqual(g.length, 1); assert.strictEqual(g[0].ms, 8000);
  let n = 0;
  const id = () => "lot" + (++n);
  const a = J.prochainLot([1, 2, 3], [], id, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a.lot)), { id: "lot1", evs: [1, 2] });
  assert.strictEqual(J.prochainLot(a.file, a.lots, id, 2).lot.id, "lot1");
});

test("temps actif et traduction des gains", () => {
  let e = { dernierTic: 0, derniereInteraction: 0, actifMs: 0 };
  e = J.tic(e, 5000, true); e = J.tic(e, 10000, false); e = J.tic(e, 15000, true);
  assert.strictEqual(e.actifMs, 10000);
  e = J.tic(e, 70000, true);
  assert.strictEqual(e.actifMs, 10000, "plus de 60 s sans interaction");
  assert.strictEqual(J.evenementDeGain("o:elec-06-led@1:2", 5).id, "elec-06-led@1");
  assert.strictEqual(J.evenementDeGain("q:elec-06-led:0", 5), null, "les questions viennent de ls:essai");
  assert.strictEqual(J.evenementDeGain("n:elec-bases/loi-d-ohm", 5).noeud, "elec-bases/loi-d-ohm");
});

/* ---------- Client complet dans un navigateur simulé ---------- */
function navigateur(opts) {
  const stock = new Map(Object.entries(opts.stock || {})), sessionStock = opts.session || new Map();
  const ecouteurs = {}, appels = [];
  let elementsCrees = 0, maintenant = opts.maintenant || Date.now();
  const element = () => ({ setAttribute() {}, append() {}, prepend() {}, after() {}, remove() {}, querySelector: () => ({ addEventListener() {} }) });
  const document = {
    visibilityState: "visible", readyState: "complete",
    addEventListener: (t, f) => { (ecouteurs[t] = ecouteurs[t] || []).push(f); },
    getElementById: () => null, querySelector: () => null,
    createElement: () => { elementsCrees++; return element(); },
    head: element(), body: element()
  };
  const magasin = (m, quota) => ({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (quota && v.length > quota) throw new Error("QuotaExceededError"); m.set(k, String(v)); }, removeItem: k => m.delete(k) });
  class FausseDate extends Date { constructor(...a) { super(...(a.length ? a : [maintenant])); } static now() { return maintenant; } }
  const ctx = {
    LS: Object.assign({ profil: () => ({ niveau: 2 }) }, opts.LS || {}), Date: FausseDate,
    location: new URL(opts.url), document, navigator: { userAgent: "Mozilla/5.0 (Linux; Android 12) Mobile", maxTouchPoints: 5 }, screen: { width: 390 },
    localStorage: magasin(stock, opts.quota), sessionStorage: magasin(sessionStock),
    fetch: (u, o) => { appels.push({ u, o, corps: JSON.parse(o.body) }); return opts.fetch ? opts.fetch(u, o) : Promise.resolve({ ok: true, status: 204 }); },
    crypto: nodeCrypto.webcrypto, URLSearchParams, setTimeout: (f, ms) => { if (!ms) f(); return 0; }, setInterval: () => 0, console
  };
  ctx.window = ctx;
  ctx.window.addEventListener = (t, f) => { (ecouteurs["w:" + t] = ecouteurs["w:" + t] || []).push(f); };
  vm.runInNewContext(SOURCE_CLIENT, ctx);
  const lireCle = k => { const v = stock.get("learnspace:" + k); return v === undefined ? undefined : JSON.parse(v); };
  return {
    ctx, appels, stock, sessionStock, lireCle, J: ctx.LS.journal,
    file: () => lireCle("journalFile") || [],
    elementsCrees: () => elementsCrees,
    avancer: ms => { maintenant += ms; },
    declencher: (t, detail) => (ecouteurs[t] || []).forEach(f => f({ detail })),
    visibilite: v => { document.visibilityState = v; (ecouteurs.visibilitychange || []).forEach(f => f()); },
    attendre: () => new Promise(r => setImmediate(r))
  };
}

test("client : désactivé sans adresse configurée et en file://", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "" } });
  assert.strictEqual(b.J.enAttente(), 0);
  assert.strictEqual(b.elementsCrees(), 0, "pas de bandeau");
  assert.strictEqual(b.stock.size, 0, "rien n'est écrit sur l'appareil");
  const c = navigateur({ url: "file:///home/eleve/learn_space/index.html", LS: { JOURNAL_URL: "https://site.ml/api/journal" } });
  assert.strictEqual(c.J.enAttente(), 0);
  assert.strictEqual(c.elementsCrees(), 0);
});

test("client : aucun identifiant envoyé ni gardé en localStorage ; visite en sessionStorage, perdue après 30 min", async () => {
  const b = navigateur({ url: "https://site.ml/tp.html?id=elec-06-led", LS: { JOURNAL_URL: "/api/journal" },
    stock: { "learnspace:journalDerniereVisite": JSON.stringify("2026-10-01"), "learnspace:journalAppareil": JSON.stringify("a".repeat(32)) } });
  assert.strictEqual(b.lireCle("journalAppareil"), undefined, "ancien numéro d'appareil effacé");
  const visite = b.file().find(e => e.e === "visite");
  assert.ok(visite, "visite notée");
  assert.ok(["moins7", "7a30", "plus30"].includes(visite.retour));
  assert.strictEqual(visite.niveau, 2);
  const id = b.J.visiteEnCours();
  assert.match(id, /^[0-9a-f]{32}$/);
  assert.ok(b.sessionStock.get("learnspace:journalVisite").includes(id));
  for (const [k, v] of b.stock) assert.ok(!v.includes(id), "numéro de visite absent de localStorage (" + k + ")");
  assert.match(b.lireCle("journalDerniereVisite"), /^\d{4}-\d{2}-\d{2}$/);
  b.declencher("ls:essai", { tp: "elec-06-led", objet: "o", i: 0, ok: false });
  b.declencher("ls:essai", { tp: "elec-06-led", objet: "q", i: 1, ok: true });
  b.declencher("ls:gain", { cle: "o:elec-06-led:0" });
  b.J.envoyer();
  await b.attendre();
  const corps = b.appels[0].corps;
  const texte = JSON.stringify(corps);
  assert.ok(!texte.includes(id), "le numéro de visite ne part pas");
  assert.ok(!/appareil|2026-10-0/.test(texte), "ni numéro d'appareil ni date de dernière visite");
  assert.deepStrictEqual(Object.keys(corps).sort(), ["envoi", "evs", "lot", "v"]);
  assert.ok(corps.evs.some(e => e.e === "essai" && e.ok === false));
  // 31 minutes plus tard : nouvelle visite, nouveau numéro, catégorie « moins de 7 jours ».
  b.avancer(31 * 60000);
  b.J.noter({ e: "page", p: "accueil", id: "" });
  assert.notStrictEqual(b.J.visiteEnCours(), id);
  assert.strictEqual(b.file().filter(e => e.e === "visite").pop().retour, "moins7");
});

test("client : un TP compté une fois par visite, paliers de durée", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" } });
  b.J.noter({ e: "tp_debut", id: "x" }); b.J.noter({ e: "tp_debut", id: "x" });
  assert.strictEqual(b.file().filter(e => e.e === "tp_debut").length, 1);
  b.J.noter({ e: "temps", p: "accueil", id: "", ms: 6 * 60000 });
  assert.deepStrictEqual(b.file().filter(e => e.e === "palier").map(e => e.m), [1, 5]);
});

test("client : envoi à la fermeture, lot gardé puis renvoyé avec le même identifiant ; 503 garde le lot", async () => {
  const reponses = [];
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" }, fetch: () => new Promise(ok => reponses.push(ok)) });
  assert.ok(b.elementsCrees() > 0, "information affichée");
  b.visibilite("hidden");
  assert.strictEqual(b.appels[0].o.keepalive, true);
  assert.strictEqual(b.lireCle("journalLots").length, 1);
  b.visibilite("visible");
  b.J.envoyer();
  assert.strictEqual(b.appels[1].corps.lot, b.appels[0].corps.lot);
  reponses[1]({ ok: true, status: 204 });
  await b.attendre();
  assert.strictEqual(b.lireCle("journalLots").length, 0);
  const c = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" }, fetch: () => Promise.resolve({ ok: false, status: 503 }) });
  c.J.envoyer(); await c.attendre();
  assert.strictEqual(c.lireCle("journalLots").length, 1, "plafond du serveur : lot gardé");
});

test("client : opposition (réglage gardé), quota du navigateur", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" } });
  b.J.opposer(true);
  assert.strictEqual(b.J.enAttente(), 0);
  assert.strictEqual(b.lireCle("journalDerniereVisite"), undefined, "date de dernière visite effacée");
  assert.strictEqual(b.sessionStock.size, 0);
  b.J.noter({ e: "page", p: "accueil", id: "" });
  assert.strictEqual(b.J.enAttente(), 0, "plus rien n'est noté");
  assert.strictEqual(b.lireCle("journalConsentement"), "non");
  const c = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" }, quota: 2000 });
  for (let i = 0; i < 100; i++) c.J.noter({ e: "page", p: "autre", id: "page-" + i });
  const f = c.file();
  assert.ok(f.length > 0 && f.length < 100);
  assert.strictEqual(f[f.length - 1].id, "page-99");
});

test("tp.js émet ls:essai pour les objectifs saisis et les questions", () => {
  const tp = fs.readFileSync(path.join(RACINE, "assets", "js", "tp.js"), "utf8");
  assert.strictEqual((tp.match(/new CustomEvent\("ls:essai"/g) || []).length, 2);
});

/* ---------- Serveur ---------- */
const hash = spawnSync(process.execPath, [APP, "--hacher"], { input: "mot-de-passe-essai\n" }).stdout.toString().trim();
async function serveur(dossier, config, nom) {
  const fichier = path.join(dossier, (nom || "config") + ".json");
  fs.writeFileSync(fichier, JSON.stringify(Object.assign({ origines: ["https://learnspace.exemple"], dossierDonnees: path.join(dossier, "donnees"), adminHash: hash,
    secretSession: "s".repeat(64), base: "/api", cookieSecure: true }, config)));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: String(port), LS_CONFIG: fichier }), stdio: ["ignore", "ignore", "pipe"] });
  let erreurs = ""; p.stderr.on("data", d => { erreurs += d; });
  const url = `http://127.0.0.1:${port}/api`;
  for (let k = 0; k < 80; k++) { try { if ((await fetch(url + "/sante")).ok) break; } catch (e) { /* pas encore prêt */ } await new Promise(r => setTimeout(r, 100)); }
  return { url, arreter: () => p.kill(), erreurs: () => erreurs };
}
const maintenant = () => Math.floor(Date.now() / 1000);
const idLot = k => nodeCrypto.createHash("md5").update(String(k)).digest("hex");
const evsTypes = () => [
  { t: maintenant(), e: "visite", retour: "premiere", niveau: 1, type: "telephone", os: "android", largeur: "<400" },
  { t: maintenant(), e: "page", p: "tp", id: "elec-06-led" }, { t: maintenant(), e: "temps", p: "tp", id: "elec-06-led", ms: 12000 },
  { t: maintenant(), e: "tp_debut", id: "elec-06-led@1" }, { t: maintenant(), e: "essai", id: "elec-06-led@1", o: "o", i: 0, ok: false },
  { t: maintenant(), e: "essai", id: "elec-06-led@1", o: "o", i: 0, ok: true }, { t: maintenant(), e: "objectif", id: "elec-06-led@1", i: 0, ms: 30000 },
  { t: maintenant(), e: "essai", id: "elec-06-led@1", o: "q", i: 1, ok: false }, { t: maintenant(), e: "palier", m: 1 },
  { t: maintenant(), e: "piratage", id: "x" }, { t: maintenant(), e: "page", p: "tp", id: "<script>" }, { t: maintenant(), e: "carte_finie", id: "@sum" }];
const unLot = (id, evs, plus) => Object.assign({ v: 2, lot: id, envoi: maintenant(), evs: evs || evsTypes() }, plus || {});
const poster = (url, corps, entetes) => fetch(url + "/journal", { method: "POST", body: JSON.stringify(corps), headers: Object.assign({ "X-Forwarded-For": "10.0.0.1, 41.73.1.2" }, entetes || {}) });
const formulaire = (url, chemin, corps, entetes) => fetch(url + chemin, { method: "POST", body: corps, redirect: "manual", headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, entetes || {}) });
const totaux = dossier => { const d = path.join(dossier, "donnees", "agregats"); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))) : []; };
const toutLeDossier = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? toutLeDossier(path.join(d, e.name)) : [fs.readFileSync(path.join(d, e.name), "utf8")]).join("\n");

test("serveur : seulement des totaux par jour, sans heure ni identifiant ; dédoublonnage entre deux processus", async () => {
  assert.match(hash, /^scrypt\$16384\$8\$1\$/, "--hacher lit le mot de passe sur l'entrée standard");
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  // Restes d'une ancienne version (lignes brutes) : effacés au démarrage.
  fs.mkdirSync(path.join(dossier, "donnees", "evenements"), { recursive: true });
  fs.writeFileSync(path.join(dossier, "donnees", "evenements", "2026-01-01.jsonl"), "{}\n");
  const a = await serveur(dossier, {}), b = await serveur(dossier, {}, "config2");
  try {
    assert.ok(!fs.existsSync(path.join(dossier, "donnees", "evenements")), "données brutes résiduelles effacées");
    assert.strictEqual((await poster(a.url, unLot(idLot(1)))).status, 204);
    assert.strictEqual((await poster(a.url, unLot(idLot(1)))).status, 204, "renvoi au même processus");
    assert.strictEqual((await poster(b.url, unLot(idLot(1)))).status, 204, "renvoi à un autre processus");
    let [j] = totaux(dossier);
    assert.strictEqual(j.lots, 1, "lot compté une seule fois");
    assert.strictEqual(j.visites.total, 1);
    assert.strictEqual(j.visites.retour.premiere, 1);
    assert.strictEqual(j.visites.typeOs["telephone·android"], 1);
    assert.strictEqual(j.pages["tp·elec-06-led"].vues, 1);
    assert.strictEqual(j.pages["tp·elec-06-led"].ms, 12000);
    assert.deepStrictEqual(j.objectifs["elec-06-led@1|0"], { reussis: 1, ms: 30000, essais: 2, rates: 1 });
    assert.deepStrictEqual(j.questions["elec-06-led@1|1"], { justes: 0, fausses: 1 });
    assert.strictEqual(j.paliers["1"], 1);
    assert.ok(!("<script>" in j.pages) && !Object.keys(j.pages).some(k => k.includes("<")), "événements invalides ignorés");
    // Deux processus en même temps sur le même jour : aucun total perdu.
    await Promise.all(Array.from({ length: 20 }, (_, k) => poster(k % 2 ? a.url : b.url, unLot(idLot("p" + k), [{ t: maintenant(), e: "page", p: "accueil", id: "" }]))));
    [j] = totaux(dossier);
    assert.strictEqual(j.pages.accueil.vues, 20, "verrou entre processus");
    // Horloge de l'appareil en retard de 5 ans : rangé au bon jour.
    const decale = maintenant() - 5 * 365 * 86400;
    await poster(a.url, unLot(idLot(2), [{ t: decale - 10, e: "page", p: "carte", id: "elec-bases" }], { envoi: decale }));
    assert.strictEqual(totaux(dossier).length, 1, "pas de jour d'il y a 5 ans");
    assert.strictEqual((await poster(a.url, unLot(idLot(3), null, { v: 1 }))).status, 400);
    assert.strictEqual((await fetch(a.url + "/%E0%A4%A")).status, 400, "adresse mal encodée");
    assert.strictEqual((await poster(a.url, unLot(idLot(4)), { Origin: "https://autre-site.example" })).status, 403);
    const cors = await poster(a.url, unLot(idLot(5)), { Origin: "https://learnspace.exemple" });
    assert.strictEqual(cors.headers.get("access-control-allow-origin"), "https://learnspace.exemple");
    assert.strictEqual((await fetch(a.url + "/journal")).status, 405);
    assert.strictEqual((await fetch(a.url.replace(/\/api$/, "") + "/sante")).status, 200, "préfixe retiré par le proxy : accepté aussi");
    const tout = toutLeDossier(path.join(dossier, "donnees"));
    assert.ok(!tout.includes("41.73") && !tout.includes("10.0.0") && !/forwarded|agent|Mozilla/i.test(tout), "aucune IP ni user-agent");
    assert.ok(!new RegExp(String(maintenant()).slice(0, 6)).test(tout), "aucun horodatage stocké");
    for (const s of ["agregats", "lots"]) for (const f of fs.readdirSync(path.join(dossier, "donnees", s))) assert.strictEqual(fs.statSync(path.join(dossier, "donnees", s, f)).mode & 0o077, 0, "droits 600");
  } finally { a.arreter(); b.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : limite par dernière entrée de X-Forwarded-For, plafond du jour", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const b = await serveur(dossier, { limiteLots10min: 2, dossierDonnees: path.join(dossier, "d2") }, "c2");
  const c = await serveur(dossier, { plafondOctetsJour: 1500, dossierDonnees: path.join(dossier, "d3") }, "c3");
  try {
    const xff = v => ({ "X-Forwarded-For": v });
    assert.strictEqual((await poster(b.url, unLot(idLot("b1")), xff("1.1.1.1, 9.9.9.9"))).status, 204);
    assert.strictEqual((await poster(b.url, unLot(idLot("b2")), xff("2.2.2.2, 9.9.9.9"))).status, 204);
    assert.strictEqual((await poster(b.url, unLot(idLot("b3")), xff("3.3.3.3, 9.9.9.9"))).status, 429, "même dernière entrée : même client, malgré la première inventée");
    assert.strictEqual((await poster(b.url, unLot(idLot("b4")), xff("9.9.9.9, 8.8.8.8"))).status, 204, "dernière entrée différente : autre client");
    assert.strictEqual((await poster(c.url, unLot(idLot("c1")))).status, 204);
    assert.strictEqual((await poster(c.url, unLot(idLot("c2")))).status, 503, "plafond d'octets du jour");
    assert.strictEqual((await poster(c.url, unLot(idLot("c1")))).status, 204, "un lot déjà reçu reste confirmé");
    assert.match(c.erreurs(), /plafond atteint/);
  } finally { b.arreter(); c.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : tableau de bord protégé, session partagée, CSRF, totaux, CSV, purge, déconnexion, essais", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  // Un jour de totaux très ancien, à purger.
  fs.mkdirSync(path.join(dossier, "donnees", "agregats"), { recursive: true });
  const a = await serveur(dossier, { conservationJours: 400 }), b = await serveur(dossier, { conservationJours: 400 }, "config2");
  try {
    await poster(a.url, unLot(idLot(1)));
    fs.writeFileSync(path.join(dossier, "donnees", "agregats", "2020-01-01.json"), JSON.stringify({ lots: 1 }));
    let p = await fetch(a.url + "/admin/export.csv", { redirect: "manual" });
    assert.strictEqual(p.status, 401, "export refusé sans session");
    assert.strictEqual((await fetch(a.url + "/admin/diagnostic")).status, 401);
    const ip = v => ({ "X-Forwarded-For": v });
    for (let k = 0; k < 3; k++) assert.strictEqual((await formulaire(a.url, "/admin/connexion", "mdp=faux", ip("5.5.5.5"))).status, 401);
    p = await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", ip("5.5.5.5"));
    assert.strictEqual(p.status, 429, "délai croissant après 3 échecs");
    p = await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", ip("6.6.6.6"));
    assert.strictEqual(p.status, 303, "pas de blocage global");
    const cookie = p.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/); assert.match(cookie, /Max-Age=7200/);
    const jeton = { Cookie: cookie.split(";")[0] };
    const tab = await fetch(b.url + "/admin", { headers: jeton });
    assert.ok(tab.headers.get("strict-transport-security"), "HSTS");
    assert.strictEqual(tab.headers.get("referrer-policy"), "same-origin");
    const html = await tab.text();
    assert.match(html, /Où les élèves se trompent/);
    assert.match(html, /elec-06-led@1/);
    assert.match(html, /Questions de quiz/);
    assert.ok(!html.includes("<script"), "rien d'injecté");
    assert.ok(!/Exporter ses données|Effacer ses données|name="appareil"/.test(html), "plus rien par appareil");
    const csrf = /name="csrf" value="([^"]+)"/.exec(html)[1];
    const diag = await (await fetch(a.url + "/admin/diagnostic", { headers: Object.assign({}, jeton, ip("10.0.0.1, 41.73.9.8")) })).text();
    assert.match(diag, /oui, 2 entrée/); assert.match(diag, /41\.73\.x\.x/); assert.ok(!diag.includes("41.73.9.8"));
    const csv = await (await fetch(a.url + "/admin/export.csv?jours=7", { headers: jeton })).text();
    assert.match(csv, /"'@sum"/, "apostrophe devant @");
    assert.match(csv, /objectifs/);
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=tout&confirmer=EFFACER&csrf=mauvais", jeton)).text(), /Session expirée/);
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=anciens&csrf=" + csrf, jeton)).text(), /1 jour\(s\)/);
    assert.ok(!fs.existsSync(path.join(dossier, "donnees", "agregats", "2020-01-01.json")));
    assert.strictEqual(totaux(dossier).length, 1);
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=tout&confirmer=EFFACER&csrf=" + csrf, jeton)).text(), /Tous les totaux/);
    assert.strictEqual(totaux(dossier).length, 0);
    p = await formulaire(a.url, "/admin/deconnexion", "csrf=" + csrf, jeton);
    assert.strictEqual(p.status, 303);
    assert.match(p.headers.get("set-cookie"), /Max-Age=0/);
    assert.match(await (await fetch(a.url + "/admin", { headers: jeton })).text(), /Accès réservé/, "session révoquée");
  } finally { a.arreter(); b.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : mot de passe d'exemple non configuré, refus de démarrer dans public_html", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const exemple = JSON.parse(fs.readFileSync(path.join(RACINE, "serveur", "config.example.json"), "utf8"));
  const a = await serveur(dossier, { adminHash: exemple.adminHash });
  try {
    assert.match(await (await formulaire(a.url, "/admin/connexion", "mdp=x")).text(), /non configuré/);
  } finally { a.arreter(); }
  const r = spawnSync(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: "0", LS_CONFIG: path.join(dossier, "absent.json"), LS_DONNEES: path.join(dossier, "public_html", "donnees") }), timeout: 5000 });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr.toString(), /Refus de démarrer/);
  fs.rmSync(dossier, { recursive: true, force: true });
});
