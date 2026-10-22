LS.ajouterTP({
  id: "num-05-echantillonnage",
  titre: "Échantillonner et quantifier",
  domaine: "numerique", niveau: 3, duree: "20 min",
  sim: "echantillonnage",
  intro: "Pour qu'un microcontrôleur (ESP32, Arduino) ou un ordinateur enregistre un son ou une tension, il faut la **numériser**. Deux réglages : à quelle **fréquence** mesurer, avec **combien de bits**.",
  objectifs: [
    { texte: "Avec un signal de 3 Hz, baisse fe jusqu'à **ne plus respecter** Shannon : la courbe rouge montre la fausse fréquence perçue.", verif: s => s.p.fe < 2 * s.p.f },
    { texte: "Trouve fe qui fait « disparaître » complètement un signal de 10 Hz (on croit mesurer 0 Hz).", verif: s => s.p.f === 10 && s.p.fe === 10 },
    { texte: "Avec 12 bits (comme l'ADC de l'ESP32), combien de niveaux ? Règle-le.", verif: s => s.p.n === 12 }
  ],
  questions: [
    { q: "Pour numériser la voix au téléphone (jusqu'à 3,4 kHz), il faut au moins…", choix: ["3,4 kHz", "6,8 kHz (on utilise 8 kHz)", "44,1 kHz"], bonne: 1 },
    { q: "Chaque bit supplémentaire améliore le rapport signal/bruit de quantification d'environ…", choix: ["1 dB", "6 dB", "20 dB"], bonne: 1 }
  ],
  notions: [["numerique", "Échantillonnage"], ["numerique", "Quantification"], ["numerique", "Théorème de Shannon"], ["numerique", "CAN (ADC)"]]
});
