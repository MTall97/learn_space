LS.ajouterTP({
  id: "meca-04-multicylindre",
  titre: "Plusieurs cylindres : ordre d'allumage",
  domaine: "moteurs", niveau: 3, duree: "20 min",
  sim: "multicylindre",
  intro: "Un monocylindre (scooter, moto trail) « cogne » : un seul temps moteur tous les deux tours. Un 4 cylindres en ligne a un temps moteur tous les **demi-tours**, dans l'**ordre d'allumage 1-3-4-2**. Le graphe montre le couple instantané de chaque cylindre (gris) et leur somme (orange).",
  config: { p: { n: 1 } },
  objectifs: [
    { texte: "Avec **1 cylindre** à 1 000 tr/min, regarde l'irrégularité de vitesse, puis augmente l'inertie du volant jusqu'à passer **sous 5 %**.",
      verif: s => s.p.n === 1 && s.p.regime <= 1100 && s.etat.irreg < 0.05 },
    { texte: "Remets le volant à 0,1 kg·m² et passe à **4 cylindres** : l'irrégularité baisse sans alourdir le volant.",
      verif: s => s.p.n === 4 && Math.abs(s.p.volant - 0.1) < 0.011 },
    { texte: "Monte le régime à **3 000 tr/min** : l'irrégularité diminue encore (elle varie comme 1/ω²).",
      verif: s => s.p.regime >= 3000 && s.p.n >= 2 }
  ],
  questions: [
    { q: "Dans un 4 cylindres 4 temps, un temps moteur a lieu tous les…", choix: ["720°", "360°", "180°"], bonne: 2 },
    { q: "À quoi sert le volant moteur ?", choix: ["Stocker l'énergie cinétique et régulariser la rotation", "Refroidir le moteur", "Démarrer la voiture"], bonne: 0 }
  ],
  notions: [["moteur", "Ordre d'allumage"], ["moteur", "Volant moteur"], ["moteur", "Vilebrequin"]]
});
