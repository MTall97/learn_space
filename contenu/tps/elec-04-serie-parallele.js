LS.ajouterTP({
  id: "elec-04-serie-parallele",
  titre: "Série ou parallèle ?",
  domaine: "electricite", niveau: 1, duree: "20 min",
  sim: "circuit",
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
    { texte: "Clique sur **L1** puis sur **L2** : compare leurs courants et leurs tensions.",
      verif: (s, m) => { if (s.choix && s.choix.nom) m[s.choix.nom] = true; return !!(m.L1 && m.L2); },
      bravo: "En série : même courant (≈ 41 mA), la tension de 6 V se partage (3 V chacune). Chaque lampe brille faiblement." },
    { texte: "Supprime le fil entre L1 et L2 : les deux lampes s'éteignent. Remets le fil.",
      verif: (s, m) => { const l = s.liste("lampe"); if (l.length >= 2 && l.every(x => Math.abs(s.I(x)) < 1e-4)) m.eteint = true; return !!(m.eteint && l.some(x => Math.abs(s.I(x)) > 0.01)); } },
    { texte: "Construis le montage **en parallèle** : chaque lampe branchée directement entre le + et le − de la pile. Les deux lampes doivent recevoir 6 V.",
      indice: "Il faut deux chemins distincts entre les bornes de la pile : une lampe sur chaque chemin. Glisse des fils depuis les bornes.",
      verif: s => { const l = s.liste("lampe").filter(x => Math.abs(s.U(x)) > 5.7); return l.length >= 2; },
      bravo: "En parallèle, chaque lampe a toute la tension de la pile : elles brillent normalement." },
    { texte: "En parallèle, ajoute un **interrupteur** dans la branche d'une seule lampe : l'autre doit rester allumée quand tu l'ouvres.",
      verif: (s, m) => {
        const k = s.liste("interrupteur").find(x => !x.p.ferme);
        const l = s.liste("lampe");
        return !!k && l.some(x => Math.abs(s.U(x)) > 5.7) && l.some(x => Math.abs(s.I(x)) < 1e-4);
      }, bravo: "Chaque branche est indépendante : c'est pourquoi on câble les appareils d'une maison en parallèle." }
  ],
  questions: [
    { q: "En parallèle, le courant débité par la pile est…", choix: ["le même que dans une lampe", "la somme des courants des lampes", "nul"], bonne: 1, explication: "Loi des nœuds : I = I1 + I2. Clique sur la pile pour le vérifier : ≈ 167 mA = 83 + 83 mA." },
    { q: "Deux résistances de 100 Ω en parallèle équivalent à…", choix: ["200 Ω", "100 Ω", "50 Ω"], bonne: 2, explication: "1/R = 1/100 + 1/100 → R = 50 Ω : il y a deux chemins, le courant passe plus facilement." },
    { q: "Dans une guirlande en série, une ampoule grille. Que se passe-t-il ?", choix: ["Les autres brillent plus", "Tout s'éteint", "Rien ne change"], bonne: 1 }
  ],
  notions: [["elec-bases", "En série"], ["elec-bases", "En parallèle (dérivation)"], ["elec-bases", "Loi des nœuds"], ["elec-bases", "Loi des mailles"]]
});
