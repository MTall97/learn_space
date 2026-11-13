# Déploiement automatique sur O2switch

Chaque `git push` sur `claude/ecstatic-gates-507okj` ou `main` lance
`.github/workflows/deploiement-o2switch.yml`. Il :

1. lance les tests et s'arrête s'ils échouent ;
2. prépare les fichiers publics du site (`node outils/site-public.js`) ;
3. se connecte en FTPS et vérifie qu'il est bien dans le dossier du site : `manifest.webmanifest` doit
   déjà y exister, sinon il s'arrête sans rien envoyer ;
4. envoie le site, en terminant par `sw-fichiers.js` et `sw.js` ;
5. vérifie que `https://learningspace223.duckdns.org/api/sante` répond `ok`.

**Compte FTP** : cPanel n'accepte pas `/` comme répertoire. Le compte FTP s'ouvre donc directement dans
le dossier du site (Répertoire : `learningspace223.duckdns.org`), et le site est envoyé à sa racine
(`DOSSIER_SITE` vaut `.`).

**Serveur du journal** : `~/learnspace-journal` est hors du dossier du site, et ce compte ne peut pas
l'atteindre. On le met donc à jour à la main quand `serveur/app.js` ou `serveur/liste-blanche.json`
changent : remplacer les deux fichiers, puis RESTART dans Setup Node.js App. Si un jour un compte FTP
atteint aussi ce dossier, régler la variable `DOSSIER_SERVEUR` : le déploiement le mettra alors à jour
et le redémarrera (`tmp/restart.txt`), après avoir vérifié que `config.json` y existe.

Le déploiement ne supprime jamais rien sur le serveur. `config.json` et les données n'y sont jamais
envoyés : ils ne sont pas dans le dépôt.

## Réglages (Settings > Secrets and variables > Actions)

| Nom | Type | Rôle |
|---|---|---|
| `FTP_SERVEUR` | secret | adresse du serveur FTP indiquée par cPanel |
| `FTP_UTILISATEUR` | secret | compte FTP (racine = dossier personnel) |
| `FTP_MOT_DE_PASSE` | secret | son mot de passe |
| `DOSSIER_SITE` | variable, facultative | dossier du site depuis la racine du compte FTP (`.` par défaut) |
| `DOSSIER_SERVEUR` | variable, facultative | dossier de l'application Node (vide : pas de mise à jour automatique du serveur) |
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
