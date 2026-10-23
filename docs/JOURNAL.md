# Journal d'utilisation

Le journal dit comment Learn Space est utilisé : appareils actifs, pages et TP consultés, temps passé par page et par exercice, objectifs où les élèves bloquent. Il est **pseudonyme** : chaque appareil reçoit un numéro tiré au hasard, sans nom ni adresse IP. Seul l'administrateur le consulte, sur un tableau de bord protégé par mot de passe.

- Navigateur : `assets/js/journal.js`, réglé par `assets/js/config-journal.js` (chargés par `index.html`, `tp.html`, `carte.html` et `confidentialite.html`).
- Serveur : `serveur/app.js`, Node.js 18, 20 ou 22, **sans dépendance npm** (modules `http`, `crypto`, `fs`, `readline`).
- Information et opposition : `confidentialite.html`.

**Le journal est désactivé tant que `LS.JOURNAL_URL` est vide** (valeur livrée dans `config-journal.js`) : rien n'est alors noté, affiché ni envoyé. Il ne fonctionne jamais quand le site est ouvert depuis le disque (`file://`).

## Avant la mise en ligne (étapes bloquantes)

1. **Remplir le responsable et le contact** dans `confidentialite.html` : toutes les mentions `[À COMPLÉTER …]` et `[À FAIRE VALIDER …]` (responsable, adresse e-mail, durée des journaux et des sauvegardes de l'hébergeur, numéro de formalité).
2. **Formalité auprès de l'APDP** (Autorité de protection des données à caractère personnel du Mali) : la loi n° 2013-015 soumet les traitements de données personnelles à déclaration ou autorisation, en particulier quand ils concernent des mineurs et un transfert hors du Mali (hébergement en France). Faire valider la base légale indiquée (intérêt légitime, avec opposition) avant d'activer le journal.
3. Ne remplir `config-journal.js` qu'après ces deux étapes.

## Ce qui est collecté

| Donnée | Détail |
|---|---|
| Numéro d'appareil | 32 caractères hexadécimaux tirés au hasard dans le navigateur (`crypto.getRandomValues`), gardés dans le `localStorage`, **renouvelés automatiquement au bout de 12 mois** (les événements notés avant partent sous l'ancien numéro, sans relier les deux). L'élève peut aussi en changer depuis `confidentialite.html`. |
| Catégorie d'appareil | téléphone, tablette ou ordinateur ; famille de système ; largeur d'écran arrondie à 50 px. **L'user-agent complet n'est jamais envoyé.** |
| Niveau scolaire | 1 à 4 (primaire, collège, lycée, avancé), ou rien. Jamais l'âge. |
| Événements | `page` ; `temps` (temps actif en ms) ; `tp_debut` (identifiant de la variante de niveau, `id@niveau`, quand le TP en a) ; `tp_fin` ; `objectif` et `question` (numéro, temps depuis l'ouverture du TP) ; `notion` ; `carte_finie`. |
| Heures | l'heure de chaque événement est **arrondie à la minute** et recalée sur l'horloge du serveur (l'appareil envoie son heure d'envoi : une horloge fausse ne fausse pas les dates) ; l'heure de réception est arrondie à l'heure. Les durées restent exactes. |

Le temps actif ne compte que si la page est à l'écran et qu'il y a eu une interaction dans les 60 dernières secondes.

## Le choix d'une collecte active par défaut

La collecte suit le régime de la **mesure d'audience** plutôt que celui du consentement préalable : sans réponse à un bandeau, aucune statistique ne serait disponible pour une grande partie des visites, alors que l'objet du journal est de repérer les exercices où les élèves bloquent. En contrepartie :

- finalité **limitée** à la mesure d'audience et à l'amélioration du site ; aucun usage publicitaire, aucun partage, aucun recoupement ;
- données **pseudonymes et minimales** (pas de nom, pas d'IP enregistrée, pas d'user-agent, pas d'âge, heures à la minute) ;
- **durée limitée** (13 mois après chaque événement ; numéro renouvelé chaque année) ;
- **information** : une ligne non bloquante reste affichée jusqu'au clic sur « Compris », et `confidentialite.html` est liée depuis le pied de page de l'accueil ;
- **opposition** à tout moment dans `confidentialite.html` (la file locale est vidée, plus rien n'est noté).

En France, la CNIL dispense de consentement les traceurs de mesure d'audience qui respectent ces conditions. Au Mali, la loi n° 2013-015 impose l'information, la limitation des finalités et de la durée, la sécurité et le droit d'opposition. **La base légale doit être validée** (voir les étapes bloquantes) : ce document ne remplace pas l'avis de l'APDP.

## Aucune perte

- Chaque événement attend dans le navigateur (`localStorage`, jusqu'à 3 000 événements ; deux tranches de temps de suite sur la même page sont fusionnées). Si le navigateur manque de place, la moitié la plus ancienne est abandonnée.
- Un lot envoyé porte un identifiant ; il reste « en attente » tant que le serveur n'a pas répondu 204. À la fermeture de l'onglet, le lot part avec `fetch` `keepalive` ; si la réponse n'arrive pas, il est renvoyé à la visite suivante, et le serveur le confirme **sans le compter deux fois** (60 jours de mémoire des lots, partagée entre processus par les fichiers `lots/`).
- Sans réseau, les lots attendent ; l'envoi reprend dès que le réseau revient (`online`) ou toutes les 30 s. Si le serveur répond 429 ou 503 (limite ou plafond atteint), le lot est gardé et renvoyé 10 minutes plus tard.
- Entre deux onglets ouverts, l'envoi est réservé à un seul onglet par `navigator.locks` (navigateurs récents) ; sans `navigator.locks`, deux onglets peuvent rarement se disputer la file.
- Limites : si l'élève efface les données de son navigateur, ce qui n'était pas encore parti est perdu.

## Installation sur O2switch avec « Setup Node.js App »

Le site reste statique (copie des fichiers) ; seul le journal tourne en Node.js.

1. **Copier uniquement le site** dans le dossier public (par exemple `public_html/`) : `index.html`, `tp.html`, `carte.html`, `confidentialite.html`, `assets/`, `contenu/`, `sw.js`, `manifest.webmanifest`. **Ne jamais copier `serveur/`, `docs/`, `tests/` ni `.git/` dans `public_html`.** (Par précaution, `serveur/.htaccess` interdit tout accès web si le dossier y était copié par erreur.) Activer le certificat https (AutoSSL).
2. **Copier le serveur hors du dossier public** : `serveur/app.js` et `serveur/config.example.json` dans `/home/<compte>/learnspace-journal/`.
3. **Dossier de données hors du dossier public** : `/home/<compte>/learnspace-donnees`, droits `700` (gestionnaire de fichiers). Le serveur **refuse de démarrer** si le dossier de données ou le fichier de configuration est sous un dossier `public_html`, `www` ou `htdocs`. Les fichiers créés ont les droits `600`.
4. **Mot de passe** : cPanel → « Terminal » (après la commande `source …/activate` affichée en haut de la page « Setup Node.js App », étape 5) :
   ```
   cd ~/learnspace-journal
   node app.js --hacher
   ```
   Taper le mot de passe (rien ne s'affiche), puis Entrée ; copier le résultat (`scrypt$…`). Le mot de passe n'est jamais passé en argument, pour ne pas rester dans l'historique du terminal.
5. **Secret de session** : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, à copier dans `secretSession`. Il signe le cookie de session : sans lui, les sessions ne tiennent ni entre plusieurs processus ni après un redémarrage.
6. **Créer l'application** : cPanel → « Setup Node.js App » → « Create Application » :
   - *Node.js version* : 20 ou 22 (18 fonctionne aussi) ; *Application mode* : Production ;
   - *Application root* : `learnspace-journal` ; *Application startup file* : `app.js` ;
   - *Application URL* : soit **le domaine du site avec le chemin `api`** (journal sur `https://<domaine>/api/journal`, tableau de bord sur `https://<domaine>/api/admin`), soit **un sous-domaine** (`journal.<domaine>`, créé avant dans « Domaines »), sans chemin.
7. **Configuration** : soit `config.json` à côté de `app.js` (copie de `config.example.json`, jamais dans Git), soit des **variables d'environnement** de la même page (« Add Variable »), prioritaires :

   | Variable | Exemple | Rôle |
   |---|---|---|
   | `LS_ORIGINES` | `https://learnspace.exemple.ml` | adresse(s) du site autorisée(s), séparées par des virgules |
   | `LS_DONNEES` | `/home/<compte>/learnspace-donnees` | dossier des données |
   | `LS_ADMIN_HASH` | `scrypt$16384$8$1$…` | hachage du mot de passe |
   | `LS_SECRET_SESSION` | 64 caractères hexadécimaux | signature du cookie de session |
   | `LS_BASE` | `/api` | chemin de l'application ; vide pour un sous-domaine (le serveur accepte les requêtes avec ou sans ce préfixe) |
   | `LS_CHEMIN_ADMIN` | `/admin` | chemin du tableau de bord (peut être changé pour un chemin moins évident) |
   | `LS_CONSERVATION_JOURS` | `395` | durée de conservation |
   | `LS_LIMITE_LOTS`, `LS_LIMITE_IP` | `120`, `600` | lots acceptés par appareil, par adresse, par 10 minutes |
   | `LS_PLAFOND_OCTETS_JOUR`, `LS_PLAFOND_LOTS_JOUR` | `50000000`, `200000` | plafonds globaux par jour (au-delà : 503, rien n'est écrit) |
   | `LS_PLAFOND_DOSSIER` | `2000000000` | taille maximale du dossier de données |

   Le port est fourni par Passenger (`PORT`) : ne pas le fixer.
8. **Redémarrer** l'application (« Restart ») après chaque modification de `app.js`, de `config.json` ou des variables.
9. **Brancher le site** : dans `public_html/assets/js/config-journal.js`, mettre `window.LS.JOURNAL_URL = "/api/journal";` (chemin `/api` du même domaine) ou `"https://journal.<domaine>/journal"` (sous-domaine, avec l'adresse du site dans `LS_ORIGINES`).
10. **Tester** :
    - `https://<domaine>/api/sante` répond `ok` ;
    - ouvrir le site sur un téléphone : la ligne d'information s'affiche ; ouvrir un TP, revenir à l'accueil, attendre 30 s ;
    - ouvrir `…/api/admin`, se connecter : l'appareil et les pages apparaissent ;
    - ouvrir `…/api/admin/diagnostic` (voir ci-dessous) ;
    - vérifier que `learnspace-donnees/evenements/AAAA-MM-JJ.jsonl` existe et ne contient aucune adresse IP ;
    - vérifier que `https://<domaine>/serveur/app.js` renvoie 404 ou 403.

### Vérifier X-Forwarded-For sur place

Le serveur ne fait confiance à `X-Forwarded-For` que si la connexion vient du proxy local (127.0.0.1) et n'en prend que la **dernière entrée**, celle qu'ajoute le proxy (les précédentes peuvent être inventées par le client). Cette adresse ne sert qu'en mémoire (limite par adresse, essais de connexion) et n'est jamais écrite. Pour vérifier le comportement réel d'O2switch : se connecter au tableau de bord et ouvrir `…/admin/diagnostic`. La page indique si la connexion directe est locale, si l'en-tête est présent, combien d'entrées il contient et le début de la dernière (`41.73.x.x`). Comparer avec le début de son adresse publique. Si la dernière entrée n'est pas l'adresse du client (proxy en chaîne), la limite par adresse vise le proxy : baisser alors son effet en relevant `LS_LIMITE_IP` ; la limite par appareil et les plafonds continuent de protéger le disque. Rien de cette page n'est enregistré.

## Sécurité du serveur

- **Validation stricte** : lots de 128 Ko et 300 événements au plus, liste fermée d'événements, de champs et de valeurs ; ce qui ne correspond pas est ignoré ; un lot illisible ou une adresse mal encodée est refusé (400).
- **CORS** : seules les origines configurées (et le domaine du serveur) peuvent envoyer ; les autres reçoivent 403.
- **Débit et disque** : limite par appareil et par adresse (mémoire) ; plafonds globaux par jour (octets, lots) et pour le dossier entier, lus sur le disque (valables pour tous les processus) : au-delà, réponse 503 sans rien écrire, et le client garde ses lots.
- **Tableau de bord** : mot de passe haché avec scrypt ; un hachage absent ou d'exemple est détecté comme « non configuré » ; cookie de session **signé HMAC** (expiration de 2 h incluse dans le cookie, identique au `Max-Age`), `HttpOnly`, `Secure`, `SameSite=Strict` ; jeton CSRF dérivé de la session sur tous les formulaires ; essais ratés comptés **par adresse** (en mémoire) avec un délai croissant à partir du 3e (2 s, 4 s, 8 s… jusqu'à 15 min), sans blocage global ; en-têtes CSP, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` (avec `no-referrer`, Chromium envoie `Origin: null` sur les formulaires, qui seraient refusés), HSTS.
- **Lecture en flux** : le tableau de bord lit les fichiers ligne à ligne (`readline`) et l'export CSV est diffusé au fil de la lecture. Les cellules commençant par `=`, `+`, `-` ou `@` sont préfixées d'une apostrophe (pas de formule exécutée par un tableur).
- **Purge** : au démarrage puis chaque jour, selon la **date de chaque événement** (pas seulement le jour de réception) ; le tableau de bord permet aussi de purger, d'exporter ou d'effacer les données d'un appareil (demande d'accès ou d'effacement).

### Limites connues (plusieurs processus)

Passenger peut lancer plusieurs processus. Ce qui est partagé par le disque : les données, le dédoublonnage des lots (fichiers `lots/`, relus quand un lot inconnu arrive), les plafonds, la session (cookie signé). Ce qui reste propre à chaque processus : les limites de débit (chacun compte de son côté, la limite réelle peut donc être multipliée par le nombre de processus), les délais après essais ratés, et la révocation à la déconnexion (le cookie est effacé du navigateur, mais une copie volée resterait valable dans un autre processus jusqu'à son expiration, 2 h au plus). Deux processus recevant le même lot à la même milliseconde pourraient l'écrire deux fois. Un effacement d'appareil réécrit les fichiers : un lot reçu au même instant par un autre processus pourrait être perdu.

## Ce qu'il faut savoir sur l'hébergeur

- **Journaux bruts** : le serveur web d'O2switch garde ses propres journaux d'accès avec l'adresse IP de chaque visite (« Raw Access », AWStats, « Visiteurs » de cPanel). Ce n'est pas notre journal, mais c'est une donnée personnelle : désactiver dans cPanel l'archivage des journaux bruts et les statistiques inutilisées, demander au support la durée de conservation et l'indiquer dans `confidentialite.html`.
- **Sauvegardes JetBackup** : O2switch sauvegarde le compte (dossier de données compris) et garde ces sauvegardes un certain temps (à vérifier dans cPanel → JetBackup). Une donnée purgée ou effacée à la demande d'un élève reste dans les sauvegardes jusqu'à leur expiration : indiquer cette durée dans `confidentialite.html`.
- **Sous-traitant et transfert** : O2switch héberge en France ; les données quittent donc le Mali. C'est écrit dans `confidentialite.html` et fait partie de la formalité APDP.

## Format des données

`evenements/AAAA-MM-JJ.jsonl` (jour de réception), une ligne JSON par lot reçu :

```
{ "lot": "…32 hex…", "a": "…numéro d'appareil…", "r": 1792800000,   // réception, arrondie à l'heure (s)
  "type": "telephone", "os": "android", "largeur": 400, "niveau": 1,
  "evs": [ { "t": 1792799940, "e": "page", "p": "tp", "c": "elec-06-led" },
           { "t": …, "e": "tp_debut", "c": "elec-06-led@1" },
           { "t": …, "e": "temps", "p": "tp", "c": "elec-06-led", "ms": 12000 },
           { "t": …, "e": "objectif", "c": "elec-06-led@1", "i": 0, "ms": 30000 },
           { "t": …, "e": "notion", "c": "elec-bases/loi-d-ohm" } ] }
```

`lots/AAAA-MM-JJ.txt` : un identifiant de lot par ligne (aucune donnée personnelle), gardé 60 jours.

Le tableau de bord recalcule les agrégats à la lecture (cache d'une minute). Les appareils actifs sur 24 h, 7 et 30 jours ne dépendent pas de la période choisie. Les TP et les objectifs sont comptés **par variante de niveau** : le taux d'un objectif est le nombre d'appareils qui l'ont atteint rapporté au nombre d'appareils qui ont ouvert la même variante.

## Ce qui manque encore

Les mauvaises réponses aux questions et aux objectifs à saisir ne sont pas notées : le jeu n'émet un événement que pour une réussite. Pour savoir où les élèves se trompent, `assets/js/tp.js` pourrait émettre un événement (par exemple `ls:essai` avec le TP, l'objectif ou la question, et juste ou faux) ; `journal.js` n'aurait qu'à l'écouter.

## Tests

`tests/journal.test.js` :

- **fonctions du navigateur** : catégorie d'appareil, file bornée, fusion des tranches de temps, renvoi du même lot, temps actif, renouvellement du numéro ;
- **client complet** dans un navigateur simulé (`document`, `fetch`, `visibilitychange`, `localStorage`) :
  - désactivé sans adresse et en `file://` ;
  - envoi keepalive à la fermeture, lot gardé puis renvoyé avec le même identifiant ;
  - 503 qui garde le lot ;
  - opposition ;
  - renouvellement sans mélange des numéros ;
  - quota du navigateur ;
- **service worker** : `/api`, `/admin` et `/journal` jamais mis en cache ; fichiers du journal en cache de base ;
- **serveur**, sur un port au hasard, avec un ou deux processus sur le même dossier :
  - lot accepté, et lot renvoyé jamais recompté, même par l'autre processus ;
  - horloge recalée, heures arrondies ;
  - lots refusés : invalide, adresse mal encodée, autre site ;
  - CORS ;
  - limites par appareil et par dernière entrée de X-Forwarded-For, plafond du jour (503) ;
  - aucune IP ni user-agent dans les fichiers, droits 600 ;
  - tableau de bord refusé sans session, délai après trois échecs limité à une adresse ;
  - cookie (`HttpOnly`, `Secure`, `SameSite=Strict`) valable dans l'autre processus, HSTS ;
  - taux par variante, diagnostic sans adresse complète, CSV avec apostrophe ;
  - CSRF, purge par date d'événement, export et effacement d'un appareil, tout effacer, déconnexion ;
  - hachage d'exemple détecté, refus de démarrer dans `public_html`.
