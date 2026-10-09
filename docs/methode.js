// Page Méthode et données : les chiffres présents dans data.js sont recalculés ici, les autres
// (taux de rapprochement, recoupements, algorithme) viennent de la note méthodologique.
const sans = communes.filter(c => c.fb !== 1);
const valeurs = {
  communes: fmt(communes.length),
  population: fmt(communes.reduce((s, c) => s + c.p, 0)),
  coordonnees: fmt(communes.length - sans.length),
  croissance: fmt(communes.filter(c => c.tm === 1).length),
  ...(() => { const t = communes.find(c => c.n === "Touba Mosquee"); return t ? { toubaCommune: fmt(t.dp), toubaBassin: fmt(Math.round(t.dpb)) } : {}; })(),
  sansCoordonnees: sans.length ? `${sans.length} : ${sans.map(c => `${c.n} (${c.d})`).join(", ")}` : "aucune",
};
document.querySelectorAll("[data-k]").forEach(el => { el.textContent = (valeurs[el.dataset.k] != null ? valeurs[el.dataset.k] : el.textContent); });

// ---------- export CSV (mêmes colonnes que l'export de la carte, voir exporterDonneesCSV dans script.js) ----------
const nombreFR = x => (x === null || x === undefined) ? "" : String(x).replace(".", ",");
const vide = x => (x === null || x === undefined) ? "" : x;
const echapper = v => { const t = String(v); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

document.getElementById("telecharger").addEventListener("click", () => {
  const entetes = ["region", "departement", "commune", "population", "postes_existants", "postes_requis", "deficit_postes_commune", "deficit_postes_vue_bassin", "centres_manquants_departement", "hopitaux_manquants_departement", "centres_ou_hopitaux_commune", "etablissements_secondaires", "campus_universites_publiques", "espaces_numeriques_unchk", "deficit_postes_2033_indicatif", "score_combine_sante_education", "donnees_confirmees", "croissance_mesuree", "hopital_le_plus_proche", "distance_hopital_km", "latitude", "longitude", "sources", "norme_postes"];
  const lignes = communes.map(c => [c.r, c.d, c.n, c.p, c.np, c.bp, c.dp, nombreFR(c.dpb), c.dcd, c.dhd, c.ns, c.ne, c.nu, c.nv, vide(c.dp33), nombreFR(c.sc), c.fb ? "oui" : "non", c.tm ? "oui" : "non", vide(c.hp), vide(c.hk), nombreFR(c.lat), nombreFR(c.lon), "RGPH-5 2023 (ANSD) et Géo Sénégal 2023", "1 poste pour 10 000 habitants"]);
  const contenu = "﻿" + [entetes.join(";"), ...lignes.map(l => l.map(echapper).join(";"))].join("\r\n");
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "jappale_senegal_communes.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.getElementById("telechargerMsg").textContent = "Fichier jappale_senegal_communes.csv téléchargé.";
});

// ---------- lecture guidée : un lien qui vise un détail le déplie ; un bouton déplie tout ----------
function ouvrirCible() {
  const id = decodeURIComponent(location.hash.slice(1));
  const cible = id && document.getElementById(id);
  if (!cible) return;
  const bloc = cible.closest("details");
  if (bloc) bloc.open = true;
  cible.scrollIntoView();
}
window.addEventListener("hashchange", ouvrirCible);
ouvrirCible();

const toutDeplier = document.getElementById("toutDeplier"), statutDetails = document.getElementById("detailsStatut");
const sections = () => [...document.querySelectorAll("details.detail, details.dictionnaire")];
// l'état du bouton suit ce qui est réellement ouvert, même si la personne ouvre ou ferme une section à la main
function majBouton() {
  const toutes = sections(), ouvertes = toutes.filter(d => d.open).length, tout = ouvertes === toutes.length;
  toutDeplier.setAttribute("aria-pressed", tout ? "true" : "false");
  toutDeplier.textContent = tout ? "Masquer les détails" : "Afficher tous les détails";
  if (statutDetails) statutDetails.textContent = tout ? `Les ${toutes.length} sections sont ouvertes.` : ouvertes ? `${ouvertes} section${ouvertes > 1 ? "s" : ""} ouverte${ouvertes > 1 ? "s" : ""} sur ${toutes.length}.` : `${toutes.length} sections à ouvrir.`;
}
toutDeplier.addEventListener("click", () => {
  const ouvrir = !sections().every(d => d.open);
  sections().forEach(d => { d.open = ouvrir; });
  majBouton();
  const cible = ouvrir ? sections()[0] : toutDeplier;   // on montre où ça s'est passé
  if (cible && cible.scrollIntoView) cible.scrollIntoView({ behavior: "smooth", block: ouvrir ? "start" : "center" });
});
sections().forEach(d => d.addEventListener("toggle", majBouton));
majBouton();

initialiserNavigation();
