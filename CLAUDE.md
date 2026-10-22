# Contexte du projet (pour les agents IA et les nouveaux contributeurs)

## Objet
Espace d'apprentissage interactif en français : électricité analogique et composants, électricité
numérique, électronique, électromécanique, télécommunications (transmission et commutation),
mécanique des moteurs (voitures, motos), transmissions, ESP32/ESP8266 et connectique, drones,
plus Python/data, ML/audio, finance/trading, Git. L'utilisateur travaille en français.

Demandes de l'utilisateur à respecter :
- cartes mentales interactives (style XMind) avec définitions, dans une progression ;
- TP où l'on **assemble** des composants et fait **varier** les grandeurs pour voir les réactions,
  du plus simple au plus complexe ;
- en mécanique, fonctionnement simulé en direct, interactif, avec l'explication des notions ;
- utilisation des outils de mesure (multimètre, oscilloscope) ;
- le plus réaliste possible, avec plusieurs cas de figure ; travail relu par un **juge** indépendant.

## Règles
- Site statique, **sans dépendance ni étape de construction** : il doit marcher en ouvrant
  `index.html` depuis le disque (pas de modules ES, pas de `fetch` : le contenu est chargé par des
  balises `<script>`). Pas de bibliothèque externe.
- Contenu : `contenu/cartes/<id>.js` (`LS.ajouterCarte`), `contenu/tps/<id>.js` (`LS.ajouterTP`),
  ordre dans `contenu/parcours.js`. Titres de nœuds uniques dans une carte (l'identifiant est le slug).
- Ne jamais présenter comme réaliste un modèle non vérifié : chiffrer (tests, ordres de grandeur),
  documenter les limites dans `docs/AVIS_DU_JUGE.md` et dans les explications.
- Tests : `node --test tests/*.test.js` (simulateur + cohérence du contenu). Les lancer avant
  chaque commit ; la CI GitHub les relance.
- Vérifier visuellement avec Chromium sans écran (Playwright) les pages modifiées.

## Architecture
- `assets/js/circuit/reseau.js` : connectivité (fils, jonctions en T, fils coupés des pannes).
- `assets/js/circuit/moteur-electrique.js` : analyse nodale transitoire, Newton, `pnjlim`.
- `assets/js/circuit/composants-elec.js` : symboles + modèles (dont multimètre, contacts avec arc).
- `assets/js/circuit/editeur.js` : éditeur, courant animé, oscilloscope, multimètre.
- `assets/js/circuit/logique.js` : simulateur logique.
- `assets/js/sims/*.js` : simulations animées (`LS.simAnimee`), une fabrique par TP (`LS.sims.<nom>`).
- `assets/js/sims/modele-moteur.js` : modèle thermodynamique du cylindre (testable sous Node).

## Juge
Chaque étape importante est relue par une instance indépendante, en lecture seule, qui ne reçoit
que le dépôt et la consigne d'être critique. Ses avis datés et les suites données : `docs/AVIS_DU_JUGE.md`.
