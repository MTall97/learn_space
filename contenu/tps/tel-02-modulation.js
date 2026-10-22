LS.ajouterTP({
  id: "tel-02-modulation",
  titre: "Moduler une porteuse",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "modulation",
  intro: "Pour transmettre par radio, on « imprime » le message sur une onde **porteuse** de fréquence élevée, en faisant varier son **amplitude**, sa **fréquence** ou sa **phase** : c'est la **modulation**. Le récepteur fait l'inverse : la **démodulation**.",
  objectifs: [
    { texte: "En **AM**, monte l'indice au-delà de 1 : observe la **surmodulation**.", verif: s => s.p.type === "AM" && s.p.m > 1 },
    { texte: "Passe en **FM** : l'amplitude reste constante, seule la fréquence change.", verif: s => s.p.type === "FM" },
    { texte: "Passe en **FSK** : le bit 1 est-il codé par la fréquence **haute** ou **basse** ?", verif: s => s.p.type === "FSK", condition: "Passe d'abord en FSK.",
      saisie: v => /haut|aigu|elev/.test(LS.normaliserReponse(v)) && !/bas/.test(LS.normaliserReponse(v)), bravo: "Les bits 1 font des oscillations plus serrées : fréquence haute." },
    { texte: "Passe en **PSK** : de combien de **degrés** la phase de la porteuse saute-t-elle quand le bit change ?", verif: s => s.p.type === "PSK", condition: "Passe d'abord en PSK.",
      reponse: { valeur: 180, unite: "°" }, aide: "Regarde le signal modulé au moment où le bit change : la sinusoïde se retourne.", bravo: "Un saut de 180° (inversion) : c'est la BPSK. La QPSK utilise 4 phases (90° d'écart) pour 2 bits à la fois." },
    { texte: "En **AM**, message à **3 Hz** : quelle **largeur de bande** occupe le signal (en Hz) ? Calcule-la avant de lire la mesure.", verif: s => s.p.type === "AM" && s.p.fm === 3, condition: "Règle AM et un message de 3 Hz.",
      reponse: { valeur: 6, unite: "Hz" }, aide: "En AM, deux bandes latérales : fc − fm et fc + fm.", bravo: "B = 2 × fm : la voix (≈ 4,5 kHz) occupe 9 kHz en radio AM." }
  ],
  questions: [
    { q: "Pourquoi la radio FM est-elle moins sensible aux parasites que l'AM ?", choix: ["Les parasites modifient surtout l'amplitude, que la FM ignore", "Elle est plus puissante", "Elle utilise des fréquences plus basses"], bonne: 0 },
    { q: "Le Wi-Fi et la 4G utilisent surtout…", choix: ["l'AM", "des modulations de phase et d'amplitude combinées (QPSK, QAM)", "le morse"], bonne: 1 }
  ],
  notions: [["telecom-transmission", "Modulation"], ["telecom-transmission", "Porteuse"], ["telecom-transmission", "Analogique"], ["telecom-transmission", "Numérique"]]
});
