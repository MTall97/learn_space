# Déploiement automatique sur O2switch

Chaque `git push` sur `claude/ecstatic-gates-507okj` ou `main` lance
`.github/workflows/deploiement-o2switch.yml`, qui :

1. lance les tests et s'arrête s'ils échouent ;
2. prépare les fichiers publics du site avec `node outils/site-public.js` ;
3. se connecte en FTPS et repère le dossier du site d'après ce que voit le compte FTP : `manifest.webmanifest`
   à la racine, ou `learningspace223.duckdns.org/`. S'il ne trouve pas `manifest.webmanifest`, il s'arrête
   sans rien envoyer ;
4. envoie le site, avec `sw-fichiers.js` et `sw.js` en dernier ;
5. **dépose** la mise à jour du serveur du journal dans `learnspace-maj/` : `app.js`, `liste-blanche.json`,
   `installer-maj.sh`, plus un `.htaccess` qui en interdit l'accès par le web. Il ne remplace jamais le
   serveur en marche ;
6. vérifie que `https://learningspace223.duckdns.org/api/sante` répond `ok`.

## Installer la mise à jour du serveur (à la main, dans le Terminal de cPanel)

```
bash ~/learnspace-maj/installer-maj.sh
```

Le script fait cinq choses, dans l'ordre :

1. il vérifie que `~/learnspace-journal/config.json` existe et que le nouveau `app.js` ne contient pas
   d'erreur de syntaxe ;
2. il garde une copie des anciens fichiers dans `~/learnspace-journal/sauvegardes/<date>/` ;
3. il **déplace** (`mv`) `app.js` et `liste-blanche.json` vers `~/learnspace-journal/` ;
4. il redémarre l'application (`tmp/restart.txt`) ;
5. il vérifie `/api/sante`.

Il ne touche jamais à `config.json` ni aux données. Pour revenir en arrière, recopier les fichiers d'une
sauvegarde dans `~/learnspace-journal/`, puis RESTART.

Le déploiement ne supprime jamais rien sur le serveur. `config.json` et les données n'y sont jamais
envoyés : ils ne sont pas dans le dépôt.

## Réglages (Settings > Secrets and variables > Actions)

| Nom | Type | Rôle |
|---|---|---|
| `FTP_SERVEUR` | secret | adresse du serveur FTP indiquée par cPanel |
| `FTP_UTILISATEUR` | secret | compte FTP (racine = dossier personnel) |
| `FTP_MOT_DE_PASSE` | secret | son mot de passe |
| `DOSSIER_SITE` | variable, facultative | dossier du site depuis la racine du compte FTP (détecté sinon) |
| `DOSSIER_MAJ` | variable, facultative | où déposer la mise à jour du serveur (`learnspace-maj` par défaut) |
| `DEPLOIEMENT_O2SWITCH` | variable, facultative | `non` pour couper le déploiement |

Sans les secrets, le travail s'arrête avec un simple avertissement.

## En cas d'échec

- **Erreur de certificat** (« The certificate is NOT trusted… (AA:BB:…) ») : le serveur FTP d'O2switch
  envoie un certificat dont l'émetteur n'est pas reconnu. Le déploiement accepte seulement ce certificat
  précis, identifié par son empreinte. Tout autre certificat reste refusé, ce qui protège le mot de
  passe. Quand O2switch renouvelle son certificat, copier la nouvelle empreinte (entre parenthèses dans
  le message d'erreur) dans la variable `FTP_EMPREINTE`.
- **« manifest.webmanifest doit exister »** : le compte FTP ne s'ouvre pas dans le dossier du site.
  Dans cPanel, Comptes FTP, régler son répertoire sur `learningspace223.duckdns.org`.
- **Incident du 12/11/2026** : le premier compte s'ouvrait sur `learningspace223.duckdns.org/sc1busu9925`
  (le choix par défaut de cPanel). Deux exécutions y ont créé par erreur `learningspace223.duckdns.org/`
  et `learnspace-journal/`, qui sont des copies publiques. Il faut supprimer ce dossier `sc1busu9925`.
- **Relancer à la main** : onglet Actions, « Déploiement O2switch », puis « Run workflow ».
