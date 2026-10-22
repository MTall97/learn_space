LS.ajouterTP({
  id: "math-02-complexes",
  titre: "Nombres complexes et phaseurs",
  domaine: "maths", niveau: 2, duree: "35 min",
  sim: "complexes",
  intro: "Un **nombre complexe** z = a + jb est un point du plan : a sur l'axe horizontal (réel), b sur l'axe vertical (imaginaire), avec **j² = −1**. Ce n'est pas un nombre « imaginaire » au sens d'irréel : c'est l'outil qui rend simples les calculs en courant alternatif, où chaque grandeur a une amplitude **et** une phase.\n\nPremière partie : déplace z₁ dans le plan (clique ou glisse) et combine-le avec z₂. Seconde partie : l'**impédance** d'un circuit R, L, C en série, dessinée comme une somme de flèches.",
  objectifs: [
    { texte: "Place z₁ en **3 + 4j**. Quel est son module ?", verif: s => s.p.vue === "plan" && Math.abs(s.p.re1 - 3) < 0.05 && Math.abs(s.p.im1 - 4) < 0.05, bravo: "|z₁| = √(9 + 16) = 5, argument ≈ 53°. On reconnaît le triangle rectangle 3-4-5." },
    { texte: "Choisis le **produit** avec z₂ = **j** (module 1, argument 90°). Qu'arrive-t-il à z₁ ?", verif: s => s.p.vue === "plan" && s.p.op === "produit" && Math.abs(s.p.r2 - 1) < 1e-6 && s.p.t2 === 90, bravo: "Multiplier par j fait tourner de 90° sans changer la longueur : j × (3 + 4j) = −4 + 3j." },
    { texte: "Toujours en produit, prends z₂ de module **2** et d'argument **−45°** : vérifie que les modules se multiplient et que les arguments s'additionnent.", verif: s => s.p.vue === "plan" && s.p.op === "produit" && Math.abs(s.p.r2 - 2) < 1e-6 && s.p.t2 === -45 },
    { texte: "Passe à l'**impédance RLC**. Cherche la fréquence de **résonance** : celle où |Z| devient égal à R.", verif: s => { if (s.p.vue !== "rlc") return false; const z = LS.impedanceRLC(s.p.R, s.p.L, s.p.C, s.p.f); return Math.abs(s.p.f / z.f0 - 1) < 0.03; }, indice: "f₀ = 1 / (2π√(LC)). Avec L = 0,1 H et C = 10 µF, f₀ ≈ 159 Hz.", bravo: "À la résonance, Lω = 1/(Cω) : les flèches de la bobine et du condensateur s'annulent. Le courant est maximal et en phase avec la tension." },
    { texte: "Monte la fréquence jusqu'à ce que le circuit soit nettement **inductif** : déphasage supérieur à **+60°**.", verif: s => s.p.vue === "rlc" && LS.impedanceRLC(s.p.R, s.p.L, s.p.C, s.p.f).argument * 180 / Math.PI > 60 }
  ],
  questions: [
    { q: "Que vaut j² ?", choix: ["1", "−1", "j"], bonne: 1 },
    { q: "L'impédance d'un condensateur de 10 µF à 50 Hz vaut environ :", choix: ["318 Ω", "3,14 mΩ", "0,5 Ω"], bonne: 0, explication: "1/(Cω) = 1/(10⁻⁵ × 314) ≈ 318 Ω." },
    { q: "En multipliant deux complexes, les arguments…", choix: ["se multiplient", "s'additionnent", "se soustraient"], bonne: 1 }
  ],
  notions: [["maths", "Forme algébrique"], ["maths", "Module et argument"], ["maths", "Forme exponentielle"], ["maths", "Phaseur"], ["maths", "Impédance complexe"]],
  suite: "Le TP « Filtre RC passe-bas » applique le même calcul : à la fréquence de coupure, |Z_C| = R."
});
