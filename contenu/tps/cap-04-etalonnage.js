LS.ajouterTP({
  id: "cap-04-etalonnage",
  titre: "Bruit, moyenne et étalonnage",
  domaine: "capteurs", niveau: 2, duree: "30 min",
  sim: "etalonnage",
  intro: "Une balance de cuisine à **jauge de contrainte** est lue par un **HX711** (10 mesures par seconde). Sa lecture brute vaut décalage + gain × masse + bruit, et le décalage comme le gain diffèrent de la fiche technique. Il faut donc l'**étalonner**, puis **filtrer** le bruit sans trop ralentir l'affichage.\n\nLes valeurs (décalage, gain, bruit) sont inventées mais du bon ordre de grandeur pour une cellule de 1 à 5 kg.",
  objectifs: [
    { texte: "Sans étalonnage, pose **500 g** : la balance se trompe de plus de **50 g**.", verif: s => s.etat.cal0 === null && s.p.masse === 500 && Math.abs(s.etat.erreurMoy) > 50 },
    { texte: "Fais la **tare** plateau vide, puis **étalonne** avec 500 g. Vérifie avec **200 g** : erreur moyenne inférieure à **2 g**.", verif: s => s.etat.cal0 !== null && s.etat.cal500 !== null && s.p.masse === 200 && s.etat.nbStables >= 10 && Math.abs(s.etat.erreurMoy) < 2, bravo: "Deux points suffisent pour un capteur linéaire : le zéro corrige le décalage, la masse étalon corrige le gain." },
    { texte: "Avec une **moyenne glissante** sur au moins **16** mesures, divise l'écart type affiché par plus de **3**.", verif: s => s.p.filtre === "moyenne" && s.p.N >= 16 && s.etat.nbStables >= 15 && s.etat.sigmaFilt < s.etat.sigmaBrut / 3 },
    { texte: "Passe-bas exponentiel avec **a ≤ 0,1** : change de masse et mesure un temps de réponse à 90 % de plus de **1 s**.", verif: s => s.p.filtre === "expo" && s.p.a <= 0.1 && s.etat.t90 > 1, bravo: "Plus le filtre lisse, plus il est lent : c'est le compromis de tout filtrage." }
  ],
  questions: [
    { q: "Moyenner 16 mesures indépendantes divise le bruit par…", choix: ["16", "4", "2"], bonne: 1, explication: "σ / √N = σ / 4." },
    { q: "Lecture brute : 8 400 à vide, 61 550 avec 500 g. Que vaut une lecture de 29 660 ?", choix: ["≈ 200 g", "≈ 280 g", "≈ 300 g"], bonne: 0, explication: "(29 660 − 8 400) × 500 / (61 550 − 8 400) = 21 260 × 500 / 53 150 ≈ 200 g." },
    { q: "La balance affiche 3 g plateau vide après une heure au soleil. C'est…", choix: ["du bruit", "une dérive du zéro : il faut refaire la tare", "une erreur de gain"], bonne: 1 }
  ],
  notions: [["capteurs", "Étalonnage"], ["capteurs", "Erreur de décalage (offset)"], ["capteurs", "Erreur de gain"], ["capteurs", "Justesse et fidélité"], ["capteurs", "Moyenne glissante"], ["capteurs", "Passe-bas exponentiel"], ["capteurs", "Temps de réponse"], ["capteurs", "Jauge de contrainte et HX711"]],
  suite: "Essaie l'ADC 10 bits : le bruit devient plus petit qu'un pas (≈ 2 g) et la moyenne ne gagne plus rien. On ajoute parfois exprès un peu de bruit (dithering) pour que la moyenne retrouve des détails plus fins qu'un pas."
});
