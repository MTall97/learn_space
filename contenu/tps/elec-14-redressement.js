LS.ajouterTP({
  id: "elec-14-redressement",
  titre: "Redresser et lisser une tension",
  domaine: "electronique", niveau: 3, duree: "40 min",
  sim: "circuit",
  intro: "Les appareils électroniques veulent du **continu**, le réseau fournit de l'**alternatif**. Une alimentation fait : transformateur (abaisse la tension) → **redressement** (diodes) → **lissage** (condensateur) → régulation. Ici le GBF remplace la sortie du transformateur : 12 V crête, 50 Hz. Voie 1 : entrée ; voie 2 : tension sur la charge **Rch** (1 kΩ).",
  config: {
    palette: ["diode", "condensateur", "resistance", "voltmetre", "led"],
    tDiv: 0.005,
    oscillo: [{ nom: "GBF1", g: "U" }, { nom: "Rch", g: "U" }],
    schema: {
      compos: [
        { type: "generateur", x: 4, y: 8, rot: 90, p: { forme: "sinus", A: 12, f: 50, off: 0 }, nom: "GBF1", fixe: true },
        { type: "diode", x: 8, y: 4, nom: "D1" },
        { type: "resistance", x: 22, y: 8, rot: 90, p: { R: 1000 }, nom: "Rch", fixe: true }
      ],
      fils: [
        { pts: [[4, 8], [4, 4], [8, 4]] },
        { pts: [[12, 4], [22, 4], [22, 8]] },
        { pts: [[22, 12], [22, 16], [4, 16], [4, 12]] }
      ]
    }
  },
  objectifs: [
    { texte: "Observe le **redressement simple alternance** : la charge ne reçoit que les alternances positives (moins ≈ 0,7 V perdus dans la diode).",
      verif: (s, m) => { const g = s.U(s.trouver("GBF1")), r = s.U(s.trouver("Rch")); if (g > 10 && r > 9.5) m.pos = true; if (g < -10 && Math.abs(r) < 0.5) m.neg = true; return !!(m.pos && m.neg); } },
    { texte: "Construis un **pont de Graetz** (4 diodes) : la charge doit recevoir les **deux** alternances, toujours dans le même sens.",
      indice: "Les deux bornes du GBF arrivent chacune au milieu d'une paire de diodes. Les deux cathodes réunies donnent le + de la charge ; les deux anodes réunies, le −. Débranche d'abord le fil du bas pour que la charge ne soit plus reliée directement au GBF.",
      verif: (s, m) => { const g = s.U(s.trouver("GBF1")), r = s.U(s.trouver("Rch")); if (g > 10 && r > 9) m.pos = true; if (g < -10 && r > 9) m.neg = true; return !!(m.pos && m.neg) && s.liste("diode").length >= 4; },
      bravo: "Deux diodes conduisent pendant chaque alternance : la charge voit 12 − 2 × 0,7 ≈ 10,6 V crête, à 100 Hz." },
    { texte: "**Lisse** la tension avec un condensateur en parallèle sur Rch : l'ondulation (crête-à-crête) doit descendre **sous 1,5 V**.",
      indice: "Ondulation ≈ I / (f × C) avec f = 100 Hz après le pont : pour 10 mA et 1,5 V, il faut C ≥ 67 µF. Essaie 220 µF ou 470 µF.",
      verif: (s, m) => {
        const r = s.U(s.trouver("Rch")), t = s.sim.t;
        m.h = (m.h || []).filter(x => t - x[0] < 3); m.h.push([t, r]);
        if (m.h.length < 8 || !s.liste("condensateur").length) return false;
        const v = m.h.map(x => x[1]);
        return Math.min(...v) > 8 && Math.max(...v) - Math.min(...v) < 1.5;
      } }
  ],
  questions: [
    { q: "Après un pont de diodes sur du 50 Hz, quelle est la fréquence de l'ondulation ?", choix: ["50 Hz", "100 Hz", "25 Hz"], bonne: 1 },
    { q: "Si on double la capacité de lissage, l'ondulation…", choix: ["double", "est divisée par deux environ", "ne change pas"], bonne: 1 }
  ],
  notions: [["electronique", "Redressement"], ["electronique", "Pont de Graetz"], ["electronique", "Lissage"], ["elec-composants", "Diode"]]
});
