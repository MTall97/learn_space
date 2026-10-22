LS.ajouterTP({
  id: "tel-06-ipv4",
  titre: "Adresses IPv4 et masques",
  domaine: "telecom", niveau: 3, duree: "25 min",
  sim: "ipv4",
  intro: "Ta box donne à tes appareils des adresses comme 192.168.1.10 avec le masque 255.255.255.0 (/24). Les bits sont affichés : bleu = réseau, vert = machine.",
  objectifs: [
    { texte: "Avec 192.168.1.10/24, combien de machines possibles ? Quelle est l'adresse de **diffusion** ?", verif: s => s.p.o1 === 192 && s.p.o2 === 168 && s.p.o3 === 1 && s.p.cidr === 24 },
    { texte: "Place la machine B sur un **autre réseau** (change son 3e octet) : il faut un routeur.", verif: s => s.p.cidr === 24 && s.p.b3 !== s.p.o3 },
    { texte: "Trouve le plus grand préfixe (/n) qui permet encore **au moins 50 machines**.", verif: s => s.p.cidr === 26 },
    { texte: "Avec 10.0.0.1, règle un préfixe **/22** et lis le nombre de machines.", verif: s => s.p.o1 === 10 && s.p.o2 === 0 && s.p.o3 === 0 && s.p.o4 === 1 && s.p.cidr === 22 }
  ],
  questions: [
    { q: "/26 correspond au masque…", choix: ["255.255.255.0", "255.255.255.192", "255.255.255.252"], bonne: 1 },
    { q: "Combien de machines dans un réseau /30 ?", choix: ["2", "4", "30"], bonne: 0, explication: "2² − 2 = 2 : utilisé pour relier deux routeurs." }
  ],
  notions: [["telecom-osi", "Adresse IP"], ["telecom-osi", "Masque de sous-réseau"], ["telecom-osi", "Partie réseau"], ["telecom-osi", "Partie hôte"], ["telecom-osi", "Adresse de broadcast"]]
});
