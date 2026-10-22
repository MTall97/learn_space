LS.ajouterTP({
  id: "tr-01-engrenages",
  titre: "Engrenages et rapport de réduction",
  domaine: "transmissions", niveau: 1, duree: "15 min",
  sim: "engrenages",
  intro: "Deux roues dentées en prise : à chaque tour du pignon menant (Z1 dents), la roue menée avance de Z1 dents, soit Z1/Z2 de tour. Le **rapport de transmission** est **k = N2/N1 = Z1/Z2**. Comme la puissance se conserve (aux pertes près), le couple varie à l'inverse : **C2 ≈ C1 / k**.",
  objectifs: [
    { texte: "Obtiens un **réducteur de rapport 1/4** : la roue menée tourne 4 fois moins vite.", verif: s => Math.abs(s.p.z1 / s.p.z2 - 0.25) < 0.005 && !s.p.inter },
    { texte: "Avec ce réducteur et 20 N·m en entrée, lis le couple de sortie (≈ 78 N·m avec 2 % de pertes).", verif: s => Math.abs(s.p.z1 / s.p.z2 - 0.25) < 0.005 && s.p.c1 === 20 },
    { texte: "Ajoute une **roue intermédiaire** : le rapport change-t-il ? Et le sens de rotation ?", verif: s => s.p.inter, bravo: "La roue intermédiaire ne change pas le rapport (ses dents s'annulent), seulement le sens. C'est le principe de la marche arrière." },
    { texte: "Fais un **multiplicateur** qui sort à **1 500 tr/min** avec 500 tr/min en entrée.", verif: s => Math.abs(s.p.n1 * s.p.z1 / s.p.z2 - 1500) < 15 && s.p.n1 >= 490 && s.p.n1 <= 510 }
  ],
  questions: [
    { q: "Pignon de 15 dents, roue de 45 dents, entrée 900 tr/min. Sortie ?", choix: ["2 700 tr/min", "300 tr/min", "900 tr/min"], bonne: 1 },
    { q: "Pourquoi un réducteur augmente-t-il le couple ?", choix: ["La puissance C × ω se conserve : si ω baisse, C augmente", "Parce que les dents sont plus grosses", "Il ne l'augmente pas"], bonne: 0 }
  ],
  notions: [["transmission", "Engrenage"], ["transmission", "Rapport de transmission"], ["transmission", "Couple"], ["transmission", "Rendement"]]
});
