LS.ajouterTP({
  id: "em-06-pas-a-pas",
  titre: "Moteur pas à pas et servomoteur",
  domaine: "electromecanique", niveau: 2, duree: "20 min",
  sim: "pasAPas",
  intro: "Pour **positionner** précisément (imprimante 3D, robot, gouverne de drone), on utilise un **moteur pas à pas** (on compte les pas) ou un **servomoteur** (il mesure sa position et la corrige).",
  objectifs: [
    { texte: "Pas à pas en **pas entiers**, à l'arrêt (0 pas/s) : avance **pas à pas** jusqu'à 3 pas (270°). Observe l'ordre d'alimentation des bobines.", verif: s => s.p.mode === "pas" && s.p.seq === "complet" && s.etat.pas === 3 },
    { texte: "Passe en **demi-pas** : le rotor s'arrête aussi entre deux bobines.", verif: s => s.p.mode === "pas" && s.p.seq === "demi" && s.etat.pas % 2 === 1 },
    { texte: "**Servomoteur** : règle l'impulsion pour placer le bras à **45°** (± 3°).", verif: s => s.p.mode === "servo" && Math.abs(s.etat.angServo - 45) < 3 }
  ],
  questions: [
    { q: "Un moteur de 200 pas par tour en demi-pas : combien de positions par tour ?", choix: ["100", "200", "400"], bonne: 2 },
    { q: "Avec une PWM servo standard, une impulsion de 1,5 ms donne…", choix: ["0°", "la position du milieu (90°)", "180°"], bonne: 1 }
  ],
  notions: [["electromecanique", "Moteur pas à pas"], ["electromecanique", "Servomoteur"], ["esp32", "PWM"]]
});
