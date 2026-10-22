LS.ajouterTP({
  id: "dr-03-mixage",
  titre: "Mixage des moteurs : roulis, tangage, lacet",
  domaine: "drones", niveau: 2, duree: "20 min",
  sim: "mixage",
  intro: "Les manches de la radiocommande donnent 4 ordres (gaz, roulis, tangage, lacet). Le **contrôleur de vol** les traduit en 4 vitesses de moteurs : c'est le **mixage**. Dans cette simulation : quadricoptère en X, hélices avant gauche et arrière droite dans le sens horaire (↻), les deux autres dans le sens antihoraire (↺).",
  objectifs: [
    { texte: "Trouve les **gaz de vol stationnaire** : l'altitude ne bouge plus (vitesse verticale ≈ 0).", verif: s => Math.abs(s.p.gaz - 50) <= 1 && Math.abs(s.etat.vz) < 0.05 },
    { texte: "Avance (**tangage avant**) : quels moteurs accélèrent ?", verif: s => s.p.tangage >= 30 && Math.abs(s.p.roulis) < 5 },
    { texte: "Tourne sur place vers la **droite** (lacet) : quels moteurs accélèrent, et pourquoi ?", verif: s => s.p.lacet >= 30 && Math.abs(s.p.tangage) < 5 && Math.abs(s.p.roulis) < 5 },
    { texte: "Simule une **panne** de moteur : pourquoi le drone part-il en rotation ?", verif: s => s.p.panne >= 0 }
  ],
  questions: [
    { q: "Pourquoi deux hélices tournent-elles dans un sens et deux dans l'autre ?", choix: ["Pour annuler le couple de réaction et ne pas tourner sur soi-même", "Pour faire moins de bruit", "Par esthétique"], bonne: 0 },
    { q: "Pour aller à gauche, le contrôleur…", choix: ["accélère les moteurs de droite", "accélère les moteurs de gauche", "accélère tous les moteurs"], bonne: 0 }
  ],
  notions: [["drone", "Mixage"], ["drone", "Roulis, tangage, lacet"], ["drone", "Couple de réaction"], ["drone", "Radiocommande"]]
});
