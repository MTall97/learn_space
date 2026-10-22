LS.ajouterTP({
  id: "tel-04-liaison-serie",
  titre: "Liaison série asynchrone (UART)",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "uart",
  intro: "Le moniteur série de l'Arduino ou de l'ESP32, un module GPS, un Bluetooth HC-05 : tous parlent en **UART**. Chaque caractère est envoyé bit par bit sur un seul fil, encadré d'un bit de **start** et d'un bit de **stop**.",
  objectifs: [
    { texte: "Envoie le caractère **« a »** (code 97) : repère le bit de start, les 8 bits (poids faible d'abord), le stop.", verif: s => s.p.code === 97 },
    { texte: "Ajoute une **parité paire** : le bit P rend pair le nombre total de 1.", verif: s => s.p.parite === "paire" },
    { texte: "Décale la vitesse du récepteur jusqu'à ce que le caractère soit **mal reçu**. À partir de combien de % ?", verif: s => s.etat.lu !== undefined && s.etat.lu !== s.p.code }
  ],
  questions: [
    { q: "À 9 600 bauds, avec 10 bits par caractère, combien de caractères par seconde ?", choix: ["9 600", "960", "96"], bonne: 1 },
    { q: "Pour relier un ESP32 à un module GPS, on relie…", choix: ["TX à TX et RX à RX", "TX de l'un au RX de l'autre (croisé), et les masses ensemble", "seulement TX"], bonne: 1 }
  ],
  notions: [["telecom-transmission", "Série"], ["telecom-transmission", "Asynchrone"], ["telecom-transmission", "Synchrone"], ["esp32", "UART"]]
});
