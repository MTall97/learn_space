LS.ajouterTP({
  id: "sol-02-batterie",
  titre: "Charger et décharger une batterie",
  domaine: "solaire", niveau: 2, duree: "30 min",
  sim: "batterie",
  intro: "Une batterie 12 V, au **plomb AGM** ou au **lithium fer phosphate** (LiFePO4). Le modèle tient compte de la tension selon l'état de charge (courbes au repos typiques), de la résistance interne, de la **loi de Peukert**, du rendement de charge et d'un chargeur **CC/CV**. Le temps est accéléré : règle la vitesse. Les durées de vie viennent de courbes « cycles selon profondeur de décharge » typiques de fabricants à 25 °C, corrigées par la température (plomb : divisée par 2 tous les 10 °C au-dessus de 25 °C ; LiFePO4 : effet plus faible, ordre de grandeur). Les limites de courant sont celles d'une fiche typique : le BMS d'une LiFePO4 coupe au-delà d'environ 1 C ; le plomb, sans BMS, accepte tout mais s'abîme. La température n'agit ici que sur la durée de vie et la charge du lithium, pas sur la capacité instantanée.",
  objectifs: [
    { texte: "Batterie **plomb pleine**, décharge-la à **50 A** jusqu'à la coupure : elle fournit **moins de 80 %** de sa capacité nominale.",
      verif: s => { const e = s.etat; return s.p.chimie === "plomb" && e.coupure && e.socDepart >= 0.99 && s.p.Id >= 40 && e.ahOut < 0.8 * s.p.C; },
      bravo: "C'est l'effet Peukert : la capacité est donnée pour une décharge en 20 heures. À fort courant, la réaction chimique n'a pas le temps de se faire au cœur des plaques." },
    { texte: "Même essai avec la **LiFePO4** pleine à 50 A : elle fournit **plus de 90 %** de sa capacité.",
      verif: s => { const e = s.etat; return s.p.chimie === "lifepo4" && e.coupure && e.socDepart >= 0.99 && s.p.Id >= 40 && e.ahOut > 0.9 * s.p.C; },
      bravo: "Le lithium supporte bien les forts courants. Remarque aussi sa tension presque plate pendant toute la décharge." },
    { texte: "Batterie plomb à 40 %, mets-la en **charge** : attends la phase **CV** et vois le courant tomber sous **30 %** du courant maximal.",
      verif: s => { const e = s.etat; return s.p.chimie === "plomb" && s.p.mode === "charge" && e.phases.cv && Math.abs(e.I) < 0.3 * s.p.Ic; },
      bravo: "La batterie n'accepte plus tout le courant : le chargeur tient 14,4 V et le courant décroît pendant des heures. Les derniers 20 % d'une batterie plomb sont longs à remplir, ce que le soleil ne permet pas toujours." },
    { texte: "Batterie plomb : choisis une profondeur de décharge quotidienne qui donne **au moins 4 ans** de vie (1 460 cycles).",
      verif: s => s.p.chimie === "plomb" && LS.BATTERIES.plomb.cycles(s.p.dod / 100) >= 1460,
      bravo: "Il faut rester vers 20 % par jour : on surdimensionne donc la batterie plomb, ce qui rapproche son coût de celui du lithium." },
    { texte: "Même batterie plomb, même profondeur, mais à **35 °C** (un local non ventilé à Bamako) : de combien la durée de vie baisse-t-elle ?",
      verif: s => s.p.chimie === "plomb" && s.p.T >= 35,
      bravo: "Divisée par 2 : chaque 10 °C au-dessus de 25 °C double la vitesse des réactions qui usent les plaques. En climat chaud, on installe le parc au frais et ventilé, ou on choisit le lithium." },
    { texte: "Batterie **LiFePO4 de 20 Ah** : demande-lui une décharge de **plus de 20 A** et regarde le BMS réagir.",
      verif: s => s.p.chimie === "lifepo4" && s.p.mode === "decharge" && s.etat.coupure && /surintensité/.test(s.etat.motif || ""),
      bravo: "Le BMS protège les cellules d'un courant trop fort (≈ 1 C en continu pour beaucoup de batteries « solaires ») : il faut choisir une batterie dont le courant maximal couvre la pointe des appareils (onduleur, pompe)." },
    { texte: "LiFePO4 en **charge** par une nuit glaciale (température **sous 0 °C**) : le BMS refuse de la charger.",
      verif: s => s.p.chimie === "lifepo4" && s.p.mode === "charge" && s.p.T < 0 && /0 °C/.test(s.etat.phase || "") }
  ],
  questions: [
    { q: "Batterie LiFePO4 à 13,2 V au repos. Son état de charge ?", choix: ["Environ 50 %", "On ne peut pas le savoir précisément par la tension", "100 %"], bonne: 1, explication: "Entre 15 et 90 %, sa tension varie de moins de 0,3 V : il faut compter les ampères-heures (BMS, shunt)." },
    { q: "Énergie d'une batterie 12 V 200 Ah ?", choix: ["200 Wh", "2 400 Wh", "16,7 Wh"], bonne: 1, explication: "E = U × C = 12 × 200 = 2 400 Wh." },
    { q: "Pourquoi ne vide-t-on une batterie plomb qu'à 50 % ?", choix: ["Pour garder une réserve d'urgence", "Les décharges profondes la sulfatent et divisent sa durée de vie", "Parce que la seconde moitié est en 6 V"], bonne: 1 }
  ],
  notions: [["solaire", "Capacité et énergie"], ["solaire", "Loi de Peukert"], ["solaire", "État de charge"], ["solaire", "Charge CC/CV"], ["solaire", "Durée de vie en cycles"], ["solaire", "Batterie plomb"], ["solaire", "Batterie LiFePO4"], ["solaire", "BMS"]]
});
