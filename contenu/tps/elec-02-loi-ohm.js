LS.ajouterTP({
  id: "elec-02-loi-ohm",
  titre: "La loi d'Ohm",
  domaine: "electricite", niveau: 1, duree: "20 min",
  sim: "circuit",
  intro: "Une pile réglable alimente une résistance **R1**. Un **ampèremètre** (en série) mesure le courant, un **voltmètre** (en parallèle) mesure la tension aux bornes de R1. Clique sur la pile ou sur R1 pour changer leurs valeurs avec le curseur, ou tape une valeur (ex. `220`, `4.7k`).",
  config: {
    palette: [],
    schema: {
      compos: [
        { type: "pile", x: 6, y: 16, p: { U: 3, r: 0.1 }, nom: "G1", fixe: true },
        { type: "amperemetre", x: 6, y: 6, nom: "A1", fixe: true },
        { type: "resistance", x: 22, y: 8, rot: 90, p: { R: 100, Pmax: 5 }, nom: "R1", fixe: true },
        { type: "voltmetre", x: 30, y: 8, rot: 90, nom: "V1", fixe: true }
      ],
      fils: [
        { pts: [[6, 16], [2, 16], [2, 6], [6, 6]], fixe: true },
        { pts: [[10, 6], [22, 6], [22, 8]], fixe: true },
        { pts: [[22, 6], [30, 6], [30, 8]], fixe: true },
        { pts: [[22, 12], [22, 16], [10, 16]], fixe: true },
        { pts: [[30, 12], [30, 16], [22, 16]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Règle la pile sur **6 V** (R1 = 100 Ω). Quel courant lis-tu sur A1 ?",
      verif: s => { const g = s.trouver("G1"), r = s.trouver("R1"); return Math.abs(g.p.U - 6) < 0.05 && r.p.R === 100 && Math.abs(s.trouver("A1")._mesure - 0.06) < 0.002; },
      bravo: "I = U / R = 6 / 100 = 0,06 A = 60 mA." },
    { texte: "Double la tension (**12 V**) sans toucher à R1 : que devient le courant ?",
      verif: s => Math.abs(s.trouver("G1").p.U - 12) < 0.05 && s.trouver("R1").p.R === 100 && Math.abs(s.trouver("A1")._mesure - 0.12) < 0.003,
      bravo: "Le courant double : à résistance fixe, I est proportionnel à U." },
    { texte: "Garde 12 V et choisis R1 pour obtenir **un courant entre 50 et 60 mA**.", indice: "R = U / I = 12 / 0,055 ≈ 218 Ω : la valeur normalisée la plus proche est 220 Ω.",
      verif: s => { const i = s.trouver("A1")._mesure; return Math.abs(s.trouver("G1").p.U - 12) < 0.05 && i >= 0.05 && i <= 0.06; } },
    { texte: "Avec R1 = 100 Ω, monte la tension jusqu'à ce que R1 **chauffe** (alerte « Chauffe » en cliquant sur R1), puis choisis une résistance de 5 W.",
      indice: "Règle d'abord R1 sur une puissance maximale de 0,25 W. P = U²/R : à 12 V sur 100 Ω, P = 1,44 W.",
      verif: (s, m) => { const r = s.trouver("R1"); if (r.etat && /Chauffe|brûlée/.test(r.etat.alerte || "")) m.vu = true; return !!(m.vu && r.p.Pmax >= 5); },
      bravo: "Une résistance a une puissance maximale : au-delà, elle chauffe puis brûle. Pour la même valeur en ohms, on choisit un boîtier plus gros." }
  ],
  questions: [
    { q: "Le rapport U/I lu sur V1 et A1 reste constant quand on change U. Que représente-t-il ?", choix: ["La puissance", "La résistance R1", "L'énergie"], bonne: 1, explication: "U / I = R : c'est la définition de la résistance (loi d'Ohm)." },
    { q: "Pourquoi l'ampèremètre est-il branché en série ?", choix: ["Pour mesurer la tension", "Parce que le courant doit le traverser", "Pour protéger la pile"], bonne: 1 },
    { q: "À 12 V, quelle puissance dissipe R1 = 100 Ω ?", choix: ["0,12 W", "1,44 W", "12 W"], bonne: 1, explication: "P = U²/R = 144/100 = 1,44 W, ou P = U·I = 12 × 0,12 = 1,44 W." }
  ],
  notions: [["elec-bases", "Loi d'Ohm"], ["elec-bases", "Résistance"], ["elec-bases", "Puissance"], ["elec-bases", "Ampèremètre"], ["elec-bases", "Voltmètre"], ["elec-bases", "Effet Joule"]]
});
