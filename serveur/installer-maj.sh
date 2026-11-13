#!/bin/bash
# Met en place la mise à jour du serveur du journal déposée par le déploiement automatique.
# Usage, dans le Terminal de cPanel :  bash ~/learnspace-maj/installer-maj.sh
# Ce script déplace (mv) app.js et liste-blanche.json de ~/learnspace-maj vers ~/learnspace-journal,
# garde une copie des anciens fichiers, puis redémarre l'application (tmp/restart.txt).
# Il ne touche jamais à config.json ni aux données.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
CIBLE="${LS_DOSSIER_JOURNAL:-$HOME/learnspace-journal}"
SANTE="${LS_URL_SANTE:-https://learningspace223.duckdns.org/api/sante}"

[ -f "$CIBLE/config.json" ] || { echo "Arrêt : $CIBLE/config.json introuvable (mauvais dossier ?)."; exit 1; }
for f in app.js liste-blanche.json; do
  [ -f "$ICI/$f" ] || { echo "Arrêt : $ICI/$f manquant (rien à installer, ou déjà installé)."; exit 1; }
done

# Vérifier la syntaxe du nouveau app.js avec le Node de l'application, s'il est là.
NODE="$(ls -d "$HOME"/nodevenv/learnspace-journal/*/bin/node 2>/dev/null | tail -1 || true)"
if [ -n "$NODE" ]; then "$NODE" --check "$ICI/app.js" || { echo "Arrêt : app.js contient une erreur."; exit 1; }; fi

SAUV="$CIBLE/sauvegardes/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SAUV"
for f in app.js liste-blanche.json; do [ -f "$CIBLE/$f" ] && cp -p "$CIBLE/$f" "$SAUV/"; done
echo "Anciens fichiers gardés dans $SAUV"

mv -f "$ICI/app.js" "$ICI/liste-blanche.json" "$CIBLE/"
echo "Nouveaux app.js et liste-blanche.json installés dans $CIBLE"

mkdir -p "$CIBLE/tmp" && touch "$CIBLE/tmp/restart.txt"
echo "Redémarrage demandé. Vérification…"
for i in 1 2 3 4 5 6; do
  sleep 5
  if [ "$(curl -s --max-time 10 "$SANTE" || true)" = "ok" ]; then echo "Serveur du journal : ok"; exit 0; fi
done
echo "Le serveur ne répond pas : cliquer RESTART dans Setup Node.js App, puis lire stderr.log."
echo "Pour revenir en arrière : cp $SAUV/* $CIBLE/ puis RESTART."
exit 1
