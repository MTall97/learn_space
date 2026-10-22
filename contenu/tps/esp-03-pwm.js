LS.ajouterTP({
  id: "esp-03-pwm",
  titre: "Varier la luminosité : la PWM",
  domaine: "esp32", niveau: 2, duree: "15 min",
  sim: "esp32", config: { p: { mode: "pwm" } },
  intro: "Pour faire varier une luminosité ou la vitesse d'un moteur, on ne change pas la tension : on **hache** le signal. Le **rapport cyclique** est la part du temps où la sortie est à 3,3 V.",
  objectifs: [
    { texte: "Règle la LED à **25 %** : quelle valeur écrit-on avec 8 bits ?", verif: s => s.p.rapport === 25 && s.p.resol === 8 },
    { texte: "Passe en **10 bits** : la même luminosité demande une autre valeur.", verif: s => s.p.resol === 10 },
    { texte: "En **16 bits**, monte la fréquence jusqu'à l'**erreur** : fréquence × 2^résolution dépasse 80 MHz.", verif: s => s.p.resol === 16 && s.etat.erreur },
    { texte: "Règle une PWM de servomoteur : **50 Hz**, 16 bits, impulsion de 1,5 ms (rapport cyclique ≈ 7,5 %, arrondi à 8 %).", verif: s => Math.abs(s.p.freq - 50) <= 2 && s.p.resol === 16 && s.p.rapport === 8 }
  ],
  questions: [
    { q: "À 50 % de rapport cyclique sur 3,3 V, la tension moyenne vaut…", choix: ["3,3 V", "1,65 V", "0 V"], bonne: 1 },
    { q: "Pourquoi utiliser une fréquence élevée (plusieurs kHz) pour une LED ?", choix: ["Pour que l'œil ne voie pas de scintillement", "Pour la faire chauffer", "Pour économiser la batterie"], bonne: 0 }
  ],
  notions: [["esp32", "PWM"], ["esp32", "LEDC"], ["esp32", "Rapport cyclique"]]
});
