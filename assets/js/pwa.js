/* Application installable et hors ligne (seulement quand le site est servi en http(s) ; en ouvrant les
   fichiers depuis le disque, rien ne se passe ici).
   - Enregistre le service worker (sw.js), qui garde tout le site en cache dès la première visite.
   - Bouton « Installer l'application » dans l'élément #installer-app (accueil), quand le navigateur le
     propose (beforeinstallprompt) ; masqué si l'application est déjà installée ou si c'est impossible.
     Sur iPhone et iPad, une courte aide (Partager, puis « Sur l'écran d'accueil »).
   - Quand une nouvelle version du site est prête : petit avis « Nouvelle version » avec « Recharger ».
     Quand la nouvelle version prend la main, chaque onglet ouvert se recharge (sinon il garderait
     l'ancien code et chargerait des fichiers de la nouvelle version), y compris l'onglet de la toute
     première visite. Un onglet où une réponse est en cours de saisie attend qu'elle soit validée ou
     effacée : rien n'est perdu, et d'ici là il ne charge plus aucun fichier (pas de mélange).
   - Demande au navigateur un stockage persistant (moins de risque que le cache soit effacé). */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  if (!/^https?:$/.test(location.protocol)) return;
  const installee = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

  /* ---------- Service worker et mises à jour ---------- */
  function avisMiseAJour(attente) {
    if (document.getElementById("avis-maj")) return;
    const d = document.createElement("div");
    d.id = "avis-maj"; d.className = "avis-maj"; d.setAttribute("role", "status");
    d.innerHTML = '<span>Nouvelle version du site prête (les onglets ouverts seront rechargés, sauf pendant une réponse en cours).</span><button type="button" class="btn petit">Recharger</button>';
    d.querySelector("button").addEventListener("click", () => { attente.postMessage({ type: "activer" }); d.querySelector("button").disabled = true; });
    document.body.append(d);
  }
  // Une réponse est-elle en cours de saisie dans la page (champ de texte non vide et modifiable) ?
  LS.saisieEnCours = () => Array.from(document.querySelectorAll("input, textarea")).some(e =>
    !e.disabled && !e.readOnly && !/^(hidden|checkbox|radio|range|button|submit|color)$/i.test(e.type || "") && String(e.value || "").trim() !== "");
  // Recharge la page, sauf si une saisie est en cours : on attend alors qu'elle soit validée ou effacée,
  // sans charger de fichier d'ici là (LS.charger mis en attente).
  function rechargerSansPerte() {
    if (!LS.saisieEnCours()) return location.reload();
    LS.charger = () => new Promise(() => {});
    const d = document.getElementById("avis-maj") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "avis-maj", className: "avis-maj" }));
    d.setAttribute("role", "status");
    d.innerHTML = "<span>Nouvelle version installée : la page se rechargera dès que ta réponse sera validée ou effacée.</span><button type=\"button\" class=\"btn petit\">Recharger maintenant</button>";
    d.querySelector("button").addEventListener("click", () => location.reload());
    const veille = setInterval(() => { if (!LS.saisieEnCours()) { clearInterval(veille); location.reload(); } }, 1000);
  }
  if ("serviceWorker" in navigator) {
    // « controle » : la page est-elle déjà contrôlée par une version ? La toute première prise en main
    // (première visite) ne recharge rien mais met « controle » à vrai : la version suivante rechargera
    // aussi cet onglet.
    let controle = !!navigator.serviceWorker.controller, recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!controle) { controle = true; return; }
      if (recharge) return;
      recharge = true;
      rechargerSansPerte();
    });
    window.addEventListener("load", () => {
      // updateViaCache « none » : sw.js et sw-fichiers.js sont toujours relus sur le réseau pour chercher une mise à jour.
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
        // Une version attend déjà, ou une nouvelle arrive alors qu'une ancienne contrôle la page.
        const suivre = w => w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) avisMiseAJour(w); });
        if (reg.waiting && navigator.serviceWorker.controller) avisMiseAJour(reg.waiting);
        suivre(reg.installing);
        reg.addEventListener("updatefound", () => suivre(reg.installing));
      }).catch(() => { /* navigateur qui refuse : le site marche quand même en ligne */ });
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    });
  }

  /* ---------- Installation ---------- */
  let proposition = null;
  const aideIosFermee = () => { try { return localStorage.getItem("learnspace:aideIosFermee") === "true"; } catch (e) { return false; } };
  function place() { return document.getElementById("installer-app"); }
  function afficher() {
    const p = place();
    if (!p) return;
    p.innerHTML = "";
    if (installee()) { p.hidden = true; return; }
    if (proposition) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn petit secondaire installer";
      b.innerHTML = (LS.icone ? LS.icone("installer") : "") + "<span>Installer l'application</span>";
      b.addEventListener("click", async () => {
        const e = proposition; proposition = null;
        e.prompt();
        try { await e.userChoice; } catch (x) { /* fermé */ }
        afficher();
      });
      p.append(b); p.hidden = false;
    } else if (ios && !aideIosFermee()) {
      const t = document.createElement("span");
      t.textContent = "Pour l'installer sur iPhone ou iPad : touche Partager, puis « Sur l'écran d'accueil ». ";
      const f = document.createElement("button");
      f.type = "button"; f.className = "btn petit secondaire"; f.textContent = "Fermer";
      f.addEventListener("click", () => { try { localStorage.setItem("learnspace:aideIosFermee", "true"); } catch (e) { /* ignoré */ } p.hidden = true; });
      p.append(t, f); p.hidden = false;
    } else p.hidden = true;
  }
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); proposition = e; afficher(); });
  window.addEventListener("appinstalled", () => { proposition = null; afficher(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", afficher); else afficher();
})();
