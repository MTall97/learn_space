/* Enregistre l'état (A, B → sortie) vu par l'apprenant et vérifie une table de vérité complète. */
function tableVue(s, m, entrees, sortie, f) {
  const e = entrees.map(n => s.trouver(n)), o = s.trouver(sortie);
  if (e.some(x => !x) || !o) return false;
  const cle = e.map(x => x.p.v ? 1 : 0).join("");
  const v = o._e ? o._e[0] : 0;
  m.t = m.t || {};
  m.t[cle] = v;
  const n = 1 << entrees.length;
  for (let k = 0; k < n; k++) {
    const bits = k.toString(2).padStart(entrees.length, "0");
    if (!(bits in m.t)) return { ok: false, msg: "Combinaisons essayées : " + Object.keys(m.t).length + " / " + n };
    if (m.t[bits] !== (f(...bits.split("").map(Number)) ? 1 : 0)) return { ok: false, msg: "La sortie ne correspond pas pour A B = " + bits.split("").join(" ") + "." };
  }
  return true;
}
LS.ajouterTP({
  id: "num-02-portes",
  titre: "Les portes logiques",
  domaine: "numerique", niveau: 1, duree: "25 min",
  sim: "logique",
  intro: "En numérique, un fil ne porte que deux états : **0** (0 V) ou **1** (5 V ou 3,3 V). Une **porte logique** calcule une sortie à partir de ses entrées. Clique sur les entrées **A** et **B** pour les basculer ; un fil vert vaut 1. Pose une porte de la palette entre les entrées et le voyant **S**, relie-la, puis essaie **les 4 combinaisons** de A et B : c'est la **table de vérité**.",
  config: {
    palette: ["et", "ou", "non", "non_et", "non_ou", "oux"],
    schema: {
      compos: [
        { type: "entree", x: 4, y: 6, nom: "A", fixe: true },
        { type: "entree", x: 4, y: 14, nom: "B", fixe: true },
        { type: "led", x: 30, y: 10, nom: "S", fixe: true }
      ],
      fils: []
    }
  },
  objectifs: [
    { texte: "Fonction **ET** : S = 1 seulement si A = 1 **et** B = 1. Vérifie les 4 combinaisons.", verif: (s, m) => tableVue(s, m, ["A", "B"], "S", (a, b) => a && b) },
    { texte: "Fonction **OU** : S = 1 si A = 1 **ou** B = 1 (ou les deux).", verif: (s, m) => tableVue(s, m, ["A", "B"], "S", (a, b) => a || b) },
    { texte: "Fonction **OU exclusif** : S = 1 si A et B sont **différents**.", verif: (s, m) => tableVue(s, m, ["A", "B"], "S", (a, b) => a !== b) },
    { texte: "Défi : obtiens la fonction **ET** en n'utilisant **que des portes NON-ET** (NAND).", indice: "NON-ET suivie d'un inverseur donne ET ; et un NON-ET dont les deux entrées sont reliées est un inverseur.",
      verif: (s, m) => { const p = s.liste().filter(c => ["et", "ou", "non", "non_ou", "oux"].includes(c.type)); if (p.length) return { ok: false, msg: "Il reste d'autres portes que NON-ET." }; return tableVue(s, m, ["A", "B"], "S", (a, b) => a && b); } }
  ],
  questions: [
    { q: "Combien de lignes a la table de vérité d'une porte à 3 entrées ?", choix: ["3", "6", "8"], bonne: 2, explication: "2³ = 8 combinaisons." },
    { q: "Pourquoi dit-on que la porte NON-ET est « universelle » ?", choix: ["On peut fabriquer toutes les autres portes avec elle seule", "Elle marche partout", "Elle est la plus rapide"], bonne: 0 }
  ],
  notions: [["numerique", "Porte ET"], ["numerique", "Porte OU"], ["numerique", "Porte OU exclusif"], ["numerique", "Table de vérité"], ["numerique", "Porte NON-ET"]]
});
