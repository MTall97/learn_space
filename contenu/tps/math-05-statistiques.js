LS.ajouterTP({
  id: "math-05-statistiques",
  titre: "Statistiques et probabilités",
  domaine: "maths", niveau: 2, duree: "35 min",
  sim: "statistiques",
  intro: "Le hasard a des lois. Sur un tirage, on ne peut rien prédire ; sur des milliers, la **moyenne** se stabilise et la **dispersion** se mesure. Ces outils servent à juger une mesure bruitée, un modèle de machine learning ou une stratégie de trading.\n\nLes tirages viennent d'un générateur pseudo-aléatoire : la même **graine** redonne les mêmes tirages, comme dans une expérience reproductible.",
  objectifs: [
    { texte: "Lance un dé au moins **1 000 fois** : la moyenne s'approche de 3,5 (à 0,1 près).", verif: s => s.p.exp === "de" && s.etat.n >= 1000 && Math.abs(LS.resumeStats(s).moyenne - 3.5) < 0.1, bravo: "Loi des grands nombres : la moyenne observée tend vers l'espérance (1 + 2 + … + 6) / 6 = 3,5." },
    { texte: "Somme de deux dés, au moins **500 tirages** : quelle somme sort le plus souvent ?", verif: s => { if (s.p.exp !== "deuxdes" || s.etat.n < 500) return false; const t = Object.entries(s.etat.comptes).sort((a, b) => b[1] - a[1])[0]; return t && t[0] === "7"; }, bravo: "7 : 6 combinaisons sur 36 (1+6, 2+5, 3+4…). L'histogramme est un triangle, alors que chaque dé seul est uniforme." },
    { texte: "Loi normale de moyenne **50** et d'écart type **10**, au moins **2 000 tirages** : quelle part des valeurs tombe entre 40 et 60 ?", verif: s => s.p.exp === "gauss" && s.p.mu === 50 && s.p.sigma === 10 && s.etat.n >= 2000, bravo: "Environ 68 %. À ±2σ (30 à 70) on aurait 95 %." },
    { texte: "Monte jusqu'à **10 000 tirages** (bouton « + 1 000 » ou vitesse) : comment évolue l'intervalle de confiance ?", verif: s => s.p.exp !== "nuage" && s.etat.n >= 10000, bravo: "Il rétrécit comme 1/√n : 100 fois plus de tirages, 10 fois plus précis." },
    { texte: "Nuage de points : corrélation réelle **0,8** et au moins **200 points**. Le r observé est-il proche de 0,8 ?", verif: s => s.p.exp === "nuage" && Math.abs(s.p.rho - 0.8) < 0.01 && Math.round(s.p.npts) >= 200 && Math.abs(s.etat.reg.r - 0.8) < 0.08, bravo: "Oui. Refais-le avec 20 points et plusieurs graines : r varie beaucoup. Une corrélation sur peu de données peut être un hasard." },
    { texte: "Mets ρ = **0** avec seulement **10 à 20 points** et change la graine jusqu'à observer |r| > **0,4** : une corrélation « trouvée » par hasard.", verif: s => s.p.exp === "nuage" && Math.abs(s.p.rho) < 0.01 && Math.round(s.p.npts) <= 20 && Math.abs(s.etat.reg.r) > 0.4, bravo: "Aucun lien réel, et pourtant les points semblent alignés. C'est le piège des backtests sur peu de trades et des études sur petits échantillons." }
  ],
  questions: [
    { q: "On mesure 100 fois une tension bruitée (σ = 20 mV). Incertitude typique sur la moyenne ?", choix: ["20 mV", "2 mV", "0,2 mV"], bonne: 1, explication: "σ/√n = 20 / √100 = 2 mV (pour un bruit aléatoire et indépendant)." },
    { q: "Une stratégie gagne 1,5R avec 45 % de chances et perd 1R sinon. Espérance par trade ?", choix: ["+0,125R", "−0,1R", "+0,45R"], bonne: 0, explication: "0,45 × 1,5 − 0,55 × 1 = 0,675 − 0,55 = +0,125R." },
    { q: "r = 0,9 entre deux grandeurs prouve que l'une cause l'autre.", choix: ["Vrai", "Faux"], bonne: 1 }
  ],
  notions: [["maths", "Moyenne"], ["maths", "Variance et écart type"], ["maths", "Loi normale"], ["maths", "Intervalle de confiance"], ["maths", "Régression linéaire"], ["maths", "Corrélation et causalité"], ["maths", "Espérance"], ["maths", "Loi des grands nombres"], ["maths", "Probabilité"]],
  suite: "Ces notions reviennent dans la carte « Machine learning et audio » (découpage entraînement / test, surapprentissage) et dans la carte « Finance et trading » (backtest)."
});
