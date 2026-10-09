// Page Comparer : 2 à 4 communes (comparer.html?c=Mbour&c=Medina Gounass (Velingara))
// ou régions (comparer.html?type=region&r=DAKAR&r=KOLDA). Tout est calculé à partir de data.js.
const MAX = 4;
const COULEURS = ["var(--blue)", "var(--ochre)", "var(--sky)", "var(--ink-soft)"];
const EXEMPLE = ["Touba Mosquee", "Kanel", "Saraya"];
const EXEMPLE_REGIONS = ["DAKAR", "DIOURBEL", "KOLDA"];

const params = new URLSearchParams(location.search);
let mode = params.get("type") === "region" ? "region" : "commune";
let choix = [];          // communes (objets de data.js) ou clés de région (DAKAR...)
let exemple = false;

// ---------- indicateurs ----------
const densite = (np, p) => p > 0 ? np / p * 1e4 : 0;
const pour100k = (dp, p) => p > 0 ? dp / p * 1e5 : 0;
const absent = v => v === null || v === undefined;

function indicateursCommune(c) {
  return {
    nom: c.n, sous: `${c.d}, ${nomRegion(c)}`, lien: lienFiche(c),
    p: c.p, np: c.np, bp: c.bp, dp: c.dp, dp33: c.dp33, dpb: absent(c.dpb) ? null : Math.round(c.dpb),
    dens: densite(c.np, c.p), t100k: pour100k(c.dp, c.p),
    dcd: c.dcd, dhd: c.dhd, hk: c.hk, hp: c.hp, ne: c.ne,
    parEtab: c.ne > 0 ? c.p / c.ne : null,
    e100k: pour100k(c.ne, c.p),
    fiable: c.fb === 1, mesure: c.tm === 1,
  };
}
function indicateursRegion(k) {
  const r = REGION_STATS[k];
  const liste = communes.filter(c => cleRegion(c.r) === k);
  const np = liste.reduce((s, c) => s + c.np, 0), bp = liste.reduce((s, c) => s + c.bp, 0);
  const dp33 = liste.reduce((s, c) => s + (c.dp33 || 0), 0);
  return {
    nom: NOMS_REGIONS[k] || k, sous: `${r.nbCommunes} communes`, lien: `communes.html?region=${k}`,
    p: r.pop, np, bp, dp: r.deficitPoste, dp33, dpb: Math.round(r.deficitBassin),
    dens: densite(np, r.pop), t100k: pour100k(r.deficitPoste, r.pop),
    nh: r.nbHopitaux, bh: r.besoinHopitaux, ne: r.nbEduc, parEtab: r.nbEduc > 0 ? r.pop / r.nbEduc : null, e100k: pour100k(r.nbEduc, r.pop),
    enDeficit: liste.filter(c => c.dp > 0).length, aConfirmer: r.nbCommunes - r.nbConfirmees,
  };
}
const donnees = () => choix.map(x => mode === "region" ? indicateursRegion(x) : indicateursCommune(x));

// ---------- lignes du tableau : [libellé, valeur, format, sens] (sens : 1 = plus haut est pire, -1 = plus bas est pire) ----------
function lignesTableau() {
  const communs = [
    ["Population", d => d.p, fmt],
    ["Postes de santé existants / nécessaires", d => `${fmt(d.np)} / ${fmt(d.bp)}`],
    ["Postes de santé manquants (2023)", d => d.dp, fmt, 1],
    ["Postes pour 10 000 habitants (norme : 1)", d => d.dens, fmt1, -1],
    ["Postes manquants pour 100 000 habitants", d => d.t100k, fmt1, 1],
    ["Scénario 2033 : postes manquants", d => d.dp33, v => absent(v) ? "non disponible" : fmt(v), 1],
    ["Vue bassin (15 km) : postes manquants", d => d.dpb, v => absent(v) ? "non disponible" : fmt(v), 1],
  ];
  if (mode === "region") return communs.concat([
    ["Communes en déficit de postes", d => d.enDeficit, fmt, 1],
    ["Hôpitaux existants / requis (région)", d => `${d.nh} / ${d.bh}`],
    ["Établissements secondaires", d => d.ne, fmt],
    ["Habitants par établissement secondaire", d => d.parEtab, v => absent(v) ? "non disponible" : fmt(v), 1],
    ["Communes à données à confirmer", d => d.aConfirmer, fmt],
  ]);
  return communs.concat([
    ["Centres de santé manquants (département)", d => d.dcd, fmt, 1],
    ["Hôpitaux manquants (département)", d => d.dhd, fmt, 1],
    ["Hôpital le plus proche", d => d.hp ? `${d.hp}, ${d.hk} km` : "non disponible"],
    ["Établissements secondaires", d => d.ne, fmt],
    ["Habitants par établissement secondaire", d => d.parEtab, v => absent(v) ? "non disponible" : fmt(v), 1],
    ["Fiabilité des données", d => d.fiable ? "Vérifiées" : "À confirmer"],
    ["Croissance 2013-2023", d => d.mesure ? "Mesurée" : "Médiane nationale"],
  ]);
}

// ---------- affichage ----------
function afficherChoix() {
  const d = donnees();
  document.getElementById("choix").innerHTML = d.map((x, i) => `
    <li style="--c:${COULEURS[i]}"><span class="pastille"></span><a href="${x.lien}">${x.nom}</a><small>${x.sous}</small>
      <button type="button" data-i="${i}" aria-label="Retirer ${x.nom}">×</button></li>`).join("");
  document.querySelectorAll("#choix button").forEach(b => b.addEventListener("click", () => {
    choix.splice(+b.dataset.i, 1); exemple = false; rafraichir();
  }));
}

function graphe(titre, d, cle, format, { norme, unite } = {}) {
  const vals = d.map(x => (x[cle] != null ? x[cle] : 0));
  const max = Math.max(...vals, norme || 0, 0.0001) * 1.08;
  return `<figure class="graphe"><figcaption>${titre}</figcaption>
    ${d.map((x, i) => `<div class="g-ligne"><span class="g-nom">${x.nom}</span>
      <span class="g-piste"><i style="width:${vals[i] / max * 100}%;background:${COULEURS[i]}"></i>${norme ? `<em style="left:${norme / max * 100}%"></em>` : ""}</span>
      <span class="g-val num">${absent(x[cle]) ? "non disponible" : format(x[cle])}</span></div>`).join("")}
    ${unite ? `<div class="g-unite">${unite}</div>` : ""}</figure>`;
}

function grapheAvant2033(d) {
  const max = Math.max(...[].concat(...d.map(x => [x.dp, x.dp33 || 0])), 1) * 1.08;
  return `<figure class="graphe"><figcaption>Postes manquants : 2023 et scénario 2033</figcaption>
    ${d.map((x, i) => `<div class="g-ligne g-double"><span class="g-nom">${x.nom}</span>
      <span class="g-pistes">
        <span class="g-piste"><i style="width:${x.dp / max * 100}%;background:${COULEURS[i]}"></i></span>
        <span class="g-piste g-futur"><i style="width:${(x.dp33 || 0) / max * 100}%;--c:${COULEURS[i]}"></i></span>
      </span>
      <span class="g-val num">${fmt(x.dp)}<small>2033 : ${absent(x.dp33) ? "non disponible" : fmt(x.dp33)}</small></span></div>`).join("")}
    <div class="g-unite">Barre pleine : 2023. Barre hachurée : scénario 2033 au fil de l'eau, à nombre de postes inchangé.</div></figure>`;
}

function afficherResultats() {
  const d = donnees();
  const assez = d.length >= 2;
  document.getElementById("resultats").hidden = !assez;
  if (!assez) return;

  document.getElementById("enbref").innerHTML = enBref(d);
  // l'essentiel d'abord : deux graphiques ; le reste se déplie
  document.getElementById("graphes").innerHTML = sujetCmp === "education"
    ? graphe("Établissements secondaires", d, "ne", fmt, { unite: "Collèges et lycées recensés, publics et privés." }) +
      graphe("Établissements secondaires pour 100 000 habitants", d, "e100k", fmt1, { unite: "Rapporté à la population. Aucune norme officielle : c'est un constat." })
    : graphe("Postes de santé manquants", d, "dp", fmt, { unite: "Selon la norme d'un poste pour 10 000 habitants." }) +
      graphe("Postes manquants pour 100 000 habitants", d, "t100k", fmt1, { unite: "Rapporté à la population, pour comparer des territoires de tailles différentes." });
  document.getElementById("graphesPlus").innerHTML =
    graphe("Postes de santé pour 10 000 habitants", d, "dens", fmt1, { norme: 1, unite: "Le trait ocre marque la norme : 1 poste pour 10 000 habitants." }) +
    grapheAvant2033(d);

  const lignes = lignesTableau();
  document.getElementById("comparatif").innerHTML = `
    <thead><tr><th scope="col">Indicateur</th>${d.map((x, i) => `<th scope="col" style="--c:${COULEURS[i]}"><span class="pastille"></span><a href="${x.lien}">${x.nom}</a><small>${x.sous}</small></th>`).join("")}</tr></thead>
    <tbody>${lignes.map(([lib, f, format, sens]) => {
      const vals = d.map(f);
      // la situation la plus défavorable de la ligne est soulignée en ocre
      let pire = -1;
      if (sens && vals.every(v => typeof v === "number")) {
        const cible = sens > 0 ? Math.max(...vals) : Math.min(...vals);
        if (vals.some(v => v !== cible)) pire = vals.indexOf(cible);
      }
      return `<tr><th scope="row">${lib}</th>${vals.map((v, i) => `<td class="${pire === i ? "pire" : ""}">${format ? format(v) : v}</td>`).join("")}</tr>`;
    }).join("")}</tbody>`;
}

// ---------- la réponse en une phrase ----------
let sujetCmp = "sante";   // « sante » ou « education », choisi par l'interrupteur au-dessus des résultats

function enBrefEducation(d) {
  const nom = mode === "region" ? "région" : "commune";
  const parNb = [...d].sort((a, b) => b.ne - a.ne), parTaux = [...d].sort((a, b) => b.e100k - a.e100k);
  const g = x => `<b>${x.nom}</b>`;
  const egauxNb = parNb[0].ne === parNb[parNb.length - 1].ne;
  const egauxTaux = parTaux[0].e100k === parTaux[parTaux.length - 1].e100k;
  const etab = n => `${fmt(n)} ${mot(n, "établissement secondaire", "établissements secondaires")}`;
  let t = egauxNb
    ? `Ces ${nom}s comptent le même nombre d'établissements secondaires (${fmt(parNb[0].ne)}).`
    : `Parmi ces ${d.length} ${nom}s, ${g(parNb[0])} compte le plus d'établissements secondaires (${fmt(parNb[0].ne)}).`;
  const haut = parTaux[0].e100k, basse = parTaux[parTaux.length - 1];
  if (!egauxTaux && haut - basse.e100k < 0.1 * haut) t += ` Rapporté à la population, la situation est comparable (de ${fmt1(basse.e100k)} à ${fmt1(haut)} établissements pour 100 000 habitants).`;
  else if (!egauxTaux) {
    // la commune qui compte le plus d'établissements peut être celle qui en a le moins par habitant : on le dit
    const tete = !egauxNb && parNb[0] === basse ? "c'est pourtant" : "la moins bien pourvue est";
    t += basse.ne === 0
      ? ` Rapporté à la population, ${tete} ${g(basse)}${tete === "c'est pourtant" ? " la moins bien pourvue" : ""} : aucun établissement secondaire recensé.`
      : ` Rapporté à la population, ${tete} ${g(basse)}${tete === "c'est pourtant" ? " la moins bien pourvue" : ""} (${fmt1(basse.e100k)} établissements pour 100 000 habitants).`;
  }
  return `<p>${t}</p><small>Collèges et lycées recensés, publics et privés. Aucune norme officielle : c'est un constat, pas un déficit. Le primaire n'est pas couvert et l'enseignement supérieur est présenté à part.</small>`;
}

function enBref(d) {
  if (sujetCmp === "education") return enBrefEducation(d);
  const nom = mode === "region" ? "région" : "commune";
  const parNb = [...d].sort((a, b) => b.dp - a.dp), parTaux = [...d].sort((a, b) => b.t100k - a.t100k);
  const g = x => `<b>${x.nom}</b>`;
  const egauxNb = parNb[0].dp === parNb[parNb.length - 1].dp;
  const egauxTaux = parTaux[0].t100k === parTaux[parTaux.length - 1].t100k;
  let t;
  if (parNb[0].dp === 0) t = `Selon la norme, aucune de ces ${nom}s ne manque de postes de santé.`;
  else {
    t = egauxNb
      ? `Ces ${nom}s ont le même nombre de postes de santé manquants (${fmt(parNb[0].dp)}).`
      : `Parmi ces ${d.length} ${nom}s, ${g(parNb[0])} a le plus grand nombre de postes de santé manquants (${fmt(parNb[0].dp)}).`;
    // rapporté à la population : c'est la comparaison équitable entre des territoires de tailles différentes
    const tauxMax = parTaux[0].t100k, tauxMin = parTaux[parTaux.length - 1].t100k;
    if (!egauxTaux && tauxMax - tauxMin < 0.1 * tauxMax) t += ` Rapporté à la population, la situation est comparable (de ${fmt1(tauxMin)} à ${fmt1(tauxMax)} postes manquants pour 100 000 habitants).`;
    else if (!egauxTaux) t += !egauxNb && parTaux[0] === parNb[0]
      ? ` Rapporté à la population, c'est aussi ${g(parTaux[0])} qui est la plus touchée (${fmt1(parTaux[0].t100k)} postes manquants pour 100 000 habitants).`
      : ` Rapporté à la population, la plus touchée est ${g(parTaux[0])} (${fmt1(parTaux[0].t100k)} postes manquants pour 100 000 habitants).`;
  }
  return `<p>${t}</p><small>Estimations selon la norme d'un poste de santé pour 10 000 habitants.</small>`;
}

// ---------- le guide : trois étapes et un message qui dit toujours quoi faire ensuite ----------
function majGuide() {
  const region = mode === "region", nom = region ? "région" : "commune", n = choix.length;
  const etape = exemple ? 3 : Math.min(n + 1, 3);
  document.querySelectorAll("#etapes li").forEach(li => {
    const e = +li.dataset.etape;
    li.classList.toggle("faite", e < etape);
    li.classList.toggle("en-cours", e === etape);
  });
  let texte;
  if (exemple) texte = `Exemple affiché : ${donnees().map(x => x.nom).join(", ")}. Pour comparer vos propres ${nom}s, effacez d'abord cet exemple.`;
  else if (n === 0) texte = region ? "Étape 1 : choisissez une région dans la liste, puis appuyez sur « Ajouter »." : "Étape 1 : tapez le nom d'une commune dans le champ, puis appuyez sur « Ajouter ».";
  else if (n === 1) texte = `Étape 2 : il manque une ${nom} pour comparer. Ajoutez-en une deuxième avec le champ ci-dessus.`;
  else if (n >= MAX) texte = `${MAX} ${nom}s comparées : c'est le maximum. Retirez-en une avec la croix pour en ajouter une autre.`;
  else texte = `Vous comparez ${n} ${nom}s. Vous pouvez en ajouter jusqu'à ${MAX}.`;
  document.getElementById("guideTexte").textContent = texte;
  const bouton = document.getElementById("commencer");
  bouton.hidden = !exemple;
  bouton.textContent = region ? "Comparer mes propres régions" : "Comparer mes propres communes";
  document.querySelector(".ajout-ligne").classList.toggle("attention", !exemple && n === 1);
}

function rafraichir() {
  document.getElementById("modeCommunes").setAttribute("aria-pressed", mode === "commune");
  document.getElementById("modeRegions").setAttribute("aria-pressed", mode === "region");
  document.getElementById("ajoutCommune").hidden = mode !== "commune";
  document.getElementById("ajoutRegion").hidden = mode !== "region";
  document.getElementById("ajoutLabel").textContent = mode === "region" ? "Choisissez une région" : "Tapez le nom d'une commune";
  document.getElementById("ajoutLabel").htmlFor = mode === "region" ? "ajoutRegion" : "ajoutCommune";
  const plein = choix.length >= MAX;
  document.getElementById("ajoutBtn").disabled = plein;
  document.getElementById("ajoutMsg").textContent = plein ? `${MAX} territoires au maximum : retirez-en un pour en ajouter un autre.` : "";
  remplirRegions();
  afficherChoix();
  afficherResultats();
  majGuide();
  // « Copier le lien » n'a de sens qu'avec une comparaison ; « Tout retirer » qu'avec un choix de l'utilisateur
  document.querySelector(".selection-actions").hidden = exemple || choix.length === 0;
  document.getElementById("copierLien").hidden = choix.length < 2;

  // l'adresse reflète la comparaison, pour pouvoir la partager (sauf l'exemple de départ)
  const q = new URLSearchParams();
  if (mode === "region") { q.set("type", "region"); choix.forEach(k => q.append("r", k)); }
  else choix.forEach(c => q.append("c", libelle(c)));
  try { history.replaceState(null, "", !exemple && choix.length ? `comparer.html?${q}` : "comparer.html"); } catch (e) { /* fichier local : le navigateur refuse, sans importance */ }
}

function remplirRegions() {
  const sel = document.getElementById("ajoutRegion");
  sel.innerHTML = Object.keys(REGION_STATS).filter(k => !choix.includes(k))
    .sort((a, b) => (NOMS_REGIONS[a] || a).localeCompare(NOMS_REGIONS[b] || b, "fr"))
    .map(k => `<option value="${k}">${NOMS_REGIONS[k] || k}</option>`).join("");
}

// ---------- interactions ----------
const choixExemple = () => mode === "region"
  ? EXEMPLE_REGIONS.filter(k => REGION_STATS[k])
  : EXEMPLE.map(n => trouverCommune(n)).filter(Boolean);

function changerMode(m) {
  if (m === mode) return;
  mode = m;
  choix = choixExemple();
  exemple = true;
  rafraichir();
}
document.getElementById("modeCommunes").addEventListener("click", () => changerMode("commune"));
document.getElementById("modeRegions").addEventListener("click", () => changerMode("region"));

document.getElementById("ajoutForm").addEventListener("submit", e => {
  e.preventDefault();
  const msg = document.getElementById("ajoutMsg");
  if (choix.length >= MAX) return;
  if (exemple) { choix = []; exemple = false; }
  if (mode === "region") {
    const k = document.getElementById("ajoutRegion").value;
    if (k && !choix.includes(k)) choix.push(k);
  } else {
    const champ = document.getElementById("ajoutCommune");
    const c = trouverCommune(champ.value);
    if (!c) { msg.textContent = champ.value.trim() ? `Aucune commune ne correspond à « ${champ.value.trim()} ».` : "Saisissez le nom d'une commune."; return; }
    if (choix.includes(c)) { msg.textContent = `${libelle(c)} est déjà dans la comparaison.`; return; }
    choix.push(c); champ.value = "";
  }
  rafraichir();
  if (mode === "commune") document.getElementById("ajoutCommune").focus();
});

document.querySelectorAll("#sujetCmp button").forEach(b => b.addEventListener("click", () => {
  sujetCmp = b.dataset.sujet;
  document.querySelectorAll("#sujetCmp button").forEach(x => { const actif = x === b; x.classList.toggle("on", actif); x.setAttribute("aria-pressed", actif); });
  afficherResultats();
}));
document.getElementById("commencer").addEventListener("click", () => {
  choix = []; exemple = false; rafraichir();
  document.getElementById(mode === "region" ? "ajoutRegion" : "ajoutCommune").focus();
});
document.getElementById("toutRetirer").addEventListener("click", () => { choix = []; exemple = false; rafraichir(); });
document.getElementById("copierLien").addEventListener("click", async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = "Lien copié"; }
  catch (e) { b.textContent = "Copiez l'adresse de la page"; }
  setTimeout(() => { b.textContent = "Copier le lien de cette comparaison"; }, 2500);
});

// ---------- démarrage ----------
initialiserNavigation();
if (mode === "region") choix = params.getAll("r").map(k => k.toUpperCase()).filter(k => REGION_STATS[k]);
else choix = params.getAll("c").map(n => trouverCommune(n)).filter(Boolean);
choix = choix.filter((x, i) => choix.indexOf(x) === i).slice(0, MAX);
if (!choix.length) {
  exemple = true;
  choix = choixExemple();
}
rafraichir();
