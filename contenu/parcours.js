/* Le parcours : domaines et étapes dans l'ordre conseillé (du plus simple au plus complexe).
   Chaque étape est une carte mentale (« carte ») ou un TP (« tp »). Les identifiants renvoient
   aux fichiers contenu/cartes/<id>.js et contenu/tps/<id>.js. */
(function () {
  "use strict";
  const LS = window.LS;
  // niv : niveau à partir duquel l'étape est « à ta portée » (1 primaire, 2 collège, 3 lycée, 4 avancé).
  const C = (id, titre, desc, niv) => ({ type: "carte", id, titre, desc, niv: niv || 1 });
  const T = (id, titre, desc, niv) => ({ type: "tp", id, titre, desc, niv: niv || 1 });
  // Niveaux calés sur l'école malienne (programme générique, exemples d'abord maliens).
  LS.NIVEAUX = [
    { n: 1, id: "primaire", nom: "Primaire", ecole: "Fondamental 1er cycle, 1re à 6e année", age: "6-12 ans" },
    { n: 2, id: "college", nom: "Collège", ecole: "Fondamental 2e cycle, 7e à 9e année (DEF)", age: "12-15 ans" },
    { n: 3, id: "lycee", nom: "Lycée", ecole: "10e à 12e (Bac), CAP, BT", age: "15-18 ans" },
    { n: 4, id: "avance", nom: "Avancé", ecole: "Supérieur et métier", age: "18 ans et plus" }
  ];

  LS.parcours = [
    { id: "maths", icone: "📐", titre: "Maths utiles (le socle)", desc: "Trigonométrie, nombres complexes, dérivées, exponentielles et logarithmes, statistiques : les outils de tous les autres domaines.", etapes: [
      C("maths", "Carte : les maths utiles", "Fonctions, trigonométrie, complexes, analyse, exponentielle, statistiques.", 2),
      T("math-01-trigo", "Le cercle trigonométrique et la sinusoïde", "Sinus, cosinus, phase, radians.", 3),
      T("math-02-complexes", "Nombres complexes et phaseurs", "Module, argument, impédance d'un circuit RLC.", 4),
      T("math-03-derivees", "Dérivée et intégrale", "Pente, tangente, aire sous la courbe.", 3),
      T("math-04-exponentielle", "Exponentielle, logarithme et décibels", "Croissance, décroissance, échelles logarithmiques.", 3),
      T("math-05-statistiques", "Statistiques et probabilités", "Moyenne, écart type, loi normale, échantillonnage.", 2)
    ] },
    { id: "electricite", icone: "⚡", titre: "Électricité : bases et composants", desc: "Tension, courant, résistance, lois des circuits, mesures et premiers composants.", etapes: [
      C("elec-bases", "Carte : les bases de l'électricité", "Grandeurs, lois, associations, mesures, sécurité.", 1),
      T("elec-01-premier-circuit", "Premier circuit : pile, interrupteur, lampe", "Circuit ouvert, circuit fermé, sens du courant.", 1),
      T("elec-02-loi-ohm", "La loi d'Ohm", "Faire varier U et R, observer I.", 2),
      T("elec-03-multimetre", "Se servir d'un multimètre", "Tension, courant, résistance, continuité, diode : et les erreurs à éviter.", 2),
      T("elec-04-serie-parallele", "Série ou parallèle ?", "Deux lampes, deux montages, deux comportements.", 1),
      T("elec-05-diviseur", "Le diviseur de tension et le potentiomètre", "Obtenir la tension voulue à partir d'une pile.", 2),
      C("elec-composants", "Carte : les composants", "Passifs, semi-conducteurs, commande, capteurs.", 2),
      T("elec-06-led", "Allumer une LED sans la griller", "Calculer la résistance de protection.", 2),
      T("elec-07-kirchhoff", "Les lois de Kirchhoff", "Lois des nœuds et des mailles sur un circuit à deux sources.", 3),
      T("elec-09-condensateur", "Charge et décharge d'un condensateur", "Constante de temps τ = RC à l'oscilloscope.", 3),
      T("elec-10-bobine", "La bobine et la diode de roue libre", "Le courant ne s'arrête pas d'un coup.", 3),
      T("elec-11-panne", "Recherche de panne", "Trouver au multimètre le fil coupé et la lampe grillée.", 2),
      C("elec-alternatif", "Carte : le courant alternatif", "Sinusoïde, valeur efficace, impédance, puissances, triphasé.", 3),
      T("elec-12-alternatif", "Courant alternatif à l'oscilloscope", "Amplitude, période, fréquence, valeur efficace.", 3),
      T("elec-08-va-et-vient", "Le va-et-vient de la maison", "Allumer une lampe depuis deux endroits.", 2),
      T("elec-13-filtre", "Filtre RC passe-bas", "La fréquence de coupure fc = 1/(2πRC).", 4),
      T("elec-bac-a-sable", "Bac à sable", "Tous les composants, montage libre.", 1)
    ] },
    { id: "electronique", icone: "🔬", titre: "Électronique", desc: "Diodes, alimentation, transistors, capteurs.", etapes: [
      C("electronique", "Carte : l'électronique", "Semi-conducteurs, redressement, transistors, AOP, alimentations.", 3),
      T("elec-14-redressement", "Redresser et lisser une tension", "Diode, pont de Graetz, condensateur de lissage.", 3),
      T("elec-15-zener", "Réguler avec une diode Zener", "Une tension stable malgré les variations.", 3),
      T("elec-16-transistor", "Le transistor en interrupteur", "Un petit courant de base commande un gros courant.", 3),
      T("elec-17-veilleuse", "Veilleuse automatique", "Photorésistance + transistor : la LED s'allume dans le noir.", 2)
    ] },
    { id: "numerique", icone: "🔢", titre: "Électricité numérique et logique", desc: "Binaire, portes logiques, bascules, conversion analogique-numérique.", etapes: [
      C("numerique", "Carte : le numérique", "Numération, logique, séquentiel, conversion, microcontrôleurs.", 2),
      T("num-01-binaire", "Compter en binaire", "Bits, octets, hexadécimal.", 1),
      T("num-02-portes", "Les portes logiques", "ET, OU, NON, OU exclusif : tables de vérité.", 2),
      T("num-03-additionneur", "Construire un additionneur", "Additionner deux bits avec des portes.", 2),
      T("num-04-bascules", "Mémoriser un bit : les bascules", "Bascule RS, bascule D, compteur.", 3),
      T("num-05-echantillonnage", "Échantillonner et quantifier", "Fréquence d'échantillonnage, Shannon, nombre de bits.", 3)
    ] },
    { id: "solaire", icone: "☀️", titre: "Énergie solaire et batteries", desc: "Panneaux photovoltaïques, régulateurs, batteries, onduleurs, dimensionnement d'une installation autonome.", etapes: [
      C("solaire", "Carte : l'énergie solaire et les batteries", "Rayonnement, panneau, régulateur, batteries, onduleur, dimensionnement.", 1),
      T("sol-01-panneau", "La courbe d'un panneau solaire", "Courant, tension, ensoleillement, température, point de puissance maximale.", 2),
      T("sol-02-batterie", "Charger et décharger une batterie", "Capacité, état de charge, profondeur de décharge, plomb ou lithium.", 2),
      T("sol-03-regulateur", "Régulateur PWM ou MPPT", "Pourquoi le MPPT récupère plus d'énergie.", 3),
      T("sol-04-dimensionnement", "Dimensionner un kit solaire autonome", "Besoins, panneaux, batterie : tenir la nuit et les jours couverts.", 3)
    ] },
    { id: "batiment", icone: "🏠", titre: "Électricité du bâtiment", desc: "Protections, mise à la terre, différentiel, sections de câbles : une installation sûre.", etapes: [
      C("batiment", "Carte : l'électricité du bâtiment", "Tableau, protections, terre, schémas de liaison, câbles, sécurité.", 2),
      T("bat-01-protection", "Disjoncteur et section des câbles", "Surcharge, court-circuit, courbes B, C, D.", 3),
      T("bat-02-differentiel", "Défaut d'isolement et différentiel 30 mA", "Prise de terre, tension de contact, déclenchement.", 3),
      T("bat-03-chute-tension", "Longueur de câble et chute de tension", "Pourquoi un câble trop fin chauffe et fait baisser la tension.", 3)
    ] },
    { id: "electromecanique", icone: "🧲", titre: "Électromécanique", desc: "Magnétisme, moteurs, relais, transformateurs, alternateurs.", etapes: [
      C("electromecanique", "Carte : l'électromécanique", "Champ magnétique, induction, machines électriques, commande.", 2),
      T("em-01-relais-moteur", "Commander un moteur avec un relais", "Un petit circuit de commande, un circuit de puissance.", 2),
      T("em-02-moteur-cc", "Le moteur à courant continu", "Force de Laplace, collecteur, vitesse et couple.", 2),
      T("em-03-alternateur", "L'alternateur", "Faire tourner un aimant pour produire une tension.", 2),
      T("em-04-transformateur", "Le transformateur", "Rapport de transformation, pertes, isolement.", 3),
      T("em-05-asynchrone", "Le moteur asynchrone triphasé", "Champ tournant et glissement.", 4),
      T("em-06-pas-a-pas", "Moteur pas à pas et servomoteur", "Positionner un axe avec précision.", 2)
    ] },
    { id: "telecom", icone: "📡", titre: "Télécommunications", desc: "Transmission (signal, supports, modulation) et commutation (réseaux, OSI).", etapes: [
      C("telecom", "Carte : les télécommunications", "Commutation et transmission : vue d'ensemble.", 2),
      C("telecom-transmission", "Carte : la transmission", "Série, parallèle, modes, signal, supports.", 2),
      T("tel-01-signal", "Le signal : temps et fréquence", "Amplitude, fréquence, harmoniques, bruit.", 2),
      T("tel-02-modulation", "Moduler une porteuse", "AM, FM, ASK, FSK, PSK.", 3),
      T("tel-03-bande-passante", "Bande passante et débit", "Pourquoi un câble limite le débit.", 3),
      T("tel-04-liaison-serie", "Liaison série asynchrone (UART)", "Bit de départ, données, parité, arrêt.", 3),
      C("telecom-osi", "Carte : le modèle OSI", "Les 7 couches, TCP/UDP, IP, Ethernet.", 3),
      T("tel-05-encapsulation", "Encapsulation : de la donnée à la trame", "Chaque couche ajoute son en-tête.", 3),
      T("tel-06-ipv4", "Adresses IPv4 et masques", "Réseau, hôtes, diffusion.", 3),
      T("tel-07-commutation", "Commutation de circuits ou de paquets", "Réserver un chemin ou envoyer des paquets.", 3)
    ] },
    { id: "moteurs", icone: "🏍️", titre: "Mécanique des moteurs (voitures, motos)", desc: "Moteur thermique 4 temps et 2 temps, essence et diesel.", etapes: [
      C("moteur", "Carte : le moteur thermique", "Organes, cycles, caractéristiques, alimentation, allumage.", 1),
      T("meca-01-quatre-temps", "Le moteur 4 temps", "Admission, compression, combustion-détente, échappement.", 1),
      T("meca-02-diesel", "Essence ou diesel ?", "Allumage commandé et allumage par compression.", 2),
      T("meca-03-deux-temps", "Le moteur 2 temps (moto, scooter)", "Un cycle par tour : lumières et transferts.", 2),
      T("meca-04-multicylindre", "Plusieurs cylindres : ordre d'allumage", "Pourquoi un 4 cylindres tourne rond.", 3),
      T("meca-05-couple-puissance", "Couple, puissance et régime", "Lire une courbe moteur.", 3)
    ] },
    { id: "transmissions", icone: "⚙️", titre: "Transmissions", desc: "Engrenages, chaîne, embrayage, boîte de vitesses, différentiel.", etapes: [
      C("transmission", "Carte : la transmission", "De la sortie du moteur jusqu'aux roues.", 1),
      T("tr-01-engrenages", "Engrenages et rapport de réduction", "Vitesse contre couple.", 1),
      T("tr-02-chaine-moto", "Transmission par chaîne d'une moto", "Pignon, couronne, vitesse de la moto.", 2),
      T("tr-03-embrayage", "L'embrayage", "Démarrer sans caler, patinage, usure.", 2),
      T("tr-04-boite", "La boîte de vitesses", "Choisir le bon rapport.", 2),
      T("tr-05-differentiel", "Le différentiel", "Pourquoi les roues ne tournent pas à la même vitesse en virage.", 2)
    ] },
    { id: "esp32", icone: "📟", titre: "ESP32 / ESP8266 et connectique", desc: "Microcontrôleurs Wi-Fi : broches, protocoles, capteurs, alimentation.", etapes: [
      C("esp32", "Carte : l'ESP32 et sa connectique", "GPIO, PWM, ADC, UART, I2C, SPI, alimentation 3,3 V.", 2),
      T("esp-01-blink", "Faire clignoter une LED", "Sortie numérique, résistance, digitalWrite.", 2),
      T("esp-02-bouton", "Lire un bouton : pull-up et rebonds", "Entrée numérique, résistance de tirage.", 2),
      T("esp-03-pwm", "Varier la luminosité : la PWM", "Rapport cyclique, fréquence, résolution.", 2),
      T("esp-04-adc", "Lire une tension : l'ADC", "Potentiomètre, 12 bits, non-linéarité.", 3),
      T("esp-05-bus", "Bus UART, I2C et SPI", "Brancher un capteur et lire ses octets.", 3),
      T("esp-06-niveaux", "Niveaux logiques 3,3 V / 5 V et alimentation", "Ne pas griller son ESP.", 3)
    ] },
    { id: "capteurs", icone: "🌡️", titre: "Capteurs et mesure", desc: "Température, distance, mouvement : lire le monde réel, avec son bruit et ses erreurs.", etapes: [
      C("capteurs", "Carte : les capteurs", "Principes, caractéristiques, conditionnement, erreurs, capteurs courants.", 2),
      T("cap-01-thermistance", "Mesurer une température avec une thermistance", "Diviseur de tension, courbe non linéaire, ADC.", 3),
      T("cap-02-ultrason", "Mesurer une distance aux ultrasons", "Temps de vol, vitesse du son, angle du faisceau.", 2),
      T("cap-03-imu", "Gyroscope et accéléromètre : estimer un angle", "Dérive, bruit, filtre complémentaire.", 3),
      T("cap-04-etalonnage", "Bruit, moyenne et étalonnage", "Erreur de décalage, de gain, filtrer sans retarder.", 3)
    ] },
    { id: "drones", icone: "🚁", titre: "Drones", desc: "Moteurs brushless, hélices, batterie LiPo, contrôleur de vol, PID.", etapes: [
      C("drone", "Carte : le drone multirotor", "Structure, propulsion, énergie, électronique, pilotage.", 1),
      T("dr-01-propulsion", "Poussée, poids et autonomie", "Choisir moteurs, hélices et batterie.", 2),
      T("dr-02-pid", "Tenir l'altitude avec un PID", "Réglage P, I, D sur un drone simulé.", 3),
      T("dr-03-mixage", "Mixage des moteurs : roulis, tangage, lacet", "Comment un quadricoptère se dirige.", 1)
    ] },
    { id: "python", icone: "🐍", titre: "Python et data science", desc: "Les bases utiles à tes projets d'analyse.", etapes: [
      C("python", "Carte : Python et la data science", "Langage, pandas, statistiques, visualisation.", 3)
    ] },
    { id: "ml-audio", icone: "🎧", titre: "Machine learning et audio", desc: "Apprentissage automatique, parole, traduction, évaluation.", etapes: [
      C("ml-audio", "Carte : machine learning et audio", "Données, modèles, entraînement, audio, évaluation.", 3),
      T("ia-01-neurone", "Un neurone qui apprend", "Poids, biais, descente de gradient, frontière de décision.", 3),
      T("ia-02-surapprentissage", "Surapprentissage", "Complexité du modèle, erreurs d'entraînement et de validation.", 4),
      T("ia-03-spectrogramme", "Le spectrogramme d'un son", "Temps, fréquence, voyelles, sifflement, bruit.", 3),
      T("ia-04-evaluation", "Évaluer une transcription et une traduction", "WER, BLEU et ce qu'ils ne voient pas.", 4),
      T("ia-05-fuite", "La fuite de données", "Découper par série et non par segment.", 4)
    ] },
    { id: "finance", icone: "📈", titre: "Finance et trading", desc: "Marchés, Forex, risque, backtest, saisonnalité.", etapes: [
      C("finance", "Carte : finance et trading", "Marchés, ordres, risque, analyse, backtest.", 4)
    ] },
    { id: "git", icone: "🌿", titre: "Git, GitHub et outils", desc: "Versionner son travail et collaborer.", etapes: [
      C("git", "Carte : Git et GitHub", "Dépôt, commits, branches, PR, bonnes pratiques.", 3)
    ] }
  ];

  LS.etapeHref = e => e.type === "carte" ? "carte.html?id=" + e.id : "tp.html?id=" + e.id;
  LS.nomDomaine = id => { const d = LS.parcours.find(x => x.id === id); return d ? d.titre : "Parcours"; };
  LS.catalogueTP = {};
  LS.parcours.forEach(d => d.etapes.forEach(e => { if (e.type === "tp") LS.catalogueTP[e.id] = e.titre; }));
  LS.positionDansParcours = function (type, id) {
    const tout = [];
    LS.parcours.forEach(d => d.etapes.forEach(e => tout.push(Object.assign({ domaine: d.id, href: LS.etapeHref(e) }, e))));
    const i = tout.findIndex(e => e.type === type && e.id === id);
    if (i < 0) return null;
    return { precedent: tout[i - 1] || null, suivant: tout[i + 1] || null, etape: tout[i] };
  };
})();
