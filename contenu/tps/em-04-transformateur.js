LS.ajouterTP({
  id: "em-04-transformateur",
  titre: "Le transformateur",
  domaine: "electromecanique", niveau: 2, duree: "20 min",
  sim: "transformateur",
  intro: "Le chargeur de téléphone (ancien modèle), les postes électriques, le transformateur de la lampe halogène : deux bobinages sur un même noyau de fer. Rapport : **U2 / U1 = N2 / N1**.",
  objectifs: [
    { texte: "Fabrique un transformateur **230 V → 12 V** (à vide ou presque) : règle N2.", verif: s => s.p.U1 === 230 && Math.abs(230 * s.p.N2 / s.p.N1 - 12) < 0.3 },
    { texte: "Avec une charge de 12 Ω au secondaire, compare **I1** et **I2** : le courant est « transformé » à l'inverse de la tension.", verif: s => s.p.R === 12 && Math.abs(230 * s.p.N2 / s.p.N1 - 12) < 0.3 },
    { texte: "Fais un **élévateur** : 230 V → 400 V.", verif: s => s.p.U1 === 230 && Math.abs(230 * s.p.N2 / s.p.N1 - 400) < 5 },
    { texte: "Erreur classique : alimente-le en **continu** et lis l'alerte.", verif: s => s.p.continu }
  ],
  questions: [
    { q: "Pourquoi transporte-t-on l'électricité en très haute tension (400 000 V) ?", choix: ["À puissance égale, le courant est plus faible : beaucoup moins de pertes Joule (R·I²) dans les lignes", "C'est plus rapide", "Pour que les oiseaux ne se posent pas"], bonne: 0 }
  ],
  notions: [["electromecanique", "Transformateur"], ["electromecanique", "Induction (loi de Faraday)"], ["elec-alternatif", "Valeur efficace"]]
});
