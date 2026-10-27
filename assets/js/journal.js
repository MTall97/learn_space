/* Journal d'utilisation ANONYME : le serveur ne reçoit que des événements sans identifiant et n'en
   garde que des totaux par jour (pages vues, temps, TP ouverts et terminés, objectifs réussis, essais
   ratés, questions, notions, visites par catégorie).
   - Aucun numéro d'appareil. Un numéro de VISITE, tiré au hasard, vit dans sessionStorage (perdu à la
     fermeture de l'onglet, renouvelé après 30 min sans activité) et ne quitte jamais le navigateur : il
     sert seulement à savoir ici ce qui appartient à la même visite (TP déjà compté, durée de la visite).
   - localStorage ne garde que des réglages et la file d'attente : la date (au jour) de la dernière
     visite, qui n'est jamais envoyée (seule sa catégorie part : première, moins de 7 j, 7 à 30 j, plus
     de 30 j), l'opposition, l'information déjà lue, et les événements pas encore envoyés.
   - Désactivé tant que LS.JOURNAL_URL est vide (assets/js/config-journal.js) et en file:// : rien n'est
     alors noté ni affiché. Opposition dans confidentialite.html (file vidée, plus rien n'est noté).
   - Aucune perte : les événements attendent dans le navigateur (hors ligne compris) ; un lot envoyé
     garde un identifiant de lot aléatoire et reste en attente tant que le serveur n'a pas répondu ; le
     serveur ignore un lot déjà reçu. Entre deux onglets, l'envoi passe par navigator.locks s'il existe.
   Fonctions pures exposées dans LS.journal pour les tests (tests/journal.test.js). */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  const MAX_FILE = 3000;              // au-delà (des semaines hors ligne), les plus anciens partent
  const TAILLE_LOT = 200;
  const PAUSE_MS = 60000;             // sans interaction pendant 60 s, le temps ne compte plus
  const TICK_MS = 5000;
  const FIN_VISITE_MS = 30 * 60000;   // 30 min sans activité : nouvelle visite
  const PALIERS = [1, 5, 15, 30, 60]; // durée active de la visite, en minutes
  const PREFIXE = "learnspace:";
  const stockage = nom => ({
    lire: (k, d) => { try { const v = window[nom].getItem(PREFIXE + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    ecrire: (k, v) => { try { window[nom].setItem(PREFIXE + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    effacer: k => { try { window[nom].removeItem(PREFIXE + k); } catch (e) { /* ignoré */ } }
  });
  const local = stockage("localStorage");
  const lire = local.lire, ecrire = local.ecrire;

  /* ---------- Fonctions pures ---------- */
  // Catégorie d'appareil grossière : type, famille de système, tranche de largeur d'écran. Une
  // combinaison type + système peu courante est simplifiée (système « autre »).
  const COURANTS = ["telephone android", "telephone ios", "tablette android", "tablette ios", "ordinateur windows", "ordinateur macos", "ordinateur linux", "ordinateur chromeos"];
  function categorieAppareil(ua, largeur, pointsTactiles) {
    ua = String(ua || "");
    const tactile = (pointsTactiles || 0) > 0;
    let type = "ordinateur";
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && tactile)) type = "tablette";
    else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) type = "telephone";
    else if (tactile && largeur && largeur < 600) type = "telephone";
    let os = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && tactile) ? "ios"
      : /CrOS/i.test(ua) ? "chromeos" : /Windows/i.test(ua) ? "windows" : /Macintosh|Mac OS X/i.test(ua) ? "macos" : /Linux/i.test(ua) ? "linux" : "autre";
    if (!COURANTS.includes(type + " " + os)) os = "autre";
    const l = largeur || 0;
    return { type, os, largeur: l < 400 ? "<400" : l < 600 ? "400-599" : l < 900 ? "600-899" : l < 1280 ? "900-1279" : "1280+" };
  }
  // Catégorie de retour à partir de la date de la dernière visite (« AAAA-MM-JJ », jamais envoyée).
  function categorieRetour(derniere, aujourdhui) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(derniere || "")) return "premiere";
    const jours = Math.round((Date.parse(aujourdhui) - Date.parse(derniere)) / 86400000);
    return jours < 7 ? "moins7" : jours <= 30 ? "7a30" : "plus30";
  }
  // Paliers de durée active franchis en passant de avantMs à apresMs.
  const paliersFranchis = (avantMs, apresMs) => PALIERS.filter(m => avantMs < m * 60000 && apresMs >= m * 60000);
  // Ajoute un événement à une file bornée (on garde les plus récents). Opposition : rien n'est gardé.
  // Deux tranches de temps de suite sur la même page sont fusionnées (file plus légère).
  function ajouterFile(file, ev, opposition, max) {
    if (opposition) return [];
    const f = (file || []).slice(), der = f[f.length - 1];
    if (ev.e === "temps" && der && der.e === "temps" && der.p === ev.p && der.id === ev.id) f[f.length - 1] = Object.assign({}, der, { ms: der.ms + ev.ms });
    else f.push(ev);
    return f.length > (max || MAX_FILE) ? f.slice(f.length - (max || MAX_FILE)) : f;
  }
  // Prochain envoi : le premier lot en attente de confirmation (même identifiant), sinon un nouveau lot.
  function prochainLot(file, lots, nouvelId, taille) {
    file = file || []; lots = lots || [];
    if (lots.length) return { lot: lots[0], file, lots };
    if (!file.length) return { lot: null, file, lots };
    const n = taille || TAILLE_LOT, lot = { id: nouvelId(), evs: file.slice(0, n) };
    return { lot, file: file.slice(n), lots: [lot] };
  }
  // Temps actif : on ajoute l'écart depuis le dernier tic seulement si la page est visible et si la
  // dernière interaction date de moins de 60 s (et jamais plus de deux intervalles à la fois).
  function tic(etat, maintenant, visible) {
    const ecart = Math.max(0, maintenant - etat.dernierTic);
    const actif = visible && maintenant - etat.derniereInteraction < PAUSE_MS;
    return Object.assign({}, etat, { dernierTic: maintenant, actifMs: etat.actifMs + (actif ? Math.min(ecart, 2 * TICK_MS) : 0) });
  }
  // Type et identifiant de la page à partir de l'adresse.
  function pageDe(chemin, recherche) {
    const id = (new URLSearchParams(recherche || "").get("id") || "").slice(0, 64);
    if (/tp\.html$/.test(chemin)) return { p: "tp", id };
    if (/carte\.html$/.test(chemin)) return { p: "carte", id };
    if (/(^|\/)(index\.html)?$/.test(chemin)) return { p: "accueil", id: "" };
    return { p: "autre", id: (chemin.split("/").pop() || "").replace(/\.html$/, "").slice(0, 64) };
  }
  // Traduit un gain du jeu (clé du registre) en événement du journal. Les questions viennent de
  // « ls:essai » (réussies et ratées), la fin de TP de « ls:tp-termine ».
  function evenementDeGain(cle, t) {
    const m = /^(n|o|q|tp|carte):(.+)$/.exec(cle || "");
    if (!m) return null;
    if (m[1] === "n") return { t, e: "notion", noeud: m[2].slice(0, 160) };
    if (m[1] === "carte") return { t, e: "carte_finie", id: m[2].slice(0, 64) };
    if (m[1] !== "o") return null;
    const k = m[2].lastIndexOf(":");
    return { t, e: "objectif", id: m[2].slice(0, k).slice(0, 64), i: +m[2].slice(k + 1) || 0 };
  }
  function nouvelIdentifiant() {
    const o = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(o);
    else for (let i = 0; i < 16; i++) o[i] = Math.floor(Math.random() * 256);
    return Array.from(o, x => x.toString(16).padStart(2, "0")).join("");
  }
  const jourLocal = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  LS.journal = { categorieAppareil, categorieRetour, paliersFranchis, ajouterFile, prochainLot, tic, pageDe, evenementDeGain, nouvelIdentifiant, MAX_FILE, PAUSE_MS, FIN_VISITE_MS };

  if (typeof document === "undefined" || !document.addEventListener || typeof location === "undefined") return;

  /* ---------- État dans le navigateur ---------- */
  const enLigne = /^https?:$/.test(location.protocol);
  const J = LS.journal;
  const session = stockage("sessionStorage");
  let visiteMemoire = null; // si sessionStorage est refusé, la visite vit seulement dans la page
  J.configure = () => enLigne && typeof LS.JOURNAL_URL === "string" && LS.JOURNAL_URL !== "";
  J.oppose = () => lire("journalConsentement", null) === "non";
  J.actif = () => J.configure() && !J.oppose();
  // Restes d'une version précédente (numéro d'appareil persistant) : effacés.
  ["journalAppareil", "journalAppareilCree", "journalAppareilAncien"].forEach(local.effacer);
  // La file est écrite en gérant le quota du navigateur : si elle ne tient pas, on garde la moitié la plus récente.
  function ecrireFile(f) {
    while (!ecrire("journalFile", f)) { if (!f.length) return; f = f.slice(Math.ceil(f.length / 2)); }
  }
  function ajouter(ev) {
    ev.t = ev.t || Math.round(Date.now() / 1000);
    ecrireFile(ajouterFile(lire("journalFile", []), ev, false));
  }
  // Visite en cours (sessionStorage seulement). Une nouvelle visite note l'événement « visite » avec sa
  // catégorie de retour, le niveau et la catégorie d'appareil ; la date du jour remplace l'ancienne.
  function visite() {
    const maintenant = Date.now();
    let v = session.lire("journalVisite", null) || visiteMemoire;
    if (!v || !/^[0-9a-f]{32}$/.test(v.id || "") || maintenant - v.dernier > FIN_VISITE_MS) {
      const aujourdhui = jourLocal(new Date(maintenant));
      v = { id: nouvelIdentifiant(), dernier: maintenant, actifMs: 0, tps: [] };
      const n = LS.profil && LS.profil().niveau ? LS.profil().niveau : null;
      ajouter(Object.assign({ e: "visite", retour: categorieRetour(lire("journalDerniereVisite", null), aujourdhui), niveau: n },
        categorieAppareil(navigator.userAgent, screen.width, navigator.maxTouchPoints)));
      ecrire("journalDerniereVisite", aujourdhui);
    }
    v.dernier = maintenant;
    if (!session.ecrire("journalVisite", v)) visiteMemoire = v;
    return v;
  }
  function majVisite(v) { if (!session.ecrire("journalVisite", v)) visiteMemoire = v; }
  function noter(ev) {
    if (!J.actif()) return;
    const v = visite();
    if (ev.e === "tp_debut") { if (v.tps.includes(ev.id)) return; v.tps.push(ev.id); majVisite(v); } // un TP compté une fois par visite
    if (ev.e === "temps") { for (const m of paliersFranchis(v.actifMs, v.actifMs + ev.ms)) ajouter({ e: "palier", m }); v.actifMs += ev.ms; majVisite(v); }
    ajouter(ev);
  }
  J.noter = noter;
  J.visiteEnCours = () => (session.lire("journalVisite", null) || visiteMemoire || {}).id || null;
  J.opposer = oui => {
    ecrire("journalConsentement", oui ? "non" : "oui");
    if (oui) { ecrireFile([]); ecrire("journalLots", []); local.effacer("journalDerniereVisite"); session.effacer("journalVisite"); visiteMemoire = null; }
  };
  J.enAttente = () => lire("journalFile", []).length + lire("journalLots", []).reduce((s, l) => s + (l.evs || []).length, 0);

  /* ---------- Envoi ---------- */
  let enVol = false, pause = 0;
  function retirerLot(id) { ecrire("journalLots", lire("journalLots", []).filter(l => l.id !== id)); }
  function envoyerMaintenant(fermeture) {
    if (!J.actif() || enVol || Date.now() < pause) return null;
    const p = prochainLot(lire("journalFile", []), lire("journalLots", []), nouvelIdentifiant);
    if (!p.lot) return null;
    ecrire("journalLots", p.lots); ecrireFile(p.file);
    const corps = JSON.stringify({ v: 2, lot: p.lot.id, envoi: Math.round(Date.now() / 1000), evs: p.lot.evs });
    enVol = true;
    let requete;
    try { requete = fetch(LS.JOURNAL_URL, { method: "POST", body: corps, keepalive: corps.length < 60000, credentials: "omit", headers: { "Content-Type": "text/plain" } }); }
    catch (e) { enVol = false; return null; }
    // Même à la fermeture, la réponse est suivie si la page vit encore ; sinon le lot reste en attente
    // et sera renvoyé à la visite suivante (le serveur ne le comptera pas deux fois).
    return requete.then(r => {
      enVol = false;
      if (r.ok || r.status === 400) { retirerLot(p.lot.id); if (r.ok && !fermeture) setTimeout(envoyer, 200); } // 400 : lot illisible, on ne s'acharne pas
      else pause = Date.now() + (r.status === 429 || r.status === 503 ? 600000 : 60000);
    }, () => { enVol = false; pause = Date.now() + 30000; });
  }
  function envoyer(fermeture) {
    if (!J.actif() || enVol) return;
    // Un seul onglet envoie à la fois (sauf à la fermeture, où il n'y a plus le temps d'attendre).
    if (!fermeture && navigator.locks && navigator.locks.request)
      navigator.locks.request("learnspace-journal", { ifAvailable: true }, verrou => verrou ? envoyerMaintenant(false) : null).catch(() => {});
    else envoyerMaintenant(fermeture);
  }
  J.envoyer = envoyer;

  /* ---------- Page, temps actif, événements du jeu ---------- */
  const page = pageDe(location.pathname, location.search);
  const debut = Date.now();
  let etat = { dernierTic: debut, derniereInteraction: debut, actifMs: 0 }, noteMs = 0;
  noter({ e: "page", p: page.p, id: page.id });
  // Début de TP : noté sous la variante de niveau (« id@niveau ») quand le TP en a, une fois son contenu chargé.
  if (page.p === "tp" && page.id && J.actif()) {
    let essais = 0;
    (function attendre() {
      const tp = LS.tps && LS.tps[page.id];
      if (tp && LS.tpAuNiveau && LS.niveau) noter({ e: "tp_debut", id: LS.tpAuNiveau(tp, LS.niveau(tp.domaine)).cleEtat });
      else if (++essais < 40) setTimeout(attendre, 250);
      else noter({ e: "tp_debut", id: page.id });
    })();
  }
  ["pointerdown", "keydown", "scroll", "touchstart", "input"].forEach(t => document.addEventListener(t, () => { etat.derniereInteraction = Date.now(); }, { passive: true, capture: true }));
  // Le temps est noté par tranches, pour ne rien perdre si la page est fermée brutalement.
  function noterTemps() {
    const ms = Math.round(etat.actifMs - noteMs);
    if (ms >= 1000) { noter({ e: "temps", p: page.p, id: page.id, ms }); noteMs += ms; }
  }
  if (J.configure()) {
    setInterval(() => { etat = tic(etat, Date.now(), document.visibilityState === "visible"); }, TICK_MS);
    setInterval(() => { noterTemps(); envoyer(); }, 30000);
    setTimeout(envoyer, 3000);
    window.addEventListener("online", () => { pause = 0; envoyer(); });
    window.addEventListener("pagehide", () => { noterTemps(); enVol = false; envoyer(true); });
  }
  document.addEventListener("visibilitychange", () => {
    etat = tic(etat, Date.now(), document.visibilityState === "hidden"); // la période qui vient de finir était visible
    if (document.visibilityState === "hidden") { noterTemps(); enVol = false; envoyer(true); }
    else { enVol = false; etat.dernierTic = Date.now(); etat.derniereInteraction = Date.now(); }
  });
  document.addEventListener("ls:gain", ev => {
    const e = evenementDeGain(ev.detail && ev.detail.cle, Math.round(Date.now() / 1000));
    if (!e) return;
    if (e.e === "objectif") e.ms = Date.now() - debut; // depuis l'ouverture du TP
    noter(e);
  });
  // Chaque réponse saisie à un objectif ou à une question, juste ou fausse (émis par tp.js).
  document.addEventListener("ls:essai", ev => {
    const d = ev.detail || {};
    if (typeof d.tp !== "string" || (d.objet !== "o" && d.objet !== "q")) return;
    noter({ e: "essai", id: d.tp.slice(0, 64), o: d.objet, i: +d.i || 0, ok: !!d.ok });
  });
  document.addEventListener("ls:tp-termine", ev => noter({ e: "tp_fin", id: String(ev.detail && ev.detail.id || page.id).slice(0, 64), ms: Date.now() - debut }));

  /* ---------- Information : reste affichée jusqu'au clic sur « Compris » (non bloquante) ---------- */
  function information() {
    if (!J.actif() || lire("journalInfoVue", false) || page.id === "confidentialite" || document.getElementById("info-journal")) return;
    const style = document.createElement("style");
    style.textContent = ".info-journal{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:0;padding-block:6px;padding-left:max(16px,env(safe-area-inset-left,0px));" +
      "padding-right:max(16px,env(safe-area-inset-right,0px));font-size:.9rem;color:var(--texte-doux);border-bottom:1px solid var(--bordure);background:var(--fond)}" +
      ".info-journal a{color:inherit}.info-journal span{flex:1 1 260px}.info-journal button{min-height:36px}";
    document.head.append(style);
    const p = document.createElement("div");
    p.id = "info-journal"; p.className = "info-journal"; p.setAttribute("role", "note");
    p.innerHTML = '<span>Pour améliorer le site, on compte les pages vues, le temps passé et les résultats des exercices. Rien ne dit qui tu es. <a href="confidentialite.html">En savoir plus ou refuser</a></span>' +
      '<button type="button" class="btn petit secondaire">Compris</button>';
    p.querySelector("button").addEventListener("click", () => { ecrire("journalInfoVue", true); p.remove(); });
    const entete = document.querySelector(".entete");
    if (entete) entete.after(p); else document.body.prepend(p);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(information, 0)); else setTimeout(information, 0);
})();
