LS.ajouterTP({
  id: "cap-02-ultrason",
  titre: "Mesurer une distance aux ultrasons",
  domaine: "capteurs", niveau: 1, duree: "25 min",
  sim: "ultrason",
  intro: "Le **HC-SR04** émet un bip à 40 kHz, inaudible, et mesure la durée de l'écho. Le son fait l'aller et le retour : **d = v·t / 2**. L'animation est ralentie (un vrai aller-retour sur 1 m dure environ 6 ms) ; en bas, le chronogramme montre les broches TRIG et ECHO.\n\nLes limites (faisceau d'environ ± 15°, portée selon la surface) sont des ordres de grandeur : elles varient d'un module à l'autre.",
  objectifs: [
    { texte: "Place un mur à **100 cm**, face au capteur : la mesure est juste à **1 cm** près.", verif: s => { const m = s.etat.m; return m && Math.abs(s.p.distance - 100) <= 2 && s.p.surface === "dur" && m.vu && Math.abs(m.err) < 1; } },
    { texte: "Air à **35 °C ou plus**, objet à **2 m ou plus**, **sans** correction de température : l'erreur dépasse **3 cm**.", verif: s => { const m = s.etat.m; return m && s.p.tempAir >= 35 && s.p.distance >= 200 && !s.p.correction && Math.abs(m.err) > 3; }, bravo: "La vitesse du son passe de 343 m/s à 20 °C à 355 m/s à 40 °C : 3,5 % d'erreur, soit 7 cm à 2 m." },
    { texte: "Incline la planche de plus de **15°** avec un **mur du fond** : le capteur affiche le mur (≈ 350 cm) au lieu de la planche.", verif: s => { const m = s.etat.m; return m && s.p.surface === "incline" && s.p.angle > 15 && s.p.fond === "mur" && m.dMes > 300; } },
    { texte: "Un **tissu** à **1,6 m ou plus** : plus d'écho du tout.", verif: s => { const m = s.etat.m; return m && s.p.surface === "mou" && s.p.distance >= 160 && !m.vu && s.p.fond === "rien"; } }
  ],
  questions: [
    { q: "ECHO reste haut pendant 5 800 µs. À 20 °C (343 m/s), l'objet est à…", choix: ["≈ 1 m", "≈ 2 m", "≈ 50 cm"], bonne: 0, explication: "d = 343 × 0,0058 / 2 ≈ 0,99 m." },
    { q: "Le HC-SR04 est alimenté en 5 V. Sa broche ECHO sur un ESP32 :", choix: ["se branche directement", "passe par un diviseur (par exemple 1 kΩ / 2 kΩ) pour ne pas dépasser 3,3 V", "doit être reliée au 5 V"], bonne: 1 },
    { q: "Pourquoi un robot à ultrasons rate-t-il souvent les pieds de chaise ?", choix: ["Ils sont trop froids", "Une tige fine renvoie très peu d'énergie", "Le son les traverse"], bonne: 1 }
  ],
  notions: [["capteurs", "HC-SR04 (ultrasons)"], ["capteurs", "Étendue de mesure"], ["capteurs", "Grandeur mesurée"], ["esp32", "Niveaux logiques"]],
  suite: "Pour mesurer la température en même temps, ajoute un DS18B20 et corrige la vitesse du son dans le programme."
});
