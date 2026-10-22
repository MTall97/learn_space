LS.ajouterCarte({
  id: "telecom-transmission",
  titre: "La transmission",
  intro: "Reprise de ta carte XMind « Transmission » : modes de transmission (série, parallèle, simplex, duplex), la fréquence, le signal (représentations, nature, types, signaux déterministes et aléatoires, bruit), l'information qu'il transporte et les supports.",
  racine: { t: "Transmission", c: [
    { t: "Série", d: "Les bits sont envoyés **les uns après les autres** sur un seul fil (ou une seule paire). Peu de fils, longues distances, très hauts débits possibles : USB, Ethernet, fibre, UART, I2C, SPI.", tp: "tel-04-liaison-serie", c: [
      { t: "Synchrone", d: "L'émetteur et le récepteur partagent une **horloge** : soit sur un fil dédié (SPI, I2C), soit récupérée dans le signal (Ethernet, USB). Les bits se suivent sans interruption.", tp: "tel-04-liaison-serie" },
      { t: "Asynchrone", d: "Pas d'horloge commune : chaque caractère est encadré d'un bit de **start** et d'un bit de **stop**, et les deux côtés doivent être réglés à la même vitesse (bauds). UART, RS-232.", tp: "tel-04-liaison-serie" }
    ] },
    { t: "Parallèle", d: "Plusieurs bits envoyés **en même temps** sur plusieurs fils (8, 16, 32…). Rapide sur de courtes distances (bus internes, anciennes imprimantes) mais les fils interfèrent et les bits se décalent sur de longues distances : on lui préfère aujourd'hui des liaisons série rapides." },
    { t: "Mode de transmission", d: "Sens dans lequel l'information peut circuler sur la liaison.", c: [
      { t: "Simplex", note: "Télévision, radio", d: "Transmission dans **un seul sens**, de l'émetteur vers le récepteur." },
      { t: "Duplex", d: "Transmission dans les deux sens.", c: [
        { t: "Half duplex", note: "Talkie-walkie", d: "Dans les deux sens, mais **chacun son tour** (à l'alternat) : on appuie pour parler, on relâche pour écouter." },
        { t: "Full duplex", note: "Téléphone", d: "Dans les deux sens **en même temps** : deux canaux (deux paires, deux fréquences ou deux intervalles de temps)." }
      ] }
    ] },
    { t: "Fréquence", d: "Nombre de variations (périodes) d'un signal par seconde, en hertz. Une information qui ne varie pas n'apprend rien : transmettre, c'est faire varier un signal, donc utiliser des fréquences. Le spectre radio est découpé en bandes attribuées (FM 88–108 MHz, Wi-Fi 2,4 et 5 GHz…).", f: "f = 1 / T", tp: "tel-01-signal" },
    { t: "Signal", d: "Grandeur physique (tension, lumière, onde radio, son) dont les variations transportent une information.", tp: "tel-01-signal", voir: ["Informations"], c: [
      { t: "Représentation", c: [
        { t: "Représentation temporelle", d: "Évolution du signal en fonction du **temps** : ce qu'affiche un oscilloscope.", tp: "tel-01-signal" },
        { t: "Représentation fréquentielle", d: "Amplitude (et phase) de chaque composante sinusoïdale en fonction de la **fréquence** : le spectre, obtenu par la transformée de Fourier.", tp: "tel-01-signal" },
        { t: "Représentation spectrale", d: "Répartition de la **puissance** (ou de l'énergie) du signal selon la fréquence : densité spectrale de puissance. Elle s'applique aussi aux signaux aléatoires, pour lesquels on ne peut pas tracer un spectre exact. C'est ce que montre un analyseur de spectre." }
      ] },
      { t: "Nature", c: [
        { t: "Analogique", d: "Signal qui varie de façon **continue** et peut prendre une infinité de valeurs (voix captée par un micro, ancienne radio).", tp: "tel-02-modulation" },
        { t: "Numérique", d: "Signal qui ne prend qu'un nombre **fini** de valeurs (souvent deux : 0 et 1) à des instants réguliers. Moins sensible au bruit, se régénère sans perte, se compresse, se chiffre.", tp: "tel-02-modulation" }
      ] },
      { t: "Type", note: "Lumineux | Sonore | Électrique | Radio | Olfactif", d: "Nature physique du support du signal : **lumineux** (fibre optique, feux), **sonore** (voix, sonar), **électrique** (câbles), **radio** (ondes électromagnétiques), **olfactif** (odeurs : signal chimique, utilisé par les animaux)." },
      { t: "Déterministe", d: "Signal dont on peut prévoir exactement les valeurs futures (on connaît sa formule).", c: [
        { t: "Périodique", d: "Se répète identique à lui-même avec une période T (sinusoïde, carré)." },
        { t: "Pseudo périodique", d: "Ressemble à un signal périodique mais son amplitude varie, typiquement en décroissant : oscillations amorties (corde pincée, circuit RLC)." },
        { t: "Quasi périodique", d: "Somme de sinusoïdes dont les fréquences n'ont pas de rapport rationnel : il ne se répète jamais exactement, tout en restant prévisible." },
        { t: "Non périodique", d: "Signal prévisible qui ne se répète pas : impulsion, échelon, signal transitoire." }
      ] },
      { t: "Aléatoire", d: "Signal dont on ne peut pas prévoir les valeurs ; on le décrit par des statistiques (moyenne, variance, spectre).", c: [
        { t: "Stationnaires", d: "Leurs propriétés statistiques ne changent pas avec le temps (bruit thermique d'une résistance)." },
        { t: "Non stationnaires", d: "Leurs statistiques évoluent dans le temps (parole, musique, trafic réseau)." }
      ] },
      { t: "Bruit", d: "Signal parasite, en général aléatoire, qui s'ajoute au signal utile : bruit thermique, parasites électriques, interférences. On mesure la qualité d'une liaison par le **rapport signal/bruit** (S/N) en décibels.", f: "S/N (dB) = 10·log₁₀(P_signal / P_bruit)", tp: ["tel-01-signal", "tel-03-bande-passante"] },
      { t: "Modulation", d: "Modification d'une onde **porteuse** (amplitude, fréquence ou phase) au rythme du message, pour l'adapter au support : AM, FM, ASK, FSK, PSK, QAM.", tp: "tel-02-modulation" },
      { t: "Porteuse", d: "Onde sinusoïdale de fréquence élevée, propre à chaque canal, qui « porte » le message une fois modulée.", tp: "tel-02-modulation" }
    ] },
    { t: "Informations", d: "Ce que le signal **permet de transporter** : voix, texte, image, données. En numérique, la quantité d'information se mesure en bits ; le **débit** en bits par seconde." },
    { t: "Les supports", d: "Milieux physiques qui transportent le signal.", c: [
      { t: "Les caractéristiques", c: [
        { t: "Bande passante", d: "Plage de fréquences que le support transmet sans trop les atténuer (largeur en Hz). Elle limite le débit possible.", tp: "tel-03-bande-passante" },
        { t: "Débit", d: "Quantité d'information transmise par seconde (bit/s). Limité par la bande passante (Nyquist : ≈ 2B pour deux niveaux) et le bruit (Shannon).", f: "C = B · log₂(1 + S/N)", tp: "tel-03-bande-passante" },
        { t: "Modulation du support", d: "Technique de modulation adaptée au support : les modulations à plusieurs niveaux (QAM-256 en Wi-Fi) transmettent plus de bits par hertz, mais exigent un bon rapport signal/bruit." },
        { t: "Fréquence du support", d: "Plage de fréquences de travail d'un support : quelques kHz pour la paire téléphonique, des centaines de MHz pour le coaxial, des centaines de THz (lumière) pour la fibre, des MHz aux GHz pour la radio." },
        { t: "Atténuation", d: "Perte de puissance du signal avec la distance, en dB/km. Elle impose des amplificateurs ou des répéteurs." }
      ] },
      { t: "Les types", c: [
        { t: "Paire torsadée", d: "Deux fils de cuivre torsadés (pour limiter les parasites) : téléphone, Ethernet (câble RJ45 à 4 paires, catégories 5e, 6, 7). Jusqu'à 100 m en Ethernet.", tp: "tel-03-bande-passante" },
        { t: "Câble coaxial", d: "Âme centrale entourée d'un isolant et d'un blindage : télévision, antennes, anciens réseaux. Bonne bande passante, bien protégé des parasites." },
        { t: "Fibre optique", d: "Fil de verre dans lequel la lumière se propage par réflexions. Bande passante énorme, très faible atténuation, insensible aux parasites électromagnétiques : liaisons longue distance, FTTH.", tp: "tel-03-bande-passante" },
        { t: "Ondes radio (hertzien)", d: "Propagation dans l'air ou le vide : radio, télévision, téléphonie mobile, Wi-Fi, satellites, faisceaux hertziens. Pas de câble, mais support partagé et perturbé (obstacles, interférences)." }
      ] }
    ] }
  ] }
});
