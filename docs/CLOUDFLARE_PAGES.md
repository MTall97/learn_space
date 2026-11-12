# Héberger le site gratuitement sur Cloudflare Pages

Choix du 12/11/2026. L'adresse provisoire d'O2switch (`sc1busu9925.universe.wf`) n'a pas de certificat
HTTPS valable : AutoSSL a échoué. Or, sans HTTPS valable, l'application ne s'installe pas et ne marche
pas hors ligne.

Cloudflare Pages héberge gratuitement un site statique. L'adresse est du type `learnspace.pages.dev`,
avec un certificat valable et des serveurs proches de l'Afrique de l'Ouest. Le serveur du journal reste
sur O2switch.

## Ce que fait la construction

`node outils/site-public.js` copie dans `_site/` les seuls fichiers publics, c'est-à-dire ceux de la
liste de précache, plus `sw.js` et `sw-fichiers.js`. Il écrit aussi un fichier `_headers` : le service
worker et `config-journal.js` sont toujours revérifiés.

`serveur/`, `docs/`, `tests/` et `outils/` ne sont pas publiés. Le script n'a aucune dépendance npm.

## Mise en place (une seule fois)

1. Créer un compte gratuit sur dash.cloudflare.com. Il n'y a pas besoin de carte bancaire.
2. Aller dans **Workers & Pages**, puis **Create**, onglet **Pages**, puis **Connect to Git**.
   Autoriser GitHub, et seulement le dépôt `learn_space`.
3. Choisir la branche à publier (par exemple `main` après fusion, ou la branche de travail).
4. Réglages de construction :

   | Champ | Valeur |
   |---|---|
   | Framework preset | None |
   | Build command | `node outils/site-public.js` |
   | Build output directory | `_site` |

5. Cliquer **Save and Deploy**. Le site est en ligne en une minute, à `https://<nom>.pages.dev`.

Ensuite, chaque `git push` sur la branche choisie republie le site tout seul.

## Le journal

Le site sur `pages.dev` envoie les statistiques au serveur d'O2switch. Il faut deux choses :

- **Une adresse HTTPS valable pour le serveur.** Un navigateur refuse d'envoyer depuis une page HTTPS
  vers un certificat invalide. Tant que le serveur n'en a pas, laisser `config-journal.js` vide : le site
  marche normalement, sans statistiques. Une adresse gratuite possible est DuckDNS
  (`<nom>.duckdns.org`, pointée vers l'adresse IP du serveur O2switch), ajoutée comme domaine dans
  cPanel, puis AutoSSL. Cette solution n'est pas encore vérifiée chez O2switch.
- **Dans `config-journal.js`, l'adresse complète**, par exemple
  `window.LS.JOURNAL_URL = "https://<nom>.duckdns.org/api/journal";`. Dans le `config.json` du serveur,
  ajouter l'adresse du site à `origines`, par exemple `"https://<nom>.pages.dev"`.
