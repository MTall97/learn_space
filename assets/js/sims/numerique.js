/* Simulations numériques : écriture binaire (bits cliquables) et conversion analogique-numérique
   (échantillonnage, quantification, repliement de spectre). */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;

  /* ---------- Binaire ---------- */
  LS.sims.binaire = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 260,
      controles: [{ k: "signe", nom: "Entier signé (complément à deux)", bool: true, defaut: false }],
      boutons: [
        { k: "zero", texte: "Tout à 0", action: s => { s.etat.bits = 0; } },
        { k: "inv", texte: "Inverser les bits", action: s => { s.etat.bits = (~s.etat.bits) & 255; } },
        { k: "plus", texte: "+1", action: s => { s.etat.bits = (s.etat.bits + 1) & 255; } },
        { k: "dec", texte: "Décaler à gauche (×2)", action: s => { s.etat.bits = (s.etat.bits << 1) & 255; } }
      ],
      init(s) { s.etat.bits = 0; },
      pointeur(s, type, x, y) {
        if (type !== "bas") return;
        const W = s.largeur(), w = Math.min(80, (W - 40) / 8), x0 = (W - 8 * w) / 2;
        if (y < 40 || y > 40 + w) return;
        const i = Math.floor((x - x0) / w);
        if (i >= 0 && i < 8) s.etat.bits ^= 1 << (7 - i);
      },
      dessiner(s, ctx, W, H, c) {
        const w = Math.min(80, (W - 40) / 8), x0 = (W - 8 * w) / 2, b = s.etat.bits;
        for (let i = 0; i < 8; i++) {
          const v = (b >> (7 - i)) & 1, x = x0 + i * w;
          ctx.fillStyle = v ? c.accent : c.carte; ctx.fillRect(x + 3, 40, w - 6, w - 6);
          ctx.strokeStyle = c.bordure; ctx.lineWidth = 2; ctx.strokeRect(x + 3, 40, w - 6, w - 6);
          D().texte(ctx, String(v), x + w / 2, 40 + (w - 6) / 2, v ? "#fff" : c.texte, 28, "center", true);
          const poids = s.p.signe && i === 0 ? "−128" : String(1 << (7 - i));
          D().texte(ctx, poids, x + w / 2, 26, c.doux, 12, "center");
          D().texte(ctx, "b" + (7 - i), x + w / 2, 40 + w + 8, c.doux, 11, "center");
        }
        D().texte(ctx, "← poids fort (MSB)", x0, 40 + w + 28, c.doux, 11);
        D().texte(ctx, "poids faible (LSB) →", x0 + 8 * w, 40 + w + 28, c.doux, 11, "right");
        D().texte(ctx, "Clique sur un bit pour le basculer", W / 2, H - 16, c.doux, 12, "center");
      },
      valeur(s) { const b = s.etat.bits; return s.p.signe && b > 127 ? b - 256 : b; },
      mesures(s) {
        const b = s.etat.bits;
        return [["Décimal", String(this.valeur(s))], ["Hexadécimal", "0x" + b.toString(16).toUpperCase().padStart(2, "0")], ["Binaire", b.toString(2).padStart(8, "0")],
          ["Caractère ASCII", b >= 32 && b < 127 ? "« " + String.fromCharCode(b) + " »" : "(non imprimable)"]];
      },
      explication(s) {
        return "Un **bit** vaut 0 ou 1 ; 8 bits forment un **octet**. Chaque bit a un **poids** (puissance de 2) : la valeur est la somme des poids des bits à 1. Un octet va de 0 à 255 (ou de −128 à +127 en **complément à deux**, où le bit de poids fort compte −128). En **hexadécimal**, chaque groupe de 4 bits s'écrit avec un chiffre de 0 à F.";
      }
    }, cfg);
  };

  /* ---------- Échantillonnage et quantification ---------- */
  LS.sims.echantillonnage = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 420,
      controles: [
        { k: "f", nom: "Fréquence du signal", min: 1, max: 40, pas: 0.5, defaut: 3, unite: "Hz", dec: 1 },
        { k: "fe", nom: "Fréquence d'échantillonnage", min: 2, max: 100, pas: 1, defaut: 30, unite: "Hz" },
        { k: "n", nom: "Résolution du convertisseur", min: 1, max: 12, pas: 1, defaut: 3, unite: "bits" }
      ],
      dessiner(s, ctx, W, H, c) {
        const T = 1, N = Math.pow(2, s.p.n), q = 2 / N;
        const sig = t => Math.sin(2 * Math.PI * s.p.f * t);
        const quant = v => Math.min(N - 1, Math.max(0, Math.floor((v + 1) / q))) * q - 1 + q / 2;
        const pts = [...Array(801)].map((_, i) => [i / 800 * T, sig(i / 800 * T)]);
        const ech = [], esc = [];
        for (let k = 0; k * (1 / s.p.fe) <= T; k++) { const t = k / s.p.fe, v = quant(sig(t)); ech.push({ x: t, y: v, coul: c.accentFort, r: 4 }); esc.push([t, v]); esc.push([Math.min(T, (k + 1) / s.p.fe), v]); }
        // Fréquence apparente après repliement
        const fa = Math.abs(s.p.f - s.p.fe * Math.round(s.p.f / s.p.fe));
        const rec = [...Array(801)].map((_, i) => [i / 800 * T, Math.sin(2 * Math.PI * fa * i / 800 * T + (s.p.f % s.p.fe > s.p.fe / 2 ? Math.PI : 0))]);
        const g = D().graphe(ctx, 40, 30, W - 60, H - 80, { c, xlim: [0, T], ylim: [-1.25, 1.25],
          series: [{ pts, coul: c.info, ep: 2 }, { pts: esc, coul: c.accentFort, ep: 1.5 }].concat(s.p.f > s.p.fe / 2 ? [{ pts: rec, coul: c.alerte, ep: 1.5 }] : []),
          points: ech, titre: "Bleu : signal analogique · orange : échantillons quantifiés (" + N + " niveaux)" + (s.p.f > s.p.fe / 2 ? " · rouge : ce que l'on croit avoir mesuré" : ""), xlab: "temps (s)" });
        for (let k = 0; k <= N && N <= 16; k++) { ctx.strokeStyle = "rgba(128,128,128,.15)"; ctx.beginPath(); ctx.moveTo(40, g.Y(-1 + k * q)); ctx.lineTo(W - 20, g.Y(-1 + k * q)); ctx.stroke(); }
        if (s.p.f > s.p.fe / 2) D().texte(ctx, "⚠ Repliement de spectre : fe < 2f, le signal semble avoir une fréquence de " + LS.nombre(fa, 1) + " Hz", W / 2, H - 14, c.alerte, 13, "center", true);
      },
      mesures(s) {
        const N = Math.pow(2, s.p.n);
        return [["Niveaux de quantification", String(N)], ["Pas de quantification (plage 2 V)", LS.si(2 / N, "V")], ["Rapport signal/bruit de quantification", LS.nombre(6.02 * s.p.n + 1.76, 1) + " dB"],
          ["Condition de Shannon fe > 2f", s.p.fe > 2 * s.p.f ? "respectée" : "NON respectée", s.p.fe > 2 * s.p.f ? "" : "alerte"], ["Débit produit", s.p.fe * s.p.n + " bit/s"]];
      },
      explication() { return "Un **convertisseur analogique-numérique** (CAN, ADC) mesure le signal à intervalles réguliers (**échantillonnage**, fréquence fe) et arrondit chaque mesure à l'un des 2ⁿ niveaux (**quantification**, n bits). **Shannon-Nyquist** : il faut fe > 2 × la plus haute fréquence du signal, sinon elle se « replie » en une fausse fréquence plus basse. Le CD audio : fe = 44,1 kHz (pour entendre jusqu'à 20 kHz), 16 bits."; }
    }, cfg);
  };
})();
