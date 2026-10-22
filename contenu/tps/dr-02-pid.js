LS.ajouterTP({
  id: "dr-02-pid",
  titre: "Tenir l'altitude avec un PID",
  domaine: "drones", niveau: 3, duree: "30 min",
  sim: "pidAltitude",
  intro: "Le drone (1 kg) doit monter à l'altitude demandée et y rester. Tu règles les trois coefficients du **régulateur PID**. Change la consigne pour provoquer des « marches » et observe la réponse.",
  objectifs: [
    { texte: "Avec seulement **Kp**, monte-le jusqu'à ce que le drone **oscille** fortement.", verif: s => s.p.ki === 0 && s.p.kd === 0 && s.p.kp >= 8 && s.etat.zmax > s.p.consigne * 1.3 },
    { texte: "Ajoute du **Kd** pour amortir : dépassement **< 10 %** sur une marche de 2 m à 6 m.", verif: (s, m) => { if (s.p.consigne === 6 && s.etat.z0 !== undefined && Math.abs(s.etat.z0 - 2) < 0.3) { const dep = (s.etat.zmax - 6) / 4; if (s.t - s.etat.tStep > 6 && Math.abs(s.etat.z - 6) < 0.1) return dep < 0.1; } return false; } },
    { texte: "Active **« batterie qui se vide »** : une **erreur statique** apparaît. Ajoute du **Ki** pour l'annuler (erreur < 5 cm).", verif: s => s.p.usure && s.p.ki > 0 && Math.abs(s.p.consigne - s.etat.z) < 0.05 && s.t - s.etat.tStep > 5 },
    { texte: "Désactive l'**anticipation** : sans Ki, le drone ne décolle même pas correctement. Trouve des réglages qui tiennent la consigne à 5 cm près.", verif: s => !s.p.anticipation && Math.abs(s.p.consigne - s.etat.z) < 0.05 && s.t - s.etat.tStep > 5 && s.p.consigne > 0 }
  ],
  questions: [
    { q: "Quel terme annule l'erreur qui persiste en régime établi ?", choix: ["P", "I", "D"], bonne: 1 },
    { q: "Un drone oscille rapidement autour de la consigne. On commence par…", choix: ["augmenter Kp", "baisser Kp ou augmenter Kd", "augmenter Ki"], bonne: 1 }
  ],
  notions: [["drone", "PID"], ["drone", "Contrôleur de vol"], ["drone", "Boucle de régulation"]]
});
