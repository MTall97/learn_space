LS.ajouterTP({
  id: "esp-01-blink",
  titre: "Faire clignoter une LED",
  domaine: "esp32", niveau: 1, duree: "15 min",
  sim: "esp32", config: { p: { mode: "blink" } },
  intro: "Le « Hello world » de l'électronique embarquée. La carte **ESP32 DevKitC** a 38 broches ; chaque **GPIO** (entrée/sortie à usage général) peut être programmée. Les couleurs indiquent les broches à éviter. Clique sur une broche pour y brancher la LED et sa résistance (l'autre côté va à GND) ; le programme Arduino se met à jour.",
  objectifs: [
    { texte: "Fais clignoter la LED sur **GPIO 2** (souvent reliée à la LED bleue de la carte) avec une résistance de **220 Ω**.", verif: s => String(s.p.gpio) === "2" && s.p.R === 220 },
    { texte: "Essaie la broche **GPIO 34** : pourquoi la LED ne s'allume-t-elle pas ?", verif: s => String(s.p.gpio) === "34", bravo: "34 à 39 sont des entrées seules : elles n'ont pas de circuit de sortie." },
    { texte: "Choisis une broche **libre** (verte) et une résistance qui donne **10 à 15 mA** pour une LED rouge.", verif: s => { const i = LS.infoBrocheESP32(s.p.gpio); return i.type === "libre" && s.p.couleur === "rouge" && s.etat.I >= 0.01 && s.etat.I <= 0.015; } },
    { texte: "Fais clignoter **deux fois par seconde** (période 500 ms).", verif: s => s.p.delai === 250 }
  ],
  questions: [
    { q: "LED rouge (1,9 V) sur une sortie 3,3 V, 10 mA voulus. Résistance ?", choix: ["≈ 140 Ω (150 Ω normalisée)", "≈ 330 Ω", "≈ 1 kΩ"], bonne: 0 },
    { q: "Pourquoi ne pas utiliser les GPIO 6 à 11 ?", choix: ["Elles sont reliées à la mémoire flash qui contient le programme", "Elles sont trop lentes", "Elles sont en 5 V"], bonne: 0 }
  ],
  notions: [["esp32", "GPIO"], ["esp32", "Broches à éviter"], ["esp32", "digitalWrite"], ["elec-composants", "LED"]]
});
