LS.ajouterCarte({
  id: "electronique",
  titre: "L'électronique",
  intro: "L'électronique utilise des **semi-conducteurs** pour redresser, réguler, amplifier, commuter et filtrer des signaux. Cette carte suit le chemin d'une alimentation (du secteur au 5 V régulé), puis présente transistors, amplificateurs et filtres.",
  racine: { t: "Électronique", c: [
    { t: "Semi-conducteur", d: "Matériau (silicium surtout) dont la conductivité se règle en y ajoutant des impuretés (**dopage**). C'est la base des diodes, transistors et circuits intégrés.", c: [
      { t: "Dopage N et P", d: "Dopage N : on ajoute des atomes qui apportent des électrons libres (porteurs négatifs). Dopage P : des atomes qui créent des « trous » (porteurs positifs)." },
      { t: "Jonction PN", d: "Zone de contact entre silicium P et N. Elle conduit dans un sens (P vers N) au-delà d'environ 0,6 V et bloque dans l'autre : c'est une diode." }
    ] },
    { t: "Alimentation", d: "Chaîne qui transforme le 230 V alternatif en tension continue basse et stable : transformateur → redressement → lissage → régulation. Les chargeurs modernes sont des alimentations **à découpage**, plus petites et efficaces.", c: [
      { t: "Redressement", d: "Transformation de l'alternatif en une tension de signe constant, grâce à des diodes. Simple alternance (une diode, on perd la moitié) ou double alternance.", tp: "elec-14-redressement" },
      { t: "Pont de Graetz", d: "Quatre diodes en losange qui redressent les deux alternances : deux diodes conduisent à chaque alternance. Perte : deux seuils de diode (≈ 1,4 V).", tp: "elec-14-redressement" },
      { t: "Lissage", d: "Un condensateur en parallèle sur la sortie se charge aux crêtes et alimente la charge entre deux crêtes : la tension devient presque continue, avec une petite **ondulation**.", f: "Ondulation ≈ I / (f × C)", tp: "elec-14-redressement" },
      { t: "Régulation", d: "Maintien d'une tension de sortie constante malgré les variations de l'entrée et de la consommation : diode Zener (simple), régulateur linéaire (7805, LDO), ou convertisseur à découpage (buck, boost).", tp: "elec-15-zener" },
      { t: "Régulateur linéaire", d: "Circuit (7805, AMS1117…) qui abaisse la tension en dissipant la différence en chaleur. Il lui faut une marge (chute minimale ≈ 1–2 V, moins pour un LDO).", f: "P perdue = (U_entrée − U_sortie) × I" },
      { t: "Convertisseur à découpage", d: "Hache la tension à haute fréquence et la filtre avec bobine et condensateur : rendement 85–95 %, peut abaisser (buck) ou élever (boost) la tension. Chargeurs USB, alimentations de PC." }
    ] },
    { t: "Transistor bipolaire", d: "Trois pattes : base, collecteur, émetteur. Un courant de base Ib autorise un courant de collecteur Ic jusqu'à β·Ib (β ≈ 50 à 400). NPN : le courant entre par le collecteur ; PNP : sort par le collecteur.", f: "Ic = β·Ib (régime linéaire) ; Ie = Ib + Ic", tp: "elec-16-transistor", c: [
      { t: "Blocage", d: "Ib = 0 : aucun courant de collecteur, le transistor est un interrupteur ouvert." },
      { t: "Saturation", d: "Ib assez grand pour que Ic soit limité par le reste du circuit : Vce ≈ 0,1–0,2 V, le transistor est un interrupteur fermé. On prend Ib ≈ Ic / 10 pour être sûr de saturer.", tp: "elec-16-transistor" },
      { t: "Régime linéaire", d: "Entre blocage et saturation, Ic suit β·Ib : le transistor amplifie. Base des amplificateurs audio.", tp: "elec-16-transistor" }
    ] },
    { t: "MOSFET", d: "Transistor commandé en **tension** (grille), presque sans courant de commande. Très faible résistance à l'état passant : idéal pour commuter de fortes charges (moteurs de drone, LED de puissance) depuis un microcontrôleur. Choisir un modèle « logic level » pour une commande en 3,3 V." },
    { t: "Amplificateur opérationnel", d: "Circuit intégré à très grand gain qui, avec quelques résistances, amplifie, compare, additionne ou filtre des signaux (AOP, « ampli-op »).", c: [
      { t: "Comparateur", d: "Sans contre-réaction, la sortie bascule au maximum ou au minimum selon que l'entrée + est au-dessus ou au-dessous de l'entrée −." },
      { t: "Amplificateur non inverseur", d: "Gain fixé par deux résistances.", f: "G = 1 + R2 / R1" },
      { t: "Suiveur", d: "Gain 1, mais très grande impédance d'entrée : il « isole » une source fragile (diviseur, capteur) de la charge." }
    ] },
    { t: "Filtres", c: [
      { t: "Filtre passe-bas", d: "Laisse passer les basses fréquences et atténue les hautes. RC : résistance en série, condensateur vers la masse.", tp: "elec-13-filtre" },
      { t: "Filtre passe-haut", d: "Laisse passer les hautes fréquences, bloque le continu. RC : condensateur en série, résistance vers la masse." },
      { t: "Fréquence de coupure", d: "Fréquence où la sortie vaut 0,707 fois l'entrée (−3 dB, la moitié de la puissance).", f: "fc = 1 / (2π·R·C)", tp: "elec-13-filtre" }
    ] },
    { t: "Oscillateurs", d: "Circuits qui produisent un signal périodique : horloge d'un microcontrôleur (quartz), clignotant, générateur de son. Le NE555 est le circuit classique pour faire clignoter une LED ou générer une PWM." }
  ] }
});
