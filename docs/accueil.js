// Page d'accueil : tous les chiffres sont calculés à partir de data.js (outils communs dans site.js).
const somme = cle => communes.reduce((s, c) => s + (c[cle] || 0), 0);

// ---------- chiffres clés d'en-tête ----------
const deficit = somme("dp"), deficit33 = somme("dp33"), deficit33o = communes.reduce((s, c) => s + (c.dp33o != null ? c.dp33o : (c.dp33 != null ? c.dp33 : 0)), 0);
document.getElementById("hDeficit").textContent = fmt(deficit);
document.getElementById("hDeficit33").textContent = fmt(deficit33); document.getElementById("hDeficit33o").textContent = fmt(deficit33o);

// ---------- le sujet : santé ou éducation, partout sur la page ----------
// Repères d'éducation : mêmes règles que l'outil carte (rang de la commune parmi celles dont les données sont vérifiées).
const refEducation = (() => {
  const tension = communes.filter(c => c.fb === 1).map(c => c.p / (c.ne + 1)).sort((a, b) => a - b);
  const ratios = communes.filter(c => c.ne > 0).map(c => c.p / c.ne).sort((a, b) => a - b);
  return { tension, mediane: ratios[Math.floor(ratios.length / 2)] };
})();
const classeEducation = c => {
  if (c.fb !== 1) return null;
  const x = c.p / (c.ne + 1);
  const rang = refEducation.tension.filter(y => y < x).length / (refEducation.tension.length - 1) * 100;
  return rang >= 67 ? "haute" : rang <= 33 ? "basse" : "moyenne";
};
const verifiees = communes.filter(c => c.fb === 1);   // les communes dont les structures ont pu être rattachées (les autres sont à confirmer)
const habParEtab = c => Math.round(c.p / Math.max(c.ne, 1));   // « aucun établissement » compte pour un seul, afin de comparer
const etabs = n => `${n} ${mot(n, "établissement secondaire", "établissements secondaires")}`;
let sujet = "sante";

// ---------- carte des communes : un point par commune, sur des régions en fond neutre ----------
// Même projection et mêmes règles de couleur que l'outil carte : en santé, la part des postes nécessaires qui manquent ; en éducation, la tension.
const taux = r => r.pop > 0 ? r.deficitPoste / r.pop * 1e5 : 0;
const projeter = c => [20 + (c.lon + 17.536) * 61.7, 20 + (16.691 - c.lat) * 61.7];
const rayon = c => 0.9 + Math.sqrt(c.p) / 220;
const partManquante = c => c.bp > 0 ? c.dp / c.bp : 0;
const couleurSante = c => { const p = partManquante(c); return p >= 0.5 ? "var(--m-fort)" : p >= 0.2 ? "var(--m-moyen)" : "var(--bas)"; };
const couleurEducation = c => { const k = classeEducation(c); return k === "haute" ? "var(--edu-hi)" : k === "basse" ? "var(--edu-lo)" : k === "moyenne" ? "var(--edu-mid)" : "var(--ink-soft)"; };
const couleurCommune = c => sujet === "education" ? couleurEducation(c) : couleurSante(c);
const SVG = "http://www.w3.org/2000/svg";
const calque = document.getElementById("regions");
const svgCarte = calque.closest("svg");
const info = document.getElementById("regInfo");
const lienBouton = (href, texte) => `<div class="reg-action"><a class="reg-link lien-bouton" href="${href}">${texte}</a></div>`;
const pointDe = new Map();
let pointCourant = null, communeCourante = null;

function infobulle(c) {
  return sujet === "education"
    ? `${c.n} (${nomRegion(c)}) : ${c.ne === 0 ? "aucun établissement secondaire" : etabs(c.ne)} pour ${fmt(c.p)} habitants`
    : `${c.n} (${nomRegion(c)}) : ${c.dp} ${mot(c.dp, "poste manquant", "postes manquants")} sur ${c.bp} nécessaires`;
}

function marquer(c) {
  if (pointCourant) pointCourant.classList.remove("sel");
  pointCourant = c ? pointDe.get(c) : null;
  if (pointCourant) pointCourant.classList.add("sel");
  communeCourante = c || null;
}

// l'enseignement supérieur public est présenté à part : ce n'est pas du secondaire
const supCommune = c => (c.nu || c.nv)
  ? `<p class="sup">Enseignement supérieur public ici : ${c.nu ? `${c.nu} ${mot(c.nu, "campus", "campus")} d'université` : ""}${c.nu && c.nv ? " et " : ""}${c.nv ? `${c.nv} ${mot(c.nv, "espace numérique", "espaces numériques")}` : ""}.</p>` : "";
const supRegion = r => `<p class="sup">Enseignement supérieur public : ${r.nbUniv} ${mot(r.nbUniv, "campus", "campus")} d'université et ${r.nbEno} ${mot(r.nbEno, "espace numérique", "espaces numériques")}.</p>`;

function montrerRegion(k) {
  const r = REGION_STATS[k];
  marquer(null);
  calque.querySelectorAll(".reg").forEach(p => p.classList.toggle("on", p.dataset.k === k));
  const corps = sujet === "education"
    ? `<dt>Habitants</dt><dd class="num">${fmt(r.pop)}</dd>
    <dt>Communes</dt><dd class="num">${r.nbCommunes}</dd>
    <dt>Établissements secondaires</dt><dd class="num">${r.nbEduc}</dd>
    <dt>Habitants par établissement</dt><dd class="num">${r.nbEduc > 0 ? fmt(Math.round(r.pop / r.nbEduc)) : "aucun"}</dd>`
    : `<dt>Habitants</dt><dd class="num">${fmt(r.pop)}</dd>
    <dt>Communes</dt><dd class="num">${r.nbCommunes}</dd>
    <dt>Postes manquants</dt><dd class="num">${r.deficitPoste}</dd>
    <dt>Pour 100 000 hab.</dt><dd class="num">${fmt1(taux(r))}</dd>`;
  info.innerHTML = `<strong>${NOMS_REGIONS[k] || k}</strong><dl>${corps}</dl>
    ${sujet === "education" ? supRegion(r) : ""}
    ${lienBouton(`communes.html?region=${k}`, `Voir les ${r.nbCommunes} communes`)}`;
}

function montrerCommune(c) {
  calque.querySelectorAll(".reg").forEach(p => p.classList.remove("on"));
  marquer(c);
  const corps = sujet === "education"
    ? `<dt>Habitants</dt><dd class="num">${fmt(c.p)}</dd>
    <dt>Établissements secondaires</dt><dd class="num">${c.ne}</dd>
    <dt>Habitants par établissement</dt><dd class="num">${c.ne > 0 ? fmt(habParEtab(c)) : "aucun établissement"}</dd>
    <dt>Repère (médiane)</dt><dd class="num">${fmt(Math.round(refEducation.mediane))}</dd>`
    : `<dt>Habitants</dt><dd class="num">${fmt(c.p)}</dd>
    <dt>Postes existants</dt><dd class="num">${c.np}</dd>
    <dt>Postes nécessaires</dt><dd class="num">${c.bp}</dd>
    <dt>Postes manquants</dt><dd class="num">${c.dp}</dd>`;
  info.innerHTML = `<strong>${c.n}<small>${nomRegion(c)}</small></strong><dl>${corps}</dl>
    ${sujet === "education" ? supCommune(c) : ""}
    ${lienBouton(lienFiche(c), `Voir la fiche de ${c.n}`)}`;
}

// régions : un fond neutre aux frontières visibles
for (const k in regionShapes) {
  if (!REGION_STATS[k]) continue;
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", regionShapes[k].d);
  p.setAttribute("class", "reg");
  p.setAttribute("tabindex", "0"); p.setAttribute("role", "link"); p.setAttribute("aria-label", NOMS_REGIONS[k] || k);
  p.dataset.k = k;
  p.addEventListener("focus", () => montrerRegion(k));
  p.addEventListener("keydown", e => { if (e.key === "Enter") location.href = `communes.html?region=${k}`; });
  calque.appendChild(p);
}

// un point par commune, dessiné par-dessus les régions : les plus peuplées d'abord, les petites par-dessus pour qu'aucune ne soit cachée
const lesPoints = [];
const pointsCommunes = document.createElementNS(SVG, "g");
const triees = [...communes].filter(c => c.lat !== null && c.lat !== undefined).sort((a, b) => b.p - a.p);
triees.forEach((c, i) => {
  const [x, y] = projeter(c);
  const pt = document.createElementNS(SVG, "circle");
  pt.setAttribute("class", "pt");
  pt.setAttribute("cx", x.toFixed(2)); pt.setAttribute("cy", y.toFixed(2));
  pt.dataset.r = rayon(c).toFixed(2); pt.setAttribute("r", pt.dataset.r);
  pt.style.fill = couleurCommune(c);
  pt.style.setProperty("--d", (i / triees.length * 1.1).toFixed(2) + "s");   // les points surgissent en cascade
  const t = document.createElementNS(SVG, "title");
  t.textContent = infobulle(c);
  pt.appendChild(t);
  pointDe.set(c, pt);
  lesPoints.push({ c, x, y });
  pointsCommunes.appendChild(pt);
});
calque.appendChild(pointsCommunes);

// une onde discrète attire l'œil sur les trois communes les plus touchées du sujet affiché
function poserOndes() {
  pointsCommunes.querySelectorAll(".anneau").forEach(e => e.remove());
  const classement = [...communes].filter(c => c.lat !== null && c.lat !== undefined && (sujet !== "education" || c.fb === 1))
    .sort((a, b) => sujet === "education" ? habParEtab(b) - habParEtab(a) : b.dp - a.dp).slice(0, 3);
  classement.forEach(c => {
    const [x, y] = projeter(c);
    const an = document.createElementNS(SVG, "circle");
    an.setAttribute("class", "pt-anneau anneau");
    an.style.stroke = sujet === "education" ? "var(--edu-hi)" : "";
    an.setAttribute("cx", x.toFixed(2)); an.setAttribute("cy", y.toFixed(2));
    an.dataset.r = (rayon(c) + 2.5).toFixed(2); an.setAttribute("r", an.dataset.r);
    pointsCommunes.appendChild(an);
  });
}
poserOndes();

// Un point de deux pixels est presque impossible à toucher au doigt : on retient le point le plus proche du toucher ou du curseur.
function plusProche(e, pixels) {
  const r = svgCarte.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const [vx, vy, vw, vh] = svgCarte.getAttribute("viewBox").split(/\s+/).map(Number);
  const s = Math.min(r.width / vw, r.height / vh);                       // l'image garde ses proportions
  const x = vx + (e.clientX - r.left - (r.width - vw * s) / 2) / s, y = vy + (e.clientY - r.top - (r.height - vh * s) / 2) / s;
  let meilleur = null, dmin = (pixels / s) ** 2;
  for (const q of lesPoints) { const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < dmin) { dmin = d; meilleur = q.c; } }
  return meilleur;
}
svgCarte.addEventListener("click", e => {
  const c = plusProche(e, 14);
  if (c) { montrerCommune(c); return; }
  const reg = e.target.closest ? e.target.closest("path.reg") : null;
  if (reg) montrerRegion(reg.dataset.k);
});
svgCarte.addEventListener("pointermove", e => {
  if (e.pointerType && e.pointerType !== "mouse") return;
  const c = plusProche(e, 9);
  if (c && c !== communeCourante) montrerCommune(c);
});

// sur un écran étroit la carte est réduite : les points grossissent un peu pour rester visibles
function ajusterRayons() {
  const largeur = svgCarte.getBoundingClientRect().width;
  const k = largeur > 0 ? Math.min(1.7, Math.max(1, 560 / largeur)) : 1;
  pointsCommunes.querySelectorAll("circle").forEach(p => p.setAttribute("r", (parseFloat(p.dataset.r) * k).toFixed(2)));
}
window.addEventListener("resize", ajusterRayons);
ajusterRayons();

// ---------- légende, chiffres clés et liste : ils suivent le sujet ----------
function rendreLegende() {
  const puce = (couleur, texte) => `<span><i style="background:${couleur}"></i>${texte}</span>`;
  document.querySelector(".map-legend").innerHTML = sujet === "education"
    ? puce("var(--edu-hi)", "Parmi les plus tendues : peu d'établissements pour beaucoup d'habitants") + puce("var(--edu-mid)", "Situation intermédiaire") + puce("var(--edu-lo)", "Parmi les moins tendues")
      + `<span class="note">Un point est une commune : sa taille suit la population. Collèges et lycées seulement, publics et privés ; l'enseignement supérieur est présenté à part. Aucune norme officielle : c'est un constat, pas un déficit. Touchez un point pour voir la commune, une région pour la parcourir.</span>`
    : puce("var(--m-fort)", "La moitié ou plus des postes nécessaires manquent") + puce("var(--m-moyen)", "Entre un cinquième et la moitié") + puce("var(--bas)", "Moins d'un cinquième")
      + `<span class="note">Un point est une commune : sa taille suit la population. Touchez un point pour voir la commune, une région pour la parcourir.</span>`;
}

function rendreChiffres() {
  // une illustration par chiffre (chemins écrits en entier : le lien d'aperçu sait ainsi les remplacer)
  const ICONES = { fPop: "images/habitant.webp", fEtab: "images/education.webp", fSans: "images/chercher-commune.webp", fMediane: "images/comparer.webp", fPostes: "images/sante.webp", fCommunes: "images/chercher-commune.webp", fDeficit33: "images/simuler.webp" };
  const fig = (id, nombre, texte, note, alerte, extra = "") => `<div class="fig"><img class="ic" src="${ICONES[id]}" alt="" width="64" height="64" loading="lazy" decoding="async"><b class="num${alerte ? " alert" : ""}" id="${id}">${nombre}</b><span>${texte}</span><small>${note}</small>${extra}</div>`;
  const population = fig("fPop", fmt(somme("p")), `habitants recensés dans ${communes.length} communes`, "RGPH-5 2023");
  document.getElementById("chiffres").innerHTML = sujet === "education"
    ? population
      + fig("fEtab", fmt(somme("ne")), "établissements secondaires recensés : collèges et lycées, publics et privés", "Géo Sénégal / ANSD")
      + fig("fSans", fmt(verifiees.filter(c => c.ne === 0).length), `communes sur ${verifiees.length} sans aucun établissement secondaire recensé`, `Un constat, sans norme officielle. Hors ${communes.length - verifiees.length} communes à confirmer`, true)
      + fig("fMediane", fmt(Math.round(refEducation.mediane)), "habitants pour un établissement, en médiane, dans les communes qui en ont", "Le primaire n'est pas couvert")
    : population
      + fig("fPostes", fmt(somme("np")), "postes de santé géolocalisés, dont 39 centres médico-sociaux", "Géo Sénégal / ANSD", false, `\n        <a class="lien-bouton lien-alerte" href="methode.html#ecart-postes">Chiffre à confirmer</a>`)
      + fig("fCommunes", fmt(communes.filter(c => c.dp > 0).length), "communes sous la norme d'un poste pour 10 000 habitants", "Norme Ministère de la Santé", true)
      + fig("fDeficit33", fmt(deficit33), "postes manquants en 2033, avec la croissance mesurée depuis 2013 (" + fmt(deficit33o) + " avec la projection officielle de l'ANSD)", "Projection indicative", true);
}

function rendreTop() {
  const ligne = (c, valeur, rapport, meta) => `<li><span class="name"><a href="${lienFiche(c)}">${c.n}</a><small>${nomRegion(c)}</small></span><span class="val num">${valeur}</span>
   <span class="bar"><i style="width:${rapport * 100}%"></i></span><span class="meta num">${meta}</span></li>`;
  if (sujet === "education") {
    document.getElementById("topEyebrow").textContent = "Établissements secondaires";
    { const im = document.getElementById("topImg"); if (im) im.src = "images/education.webp"; }
    document.getElementById("topTitre").textContent = "Les communes les moins bien pourvues";
    document.getElementById("topNote").textContent = "Chiffre à droite : nombre d'habitants pour un établissement secondaire (collège ou lycée). Aucune norme officielle : c'est un constat.";
    const tops = [...communes].filter(c => c.fb === 1).sort((a, b) => habParEtab(b) - habParEtab(a)).slice(0, 6);
    document.getElementById("top").innerHTML = tops.map(c => ligne(c, fmt(habParEtab(c)), habParEtab(c) / habParEtab(tops[0]),
      `${fmt(c.p)} hab., ${c.ne === 0 ? "aucun établissement secondaire recensé" : etabs(c.ne)}`)).join("");
  } else {
    document.getElementById("topEyebrow").textContent = "Postes de santé manquants aujourd'hui";
    { const im = document.getElementById("topImg"); if (im) im.src = "images/sante.webp"; }
    document.getElementById("topTitre").textContent = "Les communes où le manque est le plus fort";
    document.getElementById("topNote").textContent = "Chiffre à droite : nombre de postes de santé manquants, selon la norme d'un poste pour 10 000 habitants.";
    const tops = [...communes].sort((a, b) => b.dp - a.dp).slice(0, 6);
    document.getElementById("top").innerHTML = tops.map(c => ligne(c, c.dp, c.dp / tops[0].dp,
      `${fmt(c.p)} hab., ${c.np} postes existants pour ${c.bp} nécessaires`)).join("");
  }
}

// l'encadré du haut suit le sujet : en éducation, c'est le constat des communes sans établissement
function rendreConstat() {
  document.querySelector(".hero .constat").innerHTML = sujet === "education"
    ? `Constat aujourd'hui : <b class="hl num" id="hSans">${fmt(verifiees.filter(c => c.ne === 0).length)}</b> communes sur ${verifiees.length} n'ont aucun établissement secondaire recensé (ni collège, ni lycée). Aucune norme officielle : c'est un constat, pas un déficit. La couche recense environ la moitié des établissements : ce constat est probablement surestimé.`
    : `Besoin estimé aujourd'hui : <b class="hl num" id="hDeficit">${fmt(deficit)}</b> postes de santé supplémentaires, selon la norme d'un poste pour 10 000 habitants. Projection indicative pour 2033, à nombre de postes constant : <b class="num" id="hDeficit33">${fmt(deficit33)}</b> (<b class="num" id="hDeficit33o">${fmt(deficit33o)}</b> avec la projection officielle de l'ANSD). Ce besoin est un minimum : recalé sur les nombres officiels de postes de 2022, il serait d'environ <b class="hl">800</b>.`;
}

function selectionParDefaut() {
  montrerCommune(sujet === "education"
    ? [...communes].filter(c => c.fb === 1).sort((a, b) => habParEtab(b) - habParEtab(a))[0]
    : [...communes].sort((a, b) => b.dp - a.dp)[0]);
}

// « Ouvrir la carte » s'ouvre sur le même sujet que celui choisi ici
function lierCarte() {
  const lien = document.querySelector('.path[href^="explorer.html"]');
  if (lien && !lien.getAttribute("href").includes("#")) lien.setAttribute("href", sujet === "education" ? "explorer.html?sujet=education" : "explorer.html");
}

function choisirSujet(s) {
  sujet = s;
  document.querySelectorAll(".sujet button").forEach(b => { const actif = b.dataset.sujet === s; b.classList.toggle("on", actif); b.setAttribute("aria-pressed", actif); });
  for (const q of lesPoints) { const pt = pointDe.get(q.c); pt.style.fill = couleurCommune(q.c); pt.querySelector("title").textContent = infobulle(q.c); }
  poserOndes(); ajusterRayons();
  rendreLegende(); rendreChiffres(); rendreTop(); rendreConstat(); selectionParDefaut(); lierCarte();
}
document.querySelectorAll(".sujet button").forEach(b => b.addEventListener("click", () => choisirSujet(b.dataset.sujet)));
choisirSujet("sante");

// ---------- recherche d'une commune ----------
function ouvrirFiche(saisie, msg) {
  const c = trouverCommune(saisie);
  if (c) { location.href = lienFiche(c); return; }
  msg.textContent = saisie.trim()
    ? `Aucune commune ne correspond à « ${saisie.trim()} ». Vérifiez l'orthographe ou choisissez dans la liste.`
    : "Saisissez le nom d'une commune.";
  msg.hidden = false;
}

const finderInput = document.getElementById("finderInput");
const finderMsg = document.getElementById("finderMsg");
document.getElementById("finder").addEventListener("submit", e => { e.preventDefault(); ouvrirFiche(finderInput.value, finderMsg); });
document.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => ouvrirFiche(b.dataset.commune, finderMsg)));

// Le bouton flottant « Poser une question » s'efface quand le pied de page apparaît : il en cachait le texte.
const boutonAssistant = document.querySelector(".assist"), piedDePage = document.querySelector("footer");
if (boutonAssistant && piedDePage && "IntersectionObserver" in window) {
  new IntersectionObserver(entrees => boutonAssistant.classList.toggle("assist-masque", entrees[0].isIntersecting), { threshold: 0.01 }).observe(piedDePage);
}

initialiserNavigation();
