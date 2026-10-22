LS.ajouterCarte({
  id: "ml-audio",
  titre: "Machine learning et audio",
  intro: "L'apprentissage automatique (machine learning) consiste à faire **apprendre** une tâche à un modèle à partir d'exemples, plutôt qu'à la programmer règle par règle. Cette carte va des notions générales jusqu'à la parole : représentation du son, reconnaissance, traduction, et surtout **évaluation honnête**.",
  racine: { t: "Machine learning", c: [
    { t: "Notions générales", c: [
      { t: "Apprentissage supervisé", d: "On apprend à partir d'exemples **annotés** (entrée → sortie attendue) : audio → transcription, image → étiquette." },
      { t: "Apprentissage non supervisé", d: "On cherche des structures sans étiquettes : regroupement (clustering), réduction de dimension." },
      { t: "Auto-supervisé", d: "Le modèle apprend sur des données brutes en devinant des parties masquées (wav2vec 2.0, HuBERT pour la parole) ; on l'affine ensuite sur peu de données annotées. Clé pour les langues peu dotées." },
      { t: "Entraînement, validation, test", d: "Trois ensembles séparés : **entraînement** (apprendre), **validation** (régler les choix), **test** (mesurer une seule fois à la fin). Le test ne doit jamais influencer les choix, sinon la mesure est faussée." },
      { t: "Fuite de données", d: "Quand une information du test se retrouve dans l'entraînement (même locuteur, même épisode, même phrase) : les scores sont trop beaux. D'où le découpage **par série ou par locuteur**, jamais par segment au hasard." },
      { t: "Surapprentissage", d: "Le modèle apprend par cœur les exemples d'entraînement (y compris leur bruit) et généralise mal. Signes : erreur d'entraînement faible, erreur de validation qui remonte." }
    ] },
    { t: "Modèles", c: [
      { t: "Réseau de neurones", d: "Empilement de couches de calculs simples (produits, additions, fonctions non linéaires) dont les **poids** sont ajustés pour réduire l'erreur." },
      { t: "Descente de gradient", d: "Méthode d'optimisation : on calcule comment l'erreur varie avec chaque poids (gradient, par rétropropagation) et on fait un petit pas dans le sens qui la diminue. Le **taux d'apprentissage** règle la taille du pas." },
      { t: "Transformer", d: "Architecture fondée sur l'**attention** : chaque élément de la séquence regarde tous les autres pour décider de ce qui compte. Base des grands modèles de langue, de Whisper, de NLLB." },
      { t: "Affinage (fine-tuning)", d: "Partir d'un modèle pré-entraîné sur beaucoup de données et le spécialiser sur sa tâche avec peu d'exemples : bien moins coûteux qu'un entraînement complet." }
    ] },
    { t: "Audio", c: [
      { t: "Son numérique", d: "Suite d'échantillons de la pression acoustique : 16 kHz suffisent pour la parole (jusqu'à 8 kHz utiles), 44,1 kHz pour la musique. Mono, 16 bits." },
      { t: "Spectrogramme", d: "Image temps × fréquence de l'énergie du son, obtenue par transformées de Fourier sur de courtes fenêtres (25 ms). Le **mel-spectrogramme** comprime les fréquences comme l'oreille : l'entrée habituelle des modèles." },
      { t: "Détection d'activité vocale", d: "VAD : repérer les passages où quelqu'un parle, pour découper l'audio en segments et ignorer silences et musique." },
      { t: "Reconnaissance de la parole", d: "ASR : audio → texte dans la même langue. Mesurée par le **taux d'erreur sur les mots** (WER)." },
      { t: "Traduction de la parole", d: "Audio d'une langue → texte (ou parole) dans une autre. **En cascade** : reconnaissance puis traduction de texte (les erreurs s'additionnent). **Directe** (bout en bout) : un seul modèle, utile quand la langue source s'écrit peu ou mal." }
    ] },
    { t: "Évaluation", c: [
      { t: "WER et CER", d: "Taux d'erreur sur les mots (ou caractères) : (substitutions + suppressions + insertions) / nombre de mots de référence. Plus bas = mieux." },
      { t: "BLEU et chrF", d: "Scores automatiques de traduction qui comparent les mots (BLEU) ou les caractères (chrF) avec une traduction de référence. Utiles pour suivre des progrès, insuffisants pour juger le **sens**." },
      { t: "Évaluation humaine", d: "Des personnes qui comprennent les deux langues jugent si le sens est rendu. Seule mesure fiable de la qualité réelle d'une traduction ; on la fait sur un jeu de test fixe et équilibré." },
      { t: "Jeu de test de référence", d: "Ensemble d'exemples validés à la main, jamais filtré par un score d'un des systèmes comparés (sinon on avantage ce système), séparé de l'entraînement par série et par producteur." },
      { t: "Données synthétiques", d: "Données produites par un modèle (traduction automatique d'un texte, voix de synthèse) : utiles pour entraîner, à **marquer** comme telles, et à exclure des jeux de test." }
    ] }
  ] }
});
