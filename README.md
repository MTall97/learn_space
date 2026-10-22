# ⚡ Learn Space

Espace d'apprentissage interactif, en français, pour comprendre **et pratiquer** :

| Domaine | Cartes mentales | TP simulés |
|---|---|---|
| 📐 Maths utiles (le socle) | maths | cercle trigonométrique, complexes et impédance, dérivée et intégrale, exponentielle et décibels, statistiques |
| ⚡ Électricité : bases et composants | bases, composants, courant alternatif | 14 TP : premier circuit → loi d'Ohm → multimètre → série/parallèle → diviseur → LED → Kirchhoff → va-et-vient 230 V → condensateur → bobine → recherche de panne → alternatif → filtre → bac à sable |
| 🔬 Électronique | électronique | redressement et lissage, Zener, transistor, veilleuse automatique |
| ☀️ Solaire et batteries | solaire | courbe d'un panneau, batterie plomb/LiFePO4, régulateur PWM ou MPPT, dimensionnement d'un kit autonome |
| 🏠 Électricité du bâtiment | bâtiment | disjoncteur et section des câbles, différentiel 30 mA (schéma TT), chute de tension |
| 🔢 Numérique | numérique | binaire, portes logiques, additionneur, bascules et compteur, échantillonnage |
| 🧲 Électromécanique | électromécanique | relais et moteur, moteur CC, alternateur, transformateur, asynchrone triphasé, pas à pas et servo |
| 📡 Télécommunications | télécommunication, transmission, OSI (reprises des cartes XMind) | signal et spectre, modulation, bande passante et débit, UART, encapsulation, IPv4, commutation |
| 🏍️ Moteurs (voitures, motos) | moteur thermique | 4 temps, essence/diesel, 2 temps, multicylindre, couple et puissance |
| ⚙️ Transmissions | transmission | engrenages, chaîne de moto, embrayage, boîte de vitesses, différentiel |
| 📟 ESP32 / ESP8266 | ESP32 et connectique | LED, bouton (pull-up, rebonds), PWM, ADC, bus UART/I2C/SPI, alimentation et niveaux 3,3 V |
| 🌡️ Capteurs | capteurs | thermistance, ultrasons, gyroscope et accéléromètre, bruit et étalonnage |
| 🚁 Drones | drone multirotor | propulsion et autonomie, PID d'altitude, mixage des moteurs |
| 🎧 ML et audio | machine learning et audio | neurone et descente de gradient, surapprentissage, spectrogramme, WER/BLEU, fuite de données |
| 🐍 Python, 📈 Finance, 🌿 Git | une carte chacun | — |

## Ouvrir l'espace

Aucune installation : ouvre **`index.html`** dans un navigateur (double-clic). Tout fonctionne hors ligne, sans serveur ; seule la police d'écriture vient d'Internet (sinon une police système la remplace).

Pour le publier en ligne gratuitement : sur GitHub, **Settings → Pages → Deploy from a branch → `main` / racine**. Le site sera à l'adresse `https://<utilisateur>.github.io/learn_space/`.

La progression (notions comprises, objectifs atteints, montages) est gardée **dans le navigateur** (localStorage) : elle ne se synchronise pas entre appareils.

## Comment c'est fait

- **Cartes mentales** (`carte.html?id=…`) : arbre interactif à la XMind. Clic sur une notion → définition, formule, exemple, analogie, lien vers le TP ; « J'ai compris » pour suivre sa progression ; mode **Réviser** par fiches.
- **TP** (`tp.html?id=…`) : une simulation, des **objectifs vérifiés en direct**, des questions et les notions liées (tirées des cartes).
- **Simulateur de circuits** (`assets/js/circuit/`) : on pose les composants, on les relie, on règle leurs valeurs, on observe courant (points jaunes), potentiels (couleurs des fils), oscilloscope et **multimètre réaliste** (sélecteur, douilles, fusibles, continuité, test diode). Résolution par analyse nodale en régime transitoire (méthode de Newton pour les diodes, LED et transistors ; Euler implicite pour condensateurs et bobines). Résistances, lampes, LED et fusibles peuvent griller (les autres composants : voir les limites) ; un contact qui coupe une bobine fait une étincelle.
- **Simulations animées** (`assets/js/sims/`) : moteur thermique (modèle thermodynamique : compression, combustion, détente, diagramme pression-volume, couple), transmissions (dynamique de l'embrayage, calage), machines électriques, télécoms, ESP32 (contraintes réelles des broches, ADC non linéaire, PWM), drones.

### Arborescence

```
index.html, carte.html, tp.html      pages
assets/css/style.css                 thème (brun façon XMind en mode sombre, crème en clair)
assets/js/commun.js, progression.js  outils, stockage, progression
assets/js/carte-mentale.js           carte mentale interactive
assets/js/circuit/                   éditeur et simulateurs électrique et logique
assets/js/sims/                      simulations animées
contenu/parcours.js                  domaines et ordre des étapes
contenu/cartes/<id>.js               une carte mentale par fichier
contenu/tps/<id>.js                  un TP par fichier
tests/                               tests (node --test tests/*.test.js)
```

### Ajouter du contenu

- **Une notion** : ajouter un nœud `{ t: "Titre", d: "définition", f: "formule", ex: "exemple", an: "analogie", tp: "id-du-tp", voir: ["Autre notion"] }` dans `contenu/cartes/<id>.js`. Les titres doivent être uniques dans une carte.
- **Un TP** : créer `contenu/tps/<id>.js` (copier un TP existant du même type), puis l'ajouter à `contenu/parcours.js`. Chaque objectif a une fonction `verif(sim, memo)` qui renvoie `true` quand il est atteint.
- Lancer les tests : `node --test tests/*.test.js` (ils vérifient le simulateur et la cohérence du contenu : étapes, notions citées, liens).

## Limites connues

Les simulations sont pédagogiques : modèles simplifiés mais physiquement cohérents, avec des ordres de grandeur réalistes. Elles ne remplacent ni un logiciel de simulation professionnel (SPICE), ni la mesure sur un vrai montage. Voir `docs/AVIS_DU_JUGE.md` : rapport du juge indépendant (22/10/2026), suites données et limites connues de chaque modèle.
