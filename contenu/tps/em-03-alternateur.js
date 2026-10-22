LS.ajouterTP({
  id: "em-03-alternateur",
  titre: "L'alternateur",
  domaine: "electromecanique", niveau: 2, duree: "20 min",
  sim: "alternateur",
  intro: "Toutes les centrales (hydraulique, thermique, nucléaire, éolienne) et l'alternateur de ta voiture ou de ta moto produisent l'électricité de la même façon : un **aimant qui tourne** devant des **bobines**.",
  objectifs: [
    { texte: "Avec **1 paire de pôles**, trouve la vitesse qui donne **50 Hz**.", verif: s => s.p.p === 1 && Math.abs(s.p.n - 3000) < 1 },
    { texte: "Avec **2 paires de pôles**, à quelle vitesse obtient-on 50 Hz ?", verif: s => s.p.p === 2 && Math.abs(s.p.n - 1500) < 1 },
    { texte: "Branche une charge plus forte (**10 Ω**) : le couple de freinage augmente. Il faut fournir plus d'énergie mécanique.", verif: s => s.p.R <= 10 && s.p.n > 0 }
  ],
  questions: [
    { q: "Un alternateur de centrale hydraulique tourne à 150 tr/min et produit du 50 Hz. Combien de paires de pôles ?", choix: ["2", "20", "50"], bonne: 1, explication: "p = 60 f / n = 3000 / 150 = 20." },
    { q: "Pourquoi l'alternateur d'une voiture est-il suivi d'un pont de diodes ?", choix: ["Pour redresser l'alternatif et charger la batterie (continu)", "Pour augmenter la fréquence", "Pour l'éclairage"], bonne: 0 }
  ],
  notions: [["electromecanique", "Induction (loi de Faraday)"], ["electromecanique", "Loi de Lenz"], ["electromecanique", "Alternateur"]]
});
