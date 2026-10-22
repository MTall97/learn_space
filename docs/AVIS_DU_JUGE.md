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

## Suites données (22/10/2026)

| Point | Suite | Chiffre avant → après |
|---|---|---|
| B1 elec-10 | **Corrigé** : la bobine mesure la tension pendant qu'elle rend son énergie (`_uinv`) ; un test rejoue l'objectif. | diode bien montée : 11,87 V (refusé) → 0,90 V (validé) ; sans diode ≈ 600 V |
| I1 court-circuit 230 V | **Corrigé** : alerte du générateur ; fusible F1 10 A imposé dans elec-08 (loi I²t), objectif « court-circuit puis réparation ». | ≈ 3 000 A sans alerte → F1 fond en ≈ 12 ms |
| I2 éléments imposés | **Corrigé** : réglages verrouillés (🔒) sur le réseau, F1 et L1 ; un curseur hors plage élargit sa plage au lieu de ramener la valeur à la borne. Les autres éléments `fixe` restent réglables quand le TP le demande. | 325 V ramenés à 24 V → impossible |
| I3 voltmètre DC | **Corrigé** : moyenne filtrée en mode continu ; question de elec-08 réécrite (≈ 0 V). | valeur instantanée → < 5 V sur le 230 V |
| I4 In ≤ Iz | **Corrigé** : condition complète In ≤ Iz et I2 = 1,45 In ≤ 1,45 Iz, surcharge modérée tolérée temporairement ; nouvel objectif qui la montre. | « ne surchauffe jamais » → 1,5 mm² en 16 A à 18,3 A : 73 °C sans coupure, expliqué |
| I5 corps humain | **Corrigé** : 1 000 à 2 100 Ω sous 230 V partout (CEI 60479-1), 1 300 Ω par défaut. | 1 000-5 000 Ω / sèche 2 000 Ω → 1 300 Ω, ≈ 129 mA avec RA 30 Ω |
| I6 composants qui ne grillent pas | **Partiellement** : diode 1N4007, Zener 0,5 W, BC547/557, TIP31/32 grillent (puissance lissée, courant de pointe). Une diode grillée devient un circuit ouvert (en vrai, souvent un court-circuit) ; pas de claquage inverse de la 1N4007. | diode sur 24 V : 2 275 A → grillée en 10 ms |
| I7 inductance du relais et du moteur | **Corrigé** : relais 0,3 H (6 V), induit 2 mH, avalanche du transistor au-delà de Vceo ; em-01 et elec-16 vérifient la diode réellement branchée. Limite : em-01 et elec-16 tournent au ralenti (×0,48, ×0,24) à cause du pas de calcul fin ; pas d'arc sur le contact du relais. | aucune étincelle → étincelle sans diode |
| I8 ohmmètre sous tension | **Corrigé** : alerte dès 3,05 V aux pointes. Limite : une pile de 1,5 V donne une fausse résistance sans alerte (comme un vrai appareil). | 9 V : « OL » sans alerte → alerte |
| I9 batteries | **Corrigé** : BMS LiFePO4 qui coupe au-delà de 1 C, charge refusée sous 0 °C ; alertes plomb (0,3 C en charge) ; durée de vie divisée par 2 tous les 10 °C au-dessus de 25 °C. | plomb à Bamako : 1,9 → 1,1 an |
| I10 drone | **Corrigé** : sens de rotation en panne tiré du mixage ; puissance par moteur plafonnée selon la taille. | 10" 2 400 KV 6S : 22,7 kW → 1,5 kW et alerte |
| I11 asynchrone | **Corrigé** : double cage simplifiée, glissement borné, calage, démarrage dynamique. | Cd/Cmax 0,29 → 0,67 ; vitesse −23 tr/min → calé |
| I12 transformateur | **Corrigé** : saturation au-delà de 1,2 × les volts par spire nominaux ; pertes fer en (U1/N1)². | 100 spires sous 400 V : « normal » → 1 840 A, brûle |
| I13 moteurs | **Corrigé** : frottements selon la vitesse du piston, remplissage par moteur, prémélange diesel ; recalages décrits dans meca-05. Limite : pmax de la moto 118 bar (un peu haute). | moto 49 N·m / 56 kW → 68 N·m / 86 kW ; diesel 44 → 87-157 bar |
| I14 ESP32 UART | **Corrigé** : dessin sur GPIO 17/16 comme `Serial2`. | GPIO 1/3 → 17/16 |
| I15 objectifs devinables | **Partiellement** : réponses saisies et vérifiées (tel-02, 04, 05, 06, num-05, elec-11), ordre imposé (`ordre: true`), essais comptés aux questions, signalements de panne après mesure et faux signalements limités. Les autres TP n'ont pas encore de réponse saisie ni d'ordre imposé. | — |
| I16 tests | **Partiellement** : 46 → 86 tests ; rejeu des objectifs de 8 TP de circuit ; modèles mécaniques, électromécaniques, drone, ESP32, pédagogie. Non couverts : elec-03, elec-11, elec-17, pont de Graetz, simulateur logique, éditeur. | 46 → 86 |
| Mineurs | **Corrigés** : 100 changements de sens par seconde, arrondi des résistances de LED vers le haut, ondulation à 100 Hz, RA·IΔn ≤ 25 V au mouillé, temps simulé du bilame, alerte d'entrée du PWM, deep sleep d'une DevKitC, ≈ 112 adresses I2C, puissance utile de l'alternateur, fusible du multimètre (I²t), appel de courant de la lampe (≈ 12×), Zener 8-40 Ω, ordre du parcours (elec-08 après le courant alternatif). **Non traités** : simulateur logique (entrée non reliée = 0, RS sans oscillation). | — |

Erreur trouvée en corrigeant, hors rapport : tel-05 affirmait qu'un message TCP de 10 octets reçoit du bourrage (faux : trame de 68 octets) ; l'objectif passe en UDP.

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
