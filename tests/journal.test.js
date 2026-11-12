/* Journal d'utilisation (statistiques agrégées et minimisées) : fonctions pures du navigateur, client
   complet dans un navigateur simulé, fonctions pures du serveur, et serveur Node de bout en bout (un ou
   deux processus sur le même dossier). */
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
const JOUR_MS = 86400000;

// Fonctions pures : le script se charge sous Node sans document.
const pur = { LS: {} };
pur.window = pur;
vm.runInNewContext(SOURCE_CLIENT, pur);
const J = pur.LS.journal;
// Fonctions pures du serveur (sans démarrer le serveur).
process.env.LS_PAS_DE_SERVEUR = "1";
const S = require(APP);
delete process.env.LS_PAS_DE_SERVEUR;

test("catégorie d'appareil grossière, combinaisons rares simplifiées", () => {
  const android = "Mozilla/5.0 (Linux; Android 12; itel A70) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  assert.deepStrictEqual({ ...J.categorieAppareil(android, 393, 5) }, { type: "telephone", os: "android", largeur: "<400" });
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36", 800, 5).type, "tablette");
  assert.deepStrictEqual({ ...J.categorieAppareil("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", 1366, 0) }, { type: "ordinateur", os: "windows", largeur: "1280+" });
  // Téléphone sous Linux : combinaison rare, système simplifié en « autre ».
  assert.strictEqual(J.categorieAppareil("Mozilla/5.0 (X11; Linux x86_64) Mobile", 360, 5).os, "autre");
});

test("catégorie de retour (dont « même jour ») et date de dernière visite effacée après 13 mois", () => {
  assert.strictEqual(J.categorieRetour(null, "2026-10-23"), "premiere");
  assert.strictEqual(J.categorieRetour("2026-10-23", "2026-10-23"), "meme_jour");
  assert.strictEqual(J.categorieRetour("2026-10-20", "2026-10-23"), "moins7");
  assert.strictEqual(J.categorieRetour("2026-10-01", "2026-10-23"), "7a30");
  assert.strictEqual(J.categorieRetour("2026-08-01", "2026-10-23"), "plus30");
  const t = Date.parse("2026-10-23");
  assert.strictEqual(J.derniereValide({ jour: "2026-10-20", cree: t - 100 * JOUR_MS }, t), true);
  assert.strictEqual(J.derniereValide({ jour: "2026-10-20", cree: t - 400 * JOUR_MS }, t), false, "plus de 13 mois");
  assert.strictEqual(J.derniereValide("2026-10-20", t), false, "ancien format sans date de création");
  assert.deepStrictEqual([...J.paliersFranchis(0, 16 * 60000)], [1, 5, 15]);
});

test("file bornée, tranches de temps fusionnées, lot renvoyé avec le même identifiant", () => {
  let f = [];
  for (let i = 0; i < 12; i++) f = J.ajouterFile(f, { e: "page", n: i }, false, 10);
  assert.strictEqual(f.length, 10);
  assert.strictEqual(f[0].n, 2);
  let g = J.ajouterFile([], { e: "temps", p: "tp", id: "a", ms: 5000 }, false);
  g = J.ajouterFile(g, { e: "temps", p: "tp", id: "a", ms: 3000 }, false);
  assert.strictEqual(g.length, 1); assert.strictEqual(g[0].ms, 8000);
  let n = 0;
  const id = () => "lot" + (++n);
  const a = J.prochainLot([1, 2, 3], [], id, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a.lot)), { id: "lot1", evs: [1, 2] });
  assert.strictEqual(J.prochainLot(a.file, a.lots, id, 2).lot.id, "lot1");
});

test("temps actif : geste récent, ou simulation EN MARCHE (signal explicite, 3 min au plus après le dernier geste)", () => {
  let e = { dernierTic: 0, derniereInteraction: 0, actifMs: 0 };
  e = J.tic(e, 5000, true); e = J.tic(e, 10000, false); e = J.tic(e, 15000, true);
  assert.strictEqual(e.actifMs, 10000);
  e = J.tic(e, 70000, true);
  assert.strictEqual(e.actifMs, 10000, "plus de 60 s sans geste, simulation en pause : rien");
  e = Object.assign(e, { simEnMarche: 119000 });
  e = J.tic(e, 120000, true);
  assert.strictEqual(e.actifMs, 20000, "simulation en marche 2 min après le dernier geste : compté");
  e = Object.assign(e, { simEnMarche: 199000 });
  e = J.tic(e, 200000, true);
  assert.strictEqual(e.actifMs, 20000, "plus de 3 min après le dernier geste : plus compté, même en marche");
  assert.strictEqual(J.evenementDeGain("o:elec-06-led:2", 5), null, "les objectifs viennent de ls:reussite");
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
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    dispatchEvent: ev => { (ecouteurs[ev.type] || []).forEach(f => f(ev)); return true; },
    createElement: () => { elementsCrees++; return element(); },
    head: element(), body: element()
  };
  const magasin = (m, quota) => ({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (quota && v.length > quota) throw new Error("QuotaExceededError"); m.set(k, String(v)); }, removeItem: k => m.delete(k) });
  class FausseDate extends Date { constructor(...a) { super(...(a.length ? a : [maintenant])); } static now() { return maintenant; } }
  const ctx = {
    LS: Object.assign({ profil: () => ({ niveau: 2 }) }, opts.LS || {}), Date: FausseDate,
    location: new URL(opts.url), document, navigator: Object.assign({ userAgent: "Mozilla/5.0 (Linux; Android 12) Mobile", maxTouchPoints: 5 }, opts.navigator || {}), screen: { width: 390 },
    localStorage: magasin(stock, opts.quota), sessionStorage: magasin(sessionStock),
    fetch: (u, o) => { appels.push({ u, o, corps: JSON.parse(o.body) }); return opts.fetch ? opts.fetch(u, o) : Promise.resolve({ ok: true, status: 204 }); },
    crypto: nodeCrypto.webcrypto, URLSearchParams, setTimeout: (f, ms) => { if (!ms) f(); return 0; }, setInterval: () => 0, console,
    CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } }
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
const CONFIGURE = { JOURNAL_URL: "/api/journal" };

test("client : désactivé sans adresse configurée, en file:// et avec Global Privacy Control", () => {
  for (const b of [navigateur({ url: "https://site.ml/index.html", LS: { JOURNAL_URL: "" } }),
    navigateur({ url: "file:///home/eleve/learn_space/index.html", LS: { JOURNAL_URL: "https://site.ml/api/journal" } }),
    navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE, navigator: { globalPrivacyControl: true } })]) {
    assert.strictEqual(b.J.enAttente(), 0);
    assert.strictEqual(b.elementsCrees(), 0, "pas de bandeau");
    assert.ok(![...b.stock.keys()].some(k => /journal(File|DerniereVisite|Lots)/.test(k)), "rien d'écrit pour le journal");
    b.J.envoyer();
    assert.strictEqual(b.appels.length, 0);
  }
  assert.strictEqual(navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE, navigator: { globalPrivacyControl: true } }).J.oppose(), true);
});

test("client : aucun identifiant envoyé ; visite en sessionStorage ; date de dernière visite non prolongée", async () => {
  const cree = Date.now() - 100 * JOUR_MS;
  const b = navigateur({ url: "https://site.ml/tp.html?id=elec-06-led", LS: CONFIGURE,
    stock: { "learnspace:journalDerniereVisite": JSON.stringify({ jour: "2026-10-01", cree }), "learnspace:journalAppareil": JSON.stringify("a".repeat(32)) } });
  assert.strictEqual(b.lireCle("journalAppareil"), undefined, "ancien numéro d'appareil effacé");
  const id = b.J.visiteEnCours();
  assert.match(id, /^[0-9a-f]{32}$/);
  for (const [, v] of b.stock) assert.ok(!v.includes(id), "numéro de visite absent de localStorage");
  assert.strictEqual(b.lireCle("journalDerniereVisite").cree, cree, "date de création gardée (pas de prolongation)");
  b.declencher("ls:essai", { tp: "elec-06-led", objet: "q", i: 1, ok: false });
  b.J.envoyer(); await b.attendre();
  const texte = JSON.stringify(b.appels[0].corps);
  assert.ok(!texte.includes(id) && !/appareil|2026-10-01|cree/.test(texte), "ni numéro, ni date");
  assert.deepStrictEqual(Object.keys(b.appels[0].corps).sort(), ["envoi", "evs", "lot", "v"]);
  // Même jour, 31 minutes plus tard : nouvelle visite « même jour ».
  b.avancer(31 * 60000);
  b.J.noter({ e: "page", p: "accueil", id: "" });
  assert.notStrictEqual(b.J.visiteEnCours(), id);
  assert.strictEqual(b.file().filter(e => e.e === "visite").pop().retour, "meme_jour");
  // Date créée il y a plus de 13 mois : effacée, la visite compte comme première.
  const c = navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE, stock: { "learnspace:journalDerniereVisite": JSON.stringify({ jour: "2026-10-01", cree: Date.now() - 400 * JOUR_MS }) } });
  assert.strictEqual(c.file().find(e => e.e === "visite").retour, "premiere");
  assert.ok(Date.now() - c.lireCle("journalDerniereVisite").cree < 60000, "nouvelle date de création");
});

test("client : ouverture, objectif réussi et fin de TP comptés une fois par visite", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE });
  b.J.noter({ e: "tp_debut", id: "x" }); b.J.noter({ e: "tp_debut", id: "x" });
  b.declencher("ls:reussite", { tp: "x", i: 0 }); b.declencher("ls:reussite", { tp: "x", i: 0 });
  b.declencher("ls:reussite", { tp: "x", i: 1, complet: true }); b.declencher("ls:essai", { tp: "x", objet: "q", i: 0, ok: true, complet: true });
  const f = b.file(), n = e => f.filter(x => x.e === e).length;
  assert.deepStrictEqual([n("tp_debut"), n("objectif"), n("tp_fin")], [1, 2, 1]);
  b.avancer(31 * 60000);
  b.declencher("ls:reussite", { tp: "x", i: 0 });
  assert.strictEqual(b.file().filter(x => x.e === "objectif").length, 3, "nouvelle visite : compté de nouveau");
  b.J.noter({ e: "temps", p: "accueil", id: "", ms: 6 * 60000 });
  assert.deepStrictEqual(b.file().filter(e => e.e === "palier").map(e => e.m), [1, 5]);
});

test("client : envoi à la fermeture, lot gardé puis renvoyé avec le même identifiant ; 503 garde le lot", async () => {
  const reponses = [];
  const b = navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE, fetch: () => new Promise(ok => reponses.push(ok)) });
  assert.ok(b.elementsCrees() > 0, "information affichée");
  b.visibilite("hidden");
  assert.strictEqual(b.appels[0].o.keepalive, true);
  b.visibilite("visible");
  b.J.envoyer();
  assert.strictEqual(b.appels[1].corps.lot, b.appels[0].corps.lot);
  reponses[1]({ ok: true, status: 204 });
  await b.attendre();
  assert.strictEqual(b.lireCle("journalLots").length, 0);
  const c = navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE, fetch: () => Promise.resolve({ ok: false, status: 503 }) });
  c.J.envoyer(); await c.attendre();
  assert.strictEqual(c.lireCle("journalLots").length, 1, "plafond du serveur : lot gardé");
});

test("client : refus (réglage gardé), quota du navigateur", () => {
  const b = navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE });
  b.J.opposer(true);
  assert.strictEqual(b.J.enAttente(), 0);
  assert.strictEqual(b.lireCle("journalDerniereVisite"), undefined);
  assert.strictEqual(b.sessionStock.size, 0);
  b.J.noter({ e: "page", p: "accueil", id: "" });
  assert.strictEqual(b.J.enAttente(), 0);
  const c = navigateur({ url: "https://site.ml/index.html", LS: CONFIGURE, quota: 2000 });
  for (let i = 0; i < 100; i++) c.J.noter({ e: "page", p: "autre", id: "page-" + i });
  const f = c.file();
  assert.ok(f.length > 0 && f.length < 100);
  assert.strictEqual(f[f.length - 1].id, "page-99");
});

test("tp.js : événements ls:essai et ls:reussite, quiz sous la clé du TP (pas « q0 »)", () => {
  const tp = fs.readFileSync(path.join(RACINE, "assets", "js", "tp.js"), "utf8");
  assert.strictEqual((tp.match(/new CustomEvent\("ls:essai"/g) || []).length, 2);
  assert.strictEqual((tp.match(/new CustomEvent\("ls:reussite"/g) || []).length, 1);
  assert.ok(!/const cle = "q" \+ i/.test(tp), "plus de variable cle qui masque celle du TP");
});

/* ---------- Fonctions du serveur ---------- */
test("serveur (fonctions) : clés « constructor » et « __proto__ » ordinaires, IPv6 par /64, seuil k", () => {
  const j = S.additionner(S.nouveauJour(), JSON.parse('{"notions":{"constructor":2,"__proto__":3},"cartes":{"toString":1}}'));
  assert.strictEqual(j.notions.constructor, 2);
  assert.strictEqual(j.notions.__proto__, 3);
  S.ajouterAuJour(j, { e: "notion", noeud: "constructor" });
  assert.strictEqual(j.notions.constructor, 3);
  assert.strictEqual(({}).polluee, undefined);
  assert.strictEqual(S.prefixe64("2001:db8:1:2::10"), "2001:db8:1:2::/64");
  assert.strictEqual(S.prefixe64("2001:db8:1:2:ffff:1:2:3"), "2001:db8:1:2::/64");
  assert.strictEqual(S.prefixe64("::ffff:41.73.1.2"), "41.73.1.2");
  const d = S.nouveauJour();
  d.visites.total = 3; d.pages["tp·x"] = { vues: 2, ms: 9 }; d.pages["accueil"] = { vues: 7, ms: 70 }; d.tps.x = { ouverts: 6, finis: 1, msFin: 5 };
  const l = S.lignesDuTotal(d, 5);
  assert.deepStrictEqual(l.find(x => x[0] === "visites"), ["visites", "", "total", "< 5"]);
  assert.ok(!l.some(x => x[1] === "tp·x"), "ligne sous le seuil absente");
  assert.ok(l.some(x => x[1] === "accueil" && x[2] === "vues" && x[3] === 7));
  assert.deepStrictEqual(l.find(x => x[0] === "tps" && x[2] === "premieres_fins"), ["tps", "x", "premieres_fins", "< 5"]);
  assert.ok(!l.some(x => x[2] === "duree_fin_ms"), "durée masquée avec son compte");
  assert.strictEqual(S.secretValide("REMPLACER par le résultat de : node -e"), false);
  assert.strictEqual(S.secretValide("k".repeat(64)), false);
  assert.strictEqual(S.secretValide("ab".repeat(32)), false, "motif répété");
  assert.strictEqual(S.secretValide("0".repeat(64)), false, "sans hasard");
  assert.strictEqual(S.secretValide(nodeCrypto.randomBytes(32).toString("hex")), true);
});

/* ---------- Serveur de bout en bout ---------- */
const hash = spawnSync(process.execPath, [APP, "--hacher"], { input: "mot-de-passe-essai\n" }).stdout.toString().trim();
const SECRET = nodeCrypto.randomBytes(32).toString("hex");
async function serveur(dossier, config, nom) {
  const fichier = path.join(dossier, (nom || "config") + ".json");
  fs.writeFileSync(fichier, JSON.stringify(Object.assign({ origines: ["https://learnspace.exemple"], dossierDonnees: path.join(dossier, "donnees"), adminHash: hash,
    secretSession: SECRET, base: "/api", cookieSecure: true }, config)));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: String(port), LS_CONFIG: fichier }), stdio: ["ignore", "ignore", "pipe"] });
  let erreurs = ""; p.stderr.on("data", d => { erreurs += d; });
  const url = `http://127.0.0.1:${port}/api`;
  for (let k = 0; k < 80; k++) { try { if ((await fetch(url + "/sante")).ok) break; } catch (e) { /* pas encore prêt */ } await new Promise(r => setTimeout(r, 100)); }
  return { url, arreter: () => p.kill(), erreurs: () => erreurs };
}
const maintenant = () => Math.floor(Date.now() / 1000);
const jourUTC = (decalageJours) => new Date(Date.now() + (decalageJours || 0) * JOUR_MS).toISOString().slice(0, 10);
const idLot = k => nodeCrypto.createHash("md5").update(String(k)).digest("hex");
const evsTypes = () => [
  { t: maintenant(), e: "visite", retour: "premiere", niveau: 1, type: "telephone", os: "android", largeur: "<400" },
  { t: maintenant(), e: "page", p: "tp", id: "elec-06-led" }, { t: maintenant(), e: "temps", p: "tp", id: "elec-06-led", ms: 12000 },
  { t: maintenant(), e: "tp_debut", id: "elec-01-premier-circuit@1" }, { t: maintenant(), e: "essai", id: "elec-01-premier-circuit@1", o: "o", i: 0, ok: false },
  { t: maintenant(), e: "essai", id: "elec-01-premier-circuit@1", o: "o", i: 0, ok: true }, { t: maintenant(), e: "objectif", id: "elec-01-premier-circuit@1", i: 0, ms: 30000 },
  { t: maintenant(), e: "essai", id: "elec-06-led", o: "q", i: 1, ok: false }, { t: maintenant(), e: "palier", m: 1 },
  { t: maintenant(), e: "notion", noeud: "elec-bases/grandeurs" },
  // refusés : clés inventées, « constructor », variante d'un TP sans variantes, indices hors limites, notion inconnue
  { t: maintenant(), e: "piratage", id: "x" }, { t: maintenant(), e: "page", p: "tp", id: "<script>" }, { t: maintenant(), e: "tp_debut", id: "constructor" },
  { t: maintenant(), e: "carte_finie", id: "constructor" }, { t: maintenant(), e: "tp_debut", id: "elec-06-led@2" }, { t: maintenant(), e: "objectif", id: "elec-06-led", i: 7 },
  { t: maintenant(), e: "essai", id: "elec-06-led", o: "q", i: 5, ok: true }, { t: maintenant(), e: "notion", noeud: "elec-bases/inventee" }, { t: maintenant(), e: "page", p: "tp", id: "inconnu" }];
const unLot = (id, evs, plus) => Object.assign({ v: 2, lot: id, envoi: maintenant(), evs: evs || evsTypes() }, plus || {});
const poster = (url, corps, entetes) => fetch(url + "/journal", { method: "POST", body: JSON.stringify(corps), headers: Object.assign({ "X-Forwarded-For": "10.0.0.1, 41.73.1.2" }, entetes || {}) });
const formulaire = (url, chemin, corps, entetes) => fetch(url + chemin, { method: "POST", body: corps, redirect: "manual", headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded", "X-Forwarded-For": "7.7.7.7" }, entetes || {}) });
const AGG = dossier => path.join(dossier, "donnees", "agregats");
const totauxDuJour = dossier => { const f = path.join(AGG(dossier), jourUTC() + ".json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const toutLeDossier = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? toutLeDossier(path.join(d, e.name)) : [fs.readFileSync(path.join(d, e.name), "utf8")]).join("\n");

test("serveur : refus de démarrer avec config.example.json tel quel, ou dans public_html", () => {
  const r = spawnSync(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: "0", LS_CONFIG: path.join(RACINE, "serveur", "config.example.json") }), timeout: 5000 });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr.toString(), /Refus de démarrer.*secretSession/);
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const r2 = spawnSync(process.execPath, [APP], { env: Object.assign({}, process.env, { PORT: "0", LS_CONFIG: path.join(dossier, "absent.json"), LS_SECRET_SESSION: SECRET, LS_DONNEES: path.join(dossier, "public_html", "donnees") }), timeout: 5000 });
  assert.strictEqual(r2.status, 1);
  assert.match(r2.stderr.toString(), /Refus de démarrer.*dossier public/);
  fs.rmSync(dossier, { recursive: true, force: true });
});

test("serveur : sans adminHash valable, aucune session, même avec un cookie signé correctement", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const exemple = JSON.parse(fs.readFileSync(path.join(RACINE, "serveur", "config.example.json"), "utf8"));
  const a = await serveur(dossier, { adminHash: exemple.adminHash });
  try {
    assert.match(a.erreurs(), /tableau de bord reste fermé/);
    assert.match(await (await formulaire(a.url, "/admin/connexion", "mdp=x")).text(), /non configuré/);
    // Cookie fabriqué avec le vrai secret (comme le script forge.js du juge) : refusé.
    const b64 = b => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const corps = b64(JSON.stringify({ exp: maintenant() + 3600, n: "forge" }));
    const cookie = corps + "." + b64(nodeCrypto.createHmac("sha256", SECRET).update(corps).digest());
    assert.match(await (await fetch(a.url + "/admin", { headers: { Cookie: "ls_admin=" + cookie } })).text(), /Accès réservé/);
  } finally { a.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : totaux du jour de réception, liste blanche, attaque sur 31 jours, deux processus, aucune trace", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  fs.mkdirSync(path.join(dossier, "donnees", "evenements"), { recursive: true });
  fs.writeFileSync(path.join(dossier, "donnees", "evenements", "2026-01-01.jsonl"), "{}\n");
  const a = await serveur(dossier, {}), b = await serveur(dossier, {}, "config2");
  try {
    assert.ok(!fs.existsSync(path.join(dossier, "donnees", "evenements")), "données brutes résiduelles effacées");
    assert.strictEqual((await poster(a.url, unLot(idLot(1)))).status, 204);
    assert.strictEqual((await poster(b.url, unLot(idLot(1)))).status, 204, "renvoi à un autre processus");
    let j = totauxDuJour(dossier);
    assert.strictEqual(j.lots, 1, "lot compté une seule fois");
    assert.strictEqual(j.visites.total, 1);
    assert.ok(!("typeOs" in j.visites) && !("heures" in j), "ni croisement type·système, ni heure par jour");
    assert.deepStrictEqual(j.objectifs["elec-01-premier-circuit@1|0"], { reussis: 1, ms: 30000, essais: 2, rates: 1, dejaFaits: 0 });
    assert.deepStrictEqual(j.questions["elec-06-led|1"], { justes: 0, fausses: 1 });
    assert.strictEqual(j.notions["elec-bases/grandeurs"], 1);
    const texte = JSON.stringify(j);
    for (const x of ["constructor", "<script>", "elec-06-led@2", "elec-06-led|7", "elec-06-led|5", "inventee", "inconnu", "piratage"]) assert.ok(!texte.includes(x), x + " refusé");
    const mois = JSON.parse(fs.readFileSync(path.join(AGG(dossier), "mois-" + jourUTC().slice(0, 7) + ".json"), "utf8"));
    assert.strictEqual(Object.values(mois.heures).reduce((x, y) => x + y, 0), 1, "heure des visites au mois");
    // Attaque : 300 événements sur 31 jours dans un lot : tout va au jour de réception, aucun autre fichier.
    const evs = Array.from({ length: 200 }, (_, k) => ({ t: maintenant() - (k % 40) * 86400, e: "page", p: "accueil", id: "" }));
    assert.strictEqual((await poster(a.url, unLot(idLot("atk"), evs))).status, 204);
    assert.deepStrictEqual(fs.readdirSync(AGG(dossier)).filter(f => /^\d{4}-/.test(f)), [jourUTC() + ".json"], "un seul jour touché");
    assert.strictEqual(totauxDuJour(dossier).pages.accueil.vues, 200, "événements anciens acceptés, rangés au jour de réception");
    // Deux processus en même temps : aucun total perdu.
    await Promise.all(Array.from({ length: 20 }, (_, k) => poster(k % 2 ? a.url : b.url, unLot(idLot("p" + k), [{ t: maintenant(), e: "page", p: "carte", id: "elec-bases" }]))));
    assert.strictEqual(totauxDuJour(dossier).pages["carte·elec-bases"].vues, 20, "verrou entre processus");
    // Verrou orphelin (processus tué) : repris.
    fs.writeFileSync(path.join(dossier, "donnees", ".verrou"), "orphelin");
    const vieux = new Date(Date.now() - 20000); fs.utimesSync(path.join(dossier, "donnees", ".verrou"), vieux, vieux);
    assert.strictEqual((await poster(a.url, unLot(idLot("orph"), [{ t: maintenant(), e: "page", p: "accueil", id: "" }]))).status, 204);
    assert.ok(!fs.existsSync(path.join(dossier, "donnees", ".verrou")));
    // Fichier du jour illisible : quarantaine, 503, puis reprise.
    fs.writeFileSync(path.join(AGG(dossier), jourUTC() + ".json"), "{pas du json");
    assert.strictEqual((await poster(a.url, unLot(idLot("q1"), [{ t: maintenant(), e: "page", p: "accueil", id: "" }]))).status, 503);
    assert.ok(fs.readdirSync(AGG(dossier)).some(f => f.startsWith(jourUTC() + ".json.corrompu-")), "mis en quarantaine");
    assert.strictEqual((await poster(a.url, unLot(idLot("q1"), [{ t: maintenant(), e: "page", p: "accueil", id: "" }]))).status, 204, "le lot renvoyé passe");
    assert.strictEqual((await poster(a.url, unLot(idLot(3), null, { v: 1 }))).status, 400);
    assert.strictEqual((await fetch(a.url + "/%E0%A4%A")).status, 400);
    assert.strictEqual((await poster(a.url, unLot(idLot(4)), { Origin: "https://autre-site.example" })).status, 403);
    assert.strictEqual((await fetch(a.url + "/journal")).status, 405);
    const tout = toutLeDossier(path.join(dossier, "donnees"));
    assert.ok(!tout.includes("41.73") && !tout.includes("10.0.0") && !/forwarded|agent|Mozilla/i.test(tout), "aucune IP ni user-agent");
    assert.ok(!new RegExp(String(maintenant()).slice(0, 6)).test(tout), "aucun horodatage stocké");
  } finally { a.arreter(); b.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : limites par adresse (dernière entrée XFF, /64 en IPv6, par jour), XFF absent, plafond du jour", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  const lot = k => unLot(idLot(k), [{ t: maintenant(), e: "page", p: "accueil", id: "" }]);
  const b = await serveur(dossier, { limiteLots10min: 2, dossierDonnees: path.join(dossier, "d2") }, "c2");
  // Le plafond compte la taille des événements VALIDÉS (pas du corps reçu) : un lot et demi.
  const W = S.chargerListeBlanche(path.join(RACINE, "serveur", "liste-blanche.json"));
  const tailleValidee = Buffer.byteLength(JSON.stringify(S.valider(unLot(idLot("c1")), maintenant(), W).evs)) + 40;
  const c = await serveur(dossier, { plafondOctetsJour: Math.round(tailleValidee * 1.5), dossierDonnees: path.join(dossier, "d3") }, "c3");
  const d = await serveur(dossier, { plafondIpJour: 2, dossierDonnees: path.join(dossier, "d4") }, "c4");
  try {
    const xff = v => ({ "X-Forwarded-For": v });
    assert.strictEqual((await poster(b.url, lot("b1"), xff("1.1.1.1, 9.9.9.9"))).status, 204);
    assert.strictEqual((await poster(b.url, lot("b2"), xff("2.2.2.2, 9.9.9.9"))).status, 204);
    assert.strictEqual((await poster(b.url, lot("b3"), xff("3.3.3.3, 9.9.9.9"))).status, 429, "même dernière entrée");
    assert.strictEqual((await poster(b.url, lot("b4"), xff("9.9.9.9, 8.8.8.8"))).status, 204);
    assert.strictEqual((await poster(b.url, lot("v1"), xff("2001:db8:1:2::10"))).status, 204);
    assert.strictEqual((await poster(b.url, lot("v2"), xff("2001:db8:1:2::20"))).status, 204);
    assert.strictEqual((await poster(b.url, lot("v3"), xff("2001:db8:1:2:ffff::1"))).status, 429, "même /64");
    assert.strictEqual((await poster(b.url, lot("v4"), xff("2001:db8:1:3::1"))).status, 204, "autre /64");
    for (let k = 0; k < 4; k++) assert.strictEqual((await poster(b.url, lot("sans" + k), { "X-Forwarded-For": "" })).status, 204, "XFF absent : pas de limite par adresse");
    assert.strictEqual((await poster(d.url, lot("d1"))).status, 204);
    assert.strictEqual((await poster(d.url, lot("d2"))).status, 204);
    assert.strictEqual((await poster(d.url, lot("d3"))).status, 429, "plafond par adresse et par jour");
    assert.strictEqual((await poster(c.url, unLot(idLot("c1")))).status, 204);
    assert.strictEqual((await poster(c.url, unLot(idLot("c2")))).status, 503, "plafond d'octets du jour");
    assert.strictEqual((await poster(c.url, unLot(idLot("c1")))).status, 204, "un lot déjà reçu reste confirmé");
  } finally { b.arreter(); c.arreter(); d.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("serveur : tableau de bord (jours clos, seuil k), CSV, CSRF, purge, déconnexion, essais de connexion", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "journal-"));
  fs.mkdirSync(AGG(dossier), { recursive: true });
  // Hier : des totaux écrits à la main, certains sous le seuil.
  fs.writeFileSync(path.join(AGG(dossier), jourUTC(-1) + ".json"), JSON.stringify({ lots: 12, octets: 1, visites: { total: 12, retour: { premiere: 9, moins7: 3 }, niveau: { 1: 12 }, type: { telephone: 12 }, os: { android: 12 }, largeur: { "<400": 12 } },
    paliers: { 1: 8, 5: 2 }, pages: { "tp·elec-06-led": { vues: 7, ms: 70000 }, "carte·elec-bases": { vues: 2, ms: 1000 } }, tps: { "elec-06-led": { ouverts: 6, finis: 2, msFin: 9000 } },
    objectifs: { "elec-06-led|0": { reussis: 5, ms: 50000, essais: 9, rates: 4 } }, questions: {}, notions: { constructor: 6 }, cartes: { "@sum": 7 } }));
  const a = await serveur(dossier, { conservationJours: 400 }), b = await serveur(dossier, { conservationJours: 400 }, "config2");
  try {
    fs.writeFileSync(path.join(AGG(dossier), "2020-01-01.json"), JSON.stringify({ lots: 1 })); // après la purge du démarrage
    // Aujourd'hui : un TP ouvert 6 fois, jamais visible avant demain.
    for (let k = 0; k < 6; k++) await poster(a.url, unLot(idLot("auj" + k), [{ t: maintenant(), e: "tp_debut", id: "elec-02-loi-ohm" }]), { "X-Forwarded-For": "4.4.4." + k });
    assert.strictEqual((await fetch(a.url + "/admin/export.csv", { redirect: "manual" })).status, 401);
    // Délai après 3 échecs, par adresse ; pas de blocage global ; pas de délai si l'adresse n'est pas fiable.
    for (let k = 0; k < 3; k++) assert.strictEqual((await formulaire(a.url, "/admin/connexion", "mdp=faux", { "X-Forwarded-For": "5.5.5.5" })).status, 401);
    assert.strictEqual((await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", { "X-Forwarded-For": "5.5.5.5" })).status, 429);
    for (let k = 0; k < 4; k++) await formulaire(a.url, "/admin/connexion", "mdp=faux", { "X-Forwarded-For": "" });
    assert.strictEqual((await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", { "X-Forwarded-For": "" })).status, 303, "XFF absent : pas de délai partagé");
    const p = await formulaire(a.url, "/admin/connexion", "mdp=mot-de-passe-essai", { "X-Forwarded-For": "6.6.6.6" });
    assert.strictEqual(p.status, 303);
    const cookie = p.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/);
    const jeton = { Cookie: cookie.split(";")[0] };
    const tab = await fetch(b.url + "/admin?jours=7", { headers: jeton });
    assert.ok(tab.headers.get("strict-transport-security"));
    const html = await tab.text();
    assert.match(html, /seulement des jours clos/);
    assert.ok(!html.includes("elec-02-loi-ohm"), "jour en cours invisible");
    assert.match(html, /elec-06-led/);
    assert.ok(!html.includes("carte·elec-bases"), "ligne sous le seuil absente");
    assert.ok(!html.includes("revenu en moins de 7 jours"), "répartition sous le seuil absente");
    assert.match(html, /&lt; 5/, "cases masquées");
    assert.ok(!html.includes(">< 5"), "« < 5 » toujours échappé");
    assert.match(html, /constructor/, "clé « constructor » lue comme une autre");
    assert.match(html, /objectifs à réponse écrite/);
    assert.ok(!/·android|telephone·/.test(html), "plus de croisement type·système");
    const csrf = /name="csrf" value="([^"]+)"/.exec(html)[1];
    const csv = await (await fetch(a.url + "/admin/export.csv?jours=7", { headers: jeton })).text();
    assert.match(csv, /"tps";"elec-06-led";"ouverts";"6"/);
    assert.match(csv, /"tps";"elec-06-led";"premieres_fins";"< 5"/);
    assert.match(csv, /"'@sum"/, "apostrophe devant @");
    assert.ok(!csv.includes("elec-02-loi-ohm") && !csv.includes("carte·elec-bases") && !csv.includes(jourUTC() + '"'), "ni jour en cours, ni ligne sous le seuil");
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=tout&confirmer=EFFACER&csrf=mauvais", jeton)).text(), /Session expirée/);
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=anciens&csrf=" + csrf, jeton)).text(), /1 jour\(s\)/);
    assert.ok(!fs.existsSync(path.join(AGG(dossier), "2020-01-01.json")));
    // Fichier illisible d'un jour clos : signalé, non compté.
    fs.writeFileSync(path.join(AGG(dossier), jourUTC(-2) + ".json"), "{cassé");
    // (sur l'autre processus : chacun garde ses totaux une minute en cache)
    assert.match(await (await fetch(b.url + "/admin?jours=30", { headers: jeton })).text(), /quarantaine/);
    assert.match(await (await formulaire(a.url, "/admin/purger", "quoi=tout&confirmer=EFFACER&csrf=" + csrf, jeton)).text(), /Tous les totaux/);
    const sortie = await formulaire(a.url, "/admin/deconnexion", "csrf=" + csrf, jeton);
    assert.strictEqual(sortie.status, 303);
    assert.match(await (await fetch(a.url + "/admin", { headers: jeton })).text(), /Accès réservé/, "session révoquée");
    const diag = await (await fetch(b.url + "/admin/diagnostic", { headers: Object.assign({}, jeton) })).text();
    assert.match(diag, /X-Forwarded-For est absent/, "alerte quand XFF manque derrière le proxy");
  } finally { a.arreter(); b.arreter(); fs.rmSync(dossier, { recursive: true, force: true }); }
});
