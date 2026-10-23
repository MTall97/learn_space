LS.ajouterTP({
  id: "bat-03-chute-tension",
  titre: "Longueur de câble et chute de tension",
  domaine: "batiment", niveau: 2, duree: "25 min",
  sim: "chuteTension", securite: "secteur",
  intro: "On alimente un appareil au bout d'une ligne (un abri au fond du jardin, une pompe dans un puits). Le câble a une résistance : une partie de la tension se perd en chemin et chauffe le câble. Fais varier la longueur, la section et le métal, puis démarre un moteur.\n\nCalcul selon la formule de la NF C 15-100 : u = b (ρ L / S cos φ + λ L sin φ) I, avec ρ à chaud (cuivre 0,0225, aluminium 0,036 Ω·mm²/m), λ = 0,08 mΩ/m, b = 2 en monophasé, courant calculé sous 220 V (réseau malien).",
  config: { p: { charge: "radiateur", matiere: "cuivre", section: 1.5, longueur: 20 } },
  objectifs: [
    { texte: "Radiateur à **50 m** ou plus en **1,5 mm²** : la chute de tension dépasse **5 %**.",
      verif: s => { const k = s.calc(); return s.p.charge === "radiateur" && s.p.longueur >= 50 && s.p.section === 1.5 && k.pourcent > 5; } },
    { texte: "Toujours en cuivre et à 50 m au moins, trouve la **plus petite section** qui garde la chute sous **3 %**.",
      verif: s => {
        const S = [1.5, 2.5, 4, 6, 10, 16, 25], i = S.indexOf(s.p.section), k = s.calc();
        if (s.p.charge !== "radiateur" || s.p.matiere !== "cuivre" || s.p.longueur < 50 || k.pourcent > 3 || i < 1) return false;
        const avant = LS.chuteTension({ I: k.I, longueur: s.p.longueur, section: S[i - 1], matiere: "cuivre", cosphi: 1 });
        return avant.pourcent > 3 ? true : { ok: false, msg: "Ça marche, mais une section plus petite suffirait." };
      } },
    { texte: "Même radiateur, même longueur, en **aluminium** sous 3 % : quelle section faut-il ?",
      verif: s => { const k = s.calc(); return s.p.charge === "radiateur" && s.p.matiere === "alu" && s.p.longueur >= 50 && k.pourcent <= 3; },
      bravo: "Environ 1,6 fois la section en cuivre, car l'aluminium est 1,6 fois plus résistif." },
    { texte: "Choisis la **pompe**, à **100 m** en **2,5 mm²** cuivre, et démarre-la : au démarrage, la chute dépasse **15 %**.",
      verif: s => { const k = s.calc(); return s.p.charge === "pompe" && s.p.longueur >= 100 && s.p.section === 2.5 && s.etat.demarre && k.dem.pourcent > 15; } },
    { texte: "Trouve la section qui ramène la chute au démarrage de la pompe sous 15 % à 100 m, et redémarre-la.",
      verif: s => { const k = s.calc(); return s.p.charge === "pompe" && s.p.longueur >= 100 && k.dem.pourcent <= 15 && s.etat.demarre && s.t - s.etat.tDem > 1.5; } }
  ],
  questions: [
    { q: "On double la longueur de la ligne : la chute de tension…", choix: ["reste la même", "double", "est divisée par deux"], bonne: 1 },
    { q: "On passe de 1,5 à 6 mm² : la chute de tension est…", choix: ["divisée par 4", "divisée par 2", "multipliée par 4"], bonne: 0, explication: "R = ρ L / S : quatre fois plus de section, quatre fois moins de résistance." },
    { q: "Pourquoi la chute est-elle plus forte au démarrage d'un moteur ?", choix: ["La tension du réseau baisse", "Le moteur appelle 5 à 8 fois son courant nominal", "Le câble refroidit"], bonne: 1 }
  ],
  notions: [["batiment", "Chute de tension"], ["batiment", "Résistivité"], ["batiment", "Sections usuelles"], ["elec-bases", "Loi d'Ohm"]],
  suite: "Calcule la chute de tension d'une rallonge de 25 m en 1,5 mm² qui alimente une tondeuse de 1 400 W. Est-elle acceptable ?"
});
