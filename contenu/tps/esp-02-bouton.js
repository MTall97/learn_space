LS.ajouterTP({
  id: "esp-02-bouton",
  titre: "Lire un bouton : pull-up et rebonds",
  domaine: "esp32", niveau: 2, duree: "20 min",
  sim: "esp32", config: { p: { mode: "bouton" } },
  intro: "Pour lire un bouton, la broche est en **entrée**. Clique et **maintiens** le bouton dessiné (puis relâche) ; le graphe montre le niveau électrique sur la broche.",
  objectifs: [
    { texte: "En **INPUT** sans résistance, observe le niveau quand le bouton est relâché : la broche **flotte**.", verif: s => s.p.pinMode === "INPUT" && s.etat.flottant },
    { texte: "Passe en **INPUT_PULLUP** avec le bouton vers **GND** : relâché = 1, appuyé = 0.", verif: s => s.p.pinMode === "INPUT_PULLUP" && s.p.cablage === "GND" && !s.etat.flottant && s.etat.appuis > 0 },
    { texte: "Sans anti-rebond, fais plusieurs appuis : le compteur compte **trop** d'appuis. Puis règle un **anti-rebond** pour que les comptes soient justes sur 5 appuis.",
      verif: (s, m) => { if (s.p.antirebond === 0 && s.etat.compte > s.etat.appuis) m.trop = true; if (s.p.antirebond > 0 && m.n0 === undefined) { m.n0 = s.etat.appuis; m.c0 = s.etat.compte; } return !!m.trop && m.n0 !== undefined && s.etat.appuis - m.n0 >= 5 && s.etat.compte - m.c0 === s.etat.appuis - m.n0; } },
    { texte: "Branche le bouton sur **GPIO 35** en INPUT_PULLUP : ça ne marche pas. Pourquoi ?", verif: s => String(s.p.gpio) === "35" && s.p.pinMode === "INPUT_PULLUP" && s.etat.flottant, bravo: "Les GPIO 34 à 39 n'ont pas de résistances de tirage internes : il faut une résistance externe (10 kΩ vers 3,3 V)." }
  ],
  questions: [
    { q: "Avec INPUT_PULLUP et un bouton vers GND, digitalRead() renvoie quand on appuie…", choix: ["HIGH", "LOW", "une valeur au hasard"], bonne: 1 },
    { q: "Combien de temps dure typiquement le rebond d'un bouton ?", choix: ["Quelques microsecondes", "Quelques millisecondes", "Une seconde"], bonne: 1 }
  ],
  notions: [["esp32", "Résistance de tirage (pull-up)"], ["esp32", "Rebonds"], ["esp32", "digitalRead"], ["esp32", "GPIO"]]
});
