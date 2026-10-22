LS.ajouterCarte({
  id: "transmission",
  titre: "La transmission",
  intro: "La transmission amène le couple du moteur jusqu'aux roues en l'adaptant : elle permet de **démarrer** (embrayage), de **choisir la démultiplication** (boîte), de **tourner** (différentiel) et de **transporter** le mouvement (arbres, chaîne).",
  racine: { t: "Transmission", c: [
    { t: "Notions de base", c: [
      { t: "Couple", d: "Effort de rotation, en N·m : force × bras de levier. Un réducteur multiplie le couple et divise la vitesse.", tp: "tr-01-engrenages" },
      { t: "Rapport de transmission", d: "Rapport entre la vitesse de sortie et la vitesse d'entrée. Pour deux engrenages : inverse du rapport des nombres de dents. Une démultiplication de 4 divise la vitesse par 4 et multiplie le couple par 4 (moins les pertes).", f: "k = N_sortie / N_entrée = Z_menant / Z_mené\nC_sortie ≈ C_entrée / k × η", tp: ["tr-01-engrenages", "tr-02-chaine-moto", "tr-04-boite"] },
      { t: "Rendement", d: "Part de la puissance transmise : ≈ 98 % par engrènement, 95–98 % pour une chaîne propre et graissée.", f: "η = P_sortie / P_entrée", tp: "tr-01-engrenages" },
      { t: "Engrenage", d: "Deux roues dentées en prise. Les dents doivent avoir le même **module** (taille). Engrenage droit, hélicoïdal (silencieux), conique (renvoi d'angle), à vis sans fin (forte réduction, irréversible).", tp: "tr-01-engrenages" }
    ] },
    { t: "Embrayage", d: "Accouplement débrayable entre le moteur et la boîte. Un **disque** garni de friction est serré entre le **volant moteur** et le **plateau de pression** par un ressort (diaphragme). Appuyer sur la pédale pousse la **butée**, qui desserre le plateau.", tp: "tr-03-embrayage", c: [
      { t: "Patinage", d: "Phase où les deux côtés de l'embrayage tournent à des vitesses différentes tout en transmettant du couple : indispensable au démarrage, mais il dissipe de l'énergie en chaleur et use le disque.", tp: "tr-03-embrayage" },
      { t: "Volant moteur", d: "Côté moteur de l'embrayage ; son inertie aide aussi au démarrage. Les diesels ont souvent un volant bimasse qui amortit les à-coups.", tp: "tr-03-embrayage" },
      { t: "Embrayage de moto", d: "Multidisque, souvent à bain d'huile, commandé par un levier au guidon ; un embrayage centrifuge équipe les scooters." }
    ] },
    { t: "Boîte de vitesses", d: "Choisit le rapport de démultiplication selon la situation : couple élevé pour démarrer et monter, vitesse élevée à régime modéré sur route.", tp: "tr-04-boite", c: [
      { t: "Boîte manuelle", d: "Arbre primaire (moteur) et arbre secondaire, avec des paires de pignons toujours en prise ; un **crabot** rend un pignon solidaire de son arbre. La marche arrière ajoute un pignon intermédiaire qui inverse le sens." },
      { t: "Synchroniseur", d: "Cône de friction qui égalise la vitesse du pignon et de l'arbre avant que le crabot ne s'engage : on passe les vitesses sans craquement.", tp: "tr-04-boite" },
      { t: "Boîte automatique", d: "Convertisseur de couple hydraulique (ou double embrayage robotisé) et trains épicycloïdaux ; le calculateur choisit le rapport." },
      { t: "Variateur CVT", d: "Deux poulies à diamètre variable reliées par une courroie : démultiplication continue. C'est la transmission des scooters." },
      { t: "Boîte de moto", d: "Boîte séquentielle : on passe les rapports un par un au sélecteur au pied (1 en bas, puis 2-3-4-5-6 en haut, point mort entre 1 et 2)." }
    ] },
    { t: "Pont et différentiel", c: [
      { t: "Couple conique", d: "Engrenage à renvoi d'angle (sur les propulsions) qui fait la dernière démultiplication (« pont », rapport ≈ 3 à 4,5)." },
      { t: "Différentiel", d: "Train d'engrenages (couronne, boîtier, **satellites**, **planétaires**) qui permet aux deux roues d'un essieu de tourner à des vitesses différentes en virage, tout en leur transmettant le même couple.", f: "N_couronne = (N_gauche + N_droite) / 2", tp: "tr-05-differentiel" },
      { t: "Blocage de différentiel", d: "Rend les deux roues solidaires (4×4, tracteurs) : la motricité est conservée même si une roue n'a plus d'adhérence, mais les pneus glissent en virage sur sol dur. Variante : différentiel à glissement limité (autobloquant).", tp: "tr-05-differentiel" }
    ] },
    { t: "Arbres", c: [
      { t: "Arbre de transmission", d: "Arbre long qui transmet le mouvement de la boîte au pont arrière (propulsion, 4×4), avec des joints de cardan aux extrémités." },
      { t: "Cardan et joint homocinétique", d: "Le cardan transmet une rotation entre deux arbres qui font un angle, mais avec des à-coups ; le joint **homocinétique** (transmissions de roues avant) garde une vitesse régulière même roues braquées." }
    ] },
    { t: "Transmission de moto", c: [
      { t: "Transmission primaire", d: "Liaison du vilebrequin à l'embrayage, par engrenages (rapport ≈ 1,6 à 2,2)." },
      { t: "Chaîne", d: "Transmission secondaire la plus courante : légère et à bon rendement, mais à graisser et à tendre régulièrement. Alternatives : courroie crantée (propre, silencieuse) et cardan (sans entretien, plus lourd).", tp: "tr-02-chaine-moto" },
      { t: "Pignon et couronne", d: "Le **pignon** (sortie de boîte, 13 à 17 dents) entraîne la **couronne** de roue (38 à 52 dents) par la chaîne. Un pignon plus petit ou une couronne plus grande raccourcissent la transmission (accélérations), l'inverse l'allonge (vitesse).", f: "Rapport secondaire = Z couronne / Z pignon", tp: "tr-02-chaine-moto" },
      { t: "Kit chaîne", d: "Chaîne, pignon et couronne changés ensemble, car ils s'usent ensemble ; une chaîne trop tendue use les roulements, trop lâche elle peut sauter." }
    ] }
  ] }
});
