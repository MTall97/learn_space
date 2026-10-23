/* Aides : les pointes du multimètre touchent-elles les deux bornes d'un composant ? */
function pointesSur(s, nom) {
  const c = s.trouver(nom), mm = s._mm;
  if (!c || !mm || !mm._nets || !c._nets) return false;
  const a = mm._nets, b = c._nets;
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
LS.ajouterTP({
  id: "elec-03-multimetre",
  titre: "Se servir d'un multimètre",
  domaine: "electricite", niveau: 1, duree: "30 min",
  sim: "circuit",
  intro: "Le **multimètre** est l'outil de base de l'électricien. Il est ouvert à droite de la plaque : choisis la fonction avec le **sélecteur**, mets le cordon rouge dans la bonne **douille**, puis **fais glisser les pointes** rouge et noire sur les points à mesurer (bornes ou fils). Le cordon noir reste toujours dans **COM**.",
  config: {
    multimetre: true,
    palette: ["resistance", "diode", "led"],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 16, p: { U: 9, r: 0.2 }, nom: "G1" },
        { type: "resistance", x: 10, y: 6, p: { R: 1000 }, nom: "R1" },
        { type: "resistance", x: 18, y: 8, rot: 90, p: { R: 2000 }, nom: "R2" },
        { type: "resistance", x: 26, y: 18, p: { R: 4700 }, nom: "R3" },
        { type: "diode", x: 26, y: 22, nom: "D1" }
      ],
      fils: [
        { pts: [[4, 16], [2, 16], [2, 6], [10, 6]] },
        { pts: [[14, 6], [18, 6], [18, 8]] },
        { pts: [[18, 12], [18, 16], [8, 16]] }
      ]
    }
  },
  objectifs: [
    { texte: "**Tension** : sélecteur **V⎓**, cordon rouge en **VΩ**, pointes sur les bornes de la pile **G1** (rouge sur le +). Lis environ 9 V.",
      verif: s => { const l = s.lectureMultimetre(); return !!l && l.sel === "V⎓" && l.douille === "VΩ" && pointesSur(s, "G1") && Math.abs(Math.abs(l.u) - 9) < 0.3; },
      bravo: "Le voltmètre se branche en dérivation, sans rien débrancher." },
    { texte: "Mesure la tension aux bornes de **R2**. Vérifie le diviseur de tension : U = 9 × 2000 / (1000 + 2000).",
      verif: s => { const l = s.lectureMultimetre(); return !!l && l.sel === "V⎓" && pointesSur(s, "R2") && Math.abs(Math.abs(l.u) - 6) < 0.2; } },
    { texte: "**Résistance** : mesure **R3** (hors circuit) en position **Ω**. L'appareil affiche-t-il 4,7 kΩ ?",
      verif: s => { const l = s.lectureMultimetre(); return !!l && l.sel === "Ω" && l.douille === "VΩ" && pointesSur(s, "R3") && /^4\.\d+$/.test(l.texte) && l.unite === "kΩ"; },
      bravo: "On mesure une résistance hors tension : l'ohmmètre envoie son propre petit courant." },
    { texte: "**Courant** : ouvre le circuit (supprime le fil entre R1 et R2), mets le multimètre **en série** (sélecteur **A⎓**, cordon rouge en **mA**), pointes sur les deux bouts ouverts. Tu dois lire 3 mA.",
      indice: "Supprime le fil, puis pose la pointe rouge sur la borne droite de R1 et la noire sur la borne haute de R2 : le courant traverse alors l'appareil.",
      verif: s => { const l = s.lectureMultimetre(); return !!l && l.sel === "A⎓" && l.douille === "mA" && Math.abs(Math.abs(l.i) - 0.003) < 0.0003; },
      bravo: "I = 9 V / 3 kΩ = 3 mA. L'ampèremètre fait partie du circuit : sans lui, le circuit est ouvert." },
    { texte: "**Test de diode** (▶|) : pointe rouge sur l'anode de **D1** (côté triangle), noire sur la cathode (côté barre). Lis la tension de seuil (≈ 0,6 V), puis inverse les pointes : « OL ».",
      verif: (s, m) => {
        const l = s.lectureMultimetre(); if (!l || l.sel !== "▶|" || !pointesSur(s, "D1")) return false;
        if (l.texte !== "OL" && Math.abs(l.u) > 0.4 && Math.abs(l.u) < 0.8) m.direct = true;
        if (l.texte === "OL") m.inverse = true;
        return !!(m.direct && m.inverse);
      }, bravo: "Une diode ne conduit que dans un sens : c'est ce qui permet de la tester (et de repérer ses bornes)." },
    { texte: "**L'erreur classique** : remets le circuit en état, laisse le cordon rouge dans **mA** et mesure la tension de la pile en position V⎓. Que devient le fusible du multimètre ? Remplace-le ensuite (bouton « Changer le fusible »).",
      verif: (s, m) => { const e = s._mm && s._mm.etat; if (e && e.fusible && e.fusible.mA) m.grille = true; return !!(m.grille && !(e && e.fusible && e.fusible.mA)); },
      bravo: "Dans la douille mA, l'appareil n'a qu'une très faible résistance : posé sur la pile, c'est un court-circuit. Le fusible interne l'a protégé. Toujours vérifier la douille avant de mesurer une tension !" }
  ],
  questions: [
    { q: "Pourquoi mesure-t-on une résistance circuit hors tension ?", choix: ["Pour économiser la pile du multimètre", "Parce que les tensions du circuit faussent la mesure et peuvent abîmer l'appareil", "Ce n'est pas nécessaire"], bonne: 1 },
    { q: "Le voltmètre a une résistance interne de 10 MΩ. Pourquoi si grande ?", choix: ["Pour ne presque pas dériver de courant et ne pas perturber le circuit", "Pour se protéger des courts-circuits", "Pour mesurer plus vite"], bonne: 0 },
    { q: "Ton multimètre affiche « OL » en position Ω. Cela signifie :", choix: ["Résistance nulle", "Résistance plus grande que le calibre (circuit ouvert)", "Pile du multimètre vide"], bonne: 1 }
  ],
  notions: [["elec-bases", "Multimètre"], ["elec-bases", "Voltmètre"], ["elec-bases", "Ampèremètre"], ["elec-bases", "Ohmmètre"], ["elec-bases", "Calibre"], ["elec-bases", "Diviseur de tension"]],
  suite: "Essaie de mesurer la résistance de R2 **sans** la débrancher : tu mesures en fait R2 en parallèle avec (R1 + la pile)…"
});
