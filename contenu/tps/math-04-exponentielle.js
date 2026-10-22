LS.ajouterTP({
  id: "math-04-exponentielle",
  titre: "Exponentielle, logarithme et décibels",
  domaine: "maths", niveau: 2, duree: "30 min",
  sim: "exponentielle",
  intro: "Une grandeur qui change d'un **même pourcentage** à chaque instant suit une **exponentielle** : placements, décharge d'un condensateur, refroidissement. Le **logarithme** est l'opération inverse ; il donne les échelles logarithmiques et les **décibels**, utilisés en audio, en télécoms et en électronique.",
  objectifs: [
    { texte: "Intérêts composés à **7 %** par an : au bout de combien d'années le capital double-t-il ? Compare avec la règle des 70.", verif: s => s.p.mode === "croissance" && s.p.taux === 7, bravo: "ln 2 / ln 1,07 ≈ 10,2 ans ; la règle des 70 donne 70 / 7 = 10 ans." },
    { texte: "Passe l'axe vertical en **échelle logarithmique** : que devient la courbe des intérêts composés ?", verif: s => s.p.mode === "croissance" && s.p.log, bravo: "Une droite : en échelle log, multiplier par un même facteur revient à monter d'une même hauteur." },
    { texte: "Décharge d'un condensateur : règle **τ = 2 s**. Quelle est la demi-vie ?", verif: s => s.p.mode === "decroissance" && Math.abs(s.p.tau - 2) / 2 < 0.03, bravo: "t½ = τ·ln 2 ≈ 1,39 s. Au bout de 5τ = 10 s, il reste moins de 1 % de la tension." },
    { texte: "Décibels : trouve le gain qui **divise une puissance par 2**.", verif: s => s.p.mode === "decibels" && s.p.grandeur === "puissance" && s.p.gain === -3, bravo: "−3 dB ≈ ×0,5 en puissance. C'est la définition de la fréquence de coupure d'un filtre." },
    { texte: "Quel gain multiplie une **tension par 10** ?", verif: s => s.p.mode === "decibels" && s.p.grandeur === "tension" && s.p.gain === 20, bravo: "+20 dB en tension (et donc ×100 en puissance, car P ∝ U²)." }
  ],
  questions: [
    { q: "Un amplificateur de +10 dB suivi d'un câble de −4 dB donnent au total :", choix: ["+6 dB", "−40 dB", "+14 dB"], bonne: 0, explication: "Les décibels s'additionnent : 10 − 4 = 6 dB." },
    { q: "log₁₀(0,001) vaut :", choix: ["−3", "3", "0,001"], bonne: 0 },
    { q: "Un placement à 3,5 % par an double en environ :", choix: ["20 ans", "35 ans", "7 ans"], bonne: 0, explication: "70 / 3,5 = 20 ans." }
  ],
  notions: [["maths", "Exponentielle"], ["maths", "Logarithme"], ["maths", "Temps de doublement et demi-vie"], ["maths", "Décibel"], ["maths", "Échelle logarithmique"], ["maths", "Équation différentielle du premier ordre"]],
  suite: "Le TP « Charge et décharge d'un condensateur » montre la même exponentielle sur un vrai circuit, à l'oscilloscope."
});
