/* Page de TP : charge le TP demandé (?id=...), crée la simulation, vérifie les objectifs en direct,
   affiche les notions liées (tirées des cartes mentales) et les questions. */
(function () {
  "use strict";
  const LS = window.LS;
  LS.sims = LS.sims || {};
  LS.sims.circuit = (el, cfg) => LS.simCircuit(el, cfg);
  LS.sims.logique = (el, cfg) => LS.simLogique(el, cfg);

  /* Scripts à charger pour chaque simulation (dans l'ordre) : la page ne charge que ce dont le TP a
     besoin, ce qui l'allège beaucoup sur une connexion faible. tests/pedagogie.test.js vérifie la table. */
  const CIRCUIT = ["circuit/reseau", "circuit/moteur-electrique", "circuit/composants-elec", "circuit/editeur"];
  const fichier = f => ["sims/outils-sim"].concat(f);
  LS.FICHIERS_SIMS = {
    circuit: CIRCUIT, logique: CIRCUIT.concat(["circuit/logique"]),
    moteur4t: fichier(["sims/modele-moteur", "sims/mecanique"]), multicylindre: fichier(["sims/modele-moteur", "sims/mecanique"]),
    courbesMoteur: fichier(["sims/modele-moteur", "sims/mecanique"]), moteur2t: fichier(["sims/modele-moteur", "sims/mecanique"]),
    thermistance: fichier(["sims/esp32", "sims/capteurs"]), ultrason: fichier(["sims/esp32", "sims/capteurs"]),
    imu: fichier(["sims/esp32", "sims/capteurs"]), etalonnage: fichier(["sims/esp32", "sims/capteurs"])
  };
  [["transmission", "engrenages chaineMoto embrayage boite differentiel"], ["electromecanique", "moteurCC alternateur transformateur asynchrone pasAPas"],
    ["telecom", "signal modulation bandePassante uart encapsulation ipv4 commutation"], ["numerique", "binaire echantillonnage"],
    ["esp32", "esp32"], ["drone", "propulsion pidAltitude mixage"], ["maths", "trigo complexes derivees exponentielle statistiques"],
    ["solaire", "panneauSolaire batterie regulateurSolaire installationSolaire"], ["batiment", "protection differentiel chuteTension"],
    ["ia", "neurone surapprentissage spectrogramme evaluation fuite"]
  ].forEach(([f, noms]) => noms.split(" ").forEach(n => { LS.FICHIERS_SIMS[n] = fichier(["sims/" + f]); }));
  async function chargerSimulation(nom) {
    for (const f of LS.FICHIERS_SIMS[nom] || []) await LS.charger("assets/js/" + f + ".js");
  }

  /* ---------- Objectifs à réponse saisie ----------
     { texte, reponse: { valeur, tolerance, tolRel, unite }, verif? } : valeur = nombre, texte, liste
     de textes acceptés ou fonction (sim) → valeur ; « verif », si présent, doit être vrai au moment de
     répondre (montage ou réglage demandé). Ou { texte, saisie: (texte, sim) → bool | { ok, msg } }. */
  const sansAccent = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  LS.normaliserReponse = t => sansAccent(t).toLowerCase().replace(/[\s\u00a0\u202f]+/g, "").replace(/[«»"']/g, "");
  LS.lireNombre = function (t) {
    const m = String(t).replace(/[\s\u00a0\u202f]/g, "").replace(",", ".").match(/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i);
    return m ? parseFloat(m[0]) : NaN;
  };
  LS.controlerReponse = function (o, texte, sim) {
    if (!String(texte).trim()) return { ok: false, msg: "Écris ta réponse dans le champ." };
    if (o.saisie) {
      const r = o.saisie(texte, sim);
      return r === true ? { ok: true } : r && r.ok !== undefined ? r : { ok: false };
    }
    const rep = o.reponse, v = typeof rep.valeur === "function" ? rep.valeur(sim) : rep.valeur;
    if (typeof v === "number") {
      const x = LS.lireNombre(texte);
      if (isNaN(x)) return { ok: false, msg: "Il faut un nombre" + (rep.unite ? " (en " + rep.unite + ")" : "") + "." };
      const tol = Math.max(rep.tolerance || 0, Math.abs(v) * (rep.tolRel || 0), 1e-9);
      return { ok: Math.abs(x - v) <= tol };
    }
    const n = LS.normaliserReponse(texte);
    return { ok: [].concat(v).some(a => LS.normaliserReponse(a) === n) };
  };

  async function demarrer() {
    LS.entete("tps");
    const id = LS.param("id");
    const page = document.getElementById("page");
    if (!id) { page.innerHTML = "<p>Aucun TP choisi. <a href='index.html#tps'>Voir la liste</a>.</p>"; return; }
    try { await LS.charger("contenu/tps/" + id + ".js"); }
    catch (e) { page.innerHTML = `<p>TP introuvable : ${LS.echapper(id)}. <a href="index.html#tps">Voir la liste</a>.</p>`; return; }
    const tp = LS.tps[id];
    try { await chargerSimulation(tp.sim); } catch (e) { page.textContent = "Impossible de charger la simulation de ce TP."; return; }
    document.title = tp.titre + " · Learn Space";
    // Cartes mentales des notions liées.
    const cartes = [...new Set((tp.notions || []).map(n => n[0]))];
    await Promise.all(cartes.map(c => LS.charger("contenu/cartes/" + c + ".js").catch(() => null)));

    const etat = LS.etatTP(id);
    etat.objectifs = etat.objectifs || {}; etat.questions = etat.questions || {};
    etat.total = (tp.objectifs || []).length + (tp.questions || []).length;
    LS.enregistrerTP(id, etat);
    const pos = LS.positionDansParcours ? LS.positionDansParcours("tp", id) : null;

    if (LS.jeu) LS.jeu.visiter("tp", id);
    const inf = (LS.jeu && LS.jeu.DOMAINES[tp.domaine]) || { code: "TP", h: 28 };
    const nObj = (tp.objectifs || []).length;
    const progMission = LS.el("div", { class: "mission-prog" });
    const premiereVisite = !Object.keys(etat.objectifs).length && !Object.keys(etat.questions).length;
    const entete = LS.el("div", { class: "tp-entete", style: "--h:" + inf.h }, [
      LS.el("div", { class: "chemin-tp" }, [
        LS.el("a", { class: "retour-atelier", href: "index.html#" + (tp.domaine || "ateliers") }, [LS.el("span", { class: "marquage mini", text: inf.code, "aria-hidden": "true" }), LS.el("span", { text: "← " + (LS.nomDomaine ? LS.nomDomaine(tp.domaine) : "Ateliers") })]),
        LS.el("span", { class: "difficulte", "aria-label": "Difficulté " + Math.min(3, tp.niveau || 1) + " sur 3" }, [LS.el("span", { text: "Difficulté" }), ...[1, 2, 3].map(k => LS.el("i", { class: k <= (tp.niveau || 1) ? "on" : "" }))]),
        tp.duree ? LS.el("span", { class: "etiquette", text: tp.duree }) : null
      ]),
      LS.el("h1", { text: tp.titre }),
      progMission,
      tp.securite ? LS.el("p", { class: "securite", role: "note" }, [LS.el("strong", { text: "Ici, on simule. " }),
        LS.el("span", { text: tp.securite === "batterie" ? "En vrai, n'ouvre jamais une batterie, ne la perce pas et ne la court-circuite pas : elle peut chauffer et prendre feu. Demande à un adulte." : "En vrai, ne touche jamais le 220 V : il peut tuer. Seul un électricien travaille dessus, courant coupé. Demande à un adulte." })]) : null,
      tp.intro ? LS.el("details", { class: "briefing", open: premiereVisite ? "open" : null }, [LS.el("summary", { text: "Ce que tu vas faire" }), LS.el("div", { class: "intro-tp", html: LS.texte(tp.intro) })]) : null
    ]);
    const zoneSim = LS.el("div", { id: "simulation" });
    const consignes = LS.el("aside", { class: "tp-consignes", id: "consignes" });
    page.append(entete, LS.el("div", { class: "tp-grille" }, [LS.el("div", {}, [zoneSim, tp.apres ? LS.el("div", { class: "bloc", style: "margin-top:14px", html: LS.texte(tp.apres) }) : null]), consignes]));
    // Onglets du panneau : mission, quiz, notions, pour aller plus loin.
    const onglets = LS.el("div", { class: "onglets-tp", role: "tablist", "aria-label": "Panneau du TP" });
    const panneaux = {};
    const ajouterOnglet = (cle, nom) => {
      const pan = LS.el("div", { class: "panneau-tp", id: "pan-" + cle, role: "tabpanel", hidden: "hidden" });
      const b = LS.el("button", { class: "onglet-tp", role: "tab", id: "tab-" + cle, "aria-controls": "pan-" + cle, "aria-selected": "false", onclick: () => ouvrir(cle) }, [LS.el("span", { text: nom }), LS.el("span", { class: "compte" })]);
      onglets.append(b); consignes.append(pan); panneaux[cle] = { pan, b };
      return pan;
    };
    consignes.append(onglets);
    const ouvrir = cle => Object.keys(panneaux).forEach(k => { const o = panneaux[k], v = k === cle; o.pan.hidden = !v; o.b.setAttribute("aria-selected", v ? "true" : "false"); o.b.classList.toggle("actif", v); });
    const panMission = ajouterOnglet("mission", "Mission");
    const panQuiz = tp.questions && tp.questions.length ? ajouterOnglet("quiz", "Questions") : null;
    const panNotions = tp.notions && tp.notions.length ? ajouterOnglet("notions", "Notions") : null;
    const panPlus = tp.suite || pos ? ajouterOnglet("plus", "Aller plus loin") : null;
    ouvrir("mission");

    const fabrique = LS.sims[tp.sim];
    if (!fabrique) { zoneSim.textContent = "Simulation « " + tp.sim + " » indisponible."; return; }
    const config = Object.assign({ cleSauvegarde: tp.sauver === false ? null : "schema:" + id }, tp.config || {});
    const sim = fabrique(zoneSim, config);
    window.simulation = sim; // pratique pour explorer depuis la console

    // ----- Objectifs -----

    etat.essais = etat.essais || {};
    const aReponse = o => !!(o.reponse || o.saisie);
    // TP « ordre: true » : un objectif n'est vérifié (ou sa réponse acceptée) qu'une fois les précédents atteints.
    const verrouille = i => !!tp.ordre && (tp.objectifs || []).some((o, j) => j < i && !etat.objectifs[j]);
    const reussir = (i, o) => {
      etat.objectifs[i] = true;
      blocs[i].classList.add("reussi");
      blocs[i].querySelector(".etat").textContent = "✓";
      blocs[i].querySelector(".retour").innerHTML = o.bravo ? "✓ " + LS.texte(o.bravo) : "";
      const champ = blocs[i].querySelector(".saisie");
      if (champ) champ.querySelectorAll("input, button").forEach(x => { x.disabled = true; });
      LS.enregistrerTP(id, etat);
    };
    const blocs = [];
    (tp.objectifs || []).forEach((o, i) => {
      let zoneSaisie = null;
      if (aReponse(o)) {
        const entree = LS.el("input", { type: "text", id: "reponse-" + i, inputmode: o.reponse && typeof o.reponse.valeur === "number" ? "decimal" : "text", autocomplete: "off", placeholder: "Ta réponse" + (o.reponse && o.reponse.unite ? " (" + o.reponse.unite + ")" : "") });
        const essais = LS.el("span", { class: "essais" });
        const majEssais = () => { const n = etat.essais["o" + i] || 0; essais.textContent = n ? n + (n > 1 ? " essais" : " essai") : ""; };
        const valider = () => {
          if (etat.objectifs[i]) return;
          const retour = blocs[i].querySelector(".retour");
          if (verrouille(i)) { retour.innerHTML = "Atteins d'abord les objectifs précédents."; return; }
          if (o.verif) {
            let pret = false;
            try { const r = o.verif(sim, memos[i]); pret = r === true || (r && r.ok); } catch (e) { pret = false; }
            if (!pret) { retour.innerHTML = LS.texte(o.condition || "Règle d'abord la simulation comme demandé, puis réponds."); return; }
          }
          let r;
          try { r = LS.controlerReponse(o, entree.value, sim); } catch (e) { r = { ok: false }; }
          if (!String(entree.value).trim()) { retour.innerHTML = LS.texte(r.msg || ""); return; }
          etat.essais["o" + i] = (etat.essais["o" + i] || 0) + 1; majEssais(); LS.enregistrerTP(id, etat);
          if (r.ok) reussir(i, o);
          else retour.innerHTML = "✗ " + LS.texte(r.msg || "Ce n'est pas ça : refais le calcul et réessaie.") + (o.aide && etat.essais["o" + i] >= 2 ? " " + LS.texte(o.aide) : "");
        };
        entree.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); valider(); } });
        zoneSaisie = LS.el("div", { class: "saisie" }, [entree, LS.el("button", { class: "btn petit", text: "Valider", onclick: valider }), essais]);
        majEssais();
        if (etat.objectifs[i]) zoneSaisie.querySelectorAll("input, button").forEach(x => { x.disabled = true; });
      }
      const b = LS.el("div", { class: "objectif" + (etat.objectifs[i] ? " reussi" : "") }, [
        LS.el("div", { class: "etat", text: etat.objectifs[i] ? "✓" : String(i + 1) }),
        LS.el("div", { class: "corps-objectif" }, [
          LS.el("div", { class: "texte", html: LS.texte(o.texte) }),
          zoneSaisie,
          o.indice ? LS.el("details", { class: "indice" }, [LS.el("summary", { text: "Indice" }), LS.el("div", { html: LS.texte(o.indice) })]) : null,
          LS.el("div", { class: "retour indice" })
        ])
      ]);
      panMission.append(b);
      blocs.push(b);
    });
    const memos = (tp.objectifs || []).map(() => ({}));
    const bravo = LS.el("div", { class: "note astuce cache-tout", html: "<strong>Bravo !</strong> Tous les objectifs sont atteints." + (pos && pos.suivant ? ` <a href="${pos.suivant.href}">Étape suivante : ${LS.echapper(pos.suivant.titre)} →</a>` : "") });
    panMission.append(bravo);
    // Barre « objectif en cours » (téléphone) et progression de la mission.
    const barreObj = LS.el("button", { class: "barre-objectif", onclick: () => { ouvrir("mission"); consignes.scrollIntoView({ behavior: "smooth", block: "start" }); } });
    document.body.append(barreObj);
    const voyantsMission = () => LS.el("span", { class: "bargraphe mission", style: "--n:" + Math.max(1, nObj) }, (tp.objectifs || []).map((o, i) => LS.el("i", { class: etat.objectifs[i] ? "on" : "" })));
    let dernierAffiche = "";
    function majMission() {
      const faits = (tp.objectifs || []).filter((o, i) => etat.objectifs[i]).length;
      const cle = faits + "/" + nObj;
      if (cle === dernierAffiche) return;
      dernierAffiche = cle;
      progMission.innerHTML = "";
      progMission.append(LS.el("span", { class: "mission-texte", text: "Objectifs réussis : " + cle.replace("/", " sur ") }), voyantsMission());
      panneaux.mission.b.querySelector(".compte").textContent = cle;
      const i = (tp.objectifs || []).findIndex((o, k) => !etat.objectifs[k]);
      barreObj.innerHTML = "";
      if (i < 0) barreObj.append(LS.el("span", { class: "num fini", text: "✓" }), LS.el("span", { class: "txt", text: "Mission accomplie : voir la suite" }));
      else barreObj.append(LS.el("span", { class: "num", text: String(i + 1) }), LS.el("span", { class: "txt", text: String(tp.objectifs[i].texte).replace(/\*\*|`/g, "") }), LS.el("span", { class: "cpt", text: cle }));
    }
    majMission();
    function verifier() {
      let tous = true;
      const courant = (tp.objectifs || []).findIndex((o, i) => !etat.objectifs[i]);
      (tp.objectifs || []).forEach((o, i) => {
        if (etat.objectifs[i]) return;
        const bloque = verrouille(i);
        blocs[i].classList.toggle("verrouille", bloque);
        blocs[i].classList.toggle("en-cours", i === courant);
        if (aReponse(o) || bloque) { tous = false; return; }
        let ok = false, msg = "";
        try {
          const r = o.verif(sim, memos[i]);
          ok = r === true || (r && r.ok);
          if (r && r.msg) msg = r.msg;
        } catch (e) { ok = false; }
        blocs[i].querySelector(".retour").innerHTML = msg && i === courant ? LS.texte(msg) : "";
        if (ok) reussir(i, o);
        else tous = false;
      });
      (tp.objectifs || []).forEach((o, i) => { if (!etat.objectifs[i]) tous = false; });
      bravo.classList.toggle("cache-tout", !tous || !(tp.objectifs || []).length);
      majMission();
    }
    setInterval(verifier, 300);

    // ----- Questions -----
    if (tp.questions && tp.questions.length) {

      // Une question est réussie si la bonne réponse vient en 2 essais au plus ; après 2 erreurs, la
      // bonne réponse et l'explication s'affichent, mais la question ne compte pas comme réussie.
      etat.questionsVues = etat.questionsVues || {};
      tp.questions.forEach((q, i) => {
        const expl = LS.el("div", { class: "explication" });
        const choix = LS.el("div", { class: "choix" });
        const essais = LS.el("div", { class: "essais" });
        const cle = "q" + i;
        const majEssais = () => {
          const n = etat.essais[cle] || 0;
          essais.textContent = etat.questions[i] ? "Réussie" + (n > 1 ? " au 2e essai" : n === 1 ? " du premier coup" : "") : etat.questionsVues[i] ? "Réponse montrée après " + n + " essais" : n ? n + (n > 1 ? " essais" : " essai") : "";
        };
        const montrer = () => {
          choix.querySelectorAll("button").forEach((x, k) => { x.disabled = true; if (k === q.bonne) x.classList.add("bon"); });
          expl.innerHTML = (etat.questions[i] ? "✓ " : "La bonne réponse est surlignée. ") + LS.texte(q.explication || "");
        };
        q.choix.forEach((c, j) => {
          const b = LS.el("button", { html: LS.texte(c), onclick: () => {
            if (etat.questions[i] || etat.questionsVues[i]) return;
            etat.essais[cle] = (etat.essais[cle] || 0) + 1;
            choix.querySelectorAll("button").forEach(x => x.classList.remove("faux"));
            if (j === q.bonne) { etat.questions[i] = true; montrer(); }
            else {
              b.classList.add("faux"); b.disabled = true;
              if (etat.essais[cle] >= 2) { etat.questionsVues[i] = true; montrer(); }
              else expl.innerHTML = q.indice ? LS.texte(q.indice) : "Pas tout à fait : essaie dans la simulation, puis réponds de nouveau (encore 1 essai).";
            }
            LS.enregistrerTP(id, etat); majEssais();
          } });
          choix.append(b);
        });
        if (etat.questions[i] || etat.questionsVues[i]) montrer();
        majEssais();
        panQuiz.append(LS.el("div", { class: "question" }, [LS.el("div", { html: `<strong>${i + 1}.</strong> ` + LS.texte(q.q) }), choix, expl, essais]));
      });
    }

    // ----- Notions liées -----
    if (tp.notions && tp.notions.length) {

      tp.notions.forEach(([idCarte, libelle]) => {
        const carte = LS.cartes[idCarte];
        const n = carte ? LS.chercherNoeud(carte, libelle) : null;
        const corps = LS.el("div", {});
        if (n) {
          corps.innerHTML = LS.texte(n.d || "") + (n.f ? `<div class="formule">${LS.texte(n.f)}</div>` : "") + (n.ex ? `<div class="note astuce"><strong>Exemple :</strong> ${LS.texte(n.ex)}</div>` : "") + (n.an ? `<div class="note"><strong>Analogie :</strong> ${LS.texte(n.an)}</div>` : "");
          corps.append(LS.el("a", { href: `carte.html?id=${idCarte}&n=${LS.slug(n.t)}`, text: "Voir dans la carte mentale →" }));
        } else corps.textContent = "(notion à venir)";
        panNotions.append(LS.el("details", { class: "notion" }, [LS.el("summary", { text: n ? n.t : libelle }), corps]));
      });
    }
    if (tp.suite) panPlus.append(LS.el("div", { html: LS.texte(tp.suite) }));
    if (pos) {
      const nav = LS.el("div", { style: "display:flex;justify-content:space-between;gap:8px;margin-top:16px;flex-wrap:wrap" });
      if (pos.precedent) nav.append(LS.el("a", { class: "btn secondaire petit", href: pos.precedent.href, text: "← " + pos.precedent.titre }));
      if (pos.suivant) nav.append(LS.el("a", { class: "btn petit", href: pos.suivant.href, text: pos.suivant.titre + " →" }));
      panPlus.append(nav);
    }
    // Compteur du quiz
    const majQuiz = () => { if (panQuiz) panneaux.quiz.b.querySelector(".compte").textContent = Object.keys(etat.questions).length + "/" + tp.questions.length; };
    majQuiz(); setInterval(majQuiz, 1000);
    // Mission accomplie : tout le TP (objectifs et questions) est réussi.
    document.addEventListener("ls:tp-termine", ev => {
      if (ev.detail.id !== id) return;
      const fermer = () => fond.remove();
      const fond = LS.el("div", { class: "fin-mission", role: "dialog", "aria-modal": "true", "aria-labelledby": "fin-titre", onclick: e => { if (e.target === fond) fermer(); } }, [
        LS.el("div", { class: "fin-carte" }, [
          LS.el("span", { class: "voyants grands", "aria-hidden": "true" }, [0, 1, 2].map(() => LS.el("i", { class: "on" }))),
          LS.el("h2", { id: "fin-titre", text: "Mission accomplie" }),
          LS.el("p", { text: tp.titre + " : tous les objectifs et toutes les questions sont réussis." }),
          LS.el("div", { class: "fin-actions" }, [
            pos && pos.suivant ? LS.el("a", { class: "btn", href: pos.suivant.href, text: "Étape suivante →" }) : null,
            LS.el("button", { class: "btn secondaire", text: "Rester ici", onclick: fermer })])
        ])]);
      document.body.append(fond);
      const b = fond.querySelector(".btn"); if (b) b.focus();
      document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { fermer(); document.removeEventListener("keydown", esc); } });
    });
  }
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("DOMContentLoaded", demarrer);
})();
