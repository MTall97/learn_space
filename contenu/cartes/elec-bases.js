LS.ajouterCarte({
  id: "elec-bases",
  titre: "Les bases de l'électricité",
  intro: "L'électricité, c'est le **déplacement de charges électriques** (des électrons dans les métaux). Cette carte présente les grandeurs qu'on mesure, les lois qui relient ces grandeurs, la façon d'associer les composants, les appareils de mesure et les règles de sécurité.",
  racine: { t: "Électricité", c: [
    { t: "Grandeurs", note: "Ce qu'on mesure", c: [
      { t: "Charge électrique", d: "Quantité d'électricité portée par une particule ou un objet. L'électron porte la plus petite charge négative : −1,6 × 10⁻¹⁹ C. Des charges de même signe se repoussent, de signes contraires s'attirent.", f: "Symbole Q · unité : coulomb (C)" },
      { t: "Courant électrique", d: "Débit de charges qui traversent une section du conducteur en une seconde. Il est le même en tout point d'un circuit en série. Par convention, il sort par la borne + du générateur ; les électrons, eux, circulent en sens inverse.", f: "I = Q / t · unité : ampère (A)", an: "Le débit d'eau dans un tuyau (litres par seconde).", tp: "elec-01-premier-circuit", voir: ["Sens conventionnel"] },
      { t: "Sens conventionnel", d: "Sens choisi historiquement pour le courant : de la borne + vers la borne − à l'extérieur du générateur. Les électrons se déplacent dans l'autre sens, mais toutes les lois s'écrivent avec le sens conventionnel.", attention: "Dans le simulateur, coche « sens des électrons » pour voir leur vrai sens de déplacement." },
      { t: "Tension électrique", d: "Différence de potentiel entre deux points : c'est elle qui « pousse » le courant. Elle se mesure **entre deux points** (on dit « aux bornes » d'un composant).", f: "U_AB = V_A − V_B · unité : volt (V)", an: "La différence de hauteur d'eau entre deux réservoirs : plus elle est grande, plus l'eau coule fort.", tp: "elec-02-loi-ohm" },
      { t: "Potentiel", d: "Niveau électrique d'un point, mesuré par rapport à une référence appelée **masse** (0 V). Deux points reliés par un fil ont le même potentiel.", ex: "Dans le simulateur, les fils sont colorés selon leur potentiel : rouge = haut, gris = 0 V." },
      { t: "Résistance", d: "Capacité d'un composant à s'opposer au passage du courant. Elle dépend du matériau, de la longueur et de la section du conducteur, et de la température.", f: "R = ρ·L / S · unité : ohm (Ω)", an: "Un tuyau étroit freine l'eau.", tp: "elec-02-loi-ohm" },
      { t: "Puissance", d: "Énergie transformée par seconde. Un composant qui reçoit de la puissance la transforme en chaleur, lumière, mouvement…", f: "P = U × I · unité : watt (W)\nPour une résistance : P = R·I² = U²/R" },
      { t: "Énergie", d: "Puissance multipliée par la durée. C'est ce que facture le fournisseur d'électricité (en kWh).", f: "E = P × t · unités : joule (J) ou kilowattheure (1 kWh = 3,6 MJ)", ex: "Une lampe de 10 W allumée 5 h consomme 50 Wh = 0,05 kWh." },
      { t: "Fréquence", d: "Nombre de répétitions d'un phénomène par seconde, pour une grandeur qui varie périodiquement (courant alternatif).", f: "f = 1 / T · unité : hertz (Hz)", ex: "Le réseau électrique en Afrique de l'Ouest et en Europe : 50 Hz." }
    ] },
    { t: "Circuit", note: "Un chemin fermé", c: [
      { t: "Circuit fermé", d: "Chemin continu qui part d'une borne du générateur et revient à l'autre. Le courant ne circule que si le circuit est fermé.", tp: "elec-01-premier-circuit" },
      { t: "Circuit ouvert", d: "Circuit coupé quelque part (interrupteur ouvert, fil débranché, lampe grillée) : aucun courant ne circule, mais une tension peut exister aux bornes de la coupure." },
      { t: "Court-circuit", d: "Liaison quasi sans résistance entre deux points de potentiels différents, souvent les bornes d'un générateur. Le courant devient énorme : échauffement, incendie, destruction de la source.", attention: "Ne jamais relier directement les bornes d'une pile ou d'une prise.", tp: "elec-01-premier-circuit" },
      { t: "Générateur", d: "Dipôle qui fournit l'énergie électrique au circuit (pile, batterie, alimentation, alternateur). Il impose une tension (générateur de tension) ou un courant." },
      { t: "Récepteur", d: "Dipôle qui reçoit l'énergie électrique et la transforme (lampe → lumière et chaleur, moteur → mouvement, résistance → chaleur)." },
      { t: "Résistance interne", d: "Résistance propre d'un générateur réel. Quand il débite un courant I, sa tension aux bornes baisse.", f: "U = E − r·I", ex: "Une pile usée a une résistance interne élevée : sa tension s'effondre dès qu'on branche un moteur." },
      { t: "Masse", d: "Point choisi comme référence des potentiels (0 V). Sur un schéma, symbole ⏚. En automobile, la carrosserie sert de masse (borne − de la batterie)." }
    ] },
    { t: "Lois", note: "Les règles du jeu", c: [
      { t: "Loi d'Ohm", d: "Pour un conducteur ohmique (une résistance), la tension à ses bornes est proportionnelle au courant qui le traverse.", f: "U = R × I  ⇔  I = U / R  ⇔  R = U / I", ex: "6 V aux bornes de 100 Ω → I = 6 / 100 = 0,06 A = 60 mA.", tp: "elec-02-loi-ohm" },
      { t: "Loi des nœuds", d: "En un nœud (point où se rejoignent au moins trois fils), la somme des courants qui arrivent est égale à la somme des courants qui repartent : les charges ne s'accumulent pas.", f: "Σ I entrants = Σ I sortants", tp: "elec-07-kirchhoff" },
      { t: "Loi des mailles", d: "Le long d'une boucle fermée (maille), la somme algébrique des tensions est nulle.", f: "Σ U = 0 en tournant dans la maille", tp: "elec-07-kirchhoff" },
      { t: "Effet Joule", d: "Tout conducteur parcouru par un courant chauffe. Utile (radiateur, fusible, fer à repasser) ou gênant (pertes dans les câbles).", f: "P = R × I²", voir: ["Fusible"] }
    ] },
    { t: "Associations", c: [
      { t: "En série", d: "Composants placés l'un après l'autre sur un seul chemin. Même courant partout ; les tensions s'additionnent. Si un composant coupe, tout s'arrête.", f: "R_éq = R1 + R2 + …", tp: "elec-04-serie-parallele" },
      { t: "En parallèle (dérivation)", d: "Composants branchés entre les deux mêmes points. Même tension pour tous ; les courants s'additionnent. Chaque branche fonctionne indépendamment (c'est le cas des prises d'une maison).", f: "1/R_éq = 1/R1 + 1/R2 + …\nPour deux : R_éq = R1·R2 / (R1 + R2)", tp: "elec-04-serie-parallele" },
      { t: "Diviseur de tension", d: "Deux résistances en série : la tension se partage proportionnellement aux résistances.", f: "U2 = U × R2 / (R1 + R2)", ex: "9 V, R1 = 1 kΩ, R2 = 2 kΩ → U2 = 6 V.", tp: "elec-05-diviseur", attention: "Si on branche une charge sur la sortie, la tension baisse (la charge est en parallèle sur R2)." },
      { t: "Diviseur de courant", d: "Deux résistances en parallèle : le courant se partage, et passe surtout par la plus petite résistance.", f: "I1 = I × R2 / (R1 + R2)" }
    ] },
    { t: "Mesures", note: "Les instruments", c: [
      { t: "Multimètre", d: "Appareil qui mesure tension, courant, résistance (et souvent continuité, diodes, capacité). On choisit la grandeur avec le sélecteur et on branche le cordon rouge dans la bonne douille (VΩ, mA ou 10A), le noir toujours dans COM.", tp: "elec-03-multimetre", attention: "Cordon rouge dans la douille A et mesure d'une tension = court-circuit : le fusible du multimètre fond." },
      { t: "Voltmètre", d: "Mesure une tension. Il se branche **en dérivation** (en parallèle) aux bornes du composant. Sa résistance interne est très grande (≈ 10 MΩ) pour ne pas perturber le circuit.", tp: "elec-03-multimetre" },
      { t: "Ampèremètre", d: "Mesure un courant. Il se branche **en série** : il faut ouvrir le circuit et le faire traverser par le courant. Sa résistance est très faible.", tp: "elec-03-multimetre", attention: "Branché en parallèle sur une source, il fait un court-circuit." },
      { t: "Ohmmètre", d: "Mesure une résistance en y faisant passer un petit courant de test. On mesure **hors tension** et, si possible, composant débranché (sinon on mesure aussi ce qui est en parallèle).", tp: "elec-03-multimetre" },
      { t: "Continuité", d: "Fonction du multimètre qui bipe quand la résistance entre les pointes est très faible : idéal pour trouver un fil coupé ou vérifier une soudure.", tp: "elec-11-panne" },
      { t: "Oscilloscope", d: "Appareil qui trace l'évolution d'une tension au cours du temps. Réglages : base de temps (s/div) en horizontal, sensibilité (V/div) en vertical.", tp: "elec-12-alternatif" },
      { t: "Calibre", d: "Valeur maximale mesurable dans une position du sélecteur. Au-delà, l'appareil affiche « OL » (over load). Les multimètres modernes choisissent souvent le calibre seuls (auto-range)." }
    ] },
    { t: "Sécurité", note: "Le courant peut tuer", c: [
      { t: "Danger du courant", d: "C'est le courant qui traverse le corps qui est dangereux : dès 30 mA, risque de paralysie respiratoire ; au-delà de 75 mA, fibrillation cardiaque. Le corps humain a une résistance de l'ordre de 1 000 à 5 000 Ω : 230 V suffisent à tuer.", attention: "Ne jamais travailler sur une installation sous tension." },
      { t: "Très basse tension", d: "En dessous de 50 V alternatif ou 120 V continu (TBT), le risque d'électrocution est très faible dans des conditions normales : c'est le domaine des piles, batteries 12 V, cartes électroniques." },
      { t: "Fusible", d: "Fil calibré qui fond quand le courant dépasse sa valeur nominale pendant un certain temps : il coupe le circuit et le protège d'un court-circuit ou d'une surcharge. Il se remplace après chaque défaut.", tp: "elec-bac-a-sable" },
      { t: "Disjoncteur", d: "Interrupteur automatique qui s'ouvre en cas de surintensité (élément magnétique pour les courts-circuits, thermique pour les surcharges). Il se réarme." },
      { t: "Différentiel", d: "Dispositif qui compare le courant qui part par la phase et celui qui revient par le neutre. Une différence (fuite à la terre, par une personne par exemple) de 30 mA le fait déclencher." },
      { t: "Mise à la terre", d: "Liaison des carcasses métalliques des appareils à la terre : en cas de défaut, le courant de fuite passe par la terre et fait déclencher le différentiel au lieu de passer par la personne." }
    ] }
  ] }
});
