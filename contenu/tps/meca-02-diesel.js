LS.ajouterTP({
  id: "meca-02-diesel",
  titre: "Essence ou diesel ?",
  domaine: "moteurs", niveau: 2, duree: "25 min",
  sim: "moteur4t",
  intro: "Le moteur **diesel** n'a pas de bougie : il comprime **de l'air seul** si fort (taux 15 à 22) qu'il dépasse 600 °C ; le gazole injecté à la fin de la compression s'enflamme alors **spontanément**. Il n'a pas de papillon : on règle la puissance par la **quantité de gazole** injectée.",
  config: { p: { mode: "diesel", eps: 18, avance: 8, regime: 2000 } },
  objectifs: [
    { texte: "Observe l'**injection** (jet jaune) à la fin de la compression, et la température de fin de compression dans les mesures.",
      verif: (s, m) => { m.vu = m.vu || (s.p.mode === "diesel" && Math.abs(s.etat.th - 360) < 20); return !!m.vu; } },
    { texte: "Baisse le **taux de compression** jusqu'à ce que le diesel **ne démarre plus** (pas d'auto-inflammation).",
      verif: s => s.p.mode === "diesel" && !s.etat.cyc.allume && s.p.allumage, bravo: "En dessous d'environ 13, l'air n'est pas assez chaud. C'est aussi pourquoi un diesel froid démarre mal (bougies de préchauffage)." },
    { texte: "Remets ε = 18 et active le **turbocompresseur** : compare le couple.",
      verif: s => s.p.mode === "diesel" && s.p.turbo && s.etat.cyc.allume && s.etat.cyc.couple > 40 },
    { texte: "Passe en **essence** et monte le taux de compression à **14** : quel problème apparaît ?",
      verif: s => s.p.mode === "essence" && s.p.eps >= 13.5 && s.etat.cyc.cliquetis, bravo: "Le **cliquetis** : le mélange essence-air s'enflamme tout seul avant l'étincelle, avec des chocs qui détruisent pistons et segments. Les moteurs essence restent vers 10–13." }
  ],
  questions: [
    { q: "Pourquoi un diesel consomme-t-il moins qu'un moteur essence ?", choix: ["Taux de compression plus élevé et pas de papillon (moins de pertes par pompage)", "Le gazole est moins cher", "Il tourne plus vite"], bonne: 0 },
    { q: "À quoi servent les bougies de préchauffage d'un diesel ?", choix: ["À allumer le gazole en marche normale", "À chauffer la chambre au démarrage à froid", "À recharger la batterie"], bonne: 1 }
  ],
  notions: [["moteur", "Moteur diesel"], ["moteur", "Injection"], ["moteur", "Cliquetis"], ["moteur", "Turbocompresseur"], ["moteur", "Taux de compression"]]
});
