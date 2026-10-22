/* Simulations de capteurs : thermistance CTN sur l'ADC de l'ESP32, télémètre à ultrasons HC-SR04,
   centrale inertielle (gyroscope + accéléromètre, filtre complémentaire), étalonnage et filtrage
   d'une balance (jauge de contrainte + HX711). Les fonctions LS.* sans dessin sont testées sous Node. */
(function () {
  "use strict";
  const LS = window.LS;
  LS.sims = LS.sims || {};
  const D = () => LS.dessin;
  const G = 9.81, DEG = Math.PI / 180;
  const n = (v, d) => LS.nombre ? LS.nombre(v, d) : Number(v).toFixed(d);

  /* Tirage gaussien (Box-Muller) ; rnd est une fonction uniforme sur [0, 1[. */
  const gauss = function (rnd) {
    rnd = rnd || Math.random;
    const u = Math.max(1e-12, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  /* Générateur pseudo-aléatoire reproductible (mulberry32), pour les tests. */
  const aleaGraine = function (graine) {
    let a = graine >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- Thermistance CTN 10 kΩ, B = 3950 ----------
     La « vraie » thermistance suit Steinhart-Hart (coefficients ajustés sur une CTN 10 kΩ
     B25/50 = 3950 : B0/25 ≈ 3900, B25/85 ≈ 3980) ; la formule Beta n'en est qu'une approximation. */
  const SH = { A: 1.0985427662390565e-3, B: 2.400963966386537e-4, C: 5.644848000799721e-8 };
  LS.NTC = { R25: 10000, B: 3950, SH, dissipation: 1.5e-3 };  // dissipation : 1,5 mW/°C (perle dans l'air calme)
  LS.ntcTemperatureSH = function (R) {
    const l = Math.log(R);
    return 1 / (SH.A + SH.B * l + SH.C * l * l * l) - 273.15;
  };
  LS.ntcResistance = function (T) {
    let l = Math.log(LS.NTC.R25);
    for (let i = 0; i < 40; i++) {
      const f = SH.A + SH.B * l + SH.C * l * l * l - 1 / (T + 273.15), d = SH.B + 3 * SH.C * l * l;
      l -= f / d;
    }
    return Math.exp(l);
  };
  LS.ntcTemperatureBeta = function (R, B, R25) {
    return 1 / (1 / 298.15 + Math.log(R / (R25 || LS.NTC.R25)) / (B || LS.NTC.B)) - 273.15;
  };

  /* ADC de l'ESP32 (atténuation 11 dB) : on reprend le modèle d'esp32.js s'il est chargé. */
  const VMAX = 3.1, V0 = 0.075;
  LS.adcESP32 = function (V, bruit) {
    if (LS.lectureADC) return LS.lectureADC(V, "11", bruit);
    if (V < V0) return Math.round(Math.max(0, bruit || 0));
    let x = (V - V0) / (VMAX - V0);
    if (x > 0.85) x = 0.85 + (x - 0.85) * 0.6;
    return Math.max(0, Math.min(4095, Math.round(x * 4095 / 0.94 + (bruit || 0))));
  };
  /* Conversion inverse : naïve (droite 0–3,3 V), ou corrigée comme analogReadMilliVolts(). */
  LS.adcVersTension = function (brut, mode) {
    if (mode === "naive") return brut * 3.3 / 4095;
    let x = brut * 0.94 / 4095;
    if (x > 0.85) x = 0.85 + (x - 0.85) / 0.6;
    return V0 + x * (VMAX - V0);
  };

  /* Chaîne de mesure complète. p : { T, rf, conversion, calcul, alim }, bruit en pas d'ADC. */
  LS.mesureThermistance = function (p, bruit) {
    const Vcc = 3.3;
    // Auto-échauffement : la CTN dissipe P = R·I² ; elle se met à T + P/δ (quelques itérations).
    let dT = 0, Rntc = LS.ntcResistance(p.T), P = 0;
    for (let i = 0; i < 6; i++) {
      Rntc = LS.ntcResistance(p.T + dT);
      const I = Vcc / (Rntc + p.rf);
      P = Rntc * I * I * (p.alim === "gpio" ? 0.002 : 1);   // alimentée 2 ms par seconde
      dT = P / LS.NTC.dissipation;
    }
    const V = Vcc * Rntc / (Rntc + p.rf);
    const brut = LS.adcESP32(V, bruit || 0);
    const res = { Rntc, V, brut, dT, P, horsPlage: brut <= 0 || brut >= 4095 };
    const Vlu = LS.adcVersTension(brut, p.conversion);
    res.Vlu = Vlu;
    if (res.horsPlage || Vlu >= Vcc) { res.Rcalc = NaN; res.Test = NaN; res.err = NaN; }
    else {
      res.Rcalc = p.rf * Vlu / (Vcc - Vlu);
      res.Test = p.calcul === "sh" ? LS.ntcTemperatureSH(res.Rcalc) : LS.ntcTemperatureBeta(res.Rcalc);
      res.err = res.Test - p.T;
    }
    // Sensibilité autour de T (V/°C) et résolution : °C par pas d'ADC (≈ 0,69 mV par pas).
    const dV = Vcc * LS.ntcResistance(p.T + 0.5) / (LS.ntcResistance(p.T + 0.5) + p.rf) - Vcc * LS.ntcResistance(p.T - 0.5) / (LS.ntcResistance(p.T - 0.5) + p.rf);
    res.sens = Math.abs(dV);
    res.resolution = ((VMAX - V0) * 0.94 / 4095) / Math.max(1e-9, res.sens);
    return res;
  };

  LS.sims.thermistance = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 440,
      controles: [
        { k: "T", nom: "Température réelle", min: -20, max: 120, pas: 1, defaut: 25, unite: "°C" },
        { k: "rf", nom: "Résistance fixe du diviseur", choix: [[1000, "1 kΩ"], [4700, "4,7 kΩ"], [10000, "10 kΩ"], [47000, "47 kΩ"], [100000, "100 kΩ"]], nombres: true, defaut: 10000 },
        { k: "conversion", nom: "Conversion de la lecture en volts", choix: [["corrigee", "corrigée (analogReadMilliVolts)"], ["naive", "naïve : lecture × 3,3 / 4095"]], defaut: "corrigee" },
        { k: "calcul", nom: "Calcul de la température", choix: [["beta", "formule Beta (B = 3950)"], ["sh", "Steinhart-Hart (3 coefficients)"]], defaut: "beta" },
        { k: "alim", nom: "Alimentation du diviseur", choix: [["permanente", "permanente (3,3 V)"], ["gpio", "par une GPIO, seulement pendant la mesure"]], defaut: "permanente" }
      ],
      init(s) { s.etat.bruit = 0; s.etat.tb = 0; },
      avancer(s, dt) {
        s.etat.tb += dt;
        if (s.etat.tb > 0.5) { s.etat.tb = 0; s.etat.bruit = gauss() * 0.5; }   // moyenne de 16 lectures : ≈ 0,5 pas de bruit
        s.etat.m = LS.mesureThermistance(s.p, s.etat.bruit);
      },
      dessiner(s, ctx, W, H, c) {
        const m = s.etat.m || LS.mesureThermistance(s.p, 0);
        const etroit = W < 640;
        // Schéma : 3,3 V → R fixe → nœud (GPIO 34) → CTN → GND
        const sx = etroit ? 30 : 40, sy = 30, sh = etroit ? 170 : H - 70;
        const xr = sx + 40, yTop = sy + 10, yBas = sy + sh, yNoeud = (yTop + yBas) / 2;
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xr, yTop); ctx.lineTo(xr, yBas); ctx.stroke();
        D().texte(ctx, "3,3 V", xr, yTop - 10, c.alerte, 12, "center", true);
        const boite = (y, h, txt, coul) => { ctx.fillStyle = c.carte; ctx.fillRect(xr - 12, y, 24, h); ctx.strokeStyle = coul; ctx.lineWidth = 2; ctx.strokeRect(xr - 12, y, 24, h); D().texte(ctx, txt, xr + 18, y + h / 2, c.texte, 12, "left", true); };
        const hb = (yNoeud - yTop) * 0.5;
        boite(yTop + hb * 0.5, hb, "R = " + LS.si(s.p.rf, "Ω"), c.texte);
        const chaud = Math.max(0, Math.min(1, (s.p.T + 20) / 140));
        boite(yNoeud + hb * 0.5, hb, "CTN " + LS.si(m.Rntc, "Ω"), `rgb(${Math.round(60 + 195 * chaud)},${Math.round(120 - 60 * chaud)},${Math.round(220 - 200 * chaud)})`);
        ctx.strokeStyle = c.texte; ctx.beginPath(); ctx.moveTo(xr + 6, yNoeud + hb * 0.5 + hb + 4); ctx.lineTo(xr - 18, yNoeud + hb * 0.5 - 4); ctx.stroke();   // trait de la CTN
        ctx.beginPath(); ctx.moveTo(xr - 18, yBas); ctx.lineTo(xr + 18, yBas); ctx.moveTo(xr - 11, yBas + 5); ctx.lineTo(xr + 11, yBas + 5); ctx.moveTo(xr - 5, yBas + 10); ctx.lineTo(xr + 5, yBas + 10); ctx.stroke();
        ctx.fillStyle = c.texte; ctx.beginPath(); ctx.arc(xr, yNoeud, 4, 0, 7); ctx.fill();
        ctx.strokeStyle = c.accentFort; ctx.beginPath(); ctx.moveTo(xr, yNoeud); ctx.lineTo(xr + 70, yNoeud); ctx.stroke();
        ctx.fillStyle = c.accentFort; ctx.fillRect(xr + 70, yNoeud - 14, 70, 28);
        D().texte(ctx, "GPIO 34", xr + 105, yNoeud, "#fff", 12, "center", true);
        D().texte(ctx, n(m.V, 3) + " V", xr + 105, yNoeud - 26, c.texte, 13, "center", true);
        D().texte(ctx, "lu : " + m.brut, xr + 105, yNoeud + 28, c.texte, 12, "center");
        // Thermomètre
        const tx = xr + 175, ty = sy + 10, th = sh - 30;
        if (!etroit || W > 360) {
          ctx.fillStyle = c.fond; ctx.strokeStyle = c.bordure; ctx.lineWidth = 1.5;
          ctx.fillRect(tx - 6, ty, 12, th); ctx.strokeRect(tx - 6, ty, 12, th);
          const hT = th * Math.max(0, Math.min(1, (s.p.T + 20) / 140));
          ctx.fillStyle = c.alerte; ctx.fillRect(tx - 4, ty + th - hT, 8, hT);
          ctx.beginPath(); ctx.arc(tx, ty + th + 8, 10, 0, 7); ctx.fill();
          D().texte(ctx, s.p.T + " °C", tx + 14, ty + th - hT, c.texte, 12, "left", true);
        }
        // Courbe V(T) pour la résistance choisie
        const gx = etroit ? 40 : Math.max(sx + 300, W * 0.45), gy = etroit ? sy + sh + 50 : 40, gw = W - gx - 16, gh = etroit ? H - gy - 30 : H - 90;
        const pts = []; for (let T = -20; T <= 120; T += 2) pts.push([T, 3.3 * LS.ntcResistance(T) / (LS.ntcResistance(T) + s.p.rf)]);
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [-20, 120], ylim: [0, 3.3], series: [{ pts: [[-20, VMAX], [120, VMAX]], coul: c.alerte, ep: 1 }, { pts: [[-20, V0], [120, V0]], coul: c.alerte, ep: 1 }, { pts, coul: c.info, ep: 2.5 }],
          points: [{ x: s.p.T, y: m.V, coul: c.accentFort }], titre: "Tension sur la GPIO (−20 à 120 °C)", xlab: "°C", ylab: "3,3 V" });
        D().texte(ctx, "plage lisible par l'ADC : entre les traits rouges", gx + 6, gy + gh - 14, c.doux, 11, "left");
      },
      mesures(s) {
        const m = s.etat.m || LS.mesureThermistance(s.p, 0);
        return [["Résistance de la CTN", LS.si(m.Rntc, "Ω")], ["Tension sur la GPIO", n(m.V, 3) + " V"], ["Lecture brute (0–4095)", String(m.brut), m.horsPlage ? "alerte" : ""],
          ["Tension calculée", n(m.Vlu, 3) + " V"], ["Température estimée", isFinite(m.Test) ? n(m.Test, 1) + " °C" : "hors plage", isFinite(m.Test) ? "" : "alerte"],
          ["Erreur", isFinite(m.err) ? n(m.err, 1) + " °C" : "—", !isFinite(m.err) || Math.abs(m.err) > 1 ? "alerte" : ""],
          ["Sensibilité", n(m.sens * 1000, 1) + " mV/°C"], ["Résolution", n(m.resolution, 3) + " °C par pas", m.resolution > 0.2 ? "alerte" : ""],
          ["Auto-échauffement", n(m.dT, 2) + " °C (" + n(m.P * 1000, 2) + " mW)", m.dT > 0.5 ? "alerte" : ""]];
      },
      explication(s) {
        const m = s.etat.m || LS.mesureThermistance(s.p, 0);
        let t = "Une **CTN** (thermistance à coefficient de température négatif) voit sa résistance **baisser** quand elle chauffe : 10 kΩ à 25 °C, environ 680 Ω à 100 °C. Le **diviseur de tension** transforme cette résistance en tension que l'ADC peut lire ; on remonte ensuite à la résistance (R = R_fixe·V/(3,3 − V)), puis à la température. La sensibilité est maximale quand la résistance fixe vaut celle de la CTN au milieu de la plage visée.";
        if (s.p.conversion === "naive") t += "\n\n⚠ La conversion **naïve** suppose un ADC parfait de 0 à 3,3 V. Celui de l'ESP32 ne l'est pas (zone morte sous 0,075 V, plafond vers 3,1 V, courbure en haut) : plusieurs degrés d'erreur.";
        if (m.horsPlage) t += "\n\n⚠ La tension sort de la plage de l'ADC : la mesure est impossible. Change la résistance fixe.";
        if (m.dT > 0.5) t += "\n\n⚠ Le courant chauffe la CTN elle-même (**auto-échauffement**) : elle mesure sa propre chaleur. Résistance fixe plus grande, ou alimentation par une GPIO seulement pendant la mesure.";
        if (s.p.calcul === "beta" && (s.p.T < 0 || s.p.T > 70)) t += "\n\nLa formule **Beta** n'est exacte qu'autour de 25–50 °C ; loin de là, **Steinhart-Hart** (3 coefficients de la fiche technique) est plus juste.";
        return t;
      }
    }, cfg);
  };

  /* ---------- Télémètre à ultrasons HC-SR04 ---------- */
  LS.vitesseSon = T => 331.3 + 0.606 * T;               // m/s, air sec
  LS.HCSR04 = { demiAngle: 15, portee: 400, aveugle: 2, timeout: 0.038, vitesseFormule: 2 / 58e-6 / 100 };  // t/58 → 344,8 m/s
  /* p : { distance (cm), decalage (cm), surface, angle (°), tempAir, correction, fond }. */
  LS.mesureUltrason = function (p, rnd) {
    rnd = rnd || Math.random;
    const c = LS.vitesseSon(p.tempAir), cCalc = p.correction ? c : LS.HCSR04.vitesseFormule;
    const dist = Math.hypot(p.distance, p.decalage || 0);
    const horsAxe = Math.atan2(Math.abs(p.decalage || 0), p.distance) / DEG;
    const force = { dur: 1, incline: 1, mou: 0.15, tige: 0.25 }[p.surface] || 1;
    let vu = horsAxe <= LS.HCSR04.demiAngle && dist <= LS.HCSR04.portee * Math.sqrt(force);
    let raison = vu ? "" : horsAxe > LS.HCSR04.demiAngle ? "hors du faisceau" : "écho trop faible";
    if (vu && p.surface === "incline" && p.angle > LS.HCSR04.demiAngle) { vu = false; raison = "l'écho est renvoyé de côté"; }
    let cible = vu ? dist : null;
    if (!vu && p.fond === "mur") { cible = 350; }
    const res = { c, cCalc, vu, raison, cible, horsAxe };
    if (cible === null) { res.t = LS.HCSR04.timeout; res.dMes = NaN; res.err = NaN; res.etat = "pas d'écho (" + raison + ")"; return res; }
    if (cible < LS.HCSR04.aveugle) { res.t = 2 * 0.025 / c * (1 + rnd()); res.dMes = res.t * cCalc / 2 * 100; res.err = res.dMes - p.distance; res.etat = "zone aveugle : mesure fausse"; res.aveugle = true; return res; }
    // Le récepteur déclenche sur une des premières périodes de 40 kHz (25 µs) : un écho faible en rate parfois une.
    const rate = rnd() < (1 - force) * 0.6 ? 25e-6 : 0;
    res.t = 2 * cible / 100 / c + rate + (rnd() - 0.5) * 4e-6;
    res.dMes = res.t * cCalc / 2 * 100;
    res.err = res.dMes - p.distance;
    res.etat = vu ? "écho reçu" : "écho du mur du fond";
    return res;
  };

  LS.sims.ultrason = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 440,
      controles: [
        { k: "distance", nom: "Distance de l'objet", min: 1, max: 500, pas: 1, defaut: 100, unite: "cm" },
        { k: "decalage", nom: "Décalage latéral de l'objet", min: -150, max: 150, pas: 5, defaut: 0, unite: "cm" },
        { k: "surface", nom: "Objet", choix: [["dur", "mur ou carton face au capteur"], ["incline", "planche inclinée"], ["mou", "tissu, mousse (absorbe)"], ["tige", "tige fine (pied de chaise)"]], defaut: "dur" },
        { k: "angle", nom: "Inclinaison de la planche", min: 0, max: 60, pas: 1, defaut: 20, unite: "°" },
        { k: "tempAir", nom: "Température de l'air", min: -10, max: 45, pas: 1, defaut: 20, unite: "°C" },
        { k: "correction", nom: "Tenir compte de la température dans le calcul", bool: true, defaut: true },
        { k: "fond", nom: "Derrière l'objet", choix: [["rien", "rien (grand espace)"], ["mur", "un mur à 3,5 m"]], defaut: "rien" }
      ],
      init(s) { s.etat.ph = 0; s.etat.m = LS.mesureUltrason(s.p); },
      avancer(s, dt) {
        const avant = s.etat.ph;
        s.etat.ph = (s.etat.ph + dt / 1.6) % 1;          // un cycle de mesure toutes les 1,6 s (ralenti)
        if (s.etat.ph < avant) s.etat.m = LS.mesureUltrason(s.p);
      },
      changement(s) { s.etat.m = LS.mesureUltrason(s.p); },
      dessiner(s, ctx, W, H, c) {
        const m = s.etat.m, p = s.p, ph = s.etat.ph;
        // Vue de dessus : capteur à gauche, faisceau ±15°, objet, mur éventuel
        const vx = 50, vy = 26, vw = W - vx - 20, vh = H * 0.6, oy = vy + vh / 2;
        const sc = vw / 520;                               // px par cm
        ctx.strokeStyle = c.bordure; ctx.strokeRect(vx - 40, vy - 10, vw + 50, vh + 20);
        D().texte(ctx, "Vue de dessus (échelle : 1 m = " + n(100 * sc, 0) + " px)", vx - 34, vy + 2, c.doux, 11, "left");
        ctx.save(); ctx.beginPath(); ctx.rect(vx - 40, vy - 10, vw + 50, vh + 20); ctx.clip();
        ctx.fillStyle = c.sombre ? "rgba(120,180,255,.10)" : "rgba(40,100,200,.08)";
        const L = 400 * sc, a = LS.HCSR04.demiAngle * DEG;
        ctx.beginPath(); ctx.moveTo(vx, oy); ctx.lineTo(vx + L * Math.cos(a), oy - L * Math.sin(a)); ctx.arc(vx, oy, L, -a, a); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#1565c0"; ctx.fillRect(vx - 30, oy - 22, 26, 44);
        ctx.fillStyle = "#cfd8dc"; ctx.beginPath(); ctx.arc(vx - 6, oy - 11, 8, 0, 7); ctx.arc(vx - 6, oy + 11, 8, 0, 7); ctx.fill();
        if (p.fond === "mur") { ctx.fillStyle = c.doux; ctx.fillRect(vx + 350 * sc, vy, 6, vh); }
        const ox = vx + p.distance * sc, oyy = oy + p.decalage * sc;
        ctx.save(); ctx.translate(ox, oyy);
        if (p.surface === "incline") ctx.rotate(p.angle * DEG);
        ctx.fillStyle = p.surface === "mou" ? "#ab47bc" : p.surface === "tige" ? "#6d4c41" : "#8d6e63";
        if (p.surface === "tige") { ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); } else ctx.fillRect(-4, -36, 8, 72);
        ctx.restore();
        // Fronts d'onde : aller pendant la première moitié, retour ensuite
        const cible = m.cible;
        const portee = cible === null ? 520 : cible;
        ctx.strokeStyle = c.info; ctx.lineWidth = 2;
        if (ph < 0.5) {
          const r = Math.min(portee, 520) * sc * ph * 2;
          ctx.beginPath(); ctx.arc(vx, oy, Math.max(1, r), -a, a); ctx.stroke();
        } else if (cible !== null) {
          const r = cible * sc * (1 - (ph - 0.5) * 2);
          ctx.strokeStyle = c.accentFort;
          const cx = m.vu ? ox : vx + 350 * sc, cy = m.vu ? oyy : oy;
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, cible * sc - r), Math.PI - 0.5, Math.PI + 0.5); ctx.stroke();
        } else if (p.surface === "incline" && m.raison.indexOf("côté") >= 0) {
          const t2 = (ph - 0.5) * 2, dir = Math.PI - 2 * p.angle * DEG;
          D().fleche(ctx, ox, oyy, ox + Math.cos(dir) * 120 * t2, oyy - Math.sin(dir) * 120 * t2, c.alerte, 2);
        }
        ctx.restore();
        // Chronogramme : TRIG, salve 40 kHz, ECHO
        const cx0 = 60, cw = W - cx0 - 20, cy0 = vy + vh + 30, lh = 34, tMax = 0.03;
        const X = t => cx0 + Math.min(1, t / tMax) * cw;
        const ligne = (y, nom) => D().texte(ctx, nom, cx0 - 8, y, c.texte, 11, "right", true);
        ligne(cy0, "TRIG"); ligne(cy0 + lh + 6, "ECHO");
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx0, cy0 + 8); ctx.lineTo(cx0, cy0 - 8); ctx.lineTo(cx0 + 3, cy0 - 8); ctx.lineTo(cx0 + 3, cy0 + 8); ctx.lineTo(cx0 + cw, cy0 + 8); ctx.stroke();
        const t1 = Math.min(m.t, tMax), ye = cy0 + lh + 6;
        ctx.strokeStyle = c.accentFort;
        ctx.beginPath(); ctx.moveTo(cx0, ye + 8); ctx.lineTo(X(0.0005), ye + 8); ctx.lineTo(X(0.0005), ye - 8); ctx.lineTo(X(0.0005 + t1), ye - 8); ctx.lineTo(X(0.0005 + t1), ye + 8); ctx.lineTo(cx0 + cw, ye + 8); ctx.stroke();
        D().texte(ctx, m.t >= LS.HCSR04.timeout ? "ECHO reste haut ≈ 38 ms : pas d'écho" : "ECHO haut pendant " + n(m.t * 1e6, 0) + " µs", X(0.0005 + t1 / 2), ye - 16, c.texte, 11, "center", true);
        D().texte(ctx, "0 à 30 ms", cx0 + cw, ye + 22, c.doux, 11, "right");
      },
      mesures(s) {
        const m = s.etat.m;
        return [["Vitesse réelle du son", n(m.c, 1) + " m/s"], ["Vitesse utilisée dans le calcul", n(m.cCalc, 1) + " m/s", Math.abs(m.c - m.cCalc) > 2 ? "alerte" : ""],
          ["Durée de l'écho", m.t >= LS.HCSR04.timeout ? "≈ 38 ms (rien)" : n(m.t * 1e6, 0) + " µs"],
          ["Distance calculée", isFinite(m.dMes) ? n(m.dMes, 1) + " cm" : "—", isFinite(m.dMes) ? "" : "alerte"],
          ["Erreur", isFinite(m.err) ? n(m.err, 1) + " cm" : "—", !isFinite(m.err) || Math.abs(m.err) > 1 ? "alerte" : ""], ["État", m.etat, m.vu && !m.aveugle ? "" : "alerte"]];
      },
      explication(s) {
        const m = s.etat.m;
        let t = "Le HC-SR04 émet une salve de 8 impulsions à **40 kHz** quand on envoie 10 µs sur **TRIG**, puis met **ECHO** à l'état haut jusqu'au retour de l'écho. La distance vaut **d = v·t / 2** (aller-retour). La vitesse du son dépend de la température : **v ≈ 331,3 + 0,606·T** m/s. La formule toute faite « t / 58 » suppose environ 345 m/s, soit l'air vers 23 °C. Portée annoncée 2 cm à 4 m ; faisceau d'environ ± 15° (ordre de grandeur, variable d'un module à l'autre).";
        if (!s.p.correction && Math.abs(m.c - m.cCalc) > 2) t += "\n\n⚠ Sans correction de température, l'erreur est **proportionnelle à la distance** : environ 1,7 % pour 10 °C d'écart.";
        if (!m.vu && !m.aveugle) t += "\n\n⚠ " + (m.raison === "l'écho est renvoyé de côté" ? "Une surface lisse et inclinée renvoie le son comme un miroir renvoie la lumière : l'écho part de côté et ne revient pas." : m.raison === "écho trop faible" ? "Les matières molles absorbent les ultrasons, et un petit objet renvoie peu d'énergie : l'écho est trop faible à cette distance." : "L'objet est hors du faisceau : le capteur ne le voit pas.") + (s.p.fond === "mur" ? " Le capteur mesure alors le **mur du fond** : une valeur plausible mais fausse." : "");
        if (m.aveugle) t += "\n\n⚠ Sous 2 cm, l'émetteur vibre encore quand l'écho revient : la mesure est fausse (**zone aveugle**).";
        return t;
      }
    }, cfg);
  };

  /* ---------- Centrale inertielle : gyroscope, accéléromètre, filtre complémentaire ---------- */
  LS.filtreComplementaire = (angle, vitesseGyro, angleAccel, alpha, dt) => alpha * (angle + vitesseGyro * dt) + (1 - alpha) * angleAccel;
  /* Un pas de capteurs. etat : { theta (°), omega (°/s), aLin (m/s²) }, p : { biais, vibrations }. */
  LS.lectureIMU = function (etat, p, rnd) {
    const gyro = etat.omega + p.biais + gauss(rnd) * (p.vibrations ? 0.6 : 0.15);
    const th = etat.theta * DEG, bruitA = 0.004 * G + (p.vibrations ? 0.15 * G : 0);
    const ax = G * Math.sin(th) + etat.aLin * Math.cos(th) + gauss(rnd) * bruitA;
    const az = G * Math.cos(th) - etat.aLin * Math.sin(th) + gauss(rnd) * bruitA;
    return { gyro, angleAccel: Math.atan2(ax, az) / DEG };
  };
  /* Simulation complète (utile aux tests) : mouvement de balancement, durée en s, 200 Hz. */
  LS.simulerIMU = function (p, duree, rnd) {
    const dt = 0.005, e = { theta: 0, omega: 0, aLin: 0 };
    let gyroInt = 0, fusion = 0, s2acc = 0, s2fus = 0, s2gyr = 0, k = 0;
    for (let t = 0; t < duree; t += dt) {
      const th = 30 * Math.sin(0.5 * t) + 10 * Math.sin(1.3 * t);
      e.omega = (th - e.theta) / dt; e.theta = th;
      e.aLin = p.chariot ? (Math.floor(t / 2.5) % 2 ? -4 : 3) : 0;
      const l = LS.lectureIMU(e, p, rnd);
      gyroInt += l.gyro * dt;
      fusion = t === 0 ? l.angleAccel : LS.filtreComplementaire(fusion, l.gyro, l.angleAccel, p.alpha, dt);
      if (t > duree / 2) { s2acc += (l.angleAccel - th) ** 2; s2fus += (fusion - th) ** 2; s2gyr += (gyroInt - th) ** 2; k++; }
    }
    return { rmsAccel: Math.sqrt(s2acc / k), rmsFusion: Math.sqrt(s2fus / k), rmsGyro: Math.sqrt(s2gyr / k) };
  };

  LS.sims.imu = function (el, cfg) {
    const DT = 0.005;
    const recaler = s => { const e = s.etat; e.gyroInt = e.theta; e.fusion = e.theta; e.h = []; e.tRecal = s.t; e.maxErrAcc = 0; };
    return LS.simAnimee(el, {
      hauteur: 460,
      controles: [
        { k: "mode", nom: "Mouvement de la plateforme", choix: [["auto", "balancement automatique"], ["manuel", "je règle l'inclinaison"]], defaut: "auto" },
        { k: "consigne", nom: "Inclinaison demandée (mode manuel)", min: -60, max: 60, pas: 1, defaut: 0, unite: "°" },
        { k: "biais", nom: "Biais du gyroscope", min: 0, max: 3, pas: 0.1, defaut: 0.5, unite: "°/s", dec: 1 },
        { k: "vibrations", nom: "Vibrations (moteur, hélices)", bool: true, defaut: false },
        { k: "chariot", nom: "La plateforme est sur un chariot qui accélère et freine", bool: true, defaut: false },
        { k: "alpha", nom: "Coefficient α du filtre complémentaire", min: 0.8, max: 0.999, pas: 0.001, defaut: 0.98, dec: 3 }
      ],
      boutons: [{ k: "recaler", texte: "↺ Recaler les estimations", action: recaler }],
      init(s) { Object.assign(s.etat, { theta: 0, omega: 0, aLin: 0, gyroInt: 0, fusion: 0, angleAccel: 0, h: [], tRecal: 0, tEch: 0, maxErrAcc: 0 }); },
      changement(s, k) { if (k !== "consigne" && k !== "alpha") s.etat.tRecal = s.t; if (k === "alpha") s.etat.tAlpha = s.t; s.etat.maxErrAcc = 0; },
      avancer(s, dt) {
        const e = s.etat, p = s.p, nb = Math.max(1, Math.round(dt / DT));
        for (let q = 0; q < nb; q++) {
          const t = s.t - dt + (q + 1) * DT;
          let th;
          if (p.mode === "auto") th = 30 * Math.sin(0.5 * t) + 10 * Math.sin(1.3 * t);
          else { e.omegaM = (e.omegaM || 0) + ((p.consigne - e.theta) * 20 - (e.omegaM || 0) * 7) * DT; th = e.theta + e.omegaM * DT; }
          e.omega = (th - e.theta) / DT; e.theta = th;
          e.aLin = p.chariot ? (Math.floor(t / 2.5) % 2 ? -4 : 3) : 0;
          const l = LS.lectureIMU(e, p);
          e.gyroInt += l.gyro * DT;
          e.fusion = LS.filtreComplementaire(e.fusion, l.gyro, l.angleAccel, p.alpha, DT);
          e.angleAccel = l.angleAccel;
          if (Math.abs(e.theta) < 3) e.maxErrAcc = Math.max(e.maxErrAcc, Math.abs(l.angleAccel - e.theta));
        }
        e.tEch += dt;
        if (e.tEch > 0.02) { e.tEch = 0; e.h.push([s.t, e.theta, e.gyroInt, e.angleAccel, e.fusion]); }
        while (e.h.length && e.h[0][0] < s.t - 10) e.h.shift();
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, etroit = W < 640;
        // Plateforme vue de face, inclinée de theta
        const px = etroit ? W / 2 : 120, py = etroit ? 80 : H / 2 - 20;
        ctx.save(); ctx.translate(px + (s.p.chariot ? Math.max(-30, Math.min(30, e.aLin * 6)) : 0), py);
        ctx.rotate(e.theta * DEG);
        ctx.fillStyle = c.noeud; ctx.fillRect(-80, -6, 160, 12);
        ctx.fillStyle = "#263238"; ctx.fillRect(-14, -22, 28, 16);
        D().texte(ctx, "IMU", 0, -14, "#fff", 10, "center", true);
        D().fleche(ctx, 0, -30, 60, -30, c.info, 2); D().texte(ctx, "x", 66, -30, c.info, 11, "left", true);
        ctx.restore();
        ctx.fillStyle = c.texte; ctx.beginPath(); ctx.moveTo(px - 10, py + 40); ctx.lineTo(px + 10, py + 40); ctx.lineTo(px, py + 6); ctx.closePath(); ctx.fill();
        D().fleche(ctx, px + 100 > W - 10 ? px - 100 : px + 100, py - 30, px + 100 > W - 10 ? px - 100 : px + 100, py + 20, c.alerte, 2);
        D().texte(ctx, "g", px + 100 > W - 10 ? px - 90 : px + 110, py, c.alerte, 12, "left", true);
        // Graphe des angles
        const gx = etroit ? 40 : 260, gy = etroit ? 160 : 40, gw = W - gx - 16, gh = H - gy - (etroit ? 60 : 40);
        const h = e.h, t1 = s.t, t0 = t1 - 10;
        const lim = Math.max(45, ...h.map(r => Math.max(Math.abs(r[1]), Math.abs(r[2]), Math.abs(r[4])))) * 1.1;
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [t0, t1], ylim: [-lim, lim], series: [
          { pts: h.map(r => [r[0], r[3]]), coul: c.sombre ? "rgba(255,120,100,.45)" : "rgba(192,57,43,.35)", ep: 1 },
          { pts: h.map(r => [r[0], r[2]]), coul: c.info, ep: 2 },
          { pts: h.map(r => [r[0], r[1]]), coul: c.texte, ep: 3 },
          { pts: h.map(r => [r[0], r[4]]), coul: c.ok, ep: 2 }], titre: "Angle sur les 10 dernières secondes (± " + n(lim, 0) + "°)" });
        const leg = [["vrai", c.texte], ["gyro intégré", c.info], ["accéléromètre", c.alerte], ["fusion", c.ok]];
        let lx = gx + 4, ly = gy + gh + 16;
        leg.forEach(([t, col]) => {
          ctx.font = "500 11px Nunito, Segoe UI, sans-serif";
          const lw = 30 + ctx.measureText(t).width;
          if (lx + lw > W - 10) { lx = gx + 4; ly += 18; }
          ctx.fillStyle = col; ctx.fillRect(lx, ly - 2, 14, 4); D().texte(ctx, t, lx + 18, ly, c.texte, 11, "left"); lx += lw;
        });
      },
      mesures(s) {
        const e = s.etat, h = e.h.filter(r => r[0] > Math.max(e.tRecal || 0, e.tAlpha || 0) + 1);
        const rms = i => h.length ? Math.sqrt(h.reduce((a, r) => a + (r[i] - r[1]) ** 2, 0) / h.length) : NaN;
        e.rmsAccel = rms(3); e.rmsFusion = rms(4); e.rmsGyro = rms(2); e.nbMesures = h.length;
        const tau = s.p.alpha * DT / (1 - s.p.alpha);
        return [["Angle vrai", n(e.theta, 1) + "°"], ["Gyro intégré : écart", n(e.gyroInt - e.theta, 1) + "°", Math.abs(e.gyroInt - e.theta) > 3 ? "alerte" : ""],
          ["Accéléromètre : erreur efficace", n(e.rmsAccel, 1) + "°", e.rmsAccel > 3 ? "alerte" : ""], ["Fusion : erreur efficace", n(e.rmsFusion, 2) + "°", e.rmsFusion > 1 ? "alerte" : ""],
          ["Constante de temps du filtre", n(tau, 2) + " s"], ["Fréquence de calcul", "200 Hz"]];
      },
      explication(s) {
        let t = "Une centrale inertielle (MPU6050, ICM42688…) contient un **gyroscope**, qui mesure une **vitesse de rotation** (°/s), et un **accéléromètre**, qui mesure l'accélération, dont la pesanteur : à l'arrêt, il donne la direction de la verticale, donc l'inclinaison.\n- Le gyroscope est précis à court terme, mais il faut **intégrer** sa mesure : le moindre **biais** s'accumule, l'angle **dérive** sans fin.\n- L'accéléromètre ne dérive pas, mais il est **bruité** et trompé par les vibrations et les accélérations.\n- Le **filtre complémentaire** prend le meilleur des deux : angle = α·(angle + gyro·dt) + (1 − α)·angle_accéléro. Plus α est proche de 1, plus on fait confiance au gyroscope.";
        if (s.p.chariot) t += "\n\n⚠ Quand le chariot accélère, l'accéléromètre ne sait pas distinguer cette accélération de la pesanteur : il croit la plateforme inclinée (environ 22° pour 4 m/s²).";
        return t;
      }
    }, cfg);
  };

  /* ---------- Étalonnage et filtrage : balance à jauge de contrainte ---------- */
  LS.CONVERTISSEURS = {
    hx711: { nom: "HX711 24 bits", gain: 106.3, offset: 8432, bruit: 60, gainNominal: 100 },      // comptes par gramme
    adc10: { nom: "ADC 10 bits + amplificateur", gain: 0.4858, offset: 37, bruit: 0.2, gainNominal: 0.5, max: 1023 }
  };
  LS.lectureBalance = function (masse, conv, derive, rnd) {
    const k = LS.CONVERTISSEURS[conv];
    let v = k.offset + (derive || 0) + k.gain * masse + gauss(rnd) * k.bruit;
    v = Math.round(v);
    return k.max ? Math.max(0, Math.min(k.max, v)) : v;
  };
  const moyenneGlissante = (valeurs, N) => { const l = valeurs.slice(-N); return l.reduce((a, b) => a + b, 0) / l.length; };
  const filtreExpo = (precedent, x, a) => precedent === null || precedent === undefined ? x : precedent + a * (x - precedent);
  const ecartType = l => { if (l.length < 2) return 0; const m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / (l.length - 1)); };

  // Outils statistiques propres à ce fichier (noms génériques : on évite d'écraser ceux des autres simulations).
  LS.capteurs = { gauss, aleaGraine, moyenneGlissante, filtreExpo, ecartType };

  LS.sims.etalonnage = function (el, cfg) {
    const FE = 10;                                       // 10 mesures par seconde (HX711 en mode lent)
    const cal = s => s.etat.cal0 !== null && s.etat.cal500 !== null;
    const conversion = (s, brut) => cal(s) ? (brut - s.etat.cal0) * 500 / (s.etat.cal500 - s.etat.cal0) : brut / LS.CONVERTISSEURS[s.p.conv].gainNominal;
    const moyBrut = s => { const l = s.etat.bruts.slice(-FE); return l.reduce((a, b) => a + b, 0) / l.length; };
    const raz = s => { Object.assign(s.etat, { bruts: [], lu: [], filt: null, h: [], cal0: null, cal500: null, tStep: s.t, de: s.p.masse, t90: null, derive: 0 }); };
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "masse", nom: "Masse posée sur le plateau", choix: [[0, "rien (plateau vide)"], [100, "100 g"], [200, "200 g"], [500, "500 g (masse étalon)"], [1000, "1 kg"]], nombres: true, defaut: 0 },
        { k: "conv", nom: "Convertisseur", choix: [["hx711", "HX711 24 bits (balance)"], ["adc10", "ADC 10 bits + amplificateur"]], defaut: "hx711" },
        { k: "filtre", nom: "Filtrage", choix: [["aucun", "aucun"], ["moyenne", "moyenne glissante sur N mesures"], ["expo", "passe-bas exponentiel (coefficient a)"]], defaut: "aucun" },
        { k: "N", nom: "N (moyenne glissante)", min: 1, max: 64, pas: 1, defaut: 8 },
        { k: "a", nom: "a (passe-bas : part de la nouvelle mesure)", min: 0.01, max: 1, pas: 0.01, defaut: 0.2, dec: 2 },
        { k: "derive", nom: "Dérive thermique du capteur", bool: true, defaut: false }
      ],
      boutons: [
        { k: "tare", texte: "⚖ Tare (plateau vide)", action: s => { if (s.p.masse !== 0) { LS.avis("La tare se fait plateau vide : retire d'abord la masse."); return; } s.etat.cal0 = moyBrut(s); LS.avis("Zéro enregistré : " + n(s.etat.cal0, 0) + " comptes."); } },
        { k: "etalon", texte: "◎ Étalonner avec 500 g", action: s => { if (s.p.masse !== 500) { LS.avis("Pose la masse étalon de 500 g avant d'étalonner."); return; } if (s.etat.cal0 === null) { LS.avis("Fais d'abord la tare, plateau vide."); return; } s.etat.cal500 = moyBrut(s); LS.avis("Point 500 g enregistré : la balance est étalonnée."); } },
        { k: "oubli", texte: "✕ Oublier l'étalonnage", action: s => { s.etat.cal0 = null; s.etat.cal500 = null; } }
      ],
      init(s) { s.etat.acc = 0; raz(s); },
      changement(s, k) {
        if (k === "conv") raz(s);
        if (k === "masse") { s.etat.tStep = s.t; s.etat.de = s.etat.filt === null ? 0 : s.etat.filt; s.etat.t90 = null; }
      },
      avancer(s, dt) {
        const e = s.etat, p = s.p;
        e.acc += dt;
        while (e.acc >= 1 / FE) {
          e.acc -= 1 / FE;
          if (p.derive) e.derive += (p.conv === "hx711" ? 3 : 0.015) / FE;
          const brut = LS.lectureBalance(p.masse, p.conv, e.derive);
          e.bruts.push(brut); if (e.bruts.length > 200) e.bruts.shift();
          const lu = conversion(s, brut);
          e.lu.push(lu); if (e.lu.length > 200) e.lu.shift();
          if (p.filtre === "moyenne") e.filt = moyenneGlissante(e.lu, p.N);
          else if (p.filtre === "expo") e.filt = filtreExpo(e.filt, lu, p.a);
          else e.filt = lu;
          e.brut = brut;
          e.h.push([s.t, lu, e.filt, p.masse]); while (e.h.length && e.h[0][0] < s.t - 15) e.h.shift();
          const saut = p.masse - e.de;
          if (e.t90 === null && Math.abs(saut) > 20 && Math.abs(e.filt - p.masse) < 0.1 * Math.abs(saut)) e.t90 = s.t - e.tStep;
        }
        // Statistiques sur les 3 dernières secondes, si la masse n'a pas changé entre-temps
        const stable = e.h.filter(r => r[0] > Math.max(e.tStep + 0.5 + (e.t90 || 0), s.t - 3));
        e.nbStables = stable.length;
        e.sigmaBrut = ecartType(stable.map(r => r[1])); e.sigmaFilt = ecartType(stable.map(r => r[2]));
        e.erreurMoy = stable.length ? stable.reduce((a, r) => a + r[2], 0) / stable.length - p.masse : NaN;
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, etroit = W < 640;
        // Balance
        const bx = etroit ? W / 2 : 110, by = etroit ? 70 : 150;
        ctx.fillStyle = c.doux; ctx.fillRect(bx - 70, by + 30, 140, 14);
        ctx.fillStyle = "#90a4ae"; ctx.fillRect(bx - 18, by + 8, 36, 22);
        ctx.fillStyle = c.texte; ctx.fillRect(bx - 60, by, 120, 8);
        if (s.p.masse > 0) { const hM = 10 + 30 * Math.sqrt(s.p.masse / 1000); ctx.fillStyle = "#b0bec5"; ctx.fillRect(bx - 20, by - hM, 40, hM); D().texte(ctx, s.p.masse + " g", bx, by - hM / 2, "#263238", 11, "center", true); }
        ctx.fillStyle = "#1b2a1b"; ctx.fillRect(bx - 56, by + 56, 112, 34);
        D().texte(ctx, e.filt === null ? "----" : n(e.filt, 1) + " g", bx, by + 73, "#7CFC7C", 17, "center", true);
        D().texte(ctx, cal(s) ? "étalonnée" : "non étalonnée (gain de la fiche technique)", bx, by + 104, cal(s) ? c.ok : c.alerte, 11, "center", true);
        // Graphe 15 s
        const gx = etroit ? 40 : 250, gy = etroit ? 200 : 40, gw = W - gx - 16, gh = H - gy - 40;
        const h = e.h, vals = h.map(r => r[2]).concat(h.map(r => r[3]));
        const ymin = Math.min(-20, ...vals) - 10, ymax = Math.max(100, ...vals) + 20;
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [s.t - 15, s.t], ylim: [ymin, ymax], series: [
          { pts: h.map(r => [r[0], r[1]]), coul: c.sombre ? "rgba(255,255,255,.3)" : "rgba(0,0,0,.25)", ep: 1 },
          { pts: h.map(r => [r[0], r[3]]), coul: c.ok, ep: 1.5 },
          { pts: h.map(r => [r[0], r[2]]), coul: c.accentFort, ep: 2.5 }], titre: "Masse vraie (vert), lecture brute (gris), affichée après filtre (orange), en g", xlab: "15 s" });
      },
      mesures(s) {
        const e = s.etat;
        return [["Lecture brute", e.brut === undefined ? "—" : e.brut + " comptes"], ["Masse affichée", e.filt === null ? "—" : n(e.filt, 1) + " g"],
          ["Erreur moyenne (3 s)", isFinite(e.erreurMoy) ? n(e.erreurMoy, 1) + " g" : "—", !isFinite(e.erreurMoy) || Math.abs(e.erreurMoy) > 2 ? "alerte" : ""],
          ["Écart type brut", n(e.sigmaBrut || 0, 2) + " g"], ["Écart type affiché", n(e.sigmaFilt || 0, 2) + " g"],
          ["Temps de réponse à 90 %", e.t90 === null ? "—" : n(e.t90, 1) + " s", e.t90 > 1 ? "alerte" : ""]];
      },
      explication(s) {
        let t = "Une balance électronique mesure la déformation d'une **jauge de contrainte** (pont de Wheatstone) amplifiée et numérisée par un HX711. La lecture brute vaut **décalage + gain × masse + bruit** : il faut l'**étalonner** sur deux points connus (la **tare** à vide, puis une **masse étalon**) pour corriger décalage et gain.\n- La **moyenne glissante** sur N mesures divise le bruit par √N, mais retarde d'environ N/2 mesures.\n- Le **passe-bas exponentiel** (y ← y + a·(x − y)) lisse d'autant plus que a est petit, au prix d'une réponse plus lente.";
        if (s.p.conv === "adc10") t += "\n\nAvec l'ADC 10 bits, un pas vaut environ **2 g** : si le bruit est plus petit qu'un pas, la lecture reste bloquée sur une marche et moyenner n'améliore pas la **résolution**.";
        if (s.p.derive) t += "\n\n⚠ La **dérive** décale lentement le zéro (température de la jauge) : il faut refaire la tare de temps en temps.";
        return t;
      }
    }, cfg);
  };
})();
