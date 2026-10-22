LS.ajouterTP({
  id: "elec-01-premier-circuit",
  titre: "Premier circuit : pile, interrupteur, lampe",
  domaine: "electricite", niveau: 1, duree: "15 min",
  sim: "circuit",
  intro: "Voici le circuit le plus simple : une **pile** (le générateur), un **interrupteur** et une **lampe** (le récepteur), reliés par des fils. Les petits points jaunes représentent le courant. Clique sur l'interrupteur pour le sélectionner, puis clique encore dessus (ou sur « ⇄ Basculer ») pour le fermer.",
  config: {
    palette: ["pile", "lampe", "interrupteur", "resistance"],
    schema: {
      compos: [
        { type: "pile", x: 8, y: 16, p: { U: 4.5, r: 0.5 }, nom: "G1" },
        { type: "interrupteur", x: 8, y: 6, nom: "K1" },
        { type: "lampe", x: 20, y: 9, rot: 90, p: { Un: 6, Pn: 0.5 }, nom: "L1" }
      ],
      fils: [
        { pts: [[8, 16], [4, 16], [4, 6], [8, 6]] },
        { pts: [[12, 6], [20, 6], [20, 9]] },
        { pts: [[20, 13], [20, 16], [12, 16]] }
      ]
    }
  },
  objectifs: [
    { texte: "Ferme l'interrupteur **K1** : la lampe s'allume.", indice: "Clique une fois sur K1 pour le choisir, une deuxième fois pour le basculer.",
      verif: s => s.liste("lampe").some(l => Math.abs(s.I(l)) > 0.04), bravo: "Le circuit est fermé : le courant circule de la borne + vers la borne −." },
    { texte: "Ouvre à nouveau K1 et regarde les points jaunes : le courant s'arrête **partout**, pas seulement après l'interrupteur.",
      verif: (s, m) => {
        const k = s.liste("interrupteur")[0];
        if (k && k.p.ferme) m.ferme = true;
        return !!(m.ferme && k && !k.p.ferme && s.liste("lampe").every(l => Math.abs(s.I(l)) < 1e-4));
      } },
    { texte: "Ajoute une **deuxième lampe en série** avec la première (sur le même chemin) et ferme le circuit. Compare l'éclat des lampes avec le montage à une seule lampe.",
      indice: "Supprime un fil (clique dessus puis 🗑), pose une lampe, puis relie ses deux bornes pour refermer le circuit. Clique sur une lampe pour lire sa tension et son courant.",
      verif: s => {
        const l = s.liste("lampe").filter(x => Math.abs(s.I(x)) > 0.005);
        if (l.length < 2) return false;
        const i0 = Math.abs(s.I(l[0]));
        return l.every(x => Math.abs(Math.abs(s.I(x)) - i0) < 0.01 * i0);
      }, bravo: "Le même courant traverse les deux lampes : c'est la signature d'un montage en série. Chaque lampe ne reçoit que la moitié de la tension, elle éclaire moins." },
    { texte: "Expérience à ne jamais faire en vrai : relie **directement** les deux bornes de la pile par un fil (court-circuit) et lis l'alerte en cliquant sur la pile. Retire ensuite ce fil.",
      verif: (s, m) => {
        const g = s.liste("pile")[0];
        if (g && g.etat && /Court-circuit/.test(g.etat.alerte || "")) m.vu = true;
        return !!(m.vu && g && !(g.etat && g.etat.alerte));
      }, bravo: "Le courant n'est limité que par la résistance interne de la pile : il devient énorme. En vrai, la pile chauffe et peut exploser ; une batterie de voiture peut faire fondre un outil." }
  ],
  questions: [
    { q: "Interrupteur ouvert, quelle est la tension entre ses deux bornes ?", choix: ["0 V : aucun courant ne passe", "Environ la tension de la pile (4,5 V)", "La moitié de la tension de la pile"], bonne: 1,
      explication: "Aucun courant ne passe, donc la lampe n'a aucune tension à ses bornes (U = R·I = 0) : toute la tension de la pile se retrouve aux bornes de la coupure. Vérifie-le avec le multimètre (🔌)." },
    { q: "Dans un fil, dans quel sens se déplacent les électrons ?", choix: ["De la borne + vers la borne −", "De la borne − vers la borne +, à l'extérieur de la pile", "Ils ne bougent pas"], bonne: 1,
      explication: "Le sens conventionnel du courant (+ vers −) a été choisi avant la découverte de l'électron, qui est négatif et va dans l'autre sens. Coche « sens des électrons » pour le voir." },
    { q: "Deux lampes identiques en série sur 4,5 V : quelle tension aux bornes de chacune ?", choix: ["4,5 V", "2,25 V", "9 V"], bonne: 1, explication: "Les tensions s'additionnent en série : 2,25 + 2,25 = 4,5 V (loi des mailles)." }
  ],
  notions: [["elec-bases", "Circuit fermé"], ["elec-bases", "Courant électrique"], ["elec-bases", "Sens conventionnel"], ["elec-bases", "Court-circuit"], ["elec-bases", "En série"]],
  suite: "Essaie une pile de 12 V avec une seule lampe 6 V : que se passe-t-il ? (bouton 🛠 Réparer pour changer la lampe)."
});
