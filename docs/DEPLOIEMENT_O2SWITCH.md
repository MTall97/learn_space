# Déploiement automatique sur O2switch

Chaque `git push` sur `claude/ecstatic-gates-507okj` ou `main` lance
`.github/workflows/deploiement-o2switch.yml`, qui :

1. lance les tests et s'arrête s'ils échouent ;
2. prépare les fichiers publics du site (`node outils/site-public.js`) ;
3. envoie par FTPS :
   - le site dans `DOSSIER_SITE`, par défaut `learningspace223.duckdns.org`, avec `sw-fichiers.js` et
     `sw.js` envoyés en dernier ;
   - `serveur/app.js` et `serveur/liste-blanche.json` dans `DOSSIER_SERVEUR`, par défaut
     `learnspace-journal` ;
4. redémarre le serveur du journal en envoyant `tmp/restart.txt`, que Passenger surveille ;
5. vérifie que `https://learningspace223.duckdns.org/api/sante` répond `ok`.

Il ne supprime jamais rien sur le serveur. `config.json` et les données n'y sont jamais envoyés : ils ne
sont pas dans le dépôt.

## Réglages (Settings > Secrets and variables > Actions)

| Nom | Type | Rôle |
|---|---|---|
| `FTP_SERVEUR` | secret | adresse du serveur FTP indiquée par cPanel |
| `FTP_UTILISATEUR` | secret | compte FTP (racine = dossier personnel) |
| `FTP_MOT_DE_PASSE` | secret | son mot de passe |
| `DOSSIER_SITE` | variable, facultative | dossier du site, depuis la racine du compte FTP |
| `DOSSIER_SERVEUR` | variable, facultative | dossier de l'application Node |
| `DEPLOIEMENT_O2SWITCH` | variable, facultative | `non` pour couper le déploiement |

Sans les secrets, le travail s'arrête avec un simple avertissement.

## En cas d'échec

- **Erreur de certificat** : `FTP_SERVEUR` doit être un nom couvert par le certificat FTP d'O2switch,
  en général le nom du serveur indiqué dans cPanel (`….o2switch.net`), et non le domaine DuckDNS.
- **Dossier introuvable** : si le compte FTP ne démarre pas à la racine du compte, régler `DOSSIER_SITE`
  et `DOSSIER_SERVEUR`.
- **Relancer à la main** : onglet Actions, « Déploiement O2switch », puis « Run workflow ».
