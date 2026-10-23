/* Journal d'utilisation : fonctions pures du navigateur, client complet dans un navigateur simulé,
   service worker, et serveur Node de bout en bout (un ou deux processus sur le même dossier). */
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
global.window = global;
global.LS = {};
require(path.join(RACINE, "assets", "js", "journal.js"));
const J = global.LS.journal;

test("catégorie d'appareil sans garder l'user-agent", () => {
  const android = "Mozilla/5.0 (Linux; Android 12; itel A70) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  assert.deepStrictEqual(J.categorieAppareil(android, 393, 5), { type: "telephone", os: "android", largeur: 400 });
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36", 800, 5).type, "tablette");
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", 820, 5).os, "ios");
  assert.deepStrictEqual(J.categorieAppareil("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", 1366, 0), { type: "ordinateur", os: "windows", largeur: 1350 });
});

test("file bornée, opposition, tranches de temps fusionnées", () => {
  let f = [];
  for (let i = 0; i < 12; i++) f = J.ajouterFile(f, { e: "page", n: i }, false, 10);
  assert.strictEqual(f.length, 10);
  assert.strictEqual(f[0].n, 2);
  assert.deepStrictEqual(J.ajouterFile(f, { e: "page" }, true, 10), []);
  let g = J.ajouterFile([], { e: "temps", p: "tp", id: "a", ms: 5000 }, false);
  g = J.ajouterFile(g, { e: "temps", p: "tp", id: "a", ms: 3000 }, false);
  assert.deepStrictEqual(g, [{ e: "temps", p: "tp", id: "a", ms: 8000 }]);
});

test("lot non confirmé renvoyé avec le même identifiant et le même appareil", () => {
  let n = 0;
  const id = () => "lot" + (++n);
  const a = J.prochainLot([1, 2, 3], [], id, "app1", 2);
  assert.deepStrictEqual(a.lot, { id: "lot1", a: "app1", evs: [1, 2] });
  assert.deepStrictEqual(a.file, [3]);
  const b = J.prochainLot(a.file, a.lots, id, "app2", 2);
  assert.strictEqual(b.lot.id, "lot1");
  assert.strictEqual(b.lot.a, "app1");
  assert.strictEqual(J.prochainLot([], [], id, "x").lot, null);
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

test("pages, gains, renouvellement du numéro", () => {
  assert.deepStrictEqual(J.pageDe("/learn/tp.html", "?id=elec-06-led"), { p: "tp", id: "elec-06-led" });
  assert.deepStrictEqual(J.pageDe("/learn/", ""), { p: "accueil", id: "" });
  assert.deepStrictEqual(J.evenementDeGain("o:elec-06-led@1:2", 5), { t: 5, e: "objectif", id: "elec-06-led@1", i: 2 });
  assert.deepStrictEqual(J.evenementDeGain("n:elec-bases/loi-d-ohm", 5), { t: 5, e: "notion", noeud: "elec-bases/loi-d-ohm" });
  assert.strictEqual(J.evenementDeGain("tp:x", 5), null);
  assert.match(J.nouvelIdentifiant(), /^[0-9a-f]{32}$/);
  const jour = 86400000;
  assert.strictEqual(J.doitRenouveler(0, 1000 * jour), true);
  assert.strictEqual(J.doitRenouveler(900 * jour, 1000 * jour), false);
  assert.strictEqual(J.doitRenouveler(600 * jour, 1000 * jour), true, "plus de 12 mois");
});

/* ---------- Client complet dans un navigateur simulé ---------- */
function navigateur(opts) {
  const stock = new Map(Object.entries(opts.stock || {}));
  const ecouteurs = {}, minuteurs = [], appels = [];
  let elementsCrees = 0;
  const element = () => ({ id: "", className: "", style: {}, setAttribute() {}, append() {}, prepend() {}, after() {}, remove() {}, querySelector: () => ({ addEventListener() {} }), set innerHTML(v) { this._html = v; }, set textContent(v) {} });
  const document = {
    visibilityState: "visible", readyState: "complete",
    addEventListener: (t, f) => { (ecouteurs[t] = ecouteurs[t] || []).push(f); },
    getElementById: () => null, querySelector: () => null,
    createElement: () => { elementsCrees++; return element(); },
    head: element(), body: element()
  };
  const ctx = {
    LS: Object.assign({ profil: () => ({ niveau: 2 }) }, opts.LS || {}),
    location: new URL(opts.url), document, navigator: { userAgent: "Mozilla/5.0 (Linux; Android 12) Mobile", maxTouchPoints: 5 }, screen: { width: 390 },
    localStorage: {
      getItem: k => (stock.has(k) ? stock.get(k) : null),
      setItem: (k, v) => { if (opts.quota && v.length > opts.quota) throw new Error("QuotaExceededError"); stock.set(k, String(v)); },
      removeItem: k => stock.delete(k)
    },
    fetch: (u, o) => { appels.push({ u, o, corps: JSON.parse(o.body) }); return opts.fetch ? opts.fetch(u, o) : Promise.resolve({ ok: true, status: 204 }); },
    crypto: nodeCrypto.webcrypto, URLSearchParams, setTimeout: (f, ms) => { if (!ms) f(); else minuteurs.push(f); return 0; }, setInterval: () => 0, console
  };
  ctx.window = ctx;
  ctx.window.addEventListener = (t, f) => { (ecouteurs["w:" + t] = ecouteurs["w:" + t] || []).push(f); };
  vm.runInNewContext(SOURCE_CLIENT, ctx);
  const lireCle = k => { const v = stock.get("learnspace:" + k); return v === undefined ? undefined : JSON.parse(v); };
  return {
    ctx, appels, stock, lireCle, J: ctx.LS.journal,
    elementsCrees: () => elementsCrees,
    declencher: (t, detail) => (ecouteurs[t] || []).forEach(f => f({ detail })),
    visibilite: v => { document.visibilityState = v; (ecouteurs.visibilitychange || []).forEach(f => f()); },
    attendre: () => new Promise(r => setImmediate(r))
  };
}

test("client : désactivé sans adresse configurée et en file://", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "" } });
  assert.strictEqual(b.J.enAttente(), 0);
  assert.strictEqual(b.elementsCrees(), 0, "pas de bandeau");
  b.J.envoyer();
  assert.strictEqual(b.appels.length, 0);
  const c = navigateur({ url: "file:///home/eleve/learn_space/index.html", LS: { JOURNAL_URL: "https://site.ml/api/journal" } });
  assert.strictEqual(c.J.enAttente(), 0);
  assert.strictEqual(c.elementsCrees(), 0);
});

test("client : note, envoie, ne retire le lot qu'à la confirmation, renvoie après la fermeture d'onglet", async () => {
  let reponses = [];
  const b = navigateur({ url: "https://site.ml/tp.html?id=elec-06-led", LS: { JOURNAL_URL: "/api/journal" },
    fetch: () => new Promise((ok, ko) => reponses.push({ ok, ko })) });
  assert.ok(b.J.enAttente() >= 1, "ouverture de page notée par défaut");
  assert.ok(b.elementsCrees() > 0, "information affichée");
  b.declencher("ls:gain", { cle: "o:elec-06-led:0" });
  // L'onglet passe en arrière-plan : envoi keepalive, réponse jamais reçue.
  b.visibilite("hidden");
  assert.strictEqual(b.appels.length, 1);
  assert.strictEqual(b.appels[0].o.keepalive, true);
  const premier = b.appels[0].corps;
  assert.ok(Number.isInteger(premier.envoi), "heure d'envoi transmise");
  assert.ok(premier.evs.some(e => e.e === "objectif"));
  assert.strictEqual(b.lireCle("journalLots").length, 1, "lot gardé en attente");
  // Retour au premier plan : le lot est renvoyé avec le même identifiant.
  b.visibilite("visible");
  b.J.envoyer();
  assert.strictEqual(b.appels.length, 2);
  assert.strictEqual(b.appels[1].corps.lot, premier.lot);
  reponses[1].ok({ ok: true, status: 204 });
  await b.attendre();
  assert.strictEqual(b.lireCle("journalLots").length, 0, "confirmé : retiré");
  // La réponse tardive du premier envoi ne casse rien.
  reponses[0].ok({ ok: true, status: 204 });
  await b.attendre();
  assert.strictEqual(b.lireCle("journalLots").length, 0);
});

test("client : 503 garde le lot ; opposition vide tout ; renouvellement du numéro sans mélange", async () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" }, fetch: () => Promise.resolve({ ok: false, status: 503 }) });
  b.J.envoyer();
  await b.attendre();
  assert.strictEqual(b.lireCle("journalLots").length, 1, "plafond du serveur : lot gardé");
  b.J.opposer(true);
  assert.strictEqual(b.J.enAttente(), 0);
  b.J.noter({ e: "page", p: "accueil" });
  assert.strictEqual(b.J.enAttente(), 0, "plus rien n'est noté");
  const ancien = "a".repeat(32);
  const c = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" },
    stock: { "learnspace:journalAppareil": JSON.stringify(ancien), "learnspace:journalAppareilCree": JSON.stringify(Date.now() - 400 * 86400000) } });
  const nouveau = c.J.identifiant();
  assert.notStrictEqual(nouveau, ancien);
  const lots = c.lireCle("journalLots");
  assert.strictEqual(lots.length, 1);
  assert.strictEqual(lots[0].a, ancien, "les événements d'avant partent sous l'ancien numéro");
  c.J.effacer();
  assert.strictEqual(c.J.ancienIdentifiant(), nouveau);
  assert.strictEqual(c.J.enAttente(), 0);
});

test("client : quota du navigateur dépassé, la file garde les plus récents", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "/api/journal" }, quota: 2000 });
  for (let i = 0; i < 100; i++) b.J.noter({ e: "page", p: "autre", id: "page-" + i });
  const f = b.lireCle("journalFile");
  assert.ok(f.length > 0 && f.length < 100);
  assert.strictEqual(f[f.length - 1].id, "page-99");
});

test("service worker : /api, /admin et /journal ne passent jamais par le cache", () => {
  const ecouteurs = {};
  const ctx = { self: { addEventListener: (t, f) => { ecouteurs[t] = f; }, skipWaiting() {}, clients: { claim() {} } }, location: { origin: "https://site.ml" }, URL,
    caches: { open: () => Promise.resolve({ put() {}, addAll: () => Promise.resolve() }), match: () => Promise.resolve(null), keys: () => Promise.resolve([]) },
    fetch: () => Promise.resolve({ ok: true, clone() { return this; } }) };
  vm.runInNewContext(fs.readFileSync(path.join(RACINE, "sw.js"), "utf8"), ctx);
  const repondu = url => { let r = false; ecouteurs.fetch({ request: { method: "GET", url, mode: "cors" }, respondWith: () => { r = true; } }); return r; };
  assert.strictEqual(repondu("https://site.ml/api/journal"), false);
  assert.strictEqual(repondu("https://site.ml/api/admin"), false);
  assert.strictEqual(repondu("https://site.ml/admin/export.csv"), false);
  assert.strictEqual(repondu("https://site.ml/index.html"), true);
  const sw = fs.readFileSync(path.join(RACINE, "sw.js"), "utf8");
  assert.match(sw, /learnspace-v3/);
  for (const f of ["assets/js/journal.js", "assets/js/config-journal.js", "confidentialite.html"]) assert.ok(sw.includes('"' + f + '"'), f + " dans DE_BASE");
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
const APPAREIL = "0123456789abcdef0123456789abcdef";
const unLot = (id, evs, plus) => Object.assign({ v: 1, lot: id, appareil: APPAREIL, envoi: maintenant(), cat: { type: "telephone", os: "android", largeur: 400 }, niveau: 1,
  evs: evs || [{ t: maintenant(), e: "page", p: "tp", id: "elec-06-led" }, { t: maintenant(), e: "temps", p: "tp", id: "elec-06-led", ms: 12000 }, { t: maintenant(), e: "objectif", id: "elec-06-led", i: 0, ms: 30000 },
    { t: maintenant(), e: "piratage", id: "x" }, { t: maintenant(), e: "page", p: "tp", id: "<script>" }] }, plus || {});
const idLot = k => nodeCrypto.createHash("md5").update(String(k)).digest("hex");
const poster = (url, corps, entetes) => fetch(url + "/journal", { method: "POST", body: JSON.stringify(corps), headers: Object.assign({ "X-Forwarded-For": "10.0.0.1, 41.73.1.2" }, entetes || {}) });
const formulaire = (url, chemin, corps, entetes) => fetch(url + chemin, { method: "POST", body: corps, redirect: "manual", headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, entetes || {}) });
const lignes = dossier => { const d = path.join(dossier, "donnees", "evenements"); return fs.existsSync(d) ? fs.readdirSync(d).flatMap(f => fs.readFileSync(path.join(d, f), "utf8").trim().split("\n").filter(Boolean)) : []; };

test("serveur : réception, validation, horloge, arrondis, dédoublonnage entre deux processus, aucune IP", async () => {
  assert.match(hash, /^scrypt\$16384\$8\$1\$/, "--hacher lit le mot de passe sur l'entrée standard");
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const a = await serveur(dossier, {}), b = await serveur(dossier, {}, "config2");
  try {
    assert.strictEqual((await poster(a.url, unLot(idLot(1)))).status, 204);
    assert.strictEqual((await poster(a.url, unLot(idLot(1)))).status, 204, "renvoi au même processus");
    assert.strictEqual((await poster(b.url, unLot(idLot(1)))).status, 204, "renvoi à un autre processus");
    assert.strictEqual(lignes(dossier).length, 1, "un seul exemplaire du lot");
    // Horloge de l'appareil en retard de 5 ans : les heures sont recalées.
    const decale = maintenant() - 5 * 365 * 86400;
    assert.strictEqual((await poster(a.url, unLot(idLot(2), [{ t: decale - 120, e: "page", p: "accueil", id: "" }], { envoi: decale }))).status, 204);
    const stockes = lignes(dossier).map(l => JSON.parse(l));
    const recale = stockes[1].evs[0].t;
    assert.ok(Math.abs(recale - (maintenant() - 120)) < 120, "heure recalée : " + recale);
    for (const l of stockes) { assert.strictEqual(l.r % 3600, 0, "réception à l'heure"); for (const ev of l.evs) assert.strictEqual(ev.t % 60, 0, "événement à la minute"); }
    assert.ok(stockes[0].evs.length === 3, "les 2 événements invalides sont ignorés");
    assert.strictEqual((await poster(a.url, unLot(idLot(3), null, { appareil: "pas-un-numero" }))).status, 400);
    assert.strictEqual((await fetch(a.url + "/%E0%A4%A")).status, 400, "adresse mal encodée");
    assert.strictEqual((await poster(a.url, unLot(idLot(4)), { Origin: "https://autre-site.example" })).status, 403);
    const cors = await poster(a.url, unLot(idLot(5)), { Origin: "https://learnspace.exemple" });
    assert.strictEqual(cors.status, 204);
    assert.strictEqual(cors.headers.get("access-control-allow-origin"), "https://learnspace.exemple");
    assert.strictEqual((await fetch(a.url + "/journal")).status, 405);
    const sansBase = await fetch(a.url.replace(/\/api$/, "") + "/sante");
    assert.strictEqual(sansBase.status, 200, "préfixe retiré par le proxy : accepté aussi");
    const d = path.join(dossier, "donnees");
    const tout = ["evenements", "lots"].flatMap(s => fs.readdirSync(path.join(d, s)).map(f => fs.readFileSync(path.join(d, s, f), "utf8"))).join("");
    assert.ok(!tout.includes("41.73") && !tout.includes("10.0.0") && !/forwarded|agent|Mozilla/i.test(tout), "aucune IP ni user-agent");
    for (const s of ["evenements", "lots"]) for (const f of fs.readdirSync(path.join(d, s))) assert.strictEqual(fs.statSync(path.join(d, s, f)).mode & 0o077, 0, "droits 600");
  } finally { a.arreter(); b.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : limites de débit (appareil, dernière entrée de X-Forwarded-For) et plafond du jour", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const a = await serveur(dossier, { limiteLots10min: 3, limiteIp10min: 1000 });
  const b = await serveur(dossier, { limiteLots10min: 1000, limiteIp10min: 2, dossierDonnees: path.join(dossier, "d2") }, "c2");
  const c = await serveur(dossier, { plafondOctetsJour: 500, dossierDonnees: path.join(dossier, "d3") }, "c3");
  try {
    let r;
    for (let k = 0; k < 4; k++) r = await poster(a.url, unLot(idLot("a" + k)));
    assert.strictEqual(r.status, 429, "limite par appareil");
    const xff = v => ({ "X-Forwarded-For": v });
    assert.strictEqual((await poster(b.url, unLot(idLot("b1")), xff("1.1.1.1, 9.9.9.9"))).status, 204);
    assert.strictEqual((await poster(b.url, unLot(idLot("b2")), xff("2.2.2.2, 9.9.9.9"))).status, 204);
    assert.strictEqual((await poster(b.url, unLot(idLot("b3")), xff("3.3.3.3, 9.9.9.9"))).status, 429, "même dernière entrée : même client, malgré la première inventée");
    assert.strictEqual((await poster(b.url, unLot(idLot("b4")), xff("9.9.9.9, 8.8.8.8"))).status, 204, "dernière entrée différente : autre client");
    assert.strictEqual((await poster(c.url, unLot(idLot("c1")))).status, 204);
    assert.strictEqual((await poster(c.url, unLot(idLot("c2")))).status, 503, "plafond d'octets du jour");
    assert.strictEqual((await poster(c.url, unLot(idLot("c1")))).status, 204, "un lot déjà reçu reste confirmé");
    assert.match(c.erreurs(), /plafond atteint/);
  } finally { a.arreter(); b.arreter(); c.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : tableau de bord protégé, session partagée, CSRF, purge, appareil, CSV, déconnexion, essais", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const a = await serveur(dossier, { conservationJours: 1 }), b = await serveur(dossier, { conservationJours: 1 }, "config2");
  try {
    const vieux = maintenant() - 2 * 86400;
    await poster(a.url, unLot(idLot(1), [{ t: maintenant(), e: "page", p: "tp", id: "@sum" }, { t: maintenant(), e: "tp_debut", id: "elec-06-led@1" },
      { t: maintenant(), e: "objectif", id: "elec-06-led@1", i: 0, ms: 5000 }, { t: vieux, e: "page", p: "accueil", id: "" }]));
    await poster(a.url, unLot(idLot(2), [{ t: maintenant(), e: "page", p: "carte", id: "elec-bases" }], { appareil: "f".repeat(32) }));
    let p = await fetch(a.url + "/admin/export.csv", { redirect: "manual" });
    assert.strictEqual(p.status, 401, "export refusé sans session");
    assert.strictEqual((await fetch(a.url + "/admin/diagnostic")).status, 401);
    const ip = v => ({ "X-Forwarded-For": v });
    for (let k = 0; k < 3; k++) assert.strictEqual((await formulaire(a.url, "/admin/connexion", "mdp=faux", ip("5.5.5.5"))).status, 401);
    p = await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", ip("5.5.5.5"));
    assert.strictEqual(p.status, 429, "délai croissant après 3 échecs");
    assert.match(await p.text(), /réessaie dans/);
    p = await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", ip("6.6.6.6"));
    assert.strictEqual(p.status, 303, "pas de blocage global : une autre adresse entre");
    const cookie = p.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/); assert.match(cookie, /Max-Age=7200/);
    const jeton = { Cookie: cookie.split(";")[0] };
    // Le cookie signé vaut aussi pour l'autre processus.
    let tab = await fetch(b.url + "/admin", { headers: jeton });
    assert.ok(tab.headers.get("strict-transport-security"), "HSTS");
    let html = await tab.text();
    assert.match(html, /appareils actifs/);
    assert.match(html, /elec-06-led@1/);
    assert.match(html, /100 %/, "objectif rapporté aux ouvertures de la même variante");
    assert.ok(!html.includes("<script"), "rien d'injecté");
    const csrf = /name="csrf" value="([^"]+)"/.exec(html)[1];
    // Diagnostic du proxy : présence de X-Forwarded-For, adresse masquée, rien d'enregistré.
    html = await (await fetch(a.url + "/admin/diagnostic", { headers: Object.assign({}, jeton, ip("10.0.0.1, 41.73.9.8")) })).text();
    assert.match(html, /oui, 2 entrée/);
    assert.match(html, /41\.73\.x\.x/);
    assert.ok(!html.includes("41.73.9.8"));
    // CSV : apostrophe devant @ = + -
    const csv = await (await fetch(a.url + "/admin/export.csv?jours=7", { headers: jeton })).text();
    assert.match(csv, /"'@sum"/);
    assert.match(csv, /objectif/);
    // Purge sans CSRF refusée ; purge des anciens (date d'événement) acceptée.
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=tout&confirmer=EFFACER&csrf=mauvais", jeton)).text(), /Session expirée/);
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=anciens&csrf=" + csrf, jeton)).text(), /ont été effacés/);
    assert.ok(!lignes(dossier).join("").includes(String(Math.floor(vieux / 60) * 60)), "événement de plus d'un jour effacé");
    assert.ok(lignes(dossier).join("").includes("elec-06-led@1"), "le reste est gardé");
    // Un appareil : export puis effacement.
    const unCsv = await (await fetch(a.url + "/admin/export.csv?appareil=" + "f".repeat(32), { headers: jeton })).text();
    assert.match(unCsv, /elec-bases/); assert.ok(!unCsv.includes("elec-06-led"));
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=appareil&appareil=" + "f".repeat(32) + "&csrf=" + csrf, jeton)).text(), /ont été effacées/);
    assert.ok(!lignes(dossier).join("").includes("f".repeat(32)));
    assert.ok(lignes(dossier).join("").includes(APPAREIL));
    // Tout effacer.
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=tout&confirmer=EFFACER&csrf=" + csrf, jeton)).text(), /Tout le journal a été effacé/);
    assert.strictEqual(lignes(dossier).length, 0);
    // Déconnexion.
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
