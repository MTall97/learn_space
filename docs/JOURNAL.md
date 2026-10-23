# Journal d'utilisation

Le journal dit comment Learn Space est utilisé : appareils actifs, pages et TP consultés, temps passé par page et par exercice, objectifs où les élèves bloquent. Il est **pseudonyme** : chaque appareil reçoit un numéro tiré au hasard, sans nom ni adresse IP. Seul l'administrateur le consulte, sur un tableau de bord protégé par mot de passe.

- Navigateur : `assets/js/journal.js` (chargé par `index.html`, `tp.html`, `carte.html`, `confidentialite.html`).
- Serveur : `serveur/app.js`, Node.js 18, 20 ou 22, **sans dépendance npm** (modules `http`, `crypto`, `fs`).
- Information et opposition : `confidentialite.html`.

## Ce qui est collecté

| Donnée | Détail |
|---|---|
| Numéro d'appareil | 32 caractères hexadécimaux tirés au hasard dans le navigateur (`crypto.getRandomValues`), gardés dans le `localStorage`. L'élève peut le régénérer depuis `confidentialite.html`. |
| Catégorie d'appareil | téléphone, tablette ou ordinateur ; famille de système (android, ios, windows, macos, linux, chromeos, autre) ; largeur d'écran arrondie à 50 px. **L'user-agent complet n'est jamais envoyé.** |
| Niveau scolaire | 1 à 4 (primaire, collège, lycée, avancé), ou rien. Jamais l'âge. |
| Événements | `page` (type et identifiant de la page) ; `temps` (temps actif en ms, par tranches) ; `tp_debut` ; `tp_fin` (durée depuis l'ouverture) ; `objectif` et `question` (numéro, temps depuis l'ouverture du TP) ; `notion` (notion comprise) ; `carte_finie`. |

Le temps actif ne compte que si la page est à l'écran et qu'il y a eu une interaction (toucher, clavier, défilement) dans les 60 dernières secondes.

## Pourquoi la collecte est active par défaut

L'administrateur veut que **tous** les journaux lui parviennent. Un bandeau qui demande l'accord avant toute collecte en perd une grande partie (beaucoup d'enfants touchent « Refuser » ou ignorent le bandeau). Le choix retenu suit le régime de la **mesure d'audience** :

- la collecte sert **uniquement** à mesurer l'audience et à améliorer le site (pages vues, temps, réussite des exercices) ; aucun usage publicitaire, aucun partage, aucun recoupement avec d'autres sites ;
- elle est **pseudonyme** et **minimale** (pas de nom, pas d'IP enregistrée, pas d'user-agent, pas d'âge exact) ;
- elle est **limitée dans le temps** (13 mois) ;
- l'élève ou son parent est **informé** (une ligne discrète au premier passage, qui disparaît après 15 s, et la page `confidentialite.html` liée en pied de page) et peut **s'y opposer** à tout moment dans `confidentialite.html` : la file locale est alors vidée et plus rien n'est noté sur l'appareil.

En France, la CNIL dispense de consentement les traceurs de mesure d'audience qui respectent ces conditions (finalité strictement limitée, données non recoupées, durée limitée, droit d'opposition). La loi malienne n° 2013-015 du 21 mai 2013 impose l'information des personnes, la limitation des finalités et de la durée, la sécurité des données et le droit d'opposition. Ce dispositif est conçu pour respecter ces règles ; il ne remplace pas l'avis de l'APDP (Autorité de protection des données à caractère personnel du Mali) : selon le nombre d'utilisateurs, une déclaration auprès d'elle peut être nécessaire.

## Aucune perte

- Chaque événement attend dans le navigateur (`localStorage`, jusqu'à 5 000 événements, soit des semaines hors ligne).
- Un lot envoyé porte un identifiant ; il reste « en attente » tant que le serveur n'a pas répondu 204. À la fermeture de l'onglet, le lot part avec `fetch` `keepalive` et reste en attente : il sera renvoyé à la visite suivante, et le serveur, qui garde la trace des lots reçus, le confirme **sans le compter deux fois**.
- Sans réseau (délestage, forfait épuisé), les lots attendent ; l'envoi reprend dès que le réseau revient (`online`) ou toutes les 30 s.
- Limites : au-delà de 5 000 événements en attente, les plus anciens sont abandonnés ; si l'élève efface les données de son navigateur, ce qui n'était pas encore parti est perdu ; deux onglets ouverts en même temps peuvent, rarement, se disputer la file et perdre un événement.

## Installation sur O2switch avec « Setup Node.js App »

Le site reste statique (copie des fichiers) ; seul le journal tourne en Node.js.

1. **Copier le site** dans le dossier public du domaine (par exemple `public_html/`) : `index.html`, `tp.html`, `carte.html`, `confidentialite.html`, `assets/`, `contenu/`, `sw.js`, `manifest.webmanifest`. Activer le certificat https (AutoSSL de cPanel).
2. **Copier le serveur hors du dossier public** : `serveur/app.js` dans `/home/<compte>/learnspace-journal/app.js` (avec `config.example.json`).
3. **Dossier de données hors du dossier public** : créer `/home/<compte>/learnspace-donnees` avec le gestionnaire de fichiers, droits `700`. Les fichiers créés par le serveur ont les droits `600`.
4. **Mot de passe** : dans cPanel, « Terminal » :
   ```
   cd ~/learnspace-journal
   node app.js --hacher "un mot de passe long"
   ```
   (si `node` n'est pas trouvé, utiliser la commande `source …/activate` affichée en haut de la page « Setup Node.js App » de l'application, voir étape 5). Copier le résultat (`scrypt$…`).
5. **Créer l'application** : cPanel → « Setup Node.js App » → « Create Application » :
   - *Node.js version* : 20 ou 22 (18 fonctionne aussi) ;
   - *Application mode* : Production ;
   - *Application root* : `learnspace-journal` ;
   - *Application URL* : deux possibilités :
     - **chemin du même domaine** : domaine du site et chemin `api` (le journal répond alors sur `https://<domaine>/api/journal`, le tableau de bord sur `https://<domaine>/api/admin`) ;
     - **sous-domaine** : par exemple `journal.<domaine>` (créé avant dans « Domaines »), sans chemin ;
   - *Application startup file* : `app.js`.
6. **Configuration** : soit un fichier `config.json` à côté de `app.js` (copie de `config.example.json`, non suivi par Git), soit des **variables d'environnement** dans la même page (« Add Variable »), qui ont priorité :

   | Variable | Exemple | Rôle |
   |---|---|---|
   | `LS_ORIGINES` | `https://learnspace.exemple.ml` | adresse(s) du site autorisée(s) à envoyer, séparées par des virgules |
   | `LS_DONNEES` | `/home/<compte>/learnspace-donnees` | dossier des données |
   | `LS_ADMIN_HASH` | `scrypt$16384$8$1$…` | hachage du mot de passe |
   | `LS_BASE` | `/api` | chemin de l'application ; vide pour un sous-domaine |
   | `LS_CONSERVATION_JOURS` | `395` | durée de conservation |
   | `LS_LIMITE_LOTS` | `120` | lots acceptés par appareil et par 10 minutes |

   Le port est fourni par Passenger (`PORT`) : ne pas le fixer.
7. **Redémarrer** l'application (bouton « Restart ») après chaque modification de `app.js`, de `config.json` ou des variables.
8. **Pointer le site vers l'API** : en tête de `assets/js/journal.js`, la valeur par défaut est `LS.JOURNAL_URL = "/api/journal"`, qui convient au cas « chemin `/api` du même domaine ». Pour un sous-domaine, remplacer par `"https://journal.<domaine>/journal"` (et mettre l'adresse du site dans `LS_ORIGINES`). On peut aussi la définir dans une page avant le script : `<script>window.LS = { JOURNAL_URL: "…" };</script>`.
9. **Tester** :
   - `https://<domaine>/api/sante` (ou `https://journal.<domaine>/sante`) répond `ok` ;
   - ouvrir le site sur un téléphone, ouvrir un TP, revenir à l'accueil, attendre 30 s ;
   - ouvrir `…/admin`, se connecter : l'appareil et les pages doivent apparaître ;
   - dans le gestionnaire de fichiers, vérifier que `learnspace-donnees/evenements/AAAA-MM-JJ.jsonl` existe et ne contient aucune adresse IP.
10. **Sauvegarde** : le dossier `learnspace-donnees` est sauvegardé par JetBackup avec le reste du compte.

## Sécurité du serveur

- Validation stricte : lots de 128 Ko et 300 événements au plus, liste fermée d'événements, de champs et de valeurs ; ce qui ne correspond pas est ignoré, un lot illisible est refusé (400).
- CORS : seules les origines configurées (et le domaine du serveur lui-même) peuvent envoyer ; les autres reçoivent 403.
- Aucune adresse IP n'est écrite. L'en-tête `X-Forwarded-For` (posé par le proxy d'O2switch) ne sert qu'à une limite de débit gardée **en mémoire** quelques minutes (empreinte tronquée, jamais écrite) ; la limite principale est par numéro d'appareil.
- Tableau de bord : mot de passe haché avec scrypt (`node:crypto`), session par cookie `HttpOnly`, `Secure`, `SameSite=Strict`, expirant après 2 h d'inactivité ; jeton CSRF sur les formulaires (déconnexion, purge) ; blocage 15 minutes après 10 essais ratés ; en-têtes `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. Les sessions sont en mémoire : un redémarrage de l'application oblige à se reconnecter.
- Purge : les fichiers de plus de 13 mois sont effacés au démarrage puis chaque jour ; le tableau de bord permet aussi de purger.

## Ce qu'il faut savoir sur les journaux d'O2switch

Le serveur web d'O2switch garde, comme tout hébergeur, ses propres journaux d'accès avec l'adresse IP de chaque visite (« Raw Access », AWStats, « Visiteurs » de cPanel), en général quelques jours à quelques semaines. Ce n'est pas notre journal, mais c'est une donnée personnelle : désactive dans cPanel l'archivage des journaux bruts et les statistiques que tu n'utilises pas, et demande au support d'O2switch la durée de conservation de ces journaux.

## Format des données

Un fichier par jour de réception, `evenements/AAAA-MM-JJ.jsonl`, une ligne JSON par lot reçu :

```
{ "lot": "…32 hex…", "a": "…numéro d'appareil…", "r": 1792800000,   // réception (s)
  "type": "telephone", "os": "android", "largeur": 400, "niveau": 1,
  "evs": [ { "t": 1792799990, "e": "page", "p": "tp", "c": "elec-06-led" },
           { "t": …, "e": "temps", "p": "tp", "c": "elec-06-led", "ms": 12000 },
           { "t": …, "e": "objectif", "c": "elec-06-led", "i": 0, "ms": 30000 },
           { "t": …, "e": "notion", "c": "elec-bases/loi-d-ohm" } ] }
```

`c` vaut l'identifiant de la page ou du TP (éventuellement `id@niveau` pour un TP à variantes), ou `carte/notion`. Le tableau de bord recalcule les agrégats à la lecture (cache d'une minute) et exporte les événements en CSV (`;`, UTF-8).

## Ce qui manque encore

Les mauvaises réponses aux questions et aux objectifs à saisir ne sont pas notées : le jeu n'émet un événement que pour une réussite. Pour savoir où les élèves se trompent, `assets/js/tp.js` pourrait émettre un événement (par exemple `ls:essai` avec le TP, l'objectif ou la question, et juste ou faux) ; `journal.js` n'aurait qu'à l'écouter.

## Tests

`tests/journal.test.js` vérifie les fonctions du navigateur (catégorie d'appareil, file bornée, opposition, renvoi du même lot, temps actif) et lance le serveur Node sur un port au hasard : lot accepté, lot renvoyé non recompté, lot invalide refusé, autre site refusé, CORS du site autorisé, limite de débit, aucune IP ni user-agent dans les fichiers, droits `600`, tableau de bord refusé sans session, connexion, cookie `HttpOnly` `SameSite=Strict`, export CSV, purge refusée sans jeton CSRF.
