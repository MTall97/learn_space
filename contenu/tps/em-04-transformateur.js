LS.ajouterTP({
  id: "em-04-transformateur",
  titre: "Le transformateur",
  domaine: "electromecanique", niveau: 2, duree: "20 min",
  sim: "transformateur",
  intro: "Le chargeur de téléphone (ancien modèle), les postes électriques, le transformateur de la lampe halogène : deux bobinages sur un même noyau de fer. Rapport : **U2 / U1 = N2 / N1**.",
  objectifs: [
    { texte: "Fabrique un transformateur **220 V → 12 V** (réseau malien, à vide ou presque) : règle N2.", verif: s => s.p.U1 === 220 && Math.abs(220 * s.p.N2 / s.p.N1 - 12) < 0.3 },
    { texte: "Avec une charge de 12 Ω au secondaire, compare **I1** et **I2** : le courant est « transformé » à l'inverse de la tension.", verif: s => s.p.R === 12 && Math.abs(220 * s.p.N2 / s.p.N1 - 12) < 0.3 },
    { texte: "Fais un **élévateur** : 220 V → 380 V.", verif: s => s.p.U1 === 220 && Math.abs(220 * s.p.N2 / s.p.N1 - 380) < 5 },
    { texte: "Erreur classique : alimente-le en **continu** et lis l'alerte.", verif: s => s.p.continu },
    { texte: "Remets l'alternatif. Pour faire 220 V → 12 V, quelqu'un propose **500 spires** au primaire et 27 au secondaire (presque le même rapport). Essaie : que se passe-t-il ?", verif: s => !s.p.continu && s.p.U1 >= 200 && s.p.N1 <= 700 && LS.calcTransformateur(s.p).sature,
      bravo: "Le rapport est bon, mais 220 V sur 500 spires, c'est 0,44 V par spire au lieu de 0,2 : le flux dépasse ce que le fer supporte, il **sature**. Le courant à vide n'est plus limité que par la résistance du fil : le primaire brûle. Le nombre de spires du primaire est imposé par la tension et la section du noyau." }
  ],
  questions: [
    { q: "Pourquoi transporte-t-on l'électricité en très haute tension (des centaines de milliers de volts) ?", choix: ["À puissance égale, le courant est plus faible : beaucoup moins de pertes Joule (R·I²) dans les lignes", "C'est plus rapide", "Pour que les oiseaux ne se posent pas"], bonne: 0 }
  ],
  notions: [["electromecanique", "Transformateur"], ["electromecanique", "Induction (loi de Faraday)"], ["elec-alternatif", "Valeur efficace"]]
});
