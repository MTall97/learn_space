/* Simulations d'apprentissage automatique et d'audio : neurone et descente de gradient,
   surapprentissage, spectrogramme, évaluation d'une transcription ou d'une traduction (WER, CER,
   BLEU), fuite de données. Les fonctions de calcul sont exposées sur LS (testables sous Node). */
(function () {
  "use strict";
  const LS = window.LS;
  LS.sims = LS.sims || {};
  const D = () => LS.dessin;

  /* ---------- Hasard reproductible ---------- */
  LS.hasard = function (graine) {
    let a = graine >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    u.gauss = () => { let x = 0; while (x === 0) x = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u()); };
    return u;
  };
  const etroit = W => W < 640;

  /* =====================================================================
     1. Un neurone : régression logistique en 2 dimensions
     ===================================================================== */
  LS.donneesNeurone = function (type, n, graine) {
    const r = LS.hasard(graine || 7), pts = [];
    n = n || 80;
    for (let i = 0; i < n; i++) {
      if (type === "xor") {
        const sx = r() < 0.5 ? -1 : 1, sy = r() < 0.5 ? -1 : 1;
        pts.push({ x: sx * 0.5 + 0.17 * r.gauss(), y: sy * 0.5 + 0.17 * r.gauss(), c: sx * sy > 0 ? 1 : 0 });
      } else {
        const c = i % 2, sd = type === "chevauchant" ? 0.42 : 0.18;
        pts.push({ x: (c ? 0.4 : -0.4) + sd * r.gauss(), y: (c ? 0.3 : -0.3) + sd * r.gauss(), c });
      }
    }
    return pts;
  };
  const sigmoide = z => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z))));
  // Perte d'entropie croisée moyenne, exactitude et gradient.
  LS.evaluerNeurone = function (pts, w1, w2, b) {
    let perte = 0, bons = 0, g1 = 0, g2 = 0, gb = 0;
    pts.forEach(p => {
      const q = sigmoide(w1 * p.x + w2 * p.y + b), e = Math.min(1 - 1e-12, Math.max(1e-12, q));
      perte -= p.c ? Math.log(e) : Math.log(1 - e);
      if ((q >= 0.5 ? 1 : 0) === p.c) bons++;
      g1 += (q - p.c) * p.x; g2 += (q - p.c) * p.y; gb += q - p.c;
    });
    const n = pts.length;
    return { perte: perte / n, exactitude: bons / n, g1: g1 / n, g2: g2 / n, gb: gb / n };
  };
  LS.pasGradient = function (pts, w, lr) {
    const k = LS.evaluerNeurone(pts, w.w1, w.w2, w.b), lim = v => Math.max(-30, Math.min(30, v));
    return { w1: lim(w.w1 - lr * k.g1), w2: lim(w.w2 - lr * k.g2), b: lim(w.b - lr * k.gb) };
  };

  LS.sims.neurone = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "donnees", nom: "Données", choix: [["separable", "deux nuages bien séparés"], ["chevauchant", "deux nuages qui se chevauchent"], ["xor", "OU exclusif (XOR)"]], defaut: "separable" },
        { k: "w1", nom: "Poids w1 (horizontal)", min: -30, max: 30, pas: 0.1, defaut: 0.5, dec: 1 },
        { k: "w2", nom: "Poids w2 (vertical)", min: -30, max: 30, pas: 0.1, defaut: -1, dec: 1 },
        { k: "b", nom: "Biais b", min: -30, max: 30, pas: 0.1, defaut: 0.3, dec: 1 },
        { k: "lr", nom: "Taux d'apprentissage", min: 0.01, max: 100, log: true, defaut: 0.5, format: v => LS.nombre(v, v < 1 ? 2 : 1) },
        { k: "apprendre", nom: "Apprendre (descente de gradient, 10 pas par image)", bool: true, defaut: false }
      ],
      boutons: [
        { k: "pas", texte: "Un pas de gradient", action: s => { s.etat.unPas = true; } },
        { k: "zero", texte: "↺ Poids à zéro", action: s => { Object.assign(s.p, { w1: 0, w2: 0, b: 0 }); s.etat.histo = []; s.etat.iter = 0; } }
      ],
      init(s) { s.etat.histo = []; s.etat.iter = 0; s.etat.aAppris = false; s.etat.typeAvant = null; },
      changement(s, k) { if (k === "donnees") { s.etat.histo = []; s.etat.iter = 0; s.etat.aAppris = false; } if (k === "w1" || k === "w2" || k === "b") s.etat.histo = []; },
      avancer(s) {
        const e = s.etat;
        if (e.typeAvant !== s.p.donnees) { e.pts = LS.donneesNeurone(s.p.donnees, 100, 11); e.typeAvant = s.p.donnees; }
        const n = s.p.apprendre ? 10 : e.unPas ? 1 : 0;
        e.unPas = false;
        for (let i = 0; i < n; i++) {
          Object.assign(s.p, LS.pasGradient(e.pts, s.p, s.p.lr));
          e.iter++; e.aAppris = true;
          e.histo.push(LS.evaluerNeurone(e.pts, s.p.w1, s.p.w2, s.p.b).perte);
          if (e.histo.length > 400) e.histo.shift();
        }
        if (n) { e.maj = (e.maj || 0) + 1; if (e.maj % 6 === 0 || !s.p.apprendre) s.majControles(); }
        e.k = LS.evaluerNeurone(e.pts, s.p.w1, s.p.w2, s.p.b);
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat; if (!e.pts) return;
        const pile = etroit(W), cote = pile ? Math.min(W - 40, H * 0.55) : Math.min(H - 50, W * 0.48);
        const x0 = pile ? (W - cote) / 2 : 20, y0 = 26;
        const X = v => x0 + (v + 1.3) / 2.6 * cote, Y = v => y0 + (1.3 - v) / 2.6 * cote;
        // Fond : probabilité de la classe orange
        const n = 26;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const px = -1.3 + (i + 0.5) * 2.6 / n, py = 1.3 - (j + 0.5) * 2.6 / n;
          const q = sigmoide(s.p.w1 * px + s.p.w2 * py + s.p.b);
          ctx.fillStyle = q >= 0.5 ? `rgba(232,132,26,${0.08 + 0.3 * (q - 0.5)})` : `rgba(43,108,176,${0.08 + 0.3 * (0.5 - q)})`;
          ctx.fillRect(x0 + i * cote / n, y0 + j * cote / n, cote / n + 1, cote / n + 1);
        }
        ctx.strokeStyle = c.bordure; ctx.strokeRect(x0, y0, cote, cote);
        // Frontière w1·x + w2·y + b = 0
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, cote, cote); ctx.clip();
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2; ctx.beginPath();
        if (Math.abs(s.p.w2) > 1e-6) { ctx.moveTo(X(-1.3), Y((-s.p.b + 1.3 * s.p.w1) / s.p.w2)); ctx.lineTo(X(1.3), Y((-s.p.b - 1.3 * s.p.w1) / s.p.w2)); }
        else if (Math.abs(s.p.w1) > 1e-6) { ctx.moveTo(X(-s.p.b / s.p.w1), Y(-1.3)); ctx.lineTo(X(-s.p.b / s.p.w1), Y(1.3)); }
        ctx.stroke(); ctx.restore();
        e.pts.forEach(p => {
          const q = sigmoide(s.p.w1 * p.x + s.p.w2 * p.y + p.c * 0 + s.p.b), bon = (q >= 0.5 ? 1 : 0) === p.c;
          ctx.fillStyle = p.c ? "#e8841a" : "#2b6cb0"; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 4.5, 0, 7); ctx.fill();
          if (!bon) { ctx.strokeStyle = c.alerte; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 7.5, 0, 7); ctx.stroke(); }
        });
        D().texte(ctx, "Données et frontière de décision (cercle rouge : mal classé)", x0, 12, c.texte, 12, "left", true);
        // Courbe de perte
        const gx = pile ? 30 : x0 + cote + 50, gy = pile ? y0 + cote + 40 : 40, gw = pile ? W - 50 : W - gx - 20, gh = pile ? H - gy - 24 : H - 90;
        const h = e.histo, ymax = Math.max(0.8, ...h.slice(-400)) * 1.1;
        D().graphe(ctx, gx, gy, gw, gh, { c, xlim: [0, Math.max(50, h.length)], ylim: [0, ymax], series: [{ pts: h.map((v, i) => [i, v]), coul: c.accentFort, ep: 2 }],
          titre: "Perte (entropie croisée) pendant l'apprentissage", xlab: "pas de gradient" });
      },
      mesures(s) {
        const k = s.etat.k || { perte: 0, exactitude: 0 };
        return [["Exactitude", LS.nombre(100 * k.exactitude, 0) + " %"], ["Perte", LS.nombre(k.perte, 3), k.perte > 0.69 ? "alerte" : ""], ["Pas de gradient", String(s.etat.iter || 0)],
          ["Équation", `σ(${LS.nombre(s.p.w1, 1)}·x ${s.p.w2 < 0 ? "−" : "+"} ${LS.nombre(Math.abs(s.p.w2), 1)}·y ${s.p.b < 0 ? "−" : "+"} ${LS.nombre(Math.abs(s.p.b), 1)})`]];
      },
      explication(s) {
        const k = s.etat.k || {};
        let t = "Le neurone calcule **z = w1·x + w2·y + b**, puis une probabilité **σ(z) = 1/(1+e⁻ᶻ)** d'être orange. La frontière σ = 0,5 est la droite z = 0 : les poids fixent son **orientation**, le biais la **décale**. La **perte** mesure à quel point les probabilités sont fausses ; la **descente de gradient** modifie chaque poids d'un petit pas dans le sens qui la fait baisser.";
        if (s.p.donnees === "xor") t += "\n\n⚠ Aucune droite ne sépare un **OU exclusif** : un neurone seul plafonne vers 50 à 75 %. Il faut une **couche cachée** (plusieurs neurones) pour courber la frontière.";
        else if (s.p.lr > 10 && s.p.apprendre) t += "\n\n⚠ Pas trop grand : les poids sautent d'un côté à l'autre du minimum, la perte rebondit au lieu de descendre régulièrement.";
        else if (s.p.donnees === "separable" && k.perte < 0.05) t += "\n\nDonnées séparables : la perte peut s'approcher de 0, les poids grandissent sans fin (le modèle devient « trop sûr de lui »). C'est une raison d'ajouter une **régularisation**.";
        return t;
      }
    }, cfg);
  };

  /* =====================================================================
     2. Surapprentissage : régression polynomiale
     ===================================================================== */
  LS.fonctionCachee = x => 0.8 * Math.sin(3 * x) + 0.3 * x;
  LS.donneesRegression = function (n, bruit, graine) {
    const r = LS.hasard(graine || 3), xs = [], ys = [];
    for (let i = 0; i < n; i++) { const x = 2 * r() - 1; xs.push(x); ys.push(LS.fonctionCachee(x) + bruit * r.gauss()); }
    return { xs, ys };
  };
  // Base de Legendre sur [-1, 1] : bien mieux conditionnée que 1, x, x², … au degré 15.
  const legendre = (x, d) => { const P = [1, x]; for (let k = 1; k < d; k++) P.push(((2 * k + 1) * x * P[k] - k * P[k - 1]) / (k + 1)); return P.slice(0, d + 1); };
  LS.evaluerPolynome = (coef, x) => legendre(x, coef.length - 1).reduce((a, p, i) => a + p * coef[i], 0);
  // Moindres carrés avec pénalité ridge (λ·Σ coef², terme constant non pénalisé), élimination de Gauss avec pivot.
  LS.ajusterPolynome = function (xs, ys, degre, lambda) {
    const m = degre + 1, A = Array.from({ length: m }, () => new Array(m + 1).fill(0));
    xs.forEach((x, k) => { const P = legendre(x, degre); for (let i = 0; i < m; i++) { for (let j = 0; j < m; j++) A[i][j] += P[i] * P[j]; A[i][m] += P[i] * ys[k]; } });
    for (let i = 0; i < m; i++) A[i][i] += (i ? (lambda || 0) * xs.length : 0) + 1e-9;
    for (let i = 0; i < m; i++) {
      let p = i; for (let k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
      [A[i], A[p]] = [A[p], A[i]];
      for (let k = i + 1; k < m; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j <= m; j++) A[k][j] -= f * A[i][j]; }
    }
    const coef = new Array(m).fill(0);
    for (let i = m - 1; i >= 0; i--) { let v = A[i][m]; for (let j = i + 1; j < m; j++) v -= A[i][j] * coef[j]; coef[i] = v / A[i][i]; }
    return coef;
  };
  LS.ecartType = (coef, xs, ys) => Math.sqrt(xs.reduce((a, x, i) => a + (LS.evaluerPolynome(coef, x) - ys[i]) ** 2, 0) / xs.length);
  // Erreurs (racine de l'erreur quadratique moyenne) d'entraînement et de validation pour chaque degré.
  LS.courbesErreur = function (p) {
    const tr = LS.donneesRegression(p.n, p.bruit, p.graine), va = LS.donneesRegression(300, p.bruit, p.graine + 1000);
    const res = [];
    for (let d = 1; d <= 15; d++) { const coef = LS.ajusterPolynome(tr.xs, tr.ys, d, p.lambda); res.push({ d, coef, train: LS.ecartType(coef, tr.xs, tr.ys), val: LS.ecartType(coef, va.xs, va.ys) }); }
    return { tr, va, res, meilleur: res.reduce((a, b) => b.val < a.val ? b : a).d };
  };

  LS.sims.surapprentissage = function (el, cfg) {
    const calcul = s => { const cle = [s.p.n, s.p.bruit, s.p.lambda, s.etat.graine].join("|"); if (s.etat.cle !== cle) { s.etat.cle = cle; s.etat.k = LS.courbesErreur(Object.assign({ graine: s.etat.graine }, s.p)); } return s.etat.k; };
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "degre", nom: "Degré du polynôme (complexité du modèle)", min: 1, max: 15, pas: 1, defaut: 3 },
        { k: "n", nom: "Nombre d'exemples d'entraînement", min: 8, max: 200, pas: 1, defaut: 20 },
        { k: "bruit", nom: "Bruit sur les mesures (écart type)", min: 0, max: 0.6, pas: 0.01, defaut: 0.3, dec: 2 },
        { k: "lambda", nom: "Régularisation (ridge, λ)", choix: [[0, "aucune"], [1e-5, "très faible (10⁻⁵)"], [1e-3, "faible (10⁻³)"], [1e-2, "moyenne (10⁻²)"], [1e-1, "forte (10⁻¹)"]], nombres: true, defaut: 0 }
      ],
      boutons: [{ k: "tirage", texte: "🎲 Nouveau tirage des données", action: s => { s.etat.graine++; } }],
      init(s) { s.etat.graine = 3; },
      dessiner(s, ctx, W, H, c) {
        const k = calcul(s), r = k.res[s.p.degre - 1], pile = etroit(W);
        const gw = pile ? W - 50 : (W - 90) / 2, gh = pile ? (H - 110) / 2 : H - 80;
        const ymin = -1.8, ymax = 1.8, fx = [], ft = [];
        for (let i = 0; i <= 200; i++) { const x = -1 + i / 100; fx.push([x, LS.evaluerPolynome(r.coef, x)]); ft.push([x, LS.fonctionCachee(x)]); }
        const g = D().graphe(ctx, 30, 30, gw, gh, { c, xlim: [-1, 1], ylim: [ymin, ymax], series: [{ pts: ft, coul: c.ok, ep: 1.5 }, { pts: fx, coul: c.accentFort, ep: 2.5 }],
          titre: "Exemples (bleu), vraie loi (vert), modèle de degré " + s.p.degre + " (orange)" });
        ctx.fillStyle = c.info; k.tr.xs.forEach((x, i) => { const y = k.tr.ys[i]; if (y > ymin && y < ymax) { ctx.beginPath(); ctx.arc(g.X(x), g.Y(y), 3.5, 0, 7); ctx.fill(); } });
        const ex = pile ? 30 : 60 + gw, ey = pile ? 30 + gh + 50 : 30;
        const emax = Math.max(0.8, s.p.bruit * 3);
        const g2 = D().graphe(ctx, ex, ey, gw, gh, { c, xlim: [1, 15], ylim: [0, emax], series: [{ pts: k.res.map(q => [q.d, q.train]), coul: c.info, ep: 2.5 }, { pts: k.res.map(q => [q.d, q.val]), coul: c.alerte, ep: 2.5 }],
          points: [{ x: s.p.degre, y: Math.min(emax, r.val), coul: c.alerte }, { x: s.p.degre, y: Math.min(emax, r.train), coul: c.info }], titre: "Erreur selon le degré : entraînement (bleu), validation (rouge)", xlab: "degré 1 → 15" });
        if (s.p.bruit > 0) { ctx.setLineDash([4, 4]); ctx.strokeStyle = c.doux; ctx.beginPath(); ctx.moveTo(ex, g2.Y(s.p.bruit)); ctx.lineTo(ex + gw, g2.Y(s.p.bruit)); ctx.stroke(); ctx.setLineDash([]); D().texte(ctx, "niveau du bruit", ex + gw - 4, g2.Y(s.p.bruit) - 8, c.doux, 11, "right"); }
      },
      mesures(s) {
        const k = calcul(s), r = k.res[s.p.degre - 1];
        return [["Erreur d'entraînement", LS.nombre(r.train, 3)], ["Erreur de validation", LS.nombre(r.val, 3), r.val > 1.5 * Math.max(r.train, s.p.bruit) ? "alerte" : ""],
          ["Paramètres / exemples", (s.p.degre + 1) + " / " + s.p.n, s.p.degre + 1 >= s.p.n ? "alerte" : ""], ["Meilleur degré (validation)", String(k.meilleur)]];
      },
      explication(s) {
        const k = calcul(s), r = k.res[s.p.degre - 1];
        let t = "On cherche la loi cachée (verte) à partir de quelques mesures bruitées. Un modèle trop simple **sous-apprend** (erreurs d'entraînement et de validation fortes). Un modèle trop complexe **suit le bruit** : il colle aux exemples (erreur d'entraînement basse) mais se trompe ailleurs (erreur de validation haute). On ne choisit jamais la complexité sur l'erreur d'entraînement, toujours sur des données **mises de côté**. On ne descend pas sous le niveau du bruit : c'est l'erreur irréductible.";
        if (r.val > 2 * r.train && s.p.degre > 4) t += "\n\n⚠ **Surapprentissage** : l'écart entre entraînement et validation se creuse. Remèdes : plus d'exemples, un modèle plus simple, ou une régularisation.";
        return t;
      }
    }, cfg);
  };

  /* =====================================================================
     3. Spectrogramme
     ===================================================================== */
  // FFT radix 2 en place (re, im de longueur puissance de 2).
  LS.fft = function (re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let l = 2; l <= n; l <<= 1) {
      const a = -2 * Math.PI / l, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += l) { let cr = 1, ci = 0; for (let k = 0; k < l / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + l / 2] * cr - im[i + k + l / 2] * ci, vi = re[i + k + l / 2] * ci + im[i + k + l / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + l / 2] = ur - vr; im[i + k + l / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
  };
  // Formants (Hz) de voyelles d'une voix d'homme (ordres de grandeur classiques de Peterson et Barney).
  LS.FORMANTS = { a: [730, 1090, 2440], i: [270, 2290, 3010], ou: [300, 870, 2240] };
  const resonance = (f, F, B) => 1 / Math.sqrt((1 - (f / F) ** 2) ** 2 + (f * B / (F * F)) ** 2);
  // Signal « analogique » échantillonné à fe : les composantes au-dessus de fe/2 se replient (comme sans filtre anti-repliement).
  LS.synthese = function (type, fe, duree, bruitFond) {
    const n = Math.round(fe * duree), x = new Float32Array(n), r = LS.hasard(5);
    if (type === "voyelles") {
      const ordre = ["a", "i", "ou"], f0 = 120;
      const amp = ordre.map(v => { const A = []; for (let h = 1; h * f0 < 7600; h++) { const f = h * f0, F = LS.FORMANTS[v]; A.push(Math.pow(f / f0, -1) * (resonance(f, F[0], 60) + 0.8 * resonance(f, F[1], 90) + 0.5 * resonance(f, F[2], 120))); } return A; });
      for (let i = 0; i < n; i++) {
        const t = i / fe, seg = Math.min(2, Math.floor(t / (duree / 3))), loc = t - seg * duree / 3, env = Math.min(1, loc / 0.03, (duree / 3 - loc) / 0.03);
        let v = 0; const A = amp[seg]; for (let h = 0; h < A.length; h++) v += A[h] * Math.sin(2 * Math.PI * (h + 1) * f0 * t);
        x[i] = 0.02 * v * Math.max(0, env);
      }
    } else if (type === "sifflement") {
      for (let i = 0; i < n; i++) { const t = i / fe; x[i] = 0.5 * Math.sin(2 * Math.PI * 2500 * t + 6 * Math.sin(2 * Math.PI * 5 * t)); }
    } else if (type === "glissando") {
      const f1 = 200, f2 = 7600;   // fréquence qui monte linéairement de 200 Hz à 7,6 kHz
      for (let i = 0; i < n; i++) { const t = i / fe; x[i] = 0.5 * Math.sin(2 * Math.PI * (f1 * t + (f2 - f1) * t * t / (2 * duree))); }
    } else if (type === "clics") {
      const periode = Math.round(0.025 * fe);   // un claquement toutes les 25 ms
      for (let i = 0; i < n; i++) x[i] = i % periode < Math.max(1, fe / 8000) ? 0.9 : 0;
    } else {
      for (let i = 0; i < n; i++) x[i] = 0.25 * r.gauss();
    }
    if (bruitFond) for (let i = 0; i < n; i++) x[i] += bruitFond * 0.25 * r.gauss();
    return x;
  };
  // Transformée de Fourier à court terme : fenêtre de Hann de N échantillons, avance de N/4. Résultat en dB.
  LS.spectrogramme = function (x, N) {
    const pas = N / 4, cols = [], han = new Float32Array(N);
    for (let i = 0; i < N; i++) han[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    for (let d = 0; d + N <= x.length; d += pas) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = x[d + i] * han[i];
      LS.fft(re, im);
      const col = new Float32Array(N / 2);
      for (let k = 0; k < N / 2; k++) col[k] = 10 * Math.log10((re[k] * re[k] + im[k] * im[k]) / N + 1e-12);
      cols.push(col);
    }
    return cols;
  };
  // Fréquence apparente d'une composante f échantillonnée à fe (repliement).
  LS.frequenceRepliee = (f, fe) => { const r = ((f % fe) + fe) % fe; return r > fe / 2 ? fe - r : r; };

  LS.sims.spectrogramme = function (el, cfg) {
    const DUREE = 1.5;
    const calcul = s => {
      const cle = [s.p.son, s.p.fe, s.p.N, s.p.bruitFond].join("|");
      if (s.etat.cle === cle) return s.etat;
      const x = LS.synthese(s.p.son, s.p.fe, DUREE, s.p.bruitFond), cols = LS.spectrogramme(x, s.p.N);
      let max = -200; cols.forEach(col => col.forEach(v => { if (v > max) max = v; }));
      // Image : une colonne par fenêtre, une ligne par case de fréquence ; 55 dB de dynamique.
      const img = document.createElement("canvas"); img.width = cols.length; img.height = s.p.N / 2;
      const g = img.getContext("2d"), id = g.createImageData(img.width, img.height);
      cols.forEach((col, ci) => { for (let k = 0; k < col.length; k++) {
        const v = Math.max(0, Math.min(1, (col[k] - max + 55) / 55)), o = 4 * ((img.height - 1 - k) * img.width + ci);
        id.data[o] = 255 * Math.min(1, v * 1.6); id.data[o + 1] = 255 * Math.max(0, v * 1.4 - 0.4); id.data[o + 2] = 90 * (1 - v) + 40 * v * v; id.data[o + 3] = 255; } });
      g.putImageData(id, 0, 0);
      Object.assign(s.etat, { cle, x, cols, img, max });
      return s.etat;
    };
    const zone = (s, W, H) => { const pile = etroit(W); return { x: 50, y: 30, w: W - 70, h: pile ? H * 0.55 : H - 150, pile }; };
    const freqAffichee = (s, u) => s.p.logf ? 50 * Math.pow(s.p.fe / 2 / 50, u) : u * s.p.fe / 2;   // u ∈ [0, 1] du bas vers le haut
    return LS.simAnimee(el, {
      hauteur: 440,
      controles: [
        { k: "son", nom: "Son", choix: [["voyelles", "voix : « a », « i », « ou »"], ["sifflement", "sifflement à 2,5 kHz"], ["glissando", "glissando 200 Hz → 7,6 kHz"], ["clics", "claquements toutes les 25 ms"], ["bruit", "bruit blanc"]], defaut: "voyelles" },
        { k: "fe", nom: "Fréquence d'échantillonnage", choix: [[8000, "8 kHz (téléphone)"], [16000, "16 kHz (reconnaissance vocale)"], [44100, "44,1 kHz (CD)"]], nombres: true, defaut: 16000 },
        { k: "N", nom: "Taille de la fenêtre d'analyse", choix: [[128, "128 échantillons"], [256, "256"], [512, "512"], [1024, "1 024"], [2048, "2 048"]], nombres: true, defaut: 256 },
        { k: "bruitFond", nom: "Bruit de fond", min: 0, max: 1, pas: 0.05, defaut: 0, dec: 2 },
        { k: "logf", nom: "Échelle des fréquences logarithmique (comme l'oreille)", bool: true, defaut: false }
      ],
      boutons: [{ k: "ecouter", texte: "▶ Écouter", action: s => {
        try {
          const C = window.AudioContext || window.webkitAudioContext, ac = new C(), x = calcul(s).x, b = ac.createBuffer(1, x.length, s.p.fe);
          b.copyToChannel(x, 0); const src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start();
        } catch (e) { if (LS.avis) LS.avis("Lecture du son impossible dans ce navigateur."); }
      } }],
      pointeur(s, type, px, py) {
        const z = zone(s, s.largeur(), 440);
        if (px < z.x || px > z.x + z.w || py < z.y || py > z.y + z.h) return;
        s.etat.curseur = { t: (px - z.x) / z.w * DUREE, f: freqAffichee(s, 1 - (py - z.y) / z.h) };
      },
      dessiner(s, ctx, W, H, c) {
        const e = calcul(s), z = zone(s, W, H);
        ctx.imageSmoothingEnabled = false;
        if (s.p.logf) {
          // Rééchantillonnage ligne par ligne pour l'échelle logarithmique
          const lignes = 120;
          for (let j = 0; j < lignes; j++) {
            const f = freqAffichee(s, 1 - (j + 0.5) / lignes), k = Math.min(e.img.height - 1, Math.round(f / (s.p.fe / 2) * e.img.height));
            ctx.drawImage(e.img, 0, e.img.height - 1 - k, e.img.width, 1, z.x, z.y + j * z.h / lignes, z.w, z.h / lignes + 1);
          }
        } else ctx.drawImage(e.img, z.x, z.y, z.w, z.h);
        ctx.strokeStyle = c.bordure; ctx.strokeRect(z.x, z.y, z.w, z.h);
        D().texte(ctx, (z.pile ? "Temps → 1,5 s ; fréquence ↑ " : "Spectrogramme : temps → (1,5 s), fréquence ↑ (0 à ") + LS.nombre(s.p.fe / 2000, 1) + " kHz" + (z.pile ? "" : ")"), z.x, 14, c.texte, 12, "left", true);
        [0, 0.25, 0.5, 0.75, 1].forEach(u => D().texte(ctx, LS.nombre(freqAffichee(s, u) / 1000, 1), z.x - 6, z.y + z.h * (1 - u), c.doux, 10, "right"));
        D().texte(ctx, "kHz", z.x - 6, z.y - 8, c.doux, 10, "right");
        if (s.etat.curseur) { const cu = s.etat.curseur, u = s.p.logf ? Math.log(Math.max(50, cu.f) / 50) / Math.log(s.p.fe / 2 / 50) : cu.f / (s.p.fe / 2);
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(z.x + cu.t / DUREE * z.w, z.y + (1 - u) * z.h, 6, 0, 7); ctx.stroke(); }
        // Forme d'onde
        const oy = z.pile ? z.y + z.h + 30 : z.y + z.h + 30, oh = H - oy - 14;
        ctx.strokeStyle = c.info; ctx.lineWidth = 1; ctx.beginPath();
        const pas = Math.max(1, Math.floor(e.x.length / z.w));
        for (let i = 0; i < z.w; i++) { let mi = 0, ma = 0; for (let j = i * pas; j < (i + 1) * pas && j < e.x.length; j++) { mi = Math.min(mi, e.x[j]); ma = Math.max(ma, e.x[j]); } ctx.moveTo(z.x + i, oy + oh / 2 - ma * oh / 2); ctx.lineTo(z.x + i, oy + oh / 2 - mi * oh / 2 + 0.5); }
        ctx.stroke();
        D().texte(ctx, "Forme d'onde (temps)", z.x, oy - 8, c.doux, 11, "left");
      },
      mesures(s) {
        const cu = s.etat.curseur, l = [["Résolution en fréquence (fe/N)", LS.nombre(s.p.fe / s.p.N, 1) + " Hz"], ["Durée d'une fenêtre (N/fe)", LS.nombre(1000 * s.p.N / s.p.fe, 1) + " ms"], ["Fréquence de Nyquist (fe/2)", LS.nombre(s.p.fe / 2000, 2) + " kHz"]];
        l.push(["Sous le curseur", cu ? LS.nombre(cu.t, 2) + " s · " + LS.nombre(cu.f, 0) + " Hz" : "clique sur le spectrogramme"]);
        return l;
      },
      explication(s) {
        let t = "Le spectrogramme découpe le son en courtes **fenêtres** et calcule, pour chacune, l'énergie de chaque fréquence (transformée de Fourier). Couleur claire = forte énergie. Une fenêtre **longue** sépare bien les fréquences mais brouille le temps ; une fenêtre **courte** fait l'inverse : c'est le compromis temps-fréquence. Les modèles de reconnaissance utilisent en général 25 ms à 16 kHz (400 échantillons), avec des fréquences comprimées façon oreille (échelle mel).";
        if (s.p.son === "voyelles") t += "\n\nVoix : des **raies** régulières (harmoniques de la note de la voix, ici 120 Hz) dont certaines bandes sont renforcées : les **formants**. Ce sont eux qui font la voyelle (« i » : F1 ≈ 270 Hz, F2 ≈ 2 300 Hz ; « a » : F1 ≈ 730, F2 ≈ 1 090 ; « ou » : 300 et 870 Hz).";
        if (s.p.fe === 8000 && (s.p.son === "glissando" || s.p.son === "voyelles")) t += "\n\n⚠ **Repliement** : à 8 kHz, rien au-dessus de 4 kHz ne peut être représenté. Les composantes plus aiguës réapparaissent à une fausse fréquence (le glissando redescend). Un vrai convertisseur filtre avant d'échantillonner pour l'éviter.";
        return t;
      }
    }, cfg);
  };

  /* =====================================================================
     4. Évaluer une transcription (WER, CER) et une traduction (BLEU)
     ===================================================================== */
  LS.motsNormalises = t => String(t).toLowerCase().replace(/[’']/g, "' ").replace(/[.,;:!?«»"()\-–—]/g, " ").split(/\s+/).filter(Boolean);
  // Distance d'édition (Levenshtein) avec le détail substitutions / suppressions / insertions et l'alignement.
  LS.distanceEdition = function (ref, hyp) {
    const n = ref.length, m = hyp.length, d = [];
    for (let i = 0; i <= n; i++) { d.push(new Array(m + 1).fill(0)); d[i][0] = i; }
    for (let j = 0; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1);
    let i = n, j = m, S = 0, Dl = 0, I = 0; const al = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) { const ok = ref[i - 1] === hyp[j - 1]; if (!ok) S++; al.unshift({ op: ok ? "ok" : "S", r: ref[i - 1], h: hyp[j - 1] }); i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { Dl++; al.unshift({ op: "D", r: ref[i - 1], h: "" }); i--; }
      else { I++; al.unshift({ op: "I", r: "", h: hyp[j - 1] }); j--; }
    }
    return { dist: d[n][m], S, D: Dl, I, alignement: al };
  };
  LS.wer = (ref, hyp) => { const r = LS.motsNormalises(ref), e = LS.distanceEdition(r, LS.motsNormalises(hyp)); return Object.assign(e, { N: r.length, taux: e.dist / Math.max(1, r.length) }); };
  LS.cer = (ref, hyp) => { const c = t => [...LS.motsNormalises(t).join(" ")], r = c(ref); return LS.distanceEdition(r, c(hyp)).dist / Math.max(1, r.length); };
  // BLEU à une référence : précisions modifiées des n-grammes 1 à 4, moyenne géométrique, pénalité de brièveté.
  // Lissage « +1 » pour n ≥ 2 (sinon une phrase courte sans 4-gramme commun vaudrait 0).
  LS.bleu = function (ref, hyp) {
    const r = LS.motsNormalises(ref), h = LS.motsNormalises(hyp);
    if (!h.length) return { score: 0, precisions: [0, 0, 0, 0], bp: 0 };
    const grammes = (t, n) => { const m = new Map(); for (let i = 0; i + n <= t.length; i++) { const g = t.slice(i, i + n).join(" "); m.set(g, (m.get(g) || 0) + 1); } return m; };
    const precisions = [];
    let logp = 0;
    for (let n = 1; n <= 4; n++) {
      const gh = grammes(h, n), gr = grammes(r, n); let bons = 0, total = 0;
      gh.forEach((k, g) => { bons += Math.min(k, gr.get(g) || 0); total += k; });
      const p = n === 1 ? bons / Math.max(1, total) : (bons + 1) / (total + 1);
      precisions.push(p); logp += Math.log(Math.max(p, 1e-9)) / 4;
    }
    const bp = h.length >= r.length ? 1 : Math.exp(1 - r.length / h.length);
    return { score: bp * Math.exp(logp), precisions, bp };
  };
  // Phrases inventées pour l'exercice (aucune ne vient d'un vrai sous-titre).
  LS.CAS_EVALUATION = {
    transcription: { ref: "le marché ouvre demain matin à sept heures", hyps: [
      ["parfaite", "le marché ouvre demain matin à sept heures", "sens conservé"],
      ["oubli", "le marché ouvre demain à sept heures", "sens presque conservé (« matin » perdu)"],
      ["orthographe", "le marcher ouvre demain matin à sept heures", "sens conservé, faute d'orthographe"],
      ["negation", "le marché n'ouvre pas demain matin à sept heures", "sens inversé"],
      ["bavard", "euh le le marché il ouvre euh demain matin à sept heures hein", "sens conservé, hésitations transcrites"]] },
    traduction: { ref: "le puits du village est à sec depuis trois jours", hyps: [
      ["proche", "le puits de la ville est à sec depuis trois jours", "sens presque conservé"],
      ["paraphrase", "depuis trois jours il n'y a plus d'eau dans le puits du village", "sens conservé"],
      ["negation", "le puits du village n'est pas à sec depuis trois jours", "sens inversé"],
      ["mot-a-mot", "puits village sec trois jours", "sens deviné, phrase incorrecte"],
      ["hors-sujet", "le marché du village est ouvert depuis trois jours", "sens faux"]] }
  };

  LS.sims.evaluation = function (el, cfg) {
    const cas = s => LS.CAS_EVALUATION[s.p.tache];
    const preset = s => cas(s).hyps.find(h => h[0] === s.p.hyp) || null;
    const sim = LS.simAnimee(el, {
      hauteur: 380,
      controles: [
        { k: "tache", nom: "Tâche", choix: [["transcription", "transcription (reconnaissance de la parole)"], ["traduction", "traduction vers le français"]], defaut: "transcription" },
        { k: "hyp", nom: "Sortie du système", choix: [["parfaite", "parfaite"], ["oubli", "un mot oublié"], ["orthographe", "faute d'orthographe"], ["negation", "négation ajoutée"], ["bavard", "hésitations"], ["libre", "texte libre (à écrire ci-dessous)"]], defaut: "oubli" }
      ],
      changement(s, k) {
        if (k === "tache") {
          const l = cas(s).hyps; s.p.hyp = l[0][0];
          const sel = el.querySelector("select:nth-of-type(1)"); void sel;
          majChoix(s);
        }
        if (s.p.hyp !== "libre") s.etat.texte = preset(s)[1];
        champ.value = s.etat.texte;
      },
      init(s) { s.etat.texte = preset(s) ? preset(s)[1] : ""; },
      avancer(s) {
        const c = cas(s);
        s.etat.w = LS.wer(c.ref, s.etat.texte); s.etat.c = LS.cer(c.ref, s.etat.texte); s.etat.b = LS.bleu(c.ref, s.etat.texte);
      },
      dessiner(s, ctx, W, H, c) {
        const e = s.etat; if (!e.w) return;
        D().texte(ctx, etroit(W) ? "Référence (haut) et sortie (bas), mot à mot" : "Référence (validée par un humain) et sortie du système, mot à mot", 16, 14, c.texte, 12, "left", true);
        const coul = { ok: c.ok, S: "#e8841a", D: c.alerte, I: c.info };
        let x = 16, y = 44; const lh = 46;
        ctx.font = "600 13px Nunito, Segoe UI, sans-serif";
        e.w.alignement.forEach(a => {
          const lw = Math.max(ctx.measureText(a.r || "—").width, ctx.measureText(a.h || "—").width) + 14;
          if (x + lw > W - 10) { x = 16; y += lh + 12; }
          ctx.fillStyle = coul[a.op]; ctx.globalAlpha = a.op === "ok" ? 0.18 : 0.35; ctx.fillRect(x, y, lw - 4, lh); ctx.globalAlpha = 1;
          D().texte(ctx, a.r || "—", x + 4, y + 12, c.texte, 13, "left", a.op !== "ok");
          D().texte(ctx, a.h || "—", x + 4, y + 33, c.texte, 13, "left", a.op !== "ok");
          if (a.op !== "ok") D().texte(ctx, a.op, x + lw - 10, y + lh - 6, coul[a.op], 10, "right", true);
          x += lw;
        });
        y += lh + 22;
        if (etroit(W)) { D().texte(ctx, "S = substitution · D = suppression", 16, y, c.doux, 11, "left"); y += 16; D().texte(ctx, "I = insertion (mot en trop)", 16, y, c.doux, 11, "left"); }
        else D().texte(ctx, "S = substitution · D = suppression (mot oublié) · I = insertion (mot en trop)", 16, y, c.doux, 11, "left");
        // Barres des scores
        const bw = Math.min(360, W - 230), barre = (yy, v, nom, coulB) => {
          ctx.fillStyle = c.bordure; ctx.fillRect(130, yy - 8, bw, 16); ctx.fillStyle = coulB; ctx.fillRect(130, yy - 8, bw * Math.min(1, v), 16);
          D().texte(ctx, nom, 16, yy, c.texte, 12, "left", true); D().texte(ctx, LS.nombre(100 * v, 0) + " %" + (v > 1 ? " (> 100 %)" : ""), 136 + bw, yy, c.texte, 12, "left");
        };
        barre(y + 30, e.w.taux, "WER (↓ mieux)", c.alerte); barre(y + 56, e.c, "CER (↓ mieux)", "#e8841a"); barre(y + 82, e.b.score, "BLEU (↑ mieux)", c.ok);
      },
      mesures(s) {
        const e = s.etat, p = s.p.hyp !== "libre" ? preset(s) : null; if (!e.w) return [];
        return [["Erreurs (S + D + I) / mots de référence", `(${e.w.S} + ${e.w.D} + ${e.w.I}) / ${e.w.N}`], ["WER", LS.nombre(100 * e.w.taux, 1) + " %"], ["CER", LS.nombre(100 * e.c, 1) + " %"],
          ["BLEU", LS.nombre(100 * e.b.score, 1)], ["Jugement humain du sens", p ? p[2] : "à toi de juger"]];
      },
      explication(s) {
        const p = s.p.hyp !== "libre" ? preset(s) : null;
        let t = "Le **WER** compte les mots à corriger pour passer de la sortie à la référence ; il peut dépasser 100 % si le système ajoute beaucoup de mots. Le **CER** fait de même avec les lettres : une faute d'orthographe coûte un mot entier au WER, mais une lettre au CER. Le **BLEU** compte les suites de 1 à 4 mots communes avec la référence. Aucun ne lit le **sens** : une paraphrase juste est punie, une négation qui inverse tout ne coûte presque rien. D'où l'évaluation humaine sur un jeu de test de référence.";
        if (p && p[2].startsWith("sens inversé")) t += "\n\n⚠ Scores flatteurs, sens **faux** : le danger des métriques automatiques.";
        return t;
      }
    }, cfg);
    // Champ texte libre et sélection des sorties propres à chaque tâche
    const champ = LS.el("textarea", { id: "hypothese-libre", rows: 2, style: "width:100%;box-sizing:border-box;font:inherit;margin-top:8px;padding:8px;border-radius:8px;border:1px solid var(--bordure);background:var(--carte);color:var(--texte)" });
    champ.value = sim.etat.texte;
    champ.addEventListener("input", () => { sim.etat.texte = champ.value; sim.p.hyp = "libre"; sim.majControles(); });
    sim.canvas.after(LS.el("label", { for: "hypothese-libre", style: "display:block;margin-top:8px", text: "Sortie du système (modifiable) :" }), champ);
    function majChoix(s) {
      const sel = el.querySelectorAll(".controles select")[1]; if (!sel) return;
      sel.innerHTML = "";
      cas(s).hyps.concat([["libre", "texte libre"]]).forEach(h => sel.append(LS.el("option", { value: h[0], text: h[0] === "libre" ? "texte libre (à écrire ci-dessous)" : h[0] + " : " + h[1] })));
      sel.value = s.p.hyp;
    }
    majChoix(sim);
    sim.champ = champ;
    return sim;
  };

  /* =====================================================================
     5. Fuite de données : découper par série ou par segment
     ===================================================================== */
  // Chaque segment : 3 classes (prototypes sur un cercle) + « style » propre à sa série (même locuteur,
  // même micro, même sous-titreur) + bruit. Le style est un décalage commun à tous les segments d'une série.
  LS.donneesSeries = function (nbSeries, parSerie, style, graine) {
    const r = LS.hasard(graine), pts = [];
    const proto = [0, 1, 2].map(k => [Math.cos(2 * Math.PI * k / 3), Math.sin(2 * Math.PI * k / 3)]);
    for (let s = 0; s < nbSeries; s++) {
      const sx = style * 0.7 * r.gauss(), sy = style * 0.7 * r.gauss();
      for (let i = 0; i < parSerie; i++) { const c = Math.floor(r() * 3); pts.push({ x: proto[c][0] + sx + 0.45 * r.gauss(), y: proto[c][1] + sy + 0.45 * r.gauss(), c, serie: s }); }
    }
    return pts;
  };
  // Classifieur des k plus proches voisins : exactitude sur test.
  LS.exactitudeKppv = function (train, test, k) {
    let bons = 0;
    test.forEach(p => {
      const v = train.map(q => [(q.x - p.x) ** 2 + (q.y - p.y) ** 2, q.c]).sort((a, b) => a[0] - b[0]).slice(0, k), votes = [0, 0, 0];
      v.forEach(([, c]) => votes[c]++);
      if (votes.indexOf(Math.max(...votes)) === p.c) bons++;
    });
    return bons / Math.max(1, test.length);
  };
  // Scores moyens sur plusieurs tirages : découpage par segment, par série, et vraie performance sur des séries jamais vues.
  LS.experienceFuite = function (p, graine) {
    const tirages = 4, res = { segment: 0, serie: 0, reel: 0 };
    for (let t = 0; t < tirages; t++) {
      const g = (graine || 1) * 100 + t, pts = LS.donneesSeries(p.nbSeries, p.parSerie, p.style, g), r = LS.hasard(g + 50);
      const melange = pts.map(q => [r(), q]).sort((a, b) => a[0] - b[0]).map(a => a[1]), nt = Math.round(0.2 * pts.length);
      res.segment += LS.exactitudeKppv(melange.slice(nt), melange.slice(0, nt), p.k);
      const seriesTest = new Set(); while (seriesTest.size < Math.max(1, Math.round(0.2 * p.nbSeries))) seriesTest.add(Math.floor(r() * p.nbSeries));
      res.serie += LS.exactitudeKppv(pts.filter(q => !seriesTest.has(q.serie)), pts.filter(q => seriesTest.has(q.serie)), p.k);
      res.reel += LS.exactitudeKppv(pts, LS.donneesSeries(10, p.parSerie, p.style, g + 7777), p.k);
    }
    Object.keys(res).forEach(k => { res[k] /= tirages; });
    return res;
  };

  LS.sims.fuite = function (el, cfg) {
    const calcul = s => {
      const cle = [s.p.nbSeries, s.p.parSerie, s.p.style, s.p.k, s.etat.graine].join("|");
      if (s.etat.cle !== cle) { s.etat.cle = cle; s.etat.res = LS.experienceFuite(s.p, s.etat.graine); s.etat.pts = LS.donneesSeries(s.p.nbSeries, s.p.parSerie, s.p.style, s.etat.graine * 100); }
      return s.etat;
    };
    return LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "decoupage", nom: "Découpage entraînement / test", choix: [["segment", "par segment, au hasard (80 / 20)"], ["serie", "par série (20 % des séries en test)"]], defaut: "segment" },
        { k: "nbSeries", nom: "Nombre de séries (épisodes, locuteurs)", min: 4, max: 40, pas: 1, defaut: 10 },
        { k: "parSerie", nom: "Segments par série", min: 10, max: 40, pas: 1, defaut: 25 },
        { k: "style", nom: "Force du « style » propre à chaque série", min: 0, max: 2, pas: 0.05, defaut: 1, dec: 2 },
        { k: "k", nom: "k (nombre de voisins consultés)", min: 1, max: 15, pas: 2, defaut: 5 }
      ],
      boutons: [{ k: "tirage", texte: "🎲 Nouveau tirage", action: s => { s.etat.graine++; } }],
      init(s) { s.etat.graine = 1; },
      dessiner(s, ctx, W, H, c) {
        const e = calcul(s), pile = etroit(W), cote = pile ? Math.min(W - 40, H * 0.5) : Math.min(H - 50, W * 0.45), x0 = pile ? (W - cote) / 2 : 20, y0 = 28;
        const X = v => x0 + (v + 3) / 6 * cote, Y = v => y0 + (3 - v) / 6 * cote, coul = ["#2b6cb0", "#e8841a", "#2f8f4e"];
        ctx.strokeStyle = c.bordure; ctx.strokeRect(x0, y0, cote, cote);
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, cote, cote); ctx.clip();
        const enTest = q => s.p.decoupage === "serie" ? q.serie < Math.max(1, Math.round(0.2 * s.p.nbSeries)) : (q.serie * 31 + Math.round(q.x * 1000)) % 5 === 0;
        e.pts.forEach(q => { ctx.fillStyle = coul[q.c]; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
          if (enTest(q)) { ctx.strokeStyle = c.texte; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 5.5, 0, 7); ctx.stroke(); } });
        ctx.restore();
        D().texte(ctx, "Segments : couleur = classe, cerclés = exemple de jeu de test", x0, 12, c.texte, 12, "left", true);
        // Barres des scores
        const bx = pile ? 20 : x0 + cote + 40, by = pile ? y0 + cote + 40 : 60, bw = pile ? W - 160 : W - bx - 120;
        const barre = (i, v, nom, cl, souligne) => { const y = by + i * 58;
          D().texte(ctx, nom, bx, y, c.texte, 12, "left", souligne);
          ctx.fillStyle = c.bordure; ctx.fillRect(bx, y + 10, bw, 18); ctx.fillStyle = cl; ctx.fillRect(bx, y + 10, bw * v, 18);
          D().texte(ctx, LS.nombre(100 * v, 0) + " %", bx + bw + 8, y + 19, c.texte, 13, "left", true); };
        barre(0, e.res.segment, "Score annoncé, découpage par segment", c.alerte, s.p.decoupage === "segment");
        barre(1, e.res.serie, "Score annoncé, découpage par série", c.info, s.p.decoupage === "serie");
        barre(2, e.res.reel, "Score réel sur 10 séries jamais vues", c.ok, true);
        D().texte(ctx, "Moyenne de 4 tirages, classifieur des k plus proches voisins", bx, by + 3 * 58 + 4, c.doux, 11, "left");
      },
      mesures(s) {
        const e = calcul(s), annonce = e.res[s.p.decoupage], ecart = annonce - e.res.reel;
        return [["Score annoncé (découpage choisi)", LS.nombre(100 * annonce, 1) + " %"], ["Score réel (nouvelles séries)", LS.nombre(100 * e.res.reel, 1) + " %"],
          ["Optimisme du score annoncé", (ecart >= 0 ? "+" : "") + LS.nombre(100 * ecart, 1) + " points", ecart > 0.05 ? "alerte" : ""], ["Segments au total", String(s.p.nbSeries * s.p.parSerie)]];
      },
      explication(s) {
        const e = calcul(s);
        let t = "Les segments d'une même série se ressemblent (même voix, même micro, mêmes tournures du sous-titreur). Si on découpe **au hasard par segment**, le test contient des « cousins » des exemples d'entraînement : le modèle les reconnaît sans avoir appris la tâche, et le score est **trop beau**. Découper **par série** (et, pour un jeu de test de référence, par producteur) reproduit la vraie situation : des séries jamais entendues.";
        if (e.res.segment - e.res.reel > 0.05) t += "\n\n⚠ Le découpage par segment surestime la performance de **" + LS.nombre(100 * (e.res.segment - e.res.reel), 0) + " points**.";
        return t;
      }
    }, cfg);
  };
})();
