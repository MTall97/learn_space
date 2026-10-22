LS.ajouterTP({
  id: "tel-04-liaison-serie",
  titre: "Liaison série asynchrone (UART)",
  domaine: "telecom", niveau: 2, duree: "20 min",
  sim: "uart",
  intro: "Le moniteur série de l'Arduino ou de l'ESP32, un module GPS, un Bluetooth HC-05 : tous parlent en **UART**. Chaque caractère est envoyé bit par bit sur un seul fil, encadré d'un bit de **start** et d'un bit de **stop**.",
  ordre: true,
  objectifs: [
    { texte: "Envoie le caractère **« a »** (code 97). Écris ses 8 bits de données **dans l'ordre où ils partent sur le fil** (D0 d'abord).",
      verif: s => s.p.code === 97, condition: "Règle d'abord le caractère sur « a » (code 97).",
      saisie: v => String(v).replace(/\s/g, "") === "10000110",
      aide: "97 = 0110 0001 en binaire (D7…D0). Sur le fil, le poids faible D0 part en premier : on lit donc à l'envers.",
      bravo: "10000110 : D0 = 1 part juste après le bit de start." },
    { texte: "Choisis une **parité paire** : que vaut le bit P pour « a » ?", reponse: { valeur: 1 },
      verif: s => s.p.code === 97 && s.p.parite === "paire", condition: "Règle « a » et la parité paire, puis réponds.",
      aide: "Compte les 1 des 8 bits de données : P complète pour que le total soit pair.", bravo: "« a » a trois 1 : P = 1 rend le total pair (4)." },
    { texte: "Décale la vitesse du récepteur jusqu'à ce que le caractère soit **mal reçu**.", verif: s => s.etat.lu !== undefined && s.etat.lu !== s.p.code },
    { texte: "En théorie, quel **écart de vitesse maximal** (en %) une liaison 8 bits tolère-t-elle ? Le récepteur lit au milieu de chaque bit ; son dernier échantillon tombe ≈ 9,5 bits après le front de start.",
      reponse: { valeur: 5.25, tolerance: 1.25, unite: "%" },
      aide: "Il ne doit pas dériver de plus d'un demi-bit sur 9,5 bits : 0,5 / 9,5.", bravo: "≈ 5 % : c'est pourquoi les quartz (précision 0,01 %) suffisent largement, mais un oscillateur RC interne non calibré (1-3 %) est limite." }
  ],
  questions: [
    { q: "À 9 600 bauds, avec 10 bits par caractère, combien de caractères par seconde ?", choix: ["9 600", "960", "96"], bonne: 1 },
    { q: "Pour relier un ESP32 à un module GPS, on relie…", choix: ["TX à TX et RX à RX", "TX de l'un au RX de l'autre (croisé), et les masses ensemble", "seulement TX"], bonne: 1 }
  ],
  notions: [["telecom-transmission", "Série"], ["telecom-transmission", "Asynchrone"], ["telecom-transmission", "Synchrone"], ["esp32", "UART"]]
});
