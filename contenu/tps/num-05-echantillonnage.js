LS.ajouterTP({
  id: "num-05-echantillonnage",
  titre: "Échantillonner et quantifier",
  domaine: "numerique", niveau: 3, duree: "20 min",
  sim: "echantillonnage",
  intro: "Pour qu'un microcontrôleur (ESP32, Arduino) ou un ordinateur enregistre un son ou une tension, il faut la **numériser**. Deux réglages : à quelle **fréquence** mesurer, avec **combien de bits**.",
  objectifs: [
    { texte: "Avec un signal de 3 Hz, baisse fe jusqu'à **ne plus respecter** Shannon : la courbe rouge montre la fausse fréquence perçue.", verif: s => s.p.fe < 2 * s.p.f },
    { texte: "Trouve fe qui fait « disparaître » complètement un signal de 10 Hz (on croit mesurer 0 Hz).", verif: s => s.p.f === 10 && s.p.fe === 10 },
    { texte: "Règle 12 bits (comme l'ADC de l'ESP32) : combien de **niveaux** différents le convertisseur distingue-t-il ?", verif: s => s.p.n === 12, condition: "Règle d'abord la résolution sur 12 bits.",
      reponse: { valeur: 4096 }, aide: "Chaque bit double le nombre de niveaux.", bravo: "2¹² = 4 096 niveaux : sur 3,3 V, un pas de ≈ 0,8 mV." },
    { texte: "Signal de **7 Hz** échantillonné à **10 Hz** : quelle fausse fréquence perçois-tu (en Hz) ? Calcule, puis vérifie.", verif: s => s.p.f === 7 && s.p.fe === 10, condition: "Règle f = 7 Hz et fe = 10 Hz.",
      reponse: { valeur: 3, unite: "Hz" }, aide: "La fréquence perçue est l'écart entre f et le multiple de fe le plus proche.", bravo: "|7 − 10| = 3 Hz : c'est le repliement (aliasing)." }
  ],
  questions: [
    { q: "Pour numériser la voix au téléphone (jusqu'à 3,4 kHz), il faut au moins…", choix: ["3,4 kHz", "6,8 kHz (on utilise 8 kHz)", "44,1 kHz"], bonne: 1 },
    { q: "Chaque bit supplémentaire améliore le rapport signal/bruit de quantification d'environ…", choix: ["1 dB", "6 dB", "20 dB"], bonne: 1 }
  ],
  notions: [["numerique", "Échantillonnage"], ["numerique", "Quantification"], ["numerique", "Théorème de Shannon"], ["numerique", "CAN (ADC)"]]
});
