/* Serveur du journal d'utilisation de Learn Space : statistiques agrégées et minimisées
   (Node.js 18, 20 ou 22, sans dépendance npm).
   - POST <base>/journal : reçoit des lots d'événements sans identifiant (assets/js/journal.js) et les
     ajoute aussitôt aux TOTAUX DU JOUR DE RÉCEPTION (agregats/AAAA-MM-JJ.json). Aucune ligne brute,
     aucune heure d'événement ; seules les visites sont aussi comptées par heure, dans un total du mois
     (agregats/mois-AAAA-MM.json). Les identifiants acceptés viennent de liste-blanche.json, généré
     depuis le contenu du site (node outils/liste-precache.js).
   - lots/AAAA-MM-JJ.txt : identifiants aléatoires des lots déjà reçus (un lot renvoyé après une coupure
     n'est pas compté deux fois), sans lien avec rien d'autre, effacés au bout de 31 jours.
   - <base><cheminAdmin> : tableau de bord de l'administrateur (mot de passe scrypt, cookie de session
     signé HMAC, jeton CSRF). Il ne montre que des JOURS CLOS (jamais le jour en cours) et masque toute
     case inférieure au seuil k (5 par défaut), pour qu'aucun total ne décrive une seule visite.
   À la réception, le serveur voit l'adresse IP comme tout site ; il ne l'écrit jamais et ne s'en sert
   qu'en mémoire (limites de débit, essais de connexion).
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
// Le secret de session : au moins 64 caractères hexadécimaux (32 octets tirés au hasard).
const secretValide = s => /^[0-9a-f]{64,}$/i.test(String(s || ""));
// Vérification asynchrone : un essai de mot de passe ne bloque pas les autres requêtes.
function verifier(mdp, stocke) {
  const m = FORME_HASH.exec(String(stocke || ""));
  if (!m) return Promise.resolve(false);
  const attendu = Buffer.from(m[5], "base64");
  return new Promise(ok => crypto.scrypt(String(mdp), Buffer.from(m[4], "base64"), attendu.length, { N: +m[1], r: +m[2], p: +m[3], maxmem: 64 * 1024 * 1024 },
    (e, h) => ok(!e && crypto.timingSafeEqual(h, attendu))));
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
    listeBlanche: path.resolve(val("LS_LISTE_BLANCHE", "listeBlanche", path.join(__dirname, "liste-blanche.json"))),
    adminHash: String(val("LS_ADMIN_HASH", "adminHash", "")),
    secretSession: String(val("LS_SECRET_SESSION", "secretSession", "")),
    base: chemin(val("LS_BASE", "base", "")),
    cheminAdmin: chemin(val("LS_CHEMIN_ADMIN", "cheminAdmin", "/admin")) || "/admin",
    seuilK: Math.max(1, +val("LS_SEUIL_K", "seuilK", 5)),
    conservationJours: +val("LS_CONSERVATION_JOURS", "conservationJours", 760),
    limiteLots10min: +val("LS_LIMITE_LOTS", "limiteLots10min", 600),
    plafondIpJour: +val("LS_PLAFOND_IP_JOUR", "plafondIpJour", 3000),
    plafondOctetsJour: +val("LS_PLAFOND_OCTETS_JOUR", "plafondOctetsJour", 50e6),
    plafondLotsJour: +val("LS_PLAFOND_LOTS_JOUR", "plafondLotsJour", 200000),
    plafondDossierOctets: +val("LS_PLAFOND_DOSSIER", "plafondDossierOctets", 2e9),
    cookieSecure: secure !== "false" && secure !== "non"
  };
}
// Un dossier servi par Apache (public_html, www, htdocs) ne doit contenir ni les données ni la configuration.
const sousDossierPublic = p => path.resolve(p).split(path.sep).some(s => ["public_html", "www", "htdocs"].includes(s.toLowerCase()));

/* ---------- Liste blanche (générée depuis contenu/) ---------- */
function chargerListeBlanche(fichier) {
  const brut = JSON.parse(fs.readFileSync(fichier, "utf8"));
  const W = { tps: new Map(), cartes: new Set(), noeuds: new Set(), autres: new Set(brut.autres || []) };
  for (const [id, t] of Object.entries(brut.tps || {})) W.tps.set(id, { o: t.o | 0, q: t.q | 0, variantes: !!t.variantes });
  for (const [id, l] of Object.entries(brut.cartes || {})) { W.cartes.add(id); for (const s of l) W.noeuds.add(id + "/" + s); }
  return W;
}
// TP connu, éventuellement sous sa variante de niveau « id@n » (seulement si le TP a des variantes).
function tpConnu(W, id) {
  const m = /^([a-z0-9-]{1,64})(?:@([1-4]))?$/.exec(typeof id === "string" ? id : "");
  if (!m || !W.tps.has(m[1])) return null;
  const t = W.tps.get(m[1]);
  return m[2] && !t.variantes ? null : t;
}
function pageConnue(W, p, id) {
  if (typeof id !== "string") return false;
  if (p === "accueil") return id === "";
  if (p === "tp") return W.tps.has(id);
  if (p === "carte") return W.cartes.has(id);
  if (p === "autre") return W.autres.has(id);
  return false;
}

/* ---------- Validation ---------- */
const TYPES = new Set(["telephone", "tablette", "ordinateur"]);
const SYSTEMES = new Set(["android", "ios", "windows", "macos", "linux", "chromeos", "autre"]);
const LARGEURS = new Set(["<400", "400-599", "600-899", "900-1279", "1280+"]);
const RETOURS = new Set(["meme_jour", "moins7", "7a30", "plus30", "premiere"]);
const PALIERS = new Set([1, 5, 15, 30, 60]);
const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const MAX_RETARD = 30 * 86400; // un événement gardé hors ligne peut arriver jusqu'à 30 jours plus tard
// Rend { lot, evs, heures } : les événements valides (sans heure) et l'heure UTC de chaque visite.
// L'heure de l'appareil (qui peut être fausse) est recalée grâce à son heure d'envoi.
function valider(lot, maintenant, W) {
  if (!lot || typeof lot !== "object" || lot.v !== 2) return null;
  if (typeof lot.lot !== "string" || !/^[0-9a-f]{32}$/.test(lot.lot)) return null;
  if (!Array.isArray(lot.evs) || lot.evs.length === 0 || lot.evs.length > 300) return null;
  const decalage = entier(lot.envoi, 0, 1e11) && Math.abs(maintenant - lot.envoi) > 60 ? maintenant - lot.envoi : 0;
  const evs = [], heures = [];
  for (const ev of lot.evs) {
    if (!ev || typeof ev !== "object" || !entier(ev.t, 0, 1e11)) continue;
    const t = ev.t + decalage;
    if (t < maintenant - MAX_RETARD || t > maintenant + 300) continue;
    const ms = entier(ev.ms, 0, 86400000) ? ev.ms : null;
    const i = entier(ev.i, 0, 99) ? ev.i : null;
    const tp = tpConnu(W, ev.id);
    let x = null;
    switch (ev.e) {
      case "visite":
        if (RETOURS.has(ev.retour) && TYPES.has(ev.type) && SYSTEMES.has(ev.os) && LARGEURS.has(ev.largeur)) {
          x = { e: "visite", retour: ev.retour, niveau: entier(ev.niveau, 1, 4) ? ev.niveau : 0, type: ev.type, os: ev.os, largeur: ev.largeur };
          heures.push(new Date(t * 1000).getUTCHours());
        }
        break;
      case "page": if (pageConnue(W, ev.p, ev.id)) x = { e: "page", p: ev.p, id: ev.id }; break;
      case "temps": if (pageConnue(W, ev.p, ev.id) && ms !== null) x = { e: "temps", p: ev.p, id: ev.id, ms }; break;
      case "palier": if (PALIERS.has(ev.m)) x = { e: "palier", m: ev.m }; break;
      case "tp_debut": if (tp) x = { e: "tp_debut", id: ev.id }; break;
      case "tp_fin": if (tp) x = { e: "tp_fin", id: ev.id, ms }; break;
      case "objectif": if (tp && i !== null && i < tp.o) x = { e: "objectif", id: ev.id, i, ms }; break;
      case "essai":
        if (tp && i !== null && typeof ev.ok === "boolean" && ((ev.o === "o" && i < tp.o) || (ev.o === "q" && i < tp.q))) x = { e: "essai", id: ev.id, o: ev.o, i, ok: ev.ok };
        break;
      case "notion": if (typeof ev.noeud === "string" && W.noeuds.has(ev.noeud)) x = { e: "notion", noeud: ev.noeud }; break;
      case "carte_finie": if (W.cartes.has(ev.id)) x = { e: "carte_finie", id: ev.id }; break;
    }
    if (x) evs.push(x);
  }
  return { lot: lot.lot, evs, heures };
}

/* ---------- Totaux d'un jour ---------- */
// Objets sans prototype et Object.hasOwn partout : une clé comme « constructor » reste une clé ordinaire.
const vide = () => Object.create(null);
const possede = Object.hasOwn || ((o, k) => Object.prototype.hasOwnProperty.call(o, k));
const MAX_CLES = 3000; // filet de sécurité : au-delà, les nouvelles clés d'une rubrique vont dans « (autres) »
const nouveauJour = () => Object.assign(vide(), { lots: 0, octets: 0,
  visites: Object.assign(vide(), { total: 0, retour: vide(), niveau: vide(), type: vide(), os: vide(), largeur: vide() }),
  paliers: vide(), pages: vide(), tps: vide(), objectifs: vide(), questions: vide(), notions: vide(), cartes: vide() });
function cleRubrique(m, k) { return possede(m, k) || Object.keys(m).length < MAX_CLES ? k : "(autres)"; }
function ligne(m, k, init) { k = cleRubrique(m, String(k)); if (!possede(m, k)) m[k] = init(); return m[k]; }
function plus(m, k, n) { k = cleRubrique(m, String(k)); m[k] = (possede(m, k) ? m[k] : 0) + (n === undefined ? 1 : n); }
const nouvellePage = () => Object.assign(vide(), { vues: 0, ms: 0 });
const nouveauTP = () => Object.assign(vide(), { ouverts: 0, finis: 0, msFin: 0 });
const nouvelObjectif = () => Object.assign(vide(), { reussis: 0, ms: 0, essais: 0, rates: 0 });
function ajouterAuJour(j, ev) {
  const nomPage = () => ev.p + (ev.id ? "·" + ev.id : "");
  switch (ev.e) {
    case "visite": {
      const v = j.visites;
      v.total++; plus(v.retour, ev.retour); plus(v.niveau, ev.niveau); plus(v.type, ev.type); plus(v.os, ev.os); plus(v.largeur, ev.largeur);
      break;
    }
    case "page": ligne(j.pages, nomPage(), nouvellePage).vues++; break;
    case "temps": ligne(j.pages, nomPage(), nouvellePage).ms += ev.ms; break;
    case "palier": plus(j.paliers, ev.m); break;
    case "tp_debut": ligne(j.tps, ev.id, nouveauTP).ouverts++; break;
    case "tp_fin": { const x = ligne(j.tps, ev.id, nouveauTP); x.finis++; x.msFin += ev.ms || 0; break; }
    case "objectif": { const x = ligne(j.objectifs, ev.id + "|" + ev.i, nouvelObjectif); x.reussis++; x.ms += ev.ms || 0; break; }
    case "essai":
      if (ev.o === "o") { const x = ligne(j.objectifs, ev.id + "|" + ev.i, nouvelObjectif); x.essais++; if (!ev.ok) x.rates++; }
      else { const x = ligne(j.questions, ev.id + "|" + ev.i, () => Object.assign(vide(), { justes: 0, fausses: 0 })); if (ev.ok) x.justes++; else x.fausses++; }
      break;
    case "notion": plus(j.notions, ev.noeud); break;
    case "carte_finie": plus(j.cartes, ev.id); break;
  }
}
// Additionne des totaux : nombres et objets de nombres, récursivement.
function additionner(x, y) {
  for (const k of Object.keys(y)) {
    if (typeof y[k] === "number") x[k] = (possede(x, k) && typeof x[k] === "number" ? x[k] : 0) + y[k];
    else if (y[k] && typeof y[k] === "object") { if (!possede(x, k) || !x[k] || typeof x[k] !== "object") x[k] = vide(); additionner(x[k], y[k]); }
  }
  return x;
}

/* ---------- Seuil k : aucune case ne décrit moins de k événements ---------- */
// Rend les lignes à montrer d'un total (tableau de bord et CSV), cases masquées sous le seuil.
// Les lignes dont le compte principal est sous le seuil ne sont pas montrées du tout (leur seule
// présence dirait qu'au moins une visite a ouvert telle page ou tel TP).
function masqueur(k) {
  const m = n => typeof n === "number" && n >= k ? n : "< " + k;
  const ok = n => typeof n === "number" && n >= k;
  return { m, ok, k };
}
function lignesDuTotal(d, k) {
  const { m, ok } = masqueur(k), l = [];
  l.push(["visites", "", "total", m(d.visites.total)]);
  for (const r of ["retour", "niveau", "type", "os", "largeur"]) for (const [c, n] of Object.entries(d.visites[r])) if (ok(n)) l.push(["visites_" + r, c, "visites", n]);
  for (const [c, n] of Object.entries(d.paliers)) l.push(["paliers", c, "visites", m(n)]);
  for (const r of ["notions", "cartes"]) for (const [c, n] of Object.entries(d[r])) if (ok(n)) l.push([r, c, "nombre", n]);
  for (const [c, x] of Object.entries(d.pages)) if (ok(x.vues)) l.push(["pages", c, "vues", x.vues], ["pages", c, "temps_ms", x.ms]);
  for (const [c, x] of Object.entries(d.tps)) if (ok(x.ouverts)) { l.push(["tps", c, "ouverts", x.ouverts], ["tps", c, "termines", m(x.finis)]); if (ok(x.finis)) l.push(["tps", c, "duree_fin_ms", x.msFin]); }
  for (const [c, x] of Object.entries(d.objectifs)) if (ok(x.reussis) || ok(x.essais)) {
    l.push(["objectifs", c, "reussis", m(x.reussis)], ["objectifs", c, "essais", m(x.essais)], ["objectifs", c, "essais_rates", m(x.rates)]);
    if (ok(x.reussis)) l.push(["objectifs", c, "temps_reussite_ms", x.ms]);
  }
  for (const [c, x] of Object.entries(d.questions)) if (ok(x.justes + x.fausses)) l.push(["questions", c, "justes", m(x.justes)], ["questions", c, "fausses", m(x.fausses)]);
  return l;
}

/* ---------- Adresse du client : en mémoire seulement ---------- */
const local = adr => /^(127\.|::1$|::ffff:127\.)/.test(adr || "") || !adr;
// IPv6 : un abonné a souvent tout un /64 ; on compte donc par /64.
function prefixe64(adr) {
  adr = String(adr || "").replace(/%.*$/, "");
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(adr);
  if (v4) return v4[1];
  if (!adr.includes(":")) return adr;
  const [g, d] = adr.split("::");
  const gauche = g ? g.split(":") : [], droite = d ? d.split(":") : [];
  const groupes = d === undefined ? gauche : gauche.concat(Array(Math.max(0, 8 - gauche.length - droite.length)).fill("0"), droite);
  return groupes.slice(0, 4).map(x => (parseInt(x || "0", 16) || 0).toString(16)).join(":") + "::/64";
}
// Derrière le proxy d'O2switch (connexion locale), la DERNIÈRE entrée de X-Forwarded-For est celle que
// le proxy a ajoutée. Sans X-Forwarded-For derrière un proxy, tous les clients ont la même adresse :
// « fiable » est alors faux et les mécanismes par adresse sont coupés.
function adresseClient(req) {
  const directe = req.socket.remoteAddress || "";
  if (!local(directe)) return { adr: prefixe64(directe), fiable: true };
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map(s => s.trim()).filter(Boolean);
  return xff.length ? { adr: prefixe64(xff[xff.length - 1]), fiable: true } : { adr: directe, fiable: false };
}

module.exports = { valider, ajouterAuJour, additionner, nouveauJour, lignesDuTotal, prefixe64, chargerListeBlanche, secretValide, hashValide };

/* ---------- Démarrage ---------- */
if (process.argv[2] === "--hacher") {
  lireMotDePasse().then(m => {
    if (!m) { console.error("Mot de passe vide."); process.exit(1); }
    console.log(hacher(m));
  });
} else if (process.env.LS_PAS_DE_SERVEUR !== "1") demarrer();

function demarrer() {
  const CONFIG = lireConfig();
  const refus = m => { console.error("Refus de démarrer : " + m + " Voir docs/JOURNAL.md."); process.exit(1); };
  for (const [nom, p] of [["le dossier de données", CONFIG.dossierDonnees], ["le fichier de configuration", CONFIG.fichier]])
    if (sousDossierPublic(p)) refus(nom + " (" + p + ") est dans un dossier public.");
  // Un secret d'exemple ou trop court permettrait de fabriquer un cookie d'administrateur.
  if (!secretValide(CONFIG.secretSession)) refus("secretSession doit compter au moins 64 caractères hexadécimaux tirés au hasard (le texte d'exemple n'est pas accepté).");
  let W;
  try { W = chargerListeBlanche(CONFIG.listeBlanche); } catch (e) { refus("liste blanche illisible (" + CONFIG.listeBlanche + ") : " + e.message); }
  const ADMIN_ACTIF = hashValide(CONFIG.adminHash);
  if (!ADMIN_ACTIF) console.error("Attention : adminHash absent ou invalide : le tableau de bord reste fermé (aucune session possible).");
  const SECRET = CONFIG.secretSession, K = CONFIG.seuilK;
  const AGG = path.join(CONFIG.dossierDonnees, "agregats"), IDS = path.join(CONFIG.dossierDonnees, "lots");
  for (const d of [CONFIG.dossierDonnees, AGG, IDS]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  // Données brutes d'une version précédente (lignes par lot avec numéro d'appareil) : effacées.
  fs.rmSync(path.join(CONFIG.dossierDonnees, "evenements"), { recursive: true, force: true });
  const SEL_MEMOIRE = crypto.randomBytes(16); // empreintes d'adresses, en mémoire seulement
  const BASE_ADMIN = CONFIG.base + CONFIG.cheminAdmin;
  const jour = s => new Date(s * 1000).toISOString().slice(0, 10);
  const maintenantS = () => Math.floor(Date.now() / 1000);
  const fichiers = (d, motif) => fs.readdirSync(d).filter(f => motif.test(f)).sort();
  const JOURS = /^\d{4}-\d{2}-\d{2}\.json$/, MOIS = /^mois-\d{4}-\d{2}\.json$/, IDS_F = /^\d{4}-\d{2}-\d{2}\.txt$/;
  const taille = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } };
  const dormir = ms => new Promise(r => setTimeout(r, ms));

  // Lecture d'un fichier de totaux. Absent : totaux vides. Illisible : mis en quarantaine (.corrompu-…)
  // et erreur (le lot reçoit 503 et sera renvoyé) : jamais d'écrasement silencieux.
  function lireTotaux(p, init) {
    let texte;
    try { texte = fs.readFileSync(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return init(); throw e; }
    try { return additionner(init(), JSON.parse(texte)); }
    catch (e) {
      const q = p + ".corrompu-" + Date.now();
      try { fs.renameSync(p, q); } catch (x) { /* déjà déplacé par un autre processus */ }
      console.error("journal : fichier illisible mis en quarantaine : " + path.basename(q));
      const err = new Error("fichier de totaux illisible"); err.quarantaine = true; throw err;
    }
  }
  function ecrireTotaux(p, donnees) {
    const tmp = p + ".tmp" + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(donnees), { mode: 0o600 });
    fs.renameSync(tmp, p);
  }
  const fichierJour = j => path.join(AGG, j + ".json"), fichierMois = m => path.join(AGG, "mois-" + m + ".json");

  // Verrou entre processus : création exclusive d'un fichier contenant un jeton ; attente asynchrone ;
  // le verrou n'est retiré que par son propriétaire (même jeton), ou repris s'il est abandonné (> 10 s).
  const VERROU = path.join(CONFIG.dossierDonnees, ".verrou");
  async function avecVerrou(fn) {
    const jeton = crypto.randomBytes(16).toString("hex"), debut = Date.now();
    for (;;) {
      try { fs.writeFileSync(VERROU, jeton, { flag: "wx", mode: 0o600 }); break; }
      catch (e) {
        if (e.code !== "EEXIST") throw e;
        try {
          if (Date.now() - fs.statSync(VERROU).mtimeMs > 10000) {
            const ancien = fs.readFileSync(VERROU, "utf8");
            if (fs.readFileSync(VERROU, "utf8") === ancien) { fs.unlinkSync(VERROU); console.error("journal : verrou abandonné repris"); }
            continue;
          }
        } catch (x) { continue; } // retiré entre-temps
        if (Date.now() - debut > 5000) throw new Error("verrou indisponible");
        await dormir(5 + Math.random() * 15);
      }
    }
    try { return fn(); }
    finally { try { if (fs.readFileSync(VERROU, "utf8") === jeton) fs.unlinkSync(VERROU); } catch (e) { /* déjà retiré */ } }
  }

  /* --- Lots déjà reçus (31 jours, partagés entre processus par les fichiers lots/) --- */
  const lotsVus = new Map(); // identifiant -> jour
  const lus = new Map();     // fichier lots/ -> octets déjà lus
  const GARDE_IDS = MAX_RETARD + 86400;
  function rafraichirIds() {
    const limite = jour(maintenantS() - GARDE_IDS);
    for (const f of fichiers(IDS, IDS_F)) {
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
  // Enregistre un lot validé : tout va au jour de réception (et l'heure des visites au mois de
  // réception) + identifiant du lot, sous verrou. Rend "deja", une raison de refus (plafond), ou null.
  function enregistrer(lot, octets) {
    return avecVerrou(() => {
      rafraichirIds();
      if (lotsVus.has(lot.lot)) return "deja";
      const auj = jour(maintenantS()), totaux = lireTotaux(fichierJour(auj), nouveauJour);
      if (totaux.octets + octets > CONFIG.plafondOctetsJour) return "octets du jour";
      if (totaux.lots >= CONFIG.plafondLotsJour) return "lots du jour";
      if (tailleDossier() + octets > CONFIG.plafondDossierOctets) return "taille du dossier";
      for (const ev of lot.evs) ajouterAuJour(totaux, ev);
      totaux.lots++; totaux.octets += octets;
      if (lot.heures.length) {
        const mois = lireTotaux(fichierMois(auj.slice(0, 7)), () => Object.assign(vide(), { heures: vide() }));
        for (const h of lot.heures) plus(mois.heures, h);
        ecrireTotaux(fichierMois(auj.slice(0, 7)), mois);
      }
      ecrireTotaux(fichierJour(auj), totaux);
      fs.appendFileSync(path.join(IDS, auj + ".txt"), lot.lot + "\n", { mode: 0o600 });
      lotsVus.set(lot.lot, auj);
      tailleDossierCache.octets += 33; // les totaux grossissent peu ; la taille réelle est relue toutes les 10 min
      version++;
      return null;
    });
  }

  /* --- Purge (sous verrou) : totaux au-delà de la conservation, identifiants de lots au-delà de 31 jours --- */
  function purger() {
    const limite = jour(maintenantS() - CONFIG.conservationJours * 86400), limiteIds = jour(maintenantS() - GARDE_IDS);
    let n = 0;
    for (const f of fichiers(AGG, JOURS)) if (f.slice(0, 10) < limite) { fs.unlinkSync(path.join(AGG, f)); n++; }
    for (const f of fichiers(AGG, MOIS)) if (f.slice(5, 12) < limite.slice(0, 7)) fs.unlinkSync(path.join(AGG, f));
    for (const f of fichiers(IDS, IDS_F)) if (f.slice(0, 10) < limiteIds) { fs.unlinkSync(path.join(IDS, f)); lus.delete(f); }
    for (const [id, j] of lotsVus) if (j < limiteIds) lotsVus.delete(id);
    version++; tailleDossierCache.t = 0;
    return n;
  }
  const purgerSousVerrou = () => avecVerrou(purger).catch(e => console.error("purge :", e.message));
  purgerSousVerrou();
  setInterval(purgerSousVerrou, 24 * 3600 * 1000).unref();

  /* --- Limites par adresse (en mémoire, seulement si l'adresse est fiable) --- */
  const empreinte = adr => crypto.createHmac("sha256", SEL_MEMOIRE).update(adr).digest("hex").slice(0, 24);
  let fenetre10 = -1, compteurs10 = new Map(), jourIp = "", compteursJour = new Map();
  function tropDeLots(fp) {
    const f = Math.floor(Date.now() / 600000), j = jour(maintenantS());
    if (f !== fenetre10) { fenetre10 = f; compteurs10 = new Map(); } // compteurs expirés effacés d'un coup
    if (j !== jourIp) { jourIp = j; compteursJour = new Map(); }
    const n = (compteurs10.get(fp) || 0) + 1, nj = (compteursJour.get(fp) || 0) + 1;
    compteurs10.set(fp, n); compteursJour.set(fp, nj);
    return n > CONFIG.limiteLots10min || nj > CONFIG.plafondIpJour;
  }

  /* --- Totaux d'une période de JOURS CLOS (jamais le jour en cours), petit cache --- */
  let cache = { cle: "", valeur: null, t: 0 };
  function periode(jours) {
    const cle = jours + ":" + version + ":" + jour(maintenantS());
    if (cache.cle === cle && Date.now() - cache.t < 60000) return cache.valeur;
    const hier = jour(maintenantS() - 86400), premier = jour(maintenantS() - jours * 86400), parJour = [], alertes = [];
    const total = nouveauJour();
    for (const f of fichiers(AGG, JOURS)) {
      const j = f.slice(0, 10);
      if (j < premier || j > hier) continue;
      try { const d = lireTotaux(path.join(AGG, f), nouveauJour); additionner(total, d); parJour.push([j, d]); }
      catch (e) { alertes.push("Le jour " + j + " était illisible : mis en quarantaine, non compté."); }
    }
    for (const f of fs.readdirSync(AGG)) if (/\.corrompu-/.test(f)) alertes.push("Fichier en quarantaine : " + f + " (à examiner à la main).");
    // Profil horaire : seulement le dernier mois clos.
    const d = new Date(), moisPrec = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    let heures = vide();
    try { heures = lireTotaux(fichierMois(moisPrec), () => Object.assign(vide(), { heures: vide() })).heures; } catch (e) { alertes.push("Le profil horaire de " + moisPrec + " était illisible."); }
    cache = { cle, valeur: { total, parJour, heures, moisPrec, alertes, premier, hier }, t: Date.now() };
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
    if (!ADMIN_ACTIF) return null; // pas de mot de passe valable : aucune session, même avec un cookie signé
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
  const { m: M, ok: OK } = masqueur(K);
  const echap = s => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const duree = ms => { const s = Math.round((ms || 0) / 1000); return s >= 3600 ? Math.floor(s / 3600) + " h " + String(Math.floor(s % 3600 / 60)).padStart(2, "0") + " min" : s >= 60 ? Math.floor(s / 60) + " min " + String(s % 60).padStart(2, "0") + " s" : s + " s"; };
  // Part en % : seulement si le numérateur et le dénominateur atteignent le seuil.
  const pc = (x, y) => OK(x) && OK(y) ? Math.min(100, Math.round(100 * x / y)) + " %" : "";
  function pageHtml(titre, corps) {
    return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>" + echap(titre) + "</title><style>" +
      "body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#eef1ec;color:#17221c}main{max-width:1100px;margin:0 auto;padding:16px}h1{font-size:1.6rem;margin:.2em 0}" +
      "h2{font-size:1.2rem;margin:1.6em 0 .4em;border-bottom:2px solid #17221c}h3{font-size:1rem;margin:1em 0 .3em}table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #cdd6cb}th{background:#e2e8df}" +
      "td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.chiffres{display:flex;gap:28px;flex-wrap:wrap}.chiffres div{font-size:2rem;font-weight:700}.chiffres span{display:block;font-size:.85rem;font-weight:400;color:#55635a}" +
      "form.ligne{display:inline-flex;gap:8px;align-items:center;margin:4px 8px 4px 0;flex-wrap:wrap}button,input,select{font:inherit;padding:8px 12px;min-height:44px}button{cursor:pointer}.alerte{color:#c3352a;font-weight:700}.tableau{overflow-x:auto}" +
      ".colonnes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 24px}.barre{display:inline-block;height:10px;background:#1e5b44;vertical-align:middle;margin-right:6px}.note{color:#55635a;font-size:.9rem}" +
      "dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}dt{font-weight:700}" +
      "</style></head><body><main>" + corps + "</main></body></html>";
  }
  function tableau(entetes, numeriques, lignes, vide_) {
    if (!lignes.length) return "<p class=\"note\">" + (vide_ || "Rien au-dessus du seuil sur la période.") + "</p>";
    return "<div class=\"tableau\"><table><thead><tr>" + entetes.map((e, k) => "<th" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(e) + "</th>").join("") + "</tr></thead><tbody>" +
      lignes.map(l => "<tr>" + l.map((v, k) => "<td" + (numeriques[k] ? " class=\"n\"" : "") + ">" + (typeof v === "object" && v && v.html ? v.html : echap(v)) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }
  // Répartition : seulement les catégories au-dessus du seuil.
  function repartition(titre, m, noms) {
    const tout = Object.entries(m || {}), lignes = tout.filter(x => OK(x[1])).sort((x, y) => y[1] - x[1]), tot = tout.reduce((s, x) => s + x[1], 0);
    return "<div><h3>" + echap(titre) + "</h3>" + tableau(["", "Visites", "Part"], [0, 1, 1],
      lignes.map(([c, n]) => [(noms && noms[c]) || c, n, { html: "<span class=\"barre\" style=\"width:" + Math.round(60 * n / (tot || 1)) + "px\"></span>" + echap(pc(n, tot)) }])) + "</div>";
  }
  // Cellule CSV : guillemets doublés, et apostrophe devant = + - @ (formules des tableurs).
  const celluleCsv = v => { let s = v === undefined || v === null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

  /* --- HTTP --- */
  function lireCorps(req, max) {
    return new Promise((ok, ko) => {
      const morceaux = []; let n = 0;
      req.on("data", x => { n += x.length; if (n > max) { ko(new Error("trop gros")); req.destroy(); } else morceaux.push(x); });
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
    const client = adresseClient(req);

    /* Réception du journal */
    if (chemin === "/journal") {
      const cors = origine && origineOk ? { "Access-Control-Allow-Origin": origine, "Vary": "Origin" } : {};
      if (req.method === "OPTIONS") return repondre(res, origineOk ? 204 : 403, "", Object.assign(cors, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" }));
      if (req.method !== "POST") return repondre(res, 405, "", { Allow: "POST" });
      if (!origineOk) return repondre(res, 403);
      // Sans identifiant d'appareil, la limite de débit se fait par adresse (en mémoire), si elle est fiable.
      if (client.fiable && tropDeLots(empreinte(client.adr))) return repondre(res, 429, "", Object.assign(cors, { "Retry-After": "600" }));
      let corps;
      try { corps = await lireCorps(req, 128 * 1024); } catch (e) { return repondre(res, 413, "", cors); }
      let lot;
      try { lot = valider(JSON.parse(corps), maintenantS(), W); } catch (e) { lot = null; }
      if (!lot) return repondre(res, 400, "", cors);
      // Rien de valable (identifiants inconnus…) : confirmé, mais rien n'est écrit ni compté dans les plafonds.
      if (!lot.evs.length) return repondre(res, 204, "", cors);
      let raison;
      try { raison = await enregistrer(lot, Buffer.byteLength(corps)); } catch (e) { console.error("journal :", e.message); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "60" })); }
      if (raison && raison !== "deja") { console.error("journal : plafond atteint (" + raison + "), lot refusé"); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "3600" })); }
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
      // Délai par adresse seulement si l'adresse est fiable (sinon tous les clients partageraient le même délai).
      const fp = client.fiable ? empreinte(client.adr) : null, reste = fp ? delaiAvantEssai(fp) : 0;
      let message;
      if (reste > 0) message = "Trop d'essais ratés : réessaie dans " + Math.ceil(reste / 1000) + " s.";
      else if (!ADMIN_ACTIF) message = "Mot de passe non configuré : voir docs/JOURNAL.md.";
      else if (await verifier(formulaire.get("mdp") || "", CONFIG.adminHash)) {
        if (fp) echecs.delete(fp);
        return repondre(res, 303, "", { Location: BASE_ADMIN, "Set-Cookie": cookie(creerSession(), DUREE_SESSION) });
      } else { if (fp) noterEchec(fp); message = "Mot de passe incorrect."; }
      return repondre(res, reste > 0 ? 429 : 401, pageConnexion(message), ENTETES_ADMIN);
    }
    if (!s) return repondre(res, route === "/" ? 200 : 401, pageConnexion(""), ENTETES_ADMIN);
    if (route === "/deconnexion" && req.method === "POST" && csrfOk) {
      revoquees.set(s.n, s.exp);
      return repondre(res, 303, "", { Location: BASE_ADMIN, "Set-Cookie": cookie("", 0) });
    }
    const jours = [7, 30, 90, 365, 760].includes(+parametres.get("jours")) ? +parametres.get("jours") : 30;

    if (route === "/export.csv") {
      const p = periode(jours), lignes = ["﻿jour;rubrique;cle;mesure;valeur"];
      for (const [j, d] of p.parJour) for (const l of lignesDuTotal(d, K)) lignes.push([j].concat(l).map(celluleCsv).join(";"));
      for (const l of lignesDuTotal(p.total, K)) lignes.push(["periode " + p.premier + " a " + p.hier].concat(l).map(celluleCsv).join(";"));
      return repondre(res, 200, lignes.join("\n") + "\n", { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"journal-totaux-" + p.hier + ".csv\"" });
    }
    if (route === "/diagnostic") return repondre(res, 200, pageDiagnostic(), ENTETES_ADMIN);
    let message = "";
    if (route === "/purger" && req.method === "POST") {
      const quoi = formulaire.get("quoi");
      if (!csrfOk) message = "Session expirée : recharge la page.";
      else if (quoi === "tout" && formulaire.get("confirmer") === "EFFACER") {
        await avecVerrou(() => { for (const f of fichiers(AGG, /\.json$/)) fs.unlinkSync(path.join(AGG, f)); });
        version++; tailleDossierCache.t = 0;
        message = "Tous les totaux ont été effacés.";
      } else if (quoi === "anciens") message = (await avecVerrou(purger)) + " jour(s) de plus de " + CONFIG.conservationJours + " jours effacé(s).";
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
      const masquer = x => /^\d+\.\d+\.\d+\.\d+$/.test(x) ? x.split(".").slice(0, 2).join(".") + ".x.x" : x.includes(":") ? x.split(":").slice(0, 2).join(":") + ":…" : "(forme inconnue)";
      const sansXff = local(directe) && !xff.length;
      return pageHtml("Diagnostic · journal", "<h1>Diagnostic du proxy</h1><p>Rien de cette page n'est enregistré.</p>" +
        (sansXff ? "<p class=\"alerte\">Attention : la connexion vient du proxy local mais X-Forwarded-For est absent. Tous les clients ont alors la même adresse : les limites par adresse et le délai après essais de connexion ratés sont désactivés. Voir docs/JOURNAL.md.</p>" : "") + "<dl>" +
        "<dt>Connexion directe locale (proxy)</dt><dd>" + (local(directe) ? "oui" : "non : X-Forwarded-For est ignoré") + "</dd>" +
        "<dt>X-Forwarded-For présent</dt><dd>" + (xff.length ? "oui, " + xff.length + " entrée(s)" : "non") + "</dd>" +
        (xff.length ? "<dt>Dernière entrée (utilisée)</dt><dd>" + echap(masquer(xff[xff.length - 1])) + "</dd>" : "") +
        "<dt>X-Forwarded-Proto</dt><dd>" + echap(req.headers["x-forwarded-proto"] || "absent") + "</dd></dl>" +
        "<p>Compare la dernière entrée avec le début de ton adresse publique : elles doivent correspondre. Sinon, la limite par adresse ne vise pas le bon client ; voir docs/JOURNAL.md.</p>" +
        "<p><a href=\"" + echap(BASE_ADMIN) + "\">Retour au tableau de bord</a></p>");
    }
    function pageTableau(sess, j, msg) {
      const P = periode(j), t = P.total, b = echap(BASE_ADMIN), jeton = "<input type=\"hidden\" name=\"csrf\" value=\"" + echap(sess.csrf) + "\">";
      const periodes = [[7, "7 derniers jours clos"], [30, "30 jours"], [90, "90 jours"], [365, "12 mois"], [760, "25 mois"]].map(([n, nom]) => "<option value=\"" + n + "\"" + (n === j ? " selected" : "") + ">" + nom + "</option>").join("");
      const somme = (o, f) => Object.values(o).reduce((x, v) => x + f(v), 0);
      const vues = somme(t.pages, x => x.vues), tempsTotal = somme(t.pages, x => x.ms), V = t.visites.total;
      const objectifs = Object.entries(t.objectifs).map(([c, x]) => { const [id, i] = c.split("|"); return { id, i: +i + 1, x }; });
      const ouvertsDe = id => (possede(t.tps, id) ? t.tps[id].ouverts : 0);
      // Durée de visite en tranches : différences entre paliers (jamais négatives : une visite à cheval sur
      // minuit peut avoir son palier compté le lendemain).
      const pal = m => (possede(t.paliers, m) ? t.paliers[m] : 0), pos = n => Math.max(0, n);
      const tranches = [["moins de 1 min", pos(V - pal(1))], ["1 à 5 min", pos(pal(1) - pal(5))], ["5 à 15 min", pos(pal(5) - pal(15))], ["15 à 30 min", pos(pal(15) - pal(30))], ["30 à 60 min", pos(pal(30) - pal(60))], ["plus de 60 min", pal(60)]];
      const NIV = { 0: "non choisi", 1: "Primaire", 2: "Collège", 3: "Lycée", 4: "Avancé" };
      const RET = { meme_jour: "revenu le même jour", moins7: "revenu en moins de 7 jours", "7a30": "revenu entre 7 et 30 jours", plus30: "revenu après plus de 30 jours", premiere: "première visite (ou date effacée)" };
      const heures = Array.from({ length: 24 }, (_, h) => [h + " h-" + (h + 1) + " h", possede(P.heures, h) ? P.heures[h] : 0]);
      return pageHtml("Journal d'utilisation", "<h1>Journal d'utilisation</h1>" +
        "<p class=\"note\">Statistiques agrégées par jour, seulement des jours clos (du " + P.premier + " au " + P.hier + ") ; toute case de moins de " + K + " est masquée (« &lt; " + K + " ») et les lignes sous ce seuil ne sont pas affichées.</p>" +
        P.alertes.map(x => "<p class=\"alerte\">" + echap(x) + "</p>").join("") + (msg ? "<p class=\"alerte\">" + echap(msg) + "</p>" : "") +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "\"><label>Période <select name=\"jours\">" + periodes + "</select></label><button>Afficher</button></form>" +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "/export.csv\"><input type=\"hidden\" name=\"jours\" value=\"" + j + "\"><button>Exporter les totaux (CSV)</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/deconnexion\">" + jeton + "<button>Se déconnecter</button></form>" +
        "<div class=\"chiffres\"><div>" + echap(M(V)) + "<span>visites</span></div><div>" + echap(M(vues)) + "<span>pages vues</span></div><div>" + (OK(vues) ? echap(duree(tempsTotal)) : "&lt; " + K) + "<span>temps actif total</span></div>" +
        "<div>" + echap(M(somme(t.tps, x => x.ouverts))) + "<span>TP ouverts</span></div><div>" + echap(M(somme(t.objectifs, x => x.rates))) + "<span>essais ratés aux objectifs</span></div></div>" +
        "<h2>Par jour</h2>" + tableau(["Jour", "Visites", "Pages vues", "Temps actif", "TP ouverts", "TP terminés", "Objectifs réussis", "Essais ratés"], [0, 1, 1, 1, 1, 1, 1, 1],
          P.parJour.slice().reverse().map(([jj, d]) => { const v = somme(d.pages, x => x.vues); return [jj, M(d.visites.total), M(v), OK(v) ? duree(somme(d.pages, x => x.ms)) : "< " + K,
            M(somme(d.tps, x => x.ouverts)), M(somme(d.tps, x => x.finis)), M(somme(d.objectifs, x => x.reussis)), M(somme(d.objectifs, x => x.rates))]; }), "Aucun jour clos sur la période.") +
        "<h2>Visites</h2><div class=\"colonnes\">" + repartition("Retour", t.visites.retour, RET) + repartition("Niveau choisi", t.visites.niveau, NIV) + repartition("Type d'appareil", t.visites.type) +
        repartition("Système", t.visites.os) + repartition("Largeur d'écran (px)", t.visites.largeur) +
        "<div><h3>Durée active de la visite</h3>" + tableau(["", "Visites"], [0, 1], OK(V) ? tranches.map(([x, n]) => [x, M(n)]) : []) + "</div>" +
        "<div><h3>Heure des visites, " + echap(P.moisPrec) + " (UTC, heure de Bamako)</h3>" + tableau(["", "Visites"], [0, 1], heures.filter(x => OK(x[1])), "Aucune heure au-dessus du seuil pour le dernier mois clos.") + "</div></div>" +
        "<h2>Pages les plus consultées</h2>" + tableau(["Page", "Vues", "Temps actif total", "Temps moyen par vue"], [0, 1, 1, 1],
          Object.entries(t.pages).filter(([, x]) => OK(x.vues)).sort((x, y) => y[1].vues - x[1].vues).slice(0, 40).map(([c, x]) => [c, x.vues, duree(x.ms), duree(x.ms / x.vues)])) +
        "<h2>TP : ouverts, terminés (par variante de niveau)</h2><p class=\"note\">Comptés par visite : un TP ouvert deux fois dans la même visite compte une fois ; « terminé » veut dire terminé pendant la visite.</p>" +
        tableau(["TP", "Visites qui l'ont ouvert", "Terminés pendant la visite", "Part terminée", "Durée moyenne jusqu'à la fin"], [0, 1, 1, 1, 1],
          Object.entries(t.tps).filter(([, x]) => OK(x.ouverts)).sort((x, y) => y[1].ouverts - x[1].ouverts).slice(0, 60).map(([c, x]) => [c, x.ouverts, M(x.finis), pc(x.finis, x.ouverts), OK(x.finis) ? duree(x.msFin / x.finis) : ""])) +
        "<h2>Où les élèves se trompent : objectifs triés par essais ratés</h2><p class=\"note\">Les essais ne concernent que les objectifs à réponse écrite (les objectifs atteints en manipulant la simulation n'ont pas d'essai raté).</p>" +
        tableau(["TP", "Objectif", "Essais", "Essais ratés", "Part ratée", "Réussites"], [0, 1, 1, 1, 1, 1],
          objectifs.filter(o => OK(o.x.essais)).sort((x, y) => y.x.rates - x.x.rates).slice(0, 40).map(o => [o.id, o.i, o.x.essais, M(o.x.rates), pc(o.x.rates, o.x.essais), M(o.x.reussis)]), "Aucun objectif avec assez d'essais sur la période.") +
        "<h2>Objectifs : où les élèves bloquent</h2><p class=\"note\">Visites où l'objectif a été réussi, rapportées aux visites qui ont ouvert la même variante du TP (le plus bas en premier).</p>" +
        tableau(["TP", "Objectif", "Visites ayant ouvert le TP", "Réussites", "Taux", "Temps moyen pour réussir"], [0, 1, 1, 1, 1, 1],
          objectifs.filter(o => OK(ouvertsDe(o.id))).map(o => ({ o, taux: o.x.reussis / ouvertsDe(o.id) })).sort((x, y) => x.taux - y.taux).slice(0, 40)
            .map(({ o }) => [o.id, o.i, ouvertsDe(o.id), M(o.x.reussis), pc(o.x.reussis, ouvertsDe(o.id)), OK(o.x.reussis) ? duree(o.x.ms / o.x.reussis) : ""])) +
        "<h2>Questions de quiz : réponses fausses</h2>" + tableau(["TP", "Question", "Réponses justes", "Réponses fausses", "Part fausse"], [0, 1, 1, 1, 1],
          Object.entries(t.questions).filter(([, x]) => OK(x.justes + x.fausses)).map(([c, x]) => ({ c, x })).sort((p, q) => q.x.fausses - p.x.fausses).slice(0, 40)
            .map(({ c, x }) => [c.split("|")[0], +c.split("|")[1] + 1, M(x.justes), M(x.fausses), pc(x.fausses, x.justes + x.fausses)])) +
        "<div class=\"colonnes\"><div><h2>Notions comprises</h2>" + tableau(["Carte / notion", "Fois"], [0, 1], Object.entries(t.notions).filter(x => OK(x[1])).sort((x, y) => y[1] - x[1]).slice(0, 30)) + "</div>" +
        "<div><h2>Cartes terminées</h2>" + tableau(["Carte", "Fois"], [0, 1], Object.entries(t.cartes).filter(x => OK(x[1])).sort((x, y) => y[1] - x[1]).slice(0, 30)) + "</div></div>" +
        "<h2>Purge</h2><form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"anciens\">" + jeton + "<button>Effacer les jours de plus de " + CONFIG.conservationJours + " jours</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"tout\">" + jeton + "<label>Tout effacer : tape EFFACER <input name=\"confirmer\" autocomplete=\"off\" size=\"9\"></label><button>Tout effacer</button></form>" +
        "<p><a href=\"" + b + "/diagnostic\">Diagnostic du proxy (X-Forwarded-For)</a></p>" +
        "<p class=\"note\">Totaux par jour de réception, gardés " + CONFIG.conservationJours + " jours ; heure des visites seulement par mois. Aucun identifiant d'appareil ni de visite, aucune adresse IP.</p>");
    }
  }

  const serveur = http.createServer((req, res) => {
    traiter(req, res).catch(err => { console.error("journal :", err && err.message); if (!res.headersSent) repondre(res, 500); else res.end(); });
  });
  serveur.listen(process.env.PORT || 3000, () => console.log("Journal Learn Space à l'écoute sur le port " + serveur.address().port));
}
