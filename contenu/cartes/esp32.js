LS.ajouterCarte({
  id: "esp32",
  titre: "L'ESP32 et sa connectique",
  intro: "L'**ESP32** (et son petit frère l'**ESP8266**) d'Espressif est un microcontrôleur bon marché avec **Wi-Fi** et **Bluetooth** intégrés : le cœur de nombreux objets connectés. Cette carte présente la puce, ses broches, ses périphériques, ses bus, son alimentation et sa programmation.",
  racine: { t: "ESP32", c: [
    { t: "La puce", c: [
      { t: "ESP32 (classique)", d: "Double cœur Xtensa jusqu'à 240 MHz, 520 ko de RAM, Wi-Fi 2,4 GHz, Bluetooth classique et BLE, 34 GPIO, ADC 12 bits, 2 DAC, capteurs tactiles. Module courant : ESP32-WROOM-32 avec 4 Mo de flash." },
      { t: "ESP8266", d: "Prédécesseur (2014) : un cœur à 80/160 MHz, Wi-Fi seulement, peu de broches (une seule entrée analogique, 0–1 V sur la puce nue). Cartes NodeMCU, Wemos D1 mini. Encore très utilisé pour des capteurs simples." },
      { t: "Variantes ESP32", d: "ESP32-S2 (USB natif, un cœur), ESP32-S3 (IA, caméra, USB), ESP32-C3 / C6 (RISC-V, petit prix, C6 avec Wi-Fi 6 et Zigbee/Thread). Les brochages diffèrent : toujours vérifier la documentation de sa carte." },
      { t: "Carte de développement", d: "Carte (DevKitC, NodeMCU-32S…) qui porte le module, un régulateur 3,3 V, un convertisseur USB-série (CP2102, CH340), les boutons BOOT et EN (reset) et les broches au pas de 2,54 mm pour une plaque d'essai." }
    ] },
    { t: "Broches", c: [
      { t: "GPIO", d: "General Purpose Input/Output : broche que le programme configure en entrée ou en sortie. Niveaux logiques 0 V / 3,3 V. Courant conseillé ≤ 20 mA par broche (40 mA maxi absolu).", tp: "esp-01-blink" },
      { t: "Broches à éviter", d: "**GPIO 6 à 11** : reliées à la mémoire flash (interdites). **34 à 39** : entrées seules, sans résistance de tirage. **0, 2, 5, 12, 15** : lues au démarrage (strapping) ; un mauvais niveau empêche de démarrer ou de programmer. **1 et 3** : liaison série USB (programmation, moniteur série).", tp: "esp-01-blink" },
      { t: "Broches d'alimentation", d: "**3V3** : sortie (ou entrée) 3,3 V. **5V / VIN** : 5 V de l'USB ou entrée vers le régulateur. **GND** : masse, commune à tout le montage. **EN** : reset (actif à 0)." }
    ] },
    { t: "Entrées et sorties numériques", c: [
      { t: "digitalWrite", d: "Met une sortie à HIGH (3,3 V) ou LOW (0 V) après pinMode(broche, OUTPUT).", ex: "digitalWrite(2, HIGH); // allume la LED de GPIO 2", tp: "esp-01-blink" },
      { t: "digitalRead", d: "Lit l'état d'une entrée (HIGH ou LOW) après pinMode(broche, INPUT…).", tp: "esp-02-bouton" },
      { t: "Résistance de tirage (pull-up)", d: "Résistance qui fixe le niveau d'une entrée au repos : vers 3,3 V (pull-up) ou vers 0 V (pull-down). Sans elle, une entrée « flotte » et lit n'importe quoi. L'ESP32 en a d'internes (≈ 45 kΩ) : INPUT_PULLUP, INPUT_PULLDOWN.", tp: "esp-02-bouton" },
      { t: "Rebonds", d: "Un contact mécanique rebondit pendant quelques millisecondes : un appui produit plusieurs fronts. On filtre par logiciel (attendre 20–50 ms) ou par un condensateur.", tp: "esp-02-bouton" },
      { t: "Interruption (ESP32)", d: "attachInterrupt(broche, fonction, FALLING) exécute une fonction dès qu'un front arrive, sans attendre la boucle. La fonction doit être courte." }
    ] },
    { t: "Sorties et entrées analogiques", c: [
      { t: "PWM", d: "Modulation de largeur d'impulsion : la sortie alterne entre 0 et 3,3 V à fréquence fixe ; la durée à 1 (rapport cyclique) règle la valeur moyenne. Luminosité de LED, vitesse de moteur (via transistor), servomoteurs.", tp: ["esp-03-pwm", "em-06-pas-a-pas"] },
      { t: "Rapport cyclique", d: "Part de la période où le signal est à l'état haut, en %.", f: "U_moyenne = rapport cyclique × 3,3 V", tp: "esp-03-pwm" },
      { t: "LEDC", d: "Périphérique PWM de l'ESP32 : 16 canaux, fréquence et résolution réglables, avec fréquence × 2^résolution ≤ 80 MHz. En Arduino-ESP32 3.x : ledcAttach(broche, fréquence, résolution) puis ledcWrite(broche, valeur).", tp: "esp-03-pwm" },
      { t: "ADC", d: "Convertisseur analogique-numérique 12 bits (0–4095). Non linéaire près de 0 V et en haut de plage, bruité : moyenner plusieurs lectures et utiliser analogReadMilliVolts(). **ADC2** inutilisable quand le Wi-Fi fonctionne : préférer GPIO 32 à 39 (ADC1).", tp: "esp-04-adc" },
      { t: "Atténuation", d: "Réglage de la plage d'entrée de l'ADC : 0 dB (≈ 0–1,1 V), 2,5 dB, 6 dB, 11 dB (≈ 0–3,1 V, par défaut). Au-delà de la plage, la lecture sature.", tp: "esp-04-adc" },
      { t: "DAC", d: "Deux vraies sorties analogiques 8 bits sur GPIO 25 et 26 (absentes sur S3 et C3) : dacWrite(25, 128) ≈ 1,65 V." }
    ] },
    { t: "Bus de communication", c: [
      { t: "UART", d: "Liaison série asynchrone : TX (émission) relié au RX de l'autre, et inversement, masses communes. L'ESP32 en a 3 (Serial, Serial1, Serial2). GPS, modules GSM, Bluetooth HC-05, autre microcontrôleur.", tp: ["esp-05-bus", "tel-04-liaison-serie"] },
      { t: "I2C", d: "Bus à deux fils partagés : **SDA** (données) et **SCL** (horloge), avec résistances de tirage (souvent 4,7 kΩ). Chaque appareil a une **adresse** (0x76 ou 0x77 pour un BME280, 0x3C pour un écran OLED). Par défaut GPIO 21 (SDA) et 22 (SCL).", tp: "esp-05-bus" },
      { t: "SPI", d: "Bus rapide à 4 fils : **MOSI**, **MISO**, **SCK** (horloge) et un **CS** par appareil. Écrans TFT, cartes SD, modules radio LoRa. VSPI par défaut : 23, 19, 18, 5.", tp: "esp-05-bus" },
      { t: "1-Wire", d: "Un seul fil de données (plus la masse) avec résistance de tirage : capteurs de température DS18B20." }
    ] },
    { t: "Alimentation", c: [
      { t: "Alimentation 3,3 V", d: "La puce fonctionne en 3,0–3,6 V. Elle consomme ≈ 40–80 mA en calcul, 100–250 mA en Wi-Fi avec des **pics de 400–500 mA**. Le régulateur de la carte (souvent AMS1117) abaisse le 5 V de l'USB.", tp: "esp-06-niveaux" },
      { t: "Niveaux logiques", d: "Les entrées de l'ESP32 ne tolèrent **pas le 5 V**. Pour un capteur ou un module 5 V : pont diviseur (1 kΩ / 2 kΩ), adaptateur de niveaux bidirectionnel, ou modèle en 3,3 V.", tp: "esp-06-niveaux" },
      { t: "Brownout", d: "Détecteur de chute de tension : si l'alimentation baisse trop (pic du Wi-Fi, câble USB trop fin, batterie faible), l'ESP32 redémarre. Remède : bonne alimentation, condensateur de 470 µF près de la carte.", tp: "esp-06-niveaux" },
      { t: "Sommeil profond", d: "Mode deep sleep : ≈ 10 µA pour la puce seule, seul le RTC reste éveillé ; réveil par minuterie ou par broche. Attention : une carte de développement (DevKitC) consomme encore plusieurs mA en sommeil (régulateur, convertisseur USB-série, LED) ; il faut un montage optimisé (régulateur à faible courant de repos, pas de pont USB) pour tenir des mois sur batterie avec une mesure toutes les 10 minutes." }
    ] },
    { t: "Programmation", c: [
      { t: "Arduino IDE", d: "Environnement simple : installer le support « esp32 by Espressif » dans le gestionnaire de cartes, choisir la carte et le port, téléverser. Programme = setup() une fois, puis loop() en boucle." },
      { t: "PlatformIO et ESP-IDF", d: "PlatformIO (dans VS Code) gère projets et bibliothèques ; ESP-IDF est le cadre officiel d'Espressif (C, FreeRTOS), plus complet et plus exigeant." },
      { t: "MicroPython", d: "Python pour microcontrôleurs : on tape des commandes en direct (REPL). Idéal pour apprendre et prototyper." },
      { t: "Moniteur série", d: "Fenêtre qui affiche ce que le programme envoie par Serial.println() : le premier outil de débogage. Vitesse à régler comme dans Serial.begin(115200)." },
      { t: "Wi-Fi et objets connectés", d: "WiFi.begin(nom, mot de passe) puis serveur web intégré, requêtes HTTP, MQTT vers un serveur (Home Assistant), mise à jour à distance (OTA). Ne jamais publier ses mots de passe dans un dépôt." }
    ] }
  ] }
});
