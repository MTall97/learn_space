/* Éditeur de schémas interactif, commun aux circuits électriques et logiques.
   - palette : choisir un composant puis cliquer sur la plaque ;
   - fils : glisser depuis une borne (ou mode « Fil ») jusqu'à un autre point ;
   - clic sur un composant : réglages et mesures ; clic sur un interrupteur : le basculer ;
   - simulation en continu, courant animé, oscilloscope et multimètre (circuits électriques). */
(function () {
  "use strict";
  const LS = window.LS;
  const NS = "http://www.w3.org/2000/svg";
  const P = 20; // pixels par unité de grille
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

  function svg(balise, attrs, parent) {
    const e = document.createElementNS(NS, balise);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const normaliserE12 = v => {
    const dec = Math.pow(10, Math.floor(Math.log10(v)));
    let best = E12[0] * dec;
    for (const m of E12.concat([10])) if (Math.abs(Math.log(m * dec / v)) < Math.abs(Math.log(best / v))) best = m * dec;
    return +best.toPrecision(3);
  };
  LS.normaliserE12 = normaliserE12;

  function Editeur(conteneur, opts) {
    this.opts = opts;
    this.reg = opts.registre;
    this.largeur = opts.largeur || 40;
    this.hauteur = opts.hauteur || 24;
    this.cleSauvegarde = opts.cleSauvegarde || null;
    this.mode = "choix";
    this.placer = null;
    this.choix = null;
    this.vitesse = opts.vitesse || 1;
    this.enMarche = true;
    this.electrons = false;
    this.couleursPotentiel = opts.couleursPotentiel !== false;
    this.phases = new Map();
    this.ecouteurs = [];
    this._construireDOM(conteneur);
    this.charger(this._schemaInitial(), true);
    if (opts.oscillo) {
      opts.oscillo.forEach((v, i) => { const c = this.trouver(v.nom); if (c) this.surOscillo(c, i, v.g); });
    }
    if (opts.multimetre) this.basculerMultimetre(true);
    this._boucle();
  }
  const E = Editeur.prototype;

  /* ---------- Schéma ---------- */
  E._schemaInitial = function () {
    if (this.cleSauvegarde) {
      const s = LS.lire(this.cleSauvegarde, null);
      if (s && s.compos) {
        // Les éléments verrouillés reprennent toujours les réglages du TP ; un montage sauvegardé avant
        // l'ajout d'un élément imposé repart du montage du TP.
        const imposes = ((this.opts.schema || {}).compos || []).filter(c => c.verrou);
        if (imposes.some(c => !s.compos.some(x => x.nom === c.nom && x.type === c.type))) return JSON.parse(JSON.stringify(this.opts.schema));
        imposes.forEach(c => { const x = s.compos.find(y => y.nom === c.nom); x.verrou = true; x.fixe = true; x.p = JSON.parse(JSON.stringify(c.p || {})); });
        return s;
      }
    }
    return JSON.parse(JSON.stringify(this.opts.schema || { compos: [], fils: [] }));
  };
  E.charger = function (schema, premier) {
    const self = this;
    schema.compos = schema.compos || [];
    schema.fils = schema.fils || [];
    let n = 0;
    schema.compos.forEach(c => {
      c.id = c.id || "c" + (++n) + "_" + Math.random().toString(36).slice(2, 6);
      c.rot = c.rot || 0;
      const def = self.reg[c.type];
      c.p = Object.assign(self._defauts(def), c.p || {});
    });
    schema.fils.forEach(f => { f.id = f.id || "f" + Math.random().toString(36).slice(2, 9); });
    schema.compos.forEach(c => { if (!c.nom) c.nom = self._nomLibre(self.reg[c.type].prefixe, schema); });
    this.schema = schema;
    this.choix = null;
    this.phases.clear();
    if (this.multimetre) this._installerMultimetre();
    this._preparer();
    if (!premier) this._sauver();
  };
  E._defauts = function (def) {
    const p = {};
    (def.props || []).forEach(q => { p[q.k] = q.defaut; });
    return p;
  };
  E._nomLibre = function (prefixe, schema) {
    schema = schema || this.schema;
    let i = 1;
    while (schema.compos.some(c => c.nom === prefixe + i)) i++;
    return prefixe + i;
  };
  E._sauver = function () {
    if (!this.cleSauvegarde) return;
    const propre = {
      compos: this.schema.compos.filter(c => !c.virtuel).map(c => ({ type: c.type, x: c.x, y: c.y, rot: c.rot, p: c.p, nom: c.nom, fixe: c.fixe, verrou: c.verrou, cache: c.cache, etat: c.etat && c.etat.grille ? { grille: true } : undefined })),
      fils: this.schema.fils.map(f => ({ pts: f.pts, coupe: f.coupe, fixe: f.fixe }))
    };
    LS.ecrire(this.cleSauvegarde, propre);
  };
  E.reinitialiser = function () {
    if (this.cleSauvegarde) LS.ecrire(this.cleSauvegarde, null);
    this.charger(JSON.parse(JSON.stringify(this.opts.schema || { compos: [], fils: [] })), true);
    this._signaler();
  };
  E._preparer = function () {
    this.sim = this.opts.moteur.creer(this.schema, this.reg, this);
    this.sim.preparer();
    this.rendu();
    this._afficherProprietes();
  };
  E._modifie = function () {
    this.sim.preparer();
    this.rendu();
    this._afficherProprietes();
    this._sauver();
    this._signaler();
  };
  E._signaler = function () { this.ecouteurs.forEach(f => f(this)); };
  E.surChangement = function (f) { this.ecouteurs.push(f); };

  /* ---------- Accès pour les TP ---------- */
  E.liste = function (type) { return this.schema.compos.filter(c => !c.virtuel && (!type || c.type === type)); };
  E.trouver = function (nom) { return this.schema.compos.find(c => c.nom === nom) || null; };
  E.U = function (c) { return c && c._nets ? this.sim.tension(c._nets[0]) - this.sim.tension(c._nets[1]) : 0; };
  E.I = function (c) { return c && c._i ? c._i[0] : 0; };
  E.memeNet = function (c1, b1, c2, b2) { return c1 && c2 && c1._nets && c2._nets && c1._nets[b1] !== undefined && c1._nets[b1] === c2._nets[b2]; };

  /* ---------- Construction de l'interface ---------- */
  E._construireDOM = function (conteneur) {
    const self = this;
    conteneur.classList.add("sim", "editeur-circuit");
    const barre = LS.el("div", { class: "sim-barre" });
    // Palette par catégorie
    const types = (this.opts.palette || Object.keys(this.reg)).filter(t => this.reg[t] && !this.reg[t].cache);
    this.palette = LS.el("div", { class: "palette" });
    types.forEach(t => {
      const def = this.reg[t];
      const b = LS.el("button", { title: def.nom, "data-type": t, onclick: () => self._choisirPalette(t, b) });
      const mini = svg("svg", { viewBox: "-8 -34 96 68", class: "circuit-svg" });
      this._dessinerCompo(mini, { type: t, x: 0, y: 0, rot: 0, p: this._defauts(def), id: "mini" }, true);
      b.append(mini, LS.el("span", { text: def.court || def.nom }));
      this.palette.append(b);
    });
    this.btnChoix = LS.el("button", { class: "btn petit secondaire actif", text: "Déplacer", title: "Sélectionner et déplacer", onclick: () => self._mode("choix") });
    this.btnFil = LS.el("button", { class: "btn petit secondaire", text: "Fil", title: "Tracer des fils (on peut aussi glisser depuis une borne)", onclick: () => self._mode("fil") });
    this.btnMarche = LS.el("button", { class: "btn petit", text: "Pause", onclick: () => self.basculerMarche() });
    const vit = LS.el("select", { title: "Vitesse de la simulation", onchange: e => { self.vitesse = +e.target.value; } });
    [[1, "temps réel"], [0.1, "ralenti ×10"], [0.01, "ralenti ×100"], [0.001, "ralenti ×1000"]].forEach(([v, t]) => {
      const o = LS.el("option", { value: v, text: t }); if (v === this.vitesse) o.selected = true; vit.append(o);
    });
    this.selVitesse = vit;
    const outils = [this.btnChoix, this.btnFil, LS.el("span", { class: "sep" }), this.btnMarche, vit];
    if (this.opts.electrique) {
      const cbE = LS.el("label", { class: "outil-avance", style: "font-size:.85rem;display:flex;gap:4px;align-items:center" }, [
        LS.el("input", { type: "checkbox", onchange: e => { self.electrons = e.target.checked; } }), "sens des électrons"]);
      const cbC = LS.el("label", { class: "outil-avance", style: "font-size:.85rem;display:flex;gap:4px;align-items:center" }, [
        LS.el("input", { type: "checkbox", checked: this.couleursPotentiel ? "checked" : null, onchange: e => { self.couleursPotentiel = e.target.checked; } }), "couleurs des potentiels"]);
      this.btnMM = LS.el("button", { class: "btn petit secondaire", text: "Multimètre", onclick: () => self.basculerMultimetre() });
      this.btnOsc = LS.el("button", { class: "btn petit secondaire outil-avance", text: "Oscilloscope", onclick: () => self.basculerOscillo() });
      outils.push(LS.el("span", { class: "sep" }), this.btnMM, this.btnOsc, cbE, cbC);
    }
    outils.push(LS.el("span", { class: "sep" }),
      LS.el("button", { class: "btn petit secondaire", text: "Réparer", title: "Remplace les composants grillés", onclick: () => self.reparer() }),
      LS.el("button", { class: "btn petit secondaire", text: "Recommencer", title: "Revenir au montage de départ", onclick: ev => LS.confirmer(ev.currentTarget, () => self.reinitialiser(), "Revenir au départ ?") }));
    // Vue de la plaque : zoom et cadrage (indispensables au téléphone, où la plaque est plus large que l'écran).
    outils.push(LS.el("span", { class: "sep" }),
      LS.el("button", { class: "btn petit secondaire", text: "Zoom +", title: "Agrandir la plaque", "aria-label": "Agrandir la plaque", onclick: () => self.zoomer(1 / 1.4) }),
      LS.el("button", { class: "btn petit secondaire", text: "Zoom −", title: "Réduire la plaque", "aria-label": "Réduire la plaque", onclick: () => self.zoomer(1.4) }),
      LS.el("button", { class: "btn petit secondaire", text: "Tout voir", title: "Cadrer tout le montage", onclick: () => self.toutVoir() }));
    barre.append(...outils);
    const barrePalette = LS.el("div", { class: "sim-barre" }, [this.palette]);
    if (!types.length) barrePalette.classList.add("cache-tout");

    this.zone = LS.el("div", { class: "circuit-zone" });
    this.svg = svg("svg", { class: "circuit-svg", viewBox: `-10 -10 ${this.largeur * P + 20} ${this.hauteur * P + 20}` });
    this.svg.style.width = "100%"; this.svg.style.display = "block";
    this.vue = { x: -10, y: -10, w: this.largeur * P + 20, h: this.hauteur * P + 20 };
    const defs = svg("defs", {}, this.svg);
    const pat = svg("pattern", { id: "grille-pts-" + Math.random().toString(36).slice(2, 7), width: P, height: P, patternUnits: "userSpaceOnUse", x: -1.5, y: -1.5 }, defs);
    svg("circle", { cx: 1.5, cy: 1.5, r: 1.3, class: "grille-pt" }, pat);
    svg("rect", { x: 0, y: 0, width: this.largeur * P, height: this.hauteur * P, fill: `url(#${pat.id})` }, this.svg);
    this.calqueFils = svg("g", {}, this.svg);
    this.calqueCompos = svg("g", {}, this.svg);
    this.calqueJonctions = svg("g", {}, this.svg);
    this.calquePoints = svg("g", {}, this.svg);
    this.calqueSondes = svg("g", {}, this.svg);
    this.calqueApercu = svg("g", {}, this.svg);
    this.zone.append(this.svg);

    this.panneauMM = LS.el("div", { class: "multimetre cache-tout" });
    this.panneauOsc = LS.el("div", { class: "oscillo cache-tout" });
    this.proprietes = LS.el("div", { class: "proprietes" });
    conteneur.append(barre, barrePalette, LS.el("div", { class: "circuit-et-mm" }, [this.zone, this.panneauMM]), this.panneauOsc, this.proprietes);
    this._evenements();
    this._gestesTactiles();
    document.addEventListener("ls:theme", () => self.rendu());
    // Cadrage initial, puis de nouveau quand la largeur change (tant que l'apprenant n'a pas zoomé lui-même).
    requestAnimationFrame(() => self.toutVoir(true));
    if (window.ResizeObserver) {
      let largeurAvant = 0;
      new ResizeObserver(() => {
        const l = self.zone.clientWidth;
        if (Math.abs(l - largeurAvant) < 2) return;
        largeurAvant = l;
        if (self.vueManuelle) self._appliquerVue(); else self.toutVoir(true);
      }).observe(this.zone);
    }
  };

  E._mode = function (m) {
    this.mode = m;
    if (m !== "placer") { this.placer = null; this.palette.querySelectorAll("button").forEach(b => b.classList.remove("actif")); }
    this.btnChoix.classList.toggle("actif", m === "choix");
    this.btnFil.classList.toggle("actif", m === "fil");
    this.debutFil = null;
    this.calqueApercu.innerHTML = "";
  };
  E._choisirPalette = function (type, bouton) {
    if (this.placer === type) { this._mode("choix"); return; }
    this._mode("placer");
    this.placer = type;
    bouton.classList.add("actif");
    this.choix = null;
    this._afficherProprietes();
  };
  E.basculerMarche = function () {
    this.enMarche = !this.enMarche;
    this.btnMarche.textContent = this.enMarche ? "Pause" : "Lancer";
  };
  E.reparer = function () {
    this.schema.compos.forEach(c => {
      if (c.etat) { c.etat.grille = false; c.etat.chauffe = 0; c.etat.pm = 0; c.etat.fusible = null; c.etat.chauffeF = 0; }
    });
    this.rendu(); this._sauver(); this._signaler();
  };

  /* ---------- Dessin ---------- */
  E._dessinerCompo = function (parent, c, mini) {
    const def = this.reg[c.type];
    const grp = svg("g", { class: "compo" + (this.choix === c ? " choisi" : ""), transform: `translate(${c.x * P},${c.y * P})`, "data-id": c.id }, parent);
    const cadre = svg("rect", { class: "cadre" }, grp);
    const rg = svg("g", { transform: `rotate(${c.rot || 0})` }, grp);
    const tg = svg("g", {}, grp);
    const rot = ((c.rot || 0) % 360 + 360) % 360;
    const tourner = (x, y) => rot === 90 ? [-y, x] : rot === 180 ? [-x, -y] : rot === 270 ? [y, -x] : [x, y];
    const d = {
      l: (x1, y1, x2, y2, cls) => svg("line", { x1, y1, x2, y2, class: cls || "corps" }, rg),
      p: (dd, cls) => svg("path", { d: dd, class: cls || "corps" }, rg),
      r: (x, y, w, h, cls, rx) => svg("rect", { x, y, width: w, height: h, rx: rx || 2, class: cls || "corps" }, rg),
      c: (cx, cy, r, cls) => svg("circle", { cx, cy, r, class: cls || "corps" }, rg),
      t: (x, y, s, cls) => { const [a, b] = tourner(x, y); const t = svg("text", { x: a, y: b + 4, "text-anchor": "middle", class: cls || "txt" }, tg); t.textContent = s; return t; },
      g: () => svg("g", {}, rg)
    };
    const maj = def.dessin ? def.dessin(d, c) : null;
    if (!mini) {
      (c.bornes || def.bornes).forEach(b => svg("circle", { cx: b[0] * P, cy: b[1] * P, r: 3, class: "borne" }, rg));
      if (c.nom && !c.virtuel) {
        const bb0 = rg.getBBox();
        const coins = [[bb0.x, bb0.y], [bb0.x + bb0.width, bb0.y + bb0.height]].map(([x, y]) => tourner(x, y));
        const xmin = Math.min(coins[0][0], coins[1][0]), ymin = Math.min(coins[0][1], coins[1][1]);
        const t = svg("text", { x: xmin - 2, y: ymin - 3, class: "nom-compo" }, tg); t.textContent = c.nom;
      }
      try {
        const bb = grp.getBBox();
        cadre.setAttribute("x", bb.x - 4); cadre.setAttribute("y", bb.y - 4);
        cadre.setAttribute("width", bb.width + 8); cadre.setAttribute("height", bb.height + 8);
      } catch (e) { /* hors DOM */ }
      if (c.etat && c.etat.grille && !c.cache) this._fumee(grp, c);
    }
    c._maj = maj || null;
    return grp;
  };
  E._fumee = function (grp, c) {
    const def = this.reg[c.type];
    const b = def.bornes;
    const cx = (b[0][0] + b[b.length - 1][0]) / 2 * P, cy = (b[0][1] + b[b.length - 1][1]) / 2 * P;
    const g = svg("g", { class: "fumee" }, grp);
    for (let i = 0; i < 3; i++) svg("circle", { cx: cx + (i - 1) * 6, cy: cy - 14, r: 5, style: `animation-delay:${i * 0.4}s` }, g);
    const t = svg("text", { x: cx, y: cy - 30, "text-anchor": "middle", class: "txt alerte-txt" }, grp);
    t.textContent = "grillé";
  };

  E._couleurNet = function (net) {
    if (this.sim.couleurNet) return this.sim.couleurNet(net, this);
    return null;
  };

  E.rendu = function () {
    const self = this, rs = this.sim.reseau;
    this.calqueFils.innerHTML = ""; this.calqueCompos.innerHTML = ""; this.calqueJonctions.innerHTML = "";
    this.elementsFils = [];
    this.schema.fils.forEach(f => {
      const pts = f.pts.map(p => (p[0] * P) + "," + (p[1] * P)).join(" ");
      const ligne = svg("polyline", { points: pts, class: "fil" + (this.choix === f ? " choisi" : ""), "data-fil": f.id }, this.calqueFils);
      svg("polyline", { points: pts, class: "fil-zone", "data-fil": f.id }, this.calqueFils);
      const k = LS.clePoint(f.pts[0][0], f.pts[0][1]);
      this.elementsFils.push([ligne, rs.netDuPoint[k], f]);
    });
    this.schema.compos.forEach(c => { if (!c.virtuel) self._dessinerCompo(this.calqueCompos, c); });
    rs.jonctions.forEach(p => svg("circle", { cx: p[0] * P, cy: p[1] * P, r: 4.2, class: "jonction" }, this.calqueJonctions));
    rs.libres.forEach(p => svg("circle", { cx: p[0] * P, cy: p[1] * P, r: 6, class: "point-libre" }, this.calqueJonctions));
    this._rendreSondes();
    this.majDynamique(0);
  };

  /* Mise à jour légère à chaque image : couleurs, lampes, aiguilles, électrons. */
  E.majDynamique = function (dtReel) {
    const self = this;
    // Couleur des fils selon le potentiel (ou l'état logique).
    let vmax = 0.5;
    if (this.opts.masquerCourant) this.couleursPotentiel = false;
    if (this.opts.electrique && this.couleursPotentiel) for (let k = 0; k < this.sim.reseau.nbNets; k++) vmax = Math.max(vmax, Math.abs(this.sim.tension(k)));
    (this.elementsFils || []).forEach(([ligne, net, f]) => {
      let coul = "";
      if (f.coupe && !f.cache) coul = "#c0392b";
      else if (this.opts.masquerCourant) coul = "";
      else if (this.opts.electrique) {
        if (this.couleursPotentiel && net !== undefined) {
          const v = this.sim.tension(net) / vmax;
          coul = v >= 0 ? `rgb(${Math.round(128 + 110 * v)},${Math.round(128 - 80 * v)},${Math.round(128 - 80 * v)})` : `rgb(${Math.round(128 + 90 * v)},${Math.round(128 + 10 * v)},${Math.round(128 - 100 * v)})`;
        }
      } else coul = this._couleurNet(net) || "";
      ligne.style.stroke = coul;
    });
    this.schema.compos.forEach(c => { if (c._maj) c._maj(c, dtReel); });
    if (this.opts.electrique && !this.opts.masquerCourant) this._animerElectrons(dtReel);
  };

  E._segmentsCourant = function () {
    const segs = [], rs = this.sim.reseau;
    rs.aretes.forEach(a => segs.push({ cle: "f" + a.ka + ">" + a.kb, x1: a.a[0] * P, y1: a.a[1] * P, x2: a.b[0] * P, y2: a.b[1] * P, i: a.i }));
    this.schema.compos.forEach(c => {
      if (!c._i || c.virtuel) return;
      const def = this.reg[c.type];
      const chemins = def.chemins ? def.chemins(c) : (def.bornes.length === 2 ? [[0, 1, 0]] : []);
      chemins.forEach(([a, b, k]) => {
        const pa = LS.positionBorne(c, def.bornes[a]), pb = LS.positionBorne(c, def.bornes[b]);
        segs.push({ cle: c.id + ":" + a + ">" + b, x1: pa[0] * P, y1: pa[1] * P, x2: pb[0] * P, y2: pb[1] * P, i: c._i[k] || 0 });
      });
    });
    return segs;
  };
  E._animerElectrons = function (dt) {
    const pool = this.calquePoints;
    const segs = this._segmentsCourant();
    let n = 0;
    const ESP = 16;
    segs.forEach(s => {
      const ai = Math.abs(s.i);
      if (ai < 2e-6) return;
      const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      if (L < 2) return;
      let v = Math.min(160, 55 * Math.log10(1 + ai * 1e3)) * Math.sign(s.i);
      if (this.electrons) v = -v;
      const ph = ((this.phases.get(s.cle) || 0) + v * dt) % ESP;
      this.phases.set(s.cle, ph);
      const ux = (s.x2 - s.x1) / L, uy = (s.y2 - s.y1) / L;
      for (let d = (ph + ESP) % ESP; d < L; d += ESP) {
        let e = pool.childNodes[n];
        if (!e) e = svg("circle", { r: 2.6, class: "electron" }, pool);
        e.setAttribute("cx", (s.x1 + ux * d).toFixed(1));
        e.setAttribute("cy", (s.y1 + uy * d).toFixed(1));
        e.style.display = "";
        n++;
      }
    });
    for (let k = n; k < pool.childNodes.length; k++) pool.childNodes[k].style.display = "none";
  };

  /* ---------- Boucle de simulation ---------- */
  E._boucle = function () {
    const self = this;
    let avant = performance.now();
    let cumulPanneau = 0;
    function image(maintenant) {
      if (self.detruit) return;
      const dt = Math.max(0, Math.min(0.05, (maintenant - avant) / 1000));
      avant = maintenant;
      if (self.enMarche && !document.hidden) {
        self.sim.avancer(dt * self.vitesse, self);
        if (self.sim.aChange && self.sim.aChange()) { self.rendu(); self._sauver(); }
        self.majDynamique(dt);
        self._majMultimetre();
        self._dessinerOscillo();
      }
      cumulPanneau += dt;
      if (cumulPanneau > 0.25) { cumulPanneau = 0; self._majMesures(); self._signaler(); }
      requestAnimationFrame(image);
    }
    requestAnimationFrame(image);
  };

  /* ---------- Vue de la plaque : cadrage, zoom ---------- */
  // Rectangle (en unités du dessin) qui contient tout le montage : composants, fils et pointes du multimètre.
  E._cadreContenu = function () {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const ajouter = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    this.schema.compos.forEach(c => {
      if (c.virtuel) return;
      (this.reg[c.type].bornes || []).forEach(b => { const q = LS.positionBorne(c, b); ajouter(q[0] * P, q[1] * P); });
      ajouter(c.x * P, c.y * P);
    });
    this.schema.fils.forEach(f => f.pts.forEach(q => ajouter(q[0] * P, q[1] * P)));
    if (this.multimetre && this.sondes && !this.panneauMM.classList.contains("cache-tout"))
      ["rouge", "noire"].forEach(k => { const q = this.sondes[k]; ajouter(q[0] * P, q[1] * P); ajouter(q[0] * P, q[1] * P - 50); });
    if (!isFinite(x0)) return null;
    return { x: x0 - 60, y: y0 - 50, w: x1 - x0 + 120, h: y1 - y0 + 100 };
  };
  // Cadre tout le montage. Sur grand écran : toute la plaque ; sur petit écran : le montage, avec de la marge.
  E.toutVoir = function (auto) {
    const cw = this.zone.clientWidth || 640, Wp = this.largeur * P + 20, Hp = this.hauteur * P + 20;
    let v = { x: -10, y: -10, w: Wp, h: Hp };
    const c = cw < Wp * 0.9 ? this._cadreContenu() : null;
    if (c) {
      v = { x: c.x, y: c.y, w: Math.max(c.w, 20 * P), h: Math.max(c.h, 11 * P) };
      v.x -= (v.w - c.w) / 2; v.y -= (v.h - c.h) / 2;
      // La plaque ne doit pas dépasser environ 60 % de la hauteur de l'écran (sinon on ne voit plus les consignes).
      const hMax = 0.6 * (window.innerHeight || 800);
      if (cw * v.h / v.w > hMax) { const w2 = v.h * cw / hMax; v.x -= (w2 - v.w) / 2; v.w = w2; }
      v.x = Math.max(-10, Math.min(v.x, Wp - 10 - v.w)); v.y = Math.max(-10, Math.min(v.y, Hp - 10 - v.h));
      if (v.w > Wp) { v.x = -10; v.w = Wp; }
    }
    this.vue = v;
    this.vueManuelle = false;
    this._appliquerVue();
    void auto;
  };
  // Zoom d'un facteur f (f < 1 : on agrandit) autour d'un point du dessin (centre de la vue par défaut).
  E.zoomer = function (f, ux, uy) {
    const v = this.vue, Wp = this.largeur * P + 20, Hp = this.hauteur * P + 20, r = v.h / v.w;
    if (ux === undefined) { ux = v.x + v.w / 2; uy = v.y + v.h / 2; }
    const w = Math.max(6 * P, Math.min(Wp * 1.3, v.w * f)), h = w * r;
    const fx = (ux - v.x) / v.w, fy = (uy - v.y) / v.h;
    this.vue = this._borner({ x: ux - fx * w, y: uy - fy * h, w, h });
    this.vueManuelle = true;
    this._appliquerVue();
  };
  // La vue reste toujours en partie sur la plaque.
  E._borner = function (v) {
    const Wp = this.largeur * P + 20, Hp = this.hauteur * P + 20;
    const mx = v.w * 0.4, my = v.h * 0.4;
    v.x = Math.max(-10 - mx, Math.min(v.x, Wp - 10 - v.w + mx));
    v.y = Math.max(-10 - my, Math.min(v.y, Hp - 10 - v.h + my));
    return v;
  };
  E._appliquerVue = function () {
    const v = this.vue;
    this.svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    const cw = this.zone.clientWidth || this.svg.clientWidth || 640;
    this.svg.style.height = Math.round(cw * v.h / v.w) + "px";
  };
  // Unités du dessin par pixel d'écran.
  E._uniteParPixel = function () { return this.vue.w / (this.svg.clientWidth || this.zone.clientWidth || 640); };
  E._tolerance = function (ev) { return Math.max(8, (ev && ev.pointerType === "touch" ? 22 : 10) * this._uniteParPixel()); };

  /* Gestes à deux doigts : pincer pour zoomer, glisser pour déplacer la vue. À un doigt, sur une zone
     vide, la page défile normalement ; sur un composant, un fil, une borne ou une pointe, ou en mode
     « Fil » / pose d'un composant, le doigt agit sur la plaque. */
  E._gestesTactiles = function () {
    const self = this, s = this.svg;
    let pince = null;
    const infos = t => {
      const a = t[0], b = t[1], r = s.getBoundingClientRect();
      return { cx: (a.clientX + b.clientX) / 2 - r.left, cy: (a.clientY + b.clientY) / 2 - r.top, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1 };
    };
    s.addEventListener("touchstart", ev => {
      if (ev.touches.length >= 2) {
        ev.preventDefault();
        self._annulerAction && self._annulerAction();
        const i = infos(ev.touches), k = self._uniteParPixel();
        pince = { i, vue: Object.assign({}, self.vue), k, ux: self.vue.x + i.cx * k, uy: self.vue.y + i.cy * k };
        return;
      }
      const t = ev.touches[0];
      const surElement = ev.target.closest && ev.target.closest("[data-id],[data-fil],[data-sonde]");
      const pt = self._point(t);
      const tol = Math.max(8, 22 * self._uniteParPixel());
      if (surElement || self.mode === "fil" || self.mode === "placer" || self.debutFil || self._borneProche(pt, tol)) ev.preventDefault();
    }, { passive: false });
    s.addEventListener("touchmove", ev => {
      if (!pince || ev.touches.length < 2) return;
      ev.preventDefault();
      const i = infos(ev.touches), Wp = self.largeur * P + 20;
      const k = Math.max(6 * P, Math.min(Wp * 1.3, pince.vue.w * pince.i.d / i.d)) / (s.clientWidth || 1);
      const w = k * (s.clientWidth || 1), h = w * pince.vue.h / pince.vue.w;
      self.vue = self._borner({ x: pince.ux - i.cx * k, y: pince.uy - i.cy * k, w, h });
      self.vueManuelle = true;
      self._appliquerVue();
    }, { passive: false });
    const fin = ev => { if (ev.touches.length < 2) pince = null; };
    s.addEventListener("touchend", fin);
    s.addEventListener("touchcancel", fin);
    // Molette avec Ctrl (ou geste de pincement du pavé tactile) : zoom autour du pointeur.
    s.addEventListener("wheel", ev => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const p = self._point(ev);
      self.zoomer(ev.deltaY > 0 ? 1.15 : 1 / 1.15, p.px, p.py);
    }, { passive: false });
  };

  /* ---------- Souris / doigt ---------- */
  E._point = function (ev) {
    const pt = this.svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
    return { px: p.x, py: p.y, x: Math.round(p.x / P), y: Math.round(p.y / P) };
  };
  E._borneProche = function (pt, tol) {
    // Borne ou extrémité de fil à portée (plus large au doigt et quand la plaque est réduite).
    let best = null, dmin = tol || this._tol || 8;
    this.schema.compos.forEach(c => {
      if (c.virtuel) return;
      (this.reg[c.type].bornes).forEach(b => {
        const p = LS.positionBorne(c, b);
        const d = Math.hypot(p[0] * P - pt.px, p[1] * P - pt.py);
        if (d < dmin) { dmin = d; best = p; }
      });
    });
    this.schema.fils.forEach(f => [f.pts[0], f.pts[f.pts.length - 1]].forEach(p => {
      const d = Math.hypot(p[0] * P - pt.px, p[1] * P - pt.py);
      if (d < dmin) { dmin = d; best = p; }
    }));
    return best;
  };
  E._dansPlaque = function (x, y) { return x >= 0 && y >= 0 && x <= this.largeur && y <= this.hauteur; };

  E._evenements = function () {
    const self = this, s = this.svg;
    let action = null;
    this._annulerAction = () => { action = null; self.calqueApercu.innerHTML = ""; };
    s.addEventListener("pointerdown", ev => {
      if (ev.button > 0 || !ev.isPrimary) return;
      self._tol = self._tolerance(ev);
      const pt = self._point(ev);
      const cible = ev.target.closest("[data-id],[data-fil],[data-sonde]");
      // Pointes du multimètre
      if (cible && cible.dataset.sonde) {
        action = { type: "sonde", quelle: cible.dataset.sonde };
        s.setPointerCapture(ev.pointerId);
        return;
      }
      if (self.mode === "placer") { action = { type: "placer" }; return; }
      // Sur le corps d'un composant, on ne part d'une borne que si on la touche vraiment (sinon on déplace le composant).
      const borne = self._borneProche(pt, cible && cible.dataset.id ? Math.max(8, 10 * self._uniteParPixel()) : self._tol);
      if (self.mode === "fil" || (borne && self.mode === "choix")) {
        if (!self.debutFil) self.debutFil = borne ? [borne[0], borne[1]] : [pt.x, pt.y];
        action = { type: "fil" };
        s.setPointerCapture(ev.pointerId);
        return;
      }
      if (cible && cible.dataset.id) {
        const c = self.schema.compos.find(k => k.id === cible.dataset.id);
        if (!c) return;
        const def = self.reg[c.type];
        if (def.appui) { c._appui = true; self.rendu(); }
        action = { type: "compo", c, depart: pt, x0: c.x, y0: c.y, bouge: false, attaches: self._filsAttaches(c) };
        s.setPointerCapture(ev.pointerId);
        return;
      }
      if (cible && cible.dataset.fil) {
        const f = self.schema.fils.find(k => k.id === cible.dataset.fil);
        self.choix = f; self.rendu(); self._afficherProprietes();
        action = null;
        return;
      }
      action = { type: "fond" };
    });
    s.addEventListener("pointermove", ev => {
      if (!ev.isPrimary) return;
      if (!action) self._tol = self._tolerance(ev);
      const pt = self._point(ev);
      self.calqueApercu.innerHTML = "";
      if (self.mode === "placer" && self.placer) {
        const fantome = svg("g", { opacity: 0.5 }, self.calqueApercu);
        self._dessinerCompo(fantome, { type: self.placer, x: pt.x, y: pt.y, rot: 0, p: self._defauts(self.reg[self.placer]), id: "fantome" }, true);
      }
      if (self.debutFil) {
        const pts = self._routeL(self.debutFil, [pt.x, pt.y]);
        svg("polyline", { points: pts.map(p => p[0] * P + "," + p[1] * P).join(" "), class: "apercu" }, self.calqueApercu);
      }
      if (!action) {
        const b = self._borneProche(pt);
        if (b && ev.pointerType !== "touch") svg("circle", { cx: b[0] * P, cy: b[1] * P, r: 7, class: "cible" }, self.calqueApercu);
        return;
      }
      if (action.type === "compo" && !action.c.fixe) {
        const dx = pt.x - action.depart.x, dy = pt.y - action.depart.y;
        if (Math.hypot(pt.px - action.depart.px, pt.py - action.depart.py) > 6) action.bouge = true;
        if (action.bouge && (action.c.x !== action.x0 + dx || action.c.y !== action.y0 + dy)) {
          action.c.x = action.x0 + dx; action.c.y = action.y0 + dy;
          self._deplacerFils(action);
          self.sim.preparer();
          self.rendu();
        }
      } else if (action.type === "sonde") {
        const mm = self.schema.compos.find(c => c.type === "multimetre");
        self.sondes[action.quelle] = [pt.x, pt.y];
        self._installerMultimetre(); self.sim.preparer(); self.rendu();
        void mm;
      }
    });
    s.addEventListener("pointerup", ev => {
      if (!ev.isPrimary) return;
      const pt = self._point(ev);
      const a = action; action = null;
      if (!a) return;
      if (a.type === "placer" && self.placer && self._dansPlaque(pt.x, pt.y)) {
        const def = self.reg[self.placer];
        const c = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: self.placer, x: pt.x, y: pt.y, rot: 0, p: self._defauts(def) };
        c.nom = self._nomLibre(def.prefixe);
        self.schema.compos.push(c);
        self.choix = c;
        if (!ev.shiftKey) self._mode("choix");
        self._modifie();
      } else if (a.type === "fil") {
        const b = self._borneProche(pt) || [pt.x, pt.y];
        if (self.debutFil && (b[0] !== self.debutFil[0] || b[1] !== self.debutFil[1])) {
          self.schema.fils.push({ id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), pts: self._routeL(self.debutFil, b) });
          self.debutFil = null;
          self.calqueApercu.innerHTML = "";
          self._modifie();
        }
        // Sinon : premier « tap » sur le point de départ ; le fil se termine au prochain tap.
      } else if (a.type === "compo") {
        const def = self.reg[a.c.type];
        if (def.appui) { a.c._appui = false; self.rendu(); }
        if (!a.bouge) {
          if (def.cliquable && def.action && self.choix === a.c) { def.action(a.c); self.sim.preparer && self.sim.toucher && self.sim.toucher(); self.rendu(); self._sauver(); self._signaler(); }
          else if (def.cliquable && def.action && self.opts.basculeDirecte) { def.action(a.c); self.rendu(); self._sauver(); self._signaler(); }
          self.choix = a.c;
          self.rendu();
          self._afficherProprietes();
        } else self._modifie();
      } else if (a.type === "sonde") {
        self._sauver();
      } else if (a.type === "fond") {
        if (self.debutFil) { self.debutFil = null; self.calqueApercu.innerHTML = ""; }
        if (self.choix) { self.choix = null; self.rendu(); self._afficherProprietes(); }
      }
    });
    s.addEventListener("pointercancel", () => { action = null; });
    window.addEventListener("keydown", ev => {
      if (!self.svg.isConnected || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (ev.key === "Escape") { self._mode("choix"); }
      if ((ev.key === "Delete" || ev.key === "Backspace") && self.choix) { ev.preventDefault(); self.supprimer(self.choix); }
      if ((ev.key === "r" || ev.key === "R") && self.choix && self.choix.type) self.tourner(self.choix);
    });
  };

  /* Tracé d'un fil de a à b, en segments horizontaux et verticaux, en évitant de passer sur une
     autre borne ou extrémité de fil (ce qui créerait une connexion involontaire). */
  E._routeL = function (a, b) {
    const obstacles = [];
    if (this.schema) {
      this.schema.compos.forEach(c => { if (!c.virtuel) this.reg[c.type].bornes.forEach(bo => obstacles.push(LS.positionBorne(c, bo))); });
      this.schema.fils.forEach(f => { obstacles.push(f.pts[0], f.pts[f.pts.length - 1]); });
    }
    const egal = (p, q) => p[0] === q[0] && p[1] === q[1];
    const touche = pts => {
      let n = 0;
      for (let i = 1; i < pts.length; i++) obstacles.forEach(o => {
        if (egal(o, a) || egal(o, b)) return;
        if (LS.surSegment(o, pts[i - 1], pts[i]) || (i < pts.length - 1 && egal(o, pts[i]))) n++;
      });
      return n;
    };
    const net = pts => pts.filter((p, i) => i === 0 || !egal(p, pts[i - 1]));
    const cands = [];
    if (a[0] === b[0] || a[1] === b[1]) cands.push([a, b]);
    cands.push([a, [b[0], a[1]], b], [a, [a[0], b[1]], b]);
    for (let d = 1; d <= 6; d++) for (const sg of [1, -1]) {
      const y = Math.min(a[1], b[1]) - d * sg + (sg < 0 ? Math.abs(a[1] - b[1]) : 0);
      cands.push([a, [a[0], y], [b[0], y], b]);
      const x = Math.min(a[0], b[0]) - d * sg + (sg < 0 ? Math.abs(a[0] - b[0]) : 0);
      cands.push([a, [x, a[1]], [x, b[1]], b]);
    }
    cands.push([a, [(a[0] + b[0]) >> 1, a[1]], [(a[0] + b[0]) >> 1, b[1]], b]);
    let meilleur = null, score = Infinity;
    for (const c of cands) {
      const pts = net(c.map(p => p.slice()));
      if (pts.some(p => p[0] < 0 || p[1] < 0 || p[0] > this.largeur || p[1] > this.hauteur)) continue;
      const t = touche(pts) * 1000 + pts.length;
      if (t < score) { score = t; meilleur = pts; }
      if (touche(pts) === 0 && pts.length <= 3) break;
    }
    return meilleur || [a.slice(), b.slice()];
  };
  E._filsAttaches = function (c) {
    const bornes = this.reg[c.type].bornes.map(b => LS.positionBorne(c, b));
    const est = p => bornes.some(b => b[0] === p[0] && b[1] === p[1]);
    const l = [];
    this.schema.fils.forEach(f => {
      const debut = est(f.pts[0]), fin = est(f.pts[f.pts.length - 1]);
      if (debut || fin) l.push({ f, debut, fin, pts0: f.pts.map(p => p.slice()) });
    });
    return l;
  };
  E._deplacerFils = function (a) {
    const dx = a.c.x - a.x0, dy = a.c.y - a.y0;
    a.attaches.forEach(({ f, debut, fin, pts0 }) => {
      if (debut && fin) { f.pts = pts0.map(p => [p[0] + dx, p[1] + dy]); return; }
      const fixe = debut ? pts0[pts0.length - 1] : pts0[0];
      const mobile = debut ? pts0[0] : pts0[pts0.length - 1];
      const nouveau = [mobile[0] + dx, mobile[1] + dy];
      const route = this._routeL(fixe, nouveau);
      f.pts = debut ? route.reverse() : route;
    });
  };
  E.supprimer = function (x) {
    if (x.fixe) { LS.avis("Cet élément fait partie du montage imposé du TP."); return; }
    if (x.type) this.schema.compos = this.schema.compos.filter(c => c !== x);
    else this.schema.fils = this.schema.fils.filter(f => f !== x);
    if (this.osc) this.osc.voies = this.osc.voies.map(v => v && v.c === x ? null : v);
    this.choix = null;
    this._modifie();
  };
  E.tourner = function (c) {
    if (c.fixe) return;
    const att = this._filsAttaches(c);
    c.rot = ((c.rot || 0) + 90) % 360;
    // Les fils attachés suivent les bornes tournées.
    const nouvelles = this.reg[c.type].bornes.map(b => LS.positionBorne(c, b));
    c.rot = ((c.rot - 90) % 360 + 360) % 360;
    const anciennes = this.reg[c.type].bornes.map(b => LS.positionBorne(c, b));
    c.rot = (c.rot + 90) % 360;
    att.forEach(({ f, debut, fin }) => {
      const remplace = p => { const i = anciennes.findIndex(a => a[0] === p[0] && a[1] === p[1]); return i >= 0 ? nouvelles[i] : p; };
      if (debut) { const q = remplace(f.pts[0]); f.pts = this._routeL(f.pts[f.pts.length - 1], q).reverse(); }
      if (fin) { const q = remplace(f.pts[f.pts.length - 1]); f.pts = this._routeL(f.pts[0], q); }
    });
    this._modifie();
  };

  /* ---------- Panneau des propriétés et mesures ---------- */
  // Écran tactile : on parle de « toucher » et on n'affiche pas les raccourcis clavier.
  const tactile = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  E._afficherProprietes = function () {
    const self = this, pan = this.proprietes, x = this.choix;
    pan.innerHTML = "";
    this.zoneMesures = null;
    if (!x) {
      const t = tactile(), clic = t ? "touche" : "clique";
      pan.append(LS.el("p", { class: "aide", html: this.opts.aide || (this.opts.electrique
        ? `<strong>Mode d'emploi :</strong> choisis un composant dans le tiroir puis ${clic} la plaque pour le poser. Pour relier deux points, <strong>glisse depuis une borne</strong> (petit rond noir) jusqu'à une autre borne. ${t ? "Touche" : "Clique sur"} un composant pour le régler et lire ses mesures ; ${clic} une 2ᵉ fois un interrupteur pour le basculer. Les points jaunes montrent le courant.` +
          (t ? " Deux doigts : pincer pour zoomer, glisser pour déplacer la vue." : " Touche R : tourner ; Suppr : effacer ; Ctrl + molette : zoom.")
        : `Choisis une porte dans le tiroir, pose-la, relie les bornes en glissant. ${t ? "Touche" : "Clique"} deux fois une entrée pour la basculer.`) }));
      return;
    }
    if (!x.type) {
      pan.append(LS.el("h3", { text: "Fil" }),
        LS.el("p", { text: "Un fil relie deux points : ils sont au même potentiel (même tension par rapport à la masse)." }),
        LS.el("div", { class: "ligne" }, [LS.el("button", { class: "btn petit secondaire", text: "Supprimer le fil", onclick: () => self.supprimer(x) }), this._boutonPanne(x)]));
      return;
    }
    const def = this.reg[x.type];
    pan.append(LS.el("h3", { text: `${x.nom} — ${def.nom}` }));
    // Élément imposé et verrouillé par le TP (ex. le réseau 220 V) : réglages affichés, non modifiables.
    if (x.verrou) (def.props || []).forEach(q => pan.append(LS.el("div", { class: "ligne" }, [LS.el("span", { text: q.nom + " :" }),
      LS.el("b", { text: q.bool ? (x.p[q.k] ? "oui" : "non") : q.choix ? x.p[q.k] + (q.unite ? " " + q.unite : "") : LS.si(x.p[q.k], q.unite || "", 3) }), LS.el("span", { class: "etiquette", text: "imposé" })])));
    else (def.props || []).forEach(q => pan.append(self._controle(x, q)));
    const actions = LS.el("div", { class: "ligne" });
    if (def.cliquable && def.action) actions.append(LS.el("button", { class: "btn petit", text: "Basculer", onclick: () => { def.action(x); self.rendu(); self._sauver(); self._signaler(); self._afficherProprietes(); } }));
    if (!x.fixe) {
      actions.append(LS.el("button", { class: "btn petit secondaire", text: tactile() ? "Tourner" : "Tourner (R)", onclick: () => self.tourner(x) }));
      actions.append(LS.el("button", { class: "btn petit secondaire", text: "Supprimer", onclick: () => self.supprimer(x) }));
    } else actions.append(LS.el("span", { class: "etiquette", text: "élément imposé par le TP" }));
    if (this.opts.electrique) {
      actions.append(LS.el("button", { class: "btn petit secondaire", text: "Voie 1", title: "Afficher sa tension sur l'oscilloscope (voie 1)", onclick: () => self.surOscillo(x, 0) }));
      actions.append(LS.el("button", { class: "btn petit secondaire", text: "Voie 2", title: "Afficher sa tension sur l'oscilloscope (voie 2)", onclick: () => self.surOscillo(x, 1) }));
    }
    const bp = this._boutonPanne(x);
    if (bp) actions.append(bp);
    pan.append(actions);
    if (def.aide) pan.append(LS.el("p", { class: "aide", html: LS.texte(def.aide) }));
    this.zoneMesures = LS.el("div", { class: "mesures", style: "padding:0;margin-top:8px" });
    pan.append(this.zoneMesures);
    this._majMesures();
  };
  /* TP de dépannage : l'apprenant désigne l'élément qu'il pense en panne. */
  E._boutonPanne = function (x) {
    if (!this.opts.signalement) return null;
    const self = this;
    this.signalements = this.signalements || [];
    return LS.el("button", { class: "btn petit", text: "C'est la panne !", onclick: () => {
      self.signalements.push(x);
      const vrai = x.coupe || (x.etat && x.etat.grille);
      LS.avis(vrai ? "Bien vu : c'est bien un élément en panne. Remplace-le (supprime-le et remets-en un neuf, ou « Réparer » pour une lampe)." : "Non, cet élément fonctionne. Continue tes mesures.");
      self._signaler();
    } });
  };

  E._controle = function (c, q) {
    const self = this;
    const changer = v => { c.p[q.k] = v; self.sim.toucher && self.sim.toucher(); self.rendu(); self._sauver(); self._signaler(); };
    if (q.bool) {
      const b = LS.el("button", { class: "btn petit" + (c.p[q.k] ? "" : " secondaire"), text: q.nom + " : " + (c.p[q.k] ? "oui" : "non"), onclick: () => { changer(!c.p[q.k]); self._afficherProprietes(); } });
      return LS.el("div", { class: "ligne" }, [b]);
    }
    if (q.choix) {
      const s = LS.el("select", { onchange: e => changer(typeof q.choix[0] === "number" ? +e.target.value : e.target.value) });
      q.choix.forEach(v => { const o = LS.el("option", { value: v, text: v + (q.unite ? " " + q.unite : "") }); if (v === c.p[q.k]) o.selected = true; s.append(o); });
      return LS.el("div", { class: "ligne" }, [LS.el("span", { text: q.nom + " :" }), s]);
    }
    const val = LS.el("b", { text: LS.si(c.p[q.k], q.unite || "", 3) });
    // Une valeur imposée par le TP peut sortir de la plage du curseur (311 V crête du réseau malien) : on élargit
    // la plage pour ne jamais la ramener à la borne sans le vouloir.
    const v0 = c.p[q.k], min = Math.min(q.min, v0), max = Math.max(q.max, v0);
    const pos = v => q.log ? 1000 * Math.log(v / min) / Math.log(max / min) : v;
    const deVal = x => q.log ? min * Math.pow(max / min, x / 1000) : x;
    const r = LS.el("input", { type: "range", min: q.log ? 0 : min, max: q.log ? 1000 : max, step: q.log ? 1 : (q.pas || (max - min) / 200), value: pos(c.p[q.k]) });
    r.addEventListener("input", () => {
      let v = deVal(+r.value);
      if (q.normalise) v = normaliserE12(v);
      else if (q.log) v = +v.toPrecision(3);
      val.textContent = LS.si(v, q.unite || "", 3);
      changer(v);
    });
    const saisie = LS.el("input", { type: "text", value: "", placeholder: "saisir", style: "width:80px", title: "Saisir une valeur (ex. 4.7k, 220, 10µ)" });
    saisie.addEventListener("change", () => {
      const v = LS.lireValeur(saisie.value);
      if (v === null || v < min || v > max) { saisie.value = ""; saisie.placeholder = "hors limites"; return; }
      r.value = pos(v); val.textContent = LS.si(v, q.unite || "", 3); changer(v); saisie.value = "";
    });
    return LS.el("div", { class: "controle" }, [LS.el("label", {}, [LS.el("span", { text: q.nom }), val]), LS.el("div", { class: "ligne" }, [r, saisie])]);
  };
  /* Lecture d'une valeur avec préfixe : « 4.7k », « 220 », « 10µ », « 2,2M », « 100n ». */
  LS.lireValeur = function (s) {
    const m = String(s).trim().replace(",", ".").match(/^(-?[0-9]*\.?[0-9]+)\s*([pnuµmkKM]?)/);
    if (!m) return null;
    const f = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3, "": 1, k: 1e3, K: 1e3, M: 1e6 }[m[2]];
    return parseFloat(m[1]) * f;
  };
  E._majMesures = function () {
    if (!this.zoneMesures || !this.choix || !this.choix.type) return;
    const c = this.choix, def = this.reg[c.type], V = net => this.sim.tension(net);
    let l;
    if (this.sim.mesures) l = this.sim.mesures(c, def, V);
    else if (def.mesures) l = def.mesures(c, V);
    else if (def.bornes.length === 2) {
      const U = this.U(c), I = this.I(c);
      l = [["Tension U", LS.si(U, "V")], ["Courant I", LS.si(I, "A")], ["Puissance P = U·I", LS.si(U * I, "W")]];
    } else l = [];
    this.zoneMesures.innerHTML = "";
    l.forEach(([n, v]) => this.zoneMesures.append(LS.el("div", { class: "mesure" }, [LS.el("div", { class: "nom", text: n }), LS.el("div", { class: "val", text: v })])));
    if (c.etat && c.etat.alerte) this.zoneMesures.append(LS.el("div", { class: "alerte-sim", style: "grid-column:1/-1", text: "⚠ " + c.etat.alerte }));
  };

  /* ---------- Oscilloscope ---------- */
  E.basculerOscillo = function (forcer) {
    const vis = forcer !== undefined ? forcer : this.panneauOsc.classList.contains("cache-tout");
    this.panneauOsc.classList.toggle("cache-tout", !vis);
    this.btnOsc && this.btnOsc.classList.toggle("actif", vis);
    if (vis && !this.osc) this._creerOscillo();
  };
  E._creerOscillo = function () {
    const self = this;
    this.osc = { voies: [null, null], tDiv: this.opts.tDiv || 0.005, donnees: [], dernier: -1 };
    if (this.opts.masquerCourant) { /* rien à cacher sur l'oscilloscope */ }
    const can = LS.el("canvas", { width: 900, height: 220 });
    const base = LS.el("select", { onchange: e => { self.osc.tDiv = +e.target.value; self.osc.donnees = []; } });
    [[1e-4, "0,1 ms/div"], [5e-4, "0,5 ms/div"], [1e-3, "1 ms/div"], [2e-3, "2 ms/div"], [5e-3, "5 ms/div"], [0.01, "10 ms/div"], [0.05, "50 ms/div"], [0.1, "0,1 s/div"], [0.5, "0,5 s/div"], [1, "1 s/div"]].forEach(([v, t]) => {
      const o = LS.el("option", { value: v, text: t }); if (v === self.osc.tDiv) o.selected = true; base.append(o);
    });
    this.oscLegende = LS.el("span", { style: "font-size:.85rem" });
    this.panneauOsc.append(LS.el("div", { class: "sim-barre" }, [LS.el("strong", { text: "Oscilloscope" }), LS.el("span", { text: "Base de temps :" }), base, this.oscLegende]), can);
    this.osc.can = can;
    this.osc.base = base;
    this._legendeOsc();
  };
  E.surOscillo = function (c, voie, grandeur) {
    this.basculerOscillo(true);
    this.osc.voies[voie] = { c, g: grandeur || "U" };
    this.osc.donnees = [];
    this._legendeOsc();
  };
  E._legendeOsc = function () {
    if (!this.osc) return;
    const v = this.osc.voies;
    this.oscLegende.innerHTML = "";
    v.forEach((x, i) => {
      if (!x) return;
      const s = LS.el("span", { style: `color:${i ? "#4dd0e1" : "#ffd54f"};margin-left:8px;font-weight:700`, text: `Voie ${i + 1} : ${x.g === "I" ? "courant" : "tension"} ${x.c.nom} ` });
      const bt = LS.el("button", { class: "btn petit secondaire", text: x.g === "I" ? "→ U" : "→ I", title: "Basculer tension / courant", onclick: () => { x.g = x.g === "I" ? "U" : "I"; this.osc.donnees = []; this._legendeOsc(); } });
      this.oscLegende.append(s, bt);
    });
    if (!v[0] && !v[1]) this.oscLegende.textContent = " — " + (tactile() ? "touche" : "clique sur") + " un composant puis « Voie 1 » ou « Voie 2 ».";
  };
  /* Appelé par le simulateur après chaque pas. */
  E.echantillonner = function (t) {
    const o = this.osc;
    if (!o || this.panneauOsc.classList.contains("cache-tout")) return;
    const fenetre = o.tDiv * 10;
    if (t - o.dernier < fenetre / 600) return;
    o.dernier = t;
    const val = x => {
      if (!x || !x.c._nets) return null;
      if (x.g === "I") {
        const def = this.reg[x.c.type];
        const V = net => this.sim.tension(net);
        const i = def.modele && def.modele.courants ? def.modele.courants(x.c, V, this.sim) : [0];
        return i[0];
      }
      return this.U(x.c);
    };
    o.donnees.push([t, val(o.voies[0]), val(o.voies[1])]);
    while (o.donnees.length && o.donnees[0][0] < t - fenetre) o.donnees.shift();
  };
  E._dessinerOscillo = function () {
    const o = this.osc;
    if (!o || this.panneauOsc.classList.contains("cache-tout")) return;
    const can = o.can, ctx = can.getContext("2d");
    const W = can.width, H = can.height;
    ctx.fillStyle = "#0d1a14"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(120,200,160,.18)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke(); }
    for (let j = 0; j <= 8; j++) { ctx.beginPath(); ctx.moveTo(0, j * H / 8); ctx.lineTo(W, j * H / 8); ctx.stroke(); }
    ctx.strokeStyle = "rgba(120,200,160,.4)"; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    if (!o.donnees.length) return;
    const t1 = o.donnees[o.donnees.length - 1][0], t0 = t1 - o.tDiv * 10;
    const legendes = [];
    [0, 1].forEach(k => {
      if (!o.voies[k]) return;
      let max = 0;
      o.donnees.forEach(d => { if (d[k + 1] !== null) max = Math.max(max, Math.abs(d[k + 1])); });
      // Calibre vertical 1-2-5 : 4 divisions au-dessus de l'axe.
      const pas = [1, 2, 5];
      let div = 1e-6;
      outer: for (let e = -6; e < 4; e++) for (const m of pas) { div = m * Math.pow(10, e); if (div * 4 >= max * 1.05) break outer; }
      ctx.strokeStyle = k ? "#4dd0e1" : "#ffd54f"; ctx.lineWidth = 2;
      ctx.beginPath();
      let premier = true;
      o.donnees.forEach(d => {
        if (d[k + 1] === null) return;
        const x = (d[0] - t0) / (t1 - t0) * W, y = H / 2 - d[k + 1] / div * (H / 8);
        if (premier) { ctx.moveTo(x, y); premier = false; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      legendes.push([k, LS.si(div, o.voies[k].g === "I" ? "A" : "V") + "/div"]);
    });
    ctx.font = "13px monospace";
    legendes.forEach(([k, t], n) => { ctx.fillStyle = k ? "#4dd0e1" : "#ffd54f"; ctx.fillText(`V${k + 1} : ${t}`, 8, 16 + 16 * n); });
    ctx.fillStyle = "#9fd8b8"; ctx.fillText(LS.si(o.tDiv, "s") + "/div", W - 100, H - 8);
  };

  /* ---------- Multimètre ---------- */
  E.basculerMultimetre = function (forcer) {
    const vis = forcer !== undefined ? forcer : this.panneauMM.classList.contains("cache-tout");
    this.panneauMM.classList.toggle("cache-tout", !vis);
    this.btnMM && this.btnMM.classList.toggle("actif", vis);
    if (vis && !this.multimetre) {
      this.multimetre = { sel: "V⎓", douille: "VΩ" };
      // Pointes posées juste à droite du montage, pour qu'elles restent dans la vue au téléphone.
      if (!this.sondes) {
        let xMax = 0, yMin = this.hauteur;
        this.schema.compos.forEach(c => { if (c.virtuel) return; (this.reg[c.type].bornes || []).forEach(b => { const q = LS.positionBorne(c, b); xMax = Math.max(xMax, q[0]); yMin = Math.min(yMin, q[1]); }); });
        this.schema.fils.forEach(f => f.pts.forEach(q => { xMax = Math.max(xMax, q[0]); yMin = Math.min(yMin, q[1]); }));
        const x = Math.min(this.largeur - 4, xMax + 3), y = Math.max(3, yMin);
        this.sondes = { rouge: [x, y], noire: [x + 3, y] };
      }
      this._construireMultimetre();
    }
    this._installerMultimetre();
    this.sim.preparer();
    this.rendu();
  };
  E._installerMultimetre = function () {
    this.schema.compos = this.schema.compos.filter(c => !c.virtuel);
    if (!this.multimetre || this.panneauMM.classList.contains("cache-tout")) return;
    const r = this.sondes.rouge, n = this.sondes.noire;
    let c = this._mm;
    if (!c) c = this._mm = { id: "MM", type: "multimetre", virtuel: true, nom: "MM", rot: 0, p: {}, etat: {} };
    c.x = r[0]; c.y = r[1];
    c.bornes = [[0, 0], [n[0] - r[0], n[1] - r[1]]];
    c.p.sel = this.multimetre.sel; c.p.douille = this.multimetre.douille;
    c._posees = true;
    if (c._init === undefined) c._init = false;
    this.schema.compos.push(c);
  };
  E._construireMultimetre = function () {
    const self = this, mm = this.multimetre, pan = this.panneauMM;
    pan.innerHTML = "";
    this.ecranMM = LS.el("div", { class: "mm-ecran", text: "" });
    this.alerteMM = LS.el("div", { class: "mm-alerte" });
    const positions = [["OFF", "Arrêt"], ["V⎓", "Tension continue"], ["V~", "Tension alternative (efficace)"], ["A⎓", "Courant continu"], ["A~", "Courant alternatif"], ["Ω", "Résistance (hors tension !)"], ["•))", "Continuité (bip si < 50 Ω)"], ["▶|", "Test de diode"]];
    const sel = LS.el("div", { class: "mm-selecteur" });
    positions.forEach(([v, t]) => {
      const b = LS.el("button", { class: "mm-pos" + (mm.sel === v ? " actif" : ""), title: t, text: v, onclick: () => { mm.sel = v; self._installerMultimetre(); self.sim.preparer(); self._construireMultimetre(); self._signaler(); } });
      sel.append(b);
    });
    const douilles = LS.el("div", { class: "mm-douilles" });
    ["10A", "mA", "COM", "VΩ"].forEach(d => {
      const b = LS.el("button", { class: "mm-douille" + (d === "COM" ? " com" : "") + (mm.douille === d ? " actif" : ""), text: d,
        title: d === "COM" ? "Le cordon noir est toujours ici" : "Mettre le cordon rouge ici",
        onclick: () => { if (d === "COM") return; mm.douille = d; self._installerMultimetre(); self.sim.preparer(); self._construireMultimetre(); self._signaler(); } });
      douilles.append(b);
    });
    const desc = positions.find(p => p[0] === mm.sel);
    pan.append(LS.el("div", { class: "mm-boitier" }, [
      LS.el("div", { class: "mm-titre", text: "Multimètre" }), this.ecranMM,
      LS.el("div", { class: "mm-mode", text: desc ? desc[1] : "" }), sel, douilles, this.alerteMM,
      LS.el("p", { class: "aide", html: "Fais glisser les pointes <b class='mm-rouge'>rouge</b> et <b>noire</b> sur la plaque pour toucher le circuit. Pour un courant, il faut <b>ouvrir</b> le circuit et y insérer l'appareil." }),
      LS.el("button", { class: "btn petit secondaire", text: "Changer le fusible", onclick: () => { if (self._mm) { self._mm.etat.fusible = null; self._signaler(); } } })
    ]));
  };
  E._rendreSondes = function () {
    const g = this.calqueSondes;
    g.innerHTML = "";
    if (!this.multimetre || this.panneauMM.classList.contains("cache-tout")) return;
    const W = this.largeur * P;
    [["noire", "#222"], ["rouge", "#e53935"]].forEach(([k, coul], i) => {
      const p = this.sondes[k];
      const x = p[0] * P, y = p[1] * P;
      svg("path", { d: `M${x},${y - 30} C${x},${y - 80} ${W + 20},${-20 + i * 20} ${W + 10},${-10}`, fill: "none", stroke: coul, "stroke-width": 3, opacity: 0.7 }, g);
      const s = svg("g", { "data-sonde": k, transform: `translate(${x},${y})`, style: "cursor:grab" }, g);
      svg("path", { d: "M0,0 L-4,-10 L-6,-34 L6,-34 L4,-10 Z", fill: coul, stroke: "#000", "stroke-width": 1 }, s);
      svg("rect", { x: -9, y: -48, width: 18, height: 16, rx: 3, fill: coul }, s);
      svg("circle", { cx: 0, cy: -16, r: 22, fill: "transparent" }, s);
    });
  };
  E._majMultimetre = function () {
    if (!this.multimetre || !this._mm || this.panneauMM.classList.contains("cache-tout")) return;
    const def = this.reg.multimetre;
    const a = def.affichage(this._mm);
    this.ecranMM.textContent = a.texte ? a.texte + " " + a.unite : "";
    this.ecranMM.classList.toggle("bip", !!a.bip);
    this.alerteMM.textContent = a.alerte ? "⚠ " + a.alerte : "";
    if (a.bip && !this._bipActif) this._bip(true);
    if (!a.bip && this._bipActif) this._bip(false);
  };
  E._bip = function (oui) {
    this._bipActif = oui;
    try {
      if (oui) {
        this._audio = this._audio || new (window.AudioContext || window.webkitAudioContext)();
        const o = this._audio.createOscillator(), g = this._audio.createGain();
        o.frequency.value = 2700; g.gain.value = 0.04;
        o.connect(g).connect(this._audio.destination); o.start();
        this._osc = o;
      } else if (this._osc) { this._osc.stop(); this._osc = null; }
    } catch (e) { /* audio indisponible */ }
  };
  E.lectureMultimetre = function () {
    if (!this._mm || !this.multimetre) return null;
    return Object.assign({ sel: this.multimetre.sel, douille: this.multimetre.douille }, this.reg.multimetre.affichage(this._mm), { u: this._mm._u, i: this._mm._iInst });
  };

  E.detruire = function () { this.detruit = true; this._bip(false); };

  LS.EditeurCircuit = Editeur;

  /* ---------- Moteur électrique branché sur l'éditeur ---------- */
  LS.moteurElec = {
    creer(schema, reg, editeur) {
      const sim = new LS.SimulateurElectrique(schema, reg);
      let change = false;
      sim.avancer = function (dtSim, ed) {
        if (dtSim <= 0) return;
        let dtMax = ed.opts.dt || 1e-3;
        schema.compos.forEach(c => { if (c.type === "generateur") dtMax = Math.min(dtMax, 1 / (60 * c.p.f)); });
        const n = Math.min(400, Math.ceil(dtSim / dtMax - 1e-9));
        const dt = Math.min(dtMax, dtSim / n);
        for (let k = 0; k < n; k++) {
          this.pas(dt);
          ed.echantillonner(this.t);
        }
        this.courants();
        LS.courantsFils(this.reseau, (c, i) => (c._i ? c._i[i] : 0));
        if (ed.opts.surPas) ed.opts.surPas(ed);
        schema.compos.forEach(c => { if (c.etat && c.etat.change) { c.etat.change = false; change = true; } });
      };
      sim.aChange = () => { const c = change; change = false; return c; };
      return sim;
    }
  };

  /* Raccourci : TP électrique. */
  LS.simCircuit = function (conteneur, config) {
    return new Editeur(conteneur, Object.assign({ registre: LS.composantsElec, moteur: LS.moteurElec, electrique: true }, config));
  };
})();
