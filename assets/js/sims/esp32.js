/* Simulation d'une carte ESP32 DevKitC (38 broches) et de ses périphériques.
   Modes : blink (sortie), bouton (entrée), pwm, adc, bus (UART / I2C / SPI), alim (niveaux et alimentation).
   On choisit la broche en cliquant dessus ; le code Arduino correspondant s'affiche. */
(function () {
  "use strict";
  const LS = window.LS;
  const D = () => LS.dessin;

  // Brochage de la DevKitC v4 (vue de dessus, USB en bas).
  const GAUCHE = ["3V3", "EN", "36", "39", "34", "35", "32", "33", "25", "26", "27", "14", "12", "GND", "13", "9", "10", "11", "5V"];
  const DROITE = ["GND", "23", "22", "1", "3", "21", "GND", "19", "18", "5", "17", "16", "4", "0", "2", "15", "8", "7", "6"];
  const NOMS = { 36: "VP", 39: "VN", 1: "TX0", 3: "RX0", 9: "SD2", 10: "SD3", 11: "CMD", 8: "SD1", 7: "SD0", 6: "CLK" };
  function infoBroche(b) {
    const n = +b, i = { gpio: !isNaN(n), n };
    if (isNaN(n)) return Object.assign(i, { type: b === "GND" ? "masse" : b === "EN" ? "reset" : "alim" });
    i.entreeSeule = n >= 34 && n <= 39;
    i.flash = n >= 6 && n <= 11;
    i.demarrage = [0, 2, 5, 12, 15].includes(n);
    i.adc1 = n >= 32 && n <= 39;
    i.adc2 = [0, 2, 4, 12, 13, 14, 15, 25, 26, 27].includes(n);
    i.dac = n === 25 || n === 26;
    i.uart0 = n === 1 || n === 3;
    i.type = i.flash ? "flash" : i.entreeSeule ? "entree" : i.demarrage ? "demarrage" : i.uart0 ? "uart" : "libre";
    return i;
  }
  LS.infoBrocheESP32 = infoBroche;
  const COUL_TYPE = { libre: "#43a047", entree: "#1e88e5", demarrage: "#fb8c00", flash: "#e53935", uart: "#8e24aa", alim: "#c62828", masse: "#424242", reset: "#757575" };

  function geometrie(W) {
    const bw = 170, x0 = 20, y0 = 28, pas = 20;
    return { bw, x0, y0, pas, h: GAUCHE.length * pas + 70, px: (cote, i) => [cote === 0 ? x0 : x0 + bw, y0 + 50 + i * pas] };
  }
  function dessinerCarte(ctx, c, s, W) {
    const g = geometrie(W);
    ctx.fillStyle = "#1b1b1b"; ctx.fillRect(g.x0, g.y0, g.bw, g.h);
    ctx.fillStyle = "#9e9e9e"; ctx.fillRect(g.x0 + 35, g.y0 + 6, g.bw - 70, 38);
    D().texte(ctx, "ESP32-WROOM-32", g.x0 + g.bw / 2, g.y0 + 25, "#222", 11, "center", true);
    ctx.fillStyle = "#cfd8dc"; ctx.fillRect(g.x0 + g.bw / 2 - 18, g.y0 + g.h - 14, 36, 18);
    D().texte(ctx, "USB", g.x0 + g.bw / 2, g.y0 + g.h - 4, "#333", 9, "center", true);
    [GAUCHE, DROITE].forEach((liste, cote) => liste.forEach((b, i) => {
      const [x, y] = g.px(cote, i), inf = infoBroche(b);
      const choisie = s.p.gpio !== undefined && String(s.p.gpio) === b;
      ctx.fillStyle = choisie ? "#ffeb3b" : COUL_TYPE[inf.type];
      ctx.beginPath(); ctx.arc(x, y, choisie ? 7 : 5, 0, 7); ctx.fill();
      const lab = inf.gpio ? (NOMS[b] ? NOMS[b] + " " : "") + "G" + b : b;
      D().texte(ctx, lab, cote === 0 ? x + 9 : x - 9, y, "#eee", 10, cote === 0 ? "left" : "right", choisie);
    }));
    // Légende
    const lx = g.x0, ly = g.y0 + g.h + 16;
    [["libre", "E/S libre"], ["entree", "entrée seule"], ["demarrage", "démarrage"], ["flash", "flash : interdit"], ["uart", "USB-série"]].forEach(([t, n], k) => {
      ctx.fillStyle = COUL_TYPE[t]; ctx.beginPath(); ctx.arc(lx + 6 + (k % 3) * 64, ly + Math.floor(k / 3) * 16, 4, 0, 7); ctx.fill();
      D().texte(ctx, n, lx + 13 + (k % 3) * 64, ly + Math.floor(k / 3) * 16, c.doux, 9);
    });
    return g;
  }
  function brocheCliquee(s, x, y) {
    const g = geometrie(s.largeur());
    let res = null;
    [GAUCHE, DROITE].forEach((liste, cote) => liste.forEach((b, i) => { const [px, py] = g.px(cote, i); if (Math.hypot(px - x, py - y) < 10) res = b; }));
    return res;
  }
  function code(ctx, c, lignes, x, y, w) {
    ctx.fillStyle = c.sombre ? "#1e1e1e" : "#263238"; ctx.fillRect(x, y, w, lignes.length * 16 + 16);
    lignes.forEach((l, i) => { ctx.fillStyle = l.trim().startsWith("//") ? "#90a4ae" : "#e0f2f1"; ctx.font = "12px JetBrains Mono, Consolas, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(l, x + 8, y + 14 + i * 16); });
  }
  function fil(ctx, pts, coul) { ctx.strokeStyle = coul; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); }
  function led(ctx, x, y, allume, coul, lum) {
    if (allume) { ctx.fillStyle = coul; ctx.globalAlpha = 0.25 + 0.5 * (lum === undefined ? 1 : lum); ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = allume ? coul : "#777"; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
  }
  function resistance(ctx, x, y, valeur, c) { ctx.fillStyle = "#d7ccc8"; ctx.fillRect(x, y - 6, 34, 12); ctx.strokeStyle = "#5d4037"; ctx.strokeRect(x, y - 6, 34, 12); D().texte(ctx, LS.si(valeur, "Ω"), x + 17, y - 14, c.texte, 10, "center"); }

  const ADC_ATT = { "0": 1.1, "2.5": 1.5, "6": 2.2, "11": 3.1 };
  /* Lecture brute de l'ADC de l'ESP32, avec ses défauts réels : zone morte près de 0 V,
     compression vers le haut de la plage, saturation, bruit. */
  LS.lectureADC = function (V, att, bruit) {
    const vmax = ADC_ATT[att];
    if (V < 0.075) return Math.round(Math.max(0, bruit || 0));
    let x = (V - 0.075) / (vmax - 0.075);
    if (x > 0.85) x = 0.85 + (x - 0.85) * 0.6;   // non-linéarité en haut de plage
    return Math.max(0, Math.min(4095, Math.round(x * 4095 / 0.94 + (bruit || 0))));
  };

  LS.sims.esp32 = function (el, cfg) {
    const mode = (cfg && cfg.p && cfg.p.mode) || "blink";
    const commun = [];
    const parMode = {
      blink: [{ k: "delai", nom: "Durée allumé / éteint", min: 50, max: 2000, pas: 50, defaut: 500, unite: "ms" },
        { k: "R", nom: "Résistance série", choix: [[0, "aucune !"], [47, "47 Ω"], [100, "100 Ω"], [220, "220 Ω"], [330, "330 Ω"], [1000, "1 kΩ"], [4700, "4,7 kΩ"]], nombres: true, defaut: 220 },
        { k: "couleur", nom: "Couleur de la LED", choix: [["rouge", "rouge (1,9 V)"], ["verte", "verte (2,2 V)"], ["bleue", "bleue (3,0 V)"]], defaut: "rouge" }],
      bouton: [{ k: "pinMode", nom: "Configuration de la broche", choix: [["INPUT", "INPUT (rien)"], ["INPUT_PULLUP", "INPUT_PULLUP (résistance interne vers 3,3 V)"], ["INPUT_PULLDOWN", "INPUT_PULLDOWN (vers la masse)"]], defaut: "INPUT" },
        { k: "cablage", nom: "Le bouton relie la broche à", choix: [["GND", "la masse (GND)"], ["3V3", "3,3 V"]], defaut: "GND" },
        { k: "antirebond", nom: "Anti-rebond logiciel", min: 0, max: 50, pas: 1, defaut: 0, unite: "ms" }],
      pwm: [{ k: "rapport", nom: "Rapport cyclique", min: 0, max: 100, pas: 1, defaut: 50, unite: "%" },
        { k: "freq", nom: "Fréquence PWM", min: 1, max: 100000, log: true, defaut: 5000, unite: "Hz", format: v => LS.si(v, "Hz") },
        { k: "resol", nom: "Résolution", choix: [[8, "8 bits (0–255)"], [10, "10 bits (0–1023)"], [12, "12 bits"], [16, "16 bits"]], nombres: true, defaut: 8 }],
      adc: [{ k: "pot", nom: "Position du potentiomètre", min: 0, max: 100, pas: 1, defaut: 50, unite: "%" },
        { k: "att", nom: "Atténuation (plage d'entrée)", choix: [["0", "0 dB : 0–1,1 V"], ["2.5", "2,5 dB : 0–1,5 V"], ["6", "6 dB : 0–2,2 V"], ["11", "11 dB : 0–3,1 V"]], defaut: "11" },
        { k: "wifi", nom: "Wi-Fi activé", bool: true, defaut: false }],
      bus: [{ k: "proto", nom: "Bus", choix: [["UART", "UART (TX/RX)"], ["I2C", "I2C (SDA/SCL)"], ["SPI", "SPI (MOSI/MISO/SCK/CS)"]], defaut: "I2C" },
        { k: "pullup", nom: "Résistances de tirage (pull-up) sur SDA/SCL", bool: true, defaut: true },
        { k: "adresse", nom: "Adresse I2C appelée", choix: [["0x76", "0x76"], ["0x77", "0x77"]], defaut: "0x77" },
        { k: "croise", nom: "UART : TX relié au RX du module (croisé)", bool: true, defaut: true }],
      alim: [{ k: "source", nom: "Alimentation", choix: [["usb", "USB 5 V (régulateur intégré)"], ["vin9", "Pile 9 V sur la broche 5V/VIN"], ["lipo5v", "Batterie LiPo 3,7 V sur 5V/VIN"], ["lipo3v3", "Batterie LiPo (4,2 V chargée) sur 3V3"], ["5v3v3", "5 V directement sur 3V3"]], defaut: "usb" },
        { k: "wifiA", nom: "Wi-Fi en émission", bool: true, defaut: true },
        { k: "servo", nom: "Servomoteur alimenté par le 3V3 de la carte", bool: true, defaut: false },
        { k: "capteur5v", nom: "Capteur 5 V branché sur une entrée", bool: true, defaut: false },
        { k: "pont", nom: "Pont diviseur 1 kΩ / 2 kΩ sur ce signal", bool: true, defaut: false }]
    };
    const defautGPIO = { blink: "2", bouton: "4", pwm: "18", adc: "34", bus: "21", alim: undefined };
    return LS.simAnimee(el, {
      hauteur: 540,
      controles: commun.concat(parMode[mode]),
      boutons: mode === "bouton" ? [] : [],
      init(s) { s.p.mode = mode; if (s.p.gpio === undefined) s.p.gpio = defautGPIO[mode]; s.etat.h = []; s.etat.compte = 0; s.etat.appuis = 0; s.etat.lu = 0; s.etat.tAppui = -1; s.etat.anim = 0; },
      pointeur(s, type, x, y) {
        const b = brocheCliquee(s, x, y);
        if (type === "bas" && b && infoBroche(b).gpio && mode !== "alim" && mode !== "bus") s.p.gpio = b;
        // Bouton poussoir dessiné (mode bouton)
        if (mode === "bouton") {
          const W = s.largeur(), bx = Math.min(W - 120, 330), by = 200;
          const dedans = Math.hypot(x - bx, y - by) < 30;
          if (type === "bas" && dedans) { s.etat.presse = true; s.etat.tAppui = s.t; s.etat.appuis++; }
          if (type === "haut" && s.etat.presse) { s.etat.presse = false; s.etat.tRelache = s.t; }
        }
      },
      avancer(s, dt) {
        const e = s.etat; e.anim += dt;
        if (mode === "bouton") {
          const inf = infoBroche(s.p.gpio);
          // Niveau électrique : appui → niveau du câblage ; repos → selon la résistance de tirage (ou flottant).
          const actif = s.p.cablage === "GND" ? 0 : 1;
          let repos = s.p.pinMode === "INPUT_PULLUP" ? 1 : s.p.pinMode === "INPUT_PULLDOWN" ? 0 : null;
          if (inf.entreeSeule && s.p.pinMode !== "INPUT") repos = null; // 34–39 : pas de résistances internes
          const rebond = t => t >= 0 && s.t - t < 0.006 && Math.floor((s.t - t) * 2000) % 2 === 0;
          let niveau;
          if (e.presse) niveau = rebond(e.tAppui) ? (repos === null ? (Math.random() > 0.5 ? 1 : 0) : repos) : actif;
          else niveau = (e.tRelache !== undefined && rebond(e.tRelache)) ? actif : (repos === null ? (Math.random() > 0.5 ? 1 : 0) : repos);
          // Lecture avec anti-rebond
          if (niveau !== e.brut) { e.brut = niveau; e.tChange = s.t; }
          if (s.t - (e.tChange || 0) >= s.p.antirebond / 1000 && e.lu !== e.brut) {
            if (e.brut === actif) e.compte++;
            e.lu = e.brut;
          }
          e.h.push([s.t, niveau]); while (e.h.length && e.h[0][0] < s.t - 2) e.h.shift();
          e.flottant = repos === null;
        }
      },
      dessiner(s, ctx, W, H, c) {
        const g = dessinerCarte(ctx, c, s, W);
        const inf = s.p.gpio !== undefined ? infoBroche(s.p.gpio) : null;
        let pin = null;
        if (s.p.gpio !== undefined) { const iG = GAUCHE.indexOf(String(s.p.gpio)), iD = DROITE.indexOf(String(s.p.gpio)); pin = iG >= 0 ? g.px(0, iG) : g.px(1, iD); }
        const xg = g.x0 + g.bw + 50, xc = Math.max(xg + 260, W * 0.55), wc = W - xc - 10;
        const yGND = g.px(1, 0);
        D().texte(ctx, "Clique sur une broche pour y brancher le montage", g.x0, 20, c.doux, 11);
        if (mode === "blink") {
          const ok = inf && inf.gpio && !inf.entreeSeule && !inf.flash;
          const coul = { rouge: "#ff3b30", verte: "#34c759", bleue: "#0a84ff" }[s.p.couleur], vf = { rouge: 1.9, verte: 2.2, bleue: 3.0 }[s.p.couleur];
          const allume = ok && Math.floor(s.t * 1000 / s.p.delai) % 2 === 0 && !s.etat.grille;
          const I = Math.max(0, (3.3 - vf) / (s.p.R + 25));
          s.etat.I = ok ? I : 0;
          if (I > 0.05 && ok && allume) s.etat.grille = true;
          fil(ctx, [pin, [xg, pin[1]], [xg, 160]], c.accentFort);
          resistance(ctx, xg - 17 + 17, 180, s.p.R, c);
          fil(ctx, [[xg + 17, 186], [xg + 17, 230]], c.accentFort);
          led(ctx, xg + 17, 250, allume, coul);
          fil(ctx, [[xg + 17, 262], [xg + 17, 300], [xg + 120, 300], [xg + 120, yGND[1]], yGND], "#333");
          if (s.etat.grille) D().texte(ctx, "LED grillée", xg + 40, 250, c.alerte, 12, "left", true);
          code(ctx, c, ["const int LED = " + (s.p.gpio || "?") + ";", "void setup() {", "  pinMode(LED, OUTPUT);", "}", "void loop() {", "  digitalWrite(LED, HIGH);", "  delay(" + s.p.delai + ");", "  digitalWrite(LED, LOW);", "  delay(" + s.p.delai + ");", "}"], xc, 40, wc);
        } else if (mode === "bouton") {
          const bx = Math.min(W - 120, 330), by = 200;
          fil(ctx, [pin, [bx, pin[1]], [bx, by - 30]], c.accentFort);
          ctx.fillStyle = s.etat.presse ? c.accent : (c.sombre ? "#555" : "#ccc"); ctx.beginPath(); ctx.arc(bx, by, 26, 0, 7); ctx.fill();
          D().texte(ctx, "maintiens", bx, by - 6, c.texte, 10, "center", true); D().texte(ctx, "appuyé", bx, by + 8, c.texte, 10, "center", true);
          if (s.p.cablage === "GND") fil(ctx, [[bx, by + 30], [bx, yGND[1] + 120], [g.x0 + g.bw + 8, yGND[1] + 120], [g.x0 + g.bw + 8, yGND[1]], yGND], "#333");
          else { const p3 = g.px(0, 0); fil(ctx, [[bx, by + 30], [bx, by + 70], [g.x0 - 10, by + 70], [g.x0 - 10, p3[1]], p3], "#c62828"); }
          const gx = Math.min(W - 20, xc), gwid = W - gx - 10;
          if (gwid > 120) {
            D().graphe(ctx, gx, 50, gwid, 120, { c, xlim: [s.t - 2, s.t], ylim: [-0.2, 1.2], series: [{ pts: s.etat.h.map(p => [p[0], p[1]]), coul: c.accentFort }], titre: "Niveau sur la broche (2 dernières secondes)" });
            code(ctx, c, ["pinMode(" + s.p.gpio + ", " + s.p.pinMode + ");", "int n = 0; int avant = HIGH;", "void loop() {", "  int v = digitalRead(" + s.p.gpio + ");", "  if (v != avant) {", s.p.antirebond ? "    delay(" + s.p.antirebond + "); // anti-rebond" : "    // pas d'anti-rebond", "    if (v == " + (s.p.cablage === "GND" ? "LOW" : "HIGH") + ") n++;", "  }", "  avant = v;", "}"], gx, 200, gwid);
          }
        } else if (mode === "pwm") {
          const n = Math.pow(2, s.p.resol) - 1, val = Math.round(s.p.rapport / 100 * n);
          const fmax = 80e6 / Math.pow(2, s.p.resol);
          s.etat.erreur = s.p.freq > fmax;
          const ok = inf && !inf.entreeSeule && !inf.flash && !s.etat.erreur;
          fil(ctx, [pin, [xg, pin[1]], [xg, 160]], c.accentFort);
          resistance(ctx, xg, 180, 220, c);
          fil(ctx, [[xg + 17, 186], [xg + 17, 230]], c.accentFort);
          const lum = ok ? s.p.rapport / 100 : 0;
          led(ctx, xg + 17, 250, lum > 0.003, "#ff3b30", lum);
          fil(ctx, [[xg + 17, 262], [xg + 17, 300], [xg + 120, 300], [xg + 120, yGND[1]], yGND], "#333");
          const gx = xc, gw = W - gx - 10;
          ctx.strokeStyle = c.accentFort; ctx.lineWidth = 2; ctx.beginPath();
          const y0 = 140, y1 = 80;
          for (let p = 0; p < 4; p++) { const x0 = gx + p * gw / 4, l = gw / 4 * s.p.rapport / 100; ctx.lineTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x0 + l, y1); ctx.lineTo(x0 + l, y0); ctx.lineTo(x0 + gw / 4, y0); }
          ctx.stroke();
          D().texte(ctx, "3,3 V", gx - 4, y1, c.doux, 10, "right"); D().texte(ctx, "0 V", gx - 4, y0, c.doux, 10, "right");
          D().texte(ctx, "période T = 1/f = " + LS.si(1 / s.p.freq, "s") + " · valeur moyenne " + LS.nombre(3.3 * s.p.rapport / 100, 2) + " V", gx, 160, c.doux, 11);
          code(ctx, c, ["// ESP32 Arduino core 3.x", "ledcAttach(" + s.p.gpio + ", " + Math.round(s.p.freq) + ", " + s.p.resol + ");", "ledcWrite(" + s.p.gpio + ", " + val + ");  // " + s.p.rapport + " %"], gx, 200, gw);
          if (s.etat.erreur) D().texte(ctx, "⚠ Impossible : à " + s.p.resol + " bits, la fréquence maxi est " + LS.si(fmax, "Hz") + " (horloge 80 MHz / 2^" + s.p.resol + ")", gx, 290, c.alerte, 12, "left", true);
        } else if (mode === "adc") {
          const V = 3.3 * s.p.pot / 100;
          const bruit = (Math.random() - 0.5) * 30;
          const adc2Bloque = inf && inf.adc2 && s.p.wifi;
          const pasADC = inf && !inf.adc1 && !inf.adc2;
          s.etat.V = V; s.etat.raw = adc2Bloque || pasADC ? null : LS.lectureADC(V, s.p.att, bruit);
          // Potentiomètre
          const px = xg + 30;
          fil(ctx, [g.px(0, 0), [g.x0 - 12, g.px(0, 0)[1]], [g.x0 - 12, 20], [px + 60, 20], [px + 60, 90]], "#c62828");
          ctx.fillStyle = "#4e342e"; ctx.fillRect(px + 40, 90, 40, 120);
          const cy = 90 + 120 * (1 - s.p.pot / 100);
          D().fleche(ctx, px + 10, cy, px + 38, cy, c.accentFort, 3);
          fil(ctx, [[px + 10, cy], [px - 10, cy], [px - 10, pin[1]], pin], c.accentFort);
          fil(ctx, [[px + 60, 210], [px + 60, yGND[1] + 140], [g.x0 + g.bw + 8, yGND[1] + 140], [g.x0 + g.bw + 8, yGND[1]], yGND], "#333");
          D().texte(ctx, LS.nombre(V, 2) + " V", px + 90, cy, c.texte, 13, "left", true);
          // Courbe de conversion
          const gx = xc, gw = W - gx - 10;
          if (gw > 140) {
            const pts = [...Array(67)].map((_, i) => [i * 0.05, LS.lectureADC(i * 0.05, s.p.att, 0)]);
            D().graphe(ctx, gx, 40, gw, 200, { c, xlim: [0, 3.3], ylim: [0, 4200], series: [{ pts: [[0, 0], [ADC_ATT[s.p.att], 4095]], coul: c.bordure, ep: 1 }, { pts, coul: c.info, ep: 2.5 }],
              points: s.etat.raw !== null ? [{ x: V, y: s.etat.raw, coul: c.accentFort }] : [], titre: "Valeur lue (0–4095) selon la tension : idéale (gris) et réelle (bleu)", xlab: "volts" });
            code(ctx, c, ["analogSetPinAttenuation(" + s.p.gpio + ", ADC_" + s.p.att.replace(".", "_") + "db);", "int brut = analogRead(" + s.p.gpio + ");", "int mv = analogReadMilliVolts(" + s.p.gpio + "); // corrigé"], gx, 270, gw);
          }
          if (adc2Bloque) D().texte(ctx, "⚠ GPIO " + s.p.gpio + " est sur l'ADC2, inutilisable quand le Wi-Fi est actif", xg, H - 20, c.alerte, 12, "left", true);
          if (pasADC) D().texte(ctx, "⚠ GPIO " + s.p.gpio + " n'a pas de convertisseur analogique", xg, H - 20, c.alerte, 12, "left", true);
        } else if (mode === "bus") {
          this.dessinerBus(s, ctx, W, H, c, g, xg);
        } else if (mode === "alim") {
          this.dessinerAlim(s, ctx, W, H, c, g, xg);
        }
        if (inf && inf.flash && mode !== "alim") D().texte(ctx, "⚠ GPIO " + s.p.gpio + " est relié à la mémoire flash : l'utiliser fait planter l'ESP32", xg, H - 40, c.alerte, 12, "left", true);
      },
      dessinerBus(s, ctx, W, H, c, g, xg) {
        const x0 = xg, w = W - x0 - 20, e = s.etat;
        const t = (e.anim * 0.6) % 1;
        const trace = (y, bits, nom, coul) => {
          D().texte(ctx, nom, x0, y - 22, coul, 12, "left", true);
          ctx.strokeStyle = coul; ctx.lineWidth = 2; ctx.beginPath();
          const n = bits.length, bw = w / n;
          bits.forEach((b, i) => { const yy = b === null ? y - 10 : b ? y - 20 : y; ctx.lineTo(x0 + i * bw, yy); ctx.lineTo(x0 + (i + 1) * bw, yy); });
          ctx.stroke();
          ctx.strokeStyle = c.texte; ctx.beginPath(); ctx.moveTo(x0 + t * w, y - 28); ctx.lineTo(x0 + t * w, y + 6); ctx.stroke();
        };
        if (s.p.proto === "I2C") {
          const sda = g.px(1, 5), scl = g.px(1, 2);
          fil(ctx, [sda, [x0 - 20, sda[1]]], "#1e88e5"); fil(ctx, [scl, [x0 - 30, scl[1]]], "#fb8c00");
          if (!s.p.pullup) { D().texte(ctx, "⚠ Sans résistances de tirage, SDA et SCL ne remontent jamais à 1 : le bus est muet.", x0, H - 20, c.alerte, 12, "left", true); }
          const capteur = "0x77", ok = s.p.pullup && s.p.adresse === capteur;
          const adr = parseInt(s.p.adresse, 16), bitsAdr = [...Array(7)].map((_, i) => (adr >> (6 - i)) & 1);
          const ack = ok ? 0 : 1;
          const seq = s.p.pullup ? [1, 0].concat(bitsAdr, [1], [ack], ok ? [0, 1, 1, 0, 0, 0, 0, 0, 1] : [], [0, 1]) : [...Array(20)].map(() => 0);
          const horl = seq.map((_, i) => s.p.pullup ? (i % 2 ? 1 : 0) : 0);
          trace(120, seq, "SDA (données)", "#1e88e5"); trace(200, horl, "SCL (horloge)", "#fb8c00");
          D().texte(ctx, ok ? "START · adresse 0x77 + lecture · ACK du capteur · octet 0x60 (identifiant d'un BME280) · STOP" : s.p.pullup ? "Personne ne répond à " + s.p.adresse + " : NACK (vérifie l'adresse avec un scanner I2C)" : "", x0, 240, ok ? c.ok : c.alerte, 12);
          code(ctx, c, ["#include <Wire.h>", "Wire.begin(21, 22);          // SDA, SCL", "Wire.beginTransmission(" + s.p.adresse + ");", "Wire.write(0xD0);             // registre ID", "Wire.endTransmission(false);", "Wire.requestFrom(" + s.p.adresse + ", 1);", "byte id = Wire.read();       // " + (ok ? "0x60" : "rien")], x0, 270, w);
          s.etat.ok = ok;
        } else if (s.p.proto === "UART") {
          const tx = g.px(1, 3), rx = g.px(1, 4);
          fil(ctx, [tx, [x0 - 20, tx[1]]], "#e53935"); fil(ctx, [rx, [x0 - 30, rx[1]]], "#43a047");
          const octet = 0x47, bits = [1, 0].concat([...Array(8)].map((_, i) => (octet >> i) & 1), [1, 1]);
          trace(120, bits, "TX de l'ESP32 → " + (s.p.croise ? "RX" : "TX") + " du module", "#e53935");
          D().texte(ctx, s.p.croise ? "Le module reçoit « G » (0x47) ✓" : "✗ TX relié à TX : deux sorties face à face, rien n'est reçu (et risque de court-circuit)", x0, 160, s.p.croise ? c.ok : c.alerte, 12, "left", true);
          code(ctx, c, ["Serial2.begin(9600, SERIAL_8N1, 16, 17); // RX, TX", "Serial2.write('G');"], x0, 270, w);
          s.etat.ok = s.p.croise;
        } else {
          const lignes = [["CS (choix de l'esclave)", [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], "#8e24aa"], ["SCK (horloge)", [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0], "#fb8c00"],
            ["MOSI (maître → esclave)", [0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0], "#1e88e5"], ["MISO (esclave → maître)", [null, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, null, null], "#43a047"]];
          lignes.forEach(([n, b, col], i) => trace(80 + i * 60, b, n, col));
          code(ctx, c, ["SPI.begin(18, 19, 23, 5); // SCK, MISO, MOSI, CS", "digitalWrite(5, LOW);", "byte r = SPI.transfer(0x9F);", "digitalWrite(5, HIGH);"], x0, 340, w);
          s.etat.ok = true;
        }
      },
      dessinerAlim(s, ctx, W, H, c, g, xg) {
        const k = this.bilanAlim(s), x0 = xg;
        const lignes = [["Tension sur la broche 3V3", LS.nombre(k.v33, 2) + " V", k.v33 > 3.6 || k.v33 < 3.0], ["Courant consommé (moyen / pic)", Math.round(k.Imoy * 1000) + " / " + Math.round(k.Ipic * 1000) + " mA", false],
          ["Puissance dissipée par le régulateur", k.pReg === null ? "—" : LS.nombre(k.pReg, 2) + " W", k.pReg > 0.8], ["Tension sur l'entrée du capteur", s.p.capteur5v ? LS.nombre(k.vEntree, 2) + " V" : "—", k.vEntree > 3.6]];
        lignes.forEach(([n, v, mal], i) => { D().texte(ctx, n, x0, 70 + i * 34, c.texte, 13); D().texte(ctx, v, W - 30, 70 + i * 34, mal ? c.alerte : c.ok, 14, "right", true); });
        k.alertes.forEach((a, i) => D().texte(ctx, "⚠ " + a, x0, 230 + i * 22, c.alerte, 12, "left", true));
        if (!k.alertes.length) D().texte(ctx, "✓ Montage sûr", x0, 230, c.ok, 14, "left", true);
        // Schéma de la chaîne d'alimentation
        const y = H - 120;
        ctx.strokeStyle = c.texte; ctx.lineWidth = 2; ctx.strokeRect(x0, y, 90, 40); ctx.strokeRect(x0 + 140, y, 110, 40); ctx.strokeRect(x0 + 300, y, 90, 40);
        D().texte(ctx, { usb: "USB 5 V", vin9: "Pile 9 V", lipo5v: "LiPo 3,7 V", lipo3v3: "LiPo 4,2 V", "5v3v3": "5 V" }[s.p.source], x0 + 45, y + 20, c.texte, 12, "center", true);
        D().texte(ctx, "régulateur 3,3 V", x0 + 195, y + 14, c.texte, 11, "center", true); D().texte(ctx, "AMS1117 (≈1 V de chute)", x0 + 195, y + 28, c.doux, 9, "center");
        D().texte(ctx, "ESP32 3,3 V", x0 + 345, y + 20, c.texte, 12, "center", true);
        const contourne = s.p.source === "lipo3v3" || s.p.source === "5v3v3";
        D().fleche(ctx, x0 + 90, y + 20, contourne ? x0 + 300 : x0 + 140, contourne ? y + 20 : y + 20, contourne ? c.alerte : c.ok, 2);
        if (!contourne) D().fleche(ctx, x0 + 250, y + 20, x0 + 300, y + 20, c.ok, 2);
        if (contourne) D().texte(ctx, "le régulateur est contourné !", x0 + 195, y + 54, c.alerte, 11, "center", true);
      },
      bilanAlim(s) {
        const Imoy = 0.045 + (s.p.wifiA ? 0.12 : 0) + (s.p.servo ? 0.25 : 0), Ipic = 0.045 + (s.p.wifiA ? 0.45 : 0) + (s.p.servo ? 0.7 : 0);
        const alertes = [];
        let vin = { usb: 5, vin9: 9, lipo5v: 3.7, lipo3v3: 4.2, "5v3v3": 5 }[s.p.source], v33, pReg = null;
        if (s.p.source === "lipo3v3" || s.p.source === "5v3v3") { v33 = vin; alertes.push("Plus de 3,6 V sur la broche 3V3 : l'ESP32 est détruit (maxi absolu 3,6 V)"); }
        else {
          const chute = 1.1 + 0.3 * Ipic;
          v33 = Math.min(3.3, vin - chute);
          pReg = (vin - 3.3) * Imoy;
          if (vin - chute < 3.0) alertes.push("Tension insuffisante en entrée du régulateur : redémarrages au moindre pic Wi-Fi (« brownout »)");
          if (pReg > 0.8) alertes.push("Le régulateur chauffe beaucoup : " + LS.nombre(pReg, 1) + " W perdus en chaleur");
          if (s.p.source === "vin9") alertes.push("Une pile 9 V ne fournit pas les pics de 500 mA du Wi-Fi et se vide en quelques heures");
        }
        if (s.p.servo) alertes.push("Un servomoteur sur le 3V3 provoque des chutes de tension : alimente-le à part (5 V), masses reliées");
        const vEntree = s.p.capteur5v ? (s.p.pont ? 5 * 2 / 3 : 5) : 0;
        if (s.p.capteur5v && !s.p.pont) alertes.push("5 V sur une entrée de l'ESP32 (maxi 3,6 V) : abaisse avec un pont diviseur ou un adaptateur de niveau");
        return { v33, Imoy, Ipic, pReg, vEntree, alertes };
      },
      mesures(s) {
        const inf = s.p.gpio !== undefined ? infoBroche(s.p.gpio) : null;
        const l = [];
        if (inf && inf.gpio) {
          const car = [];
          if (inf.entreeSeule) car.push("entrée seule, sans pull-up interne"); if (inf.flash) car.push("mémoire flash : interdit");
          if (inf.demarrage) car.push("broche de démarrage (strapping)"); if (inf.adc1) car.push("ADC1"); if (inf.adc2) car.push("ADC2"); if (inf.dac) car.push("DAC");
          if (inf.uart0) car.push("UART0 (programmation/USB)");
          l.push(["Broche choisie", "GPIO " + s.p.gpio], ["Particularités", car.join(", ") || "E/S libre"]);
        }
        if (mode === "blink") l.push(["Courant dans la LED", LS.nombre((s.etat.I || 0) * 1000, 1) + " mA", (s.etat.I || 0) > 0.02 ? "alerte" : ""], ["Conseillé", "≤ 20 mA par broche (40 mA maxi absolu)"]);
        if (mode === "bouton") l.push(["Lecture digitalRead", String(s.etat.lu)], ["Appuis réels", String(s.etat.appuis)], ["Appuis comptés", String(s.etat.compte), s.etat.compte !== s.etat.appuis ? "alerte" : ""], ["Entrée flottante ?", s.etat.flottant ? "oui : lecture au hasard" : "non"]);
        if (mode === "pwm") l.push(["Valeur écrite", String(Math.round(s.p.rapport / 100 * (Math.pow(2, s.p.resol) - 1)))], ["Tension moyenne", LS.nombre(3.3 * s.p.rapport / 100, 2) + " V"], ["Fréquence maxi à cette résolution", LS.si(80e6 / Math.pow(2, s.p.resol), "Hz")]);
        if (mode === "adc") l.push(["Tension réelle", LS.nombre(s.etat.V || 0, 2) + " V"], ["analogRead()", s.etat.raw === null ? "erreur" : String(s.etat.raw), s.etat.raw === null ? "alerte" : ""], ["Valeur idéale", String(Math.min(4095, Math.round((s.etat.V || 0) / ADC_ATT[s.p.att] * 4095)))]);
        return l;
      },
      explication() {
        return {
          blink: "Une broche configurée en **sortie** (OUTPUT) fournit 3,3 V (HIGH) ou 0 V (LOW). Comme toute LED, il faut une **résistance série** : R = (3,3 − Vf) / I. Toutes les broches ne se valent pas : 34 à 39 sont des **entrées seules**, 6 à 11 sont reliées à la **mémoire flash**, et 0, 2, 5, 12, 15 influencent le **démarrage**.",
          bouton: "Une entrée non reliée « flotte » : elle lit 0 ou 1 au hasard (elle capte les parasites). Il faut une **résistance de tirage** : INPUT_PULLUP (≈ 45 kΩ interne vers 3,3 V) et un bouton vers la masse — appui = LOW. Un contact mécanique **rebondit** quelques millisecondes : sans **anti-rebond**, un appui compte plusieurs fois.",
          pwm: "L'ESP32 n'a pas de vraie sortie analogique sur toutes ses broches : il fait de la **PWM** (modulation de largeur d'impulsion). Le signal alterne très vite entre 0 et 3,3 V ; la LED (ou le moteur) « voit » la moyenne. Le périphérique **LEDC** a 16 canaux ; fréquence × 2^résolution ≤ 80 MHz.",
          adc: "L'**ADC** 12 bits de l'ESP32 donne 0 à 4095. Il a des défauts réels : rien sous ≈ 0,1 V, réponse **non linéaire** vers le haut de la plage, bruit. `analogReadMilliVolts()` applique une correction d'usine. L'**ADC2** est utilisé par le Wi-Fi : préfère les broches 32 à 39 (ADC1).",
          bus: "Trois bus pour parler aux capteurs et modules. **UART** : 2 fils croisés (TX→RX), asynchrone. **I2C** : 2 fils partagés (SDA, SCL) par jusqu'à 127 appareils, chacun a une **adresse** ; les lignes ont besoin de **résistances de tirage** (4,7 kΩ). **SPI** : 4 fils, rapide, un fil CS par appareil.",
          alim: "L'ESP32 vit en **3,3 V** (maxi absolu 3,6 V) et ses entrées ne tolèrent **pas le 5 V**. Le régulateur de la carte abaisse le 5 V de l'USB ou de la broche 5V/VIN, mais il lui faut ≈ 1 V de marge et il chauffe (P = (Ve − 3,3) × I). Le **Wi-Fi** demande des pics de 400–500 mA : une alimentation faible provoque des redémarrages (brownout)."
        }[mode];
      }
    }, cfg);
  };
})();
