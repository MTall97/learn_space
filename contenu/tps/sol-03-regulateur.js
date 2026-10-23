LS.ajouterTP({
  id: "sol-03-regulateur",
  titre: "Régulateur PWM ou MPPT",
  domaine: "solaire", niveau: 2, duree: "25 min",
  sim: "regulateurSolaire", securite: "batterie",
  intro: "Le même panneau charge une batterie 12 V à travers un régulateur **PWM** (interrupteur) ou **MPPT** (convertisseur qui suit le point de puissance maximale, rendement 96 %, 100 V et 30 A maximum). Le graphe montre où chaque régulateur place le panneau sur sa courbe ; les barres donnent l'énergie récupérée sur une journée claire (éclairement en cloche de 6 h à 18 h, batterie supposée à tension fixe).",
  objectifs: [
    { texte: "Panneau **36 cellules**, à 25 °C : passe du PWM au **MPPT** et gagne **au moins 8 %** de puissance.",
      verif: s => { const k = s.def.calcul(s); return s.p.module === "m36" && s.p.serie === 1 && s.p.type === "mppt" && k.mppt.P >= 1.08 * k.pwm.P; },
      bravo: "Le PWM tire le panneau à ≈ 13 V alors que son MPP est vers 16-17 V : la différence de tension est perdue." },
    { texte: "Par un **matin froid** (air ≤ 0 °C), le gain du MPPT dépasse **20 %**.",
      verif: s => { const k = s.def.calcul(s); return s.p.module === "m36" && s.p.serie === 1 && s.p.Ta <= 0 && k.mppt.P >= 1.2 * k.pwm.P; },
      bravo: "Au froid, la tension du MPP monte, mais le PWM reste collé à la batterie. Par forte chaleur, au contraire, le gain du MPPT devient faible." },
    { texte: "Branche un panneau **60 cellules** sur le **PWM** : plus de **la moitié** de sa puissance est perdue.",
      verif: s => { const k = s.def.calcul(s); return s.p.module === "m60" && s.p.type === "pwm" && k.pwm.P < 0.5 * k.mppt.Pmp; },
      bravo: "Le panneau travaille à 13 V au lieu de 31 V. Les panneaux de 60/72 cellules, les moins chers au watt, demandent un MPPT." },
    { texte: "MPPT avec des 60 cellules en série : à partir de combien de panneaux la tension à vide par **−10 °C** dépasse-t-elle les **100 V** du régulateur ?",
      verif: s => { const k = s.def.calcul(s); return s.p.module === "m60" && s.p.type === "mppt" && k.froid > 100; },
      bravo: "Avec 3 panneaux, ≈ 130 V à froid : le régulateur serait détruit. Il faudrait 2 panneaux en série, ou un MPPT 150 V. À Bamako il ne fait jamais −10 °C, mais on vérifie toujours avec la température minimale du lieu." }
  ],
  questions: [
    { q: "Un régulateur PWM convient surtout à…", choix: ["un panneau « 12 V » de 36 cellules", "trois panneaux de 72 cellules en série", "un panneau de 60 cellules"], bonne: 0 },
    { q: "Un MPPT reçoit 300 W du panneau, rendement 96 %, batterie à 12,5 V. Courant de charge ?", choix: ["24 A", "≈ 23 A", "9,6 A"], bonne: 1, explication: "300 × 0,96 / 12,5 ≈ 23 A : le courant de sortie est plus grand que celui du panneau, car la tension est abaissée." },
    { q: "Pourquoi calcule-t-on la tension de la chaîne au froid ?", choix: ["La tension à vide augmente quand la température baisse", "Le câble rétrécit", "Le froid augmente le courant"], bonne: 0 }
  ],
  notions: [["solaire", "Régulateur PWM"], ["solaire", "Régulateur MPPT"], ["solaire", "Tension maximale d'entrée"], ["solaire", "Série et parallèle"], ["solaire", "Point de puissance maximale"]]
});
