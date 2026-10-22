LS.ajouterTP({
  id: "elec-09-condensateur",
  titre: "Charge et décharge d'un condensateur",
  domaine: "electricite", niveau: 3, duree: "30 min",
  sim: "circuit",
  intro: "Un **condensateur** stocke des charges électriques. À travers une résistance, il ne se charge pas instantanément : sa tension suit une courbe exponentielle de **constante de temps τ = R × C**. Au bout de τ, il atteint 63 % de la tension finale ; au bout de 5τ, on le considère chargé.\n\nL'interrupteur va-et-vient **K1** relie le circuit RC soit au + de la pile (charge), soit à la masse (décharge). L'oscilloscope affiche la tension du condensateur (voie 1). Ici R = 10 kΩ et C = 100 µF : τ = 1 s.",
  config: {
    palette: ["resistance", "condensateur", "voltmetre", "led"],
    tDiv: 0.5,
    oscillo: [{ nom: "C1", g: "U" }, { nom: "R1", g: "I" }],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 8, rot: 90, p: { U: 10, r: 0.1 }, nom: "G1", fixe: true },
        { type: "vaetvient", x: 14, y: 6, rot: 180, p: { haut: true }, nom: "K1", fixe: true },
        { type: "resistance", x: 16, y: 6, p: { R: 10000 }, nom: "R1" },
        { type: "condensateur", x: 24, y: 8, rot: 90, p: { C: 1e-4 }, nom: "C1" },
        { type: "voltmetre", x: 30, y: 8, rot: 90, nom: "V1", fixe: true },
        { type: "masse", x: 8, y: 16, nom: "GND", fixe: true }
      ],
      fils: [
        { pts: [[4, 8], [4, 5], [10, 5]], fixe: true },
        { pts: [[10, 7], [8, 7], [8, 16]], fixe: true },
        { pts: [[4, 12], [4, 16], [24, 16]], fixe: true },
        { pts: [[14, 6], [16, 6]], fixe: true },
        { pts: [[20, 6], [24, 6], [24, 8]] },
        { pts: [[24, 6], [30, 6], [30, 8]], fixe: true },
        { pts: [[24, 12], [24, 16]] },
        { pts: [[30, 12], [30, 16], [24, 16]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Bascule **K1** vers la pile : le condensateur se charge. Attends qu'il dépasse **9,9 V** (≈ 5τ).",
      verif: s => (s.trouver("C1")._v || 0) > 9.9, bravo: "La tension monte vite au début, puis de plus en plus lentement : le courant diminue à mesure que le condensateur se remplit." },
    { texte: "Bascule K1 vers la masse : le condensateur se **décharge** dans R1. Observe le courant (voie 2) : il change de **sens**.",
      verif: (s, m) => { const c = s.trouver("C1"); if ((c._v || 0) > 9) m.plein = true; return !!(m.plein && (c._v || 0) < 0.1); } },
    { texte: "Remplace R1 par **47 kΩ** et recharge : la charge prend environ 5 fois plus de temps (τ = 4,7 s).",
      verif: (s, m) => { const r = s.trouver("R1"), c = s.trouver("C1"); return r && Math.abs(r.p.R - 47000) < 1 && (c._v || 0) > 6.3; } },
    { texte: "Choisis R et C pour que τ = **0,1 s** (par exemple 1 kΩ et 100 µF) et observe une charge 10 fois plus rapide (base de temps 0,1 s/div).",
      verif: s => { const r = s.trouver("R1"), c = s.trouver("C1"); return r && c && Math.abs(r.p.R * c.p.C - 0.1) < 0.005; } }
  ],
  questions: [
    { q: "Au bout d'une durée τ = RC, la tension du condensateur vaut :", choix: ["50 % de la tension finale", "63 % de la tension finale", "100 %"], bonne: 1, explication: "u(τ) = E(1 − e⁻¹) ≈ 0,63 E." },
    { q: "Condensateur chargé, en régime permanent continu, il se comporte comme…", choix: ["un fil", "un interrupteur ouvert (plus de courant)", "une pile parfaite"], bonne: 1 },
    { q: "Énergie stockée dans 100 µF chargé à 10 V ?", choix: ["5 mJ", "1 mJ", "0,5 J"], bonne: 0, explication: "E = ½ C U² = 0,5 × 100·10⁻⁶ × 100 = 5·10⁻³ J." }
  ],
  notions: [["elec-composants", "Condensateur"], ["elec-composants", "Constante de temps"], ["elec-bases", "Oscilloscope"]],
  suite: "Ajoute une LED (avec sa résistance) en parallèle sur le condensateur : elle continue de briller un moment après la coupure. C'est le principe d'une réserve d'énergie (supercondensateur)."
});
