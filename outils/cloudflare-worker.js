// Cloudflare Workers : ne sert qu'à la racine. Les fichiers statiques de _site/ sont servis
// directement ; ce code ne tourne que si aucun fichier ne correspond (html_handling « none »). On
// renvoie alors « / » vers index.html et le reste vers une 404. Aucune donnée n'est lue ni gardée.
export default {
  async fetch(requete, env) {
    const url = new URL(requete.url);
    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, requete));
    }
    return new Response("Page introuvable", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
};
