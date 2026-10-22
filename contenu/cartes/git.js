LS.ajouterCarte({
  id: "git",
  titre: "Git et GitHub",
  intro: "**Git** garde l'historique de ton travail : chaque version enregistrée, qui l'a faite et pourquoi. **GitHub** héberge les dépôts en ligne et permet de collaborer (branches, pull requests, revues, intégration continue).",
  racine: { t: "Git", c: [
    { t: "Notions", c: [
      { t: "Dépôt", d: "Dossier suivi par Git (repository), avec son historique dans le sous-dossier caché .git. Un dépôt local sur ta machine, un dépôt distant (remote) sur GitHub." },
      { t: "Commit", d: "Enregistrement d'un état du projet, avec un message qui explique le **pourquoi** du changement. Chaque commit a un identifiant (hash) et pointe vers son parent.", ex: "git commit -m \"Corrige le calcul du pip pour les paires en yen\"" },
      { t: "Zone de préparation", d: "Staging area : on y place (git add) les modifications qui feront partie du prochain commit, ce qui permet de faire des commits ciblés." },
      { t: "Branche", d: "Ligne de développement indépendante : on travaille sur une fonctionnalité sans toucher à main, puis on fusionne. Une branche n'est qu'une étiquette qui pointe vers un commit." },
      { t: "Fusion", d: "Merge : réunir deux branches. Si les deux ont modifié les mêmes lignes, il y a un **conflit** à résoudre à la main." }
    ] },
    { t: "Commandes", c: [
      { t: "git status et git diff", d: "Voir ce qui a changé et ce qui est prêt à être commité. À lancer souvent." },
      { t: "git log", d: "Historique des commits (git log --oneline pour un résumé)." },
      { t: "git pull et git push", d: "Récupérer les commits du dépôt distant (pull = fetch + merge) ; envoyer les siens (push)." },
      { t: "git switch", d: "Changer de branche (git switch -c nouvelle-branche pour en créer une)." },
      { t: "git restore et git revert", d: "Annuler des modifications non commitées (restore) ; annuler un commit déjà partagé en créant un commit inverse (revert), sans réécrire l'historique." }
    ] },
    { t: "GitHub", c: [
      { t: "Pull request", d: "Proposition de fusionner une branche dans une autre, avec discussion, revue de code et résultats des tests automatiques avant la fusion." },
      { t: "Issues", d: "Tickets pour noter bogues, idées et tâches, liés aux commits et pull requests qui les traitent." },
      { t: "Intégration continue", d: "GitHub Actions lance automatiquement tests et vérifications à chaque push ou pull request." },
      { t: "GitHub Pages", d: "Publie gratuitement un site statique depuis un dépôt : idéal pour un espace d'apprentissage comme celui-ci (Settings → Pages)." },
      { t: "Visibilité", d: "Dépôt public (visible de tous) ou privé (collaborateurs invités). Un dépôt peut changer de visibilité : ne jamais y mettre ce qu'on ne veut pas voir public un jour." }
    ] },
    { t: "Bonnes pratiques", c: [
      { t: "Petits commits", d: "Un commit = une modification cohérente, facile à relire et à annuler." },
      { t: "Pas de secrets", d: "Jamais de mots de passe, clés d'API ou jetons dans un dépôt : variables d'environnement ou gestionnaire de secrets. Un secret poussé doit être considéré comme compromis (le révoquer), même après suppression : il reste dans l'historique." },
      { t: ".gitignore", d: "Fichier qui liste ce que Git doit ignorer : environnements virtuels, caches, fichiers de données lourds, fichiers locaux." },
      { t: "Fichiers volumineux", d: "Git n'est pas fait pour les gros fichiers binaires (vidéos, jeux de données) : Git LFS, Hugging Face ou un stockage objet (S3) à côté." }
    ] }
  ] }
});
