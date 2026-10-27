/* Serveur du journal d'utilisation ANONYME de Learn Space (Node.js 18, 20 ou 22, sans dépendance npm).
   - POST <base>/journal : reçoit des lots d'événements sans identifiant (assets/js/journal.js) et les
     ajoute aussitôt à des TOTAUX PAR JOUR (agregats/AAAA-MM-JJ.json). Aucune ligne brute n'est gardée,
     aucune heure d'événement (seulement le jour et la tranche horaire des visites), rien qui relie deux
     visites : le navigateur n'envoie aucun numéro d'appareil ni de visite.
   - lots/AAAA-MM-JJ.txt : identifiants aléatoires des lots déjà reçus (un lot renvoyé après une coupure
     n'est pas compté deux fois), sans lien avec rien d'autre, effacés au bout de 31 jours.
   - <base><cheminAdmin> : tableau de bord réservé à l'administrateur (mot de passe scrypt, cookie de
     session signé HMAC, jeton CSRF) : totaux, tendances par jour, export CSV des totaux, purge,
     diagnostic du proxy.
   L'adresse IP ne sert qu'en mémoire (limites de débit, essais de connexion) et n'est jamais écrite.
   Lancement : `node serveur/app.js` (port dans PORT ; sur O2switch, Passenger le fournit).
   Hacher un mot de passe : `node serveur/app.js --hacher` puis taper le mot de passe. Voir docs/JOURNAL.md. */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

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
  const secure = String(val("LS_COOKIE_SECURE", "cookieSecure", true));
  return {
    fichier,
    origines: [].concat(env.LS_ORIGINES !== undefined ? env.LS_ORIGINES.split(",") : c.origines || []).map(s => String(s).trim().replace(/\/$/, "")).filter(Boolean),
    dossierDonnees: path.resolve(val("LS_DONNEES", "dossierDonnees", path.join(__dirname, "donnees"))),
    adminHash: String(val("LS_ADMIN_HASH", "adminHash", "")),
    secretSession: String(val("LS_SECRET_SESSION", "secretSession", "")),
    base: chemin(val("LS_BASE", "base", "")),
    cheminAdmin: chemin(val("LS_CHEMIN_ADMIN", "cheminAdmin", "/admin")) || "/admin",
    conservationJours: +val("LS_CONSERVATION_JOURS", "conservationJours", 760),
    limiteLots10min: +val("LS_LIMITE_LOTS", "limiteLots10min", 600),
    plafondOctetsJour: +val("LS_PLAFOND_OCTETS_JOUR", "plafondOctetsJour", 50e6),
    plafondLotsJour: +val("LS_PLAFOND_LOTS_JOUR", "plafondLotsJour", 200000),
    plafondDossierOctets: +val("LS_PLAFOND_DOSSIER", "plafondDossierOctets", 2e9),
    cookieSecure: secure !== "false" && secure !== "non"
  };
}
// Un dossier servi par Apache (public_html, www, htdocs) ne doit contenir ni les données ni la configuration.
const sousDossierPublic = p => path.resolve(p).split(path.sep).some(s => ["public_html", "www", "htdocs"].includes(s.toLowerCase()));

/* ---------- Validation (liste blanche) ---------- */
const PAGES = new Set(["accueil", "carte", "tp", "autre"]);
const TYPES = new Set(["telephone", "tablette", "ordinateur"]);
const SYSTEMES = new Set(["android", "ios", "windows", "macos", "linux", "chromeos", "autre"]);
const LARGEURS = new Set(["<400", "400-599", "600-899", "900-1279", "1280+"]);
const RETOURS = new Set(["premiere", "moins7", "7a30", "plus30"]);
const PALIERS = new Set([1, 5, 15, 30, 60]);
const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const ID = /^[a-z0-9@-]{0,64}$/;
const MAX_RETARD = 30 * 86400; // un événement gardé hors ligne peut arriver jusqu'à 30 jours plus tard
// Rend [{ jour, h, ev }] : l'heure de l'appareil (qui peut être fausse) est recalée grâce à son heure
// d'envoi, puis réduite au jour et à l'heure ronde ; elle n'est jamais stockée telle quelle.
function valider(lot, maintenant) {
  if (!lot || typeof lot !== "object" || lot.v !== 2) return null;
  if (typeof lot.lot !== "string" || !/^[0-9a-f]{32}$/.test(lot.lot)) return null;
  if (!Array.isArray(lot.evs) || lot.evs.length === 0 || lot.evs.length > 300) return null;
  const decalage = entier(lot.envoi, 0, 1e11) && Math.abs(maintenant - lot.envoi) > 60 ? maintenant - lot.envoi : 0;
  const propres = [];
  for (const ev of lot.evs) {
    if (!ev || typeof ev !== "object" || !entier(ev.t, 0, 1e11)) continue;
    const t = ev.t + decalage;
    if (t < maintenant - MAX_RETARD || t > maintenant + 300) continue;
    const id = typeof ev.id === "string" && ID.test(ev.id) ? ev.id : null;
    const ms = entier(ev.ms, 0, 86400000) ? ev.ms : null;
    const i = entier(ev.i, 0, 99) ? ev.i : null;
    let x = null;
    switch (ev.e) {
      case "visite":
        if (RETOURS.has(ev.retour) && TYPES.has(ev.type) && SYSTEMES.has(ev.os) && LARGEURS.has(ev.largeur))
          x = { e: "visite", retour: ev.retour, niveau: entier(ev.niveau, 1, 4) ? ev.niveau : 0, type: ev.type, os: ev.os, largeur: ev.largeur };
        break;
      case "page": if (PAGES.has(ev.p) && id !== null) x = { e: "page", p: ev.p, id }; break;
      case "temps": if (PAGES.has(ev.p) && id !== null && ms !== null) x = { e: "temps", p: ev.p, id, ms }; break;
      case "palier": if (PALIERS.has(ev.m)) x = { e: "palier", m: ev.m }; break;
      case "tp_debut": if (id) x = { e: "tp_debut", id }; break;
      case "tp_fin": if (id) x = { e: "tp_fin", id, ms }; break;
      case "objectif": if (id && i !== null) x = { e: "objectif", id, i, ms }; break;
      case "essai": if (id && i !== null && (ev.o === "o" || ev.o === "q") && typeof ev.ok === "boolean") x = { e: "essai", id, o: ev.o, i, ok: ev.ok }; break;
      case "notion": if (typeof ev.noeud === "string" && /^[a-z0-9-]{1,40}\/[a-z0-9-]{1,120}$/.test(ev.noeud)) x = { e: "notion", noeud: ev.noeud }; break;
      case "carte_finie": if (id) x = { e: "carte_finie", id }; break;
    }
    if (x) { const d = new Date(t * 1000); propres.push({ jour: d.toISOString().slice(0, 10), h: d.getUTCHours(), ev: x }); }
  }
  return { lot: lot.lot, evs: propres };
}

/* ---------- Totaux d'un jour ---------- */
const MAX_CLES = 3000; // au-delà, les nouvelles clés d'une rubrique vont dans « (autres) »
const nouveauJour = () => ({ lots: 0, octets: 0, visites: { total: 0, retour: {}, niveau: {}, type: {}, os: {}, largeur: {}, typeOs: {} }, heures: {}, paliers: {},
  pages: {}, tps: {}, objectifs: {}, questions: {}, notions: {}, cartes: {} });
function rubrique(m, k, init) {
  if (!(k in m) && Object.keys(m).length >= MAX_CLES) k = "(autres)";
  if (!(k in m)) m[k] = init();
  return m[k];
}
const plus = (m, k, n) => { rubrique(m, String(k), () => 0); const kk = String(k) in m ? String(k) : "(autres)"; m[kk] += n === undefined ? 1 : n; };
function ajouterAuJour(j, { h, ev }) {
  const nomPage = p => ev.p + (ev.id ? "·" + ev.id : "");
  switch (ev.e) {
    case "visite": {
      const v = j.visites;
      v.total++; plus(v.retour, ev.retour); plus(v.niveau, ev.niveau); plus(v.type, ev.type); plus(v.os, ev.os); plus(v.largeur, ev.largeur); plus(v.typeOs, ev.type + "·" + ev.os);
      plus(j.heures, h);
      break;
    }
    case "page": rubrique(j.pages, nomPage(), () => ({ vues: 0, ms: 0 })).vues++; break;
    case "temps": rubrique(j.pages, nomPage(), () => ({ vues: 0, ms: 0 })).ms += ev.ms; break;
    case "palier": plus(j.paliers, ev.m); break;
    case "tp_debut": rubrique(j.tps, ev.id, () => ({ ouverts: 0, finis: 0, msFin: 0 })).ouverts++; break;
    case "tp_fin": { const x = rubrique(j.tps, ev.id, () => ({ ouverts: 0, finis: 0, msFin: 0 })); x.finis++; x.msFin += ev.ms || 0; break; }
    case "objectif": { const x = rubrique(j.objectifs, ev.id + "|" + ev.i, () => ({ reussis: 0, ms: 0, essais: 0, rates: 0 })); x.reussis++; x.ms += ev.ms || 0; break; }
    case "essai":
      if (ev.o === "o") { const x = rubrique(j.objectifs, ev.id + "|" + ev.i, () => ({ reussis: 0, ms: 0, essais: 0, rates: 0 })); x.essais++; if (!ev.ok) x.rates++; }
      else { const x = rubrique(j.questions, ev.id + "|" + ev.i, () => ({ justes: 0, fausses: 0 })); if (ev.ok) x.justes++; else x.fausses++; }
      break;
    case "notion": plus(j.notions, ev.noeud); break;
    case "carte_finie": plus(j.cartes, ev.id); break;
  }
}
// Additionne des totaux (pour une période) : nombres et objets de nombres, récursivement.
function additionner(a, b) {
  for (const k of Object.keys(b)) {
    if (typeof b[k] === "number") a[k] = (a[k] || 0) + b[k];
    else if (b[k] && typeof b[k] === "object") additionner(a[k] = a[k] || {}, b[k]);
  }
  return a;
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
  const AGG = path.join(CONFIG.dossierDonnees, "agregats"), IDS = path.join(CONFIG.dossierDonnees, "lots");
  for (const d of [CONFIG.dossierDonnees, AGG, IDS]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  // Données brutes d'une version précédente (lignes par lot avec numéro d'appareil) : effacées.
  fs.rmSync(path.join(CONFIG.dossierDonnees, "evenements"), { recursive: true, force: true });
  let SECRET = CONFIG.secretSession;
  if (SECRET.length < 32) {
    SECRET = crypto.randomBytes(32).toString("hex");
    console.error("Attention : secretSession absent ou trop court ; secret provisoire (les sessions ne tiendront pas entre plusieurs processus ni après un redémarrage).");
  }
  const SEL_MEMOIRE = crypto.randomBytes(16); // empreintes d'adresses, en mémoire seulement
  const BASE_ADMIN = CONFIG.base + CONFIG.cheminAdmin;
  const jour = s => new Date(s * 1000).toISOString().slice(0, 10);
  const maintenantS = () => Math.floor(Date.now() / 1000);
  const fichiers = (d, ext) => fs.readdirSync(d).filter(f => new RegExp("^\\d{4}-\\d{2}-\\d{2}\\." + ext + "$").test(f)).sort();
  const taille = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } };
  const lireJour = j => { try { return additionner(nouveauJour(), JSON.parse(fs.readFileSync(path.join(AGG, j + ".json"), "utf8"))); } catch (e) { return nouveauJour(); } };
  function ecrireJour(j, donnees) {
    const p = path.join(AGG, j + ".json"), tmp = p + ".tmp" + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(donnees), { mode: 0o600 });
    fs.renameSync(tmp, p);
  }
  // Verrou entre processus (création exclusive d'un fichier) autour de chaque lecture-modification-écriture.
  const attente = new Int32Array(new SharedArrayBuffer(4));
  function avecVerrou(fn) {
    const v = path.join(CONFIG.dossierDonnees, ".verrou"), debut = Date.now();
    for (;;) {
      let fd;
      try { fd = fs.openSync(v, "wx", 0o600); }
      catch (e) {
        if (e.code !== "EEXIST") throw e;
        try { if (Date.now() - fs.statSync(v).mtimeMs > 10000) fs.unlinkSync(v); } catch (x) { /* déjà libéré */ }
        if (Date.now() - debut > 5000) throw new Error("verrou indisponible");
        Atomics.wait(attente, 0, 0, 5);
        continue;
      }
      try { return fn(); } finally { fs.closeSync(fd); try { fs.unlinkSync(v); } catch (e) { /* déjà retiré */ } }
    }
  }

  /* --- Lots déjà reçus (31 jours, partagés entre processus par les fichiers lots/) --- */
  const lotsVus = new Map(); // identifiant -> jour
  const lus = new Map();     // fichier lots/ -> octets déjà lus
  const GARDE_IDS = MAX_RETARD + 86400;
  function rafraichirIds() {
    const limite = jour(maintenantS() - GARDE_IDS);
    for (const f of fichiers(IDS, "txt")) {
      if (f.slice(0, 10) < limite) continue;
      const p = path.join(IDS, f), t = taille(p), deja = lus.get(f) || 0;
      if (t <= deja) continue;
      const fd = fs.openSync(p, "r"), tampon = Buffer.alloc(t - deja);
      fs.readSync(fd, tampon, 0, tampon.length, deja); fs.closeSync(fd);
      const texte = tampon.toString("utf8"), fin = texte.lastIndexOf("\n") + 1;
      for (const id of texte.slice(0, fin).split("\n")) if (id) lotsVus.set(id, f.slice(0, 10));
      lus.set(f, deja + Buffer.byteLength(texte.slice(0, fin)));
    }
  }
  rafraichirIds();

  /* --- Plafonds --- */
  let version = 0, tailleDossierCache = { t: 0, octets: 0 };
  function tailleDossier() {
    if (Date.now() - tailleDossierCache.t > 600000) {
      let n = 0;
      for (const d of [AGG, IDS]) for (const f of fs.readdirSync(d)) n += taille(path.join(d, f));
      tailleDossierCache = { t: Date.now(), octets: n };
    }
    return tailleDossierCache.octets;
  }
  // Enregistre un lot validé : totaux des jours concernés + identifiant du lot, sous verrou.
  // Rend "deja", une raison de refus (plafond), ou null.
  function enregistrer(lot, octets) {
    return avecVerrou(() => {
      rafraichirIds();
      if (lotsVus.has(lot.lot)) return "deja";
      const auj = jour(maintenantS()), totaux = lireJour(auj);
      if (totaux.octets + octets > CONFIG.plafondOctetsJour) return "octets du jour";
      if (totaux.lots >= CONFIG.plafondLotsJour) return "lots du jour";
      if (tailleDossier() + octets > CONFIG.plafondDossierOctets) return "taille du dossier";
      const parJour = new Map([[auj, totaux]]);
      for (const x of lot.evs) { if (!parJour.has(x.jour)) parJour.set(x.jour, lireJour(x.jour)); ajouterAuJour(parJour.get(x.jour), x); }
      totaux.lots++; totaux.octets += octets;
      for (const [j, d] of parJour) ecrireJour(j, d);
      fs.appendFileSync(path.join(IDS, auj + ".txt"), lot.lot + "\n", { mode: 0o600 });
      lotsVus.set(lot.lot, auj);
      tailleDossierCache.octets += 33; // les totaux grossissent peu ; la taille réelle est relue toutes les 10 min
      version++;
      return null;
    });
  }

  /* --- Purge : totaux au-delà de la conservation, identifiants de lots au-delà de 31 jours --- */
  function purger() {
    const limite = jour(maintenantS() - CONFIG.conservationJours * 86400), limiteIds = jour(maintenantS() - GARDE_IDS);
    let n = 0;
    for (const f of fichiers(AGG, "json")) if (f.slice(0, 10) < limite) { fs.unlinkSync(path.join(AGG, f)); n++; }
    for (const f of fichiers(IDS, "txt")) if (f.slice(0, 10) < limiteIds) { fs.unlinkSync(path.join(IDS, f)); lus.delete(f); }
    for (const [id, j] of lotsVus) if (j < limiteIds) lotsVus.delete(id);
    version++; tailleDossierCache.t = 0;
    return n;
  }
  purger();
  setInterval(purger, 24 * 3600 * 1000).unref();

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

  /* --- Totaux d'une période (petit cache) --- */
  let cache = { cle: "", valeur: null, t: 0 };
  function periode(jours) {
    const cle = jours + ":" + version;
    if (cache.cle === cle && Date.now() - cache.t < 60000) return cache.valeur;
    const premier = jour(maintenantS() - (jours - 1) * 86400), parJour = [];
    const total = nouveauJour();
    for (const f of fichiers(AGG, "json")) {
      const j = f.slice(0, 10);
      if (j < premier) continue;
      const d = lireJour(j);
      additionner(total, d);
      parJour.push([j, d]);
    }
    cache = { cle, valeur: { total, parJour }, t: Date.now() };
    return cache.valeur;
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
  const duree = ms => { const s = Math.round((ms || 0) / 1000); return s >= 3600 ? Math.floor(s / 3600) + " h " + String(Math.floor(s % 3600 / 60)).padStart(2, "0") + " min" : s >= 60 ? Math.floor(s / 60) + " min " + String(s % 60).padStart(2, "0") + " s" : s + " s"; };
  const pc = (a, b) => b ? Math.min(100, Math.round(100 * a / b)) + " %" : "";
  function pageHtml(titre, corps) {
    return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>" + echap(titre) + "</title><style>" +
      "body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#eef1ec;color:#17221c}main{max-width:1100px;margin:0 auto;padding:16px}h1{font-size:1.6rem;margin:.2em 0}" +
      "h2{font-size:1.2rem;margin:1.6em 0 .4em;border-bottom:2px solid #17221c}h3{font-size:1rem;margin:1em 0 .3em}table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #cdd6cb}th{background:#e2e8df}" +
      "td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.chiffres{display:flex;gap:28px;flex-wrap:wrap}.chiffres div{font-size:2rem;font-weight:700}.chiffres span{display:block;font-size:.85rem;font-weight:400;color:#55635a}" +
      "form.ligne{display:inline-flex;gap:8px;align-items:center;margin:4px 8px 4px 0;flex-wrap:wrap}button,input,select{font:inherit;padding:8px 12px;min-height:44px}button{cursor:pointer}.alerte{color:#c3352a;font-weight:700}.tableau{overflow-x:auto}" +
      ".colonnes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 24px}.barre{display:inline-block;height:10px;background:#1e5b44;vertical-align:middle;margin-right:6px}" +
      "dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}dt{font-weight:700}" +
      "</style></head><body><main>" + corps + "</main></body></html>";
  }
  function tableau(entetes, numeriques, lignes, vide) {
    if (!lignes.length) return "<p>" + (vide || "Aucune donnée sur la période.") + "</p>";
    return "<div class=\"tableau\"><table><thead><tr>" + entetes.map((e, k) => "<th" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(e) + "</th>").join("") + "</tr></thead><tbody>" +
      lignes.map(l => "<tr>" + l.map((v, k) => "<td" + (numeriques[k] ? " class=\"n\"" : "") + ">" + (typeof v === "object" && v && v.html ? v.html : echap(v)) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }
  // Répartition : libellé, nombre, part, petite barre.
  function repartition(titre, m, noms) {
    const lignes = Object.entries(m || {}).sort((a, b) => b[1] - a[1]), tot = lignes.reduce((s, x) => s + x[1], 0);
    return "<div><h3>" + echap(titre) + "</h3>" + tableau(["", "Visites", "Part"], [0, 1, 1],
      lignes.map(([k, n]) => [(noms && noms[k]) || k, n, { html: "<span class=\"barre\" style=\"width:" + Math.round(60 * n / (tot || 1)) + "px\"></span>" + echap(pc(n, tot)) }])) + "</div>";
  }
  // Cellule CSV : guillemets doublés, et apostrophe devant = + - @ (formules des tableurs).
  const celluleCsv = v => { let s = v === undefined || v === null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  // Totaux d'un jour aplatis en lignes (rubrique, clé, mesure, valeur).
  function aplatir(d) {
    const l = [["jour", "", "lots", d.lots], ["visites", "", "total", d.visites.total]];
    for (const r of ["retour", "niveau", "type", "os", "largeur", "typeOs"]) for (const [k, n] of Object.entries(d.visites[r])) l.push(["visites_" + r, k, "visites", n]);
    for (const r of ["heures", "paliers", "notions", "cartes"]) for (const [k, n] of Object.entries(d[r])) l.push([r, k, "nombre", n]);
    for (const r of ["pages", "tps", "objectifs", "questions"]) for (const [k, x] of Object.entries(d[r])) for (const [m, n] of Object.entries(x)) l.push([r, k, m, n]);
    return l;
  }

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
      // Sans identifiant d'appareil, la limite de débit se fait par adresse (en mémoire seulement).
      if (tropDeLots("ip:" + empreinte(req), CONFIG.limiteLots10min)) return repondre(res, 429, "", Object.assign(cors, { "Retry-After": "600" }));
      let corps;
      try { corps = await lireCorps(req, 128 * 1024); } catch (e) { return repondre(res, 413, "", cors); }
      let lot;
      try { lot = valider(JSON.parse(corps), maintenantS()); } catch (e) { lot = null; }
      if (!lot) return repondre(res, 400, "", cors);
      let refus;
      try { refus = enregistrer(lot, Buffer.byteLength(corps)); } catch (e) { console.error("journal :", e.message); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "60" })); }
      if (refus && refus !== "deja") { console.error("journal : plafond atteint (" + refus + "), lot refusé"); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "3600" })); }
      return repondre(res, 204, "", cors); // reçu (ou déjà reçu : confirmé sans recompter)
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
      const fp = empreinte(req), reste = delaiAvantEssai(fp);
      let message;
      if (reste > 0) message = "Trop d'essais ratés : réessaie dans " + Math.ceil(reste / 1000) + " s.";
      else if (!hashValide(CONFIG.adminHash)) message = "Mot de passe non configuré : voir docs/JOURNAL.md.";
      else if (verifier(formulaire.get("mdp") || "", CONFIG.adminHash)) {
        echecs.delete(fp);
        return repondre(res, 303, "", { Location: BASE_ADMIN, "Set-Cookie": cookie(creerSession(), DUREE_SESSION) });
      } else { noterEchec(fp); message = "Mot de passe incorrect."; }
      return repondre(res, reste > 0 ? 429 : 401, pageConnexion(message), ENTETES_ADMIN);
    }
    if (!s) return repondre(res, route === "/" ? 200 : 401, pageConnexion(""), ENTETES_ADMIN);
    if (route === "/deconnexion" && req.method === "POST" && csrfOk) {
      revoquees.set(s.n, s.exp);
      return repondre(res, 303, "", { Location: BASE_ADMIN, "Set-Cookie": cookie("", 0) });
    }
    const jours = [1, 7, 30, 90, 365, 760].includes(+parametres.get("jours")) ? +parametres.get("jours") : 30;

    if (route === "/export.csv") {
      const { parJour } = periode(jours), lignes = ["﻿jour;rubrique;cle;mesure;valeur"];
      for (const [j, d] of parJour) for (const l of aplatir(d)) lignes.push([j].concat(l).map(celluleCsv).join(";"));
      return repondre(res, 200, lignes.join("\n") + "\n", { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"journal-totaux-" + new Date().toISOString().slice(0, 10) + ".csv\"" });
    }
    if (route === "/diagnostic") return repondre(res, 200, pageDiagnostic(), ENTETES_ADMIN);
    let message = "";
    if (route === "/purger" && req.method === "POST") {
      const quoi = formulaire.get("quoi");
      if (!csrfOk) message = "Session expirée : recharge la page.";
      else if (quoi === "tout" && formulaire.get("confirmer") === "EFFACER") {
        avecVerrou(() => { for (const f of fichiers(AGG, "json")) fs.unlinkSync(path.join(AGG, f)); });
        version++; tailleDossierCache.t = 0;
        message = "Tous les totaux ont été effacés.";
      } else if (quoi === "anciens") message = avecVerrou(purger) + " jour(s) de plus de " + CONFIG.conservationJours + " jours effacé(s).";
      else message = "Pour tout effacer, tape EFFACER dans la case.";
    }
    return repondre(res, 200, pageTableau(s, jours, message), ENTETES_ADMIN);

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
        "<p>Compare la dernière entrée avec le début de ton adresse publique : elles doivent correspondre. Sinon, la limite par adresse ne vise pas le bon client ; voir docs/JOURNAL.md.</p>" +
        "<p><a href=\"" + echap(BASE_ADMIN) + "\">Retour au tableau de bord</a></p>");
    }
    function pageTableau(sess, j, msg) {
      const { total: t, parJour } = periode(j), b = echap(BASE_ADMIN), jeton = "<input type=\"hidden\" name=\"csrf\" value=\"" + echap(sess.csrf) + "\">";
      const periodes = [[1, "aujourd'hui"], [7, "7 jours"], [30, "30 jours"], [90, "90 jours"], [365, "12 mois"], [760, "25 mois"]].map(([n, nom]) => "<option value=\"" + n + "\"" + (n === j ? " selected" : "") + ">" + nom + "</option>").join("");
      const vues = Object.values(t.pages).reduce((s, x) => s + x.vues, 0), tempsTotal = Object.values(t.pages).reduce((s, x) => s + x.ms, 0);
      const tpsOuverts = Object.values(t.tps).reduce((s, x) => s + x.ouverts, 0), rates = Object.values(t.objectifs).reduce((s, x) => s + x.rates, 0);
      const ouvertsDe = id => (t.tps[id] || {}).ouverts || 0;
      const objectifs = Object.entries(t.objectifs).map(([k, x]) => { const [id, i] = k.split("|"); return { id, i: +i + 1, x }; });
      // Durée de visite en tranches : visites ayant atteint chaque palier, différences entre paliers.
      const pal = m => t.paliers[m] || 0, V = t.visites.total;
      const tranches = [["moins de 1 min", V - pal(1)], ["1 à 5 min", pal(1) - pal(5)], ["5 à 15 min", pal(5) - pal(15)], ["15 à 30 min", pal(15) - pal(30)], ["30 à 60 min", pal(30) - pal(60)], ["plus de 60 min", pal(60)]];
      const NIV = { 0: "non choisi", 1: "Primaire", 2: "Collège", 3: "Lycée", 4: "Avancé" };
      const RET = { premiere: "première visite", moins7: "revenu en moins de 7 jours", "7a30": "revenu entre 7 et 30 jours", plus30: "revenu après plus de 30 jours" };
      const heures = Array.from({ length: 24 }, (_, h) => [h + " h-" + (h + 1) + " h", t.heures[h] || 0]).filter(x => x[1]);
      return pageHtml("Journal d'utilisation", "<h1>Journal d'utilisation</h1><p>Totaux anonymes par jour : aucune donnée ne permet de suivre un élève ou un appareil.</p>" + (msg ? "<p class=\"alerte\">" + echap(msg) + "</p>" : "") +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "\"><label>Période <select name=\"jours\">" + periodes + "</select></label><button>Afficher</button></form>" +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "/export.csv\"><input type=\"hidden\" name=\"jours\" value=\"" + j + "\"><button>Exporter les totaux (CSV)</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/deconnexion\">" + jeton + "<button>Se déconnecter</button></form>" +
        "<div class=\"chiffres\"><div>" + V + "<span>visites</span></div><div>" + vues + "<span>pages vues</span></div><div>" + echap(duree(tempsTotal)) + "<span>temps actif total</span></div>" +
        "<div>" + tpsOuverts + "<span>TP ouverts</span></div><div>" + rates + "<span>essais ratés aux objectifs</span></div></div>" +
        "<h2>Par jour</h2>" + tableau(["Jour", "Visites", "Pages vues", "Temps actif", "TP ouverts", "TP terminés", "Objectifs réussis", "Essais ratés"], [0, 1, 1, 1, 1, 1, 1, 1],
          parJour.slice().reverse().map(([jj, d]) => [jj, d.visites.total, Object.values(d.pages).reduce((s, x) => s + x.vues, 0), duree(Object.values(d.pages).reduce((s, x) => s + x.ms, 0)),
            Object.values(d.tps).reduce((s, x) => s + x.ouverts, 0), Object.values(d.tps).reduce((s, x) => s + x.finis, 0), Object.values(d.objectifs).reduce((s, x) => s + x.reussis, 0), Object.values(d.objectifs).reduce((s, x) => s + x.rates, 0)])) +
        "<h2>Visites</h2><div class=\"colonnes\">" + repartition("Retour", t.visites.retour, RET) + repartition("Niveau choisi", t.visites.niveau, NIV) + repartition("Type d'appareil", t.visites.type) +
        repartition("Système", t.visites.os) + repartition("Largeur d'écran (px)", t.visites.largeur) +
        "<div><h3>Durée active de la visite</h3>" + tableau(["", "Visites"], [0, 1], V ? tranches : []) + "</div>" +
        "<div><h3>Heure (UTC, heure de Bamako)</h3>" + tableau(["", "Visites"], [0, 1], heures) + "</div></div>" +
        "<h2>Pages les plus consultées</h2>" + tableau(["Page", "Vues", "Temps actif total", "Temps moyen par vue"], [0, 1, 1, 1],
          Object.entries(t.pages).sort((a, c) => c[1].vues - a[1].vues).slice(0, 40).map(([k, x]) => [k, x.vues, duree(x.ms), duree(x.vues ? x.ms / x.vues : 0)])) +
        "<h2>TP : ouverts, terminés (par variante de niveau)</h2>" + tableau(["TP", "Ouvertures", "Terminés", "Part terminée", "Durée moyenne jusqu'à la fin", "Temps actif sur la page"], [0, 1, 1, 1, 1, 1],
          Object.entries(t.tps).sort((a, c) => c[1].ouverts - a[1].ouverts).slice(0, 60).map(([k, x]) => { const p = t.pages["tp·" + k.split("@")[0]]; return [k, x.ouverts, x.finis, pc(x.finis, x.ouverts), x.finis ? duree(x.msFin / x.finis) : "", p ? duree(p.ms) : ""]; })) +
        "<h2>Où les élèves se trompent : objectifs triés par essais ratés</h2>" + tableau(["TP", "Objectif", "Essais", "Essais ratés", "Part ratée", "Réussites"], [0, 1, 1, 1, 1, 1],
          objectifs.filter(o => o.x.essais).sort((a, c) => c.x.rates - a.x.rates).slice(0, 40).map(o => [o.id, o.i, o.x.essais, o.x.rates, pc(o.x.rates, o.x.essais), o.x.reussis]), "Aucun essai sur la période.") +
        "<h2>Objectifs : où les élèves bloquent (réussites rapportées aux ouvertures, le plus bas en premier)</h2>" + tableau(["TP", "Objectif", "Ouvertures du TP", "Réussites", "Taux", "Temps moyen pour réussir"], [0, 1, 1, 1, 1, 1],
          objectifs.filter(o => o.x.reussis || ouvertsDe(o.id)).map(o => ({ o, taux: ouvertsDe(o.id) ? o.x.reussis / ouvertsDe(o.id) : 2 })).sort((a, c) => a.taux - c.taux).slice(0, 40)
            .map(({ o }) => [o.id, o.i, ouvertsDe(o.id), o.x.reussis, pc(o.x.reussis, ouvertsDe(o.id)), o.x.reussis ? duree(o.x.ms / o.x.reussis) : ""])) +
        "<h2>Questions de quiz : réponses fausses</h2>" + tableau(["TP", "Question", "Réponses justes", "Réponses fausses", "Part fausse"], [0, 1, 1, 1, 1],
          Object.entries(t.questions).map(([k, x]) => [k.split("|")[0], +k.split("|")[1] + 1, x.justes, x.fausses, pc(x.fausses, x.justes + x.fausses)]).sort((a, c) => c[3] - a[3]).slice(0, 40)) +
        "<div class=\"colonnes\"><div><h2>Notions comprises</h2>" + tableau(["Carte / notion", "Fois"], [0, 1], Object.entries(t.notions).sort((a, c) => c[1] - a[1]).slice(0, 30)) + "</div>" +
        "<div><h2>Cartes terminées</h2>" + tableau(["Carte", "Fois"], [0, 1], Object.entries(t.cartes).sort((a, c) => c[1] - a[1]).slice(0, 30)) + "</div></div>" +
        "<h2>Purge</h2><form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"anciens\">" + jeton + "<button>Effacer les jours de plus de " + CONFIG.conservationJours + " jours</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"tout\">" + jeton + "<label>Tout effacer : tape EFFACER <input name=\"confirmer\" autocomplete=\"off\" size=\"9\"></label><button>Tout effacer</button></form>" +
        "<p><a href=\"" + b + "/diagnostic\">Diagnostic du proxy (X-Forwarded-For)</a></p>" +
        "<p>Seulement des totaux par jour, gardés " + CONFIG.conservationJours + " jours. Aucun identifiant d'appareil ni de visite, aucune adresse IP, aucune heure précise.</p>");
    }
  }

  const serveur = http.createServer((req, res) => {
    traiter(req, res).catch(err => { console.error("journal :", err && err.message); if (!res.headersSent) repondre(res, 500); else res.end(); });
  });
  serveur.listen(process.env.PORT || 3000, () => console.log("Journal Learn Space à l'écoute sur le port " + serveur.address().port));
}
