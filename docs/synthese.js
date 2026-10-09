// Synthèse en une page : la situation, les priorités, ce que le site calcule et ce qu'il ne dit pas.
// Tous les chiffres sont calculés ici à partir des données du site : rien n'est écrit à la main, donc rien ne peut se contredire.
// `communes`, `fmt`, `fmt1`, `mot`, `libelle`, `nomRegion`, `lienFiche` viennent de site.js.
const syMoteur = creerMoteurSimulation({ communes });
const syId = id => document.getElementById(id);
const syMilliers = x => fmt(Math.round(x / 1000) * 1000);
const syLi = (rang, nom, href, sous, droite, legende) => `<li><span class="rang">${rang}</span><span class="sy-nom"><a href="${href}">${nom}</a><small>${sous}</small></span><span class="sy-val"><b>${droite}</b><small>${legende}</small></span></li>`;

const syPop = communes.reduce((s, c) => s + c.p, 0), syDef = communes.reduce((s, c) => s + c.dp, 0), syDef33 = communes.reduce((s, c) => s + c.dp33, 0);
const syVerifiees = communes.filter(c => c.fb === 1), sySansEcole = syVerifiees.filter(c => c.ne === 0).length;
const syEtab = communes.reduce((s, c) => s + c.ne, 0), sySousNorme = communes.filter(c => c.dp > 0).length;

syId("syPhrase").innerHTML = `Le Sénégal compte <b>${communes.length} communes</b> et <b>${fmt1(syPop / 1e6)} millions d'habitants</b>. Selon la norme du Ministère de la Santé (un poste de santé pour 10 000 habitants), il manque <b>${fmt(syDef)} postes de santé</b> aujourd'hui, et environ <b>${fmt(syDef33)}</b> en 2033 si aucun n'est construit.`;
syId("syKpis").innerHTML = [
  ["Postes de santé manquants aujourd'hui", fmt(syDef), "carte-chiffre-fort"],
  ["Communes sous la norme", fmt(sySousNorme), ""],
  ["Manquants en 2033 (indicatif)", fmt(syDef33), "carte-chiffre-gain"],
  ["Collèges et lycées recensés", fmt(syEtab), ""]
].map(([t, v, c]) => `<div class="carte-chiffre ${c}"><span>${t}</span><b>${v}</b></div>`).join("");
syId("syNoteEdu").textContent = `En éducation, ${fmt(sySansEcole)} communes sur ${syVerifiees.length} n'ont ni collège ni lycée recensé. C'est un constat, pas un déficit : aucune norme officielle n'existe pour le secondaire.`;

// les cinq communes où il manque le plus de postes (à égalité : la plus peuplée d'abord)
const syTop = communes.slice().sort((a, b) => b.dp - a.dp || b.p - a.p).slice(0, 5);
syId("syCommunes").innerHTML = syTop.map((c, i) => syLi(i + 1, libelle(c), lienFiche(c), `${nomRegion(c)}, ${fmt(c.p)} habitants`, c.dp, mot(c.dp, "poste manquant", "postes manquants"))).join("");
// les trois régions les plus touchées, rapportées à la population
const syRegions = Object.entries(REGION_STATS).map(([k, r]) => ({ k, r, taux: r.pop > 0 ? r.deficitPoste / r.pop * 100000 : 0 })).sort((a, b) => b.taux - a.taux).slice(0, 3);
syId("syRegions").innerHTML = syRegions.map(({ k, r, taux }, i) => syLi(i + 1, NOMS_REGIONS[k] || k, "explorer.html", `${fmt(r.deficitPoste)} ${mot(r.deficitPoste, "poste manquant", "postes manquants")}, ${fmt(r.pop)} habitants`, fmt1(taux), "pour 100 000 habitants")).join("");

// que peut-on faire avec 10 postes ?
const syBudget = 10, syRes = syMoteur.selectionGloutonne(syBudget, "2023", null), sySimple = syMoteur.selectionSimple(syBudget, "2023", null);
const syCJ = syMoteur.couvertureReelle(syRes.map(r => r.c), "2023"), syCS = syMoteur.couvertureReelle(sySimple, "2023");
const syPct = syCS > 0 ? (syCJ - syCS) / syCS * 100 : 0, syRang = syRes.findIndex(r => r.cumul >= syCS) + 1;
syId("syBudget").innerHTML = `<p>Avec <b>${syBudget} postes</b>, un simple classement par déficit desservirait environ <b>${syMilliers(syCS)} habitants</b>. L'algorithme de Jàppale en dessert environ <b>${syMilliers(syCJ)}</b>, soit <b>+${fmt1(syPct)} %</b>${syRang > 0 && syRang < syBudget ? `, et il y parvient avec ${syRang} postes au lieu de ${syBudget}` : ""} : il évite de construire deux postes l'un à côté de l'autre.</p>
  <p class="sy-note">Premières communes retenues : ${syRes.slice(0, 5).map(r => libelle(r.c)).join(", ")}. <a href="simulateur.html">Essayer avec vos propres chiffres</a>.</p>`;
syId("syDate").textContent = "Édité le " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
syId("syImprimer").addEventListener("click", () => window.print());
initialiserNavigation();
