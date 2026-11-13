/* Learn Space : outils communs (aucune dépendance, fonctionne aussi en ouvrant les fichiers
   directement depuis le disque, sans serveur). */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  LS.cartes = LS.cartes || {};
  LS.tps = LS.tps || {};

  /* ---------- Stockage (le navigateur peut le refuser : on continue sans) ---------- */
  const PREFIXE = "learnspace:";
  LS.lire = function (cle, defaut) {
    try {
      const v = localStorage.getItem(PREFIXE + cle);
      return v === null ? defaut : JSON.parse(v);
    } catch (e) { return defaut; }
  };
  LS.ecrire = function (cle, valeur) {
    try { localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur)); } catch (e) { /* ignoré */ }
  };

  /* ---------- Thème ---------- */
  LS.appliquerTheme = function () {
    const t = LS.lire("theme", null);
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  };
  LS.basculerTheme = function () {
    const sombre = getComputedStyle(document.documentElement).colorScheme === "dark";
    LS.ecrire("theme", sombre ? "light" : "dark");
    LS.appliquerTheme();
    document.dispatchEvent(new CustomEvent("ls:theme"));
  };
  LS.appliquerTheme();

  /* Hors ligne et installation : assets/js/pwa.js (service worker, bouton « Installer », mises à jour). */

  /* ---------- Messages et confirmations dans la page ----------
     (alert et confirm sont bloqués dans certains cadres, dont les pages publiées sur claude.ai) */
  LS.avis = function (texte, duree) {
    let zone = document.getElementById("ls-avis");
    if (!zone) { zone = document.createElement("div"); zone.id = "ls-avis"; zone.setAttribute("role", "status"); document.body.append(zone); }
    const m = document.createElement("div");
    m.className = "avis"; m.textContent = texte;
    m.addEventListener("click", () => m.remove());
    zone.append(m);
    setTimeout(() => m.remove(), duree || 5000);
  };
  // Premier clic : le bouton demande confirmation ; second clic dans les 4 s : l'action est faite.
  LS.confirmer = function (bouton, action, question) {
    if (bouton.dataset.confirme) { delete bouton.dataset.confirme; bouton.textContent = bouton.dataset.texte; clearTimeout(bouton._minuteur); action(); return; }
    bouton.dataset.confirme = "1"; bouton.dataset.texte = bouton.textContent;
    bouton.textContent = question || "Confirmer ?";
    bouton._minuteur = setTimeout(() => { delete bouton.dataset.confirme; bouton.textContent = bouton.dataset.texte; }, 4000);
  };

  /* ---------- Petites aides ---------- */
  LS.slug = function (s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };
  LS.el = function (balise, attrs, enfants) {
    const e = document.createElement(balise);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    (enfants || []).forEach(c => { if (c !== null && c !== undefined) e.append(c); });
    return e;
  };
  LS.echapper = function (s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
  /* Mise en forme minimale : **gras**, *italique*, `code`, retours à la ligne, listes « - ». */
  LS.texte = function (s) {
    if (!s) return "";
    let h = LS.echapper(s);
    h = h.replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    const lignes = h.split("\n");
    let out = "", liste = false;
    for (const l of lignes) {
      if (/^\s*- /.test(l)) {
        if (!liste) { out += "<ul>"; liste = true; }
        out += "<li>" + l.replace(/^\s*- /, "") + "</li>";
      } else {
        if (liste) { out += "</ul>"; liste = false; }
        out += l + "<br>";
      }
    }
    if (liste) out += "</ul>";
    return out.replace(/(<br>)+$/, "");
  };
  LS.param = function (nom) { return new URLSearchParams(location.search).get(nom); };

  /* Formatage d'une grandeur physique avec préfixe SI : 0.0213 A → « 21,3 mA ». */
  LS.si = function (v, unite, chiffres) {
    chiffres = chiffres || 3;
    if (!isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a < 1e-12) return "0 " + unite;
    const pref = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
    let p = pref[pref.length - 1];
    for (const q of pref) if (a >= q[0] * 0.9995) { p = q; break; }
    const x = v / p[0];
    const txt = Number(x.toPrecision(chiffres)).toString().replace(".", ",");
    return txt + " " + p[1] + unite;
  };
  LS.nombre = function (v, dec) {
    return Number(v).toFixed(dec === undefined ? 2 : dec).replace(".", ",");
  };

  /* Chargement d'un script (fonctionne en file://, contrairement à fetch). */
  LS.charger = function (src) {
    return new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => ko(new Error("Impossible de charger " + src));
      document.head.appendChild(s);
    });
  };

  /* Enregistrement du contenu (appelé par les fichiers de contenu/). */
  LS.ajouterCarte = function (carte) { LS.cartes[carte.id] = carte; };
  LS.ajouterTP = function (tp) { LS.tps[tp.id] = tp; };

  /* ---------- Cartes mentales : identifiants des nœuds ---------- */
  /* Chaque nœud reçoit un identifiant stable « idCarte/slug-du-libellé » (libellés uniques dans une carte). */
  LS.preparerCarte = function (carte) {
    if (carte._prete) return carte;
    const index = {};
    (function parcourir(n, parent, niveau) {
      n._id = carte.id + "/" + LS.slug(n.t);
      n._parent = parent; n._niveau = niveau;
      index[LS.slug(n.t)] = n;
      (n.c || []).forEach(e => parcourir(e, n, niveau + 1));
    })(carte.racine, null, 0);
    carte._index = index;
    carte._prete = true;
    return carte;
  };
  LS.noeudsCarte = function (carte) {
    const l = [];
    (function p(n) { l.push(n); (n.c || []).forEach(p); })(carte.racine);
    return l;
  };
  LS.chercherNoeud = function (carte, libelle) {
    LS.preparerCarte(carte);
    return carte._index[LS.slug(libelle)] || null;
  };

  /* ---------- En-tête commun ---------- */
  LS.POLICE = '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif';
  LS.POLICE_TITRE = '"Baloo 2", "Segoe UI", system-ui, sans-serif';

  /* Pictogrammes au trait (24 × 24, couleur du texte) : navigation, actions, et un par atelier
     (« dom-<id> »), dessinés en clair sur un carré sombre dans le sommaire, à la façon du bogolan. */
  const PICTOS = {
    accueil: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
    ateliers: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
    brevets: '<rect x="4" y="5" width="16" height="11" rx="1" transform="rotate(-6 12 10.5)"/><path d="M8 11h8"/><path d="M9 20h6"/>',
    bac: '<path d="M3 12h4l2-5 3 10 2-5h7"/>',
    theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>',
    installer: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19h14"/>',
    retour: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    suivant: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    coche: '<path d="m4.5 12.5 4.5 4.5 10.5-11"/>',
    croix: '<path d="M6 6l12 12M18 6 6 18"/>',
    attention: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5"/><path d="M12 17.2v.1"/>',
    "dom-maths": '<path d="M4 20h16L4 4z"/><path d="M4 16h4v4"/>',
    "dom-electricite": '<path d="M13 3 6 13.5h5.5L10 21l7.5-11H12z"/>',
    "dom-electronique": '<path d="M3 12h5M16 12h5"/><path d="m8 6.5 8 5.5-8 5.5z"/><path d="M16 6.5v11"/>',
    "dom-numerique": '<path d="M3 17h4V7h5v10h5V7h4"/>',
    "dom-solaire": '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    "dom-batiment": '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v10h12V10"/><path d="M10 13.5v2.5M14 13.5v2.5"/>',
    "dom-electromecanique": '<path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 8h4M14 8h4"/>',
    "dom-telecom": '<path d="M12 21V11"/><circle cx="12" cy="9.5" r="1.5"/><path d="M8.2 6a5.5 5.5 0 0 1 7.6 0M5.2 3a9.5 9.5 0 0 1 13.6 0"/>',
    "dom-moteurs": '<rect x="7" y="3" width="10" height="8" rx="1"/><path d="M7 6h10"/><path d="m12 11-3 6"/><circle cx="12" cy="18" r="3"/>',
    "dom-transmissions": '<circle cx="7.5" cy="12" r="4.5"/><circle cx="18" cy="12" r="2.5"/><path d="M7.5 7.5 18 9.5M7.5 16.5 18 14.5"/>',
    "dom-esp32": '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3"/>',
    "dom-capteurs": '<path d="M10 4.5a2 2 0 0 1 4 0V14a4 4 0 1 1-4 0z"/><path d="M12 10v7"/>',
    "dom-drones": '<circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="m7.5 7.5 3 3m3 0 3-3m-9 9 3-3m3 0 3 3"/><rect x="10" y="10" width="4" height="4"/>',
    "dom-python": '<path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 5l-4 14"/>',
    "dom-ml-audio": '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
    "dom-finance": '<path d="M4 4v16h16"/><path d="m7.5 15 4-4 3 3 5-6"/>',
    "dom-git": '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 4.5-6 3.5-11.5 7.5"/>'
  };
  LS.icone = (nom, taille) => `<svg viewBox="0 0 24 24" width="${taille || 20}" height="${taille || 20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PICTOS[nom] || ""}</svg>`;
  // Pictogramme d'un atelier, dans son carré sombre (sommaire, en-tête de TP, tampons de brevet).
  LS.pictoAtelier = (id, classe) => LS.el("span", { class: "picto-atelier" + (classe ? " " + classe : ""), "aria-hidden": "true", html: LS.icone(PICTOS["dom-" + id] ? "dom-" + id : "ateliers", 28) });

  /* En-tête : la couverture du cahier (logo, navigation, niveau, rang, thème) bordée d'une frise ;
     barre d'onglets en bas sur téléphone. */
  LS.entete = function (actif, racine) {
    racine = racine || "";
    if (actif === "cartes" || actif === "tps") actif = "ateliers";
    const liens = [["accueil", "Accueil", "index.html#tableau"], ["ateliers", "Ateliers", "index.html#ateliers"], ["brevets", "Brevets", "index.html#brevets"], ["bac", "Bac à sable", "tp.html?id=elec-bac-a-sable"]];
    const lien = l => LS.el("a", { href: racine + l[2], class: "onglet" + (l[0] === actif ? " actif" : ""), "aria-current": l[0] === actif ? "page" : null }, [LS.el("span", { class: "ic", "aria-hidden": "true", html: LS.icone(l[0]) }), LS.el("span", { text: l[1] })]);
    const theme = LS.el("button", { class: "bouton-theme", title: "Changer de thème", "aria-label": "Changer de thème (clair ou sombre)", html: LS.icone("theme"), onclick: LS.basculerTheme });
    const h = LS.el("header", { class: "entete" }, [
      LS.el("div", { class: "entete-barre" }, [
        LS.el("a", { class: "logo", href: racine + "index.html" }, [LS.el("span", { text: "Learn" }), LS.el("span", { class: "logo-2", text: "Space" })]),
        LS.el("nav", { class: "nav-haut", "aria-label": "Navigation" }, liens.map(lien)),
        LS.profil ? LS.el("a", { class: "puce-niveau", href: racine + "index.html#niveau", title: "Changer de niveau", text: LS.infoNiveau(LS.niveau()).nom }) : null,
        LS.jeu ? LS.jeu.puce(racine) : null,
        theme
      ])
    ]);
    document.body.prepend(h);
    document.body.append(LS.el("nav", { class: "nav-bas", "aria-label": "Navigation" }, liens.map(lien)));
    if (LS.jeu) LS.jeu.majPuce();
  };

  /* ---------- Journal d'utilisation : chargé APRÈS la page ----------
     empreinte-contenu.js, config-journal.js puis journal.js, dans cet ordre (async = false), une fois la
     page chargée : un réseau qui ne répond pas ne retarde ni l'affichage ni l'événement « load ». Une
     nouvelle adresse dans config-journal.js prend donc effet à la page suivante. */
  LS.chargerJournal = function () {
    if (LS._journalDemande || (LS.journal && LS.journal.configure)) return;
    LS._journalDemande = true;
    ["assets/js/empreinte-contenu.js", "assets/js/config-journal.js", "assets/js/journal.js"].forEach(f => {
      const s = document.createElement("script"); s.src = f; s.async = false; document.head.appendChild(s);
    });
  };
  if (typeof document !== "undefined" && typeof window !== "undefined" && window.addEventListener && document.createElement) {
    if (document.readyState === "complete") setTimeout(LS.chargerJournal, 0);
    else window.addEventListener("load", () => setTimeout(LS.chargerJournal, 0));
  }
})();
