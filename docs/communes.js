// Page Communes : liste filtrable et triable (communes.html) et fiche complète (communes.html?commune=...).
// Les règles d'affichage (seuils, textes de fiabilité, vue bassin, hôpitaux) reprennent celles de script.js.

const params = new URLSearchParams(location.search);

// ---------- agrégats région / pays pour les comparaisons ----------
function agreger(liste) {
  return liste.reduce((a, c) => ({ p: a.p + c.p, np: a.np + c.np, bp: a.bp + c.bp, dp: a.dp + c.dp }), { p: 0, np: 0, bp: 0, dp: 0 });
}
const NATIONAL = agreger(communes);
const parRegion = {};
communes.forEach(c => { (parRegion[cleRegion(c.r)] = parRegion[cleRegion(c.r)] || []).push(c); });

// ---------- repères éducation (identiques à refEducation / classeEducation de script.js) ----------
const refEducation = (() => {
  const tension = communes.filter(c => c.fb === 1).map(c => c.p / (c.ne + 1)).sort((a, b) => a - b);
  const ratios = communes.filter(c => c.ne > 0).map(c => c.p / c.ne).sort((a, b) => a - b);
  return { tension, mediane: ratios[Math.floor(ratios.length / 2)] };
})();
function classeEducation(c) {
  if (c.fb !== 1) return null;
  const x = c.p / (c.ne + 1);
  const rang = refEducation.tension.filter(y => y < x).length / (refEducation.tension.length - 1) * 100;
  return rang >= 67 ? "haute" : rang <= 33 ? "basse" : "moyenne";
}

const val = v => (v === null || v === undefined) ? "non disponible" : fmt(v);
const badge = (texte, couleur) => `<span class="badge" style="--c:${couleur}">${texte}</span>`;

// =====================================================================
// Fiche d'une commune
// =====================================================================
const nombreFr = n => Number(n).toFixed(1).replace(".", ",");

// Texte lu à voix haute par la synthèse vocale du navigateur : phrases courtes, mêmes chiffres que la fiche.
function texteLectureFiche(c) {
  const f = typeof RECALAGE_POSTES !== "undefined" ? RECALAGE_POSTES[cleRegion(c.r)] : null;
  const alt = f ? Math.max(0, Math.floor(c.bp - c.np * f + 0.5)) : null;
  const iso = typeof ISOLEMENT_SECONDAIRE !== "undefined" ? ISOLEMENT_SECONDAIRE[`${c.n}|${c.d}`] : undefined;
  return [`Fiche de la commune de ${c.n}, département de ${c.d}, région de ${nomRegion(c)}.`, `${c.p.toLocaleString("fr-FR")} habitants.`,
    `Il manque environ ${c.dp} postes de santé${alt !== null && alt !== c.dp ? `, entre ${Math.min(c.dp, alt)} et ${Math.max(c.dp, alt)} selon le nombre de postes retenu` : ""}.`,
    c.hp ? `L'hôpital le plus proche est ${c.hp}, à ${c.hk} kilomètres à vol d'oiseau.` : "",
    iso === 0 ? "La commune compte au moins un collège ou lycée." : (typeof iso === "number" ? `Le collège ou lycée le plus proche est à ${iso.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kilomètres, probablement moins, car la liste des établissements est incomplète.` : ""),
    "Ces chiffres sont des ordres de grandeur, à confirmer avec les services compétents."].filter(Boolean).join(" ");
}

// Carte du Sénégal pour la fiche de décision : régions en gris clair, région de la commune en gris foncé, commune en point cerclé rouge avec son nom.
function carteDecision(c, cle) {
  if (typeof regionShapes === "undefined" || c.lat === null || c.lat === undefined) return "";
  const x = 20 + (c.lon + 17.536) * 61.7, y = 20 + (16.691 - c.lat) * 61.7, est = x > 290, nom = c.n.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const fonds = Object.entries(regionShapes).map(([k, r]) => `<path d="${r.d}" fill="${k === cle ? "#8c8c8c" : "#dedede"}" stroke="#fff" stroke-width="1"${k === cle ? ' data-region="1"' : ""}/>`).join("");
  return `<figure class="d-carte"><svg class="d-carte-svg" viewBox="0 15 420 290" role="img" aria-label="Carte du Sénégal : la commune de ${nom} est marquée par un point cerclé, sa région est en gris foncé">${fonds}<circle class="d-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="none" stroke="#b3261e" stroke-width="2.2"/><circle class="d-pt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#b3261e" stroke="#fff" stroke-width="1.5"/><text class="d-nom" x="${(x + (est ? -15 : 15)).toFixed(1)}" y="${(y - 12).toFixed(1)}" font-size="19" font-weight="700" text-anchor="${est ? "end" : "start"}" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke">${nom}</text></svg><figcaption>Carte : contours des régions (Natural Earth) ; position de la commune d'après la source des infrastructures.</figcaption></figure>`;
}

function afficherFiche(c) {
  document.body.classList.add("page-fiche");   // les règles d'impression de la fiche de décision ne concernent que cette vue
  document.title = `${libelle(c)} - Jàppale Sénégal`;
  document.getElementById("vueListe").hidden = true;
  const fiche = document.getElementById("vueFiche");
  fiche.hidden = false;

  const cle = cleRegion(c.r);
  const reg = REGION_STATS[cle];
  const regAgg = agreger(parRegion[cle]);
  const niv = niveauSante(c);

  // vue bassin (même lecture que la fiche de la carte)
  let bassin = "", phraseBassin = "";
  if (c.dpb !== null && c.dpb !== undefined) {
    const b = Math.round(c.dpb), ecart = b - c.dp;
    if (ecart < 0) phraseBassin = `${Math.abs(ecart)} ${mot(ecart, "poste de moins", "postes de moins")} que dans le compte de la commune seule : les communes voisines ont des postes peu sollicités, dont ${c.n} profite.`;
    else if (ecart > 0) phraseBassin = `${ecart} ${mot(ecart, "poste de plus", "postes de plus")} que dans le compte de la commune seule : les postes de ${c.n} servent aussi les communes voisines, il reste moins de capacité pour ses habitants.`;
    else phraseBassin = "Le voisinage ne change pas la lecture de cette commune.";
    bassin = `<div class="kpi"><span class="kpi-lab">Vue bassin (15 km)</span><b class="num">${b}</b><span class="kpi-sub">${mot(b, "poste manquant", "postes manquants")} en partageant les postes des communes voisines</span></div>`;
  }

  // comparaisons : postes pour 10 000 habitants (norme = 1) et déficit pour 100 000 habitants
  const densite = x => x.p > 0 ? x.np / x.p * 1e4 : 0;
  const tauxDef = x => x.p > 0 ? x.dp / x.p * 1e5 : 0;
  const lignesDensite = [[c.n, densite(c), true], [`Région de ${nomRegion(c)}`, densite(regAgg)], ["Sénégal", densite(NATIONAL)]];
  const maxD = Math.max(1.2, ...lignesDensite.map(l => l[1])) * 1.1;
  const lignesDef = [[c.n, tauxDef(c), true], [`Région de ${nomRegion(c)}`, tauxDef(regAgg)], ["Sénégal", tauxDef(NATIONAL)]];
  const maxT = Math.max(...lignesDef.map(l => l[1]), 0.1) * 1.1;
  const barres = (lignes, max, unite, norme) => `<div class="barres">${lignes.map(([nom, v, soi]) => `
      <div class="barre${soi ? " soi" : ""}"><span class="b-nom">${nom}</span><span class="b-piste"><i style="width:${Math.min(100, v / max * 100)}%"></i>${norme ? `<em style="left:${norme / max * 100}%" title="Norme"></em>` : ""}</span><span class="b-val num">${fmt1(v)}</span></div>`).join("")}
      <div class="b-unite">${unite}</div></div>`;

  // éducation
  const classe = classeEducation(c);
  const edu = { haute: ["var(--edu-hi)", "Parmi les plus tendues"], moyenne: ["var(--edu-mid)", "Situation intermédiaire"], basse: ["var(--edu-lo)", "Parmi les moins tendues"] }[classe] || ["var(--m-moyen)", "Donnée à confirmer"];
  const rapport = c.ne > 0 ? `1 établissement pour ${fmt(c.p / c.ne)} habitants` : "Aucun établissement secondaire recensé";

  // fiabilité
  const pill = (txt, bon) => `<span class="pill ${bon ? "ok" : "warn"}">${txt}</span>`;
  const fiab = pill(c.fb === 1 ? "Données vérifiées" : "Donnée à confirmer", c.fb === 1) + pill(c.tm === 1 ? "Croissance mesurée 2013-2023" : "Scénario 2033 indicatif", c.tm === 1);

  // hôpital
  const hopital = [];
  if (c.hp) hopital.push(`Hôpital le plus proche : <b>${c.hp}</b>, à ${c.hk} km à vol d'oiseau.`);
  if (reg) hopital.push(`Région de ${nomRegion(c)} : ${reg.nbHopitaux} ${mot(reg.nbHopitaux, "hôpital", "hôpitaux")} pour ${fmt(reg.pop)} habitants (norme : ${reg.besoinHopitaux}).`);
  hopital.push(c.nh === 0 ? "« 0 » signifie aucun hôpital dans le département, pas aucun accès : un hôpital dessert aussi les départements voisins." : "Un hôpital dessert aussi les départements voisins.");

  // autres communes du département
  const voisines = communes.filter(x => x.d === c.d && x.r === c.r && x !== c).sort((a, b) => b.dp - a.dp);

  // mini-carte : la région de la commune mise en évidence (les coordonnées des communes ne sont pas projetées sur ce fond)
  const carte = Object.keys(regionShapes).map(k => `<path d="${regionShapes[k].d}" class="${k === cle ? "ici" : ""}"><title>${NOMS_REGIONS[k] || k}</title></path>`).join("");

  // fiche de décision : cachée à l'écran, imprimée seule sur une page A4 (voir communes.css)
  const pers = typeof PERSONNEL_REGION !== "undefined" ? PERSONNEL_REGION[cle] : null;
  const isoKm = typeof ISOLEMENT_SECONDAIRE !== "undefined" ? ISOLEMENT_SECONDAIRE[`${c.n}|${c.d}`] : undefined;
  const dec1 = x => x.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dec2 = x => x.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const decPers = pers ? `Région de ${nomRegion(c)} (annuaire des ressources humaines 2022) : ${pers.couverture} % des normes du Ministère de la Santé atteintes en moyenne. Médecins : ${dec2(pers.medecins)} pour 10 000 habitants (norme : 1) ; infirmiers diplômés d'État : ${dec2(pers.ide)} pour 5 000 habitants (norme : 1) ; sages-femmes : ${dec2(pers.sfe)} pour 1 500 femmes en âge de procréer (norme : 1). Le personnel n'est connu que par région.` : "Le personnel de santé n'est pas disponible pour cette région.";
    const fact = typeof RECALAGE_POSTES !== "undefined" ? RECALAGE_POSTES[cle] : null;
  const dpAlt = fact ? Math.max(0, Math.floor(c.bp - c.np * fact + 0.5)) : null;
  const fourchette = dpAlt !== null && dpAlt !== c.dp ? [Math.min(c.dp, dpAlt), Math.max(c.dp, dpAlt)] : null;
    const scol = typeof SCOLARISATION_REGION !== "undefined" ? SCOLARISATION_REGION[cle] : null, scolNat = typeof SCOLARISATION_REGION !== "undefined" ? SCOLARISATION_REGION.NATIONAL : null;
  const decScol = scol && scolNat ? `Scolarisation dans la région de ${nomRegion(c)} : le taux net de scolarisation au secondaire (16-18 ans) est de ${nombreFr(scol.tns)} % (moyenne nationale : ${nombreFr(scolNat.tns)} %) et le taux brut de ${nombreFr(scol.tbs)} % (RGPH-5, 2023).` : "";
  const officiel2033 = c.dp33o !== null && c.dp33o !== undefined;
  const dec2033 = officiel2033 ? ` Avec la projection officielle de l'ANSD (${fmt(c.p33o)} habitants en 2033) : ${c.dp33o} ${mot(c.dp33o, "manquant", "manquants")}.` : " La projection officielle de l'ANSD n'est pas utilisée pour cette commune : le tableau de projections et le recensement ne s'accordent pas sur elle.";
  const res = typeof RESSENTI_DISTANCE_REGION !== "undefined" ? RESSENTI_DISTANCE_REGION[cle] : null;
  const decRes = res ? `Dans la région de ${nomRegion(c)}, ${res.pct.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % des femmes de 15 à 49 ans jugeaient en 2017 la distance à l'établissement de santé un problème important (EDS-Continue 2017, ANSD${res.n < 300 ? " ; échantillon réduit : " + res.n + " femmes" : ""}).` : "";
      const carteDec = carteDecision(c, cle);
  // Pilote ANSD (Dakar, Diourbel, Thiès) : services sociaux de base géoréférencés, totaux de la commune
  const pil = typeof PILOTE !== "undefined" && PILOTE[`${c.r}|${c.d}|${c.n}`] ? (() => { const v = PILOTE[`${c.r}|${c.d}|${c.n}`], o = {}; PILOTE_COLONNES.forEach((k, i) => { o[k] = v[i]; }); return o; })() : null;
    const compte = (n, s, p) => `${n} ${mot(n, s, p)}`, enumerer = parts => parts.filter(x => x[0] > 0).map(x => compte(x[0], x[1], x[2])).join(", ") || "aucun";
    const kmSec = v => v === 0 ? "sur place" : `à ${nombreFr(v)} km`, kmNu = v => v === 0 ? "sur place" : `${nombreFr(v)} km`;
  const pilSante = pil ? `Selon l'ANSD (pilote) : ${compte(pil.postes, "poste de santé", "postes de santé")} (notre couche : ${pil.postes_notre_couche}), ${enumerer([[pil.centres_sante, "centre de santé", "centres de santé"], [pil.hopitaux, "hôpital", "hôpitaux"], [pil.cases_sante, "case de santé", "cases de santé"]])} ; il en manquerait ${Math.max(0, c.bp - pil.postes)} avec ces postes.` : "";
  const secAnsd = pil ? pil.college_public + pil.college_prive + pil.lycee_public + pil.lycee_prive : 0;
  const pilEdu = pil ? `Selon l'ANSD (pilote) : ${compte(secAnsd, "collège ou lycée", "collèges et lycées")} (notre couche : ${pil.secondaire_notre_couche}), le plus proche ${kmSec(pil.distance_secondaire_ansd_km)}${pil.distance_secondaire_notre_couche_km !== pil.distance_secondaire_ansd_km ? ` (notre couche : ${kmSec(pil.distance_secondaire_notre_couche_km)})` : ""}.` : "";
  const pilEau = pil ? `Eau : ${compte(pil.forages, "forage", "forages")} et ${compte(pil.chateaux_eau, "château d'eau", "châteaux d'eau")}${cle === "DAKAR" ? " (à Dakar, surtout le réseau)" : ""}.` : "";
  const decEdu =   (isoKm === undefined || isoKm === null) ? "Distance non calculée : cette commune n'est pas géolocalisée." : (isoKm === 0 ? `${c.ne} ${mot(c.ne, "établissement", "établissements")} (collèges et lycées, publics et privés) dans la commune.` : `Aucun collège ni lycée dans la commune ; le plus proche est à ${dec1(isoKm)} km à vol d'oiseau.`);
  const decChiffreEdu = (isoKm === undefined || isoKm === null) ? "non calculée" : (isoKm === 0 ? "sur place" : `${dec1(isoKm)} km`);
  const decision = `
      <section class="decision" id="ficheDecision" aria-label="Fiche de décision imprimable">
        <div class="d-marque"><span>Jàppale Sénégal</span><span>Fiche de décision</span></div>
                <div class="d-haut${carteDec ? "" : " sans-carte"}">
          <div class="d-gauche">
            <h2>${c.n}</h2>
            <p class="d-lieu">Commune du département de ${c.d}, région de ${nomRegion(c)} : ${fmt(c.p)} habitants (RGPH-5, 2023).</p>
            ${carteDec ? `<ul class="d-legende"><li>Le point cerclé marque la commune de ${c.n}.</li><li>La zone gris foncé est la région de ${nomRegion(c)}.</li></ul>` : ""}
          </div>
          ${carteDec}
        </div>
        <div class="d-chiffres">
          <div><b>${c.dp}</b><span>${mot(c.dp, "poste de santé manquant", "postes de santé manquants")} (ordre de grandeur)</span></div>
          <div><b>${decChiffreEdu}</b><span>collège ou lycée le plus proche (à vol d'oiseau)</span></div>
          <div><b>${pers ? pers.couverture + " %" : "non disponible"}</b><span>des normes de personnel de santé atteintes dans la région (2022)</span></div>
        </div>
        <h3>Santé</h3>
        <ul>
          <li>Postes de santé : ${c.np} existants pour ${c.bp} nécessaires selon la norme du Ministère (1 pour 10 000 habitants), soit ${c.dp} ${mot(c.dp, "manquant", "manquants")}.${fourchette ? ` Avec le nombre officiel de postes de la région (2022), le manque serait de ${dpAlt} : la fourchette est de ${fourchette[0]} à ${fourchette[1]}.` : ""}${c.dpb !== null && c.dpb !== undefined ? ` En partageant les postes des communes situées à moins de 15 km : ${Math.round(c.dpb)}.` : ""}</li>
          <li>Scénario 2033 : ${val(c.dp33)} ${c.dp33 === null || c.dp33 === undefined ? "" : mot(c.dp33, "poste manquant", "postes manquants")} (${c.tm === 1 ? "croissance mesurée entre 2013 et 2023" : "indicatif : croissance non mesurée"}).${dec2033}</li>
          <li>${c.hp ? `Hôpital le plus proche : ${c.hp}, à ${c.hk} km à vol d'oiseau.` : "Hôpital le plus proche : non calculé."}</li>
          <li>Département de ${c.d} : ${c.nc} ${mot(c.nc, "centre de santé", "centres de santé")} pour ${c.bc} nécessaires, ${c.nh} ${mot(c.nh, "hôpital", "hôpitaux")} pour ${c.bh} nécessaires (échelle du département).</li>
          <li>${decPers}</li>
          ${decRes ? `<li>${decRes}</li>` : ""}
                  ${pil ? `<li>${pilSante}</li>` : ""}
        </ul>
        <h3>Éducation secondaire</h3>
        <ul>
                              <li>${decEdu}</li>
          ${pil ? `<li>${pilEdu} ${pilEau}</li>` : ""}

                    ${decScol ? `<li>${decScol}</li>` : ""}


          ${pil ? "" : `<li>La couche recense environ la moitié des établissements du moyen et du secondaire (1 342 contre 2 649 au recensement scolaire) : cette distance est probablement surestimée.</li>`}
          <li>Aucune norme officielle de distance n'a été trouvée. La norme officielle porte sur la taille des classes : 20 à 45 élèves (33 en moyenne) ; la moyenne publique nationale est de 46,0.</li>
        </ul>
        <h3>Fiabilité et limites</h3>
        <ul>
          <li>${c.fb === 1 ? "Rattachement des infrastructures à la commune vérifié." : "Donnée à confirmer : aucune infrastructure n'a pu être rattachée à cette commune ; ses postes sont peut-être sous-estimés et son manque surestimé."}</li>
          <li>Les chiffres sont des ordres de grandeur : la couche des postes de santé en compte plus que les documents du Ministère de la Santé (2 124 contre 1 531 à 1 731, et 1 584 en 2022).</li>
          <li>Les distances sont à vol d'oiseau, sans temps de trajet réel ; le personnel de santé date de 2022 et n'est connu que par région.</li>
        </ul>
        <h3>Sources</h3>
        <ul class="d-sources">
          <li>Population : ANSD, recensement RGPH-5 (2023) ; projection 2033 : ANSD, Projections démographiques 2023-2073.</li>
          <li>Santé : infrastructures (ANSD, Géo Sénégal) ; nombres officiels de structures : annuaire statistique 2022 du Ministère de la Santé et carte sanitaire de la CSSDOS (portail e-santé, consulté le 8 octobre 2026) ; personnel : annuaire des ressources humaines 2022 ; ressenti de distance : EDS-Continue 2017 (ANSD).</li>
          <li>Éducation : établissements (ANSD, Géo Sénégal) ; scolarisation : RGPH-5, thème II ; taille des classes : livret des normes et standards de l'École.</li>
          <li>Carte : contours des régions (Natural Earth) ; position de la commune d'après la source des infrastructures.</li>
          ${pil ? `<li>Lignes « pilote » : services sociaux de base géoréférencés remis par l'ANSD (RGPH-5, 2023), totaux de la commune.</li>` : ""}
        </ul>
        <p class="d-pied">Méthode et limites : page Méthode du site. Fiche indicative, à confirmer avec les services du Ministère. Projet de hackathon : ce n'est pas une statistique officielle de l'ANSD, et elle ne doit pas servir à classer des responsables. Édité le ${new Date().toLocaleDateString("fr-FR")}.</p>
      </section>`;

  fiche.innerHTML = `
    <nav class="fil" aria-label="Fil d'Ariane">
      <a href="communes.html">Communes</a><span>›</span>
      <a href="communes.html?region=${cle}">${nomRegion(c)}</a><span>›</span>
      <a href="communes.html?region=${cle}&departement=${encodeURIComponent(c.d)}">${c.d}</a><span>›</span>
      <span aria-current="page">${c.n}</span>
    </nav>

    <header class="fiche-head">
      <div>
        <div class="eyebrow">Commune, département de ${c.d}, région de ${nomRegion(c)}</div>
        <h1>${c.n}</h1>
        <div class="fiche-tags">${badge(niv.texte, niv.couleur)}${fiab}</div>
      </div>
      <div class="fiche-actions">
        <a class="btn" href="${lienCarte(c)}">Voir sur la carte</a>
        <a class="btn-ghost" href="comparer.html?c=${encodeURIComponent(libelle(c))}">Comparer</a>
        </div>
        <details class="fiche-plus">
          <summary class="btn-ghost">Imprimer, télécharger, partager</summary>
          <div class="fiche-actions">
          <button type="button" class="btn-ghost" id="copierLien">Copier le lien</button>
          ${c.lat !== null && c.lat !== undefined ? `<a class="btn-ghost" id="carteGoogle" href="https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}" target="_blank" rel="noopener noreferrer">Voir sur Google Maps<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a>
          <a class="btn-ghost" id="carteOsm" href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=13/${c.lat}/${c.lon}" target="_blank" rel="noopener noreferrer">OpenStreetMap<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a>` : ""}
        <button type="button" class="btn-ghost" id="imprimerFiche">Imprimer la fiche de décision</button>
          <button type="button" class="btn-ghost" id="pdfFiche">Télécharger en PDF</button>
          <button type="button" class="btn-ghost" id="wordFiche">Télécharger en Word</button>
          <button type="button" class="btn-ghost" id="ecouterFiche" hidden>Écouter la fiche</button><span class="sr-only" id="ecouterEtat" role="status" aria-live="polite"></span>
          <p class="fiche-aide" id="ficheAide" role="status" aria-live="polite">Pour garder ou transmettre la fiche : imprimez-la, ou téléchargez-la en PDF ou en Word. Si l'impression ne s'ouvre pas, utilisez le PDF.</p>
          </div>
        </details>
          
      </div>
    </header>
    ${(c.np === 0 && c.ns > 0 && c.fb === 1) ? `<p class="alerte alerte-info">${c.n} compte ${c.ns} ${mot(c.ns, "centre de santé ou hôpital", "centres de santé ou hôpitaux")} mais aucun poste de santé : une structure de niveau supérieur la dessert sur place. Son déficit de postes est à lire avec prudence.</p>` : ""}
    ${c.fb !== 1 ? `<p class="alerte">Aucune infrastructure n'a pu être rattachée à cette commune : ses postes sont peut-être sous-estimés et son déficit surestimé. À vérifier auprès de l'ANSD.</p>` : ""}

    <div class="kpis">
      <div class="kpi kpi-fort"><span class="kpi-lab">Postes de santé manquants</span><b class="num">${c.dp}</b><span class="kpi-sub">${c.np} existants pour ${c.bp} nécessaires (1 pour 10 000 hab.)</span>${fourchette ? `<span class="kpi-sub kpi-fourchette">Fourchette : ${fourchette[0]} à ${fourchette[1]} selon le nombre de postes retenu (couche de données, ou statistiques officielles de 2022).</span>` : ""}</div>
      <div class="kpi"><span class="kpi-lab">Scénario 2033</span><b class="num">${val(c.dp33)}</b><span class="kpi-sub">${c.tm === 1 ? "avec la croissance mesurée 2013-2023" : "indicatif : croissance non mesurée"}</span>${officiel2033 ? `<span class="kpi-sub kpi-officiel">Avec la projection officielle de l'ANSD (${fmt(c.p33o)} habitants) : ${c.dp33o}</span>` : ""}</div>
      ${bassin}
      <div class="kpi"><span class="kpi-lab">Population</span><b class="num">${fmt(c.p)}</b><span class="kpi-sub">habitants (RGPH-5 2023)</span></div>
    </div>

    <div class="fiche-grille">
      <div class="fiche-col">
        <p class="groupe">Cette commune seulement</p>
        <details class="comprendre"><summary>Comprendre ce chiffre</summary><dl>
          <dt>Le chiffre</dt><dd>${c.dp} ${mot(c.dp, "poste de santé manquant", "postes de santé manquants")} en 2023.</dd>
          <dt>Ce qu'il mesure</dt><dd>Le nombre de postes de santé à ajouter pour atteindre la norme du Ministère de la Santé : un poste pour 10 000 habitants.</dd>
          <dt>Pourquoi c'est important</dt><dd>Le poste de santé est le premier lieu de soins près de chez soi : consultations, vaccination, suivi des grossesses. Quand il manque, il faut aller plus loin pour se soigner.</dd>
          <dt>Comment le lire</dt><dd>La commune a ${c.np} ${mot(c.np, "poste", "postes")} pour ${c.bp} ${mot(c.bp, "nécessaire", "nécessaires")}. Dans tout le pays, ${communes.filter(x => x.dp > 0).length} communes sur ${communes.length} ont au moins un poste manquant.</dd>
          <dt>La source</dt><dd>Population : recensement RGPH-5 (ANSD, 2023). Postes : infrastructures géolocalisées (ANSD, Géo Sénégal). Norme : Ministère de la Santé.</dd>
        </dl></details>
        <section class="carte-bloc agir" id="agir">
          <h2>Agir : que peut-on faire ?</h2>
          <table>
            <tr><th scope="row">Constat</th><td>${c.np} ${mot(c.np, "poste de santé", "postes de santé")} pour ${fmt(c.p)} habitants (recensement 2023) ; la norme en demande ${c.bp}.</td></tr>
            <tr><th scope="row">Besoin identifié</th><td>${c.dp > 0 ? `${c.dp} ${mot(c.dp, "poste de santé manquant", "postes de santé manquants")} selon la norme. C'est un ordre de grandeur.` : "Aucun poste manquant selon la norme."}</td></tr>
            <tr><th scope="row">Piste d'action</th><td>${c.dp > 0 ? `Étudier, avec le district sanitaire, l'ouverture de ${mot(c.dp, "ce poste", "ces postes")} ou le renforcement des postes existants. C'est une piste à vérifier sur le terrain, pas une décision.` : "Maintenir l'offre et vérifier le personnel et l'équipement des postes, que ce site ne mesure pas."}</td></tr>
            <tr><th scope="row">Acteurs concernés</th><td>À confirmer : la commune, le district sanitaire et la région médicale (Ministère de la Santé), les partenaires au développement, la population.</td></tr>
            <tr><th scope="row">Échéance</th><td>À définir avec ces acteurs : les données ne permettent pas de la fixer.</td></tr>
            <tr><th scope="row">Indicateur de suivi</th><td>Le nombre de postes de santé fonctionnels pour 10 000 habitants, d'une année à l'autre (annuaire du Ministère de la Santé, carte sanitaire).</td></tr>
            <tr><th scope="row">Source et limites</th><td>Recensement RGPH-5 (ANSD, 2023) ; infrastructures géolocalisées (ANSD, Géo Sénégal). La couche peut compter des postes qui ne fonctionnent pas ; le personnel et la qualité des soins ne sont pas mesurés.</td></tr>
          </table>
          <p class="note">Si une action est engagée, notez sa date et sa nature, puis suivez l'indicateur. Une amélioration ne pourra pas être attribuée au site sans preuve. Pour l'éducation, il n'existe pas de norme officielle : la fiche donne un constat, pas un besoin chiffré.</p>
        </section>
        <section class="carte-bloc">
          <h2>Éducation secondaire</h2>
          <div class="edu">${badge(edu[1], edu[0])}<b class="num">${c.ne}</b><span>${mot(c.ne, "établissement", "établissements")} (collèges et lycées, publics et privés)</span></div>
          <p>${rapport}. Repère : la médiane des communes qui en ont au moins un est de 1 établissement pour ${fmt(refEducation.mediane)} habitants.</p>
          ${decScol ? `<p>${decScol}</p>` : ""}
          <p class="note">Aucune norme officielle de densité n'est confirmée pour l'éducation à ce stade : cette valeur est un constat, pas un déficit normé. Le primaire n'est pas couvert. L'enseignement supérieur est présenté à part, juste en dessous.</p>
        </section>
                  ${pil ? `<section class="carte-bloc" id="pilote">
          <h2>Services de base : données de l'ANSD</h2>
          <p class="note"><b>Pilote : Dakar, Diourbel et Thiès.</b> Points géoréférencés remis par l'ANSD (RGPH-5, 2023). Nous n'en publions que les totaux par commune.</p>
          <h3>Santé</h3>
          <ul><li>${compte(pil.postes, "poste de santé", "postes de santé")} (notre couche : ${pil.postes_notre_couche}), pour ${c.bp} nécessaires : il en manquerait ${Math.max(0, c.bp - pil.postes)} avec les postes de l'ANSD.</li>
          <li>Autres structures : ${enumerer([[pil.centres_sante, "centre de santé", "centres de santé"], [pil.hopitaux, "hôpital", "hôpitaux"], [pil.cases_sante, "case de santé", "cases de santé"], [pil.maternites, "maternité", "maternités"], [pil.centres_medico_sociaux, "centre médico-social", "centres médico-sociaux"]])}.</li>
          <li>Privé et officines : ${enumerer([[pil.cliniques_cabinets, "clinique ou cabinet", "cliniques et cabinets"], [pil.pharmacies, "pharmacie", "pharmacies"], [pil.laboratoires, "laboratoire", "laboratoires"]])}.</li></ul>
          <h3>Éducation</h3>
          <ul><li>Secondaire : ${enumerer([[pil.college_public, "collège public", "collèges publics"], [pil.college_prive, "collège privé", "collèges privés"], [pil.lycee_public, "lycée public", "lycées publics"], [pil.lycee_prive, "lycée privé", "lycées privés"]])} (notre couche en connaît ${pil.secondaire_notre_couche}). Le plus proche : ${kmSec(pil.distance_secondaire_ansd_km)}${pil.distance_secondaire_notre_couche_km !== pil.distance_secondaire_ansd_km ? `, alors que notre couche donnait ${kmNu(pil.distance_secondaire_notre_couche_km)}` : ""}.</li>
          <li>Écoles : ${enumerer([[pil.elementaire_public, "école élémentaire publique", "écoles élémentaires publiques"], [pil.elementaire_prive, "école élémentaire privée", "écoles élémentaires privées"], [pil.petite_enfance, "structure de petite enfance", "structures de petite enfance"]])}.</li>
          <li>Après le secondaire : ${enumerer([[pil.formation, "centre ou institut de formation", "centres et instituts de formation"], [pil.universites, "université", "universités"]])}.</li></ul>
          <h3>Eau</h3>
          <ul><li>${compte(pil.forages, "forage", "forages")} et ${compte(pil.chateaux_eau, "château d'eau", "châteaux d'eau")} recensés${cle === "DAKAR" ? ". À Dakar l'eau vient surtout du réseau de distribution : ces points ne mesurent pas l'accès" : ""}. Le fichier remis ne contient aucune structure d'assainissement.</li></ul>
          </section>` : ""}
          <section class="carte-bloc">
          <h2>Enseignement supérieur public</h2>
          ${(c.nu || c.nv) ? `<div class="edu"><b class="num">${c.nu}</b><span>${mot(c.nu, "campus", "campus")} d'université publique</span></div>
          <div class="edu"><b class="num">${c.nv}</b><span>${mot(c.nv, "espace numérique", "espaces numériques")} de l'Université numérique Cheikh Hamidou Kane (ex-Université virtuelle du Sénégal)</span></div>` : `<p>Aucun campus d'université publique ni espace numérique recensé dans cette commune.</p>`}
          <p class="note">Présenté à part du secondaire. L'étiquette « publique » est celle de la source, que nous n'avons pas pu vérifier campus par campus ; les lignes d'une même commune à moins de 1,5 km forment un seul campus, et les chantiers ne sont pas comptés. Détail dans Méthode et données.</p>
        </section>
        <p class="groupe">Pour situer cette commune : voisinage, région, département</p>
        ${phraseBassin ? `<section class="carte-bloc"><h2>Avec les communes voisines</h2><p>${phraseBassin} Valeurs arrondies à l'unité.</p></section>` : ""}
        <section class="carte-bloc">
          <h2>Comparaison avec la région et le pays</h2>
          <h3>Postes de santé pour 10 000 habitants</h3>
          ${barres(lignesDensite, maxD, "Le trait vertical marque la norme : 1 poste pour 10 000 habitants.", 1)}
          <h3>Postes manquants pour 100 000 habitants</h3>
          ${barres(lignesDef, maxT, "Plus la barre est longue, plus le manque est important.")}
        </section>
        <section class="carte-bloc">
          <h2>Centres de santé et hôpitaux du département de ${c.d}</h2>
          <p class="note"><b>Ces chiffres concernent tout le département de ${c.d}, pas la commune de ${c.n} seule.</b> Ces structures desservent plusieurs communes : elles sont donc comptées à l'échelle du département.</p>
          <dl class="tableau-mini">
            <div><dt>Centres de santé</dt><dd class="num">${c.nc} / ${c.bc}</dd><dd class="etat" style="--c:${c.dcd > 0 ? "var(--m-fort)" : "var(--m-faible)"}">${c.dcd > 0 ? `${c.dcd} ${mot(c.dcd, "manquant", "manquants")}` : "norme atteinte"}</dd></div>
            <div><dt>Hôpitaux</dt><dd class="num">${c.nh} / ${c.bh}</dd><dd class="etat" style="--c:${c.dhd > 0 ? "var(--m-fort)" : "var(--m-faible)"}">${c.dhd > 0 ? `${c.dhd} ${mot(c.dhd, "manquant", "manquants")}` : "norme atteinte"}</dd></div>
          </dl>
          <p class="note">Existants / requis. ${hopital.join(" ")}</p>
        </section>
      </div>

      <aside class="fiche-col">
        <section class="carte-bloc">
          <h2>Situation</h2>
          <svg class="minicarte" viewBox="0 15 420 290" role="img" aria-label="Région de ${nomRegion(c)} sur la carte du Sénégal">${carte}</svg>
          <p class="note">Région de ${nomRegion(c)} : ${fmt(reg ? reg.pop : regAgg.p)} habitants, ${reg ? reg.deficitPoste : regAgg.dp} postes de santé manquants.</p>
        </section>

        ${voisines.length ? `<section class="carte-bloc">
          <h2>Autres communes du département</h2>
          <ul class="voisines">${voisines.map(v => `<li><a href="${lienFiche(v)}">${v.n}</a><span class="num" style="--c:${niveauSante(v).couleur}">${v.dp}</span></li>`).join("")}</ul>
          <p class="note">Postes de santé manquants en 2023.</p>
        </section>` : ""}

        <section class="carte-bloc">
          <h2>Méthode</h2>
          <p class="note">Normes : 1 poste de santé pour 10 000 habitants (échelle commune), 1 centre pour 50 000 et 1 hôpital pour 150 000 habitants (échelle département). Calcul à partir du RGPH-5 (ANSD) et des infrastructures géolocalisées Géo Sénégal.</p>
        </section>
      </aside>
    </div>
      ${decision}`;

      document.getElementById("imprimerFiche").addEventListener("click", () => window.print());
  const exporter = type => {   // PDF ou Word, fabriqué dans le navigateur à partir de la fiche de décision
    const blocs = blocsFiche(document.getElementById("ficheDecision")), titre = `Fiche de décision - ${c.n}`, nom = nomFichierFiche(c);
    if (type === "pdf") telechargerFiche(fichePdfOctets(blocs, titre), nom + ".pdf", "application/pdf");
    else telechargerFiche(ficheDocxOctets(blocs, titre), nom + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    document.getElementById("ficheAide").textContent = `Fichier ${type === "pdf" ? "PDF" : "Word"} de la fiche de ${c.n} préparé : regardez dans vos téléchargements. Si rien n'apparaît, ouvrez le site directement dans votre navigateur.`;
  };
  document.getElementById("pdfFiche").addEventListener("click", () => exporter("pdf"));
  const volet = document.querySelector(".fiche-plus"); if (volet && window.matchMedia) volet.open = matchMedia("(min-width: 700px)").matches;   // ouvert sur ordinateur, replié sur téléphone
  document.getElementById("wordFiche").addEventListener("click", () => exporter("word"));
  const boutonEcoute = document.getElementById("ecouterFiche");
  if (boutonEcoute && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {   // lecture en français ; le bouton n'apparaît que si l'appareil sait lire à voix haute
    boutonEcoute.hidden = false;
    boutonEcoute.addEventListener("click", () => {
      const etat = document.getElementById("ecouterEtat");
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); boutonEcoute.textContent = "Écouter la fiche"; etat.textContent = "Lecture arrêtée."; return; }
      const u = new SpeechSynthesisUtterance(texteLectureFiche(c)); u.lang = "fr-FR"; u.rate = 0.9;
      u.onend = u.onerror = () => { boutonEcoute.textContent = "Écouter la fiche"; };
      boutonEcoute.textContent = "Arrêter la lecture"; etat.textContent = "Lecture en cours, en français."; speechSynthesis.speak(u);
    });
  }
  if (typeof appliquerLangue === "function" && langueWolof()) appliquerLangue("wo");   // la fiche vient d'être redessinée : on réapplique le wolof choisi
  document.getElementById("copierLien").addEventListener("click", async e => {
    const bouton = e.currentTarget;
    const relatif = `communes.html?${parametresCommune(c)}`, complet = lienComplet(relatif);   // toujours en français, même si la page est vue en wolof
    try { await navigator.clipboard.writeText(complet || relatif); bouton.textContent = complet ? "Lien copié" : "Adresse copiée (le lien complet existera une fois le site publié)"; } catch (e) { bouton.textContent = "Copiez l'adresse de la page"; }
    setTimeout(() => { bouton.textContent = "Copier le lien"; }, complet ? 2500 : 5000);
  });
  window.scrollTo(0, 0);
}

// =====================================================================
// Liste des communes
// =====================================================================
const fRecherche = document.getElementById("fRecherche");
const fRegion = document.getElementById("fRegion");
const fDepartement = document.getElementById("fDepartement");
const fNiveau = document.getElementById("fNiveau");
let tri = { cle: "dp", sens: -1 };

Object.keys(parRegion).sort((a, b) => (NOMS_REGIONS[a] || a).localeCompare(NOMS_REGIONS[b] || b, "fr"))
  .forEach(k => fRegion.insertAdjacentHTML("beforeend", `<option value="${k}">${NOMS_REGIONS[k] || k}</option>`));

function remplirDepartements() {
  const garde = fDepartement.value;
  const source = fRegion.value ? parRegion[fRegion.value] : communes;
  const deps = [...new Set(source.map(c => c.d))].sort((a, b) => a.localeCompare(b, "fr"));
  fDepartement.innerHTML = `<option value="">Tous</option>` + deps.map(d => `<option>${d}</option>`).join("");
  if (deps.includes(garde)) fDepartement.value = garde;
}

function correspond(c) {
  const q = normaliser(fRecherche.value);
  if (q && !normaliser(c.n).includes(q) && normaliser(libelle(c)) !== q) return false;
  if (fRegion.value && cleRegion(c.r) !== fRegion.value) return false;
  if (fDepartement.value && c.d !== fDepartement.value) return false;
  const n = fNiveau.value;
  if (n === "aucun") return c.dp === 0;
  if (n === "faible") return c.dp > 0 && c.dp <= 5;
  if (n) return niveauSante(c).cle === n;
  return true;
}

function comparer(a, b) {
  const x = a[tri.cle], y = b[tri.cle];
  if (typeof x === "string") return x.localeCompare(y, "fr") * tri.sens;
  if (x === null || x === undefined) return 1;
  if (y === null || y === undefined) return -1;
  return (x - y) * tri.sens || b.dp - a.dp;
}

const LIMITE_PAGE = 25; let limite = LIMITE_PAGE, signatureListe = "";
function afficherListe() {
  const liste = communes.filter(correspond).sort(comparer);
  const signature = [fRegion.value, fDepartement.value, fNiveau.value, fRecherche.value, tri.cle, tri.sens].join("|");
  if (signature !== signatureListe) { limite = LIMITE_PAGE; signatureListe = signature; }   // un filtre ou un tri change : on repart des 25 premières
  const etroit = !!window.matchMedia && matchMedia("(max-width: 640px)").matches, visibles = etroit ? liste.slice(0, limite) : liste;
  const agg = agreger(liste);
  document.getElementById("resume").innerHTML =
    `<b class="num">${fmt(liste.length)}</b> ${mot(liste.length, "commune", "communes")}, <b class="num">${fmt(agg.p)}</b> habitants, <b class="num">${fmt(agg.dp)}</b> ${mot(agg.dp, "poste de santé manquant", "postes de santé manquants")}`;
  document.getElementById("vide").hidden = liste.length > 0;
  document.getElementById("lignes").innerHTML = visibles.map(c => {
    const niv = niveauSante(c);
    return `<tr>
      <th scope="row"><a href="${lienFiche(c)}">${c.n}</a><small class="dep-mob">${c.d}</small>${c.fb !== 1 ? ' <span class="a-confirmer" title="Donnée à confirmer">à confirmer</span>' : ""}</th>
      <td>${c.d}</td><td>${nomRegion(c)}</td>
      <td class="nb num">${fmt(c.p)}</td>
      <td class="nb num">${c.np} / ${c.bp}</td>
      <td class="nb num"><span class="niv" style="--c:${niv.couleur}">${c.dp}</span></td>
      <td class="nb num">${val(c.dp33)}</td>
      <td class="nb num">${c.dpb === null || c.dpb === undefined ? "non disponible" : fmt(c.dpb)}</td>
      <td class="nb num">${c.ne}</td>
    </tr>`;
  }).join("");
  let pag = document.getElementById("pagination");   // sur téléphone : 25 communes à la fois, pas les 553
  if (!pag) { pag = document.createElement("div"); pag.id = "pagination"; pag.className = "pagination"; pag.innerHTML = '<p id="paginationTexte" role="status"></p><button type="button" class="btn-ghost" id="plusCommunes"></button>'; document.getElementById("tableau").parentNode.insertAdjacentElement("afterend", pag); document.getElementById("plusCommunes").addEventListener("click", () => { limite += LIMITE_PAGE; afficherListe(); }); }
  pag.hidden = !(etroit && liste.length > visibles.length);
  document.getElementById("paginationTexte").textContent = `${visibles.length} communes affichées sur ${liste.length}.`;
  document.getElementById("plusCommunes").textContent = `Afficher ${Math.min(LIMITE_PAGE, liste.length - visibles.length)} de plus`;
  document.querySelectorAll("th button[data-tri]").forEach(b => {
    const actif = b.dataset.tri === tri.cle;
    b.closest("th").setAttribute("aria-sort", actif ? (tri.sens > 0 ? "ascending" : "descending") : "none");
  });

  // l'adresse reflète les filtres, pour pouvoir partager une sélection
  const q = new URLSearchParams();
  if (fRegion.value) q.set("region", fRegion.value);
  if (fDepartement.value) q.set("departement", fDepartement.value);
  if (fNiveau.value) q.set("niveau", fNiveau.value);
  if (fRecherche.value.trim()) q.set("q", fRecherche.value.trim());
  try { history.replaceState(null, "", q.toString() ? `communes.html?${q}` : "communes.html"); } catch (e) { /* fichier local : le navigateur refuse, sans importance */ }
  document.getElementById("titreListe").textContent = fRegion.value ? `Communes de la région de ${NOMS_REGIONS[fRegion.value] || fRegion.value}` : "Toutes les communes";
}

document.querySelectorAll("th button[data-tri]").forEach(b => b.addEventListener("click", () => {
  const cle = b.dataset.tri;
  tri = tri.cle === cle ? { cle, sens: -tri.sens } : { cle, sens: ["n", "d", "r"].includes(cle) ? 1 : -1 };
  afficherListe();
}));
fRegion.addEventListener("change", () => { remplirDepartements(); afficherListe(); });
[fDepartement, fNiveau].forEach(el => el.addEventListener("change", afficherListe));
fRecherche.addEventListener("input", afficherListe);
document.getElementById("filtres").addEventListener("submit", e => {
  e.preventDefault();
  const c = trouverCommune(fRecherche.value);
  if (c) location.href = lienFiche(c);
});
document.getElementById("fReset").addEventListener("click", () => setTimeout(() => { remplirDepartements(); afficherListe(); }));

// =====================================================================
// Démarrage : fiche si ?commune=..., sinon liste (filtres repris de l'adresse)
// =====================================================================
initialiserNavigation();
const communeDemandee = params.get("commune") && trouverCommune(params.get("commune"), params.get("departement"));
if (communeDemandee) {
  afficherFiche(communeDemandee);
} else {
  const r = (params.get("region") || "").toUpperCase();
  if (parRegion[r]) fRegion.value = r;
  remplirDepartements();
  if (params.get("departement")) fDepartement.value = params.get("departement");
  if (params.get("niveau")) fNiveau.value = params.get("niveau");
  if (params.get("q")) fRecherche.value = params.get("q");
  if (params.get("commune")) fRecherche.value = params.get("commune");
  afficherListe();
}
