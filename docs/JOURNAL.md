# Journal d'utilisation (statistiques agrégées et minimisées)

Le journal dit comment Learn Space est utilisé :
- visites, pages vues, temps passé ;
- TP ouverts et terminés ;
- **où les élèves se trompent** (essais ratés aux objectifs, réponses fausses aux questions).

Il est conçu pour ne pas savoir qui l'utilise. Le serveur reçoit des événements **sans identifiant** et n'en garde que des **totaux par jour**. Le tableau de bord ne montre que des jours clos et masque tout nombre inférieur à un seuil (k = 5).

Ce n'est pas une promesse d'anonymat absolu : à la réception, le serveur voit techniquement l'adresse IP, comme tout site, et l'hébergeur garde ses propres journaux d'accès (voir plus bas). Les mesures ci-dessous servent à rendre le rapprochement aussi difficile que possible.

- Navigateur : `assets/js/journal.js`, réglé par `assets/js/config-journal.js`. `assets/js/tp.js` émet `ls:essai` (chaque réponse) et `ls:reussite` (chaque objectif réussi). Les simulations (`outils-sim.js`, `editeur.js`) signalent quand elles sont **en marche** (`LS.derniereSimEnMarche`) : seul ce signal, pas une animation de dessin, compte comme activité sans geste, 3 min au plus après le dernier geste.
- Chargement : `commun.js` charge `empreinte-contenu.js`, `config-journal.js` puis `journal.js` **après** la page (événement `load`), dans cet ordre. Un réseau qui ne répond pas ne retarde jamais l'affichage. Une nouvelle adresse dans `config-journal.js` prend effet à la page suivante (le service worker sert la copie en cache et la met à jour en arrière-plan).
- Serveur : `serveur/app.js` (Node.js 18, 20 ou 22, sans dépendance npm) et `serveur/liste-blanche.json`, généré.
- Information et refus : `confidentialite.html`.

**Le journal est désactivé** dans trois cas : tant que `LS.JOURNAL_URL` est vide, en `file://`, et quand le navigateur envoie **Global Privacy Control** (traité comme un refus).

## Avant la mise en ligne (étapes bloquantes)

1. Remplir toutes les mentions `[À COMPLÉTER …]` de `confidentialite.html` : responsable, contact, durée des journaux et des sauvegardes de l'hébergeur, réponse de l'APDP.
2. Faire confirmer par l'APDP la base légale indiquée : intérêt légitime, mesure d'audience minimisée, droit de refus.
3. Ne remplir `config-journal.js` qu'après.

## Ce qui reste sur l'appareil (jamais envoyé)

| Où | Quoi |
|---|---|
| `sessionStorage` | un **numéro de visite** aléatoire et l'état de la visite : dernière activité, temps actif, TP, objectifs et fins de TP déjà comptés. Perdu à la fermeture de l'onglet ; renouvelé après 30 min sans activité. Jamais envoyé ni écrit en `localStorage`. |
| `localStorage` | la **date de dernière visite** (au jour) et sa **date de création**. Elles sont effacées 13 mois après la création, sans prolongation, même pour un élève qui revient souvent. Seule la catégorie part. |
| `localStorage` | l'opposition, « information lue », la file des événements pas encore envoyés (sans identifiant). |

## Ce qui est envoyé

Le navigateur envoie des lots `{ v: 2, lot, envoi, evs }` :
- `lot` est un identifiant aléatoire du lot, pour ne pas compter deux fois un lot renvoyé ;
- `envoi` est l'heure d'envoi de l'appareil, qui sert à recaler une horloge fausse.

Les événements possibles :

| Événement | Contenu |
|---|---|
| `visite` | une fois par visite. Catégorie de retour (`meme_jour`, `moins7`, `7a30`, `plus30`, `premiere`), niveau (1 à 4 ou rien), type d'appareil, système, tranche de largeur d'écran. Une combinaison type + système rare devient « autre ». |
| `page`, `temps` | page ouverte ; temps actif (page à l'écran, et geste depuis moins de 60 s, ou simulation qui s'anime moins de 10 min après le dernier geste) |
| `palier` | la visite a dépassé 1, 5, 15, 30 ou 60 min de temps actif |
| `tp_debut`, `tp_fin` | TP ouvert ; TP terminé pendant la visite. **Une fois par visite**, sous la variante de niveau `id@niveau` |
| `objectif` | objectif réussi pendant la visite, **une fois par visite** (même unité que `tp_debut`) |
| `essai` | une réponse à un objectif à réponse écrite (`o`) ou à une question (`q`), juste ou fausse |
| `notion`, `carte_finie` | notion comprise, carte terminée (une fois par navigateur, comme les gains du jeu) |

## Ce que le serveur garde

- `agregats/AAAA-MM-JJ.json` : les **totaux du jour de réception**.
  - Tous les événements d'un lot vont au jour où il est reçu, même s'ils ont été gardés hors ligne plusieurs jours. Un jour clos ne change donc plus jamais : impossible de voir l'effet d'un lot arrivé en retard.
  - Le fichier contient : visites par retour, niveau, type, système, largeur (répartitions séparées, sans croisement) ; paliers de durée ; vues et temps par page ; ouvertures et fins par TP ; réussites, essais et essais ratés par objectif ; réponses justes et fausses par question ; notions et cartes.
- `agregats/mois-AAAA-MM.json` : le **profil horaire** des visites, au mois (UTC, l'heure de Bamako). Il n'y a pas de tranche horaire par jour.
- `lots/AAAA-MM-JJ.txt` : les identifiants aléatoires des lots reçus. Ils ne sont liés à rien d'autre et sont effacés après 31 jours.

Rien d'autre n'est écrit : aucune ligne brute, aucun horodatage d'événement, aucun identifiant, aucune adresse IP.

**Liste blanche.** `serveur/liste-blanche.json` est généré par `node outils/liste-precache.js` depuis `contenu/`. Il contient les TP (et leurs variantes), le nombre d'objectifs et de questions de chacun, les cartes, les notions et les pages. Un identifiant inconnu est ignoré : impossible de remplir les totaux avec des clés inventées. Il faut le régénérer et le recopier sur le serveur à chaque ajout de contenu.
- Le serveur **relit la liste dès qu'elle change** (date de modification vérifiée toutes les 5 s) : la recopier suffit, sans redémarrer.
- Le site envoie avec chaque lot l'empreinte de son contenu (`assets/js/empreinte-contenu.js`, générée avec la liste). Si elle diffère de celle du serveur, ou si des événements sont refusés pour identifiant inconnu, le tableau de bord affiche une **alerte** (7 derniers jours). C'est le signe qu'il faut recopier `serveur/liste-blanche.json`.
- En recopiant le site, **ne pas écraser `assets/js/config-journal.js`** : il contient l'adresse du journal.

**Conservation** : totaux gardés **25 mois** (760 jours, réglable), puis effacés. Au démarrage, tout reste de données brutes d'une version précédente (`evenements/`) est effacé.

## Seuil k et jours clos (contre le rapprochement)

À faible trafic, un total du jour peut ne décrire qu'une seule visite. Trois règles limitent ce risque.

- Le tableau de bord et le CSV ne montrent **que des jours clos** (hier au plus tard), jamais le jour en cours. Ils ne permettent donc pas de voir chaque lot arriver par différence.
- **Seuil k** (`seuilK`, 5 par défaut) : toute case inférieure à k est affichée « < 5 ». Une ligne dont le compte principal est sous k n'est pas montrée : sa présence dirait déjà qu'une visite a ouvert cette page. Les parts en % ne sont calculées que si le numérateur et le dénominateur atteignent k. Cela vaut pour les tableaux, les répartitions, le CSV et les cumuls d'une période.
- **Profil horaire au mois** seulement, avec le même seuil.

Limites connues :
- comparer deux périodes qui se recouvrent (7 et 8 jours), ou combiner plusieurs cases d'un même tableau, peut encore faire déduire un petit nombre ;
- le fichier du jour en cours, sur le disque, est mis à jour à chaque lot : l'administrateur ne doit pas l'examiner à la main.

## Le choix d'une collecte sans consentement préalable

La base légale proposée est l'**intérêt légitime** : mesure d'audience d'un service éducatif gratuit, avec des statistiques agrégées et minimisées. En contrepartie :
- pas d'identifiant persistant, pas d'IP enregistrée, pas d'heure précise, catégories grossières, seuil k ;
- l'information reste affichée jusqu'au clic sur « Compris » ;
- le **refus** est possible à tout moment dans `confidentialite.html`, et Global Privacy Control est respecté.

**À faire confirmer par l'APDP** avant la mise en ligne.

## Aucune perte

- Les événements attendent dans le navigateur (3 000 au plus ; la moitié la plus ancienne part si le navigateur manque de place).
- Un lot reste en attente tant que le serveur n'a pas répondu 204 ; il est renvoyé, et le serveur ne le compte pas deux fois.
- En cas de 429 ou de 503, le lot est gardé et renvoyé 10 minutes plus tard.
- Un fichier de totaux illisible n'est jamais écrasé : il est mis en quarantaine (`.corrompu-<date>`, signalé sur le tableau de bord), le lot reçoit 503 et sera renvoyé.

## Installation sur O2switch avec « Setup Node.js App »

1. **Copier le site** dans `public_html/` : les pages `*.html`, `assets/`, `contenu/`, `manifest.webmanifest`, puis **en dernier** `sw-fichiers.js` et `sw.js` (voir `docs/APPLICATION.md`).
   - **Ne jamais copier `serveur/`, `docs/`, `tests/`, `outils/` ni `.git/` dans `public_html`.** Par précaution, `serveur/.htaccess` interdit tout accès web.
2. **Copier le serveur hors du dossier public** : `serveur/app.js`, `serveur/liste-blanche.json` et `serveur/config.example.json` dans `/home/<compte>/learnspace-journal/`.
3. **Dossier de données** : `/home/<compte>/learnspace-donnees`, droits `700`. Le serveur refuse de démarrer si les données ou la configuration sont sous `public_html`, `www` ou `htdocs`.
4. **Mot de passe** : dans le Terminal de cPanel, après la commande `source …/activate` affichée par « Setup Node.js App » :
   ```
   cd ~/learnspace-journal
   node app.js --hacher
   ```
   Taper le mot de passe, puis Entrée, et copier le résultat dans `adminHash`. Tant que `adminHash` n'est pas valable, le tableau de bord reste fermé : aucune session n'est possible.
5. **Secret de session** : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, dans `secretSession`. **Le serveur refuse de démarrer** si ce secret n'est pas fait d'au moins 64 caractères hexadécimaux tirés au hasard (moins de 12 caractères différents, une suite de 6 caractères identiques ou un motif court répété sont refusés). Le texte d'exemple est refusé, car il permettrait de fabriquer un cookie d'administrateur.
6. **Créer l'application** dans « Setup Node.js App » : version 20 ou 22, mode Production, *Application root* `learnspace-journal`, fichier `app.js`. *Application URL* : le domaine avec le chemin `api`, ou un sous-domaine.
7. **Configuration** : `config.json` à côté de `app.js` (jamais dans Git), ou des variables d'environnement, prioritaires :

   | Variable | Défaut | Rôle |
   |---|---|---|
   | `LS_ORIGINES` | | adresse(s) du site autorisée(s) |
   | `LS_DONNEES` | `serveur/donnees` | dossier des données |
   | `LS_LISTE_BLANCHE` | `liste-blanche.json` à côté de `app.js` | identifiants acceptés |
   | `LS_ADMIN_HASH`, `LS_SECRET_SESSION` | | mot de passe haché, secret de session |
   | `LS_BASE`, `LS_CHEMIN_ADMIN` | `""`, `/admin` | chemins |
   | `LS_SEUIL_K` | `5` | seuil de masquage |
   | `LS_CONSERVATION_JOURS` | `760` | conservation des totaux |
   | `LS_LIMITE_LOTS`, `LS_PLAFOND_IP_JOUR` | `600`, `3000` | lots par adresse (ou par /64 en IPv6), par 10 min et par jour |
   | `LS_PLAFOND_OCTETS_IP_JOUR` | 15 Mo | octets d'événements validés par adresse et par jour (une seule adresse ne peut pas épuiser le plafond global) |
   | `LS_PLAFOND_OCTETS_JOUR`, `LS_PLAFOND_LOTS_JOUR`, `LS_PLAFOND_DOSSIER` | 50 Mo, 200 000, 2 Go | plafonds globaux |

8. **Redémarrer** l'application après chaque modification.
9. **Brancher le site** : dans `public_html/assets/js/config-journal.js`, écrire `window.LS.JOURNAL_URL = "/api/journal";`. Le journal est chargé après la page, et le service worker sert la copie en cache de ce fichier sans attendre le réseau : une nouvelle adresse prend effet à la page suivante.
10. **Tester** :
    - `…/api/sante` répond `ok` ;
    - ouvrir le site sur un téléphone, ouvrir un TP, se tromper à une question ;
    - **le lendemain**, ouvrir `…/api/admin` ;
    - ouvrir `…/api/admin/diagnostic`.

### X-Forwarded-For

Le serveur ne fait confiance à `X-Forwarded-For` que si la connexion vient du proxy local. Il n'en prend que la dernière entrée et compte l'IPv6 par /64. L'adresse sert en mémoire, et seulement à deux choses : la limite de débit (par 10 min et par jour) et le délai après des essais de connexion ratés.

**Si X-Forwarded-For est absent derrière le proxy**, tous les clients semblent avoir la même adresse. Les mécanismes par adresse sont alors **désactivés** : pas de limite par adresse, pas de délai après échecs de connexion. Restent les plafonds globaux et le coût de scrypt. `…/admin/diagnostic` l'affiche en alerte.

## Sécurité du serveur

- **Démarrage refusé** dans trois cas : secret de session invalide, liste blanche illisible, données ou configuration sous `public_html`.
- **Validation** : liste blanche ; corps de **16 Ko** et 300 événements par lot au plus ; **champ inconnu refusé** (400) ; indices d'objectifs et de questions bornés par le contenu ; tranche de temps de 30 min au plus, durée jusqu'à un objectif de 6 h au plus. Les plafonds comptent la taille des **événements validés**, pas celle du corps reçu.
- **Événements anciens** : un événement gardé longtemps hors ligne est accepté (il va au jour de réception). Seul le dédoublonnage des lots est limité à 31 jours.
- **Premières réussites** : à l'ouverture d'un TP, le site envoie les objectifs déjà réussis sur cet appareil (`faits`) et si le TP était déjà terminé (`deja`). Les taux du tableau de bord portent sur les ouvertures sans réussite antérieure.
- **Fichiers** : un fichier de totaux illisible ou de forme inattendue est mis en quarantaine (`.corrompu-<date>`). La quarantaine est purgée selon la même conservation que les totaux, et par « Tout effacer » ; les fichiers temporaires abandonnés (plus d'une heure) sont purgés.
- **Verrou** : un verrou abandonné est repris en le renommant vers un nom unique (une seule reprise gagne) ; si un autre processus venait de le prendre, il est remis en place.
- Les totaux sont des objets sans prototype : une clé comme `constructor` reste une clé ordinaire.
- **Verrou entre processus** : fichier `.verrou` contenant un jeton. L'attente est asynchrone. Seul le propriétaire du jeton retire le verrou ; un verrou abandonné plus de 10 s est repris. La purge passe aussi sous verrou.
- **Tableau de bord** :
  - scrypt asynchrone ;
  - cookie signé HMAC (2 h), `HttpOnly`, `Secure`, `SameSite=Strict` ;
  - jeton CSRF sur les formulaires ;
  - délai croissant après échecs, par adresse ;
  - en-têtes CSP, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, HSTS.
- **Export CSV** : les totaux de chaque jour clos et de la période, avec le seuil k ; apostrophe devant `=`, `+`, `-` et `@`.

### Plusieurs processus

- **Partagé par le disque** : les totaux (sous verrou), le dédoublonnage des lots, les plafonds globaux, la session.
- **Propre à chaque processus** : les limites par adresse, les délais après échecs et la révocation à la déconnexion (2 h au plus).

## Hébergeur

- **Journaux d'accès d'O2switch** : ils gardent l'adresse IP, l'heure et l'URL demandée, y compris `tp.html?id=…`. À faible trafic, ils pourraient être rapprochés des totaux. C'est la raison des jours clos et du seuil k.
  - Désactiver dans cPanel l'archivage des journaux bruts.
  - Demander au support leur durée de conservation, puis l'indiquer dans `confidentialite.html`.
- **Sauvegardes JetBackup** : les totaux y restent jusqu'à expiration.
- **Hébergement en France**.

## Tests

`tests/journal.test.js` et `tests/journal-defense.test.js` couvrent le navigateur (client simulé) et le serveur ; `tests/navigateur.test.js` et `tests/tp-quiz.test.js` passent par un vrai navigateur (Chromium, Playwright) : réussites émises par le vrai `tp.js`, signal « simulation en marche », Global Privacy Control, chargement sans attente, mise à jour de l'application.

**Ces tests navigateur sont sautés quand Chromium manque, donc en CI** (la CI n'installe pas Playwright : le site lui-même ne dépend d'aucun paquet npm). Ils se lancent sur une machine où Playwright et Chromium sont installés.

**Navigateur** : fonctions pures et client complet simulé :
- aucun identifiant envoyé ;
- visite en `sessionStorage` ;
- retour « même jour » ;
- date de dernière visite effacée après 13 mois ;
- Global Privacy Control ;
- objectifs et fins de TP comptés une fois par visite ;
- temps compté seulement quand la simulation est en marche (3 min au plus après le dernier geste).

**Serveur** :
- refus de démarrer avec `config.example.json` tel quel ;
- aucune session sans `adminHash` valable ;
- liste blanche (clés inventées, `constructor`, indices hors limites refusés) ;
- attaque sur 31 jours rangée au seul jour de réception ;
- jour en cours invisible et seuil k (tableau et CSV) ;
- quarantaine d'un fichier illisible ;
- verrou orphelin repris ;
- deux processus sans perte ;
- plafonds et dernière entrée de X-Forwarded-For ;
- IPv6 compté par /64 ;
- bourrage (champs inconnus, 16 Ko, octets validés, plafond par adresse, `ms` borné) ;
- liste blanche relue, rejets et version du site signalés ;
- premières réussites ;
- forme inattendue et quarantaine purgée ;
- secret sans hasard refusé ;
- course sur la reprise du verrou.
