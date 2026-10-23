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
- le plus réaliste possible, avec plusieurs cas de figure ; travail relu par un **juge** indépendant ;
- interface ludique et fun mais sérieuse, **utilisable même par des enfants** (lecture facile, gros boutons, consignes courtes, encouragement).

## Vision (23/10/2026)
Plateforme **publique et gratuite** pour aider les plus jeunes à apprendre et comprendre.
- **Français d'abord** (le bambara viendra plus tard) ; programme **générique mais fortement malien
  pour le moment** : niveaux calés sur l'école malienne (`LS.NIVEAUX` dans `contenu/parcours.js` :
  primaire = fondamental 1er cycle, collège = 2e cycle jusqu'au DEF, lycée = 10e-12e, Bac, CAP, BT ;
  avancé = supérieur et métier), exemples maliens d'abord (Bamako, FCFA, EDM et délestages, kits
  solaires, motos, recharge du téléphone). Le réseau malien est en 220 V / 50 Hz : le dire quand les
  TP utilisent 230 V (norme européenne CEI).
- **Quatre niveaux** : primaire, collège (11-15 ans), lycée, avancé. On choisit son niveau par un
  profil ou par un petit test de placement, et on peut en changer (aussi par atelier). Le niveau
  adapte : les étapes proposées, les textes (version simple sans formule au primaire), l'interface et
  le guidage, la difficulté des objectifs et des quiz.
- **Enfants** : aucun compte, aucune donnée envoyée (progression dans le navigateur seulement) ;
  on simule, on ne manipule jamais le 230 V ni les batteries en vrai.
- Appareils modestes et connexion faible : pages légères, fonctionnement hors ligne.
- Hébergement : l'utilisateur s'en charge (probablement O2switch, offre cloud). Le site reste
  statique : il suffit de copier les fichiers.

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

## Interface et jeu
- Identité « atelier d'électronique » : façade d'appareil (niveau, jauge à aiguille, série, brevets),
  ateliers posés comme des composants sur une carte électronique reliés par des pistes de cuivre,
  piste de pastilles pour les étapes. **Pas de cartes génériques** (boîtes arrondies ombrées en grille),
  **pas d'émojis ni de symboles Unicode décoratifs** dans l'interface : texte simple, ou pictogrammes au
  trait de `LS.icone` (`commun.js`). Les symboles techniques restent (V⎓, ▶| du test diode, Ω…).
- Polices : Baloo 2 pour les titres (ludique), Atkinson Hyperlegible pour le texte (sérieux, lisible),
  JetBrains Mono pour les chiffres et la sérigraphie. Couleurs : jetons de `:root` dans `style.css`.
- `assets/js/jeu.js` : points (notion 10, objectif 25, question 10, TP ou carte terminé 50), niveaux,
  série de jours, objectif du jour (60 pts), brevets. Registre de gains idempotent dans le navigateur,
  détecté en enveloppant `LS.marquerCompris` et `LS.enregistrerTP` (charger `jeu.js` après
  `progression.js`).

## Juge
Chaque étape importante est relue par une instance indépendante, en lecture seule, qui ne reçoit
que le dépôt et la consigne d'être critique. Ses avis datés et les suites données : `docs/AVIS_DU_JUGE.md`.
