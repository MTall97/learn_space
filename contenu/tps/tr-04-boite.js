LS.ajouterTP({
  id: "tr-04-boite",
  titre: "La boîte de vitesses",
  domaine: "transmissions", niveau: 2, duree: "20 min",
  sim: "boite",
  intro: "Une boîte manuelle à 5 rapports et marche arrière. Les pignons du primaire sont toujours en prise avec ceux du secondaire ; un **crabot** (avec son **synchroniseur**) rend solidaire de l'arbre le pignon du rapport choisi. À droite : le diagramme vitesse-régime, une droite par rapport.",
  objectifs: [
    { texte: "Trouve le rapport qui permet de rouler à **90 km/h sous 3 000 tr/min**.", verif: s => { const k = this.calc ? null : null; const r = LS.RAPPORTS_BOITE[s.p.rapport]; if (!r || r < 0) return false; const v = s.p.regime / r / 4.06 / 60 * 2 * Math.PI * 0.3 * 3.6; return v >= 88 && v <= 92 && s.p.regime < 3000; } },
    { texte: "Compare la **force de traction** en 1re et en 5e au même couple moteur (130 N·m).", verif: (s, m) => { if (s.p.couple === 130) m[s.p.rapport] = true; return !!(m["1"] && m["5"]); } },
    { texte: "Engage la **marche arrière** : la voiture recule (vitesse négative).", verif: s => s.p.rapport === "R" }
  ],
  questions: [
    { q: "En 1re, la force de traction est environ … fois plus grande qu'en 5e.", choix: ["2", "4,7", "10"], bonne: 1, explication: "3,55 / 0,76 ≈ 4,7." },
    { q: "Pourquoi la 5e a-t-elle un rapport inférieur à 1 (0,76) ?", choix: ["C'est une surmultipliée : l'arbre de sortie tourne plus vite que le moteur, pour économiser du carburant sur autoroute", "C'est une erreur", "Pour freiner"], bonne: 0 }
  ],
  notions: [["transmission", "Boîte de vitesses"], ["transmission", "Synchroniseur"], ["transmission", "Rapport de transmission"]]
});
