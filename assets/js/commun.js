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
  LS.entete = function (actif, racine) {
    racine = racine || "";
    const liens = [["accueil", "Parcours", "index.html"], ["cartes", "Cartes mentales", "index.html#cartes"], ["tps", "TP", "index.html#tps"], ["bac", "Bac à sable", "tp.html?id=elec-bac-a-sable"]];
    const nav = LS.el("nav", {}, liens.map(l => LS.el("a", { href: racine + l[2], class: l[0] === actif ? "actif" : "" , text: l[1] })));
    const h = LS.el("header", { class: "entete" }, [
      LS.el("a", { class: "logo", href: racine + "index.html", text: "⚡ Learn Space" }),
      nav,
      LS.el("button", { class: "bouton-theme", title: "Changer de thème", text: "◐", onclick: LS.basculerTheme })
    ]);
    document.body.prepend(h);
  };
})();
