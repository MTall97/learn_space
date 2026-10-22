/* Simulations de télécommunications : signal et spectre, modulation, bande passante et débit,
   liaison série UART, encapsulation OSI, adressage IPv4, commutation de circuits / de paquets. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;

  /* Générateur pseudo-aléatoire reproductible (bruit, routes). */
  function alea(graine) { let x = graine || 12345; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

  /* ---------- Signal : temps et fréquence ---------- */
  function harmoniques(forme, N, A) {
    const h = [];
    for (let k = 1; k <= N; k++) {
      let a = 0;
      if (forme === "sinus") a = k === 1 ? A : 0;
      else if (forme === "carré") a = k % 2 ? 4 * A / (Math.PI * k) : 0;
      else if (forme === "triangle") a = k % 2 ? 8 * A / (Math.PI * Math.PI * k * k) * (((k - 1) / 2) % 2 ? -1 : 1) : 0;
      else if (forme === "dent de scie") a = 2 * A / (Math.PI * k) * (k % 2 ? 1 : -1);
      h.push(a);
    }
    return h;
  }
  LS.harmoniques = harmoniques;
  LS.sims.signal = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 440,
      controles: [
        { k: "forme", nom: "Forme du signal", choix: ["sinus", "carré", "triangle", "dent de scie"], defaut: "sinus" },
        { k: "f", nom: "Fréquence fondamentale", min: 100, max: 2000, pas: 50, defaut: 500, unite: "Hz" },
        { k: "A", nom: "Amplitude", min: 0.5, max: 5, pas: 0.1, defaut: 2, unite: "V", dec: 1 },
        { k: "N", nom: "Nombre d'harmoniques additionnées", min: 1, max: 30, pas: 1, defaut: 1 },
        { k: "bruit", nom: "Bruit (écart-type)", min: 0, max: 2, pas: 0.05, defaut: 0, unite: "V", dec: 2 }
      ],
      init(s) { s.etat.r = alea(7); },
      dessiner(s, ctx, W, H, c) {
        const h = harmoniques(s.p.forme, s.p.N, s.p.A), f = s.p.f, T = 3 / f;
        const pts = [];
        for (let i = 0; i <= 600; i++) {
          const t = i / 600 * T; let v = 0;
          h.forEach((a, k) => { v += a * Math.sin(2 * Math.PI * (k + 1) * f * t); });
          if (s.p.bruit > 0) v += s.p.bruit * gauss(s.etat.r);
          pts.push([t * 1000, v]);
        }
        const lim = s.p.A * 1.6 + 2 * s.p.bruit;
        D().graphe(ctx, 40, 30, W - 60, H / 2 - 50, { c, xlim: [0, T * 1000], ylim: [-lim, lim], series: [{ pts, coul: c.accentFort, ep: 1.6 }], titre: "Représentation temporelle u(t)", xlab: "temps (ms)", ylab: LS.nombre(lim, 1) + " V" });
        // Spectre
        const fmax = Math.max(5000, f * (s.p.N + 1)), y0 = H / 2 + 20, hh = H / 2 - 50;
        const g = D().graphe(ctx, 40, y0, W - 60, hh, { c, xlim: [0, fmax], ylim: [0, s.p.A * 1.4], series: [], titre: "Représentation fréquentielle (spectre d'amplitude)", xlab: "fréquence (Hz)" });
        if (s.p.bruit > 0) { ctx.fillStyle = "rgba(150,150,150,.25)"; const yb = g.Y(s.p.bruit * 0.15); ctx.fillRect(40, yb, W - 60, y0 + hh - yb); }
        h.forEach((a, k) => { if (Math.abs(a) < 1e-6) return; const x = g.X((k + 1) * f); ctx.strokeStyle = c.info; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, g.Y(0)); ctx.lineTo(x, g.Y(Math.abs(a))); ctx.stroke(); });
        for (let F = 0; F <= fmax; F += fmax / 5) D().texte(ctx, Math.round(F), g.X(F), y0 + hh + 12, c.doux, 10, "center");
      },
      mesures(s) {
        const h = harmoniques(s.p.forme, s.p.N, s.p.A), Ps = h.reduce((a, b) => a + b * b / 2, 0), Pn = s.p.bruit * s.p.bruit;
        const larg = h.reduce((m, a, k) => Math.abs(a) > 1e-6 ? (k + 1) * s.p.f : m, 0);
        return [["Période T = 1/f", LS.nombre(1000 / s.p.f, 2) + " ms"], ["Fréquence", s.p.f + " Hz"], ["Puissance du signal (sur 1 Ω)", LS.nombre(Ps, 2) + " W"],
          ["Rapport signal/bruit", Pn > 0 ? LS.nombre(10 * Math.log10(Ps / Pn), 1) + " dB" : "∞"], ["Fréquence la plus haute présente", larg + " Hz"]];
      },
      explication(s) {
        return "Tout signal périodique est une **somme de sinusoïdes** : la **fondamentale** (fréquence f) et des **harmoniques** (2f, 3f…) — c'est la **série de Fourier**. Le **spectre** montre l'amplitude de chacune. Plus un signal a des fronts raides (carré), plus il contient d'harmoniques élevées, donc plus il occupe de **bande passante**. Le **bruit**, aléatoire, s'étale sur toutes les fréquences.";
      }
    }, cfg);
  };

  /* ---------- Modulation ---------- */
  const BITS = [1, 0, 1, 1, 0, 0, 1, 1, 1, 0];
  LS.sims.modulation = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 460,
      controles: [
        { k: "type", nom: "Modulation", choix: [["AM", "AM : amplitude (analogique)"], ["FM", "FM : fréquence (analogique)"], ["ASK", "ASK : tout ou rien (numérique)"], ["FSK", "FSK : deux fréquences (numérique)"], ["PSK", "PSK : phase (numérique)"]], defaut: "AM" },
        { k: "fm", nom: "Fréquence du message / débit", min: 1, max: 8, pas: 1, defaut: 2, unite: "Hz · bit/s" },
        { k: "fc", nom: "Fréquence de la porteuse", min: 10, max: 60, pas: 1, defaut: 30, unite: "Hz" },
        { k: "m", nom: "Indice de modulation", min: 0.1, max: 1.5, pas: 0.05, defaut: 0.6, dec: 2 }
      ],
      dessiner(s, ctx, W, H, c) {
        const num = ["ASK", "FSK", "PSK"].includes(s.p.type), T = 1.25, n = 1500;
        const msg = t => num ? BITS[Math.floor(t * s.p.fm) % BITS.length] : Math.sin(2 * Math.PI * s.p.fm * t);
        const m = [], por = [], mod = [];
        let phase = 0;
        for (let i = 0; i <= n; i++) {
          const t = i / n * T, x = msg(t), dt = T / n;
          por.push([t, Math.cos(2 * Math.PI * s.p.fc * t)]);
          m.push([t, x]);
          let y = 0;
          if (s.p.type === "AM") y = (1 + s.p.m * x) * Math.cos(2 * Math.PI * s.p.fc * t);
          else if (s.p.type === "FM") { phase += 2 * Math.PI * (s.p.fc + s.p.m * s.p.fc * 0.5 * x) * dt; y = Math.cos(phase); }
          else if (s.p.type === "ASK") y = x * Math.cos(2 * Math.PI * s.p.fc * t);
          else if (s.p.type === "FSK") { phase += 2 * Math.PI * s.p.fc * (x ? 1 + 0.5 * s.p.m : 1 - 0.3 * s.p.m) * dt; y = Math.cos(phase); }
          else y = Math.cos(2 * Math.PI * s.p.fc * t + (x ? 0 : Math.PI));
          mod.push([t, y]);
        }
        const h = (H - 70) / 3;
        D().graphe(ctx, 40, 24, W - 60, h - 20, { c, xlim: [0, T], ylim: [-1.3, 1.3], series: [{ pts: m, coul: c.info, ep: 2.5 }], titre: num ? "Message numérique (bits " + BITS.join("") + ")" : "Message (le son, la voix…)" });
        D().graphe(ctx, 40, 24 + h + 10, W - 60, h - 20, { c, xlim: [0, T], ylim: [-1.3, 1.3], series: [{ pts: por, coul: c.doux, ep: 1 }], titre: "Porteuse haute fréquence (seule, elle ne transporte rien)" });
        const lim = s.p.type === "AM" ? 1 + s.p.m + 0.2 : 1.3;
        D().graphe(ctx, 40, 24 + 2 * h + 20, W - 60, h - 20, { c, xlim: [0, T], ylim: [-lim, lim], series: [{ pts: mod, coul: c.accentFort, ep: 1.4 }], titre: "Signal modulé (ce qui est émis par l'antenne)", xlab: "temps (s)" });
        if (s.p.type === "AM" && s.p.m > 1) D().texte(ctx, "⚠ Surmodulation : l'enveloppe se croise, le son sera déformé", W / 2, H - 10, c.alerte, 12, "center", true);
      },
      mesures(s) {
        const bw = s.p.type === "AM" ? 2 * s.p.fm : s.p.type === "FM" ? 2 * (s.p.m * s.p.fc * 0.5 + s.p.fm) : 2 * s.p.fm * (s.p.type === "FSK" ? 2 : 1);
        return [["Bande occupée (approx.)", LS.nombre(bw, 1) + " Hz"], ["Fréquence de la porteuse", s.p.fc + " Hz"], ["Règle de Carson (FM) : 2(Δf + fm)", s.p.type === "FM" ? LS.nombre(2 * (s.p.m * s.p.fc * 0.5 + s.p.fm), 1) + " Hz" : "—"]];
      },
      explication(s) {
        const t = { AM: "**AM** : l'amplitude de la porteuse suit le message. Simple, mais sensible aux parasites (qui modifient l'amplitude). Radio grandes ondes.",
          FM: "**FM** : la fréquence de la porteuse varie avec le message. Plus de bande occupée, mais bien moins sensible aux parasites. Radio FM 88–108 MHz.",
          ASK: "**ASK** (tout ou rien) : porteuse présente = 1, absente = 0. Télécommandes 433 MHz, fibre optique (lumière allumée/éteinte).",
          FSK: "**FSK** : une fréquence pour 0, une autre pour 1. Anciens modems, LoRa (variante), Bluetooth (GFSK).",
          PSK: "**PSK** : la phase de la porteuse s'inverse selon le bit. Robuste ; ses variantes (QPSK, QAM) codent plusieurs bits par symbole : Wi-Fi, 4G, satellite." }[s.p.type];
        return "On ne peut pas émettre directement un signal basse fréquence (antenne géante, tous les émetteurs mélangés). On **module** une **porteuse** haute fréquence, différente pour chaque station. " + t;
      }
    }, cfg);
  };

  /* ---------- Bande passante et débit ---------- */
  LS.sims.bandePassante = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "D", nom: "Débit", min: 1, max: 40, pas: 1, defaut: 10, unite: "kbit/s" },
        { k: "B", nom: "Bande passante du câble", min: 1, max: 40, pas: 0.5, defaut: 20, unite: "kHz", dec: 1 },
        { k: "bruit", nom: "Bruit", min: 0, max: 0.4, pas: 0.01, defaut: 0.05, unite: "V", dec: 2 }
      ],
      boutons: [{ k: "nb", texte: "🎲 Nouveau bruit", action: s => { s.etat.graine = (s.etat.graine || 1) + 1; } }],
      init(s) { s.etat.graine = 1; const r = alea(99); s.etat.bits = [...Array(40)].map(() => r() > 0.5 ? 1 : 0); },
      calc(s) {
        const ech = 40, n = s.etat.bits.length * ech, Tb = 1 / (s.p.D * 1000), dt = Tb / ech;
        // Canal : deux filtres passe-bas du 1er ordre en cascade (−3 dB à B).
        const fc = s.p.B * 1000 * 1.554, a = 1 - Math.exp(-2 * Math.PI * fc * dt);
        const r = alea(s.etat.graine * 31 + 7);
        let y1 = 0, y2 = 0; const ent = [], sor = [];
        for (let i = 0; i < n; i++) {
          const x = s.etat.bits[Math.floor(i / ech)];
          y1 += a * (x - y1); y2 += a * (y1 - y2);
          ent.push(x); sor.push(y2 + s.p.bruit * gauss(r));
        }
        const dec = s.etat.bits.map((b, k) => sor[k * ech + Math.floor(ech * 0.75)] > 0.5 ? 1 : 0);
        const err = dec.reduce((e, d, k) => e + (d !== s.etat.bits[k] ? 1 : 0), 0);
        return { ent, sor, dec, err, ech, Tb };
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s), n = k.ent.length;
        const g = D().graphe(ctx, 40, 30, W - 60, H - 90, { c, xlim: [0, n], ylim: [-0.5, 1.6], series: [{ pts: k.ent.map((v, i) => [i, v]), coul: c.doux, ep: 1.5 }, { pts: k.sor.map((v, i) => [i, v]), coul: c.accentFort, ep: 2 }],
          titre: "Gris : bits émis · orange : signal reçu au bout du câble · ronds : décision du récepteur", xlab: "temps" });
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c.info; ctx.beginPath(); ctx.moveTo(40, g.Y(0.5)); ctx.lineTo(W - 20, g.Y(0.5)); ctx.stroke(); ctx.setLineDash([]);
        s.etat.bits.forEach((b, i) => {
          const x = g.X(i * k.ech + k.ech * 0.75), ok = k.dec[i] === b;
          ctx.fillStyle = ok ? c.ok : c.alerte; ctx.beginPath(); ctx.arc(x, g.Y(k.sor[i * k.ech + Math.floor(k.ech * 0.75)]), 4, 0, 7); ctx.fill();
          D().texte(ctx, String(k.dec[i]), x, H - 44, ok ? c.texte : c.alerte, 11, "center", !ok);
        });
      },
      mesures(s) {
        const k = this.calc(s), snr = s.p.bruit > 0 ? 0.25 / (s.p.bruit * s.p.bruit) : Infinity;
        return [["Erreurs", k.err + " / " + s.etat.bits.length, k.err ? "alerte" : ""], ["Taux d'erreur binaire", LS.nombre(100 * k.err / s.etat.bits.length, 1) + " %"],
          ["Débit maxi de Nyquist ≈ 2B", LS.nombre(2 * s.p.B, 1) + " kbit/s"], ["Capacité de Shannon B·log2(1+S/N)", isFinite(snr) ? LS.nombre(s.p.B * Math.log2(1 + snr), 1) + " kbit/s" : "∞"]];
      },
      explication() { return "Un support (câble, fibre, radio) ne laisse passer qu'une plage de fréquences : sa **bande passante** B. Un signal à haut débit change vite, il contient des fréquences élevées : si B est trop faible, les fronts s'arrondissent et les bits se mélangent (**interférence entre symboles**). Ajoute le **bruit** et le récepteur se trompe. **Nyquist** : environ 2B bits/s au maximum sur un signal à deux niveaux ; **Shannon** : capacité C = B·log₂(1 + S/N), aucun codage ne fait mieux."; }
    }, cfg);
  };

  /* ---------- Liaison série asynchrone (UART) ---------- */
  LS.sims.uart = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 380,
      controles: [
        { k: "code", nom: "Caractère envoyé (code ASCII)", min: 32, max: 126, pas: 1, defaut: 65, format: v => v + " = « " + String.fromCharCode(v) + " »" },
        { k: "baud", nom: "Vitesse", choix: [[1200, "1 200 bauds"], [9600, "9 600 bauds"], [115200, "115 200 bauds"]], nombres: true, defaut: 9600 },
        { k: "parite", nom: "Parité", choix: [["aucune", "aucune"], ["paire", "paire"], ["impaire", "impaire"]], defaut: "aucune" },
        { k: "stop", nom: "Bits de stop", choix: [[1, "1"], [2, "2"]], nombres: true, defaut: 1 },
        { k: "ecart", nom: "Écart de vitesse du récepteur", min: -15, max: 15, pas: 0.5, defaut: 0, unite: "%", dec: 1 }
      ],
      trame(s) {
        const d = []; for (let i = 0; i < 8; i++) d.push((s.p.code >> i) & 1);  // bit de poids faible en premier
        const bits = [{ v: 0, n: "start" }].concat(d.map((v, i) => ({ v, n: "D" + i })));
        const uns = d.reduce((a, b) => a + b, 0);
        if (s.p.parite !== "aucune") bits.push({ v: s.p.parite === "paire" ? uns % 2 : 1 - uns % 2, n: "P" });
        for (let k = 0; k < s.p.stop; k++) bits.push({ v: 1, n: "stop" });
        return bits;
      },
      dessiner(s, ctx, W, H, c) {
        const bits = this.trame(s), n = bits.length + 2, x0 = 40, w = (W - 60) / n, yh = 90, yb = 170;
        D().texte(ctx, "Ligne TX (repos à 1)", x0, 40, c.texte, 13, "left", true);
        ctx.strokeStyle = c.accentFort; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, yh);
        const lv = v => v ? yh : yb;
        let x = x0 + w; ctx.lineTo(x, yh);
        bits.forEach(b => { ctx.lineTo(x, lv(b.v)); ctx.lineTo(x + w, lv(b.v)); x += w; });
        ctx.lineTo(x, yh); ctx.lineTo(x + w, yh); ctx.stroke();
        bits.forEach((b, i) => {
          const xb = x0 + w * (i + 1);
          ctx.fillStyle = b.n === "start" ? "rgba(76,175,80,.15)" : b.n === "stop" ? "rgba(244,67,54,.12)" : b.n === "P" ? "rgba(255,193,7,.2)" : "rgba(33,150,243,.08)";
          ctx.fillRect(xb, yh - 20, w, yb - yh + 40);
          D().texte(ctx, b.n, xb + w / 2, yb + 34, c.doux, 11, "center");
          D().texte(ctx, String(b.v), xb + w / 2, yh - 30, c.texte, 13, "center", true);
        });
        // Échantillonnage du récepteur : au milieu de chaque bit, à sa propre vitesse.
        const f = 1 + s.p.ecart / 100;
        let lu = 0;
        for (let k = 0; k < 8; k++) {
          const t = (1.5 + k) / f; // en durées de bit de l'émetteur
          const i = Math.floor(t), xb = x0 + w * (1 + t);
          const v = i < bits.length ? bits[i].v : 1;
          lu |= v << k;
          ctx.fillStyle = c.info; ctx.beginPath(); ctx.moveTo(xb, yb + 50); ctx.lineTo(xb - 6, yb + 62); ctx.lineTo(xb + 6, yb + 62); ctx.fill();
        }
        s.etat.lu = lu;
        D().texte(ctx, "▲ instants où le récepteur lit la ligne (au milieu des bits, à SA vitesse)", x0, yb + 80, c.info, 11);
        const ok = lu === s.p.code;
        D().texte(ctx, "Reçu : " + lu + " = « " + String.fromCharCode(lu) + " » " + (ok ? "✓" : "✗ erreur"), x0, H - 30, ok ? c.ok : c.alerte, 15, "left", true);
      },
      mesures(s) {
        const n = this.trame(s).length, tb = 1 / s.p.baud;
        return [["Durée d'un bit", LS.si(tb, "s")], ["Bits par caractère", String(n)], ["Durée d'une trame", LS.si(n * tb, "s")], ["Caractères par seconde", LS.nombre(s.p.baud / n, 0)],
          ["Efficacité (8 bits utiles)", LS.nombre(800 / n, 0) + " %"], ["Code binaire (D7…D0)", s.p.code.toString(2).padStart(8, "0")]];
      },
      explication() { return "En liaison **asynchrone** (UART : Arduino, ESP32, GPS, modules Bluetooth), il n'y a **pas de fil d'horloge**. La ligne est au repos à 1 ; le **bit de start** (0) prévient le récepteur, qui lit ensuite les 8 bits de données (poids faible d'abord) au **milieu** de chaque bit, d'après sa propre horloge. Émetteur et récepteur doivent donc avoir la **même vitesse** (à quelques % près). Le **bit de parité** détecte une erreur simple ; le **bit de stop** ramène la ligne au repos. En liaison **synchrone** (SPI, I2C), un fil d'horloge cadence chaque bit."; }
    }, cfg);
  };

  /* ---------- Encapsulation ---------- */
  LS.sims.encapsulation = function (el, cfg) {
    const COUCHES = [
      { n: 7, nom: "Application", unite: "donnée", ex: "HTTP, DNS, SMTP", role: "le programme produit les données (une page web, un e-mail…)" },
      { n: 6, nom: "Présentation", unite: "donnée", ex: "TLS, encodage UTF-8, compression", role: "met les données dans un format commun, chiffre, compresse" },
      { n: 5, nom: "Session", unite: "donnée", ex: "ouverture, reprise de session", role: "organise le dialogue entre les deux programmes" },
      { n: 4, nom: "Transport", unite: "segment / datagramme", ex: "TCP, UDP (ports)", role: "découpe, numérote, et pour TCP garantit l'arrivée (accusés de réception) ; les ports désignent le programme" },
      { n: 3, nom: "Réseau", unite: "paquet", ex: "IP (adresses IP), ICMP", role: "achemine entre réseaux : routage d'après l'adresse IP de destination" },
      { n: 2, nom: "Liaison de données", unite: "trame", ex: "Ethernet, Wi-Fi (adresses MAC)", role: "transmet sur le réseau local jusqu'à la prochaine machine ; détecte les erreurs (CRC)" },
      { n: 1, nom: "Physique", unite: "bits", ex: "câble, fibre, ondes radio", role: "transforme les bits en signaux électriques, lumineux ou radio" }
    ];
    return LS.simAnimee(el, {
      hauteur: 460,
      controles: [
        { k: "taille", nom: "Taille des données de l'application", min: 1, max: 4000, pas: 1, defaut: 100, unite: "octets" },
        { k: "proto", nom: "Protocole de transport", choix: [["TCP", "TCP (fiable, connecté)"], ["UDP", "UDP (rapide, sans garantie)"]], defaut: "TCP" },
        { k: "vit", nom: "Vitesse de l'animation", min: 0.2, max: 2, pas: 0.1, defaut: 0.6, dec: 1 }
      ],
      init(s) { s.etat.k = 0; },
      avancer(s, dt) { s.etat.k = (s.etat.k + dt * s.p.vit) % 7; },
      calc(s) {
        const ht = s.p.proto === "TCP" ? 20 : 8, mss = 1500 - 20 - ht;
        const nb = Math.max(1, Math.ceil(s.p.taille / mss));
        const charge = Math.min(s.p.taille, mss);
        const trameMin = 64, trame = Math.max(trameMin, charge + ht + 20 + 18);
        const bourrage = trame - (charge + ht + 20 + 18);
        const surFil = nb * 20 + (s.p.taille + nb * (ht + 20 + 18)) + nb * Math.max(0, bourrage);   // + préambule 8 et silence 12
        return { ht, nb, charge, trame, bourrage, eff: s.p.taille / surFil };
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s), actif = Math.floor(s.etat.k);
        const x0 = 20, wl = Math.min(220, W * 0.32), h = (H - 30) / 7;
        COUCHES.forEach((co, i) => {
          const y = 10 + i * h;
          ctx.fillStyle = i === actif ? c.accent : c.noeud; ctx.fillRect(x0, y, wl, h - 6);
          D().texte(ctx, co.n + " · " + co.nom, x0 + 8, y + (h - 6) / 2 - 7, i === actif ? "#fff" : "#5a2e22", 13, "left", true);
          D().texte(ctx, co.unite, x0 + 8, y + (h - 6) / 2 + 9, i === actif ? "#fff" : "#7a5a52", 11);
        });
        // Bloc encapsulé, de plus en plus long en descendant
        const xb = x0 + wl + 20, wb = W - xb - 20;
        const blocs = [
          [["DONNÉES " + k.charge + " o", "#90caf9"]],
          [["DONNÉES", "#90caf9"]], [["DONNÉES", "#90caf9"]],
          [[k.ht === 20 ? "TCP 20" : "UDP 8", "#ffcc80"], ["DONNÉES", "#90caf9"]],
          [["IP 20", "#a5d6a7"], [k.ht === 20 ? "TCP 20" : "UDP 8", "#ffcc80"], ["DONNÉES", "#90caf9"]],
          [["ETH 14", "#ce93d8"], ["IP 20", "#a5d6a7"], [k.ht === 20 ? "TCP 20" : "UDP 8", "#ffcc80"], ["DONNÉES", "#90caf9"], ...(k.bourrage ? [["bourrage " + k.bourrage, "#eeeeee"]] : []), ["CRC 4", "#ce93d8"]],
          [["01001101 01011010 …", "#bdbdbd"]]
        ];
        blocs.forEach((b, i) => {
          if (i > actif) return;
          const y = 10 + i * h + 6, tot = b.length;
          let x = xb;
          b.forEach(([t, coul], j) => {
            const w = t.startsWith("DONNÉES") ? wb - (tot - 1) * 66 : 62;
            ctx.fillStyle = coul; ctx.fillRect(x, y, Math.max(40, w), h - 18);
            ctx.strokeStyle = "#555"; ctx.strokeRect(x, y, Math.max(40, w), h - 18);
            D().texte(ctx, t, x + Math.max(40, w) / 2, y + (h - 18) / 2, "#222", 11, "center", true);
            x += Math.max(40, w) + 4;
            void j;
          });
        });
      },
      mesures(s) {
        const k = this.calc(s);
        return [["Nombre de paquets (MTU 1 500 o)", String(k.nb)], ["Taille de la trame Ethernet", k.trame + " octets (min 64, max 1 518)"], ["Bourrage ajouté", k.bourrage + " octets"],
          ["Efficacité sur le câble", LS.nombre(100 * k.eff, 0) + " %"]];
      },
      explication(s) {
        const co = COUCHES[Math.floor(s.etat.k)];
        return "**Couche " + co.n + " — " + co.nom + "** (" + co.ex + ") : " + co.role + ".\n\nÀ l'émission, chaque couche **ajoute son en-tête** devant les données de la couche du dessus (encapsulation) ; à la réception, chaque couche lit et retire le sien (désencapsulation). Petites données = beaucoup d'en-têtes pour peu d'information.";
      }
    }, cfg);
  };

  /* ---------- Adressage IPv4 ---------- */
  LS.sims.ipv4 = function (el, cfg) {
    return LS.simAnimee(el, {
      hauteur: 330,
      controles: [
        { k: "o1", nom: "Adresse A : 1er octet", min: 0, max: 255, defaut: 192 }, { k: "o2", nom: "2e octet", min: 0, max: 255, defaut: 168 },
        { k: "o3", nom: "3e octet", min: 0, max: 255, defaut: 1 }, { k: "o4", nom: "4e octet", min: 0, max: 255, defaut: 10 },
        { k: "cidr", nom: "Longueur du préfixe /n", min: 8, max: 30, defaut: 24 },
        { k: "b3", nom: "Machine B : 3e octet", min: 0, max: 255, defaut: 1 }, { k: "b4", nom: "Machine B : 4e octet", min: 0, max: 255, defaut: 200 }
      ],
      calc(s) {
        const ip = ((s.p.o1 << 24) | (s.p.o2 << 16) | (s.p.o3 << 8) | s.p.o4) >>> 0;
        const masque = s.p.cidr === 0 ? 0 : (0xffffffff << (32 - s.p.cidr)) >>> 0;
        const reseau = (ip & masque) >>> 0, diffusion = (reseau | (~masque >>> 0)) >>> 0;
        const ipb = ((s.p.o1 << 24) | (s.p.o2 << 16) | (s.p.b3 << 8) | s.p.b4) >>> 0;
        return { ip, masque, reseau, diffusion, ipb, meme: ((ipb & masque) >>> 0) === reseau, hotes: Math.max(0, Math.pow(2, 32 - s.p.cidr) - 2) };
      },
      dessiner(s, ctx, W, H, c) {
        const k = this.calc(s);
        const txt = v => [24, 16, 8, 0].map(d => (v >>> d) & 255).join(".");
        const bin = v => [24, 16, 8, 0].map(d => ((v >>> d) & 255).toString(2).padStart(8, "0")).join(" ");
        const lignes = [["Adresse A", k.ip], ["Masque /" + s.p.cidr, k.masque], ["Réseau", k.reseau], ["Diffusion", k.diffusion], ["Machine B", k.ipb]];
        const cw = Math.min(14, (W - 330) / 36);
        lignes.forEach(([n, v], i) => {
          const y = 30 + i * 46;
          D().texte(ctx, n, 16, y, c.texte, 13, "left", true);
          D().texte(ctx, txt(v), 130, y, c.accentFort, 14, "left", true);
          const b = bin(v);
          let x = 300, idx = 0;
          for (const ch of b) {
            if (ch === " ") { x += cw * 0.6; continue; }
            ctx.fillStyle = idx < s.p.cidr ? "rgba(33,150,243,.25)" : "rgba(76,175,80,.25)";
            ctx.fillRect(x, y - 11, cw - 1, 22);
            D().texte(ctx, ch, x + cw / 2, y, c.texte, Math.max(9, cw - 2), "center");
            x += cw; idx++;
          }
        });
        D().texte(ctx, "bleu : partie réseau (" + s.p.cidr + " bits) · vert : partie hôte (" + (32 - s.p.cidr) + " bits)", 300, H - 40, c.doux, 11);
        D().texte(ctx, k.meme ? "A et B sont sur le même réseau : ils se parlent directement (ARP puis trame Ethernet)." : "A et B sont sur des réseaux différents : il faut passer par un routeur (passerelle).", 16, H - 14, k.meme ? c.ok : c.alerte, 13, "left", true);
      },
      mesures(s) {
        const k = this.calc(s), txt = v => [24, 16, 8, 0].map(d => (v >>> d) & 255).join(".");
        return [["Masque", txt(k.masque)], ["Adresse du réseau", txt(k.reseau)], ["Première machine", txt(k.reseau + 1)], ["Dernière machine", txt(k.diffusion - 1)], ["Diffusion", txt(k.diffusion)], ["Nombre de machines", String(k.hotes)]];
      },
      explication() { return "Une adresse **IPv4** fait 32 bits, écrits en 4 octets décimaux. Le **masque** (ou préfixe /n) indique combien de bits de gauche désignent le **réseau** ; les bits restants désignent la **machine** (hôte). Tous bits d'hôte à 0 : adresse du réseau ; tous à 1 : **diffusion** (broadcast). Deux machines communiquent directement seulement si elles ont la même partie réseau."; }
    }, cfg);
  };

  /* ---------- Commutation ---------- */
  LS.sims.commutation = function (el, cfg) {
    const N = { A: [0.06, 0.5], B: [0.3, 0.2], C: [0.3, 0.8], D: [0.6, 0.2], E: [0.6, 0.8], F: [0.9, 0.5] };
    const L = [["A", "B"], ["A", "C"], ["B", "C"], ["B", "D"], ["C", "E"], ["D", "E"], ["D", "F"], ["E", "F"], ["B", "E"]];
    function chemins(coupe) {
      const ok = L.filter(l => !(coupe && ((l[0] === "B" && l[1] === "D") || (l[0] === "D" && l[1] === "B"))));
      const voisins = {}; ok.forEach(([a, b]) => { (voisins[a] = voisins[a] || []).push(b); (voisins[b] = voisins[b] || []).push(a); });
      const res = [];
      (function dfs(n, ch) { if (ch.length > 5) return; if (n === "F") { res.push(ch.slice()); return; } (voisins[n] || []).forEach(v => { if (!ch.includes(v)) { ch.push(v); dfs(v, ch); ch.pop(); } }); })("A", ["A"]);
      return res.sort((a, b) => a.length - b.length);
    }
    return LS.simAnimee(el, {
      hauteur: 400,
      controles: [
        { k: "mode", nom: "Type de commutation", choix: [["circuit", "Circuits (téléphone classique)"], ["paquet", "Paquets (Internet)"], ["virtuel", "Circuit virtuel (paquets sur un chemin fixé)"]], defaut: "circuit" },
        { k: "coupe", nom: "Couper la liaison B–D", bool: true, defaut: false },
        { k: "vit", nom: "Vitesse", min: 0.3, max: 3, pas: 0.1, defaut: 1, dec: 1 }
      ],
      boutons: [{ k: "envoyer", texte: "📨 Envoyer un message de A à F", action: s => s.def._envoyer(s) }],
      _envoyer(s) {
        const ch = chemins(s.p.coupe);
        s.etat.t = 0; s.etat.fini = false; s.etat.coupure = false;
        if (s.p.mode === "paquet") {
          const r = alea(Math.floor(Math.random() * 1e6));
          s.etat.paquets = [...Array(6)].map((_, i) => ({ n: i + 1, ch: ch[Math.min(ch.length - 1, Math.floor(r() * Math.min(3, ch.length)))], depart: i * 0.35, attente: r() * 0.8, arrive: null }));
          s.etat.chemin = null;
        } else {
          s.etat.chemin = ch[0];
          s.etat.paquets = [...Array(6)].map((_, i) => ({ n: i + 1, ch: ch[0], depart: (s.p.mode === "circuit" ? 0 : 0) + i * 0.35, attente: 0, arrive: null }));
        }
        s.etat.etablissement = s.p.mode === "paquet" ? 0 : (s.etat.chemin.length - 1) * 0.5 * 2; // aller + retour de la signalisation
        s.etat.recus = [];
        s.etat.envoye = true;
      },
      init(s) { s.etat.envoye = false; s.etat.recus = []; },
      avancer(s, dt) {
        if (!s.etat.envoye || s.etat.fini) return;
        s.etat.t += dt * s.p.vit;
        const e = s.etat;
        // Coupure pendant une communication par circuit : tout s'arrête.
        if (s.p.coupe && e.chemin && e.chemin.join("").match(/BD|DB/)) { e.coupure = true; e.fini = true; return; }
        e.paquets.forEach(p => {
          const tp = e.t - e.etablissement - p.depart - p.attente;
          const duree = (p.ch.length - 1) * 0.6;
          if (p.arrive === null && tp >= duree) { p.arrive = e.t; e.recus.push(p.n); }
        });
        if (e.paquets.every(p => p.arrive !== null)) { e.fini = true; e.duree = e.t; }
      },
      dessiner(s, ctx, W, H, c) {
        const P = n => [20 + N[n][0] * (W - 40), 20 + N[n][1] * (H - 80)];
        const e = s.etat, reserve = e.chemin && s.p.mode !== "paquet" && e.envoye && !e.coupure;
        L.forEach(([a, b]) => {
          const coupe = s.p.coupe && ((a === "B" && b === "D") || (a === "D" && b === "B"));
          const surChemin = reserve && e.chemin.some((n, i) => i && ((e.chemin[i - 1] === a && n === b) || (e.chemin[i - 1] === b && n === a)));
          ctx.strokeStyle = coupe ? c.alerte : surChemin ? c.accent : c.bordure; ctx.lineWidth = surChemin ? 7 : 3; ctx.setLineDash(coupe ? [6, 6] : []);
          ctx.beginPath(); ctx.moveTo(...P(a)); ctx.lineTo(...P(b)); ctx.stroke(); ctx.setLineDash([]);
        });
        Object.keys(N).forEach(n => {
          const [x, y] = P(n);
          ctx.fillStyle = n === "A" || n === "F" ? c.info : c.noeud; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill();
          D().texte(ctx, n, x, y, n === "A" || n === "F" ? "#fff" : "#5a2e22", 15, "center", true);
        });
        D().texte(ctx, "A : appelant", P("A")[0], P("A")[1] + 30, c.doux, 11, "center"); D().texte(ctx, "F : destinataire", P("F")[0], P("F")[1] + 30, c.doux, 11, "center");
        if (!e.envoye) return;
        // Signalisation (établissement du circuit)
        if (s.p.mode !== "paquet" && e.t < e.etablissement) {
          const ch = e.chemin, aller = e.t < e.etablissement / 2, k = (aller ? e.t : e.etablissement - e.t) / 0.5;
          const i = Math.min(ch.length - 2, Math.floor(k)), f = Math.min(1, k - i);
          const a = P(ch[i]), b = P(ch[i + 1]);
          ctx.fillStyle = "#ffb300"; ctx.beginPath(); ctx.arc(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 9, 0, 7); ctx.fill();
          D().texte(ctx, aller ? "signalisation : demande de connexion (on réserve chaque tronçon)" : "le destinataire accepte (sonnerie, décroché)", W / 2, H - 44, "#c79a00", 13, "center", true);
        }
        e.paquets.forEach(p => {
          if (p.arrive !== null) return;
          const tp = e.t - e.etablissement - p.depart - p.attente;
          if (tp < 0) return;
          const k = tp / 0.6, i = Math.min(p.ch.length - 2, Math.floor(k)), f = Math.min(1, k - i);
          const a = P(p.ch[i]), b = P(p.ch[i + 1]);
          const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
          ctx.fillStyle = c.accentFort; ctx.fillRect(x - 11, y - 9, 22, 18);
          D().texte(ctx, String(p.n), x, y, "#fff", 12, "center", true);
        });
        D().texte(ctx, "Reçus dans l'ordre : " + e.recus.join(" "), 20, H - 20, c.texte, 13, "left", true);
        if (e.coupure) D().texte(ctx, "✗ Liaison coupée sur le circuit réservé : la communication est interrompue", W / 2, H - 44, c.alerte, 14, "center", true);
      },
      mesures(s) {
        const e = s.etat;
        if (!e.envoye) return [["État", "clique sur « Envoyer »"]];
        const desordre = e.recus.some((n, i) => i && n < e.recus[i - 1]);
        return [["Temps d'établissement", LS.nombre(e.etablissement || 0, 1) + " s"], ["Durée totale", e.fini && !e.coupure ? LS.nombre(e.duree, 1) + " s" : "…"], ["Paquets reçus", e.recus.length + " / 6"],
          ["Ordre d'arrivée", desordre ? "désordre : il faut renuméroter" : "dans l'ordre", desordre ? "alerte" : ""], ["Ressources réservées", s.p.mode === "circuit" ? "tout le chemin, pendant tout l'appel" : s.p.mode === "virtuel" ? "un chemin fixé, partagé" : "aucune"]];
      },
      explication(s) {
        return { circuit: "**Commutation de circuits** : avant de parler, la **signalisation** (composition du numéro, sonnerie, décroché) réserve un chemin de bout en bout. Ensuite le débit est garanti et le délai constant — mais le chemin reste bloqué même pendant les silences, et si un tronçon est coupé, l'appel tombe.",
          paquet: "**Commutation de paquets** : le message est découpé en **paquets** numérotés, chacun routé indépendamment selon l'état du réseau. Pas de réservation, les liaisons sont partagées entre tous ; mais les paquets peuvent arriver **dans le désordre** (TCP les remet en ordre) et le délai varie.",
          virtuel: "**Circuit virtuel** (X.25, ATM, MPLS) : on établit d'abord un chemin, puis tous les paquets le suivent, dans l'ordre, sans monopoliser les liaisons. Un compromis entre les deux." }[s.p.mode];
      }
    }, cfg);
  };
})();
