// Assistant de Jàppale avec un vrai modèle de langage, exécuté en local par Ollama (par défaut phi4-mini).
// Le modèle ne connaît rien du Sénégal par lui-même : à chaque question, la page lui fournit les faits utiles
// tirés des données de la plateforme (fiche de la commune, du département ou de la région, repères nationaux,
// définitions, réponse du moteur à règles d'assistant.js), et lui interdit d'en sortir.
// Garde-fou : chaque nombre de la réponse doit figurer dans ces faits ou dans la question, avec la même unité ;
// sinon la réponse du modèle est écartée et remplacée par celle du moteur à règles.
// L'IA n'est cherchée que si la page est servie en local (localhost, 127.0.0.1, fichier) : sur le site en ligne,
// le navigateur demanderait sinon à chaque visiteur l'accès à son réseau local. On l'y active avec ?ia=oui.
// Sans Ollama, l'assistant fonctionne comme avant.
// Réglages : window.JAPPALE_IA = { url, modele, actif } avant ce script, ?ia=oui ou ?ia=non dans l'adresse.
function creerAssistantLLM({ moteur, communes, regionPoints, regionRate, mot, nomUnique }) {
  const config = (typeof window !== 'undefined' && window.JAPPALE_IA) || {};
  const reglages = Object.assign({ url: 'http://localhost:11434', modele: 'phi4-mini', actif: true, delaiPremierMot: 240000, delaiTotal: 420000 }, config);
  try {
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    let choix = (location.search.match(/[?&]ia=(oui|non)\b/) || [])[1];
    try { choix = choix || localStorage.getItem('jappale-ia'); } catch (e) { /* stockage indisponible */ }
    if (choix === 'non' || (!local && choix !== 'oui' && config.actif !== true)) reglages.actif = false;
  } catch (e) { /* hors navigateur : réglages par défaut */ }
  const possible = reglages.actif && typeof fetch === 'function' && typeof AbortController === 'function';
  const NE_COMPREND_PAS = "Je n'ai pas compris votre question";

  // ---------- mise en forme des nombres pour le modèle : espaces ordinaires, virgule décimale ----------
  const nf = (n, dec = 0) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[\u202f\u00a0]/g, ' ');
  const somme = (liste, cle) => liste.reduce((t, c) => t + (Number(c[cle]) || 0), 0);
  const parDeficit = (a, b) => b.dp - a.dp || b.p - a.p;
  // « 38 postes existants, 113 postes requis » : l'unité répétée évite qu'un petit modèle rattache un nombre au mauvais mot
  const accord = (n, s) => (n > 1 || s === 'requis' ? s.replace(/s$/, '') + 's' : s);
  const postes = (n, etat) => `${nf(n)} ${n > 1 ? 'postes' : 'poste'} ${accord(n, etat)}`;
  const equipements = (c) => `${c.nc} ${mot(c.nc, 'centre de santé existant', 'centres de santé existants')}, ${c.bc} ${mot(c.bc, 'centre de santé requis', 'centres de santé requis')}, ${c.dcd} ${mot(c.dcd, 'centre de santé manquant', 'centres de santé manquants')} ; ` +
    `${c.nh} ${mot(c.nh, 'hôpital existant', 'hôpitaux existants')}, ${c.bh} ${mot(c.bh, 'hôpital requis', 'hôpitaux requis')}, ${c.dhd} ${mot(c.dhd, 'hôpital manquant', 'hôpitaux manquants')}`;
  const plusEnDeficit = (c) => communes.filter(x => x.dp > c.dp).length;   // pas de rang : beaucoup de communes sont ex aequo
  const regions = Object.values(regionPoints).map(r => ({ r, taux: regionRate(r, 'sante', 'communale') })).sort((a, b) => b.taux - a.taux);
  const nomRegion = (cle) => (regionPoints[cle] && regionPoints[cle].label) || cle;
  const cleRegion = (nom) => Object.keys(regionPoints).find(k => moteur.normaliserTexte(regionPoints[k].label) === moteur.normaliserTexte(nom) || moteur.normaliserTexte(k.replace(/_/g, '-')) === moteur.normaliserTexte(nom));

  // ---------- fiches de faits ----------
  function ficheCommune(c) {
    const l = [`COMMUNE ${c.n} (département de ${c.d}, région de ${c.r})`,
      `- population 2023 : ${nf(c.p)} habitants`,
      `- postes de santé : ${postes(c.np, 'existant')}, ${postes(c.bp, 'requis')} par la norme, ${postes(c.dp, 'manquant')}` + (c.dp > 0 ? ` (${plusEnDeficit(c)} communes sur ${communes.length} en ont davantage qui manquent)` : '')];
    if (c.dpb !== null && c.dpb !== undefined) { const b = Math.round(c.dpb); l.push(`- vue bassin (avec les communes voisines à moins de 15 km) : ${nf(b)} ${mot(b, 'poste manquant', 'postes manquants')}`); }
    if (c.dp33 !== null && c.dp33 !== undefined) l.push(`- scénario 2033 (pas une prévision officielle) : ${c.dp33} ${mot(c.dp33, 'poste manquant', 'postes manquants')}`);
    if (c.dp33o !== null && c.dp33o !== undefined) l.push(`- projection officielle de l'ANSD pour 2033 : ${c.dp33o} ${mot(c.dp33o, 'poste manquant', 'postes manquants')}`);
    l.push(`- centres de santé ou hôpitaux situés dans la commune : ${c.ns}`);
    l.push(`- département de ${c.d} : ${equipements(c)}`);
    if (c.hp) l.push(`- hôpital le plus proche : ${c.hp}, à ${c.hk} km à vol d'oiseau`);
    l.push(`- établissements secondaires (collèges et lycées) : ${c.ne}` + (c.ne > 0 ? `, soit 1 pour ${nf(Math.round(c.p / c.ne))} habitants` : ', aucun recensé'));
    if (c.nu || c.nv) l.push(`- enseignement supérieur public : ${c.nu} campus d'université, ${c.nv} espaces numériques`);
    if (c.sc !== null && c.sc !== undefined) l.push(`- score combiné de priorité santé et éducation : ${nf(c.sc, 1)} sur 100 (plus il est élevé, plus la commune est prioritaire)`);
    l.push(`- fiabilité : ${c.fb ? 'données vérifiées' : 'donnée à confirmer (aucune structure rattachée dans la source)'} ; croissance 2013-2023 ${c.tm ? 'mesurée' : 'estimée (valeur nationale de repli)'}`);
    return l.join('\n');
  }
  function topCommunes(pool, n) {
    return [...pool].filter(c => c.dp > 0).sort(parDeficit).slice(0, n).map((c, i) => `${i + 1}. ${nomUnique(c)} (${c.d}) : ${c.dp} ${mot(c.dp, 'poste manquant', 'postes manquants')}`).join(' ; ') || 'aucune commune en déficit';
  }
  function ficheDepartement(nom) {
    const pool = communes.filter(c => c.d === nom);
    if (!pool.length) return '';
    const c = pool[0], ne = somme(pool, 'ne'), p = somme(pool, 'p');
    return [`DÉPARTEMENT ${nom} (région de ${c.r}, ${pool.length} communes)`,
      `- population 2023 : ${nf(p)} habitants`,
      `- postes de santé : ${postes(somme(pool, 'np'), 'existant')}, ${postes(somme(pool, 'bp'), 'requis')}, ${postes(somme(pool, 'dp'), 'manquant')} au total`,
      `- ${equipements(c)}`,
      `- établissements secondaires : ${ne}` + (ne > 0 ? `, soit 1 pour ${nf(Math.round(p / ne))} habitants` : ''),
      `- communes avec le plus de postes manquants : ${topCommunes(pool, 5)}`].join('\n');
  }
  function ficheRegion(nom) {
    const cle = cleRegion(nom); const r = cle && regionPoints[cle];
    const pool = communes.filter(c => c.r === nom);
    if (!r || !pool.length) return '';
    const rang = regions.findIndex(x => x.r === r) + 1;
    return [`RÉGION ${nomRegion(cle)} (${r.nbCommunes} communes)`,
      `- population 2023 : ${nf(r.pop)} habitants`,
      `- postes de santé : ${postes(somme(pool, 'np'), 'existant')}, ${postes(somme(pool, 'bp'), 'requis')}, ${postes(r.deficitPoste, 'manquant')} (${nf(regions[rang - 1].taux, 1)} pour 100 000 habitants, rang ${rang} sur ${regions.length} régions, 1 = la plus touchée) ; vue bassin : ${nf(Math.round(r.deficitBassin))} manquants`,
      `- hôpitaux : ${r.nbHopitaux} ${mot(r.nbHopitaux, 'hôpital existant', 'hôpitaux existants')}, ${r.besoinHopitaux} ${mot(r.besoinHopitaux, 'hôpital requis', 'hôpitaux requis')}`,
      `- établissements secondaires : ${r.nbEduc}, soit 1 pour ${nf(Math.round(r.pop / r.nbEduc))} habitants ; campus d'université publics : ${r.nbUniv} ; espaces numériques : ${r.nbEno}`,
      `- communes avec le plus de postes manquants : ${topCommunes(pool, 5)}`].join('\n');
  }
  const NATIONAL = (() => {
    const p = somme(communes, 'p'), ne = somme(communes, 'ne');
    const sansEduc = communes.filter(c => c.ne === 0).length;
    const scores = communes.filter(c => c.sc !== null && c.sc !== undefined).sort((a, b) => b.sc - a.sc).slice(0, 3);
    return ['SÉNÉGAL (ensemble des données de la plateforme)',
      `- ${communes.length} communes, ${regions.length} régions, ${nf(p)} habitants (RGPH-5, 2023)`,
      `- postes de santé : ${postes(somme(communes, 'np'), 'existant')}, ${postes(somme(communes, 'bp'), 'requis')}, ${postes(somme(communes, 'dp'), 'manquant')} ; ${communes.filter(c => c.dp > 0).length} communes en déficit`,
      `- communes avec le plus de postes manquants : ${topCommunes(communes, 5)}`,
      `- régions les plus touchées par le manque de postes : ` + regions.slice(0, 3).map((x, i) => `${i + 1}. ${x.r.label}, ${nf(x.taux, 1)} postes manquants pour 100 000 habitants`).join(' ; '),
      `- régions les mieux dotées : ` + regions.slice(-3).reverse().map(x => `${x.r.label}, ${nf(x.taux, 1)} postes manquants pour 100 000 habitants`).join(' ; '),
      `- établissements secondaires : ${ne} ; ${sansEduc} communes sans collège ni lycée recensé`,
      `- enseignement supérieur public : ${somme(communes, 'nu')} campus d'université, ${somme(communes, 'nv')} espaces numériques`,
      `- score combiné santé et éducation le plus élevé : ` + scores.map((c, i) => `${i + 1}. ${nomUnique(c)} (${nf(c.sc, 1)})`).join(' ; ')].join('\n');
  })();
  const METHODE = ['MÉTHODE ET LIMITES',
    '- Sources : recensement RGPH-5 2023 (ANSD), infrastructures géolocalisées Géo Sénégal 2023, recensement 2013 pour la croissance.',
    '- Normes : 1 poste de santé pour 10 000 habitants, 1 centre de santé pour 50 000, 1 hôpital pour 150 000 (OMS, reprises par l\'ANSD).',
    // versions courtes des définitions d'assistant.js : le texte complet arrive avec la question quand on la demande
    '- Déficit : postes requis (population divisée par 10 000, arrondie au supérieur) moins postes existants. Centres de santé et hôpitaux sont comptés par département.',
    "- Vue bassin : la commune partage les postes de ses voisines situées à moins de 15 km à vol d'oiseau.",
    "- Scénario 2033 : prolonge la croissance 2013-2023 ; ce n'est pas une prévision officielle.",
    "- Score combiné (0 à 100) : moyenne des rangs du déficit de postes et du nombre d'habitants par établissement secondaire.",
    `- Fiabilité : « données vérifiées » si des structures sont rattachées à la commune, sinon « à confirmer » (${communes.filter(c => c.fb === 0).map(c => c.n).join(', ')}).`,
    '- L\'éducation ne couvre que le secondaire (collèges et lycées), sans norme officielle : c\'est un constat, pas un déficit. Le primaire n\'est pas couvert.',
    '- La plateforme ne contient AUCUNE donnée sur : les coûts ou budgets en francs CFA, le personnel soignant, la qualité des soins, le matériel, les temps de trajet réels, la météo, la politique, ni aucun autre pays.',
    '- Le simulateur de budget (page « Simuler un budget ») choisit où construire en retirant le chevauchement entre communes proches.'].join('\n');

  // ---------- repérage des lieux cités (plusieurs possibles : « compare Touba et Kanel ») ----------
  const noms = (() => {
    const m = new Map();
    communes.forEach(c => [c.n, c.d, c.r].forEach(v => { const k = moteur.normaliserTexte(v); if (k.length > 2 && !m.has(k)) m.set(k, { valeur: v, cle: k }); }));
    return [...m.values()].sort((a, b) => b.cle.length - a.cle.length);
  })();
  function lieuxCites(question) {
    const q = ' ' + moteur.normaliserTexte(question).replace(/[^a-z0-9]+/g, ' ') + ' ';
    const trouves = [];
    for (const n of noms) {
      const motif = ' ' + n.cle.replace(/[^a-z0-9]+/g, ' ') + ' ';
      const pos = q.indexOf(motif);
      if (pos >= 0) { trouves.push({ valeur: n.valeur, pos }); if (trouves.length >= 4) break; }
    }
    const lieu = moteur.trouverLieu(question);
    if (lieu && !trouves.some(n => n.valeur === lieu.valeur)) trouves.push({ valeur: lieu.valeur, pos: 1e9 });
    // dans l'ordre de la question : « compare Kanel et Saraya » présente Kanel d'abord
    return trouves.sort((a, b) => a.pos - b.pos).map(t => ({ valeur: t.valeur }));
  }
  // Un même nom peut être une commune, un département et une région (Kanel, Kolda...). La fiche de la commune
  // contient déjà les centres et hôpitaux de son département : la fiche du département n'est ajoutée que si
  // le nom n'est pas une commune ou si la question parle de département. Chaque fiche coûte du temps de lecture.
  function fiches(lieux, question) {
    const q = moteur.normaliserTexte(question), vus = new Set(), blocs = [];
    const ajouter = (cle, texte) => { if (texte && !vus.has(cle)) { vus.add(cle); blocs.push(texte); } };
    for (const l of lieux) {
      const estCommune = communes.some(c => c.n === l.valeur);
      if (estCommune) communes.filter(c => c.n === l.valeur).slice(0, 2).forEach(c => ajouter('c|' + c.n + '|' + c.d, ficheCommune(c)));
      if (communes.some(c => c.d === l.valeur) && (!estCommune || /departement/.test(q))) ajouter('d|' + l.valeur, ficheDepartement(l.valeur));
      if (communes.some(c => c.r === l.valeur) && (!estCommune || /region/.test(q) || lieux.length === 1)) ajouter('r|' + l.valeur, ficheRegion(l.valeur));
      if (blocs.length >= 4) break;
    }
    return blocs;
  }

  // ---------- garde-fou : chaque nombre de la réponse doit venir des faits fournis ou de la question ----------
  function nombres(texte) {
    let t = String(texte).replace(/[\u202f\u00a0]/g, ' ');
    for (let i = 0; i < 3; i++) t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2');
    return (t.match(/\d+(?:[.,]\d+)?/g) || []).map(x => String(parseFloat(x.replace(',', '.'))));
  }
  // Deuxième contrôle : un nombre suivi d'un équipement ou d'un état (« 1 poste existant », « 8 hôpitaux manquants »)
  // doit apparaître avec le même équipement et le même état dans les faits. Un petit modèle recopie parfois un vrai
  // chiffre au mauvais endroit : le 1 des postes requis devient « 1 poste existant ». Si les faits ne donnent ce
  // nombre que sans unité (« 236 au total »), rien ne permet de le contredire.
  const EQUIPEMENTS = ['poste', 'centre', 'hopita', 'etablissement', 'college', 'lycee', 'campus', 'espace', 'hab', 'km', 'commune'];
  const ETATS = [['exist', 'existant'], ['requi', 'requis'], ['necessaire', 'requis'], ['manqu', 'manquant']];
  function mentions(texte) {
    let t = moteur.normaliserTexte(String(texte)).replace(/[\u202f\u00a0]/g, ' ');
    for (let i = 0; i < 3; i++) t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2');
    // nombres, mots et ponctuation : un nombre n'est rattach\u00e9 qu'aux mots de sa propre proposition (\u00ab 15 244 hab. Le
    // d\u00e9partement... \u00bb ne lie pas 15 244 au mot \u00ab d\u00e9partement \u00bb)
    const mots = t.replace(/(\d),(\d)/g, '$1.$2').match(/\d+(?:\.\d+)?|[a-z]+|[.,;:()!?]/g) || [];
    const res = [];
    mots.forEach((m, i) => {
      if (!/^\d+(\.\d+)?$/.test(m)) return;
      let quoi = '', etat = '';
      for (const suivant of mots.slice(i + 1, i + 6)) {
        if (/^[\d.,;:()!?]/.test(suivant)) break;
        if (!quoi) { const e = EQUIPEMENTS.find(x => suivant.startsWith(x)); if (e) { quoi = e; continue; } }
        if (!etat) { const e = ETATS.find(([x]) => suivant.startsWith(x)); if (e) etat = e[1]; }
        if (quoi && etat) break;
      }
      if (quoi || etat) res.push({ n: String(parseFloat(m)), quoi, etat });
    });
    return res;
  }
  function verifier(reponse, faits) {
    const connus = new Set(nombres(faits)), dansFaits = mentions(faits);
    const seuls = nombres(reponse).filter(n => !connus.has(n));
    const mal = mentions(reponse).filter(a => {
      const memes = dansFaits.filter(b => b.n === a.n);
      return memes.length > 0 && !memes.some(b => (!a.quoi || b.quoi === a.quoi) && (!a.etat || b.etat === a.etat));
    }).map(a => a.n);
    return [...seuls, ...mal];
  }
  // Troisième contrôle, sur les noms : à « Quelle région est la plus touchée ? », un petit modèle a pu répondre
  // « Diourbel » (deuxième de la liste) au lieu de Dakar, sans aucun chiffre. Si la réponse nomme des lieux, elle doit
  // nommer le lieu principal de la réponse calculée (le premier d'un classement, sinon le premier cité).
  // Noms d'au moins 5 lettres, pour ne pas confondre une commune avec un mot courant.
  const NOMS_SURS = noms.filter(n => n.cle.length >= 5 && n.cle !== 'medina');
  function lieuxNommes(texte) {
    const t = ' ' + moteur.normaliserTexte(String(texte)).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return NOMS_SURS.map(n => ({ cle: n.cle, pos: t.indexOf(' ' + n.cle.replace(/[^a-z0-9]+/g, ' ') + ' ') })).filter(n => n.pos >= 0).sort((a, b) => a.pos - b.pos);
  }
  function lieuOublie(reponse, regles) {
    if (regles.startsWith(NE_COMPREND_PAS)) return null;
    const i = regles.indexOf('1. ');
    const principal = lieuxNommes(i >= 0 ? regles.slice(i) : regles)[0];
    if (!principal) return null;
    // le département et la région du lieu principal sont acceptés : « le département de Mbacke » pour Touba
    const famille = new Set([principal.cle]);
    communes.filter(c => moteur.normaliserTexte(c.n) === principal.cle).forEach(c => { famille.add(moteur.normaliserTexte(c.d)); famille.add(moteur.normaliserTexte(c.r)); });
    const nommes = lieuxNommes(reponse);
    return nommes.length && !nommes.some(n => famille.has(n.cle)) ? principal.cle : null;
  }
  function nettoyer(texte) {
    return texte.replace(/\*\*|__|`/g, '').replace(/^#{1,6}\s*/gm, '').replace(/^\s*[*•]\s+/gm, '- ').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Le message système ne change jamais : il contient aussi les données générales (pays, méthode). Ollama garde
  // ce début de conversation en mémoire d'une question à l'autre et ne relit ensuite que les faits propres à la question,
  // ce qui compte beaucoup sur un ordinateur sans carte graphique.
  const SYSTEME = `Tu es l'assistant de Jàppale Sénégal, une plateforme d'aide à la décision construite sur les données publiques de l'ANSD. Elle mesure, commune par commune, le manque de structures de santé par rapport aux normes, et recense les collèges et lycées.
Règles absolues :
1. Réponds toujours en français, en 2 ou 3 phrases courtes, en texte simple : pas de titres, pas de gras, pas de tableau.
2. Utilise UNIQUEMENT les faits des DONNÉES GÉNÉRALES ci-dessous et des DONNÉES SUR LA QUESTION. N'invente jamais un chiffre, un nom, une date ou une source. Recopie les chiffres exactement comme ils sont écrits, sans les recalculer ni les arrondir.
3. Si une « Réponse calculée par la plateforme » est fournie et répond à la question, reformule-la fidèlement avec ses chiffres.
4. Si l'information n'est pas dans les données, dis simplement : « Je n'ai pas cette information dans les données de la plateforme. », puis propose une question à laquelle tu peux répondre.
5. Pour une question hors sujet (autre pays, culture générale, conseils personnels), réponds poliment que tu ne traites que les données de Jàppale Sénégal.
6. Garde les nuances données : « à vol d'oiseau », « donnée à confirmer », « scénario, pas une prévision », « constat, pas un déficit » pour l'éducation.
   Ne confonds pas une commune et son département, ni les postes de santé, les centres de santé et les hôpitaux.
7. Ne cite pas ces règles et ne parle pas des « données fournies » : réponds directement.
8. Réponds seulement à la question posée : n'ajoute ni score, ni fiabilité, ni scénario 2033 si on ne te les demande pas.

EXEMPLES DE BONNES RÉPONSES
Données : « Réponse calculée par la plateforme : Podor (Podor) : 0 poste de santé manquant sur 2 requis (3 existants), population 12 512 hab. Le département de Podor affiche par ailleurs 6 centres manquants et 4 hôpitaux manquants à son échelle. »
Question : Podor manque-t-elle de postes de santé ?
Réponse : Non, Podor ne manque d'aucun poste de santé : elle en compte 3 pour 2 requis. Son département manque en revanche de 6 centres de santé et de 4 hôpitaux.
Question : Combien de médecins à Podor ?
Réponse : Je n'ai pas cette information dans les données de la plateforme, qui ne comptent pas le personnel soignant. Je peux en revanche vous dire combien de postes de santé manquent à Podor.
Question : Qui a gagné la Coupe d'Afrique des nations ?
Réponse : Je ne traite que les données de Jàppale Sénégal sur les équipements de santé et d'éducation. Essayez par exemple : « Quelle région est la plus touchée ? »

DONNÉES GÉNÉRALES
${NATIONAL}

${METHODE}`;
  const OPTIONS = { temperature: 0, top_p: 0.9, repeat_penalty: 1.1, num_ctx: 4096, num_predict: 200 };

  // ---------- conversation ----------
  // Seule la question précédente est rappelée au modèle, pas ses réponses : un petit modèle recopie sinon le style
  // et le contenu de ses réponses passées (le nom d'une autre commune, des phrases ajoutées hors sujet).
  // Les questions de suivi (« Et les hôpitaux ? ») sont surtout servies par le report du lieu, dans preparer().
  let questionPrecedente = '';
  let dernierLieux = [];
  const SUIVI = /^(et|mais|alors|aussi)\b|\b(sa|son|ses|leur|leurs|la-bas|y|cette commune|cette region|ce departement|celle-ci|celui-ci|elle|il|ici)\b/;
  function preparer(question) {
    const q = moteur.normaliserTexte(question);
    let lieux = lieuxCites(question);
    let questionMoteur = question;
    if (!lieux.length && dernierLieux.length && SUIVI.test(q)) {
      lieux = dernierLieux;
      questionMoteur = question + ' ' + lieux[0].valeur;   // « Et les hôpitaux ? » après Touba devient « Et les hôpitaux ? Touba Mosquee »
    }
    if (lieux.length) dernierLieux = lieux;
    let regles = moteur.repondreAssistant(questionMoteur);
    // « Compare Kanel et Saraya », « Que retenir pour Kanel ? » : le moteur à règles ne comprend pas, mais il sait
    // décrire chaque commune citée. Ces descriptions servent d'appui au modèle, et de réponse si la sienne est écartée.
    if (regles.startsWith(NE_COMPREND_PAS) && lieux.length) {
      const parLieu = lieux.map(l => moteur.repondreAssistant('Déficit de ' + l.valeur)).filter(r => !r.startsWith(NE_COMPREND_PAS));
      if (parLieu.length) regles = [...new Set(parLieu)].join('\n\n');
    }
    const blocs = [];
    if (!regles.startsWith(NE_COMPREND_PAS)) blocs.push('Réponse calculée par la plateforme : ' + regles);
    blocs.push(...fiches(lieux, question));
    // faits : ce qui est envoyé avec la question ; reference : tout ce que le modèle a pu lire, pour le garde-fou
    const faits = blocs.join('\n\n') || 'Aucun lieu précis reconnu dans la question : utilise les données générales.';
    return { regles, faits, reference: faits + '\n' + SYSTEME };
  }

  // ---------- connexion à Ollama ----------
  let etat = possible ? 'inconnu' : 'desactive', raison = '', verification = null;
  const ecouteurs = new Set();
  const annoncer = () => ecouteurs.forEach(f => { try { f(etat, raison); } catch (e) { /* écouteur fautif */ } });
  async function avecDelai(url, options, ms) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, Object.assign({}, options, { signal: ctrl.signal })); } finally { clearTimeout(t); }
  }
  function verifierConnexion() {
    if (!possible) return Promise.resolve(false);
    if (verification) return verification;
    verification = (async () => {
      try {
        const r = await avecDelai(reglages.url + '/api/tags', {}, 2500);
        if (!r.ok) throw new Error('HTTP ' + r.status);   // 403 : page servie depuis une origine refusée par Ollama
        const liste = ((await r.json()).models || []).map(m => m.name);
        const ok = liste.some(n => n === reglages.modele || n.split(':')[0] === reglages.modele.split(':')[0]);
        etat = ok ? 'pret' : 'absent'; raison = ok ? `IA locale : ${reglages.modele}` : `Modèle ${reglages.modele} absent d'Ollama : réponses calculées sans IA`;
        // préchargement, sans attendre : le modèle monte en mémoire et lit une fois pour toutes les données générales
        if (ok) fetch(reglages.url + '/api/chat', { method: 'POST', body: JSON.stringify({ model: reglages.modele, stream: false, keep_alive: '30m',
          messages: [{ role: 'system', content: SYSTEME }, { role: 'user', content: 'Bonjour' }], options: Object.assign({}, OPTIONS, { num_predict: 1 }) }) }).catch(() => {});
      } catch (e) { etat = 'injoignable'; raison = 'IA locale non détectée : réponses calculées sans IA'; }
      annoncer();
      return etat === 'pret';
    })();
    return verification;
  }

  async function interrogerModele(question, faits, ctrl, surMorceau) {
    const rappel = questionPrecedente ? `Question précédente de la même personne : ${questionPrecedente}\n\n` : '';
    const messages = [{ role: 'system', content: SYSTEME },
      { role: 'user', content: `DONNÉES SUR LA QUESTION :\n${faits}\n\n${rappel}QUESTION : ${question}` }];
    let premier = setTimeout(() => ctrl.abort(), reglages.delaiPremierMot);
    const total = setTimeout(() => ctrl.abort(), reglages.delaiTotal);
    try {
      const r = await fetch(reglages.url + '/api/chat', { method: 'POST', signal: ctrl.signal, body: JSON.stringify({ model: reglages.modele, messages, stream: true, keep_alive: '30m', options: OPTIONS }) });
      if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
      const lecteur = r.body.getReader(), dec = new TextDecoder();
      let tampon = '', texte = '';
      for (;;) {
        const { value, done } = await lecteur.read();
        if (done) break;
        tampon += dec.decode(value, { stream: true });
        const lignes = tampon.split('\n'); tampon = lignes.pop();
        for (const ligne of lignes) {
          if (!ligne.trim()) continue;
          const morceau = JSON.parse(ligne);
          if (morceau.error) throw new Error(morceau.error);
          if (morceau.message && morceau.message.content) {
            if (premier) { clearTimeout(premier); premier = null; }
            texte += morceau.message.content; surMorceau(nettoyer(texte));
          }
        }
      }
      return nettoyer(texte);
    } finally { if (premier) clearTimeout(premier); clearTimeout(total); }
  }

  // ---------- point d'entrée pour les deux interfaces (panneau des pages et fiche de l'explorateur) ----------
  // ajouter(texte, 'bot') crée une bulle et la renvoie. Les questions passent l'une après l'autre.
  let file = Promise.resolve();
  function mention(bulle, texte, classe, regles) {
    if (!bulle || typeof document === 'undefined' || !document.createElement) return;
    const s = document.createElement('small'); s.className = 'assist-source ' + (classe || ''); s.textContent = texte; bulle.appendChild(s);
    // sous une réponse de l'IA, le calcul exact de la plateforme reste consultable, pour vérifier d'un coup d'œil
    if (regles && !regles.startsWith(NE_COMPREND_PAS)) {
      const d = document.createElement('details'); d.className = 'assist-calcul';
      const t = document.createElement('summary'); t.textContent = 'Voir la réponse calculée par la plateforme';
      const p = document.createElement('p'); p.textContent = regles;
      d.appendChild(t); d.appendChild(p); bulle.appendChild(d);
    }
  }
  function poser(question, ajouter) {
    if (!possible || etat === 'injoignable' || etat === 'absent') {
      // sans IA : même comportement qu'avant, réponse du moteur à règles
      setTimeout(() => ajouter(moteur.repondreAssistant(question), 'bot'), 120);
      return Promise.resolve();
    }
    file = file.then(async () => {
      const pret = await verifierConnexion();
      const { regles, faits, reference } = preparer(question);
      if (!pret) { ajouter(moteur.repondreAssistant(question), 'bot'); return; }   // Ollama absent : comme avant
      const attente = "L'IA locale lit les données…";
      const bulle = ajouter(attente, 'bot'); bulle.classList.add('en-cours'); bulle.setAttribute('aria-busy', 'true');
      const ctrl = new AbortController(); let parUtilisateur = false, zone = bulle;
      // sur un ordinateur lent, on peut à tout moment demander la réponse calculée, immédiate
      if (typeof document !== 'undefined' && document.createElement) {
        bulle.textContent = ''; zone = document.createElement('span'); zone.textContent = attente; bulle.appendChild(zone);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'assist-sans-ia'; b.textContent = 'Réponse immédiate sans IA';
        b.addEventListener('click', () => { parUtilisateur = true; ctrl.abort(); }); bulle.appendChild(b);
      }
      let texte = '', note, classe;
      try {
        texte = await interrogerModele(question, faits, ctrl, t => { zone.textContent = t; });
        if (!texte) throw new Error('réponse vide');
        const inconnus = verifier(texte, reference + '\n' + question), oublie = lieuOublie(texte, regles);
        if (inconnus.length) { note = `Réponse calculée par la plateforme : celle de l'IA citait un chiffre absent des données ou mal rattaché (${[...new Set(inconnus)].slice(0, 3).join(', ')}).`; classe = 'ecartee'; texte = regles; }
        else if (oublie) { note = "Réponse calculée par la plateforme : celle de l'IA ne citait pas le bon lieu."; classe = 'ecartee'; texte = regles; }
        else { note = `Rédigé par l'IA locale (${reglages.modele}) à partir des données de la plateforme ; chiffres et lieux contrôlés. En cas de doute, la fiche de la commune fait foi.`; classe = 'ia'; }
      } catch (e) {
        note = parUtilisateur ? 'Réponse calculée par la plateforme, sans IA.' : "Réponse calculée par la plateforme : l'IA locale n'a pas répondu à temps.";
        classe = 'ecartee'; texte = regles;
      }
      bulle.textContent = texte; mention(bulle, note, classe, classe === 'ia' ? regles : null);
      bulle.classList.remove('en-cours'); bulle.removeAttribute('aria-busy');
      questionPrecedente = question;
    }).catch(() => {});
    return file;
  }

  return {
    poser, verifierConnexion, preparer, verifier, nombres,
    surEtat(f) { ecouteurs.add(f); f(etat, raison); },
    get etat() { return etat; }, get reglages() { return Object.assign({}, reglages); },
  };
}
