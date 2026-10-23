LS.ajouterTP({
  id: "sol-04-dimensionnement",
  titre: "Dimensionner un kit solaire autonome",
  domaine: "solaire", niveau: 3, duree: "40 min",
  sim: "installationSolaire",
  intro: "Une maison équipée d'un kit solaire autonome : panneaux, régulateur, batterie, onduleur 220 V (rendement 92 %, 10 W de veille). Règle les appareils, le lieu et le mois, puis le matériel. La simulation calcule **heure par heure sur 7 jours** : production (irradiation mensuelle d'ordre de grandeur PVGIS, durée du jour selon la latitude, pertes de chaleur et de poussière), consommation, état de charge, **délestage** quand la batterie atteint sa limite. Les jours couverts reçoivent 20 % de l'irradiation normale. Les prix sont des ordres de grandeur à vérifier localement.",
  objectifs: [
    { texte: "À **Bamako** en juillet, avec les appareils proposés : **aucun délestage** pendant 7 jours de soleil.",
      verif: s => { const r = s.def.res(s); return s.p.site === "bamako" && s.p.couverts === 0 && r.deleste === 0; },
      bravo: "Avec un seul panneau de 400 Wc, la production égale à peine la consommation : sans marge, la batterie finit vide chaque soir. Il faut produire nettement plus que ce qu'on consomme." },
    { texte: "Ajoute **3 jours couverts** : choisis batterie et panneaux pour **ne rien délester**.",
      verif: s => { const r = s.def.res(s); return s.p.site === "bamako" && s.p.couverts >= 3 && r.deleste === 0; },
      bravo: "C'est la batterie qui fait l'autonomie, mais il faut aussi assez de panneaux pour la remplir après. Compare le coût sur 10 ans d'un parc plomb et d'un parc LiFePO4." },
    { texte: "Dimensionne pour le **mois le plus défavorable** de Bamako (regarde les irradiations mois par mois) avec 3 jours couverts, toujours sans délestage.",
      verif: s => { const r = s.def.res(s); return s.p.site === "bamako" && s.p.mois === 7 && s.p.couverts >= 3 && r.deleste === 0; },
      bravo: "Août, en pleine saison des pluies : ≈ 5,1 kWh/m²/j au lieu de 6,6 en mars. On dimensionne toujours sur le pire mois." },
    { texte: "Même maison à **Paris en décembre** (sans jours couverts ajoutés) : trouve une installation **sans délestage**.",
      verif: s => { const r = s.def.res(s); return s.p.site === "paris" && s.p.mois === 11 && r.deleste === 0; },
      bravo: "Jours de 8 heures et soleil bas : il faut 3 à 4 fois plus de panneaux qu'à Bamako. C'est pourquoi les maisons européennes restent raccordées au réseau." }
  ],
  questions: [
    { q: "Consommation 1 650 Wh/jour, irradiation 5,1 kWh/m²/j, rendement global 0,75. Puissance crête ?", choix: ["≈ 320 Wc", "≈ 430 Wc", "≈ 1 650 Wc"], bonne: 1, explication: "1 650 / (5,1 × 0,75) ≈ 431 Wc." },
    { q: "Pour 2 jours d'autonomie à 1 650 Wh/j en 24 V plomb (50 %), il faut environ…", choix: ["140 Ah", "275 Ah", "69 Ah"], bonne: 1, explication: "1 650 × 2 / (24 × 0,5) = 275 Ah." },
    { q: "Pourquoi l'onduleur allumé jour et nuit compte-t-il dans le bilan ?", choix: ["Il ne compte pas", "Sa veille (10 W) fait 240 Wh par jour, autant que plusieurs lampes", "Il recharge la batterie"], bonne: 1 }
  ],
  notions: [["solaire", "Bilan de consommation"], ["solaire", "Dimensionnement des panneaux"], ["solaire", "Dimensionnement de la batterie"], ["solaire", "Jours d'autonomie"], ["solaire", "Tension du système"], ["solaire", "Délestage"], ["solaire", "Irradiation"], ["solaire", "Consommation à vide"], ["solaire", "Rendement global"]],
  suite: "Ajoute la pompe à eau (400 W à midi) : elle consomme beaucoup mais en plein soleil, presque sans passer par la batterie. Faire tourner les gros appareils le jour est la meilleure économie en solaire autonome."
});
