LS.ajouterTP({
  id: "dr-01-propulsion",
  titre: "Poussée, poids et autonomie",
  domaine: "drones", niveau: 1, duree: "25 min",
  sim: "propulsion", securite: "batterie",
  intro: "Concevoir un drone, c'est équilibrer **poussée**, **poids** et **énergie**. Les calculs utilisent les lois des hélices (poussée ∝ n²·D⁴, puissance ∝ n³·D⁵) avec des coefficients typiques, et la puissance de chaque moteur est plafonnée selon sa taille (≈ 900 W pour un 5 pouces, 1 500 W pour un 10 pouces) ; les valeurs sont des ordres de grandeur réalistes, pas celles d'un modèle commercial précis.",
  objectifs: [
    { texte: "Drone 5 pouces, 4S : obtiens un rapport poussée/poids d'au moins **4** (freestyle).", verif: s => s.p.helice === 5 && LS.bilanDrone(s.p).twr >= 4 },
    { texte: "Augmente la batterie jusqu'à **5 000 mAh** : l'autonomie progresse-t-elle autant que la capacité ?", verif: s => s.p.capacite >= 5000, bravo: "La batterie pèse : il faut plus de puissance pour la porter. L'autonomie plafonne." },
    { texte: "Drone de prise de vue : 10 pouces, 6S, **600 g de caméra**, au moins **15 min** d'autonomie et poussée/poids ≥ 2.", verif: s => { const k = LS.bilanDrone(s.p); return s.p.helice === 10 && s.p.cellules === 6 && s.p.charge >= 600 && k.autonomie >= 15 && k.twr >= 2; } },
    { texte: "Provoque une **surintensité** : le courant à plein gaz dépasse ce que la batterie peut fournir.", verif: s => { const k = LS.bilanDrone(s.p); return k.Imax > k.Icrete; } }
  ],
  questions: [
    { q: "Batterie 1 500 mAh, 75 C : courant maximal ?", choix: ["75 A", "112,5 A", "1,5 A"], bonne: 1, explication: "1,5 Ah × 75 = 112,5 A." },
    { q: "Moteur 2 400 KV sous 14,8 V : vitesse à vide ?", choix: ["≈ 35 500 tr/min", "≈ 2 400 tr/min", "≈ 162 tr/min"], bonne: 0 }
  ],
  notions: [["drone", "Moteur brushless"], ["drone", "KV"], ["drone", "Hélice"], ["drone", "Batterie LiPo"], ["drone", "Rapport poussée/poids"], ["drone", "Autonomie"]]
});
