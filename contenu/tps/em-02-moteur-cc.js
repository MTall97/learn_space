LS.ajouterTP({
  id: "em-02-moteur-cc",
  titre: "Le moteur à courant continu",
  domaine: "electromecanique", niveau: 2, duree: "25 min",
  sim: "moteurCC",
  intro: "Le moteur de perceuse sans fil, de vitre électrique, de jouet ou de trottinette : une spire (en vrai, un bobinage) tourne entre deux aimants. Les **balais** frottent sur un **collecteur** qui inverse le courant à chaque demi-tour pour que le couple garde le même sens. Ce moteur : R = 1,2 Ω, k = 0,05 V·s/rad.",
  objectifs: [
    { texte: "Sous 12 V et faible charge, attends la vitesse stable : relève la vitesse et le courant.", verif: s => s.p.U === 12 && s.p.Cr <= 0.06 && Math.abs(s.etat.i) < 2 && Math.abs(s.etat.w) > 200 },
    { texte: "Augmente la **charge** à 0,4 N·m : la vitesse baisse et le courant monte (≈ 8 A).", verif: s => s.p.Cr >= 0.39 && Math.abs(s.etat.i) > 7.5 },
    { texte: "**Inverse la tension** (−12 V) : le moteur tourne dans l'autre sens.", verif: s => s.p.U <= -11.5 && s.etat.w < -100 },
    { texte: "Règle la tension pour que le moteur tourne à **1 000 tr/min ± 50** avec 0,1 N·m de charge.", indice: "E = k·Ω = 0,05 × 104,7 ≈ 5,2 V ; I = 0,1 / 0,05 = 2 A ; U = E + R·I ≈ 7,6 V.",
      verif: s => Math.abs(s.p.Cr - 0.1) < 0.005 && Math.abs(s.etat.w * 60 / (2 * Math.PI) - 1000) < 50 }
  ],
  questions: [
    { q: "Pourquoi le courant de démarrage est-il si fort ?", choix: ["À l'arrêt, la f.c.é.m. est nulle : I = U / R", "Les balais sont froids", "La tension augmente au démarrage"], bonne: 0, explication: "12 / 1,2 = 10 A au démarrage, contre ≈ 1 A à vide." },
    { q: "Comment inverser le sens de rotation d'un moteur à courant continu à aimants ?", choix: ["Inverser la polarité de l'alimentation", "Changer la fréquence", "Ce n'est pas possible"], bonne: 0 }
  ],
  notions: [["electromecanique", "Force de Laplace"], ["electromecanique", "Moteur à courant continu"], ["electromecanique", "Force contre-électromotrice"], ["electromecanique", "Collecteur et balais"]]
});
