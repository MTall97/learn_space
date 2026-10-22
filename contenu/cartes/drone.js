LS.ajouterCarte({
  id: "drone",
  titre: "Le drone multirotor",
  intro: "Un drone multirotor (quadricoptère, hexacoptère…) tient en l'air uniquement grâce à ses hélices, et se dirige en faisant varier leurs vitesses, plusieurs centaines de fois par seconde. Cette carte présente sa structure, sa propulsion, son énergie, son électronique, son pilotage et sa réglementation.",
  racine: { t: "Drone", c: [
    { t: "Structure", c: [
      { t: "Châssis", d: "Cadre en carbone ou en plastique : quadricoptère en X (le plus courant), en H, hexa ou octocoptère (redondance moteur pour les charges lourdes). Taille désignée par la diagonale entre moteurs ou par la taille d'hélice (« 5 pouces »)." },
      { t: "Configurations", d: "Quad (4 moteurs) : simple et efficace mais ne survit pas à une panne moteur. Hexa / octo : plus lourds, mais peuvent continuer à voler. Aile volante et VTOL : plus d'autonomie, pour la cartographie." }
    ] },
    { t: "Propulsion", c: [
      { t: "Moteur brushless", d: "Moteur sans balais à aimants : très bon rendement, durée de vie élevée. Désigné par la taille du stator (2207 = 22 mm de diamètre, 7 mm de hauteur) et son KV.", tp: "dr-01-propulsion" },
      { t: "KV", d: "Vitesse à vide par volt (tr/min/V). Grand KV : petites hélices, vitesse ; petit KV : grandes hélices, couple et efficacité.", f: "N_vide ≈ KV × U_batterie", ex: "2 400 KV en 4S (14,8 V) → ≈ 35 500 tr/min à vide.", tp: "dr-01-propulsion" },
      { t: "Hélice", d: "Désignée par diamètre × pas en pouces (5 × 4,3) et nombre de pales. La poussée croît comme le carré de la vitesse et la puissance comme son cube.", f: "T = Ct·ρ·n²·D⁴ ; P = Cp·ρ·n³·D⁵", tp: "dr-01-propulsion" },
      { t: "ESC", d: "Contrôleur électronique de vitesse : il alimente les trois phases du moteur brushless dans l'ordre, au rythme commandé par le contrôleur de vol (protocoles DShot, PWM). Caractérisé par son courant maximal." },
      { t: "Couple de réaction", d: "Une hélice qui tourne fait tourner le châssis en sens inverse. Les hélices tournent donc deux à deux en sens opposés pour s'annuler ; le lacet joue sur ce déséquilibre.", tp: "dr-03-mixage" }
    ] },
    { t: "Énergie", c: [
      { t: "Batterie LiPo", d: "Lithium-polymère : grande densité d'énergie et forts courants. Cellules de 3,7 V nominal (4,2 V chargée, ne pas descendre sous 3,3–3,5 V) ; 4S = 4 cellules en série = 14,8 V. Capacité en mAh, taux de décharge en C.", tp: "dr-01-propulsion", attention: "Une LiPo gonflée, percée ou surchargée peut prendre feu : charger sous surveillance, avec un chargeur équilibreur, dans un sac ignifugé." },
      { t: "Taux de décharge", d: "Courant maximal qu'accepte une batterie, en multiple de sa capacité.", f: "I_max = C × capacité (Ah)", ex: "1 500 mAh en 75 C : 112 A." },
      { t: "Autonomie", d: "Durée de vol, limitée par l'énergie embarquée et la puissance nécessaire pour se maintenir. Une batterie plus grosse dure plus longtemps mais alourdit le drone : l'autonomie plafonne.", f: "t ≈ 0,8 × capacité / I_stationnaire", tp: "dr-01-propulsion" },
      { t: "Rapport poussée/poids", d: "Poussée maximale totale divisée par le poids. Au moins 2 pour être pilotable, 4 à 10 pour la voltige et la course.", tp: "dr-01-propulsion" }
    ] },
    { t: "Électronique", c: [
      { t: "Contrôleur de vol", d: "Carte à microcontrôleur (STM32, ou ESP32 pour des projets simples) qui lit les capteurs et la radio et calcule la vitesse de chaque moteur des centaines à des milliers de fois par seconde. Logiciels : Betaflight, INAV, ArduPilot, PX4.", tp: "dr-02-pid" },
      { t: "Centrale inertielle (IMU)", d: "Gyroscope (vitesses de rotation) et accéléromètre (accélérations, donc la verticale) ; souvent baromètre (altitude) et magnétomètre (cap). Base de la stabilisation." },
      { t: "GPS", d: "Position, vitesse et altitude : tenue de position, retour au point de départ, missions automatiques." },
      { t: "Radiocommande", d: "Émetteur à deux manches (gaz/lacet, roulis/tangage) et récepteur sur le drone (2,4 GHz, ELRS, CRSF). La perte de liaison doit déclencher une sécurité (failsafe).", tp: "dr-03-mixage" },
      { t: "Vidéo FPV", d: "Caméra et émetteur vidéo (analogique 5,8 GHz ou numérique) pour piloter en immersion avec des lunettes." }
    ] },
    { t: "Pilotage et régulation", c: [
      { t: "Roulis, tangage, lacet", d: "Les trois rotations : **roulis** (incliner à gauche/droite), **tangage** (piquer/cabrer), **lacet** (tourner sur soi-même). Plus les **gaz** pour monter ou descendre.", tp: "dr-03-mixage" },
      { t: "Mixage", d: "Traduction des 4 ordres (gaz, roulis, tangage, lacet) en 4 vitesses de moteurs, selon la position et le sens de rotation de chaque moteur.", tp: "dr-03-mixage" },
      { t: "Boucle de régulation", d: "Mesurer, comparer à la consigne, corriger, recommencer : la boucle fermée rattrape les perturbations (vent, déséquilibre).", tp: "dr-02-pid" },
      { t: "PID", d: "Régulateur Proportionnel-Intégral-Dérivé : correction = Kp·erreur + Ki·∫erreur + Kd·d(erreur)/dt. P réagit, I annule l'erreur persistante, D amortit. Le réglage (« tuning ») se fait de P vers D puis I.", tp: "dr-02-pid" },
      { t: "Modes de vol", d: "**Acro** : le pilote commande des vitesses de rotation (voltige). **Angle/Stabilisé** : le drone revient à plat quand on lâche. **Tenue de position** (GPS) et missions automatiques." }
    ] },
    { t: "Réglementation", d: "Les règles dépendent du pays (en Europe : règlement UE 2019/947 ; ailleurs, l'autorité de l'aviation civile nationale), mais on retrouve partout : enregistrement de l'exploitant, formation selon la catégorie, hauteur maximale généralement 120 m, pas de survol de personnes, zones interdites (aéroports, sites sensibles). Vérifier les règles du pays avant de voler." }
  ] }
});
