/* Énergie solaire et batteries : courbe I-V d'un panneau (modèle à une diode, ombrage et diodes
   bypass), batterie 12 V plomb ou LiFePO4 (tension selon la charge, Peukert, charge CC/CV, cycles),
   régulateur PWM ou MPPT, dimensionnement d'une installation autonome heure par heure.
   Les fonctions de calcul (LS.ivPanneau, LS.pasBatterie, LS.simulerInstallation…) sont pures et
   testées sous Node (tests/solaire.test.js). */
(function () {
  "use strict";
  const LS = window.LS = window.LS || {};
  LS.sims = LS.sims || {};
  const D = () => LS.dessin;
  const KB = 1.380649e-23, QE = 1.602176634e-19, EG = 1.12;   // Boltzmann, charge élémentaire, gap du silicium (eV)

  /* ---------- Panneau : modèle à une diode, cellule par cellule ---------- */
  // Paramètres aux conditions standard (STC : 1 000 W/m², cellule à 25 °C), valeurs typiques de fiches techniques.
  LS.MODULES_PV = {
    m60: { nom: "60 cellules (≈ 290 Wc)", Ns: 60, groupes: 3, Isc: 9.8, Voc: 39.6, n: 1.1, Rs: 0.35, Rsh: 350, alphaI: 0.0005 },
    m36: { nom: "36 cellules, panneau « 12 V » (≈ 100 Wc)", Ns: 36, groupes: 2, Isc: 5.9, Voc: 22.2, n: 1.1, Rs: 0.25, Rsh: 220, alphaI: 0.0005 }
  };
  const VBR = 18;          // tension de claquage inverse d'une cellule (V) : au-delà, la cellule conduit à l'envers
  const VBYPASS = 0.6;     // seuil d'une diode bypass (Schottky ≈ 0,4-0,7 V)

  LS.tempCellule = (Ta, G, noct) => Ta + ((noct || 45) - 20) / 800 * G;

  // Paramètres d'une cellule pour un éclairement G (W/m²) et une température de cellule Tc (°C).
  function cellule(mod, G, Tc) {
    const T = Tc + 273.15, Tr = 298.15, nVt = mod.n * KB * T / QE, nVtr = mod.n * KB * Tr / QE;
    const I0r = mod.Isc / (Math.exp(mod.Voc / mod.Ns / nVtr) - 1);
    const I0 = I0r * Math.pow(T / Tr, 3) * Math.exp(QE * EG / (mod.n * KB) * (1 / Tr - 1 / T));
    return { Iph: mod.Isc * G / 1000 * (1 + mod.alphaI * (Tc - 25)), I0, nVt, rs: mod.Rs / mod.Ns, rsh: mod.Rsh / mod.Ns };
  }
  // Tension d'une cellule traversée par le courant I (résolution par dichotomie, claquage inverse borné).
  function vCellule(c, I) {
    const f = V => c.Iph - c.I0 * (Math.exp((V + I * c.rs) / c.nVt) - 1) - (V + I * c.rs) / c.rsh - I;
    if (f(-VBR) <= 0) return -VBR;
    let a = -VBR, b = 1.2;
    for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (f(m) > 0) a = m; else b = m; }
    return (a + b) / 2;
  }
  /* Modèle du panneau (ou d'une chaîne de « serie » panneaux identiques).
     p : { module, G, Tc, ombre (0-1 : part de lumière perdue par UNE cellule), bypass, serie } */
  LS.modelePanneau = function (p) {
    const mod = LS.MODULES_PV[p.module || "m60"], serie = p.serie || 1;
    const cN = cellule(mod, p.G, p.Tc), cO = cellule(mod, p.G * (1 - (p.ombre || 0)), p.Tc);
    const parGroupe = mod.Ns / mod.groupes;
    // Tension d'un panneau pour un courant I ; renvoie aussi la puissance dissipée dans la cellule ombragée.
    function v(I) {
      const vn = vCellule(cN, I), vo = p.ombre ? vCellule(cO, I) : vn;
      let total = 0, groupeOmbre = (parGroupe - 1) * vn + vo;
      const bypassOmbre = p.bypass && groupeOmbre < -VBYPASS;
      if (bypassOmbre) groupeOmbre = -VBYPASS;
      let autres = parGroupe * vn;
      const bypassAutres = p.bypass && autres < -VBYPASS;
      if (bypassAutres) autres = -VBYPASS;
      total = groupeOmbre + (mod.groupes - 1) * autres;
      return { V: total * serie, Pcellule: bypassOmbre ? 0 : Math.max(0, -vo * I), bypass: bypassOmbre };
    }
    return { mod, serie, cN, cO, v, Imax: Math.max(cN.Iph, 1e-6) * 1.02 };
  };
  // Courbe I-V (V ≥ 0), point de puissance maximale, Voc, Isc.
  LS.ivPanneau = function (p, nb) {
    const m = LS.modelePanneau(p), N = nb || 160, pts = [];
    for (let k = 0; k <= N; k++) {
      const I = m.Imax * k / N, r = m.v(I);
      if (r.V < 0) { if (pts.length) { const [V0, I0] = pts[pts.length - 1]; pts.push([0, I0 + (I - I0) * V0 / (V0 - r.V)]); } break; }
      pts.push([r.V, I]);
    }
    let best = 0;
    pts.forEach((q, i) => { if (q[0] * q[1] > pts[best][0] * pts[best][1]) best = i; });
    // Affinage du maximum entre les deux points voisins (recherche par section dorée sur le courant).
    let a = pts[Math.max(0, best - 1)][1], b = pts[Math.min(pts.length - 1, best + 1)][1];
    const P = I => { const V = m.v(I).V; return V > 0 ? V * I : 0; };
    for (let k = 0; k < 40; k++) { const x1 = b - 0.618 * (b - a), x2 = a + 0.618 * (b - a); if (P(x1) > P(x2)) b = x2; else a = x1; }
    const Imp = (a + b) / 2, Vmp = m.v(Imp).V;
    const Isc = pts.length ? pts[pts.length - 1][1] : 0;
    return { pts, Voc: m.v(0).V, Isc, Vmp, Imp, Pmp: Vmp * Imp, modele: m };
  };
  // Point de fonctionnement sur une résistance R : V = R·I (V(I) décroît, une seule intersection).
  LS.pointSurCharge = function (p, R) {
    const m = LS.modelePanneau(p);
    let a = 0, b = m.Imax;
    for (let k = 0; k < 50; k++) { const I = (a + b) / 2; if (m.v(I).V - R * I > 0) a = I; else b = I; }
    const I = (a + b) / 2, r = m.v(I);
    return { I, V: Math.max(0, r.V), P: I * Math.max(0, r.V), Pcellule: r.Pcellule };
  };
  // Courant fourni quand la tension du panneau (ou de la chaîne) est imposée (cas du régulateur PWM).
  LS.courantSousTension = function (p, V) {
    const m = LS.modelePanneau(p);
    if (m.v(0).V <= V) return 0;
    let a = 0, b = m.Imax;
    for (let k = 0; k < 50; k++) { const I = (a + b) / 2; if (m.v(I).V > V) a = I; else b = I; }
    return (a + b) / 2;
  };

  /* ---------- Batterie 12 V : plomb (AGM) ou lithium fer phosphate ---------- */
  const OCV_LFP = [[0, 2.5], [0.03, 3.0], [0.1, 3.18], [0.2, 3.24], [0.3, 3.27], [0.5, 3.29], [0.7, 3.31], [0.9, 3.33], [0.97, 3.38], [1, 3.45]];
  const interp = (t, x) => { if (x <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return t[t.length - 1][1]; };
  LS.BATTERIES = {
    plomb: { nom: "Plomb AGM", peukert: 1.15, vMin: 10.5, vAbs: 14.4, vFloat: 13.6, dodConseil: 0.5, whKg: 35,
      ocv: s => 11.8 + 0.93 * s - 0.8 * Math.exp(-s / 0.04),          // 12,7 V pleine, 12,2 V à 50 %, ≈ 11,8 V vide (au repos)
      r: (s, C) => 0.6 / C * (1 + 2 * (1 - s) * (1 - s)),             // ≈ 6 mΩ pleine pour 100 Ah, 18 mΩ vide
      rCharge: (s, C) => (2 + 120 * Math.exp(-(1 - s) / 0.09)) / C,   // résistance apparente en charge : 14,4 V atteints vers 80 %, fin de charge lente
      rendement: s => s < 0.8 ? 0.95 : 0.95 - 0.35 * Math.pow((s - 0.8) / 0.2, 2), // dégagement gazeux en fin de charge
      cycles: dod => 300 * Math.pow(Math.max(0.05, dod) / 0.8, -1.3) },
    lifepo4: { nom: "Lithium fer phosphate (LiFePO4, BMS)", peukert: 1.02, vMin: 10.0, vAbs: 14.2, vFloat: 13.5, dodConseil: 0.8, whKg: 110,
      ocv: s => 4 * interp(OCV_LFP, s),
      r: (s, C) => 0.25 / C * (1 + 0.5 * (1 - s)),
      rCharge: (s, C) => (0.3 + 30 * Math.exp(-(1 - s) / 0.02)) / C,
      rendement: () => 0.99,
      cycles: dod => Math.min(10000, 4000 * Math.pow(Math.max(0.05, dod) / 0.8, -1.1)) }
  };
  /* Limites de courant (ordres de grandeur de fiches techniques ; C = capacité en Ah, « 1 C » = C ampères).
     LiFePO4 avec BMS : décharge continue ≈ 1 C, au-delà le BMS coupe ; charge recommandée ≤ 0,5 C, coupée au-delà
     de 1 C ; charge interdite sous 0 °C (le BMS la bloque). Plomb AGM : charge recommandée 0,1 à 0,2 C (au-delà de
     0,3 C, échauffement et dégagement gazeux) ; décharge au-delà de 0,5 C possible mais avec forte perte (Peukert)
     et échauffement. Le plomb n'a pas de BMS : rien ne coupe, c'est à l'utilisateur de respecter les limites. */
  LS.limitesBatterie = function (chimie, C, I, T) {
    const x = Math.abs(I) / C, charge = I < 0, temp = T === undefined ? 25 : T;
    if (chimie === "lifepo4") {
      if (charge && temp < 0) return { niveau: "coupure", msg: "BMS : charge bloquée sous 0 °C (le lithium se déposerait en métal sur l'anode)" };
      if (x > 1) return { niveau: "coupure", msg: "BMS : surintensité (" + (charge ? "charge" : "décharge") + " à " + x.toFixed(1).replace(".", ",") + " C, maximum ≈ 1 C)" };
      if (charge && x > 0.5) return { niveau: "alerte", msg: "charge à " + x.toFixed(2).replace(".", ",") + " C : accepté, mais au-dessus des 0,5 C recommandés" };
      return { niveau: "ok", msg: "" };
    }
    if (charge && x > 0.3) return { niveau: "alerte", msg: "charge à " + x.toFixed(2).replace(".", ",") + " C : trop fort pour du plomb (0,1 à 0,2 C conseillés) : il chauffe et dégaze" };
    if (!charge && x > 0.5) return { niveau: "alerte", msg: "décharge à " + x.toFixed(2).replace(".", ",") + " C : très forte pour du plomb (capacité réduite, échauffement)" };
    return { niveau: "ok", msg: "" };
  };
  /* Effet de la température moyenne sur la durée de vie. Plomb : règle usuelle des fabricants, durée de vie
     divisée par 2 tous les 10 °C au-dessus de 25 °C. LiFePO4 : moins sensible ; on applique un effet deux fois
     plus faible (division par 2 tous les 20 °C au-dessus de 25 °C), ordre de grandeur seulement. */
  LS.facteurVieTemperature = (chimie, T) => T <= 25 ? 1 : Math.pow(0.5, (T - 25) / (chimie === "plomb" ? 10 : 20));
  // Capacité réellement disponible à courant constant (loi de Peukert, capacité nominale donnée en 20 h).
  LS.capaciteEffective = (chimie, C, I) => I <= 0 ? C : C * Math.pow(C / (20 * I), LS.BATTERIES[chimie].peukert - 1);
  /* Un pas de simulation. b : { chimie, C (Ah), soc }. I > 0 : décharge ; I < 0 : charge (courant proposé).
     Renvoie la tension aux bornes et le courant réellement accepté (limité par la tension de charge : CC puis CV). */
  LS.pasBatterie = function (b, I, h, vCharge) {
    const k = LS.BATTERIES[b.chimie], C = b.C, ocv = k.ocv(b.soc);
    const lim = LS.limitesBatterie(b.chimie, C, I, b.T);
    if (lim.niveau === "coupure") return { V: ocv, I: 0, coupure: I > 0, bms: lim.msg, phase: "coupée (" + lim.msg + ")" };
    if (I > 0) {
      const V = ocv - I * k.r(b.soc, C);
      if (V < k.vMin || b.soc <= 0) return { V: Math.max(V, 0), I: 0, coupure: true, phase: "coupure" };
      b.soc = Math.max(0, b.soc - Math.pow(I * 20 / C, k.peukert) / 20 * h);
      return { V, I, phase: "décharge" };
    }
    if (I < 0) {
      const rc = k.rCharge(b.soc, C), vc = vCharge || k.vAbs;
      let Ic = -I, phase = "CC (courant constant)";
      if (ocv + Ic * rc > vc) { Ic = Math.max(0, (vc - ocv) / rc); phase = "CV (tension constante)"; }
      b.soc = Math.min(1, b.soc + k.rendement(b.soc) * Ic / C * h);
      return { V: ocv + Ic * rc, I: -Ic, phase };
    }
    return { V: ocv, I: 0, phase: "repos" };
  };

  /* ---------- Régulateur : PWM ou MPPT ---------- */
  LS.VMAX_PWM = 50;   // tension d'entrée maximale d'un régulateur PWM 12/24 V courant (V), ordre de grandeur
  // Puissance livrée à la batterie (tension Vbat) par un panneau ou une chaîne.
  LS.regulateur = function (p, type, Vbat, opts) {
    opts = opts || {};
    const iv = LS.ivPanneau(p, 100);
    if (type === "pwm") {
      // Interrupteur entre panneau et batterie : le panneau est tiré à la tension de la batterie (+ chutes).
      const I = LS.courantSousTension(p, Vbat + 0.3);
      return { P: Vbat * I, Vpanneau: Vbat + 0.3, Ipanneau: I, Pmp: iv.Pmp, iv };
    }
    // MPPT : convertisseur continu-continu qui tient le panneau au point de puissance maximale.
    const eta = opts.eta || 0.96, Imax = opts.Imax || 30;
    let P = eta * iv.Pmp, limite = false;
    let Vp = iv.Vmp, Ip = iv.Imp;
    if (iv.Vmp < Vbat + 1) {                                  // un abaisseur doit recevoir plus que la batterie : il se place au plus près
      Vp = Vbat + 1; Ip = LS.courantSousTension(p, Vp); P = eta * Vp * Ip;
    }
    if (P / Vbat > Imax) { P = Imax * Vbat; limite = true; }
    return { P, Vpanneau: Vp, Ipanneau: Ip, Pmp: iv.Pmp, iv, limite };
  };
  // Journée claire : éclairement en cloche entre 6 h et 18 h, température de l'air sinusoïdale.
  LS.journeeSolaire = function (p, Vbat, pas) {
    pas = pas || 0.25;
    let Epwm = 0, Emppt = 0, Edispo = 0;
    for (let h = 6 + pas / 2; h < 18; h += pas) {
      const G = p.Gcrete * Math.sin(Math.PI * (h - 6) / 12), Ta = p.Ta + 4 * Math.sin(Math.PI * (h - 9) / 12);
      const q = Object.assign({}, p, { G, Tc: LS.tempCellule(Ta, G) });
      const a = LS.regulateur(q, "pwm", Vbat), b = LS.regulateur(q, "mppt", Vbat);
      Epwm += a.P * pas; Emppt += b.P * pas; Edispo += b.Pmp * pas;
    }
    return { Epwm, Emppt, Edispo };
  };

  /* ---------- Installation autonome : simulation heure par heure ---------- */
  // Irradiation mensuelle moyenne sur un plan incliné (kWh/m²/jour), ordres de grandeur de type PVGIS.
  LS.SITES_SOLAIRES = {
    bamako: { nom: "Bamako (Mali)", lat: 12.6, H: [6.0, 6.5, 6.6, 6.4, 6.2, 5.8, 5.4, 5.1, 5.4, 5.9, 6.0, 5.8], T: [31, 34, 37, 38, 36, 33, 30, 29, 30, 32, 33, 31] },
    dakar: { nom: "Dakar (Sénégal)", lat: 14.7, H: [5.6, 6.4, 7.0, 7.0, 6.6, 6.0, 5.4, 5.1, 5.5, 5.8, 5.6, 5.3], T: [25, 25, 25, 25, 26, 28, 29, 29, 30, 30, 28, 26] },
    paris: { nom: "Paris (France)", lat: 48.9, H: [1.5, 2.4, 3.5, 4.6, 5.0, 5.2, 5.3, 4.9, 4.1, 2.8, 1.7, 1.2], T: [6, 7, 11, 14, 18, 22, 24, 24, 20, 15, 10, 7] }
  };
  LS.MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  // Durée du jour selon la latitude et le mois (déclinaison du soleil).
  LS.dureeJour = function (lat, mois) {
    const n = 15 + 30.4 * mois, dec = 23.44 * Math.sin(2 * Math.PI * (284 + n) / 365) * Math.PI / 180;
    const x = -Math.tan(lat * Math.PI / 180) * Math.tan(dec);
    return 24 / Math.PI * Math.acos(Math.max(-1, Math.min(1, x)));
  };
  // Appareils : puissance (W) et heures de fonctionnement selon les réglages.
  LS.profilConsommation = function (p) {
    const h = new Array(24).fill(0);
    const plage = (debut, duree, P) => { for (let k = 0; k < duree; k++) h[(debut + k) % 24] += P; };
    plage(18, 5, 7 * p.lampes); plage(5, 1, 7 * p.lampes);         // LED 7 W : soirée et petit matin
    plage(19, 2, 10 * p.telephones);                                 // chargeurs 10 W
    plage(13, p.ventilateur, 40);                                    // ventilateur 40 W
    plage(19, p.tv, 60);                                             // téléviseur 60 W
    plage(9, p.ordinateur, 50);                                      // ordinateur portable 50 W
    if (p.frigo) for (let k = 0; k < 24; k++) h[k] += 60 * (k >= 10 && k < 18 ? 0.45 : 0.28); // compresseur 60 W, plus souvent en journée
    if (p.pompe) plage(10, 2, 400);                                  // pompe 400 W, 2 h en milieu de journée
    return h;
  };
  LS.simulerInstallation = function (p) {
    const site = LS.SITES_SOLAIRES[p.site], bat = LS.BATTERIES[p.chimie];
    const jours = p.jours || 7, H = site.H[p.mois], Ta = site.T[p.mois], duree = LS.dureeJour(site.lat, p.mois), lever = 12 - duree / 2;
    // Rendement de la chaîne : salissures et câbles (0,9) × température des cellules × régulateur.
    const Tc = Ta + 22, etaTemp = 1 - 0.0037 * (Tc - 25), etaReg = p.regulateur === "pwm" ? 0.75 : 0.96;
    const pr = 0.9 * etaTemp * etaReg, etaOnd = 0.92, veille = 10;
    const conso = LS.profilConsommation(p).map(w => (w + veille) / etaOnd);   // appareils en 230 V par un onduleur, 10 W de veille
    const Eb = p.capacite * p.tension, socMin = 1 - bat.dodConseil;          // Wh nominaux, état de charge mini autorisé
    const etaCh = p.chimie === "plomb" ? 0.85 : 0.95, etaDe = p.chimie === "plomb" ? 0.95 : 0.98;
    let soc = 1, sMin = 1, deleste = 0, perdu = 0, servi = 0, prodTot = 0, heuresCoupees = 0, cyclage = 0;
    const h = [];
    for (let k = 0; k < jours * 24; k++) {
      const jour = Math.floor(k / 24), heure = k % 24 + 0.5;
      const couvert = jour >= 1 && jour < 1 + (p.couverts || 0);
      const forme = heure > lever && heure < lever + duree ? Math.sin(Math.PI * (heure - lever) / duree) : 0;
      const G = H * 1000 * forme * Math.PI / (2 * duree) * (couvert ? 0.2 : 1);   // W/m² ; ∫ forme = 2·durée/π
      const prod = p.panneaux * p.wc * G / 1000 * pr, besoin = conso[k % 24];
      prodTot += prod;
      let net = prod - besoin, servie = besoin, coupe = 0;
      if (net >= 0) {
        const place = (1 - soc) * Eb, stocke = Math.min(place, net * etaCh);
        soc += stocke / Eb; perdu += net - stocke / etaCh;
      } else {
        const dispo = Math.max(0, (soc - socMin) * Eb) * etaDe, tire = Math.min(dispo, -net);
        soc -= tire / etaDe / Eb; cyclage += tire / etaDe;
        if (tire < -net - 1e-9) { coupe = -net - tire; servie -= coupe; deleste += coupe; heuresCoupees++; }
      }
      servi += servie; sMin = Math.min(sMin, soc);
      h.push({ prod, besoin, servie, coupe, soc, G, couvert });
    }
    const consoJour = conso.reduce((a, b) => a + b, 0);
    const nuit = conso.reduce((a, w, k) => a + (k + 0.5 > lever && k + 0.5 < lever + duree ? 0 : w), 0);
    const autonomie = Eb * bat.dodConseil * etaDe / consoJour;
    // Coût indicatif (prix d'ordre de grandeur en Afrique de l'Ouest, 2025, à vérifier localement).
    const prixBatWh = p.chimie === "plomb" ? 60 : 250;
    const dodMoy = Math.min(1, cyclage / jours / Eb), vieCycles = bat.cycles(Math.max(0.1, dodMoy));
    // Température moyenne annuelle du lieu (batterie à l'abri, à l'air ambiant) : la chaleur use le plomb.
    const Tbat = site.T.reduce((a, b) => a + b, 0) / 12, fT = LS.facteurVieTemperature(p.chimie, Tbat);
    const vieBat = Math.min(vieCycles / 365, p.chimie === "plomb" ? 5 : 12) * fT;
    // Courants extrêmes vus par la batterie (heure la plus chargée, heure la plus productive).
    const Idech = Math.max(...conso) / p.tension, Ich = Math.max(...h.map(q => q.prod)) / p.tension;
    const limD = LS.limitesBatterie(p.chimie, p.capacite, Idech), limC = LS.limitesBatterie(p.chimie, p.capacite, -Ich, Tbat);
    const cPanneaux = 250 * p.panneaux * p.wc, cBat = prixBatWh * Eb, cAutres = 0.25 * (cPanneaux + cBat) + 150 * Math.max(...conso);
    const cout10 = cPanneaux + cBat * Math.ceil(10 / vieBat) + cAutres;
    return { h, consoJour, nuit, prodJour: prodTot / jours, autonomie, socMin: sMin, socLimite: socMin, deleste, heuresCoupees, perdu, servi,
      Eb, pr, cout: cPanneaux + cBat + cAutres, cout10, vieBat, kwh10: consoJour * 365 * 10 / 1000, lever, duree, H, Ta, Tbat, fT, Idech, Ich, limD, limC };
  };

  /* ====================== Simulations animées ====================== */
  const empile = W => W < 640;
  const fcfa = v => LS.nombre(Math.round(v / 1000) * 1000, 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

  function dessinerModule(ctx, x, y, w, h, mod, ombre, bypass, c, court) {
    const col = mod.groupes * 2, lig = mod.Ns / col, cw = w / col, ch = h / lig;
    ctx.fillStyle = "#cfd8dc"; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    for (let i = 0; i < col; i++) for (let j = 0; j < lig; j++) {
      const om = ombre && i === 0 && j === 0;
      ctx.fillStyle = om ? `rgba(20,20,20,${0.5 + 0.5 * ombre})` : "#1e3a5f";
      ctx.fillRect(x + i * cw + 1, y + j * ch + 1, cw - 2, ch - 2);
    }
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    for (let g = 1; g < mod.groupes; g++) { ctx.beginPath(); ctx.moveTo(x + g * 2 * cw, y); ctx.lineTo(x + g * 2 * cw, y + h); ctx.stroke(); }
    if (ombre) D().texte(ctx, "🍂", x + cw / 2, y + ch / 2, c.texte, 14, "center");
    const leg = mod.groupes + " groupes de " + mod.Ns / mod.groupes + " cellules" + (bypass ? ", 1 diode bypass chacun" : ", sans diode bypass");
    if (court) { D().texte(ctx, mod.groupes + " groupes de " + mod.Ns / mod.groupes + " cellules", x + w + 14, y + 20, c.doux, 11, "left"); D().texte(ctx, bypass ? "avec diodes bypass" : "sans diode bypass", x + w + 14, y + 36, bypass ? c.doux : c.alerte, 11, "left"); }
    else D().texte(ctx, leg, x, y + h + 14, c.doux, 11, "left");
  }

  /* ---------- TP 1 : courbe I-V d'un panneau ---------- */
  LS.sims.panneauSolaire = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 460,
      controles: [
        { k: "G", nom: "Ensoleillement", min: 0, max: 1200, pas: 10, defaut: 1000, unite: "W/m²" },
        { k: "Ta", nom: "Température de l'air", min: -10, max: 45, pas: 1, defaut: 25, unite: "°C" },
        { k: "stc", nom: "Cellules à 25 °C (conditions standard de la fiche technique)", bool: true, defaut: true },
        { k: "R", nom: "Charge branchée (résistance)", min: 0.5, max: 200, log: true, defaut: 10, format: v => LS.nombre(v, v < 10 ? 2 : 1) + " Ω" },
        { k: "ombre", nom: "Ombre sur UNE cellule (feuille, fiente…)", min: 0, max: 100, pas: 5, defaut: 0, unite: "%" },
        { k: "bypass", nom: "Diodes bypass (une par groupe de 20 cellules)", bool: true, defaut: true }
      ],
      changement(s) { s.etat.cache = null; },
      init(s) { s.etat.cache = null; },
      calcul(s) {
        if (s.etat.cache) return s.etat.cache;
        const Tc = s.p.stc ? 25 : LS.tempCellule(s.p.Ta, s.p.G);
        const q = { module: "m60", G: s.p.G, Tc, ombre: s.p.ombre / 100, bypass: s.p.bypass };
        const iv = LS.ivPanneau(q), op = LS.pointSurCharge(q, s.p.R);
        const ref = LS.ivPanneau({ module: "m60", G: 1000, Tc: 25 });
        return (s.etat.cache = { q, Tc, iv, op, ref });
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calcul(s), st = empile(W);
        const mw = st ? 64 : 150, mh = mw * 1.6;
        dessinerModule(ctx, 16, 24, mw, mh, k.iv.modele.mod, s.p.ombre / 100, s.p.bypass, c, st);
        D().texte(ctx, "Cellules à " + LS.nombre(k.Tc, 0) + " °C", 16, 12, c.texte, 12, "left", true);
        const gx = st ? 16 : 200, gy = st ? mh + 64 : 30, gw = W - gx - 16, gh = st ? (H - gy - 50) / 2 - 18 : (H - 90) / 2;
        const xmax = 45, imax = 11.5;
        const g1 = D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [0, xmax], ylim: [0, imax], titre: "Courant selon la tension : courbe I-V", xlab: xmax + " V", ylab: LS.nombre(imax, 1) + " A",
          series: [{ pts: k.ref.pts, coul: c.bordure, ep: 1 }, { pts: k.iv.pts, coul: c.info, ep: 2.5 }, { pts: [[0, 0], [xmax, xmax / s.p.R]], coul: c.doux, ep: 1 }],
          points: [{ x: k.iv.Vmp, y: k.iv.Imp, coul: c.ok }, { x: k.op.V, y: k.op.I, coul: c.accentFort, r: 6 }] });
        const gy2 = gy + gh + 34;
        D().graphe(ctx, gx, gy2, gw, gh, { c, xlim: [0, xmax], ylim: [0, 360], titre: "Puissance selon la tension", xlab: xmax + " V", ylab: "360 W",
          series: [{ pts: k.ref.pts.map(([v, i]) => [v, v * i]), coul: c.bordure, ep: 1 }, { pts: k.iv.pts.map(([v, i]) => [v, v * i]), coul: c.accent, ep: 2.5 }],
          points: [{ x: k.iv.Vmp, y: k.iv.Pmp, coul: c.ok }, { x: k.op.V, y: k.op.P, coul: c.accentFort, r: 6 }] });
        D().texte(ctx, st ? "orange : fonctionnement · vert : maximum (MPP)" : "● orange : point de fonctionnement · ● vert : puissance maximale (MPP)", gx, gy2 + gh + 16, c.doux, 11, "left");
        D().texte(ctx, st ? "trait fin : V = R·I · gris : conditions standard" : "trait fin : droite de charge V = R·I · gris : conditions standard", gx, gy2 + gh + 30, c.doux, 11, "left");
        void g1;
      },
      mesures(s) {
        const k = this.calcul(s);
        return [["Tension de circuit ouvert Voc", LS.nombre(k.iv.Voc, 1) + " V"], ["Courant de court-circuit Isc", LS.nombre(k.iv.Isc, 2) + " A"],
          ["Puissance maximale (MPP)", LS.nombre(k.iv.Pmp, 0) + " W à " + LS.nombre(k.iv.Vmp, 1) + " V"],
          ["Sur la charge", LS.nombre(k.op.V, 1) + " V · " + LS.nombre(k.op.I, 2) + " A"],
          ["Puissance dans la charge", LS.nombre(k.op.P, 0) + " W (" + LS.nombre(k.iv.Pmp > 0 ? 100 * k.op.P / k.iv.Pmp : 0, 0) + " % du MPP)", k.iv.Pmp > 0 && k.op.P < 0.9 * k.iv.Pmp ? "alerte" : ""],
          ["Chaleur dans la cellule ombragée", LS.nombre(k.op.Pcellule, 0) + " W", k.op.Pcellule > 15 ? "alerte" : ""]];
      },
      explication(s) {
        const k = this.calcul(s);
        let t = "Un panneau est une **source de courant** commandée par la lumière (Isc ∝ ensoleillement) tant que la tension reste basse, puis une **source de tension** (≈ Voc) quand le courant s'annule. Entre les deux, un seul point donne la puissance maximale : le **MPP** (≈ 80 % de Voc). La charge impose le point de fonctionnement : intersection de la courbe et de la droite V = R·I.\n\nLa chaleur fait **baisser la tension** (≈ −0,3 %/°C) donc la puissance ; un ciel voilé fait baisser surtout le **courant**.";
        if (s.p.ombre >= 30) t += s.p.bypass
          ? "\n\nAvec l'ombre, la **diode bypass** court-circuite le groupe de 20 cellules concerné : la courbe fait une **marche** et le panneau perd environ un tiers de sa tension au lieu de tout son courant."
          : "\n\n⚠ **Sans diode bypass**, la cellule ombragée limite le courant de tout le panneau, ou se met en **inverse** et chauffe (**point chaud**) : elle peut brûler le panneau.";
        if (k.op.Pcellule > 15) t += "\n\n🔥 La cellule ombragée dissipe **" + LS.nombre(k.op.Pcellule, 0) + " W** sur quelques cm² : point chaud.";
        return t;
      }
    }, cfg);
  };

  /* ---------- TP 2 : batterie ---------- */
  LS.sims.batterie = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "chimie", nom: "Technologie", choix: [["plomb", "Plomb AGM 12 V"], ["lifepo4", "LiFePO4 12,8 V (avec BMS)"]], defaut: "plomb" },
        { k: "C", nom: "Capacité nominale (en 20 h)", min: 20, max: 300, pas: 10, defaut: 100, unite: "Ah" },
        { k: "mode", nom: "Que fait-on ?", choix: [["decharge", "Décharger (appareils)"], ["charge", "Charger (chargeur CC/CV)"], ["repos", "Repos"]], defaut: "decharge" },
        { k: "Id", nom: "Courant de décharge", min: 1, max: 150, pas: 1, defaut: 5, unite: "A" },
        { k: "Ic", nom: "Courant de charge maximal", min: 2, max: 60, pas: 1, defaut: 15, unite: "A" },
        { k: "vitesse", nom: "Accélération (heures simulées par seconde)", min: 0.05, max: 4, log: true, defaut: 1, format: v => LS.nombre(v, 2) + " h/s" },
        { k: "dod", nom: "Profondeur de décharge quotidienne (pour la durée de vie)", min: 10, max: 100, pas: 5, defaut: 50, unite: "%" },
        { k: "T", nom: "Température de la batterie", min: -10, max: 45, pas: 1, defaut: 25, unite: "°C" }
      ],
      boutons: [
        { k: "pleine", texte: "🔋 Batterie pleine", action: s => { s.etat.b.soc = 1; s.raz(s); } },
        { k: "moitie", texte: "◐ À 40 %", action: s => { s.etat.b.soc = 0.4; s.raz(s); } }
      ],
      changement(s, k) { if (k === "chimie" || k === "C" || k === "mode") s.raz(s); },
      init(s) {
        s.raz = sim => { const e = sim.etat; e.b.chimie = sim.p.chimie; e.b.C = sim.p.C; Object.assign(e, { th: 0, h: [], ahOut: 0, ahIn: 0, whOut: 0, whIn: 0, coupure: false, motif: "", dernierAvis: null, socDepart: e.b.soc, phase: "repos", V: LS.BATTERIES[sim.p.chimie].ocv(e.b.soc), I: 0, phases: {} }); };
        s.etat.b = { chimie: s.p.chimie, C: s.p.C, soc: 1 };
        s.raz(s);
      },
      avancer(s, dt) {
        const e = s.etat, hTot = dt * s.p.vitesse, n = Math.max(1, Math.ceil(hTot / 0.01)), h = hTot / n;
        e.b.T = s.p.T;
        const signaler = msg => { if (e.dernierAvis !== msg) { e.dernierAvis = msg; if (LS.avis) LS.avis(msg); } };
        for (let q = 0; q < n; q++) {
          let r;
          if (s.p.mode === "decharge") {
            if (e.coupure) { r = LS.pasBatterie(e.b, 0, h); r.phase = "coupée (tension mini)"; }
            else { r = LS.pasBatterie(e.b, s.p.Id, h); if (r.coupure) { e.coupure = true; e.motif = r.bms || ""; signaler(r.bms ? "Le " + r.bms.replace("BMS : ", "BMS coupe la sortie : ") + "." : s.p.chimie === "lifepo4" ? "Le BMS coupe la batterie : tension mini atteinte." : "Tension mini (10,5 V) atteinte : il faut arrêter de décharger."); } else { e.ahOut += r.I * h; e.whOut += r.V * r.I * h; } }
          } else if (s.p.mode === "charge") {
            const k = LS.BATTERIES[s.p.chimie];
            const plein = e.b.soc >= 0.999 || (e.phases.cv && Math.abs(e.I) < 0.02 * s.p.C);
            r = LS.pasBatterie(e.b, -s.p.Ic, h, plein && s.p.chimie === "plomb" ? k.vFloat : k.vAbs);
            if (plein && s.p.chimie === "lifepo4") { r = LS.pasBatterie(e.b, 0, h); r.phase = "pleine : charge arrêtée"; }
            else if (plein) r.phase = "floating (entretien " + LS.nombre(k.vFloat, 1) + " V)";
            if (r.bms) signaler("Le " + r.bms.replace("BMS : ", "BMS refuse la charge : ") + ".");
            if (r.phase.startsWith("CV")) e.phases.cv = true;
            e.ahIn += -r.I * h; e.whIn += r.V * -r.I * h;
          } else r = LS.pasBatterie(e.b, 0, h);
          e.V = r.V; e.I = r.I; e.phase = r.phase; e.th += h;
        }
        const last = e.h[e.h.length - 1];
        if (!last || e.th - last[0] > 0.02) e.h.push([e.th, e.b.soc, e.V, e.I]);
        if (e.h.length > 600) e.h = e.h.filter((_, i) => i % 2 === 0);
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat, k = LS.BATTERIES[s.p.chimie], st = empile(W);
        // Batterie
        const bx = 20, by = 40, bw = st ? 90 : 120, bh = st ? 120 : 200;
        ctx.strokeStyle = c.texte; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh); ctx.fillStyle = c.texte; ctx.fillRect(bx + bw * 0.3, by - 10, bw * 0.4, 10);
        const soc = e.b.soc;
        ctx.fillStyle = soc < 1 - k.dodConseil ? c.alerte : soc < 0.6 ? c.accent : c.ok;
        ctx.fillRect(bx + 4, by + 4 + (bh - 8) * (1 - soc), bw - 8, (bh - 8) * soc);
        D().texte(ctx, LS.nombre(100 * soc, 0) + " %", bx + bw / 2, by + bh / 2, c.texte, 18, "center", true);
        D().texte(ctx, LS.nombre(e.V, 2) + " V", bx + bw / 2, by + bh + 18, c.texte, 14, "center", true);
        if (e.I) D().fleche(ctx, bx + bw + 14, by + bh / 2, bx + bw + 14, by + bh / 2 + (e.I > 0 ? 30 : -30), e.I > 0 ? c.accentFort : c.ok, 3);
        // Graphes : état de charge et tension
        const gx = st ? 16 : bx + bw + 50, gy = st ? by + bh + 50 : 30, gw = W - gx - 16, gh = st ? (H - gy - 40) / 2 - 10 : (H - 100) / 2;
        const tmax = Math.max(1, e.th);
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [0, tmax], ylim: [0, 1], titre: "État de charge (0-100 %) selon le temps simulé (h)", xlab: LS.nombre(tmax, 1) + " h",
          series: [{ pts: [[0, 1 - k.dodConseil], [tmax, 1 - k.dodConseil]], coul: c.alerte, ep: 1 }, { pts: e.h.map(q => [q[0], q[1]]), coul: c.ok, ep: 2.5 }] });
        const vlo = s.p.chimie === "plomb" ? 10 : 9.5, vhi = 15;
        D().graphe(ctx, gx, gy + gh + 34, gw, gh, { c, xlim: [0, tmax], ylim: [vlo, vhi], titre: "Tension aux bornes (" + vlo + "-" + vhi + " V)", xlab: "h",
          series: [{ pts: [[0, k.vMin], [tmax, k.vMin]], coul: c.alerte, ep: 1 }, { pts: e.h.map(q => [q[0], q[2]]), coul: c.info, ep: 2.5 }] });
      },
      mesures(s) {
        const e = s.etat, k = LS.BATTERIES[s.p.chimie], Ceff = LS.capaciteEffective(s.p.chimie, s.p.C, s.p.Id);
        const fT = LS.facteurVieTemperature(s.p.chimie, s.p.T), N = k.cycles(s.p.dod / 100) * fT, rend = e.whIn > 0 && e.whOut > 0 ? e.whOut / e.whIn : null;
        const I = s.p.mode === "decharge" ? s.p.Id : s.p.mode === "charge" ? -s.p.Ic : 0, lim = LS.limitesBatterie(s.p.chimie, s.p.C, I, s.p.T);
        return [["Phase", e.phase], ["Courant", LS.nombre(Math.abs(e.I), 1) + " A " + (e.I > 0 ? "(décharge)" : e.I < 0 ? "(charge)" : "")],
          ["Capacité réelle à " + s.p.Id + " A (Peukert)", LS.nombre(Ceff, 0) + " Ah sur " + s.p.C, Ceff < 0.8 * s.p.C ? "alerte" : ""],
          ["Fourni / reçu", LS.nombre(e.ahOut, 1) + " Ah · " + LS.nombre(e.whOut, 0) + " Wh / " + LS.nombre(e.ahIn, 1) + " Ah · " + LS.nombre(e.whIn, 0) + " Wh"],
          ["Énergie stockée (pleine)", LS.nombre(s.p.C * (s.p.chimie === "plomb" ? 12 : 12.8), 0) + " Wh · ≈ " + LS.nombre(s.p.C * 12.5 / k.whKg, 0) + " kg"],
          ["Courant demandé", LS.nombre(Math.abs(I) / s.p.C, 2) + " C" + (lim.msg ? " : " + lim.msg : " : dans les limites"), lim.niveau === "ok" ? "" : "alerte"],
          ["Durée de vie à " + s.p.dod + " % par jour, " + s.p.T + " °C", "≈ " + LS.nombre(N, 0) + " cycles (" + LS.nombre(N / 365, 1) + " ans)" + (fT < 1 ? ", × " + LS.nombre(fT, 2) + " à cause de la chaleur" : ""), s.p.dod / 100 > k.dodConseil || fT < 0.6 ? "alerte" : ""]]
          .concat(rend ? [["Rendement énergétique mesuré", LS.nombre(100 * rend, 0) + " %"]] : []);
      },
      explication(s) {
        const e = s.etat, pb = s.p.chimie === "plomb";
        let t = pb
          ? "Une batterie **plomb** voit sa tension baisser régulièrement quand elle se vide (12,7 V pleine, 12,2 V à 50 % au repos) : la tension renseigne sur la charge. Elle donne **moins d'Ah si on la décharge vite** (loi de Peukert) et s'abîme si on la vide souvent sous 50 % (sulfatation)."
          : "Une batterie **LiFePO4** garde une tension presque **plate** (≈ 13,2 V) de 90 % à 15 % : la tension ne dit presque rien de la charge, il faut compter les Ah (BMS, shunt). Elle accepte des décharges profondes (80 %), des milliers de cycles, et son **BMS** la coupe si une cellule sort de ses limites.";
        if (s.p.mode === "charge") t += "\n\nLe chargeur pousse d'abord un **courant constant** (CC), puis, quand la tension atteint " + LS.nombre(LS.BATTERIES[s.p.chimie].vAbs, 1) + " V, il tient cette **tension constante** (CV) : le courant diminue tout seul." + (pb ? " En plomb, cette fin de charge (absorption) dure des heures, puis le chargeur passe en **floating**." : " En lithium, la fin de charge est courte et on arrête au lieu d'entretenir.");
        if (e.coupure) t += "\n\n⚠ " + (e.motif ? "Le **BMS** a coupé : " + e.motif.replace("BMS : ", "") + "." : pb ? "Tension minimale atteinte : continuer abîmerait la batterie." : "Le **BMS** a coupé la sortie pour protéger les cellules.");
        t += pb ? "\n\nLe plomb n'a **pas de BMS** : rien ne l'empêche d'être chargé trop fort (au-delà de 0,2-0,3 C il chauffe et dégaze) ou usé par la chaleur (durée de vie divisée par 2 tous les 10 °C au-dessus de 25 °C)."
          : "\n\nLe BMS limite le courant à environ **1 C** (charge conseillée ≤ 0,5 C) et **bloque la charge sous 0 °C**.";
        return t;
      }
    }, cfg);
  };

  /* ---------- TP 3 : régulateur PWM ou MPPT ---------- */
  LS.sims.regulateurSolaire = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 440,
      controles: [
        { k: "module", nom: "Panneau", choix: [["m36", "36 cellules « 12 V » (≈ 100 Wc)"], ["m60", "60 cellules (≈ 290 Wc)"]], defaut: "m36" },
        { k: "serie", nom: "Panneaux en série", min: 1, max: 3, pas: 1, defaut: 1 },
        { k: "type", nom: "Régulateur", choix: [["pwm", "PWM (interrupteur)"], ["mppt", "MPPT 100 V / 30 A (convertisseur)"]], defaut: "pwm" },
        { k: "G", nom: "Ensoleillement", min: 50, max: 1200, pas: 10, defaut: 1000, unite: "W/m²" },
        { k: "Ta", nom: "Température de l'air", min: -15, max: 45, pas: 1, defaut: 25, unite: "°C" },
        { k: "Vbat", nom: "Tension de la batterie", min: 11.8, max: 14.4, pas: 0.1, defaut: 12.6, unite: "V", dec: 1 }
      ],
      changement(s) { s.etat.cache = null; },
      init(s) { s.etat.cache = null; },
      calcul(s) {
        if (s.etat.cache) return s.etat.cache;
        const q = { module: s.p.module, serie: s.p.serie, G: s.p.G, Tc: LS.tempCellule(s.p.Ta, s.p.G) };
        const pwm = LS.regulateur(q, "pwm", s.p.Vbat), mppt = LS.regulateur(q, "mppt", s.p.Vbat);
        const froid = LS.ivPanneau(Object.assign({}, q, { G: 1000, Tc: -10 }), 40).Voc;  // Voc au lever d'un matin froid
        const jour = LS.journeeSolaire({ module: s.p.module, serie: s.p.serie, Gcrete: s.p.G, Ta: s.p.Ta }, s.p.Vbat, 0.5);
        return (s.etat.cache = { q, pwm, mppt, froid, jour });
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calcul(s), r = s.p.type === "pwm" ? k.pwm : k.mppt, st = empile(W);
        const iv = k.mppt.iv, xmax = Math.max(25, iv.Voc * 1.1), ymax = LS.MODULES_PV[s.p.module].Isc * 1.25;
        const gw = st ? W - 32 : W * 0.58, gh = st ? 170 : H - 80;
        D().graphe(ctx, 16, 30, gw, gh, { c, xlim: [0, xmax], ylim: [0, ymax], titre: "Courbe I-V du panneau et point imposé par le régulateur", xlab: LS.nombre(xmax, 0) + " V", ylab: LS.nombre(ymax, 1) + " A",
          series: [{ pts: iv.pts, coul: c.info, ep: 2.5 }, { pts: [[s.p.Vbat + 0.3, 0], [s.p.Vbat + 0.3, ymax]], coul: c.doux, ep: 1 }],
          points: [{ x: iv.Vmp, y: iv.Imp, coul: c.ok }, { x: r.Vpanneau, y: r.Ipanneau, coul: c.accentFort, r: 6 }] });
        D().texte(ctx, "trait gris : tension batterie · ● MPP · ● point de fonctionnement", 16, 30 + gh + 14, c.doux, 11, "left");
        // Énergie sur une journée claire
        const bx = st ? 16 : 16 + gw + 30, by = st ? 30 + gh + 50 : 50, bw = W - bx - 16, pasB = st ? 42 : 50;
        const Em = Math.max(1, k.jour.Edispo);
        [["Disponible (MPP)", k.jour.Edispo, c.bordure], ["Régulateur PWM", k.jour.Epwm, c.accent], ["Régulateur MPPT", k.jour.Emppt, c.ok]].forEach(([n, v, col], i) => {
          const y = by + i * pasB;
          D().texte(ctx, n + " : " + LS.nombre(v, 0) + " Wh / jour", bx, y, c.texte, 12, "left", true);
          ctx.fillStyle = col; ctx.fillRect(bx, y + 10, bw * v / Em, 18);
        });
        D().texte(ctx, "Journée claire, crête " + s.p.G + " W/m²,", bx, by + 3 * pasB + 4, c.doux, 11, "left");
        D().texte(ctx, "batterie à " + LS.nombre(s.p.Vbat, 1) + " V", bx, by + 3 * pasB + 19, c.doux, 11, "left");
      },
      mesures(s) {
        const k = this.calcul(s), r = s.p.type === "pwm" ? k.pwm : k.mppt;
        return [["Puissance disponible (MPP)", LS.nombre(k.mppt.Pmp, 0) + " W à " + LS.nombre(k.mppt.iv.Vmp, 1) + " V"],
          ["Tension du panneau", LS.nombre(r.Vpanneau, 1) + " V"], ["Puissance envoyée à la batterie", LS.nombre(r.P, 0) + " W", r.P < 0.85 * k.mppt.Pmp ? "alerte" : ""],
          ["Courant de charge", LS.nombre(r.P / s.p.Vbat, 1) + " A"], ["Gain du MPPT sur la journée", "+" + LS.nombre(k.jour.Epwm > 0 ? 100 * (k.jour.Emppt / k.jour.Epwm - 1) : 0, 0) + " %"],
          ["Voc par matin froid (−10 °C)", LS.nombre(k.froid, 0) + " V (maxi " + (s.p.type === "mppt" ? 100 : LS.VMAX_PWM) + " V)", k.froid > (s.p.type === "mppt" ? 100 : LS.VMAX_PWM) ? "alerte" : ""]];
      },
      explication(s) {
        const k = this.calcul(s), r = s.p.type === "pwm" ? k.pwm : k.mppt;
        let t = s.p.type === "pwm"
          ? "Un régulateur **PWM** n'est qu'un interrupteur rapide : quand il est fermé, le panneau est **collé à la tension de la batterie**. Il ne travaille donc pas à son MPP : la puissance perdue est la différence de tension. Il convient à un panneau « 12 V » de 36 cellules (Vmp ≈ 17-18 V)."
          : "Un régulateur **MPPT** est un convertisseur : il cherche en permanence le **point de puissance maximale** du panneau, puis abaisse la tension en augmentant le courant (P = U·I conservée, ≈ 96 % de rendement). Il permet des panneaux de 60 cellules ou en série, à tension élevée.";
        if (s.p.type === "pwm" && s.p.module === "m60") t += "\n\n⚠ Panneau 60 cellules sur un PWM : le panneau est tiré à ≈ 13 V au lieu de ≈ 31 V, **plus de la moitié de la puissance est perdue**.";
        if (s.p.type === "mppt" && k.froid > 100) t += "\n\n🔥 Par un matin froid, la tension à vide de la chaîne (" + LS.nombre(k.froid, 0) + " V) dépasse les **100 V** admis : le régulateur serait détruit. On calcule toujours la Voc à la température minimale du site.";
        if (s.p.type === "pwm" && k.froid > LS.VMAX_PWM) t += "\n\n🔥 La tension à vide de la chaîne par matin froid (" + LS.nombre(k.froid, 0) + " V) dépasse les **" + LS.VMAX_PWM + " V** qu'accepte un régulateur PWM 12/24 V courant : il serait détruit, et la batterie avec lui. Un PWM se branche sur un seul panneau « 12 V » (ou deux en série pour une batterie 24 V).";
        if (s.p.type === "mppt" && r.limite) t += "\n\nLe régulateur plafonne à 30 A : le surplus est perdu.";
        return t;
      }
    }, cfg);
  };

  /* ---------- TP 4 : dimensionnement d'une installation autonome ---------- */
  LS.sims.installationSolaire = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 470,
      controles: [
        { k: "site", nom: "Lieu", choix: Object.keys(LS.SITES_SOLAIRES).map(k => [k, LS.SITES_SOLAIRES[k].nom]), defaut: "bamako" },
        { k: "mois", nom: "Mois", choix: LS.MOIS.map((m, i) => [i, m]), nombres: true, defaut: 6 },
        { k: "panneaux", nom: "Nombre de panneaux", min: 1, max: 12, pas: 1, defaut: 1 },
        { k: "wc", nom: "Puissance d'un panneau", choix: [[100, "100 Wc"], [200, "200 Wc"], [400, "400 Wc"]], nombres: true, defaut: 400 },
        { k: "regulateur", nom: "Régulateur", choix: [["mppt", "MPPT"], ["pwm", "PWM"]], defaut: "mppt" },
        { k: "chimie", nom: "Batterie", choix: [["plomb", "Plomb AGM (décharge maxi 50 %)"], ["lifepo4", "LiFePO4 (décharge maxi 80 %)"]], defaut: "plomb" },
        { k: "tension", nom: "Tension du parc", choix: [[12, "12 V"], [24, "24 V"], [48, "48 V"]], nombres: true, defaut: 12 },
        { k: "capacite", nom: "Capacité du parc", min: 50, max: 800, pas: 50, defaut: 200, unite: "Ah" },
        { k: "couverts", nom: "Jours très couverts d'affilée (dès le 2ᵉ jour)", min: 0, max: 5, pas: 1, defaut: 0 },
        { k: "lampes", nom: "Lampes LED 7 W (soir)", min: 0, max: 20, pas: 1, defaut: 6 },
        { k: "telephones", nom: "Téléphones à charger", min: 0, max: 10, pas: 1, defaut: 3 },
        { k: "ventilateur", nom: "Ventilateur 40 W (heures/jour)", min: 0, max: 16, pas: 1, defaut: 6 },
        { k: "tv", nom: "Téléviseur 60 W (heures/jour)", min: 0, max: 8, pas: 1, defaut: 4 },
        { k: "ordinateur", nom: "Ordinateur portable 50 W (heures/jour)", min: 0, max: 10, pas: 1, defaut: 0 },
        { k: "frigo", nom: "Réfrigérateur économe (≈ 0,5 kWh/jour)", bool: true, defaut: true },
        { k: "pompe", nom: "Pompe à eau 400 W, 2 h à midi", bool: true, defaut: false }
      ],
      changement(s) { s.etat.r = null; },
      init(s) { s.etat.r = null; s.etat.curseur = 0; },
      res(s) { return s.etat.r || (s.etat.r = LS.simulerInstallation(s.p)); },
      avancer(s, dt) { s.etat.curseur = (s.etat.curseur + dt * 8) % 168; },
      dessiner(s, ctx, W, H, c) {
        const r = this.res(s), n = r.h.length, gx = 16, gw = W - 32, st = empile(W);
        const gh1 = st ? 150 : 170, gy1 = 30, gy2 = gy1 + gh1 + 44, gh2 = H - gy2 - 40;
        const pmax = Math.max(100, ...r.h.map(q => Math.max(q.prod, q.besoin))) * 1.1;
        // Bandes des jours couverts
        r.h.forEach((q, i) => { if (q.couvert && i % 24 === 0) { ctx.fillStyle = "rgba(120,130,150,.18)"; ctx.fillRect(gx + gw * i / n, gy1, gw * 24 / n, gh1); ctx.fillRect(gx + gw * i / n, gy2, gw * 24 / n, gh2); } });
        D().graphe(ctx, gx, gy1, gw, gh1, { c, xlim: [0, n], ylim: [0, pmax], titre: st ? "Production (jaune), consommation (orange)" : "Production (jaune) et consommation (orange) sur 7 jours", xlab: "heures", ylab: LS.nombre(pmax, 0) + " W",
          series: [{ pts: r.h.map((q, i) => [i + 0.5, q.prod]), coul: "#e0b000", ep: 2 }, { pts: r.h.map((q, i) => [i + 0.5, q.besoin]), coul: c.accentFort, ep: 1.5 }] });
        r.h.forEach((q, i) => { if (q.coupe > 0) { ctx.fillStyle = c.alerte; ctx.fillRect(gx + gw * i / n, gy1 + gh1 - 6, Math.max(2, gw / n), 6); } });
        const g = D().graphe(ctx, gx, gy2, gw, gh2, { c, xlim: [0, n], ylim: [0, 1], titre: st ? "Charge de la batterie (0-100 %)" : "État de charge de la batterie (0-100 %) · rouge : limite de décharge", xlab: "jours 1 à 7",
          series: [{ pts: [[0, r.socLimite], [n, r.socLimite]], coul: c.alerte, ep: 1 }, { pts: r.h.map((q, i) => [i + 1, q.soc]), coul: c.info, ep: 2.5 }] });
        const i = Math.floor(s.etat.curseur), q = r.h[i];
        ctx.strokeStyle = c.doux; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(g.X(i + 0.5), gy1); ctx.lineTo(g.X(i + 0.5), gy2 + gh2); ctx.stroke(); ctx.setLineDash([]);
        D().texte(ctx, "Jour " + (Math.floor(i / 24) + 1) + ", " + (i % 24) + " h : " + (q.G > 1 ? "☀ " : "☾ ") + LS.nombre(q.prod, 0) + " W produits, " + LS.nombre(q.besoin, 0) + " W consommés" + (q.coupe > 0 ? " · délestage !" : ""), gx, H - 14, q.coupe > 0 ? c.alerte : c.texte, 12, "left", true);
      },
      mesures(s) {
        const r = this.res(s);
        return [["Consommation", LS.nombre(r.consoJour / 1000, 2) + " kWh/jour (dont nuit " + LS.nombre(r.nuit / 1000, 2) + ")"],
          ["Production moyenne", LS.nombre(r.prodJour / 1000, 2) + " kWh/jour (" + LS.nombre(r.H, 1) + " kWh/m²/j, rendement " + LS.nombre(100 * r.pr, 0) + " %)", r.prodJour < r.consoJour ? "alerte" : ""],
          ["Autonomie de la batterie", LS.nombre(r.autonomie, 1) + " jour(s) sans soleil", r.autonomie < 1 ? "alerte" : ""],
          ["Charge mini atteinte", LS.nombre(100 * r.socMin, 0) + " %"],
          ["Énergie délestée (coupures)", LS.nombre(r.deleste / 1000, 2) + " kWh · " + r.heuresCoupees + " h", r.deleste > 0 ? "alerte" : "ok"],
          ["Surplus perdu (batterie pleine)", LS.nombre(r.perdu / 1000, 1) + " kWh"],
          ["Coût indicatif", fcfa(r.cout) + " (≈ " + LS.nombre(r.cout / 656, 0) + " €)"],
          ["Courants de la batterie", "décharge " + LS.nombre(r.Idech, 0) + " A, charge " + LS.nombre(r.Ich, 0) + " A" + (r.limD.msg ? " · " + r.limD.msg : "") + (r.limC.msg ? " · " + r.limC.msg : ""), r.limD.niveau !== "ok" || r.limC.niveau !== "ok" ? "alerte" : ""],
          ["Sur 10 ans", fcfa(r.cout10) + " · batterie ≈ " + LS.nombre(r.vieBat, 1) + " ans à " + LS.nombre(r.Tbat, 0) + " °C de moyenne · " + LS.nombre(r.cout10 / Math.max(1, r.kwh10), 0) + " FCFA/kWh"]];
      },
      explication(s) {
        const r = this.res(s);
        let t = "On dimensionne en trois temps : **(1)** la consommation journalière (puissance × heures, sans oublier la veille de l'onduleur), **(2)** les panneaux pour la produire pendant le **mois le plus défavorable**, avec un rendement global de 70-80 %, **(3)** la batterie pour passer la **nuit et les jours couverts** sans dépasser sa profondeur de décharge.";
        t += "\n\nRègle rapide : Wc ≈ conso (Wh/j) ÷ (irradiation × 0,75) ; capacité (Ah) ≈ conso × jours d'autonomie ÷ (tension × profondeur de décharge).";
        t += "\n\nIci : il faudrait ≈ **" + LS.nombre(r.consoJour / (r.H * r.pr), 0) + " Wc** et ≈ **" + LS.nombre(r.consoJour * 3 / (s.p.tension * LS.BATTERIES[s.p.chimie].dodConseil), 0) + " Ah** en " + s.p.tension + " V pour 3 jours d'autonomie.";
        if (s.p.capacite * s.p.tension > 3000 && s.p.tension === 12) t += "\n\nAu-delà de 2-3 kWh, on passe le parc en **24 V ou 48 V** : à puissance égale, le courant et la section des câbles sont divisés.";
        if (r.limD.niveau !== "ok" || r.limC.niveau !== "ok") t += "\n\n⚠ Courant trop fort pour la batterie : " + [r.limD.msg, r.limC.msg].filter(Boolean).join(" ; ") + ". Augmente la capacité ou la tension du parc. (Le bilan ci-dessus n'en tient pas compte.)";
        if (r.fT < 1) t += "\n\nÀ " + LS.nombre(r.Tbat, 0) + " °C de moyenne, la durée de vie de la batterie est multipliée par " + LS.nombre(r.fT, 2) + (s.p.chimie === "plomb" ? " (plomb : divisée par 2 tous les 10 °C au-dessus de 25 °C). Une batterie au frais, ventilée, dure plus longtemps." : " (effet plus faible que pour le plomb, ordre de grandeur).");
        t += "\n\n_Prix d'ordre de grandeur (Afrique de l'Ouest, 2025), à vérifier chez un fournisseur._";
        return t;
      }
    }, cfg);
  };
})();
