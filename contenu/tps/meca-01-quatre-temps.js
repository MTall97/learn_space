LS.ajouterTP({
  id: "meca-01-quatre-temps",
  titre: "Le moteur 4 temps",
  domaine: "moteurs", niveau: 1, duree: "30 min",
  sim: "moteur4t",
  intro: "Voici un cylindre de moteur essence en coupe, animé au ralenti. Le cycle **Beau de Rochas** (ou d'Otto) se fait en **4 temps** = 2 tours de vilebrequin : admission, compression, combustion-détente, échappement. À droite : la **roue des phases** (avec les ouvertures de soupapes en anneaux : bleu = admission, gris = échappement, point jaune = étincelle) et le **diagramme pression-volume**, dont l'aire est le travail fourni à chaque cycle.",
  config: { cacher: ["turbo"] },
  objectifs: [
    { texte: "Mets en **pause** et utilise « Temps suivant → » pour parcourir les 4 temps. Observe les soupapes.",
      verif: (s, m) => { m.vus = m.vus || new Set(); m.vus.add(LS.phaseMoteur(s.etat.th).n); return m.vus.size === 4 && !s.enMarche; } },
    { texte: "Remarque le **croisement des soupapes** : autour du PMH entre échappement et admission, les deux soupapes sont ouvertes en même temps. Arrête l'animation dans cette position.",
      verif: s => { const sp = LS.soupapes(s.etat.th); return !s.enMarche && sp.adm > 0.02 && sp.ech > 0.02; },
      bravo: "On ouvre l'admission avant le PMH et on ferme l'échappement après : les gaz en mouvement aident à remplir et vider le cylindre." },
    { texte: "Coupe l'**allumage** : le diagramme pression-volume s'aplatit et le couple devient **négatif** (le moteur doit être entraîné). Rallume ensuite.",
      verif: (s, m) => { if (!s.p.allumage && s.etat.cyc.couple < 0) m.vu = true; return !!(m.vu && s.p.allumage); } },
    { texte: "Cherche l'**avance à l'allumage** qui donne le **couple maximal** (essence, pleine charge, 3 000 tr/min).",
      indice: "Trop peu d'avance : la combustion se fait en grande partie pendant la descente du piston. Trop : la pression monte pendant que le piston remonte encore (et cliquetis).",
      verif: s => { if (s.p.mode !== "essence" || s.p.charge < 100) return false; const ref = LS.cycleMoteur(Object.assign({}, s.p, { avance: 0 })); let best = -1e9; for (let a = 0; a <= 45; a++) best = Math.max(best, LS.cycleMoteur(Object.assign({}, s.p, { avance: a })).couple); return s.etat.cyc.couple > best - 0.3 && ref; } },
    { texte: "Calcule la **cylindrée** d'un cylindre de 75 mm d'alésage et 84,8 mm de course, puis vérifie dans les mesures. Règle ensuite 82 × 75,6 mm (un 400 cm³).",
      verif: s => Math.abs(s.p.alesage - 82) < 0.6 && Math.abs(s.p.course - 75.6) < 0.6 }
  ],
  questions: [
    { q: "Combien de tours fait le vilebrequin pendant un cycle 4 temps ?", choix: ["1", "2", "4"], bonne: 1 },
    { q: "Cylindrée unitaire = …", choix: ["π × alésage² / 4 × course", "alésage × course", "π × course² × alésage"], bonne: 0, explication: "Surface du piston × course : π × 7,5² / 4 × 8,48 ≈ 375 cm³." },
    { q: "Pourquoi augmenter le taux de compression améliore-t-il le rendement ?", choix: ["Les gaz se détendent davantage : on récupère plus de travail par cycle", "Il y a plus d'essence", "Le moteur tourne plus vite"], bonne: 0 }
  ],
  notions: [["moteur", "Cycle 4 temps"], ["moteur", "PMH et PMB"], ["moteur", "Cylindrée"], ["moteur", "Taux de compression"], ["moteur", "Avance à l'allumage"], ["moteur", "Soupapes"], ["moteur", "Diagramme de distribution"]]
});
