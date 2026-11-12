/* Quiz d'un TP dans un vrai navigateur (Chromium sans écran, Playwright) : une réponse au quiz est
   enregistrée sous la clé du TP (tp.cleEtat, « id » ou « id@niveau »), jamais sous « q0 », et tp.js
   émet ls:essai avec cette clé. Le test est sauté si Playwright ou Chromium manque (par exemple en CI). */
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

test("quiz : l'état est écrit sous la clé du TP et ls:essai porte cette clé", { skip: !pw && "Playwright absent" }, async t => {
  const serveur = http.createServer((q, r) => {
    const p = decodeURIComponent(new URL(q.url, "http://x").pathname), f = path.join(RACINE, path.normalize(p === "/" ? "/index.html" : p));
    // Jamais le vrai journal pendant les tests : configuration vide.
    if (p.endsWith("config-journal.js")) { r.writeHead(200, { "Content-Type": "text/javascript" }); return r.end('window.LS = window.LS || {}; window.LS.JOURNAL_URL = "";'); }
    if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
  }).listen(0, "127.0.0.1");
  await new Promise(ok => serveur.once("listening", ok));
  let navigateur;
  try { navigateur = await pw.chromium.launch(); }
  catch (e) {
    try { navigateur = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" }); }
    catch (x) { serveur.close(); return t.skip("Chromium absent"); }
  }
  try {
    for (const [id, cleAttendue] of [["elec-02-loi-ohm", "elec-02-loi-ohm"], ["elec-04-serie-parallele", "elec-04-serie-parallele@3"]]) {
      const ctx = await navigateur.newContext({ viewport: { width: 1200, height: 900 } });
      await ctx.addInitScript(() => {
        localStorage.setItem("learnspace:profil", JSON.stringify({ niveau: 3, parAtelier: {} }));
        document.addEventListener("ls:essai", e => { window.__essais = (window.__essais || []).concat([e.detail]); });
      });
      const p = await ctx.newPage();
      const erreurs = []; p.on("pageerror", e => erreurs.push(e.message));
      await p.goto("http://127.0.0.1:" + serveur.address().port + "/tp.html?id=" + id);
      await p.waitForSelector(".question", { state: "attached", timeout: 15000 });
      await p.locator("button", { hasText: "Questions" }).first().click();
      await p.locator(".question .choix button:visible").first().click();
      const cles = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("learnspace:tp") || "{}")));
      const essais = await p.evaluate(() => window.__essais || []);
      assert.ok(cles.includes(cleAttendue), id + " : état sous " + cleAttendue + " (clés : " + cles.join(", ") + ")");
      assert.ok(!cles.some(c => /^q\d+$/.test(c)), id + " : aucune clé « q0 »");
      assert.strictEqual(essais.length, 1);
      assert.strictEqual(essais[0].tp, cleAttendue);
      assert.deepStrictEqual(erreurs, []);
      await ctx.close();
    }
  } finally { await navigateur.close(); serveur.close(); }
});
