/* Journal d'utilisation, pseudonyme : pages vues, temps actif par page, TP commencés et terminés,
   objectifs atteints, questions réussies, notions comprises, catégorie d'appareil et niveau scolaire.
   - Désactivé tant que LS.JOURNAL_URL est vide (assets/js/config-journal.js, à remplir au déploiement)
     et quand le site est ouvert depuis le disque (file://) : rien n'est alors noté ni affiché.
   - L'appareil est désigné par un numéro tiré au hasard ici, renouvelé au moins tous les 12 mois :
     aucun nom, aucune adresse IP côté site.
   - Collecte active par défaut (mesure d'audience) ; une information reste affichée jusqu'au clic sur
     « Compris » ; l'opposition se fait dans confidentialite.html (la file est vidée, plus rien n'est noté).
   - Aucune perte : les événements attendent dans le navigateur (hors ligne compris) ; un lot envoyé
     garde son identifiant et reste en attente tant que le serveur n'a pas répondu ; le serveur ignore
     un lot déjà reçu. Entre deux onglets, l'envoi passe par navigator.locks quand il existe.
   Fonctions pures exposées dans LS.journal pour les tests (tests/journal.test.js). */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  const MAX_FILE = 3000;              // au-delà (des semaines hors ligne), les plus anciens partent
  const TAILLE_LOT = 200;
  const PAUSE_MS = 60000;             // sans interaction pendant 60 s, le temps ne compte plus
  const TICK_MS = 5000;
  const VIE_IDENTIFIANT = 365 * 86400000;
  const PREFIXE = "learnspace:";
  const lire = (k, d) => { try { const v = localStorage.getItem(PREFIXE + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const ecrire = (k, v) => { try { localStorage.setItem(PREFIXE + k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  /* ---------- Fonctions pures ---------- */
  // Catégorie d'appareil, sans garder l'user-agent : type, famille de système, largeur arrondie à 50 px.
  function categorieAppareil(ua, largeur, pointsTactiles) {
    ua = String(ua || "");
    const tactile = (pointsTactiles || 0) > 0;
    let type = "ordinateur";
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && tactile)) type = "tablette";
    else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) type = "telephone";
    else if (tactile && largeur && largeur < 600) type = "telephone";
    const os = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && tactile) ? "ios"
      : /CrOS/i.test(ua) ? "chromeos" : /Windows/i.test(ua) ? "windows" : /Macintosh|Mac OS X/i.test(ua) ? "macos" : /Linux/i.test(ua) ? "linux" : "autre";
    return { type, os, largeur: Math.max(0, Math.min(10000, Math.round((largeur || 0) / 50) * 50)) };
  }
  // Ajoute un événement à une file bornée (on garde les plus récents). Opposition : rien n'est gardé.
  // Deux tranches de temps de suite sur la même page sont fusionnées (file plus légère).
  function ajouterFile(file, ev, opposition, max) {
    if (opposition) return [];
    const f = (file || []).slice(), der = f[f.length - 1];
    if (ev.e === "temps" && der && der.e === "temps" && der.p === ev.p && der.id === ev.id) f[f.length - 1] = Object.assign({}, der, { ms: der.ms + ev.ms });
    else f.push(ev);
    return f.length > (max || MAX_FILE) ? f.slice(f.length - (max || MAX_FILE)) : f;
  }
  // Prochain envoi : le premier lot en attente de confirmation (même identifiant), sinon un nouveau lot
  // pris en tête de file pour l'appareil donné.
  function prochainLot(file, lots, nouvelId, appareil, taille) {
    file = file || []; lots = lots || [];
    if (lots.length) return { lot: lots[0], file, lots };
    if (!file.length) return { lot: null, file, lots };
    const n = taille || TAILLE_LOT, lot = { id: nouvelId(), a: appareil, evs: file.slice(0, n) };
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
  // Traduit un gain du jeu (clé du registre) en événement du journal.
  function evenementDeGain(cle, t) {
    const m = /^(n|o|q|tp|carte):(.+)$/.exec(cle || "");
    if (!m) return null;
    if (m[1] === "n") return { t, e: "notion", noeud: m[2].slice(0, 160) };
    if (m[1] === "carte") return { t, e: "carte_finie", id: m[2].slice(0, 64) };
    if (m[1] === "tp") return null; // la fin de TP vient de « ls:tp-termine », avec sa durée
    const k = m[2].lastIndexOf(":");
    return { t, e: m[1] === "o" ? "objectif" : "question", id: m[2].slice(0, k).slice(0, 64), i: +m[2].slice(k + 1) || 0 };
  }
  const doitRenouveler = (cree, maintenant) => !(cree > 0) || maintenant - cree > VIE_IDENTIFIANT || cree > maintenant + 86400000;
  function nouvelIdentifiant() {
    const o = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(o);
    else for (let i = 0; i < 16; i++) o[i] = Math.floor(Math.random() * 256);
    return Array.from(o, x => x.toString(16).padStart(2, "0")).join("");
  }
  LS.journal = { categorieAppareil, ajouterFile, prochainLot, tic, pageDe, evenementDeGain, doitRenouveler, nouvelIdentifiant, MAX_FILE, PAUSE_MS };

  if (typeof document === "undefined" || !document.addEventListener || typeof location === "undefined") return;

  /* ---------- État dans le navigateur ---------- */
  const enLigne = /^https?:$/.test(location.protocol);
  const J = LS.journal;
  J.configure = () => enLigne && typeof LS.JOURNAL_URL === "string" && LS.JOURNAL_URL !== "";
  J.oppose = () => lire("journalConsentement", null) === "non";
  J.actif = () => J.configure() && !J.oppose();
  // La file est écrite en gérant le quota du navigateur : si elle ne tient pas, on garde la moitié la plus récente.
  function ecrireFile(f) {
    while (!ecrire("journalFile", f)) { if (!f.length) return; f = f.slice(Math.ceil(f.length / 2)); }
  }
  // Numéro de l'appareil, renouvelé au bout de 12 mois. Ce qui attendait sous l'ancien numéro part sous
  // l'ancien numéro (un lot à part), pour ne pas relier l'ancien et le nouveau.
  J.identifiant = () => {
    let id = lire("journalAppareil", null);
    if (!/^[0-9a-f]{32}$/.test(id || "") || doitRenouveler(lire("journalAppareilCree", 0), Date.now())) {
      const ancien = /^[0-9a-f]{32}$/.test(id || "") ? id : null, file = lire("journalFile", []);
      if (ancien && file.length) { ecrire("journalLots", lire("journalLots", []).concat([{ id: nouvelIdentifiant(), a: ancien, evs: file }])); ecrireFile([]); }
      id = nouvelIdentifiant();
      ecrire("journalAppareil", id); ecrire("journalAppareilCree", Date.now());
    }
    return id;
  };
  // Effacer (demande de l'élève) : nouveau numéro, et ce qui attendait d'être envoyé disparaît.
  J.effacer = () => {
    const ancien = lire("journalAppareil", null);
    if (ancien) ecrire("journalAppareilAncien", ancien);
    ecrire("journalAppareil", nouvelIdentifiant()); ecrire("journalAppareilCree", Date.now());
    ecrireFile([]); ecrire("journalLots", []);
  };
  J.ancienIdentifiant = () => lire("journalAppareilAncien", null);
  J.opposer = oui => { ecrire("journalConsentement", oui ? "non" : "oui"); if (oui) { ecrireFile([]); ecrire("journalLots", []); } };
  J.enAttente = () => lire("journalFile", []).length + lire("journalLots", []).reduce((s, l) => s + (l.evs || []).length, 0);
  function noter(ev) {
    if (!J.actif()) return;
    ev.t = ev.t || Math.round(Date.now() / 1000);
    ecrireFile(ajouterFile(lire("journalFile", []), ev, false));
  }
  J.noter = noter;

  /* ---------- Envoi ---------- */
  let enVol = false, pause = 0;
  function retirerLot(id) { ecrire("journalLots", lire("journalLots", []).filter(l => l.id !== id)); }
  function envoyerMaintenant(fermeture) {
    if (!J.actif() || enVol || Date.now() < pause) return null;
    const appareil = J.identifiant(); // d'abord : un renouvellement range la file sous l'ancien numéro
    const p = prochainLot(lire("journalFile", []), lire("journalLots", []), nouvelIdentifiant, appareil);
    if (!p.lot) return null;
    ecrire("journalLots", p.lots); ecrireFile(p.file);
    const n = LS.profil && LS.profil().niveau ? LS.profil().niveau : null;
    const corps = JSON.stringify({ v: 1, lot: p.lot.id, appareil: p.lot.a, envoi: Math.round(Date.now() / 1000), cat: categorieAppareil(navigator.userAgent, screen.width, navigator.maxTouchPoints), niveau: n, evs: p.lot.evs });
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
    const t0 = Math.round(debut / 1000);
    let essais = 0;
    (function attendre() {
      const tp = LS.tps && LS.tps[page.id];
      if (tp && LS.tpAuNiveau && LS.niveau) noter({ e: "tp_debut", id: LS.tpAuNiveau(tp, LS.niveau(LS.domaineDe ? LS.domaineDe("tp", page.id) : null)).cleEtat, t: t0 });
      else if (++essais < 40) setTimeout(attendre, 250);
      else noter({ e: "tp_debut", id: page.id, t: t0 });
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
    if (e.e === "objectif" || e.e === "question") e.ms = Date.now() - debut; // depuis l'ouverture du TP
    noter(e);
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
    p.innerHTML = '<span>Pour améliorer le site, on compte les pages vues, le temps passé et les résultats des exercices, sans ton nom. <a href="confidentialite.html">En savoir plus ou refuser</a></span>' +
      '<button type="button" class="btn petit secondaire">Compris</button>';
    p.querySelector("button").addEventListener("click", () => { ecrire("journalInfoVue", true); p.remove(); });
    const entete = document.querySelector(".entete");
    if (entete) entete.after(p); else document.body.prepend(p);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(information, 0)); else setTimeout(information, 0);
})();
