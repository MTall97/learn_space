/* Bibliothèque des composants électriques : symbole (dessin), propriétés réglables et modèle
   physique pour le simulateur. Bornes en unités de grille (1 unité = 20 px). */
(function (racine) {
  "use strict";
  const LS = racine.LS = racine.LS || {};
  const VT = 0.025852; // tension thermique à 27 °C

  /* ---------- Outils de modèle ---------- */
  const u = (c, V) => V(c._nets[0]) - V(c._nets[1]);       // tension aux bornes (borne 0 − borne 1)
  const ouvert = c => c._nets.length < 2 || c._nets[0] === undefined || c._nets[1] === undefined;

  /* Modèle « dipôle linéaire » : i (de la borne 0 vers la borne 1) = G·u + J. */
  function dipole(calc) {
    return {
      stamp(m, c, V, ctx) {
        if (ouvert(c)) return;
        const r = calc(c, ctx);
        if (!r) return;
        c._G = r[0]; c._J = r[1] || 0;
        m.g(c._nets[0], c._nets[1], c._G);
        if (c._J) m.j(c._nets[0], c._nets[1], c._J);
      },
      courants(c, V) {
        if (ouvert(c) || c._G === undefined) return [0, 0];
        const i = c._G * u(c, V) + c._J;
        return [i, -i];
      }
    };
  }
  function avecApres(modele, apres, init) {
    modele.apres = apres;
    if (init) modele.init = init;
    return modele;
  }

  /* Jonction PN (diode, LED, Zener). */
  function jonction(param) {
    return {
      init(c) { c._vd = 0; c._vz = 0; },
      stamp(m, c, V, ctx) {
        if (ouvert(c) || (c.etat && c.etat.grille)) { c._G = 0; c._J = 0; return; }
        ctx.nonLineaire = true;
        const p = param(c);
        const nvt = p.n * VT;
        const vcrit = nvt * Math.log(nvt / (Math.SQRT2 * p.is));
        const brut = u(c, V);
        let vd = LS.pnjlim(brut, c._vd, nvt, vcrit);
        const nvtz = (p.nz || p.n) * VT;
        if (p.vz) {
          // Claquage inverse (Zener) : on limite la grandeur w = −vd − Vz.
          const w = LS.pnjlim(-vd - p.vz, -c._vd - p.vz, nvtz, nvtz * Math.log(nvtz / (Math.SQRT2 * p.iz)));
          vd = -w - p.vz;
        }
        vd = Math.max(vd, -1e3);
        if (Math.abs(vd - brut) > 1e-6 * (1 + Math.abs(brut))) ctx.nonConverge = true;
        c._vd = vd;
        const e = Math.exp(Math.min(vd / nvt, 80));
        let id = p.is * (e - 1), gd = p.is * e / nvt;
        if (p.vz) {
          const ez = Math.exp(Math.min((-vd - p.vz) / nvtz, 80));
          id -= p.iz * ez; gd += p.iz * ez / nvtz;
        }
        gd += 1e-12;
        c._G = gd; c._J = id - gd * vd;
        m.g(c._nets[0], c._nets[1], gd);
        m.j(c._nets[0], c._nets[1], c._J);
      },
      courants(c, V) {
        if (ouvert(c) || !c._G) return [0, 0];
        const i = c._G * u(c, V) + c._J;
        return [i, -i];
      }
    };
  }

  /* Transistor bipolaire (modèle d'Ebers-Moll). Bornes : 0 = base, 1 = collecteur, 2 = émetteur. */
  function bipolaire(signe) {
    return {
      init(c) { c._vbe = 0; c._vbc = 0; },
      stamp(m, c, V, ctx) {
        const [B, C, E] = c._nets;
        c._lin = null;
        if (B === undefined || C === undefined || E === undefined || (c.etat && c.etat.grille)) return;
        ctx.nonLineaire = true;
        const is = 1e-14, bf = c.p.beta || 100, br = 1;
        const vcrit = VT * Math.log(VT / (Math.SQRT2 * is));
        const vbeB = signe * (V(B) - V(E)), vbcB = signe * (V(B) - V(C));
        const vbe = LS.pnjlim(vbeB, c._vbe, VT, vcrit), vbc = LS.pnjlim(vbcB, c._vbc, VT, vcrit);
        if (Math.abs(vbe - vbeB) > 1e-6 || Math.abs(vbc - vbcB) > 1e-6) ctx.nonConverge = true;
        c._vbe = vbe; c._vbc = vbc;
        const ef = Math.exp(Math.min(vbe / VT, 80)), er = Math.exp(Math.min(vbc / VT, 80));
        const iF = is * (ef - 1), iR = is * (er - 1);
        const gF = is * ef / VT + 1e-12, gR = is * er / VT + 1e-12;
        // Courants qui entrent dans le transistor par C et par B (modèle NPN).
        const ic = iF - iR * (1 + 1 / br), ib = iF / bf + iR / br;
        const gcC = gR * (1 + 1 / br);         // dic/dvbc = −gcC
        const gpi = gF / bf, gmu = gR / br;
        // Linéarisation : ic ≈ ic0 + gF·(vbe − vbe0) − gcC·(vbc − vbc0), vbe = s(vB − vE), vbc = s(vB − vC).
        const cC = signe * (ic - gF * vbe + gcC * vbc);
        const cB = signe * (ib - gpi * vbe - gmu * vbc);
        // Ligne C
        m.G(C, B, gF - gcC); m.G(C, E, -gF); m.G(C, C, gcC); m.I(C, cC);
        // Ligne B
        m.G(B, B, gpi + gmu); m.G(B, E, -gpi); m.G(B, C, -gmu); m.I(B, cB);
        // Ligne E = −(C + B)
        m.G(E, B, -(gF - gcC) - (gpi + gmu)); m.G(E, E, gF + gpi); m.G(E, C, -gcC + gmu); m.I(E, -(cC + cB));
        // Claquage par avalanche entre collecteur et émetteur au-delà de Vceo (surtension à la coupure
        // d'une charge inductive) : i = I0·exp((x − Vceo) / 1 V), x = Vce (NPN) ou Vec (PNP).
        const lim = limitesTransistor(c), I0 = 1e-3, NV = 1;
        const xB = signe * (V(C) - V(E));
        const w = LS.pnjlim(xB - lim.vceo, (c._xce || 0) - lim.vceo, NV, NV * Math.log(NV / (Math.SQRT2 * I0)));
        const x = w + lim.vceo;
        if (Math.abs(x - xB) > 1e-6 * (1 + Math.abs(xB))) ctx.nonConverge = true;
        c._xce = x;
        const iav = I0 * Math.exp(Math.min(w / NV, 60)), gav = iav / NV + 1e-12;
        m.g(C, E, gav); m.j(C, E, signe * (iav - gav * x));
        c._lin = { gF, gcC, gpi, gmu, cC, cB, gav, jav: signe * (iav - gav * x) };
      },
      courants(c, V) {
        const [B, C, E] = c._nets;
        if (!c._lin || B === undefined || C === undefined || E === undefined) return [0, 0, 0];
        const l = c._lin;
        const vb = V(B), vc = V(C), ve = V(E);
        const iav = l.gav * (vc - ve) + l.jav; // courant d'avalanche C → E
        const ic = (l.gF - l.gcC) * vb - l.gF * ve + l.gcC * vc + l.cC + iav;
        const ib = (l.gpi + l.gmu) * vb - l.gpi * ve - l.gmu * vc + l.cB;
        return [ib, ic, -(ib + ic)];
      },
      apres(c, V, ctx) {
        c.etat = c.etat || {};
        if (c.etat.grille) { c.etat.alerte = "Transistor grillé (trop de courant ou de puissance) : « Réparer »"; return; }
        const [B, C, E] = c._nets;
        if (!c._lin || B === undefined) return;
        const i = this.courants(c, V), lim = limitesTransistor(c);
        const vce = V(C) - V(E), vbe = V(B) - V(E);
        const P = Math.abs(vce * i[1]) + Math.abs(vbe * i[0]);
        const avalanche = signe * vce > lim.vceo - 0.5 && Math.abs(i[1]) > 1e-3;
        if (avalanche) c.etat.avalanches = (c.etat.avalanches || 0) + (c._avAvant ? 0 : 1);
        c._avAvant = avalanche;
        if (avalanche) c.etat.tAval = 0.5; else c.etat.tAval = Math.max(0, (c.etat.tAval || 0) - ctx.dt);
        const pm = thermique(c, P, Math.max(Math.abs(i[1]), 4 * Math.abs(i[0])), ctx.dt, lim);
        c.etat.alerte = c.etat.grille ? "Transistor grillé (trop de courant ou de puissance) : « Réparer »" :
          c.etat.tAval > 0 ? "Surtension à la coupure : Vce a atteint " + lim.vceo + " V (avalanche). Une charge inductive sans diode de roue libre détruit le transistor à la longue." :
          Math.abs(i[1]) > lim.icmax ? "Courant collecteur au-delà du maximum (" + LS.si(lim.icmax, "A") + ") : il va griller" :
          pm > lim.pnom ? "Le transistor chauffe : " + LS.si(pm, "W") + " (max " + LS.si(lim.pnom, "W") + ")" : "";
      }
    };
  }

  /* Surveillance d'un échauffement : appelle grille() si la condition dure plus de « duree » s. */
  function surchauffe(c, condition, dt, duree) {
    c.etat = c.etat || {};
    if (condition) c.etat.chauffe = (c.etat.chauffe || 0) + dt;
    else c.etat.chauffe = Math.max(0, (c.etat.chauffe || 0) - dt);
    if (c.etat.chauffe > duree && !c.etat.grille) { c.etat.grille = true; c.etat.change = true; }
  }

  /* Échauffement d'un semi-conducteur : puissance moyenne lissée (constante thermique lim.tau) et
     courant de pointe. Grille si la puissance moyenne dépasse lim.pmax, ou si le courant dépasse
     lim.icrete plus de lim.tcrete secondes. Renvoie la puissance moyenne. */
  function thermique(c, P, i, dt, lim) {
    c.etat = c.etat || {};
    const e = c.etat;
    e.pm = (e.pm || 0) + (P - (e.pm || 0)) * Math.min(1, dt / lim.tau);
    e.chauffe = Math.abs(i) > lim.icrete ? (e.chauffe || 0) + dt : Math.max(0, (e.chauffe || 0) - dt);
    if (!e.grille && (e.pm > lim.pmax || e.chauffe > lim.tcrete)) { e.grille = true; e.change = true; }
    return e.pm;
  }
  // Ordres de grandeur des fiches techniques (pnom : puissance nominale ; pmax : destruction).
  const LIM_DIODE = { pnom: 1.2, pmax: 3, tau: 0.3, icrete: 50, tcrete: 0.01 };   // 1N4007 : 1 A, 30 A pendant 8 ms
  const LIM_ZENER = { pnom: 0.5, pmax: 1.2, tau: 0.2, icrete: 2, tcrete: 0.01 };  // Zener 0,5 W
  const TRANSISTORS = {
    "BC547 (petit signal)": { icmax: 0.1, vceo: 45, pnom: 0.5, pmax: 1.2, tau: 0.2, icrete: 0.5, tcrete: 0.02 },
    "BC557 (petit signal)": { icmax: 0.1, vceo: 45, pnom: 0.5, pmax: 1.2, tau: 0.2, icrete: 0.5, tcrete: 0.02 },
    "TIP31 (puissance)": { icmax: 3, vceo: 40, pnom: 10, pmax: 25, tau: 1, icrete: 6, tcrete: 0.05 },
    "TIP32 (puissance)": { icmax: 3, vceo: 40, pnom: 10, pmax: 25, tau: 1, icrete: 6, tcrete: 0.05 }
  };
  const limitesTransistor = c => TRANSISTORS[c.p.modele] || TRANSISTORS["BC547 (petit signal)"];
  /* Fusible : contrainte thermique I²t (fond en ≈ 12 ms à 10 In, ≈ 1 s à 1,5 In, jamais sous 1,1 In). */
  function fusion(etat, cle, i, In, dt) {
    const x = (i / In) * (i / In) - 1.21;
    etat[cle] = x > 0 ? (etat[cle] || 0) + x * dt : Math.max(0, (etat[cle] || 0) - dt);
    return etat[cle] > 1.2;
  }

  const COULEURS_LED = {
    rouge: { vf: 1.9, coul: "#ff3b30" }, orange: { vf: 2.0, coul: "#ff9500" }, jaune: { vf: 2.1, coul: "#ffd60a" },
    verte: { vf: 2.2, coul: "#34c759" }, bleue: { vf: 3.0, coul: "#0a84ff" }, blanche: { vf: 3.1, coul: "#f5f5f5" }
  };

  /* ---------- Dessins ---------- */
  const fleche = (d, x1, y1, x2, y2) => {
    d.l(x1, y1, x2, y2);
    const a = Math.atan2(y2 - y1, x2 - x1), s = 5;
    d.p(`M${x2},${y2} L${x2 - s * Math.cos(a - 0.5)},${y2 - s * Math.sin(a - 0.5)} M${x2},${y2} L${x2 - s * Math.cos(a + 0.5)},${y2 - s * Math.sin(a + 0.5)}`);
  };

  const R = {};

  R.pile = {
    nom: "Pile / générateur continu", court: "Pile", cat: "Sources", prefixe: "G", source: true,
    bornes: [[0, 0], [4, 0]],
    props: [
      { k: "U", nom: "Tension", unite: "V", min: 0, max: 24, pas: 0.1, defaut: 4.5 },
      { k: "r", nom: "Résistance interne", unite: "Ω", min: 0.01, max: 10, log: true, defaut: 0.1 }
    ],
    dessin(d, c) {
      d.l(0, 0, 34, 0); d.l(46, 0, 80, 0);
      d.l(34, -16, 34, 16); d.l(46, -8, 46, 8, "corps epais");
      d.t(26, -12, "+", "txt"); d.t(54, -12, "−", "txt");
      d.t(40, 30, LS.si(c.p.U, "V"), "valeur");
    },
    modele: avecApres(dipole(c => [1 / c.p.r, -c.p.U / c.p.r]), (c, V, ctx) => {
      const i = c._G * u(c, V) + c._J;
      c.etat = c.etat || {};
      // Court-circuit : la tension s'effondre (presque toute la tension se perd dans la résistance interne).
      c.etat.alerte = Math.abs(i) > 1 && Math.abs(u(c, V)) < 0.3 * c.p.U ? "Court-circuit : courant énorme, la pile chauffe !" : "";
    }),
    mesures(c, V) { const i = -(c._G * u(c, V) + c._J); return [["Tension aux bornes", LS.si(u(c, V), "V")], ["Courant débité", LS.si(i, "A")], ["Puissance fournie", LS.si(u(c, V) * i, "W")]]; }
  };

  R.generateur = {
    nom: "Générateur de signaux (alternatif)", court: "Générateur", cat: "Sources", prefixe: "GBF", source: true,
    bornes: [[0, 0], [4, 0]],
    props: [
      { k: "forme", nom: "Forme", choix: ["sinus", "carré", "triangle"], defaut: "sinus" },
      { k: "A", nom: "Amplitude (crête)", unite: "V", min: 0, max: 24, pas: 0.1, defaut: 5 },
      { k: "f", nom: "Fréquence", unite: "Hz", min: 0.1, max: 5000, log: true, defaut: 50 },
      { k: "off", nom: "Décalage (composante continue)", unite: "V", min: -12, max: 12, pas: 0.1, defaut: 0 }
    ],
    dessin(d, c) {
      d.l(0, 0, 26, 0); d.l(54, 0, 80, 0);
      d.c(40, 0, 14, "plein");
      if (c.p.forme === "carré") d.p("M31,4 L31,-5 L40,-5 L40,5 L49,5 L49,-4");
      else if (c.p.forme === "triangle") d.p("M30,4 L35,-5 L45,5 L50,-4");
      else d.p("M30,0 C34,-12 38,-12 40,0 C42,12 46,12 50,0");
      d.t(20, -12, "+", "txt");
      d.t(40, 30, LS.si(c.p.A, "V") + " · " + LS.si(c.p.f, "Hz"), "valeur");
    },
    tension(c, t) {
      const ph = (c.p.f * t) % 1;
      let s;
      if (c.p.forme === "carré") s = ph < 0.5 ? 1 : -1;
      else if (c.p.forme === "triangle") s = ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
      else s = Math.sin(2 * Math.PI * ph);
      return c.p.off + c.p.A * s;
    },
    modele: avecApres(dipole((c, ctx) => { const e = R.generateur.tension(c, ctx.t); return [10, -e * 10]; }), (c, V, ctx) => {
      const i = c._G * u(c, V) + c._J, e = R.generateur.tension(c, ctx.t);
      c.etat = c.etat || {};
      // Court-circuit : presque toute la tension se perd dans la résistance interne (0,1 Ω).
      if (Math.abs(i) > 1 && Math.abs(e) > 1 && Math.abs(u(c, V)) < 0.3 * Math.abs(e)) c.etat.cc = 0.2;
      else c.etat.cc = Math.max(0, (c.etat.cc || 0) - ctx.dt);
      c.etat.alerte = c.etat.cc > 0 ? "Court-circuit : courant énorme (" + LS.si(Math.abs(i), "A") + " crête). Sur le réseau, le disjoncteur ou le fusible doit couper." : "";
    }),
    mesures(c, V) { const i = -(c._G * u(c, V) + c._J); return [["Tension instantanée", LS.si(u(c, V), "V")], ["Courant", LS.si(i, "A")], ["Période T = 1/f", LS.si(1 / c.p.f, "s")], ["Valeur efficace (sinus)", LS.si(c.p.A / Math.SQRT2, "V")]]; }
  };

  R.resistance = {
    nom: "Résistance", court: "Résistance", cat: "Passifs", prefixe: "R",
    bornes: [[0, 0], [4, 0]],
    props: [
      { k: "R", nom: "Résistance", unite: "Ω", min: 1, max: 1e6, log: true, defaut: 1000, normalise: true },
      { k: "Pmax", nom: "Puissance maximale", unite: "W", choix: [0.25, 0.5, 1, 5], defaut: 0.25 }
    ],
    dessin(d, c) {
      d.l(0, 0, 22, 0); d.l(58, 0, 80, 0);
      d.r(22, -8, 36, 16, c.etat && c.etat.grille ? "plein grille" : "plein");
      d.t(40, -14, LS.si(c.p.R, "Ω"), "valeur");
      const chaleur = d.r(22, -8, 36, 16, "chaleur");
      return c2 => {
        const e = c2.etat || {};
        const P = Math.abs((c2._i ? c2._i[0] : 0) * (c2._u || 0));
        chaleur.setAttribute("fill", "#ff3b30");
        chaleur.setAttribute("opacity", e.grille ? 0 : Math.min(0.8, Math.max(0, (P / c2.p.Pmax - 0.6) * 1.2)));
      };
    },
    modele: avecApres(dipole(c => (c.etat && c.etat.grille) ? null : [1 / c.p.R, 0]), (c, V, ctx) => {
      const U = u(c, V), P = U * U / c.p.R;
      c._u = U;
      surchauffe(c, P > 2.5 * c.p.Pmax, ctx.dt, 0.4);
      c.etat.alerte = c.etat.grille ? "Résistance brûlée (trop de puissance)" : P > c.p.Pmax ? "Chauffe : puissance > " + c.p.Pmax + " W" : "";
    })
  };

  R.potentiometre = {
    nom: "Potentiomètre", court: "Potentio.", cat: "Passifs", prefixe: "P",
    bornes: [[0, 0], [4, 0], [2, -2]],
    props: [
      { k: "R", nom: "Résistance totale", unite: "Ω", min: 100, max: 1e6, log: true, defaut: 10000, normalise: true },
      { k: "pos", nom: "Position du curseur", unite: "%", min: 0, max: 100, pas: 1, defaut: 50 }
    ],
    dessin(d, c) {
      d.l(0, 0, 22, 0); d.l(58, 0, 80, 0);
      d.r(22, -8, 36, 16, "plein");
      const x = 22 + 36 * c.p.pos / 100;
      d.l(40, -40, 40, -26); d.l(40, -26, x, -26); fleche(d, x, -26, x, -9);
      d.t(66, 22, LS.si(c.p.R, "Ω") + " · " + c.p.pos + " %", "valeur");
    },
    modele: {
      stamp(m, c) {
        const [a, b, w] = c._nets;
        const ra = Math.max(1, c.p.R * c.p.pos / 100), rb = Math.max(1, c.p.R * (1 - c.p.pos / 100));
        c._ga = 1 / ra; c._gb = 1 / rb;
        if (a !== undefined && w !== undefined) m.g(a, w, c._ga);
        if (b !== undefined && w !== undefined) m.g(w, b, c._gb);
      },
      courants(c, V) {
        const [a, b, w] = c._nets;
        if (w === undefined) return [0, 0, 0];
        const ia = a !== undefined ? c._ga * (V(a) - V(w)) : 0;
        const ib = b !== undefined ? c._gb * (V(b) - V(w)) : 0;
        return [ia, ib, -(ia + ib)];
      }
    },
    mesures(c, V) {
      const [a, b, w] = c._nets;
      return [["U entre curseur et borne gauche", LS.si(V(w) - V(a), "V")], ["U entre curseur et borne droite", LS.si(V(w) - V(b), "V")],
        ["R gauche–curseur", LS.si(c.p.R * c.p.pos / 100, "Ω")], ["R curseur–droite", LS.si(c.p.R * (1 - c.p.pos / 100), "Ω")]];
    }
  };

  R.lampe = {
    nom: "Lampe", court: "Lampe", cat: "Récepteurs", prefixe: "L",
    bornes: [[0, 0], [4, 0]],
    props: [
      { k: "Un", nom: "Tension nominale", unite: "V", choix: [1.5, 3.5, 6, 12, 24, 230], defaut: 6 },
      { k: "Pn", nom: "Puissance nominale", unite: "W", choix: [0.1, 0.3, 0.5, 1, 3, 5, 21, 40, 60], defaut: 0.5 }
    ],
    dessin(d, c) {
      const halo = d.c(40, 0, 22, "halo");
      halo.setAttribute("fill", "#ffd84d"); halo.setAttribute("opacity", 0);
      d.l(0, 0, 26, 0); d.l(54, 0, 80, 0);
      d.c(40, 0, 14, "plein");
      if (c.etat && c.etat.grille && !c.cache) d.p("M33,-4 L38,2 M42,-2 L47,4");
      else d.p("M30,-10 L50,10 M30,10 L50,-10");
      d.t(40, 32, c.p.Un + " V · " + c.p.Pn + " W", "valeur");
      return c2 => {
        // Le filament a une inertie thermique : son éclat suit la tension efficace, pas la valeur instantanée.
        const ue = c2._ueff || 0, P = ue * ue * c2.p.Pn / (c2.p.Un * c2.p.Un);
        const e = c2.etat && c2.etat.grille ? 0 : Math.min(1, Math.sqrt(P / c2.p.Pn));
        halo.setAttribute("opacity", e < 0.05 ? 0 : 0.15 + 0.85 * e);
        halo.setAttribute("r", 16 + 14 * e);
      };
    },
    /* Filament : sa résistance croît avec sa température (≈ 1/14 de la valeur nominale à froid, d'où
       l'appel de courant à l'allumage). Température réduite x = T/Tn : rayonnement ∝ x⁴, R ∝ x^1,2. */
    resistance(c) { const x = c._x === undefined ? 0.11 : c._x; return c.p.Un * c.p.Un / c.p.Pn * Math.max(0.07, Math.pow(x, 1.2)); },
    modele: avecApres(dipole(c => (c.etat && c.etat.grille) ? null : [1 / R.lampe.resistance(c), 0]), (c, V, ctx) => {
      const U = u(c, V), Rf = R.lampe.resistance(c), P = U * U / Rf;
      c._u = U;
      const x = c._x === undefined ? 0.11 : c._x;
      c._x = Math.max(0.11, x + (P / c.p.Pn - Math.pow(x, 4)) * Math.min(0.5, ctx.dt / 0.2)); // inertie thermique
      const a = Math.min(1, ctx.dt / 0.1);
      c._ueff = Math.sqrt((c._ueff || 0) ** 2 * (1 - a) + U * U * a); // tension efficace (lissée sur 0,1 s)
      const Pr = Math.pow(c._x, 4) * c.p.Pn; // puissance rayonnée en régime établi
      surchauffe(c, c._x > 1.22, ctx.dt, 0.15);
      if (c.etat.grille) c._x = 0.11;
      c.etat.alerte = c.etat.grille ? "Filament grillé : la tension était trop forte" : c._x > 1.07 ? "Surtension : la lampe va griller" : Pr < 0.05 * c.p.Pn && P > 1e-6 ? "Tension trop faible : le filament ne rougit pas" : "";
    }),
    mesures(c, V) { const U = u(c, V), I = c._i ? c._i[0] : 0; return [["Tension", LS.si(U, "V")], ["Courant", LS.si(I, "A")], ["Puissance", LS.si(U * I, "W")], ["Résistance du filament (chaude ou froide)", LS.si(R.lampe.resistance(c), "Ω")], ["Éclat", Math.round(100 * Math.min(1, Math.sqrt(Math.abs(U * I) / c.p.Pn))) + " %"]]; }
  };

  R.led = {
    nom: "DEL (LED)", court: "LED", cat: "Semi-conducteurs", prefixe: "D",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "couleur", nom: "Couleur", choix: Object.keys(COULEURS_LED), defaut: "rouge" }],
    dessin(d, c) {
      const col = COULEURS_LED[c.p.couleur].coul;
      const halo = d.c(40, 0, 20, "halo");
      halo.setAttribute("fill", col); halo.setAttribute("opacity", 0);
      d.l(0, 0, 30, 0); d.l(50, 0, 80, 0);
      const tri = d.p("M30,-10 L30,10 L50,0 Z", "plein");
      d.l(50, -10, 50, 10);
      fleche(d, 44, -14, 52, -24); fleche(d, 50, -10, 58, -20);
      if (c.etat && c.etat.grille) d.p("M28,-14 L52,14 M28,14 L52,-14", "corps grille-x");
      d.t(14, -8, "A", "txt"); d.t(66, -8, "K", "txt");
      return c2 => {
        const I = c2._i ? c2._i[0] : 0;
        const e = c2.etat && c2.etat.grille ? 0 : Math.min(1, Math.max(0, I) / 0.02);
        halo.setAttribute("opacity", e < 0.02 ? 0 : 0.2 + 0.8 * Math.sqrt(e));
        halo.setAttribute("r", 12 + 14 * Math.sqrt(e));
        tri.style.fill = e > 0.02 ? col : "";
      };
    },
    modele: avecApres(jonction(c => {
      const vf = COULEURS_LED[c.p.couleur].vf, n = 2;
      return { n: n, is: 0.02 / Math.exp(vf / (n * VT)) };
    }), (c, V, ctx) => {
      const i = c._G ? c._G * u(c, V) + c._J : 0;
      surchauffe(c, i > 0.05, ctx.dt, 0.1);
      c.etat.alerte = c.etat.grille ? "LED grillée : courant trop fort (il faut une résistance de protection)" :
        i > 0.03 ? "Courant trop fort pour une LED (max ≈ 20 mA)" : u(c, V) < -5 ? "Tension inverse trop forte" : "";
    }),
    mesures(c, V) { const U = u(c, V), I = c._i ? c._i[0] : 0; return [["Tension (seuil ≈ " + COULEURS_LED[c.p.couleur].vf + " V)", LS.si(U, "V")], ["Courant (conseillé 10–20 mA)", LS.si(I, "A")], ["Puissance", LS.si(U * I, "W")]]; }
  };

  R.diode = {
    nom: "Diode de redressement", court: "Diode", cat: "Semi-conducteurs", prefixe: "D",
    bornes: [[0, 0], [4, 0]], props: [],
    dessin(d) {
      d.l(0, 0, 30, 0); d.l(50, 0, 80, 0);
      d.p("M30,-10 L30,10 L50,0 Z", "plein"); d.l(50, -10, 50, 10);
      d.t(14, -8, "A", "txt"); d.t(66, -8, "K", "txt");
    },
    modele: avecApres(jonction(() => ({ n: 1.75, is: 2.5e-9 })), (c, V, ctx) => {
      c.etat = c.etat || {};
      if (c.etat.grille) { c.etat.alerte = "Diode grillée (courant trop fort) : « Réparer »"; return; }
      const x = u(c, V), i = c._G ? c._G * x + c._J : 0;
      const pm = thermique(c, Math.abs(x * i), i, ctx.dt, LIM_DIODE);
      c.etat.alerte = c.etat.grille ? "Diode grillée (courant trop fort) : « Réparer »" : pm > LIM_DIODE.pnom ? "La diode chauffe : " + LS.si(Math.abs(i), "A") + " (1N4007 : 1 A en continu)" : "";
    }),
    mesures(c, V) { const x = u(c, V), i = c._G ? c._G * x + c._J : 0; return [["Tension (seuil ≈ 0,7 V)", LS.si(x, "V")], ["Courant", LS.si(i, "A")], ["Puissance", LS.si(x * i, "W")], ["Limites (1N4007)", "1 A en continu, 30 A pendant 8 ms, 1 000 V en inverse"]]; }
  };

  R.zener = {
    nom: "Diode Zener", court: "Zener", cat: "Semi-conducteurs", prefixe: "DZ",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "Vz", nom: "Tension Zener", unite: "V", choix: [3.3, 5.1, 6.2, 9.1, 12], defaut: 5.1 }],
    dessin(d, c) {
      d.l(0, 0, 30, 0); d.l(50, 0, 80, 0);
      d.p("M30,-10 L30,10 L50,0 Z", "plein"); d.p("M45,-14 L50,-10 L50,10 L55,14");
      d.t(40, 26, "Vz " + c.p.Vz + " V", "valeur");
    },
    // Claquage : 5 mA à Vz, résistance dynamique ≈ 20 Ω à 10 mA (nz = 8).
    modele: avecApres(jonction(c => ({ n: 1.75, is: 2.5e-9, vz: c.p.Vz, iz: 5e-3, nz: 8 })), (c, V, ctx) => {
      c.etat = c.etat || {};
      if (c.etat.grille) { c.etat.alerte = "Zener grillée (trop de puissance) : « Réparer »"; return; }
      const x = u(c, V), i = c._G ? c._G * x + c._J : 0;
      const pm = thermique(c, Math.abs(x * i), i, ctx.dt, LIM_ZENER);
      c.etat.alerte = c.etat.grille ? "Zener grillée (trop de puissance) : « Réparer »" : pm > LIM_ZENER.pnom ? "La Zener chauffe : " + LS.si(pm, "W") + " (max 0,5 W) : augmente la résistance série" : "";
    }),
    mesures(c, V) { const x = u(c, V), i = c._G ? c._G * x + c._J : 0; return [["Tension", LS.si(x, "V")], ["Courant", LS.si(i, "A")], ["Puissance (max 0,5 W)", LS.si(Math.abs(x * i), "W")]]; }
  };

  R.condensateur = {
    nom: "Condensateur", court: "Condensateur", cat: "Passifs", prefixe: "C",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "C", nom: "Capacité", unite: "F", min: 1e-9, max: 1e-2, log: true, defaut: 1e-4, normalise: true }],
    dessin(d, c) {
      d.l(0, 0, 35, 0); d.l(45, 0, 80, 0);
      d.l(35, -14, 35, 14); d.l(45, -14, 45, 14);
      d.t(40, -20, LS.si(c.p.C, "F"), "valeur");
      const charge = d.t(40, 30, "", "txt");
      return c2 => { charge.textContent = LS.si(c2._v || 0, "V"); };
    },
    modele: {
      init(c) { c._v = c._v || 0; },
      stamp(m, c, V, ctx) {
        if (ouvert(c)) return;
        c._G = c.p.C / ctx.dt; c._J = -c._G * c._v;
        m.g(c._nets[0], c._nets[1], c._G); m.j(c._nets[0], c._nets[1], c._J);
      },
      apres(c, V) { if (!ouvert(c)) { c._i0 = c._G * u(c, V) + c._J; c._v = u(c, V); } },
      courants(c) { const i = c._i0 || 0; return [i, -i]; }
    },
    mesures(c) { return [["Tension (charge)", LS.si(c._v || 0, "V")], ["Courant", LS.si(c._i0 || 0, "A")], ["Charge Q = C·U", LS.si(c.p.C * (c._v || 0), "C")], ["Énergie ½CU²", LS.si(0.5 * c.p.C * (c._v || 0) ** 2, "J")]]; }
  };

  R.bobine = {
    nom: "Bobine (inductance)", court: "Bobine", cat: "Passifs", prefixe: "L",
    bornes: [[0, 0], [4, 0]],
    props: [
      { k: "L", nom: "Inductance", unite: "H", min: 1e-4, max: 10, log: true, defaut: 0.1 },
      { k: "r", nom: "Résistance du fil", unite: "Ω", min: 0.1, max: 100, log: true, defaut: 1 }
    ],
    dessin(d, c) {
      d.l(0, 0, 16, 0); d.l(64, 0, 80, 0);
      d.p("M16,0 a6,7 0 0 1 12,0 a6,7 0 0 1 12,0 a6,7 0 0 1 12,0 a6,7 0 0 1 12,0");
      d.t(40, -16, LS.si(c.p.L, "H"), "valeur");
    },
    modele: {
      init(c) { c._il = c._il || 0; },
      stamp(m, c, V, ctx) {
        if (ouvert(c)) return;
        // Bobine idéale L en série avec r : i = (u + (L/dt)·i_prec) / (r + L/dt)
        const z = c.p.r + c.p.L / ctx.dt;
        c._G = 1 / z; c._J = (c.p.L / ctx.dt) * c._il / z;
        m.g(c._nets[0], c._nets[1], c._G); m.j(c._nets[0], c._nets[1], c._J);
      },
      apres(c, V) {
        if (ouvert(c)) return;
        const x = u(c, V);
        c._il = c._G * x + c._J;
        if (Math.abs(x) > Math.abs(c._upic || 0)) c._upic = x; // tension crête
        // Tension « inverse » : quand la bobine rend son énergie (u et i de signes opposés), c'est la
        // surtension de coupure. Remise à zéro par le TP.
        if (x * c._il < 0 && Math.abs(x) > (c._uinv || 0)) c._uinv = Math.abs(x);
      },
      courants(c) { return [c._il || 0, -(c._il || 0)]; }
    },
    mesures(c, V) { return [["Tension", LS.si(u(c, V), "V")], ["Courant", LS.si(c._il || 0, "A")], ["Énergie ½LI²", LS.si(0.5 * c.p.L * (c._il || 0) ** 2, "J")]]; }
  };

  /* Contact mécanique. Fermé : 10 mΩ. Ouvert : isolant, sauf si la tension entre les contacts
     dépasse ~500 V (ouverture d'un circuit inductif) : l'air s'ionise et un arc conduit le courant.
     Modèle non linéaire résolu par Newton : i = G0·u + signe(u)·I0·exp((|u| − 500) / 20). */
  function contact(estFerme) {
    const UA = 500, VA = 20, I0 = 1e-3, G0 = 1e-9;
    const vcrit = VA * Math.log(VA / (Math.SQRT2 * I0));
    return {
      init(c) { c._ua = 0; },
      stamp(m, c, V, ctx) {
        if (ouvert(c)) return;
        if (estFerme(c)) { c._G = 100; c._J = 0; m.g(c._nets[0], c._nets[1], 100); return; }
        ctx.nonLineaire = true;
        const brut = u(c, V), sg = brut >= 0 ? 1 : -1;
        const w = LS.pnjlim(Math.abs(brut) - UA, Math.abs(c._ua) - UA, VA, vcrit);
        const x = sg * (w + UA);
        if (Math.abs(x - brut) > 1e-6 * (1 + Math.abs(brut))) ctx.nonConverge = true;
        c._ua = x;
        const e = I0 * Math.exp(Math.min((Math.abs(x) - UA) / VA, 60));
        const i = G0 * x + sg * e, g = G0 + e / VA;
        c._G = g; c._J = i - g * x;
        m.g(c._nets[0], c._nets[1], g); m.j(c._nets[0], c._nets[1], c._J);
      },
      apres(c, V) {
        c.etat = c.etat || {};
        const i = ouvert(c) || c._G === undefined ? 0 : c._G * u(c, V) + c._J;
        const arc = !estFerme(c) && Math.abs(i) > 1e-3;
        if (arc && !c.etat.arc) { c.etat.etincelles = (c.etat.etincelles || 0) + 1; c.etat.change = true; }
        if (!arc && c.etat.arc) c.etat.change = true;
        c.etat.arc = arc;
        c.etat.alerte = arc ? "Étincelle entre les contacts : l'énergie de la bobine s'évacue dans un arc" : "";
      },
      courants(c, V) {
        if (ouvert(c) || c._G === undefined) return [0, 0];
        const i = c._G * u(c, V) + c._J;
        return [i, -i];
      }
    };
  }
  const etincelle = (d, c) => { if (c.etat && c.etat.arc) d.p("M36,-14 L42,-6 L38,-6 L44,4", "etincelle"); };

  R.interrupteur = {
    nom: "Interrupteur", court: "Interrupteur", cat: "Commande", prefixe: "K", cliquable: true,
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "ferme", nom: "Fermé", bool: true, defaut: false }],
    dessin(d, c) {
      d.l(0, 0, 24, 0); d.l(58, 0, 80, 0);
      d.c(24, 0, 2.5, "plein"); d.c(58, 0, 2.5, "plein");
      if (c.p.ferme) d.l(24, 0, 58, -2); else d.l(24, 0, 54, -18);
      etincelle(d, c);
      d.t(40, 22, c.p.ferme ? "fermé" : "ouvert", "txt");
    },
    action(c) { c.p.ferme = !c.p.ferme; },
    modele: contact(c => c.p.ferme)
  };

  R.bouton = {
    nom: "Bouton poussoir", court: "Poussoir", cat: "Commande", prefixe: "BP", appui: true,
    bornes: [[0, 0], [4, 0]],
    props: [],
    dessin(d, c) {
      d.l(0, 0, 24, 0); d.l(56, 0, 80, 0);
      const y = c._appui ? 0 : -10;
      d.l(20, y, 60, y); d.l(40, y, 40, y - 12); d.l(32, y - 12, 48, y - 12);
      d.t(40, 22, c._appui ? "appuyé" : "appuyer", "txt");
    },
    modele: contact(c => !!c._appui)
  };

  R.vaetvient = {
    nom: "Interrupteur va-et-vient", court: "Va-et-vient", cat: "Commande", prefixe: "K", cliquable: true,
    bornes: [[0, 0], [4, -1], [4, 1]],
    props: [{ k: "haut", nom: "Position haute", bool: true, defaut: true }],
    dessin(d, c) {
      d.l(0, 0, 24, 0); d.l(62, -20, 80, -20); d.l(62, 20, 80, 20);
      d.c(24, 0, 2.5, "plein"); d.c(62, -20, 2.5, "plein"); d.c(62, 20, 2.5, "plein");
      if (c.p.haut) d.l(24, 0, 60, -19); else d.l(24, 0, 60, 19);
    },
    action(c) { c.p.haut = !c.p.haut; },
    modele: {
      stamp(m, c) {
        const [a, h, b] = c._nets;
        const k = c.p.haut ? h : b;
        if (a !== undefined && k !== undefined) m.g(a, k, 100);
      },
      courants(c, V) {
        const [a, h, b] = c._nets;
        const k = c.p.haut ? h : b;
        if (a === undefined || k === undefined) return [0, 0, 0];
        const i = 100 * (V(a) - V(k));
        return c.p.haut ? [i, -i, 0] : [i, 0, -i];
      }
    }
  };

  R.fusible = {
    nom: "Fusible", court: "Fusible", cat: "Commande", prefixe: "F",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "In", nom: "Calibre", unite: "A", choix: [0.1, 0.5, 1, 2, 5, 10, 16], defaut: 0.5 }],
    dessin(d, c) {
      d.l(0, 0, 20, 0); d.l(60, 0, 80, 0);
      d.r(20, -8, 40, 16, "plein");
      if (!(c.etat && c.etat.grille)) d.l(20, 0, 60, 0); else d.p("M20,0 L34,0 M46,0 L60,0");
      d.t(40, -14, c.p.In + " A", "valeur");
    },
    modele: avecApres(dipole(c => (c.etat && c.etat.grille) ? null : [20, 0]), (c, V, ctx) => {
      const i = c._G ? c._G * u(c, V) : 0;
      c.etat = c.etat || {};
      if (!c.etat.grille && fusion(c.etat, "chauffe", i, c.p.In, ctx.dt)) { c.etat.grille = true; c.etat.change = true; }
      c.etat.alerte = c.etat.grille ? "Fusible fondu : il a coupé une surintensité ou un court-circuit. Trouve la cause avant de le remplacer (« Réparer »)." : Math.abs(i) > 1.1 * c.p.In ? "Surintensité : le fusible chauffe" : "";
    })
  };

  R.ldr = {
    nom: "Photorésistance (LDR)", court: "LDR", cat: "Capteurs", prefixe: "LDR",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "lum", nom: "Lumière reçue", unite: "%", min: 0, max: 100, pas: 1, defaut: 70 }],
    dessin(d, c) {
      d.l(0, 0, 22, 0); d.l(58, 0, 80, 0);
      d.r(22, -8, 36, 16, "plein");
      fleche(d, 20, -30, 30, -14); fleche(d, 32, -32, 42, -16);
      d.t(64, -20, c.p.lum + " %", "valeur");
    },
    resistance(c) { return 1e6 * Math.pow(10, -3.5 * c.p.lum / 100); },
    modele: dipole(c => [1 / R.ldr.resistance(c), 0]),
    mesures(c, V) { const U = u(c, V); return [["Résistance", LS.si(R.ldr.resistance(c), "Ω")], ["Tension", LS.si(U, "V")], ["Courant", LS.si(U / R.ldr.resistance(c), "A")]]; }
  };

  R.moteur = {
    nom: "Moteur à courant continu", court: "Moteur", cat: "Récepteurs", prefixe: "M",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "charge", nom: "Charge mécanique (couple résistant)", unite: "%", min: 0, max: 100, pas: 1, defaut: 10 }],
    k: 0.012, R: 2, L: 0.002, J: 2e-5, b: 2e-6,
    dessin(d, c) {
      d.l(0, 0, 24, 0); d.l(56, 0, 80, 0);
      d.c(40, 0, 16, "plein");
      d.t(40, 5, "M", "txt gros");
      const ailette = d.l(40, 0, 40, -13, "corps aiguille");
      const vit = d.t(40, 34, "", "valeur");
      return (c2, dtVisuel) => {
        c2._angle = (c2._angle || 0) + (c2._w || 0) * dtVisuel * 0.02;
        const a = c2._angle;
        ailette.setAttribute("x2", 40 + 13 * Math.sin(a)); ailette.setAttribute("y2", -13 * Math.cos(a));
        vit.textContent = Math.round(Math.abs(c2._w || 0) * 60 / (2 * Math.PI)) + " tr/min";
      };
    },
    modele: {
      init(c) { c._w = c._w || 0; },
      stamp(m, c, V, ctx) {
        if (ouvert(c)) return;
        const M = R.moteur;
        // Induit : u = R·i + L·di/dt + kΩ (Euler implicite) → i = (u − kΩ + (L/dt)·i_préc) / (R + L/dt)
        const z = M.R + M.L / ctx.dt;
        c._G = 1 / z; c._J = (-M.k * c._w + (M.L / ctx.dt) * (c._i0 || 0)) / z;
        m.g(c._nets[0], c._nets[1], c._G); m.j(c._nets[0], c._nets[1], c._J);
      },
      apres(c, V, ctx) {
        if (ouvert(c)) { c._i0 = 0; return; }
        const M = R.moteur;
        const i = c._G * u(c, V) + c._J;
        c._i0 = i;
        const couple = M.k * i, cr = 0.03 * c.p.charge / 100;
        let acc = couple - M.b * c._w;
        if (Math.abs(c._w) > 0.5) acc -= cr * Math.sign(c._w);
        else if (Math.abs(acc) <= cr) acc = 0; // collé : le couple ne vainc pas la charge
        else acc -= cr * Math.sign(acc);
        c._w += acc / M.J * ctx.dt;
        c.etat = c.etat || {};
        c.etat.alerte = Math.abs(c._w) < 1 && Math.abs(i) > 0.3 ? "Moteur calé : tout le courant chauffe le bobinage" : "";
      },
      courants(c) { return [c._i0 || 0, -(c._i0 || 0)]; }
    },
    mesures(c, V) {
      const M = R.moteur, U = u(c, V), I = c._i0 || 0, E = M.k * (c._w || 0);
      return [["Tension U", LS.si(U, "V")], ["Courant I", LS.si(I, "A")], ["Vitesse", Math.round((c._w || 0) * 60 / (2 * Math.PI)) + " tr/min"],
        ["Force contre-électromotrice E = kΩ", LS.si(E, "V")], ["Couple moteur C = kI", LS.si(M.k * I, "N·m")], ["Puissance mécanique E·I", LS.si(E * I, "W")]];
    }
  };

  R.relais = {
    nom: "Relais (bobine + contact)", court: "Relais", cat: "Commande", prefixe: "KA",
    bornes: [[0, 0], [0, 4], [3, 0], [3, 4]],
    props: [{ k: "Ub", nom: "Tension de la bobine", unite: "V", choix: [5, 6, 12, 24], defaut: 6 }],
    dessin(d, c) {
      d.l(0, 0, 0, 26); d.l(0, 54, 0, 80);
      d.r(-10, 26, 20, 28, "plein"); d.l(-10, 54, 10, 26);
      d.l(60, 0, 60, 24); d.l(60, 58, 60, 80);
      d.c(60, 58, 2.5, "plein");
      const ferme = c._colle;
      if (ferme) d.l(60, 58, 62, 24); else d.l(60, 58, 76, 28);
      d.p(`M10,40 L${ferme ? 61 : 68},40`, "pointille");
      d.t(-24, 44, c.p.Ub + "V", "valeur");
    },
    modele: {
      init(c) { c._colle = !!c._colle; c._il = c._il || 0; },
      stamp(m, c, V, ctx) {
        const [a, b, k1, k2] = c._nets;
        const rb = c.p.Ub * c.p.Ub / 0.36; // bobine ≈ 0,36 W
        const L = 0.003 * rb;               // constante de temps L/R ≈ 3 ms (0,3 H pour un relais 6 V)
        const z = rb + L / ctx.dt;
        c._gb = 1 / z; c._jb = (L / ctx.dt) * (c._il || 0) / z;
        if (a !== undefined && b !== undefined) { m.g(a, b, c._gb); m.j(a, b, c._jb); }
        if (c._colle && k1 !== undefined && k2 !== undefined) m.g(k1, k2, 100);
      },
      apres(c, V) {
        const [a, b] = c._nets;
        const i = (a !== undefined && b !== undefined) ? c._gb * (V(a) - V(b)) + c._jb : 0;
        c._il = i;
        const inom = 0.36 / c.p.Ub;
        const avant = c._colle;
        if (Math.abs(i) > 0.7 * inom) c._colle = true;
        else if (Math.abs(i) < 0.3 * inom) c._colle = false;
        if (avant !== c._colle) { c.etat = c.etat || {}; c.etat.change = true; }
      },
      courants(c, V) {
        const [a, b, k1, k2] = c._nets;
        const ib = (a !== undefined && b !== undefined) ? c._gb * (V(a) - V(b)) + c._jb : 0;
        const ik = (c._colle && k1 !== undefined && k2 !== undefined) ? 100 * (V(k1) - V(k2)) : 0;
        return [ib, -ib, ik, -ik];
      }
    },
    mesures(c, V) {
      const [a, b] = c._nets;
      const ib = c._il || 0;
      return [["Courant dans la bobine", LS.si(ib, "A")], ["Contact", c._colle ? "fermé (bobine alimentée)" : "ouvert"]];
    }
  };

  R.npn = {
    nom: "Transistor NPN", court: "NPN", cat: "Semi-conducteurs", prefixe: "T",
    bornes: [[0, 0], [2, -2], [2, 2]],
    props: [{ k: "beta", nom: "Gain en courant β", unite: "", min: 20, max: 400, pas: 10, defaut: 100 },
      { k: "modele", nom: "Modèle", choix: ["BC547 (petit signal)", "TIP31 (puissance)"], defaut: "BC547 (petit signal)" }],
    dessin(d) {
      d.c(30, 0, 18, "plein");
      d.l(0, 0, 20, 0); d.l(20, -11, 20, 11, "corps epais");
      d.l(20, -6, 40, -18); d.l(40, -18, 40, -40);
      d.l(20, 6, 40, 18); d.l(40, 18, 40, 40);
      d.p("M40,18 L31,17 M40,18 L35,10");
      d.t(8, -8, "B", "txt"); d.t(50, -28, "C", "txt"); d.t(50, 34, "E", "txt");
    },
    modele: bipolaire(1),
    mesures(c, V) {
      const [B, C, E] = c._nets, i = c._i || [0, 0, 0];
      const vce = V(C) - V(E), ib = i[0], ic = i[1];
      const regime = ib < 1e-6 ? "bloqué (pas de courant de base)" : vce < 0.3 ? "saturé (interrupteur fermé)" : "linéaire (amplification Ic = β·Ib)";
      const lim = limitesTransistor(c);
      return [["Courant de base Ib", LS.si(ib, "A")], ["Courant collecteur Ic", LS.si(ic, "A")], ["Vbe", LS.si(V(B) - V(E), "V")], ["Vce", LS.si(vce, "V")], ["Ic / Ib", ib > 1e-9 ? LS.nombre(ic / ib, 1) : "—"], ["Régime", regime],
        ["Limites", "Ic ≤ " + LS.si(lim.icmax, "A") + ", Vce ≤ " + lim.vceo + " V, P ≤ " + LS.si(lim.pnom, "W")]];
    }
  };

  R.pnp = {
    nom: "Transistor PNP", court: "PNP", cat: "Semi-conducteurs", prefixe: "T",
    bornes: [[0, 0], [2, -2], [2, 2]],
    props: [{ k: "beta", nom: "Gain en courant β", unite: "", min: 20, max: 400, pas: 10, defaut: 100 },
      { k: "modele", nom: "Modèle", choix: ["BC557 (petit signal)", "TIP32 (puissance)"], defaut: "BC557 (petit signal)" }],
    dessin(d) {
      d.c(30, 0, 18, "plein");
      d.l(0, 0, 20, 0); d.l(20, -11, 20, 11, "corps epais");
      d.l(20, -6, 40, -18); d.l(40, -18, 40, -40);
      d.l(20, 6, 40, 18); d.l(40, 18, 40, 40);
      d.p("M22,7 L31,8 M22,7 L27,15");
      d.t(8, -8, "B", "txt"); d.t(50, -28, "C", "txt"); d.t(50, 34, "E", "txt");
    },
    modele: bipolaire(-1),
    mesures(c, V) {
      const [B, C, E] = c._nets, i = c._i || [0, 0, 0];
      return [["Courant de base (sortant)", LS.si(-i[0], "A")], ["Courant collecteur (sortant)", LS.si(-i[1], "A")], ["Veb", LS.si(V(E) - V(B), "V")], ["Vec", LS.si(V(E) - V(C), "V")]];
    }
  };

  R.voltmetre = {
    nom: "Voltmètre", court: "Voltmètre", cat: "Mesure", prefixe: "V",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "mode", nom: "Mode", choix: ["continu (DC)", "alternatif (AC, efficace)"], defaut: "continu (DC)" }],
    dessin(d, c) {
      d.l(0, 0, 24, 0); d.l(56, 0, 80, 0);
      d.c(40, 0, 16, "plein"); d.t(40, 5, "V", "txt gros");
      d.t(14, -8, "+", "txt"); d.t(66, -8, "COM", "txt petit");
      d.r(10, -46, 60, 22, "ecran", 4);
      const t = d.t(40, -30, "", "lecture");
      return c2 => { t.textContent = R.voltmetre.lecture(c2); };
    },
    lecture(c) { return c._mesure === undefined ? "—" : LS.si(c._mesure, "V"); },
    modele: avecApres(dipole(() => [1e-7, 0]), (c, V, ctx) => {
      const x = u(c, V);
      if (c.p.mode && c.p.mode.startsWith("alternatif")) {
        const a = Math.min(1, ctx.dt / 0.2);
        c._carre = (c._carre || 0) * (1 - a) + x * x * a;
        c._mesure = Math.sqrt(c._carre);
      } else {
        // Mode continu : valeur moyenne (deux filtres de 0,1 s en cascade), comme un vrai multimètre :
        // ≈ 0 V sur une sinusoïde de 50 Hz (ondulation résiduelle < 1 % de la crête).
        const a = c._moy === undefined ? 1 : Math.min(1, ctx.dt / 0.1);
        c._moy1 = (c._moy === undefined ? x : c._moy1 * (1 - a) + x * a);
        c._moy = (c._moy || 0) * (1 - a) + c._moy1 * a;
        c._mesure = c._moy;
      }
    }),
    mesures(c) { return [["Lecture", R.voltmetre.lecture(c)], ["Branchement", "en dérivation (en parallèle)"]]; }
  };

  R.amperemetre = {
    nom: "Ampèremètre", court: "Ampèremètre", cat: "Mesure", prefixe: "A",
    bornes: [[0, 0], [4, 0]],
    props: [{ k: "mode", nom: "Mode", choix: ["continu (DC)", "alternatif (AC, efficace)"], defaut: "continu (DC)" }],
    dessin(d, c) {
      d.l(0, 0, 24, 0); d.l(56, 0, 80, 0);
      d.c(40, 0, 16, "plein"); d.t(40, 5, "A", "txt gros");
      d.t(14, -8, "+", "txt"); d.t(66, -8, "COM", "txt petit");
      d.r(10, -46, 60, 22, "ecran", 4);
      const t = d.t(40, -30, "", "lecture");
      return c2 => { t.textContent = c2._mesure === undefined ? "—" : LS.si(c2._mesure, "A"); };
    },
    modele: avecApres(dipole(() => [1000, 0]), (c, V, ctx) => {
      const x = 1000 * u(c, V);
      if (c.p.mode && c.p.mode.startsWith("alternatif")) {
        const a = Math.min(1, ctx.dt / 0.2);
        c._carre = (c._carre || 0) * (1 - a) + x * x * a;
        c._mesure = Math.sqrt(c._carre);
      } else {
        const a = c._moy === undefined ? 1 : Math.min(1, ctx.dt / 0.1);
        c._moy1 = (c._moy === undefined ? x : c._moy1 * (1 - a) + x * a);
        c._moy = (c._moy || 0) * (1 - a) + c._moy1 * a;
        c._mesure = c._moy;
      }
    }),
    mesures(c) { return [["Lecture", c._mesure === undefined ? "—" : LS.si(c._mesure, "A")], ["Branchement", "en série (le courant le traverse)"]]; }
  };

  /* Multimètre numérique : instrument posé par ses deux pointes (borne 0 = rouge, borne 1 = noire/COM).
     Ce qu'il fait dépend de la douille du cordon rouge ET du sélecteur, comme un vrai appareil :
     - douille « mA » ou « 10A » : un shunt de faible résistance relie les pointes (mesure de courant) ;
     - douille « VΩ » + V : 10 MΩ ; + Ω / continuité / diode : petite source de test interne. */
  R.multimetre = {
    nom: "Multimètre", cache: true, prefixe: "MM",
    bornes: [[0, 0], [1, 0]],
    props: [],
    SHUNT: { "mA": 1, "10A": 0.01 }, FUSIBLE: { "mA": 0.2, "10A": 10 },
    TEST: { U: 3, R: 3000 }, // source d'essai de l'ohmmètre : 3 V à travers 3 kΩ (≈ 1 mA)
    modele: {
      init(c) { c.etat = c.etat || {}; },
      stamp(m, c) {
        if (ouvert(c)) { c._G = undefined; return; }
        const M = R.multimetre, e = c.etat || {};
        c._G = undefined; c._J = 0;
        if (c.p.sel === "OFF") return;
        if (c.p.douille !== "VΩ") {
          if (e.fusible && e.fusible[c.p.douille]) return; // fusible interne grillé
          c._G = 1 / M.SHUNT[c.p.douille];
        } else if (c.p.sel === "V⎓" || c.p.sel === "V~") c._G = 1e-7;
        else { c._G = 1 / M.TEST.R; c._J = -M.TEST.U / M.TEST.R; } // la pointe rouge « pousse » le courant d'essai
        m.g(c._nets[0], c._nets[1], c._G);
        if (c._J) m.j(c._nets[0], c._nets[1], c._J);
      },
      apres(c, V, ctx) {
        const M = R.multimetre;
        c.etat = c.etat || {};
        const e = c.etat;
        const x = ouvert(c) ? 0 : u(c, V);
        const i = c._G === undefined ? 0 : c._G * x + c._J; // courant de la pointe rouge vers la noire, dans l'appareil
        const a = Math.min(1, ctx.dt / 0.25);
        c._moy = (c._moy || 0) * (1 - a) + x * a;
        c._carre = (c._carre || 0) * (1 - a) + x * x * a;
        c._imoy = (c._imoy || 0) * (1 - a) + i * a;
        c._icarre = (c._icarre || 0) * (1 - a) + i * i * a;
        c._u = x; c._iInst = i;
        if (c.p.douille !== "VΩ" && c._G !== undefined) {
          if (fusion(e, "chauffeF", i, M.FUSIBLE[c.p.douille], ctx.dt)) { e.fusible = e.fusible || {}; e.fusible[c.p.douille] = true; e.chauffeF = 0; e.change = true; }
        }
      },
      courants(c) { const i = c._iInst || 0; return [i, -i]; }
    },
    /* Ce qu'affiche l'écran : { texte, unite, alerte, bip }. */
    affichage(c) {
      const M = R.multimetre, e = c.etat || {}, sel = c.p.sel, d = c.p.douille;
      const pointesPosees = c._nets && c._nets.length === 2 && c._posees;
      const res = { texte: "", unite: "", alerte: "", bip: false };
      if (sel === "OFF") return res;
      const fus = e.fusible && d !== "VΩ" && e.fusible[d];
      if (fus) res.alerte = "Fusible interne " + (d === "mA" ? "200 mA" : "10 A") + " grillé : remplace-le";
      const auto = (v, unite, max) => {
        if (Math.abs(v) > max) return { texte: "OL", unite: unite };
        const a = Math.abs(v);
        const pref = a >= 1e6 ? [1e6, "M"] : a >= 1e3 ? [1e3, "k"] : a >= 1 || a === 0 ? [1, ""] : a >= 1e-3 ? [1e-3, "m"] : [1e-6, "µ"];
        const y = v / pref[0];
        const dec = Math.abs(y) >= 100 ? 1 : Math.abs(y) >= 10 ? 2 : 3;
        return { texte: y.toFixed(dec), unite: pref[1] + unite };
      };
      if (sel === "V⎓" || sel === "V~") {
        if (d !== "VΩ") res.alerte = res.alerte || "Cordon rouge dans la douille " + d + " : en position tension, c'est un court-circuit !";
        const v = sel === "V~" ? Math.sqrt(c._carre || 0) : (c._moy || 0);
        Object.assign(res, auto(Math.abs(v) < 5e-4 ? 0 : v, "V", 1000));
      } else if (sel === "A⎓" || sel === "A~") {
        if (d === "VΩ") res.alerte = res.alerte || "En position courant, le cordon rouge doit être dans la douille mA ou 10A";
        const i = d === "VΩ" ? 0 : sel === "A~" ? Math.sqrt(c._icarre || 0) : (c._imoy || 0);
        Object.assign(res, auto(Math.abs(i) < 1e-6 ? 0 : i, "A", d === "mA" ? 0.2 : 10));
      } else {
        if (d !== "VΩ") { res.alerte = res.alerte || "Pour Ω, continuité et diode, le cordon rouge va dans la douille VΩ"; res.texte = "0.000"; return res; }
        const v = c._u || 0;
        const i = (M.TEST.U - v) / M.TEST.R; // courant d'essai qui sort de la pointe rouge
        if (sel === "▶|") {
          Object.assign(res, v > 2.0 ? { texte: "OL", unite: "V" } : auto(v, "V", 2));
        } else {
          let r = i > 1e-9 ? v / i : Infinity;
          if (v < -0.01) { res.alerte = "Mesure faussée : le circuit est sous tension (coupe l'alimentation)"; r = Math.abs(r); }
          if (sel === "•))") { res.bip = r < 50; Object.assign(res, r > 2000 ? { texte: "OL", unite: "Ω" } : auto(r, "Ω", 2000)); }
          else Object.assign(res, auto(r, "Ω", 40e6));
        }
        // La source d'essai fait au plus 3 V et pousse le courant vers l'extérieur : une tension plus forte
        // ou un courant qui entre dans l'appareil viennent du circuit, qui est alimenté.
        if (v > M.TEST.U + 0.05 || (c._iInst || 0) > 1e-6) res.alerte = res.alerte || "Le circuit est sous tension : coupe l'alimentation avant de mesurer en Ω, continuité ou diode (la mesure est fausse et l'appareil peut souffrir)";
      }
      if (!pointesPosees) res.alerte = res.alerte || "Pose les deux pointes sur le circuit";
      return res;
    }
  };

  R.masse = {
    nom: "Masse (référence 0 V)", court: "Masse", cat: "Sources", prefixe: "GND", masse: true,
    bornes: [[0, 0]], props: [],
    dessin(d) { d.l(0, 0, 0, 12); d.l(-12, 12, 12, 12); d.l(-7, 17, 7, 17); d.l(-3, 22, 3, 22); }
  };

  LS.composantsElec = R;
})(typeof window !== "undefined" ? window : globalThis);
