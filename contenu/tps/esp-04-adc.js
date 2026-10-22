LS.ajouterTP({
  id: "esp-04-adc",
  titre: "Lire une tension : l'ADC",
  domaine: "esp32", niveau: 2, duree: "20 min",
  sim: "esp32", config: { p: { mode: "adc" } },
  intro: "Un potentiomètre branché entre 3,3 V et GND donne sur son curseur une tension de 0 à 3,3 V. L'**ADC** (convertisseur analogique-numérique) de l'ESP32 la traduit en un nombre de 0 à 4095 (12 bits). La courbe bleue montre la réponse **réelle**, non idéale.",
  objectifs: [
    { texte: "Place le potentiomètre au milieu (1,65 V) : compare la valeur lue à la valeur idéale.", verif: s => s.p.pot === 50 && s.etat.raw !== null },
    { texte: "Monte au maximum : la lecture sature **avant** 3,3 V.", verif: s => s.p.pot >= 95 && s.etat.raw >= 4000 },
    { texte: "Branche le curseur sur **GPIO 25**, puis active le **Wi-Fi** : la lecture échoue.", verif: s => String(s.p.gpio) === "25" && s.p.wifi && s.etat.raw === null },
    { texte: "Avec l'atténuation **0 dB** (0–1,1 V), à partir de quelle position la lecture sature-t-elle ?", verif: s => s.p.att === "0" && s.etat.raw >= 4095 }
  ],
  questions: [
    { q: "Résolution de l'ADC 12 bits sur 3,1 V ?", choix: ["≈ 0,76 mV par pas", "≈ 12 mV", "≈ 0,1 V"], bonne: 0 },
    { q: "Pour une mesure précise d'une batterie de 4,2 V, on…", choix: ["la branche directement", "utilise un pont diviseur pour rester sous 3,1 V, et la correction analogReadMilliVolts()", "met une Zener"], bonne: 1 }
  ],
  notions: [["esp32", "ADC"], ["esp32", "Atténuation"], ["numerique", "CAN (ADC)"], ["numerique", "Quantification"]]
});
