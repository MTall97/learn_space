/* Simulateur électrique : analyse nodale en régime transitoire.
   - chaque composant « s'inscrit » dans le système G·V = I (méthode des nœuds) ;
   - condensateurs et bobines : méthode d'Euler implicite (modèles compagnons) ;
   - diodes, LED, transistors : méthode de Newton (linéarisation à chaque itération).
   Fonctionne dans le navigateur et sous Node (pour les tests). */
(function (racine) {
  "use strict";
  const LS = racine.LS = racine.LS || {};
  const GMIN = 1e-9; // petite conductance vers la masse : évite les nœuds « flottants »

  /* Résolution d'un système linéaire dense (pivot partiel). Modifie A et b. */
  function resoudre(A, b, n) {
    for (let k = 0; k < n; k++) {
      let p = k, max = Math.abs(A[k * n + k]);
      for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i * n + k]); if (v > max) { max = v; p = i; } }
      if (max < 1e-30) return false;
      if (p !== k) {
        for (let j = k; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[p * n + j]; A[p * n + j] = t; }
        const t = b[k]; b[k] = b[p]; b[p] = t;
      }
      const piv = A[k * n + k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i * n + k] / piv;
        if (f === 0) continue;
        for (let j = k; j < n; j++) A[i * n + j] -= f * A[k * n + j];
        b[i] -= f * b[k];
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= A[i * n + j] * b[j];
      b[i] = s / A[i * n + i];
    }
    return true;
  }
  LS.resoudreLineaire = resoudre;

  /* Limitation des pas de Newton sur une jonction PN (évite les débordements de l'exponentielle). */
  LS.pnjlim = function (vnew, vold, vt, vcrit) {
    if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
      if (vold > 0) {
        const arg = 1 + (vnew - vold) / vt;
        vnew = arg > 0 ? vold + vt * Math.log(arg) : vcrit;
      } else {
        vnew = vt * Math.log(vnew / vt);
      }
    }
    return vnew;
  };

  function Simulateur(schema, registre) {
    this.schema = schema;
    this.registre = registre;
    this.t = 0;
    this.preparer();
  }

  /* À appeler après toute modification du schéma (ajout, suppression, fil...). */
  Simulateur.prototype.preparer = function () {
    const schema = this.schema, reg = this.registre;
    this.reseau = LS.construireReseau(schema, reg);
    const bornes = this.reseau.bornes;
    // Choix de la masse (référence 0 V).
    let masse = -1;
    const m = schema.compos.find(c => reg[c.type] && reg[c.type].masse && bornes[c.id]);
    if (m) masse = bornes[m.id][0];
    else {
      const s = schema.compos.find(c => reg[c.type] && reg[c.type].source && bornes[c.id]);
      if (s) masse = bornes[s.id][1];
      else if (this.reseau.nbNets) masse = 0;
    }
    this.masse = masse;
    // Numérotation des inconnues : toutes les équipotentielles sauf la masse.
    this.indice = new Int32Array(this.reseau.nbNets).fill(-1);
    let n = 0;
    for (let k = 0; k < this.reseau.nbNets; k++) if (k !== masse) this.indice[k] = n++;
    this.n = n;
    this.A = new Float64Array(n * n);
    this.b = new Float64Array(n);
    this.v = new Float64Array(this.reseau.nbNets); // tension de chaque équipotentielle
    schema.compos.forEach(c => {
      const def = reg[c.type];
      c._nets = bornes[c.id] || [];
      if (def && def.modele && def.modele.init && !c._init) { def.modele.init(c); c._init = true; }
    });
    this.converge = true;
  };

  /* Interface d'inscription (« stamping ») passée aux modèles. */
  Simulateur.prototype._outils = function () {
    const self = this, n = this.n;
    const idx = net => (net === undefined || net < 0) ? -1 : self.indice[net];
    return {
      // Conductance G entre deux équipotentielles.
      g(a, b, G) {
        const i = idx(a), j = idx(b), A = self.A;
        if (i >= 0) A[i * n + i] += G;
        if (j >= 0) A[j * n + j] += G;
        if (i >= 0 && j >= 0) { A[i * n + j] -= G; A[j * n + i] -= G; }
      },
      // Courant J qui traverse l'élément de a vers b (sort de a, entre dans b).
      j(a, b, J) {
        const i = idx(a), k = idx(b);
        if (i >= 0) self.b[i] -= J;
        if (k >= 0) self.b[k] += J;
      },
      // Entrée brute de la matrice : dérivée du courant sortant de « ligne » par rapport à v(col).
      G(ligne, col, val) {
        const i = idx(ligne), j = idx(col);
        if (i >= 0 && j >= 0) self.A[i * n + j] += val;
      },
      // Courant constant sortant de « ligne » (dans la linéarisation).
      I(ligne, val) { const i = idx(ligne); if (i >= 0) self.b[i] -= val; }
    };
  };

  Simulateur.prototype.tension = function (net) {
    return (net === undefined || net < 0 || net === this.masse) ? 0 : this.v[net];
  };

  /* Avance d'un pas de temps dt (en secondes). */
  Simulateur.prototype.pas = function (dt) {
    const reg = this.registre, compos = this.schema.compos, n = this.n;
    if (n === 0) { this.t += dt; return true; }
    const outils = this._outils();
    const ctx = { t: this.t + dt, dt: dt, sim: this };
    const V = net => this.tension(net);
    let ok = false;
    const vAvant = Float64Array.from(this.v);
    for (let iter = 0; iter < 80; iter++) {
      this.A.fill(0); this.b.fill(0);
      for (let i = 0; i < n; i++) this.A[i * n + i] += GMIN;
      ctx.iter = iter;
      ctx.nonConverge = false;
      ctx.nonLineaire = false;
      for (const c of compos) {
        const def = reg[c.type];
        if (def && def.modele && def.modele.stamp) def.modele.stamp(outils, c, V, ctx);
      }
      if (!resoudre(this.A, this.b, n)) break;
      let delta = 0;
      for (let k = 0; k < this.reseau.nbNets; k++) {
        const i = this.indice[k];
        const nv = i >= 0 ? this.b[i] : 0;
        delta = Math.max(delta, Math.abs(nv - this.v[k]) / (1 + Math.abs(nv) * 1e-3));
        this.v[k] = nv;
      }
      if (!ctx.nonLineaire) { ok = true; break; } // circuit linéaire : une résolution suffit
      if (delta < 1e-6 && !ctx.nonConverge && iter > 0) { ok = true; break; }
    }
    if (!ok && !isFinite(this.v.reduce((s, x) => s + x, 0))) this.v.set(vAvant);
    this.converge = ok;
    this.t += dt;
    for (const c of compos) {
      const def = reg[c.type];
      if (def && def.modele && def.modele.apres) def.modele.apres(c, V, ctx);
    }
    return ok;
  };

  /* Courant entrant dans chaque borne de chaque composant (après un pas). */
  Simulateur.prototype.courants = function () {
    const V = net => this.tension(net), reg = this.registre;
    this.schema.compos.forEach(c => {
      const def = reg[c.type];
      c._i = (def && def.modele && def.modele.courants) ? def.modele.courants(c, V, this) : def.bornes.map(() => 0);
    });
  };

  LS.SimulateurElectrique = Simulateur;
})(typeof window !== "undefined" ? window : globalThis);
