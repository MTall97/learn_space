LS.ajouterTP({
  id: "bat-02-differentiel",
  titre: "Défaut d'isolement et différentiel 30 mA",
  domaine: "batiment", niveau: 2, duree: "30 min",
  sim: "differentiel",
  intro: "Une machine à laver à carcasse métallique a un **défaut d'isolement** : la phase touche la carcasse. L'installation est en schéma **TT** : neutre à la terre au transformateur (RB = 10 Ω), carcasse reliée à la prise de terre de la maison (RA). Fais varier la terre, la résistance du défaut, la protection et la personne qui touche (réseau malien de 220 V ; résistance du corps sous 220-230 V : environ 1 000 à 2 100 Ω selon les personnes, peau sèche, d'après la CEI 60479-1 ; on prend une valeur prudente, beaucoup moins si la peau est mouillée), et observe la tension de contact, le courant dans le corps et sa durée.\n\nLe graphe place le choc reçu (courant, durée) sur les zones d'effets de la CEI 60479-1, **très simplifiées** : la réalité dépend du trajet du courant, de la personne et de l'état de la peau.",
  config: { p: { IDn: 0, defaut: true, Rd: 1, RA: 30, touche: false, Rh: 1300 } },
  objectifs: [
    { texte: "Sans différentiel, avec une bonne terre (30 Ω) : fais toucher la carcasse par une personne aux mains sèches. Le disjoncteur ne coupe pas et le choc est en zone **AC-4**.",
      verif: s => { const k = s.calc(); return s.p.IDn === 0 && s.p.touche && isFinite(s.p.RA) && k.brut.Ib > 0 && k.zone === "AC-4"; },
      bravo: "Le courant de défaut (quelques ampères) est bien trop faible pour le disjoncteur 16 A : la carcasse reste vers 160 V, sans fin." },
    { texte: "Ajoute un différentiel **30 mA** : il coupe. Réarme : il recoupe tant que le défaut est là.",
      verif: s => s.p.IDn === 0.03 && s.etat.ouvert && s.etat.cause === "differentiel" },
    { texte: "Le 500 mA du disjoncteur de branchement avec une mauvaise terre (**1 500 Ω**) et un défaut de **1 kΩ** ou plus : il ne coupe pas, alors que la carcasse dépasse **50 V**.",
      verif: s => { const k = s.calc(); return s.p.IDn === 0.5 && s.p.RA === 1500 && s.p.Rd >= 1000 && k.brut.Uc > 50 && !isFinite(k.tdiff); },
      bravo: "RA × IΔn = 750 V : la condition RA × IΔn ≤ 50 V n'est pas tenue. Un 500 mA ne protège pas les personnes." },
    { texte: "Terre **absente**, mains **humides**, différentiel 30 mA : tout le courant passe par la personne, mais la coupure est assez rapide pour rester **hors de la zone AC-4**.",
      verif: s => { const d = s.etat.dernier; return !isFinite(s.p.RA) && s.p.touche && s.p.Rh <= 1000 && s.p.IDn === 0.03 && s.etat.ouvert && d && d.Ib > 0.03 && d.zone !== "AC-4"; },
      bravo: "Plus de 200 mA, mais pendant environ 40 ms : le différentiel 30 mA est la dernière protection des personnes." },
    { texte: "Appuie sur le **bouton test** d'un différentiel.", verif: s => s.etat.test }
  ],
  questions: [
    { q: "Défaut franc, RA = 30 Ω, RB = 10 Ω : courant de défaut ?", choix: ["≈ 5,5 A", "≈ 22 A", "≈ 30 mA"], bonne: 0, explication: "Id = 220 / (10 + 30) = 5,5 A, et Uc = 5,5 × 30 = 165 V." },
    { q: "Avec un différentiel 30 mA, quelle résistance de terre maximale (UL = 50 V) ?", choix: ["≈ 17 Ω", "≈ 167 Ω", "≈ 1 667 Ω"], bonne: 2, explication: "RA ≤ 50 / 0,03 ≈ 1 667 Ω ; on vise en pratique bien moins de 100 Ω." },
    { q: "Un interrupteur différentiel protège-t-il contre les surcharges ?", choix: ["Oui", "Non, il faut des disjoncteurs en aval"], bonne: 1 }
  ],
  notions: [["batiment", "Défaut d'isolement"], ["batiment", "Interrupteur différentiel"], ["batiment", "Sensibilité 30 mA"], ["batiment", "Prise de terre"], ["batiment", "Tension de contact"], ["batiment", "Tension limite 50 V"], ["batiment", "Effets du courant sur le corps"], ["batiment", "Schéma TT"], ["batiment", "Bouton test"]],
  suite: "Le bouton test de ton tableau : appuie dessus (le courant sera coupé), puis réarme. S'il ne déclenche pas, fais vérifier l'installation."
});
