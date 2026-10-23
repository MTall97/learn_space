/* Niveaux scolaires (primaire, collège, lycée, avancé : voir LS.NIVEAUX dans contenu/parcours.js).
   - Profil gardé dans le navigateur : un niveau général, et éventuellement un niveau par atelier.
   - Textes par niveau dans les cartes : d1 (primaire), d2 (collège), d (lycée, le texte de base),
     d4 (avancé) ; à défaut, on prend le texte le plus proche en dessous, puis « d ».
   - Objectifs et questions de TP : champ facultatif « niv » = niveau minimal, ou [min, max].
   - Petit test de placement : deux questions par niveau, on monte tant qu'on réussit.
   Fonctions pures exposées pour les tests. Charger après commun.js et contenu/parcours.js. */
(function () {
  "use strict";
  const LS = window.LS;
  const DEFAUT = 2;

  LS.profil = () => LS.lire("profil", { niveau: null, parAtelier: {} });
  LS.ecrireProfil = p => { LS.ecrire("profil", p); if (typeof document !== "undefined" && document.body) appliquer(); };
  LS.choisirNiveau = (n, domaine) => {
    const p = LS.profil();
    p.parAtelier = p.parAtelier || {};
    if (domaine) { if (n) p.parAtelier[domaine] = n; else delete p.parAtelier[domaine]; } else p.niveau = n;
    LS.ecrireProfil(p);
  };
  // Niveau en vigueur (pour un atelier si on le donne) ; collège si aucun profil.
  LS.niveau = domaine => { const p = LS.profil(); return (domaine && p.parAtelier && p.parAtelier[domaine]) || p.niveau || DEFAUT; };
  LS.infoNiveau = n => (LS.NIVEAUX || []).find(x => x.n === n) || { n, nom: "Niveau " + n };

  // Un élément (étape, objectif, question) est-il prévu pour ce niveau ?
  LS.pourNiveau = (niv, n) => niv === undefined || niv === null ? true : Array.isArray(niv) ? n >= niv[0] && n <= niv[1] : n >= niv;
  // Texte d'une notion au niveau n.
  LS.texteNiveau = (noeud, n) => {
    const ordre = n <= 1 ? ["d1", "d2", "d"] : n === 2 ? ["d2", "d"] : n >= 4 ? ["d4", "d"] : ["d"];
    for (const k of ordre) if (noeud[k]) return noeud[k];
    return noeud.d || "";
  };
  // Domaine (atelier) d'une étape du parcours.
  LS.domaineDe = (type, id) => { const d = (LS.parcours || []).find(x => x.etapes.some(e => e.type === type && e.id === id)); return d ? d.id : null; };
  // Un TP vu à un niveau : objectifs et questions filtrés ; l'état est gardé à part si le TP a des variantes.
  LS.tpAuNiveau = (tp, n) => {
    const aVariantes = (tp.objectifs || []).concat(tp.questions || []).some(x => x.niv !== undefined);
    const objectifs = (tp.objectifs || []).filter(o => LS.pourNiveau(o.niv, n));
    const questions = (tp.questions || []).filter(q => LS.pourNiveau(q.niv, n));
    return Object.assign({}, tp, { objectifs, questions, cleEtat: aVariantes ? tp.id + "@" + n : tp.id,
      intro: (n <= 1 && tp.intro1) || (n === 2 && tp.intro2) || tp.intro });
  };

  /* ---------- Petit test de placement ---------- */
  LS.TEST_PLACEMENT = [
    { niv: 1, q: "Pour qu'une lampe de poche s'allume, il faut…", choix: ["un circuit fermé : le courant fait le tour", "un circuit ouvert", "enlever la pile"], bonne: 0 },
    { niv: 1, q: "Lequel laisse passer le courant ?", choix: ["un sachet plastique", "un clou en fer", "un morceau de bois sec"], bonne: 1 },
    { niv: 2, q: "Combien font 3 × 4 + 2 ?", choix: ["20", "18", "14"], bonne: 2 },
    { niv: 2, q: "Une pile et une lampe. On ajoute une deuxième lampe identique à la suite de la première (en série). Les lampes brillent…", choix: ["moins fort", "plus fort", "pareil"], bonne: 0 },
    { niv: 3, q: "Loi d'Ohm : U = 12 V et R = 4 Ω. Quel est le courant I ?", choix: ["48 A", "3 A", "0,33 A"], bonne: 1 },
    { niv: 3, q: "Un panneau solaire de 100 W reçoit le plein soleil pendant 5 heures. Il produit au mieux environ…", choix: ["500 Wh", "20 Wh", "105 Wh"], bonne: 0 },
    { niv: 4, q: "Quelle est la dérivée de sin(ωt) par rapport au temps ?", choix: ["cos(ωt)", "ω·cos(ωt)", "−ω·sin(ωt)"], bonne: 1 },
    { niv: 4, q: "Impédance d'un condensateur de 100 µF à 50 Hz ?", choix: ["environ 32 Ω", "environ 0,03 Ω", "environ 5 000 Ω"], bonne: 0 }
  ];
  // reponses : { indexQuestion: indexChoix }. On monte d'un niveau tant qu'au moins une des deux
  // questions du niveau est juste ; le niveau proposé est le dernier atteint (au moins primaire).
  LS.niveauDuTest = reponses => {
    let atteint = 1;
    for (let n = 1; n <= 4; n++) {
      const qs = LS.TEST_PLACEMENT.map((q, i) => [q, i]).filter(([q]) => q.niv === n);
      const justes = qs.filter(([q, i]) => reponses[i] === q.bonne).length;
      if (justes === 0) break;
      atteint = n;
    }
    return atteint;
  };

  /* ---------- Page : niveau affiché sur <body> (data-niveau), pour adapter l'interface ---------- */
  function appliquer() {
    const page = document.body.dataset.domaine || null;
    const n = LS.niveau(page);
    document.body.dataset.niveau = (LS.infoNiveau(n).id || "") ;
    document.querySelectorAll(".puce-niveau").forEach(e => { e.textContent = LS.infoNiveau(LS.niveau(page)).nom; });
  }
  LS.appliquerNiveau = appliquer;
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("DOMContentLoaded", appliquer);
})();
