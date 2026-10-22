LS.ajouterTP({
  id: "ia-03-spectrogramme",
  titre: "Le spectrogramme d'un son",
  domaine: "ml-audio", niveau: 2, duree: "30 min",
  sim: "spectrogramme",
  intro: "Les modèles de reconnaissance de la parole ne lisent presque jamais l'onde sonore brute : ils regardent son **spectrogramme**, une image où l'axe horizontal est le temps, l'axe vertical la fréquence, et la couleur l'énergie. On l'obtient en découpant le son en petites fenêtres et en calculant la **transformée de Fourier** de chacune.\n\nLes sons sont synthétisés ici (aucun enregistrement réel) : une voix qui dit « a », « i », « ou » (note de 120 Hz, formants d'une voix d'homme), un sifflement, un glissando, des claquements et du bruit. Clique sur le spectrogramme pour lire le temps et la fréquence d'un point ; « Écouter » joue le son tel qu'il est échantillonné.",
  objectifs: [
    { texte: "Voix, 16 kHz : choisis une fenêtre assez longue pour **séparer les harmoniques** de la voix (résolution meilleure que **60 Hz**).",
      indice: "Résolution = fe / N. Les harmoniques sont espacées de 120 Hz.",
      verif: s => s.p.son === "voyelles" && s.p.fe / s.p.N <= 60 },
    { texte: "Pointe le **deuxième formant du « i »** (une bande claire vers 2,3 kHz, au milieu du son).",
      verif: s => { const c = s.etat.curseur; return s.p.son === "voyelles" && !!c && c.t > 0.5 && c.t < 1 && c.f > 2000 && c.f < 2600; },
      bravo: "Le « i » a un F2 très haut, le « ou » très bas : c'est surtout la position de ces bandes qui distingue les voyelles, quelle que soit la note de la voix." },
    { texte: "Claquements toutes les 25 ms : choisis une fenêtre assez **courte** (moins de **12 ms**) pour les voir séparés.",
      verif: s => s.p.son === "clics" && s.p.N / s.p.fe < 0.012,
      bravo: "Fenêtre courte : bonne précision dans le temps, mauvaise en fréquence. Les consonnes rapides (« p », « t ») demandent cette précision temporelle." },
    { texte: "Glissando, échantillonnage à **8 kHz** : observe la fréquence qui « rebondit » au-dessus de 4 kHz (**repliement**).",
      verif: s => s.p.son === "glissando" && s.p.fe === 8000,
      bravo: "Au-dessus de fe/2, une fréquence f apparaît à fe − f. C'est pour cela qu'on filtre avant d'échantillonner, et que 16 kHz suffit pour la parole (l'essentiel est sous 8 kHz)." }
  ],
  questions: [
    { q: "À 16 kHz, une fenêtre de 25 ms contient combien d'échantillons ?", choix: ["160", "400", "4 000"], bonne: 1, explication: "16 000 × 0,025 = 400." },
    { q: "Un son de téléphone est échantillonné à 8 kHz. Fréquence maximale transmise ?", choix: ["8 kHz", "4 kHz", "16 kHz"], bonne: 1, explication: "Nyquist : fe / 2 (en pratique 3,4 kHz)." },
    { q: "Pour mieux distinguer deux notes proches, on…", choix: ["raccourcit la fenêtre", "allonge la fenêtre", "baisse la fréquence d'échantillonnage"], bonne: 1 }
  ],
  notions: [["ml-audio", "Son numérique"], ["ml-audio", "Spectrogramme"], ["ml-audio", "Formants"], ["ml-audio", "Compromis temps-fréquence"], ["numerique", "Théorème de Shannon"]],
  suite: "Ajoute du bruit de fond sur la voix : les formants restent visibles un moment, puis se noient. Les systèmes de reconnaissance sont entraînés avec du bruit ajouté pour y résister."
});
