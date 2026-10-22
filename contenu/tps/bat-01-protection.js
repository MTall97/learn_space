LS.ajouterTP({
  id: "bat-01-protection",
  titre: "Disjoncteur et section des câbles",
  domaine: "batiment", niveau: 1, duree: "30 min",
  sim: "protection",
  intro: "Un circuit de la maison : un disjoncteur au tableau, un câble en cuivre, et des appareils que tu allumes. Le courant chauffe le câble ; le disjoncteur doit couper **avant** que l'isolant ne dépasse 70 °C. Le temps est accéléré (60 fois par défaut) pour voir le câble chauffer.\n\nModèle : échauffement du câble du premier ordre (70 °C atteints au courant admissible Iz, pose encastrée), bilame ajusté sur les points conventionnels de la CEI 60898, seuil magnétique au milieu de la plage de la courbe. Ce sont des ordres de grandeur : la norme de ton pays fixe les valeurs exactes.",
  objectifs: [
    { texte: "Allume assez d'appareils pour dépasser **nettement** le calibre (environ 2 In) : le disjoncteur déclenche après un moment, par son **thermique**.",
      verif: s => s.etat.ouvert && s.etat.cause === "thermique" && !s.p.courtcircuit,
      bravo: "Le bilame a chauffé avec le câble : la coupure arrive au bout d'une à deux minutes réelles à 2 In, bien avant que le câble ne soit en danger." },
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
    { texte: "Ligne longue : **1,5 mm²**, **50 m** au moins, disjoncteur **16 A**. Avec la courbe C, la coupure magnétique d'un court-circuit n'est plus certaine. Trouve la courbe qui la garantit.",
      verif: s => { const Icc = 230 / (0.35 + LS.resistanceLigne(s.p.longueur, s.p.section, "cuivre")); return s.p.section === 1.5 && s.p.longueur >= 50 && s.p.calibre === 16 && s.p.courbe === "B" && LS.declenchementMagnetique(Icc, 16, "B") === "certain"; },
      bravo: "La résistance du câble limite le courant de court-circuit : sur une ligne longue, il faut un seuil magnétique plus bas (courbe B) ou une section plus forte." }
  ],
  questions: [
    { q: "Un disjoncteur protège avant tout…", choix: ["l'appareil branché", "le câble du circuit", "le compteur"], bonne: 1, explication: "Son calibre se choisit pour que le câble ne surchauffe jamais : In ≤ Iz." },
    { q: "Radiateur 2 000 W + bouilloire 2 200 W sur une prise : quel courant ?", choix: ["≈ 9 A", "≈ 18 A", "≈ 4 200 A"], bonne: 1, explication: "4 200 W / 230 V ≈ 18,3 A : trop pour un circuit 16 A, qui finira par déclencher." },
    { q: "Pourquoi une courbe D pour un gros moteur ?", choix: ["Il consomme plus en permanence", "Son courant de démarrage ferait déclencher une courbe B ou C", "Pour couper plus vite"], bonne: 1 }
  ],
  notions: [["batiment", "Disjoncteur"], ["batiment", "Surcharge"], ["batiment", "Court-circuit"], ["batiment", "Courbes B, C, D"], ["batiment", "Courbe de déclenchement thermique"], ["batiment", "Courant admissible"], ["batiment", "Sections usuelles"]],
  suite: "Regarde l'étiquette de ton tableau électrique : pour chaque circuit, note le calibre et devine la section du câble (sans ouvrir le tableau)."
});
