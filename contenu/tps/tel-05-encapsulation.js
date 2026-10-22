LS.ajouterTP({
  id: "tel-05-encapsulation",
  titre: "Encapsulation : de la donnée à la trame",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "encapsulation",
  intro: "Quand ton navigateur demande une page, la donnée descend les **7 couches** du modèle OSI. Chacune ajoute un en-tête utile à sa couche homologue chez le destinataire. Suis l'animation (couche en orange).",
  objectifs: [
    { texte: "Envoie **10 octets** en TCP : la trame Ethernet est complétée par du **bourrage** pour atteindre 64 octets. Note l'efficacité.", verif: s => s.p.taille === 10 && s.p.proto === "TCP" },
    { texte: "Passe en **UDP** : l'en-tête de transport passe de 20 à 8 octets.", verif: s => s.p.proto === "UDP" },
    { texte: "Envoie **4 000 octets** : combien de paquets faut-il (MTU de 1 500 octets) ?", verif: s => s.p.taille >= 4000 }
  ],
  questions: [
    { q: "Quelle couche utilise les adresses MAC ?", choix: ["Réseau (3)", "Liaison de données (2)", "Transport (4)"], bonne: 1 },
    { q: "Quelle couche utilise les numéros de port (80 pour le web) ?", choix: ["Transport (4)", "Physique (1)", "Réseau (3)"], bonne: 0 },
    { q: "Taille minimale d'une trame Ethernet ?", choix: ["18 octets", "64 octets", "1 518 octets"], bonne: 1 }
  ],
  notions: [["telecom-osi", "Encapsulation"], ["telecom-osi", "Transport (TCP)"], ["telecom-osi", "Réseau (IP)"], ["telecom-osi", "Trame Ethernet"], ["telecom-osi", "UDP"]]
});
