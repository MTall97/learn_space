LS.ajouterTP({
  id: "math-03-derivees",
  titre: "Dérivée et intégrale",
  domaine: "maths", niveau: 2, duree: "35 min",
  sim: "derivees",
  intro: "La **dérivée** dit à quelle vitesse une grandeur change : c'est la **pente** de la tangente à la courbe. L'**intégrale** additionne une grandeur au fil du temps : c'est l'**aire** sous la courbe. Les deux sont réciproques.\n\nChoisis une courbe, déplace le point, rapproche la sécante de la tangente, puis découpe l'aire en rectangles. Le graphe du bas trace la dérivée.",
  objectifs: [
    { texte: "Sur y = x², trouve le point où la tangente est **horizontale** (pente nulle).", verif: s => s.p.courbe === "carre" && Math.abs(LS.etatDerivee(s.p).pente) < 0.1, bravo: "En x = 0, la parabole passe par son minimum : la dérivée 2x s'annule. Un extremum se trouve là où la dérivée vaut 0." },
    { texte: "Toujours sur x², réduis l'écart h de la sécante en dessous de **0,01** : sa pente rejoint celle de la tangente.", verif: s => s.p.courbe === "carre" && s.p.h <= 0.0101, bravo: "La dérivée est exactement cette limite : (f(x + h) − f(x)) / h quand h tend vers 0." },
    { texte: "Charge d'un condensateur : à t = 0, la tension monte à 10 V/s. Trouve l'instant où la pente est **divisée par 2** (5 V/s).", verif: s => s.p.courbe === "condo" && Math.abs(LS.etatDerivee(s.p).pente - 5) < 0.2, indice: "La pente vaut 10·e^(−t) : elle est divisée par 2 quand e^(−t) = 0,5, soit t = ln 2.", bravo: "t = ln 2 ≈ 0,69 s. Le courant de charge i = C·du/dt diminue de moitié en même temps." },
    { texte: "Vitesse d'une voiture : affiche l'aire et place le point **à la fin** (100 %). Avec au moins **50 rectangles**, l'aire approchée est à moins de 1 % de la distance exacte.", verif: s => { if (s.p.courbe !== "vitesse" || !s.p.aire || s.p.x0 < 100 || Math.round(s.p.n) < 50) return false; const e = LS.etatDerivee(s.p); return Math.abs(e.aireRect - e.aireExacte) / e.aireExacte < 0.01; }, bravo: "Distance = ∫ v dt = 135 m. L'aire sous la courbe de vitesse est la distance parcourue." },
    { texte: "Puissance d'une maison : mesure l'**énergie consommée en 24 h** (aire jusqu'à la fin de la journée).", verif: s => s.p.courbe === "puissance" && s.p.aire && s.p.x0 >= 100, bravo: "36 000 Wh = 36 kWh. C'est ce qu'affiche le compteur : il intègre la puissance au fil du temps." }
  ],
  questions: [
    { q: "La dérivée de la position par rapport au temps est…", choix: ["l'accélération", "la vitesse", "la distance"], bonne: 1 },
    { q: "Un appareil de 500 W fonctionne 4 h. Énergie consommée ?", choix: ["2 kWh", "125 Wh", "2 000 kWh"], bonne: 0, explication: "E = P × t = 500 W × 4 h = 2 000 Wh = 2 kWh." },
    { q: "Avec des rectangles « au milieu », l'erreur diminue…", choix: ["moins vite qu'à gauche", "plus vite qu'à gauche", "pas du tout"], bonne: 1, explication: "Erreur en 1/n² au lieu de 1/n pour une courbe régulière." }
  ],
  notions: [["maths", "Taux de variation"], ["maths", "Dérivée"], ["maths", "Intégrale"], ["maths", "Méthode des rectangles"], ["maths", "Énergie et puissance"]],
  suite: "Dans le TP « Tenir l'altitude avec un PID », le terme I intègre l'erreur et le terme D la dérive : refais-le en pensant à ces deux opérations."
});
