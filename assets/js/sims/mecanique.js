/* Simulations du moteur thermique : 4 temps (essence / diesel), 2 temps, multicylindre,
   courbes de couple et de puissance. Le modèle physique est dans modele-moteur.js. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;

  const COUL_PHASE = ["#4aa3ff", "#8e6cf0", "#ff8a1f", "#9a9a9a"];

  function couleurGaz(th, cyc) {
    const ph = LS.phaseMoteur(th).n, x = cyc.xb[Math.round(th) % 721] || 0;
    if (ph === 1) return cyc.diesel ? "rgba(200,230,255,.55)" : "rgba(130,200,255,.6)";
    if (ph === 2) {
      if (x > 0.02) return `rgba(255,${Math.round(150 - 90 * x)},40,${0.5 + 0.4 * x})`;
      const k = (th - 180) / 180;
      return `rgba(${Math.round(130 - 50 * k)},${Math.round(200 - 80 * k)},255,${0.6 + 0.2 * k})`;
    }
    if (ph === 3) {
      if (!cyc.allume) return "rgba(90,130,240,.7)";
      const k = (th - 360) / 180;
      return `rgba(${Math.round(255 - 120 * k)},${Math.round(90 + 40 * k)},${Math.round(30 + 100 * k)},${0.9 - 0.3 * k})`;
    }
    return "rgba(130,130,130,.6)";
  }

  /* Dessine un cylindre complet (coupe) : utilisé par le 4 temps et le multicylindre. */
  function dessinerCylindre(ctx, c, p, cyc, th, x0, y0, w, h, opts) {
    opts = opts || {};
    const course = p.course, l = p.bielle, B = p.alesage, r = course / 2;
    const s = Math.min((h - 30) / (course * 1.55 + l + 26), (w * 0.8) / (B * 1.5));
    const cx = x0 + w / 2, cy = y0 + h - 12 - r * s * 1.3;
    const phi = (th % 360) * Math.PI / 180;
    const xpin = r * Math.cos(phi) + Math.sqrt(l * l - r * r * Math.sin(phi) ** 2);
    const yPin = cy - xpin * s, hPiston = 0.55 * B * s, yTop = yPin - 0.3 * B * s;
    const yTopPMH = cy - (r + l) * s - 0.3 * B * s;
    const hChambre = Math.max(8, course / (p.eps - 1) * s);
    const yCulasse = yTopPMH - hChambre;
    const xg = cx - B / 2 * s, xd = cx + B / 2 * s;
    // Gaz
    ctx.fillStyle = couleurGaz(th, cyc);
    ctx.fillRect(xg, yCulasse, xd - xg, yTop - yCulasse);
    // Flamme : front de combustion qui part de la bougie
    const x = cyc.xb[Math.round(th) % 721] || 0;
    if (cyc.allume && x > 0.01 && x < 0.98 && th > 300 && th < 460) {
      const rad = (xd - xg) * 0.6 * Math.sqrt(x);
      const gr = ctx.createRadialGradient(cx, yCulasse + 4, 2, cx, yCulasse + 4, rad + 4);
      gr.addColorStop(0, "rgba(255,255,180,.95)"); gr.addColorStop(0.6, "rgba(255,160,40,.8)"); gr.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = gr; ctx.save(); ctx.beginPath(); ctx.rect(xg, yCulasse, xd - xg, yTop - yCulasse); ctx.clip(); ctx.fillRect(xg, yCulasse, xd - xg, yTop - yCulasse); ctx.restore();
    }
    // Chemise du cylindre
    ctx.strokeStyle = c.texte; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xg, yCulasse); ctx.lineTo(xg, cy - (l - r) * s + 0.3 * B * s); ctx.moveTo(xd, yCulasse); ctx.lineTo(xd, cy - (l - r) * s + 0.3 * B * s); ctx.stroke();
    // Culasse
    ctx.fillStyle = c.sombre ? "#6b5550" : "#c9b8a8";
    ctx.fillRect(xg - 14, yCulasse - 34, xd - xg + 28, 34);
    // Soupapes
    const sp = LS.soupapes(th), lev = 0.11 * B * s;
    [["adm", cx - B * 0.24 * s, "#4aa3ff"], ["ech", cx + B * 0.24 * s, "#888"]].forEach(([k, xv, coul]) => {
      const d = sp[k] * lev, rv = 0.15 * B * s;
      ctx.fillStyle = c.fond; ctx.fillRect(xv - rv, yCulasse - 30, 2 * rv, 30); // conduit
      ctx.strokeStyle = coul; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(xv, yCulasse - 44); ctx.lineTo(xv, yCulasse + d); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xv - rv, yCulasse + d); ctx.lineTo(xv + rv, yCulasse + d); ctx.stroke();
      // Flux de gaz
      if (sp[k] > 0.2 && opts.fleches !== false) {
        const k2 = (Date.now() / 300) % 1;
        if (k === "adm") D().fleche(ctx, xv - 14, yCulasse - 50 + 30 * k2, xv - 2, yCulasse - 24 + 30 * k2, "#4aa3ff", 2);
        else D().fleche(ctx, xv + 2, yCulasse - 10 - 30 * k2, xv + 14, yCulasse - 36 - 30 * k2, "#888", 2);
      }
      // Arbre à cames (tourne deux fois moins vite que le vilebrequin)
      if (opts.cames !== false) {
        const yc = yCulasse - 58, ang = th / 2 * Math.PI / 180;
        ctx.fillStyle = c.sombre ? "#ccc" : "#555";
        ctx.beginPath(); ctx.arc(xv, yc, 7, 0, 2 * Math.PI); ctx.fill();
        const decal = k === "adm" ? (LS.DISTRIBUTION.AOA + LS.DISTRIBUTION.RFA + 720) / 2 : (LS.DISTRIBUTION.AOE + LS.DISTRIBUTION.RFE + 720) / 2;
        const a = ang - decal / 2 * Math.PI / 180 + Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(xv + 7 * Math.cos(a + 1.3), yc + 7 * Math.sin(a + 1.3)); ctx.lineTo(xv + 13 * Math.cos(a), yc + 13 * Math.sin(a)); ctx.lineTo(xv + 7 * Math.cos(a - 1.3), yc + 7 * Math.sin(a - 1.3)); ctx.fill();
      }
    });
    // Bougie ou injecteur
    ctx.fillStyle = c.sombre ? "#eee" : "#333";
    ctx.fillRect(cx - 3, yCulasse - 40, 6, 40);
    if (!cyc.diesel) {
      const etincelle = p.allumage !== false && Math.abs(th - (360 - p.avance)) < 6;
      if (etincelle) { ctx.fillStyle = "#fff59d"; ctx.beginPath(); ctx.arc(cx, yCulasse + 3, 7, 0, 2 * Math.PI); ctx.fill(); D().texte(ctx, "⚡", cx + 9, yCulasse + 8, "#ffb300", 16); }
    } else {
      const inj = th > 360 - p.avance && th < 360 - p.avance + 18 + 20 * (p.charge / 100);
      if (inj) {
        ctx.fillStyle = "rgba(255,240,150,.85)";
        ctx.beginPath(); ctx.moveTo(cx, yCulasse); ctx.lineTo(cx - 16, yCulasse + Math.min(26, yTop - yCulasse)); ctx.lineTo(cx + 16, yCulasse + Math.min(26, yTop - yCulasse)); ctx.closePath(); ctx.fill();
      }
    }
    // Piston, segments, axe
    ctx.fillStyle = c.sombre ? "#b0b8c0" : "#8d99a6";
    ctx.fillRect(xg + 2, yTop, xd - xg - 4, hPiston);
    ctx.strokeStyle = "#444"; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(xg + 2, yTop + 5 + 5 * k); ctx.lineTo(xd - 2, yTop + 5 + 5 * k); ctx.stroke(); }
    // Vilebrequin
    const xm = cx + r * s * Math.sin(phi), ym = cy - r * s * Math.cos(phi);
    // Contrepoids (à l'opposé du maneton) et bras de manivelle
    const aPin = phi - Math.PI / 2;
    ctx.fillStyle = c.sombre ? "#777" : "#6d6d6d";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * s * 1.25, aPin + Math.PI - 1.1, aPin + Math.PI + 1.1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.sombre ? "#999" : "#555"; ctx.lineWidth = Math.max(8, r * s * 0.45); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(xm, ym); ctx.stroke(); ctx.lineCap = "butt";
    ctx.strokeStyle = c.texte; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, 2 * Math.PI); ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    // Bielle
    ctx.strokeStyle = c.sombre ? "#d0d6dc" : "#3d4a57"; ctx.lineWidth = Math.max(5, 0.12 * B * s);
    ctx.beginPath(); ctx.moveTo(xm, ym); ctx.lineTo(cx, yPin); ctx.stroke();
    ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.arc(cx, yPin, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(xm, ym, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = c.texte; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();
    // Repères PMH / PMB
    if (opts.reperes !== false) {
      const yPMB = cy - (l - r) * s - 0.3 * B * s;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = c.doux; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xd + 4, yTopPMH); ctx.lineTo(xd + 40, yTopPMH); ctx.moveTo(xd + 4, yPMB); ctx.lineTo(xd + 40, yPMB); ctx.stroke(); ctx.setLineDash([]);
      D().texte(ctx, "PMH", xd + 42, yTopPMH, c.doux, 11); D().texte(ctx, "PMB", xd + 42, yPMB, c.doux, 11);
      ctx.strokeStyle = c.doux; ctx.beginPath(); ctx.moveTo(xd + 24, yTopPMH); ctx.lineTo(xd + 24, yPMB); ctx.stroke();
      D().texte(ctx, "course", xd + 28, (yTopPMH + yPMB) / 2, c.doux, 10);
    }
    return { cx, cy, yCulasse, xg, xd };
  }
  LS.dessinerCylindre = dessinerCylindre;

  function roueDesPhases(ctx, c, p, th, xc, yc, R) {
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(xc, yc);
      ctx.arc(xc, yc, R, -Math.PI / 2 + k * Math.PI / 2, -Math.PI / 2 + (k + 1) * Math.PI / 2);
      ctx.closePath(); ctx.fillStyle = COUL_PHASE[k] + "55"; ctx.fill();
    }
    const ang = d => -Math.PI / 2 + d / 720 * 2 * Math.PI;
    const D0 = LS.DISTRIBUTION;
    // Ouvertures des soupapes (anneaux intérieurs)
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#4aa3ff"; ctx.beginPath(); ctx.arc(xc, yc, R * 0.72, ang(D0.AOA - 720), ang(D0.RFA)); ctx.stroke();
    ctx.strokeStyle = "#888"; ctx.beginPath(); ctx.arc(xc, yc, R * 0.6, ang(D0.AOE), ang(720 + D0.RFE)); ctx.stroke();
    // Allumage / injection
    const ai = ang(360 - p.avance);
    ctx.fillStyle = "#ffb300"; ctx.beginPath(); ctx.arc(xc + R * 0.86 * Math.cos(ai), yc + R * 0.86 * Math.sin(ai), 5, 0, 2 * Math.PI); ctx.fill();
    const noms = ["1 Admission", "2 Compression", "3 Combustion-détente", "4 Échappement"];
    noms.forEach((n, k) => { const a = ang(90 + 180 * k); D().texte(ctx, n, xc + (R + 6) * Math.cos(a), yc + (R + 10) * Math.sin(a), c.texte, 11, Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center", true); });
    const a = ang(th % 720);
    D().fleche(ctx, xc, yc, xc + R * 0.95 * Math.cos(a), yc + R * 0.95 * Math.sin(a), c.texte, 3);
    D().texte(ctx, Math.round(th % 720) + "°", xc, yc + R + 26, c.doux, 11, "center");
  }

  function diagrammePV(ctx, c, cyc, th, x, y, w, h) {
    const Vmax = (cyc.g.Vd + cyc.g.Vc) * 1e6 * 1.05;
    const pmax = Math.max(10, cyc.pmax * 1.1);
    const series = [];
    for (let k = 0; k < 4; k++) {
      const pts = [];
      for (let d = k * 180; d <= (k + 1) * 180; d += 2) pts.push([cyc.V[d] * 1e6, cyc.p[d]]);
      series.push({ pts, coul: COUL_PHASE[k] });
    }
    const i = Math.round(th) % 721;
    D().graphe(ctx, x, y, w, h, { c, xlim: [0, Vmax], ylim: [0, pmax], series, points: [{ x: cyc.V[i] * 1e6, y: cyc.p[i], coul: c.texte }],
      titre: "Diagramme pression – volume", xlab: "volume (cm³)", ylab: Math.round(pmax) + " bar" });
    D().texte(ctx, "aire = travail du cycle : " + Math.round(cyc.W) + " J", x + w - 4, y + 22, c.doux, 11, "right");
  }

  /* ---------- Moteur 4 temps ---------- */
  LS.sims.moteur4t = function (el, cfg) {
    const etroit = window.innerWidth < 640;
    return LS.simAnimee(el, {
      hauteur: etroit ? 900 : 470,
      controles: [
        { k: "mode", nom: "Carburant", choix: [["essence", "Essence (allumage commandé)"], ["diesel", "Diesel (allumage par compression)"]], defaut: "essence" },
        { k: "vitAnim", nom: "Vitesse de l'animation", min: 10, max: 720, pas: 10, defaut: 90, unite: "°/s", aide: "Ralenti de l'animation : un vrai moteur tourne bien trop vite pour l'œil." },
        { k: "regime", nom: "Régime (pour les calculs)", min: 800, max: 7000, pas: 100, defaut: 3000, unite: "tr/min" },
        { k: "charge", nom: "Charge (pédale d'accélérateur)", min: 10, max: 100, pas: 5, defaut: 100, unite: "%" },
        { k: "eps", nom: "Taux de compression ε", min: 6, max: 22, pas: 0.5, defaut: 10, dec: 1, avance: true },
        { k: "avance", nom: "Avance à l'allumage / injection", min: -5, max: 45, pas: 1, defaut: 22, unite: "°", avance: true },
        { k: "alesage", nom: "Alésage", min: 50, max: 100, pas: 0.5, defaut: 75, unite: "mm", dec: 1, avance: true },
        { k: "course", nom: "Course", min: 40, max: 100, pas: 0.5, defaut: 84.8, unite: "mm", dec: 1, avance: true },
        { k: "allumage", nom: "Allumage (bougie) / injection en marche", bool: true, defaut: true },
        { k: "turbo", nom: "Turbocompresseur (diesel)", bool: true, defaut: false }
      ],
      boutons: [
        { k: "pas", texte: "+10°", titre: "Avancer de 10° (pense à mettre en pause)", action: s => { s.etat.th = (s.etat.th + 10) % 720; } },
        { k: "phase", texte: "Temps suivant →", action: s => { s.etat.th = (Math.floor(s.etat.th / 180) + 1) * 180 % 720; } }
      ],
      init(s) { s.etat.th = 0; s.p.bielle = 140; this.changement(s); },
      changement(s, k) {
        if (k === "mode") {
          if (s.p.mode === "diesel") { s.p.eps = 18; s.p.avance = 8; s.p.regime = Math.min(s.p.regime, 4000); }
          else { s.p.eps = 10; s.p.avance = 22; s.p.turbo = false; }
          s.majControles && s.majControles();
        }
        s.etat.cyc = LS.cycleMoteur(Object.assign({}, s.p, { injection: s.p.allumage }));
      },
      avancer(s, dt) { s.etat.th = (s.etat.th + s.p.vitAnim * dt) % 720; },
      dessiner(s, ctx, W, H, c) {
        const cyc = s.etat.cyc, th = s.etat.th;
        const ph = LS.phaseMoteur(th);
        if (W < 640) {
          // Écran étroit : moteur en haut, roue des phases et diagramme en dessous.
          dessinerCylindre(ctx, c, s.p, cyc, th, 0, 40, W, 400);
          const R = Math.min(70, W / 5);
          roueDesPhases(ctx, c, s.p, th, W / 2, 450 + R, R);
          diagrammePV(ctx, c, cyc, th, 20, 660, W - 40, H - 690);
        } else {
          const we = W > 720 ? W * 0.4 : W * 0.5;
          dessinerCylindre(ctx, c, s.p, cyc, th, 0, 40, we, H - 40);
          const xr = we + 10, wr = W - xr - 10;
          const R = Math.min(70, wr / 4.2, H / 6);
          roueDesPhases(ctx, c, s.p, th, xr + wr / 2, 30 + R + 10, R);
          diagrammePV(ctx, c, cyc, th, xr + 10, 2 * R + 90, wr - 20, H - 2 * R - 120);
        }
        D().texte(ctx, "Temps " + ph.n + " : " + ph.nom, 12, 16, COUL_PHASE[ph.n - 1], 16, "left", true);
        if (!cyc.allume) D().texte(ctx, cyc.diesel ? "Pas d'auto-inflammation : air pas assez chaud (ε trop faible)" : "Allumage coupé : le moteur est entraîné sans produire de travail", xr + wr / 2, H - 10, c.alerte, 12, "center", true);
        else if (cyc.cliquetis) D().texte(ctx, "⚠ Cliquetis : le mélange s'enflamme tout seul avant l'étincelle", xr + wr / 2, H - 10, c.alerte, 12, "center", true);
      },
      mesures(s) {
        const cyc = s.etat.cyc, th = Math.round(s.etat.th) % 721;
        return [["Angle du cycle", th + "°"], ["Volume", LS.nombre(cyc.V[th] * 1e6, 0) + " cm³"], ["Pression", LS.nombre(cyc.p[th], 1) + " bar"],
          ["Cylindrée unitaire", LS.nombre(cyc.g.Vd * 1e6, 0) + " cm³"], ["Pression max", LS.nombre(cyc.pmax, 0) + " bar"],
          ["Température fin de compression", LS.nombre(cyc.T2 - 273, 0) + " °C"],
          ["Couple (1 cylindre)", LS.nombre(cyc.couple, 1) + " N·m", cyc.couple < 0 ? "alerte" : ""],
          ["Puissance (1 cylindre)", LS.nombre(cyc.puissance / 1000, 1) + " kW · " + LS.nombre(cyc.puissance / 736, 1) + " ch"],
          ["Vitesse moyenne du piston", LS.nombre(2 * s.p.course / 1000 * s.p.regime / 60, 1) + " m/s"]];
      },
      explication(s) {
        const n = LS.phaseMoteur(s.etat.th).n, d = s.p.mode === "diesel";
        const t = {
          1: d ? "**Admission** : la soupape d'admission est ouverte, le piston descend du PMH au PMB et aspire **de l'air seul** (pas de papillon : le diesel règle sa puissance par la quantité de gazole injectée)." :
            "**Admission** : la soupape d'admission (bleue) est ouverte, le piston descend du PMH au PMB et aspire le **mélange air + essence**. Le papillon (charge) limite la quantité de mélange.",
          2: "**Compression** : les deux soupapes sont fermées, le piston remonte et comprime les gaz, qui s'échauffent. " + (d ? "En diesel, l'air dépasse 600 °C : le gazole injecté juste avant le PMH s'enflamme tout seul." : "Juste avant le PMH (avance à l'allumage), la bougie produit l'étincelle."),
          3: "**Combustion – détente** : la combustion fait monter brutalement la pression, qui pousse le piston vers le bas. C'est le **seul temps moteur** : la bielle transforme la poussée en rotation du vilebrequin.",
          4: "**Échappement** : la soupape d'échappement s'ouvre un peu avant le PMB ; le piston remonte et chasse les gaz brûlés. Le volant moteur fournit l'énergie pour les 3 temps non moteurs."
        };
        return t[n] + "\n\nLe vilebrequin fait **2 tours** par cycle, l'arbre à cames **1 tour**. À " + s.p.regime + " tr/min, ce cylindre fait " + LS.nombre(s.p.regime / 120, 0) + " cycles par seconde.";
      }
    }, cfg);
  };

  /* ---------- Moteur multicylindre ---------- */
  LS.sims.multicylindre = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 470,
      controles: [
        { k: "n", nom: "Nombre de cylindres", choix: [[1, "1 cylindre (monocylindre)"], [2, "2 cylindres (bicylindre)"], [3, "3 cylindres"], [4, "4 cylindres en ligne"]], nombres: true, defaut: 4 },
        { k: "vitAnim", nom: "Vitesse de l'animation", min: 10, max: 720, pas: 10, defaut: 120, unite: "°/s" },
        { k: "volant", nom: "Inertie du volant moteur", min: 0.02, max: 0.6, pas: 0.01, defaut: 0.1, unite: "kg·m²", dec: 2 },
        { k: "regime", nom: "Régime moyen", min: 800, max: 6000, pas: 100, defaut: 1000, unite: "tr/min" }
      ],
      init(s) { s.etat.th = 0; this.changement(s); },
      changement(s) {
        s.etat.cyc = LS.cycleMoteur({ alesage: 75, course: 84.8, bielle: 140, eps: 10, mode: "essence", charge: 40, avance: 22, regime: s.p.regime }); // charge partielle, proche du ralenti
        // Décalages de cycle et ordre d'allumage.
        const n = s.p.n;
        const ordres = { 1: [0], 2: [0, 360], 3: [0, 240, 480], 4: [0, 540, 180, 360] }; // 4 cyl : ordre 1-3-4-2
        s.etat.decal = ordres[n];
        // Couple total sur un cycle, et irrégularité de vitesse avec ce volant.
        const tot = [], moyen = [];
        let somme = 0;
        for (let d = 0; d < 720; d++) { let t = 0; s.etat.decal.forEach(o => { t += LS.coupleInstantane(s.etat.cyc, (d + 720 - o) % 720); }); tot.push(t); somme += t; }
        const cm = somme / 720;
        // Énergie cinétique : ΔE = ∫(C − Cmoy) dθ ; irrégularité δ = ΔE / (J ω²)
        let e = 0, emin = 0, emax = 0;
        tot.forEach(t => { e += (t - cm) * Math.PI / 180; emin = Math.min(emin, e); emax = Math.max(emax, e); });
        const w = s.p.regime * 2 * Math.PI / 60;
        s.etat.tot = tot; s.etat.cm = cm; s.etat.irreg = (emax - emin) / (s.p.volant * w * w);
      },
      avancer(s, dt) { s.etat.th = (s.etat.th + s.p.vitAnim * dt) % 720; },
      dessiner(s, ctx, W, H, c) {
        const n = s.p.n, th = s.etat.th, cyc = s.etat.cyc;
        const hc = H * 0.5, wc = Math.min(140, (W - 20) / 4);
        const x0 = (W - wc * n) / 2;
        const ordreNom = { 1: "", 2: "allumages tous les 360°", 3: "ordre 1-2-3, tous les 240°", 4: "ordre d'allumage 1-3-4-2, tous les 180°" }[n];
        D().texte(ctx, n + " cylindre" + (n > 1 ? "s" : "") + " · " + ordreNom, 10, 14, c.texte, 14, "left", true);
        s.etat.decal.forEach((o, i) => {
          const t = (th + 720 - o) % 720;
          dessinerCylindre(ctx, c, { alesage: 75, course: 84.8, bielle: 140, eps: 10, avance: 22 }, cyc, t, x0 + i * wc, 20, wc, hc, { reperes: false, cames: false, fleches: false });
          const ph = LS.phaseMoteur(t);
          D().texte(ctx, "Cyl. " + (i + 1), x0 + i * wc + wc / 2, hc + 26, c.texte, 12, "center", true);
          D().texte(ctx, ph.nom, x0 + i * wc + wc / 2, hc + 40, COUL_PHASE[ph.n - 1], 11, "center", true);
        });
        // Couple instantané
        const tot = s.etat.tot, max = Math.max(...tot.map(Math.abs)) * 1.1;
        const series = s.etat.decal.map((o, i) => ({ pts: [...Array(181)].map((_, k) => [k * 4, LS.coupleInstantane(cyc, (k * 4 + 720 - o) % 720)]), coul: "rgba(150,150,150,.6)", ep: 1 }));
        series.push({ pts: tot.map((t, d) => [d, t]), coul: c.accentFort, ep: 2.5 });
        series.push({ pts: [[0, s.etat.cm], [720, s.etat.cm]], coul: c.ok, ep: 1.5 });
        const g = D().graphe(ctx, 30, hc + 64, W - 50, H - hc - 84, { c, xlim: [0, 720], ylim: [-max, max], series, titre: "Couple sur le vilebrequin (orange : total ; vert : moyenne ; gris : chaque cylindre)", xlab: "angle du cycle (°)", ylab: Math.round(max) + " N·m" });
        ctx.strokeStyle = c.texte; ctx.beginPath(); ctx.moveTo(g.X(th), hc + 64); ctx.lineTo(g.X(th), H - 20); ctx.stroke();
      },
      mesures(s) {
        const tot = s.etat.tot;
        return [["Couple moyen", LS.nombre(s.etat.cm, 0) + " N·m"], ["Couple min / max", LS.nombre(Math.min(...tot), 0) + " / " + LS.nombre(Math.max(...tot), 0) + " N·m"],
          ["Irrégularité de vitesse", LS.nombre(100 * s.etat.irreg, 2) + " %", s.etat.irreg > 0.05 ? "alerte" : ""],
          ["Cylindrée totale", LS.nombre(s.etat.cyc.g.Vd * 1e6 * s.p.n, 0) + " cm³"]];
      },
      explication(s) {
        return "Un cylindre ne fournit du couple que pendant **un temps sur quatre** ; le reste du temps il en consomme (compression). Avec plusieurs cylindres décalés, les temps moteurs se succèdent : le couple total est plus **régulier**. Le **volant moteur** stocke l'énergie et lisse la vitesse : l'irrégularité δ = ΔE / (J·ω²) baisse quand l'inertie J ou le régime augmentent.";
      }
    }, cfg);
  };

  /* ---------- Courbes de couple et de puissance ---------- */
  const MOTEURS = {
    citadine: { nom: "Citadine essence 1,2 L, 3 cylindres", n: 3, alesage: 71, course: 100.6, bielle: 150, eps: 11, mode: "essence", avance: 22, Nopt: 3800, Nmax: 6300 },
    diesel: { nom: "Diesel turbo 1,5 L, 4 cylindres", n: 4, alesage: 76, course: 80.5, bielle: 140, eps: 16, mode: "diesel", avance: 8, Nopt: 2000, Nmax: 4600, turbo: true },
    moto: { nom: "Moto sportive 600 cm³, 4 cylindres", n: 4, alesage: 67, course: 42.5, bielle: 95, eps: 12.5, mode: "essence", avance: 26, Nopt: 11000, Nmax: 14500, largeur: 6000, etaMax: 1.12 },
    scooter: { nom: "Scooter 125 cm³, monocylindre", n: 1, alesage: 52.4, course: 57.8, bielle: 100, eps: 11, mode: "essence", avance: 20, Nopt: 7000, Nmax: 9500 }
  };
  LS.MOTEURS = MOTEURS;
  LS.courbeMoteur = function (m, N) {
    // Même modèle de cylindre pour tous ; ce qui change d'un moteur à l'autre : géométrie, taux de
    // compression, avance, remplissage (accord de l'admission) et frottements selon la vitesse du piston.
    const cyc = LS.cycleMoteur(Object.assign({}, m, { charge: 100, regime: N }));
    const C = Math.max(0, cyc.pme * 1e5 * cyc.g.Vd * m.n / (4 * Math.PI));
    return { C, P: C * N * 2 * Math.PI / 60, pme: cyc.pme };
  };
  LS.sims.courbesMoteur = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "moteur", nom: "Moteur", choix: Object.keys(MOTEURS).map(k => [k, MOTEURS[k].nom]), defaut: "citadine" },
        { k: "N", nom: "Régime", min: 1000, max: 14500, pas: 100, defaut: 3000, unite: "tr/min" }
      ],
      init(s) { this.changement(s); },
      changement(s, k) {
        const m = MOTEURS[s.p.moteur];
        if (k === "moteur") { s.p.N = Math.min(s.p.N, m.Nmax); s.majControles(); }
        s.p.N = Math.min(s.p.N, m.Nmax);
        const pts = [];
        for (let N = 1000; N <= m.Nmax; N += 100) { const r = LS.courbeMoteur(m, N); pts.push([N, r.C, r.P]); }
        s.etat.pts = pts;
        s.etat.Cmax = pts.reduce((a, b) => b[1] > a[1] ? b : a);
        s.etat.Pmax = pts.reduce((a, b) => b[2] > a[2] ? b : a);
        s.etat.ici = LS.courbeMoteur(m, s.p.N);
      },
      dessiner(s, ctx, W, H, c) {
        const m = MOTEURS[s.p.moteur], pts = s.etat.pts;
        const Cm = s.etat.Cmax[1] * 1.25, Pm = s.etat.Pmax[2] / 1000 * 1.25;
        const x = 50, y = 30, w = W - 110, h = H - 70;
        const g = D().graphe(ctx, x, y, w, h, { c, xlim: [0, m.Nmax], ylim: [0, Cm], series: [{ pts: pts.map(p => [p[0], p[1]]), coul: c.info, ep: 3 }], titre: m.nom, xlab: "régime (tr/min)" });
        const Yp = v => y + h - v / Pm * h;
        ctx.strokeStyle = c.accentFort; ctx.lineWidth = 3; ctx.beginPath();
        pts.forEach((p, i) => { const px = g.X(p[0]), py = Yp(p[2] / 1000); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.stroke();
        D().texte(ctx, "Couple (N·m)", x + 6, y + 12, c.info, 12, "left", true);
        D().texte(ctx, "Puissance (kW)", x + w - 6, y + 12, c.accentFort, 12, "right", true);
        for (let k = 0; k <= 4; k++) { D().texte(ctx, Math.round(Cm * k / 4), x - 6, y + h - k * h / 4, c.info, 10, "right"); D().texte(ctx, Math.round(Pm * k / 4), x + w + 6, y + h - k * h / 4, c.accentFort, 10, "left"); }
        for (let N = 0; N <= m.Nmax; N += m.Nmax > 9000 ? 2000 : 1000) D().texte(ctx, N, g.X(N), y + h + 12, c.doux, 10, "center");
        ctx.strokeStyle = c.texte; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(g.X(s.p.N), y); ctx.lineTo(g.X(s.p.N), y + h); ctx.stroke(); ctx.setLineDash([]);
        const ici = s.etat.ici;
        ctx.fillStyle = c.info; ctx.beginPath(); ctx.arc(g.X(s.p.N), g.Y(ici.C), 6, 0, 7); ctx.fill();
        ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.arc(g.X(s.p.N), Yp(ici.P / 1000), 6, 0, 7); ctx.fill();
      },
      mesures(s) {
        const i = s.etat.ici;
        return [["Couple à ce régime", LS.nombre(i.C, 0) + " N·m"], ["Puissance à ce régime", LS.nombre(i.P / 1000, 1) + " kW · " + LS.nombre(i.P / 736, 0) + " ch"],
          ["Couple maxi", LS.nombre(s.etat.Cmax[1], 0) + " N·m à " + s.etat.Cmax[0] + " tr/min"], ["Puissance maxi", LS.nombre(s.etat.Pmax[2] / 1000, 1) + " kW à " + s.etat.Pmax[0] + " tr/min"]];
      },
      explication() { return "La **puissance** est le produit du couple par la vitesse de rotation : **P = C × ω** (ω en rad/s = 2π × N / 60). Le couple est maximal là où le moteur se remplit le mieux ; la puissance continue de monter au-delà, tant que le couple ne baisse pas plus vite que le régime n'augmente."; }
    }, cfg);
  };

  /* ---------- Moteur 2 temps ---------- */
  LS.sims.moteur2t = function (el, cfg) {
    const geo = { alesage: 54, course: 54, bielle: 100 };
    return LS.simAnimee(el, {
      hauteur: 470,
      controles: [
        { k: "vitAnim", nom: "Vitesse de l'animation", min: 10, max: 540, pas: 10, defaut: 60, unite: "°/s" },
        { k: "echap", nom: "Hauteur de la lumière d'échappement", min: 20, max: 45, pas: 1, defaut: 32, unite: "% de la course", aide: "Plus elle est haute, plus l'échappement s'ouvre tôt : plus de puissance à haut régime, moins en bas." }
      ],
      boutons: [{ k: "pas", texte: "+10°", action: s => { s.etat.th = (s.etat.th + 10) % 360; } }],
      init(s) { s.etat.th = 0; },
      avancer(s, dt) { s.etat.th = (s.etat.th + s.p.vitAnim * dt) % 360; },
      dessiner(s, ctx, W, H, c) {
        const th = s.etat.th, r = geo.course / 2, l = geo.bielle, B = geo.alesage;
        const sc = Math.min((H - 60) / (geo.course * 2.6 + l), W / (B * 4));
        const cx = W * (W > 700 ? 0.3 : 0.45), cy = H - 40 - r * sc * 1.6;
        const phi = th * Math.PI / 180;
        const xpin = r * Math.cos(phi) + Math.sqrt(l * l - r * r * Math.sin(phi) ** 2);
        const depl = r + l - xpin; // depuis le PMH (mm)
        const yPMH = cy - (r + l) * sc - 0.3 * B * sc;
        const yTop = yPMH + depl * sc;
        const yHaut = yPMH - 8 * sc;
        const xg = cx - B / 2 * sc, xd = cx + B / 2 * sc;
        const hE = geo.course * (1 - s.p.echap / 100), hT = geo.course * (1 - (s.p.echap - 10) / 100);
        const yEch = yPMH + hE * sc, yTr = yPMH + hT * sc;
        const ouvEch = depl > hE, ouvTr = depl > hT;
        // Pression dans le carter : comprimé quand le piston descend.
        const descend = th < 180;
        const yCarterBas = cy + r * sc * 1.5;
        // Zones de gaz
        const brule = th < 120 || th > 330;
        ctx.fillStyle = th < 40 || th > 345 ? "rgba(255,140,30,.85)" : brule ? "rgba(140,140,140,.6)" : ouvTr ? "rgba(150,210,140,.6)" : "rgba(110,190,120,.7)";
        ctx.fillRect(xg, yHaut, xd - xg, yTop - yHaut);
        ctx.fillStyle = descend ? "rgba(110,190,120,.55)" : "rgba(150,220,150,.4)";
        ctx.beginPath(); ctx.moveTo(xg - 30, yTop + 0.55 * B * sc); ctx.lineTo(xg - 30, yCarterBas); ctx.lineTo(xd + 30, yCarterBas); ctx.lineTo(xd + 30, yTop + 0.55 * B * sc); ctx.closePath(); ctx.fill();
        // Cylindre et lumières
        ctx.strokeStyle = c.texte; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(xg, yHaut); ctx.lineTo(xg, yTr - 4); ctx.moveTo(xg, yTr + 14); ctx.lineTo(xg, yCarterBas - 30);
        ctx.moveTo(xd, yHaut); ctx.lineTo(xd, yEch - 4); ctx.moveTo(xd, yEch + 18); ctx.lineTo(xd, yCarterBas - 30); ctx.stroke();
        ctx.strokeRect(xg - 30, yCarterBas - 30, xd - xg + 60, 30);
        // Canal de transfert (à gauche), lumière d'échappement (à droite), admission dans le carter
        ctx.strokeStyle = "#5aa86a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xg, yTr + 5); ctx.lineTo(xg - 22, yTr + 5); ctx.lineTo(xg - 22, yCarterBas - 34); ctx.stroke();
        D().texte(ctx, "transfert", xg - 26, yTr - 8, "#3d8a4d", 11, "right", true);
        D().texte(ctx, "échappement", xd + 6, yEch - 12, c.doux, 11, "left", true);
        D().texte(ctx, "carter (pré-compression)", cx, yCarterBas + 12, c.doux, 11, "center");
        ctx.fillStyle = c.doux; ctx.fillRect(xg - 40, yCarterBas - 22, 10, 14);
        D().texte(ctx, "admission", xg - 44, yCarterBas - 14, "#3d8a4d", 11, "right", true);
        if (!descend) D().fleche(ctx, xg - 70, yCarterBas - 15, xg - 34, yCarterBas - 15, "#3d8a4d", 3);
        if (ouvTr) D().fleche(ctx, xg - 14, yTr + 30, xg + 18, yTr - 4, "#3d8a4d", 3);
        if (ouvEch) D().fleche(ctx, xd - 4, yEch + 6, xd + 34, yEch + 6, "#777", 3);
        if (ouvTr && ouvEch) D().texte(ctx, "balayage : une partie du mélange frais part à l'échappement", cx, yHaut - 30, c.alerte, 11, "center");
        // Bougie
        ctx.fillStyle = c.texte; ctx.fillRect(cx - 3, yHaut - 24, 6, 24);
        if (th > 345 || th < 5) { ctx.fillStyle = "#fff59d"; ctx.beginPath(); ctx.arc(cx, yHaut + 4, 7, 0, 7); ctx.fill(); }
        // Piston, bielle, vilebrequin
        ctx.fillStyle = c.sombre ? "#b0b8c0" : "#8d99a6"; ctx.fillRect(xg + 2, yTop, xd - xg - 4, 0.55 * B * sc);
        const yPin = yTop + 0.3 * B * sc, xm = cx + r * sc * Math.sin(phi), ym = cy - r * sc * Math.cos(phi);
        ctx.strokeStyle = c.sombre ? "#d0d6dc" : "#3d4a57"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(xm, ym); ctx.lineTo(cx, yPin); ctx.stroke();
        ctx.strokeStyle = c.texte; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.arc(xm, ym, 5, 0, 7); ctx.fill();
        // Cercle des phases (360°)
        const xc = W > 700 ? W * 0.72 : W * 0.82, yc = 130, R = Math.min(90, W * 0.14);
        const secteur = (a, b, coul) => { ctx.beginPath(); ctx.moveTo(xc, yc); ctx.arc(xc, yc, R, -Math.PI / 2 + a * Math.PI / 180, -Math.PI / 2 + b * Math.PI / 180); ctx.closePath(); ctx.fillStyle = coul; ctx.fill(); };
        const aE = Math.acos(1 - 2 * hE / geo.course) * 180 / Math.PI, aT = Math.acos(1 - 2 * hT / geo.course) * 180 / Math.PI;
        secteur(0, aE, "rgba(255,140,30,.45)"); secteur(aE, 360 - aE, "rgba(140,140,140,.45)"); secteur(aT, 360 - aT, "rgba(110,190,120,.6)"); secteur(360 - aE, 360, "rgba(110,150,240,.45)");
        D().fleche(ctx, xc, yc, xc + R * Math.sin(phi), yc - R * Math.cos(phi), c.texte, 3);
        D().texte(ctx, "PMH", xc, yc - R - 10, c.doux, 11, "center"); D().texte(ctx, "PMB", xc, yc + R + 10, c.doux, 11, "center");
        D().texte(ctx, "orange : détente · gris : échappement · vert : transfert · bleu : compression", xc, yc + R + 28, c.doux, 10, "center");
      },
      mesures(s) {
        const th = Math.round(s.etat.th);
        return [["Angle du vilebrequin", th + "°"], ["Au-dessus du piston", th < 120 || th > 330 ? (th < 40 || th > 345 ? "combustion" : "détente / échappement") : "transfert puis compression"], ["Sous le piston (carter)", th < 180 ? "pré-compression du mélange" : "aspiration du mélange"]];
      },
      explication(s) {
        return "Un **2 temps** fait un cycle complet en **un seul tour** de vilebrequin, sans soupapes : c'est le piston qui ouvre et ferme les **lumières** percées dans le cylindre. Au-dessus du piston : compression puis détente ; en dessous, le **carter** aspire puis comprime le mélange, qui passe par les **transferts**. Avantages : léger, simple, puissant pour sa taille. Inconvénients : balayage imparfait (consommation, pollution), lubrification par huile mélangée à l'essence.";
      }
    }, cfg);
  };
})();
