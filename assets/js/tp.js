/* Page de TP : charge le TP demandé (?id=...), crée la simulation, vérifie les objectifs en direct,
   affiche les notions liées (tirées des cartes mentales) et les questions. */
(function () {
  "use strict";
  const LS = window.LS;
  LS.sims = LS.sims || {};
  LS.sims.circuit = (el, cfg) => LS.simCircuit(el, cfg);
  LS.sims.logique = (el, cfg) => LS.simLogique(el, cfg);

  async function demarrer() {
    LS.entete("tps");
    const id = LS.param("id");
    const page = document.getElementById("page");
    if (!id) { page.innerHTML = "<p>Aucun TP choisi. <a href='index.html#tps'>Voir la liste</a>.</p>"; return; }
    try { await LS.charger("contenu/tps/" + id + ".js"); }
    catch (e) { page.innerHTML = `<p>TP introuvable : ${LS.echapper(id)}. <a href="index.html#tps">Voir la liste</a>.</p>`; return; }
    const tp = LS.tps[id];
    document.title = tp.titre + " · Learn Space";
    // Cartes mentales des notions liées.
    const cartes = [...new Set((tp.notions || []).map(n => n[0]))];
    await Promise.all(cartes.map(c => LS.charger("contenu/cartes/" + c + ".js").catch(() => null)));

    const etat = LS.etatTP(id);
    etat.objectifs = etat.objectifs || {}; etat.questions = etat.questions || {};
    etat.total = (tp.objectifs || []).length + (tp.questions || []).length;
    LS.enregistrerTP(id, etat);
    const pos = LS.positionDansParcours ? LS.positionDansParcours("tp", id) : null;

    const entete = LS.el("div", {}, [
      LS.el("div", { class: "chemin-tp" }, [
        LS.el("a", { href: "index.html#" + (tp.domaine || "tps"), text: "← " + (LS.nomDomaine ? LS.nomDomaine(tp.domaine) : "Parcours") }),
        LS.el("span", { class: "etiquette tp", text: "TP · niveau " + (tp.niveau || 1) }),
        tp.duree ? LS.el("span", { class: "etiquette", text: "⏱ " + tp.duree }) : null
      ]),
      LS.el("h1", { text: tp.titre }),
      tp.intro ? LS.el("div", { class: "intro-tp", html: LS.texte(tp.intro) }) : null
    ]);
    const zoneSim = LS.el("div", { id: "simulation" });
    const consignes = LS.el("aside", { class: "bloc tp-consignes" });
    page.append(entete, LS.el("div", { class: "tp-grille" }, [LS.el("div", {}, [zoneSim, tp.apres ? LS.el("div", { class: "bloc", style: "margin-top:14px", html: LS.texte(tp.apres) }) : null]), consignes]));

    const fabrique = LS.sims[tp.sim];
    if (!fabrique) { zoneSim.textContent = "Simulation « " + tp.sim + " » indisponible."; return; }
    const config = Object.assign({ cleSauvegarde: tp.sauver === false ? null : "schema:" + id }, tp.config || {});
    const sim = fabrique(zoneSim, config);
    window.simulation = sim; // pratique pour explorer depuis la console

    // ----- Objectifs -----
    consignes.append(LS.el("h2", { text: "🎯 Objectifs" }));
    const blocs = (tp.objectifs || []).map((o, i) => {
      const b = LS.el("div", { class: "objectif" + (etat.objectifs[i] ? " reussi" : "") }, [
        LS.el("div", { class: "etat", text: etat.objectifs[i] ? "✓" : String(i + 1) }),
        LS.el("div", {}, [
          LS.el("div", { class: "texte", html: LS.texte(o.texte) }),
          o.indice ? LS.el("details", { class: "indice" }, [LS.el("summary", { text: "Indice" }), LS.el("div", { html: LS.texte(o.indice) })]) : null,
          LS.el("div", { class: "retour indice" })
        ])
      ]);
      consignes.append(b);
      return b;
    });
    const memos = (tp.objectifs || []).map(() => ({}));
    const bravo = LS.el("div", { class: "note astuce cache-tout", html: "<strong>Bravo !</strong> Tous les objectifs sont atteints." + (pos && pos.suivant ? ` <a href="${pos.suivant.href}">Étape suivante : ${LS.echapper(pos.suivant.titre)} →</a>` : "") });
    consignes.append(bravo);
    function verifier() {
      let tous = true;
      const courant = (tp.objectifs || []).findIndex((o, i) => !etat.objectifs[i]);
      (tp.objectifs || []).forEach((o, i) => {
        if (etat.objectifs[i]) return;
        let ok = false, msg = "";
        try {
          const r = o.verif(sim, memos[i]);
          ok = r === true || (r && r.ok);
          if (r && r.msg) msg = r.msg;
        } catch (e) { ok = false; }
        blocs[i].querySelector(".retour").innerHTML = msg && i === courant ? LS.texte(msg) : "";
        blocs[i].classList.toggle("en-cours", i === courant);
        if (ok) {
          etat.objectifs[i] = true;
          blocs[i].classList.add("reussi");
          blocs[i].querySelector(".etat").textContent = "✓";
          blocs[i].querySelector(".retour").innerHTML = o.bravo ? "✓ " + LS.texte(o.bravo) : "";
          LS.enregistrerTP(id, etat);
        } else tous = false;
      });
      (tp.objectifs || []).forEach((o, i) => { if (!etat.objectifs[i]) tous = false; });
      bravo.classList.toggle("cache-tout", !tous || !(tp.objectifs || []).length);
    }
    setInterval(verifier, 300);

    // ----- Questions -----
    if (tp.questions && tp.questions.length) {
      consignes.append(LS.el("h2", { text: "❓ Questions" }));
      tp.questions.forEach((q, i) => {
        const expl = LS.el("div", { class: "explication" });
        const choix = LS.el("div", { class: "choix" });
        q.choix.forEach((c, j) => {
          const b = LS.el("button", { html: LS.texte(c), onclick: () => {
            choix.querySelectorAll("button").forEach(x => x.classList.remove("bon", "faux"));
            if (j === q.bonne) {
              b.classList.add("bon");
              expl.innerHTML = "✓ " + LS.texte(q.explication || "Exact.");
              etat.questions[i] = true; LS.enregistrerTP(id, etat);
            } else {
              b.classList.add("faux");
              expl.innerHTML = q.indice ? LS.texte(q.indice) : "Pas tout à fait : essaie dans la simulation, puis réponds de nouveau.";
            }
          } });
          if (etat.questions[i] && j === q.bonne) b.classList.add("bon");
          choix.append(b);
        });
        consignes.append(LS.el("div", { class: "question" }, [LS.el("div", { html: `<strong>${i + 1}.</strong> ` + LS.texte(q.q) }), choix, expl]));
      });
    }

    // ----- Notions liées -----
    if (tp.notions && tp.notions.length) {
      consignes.append(LS.el("h2", { text: "📚 Notions utilisées" }));
      tp.notions.forEach(([idCarte, libelle]) => {
        const carte = LS.cartes[idCarte];
        const n = carte ? LS.chercherNoeud(carte, libelle) : null;
        const corps = LS.el("div", {});
        if (n) {
          corps.innerHTML = LS.texte(n.d || "") + (n.f ? `<div class="formule">${LS.texte(n.f)}</div>` : "") + (n.ex ? `<div class="note astuce"><strong>Exemple :</strong> ${LS.texte(n.ex)}</div>` : "") + (n.an ? `<div class="note"><strong>Analogie :</strong> ${LS.texte(n.an)}</div>` : "");
          corps.append(LS.el("a", { href: `carte.html?id=${idCarte}&n=${LS.slug(n.t)}`, text: "Voir dans la carte mentale →" }));
        } else corps.textContent = "(notion à venir)";
        consignes.append(LS.el("details", { class: "notion" }, [LS.el("summary", { text: n ? n.t : libelle }), corps]));
      });
    }
    if (tp.suite) consignes.append(LS.el("h2", { text: "🚀 Pour aller plus loin" }), LS.el("div", { html: LS.texte(tp.suite) }));
    if (pos) {
      const nav = LS.el("div", { style: "display:flex;justify-content:space-between;gap:8px;margin-top:16px;flex-wrap:wrap" });
      if (pos.precedent) nav.append(LS.el("a", { class: "btn secondaire petit", href: pos.precedent.href, text: "← " + pos.precedent.titre }));
      if (pos.suivant) nav.append(LS.el("a", { class: "btn petit", href: pos.suivant.href, text: pos.suivant.titre + " →" }));
      consignes.append(nav);
    }
  }
  document.addEventListener("DOMContentLoaded", demarrer);
})();
