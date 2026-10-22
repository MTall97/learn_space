LS.ajouterCarte({
  id: "finance",
  titre: "Finance et trading",
  intro: "Les notions utiles pour comprendre et **vérifier** des analyses de marché : fonctionnement du Forex et des matières premières, ordres, gestion du risque, analyse, saisonnalité et backtest. Objectif : savoir distinguer un avantage réel d'un résultat dû au hasard ou à une erreur de méthode.",
  racine: { t: "Trading", c: [
    { t: "Marchés", c: [
      { t: "Forex", d: "Marché des changes : on échange une devise contre une autre, par **paires** (EUR/USD = combien de dollars pour 1 euro). Ouvert 24 h/24 en semaine, le plus liquide du monde." },
      { t: "Pip", d: "Plus petite variation habituelle d'une paire : 0,0001 pour la plupart (EUR/USD), 0,01 pour les paires en yen. La valeur d'un pip en argent dépend de la taille de la position.", ex: "EUR/USD de 1,0850 à 1,0900 : +50 pips." },
      { t: "Lot", d: "Taille standard d'une position : 1 lot = 100 000 unités de la devise de base (mini-lot 10 000, micro-lot 1 000). Sur EUR/USD, 1 pip vaut ≈ 10 $ par lot." },
      { t: "Matières premières", d: "Or (XAU/USD), pétrole, métaux, produits agricoles : des prix influencés par l'offre, la demande, le dollar et les saisons (récoltes, chauffage)." },
      { t: "Spread", d: "Écart entre le prix d'achat (ask) et de vente (bid) : un coût payé à chaque transaction, plus élevé la nuit et autour des annonces." },
      { t: "Effet de levier", d: "Possibilité d'engager une position plus grande que son capital : il multiplie les gains **et** les pertes. Avec un levier de 100, une baisse de 1 % efface tout le capital engagé." }
    ] },
    { t: "Ordres", c: [
      { t: "Ordre au marché", d: "Exécuté immédiatement au prix disponible." },
      { t: "Ordre limite et stop", d: "Limite : acheter plus bas ou vendre plus haut que le prix actuel. Stop : se déclenche quand le prix franchit un niveau (entrée sur cassure)." },
      { t: "Stop loss", d: "Ordre qui ferme la position à perte à un niveau fixé à l'avance : il définit le **risque** du trade." },
      { t: "Take profit", d: "Ordre qui ferme la position en gain à un niveau fixé. Un gain « flottant » qui n'a pas touché le take profit n'est pas un gain réalisé." },
      { t: "Ratio risque/rendement", d: "Distance au take profit divisée par la distance au stop. Un ratio de 1:3 n'est rentable que si le taux de réussite dépasse 25 % (hors frais).", f: "Seuil de réussite = 1 / (1 + ratio)" }
    ] },
    { t: "Gestion du risque", c: [
      { t: "Risque par trade", d: "Part du capital perdue si le stop est touché : souvent 0,5 à 2 %. C'est elle qui fixe la taille de la position, pas l'envie." },
      { t: "Espérance", d: "Gain moyen par trade : taux de réussite × gain moyen − taux d'échec × perte moyenne. Une stratégie n'a d'intérêt que si l'espérance, frais inclus, est positive." },
      { t: "Drawdown", d: "Baisse maximale du capital depuis un plus haut. Une perte de 50 % demande +100 % pour revenir à l'équilibre." },
      { t: "Série de pertes", d: "Même avec 50 % de réussite, 6 à 8 pertes d'affilée arrivent régulièrement sur quelques centaines de trades : le risque par trade doit permettre de les encaisser." }
    ] },
    { t: "Analyse", c: [
      { t: "Analyse technique", d: "Étude des graphiques de prix : tendances, supports et résistances, figures de bougies (englobante…), indicateurs. Ses règles doivent être testées statistiquement avant d'y croire." },
      { t: "Analyse fondamentale", d: "Étude des causes économiques : taux d'intérêt des banques centrales, inflation, emploi, balance commerciale. Le calendrier économique liste les annonces qui font bouger les prix." },
      { t: "Bougie japonaise", d: "Représentation d'une période : ouverture, plus haut, plus bas, clôture. Corps (ouverture-clôture) et mèches." },
      { t: "Carry trade", d: "Emprunter dans une devise à taux bas pour placer dans une devise à taux élevé ; on encaisse le différentiel de taux, mais on subit les variations de change." }
    ] },
    { t: "Méthode", c: [
      { t: "Saisonnalité", d: "Tendance d'un prix à se comporter de la même façon à la même période de l'année (ou de la semaine). À tester sur de nombreuses années, avec un test statistique et sur des données hors période : beaucoup de « saisonnalités » sont du hasard." },
      { t: "Backtest", d: "Simulation d'une règle sur les données passées, comme si on l'avait appliquée. Conditions : règle fixée **avant** le test, entrée à un prix réellement atteint, frais et spread inclus, aucune information du futur." },
      { t: "Biais du survivant et biais de sélection", d: "Ne retenir que les trades publiés, les paires qui ont marché ou les périodes favorables donne une image trop belle. On compare toujours à un **témoin** (entrées au hasard, niveaux décalés)." },
      { t: "Vérification d'un signal", d: "Pour juger un service de signaux : chaque trade doit être publié **avant** le mouvement, avec entrée, stop et objectif ; on classe chaque trade d'après ce que montrent les sources (gain, perte, non déclenché, invérifiable), sans compléter." }
    ] }
  ] }
});
