LS.ajouterTP({
  id: "em-01-relais-moteur",
  titre: "Commander un moteur avec un relais",
  domaine: "electromecanique", niveau: 2, duree: "25 min",
  sim: "circuit",
  intro: "Un **relais** est un interrupteur commandé par un **électroaimant** : quand sa bobine est alimentée, elle attire une lame qui ferme un contact. Le circuit de **commande** (6 V, bouton poussoir BP1, bobine) est séparé électriquement du circuit de **puissance** (12 V, contact, moteur M1). Comme les relais de démarreur ou de phares d'une voiture.",
  config: {
    palette: ["diode", "amperemetre", "voltmetre", "interrupteur", "lampe"],
    dt: 5e-4,
    schema: {
      compos: [
        { type: "pile", x: 4, y: 6, rot: 90, p: { U: 6, r: 0.2 }, nom: "G1", fixe: true },
        { type: "bouton", x: 6, y: 2, nom: "BP1" },
        { type: "relais", x: 16, y: 6, p: { Ub: 6 }, nom: "KA1", fixe: true },
        { type: "pile", x: 32, y: 10, rot: 90, p: { U: 12, r: 0.05 }, nom: "G2", fixe: true },
        { type: "moteur", x: 22, y: 12, p: { charge: 20 }, nom: "M1", fixe: true }
      ],
      fils: [
        { pts: [[4, 6], [4, 2], [6, 2]] },
        { pts: [[10, 2], [16, 2], [16, 6]] },
        { pts: [[16, 10], [16, 14], [4, 14], [4, 10]], fixe: true },
        { pts: [[32, 10], [32, 2], [19, 2], [19, 6]], fixe: true },
        { pts: [[19, 10], [19, 12], [22, 12]], fixe: true },
        { pts: [[26, 12], [28, 12], [28, 16], [32, 16], [32, 14]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Maintiens **BP1** appuyé (garde le clic enfoncé) : le relais colle et le moteur démarre.",
      verif: s => Math.abs(s.trouver("M1")._w || 0) * 60 / (2 * Math.PI) > 1500 },
    { texte: "Compare le courant de la **bobine** (clique sur KA1) et celui du **moteur** (clique sur M1) : une petite puissance en commande une grande.",
      verif: (s, m) => { if (s.choix && s.choix.nom === "KA1") m.a = true; if (s.choix && s.choix.nom === "M1") m.b = true; return !!(m.a && m.b); } },
    { texte: "Remplace BP1 par un **interrupteur** pour une marche continue, puis augmente la **charge** du moteur à 100 % : la vitesse baisse et le courant monte.",
      verif: s => s.trouver("M1").p.charge >= 95 && s.liste("interrupteur").some(k => k.p.ferme) && Math.abs(s.trouver("M1")._i0 || 0) > 2 },
    { texte: "Protège le contact du bouton : ajoute une **diode de roue libre** en parallèle sur la bobine du relais (cathode côté +).",
      verif: s => { const k = s.trouver("KA1"); return s.liste("diode").some(d => s.memeNet(d, 1, k, 0) && s.memeNet(d, 0, k, 1)); } }
  ],
  questions: [
    { q: "Quel est l'intérêt principal d'un relais ?", choix: ["Commander un circuit de forte puissance avec un petit courant, en isolant les deux circuits", "Augmenter la tension", "Mesurer le courant"], bonne: 0 },
    { q: "Moteur freiné : pourquoi le courant augmente-t-il ?", choix: ["La force contre-électromotrice E = kΩ diminue avec la vitesse, donc I = (U − E) / R augmente", "La pile fournit plus de tension", "Le relais chauffe"], bonne: 0 }
  ],
  notions: [["electromecanique", "Relais"], ["electromecanique", "Électroaimant"], ["electromecanique", "Force contre-électromotrice"], ["elec-composants", "Diode de roue libre"]]
});
