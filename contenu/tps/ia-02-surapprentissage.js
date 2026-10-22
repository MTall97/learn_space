LS.ajouterTP({
  id: "ia-02-surapprentissage",
  titre: "Surapprentissage",
  domaine: "ml-audio", niveau: 2, duree: "30 min",
  sim: "surapprentissage",
  intro: "Une loi cachée (courbe verte) produit des mesures **bruitées** (points bleus). On l'approche par un polynôme dont on choisit le **degré** : plus il est élevé, plus le modèle a de paramètres et peut se tordre. Un second jeu de **300 points de validation**, jamais vus pendant l'ajustement, mesure la vraie qualité.\n\nL'erreur est la racine de l'erreur quadratique moyenne (même unité que les mesures). On ne peut pas descendre durablement sous le niveau du **bruit** : c'est l'erreur irréductible. Les polynômes sont ajustés par moindres carrés (base de Legendre, numériquement stable jusqu'au degré 15).",
  objectifs: [
    { texte: "Avec **20 exemples** et un bruit de **0,30**, trouve le degré qui donne la **plus petite erreur de validation**.",
      indice: "Regarde la courbe rouge du graphe de droite : son point le plus bas. Ce n'est pas le degré qui colle le mieux aux points bleus.",
      verif: s => s.p.n === 20 && Math.abs(s.p.bruit - 0.3) < 0.005 && s.p.lambda === 0 && s.etat.k && s.p.degre === s.etat.k.meilleur },
    { texte: "Provoque un **surapprentissage net** : erreur de validation plus de **5 fois** l'erreur d'entraînement (moins de 20 exemples).",
      verif: s => { const k = s.etat.k; if (!k || s.p.n >= 20) return false; const r = k.res[s.p.degre - 1]; return r.val > 5 * r.train; },
      bravo: "Le polynôme passe presque par chaque point bleu, y compris leur bruit, et part dans tous les sens entre eux. Avec autant de paramètres que d'exemples, il peut tout apprendre par cœur." },
    { texte: "Garde un degré **≥ 12** mais monte à **150 exemples ou plus** : l'erreur de validation redescend près du bruit (moins de 1,25 × le bruit).",
      verif: s => { const k = s.etat.k; if (!k || s.p.n < 150 || s.p.degre < 12 || s.p.bruit < 0.05) return false; return k.res[s.p.degre - 1].val < 1.25 * s.p.bruit; },
      bravo: "Plus de données : le même modèle complexe ne peut plus suivre le bruit de chaque point. C'est pourquoi les grands modèles ont besoin d'énormément de données." },
    { texte: "Revenue à **15 exemples**, degré **≥ 12** : trouve une **régularisation** qui ramène l'erreur de validation sous **0,5**.",
      verif: s => { const k = s.etat.k; return !!k && s.p.n <= 15 && s.p.degre >= 12 && s.p.lambda > 0 && k.res[s.p.degre - 1].val < 0.5; },
      bravo: "La régularisation pénalise les grands coefficients : le modèle garde sa liberté mais préfère les courbes calmes. En apprentissage profond, on retrouve la même idée (weight decay, dropout, arrêt précoce)." }
  ],
  questions: [
    { q: "Erreur d'entraînement 0,02, erreur de validation 0,9 : diagnostic ?", choix: ["Sous-apprentissage", "Surapprentissage", "Modèle parfait"], bonne: 1 },
    { q: "Pourquoi ne pas choisir le degré sur le jeu de test ?", choix: ["Parce que c'est plus lent", "Parce que le test servirait alors à régler le modèle, et ne mesurerait plus sa vraie qualité"], bonne: 1, explication: "On règle sur la validation et on ne regarde le test qu'une fois à la fin." },
    { q: "Erreurs d'entraînement et de validation toutes deux élevées et proches : que faire ?", choix: ["Un modèle plus complexe", "Plus de régularisation", "Moins de données"], bonne: 0, explication: "C'est du sous-apprentissage : le modèle est trop simple pour la loi." }
  ],
  notions: [["ml-audio", "Surapprentissage"], ["ml-audio", "Sous-apprentissage"], ["ml-audio", "Entraînement, validation, test"], ["ml-audio", "Régularisation"]],
  suite: "Clique sur « Nouveau tirage » plusieurs fois avec 15 exemples et un degré 8 : la courbe change énormément d'un tirage à l'autre. C'est la **variance** d'un modèle trop complexe."
});
