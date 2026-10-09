// L'assistant de Jàppale sur chaque page : le bouton « Poser une question » ouvre un panneau sans quitter la page.
// Le moteur (assistant.js) répond uniquement à partir des données de la plateforme, sans rien inventer.
// Si Ollama tourne sur l'ordinateur, assistant-llm.js fait rédiger la réponse par un vrai modèle de langage, à partir des mêmes données.
(function () {
  if (typeof creerMoteurAssistant !== "function" || typeof COMMUNES_DATA === "undefined" || typeof REGION_STATS === "undefined") return;
  const communes = COMMUNES_DATA;
  const LIBELLES = { DAKAR: "Dakar", THIES: "Thiès", DIOURBEL: "Diourbel", FATICK: "Fatick", KAOLACK: "Kaolack", KAFFRINE: "Kaffrine", KEDOUGOU: "Kédougou", KOLDA: "Kolda", LOUGA: "Louga", MATAM: "Matam", SAINT_LOUIS: "Saint-Louis", SEDHIOU: "Sédhiou", TAMBACOUNDA: "Tambacounda", ZIGUINCHOR: "Ziguinchor" };
  const regionPoints = {};
  Object.keys(REGION_STATS).forEach(k => { regionPoints[k] = Object.assign({ label: LIBELLES[k] || k }, REGION_STATS[k]); });
  const regionRate = (r, m, v) => {
    if (m === "education") return r.nbEduc > 0 ? (r.pop / r.nbEduc) / 1000 : 999;
    const deficit = v === "bassin" ? r.deficitBassin : r.deficitPoste;
    return r.pop > 0 ? (deficit / r.pop) * 100000 : 0;
  };
  const doubles = (() => { const k = {}; communes.forEach(x => { k[x.n] = (k[x.n] || 0) + 1; }); return new Set(Object.keys(k).filter(n => k[n] > 1)); })();
  const nomUnique = c => doubles.has(c.n) ? `${c.n} (${c.d})` : c.n;
  const motLocal = (n, s, p) => (Math.abs(n) > 1 ? p : s);
  const moteur = creerMoteurAssistant({ communes, regionPoints, regionRate, mot: motLocal, nomUnique });
  const ia = typeof creerAssistantLLM === "function" ? creerAssistantLLM({ moteur, communes, regionPoints, regionRate, mot: motLocal, nomUnique }) : null;

  let bouton = document.querySelector(".assist");
  if (!bouton) { bouton = document.createElement("button"); bouton.type = "button"; bouton.className = "assist"; bouton.textContent = "Poser une question"; (() => { const zone = document.createElement("aside"); zone.setAttribute("aria-label", "Assistant"); zone.appendChild(bouton); document.body.appendChild(zone); })(); }
  bouton.setAttribute("aria-haspopup", "dialog"); bouton.setAttribute("aria-expanded", "false"); bouton.setAttribute("aria-controls", "assistPanneau");

  const SUGGESTIONS = ["Quelle région est la plus touchée ?", "Les 5 communes les plus en déficit", "Déficit de Saraya", "Où sont les hôpitaux manquants ?", "Où construire en priorité avec 5 structures ?", "Quelle commune a le plus d'écoles ?", "Population de Podor", "C'est quoi la vue bassin ?"];
  const panneau = document.createElement("section");
  panneau.className = "assist-panneau"; panneau.id = "assistPanneau"; panneau.hidden = true; panneau.setAttribute("role", "complementary"); panneau.setAttribute("aria-label", "Assistant Jàppale");
  panneau.setAttribute("role", "dialog"); panneau.setAttribute("aria-label", "Assistant Jàppale");
  panneau.innerHTML = `<header><div><b>Assistant Jàppale</b><small>Je réponds à partir des données de la plateforme, sans rien inventer. Si je ne sais pas, je le dis.</small><small class="assist-etat" hidden></small></div><button type="button" class="assist-fermer" aria-label="Fermer l'assistant">×</button></header>
    <div class="assist-suggestions">${SUGGESTIONS.map(q => `<button type="button" data-q="${q.replace(/"/g, "&quot;")}">${q}</button>`).join("")}</div>
    <div class="assist-log" role="log" aria-live="polite"></div>
    <form class="assist-saisie"><input type="text" name="question" placeholder="Votre question…" aria-label="Votre question" autocomplete="off"><button class="btn" type="submit">Envoyer</button></form>`;
  document.body.appendChild(panneau);
  const journal = panneau.querySelector(".assist-log"), champ = panneau.querySelector("input");
  const ajouter = (texte, classe) => { const d = document.createElement("div"); d.className = "assist-msg " + classe; d.textContent = texte; journal.appendChild(d); journal.scrollTop = journal.scrollHeight; return d; };
  const poser = q => {
    q = String(q || "").trim(); if (!q) return; ajouter(q, "moi"); champ.value = "";
    if (ia) ia.poser(q, ajouter); else setTimeout(() => ajouter(moteur.repondreAssistant(q), "bot"), 120);
  };
  const etatIA = panneau.querySelector(".assist-etat");
  if (ia) ia.surEtat((etat, raison) => { etatIA.hidden = !raison; etatIA.textContent = raison; etatIA.dataset.etat = etat; });
  const ouvrir = () => {
    panneau.hidden = false; document.body.classList.add("assist-ouvert"); bouton.setAttribute("aria-expanded", "true");
    if (!journal.children.length) ajouter("Bonjour. Posez-moi une question sur une commune, une région ou la méthode.", "bot");
    if (ia) ia.verifierConnexion();   // détecte Ollama et précharge le modèle pendant que la personne tape
    champ.focus();
  };
  const fermer = () => { panneau.hidden = true; document.body.classList.remove("assist-ouvert"); bouton.setAttribute("aria-expanded", "false"); bouton.focus(); };
  bouton.addEventListener("click", e => { e.preventDefault(); panneau.hidden ? ouvrir() : fermer(); });
  panneau.querySelector(".assist-fermer").addEventListener("click", fermer);
  panneau.querySelector("form").addEventListener("submit", e => { e.preventDefault(); poser(champ.value); });
  panneau.querySelectorAll(".assist-suggestions button").forEach(b => b.addEventListener("click", () => poser(b.dataset.q)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panneau.hidden) fermer(); });
  document.querySelectorAll('a[href="explorer.html#assistant"]').forEach(l => { if (l !== bouton) l.addEventListener("click", e => { e.preventDefault(); ouvrir(); }); });
  if (location.hash === "#assistant") ouvrir();
  window.__assistant = { poser, ouvrir, fermer, moteur, ia };
})();
