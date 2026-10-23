LS.ajouterTP({
  id: "em-05-asynchrone",
  titre: "Le moteur asynchrone triphasé",
  domaine: "electromecanique", niveau: 3, duree: "25 min",
  sim: "asynchrone",
  intro: "C'est le moteur le plus utilisé au monde : pompes, ventilateurs, compresseurs, machines-outils, et même voitures électriques. Pas de balais, pas d'aimants : un **champ tournant** créé par le triphasé entraîne un rotor en **cage d'écureuil**.",
  objectifs: [
    { texte: "À 50 Hz avec **2 paires de pôles**, quelle est la vitesse de synchronisme ? Et la vitesse réelle avec 10 N·m de charge ?", verif: s => s.p.f === 50 && s.p.p === 2 && s.p.Cr === 10 && s.etat.w > 100 },
    { texte: "Moteur lancé, augmente la charge à **25 N·m** : le glissement augmente, la vitesse baisse un peu.", verif: s => s.p.f === 50 && s.p.Cr >= 25 && s.p.Cr < 30 && s.etat.w > 100 },
    { texte: "Dépasse le **couple maximal** : le moteur décroche.", verif: s => { const r = LS.regimeAsynchrone(s.p.f, s.p.p, s.p.Cr, true); return s.p.Cr >= r.Cmax && s.etat.w < 1; } },
    { texte: "Charge à **25 N·m**, moteur **à l'arrêt** (bouton « Arrêter puis redémarrer ») : il ne redémarre pas, alors qu'il portait cette charge une fois lancé. Lis le couple de démarrage dans les mesures.", verif: s => s.p.f === 50 && s.p.Cr >= 22 && s.p.Cr < 31 && s.etat.w < 0.5,
      bravo: "Le couple de démarrage (≈ 21 N·m) est plus faible que le couple maximal (≈ 31 N·m). Une pompe ou un convoyeur chargé peut donc ne pas démarrer : on démarre à vide, ou avec un variateur qui baisse la fréquence (le couple de démarrage remonte)." },
    { texte: "Avec un **variateur de fréquence**, fais tourner le moteur à environ **750 tr/min** (2 paires de pôles, charge 10 N·m).", verif: s => s.p.p === 2 && s.p.Cr === 10 && Math.abs(s.etat.w * 60 / (2 * Math.PI) - 750) < 25 }
  ],
  questions: [
    { q: "Comment inverser le sens de rotation d'un moteur triphasé ?", choix: ["Inverser deux des trois phases", "Inverser la tension", "Couper une phase"], bonne: 0 },
    { q: "Un moteur asynchrone porte une charge de 25 N·m en marche, mais ne démarre pas avec cette charge. Pourquoi ?", choix: ["Son couple de démarrage est plus faible que son couple maximal", "Il manque une phase", "Le glissement est nul à l'arrêt"], bonne: 0, explication: "À l'arrêt, g = 1 : le couple vaut le couple de démarrage, souvent 60 à 80 % du couple maximal pour une cage simple, plus avec une double cage." },
    { q: "Plaque d'un moteur : 1 450 tr/min à 50 Hz. Combien de paires de pôles ?", choix: ["1", "2", "4"], bonne: 1, explication: "ns = 1 500 tr/min (la vitesse réelle est un peu inférieure) → p = 2." }
  ],
  notions: [["electromecanique", "Champ tournant"], ["electromecanique", "Moteur asynchrone"], ["electromecanique", "Glissement"], ["elec-alternatif", "Triphasé"]]
});
