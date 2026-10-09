// Version wolof de sept phrases clés (accueil et fiche d'une commune). Textes proposés puis relus et validés par un locuteur de l'équipe.
// Le français reste la langue par défaut : le bouton « Wolof » de l'accueil bascule ces étiquettes, et le choix suit le lien vers la fiche (adresse ?langue=wo).
const WOLOF = {
  "Chercher ma commune": "Seet sama komin",
  "Comment est servie votre commune ?": "Ndax sa komin am na ndimbal bu doy ci wér-gi-yaram ak njàng ?",
  "Nom de la commune": "Tur-u komin bi",
  "Voir la fiche": "Xool xët bi",
  "Postes de santé manquants": "Poste santé yi ñu soxla te amuñu",
  "Population": "Waa-dëkk yi (limu nit ñi)",
  "Imprimer la fiche de décision": "Móol xët-u dogal bi"
};

function appliquerLangue(code) {
  const wo = code === "wo";
  document.documentElement.setAttribute("data-langue", wo ? "wo" : "fr");
  document.querySelectorAll(".hero-saut, .finder label, .finder button[type=submit], .kpi-lab, #imprimerFiche").forEach(el => {
    const fr = el.dataset.fr || el.textContent.trim();
    if (!(fr in WOLOF)) return;
    el.dataset.fr = fr; el.textContent = wo ? WOLOF[fr] : fr;
    if (wo) el.setAttribute("lang", "wo"); else el.removeAttribute("lang");
  });
  const champ = document.getElementById("finderInput");
  if (champ) champ.placeholder = wo ? WOLOF["Nom de la commune"] : "Nom de la commune";
  const bouton = document.getElementById("langueBtn");
  if (bouton) { bouton.textContent = wo ? "Français" : "Wolof"; bouton.setAttribute("aria-pressed", wo ? "true" : "false"); bouton.setAttribute("lang", wo ? "fr" : "wo"); }
}

(function () {
  let code = "fr";
  try { code = new URLSearchParams(location.search).get("langue") === "wo" ? "wo" : "fr"; } catch (e) { /* adresse illisible : on reste en français */ }
  const bouton = document.getElementById("langueBtn");
  if (bouton) bouton.addEventListener("click", () => appliquerLangue(document.documentElement.getAttribute("data-langue") === "wo" ? "fr" : "wo"));
  if (code === "wo") appliquerLangue("wo");
})();
