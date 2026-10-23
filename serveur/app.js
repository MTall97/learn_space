/* Serveur du journal d'utilisation de Learn Space (Node.js 18, 20 ou 22, sans dépendance npm).
   - POST /journal : reçoit des lots d'événements pseudonymes envoyés par assets/js/journal.js.
   - /admin : tableau de bord réservé à l'administrateur (mot de passe, session, CSRF), export CSV, purge.
   Stockage : un fichier JSON Lines par jour de réception (une ligne par lot), dans un dossier de données
   hors du dossier public. Aucune adresse IP n'est enregistrée : X-Forwarded-For ne sert qu'à une limite
   de débit gardée en mémoire. Données de plus de 13 mois effacées automatiquement.
   Lancement : `node serveur/app.js` (le port vient de PORT ; sur O2switch, Passenger le fournit).
   Hacher un mot de passe : `node serveur/app.js --hacher "mot de passe"`. Voir docs/JOURNAL.md. */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/* ---------- Mot de passe (scrypt) ---------- */
function hacher(mdp) {
  const sel = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(mdp), sel, 64, { N: 16384, r: 8, p: 1 });
  return "scrypt$16384$8$1$" + sel.toString("base64") + "$" + h.toString("base64");
}
function verifier(mdp, stocke) {
  const m = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([^$]+)\$([^$]+)$/.exec(String(stocke || ""));
  if (!m) return false;
  const attendu = Buffer.from(m[5], "base64");
  const h = crypto.scryptSync(String(mdp), Buffer.from(m[4], "base64"), attendu.length, { N: +m[1], r: +m[2], p: +m[3], maxmem: 64 * 1024 * 1024 });
  return h.length === attendu.length && crypto.timingSafeEqual(h, attendu);
}
if (process.argv[2] === "--hacher") { console.log(hacher(process.argv[3] || "")); process.exit(0); }

/* ---------- Configuration ---------- */
function lireConfig() {
  const fichier = process.env.LS_CONFIG || path.join(__dirname, "config.json");
  let c = {};
  try { c = JSON.parse(fs.readFileSync(fichier, "utf8")); } catch (e) { /* pas de fichier : valeurs par défaut et variables d'environnement */ }
  const env = process.env;
  return {
    origines: [].concat(env.LS_ORIGINES ? env.LS_ORIGINES.split(",") : c.origines || []).map(s => s.trim().replace(/\/$/, "")).filter(Boolean),
    dossierDonnees: env.LS_DONNEES || c.dossierDonnees || path.join(__dirname, "donnees"),
    adminHash: env.LS_ADMIN_HASH || c.adminHash || "",
    base: (env.LS_BASE !== undefined ? env.LS_BASE : c.base !== undefined ? c.base : env.PASSENGER_BASE_URI || "").replace(/\/$/, ""),
    conservationJours: +(env.LS_CONSERVATION_JOURS || c.conservationJours || 395),
    limiteLots10min: +(env.LS_LIMITE_LOTS || c.limiteLots10min || 120),
    cookieSecure: env.LS_COOKIE_SECURE ? env.LS_COOKIE_SECURE !== "non" : c.cookieSecure !== false
  };
}
const CONFIG = lireConfig();
const DOSSIER = path.join(CONFIG.dossierDonnees, "evenements");
fs.mkdirSync(DOSSIER, { recursive: true, mode: 0o700 });

/* ---------- Validation (liste blanche) ---------- */
const EVENEMENTS = new Set(["page", "temps", "tp_debut", "tp_fin", "objectif", "question", "notion", "carte_finie"]);
const PAGES = new Set(["accueil", "carte", "tp", "autre"]);
const TYPES = new Set(["telephone", "tablette", "ordinateur"]);
const SYSTEMES = new Set(["android", "ios", "windows", "macos", "linux", "chromeos", "autre"]);
const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
function valider(lot, maintenant) {
  if (!lot || typeof lot !== "object" || lot.v !== 1) return null;
  if (typeof lot.appareil !== "string" || !/^[0-9a-f]{32}$/.test(lot.appareil)) return null;
  if (typeof lot.lot !== "string" || !/^[0-9a-f]{32}$/.test(lot.lot)) return null;
  if (!Array.isArray(lot.evs) || lot.evs.length === 0 || lot.evs.length > 300) return null;
  const cat = lot.cat && typeof lot.cat === "object" ? lot.cat : {};
  const propre = {
    lot: lot.lot, a: lot.appareil, r: maintenant,
    type: TYPES.has(cat.type) ? cat.type : null, os: SYSTEMES.has(cat.os) ? cat.os : null,
    largeur: entier(cat.largeur, 0, 10000) ? Math.round(cat.largeur / 50) * 50 : null,
    niveau: entier(lot.niveau, 1, 4) ? lot.niveau : null, evs: []
  };
  for (const ev of lot.evs) {
    if (!ev || typeof ev !== "object" || !EVENEMENTS.has(ev.e)) continue;
    // Les événements gardés hors ligne peuvent arriver jusqu'à 60 jours plus tard.
    if (!entier(ev.t, maintenant - 60 * 86400, maintenant + 86400)) continue;
    const x = { t: ev.t, e: ev.e };
    if (PAGES.has(ev.p)) x.p = ev.p;
    if (ev.e === "notion") {
      if (typeof ev.noeud !== "string" || !/^[a-z0-9-]{1,40}\/[a-z0-9-]{1,120}$/.test(ev.noeud)) continue;
      x.c = ev.noeud;
    } else if (ev.id !== undefined) {
      if (typeof ev.id !== "string" || !/^[a-z0-9@-]{0,64}$/.test(ev.id)) continue;
      x.c = ev.id;
    }
    if (entier(ev.i, 0, 99)) x.i = ev.i;
    if (entier(ev.ms, 0, 86400000)) x.ms = ev.ms;
    if (ev.e === "temps" && x.ms === undefined) continue;
    propre.evs.push(x);
  }
  return propre;
}

/* ---------- Stockage : un fichier par jour, une ligne par lot ---------- */
const jour = s => new Date(s * 1000).toISOString().slice(0, 10);
const fichiersJours = () => fs.readdirSync(DOSSIER).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort();
function lireLots(depuis) {
  const lots = [], premier = jour(depuis - 86400);
  for (const f of fichiersJours()) {
    if (f.slice(0, 10) < premier) continue;
    for (const ligne of fs.readFileSync(path.join(DOSSIER, f), "utf8").split("\n")) {
      if (!ligne) continue;
      try { lots.push(JSON.parse(ligne)); } catch (e) { /* ligne tronquée : ignorée */ }
    }
  }
  return lots;
}
// Lots déjà reçus (un appareil renvoie un lot tant qu'il n'a pas eu de réponse) : on ne les compte qu'une fois.
const lotsVus = new Set();
for (const l of lireLots(Date.now() / 1000 - 7 * 86400)) lotsVus.add(l.lot);
let versionDonnees = 0;
function enregistrer(lot) {
  fs.appendFileSync(path.join(DOSSIER, jour(lot.r) + ".jsonl"), JSON.stringify(lot) + "\n", { mode: 0o600 });
  lotsVus.add(lot.lot); versionDonnees++;
}
function purger(jours) {
  const limite = jour(Date.now() / 1000 - jours * 86400);
  let n = 0;
  for (const f of fichiersJours()) if (f.slice(0, 10) < limite) { fs.unlinkSync(path.join(DOSSIER, f)); n++; }
  versionDonnees++;
  return n;
}
purger(CONFIG.conservationJours);
setInterval(() => purger(CONFIG.conservationJours), 24 * 3600 * 1000).unref();

/* ---------- Limite de débit, en mémoire seulement ---------- */
const compteurs = new Map();
function tropDeLots(cle, max) {
  const fenetre = Math.floor(Date.now() / 600000), k = fenetre + ":" + cle;
  const n = (compteurs.get(k) || 0) + 1;
  compteurs.set(k, n);
  if (compteurs.size > 50000) for (const kk of compteurs.keys()) if (!kk.startsWith(fenetre + ":")) compteurs.delete(kk);
  return n > max;
}

/* ---------- Agrégats du tableau de bord (petit cache) ---------- */
let cache = { cle: "", valeur: null, t: 0 };
function agregats(jours) {
  const cle = jours + ":" + versionDonnees;
  if (cache.cle === cle && Date.now() - cache.t < 60000) return cache.valeur;
  const maintenant = Date.now() / 1000, depuis = maintenant - jours * 86400;
  const lots = lireLots(depuis);
  const actifs = { "aujourd'hui (24 h)": new Set(), "7 jours": new Set(), "30 jours": new Set() };
  const pages = new Map(), tps = new Map(), objectifs = new Map(), appareils = new Map();
  const ligne = (m, k, init) => { if (!m.has(k)) m.set(k, init()); return m.get(k); };
  for (const l of lots) {
    appareils.set(l.a, { type: l.type, os: l.os, niveau: l.niveau, r: l.r });
    for (const ev of l.evs) {
      const age = maintenant - ev.t;
      if (age <= 86400) actifs["aujourd'hui (24 h)"].add(l.a);
      if (age <= 7 * 86400) actifs["7 jours"].add(l.a);
      if (age <= 30 * 86400) actifs["30 jours"].add(l.a);
      if (ev.t < depuis) continue;
      const nomPage = (ev.p || "") + (ev.c && ev.e !== "notion" ? " · " + ev.c : "");
      if (ev.e === "page") { const x = ligne(pages, nomPage, () => ({ vues: 0, appareils: new Set(), ms: 0 })); x.vues++; x.appareils.add(l.a); }
      if (ev.e === "temps") ligne(pages, nomPage, () => ({ vues: 0, appareils: new Set(), ms: 0 })).ms += ev.ms;
      const tp = ev.c ? ev.c.split("@")[0] : "";
      if (ev.e === "tp_debut") ligne(tps, tp, () => ({ debut: new Set(), fin: new Set(), ms: [] })).debut.add(l.a);
      if (ev.e === "tp_fin") { const x = ligne(tps, tp, () => ({ debut: new Set(), fin: new Set(), ms: [] })); x.fin.add(l.a); if (ev.ms !== undefined) x.ms.push(ev.ms); }
      if (ev.e === "objectif") { const x = ligne(objectifs, ev.c + "|" + (ev.i || 0), () => ({ tp, c: ev.c, i: ev.i || 0, appareils: new Set(), ms: [] })); x.appareils.add(l.a); if (ev.ms !== undefined) x.ms.push(ev.ms); }
    }
  }
  const moyenne = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const compte = (cleF) => { const m = new Map(); for (const [, a] of appareils) if (a.r >= depuis) { const k = cleF(a); m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((x, y) => y[1] - x[1]); };
  const NIV = { 1: "Primaire", 2: "Collège", 3: "Lycée", 4: "Avancé" };
  const valeur = {
    actifs: Object.entries(actifs).map(([k, s]) => [k, s.size]),
    pages: [...pages].map(([nom, x]) => [nom, x.vues, x.appareils.size, x.vues ? x.ms / x.vues : 0]).sort((a, b) => b[1] - a[1]).slice(0, 40),
    tps: [...tps].map(([nom, x]) => [nom, x.debut.size, x.fin.size, x.debut.size ? Math.round(100 * x.fin.size / x.debut.size) : null, moyenne(x.ms)]).sort((a, b) => b[1] - a[1]).slice(0, 60),
    objectifs: [...objectifs.values()].map(x => { const d = tps.has(x.tp) ? tps.get(x.tp).debut.size : 0; return [x.c, x.i + 1, d, x.appareils.size, d ? Math.min(100, Math.round(100 * x.appareils.size / d)) : null, moyenne(x.ms)]; })
      .sort((a, b) => (a[4] === null ? 999 : a[4]) - (b[4] === null ? 999 : b[4])).slice(0, 60),
    niveaux: compte(a => a.niveau ? NIV[a.niveau] : "non choisi"),
    appareils: compte(a => (a.type || "?") + " · " + (a.os || "?"))
  };
  cache = { cle, valeur, t: Date.now() };
  return valeur;
}

/* ---------- Sessions et protection du tableau de bord ---------- */
const sessions = new Map(); // jeton -> { csrf, expire }
let echecs = { n: 0, t: 0 };
const cookies = req => Object.fromEntries(String(req.headers.cookie || "").split(";").map(s => s.trim().split("=")).filter(x => x.length === 2));
function session(req) {
  const s = sessions.get(cookies(req).ls_admin || "");
  if (!s || s.expire < Date.now()) return null;
  s.expire = Date.now() + 2 * 3600 * 1000;
  return s;
}
const echap = s => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const duree = ms => { const s = Math.round((ms || 0) / 1000); return s >= 60 ? Math.floor(s / 60) + " min " + String(s % 60).padStart(2, "0") + " s" : s + " s"; };
function pageHtml(titre, corps) {
  return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>" + echap(titre) + "</title><style>" +
    "body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#eef1ec;color:#17221c}main{max-width:1100px;margin:0 auto;padding:16px}h1{font-size:1.6rem;margin:.2em 0}" +
    "h2{font-size:1.2rem;margin:1.6em 0 .4em;border-bottom:2px solid #17221c}table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #cdd6cb}th{background:#e2e8df}" +
    "td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.chiffres{display:flex;gap:28px;flex-wrap:wrap}.chiffres div{font-size:2rem;font-weight:700}.chiffres span{display:block;font-size:.85rem;font-weight:400;color:#55635a}" +
    "form.ligne{display:inline-flex;gap:8px;align-items:center;margin:4px 8px 4px 0;flex-wrap:wrap}button,input,select{font:inherit;padding:8px 12px;min-height:44px}button{cursor:pointer}.alerte{color:#c3352a;font-weight:700}.tableau{overflow-x:auto}" +
    "</style></head><body><main>" + corps + "</main></body></html>";
}
function tableau(entetes, numeriques, lignes) {
  if (!lignes.length) return "<p>Aucune donnée sur la période.</p>";
  return "<div class=\"tableau\"><table><thead><tr>" + entetes.map((e, k) => "<th" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(e) + "</th>").join("") + "</tr></thead><tbody>" +
    lignes.map(l => "<tr>" + l.map((v, k) => "<td" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(v) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
}

/* ---------- Serveur HTTP ---------- */
function lireCorps(req, max) {
  return new Promise((ok, ko) => {
    const morceaux = []; let taille = 0;
    req.on("data", m => { taille += m.length; if (taille > max) { ko(new Error("trop gros")); req.destroy(); } else morceaux.push(m); });
    req.on("end", () => ok(Buffer.concat(morceaux).toString("utf8")));
    req.on("error", ko);
  });
}
function repondre(res, code, corps, entetes) {
  res.writeHead(code, Object.assign({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, entetes || {}));
  res.end(corps || "");
}
const ENTETES_ADMIN = { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };

async function traiter(req, res) {
  let chemin = decodeURIComponent((req.url || "/").split("?")[0]);
  if (CONFIG.base && chemin.startsWith(CONFIG.base)) chemin = chemin.slice(CONFIG.base.length) || "/";
  const parametres = new URL(req.url || "/", "http://x").searchParams;
  const origine = req.headers.origin ? String(req.headers.origin).replace(/\/$/, "") : "";
  const origineOk = !origine || CONFIG.origines.includes(origine) || origine === "http://" + req.headers.host || origine === "https://" + req.headers.host;

  /* --- Réception du journal --- */
  if (chemin === "/journal") {
    const cors = origine && origineOk ? { "Access-Control-Allow-Origin": origine, "Vary": "Origin" } : {};
    if (req.method === "OPTIONS") return repondre(res, origineOk ? 204 : 403, "", Object.assign(cors, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" }));
    if (req.method !== "POST") return repondre(res, 405, "", { Allow: "POST" });
    if (!origineOk) return repondre(res, 403);
    // Limite de débit en mémoire par adresse (jamais écrite) puis par appareil.
    const adresse = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
    if (tropDeLots("ip:" + crypto.createHash("sha256").update(adresse).digest("hex").slice(0, 16), CONFIG.limiteLots10min * 5)) return repondre(res, 429, "", cors);
    let corps;
    try { corps = await lireCorps(req, 128 * 1024); } catch (e) { return repondre(res, 413, "", cors); }
    let lot;
    try { lot = valider(JSON.parse(corps), Math.floor(Date.now() / 1000)); } catch (e) { lot = null; }
    if (!lot) return repondre(res, 400, "", cors);
    if (lotsVus.has(lot.lot)) return repondre(res, 204, "", cors); // déjà reçu : on confirme sans recompter
    if (tropDeLots("a:" + lot.a, CONFIG.limiteLots10min)) return repondre(res, 429, "", Object.assign(cors, { "Retry-After": "600" }));
    if (lot.evs.length) enregistrer(lot);
    return repondre(res, 204, "", cors);
  }
  if (chemin === "/sante") return repondre(res, 200, "ok", { "Content-Type": "text/plain" });

  /* --- Tableau de bord --- */
  if (chemin === "/admin" || chemin.startsWith("/admin/")) {
    const s = session(req);
    const formulaire = req.method === "POST" ? new URLSearchParams(await lireCorps(req, 16 * 1024).catch(() => "")) : null;
    const csrfOk = s && formulaire && typeof formulaire.get("csrf") === "string" && formulaire.get("csrf").length === s.csrf.length && crypto.timingSafeEqual(Buffer.from(formulaire.get("csrf")), Buffer.from(s.csrf));
    const ici = CONFIG.base + "/admin";
    const cookie = (v, age) => "ls_admin=" + v + "; Path=" + ici + "; HttpOnly; SameSite=Strict; Max-Age=" + age + (CONFIG.cookieSecure ? "; Secure" : "");
    if (req.method === "POST" && origine && !origineOk) return repondre(res, 403);

    if (chemin === "/admin/connexion" && req.method === "POST") {
      let message = "";
      if (echecs.n >= 10 && Date.now() - echecs.t < 900000) message = "Trop d'essais ratés : réessaie dans 15 minutes.";
      else if (!/^scrypt\$/.test(CONFIG.adminHash)) message = "Mot de passe non configuré : voir docs/JOURNAL.md.";
      else if (verifier(formulaire.get("mdp") || "", CONFIG.adminHash)) {
        const jeton = crypto.randomBytes(32).toString("hex");
        sessions.set(jeton, { csrf: crypto.randomBytes(32).toString("hex"), expire: Date.now() + 2 * 3600 * 1000 });
        echecs = { n: 0, t: 0 };
        return repondre(res, 303, "", { Location: ici, "Set-Cookie": cookie(jeton, 7200) });
      } else {
        echecs = { n: (Date.now() - echecs.t < 900000 ? echecs.n : 0) + 1, t: Date.now() };
        await new Promise(r => setTimeout(r, 800));
        message = "Mot de passe incorrect.";
      }
      return repondre(res, 401, pageConnexion(message), ENTETES_ADMIN);
    }
    if (!s) return repondre(res, chemin === "/admin" ? 200 : 401, pageConnexion(""), ENTETES_ADMIN);
    if (chemin === "/admin/deconnexion" && req.method === "POST" && csrfOk) {
      sessions.delete(cookies(req).ls_admin);
      return repondre(res, 303, "", { Location: ici, "Set-Cookie": cookie("", 0) });
    }
    const jours = [1, 7, 30, 90, 395].includes(+parametres.get("jours")) ? +parametres.get("jours") : 30;
    if (chemin === "/admin/export.csv") {
      const depuis = Date.now() / 1000 - jours * 86400, champ = v => '"' + String(v === undefined || v === null ? "" : v).replace(/"/g, '""') + '"';
      const lignes = ["appareil;date;evenement;page;cible;numero;duree_ms;type;systeme;niveau"];
      for (const l of lireLots(depuis)) for (const ev of l.evs) if (ev.t >= depuis)
        lignes.push([l.a, new Date(ev.t * 1000).toISOString(), ev.e, ev.p, ev.c, ev.i, ev.ms, l.type, l.os, l.niveau].map(champ).join(";"));
      return repondre(res, 200, "﻿" + lignes.join("\n"), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"journal-" + new Date().toISOString().slice(0, 10) + ".csv\"" });
    }
    let message = "";
    if (chemin === "/admin/purger" && req.method === "POST") {
      if (!csrfOk) message = "Session expirée : recharge la page.";
      else if (formulaire.get("quoi") === "tout" && formulaire.get("confirmer") === "EFFACER") { for (const f of fichiersJours()) fs.unlinkSync(path.join(DOSSIER, f)); lotsVus.clear(); versionDonnees++; message = "Tout le journal a été effacé."; }
      else if (formulaire.get("quoi") === "anciens") message = purger(CONFIG.conservationJours) + " fichier(s) de plus de " + CONFIG.conservationJours + " jours effacé(s).";
      else message = "Pour tout effacer, tape EFFACER dans la case.";
    }
    return repondre(res, 200, pageTableau(s, jours, message), ENTETES_ADMIN);
  }
  return repondre(res, 404, "", { "Content-Type": "text/plain" });

  function pageConnexion(message) {
    return pageHtml("Connexion · journal", "<h1>Journal d'utilisation</h1><p>Accès réservé à l'administrateur.</p>" + (message ? "<p class=\"alerte\">" + echap(message) + "</p>" : "") +
      "<form method=\"post\" action=\"" + echap(CONFIG.base) + "/admin/connexion\"><label>Mot de passe <input type=\"password\" name=\"mdp\" required autocomplete=\"current-password\" autofocus></label> <button>Entrer</button></form>");
  }
  function pageTableau(s, jours, message) {
    const a = agregats(jours), b = echap(CONFIG.base), jeton = "<input type=\"hidden\" name=\"csrf\" value=\"" + echap(s.csrf) + "\">";
    const periodes = [[1, "24 h"], [7, "7 jours"], [30, "30 jours"], [90, "90 jours"], [395, "13 mois"]].map(([j, n]) => "<option value=\"" + j + "\"" + (j === jours ? " selected" : "") + ">" + n + "</option>").join("");
    return pageHtml("Journal d'utilisation", "<h1>Journal d'utilisation</h1>" + (message ? "<p class=\"alerte\">" + echap(message) + "</p>" : "") +
      "<form class=\"ligne\" method=\"get\" action=\"" + b + "/admin\"><label>Période <select name=\"jours\">" + periodes + "</select></label><button>Afficher</button></form>" +
      "<form class=\"ligne\" method=\"get\" action=\"" + b + "/admin/export.csv\"><input type=\"hidden\" name=\"jours\" value=\"" + jours + "\"><button>Exporter en CSV</button></form>" +
      "<form class=\"ligne\" method=\"post\" action=\"" + b + "/admin/deconnexion\">" + jeton + "<button>Se déconnecter</button></form>" +
      "<div class=\"chiffres\">" + a.actifs.map(([k, n]) => "<div>" + n + "<span>appareils actifs, " + echap(k) + "</span></div>").join("") + "</div>" +
      "<h2>Pages les plus consultées</h2>" + tableau(["Page", "Vues", "Appareils", "Temps actif moyen par vue"], [0, 1, 1, 1], a.pages.map(p => [p[0], p[1], p[2], duree(p[3])])) +
      "<h2>TP : ouverts, terminés, durée</h2>" + tableau(["TP", "Appareils qui l'ont ouvert", "Appareils qui l'ont terminé", "Réussite", "Durée moyenne jusqu'à la fin"], [0, 1, 1, 1, 1], a.tps.map(t => [t[0], t[1], t[2], t[3] === null ? "" : t[3] + " %", t[2] ? duree(t[4]) : ""])) +
      "<h2>Objectifs : où les élèves bloquent (taux le plus bas en premier)</h2>" + tableau(["TP", "Objectif", "Appareils ayant ouvert le TP", "Appareils l'ayant atteint", "Taux", "Temps moyen pour l'atteindre"], [0, 1, 1, 1, 1, 1], a.objectifs.map(o => [o[0], o[1], o[2], o[3], o[4] === null ? "" : o[4] + " %", duree(o[5])])) +
      "<h2>Niveaux choisis</h2>" + tableau(["Niveau", "Appareils"], [0, 1], a.niveaux) +
      "<h2>Types d'appareils</h2>" + tableau(["Type · système", "Appareils"], [0, 1], a.appareils) +
      "<h2>Purge</h2><form class=\"ligne\" method=\"post\" action=\"" + b + "/admin/purger\"><input type=\"hidden\" name=\"quoi\" value=\"anciens\">" + jeton + "<button>Effacer les données de plus de " + CONFIG.conservationJours + " jours</button></form>" +
      "<form class=\"ligne\" method=\"post\" action=\"" + b + "/admin/purger\"><input type=\"hidden\" name=\"quoi\" value=\"tout\">" + jeton + "<label>Tout effacer : tape EFFACER <input name=\"confirmer\" autocomplete=\"off\" size=\"9\"></label><button>Tout effacer</button></form>" +
      "<p>Données pseudonymes : un numéro tiré au hasard par appareil, sans nom ni adresse IP. Conservation : " + CONFIG.conservationJours + " jours.</p>");
  }
}

const serveur = http.createServer((req, res) => {
  traiter(req, res).catch(err => { console.error("journal :", err && err.message); if (!res.headersSent) repondre(res, 500); });
});
serveur.listen(process.env.PORT || 3000, () => console.log("Journal Learn Space à l'écoute sur le port " + serveur.address().port));
module.exports = { valider, hacher, verifier };
