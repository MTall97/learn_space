/* Le jeu : points d'énergie, niveaux, série de jours, objectif du jour, brevets.
   Tout est calculé à partir d'un registre de gains idempotent (une clé = un gain unique), gardé dans
   le navigateur. Les gains sont détectés en enveloppant LS.marquerCompris et LS.enregistrerTP : les
   pages n'ont rien à appeler. Fonctions pures exposées pour les tests (LS.jeu.*). */
(function () {
  "use strict";
  const LS = window.LS;

  const POINTS = { notion: 10, objectif: 25, question: 10, tp: 50, carte: 50 };
  const OBJECTIF_JOUR = 60;

  /* Domaines : marquage façon composant, teinte (degrés HSL) et brevet obtenu en terminant le domaine. */
  const DOMAINES = {
    maths: { code: "∑", h: 262, brevet: "Calculateur" },
    electricite: { code: "Ω", h: 28, brevet: "Électricien" },
    electronique: { code: "Si", h: 200, brevet: "Électronicien" },
    numerique: { code: "01", h: 150, brevet: "Logicien" },
    solaire: { code: "PV", h: 45, brevet: "Installateur solaire" },
    batiment: { code: "230", h: 8, brevet: "Électricien du bâtiment" },
    electromecanique: { code: "M~", h: 330, brevet: "Électromécanicien" },
    telecom: { code: "dB", h: 190, brevet: "Télécommunicant" },
    moteurs: { code: "4T", h: 15, brevet: "Motoriste" },
    transmissions: { code: "i", h: 95, brevet: "Mécanicien transmission" },
    esp32: { code: "IO", h: 175, brevet: "Développeur embarqué" },
    capteurs: { code: "°C", h: 120, brevet: "Métrologue" },
    drones: { code: "4×", h: 215, brevet: "Télépilote" },
    python: { code: "py", h: 52, brevet: "Pythoniste" },
    "ml-audio": { code: "Hz", h: 290, brevet: "Ingénieur ML" },
    finance: { code: "FX", h: 140, brevet: "Analyste" },
    git: { code: "git", h: 12, brevet: "Versionneur" }
  };
  const TITRES = [[1, "Apprenti"], [3, "Bricoleur averti"], [5, "Câbleur"], [8, "Technicien"], [12, "Technicien confirmé"], [16, "Ingénieur"], [20, "Expert"]];

  /* ---------- Fonctions pures ---------- */
  // Points cumulés nécessaires pour atteindre le niveau n : 0, 100, 300, 600, 1 000…
  const seuil = n => 50 * n * (n - 1);
  function niveau(points) {
    let n = 1;
    while (seuil(n + 1) <= points) n++;
    const bas = seuil(n), haut = seuil(n + 1);
    let titre = TITRES[0][1];
    TITRES.forEach(([k, t]) => { if (n >= k) titre = t; });
    return { n, titre, dans: points - bas, pour: haut - bas, ratio: (points - bas) / (haut - bas), prochain: haut };
  }
  const jourISO = d => { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  // Série : nombre de jours consécutifs avec de l'activité, se terminant aujourd'hui ou hier.
  function serie(jours, aujourdhui) {
    const actifs = new Set(Object.keys(jours).filter(k => jours[k] > 0));
    const d = new Date(aujourdhui);
    if (!actifs.has(jourISO(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (actifs.has(jourISO(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------- Registre ---------- */
  const registre = () => LS.lire("gains", {});
  const total = () => Object.values(registre()).reduce((a, b) => a + b, 0);
  function gagner(cle, pts, raison) {
    const g = registre();
    if (g[cle] !== undefined) return 0;
    g[cle] = pts; LS.ecrire("gains", g);
    const j = LS.lire("jours", {}), k = jourISO(Date.now());
    j[k] = (j[k] || 0) + pts; LS.ecrire("jours", j);
    if (typeof document !== "undefined" && document.dispatchEvent) document.dispatchEvent(new CustomEvent("ls:gain", { detail: { cle, pts, raison } }));
    return pts;
  }

  // Première utilisation : reprendre la progression déjà faite, sans la compter comme gagnée aujourd'hui.
  function migrer() {
    if (LS.lire("jeuVersion", 0) >= 1) return;
    const g = registre();
    Object.keys(LS.lire("compris", {})).forEach(k => { g["n:" + k] = POINTS.notion; });
    const tps = LS.lire("tp", {});
    Object.keys(tps).forEach(id => {
      const e = tps[id] || {};
      Object.keys(e.objectifs || {}).forEach(i => { g["o:" + id + ":" + i] = POINTS.objectif; });
      Object.keys(e.questions || {}).forEach(i => { g["q:" + id + ":" + i] = POINTS.question; });
      const faits = Object.keys(e.objectifs || {}).length + Object.keys(e.questions || {}).length;
      if (e.total && faits >= e.total) g["tp:" + id] = POINTS.tp;
    });
    LS.ecrire("gains", g); LS.ecrire("jeuVersion", 1);
  }

  /* ---------- Détection des gains ---------- */
  function envelopper() {
    const compris = LS.marquerCompris;
    if (compris && !compris._jeu) {
      LS.marquerCompris = function (idNoeud, oui) {
        compris.apply(this, arguments);
        if (!oui) return;
        gagner("n:" + idNoeud, POINTS.notion, "Notion comprise");
        const idCarte = String(idNoeud).split("/")[0], carte = LS.cartes && LS.cartes[idCarte];
        if (carte && LS.progressionCarte(carte).ratio >= 1) gagner("carte:" + idCarte, POINTS.carte, "Carte terminée : " + carte.titre);
      };
      LS.marquerCompris._jeu = true;
    }
    const enreg = LS.enregistrerTP;
    if (enreg && !enreg._jeu) {
      LS.enregistrerTP = function (id, etat) {
        enreg.apply(this, arguments);
        Object.keys(etat.objectifs || {}).forEach(i => gagner("o:" + id + ":" + i, POINTS.objectif, "Objectif atteint"));
        Object.keys(etat.questions || {}).forEach(i => gagner("q:" + id + ":" + i, POINTS.question, "Bonne réponse"));
        const faits = Object.keys(etat.objectifs || {}).length + Object.keys(etat.questions || {}).length;
        if (etat.total && faits >= etat.total && gagner("tp:" + id, POINTS.tp, "TP terminé"))
          if (typeof document !== "undefined" && document.dispatchEvent) document.dispatchEvent(new CustomEvent("ls:tp-termine", { detail: { id } }));
      };
      LS.enregistrerTP._jeu = true;
    }
  }

  /* ---------- Brevets ---------- */
  // avancement : { idDomaine: ratio 0..1 } (fourni par l'accueil, qui charge les cartes).
  function brevets(avancement) {
    const g = registre(), j = LS.lire("jours", {}), pts = total();
    const s = serie(j, Date.now()), niv = niveau(pts).n;
    const tps = LS.lire("tp", {});
    const premierCoup = Object.values(tps).reduce((a, e) => a + Object.keys(e.questions || {}).filter(i => (e.essais || {})["q" + i] === 1).length, 0);
    const domainesPratiques = new Set();
    (LS.parcours || []).forEach(d => d.etapes.forEach(e => { if (e.type === "tp" && tps[e.id] && Object.keys(tps[e.id].objectifs || {}).length) domainesPratiques.add(d.id); }));
    const cartesFinies = Object.keys(g).filter(k => k.startsWith("carte:")).length;
    const liste = [
      { id: "premier", code: "1", nom: "Premier contact", desc: "Atteindre un premier objectif de TP.", ok: Object.keys(g).some(k => k.startsWith("o:")) },
      { id: "serie3", code: "3j", nom: "Régulier", desc: "3 jours d'affilée.", ok: s >= 3 },
      { id: "serie7", code: "7j", nom: "Assidu", desc: "7 jours d'affilée.", ok: s >= 7 },
      { id: "serie30", code: "30j", nom: "Endurant", desc: "30 jours d'affilée.", ok: s >= 30 },
      { id: "sansfaute", code: "10/10", nom: "Sans faute", desc: "10 questions réussies du premier coup.", ok: premierCoup >= 10 },
      { id: "cartographe", code: "3×", nom: "Cartographe", desc: "Terminer 3 cartes mentales.", ok: cartesFinies >= 3 },
      { id: "polyvalent", code: "5D", nom: "Polyvalent", desc: "Réussir un objectif dans 5 domaines différents.", ok: domainesPratiques.size >= 5 },
      { id: "niv5", code: "N5", nom: "Câbleur", desc: "Atteindre le niveau 5.", ok: niv >= 5 },
      { id: "niv10", code: "N10", nom: "Technicien", desc: "Atteindre le niveau 10.", ok: niv >= 10 }
    ];
    (LS.parcours || []).forEach(d => {
      const info = DOMAINES[d.id] || { code: "?", brevet: d.titre };
      liste.push({ id: "dom-" + d.id, code: info.code, h: info.h, nom: info.brevet, desc: "Terminer toutes les étapes : " + d.titre + ".", ok: avancement ? (avancement[d.id] || 0) >= 0.999 : false, domaine: true });
    });
    return liste;
  }

  /* ---------- Interface : puce du joueur, annonces de gains ---------- */
  function etat() {
    const pts = total(), j = LS.lire("jours", {});
    return { points: pts, niveau: niveau(pts), serie: serie(j, Date.now()), jour: j[jourISO(Date.now())] || 0, objectifJour: OBJECTIF_JOUR };
  }
  const reduit = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function annoncer(detail) {
    let zone = document.getElementById("ls-gains");
    if (!zone) { zone = LS.el("div", { id: "ls-gains", "aria-live": "polite" }); document.body.append(zone); }
    const avant = niveau(total() - detail.pts).n, apres = niveau(total()).n;
    const m = LS.el("div", { class: "gain" + (reduit() ? "" : " anime") }, [
      LS.el("span", { class: "gain-pts", text: "+" + detail.pts }), LS.el("span", { text: detail.raison })]);
    zone.append(m);
    setTimeout(() => m.remove(), 2600);
    if (apres > avant) {
      const n = niveau(total());
      const p = LS.el("div", { class: "gain niveau" + (reduit() ? "" : " anime") }, [LS.el("span", { class: "gain-pts", text: "N" + n.n }), LS.el("span", { text: "Niveau atteint : " + n.titre })]);
      zone.append(p); setTimeout(() => p.remove(), 4000);
    }
    majPuce();
  }
  function majPuce() {
    const p = document.getElementById("puce-joueur");
    if (!p) return;
    const e = etat();
    p.querySelector(".puce-niv").textContent = "N" + e.niveau.n;
    p.querySelector(".puce-barre > span").style.width = Math.round(e.niveau.ratio * 100) + "%";
    p.querySelector(".puce-serie").textContent = e.serie + " j";
    p.title = e.niveau.titre + " · " + e.points + " points · " + e.serie + " jour(s) d'affilée";
  }
  function puce(racine) {
    return LS.el("a", { id: "puce-joueur", class: "puce-joueur", href: (racine || "") + "index.html#tableau" }, [
      LS.el("span", { class: "puce-niv", text: "N1" }),
      LS.el("span", { class: "puce-barre", "aria-hidden": "true" }, [LS.el("span", {})]),
      LS.el("span", { class: "puce-serie", text: "0 j" })]);
  }

  // Dernière étape ouverte, pour « Reprendre » sur l'accueil.
  function visiter(type, id) { LS.ecrire("derniere", { type, id, t: Date.now() }); }

  LS.jeu = { POINTS, OBJECTIF_JOUR, DOMAINES, seuil, niveau, serie, jourISO, total, gagner, brevets, etat, puce, majPuce, visiter, migrer };
  migrer();
  envelopper();
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("ls:gain", ev => annoncer(ev.detail));
    document.addEventListener("DOMContentLoaded", majPuce);
  }
})();
