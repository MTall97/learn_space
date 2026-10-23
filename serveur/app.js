/* Serveur du journal d'utilisation de Learn Space (Node.js 18, 20 ou 22, sans dépendance npm).
   - POST <base>/journal : reçoit des lots d'événements pseudonymes envoyés par assets/js/journal.js.
   - <base><cheminAdmin> : tableau de bord réservé à l'administrateur (mot de passe scrypt, cookie de
     session signé HMAC, jeton CSRF), export CSV, effacement d'un appareil, purge, diagnostic du proxy.
   Stockage : evenements/AAAA-MM-JJ.jsonl (une ligne par lot, jour de réception) et lots/AAAA-MM-JJ.txt
   (identifiants des lots reçus, pour ne jamais compter deux fois un lot renvoyé), dans un dossier de
   données hors du dossier public. Aucune adresse IP n'est écrite : l'adresse ne sert, en mémoire, qu'aux
   limites de débit et aux essais de connexion. Plafonds par jour et pour le dossier entier.
   Lancement : `node serveur/app.js` (port dans PORT ; sur O2switch, Passenger le fournit).
   Hacher un mot de passe : `node serveur/app.js --hacher` puis taper le mot de passe. Voir docs/JOURNAL.md. */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

/* ---------- Mot de passe (scrypt) ---------- */
const FORME_HASH = /^scrypt\$(\d{4,7})\$(\d{1,2})\$(\d{1,2})\$([A-Za-z0-9+/]{22}==)\$([A-Za-z0-9+/]{86}==)$/;
function hacher(mdp) {
  const sel = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(mdp), sel, 64, { N: 16384, r: 8, p: 1 });
  return "scrypt$16384$8$1$" + sel.toString("base64") + "$" + h.toString("base64");
}
const hashValide = h => FORME_HASH.test(String(h || ""));
function verifier(mdp, stocke) {
  const m = FORME_HASH.exec(String(stocke || ""));
  if (!m) return false;
  const attendu = Buffer.from(m[5], "base64");
  const h = crypto.scryptSync(String(mdp), Buffer.from(m[4], "base64"), attendu.length, { N: +m[1], r: +m[2], p: +m[3], maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(h, attendu);
}
// Comparaison à temps constant de deux chaînes (longueurs comparées en octets).
function egal(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// Le mot de passe est lu sur l'entrée standard (jamais en argument : il resterait dans l'historique).
function lireMotDePasse() {
  return new Promise(ok => {
    const entree = process.stdin;
    if (entree.isTTY) {
      process.stderr.write("Mot de passe (rien ne s'affiche) : ");
      let mdp = "";
      entree.setRawMode(true); entree.resume(); entree.setEncoding("utf8");
      entree.on("data", c => {
        for (const ch of c) {
          if (ch === "\r" || ch === "\n") { entree.setRawMode(false); entree.pause(); process.stderr.write("\n"); return ok(mdp); }
          if (ch === "\u0003") process.exit(1);
          if (ch === "\u007f") mdp = mdp.slice(0, -1); else mdp += ch;
        }
      });
    } else {
      let tout = ""; entree.setEncoding("utf8");
      entree.on("data", c => { tout += c; });
      entree.on("end", () => ok(tout.replace(/\r?\n$/, "")));
    }
  });
}

/* ---------- Configuration ---------- */
function lireConfig() {
  const fichier = process.env.LS_CONFIG || path.join(__dirname, "config.json");
  let c = {};
  try { c = JSON.parse(fs.readFileSync(fichier, "utf8")); } catch (e) { /* pas de fichier : valeurs par défaut et variables d'environnement */ }
  const env = process.env;
  const val = (nomEnv, cle, defaut) => env[nomEnv] !== undefined ? env[nomEnv] : c[cle] !== undefined ? c[cle] : defaut;
  const chemin = s => { s = String(s || "").trim().replace(/\/+$/, ""); return s && !s.startsWith("/") ? "/" + s : s; };
  return {
    fichier,
    origines: [].concat(env.LS_ORIGINES !== undefined ? env.LS_ORIGINES.split(",") : c.origines || []).map(s => String(s).trim().replace(/\/$/, "")).filter(Boolean),
    dossierDonnees: path.resolve(val("LS_DONNEES", "dossierDonnees", path.join(__dirname, "donnees"))),
    adminHash: String(val("LS_ADMIN_HASH", "adminHash", "")),
    secretSession: String(val("LS_SECRET_SESSION", "secretSession", "")),
    base: chemin(val("LS_BASE", "base", "")),
    cheminAdmin: chemin(val("LS_CHEMIN_ADMIN", "cheminAdmin", "/admin")) || "/admin",
    conservationJours: +val("LS_CONSERVATION_JOURS", "conservationJours", 395),
    limiteLots10min: +val("LS_LIMITE_LOTS", "limiteLots10min", 120),
    limiteIp10min: +val("LS_LIMITE_IP", "limiteIp10min", 600),
    plafondOctetsJour: +val("LS_PLAFOND_OCTETS_JOUR", "plafondOctetsJour", 50e6),
    plafondLotsJour: +val("LS_PLAFOND_LOTS_JOUR", "plafondLotsJour", 200000),
    plafondDossierOctets: +val("LS_PLAFOND_DOSSIER", "plafondDossierOctets", 2e9),
    cookieSecure: String(val("LS_COOKIE_SECURE", "cookieSecure", true)) !== "false" && String(val("LS_COOKIE_SECURE", "cookieSecure", true)) !== "non"
  };
}
// Un dossier servi par Apache (public_html, www, htdocs) ne doit contenir ni les données ni la configuration.
const sousDossierPublic = p => path.resolve(p).split(path.sep).some(s => ["public_html", "www", "htdocs"].includes(s.toLowerCase()));

/* ---------- Validation (liste blanche) ---------- */
const EVENEMENTS = new Set(["page", "temps", "tp_debut", "tp_fin", "objectif", "question", "notion", "carte_finie"]);
const PAGES = new Set(["accueil", "carte", "tp", "autre"]);
const TYPES = new Set(["telephone", "tablette", "ordinateur"]);
const SYSTEMES = new Set(["android", "ios", "windows", "macos", "linux", "chromeos", "autre"]);
const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const MAX_RETARD = 60 * 86400; // un événement gardé hors ligne peut arriver jusqu'à 60 jours plus tard
// maintenant en secondes. L'horloge de l'appareil peut être fausse : son heure d'envoi (`envoi`) sert à
// recaler les heures des événements. Heures arrondies à la minute, réception à l'heure.
function valider(lot, maintenant) {
  if (!lot || typeof lot !== "object" || lot.v !== 1) return null;
  if (typeof lot.appareil !== "string" || !/^[0-9a-f]{32}$/.test(lot.appareil)) return null;
  if (typeof lot.lot !== "string" || !/^[0-9a-f]{32}$/.test(lot.lot)) return null;
  if (!Array.isArray(lot.evs) || lot.evs.length === 0 || lot.evs.length > 300) return null;
  let decalage = 0;
  if (entier(lot.envoi, 0, 1e11) && Math.abs(maintenant - lot.envoi) > 60) decalage = maintenant - lot.envoi;
  const cat = lot.cat && typeof lot.cat === "object" ? lot.cat : {};
  const propre = {
    lot: lot.lot, a: lot.appareil, r: Math.floor(maintenant / 3600) * 3600,
    type: TYPES.has(cat.type) ? cat.type : null, os: SYSTEMES.has(cat.os) ? cat.os : null,
    largeur: entier(cat.largeur, 0, 10000) ? Math.round(cat.largeur / 50) * 50 : null,
    niveau: entier(lot.niveau, 1, 4) ? lot.niveau : null, evs: []
  };
  for (const ev of lot.evs) {
    if (!ev || typeof ev !== "object" || !EVENEMENTS.has(ev.e) || !entier(ev.t, 0, 1e11)) continue;
    const t = ev.t + decalage;
    if (t < maintenant - MAX_RETARD || t > maintenant + 300) continue;
    const x = { t: Math.floor(t / 60) * 60, e: ev.e };
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

/* ---------- Démarrage ---------- */
if (process.argv[2] === "--hacher") {
  lireMotDePasse().then(m => {
    if (!m) { console.error("Mot de passe vide."); process.exit(1); }
    console.log(hacher(m));
  });
} else demarrer();

function demarrer() {
  const CONFIG = lireConfig();
  for (const [nom, p] of [["dossier de données", CONFIG.dossierDonnees], ["fichier de configuration", CONFIG.fichier]])
    if (sousDossierPublic(p)) { console.error("Refus de démarrer : le " + nom + " (" + p + ") est dans un dossier public. Voir docs/JOURNAL.md."); process.exit(1); }
  const DOSSIER = path.join(CONFIG.dossierDonnees, "evenements"), IDS = path.join(CONFIG.dossierDonnees, "lots");
  for (const d of [CONFIG.dossierDonnees, DOSSIER, IDS]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  let SECRET = CONFIG.secretSession;
  if (SECRET.length < 32) {
    SECRET = crypto.randomBytes(32).toString("hex");
    console.error("Attention : secretSession absent ou trop court ; secret provisoire (les sessions ne tiendront pas entre plusieurs processus ni après un redémarrage).");
  }
  const SEL_MEMOIRE = crypto.randomBytes(16); // empreintes d'adresses, en mémoire seulement
  const BASE_ADMIN = CONFIG.base + CONFIG.cheminAdmin;

  /* --- Fichiers --- */
  const jour = s => new Date(s * 1000).toISOString().slice(0, 10);
  const maintenantS = () => Math.floor(Date.now() / 1000);
  const fichiersJours = d => fs.readdirSync(d).filter(f => /^\d{4}-\d{2}-\d{2}\.(jsonl|txt)$/.test(f)).sort();
  const taille = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } };
  // Lecture en flux : chaque lot des fichiers reçus depuis `depuis` (secondes).
  async function parcourir(depuis, fn) {
    const premier = jour(depuis);
    for (const f of fichiersJours(DOSSIER)) {
      if (f.slice(0, 10) < premier) continue;
      const lignes = readline.createInterface({ input: fs.createReadStream(path.join(DOSSIER, f), { encoding: "utf8" }), crlfDelay: Infinity });
      for await (const ligne of lignes) {
        if (!ligne) continue;
        let lot; try { lot = JSON.parse(ligne); } catch (e) { continue; } // ligne tronquée : ignorée
        if (fn(lot) === false) { lignes.close(); return; }
      }
    }
  }
  // Réécrit un fichier en flux : `filtre(lot)` rend le lot (éventuellement modifié) ou null pour l'enlever.
  async function reecrire(fichier, filtre) {
    const tmp = fichier + ".tmp" + process.pid, sortie = fs.createWriteStream(tmp, { mode: 0o600 });
    let garde = 0, change = false;
    const lignes = readline.createInterface({ input: fs.createReadStream(fichier, { encoding: "utf8" }), crlfDelay: Infinity });
    for await (const ligne of lignes) {
      if (!ligne) continue;
      let lot; try { lot = JSON.parse(ligne); } catch (e) { change = true; continue; }
      const nouveau = filtre(lot);
      if (!nouveau) { change = true; continue; }
      if (nouveau !== lot) change = true;
      if (!sortie.write(JSON.stringify(nouveau) + "\n")) await new Promise(r => sortie.once("drain", r));
      garde++;
    }
    await new Promise(r => sortie.end(r));
    if (!change) { fs.unlinkSync(tmp); return; }
    if (garde) fs.renameSync(tmp, fichier); else { fs.unlinkSync(tmp); fs.unlinkSync(fichier); }
    version++;
  }

  /* --- Lots déjà reçus (dédoublonnage sur 60 jours, partagé entre processus par les fichiers lots/) --- */
  const lotsVus = new Map(); // identifiant -> jour
  const lus = new Map();     // fichier lots/ -> octets déjà lus
  function rafraichirIds() {
    const limite = jour(maintenantS() - MAX_RETARD - 86400);
    for (const f of fichiersJours(IDS)) {
      if (f.slice(0, 10) < limite) continue;
      const p = path.join(IDS, f), t = taille(p), deja = lus.get(f) || 0;
      if (t <= deja) continue;
      const fd = fs.openSync(p, "r"), tampon = Buffer.alloc(t - deja);
      fs.readSync(fd, tampon, 0, tampon.length, deja); fs.closeSync(fd);
      const texte = tampon.toString("utf8"), fin = texte.lastIndexOf("\n") + 1; // ligne incomplète : relue plus tard
      for (const id of texte.slice(0, fin).split("\n")) if (id) lotsVus.set(id, f.slice(0, 10));
      lus.set(f, deja + Buffer.byteLength(texte.slice(0, fin)));
    }
  }
  function elaguerIds() {
    const limite = jour(maintenantS() - MAX_RETARD - 86400);
    for (const [id, j] of lotsVus) if (j < limite) lotsVus.delete(id);
    for (const f of fichiersJours(IDS)) if (f.slice(0, 10) < limite) { fs.unlinkSync(path.join(IDS, f)); lus.delete(f); }
  }
  rafraichirIds();

  /* --- Plafonds --- */
  let version = 0, tailleDossierCache = { t: 0, octets: 0 };
  function tailleDossier() {
    if (Date.now() - tailleDossierCache.t > 600000) {
      let n = 0;
      for (const d of [DOSSIER, IDS]) for (const f of fs.readdirSync(d)) n += taille(path.join(d, f));
      tailleDossierCache = { t: Date.now(), octets: n };
    }
    return tailleDossierCache.octets;
  }
  // Rend la raison du refus, ou null. Les tailles lues sur le disque valent pour tous les processus.
  function plafondAtteint(octets, j) {
    if (taille(path.join(DOSSIER, j + ".jsonl")) + octets > CONFIG.plafondOctetsJour) return "octets du jour";
    if (taille(path.join(IDS, j + ".txt")) / 33 >= CONFIG.plafondLotsJour) return "lots du jour";
    if (tailleDossier() + octets > CONFIG.plafondDossierOctets) return "taille du dossier";
    return null;
  }
  function enregistrer(lot) {
    const ligne = JSON.stringify(lot) + "\n", j = jour(lot.r);
    const refus = plafondAtteint(Buffer.byteLength(ligne), j);
    if (refus) return refus;
    if (lot.evs.length) fs.appendFileSync(path.join(DOSSIER, j + ".jsonl"), ligne, { mode: 0o600 });
    fs.appendFileSync(path.join(IDS, j + ".txt"), lot.lot + "\n", { mode: 0o600 });
    lotsVus.set(lot.lot, j);
    tailleDossierCache.octets += Buffer.byteLength(ligne) + 33;
    version++;
    return null;
  }

  /* --- Purge : par date d'événement (exacte), au démarrage puis chaque jour --- */
  async function purger(jours) {
    const limite = maintenantS() - jours * 86400, jLimite = jour(limite), jFin = jour(limite + MAX_RETARD + 86400);
    for (const f of fichiersJours(DOSSIER)) {
      const j = f.slice(0, 10), p = path.join(DOSSIER, f);
      if (j < jLimite) { fs.unlinkSync(p); version++; }
      else if (j <= jFin) await reecrire(p, lot => {
        const evs = lot.evs.filter(ev => ev.t >= limite);
        return evs.length === lot.evs.length ? lot : evs.length ? Object.assign({}, lot, { evs }) : null;
      });
    }
    elaguerIds();
  }
  purger(CONFIG.conservationJours).catch(e => console.error("purge :", e.message));
  setInterval(() => purger(CONFIG.conservationJours).catch(e => console.error("purge :", e.message)), 24 * 3600 * 1000).unref();

  /* --- Adresse du client : en mémoire seulement --- */
  // Derrière le proxy d'O2switch (connexion locale), la DERNIÈRE entrée de X-Forwarded-For est celle
  // que le proxy a ajoutée ; les précédentes viennent du client et peuvent être inventées. Sans proxy
  // local, l'en-tête est ignoré.
  const local = a => /^(127\.|::1$|::ffff:127\.)/.test(a || "") || !a;
  function adresseClient(req) {
    const directe = req.socket.remoteAddress || "";
    if (!local(directe)) return directe;
    const xff = String(req.headers["x-forwarded-for"] || "").split(",").map(s => s.trim()).filter(Boolean);
    return xff.length ? xff[xff.length - 1] : directe;
  }
  const empreinte = req => crypto.createHmac("sha256", SEL_MEMOIRE).update(adresseClient(req)).digest("hex").slice(0, 24);
  const compteurs = new Map();
  function tropDeLots(cle, max) {
    const fenetre = Math.floor(Date.now() / 600000), k = fenetre + ":" + cle;
    const n = (compteurs.get(k) || 0) + 1;
    compteurs.set(k, n);
    if (compteurs.size > 50000) for (const kk of compteurs.keys()) if (!kk.startsWith(fenetre + ":")) compteurs.delete(kk);
    return n > max;
  }

  /* --- Agrégats du tableau de bord (lecture en flux, petit cache) --- */
  let cache = { cle: "", valeur: null, t: 0 };
  async function agregats(jours) {
    const cle = jours + ":" + version;
    if (cache.cle === cle && Date.now() - cache.t < 60000) return cache.valeur;
    const maintenant = maintenantS(), depuis = maintenant - jours * 86400;
    // Les appareils actifs sur 24 h, 7 et 30 jours ne dépendent pas de la période choisie.
    const actifs = [["aujourd'hui (24 h)", 86400, new Set()], ["7 jours", 7 * 86400, new Set()], ["30 jours", 30 * 86400, new Set()]];
    const pages = new Map(), tps = new Map(), objectifs = new Map(), appareils = new Map();
    const ligne = (m, k, init) => { if (!m.has(k)) m.set(k, init()); return m.get(k); };
    const nouveauTP = () => ({ debut: new Set(), fin: new Set(), ms: [] });
    await parcourir(Math.min(depuis, maintenant - 30 * 86400), l => {
      for (const ev of l.evs) {
        for (const [, duree, s] of actifs) if (maintenant - ev.t <= duree) s.add(l.a);
        if (ev.t < depuis) continue;
        appareils.set(l.a, { type: l.type, os: l.os, niveau: l.niveau });
        const nomPage = (ev.p || "") + (ev.c && ev.e !== "notion" ? " · " + ev.c : "");
        const nouvellePage = () => ({ vues: 0, appareils: new Set(), ms: 0 });
        if (ev.e === "page") { const x = ligne(pages, nomPage, nouvellePage); x.vues++; x.appareils.add(l.a); }
        if (ev.e === "temps") ligne(pages, nomPage, nouvellePage).ms += ev.ms;
        // TP et objectifs par variante (identifiant « id@niveau ») : numérateur et dénominateur de la même variante.
        if (ev.e === "tp_debut") ligne(tps, ev.c, nouveauTP).debut.add(l.a);
        if (ev.e === "tp_fin") { const x = ligne(tps, ev.c, nouveauTP); x.fin.add(l.a); if (ev.ms !== undefined) x.ms.push(ev.ms); }
        if (ev.e === "objectif") { const x = ligne(objectifs, ev.c + "|" + (ev.i || 0), () => ({ c: ev.c, i: ev.i || 0, appareils: new Set(), ms: [] })); x.appareils.add(l.a); if (ev.ms !== undefined) x.ms.push(ev.ms); }
      }
    });
    const moyenne = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
    const compte = cleF => { const m = new Map(); for (const [, a] of appareils) { const k = cleF(a); m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((x, y) => y[1] - x[1]); };
    const NIV = { 1: "Primaire", 2: "Collège", 3: "Lycée", 4: "Avancé" };
    const valeur = {
      actifs: actifs.map(([k, , s]) => [k, s.size]),
      pages: [...pages].map(([nom, x]) => [nom, x.vues, x.appareils.size, x.vues ? x.ms / x.vues : 0]).sort((a, b) => b[1] - a[1]).slice(0, 40),
      tps: [...tps].map(([nom, x]) => [nom, x.debut.size, x.fin.size, x.debut.size ? Math.min(100, Math.round(100 * x.fin.size / x.debut.size)) : null, moyenne(x.ms)]).sort((a, b) => b[1] - a[1]).slice(0, 60),
      objectifs: [...objectifs.values()].map(x => { const d = tps.has(x.c) ? tps.get(x.c).debut.size : 0; return [x.c, x.i + 1, d, x.appareils.size, d ? Math.min(100, Math.round(100 * x.appareils.size / d)) : null, moyenne(x.ms)]; })
        .sort((a, b) => (a[4] === null ? 999 : a[4]) - (b[4] === null ? 999 : b[4])).slice(0, 60),
      niveaux: compte(a => a.niveau ? NIV[a.niveau] : "non choisi"),
      appareils: compte(a => (a.type || "?") + " · " + (a.os || "?"))
    };
    cache = { cle, valeur, t: Date.now() };
    return valeur;
  }

  /* --- Session : cookie signé HMAC (tient avec plusieurs processus), expiration incluse --- */
  const DUREE_SESSION = 2 * 3600;
  const b64 = b => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signer = s => b64(crypto.createHmac("sha256", SECRET).update(s).digest());
  const revoquees = new Map(); // nonce -> expiration (déconnexions, dans ce processus)
  function creerSession() {
    const corps = b64(JSON.stringify({ exp: maintenantS() + DUREE_SESSION, n: crypto.randomBytes(12).toString("hex") }));
    return corps + "." + signer(corps);
  }
  const cookies = req => Object.fromEntries(String(req.headers.cookie || "").split(";").map(s => s.trim().split("=")).filter(x => x.length === 2));
  function session(req) {
    const v = cookies(req).ls_admin || "", k = v.indexOf(".");
    if (k < 1 || !egal(v.slice(k + 1), signer(v.slice(0, k)))) return null;
    let s; try { s = JSON.parse(Buffer.from(v.slice(0, k).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch (e) { return null; }
    if (!s || !(s.exp > maintenantS()) || typeof s.n !== "string" || revoquees.has(s.n)) return null;
    return { n: s.n, exp: s.exp, csrf: signer("csrf." + s.n) };
  }
  // Essais de connexion ratés : par empreinte d'adresse, en mémoire, délai croissant (pas de blocage global).
  const echecs = new Map();
  function delaiAvantEssai(fp) { const e = echecs.get(fp); return e ? Math.max(0, e.suivant - Date.now()) : 0; }
  function noterEchec(fp) {
    const e = echecs.get(fp) || { n: 0 };
    e.n++; e.t = Date.now();
    e.suivant = e.t + (e.n < 3 ? 0 : Math.min(1000 * 2 ** (e.n - 2), 15 * 60 * 1000));
    echecs.set(fp, e);
  }
  setInterval(() => {
    const h = Date.now() - 3600 * 1000, s = maintenantS();
    for (const [k, e] of echecs) if (e.t < h) echecs.delete(k);
    for (const [k, exp] of revoquees) if (exp < s) revoquees.delete(k);
  }, 600000).unref();

  /* --- Rendu --- */
  const echap = s => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const duree = ms => { const s = Math.round((ms || 0) / 1000); return s >= 60 ? Math.floor(s / 60) + " min " + String(s % 60).padStart(2, "0") + " s" : s + " s"; };
  function pageHtml(titre, corps) {
    return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>" + echap(titre) + "</title><style>" +
      "body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#eef1ec;color:#17221c}main{max-width:1100px;margin:0 auto;padding:16px}h1{font-size:1.6rem;margin:.2em 0}" +
      "h2{font-size:1.2rem;margin:1.6em 0 .4em;border-bottom:2px solid #17221c}table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #cdd6cb}th{background:#e2e8df}" +
      "td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.chiffres{display:flex;gap:28px;flex-wrap:wrap}.chiffres div{font-size:2rem;font-weight:700}.chiffres span{display:block;font-size:.85rem;font-weight:400;color:#55635a}" +
      "form.ligne{display:inline-flex;gap:8px;align-items:center;margin:4px 8px 4px 0;flex-wrap:wrap}button,input,select{font:inherit;padding:8px 12px;min-height:44px}button{cursor:pointer}.alerte{color:#c3352a;font-weight:700}.tableau{overflow-x:auto}" +
      "dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}dt{font-weight:700}" +
      "</style></head><body><main>" + corps + "</main></body></html>";
  }
  function tableau(entetes, numeriques, lignes) {
    if (!lignes.length) return "<p>Aucune donnée sur la période.</p>";
    return "<div class=\"tableau\"><table><thead><tr>" + entetes.map((e, k) => "<th" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(e) + "</th>").join("") + "</tr></thead><tbody>" +
      lignes.map(l => "<tr>" + l.map((v, k) => "<td" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(v) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }
  // Cellule CSV : guillemets doublés, et apostrophe devant = + - @ (formules des tableurs).
  const celluleCsv = v => { let s = v === undefined || v === null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

  /* --- HTTP --- */
  function lireCorps(req, max) {
    return new Promise((ok, ko) => {
      const morceaux = []; let n = 0;
      req.on("data", m => { n += m.length; if (n > max) { ko(new Error("trop gros")); req.destroy(); } else morceaux.push(m); });
      req.on("end", () => ok(Buffer.concat(morceaux).toString("utf8")));
      req.on("error", ko);
    });
  }
  function repondre(res, code, corps, entetes) {
    res.writeHead(code, Object.assign({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, entetes || {}));
    res.end(corps || "");
  }
  const ENTETES_ADMIN = Object.assign({ "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "DENY",
    // same-origin et non no-referrer : avec no-referrer, le navigateur envoie « Origin: null » sur les formulaires.
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" },
    CONFIG.cookieSecure ? { "Strict-Transport-Security": "max-age=31536000" } : {});

  async function traiter(req, res) {
    let chemin;
    try { chemin = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { return repondre(res, 400); }
    // Le préfixe <base> est accepté qu'il soit transmis ou retiré par le proxy.
    if (CONFIG.base && (chemin === CONFIG.base || chemin.startsWith(CONFIG.base + "/"))) chemin = chemin.slice(CONFIG.base.length) || "/";
    const parametres = new URL(req.url || "/", "http://x").searchParams;
    const origine = req.headers.origin ? String(req.headers.origin).replace(/\/$/, "") : "";
    const origineOk = !origine || CONFIG.origines.includes(origine) || origine === "http://" + req.headers.host || origine === "https://" + req.headers.host;

    /* Réception du journal */
    if (chemin === "/journal") {
      const cors = origine && origineOk ? { "Access-Control-Allow-Origin": origine, "Vary": "Origin" } : {};
      if (req.method === "OPTIONS") return repondre(res, origineOk ? 204 : 403, "", Object.assign(cors, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" }));
      if (req.method !== "POST") return repondre(res, 405, "", { Allow: "POST" });
      if (!origineOk) return repondre(res, 403);
      if (tropDeLots("ip:" + empreinte(req), CONFIG.limiteIp10min)) return repondre(res, 429, "", Object.assign(cors, { "Retry-After": "600" }));
      let corps;
      try { corps = await lireCorps(req, 128 * 1024); } catch (e) { return repondre(res, 413, "", cors); }
      let lot;
      try { lot = valider(JSON.parse(corps), maintenantS()); } catch (e) { lot = null; }
      if (!lot) return repondre(res, 400, "", cors);
      if (!lotsVus.has(lot.lot)) rafraichirIds(); // reçu par un autre processus ?
      if (lotsVus.has(lot.lot)) return repondre(res, 204, "", cors); // déjà reçu : on confirme sans recompter
      if (tropDeLots("a:" + lot.a, CONFIG.limiteLots10min)) return repondre(res, 429, "", Object.assign(cors, { "Retry-After": "600" }));
      const refus = enregistrer(lot);
      if (refus) { console.error("journal : plafond atteint (" + refus + "), lot refusé"); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "3600" })); }
      return repondre(res, 204, "", cors);
    }
    if (chemin === "/sante") return repondre(res, 200, "ok", { "Content-Type": "text/plain" });

    /* Tableau de bord */
    if (chemin !== CONFIG.cheminAdmin && !chemin.startsWith(CONFIG.cheminAdmin + "/")) return repondre(res, 404, "", { "Content-Type": "text/plain" });
    const route = chemin.slice(CONFIG.cheminAdmin.length) || "/";
    if (req.method === "POST" && origine && !origineOk) return repondre(res, 403);
    const s = session(req);
    let formulaire = null;
    if (req.method === "POST") { try { formulaire = new URLSearchParams(await lireCorps(req, 16 * 1024)); } catch (e) { return repondre(res, 413); } }
    const csrfOk = !!(s && formulaire && egal(formulaire.get("csrf") || "", s.csrf));
    const cookie = (v, age) => "ls_admin=" + v + "; Path=" + BASE_ADMIN + "; HttpOnly; SameSite=Strict; Max-Age=" + age + (CONFIG.cookieSecure ? "; Secure" : "");

    if (route === "/connexion" && req.method === "POST") {
      const fp = empreinte(req), attente = delaiAvantEssai(fp);
      let message;
      if (attente > 0) message = "Trop d'essais ratés : réessaie dans " + Math.ceil(attente / 1000) + " s.";
      else if (!hashValide(CONFIG.adminHash)) message = "Mot de passe non configuré : voir docs/JOURNAL.md.";
      else if (verifier(formulaire.get("mdp") || "", CONFIG.adminHash)) {
        echecs.delete(fp);
        return repondre(res, 303, "", { Location: BASE_ADMIN, "Set-Cookie": cookie(creerSession(), DUREE_SESSION) });
      } else { noterEchec(fp); message = "Mot de passe incorrect."; }
      return repondre(res, attente > 0 ? 429 : 401, pageConnexion(message), ENTETES_ADMIN);
    }
    if (!s) return repondre(res, route === "/" ? 200 : 401, pageConnexion(""), ENTETES_ADMIN);
    if (route === "/deconnexion" && req.method === "POST" && csrfOk) {
      revoquees.set(s.n, s.exp);
      return repondre(res, 303, "", { Location: BASE_ADMIN, "Set-Cookie": cookie("", 0) });
    }
    const jours = [1, 7, 30, 90, 395].includes(+parametres.get("jours")) ? +parametres.get("jours") : 30;
    const appareilDemande = /^[0-9a-f]{32}$/.test(parametres.get("appareil") || "") ? parametres.get("appareil") : null;

    if (route === "/export.csv") {
      // Diffusé en flux : rien n'est gardé en mémoire.
      const depuis = maintenantS() - jours * 86400;
      res.writeHead(200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"journal-" + (appareilDemande ? appareilDemande.slice(0, 8) + "-" : "") + new Date().toISOString().slice(0, 10) + ".csv\"" });
      res.write("﻿appareil;date;evenement;page;cible;numero;duree_ms;type;systeme;niveau\n");
      let tampon = [];
      await parcourir(appareilDemande ? 0 : depuis, l => {
        if (appareilDemande && l.a !== appareilDemande) return;
        for (const ev of l.evs) if (appareilDemande || ev.t >= depuis)
          tampon.push([l.a, new Date(ev.t * 1000).toISOString(), ev.e, ev.p, ev.c, ev.i, ev.ms, l.type, l.os, l.niveau].map(celluleCsv).join(";"));
        if (tampon.length >= 500) { res.write(tampon.join("\n") + "\n"); tampon = []; }
      });
      if (tampon.length) res.write(tampon.join("\n") + "\n");
      return res.end();
    }
    if (route === "/diagnostic") return repondre(res, 200, pageDiagnostic(), ENTETES_ADMIN);
    let message = "";
    if (route === "/purger" && req.method === "POST") {
      const quoi = formulaire.get("quoi");
      if (!csrfOk) message = "Session expirée : recharge la page.";
      else if (quoi === "tout" && formulaire.get("confirmer") === "EFFACER") {
        for (const d of [DOSSIER, IDS]) for (const f of fichiersJours(d)) fs.unlinkSync(path.join(d, f));
        lotsVus.clear(); lus.clear(); version++; tailleDossierCache.t = 0;
        message = "Tout le journal a été effacé.";
      } else if (quoi === "anciens") {
        await purger(CONFIG.conservationJours); tailleDossierCache.t = 0;
        message = "Les événements de plus de " + CONFIG.conservationJours + " jours ont été effacés.";
      } else if (quoi === "appareil") {
        const a = formulaire.get("appareil") || "";
        if (!/^[0-9a-f]{32}$/.test(a)) message = "Numéro d'appareil invalide (32 caractères de 0 à 9 et de a à f).";
        else {
          for (const f of fichiersJours(DOSSIER)) await reecrire(path.join(DOSSIER, f), lot => lot.a === a ? null : lot);
          tailleDossierCache.t = 0;
          message = "Les données de l'appareil " + a + " ont été effacées.";
        }
      } else message = "Pour tout effacer, tape EFFACER dans la case.";
    }
    return repondre(res, 200, await pageTableau(s, jours, message), ENTETES_ADMIN);

    function pageConnexion(msg) {
      return pageHtml("Connexion · journal", "<h1>Journal d'utilisation</h1><p>Accès réservé à l'administrateur.</p>" + (msg ? "<p class=\"alerte\">" + echap(msg) + "</p>" : "") +
        "<form method=\"post\" action=\"" + echap(BASE_ADMIN) + "/connexion\"><label>Mot de passe <input type=\"password\" name=\"mdp\" required autocomplete=\"current-password\" autofocus></label> <button>Entrer</button></form>");
    }
    // Diagnostic du proxy : dit si X-Forwarded-For arrive et sous quelle forme, sans rien enregistrer.
    function pageDiagnostic() {
      const directe = req.socket.remoteAddress || "", xff = String(req.headers["x-forwarded-for"] || "").split(",").map(x => x.trim()).filter(Boolean);
      const masquer = a => /^\d+\.\d+\.\d+\.\d+$/.test(a) ? a.split(".").slice(0, 2).join(".") + ".x.x" : a.includes(":") ? a.split(":").slice(0, 2).join(":") + ":…" : "(forme inconnue)";
      return pageHtml("Diagnostic · journal", "<h1>Diagnostic du proxy</h1><p>Rien de cette page n'est enregistré.</p><dl>" +
        "<dt>Connexion directe locale (proxy)</dt><dd>" + (local(directe) ? "oui" : "non : X-Forwarded-For est ignoré") + "</dd>" +
        "<dt>X-Forwarded-For présent</dt><dd>" + (xff.length ? "oui, " + xff.length + " entrée(s)" : "non") + "</dd>" +
        (xff.length ? "<dt>Dernière entrée (utilisée)</dt><dd>" + echap(masquer(xff[xff.length - 1])) + "</dd>" : "") +
        "<dt>X-Forwarded-Proto</dt><dd>" + echap(req.headers["x-forwarded-proto"] || "absent") + "</dd></dl>" +
        "<p>Compare la dernière entrée avec le début de ton adresse publique (affichée par exemple par ta box) : elles doivent correspondre. Sinon, la limite par adresse ne vise pas le bon client ; voir docs/JOURNAL.md.</p>" +
        "<p><a href=\"" + echap(BASE_ADMIN) + "\">Retour au tableau de bord</a></p>");
    }
    async function pageTableau(sess, j, msg) {
      const a = await agregats(j), b = echap(BASE_ADMIN), jeton = "<input type=\"hidden\" name=\"csrf\" value=\"" + echap(sess.csrf) + "\">";
      const periodes = [[1, "24 h"], [7, "7 jours"], [30, "30 jours"], [90, "90 jours"], [395, "13 mois"]].map(([n, nom]) => "<option value=\"" + n + "\"" + (n === j ? " selected" : "") + ">" + nom + "</option>").join("");
      return pageHtml("Journal d'utilisation", "<h1>Journal d'utilisation</h1>" + (msg ? "<p class=\"alerte\">" + echap(msg) + "</p>" : "") +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "\"><label>Période <select name=\"jours\">" + periodes + "</select></label><button>Afficher</button></form>" +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "/export.csv\"><input type=\"hidden\" name=\"jours\" value=\"" + j + "\"><button>Exporter en CSV</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/deconnexion\">" + jeton + "<button>Se déconnecter</button></form>" +
        "<div class=\"chiffres\">" + a.actifs.map(([k, n]) => "<div>" + n + "<span>appareils actifs, " + echap(k) + "</span></div>").join("") + "</div>" +
        "<h2>Pages les plus consultées</h2>" + tableau(["Page", "Vues", "Appareils", "Temps actif moyen par vue"], [0, 1, 1, 1], a.pages.map(p => [p[0], p[1], p[2], duree(p[3])])) +
        "<h2>TP : ouverts, terminés, durée (par variante de niveau)</h2>" + tableau(["TP", "Appareils qui l'ont ouvert", "Appareils qui l'ont terminé", "Réussite", "Durée moyenne jusqu'à la fin"], [0, 1, 1, 1, 1], a.tps.map(t => [t[0], t[1], t[2], t[3] === null ? "" : t[3] + " %", t[2] ? duree(t[4]) : ""])) +
        "<h2>Objectifs : où les élèves bloquent (taux le plus bas en premier)</h2>" + tableau(["TP", "Objectif", "Appareils ayant ouvert le TP", "Appareils l'ayant atteint", "Taux", "Temps moyen pour l'atteindre"], [0, 1, 1, 1, 1, 1], a.objectifs.map(o => [o[0], o[1], o[2], o[3], o[4] === null ? "" : o[4] + " %", duree(o[5])])) +
        "<h2>Niveaux choisis</h2>" + tableau(["Niveau", "Appareils"], [0, 1], a.niveaux) +
        "<h2>Types d'appareils</h2>" + tableau(["Type · système", "Appareils"], [0, 1], a.appareils) +
        "<h2>Un appareil (demande d'accès ou d'effacement)</h2>" +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "/export.csv\"><label>Numéro <input name=\"appareil\" pattern=\"[0-9a-f]{32}\" size=\"34\" required autocomplete=\"off\"></label><button>Exporter ses données</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"appareil\">" + jeton + "<label>Numéro <input name=\"appareil\" pattern=\"[0-9a-f]{32}\" size=\"34\" required autocomplete=\"off\"></label><button>Effacer ses données</button></form>" +
        "<h2>Purge</h2><form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"anciens\">" + jeton + "<button>Effacer les événements de plus de " + CONFIG.conservationJours + " jours</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"tout\">" + jeton + "<label>Tout effacer : tape EFFACER <input name=\"confirmer\" autocomplete=\"off\" size=\"9\"></label><button>Tout effacer</button></form>" +
        "<p><a href=\"" + b + "/diagnostic\">Diagnostic du proxy (X-Forwarded-For)</a></p>" +
        "<p>Données pseudonymes : un numéro tiré au hasard par appareil, sans nom ni adresse IP. Conservation : " + CONFIG.conservationJours + " jours (date de l'événement).</p>");
    }
  }

  const serveur = http.createServer((req, res) => {
    traiter(req, res).catch(err => { console.error("journal :", err && err.message); if (!res.headersSent) repondre(res, 500); else res.end(); });
  });
  serveur.listen(process.env.PORT || 3000, () => console.log("Journal Learn Space à l'écoute sur le port " + serveur.address().port));
}
