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
- **Enfants** : aucun compte ; on simule, on ne manipule jamais le 230 V ni les batteries en vrai.
  La progression reste dans le navigateur. Seul le journal d'utilisation (`assets/js/journal.js`,
  serveur `serveur/app.js`, `docs/JOURNAL.md`) envoie des événements : **mesure d'audience
  minimisée**, pas « anonyme » au sens absolu (avis du juge du 27/10/2026). Aucun identifiant
  d'appareil ; numéro de visite en `sessionStorage`, jamais envoyé ; date de dernière visite effacée
  au bout de 13 mois ; le serveur ne garde que des totaux par jour de réception, sans ligne brute ni
  IP ; tableau de bord limité aux jours clos, cases sous le seuil k = 5 masquées. Refus dans
  `confidentialite.html` (et Global Privacy Control) ; désactivé tant que
  `assets/js/config-journal.js` est vide. Ni configuration ni données du journal dans Git. Accord
  de l'APDP obtenu (12/11/2026). Page de confidentialité volontairement courte et simple (décision
  de l'utilisateur) : ne pas la rallonger de détails juridiques ou techniques.
- Appareils modestes et connexion faible : pages légères, fonctionnement hors ligne.
- Hébergement (12/11/2026) : site sur Cloudflare Workers (`learn-space.madanitall214.workers.dev`,
  adresse donnée aux élèves, publiée à chaque push : `wrangler.jsonc`, `outils/site-public.js`) et
  copie de secours sur O2switch (`learningspace223.duckdns.org`). Journal (Node) sur O2switch :
  `https://learningspace223.duckdns.org/api/`, adresse écrite dans `assets/js/config-journal.js`.

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
- Application installable (PWA, `docs/APPLICATION.md`) : après tout ajout ou modification d'un
  fichier du site, régénérer la liste de précache avec `node outils/liste-precache.js`
  (`sw-fichiers.js`, et `serveur/liste-blanche.json` : les identifiants que le journal accepte, à
  recopier sur le serveur) ; `tests/pwa.test.js` échoue sinon.

## Architecture
- `assets/js/circuit/reseau.js` : connectivité (fils, jonctions en T, fils coupés des pannes).
- `assets/js/circuit/moteur-electrique.js` : analyse nodale transitoire, Newton, `pnjlim`.
- `assets/js/circuit/composants-elec.js` : symboles + modèles (dont multimètre, contacts avec arc).
- `assets/js/circuit/editeur.js` : éditeur, courant animé, oscilloscope, multimètre.
- `assets/js/circuit/logique.js` : simulateur logique.
- `assets/js/sims/*.js` : simulations animées (`LS.simAnimee`), une fabrique par TP (`LS.sims.<nom>`).
- `assets/js/sims/modele-moteur.js` : modèle thermodynamique du cylindre (testable sous Node).

## Interface et jeu
- Identité « cahier d'écolier malien » (13/11/2026, choix de l'utilisateur : « la A avec des idées de B ») :
  couverture brune (`--terre`) bordée d'une frise bogolan pour l'en-tête, les bas de page et les fenêtres ;
  page de cahier (`.cahier` : lignes `--ligne`, marge `--trait-marge`) pour le contenu ; encre bleue
  (`--encre`) ; ocre et argile pour les accents (boutons `--bouton`, surligneur `--surligne`) ; tampon vert
  (`--tampon`) pour les brevets ; mot du professeur en rouge (`--rouge`). Frises en bordure seulement,
  jamais derrière le texte ; SVG écrits dans le CSS (`--frise`, `--frise-fine`, `--toile`), sans fichier.
- À éviter (l'utilisateur rejette le « design IA générique ») : cartes arrondies ombrées en grille,
  dégradés décoratifs, effet verre, surtitre + titre + sous-titre, émojis et symboles Unicode décoratifs
  (✓, →, ★… ; `tests/interface.test.js` le vérifie), l'ancienne machine en métal / écrans LCD.
  Pictogrammes : SVG au trait de `LS.icone` (`commun.js`) ; un par atelier (`dom-<id>`), en clair sur un
  carré sombre par `LS.pictoAtelier`. Les symboles techniques restent (V⎓, ▶| du test diode, Ω…).
- Accueil au téléphone court : les éléments `.loin` (ateliers pour plus tard, leçons éloignées de la
  leçon en cours, brevets à venir au-delà de 3) sont repliés derrière un bouton « Voir… » (`voirPlus`
  dans `index.html`) ; tout reste affiché sur grand écran.
- Polices : Baloo 2 (titres), Atkinson Hyperlegible (texte), JetBrains Mono (chiffres). Couleurs : jetons de
  `:root` dans `style.css` ; les simulations lisent `--texte`, `--texte-doux`, `--fond`, `--carte`,
  `--accent`, `--accent-fort`, `--noeud`, `--bordure`, `--ok`, `--alerte`, `--info` (`LS.couleurs`) : garder
  ces noms. Mode sombre : page de cahier sombre (`prefers-color-scheme` ou `data-theme`). Cibles tactiles
  de 44 px au moins.
- `assets/js/jeu.js` : points (notion 10, objectif 25, question 10, TP ou carte terminé 50), rangs, série de
  jours, objectif du jour (60 pts), brevets (affichés en tampons). Registre de gains idempotent dans le
  navigateur, détecté en enveloppant `LS.marquerCompris` et `LS.enregistrerTP` (charger `jeu.js` après
  `progression.js`).

## Niveaux
- `assets/js/niveaux.js` (après `contenu/parcours.js`) : profil (niveau général et par atelier), choix
  ou petit test de placement sur l'écran d'accueil (`index.html#niveau`), `data-niveau` sur `<body>`.
- Écrire pour un niveau : dans une carte, `d1` (primaire, sans formule), `d2` (collège), `d` (lycée,
  texte de base), `d4` (avancé) ; dans un TP, `intro1` / `intro2`, et `niv: 2` ou `niv: [1, 1]` sur un
  objectif ou une question. Un TP à variantes garde son état sous `id@niveau`. Étapes du parcours :
  4e argument de `C()` / `T()` = niveau à partir duquel elles sont « à ta portée ».
- Primaire : texte plus grand, formules et outils avancés (`.outil-avance`) masqués.

## Carnet de bord
Tenir `docs/CARNET_DE_BORD.md` à jour à chaque décision ou changement (demande de l'utilisateur
le 23/10/2026) : ce qui est décidé, par qui (utilisateur, auteur, juge), ce qui est écarté et pourquoi,
commits. Ne jamais y présenter comme fait ce qui n'a pas été lancé ou vérifié.

## Juge
Chaque étape importante est relue par une instance indépendante, en lecture seule, qui ne reçoit
que le dépôt et la consigne d'être critique. Ses avis datés et les suites données : `docs/AVIS_DU_JUGE.md`.
