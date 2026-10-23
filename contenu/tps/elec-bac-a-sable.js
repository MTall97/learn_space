LS.ajouterTP({
  id: "elec-bac-a-sable",
  titre: "Bac à sable",
  domaine: "electricite", niveau: 1, duree: "libre",
  sim: "circuit",
  intro: "Tous les composants, une grande plaque, aucun objectif : monte ce que tu veux, mesure, casse (puis « Réparer »). Ton montage est gardé dans ce navigateur. Idées : un fusible qui protège un court-circuit, un moteur commandé par un relais et un transistor, un clignotant avec un condensateur, un pont de diodes…",
  config: { largeur: 52, hauteur: 30, schema: { compos: [], fils: [] } },
  objectifs: [],
  notions: [["elec-bases", "Fusible"], ["elec-bases", "Court-circuit"], ["elec-bases", "Loi d'Ohm"]]
});
