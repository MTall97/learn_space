/* Journal d'utilisation, pseudonyme : pages vues, temps actif par page, TP commencés et terminés,
   objectifs atteints, questions réussies, notions comprises, catégorie d'appareil et niveau scolaire.
   - L'appareil est désigné par un numéro tiré au hasard ici : aucun nom, aucune adresse IP côté site.
   - Collecte active par défaut (mesure d'audience) ; l'opposition se fait dans confidentialite.html :
     la file est alors vidée et plus rien n'est noté. Une ligne d'information discrète s'affiche au
     premier passage puis disparaît.
   - Aucune perte : les événements attendent dans le navigateur (hors ligne compris) ; un lot envoyé
     garde son identifiant et est renvoyé tant que le serveur n'a pas répondu « reçu » ; le serveur
     ignore un lot déjà reçu. Rien n'est envoyé quand le site est ouvert depuis le disque (file://).
   - Adresse du serveur : LS.JOURNAL_URL (à régler ci-dessous ou avant ce script ; docs/JOURNAL.md).
   Fonctions pures exposées dans LS.journal pour les tests (tests/journal.test.js). */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  if (!LS.JOURNAL_URL) LS.JOURNAL_URL = "/api/journal";
  const MAX_FILE = 5000;              // au-delà (des semaines hors ligne), les plus anciens partent
  const TAILLE_LOT = 200;
  const PAUSE_MS = 60000;             // sans interaction pendant 60 s, le temps ne compte plus
  const TICK_MS = 5000;
  const lire = (k, d) => (LS.lire ? LS.lire(k, d) : d);
  const ecrire = (k, v) => { if (LS.ecrire) LS.ecrire(k, v); };

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
  function ajouterFile(file, ev, opposition, max) {
    if (opposition) return [];
    const f = (file || []).concat([ev]);
    return f.length > (max || MAX_FILE) ? f.slice(f.length - (max || MAX_FILE)) : f;
  }
  // Prépare le prochain envoi : le lot en attente de confirmation s'il y en a un (même identifiant),
  // sinon un nouveau lot pris en tête de file.
  function prochainLot(file, enCours, nouvelId, taille) {
    if (enCours && enCours.evs && enCours.evs.length) return { lot: enCours, file: file || [] };
    if (!file || !file.length) return { lot: null, file: file || [] };
    const n = taille || TAILLE_LOT;
    return { lot: { id: nouvelId(), evs: file.slice(0, n) }, file: file.slice(n) };
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
  function nouvelIdentifiant() {
    const o = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(o);
    else for (let i = 0; i < 16; i++) o[i] = Math.floor(Math.random() * 256);
    return Array.from(o, x => x.toString(16).padStart(2, "0")).join("");
  }
  LS.journal = { categorieAppareil, ajouterFile, prochainLot, tic, pageDe, evenementDeGain, nouvelIdentifiant, MAX_FILE, PAUSE_MS };

  /* ---------- État dans le navigateur ---------- */
  LS.journal.oppose = () => lire("journalConsentement", null) === "non";
  LS.journal.identifiant = () => { let id = lire("journalAppareil", null); if (!/^[0-9a-f]{32}$/.test(id || "")) { id = nouvelIdentifiant(); ecrire("journalAppareil", id); } return id; };
  // Effacer : nouveau numéro, et ce qui attendait d'être envoyé disparaît.
  LS.journal.effacer = () => { ecrire("journalAppareil", nouvelIdentifiant()); ecrire("journalFile", []); ecrire("journalLot", null); };
  LS.journal.opposer = oui => { ecrire("journalConsentement", oui ? "non" : "oui"); if (oui) { ecrire("journalFile", []); ecrire("journalLot", null); } };
  LS.journal.enAttente = () => lire("journalFile", []).length + ((lire("journalLot", null) || {}).evs || []).length;
  function noter(ev) {
    if (LS.journal.oppose()) return;
    ev.t = ev.t || Math.round(Date.now() / 1000);
    ecrire("journalFile", ajouterFile(lire("journalFile", []), ev, false));
  }
  LS.journal.noter = noter;

  if (typeof document === "undefined" || !document.addEventListener) return;

  const enLigne = /^https?:$/.test(location.protocol);
  let enVol = false, pause = 0;
  // Envoie le lot en attente (ou en prépare un) ; ne le retire qu'à la confirmation du serveur.
  function envoyer(fermeture) {
    if (!enLigne || LS.journal.oppose() || enVol || Date.now() < pause) return;
    const p = prochainLot(lire("journalFile", []), lire("journalLot", null), nouvelIdentifiant);
    if (!p.lot) return;
    ecrire("journalLot", p.lot); ecrire("journalFile", p.file);
    const n = LS.profil && LS.profil().niveau ? LS.profil().niveau : null;
    const corps = JSON.stringify({ v: 1, lot: p.lot.id, appareil: LS.journal.identifiant(), cat: categorieAppareil(navigator.userAgent, screen.width, navigator.maxTouchPoints), niveau: n, evs: p.lot.evs });
    enVol = true;
    let requete;
    try { requete = fetch(LS.JOURNAL_URL, { method: "POST", body: corps, keepalive: corps.length < 60000, credentials: "omit", headers: { "Content-Type": "text/plain" } }); }
    catch (e) { enVol = false; return; }
    if (fermeture) return; // la page se ferme : le lot reste « en attente » et sera renvoyé (le serveur dédoublonne)
    requete.then(r => {
      enVol = false;
      if (r.ok || r.status === 400) { ecrire("journalLot", null); if (r.ok) setTimeout(envoyer, 200); } // 400 : lot illisible, on ne s'acharne pas
      else pause = Date.now() + (r.status === 429 ? 600000 : 60000);
    }, () => { enVol = false; pause = Date.now() + 30000; });
  }
  LS.journal.envoyer = envoyer;

  /* ---------- Page, temps actif, événements du jeu ---------- */
  const page = pageDe(location.pathname, location.search);
  const debut = Date.now();
  let etat = { dernierTic: debut, derniereInteraction: debut, actifMs: 0 }, noteMs = 0;
  noter({ e: "page", p: page.p, id: page.id });
  if (page.p === "tp" && page.id) noter({ e: "tp_debut", id: page.id });
  ["pointerdown", "keydown", "scroll", "touchstart", "input"].forEach(t => document.addEventListener(t, () => { etat.derniereInteraction = Date.now(); }, { passive: true, capture: true }));
  // Le temps est noté par tranches, pour ne rien perdre si la page est fermée brutalement.
  function noterTemps() {
    const ms = Math.round(etat.actifMs - noteMs);
    if (ms >= 1000) { noter({ e: "temps", p: page.p, id: page.id, ms }); noteMs += ms; }
  }
  setInterval(() => { etat = tic(etat, Date.now(), document.visibilityState === "visible"); }, TICK_MS);
  setInterval(() => { noterTemps(); envoyer(); }, 30000);
  setTimeout(envoyer, 3000);
  window.addEventListener("online", () => { pause = 0; envoyer(); });
  document.addEventListener("visibilitychange", () => {
    etat = tic(etat, Date.now(), document.visibilityState === "hidden"); // la période qui vient de finir était visible
    if (document.visibilityState === "hidden") { noterTemps(); enVol = false; envoyer(true); }
    else { etat.dernierTic = Date.now(); etat.derniereInteraction = Date.now(); }
  });
  window.addEventListener("pagehide", () => { noterTemps(); enVol = false; envoyer(true); });
  document.addEventListener("ls:gain", ev => {
    const e = evenementDeGain(ev.detail && ev.detail.cle, Math.round(Date.now() / 1000));
    if (!e) return;
    if (e.e === "objectif" || e.e === "question") e.ms = Date.now() - debut; // depuis l'ouverture du TP
    noter(e);
  });
  document.addEventListener("ls:tp-termine", ev => noter({ e: "tp_fin", id: String(ev.detail && ev.detail.id || page.id).slice(0, 64), ms: Date.now() - debut }));

  /* ---------- Information discrète au premier passage (non bloquante) ---------- */
  function information() {
    if (lire("journalInfoVue", false) || LS.journal.oppose() || page.id === "confidentialite") return;
    ecrire("journalInfoVue", true);
    const style = document.createElement("style");
    style.textContent = ".info-journal{margin:0;padding-block:6px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));" +
      "font-size:.9rem;color:var(--texte-doux);border-bottom:1px solid var(--bordure);background:var(--fond)}.info-journal a{color:inherit}";
    document.head.append(style);
    const p = document.createElement("p");
    p.className = "info-journal"; p.setAttribute("role", "note");
    p.innerHTML = 'Pour améliorer le site, on compte les pages vues et le temps passé, sans ton nom. <a href="confidentialite.html">En savoir plus ou refuser</a>';
    const entete = document.querySelector(".entete");
    if (entete) entete.after(p); else document.body.prepend(p);
    setTimeout(() => p.remove(), 15000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(information, 0)); else setTimeout(information, 0);
})();
