LS.ajouterTP({
  id: "elec-06-led",
  titre: "Allumer une LED sans la griller",
  domaine: "electricite", niveau: 2, duree: "20 min",
  sim: "circuit",
  intro: "Une **LED** (diode électroluminescente) ne laisse passer le courant que dans un sens : de l'**anode** (A, côté triangle) vers la **cathode** (K, côté barre). Au-dessus de sa **tension de seuil** (≈ 1,9 V pour une rouge, ≈ 3 V pour une bleue), son courant monte très vite : sans **résistance de protection**, elle grille. La plaque est vide : à toi de construire.",
  config: {
    palette: ["pile", "led", "resistance", "interrupteur", "amperemetre", "voltmetre"],
    schema: { compos: [{ type: "pile", x: 6, y: 16, p: { U: 9, r: 0.5 }, nom: "G1" }], fils: [] }
  },
  objectifs: [
    { texte: "Branche une LED **rouge** avec une résistance en série sur la pile de 9 V, avec un courant **entre 12 et 22 mA**.",
      indice: "R = (9 − 1,9) / 0,02 ≈ 355 Ω : prends 330 Ω. Attention au sens de la LED : anode vers le +.",
      verif: s => s.liste("led").some(l => l.p.couleur === "rouge" && !(l.etat && l.etat.grille) && s.I(l) > 0.012 && s.I(l) < 0.022) },
    { texte: "Retourne la LED (bouton ⟳ deux fois) : elle s'éteint. C'est une diode : elle bloque le courant en inverse.",
      verif: (s, m) => s.liste("led").some(l => s.U(l) < -1 && Math.abs(s.I(l)) < 1e-5) },
    { texte: "Passe la LED en **bleue** (seuil ≈ 3 V) et recalcule la résistance pour 12–22 mA.",
      verif: s => s.liste("led").some(l => l.p.couleur === "bleue" && !(l.etat && l.etat.grille) && s.I(l) > 0.012 && s.I(l) < 0.022) },
    { texte: "Pour comprendre : branche une LED **sans résistance** et observe (🛠 Réparer ensuite).",
      verif: s => s.liste("led").some(l => l.etat && l.etat.grille), bravo: "Le courant n'est limité que par la résistance interne de la pile : bien plus de 30 mA, la LED surchauffe. La résistance série est obligatoire." }
  ],
  questions: [
    { q: "Avec une pile de 5 V et une LED rouge (1,9 V) à 15 mA, quelle résistance ?", choix: ["≈ 120 Ω", "≈ 210 Ω (220 Ω normalisée)", "≈ 330 Ω"], bonne: 1, explication: "R = (5 − 1,9) / 0,015 ≈ 207 Ω → 220 Ω." },
    { q: "Pourquoi la tension de la LED reste presque constante quand le courant change ?", choix: ["Parce que c'est une diode : au-delà du seuil, son courant monte très vite pour une faible hausse de tension", "Parce que la pile la régule", "Par hasard"], bonne: 0 }
  ],
  notions: [["elec-composants", "LED"], ["elec-composants", "Diode"], ["elec-bases", "Loi d'Ohm"], ["elec-bases", "En série"]]
});
