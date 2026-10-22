/* Maths utiles : cercle trigonométrique, nombres complexes et impédance, dérivée et intégrale,
   exponentielle et décibels, statistiques. Les fonctions de calcul (LS.impedanceRLC,
   LS.integraleRectangles, LS.regressionLineaire…) sont pures et testées sous Node. */
(function () {
  "use strict";
  const LS = window.LS;
  LS.sims = LS.sims || {};
  const D = () => LS.dessin;
  const PI = Math.PI;

  /* ---------- Fonctions pures ---------- */
  LS.complexe = {
    somme: (z, w) => [z[0] + w[0], z[1] + w[1]],
    produit: (z, w) => [z[0] * w[0] - z[1] * w[1], z[0] * w[1] + z[1] * w[0]],
    module: z => Math.hypot(z[0], z[1]),
    argument: z => Math.atan2(z[1], z[0]),
    polaire: (r, a) => [r * Math.cos(a), r * Math.sin(a)]
  };
  // Impédance d'un circuit R, L, C en série à la fréquence f : Z = R + j(Lω − 1/(Cω)).
  LS.impedanceRLC = function (R, L, C, f) {
    const w = 2 * PI * f, XL = L * w, XC = 1 / (C * w), im = XL - XC;
    return { re: R, im, XL, XC, module: Math.hypot(R, im), argument: Math.atan2(im, R), f0: 1 / (2 * PI * Math.sqrt(L * C)) };
  };
  // Méthode des rectangles (à gauche ou au point milieu) sur [a, b] avec n rectangles.
  LS.integraleRectangles = function (f, a, b, n, methode) {
    n = Math.max(1, Math.round(n));
    const h = (b - a) / n, dec = methode === "milieu" ? 0.5 : 0;
    let s = 0;
    for (let i = 0; i < n; i++) s += f(a + (i + dec) * h);
    return s * h;
  };
  // Générateur pseudo-aléatoire à graine (mulberry32) : mêmes tirages pour la même graine.
  LS.alea = function (graine) {
    let a = (graine >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // Loi normale centrée réduite (Box-Muller).
  LS.tirageGauss = function (rng) {
    const u = Math.max(1e-12, rng()), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v);
  };
  LS.statsDescriptives = function (xs) {
    const n = xs.length;
    if (!n) return { n: 0, moyenne: NaN, variance: NaN, ecartType: NaN, mediane: NaN };
    const m = xs.reduce((a, b) => a + b, 0) / n;
    const v = n > 1 ? xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1) : 0;
    const t = xs.slice().sort((a, b) => a - b);
    const med = n % 2 ? t[(n - 1) / 2] : (t[n / 2 - 1] + t[n / 2]) / 2;
    return { n, moyenne: m, variance: v, ecartType: Math.sqrt(v), mediane: med };
  };
  // Droite des moindres carrés y = a·x + b et coefficient de corrélation r.
  LS.regressionLineaire = function (xs, ys) {
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    const a = sxy / sxx;
    return { a, b: my - a * mx, r: sxy / Math.sqrt(sxx * syy) };
  };
  LS.decibels = {
    versRapport: (dB, grandeur) => Math.pow(10, dB / (grandeur === "tension" ? 20 : 10)),
    depuisRapport: (k, grandeur) => (grandeur === "tension" ? 20 : 10) * Math.log10(k)
  };
  LS.tempsDoublement = taux => Math.log(2) / Math.log(1 + taux / 100);

  // Montre seulement les réglages utiles au mode choisi (les .controle sont dans l'ordre de def.controles).
  function filtrerControles(el, controles, visible) {
    const divs = el.querySelectorAll(".controles > .controle");
    controles.forEach((c, i) => { if (divs[i]) divs[i].style.display = visible(c) ? "" : "none"; });
  }
  const deg = r => r * 180 / PI;
  const nb = (v, d) => LS.nombre(v, d === undefined ? 2 : d);

  /* ---------- 1. Cercle trigonométrique et sinusoïdes ---------- */
  LS.sims.trigo = function (el, cfg) {
    const F_RESEAU = 50;
    function plan(W, H) {
      if (W >= 640) return { r: 105, cx: 140, cy: 160, g1: [300, 40, W - 320, 240], g2: [40, 330, W - 60, H - 360] };
      const r = Math.min(75, (W - 60) / 4.5), cx = r + 18, cy = 40 + r;
      return { r, cx, cy, g1: [cx + r + 28, 40, W - (cx + r + 28) - 8, 2 * r], g2: [36, 2 * r + 100, W - 46, H - 2 * r - 130] };
    }
    return LS.simAnimee(el, {
      hauteur: 520,
      controles: [
        { k: "angle", nom: "Angle θ", min: 0, max: 360, pas: 1, defaut: 30, unite: "°" },
        { k: "tourne", nom: "Faire tourner le point (vitesse angulaire ω = 2πf)", bool: true, defaut: false },
        { k: "f", nom: "Fréquence de rotation f", min: 0.05, max: 1, pas: 0.05, defaut: 0.2, unite: "tr/s", dec: 2 },
        { k: "radians", nom: "Afficher les angles en radians", bool: true, defaut: false },
        { k: "phi", nom: "Déphasage φ du courant i par rapport à la tension u", min: -180, max: 180, pas: 5, defaut: 0, unite: "°" },
        { k: "a2", nom: "Amplitude du courant (échelle libre)", min: 0, max: 1.5, pas: 0.05, defaut: 0.7, dec: 2 }
      ],
      init(s) { s.etat.theta = s.p.angle * PI / 180; s.etat.tours = 0; },
      changement(s, k) {
        if (k === "angle") s.etat.theta = s.p.angle * PI / 180;
        if (k === "tourne" && !s.p.tourne) { s.p.angle = Math.round(deg(s.etat.theta)) % 360; s.etat.theta = s.p.angle * PI / 180; s.majControles(); }
        if (k === "tourne" && s.p.tourne) { s.etat.debut = s.t; s.etat.tours = 0; }
      },
      avancer(s, dt) {
        if (!s.p.tourne) { s.etat.theta = s.p.angle * PI / 180; return; }
        const t = s.etat.theta + 2 * PI * s.p.f * dt;
        if (t >= 2 * PI) s.etat.tours++;
        s.etat.theta = t % (2 * PI);
      },
      pointeur(s, type, x, y) {
        if (type !== "bas" && type !== "glisse") return;
        const g = plan(s.largeur(), 520);
        if (Math.hypot(x - g.cx, y - g.cy) > g.r * 1.4) return;
        let a = Math.round(deg(Math.atan2(-(y - g.cy), x - g.cx)));
        if (a < 0) a += 360;
        s.p.tourne = false; s.p.angle = a % 360; s.etat.theta = s.p.angle * PI / 180; s.majControles();
      },
      dessiner(s, ctx, W, H, c) {
        const g = plan(W, H), th = s.etat.theta, co = Math.cos(th), si = Math.sin(th);
        const fmt = a => s.p.radians ? nb(a / PI, 2) + "π rad" : Math.round(deg(a)) + "°";
        // Cercle unité
        ctx.strokeStyle = c.bordure; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.cx - g.r - 12, g.cy); ctx.lineTo(g.cx + g.r + 12, g.cy); ctx.moveTo(g.cx, g.cy - g.r - 12); ctx.lineTo(g.cx, g.cy + g.r + 12); ctx.stroke();
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r, 0, 2 * PI); ctx.stroke();
        const px = g.cx + g.r * co, py = g.cy - g.r * si;
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r * 0.25, 0, -th, true); ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = c.info; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, g.cy); ctx.stroke();
        ctx.strokeStyle = c.accentFort; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(g.cx, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = c.info; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(px, g.cy); ctx.stroke();
        ctx.strokeStyle = c.accentFort; ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx, py); ctx.stroke();
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(px, py); ctx.stroke();
        ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(px, py, 7, 0, 2 * PI); ctx.fill();
        D().texte(ctx, "θ = " + fmt(th), g.cx + 6, g.cy - g.r - 18, c.texte, 12, "left", true);
        D().texte(ctx, "cos θ", (g.cx + px) / 2, g.cy + 12, c.info, 11, "center", true);
        D().texte(ctx, "sin θ", g.cx - 6, (g.cy + py) / 2, c.accentFort, 11, "right", true);
        // Sinus et cosinus sur un tour
        const ps = [], pc = [];
        for (let i = 0; i <= 120; i++) { const a = i / 120 * 2 * PI; ps.push([a, Math.sin(a)]); pc.push([a, Math.cos(a)]); }
        D().graphe(ctx, ...g.g1, { c, xlim: [0, 2 * PI], ylim: [-1.2, 1.2], series: [{ pts: pc, coul: c.info, ep: 2 }, { pts: ps, coul: c.accentFort, ep: 2.5 }],
          points: [{ x: th, y: si, coul: c.accentFort }, { x: th, y: co, coul: c.info }], titre: W >= 640 ? "sin (orange) et cos (bleu) sur un tour" : "sin, cos", xlab: s.p.radians ? "θ de 0 à 2π" : "θ de 0 à 360°" });
        // Tension et courant du réseau à 50 Hz
        const T = 1 / F_RESEAU, phi = s.p.phi * PI / 180, pu = [], pi = [];
        for (let i = 0; i <= 200; i++) { const t = i / 200 * 2 * T; pu.push([t * 1000, Math.sin(2 * PI * F_RESEAU * t)]); pi.push([t * 1000, s.p.a2 * Math.sin(2 * PI * F_RESEAU * t - phi)]); }
        D().graphe(ctx, ...g.g2, { c, xlim: [0, 2 * T * 1000], ylim: [-1.6, 1.6], series: [{ pts: pu, coul: c.accentFort, ep: 2.5 }, { pts: pi, coul: c.ok, ep: 2 }],
          titre: W >= 640 ? "u(t) = sin(ωt) (orange) et i(t) = I·sin(ωt − φ) (vert), réseau 50 Hz" : "u (orange) et i (vert) à 50 Hz", xlab: "t (ms), deux périodes de 20 ms" });
      },
      mesures(s) {
        const th = s.etat.theta, co = Math.cos(th), si = Math.sin(th), dt = s.p.phi / 360 * 20;
        return [["Angle", Math.round(deg(th)) + "° = " + nb(th, 3) + " rad"], ["sin θ", nb(si, 3)], ["cos θ", nb(co, 3)], ["tan θ", Math.abs(co) < 1e-3 ? "infinie" : nb(si / co, 3)],
          ["sin² + cos²", nb(si * si + co * co, 3)],
          s.p.tourne ? ["Période d'un tour T = 1/f", nb(1 / s.p.f, 2) + " s (ω = " + nb(2 * PI * s.p.f, 2) + " rad/s)"] : ["Rotation", "arrêtée"],
          ["Décalage du courant à 50 Hz", (dt === 0 ? "aucun" : nb(Math.abs(dt), 2) + " ms " + (dt > 0 ? "en retard" : "en avance"))]];
      },
      explication(s) {
        const a = Math.abs(s.p.phi);
        let ph = "";
        if (a === 0) ph = "u et i sont **en phase** : c'est le cas d'une résistance.";
        else if (a === 90) ph = s.p.phi > 0 ? "i est **en quadrature retard** : c'est le cas d'une bobine parfaite." : "i est **en quadrature avance** : c'est le cas d'un condensateur parfait.";
        else if (a === 180) ph = "u et i sont **en opposition de phase** : quand l'une est maximale, l'autre est minimale.";
        else ph = "Un déphasage de " + a + "° correspond à un récepteur " + (s.p.phi > 0 ? "inductif (moteur, transformateur)" : "capacitif") + " ; cos φ = " + nb(Math.cos(s.p.phi * PI / 180), 2) + " est son **facteur de puissance**.";
        return "Sur le cercle de rayon 1, le point d'angle θ a pour coordonnées (**cos θ**, **sin θ**). Quand il tourne à vitesse constante ω = 2πf, sa hauteur trace une **sinusoïde** : c'est exactement la forme de la tension du réseau (ω = 2π × 50 = 314 rad/s). Un tour complet vaut 360° = **2π radians**.\n\n" + ph;
      }
    }, cfg);
  };

  /* ---------- 2. Nombres complexes et impédance ---------- */
  LS.sims.complexes = function (el, cfg) {
    const controles = [
      { k: "vue", nom: "Partie", choix: [["plan", "Le plan complexe"], ["rlc", "L'impédance d'un circuit RLC série"]], defaut: "plan" },
      { k: "re1", nom: "Partie réelle de z₁ (ou clique dans le plan)", min: -6, max: 6, pas: 0.1, defaut: 2, dec: 1, vue: "plan" },
      { k: "im1", nom: "Partie imaginaire de z₁", min: -6, max: 6, pas: 0.1, defaut: 1, dec: 1, vue: "plan" },
      { k: "r2", nom: "Module de z₂", min: 0, max: 2, pas: 0.05, defaut: 1, dec: 2, vue: "plan" },
      { k: "t2", nom: "Argument de z₂", min: -180, max: 180, pas: 5, defaut: 45, unite: "°", vue: "plan" },
      { k: "op", nom: "Opération", choix: [["somme", "z₁ + z₂ (somme)"], ["produit", "z₁ × z₂ (produit)"]], defaut: "somme", vue: "plan" },
      { k: "R", nom: "Résistance R", min: 1, max: 1000, log: true, defaut: 100, format: v => LS.si(v, "Ω"), vue: "rlc" },
      { k: "L", nom: "Inductance L", min: 0.001, max: 1, log: true, defaut: 0.1, format: v => LS.si(v, "H"), vue: "rlc" },
      { k: "C", nom: "Capacité C", min: 1e-6, max: 1e-3, log: true, defaut: 1e-5, format: v => LS.si(v, "F"), vue: "rlc" },
      { k: "f", nom: "Fréquence f", min: 1, max: 10000, log: true, defaut: 50, format: v => LS.si(v, "Hz"), vue: "rlc" }
    ];
    function plan(W, H) {
      if (W >= 640) { const S = Math.min(H - 60, W * 0.48); return { S, x: 20, y: 30, g: [S + 70, 40, W - S - 90, H - 90] }; }
      const S = Math.min(W - 30, 300); return { S, x: (W - S) / 2, y: 30, g: [44, S + 70, W - 56, H - S - 100] };
    }
    const filtrer = s => filtrerControles(el, controles, c => !c.vue || c.vue === s.p.vue);
    function resultat(s) {
      const z1 = [s.p.re1, s.p.im1], z2 = LS.complexe.polaire(s.p.r2, s.p.t2 * PI / 180);
      return { z1, z2, z3: s.p.op === "produit" ? LS.complexe.produit(z1, z2) : LS.complexe.somme(z1, z2) };
    }
    const ecrire = z => nb(z[0], 2) + (z[1] < 0 ? " − " : " + ") + "j" + nb(Math.abs(z[1]), 2);
    const expo = z => nb(LS.complexe.module(z), 2) + "·e^(j" + Math.round(deg(LS.complexe.argument(z))) + "°)";
    return LS.simAnimee(el, {
      hauteur: 520,
      controles,
      init(s) { filtrer(s); },
      changement(s, k) { if (k === "vue") filtrer(s); },
      pointeur(s, type, x, y) {
        if (s.p.vue !== "plan" || (type !== "bas" && type !== "glisse")) return;
        const g = plan(s.largeur(), 520), u = g.S / 14;
        const re = (x - (g.x + g.S / 2)) / u, im = -(y - (g.y + g.S / 2)) / u;
        if (Math.abs(re) > 7 || Math.abs(im) > 7) return;
        s.p.re1 = Math.max(-6, Math.min(6, Math.round(re * 10) / 10)); s.p.im1 = Math.max(-6, Math.min(6, Math.round(im * 10) / 10)); s.majControles();
      },
      dessiner(s, ctx, W, H, c) {
        const g = plan(W, H);
        if (s.p.vue === "plan") {
          const u = g.S / 14, ox = g.x + g.S / 2, oy = g.y + g.S / 2, P = z => [ox + z[0] * u, oy - z[1] * u];
          ctx.strokeStyle = c.sombre ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.07)"; ctx.lineWidth = 1;
          for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(ox + i * u, g.y); ctx.lineTo(ox + i * u, g.y + g.S); ctx.moveTo(g.x, oy - i * u); ctx.lineTo(g.x + g.S, oy - i * u); ctx.stroke(); }
          ctx.strokeStyle = c.doux; ctx.beginPath(); ctx.moveTo(g.x, oy); ctx.lineTo(g.x + g.S, oy); ctx.moveTo(ox, g.y); ctx.lineTo(ox, g.y + g.S); ctx.stroke();
          ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(ox, oy, u, 0, 2 * PI); ctx.stroke(); ctx.setLineDash([]);
          D().texte(ctx, "Re", g.x + g.S - 4, oy - 10, c.doux, 11, "right", true);
          D().texte(ctx, "Im (j)", ox + 6, g.y + 8, c.doux, 11, "left", true);
          const r = resultat(s);
          const vect = (z, coul, nom, depuis) => { const a = depuis ? P(depuis) : [ox, oy], b = P(depuis ? LS.complexe.somme(depuis, z) : z); D().fleche(ctx, a[0], a[1], b[0], b[1], coul, 2.5); D().texte(ctx, nom, b[0] + 8, b[1] - 8, coul, 12, "left", true); };
          if (s.p.op === "somme") { ctx.globalAlpha = 0.5; vect(r.z2, c.info, "", r.z1); ctx.globalAlpha = 1; }
          vect(r.z1, c.accentFort, "z₁", null);
          vect(r.z2, c.info, "z₂", null);
          vect(r.z3, c.ok, s.p.op === "produit" ? "z₁·z₂" : "z₁+z₂", null);
          const p1 = P(r.z1); ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.arc(p1[0], p1[1], 6, 0, 2 * PI); ctx.fill();
          // Formes de z₁
          const lignes = ["z₁ = " + ecrire(r.z1) + "  (forme algébrique)", "|z₁| = " + nb(LS.complexe.module(r.z1), 2) + " ; arg z₁ = " + Math.round(deg(LS.complexe.argument(r.z1))) + "°", "z₁ = " + expo(r.z1) + "  (forme exponentielle)", "",
            "z₂ = " + ecrire(r.z2) + " = " + expo(r.z2), (s.p.op === "produit" ? "z₁·z₂ = " : "z₁+z₂ = ") + ecrire(r.z3) + " = " + expo(r.z3)];
          lignes.forEach((l, i) => D().texte(ctx, l, g.g[0], g.g[1] + 10 + i * 22, i < 3 ? c.accentFort : c.texte, 13, "left", i === 0 || i === 5));
        } else {
          const z = LS.impedanceRLC(s.p.R, s.p.L, s.p.C, s.p.f);
          const echelle = Math.max(s.p.R, z.XL, z.XC, z.module) * 1.15, S = g.S, u = S / 2 / echelle, ox = g.x + 30, oy = g.y + S / 2;
          ctx.strokeStyle = c.doux; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, oy); ctx.lineTo(g.x + S, oy); ctx.moveTo(ox, g.y); ctx.lineTo(ox, g.y + S); ctx.stroke();
          D().texte(ctx, "Re (Ω)", g.x + S - 4, oy + 12, c.doux, 11, "right", true);
          D().texte(ctx, "Im (Ω)", ox + 6, g.y + 8, c.doux, 11, "left", true);
          const xr = ox + s.p.R * u;
          D().fleche(ctx, ox, oy, xr, oy, c.accentFort, 3); D().texte(ctx, "R", (ox + xr) / 2, oy + 14, c.accentFort, 12, "center", true);
          D().fleche(ctx, xr, oy, xr, oy - z.XL * u, c.info, 3); D().texte(ctx, "jLω", xr + 6, oy - z.XL * u / 2, c.info, 12, "left", true);
          ctx.globalAlpha = 0.85; D().fleche(ctx, xr + 14, oy - z.XL * u, xr + 14, oy - z.im * u, c.alerte, 3); ctx.globalAlpha = 1;
          D().texte(ctx, "−j/(Cω)", xr + 20, oy - (z.XL + z.im) / 2 * u, c.alerte, 12, "left", true);
          D().fleche(ctx, ox, oy, xr, oy - z.im * u, c.ok, 3.5); D().texte(ctx, "Z", (ox + xr) / 2 - 10, oy - z.im * u / 2 - 10, c.ok, 14, "center", true);
          // |Z| en fonction de f (échelles logarithmiques)
          const pts = []; for (let i = 0; i <= 200; i++) { const f = Math.pow(10, i / 50); pts.push([i / 50, Math.log10(LS.impedanceRLC(s.p.R, s.p.L, s.p.C, f).module)]); }
          const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
          D().graphe(ctx, ...g.g, { c, xlim: [0, 4], ylim: [y0, Math.max(y1, y0 + 1)], series: [{ pts, coul: c.ok, ep: 2.5 }],
            points: [{ x: Math.log10(s.p.f), y: Math.log10(z.module), coul: c.accentFort }, { x: Math.log10(z.f0), y: Math.log10(s.p.R), coul: c.info, r: 4 }],
            titre: W >= 640 ? "|Z| selon f (échelles log : 1 Hz → 10 kHz, 10^" + y0 + " → 10^" + Math.max(y1, y0 + 1) + " Ω)" : "|Z| selon f (log-log)", xlab: "log₁₀ f", ylab: "bleu : résonance" });
        }
      },
      mesures(s) {
        if (s.p.vue === "plan") {
          const r = resultat(s);
          return [["z₁", ecrire(r.z1)], ["Module |z₁|", nb(LS.complexe.module(r.z1), 2)], ["Argument de z₁", Math.round(deg(LS.complexe.argument(r.z1))) + "°"], [s.p.op === "produit" ? "z₁ × z₂" : "z₁ + z₂", ecrire(r.z3)], ["Module du résultat", nb(LS.complexe.module(r.z3), 2)], ["Argument du résultat", Math.round(deg(LS.complexe.argument(r.z3))) + "°"]];
        }
        const z = LS.impedanceRLC(s.p.R, s.p.L, s.p.C, s.p.f), I = 10 / z.module;
        return [["Lω (bobine)", LS.si(z.XL, "Ω")], ["1/(Cω) (condensateur)", LS.si(z.XC, "Ω")], ["|Z|", LS.si(z.module, "Ω")], ["Déphasage φ = arg Z", nb(deg(z.argument), 1) + "°", Math.abs(deg(z.argument)) > 60 ? "alerte" : ""],
          ["Fréquence de résonance f₀", LS.si(z.f0, "Hz")], ["Courant sous 10 V", LS.si(I, "A")]];
      },
      explication(s) {
        if (s.p.vue === "plan") return "Un nombre complexe z = a + jb est un **point du plan** (en électricité on écrit **j** au lieu de i, réservé au courant ; j² = −1). Sa distance à l'origine est le **module** |z| = √(a² + b²), son angle est l'**argument**. Forme exponentielle : z = |z|·e^(jθ).\n- **Additionner**, c'est mettre les flèches bout à bout.\n- **Multiplier**, c'est multiplier les modules et **ajouter les arguments** : multiplier par j, c'est tourner de 90°.";
        const z = LS.impedanceRLC(s.p.R, s.p.L, s.p.C, s.p.f), r = s.p.f / z.f0;
        return "En alternatif, chaque dipôle a une **impédance complexe** : Z_R = R, Z_L = jLω (vers le haut), Z_C = −j/(Cω) (vers le bas). En série, on **additionne** ces flèches. Le module |Z| = U/I, l'argument est le **déphasage** entre u et i.\n\n" +
          (Math.abs(r - 1) < 0.03 ? "✔ **Résonance** : Lω = 1/(Cω), les deux parties imaginaires s'annulent, Z = R et le courant est maximal." : r < 1 ? "Sous la résonance, le condensateur domine : circuit **capacitif** (φ < 0)." : "Au-dessus de la résonance, la bobine domine : circuit **inductif** (φ > 0).");
      }
    }, cfg);
  };

  /* ---------- 3. Dérivée et intégrale ---------- */
  const COURBES = {
    carre: { court: "y = x²", nom: "y = x²", a: -3, b: 3, f: x => x * x, df: x => 2 * x, F: x => x * x * x / 3, ux: "", uy: "", pente: "pente", aire: "aire" },
    sinus: { court: "y = sin x", nom: "y = sin x", a: 0, b: 2 * PI, f: Math.sin, df: Math.cos, F: x => -Math.cos(x), ux: " rad", uy: "", pente: "pente", aire: "aire" },
    condo: { court: "u(t), charge RC", nom: "Charge d'un condensateur u(t) = 10(1 − e^(−t/τ)), τ = 1 s", a: 0, b: 5, f: t => 10 * (1 - Math.exp(-t)), df: t => 10 * Math.exp(-t), F: t => 10 * (t + Math.exp(-t)), ux: " s", uy: " V", pente: "vitesse de charge du/dt (V/s)", aire: "aire (V·s)" },
    vitesse: { court: "v(t) d'une voiture", nom: "Vitesse d'une voiture v(t) : accélère, roule, freine", a: 0, b: 20,
      f: t => t < 5 ? 2 * t : t < 15 ? 10 : t < 17 ? 10 - 5 * (t - 15) : 0,
      df: t => t < 5 ? 2 : t < 15 ? 0 : t < 17 ? -5 : 0,
      F: t => t < 5 ? t * t : t < 15 ? 25 + 10 * (t - 5) : t < 17 ? 125 + 10 * (t - 15) - 2.5 * (t - 15) * (t - 15) : 135,
      ux: " s", uy: " m/s", pente: "accélération dv/dt (m/s²)", aire: "distance parcourue (m)" },
    puissance: { court: "P(t) d'une maison", nom: "Puissance consommée par une maison P(t) sur 24 h", a: 0, b: 24,
      f: t => 1500 - 500 * Math.cos(2 * PI * t / 24), df: t => 500 * (2 * PI / 24) * Math.sin(2 * PI * t / 24), F: t => 1500 * t - 500 * 24 / (2 * PI) * Math.sin(2 * PI * t / 24),
      ux: " h", uy: " W", pente: "variation dP/dt (W/h)", aire: "énergie consommée (Wh)" }
  };
  LS.COURBES_MATHS = COURBES;
  LS.etatDerivee = function (p) {
    const k = COURBES[p.courbe], x = k.a + (k.b - k.a) * p.x0 / 100, n = Math.max(1, Math.round(p.n));
    const h = p.h * (k.b - k.a) / 6;
    return { k, x, h, n, y: k.f(x), pente: k.df(x), secante: (k.f(x + h) - k.f(x)) / h, aireRect: x > k.a ? LS.integraleRectangles(k.f, k.a, x, n, p.methode) : 0, aireExacte: k.F(x) - k.F(k.a) };
  };
  LS.sims.derivees = function (el, cfg) {
    function plan(W, H) { return W >= 640 ? { g1: [50, 40, W - 70, 250], g2: [50, 330, W - 70, H - 360] } : { g1: [40, 40, W - 50, 240], g2: [40, 320, W - 50, H - 350] }; }
    return LS.simAnimee(el, {
      hauteur: 520,
      controles: [
        { k: "courbe", nom: "Courbe", choix: Object.keys(COURBES).map(k => [k, COURBES[k].nom]), defaut: "carre" },
        { k: "x0", nom: "Position du point (de gauche à droite)", min: 0, max: 100, pas: 0.5, defaut: 70, unite: "%", dec: 1 },
        { k: "h", nom: "Écart h de la sécante (fraction de l'axe)", min: 0.001, max: 1, log: true, defaut: 0.5, format: v => LS.nombre(v, 3) },
        { k: "aire", nom: "Montrer l'aire sous la courbe (du début jusqu'au point)", bool: true, defaut: false },
        { k: "n", nom: "Nombre de rectangles", min: 1, max: 200, log: true, defaut: 4, format: v => String(Math.round(v)) },
        { k: "methode", nom: "Hauteur des rectangles", choix: [["gauche", "valeur à gauche"], ["milieu", "valeur au milieu"]], defaut: "gauche" }
      ],
      dessiner(s, ctx, W, H, c) {
        const g = plan(W, H), e = LS.etatDerivee(s.p), k = e.k;
        const pts = [], dpts = []; for (let i = 0; i <= 300; i++) { const x = k.a + (k.b - k.a) * i / 300; pts.push([x, k.f(x)]); dpts.push([x, k.df(x)]); }
        const ys = pts.map(p => p[1]), ymin = Math.min(0, ...ys), ymax = Math.max(...ys), marge = (ymax - ymin) * 0.12 || 1;
        const r = D().graphe(ctx, ...g.g1, { c, xlim: [k.a, k.b], ylim: [ymin - marge, ymax + marge], series: [], titre: W >= 640 ? k.nom : k.court });
        if (s.p.aire && e.x > k.a) {
          const w = (e.x - k.a) / e.n, dec = s.p.methode === "milieu" ? 0.5 : 0;
          ctx.fillStyle = "rgba(43,108,176,.25)"; ctx.strokeStyle = c.info; ctx.lineWidth = 1;
          for (let i = 0; i < e.n; i++) { const x0 = k.a + i * w, hy = k.f(x0 + dec * w); const X0 = r.X(x0), X1 = r.X(x0 + w), Y0 = r.Y(0), Y1 = r.Y(hy); ctx.fillRect(X0, Math.min(Y0, Y1), X1 - X0, Math.abs(Y1 - Y0)); if (e.n <= 60) ctx.strokeRect(X0, Math.min(Y0, Y1), X1 - X0, Math.abs(Y1 - Y0)); }
        }
        D().graphe(ctx, ...g.g1, { c, xlim: [k.a, k.b], ylim: [ymin - marge, ymax + marge], series: [{ pts, coul: c.accentFort, ep: 2.5 }] });
        // Tangente et sécante
        const L = (k.b - k.a) / 5;
        ctx.save(); ctx.beginPath(); ctx.rect(g.g1[0], g.g1[1], g.g1[2], g.g1[3]); ctx.clip();
        ctx.strokeStyle = c.ok; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.X(e.x - L), r.Y(e.y - e.pente * L)); ctx.lineTo(r.X(e.x + L), r.Y(e.y + e.pente * L)); ctx.stroke();
        ctx.setLineDash([5, 4]); ctx.strokeStyle = c.info; ctx.beginPath(); ctx.moveTo(r.X(e.x - L), r.Y(e.y - e.secante * L)); ctx.lineTo(r.X(e.x + e.h + L), r.Y(e.y + e.secante * (e.h + L))); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        ctx.fillStyle = c.info; ctx.beginPath(); ctx.arc(r.X(e.x + e.h), r.Y(k.f(e.x + e.h)), 4, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(r.X(e.x), r.Y(e.y), 6, 0, 2 * PI); ctx.fill();
        D().texte(ctx, "vert : tangente · bleu pointillé : sécante", g.g1[0] + g.g1[2], g.g1[1] + g.g1[3] + 14, c.doux, 11, "right");
        const dys = dpts.map(p => p[1]), dmin = Math.min(0, ...dys), dmax = Math.max(0, ...dys), dm = (dmax - dmin) * 0.12 || 1;
        D().graphe(ctx, ...g.g2, { c, xlim: [k.a, k.b], ylim: [dmin - dm, dmax + dm], series: [{ pts: dpts, coul: c.ok, ep: 2 }], points: [{ x: e.x, y: e.pente, coul: c.ok }], titre: W >= 640 ? "Dérivée : " + k.pente : "Dérivée" });
      },
      mesures(s) {
        const e = LS.etatDerivee(s.p), k = e.k, err = Math.abs(e.aireExacte) > 1e-9 ? Math.abs(e.aireRect - e.aireExacte) / Math.abs(e.aireExacte) : 0;
        const l = [["Point", "x = " + nb(e.x, 2) + k.ux + " ; y = " + nb(e.y, 2) + k.uy], ["Pente de la tangente (dérivée)", nb(e.pente, 3)], ["Pente de la sécante", nb(e.secante, 3), Math.abs(e.secante - e.pente) > 0.05 * Math.max(1, Math.abs(e.pente)) ? "alerte" : ""]];
        if (s.p.aire) l.push(["Aire par " + e.n + " rectangles", nb(e.aireRect, 2)], ["Aire exacte (" + k.aire + ")", nb(e.aireExacte, 2)], ["Écart", nb(100 * err, 2) + " %", err > 0.01 ? "alerte" : ""]);
        return l;
      },
      explication(s) {
        const k = COURBES[s.p.courbe];
        return "La **dérivée** est la pente de la tangente : la limite de la pente de la sécante quand l'écart h tend vers 0. Elle mesure une **vitesse de variation** ; ici, " + k.pente + ".\n\nL'**intégrale** est l'aire sous la courbe : on l'approche par des rectangles, de mieux en mieux quand leur nombre augmente. Ici l'aire représente : " + k.aire + "." +
          (s.p.courbe === "puissance" ? "\n\nÉnergie = ∫ P dt : une puissance en watts pendant des heures donne des wattheures (36 000 Wh = 36 kWh sur la journée)." : "");
      }
    }, cfg);
  };

  /* ---------- 4. Exponentielle, logarithme, décibels ---------- */
  LS.sims.exponentielle = function (el, cfg) {
    const controles = [
      { k: "mode", nom: "Phénomène", choix: [["croissance", "Croissance : intérêts composés"], ["decroissance", "Décroissance : décharge d'un condensateur"], ["decibels", "Décibels : gains et atténuations"]], defaut: "croissance" },
      { k: "taux", nom: "Taux annuel", min: 0.5, max: 20, pas: 0.5, defaut: 5, unite: "%", dec: 1, mode: "croissance" },
      { k: "duree", nom: "Durée", min: 5, max: 60, pas: 1, defaut: 30, unite: "ans", mode: "croissance" },
      { k: "tau", nom: "Constante de temps τ = RC", min: 0.1, max: 10, log: true, defaut: 1, format: v => LS.nombre(v, 2) + " s", mode: "decroissance" },
      { k: "log", nom: "Axe vertical en échelle logarithmique", bool: true, defaut: false, mode: "croissance decroissance" },
      { k: "gain", nom: "Gain", min: -40, max: 40, pas: 1, defaut: 0, unite: "dB", mode: "decibels" },
      { k: "grandeur", nom: "Grandeur", choix: [["puissance", "une puissance (×10 tous les 10 dB)"], ["tension", "une tension ou un courant (×10 tous les 20 dB)"]], defaut: "puissance", mode: "decibels" }
    ];
    const filtrer = s => filtrerControles(el, controles, c => !c.mode || c.mode.split(" ").includes(s.p.mode));
    return LS.simAnimee(el, {
      hauteur: 440,
      controles,
      init(s) { filtrer(s); },
      changement(s, k) { if (k === "mode") filtrer(s); },
      dessiner(s, ctx, W, H, c) {
        const g = [56, 40, W - 76, H - 80];
        const Y = v => s.p.log ? Math.log10(Math.max(1e-9, v)) : v;
        if (s.p.mode === "croissance") {
          const C0 = 1000, r = s.p.taux / 100, comp = [], simple = [];
          for (let i = 0; i <= 200; i++) { const t = s.p.duree * i / 200; comp.push([t, Y(C0 * Math.pow(1 + r, t))]); simple.push([t, Y(C0 * (1 + r * t))]); }
          const max = C0 * Math.pow(1 + r, s.p.duree);
          const ylim = s.p.log ? [3, Math.max(4, Math.ceil(Math.log10(max)))] : [0, max * 1.08];
          const R = D().graphe(ctx, ...g, { c, xlim: [0, s.p.duree], ylim, series: [{ pts: simple, coul: c.info, ep: 2 }, { pts: comp, coul: c.accentFort, ep: 2.5 }],
            titre: (W >= 640 ? "1 000 placés : intérêts composés (orange) et simples (bleu)" : "Composés (orange), simples (bleu)") + (s.p.log ? " · log" : ""), xlab: "années" });
          const td = LS.tempsDoublement(s.p.taux);
          for (let k = 1; k * td <= s.p.duree; k++) { const x = R.X(k * td), y = R.Y(Y(C0 * Math.pow(2, k))); ctx.fillStyle = c.ok; ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * PI); ctx.fill(); D().texte(ctx, "×" + Math.pow(2, k), x - 4, y - 12, c.ok, 11, "right", true); }
        } else if (s.p.mode === "decroissance") {
          const E = 10, tau = s.p.tau, pts = [];
          for (let i = 0; i <= 300; i++) { const t = 20 * i / 300; pts.push([t, Y(E * Math.exp(-t / tau))]); }
          const ylim = s.p.log ? [-3, 1.2] : [0, 11];
          const R = D().graphe(ctx, ...g, { c, xlim: [0, 20], ylim, series: [{ pts, coul: c.accentFort, ep: 2.5 }], titre: (W >= 640 ? "Tension d'un condensateur qui se décharge : u = 10·e^(−t/τ)" : "u = 10·e^(−t/τ)") + (s.p.log ? " · log (1 mV à 10 V)" : ""), xlab: "t (s), de 0 à 20 s" });
          [[tau, "τ : 37 %"], [tau * Math.LN2, "t½ : 50 %"], [5 * tau, "5τ : < 1 %"]].forEach(([t, nom]) => { if (t > 20) return; const v = E * Math.exp(-t / tau), x = R.X(t), y = R.Y(Y(v)); ctx.fillStyle = c.ok; ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * PI); ctx.fill(); D().texte(ctx, nom, x + 6, y - 12, c.ok, 11, "left", true); });
        } else {
          const k = LS.decibels.versRapport(s.p.gain, s.p.grandeur);
          const x0 = g[0], w = g[2], yb = g[1] + 70, X = v => x0 + (Math.log10(v) + 4) / 8 * w;
          D().texte(ctx, W >= 640 ? "Échelle logarithmique : chaque graduation multiplie par 10" : "Échelle log : ×10 par graduation", x0, g[1], c.texte, 12, "left", true);
          ctx.strokeStyle = c.texte; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0 + w, yb); ctx.stroke();
          for (let p = -4; p <= 4; p++) { const x = X(Math.pow(10, p)); ctx.beginPath(); ctx.moveTo(x, yb - 8); ctx.lineTo(x, yb + 8); ctx.stroke(); D().texte(ctx, p === 0 ? "1" : "10" + (p < 0 ? "⁻" : "") + "⁰¹²³⁴"[Math.abs(p)], x, yb + 22, c.doux, 11, "center"); }
          const xk = X(Math.max(1e-4, Math.min(1e4, k)));
          D().fleche(ctx, xk, yb - 46, xk, yb - 10, c.accentFort, 3);
          D().texte(ctx, "× " + (k >= 0.01 ? nb(k, k < 10 ? 3 : 1) : k.toExponential(2).replace(".", ",")), xk, yb - 56, c.accentFort, 14, "center", true);
          // Barres : puissance ou tension d'entrée et de sortie
          const bh = 30, by = yb + 60, bmax = w * 0.9, lin = v => Math.min(bmax, bmax * v / Math.max(1, k));
          ctx.fillStyle = c.info; ctx.fillRect(x0, by, lin(1), bh); D().texte(ctx, "entrée", x0 + 6, by + bh / 2, "#fff", 12, "left", true);
          ctx.fillStyle = c.accentFort; ctx.fillRect(x0, by + bh + 14, Math.max(2, lin(k)), bh); D().texte(ctx, "sortie (" + s.p.gain + " dB)", x0 + 6, by + 1.5 * bh + 14, k > 0.1 * Math.max(1, k) ? "#fff" : c.texte, 12, "left", true);
          const repere = s.p.grandeur === "tension" ? [["−3 dB", "× 0,707"], ["+6 dB", "× 2"], ["+20 dB", "× 10"], ["−40 dB", "× 0,01"]] : [["−3 dB", "× 0,5"], ["+3 dB", "× 2"], ["+10 dB", "× 10"], ["−30 dB", "× 0,001"]];
          repere.forEach(([a, b], i) => D().texte(ctx, a + " : " + b, x0 + (i % 2) * w / 2, by + 2 * bh + 50 + Math.floor(i / 2) * 22, c.texte, 12, "left", false));
        }
      },
      mesures(s) {
        if (s.p.mode === "croissance") {
          const td = LS.tempsDoublement(s.p.taux);
          return [["Capital final (composé)", nb(1000 * Math.pow(1 + s.p.taux / 100, s.p.duree), 0)], ["Capital final (simple)", nb(1000 * (1 + s.p.taux / 100 * s.p.duree), 0)], ["Temps de doublement exact ln 2 / ln(1 + r)", nb(td, 1) + " ans"], ["Règle des 70 : 70 / taux", nb(70 / s.p.taux, 1) + " ans"]];
        }
        if (s.p.mode === "decroissance") return [["Constante de temps τ", nb(s.p.tau, 2) + " s"], ["Demi-vie t½ = τ·ln 2", nb(s.p.tau * Math.LN2, 2) + " s"], ["Quasi déchargé (5τ)", nb(5 * s.p.tau, 1) + " s"], ["Tension à t = 5 s", nb(10 * Math.exp(-5 / s.p.tau), 3) + " V"]];
        const k = LS.decibels.versRapport(s.p.gain, s.p.grandeur);
        return [["Gain", s.p.gain + " dB"], ["Rapport " + (s.p.grandeur === "tension" ? "de tensions" : "de puissances"), k >= 0.01 ? nb(k, 3) : k.toExponential(2).replace(".", ",")], ["Formule", s.p.grandeur === "tension" ? "G = 20·log₁₀(U₂/U₁)" : "G = 10·log₁₀(P₂/P₁)"]];
      },
      explication(s) {
        if (s.p.mode === "croissance") return "Une grandeur qui augmente d'un **même pourcentage** à chaque période croît de façon **exponentielle** : C(t) = C₀·(1 + r)^t. Elle **double** à intervalles réguliers (règle des 70 : 70 / taux en %). En échelle **logarithmique**, une exponentielle devient une **droite** : c'est pour cela qu'on trace ainsi les cours de bourse sur longue durée ou la loi de Moore.";
        if (s.p.mode === "decroissance") return "Une décharge, un refroidissement, la radioactivité : la grandeur diminue d'autant plus vite qu'elle est grande, u(t) = U₀·e^(−t/τ). Au bout de τ il reste 37 %, au bout de la **demi-vie** t½ = τ·ln 2 il reste la moitié, après 5τ moins de 1 %. Le **logarithme** est la fonction réciproque : il répond à « combien de temps pour… ».";
        return "Le **décibel** exprime un rapport sur une échelle logarithmique : on **additionne** des dB là où l'on **multiplierait** des rapports (gain d'une chaîne d'amplificateurs, pertes d'un câble, bilan de liaison radio). Pour une puissance, G = 10·log(P₂/P₁) ; pour une tension, G = 20·log(U₂/U₁), car P ∝ U². −3 dB = moitié de la puissance : c'est la définition de la **fréquence de coupure** d'un filtre.";
      }
    }, cfg);
  };

  /* ---------- 5. Statistiques et probabilités ---------- */
  const LOIS = {
    de: { nom: "Lancer d'un dé", mu: () => 3.5, sigma: () => Math.sqrt(35 / 12), tirer: r => 1 + Math.floor(r() * 6), valeurs: [1, 2, 3, 4, 5, 6], proba: () => 1 / 6 },
    deuxdes: { nom: "Somme de deux dés", mu: () => 7, sigma: () => Math.sqrt(35 / 6), tirer: r => 2 + Math.floor(r() * 6) + Math.floor(r() * 6), valeurs: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], proba: v => (6 - Math.abs(v - 7)) / 36 },
    piece: { nom: "Pile (1) ou face (0)", mu: () => 0.5, sigma: () => 0.5, tirer: r => r() < 0.5 ? 1 : 0, valeurs: [0, 1], proba: () => 0.5 },
    gauss: { nom: "Loi normale (taille, erreur de mesure…)", mu: p => p.mu, sigma: p => p.sigma, tirer: (r, p) => p.mu + p.sigma * LS.tirageGauss(r) }
  };
  LS.LOIS_STATS = LOIS;
  LS.nuageCorrele = function (n, rho, graine) {
    const r = LS.alea(graine), xs = [], ys = [];
    for (let i = 0; i < n; i++) { const x = LS.tirageGauss(r), e = LS.tirageGauss(r); xs.push(x); ys.push(rho * x + Math.sqrt(1 - rho * rho) * e); }
    return { xs, ys };
  };
  LS.resumeStats = function (s) {
    const e = s.etat, n = e.n, m = n ? e.somme / n : NaN, v = n > 1 ? (e.somme2 - n * m * m) / (n - 1) : NaN, et = Math.sqrt(Math.max(0, v));
    return { n, moyenne: m, ecartType: et, demiIC: 1.96 * et / Math.sqrt(n), part1sigma: n ? e.dans1 / n : NaN };
  };
  LS.sims.statistiques = function (el, cfg) {
    const controles = [
      { k: "exp", nom: "Expérience", choix: [["de", "Lancer d'un dé"], ["deuxdes", "Somme de deux dés"], ["piece", "Pile ou face"], ["gauss", "Loi normale"], ["nuage", "Deux grandeurs corrélées (nuage de points)"]], defaut: "de" },
      { k: "vitesse", nom: "Tirages par seconde", min: 1, max: 2000, log: true, defaut: 20, format: v => String(Math.round(v)), exp: "de deuxdes piece gauss" },
      { k: "mu", nom: "Moyenne μ", min: 0, max: 100, pas: 1, defaut: 50, exp: "gauss" },
      { k: "sigma", nom: "Écart type σ", min: 1, max: 30, pas: 1, defaut: 10, exp: "gauss" },
      { k: "rho", nom: "Corrélation réelle ρ", min: -1, max: 1, pas: 0.05, defaut: 0.8, dec: 2, exp: "nuage" },
      { k: "npts", nom: "Nombre de points", min: 10, max: 2000, log: true, defaut: 100, format: v => String(Math.round(v)), exp: "nuage" },
      { k: "graine", nom: "Graine du hasard (mêmes tirages pour la même graine)", min: 1, max: 100, pas: 1, defaut: 42 }
    ];
    const filtrer = s => filtrerControles(el, controles, c => !c.exp || c.exp.split(" ").includes(s.p.exp));
    function recommencer(s) {
      Object.assign(s.etat, { rng: LS.alea(s.p.graine), n: 0, somme: 0, somme2: 0, comptes: {}, bins: {}, dans1: 0, hist: [], acc: 0 });
      if (s.p.exp === "nuage") { s.etat.nuage = LS.nuageCorrele(Math.round(s.p.npts), Math.max(-0.999, Math.min(0.999, s.p.rho)), s.p.graine); s.etat.reg = LS.regressionLineaire(s.etat.nuage.xs, s.etat.nuage.ys); }
    }
    function tirer(s, k) {
      const e = s.etat, L = LOIS[s.p.exp];
      if (!L) return;
      const mu = L.mu(s.p), sg = L.sigma(s.p);
      for (let i = 0; i < k; i++) {
        const v = L.tirer(e.rng, s.p);
        e.n++; e.somme += v; e.somme2 += v * v;
        if (L.valeurs) e.comptes[v] = (e.comptes[v] || 0) + 1;
        else { const b = Math.floor((v - mu) / (sg / 2)); e.bins[b] = (e.bins[b] || 0) + 1; }
        if (Math.abs(v - mu) <= sg) e.dans1++;
        if (e.n < 20 || Math.abs(Math.log(e.n) - Math.log(e.hist.length ? e.hist[e.hist.length - 1][0] : 1)) > 0.03) e.hist.push([e.n, e.somme / e.n]);
      }
    }
    return LS.simAnimee(el, {
      hauteur: 500,
      controles,
      boutons: [{ k: "plus", texte: "+ 1 000 tirages", action: s => tirer(s, 1000) }, { k: "raz", texte: "↺ Recommencer", action: s => recommencer(s) }],
      init(s) { filtrer(s); recommencer(s); },
      changement(s, k) { if (k === "exp") filtrer(s); if (k !== "vitesse") recommencer(s); },
      avancer(s, dt) {
        if (s.p.exp === "nuage") return;
        s.etat.acc += Math.round(s.p.vitesse) * dt;
        const k = Math.floor(s.etat.acc); s.etat.acc -= k; if (k > 0) tirer(s, k);
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, large = W >= 640;
        if (s.p.exp === "nuage") {
          const S = Math.min(H - 70, large ? W * 0.6 : W - 60), g = [50, 40, S, S];
          const pts = e.nuage.xs.map((x, i) => [x, e.nuage.ys[i]]);
          const R = D().graphe(ctx, ...g, { c, xlim: [-3.5, 3.5], ylim: [-3.5, 3.5], series: [], titre: large ? "Nuage de points et droite de régression (moindres carrés)" : "Nuage et droite de régression", xlab: "x (−3,5 à 3,5)" });
          ctx.fillStyle = c.info; pts.forEach(([x, y]) => { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(R.X(x), R.Y(y), 2.6, 0, 2 * PI); ctx.fill(); }); ctx.globalAlpha = 1;
          ctx.save(); ctx.beginPath(); ctx.rect(...g); ctx.clip();
          ctx.strokeStyle = c.accentFort; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(R.X(-3.5), R.Y(e.reg.a * -3.5 + e.reg.b)); ctx.lineTo(R.X(3.5), R.Y(e.reg.a * 3.5 + e.reg.b)); ctx.stroke(); ctx.restore();
          return;
        }
        const L = LOIS[s.p.exp], mu = L.mu(s.p), sg = L.sigma(s.p);
        const g1 = large ? [50, 40, W * 0.5 - 70, H - 90] : [44, 40, W - 56, (H - 130) / 2];
        const g2 = large ? [W * 0.5 + 30, 40, W * 0.5 - 50, H - 90] : [44, 80 + (H - 130) / 2, W - 56, (H - 130) / 2];
        // Histogramme des fréquences observées et probabilités théoriques
        let barres, xlim, theo = [];
        if (L.valeurs) {
          barres = L.valeurs.map(v => [v, e.n ? (e.comptes[v] || 0) / e.n : 0]);
          xlim = [L.valeurs[0] - 0.6, L.valeurs[L.valeurs.length - 1] + 0.6];
          theo = L.valeurs.map(v => [v, L.proba(v)]);
        } else {
          barres = []; for (let b = -8; b < 8; b++) barres.push([mu + (b + 0.5) * sg / 2, e.n ? (e.bins[b] || 0) / e.n : 0]);
          xlim = [mu - 4 * sg, mu + 4 * sg];
          for (let i = 0; i <= 100; i++) { const x = xlim[0] + (xlim[1] - xlim[0]) * i / 100, z = (x - mu) / sg; theo.push([x, Math.exp(-z * z / 2) / Math.sqrt(2 * PI) * 0.5]); }
        }
        const ymax = Math.max(0.05, ...barres.map(b => b[1]), ...theo.map(t => t[1])) * 1.15;
        const R = D().graphe(ctx, ...g1, { c, xlim, ylim: [0, ymax], series: [], titre: large ? "Fréquences observées (barres) et probabilités (vert)" : "Fréquences et probabilités (vert)", xlab: L.valeurs ? "" : "μ − 4σ … μ + 4σ" });
        const lb = L.valeurs ? 0.7 : sg / 2 * 0.92;
        ctx.fillStyle = c.accent; barres.forEach(([x, f]) => { ctx.fillRect(R.X(x - lb / 2), R.Y(f), R.X(x + lb / 2) - R.X(x - lb / 2), R.Y(0) - R.Y(f)); });
        if (L.valeurs) { theo.forEach(([x, p]) => { ctx.fillStyle = c.ok; ctx.fillRect(R.X(x - lb / 2), R.Y(p) - 1.5, R.X(x + lb / 2) - R.X(x - lb / 2), 3); D().texte(ctx, String(x), R.X(x), R.Y(0) + 10, c.doux, 11, "center"); }); }
        else D().graphe(ctx, ...g1, { c, xlim, ylim: [0, ymax], series: [{ pts: theo, coul: c.ok, ep: 2 }] });
        // Moyenne cumulée et intervalle à 95 % autour de la vraie moyenne
        const nmax = Math.max(100, e.n), lx = Math.log10(nmax), band = [], bandB = [];
        for (let i = 0; i <= 100; i++) { const n = Math.pow(10, lx * i / 100); band.push([lx * i / 100, mu + 1.96 * sg / Math.sqrt(n)]); bandB.push([lx * i / 100, mu - 1.96 * sg / Math.sqrt(n)]); }
        const amp = Math.max(2.5 * sg, 1e-9);
        D().graphe(ctx, ...g2, { c, xlim: [0, lx], ylim: [mu - amp, mu + amp], series: [{ pts: [[0, mu], [lx, mu]], coul: c.ok, ep: 1.5 }, { pts: band, coul: c.info, ep: 1 }, { pts: bandB, coul: c.info, ep: 1 }, { pts: e.hist.map(([n, m]) => [Math.log10(n), m]), coul: c.accentFort, ep: 2 }],
          titre: large ? "Moyenne observée (orange) selon le nombre de tirages" : "Moyenne observée selon n", xlab: "log₁₀ n (1 à " + Math.round(nmax) + ")", ylab: "bleu : ±1,96σ/√n" });
      },
      mesures(s) {
        if (s.p.exp === "nuage") {
          const r = s.etat.reg;
          return [["Points", String(s.etat.nuage.xs.length)], ["Corrélation observée r", nb(r.r, 3)], ["Droite y = a·x + b", "a = " + nb(r.a, 3) + " ; b = " + nb(r.b, 3)], ["Part de variance expliquée r²", nb(100 * r.r * r.r, 0) + " %"]];
        }
        const L = LOIS[s.p.exp], k = LS.resumeStats(s), l = [["Tirages n", String(k.n)], ["Moyenne observée", nb(k.moyenne, 3)], ["Moyenne théorique (espérance)", nb(L.mu(s.p), 3)], ["Écart type observé", nb(k.ecartType, 3)], ["Écart type théorique", nb(L.sigma(s.p), 3)],
          ["Intervalle de confiance à 95 %", k.n > 1 ? "[" + nb(k.moyenne - k.demiIC, 3) + " ; " + nb(k.moyenne + k.demiIC, 3) + "]" : "—"]];
        if (s.p.exp === "gauss") l.push(["Part dans μ ± σ", nb(100 * k.part1sigma, 1) + " %"]);
        if (s.p.exp === "deuxdes" && k.n) { const top = Object.entries(s.etat.comptes).sort((a, b) => b[1] - a[1])[0]; l.push(["Somme la plus fréquente", top[0]]); }
        return l;
      },
      explication(s) {
        if (s.p.exp === "nuage") return "Le coefficient de **corrélation** r (entre −1 et 1) mesure à quel point les points s'alignent ; la **régression linéaire** trace la droite qui minimise la somme des carrés des écarts verticaux. Avec peu de points, r varie beaucoup d'une graine à l'autre : une corrélation observée sur 20 points peut être due au hasard.\n\n⚠ **Corrélation n'est pas causalité** : les ventes de glaces et les noyades montent ensemble… parce qu'il fait chaud.";
        return "**Loi des grands nombres** : plus on fait de tirages, plus la moyenne observée se rapproche de l'**espérance**. L'erreur typique diminue comme **σ/√n** : pour diviser l'incertitude par 10, il faut 100 fois plus de tirages. L'**intervalle de confiance à 95 %** (moyenne ± 1,96·σ/√n) contient la vraie moyenne dans 95 % des expériences.\n\nPour une loi normale, environ **68 %** des valeurs tombent à moins d'un écart type de la moyenne, et 95 % à moins de deux. C'est la même idée qui juge un backtest : un résultat sur 20 trades est très incertain.";
      }
    }, cfg);
  };
})();
