# Application installable et hors ligne (PWA)

Learn Space s'installe comme une application sur Android, et en raccourci sur l'écran d'accueil sur iPhone et iPad. Après la **première visite en ligne**, tout le site marche sans réseau, y compris les cartes, les TP et les simulations jamais ouverts.

À la première visite, le navigateur télécharge tout le site en arrière-plan : environ **0,55 Mo** si le serveur compresse les fichiers (gzip, cas d'O2switch) ; 1,2 Mo sans compression. C'est à dire aux utilisateurs qui ont un petit forfait.

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.webmanifest` | nom, couleurs, `start_url`, `scope`, affichage `standalone`, icônes (192, 512, maskable 512), raccourcis (Ateliers, Bac à sable, Brevets) |
| `assets/icones/*.png` | icônes rendues depuis `assets/icone.svg` avec Chromium sans écran (le 180 px sert d'`apple-touch-icon`) |
| `sw.js` | service worker : précache, cache versionné, exclusions, page hors ligne |
| `sw-fichiers.js` | **généré** : liste de tous les fichiers du site et empreinte de leur contenu |
| `outils/liste-precache.js` | génère `sw-fichiers.js` et `serveur/liste-blanche.json` (identifiants acceptés par le journal) |
| `assets/js/pwa.js` | enregistrement du service worker, bouton « Installer l'application », aide iOS, avis « Nouvelle version — Recharger » |
| `hors-ligne.html` | page affichée si une page n'est pas en cache et que le réseau ne répond pas |

## Après chaque modification du site

```
node outils/liste-precache.js
```

Cette commande régénère `sw-fichiers.js` (et `serveur/liste-blanche.json`, à recopier sur le serveur du journal). Elle est nécessaire après tout ajout, suppression ou modification d'un fichier du site : page, CSS, script, carte, TP, simulation, icône.

`tests/pwa.test.js` échoue si la liste ou l'empreinte n'est pas à jour. Sans régénération, le service worker continuerait de servir l'ancienne version depuis le cache.

## Comportement

- **Installation du service worker** : tous les fichiers de la liste sont mis en cache, dans `learnspace-v4-<empreinte>`. Les anciens caches `learnspace-*` sont effacés quand la nouvelle version prend la main.
- **Fichiers du site** : servis depuis le cache, ce qui est rapide sur un réseau faible. Les pages `tp.html?id=…` et `carte.html?id=…` sont une seule page en cache.
- **Recherche de mise à jour** : `sw.js` et `sw-fichiers.js` sont toujours relus sur le réseau, sans passer par le cache HTTP (`updateViaCache: "none"`).
- **Mise à jour** : quand une nouvelle version est installée en arrière-plan, la page affiche « Nouvelle version du site prête » avec un bouton « Recharger ».
  - Rien ne change sans ce clic, pour ne pas couper un TP en cours.
  - Le clic active la nouvelle version, et **tous les onglets ouverts se rechargent**. Sinon, un onglet garderait l'ancien code et chargerait à la demande des fichiers de la nouvelle version.
  - La progression des TP est enregistrée au fur et à mesure dans le navigateur : un rechargement ne la perd pas.
- **Jamais en cache** :
  - `/api`, `/admin` et `/journal` (le journal et son tableau de bord) ;
  - les autres sites ;
  - toute requête autre que GET.
- **`config-journal.js`** : rempli au déploiement, il est relu d'abord sur le réseau. Si le réseau ne répond pas dans les 1,5 s, la copie en cache est servie : ce fichier est chargé de façon synchrone, et un réseau qui ne répond pas bloquerait sinon toute la page.
- **En `file://`** : pas de service worker ni de bouton d'installation ; le site marche comme avant.

## Bouton « Installer l'application »

Le bouton se trouve dans le pied de page de l'accueil (`#installer-app`). Il apparaît seulement quand le navigateur propose l'installation (`beforeinstallprompt` : Chrome et navigateurs Chromium sur Android et ordinateur). Il est masqué si l'application est déjà installée.

Sur iPhone et iPad, il n'y a pas d'installation automatique ; une courte aide s'affiche à la place : « touche Partager, puis Sur l'écran d'accueil ».

## Mettre le site à jour sur le serveur

Téléverser **`sw.js` et `sw-fichiers.js` en dernier**, après tous les autres fichiers.

Si le service worker voit la nouvelle liste avant que les fichiers soient en place, il met en cache des fichiers de l'ancienne version (ou échoue). Il installe ensuite cette version incomplète.

Si un fichier de la liste manque, l'installation échoue (`addAll`) et l'ancienne version reste en service : rien ne casse, la mise à jour sera retentée.

## iPhone et iPad (Safari)

- L'aide d'installation peut être fermée ; elle ne revient pas (réglage gardé dans le navigateur).
- Le site demande un **stockage persistant** (`navigator.storage.persist()`) ; Safari peut le refuser.
- Dans Safari, le stockage du site et celui de l'application ajoutée à l'écran d'accueil sont **séparés** : la progression faite dans Safari n'apparaît pas dans l'application, et inversement.
- Safari peut **effacer** le stockage d'un site non ouvert pendant 7 jours (cache hors ligne et progression). L'application ajoutée à l'écran d'accueil est moins exposée.
