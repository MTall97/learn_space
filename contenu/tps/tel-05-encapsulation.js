LS.ajouterTP({
  id: "tel-05-encapsulation",
  titre: "Encapsulation : de la donnée à la trame",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "encapsulation",
  intro: "Quand ton navigateur demande une page, la donnée descend les **7 couches** du modèle OSI. Chacune ajoute un en-tête utile à sa couche homologue chez le destinataire. Suis l'animation (couche en orange).",
  ordre: true,
  objectifs: [
    { texte: "Envoie **10 octets** en **UDP** : la trame Ethernet est trop courte (minimum 64 octets) et reçoit du **bourrage**. Combien d'octets de bourrage ?",
      reponse: { valeur: 8, unite: "octets" }, verif: s => s.p.taille === 10 && s.p.proto === "UDP", condition: "Règle 10 octets en UDP, puis réponds.",
      aide: "10 (données) + 8 (UDP) + 20 (IP) + 14 (Ethernet) + 4 (CRC) = 56 octets.", bravo: "56 octets seulement : il en manque 8 pour atteindre 64." },
    { texte: "Toujours 10 octets, mais en **TCP** : quelle est la taille de la trame ? Pourquoi n'y a-t-il plus de bourrage ?",
      reponse: { valeur: 68, unite: "octets" },
      aide: "L'en-tête TCP fait 20 octets au lieu de 8.", bravo: "10 + 20 + 20 + 18 = 68 ≥ 64 : pas besoin de bourrage. Mais 58 octets d'en-têtes pour 10 utiles !" },
    { texte: "Pour envoyer **4 000 octets** en TCP, combien faut-il de paquets ? (MTU 1 500 octets, en-têtes IP 20 + TCP 20)",
      reponse: { valeur: 3 },
      aide: "Chaque paquet transporte au plus 1 500 − 20 − 20 = 1 460 octets de données.", bravo: "4 000 / 1 460 = 2,7 → 3 paquets." },
    { texte: "Règle 4 000 octets en TCP : quelle est l'**efficacité** sur le câble (en %) ? Compare avec 10 octets.",
      reponse: { valeur: 94.5, tolerance: 1, unite: "%" }, verif: s => s.p.taille === 4000 && s.p.proto === "TCP", condition: "Règle 4 000 octets en TCP, puis lis l'efficacité.",
      bravo: "≈ 94 % contre ≈ 11 % pour 10 octets : envoyer de gros blocs amortit les en-têtes." }
  ],
  questions: [
    { q: "Quelle couche utilise les adresses MAC ?", choix: ["Réseau (3)", "Liaison de données (2)", "Transport (4)"], bonne: 1 },
    { q: "Quelle couche utilise les numéros de port (80 pour le web) ?", choix: ["Transport (4)", "Physique (1)", "Réseau (3)"], bonne: 0 },
    { q: "Taille minimale d'une trame Ethernet ?", choix: ["18 octets", "64 octets", "1 518 octets"], bonne: 1 }
  ],
  notions: [["telecom-osi", "Encapsulation"], ["telecom-osi", "Transport (TCP)"], ["telecom-osi", "Réseau (IP)"], ["telecom-osi", "Trame Ethernet"], ["telecom-osi", "UDP"]]
});
