LS.ajouterCarte({
  id: "elec-composants",
  titre: "Les composants",
  intro: "Les briques de tous les montages : composants **passifs** (ils n'amplifient rien), **semi-conducteurs** (diodes, transistors), organes de **commande** et **capteurs**. Pour chacun : ce qu'il fait, comment le reconnaître, comment le choisir.",
  racine: { t: "Composants", c: [
    { t: "Passifs", c: [
      { t: "Résistance (composant)", d: "Composant qui limite le courant et transforme l'énergie électrique en chaleur. Caractérisée par sa valeur (Ω), sa tolérance (± 5 %, ± 1 %) et sa puissance maximale (¼ W, ½ W…).", f: "U = R·I ; P = R·I²", tp: "elec-02-loi-ohm", voir: ["Code des couleurs", "Séries normalisées"] },
      { t: "Code des couleurs", d: "Anneaux peints sur les résistances : 2 ou 3 chiffres, un multiplicateur, une tolérance. Noir 0, marron 1, rouge 2, orange 3, jaune 4, vert 5, bleu 6, violet 7, gris 8, blanc 9.", ex: "Rouge-rouge-marron-or = 22 × 10 = 220 Ω ± 5 %." },
      { t: "Séries normalisées", d: "On ne fabrique pas toutes les valeurs : la série **E12** (1 ; 1,2 ; 1,5 ; 1,8 ; 2,2 ; 2,7 ; 3,3 ; 3,9 ; 4,7 ; 5,6 ; 6,8 ; 8,2 × 10ⁿ) couvre les besoins à ± 10 %. Le simulateur arrondit à ces valeurs." },
      { t: "Potentiomètre", d: "Résistance variable à trois bornes : un **curseur** se déplace le long d'une piste résistive. Entre une extrémité et le curseur, la résistance varie de 0 au maximum. Monté en diviseur, il fournit une tension réglable.", ex: "Bouton de volume, réglage de seuil, joystick (deux potentiomètres).", tp: "elec-05-diviseur" },
      { t: "Condensateur", d: "Deux armatures conductrices séparées par un isolant. Il **stocke des charges** (Q = C·U) et de l'énergie. Il s'oppose aux variations brusques de tension : il laisse passer l'alternatif et bloque le continu une fois chargé. Les modèles électrolytiques sont **polarisés** (+ et −).", f: "Q = C·U ; i = C·du/dt ; E = ½·C·U²\nUnité : farad (F), souvent µF, nF, pF", tp: "elec-09-condensateur", attention: "Un électrolytique branché à l'envers ou au-delà de sa tension maximale peut exploser." },
      { t: "Constante de temps", d: "Durée caractéristique de la charge d'un condensateur à travers une résistance : au bout de τ, 63 % de la charge ; au bout de 5τ, chargé à plus de 99 %.", f: "τ = R × C\nu(t) = E·(1 − e^(−t/τ))", ex: "10 kΩ et 100 µF : τ = 1 s.", tp: "elec-09-condensateur" },
      { t: "Bobine", d: "Fil enroulé, souvent autour d'un noyau magnétique. Elle crée un champ magnétique et **s'oppose aux variations de courant** (inductance L, en henrys). Elle laisse passer le continu, freine l'alternatif haute fréquence.", f: "u = L·di/dt ; E = ½·L·I² ; τ = L / R", tp: "elec-10-bobine", voir: ["Diode de roue libre"] },
      { t: "Transformateur (composant)", d: "Deux bobines couplées par un noyau de fer : il change la valeur d'une tension alternative et isole les circuits.", f: "U2 / U1 = N2 / N1", tp: "em-04-transformateur" }
    ] },
    { t: "Semi-conducteurs", c: [
      { t: "Diode", d: "Composant qui ne laisse passer le courant que dans **un sens**, de l'**anode** vers la **cathode** (repérée par un anneau). En sens direct, elle a une tension de seuil (≈ 0,6–0,7 V en silicium) ; en sens inverse, elle bloque. Elle a des limites : une 1N4007 supporte 1 A en continu et 1 000 V en inverse ; au-delà, elle grille.", tp: ["elec-14-redressement", "elec-06-led"] },
      { t: "LED", d: "Diode électroluminescente : elle émet de la lumière quand elle conduit. Tension de seuil selon la couleur (rouge ≈ 1,9 V, verte ≈ 2,2 V, bleue/blanche ≈ 3 V). Courant typique 5 à 20 mA : il faut **toujours** une résistance série.", f: "R = (U_alim − V_LED) / I", ex: "Pile 9 V, LED rouge, 20 mA : R = (9 − 1,9) / 0,02 ≈ 355 Ω → 330 Ω.", tp: "elec-06-led", an: "Patte la plus longue = anode (+)." },
      { t: "Diode Zener", d: "Diode conçue pour conduire en **inverse** au-delà d'une tension précise, la tension Zener (3,3 V, 5,1 V, 12 V…). Avec une résistance série, elle stabilise une tension. Sa puissance est limitée (souvent 0,5 W) : sans résistance série, elle grille.", tp: "elec-15-zener" },
      { t: "Diode de roue libre", d: "Diode placée en inverse aux bornes d'une bobine (relais, moteur, électrovanne). À la coupure, elle offre un chemin au courant de la bobine et supprime la surtension qui détruirait le transistor ou ferait étinceler l'interrupteur.", tp: "elec-10-bobine" },
      { t: "Transistor", d: "Composant à trois pattes qui permet à un petit courant (ou une petite tension) de commander un grand courant : interrupteur électronique ou amplificateur. Deux grandes familles : **bipolaires** (NPN, PNP) et **MOSFET**.", tp: "elec-16-transistor" },
      { t: "Circuit intégré", d: "Des milliers à des milliards de transistors gravés sur une puce de silicium : régulateur, amplificateur opérationnel, microcontrôleur (ESP32), mémoire…" }
    ] },
    { t: "Commande et protection", c: [
      { t: "Interrupteur", d: "Organe mécanique qui ouvre ou ferme un circuit. Unipolaire (1 contact), bipolaire, va-et-vient (3 bornes : commun et deux sorties).", tp: "elec-08-va-et-vient" },
      { t: "Bouton poussoir", d: "Interrupteur à rappel : fermé seulement tant qu'on appuie (NO : normalement ouvert) ou ouvert tant qu'on appuie (NF).", tp: "esp-02-bouton" },
      { t: "Relais (composant)", d: "Interrupteur actionné par un électroaimant : un petit courant dans la bobine ferme un contact qui peut commander une forte puissance, avec isolement entre les deux circuits.", tp: "em-01-relais-moteur" },
      { t: "Fusible (composant)", d: "Fil calibré qui fond en cas de surintensité. Calibre en ampères, et courbe rapide (F) ou temporisée (T) pour supporter les appels de courant au démarrage.", tp: "elec-08-va-et-vient" }
    ] },
    { t: "Capteurs", c: [
      { t: "Photorésistance (LDR)", d: "Résistance qui diminue quand la lumière augmente (de ≈ 1 MΩ dans le noir à quelques centaines d'ohms au soleil). Lente, mais simple.", tp: "elec-17-veilleuse" },
      { t: "Thermistance", d: "Résistance qui varie avec la température : CTN (coefficient négatif, sa résistance baisse quand il fait chaud) ou CTP. Mesure de température, protection." },
      { t: "Capteur numérique", d: "Capteur intégré qui fournit directement une valeur numérique sur un bus (I2C, SPI) : BME280 (température, pression, humidité), MPU6050 (accéléromètre, gyroscope)…", tp: "esp-05-bus" }
    ] }
  ] }
});
