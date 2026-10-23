LS.ajouterTP({
  id: "elec-05-diviseur",
  titre: "Le diviseur de tension et le potentiomètre",
  domaine: "electricite", niveau: 2, duree: "25 min",
  sim: "circuit",
  intro: "Avec une pile de 9 V, comment obtenir 3,3 V (la tension d'un ESP32) ? Deux résistances en série se partagent la tension : **U2 = U × R2 / (R1 + R2)**. Le voltmètre V1 mesure la tension de sortie, aux bornes de R2.",
  config: {
    palette: ["resistance", "potentiometre", "voltmetre", "lampe"],
    schema: {
      compos: [
        { type: "pile", x: 6, y: 18, p: { U: 9, r: 0.1 }, nom: "G1", fixe: true },
        { type: "resistance", x: 16, y: 4, rot: 90, p: { R: 1000 }, nom: "R1" },
        { type: "resistance", x: 16, y: 10, rot: 90, p: { R: 1000 }, nom: "R2" },
        { type: "voltmetre", x: 24, y: 10, rot: 90, nom: "V1" }
      ],
      fils: [
        { pts: [[6, 18], [2, 18], [2, 2], [16, 2], [16, 4]] },
        { pts: [[16, 8], [16, 10]] },
        { pts: [[16, 8], [24, 8], [24, 10]] },
        { pts: [[16, 14], [16, 18], [10, 18]] },
        { pts: [[24, 14], [24, 18], [16, 18]] }
      ]
    }
  },
  objectifs: [
    { texte: "Avec R1 = R2 = 1 kΩ, quelle tension lit V1 ? Puis règle R1 et R2 pour obtenir **3,3 V ± 0,1 V**.",
      indice: "Il faut R2 / (R1 + R2) = 3,3 / 9 ≈ 0,37. Par exemple R1 = 1,8 kΩ et R2 = 1 kΩ (≈ 3,2 V), ou R1 = 2,2 kΩ et R2 = 1,2 kΩ.",
      verif: s => { const v = s.trouver("V1"); return v && Math.abs(v._mesure - 3.3) <= 0.1; } },
    { texte: "Branche une **charge** (une résistance de 1 kΩ) en parallèle sur R2 : la tension de sortie chute. Note de combien.",
      verif: s => { const r2 = s.trouver("R2"); return s.liste("resistance").some(r => r !== r2 && r.nom !== "R1" && s.memeNet(r, 0, r2, 0) && s.memeNet(r, 1, r2, 1) || r !== r2 && r.nom !== "R1" && s.memeNet(r, 0, r2, 1) && s.memeNet(r, 1, r2, 0)); },
      bravo: "La charge est en parallèle sur R2 : la résistance du bas diminue, la tension aussi. Un diviseur ne convient que pour une charge de résistance bien plus grande que R2 (ou pour une entrée de mesure)." },
    { texte: "Remplace le diviseur par un **potentiomètre** (borne gauche au +, borne droite au −, curseur vers un voltmètre) et règle **5 V ± 0,1 V** sur le curseur.",
      indice: "Le curseur est la borne du haut (flèche). Appuie sur le potentiomètre pour déplacer le curseur avec la glissière.",
      verif: s => s.liste("potentiometre").some(p => s.liste("voltmetre").some(v => (s.memeNet(p, 2, v, 0) || s.memeNet(p, 2, v, 1)) && Math.abs(Math.abs(v._mesure) - 5) <= 0.1)) }
  ],
  questions: [
    { q: "R1 = 1 kΩ, R2 = 2 kΩ, U = 9 V. Tension aux bornes de R2 ?", choix: ["3 V", "4,5 V", "6 V"], bonne: 2, explication: "9 × 2000 / 3000 = 6 V." },
    { q: "Un potentiomètre, c'est…", choix: ["une résistance variable à trois bornes, donc un diviseur réglable", "un condensateur réglable", "un interrupteur"], bonne: 0 }
  ],
  notions: [["elec-bases", "Diviseur de tension"], ["elec-bases", "En parallèle (dérivation)"], ["elec-composants", "Potentiomètre"]]
});
