// Outils partagés par les pages du site (index.html, communes.html). L'outil carte (explorer.html) garde script.js.
// Tout est calculé à partir de data.js (généré par code/08), rien n'est recopié à la main.
// Les grands nombres en police grasse : l'espace fine insécable du français est presque invisible (« 1371000 »).
// On la remplace par une espace insécable ordinaire, bien lisible, pour tous les nombres affichés par le site.
if (!window.__espaceLisible) {
  window.__espaceLisible = true;
  const toLocaleStringOriginal = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (...a) { const s = toLocaleStringOriginal.apply(this, a); return typeof s === "string" ? s.replace(/\u202f/g, "\u00a0") : s; };
}

const communes = COMMUNES_DATA;
const NOMS_REGIONS = { DAKAR: "Dakar", DIOURBEL: "Diourbel", FATICK: "Fatick", KAFFRINE: "Kaffrine", KAOLACK: "Kaolack", KEDOUGOU: "Kédougou", KOLDA: "Kolda", LOUGA: "Louga", MATAM: "Matam", SAINT_LOUIS: "Saint-Louis", SEDHIOU: "Sédhiou", TAMBACOUNDA: "Tambacounda", THIES: "Thiès", ZIGUINCHOR: "Ziguinchor" };

// espace insécable classique plutôt que l'espace fine (U+202F) renvoyée par toLocaleString : Poppins n'a pas ce caractère
const fmt = n => Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ");
const fmt1 = n => n.toFixed(1).replace(".", ",");
const mot = (n, s, p) => (Math.abs(n) > 1 ? p : s);
const normaliser = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const cleRegion = nom => nom.toUpperCase().replace(/ /g, "_");
const nomRegion = c => NOMS_REGIONS[cleRegion(c.r)] || c.r;

// Niveau de déficit santé d'une commune : mêmes seuils que les fiches de script.js
function niveauSante(c) {
  if (c.dp > 15) return { cle: "critique", texte: "Déficit critique", couleur: "var(--m-fort)" };
  if (c.dp > 5) return { cle: "modere", texte: "Déficit modéré", couleur: "var(--m-moyen)" };
  return { cle: "faible", texte: "Plutôt bien desservie", couleur: "var(--m-faible)" };
}

// Les homonymes (ex. Medina Gounass) sont toujours distingués par leur département
const homonymes = new Set(communes.map(c => c.n).filter((n, i, t) => t.indexOf(n) !== i));
const libelle = c => homonymes.has(c.n) ? `${c.n} (${c.d})` : c.n;

function parametresCommune(c) {
  const q = new URLSearchParams({ commune: c.n });
  if (homonymes.has(c.n)) q.set("departement", c.d);
  return q.toString();
}
// Adresse complète d'une page du site, utilisable une fois collée dans un message ; null tant que le site n'est pas servi en http(s) (fichier local, aperçu intégré).
const lienComplet = relatif => { try { const u = new URL(relatif, location.href); return u.protocol === "http:" || u.protocol === "https:" ? u.href : null; } catch (e) { return null; } };
// langue : « wo » quand l'utilisateur a choisi le wolof (voir wolof.js) ; le français est la langue par défaut.
const langueWolof = () => document.documentElement.getAttribute("data-langue") === "wo";
const lienFiche = c => `communes.html?${parametresCommune(c)}${langueWolof() ? "&langue=wo" : ""}`;
const lienCarte = c => `explorer.html?${parametresCommune(c)}`;

function trouverCommune(saisie, departement) {
  const s = normaliser(saisie || "");
  if (!s) return null;
  if (departement) {
    const d = normaliser(departement);
    const exacte = communes.find(c => normaliser(c.n) === s && normaliser(c.d) === d);
    if (exacte) return exacte;
  }
  return communes.find(c => normaliser(libelle(c)) === s)
      || communes.find(c => normaliser(c.n) === s)
      // sans correspondance exacte, on retient la commune la plus peuplée parmi celles dont le nom commence ainsi (« Touba » donne Touba Mosquée, pas Touba Mboul)
      || [...communes].filter(c => normaliser(c.n).startsWith(s)).sort((a, b) => b.p - a.p)[0]
      || null;
}

// Le thème choisi (clair ou sombre) se retrouve sur les autres pages : on le garde dans le navigateur, s'il l'autorise.
function memoriserTheme(t) {
  try { const tel = (navigator.maxTouchPoints > 0 || "ontouchstart" in window) && screen.width > 0 && Math.min(screen.width, screen.height) <= 640; (tel ? sessionStorage : localStorage).setItem("jappale-theme-v3", t); } catch (e) { /* stockage refusé : sans importance */ }   // téléphone : le choix du clair ne dure que le temps de la visite
  if (window.__memoTheme) window.__memoTheme(t);
}

// Les suggestions alternent les régions, de la moins peuplée à la plus peuplée, et suivent l'ordre alphabétique dans chaque région.
// La liste ne s'ouvre donc pas sur les quartiers de Dakar (c'est l'ordre de la base) : villes et communes éloignées se côtoient.
function communesMelangees() {
  const parRegion = {};
  [...communes].sort((a, b) => a.n.localeCompare(b.n, "fr")).forEach(c => { (parRegion[cleRegion(c.r)] = parRegion[cleRegion(c.r)] || []).push(c); });
  const pop = k => (REGION_STATS[k] || {}).pop || 0;
  const files = Object.keys(parRegion).sort((a, b) => pop(a) - pop(b)).map(k => parRegion[k]);
  const sortie = [];
  for (let i = 0; sortie.length < communes.length; i++) files.forEach(f => { if (f[i]) sortie.push(f[i]); });
  return sortie;
}

function remplirListeCommunes(id) {
  const liste = document.getElementById(id);
  if (liste) liste.innerHTML = communesMelangees().map(c => `<option value="${libelle(c)}"></option>`).join("");
}

// ---------- barre de navigation commune ----------
// Réception des messages du formulaire « Nous contacter ». Un site sans serveur ne peut pas recevoir un message tout seul : renseignez UNE des deux lignes.
//  - CONTACT_FORMULAIRE : adresse d'un service de formulaires (ex. https://formspree.io/f/xxxxxxx) : le message part directement.
//  - CONTACT_COURRIEL : une adresse neutre (sans nom de personne) : la messagerie de la personne s'ouvre avec le message prêt.
// Si les deux sont vides, le message s'affiche et peut être copié.
const CONTACT_FORMULAIRE = "";
const CONTACT_COURRIEL = "";

function initialiserContact() {
  const f = document.getElementById("contactForm"), msg = document.getElementById("contactMsg");
  if (!f || !msg) return;
  const val = n => f.elements[n].value.trim();
  // Par défaut (aucune adresse renseignée) la page dit la vérité : le formulaire n'envoie rien. Dès qu'une adresse est renseignée, les textes passent en mode « envoi ».
  if (CONTACT_FORMULAIRE || CONTACT_COURRIEL) {
    const texte = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    texte("contactIntro", "Écrivez-nous : nous répondons à l'adresse indiquée. Pour une donnée qui vous semble fausse, citez la commune et la valeur.");
    texte("contactNote", "Les champs marqués d'une étoile sont obligatoires. Vos informations servent uniquement à vous répondre.");
    texte("contactBtn", "Envoyer");
  }
  const afficher = (classe, texte, extra) => { msg.hidden = false; msg.className = classe; msg.innerHTML = ""; const p = document.createElement("div"); p.textContent = texte; msg.appendChild(p); if (extra) msg.appendChild(extra); };
  const copie = texte => {
    const bloc = document.createElement("div"); const pre = document.createElement("pre"); pre.textContent = texte;
    const b = document.createElement("button"); b.type = "button"; b.className = "btn-ghost"; b.textContent = "Copier le message";
    b.addEventListener("click", () => { (navigator.clipboard ? navigator.clipboard.writeText(texte) : Promise.reject()).then(() => { b.textContent = "Message copié"; }, () => { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Sélectionné : copiez avec Ctrl+C"; }); });
    bloc.appendChild(pre); bloc.appendChild(b); return bloc;
  };
  f.addEventListener("submit", async e => {
    e.preventDefault();
    f.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    const manquants = [["nom", "Nom"], ["prenom", "Prénom"], ["email", "E-mail"], ["info", "Message"]].filter(([n]) => !val(n));
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"));
    if (manquants.length || !emailOk) {
      manquants.forEach(([n]) => f.elements[n].setAttribute("aria-invalid", "true"));
      if (!manquants.length) f.elements.email.setAttribute("aria-invalid", "true");
      afficher("erreur", manquants.length ? `Merci de remplir : ${manquants.map(x => x[1]).join(", ")}.` : "Cette adresse e-mail ne semble pas valide.");
      const premier = f.querySelector("[aria-invalid]"); if (premier) premier.focus();
      return;
    }
    const d = { nom: val("nom"), prenom: val("prenom"), email: val("email"), telephone: val("tel"), structure: val("structure"), objet: val("objet"), informations: val("info") };
    const texte = [`Objet : ${d.objet}`, `Nom : ${d.nom}`, `Prénom : ${d.prenom}`, `E-mail : ${d.email}`, d.telephone && `Téléphone : ${d.telephone}`, d.structure && `Structure : ${d.structure}`, d.informations && `Message : ${d.informations}`].filter(Boolean).join("\n");
    if (CONTACT_FORMULAIRE) {
      try {
        const r = await fetch(CONTACT_FORMULAIRE, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(d) });
        if (r.ok) { afficher("ok", "Merci, votre message est bien envoyé. Nous vous répondrons à l'adresse indiquée."); f.reset(); return; }
      } catch (err) { /* repli ci-dessous */ }
      afficher("erreur", "L'envoi n'a pas abouti. Réessayez dans un instant, ou copiez votre message.", copie(texte));
    } else if (CONTACT_COURRIEL) {
      location.assign(`mailto:${CONTACT_COURRIEL}?subject=${encodeURIComponent("[Jàppale] " + d.objet)}&body=${encodeURIComponent(texte)}`);
      afficher("ok", "Votre messagerie s'ouvre avec le message prêt à envoyer. Il ne reste qu'à l'envoyer.");
    } else {
      afficher("info", "Rien n'a été envoyé : ce formulaire n'est pas encore relié à une boîte de réception. Vous pouvez copier votre message ci-dessous pour le transmettre par vos propres moyens.", copie(texte));
    }
  });
}

function initialiserNavigation() {
  initialiserContact();
  // les blocs apparaissent en douceur quand on les atteint ; si le navigateur ne le permet pas, ils restent simplement visibles
  if (!(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    const cibles = [...document.querySelectorAll("main .block, main .fig, main .path, main .apropos-card")];
    document.documentElement.classList.add("js-reveal");
    cibles.forEach(c => c.classList.add("reveal"));
    const revele = () => { const h = window.innerHeight || document.documentElement.clientHeight || 800; cibles.forEach(c => { if (!c.classList.contains("vu") && c.getBoundingClientRect().top < h * 0.92) c.classList.add("vu"); }); };
    window.addEventListener("scroll", revele, { passive: true }); window.addEventListener("resize", revele);
    revele();
    setTimeout(() => cibles.forEach(c => c.classList.add("vu")), 2500);   // filet de sécurité : rien ne reste invisible
  }
  // l'en-tête se distingue du contenu dès qu'on descend, et un bouton ramène en haut de la page
  const nav = document.querySelector(".nav");
  const haut = document.createElement("button");
  haut.type = "button"; haut.className = "haut-page"; haut.textContent = "Haut";
  haut.setAttribute("aria-label", "Remonter en haut de la page");
  haut.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(haut);
  // « Haut » n'apparaît qu'après les deux tiers de la page, et seulement si la page est assez longue pour en avoir besoin ; invisible, il n'est ni lu ni atteint au clavier
  const majDefilement = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0; if (nav) nav.classList.toggle("nav-defile", y > 8);
    const reste = document.documentElement.scrollHeight - window.innerHeight, visible = reste > 400 && y / reste >= 2 / 3;
    haut.classList.toggle("visible", visible); haut.tabIndex = visible ? 0 : -1; haut.setAttribute("aria-hidden", visible ? "false" : "true");
  };
  window.addEventListener("scroll", majDefilement, { passive: true }); window.addEventListener("resize", majDefilement, { passive: true });
  majDefilement();
  (document.getElementById("menuBtn") || { addEventListener() {} }).addEventListener("click", e => {
    const ouvert = document.getElementById("links").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", ouvert);
  });
  (document.getElementById("themeBtn") || { addEventListener() {} }).addEventListener("click", () => {
    const root = document.documentElement;
    const sombre = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = sombre ? "light" : "dark";
    memoriserTheme(root.dataset.theme);
  });
  const navForm = document.getElementById("navForm");
  (navForm || { addEventListener() {} }).addEventListener("submit", e => {
    e.preventDefault();
    const v = document.getElementById("navSearch").value;
    const c = trouverCommune(v);
    location.href = c ? lienFiche(c) : `communes.html?q=${encodeURIComponent(v)}`;
  });
  remplirListeCommunes("listeCommunes");
}

// Téléphone : les blocs longs de l'accueil (repérés par data-repli) sont repliés derrière un bouton, car l'attention est chère.
// Sur grand écran, rien ne change. Si l'écran s'élargit (rotation), tout se rouvre.
(function () {
  if (!window.matchMedia) return;
  const etroit = matchMedia("(max-width: 640px)");
  const plier = () => {
    document.querySelectorAll("[data-repli]").forEach(el => {
      if (el.querySelector(":scope > details.repli") || (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains("repli"))) return;
      const seul = el.hasAttribute("data-repli-seul");
      const contenu = seul ? [el] : Array.prototype.filter.call(el.children, e => !e.classList.contains("block-head"));
      if (!contenu.length) return;
      const d = document.createElement("details"), r = document.createElement("summary"), o = document.createElement("span"), f = document.createElement("span");
      d.className = "repli"; r.className = "repli-bouton"; o.className = "ouvrir"; o.textContent = el.getAttribute("data-repli"); f.className = "fermer"; f.textContent = "Masquer";
      r.appendChild(o); r.appendChild(f); d.appendChild(r);
      contenu[0].parentNode.insertBefore(d, contenu[0]); contenu.forEach(e => d.appendChild(e));
    });
  };
  if (etroit.matches) plier();
  const change = e => { if (e.matches) plier(); else document.querySelectorAll("details.repli").forEach(d => { d.open = true; }); };
  if (etroit.addEventListener) etroit.addEventListener("change", change); else if (etroit.addListener) etroit.addListener(change);
})();
