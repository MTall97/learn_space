/* Simulations de drones multirotors : propulsion et autonomie, régulation PID de l'altitude,
   mixage des moteurs d'un quadricoptère en X. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;
  const RHO = 1.2, G = 9.81;

  /* ---------- Propulsion : poussée, poids, autonomie ---------- */
  // Pmot : puissance maximale d'un moteur de la taille habituelle pour ce cadre (W, ordre de grandeur :
  // 1404 pour 3", 2207 pour 5", 2806 pour 7", 4114 pour 10").
  const CADRES = { 3: { m: 0.11, ct: 0.16, cp: 0.075, Pmot: 200 }, 5: { m: 0.26, ct: 0.17, cp: 0.08, Pmot: 900 }, 7: { m: 0.36, ct: 0.15, cp: 0.065, Pmot: 1000 }, 10: { m: 0.75, ct: 0.13, cp: 0.05, Pmot: 1500 } };
  LS.bilanDrone = function (p) {
    const cad = CADRES[p.helice], Dm = p.helice * 0.0254, V = p.cellules * 3.7;
    const moteur = 0.0008 * p.helice * p.helice + 0.012;                // masse d'un moteur (kg) : ≈ 32 g en 5 pouces, 90 g en 10 pouces
    const Wh = V * p.capacite / 1000, mBat = Wh / 150 + 0.01;           // 150 Wh/kg pour une LiPo
    const m = cad.m + 4 * moteur + mBat + p.charge / 1000;
    let nmax = p.kv * V * 0.8 / 60;                                      // tr/s en charge
    let Pmax = cad.cp * RHO * Math.pow(nmax, 3) * Math.pow(Dm, 5);       // W par moteur
    // Un moteur de cette taille ne peut pas fournir plus que Pmot sans surchauffer : au-delà, l'hélice
    // est trop grosse ou le KV trop élevé, le moteur sature (et en vrai, il grille ou l'ESC coupe).
    const limite = Pmax > cad.Pmot;
    if (limite) { nmax *= Math.cbrt(cad.Pmot / Pmax); Pmax = cad.Pmot; }
    const Tmax = cad.ct * RHO * nmax * nmax * Math.pow(Dm, 4);           // N par moteur
    const Tvol = m * G / 4, nvol = Math.sqrt(Tvol / (cad.ct * RHO * Math.pow(Dm, 4)));
    const Pvol = cad.cp * RHO * Math.pow(nvol, 3) * Math.pow(Dm, 5);
    const rend = 0.78;
    const Ivol = 4 * Pvol / (V * rend), Imax = 4 * Pmax / (V * rend);
    const autonomie = 0.8 * p.capacite / 1000 / Ivol * 60;              // min, on ne vide qu'à 80 %
    return { m, mBat, Tmax, Pmax, twr: 4 * Tmax / (m * G), gazVol: Math.sqrt(Tvol / Tmax), Ivol, Imax, autonomie, Icrete: p.capacite / 1000 * p.crate, limite, Pmot: cad.Pmot };
  };
  LS.sims.propulsion = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "helice", nom: "Taille des hélices (et du cadre)", choix: [[3, "3 pouces (micro)"], [5, "5 pouces (freestyle, course)"], [7, "7 pouces (longue portée)"], [10, "10 pouces (prise de vue)"]], nombres: true, defaut: 5 },
        { k: "kv", nom: "KV des moteurs (tr/min par volt)", min: 400, max: 4000, pas: 50, defaut: 2400 },
        { k: "cellules", nom: "Batterie LiPo", choix: [[3, "3S (11,1 V)"], [4, "4S (14,8 V)"], [6, "6S (22,2 V)"]], nombres: true, defaut: 4 },
        { k: "capacite", nom: "Capacité", min: 300, max: 6000, pas: 50, defaut: 1500, unite: "mAh" },
        { k: "crate", nom: "Taux de décharge maxi (C)", min: 20, max: 120, pas: 5, defaut: 75, unite: "C" },
        { k: "charge", nom: "Charge utile (caméra…)", min: 0, max: 1000, pas: 10, defaut: 120, unite: "g" }
      ],
      init(s) { s.etat.a = 0; },
      avancer(s, dt) { s.etat.a += dt * 20; },
      dessiner(s, ctx, W, H, c) {
        const k = LS.bilanDrone(s.p), cx = W * 0.22, cy = H / 2, bras = 70, rh = Math.min(60, 8 * s.p.helice);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy], i) => {
          const x = cx + dx * bras, y = cy + dy * bras;
          ctx.strokeStyle = c.texte; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = "rgba(120,160,255,.18)"; ctx.beginPath(); ctx.arc(x, y, rh, 0, 7); ctx.fill();
          const a = s.etat.a * (i === 0 || i === 3 ? 1 : -1);
          ctx.strokeStyle = "#455a64"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - rh * Math.cos(a), y - rh * Math.sin(a)); ctx.lineTo(x + rh * Math.cos(a), y + rh * Math.sin(a)); ctx.stroke();
          ctx.fillStyle = "#263238"; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
        });
        ctx.fillStyle = c.accent; ctx.fillRect(cx - 22, cy - 30, 44, 60);
        // Barres poussée / poids
        const bx = W * 0.45, bw = Math.min(260, W * 0.25), by = 50;
        const max = Math.max(4 * k.Tmax, k.m * G) * 1.1;
        const barre = (y, v, coul, nom) => { ctx.fillStyle = coul; ctx.fillRect(bx, y, bw * v / max, 22); D().texte(ctx, nom, bx, y - 9, c.texte, 12, "left", true); };
        barre(by, 4 * k.Tmax, c.ok, "Poussée maximale : " + LS.nombre(4 * k.Tmax / G * 1000, 0) + " g");
        barre(by + 56, k.m * G, c.alerte, "Poids : " + LS.nombre(k.m * 1000, 0) + " g (dont batterie " + LS.nombre(k.mBat * 1000, 0) + " g)");
        // Autonomie selon la capacité de la batterie
        const gx = bx, gy = by + 120, gw = W - gx - 20, gh = H - gy - 30;
        const pts = []; for (let cap = 300; cap <= 8000; cap += 100) { const r = LS.bilanDrone(Object.assign({}, s.p, { capacite: cap })); if (r.twr > 1.05) pts.push([cap, r.autonomie]); }
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [0, 8000], ylim: [0, Math.max(10, ...pts.map(p => p[1])) * 1.15], series: [{ pts, coul: c.info, ep: 2.5 }], points: [{ x: s.p.capacite, y: k.autonomie, coul: c.accentFort }], titre: "Autonomie en vol stationnaire (min) selon la capacité (mAh)", xlab: "mAh" });
      },
      mesures(s) {
        const k = LS.bilanDrone(s.p);
        return [["Rapport poussée / poids", LS.nombre(k.twr, 2), k.twr < 2 ? "alerte" : ""], ["Gaz en vol stationnaire", LS.nombre(100 * k.gazVol, 0) + " %", k.gazVol > 0.7 ? "alerte" : ""],
          ["Courant en stationnaire", LS.nombre(k.Ivol, 1) + " A"], ["Courant à plein gaz", LS.nombre(k.Imax, 0) + " A", k.Imax > k.Icrete ? "alerte" : ""],
          ["Courant maxi de la batterie (C × Ah)", LS.nombre(k.Icrete, 0) + " A"], ["Puissance maxi par moteur", LS.nombre(k.Pmax, 0) + " W", k.limite ? "alerte" : ""], ["Autonomie estimée", LS.nombre(k.autonomie, 1) + " min"]];
      },
      explication(s) {
        const k = LS.bilanDrone(s.p);
        return "Une hélice pousse proportionnellement au **carré** de sa vitesse et à la **puissance 4** de son diamètre ; la puissance absorbée croît comme le **cube** de la vitesse. Un drone doit avoir une **poussée d'au moins 2 fois son poids** pour être pilotable (≥ 4 en voltige). Une plus grosse batterie dure plus longtemps… mais pèse plus : l'autonomie plafonne." +
          (k.twr < 1 ? "\n\n⚠ **Le drone ne peut pas décoller** : poids supérieur à la poussée." : k.limite ? "\n\n⚠ **Moteurs surchargés** : avec ce KV et cette tension, l'hélice demanderait plus de " + LS.nombre(k.Pmot, 0) + " W par moteur, le maximum d'un moteur de cette taille. Le moteur plafonne (il chaufferait jusqu'à griller) : baisse le KV ou la tension." : k.Imax > k.Icrete ? "\n\n⚠ À plein gaz, les moteurs demandent plus de courant que la batterie ne peut en fournir : chute de tension, batterie abîmée." : "");
      }
    }, cfg);
  };

  /* ---------- Régulation PID de l'altitude ---------- */
  LS.sims.pidAltitude = function (el, cfg) {
    const m = 1.0, Tmax = 2.2 * m * G, tau = 0.06;
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "consigne", nom: "Altitude demandée", min: 0, max: 10, pas: 0.5, defaut: 2, unite: "m", dec: 1 },
        { k: "kp", nom: "Kp (proportionnel)", min: 0, max: 20, pas: 0.1, defaut: 2, dec: 1 },
        { k: "ki", nom: "Ki (intégral)", min: 0, max: 10, pas: 0.1, defaut: 0, dec: 1 },
        { k: "kd", nom: "Kd (dérivé)", min: 0, max: 10, pas: 0.1, defaut: 0, dec: 1 },
        { k: "anticipation", nom: "Ajouter la poussée de vol stationnaire (anticipation)", bool: true, defaut: true },
        { k: "usure", nom: "Batterie qui se vide (poussée −25 %)", bool: true, defaut: false },
        { k: "vent", nom: "Rafales de vent", bool: true, defaut: false }
      ],
      boutons: [{ k: "reset", texte: "↺ Poser le drone", action: s => { Object.assign(s.etat, { z: 0, v: 0, T: 0, integ: 0, h: [], tStep: s.t, zmax: 0 }); } }],
      init(s) { Object.assign(s.etat, { z: 0, v: 0, T: 0, integ: 0, h: [], tStep: 0, consAvant: s.p.consigne, zmax: 0 }); },
      avancer(s, dt) {
        const e = s.etat, n = 20, h = dt / n;
        if (s.p.consigne !== e.consAvant) { e.consAvant = s.p.consigne; e.tStep = s.t; e.z0 = e.z; e.zmax = e.z; e.zmin = e.z; }
        for (let q = 0; q < n; q++) {
          const err = s.p.consigne - e.z;
          e.integ = Math.max(-5, Math.min(5, e.integ + err * h));             // anti-saturation de l'intégrale
          let u = s.p.kp * err + s.p.ki * e.integ - s.p.kd * e.v;               // dérivée sur la mesure
          u = u * m + (s.p.anticipation ? m * G : 0);
          const efficacite = s.p.usure ? 0.75 : 1;
          const cmd = Math.max(0, Math.min(Tmax, u));
          e.T += (cmd * efficacite - e.T) * h / tau;                             // retard des moteurs
          let F = e.T - m * G - 0.3 * e.v;
          if (s.p.vent) F += 3 * Math.sin(s.t * 1.7) * Math.sin(s.t * 0.37) * m;
          e.v += F / m * h; e.z += e.v * h;
          if (e.z < 0) { e.z = 0; e.v = Math.max(0, e.v); }
        }
        e.zmax = Math.max(e.zmax === undefined ? e.z : e.zmax, e.z);
        e.h.push([s.t, e.z, s.p.consigne]); while (e.h.length && e.h[0][0] < s.t - 12) e.h.shift();
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, gx = 150, gw = W - gx - 20;
        // Vue de côté
        const hz = H - 60, y = 30 + hz * (1 - e.z / 11), x = 70;
        ctx.strokeStyle = c.bordure; ctx.beginPath(); ctx.moveTo(20, 30 + hz); ctx.lineTo(130, 30 + hz); ctx.stroke();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c.ok; ctx.beginPath(); ctx.moveTo(20, 30 + hz * (1 - s.p.consigne / 11)); ctx.lineTo(130, 30 + hz * (1 - s.p.consigne / 11)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.texte; ctx.fillRect(x - 30, y - 4, 60, 8);
        ctx.fillStyle = "#90a4ae"; ctx.fillRect(x - 40, y - 10, 24, 4); ctx.fillRect(x + 16, y - 10, 24, 4);
        const fl = Math.min(40, e.T / (m * G) * 20);
        D().fleche(ctx, x, y + 6, x, y + 6 + fl, "rgba(120,160,255,.8)", 3);
        D().texte(ctx, LS.nombre(e.z, 2) + " m", x, y - 22, c.texte, 12, "center", true);
        D().graphe(ctx, gx, 30, gw, H - 70, { c, xlim: [s.t - 12, s.t], ylim: [0, 11], series: [{ pts: e.h.map(p => [p[0], p[2]]), coul: c.ok, ep: 1.5 }, { pts: e.h.map(p => [p[0], p[1]]), coul: c.accentFort, ep: 2.5 }],
          titre: "Altitude (orange) et consigne (vert) sur 12 s", ylab: "11 m", xlab: "temps" });
      },
      mesures(s) {
        const e = s.etat, err = s.p.consigne - e.z, saut = s.p.consigne - (e.z0 || 0);
        const dep = Math.abs(saut) > 0.1 ? Math.max(0, (saut > 0 ? (e.zmax - s.p.consigne) : 0) / Math.abs(saut)) : 0;
        return [["Altitude", LS.nombre(e.z, 2) + " m"], ["Erreur", LS.nombre(err, 2) + " m", Math.abs(err) > 0.2 ? "alerte" : ""], ["Dépassement", LS.nombre(100 * dep, 0) + " %", dep > 0.1 ? "alerte" : ""],
          ["Poussée / poids", LS.nombre(e.T / (m * G), 2)], ["Temps depuis la consigne", LS.nombre(s.t - e.tStep, 1) + " s"]];
      },
      explication() {
        return "Le contrôleur de vol compare l'altitude mesurée à la consigne et corrige la poussée avec un **PID** :\n- **P** (proportionnel) : corrige d'autant plus que l'erreur est grande. Trop fort : ça oscille.\n- **I** (intégral) : accumule l'erreur passée ; il annule l'**erreur statique** (batterie faible, charge inconnue). Trop fort : dépassements lents.\n- **D** (dérivé) : freine selon la vitesse ; il **amortit** les oscillations.\nLes mêmes boucles, beaucoup plus rapides, tiennent l'**assiette** (roulis, tangage, lacet).";
      }
    }, cfg);
  };

  /* ---------- Mixage des moteurs (quadricoptère en X) ---------- */
  // Ordre : avant gauche, avant droit, arrière gauche, arrière droit. Sens de rotation vu de dessus.
  const MOT = [{ n: "AvG", x: -1, y: -1, horaire: true }, { n: "AvD", x: 1, y: -1, horaire: false }, { n: "ArG", x: -1, y: 1, horaire: false }, { n: "ArD", x: 1, y: 1, horaire: true }];
  LS.mixageQuad = function (gaz, roulis, tangage, lacet, panne) {
    return MOT.map((mo, i) => {
      if (panne === i) return 0;
      // Roulis à droite : moteurs de gauche accélèrent ; tangage avant : moteurs arrière accélèrent ;
      // lacet à droite (horaire) : on accélère les hélices qui tournent dans le sens antihoraire.
      const v = gaz + 0.25 * (-mo.x * roulis + mo.y * tangage + (mo.horaire ? -1 : 1) * lacet);
      return Math.max(0, Math.min(1, v));
    });
  };
  /* Sens de rotation du châssis quand un moteur tombe en panne (+1 = horaire vu de dessus). Une hélice
     horaire exerce sur le châssis un couple de réaction antihoraire : sans elle, il reste celui des
     hélices antihoraires, qui fait tourner le châssis en sens horaire. */
  LS.sensRotationPanne = i => MOT[i].horaire ? 1 : -1;
  LS.sims.mixage = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 440,
      controles: [
        { k: "gaz", nom: "Gaz (poussée totale)", min: 0, max: 100, pas: 1, defaut: 50, unite: "%" },
        { k: "roulis", nom: "Roulis (gauche ↔ droite)", min: -100, max: 100, pas: 5, defaut: 0, unite: "%" },
        { k: "tangage", nom: "Tangage (arrière ↔ avant)", min: -100, max: 100, pas: 5, defaut: 0, unite: "%" },
        { k: "lacet", nom: "Lacet (rotation gauche ↔ droite)", min: -100, max: 100, pas: 5, defaut: 0, unite: "%" },
        { k: "panne", nom: "Panne d'un moteur", choix: [[-1, "aucune"], [0, "avant gauche"], [1, "avant droit"], [2, "arrière gauche"], [3, "arrière droit"]], nombres: true, defaut: -1 }
      ],
      boutons: [{ k: "centre", texte: "⌖ Recentrer", action: s => { Object.assign(s.etat, { x: 0, y: 0, z: 5, cap: 0, vx: 0, vy: 0, vz: 0, trace: [] }); } }],
      init(s) { Object.assign(s.etat, { x: 0, y: 0, z: 5, cap: 0, vx: 0, vy: 0, vz: 0, trace: [], a: 0 }); },
      avancer(s, dt) {
        const e = s.etat, p = s.p;
        const m = LS.mixageQuad(p.gaz / 100, p.roulis / 100, p.tangage / 100, p.lacet / 100, p.panne);
        e.m = m;
        const poussee = m.reduce((a, b) => a + b, 0) / 4;            // 0,5 = vol stationnaire
        const rollT = (m[0] + m[2] - m[1] - m[3]) / 2, pitchT = (m[2] + m[3] - m[0] - m[1]) / 2, yawT = (m[1] + m[2] - m[0] - m[3]) / 2;
        // Inclinaison proportionnelle aux écarts de poussée (assiette stabilisée par le contrôleur).
        e.inclX = Math.max(-0.6, Math.min(0.6, rollT * 1.2)); e.inclY = Math.max(-0.6, Math.min(0.6, pitchT * 1.2));
        e.cap += yawT * 2.5 * dt;
        const ax = G * Math.tan(e.inclX), ay = G * Math.tan(e.inclY);
        const c = Math.cos(e.cap), sn = Math.sin(e.cap);
        // Repère du drone → repère du sol (x vers la droite, y vers le haut de la carte ; cap compté dans le sens horaire).
        e.vx += (ax * c + ay * sn - 0.5 * e.vx) * dt; e.vy += (-ax * sn + ay * c - 0.5 * e.vy) * dt;
        e.vz += ((poussee / 0.5 - 1) * G - 0.8 * e.vz) * dt;
        // Panne : les hélices restantes ne s'équilibrent plus ; leur couple de réaction fait tourner le
        // châssis (même sens que le mixage : perdre un moteur horaire fait tourner le drone en horaire),
        // et le contrôleur sature, d'où une rotation rapide.
        if (p.panne >= 0) { e.cap += 6 * dt * LS.sensRotationPanne(p.panne); e.vz -= 3 * dt; }
        e.x += e.vx * dt; e.y += e.vy * dt; e.z = Math.max(0, e.z + e.vz * dt); if (e.z === 0) e.vz = Math.max(0, e.vz);
        e.trace.push([e.x, e.y]); if (e.trace.length > 400) e.trace.shift();
        e.a += dt * 25;
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, m = e.m || [0.5, 0.5, 0.5, 0.5];
        // Vue de dessus du drone (repère du drone)
        const cx = W * 0.22, cy = H * 0.45, bras = 70;
        MOT.forEach((mo, i) => {
          const x = cx + mo.x * bras, y = cy + mo.y * bras;
          ctx.strokeStyle = c.texte; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = `rgba(255,${Math.round(200 - 150 * m[i])},0,${0.15 + 0.6 * m[i]})`; ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill();
          const a = e.a * m[i] * (mo.horaire ? 1 : -1);
          ctx.strokeStyle = "#37474f"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 30 * Math.cos(a), y - 30 * Math.sin(a)); ctx.lineTo(x + 30 * Math.cos(a), y + 30 * Math.sin(a)); ctx.stroke();
          D().texte(ctx, Math.round(m[i] * 100) + " %", x, y + 46, c.texte, 12, "center", true);
          D().texte(ctx, mo.horaire ? "↻" : "↺", x + 26, y - 30, c.doux, 16, "center", true);
        });
        ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx - 16, cy + 20); ctx.lineTo(cx + 16, cy + 20); ctx.closePath(); ctx.fill();
        D().texte(ctx, "AVANT", cx, cy - bras - 46, c.texte, 12, "center", true);
        // Carte vue du ciel
        const mx = W * 0.48, mw = W - mx - 20, mh = H - 60, sc = 6;
        ctx.strokeStyle = c.bordure; ctx.strokeRect(mx, 30, mw, mh);
        D().texte(ctx, "Vue du ciel (trajectoire) · altitude " + LS.nombre(e.z, 1) + " m", mx, 18, c.texte, 12, "left", true);
        const ox = mx + mw / 2, oy = 30 + mh / 2;
        ctx.strokeStyle = c.info; ctx.lineWidth = 1.5; ctx.beginPath();
        e.trace.forEach(([x, y], i) => { const px = ox + x * sc, py = oy - y * sc; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.stroke();
        const px = ox + e.x * sc, py = oy - e.y * sc;
        ctx.save(); ctx.translate(px, py); ctx.rotate(e.cap); const t = 10 + e.z;
        ctx.fillStyle = c.accentFort; ctx.beginPath(); ctx.moveTo(0, -t); ctx.lineTo(-t * 0.6, t * 0.7); ctx.lineTo(t * 0.6, t * 0.7); ctx.closePath(); ctx.fill(); ctx.restore();
      },
      mesures(s) {
        const e = s.etat;
        return [["Altitude", LS.nombre(e.z, 1) + " m"], ["Vitesse verticale", LS.nombre(e.vz, 1) + " m/s"], ["Cap", LS.nombre(((e.cap * 180 / Math.PI) % 360 + 360) % 360, 0) + "°"],
          ["Inclinaison roulis / tangage", LS.nombre((e.inclX || 0) * 57.3, 0) + "° / " + LS.nombre((e.inclY || 0) * 57.3, 0) + "°"]];
      },
      explication(s) {
        return "Un quadricoptère n'a aucune gouverne : il se pilote **uniquement** en changeant la vitesse de ses 4 moteurs. Les hélices tournent deux à deux en sens opposés pour annuler le couple de réaction.\n- **Gaz** : les 4 ensemble → monter / descendre.\n- **Roulis / tangage** : un côté plus vite que l'autre → le drone s'incline et part de ce côté.\n- **Lacet** : on accélère les hélices d'un même sens de rotation ; leur couple de réaction fait tourner le drone dans l'autre sens." +
          (s.p.panne >= 0 ? "\n\n⚠ **Moteur en panne** : le couple de réaction n'est plus équilibré, le drone tourne sur lui-même et ne peut plus tenir son cap. Un quadricoptère ne survit pas à une panne moteur (un hexacoptère, si)." : "");
      }
    }, cfg);
  };
})();
