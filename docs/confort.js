// Affichage : taille du texte, contraste renforcé, animations réduites, thème. Réglages mémorisés (localStorage) quand le navigateur le permet.
// Par défaut le site respecte les réglages de l'appareil : contraste renforcé et mouvement réduit s'ils sont demandés, taille de texte du navigateur.
(function () {
  const CLE = "jappale-confort", DEFAUT = { taille: "n", contraste: "normal", mouvement: "normal" };
  let stock = {};
  try { stock = JSON.parse(localStorage.getItem(CLE) || "{}") || {}; } catch (e) { /* stockage indisponible : réglages valables pour cette page seulement */ }
  const reglages = { ...DEFAUT, ...stock };
  const html = document.documentElement, pref = q => typeof matchMedia === "function" && matchMedia(q).matches, auto = [];
  if (!stock.contraste && pref("(prefers-contrast: more)")) { reglages.contraste = "fort"; auto.push("un contraste renforcé"); }
  if (!stock.mouvement && pref("(prefers-reduced-motion: reduce)")) { reglages.mouvement = "reduit"; auto.push("moins d'animations"); }
  const NOMS = { taille: { n: "Texte de taille normale", g: "Texte grand", tg: "Texte très grand" }, contraste: { normal: "Contraste normal", fort: "Contraste renforcé" }, mouvement: { normal: "Animations conservées", reduit: "Animations réduites" }, theme: { dark: "Thème sombre", light: "Thème clair" } };
  const theme = () => html.dataset.theme || (pref("(prefers-color-scheme: dark)") ? "dark" : "light");
  function poserTheme(v) { html.dataset.theme = v; try { if (typeof memoriserTheme === "function") memoriserTheme(v); else { const tel = (navigator.maxTouchPoints > 0 || "ontouchstart" in window) && screen.width > 0 && Math.min(screen.width, screen.height) <= 640; (tel ? sessionStorage : localStorage).setItem("jappale-theme-v3", v); } } catch (e) { /* sans importance */ } }
  function appliquer() {
    if (reglages.taille === "n") html.removeAttribute("data-taille"); else html.setAttribute("data-taille", reglages.taille);
    if (reglages.contraste === "fort") html.setAttribute("data-contraste", "fort"); else html.removeAttribute("data-contraste");
    if (reglages.mouvement === "reduit") html.setAttribute("data-mouvement", "reduit"); else html.removeAttribute("data-mouvement");
    // taille de texte choisie dans le navigateur (au moins 19 px au lieu de 16) : mêmes protections de mise en page que « texte grand »
    html.removeAttribute("data-agrandi"); if (!html.hasAttribute("data-taille") && parseFloat(getComputedStyle(html).fontSize) >= 19) html.setAttribute("data-agrandi", "");
  }
  function memoriser() { try { localStorage.setItem(CLE, JSON.stringify(reglages)); } catch (e) { /* sans importance */ } }
  appliquer();
  const bouton = document.getElementById("confortBtn"); if (!bouton) return;
  const panneau = document.createElement("section"); panneau.id = "confortPanneau"; panneau.className = "confort-panneau"; panneau.hidden = true; panneau.setAttribute("role", "region"); panneau.setAttribute("aria-label", "Affichage");
  const groupe = (cle, titre, choix) => `<fieldset class="confort-groupe"><legend>${titre}</legend><div class="confort-choix">${choix.map(([v, lib]) => `<button type="button" data-reglage="${cle}" data-valeur="${v}" aria-pressed="false">${lib}</button>`).join("")}</div></fieldset>`;
  panneau.innerHTML = `<h2>Affichage</h2>`
    + (auto.length ? `<p class="confort-note" id="confortNote">Votre appareil demande ${auto.join(" et ")} : c'est déjà activé ici. Vous pouvez le changer ci-dessous.</p>` : "")
    + groupe("taille", "Taille du texte", [["n", "Normale"], ["g", "Grande"], ["tg", "Très grande"]])
    + groupe("contraste", "Contraste", [["normal", "Normal"], ["fort", "Renforcé"]])
    + groupe("mouvement", "Animations", [["normal", "Garder"], ["reduit", "Réduire"]])
    + groupe("theme", "Thème", [["dark", "Sombre"], ["light", "Clair"]])
    + `<div class="confort-actions"><button type="button" data-action="defaut">Remettre les réglages par défaut</button><button type="button" data-action="fermer">Fermer</button></div><p class="confort-etat" id="confortEtat" role="status" aria-live="polite"></p>`;
  document.body.appendChild(panneau);
  const etat = document.getElementById("confortEtat");
  const valeur = cle => cle === "theme" ? theme() : reglages[cle];
  function marquer() { panneau.querySelectorAll("[data-reglage]").forEach(b => b.setAttribute("aria-pressed", String(valeur(b.dataset.reglage) === b.dataset.valeur))); }
  const ouvreurs = () => [...document.querySelectorAll("#confortBtn, [data-confort-ouvrir]")]; let dernier = null;
  function ouvrir(oui, ouvreur) {
    panneau.hidden = !oui; ouvreurs().forEach(o => o.setAttribute("aria-expanded", String(oui)));
    if (oui) { dernier = ouvreur || dernier; marquer(); const premier = panneau.querySelector('[aria-pressed="true"]') || panneau.querySelector("button"); if (premier) premier.focus(); }
    else { const cible = dernier && document.contains(dernier) ? dernier : bouton; cible.focus(); }
  }
  document.addEventListener("click", e => { const o = e.target.closest("#confortBtn, [data-confort-ouvrir]"); if (o) ouvrir(panneau.hidden, o); });   // le bouton de l'en-tête, celui du menu et celui de la page Méthode ouvrent le même panneau
  panneau.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; const note = document.getElementById("confortNote");
    if (b.dataset.reglage === "theme") { poserTheme(b.dataset.valeur); marquer(); etat.textContent = NOMS.theme[b.dataset.valeur] + " : activé."; }
    else if (b.dataset.reglage) { reglages[b.dataset.reglage] = b.dataset.valeur; appliquer(); memoriser(); marquer(); if (note) note.hidden = true; etat.textContent = NOMS[b.dataset.reglage][b.dataset.valeur] + " : activé."; }
    else if (b.dataset.action === "defaut") { Object.assign(reglages, DEFAUT); appliquer(); memoriser(); marquer(); if (note) note.hidden = true; etat.textContent = "Réglages par défaut rétablis."; }
    else if (b.dataset.action === "fermer") ouvrir(false);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panneau.hidden) { e.preventDefault(); ouvrir(false); } });
})();
