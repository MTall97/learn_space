(function () {
  // On ne signale pas au hasard : il faut avoir posé les pointes du multimètre, et au plus un faux signalement.
  // Mesure = multimètre allumé et pointe rouge déplacée depuis sa position de départ (hors de la plaque).
  function aMesure(s) {
    if (!s.sondes) return !!s._aMesure;
    const rouge = JSON.stringify(s.sondes.rouge);
    if (s._sondeDepart === undefined) s._sondeDepart = rouge;
    const l = s.lectureMultimetre && s.lectureMultimetre();
    if (l && l.sel !== "OFF" && rouge !== s._sondeDepart) s._aMesure = true;
    return !!s._aMesure;
  }
  const enPanne = x => !!(x.coupe || (x.etat && x.etat.grille));
  function signaler(s, cible) {
    const mesure = aMesure(s);
    const faux = new Set((s.signalements || []).filter(x => !enPanne(x))).size;
    if (faux > 1) return { ok: false, msg: "Tu as signalé " + faux + " éléments sains : on ne remplace pas des pièces au hasard. Recharge la page et **mesure avant de signaler**." };
    if (!(s.signalements || []).some(cible)) return false;
    if (!mesure) return { ok: false, msg: "Tu as signalé le bon élément, mais sans aucune mesure : pose d'abord les pointes du multimètre." };
    return true;
  }
  LS.ajouterTP({
  id: "elec-11-panne",
  titre: "Recherche de panne",
  domaine: "electricite", niveau: 3, duree: "30 min",
  sim: "circuit",
  intro: "Ce tableau d'éclairage a **deux pannes** : trois lampes devraient s'allumer quand K1 est fermé, mais certaines restent éteintes. Comme en vrai, tu **ne vois pas** le courant : le seul moyen est de **mesurer** avec le multimètre.\n\nMéthode de l'électricien :\n- **sous tension**, en V⎓ : on suit la tension du + vers la lampe ; là où elle disparaît, il y a une coupure ;\n- **hors tension** (K1 ouvert), en continuité 🔊 : un fil sain bipe, un fil coupé non ; une lampe saine bipe presque (quelques dizaines d'ohms), une lampe grillée affiche OL.\n\nQuand tu as trouvé un élément en panne, clique dessus puis sur **🚩 C'est la panne !**.",
  sauver: false,
  config: {
    multimetre: true, masquerCourant: true, signalement: true,
    palette: ["lampe"],
    schema: {
      compos: [
        { type: "pile", x: 4, y: 20, p: { U: 12, r: 0.1 }, nom: "G1", fixe: true },
        { type: "interrupteur", x: 6, y: 4, p: { ferme: true }, nom: "K1", fixe: true },
        { type: "lampe", x: 16, y: 8, rot: 90, p: { Un: 12, Pn: 3 }, nom: "L1" },
        { type: "lampe", x: 24, y: 8, rot: 90, p: { Un: 12, Pn: 3 }, nom: "L2", cache: true, etat: { grille: true } },
        { type: "lampe", x: 32, y: 8, rot: 90, p: { Un: 12, Pn: 3 }, nom: "L3" }
      ],
      fils: [
        { pts: [[4, 20], [2, 20], [2, 4], [6, 4]], fixe: true },
        { pts: [[10, 4], [16, 4], [16, 8]] },
        { pts: [[16, 4], [24, 4], [24, 8]] },
        { pts: [[24, 4], [32, 4], [32, 8]], coupe: true, cache: true },
        { pts: [[16, 12], [16, 20], [8, 20]] },
        { pts: [[24, 12], [24, 20], [16, 20]] },
        { pts: [[32, 12], [32, 20], [24, 20]] }
      ]
    }
  },
  ordre: true,
  objectifs: [
    { texte: "Repère, **avec le multimètre**, le **fil coupé** et signale-le.",
      indice: "En V⎓, pointe noire sur le − de la pile ; promène la pointe rouge le long des fils du haut. La tension est là jusqu'à un point, puis disparaît.",
      verif: s => signaler(s, x => x.coupe) },
    { texte: "Entre quelles lampes se trouvait le fil coupé ? (écris leurs repères, par exemple « L1 et L2 »)",
      saisie: v => { const n = LS.normaliserReponse(v); return /l2/.test(n) && /l3/.test(n) && !/l1/.test(n); },
      aide: "Regarde les repères des lampes de part et d'autre du fil que tu as signalé." },
    { texte: "Repère la **lampe grillée**, vérifie-la au multimètre, puis signale-la.",
      indice: "Une lampe qui a 12 V à ses bornes mais reste éteinte est grillée. Vérifie hors tension en Ω : OL.",
      verif: s => signaler(s, x => x.etat && x.etat.grille) },
    { texte: "Quel est le **repère** de la lampe grillée, et qu'affichait le multimètre en Ω à ses bornes, hors tension ?",
      saisie: v => { const n = LS.normaliserReponse(v); return /l2/.test(n) && /ol|infini|∞|ouvert/.test(n); },
      aide: "Réponds par exemple « L5, OL ». Une lampe saine affiche quelques dizaines d'ohms." },
    { texte: "**Répare** : remplace le fil coupé (supprime-le et trace-en un neuf) et la lampe (🛠 Réparer). Les trois lampes doivent briller.",
      verif: s => s.liste("lampe").filter(l => (l._ueff || 0) > 11).length >= 3 && !s.schema.fils.some(f => f.coupe) }
  ],
  questions: [
    { q: "Circuit sous tension : tu lis 12 V aux bornes d'un interrupteur fermé. Que conclus-tu ?", choix: ["Il fonctionne", "Il est défectueux (contacts ouverts) : un interrupteur fermé sain a 0 V à ses bornes", "La pile est trop forte"], bonne: 1 },
    { q: "Pourquoi mesure-t-on la continuité hors tension ?", choix: ["Le multimètre envoie son propre courant ; une tension extérieure fausse la mesure", "Pour faire des économies", "Ce n'est pas utile"], bonne: 0 }
  ],
  notions: [["elec-bases", "Continuité"], ["elec-bases", "Circuit ouvert"], ["elec-bases", "Multimètre"], ["elec-bases", "En parallèle (dérivation)"]]
});
})();
