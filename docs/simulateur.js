// Page « Simuler un budget » : choisir où, combien de structures, puis lire le classement et la carte.
// Le calcul est celui de l'explorateur (simulation.js) : un seul moteur, deux écrans.
// `communes`, `lienFiche` et le menu viennent de site.js (déjà chargé) : on ne les redéclare pas.
const moteur = creerMoteurSimulation({ communes });
const doubles = (() => { const k = {}; communes.forEach(x => { k[x.n] = (k[x.n] || 0) + 1; }); return new Set(Object.keys(k).filter(n => k[n] > 1)); })();
const nomUnique = c => doubles.has(c.n) ? `${c.n} (${c.d})` : c.n;
const fmtMilliers = x => (Math.round(x / 1000) * 1000).toLocaleString("fr-FR");
const projeter = c => [20 + (c.lon + 17.536) * 61.7, 20 + (16.691 - c.lat) * 61.7];   // même projection que la carte de l'explorateur
const $ = id => document.getElementById(id);
const VUE_PAYS = [0, 10, 420, 295];
let perimetre = null, annee = "2023", dernier = null;


function dessinerCarte(res, pool) {
  const svg = $("simCarte"), NS = "http://www.w3.org/2000/svg";
  const el = (nom, attrs = {}, texte) => { const e = document.createElementNS(NS, nom); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (texte !== undefined) e.textContent = texte; return e; };
  svg.innerHTML = "";
  // on cadre la carte sur le périmètre choisi (tout le pays, une région ou un département)
  let vue = VUE_PAYS.slice();
  if (perimetre) {
    const pts = pool.filter(c => c.lat != null).map(projeter), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const l = Math.max(Math.max(...xs) - Math.min(...xs), 40), w = Math.min(420, l * 1.5), h = w * 295 / 420, cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    vue = [cx - w / 2, cy - h / 2, w, h];
  }
  svg.setAttribute("viewBox", vue.map(n => n.toFixed(1)).join(" "));
  // la taille des repères suit le cadrage : lisibles sur le pays entier, pas énormes quand la carte est recadrée sur un département
  const k = Math.sqrt(vue[2] / VUE_PAYS[2]);
  Object.values(regionShapes).forEach(s => svg.appendChild(el("path", { d: s.d, class: "sim-region" })));
  communes.filter(c => c.lat != null).forEach(c => { const [x, y] = projeter(c); svg.appendChild(el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: (1.3 * k).toFixed(2), class: "sim-point" })); });
  res.map((r, i) => ({ r, i })).reverse().forEach(({ r, i }) => {   // le rang 1 est dessiné en dernier : il reste au-dessus des autres
    const [x, y] = projeter(r.c), g = el("g", { class: "sim-choix" });
    g.appendChild(el("title", {}, `${i + 1}. ${nomUnique(r.c)}`));
    g.appendChild(el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: (6.4 * k).toFixed(2) }));
    g.appendChild(el("text", { x: x.toFixed(1), y: (y + 2.9 * k).toFixed(2), "text-anchor": "middle", "font-size": (8.2 * k).toFixed(2) }, String(i + 1)));
    svg.appendChild(g);
  });
}

function calculer() {
  const budget = Math.max(1, Math.min(25, parseInt($("simBudget").value) || 10));
  const pool = moteur.reserve(perimetre), cle = c => (annee === "2033" ? c.dp33 : c.dp);
  if (!pool.some(c => cle(c) > 0)) {
    $("simCompare").innerHTML = '<div class="sim-vide">Aucune commune en déficit de postes de santé sur ce périmètre : il n\'y a rien à prioriser.</div>';
    $("simResults").innerHTML = ""; dernier = null; dessinerCarte([], pool); $("simExport").disabled = true; return;
  }
  const res = moteur.selectionGloutonne(budget, annee, perimetre), simple = moteur.selectionSimple(budget, annee, perimetre);
  dernier = { budget, annee, res };
  const cJ = moteur.couvertureReelle(res.map(r => r.c), annee), cS = moteur.couvertureReelle(simple, annee);
  const pct = cS > 0 ? (cJ - cS) / cS * 100 : 0;
  const rang = res.findIndex(r => r.cumul >= cS) + 1;
  const equivalent = (rang > 0 && rang < budget)
    ? `<div class="sim-equiv"><b>À population desservie égale : ${rang} structures au lieu de ${budget}.</b> Jàppale atteint au moins la couverture du classement simple avec ${Math.round((1 - rang / budget) * 100)} % de structures en moins (coût supposé identique pour chaque structure).</div>` : "";
  const choisies = new Set(res.map(r => r.c)), simples = new Set(simple);
  const retenues = res.map(r => r.c).filter(c => !simples.has(c)).map(nomUnique), ecartees = simple.filter(c => !choisies.has(c)).map(nomUnique);
  const explication = retenues.length ? `<p class="sim-legende">Jàppale écarte ${ecartees.join(", ")} (trop proche${ecartees.length > 1 ? "s" : ""} d'autres choix déjà faits, donc redondante${ecartees.length > 1 ? "s" : ""}) et retient ${retenues.join(", ")}.</p>` : "";
  $("simCompare").innerHTML = `<h2>Jàppale contre un classement simple par déficit${perimetre ? ` (${perimetre.valeur})` : " (tout le pays)"}</h2>
    <div class="cartes-chiffres">
      <div class="carte-chiffre"><span>Classement simple</span><b>${fmtMilliers(cS)}</b> <small>habitants desservis, environ</small></div>
      <div class="carte-chiffre carte-chiffre-fort"><span>Jàppale</span><b>${fmtMilliers(cJ)}</b> <small>habitants desservis, environ</small></div>
      <div class="carte-chiffre carte-chiffre-gain"><span>Écart</span><b>${pct >= 0.05 ? "+" + pct.toFixed(1).replace(".", ",") + " %" : "Aucun écart"}</b> <small>${pct >= 0.05 ? "de population desservie en plus" : "à ce budget"}</small></div>
    </div>${equivalent}${explication}`;
  const gainMax = Math.max(...res.map(r => r.gain), 1);
  $("simResults").innerHTML = res.map((r, i) => `<li><span class="rang">${i + 1}</span>
      <span class="sim-nom"><a href="${lienFiche(r.c)}#agir">${nomUnique(r.c)}</a><small>${r.c.d}, ${r.c.r} : ${cle(r.c)} ${cle(r.c) > 1 ? "postes manquants" : "poste manquant"}</small></span>
      <span class="sim-gain"><b>+${fmtMilliers(r.gain)}</b><small>cumul ${fmtMilliers(r.cumul)}</small></span>
      <i class="sim-barre" style="width:${Math.max(4, r.gain / gainMax * 100).toFixed(0)}%"></i></li>`).join("");
  $("simExport").disabled = false;
  dessinerCarte(res, pool);
}

function exporter() {
  if (!dernier) return;
  const { budget, annee: an, res } = dernier;
  const entetes = ["rang", "commune", "departement", "region", "postes_manquants", "population_desservie_en_plus", "cumul", "budget", "annee", "perimetre"];
  const lignes = res.map((r, i) => [i + 1, r.c.n, r.c.d, r.c.r, an === "2033" ? r.c.dp33 : r.c.dp, Math.round(r.gain), Math.round(r.cumul), budget, an, perimetre ? perimetre.valeur : "Sénégal"]);
  const esc = v => { const t = String(v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const contenu = "\ufeff" + [entetes.join(";")].concat(lignes.map(l => l.map(esc).join(";"))).join("\r\n");
  const nom = `jappale_classement_${budget}_structures_${an}.csv`;
  let apercu = false; try { apercu = window.self !== window.top; } catch (e) { apercu = true; }
  if (apercu || !(window.URL && URL.createObjectURL)) {   // dans un aperçu intégré, le téléchargement est bloqué : on propose le contenu à copier
    let zone = $("simCsv"); if (!zone) { zone = document.createElement("div"); zone.id = "simCsv"; zone.className = "sim-csv"; $("simExport").parentNode.appendChild(zone); }
    zone.innerHTML = `<p class="sim-legende">Le téléchargement direct est bloqué dans un aperçu intégré. Copiez ce contenu dans un fichier ${nom}.</p><textarea readonly></textarea>`;
    zone.querySelector("textarea").value = contenu.replace("\ufeff", "");
    return;
  }
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- formulaire ----
const regions = [...new Set(communes.map(c => c.r))].sort((a, b) => a.localeCompare(b, "fr"));
const selR = $("simRegion"), selD = $("simDept");
selR.innerHTML = '<option value="">Tout le pays</option>' + regions.map(r => `<option value="${r}">${r}</option>`).join("");
selD.innerHTML = '<option value="">Tous les départements</option>'; selD.disabled = true;
selR.addEventListener("change", () => {
  const r = selR.value, deps = r ? [...new Set(communes.filter(c => c.r === r).map(c => c.d))].sort((a, b) => a.localeCompare(b, "fr")) : [];
  selD.innerHTML = '<option value="">Tous les départements</option>' + deps.map(d => `<option value="${d}">${d}</option>`).join("");
  selD.disabled = !r; perimetre = r ? { cle: "r", valeur: r } : null; calculer();
});
selD.addEventListener("change", () => { perimetre = selD.value ? { cle: "d", valeur: selD.value, region: selR.value } : (selR.value ? { cle: "r", valeur: selR.value } : null); calculer(); });
$("simBudget").addEventListener("input", calculer);
$("simForm").addEventListener("submit", e => { e.preventDefault(); calculer(); });
[["simY23", "2023"], ["simY33", "2033"]].forEach(([id, a]) => $(id).addEventListener("click", () => { annee = a; $("simY23").setAttribute("aria-pressed", a === "2023"); $("simY33").setAttribute("aria-pressed", a === "2033"); calculer(); }));
$("simExport").addEventListener("click", exporter);
calculer();
initialiserNavigation();
