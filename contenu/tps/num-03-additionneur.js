function verifAdd(s, m, entrees, f) {
  const e = entrees.map(n => s.trouver(n)), S = s.trouver("S"), C = s.trouver("C");
  if (e.some(x => !x) || !S || !C) return false;
  const cle = e.map(x => x.p.v ? 1 : 0).join("");
  m.t = m.t || {};
  m.t[cle] = [(S._e || [0])[0], (C._e || [0])[0]];
  const n = 1 << entrees.length;
  for (let k = 0; k < n; k++) {
    const bits = k.toString(2).padStart(entrees.length, "0");
    if (!(bits in m.t)) return { ok: false, msg: "Combinaisons essayées : " + Object.keys(m.t).length + " / " + n };
    const somme = bits.split("").map(Number).reduce((a, b) => a + b, 0);
    if (m.t[bits][0] !== somme % 2 || m.t[bits][1] !== (somme >> 1)) return { ok: false, msg: "Erreur pour " + bits.split("").join(" + ") + " : attendu S = " + somme % 2 + ", C = " + (somme >> 1) + "." };
  }
  return true;
}
LS.ajouterTP({
  id: "num-03-additionneur",
  titre: "Construire un additionneur",
  domaine: "numerique", niveau: 2, duree: "30 min",
  sim: "logique",
  intro: "En binaire : 0 + 0 = 0, 0 + 1 = 1, 1 + 1 = **10** (on écrit 0, on **retient** 1). Un **demi-additionneur** calcule la somme **S** et la retenue **C** de deux bits. Un **additionneur complet** ajoute aussi la retenue précédente **Cin** : en en chaînant 8, on additionne deux octets. C'est le cœur de tout processeur.",
  config: {
    palette: ["et", "ou", "oux", "non", "non_et"],
    largeur: 44, hauteur: 26,
    schema: {
      compos: [
        { type: "entree", x: 4, y: 4, nom: "A", fixe: true },
        { type: "entree", x: 4, y: 10, nom: "B", fixe: true },
        { type: "entree", x: 4, y: 18, nom: "Cin", fixe: true },
        { type: "led", x: 38, y: 6, nom: "S", fixe: true },
        { type: "led", x: 38, y: 16, nom: "C", p: { couleur: "jaune" }, fixe: true }
      ],
      fils: []
    }
  },
  objectifs: [
    { texte: "**Demi-additionneur** : S = A + B (sans retenue), C = retenue. Laisse Cin à 0 et vérifie les 4 cas de A et B.", indice: "S = A OU-X B ; C = A ET B.",
      verif: (s, m) => s.trouver("Cin").p.v ? { ok: false, msg: "Laisse Cin à 0 pour cette étape." } : verifAdd(s, m, ["A", "B"]) },
    { texte: "**Additionneur complet** : ajoute Cin. Vérifie les **8** cas (A + B + Cin).", indice: "Deux demi-additionneurs : le premier fait A + B, le second ajoute Cin à cette somme ; les deux retenues passent par une porte OU.",
      verif: (s, m) => verifAdd(s, m, ["A", "B", "Cin"]) }
  ],
  questions: [
    { q: "Combien vaut 1 + 1 + 1 en binaire ?", choix: ["11", "10", "111"], bonne: 0, explication: "3 = 11 en binaire : S = 1, retenue = 1." },
    { q: "Pour additionner deux nombres de 8 bits, il faut…", choix: ["8 additionneurs complets chaînés par leurs retenues", "1 porte ET", "16 demi-additionneurs indépendants"], bonne: 0 }
  ],
  notions: [["numerique", "Additionneur"], ["numerique", "Binaire"], ["numerique", "Porte OU exclusif"]]
});
