LS.ajouterTP({
  id: "ia-01-neurone",
  titre: "Un neurone qui apprend",
  domaine: "ml-audio", niveau: 1, duree: "30 min",
  sim: "neurone",
  intro: "Un **neurone artificiel** fait une somme pondérée de ses entrées, ajoute un **biais**, puis passe le résultat dans une fonction en S (la **sigmoïde**) qui donne une probabilité entre 0 et 1. C'est exactement une **régression logistique**. Ici, chaque point a deux coordonnées (x, y) et une classe (bleu ou orange) : le neurone doit trouver la droite qui les sépare.\n\nTu vas d'abord régler les poids **à la main**, puis laisser la **descente de gradient** le faire, et voir où elle échoue. Les données sont générées avec une graine fixe (toujours les mêmes points).",
  objectifs: [
    { texte: "Sans lancer l'apprentissage, règle **w1, w2 et b à la main** pour classer au moins **90 %** des points séparables.",
      indice: "La frontière est perpendiculaire au vecteur (w1, w2), et la flèche pointe vers l'orange. Les oranges sont en haut à droite : essaie w1 et w2 positifs, b proche de 0.",
      verif: s => s.p.donnees === "separable" && !s.etat.aAppris && s.etat.k && s.etat.k.exactitude >= 0.9 },
    { texte: "Coche **Apprendre** (taux 0,5) : la perte doit descendre sous **0,1**. Observe les poids bouger tout seuls.",
      verif: s => s.p.donnees === "separable" && s.etat.aAppris && s.etat.k && s.etat.k.perte < 0.1,
      bravo: "Chaque pas suit la pente de la perte vers le bas : c'est tout le principe de l'entraînement, même pour un modèle à des milliards de poids." },
    { texte: "Données **qui se chevauchent**, taux d'apprentissage **≥ 20** : provoque une perte qui **rebondit** au lieu de descendre (au moins 20 hausses).",
      verif: (s, m) => { const h = s.etat.histo || []; if (s.p.donnees !== "chevauchant" || s.p.lr < 20) { m.n = 0; return false; } let n = 0; for (let i = 1; i < h.length; i++) if (h[i] > h[i - 1] + 1e-6) n++; return n >= 20; },
      bravo: "Pas trop grand : on saute par-dessus le creux de la vallée. En pratique on choisit le taux sur la validation, et on le fait souvent décroître au fil de l'entraînement." },
    { texte: "Données **XOR** : laisse apprendre au moins **300 pas**. Le neurone dépasse-t-il **80 %** ?",
      verif: s => s.p.donnees === "xor" && (s.etat.iter || 0) >= 300 && s.etat.k && s.etat.k.exactitude < 0.8,
      bravo: "Non : aucune droite ne sépare un OU exclusif. Il faut une couche cachée de neurones (un réseau) pour obtenir une frontière courbe. C'est la limite qui a freiné les recherches sur le perceptron à la fin des années 1960." }
  ],
  questions: [
    { q: "Que vaut la sigmoïde σ(z) pour z = 0 ?", choix: ["0", "0,5", "1"], bonne: 1, explication: "σ(0) = 1/(1+1) = 0,5 : c'est la frontière de décision." },
    { q: "La perte d'entraînement baisse. Peut-on en conclure que le modèle sera bon sur de nouvelles données ?", choix: ["Oui", "Non, il faut le mesurer sur des données mises de côté"], bonne: 1, explication: "C'est l'objet du TP suivant : le surapprentissage." },
    { q: "Le gradient d'un poids vaut +0,3. Pour faire baisser la perte, on…", choix: ["augmente ce poids", "diminue ce poids", "ne change rien"], bonne: 1, explication: "On va dans le sens opposé au gradient : w ← w − taux × 0,3." }
  ],
  notions: [["ml-audio", "Neurone artificiel"], ["ml-audio", "Fonction de perte"], ["ml-audio", "Descente de gradient"], ["ml-audio", "Taux d'apprentissage"], ["ml-audio", "Réseau de neurones"], ["ml-audio", "Apprentissage supervisé"]],
  suite: "Un réseau à une couche cachée de 4 neurones résout le XOR : chaque neurone trace une droite, et le neurone de sortie les combine. C'est l'idée de la rétropropagation, qui calcule le gradient couche par couche."
});
