# Journal d'utilisation (anonyme)

Le journal dit comment Learn Space est utilisé, **sans jamais savoir qui l'utilise** :
- combien de visites, de pages vues, de temps passé ;
- quels TP sont ouverts et terminés ;
- **où les élèves se trompent** : objectifs avec le plus d'essais ratés, questions avec le plus de réponses fausses.

Le serveur ne reçoit aucun identifiant et ne garde que des **totaux par jour**. Seul l'administrateur les voit, sur un tableau de bord protégé par mot de passe.

- Navigateur : `assets/js/journal.js`, réglé par `assets/js/config-journal.js`. Les essais viennent de `assets/js/tp.js`, qui émet `ls:essai` à chaque réponse saisie ou choisie.
- Serveur : `serveur/app.js`, Node.js 18, 20 ou 22, **sans dépendance npm**.
- Information et refus : `confidentialite.html`.

**Le journal est désactivé tant que `LS.JOURNAL_URL` est vide** (valeur livrée dans `config-journal.js`). Rien n'est alors compté, affiché, écrit sur l'appareil ni envoyé. Il ne fonctionne jamais quand le site est ouvert depuis le disque (`file://`).

## En deux phrases (pour un enfant ou un parent)

Le site compte des choses comme « 120 visites mardi » ou « le TP de la lampe a été ouvert 40 fois ». Il ne sait pas qui tu es : pas de nom, pas de compte, pas de numéro qui te suit, et tu peux refuser sur la page Confidentialité.

## Avant la mise en ligne (étapes bloquantes)

1. **Remplir le responsable et le contact** dans `confidentialite.html` : toutes les mentions `[À COMPLÉTER …]` (responsable, adresse e-mail, durée des journaux et des sauvegardes de l'hébergeur, réponse de l'APDP).
2. **Faire confirmer par l'APDP** (Autorité de protection des données à caractère personnel du Mali) que ce journal anonyme peut fonctionner comme décrit (mention `[À FAIRE CONFIRMER PAR L'APDP]`).
3. Ne remplir `config-journal.js` qu'après ces deux étapes.

## Ce qui reste sur l'appareil (jamais envoyé)

| Où | Quoi | Pourquoi |
|---|---|---|
| `sessionStorage` | un **numéro de visite** tiré au hasard, l'heure de la dernière activité, le temps actif de la visite, les TP déjà ouverts pendant la visite | savoir ce qui fait partie de la même visite (un TP compté une fois par visite, tranche de durée). Perdu à la fermeture de l'onglet ; renouvelé après 30 min sans activité. **Ne quitte jamais l'appareil** et n'est jamais écrit en `localStorage`. |
| `localStorage` | la **date (au jour) de la dernière visite** | calculer la catégorie de retour ; seule la catégorie part. |
| `localStorage` | l'opposition, « information déjà lue » | réglages. |
| `localStorage` | la file des événements pas encore envoyés | ne rien perdre hors ligne. Aucun identifiant dedans. |

## Ce qui est envoyé

Des lots `{ v: 2, lot, envoi, evs }` :
- `lot` est un identifiant aléatoire **du lot**, pour ne pas le compter deux fois s'il est renvoyé ;
- `envoi` est l'heure d'envoi de l'appareil, qui sert à recaler une horloge fausse.

Les événements possibles :

| Événement | Contenu |
|---|---|
| `visite` | une fois par visite : catégorie de retour (`premiere`, `moins7`, `7a30`, `plus30`), niveau choisi (1 à 4 ou rien), type d'appareil, famille de système, tranche de largeur d'écran (`<400`, `400-599`, `600-899`, `900-1279`, `1280+`). Une combinaison type + système peu courante est simplifiée (système « autre »). |
| `page`, `temps` | page ouverte ; temps actif sur la page (page à l'écran et interaction depuis moins de 60 s) |
| `palier` | la visite a dépassé 1, 5, 15, 30 ou 60 minutes de temps actif (donne la durée des visites en tranches sans rien relier) |
| `tp_debut`, `tp_fin` | TP ouvert (une fois par visite, sous sa variante de niveau `id@niveau`) ; TP terminé (durée depuis l'ouverture) |
| `objectif` | objectif réussi (temps depuis l'ouverture du TP) |
| `essai` | une réponse saisie à un objectif (`o`) ou choisie à une question (`q`), juste ou fausse |
| `notion`, `carte_finie` | notion comprise, carte terminée |

## Ce que le serveur garde

Le serveur garde des **totaux par jour** dans `agregats/AAAA-MM-JJ.json` :
- visites par catégorie de retour, par niveau, par type d'appareil, par système, par tranche de largeur, par couple type · système, et par **tranche horaire** (UTC, l'heure de Bamako) ;
- visites ayant atteint chaque palier de durée ;
- par page : vues et temps actif ;
- par TP : ouvertures, fins, durée jusqu'à la fin ;
- par objectif : réussites, temps pour réussir, essais, essais ratés ;
- par question : réponses justes et fausses ;
- par notion et par carte : nombre.

Chaque événement est ajouté aussitôt au total du jour, puis oublié : **aucune ligne brute, aucune heure d'événement, aucun identifiant** n'est stocké. Rien ne permet de relier deux visites, ni deux événements d'une même visite.

Il garde aussi, à part, `lots/AAAA-MM-JJ.txt` : les identifiants aléatoires des lots reçus. Ils servent à ne pas recompter un lot renvoyé après une coupure. Ils ne sont liés à rien d'autre et sont effacés au bout de 31 jours (le délai maximal d'un lot gardé hors ligne).

**Conservation** : les totaux sont gardés **25 mois** (760 jours, réglable), pour comparer une année scolaire à la précédente, puis effacés automatiquement. Au démarrage, le serveur efface aussi tout reste de données brutes d'une version précédente (dossier `evenements/`).

**Verrou** : chaque ajout se fait sous un verrou de fichier, partagé entre processus, pour qu'aucun total ne se perde quand Passenger lance plusieurs processus.

## Le choix d'une collecte sans consentement préalable

La collecte suit le régime de la **mesure d'audience anonyme**. Le serveur ne reçoit pas de données qui identifient une personne, ni directement ni indirectement : pas d'identifiant persistant, pas d'IP enregistrée, pas d'heure précise, catégories grossières. Il n'en garde que des totaux.

En contrepartie :
- l'information reste affichée jusqu'au clic sur « Compris » ;
- le **refus** reste possible à tout moment dans `confidentialite.html`. Le refus vide la file, efface la date de dernière visite et la visite en cours ; plus rien n'est compté.

La CNIL et le RGPD considèrent que des données réellement anonymisées ne sont plus des données personnelles. La loi malienne n° 2013-015 retient la même idée de données qui ne permettent pas d'identifier une personne. **Cette analyse doit être confirmée par l'APDP** avant la mise en ligne.

## Aucune perte

- Les événements attendent dans le navigateur, jusqu'à 3 000. Deux tranches de temps de suite sur la même page sont fusionnées. Si le navigateur manque de place, la moitié la plus ancienne est abandonnée.
- Un lot envoyé reste « en attente » tant que le serveur n'a pas répondu 204. À la fermeture de l'onglet, il part avec `fetch` `keepalive` ; s'il n'y a pas de réponse, il est renvoyé à la visite suivante, et le serveur ne le compte pas deux fois.
- Sans réseau, les lots attendent ; l'envoi reprend dès que le réseau revient (`online`) ou toutes les 30 s. En cas de 429 ou de 503, le lot est gardé et renvoyé 10 minutes plus tard.
- Entre deux onglets, l'envoi est réservé à un seul onglet par `navigator.locks` quand il existe.
- Limite : si l'élève efface les données de son navigateur, ce qui n'était pas encore parti est perdu.

## Installation sur O2switch avec « Setup Node.js App »

Le site reste statique (copie des fichiers) ; seul le journal tourne en Node.js.

1. **Copier uniquement le site** dans le dossier public (`public_html/`) : les pages `*.html`, `assets/`, `contenu/`, `sw.js`, `sw-fichiers.js`, `manifest.webmanifest`.
   - **Ne jamais copier `serveur/`, `docs/`, `tests/`, `outils/` ni `.git/` dans `public_html`.** Par précaution, `serveur/.htaccess` interdit tout accès web.
   - Activer le certificat https (AutoSSL).
2. **Copier le serveur hors du dossier public** : `serveur/app.js` et `serveur/config.example.json` dans `/home/<compte>/learnspace-journal/`.
3. **Dossier de données hors du dossier public** : `/home/<compte>/learnspace-donnees`, droits `700`. Le serveur **refuse de démarrer** si le dossier de données ou la configuration est sous `public_html`, `www` ou `htdocs`. Les fichiers créés ont les droits `600`.
4. **Mot de passe** : dans cPanel, ouvrir le Terminal et lancer d'abord la commande `source …/activate` affichée en haut de la page « Setup Node.js App » (voir l'étape 6). Puis :
   ```
   cd ~/learnspace-journal
   node app.js --hacher
   ```
   Taper le mot de passe (rien ne s'affiche), puis Entrée, et copier le résultat (`scrypt$…`). Le mot de passe n'est jamais passé en argument.
5. **Secret de session** : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, à mettre dans `secretSession`.
6. **Créer l'application** dans cPanel, « Setup Node.js App », puis « Create Application » :
   - version 20 ou 22, mode Production ;
   - *Application root* : `learnspace-journal` ; *Application startup file* : `app.js` ;
   - *Application URL* : le domaine du site avec le chemin `api`, ou un sous-domaine (`journal.<domaine>`).
7. **Configuration** : soit `config.json` à côté de `app.js` (jamais dans Git), soit des variables d'environnement, qui sont prioritaires :

   | Variable | Exemple | Rôle |
   |---|---|---|
   | `LS_ORIGINES` | `https://learnspace.exemple.ml` | adresse(s) du site autorisée(s) |
   | `LS_DONNEES` | `/home/<compte>/learnspace-donnees` | dossier des données |
   | `LS_ADMIN_HASH` | `scrypt$16384$8$1$…` | hachage du mot de passe |
   | `LS_SECRET_SESSION` | 64 caractères hexadécimaux | signature du cookie de session |
   | `LS_BASE` | `/api` | chemin de l'application ; vide pour un sous-domaine (le préfixe est accepté avec ou sans) |
   | `LS_CHEMIN_ADMIN` | `/admin` | chemin du tableau de bord |
   | `LS_CONSERVATION_JOURS` | `760` | conservation des totaux (25 mois) |
   | `LS_LIMITE_LOTS` | `600` | lots acceptés par adresse et par 10 minutes (en mémoire) |
   | `LS_PLAFOND_OCTETS_JOUR`, `LS_PLAFOND_LOTS_JOUR` | `50000000`, `200000` | plafonds par jour (au-delà : 503, rien n'est écrit) |
   | `LS_PLAFOND_DOSSIER` | `2000000000` | taille maximale du dossier de données |

8. **Redémarrer** l'application (« Restart ») après chaque modification.
9. **Brancher le site** : dans `public_html/assets/js/config-journal.js`, écrire `window.LS.JOURNAL_URL = "/api/journal";`, ou `"https://journal.<domaine>/journal"` pour un sous-domaine. Le service worker relit ce fichier sur le réseau d'abord : pas besoin de régénérer `sw-fichiers.js` pour lui.
10. **Tester** :
    - `…/api/sante` répond `ok` ;
    - ouvrir le site sur un téléphone, ouvrir un TP, se tromper une fois à un objectif, revenir à l'accueil, attendre 30 s ;
    - ouvrir `…/api/admin` : la visite, la page et l'essai raté apparaissent ;
    - ouvrir `…/api/admin/diagnostic` ;
    - vérifier que `https://<domaine>/serveur/app.js` renvoie 404 ou 403.

### Vérifier X-Forwarded-For sur place

Le serveur ne fait confiance à `X-Forwarded-For` que si la connexion vient du proxy local. Il n'en prend que la **dernière entrée**, celle qu'ajoute le proxy. Cette adresse ne sert qu'en mémoire (limite de débit, essais de connexion) et n'est jamais écrite.

La page `…/admin/diagnostic` (connexion requise) indique :
- si la connexion directe est locale ;
- si l'en-tête est présent, et avec combien d'entrées ;
- le début de la dernière entrée (`41.73.x.x`).

Compare-la au début de ton adresse publique. Si elle ne correspond pas (proxy en chaîne), relève `LS_LIMITE_LOTS` : les plafonds du jour protègent toujours le disque. Rien de cette page n'est enregistré.

## Sécurité du serveur

- **Validation stricte** :
  - lots de 128 Ko et 300 événements au plus ;
  - liste fermée d'événements, de champs et de valeurs ;
  - au plus 3 000 clés par rubrique et par jour (au-delà : « (autres) »), pour qu'un envoi malveillant ne fasse pas grossir les fichiers ;
  - lot illisible ou adresse mal encodée : 400.
- **CORS** : seules les origines configurées (et le domaine du serveur) peuvent envoyer ; les autres reçoivent 403.
- **Débit et disque** : limite par adresse (en mémoire), plafonds par jour (octets, lots) et pour le dossier entier. Au-delà, 503 sans rien écrire, et le client garde ses lots.
- **Tableau de bord** :
  - mot de passe haché avec scrypt ; un hachage d'exemple est reconnu comme « non configuré » ;
  - cookie de session signé HMAC (2 h), `HttpOnly`, `Secure`, `SameSite=Strict` ;
  - jeton CSRF sur les formulaires ;
  - essais de connexion ratés comptés par adresse en mémoire, avec un délai croissant ;
  - en-têtes CSP, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` (avec `no-referrer`, Chromium envoie `Origin: null` sur les formulaires, qui seraient refusés), HSTS.
- **Export CSV** : seulement les totaux (`jour;rubrique;cle;mesure;valeur`). Les cellules commençant par `=`, `+`, `-` ou `@` sont préfixées d'une apostrophe.

### Limites connues (plusieurs processus)

- **Partagé par le disque** : les totaux (sous verrou), le dédoublonnage des lots, les plafonds, la session.
- **Propre à chaque processus** : la limite de débit, les délais après essais ratés et la révocation à la déconnexion (2 h au plus).
- **Verrou** : un verrou abandonné plus de 10 s (processus tué) est repris. Si le verrou reste indisponible 5 s, le lot reçoit 503 et sera renvoyé.

## Tableau de bord

Il affiche les totaux de la période choisie (aujourd'hui à 25 mois) :
- visites, pages vues, temps actif, TP ouverts, essais ratés ;
- une table **par jour** (tendances) ;
- les visites par retour, niveau, appareil, système, largeur, durée et heure ;
- les pages ;
- les TP (part terminée, durée) ;
- **« Où les élèves se trompent »** : objectifs triés par essais ratés ;
- les objectifs où les élèves bloquent (réussites rapportées aux ouvertures de la même variante) ;
- les questions de quiz avec le plus de réponses fausses ;
- les notions et les cartes.

Il propose aussi l'export CSV des totaux, la purge et le diagnostic.

Les taux sont des rapports de **nombres d'événements**, pas de personnes :
- un TP est compté une fois par visite ;
- un objectif réussi est compté une fois par navigateur (le jeu ne le gagne qu'une fois).

## Ce qu'il faut savoir sur l'hébergeur

- **Journaux bruts** : le serveur web d'O2switch garde ses propres journaux d'accès avec l'adresse IP de chaque visite. Comme le journal n'a aucun identifiant persistant, ces journaux ne peuvent pas être reliés aux totaux.
  - Désactiver dans cPanel l'archivage des journaux bruts et les statistiques inutilisées.
  - Demander au support la durée de conservation et l'indiquer dans `confidentialite.html`.
- **Sauvegardes JetBackup** : les totaux restent dans les sauvegardes jusqu'à leur expiration (à vérifier dans cPanel, puis à indiquer dans `confidentialite.html`).
- **Sous-traitant et transfert** : O2switch héberge en France ; c'est écrit dans `confidentialite.html`.

## Tests

`tests/journal.test.js` couvre trois niveaux :
- **Fonctions du navigateur** :
  - catégories d'appareil et de retour, paliers ;
  - file bornée, fusion des tranches de temps ;
  - renvoi du même lot.
- **Client complet dans un navigateur simulé** :
  - désactivé sans adresse et en `file://` (rien écrit) ;
  - aucun identifiant envoyé ni gardé en `localStorage` ; numéro de visite seulement en `sessionStorage`, renouvelé après 30 min ;
  - ni date ni ancien numéro envoyés ;
  - TP compté une fois par visite, paliers ;
  - envoi à la fermeture puis renvoi, 503 ;
  - refus, quota ;
  - présence des deux émissions `ls:essai` dans `tp.js`.
- **Serveur, avec deux processus sur le même dossier** :
  - totaux exacts, lot jamais recompté, 20 envois simultanés sans perte (verrou) ;
  - horloge recalée, données brutes résiduelles effacées ;
  - aucune IP, aucun horodatage, droits 600 ;
  - CORS ;
  - limite par dernière entrée de X-Forwarded-For, plafond du jour ;
  - tableau de bord protégé, cookie partagé, CSRF, CSV avec apostrophe, purge, déconnexion, délai après échecs ;
  - hachage d'exemple, refus sous `public_html`.
