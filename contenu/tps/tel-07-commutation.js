LS.ajouterTP({
  id: "tel-07-commutation",
  titre: "Commutation de circuits ou de paquets",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "commutation",
  intro: "Comment un message va-t-il de A à F à travers un réseau de commutateurs (B à E) ? Le téléphone classique **réserve un circuit** ; Internet **découpe en paquets**. Envoie le même message (6 morceaux) dans les deux modes et compare.",
  objectifs: [
    { texte: "En mode **circuits**, envoie un message : observe la **signalisation** (jaune) puis le chemin réservé.", verif: s => s.p.mode === "circuit" && s.etat.fini && !s.etat.coupure },
    { texte: "En mode circuits, pendant une communication qui passe par B–D, **coupe** cette liaison.", verif: s => s.p.mode === "circuit" && s.etat.coupure },
    { texte: "En mode **paquets**, envoie jusqu'à recevoir des paquets **dans le désordre**.", verif: s => s.p.mode === "paquet" && s.etat.fini && s.etat.recus.some((n, i) => i && n < s.etat.recus[i - 1]) },
    { texte: "En mode paquets, coupe B–D **avant** d'envoyer : le routage contourne la panne.", verif: s => s.p.mode === "paquet" && s.p.coupe && s.etat.fini }
  ],
  questions: [
    { q: "Pourquoi Internet utilise-t-il la commutation de paquets ?", choix: ["Les liaisons sont partagées entre tous et le réseau contourne les pannes", "C'est plus simple pour la voix", "Pour avoir un délai constant"], bonne: 0 },
    { q: "Les étapes « composition, sonnerie, raccrocher » relèvent de…", choix: ["la signalisation", "la transmission", "la modulation"], bonne: 0 }
  ],
  notions: [["telecom", "Commutation de circuits"], ["telecom", "Commutation de paquets"], ["telecom", "Circuit virtuel"], ["telecom", "Signalisation"]]
});
