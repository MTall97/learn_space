LS.ajouterTP({
  id: "tr-05-differentiel",
  titre: "Le différentiel",
  domaine: "transmissions", niveau: 3, duree: "20 min",
  sim: "differentiel",
  intro: "Vue de dessus de l'essieu moteur d'une voiture qui tourne à droite. L'écartement des roues est de 1,5 m. Le **différentiel** (au milieu) reçoit le mouvement du moteur sur sa **couronne** et le répartit aux deux roues grâce à ses **satellites** et **planétaires**.",
  objectifs: [
    { texte: "Prends un virage de **5 m** de rayon à 20 km/h : quelle roue tourne le plus vite ?", verif: s => s.p.rayon === 5 && s.p.v === 20 && !s.p.bloque },
    { texte: "**Bloque** le différentiel dans ce virage : les pneus sont forcés de glisser (usure, voiture qui « tire » tout droit).", verif: s => s.p.bloque && s.p.rayon > 0 && s.p.rayon <= 10 },
    { texte: "Débloque, mets la roue droite **sur la glace** : la voiture reste sur place. Puis bloque le différentiel : elle repart.", verif: (s, m) => { if (s.p.glace && !s.p.bloque) m.a = true; return !!(m.a && s.p.glace && s.p.bloque); } }
  ],
  questions: [
    { q: "Roue gauche 300 tr/min, roue droite 260 tr/min. La couronne tourne à…", choix: ["280 tr/min", "560 tr/min", "40 tr/min"], bonne: 0 },
    { q: "En ligne droite, les satellites…", choix: ["tournent sur eux-mêmes très vite", "ne tournent pas sur eux-mêmes : tout le boîtier tourne en bloc", "sont débrayés"], bonne: 1 }
  ],
  notions: [["transmission", "Différentiel"], ["transmission", "Blocage de différentiel"]]
});
