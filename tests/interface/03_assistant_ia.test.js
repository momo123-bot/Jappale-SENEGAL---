// Contrôles de l'assistant avec IA locale (Ollama), sans vrai modèle : un faux serveur Ollama répond à la place.
// On vérifie que la page détecte l'IA, affiche une réponse rédigée seulement si ses chiffres sont dans les données,
// la remplace sinon par la réponse calculée, et revient au moteur à règles quand Ollama est absent.
const path = require('path'); const http = require('http'); const { pathToFileURL } = require('url');
const { JSDOM, VirtualConsole } = require('jsdom');
const DOCS = path.join(__dirname, '..', '..', 'docs') + path.sep;
let echecs = 0; const ok = (n, c, x = '') => { if (!c) echecs++; console.log((c ? 'OK   ' : 'ECHEC'), n, x); };
const T = e => e.textContent.replace(/\s+/g, ' ').trim();
const attendre = ms => new Promise(r => setTimeout(r, ms));
// attend qu'une condition soit vraie (au plus 20 s) : un délai fixe échoue quand la machine est chargée
const jusqua = async (cond, max = 20000) => { const t0 = Date.now(); while (!cond() && Date.now() - t0 < max) await attendre(50); };
const finie = b => !!b && !b.classList.contains('en-cours') && (!!b.querySelector('.assist-source') || !b.querySelector('button'));

// Le faux Ollama : /api/tags liste phi4-mini ; /api/chat renvoie, morceau par morceau, la réponse prévue pour la question.
const recus = []; let reponses = {};
const faux = http.createServer((req, res) => {
  let corps = ''; req.on('data', x => corps += x);
  req.on('end', () => {
    if (req.url === '/api/tags') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ models: [{ name: 'phi4-mini:latest' }] })); }
    if (req.url === '/api/chat') {
      const demande = JSON.parse(corps); recus.push(demande);
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      if (demande.options && demande.options.num_predict === 1) return res.end(JSON.stringify({ message: { content: '' }, done: true }) + '\n');   // préchargement
      const question = demande.messages[demande.messages.length - 1].content.split('QUESTION : ').pop();
      const texte = reponses[question] || "Je n'ai pas cette information dans les données de la plateforme.";
      const morceaux = texte.match(/.{1,12}/g);
      let i = 0; const envoyer = () => { if (i < morceaux.length) { res.write(JSON.stringify({ message: { content: morceaux[i++] }, done: false }) + '\n'); setTimeout(envoyer, 5); } else res.end(JSON.stringify({ message: { content: '' }, done: true }) + '\n'); };
      return envoyer();
    }
    res.writeHead(404); res.end();
  });
});

const charger = async (page, url) => {
  const erreurs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/Could not load (link|img)|fonts\.g/.test(e.message)) erreurs.push(e.message.slice(0, 160)); });
  const dom = await JSDOM.fromFile(DOCS + page, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) { win.fetch = (...a) => fetch(...a); win.AbortController = AbortController; win.TextDecoder = TextDecoder; win.JAPPALE_IA = { url }; } });
  if (dom.window.document.readyState !== 'complete') await Promise.race([new Promise(r => dom.window.addEventListener('load', r)), attendre(20000)]);
  await attendre(900); return { w: dom.window, d: dom.window.document, erreurs };
};

(async () => {
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${faux.address().port}`;
  reponses = {
    'Déficit de Saraya': "Saraya compte 0 poste de santé existant pour 1 requis : il en manque 1. L'hôpital le plus proche est à 53 km à vol d'oiseau.",
    'Déficit de Touba': 'Touba Mosquee a 75 postes de santé manquants sur 113 requis, et 42 lits fermés.',
    'Et les hôpitaux ?': 'Saraya compte 1 poste existant.',
    'Quelle région est la plus touchée ?': 'Diourbel est la région la plus touchée par le manque de postes de santé.',
  };

  // ---- panneau des pages (accueil) ----
  { const { w, d, erreurs } = await charger('index.html', url); const p = d.getElementById('assistPanneau');
    ok('IA : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    d.querySelector('.assist').click(); await jusqua(() => !p.querySelector('.assist-etat').hidden); await attendre(200);
    ok('IA : à l\'ouverture, la page détecte Ollama et l\'annonce dans l\'en-tête', /IA locale : phi4-mini/.test(T(p.querySelector('.assist-etat'))) && !p.querySelector('.assist-etat').hidden);
    ok('IA : le modèle est préchargé avec le message système (données générales comprises)', recus.some(r => r.options.num_predict === 1 && /DONNÉES GÉNÉRALES/.test(r.messages[0].content)));
    const poser = async (q) => { p.querySelector('input').value = q; p.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })); const n = p.querySelectorAll('.assist-msg.bot').length; const der = () => [...p.querySelectorAll('.assist-msg.bot')].pop(); await jusqua(() => p.querySelectorAll('.assist-msg.bot').length > n && finie(der())); return der(); };

    const b1 = await poser('Déficit de Saraya'); const envoi = recus[recus.length - 1];
    ok('IA : la question part avec la fiche de la commune et la réponse calculée', /COMMUNE Saraya/.test(envoi.messages.at(-1).content) && /Réponse calculée par la plateforme : Saraya \(Saraya\)/.test(envoi.messages.at(-1).content));
    ok('IA : le message système ne change pas d\'une question à l\'autre (Ollama le garde en mémoire)', envoi.messages[0].content === recus[0].messages[0].content);
    ok('IA : une réponse aux chiffres justes est affichée, avec sa source', /il en manque 1/.test(T(b1)) && /Rédigé par l'IA locale \(phi4-mini\)/.test(T(b1.querySelector('.assist-source'))) && !b1.classList.contains('en-cours'));
    ok('IA : sous la réponse, le calcul exact de la plateforme reste consultable', /1 poste de santé manquant sur 1 requis/.test(T(b1.querySelector('details.assist-calcul'))));

    const b2 = await poser('Déficit de Touba');
    ok('IA : un chiffre absent des données (42) fait écarter la réponse de l\'IA au profit de la réponse calculée', !/42 lits/.test(T(b2)) && /75 postes de santé manquants sur 113 requis \(38 existants\)/.test(T(b2)) && /absent des données ou mal rattaché \(42\)/.test(T(b2.querySelector('.assist-source'))));

    const b3 = await poser('Et les hôpitaux ?'); const suivi = recus[recus.length - 1];
    ok('IA : une question de suivi reprend le lieu précédent (Touba) et rappelle la question précédente, sans les réponses passées du modèle', /COMMUNE Touba Mosquee/.test(suivi.messages.at(-1).content) && /Question précédente de la même personne : Déficit de Touba/.test(suivi.messages.at(-1).content) && !suivi.messages.some(m => m.role === 'assistant'));
    ok('IA : un vrai chiffre mis au mauvais endroit (« 1 poste existant ») est aussi écarté', !/1 poste existant/.test(T(b3).split('Réponse calculée')[0]) && /absent des données/.test(T(b3.querySelector('.assist-source'))));

    const b4 = await poser('Quelle région est la plus touchée ?');
    ok('IA : une réponse sans chiffre qui nomme le mauvais lieu (Diourbel au lieu de Dakar) est écartée', /^Régions les plus touchées/.test(T(b4)) && /1\. Dakar/.test(T(b4)) && /ne citait pas le bon lieu/.test(T(b4.querySelector('.assist-source'))));

    const reps = await poser('Quelle est la capitale du Japon ?');
    ok('IA : quand l\'IA dit ne pas savoir, sa réponse est affichée telle quelle', /Je n'ai pas cette information/.test(T(reps)) && !reps.querySelector('details'));
  }

  // ---- explorateur : même comportement dans la fiche « Posez votre question » ----
  { const { w, d } = await charger('explorer.html', url);
    d.getElementById('askBtn').click(); await jusqua(() => !d.getElementById('chatEtat').hidden);
    ok('IA (explorateur) : l\'état de l\'IA est affiché', /IA locale : phi4-mini/.test(T(d.getElementById('chatEtat'))));
    d.getElementById('chatInput').value = 'Déficit de Saraya'; d.getElementById('chatSend').click();
    await jusqua(() => finie([...d.querySelectorAll('.chat-msg.bot')].pop())); const b = [...d.querySelectorAll('.chat-msg.bot')].pop();
    ok('IA (explorateur) : la réponse rédigée s\'affiche avec sa source', /il en manque 1/.test(T(b)) && !!b.querySelector('.assist-source')); }

  // ---- Ollama absent : retour au moteur à règles, sans attendre ----
  { const { d } = await charger('index.html', 'http://127.0.0.1:9'); const p = d.getElementById('assistPanneau');
    d.querySelector('.assist').click(); await jusqua(() => !p.querySelector('.assist-etat').hidden);
    ok('sans Ollama : l\'en-tête le dit', /IA locale non détectée/.test(T(p.querySelector('.assist-etat'))));
    p.querySelector('input').value = 'Déficit de Saraya'; p.querySelector('form').dispatchEvent(new (d.defaultView.Event)('submit', { cancelable: true, bubbles: true })); await jusqua(() => /Saraya (Saraya) :/.test(T(p.querySelector('.assist-log'))));
    ok('sans Ollama : la réponse est celle du moteur à règles, comme avant', /Saraya \(Saraya\) : 1 poste de santé manquant sur 1 requis \(0 existants\)/.test(T(p.querySelector('.assist-log')))); }

  // ---- ?ia=non : l'IA est désactivée même si Ollama tourne ----
  { const dom = await JSDOM.fromFile(DOCS + 'index.html', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: pathToFileURL(DOCS + 'index.html').href + '?ia=non',
      beforeParse(win) { win.fetch = (...a) => fetch(...a); win.AbortController = AbortController; win.TextDecoder = TextDecoder; win.JAPPALE_IA = { url }; } });
    await attendre(1500); const avant = recus.length; dom.window.document.querySelector('.assist').click(); await attendre(400);
    ok('?ia=non : aucune requête vers Ollama', recus.length === avant && dom.window.__assistant.ia.etat === 'desactive'); }

  // ---- site en ligne : l'IA n'est pas cherchée (le navigateur demanderait l'accès au réseau local), sauf avec ?ia=oui ----
  { const fs = require('fs'), vm = require('vm');
    const etat = (adresse) => { const u = new URL(adresse); let appels = 0;
      const ctx = vm.createContext({ console, setTimeout, clearTimeout, AbortController, TextDecoder, fetch: () => { appels++; return new Promise(() => {}); },
        location: { protocol: u.protocol, hostname: u.hostname, search: u.search }, localStorage: { getItem: () => null }, window: {} });
      ['data.js', 'assistant.js', 'assistant-llm.js'].forEach(f => vm.runInContext(fs.readFileSync(DOCS + f, 'utf8'), ctx));
      const ia = vm.runInContext('creerAssistantLLM({ moteur: creerMoteurAssistant({ communes: COMMUNES_DATA, regionPoints: {}, regionRate: () => 0, mot: (n, s, p) => p, nomUnique: c => c.n }), communes: COMMUNES_DATA, regionPoints: {}, regionRate: () => 0, mot: (n, s, p) => p, nomUnique: c => c.n })', ctx);
      ia.verifierConnexion(); return { etat: ia.etat, appels }; };
    const enLigne = etat('https://exemple.github.io/jappale/index.html'), force = etat('https://exemple.github.io/jappale/index.html?ia=oui'), local = etat('http://localhost:8000/index.html');
    ok('site en ligne : aucune requête vers Ollama par défaut', enLigne.etat === 'desactive' && enLigne.appels === 0, JSON.stringify(enLigne));
    ok('site en ligne avec ?ia=oui, ou site servi en local : Ollama est cherché', force.appels === 1 && local.appels === 1, JSON.stringify([force, local])); }

  faux.close();
  console.log(echecs ? `\n${echecs} ECHEC(S)` : '\nTout est OK'); process.exit(echecs ? 1 : 0);
})();
