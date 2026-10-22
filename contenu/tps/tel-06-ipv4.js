LS.ajouterTP({
  id: "tel-06-ipv4",
  titre: "Adresses IPv4 et masques",
  domaine: "telecom", niveau: 3, duree: "25 min",
  sim: "ipv4",
  intro: "Ta box donne à tes appareils des adresses comme 192.168.1.10 avec le masque 255.255.255.0 (/24). Les bits sont affichés : bleu = réseau, vert = machine.\n\nRéponds dans les champs des objectifs. Pour t'entraîner vraiment, coche **« Cacher les résultats »** : la simulation n'affiche plus le réseau ni la diffusion, tu les calcules.",
  ordre: true,
  objectifs: [
    { texte: "Machine A = 192.168.1.10/24. **Calcule** le nombre de machines possibles dans ce réseau.", reponse: { valeur: 254 },
      indice: "/24 laisse 32 − 24 = 8 bits pour les machines : 2⁸ adresses, moins l'adresse du réseau et celle de diffusion.", bravo: "2⁸ − 2 = 254." },
    { texte: "Quelle est l'adresse de **diffusion** de ce réseau ?", reponse: { valeur: "192.168.1.255" },
      indice: "Tous les bits de la partie machine à 1.", bravo: "Un message envoyé à 192.168.1.255 est reçu par toutes les machines du réseau." },
    { texte: "Remets A en 192.168.1.10/24, puis place la machine B sur un **autre réseau** (change son 3e octet) : il faut un routeur.", verif: s => s.p.o1 === 192 && s.p.o2 === 168 && s.p.o3 === 1 && s.p.o4 === 10 && s.p.cidr === 24 && s.p.b3 !== s.p.o3 },
    { texte: "Coche « Cacher les résultats ». Quel est le **plus grand préfixe** /n qui permet encore **au moins 50 machines** ? Calcule-le.",
      saisie: v => LS.lireNombre(String(v).replace("/", "")) === 26,
      aide: "Cherche le plus petit nombre de bits machine b tel que 2^b − 2 ≥ 50, puis n = 32 − b.", bravo: "6 bits machine : 2⁶ − 2 = 62 ≥ 50 ; 5 bits ne donneraient que 30. Donc /26 (masque 255.255.255.192)." },
    { texte: "Machine 10.0.0.1/22 : combien de machines possibles ? (calcule, puis vérifie dans la simulation)", reponse: { valeur: 1022 },
      aide: "32 − 22 = 10 bits machine." },
    { texte: "Et l'adresse de **diffusion** de 10.0.0.1/22 ?", reponse: { valeur: "10.0.3.255" },
      aide: "Les 2 bits de poids faible du 3e octet font partie de la machine : le 3e octet va de 0 à 3." }
  ],
  questions: [
    { q: "/26 correspond au masque…", choix: ["255.255.255.0", "255.255.255.192", "255.255.255.252"], bonne: 1 },
    { q: "Combien de machines dans un réseau /30 ?", choix: ["2", "4", "30"], bonne: 0, explication: "2² − 2 = 2 : utilisé pour relier deux routeurs." }
  ],
  notions: [["telecom-osi", "Adresse IP"], ["telecom-osi", "Masque de sous-réseau"], ["telecom-osi", "Partie réseau"], ["telecom-osi", "Partie hôte"], ["telecom-osi", "Adresse de broadcast"]]
});
