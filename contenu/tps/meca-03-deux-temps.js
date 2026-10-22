LS.ajouterTP({
  id: "meca-03-deux-temps",
  titre: "Le moteur 2 temps (moto, scooter)",
  domaine: "moteurs", niveau: 2, duree: "20 min",
  sim: "moteur2t",
  intro: "Mobylettes, tronçonneuses, motos de cross, hors-bord : le **2 temps** réalise admission, compression, combustion et échappement en **un seul tour**. Il n'a pas de soupapes : le piston découvre des **lumières** dans le cylindre. Le carter, étanche, sert de pompe pour le mélange.",
  objectifs: [
    { texte: "Mets en pause quand **les transferts et l'échappement sont ouverts en même temps** (balayage).",
      verif: s => !s.enMarche && s.etat.th > 130 && s.etat.th < 230 },
    { texte: "Augmente la hauteur de la lumière d'échappement à **40 %** : l'échappement s'ouvre plus tôt (secteur gris plus grand).",
      verif: s => s.p.echap >= 40 }
  ],
  questions: [
    { q: "Combien de temps moteurs par tour de vilebrequin dans un 2 temps ?", choix: ["0,5", "1", "2"], bonne: 1 },
    { q: "Comment est lubrifié un moteur 2 temps classique ?", choix: ["Par un carter d'huile comme un 4 temps", "Par de l'huile mélangée à l'essence", "Il n'est pas lubrifié"], bonne: 1 },
    { q: "Pourquoi le 2 temps pollue-t-il davantage ?", choix: ["Une partie du mélange frais part directement à l'échappement et l'huile brûle", "Il tourne plus vite", "Il n'a pas de bougie"], bonne: 0 }
  ],
  notions: [["moteur", "Cycle 2 temps"], ["moteur", "Lumières et transferts"], ["moteur", "Lubrification"]]
});
