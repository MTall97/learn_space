LS.ajouterCarte({
  id: "ml-audio",
  titre: "Machine learning et audio",
  intro: "L'apprentissage automatique (machine learning) consiste à faire **apprendre** une tâche à un modèle à partir d'exemples, plutôt qu'à la programmer règle par règle. Cette carte va des notions générales jusqu'à la parole : représentation du son, reconnaissance, traduction, et surtout **évaluation honnête**.",
  racine: { t: "Machine learning", c: [
    { t: "Notions générales", c: [
      { t: "Apprentissage supervisé", d: "On apprend à partir d'exemples **annotés** (entrée → sortie attendue) : audio → transcription, image → étiquette.", tp: "ia-01-neurone" },
      { t: "Apprentissage non supervisé", d: "On cherche des structures sans étiquettes : regroupement (clustering), réduction de dimension." },
      { t: "Auto-supervisé", d: "Le modèle apprend sur des données brutes en devinant des parties masquées (wav2vec 2.0, HuBERT pour la parole) ; on l'affine ensuite sur peu de données annotées. Clé pour les langues peu dotées." },
      { t: "Entraînement, validation, test", d: "Trois ensembles séparés : **entraînement** (apprendre), **validation** (régler les choix), **test** (mesurer une seule fois à la fin). Le test ne doit jamais influencer les choix, sinon la mesure est faussée." },
      { t: "Fuite de données", d: "Quand une information du test se retrouve dans l'entraînement (même locuteur, même épisode, même phrase) : les scores sont trop beaux. D'où le découpage **par série ou par locuteur**, jamais par segment au hasard.", tp: "ia-05-fuite" },
      { t: "Plus proches voisins", d: "Classifieur très simple : pour un nouvel exemple, on regarde les k exemples d'entraînement les plus proches et on prend leur classe majoritaire. Il « retient » les données au lieu de les résumer, ce qui le rend très sensible aux doublons et aux fuites.", tp: "ia-05-fuite" },
      { t: "Surapprentissage", d: "Le modèle apprend par cœur les exemples d'entraînement (y compris leur bruit) et généralise mal. Signes : erreur d'entraînement faible, erreur de validation qui remonte.", tp: "ia-02-surapprentissage" },
      { t: "Sous-apprentissage", d: "Le modèle est trop simple pour la loi à apprendre : erreurs d'entraînement et de validation élevées et proches. Remède : un modèle plus riche, de meilleures entrées.", tp: "ia-02-surapprentissage" },
      { t: "Régularisation", d: "Pénalité ajoutée à la perte pour décourager les solutions trop compliquées (grands poids). Ridge : λ·Σw². En apprentissage profond : weight decay, dropout, arrêt précoce, augmentation de données.", f: "perte totale = perte + λ·Σ w²", tp: "ia-02-surapprentissage" }
    ] },
    { t: "Modèles", c: [
      { t: "Neurone artificiel", d: "Somme pondérée des entrées plus un biais, passée dans une fonction d'activation (sigmoïde, ReLU). Seul, il sépare les données par une droite (un hyperplan) : c'est la régression logistique.", f: "y = σ(w1·x1 + w2·x2 + b), σ(z) = 1 / (1 + e⁻ᶻ)", tp: "ia-01-neurone" },
      { t: "Réseau de neurones", d: "Empilement de couches de calculs simples (produits, additions, fonctions non linéaires) dont les **poids** sont ajustés pour réduire l'erreur. Une couche cachée suffit déjà à tracer des frontières courbes (le XOR).", tp: "ia-01-neurone" },
      { t: "Fonction de perte", d: "Nombre qui mesure l'erreur du modèle sur les exemples ; l'entraînement cherche à la rendre minimale. Classification : entropie croisée ; régression : erreur quadratique moyenne.", f: "entropie croisée = −moyenne[ y·ln p + (1−y)·ln(1−p) ]", ex: "Prédire au hasard deux classes (p = 0,5) donne ln 2 ≈ 0,69.", tp: "ia-01-neurone" },
      { t: "Descente de gradient", d: "Méthode d'optimisation : on calcule comment l'erreur varie avec chaque poids (gradient, par rétropropagation) et on fait un petit pas dans le sens qui la diminue. Le **taux d'apprentissage** règle la taille du pas.", f: "w ← w − η · ∂perte/∂w", tp: "ia-01-neurone" },
      { t: "Taux d'apprentissage", d: "Taille des pas de la descente de gradient (η). Trop petit : apprentissage très lent. Trop grand : on saute par-dessus le minimum, la perte oscille ou explose. On le fait souvent décroître au cours de l'entraînement.", tp: "ia-01-neurone" },
      { t: "Transformer", d: "Architecture fondée sur l'**attention** : chaque élément de la séquence regarde tous les autres pour décider de ce qui compte. Base des grands modèles de langue, de Whisper, de NLLB." },
      { t: "Affinage (fine-tuning)", d: "Partir d'un modèle pré-entraîné sur beaucoup de données et le spécialiser sur sa tâche avec peu d'exemples : bien moins coûteux qu'un entraînement complet." }
    ] },
    { t: "Audio", c: [
      { t: "Son numérique", d: "Suite d'échantillons de la pression acoustique : 16 kHz suffisent pour la parole (jusqu'à 8 kHz utiles), 44,1 kHz pour la musique. Mono, 16 bits.", tp: "ia-03-spectrogramme" },
      { t: "Spectrogramme", d: "Image temps × fréquence de l'énergie du son, obtenue par transformées de Fourier sur de courtes fenêtres (25 ms). Le **mel-spectrogramme** comprime les fréquences comme l'oreille : l'entrée habituelle des modèles.", tp: "ia-03-spectrogramme" },
      { t: "Compromis temps-fréquence", d: "Une fenêtre d'analyse longue sépare bien les fréquences mais brouille les instants ; une fenêtre courte fait l'inverse. Résolution en fréquence ≈ fe / N, durée de la fenêtre = N / fe.", ex: "16 kHz, 512 échantillons : 31 Hz et 32 ms.", tp: "ia-03-spectrogramme" },
      { t: "Formants", d: "Fréquences renforcées par la forme du conduit vocal (gorge, bouche, lèvres). Les deux premiers (F1, F2) suffisent presque à reconnaître une voyelle, quelle que soit la note de la voix.", ex: "« i » : F1 ≈ 270 Hz, F2 ≈ 2 300 Hz ; « a » : 730 et 1 090 Hz ; « ou » : 300 et 870 Hz (voix d'homme).", tp: "ia-03-spectrogramme" },
      { t: "Détection d'activité vocale", d: "VAD : repérer les passages où quelqu'un parle, pour découper l'audio en segments et ignorer silences et musique." },
      { t: "Reconnaissance de la parole", d: "ASR : audio → texte dans la même langue. Mesurée par le **taux d'erreur sur les mots** (WER)." },
      { t: "Traduction de la parole", d: "Audio d'une langue → texte (ou parole) dans une autre. **En cascade** : reconnaissance puis traduction de texte (les erreurs s'additionnent). **Directe** (bout en bout) : un seul modèle, utile quand la langue source s'écrit peu ou mal." }
    ] },
    { t: "Évaluation", c: [
      { t: "WER et CER", d: "Taux d'erreur sur les mots (ou caractères) : (substitutions + suppressions + insertions) / nombre de mots de référence. Plus bas = mieux. Peut dépasser 100 % (insertions).", f: "WER = (S + D + I) / N", tp: "ia-04-evaluation" },
      { t: "Distance d'édition", d: "Nombre minimal de substitutions, suppressions et insertions pour transformer une suite en une autre (distance de Levenshtein), calculée par programmation dynamique. Base du WER et du CER.", tp: "ia-04-evaluation" },
      { t: "BLEU et chrF", d: "Scores automatiques de traduction qui comparent les mots (BLEU) ou les caractères (chrF) avec une traduction de référence. Utiles pour suivre des progrès, insuffisants pour juger le **sens**.", tp: "ia-04-evaluation" },
      { t: "Évaluation humaine", d: "Des personnes qui comprennent les deux langues jugent si le sens est rendu. Seule mesure fiable de la qualité réelle d'une traduction ; on la fait sur un jeu de test fixe et équilibré.", tp: "ia-04-evaluation" },
      { t: "Jeu de test de référence", d: "Ensemble d'exemples validés à la main, jamais filtré par un score d'un des systèmes comparés (sinon on avantage ce système), séparé de l'entraînement par série et par producteur." },
      { t: "Données synthétiques", d: "Données produites par un modèle (traduction automatique d'un texte, voix de synthèse) : utiles pour entraîner, à **marquer** comme telles, et à exclure des jeux de test." }
    ] }
  ] }
});
