# Carnet de bord

Toutes les décisions et les changements, dans l'ordre. Pour chaque entrée : ce qui a été décidé, par
qui (**utilisateur**, **auteur**, c'est-à-dire l'agent qui écrit le code, ou **juge**), ce qui a été
écarté et pourquoi, puis les commits. Les avis complets du juge sont dans `AVIS_DU_JUGE.md`.

Règle : ne jamais écrire ici comme fait ce qui n'a pas été lancé ou vérifié. Ce qui n'est pas vérifié
est marqué **non vérifié**.

Ce carnet a été commencé le 23/10/2026 à la demande de l'utilisateur. Les entrées du 22/10 et du
23/10 (jusqu'au journal anonyme) ont été reconstituées à partir de l'historique Git et des échanges.

---

## 22/10/2026 : le socle

**Demande de l'utilisateur.** Un espace d'apprentissage en français, avec :
- des cartes mentales façon XMind, avec définitions et progression ;
- des TP où l'on assemble des composants et fait varier les grandeurs ;
- des simulations mécaniques en direct ;
- l'usage du multimètre et de l'oscilloscope ;
- le plus réaliste possible, et relu par un juge indépendant.

**Décisions de l'auteur.**
- **Site statique, sans dépendance ni étape de construction**, qui marche en ouvrant `index.html`
  depuis le disque : pas de modules ES, pas de `fetch`, contenu chargé par des balises `<script>`.
  - Écarté : un framework (React, Vite…). C'est trop lourd pour des appareils modestes, il faut une
    construction, et ça ne marche pas en file://.
- **Simulateur de circuits** à analyse nodale transitoire, avec Newton et `pnjlim` pour les diodes et
  les transistors, plutôt que des formules figées par TP : on peut alors assembler librement.
- Simulations animées (`LS.simAnimee`) : moteur thermique, transmissions, électromécanique, télécoms,
  ESP32, drones.
- `alert` et `confirm` remplacés par des messages dans la page, parce qu'ils sont bloqués sur claude.ai.

Commits : `d6b1d5d` à `c79c1b9`.

## 22/10/2026 : nouveaux domaines

**Demande de l'utilisateur.**
- TP d'IA ;
- énergie solaire et batteries ;
- électricité du bâtiment ;
- capteurs ;
- maths utiles, comme socle de tout le reste.

Commits : `3a99032` à `9864dc0`.

## 22/10/2026 : premier rapport du juge

Le juge a relu le dépôt en lecture seule, sans recevoir les justifications de l'auteur : un point
bloquant (B1) et 16 importants (I1-I16).
- Corrigés : protection du bâtiment (I2 ≤ 1,45 Iz), bobine, 230 V protégé, composants qui grillent,
  objectifs à réponse saisie et ordre imposé, drone, asynchrone, transformateur…
- Restés partiels et consignés : I6, I15 et I16.
- Parcours : le va-et-vient sur secteur placé après le courant alternatif.

Commits : `12f6a6b` à `fde04ab`.

## 23/10/2026 : publication sur claude.ai

**Demande de l'utilisateur** : pouvoir utiliser l'espace « ici ». L'auteur l'a publié en Artifact privé
(lien unique, republié à chaque grande étape).

## 23/10/2026 : nouvelle interface

**Demandes de l'utilisateur.**
- Style « ludique / jeu », mais sérieux. Priorités : accueil et navigation, pages de TP, téléphone,
  motivation et progression.
- Écarté par l'utilisateur :
  - le design typique des IA génériques ;
  - les cartes génériques ;
  - les icônes bizarres ;
  - la structure surtitre + grand titre + sous-titre.
- Polices choisies par l'utilisateur : **Baloo 2** (titres) et **Atkinson Hyperlegible** (texte).
  Bricolage Grotesque essayé puis écarté.
- Interface **utilisable même par des enfants**, et choix du design relu par le juge.

**Décisions de l'auteur.**
- **Identité « atelier d'électronique ».**
  - Une façade d'appareil : écran, gros bouton de marche, galvanomètre de l'objectif du jour, série,
    brevets.
  - Les ateliers posés comme des composants sur une carte électronique, reliés par des pistes de
    cuivre.
  - Une piste de pastilles pour les étapes.
- **Jeu** :
  - points, rangs et série indulgente (un jour manqué ne la casse pas) ;
  - objectif du jour de 60 points ;
  - brevets.
- Pas d'émojis ; pictogrammes au trait `LS.icone`.
- Polices hébergées sur le site (licence OFL) plutôt que chez Google : ça marche hors ligne, sans appel
  à un tiers.

**Revue du design par le juge** (B1-B4, I1-I9) :
- cibles tactiles de 44 px ;
- textes agrandis ;
- défilement libre sur les simulations ;
- une seule simulation chargée par TP ;
- circuit utilisable au doigt (cadrage, zoom, tiroir) ;
- les réglages avancés repliés sur marquage explicite (`avance: true`). Un repli automatique au-delà de
  4 réglages avait été essayé puis écarté, parce qu'il cachait des réglages essentiels.

Hors ligne : un service worker (réseau d'abord, cache sinon) et un manifeste.

Commits : `6d9c001`, `f903164` à `1f09cc1`.

## 23/10/2026 : vision de la plateforme

**Décisions de l'utilisateur.**
- Une plateforme **publique et gratuite** pour aider les plus jeunes.
- **Français d'abord** ; le bambara viendra plus tard.
- Programme **générique mais fortement malien** pour le moment.
- **Le réseau malien est en 220 V / 50 Hz** (confirmé par l'utilisateur). Les simulations, les TP et
  les tests ont été recalculés ; on dit « 230 V » seulement pour parler de la norme européenne.
- L'hébergement sera fait par l'utilisateur, probablement chez O2switch (offre cloud).

Commits : `16f4781`, `9885fc1`.

## 23/10/2026 : quatre niveaux

**Décisions de l'utilisateur.**
- Quatre niveaux : primaire, **collège** (c'est le sens de « secondaire », 11-15 ans), lycée, avancé.
- Le niveau adapte les étapes proposées, les textes, l'interface et le guidage, et la difficulté.
- On choisit par profil ou par un petit test de placement.

**Décisions de l'auteur.**
- Les niveaux sont calés sur l'école malienne : fondamental 1er cycle, 2e cycle jusqu'au DEF, 10e-12e
  (Bac, CAP, BT), supérieur.
- Chaque étape du parcours est rangée par niveau. Les étapes au-dessus du niveau restent visibles, sous
  « pour plus tard ».
- Textes `d1`, `d2`, `d` et `d4`. Un TP à variantes garde son état sous `id@niveau`.
- Au primaire : texte plus grand, et ni formules ni outils avancés.
- Limite connue : une progression faite avant l'arrivée des variantes n'est pas reprise dans les TP à
  variantes.

Commits : `d184062`, `9f6d715`, `692f1e0`.

## 23/10/2026 : journal d'utilisation, version 1 (pseudonyme)

**Demandes de l'utilisateur.**
- Un journal des appareils, des pages consultées et du temps passé par écran, page et exercice.
- Lecteur : l'utilisateur seul, administrateur. Identité : un pseudonyme par appareil.
- « Tous les logs doivent me parvenir. »
- Serveur en Node ou en Django chez O2switch.

**Décisions de l'auteur.**
- **Serveur Node.js sans dépendance npm**, déployable par « Setup Node.js App » (Passenger).
  - Une première version en PHP a été écartée et supprimée sur demande de l'utilisateur.
  - Django écarté : plus lourd à installer sur un hébergement mutualisé.
- Collecte active par défaut ; refus possible dans `confidentialite.html`.
- Aucun nom, aucune adresse IP ni aucun user-agent enregistrés.
- Ni configuration ni données dans Git.

**Avis du juge.** Pas prêt à déployer.
- B1 : limites de débit contournables.
- B2 : pas de base légale établie pour la collecte par défaut auprès de mineurs.
- B3 : page de confidentialité incomplète.
- Et 10 points importants.

**Suites.**
- Corrigés : B1, B3, I1-I5, I7-I10 et les mineurs.
- Partiels : I6 (plusieurs processus) et M8 (deux onglets).
- Bug trouvé en vérifiant dans Chromium : la connexion à l'administration était refusée (`Origin: null`).
  Corrigé.

Commits : `11d7509`, `ed58ceb`, `7f51d27`.

## 23/10/2026 : journal vraiment anonyme, et application installable (PWA)

**Question de l'utilisateur** : si les données n'identifient personne, où est le problème ?

**Réponse de l'auteur.** Le numéro d'appareil gardé 12 mois rend les données **pseudonymes**, pas
anonymes : on peut suivre un même appareil et le reconnaître par recoupement (en classe, ou avec les
journaux d'IP de l'hébergeur). Ce sont donc des données personnelles d'enfants. Des données vraiment
anonymes sortent du champ de la loi.

**Décision de l'utilisateur** : un numéro **gardé seulement pendant la visite et perdu après**.

**Décisions de l'auteur** (en cours) :
- numéro de visite en `sessionStorage`, renouvelé après 30 minutes d'inactivité ;
- adoption mesurée sans identifiant : seule la date de la dernière visite reste sur l'appareil, et
  seule sa catégorie est envoyée (première visite, moins de 7 jours, 7 à 30 jours, plus de 30 jours) ;
- le serveur ne garde que des **totaux par jour**, sans horodatage par événement ;
- les essais ratés sont ajoutés pour voir où les élèves se trompent ;
- abandonnés, puisqu'ils n'ont plus d'objet : l'effacement et l'export par appareil.

**Décision de l'utilisateur** : faire du site une **PWA**.

**Décisions de l'auteur** (en cours) :
- vraies icônes et bouton « Installer l'application » ;
- tout le site mis en cache pour marcher hors ligne après la première visite ;
- avis de nouvelle version et page hors ligne de secours ;
- le site doit toujours marcher en file://.

**Décision de l'utilisateur** : tenir ce carnet de bord pour toutes les décisions et tous les
changements.

**État au 27/10/2026.**
- Écrit et vérifié par l'auteur. Commits : `098cee4` (sauvegarde intermédiaire, après un redémarrage de
  l'environnement de travail), puis la mise à jour de CLAUDE.md.
- Tests : 116 réussis.
- Le juge relit en ce moment.

**Décisions de l'auteur, journal anonyme.**
- Le numéro de visite n'est **même pas envoyé**. La durée d'une visite se compte par paliers atteints
  (1, 5, 15, 30 et 60 minutes) : le serveur n'a rien à relier.
- Le serveur ne garde que des totaux par jour (`agregats/AAAA-MM-JJ.json`), écrits sous un verrou de
  fichier partagé entre processus. Il n'y a aucune ligne brute ni aucun horodatage. Les visites sont
  comptées par tranche horaire UTC, qui est l'heure de Bamako.
- Les combinaisons rares sont regroupées en « autre ». Seules des répartitions séparées sont stockées,
  jamais la combinaison complète type × système × largeur × niveau.
- Pour éviter les doubles comptes, seuls des identifiants de lots aléatoires sont gardés, 31 jours, sans
  lien avec une visite. Les événements sont acceptés jusqu'à 30 jours de retard.
- Au plus 3 000 clés par rubrique et par jour, au-delà « (autres) », pour empêcher le gonflement des
  fichiers.
- Les totaux sont gardés 25 mois, pour comparer deux années scolaires. Les données brutes de la version
  précédente sont effacées au démarrage.
- La limite de débit se fait par adresse, en mémoire (600 lots par 10 minutes).
- Les chiffres sont des nombres d'**événements**, pas de personnes :
  - un TP est compté une fois par visite ;
  - un objectif réussi est compté une fois par navigateur.
- Essais ratés : deux `dispatchEvent("ls:essai")` dans `tp.js`, l'un pour les objectifs, l'autre pour
  les questions.

**Écarté, journal anonyme.**
- Garder des lignes brutes en effaçant le numéro sous 24 h : les totaux directs suffisent.
- Envoyer le numéro de visite : inutile avec les paliers.
- Stocker la combinaison complète des informations sur l'appareil : trop fine.

**Décisions de l'auteur, application installable.**
- Icônes 192, 512, maskable 512 et 180 pour iOS. Trois raccourcis : Ateliers, Bac à sable, Brevets.
- **Cache d'abord** pour les fichiers du site, avec un cache versionné par empreinte
  (`learnspace-v4-<empreinte>`) : c'est rapide sur un réseau faible.
- La nouvelle version n'est appliquée qu'après un clic sur « Recharger », pour ne pas couper un TP en
  cours.
- La liste de précache est générée par `outils/liste-precache.js` dans `sw-fichiers.js` (146 fichiers).
  `tests/pwa.test.js` échoue si elle n'est pas régénérée, et la règle est ajoutée à CLAUDE.md.
- Ne passent pas par le cache : `/api`, `/admin`, `/journal` et les autres sites. `config-journal.js` est
  relu sur le réseau d'abord.
- Bouton « Installer l'application » seulement dans le pied de page de l'accueil, pour rester discret.
  Sur iPhone, une petite aide.
- L'enregistrement du service worker passe dans `assets/js/pwa.js`.

**Écarté, application installable.**
- Recharger tout seul à chaque nouvelle version : on perdrait le TP en cours.
- « Réseau d'abord » pour tout le site : trop lent sur un réseau faible.

**Vérifié dans Chromium.**
- L'application est installable, sans erreur.
- Avec le serveur arrêté pour de vrai, des TP et des cartes jamais ouverts s'affichent. Une page
  inconnue mène à `hors-ligne.html`.
- L'avis de mise à jour s'affiche.
- En file:// : ni service worker ni bouton d'installation.

**Non vérifié.**
- Le vrai O2switch : Passenger, la forme réelle de `X-Forwarded-For`, le verrou sur leur système de
  fichiers.
- Une vraie installation sur Android ou sur iPhone.
- Le `beforeinstallprompt` réel (il a été seulement simulé).
- Node 18 et 20.
- Les essais ratés aux objectifs saisis, vus seulement en test (les questions ont été vérifiées avec de
  vrais clics).

---

## Reste à faire et à décider

**À faire par l'utilisateur, avant la mise en ligne du journal :**
- remplir les « À COMPLÉTER » de `confidentialite.html` (responsable, contact) ;
- faire confirmer auprès de l'APDP que les données sont bien anonymes ;
- vérifier sur place, chez O2switch, l'en-tête `X-Forwarded-For` (page de diagnostic).

**Non vérifié :**
- le vrai déploiement O2switch ;
- Node 18 et 20 ;
- un vrai téléphone Android ;
- les gestes tactiles sur un vrai appareil.

**Plus tard :**
- textes et objectifs par niveau pour les autres domaines ;
- retours d'erreur ciblés ;
- TP de Python, de finance et de Git ;
- le bambara.
