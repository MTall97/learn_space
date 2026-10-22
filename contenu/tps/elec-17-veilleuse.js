LS.ajouterTP({
  id: "elec-17-veilleuse",
  titre: "Veilleuse automatique",
  domaine: "electronique", niveau: 4, duree: "30 min",
  sim: "circuit",
  intro: "Une **photorésistance** (LDR) a une résistance qui baisse quand la lumière augmente (≈ 300 Ω en plein jour, ≈ 1 MΩ dans le noir). Avec une résistance fixe, elle forme un **diviseur de tension** dont la sortie dépend de la lumière. Si cette sortie commande la base d'un transistor, on obtient un interrupteur automatique. La partie LED + transistor est déjà câblée : à toi de faire le **capteur**.",
  config: {
    palette: ["ldr", "resistance", "potentiometre", "voltmetre"],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 10, rot: 90, p: { U: 9, r: 0.1 }, nom: "G1", fixe: true },
        { type: "npn", x: 16, y: 10, nom: "T1", fixe: true },
        { type: "resistance", x: 20, y: 2, p: { R: 330 }, nom: "Rc", fixe: true },
        { type: "led", x: 24, y: 4, rot: 90, p: { couleur: "blanche" }, nom: "D1", fixe: true }
      ],
      fils: [
        { pts: [[4, 10], [4, 2], [20, 2]], fixe: true },
        { pts: [[24, 2], [24, 4]], fixe: true },
        { pts: [[24, 8], [18, 8]], fixe: true },
        { pts: [[18, 12], [18, 18], [4, 18], [4, 14]], fixe: true }
      ]
    }
  },
  objectifs: [
    { texte: "Construis le capteur : **résistance fixe** entre le + et la base, **LDR** entre la base et la masse (−).",
      indice: "Quand il fait clair, la LDR a une faible résistance : elle « tire » la base vers 0 V, le transistor est bloqué. Dans le noir, la résistance fixe amène du courant à la base. Essaie 47 kΩ.",
      verif: s => s.liste("ldr").length > 0 && s.liste("resistance").length > 1 },
    { texte: "Vérifie : avec la lumière à **10 %**, la LED est **allumée** (> 10 mA) ; à **90 %**, elle est **éteinte** (< 1 mA).",
      verif: (s, m) => { const l = s.liste("ldr")[0]; const i = s.I(s.trouver("D1")); if (!l) return false; if (l.p.lum <= 10 && i > 0.01) m.nuit = true; if (l.p.lum >= 90 && i < 0.001) m.jour = true; return !!(m.nuit && m.jour); } },
    { texte: "Règle le **seuil** : la LED doit s'allumer à partir de **30 %** de lumière environ (allumée à 25 %, éteinte à 40 %).",
      indice: "Remplace la résistance fixe par un potentiomètre monté en résistance variable, ou essaie plusieurs valeurs : plus la résistance fixe est grande, plus il faut de lumière pour éteindre.",
      verif: (s, m) => { const l = s.liste("ldr")[0]; const i = s.I(s.trouver("D1")); if (!l) return false; if (Math.abs(l.p.lum - 25) <= 2 && i > 0.005) m.a = true; if (Math.abs(l.p.lum - 40) <= 2 && i < 0.001) m.b = true; return !!(m.a && m.b); } }
  ],
  questions: [
    { q: "Si on échange la LDR et la résistance fixe, la LED…", choix: ["s'allume quand il fait clair", "ne s'allume jamais", "s'allume toujours"], bonne: 0 }
  ],
  notions: [["elec-composants", "Photorésistance (LDR)"], ["elec-bases", "Diviseur de tension"], ["electronique", "Transistor bipolaire"]]
});
