/* Simulations des transmissions : engrenages, chaîne de moto, embrayage, boîte de vitesses,
   différentiel. Les vitesses de rotation affichées sont ralenties pour l'œil, les calculs non. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;
  const RPM = w => w * 60 / (2 * Math.PI), RAD = n => n * 2 * Math.PI / 60;

  /* ---------- Engrenages ---------- */
  LS.sims.engrenages = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 380,
      controles: [
        { k: "z1", nom: "Dents du pignon menant Z1", min: 8, max: 60, pas: 1, defaut: 12 },
        { k: "z2", nom: "Dents de la roue menée Z2", min: 8, max: 80, pas: 1, defaut: 36 },
        { k: "n1", nom: "Vitesse d'entrée N1", min: 0, max: 3000, pas: 10, defaut: 600, unite: "tr/min" },
        { k: "c1", nom: "Couple d'entrée C1", min: 0, max: 200, pas: 1, defaut: 20, unite: "N·m" },
        { k: "inter", nom: "Ajouter une roue intermédiaire", bool: true, defaut: false }
      ],
      init(s) { s.etat.a = 0; },
      avancer(s, dt) { s.etat.a += RAD(s.p.n1) * dt * 0.05; },
      dessiner(s, ctx, W, H, c) {
        const m = Math.min(5, (W * 0.8) / (s.p.z1 + s.p.z2 + (s.p.inter ? 40 : 0)), (H - 60) / Math.max(s.p.z1, s.p.z2));
        const r1 = m * s.p.z1 / 2, r2 = m * s.p.z2 / 2, ri = m * 20 / 2;
        const y = H / 2 + 10, a1 = s.etat.a;
        let x1 = W / 2 - (r1 + r2 + (s.p.inter ? 2 * ri : 0)) / 2;
        D().engrenage(ctx, x1, y, r1, s.p.z1, a1, "#f2a541", "#7a4b10");
        let xs = x1 + r1, aPrec = a1, zPrec = s.p.z1, sens = -1;
        if (s.p.inter) {
          const xi = xs + ri, ai = -aPrec * zPrec / 20 + Math.PI / 20;
          D().engrenage(ctx, xi, y, ri, 20, ai, "#b0bec5", "#455a64");
          xs = xi + ri; aPrec = ai; zPrec = 20; sens = 1;
          D().texte(ctx, "roue intermédiaire (20 dents)", xi, y + ri + 18, c.doux, 11, "center");
        }
        const x2 = xs + r2, a2 = -aPrec * zPrec / s.p.z2 + Math.PI / s.p.z2;
        D().engrenage(ctx, x2, y, r2, s.p.z2, a2, "#6fbf73", "#255d27");
        D().texte(ctx, "menant (moteur)", x1, y - r1 - 16, c.texte, 12, "center", true);
        D().texte(ctx, "mené", x2, y - r2 - 16, c.texte, 12, "center", true);
        const fl = (x, r, sg) => { ctx.strokeStyle = c.accentFort; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r + 10, -2.2, -0.9, sg < 0); ctx.stroke(); };
        fl(x1, r1, 1); fl(x2, r2, sens);
        D().texte(ctx, sens < 0 ? "sens inversé" : "même sens", x2, y + r2 + 18, c.doux, 11, "center");
      },
      mesures(s) {
        const k = s.p.z1 / s.p.z2, eta = s.p.inter ? 0.98 * 0.98 : 0.98;
        return [["Rapport de transmission k = Z1/Z2", LS.nombre(k, 3)], ["Vitesse de sortie N2", LS.nombre(s.p.n1 * k, 0) + " tr/min"],
          ["Couple de sortie C2", LS.nombre(s.p.c1 / k * eta, 1) + " N·m"], ["Puissance d'entrée", LS.nombre(s.p.c1 * RAD(s.p.n1), 0) + " W"],
          ["Puissance de sortie (rendement " + Math.round(eta * 100) + " %)", LS.nombre(s.p.c1 * RAD(s.p.n1) * eta, 0) + " W"]];
      },
      explication(s) {
        return s.p.z2 > s.p.z1 ? "**Réducteur** : la grande roue tourne moins vite, mais avec plus de couple. La puissance (C × ω) se conserve, aux pertes près (≈ 2 % par engrènement)." :
          s.p.z2 < s.p.z1 ? "**Multiplicateur** : la petite roue menée tourne plus vite mais avec moins de couple (comme le grand plateau d'un vélo)." : "Rapport 1 : même vitesse, même couple, seul le sens change.";
      }
    }, cfg);
  };

  /* ---------- Transmission secondaire d'une moto ---------- */
  const BOITE_MOTO = [2.75, 1.94, 1.55, 1.32, 1.17, 1.05], PRIMAIRE_MOTO = 1.85;
  LS.sims.chaineMoto = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 360,
      controles: [
        { k: "regime", nom: "Régime moteur", min: 1500, max: 11000, pas: 100, defaut: 5000, unite: "tr/min" },
        { k: "rapport", nom: "Rapport engagé", choix: [[1, "1re"], [2, "2e"], [3, "3e"], [4, "4e"], [5, "5e"], [6, "6e"]], nombres: true, defaut: 3 },
        { k: "zp", nom: "Pignon de sortie de boîte", min: 13, max: 17, pas: 1, defaut: 15, unite: "dents" },
        { k: "zc", nom: "Couronne de roue", min: 36, max: 52, pas: 1, defaut: 45, unite: "dents" },
        { k: "diam", nom: "Diamètre de la roue (pneu)", min: 560, max: 680, pas: 5, defaut: 625, unite: "mm" }
      ],
      init(s) { s.etat.a = 0; s.etat.ch = 0; },
      calc(s) {
        const nb = s.p.regime / PRIMAIRE_MOTO / BOITE_MOTO[s.p.rapport - 1];
        const nr = nb * s.p.zp / s.p.zc;
        const v = nr / 60 * Math.PI * s.p.diam / 1000 * 3.6;
        return { nb, nr, v };
      },
      avancer(s, dt) { const k = this.calc(s); s.etat.a += RAD(k.nb) * dt * 0.02; s.etat.ch += RAD(k.nb) * dt * 0.02; },
      dessiner(s, ctx, W, H, c) {
        const m = 3.2, rp = m * s.p.zp / 2, rc = m * s.p.zc / 2;
        const yp = H / 2, xp = W * 0.25, xc = Math.min(W - rc - 120, xp + 260), yc = H / 2;
        // Roue arrière
        const rr = Math.min(H / 2 - 20, rc * 1.9);
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(xc, yc, rr, 0, 7); ctx.fill();
        ctx.fillStyle = c.fond; ctx.beginPath(); ctx.arc(xc, yc, rr - 14, 0, 7); ctx.fill();
        // Chaîne : brins supérieur et inférieur
        const ang = Math.asin((rc - rp) / (xc - xp));
        const t1 = [xp - rp * Math.sin(ang), yp - rp * Math.cos(ang)], t2 = [xc - rc * Math.sin(ang), yc - rc * Math.cos(ang)];
        const b1 = [xp - rp * Math.sin(ang), yp + rp * Math.cos(ang)], b2 = [xc - rc * Math.sin(ang), yc + rc * Math.cos(ang)];
        ctx.strokeStyle = "#555"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(...t1); ctx.lineTo(...t2); ctx.moveTo(...b1); ctx.lineTo(...b2); ctx.stroke();
        const pas = 12.7 * m / 4, dec = (s.etat.ch * rp) % (2 * pas);
        ctx.fillStyle = "#bbb";
        for (let d = -dec; d < Math.hypot(t2[0] - t1[0], t2[1] - t1[1]); d += 2 * pas) {
          const k = d / Math.hypot(t2[0] - t1[0], t2[1] - t1[1]);
          if (k < 0) continue;
          ctx.fillRect(t1[0] + (t2[0] - t1[0]) * k - 2, t1[1] + (t2[1] - t1[1]) * k - 2, 5, 5);
          ctx.fillRect(b2[0] + (b1[0] - b2[0]) * k - 2, b2[1] + (b1[1] - b2[1]) * k - 2, 5, 5);
        }
        D().engrenage(ctx, xp, yp, rp, s.p.zp, s.etat.a, "#9e9e9e", "#333");
        D().engrenage(ctx, xc, yc, rc, s.p.zc, s.etat.a * s.p.zp / s.p.zc, "#c0c0c0", "#333");
        D().texte(ctx, "pignon " + s.p.zp + " dents", xp, yp + rp + 40, c.texte, 12, "center", true);
        D().texte(ctx, "couronne " + s.p.zc + " dents", xc, yc + rr + 12 > H - 6 ? H - 8 : yc + rr + 12, c.texte, 12, "center", true);
        D().texte(ctx, "moteur → primaire (÷" + PRIMAIRE_MOTO + ") → boîte (÷" + BOITE_MOTO[s.p.rapport - 1] + ") → pignon → chaîne → couronne → roue", 10, 16, c.doux, 12);
      },
      mesures(s) {
        const k = this.calc(s);
        return [["Rapport secondaire Zc/Zp", LS.nombre(s.p.zc / s.p.zp, 2)], ["Rotation du pignon", LS.nombre(k.nb, 0) + " tr/min"], ["Rotation de la roue", LS.nombre(k.nr, 0) + " tr/min"],
          ["Vitesse de la moto", LS.nombre(k.v, 0) + " km/h"], ["Démultiplication totale", LS.nombre(s.p.regime / k.nr, 2)]];
      },
      explication() { return "Un **pignon plus petit** ou une **couronne plus grande** « raccourcissent » la transmission : plus de couple à la roue (accélérations, tout-terrain), mais moins de vitesse maxi. C'est le réglage classique des motards (kit chaîne = pignon + couronne + chaîne, à changer ensemble)."; }
    }, cfg);
  };
  LS.sims.chaineMoto.__calc = true;

  /* ---------- Embrayage ---------- */
  LS.sims.embrayage = function (el, cfg) {
    const Je = 0.15, Jv = 0.5;   // inerties moteur et véhicule ramenée à l'embrayage (1re), kg·m²
    return LS.simAnimee(el, {
      hauteur: 380,
      controles: [
        { k: "pedale", nom: "Pédale d'embrayage relâchée à", min: 0, max: 100, pas: 1, defaut: 0, unite: "%", aide: "0 % = pédale enfoncée (débrayé), 100 % = relâchée (embrayé)" },
        { k: "gaz", nom: "Accélérateur", min: 0, max: 100, pas: 1, defaut: 0, unite: "%" },
        { k: "pente", nom: "Pente de la route", min: 0, max: 20, pas: 1, defaut: 0, unite: "%" }
      ],
      boutons: [{ k: "redemarrer", texte: "🔑 Redémarrer le moteur", action: s => { s.etat.we = RAD(800); s.etat.cale = false; } },
        { k: "arret", texte: "⏹ Arrêter la voiture", action: s => { s.etat.wv = 0; s.p.pedale = 0; } }],
      init(s) { s.etat.we = RAD(800); s.etat.wv = 0; s.etat.chaleur = 0; s.etat.cale = false; s.etat.colle = false; s.etat.histo = []; },
      avancer(s, dt) {
        const e = s.etat, n = 20, h = dt / n;
        for (let k = 0; k < n; k++) {
          // Moteur : couple selon l'accélérateur + régulation du ralenti (calculateur) ; s'arrête sous 400 tr/min.
          const N = RPM(e.we);
          let Cm = 0;
          if (!e.cale) {
            const Cmax = 140 * Math.max(0, 1 - Math.pow((N - 3500) / 4000, 2));
            Cm = s.p.gaz / 100 * Cmax;
            if (N < 900) Cm += Math.min(45, (900 - N) * 0.25);   // ralenti régulé par le calculateur, couple limité
            Cm -= 8 + 0.004 * N;                                 // frottements internes
            if (N < 400) { e.cale = true; }
          } else Cm = -20 * Math.sign(e.we);
          // Véhicule : 1 100 kg, roue 0,30 m, démultiplication 1re × pont = 14
          const i = 14, Cr = (0.015 * 1100 * 9.81 * 0.3 + 1100 * 9.81 * Math.sin(Math.atan(s.p.pente / 100)) * 0.3) / i;
          const Cemb = 220 * Math.pow(s.p.pedale / 100, 2);    // couple transmissible (force des ressorts)
          const dw = e.we - e.wv;
          let Ct;
          if (e.colle) {
            // Embrayage collé : un seul bloc ; il décolle si le couple demandé dépasse Cemb.
            const acc = (Cm - Cr) / (Je + Jv);
            Ct = Cm - Je * acc;
            if (Math.abs(Ct) > Cemb) e.colle = false;
          }
          if (!e.colle) {
            Ct = Math.abs(dw) > 0.5 ? Cemb * Math.sign(dw) : Math.max(-Cemb, Math.min(Cemb, Cm));
            e.chaleur += Math.abs(Ct * dw) * h;                  // énergie dissipée par patinage (J)
            if (Math.abs(dw) < 1 && Cemb > 0) e.colle = true;
          }
          e.we += (Cm - Ct) / Je * h;
          let wv = e.wv + (Ct - Cr) / Jv * h;
          if (e.wv >= 0 && wv < 0 && Ct < Cr && !s.p.pente) wv = 0;
          e.wv = wv;
          if (e.colle) e.wv = e.we;
          if (e.we < 0 && e.cale) e.we = 0;
        }
        e.histo.push([s.t, RPM(e.we), RPM(e.wv)]);
        while (e.histo.length && e.histo[0][0] < s.t - 10) e.histo.shift();
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, ecart = 18 * (1 - s.p.pedale / 100);
        const x = 40, y = 40, hd = 120;
        // Volant moteur, disque, plateau de pression
        const rot = t => (t * 0.002) % (2 * Math.PI);
        ctx.fillStyle = "#777"; ctx.fillRect(x, y, 24, hd);
        ctx.fillStyle = e.chaleur > 20000 ? "#c62828" : "#c49a6c"; ctx.fillRect(x + 28 + ecart / 2, y + 10, 10, hd - 20);
        ctx.fillStyle = "#999"; ctx.fillRect(x + 42 + ecart, y + 5, 16, hd - 10);
        ctx.fillStyle = c.texte; ctx.fillRect(x - 30, y + hd / 2 - 4, 30, 8); ctx.fillRect(x + 38 + ecart / 2, y + hd / 2 - 4, 120, 8);
        D().texte(ctx, "volant moteur", x + 12, y - 24, c.texte, 11, "center");
        D().texte(ctx, "disque", x + 33, y + hd + 12, c.texte, 11, "center");
        D().texte(ctx, "plateau + ressorts", x + 52, y - 10, c.texte, 11, "left");
        D().texte(ctx, e.cale ? "" : e.colle ? "EMBRAYÉ (collé)" : s.p.pedale < 5 ? "DÉBRAYÉ" : "PATINAGE", x + 100, y + hd + 30, e.colle ? c.ok : s.p.pedale < 5 ? c.doux : c.alerte, 14, "center", true);
        // Compte-tours
        const cpt = (cx, cy, N, nom) => {
          ctx.strokeStyle = c.bordure; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
          ctx.strokeStyle = N > 6000 ? c.alerte : c.accent; ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, N / 7000)); ctx.stroke();
          D().texte(ctx, Math.round(N), cx, cy, c.texte, 16, "center", true); D().texte(ctx, nom, cx, cy + 22, c.doux, 10, "center");
        };
        cpt(x + 270, y + 55, RPM(e.we), "tr/min moteur"); cpt(x + 380, y + 55, RPM(e.wv), "tr/min boîte");
        if (e.cale) D().texte(ctx, "MOTEUR CALÉ", x + 270, y + 120, c.alerte, 14, "center", true);
        // Historique
        const g = D().graphe(ctx, 40, 230, W - 60, H - 250, { c, xlim: [s.t - 10, s.t], ylim: [0, 6000], titre: "Régimes (orange : moteur, bleu : arbre de boîte) sur 10 s",
          series: [{ pts: e.histo.map(p => [p[0], p[1]]), coul: c.accentFort }, { pts: e.histo.map(p => [p[0], p[2]]), coul: c.info }] });
        void g;
      },
      mesures(s) {
        const e = s.etat, v = e.wv / 14 * 0.3 * 3.6;
        return [["Vitesse de la voiture (1re)", LS.nombre(Math.max(0, v), 1) + " km/h"], ["Couple transmissible", LS.nombre(220 * Math.pow(s.p.pedale / 100, 2), 0) + " N·m"],
          ["Énergie perdue en patinage", LS.nombre(e.chaleur / 1000, 1) + " kJ", e.chaleur > 20000 ? "alerte" : ""], ["État", e.cale ? "calé" : e.colle ? "embrayé" : "débrayé / patine"]];
      },
      explication(s) {
        return "L'**embrayage** relie le moteur (qui tourne toujours, au moins au ralenti) à la boîte (immobile à l'arrêt). Quand on relâche la pédale, les ressorts serrent le **disque** entre le **volant moteur** et le **plateau** : le frottement transmet le couple. Entre les deux, il **patine** : les vitesses s'égalisent et l'énergie perdue chauffe le disque (usure). Trop vite sans gaz : le moteur **cale**.";
      }
    }, cfg);
  };

  /* ---------- Boîte de vitesses ---------- */
  const RAPPORTS = { R: -3.6, 1: 3.55, 2: 1.95, 3: 1.28, 4: 0.97, 5: 0.76 }, PONT = 4.06, RAYON = 0.30;
  LS.RAPPORTS_BOITE = RAPPORTS;
  LS.sims.boite = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 430,
      controles: [
        { k: "rapport", nom: "Rapport engagé", choix: [["N", "Point mort"], ["1", "1re"], ["2", "2e"], ["3", "3e"], ["4", "4e"], ["5", "5e"], ["R", "Marche arrière"]], defaut: "N" },
        { k: "regime", nom: "Régime moteur", min: 800, max: 6500, pas: 50, defaut: 2500, unite: "tr/min" },
        { k: "couple", nom: "Couple moteur", min: 0, max: 200, pas: 5, defaut: 130, unite: "N·m" }
      ],
      init(s) { s.etat.a = 0; },
      avancer(s, dt) { s.etat.a += RAD(s.p.regime) * dt * 0.01; },
      calc(s) {
        const r = RAPPORTS[s.p.rapport];
        if (!r) return { ns: 0, v: 0, Croue: 0 };
        const ns = s.p.regime / r, nr = ns / PONT;
        return { r, ns, nr, v: nr / 60 * 2 * Math.PI * RAYON * 3.6, Croue: s.p.couple * r * PONT * 0.93, F: s.p.couple * r * PONT * 0.93 / RAYON };
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s);
        const x0 = 30, x1 = Math.min(W - 30, 560), yP = 90, yS = 200;
        D().texte(ctx, "arbre primaire (moteur)", x0, yP - 58, c.texte, 12, "left", true);
        D().texte(ctx, "arbre secondaire (vers le pont)", x0, yS + 70, c.texte, 12, "left", true);
        ctx.fillStyle = c.texte; ctx.fillRect(x0, yP - 3, x1 - x0, 6); ctx.fillRect(x0 + 40, yS - 3, x1 - x0 - 40, 6);
        const paires = ["1", "2", "3", "4", "5", "R"];
        const pas = (x1 - x0 - 60) / paires.length;
        paires.forEach((p, i) => {
          const x = x0 + 60 + i * pas, r = Math.abs(RAPPORTS[p]);
          const zp = 40 / (1 + r), zs = 40 - zp;     // tailles relatives (entraxe constant)
          const actif = s.p.rapport === p;
          const coul = actif ? c.accent : (c.sombre ? "#8a6a60" : "#d7c4b3");
          const hp = zp * 2.2, hs = zs * 2.2;
          ctx.fillStyle = coul; ctx.fillRect(x - 9, yP - hp / 2, 18, hp); ctx.fillRect(x - 9, yS - hs / 2, 18, hs);
          if (p === "R") { ctx.fillStyle = "#90a4ae"; ctx.fillRect(x + 12, (yP + yS) / 2 - 12, 14, 24); D().texte(ctx, "inverseur", x + 19, (yP + yS) / 2 + 22, c.doux, 9, "center"); }
          D().texte(ctx, p === "R" ? "MA" : p + (p === "1" ? "re" : "e"), x, yS + 46, actif ? c.accentFort : c.doux, 12, "center", true);
          if (actif) { ctx.strokeStyle = c.ok; ctx.lineWidth = 3; ctx.strokeRect(x - 13, yS - hs / 2 - 4, 26, hs + 8); D().texte(ctx, "crabot", x, yS - hs / 2 - 12, c.ok, 10, "center", true); }
        });
        // Diagramme en dents de scie : vitesse en fonction du régime pour chaque rapport
        const gx = Math.min(W - 30, 560) + 20, gw = W - gx - 20;
        if (gw > 160) {
          const series = ["1", "2", "3", "4", "5"].map(p => ({ pts: [[0, 0], [6500, 6500 / RAPPORTS[p] / PONT / 60 * 2 * Math.PI * RAYON * 3.6]], coul: s.p.rapport === p ? c.accentFort : c.bordure, ep: s.p.rapport === p ? 3 : 1.5 }));
          D().graphe(ctx, gx, 40, gw, H - 90, { c, xlim: [0, 6500], ylim: [0, 220], series, points: k.r > 0 ? [{ x: s.p.regime, y: k.v, coul: c.texte }] : [], titre: "Vitesse (km/h) selon le régime, par rapport", xlab: "tr/min" });
        }
        D().texte(ctx, k.r ? (k.r < 0 ? "Marche arrière : la roue intermédiaire inverse le sens" : "Rapport " + s.p.rapport + " : démultiplication " + LS.nombre(k.r, 2)) : "Point mort : aucun pignon n'est solidaire de son arbre", x0, H - 16, c.texte, 13, "left", true);
      },
      mesures(s) {
        const k = this.calc(s);
        return [["Rotation sortie de boîte", LS.nombre(k.ns || 0, 0) + " tr/min"], ["Vitesse de la voiture", LS.nombre(k.v || 0, 0) + " km/h"],
          ["Couple aux roues", LS.nombre(k.Croue || 0, 0) + " N·m"], ["Force de traction", LS.nombre((k.F || 0) / 1000, 2) + " kN"]];
      },
      explication() { return "Le moteur ne donne son couple que dans une plage de régimes (≈ 1 500 à 6 000 tr/min). La **boîte de vitesses** adapte la démultiplication : en **1re**, beaucoup de couple aux roues pour démarrer ; en **5e**, peu de couple mais une grande vitesse à régime modéré. Les pignons sont toujours en prise ; le **crabot** (avec son **synchroniseur**) rend l'un d'eux solidaire de l'arbre."; }
    }, cfg);
  };

  /* ---------- Différentiel ---------- */
  LS.sims.differentiel = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "v", nom: "Vitesse de la voiture", min: 0, max: 90, pas: 1, defaut: 30, unite: "km/h" },
        { k: "rayon", nom: "Rayon du virage (0 = tout droit)", min: 0, max: 60, pas: 1, defaut: 10, unite: "m" },
        { k: "bloque", nom: "Différentiel bloqué", bool: true, defaut: false },
        { k: "glace", nom: "Roue droite sur la glace (démarrage)", bool: true, defaut: false }
      ],
      init(s) { s.etat.a = [0, 0, 0]; },
      calc(s) {
        const e = 1.5, rr = 0.3, v = s.p.v / 3.6;
        let vg = v, vd = v, glisse = 0;
        if (s.p.rayon > 0) { const R = s.p.rayon; vg = v * (R + e / 2) / R; vd = v * (R - e / 2) / R; }   // virage à droite
        if (s.p.bloque && s.p.rayon > 0) { glisse = Math.abs(vg - vd) / 2; vg = vd = v; }
        if (s.p.glace && !s.p.bloque) { vg = 0; vd = 2 * Math.max(v, 3); }
        if (s.p.glace && s.p.bloque) { vg = vd = Math.max(v, 3); }
        const ng = vg / rr * 60 / (2 * Math.PI), nd = vd / rr * 60 / (2 * Math.PI);
        return { vg, vd, ng, nd, nc: (ng + nd) / 2, glisse };
      },
      avancer(s, dt) { const k = this.calc(s); s.etat.a[0] += RAD(k.ng) * dt * 0.1; s.etat.a[1] += RAD(k.nd) * dt * 0.1; s.etat.a[2] += RAD(k.nd - k.ng) / 2 * dt * 0.1; },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s);
        const cx = W * 0.32, cy = H * 0.55;
        // Trajectoire du virage
        if (s.p.rayon > 0) {
          const R = s.p.rayon * 8;
          ctx.strokeStyle = c.bordure; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(cx + R, cy, R - 24, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx + R, cy, R + 24, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke(); ctx.setLineDash([]);
        }
        // Essieu et roues (vue de dessus)
        ctx.fillStyle = c.texte; ctx.fillRect(cx - 70, cy - 3, 140, 6);
        const roue = (x, n, nom, glace) => {
          ctx.fillStyle = glace ? "#b3e5fc" : "#222"; ctx.fillRect(x - 10, cy - 34, 20, 68);
          const ph = (n * 0.02 * s.t * 6) % 12;
          ctx.strokeStyle = "#888"; ctx.lineWidth = 2;
          for (let y = -34 + ph; y < 34; y += 12) { ctx.beginPath(); ctx.moveTo(x - 10, cy + y); ctx.lineTo(x + 10, cy + y); ctx.stroke(); }
          D().texte(ctx, nom, x, cy - 46, c.texte, 12, "center", true);
          D().texte(ctx, Math.round(n) + " tr/min", x, cy + 50, c.accentFort, 12, "center", true);
        };
        roue(cx - 80, k.ng, "roue gauche (extérieure)", false);
        roue(cx + 80, k.nd, "roue droite (intérieure)", s.p.glace);
        // Boîtier de différentiel (schéma)
        ctx.fillStyle = s.p.bloque ? "#ef9a9a" : "#ffcc80"; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill();
        ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2; ctx.stroke();
        const as = s.etat.a[2];
        [0, Math.PI].forEach(o => { const a = o + as; ctx.fillStyle = "#8d6e63"; ctx.beginPath(); ctx.arc(cx + 14 * Math.cos(a), cy + 14 * Math.sin(a), 7, 0, 7); ctx.fill(); });
        D().texte(ctx, "couronne : " + Math.round(k.nc) + " tr/min", cx, cy + 84, c.texte, 12, "center", true);
        D().texte(ctx, "satellites : tournent sur eux-mêmes si les roues ont des vitesses différentes", cx, cy + 102, c.doux, 11, "center");
        // Explication chiffrée à droite
        const xr = W * 0.62;
        if (xr < W - 120) {
          D().texte(ctx, "Vue de dessus de l'essieu moteur", xr, 40, c.texte, 13, "left", true);
          D().texte(ctx, "N couronne = (N gauche + N droite) / 2", xr, 70, c.doux, 12);
          if (k.glisse > 0.01) D().texte(ctx, "⚠ Pneus forcés de glisser : " + LS.nombre(k.glisse * 3.6, 1) + " km/h", xr, 100, c.alerte, 13, "left", true);
          if (s.p.glace && !s.p.bloque) D().texte(ctx, "⚠ La roue sur la glace patine, la voiture ne bouge pas", xr, 100, c.alerte, 13, "left", true);
        }
      },
      mesures(s) {
        const k = this.calc(s);
        return [["Vitesse roue gauche", LS.nombre(k.vg * 3.6, 1) + " km/h"], ["Vitesse roue droite", LS.nombre(k.vd * 3.6, 1) + " km/h"], ["Écart", LS.nombre(Math.abs(k.ng - k.nd), 0) + " tr/min"], ["Glissement forcé des pneus", LS.nombre(k.glisse * 3.6, 1) + " km/h", k.glisse > 0.01 ? "alerte" : ""]];
      },
      explication(s) {
        return "En virage, la roue **extérieure** parcourt un plus grand arc que la roue **intérieure** : elle doit tourner plus vite. Le **différentiel** le permet tout en transmettant le **même couple** aux deux roues. Revers : si une roue n'adhère plus (glace, boue), le couple transmis aux deux est presque nul et elle patine seule. D'où les différentiels **à glissement limité** et les **blocages** (4×4).";
      }
    }, cfg);
  };
})();
