LS.ajouterTP({
  id: "math-01-trigo",
  titre: "Le cercle trigonométrique et la sinusoïde",
  domaine: "maths", niveau: 1, duree: "25 min",
  sim: "trigo",
  intro: "Le **cercle trigonométrique** a un rayon de 1. Le point d'angle θ a pour coordonnées (**cos θ**, **sin θ**). Quand il tourne à vitesse constante, sa hauteur trace une **sinusoïde** : la forme de la tension du réseau, d'un son pur ou d'une porteuse radio.\n\nDéplace le point avec le curseur ou en cliquant sur le cercle. En bas, la tension u et le courant i d'un appareil branché sur le réseau à 50 Hz, avec un déphasage réglable.",
  objectifs: [
    { texte: "Place le point à **90°**. Que valent sin θ et cos θ ?", verif: s => !s.p.tourne && s.p.angle === 90, bravo: "sin 90° = 1 et cos 90° = 0 : le point est tout en haut du cercle." },
    { texte: "Trouve l'angle entre 90° et 180° pour lequel **sin θ = 0,5**.", verif: s => !s.p.tourne && s.p.angle === 150, indice: "sin 30° = 0,5. Le cercle est symétrique par rapport à l'axe vertical : quel angle a la même hauteur de l'autre côté ?", bravo: "sin 150° = sin 30° = 0,5, mais cos 150° = −0,87 : deux angles ont le même sinus." },
    { texte: "Affiche les angles **en radians** et place le point à **π rad**.", verif: s => s.p.radians && !s.p.tourne && s.p.angle === 180, bravo: "π rad = 180° : un demi-tour. Un tour complet vaut 2π rad." },
    { texte: "Lance la rotation à **f = 0,5 tr/s**. Combien de temps dure un tour ? Quelle est la pulsation ω ?", verif: s => s.p.tourne && Math.abs(s.p.f - 0.5) < 1e-6, bravo: "T = 1/f = 2 s et ω = 2πf = π ≈ 3,14 rad/s. Au réseau, f = 50 Hz : T = 20 ms et ω = 314 rad/s." },
    { texte: "Règle le déphasage du courant à **+90°** : c'est le cas d'une bobine parfaite. De combien de millisecondes le courant est-il en retard ?", verif: s => s.p.phi === 90, bravo: "Un quart de période : 20 ms / 4 = 5 ms. Le facteur de puissance cos 90° = 0 : la bobine parfaite ne consomme pas d'énergie en moyenne." },
    { texte: "Mets u et i en **opposition de phase**.", verif: s => Math.abs(s.p.phi) === 180, bravo: "Décalage d'une demi-période (10 ms) : quand u est maximale, i est minimale." }
  ],
  questions: [
    { q: "Combien de radians dans 60° ?", choix: ["π/6", "π/3", "π/2"], bonne: 1, explication: "60 × π / 180 = π/3 ≈ 1,05 rad." },
    { q: "Une tension sinusoïdale de 230 V efficaces a une amplitude de…", choix: ["230 V", "325 V", "163 V"], bonne: 1, explication: "U_max = U_eff × √2 = 230 × 1,414 ≈ 325 V." },
    { q: "À 60 Hz (réseau américain), la période vaut :", choix: ["16,7 ms", "20 ms", "60 ms"], bonne: 0, explication: "T = 1/60 s ≈ 16,7 ms." }
  ],
  notions: [["maths", "Radian"], ["maths", "Cercle trigonométrique"], ["maths", "Sinus, cosinus, tangente"], ["maths", "Sinusoïde"], ["maths", "Pulsation"], ["maths", "Déphasage"]],
  suite: "Va voir le TP « Courant alternatif à l'oscilloscope » : la même sinusoïde, mesurée sur un circuit."
});
