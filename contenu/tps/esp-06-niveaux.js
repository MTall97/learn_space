LS.ajouterTP({
  id: "esp-06-niveaux",
  titre: "Niveaux logiques 3,3 V / 5 V et alimentation",
  domaine: "esp32", niveau: 3, duree: "20 min",
  sim: "esp32", config: { p: { mode: "alim" } },
  intro: "La cause n°1 des ESP32 détruits ou instables : l'**alimentation**. Essaie chaque configuration et lis les alertes.",
  objectifs: [
    { texte: "Alimente par **USB** avec Wi-Fi, sans servo ni capteur 5 V : montage sûr.", verif: s => s.p.source === "usb" && s.p.wifiA && !s.p.servo && !s.p.capteur5v },
    { texte: "Branche une **LiPo chargée sur 3V3** : que se passe-t-il ?", verif: s => s.p.source === "lipo3v3" },
    { texte: "Alimente par une **LiPo sur 5V/VIN** avec le Wi-Fi : pourquoi des redémarrages ?", verif: s => s.p.source === "lipo5v" && s.p.wifiA },
    { texte: "Branche un **capteur 5 V** sur une entrée, puis protège l'entrée avec le **pont diviseur**.", verif: (s, m) => { if (s.p.capteur5v && !s.p.pont) m.a = true; return !!m.a && s.p.capteur5v && s.p.pont; } }
  ],
  questions: [
    { q: "Pont diviseur 1 kΩ (haut) / 2 kΩ (bas) sur un signal de 5 V : tension sur l'ESP32 ?", choix: ["1,67 V", "3,33 V", "5 V"], bonne: 1 },
    { q: "Pour alimenter un ESP32 sur batterie LiPo, la bonne solution est…", choix: ["un régulateur LDO à faible chute (ex. MCP1700) vers 3,3 V", "brancher la batterie sur 3V3", "une pile 9 V"], bonne: 0 }
  ],
  notions: [["esp32", "Alimentation 3,3 V"], ["esp32", "Niveaux logiques"], ["esp32", "Brownout"], ["elec-bases", "Diviseur de tension"]]
});
