/* Simulations d'électricité du bâtiment : disjoncteur et échauffement des câbles, défaut
   d'isolement et différentiel (schéma TT), chute de tension dans une ligne.
   Les fonctions de calcul (LS.declenchementMagnetique, LS.tempsThermique, LS.defautTT,
   LS.chuteTension…) sont pures et testées sous Node (tests/batiment.test.js).
   Valeurs inspirées de la CEI 60898 (disjoncteurs), CEI 61008 (différentiels),
   CEI 60479-1 (effets du courant) et NF C 15-100 / CEI 60364 (installation) : ce sont des
   approximations pédagogiques, pas un outil de dimensionnement. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;
  const RHO = { cuivre: 0.0225, alu: 0.036 };          // Ω·mm²/m, résistivité « à chaud » utilisée par la NF C 15-100
  const RHO_FROID = { cuivre: 0.0178, alu: 0.029 };    // à 20 °C
  // Réseau malien : 220 V entre phase et neutre, 50 Hz (230 V en Europe).
  const U_RESEAU = 220;
  LS.U_RESEAU = U_RESEAU;
  // Courant admissible Iz (A), câble cuivre PVC, 2 conducteurs chargés, sous conduit encastré (méthode B), 30 °C.
  const IZ = { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57 };
  const COURBES = { B: [3, 5], C: [5, 10], D: [10, 20] };

  /* ---------- Fonctions de calcul ---------- */
  // Déclencheur magnétique : « non » sous le seuil bas, « possible » entre les deux, « certain » au-dessus.
  LS.declenchementMagnetique = function (I, In, courbe) {
    const [a, b] = COURBES[courbe], k = I / In;
    return k >= b ? "certain" : k >= a ? "possible" : "non";
  };
  // Déclencheur thermique (bilame) : temps de déclenchement à courant constant, en s.
  // Ajusté sur les points conventionnels de la CEI 60898 : 1,13 In ne déclenche pas en 1 h,
  // 1,45 In déclenche en moins d'1 h (≈ 30 min ici), 2,55 In entre 1 et 60 s (≈ 20 s ici) ;
  // au-delà, comportement en I²t (≈ 5 s à 5 In).
  LS.tempsThermique = function (I, In) {
    const k = I / In;
    if (k <= 1.13) return Infinity;
    if (k < 2.55) return 1129 / Math.pow(k * k - 1.2769, 2.44);
    return 20 * (2.55 / k) * (2.55 / k);
  };
  // Température d'équilibre d'un câble (°C) : échauffement ∝ I², 70 °C atteints à Iz (PVC).
  LS.temperatureCable = (I, section, Tamb) => (Tamb === undefined ? 30 : Tamb) + 40 * Math.pow(I / IZ[section], 2);
  LS.courantAdmissible = section => IZ[section];
  /* Protection contre les surcharges (CEI 60364-4-43, NF C 15-100) : deux conditions.
     1) In ≤ Iz : le calibre ne dépasse pas le courant admissible du câble ;
     2) I2 ≤ 1,45 Iz, où I2 est le courant qui fait sûrement déclencher en 1 h (1,45 In pour un disjoncteur
        domestique CEI 60898, d'où la condition 1 suffit ; ≈ 1,6 à 2,1 In pour un fusible gG).
     Entre Iz et 1,45 Iz, la norme admet que le câble dépasse sa température de service pendant la durée
     de la surcharge : l'isolant le supporte temporairement, au prix d'un vieillissement. */
  LS.conditionSurcharge = function (In, section, k2) {
    const Iz = IZ[section], I2 = (k2 || 1.45) * In;
    return { Iz, I2, c1: In <= Iz, c2: I2 <= 1.45 * Iz + 1e-9, ok: In <= Iz && I2 <= 1.45 * Iz + 1e-9 };
  };
  // Résistance d'une ligne monophasée (aller et retour).
  LS.resistanceLigne = (longueur, section, matiere, froid) => (froid ? RHO_FROID : RHO)[matiere || "cuivre"] * 2 * longueur / section;
  // Chute de tension (formule NF C 15-100) : u = b (ρ L / S cos φ + λ L sin φ) I, b = 2 en monophasé, λ = 0,08 mΩ/m.
  LS.chuteTension = function (o) {
    const cos = o.cosphi === undefined ? 1 : o.cosphi, sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const u = 2 * (RHO[o.matiere || "cuivre"] * o.longueur / o.section * cos + 0.08e-3 * o.longueur * sin) * o.I;
    const U = o.U || U_RESEAU;
    return { dU: u, pourcent: 100 * u / U, Ucharge: U - u, pertes: LS.resistanceLigne(o.longueur, o.section, o.matiere) * o.I * o.I };
  };
  // Défaut d'isolement en schéma TT : phase → carcasse (Rd), carcasse → terre par la prise de terre RA
  // et, éventuellement, par une personne (Rh). Retour par la terre du neutre RB.
  LS.defautTT = function (o) {
    const U = o.U || U_RESEAU, RB = o.RB === undefined ? 10 : o.RB;
    const RA = o.RA, Rh = o.touche ? o.Rh : Infinity;
    const Rpar = !isFinite(RA) && !isFinite(Rh) ? Infinity : !isFinite(RA) ? Rh : !isFinite(Rh) ? RA : RA * Rh / (RA + Rh);
    if (!isFinite(o.Rd) || !isFinite(Rpar)) {
      // Pas de chemin vers la terre : la carcasse monte au potentiel de la phase à travers Rd (si défaut).
      return { Id: 0, Uc: isFinite(o.Rd) ? U : 0, Ib: 0 };
    }
    const Id = U / (RB + o.Rd + Rpar), Uc = Id * Rpar;
    return { Id, Uc, Ib: isFinite(Rh) ? Uc / Rh : 0 };
  };
  // Différentiel : ne doit pas déclencher sous 0,5 IΔn, doit déclencher à IΔn (ici seuil à 0,8 IΔn).
  // Temps maximaux CEI 61008 (type général) : 300 ms à IΔn, 150 ms à 2 IΔn, 40 ms à 5 IΔn.
  LS.tempsDifferentiel = function (Id, IDn) {
    if (!IDn || Id < 0.8 * IDn) return Infinity;
    const k = Id / IDn;
    if (k >= 5) return 0.04;
    if (k >= 2) return 0.15 * Math.pow(0.04 / 0.15, Math.log(k / 2) / Math.log(2.5));
    if (k >= 1) return 0.3 * Math.pow(0.5, Math.log(k) / Math.log(2));
    return 0.3;
  };
  // Zones des effets du courant alternatif (CEI 60479-1, courbes b et c1 très simplifiées).
  // Points (durée en ms, courant en mA) en échelles logarithmiques.
  const COURBE_B = [[10, 200], [100, 100], [500, 30], [2000, 10], [1e5, 10]];
  const COURBE_C1 = [[10, 500], [100, 500], [300, 200], [1000, 50], [3000, 40], [1e5, 40]];
  function seuil(courbe, tms) {
    if (tms <= courbe[0][0]) return courbe[0][1];
    for (let i = 1; i < courbe.length; i++) {
      const [t0, i0] = courbe[i - 1], [t1, i1] = courbe[i];
      if (tms <= t1) { const f = Math.log(tms / t0) / Math.log(t1 / t0); return i0 * Math.pow(i1 / i0, f); }
    }
    return courbe[courbe.length - 1][1];
  }
  LS.zoneCourant = function (ImA, ts) {
    const tms = Math.max(10, ts * 1000);
    if (ImA < 0.5) return "AC-1";
    if (ImA < seuil(COURBE_B, tms)) return "AC-2";
    if (ImA < seuil(COURBE_C1, tms)) return "AC-3";
    return "AC-4";
  };
  const ZONES = {
    "AC-1": "perception possible, aucune réaction",
    "AC-2": "picotements, contractions, on peut encore lâcher prise : en général sans effet dangereux",
    "AC-3": "contractions musculaires fortes, difficultés à respirer : effets réversibles en général",
    "AC-4": "risque de fibrillation cardiaque, arrêt respiratoire, brûlures : danger de mort"
  };
  LS.ZONES_COURANT = ZONES;
  // Tension limite conventionnelle de contact : 50 V en local sec, 25 V en milieu mouillé.
  LS.tensionLimite = Rh => Rh <= 500 ? 25 : 50;

  // Petit graphe en échelles logarithmiques : x et y en décades.
  function grapheLog(ctx, x, y, w, h, o) {
    const c = o.c, [lx0, lx1] = o.xlog, [ly0, ly1] = o.ylog;
    const X = v => x + (Math.log10(v) - lx0) / (lx1 - lx0) * w, Y = v => y + h - (Math.log10(v) - ly0) / (ly1 - ly0) * h;
    ctx.strokeStyle = c.bordure; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = c.sombre ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.08)";
    for (let d = Math.ceil(lx0); d <= lx1; d++) { const px = X(Math.pow(10, d)); ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke(); D().texte(ctx, o.fx(Math.pow(10, d)), px, y + h + 10, c.doux, 10, "center"); }
    for (let d = Math.ceil(ly0); d <= ly1; d++) { const py = Y(Math.pow(10, d)); ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke(); D().texte(ctx, o.fy(Math.pow(10, d)), x - 4, py, c.doux, 10, "right"); }
    if (o.titre) D().texte(ctx, o.titre, x, y - 10, c.texte, 12, "left", true);
    const trace = (pts, coul, ep) => {
      ctx.strokeStyle = coul; ctx.lineWidth = ep || 2; ctx.beginPath();
      let premier = true;
      pts.forEach(([a, b]) => { if (!isFinite(b) || b <= 0) { premier = true; return; } const px = X(a), py = Math.max(y, Math.min(y + h, Y(b))); if (premier) { ctx.moveTo(px, py); premier = false; } else ctx.lineTo(px, py); });
      ctx.stroke();
    };
    return { X, Y, trace };
  }
  const dureeLisible = t => t < 120 ? LS.nombre(t, 0) + " s" : t < 7200 ? LS.nombre(t / 60, 0) + " min" : t < 172800 ? LS.nombre(t / 3600, 1) + " h" : LS.nombre(t / 86400, 0) + " jours";
  LS.dureeLisible = dureeLisible;
  const couleurTemp = T => T < 50 ? "#43a047" : T < 70 ? "#f9a825" : T < 100 ? "#fb8c00" : "#e53935";

  /* ---------- 1. Disjoncteur et section des câbles ---------- */
  const APPAREILS = [
    { k: "lampes", nom: "Éclairage", P: 300 }, { k: "radiateur", nom: "Radiateur", P: 2000 }, { k: "bouilloire", nom: "Bouilloire", P: 2200 },
    { k: "four", nom: "Four", P: 3000 }, { k: "lavelinge", nom: "Lave-linge", P: 2200 }
  ];
  LS.sims.protection = function (el, cfg) {
    const Zreseau = 0.35;                                   // impédance de boucle en amont (transformateur, branchement), Ω
    function calc(s) {
      const p = s.p, e = s.etat;
      const Rc = LS.resistanceLigne(p.longueur, p.section, "cuivre");
      const Pdem = APPAREILS.reduce((a, ap) => a + (p[ap.k] ? ap.P : 0), 0);
      const Icharge = Pdem / U_RESEAU;
      const Icc = U_RESEAU / (Zreseau + Rc);                     // court-circuit franc en bout de ligne
      const Idem = p.courtcircuit ? Icc : Icharge;
      const I = e.ouvert ? 0 : Idem;
      return { Rc, Pdem, Icharge, Icc, Idem, I, Iz: IZ[p.section], Tfin: LS.temperatureCable(I, p.section) };
    }
    const sim = LS.simAnimee(el, {
      hauteur: 470,
      controles: [
        { k: "calibre", nom: "Calibre du disjoncteur", choix: [[10, "10 A"], [16, "16 A"], [20, "20 A"], [25, "25 A"], [32, "32 A"]], nombres: true, defaut: 16 },
        { k: "courbe", nom: "Courbe", choix: [["B", "B (3 à 5 In)"], ["C", "C (5 à 10 In)"], ["D", "D (10 à 20 In)"]], defaut: "C" },
        { k: "section", nom: "Section du câble (cuivre)", choix: [[1.5, "1,5 mm²"], [2.5, "2,5 mm²"], [4, "4 mm²"], [6, "6 mm²"], [10, "10 mm²"]], nombres: true, defaut: 2.5 },
        { k: "longueur", nom: "Longueur du circuit", min: 5, max: 60, pas: 1, defaut: 20, unite: "m" },
        { k: "vitesse", nom: "Accélération du temps", choix: [[1, "temps réel"], [10, "× 10"], [60, "× 60 (1 s = 1 min)"]], nombres: true, defaut: 60 }
      ].concat(APPAREILS.map(ap => ({ k: ap.k, nom: ap.nom + " (" + ap.P + " W)", bool: true, defaut: ap.k === "lampes" }))).concat([
        { k: "courtcircuit", nom: "⚡ Court-circuit en bout de ligne", bool: true, defaut: false }
      ]),
      boutons: [
        { k: "rearmer", texte: "Réarmer le disjoncteur", action: s => { Object.assign(s.etat, { ouvert: false, bilame: 0, cause: null, tOuvert: null }); } },
        { k: "refroidir", texte: "Laisser refroidir", action: s => { s.etat.T = 30; s.etat.Tmax = 30; s.etat.h = []; } }
      ],
      init(s) { Object.assign(s.etat, { T: 30, Tmax: 30, bilame: 0, ouvert: false, cause: null, tsim: 0, h: [], I2t: 0, abime: false, depuis: 0, tOuvert: null }); },
      changement(s) { s.etat.depuis = s.etat.tsim; },
      avancer(s, dt) {
        const e = s.etat, p = s.p, n = 20, h = dt * p.vitesse / n;
        for (let q = 0; q < n; q++) {
          const k = calc(s);
          if (!e.ouvert && k.I > 0) {
            // Magnétique : instantané (seuil fixé au milieu de la plage de la courbe).
            const [a, b] = COURBES[p.courbe];
            if (k.I >= (a + b) / 2 * p.calibre) { e.ouvert = true; e.cause = "magnetique"; e.tOuvert = 0.008; e.I2t = k.I * k.I * 0.008; }
            else {
              const tt = LS.tempsThermique(k.I, p.calibre);
              if (isFinite(tt)) e.bilame += h / tt; else e.bilame = Math.max(0, e.bilame - h / 600);
              if (e.bilame >= 1) { e.ouvert = true; e.cause = "thermique"; e.tOuvert = tt; e.I2t = p.courtcircuit ? k.I * k.I * tt : 0; }
            }
            if (e.ouvert && e.I2t > Math.pow(115 * p.section, 2)) e.abime = true;   // contrainte thermique adiabatique k²S², k = 115 (Cu/PVC)
          } else e.bilame = Math.max(0, e.bilame - h / 600);
          const k2 = calc(s), tau = 300 * Math.sqrt(p.section / 1.5);           // constante de temps thermique du câble, s
          e.T += (k2.Tfin - e.T) * h / tau;
          e.tsim += h;
        }
        e.Tmax = Math.max(e.Tmax, e.T);
        if (!e.h.length || e.tsim - e.h[e.h.length - 1][0] > 2) e.h.push([e.tsim, e.T]);
        while (e.h.length && e.h[0][0] < e.tsim - 1800) e.h.shift();
        e.a = (e.a || 0) + dt * calc(s).I;
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, p = s.p, k = calc(s), etroit = W < 640;
        const hs = etroit ? 200 : H;                              // hauteur de la zone du schéma
        const sx = 12, sy = 24, sw = etroit ? W - 24 : W * 0.5;
        // Tableau et disjoncteur
        ctx.fillStyle = c.carte; ctx.strokeStyle = c.bordure; ctx.lineWidth = 1.5; ctx.fillRect(sx, sy, 70, 110); ctx.strokeRect(sx, sy, 70, 110);
        D().texte(ctx, p.courbe + p.calibre, sx + 35, sy + 14, c.texte, 13, "center", true);
        ctx.fillStyle = e.ouvert ? c.alerte : c.ok; ctx.fillRect(sx + 25, e.ouvert ? sy + 62 : sy + 30, 20, 30);
        D().texte(ctx, e.ouvert ? "OFF" : "ON", sx + 35, sy + 100, e.ouvert ? c.alerte : c.ok, 12, "center", true);
        // Câble (couleur selon température)
        const cy = sy + 50, x0 = sx + 70, x1 = sx + sw - 10;
        ctx.strokeStyle = couleurTemp(e.T); ctx.lineWidth = 3 + 2 * p.section / 2.5; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
        if (k.I > 0) for (let i = 0; i < 8; i++) { const f = ((e.a * 0.02 + i / 8) % 1 + 1) % 1; ctx.fillStyle = "#ffd54f"; ctx.beginPath(); ctx.arc(x0 + f * (x1 - x0), cy, 3, 0, 7); ctx.fill(); }
        D().texte(ctx, LS.nombre(p.section, 1) + " mm² · " + p.longueur + " m · " + LS.nombre(e.T, 0) + " °C", (x0 + x1) / 2, cy - 16, c.texte, 12, "center", true);
        // Appareils
        const n = APPAREILS.length, bw = (x1 - x0) / n;
        APPAREILS.forEach((ap, i) => {
          const bx = x0 + i * bw + 4, by = cy + 30;
          ctx.strokeStyle = c.bordure; ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 4, cy); ctx.lineTo(bx + bw / 2 - 4, by); ctx.stroke();
          ctx.fillStyle = p[ap.k] ? (k.I > 0 ? c.accent : c.noeud) : c.carte; ctx.fillRect(bx, by, bw - 8, 36); ctx.strokeRect(bx, by, bw - 8, 36);
          D().texte(ctx, ap.nom, bx + (bw - 8) / 2, by + 12, c.texte, 10, "center", true);
          D().texte(ctx, p[ap.k] ? ap.P + " W" : "arrêt", bx + (bw - 8) / 2, by + 26, c.doux, 10, "center");
        });
        if (p.courtcircuit) { D().texte(ctx, "⚡ court-circuit", x1 - 40, cy + 92, c.alerte, 13, "center", true); }
        if (e.abime) D().texte(ctx, "⚠ isolant du câble abîmé par le court-circuit", sx, sy + hs - 30 > sy + 150 ? sy + 140 : sy + 140, c.alerte, 12, "left", true);
        // Graphe de température
        const gx = etroit ? 44 : W * 0.56, gy = etroit ? hs + 20 : 30, gw = etroit ? W - 60 : W - gx - 16, gh = etroit ? (H - hs - 60) / 2 - 10 : (H - 90) / 2;
        const tmax = Math.max(100, e.Tmax * 1.1);
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [e.tsim - 1800, e.tsim], ylim: [20, tmax], series: [{ pts: [[e.tsim - 1800, 70], [e.tsim, 70]], coul: c.alerte, ep: 1 }, { pts: e.h, coul: couleurTemp(e.T), ep: 2.5 }],
          titre: "Température du câble (°C), 30 dernières minutes", ylab: LS.nombre(tmax, 0) + " °C", xlab: "limite PVC 70 °C en rouge" });
        // Courbe de déclenchement temps-courant (échelles log)
        const ty = gy + gh + 34, th = etroit ? H - ty - 26 : H - ty - 26;
        const g = grapheLog(ctx, gx, ty, gw, th, { c, xlog: [0, 1.5], ylog: [-2, 4], titre: "Courbe de déclenchement : temps (s) selon I / In", fx: v => LS.nombre(v, v < 10 ? 0 : 0) + "×", fy: v => v >= 1 ? String(v) : String(v).replace(".", ",") });
        const pts = []; const [a, b] = COURBES[p.courbe];
        for (let kk = 1.14; kk < 31.6; kk *= 1.03) { const tt = LS.tempsThermique(kk * p.calibre, p.calibre); pts.push([kk, kk >= (a + b) / 2 ? 0.01 : tt]); }
        g.trace(pts, c.info, 2);
        ctx.fillStyle = c.sombre ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"; ctx.fillRect(g.X(a), ty, g.X(b) - g.X(a), th);
        const kk = k.Idem / p.calibre;
        if (kk > 1) { const tt = kk >= (a + b) / 2 ? 0.01 : LS.tempsThermique(k.Idem, p.calibre); const px = g.X(Math.min(31, kk)), py = isFinite(tt) ? g.Y(Math.max(0.01, Math.min(1e4, tt))) : ty + 4; ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); }
      },
      mesures(s) {
        const e = s.etat, p = s.p, k = calc(s);
        const mag = LS.declenchementMagnetique(k.Icc, p.calibre, p.courbe);
        return [["Courant demandé", LS.nombre(k.Idem, 1) + " A", k.Idem > p.calibre ? "alerte" : ""], ["Courant admissible du câble Iz", LS.nombre(k.Iz, 1) + " A", p.calibre > k.Iz ? "alerte" : ""],
          ["Température du câble", LS.nombre(e.T, 0) + " °C", e.T > 70 ? "alerte" : ""], ["Disjoncteur", e.ouvert ? "déclenché (" + (e.cause === "magnetique" ? "magnétique" : "thermique") + ")" : "fermé", e.ouvert ? "alerte" : ""],
          ["Échauffement du bilame", LS.nombre(Math.min(100, 100 * e.bilame), 0) + " %"], ["Court-circuit en bout de ligne", LS.nombre(k.Icc, 0) + " A (" + LS.nombre(k.Icc / p.calibre, 1) + " In, magnétique : " + mag + ")", mag === "non" ? "alerte" : ""],
          ["Temps simulé", LS.nombre(e.tsim / 60, 1) + " min"]];
      },
      explication(s) {
        const e = s.etat, p = s.p, k = calc(s);
        let t = "Le disjoncteur a deux déclencheurs :\n- **thermique** (un bilame qui chauffe) : il coupe une **surcharge** d'autant plus vite qu'elle est forte : rien à 1,13 In pendant 1 h, en moins d'1 h à 1,45 In, en quelques secondes à 5 In ;\n- **magnétique** (une bobine) : il coupe un **court-circuit** en quelques millisecondes, au-delà de 3-5 In (courbe B), 5-10 In (C) ou 10-20 In (D).\nLe disjoncteur protège le **câble**, pas l'appareil : son calibre doit être inférieur ou égal au courant admissible du câble (Iz). Usage courant : 1,5 mm² → 16 A (10 A en éclairage) ; 2,5 mm² → 20 A ; 6 mm² → 32 A.\n\nLa norme demande **deux** conditions : **In ≤ Iz**, et **I2 ≤ 1,45 Iz**, I2 étant le courant qui fait sûrement déclencher en 1 h (1,45 In pour un disjoncteur domestique). Elle **accepte** donc qu'entre Iz et 1,45 Iz le câble dépasse 70 °C pendant une surcharge qui peut durer longtemps (des heures, voire plus juste au-dessus de 1,13 In) : l'isolant le supporte temporairement, mais il vieillit. Une surcharge permanente reste à éviter : c'est pourquoi on limite le nombre de prises par circuit.";
        if (p.calibre <= k.Iz && k.I > k.Iz && !e.ouvert) t += "\n\nℹ Surcharge modérée (" + LS.nombre(k.I, 1) + " A, soit " + LS.nombre(k.I / p.calibre, 2) + " In) : le circuit est bien protégé au sens de la norme, mais le câble monte vers **" + LS.nombre(k.Tfin, 0) + " °C** et le disjoncteur peut mettre très longtemps à couper" + (isFinite(LS.tempsThermique(k.I, p.calibre)) ? " (≈ " + dureeLisible(LS.tempsThermique(k.I, p.calibre)) + ")" : " (jamais à moins de 1,13 In)") + ". Toléré temporairement, pas en permanence.";
        if (p.calibre > k.Iz) t += "\n\n⚠ **Calibre trop fort pour ce câble** (" + p.calibre + " A > Iz = " + k.Iz + " A) : le câble peut dépasser 70 °C sans que le disjoncteur réagisse. L'isolant vieillit, durcit, puis peut fondre : c'est un départ de feu classique.";
        if (LS.declenchementMagnetique(k.Icc, p.calibre, p.courbe) !== "certain") t += "\n\n⚠ Avec cette longueur, le courant de court-circuit (" + LS.nombre(k.Icc, 0) + " A) n'est pas assez fort pour un déclenchement magnétique **certain** : c'est le thermique qui coupera, plus lentement. La norme limite la longueur des circuits pour cette raison.";
        if (e.abime) t += "\n\n⚠ L'énergie du court-circuit (I²t) a dépassé ce que l'isolant supporte (k²S² avec k = 115) : il faudrait remplacer le câble.";
        return t;
      }
    }, cfg);
    sim.calc = () => calc(sim);
    return sim;
  };

  /* ---------- 2. Défaut d'isolement et différentiel ---------- */
  LS.sims.differentiel = function (el, cfg) {
    function calc(s) {
      const p = s.p, e = s.etat;
      const r = e.ouvert ? { Id: 0, Uc: 0, Ib: 0 } : LS.defautTT({ Rd: p.defaut ? p.Rd : Infinity, RA: p.RA, Rh: p.Rh, touche: p.touche });
      const brut = LS.defautTT({ Rd: p.defaut ? p.Rd : Infinity, RA: p.RA, Rh: p.Rh, touche: p.touche });
      const tdiff = LS.tempsDifferentiel(brut.Id, p.IDn);
      const tdisj = brut.Id >= 10 * 16 ? 0.01 : LS.tempsThermique(brut.Id, 16);        // le disjoncteur C16 du circuit
      const tcoupure = Math.min(tdiff, tdisj);
      return Object.assign({}, r, { brut, tdiff, tdisj, tcoupure, zone: LS.zoneCourant(brut.Ib * 1000, isFinite(tcoupure) ? tcoupure : 10) });
    }
    const sim = LS.simAnimee(el, {
      hauteur: 460,
      controles: [
        { k: "IDn", nom: "Protection différentielle", choix: [[0, "aucune"], [0.03, "30 mA"], [0.3, "300 mA"], [0.5, "500 mA (branchement)"]], nombres: true, defaut: 0 },
        { k: "defaut", nom: "Défaut d'isolement dans l'appareil (phase → carcasse)", bool: true, defaut: true },
        { k: "Rd", nom: "Résistance du défaut", min: 0.1, max: 100000, log: true, defaut: 1, format: v => LS.si(v, "Ω") },
        { k: "RA", nom: "Prise de terre de la maison RA", choix: [[10, "10 Ω"], [30, "30 Ω"], [100, "100 Ω"], [500, "500 Ω"], [1500, "1 500 Ω"], [Infinity, "absente"]], nombres: true, defaut: 30 },
        { k: "touche", nom: "Une personne touche la carcasse", bool: true, defaut: false },
        { k: "Rh", nom: "Résistance de la personne", aide: "Ordres de grandeur sous 220-230 V (CEI 60479-1) : peau sèche, environ 1 000 à 2 100 Ω selon les personnes, médiane vers 1 300-1 400 Ω ; on prend une valeur prudente. Humide : mains humides. Mouillée : pieds nus sur sol mouillé.", choix: [[1300, "sèche : 1 300 Ω (valeur prudente)"], [1000, "humide : 1 000 Ω"], [500, "mouillée : 500 Ω"]], nombres: true, defaut: 1300 }
      ],
      boutons: [
        { k: "rearmer", texte: "Réarmer", action: s => { s.etat.ouvert = false; s.etat.cause = null; s.etat.t0 = s.t; } },
        { k: "test", texte: "Bouton test (T)", titre: "Crée une fuite interne d'environ 1,5 IΔn", action: s => { if (s.p.IDn) { s.etat.ouvert = true; s.etat.cause = "test"; s.etat.test = true; LS.avis("Le différentiel a déclenché : il fonctionne. Teste-le ainsi tous les mois."); } else LS.avis("Aucun différentiel : rien ne se passe."); } }
      ],
      init(s) { Object.assign(s.etat, { ouvert: false, cause: null, a: 0, t0: 0, test: false }); },
      changement(s) { s.etat.t0 = s.t; },
      avancer(s, dt) {
        const e = s.etat, k = calc(s);
        if (!e.ouvert && isFinite(k.tcoupure) && s.t - e.t0 >= k.tcoupure) { e.ouvert = true; e.cause = k.tdiff <= k.tdisj ? "differentiel" : "disjoncteur"; e.tcoupure = k.tcoupure; e.dernier = { Ib: k.brut.Ib, zone: k.zone, t: k.tcoupure }; }
        if (!e.ouvert && k.brut.Ib > 0) e.dernier = { Ib: k.brut.Ib, zone: k.zone, t: Infinity };
        e.a += dt;
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, p = s.p, k = calc(s), etroit = W < 640;
        const sw = etroit ? W : W * 0.55, sh = etroit ? 250 : H;
        const sol = sh - 30;
        // Réseau : transformateur, terre du neutre RB
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2;
        D().texte(ctx, "Réseau " + U_RESEAU + " V", 14, 20, c.texte, 12, "left", true);
        const yP = 44, yN = 70;
        ctx.strokeStyle = "#8d6e63"; ctx.beginPath(); ctx.moveTo(14, yP); ctx.lineTo(sw - 70, yP); ctx.stroke();
        ctx.strokeStyle = "#1e88e5"; ctx.beginPath(); ctx.moveTo(14, yN); ctx.lineTo(sw - 60, yN); ctx.stroke();
        D().texte(ctx, "phase", 18, yP - 8, c.doux, 10); D().texte(ctx, "neutre", 18, yN + 10, c.doux, 10);
        ctx.strokeStyle = "#1e88e5"; ctx.beginPath(); ctx.moveTo(30, yN); ctx.lineTo(30, sol); ctx.stroke();
        terre(ctx, 30, sol, c); D().texte(ctx, "RB 10 Ω", 36, sol - 12, c.doux, 10);
        // Différentiel
        const dx = sw * 0.32;
        ctx.fillStyle = c.carte; ctx.strokeStyle = c.bordure; ctx.fillRect(dx, yP - 16, 54, yN - yP + 32); ctx.strokeRect(dx, yP - 16, 54, yN - yP + 32);
        D().texte(ctx, p.IDn ? (p.IDn * 1000) + " mA" : "pas de", dx + 27, yP + 6, c.texte, 11, "center", true);
        D().texte(ctx, p.IDn ? "diff." : "différ.", dx + 27, yP + 20, c.texte, 10, "center");
        if (e.ouvert) { ctx.fillStyle = c.alerte; ctx.fillRect(dx + 4, yP - 12, 46, 6); D().texte(ctx, "OUVERT", dx + 27, yN + 26, c.alerte, 11, "center", true); }
        // Appareil à carcasse métallique
        const ax = sw - 150, ay = 100, aw = 110, ah = 80;
        ctx.fillStyle = "#90a4ae"; ctx.fillRect(ax, ay, aw, ah);
        D().texte(ctx, "machine à laver", ax + aw / 2, ay + 14, "#263238", 11, "center", true);
        D().texte(ctx, "carcasse : " + LS.nombre(k.Uc, 0) + " V", ax + aw / 2, ay + 34, k.Uc > 50 ? "#b71c1c" : "#263238", 12, "center", true);
        ctx.strokeStyle = "#8d6e63"; ctx.beginPath(); ctx.moveTo(sw - 70, yP); ctx.lineTo(sw - 70, ay); ctx.stroke();
        ctx.strokeStyle = "#1e88e5"; ctx.beginPath(); ctx.moveTo(sw - 60, yN); ctx.lineTo(sw - 60, ay); ctx.stroke();
        if (p.defaut) { ctx.strokeStyle = c.alerte; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sw - 70, ay + 10); ctx.lineTo(ax + 10, ay + ah - 10); ctx.stroke(); ctx.setLineDash([]); D().texte(ctx, "défaut", ax + 30, ay + 58, "#b71c1c", 11, "center", true); }
        // Conducteur de protection (vert-jaune) vers la prise de terre
        const tx = ax + aw - 12;
        ctx.lineWidth = 3; ctx.strokeStyle = isFinite(p.RA) ? "#7cb342" : c.bordure; ctx.setLineDash(isFinite(p.RA) ? [] : [5, 5]);
        ctx.beginPath(); ctx.moveTo(tx, ay + ah); ctx.lineTo(tx, sol); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 2;
        if (isFinite(p.RA)) terre(ctx, tx, sol, c);
        D().texte(ctx, isFinite(p.RA) ? "RA " + p.RA + " Ω" : "pas de terre", tx - 6, sol - 12, c.doux, 10, "right");
        // Personne
        if (p.touche) {
          const px = ax - 30, py = sol - 70;
          ctx.strokeStyle = k.Ib > 0.03 ? c.alerte : c.texte; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(px, py - 20, 9, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px, py - 11); ctx.lineTo(px, py + 30); ctx.lineTo(px - 10, sol); ctx.moveTo(px, py + 30); ctx.lineTo(px + 10, sol); ctx.moveTo(px, py); ctx.lineTo(ax + 2, ay + ah - 20); ctx.stroke();
          ctx.lineWidth = 2;
          if (k.Ib > 0) D().texte(ctx, LS.si(k.Ib, "A"), px - 14, py - 40, k.Ib > 0.03 ? c.alerte : c.texte, 12, "center", true);
        }
        ctx.strokeStyle = c.bordure; ctx.beginPath(); ctx.moveTo(10, sol + 12); ctx.lineTo(sw - 10, sol + 12); ctx.stroke();
        // Courant de défaut animé dans la terre
        if (k.Id > 0) { const f = (e.a * 0.8) % 1; ctx.fillStyle = "#ffd54f"; ctx.beginPath(); ctx.arc(tx - f * (tx - 30), sol + 6, 4, 0, 7); ctx.fill(); }
        // Graphe des zones (CEI 60479-1 simplifiée)
        const gx = etroit ? 54 : sw + 50, gy = etroit ? sh + 30 : 40, gw = etroit ? W - 70 : W - gx - 14, gh = etroit ? H - gy - 26 : H - gy - 40;
        const g = grapheLog(ctx, gx, gy, gw, gh, { c, xlog: [-1, 4], ylog: [1, 4], titre: "Effets du courant (CEI 60479-1 simplifiée)", fx: v => v >= 1 ? v + " mA" : "0,1", fy: v => v >= 1000 ? v / 1000 + " s" : v + " ms" });
        const courbe = (pts, coul) => { ctx.strokeStyle = coul; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([tms, ima], i) => { const X = g.X(ima), Y = g.Y(Math.min(1e4, tms)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); };
        ctx.strokeStyle = c.ok; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.X(0.5), gy); ctx.lineTo(g.X(0.5), gy + gh); ctx.stroke();
        courbe(COURBE_B, "#f9a825"); courbe(COURBE_C1, c.alerte);
        D().texte(ctx, "AC-1", g.X(0.15), gy + 14, c.doux, 11, "center", true); D().texte(ctx, "AC-2", g.X(2.5), gy + 14, c.doux, 11, "center", true);
        D().texte(ctx, "AC-3", g.X(70), gy + gh * 0.5, c.doux, 11, "center", true); D().texte(ctx, "AC-4", g.X(2000), gy + 14, c.alerte, 11, "center", true);
        const d = e.dernier;
        if (d && d.Ib > 0) { const tms = isFinite(d.t) ? Math.max(10, d.t * 1000) : 1e4; ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.arc(g.X(Math.max(0.1, Math.min(1e4, d.Ib * 1000))), g.Y(tms), 6, 0, 7); ctx.fill(); }
      },
      mesures(s) {
        const e = s.etat, p = s.p, k = calc(s);
        const UL = LS.tensionLimite(p.Rh);
        return [["Courant de défaut Id", LS.si(k.brut.Id, "A")], ["Tension de contact Uc", LS.nombre(k.brut.Uc, 0) + " V", k.brut.Uc > UL ? "alerte" : ""],
          ["Courant dans le corps", p.touche ? LS.si(k.brut.Ib, "A") : "personne ne touche", k.brut.Ib > 0.03 ? "alerte" : ""],
          ["Coupure", isFinite(k.tcoupure) ? LS.nombre(k.tcoupure * 1000, 0) + " ms (" + (k.tdiff <= k.tdisj ? "différentiel" : "disjoncteur 16 A") + ")" : "rien ne coupe", isFinite(k.tcoupure) ? "" : "alerte"],
          ["Zone d'effets", p.touche && k.brut.Ib > 0 ? k.zone : "—", k.zone === "AC-4" && p.touche ? "alerte" : ""], ["Condition RA × IΔn ≤ " + UL + " V" + (UL === 25 ? " (milieu mouillé)" : ""), p.IDn && isFinite(p.RA) ? LS.nombre(p.RA * p.IDn, 1) + " V" : "—", p.IDn && p.RA * p.IDn > UL ? "alerte" : ""],
          ["État", e.ouvert ? "coupé (" + e.cause + ")" : "sous tension"]];
      },
      explication(s) {
        const p = s.p, k = calc(s);
        let t = "En schéma **TT** (le plus courant chez les particuliers en France et dans de nombreux pays), le neutre est relié à la terre au transformateur (RB), et les carcasses métalliques à la **prise de terre** de la maison (RA) par le conducteur vert-jaune. Lors d'un défaut d'isolement, un courant **Id** part dans la terre : la carcasse monte à **Uc = Id × RA**. Ce courant est trop faible pour faire déclencher le disjoncteur (quelques ampères) : seul le **différentiel**, qui compare le courant qui part par la phase à celui qui revient par le neutre, le détecte.\nLa tension de contact ne doit pas dépasser **50 V** (25 V en milieu mouillé) : avec un différentiel, il faut **RA × IΔn ≤ 50 V**.";
        if (p.touche && k.brut.Ib > 0) t += "\n\nZone **" + k.zone + "** : " + ZONES[k.zone] + ".";
        if (p.touche && !isFinite(p.RA) && k.brut.Ib > 0) t += "\n\n⚠ Sans terre, **tout** le courant de défaut passe par la personne. Le 30 mA reste la dernière protection : il coupe en quelques dizaines de millisecondes, avant la fibrillation.";
        t += "\n\nCe TP ne remplace pas une formation : on n'intervient jamais sur une installation sous tension.";
        return t;
      }
    }, cfg);
    sim.calc = () => calc(sim);
    return sim;
  };
  function terre(ctx, x, y, c) {
    ctx.strokeStyle = c.texte; ctx.lineWidth = 2;
    [14, 9, 4].forEach((w, i) => { ctx.beginPath(); ctx.moveTo(x - w, y + i * 5); ctx.lineTo(x + w, y + i * 5); ctx.stroke(); });
  }

  /* ---------- 3. Chute de tension ---------- */
  const CHARGES = {
    radiateur: { nom: "Radiateur 2 000 W", P: 2000, cos: 1, rend: 1 },
    lampes: { nom: "Projecteurs halogènes 1 000 W", P: 1000, cos: 1, rend: 1 },
    pompe: { nom: "Pompe 1,5 kW (moteur)", P: 1500, cos: 0.8, rend: 0.8, kd: 6, cosd: 0.4 }
  };
  LS.sims.chuteTension = function (el, cfg) {
    function calc(s) {
      const p = s.p;
      const ch = CHARGES[p.charge];
      const I = ch.P / (U_RESEAU * ch.cos * ch.rend);
      const r = LS.chuteTension({ I, longueur: p.longueur, section: p.section, matiere: p.matiere, cosphi: ch.cos });
      const dem = ch.kd ? LS.chuteTension({ I: I * ch.kd, longueur: p.longueur, section: p.section, matiere: p.matiere, cosphi: ch.cosd }) : null;
      return Object.assign(r, { I, ch, dem, R: LS.resistanceLigne(p.longueur, p.section, p.matiere), limite: p.charge === "lampes" ? 3 : 5 });
    }
    const sim = LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "charge", nom: "Appareil au bout de la ligne", choix: Object.entries(CHARGES).map(([k, v]) => [k, v.nom]), defaut: "radiateur" },
        { k: "matiere", nom: "Conducteur", choix: [["cuivre", "cuivre"], ["alu", "aluminium"]], defaut: "cuivre" },
        { k: "section", nom: "Section", choix: [[1.5, "1,5 mm²"], [2.5, "2,5 mm²"], [4, "4 mm²"], [6, "6 mm²"], [10, "10 mm²"], [16, "16 mm²"], [25, "25 mm²"]], nombres: true, defaut: 1.5 },
        { k: "longueur", nom: "Longueur de la ligne (aller)", min: 1, max: 200, pas: 1, defaut: 20, unite: "m" }
      ],
      boutons: [{ k: "demarrer", texte: "▶ Démarrer la pompe", action: s => { if (s.p.charge === "pompe") { s.etat.tDem = s.t; s.etat.demarre = true; } else LS.avis("Choisis d'abord la pompe."); } }],
      init(s) { Object.assign(s.etat, { a: 0, tDem: -10, demarre: false }); },
      avancer(s, dt) { s.etat.a += dt; },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, p = s.p, k = calc(s), enDem = k.dem && s.t - e.tDem < 1.5;
        const r = enDem ? k.dem : k, etroit = W < 640;
        const x0 = 20, x1 = W - (etroit ? 90 : 120), y0 = 70, y1 = 130;
        // Source et ligne aller-retour
        ctx.fillStyle = c.carte; ctx.strokeStyle = c.bordure; ctx.fillRect(x0, y0 - 20, 60, y1 - y0 + 40); ctx.strokeRect(x0, y0 - 20, 60, y1 - y0 + 40);
        D().texte(ctx, U_RESEAU + " V", x0 + 30, (y0 + y1) / 2, c.texte, 13, "center", true);
        const ep = 2 + p.section / 4;
        ctx.lineWidth = ep; ctx.strokeStyle = p.matiere === "alu" ? "#b0bec5" : "#d7894a";
        ctx.beginPath(); ctx.moveTo(x0 + 60, y0); ctx.lineTo(x1, y0); ctx.moveTo(x0 + 60, y1); ctx.lineTo(x1, y1); ctx.stroke(); ctx.lineWidth = 1;
        const nb = 10, v = enDem ? 3 : 1;
        for (let i = 0; i < nb; i++) { const f = ((e.a * 0.15 * v + i / nb) % 1); ctx.fillStyle = "#ffd54f"; ctx.beginPath(); ctx.arc(x0 + 60 + f * (x1 - x0 - 60), y0, 3, 0, 7); ctx.arc(x1 - f * (x1 - x0 - 60), y1, 3, 0, 7); ctx.fill(); }
        D().texte(ctx, p.longueur + " m · " + LS.nombre(p.section, 1) + " mm² " + (p.matiere === "alu" ? "alu" : "cuivre") + (etroit ? "" : " · R ligne = " + LS.nombre(k.R, 3) + " Ω"), (x0 + 60 + x1) / 2, y0 - 16, c.texte, 12, "center", true);
        D().texte(ctx, "− " + LS.nombre(r.dU / 2, 1) + " V", (x0 + x1) / 2 + 30, y0 + 16, c.alerte, 11, "center");
        D().texte(ctx, "− " + LS.nombre(r.dU / 2, 1) + " V", (x0 + x1) / 2 + 30, y1 - 14, c.alerte, 11, "center");
        // Appareil
        const ax = x1, aw = etroit ? 74 : 100;
        ctx.fillStyle = c.noeud; ctx.fillRect(ax, y0 - 20, aw, y1 - y0 + 40);
        D().texte(ctx, k.ch.nom.split(" ")[0], ax + aw / 2, y0, c.texte, 12, "center", true);
        D().texte(ctx, LS.nombre(r.Ucharge, 0) + " V", ax + aw / 2, (y0 + y1) / 2 + 4, r.pourcent > k.limite ? c.alerte : c.texte, 16, "center", true);
        // Effet sur l'appareil
        const u = r.Ucharge / U_RESEAU;
        if (p.charge === "lampes") { const flux = Math.pow(u, 3.4); ctx.fillStyle = `rgba(255,220,80,${0.15 + 0.7 * flux})`; ctx.beginPath(); ctx.arc(ax + aw / 2, y1 + 40, 10 + 18 * flux, 0, 7); ctx.fill(); }
        if (p.charge === "pompe") {
          const ok = !k.dem || k.dem.pourcent <= 15;
          const tourne = e.demarre && (s.t - e.tDem > 1.5 ? ok : true);
          const ang = tourne ? e.a * (enDem ? 4 : 12) : 0;
          ctx.strokeStyle = c.texte; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax + aw / 2, y1 + 44, 16, 0, 7); ctx.moveTo(ax + aw / 2, y1 + 44); ctx.lineTo(ax + aw / 2 + 16 * Math.cos(ang), y1 + 44 + 16 * Math.sin(ang)); ctx.stroke(); ctx.lineWidth = 1;
          if (e.demarre && s.t - e.tDem > 1.5 && !ok) D().texte(ctx, "démarrage difficile", ax + aw / 2, y1 + 74, c.alerte, 11, "center", true);
        }
        // Graphe : chute de tension (%) selon la longueur, pour la section choisie et la suivante
        const gx = 44, gy = y1 + (etroit ? 110 : 100), gw = W - gx - 20, gh = H - gy - 26;
        const serie = (sec, coul) => { const pts = []; for (let L = 0; L <= 200; L += 5) pts.push([L, LS.chuteTension({ I: enDem ? k.I * k.ch.kd : k.I, longueur: L, section: sec, matiere: p.matiere, cosphi: enDem ? k.ch.cosd : k.ch.cos }).pourcent]); return { pts, coul, ep: 2.5 }; };
        const s1 = serie(p.section, c.accentFort), ymax = Math.max(10, Math.min(60, Math.max(r.pourcent, s1.pts[s1.pts.length - 1][1]) * 1.05));
        ctx.save(); ctx.beginPath(); ctx.rect(gx - 40, gy - 24, gw + 60, gh + 50); ctx.clip();
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [0, 200], ylim: [0, ymax], series: [{ pts: [[0, k.limite], [200, k.limite]], coul: c.alerte, ep: 1 }, s1, serie(p.section * 1.6, c.info)],
          points: [{ x: p.longueur, y: r.pourcent, coul: c.accentFort }], titre: etroit ? "Chute (%) : section choisie, × 1,6 (bleu)" : "Chute de tension (%) selon la longueur (m) : section choisie (orange), section × 1,6 (bleu)", xlab: "200 m", ylab: LS.nombre(ymax, 0) + " %" });
        ctx.restore();
      },
      mesures(s) {
        const k = calc(s);
        const l = [["Courant", LS.nombre(k.I, 1) + " A"], ["Chute de tension", LS.nombre(k.dU, 1) + " V (" + LS.nombre(k.pourcent, 1) + " %)", k.pourcent > k.limite ? "alerte" : ""],
          ["Tension à l'appareil", LS.nombre(k.Ucharge, 0) + " V"], ["Pertes dans la ligne", LS.nombre(k.pertes, 0) + " W (" + LS.nombre(100 * k.pertes / k.ch.P, 1) + " %)"],
          ["Limite usuelle", k.limite + " % (" + (k.limite === 3 ? "éclairage" : "autres usages") + ")"]];
        if (k.dem) l.push(["Au démarrage (" + k.ch.kd + " × In, cos φ " + LS.nombre(k.ch.cosd, 1) + ")", LS.nombre(k.dem.dU, 0) + " V (" + LS.nombre(k.dem.pourcent, 1) + " %)", k.dem.pourcent > 15 ? "alerte" : ""]);
        if (s.p.charge === "lampes") l.push(["Lumière des halogènes", LS.nombre(100 * Math.pow(k.Ucharge / U_RESEAU, 3.4), 0) + " %"]);
        return l;
      },
      explication(s) {
        const k = calc(s);
        let t = "Un câble a une résistance **R = ρ × 2L / S** (aller et retour) : le courant y perd une tension **ΔU ≈ R × I × cos φ**, transformée en chaleur. Plus la ligne est **longue** et **fine**, plus la tension baisse au bout. Usages courants : chute ≤ **3 %** pour l'éclairage, ≤ **5 %** pour le reste (installation alimentée par le réseau public). L'aluminium conduit moins bien que le cuivre (ρ ≈ 0,036 contre 0,0225 Ω·mm²/m) : il faut une section environ 1,6 fois plus grande.\nUne lampe à incandescence ou halogène perd beaucoup de lumière quand la tension baisse (flux ≈ U^3,4). Un moteur appelle 5 à 8 fois son courant nominal au démarrage : la chute est alors bien plus forte, son couple (∝ U²) baisse, et il peut ne pas démarrer.";
        if (k.pourcent > k.limite) t += "\n\n⚠ Chute de " + LS.nombre(k.pourcent, 1) + " % : prends une section plus grande, ou rapproche le tableau.";
        return t;
      }
    }, cfg);
    sim.calc = () => calc(sim);
    return sim;
  };
})();
