LS.ajouterTP({
  id: "tr-03-embrayage",
  titre: "L'embrayage",
  domaine: "transmissions", niveau: 2, duree: "20 min",
  sim: "embrayage",
  intro: "Tu es au volant, en 1re, à l'arrêt, moteur au ralenti (800 tr/min). Le défi : **démarrer sans caler** et **sans trop faire patiner** (le disque s'use et chauffe). Utilise la pédale d'embrayage (relâchée progressivement) et l'accélérateur, comme en vrai.",
  objectifs: [
    { texte: "Relâche brutalement la pédale **sans accélérer** : le moteur **cale**. (bouton « Redémarrer le moteur ».)", verif: s => s.etat.cale },
    { texte: "Démarre **sans caler** jusqu'à ce que l'embrayage soit **collé** (moteur et boîte au même régime), sur route plate.", verif: s => s.etat.colle && !s.etat.cale && s.etat.wv > 50 && s.p.pente === 0 },
    { texte: "**Démarrage en côte (12 %)** : arrête la voiture, règle la pente, et démarre sans caler en dissipant moins de **80 kJ** dans l'embrayage (un départ brutal à haut régime en dissipe bien plus).",
      indice: "Remets l'énergie à zéro en arrêtant la voiture (bouton « Arrêter la voiture ») puis en recommençant. Il faut nettement plus de gaz qu'à plat (≈ 60 %) : relâche jusqu'au point de patinage, attends que la voiture avance, puis relâche complètement.",
      verif: (s, m) => { if (s.p.pente >= 12 && s.etat.wv < 1 && s.p.pedale < 5) { m.depart = s.etat.chaleur; } return m.depart !== undefined && s.p.pente >= 12 && s.etat.colle && !s.etat.cale && s.etat.wv > 40 && s.etat.chaleur - m.depart < 80000; } }
  ],
  questions: [
    { q: "Pourquoi le moteur cale-t-il quand on embraye trop vite ?", choix: ["Le couple demandé pour mettre la voiture en mouvement dépasse ce que le moteur fournit au ralenti", "La batterie est vide", "Il manque d'huile"], bonne: 0 },
    { q: "Garder le pied sur la pédale à mi-course en roulant (« laisser patiner »)…", choix: ["use et chauffe le disque", "économise le moteur", "n'a aucun effet"], bonne: 0 }
  ],
  notions: [["transmission", "Embrayage"], ["transmission", "Patinage"], ["transmission", "Volant moteur"]]
});
