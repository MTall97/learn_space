/* Le parcours : domaines et étapes dans l'ordre conseillé (du plus simple au plus complexe).
   Chaque étape est une carte mentale (« carte ») ou un TP (« tp »). Les identifiants renvoient
   aux fichiers contenu/cartes/<id>.js et contenu/tps/<id>.js. */
(function () {
  "use strict";
  const LS = window.LS;
  const C = (id, titre, desc) => ({ type: "carte", id, titre, desc });
  const T = (id, titre, desc) => ({ type: "tp", id, titre, desc });

  LS.parcours = [
    { id: "electricite", icone: "⚡", titre: "Électricité : bases et composants", desc: "Tension, courant, résistance, lois des circuits, mesures et premiers composants.", etapes: [
      C("elec-bases", "Carte : les bases de l'électricité", "Grandeurs, lois, associations, mesures, sécurité."),
      T("elec-01-premier-circuit", "Premier circuit : pile, interrupteur, lampe", "Circuit ouvert, circuit fermé, sens du courant."),
      T("elec-02-loi-ohm", "La loi d'Ohm", "Faire varier U et R, observer I."),
      T("elec-03-multimetre", "Se servir d'un multimètre", "Tension, courant, résistance, continuité, diode : et les erreurs à éviter."),
      T("elec-04-serie-parallele", "Série ou parallèle ?", "Deux lampes, deux montages, deux comportements."),
      T("elec-05-diviseur", "Le diviseur de tension et le potentiomètre", "Obtenir la tension voulue à partir d'une pile."),
      C("elec-composants", "Carte : les composants", "Passifs, semi-conducteurs, commande, capteurs."),
      T("elec-06-led", "Allumer une LED sans la griller", "Calculer la résistance de protection."),
      T("elec-07-kirchhoff", "Les lois de Kirchhoff", "Lois des nœuds et des mailles sur un circuit à deux sources."),
      T("elec-08-va-et-vient", "Le va-et-vient de la maison", "Allumer une lampe depuis deux endroits."),
      T("elec-09-condensateur", "Charge et décharge d'un condensateur", "Constante de temps τ = RC à l'oscilloscope."),
      T("elec-10-bobine", "La bobine et la diode de roue libre", "Le courant ne s'arrête pas d'un coup."),
      T("elec-11-panne", "Recherche de panne", "Trouver au multimètre le fil coupé et la lampe grillée."),
      C("elec-alternatif", "Carte : le courant alternatif", "Sinusoïde, valeur efficace, impédance, puissances, triphasé."),
      T("elec-12-alternatif", "Courant alternatif à l'oscilloscope", "Amplitude, période, fréquence, valeur efficace."),
      T("elec-13-filtre", "Filtre RC passe-bas", "La fréquence de coupure fc = 1/(2πRC)."),
      T("elec-bac-a-sable", "Bac à sable", "Tous les composants, montage libre.")
    ] },
    { id: "electronique", icone: "🔬", titre: "Électronique", desc: "Diodes, alimentation, transistors, capteurs.", etapes: [
      C("electronique", "Carte : l'électronique", "Semi-conducteurs, redressement, transistors, AOP, alimentations."),
      T("elec-14-redressement", "Redresser et lisser une tension", "Diode, pont de Graetz, condensateur de lissage."),
      T("elec-15-zener", "Réguler avec une diode Zener", "Une tension stable malgré les variations."),
      T("elec-16-transistor", "Le transistor en interrupteur", "Un petit courant de base commande un gros courant."),
      T("elec-17-veilleuse", "Veilleuse automatique", "Photorésistance + transistor : la LED s'allume dans le noir.")
    ] },
    { id: "numerique", icone: "🔢", titre: "Électricité numérique et logique", desc: "Binaire, portes logiques, bascules, conversion analogique-numérique.", etapes: [
      C("numerique", "Carte : le numérique", "Numération, logique, séquentiel, conversion, microcontrôleurs."),
      T("num-01-binaire", "Compter en binaire", "Bits, octets, hexadécimal."),
      T("num-02-portes", "Les portes logiques", "ET, OU, NON, OU exclusif : tables de vérité."),
      T("num-03-additionneur", "Construire un additionneur", "Additionner deux bits avec des portes."),
      T("num-04-bascules", "Mémoriser un bit : les bascules", "Bascule RS, bascule D, compteur."),
      T("num-05-echantillonnage", "Échantillonner et quantifier", "Fréquence d'échantillonnage, Shannon, nombre de bits.")
    ] },
    { id: "electromecanique", icone: "🧲", titre: "Électromécanique", desc: "Magnétisme, moteurs, relais, transformateurs, alternateurs.", etapes: [
      C("electromecanique", "Carte : l'électromécanique", "Champ magnétique, induction, machines électriques, commande."),
      T("em-01-relais-moteur", "Commander un moteur avec un relais", "Un petit circuit de commande, un circuit de puissance."),
      T("em-02-moteur-cc", "Le moteur à courant continu", "Force de Laplace, collecteur, vitesse et couple."),
      T("em-03-alternateur", "L'alternateur", "Faire tourner un aimant pour produire une tension."),
      T("em-04-transformateur", "Le transformateur", "Rapport de transformation, pertes, isolement."),
      T("em-05-asynchrone", "Le moteur asynchrone triphasé", "Champ tournant et glissement."),
      T("em-06-pas-a-pas", "Moteur pas à pas et servomoteur", "Positionner un axe avec précision.")
    ] },
    { id: "telecom", icone: "📡", titre: "Télécommunications", desc: "Transmission (signal, supports, modulation) et commutation (réseaux, OSI).", etapes: [
      C("telecom", "Carte : les télécommunications", "Commutation et transmission : vue d'ensemble."),
      C("telecom-transmission", "Carte : la transmission", "Série, parallèle, modes, signal, supports."),
      T("tel-01-signal", "Le signal : temps et fréquence", "Amplitude, fréquence, harmoniques, bruit."),
      T("tel-02-modulation", "Moduler une porteuse", "AM, FM, ASK, FSK, PSK."),
      T("tel-03-bande-passante", "Bande passante et débit", "Pourquoi un câble limite le débit."),
      T("tel-04-liaison-serie", "Liaison série asynchrone (UART)", "Bit de départ, données, parité, arrêt."),
      C("telecom-osi", "Carte : le modèle OSI", "Les 7 couches, TCP/UDP, IP, Ethernet."),
      T("tel-05-encapsulation", "Encapsulation : de la donnée à la trame", "Chaque couche ajoute son en-tête."),
      T("tel-06-ipv4", "Adresses IPv4 et masques", "Réseau, hôtes, diffusion."),
      T("tel-07-commutation", "Commutation de circuits ou de paquets", "Réserver un chemin ou envoyer des paquets.")
    ] },
    { id: "moteurs", icone: "🏍️", titre: "Mécanique des moteurs (voitures, motos)", desc: "Moteur thermique 4 temps et 2 temps, essence et diesel.", etapes: [
      C("moteur", "Carte : le moteur thermique", "Organes, cycles, caractéristiques, alimentation, allumage."),
      T("meca-01-quatre-temps", "Le moteur 4 temps", "Admission, compression, combustion-détente, échappement."),
      T("meca-02-diesel", "Essence ou diesel ?", "Allumage commandé et allumage par compression."),
      T("meca-03-deux-temps", "Le moteur 2 temps (moto, scooter)", "Un cycle par tour : lumières et transferts."),
      T("meca-04-multicylindre", "Plusieurs cylindres : ordre d'allumage", "Pourquoi un 4 cylindres tourne rond."),
      T("meca-05-couple-puissance", "Couple, puissance et régime", "Lire une courbe moteur.")
    ] },
    { id: "transmissions", icone: "⚙️", titre: "Transmissions", desc: "Engrenages, chaîne, embrayage, boîte de vitesses, différentiel.", etapes: [
      C("transmission", "Carte : la transmission", "De la sortie du moteur jusqu'aux roues."),
      T("tr-01-engrenages", "Engrenages et rapport de réduction", "Vitesse contre couple."),
      T("tr-02-chaine-moto", "Transmission par chaîne d'une moto", "Pignon, couronne, vitesse de la moto."),
      T("tr-03-embrayage", "L'embrayage", "Démarrer sans caler, patinage, usure."),
      T("tr-04-boite", "La boîte de vitesses", "Choisir le bon rapport."),
      T("tr-05-differentiel", "Le différentiel", "Pourquoi les roues ne tournent pas à la même vitesse en virage.")
    ] },
    { id: "esp32", icone: "📟", titre: "ESP32 / ESP8266 et connectique", desc: "Microcontrôleurs Wi-Fi : broches, protocoles, capteurs, alimentation.", etapes: [
      C("esp32", "Carte : l'ESP32 et sa connectique", "GPIO, PWM, ADC, UART, I2C, SPI, alimentation 3,3 V."),
      T("esp-01-blink", "Faire clignoter une LED", "Sortie numérique, résistance, digitalWrite."),
      T("esp-02-bouton", "Lire un bouton : pull-up et rebonds", "Entrée numérique, résistance de tirage."),
      T("esp-03-pwm", "Varier la luminosité : la PWM", "Rapport cyclique, fréquence, résolution."),
      T("esp-04-adc", "Lire une tension : l'ADC", "Potentiomètre, 12 bits, non-linéarité."),
      T("esp-05-bus", "Bus UART, I2C et SPI", "Brancher un capteur et lire ses octets."),
      T("esp-06-niveaux", "Niveaux logiques 3,3 V / 5 V et alimentation", "Ne pas griller son ESP.")
    ] },
    { id: "drones", icone: "🚁", titre: "Drones", desc: "Moteurs brushless, hélices, batterie LiPo, contrôleur de vol, PID.", etapes: [
      C("drone", "Carte : le drone multirotor", "Structure, propulsion, énergie, électronique, pilotage."),
      T("dr-01-propulsion", "Poussée, poids et autonomie", "Choisir moteurs, hélices et batterie."),
      T("dr-02-pid", "Tenir l'altitude avec un PID", "Réglage P, I, D sur un drone simulé."),
      T("dr-03-mixage", "Mixage des moteurs : roulis, tangage, lacet", "Comment un quadricoptère se dirige.")
    ] },
    { id: "python", icone: "🐍", titre: "Python et data science", desc: "Les bases utiles à tes projets d'analyse.", etapes: [
      C("python", "Carte : Python et la data science", "Langage, pandas, statistiques, visualisation.")
    ] },
    { id: "ml-audio", icone: "🎧", titre: "Machine learning et audio", desc: "Apprentissage automatique, parole, traduction, évaluation.", etapes: [
      C("ml-audio", "Carte : machine learning et audio", "Données, modèles, entraînement, audio, évaluation.")
    ] },
    { id: "finance", icone: "📈", titre: "Finance et trading", desc: "Marchés, Forex, risque, backtest, saisonnalité.", etapes: [
      C("finance", "Carte : finance et trading", "Marchés, ordres, risque, analyse, backtest.")
    ] },
    { id: "git", icone: "🌿", titre: "Git, GitHub et outils", desc: "Versionner son travail et collaborer.", etapes: [
      C("git", "Carte : Git et GitHub", "Dépôt, commits, branches, PR, bonnes pratiques.")
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
