/* Adresse du serveur du journal d'utilisation (docs/JOURNAL.md). Vide : le journal est désactivé
   (rien n'est noté ni envoyé). À remplir au déploiement, par exemple :
     window.LS.JOURNAL_URL = "/api/journal";                         // même domaine, chemin /api
     window.LS.JOURNAL_URL = "https://journal.mon-domaine.ml/journal"; // sous-domaine */
window.LS = window.LS || {};
window.LS.JOURNAL_URL = window.LS.JOURNAL_URL || "";
