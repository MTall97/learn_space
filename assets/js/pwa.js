/* Application installable et hors ligne (seulement quand le site est servi en http(s) ; en ouvrant les
   fichiers depuis le disque, rien ne se passe ici).
   - Enregistre le service worker (sw.js), qui garde tout le site en cache dès la première visite.
   - Bouton « Installer l'application » dans l'élément #installer-app (accueil), quand le navigateur le
     propose (beforeinstallprompt) ; masqué si l'application est déjà installée ou si c'est impossible.
     Sur iPhone et iPad, une courte aide (Partager, puis « Sur l'écran d'accueil »).
   - Quand une nouvelle version du site est prête : petit avis « Nouvelle version » avec « Recharger ». */
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
    d.innerHTML = '<span>Nouvelle version du site prête.</span><button type="button" class="btn petit">Recharger</button>';
    d.querySelector("button").addEventListener("click", () => { attente.postMessage({ type: "activer" }); d.querySelector("button").disabled = true; });
    document.body.append(d);
  }
  if ("serviceWorker" in navigator) {
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recharge && LS.miseAJourDemandee) { recharge = true; location.reload(); } });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then(reg => {
        // Une version attend déjà, ou une nouvelle arrive alors qu'une ancienne contrôle la page.
        const suivre = w => w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) avisMiseAJour(w); });
        if (reg.waiting && navigator.serviceWorker.controller) avisMiseAJour(reg.waiting);
        suivre(reg.installing);
        reg.addEventListener("updatefound", () => suivre(reg.installing));
      }).catch(() => { /* navigateur qui refuse : le site marche quand même en ligne */ });
    });
    // Le clic sur « Recharger » active la nouvelle version, puis la page se recharge.
    document.addEventListener("click", ev => { if (ev.target.closest && ev.target.closest("#avis-maj button")) LS.miseAJourDemandee = true; }, true);
  }

  /* ---------- Installation ---------- */
  let proposition = null;
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
    } else if (ios) {
      p.textContent = "Pour l'installer sur iPhone ou iPad : touche Partager, puis « Sur l'écran d'accueil ».";
      p.hidden = false;
    } else p.hidden = true;
  }
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); proposition = e; afficher(); });
  window.addEventListener("appinstalled", () => { proposition = null; afficher(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", afficher); else afficher();
})();
