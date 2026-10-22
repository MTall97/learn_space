LS.ajouterTP({
  id: "elec-13-filtre",
  titre: "Filtre RC passe-bas",
  domaine: "electricite", niveau: 4, duree: "30 min",
  sim: "circuit",
  intro: "Une résistance suivie d'un condensateur forme un **filtre passe-bas** : les basses fréquences passent, les hautes sont atténuées, car le condensateur n'a pas le temps de se charger. La **fréquence de coupure** est **fc = 1 / (2πRC)** : la sortie y vaut 0,707 fois l'entrée (−3 dB). Ici R = 1 kΩ et C = 1 µF : fc ≈ 159 Hz. V1 mesure l'entrée, V2 la sortie (en valeurs efficaces).",
  config: {
    palette: ["resistance", "condensateur", "bobine", "voltmetre"],
    tDiv: 0.002,
    oscillo: [{ nom: "GBF1", g: "U" }, { nom: "C1", g: "U" }],
    schema: {
      compos: [
        { type: "generateur", x: 4, y: 8, rot: 90, p: { forme: "sinus", A: 5, f: 50, off: 0 }, nom: "GBF1", fixe: true },
        { type: "resistance", x: 12, y: 4, p: { R: 1000 }, nom: "R1" },
        { type: "condensateur", x: 22, y: 8, rot: 90, p: { C: 1e-6 }, nom: "C1" },
        { type: "voltmetre", x: 8, y: 8, rot: 90, p: { mode: "alternatif (AC, efficace)" }, nom: "V1", fixe: true },
        { type: "voltmetre", x: 30, y: 8, rot: 90, p: { mode: "alternatif (AC, efficace)" }, nom: "V2", fixe: true }
      ],
      fils: [
        { pts: [[4, 8], [4, 4], [12, 4]] },
        { pts: [[8, 4], [8, 8]] },
        { pts: [[16, 4], [22, 4], [22, 8]] },
        { pts: [[22, 4], [30, 4], [30, 8]] },
        { pts: [[4, 12], [4, 16], [30, 16], [30, 12]] },
        { pts: [[8, 12], [8, 16]] },
        { pts: [[22, 12], [22, 16]] }
      ]
    }
  },
  objectifs: [
    { texte: "À **50 Hz**, compare V2 et V1 : la sortie est presque égale à l'entrée.",
      verif: s => Math.abs(s.trouver("GBF1").p.f - 50) < 1 && s.trouver("V2")._mesure / s.trouver("V1")._mesure > 0.9 },
    { texte: "Cherche la **fréquence de coupure** : règle f pour que V2 / V1 soit entre 0,69 et 0,72.",
      indice: "fc = 1 / (2π × 1000 × 10⁻⁶) ≈ 159 Hz. Tape « 160 » dans la case de la fréquence.",
      verif: s => { const r = s.trouver("V2")._mesure / s.trouver("V1")._mesure; return r > 0.69 && r < 0.72; } },
    { texte: "Monte à **1 600 Hz** (10 × fc) : la sortie n'est plus qu'environ 1/10 de l'entrée, et en retard (décalée) sur l'oscilloscope.",
      verif: s => s.trouver("GBF1").p.f > 1500 && s.trouver("V2")._mesure / s.trouver("V1")._mesure < 0.12 },
    { texte: "Change C pour que la fréquence de coupure devienne **≈ 1 600 Hz** (V2/V1 ≈ 0,7 à 1 600 Hz).",
      verif: s => { const r = s.trouver("V2")._mesure / s.trouver("V1")._mesure; return s.trouver("GBF1").p.f > 1500 && s.trouver("GBF1").p.f < 1700 && r > 0.65 && r < 0.75; } }
  ],
  questions: [
    { q: "Si on échange R et C (C en premier, R en sortie), on obtient…", choix: ["un passe-bas", "un passe-haut", "rien du tout"], bonne: 1 },
    { q: "À quoi sert un filtre passe-bas dans une alimentation ou une chaîne audio ?", choix: ["Enlever les parasites de haute fréquence", "Amplifier le signal", "Changer la fréquence du réseau"], bonne: 0 }
  ],
  notions: [["electronique", "Filtre passe-bas"], ["electronique", "Fréquence de coupure"], ["elec-alternatif", "Impédance"], ["elec-composants", "Condensateur"]]
});
