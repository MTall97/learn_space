LS.ajouterTP({
  id: "elec-08-va-et-vient",
  titre: "Le va-et-vient de la maison",
  domaine: "electricite", niveau: 2, duree: "25 min",
  sim: "circuit", securite: "secteur",
  intro: "Dans un couloir, on veut allumer et éteindre la même lampe depuis **deux endroits**. On utilise deux **interrupteurs va-et-vient** (à trois bornes : une borne commune et deux sorties) reliés par deux fils appelés **navettes**. Ici, le réseau est simulé par un générateur alternatif de **220 V efficaces** (311 V crête, 50 Hz), comme le réseau malien (230 V en Europe), protégé par un fusible F1 de 10 A, et une lampe de 220 V, 60 W. Ces trois éléments sont imposés (réglages verrouillés).\n\n⚠ En vrai : on coupe le disjoncteur avant de câbler, et la **phase** passe par les interrupteurs, jamais le neutre.",
  config: {
    palette: ["vaetvient", "interrupteur", "lampe", "voltmetre", "amperemetre", "fusible"],
    schema: {
      compos: [
        { type: "generateur", x: 4, y: 18, rot: 270, p: { forme: "sinus", A: 311, f: 50, off: 0 }, nom: "Réseau", fixe: true, verrou: true },
        { type: "fusible", x: 4, y: 12, rot: 270, p: { In: 10 }, nom: "F1", fixe: true, verrou: true },
        { type: "vaetvient", x: 10, y: 6, nom: "S1" },
        { type: "vaetvient", x: 26, y: 6, rot: 180, nom: "S2" },
        { type: "lampe", x: 32, y: 10, rot: 90, p: { Un: 220, Pn: 60 }, nom: "L1", fixe: true, verrou: true }
      ],
      fils: [
        { pts: [[4, 18], [4, 22], [32, 22], [32, 14]], fixe: true },
        { pts: [[4, 14], [4, 12]], fixe: true },
        { pts: [[4, 8], [4, 6], [10, 6]] },
        { pts: [[26, 6], [32, 6], [32, 10]] }
      ]
    }
  },
  objectifs: [
    { texte: "Relie les deux interrupteurs par les **navettes** (les deux sorties de S1 aux deux sorties de S2) et allume la lampe.",
      verif: s => (s.trouver("L1")._ueff || 0) > 100 },
    { texte: "Vérifie le fonctionnement : chaque interrupteur doit **inverser** l'état de la lampe, quelle que soit la position de l'autre. Essaie les **4 combinaisons**.",
      indice: "Appuie sur S1 puis appuie de nouveau pour le basculer ; pareil pour S2. Avec le courant alternatif, observe l'éclat de la lampe.",
      verif: (s, m) => {
        const a = s.trouver("S1"), b = s.trouver("S2"), l = s.trouver("L1");
        if (!a || !b || !l) return false;
        m.vus = m.vus || {};
        const allume = (l._ueff || 0) > 100;
        m.vus[(a.p.haut ? 1 : 0) + "" + (b.p.haut ? 1 : 0)] = allume;
        const k = Object.keys(m.vus);
        return k.length === 4 && m.vus["11"] === m.vus["00"] && m.vus["10"] === m.vus["01"] && m.vus["11"] !== m.vus["10"];
      }, bravo: "C'est un « OU exclusif » : la lampe s'allume quand les deux interrupteurs sont dans des positions différentes (ou identiques, selon le câblage)." },
    { texte: "Mesure la tension aux bornes de la lampe allumée avec un voltmètre en mode **alternatif** : environ 220 V.",
      verif: s => s.liste("voltmetre").some(v => v.p.mode.startsWith("alternatif") && Math.abs(v._mesure - 220) < 10) },
    { texte: "Le **fusible** protège l'installation : en simulation seulement, relie par erreur la sortie d'un interrupteur (la phase) au fil du **neutre**. Le court-circuit fait fondre F1. Retire le fil fautif, puis « Réparer » : la lampe se rallume.",
      indice: "Un fil de la borne de sortie de S2 jusqu'au fil du bas suffit. Le générateur affiche « Court-circuit » et F1 fond en quelques millisecondes.",
      verif: (s, m) => { const f = s.trouver("F1"), l = s.trouver("L1"); if (f && f.etat && f.etat.grille) m.fondu = true; return !!(m.fondu && f && !(f.etat && f.etat.grille) && (l._ueff || 0) > 100); },
      bravo: "Un court-circuit franc fait passer des centaines d'ampères : le fusible (ou le disjoncteur) doit couper avant que les fils ne chauffent. On cherche toujours la cause avant de réarmer." }
  ],
  questions: [
    { q: "Sur le réseau 220 V, que lit un voltmètre réglé par erreur en mode continu (DC) ?", choix: ["220 V", "≈ 0 V : en DC il affiche la valeur moyenne, nulle pour une sinusoïde", "311 V"], bonne: 1, explication: "La tension change de sens 100 fois par seconde (50 périodes) : sa moyenne est nulle. Pour l'alternatif, on lit la valeur efficace (220 V) en mode AC (V~)." },
    { q: "Quelle est la valeur crête du réseau 220 V ?", choix: ["220 V", "311 V", "380 V"], bonne: 1, explication: "Û = 220 × √2 ≈ 311 V. (380 V est la tension entre deux phases du triphasé.)" }
  ],
  notions: [["elec-bases", "En parallèle (dérivation)"], ["elec-alternatif", "Valeur efficace"], ["elec-bases", "Danger du courant"], ["elec-alternatif", "Installation domestique"], ["elec-composants", "Fusible (composant)"]]
});
