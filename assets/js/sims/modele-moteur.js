/* Modèle thermodynamique simplifié d'un cylindre de moteur 4 temps (essence ou diesel).
   θ = angle du cycle en degrés (0 à 720), 0 = PMH en début d'admission.
   Utilisé par les simulations du moteur 4 temps, multicylindre et courbes couple/puissance.
   Fonctionne aussi sous Node (tests). */
(function (racine) {
  "use strict";
  const LS = racine.LS = racine.LS || {};
  const GAMMA = 1.35, T_ADM = 330, PATM = 1.013, PECH = 1.1;

  /* Calage de la distribution (degrés de cycle). AOA : avance ouverture admission, etc. */
  const DISTRIB = { AOA: 710, RFA: 220, AOE: 500, RFE: 10 };
  LS.DISTRIBUTION = DISTRIB;

  /* Remplissage (rendement volumétrique) selon le régime : meilleur au régime « accordé ».
     etaMax dépasse 1 sur un moteur à admission accordée (pipes d'admission, prise d'air dynamique). */
  function remplissage(N, Nopt, largeur, etaMax) {
    const x = (N - Nopt) / largeur;
    return Math.max(0.3, (etaMax || 0.95) - 0.25 * x * x);
  }

  /* Frottements (pression moyenne de frottement, bar, pertes par pompage comprises) selon la vitesse
     moyenne du piston Vp = 2·course·N/60 : un moteur à course courte peut tourner plus vite. */
  LS.frottementsMoteur = function (courseMm, regime) {
    const Vp = 2 * courseMm / 1000 * regime / 60;
    return 0.9 + 0.06 * Vp + 0.004 * Vp * Vp;
  };

  /* Géométrie : déplacement du piston depuis le PMH (m), volume (m³). */
  LS.geometrieMoteur = function (p) {
    const r = p.course / 2000, l = p.bielle / 1000, A = Math.PI * Math.pow(p.alesage / 1000, 2) / 4;
    const Vd = A * 2 * r, Vc = Vd / (p.eps - 1);
    const depl = th => { const a = th * Math.PI / 180; return r + l - (r * Math.cos(a) + Math.sqrt(l * l - r * r * Math.sin(a) * Math.sin(a))); };
    return { r, l, A, Vd, Vc, depl, V: th => Vc + A * depl(th) };
  };

  /* Calcule un cycle complet : pression (bar) et volume (m³) tous les degrés, et les résultats. */
  LS.cycleMoteur = function (p) {
    const g = LS.geometrieMoteur(p);
    const diesel = p.mode === "diesel";
    const charge = Math.max(0.05, Math.min(1, p.charge / 100));
    const etaV = diesel ? remplissage(p.regime, p.Nopt || 2200, p.largeur || 2600, p.etaMax) : remplissage(p.regime, p.Nopt || 4200, p.largeur || 4200, p.etaMax);
    // Pression d'admission : le papillon étrangle l'essence ; le diesel n'a pas de papillon.
    const padm = diesel ? PATM * etaV * (p.turbo ? 1.8 : 1) : PATM * etaV * (0.22 + 0.78 * charge);
    const T2 = T_ADM * Math.pow(p.eps, GAMMA - 1);  // température en fin de compression (K)
    let allume, debut, duree, forme, K;
    if (diesel) {
      allume = T2 > 820 && p.injection !== false;   // auto-inflammation de l'air chaud
      debut = 360 - p.avance + 6;                   // délai d'auto-inflammation ≈ 6°
      duree = 55 + 25 * charge; forme = 2;
      K = 3.8 * charge * Math.pow(18 / p.eps, GAMMA - 1);
    } else {
      allume = p.allumage !== false;
      debut = 360 - p.avance;
      duree = 50; forme = 3;
      K = 4.4 * Math.pow(10 / p.eps, GAMMA - 1);   // mélange stœchiométrique : énergie ∝ air admis
    }
    const pr = new Float64Array(721), V = new Float64Array(721), xb = new Float64Array(721);
    const V1 = g.V(DISTRIB.RFA), p1 = padm;
    let paoe = 0;
    for (let th = 0; th <= 720; th++) {
      V[th] = g.V(th);
      let x = 0;
      if (allume && th > debut) {
        x = 1 - Math.exp(-5 * Math.pow((th - debut) / duree, forme));
        // Diesel : une partie du gazole, mélangée pendant le délai, brûle d'un coup (combustion de
        // prémélange, le « claquement » du diesel), le reste brûle au fil de l'injection (diffusion).
        if (diesel) x = 0.3 * (1 - Math.exp(-5 * Math.pow((th - debut) / 10, 2))) + 0.7 * x;
      }
      xb[th] = x;
      let pp;
      if (th < 20) pp = PECH + (padm - PECH) * th / 20;                  // fin du croisement
      else if (th <= DISTRIB.RFA) pp = padm;                               // admission
      else if (th <= DISTRIB.AOE) {                                       // compression, combustion, détente
        pp = p1 * Math.pow(V1 / V[th], GAMMA) * (1 + K * x);
        paoe = pp;
      } else if (th <= 560) pp = PECH + (paoe - PECH) * Math.exp(-(th - DISTRIB.AOE) / 12); // échappement spontané
      else pp = PECH;                                                      // échappement forcé
      pr[th] = pp;
    }
    // Travail indiqué : intégrale de p·dV sur le cycle.
    let W = 0, pmax = 0, thmax = 0;
    for (let th = 1; th <= 720; th++) {
      W += 1e5 * (pr[th] + pr[th - 1]) / 2 * (V[th] - V[th - 1]);
      if (pr[th] > pmax) { pmax = pr[th]; thmax = th; }
    }
    const pmi = W / g.Vd / 1e5;                                       // pression moyenne indiquée (bar)
    const pmf = LS.frottementsMoteur(p.course, p.regime);             // frottements (bar)
    const pme = pmi - pmf;                                            // pression moyenne effective
    const couple = pme * 1e5 * g.Vd / (4 * Math.PI);                  // N·m par cylindre
    const puissance = couple * p.regime * 2 * Math.PI / 60;           // W par cylindre
    // Énergie du carburant (pour le rendement) : proportionnelle à K.
    const cliquetis = !diesel && allume && ((p.eps > 11.5 && charge > 0.7) || p.avance > 38);
    return { p: pr, V, xb, g, W, pmi, pmf, pme, couple, puissance, pmax, thmax, T2, allume, padm, debut, duree, cliquetis, diesel, etaV };
  };

  /* Couple instantané d'un cylindre (N·m) à l'angle de cycle θ. */
  LS.coupleInstantane = function (cyc, th) {
    const g = cyc.g, a = (th % 360) * Math.PI / 180;
    const s = Math.sin(a), c = Math.cos(a);
    const bras = g.r * s * (1 + g.r * c / Math.sqrt(g.l * g.l - g.r * g.r * s * s));
    const i = Math.round(((th % 720) + 720) % 720);
    return (cyc.p[i] - PATM) * 1e5 * g.A * bras;
  };

  LS.phaseMoteur = function (th) {
    th = ((th % 720) + 720) % 720;
    if (th < 180) return { nom: "Admission", n: 1 };
    if (th < 360) return { nom: "Compression", n: 2 };
    if (th < 540) return { nom: "Combustion – détente", n: 3 };
    return { nom: "Échappement", n: 4 };
  };
  LS.soupapes = function (th) {
    th = ((th % 720) + 720) % 720;
    const ouvre = (a, b) => {               // levée 0..1 entre a et b (b peut dépasser 720)
      let x = th; if (x < a && b > 720) x += 720;
      if (x < a || x > b) return 0;
      return Math.sin(Math.PI * (x - a) / (b - a));
    };
    return { adm: Math.max(ouvre(DISTRIB.AOA, 720 + DISTRIB.RFA), ouvre(DISTRIB.AOA - 720, DISTRIB.RFA)), ech: ouvre(DISTRIB.AOE, 720 + DISTRIB.RFE) };
  };
})(typeof window !== "undefined" ? window : globalThis);
