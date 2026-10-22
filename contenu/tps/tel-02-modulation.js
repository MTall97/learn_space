LS.ajouterTP({
  id: "tel-02-modulation",
  titre: "Moduler une porteuse",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "modulation",
  intro: "Pour transmettre par radio, on « imprime » le message sur une onde **porteuse** de fréquence élevée, en faisant varier son **amplitude**, sa **fréquence** ou sa **phase** : c'est la **modulation**. Le récepteur fait l'inverse : la **démodulation**.",
  objectifs: [
    { texte: "En **AM**, monte l'indice au-delà de 1 : observe la **surmodulation**.", verif: s => s.p.type === "AM" && s.p.m > 1 },
    { texte: "Passe en **FM** : l'amplitude reste constante, seule la fréquence change.", verif: s => s.p.type === "FM" },
    { texte: "Essaie les trois modulations **numériques** (ASK, FSK, PSK) : repère comment chacune code un 0 et un 1.", verif: (s, m) => { m[s.p.type] = true; return !!(m.ASK && m.FSK && m.PSK); } }
  ],
  questions: [
    { q: "Pourquoi la radio FM est-elle moins sensible aux parasites que l'AM ?", choix: ["Les parasites modifient surtout l'amplitude, que la FM ignore", "Elle est plus puissante", "Elle utilise des fréquences plus basses"], bonne: 0 },
    { q: "Le Wi-Fi et la 4G utilisent surtout…", choix: ["l'AM", "des modulations de phase et d'amplitude combinées (QPSK, QAM)", "le morse"], bonne: 1 }
  ],
  notions: [["telecom-transmission", "Modulation"], ["telecom-transmission", "Porteuse"], ["telecom-transmission", "Analogique"], ["telecom-transmission", "Numérique"]]
});
