LS.ajouterTP({
  id: "em-05-asynchrone",
  titre: "Le moteur asynchrone triphasé",
  domaine: "electromecanique", niveau: 3, duree: "25 min",
  sim: "asynchrone",
  intro: "C'est le moteur le plus utilisé au monde : pompes, ventilateurs, compresseurs, machines-outils, et même voitures électriques. Pas de balais, pas d'aimants : un **champ tournant** créé par le triphasé entraîne un rotor en **cage d'écureuil**.",
  objectifs: [
    { texte: "À 50 Hz avec **2 paires de pôles**, quelle est la vitesse de synchronisme ? Et la vitesse réelle avec 10 N·m de charge ?", verif: s => s.p.f === 50 && s.p.p === 2 && s.p.Cr === 10 },
    { texte: "Augmente la charge à **25 N·m** : le glissement augmente, la vitesse baisse un peu.", verif: s => s.p.Cr >= 25 && s.p.Cr < 30 },
    { texte: "Dépasse le **couple maximal** : le moteur décroche.", verif: s => s.p.Cr >= 30 },
    { texte: "Avec un **variateur de fréquence**, fais tourner le moteur à environ **750 tr/min** (2 paires de pôles, charge 10 N·m).", verif: s => { const k = 60 * s.p.f / s.p.p; return s.p.p === 2 && s.p.Cr === 10 && Math.abs(k * 0.97 - 750) < 40; } }
  ],
  questions: [
    { q: "Comment inverser le sens de rotation d'un moteur triphasé ?", choix: ["Inverser deux des trois phases", "Inverser la tension", "Couper une phase"], bonne: 0 },
    { q: "Plaque d'un moteur : 1 450 tr/min à 50 Hz. Combien de paires de pôles ?", choix: ["1", "2", "4"], bonne: 1, explication: "ns = 1 500 tr/min (la vitesse réelle est un peu inférieure) → p = 2." }
  ],
  notions: [["electromecanique", "Champ tournant"], ["electromecanique", "Moteur asynchrone"], ["electromecanique", "Glissement"], ["elec-alternatif", "Triphasé"]]
});
