/* Carte mentale interactive : arbre horizontal à la façon de XMind.
   - clic sur une notion : définition dans le panneau ;
   - clic sur le rond : déplier / replier ;
   - glisser : déplacer ; molette ou pincement : zoom. */
(function () {
  "use strict";
  const LS = window.LS;
  const NS = "http://www.w3.org/2000/svg";
  const ECART_X = 56, ECART_Y = 14;

  function svg(balise, attrs, parent) {
    const e = document.createElementNS(NS, balise);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const mesureur = document.createElement("canvas").getContext("2d");
  function largeurTexte(t, taille, gras, police) {
    mesureur.font = (gras ? "700 " : "500 ") + taille + "px " + (police || "Nunito, Segoe UI, sans-serif");
    return mesureur.measureText(t).width;
  }

  LS.CarteMentale = function (conteneur, panneau, carte) {
    LS.preparerCarte(carte);
    this.carte = carte;
    this.conteneur = conteneur;
    this.panneau = panneau;
    this.svg = svg("svg", { class: "carte-svg", width: "100%", height: "100%" }, conteneur);
    this.g = svg("g", {}, this.svg);
    this.vue = { x: 30, y: 0, k: 1 };
    this.choisi = null;
    // État plié : par défaut, on montre les deux premiers niveaux.
    const plies = LS.lire("plies:" + carte.id, null);
    LS.noeudsCarte(carte).forEach(n => {
      n._plie = plies ? !!plies[n._id] : (n._niveau >= 2 && !!(n.c && n.c.length));
    });
    this.ordre = LS.noeudsCarte(carte); // ordre de lecture (profondeur d'abord)
    this._interactions();
    this.dessiner();
    this.centrer();
  };

  const P = LS.CarteMentale.prototype;

  P.sauverPlies = function () {
    const p = {};
    LS.noeudsCarte(this.carte).forEach(n => { if (n._plie) p[n._id] = true; });
    LS.ecrire("plies:" + this.carte.id, p);
  };

  /* Dimensions d'un nœud selon son niveau. */
  P._taille = function (n) {
    let w, h;
    if (n._niveau === 0) {
      w = Math.max(160, largeurTexte(n.t, 22, true, "Kalam, cursive") + 50); h = 70;
    } else if (n._niveau === 1) {
      w = largeurTexte(n.t, 17, true, "Kalam, cursive") + 40; h = 40;
    } else {
      w = largeurTexte(n.t, 14, false) + 18; h = 28;
    }
    if (n.tp) w += 18;
    n._w = w; n._h = h;
    n._hb = n.note ? 26 : 0; // bulle au-dessus
    n._ht = n.tag ? 22 : 0;  // étiquette en dessous
    return n;
  };

  P._disposer = function () {
    const self = this;
    function bloc(n) {
      self._taille(n);
      const propre = n._h + n._hb + n._ht;
      const enfants = (!n._plie && n.c) ? n.c : [];
      let somme = 0;
      enfants.forEach((e, i) => { somme += bloc(e) + (i ? ECART_Y : 0); });
      n._bloc = Math.max(propre, somme);
      return n._bloc;
    }
    function placer(n, x, haut) {
      n._x = x;
      n._cy = haut + n._bloc / 2 + (n._hb - n._ht) / 2;
      const enfants = (!n._plie && n.c) ? n.c : [];
      let somme = 0;
      enfants.forEach((e, i) => { somme += e._bloc + (i ? ECART_Y : 0); });
      let y = haut + (n._bloc - somme) / 2;
      const xe = x + n._w + ECART_X + (n.c && n.c.length ? 10 : 0);
      enfants.forEach(e => { placer(e, xe, y); y += e._bloc + ECART_Y; });
    }
    bloc(this.carte.racine);
    placer(this.carte.racine, 0, 0);
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
        const x1 = n._x + n._w + (n.c && n.c.length ? 10 : 0), y1 = n._cy;
        const x2 = e._x, y2 = e._cy;
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
    if (LS.compris(n._id)) cls.push("compris");
    const grp = svg("g", { class: cls.join(" "), transform: `translate(${n._x},${n._cy - n._h / 2})`, tabindex: 0, role: "button", "aria-label": n.t }, parent);
    const r = n._niveau === 0 ? 18 : n._niveau === 1 ? 20 : 8;
    svg("rect", { width: n._w, height: n._h, rx: r, ry: r }, grp);
    const t = svg("text", { x: n.tp ? (n._w - 18) / 2 : n._w / 2, y: n._h / 2 + 5, "text-anchor": "middle" }, grp);
    t.textContent = n.t;
    if (n.tp) { const i = svg("text", { class: "icone-tp", x: n._w - 16, y: n._h / 2 + 5 }, grp); i.textContent = "🔧"; }
    if (LS.compris(n._id) && n._niveau > 0) {
      const c = svg("text", { class: "coche", x: -14, y: n._h / 2 + 5 }, grp); c.textContent = "✓";
    }
    const tronquer = (txt, taille, max) => {
      if (largeurTexte(txt, taille, false) <= max) return txt;
      let t = txt;
      while (t.length > 4 && largeurTexte(t + "…", taille, false) > max) t = t.slice(0, -1);
      return t.trim() + "…";
    };
    if (n.note) {
      const txt = tronquer(n.note, 12, Math.max(n._w + 40, 150));
      const w = largeurTexte(txt, 12, false) + 16;
      const b = svg("g", { class: "bulle", transform: `translate(0,${-26})` }, grp);
      svg("rect", { width: w, height: 21, rx: 6 }, b);
      const tb = svg("text", { x: 8, y: 15 }, b); tb.textContent = txt;
      const titre = svg("title", {}, b); titre.textContent = n.note;
    }
    if (n.tag) {
      const w = largeurTexte(n.tag, 11, false) + 14;
      const b = svg("g", { class: "tag", transform: `translate(0,${n._h + 4})` }, grp);
      svg("rect", { width: w, height: 17, rx: 5 }, b);
      const tb = svg("text", { x: 7, y: 12.5 }, b); tb.textContent = n.tag;
    }
    grp.addEventListener("click", ev => { ev.stopPropagation(); if (!self._aGlisse) self.choisir(n); });
    grp.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); self.choisir(n); } });
    if (n.c && n.c.length) {
      const p = svg("g", { class: "plier", transform: `translate(${n._w + 10},${n._h / 2})` }, grp);
      svg("circle", { r: 9 }, p);
      const tp = svg("text", { "text-anchor": "middle", y: 4 }, p);
      tp.textContent = n._plie ? String(n.c.length) : "−";
      p.addEventListener("click", ev => { ev.stopPropagation(); if (!self._aGlisse) self.basculer(n); });
    }
  };

  P.basculer = function (n, ouvert) {
    n._plie = ouvert === undefined ? !n._plie : !ouvert;
    this.sauverPlies();
    this.dessiner();
  };
  P.toutDeplier = function (oui) {
    LS.noeudsCarte(this.carte).forEach(n => { if (n.c && n.c.length) n._plie = !oui; });
    if (!oui) this.carte.racine._plie = false;
    this.sauverPlies();
    this.dessiner();
    this.centrer();
  };

  P.choisir = function (n, recentrer) {
    // Déplie le chemin jusqu'au nœud.
    let p = n._parent, change = false;
    while (p) { if (p._plie) { p._plie = false; change = true; } p = p._parent; }
    if (n.c && n.c.length && n._plie) { n._plie = false; change = true; }
    if (change) this.sauverPlies();
    this.choisi = n;
    this.dessiner();
    this.afficherPanneau(n);
    if (recentrer) this.montrer(n);
    const u = new URL(location.href);
    u.searchParams.set("n", LS.slug(n.t));
    history.replaceState(null, "", u);
  };

  P.afficherPanneau = function (n) {
    const self = this, pan = this.panneau;
    pan.classList.remove("cache");
    pan.innerHTML = "";
    const chemin = [];
    let p = n._parent;
    while (p) { chemin.unshift(p.t); p = p._parent; }
    pan.append(LS.el("button", { class: "btn secondaire petit fermer", text: "✕", title: "Fermer", onclick: () => pan.classList.add("cache") }));
    if (chemin.length) pan.append(LS.el("div", { class: "chemin", text: chemin.join(" › ") }));
    pan.append(LS.el("h2", { text: n.t }));
    if (n.note) pan.append(LS.el("div", { class: "note", html: "💬 " + LS.texte(n.note) }));
    if (n.tag) pan.append(LS.el("span", { class: "etiquette", text: n.tag }));
    if (n.d) pan.append(LS.el("div", { class: "definition", html: LS.texte(n.d) }));
    else pan.append(LS.el("p", { class: "vide", text: "Pas encore de définition pour cette notion." }));
    if (n.f) pan.append(LS.el("div", { class: "formule", html: LS.texte(n.f) }));
    if (n.ex) pan.append(LS.el("div", { class: "note astuce", html: "<strong>Exemple :</strong> " + LS.texte(n.ex) }));
    if (n.an) pan.append(LS.el("div", { class: "note", html: "<strong>Analogie :</strong> " + LS.texte(n.an) }));
    if (n.attention) pan.append(LS.el("div", { class: "note attention", html: "<strong>Attention :</strong> " + LS.texte(n.attention) }));
    if (n.tp) {
      const tps = Array.isArray(n.tp) ? n.tp : [n.tp];
      tps.forEach(id => {
        const titre = (LS.tps[id] && LS.tps[id].titre) || (LS.catalogueTP && LS.catalogueTP[id]) || id;
        pan.append(LS.el("p", {}, [LS.el("a", { class: "btn", href: "tp.html?id=" + id, text: "🔧 TP : " + titre })]));
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
    const nav = LS.el("div", { style: "display:flex;gap:8px;margin-top:14px;flex-wrap:wrap" });
    if (i > 0) nav.append(LS.el("button", { class: "btn secondaire petit", text: "← Précédente", onclick: () => self.choisir(self.ordre[i - 1], true) }));
    if (i < this.ordre.length - 1) nav.append(LS.el("button", { class: "btn petit", text: "Notion suivante →", onclick: () => self.choisir(self.ordre[i + 1], true) }));
    pan.append(nav);
    pan.scrollTop = 0;
  };

  P._majProgression = function () {
    if (this.surProgression) this.surProgression(LS.progressionCarte(this.carte));
  };

  /* ---------- Vue : déplacement et zoom ---------- */
  P._appliquerVue = function () {
    const v = this.vue;
    this.g.setAttribute("transform", `translate(${v.x},${v.y}) scale(${v.k})`);
  };
  P.centrer = function () {
    const r = this.svg.getBoundingClientRect();
    const racine = this.carte.racine;
    const bb = this.g.getBBox();
    const k = Math.min(1, Math.max(0.35, Math.min((r.width - 40) / bb.width, (r.height - 40) / bb.height)));
    this.vue.k = k;
    this.vue.x = 20 - bb.x * k;
    this.vue.y = r.height / 2 - racine._cy * k;
    this._appliquerVue();
  };
  P.montrer = function (n) {
    const r = this.svg.getBoundingClientRect();
    const v = this.vue;
    const sx = n._x * v.k + v.x, sy = n._cy * v.k + v.y;
    const largeurUtile = r.width;
    if (sx < 20 || sx + n._w * v.k > largeurUtile - 20 || sy < 40 || sy > r.height - 40) {
      v.x = Math.min(40, largeurUtile / 3 - n._x * v.k);
      v.y = r.height / (window.innerWidth <= 800 ? 4 : 2) - n._cy * v.k;
      this._appliquerVue();
    }
  };
  P.zoom = function (f, cx, cy) {
    const v = this.vue;
    const r = this.svg.getBoundingClientRect();
    if (cx === undefined) { cx = r.width / 2; cy = r.height / 2; }
    const k = Math.min(2.5, Math.max(0.2, v.k * f));
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
        pince = { d: Math.hypot(a.x - b.x, a.y - b.y), k: self.vue.k };
      }
    });
    s.addEventListener("pointermove", e => {
      if (!pointeurs.has(e.pointerId)) return;
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointeurs.size === 2 && pince) {
        const [a, b] = [...pointeurs.values()];
        const r = s.getBoundingClientRect();
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        self.zoom((pince.k * d / pince.d) / self.vue.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        self._aGlisse = true;
      } else if (depart) {
        const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) {
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
      if (pointeurs.size === 0) { depart = null; s.classList.remove("glisse"); }
    };
    s.addEventListener("pointerup", fin);
    s.addEventListener("pointercancel", fin);
    s.addEventListener("wheel", e => {
      e.preventDefault();
      const r = s.getBoundingClientRect();
      self.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
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
      const rep = LS.el("div", { class: "reponse cache-tout", html: LS.texte(n.d) + (n.f ? `<div class="formule">${LS.texte(n.f)}</div>` : "") });
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
