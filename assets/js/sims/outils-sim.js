/* Boîte à outils des simulations animées (mécanique, électromécanique, télécom, ESP32, drones).
   LS.simAnimee(conteneur, def) crée : un canevas, des curseurs (def.controles), des boutons,
   des mesures et une explication mises à jour en direct. */
(function () {
  "use strict";
  const LS = window.LS;
  LS.sims = LS.sims || {};

  LS.couleurs = function () {
    const s = getComputedStyle(document.documentElement);
    const v = n => s.getPropertyValue(n).trim();
    return { texte: v("--texte"), doux: v("--texte-doux"), fond: v("--fond"), carte: v("--carte"), accent: v("--accent"), accentFort: v("--accent-fort"),
      noeud: v("--noeud"), bordure: v("--bordure"), ok: v("--ok"), alerte: v("--alerte"), info: v("--info"), sombre: s.colorScheme === "dark" };
  };

  LS.simAnimee = function (conteneur, def, config) {
    config = config || {};
    conteneur.classList.add("sim");
    const sim = { p: {}, etat: {}, t: 0, enMarche: true, def: def };
    // Valeurs des réglages : défauts, puis configuration du TP.
    (def.controles || []).forEach(c => { sim.p[c.k] = c.defaut; });
    Object.assign(sim.p, config.p || {});
    const cache = new Set(config.cacher || []);

    const barre = LS.el("div", { class: "sim-barre" });
    const btnMarche = LS.el("button", { class: "btn petit", text: "Pause", onclick: () => { sim.enMarche = !sim.enMarche; btnMarche.textContent = sim.enMarche ? "Pause" : "Lancer"; } });
    barre.append(btnMarche);
    (def.boutons || []).forEach(b => {
      if (cache.has(b.k)) return;
      barre.append(LS.el("button", { class: "btn petit secondaire", text: b.texte, title: b.titre || "", onclick: () => { b.action(sim); sim.majControles(); } }));
    });
    if (def.titreBarre) barre.append(LS.el("strong", { text: def.titreBarre, style: "margin-left:auto" }));

    const canvas = LS.el("canvas", {});
    const H = def.hauteur || 420;
    canvas.style.height = H + "px";
    const zoneControles = LS.el("div", { class: "controles" });
    const zoneMesures = LS.el("div", { class: "mesures" });
    const zoneExpl = LS.el("div", { class: "explication-live" });
    conteneur.append(barre, canvas, zoneControles, zoneMesures, zoneExpl);
    sim.canvas = canvas;

    const elems = {};
    (def.controles || []).forEach(c => {
      if (cache.has(c.k)) return;
      let entree;
      const val = LS.el("b", {});
      const aff = () => { val.textContent = c.choix ? "" : c.bool ? "" : (c.format ? c.format(sim.p[c.k]) : LS.nombre(sim.p[c.k], c.dec === undefined ? 0 : c.dec) + (c.unite ? " " + c.unite : "")); };
      if (c.choix) {
        entree = LS.el("select", { onchange: e => { sim.p[c.k] = c.nombres ? +e.target.value : e.target.value; changement(c.k); } });
        c.choix.forEach(o => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; const op = LS.el("option", { value: v, text: t }); entree.append(op); });
      } else if (c.bool) {
        entree = LS.el("input", { type: "checkbox", onchange: e => { sim.p[c.k] = e.target.checked; changement(c.k); } });
      } else {
        const pos = v => c.log ? 1000 * Math.log(v / c.min) / Math.log(c.max / c.min) : v;
        entree = LS.el("input", { type: "range", min: c.log ? 0 : c.min, max: c.log ? 1000 : c.max, step: c.log ? 1 : (c.pas || 1) });
        entree.addEventListener("input", () => {
          let v = +entree.value;
          if (c.log) v = +(c.min * Math.pow(c.max / c.min, v / 1000)).toPrecision(3);
          sim.p[c.k] = v; aff(); changement(c.k);
        });
        entree._pos = pos;
      }
      elems[c.k] = { c, entree, aff };
      const lab = LS.el("label", {}, [LS.el("span", { text: c.nom }), val]);
      zoneControles.append(LS.el("div", { class: "controle", title: c.aide || "" }, c.bool ? [LS.el("label", { style: "justify-content:flex-start;gap:8px" }, [entree, LS.el("span", { text: c.nom })])] : [lab, entree]));
    });
    sim.majControles = function () {
      Object.values(elems).forEach(({ c, entree, aff }) => {
        if (c.choix) entree.value = sim.p[c.k];
        else if (c.bool) entree.checked = !!sim.p[c.k];
        else entree.value = entree._pos(sim.p[c.k]);
        aff();
      });
    };
    function changement(k) { if (def.changement) def.changement(sim, k); }
    sim.majControles();

    let ctx, W = 0;
    function dimensionner() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = Math.max(300, r.width);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    dimensionner();
    window.addEventListener("resize", dimensionner);
    sim.largeur = () => W;

    if (def.pointeur) {
      const pos = ev => { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
      let appui = false;
      canvas.addEventListener("pointerdown", ev => { appui = true; canvas.setPointerCapture(ev.pointerId); def.pointeur(sim, "bas", ...pos(ev)); });
      canvas.addEventListener("pointermove", ev => { def.pointeur(sim, appui ? "glisse" : "survol", ...pos(ev)); });
      canvas.addEventListener("pointerup", ev => { appui = false; def.pointeur(sim, "haut", ...pos(ev)); });
    }

    if (def.init) def.init(sim);
    let avant = performance.now(), cumul = 1;
    function image(t) {
      const dt = Math.max(0, Math.min(0.05, (t - avant) / 1000)); avant = t;
      if (sim.enMarche && !document.hidden) { sim.t += dt; if (def.avancer) def.avancer(sim, dt); }
      const c = LS.couleurs();
      ctx.clearRect(0, 0, W, H);
      def.dessiner(sim, ctx, W, H, c, dt);
      cumul += dt;
      if (cumul > 0.2) {
        cumul = 0;
        if (def.mesures) {
          const l = def.mesures(sim);
          zoneMesures.innerHTML = "";
          l.forEach(([n, v, cls]) => zoneMesures.append(LS.el("div", { class: "mesure" + (cls ? " " + cls : "") }, [LS.el("div", { class: "nom", text: n }), LS.el("div", { class: "val", text: v })])));
        }
        if (def.explication) zoneExpl.innerHTML = LS.texte(def.explication(sim) || "");
      }
      requestAnimationFrame(image);
    }
    requestAnimationFrame(image);
    return sim;
  };

  /* ---------- Petites aides de dessin ---------- */
  LS.dessin = {
    fleche(ctx, x1, y1, x2, y2, coul, ep) {
      ctx.strokeStyle = coul; ctx.fillStyle = coul; ctx.lineWidth = ep || 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1), s = 6 + (ep || 2);
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
      ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    },
    texte(ctx, t, x, y, coul, taille, align, gras) {
      ctx.fillStyle = coul; ctx.font = (gras ? "700 " : "500 ") + (taille || 13) + "px " + LS.POLICE;
      ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y);
    },
    /* Roue dentée : centre, rayon primitif, nombre de dents, angle. */
    engrenage(ctx, x, y, r, z, angle, coul, contour) {
      const h = Math.min(10, Math.max(4, 2.2 * Math.PI * r / z / 2));
      ctx.beginPath();
      for (let i = 0; i < z; i++) {
        const a0 = angle + (i / z) * 2 * Math.PI, d = 2 * Math.PI / z;
        const pts = [[r - h * 0.6, a0], [r + h * 0.5, a0 + d * 0.15], [r + h * 0.5, a0 + d * 0.4], [r - h * 0.6, a0 + d * 0.55], [r - h * 0.6, a0 + d]];
        pts.forEach(([rr, aa], k) => { const px = x + rr * Math.cos(aa), py = y + rr * Math.sin(aa); if (i === 0 && k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      }
      ctx.closePath();
      ctx.fillStyle = coul; ctx.fill();
      ctx.strokeStyle = contour || "rgba(0,0,0,.5)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, Math.max(4, r * 0.18), 0, 2 * Math.PI); ctx.fillStyle = contour || "#333"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r - h) * Math.cos(angle), y + (r - h) * Math.sin(angle)); ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 2; ctx.stroke();
    },
    /* Graphe simple : séries [{pts:[[x,y]], coul}] dans un cadre. */
    graphe(ctx, x, y, w, h, opts) {
      const c = opts.c;
      ctx.strokeStyle = c.bordure; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
      const [x0, x1] = opts.xlim, [y0, y1] = opts.ylim;
      const X = v => x + (v - x0) / (x1 - x0) * w, Y = v => y + h - (v - y0) / (y1 - y0) * h;
      ctx.strokeStyle = c.sombre ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)";
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x, y + i * h / 5); ctx.lineTo(x + w, y + i * h / 5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i * w / 5, y); ctx.lineTo(x + i * w / 5, y + h); ctx.stroke(); }
      if (y0 < 0 && y1 > 0) { ctx.strokeStyle = c.doux; ctx.beginPath(); ctx.moveTo(x, Y(0)); ctx.lineTo(x + w, Y(0)); ctx.stroke(); }
      (opts.series || []).forEach(s => {
        ctx.strokeStyle = s.coul; ctx.lineWidth = s.ep || 2; ctx.beginPath();
        let premier = true;
        s.pts.forEach(([a, b]) => { if (!isFinite(b)) { premier = true; return; } const px = X(a), py = Y(Math.max(y0 - (y1 - y0), Math.min(y1 + (y1 - y0), b))); if (premier) { ctx.moveTo(px, py); premier = false; } else ctx.lineTo(px, py); });
        ctx.stroke();
      });
      (opts.points || []).forEach(p => { ctx.fillStyle = p.coul; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 5, 0, 2 * Math.PI); ctx.fill(); });
      if (opts.titre) LS.dessin.texte(ctx, opts.titre, x + 4, y - 9, c.texte, 12, "left", true);
      if (opts.xlab) LS.dessin.texte(ctx, opts.xlab, x + w, y + h + 12, c.doux, 11, "right");
      if (opts.ylab) LS.dessin.texte(ctx, opts.ylab, x + 4, y + 9, c.doux, 11, "left");
      return { X, Y };
    }
  };
})();
