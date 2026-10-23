LS.ajouterTP({
  id: "elec-04-serie-parallele",
  titre: "Série ou parallèle ?",
  domaine: "electricite", niveau: 1, duree: "20 min",
  sim: "circuit",
  intro1: "Deux lampes sont branchées **l'une après l'autre** sur une pile : c'est un montage **en série**. Elles brillent faiblement. Tu vas voir ce qui se passe quand on coupe un fil, et quand une lampe reste seule.",
  intro2: "Deux lampes identiques (6 V, 0,5 W) sont branchées **en série** sur une pile de 6 V. Compare-les, puis construis le montage **en parallèle** (dérivation), celui des prises d'une maison : chaque lampe aura toute la tension de la pile.",
  intro: "Deux lampes identiques (6 V, 0,5 W) sont branchées **en série** sur une pile de 6 V. Tu vas comparer avec le montage **en parallèle** (dérivation), celui des prises d'une maison.",
  config: {
    palette: ["lampe", "interrupteur", "amperemetre", "voltmetre"],
    schema: {
      compos: [
        { type: "pile", x: 6, y: 16, p: { U: 6, r: 0.1 }, nom: "G1" },
        { type: "lampe", x: 12, y: 6, p: { Un: 6, Pn: 0.5 }, nom: "L1" },
        { type: "lampe", x: 22, y: 6, p: { Un: 6, Pn: 0.5 }, nom: "L2" }
      ],
      fils: [
        { pts: [[6, 16], [2, 16], [2, 6], [12, 6]] },
        { pts: [[16, 6], [22, 6]] },
        { pts: [[26, 6], [30, 6], [30, 16], [10, 16]] }
      ]
    }
  },
  objectifs: [
    { texte: "Appuie sur **L1** puis sur **L2** : compare leurs courants et leurs tensions.", niv: 2,
      verif: (s, m) => { if (s.choix && s.choix.nom) m[s.choix.nom] = true; return !!(m.L1 && m.L2); },
      bravo: "En série : même courant (≈ 41 mA), la tension de 6 V se partage (3 V chacune). Chaque lampe brille faiblement." },
    { texte: "Supprime le fil entre L1 et L2 : les deux lampes s'éteignent. Remets le fil.",
      verif: (s, m) => { const l = s.liste("lampe"); if (l.length >= 2 && l.every(x => Math.abs(s.I(x)) < 1e-4)) m.eteint = true; return !!(m.eteint && l.some(x => Math.abs(s.I(x)) > 0.01)); } },
    { texte: "Supprime la lampe **L2** (appuie dessus puis « Supprimer ») et relie le fil à sa place : **L1 reste seule** et brille plus fort.", niv: [1, 1],
      indice: "Choisis « Fil », puis glisse depuis le bout du fil coupé jusqu'à l'autre bout.",
      verif: s => { const l = s.liste("lampe"); return l.length === 1 && Math.abs(s.U(l[0])) > 5.7; },
      bravo: "Seule, la lampe reçoit toute la force de la pile : elle brille plus. À deux en série, elles se la partagent." },
    { texte: "Construis le montage **en parallèle** : chaque lampe branchée directement entre le + et le − de la pile. Les deux lampes doivent recevoir 6 V.",
      indice: "Il faut deux chemins distincts entre les bornes de la pile : une lampe sur chaque chemin. Glisse des fils depuis les bornes.",
      verif: s => { const l = s.liste("lampe").filter(x => Math.abs(s.U(x)) > 5.7); return l.length >= 2; }, niv: 2,
      bravo: "En parallèle, chaque lampe a toute la tension de la pile : elles brillent normalement." },
    { texte: "En parallèle, ajoute un **interrupteur** dans la branche d'une seule lampe : l'autre doit rester allumée quand tu l'ouvres.",
      niv: 2, verif: (s, m) => {
        const k = s.liste("interrupteur").find(x => !x.p.ferme);
        const l = s.liste("lampe");
        return !!k && l.some(x => Math.abs(s.U(x)) > 5.7) && l.some(x => Math.abs(s.I(x)) < 1e-4);
      }, bravo: "Chaque branche est indépendante : c'est pourquoi on câble les appareils d'une maison en parallèle." }
  ],
  questions: [
    { q: "À la maison, si la lampe du salon grille, la télé s'éteint-elle ?", niv: [1, 1], choix: ["Non : chaque appareil a son propre chemin", "Oui : tout s'éteint"], bonne: 0,
      explication: "Les appareils d'une maison sont branchés en parallèle : chacun a son chemin." },
    { q: "En parallèle, le courant débité par la pile est…", niv: 2, choix: ["le même que dans une lampe", "la somme des courants des lampes", "nul"], bonne: 1, explication: "Loi des nœuds : I = I1 + I2. Appuie sur la pile pour le vérifier : ≈ 167 mA = 83 + 83 mA." },
    { q: "Deux résistances de 100 Ω en parallèle équivalent à…", niv: 3, choix: ["200 Ω", "100 Ω", "50 Ω"], bonne: 2, explication: "1/R = 1/100 + 1/100 → R = 50 Ω : il y a deux chemins, le courant passe plus facilement." },
    { q: "Dans une guirlande en série, une ampoule grille. Que se passe-t-il ?", choix: ["Les autres brillent plus", "Tout s'éteint", "Rien ne change"], bonne: 1 }
  ],
  notions: [["elec-bases", "En série"], ["elec-bases", "En parallèle (dérivation)"], ["elec-bases", "Loi des nœuds"], ["elec-bases", "Loi des mailles"]]
});
