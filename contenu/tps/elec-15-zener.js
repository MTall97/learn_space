LS.ajouterTP({
  id: "elec-15-zener",
  titre: "Réguler avec une diode Zener",
  domaine: "electronique", niveau: 3, duree: "25 min",
  sim: "circuit",
  intro: "Une diode **Zener** branchée en **inverse** (cathode vers le +) maintient à ses bornes une tension presque constante, sa **tension Zener** (ici 5,1 V), tant qu'elle est traversée par un courant suffisant. La résistance R1 absorbe la différence de tension. Rch (1 kΩ) représente l'appareil alimenté.",
  config: {
    palette: ["resistance", "zener", "voltmetre", "amperemetre"],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 8, rot: 90, p: { U: 12, r: 0.1 }, nom: "G1", fixe: true },
        { type: "resistance", x: 8, y: 4, p: { R: 220, Pmax: 1 }, nom: "R1" },
        { type: "zener", x: 18, y: 12, rot: 270, p: { Vz: 5.1 }, nom: "DZ1" },
        { type: "voltmetre", x: 26, y: 8, rot: 90, nom: "V1", fixe: true },
        { type: "resistance", x: 32, y: 8, rot: 90, p: { R: 1000 }, nom: "Rch" }
      ],
      fils: [
        { pts: [[4, 8], [4, 4], [8, 4]], fixe: true },
        { pts: [[12, 4], [18, 4], [18, 8]] },
        { pts: [[18, 4], [26, 4], [26, 8]] },
        { pts: [[26, 4], [32, 4], [32, 8]] },
        { pts: [[4, 12], [4, 16], [32, 16], [32, 12]], fixe: true },
        { pts: [[18, 12], [18, 16]] },
        { pts: [[26, 12], [26, 16]] }
      ]
    }
  },
  objectifs: [
    { texte: "Fais varier la pile de **9 V à 15 V** : la sortie V1 doit rester entre 5,0 et 5,4 V.",
      verif: (s, m) => { const u = s.trouver("G1").p.U, v = s.trouver("V1")._mesure; if (v > 5 && v < 5.4) { if (u <= 9.2) m.bas = true; if (u >= 14.8) m.haut = true; } return !!(m.bas && m.haut); },
      bravo: "La Zener absorbe le surplus de courant : plus la pile monte, plus elle conduit, et la sortie bouge à peine." },
    { texte: "Diminue Rch à **100 Ω** (appareil qui consomme beaucoup) avec la pile à 12 V : la régulation **décroche** (sortie < 4,5 V). Pourquoi ?",
      verif: s => s.trouver("Rch") && s.trouver("Rch").p.R <= 100 && s.trouver("V1")._mesure < 4.5,
      bravo: "R1 ne laisse passer que (12 − 5,1) / 220 ≈ 31 mA, mais la charge en voudrait 51 : il ne reste rien pour la Zener, elle se bloque." },
    { texte: "Trouve une valeur de R1 qui permet de réguler **5,1 V ± 0,3** avec Rch = 100 Ω et la pile à 12 V.",
      indice: "Il faut I(R1) > 51 mA + quelques mA pour la Zener : R1 < (12 − 5,1) / 0,06 ≈ 115 Ω. Attention à la puissance de R1 !",
      verif: s => s.trouver("Rch") && s.trouver("Rch").p.R <= 100 && Math.abs(s.trouver("G1").p.U - 12) < 0.2 && Math.abs(s.trouver("V1")._mesure - 5.1) < 0.3 }
  ],
  questions: [
    { q: "À 15 V sans charge, quelle puissance la Zener dissipe-t-elle avec R1 = 220 Ω ?", choix: ["≈ 0,23 W", "≈ 2,3 W", "≈ 0,02 W"], bonne: 0, explication: "I = (15 − 5,1) / 220 ≈ 45 mA ; P = 5,1 × 0,045 ≈ 0,23 W." },
    { q: "Pourquoi les alimentations modernes utilisent-elles plutôt un régulateur intégré (7805, LDO) ou un convertisseur à découpage ?", choix: ["Meilleur rendement et régulation plus précise", "C'est plus joli", "La Zener est interdite"], bonne: 0 }
  ],
  notions: [["elec-composants", "Diode Zener"], ["electronique", "Régulation"], ["elec-bases", "Diviseur de tension"]]
});
