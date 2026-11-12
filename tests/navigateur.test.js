/* Tests dans un vrai navigateur (Chromium sans écran, Playwright) : mise à jour de l'application
   (« Recharger » dans l'onglet de la première visite, saisie en cours protégée), premier chargement
   quand config-journal.js ne répond pas, réussites émises par le vrai tp.js (ouverture avec l'état
   déjà enregistré), signal « simulation en marche », Global Privacy Control.
   Sautés si Playwright ou Chromium manque (c'est le cas en CI : voir docs/JOURNAL.md).
   Le serveur de test ne parle jamais au vrai journal : il sert sa propre config-journal.js. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const RACINE = path.join(__dirname, "..");

function chargerPlaywright() {
  for (const m of ["playwright", "/opt/node-tools/node_modules/playwright", "playwright-core"]) { try { return require(m); } catch (e) { /* suivant */ } }
  return null;
}
const pw = chargerPlaywright();
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".json": "application/json" };

// Serveur du site, avec des modes : « v2 » (nouvelle version), « pendre » (config-journal.js ne répond
// jamais), « journal » (journal branché sur /api/journal de ce serveur, qui garde les lots reçus).
function serveurSite() {
  const etat = { modes: new Set(), recus: [] };
  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, "http://x");
    if (u.pathname === "/api/journal" && q.method === "POST") {
      const b = []; q.on("data", x => b.push(x)); q.on("end", () => { try { etat.recus.push(JSON.parse(Buffer.concat(b))); } catch (e) { /* ignoré */ } r.writeHead(204); r.end(); });
      return;
    }
    const p = u.pathname === "/" ? "/index.html" : decodeURIComponent(u.pathname), f = path.join(RACINE, path.normalize(p));
    if (p.endsWith("config-journal.js")) {
      if (etat.modes.has("pendre")) return; // ne répond jamais
      r.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-cache" });
      return r.end('window.LS = window.LS || {}; window.LS.JOURNAL_URL = ' + JSON.stringify(etat.modes.has("journal") ? "/api/journal" : "") + ";");
    }
    if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let corps = fs.readFileSync(f);
    if (etat.modes.has("v2") && p === "/sw-fichiers.js") corps = Buffer.from(corps.toString().replace(/LS_VERSION = "[0-9a-f]+"/, 'LS_VERSION = "000000000002"'));
    if (etat.modes.has("v2") && p === "/assets/js/tp.js") corps = Buffer.concat([corps, Buffer.from("\nwindow.VERSION_TP = 'v2';")]);
    r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }); r.end(corps);
  }).listen(0, "127.0.0.1");
  return new Promise(ok => srv.once("listening", () => ok({ srv, etat, url: "http://127.0.0.1:" + srv.address().port, fermer: () => { srv.closeAllConnections && srv.closeAllConnections(); srv.close(); } })));
}
async function lancer(t) {
  try { return await pw.chromium.launch(); }
  catch (e) {
    try { return await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" }); }
    catch (x) { t.skip("Chromium absent"); return null; }
  }
}
const SANS = !pw && "Playwright absent";

test("premier chargement sans service worker, config-journal.js ne répond pas : la page s'ouvre sans attendre", { skip: SANS }, async t => {
  const S = await serveurSite(), b = await lancer(t);
  if (!b) return S.fermer();
  try {
    S.etat.modes = new Set(["pendre"]);
    const p = await (await b.newContext()).newPage();
    const debut = Date.now();
    await p.goto(S.url + "/index.html", { waitUntil: "load", timeout: 15000 });
    const duree = Date.now() - debut;
    assert.ok(duree < 3000, "événement load en " + duree + " ms");
    assert.ok(await p.$(".entete"), "page affichée");
  } finally { await b.close(); S.fermer(); }
});

test("mise à jour : « Recharger » recharge l'onglet de la première visite (nouveau code), un onglet en pleine saisie attend", { skip: SANS }, async t => {
  const S = await serveurSite(), b = await lancer(t);
  if (!b) return S.fermer();
  try {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
    // C : onglet de la toute première visite (pas encore contrôlé au chargement).
    const C = await ctx.newPage();
    await C.goto(S.url + "/tp.html?id=elec-02-loi-ohm");
    await C.evaluate(() => navigator.serviceWorker.ready);
    await C.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await C.evaluate(() => { window.__marque = "C"; });
    // B : onglet contrôlé avec une réponse en cours de saisie.
    const B = await ctx.newPage();
    await B.goto(S.url + "/tp.html?id=num-05-echantillonnage");
    await B.waitForSelector(".saisie input", { state: "attached", timeout: 15000 });
    await B.evaluate(() => { window.__marque = "B"; const i = document.querySelector(".saisie input"); i.disabled = false; i.value = "12,5"; });
    // Nouvelle version du site.
    S.etat.modes = new Set(["v2"]);
    await C.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await C.waitForSelector("#avis-maj button", { timeout: 20000 });
    await Promise.all([C.waitForNavigation({ timeout: 15000 }), C.click("#avis-maj button")]);
    await C.waitForFunction(() => window.VERSION_TP === "v2", null, { timeout: 15000 });
    assert.strictEqual(await C.evaluate(() => window.__marque), undefined, "onglet de la première visite rechargé");
    // B : pas rechargé tant que la réponse est en cours, avis affiché, réponse intacte.
    await B.waitForTimeout(1500);
    assert.strictEqual(await B.evaluate(() => window.__marque), "B", "onglet en pleine saisie pas rechargé");
    assert.strictEqual(await B.evaluate(() => document.querySelector(".saisie input").value), "12,5");
    assert.match(await B.textContent("#avis-maj"), /dès que ta réponse sera validée ou effacée/);
    // Réponse effacée : l'onglet se recharge et prend la nouvelle version.
    await Promise.all([B.waitForNavigation({ timeout: 15000 }), B.evaluate(() => { document.querySelector(".saisie input").value = ""; })]);
    await B.waitForFunction(() => window.VERSION_TP === "v2", null, { timeout: 15000 });
  } finally { await b.close(); S.fermer(); }
});

test("réussites émises par le vrai tp.js : objectif réussi une fois, puis rouverture avec l'état déjà enregistré", { skip: SANS }, async t => {
  const S = await serveurSite(), b = await lancer(t);
  if (!b) return S.fermer();
  try {
    S.etat.modes = new Set(["journal"]);
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem("learnspace:profil", JSON.stringify({ niveau: 3, parAtelier: {} })); localStorage.setItem("learnspace:journalInfoVue", "true"); } catch (e) { /* rien */ } });
    const p = await ctx.newPage();
    // Tous les événements, une seule fois : lots reçus par le serveur, lots en attente pas encore reçus, file.
    const tous = async () => {
      const local = await p.evaluate(() => ({ file: JSON.parse(localStorage.getItem("learnspace:journalFile") || "[]"), lots: JSON.parse(localStorage.getItem("learnspace:journalLots") || "[]") }));
      const recus = new Map(S.etat.recus.map(l => [l.lot, l]));
      return [...recus.values()].flatMap(l => l.evs).concat(local.lots.filter(l => !recus.has(l.id)).flatMap(l => l.evs), local.file);
    };
    await p.goto(S.url + "/tp.html?id=num-05-echantillonnage");
    await p.waitForFunction(() => window.simulation && window.LS.journal, null, { timeout: 15000 });
    // Objectif 1 (index 0) : atteint en réglant la simulation (fe < 2 f) ; objectif 3 (index 2) : réponse écrite.
    await p.evaluate(() => { window.simulation.p.f = 3; window.simulation.p.fe = 2; window.simulation.p.n = 12; });
    const champ = p.locator(".saisie input").first();
    await champ.fill("100"); await champ.press("Enter");
    await champ.fill("4096"); await champ.press("Enter");
    await p.waitForFunction(() => { const e = JSON.parse(localStorage.getItem("learnspace:tp") || "{}")["num-05-echantillonnage"]; return e && e.objectifs && e.objectifs[0] && e.objectifs[2]; }, null, { timeout: 15000 });
    let evs = await tous();
    const objectifs = evs.filter(e => e.e === "objectif" && e.id === "num-05-echantillonnage").map(e => e.i).sort();
    assert.deepStrictEqual(objectifs, [0, 2], "première réussite des objectifs 1 et 3, émise par tp.js");
    assert.deepStrictEqual(evs.filter(e => e.e === "essai").map(e => e.ok), [false, true], "essai raté puis réussi");
    const premier = evs.find(e => e.e === "tp_debut");
    assert.deepStrictEqual(premier.faits, [], "première ouverture : rien de déjà réussi");
    // Rouverture : l'état déjà enregistré part avec l'ouverture ; aucune nouvelle « réussite ».
    await p.evaluate(() => sessionStorage.clear()); // nouvelle visite (une ouverture compte une fois par visite)
    await p.reload();
    await p.waitForFunction(() => JSON.parse(localStorage.getItem("learnspace:journalFile") || "[]").concat(JSON.parse(localStorage.getItem("learnspace:journalLots") || "[]").flatMap(l => l.evs)).some(e => e.e === "tp_debut" && e.faits && e.faits.length), null, { timeout: 15000 }).catch(() => {});
    evs = await tous();
    const ouvertures = evs.filter(e => e.e === "tp_debut");
    assert.ok(ouvertures.some(e => JSON.stringify(e.faits.slice().sort()) === "[0,2]" && e.deja === false), "rouverture avec faits = [0, 2] : " + JSON.stringify(ouvertures));
    assert.strictEqual(evs.filter(e => e.e === "objectif").length, 2, "pas de réussite en double");
  } finally { await b.close(); S.fermer(); }
});

test("temps actif : le signal « simulation en marche » s'arrête quand la simulation est en pause", { skip: SANS }, async t => {
  const S = await serveurSite(), b = await lancer(t);
  if (!b) return S.fermer();
  try {
    const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
    for (const id of ["meca-01-quatre-temps", "elec-02-loi-ohm"]) { // simulation animée, puis éditeur de circuits
      await p.goto(S.url + "/tp.html?id=" + id);
      await p.waitForFunction(() => Date.now() - (window.LS.derniereSimEnMarche || 0) < 500, null, { timeout: 15000 });
      await p.locator("button", { hasText: /^Pause$/ }).first().click();
      await p.waitForTimeout(300);
      const apres = await p.evaluate(() => window.LS.derniereSimEnMarche);
      await p.waitForTimeout(1500);
      assert.strictEqual(await p.evaluate(() => window.LS.derniereSimEnMarche), apres, id + " : plus de signal en pause");
    }
  } finally { await b.close(); S.fermer(); }
});

test("Global Privacy Control : la file en attente est vidée, rien n'est envoyé", { skip: SANS }, async t => {
  const S = await serveurSite(), b = await lancer(t);
  if (!b) return S.fermer();
  try {
    S.etat.modes = new Set(["journal"]);
    const ctx = await b.newContext();
    await ctx.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true });
      if (!sessionStorage.getItem("x")) { sessionStorage.setItem("x", "1"); localStorage.setItem("learnspace:journalFile", JSON.stringify([{ e: "page", p: "accueil", id: "", t: 1 }])); }
    });
    const p = await ctx.newPage();
    await p.goto(S.url + "/index.html");
    await p.waitForFunction(() => window.LS.journal && window.LS.journal.oppose, null, { timeout: 15000 });
    await p.waitForTimeout(3500);
    assert.deepStrictEqual(await p.evaluate(() => Object.keys(localStorage).filter(k => /journal(File|Lots|DerniereVisite)/.test(k))), []);
    assert.strictEqual(S.etat.recus.length, 0);
  } finally { await b.close(); S.fermer(); }
});
