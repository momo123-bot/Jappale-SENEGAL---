// Banc d'essai de l'assistant avec IA locale (Ollama). Facultatif : il faut Ollama lancé et le modèle installé.
//   node tests/ia/evaluer_assistant_ia.js            (modèle par défaut : phi4-mini)
//   node tests/ia/evaluer_assistant_ia.js qwen2.5:3b  (autre modèle)
// Pour chaque question, il affiche la réponse finale, sa source (IA vérifiée, ou réponse calculée si le garde-fou
// ou le délai a écarté celle de l'IA) et les temps de réponse.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const DOCS = path.join(__dirname, '..', '..', 'docs') + path.sep;
const modele = process.argv[2] || 'phi4-mini';

// faux document minimal : la page crée une bulle, un texte qui s'écrit au fil de l'eau, un bouton et une mention de source
let premierMot = null, debut = 0, texteIA = '';
const element = (tag) => {
  let t = '';
  return { tag, enfants: [], classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {},
    appendChild(e) { this.enfants.push(e); }, get textContent() { return t; },
    set textContent(v) {
      if (tag === 'span' && !/lit les données/.test(v)) { if (premierMot === null) premierMot = Date.now() - debut; texteIA = v; }
      t = v; if (tag === 'div') this.enfants = [];
    } };
};
const ctx = vm.createContext({ fetch, AbortController, TextDecoder, setTimeout, clearTimeout, console, window: { JAPPALE_IA: { modele } }, document: { createElement: element } });
for (const f of ['data.js', 'assistant.js', 'assistant-llm.js']) vm.runInContext(fs.readFileSync(DOCS + f, 'utf8'), ctx);
const ia = vm.runInContext(`(() => {
  const LIBELLES = { DAKAR: "Dakar", THIES: "Thiès", DIOURBEL: "Diourbel", FATICK: "Fatick", KAOLACK: "Kaolack", KAFFRINE: "Kaffrine", KEDOUGOU: "Kédougou", KOLDA: "Kolda", LOUGA: "Louga", MATAM: "Matam", SAINT_LOUIS: "Saint-Louis", SEDHIOU: "Sédhiou", TAMBACOUNDA: "Tambacounda", ZIGUINCHOR: "Ziguinchor" };
  const regionPoints = {}; Object.keys(REGION_STATS).forEach(k => { regionPoints[k] = Object.assign({ label: LIBELLES[k] || k }, REGION_STATS[k]); });
  const regionRate = (r, m, v) => m === "education" ? (r.nbEduc > 0 ? (r.pop / r.nbEduc) / 1000 : 999) : (r.pop > 0 ? ((v === "bassin" ? r.deficitBassin : r.deficitPoste) / r.pop) * 100000 : 0);
  const k = {}; COMMUNES_DATA.forEach(x => { k[x.n] = (k[x.n] || 0) + 1; });
  const nomUnique = c => k[c.n] > 1 ? c.n + ' (' + c.d + ')' : c.n, mot = (n, s, p) => Math.abs(n) > 1 ? p : s;
  const moteur = creerMoteurAssistant({ communes: COMMUNES_DATA, regionPoints, regionRate, mot, nomUnique });
  return creerAssistantLLM({ moteur, communes: COMMUNES_DATA, regionPoints, regionRate, mot, nomUnique });
})()`, ctx);

const QUESTIONS = process.env.QUESTIONS ? process.env.QUESTIONS.split('|') : [
  'Déficit de Touba', 'Et les hôpitaux ?', 'Quelle région est la plus touchée ?', 'Compare Kanel et Saraya',
  'Je suis maire de Kanel, que dois-je retenir pour ma commune ?', 'Combien coûte un poste de santé ?',
  "C'est quoi la vue bassin ?", 'Combien de lycées à Ziguinchor ?', 'Quelle est la capitale du Japon ?',
  'Combien de médecins y a-t-il à Matam ?',
];

(async () => {
  debut = Date.now();
  const pret = await ia.verifierConnexion();
  if (!pret) { console.log('Ollama ou le modèle', modele, 'est indisponible :', ia.etat); process.exit(1); }
  let ecartees = 0, total = 0;
  for (const q of QUESTIONS) {
    debut = Date.now(); premierMot = null; texteIA = ''; let bulle = null;
    await ia.poser(q, (texte) => { bulle = element('div'); bulle.textContent = texte; return bulle; });
    const small = bulle.enfants.find(e => e.tag === 'small'); const source = small ? small.textContent : '(moteur à règles)';
    total++; if (!/chiffres et lieux contrôlés/.test(source)) ecartees++;
    console.log(`\n### ${q}\n${bulle.textContent}\n  [${source}] premier mot ${premierMot} ms, total ${Date.now() - debut} ms`);
    if (texteIA && texteIA !== bulle.textContent) console.log(`  (texte de l'IA écarté : ${texteIA.replace(/\n/g, ' ')})`);
  }
  console.log(`\n${total} questions, ${total - ecartees} réponses rédigées par l'IA, ${ecartees} remplacées par la réponse calculée.`);
})();
