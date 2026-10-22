LS.ajouterTP({
  id: "tel-03-bande-passante",
  titre: "Bande passante et débit",
  domaine: "telecom", niveau: 3, duree: "25 min",
  sim: "bandePassante",
  intro: "On envoie 40 bits dans un câble qui se comporte comme un filtre passe-bas de **bande passante B**. Le récepteur échantillonne chaque bit et décide 0 ou 1 (seuil en pointillés). Pourquoi un vieux câble téléphonique ne peut-il pas transporter la fibre ?",
  objectifs: [
    { texte: "Avec B = 20 kHz, monte le débit jusqu'à l'apparition des **premières erreurs**.", verif: s => s.p.B >= 19.5 && s.p.B <= 20.5 && s.def.calc(s).err > 0 },
    { texte: "Trouve le **débit maximal sans erreur** pour B = 5 kHz (bruit 0,05 V).", verif: (s, m) => { if (s.p.B !== 5 || s.p.bruit !== 0.05) return false; const e = s.def.calc(s).err; if (e === 0) m.max = Math.max(m.max || 0, s.p.D); return e === 0 && s.p.D >= 9; } },
    { texte: "Avec un débit faible (5 kbit/s) et une grande bande passante, augmente le **bruit** jusqu'à provoquer des erreurs.", verif: s => s.p.D <= 6 && s.p.B >= 20 && s.def.calc(s).err > 0 }
  ],
  questions: [
    { q: "Pour augmenter le débit d'une liaison, on peut…", choix: ["augmenter la bande passante ou le rapport signal/bruit (Shannon)", "baisser la fréquence", "allonger le câble"], bonne: 0 },
    { q: "Pourquoi la fibre optique offre-t-elle des débits énormes ?", choix: ["Sa bande passante est immense (lumière à des centaines de THz) et elle est insensible aux parasites électriques", "Le verre est plus rapide que le cuivre", "Elle est plus courte"], bonne: 0 }
  ],
  notions: [["telecom-transmission", "Bande passante"], ["telecom-transmission", "Débit"], ["telecom-transmission", "Bruit"], ["telecom-transmission", "Paire torsadée"], ["telecom-transmission", "Fibre optique"]]
});
