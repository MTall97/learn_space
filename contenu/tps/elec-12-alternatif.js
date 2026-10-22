LS.ajouterTP({
  id: "elec-12-alternatif",
  titre: "Courant alternatif à l'oscilloscope",
  domaine: "electricite", niveau: 3, duree: "25 min",
  sim: "circuit",
  intro: "Un **générateur de signaux** (GBF) produit une tension qui change de sens périodiquement. L'oscilloscope (voie 1) trace u(t). Sur l'écran : **période T** (durée d'un motif, en horizontal avec la base de temps), **amplitude** Û (valeur crête, en vertical). Le voltmètre en mode AC donne la **valeur efficace** : celle d'une tension continue qui chaufferait autant la résistance.",
  config: {
    palette: ["resistance", "lampe", "voltmetre", "amperemetre"],
    tDiv: 0.005,
    oscillo: [{ nom: "GBF1", g: "U" }],
    schema: {
      compos: [
        { type: "generateur", x: 4, y: 8, rot: 90, p: { forme: "sinus", A: 5, f: 50, off: 0 }, nom: "GBF1", fixe: true },
        { type: "resistance", x: 18, y: 8, rot: 90, p: { R: 1000 }, nom: "R1", fixe: true },
        { type: "voltmetre", x: 26, y: 8, rot: 90, p: { mode: "alternatif (AC, efficace)" }, nom: "V1" }
      ],
      fils: [
        { pts: [[4, 8], [4, 4], [18, 4], [18, 8]], fixe: true },
        { pts: [[18, 4], [26, 4], [26, 8]] },
        { pts: [[4, 12], [4, 16], [18, 16], [18, 12]], fixe: true },
        { pts: [[26, 12], [26, 16], [18, 16]] }
      ]
    }
  },
  objectifs: [
    { texte: "Règle la fréquence sur **100 Hz** : combien de périodes vois-tu sur l'écran (10 divisions de 5 ms) ?",
      verif: s => Math.abs(s.trouver("GBF1").p.f - 100) < 1, bravo: "T = 1/f = 10 ms : 5 périodes sur 50 ms." },
    { texte: "Règle l'amplitude pour que le voltmètre AC affiche **3,00 V ± 0,05** en sinus.",
      indice: "Pour une sinusoïde, U_eff = Û / √2, donc Û = 3 × 1,414 ≈ 4,24 V.",
      verif: s => { const g = s.trouver("GBF1"); return g.p.forme === "sinus" && Math.abs(s.trouver("V1")._mesure - 3) < 0.05; } },
    { texte: "Passe en signal **carré** sans toucher l'amplitude : la valeur efficace change. Note-la.",
      verif: s => s.trouver("GBF1").p.forme === "carré" && Math.abs(s.trouver("V1")._mesure - s.trouver("GBF1").p.A) < 0.1,
      bravo: "Pour un carré symétrique, U_eff = Û : la tension est toujours à ± Û." },
    { texte: "Ajoute un **décalage** de +3 V en sinus : la tension ne change plus de signe. C'est une tension **ondulée** (variable mais pas alternative).",
      verif: s => { const g = s.trouver("GBF1"); return g.p.forme === "sinus" && g.p.off >= g.p.A && g.p.A > 0.5; } }
  ],
  questions: [
    { q: "Fréquence d'une tension de période 20 ms ?", choix: ["20 Hz", "50 Hz", "200 Hz"], bonne: 1 },
    { q: "Une sinusoïde de 10 V crête a une valeur efficace de…", choix: ["10 V", "7,07 V", "5 V"], bonne: 1 }
  ],
  notions: [["elec-alternatif", "Signal sinusoïdal"], ["elec-alternatif", "Période"], ["elec-alternatif", "Valeur efficace"], ["elec-alternatif", "Valeur crête"], ["elec-bases", "Oscilloscope"]]
});
