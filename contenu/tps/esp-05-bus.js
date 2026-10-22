LS.ajouterTP({
  id: "esp-05-bus",
  titre: "Bus UART, I2C et SPI",
  domaine: "esp32", niveau: 3, duree: "25 min",
  sim: "esp32", config: { p: { mode: "bus" } },
  intro: "Les capteurs (température BME280, écran OLED, accéléromètre MPU6050, carte SD…) parlent à l'ESP32 par un **bus**. Ici, un capteur BME280 d'adresse **0x77**.",
  objectifs: [
    { texte: "**I2C** : lis l'identifiant du capteur (0x60) à l'adresse 0x77.", verif: s => s.p.proto === "I2C" && s.etat.ok },
    { texte: "Appelle l'adresse **0x76** : le capteur ne répond pas (NACK).", verif: s => s.p.proto === "I2C" && s.p.pullup && s.p.adresse === "0x76" },
    { texte: "Enlève les **résistances de tirage** : plus rien ne passe.", verif: s => s.p.proto === "I2C" && !s.p.pullup },
    { texte: "**UART** : relie TX à TX (erreur classique), puis corrige.", verif: (s, m) => { if (s.p.proto === "UART" && !s.p.croise) m.err = true; return !!m.err && s.p.proto === "UART" && s.p.croise; } },
    { texte: "**SPI** : repère les 4 fils et le rôle de CS.", verif: s => s.p.proto === "SPI" }
  ],
  questions: [
    { q: "Combien de fils faut-il pour brancher 5 capteurs I2C ?", choix: ["2 fils de données (SDA, SCL) partagés, + alimentation", "10 fils", "5 fils CS"], bonne: 0 },
    { q: "Quel bus est le plus rapide en général ?", choix: ["I2C", "SPI", "UART"], bonne: 1 }
  ],
  notions: [["esp32", "I2C"], ["esp32", "SPI"], ["esp32", "UART"], ["telecom-transmission", "Synchrone"]]
});
