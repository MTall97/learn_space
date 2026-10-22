LS.ajouterTP({
  id: "meca-05-couple-puissance",
  titre: "Couple, puissance et régime",
  domaine: "moteurs", niveau: 3, duree: "20 min",
  sim: "courbesMoteur",
  intro: "Les fiches techniques donnent le **couple maxi** (en N·m, à un régime) et la **puissance maxi** (en kW ou ch, à un régime plus élevé). Les courbes sont calculées avec le même modèle de cylindre que dans les TP précédents, en tenant compte du remplissage et des frottements.",
  objectifs: [
    { texte: "Citadine essence : place le curseur au régime de **couple maximal** (± 200 tr/min).", verif: s => s.p.moteur === "citadine" && Math.abs(s.p.N - s.etat.Cmax[0]) <= 200 },
    { texte: "Même moteur : place-toi au régime de **puissance maximale**.", verif: s => s.p.moteur === "citadine" && Math.abs(s.p.N - s.etat.Pmax[0]) <= 200 },
    { texte: "Compare avec le **diesel turbo** : beaucoup de couple **à bas régime**. Et la **moto sportive** : peu de couple mais un régime très élevé.", verif: (s, m) => { m[s.p.moteur] = true; return !!(m.diesel && m.moto); } }
  ],
  questions: [
    { q: "Un moteur donne 200 N·m à 3 000 tr/min. Puissance ?", choix: ["≈ 63 kW", "≈ 600 kW", "≈ 6 kW"], bonne: 0, explication: "P = C × 2πN/60 = 200 × 314 ≈ 62 800 W." },
    { q: "1 cheval-vapeur (ch) vaut environ…", choix: ["736 W", "1 000 W", "100 W"], bonne: 0 }
  ],
  notions: [["moteur", "Couple"], ["moteur", "Puissance"], ["moteur", "Régime"]]
});
