/* Application installable et hors ligne : manifeste, icônes, liste de précache à jour et complète,
   comportement du service worker (cache, exclusions, page hors ligne). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const precache = require("../outils/liste-precache.js");
const RACINE = precache.RACINE;

// Fichiers qui ne font pas partie du site servi (outils, documentation, serveur du journal).
const HORS_SITE = new Set(["serveur", "docs", "tests", "outils", ".git", ".github", "node_modules"]);
function fichiersDuSite(dossier) {
  return fs.readdirSync(path.join(RACINE, dossier), { withFileTypes: true }).flatMap(e => {
    const rel = dossier ? dossier + "/" + e.name : e.name;
    if (e.isDirectory()) return HORS_SITE.has(rel) ? [] : fichiersDuSite(rel);
    return /\.(md|gitignore|htaccess)$/.test(e.name) || e.name.startsWith(".") || ["sw.js", "sw-fichiers.js"].includes(rel) ? [] : [rel];
  });
}

test("sw-fichiers.js est à jour (sinon : node outils/liste-precache.js)", () => {
  assert.strictEqual(fs.readFileSync(path.join(RACINE, "sw-fichiers.js"), "utf8"), precache.contenu());
});

test("chaque fichier servi est dans la liste de précache, et chaque entrée existe", () => {
  const liste = new Set(precache.liste());
  for (const f of fichiersDuSite("")) assert.ok(liste.has(f), f + " absent de la liste");
  for (const f of liste) if (f !== "./") assert.ok(fs.existsSync(path.join(RACINE, f)), f + " n'existe pas");
  assert.ok(liste.has("./") && liste.has("index.html") && liste.has("hors-ligne.html") && liste.has("manifest.webmanifest"));
  // Tout ce que les pages et tp.js chargent à la demande : cartes, TP, simulations.
  for (const d of ["contenu/cartes", "contenu/tps", "assets/js/sims", "assets/js/circuit"])
    for (const f of fs.readdirSync(path.join(RACINE, d))) assert.ok(liste.has(d + "/" + f), d + "/" + f);
  // Les adresses locales citées par les pages existent.
  for (const page of fs.readdirSync(RACINE).filter(f => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(RACINE, page), "utf8");
    for (const m of html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|png|svg|webmanifest|html))"/g)) assert.ok(liste.has(m[1]), page + " → " + m[1]);
  }
});

test("manifeste complet et icônes PNG aux bonnes tailles", () => {
  const m = JSON.parse(fs.readFileSync(path.join(RACINE, "manifest.webmanifest"), "utf8"));
  for (const k of ["name", "short_name", "start_url", "scope", "display", "background_color", "theme_color", "lang", "description", "orientation", "icons", "shortcuts"]) assert.ok(m[k], k);
  assert.strictEqual(m.display, "standalone");
  assert.strictEqual(m.lang, "fr");
  const taillePng = f => { const b = fs.readFileSync(path.join(RACINE, f)); assert.strictEqual(b.toString("ascii", 1, 4), "PNG", f); return b.readUInt32BE(16) + "x" + b.readUInt32BE(20); };
  const icone = (taille, but) => m.icons.find(i => i.sizes === taille && i.type === "image/png" && i.purpose === but);
  for (const [t, but] of [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]]) {
    const i = icone(t, but);
    assert.ok(i, t + " " + but);
    assert.strictEqual(taillePng(i.src), t);
  }
  assert.strictEqual(taillePng("assets/icones/icone-180.png"), "180x180");
  for (const s of m.shortcuts) assert.ok(precache.liste().includes(s.url.replace(/^\.\//, "").replace(/[#?].*$/, "")), s.url);
  for (const page of ["index.html", "tp.html", "carte.html", "confidentialite.html", "hors-ligne.html"]) {
    const html = fs.readFileSync(path.join(RACINE, page), "utf8");
    for (const x of ['rel="manifest"', 'rel="apple-touch-icon"', 'name="theme-color"', "assets/js/pwa.js"]) assert.ok(html.includes(x), page + " : " + x);
  }
});

/* Service worker dans un contexte simulé. */
function serviceWorker(reseau) {
  const ecouteurs = {}, caches = new Map();
  const cle = r => typeof r === "string" ? new URL(r, "https://site.ml/").href : r.url;
  const sansRecherche = u => u.split("?")[0];
  const cache = nom => {
    if (!caches.has(nom)) caches.set(nom, new Map());
    const m = caches.get(nom);
    return {
      addAll: reqs => { for (const r of reqs) m.set(cle(r), { ok: true, corps: "cache:" + cle(r) }); return Promise.resolve(); },
      put: (r, rep) => { m.set(cle(r), rep); return Promise.resolve(); },
      match: (r, o) => { const k = cle(r); if (m.has(k)) return Promise.resolve(m.get(k)); if (o && o.ignoreSearch) for (const [kk, v] of m) if (sansRecherche(kk) === sansRecherche(k)) return Promise.resolve(v); return Promise.resolve(undefined); }
    };
  };
  const ctx = {
    self: { addEventListener: (t, f) => { ecouteurs[t] = f; }, skipWaiting() { ctx.saute = true; }, clients: { claim: () => Promise.resolve() } },
    location: { origin: "https://site.ml" }, URL, console,
    Request: class { constructor(u, o) { this.url = new URL(u, "https://site.ml/").href; this.cache = o && o.cache; } },
    Response: { error: () => ({ erreur: true }) },
    caches: { open: n => Promise.resolve(cache(n)), keys: () => Promise.resolve([...caches.keys()]), delete: n => Promise.resolve(caches.delete(n)), match: r => Promise.resolve(undefined) },
    fetch: req => reseau(req)
  };
  ctx.importScripts = f => vm.runInContext(fs.readFileSync(path.join(RACINE, f), "utf8"), ctx);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RACINE, "sw.js"), "utf8"), ctx);
  const requete = async (url, mode) => {
    let promesse = null;
    ecouteurs.fetch({ request: { method: "GET", url: new URL(url, "https://site.ml/").href, mode: mode || "no-cors" }, respondWith: p => { promesse = p; } });
    return promesse ? await promesse : "réseau direct";
  };
  return { ecouteurs, caches, ctx, requete, installer: async () => { let p; ecouteurs.install({ waitUntil: x => { p = x; } }); await p; } };
}

test("service worker : précache de toute la liste, cache versionné, exclusions, page hors ligne", async () => {
  const hors = () => Promise.reject(new Error("hors ligne"));
  const sw = serviceWorker(hors);
  await sw.installer();
  const [nom] = [...sw.caches.keys()];
  assert.match(nom, /^learnspace-v4-[0-9a-f]{12}$/);
  assert.strictEqual(sw.caches.get(nom).size, precache.liste().length, "tout est précaché");
  // Hors ligne : un TP et une carte jamais ouverts viennent du cache (même avec ?id=…), ainsi que leurs scripts.
  assert.match((await sw.requete("/tp.html?id=moteur-4-temps", "navigate")).corps, /tp\.html$/);
  assert.match((await sw.requete("/carte.html?id=elec-bases", "navigate")).corps, /carte\.html$/);
  assert.match((await sw.requete("/contenu/tps/elec-06-led.js")).corps, /elec-06-led\.js$/);
  // Une page absente du cache, sans réseau : page hors ligne.
  assert.match((await sw.requete("/inconnue.html", "navigate")).corps, /hors-ligne\.html$/);
  // Jamais de cache : journal, tableau de bord, autres sites, envois.
  for (const u of ["/api/journal", "/api/admin", "/admin/export.csv", "/journal"]) assert.strictEqual(await sw.requete(u), "réseau direct", u);
  let appele = false;
  sw.ecouteurs.fetch({ request: { method: "GET", url: "https://autre-site.example/x.js", mode: "no-cors" }, respondWith: () => { appele = true; } });
  assert.strictEqual(appele, false, "liens externes non mis en cache");
  // config-journal.js : réseau d'abord.
  const sw2 = serviceWorker(() => Promise.resolve({ ok: true, type: "basic", corps: "réseau", clone() { return this; } }));
  await sw2.installer();
  assert.strictEqual((await sw2.requete("/assets/js/config-journal.js")).corps, "réseau");
  assert.match((await sw2.requete("/assets/js/tp.js")).corps, /^cache:/, "le reste vient du cache");
  // « Recharger » : la nouvelle version prend la main.
  sw2.ecouteurs.message({ data: { type: "activer" } });
  assert.strictEqual(sw2.ctx.saute, true);
});
