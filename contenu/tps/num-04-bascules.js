LS.ajouterTP({
  id: "num-04-bascules",
  titre: "Mémoriser un bit : les bascules",
  domaine: "numerique", niveau: 3, duree: "35 min",
  sim: "logique",
  intro: "Jusqu'ici, la sortie dépendait seulement des entrées présentes (logique **combinatoire**). En rebouclant la sortie d'une porte sur l'entrée d'une autre, le circuit **se souvient** : c'est la logique **séquentielle**, à la base des mémoires et des compteurs.\n\nÉtape 1 : la **bascule RS** avec deux portes NON-OU croisées. **S** (set) met Q à 1, **R** (reset) le remet à 0 ; quand les deux sont à 0, Q **garde** sa valeur.",
  config: {
    palette: ["non_ou", "non_et", "non", "basculeD", "horloge", "afficheur", "led", "entree"],
    largeur: 46, hauteur: 28,
    schema: {
      compos: [
        { type: "bouton", x: 4, y: 5, nom: "S", fixe: true },
        { type: "bouton", x: 4, y: 15, nom: "R", fixe: true },
        { type: "led", x: 36, y: 6, nom: "Q", p: { couleur: "verte" }, fixe: true }
      ],
      fils: []
    }
  },
  objectifs: [
    { texte: "Construis la bascule RS (deux NON-OU croisés). Appuie sur **S** puis relâche : Q reste à 1. Appuie sur **R** puis relâche : Q reste à 0.",
      indice: "Porte 1 : entrées R et la sortie de la porte 2 → sa sortie est Q. Porte 2 : entrées S et Q → sa sortie est Q̄. Les deux sorties se rebouclent en croix.",
      verif: (s, m) => {
        const S = s.trouver("S"), R = s.trouver("R"), Q = s.trouver("Q");
        const q = Q._e ? Q._e[0] : 0;
        if (S._appui) m.s = true;
        if (m.s && !S._appui && !R._appui && q === 1) m.memo1 = true;
        if (m.memo1 && R._appui) m.r = true;
        if (m.r && !S._appui && !R._appui && q === 0) return true;
        return { ok: false, msg: m.memo1 ? "Q a mémorisé 1. Appuie maintenant sur R." : "" };
      } },
    { texte: "Pose une **bascule D** et une **horloge** (1 Hz) : relie la sortie Q̄ de la bascule à son entrée D. Q change d'état à **chaque front montant** : c'est un diviseur de fréquence par 2.",
      verif: (s, m) => s.liste("basculeD").some(b => { const q = b._q; m.vus = m.vus || new Set(); m.vus.add(q); return s.memeNet(b, 0, b, 3) && m.vus.has(0) && m.vus.has(1); }) },
    { texte: "**Compteur 2 bits** : chaîne deux bascules D (la Q̄ de la première sert d'horloge à la seconde) et affiche le résultat sur l'**afficheur** (entrées 1 et 2). Il doit compter 0, 1, 2, 3…",
      indice: "Bit de poids 1 = Q de la bascule 1 → entrée « 1 » de l'afficheur ; bit de poids 2 = Q de la bascule 2 → entrée « 2 ».",
      verif: (s, m) => { const a = s.liste("afficheur")[0]; if (!a) return false; m.v = m.v || new Set(); m.v.add(a._valeur); return [0, 1, 2, 3].every(x => m.v.has(x)); } }
  ],
  questions: [
    { q: "Que fait une bascule RS si S = R = 0 ?", choix: ["Q passe à 0", "Q garde sa valeur précédente (mémoire)", "Q oscille"], bonne: 1 },
    { q: "Avec 8 bascules en compteur, jusqu'à combien compte-t-on ?", choix: ["8", "16", "255"], bonne: 2, explication: "2⁸ − 1 = 255." }
  ],
  notions: [["numerique", "Bascule RS"], ["numerique", "Bascule D"], ["numerique", "Horloge"], ["numerique", "Compteur"]]
});
