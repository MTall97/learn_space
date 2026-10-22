LS.ajouterTP({
  id: "elec-07-kirchhoff",
  titre: "Les lois de Kirchhoff",
  domaine: "electricite", niveau: 3, duree: "30 min",
  sim: "circuit",
  intro: "Deux générateurs (E1 = 9 V, E2 = 6 V) alimentent le même nœud **N** (en haut au milieu) à travers trois résistances de 1 kΩ. Les trois ampèremètres A1, A2, A3 mesurent les courants des trois branches, dans le sens indiqué par leur borne + (flèche des points jaunes). Un courant **négatif** veut dire qu'il circule en sens inverse de la flèche choisie.",
  config: {
    palette: ["voltmetre", "amperemetre"],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 10, rot: 90, p: { U: 9, r: 0.01 }, nom: "E1", fixe: true },
        { type: "amperemetre", x: 4, y: 8, rot: 270, nom: "A1", fixe: true },
        { type: "resistance", x: 6, y: 2, p: { R: 1000 }, nom: "R1", fixe: true },
        { type: "amperemetre", x: 16, y: 4, rot: 90, nom: "A3", fixe: true },
        { type: "resistance", x: 16, y: 10, rot: 90, p: { R: 1000 }, nom: "R3", fixe: true },
        { type: "resistance", x: 22, y: 2, p: { R: 1000 }, nom: "R2", fixe: true },
        { type: "amperemetre", x: 28, y: 4, rot: 90, nom: "A2", fixe: true },
        { type: "pile", x: 28, y: 10, rot: 90, p: { U: 6, r: 0.01 }, nom: "E2", fixe: true }
      ],
      fils: [
        { pts: [[4, 10], [4, 8]], fixe: true },
        { pts: [[4, 4], [4, 2], [6, 2]], fixe: true },
        { pts: [[10, 2], [22, 2]], fixe: true },
        { pts: [[16, 2], [16, 4]], fixe: true },
        { pts: [[16, 8], [16, 10]], fixe: true },
        { pts: [[26, 2], [28, 2], [28, 4]], fixe: true },
        { pts: [[28, 8], [28, 10]], fixe: true },
        { pts: [[4, 14], [4, 18], [28, 18], [28, 14]], fixe: true },
        { pts: [[16, 14], [16, 18]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Lis A1, A2 et A3 (clique sur chacun). Vérifie la **loi des nœuds** en N : le courant qui arrive (A1) est égal à ceux qui repartent (A2 + A3).",
      verif: (s, m) => { if (s.choix && /^A\d$/.test(s.choix.nom || "")) m[s.choix.nom] = true; return !!(m.A1 && m.A2 && m.A3); },
      bravo: "A1 = 4 mA, A3 = 5 mA, A2 = −1 mA : 4 = 5 + (−1). Le courant dans R2 va en fait de E2 vers N : E2 fournit aussi du courant." },
    { texte: "Règle **E2** pour que le courant dans R2 soit **nul** (|A2| < 0,05 mA).",
      indice: "Si I2 = 0, R2 n'a pas de tension à ses bornes : le potentiel de N est égal à E2. Et N est alors le milieu d'un diviseur R1-R3 alimenté par E1.",
      verif: s => Math.abs(s.trouver("A2")._mesure) < 5e-5, bravo: "E2 = E1 × R3 / (R1 + R3) = 4,5 V : les deux générateurs « s'équilibrent »." },
    { texte: "Règle E2 pour que **E2 se recharge** avec **+2 mA** (A2 = 2 mA ± 0,1).",
      verif: s => Math.abs(s.trouver("A2")._mesure - 0.002) < 1e-4, bravo: "E2 = 1,5 V : quand le courant entre par sa borne +, un générateur reçoit de l'énergie (c'est ainsi qu'on recharge une batterie)." },
    { texte: "**Loi des mailles** : pose deux voltmètres, l'un sur R1, l'autre sur R3. Vérifie que U(R1) + U(R3) = E1.",
      verif: s => { const r1 = s.trouver("R1"), r3 = s.trouver("R3"); const v = s.liste("voltmetre"); const sur = r => v.some(x => (s.memeNet(x, 0, r, 0) && s.memeNet(x, 1, r, 1)) || (s.memeNet(x, 0, r, 1) && s.memeNet(x, 1, r, 0))); return sur(r1) && sur(r3); } }
  ],
  questions: [
    { q: "Avec E1 = 9 V et E2 = 6 V, quel est le potentiel du nœud N ?", choix: ["4,5 V", "5 V", "7,5 V"], bonne: 1, explication: "Loi des nœuds : (9 − V)/1k = V/1k + (V − 6)/1k → 15 = 3V → V = 5 V." },
    { q: "Un ampèremètre affiche −1 mA. Cela veut dire :", choix: ["Il est en panne", "Le courant circule dans le sens inverse de celui supposé", "Le courant est presque nul"], bonne: 1 }
  ],
  notions: [["elec-bases", "Loi des nœuds"], ["elec-bases", "Loi des mailles"], ["elec-bases", "Générateur"], ["elec-bases", "Potentiel"]]
});
