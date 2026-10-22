LS.ajouterTP({
  id: "sol-01-panneau",
  titre: "La courbe d'un panneau solaire",
  domaine: "solaire", niveau: 1, duree: "30 min",
  sim: "panneauSolaire",
  intro: "Un panneau de **60 cellules** (≈ 290 Wc) alimente une résistance que tu règles. Le modèle est celui d'une **diode** par cellule (photocourant, courant de saturation qui dépend de la température, résistances série et parallèle), calibré sur une fiche technique typique : Voc ≈ 39,6 V, Isc ≈ 9,8 A, −0,35 %/°C. Les deux graphes montrent la courbe courant-tension et la courbe puissance-tension ; le point orange est là où tu travailles, le vert est le maximum.",
  objectifs: [
    { texte: "Aux conditions standard (1 000 W/m², cellules à 25 °C), règle la charge pour tirer **au moins 98 %** de la puissance maximale.",
      verif: s => { const k = s.def.calcul(s); return s.p.stc && s.p.G === 1000 && s.p.ombre === 0 && k.op.P >= 0.98 * k.iv.Pmp; },
      bravo: "La meilleure charge vaut Vmp / Imp ≈ 3,4 Ω. Plus faible, le panneau est presque en court-circuit (tension basse) ; plus forte, il est presque à vide (courant faible)." },
    { texte: "Décoche « cellules à 25 °C » et mets l'air à **40 °C** en plein soleil : la puissance maximale perd **plus de 12 %**.",
      verif: s => { const k = s.def.calcul(s); return !s.p.stc && s.p.G >= 1000 && s.p.ombre === 0 && k.iv.Pmp < 0.88 * k.ref.Pmp; },
      bravo: "Les cellules montent à ≈ 70 °C : la tension baisse d'environ 0,3 % par degré. C'est pour cela qu'un panneau de 400 Wc donne rarement 400 W en Afrique de l'Ouest." },
    { texte: "Baisse l'ensoleillement à **200 W/m²** (ciel couvert) : compare Isc et Voc à leurs valeurs en plein soleil.",
      verif: s => { const k = s.def.calcul(s); return s.p.G > 0 && s.p.G <= 200 && s.p.ombre === 0 && k.iv.Isc < 0.25 * k.ref.Isc && k.iv.Voc > 0.85 * k.ref.Voc; },
      bravo: "Le courant est proportionnel à la lumière (÷ 5), la tension ne baisse que de quelques volts : elle dépend du logarithme de la lumière." },
    { texte: "Mets **75 % d'ombre** sur une cellule et retire les diodes bypass : trouve une charge où la cellule ombragée chauffe de **plus de 50 W** (point chaud).",
      verif: s => { const k = s.def.calcul(s); return !s.p.bypass && s.p.ombre >= 50 && k.op.Pcellule > 50; },
      bravo: "La cellule ombragée produit moins de courant que les autres : le courant des 59 autres la traverse à l'envers, elle reçoit leur puissance et peut brûler." },
    { texte: "Remets les diodes bypass, toujours à l'ombre : le panneau garde **au moins 60 %** de sa puissance maximale.",
      verif: s => { const k = s.def.calcul(s); return s.p.bypass && s.p.ombre >= 50 && k.iv.Pmp >= 0.6 * k.ref.Pmp && (s.p.stc || s.p.Ta <= 25) && s.p.G >= 1000; },
      bravo: "La diode court-circuite le groupe de 20 cellules touché : on perd environ un tiers, et la courbe fait une « marche »." }
  ],
  questions: [
    { q: "Un panneau en court-circuit (fils reliés) :", choix: ["est détruit", "débite ≈ Isc sous une tension nulle : il ne fournit aucune puissance", "fournit sa puissance maximale"], bonne: 1, explication: "P = U × I avec U = 0. Contrairement à une batterie, un panneau en court-circuit ne fait que débiter son courant limité Isc." },
    { q: "Pourquoi une feuille sur une seule cellule fait-elle chuter tout le panneau ?", choix: ["Les cellules sont en série : le même courant les traverse toutes", "La feuille refroidit le panneau", "Le verre devient opaque"], bonne: 0 },
    { q: "Un panneau de 300 Wc fournit 255 W en plein soleil à midi. C'est…", choix: ["une panne", "normal : les cellules sont plus chaudes que 25 °C", "impossible"], bonne: 1, explication: "À 55-65 °C de cellule, on perd 10 à 15 % par rapport aux conditions standard." }
  ],
  notions: [["solaire", "Courbe I-V"], ["solaire", "Point de puissance maximale"], ["solaire", "Effet de la température"], ["solaire", "Ombrage et diodes bypass"], ["solaire", "Watt-crête"], ["solaire", "Éclairement"]],
  suite: "Observe la courbe I-V avec 50 % d'ombre et diodes bypass : elle a deux bosses de puissance. Un régulateur MPPT naïf peut rester bloqué sur la plus petite (maximum local) ; les bons régulateurs balaient régulièrement toute la courbe."
});
