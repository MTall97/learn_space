# Avis du juge et limites connues des modèles

## Revues indépendantes

| Date | Portée | État |
|---|---|---|
| 22/10/2026 (1 et 2) | Site existant (électricité → drones) | Pas de rapport : revues perdues (remise à zéro de la session, arrêt). |
| 23/10/2026 (design) | Interface, téléphone, enfants | Rapport « Revue du design » ci-dessous : 4 bloquants, 9 importants. |
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

## Revue du design (UI/UX, public enfant), 23/10/2026

Juge indépendant en lecture seule ; Chromium sans écran à 1280 et 390 px (toucher, DPR 2), clair et sombre ; accueil vide et avec progression simulée ; TP elec-06, elec-03, meca-01, tel-06, sol-04 ; carte elec-bases. [V] vérifié, [S] soupçonné.

**Verdict** : direction réussie et personnelle, non générique [V] (façade d'appareil, ateliers en puces sur un circuit imprimé, piste de pastilles, polices chargées, aucun émoji, deux thèmes soignés). Réserves : tuiles de mesures des simulations et palette du circuit = « cartes génériques » ; sérigraphie en capitales de 10-12 px trop technique pour un enfant ; carte mentale = maillon faible.

**Bloquants**
- B1 [V] Pièges de défilement : canvas en `touch-action:none`, plus hauts que l'écran au téléphone (meca-01 : 900 px) ; on ne peut plus faire défiler la page.
- B2 [V] Circuit coupé au téléphone : SVG de 640 px dans 356 px, pas de défilement ni de zoom ; elec-03 (pointes du multimètre hors champ), elec-11, elec-02 impossibles au doigt.
- B3 [V] Carte mentale : libellés de 6-9 px, nœuds de 11-14 px, panneau qui couvre 45 % de l'écran au téléphone, deux tiers de l'écran vides sur ordinateur.
- B4 [V] Polices chargées chez Google : contraire à « hors ligne », « pas de bibliothèque externe » et « aucune donnée envoyée » (IP envoyée à Google).

**Importants**
- I1 [V] Cibles tactiles sous 44 px : boutons de 34 px, curseurs de 16 px, cases de 13 px, onglets de 41 px, « Indice » 21 px.
- I2 [V] Trois sens du mot « niveau » (joueur, difficulté du TP, niveau scolaire).
- I3 [V] Consignes pour souris et clavier (« clique », « Touche R ») et « à droite » alors que c'est dessous au téléphone.
- I4 [V] elec-06 : « pile de 9 V » mais palette en 4,5 V, et « plaque vide » alors qu'une pile y est.
- I5 [V] Jargon et longueur (4T : 70 mots, 9 curseurs, 7 mesures) ; « Briefing », « Mission », « Plus loin » ; au téléphone, animation et curseurs séparés de 900 px.
- I6 [V] tp.html charge 24 scripts (608 Ko) pour chaque TP.
- I7 [V] Pas de fonctionnement hors ligne (ni service worker ni manifeste).
- I8 [V] Contrastes faibles : « rouge » sur le multimètre 2,21:1, douille active 4,23:1, texte indicatif 3,41:1, objectifs verrouillés délavés [S].
- I9 [V] Beaucoup de textes utiles entre 11,5 et 12,5 px.

**Mineurs** : accueil mobile très long (6 835 px) ; « Tu en es là » sur la carte alors que « Reprendre » montre la loi d'Ohm ; les trois pastilles sous chaque TP ne sont pas expliquées ; retours d'erreur génériques ; annonce « +25 » posée sur les onglets ; en-tête translucide ; commencer par une carte de 43 notions motive moins qu'un TP concret.

**Pour les enfants et les niveaux** : phrases courtes à un verbe d'action au primaire, sans formule ; texte ≥ 16 px et cibles ≥ 48 px au primaire et au collège ; une action principale par écran ; outils avancés masqués ; halo sur l'élément à toucher ; retours bienveillants et ciblés, indice proposé après deux échecs ; série de jours indulgente (jokers, jours par semaine) vu l'accès irrégulier au téléphone et au courant ; encart fixe « ici on simule ; ne touche jamais le 220 V ni une batterie ouverte ; demande à un adulte » sur les TP de secteur et de batterie ; objectifs et quiz par niveau (primaire : 2-3 objectifs qualitatifs, réglages verrouillés, étoiles plutôt que points) ; niveau visible et modifiable dans l'en-tête.

**Ce qui marche** : identité forte ; « Commencer / Reprendre » unique et évident ; façade de progression motivante ; barre d'onglets au téléphone ; barre de mission collante ; retours immédiats ; multimètre réaliste ; focus clavier visible ; exemples maliens.

Priorités du juge : B1, B2, B3, B4, puis I1 et I2, avant d'ajouter les quatre niveaux.

### Suites données à la revue du design (23/10/2026)

| Point | Suite |
|---|---|
| B1 pièges de défilement | **Corrigé** : un doigt fait défiler la page sur les simulations (`touch-action: pan-y`), sauf sur celles qu'on manipule au pointeur. |
| B2 circuit coupé au téléphone | **Corrigé** : cadrage sur le montage, Zoom + / − / Tout voir, pincer et glisser à deux doigts, page qui défile sur une zone vide, pointes du multimètre près du montage. Limite : montage entier à l'échelle 0,34-0,56, étiquettes à zoomer. |
| B3 carte mentale | **Corrigé** : texte ≥ 14 px, nœuds ≥ 45 px, branches repliées au départ, branches des deux côtés sur ordinateur, panneau fermé au départ au téléphone (32 % une fois ouvert), pincer pour zoomer. |
| B4 polices Google | **Corrigé** : polices locales (117 Ko, licence OFL), aucune requête vers un service tiers. |
| I1 cibles tactiles | **Corrigé** : 44 px au doigt (boutons, onglets 48 px, listes, curseurs à poignée de 28 px, cases dans un libellé de 44 px). |
| I2 « niveau » | **Corrigé** : le joueur a un **rang**, le TP une **difficulté** (1 à 3), « niveau » est réservé à l'école. |
| I3 souris et clavier | **Corrigé** : « appuie », pas de raccourcis clavier au téléphone, boutons Tourner et Supprimer, « à côté (en dessous sur un téléphone) ». |
| I4 elec-06 | **Corrigé** : tiroir cohérent avec la pile de 9 V, texte juste. |
| I5 jargon et longueur | **Partiellement** : « Ce que tu vas faire », « Questions », « Aller plus loin » ; réglages avancés repliés (moteur 4 temps). Les textes simples par niveau restent à écrire. |
| I6 poids de tp.html | **Corrigé** : chaque TP ne charge que sa simulation (9 à 12 scripts au lieu de 24) ; un test vérifie la table. |
| I7 hors ligne | **Corrigé** : service worker (réseau d'abord, cache sinon) et manifeste ; vérifié hors ligne sur l'accueil, un TP et une carte servis en http. |
| I8 contrastes | **Corrigé** : multimètre (≈ 6:1), texte indicatif, objectifs verrouillés sans transparence, carte mentale ≥ 4,5:1. |
| I9 tailles de texte | **Partiellement** : textes utiles agrandis (≥ 13-14 px) ; la sérigraphie décorative reste petite. |
| Mineurs | Tuiles de mesures remplacées par un relevé à filets ; « Tu en es là » aligné sur « Reprendre » ; légende des voyants ; annonces de gains en bas au téléphone ; en-tête opaque ; série indulgente (un jour manqué isolé ne la casse pas) ; encart de sécurité 220 V et batteries. **Non traités** : retours d'erreur ciblés et niveaux (prochaine étape). |

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
