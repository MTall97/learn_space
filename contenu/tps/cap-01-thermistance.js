LS.ajouterTP({
  id: "cap-01-thermistance",
  titre: "Mesurer une température avec une thermistance",
  domaine: "capteurs", niveau: 1, duree: "30 min",
  sim: "thermistance",
  intro: "Une **CTN** de 10 kΩ (B = 3950) est montée en **diviseur de tension** avec une résistance fixe, sous 3,3 V ; le point milieu va sur la GPIO 34 d'un ESP32, dont l'ADC 12 bits lit un nombre de 0 à 4095. Le programme remonte à la tension, puis à la résistance de la CTN, puis à la température. Chaque étape peut ajouter une erreur : à toi de les trouver.\n\nLa « vraie » CTN suit le modèle de Steinhart-Hart ; l'ADC reprend les défauts de celui de l'ESP32 (zone morte, plafond, courbure). Les valeurs sont des ordres de grandeur réalistes, pas celles d'une référence précise.",
  objectifs: [
    { texte: "À **25 °C**, résistance fixe de **10 kΩ**, conversion corrigée : la température estimée est juste à **0,5 °C** près.", verif: s => { const m = s.etat.m; return m && s.p.T === 25 && s.p.rf === 10000 && s.p.conversion === "corrigee" && Math.abs(m.err) < 0.5; } },
    { texte: "Passe en conversion **naïve** (lecture × 3,3 / 4095) : l'erreur dépasse **3 °C**.", verif: s => { const m = s.etat.m; return m && s.p.conversion === "naive" && isFinite(m.err) && Math.abs(m.err) > 3; }, bravo: "L'ADC de l'ESP32 n'est pas une droite de 0 à 3,3 V : il faut utiliser sa courbe corrigée (analogReadMilliVolts)." },
    { texte: "Chauffe à **90 °C ou plus** (conversion corrigée) et choisis la résistance fixe qui donne une résolution meilleure que **0,05 °C par pas**.", verif: s => { const m = s.etat.m; return m && s.p.T >= 90 && s.p.conversion === "corrigee" && m.resolution < 0.05; }, bravo: "À chaud, la CTN ne fait plus que quelques centaines d'ohms : une résistance fixe du même ordre rend le diviseur sensible." },
    { texte: "Provoque un **auto-échauffement** de plus de **1 °C**, puis supprime-le en n'alimentant le diviseur que pendant la mesure.", verif: (s, mem) => { const m = s.etat.m; if (m && m.dT > 1) mem.chaud = true; return !!(mem.chaud && m && s.p.alim === "gpio" && m.dT < 0.05); } },
    { texte: "À **−15 °C ou moins**, compare les deux formules : avec **Steinhart-Hart**, l'erreur passe sous **0,3 °C**.", verif: s => { const m = s.etat.m; return m && s.p.T <= -15 && s.p.calcul === "sh" && s.p.conversion === "corrigee" && Math.abs(m.err) < 0.3; } }
  ],
  questions: [
    { q: "Une CTN 10 kΩ vaut environ 33 kΩ à 0 °C. Dans un diviseur avec 10 kΩ en haut sous 3,3 V, la tension à ses bornes vaut…", choix: ["≈ 2,5 V", "≈ 0,8 V", "≈ 1,65 V"], bonne: 0, explication: "3,3 × 33 / (33 + 10) ≈ 2,53 V." },
    { q: "Pourquoi choisir la résistance fixe égale à la résistance de la CTN au milieu de la plage ?", choix: ["Pour consommer moins", "C'est là que la tension varie le plus par degré (sensibilité maximale)", "Pour que la tension soit toujours de 3,3 V"], bonne: 1 },
    { q: "Une résolution de 0,02 °C garantit-elle une mesure juste à 0,02 °C ?", choix: ["Oui", "Non : la justesse dépend aussi de la tolérance de la CTN, de la formule, de l'ADC et de l'auto-échauffement"], bonne: 1 }
  ],
  notions: [["capteurs", "Thermistance CTN"], ["capteurs", "Diviseur de tension (capteur)"], ["capteurs", "Sensibilité"], ["capteurs", "Résolution"], ["capteurs", "Non-linéarité"], ["capteurs", "Effet de charge"], ["esp32", "ADC"]],
  suite: "Sur un vrai montage, ajoute un condensateur de 100 nF entre la GPIO et la masse et fais la moyenne de 16 lectures : le bruit de l'ADC de l'ESP32 est bien réel."
});
