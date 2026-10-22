LS.ajouterTP({
  id: "num-01-binaire",
  titre: "Compter en binaire",
  domaine: "numerique", niveau: 1, duree: "15 min",
  sim: "binaire",
  intro: "Les ordinateurs, les microcontrôleurs et les réseaux ne manipulent que des 0 et des 1. Voici un **octet** : clique sur les bits pour former des nombres.",
  objectifs: [
    { texte: "Écris le nombre **42**.", verif: s => !s.p.signe && s.etat.bits === 42 },
    { texte: "Écris le plus grand nombre possible sur un octet.", verif: s => !s.p.signe && s.etat.bits === 255 },
    { texte: "Écris **0x3C** (hexadécimal).", verif: s => s.etat.bits === 0x3c },
    { texte: "Écris la lettre **« A »** (code ASCII 65).", verif: s => s.etat.bits === 65 },
    { texte: "En mode **signé**, écris **−1**.", verif: s => s.p.signe && s.etat.bits === 255, bravo: "En complément à deux, −1 s'écrit 11111111 : ajoute 1 et tout repasse à 0." }
  ],
  questions: [
    { q: "Combien de valeurs différentes avec 10 bits ?", choix: ["10", "100", "1 024"], bonne: 2 },
    { q: "Décaler un nombre binaire d'un cran vers la gauche revient à…", choix: ["le multiplier par 2", "lui ajouter 1", "le diviser par 2"], bonne: 0 }
  ],
  notions: [["numerique", "Binaire"], ["numerique", "Octet"], ["numerique", "Hexadécimal"], ["numerique", "Complément à deux"]]
});
