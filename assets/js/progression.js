/* Progression de l'apprenant, gardée dans le navigateur (localStorage).
   - notions comprises : { "idCarte/slug": true }
   - TP : { "idTP": { objectifs: { "0": true, ... }, questions: { "0": true } } } */
(function () {
  "use strict";
  const LS = window.LS;

  LS.compris = function (idNoeud) { return !!LS.lire("compris", {})[idNoeud]; };
  LS.marquerCompris = function (idNoeud, oui) {
    const c = LS.lire("compris", {});
    if (oui) c[idNoeud] = true; else delete c[idNoeud];
    LS.ecrire("compris", c);
  };
  LS.progressionCarte = function (carte) {
    LS.preparerCarte(carte);
    const c = LS.lire("compris", {});
    const noeuds = LS.noeudsCarte(carte).filter(n => n._niveau > 0);
    const faits = noeuds.filter(n => c[n._id]).length;
    return { faits: faits, total: noeuds.length, ratio: noeuds.length ? faits / noeuds.length : 0 };
  };

  LS.etatTP = function (id) { return LS.lire("tp", {})[id] || { objectifs: {}, questions: {} }; };
  LS.enregistrerTP = function (id, etat) {
    const t = LS.lire("tp", {});
    t[id] = etat;
    LS.ecrire("tp", t);
  };
  LS.progressionTP = function (tp) {
    const e = LS.etatTP(tp.id);
    const nObj = (tp.objectifs || []).length, nQ = (tp.questions || []).length;
    const faits = Object.keys(e.objectifs || {}).filter(k => +k < nObj).length +
      Object.keys(e.questions || {}).filter(k => +k < nQ).length;
    const total = nObj + nQ;
    return { faits: faits, total: total, ratio: total ? faits / total : 0 };
  };

  /* Progression d'un TP sans charger son fichier (le total est noté à la première visite). */
  LS.progressionTPStockee = function (id, niveau) {
    // Un TP à variantes par niveau garde son état sous « id@niveau ».
    const tous = LS.lire("tp", {});
    const e = (niveau && tous[id + "@" + niveau]) || LS.etatTP(id);
    const faits = Object.keys(e.objectifs || {}).length + Object.keys(e.questions || {}).length;
    const total = e.total || 0;
    return { faits: faits, total: total, ratio: total ? Math.min(1, faits / total) : 0, visite: !!e.total };
  };

  LS.effacerProgression = function () {
    LS.ecrire("compris", {});
    LS.ecrire("tp", {});
  };
})();
