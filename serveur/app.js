/* Serveur du journal d'utilisation de Learn Space : statistiques agrégées et minimisées
   (Node.js 18, 20 ou 22, sans dépendance npm).
   - POST <base>/journal : reçoit des lots d'événements sans identifiant (assets/js/journal.js) et les
     ajoute aussitôt aux TOTAUX DU JOUR DE RÉCEPTION (agregats/AAAA-MM-JJ.json). Aucune ligne brute,
     aucune heure d'événement ; seules les visites sont aussi comptées par heure, dans un total du mois
     (agregats/mois-AAAA-MM.json). Les identifiants acceptés viennent de liste-blanche.json, généré
     depuis le contenu du site (node outils/liste-precache.js) et relu dès qu'il change.
   - lots/AAAA-MM-JJ.txt : identifiants aléatoires des lots déjà reçus (un lot renvoyé après une coupure
     n'est pas compté deux fois), sans lien avec rien d'autre, effacés au bout de 31 jours.
   - <base><cheminAdmin> : tableau de bord de l'administrateur (mot de passe scrypt, cookie de session
     signé HMAC, jeton CSRF). Il ne montre que des SEMAINES ou des MOIS terminés (périodes du calendrier,
     jamais de fenêtre glissante) ; toute case sous le seuil k (5 par défaut) est cachée, et d'autres
     cases aussi quand une soustraction permettrait de retrouver un petit nombre (suppression
     complémentaire).
   À la réception, le serveur voit l'adresse IP comme tout site ; il ne l'écrit jamais et ne s'en sert
   qu'en mémoire (limites de débit, essais de connexion), au plus jusqu'à minuit UTC.
   Lancement : `node serveur/app.js` (port dans PORT ; sur O2switch, Passenger le fournit).
   Hacher un mot de passe : `node serveur/app.js --hacher` puis taper le mot de passe. Voir docs/JOURNAL.md. */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/* ---------- Mot de passe (scrypt) et secret de session ---------- */
const FORME_HASH = /^scrypt\$(\d{4,7})\$(\d{1,2})\$(\d{1,2})\$([A-Za-z0-9+/]{22}==)\$([A-Za-z0-9+/]{86}==)$/;
function hacher(mdp) {
  const sel = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(mdp), sel, 64, { N: 16384, r: 8, p: 1 });
  return "scrypt$16384$8$1$" + sel.toString("base64") + "$" + h.toString("base64");
}
const hashValide = h => FORME_HASH.test(String(h || ""));
// Le secret de session : au moins 64 caractères hexadécimaux TIRÉS AU HASARD. Refusés : moins de 12
// caractères différents, une suite de 6 caractères identiques, un motif court répété (« abab… »).
function secretValide(s) {
  s = String(s || "").toLowerCase();
  if (!/^[0-9a-f]{64,}$/.test(s) || new Set(s).size < 12 || /(.)\1{5}/.test(s)) return false;
  for (let p = 1; p <= 16; p++) if (s.slice(p) === s.slice(0, s.length - p)) return false; // motif de période p
  return true;
}
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
    seuilK: Math.max(2, +val("LS_SEUIL_K", "seuilK", 5)),
    conservationJours: +val("LS_CONSERVATION_JOURS", "conservationJours", 760),
    // Par adresse (une école ou un opérateur mobile mettent des centaines d'appareils derrière une seule
    // adresse : voir docs/JOURNAL.md pour le calcul de ces valeurs).
    limiteLots10min: +val("LS_LIMITE_LOTS", "limiteLots10min", 3000),
    plafondIpJour: +val("LS_PLAFOND_IP_JOUR", "plafondIpJour", 30000),
    plafondOctetsIpJour: +val("LS_PLAFOND_OCTETS_IP_JOUR", "plafondOctetsIpJour", 15e6),
    // Pour tout le serveur.
    plafondOctetsJour: +val("LS_PLAFOND_OCTETS_JOUR", "plafondOctetsJour", 50e6),
    plafondLotsJour: +val("LS_PLAFOND_LOTS_JOUR", "plafondLotsJour", 300000),
    plafondDossierOctets: +val("LS_PLAFOND_DOSSIER", "plafondDossierOctets", 2e9),
    cookieSecure: secure !== "false" && secure !== "non"
  };
}
// Un dossier servi par Apache (public_html, www, htdocs) ne doit contenir ni les données ni la configuration.
const sousDossierPublic = p => path.resolve(p).split(path.sep).some(s => ["public_html", "www", "htdocs"].includes(s.toLowerCase()));

/* ---------- Liste blanche (générée depuis contenu/) ---------- */
function chargerListeBlanche(fichier) {
  const brut = JSON.parse(fs.readFileSync(fichier, "utf8"));
  const W = { tps: new Map(), cartes: new Set(), noeuds: new Set(), autres: new Set(brut.autres || []), empreinte: String(brut.empreinte || "") };
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
const MAX_TRANCHE_MS = 30 * 60000;     // une tranche de temps actif : 30 min au plus
const MAX_DUREE_MS = 6 * 3600000;      // durée jusqu'à un objectif ou à la fin d'un TP : 6 h au plus
const CHAMPS_LOT = new Set(["v", "lot", "envoi", "evs", "liste"]);
// Champs permis pour chaque événement : un champ inconnu fait refuser tout le lot.
const CHAMPS = {
  visite: ["retour", "niveau", "type", "os", "largeur"], page: ["p", "id"], temps: ["p", "id", "ms"], palier: ["m"],
  tp_debut: ["id", "faits", "deja"], tp_fin: ["id", "ms"], objectif: ["id", "i", "ms"], essai: ["id", "o", "i", "ok"],
  notion: ["noeud"], carte_finie: ["id"]
};
for (const k of Object.keys(CHAMPS)) CHAMPS[k] = new Set(["e", "t"].concat(CHAMPS[k]));
const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const champsConnus = (o, permis) => Object.keys(o).every(k => permis.has(k));
// Rend { lot, evs, heures, rejetes, liste } ou null (lot mal formé : 400). Les événements d'un type ou
// d'un identifiant inconnu sont comptés dans « rejetes » (signe d'une liste blanche pas à jour).
// L'heure de l'appareil (qui peut être fausse) est recalée grâce à son heure d'envoi ; elle ne sert qu'à
// l'heure des visites. Un événement gardé longtemps hors ligne est accepté : il va au jour de réception.
function valider(lot, maintenant, W) {
  if (!lot || typeof lot !== "object" || Array.isArray(lot) || lot.v !== 2 || !champsConnus(lot, CHAMPS_LOT)) return null;
  if (typeof lot.lot !== "string" || !/^[0-9a-f]{32}$/.test(lot.lot)) return null;
  if (!Array.isArray(lot.evs) || lot.evs.length === 0 || lot.evs.length > 300) return null;
  if (lot.liste !== undefined && (typeof lot.liste !== "string" || !/^[0-9a-f]{0,32}$/.test(lot.liste))) return null;
  for (const ev of lot.evs) {
    if (!ev || typeof ev !== "object" || Array.isArray(ev) || !entier(ev.t, 0, 1e11)) return null;
    if (CHAMPS[ev.e] && !champsConnus(ev, CHAMPS[ev.e])) return null;
  }
  const decalage = entier(lot.envoi, 0, 1e11) && Math.abs(maintenant - lot.envoi) > 60 ? maintenant - lot.envoi : 0;
  const evs = [], heures = [];
  let rejetes = 0;
  for (const ev of lot.evs) {
    const t = ev.t + decalage;
    const ms = entier(ev.ms, 0, MAX_DUREE_MS) ? ev.ms : null;
    const i = entier(ev.i, 0, 99) ? ev.i : null;
    const tp = tpConnu(W, ev.id);
    let x = null;
    switch (ev.e) {
      case "visite":
        if (RETOURS.has(ev.retour) && TYPES.has(ev.type) && SYSTEMES.has(ev.os) && LARGEURS.has(ev.largeur) && (ev.niveau === null || ev.niveau === undefined || entier(ev.niveau, 1, 4))) {
          x = { e: "visite", retour: ev.retour, niveau: entier(ev.niveau, 1, 4) ? ev.niveau : 0, type: ev.type, os: ev.os, largeur: ev.largeur };
          if (t <= maintenant + 300) heures.push(new Date(t * 1000).getUTCHours());
        }
        break;
      case "page": if (pageConnue(W, ev.p, ev.id)) x = { e: "page", p: ev.p, id: ev.id }; break;
      case "temps": if (pageConnue(W, ev.p, ev.id) && entier(ev.ms, 0, MAX_TRANCHE_MS)) x = { e: "temps", p: ev.p, id: ev.id, ms: ev.ms }; break;
      case "palier": if (PALIERS.has(ev.m)) x = { e: "palier", m: ev.m }; break;
      case "tp_debut":
        if (tp && (ev.deja === undefined || typeof ev.deja === "boolean")) {
          const faits = ev.faits === undefined ? [] : ev.faits;
          if (Array.isArray(faits) && faits.length <= tp.o && faits.every(f => entier(f, 0, tp.o - 1)) && new Set(faits).size === faits.length)
            x = { e: "tp_debut", id: ev.id, faits, deja: ev.deja === true };
        }
        break;
      case "tp_fin": if (tp) x = { e: "tp_fin", id: ev.id, ms }; break;
      case "objectif": if (tp && i !== null && i < tp.o) x = { e: "objectif", id: ev.id, i, ms }; break;
      case "essai":
        if (tp && i !== null && typeof ev.ok === "boolean" && ((ev.o === "o" && i < tp.o) || (ev.o === "q" && i < tp.q))) x = { e: "essai", id: ev.id, o: ev.o, i, ok: ev.ok };
        break;
      case "notion": if (typeof ev.noeud === "string" && W.noeuds.has(ev.noeud)) x = { e: "notion", noeud: ev.noeud }; break;
      case "carte_finie": if (W.cartes.has(ev.id)) x = { e: "carte_finie", id: ev.id }; break;
    }
    if (x) evs.push(x); else rejetes++;
  }
  return { lot: lot.lot, evs, heures, rejetes, liste: lot.liste };
}

/* ---------- Totaux d'un jour ---------- */
// Objets sans prototype et Object.hasOwn partout : une clé comme « constructor » reste une clé ordinaire.
const vide = () => Object.create(null);
const possede = Object.hasOwn || ((o, k) => Object.prototype.hasOwnProperty.call(o, k));
const MAX_CLES = 3000; // filet de sécurité : au-delà, les nouvelles clés d'une rubrique vont dans « (autres) »
const nouveauJour = () => Object.assign(vide(), { lots: 0, octets: 0, rejetes: 0, autreListe: 0,
  visites: Object.assign(vide(), { total: 0, retour: vide(), niveau: vide(), type: vide(), os: vide(), largeur: vide() }),
  paliers: vide(), pages: vide(), tps: vide(), objectifs: vide(), questions: vide(), notions: vide(), cartes: vide() });
// Forme attendue d'un fichier de totaux : « n » nombre, « m » objet de nombres, « mm » objet d'objets de nombres.
const FORME = { lots: "n", octets: "n", rejetes: "n", autreListe: "n", visites: { total: "n", retour: "m", niveau: "m", type: "m", os: "m", largeur: "m" },
  paliers: "m", pages: "mm", tps: "mm", objectifs: "mm", questions: "mm", notions: "m", cartes: "m" };
const FORME_MOIS = { heures: "m" };
function formeValide(o, forme) {
  const nombre = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const objet = v => v && typeof v === "object" && !Array.isArray(v);
  const ok = (v, f) => f === "n" ? nombre(v) : f === "m" ? objet(v) && Object.values(v).every(nombre)
    : f === "mm" ? objet(v) && Object.values(v).every(x => ok(x, "m")) : objet(v) && Object.keys(v).every(k => possede(f, k) && ok(v[k], f[k]));
  return ok(o, forme);
}
function cleRubrique(m, k) { return possede(m, k) || Object.keys(m).length < MAX_CLES ? k : "(autres)"; }
function ligne(m, k, init) { k = cleRubrique(m, String(k)); if (!possede(m, k)) m[k] = init(); return m[k]; }
function plus(m, k, n) { k = cleRubrique(m, String(k)); m[k] = (possede(m, k) ? m[k] : 0) + (n === undefined ? 1 : n); }
const nouvellePage = () => Object.assign(vide(), { vues: 0, ms: 0 });
const nouveauTP = () => Object.assign(vide(), { ouverts: 0, dejaTermines: 0, finis: 0, msFin: 0 });
const nouvelObjectif = () => Object.assign(vide(), { reussis: 0, ms: 0, essais: 0, rates: 0, dejaFaits: 0 });
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
    case "tp_debut": {
      const x = ligne(j.tps, ev.id, nouveauTP); x.ouverts++; if (ev.deja) x.dejaTermines++;
      // Objectifs déjà réussis sur cet appareil avant cette ouverture : retirés du dénominateur de leur taux.
      for (const f of ev.faits || []) ligne(j.objectifs, ev.id + "|" + f, nouvelObjectif).dejaFaits++;
      break;
    }
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

/* ---------- Périodes du calendrier (jamais de fenêtre glissante) ---------- */
const jourISO = d => d.toISOString().slice(0, 10);
// Semaines ISO (lundi-dimanche) et mois entièrement terminés avant aujourd'hui (UTC).
function periodesCloses(maintenantMs, nSemaines, nMois) {
  const auj = new Date(Math.floor(maintenantMs / 86400000) * 86400000), l = [];
  const lundi = new Date(auj.getTime() - ((auj.getUTCDay() + 6) % 7) * 86400000);
  for (let k = 1; k <= (nSemaines || 8); k++) {
    const debut = new Date(lundi.getTime() - k * 7 * 86400000), fin = new Date(debut.getTime() + 6 * 86400000);
    const jeudi = new Date(debut.getTime() + 3 * 86400000), an = jeudi.getUTCFullYear();
    const num = Math.floor((jeudi - Date.UTC(an, 0, 1)) / 86400000 / 7) + 1;
    l.push({ cle: "s" + an + "-W" + String(num).padStart(2, "0"), nom: "Semaine " + num + " de " + an + " (" + jourISO(debut) + " au " + jourISO(fin) + ")", debut: jourISO(debut), fin: jourISO(fin) });
  }
  for (let k = 1; k <= (nMois || 25); k++) {
    const d = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth() - k, 1)), f = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth() - k + 1, 0));
    l.push({ cle: "m" + jourISO(d).slice(0, 7), nom: "Mois " + jourISO(d).slice(0, 7), debut: jourISO(d), fin: jourISO(f), mois: jourISO(d).slice(0, 7) });
  }
  return l;
}

/* ---------- Seuil k et suppression complémentaire ---------- */
// Une liste de cases dont la somme est affichée (ou se déduit d'un total affiché) : on cache les cases
// sous k, puis, tant que la somme des cases cachées est entre 1 et k − 1 (donc retrouvable par
// soustraction), on cache aussi la plus petite case visible. Les cases cachées sont regroupées dans
// « autres (regroupés) », affiché seulement s'il atteint k.
function supprimer(entrees, k) {
  const vis = entrees.filter(([, n]) => n >= k).sort((a, b) => b[1] - a[1]);
  let cache = entrees.filter(([, n]) => n < k).reduce((s, [, n]) => s + n, 0);
  while (cache > 0 && cache < k && vis.length) cache += vis.pop()[1];
  return { visibles: vis, autres: cache >= k ? cache : 0, reste: cache };
}
// Une valeur secondaire v sur une base b (ex. TP terminés sur TP ouverts) : montrée seulement si v et
// b − v sont nuls ou au moins k (sinon v, ou b − v, désignerait moins de k visites).
const montrable = (v, b, k) => (v === 0 || v >= k) && (b - v === 0 || b - v >= k) && b >= k;

// Ce que montrent le tableau de bord et le CSV pour une période : rien d'autre ne sort du serveur.
function vuePeriode(P, k) {
  const t = P.total, V = t.visites.total, somme = (o, f) => Object.values(o).reduce((x, v) => x + f(v), 0);
  const vue = { k, visites: V >= k ? V : null, parJour: null, repartitions: {}, tranches: null, heures: null, pages: null, tps: [], objectifs: [], seTrompent: [], questions: [], notions: [], cartes: [] };
  if (V < k) return vue; // trop peu de visites : rien d'autre n'est montré
  // Visites par jour (leur somme est le total affiché).
  vue.parJour = supprimer(P.parJour.map(([j, d]) => [j, d.visites.total]), k);
  vue.parJour.visibles.sort((a, b) => a[0] < b[0] ? -1 : 1);
  for (const r of ["retour", "niveau", "type", "os", "largeur"]) vue.repartitions[r] = supprimer(Object.entries(t.visites[r]), k);
  // Durée de la visite : tranches entre paliers (jamais négatives : une visite à cheval sur minuit peut
  // avoir son palier compté le lendemain).
  const pal = m => (possede(t.paliers, m) ? t.paliers[m] : 0), pos = n => Math.max(0, n);
  vue.tranches = supprimer([["moins de 1 min", pos(V - pal(1))], ["1 à 5 min", pos(pal(1) - pal(5))], ["5 à 15 min", pos(pal(5) - pal(15))], ["15 à 30 min", pos(pal(15) - pal(30))], ["30 à 60 min", pos(pal(30) - pal(60))], ["plus de 60 min", pal(60)]], k);
  if (P.heures) vue.heures = supprimer(Object.entries(P.heures).map(([h, n]) => [+h, n]), k);
  // Pages : les vues des lignes montrées et « autres » font le total des vues, lui aussi montré.
  const vues = somme(t.pages, x => x.vues);
  vue.pagesVues = vues >= k ? vues : null;
  if (vue.pagesVues) {
    const s = supprimer(Object.entries(t.pages).map(([c, x]) => [c, x.vues]), k);
    vue.pages = { visibles: s.visibles.map(([c, n]) => [c, n, t.pages[c].ms]), autres: s.autres };
  }
  // TP : ouvertures (total montré), puis valeurs secondaires montrées seulement si montrables.
  const ouverts = somme(t.tps, x => x.ouverts);
  vue.tpOuverts = ouverts >= k ? ouverts : null;
  if (vue.tpOuverts) {
    const s = supprimer(Object.entries(t.tps).map(([c, x]) => [c, x.ouverts]), k);
    vue.tpAutres = s.autres;
    for (const [c] of s.visibles) {
      const x = t.tps[c], base = x.ouverts - x.dejaTermines;
      const baseOk = (x.dejaTermines === 0 || x.dejaTermines >= k) && base >= k;
      vue.tps.push({ id: c, ouverts: x.ouverts, base: baseOk ? base : null, finis: baseOk && montrable(x.finis, base, k) ? x.finis : null, msFin: x.finis >= k ? x.msFin / x.finis : null });
    }
  }
  const tpMontre = new Map(vue.tps.map(x => [x.id, x]));
  for (const [c, x] of Object.entries(t.objectifs)) {
    const [id, i] = c.split("|"), tp = tpMontre.get(id);
    // Taux de première réussite : réussites (premières sur cet appareil) sur les ouvertures où
    // l'objectif n'était pas déjà réussi sur cet appareil.
    if (tp) {
      const base = tp.ouverts - x.dejaFaits;
      if ((x.dejaFaits === 0 || x.dejaFaits >= k) && base >= k && montrable(x.reussis, base, k))
        vue.objectifs.push({ id, i: +i + 1, base, reussis: x.reussis, ms: x.reussis >= k ? x.ms / x.reussis : null });
    }
    if (x.essais >= k) vue.seTrompent.push({ id, i: +i + 1, essais: x.essais, rates: montrable(x.rates, x.essais, k) ? x.rates : null });
  }
  for (const [c, x] of Object.entries(t.questions)) {
    const n = x.justes + x.fausses;
    if (n >= k) vue.questions.push({ id: c.split("|")[0], i: +c.split("|")[1] + 1, reponses: n, fausses: montrable(x.fausses, n, k) ? x.fausses : null });
  }
  vue.objectifs.sort((a, b) => a.reussis / a.base - b.reussis / b.base);
  vue.seTrompent.sort((a, b) => (b.rates || 0) - (a.rates || 0) || b.essais - a.essais);
  vue.questions.sort((a, b) => (b.fausses || 0) - (a.fausses || 0) || b.reponses - a.reponses);
  vue.notions = Object.entries(t.notions).filter(x => x[1] >= k).sort((a, b) => b[1] - a[1]);
  vue.cartes = Object.entries(t.cartes).filter(x => x[1] >= k).sort((a, b) => b[1] - a[1]);
  return vue;
}
// Lignes du CSV : exactement ce que montre le tableau de bord (rubrique, clé, mesure, valeur).
function lignesCsv(vue) {
  const l = [];
  if (vue.visites === null) return [["visites", "", "total", "moins de " + vue.k]];
  l.push(["visites", "", "total", vue.visites]);
  const rep = (nom, s, mesure) => { for (const [c, n] of s.visibles) l.push([nom, c, mesure, n]); if (s.autres) l.push([nom, "(autres regroupés)", mesure, s.autres]); };
  rep("visites_par_jour", vue.parJour, "visites");
  for (const [r, s] of Object.entries(vue.repartitions)) rep("visites_" + r, s, "visites");
  rep("duree_visite", vue.tranches, "visites");
  if (vue.heures) rep("heure_visite_utc", vue.heures, "visites");
  if (vue.pages) { l.push(["pages", "", "vues_total", vue.pagesVues]); for (const [c, n, ms] of vue.pages.visibles) l.push(["pages", c, "vues", n], ["pages", c, "temps_ms", ms]); if (vue.pages.autres) l.push(["pages", "(autres regroupés)", "vues", vue.pages.autres]); }
  if (vue.tpOuverts) { l.push(["tps", "", "ouverts_total", vue.tpOuverts]); if (vue.tpAutres) l.push(["tps", "(autres regroupés)", "ouverts", vue.tpAutres]); }
  for (const x of vue.tps) { l.push(["tps", x.id, "ouverts", x.ouverts]); if (x.base !== null) l.push(["tps", x.id, "ouverts_sans_fin_anterieure", x.base]); if (x.finis !== null) l.push(["tps", x.id, "premieres_fins", x.finis]); }
  for (const x of vue.objectifs) l.push(["objectifs", x.id + "|" + x.i, "ouvertures_sans_reussite_anterieure", x.base], ["objectifs", x.id + "|" + x.i, "premieres_reussites", x.reussis]);
  for (const x of vue.seTrompent) { l.push(["objectifs", x.id + "|" + x.i, "essais", x.essais]); if (x.rates !== null) l.push(["objectifs", x.id + "|" + x.i, "essais_rates", x.rates]); }
  for (const x of vue.questions) { l.push(["questions", x.id + "|" + x.i, "reponses", x.reponses]); if (x.fausses !== null) l.push(["questions", x.id + "|" + x.i, "fausses", x.fausses]); }
  for (const [c, n] of vue.notions) l.push(["notions", c, "nombre", n]);
  for (const [c, n] of vue.cartes) l.push(["cartes", c, "nombre", n]);
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

module.exports = { valider, ajouterAuJour, additionner, nouveauJour, formeValide, FORME, supprimer, montrable, vuePeriode, lignesCsv, periodesCloses,
  prefixe64, chargerListeBlanche, secretValide, hashValide };

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
  // Un secret d'exemple, trop court ou sans hasard permettrait de fabriquer un cookie d'administrateur.
  if (!secretValide(CONFIG.secretSession)) refus("secretSession doit compter au moins 64 caractères hexadécimaux tirés au hasard (le texte d'exemple, ou une suite répétitive, n'est pas accepté).");
  let W, mtimeListe = 0, lectureListe = 0;
  try { W = chargerListeBlanche(CONFIG.listeBlanche); mtimeListe = fs.statSync(CONFIG.listeBlanche).mtimeMs; } catch (e) { refus("liste blanche illisible (" + CONFIG.listeBlanche + ") : " + e.message); }
  // La liste blanche est relue dès qu'elle change (recopiée après un ajout de contenu), sans redémarrer.
  function listeAJour() {
    if (Date.now() - lectureListe < 5000) return;
    lectureListe = Date.now();
    try {
      const m = fs.statSync(CONFIG.listeBlanche).mtimeMs;
      if (m !== mtimeListe) { W = chargerListeBlanche(CONFIG.listeBlanche); mtimeListe = m; console.error("journal : liste blanche relue (" + W.empreinte + ")"); }
    } catch (e) { console.error("journal : liste blanche illisible, l'ancienne est gardée : " + e.message); }
  }
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

  // Lecture d'un fichier de totaux. Absent : totaux vides. Illisible ou de forme inattendue : mis en
  // quarantaine (.corrompu-<date>) et erreur (le lot reçoit 503 et sera renvoyé) : jamais d'écrasement silencieux.
  function lireTotaux(p, init, forme) {
    let texte;
    try { texte = fs.readFileSync(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return init(); throw e; }
    let brut = null;
    try { brut = JSON.parse(texte); } catch (e) { brut = null; }
    if (brut && formeValide(brut, forme)) return additionner(init(), brut);
    const q = p + ".corrompu-" + Date.now();
    try { fs.renameSync(p, q); } catch (x) { /* déjà déplacé par un autre processus */ }
    console.error("journal : fichier illisible mis en quarantaine : " + path.basename(q));
    const err = new Error("fichier de totaux illisible"); err.quarantaine = true; throw err;
  }
  function ecrireTotaux(p, donnees) {
    const tmp = p + ".tmp" + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(donnees), { mode: 0o600 });
    fs.renameSync(tmp, p);
  }
  const fichierJour = j => path.join(AGG, j + ".json"), fichierMois = m => path.join(AGG, "mois-" + m + ".json");
  const VERROU = path.join(CONFIG.dossierDonnees, ".verrou");

  // Verrou entre processus : création exclusive d'un fichier contenant un jeton ; attente asynchrone ;
  // le verrou n'est retiré que par son propriétaire (même jeton). Un verrou abandonné (> 10 s) est
  // repris en le RENOMMANT vers un nom unique : un seul processus réussit ce renommage. Si le fichier
  // renommé n'est pas celui qu'on croyait abandonné (un autre processus venait de prendre le verrou), il
  // est remis en place aussitôt.
  async function avecVerrou(fn) {
    const jeton = crypto.randomBytes(16).toString("hex"), debut = Date.now();
    for (;;) {
      try { fs.writeFileSync(VERROU, jeton, { flag: "wx", mode: 0o600 }); break; }
      catch (e) {
        if (e.code !== "EEXIST") throw e;
        let ancien = null;
        try { ancien = fs.readFileSync(VERROU, "utf8"); } catch (x) { continue; }
        let perime = false;
        try { perime = Date.now() - fs.statSync(VERROU).mtimeMs > 10000; } catch (x) { continue; }
        if (perime) {
          const pris = VERROU + ".repris-" + crypto.randomBytes(8).toString("hex");
          try { fs.renameSync(VERROU, pris); } catch (x) { continue; } // un autre processus l'a repris avant
          let contenu = null;
          try { contenu = fs.readFileSync(pris, "utf8"); } catch (x) { /* rien */ }
          if (contenu === ancien) { try { fs.unlinkSync(pris); } catch (x) { /* rien */ } console.error("journal : verrou abandonné repris"); }
          else { try { fs.linkSync(pris, VERROU); } catch (x) { /* un troisième l'a pris */ } try { fs.unlinkSync(pris); } catch (x) { /* rien */ } }
          continue;
        }
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
  const GARDE_IDS = 31 * 86400;
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
  // réception) + identifiant du lot, sous verrou. « octets » = taille des événements VALIDÉS (pas du
  // corps reçu). Rend "deja", une raison de refus (plafond), ou null.
  function enregistrer(lot, octets) {
    return avecVerrou(() => {
      rafraichirIds();
      if (lotsVus.has(lot.lot)) return "deja";
      const auj = jour(maintenantS()), totaux = lireTotaux(fichierJour(auj), nouveauJour, FORME);
      if (totaux.octets + octets > CONFIG.plafondOctetsJour) return "octets du jour";
      if (totaux.lots >= CONFIG.plafondLotsJour) return "lots du jour";
      if (tailleDossier() + octets > CONFIG.plafondDossierOctets) return "taille du dossier";
      for (const ev of lot.evs) ajouterAuJour(totaux, ev);
      totaux.lots++; totaux.octets += octets; totaux.rejetes += lot.rejetes;
      if (lot.liste !== undefined && lot.liste !== W.empreinte) totaux.autreListe++;
      if (lot.heures.length) {
        const mois = lireTotaux(fichierMois(auj.slice(0, 7)), () => Object.assign(vide(), { heures: vide() }), FORME_MOIS);
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
  // Seulement des événements refusés : compte gardé pour l'alerte « liste blanche pas à jour », rien d'autre.
  function noterRejets(n, liste) {
    return avecVerrou(() => {
      const auj = jour(maintenantS()), totaux = lireTotaux(fichierJour(auj), nouveauJour, FORME);
      totaux.rejetes += n;
      if (liste !== undefined && liste !== W.empreinte) totaux.autreListe++;
      ecrireTotaux(fichierJour(auj), totaux);
    });
  }

  /* --- Purge (sous verrou) : totaux au-delà de la conservation, identifiants de lots au-delà de 31 jours,
     fichiers en quarantaine selon la même conservation, fichiers temporaires abandonnés (> 1 h) --- */
  function purger() {
    const limite = jour(maintenantS() - CONFIG.conservationJours * 86400), limiteIds = jour(maintenantS() - GARDE_IDS);
    let n = 0;
    for (const f of fichiers(AGG, JOURS)) if (f.slice(0, 10) < limite) { fs.unlinkSync(path.join(AGG, f)); n++; }
    for (const f of fichiers(AGG, MOIS)) if (f.slice(5, 12) < limite.slice(0, 7)) fs.unlinkSync(path.join(AGG, f));
    for (const f of fs.readdirSync(AGG)) {
      const q = /\.corrompu-(\d+)$/.exec(f), p = path.join(AGG, f);
      if (q && +q[1] < Date.now() - CONFIG.conservationJours * 86400000) fs.unlinkSync(p);
      else if (/\.tmp\d+$/.test(f)) { try { if (Date.now() - fs.statSync(p).mtimeMs > 3600000) fs.unlinkSync(p); } catch (e) { /* rien */ } }
    }
    for (const f of fichiers(IDS, IDS_F)) if (f.slice(0, 10) < limiteIds) { fs.unlinkSync(path.join(IDS, f)); lus.delete(f); }
    for (const [id, j] of lotsVus) if (j < limiteIds) lotsVus.delete(id);
    version++; tailleDossierCache.t = 0;
    return n;
  }
  const purgerSousVerrou = () => avecVerrou(purger).catch(e => console.error("purge :", e.message));
  purgerSousVerrou();
  setInterval(purgerSousVerrou, 24 * 3600 * 1000).unref();

  /* --- Limites par adresse (en mémoire, seulement si l'adresse est fiable) ---
     Les compteurs par 10 min sont effacés toutes les 10 min ; ceux du jour, à minuit UTC. */
  const empreinte = adr => crypto.createHmac("sha256", SEL_MEMOIRE).update(adr).digest("hex").slice(0, 24);
  let fenetre10 = -1, compteurs10 = new Map(), jourIp = "", compteursJour = new Map();
  function compteurs(fp) {
    const f = Math.floor(Date.now() / 600000), j = jour(maintenantS());
    if (f !== fenetre10) { fenetre10 = f; compteurs10 = new Map(); }
    if (j !== jourIp) { jourIp = j; compteursJour = new Map(); }
    if (!compteursJour.has(fp)) compteursJour.set(fp, { lots: 0, octets: 0 });
    return { dix: compteurs10, jour: compteursJour.get(fp) };
  }
  function tropDeLots(fp) {
    const c = compteurs(fp), n = (c.dix.get(fp) || 0) + 1;
    c.dix.set(fp, n); c.jour.lots++;
    return n > CONFIG.limiteLots10min || c.jour.lots > CONFIG.plafondIpJour || c.jour.octets > CONFIG.plafondOctetsIpJour;
  }
  const ajouterOctetsAdresse = (fp, octets) => { compteurs(fp).jour.octets += octets; };

  /* --- Totaux d'une période close du calendrier, petit cache --- */
  let cache = { cle: "", valeur: null, t: 0 };
  function periode(p) {
    const cle = p.cle + ":" + version;
    if (cache.cle === cle && Date.now() - cache.t < 60000) return cache.valeur;
    const parJour = [], alertes = [], total = nouveauJour();
    for (const f of fichiers(AGG, JOURS)) {
      const j = f.slice(0, 10);
      if (j < p.debut || j > p.fin) continue;
      try { const d = lireTotaux(path.join(AGG, f), nouveauJour, FORME); additionner(total, d); parJour.push([j, d]); }
      catch (e) { alertes.push("Le jour " + j + " était illisible : mis en quarantaine, non compté."); }
    }
    let heures = null;
    if (p.mois) {
      try { heures = lireTotaux(fichierMois(p.mois), () => Object.assign(vide(), { heures: vide() }), FORME_MOIS).heures; }
      catch (e) { alertes.push("Le profil horaire de " + p.mois + " était illisible."); }
    }
    cache = { cle, valeur: { p, total, parJour, heures, alertes }, t: Date.now() };
    return cache.valeur;
  }
  // Alertes de fonctionnement (pas des statistiques) : 7 derniers jours, jour en cours compris.
  function alertesFonctionnement() {
    const l = [], depuis = jour(maintenantS() - 7 * 86400);
    let rejetes = 0, autreListe = 0;
    for (const f of fichiers(AGG, JOURS)) {
      if (f.slice(0, 10) < depuis) continue;
      try { const d = lireTotaux(path.join(AGG, f), nouveauJour, FORME); rejetes += d.rejetes; autreListe += d.autreListe; } catch (e) { /* signalé ailleurs */ }
    }
    if (rejetes) l.push(rejetes + " événement(s) refusé(s) ces 7 derniers jours (identifiant inconnu) : la liste blanche du serveur n'est peut-être pas à jour (voir docs/JOURNAL.md).");
    if (autreListe) l.push(autreListe + " lot(s) envoyé(s) par une version du site différente de la liste blanche du serveur (" + (W.empreinte || "sans empreinte") + ") : recopier serveur/liste-blanche.json.");
    for (const f of fs.readdirSync(AGG)) if (/\.corrompu-/.test(f)) l.push("Fichier en quarantaine : " + f + " (à examiner à la main).");
    return l;
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
  // Essais de connexion ratés : par empreinte d'adresse, en mémoire (effacés au bout d'une heure),
  // délai croissant (pas de blocage global).
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
  const MASQUE = "masqué";
  const ou = v => v === null || v === undefined ? MASQUE : v;
  const pc = (x, y) => x === null || y === null || !y ? MASQUE : Math.min(100, Math.round(100 * x / y)) + " %";
  function pageHtml(titre, corps) {
    return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>" + echap(titre) + "</title><style>" +
      "body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#eef1ec;color:#17221c}main{max-width:1100px;margin:0 auto;padding:16px}h1{font-size:1.6rem;margin:.2em 0}" +
      "h2{font-size:1.2rem;margin:1.6em 0 .4em;border-bottom:2px solid #17221c}h3{font-size:1rem;margin:1em 0 .3em}table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #cdd6cb}th{background:#e2e8df}" +
      "td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.chiffres{display:flex;gap:28px;flex-wrap:wrap}.chiffres div{font-size:2rem;font-weight:700}.chiffres span{display:block;font-size:.85rem;font-weight:400;color:#55635a}" +
      "form.ligne{display:inline-flex;gap:8px;align-items:center;margin:4px 8px 4px 0;flex-wrap:wrap}button,input,select{font:inherit;padding:8px 12px;min-height:44px}button{cursor:pointer}.alerte{color:#c3352a;font-weight:700}.tableau{overflow-x:auto}" +
      ".colonnes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 24px}.note{color:#55635a;font-size:.9rem}" +
      "dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}dt{font-weight:700}" +
      "</style></head><body><main>" + corps + "</main></body></html>";
  }
  function tableau(entetes, numeriques, lignes, vide_) {
    if (!lignes.length) return "<p class=\"note\">" + (vide_ || "Rien à montrer au-dessus du seuil.") + "</p>";
    return "<div class=\"tableau\"><table><thead><tr>" + entetes.map((e, k) => "<th" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(e) + "</th>").join("") + "</tr></thead><tbody>" +
      lignes.map(l => "<tr>" + l.map((v, k) => "<td" + (numeriques[k] ? " class=\"n\"" : "") + ">" + echap(v) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }
  // Une liste après suppression complémentaire : cases montrées, puis « autres (regroupés) ».
  function liste(titre, s, noms, entete) {
    if (!s) return "";
    const lignes = s.visibles.map(([c, n]) => [(noms && noms[c]) || c, n]);
    if (s.autres) lignes.push(["autres (regroupés)", s.autres]);
    return "<div><h3>" + echap(titre) + "</h3>" + tableau(["", entete || "Visites"], [0, 1], lignes) + "</div>";
  }
  // Cellule CSV : guillemets doublés, et apostrophe devant = + - @ (formules des tableurs).
  const celluleCsv = v => { let s = v === undefined || v === null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

  /* --- HTTP --- */
  const MAX_CORPS = 16 * 1024;
  function lireCorps(req, max) {
    return new Promise((ok, ko) => {
      const morceaux = []; let n = 0;
      req.on("data", x => { n += x.length; if (n > max) { ko(new Error("trop gros")); req.destroy(); } else morceaux.push(x); });
      req.on("end", () => ok(Buffer.concat(morceaux).toString("utf8")));
      req.on("error", ko);
    });
  }
  function repondre(res, code, corps, entetes) {
    if (res.headersSent || res.destroyed) return;
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
    listeAJour();

    /* Réception du journal */
    if (chemin === "/journal") {
      const cors = origine && origineOk ? { "Access-Control-Allow-Origin": origine, "Vary": "Origin" } : {};
      if (req.method === "OPTIONS") return repondre(res, origineOk ? 204 : 403, "", Object.assign(cors, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" }));
      if (req.method !== "POST") return repondre(res, 405, "", { Allow: "POST" });
      if (!origineOk) return repondre(res, 403);
      // Sans identifiant d'appareil, les limites se font par adresse (en mémoire), si elle est fiable.
      const fp = client.fiable ? empreinte(client.adr) : null;
      if (fp && tropDeLots(fp)) return repondre(res, 429, "", Object.assign(cors, { "Retry-After": "600" }));
      let corps;
      try { corps = await lireCorps(req, MAX_CORPS); } catch (e) { return repondre(res, 413, "", cors); }
      let lot;
      try { lot = valider(JSON.parse(corps), maintenantS(), W); } catch (e) { lot = null; }
      if (!lot) return repondre(res, 400, "", cors);
      try {
        // Rien de valable : seul le nombre de refus est gardé (alerte « liste pas à jour ») ; rien d'autre.
        if (!lot.evs.length) { if (lot.rejetes) await noterRejets(lot.rejetes, lot.liste); return repondre(res, 204, "", cors); }
        const octets = Buffer.byteLength(JSON.stringify(lot.evs)) + 40;
        if (fp) ajouterOctetsAdresse(fp, octets);
        const raison = await enregistrer(lot, octets);
        if (raison && raison !== "deja") { console.error("journal : plafond atteint (" + raison + "), lot refusé"); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "3600" })); }
      } catch (e) { console.error("journal :", e.message); return repondre(res, 503, "", Object.assign(cors, { "Retry-After": "60" })); }
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
    // Seules des périodes closes du calendrier sont proposées (pas de fenêtre glissante).
    const periodes = periodesCloses(Date.now());
    const choisie = periodes.find(p => p.cle === parametres.get("p")) || periodes[0];

    if (route === "/export.csv") {
      const lignes = ["﻿periode;rubrique;cle;mesure;valeur"];
      for (const l of lignesCsv(vuePeriode(periode(choisie), K))) lignes.push([choisie.cle].concat(l).map(celluleCsv).join(";"));
      return repondre(res, 200, lignes.join("\n") + "\n", { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"journal-" + choisie.cle + ".csv\"" });
    }
    if (route === "/diagnostic") return repondre(res, 200, pageDiagnostic(), ENTETES_ADMIN);
    let message = "";
    if (route === "/purger" && req.method === "POST") {
      const quoi = formulaire.get("quoi");
      if (!csrfOk) message = "Session expirée : recharge la page.";
      else if (quoi === "tout" && formulaire.get("confirmer") === "EFFACER") {
        // Tout : totaux, profils horaires, fichiers en quarantaine et temporaires.
        await avecVerrou(() => { for (const f of fs.readdirSync(AGG)) fs.unlinkSync(path.join(AGG, f)); });
        version++; tailleDossierCache.t = 0;
        message = "Tous les totaux ont été effacés.";
      } else if (quoi === "anciens") message = (await avecVerrou(purger)) + " jour(s) de plus de " + CONFIG.conservationJours + " jours effacé(s).";
      else message = "Pour tout effacer, tape EFFACER dans la case.";
    }
    return repondre(res, 200, pageTableau(s, periodes, choisie, message), ENTETES_ADMIN);

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
        "<dt>X-Forwarded-Proto</dt><dd>" + echap(req.headers["x-forwarded-proto"] || "absent") + "</dd>" +
        "<dt>Liste blanche</dt><dd>" + echap(W.empreinte || "sans empreinte") + "</dd></dl>" +
        "<p>Compare la dernière entrée avec le début de ton adresse publique : elles doivent correspondre. Sinon, la limite par adresse ne vise pas le bon client ; voir docs/JOURNAL.md.</p>" +
        "<p><a href=\"" + echap(BASE_ADMIN) + "\">Retour au tableau de bord</a></p>");
    }
    function pageTableau(sess, periodes_, p, msg) {
      const P = periode(p), v = vuePeriode(P, K), b = echap(BASE_ADMIN), jeton = "<input type=\"hidden\" name=\"csrf\" value=\"" + echap(sess.csrf) + "\">";
      const options = periodes_.map(x => "<option value=\"" + x.cle + "\"" + (x.cle === p.cle ? " selected" : "") + ">" + echap(x.nom) + "</option>").join("");
      const NIV = { 0: "non choisi", 1: "Primaire", 2: "Collège", 3: "Lycée", 4: "Avancé" };
      const RET = { meme_jour: "revenu le même jour", moins7: "revenu en moins de 7 jours", "7a30": "revenu entre 7 et 30 jours", plus30: "revenu après plus de 30 jours", premiere: "première visite (ou date effacée)" };
      const alertes = P.alertes.concat(alertesFonctionnement());
      return pageHtml("Journal d'utilisation", "<h1>Journal d'utilisation</h1>" +
        "<p class=\"note\">Statistiques agrégées sur une semaine ou un mois terminés. Les jours sont des <strong>jours de réception</strong> (UTC) : un événement gardé hors ligne compte le jour où il arrive. Aucune case ne montre moins de " + K + " ; d'autres cases sont regroupées dans « autres » ou masquées quand une soustraction permettrait de retrouver un petit nombre.</p>" +
        alertes.map(x => "<p class=\"alerte\">" + echap(x) + "</p>").join("") + (msg ? "<p class=\"alerte\">" + echap(msg) + "</p>" : "") +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "\"><label>Période <select name=\"p\">" + options + "</select></label><button>Afficher</button></form>" +
        "<form class=\"ligne\" method=\"get\" action=\"" + b + "/export.csv\"><input type=\"hidden\" name=\"p\" value=\"" + echap(p.cle) + "\"><button>Exporter (CSV)</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/deconnexion\">" + jeton + "<button>Se déconnecter</button></form>" +
        (v.visites === null ? "<p class=\"note\">Moins de " + K + " visites sur cette période : rien n'est montré.</p>" :
        "<div class=\"chiffres\"><div>" + v.visites + "<span>visites</span></div><div>" + echap(ou(v.pagesVues)) + "<span>pages vues</span></div><div>" + echap(ou(v.tpOuverts)) + "<span>TP ouverts</span></div></div>" +
        "<h2>Visites</h2><div class=\"colonnes\">" + liste("Par jour de réception", v.parJour) + liste("Retour", v.repartitions.retour, RET) + liste("Niveau choisi", v.repartitions.niveau, NIV) +
        liste("Type d'appareil", v.repartitions.type) + liste("Système", v.repartitions.os) + liste("Largeur d'écran (px)", v.repartitions.largeur) + liste("Durée active de la visite", v.tranches) +
        (v.heures ? liste("Heure (UTC, heure de Bamako)", { visibles: v.heures.visibles.map(([h, n]) => [h + " h-" + (h + 1) + " h", n]), autres: v.heures.autres }) : "<div><h3>Heure</h3><p class=\"note\">Seulement sur un mois entier.</p></div>") + "</div>" +
        "<h2>Pages les plus consultées</h2>" + (v.pages ? tableau(["Page", "Vues", "Temps actif total", "Temps moyen par vue"], [0, 1, 1, 1],
          v.pages.visibles.slice(0, 40).map(([c, n, ms]) => [c, n, duree(ms), duree(ms / n)]).concat(v.pages.autres ? [["autres (regroupés)", v.pages.autres, "", ""]] : [])) : "<p class=\"note\">Rien à montrer.</p>") +
        "<h2>TP</h2><p class=\"note\">Ouvertures comptées une fois par visite. « Premières fins » : le TP a été terminé pour la première fois sur cet appareil pendant la visite ; le taux est rapporté aux ouvertures où il n'était pas déjà terminé sur cet appareil.</p>" +
        tableau(["TP", "Ouvertures", "Ouvertures sans fin antérieure", "Premières fins", "Taux", "Durée moyenne jusqu'à la fin"], [0, 1, 1, 1, 1, 1],
          v.tps.map(x => [x.id, x.ouverts, ou(x.base), ou(x.finis), pc(x.finis, x.base), x.msFin === null ? MASQUE : duree(x.msFin)]).concat(v.tpAutres ? [["autres (regroupés)", v.tpAutres, "", "", "", ""]] : [])) +
        "<h2>Objectifs : où les élèves bloquent (première réussite sur cet appareil)</h2><p class=\"note\">Premières réussites de l'objectif sur cet appareil, rapportées aux ouvertures de la même variante du TP où il n'était pas déjà réussi sur cet appareil (le plus bas en premier).</p>" +
        tableau(["TP", "Objectif", "Ouvertures sans réussite antérieure", "Premières réussites", "Taux", "Temps moyen pour réussir"], [0, 1, 1, 1, 1, 1],
          v.objectifs.slice(0, 40).map(x => [x.id, x.i, x.base, x.reussis, pc(x.reussis, x.base), x.ms === null ? MASQUE : duree(x.ms)])) +
        "<h2>Où les élèves se trompent : objectifs à réponse écrite</h2><p class=\"note\">Les essais ne concernent que les objectifs à réponse écrite (les objectifs atteints en manipulant la simulation n'ont pas d'essai raté).</p>" +
        tableau(["TP", "Objectif", "Essais", "Essais ratés", "Part ratée"], [0, 1, 1, 1, 1], v.seTrompent.slice(0, 40).map(x => [x.id, x.i, x.essais, ou(x.rates), pc(x.rates, x.essais)])) +
        "<h2>Questions de quiz</h2>" + tableau(["TP", "Question", "Réponses", "Réponses fausses", "Part fausse"], [0, 1, 1, 1, 1], v.questions.slice(0, 40).map(x => [x.id, x.i, x.reponses, ou(x.fausses), pc(x.fausses, x.reponses)])) +
        "<div class=\"colonnes\"><div><h2>Notions comprises</h2>" + tableau(["Carte / notion", "Fois"], [0, 1], v.notions.slice(0, 30)) + "</div>" +
        "<div><h2>Cartes terminées</h2>" + tableau(["Carte", "Fois"], [0, 1], v.cartes.slice(0, 30)) + "</div></div>") +
        "<h2>Purge</h2><form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"anciens\">" + jeton + "<button>Effacer les jours de plus de " + CONFIG.conservationJours + " jours</button></form>" +
        "<form class=\"ligne\" method=\"post\" action=\"" + b + "/purger\"><input type=\"hidden\" name=\"quoi\" value=\"tout\">" + jeton + "<label>Tout effacer : tape EFFACER <input name=\"confirmer\" autocomplete=\"off\" size=\"9\"></label><button>Tout effacer</button></form>" +
        "<p><a href=\"" + b + "/diagnostic\">Diagnostic du proxy et de la liste blanche</a></p>" +
        "<p class=\"note\">Totaux par jour de réception, gardés " + CONFIG.conservationJours + " jours ; heure des visites seulement par mois. Aucun identifiant d'appareil ni de visite, aucune adresse IP.</p>");
    }
  }

  const serveur = http.createServer((req, res) => {
    traiter(req, res).catch(err => { console.error("journal :", err && err.message); if (!res.headersSent) repondre(res, 500); else res.end(); });
  });
  serveur.listen(process.env.PORT || 3000, () => console.log("Journal Learn Space à l'écoute sur le port " + serveur.address().port));
}
