LS.ajouterTP({
  id: "elec-16-transistor",
  titre: "Le transistor en interrupteur",
  domaine: "electronique", niveau: 3, duree: "30 min",
  sim: "circuit",
  intro: "Un **transistor bipolaire NPN** a trois pattes : **base** (B), **collecteur** (C), **émetteur** (E). Un petit courant de base Ib permet le passage d'un courant collecteur Ic jusqu'à **β fois** plus grand (β ≈ 100). Si la base reçoit assez de courant, le transistor est **saturé** : il se comporte comme un interrupteur fermé entre C et E. C'est ainsi qu'un microcontrôleur (quelques mA) commande une LED puissante, un relais ou un moteur.",
  config: {
    palette: ["resistance", "led", "moteur", "diode", "relais", "amperemetre", "voltmetre"],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 10, rot: 90, p: { U: 9, r: 0.1 }, nom: "G1", fixe: true },
        { type: "interrupteur", x: 6, y: 6, nom: "K1" },
        { type: "resistance", x: 12, y: 10, p: { R: 10000 }, nom: "Rb" },
        { type: "npn", x: 16, y: 10, nom: "T1", fixe: true },
        { type: "resistance", x: 20, y: 2, p: { R: 330 }, nom: "Rc" },
        { type: "led", x: 24, y: 4, rot: 90, nom: "D1" }
      ],
      fils: [
        { pts: [[4, 10], [4, 2], [20, 2]], fixe: true },
        { pts: [[4, 6], [6, 6]] },
        { pts: [[10, 6], [10, 10], [12, 10]] },
        { pts: [[24, 2], [24, 4]] },
        { pts: [[24, 8], [18, 8]] },
        { pts: [[18, 12], [18, 16], [4, 16], [4, 14]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Ferme **K1** : la LED s'allume. Clique sur T1 et lis Ib, Ic et le régime.",
      verif: s => s.I(s.trouver("D1")) > 0.015 },
    { texte: "Observe que **Ic / Ib** est bien inférieur à β (≈ 30 au lieu de 100) : le transistor est **saturé**, Ic n'est limité que par Rc et la LED.",
      verif: (s, m) => { const t = s.trouver("T1"); if (s.choix === t && t._i && t._i[0] > 5e-4) m.ok = true; return !!m.ok; } },
    { texte: "Remplace Rb par **1 MΩ** : Ib devient tout petit, le transistor passe en régime **linéaire** et Ic ≈ β × Ib. La LED brille à peine.",
      verif: s => { const rb = s.trouver("Rb"), t = s.trouver("T1"); return rb && rb.p.R >= 470000 && t._i && t._i[1] > 2e-4 && t._i[1] < 5e-3; },
      bravo: "En régime linéaire, le transistor amplifie : Ic suit Ib. C'est le principe de l'amplificateur." },
    { texte: "Commande un **moteur** : remplace la LED et Rc par un moteur (avec une **diode de roue libre** en parallèle). Choisis Rb pour que le moteur tourne à plus de 2 000 tr/min.",
      indice: "Au démarrage, le moteur demande jusqu'à 4 A : avec β = 100, il faut Ib ≈ 40 mA, donc Rb ≈ (9 − 0,8) / 0,04 ≈ 200 Ω. Un vrai montage utiliserait un MOSFET ou un Darlington.",
      verif: s => s.liste("moteur").some(m => Math.abs(m._w || 0) * 60 / (2 * Math.PI) > 2000) && s.liste("diode").length > 0 }
  ],
  questions: [
    { q: "Avec Ib = 0,5 mA et β = 100, le courant collecteur maximal possible est…", choix: ["0,5 mA", "50 mA", "5 A"], bonne: 1 },
    { q: "Un transistor saturé se comporte comme…", choix: ["un interrupteur fermé entre C et E (Vce ≈ 0,1 V)", "un interrupteur ouvert", "une pile"], bonne: 0 }
  ],
  notions: [["electronique", "Transistor bipolaire"], ["electronique", "Saturation"], ["electronique", "Régime linéaire"], ["elec-composants", "Diode de roue libre"]]
});
