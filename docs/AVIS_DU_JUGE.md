# Avis du juge et limites connues des modèles

## Revues indépendantes

| Date | Portée | État |
|---|---|---|
| 22/10/2026 (1 et 2) | Site existant (électricité → drones) | Pas de rapport : revues perdues (remise à zéro de la session, arrêt). |
| 22/10/2026 (3) | Tout le site, 17 domaines | Rapport ci-dessous : 1 bloquant, 16 importants, 17 mineurs. Suites données : voir « Suites ». |

Le juge est une instance indépendante, en lecture seule, qui n'a reçu que le dépôt et la consigne d'être
critique. [V] = vérifié par calcul ou exécution, [S] = soupçon.

## Rapport du juge, 22/10/2026

Méthode du juge : lecture des modèles et du contenu, calculs sous Node (moteur de circuit en direct, batiment.js,
solaire.js, modele-moteur.js, mecanique.js, drone.js, asynchrone), ~75 TP et 21 cartes dans Chromium à 1280 et
390 px (aucune erreur JS, pas de défilement horizontal), 46 tests verts. Il n'a lu ce fichier qu'à la fin.

### Bloquant
- **B1** [V] `elec-10-bobine.js:35-36` : l'objectif 3 est impossible. `_upic` est remis à 0 pendant que K1 est fermé, mais reprend r·I = 11,87 V en régime établi ; le montage correct (diode de roue libre) est refusé (< 2 V exigé).

### Important
- **I1** [V] Générateur 230 V en court-circuit : ≈ 2 955 A crête, ni alerte ni protection (elec-08 : navette mal câblée = seulement des points jaunes).
- **I2** [V] elec-08 : les propriétés des éléments fixes restent modifiables ; le curseur d'amplitude borné à 24 V ramène la source de 325 à 24 V, la saisie « 325 » est refusée, et l'état est sauvegardé. La lampe 230 V fixe peut être réglée en 6 V et griller.
- **I3** [V] Voltmètre en mode continu = valeur instantanée (`composants-elec.js:684`), et la question de elec-08 l'enseigne comme normal alors que son explication dit que la moyenne est nulle ; un vrai multimètre (et celui du site) affiche ≈ 0 V.
- **I4** [V] bat-01 et la carte affirment qu'avec In ≤ Iz le câble ne surchauffe jamais ; le simulateur montre 1,5 mm² en 16 A à 18,3 A : 73,5 °C, coupure après ≈ 100 jours ; à 1,3 In : 86,5 °C, 2,7 h. Il faut la condition complète (I2 = 1,45 In ≤ 1,45 Iz) et corriger la question 2.
- **I5** [V] Résistance du corps : 1 000-5 000 Ω (elec-bases) contre 1 000-2 000 Ω (bâtiment) ; CEI 60479 à 230 V ≈ 1 000-2 100 Ω ; « sèche : 2 000 Ω » sous-estime le courant.
- **I6** [V] Diode, Zener et transistor ne grillent jamais (diode sur 24 V : 2 275 A ; Zener sans résistance : 1 822 A ; NPN base au 9 V : Ic 80 A).
- **I7** [V] Relais (et moteur) sans inductance : la diode de roue libre de em-01 n'a aucun effet observable ; elec-16 vérifie seulement qu'une diode existe, même non reliée.
- **I8** [V] Ohmmètre sur une pile de 9 V : « OL » sans alerte (seuil 2 mA tout juste atteint).
- **I9** [V] Batterie : aucune limite de courant (LiFePO4 20 Ah à 150 A ou chargée à 3 C acceptée) alors que la carte parle du BMS ; pas d'effet de la température sur la durée de vie du plomb (flatté à Bamako).
- **I10** [V] Drone, panne de moteur : rotation dans le mauvais sens (`drone.js:174` contredit le mixage).
- **I11** [V] Asynchrone : vitesse négative possible (g = 1,15 à 5 Hz) ; moteur qui « tourne » avec Cr > couple de démarrage ; Cd/Cmax = 0,29, faible pour une cage (0,6-0,8).
- **I12** [V] Transformateur sans saturation (100 spires sous 400 V : fonctionnement « normal ») ; pertes fer en U1²/N1 au lieu de (U1/N1)².
- **I13** [V] Moto 600 cm³ : 49 N·m, 56 kW à 11 600 tr/min (réel ≈ 65-70 N·m, 85-90 kW vers 13-14 000) ; couple négatif à 14 000 tr/min dans la plage affichée ; frottements recalés à la main. Pression maximale du diesel 44 bar (réel 70-180).
- **I14** [V] ESP32, bus UART : fils dessinés sur GPIO 1/3, code sur `Serial2` 16/17.
- **I15** [V] Objectifs validés en réglant un paramètre (tel-06, tel-04, tel-05, tel-02, num-05) ; signalements de panne sans pénalité (elec-11) ; questions à essais illimités ; objectifs validés dans n'importe quel ordre.
- **I16** [V] Tests : rien sur mécanique, transmission, électromécanique, drone, ESP32, télécom, logique, multimètre, éditeur ; aucun test ne rejoue un objectif (B1 passe la CI).

### Mineur
Exemple de chute de tension faux dans la carte bâtiment (13,0 V, 5,67 % et non 12,6 V, 5,5 %) ; « change de sens 50 fois par seconde » (100) ; LED : arrondir la résistance vers le haut (330 Ω donne 21 mA) ; ondulation : préciser f = 100 Hz en double alternance ; différentiel : RA × IΔn ≤ 50 V même en milieu mouillé (25 V) ; bravo de bat-01 ambigu sur le temps accéléré ; deep sleep : une DevKitC consomme plusieurs mA ; PWM solaire sans alerte de tension d'entrée (Voc 119 V) ; asynchrone sans dynamique de démarrage ; alternateur : « puissance fournie » inclut les pertes internes ; fusible 10 A du multimètre trop rapide ; logique : entrée non reliée = 0 et RS sans oscillation ; lampe sans pic à froid ; Zener trop idéale (≈ 4,5 Ω) ; elec-08 (230 V AC) avant la carte du courant alternatif ; I2C ≈ 112 adresses utilisables et non 127.

### Solide selon le juge [V]
Calculs de base du bâtiment (courbes B/C/D, points du bilame, Iz, Icc, TT, temps CEI 61008, chute de tension) ; modèle solaire (une diode, point chaud, Peukert, CC/CV, MPPT selon la température, Voc à froid) ; solveur nodal (Newton/pnjlim, arc à 500 V, multimètre, filtre RC à 2 %) ; cycle P-V et avance, embrayage, différentiel, boîte, chaîne ; poussée et mixage du drone ; pièges de l'ESP32 ; carte ML/audio ; interface sans erreur.

### Avis du juge sur les limites déclarées
Honnêtes mais incomplètes : rien n'était déclaré pour le simulateur de circuits, la mécanique, les transmissions, l'électromécanique, les drones (puissance moteur non bornée : 22,7 kW par moteur en 10" 2 400 KV 6S), l'ESP32, les télécoms et le numérique ; ni pour le C-rate des batteries, In ≤ Iz, l'absence de protection en 230 V, les objectifs impossibles ou devinables et la couverture des tests. Le README affirmait « les composants peuvent griller » sans nuance.

## Limites relevées par les auteurs (22/10/2026)

### Maths utiles
- Graphiques sans graduations chiffrées : seules les plages sont écrites dans les titres.
- Intervalle de confiance en 1,96·σ/√n : juste seulement pour un grand nombre de tirages.
- Le masquage des réglages inutiles dépend de l'ordre des contrôles produits par `LS.simAnimee`.

### Énergie solaire et batteries
- Panneau (modèle à une diode, 60 cellules : Voc 39,6 V, Isc 9,8 A, Pmp 288 W) : ni vieillissement, ni salissure, ni angle d'incidence ; claquage inverse fixé à 18 V ; le MPPT trouve toujours le maximum global (un vrai peut rester sur un maximum local à l'ombre).
- Batterie : pas d'effet de la température, pas d'autodécharge ; courbes de tension typiques ; résistance de charge réglée à la main.
- Régulateur : tension de batterie fixe sur la journée.
- Dimensionnement : irradiations mensuelles d'ordre de grandeur (pas PVGIS), jour couvert = 20 % ; rendements constants ; prix en FCFA indicatifs.

### Électricité du bâtiment
- Seuil magnétique au milieu de la plage de la courbe, sans dispersion ; bilame ajusté sur les seuls points conventionnels (CEI 60898).
- Échauffement du câble au premier ordre, pose encastrée seulement, constante de temps estimée.
- Zones CEI 60479-1 simplifiées (courbes b et c1) ; différentiel déterministe à 0,8 IΔn.
- Chute de tension calculée sous 230 V sans rétroaction ; seuil de démarrage moteur indicatif (15 %).
- Seul le schéma TT est simulé. Le site ne forme pas à intervenir sur une installation réelle.

### Capteurs
- CTN : Steinhart-Hart ajusté sur des valeurs B plausibles, pas sur une fiche précise ; dissipation 1,5 mW/°C en ordre de grandeur.
- ADC : modèle simplifié d'`esp32.js`.
- HC-SR04 : faisceau, perte d'écho et portée en règles simples.
- IMU : accélérations en créneaux, pas de lacet, pas de filtre de Kalman.
- Balance : décalage, gain et bruit inventés ; dérive linéaire.

### Machine learning et audio
- Neurone : régression logistique seule (le XOR montre la limite, la solution à couche cachée n'est pas simulée).
- Surapprentissage : polynômes (base de Legendre), pas un réseau profond.
- Spectrogramme : voix synthétique (120 Hz, formants masculins, pas de consonnes) ; repliement sans filtre anti-repliement ; pas d'échelle mel.
- Évaluation : BLEU simplifié (une référence, lissage), **non comparable** aux chiffres sacreBLEU publiés ; chrF seulement défini.
- Fuite de données : données 2D, plus proches voisins, « style » de série = décalage ; 4 tirages par score.
