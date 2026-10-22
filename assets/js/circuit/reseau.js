/* Connectivité d'un schéma : quels points (bornes, extrémités de fils) sont reliés entre eux.
   Utilisé par le simulateur électrique et par le simulateur logique.

   Modèle d'un schéma :
     { compos: [{ id, type, x, y, rot, p: {propriétés} }], fils: [{ id, pts: [[x,y], ...] }] }
   Les coordonnées sont en unités de grille. Deux éléments sont reliés quand ils partagent un point,
   ou quand l'extrémité de l'un tombe au milieu d'un segment de fil (jonction en T). */
(function (racine) {
  "use strict";
  const LS = racine.LS = racine.LS || {};

  const cle = (x, y) => x + "," + y;
  LS.clePoint = cle;

  /* Position absolue d'une borne après rotation (0, 90, 180, 270 degrés). */
  LS.positionBorne = function (c, b) {
    let x = b[0], y = b[1];
    switch (((c.rot || 0) % 360 + 360) % 360) {
      case 90: [x, y] = [-y, x]; break;
      case 180: [x, y] = [-x, -y]; break;
      case 270: [x, y] = [y, -x]; break;
    }
    return [c.x + x, c.y + y];
  };

  function surSegment(p, a, b) {
    if (a[0] === b[0] && p[0] === a[0]) return p[1] > Math.min(a[1], b[1]) && p[1] < Math.max(a[1], b[1]);
    if (a[1] === b[1] && p[1] === a[1]) return p[0] > Math.min(a[0], b[0]) && p[0] < Math.max(a[0], b[0]);
    return false;
  }
  LS.surSegment = surSegment;

  /* Construit les équipotentielles (« nets »).
     Renvoie { bornes: {idCompo: [net, ...]}, nbNets, netDuPoint: {cle: net}, aretes, connexions } */
  LS.construireReseau = function (schema, registre) {
    const parent = {};
    const trouver = k => { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
    const unir = (a, b) => { a = trouver(a); b = trouver(b); if (a !== b) parent[a] = b; };
    const ajouter = k => { if (!(k in parent)) parent[k] = k; };

    const pointsBornes = []; // [cle, compo, indice]
    const compteur = {};     // nombre d'éléments par point (pour les points de jonction)
    const inc = k => { compteur[k] = (compteur[k] || 0) + 1; };
    schema.compos.forEach(c => {
      const def = registre[c.type];
      if (!def) return;
      (c.bornes || def.bornes).forEach((b, i) => {
        const p = LS.positionBorne(c, b), k = cle(p[0], p[1]);
        ajouter(k); inc(k);
        pointsBornes.push([k, c, i, p]);
      });
    });
    // Sommets des fils.
    schema.fils.forEach(f => {
      f.pts.forEach(p => ajouter(cle(p[0], p[1])));
      // Un fil « coupé » (panne cachée des TP de dépannage) ne relie rien.
      if (!f.coupe) for (let i = 1; i < f.pts.length; i++) unir(cle(f.pts[i - 1][0], f.pts[i - 1][1]), cle(f.pts[i][0], f.pts[i][1]));
      inc(cle(f.pts[0][0], f.pts[0][1]));
      inc(cle(f.pts[f.pts.length - 1][0], f.pts[f.pts.length - 1][1]));
    });
    // Jonctions en T : une extrémité (fil ou borne) posée au milieu d'un segment.
    const extremites = [];
    pointsBornes.forEach(pb => extremites.push(pb[3]));
    schema.fils.forEach(f => { extremites.push(f.pts[0]); extremites.push(f.pts[f.pts.length - 1]); });
    const pointsSurFil = {}; // idFil → [points intermédiaires]
    schema.fils.forEach(f => {
      if (f.coupe) return;
      for (let i = 1; i < f.pts.length; i++) {
        const a = f.pts[i - 1], b = f.pts[i];
        extremites.forEach(p => {
          if (surSegment(p, a, b)) {
            const k = cle(p[0], p[1]);
            unir(k, cle(a[0], a[1]));
            inc(k); inc(k);
            (pointsSurFil[f.id] = pointsSurFil[f.id] || []).push(p);
          }
        });
      }
    });

    const numero = {};
    let nb = 0;
    Object.keys(parent).forEach(k => { const r = trouver(k); if (!(r in numero)) numero[r] = nb++; });
    const netDuPoint = {};
    Object.keys(parent).forEach(k => { netDuPoint[k] = numero[trouver(k)]; });
    const bornes = {};
    pointsBornes.forEach(([k, c, i]) => { (bornes[c.id] = bornes[c.id] || [])[i] = netDuPoint[k]; });

    // Arêtes élémentaires des fils (segments découpés aux jonctions), pour animer le courant.
    const aretes = [];
    schema.fils.forEach(f => {
      if (f.coupe) return;
      for (let i = 1; i < f.pts.length; i++) {
        const a = f.pts[i - 1], b = f.pts[i];
        const inter = (pointsSurFil[f.id] || []).filter(p => surSegment(p, a, b));
        const d = p => Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1]);
        const suite = [a].concat(inter.sort((p, q) => d(p) - d(q))).concat([b]);
        for (let j = 1; j < suite.length; j++) {
          const p = suite[j - 1], q = suite[j];
          if (p[0] === q[0] && p[1] === q[1]) continue;
          aretes.push({ fil: f.id, a: p, b: q, ka: cle(p[0], p[1]), kb: cle(q[0], q[1]), i: 0 });
        }
      }
    });

    const jonctions = Object.keys(compteur).filter(k => compteur[k] >= 3).map(k => k.split(",").map(Number));
    // Bornes reliées à rien (ni fil ni autre borne) : utile pour signaler un oubli.
    const libres = pointsBornes.filter(([k]) => compteur[k] === 1 && !schema.fils.some(f => f.pts.some(p => cle(p[0], p[1]) === k))).map(pb => pb[3]);

    return { bornes, nbNets: nb, netDuPoint, aretes, jonctions, libres, pointsBornes };
  };

  /* Répartit le courant dans les fils : chaque borne « consomme » le courant qui entre dans
     son composant ; on fait circuler ce courant dans un arbre couvrant de chaque équipotentielle.
     courantBorne(compo, indice) → courant entrant dans le composant par cette borne. */
  LS.courantsFils = function (reseau, courantBorne) {
    const voisins = {};
    reseau.aretes.forEach((e, n) => {
      (voisins[e.ka] = voisins[e.ka] || []).push([n, e.kb, +1]);
      (voisins[e.kb] = voisins[e.kb] || []).push([n, e.ka, -1]);
      e.i = 0;
    });
    const puits = {};
    reseau.pointsBornes.forEach(([k, c, i]) => { puits[k] = (puits[k] || 0) + (courantBorne(c, i) || 0); });
    const vu = {};
    Object.keys(voisins).forEach(depart => {
      if (vu[depart]) return;
      // Parcours en largeur : ordre + parent de chaque point.
      const ordre = [depart], par = { [depart]: null };
      vu[depart] = true;
      for (let q = 0; q < ordre.length; q++) {
        const k = ordre[q];
        voisins[k].forEach(([n, autre, sens]) => {
          if (vu[autre]) return;
          vu[autre] = true; par[autre] = [n, sens, k];
          ordre.push(autre);
        });
      }
      // Remontée : le courant qui va du parent vers un point = somme des puits du sous-arbre.
      const somme = {};
      for (let q = ordre.length - 1; q >= 0; q--) {
        const k = ordre[q];
        somme[k] = (somme[k] || 0) + (puits[k] || 0);
        const p = par[k];
        if (p) {
          const [n, sens, kp] = p;
          // sens +1 : l'arête va de kp (a) vers k (b).
          reseau.aretes[n].i = sens * somme[k];
          somme[kp] = (somme[kp] || 0) + somme[k];
        }
      }
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
