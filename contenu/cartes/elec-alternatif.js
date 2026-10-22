LS.ajouterCarte({
  id: "elec-alternatif",
  titre: "Le courant alternatif",
  intro: "Le réseau électrique fournit une tension qui change de sens 100 fois par seconde (50 périodes). Cette carte explique comment la décrire (amplitude, période, valeur efficace), comment se comportent R, L et C en alternatif, ce que sont les puissances active et réactive, et le triphasé.",
  racine: { t: "Courant alternatif", c: [
    { t: "Signal sinusoïdal", d: "Tension ou courant qui varie comme une sinusoïde : u(t) = Û·sin(2π·f·t + φ). C'est la forme produite naturellement par un alternateur qui tourne.", tp: "elec-12-alternatif", c: [
      { t: "Valeur crête", d: "Valeur maximale atteinte, notée Û (ou Umax). L'amplitude crête-à-crête vaut 2·Û.", ex: "Réseau 230 V : Û ≈ 325 V." },
      { t: "Période", d: "Durée d'un motif complet, notée T, en secondes.", f: "T = 1 / f", ex: "50 Hz → T = 20 ms." },
      { t: "Fréquence (alternatif)", d: "Nombre de périodes par seconde, en hertz (Hz). 50 Hz en Europe et en Afrique de l'Ouest, 60 Hz aux États-Unis." },
      { t: "Pulsation", d: "Vitesse angulaire de la sinusoïde, en radians par seconde.", f: "ω = 2π·f" },
      { t: "Déphasage", d: "Décalage dans le temps entre deux sinusoïdes de même fréquence, exprimé en degrés ou en radians (φ). Une bobine retarde le courant sur la tension, un condensateur l'avance." },
      { t: "Valeur efficace", d: "Valeur de la tension continue qui produirait le même échauffement dans une résistance. C'est la valeur annoncée (230 V) et celle qu'affiche un multimètre en mode AC.", f: "Pour un sinus : U_eff = Û / √2 ≈ 0,707·Û", tp: "elec-12-alternatif" },
      { t: "Valeur moyenne", d: "Moyenne sur une période : nulle pour une sinusoïde (autant de positif que de négatif). Elle n'est pas nulle pour une tension redressée ou décalée." }
    ] },
    { t: "Impédance", d: "Généralisation de la résistance en alternatif : rapport des valeurs efficaces U/I, en ohms. Elle dépend de la fréquence pour les bobines et les condensateurs.", f: "Z = U_eff / I_eff", c: [
      { t: "Réactance de la bobine", d: "Une bobine s'oppose d'autant plus au courant que la fréquence est haute.", f: "X_L = L·ω = 2π·f·L" },
      { t: "Réactance du condensateur", d: "Un condensateur laisse d'autant mieux passer le courant que la fréquence est haute ; en continu (f = 0), il bloque.", f: "X_C = 1 / (C·ω)" },
      { t: "Résonance", d: "Dans un circuit RLC, à la fréquence où X_L = X_C, les effets de la bobine et du condensateur s'annulent : courant maximal (série). Base des circuits d'accord radio.", f: "f₀ = 1 / (2π·√(L·C))" }
    ] },
    { t: "Puissances", c: [
      { t: "Puissance active", d: "Puissance réellement transformée en chaleur, lumière, travail mécanique. En watts.", f: "P = U·I·cos φ" },
      { t: "Puissance réactive", d: "Puissance qui fait des allers-retours entre la source et les bobines / condensateurs sans être consommée. En voltampères réactifs (var). Elle charge inutilement les câbles.", f: "Q = U·I·sin φ" },
      { t: "Puissance apparente", d: "Produit des valeurs efficaces, en voltampères (VA) : c'est ce que doivent supporter les câbles et transformateurs.", f: "S = U·I ; S² = P² + Q²" },
      { t: "Facteur de puissance", d: "Rapport P / S (cos φ pour du sinusoïdal). Proche de 1 : bonne utilisation de l'installation. Les moteurs ont un cos φ ≈ 0,8 ; on le relève avec des condensateurs." }
    ] },
    { t: "Triphasé", d: "Trois tensions sinusoïdales de même amplitude, décalées de 120°, transportées par trois fils de phase (et souvent un neutre). Il permet de transporter plus de puissance avec moins de cuivre et crée naturellement un champ tournant pour les moteurs.", tp: "em-05-asynchrone", c: [
      { t: "Tension simple", d: "Tension entre une phase et le neutre : 230 V en basse tension." },
      { t: "Tension composée", d: "Tension entre deux phases : √3 fois la tension simple.", f: "U = √3·V ≈ 400 V" },
      { t: "Couplage étoile et triangle", d: "Façons de brancher les trois enroulements d'un moteur : en **étoile** (chacun sous 230 V), en **triangle** (chacun sous 400 V). Le démarrage étoile-triangle limite le courant d'appel." }
    ] },
    { t: "Installation domestique", d: "Réseau monophasé 230 V / 50 Hz : phase, neutre et terre. Le tableau électrique comporte le disjoncteur de branchement, les interrupteurs différentiels 30 mA et un disjoncteur par circuit (10 A éclairage, 16 A prises, 32 A cuisson…). Les appareils sont en parallèle.", tp: "elec-08-va-et-vient", attention: "La phase doit être coupée par l'interrupteur ; on travaille toujours hors tension, après vérification d'absence de tension." }
  ] }
});
