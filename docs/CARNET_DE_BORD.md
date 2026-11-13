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

## 27/10 au 12/11/2026 : avis du juge et corrections du journal et de l'application

**Avis du juge du 27/10** (détail dans `AVIS_DU_JUGE.md`) : pas prêt.
- B1 : le secret d'exemple permettait de forger un accès administrateur.
- B2 : « anonyme » est faux quand il y a peu de visites.
- B3 : un bug du quiz enregistrait l'état sous « q0 ».

**Décision de l'auteur, à la suite de B2.** On ne dit plus « anonyme » mais **mesure d'audience
minimisée**. La base légale retenue est l'intérêt légitime, à faire confirmer par l'APDP.

**Corrections.** Les auteurs ont travaillé en plusieurs reprises, interrompus par des limites de requêtes.
Sauvegardes intermédiaires : `85ed902`, puis le commit de cette entrée.

**Décisions de l'auteur.**
- Le jour en cours n'est jamais lisible, et chaque lot est rangé **au jour de réception** : un jour
  terminé ne change plus.
- Seuil k = 5 :
  - une case sous le seuil est masquée ;
  - une ligne dont le compte principal est sous le seuil est cachée ;
  - un pourcentage ne s'affiche que si ses deux termes atteignent le seuil.
- Liste blanche (`serveur/liste-blanche.json`) générée avec la liste de précache. Le serveur lit des
  données, il n'exécute jamais le contenu du dossier public.
- Un lot sans aucun événement valable est confirmé, mais ni écrit ni compté.
- Le temps passé compte aussi pendant une animation, jusqu'à 10 minutes après le dernier geste.
- Sans `X-Forwarded-For` : plus aucun mécanisme par adresse, seuls restent les plafonds globaux.
- La date de dernière visite est effacée au bout de 13 mois sans être prolongée. Global Privacy Control
  vaut refus.
- Mise à jour du site : tous les onglets se rechargent quand la nouvelle version prend la main.
- `config-journal.js` : 1,5 s pour le réseau, puis le cache.

**Écarté, et pourquoi.**
- Un tampon de lots bruts pour le jour en cours : ce seraient des données brutes.
- Une fusion des totaux en mémoire une fois par jour : on perdrait des données au redémarrage.
- La limite de « 3 jours par lot » : inutile avec le rangement au jour de réception, et elle aurait
  rejeté des lots légitimes.
- Lire le contenu au démarrage du serveur : il aurait fallu exécuter du JavaScript venu du dossier
  public.

**Non vérifié.**
- Le vrai O2switch.
- Node 18 et 20.
- Un vrai téléphone : installation, `beforeinstallprompt`, Safari.
- Les essais aux objectifs à réponse écrite par de vrais clics.
- Le temps pendant une animation dans un vrai navigateur.
- La déduction par différence entre deux périodes qui se recouvrent : risque documenté, non corrigé.

## 12/11/2026 : APDP, page de confidentialité plus souple, déploiement sur O2switch

**Décisions de l'utilisateur (« c'est un ordre »).**
- **L'APDP a donné son accord.**
- La page de confidentialité n'a pas besoin d'être totalement explicite : les données servent à des
  statistiques d'utilisation et d'adoption, et personne ne cherchera à retrouver les utilisateurs.
- Être plus souple sur ce sujet.

**Ce que l'auteur a fait.**
- `confidentialite.html` réécrite en trois paragraphes courts :
  - ce qui est compté ;
  - ni nom ni compte, et pas de numéro qui suit d'un jour à l'autre ;
  - administrateur seul, effacement au bout de 25 mois, hébergement par O2switch en France ;
  - un mot pour les parents, et le bouton de refus.
- Les mentions « À COMPLÉTER » et les détails techniques sont retirés.
- **Écarté :** la suppression complémentaire contre la déduction par soustraction (N-B1 de l'avis du
  12/11). Elle n'est plus jugée nécessaire, vu la décision de l'utilisateur. Le seuil k = 5 et les jours
  clos restent.

**Déploiement.**
- Paquet préparé à partir du dernier état stable (`083a1fa`), avec la nouvelle page de confidentialité
  et `config-journal.js` réglé sur `/api/journal` :
  - `learnspace-site.zip` ;
  - `learnspace-serveur.zip` ;
  - un guide pas à pas pour Setup Node.js App.
- 122 tests réussis sur ce paquet. Serveur essayé ici avec une configuration d'exemple : `/api/sante`
  répond `ok`, et `/api/admin` répond.
- **Non vérifié :** le déploiement réel chez O2switch.

**En cours** : les corrections de l'avis du 12/11 encore utiles (bouton « Recharger » de la première
visite, attente de 1,5 s sur un réseau faible, comptage des réussites et du temps, liste blanche,
bourrage), interrompues par une limite de requêtes.

## 12/11/2026 : premier déploiement sur O2switch, et HTTPS gratuit

**Fait par l'utilisateur.**
- Le serveur du journal tourne sur O2switch : `/api/sante` répond `ok`.
- Le tableau de bord s'ouvre, vide parce qu'aucune journée n'est encore close.
- Le diagnostic montre `X-Forwarded-For` présent, avec une seule entrée (`41.73.x.x`).
- Incident : `node` était introuvable dans le terminal. Il fallait d'abord `source
  ~/nodevenv/learnspace-journal/20/bin/activate`.

**Problème.** L'adresse provisoire `sc1busu9925.universe.wf` n'a pas de certificat valable, et AutoSSL a
échoué. Sans HTTPS valable, l'application ne s'installe pas et ne marche pas hors ligne. L'utilisateur
n'a pas de budget pour un nom de domaine.

**Décision de l'auteur.** Proposer **Cloudflare Pages**, gratuit, pour le site : adresse `pages.dev`
avec un certificat valable, et serveurs proches de l'Afrique de l'Ouest. Le journal reste sur O2switch.
- Ajout de `outils/site-public.js` : il copie les seuls fichiers publics dans `_site/` et écrit
  `_headers`. Le mode d'emploi est dans `docs/CLOUDFLARE_PAGES.md`.
- Vérifié ici dans Chromium sur `_site/` : accueil, deux TP, une carte et la confidentialité s'ouvrent
  sans erreur, et le service worker est actif.
- **Écarté :** GitHub Pages, gratuit seulement si le dépôt est public, et un nom de domaine payant.
  eu.org reste possible, mais l'attente peut durer des semaines.
- **Non vérifié :** la publication réelle sur Cloudflare Pages, et DuckDNS avec AutoSSL chez O2switch
  pour le journal.

**Suite.** Le dashboard d'administration sera restylé dans le style du site (demande de l'utilisateur :
« le css est moche »), sous la même politique de sécurité, avec le style écrit dans la page.

## 12/11/2026 : site en ligne sur Cloudflare (Workers)

**Fait par l'utilisateur.** Le site est publié à `https://learn-space.madanitall214.workers.dev/`, en
projet Cloudflare **Workers** et non Pages.

**Vérifié par l'auteur**, avec curl et Chromium sur le site en ligne :
- les pages s'affichent ;
- **défaut 1 :** tout le dépôt était publié (`serveur/app.js`, `docs/`, `CLAUDE.md`, `tests/`). Il n'y
  avait pas de secret, mais ce n'était pas voulu ;
- **défaut 2 :** `tp.html` était redirigé vers `/tp` (307). Le service worker restait bloqué en
  installation, avec 0 fichier en cache : pas d'installation ni de hors ligne.

**Correction de l'auteur.** `wrangler.jsonc` fait publier seulement `_site/` et fixe
`html_handling: none`. La commande de construction à régler dans Cloudflare est
`node outils/site-public.js`.

**Vérification après republication.** Les fichiers internes ne sont plus servis (404) et `tp.html` n'est
plus redirigé. Mais la racine `/` répondait 404, parce que `html_handling: none` ne sert plus
`index.html`. Le service worker n'installait donc rien, puisqu'il met `./` en cache.

**Correction de l'auteur.** `outils/cloudflare-worker.js` : quelques lignes, qui ne tournent que si aucun
fichier ne correspond. La racine `/` sert alors `index.html`, et le reste répond 404. Le comportement est
testé localement.

**Vérifié en ligne après la republication (commit `de2711c`).**
- La racine `/` et `tp.html` répondent 200. `serveur/`, `CLAUDE.md`, `wrangler.jsonc` et `outils/`
  répondent 404.
- Dans Chromium, le service worker est actif avec 146 fichiers en cache, et Chrome ne signale aucune
  erreur d'installation.
- Navigateur coupé du réseau, un TP jamais ouvert (moteur 4 temps) s'affiche.
- Limite : le mode hors ligne de Playwright ne coupe pas toujours le réseau du service worker. Un vrai
  téléphone en mode avion reste à essayer.

## 12/11/2026 : journal branché (DuckDNS), site à deux adresses

**Décision de l'utilisateur** : avoir les deux.
- Le site est sur Cloudflare (`learn-space.madanitall214.workers.dev`, l'adresse à donner aux élèves) et
  en copie sur O2switch (`learningspace223.duckdns.org`, en secours).
- Un seul journal, sur `https://learningspace223.duckdns.org/api/`.

**Fait par l'utilisateur.**
- Sous-domaine DuckDNS gratuit pointé sur le serveur O2switch (109.234.164.48), ajouté comme domaine dans
  cPanel.
- AutoSSL a réussi : le certificat est valable.
- L'application Node a été déplacée sur ce domaine. `origines` contient les deux adresses.

**Vérifié par l'auteur.**
- `/api/sante` répond `ok` en HTTPS valable, et la racine répond 200.
- CORS : l'origine Cloudflare est acceptée (`Access-Control-Allow-Origin`).

**Changement.** `assets/js/config-journal.js` contient maintenant l'adresse complète
`https://learningspace223.duckdns.org/api/journal`. Elle vaut pour les deux copies du site. Le **journal
est donc actif** sur le site publié.

**Précaution notée.** La progression et l'application installée sont liées à l'adresse. Il faut donner
une seule adresse aux élèves.

## 12/11/2026 : style du tableau de bord

**Demande de l'utilisateur** : « le css est moche », puis « refais le style du tableau de bord
maintenant ».

**Fait par l'auteur** (`serveur/app.js`, fonctions `pageHtml`, `pageConnexion`, `pageDiagnostic`,
`pageTableau`) :
- style « atelier d'électronique » du site :
  - façade en métal avec LED pour l'en-tête ;
  - chiffres clés sur des écrans LCD verts ;
  - titres de section en pastille et piste de cuivre ;
  - tableaux en en-têtes sérigraphiés, avec les chiffres en police à chasse fixe ;
  - boutons en touches d'appareil ; « Tout effacer » en rouge ;
- mode sombre automatique ;
- polices du site (Baloo 2, Atkinson, JetBrains Mono) chargées depuis le même domaine. La politique de
  sécurité gagne seulement `font-src 'self'` : toujours aucun script, et le style reste écrit dans la page.

**Vérifié** dans Chromium avec des totaux d'essai, sur ordinateur, sur téléphone (390 px) et en mode
sombre : aucun débordement horizontal de la page, et 122 tests réussis.

**Non vérifié** : le chargement des polices sur le vrai domaine. Elles sont servies par la copie du site
sur `learningspace223.duckdns.org` ; à défaut, ce sont les polices du système.

## 12/11/2026 (soir) : corrections de l'avis du juge du 12/11

**Fait par l'auteur du journal.** Le travail a été réappliqué par-dessus `be0e9d7`, sans perdre le
déploiement Cloudflare ni le style du tableau de bord. 132 tests réussis.

**Corrigé :**
- **N-I1** : « Recharger » dans l'onglet de la première visite.
- **N-I3** :
  - le journal est chargé après l'événement `load`, sans bloquer la page ;
  - `config-journal.js` est servi par le cache, puis remis à jour en arrière-plan ;
  - quand ce fichier ne répond pas, la page s'ouvre en 116 ms au lieu de plus de 20 s.
- **N-I4** : taux de réussite calculés sur les ouvertures sans réussite antérieure sur l'appareil.
- **N-I5** : le temps n'est compté que si une simulation est en marche, avec une marge de 3 min.
- **N-I6** : alerte quand la liste blanche ou la version du site ne correspond pas (`empreinte-contenu.js`),
  et la liste est relue sans redémarrer.
- **N-I2** : corps de 16 Ko au plus, champs inconnus refusés, plafond par adresse, `ms` borné.
- **Mineurs** : N-M1, N-M2/M1, N-M3, N-M4, N-M7, N-M8, N-M9 et M4.
- Les tests qui cherchaient des expressions régulières dans le code sont remplacés par de vrais tests
  navigateur. Ils sont sautés en CI, faute de Chromium.

**Écarté** : N-B1 (décision de l'utilisateur) ; N-M5, N-M6 et M3, jugés non prioritaires.

**À trancher** : un circuit en régime établi, sans aucun geste, compte comme du temps actif jusqu'à
3 min.

**Non vérifié** : le déploiement réel, et une nouvelle relecture par le juge.

**Pas encore poussé** : l'utilisateur a demandé de voir d'abord une proposition de nouvelle interface.
Trois maquettes d'accueil lui sont soumises : A Cahier, B Bogolan, C Manuel. Il trouve l'interface
actuelle trop « IA générique ». Il a aussi demandé d'automatiser le déploiement sur O2switch : la
proposition est GitHub Actions, avec FTPS et `tmp/restart.txt`, en attente de son accord et des secrets.

## 12/11/2026 (nuit) : choix de l'interface et déploiement automatique sur O2switch

**Décisions de l'utilisateur.**
- Il a choisi la maquette **A (Cahier d'écolier), enrichie d'idées de B (Bogolan)** pour la nouvelle
  interface de tout le site. L'interface « atelier d'électronique » est abandonnée : trop « IA
  générique » à son goût.
- Il a créé le compte FTP et les secrets GitHub pour le déploiement automatique.
- Les corrections du 12/11 ont été poussées (`107c848`) une fois l'interface choisie, comme il l'avait
  demandé.

**Fait par l'auteur.**
- `.github/workflows/deploiement-o2switch.yml` : à chaque push, et seulement si les tests passent, envoi
  par FTPS du site (`sw.js` en dernier) et du serveur (`app.js`, `liste-blanche.json`), redémarrage par
  `tmp/restart.txt`, puis vérification de `/api/sante`. Rien n'est jamais supprimé sur le serveur.
  Mode d'emploi : `docs/DEPLOIEMENT_O2SWITCH.md`.
- **Écarté :** SSH, parce que O2switch demande d'autoriser chaque adresse IP à l'avance et que celles de
  GitHub changent ; la Git Version Control de cPanel, qui demande un clic à chaque mise à jour.
- **Non vérifié :** la première exécution réelle (nom du serveur FTP, certificat, dossiers).

**En cours :** une instance refait toute l'interface au style cahier et bogolan. Le juge la relira
ensuite.

## 13/11/2026 : nouvelle interface « cahier d'écolier malien »

**Demande de l'utilisateur.** Il trouvait l'ancienne interface « IA slop » (machine en métal, écrans LCD,
carte électronique). Parmi trois maquettes, il a choisi « la A (cahier) avec des idées de B (bogolan) »,
puis, en voyant les captures : « raccourcis l'accueil au téléphone et pousse ».

**Fait par l'auteur** (instance de design) :
- l'en-tête en couverture brune avec une frise bogolan (SVG en ligne, en bordure seulement) ;
- les pages en papier de cahier : lignes bleues pâles, marge rouge, encre bleue ;
- l'ocre et l'argile pour les boutons et le surligneur ;
- les brevets en tampons verts, et un mot du professeur en rouge ;
- le sommaire numéroté, avec un pictogramme bogolan par atelier (`LS.pictoAtelier`) ;
- les objectifs des TP en exercices numérotés dans la marge, et les onglets en intercalaires ;
- la carte mentale « au stylo » sur petits carreaux ;
- le tableau de bord du journal dans le même style, toujours sans script ;
- la nouvelle icône de l'application ;
- les symboles Unicode décoratifs remplacés par des SVG, avec un test qui le vérifie.

**Écarté** :
- les lignes derrière les simulations et dans le panneau d'exercices, pour la lisibilité ;
- la toile bogolan au téléphone ;
- les voyants et les pastilles, remplacés par des cases cochées.

**Accueil raccourci au téléphone** (auteur principal) :
- les ateliers « pour plus tard », les leçons éloignées de la leçon en cours et les brevets à venir
  au-delà de 3 sont repliés derrière des boutons « Voir… » ;
- les descriptions des ateliers sont masquées ;
- la page passe de 6 647 px CSS à environ 3 500 px de haut à 390 px de large (mesure du juge ; les
  « 13 600 px » annoncés d'abord étaient des pixels d'écran × 2), et rien ne change sur grand écran.

**Vérifié** :
- 133 tests réussis ;
- 84 captures (360, 390 et 1280 px, en clair, en sombre et au niveau primaire), sans débordement ni
  erreur JavaScript ;
- le site marche en file://.

**Non vérifié** :
- les contrastes, qui n'ont pas été mesurés ;
- un vrai téléphone ;
- les polices du tableau de bord une fois en ligne.

L'interface a été poussée à la demande de l'utilisateur, sans attendre l'avis du juge et donc sans son
approbation. L'avis rendu ensuite (13/11) est dans `AVIS_DU_JUGE.md`.

## 13/11/2026 : corrections de l'interface après l'avis du juge

Fait par l'auteur de l'interface :
- **Brevets** : les brevets obtenus sont des tampons, les autres une liste simple « À gagner ». Les
  libellés ne se chevauchent plus.
- **Niveau** : la puce ouvre le choix du niveau sur l'accueil. Tant que l'élève n'a pas de profil, elle
  affiche « Mon niveau ? ».
- **Contrastes** : tous les cas cités atteignent au moins 4,5:1. Il y a un nouveau jeton
  `--argile-texte`, le bouton passe à #a44c23 en sombre, les ateliers « pour plus tard » ne sont plus
  rendus transparents, et « Tout effacer » passe à #b3261e.
- **Marge** : elle est retirée des onglets « Notions » et « Aller plus loin ».
- **Ton** : plus de compteurs rouges ni de zéros. Un nouvel élève voit une phrase d'accueil, plus aucun
  « 0 sur N » n'apparaît, et au primaire on n'affiche jamais de total.
- **Moins générique** :
  - accueil « Aujourd'hui : … » ;
  - en-tête de TP « TP n : … », suivi d'une phrase ;
  - journée écrite en deux lignes ;
  - niveaux présentés comme une liste de cahier.
- **Mineurs** :
  - symboles ⚠, ⚡, ✓, ✗ et ● remplacés dans les simulations et le contenu, avec un test étendu à ces
    dossiers ;
  - flèches de liaison remplacées par des mots ;
  - numérotation des ateliers sans trous ;
  - focus et lien « Aller au contenu » ;
  - cibles de 44 px ;
  - points gagnés affichés dans la barre d'objectif ;
  - petit test indiquant « question n sur 8 » ;
  - code mort de `jeu.js` retiré ;
  - nouveaux pictogrammes ;
  - `esp-01-blink` ne valide plus l'objectif 1 dès l'ouverture ;
  - définition de « Grandeurs » ajoutée.
- **Écarté** :
  - aligner les lignes du cahier sur l'accueil et les TP, trop fragile ;
  - une case à cocher de 44 px, puisque la ligne cliquable fait déjà 44 px.
- **Vérifié** :
  - 133 tests réussis ;
  - scripts du juge relancés : 178 textes sous le seuil de contraste avant, 0 après ; cibles de moins de
    44 px passées de 374 à 75, sur deux éléments.
- **Non vérifié** : de vrais appareils, un vrai lecteur d'écran, et une nouvelle relecture par le juge.

## 13/11/2026 : déploiement O2switch limité au site

**Contrainte constatée par l'utilisateur** : cPanel n'accepte pas `/` comme répertoire d'un compte FTP.

**Diagnostic de l'auteur**, à partir des captures du gestionnaire de fichiers : le compte s'ouvrait sur
`~/learningspace223.duckdns.org/sc1busu9925`, un sous-dossier public créé par défaut. Les copies faites
par erreur s'y trouvent.

**Décision de l'auteur.**
- Le compte FTP s'ouvre dans le dossier du site, et le déploiement automatique n'envoie que le site
  (`DOSSIER_SITE` = `.`).
- Le serveur du journal se met à jour à la main, ou automatiquement si une variable `DOSSIER_SERVEUR` est
  réglée un jour.
- Garde-fou : `manifest.webmanifest` doit déjà exister dans le dossier du site, sinon rien n'est envoyé.

**Écarté** : déplacer le site et le journal dans un dossier commun (`~/learnspace/site` et
`~/learnspace/journal`) avec une nouvelle racine de domaine. Ce serait plus complet, mais c'est trop de
manipulations dans cPanel pour l'instant.

**Non vérifié** : le premier déploiement avec ce réglage.

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
