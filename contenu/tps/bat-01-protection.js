LS.ajouterTP({
  id: "bat-01-protection",
  titre: "Disjoncteur et section des câbles",
  domaine: "batiment", niveau: 1, duree: "30 min",
  sim: "protection",
  intro: "Un circuit de la maison : un disjoncteur au tableau, un câble en cuivre, et des appareils que tu allumes. Le courant chauffe le câble ; le disjoncteur doit le protéger. La norme (CEI 60364, NF C 15-100) demande **In ≤ Iz** (calibre inférieur au courant admissible du câble) et **I2 ≤ 1,45 Iz** (I2 : courant qui fait sûrement déclencher en 1 h, 1,45 In pour un disjoncteur domestique). Elle admet ainsi qu'une **surcharge modérée** fasse passer le câble au-dessus de 70 °C pendant un temps qui peut être long : l'isolant le supporte temporairement. Le temps est accéléré (60 fois par défaut) : la mesure « Temps simulé » donne la durée réelle pour l'installation.\n\nModèle : échauffement du câble du premier ordre (70 °C atteints au courant admissible Iz, pose encastrée), bilame ajusté sur les points conventionnels de la CEI 60898, seuil magnétique au milieu de la plage de la courbe. Ce sont des ordres de grandeur : la norme de ton pays fixe les valeurs exactes.",
  objectifs: [
    { texte: "Allume assez d'appareils pour dépasser **nettement** le calibre (environ 2 In) : le disjoncteur déclenche après un moment, par son **thermique**.",
      verif: s => s.etat.ouvert && s.etat.cause === "thermique" && !s.p.courtcircuit,
      bravo: "Le bilame a chauffé avec le câble. À 2 In, la coupure arrive après environ 1 min 40 s de temps simulé, c'est-à-dire dans l'installation réelle (moins de 2 s à l'écran en vitesse × 60) ; à 1,45 In, après environ 30 min. Plus la surcharge est forte, plus la coupure est rapide." },
    { texte: "Réarme, puis provoque un **court-circuit** en bout de ligne : la coupure est instantanée (**magnétique**).",
      verif: s => s.etat.ouvert && s.etat.cause === "magnetique",
      bravo: "Plusieurs centaines d'ampères : la bobine a ouvert le contact en quelques millisecondes." },
    { texte: "Le cas dangereux : mets un disjoncteur **32 A** sur un câble de **1,5 mm²**, allume four, radiateur et bouilloire. Le câble dépasse **70 °C** sans que rien ne coupe.",
      verif: s => s.p.calibre === 32 && s.p.section === 1.5 && s.etat.T > 70 && !s.etat.ouvert,
      indice: "Pense à décocher le court-circuit et à réarmer.",
      bravo: "31 A dans un câble prévu pour environ 17 A : le disjoncteur trouve le courant normal pour lui. C'est pour cela qu'on choisit le calibre d'après le câble, jamais d'après les appareils." },
    { texte: "Circuit correct : **2,5 mm²** protégé en **20 A**, plus de **15 A** consommés, et le câble reste sous 70 °C pendant **10 minutes simulées**.",
      verif: (s, m) => {
        const k = s.calc(), ok = s.p.section === 2.5 && s.p.calibre === 20 && k.I > 15 && s.etat.T < 70;
        if (!ok) { m.t0 = undefined; return false; }
        if (m.t0 === undefined) m.t0 = s.etat.tsim;
        const reste = 600 - (s.etat.tsim - m.t0);
        return reste <= 0 ? true : { ok: false, msg: "Encore " + Math.ceil(reste / 60) + " min simulées…" };
      } },
    { texte: "Surcharge **modérée** sur un circuit **conforme** : 1,5 mm² protégé en **16 A**, radiateur et bouilloire allumés (≈ 18 A, au-dessus de Iz = 17,5 A). Laisse tourner **20 minutes simulées** : le câble dépasse 70 °C et le disjoncteur n'a toujours pas coupé.",
      verif: (s, m) => {
        const k = s.calc(), ok = s.p.section === 1.5 && s.p.calibre === 16 && !s.p.courtcircuit && k.I > k.Iz && k.I < 1.45 * 16 && !s.etat.ouvert;
        if (!ok) { m.t0 = undefined; return false; }
        if (m.t0 === undefined) m.t0 = s.etat.tsim;
        const reste = 1200 - (s.etat.tsim - m.t0);
        return reste <= 0 && s.etat.T > 70 ? true : { ok: false, msg: reste > 0 ? "Encore " + Math.ceil(reste / 60) + " min simulées…" : "Attends que le câble dépasse 70 °C." };
      },
      bravo: "18,3 A, c'est 1,14 In : le bilame mettrait des semaines à couper, et le câble se stabilise vers 74 °C. La norme l'accepte (I2 = 1,45 × 16 = 23,2 A ≤ 1,45 Iz = 25,4 A) parce que la surcharge est supposée temporaire. En permanence, l'isolant vieillirait : on ne branche pas deux gros appareils de chauffe sur la même prise de 1,5 mm²." },
    { texte: "Ligne longue : **1,5 mm²**, **50 m** au moins, disjoncteur **16 A**. Avec la courbe C, la coupure magnétique d'un court-circuit n'est plus certaine. Trouve la courbe qui la garantit.",
      verif: s => { const Icc = 230 / (0.35 + LS.resistanceLigne(s.p.longueur, s.p.section, "cuivre")); return s.p.section === 1.5 && s.p.longueur >= 50 && s.p.calibre === 16 && s.p.courbe === "B" && LS.declenchementMagnetique(Icc, 16, "B") === "certain"; },
      bravo: "La résistance du câble limite le courant de court-circuit : sur une ligne longue, il faut un seuil magnétique plus bas (courbe B) ou une section plus forte." }
  ],
  questions: [
    { q: "Un disjoncteur protège avant tout…", choix: ["l'appareil branché", "le câble du circuit", "le compteur"], bonne: 1, explication: "Son calibre se choisit d'après le câble : In ≤ Iz et I2 ≤ 1,45 Iz. Le câble peut alors chauffer au-delà de 70 °C pendant une surcharge, mais seulement temporairement, ce que l'isolant supporte." },
    { q: "Radiateur 2 000 W + bouilloire 2 200 W sur une prise : quel courant ?", choix: ["≈ 9 A", "≈ 18 A", "≈ 4 200 A"], bonne: 1, explication: "4 200 W / 230 V ≈ 18,3 A, soit 1,14 In pour un 16 A : à peine au-dessus du seuil de non-déclenchement (1,13 In). Le disjoncteur peut ne pas couper avant des heures, voire des jours ; c'est la bouilloire, en s'arrêtant, qui fait cesser la surcharge." },
    { q: "Pourquoi une courbe D pour un gros moteur ?", choix: ["Il consomme plus en permanence", "Son courant de démarrage ferait déclencher une courbe B ou C", "Pour couper plus vite"], bonne: 1 }
  ],
  notions: [["batiment", "Disjoncteur"], ["batiment", "Surcharge"], ["batiment", "Court-circuit"], ["batiment", "Courbes B, C, D"], ["batiment", "Courbe de déclenchement thermique"], ["batiment", "Courant admissible"], ["batiment", "Sections usuelles"]],
  suite: "Regarde l'étiquette de ton tableau électrique : pour chaque circuit, note le calibre et devine la section du câble (sans ouvrir le tableau)."
});
