/* Simulations d'électromécanique : moteur à courant continu, alternateur, transformateur,
   moteur asynchrone triphasé, moteur pas à pas et servomoteur. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;
  const RPM = w => w * 60 / (2 * Math.PI);

  /* ---------- Moteur à courant continu ---------- */
  LS.sims.moteurCC = function (el, cfg) {
    const R = 1.2, k = 0.05, J = 2e-3, f = 2e-4;
    return LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "U", nom: "Tension d'alimentation", min: -24, max: 24, pas: 0.5, defaut: 12, unite: "V", dec: 1 },
        { k: "Cr", nom: "Couple résistant (charge)", min: 0, max: 0.6, pas: 0.01, defaut: 0.05, unite: "N·m", dec: 2 },
        { k: "vitVis", nom: "Ralenti de l'animation", min: 1, max: 100, pas: 1, defaut: 30, unite: "×" }
      ],
      init(s) { s.etat.w = 0; s.etat.a = 0; s.etat.i = 0; },
      avancer(s, dt) {
        const e = s.etat, n = 20, h = dt / n;
        for (let q = 0; q < n; q++) {
          e.i = (s.p.U - k * e.w) / R;
          let C = k * e.i - f * e.w;
          if (Math.abs(e.w) > 0.5) C -= s.p.Cr * Math.sign(e.w); else if (Math.abs(C) < s.p.Cr) C = 0; else C -= s.p.Cr * Math.sign(C);
          e.w += C / J * h;
        }
        e.a += e.w * dt / s.p.vitVis;
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, cx = W * 0.3, cy = H / 2, Rr = Math.min(110, H * 0.3);
        // Aimants
        ctx.fillStyle = "#e57373"; ctx.fillRect(cx - Rr - 60, cy - 70, 40, 140); D().texte(ctx, "N", cx - Rr - 40, cy, "#fff", 22, "center", true);
        ctx.fillStyle = "#64b5f6"; ctx.fillRect(cx + Rr + 20, cy - 70, 40, 140); D().texte(ctx, "S", cx + Rr + 40, cy, "#fff", 22, "center", true);
        // Lignes de champ
        ctx.strokeStyle = c.bordure; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
        for (let y = -50; y <= 50; y += 25) { ctx.beginPath(); ctx.moveTo(cx - Rr - 20, cy + y); ctx.lineTo(cx + Rr + 20, cy + y); ctx.stroke(); }
        ctx.setLineDash([]);
        D().texte(ctx, "champ magnétique B →", cx, cy - 86, c.doux, 11, "center");
        // Spire
        const a = e.a, xs = Rr * Math.cos(a), ys = Rr * 0.35 * Math.sin(a);
        ctx.strokeStyle = "#b87333"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - xs, cy - 60 - ys); ctx.lineTo(cx + xs, cy - 60 + ys); ctx.lineTo(cx + xs, cy + 60 + ys); ctx.lineTo(cx - xs, cy + 60 - ys); ctx.closePath(); ctx.stroke();
        // Forces de Laplace sur les deux côtés actifs
        const F = Math.max(-1, Math.min(1, e.i / 10)) * 50;
        if (Math.abs(F) > 3) {
          const sg = Math.cos(a) >= 0 ? 1 : -1;
          D().fleche(ctx, cx + xs, cy, cx + xs, cy - F * sg, c.ok, 3);
          D().fleche(ctx, cx - xs, cy, cx - xs, cy + F * sg, c.ok, 3);
          D().texte(ctx, "F = B·I·L", cx + xs + 8, cy - F * sg / 2, c.ok, 12, "left", true);
        }
        // Collecteur et balais
        const yc = cy + 110;
        ctx.fillStyle = "#c58b4c"; ctx.beginPath(); ctx.arc(cx, yc, 18, a, a + Math.PI - 0.3); ctx.lineTo(cx, yc); ctx.fill();
        ctx.fillStyle = "#8d5a2b"; ctx.beginPath(); ctx.arc(cx, yc, 18, a + Math.PI, a + 2 * Math.PI - 0.3); ctx.lineTo(cx, yc); ctx.fill();
        ctx.fillStyle = "#444"; ctx.fillRect(cx - 34, yc - 6, 14, 12); ctx.fillRect(cx + 20, yc - 6, 14, 12);
        D().texte(ctx, "collecteur et balais : inversent le courant chaque demi-tour", cx, yc + 32, c.doux, 11, "center");
        // Caractéristique couple – vitesse
        const gx = W * 0.6, gw = W - gx - 20;
        if (gw > 150) {
          const w0 = s.p.U / k, Cd = k * s.p.U / R;
          const g = D().graphe(ctx, gx, 40, gw, H - 90, { c, xlim: [0, Math.max(0.1, Math.abs(Cd)) * 1.1], ylim: [0, Math.max(10, Math.abs(RPM(w0))) * 1.1],
            series: [{ pts: [[0, Math.abs(RPM(w0))], [Math.abs(Cd), 0]], coul: c.info, ep: 3 }], points: [{ x: Math.abs(k * e.i), y: Math.abs(RPM(e.w)), coul: c.accentFort }],
            titre: "Vitesse (tr/min) en fonction du couple (N·m)", xlab: "couple" });
          void g;
        }
      },
      mesures(s) {
        const e = s.etat, E = k * e.w, Pe = s.p.U * e.i;
        return [["Courant I", LS.nombre(e.i, 2) + " A", Math.abs(e.i) > 8 ? "alerte" : ""], ["Vitesse", LS.nombre(RPM(e.w), 0) + " tr/min"], ["F.c.é.m. E = k·Ω", LS.nombre(E, 2) + " V"],
          ["Couple moteur k·I", LS.nombre(k * e.i, 3) + " N·m"], ["Puissance électrique U·I", LS.nombre(Pe, 1) + " W"], ["Puissance mécanique utile Cr·Ω", LS.nombre(s.p.Cr * Math.abs(e.w), 1) + " W"],
          ["Pertes Joule R·I²", LS.nombre(R * e.i * e.i, 1) + " W"], ["Rendement", Pe > 0.1 ? LS.nombre(100 * s.p.Cr * Math.abs(e.w) / Pe, 0) + " %" : "—"]];
      },
      explication(s) {
        return "Un fil parcouru par un courant dans un champ magnétique subit la **force de Laplace** F = B·I·L. Sur la spire, les deux côtés subissent des forces opposées : c'est un **couple**. En tournant, la spire coupe le champ et produit une **force contre-électromotrice** E = k·Ω qui s'oppose à U : I = (U − E) / R. Plus la charge est forte, plus le moteur ralentit, plus E baisse et plus le courant augmente. Moteur bloqué : I = U / R, énorme.";
      }
    }, cfg);
  };

  /* ---------- Alternateur ---------- */
  LS.sims.alternateur = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "n", nom: "Vitesse de rotation", min: 0, max: 3600, pas: 30, defaut: 600, unite: "tr/min" },
        { k: "p", nom: "Paires de pôles", min: 1, max: 4, pas: 1, defaut: 1 },
        { k: "spires", nom: "Spires de la bobine", min: 50, max: 1000, pas: 10, defaut: 300 },
        { k: "R", nom: "Charge branchée", min: 5, max: 1000, pas: 5, defaut: 100, unite: "Ω" },
        { k: "vitVis", nom: "Ralenti de l'animation", min: 1, max: 100, pas: 1, defaut: 20, unite: "×" }
      ],
      init(s) { s.etat.a = 0; s.etat.h = []; },
      avancer(s, dt) {
        const w = s.p.n * 2 * Math.PI / 60;
        s.etat.a += w * dt / s.p.vitVis;
        const phi = 0.002; // flux max par spire (Wb)
        const e = s.p.spires * phi * s.p.p * w * Math.sin(s.p.p * s.etat.a);
        s.etat.e = e; s.etat.emax = s.p.spires * phi * s.p.p * w;
        s.etat.h.push([s.t, e]); while (s.etat.h.length && s.etat.h[0][0] < s.t - 3) s.etat.h.shift();
      },
      dessiner(s, ctx, W, H, c) {
        const cx = W * 0.25, cy = H / 2, R = Math.min(90, H * 0.25), a = s.etat.a;
        ctx.strokeStyle = c.bordure; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(cx, cy, R + 30, 0, 7); ctx.stroke();
        ctx.fillStyle = "#b87333"; ctx.fillRect(cx - 22, cy - R - 50, 44, 24); ctx.fillRect(cx - 22, cy + R + 26, 44, 24);
        D().texte(ctx, "bobines (stator)", cx, cy - R - 60, c.doux, 11, "center");
        for (let k = 0; k < 2 * s.p.p; k++) {
          const b = a + k * Math.PI / s.p.p;
          ctx.fillStyle = k % 2 ? "#64b5f6" : "#e57373";
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, b - Math.PI / (2 * s.p.p), b + Math.PI / (2 * s.p.p)); ctx.closePath(); ctx.fill();
          D().texte(ctx, k % 2 ? "S" : "N", cx + R * 0.6 * Math.cos(b), cy + R * 0.6 * Math.sin(b), "#fff", 16, "center", true);
        }
        D().texte(ctx, "rotor : aimants (ou électroaimant)", cx, cy + R + 66, c.doux, 11, "center");
        const em = Math.max(1, s.etat.emax || 1);
        D().graphe(ctx, W * 0.5, 40, W * 0.47, H - 100, { c, xlim: [s.t - 3, s.t], ylim: [-em * 1.2, em * 1.2], series: [{ pts: s.etat.h.map(p => [p[0], p[1]]), coul: c.accentFort }],
          titre: "Tension produite (au ralenti de l'animation)", ylab: LS.nombre(em * 1.2, 0) + " V" });
      },
      mesures(s) {
        const f = s.p.p * s.p.n / 60, Ueff = (s.etat.emax || 0) / Math.SQRT2, I = Ueff / (s.p.R + 2);
        return [["Fréquence f = p·n / 60", LS.nombre(f, 1) + " Hz"], ["Tension crête", LS.nombre(s.etat.emax || 0, 1) + " V"], ["Tension efficace", LS.nombre(Ueff, 1) + " V"],
          ["Courant dans la charge", LS.nombre(I, 2) + " A"], ["Puissance utile (dans la charge, R·I²)", LS.nombre(s.p.R * I * I, 1) + " W"],
          ["Puissance convertie (E·I, pertes du bobinage comprises)", LS.nombre(Ueff * I, 1) + " W"], ["Couple de freinage", LS.nombre(s.p.n > 0 ? Ueff * I / (s.p.n * 2 * Math.PI / 60) : 0, 3) + " N·m"]];
      },
      explication() {
        return "Quand un aimant tourne devant une bobine, le flux magnétique qui la traverse varie : il apparaît une tension (**loi de Faraday**, e = −N·dΦ/dt). Elle est **sinusoïdale**, de fréquence **f = p × n / 60**. Plus on tourne vite, plus la tension et la fréquence augmentent. Quand on branche une charge, le courant crée un **couple de freinage** (loi de **Lenz**) : il faut fournir de l'énergie mécanique pour produire de l'électricité.";
      }
    }, cfg);
  };

  /* ---------- Transformateur ---------- */
  /* Transformateur de 50 VA environ, prévu pour 0,2 V par spire (230 V sur 1 150 spires).
     Le flux dans le fer est proportionnel aux volts par spire (U1 / N1). Au-delà d'environ 1,2 fois la
     valeur prévue, le fer sature : le courant magnétisant croît très vite, limité seulement par la
     résistance du fil du primaire. Pertes fer ∝ (U1 / N1)². */
  LS.calcTransformateur = function (p) {
    const R1 = 2.5 * p.N1 / 1150;                                   // résistance du primaire (Ω)
    if (p.continu) { const I1 = p.U1 / R1; return { U2: 0, I2: 0, I1, P: 0, b: 0, grille: I1 > 2 }; }
    const m = p.N2 / p.N1, b = (p.U1 / p.N1) / 0.2;                  // b = flux / flux prévu
    const U2v = p.U1 * m, Rs = 0.4 * m * m * 50 + 0.2;               // résistance des enroulements ramenée
    const I2 = U2v / (p.R + Rs), U2 = I2 * p.R;
    const sat = b > 1.1 ? Math.exp(6 * (b - 1.1)) : 1;
    const Imag = Math.min(p.U1 / R1, 0.03 * b * sat * 1150 / p.N1);
    const I1 = Math.hypot(I2 * m, Imag);
    const Pfer = 4 * b * b, Pcu = I2 * I2 * Rs + I1 * I1 * R1;
    const P = U2 * I2;
    return { U2, I2, I1, P, m, b, Imag, Pfer, sature: b > 1.2, grille: I1 * I1 * R1 > 60, rend: P > 0 ? P / (P + Pcu + Pfer) : 0 };
  };
  LS.sims.transformateur = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 360,
      controles: [
        { k: "U1", nom: "Tension primaire (efficace)", min: 0, max: 400, pas: 5, defaut: 230, unite: "V" },
        { k: "N1", nom: "Spires au primaire N1", min: 100, max: 2000, pas: 10, defaut: 1150 },
        { k: "N2", nom: "Spires au secondaire N2", min: 10, max: 2000, pas: 5, defaut: 120 },
        { k: "R", nom: "Charge au secondaire", min: 1, max: 1000, pas: 1, defaut: 12, unite: "Ω" },
        { k: "continu", nom: "Alimenter en courant continu", bool: true, defaut: false }
      ],
      init(s) { s.etat.t = 0; },
      calc(s) { return LS.calcTransformateur(s.p); },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s), cx = W * 0.42, cy = H / 2;
        ctx.strokeStyle = "#78909c"; ctx.lineWidth = 26; ctx.strokeRect(cx - 110, cy - 90, 220, 180);
        // Flux alternatif (flèches qui tournent dans le noyau)
        if (!s.p.continu && s.p.U1 > 0) {
          const ph = Math.sin(s.t * 2 * Math.PI * 0.8);
          ctx.strokeStyle = "rgba(255,213,79,.9)"; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -s.t * 60 * Math.sign(ph);
          ctx.strokeRect(cx - 110, cy - 90, 220, 180); ctx.setLineDash([]);
          D().texte(ctx, "flux magnétique alternatif Φ", cx, cy - 116, "#c79a00", 12, "center", true);
        }
        const bob = (x, n, coul) => { const tours = Math.min(16, Math.max(2, Math.round(n / 70))); ctx.strokeStyle = coul; ctx.lineWidth = 3; for (let i = 0; i < tours; i++) { const y = cy - 70 + i * 140 / tours; ctx.beginPath(); ctx.ellipse(x, y, 22, 5, 0, 0, 2 * Math.PI); ctx.stroke(); } };
        bob(cx - 110, s.p.N1, "#c62828"); bob(cx + 110, s.p.N2, "#1565c0");
        D().texte(ctx, "primaire : " + s.p.N1 + " spires", cx - 110, cy + 112, "#c62828", 12, "center", true);
        D().texte(ctx, "secondaire : " + s.p.N2 + " spires", cx + 110, cy + 112, "#1565c0", 12, "center", true);
        D().texte(ctx, "U1 = " + s.p.U1 + " V", cx - 190, cy, c.texte, 14, "center", true);
        D().texte(ctx, "U2 = " + LS.nombre(k.U2, 1) + " V", cx + 200, cy, c.texte, 14, "center", true);
        if (s.p.continu && k.grille) D().texte(ctx, "⚠ En continu : pas de variation de flux, donc rien au secondaire ; au primaire, seule la résistance du fil limite le courant : il brûle !", W / 2, H - 14, c.alerte, 12, "center", true);
        else if (k.sature) D().texte(ctx, "⚠ Trop de volts par spire : le fer sature, le courant à vide explose" + (k.grille ? " et le primaire brûle !" : "."), W / 2, H - 14, c.alerte, 12, "center", true);
      },
      mesures(s) {
        const k = this.calc(s);
        return [["Rapport m = N2/N1", LS.nombre(s.p.N2 / s.p.N1, 3)], ["U2", LS.nombre(k.U2, 1) + " V"], ["I2", LS.nombre(k.I2, 2) + " A"], ["I1", LS.nombre(k.I1, 2) + " A", k.grille || k.sature ? "alerte" : ""],
          ["Volts par spire (prévu : 0,20)", s.p.continu ? "—" : LS.nombre(s.p.U1 / s.p.N1, 2) + " V", k.sature ? "alerte" : ""],
          ["Puissance transmise", LS.nombre(k.P, 0) + " W"], ["Rendement", k.rend ? LS.nombre(100 * k.rend, 0) + " %" : "—"]];
      },
      explication() { return "Le **primaire** crée dans le noyau de fer un **flux alternatif**, qui traverse le **secondaire** et y induit une tension. Rapport : **U2 / U1 ≈ N2 / N1 = m**. La puissance se conserve presque : si la tension baisse, le courant augmente (I1 ≈ m·I2). Les deux enroulements ne sont pas reliés électriquement : le transformateur **isole**. Il ne fonctionne qu'en **alternatif**.\n\nLe nombre de spires du primaire n'est pas libre : le **flux** dans le fer est proportionnel à U1 / N1. Trop peu de spires pour la tension, et le fer **sature** : le courant à vide devient énorme et le transformateur chauffe. Ici, le noyau est prévu pour 0,2 V par spire."; }
    }, cfg);
  };

  /* ---------- Moteur asynchrone triphasé ---------- */
  /* Couple (N·m) d'un moteur à cage de 4 kW environ selon le glissement g, à la fréquence f (loi U/f
     constante). Rotor à double cage simplifié : somme de deux courbes de Kloss, l'une pour la marche
     (couple maxi vers g = 0,15 à 50 Hz), l'autre pour le démarrage (couple maxi vers g = 1).
     Résultat : couple de démarrage ≈ 0,7 × couple maximal, comme une cage d'écureuil courante.
     À U/f constant, le couple ne dépend que de la vitesse de glissement : les deux glissements
     caractéristiques varient comme 50 / f. */
  LS.coupleAsynchrone = function (g, f) {
    if (g === 0) return 0;
    const k = 50 / f, g1 = 0.15 * k, g2 = 1 * k;
    return 2 * 27 / (g / g1 + g1 / g) + 2 * 13 / (g / g2 + g2 / g);
  };
  /* Point de fonctionnement en régime établi : glissement dans [0, 1], ou moteur calé. */
  LS.regimeAsynchrone = function (f, p, Cr, demarre) {
    const ns = 60 * f / p, C = g => LS.coupleAsynchrone(g, f);
    let gmax = 0.001, Cmax = 0;
    for (let g = 0.001; g <= 1; g += 0.001) { const c = C(g); if (c > Cmax) { Cmax = c; gmax = g; } }
    const Cd = C(1);
    // Moteur arrêté : il ne démarre que si le couple de démarrage dépasse la charge ;
    // en marche : il décroche si la charge dépasse le couple maximal.
    if (Cr >= Cmax || (!demarre && Cr >= Cd)) return { ns, g: 1, n: 0, Cmax, Cd, gmax, cale: true };
    let lo = 0, hi = gmax;
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (C(m) < Cr) lo = m; else hi = m; }
    const g = (lo + hi) / 2;
    return { ns, g, n: ns * (1 - g), Cmax, Cd, gmax, cale: false };
  };
  LS.sims.asynchrone = function (el, cfg) {
    const J = 0.03; // inertie du rotor et de la charge (kg·m²)
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "f", nom: "Fréquence d'alimentation (variateur)", min: 5, max: 60, pas: 1, defaut: 50, unite: "Hz" },
        { k: "p", nom: "Paires de pôles", min: 1, max: 4, pas: 1, defaut: 2 },
        { k: "Cr", nom: "Couple de la charge", min: 0, max: 40, pas: 1, defaut: 10, unite: "N·m" },
        { k: "vitVis", nom: "Ralenti de l'animation", min: 5, max: 200, pas: 5, defaut: 50, unite: "×" }
      ],
      boutons: [{ k: "arret", texte: "⏹ Arrêter puis redémarrer", action: s => { s.etat.w = 0; } }],
      init(s) { s.etat.af = 0; s.etat.ar = 0; s.etat.w = 0; },
      calc(s) {
        const r = LS.regimeAsynchrone(s.p.f, s.p.p, s.p.Cr, true);
        const ws = 2 * Math.PI * r.ns / 60, n = Math.max(0, (s.etat.w || 0) * 60 / (2 * Math.PI));
        const g = Math.min(1, Math.max(0, 1 - n / r.ns));
        return Object.assign(r, { n, g, C: gg => LS.coupleAsynchrone(gg, s.p.f), cale: n < 0.5 && LS.coupleAsynchrone(1, s.p.f) <= s.p.Cr, ws });
      },
      avancer(s, dt) {
        // Démarrage et changements de charge : J·dω/dt = C(g) − Cr. La charge est passive : elle freine
        // mais n'entraîne pas le moteur en arrière.
        const e = s.etat, ns = 60 * s.p.f / s.p.p, ws = 2 * Math.PI * ns / 60, n = 20, h = dt / n;
        for (let q = 0; q < n; q++) {
          const g = 1 - e.w / ws, Cm = LS.coupleAsynchrone(Math.min(1, g), s.p.f);
          let acc = (Cm - s.p.Cr) / J;
          if (e.w <= 0 && acc < 0) { e.w = 0; acc = 0; }
          e.w = Math.max(0, e.w + acc * h);
        }
        e.af += 2 * Math.PI * s.p.f / s.p.p * dt / s.p.vitVis; e.ar += e.w * dt / s.p.vitVis; e.tph = (e.tph || 0) + dt / s.p.vitVis;
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s), cx = W * 0.25, cy = H * 0.45, R = Math.min(100, H * 0.28);
        const coul = ["#e53935", "#43a047", "#1e88e5"];
        for (let ph = 0; ph < 3; ph++) for (let pp = 0; pp < s.p.p; pp++) {
          const a = (ph * 2 * Math.PI / 3) / s.p.p + pp * 2 * Math.PI / s.p.p - Math.PI / 2;
          ctx.fillStyle = coul[ph]; ctx.save(); ctx.translate(cx + (R + 24) * Math.cos(a), cy + (R + 24) * Math.sin(a)); ctx.rotate(a); ctx.fillRect(-10, -14, 20, 28); ctx.restore();
        }
        ctx.fillStyle = c.sombre ? "#555" : "#ccc"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
        // Cage d'écureuil
        ctx.strokeStyle = "#b0bec5"; ctx.lineWidth = 3;
        for (let b = 0; b < 12; b++) { const a = s.etat.ar + b * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + R * 0.35 * Math.cos(a), cy + R * 0.35 * Math.sin(a)); ctx.lineTo(cx + R * 0.92 * Math.cos(a), cy + R * 0.92 * Math.sin(a)); ctx.stroke(); }
        // Champ tournant
        const af = s.etat.af;
        D().fleche(ctx, cx, cy, cx + R * 0.95 * Math.cos(af - Math.PI / 2), cy + R * 0.95 * Math.sin(af - Math.PI / 2), "#ffb300", 5);
        D().texte(ctx, "jaune : champ tournant (vitesse de synchronisme)", cx, cy + R + 52, "#c79a00", 11, "center", true);
        D().texte(ctx, "barres grises : rotor à cage, un peu plus lent", cx, cy + R + 68, c.doux, 11, "center");
        // Courants triphasés
        const gx = W * 0.52, gw = W - gx - 20, gh = (H - 80) / 2;
        const t0 = s.etat.tph || 0, series = [0, 1, 2].map(ph => ({ pts: [...Array(101)].map((_, i) => { const t = t0 - 0.04 + i * 0.0004; return [t, Math.sin(2 * Math.PI * s.p.f * t - ph * 2 * Math.PI / 3)]; }), coul: coul[ph] }));
        D().graphe(ctx, gx, 30, gw, gh - 10, { c, xlim: [t0 - 0.04, t0], ylim: [-1.2, 1.2], series, titre: "Les 3 courants décalés de 120°" });
        const pts = []; for (let g = 0.001; g <= 1; g += 0.005) pts.push([k.ns * (1 - g), k.C(g)]);
        D().graphe(ctx, gx, gh + 50, gw, gh - 20, { c, xlim: [0, k.ns * 1.05], ylim: [0, Math.max(k.Cmax, s.p.Cr) * 1.1], series: [{ pts, coul: c.info, ep: 3 }, { pts: [[0, s.p.Cr], [k.ns, s.p.Cr]], coul: c.alerte, ep: 1.5 }],
          points: [{ x: k.n, y: s.p.Cr, coul: c.accentFort }], titre: "Couple moteur (bleu) et charge (rouge) selon la vitesse", xlab: "tr/min" });
      },
      mesures(s) {
        const k = this.calc(s);
        return [["Vitesse de synchronisme ns = 60f/p", LS.nombre(k.ns, 0) + " tr/min"], ["Vitesse du rotor", LS.nombre(k.n, 0) + " tr/min", k.cale ? "alerte" : ""], ["Glissement g", LS.nombre(100 * k.g, 1) + " %"],
          ["Couple de démarrage / maximal", LS.nombre(k.Cd, 0) + " / " + LS.nombre(k.Cmax, 0) + " N·m"], ["Puissance utile", LS.nombre(s.p.Cr * k.n * 2 * Math.PI / 60, 0) + " W"]];
      },
      explication(s) {
        return "Trois bobines alimentées par des courants **décalés de 120°** créent un **champ magnétique tournant** à la vitesse de synchronisme **ns = 60·f / p**. Il induit des courants dans les barres du rotor (cage d'écureuil), qui est entraîné… sans jamais l'atteindre : s'il tournait aussi vite, plus rien ne serait induit. L'écart relatif est le **glissement** g = (ns − n) / ns, quelques %. Un **variateur** change f pour régler la vitesse.\n\nAu démarrage, le moteur ne fournit que le **couple de démarrage** (environ 70 % du couple maximal ici) : une charge plus lourde l'empêche de démarrer, alors qu'il la supporte une fois lancé. Le courant de démarrage vaut 5 à 8 fois le courant nominal (non simulé)." + (this.calc(s).cale ? (s.p.Cr >= this.calc(s).Cmax ? "\n\n⚠ La charge dépasse le couple maximal : le moteur **décroche** et cale." : "\n\n⚠ Moteur à l'arrêt : la charge dépasse le **couple de démarrage**, il ne peut pas démarrer. Allège la charge.") : "");
      }
    }, cfg);
  };

  /* ---------- Moteur pas à pas et servomoteur ---------- */
  LS.sims.pasAPas = function (el, cfg) {
    const SEQ = { complet: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], demi: [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [1, 0, 0, 1]] };
    return LS.simAnimee(el, {
      hauteur: 380,
      controles: [
        { k: "mode", nom: "Moteur", choix: [["pas", "Moteur pas à pas (4 bobines)"], ["servo", "Servomoteur (commande PWM)"]], defaut: "pas" },
        { k: "seq", nom: "Séquence (pas à pas)", choix: [["complet", "Pas entiers"], ["demi", "Demi-pas"]], defaut: "complet" },
        { k: "freq", nom: "Pas par seconde", min: 0, max: 20, pas: 1, defaut: 2 },
        { k: "impulsion", nom: "Largeur d'impulsion (servo)", min: 0.5, max: 2.5, pas: 0.05, defaut: 1.5, unite: "ms", dec: 2 }
      ],
      boutons: [{ k: "un", texte: "Un pas ▶", action: s => { s.etat.pas++; } }, { k: "zero", texte: "Remettre à 0", action: s => { s.etat.pas = 0; } }],
      init(s) { s.etat.pas = 0; s.etat.acc = 0; s.etat.angServo = 90; s.etat.compte = 0; },
      avancer(s, dt) {
        if (s.p.mode === "pas" && s.p.freq > 0) { s.etat.acc += dt * s.p.freq; while (s.etat.acc >= 1) { s.etat.acc--; s.etat.pas++; } }
        const cible = Math.max(0, Math.min(180, (s.p.impulsion - 0.5) / 2 * 180));
        s.etat.angServo += (cible - s.etat.angServo) * Math.min(1, dt * 6);
      },
      dessiner(s, ctx, W, H, c) {
        const cx = W * 0.3, cy = H / 2, R = Math.min(90, H * 0.28);
        if (s.p.mode === "pas") {
          const seq = SEQ[s.p.seq], st = seq[((s.etat.pas % seq.length) + seq.length) % seq.length];
          const pasDeg = s.p.seq === "demi" ? 45 : 90;
          ["A", "B", "A'", "B'"].forEach((n, i) => {
            const a = i * Math.PI / 2 - Math.PI / 2;
            ctx.fillStyle = st[i] ? "#e53935" : (c.sombre ? "#666" : "#bbb");
            ctx.save(); ctx.translate(cx + (R + 26) * Math.cos(a), cy + (R + 26) * Math.sin(a)); ctx.rotate(a); ctx.fillRect(-12, -18, 24, 36); ctx.restore();
            D().texte(ctx, n, cx + (R + 56) * Math.cos(a), cy + (R + 56) * Math.sin(a), c.texte, 13, "center", true);
          });
          const ang = (s.etat.pas * pasDeg) * Math.PI / 180 - Math.PI / 2;
          ctx.fillStyle = "#e57373"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.8, ang - Math.PI / 2, ang + Math.PI / 2); ctx.fill();
          ctx.fillStyle = "#64b5f6"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.8, ang + Math.PI / 2, ang + 3 * Math.PI / 2); ctx.fill();
          D().texte(ctx, "N", cx + R * 0.5 * Math.cos(ang), cy + R * 0.5 * Math.sin(ang), "#fff", 16, "center", true);
          // Chronogramme des bobines
          const gx = W * 0.58, gw = W - gx - 20;
          ["A", "B", "A'", "B'"].forEach((n, i) => {
            const y = 60 + i * 50;
            D().texte(ctx, n, gx - 6, y, c.texte, 12, "right", true);
            ctx.strokeStyle = "#e53935"; ctx.lineWidth = 2; ctx.beginPath();
            for (let k = 0; k < 12; k++) { const e = seq[((s.etat.pas - 11 + k) % seq.length + seq.length) % seq.length][i]; const x = gx + k * gw / 12; ctx.lineTo(x, y - e * 20); ctx.lineTo(x + gw / 12, y - e * 20); }
            ctx.stroke();
          });
          D().texte(ctx, "dernier pas à droite", gx + gw, 260, c.doux, 11, "right");
        } else {
          ctx.fillStyle = "#37474f"; ctx.fillRect(cx - 60, cy - 30, 120, 60);
          const a = (180 - s.etat.angServo) * Math.PI / 180;
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 80 * Math.cos(a), cy - 80 * Math.sin(a)); ctx.stroke(); ctx.lineCap = "butt";
          ctx.strokeStyle = c.bordure; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 90, Math.PI, 2 * Math.PI); ctx.stroke();
          D().texte(ctx, "0°", cx + 98, cy, c.doux, 11); D().texte(ctx, "180°", cx - 98, cy, c.doux, 11, "right"); D().texte(ctx, "90°", cx, cy - 100, c.doux, 11, "center");
          // Signal PWM (période 20 ms)
          const gx = W * 0.58, gw = W - gx - 20, y = H / 2;
          ctx.strokeStyle = c.accentFort; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, y);
          for (let p = 0; p < 2; p++) { const x0 = gx + p * gw / 2, l = s.p.impulsion / 20 * gw / 2; ctx.lineTo(x0, y); ctx.lineTo(x0, y - 50); ctx.lineTo(x0 + l, y - 50); ctx.lineTo(x0 + l, y); ctx.lineTo(x0 + gw / 2, y); }
          ctx.stroke();
          D().texte(ctx, "signal de commande : une impulsion toutes les 20 ms (50 Hz)", gx, y + 24, c.doux, 11);
        }
      },
      mesures(s) {
        if (s.p.mode === "servo") return [["Impulsion", LS.nombre(s.p.impulsion, 2) + " ms"], ["Angle demandé", LS.nombre(Math.max(0, Math.min(180, (s.p.impulsion - 0.5) / 2 * 180)), 0) + "°"], ["Angle actuel", LS.nombre(s.etat.angServo, 0) + "°"]];
        const pasDeg = s.p.seq === "demi" ? 45 : 90;
        return [["Pas effectués", String(s.etat.pas)], ["Angle du rotor", LS.nombre(((s.etat.pas * pasDeg) % 360 + 360) % 360, 0) + "°"], ["Angle par pas (ce modèle simplifié)", pasDeg + "°"], ["Un vrai moteur (200 pas/tour)", "1,8° par pas"]];
      },
      explication(s) {
        return s.p.mode === "pas" ? "Un moteur **pas à pas** avance d'un angle précis à chaque impulsion : on alimente ses bobines **dans l'ordre**, et l'aimant du rotor s'aligne sur la bobine active. Sans capteur, on connaît la position en comptant les pas (imprimantes 3D, CNC). En **demi-pas**, on alimente parfois deux bobines à la fois : deux fois plus de positions." :
          "Un **servomoteur** contient un moteur, un réducteur et un **capteur de position** (potentiomètre) avec une boucle d'asservissement. On lui envoie une impulsion toutes les 20 ms : sa **durée** (≈ 0,5 à 2,5 ms) fixe l'angle à atteindre (direction de voiture RC, gouvernes d'avion, bras robot).";
      }
    }, cfg);
  };
})();
