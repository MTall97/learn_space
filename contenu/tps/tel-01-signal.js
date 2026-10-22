LS.ajouterTP({
  id: "tel-01-signal",
  titre: "Le signal : temps et fréquence",
  domaine: "telecom", niveau: 1, duree: "20 min",
  sim: "signal",
  intro: "« Sans fréquence, il n'y a pas de transmission. » Un signal se décrit de deux façons : dans le **temps** (ce que montre l'oscilloscope) et en **fréquence** (son spectre). Les deux représentations contiennent la même information.",
  objectifs: [
    { texte: "Règle un **sinus de 1 000 Hz** : une seule raie dans le spectre. Quelle est sa période ?", verif: s => s.p.forme === "sinus" && s.p.f === 1000 },
    { texte: "Passe en **carré** et ajoute des harmoniques une à une jusqu'à **15** : le signal se rapproche d'un vrai carré.", verif: s => s.p.forme === "carré" && s.p.N >= 15, bravo: "Un carré parfait contient une infinité d'harmoniques impaires (3f, 5f, 7f…), d'amplitudes 1/3, 1/5, 1/7…" },
    { texte: "Ajoute du **bruit** jusqu'à ce que le rapport signal/bruit tombe sous **10 dB**.", verif: s => { const h = LS.harmoniques(s.p.forme, s.p.N, s.p.A), Ps = h.reduce((a, b) => a + b * b / 2, 0); return s.p.bruit > 0 && 10 * Math.log10(Ps / (s.p.bruit * s.p.bruit)) < 10; } }
  ],
  questions: [
    { q: "Un signal carré de 1 kHz passe dans un câble qui coupe tout au-dessus de 2,5 kHz. Que reste-t-il ?", choix: ["Un carré parfait", "Presque une sinusoïde de 1 kHz (seule la fondamentale passe ; la 3e harmonique, 3 kHz, est coupée)", "Rien"], bonne: 1 },
    { q: "Le rapport signal/bruit de 20 dB signifie que la puissance du signal est…", choix: ["20 fois celle du bruit", "100 fois celle du bruit", "2 fois"], bonne: 1 }
  ],
  notions: [["telecom-transmission", "Signal"], ["telecom-transmission", "Représentation temporelle"], ["telecom-transmission", "Représentation fréquentielle"], ["telecom-transmission", "Bruit"], ["telecom-transmission", "Fréquence"]]
});
