LS.ajouterCarte({
  id: "python",
  titre: "Python et la data science",
  intro: "Python est le langage de tes projets d'analyse (forex, transduction bambara). Cette carte réunit les bases du langage, l'écosystème scientifique (NumPy, pandas, matplotlib), les statistiques indispensables et les bonnes pratiques pour des analyses reproductibles.",
  racine: { t: "Python", c: [
    { t: "Bases du langage", c: [
      { t: "Variables et types", d: "Une variable est un nom qui désigne une valeur. Types de base : int (entier), float (réel), str (texte), bool (True/False), None.", ex: "prix = 1.0845\npaire = \"EURUSD\"" },
      { t: "Listes et dictionnaires", d: "**Liste** : suite ordonnée modifiable [1, 2, 3]. **Tuple** : suite non modifiable (1, 2). **Dictionnaire** : associations clé → valeur {\"EURUSD\": 1.08}. **Ensemble** : valeurs uniques {1, 2}." },
      { t: "Conditions et boucles", d: "if / elif / else pour choisir ; for pour parcourir une séquence ; while pour répéter tant qu'une condition est vraie. L'indentation (4 espaces) délimite les blocs.", ex: "for mois in range(1, 13):\n    if mois == 9:\n        print(\"septembre\")" },
      { t: "Fonctions", d: "Bloc de code nommé et réutilisable, avec paramètres et valeur de retour (def). Une bonne fonction fait une seule chose et se teste facilement.", ex: "def rendement(debut, fin):\n    return fin / debut - 1" },
      { t: "Modules et paquets", d: "On importe du code avec import. Bibliothèque standard (math, datetime, json, pathlib) ; paquets externes installés avec pip dans un **environnement virtuel** (python -m venv .venv)." },
      { t: "Fichiers et chemins", d: "pathlib.Path gère les chemins sur Windows comme sur Linux. Lire un CSV, un JSON, un JSONL (une ligne JSON par enregistrement) : open(), json.loads(), pandas.read_csv()." },
      { t: "Exceptions", d: "Erreurs levées à l'exécution (ValueError, KeyError, FileNotFoundError). try / except pour les gérer quand on sait quoi faire ; sinon, mieux vaut laisser l'erreur apparaître." }
    ] },
    { t: "Écosystème scientifique", c: [
      { t: "NumPy", d: "Tableaux numériques rapides (ndarray) et calcul vectorisé : on applique une opération à tout un tableau sans boucle.", ex: "rendements = np.diff(prix) / prix[:-1]" },
      { t: "pandas", d: "Tableaux de données étiquetés (DataFrame : lignes et colonnes, comme un tableur) et séries temporelles : lecture CSV, filtres, regroupements (groupby), fusion (merge), rééchantillonnage (resample).", ex: "df.groupby(df.index.month)[\"rendement\"].mean()" },
      { t: "matplotlib", d: "Bibliothèque de graphiques : courbes, histogrammes, nuages de points, barres. Toujours titrer, légender, nommer les axes avec leurs unités." },
      { t: "Jupyter", d: "Carnets qui mêlent code, résultats et texte : pratique pour explorer. Pour un résultat reproductible, on transforme ensuite en scripts versionnés." },
      { t: "scikit-learn", d: "Apprentissage automatique classique : régression, classification, validation croisée, pipelines de prétraitement." }
    ] },
    { t: "Statistiques", c: [
      { t: "Moyenne et médiane", d: "La moyenne est sensible aux valeurs extrêmes ; la médiane (valeur du milieu) beaucoup moins. Sur des rendements financiers, regarder les deux." },
      { t: "Écart-type", d: "Mesure de la dispersion autour de la moyenne. En finance, l'écart-type des rendements est la **volatilité**." },
      { t: "Corrélation", d: "Coefficient entre −1 et 1 qui mesure la liaison linéaire entre deux variables. Corrélation n'est pas causalité." },
      { t: "Test statistique", d: "Méthode pour décider si un effet observé (un mois en moyenne haussier) peut être dû au hasard. La **p-valeur** est la probabilité d'observer un effet au moins aussi fort si en réalité il n'y en a aucun." },
      { t: "Tests multiples", d: "Tester 12 mois × 20 paires, c'est 240 tests : au seuil de 5 %, une douzaine sortiront « significatifs » par pur hasard. Il faut corriger (Bonferroni, Benjamini-Hochberg) ou valider sur d'autres données." },
      { t: "Échantillon hors période", d: "Données mises de côté (out-of-sample) pour vérifier qu'une règle trouvée sur le passé fonctionne encore sur des données qu'elle n'a pas vues. Indispensable contre le surapprentissage." }
    ] },
    { t: "Bonnes pratiques", c: [
      { t: "Reproductibilité", d: "Un résultat doit pouvoir être recalculé par quelqu'un d'autre : scripts plutôt que manipulations à la main, versions des paquets notées (requirements.txt), données sources conservées, graine aléatoire fixée." },
      { t: "Tests automatiques", d: "Petites fonctions qui vérifient que le code donne le résultat attendu (pytest). On les lance à chaque modification." },
      { t: "Lisibilité", d: "Noms explicites, fonctions courtes, commentaires qui expliquent le pourquoi, style PEP 8 (outils : ruff, black)." }
    ] }
  ] }
});
