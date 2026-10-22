/* Simulateur logique : portes, entrées, LED, horloge, bascule D, afficheur hexadécimal.
   Chaque fil porte 0 ou 1 ; une borne d'entrée non reliée vaut 0 ; deux sorties qui imposent des
   valeurs différentes sur le même fil créent un conflit (fil rouge). */
(function () {
  "use strict";
  const LS = window.LS;

  const entrees2 = [[0, -1], [0, 1]];
  const porte = (nom, court, fonction, forme, bulle) => ({
    nom, court, cat: "Portes", prefixe: "P",
    bornes: entrees2.concat([[4, 0]]), sens: ["e", "e", "s"],
    eval: (e) => [fonction(e[0], e[1]) ? 1 : 0],
    dessin(d) {
      d.l(0, -20, 22, -20); d.l(0, 20, 22, 20);
      d.p(forme, "plein");
      if (forme.extra) d.p(forme.extra);
      if (bulle) { d.c(64, 0, 4, "plein"); d.l(68, 0, 80, 0); } else d.l(60, 0, 80, 0);
      d.t(40, 4, court, "txt petit");
    }
  });
  const ET = "M20,-24 L40,-24 A24,24 0 0 1 40,24 L20,24 Z";
  const OU = "M16,-24 Q46,-24 60,0 Q46,24 16,24 Q28,0 16,-24 Z";
  const OUX = "M22,-24 Q50,-24 62,0 Q50,24 22,24 Q34,0 22,-24 Z M14,-24 Q26,0 14,24";

  const R = {};
  R.entree = {
    nom: "Entrée (interrupteur logique)", court: "Entrée", cat: "Entrées", prefixe: "E", cliquable: true,
    bornes: [[3, 0]], sens: ["s"],
    props: [{ k: "v", nom: "Valeur 1", bool: true, defaut: false }],
    action(c) { c.p.v = !c.p.v; },
    eval: (e, c) => [c.p.v ? 1 : 0],
    dessin(d, c) {
      d.r(-6, -14, 40, 28, "plein", 6);
      d.t(14, 0, c.p.v ? "1" : "0", "txt gros");
      d.l(34, 0, 60, 0);
      const fond = d.r(-6, -14, 40, 28, "etat-logique", 6);
      fond.style.fill = c.p.v ? "rgba(46,204,113,.35)" : "transparent";
    }
  };
  R.bouton = {
    nom: "Bouton (1 tant qu'on appuie)", court: "Bouton", cat: "Entrées", prefixe: "B", appui: true,
    bornes: [[3, 0]], sens: ["s"], props: [],
    eval: (e, c) => [c._appui ? 1 : 0],
    dessin(d, c) {
      d.c(10, 0, 13, "plein"); d.c(10, 0, 7, c._appui ? "corps" : "plein"); d.l(23, 0, 60, 0);
    }
  };
  R.horloge = {
    nom: "Horloge", court: "Horloge", cat: "Entrées", prefixe: "H",
    bornes: [[3, 0]], sens: ["s"],
    props: [{ k: "f", nom: "Fréquence", unite: "Hz", min: 0.2, max: 10, log: true, defaut: 1 }],
    eval: (e, c, t) => [((t * c.p.f) % 1) < 0.5 ? 1 : 0],
    dessin(d) {
      d.r(-6, -14, 40, 28, "plein", 4);
      d.p("M0,6 L6,6 L6,-6 L14,-6 L14,6 L22,6 L22,-6 L28,-6");
      d.l(34, 0, 60, 0);
    }
  };
  R.led = {
    nom: "Voyant (LED de sortie)", court: "Voyant", cat: "Sorties", prefixe: "S",
    bornes: [[0, 0]], sens: ["e"], props: [{ k: "couleur", nom: "Couleur", choix: ["rouge", "verte", "jaune", "bleue"], defaut: "rouge" }],
    eval: () => [],
    dessin(d, c) {
      d.l(0, 0, 14, 0);
      const coul = { rouge: "#ff3b30", verte: "#34c759", jaune: "#ffd60a", bleue: "#0a84ff" }[c.p.couleur];
      const halo = d.c(28, 0, 18, "halo"); halo.setAttribute("fill", coul);
      const corps = d.c(28, 0, 12, "plein");
      return c2 => {
        const on = c2._e && c2._e[0] === 1;
        halo.setAttribute("opacity", on ? 0.5 : 0);
        corps.style.fill = on ? coul : "";
      };
    }
  };
  R.afficheur = {
    nom: "Afficheur hexadécimal (4 bits)", court: "Afficheur", cat: "Sorties", prefixe: "AFF",
    bornes: [[0, 0], [0, 1], [0, 2], [0, 3]], sens: ["e", "e", "e", "e"], props: [],
    eval: () => [],
    dessin(d) {
      d.r(10, -12, 52, 84, "plein", 4);
      ["1", "2", "4", "8"].forEach((p, i) => { d.l(0, i * 20, 10, i * 20); d.t(17, i * 20, p, "txt petit"); });
      // Segments a..g
      const seg = { a: [30, 0, 50, 0], b: [52, 2, 52, 26], c: [52, 32, 52, 56], d: [30, 58, 50, 58], e: [28, 32, 28, 56], f: [28, 2, 28, 26], g: [30, 29, 50, 29] };
      const el = {};
      Object.keys(seg).forEach(k => { const s = seg[k]; el[k] = d.l(s[0], s[1], s[2], s[3], "segment"); });
      const motifs = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg", "abcefg", "cdefg", "adef", "bcdeg", "adefg", "aefg"];
      return c2 => {
        const e = c2._e || [0, 0, 0, 0];
        const n = e[0] + 2 * e[1] + 4 * e[2] + 8 * e[3];
        c2._valeur = n;
        Object.keys(el).forEach(k => el[k].classList.toggle("allume", motifs[n].includes(k)));
      };
    }
  };
  R.et = porte("Porte ET (AND)", "ET", (a, b) => a && b, ET);
  R.ou = porte("Porte OU (OR)", "OU", (a, b) => a || b, OU);
  R.non_et = porte("Porte NON-ET (NAND)", "NAND", (a, b) => !(a && b), ET, true);
  R.non_ou = porte("Porte NON-OU (NOR)", "NOR", (a, b) => !(a || b), OU, true);
  R.oux = porte("Porte OU exclusif (XOR)", "XOR", (a, b) => a !== b, OUX);
  R.non = {
    nom: "Porte NON (inverseur)", court: "NON", cat: "Portes", prefixe: "P",
    bornes: [[0, 0], [4, 0]], sens: ["e", "s"], props: [],
    eval: e => [e[0] ? 0 : 1],
    dessin(d) { d.l(0, 0, 22, 0); d.p("M22,-16 L56,0 L22,16 Z", "plein"); d.c(60, 0, 4, "plein"); d.l(64, 0, 80, 0); }
  };
  R.basculeD = {
    nom: "Bascule D (mémoire 1 bit)", court: "Bascule D", cat: "Mémoire", prefixe: "FF",
    bornes: [[0, 0], [0, 2], [4, 0], [4, 2]], sens: ["e", "e", "s", "s"], props: [],
    eval: (e, c) => {
      // Front montant de l'horloge : Q prend la valeur de D.
      if (e[1] === 1 && c._h === 0) c._q = e[0];
      c._h = e[1];
      c._q = c._q || 0;
      return [c._q, c._q ? 0 : 1];
    },
    dessin(d) {
      d.r(14, -14, 52, 68, "plein", 4);
      d.l(0, 0, 14, 0); d.l(0, 40, 14, 40); d.l(66, 0, 80, 0); d.l(66, 40, 80, 40);
      d.t(24, 0, "D", "txt"); d.p("M14,34 L22,40 L14,46"); d.t(54, 0, "Q", "txt"); d.t(54, 40, "Q̄", "txt");
    }
  };
  LS.composantsLogiques = R;

  /* ---------- Moteur logique ---------- */
  LS.moteurLogique = {
    creer(schema, reg) {
      const sim = {
        t: 0, valeurs: [], conflits: new Set(),
        preparer() {
          this.reseau = LS.construireReseau(schema, reg);
          schema.compos.forEach(c => { c._nets = this.reseau.bornes[c.id] || []; });
          this.valeurs = new Array(this.reseau.nbNets).fill(0);
          this.evaluer();
        },
        evaluer() {
          const n = this.reseau.nbNets;
          for (let iter = 0; iter < 30; iter++) {
            const nouv = new Array(n).fill(null);
            const conflits = new Set();
            schema.compos.forEach(c => {
              const def = reg[c.type];
              // Entrées (bornes « e ») → fonction → sorties (bornes « s »), chacune dans l'ordre des bornes.
              const e = [];
              def.sens.forEach((sens, i) => { if (sens === "e") e.push(c._nets[i] !== undefined ? (this.valeurs[c._nets[i]] || 0) : 0); });
              c._e = e;
              const sorties = def.eval(e, c, this.t) || [];
              let k = 0;
              def.sens.forEach((sens, i) => {
                if (sens !== "s") return;
                const v = sorties[k++];
                const net = c._nets[i];
                if (v === null || v === undefined || net === undefined) return;
                if (nouv[net] !== null && nouv[net] !== v) conflits.add(net);
                nouv[net] = v;
              });
            });
            let change = false;
            for (let i = 0; i < n; i++) { const v = nouv[i] === null ? 0 : nouv[i]; if (v !== this.valeurs[i]) { this.valeurs[i] = v; change = true; } }
            this.conflits = conflits;
            if (!change) break;
          }
        },
        avancer(dt) { this.t += dt; this.evaluer(); },
        tension(net) { return net === undefined ? 0 : (this.valeurs[net] ? 5 : 0); },
        couleurNet(net) { if (net === undefined) return ""; if (this.conflits.has(net)) return "#e74c3c"; return this.valeurs[net] ? "#2ecc71" : ""; },
        valeur(c, borne) { const n = c._nets[borne]; return n === undefined ? 0 : this.valeurs[n]; },
        mesures(c, def) {
          return def.bornes.map((b, i) => [(def.sens[i] === "e" ? "Entrée " : "Sortie ") + (i + 1), String(this.valeur(c, i))]);
        },
        toucher() { this.evaluer(); }
      };
      return sim;
    }
  };

  LS.simLogique = function (conteneur, config) {
    return new LS.EditeurCircuit(conteneur, Object.assign({ registre: LS.composantsLogiques, moteur: LS.moteurLogique, electrique: false, basculeDirecte: true }, config));
  };
})();
