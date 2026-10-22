LS.ajouterTP({
  id: "tr-02-chaine-moto",
  titre: "Transmission par chaîne d'une moto",
  domaine: "transmissions", niveau: 2, duree: "20 min",
  sim: "chaineMoto",
  intro: "Sur une moto, le mouvement passe par : la **transmission primaire** (moteur → embrayage → boîte), la **boîte de vitesses**, puis la **transmission secondaire** par **chaîne** : un petit **pignon** en sortie de boîte entraîne une grande **couronne** fixée à la roue arrière.",
  objectifs: [
    { texte: "En **6e**, à **8 000 tr/min**, quelle vitesse atteins-tu avec le kit d'origine (15/45) ?", verif: s => s.p.rapport === 6 && s.p.regime === 8000 && s.p.zp === 15 && s.p.zc === 45 },
    { texte: "« Raccourcis » la transmission pour le tout-terrain : passe à une couronne de **50 dents** (vitesse plus faible au même régime, plus d'accélération).", verif: s => s.p.zc >= 50 },
    { texte: "Trouve une combinaison pignon/couronne pour rouler à **100 km/h ± 2** en 6e à **6 000 tr/min**.", verif: s => { const nb = s.p.regime / 1.85 / 1.05, v = nb * s.p.zp / s.p.zc / 60 * Math.PI * s.p.diam / 1000 * 3.6; return s.p.rapport === 6 && s.p.regime === 6000 && Math.abs(v - 100) <= 2; } }
  ],
  questions: [
    { q: "Une dent de moins au pignon (15 → 14) avec une couronne de 45 : le rapport secondaire passe de 3 à…", choix: ["≈ 3,21 (plus court)", "≈ 2,8 (plus long)", "3 (inchangé)"], bonne: 0 },
    { q: "Pourquoi change-t-on chaîne, pignon et couronne ensemble ?", choix: ["Une chaîne usée « s'allonge » et use les dents neuves (et inversement)", "Pour la couleur", "C'est obligatoire par la loi"], bonne: 0 }
  ],
  notions: [["transmission", "Chaîne"], ["transmission", "Pignon et couronne"], ["transmission", "Rapport de transmission"]]
});
