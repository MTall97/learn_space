LS.ajouterTP({
  id: "elec-10-bobine",
  titre: "La bobine et la diode de roue libre",
  domaine: "electricite", niveau: 3, duree: "25 min",
  sim: "circuit",
  intro: "Une **bobine** (inductance L) s'oppose aux **variations** de courant : à la fermeture, le courant monte progressivement (τ = L / R) ; à l'ouverture, elle « refuse » que le courant s'arrête et crée une **surtension** énorme qui fait jaillir une étincelle entre les contacts. C'est ce qui abîme les interrupteurs et les transistors qui commandent des relais, électrovannes ou moteurs. Ici : L = 1 H, résistance du fil r = 10 Ω, pile 12 V.",
  config: {
    palette: ["diode", "resistance", "voltmetre"],
    dt: 1e-4, vitesse: 0.1, tDiv: 0.05,
    oscillo: [{ nom: "L1", g: "I" }, { nom: "L1", g: "U" }],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 16, p: { U: 12, r: 0.1 }, nom: "G1", fixe: true },
        { type: "interrupteur", x: 8, y: 6, p: { ferme: false }, nom: "K1", fixe: true },
        { type: "bobine", x: 20, y: 8, rot: 90, p: { L: 1, r: 10 }, nom: "L1", fixe: true }
      ],
      fils: [
        { pts: [[4, 16], [2, 16], [2, 6], [8, 6]], fixe: true },
        { pts: [[12, 6], [20, 6], [20, 8]], fixe: true },
        { pts: [[20, 12], [20, 16], [8, 16]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Ferme K1 : le courant monte **progressivement** jusqu'à 12 / 10 ≈ 1,2 A (voie 1 de l'oscilloscope, au ralenti ×10).",
      verif: s => (s.trouver("L1")._il || 0) > 1.15 },
    { texte: "Ouvre K1 : observe l'**étincelle** entre les contacts et la surtension aux bornes de la bobine (centaines de volts !).",
      verif: (s, m) => { const k = s.trouver("K1"); return (k.etat && k.etat.etincelles) > 0; },
      bravo: "L'énergie stockée (½·L·I² ≈ 0,7 J) doit s'évacuer : sans chemin, elle force le passage dans l'air." },
    { texte: "Ajoute une **diode de roue libre** en parallèle sur la bobine, montée **en inverse** (cathode vers le +). Refais fermer/ouvrir : plus d'étincelle, la tension inverse de la bobine à l'ouverture reste sous 2 V (le seuil de la diode).",
      indice: "La cathode (barre) va côté K1 (+), l'anode côté pile (−). En fonctionnement normal, la diode est bloquée ; à l'ouverture, le courant de la bobine tourne en rond à travers elle.",
      verif: (s, m) => {
        const k = s.trouver("K1"), l = s.trouver("L1");
        if (!s.liste("diode").length) return false;
        // Bobine chargée K1 fermé : on remet à zéro la tension inverse (énergie rendue), puis on la lit à l'ouverture.
        if (k.p.ferme && (l._il || 0) > 1) { m.charge = true; m.n0 = (k.etat && k.etat.etincelles) || 0; l._uinv = 0; }
        if (m.charge && !k.p.ferme && Math.abs(l._il || 0) < 0.05) return ((k.etat && k.etat.etincelles) || 0) === m.n0 && (l._uinv || 0) < 2;
        return false;
      } }
  ],
  questions: [
    { q: "Constante de temps de L = 1 H avec r = 10 Ω ?", choix: ["10 s", "0,1 s", "1 s"], bonne: 1, explication: "τ = L / R = 1 / 10 = 0,1 s." },
    { q: "Pourquoi met-on une diode en parallèle sur la bobine d'un relais commandé par un transistor ?", choix: ["Pour allumer un voyant", "Pour protéger le transistor de la surtension à la coupure", "Pour augmenter le courant"], bonne: 1 }
  ],
  notions: [["elec-composants", "Bobine"], ["elec-composants", "Diode de roue libre"], ["electromecanique", "Loi de Lenz"]]
});
