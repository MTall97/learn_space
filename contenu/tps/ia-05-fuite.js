LS.ajouterTP({
  id: "ia-05-fuite",
  titre: "La fuite de données",
  domaine: "ml-audio", niveau: 3, duree: "25 min",
  sim: "fuite",
  intro: "Un jeu de données de parole est fait de **séries** (épisodes, émissions, locuteurs) découpées en **segments**. Les segments d'une même série partagent un « style » : même voix, même micro, mêmes habitudes du sous-titreur. Ici, ce style est un décalage commun ajouté à tous les points d'une série.\n\nUn classifieur simple (les **k plus proches voisins** : il donne la classe majoritaire parmi les k exemples d'entraînement les plus proches) apprend à reconnaître 3 classes. On compare le score **annoncé** selon la façon de découper entraînement et test, au score **réel** sur 10 séries totalement nouvelles. Chaque score est une moyenne sur 4 tirages.",
  objectifs: [
    { texte: "Avec les réglages de départ, compare les deux découpages : le découpage **par segment** annonce au moins **8 points** de plus que le score réel.",
      verif: s => s.etat.res && s.etat.res.segment - s.etat.res.reel >= 0.08,
      bravo: "Le test contient des segments des mêmes séries que l'entraînement : le modèle reconnaît le style de la série, pas seulement la classe." },
    { texte: "Passe au découpage **par série** : le score annoncé doit être à moins de **5 points** du score réel.",
      verif: s => s.p.decoupage === "serie" && s.etat.res && Math.abs(s.etat.res.serie - s.etat.res.reel) < 0.05 },
    { texte: "Mets la force du style à **0** : que devient l'écart entre les deux découpages ? (moins de 4 points)",
      verif: s => s.p.style === 0 && s.etat.res && Math.abs(s.etat.res.segment - s.etat.res.serie) < 0.04,
      bravo: "Sans ressemblance propre aux séries, découper par segment ne triche plus. La fuite vient de ce que les segments d'une série ne sont pas indépendants." },
    { texte: "Style à **1** ou plus : atteins un score **réel** d'au moins **72 %** en jouant sur le nombre de séries et sur k.",
      verif: s => s.p.style >= 1 && s.etat.res && s.etat.res.reel >= 0.72,
      bravo: "Plus de séries différentes (plus de locuteurs, de producteurs) apprend au modèle à ignorer le style. La diversité des sources compte plus que le nombre de segments." }
  ],
  questions: [
    { q: "Ton modèle a 95 % sur un test découpé au hasard par segment, et 70 % sur un nouvel épisode. Le chiffre honnête est…", choix: ["95 %", "70 %", "la moyenne, 82,5 %"], bonne: 1 },
    { q: "Pour un jeu de test de référence en parole, on sépare de l'entraînement…", choix: ["les segments, au hasard", "les séries, et si possible les chaînes ou producteurs (mêmes acteurs, mêmes sous-titreurs)"], bonne: 1 },
    { q: "Autre fuite classique : normaliser les données avec la moyenne calculée sur tout le jeu, test compris. Pourquoi est-ce une fuite ?", choix: ["Le test influence alors l'entraînement", "Ce n'en est pas une"], bonne: 0, explication: "Toute statistique doit être calculée sur l'entraînement seul." }
  ],
  notions: [["ml-audio", "Fuite de données"], ["ml-audio", "Entraînement, validation, test"], ["ml-audio", "Jeu de test de référence"], ["ml-audio", "Plus proches voisins"]],
  suite: "Monte k à 15 avec peu de séries : le score par segment baisse un peu, car on consulte plus de voisins d'autres séries. Mais l'écart avec le score réel reste : changer de modèle ne corrige pas un mauvais découpage."
});
