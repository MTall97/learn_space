/* Carte mentale interactive : arbre horizontal à la façon de XMind.
   - clic sur une notion : définition dans le panneau ;
   - clic sur le rond : déplier / replier ;
   - glisser : déplacer ; molette ou pincement : zoom. */
(function () {
  "use strict";
  const LS = window.LS;
  const NS = "http://www.w3.org/2000/svg";
  // Unités de la carte : le texte des notions fait 16 unités ; on ne zoome jamais en dessous de
  // K_MIN pour qu'il reste à 14 px au moins à l'écran. Chaque notion a une zone de toucher de
  // TOUCHER unités (≥ 44 px à K_MIN), sans chevauchement grâce au pas vertical (hauteur + écart).
  const ECART_X = 56, ECART_Y = 16, TOUCHER = 52, K_MIN = 0.875, K_MAX = 2.2;
  const BOUT = 40; // place du bouton « déplier » entre une notion et ses enfants

  function svg(balise, attrs, parent) {
    const e = document.createElementNS(NS, balise);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const mesureur = typeof document !== "undefined" && document.createElement ? document.createElement("canvas").getContext("2d") : null;
  function largeurTexte(t, taille, gras, police) {
    if (!mesureur) return String(t).length * taille * 0.55;
    mesureur.font = (gras ? "700 " : "500 ") + taille + "px " + (police || LS.POLICE);
    return mesureur.measureText(t).width;
  }
  const etroit = el => el.getBoundingClientRect().width < 640;

  LS.CarteMentale = function (conteneur, panneau, carte) {
    LS.preparerCarte(carte);
    this.carte = carte;
    this.conteneur = conteneur;
    this.panneau = panneau;
    this.svg = svg("svg", { class: "carte-svg", width: "100%", height: "100%", role: "group", "aria-label": "Carte mentale : " + carte.titre }, conteneur);
    this.g = svg("g", {}, this.svg);
    this.vue = { x: 30, y: 0, k: 1 };
    this.choisi = null;
    // Au départ : la racine et ses branches seulement ; on déplie à la demande.
    const plies = LS.lire("plies2:" + carte.id, null);
    LS.noeudsCarte(carte).forEach(n => {
      n._plie = plies ? !!plies[n._id] : (n._niveau >= 1 && !!(n.c && n.c.length));
    });
    this.carte.racine._plie = false;
    this.ordre = LS.noeudsCarte(carte); // ordre de lecture (profondeur d'abord)
    this._interactions();
    this.dessiner();
    this.centrer();
  };

  const P = LS.CarteMentale.prototype;

  P.sauverPlies = function () {
    const p = {};
    LS.noeudsCarte(this.carte).forEach(n => { if (n._plie) p[n._id] = true; });
    LS.ecrire("plies2:" + this.carte.id, p);
  };

  /* Dimensions d'un nœud selon son niveau (en unités de la carte). */
  P._taille = function (n) {
    let w, h;
    if (n._niveau === 0) {
      w = Math.max(180, largeurTexte(n.t, 24, true, LS.POLICE_TITRE) + 56); h = 72;
    } else if (n._niveau === 1) {
      w = largeurTexte(n.t, 19, true, LS.POLICE_TITRE) + 44; h = 46;
    } else {
      w = largeurTexte(n.t, 16, false) + 26; h = 36;
    }
    if (n.tp) w += 46;
    n._w = w; n._h = h;
    n._hb = n.note ? 34 : 0; // bulle au-dessus
    n._ht = n.tag ? 32 : 0;  // étiquette en dessous
    return n;
  };

  /* Disposition à la façon de XMind : branches à droite et à gauche de la racine (une seule colonne
     à droite quand l'écran est étroit). */
  P._disposer = function () {
    const self = this;
    function bloc(n) {
      self._taille(n);
      const propre = Math.max(n._h, TOUCHER - ECART_Y) + n._hb + n._ht;
      const enfants = (!n._plie && n.c) ? n.c : [];
      let somme = 0;
      enfants.forEach((e, i) => { somme += bloc(e) + (i ? ECART_Y : 0); });
      n._bloc = Math.max(propre, somme);
      return n._bloc;
    }
    function placer(n, x, haut, dir) {
      n._x = x; n._dir = dir;
      n._cy = haut + n._bloc / 2 + (n._hb - n._ht) / 2;
      const enfants = (!n._plie && n.c) ? n.c : [];
      let somme = 0;
      enfants.forEach((e, i) => { somme += e._bloc + (i ? ECART_Y : 0); });
      let y = haut + (n._bloc - somme) / 2;
      enfants.forEach(e => {
        const xe = dir > 0 ? x + n._w + BOUT + ECART_X : x - BOUT - ECART_X - e._w;
        placer(e, xe, y, dir); y += e._bloc + ECART_Y;
      });
    }
    const r = this.carte.racine;
    self._taille(r);
    r._x = 0; r._cy = 0; r._dir = 0; r._hb = 0; r._ht = 0;
    const branches = r.c || [];
    branches.forEach(bloc);
    // Partage équilibré : la première moitié (en hauteur) à droite, le reste à gauche.
    const total = branches.reduce((a, e) => a + e._bloc + ECART_Y, 0);
    let droite = branches, gauche = [];
    if (!etroit(this.conteneur) && branches.length > 1) {
      let cumul = 0, coupe = branches.length;
      for (let i = 0; i < branches.length; i++) { cumul += branches[i]._bloc + ECART_Y; if (cumul >= total / 2) { coupe = i + 1; break; } }
      coupe = Math.min(coupe, branches.length - 1);
      droite = branches.slice(0, coupe); gauche = branches.slice(coupe);
    }
    const colonne = (liste, dir) => {
      const h = liste.reduce((a, e, i) => a + e._bloc + (i ? ECART_Y : 0), 0);
      let y = -h / 2;
      liste.forEach(e => {
        const xe = dir > 0 ? r._w + ECART_X : -ECART_X - e._w;
        placer(e, xe, y, dir); y += e._bloc + ECART_Y;
      });
    };
    colonne(droite, 1); colonne(gauche, -1);
  };

  P.dessiner = function () {
    this._disposer();
    const g = this.g;
    while (g.firstChild) g.removeChild(g.firstChild);
    const liens = svg("g", {}, g), noeuds = svg("g", {}, g);
    const self = this;
    const visibles = {};

    (function tracer(n) {
      visibles[LS.slug(n.t)] = n;
      const enfants = (!n._plie && n.c) ? n.c : [];
      enfants.forEach(e => {
        const droite = e._dir > 0;
        const bout = n._niveau === 0 ? 0 : BOUT;
        const x1 = droite ? n._x + n._w + bout : n._x - bout, y1 = n._cy;
        const x2 = droite ? e._x : e._x + e._w, y2 = e._cy;
        const mx = (x1 + x2) / 2;
        svg("path", { class: "lien-arbre", d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` }, liens);
        tracer(e);
      });
      self._noeud(n, noeuds);
    })(this.carte.racine);

    // Liens croisés (en pointillés), seulement si les deux bouts sont visibles.
    LS.noeudsCarte(this.carte).forEach(n => {
      (n.voir || []).forEach(v => {
        const cible = visibles[LS.slug(v)];
        if (!cible || !visibles[LS.slug(n.t)] || cible === n) return;
        const x1 = n._x + n._w / 2, y1 = n._cy + n._h / 2;
        const x2 = cible._x + cible._w / 2, y2 = cible._cy - cible._h / 2;
        const dx = Math.max(60, Math.abs(y2 - y1) / 2);
        svg("path", { class: "lien-croise", d: `M${x1},${y1} C${x1 - dx},${y1 + dx / 2} ${x2 - dx},${y2 - dx / 2} ${x2},${y2}` }, liens);
      });
    });
    this._appliquerVue();
  };

  P._noeud = function (n, parent) {
    const self = this;
    const cls = ["noeud", n._niveau === 0 ? "racine" : n._niveau === 1 ? "n1" : "feuille"];
    if (this.choisi === n) cls.push("choisi");
    const compris = LS.compris(n._id);
    if (compris) cls.push("compris");
    const grp = svg("g", { class: cls.join(" "), transform: `translate(${n._x},${n._cy - n._h / 2})`, tabindex: 0, role: "button",
      "aria-label": n.t + (n.tp ? ", avec un TP" : "") + (compris ? ", comprise" : "") }, parent);
    // Zone de toucher invisible, plus haute que le dessin.
    const ht = Math.max(n._h, TOUCHER);
    svg("rect", { class: "zone-toucher", x: -4, y: (n._h - ht) / 2, width: n._w + 8, height: ht }, grp);
    const r = n._niveau === 0 ? 20 : n._niveau === 1 ? 23 : 9;
    svg("rect", { class: "fond", width: n._w, height: n._h, rx: r, ry: r }, grp);
    const decal = n.tp ? 46 : 0;
    const t = svg("text", { x: (n._w - decal) / 2, y: n._h / 2, "text-anchor": "middle", "dominant-baseline": "central" }, grp);
    t.textContent = n.t;
    if (n.tp) {
      const b = svg("g", { class: "etiquette-tp", transform: `translate(${n._w - 44},${n._h / 2 - 12})` }, grp);
      svg("rect", { width: 36, height: 24, rx: 6 }, b);
      const tt = svg("text", { x: 18, y: 12, "text-anchor": "middle", "dominant-baseline": "central" }, b); tt.textContent = "TP";
    }
    if (compris && n._niveau > 0) {
      const c = svg("text", { class: "coche", x: n._dir < 0 ? n._w + 6 : -18, y: n._h / 2, "dominant-baseline": "central" }, grp); c.textContent = "✓";
    }
    const tronquer = (txt, taille, max) => {
      if (largeurTexte(txt, taille, false) <= max) return txt;
      let tx = txt;
      while (tx.length > 4 && largeurTexte(tx + "…", taille, false) > max) tx = tx.slice(0, -1);
      return tx.trim() + "…";
    };
    if (n.note) {
      const txt = tronquer(n.note, 16, Math.max(n._w + 40, 190));
      const w = largeurTexte(txt, 16, false) + 18;
      const b = svg("g", { class: "bulle", transform: `translate(0,${-33})` }, grp);
      svg("rect", { width: w, height: 28, rx: 7 }, b);
      const tb = svg("text", { x: 9, y: 14, "dominant-baseline": "central" }, b); tb.textContent = txt;
      const titre = svg("title", {}, b); titre.textContent = n.note;
    }
    if (n.tag) {
      const w = largeurTexte(n.tag, 16, false) + 16;
      const b = svg("g", { class: "tag", transform: `translate(0,${n._h + 4})` }, grp);
      svg("rect", { width: w, height: 26, rx: 6 }, b);
      const tb = svg("text", { x: 8, y: 13, "dominant-baseline": "central" }, b); tb.textContent = n.tag;
    }
    grp.addEventListener("click", ev => { ev.stopPropagation(); if (!self._aGlisse) self.choisir(n); });
    grp.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); self.choisir(n); } });
    if (n._niveau > 0 && n.c && n.c.length) {
      // Bouton « déplier » : une pastille lisible (+3 / −) avec une grande zone de toucher.
      const cx = n._dir < 0 ? -BOUT / 2 : n._w + BOUT / 2;
      const p = svg("g", { class: "plier" + (n._plie ? " ferme" : ""), transform: `translate(${cx},${n._h / 2})`, tabindex: 0, role: "button",
        "aria-label": (n._plie ? "Déplier " : "Replier ") + n.t + " (" + n.c.length + " notions)" }, grp);
      svg("circle", { class: "zone-toucher", r: 26 }, p);
      svg("rect", { x: -19, y: -14, width: 38, height: 28, rx: 14 }, p);
      const tp = svg("text", { "text-anchor": "middle", "dominant-baseline": "central" }, p);
      tp.textContent = n._plie ? "+" + n.c.length : "−";
      const agir = ev => { ev.stopPropagation(); if (!self._aGlisse) self.basculer(n); };
      p.addEventListener("click", agir);
      p.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); agir(ev); } });
    }
  };

  P.basculer = function (n, ouvert) {
    n._plie = ouvert === undefined ? !n._plie : !ouvert;
    this.sauverPlies();
    this.dessiner();
    if (!n._plie) this.montrer(n);
  };
  P.toutDeplier = function (oui) {
    LS.noeudsCarte(this.carte).forEach(n => { if (n.c && n.c.length) n._plie = !oui; });
    this.carte.racine._plie = false;
    this.sauverPlies();
    this.dessiner();
    this.centrer();
  };

  P.choisir = function (n, recentrer) {
    // Déplie le chemin jusqu'au nœud, et le nœud lui-même.
    let p = n._parent, change = false;
    while (p) { if (p._plie) { p._plie = false; change = true; } p = p._parent; }
    if (n.c && n.c.length && n._plie) { n._plie = false; change = true; }
    if (change) this.sauverPlies();
    this.choisi = n;
    this.dessiner();
    this.afficherPanneau(n);
    if (recentrer || change) this.montrer(n);
    try {
      const u = new URL(location.href);
      u.searchParams.set("n", LS.slug(n.t));
      history.replaceState(null, "", u);
    } catch (e) { /* cadre qui refuse */ }
  };

  P.fermerPanneau = function () { this.panneau.classList.add("cache"); if (this.surPanneau) this.surPanneau(false); };

  P.afficherPanneau = function (n) {
    const self = this, pan = this.panneau;
    pan.classList.remove("cache");
    if (this.surPanneau) this.surPanneau(true);
    pan.innerHTML = "";
    const chemin = [];
    let p = n._parent;
    while (p) { chemin.unshift(p.t); p = p._parent; }
    pan.append(LS.el("div", { class: "poignee", "aria-hidden": "true" }),
      LS.el("button", { class: "btn secondaire petit fermer", text: "Fermer", onclick: () => self.fermerPanneau() }));
    if (chemin.length) pan.append(LS.el("div", { class: "chemin", text: chemin.join(" › ") }));
    pan.append(LS.el("h2", { text: n.t }));
    if (n.note) pan.append(LS.el("div", { class: "note", html: LS.texte(n.note) }));
    if (n.tag) pan.append(LS.el("span", { class: "etiquette", text: n.tag }));
    const txt = LS.texteNiveau ? LS.texteNiveau(n, LS.niveau(LS.domaineDe("carte", this.carte.id))) : n.d;
    if (txt) pan.append(LS.el("div", { class: "definition", html: LS.texte(txt) }));
    else pan.append(LS.el("p", { class: "vide", text: "Pas encore de définition pour cette notion." }));
    if (n.f) pan.append(LS.el("div", { class: "formule", html: LS.texte(n.f) }));
    if (n.ex) pan.append(LS.el("div", { class: "note astuce", html: "<strong>Exemple :</strong> " + LS.texte(n.ex) }));
    if (n.an) pan.append(LS.el("div", { class: "note", html: "<strong>Analogie :</strong> " + LS.texte(n.an) }));
    if (n.attention) pan.append(LS.el("div", { class: "note attention", html: "<strong>Attention :</strong> " + LS.texte(n.attention) }));
    if (n.tp) {
      const tps = Array.isArray(n.tp) ? n.tp : [n.tp];
      tps.forEach(id => {
        const titre = (LS.tps[id] && LS.tps[id].titre) || (LS.catalogueTP && LS.catalogueTP[id]) || id;
        pan.append(LS.el("p", {}, [LS.el("a", { class: "btn", href: "tp.html?id=" + id, text: "TP : " + titre })]));
      });
    }
    if (n.c && n.c.length) {
      pan.append(LS.el("h3", { text: "Se décompose en" }));
      pan.append(LS.el("div", { class: "enfants" }, n.c.map(e => LS.el("button", { text: e.t, onclick: () => self.choisir(e, true) }))));
    }
    if (n.voir && n.voir.length) {
      pan.append(LS.el("h3", { text: "Voir aussi" }));
      pan.append(LS.el("div", { class: "enfants" }, n.voir.map(v => {
        const c = LS.chercherNoeud(self.carte, v);
        return c ? LS.el("button", { text: c.t, onclick: () => self.choisir(c, true) }) : null;
      })));
    }
    if (n._niveau > 0) {
      const cb = LS.el("input", { type: "checkbox" });
      cb.checked = LS.compris(n._id);
      cb.addEventListener("change", () => { LS.marquerCompris(n._id, cb.checked); self.dessiner(); self._majProgression(); });
      pan.append(LS.el("label", { class: "compris" }, [cb, LS.el("span", { text: "J'ai compris cette notion" })]));
    }
    const i = this.ordre.indexOf(n);
    const nav = LS.el("div", { class: "nav-notions" });
    if (i > 0) nav.append(LS.el("button", { class: "btn secondaire petit", text: "← Précédente", onclick: () => self.choisir(self.ordre[i - 1], true) }));
    if (i < this.ordre.length - 1) nav.append(LS.el("button", { class: "btn petit", text: "Notion suivante →", onclick: () => self.choisir(self.ordre[i + 1], true) }));
    pan.append(nav);
    pan.scrollTop = 0;
    this._gestePanneau();
  };

  // Au téléphone : glisser la poignée vers le bas ferme le panneau.
  P._gestePanneau = function () {
    const self = this, pan = this.panneau, poignee = pan.querySelector(".poignee");
    if (!poignee || pan._geste) return;
    pan._geste = true;
    let y0 = null;
    pan.addEventListener("pointerdown", e => { if (e.target.closest(".poignee") || (e.clientY - pan.getBoundingClientRect().top < 28)) { y0 = e.clientY; } });
    pan.addEventListener("pointerup", e => { if (y0 !== null && e.clientY - y0 > 50) self.fermerPanneau(); y0 = null; });
    pan.addEventListener("pointercancel", () => { y0 = null; });
  };

  P._majProgression = function () {
    if (this.surProgression) this.surProgression(LS.progressionCarte(this.carte));
  };

  /* ---------- Vue : déplacement et zoom ---------- */
  P._appliquerVue = function () {
    const v = this.vue;
    this.g.setAttribute("transform", `translate(${v.x},${v.y}) scale(${v.k})`);
  };
  // Hauteur réellement visible de la carte (au téléphone, le panneau du bas en cache une partie).
  P._hauteurUtile = function (r) {
    const pan = this.panneau;
    if (pan && !pan.classList.contains("cache") && getComputedStyle(pan).position === "absolute") return Math.max(120, r.height - pan.getBoundingClientRect().height);
    return r.height;
  };
  P.centrer = function () {
    const r = this.svg.getBoundingClientRect();
    if (!r.width) return;
    const racine = this.carte.racine;
    const bb = this.g.getBBox();
    const h = this._hauteurUtile(r);
    const ajuste = Math.min((r.width - 32) / bb.width, (h - 32) / bb.height);
    const k = Math.min(1.4, Math.max(K_MIN, ajuste));
    this.vue.k = k;
    if (bb.width * k <= r.width - 16) this.vue.x = (r.width - bb.width * k) / 2 - bb.x * k;
    else this.vue.x = (etroit(this.conteneur) ? 16 : r.width / 2 - racine._w / 2 * k) - racine._x * k;
    if (bb.height * k <= h - 16) this.vue.y = (h - bb.height * k) / 2 - bb.y * k;
    else this.vue.y = h / 2 - racine._cy * k;
    this._appliquerVue();
  };
  P.montrer = function (n) {
    const r = this.svg.getBoundingClientRect();
    const v = this.vue, h = this._hauteurUtile(r), k = v.k, M = 12;
    // Étendue horizontale à rendre visible : la notion, et ses enfants s'ils sont dépliés.
    let gauche = n._x, droite = n._x + n._w;
    if (n._niveau > 0 && n.c && n.c.length) { if (n._dir < 0) gauche -= BOUT; else droite += BOUT; }
    if (!n._plie && n.c && n.c.length) n.c.forEach(e => { gauche = Math.min(gauche, e._x - (e.c && e.c.length && e._dir < 0 ? BOUT : 0)); droite = Math.max(droite, e._x + e._w + (e.c && e.c.length && e._dir > 0 ? BOUT : 0)); });
    const sg = gauche * k + v.x, sd = droite * k + v.x, sy = n._cy * k + v.y;
    if (sg < M || sd > r.width - M || sy < 30 || sy > h - 30) {
      if ((droite - gauche) * k <= r.width - 2 * M) v.x = (r.width - (droite - gauche) * k) / 2 - gauche * k;
      else if (n._dir < 0) v.x = M - gauche * k;              // trop large : on privilégie les enfants
      else v.x = r.width - M - droite * k;
      // La notion elle-même doit rester visible.
      const nx = n._x * k + v.x;
      if (nx < M && n._dir >= 0 && (n._plie || !n.c)) v.x += M - nx;
      v.y = h / 2 - n._cy * k;
      this._appliquerVue();
    }
  };
  P.zoom = function (f, cx, cy) {
    const v = this.vue;
    const r = this.svg.getBoundingClientRect();
    if (cx === undefined) { cx = r.width / 2; cy = this._hauteurUtile(r) / 2; }
    const k = Math.min(K_MAX, Math.max(K_MIN, v.k * f));
    v.x = cx - (cx - v.x) * (k / v.k);
    v.y = cy - (cy - v.y) * (k / v.k);
    v.k = k;
    this._appliquerVue();
  };

  P._interactions = function () {
    const self = this, s = this.svg;
    const pointeurs = new Map();
    let depart = null, pince = null;
    s.addEventListener("pointerdown", e => {
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      self._aGlisse = false;
      if (pointeurs.size === 1) depart = { x: e.clientX, y: e.clientY, vx: self.vue.x, vy: self.vue.y };
      if (pointeurs.size === 2) {
        const [a, b] = [...pointeurs.values()];
        const r = s.getBoundingClientRect();
        pince = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: self.vue.k, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, vx: self.vue.x, vy: self.vue.y };
        self._aGlisse = true;
      }
    });
    s.addEventListener("pointermove", e => {
      if (!pointeurs.has(e.pointerId)) return;
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointeurs.size === 2 && pince) {
        // Pincer : zoom autour du point de départ des deux doigts, et déplacement de ce point.
        const [a, b] = [...pointeurs.values()];
        const r = s.getBoundingClientRect();
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const k = Math.min(K_MAX, Math.max(K_MIN, pince.k * d / pince.d));
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        self.vue.k = k;
        self.vue.x = mx - (pince.cx - pince.vx) * (k / pince.k);
        self.vue.y = my - (pince.cy - pince.vy) * (k / pince.k);
        self._appliquerVue();
      } else if (depart && pointeurs.size === 1) {
        const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) {
          if (!self._aGlisse) { try { s.setPointerCapture(e.pointerId); } catch (_) { /* rien */ } }
          self._aGlisse = true; s.classList.add("glisse");
        }
        if (self._aGlisse) {
          self.vue.x = depart.vx + dx; self.vue.y = depart.vy + dy;
          self._appliquerVue();
        }
      }
    });
    const fin = e => {
      pointeurs.delete(e.pointerId);
      if (pointeurs.size < 2) pince = null;
      if (pointeurs.size === 1) { const [a] = [...pointeurs.values()]; depart = { x: a.x, y: a.y, vx: self.vue.x, vy: self.vue.y }; }
      if (pointeurs.size === 0) { depart = null; s.classList.remove("glisse"); }
    };
    s.addEventListener("pointerup", fin);
    s.addEventListener("pointercancel", fin);
    s.addEventListener("wheel", e => {
      e.preventDefault();
      const r = s.getBoundingClientRect();
      self.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    // Redessiner si la largeur change beaucoup (passage portrait / paysage, panneau).
    let largeur = 0;
    const surTaille = () => {
      const w = s.getBoundingClientRect().width;
      if (Math.abs(w - largeur) > 40) { const avant = largeur; largeur = w; if (avant && (avant < 640) !== (w < 640)) { self.dessiner(); self.centrer(); } }
    };
    if (window.ResizeObserver) new ResizeObserver(surTaille).observe(s); else window.addEventListener("resize", surTaille);
  };

  /* ---------- Révision par fiches ---------- */
  LS.revision = function (carte, surFin) {
    LS.preparerCarte(carte);
    let fiches = LS.noeudsCarte(carte).filter(n => n._niveau > 0 && n.d);
    const nonCompris = fiches.filter(n => !LS.compris(n._id));
    fiches = (nonCompris.length ? nonCompris : fiches).sort(() => Math.random() - 0.5);
    let i = 0, sus = 0;
    const fond = LS.el("div", { class: "revision", role: "dialog", "aria-modal": "true" });
    const fiche = LS.el("div", { class: "fiche" });
    fond.append(fiche);
    document.body.append(fond);
    function fermer() { fond.remove(); if (surFin) surFin(); }
    fond.addEventListener("click", e => { if (e.target === fond) fermer(); });
    function montrer() {
      fiche.innerHTML = "";
      if (i >= fiches.length) {
        fiche.append(LS.el("h2", { text: "Révision terminée" }),
          LS.el("p", { text: `${sus} notion(s) sue(s) sur ${fiches.length}.` }),
          LS.el("div", { class: "actions" }, [LS.el("button", { class: "btn", text: "Fermer", onclick: fermer })]));
        return;
      }
      const n = fiches[i];
      let chemin = [], p = n._parent;
      while (p) { chemin.unshift(p.t); p = p._parent; }
      fiche.append(LS.el("div", { class: "etiquette", text: `${i + 1} / ${fiches.length} · ${chemin.join(" › ")}` }),
        LS.el("h2", { text: n.t }),
        LS.el("p", { text: "Explique cette notion avec tes mots, puis vérifie." }));
      const rep = LS.el("div", { class: "reponse cache-tout", html: LS.texte(LS.texteNiveau ? LS.texteNiveau(n, LS.niveau(LS.domaineDe("carte", carte.id))) : n.d) + (n.f ? `<div class="formule">${LS.texte(n.f)}</div>` : "") });
      const actions = LS.el("div", { class: "actions" });
      const voir = LS.el("button", { class: "btn", text: "Voir la définition", onclick: () => {
        rep.classList.remove("cache-tout"); voir.remove();
        actions.append(
          LS.el("button", { class: "btn secondaire", text: "À revoir", onclick: () => { i++; montrer(); } }),
          LS.el("button", { class: "btn", text: "Je savais ✓", onclick: () => { LS.marquerCompris(n._id, true); sus++; i++; montrer(); } }));
      } });
      actions.append(voir, LS.el("button", { class: "btn secondaire", text: "Arrêter", onclick: fermer }));
      fiche.append(rep, actions);
    }
    montrer();
  };
})();
