LS.ajouterTP({
  id: "cap-03-imu",
  titre: "Gyroscope et accéléromètre : estimer un angle",
  domaine: "capteurs", niveau: 2, duree: "30 min",
  sim: "imu",
  intro: "Une centrale inertielle (type MPU6050) est posée sur une plateforme qui bascule. Trois façons d'estimer son inclinaison sont tracées : en **intégrant le gyroscope**, avec l'**accéléromètre** seul, et par **fusion** des deux (filtre complémentaire). Le calcul tourne à 200 Hz, comme dans un contrôleur de vol simple.\n\nBiais, bruit et vibrations sont réglés à des ordres de grandeur typiques d'un capteur bon marché.",
  objectifs: [
    { texte: "Règle un biais d'au moins **1 °/s** : l'angle du gyroscope intégré **dérive** de plus de **10°**.", verif: s => s.p.biais >= 1 && Math.abs(s.etat.gyroInt - s.etat.theta) > 10, bravo: "1 °/s de biais, c'est 60° de dérive par minute : l'intégration accumule toutes les erreurs." },
    { texte: "Active les **vibrations** : l'erreur efficace de l'accéléromètre seul dépasse **3°**.", verif: s => s.p.vibrations && s.etat.nbMesures > 100 && s.etat.rmsAccel > 3 },
    { texte: "Avec vibrations et un biais d'au moins 0,5 °/s, trouve un **α** qui ramène l'erreur de la fusion sous **1°**.", verif: s => s.p.vibrations && s.p.biais >= 0.5 && s.etat.nbMesures > 200 && s.etat.rmsFusion < 1, bravo: "Le gyroscope suit les mouvements rapides, l'accéléromètre empêche la dérive : chacun corrige le défaut de l'autre." },
    { texte: "Sans vibrations, mets la plateforme sur le **chariot** : quand elle passe à plat, l'accéléromètre croit qu'elle penche de plus de **10°**.", verif: s => s.p.chariot && !s.p.vibrations && s.etat.maxErrAcc > 10 }
  ],
  questions: [
    { q: "Un gyroscope a un biais de 0,2 °/s. Au bout de 5 minutes d'intégration, l'angle a dérivé de…", choix: ["0,2°", "60°", "1°"], bonne: 1, explication: "0,2 °/s × 300 s = 60°." },
    { q: "Avec α = 0,98 à 200 Hz, la constante de temps du filtre complémentaire est d'environ…", choix: ["0,25 s", "5 ms", "2 min"], bonne: 0, explication: "τ = α·dt / (1 − α) = 0,98 × 0,005 / 0,02 ≈ 0,25 s." },
    { q: "Pourquoi un drone n'utilise-t-il pas l'accéléromètre seul pour connaître son inclinaison ?", choix: ["Il est trop lent", "Les vibrations et les accélérations du vol le perturbent", "Il ne mesure pas la pesanteur"], bonne: 1 }
  ],
  notions: [["capteurs", "MPU6050 (centrale inertielle)"], ["capteurs", "Dérive"], ["capteurs", "Bruit"], ["capteurs", "Fusion de capteurs"], ["capteurs", "Filtre complémentaire"], ["drone", "Centrale inertielle (IMU)"]],
  suite: "Le filtre de Kalman fait la même chose en ajustant le poids de chaque capteur selon leurs bruits ; les contrôleurs de vol (Betaflight, ArduPilot) en utilisent des variantes."
});
