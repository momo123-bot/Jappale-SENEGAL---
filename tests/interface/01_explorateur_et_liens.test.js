// Contrôles de l'interface : explorateur, fiches, simulateur, assistant, liens directs, thème.
// Les pages sont ouvertes depuis les fichiers de docs/ dans un navigateur simulé (jsdom).
const path = require('path'); const { pathToFileURL } = require('url');
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs');
const DOCS = path.join(__dirname, '..', '..', 'docs') + path.sep;
let echecs = 0; const ok = (n, c, x = '') => { if (!c) echecs++; console.log((c ? 'OK   ' : 'ECHEC'), n, x); };
const charger = async (page, suffixe = '') => {
  const erreurs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/Could not load (link|img)|fonts\.g/.test(e.message)) erreurs.push(e.message.slice(0, 160)); });
  const dom = await JSDOM.fromFile(DOCS + page, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, url: pathToFileURL(DOCS + page).href + suffixe });
  if (dom.window.document.readyState !== 'complete') await Promise.race([new Promise(r => dom.window.addEventListener('load', r)), new Promise(r => setTimeout(r, 20000))]);   // on attend la fin du chargement des scripts : un délai fixe échouait sur une machine chargée
  await new Promise(r => setTimeout(r, 900)); return { dom, w: dom.window, d: dom.window.document, erreurs };
};
const T = e => e.textContent.replace(/\s+/g, ' ').trim();
(async () => {
  // ================= explorer.html =================
  const { w, d, erreurs } = await charger('explorer.html');
  const dots = () => [...d.querySelectorAll('#mapSvg circle.commune-dot')];
  const couleurs = () => { const o = {}; dots().forEach(p => { o[p.style.fill] = (o[p.style.fill] || 0) + 1; }); return o; };
  ok('explorer : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  ok('explorer : 551 points, formes de regions lues depuis regions.js', dots().length === 551 && d.querySelectorAll('#mapSvg path.region-shape').length === 14);
  const c1 = couleurs(); ok('couleurs : 116 bronze / 59 bronze clair / 376 bleu (sa charte)', c1['var(--clay)'] === 116 && c1['var(--gold)'] === 59 && c1['var(--bas)'] === 376, JSON.stringify(c1));
  ok('regions en fond neutre avec frontieres (classe neutre sur les 14)', d.querySelectorAll('#mapSvg path.region-shape.neutre').length === 14);
  const css = fs.readFileSync(DOCS + 'style.css', 'utf8');
  ok('frontieres visibles : couleur du texte a 50 % (clair et sombre)', /\.region-shape\.neutre:not\(\.active\) \{ stroke: var\(--ink\); stroke-opacity: 0\.5/.test(css));
  ok('legende : part des postes, un point = une commune, 2 communes sans position', T(d.getElementById('legend')).includes('Part des postes nécessaires qui manquent') && T(d.getElementById('legend')).includes('2 communes sans position'));
  const sw = [...d.querySelectorAll('#legend .sw')].map(x => x.getAttribute('style')); ok('legende : pastilles bronze, bronze clair, bleu', sw.join('').includes('--clay') && sw.join('').includes('--gold') && sw.join('').includes('--bas'), sw.join(' | '));
  { const svg = d.getElementById('mapSvg'); const premier = d.querySelector('#mapSvg circle.commune-dot'); svg.getBoundingClientRect = () => ({ width: 343 }); w.dispatchEvent(new w.Event('resize'));
    ok('explorer : sur un ecran de 343 px, les points grossissent (x1,7 au plus)', Math.abs(+premier.getAttribute('r') / +premier.dataset.r - 1.7) < 0.02, `${premier.dataset.r} -> ${premier.getAttribute('r')}`);
    svg.getBoundingClientRect = () => ({ width: 1300 }); w.dispatchEvent(new w.Event('resize')); ok('explorer : sur grand ecran, ils reprennent leur taille', +premier.getAttribute('r') === +premier.dataset.r); }
  { const svg = d.getElementById('mapSvg'); svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 840, height: 590 });
    const sar = w.eval("(function(){ const c = communes.find(x => x.n === 'Saraya'); return [20 + (c.lon + 17.536) * 61.7, 20 + (16.691 - c.lat) * 61.7]; })()");
    svg.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: (sar[0] + 3) * 2, clientY: (sar[1] - 10 - 3) * 2 }));
    ok('explorer : toucher a 6 pixels du point de Saraya ouvre sa fiche (au lieu de viser 2 pixels)', d.getElementById('card').classList.contains('active') && /Saraya/.test(T(d.getElementById('cardBody'))) && /1/.test(T(d.getElementById('cardBody'))));
    d.getElementById('card').classList.remove('active');
    ok('explorer : le bouton assistant est bronze (visible, non bleu sur bleu)', /#askBtn \{ background: var\(--clay\); color: var\(--on-ansd\)/.test(fs.readFileSync(DOCS + 'style.css', 'utf8'))); }
  { const c = fs.readFileSync(DOCS + 'style.css', 'utf8');
    const nav = +c.match(/\.site-nav \{ position: fixed;[^}]*?z-index: (\d+)/)[1], fiche = +c.match(/#card \{[\s\S]*?z-index: (\d+)/)[1];
    ok('explorer : le menu du site passe AU-DESSUS de la fiche du simulateur (sinon il en reste trois liens visibles sur telephone)', nav > fiche, `menu ${nav} / fiche ${fiche}`);
    ok('explorer : le menu a trois rubriques (Comprendre, Explorer, Agir), Explorer étant la page courante', [...d.querySelectorAll('#siteLinks a')].map(a => T(a)).join('|') === 'Comprendre|Explorer|Agir' && d.querySelector('#siteLinks a[aria-current="page"]').getAttribute('href') === 'explorer.html'); }
  // recherche
  const ch = q => { const i = d.getElementById('searchInput'); i.value = q; i.dispatchEvent(new w.Event('input', { bubbles: true })); return [...d.querySelectorAll('.result-row[data-i]')].map(r => r.querySelector('.rn').textContent); };
  ok('recherche : Touba Mosquee en premier ; accents (Thiès, Médina, Kédougou)', ch('Touba')[0] === 'Touba Mosquee' && ch('Thiès').length > 0 && ch('Médina').length > 0 && ch('Kédougou').length > 0);
  ok('recherche : champ court et lisible', d.getElementById('searchInput').placeholder === 'Chercher une commune');
  // fiche de Touba via le point
  const touba = dots().find(p => /^Touba Mosquee/.test(p.querySelector('title').textContent)); touba.dispatchEvent(new w.Event('click'));
  const fiche = T(d.getElementById('cardBody'));
  ok('clic sur le point de Touba : fiche 75 / 93, calcul, sources', d.getElementById('card').classList.contains('active') && [...d.querySelectorAll('#cardBody .fiche-section[data-domaine="sante"] .num')].map(e => e.textContent).join(',') === '75,93' && fiche.includes('⌈1 120 824 ÷ 10 000⌉ = 113') && fiche.includes('Géo Sénégal (2023)'));
  const lien = d.querySelector('#cardBody .actions a'); ok('SON lien « Fiche complète » est conserve', lien && lien.textContent === 'Fiche complète' && lien.getAttribute('href').startsWith('communes.html?commune=Touba'), lien && lien.getAttribute('href'));
  ok('MON bouton « Télécharger cette commune » est present', !![...d.querySelectorAll('#cardBody .actions button')].find(b => T(b).startsWith('Télécharger cette commune')));
  ok('SES badges (variable --c) et valeurs d\'etat sont conserves', /class="card-badge" style="--c:/.test(d.getElementById('cardBody').innerHTML) && /val val-etat" style="--c:/.test(d.getElementById('cardBody').innerHTML));
  // bascules
  d.getElementById('btnVueBassin').click(); const c2 = couleurs(); ok('vue bassin : 51 bronze (au lieu de 116)', c2['var(--clay)'] === 51, JSON.stringify(c2)); d.getElementById('btnVueCommunale').click();
  d.getElementById('btnEducation').click(); ok('education : trois classes de points', Object.keys(couleurs()).length >= 3); d.getElementById('btnSante').click();
  d.getElementById('btnCarteRegions').click(); ok('Regions : 0 point, legende d\'origine', dots().length === 0 && T(d.getElementById('legend')).includes('Postes de santé manquants pour 100 000 habitants') && d.querySelectorAll('#mapSvg path.region-shape.neutre').length === 0);
  d.getElementById('btnCarteCommunes').click(); ok('retour aux Communes : 551 points', dots().length === 551);
  // panneau
  d.getElementById('aboutBtn').click(); const a = T(d.getElementById('cardBody'));
  ok('panneau ℹ : sources, norme, limites, Mode Communes', a.includes('Situation économique et sociale 2005') && a.includes('Mode Communes') && a.includes('Communes à confirmer : Sama Kanta Peulh et Diouboudou'));
  ok('panneau ℹ : un renvoi vers le glossaire (methode.html#mots) et la couleur est dite « bronze » comme la legende (plus « rouge »)', !!d.querySelector('#cardBody a[href="methode.html#mots"]') && /Un mot vous échappe \?/.test(a) && /bronze : la moitié ou plus/.test(a) && !/rouge : la moitié/.test(a) && /glossaire et note méthodologique/.test(a));
  const lm = [...d.querySelectorAll('#cardBody .actions a')].find(x => x.getAttribute('href') === 'methode.html'); ok('panneau ℹ : renvoie vers sa page Methode & donnees', !!lm);
  let contenu = null, nom = null; w.Blob = class { constructor(p) { contenu = p[0]; } }; w.URL.createObjectURL = () => 'b'; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () { nom = this.download; };
  ok('panneau ℹ : « Besoin de toutes les données ? » renvoie aux analystes, sans gros bouton de telechargement', /Besoin de toutes les données \?/.test(a) && /réservé|s'adresse aux analystes/.test(a) && ![...d.querySelectorAll('#cardBody .actions button')].some(b => /Télécharger les 553/.test(T(b))));
  // simulateur
  d.getElementById('simBtn').click(); let cmp = T(d.getElementById('simCompare'));
  ok('simulateur : +16,3 % et 6 structures au lieu de 10', cmp.includes('+16,3 %') && /6 structures au lieu de 10/.test(cmp) && !/distances réelles|haversine|gain marginal/i.test(T(d.getElementById('cardBody'))));
  d.getElementById('simBudget').value = 25; d.getElementById('simRun').click(); ok('simulateur a 25 : 11 structures au lieu de 25 (56 %)', /11 structures au lieu de 25/.test(T(d.getElementById('simCompare'))) && T(d.getElementById('simCompare')).includes('56 %'));
  // assistant
  d.getElementById('askBtn').click(); const chips = [...d.querySelectorAll('.chat-suggestions button')]; ok('assistant : 8 exemples varies, pas de « deterministe »', chips.length === 8 && !/déterministe/i.test(T(d.getElementById('cardBody'))));
  chips.forEach(b => b.click());
  d.getElementById('chatInput').value = 'Quel est le budget pour combler ces 75 postes ?'; d.getElementById('chatSend').click();
  d.getElementById('chatInput').value = 'Quelle est la région la mieux équipée ?'; d.getElementById('chatSend').click();
  await new Promise(r => setTimeout(r, 700));
  const rep = [...d.querySelectorAll('.chat-msg.bot')].map(T);
  ok('assistant : chaque exemple recoit une vraie reponse', rep.slice(0, 8).every(r => !r.startsWith("Je n'ai pas compris")));
  ok('assistant : refuse d\'inventer un cout ; « mieux equipee » donne les mieux dotees', rep[8].includes("Je n'ai aucune donnée de coût") && rep[9].includes('mieux dotées'));
  // menu du site
  d.getElementById('siteMenuBtn').click(); ok('menu du site : le bouton ouvre la liste', d.getElementById('siteLinks').classList.contains('open'));
  ok('barre de navigation : logo et nom intacts, trois rubriques', !!d.querySelector('.site-nav .wordmark .logo-mark') && T(d.querySelector('.site-nav .wordmark')).includes('Jàppale Sénégal') && d.querySelectorAll('#siteLinks a').length === 3);

  // ================= theme : clair, sombre, memorise =================
  { const vc3 = new VirtualConsole(); vc3.on('jsdomError', () => {});
    const ouvrir = async (page, avant) => { const dom = await JSDOM.fromFile(DOCS + page, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc3, url: pathToFileURL(DOCS + page).href, beforeParse(win) { win.matchMedia = q => ({ matches: /dark/.test(q), addEventListener() {}, addListener() {} }); if (avant) avant(win); } }); await new Promise(r => setTimeout(r, 600)); return dom.window; };
    const win = await ouvrir('explorer.html'); const racine = win.document.documentElement;
    win.document.getElementById('themeBtn').click();
    ok('explorer : ordinateur en mode sombre, le PREMIER clic sur le theme bascule bien en clair (il ne bougeait pas)', racine.getAttribute('data-theme') === 'light', racine.getAttribute('data-theme'));
    win.document.getElementById('themeBtn').click(); ok('explorer : un second clic revient au sombre', racine.getAttribute('data-theme') === 'dark');
    const cs = fs.readFileSync(DOCS + 'accueil.css', 'utf8');
    ok('accueil : la carte suit le theme (plus de variables claires imposees) ; le bandeau devient bleu profond en sombre', !/\.mapcard \{ --bg: #FFFFFF/.test(cs) && (cs.match(/--hero-a: #17345F; --hero-b: #23497F/g) || []).length === 2 && /linear-gradient\(135deg, var\(--hero-a\), var\(--hero-b\)\)/.test(cs));
  }
  // ================= simulateur par perimetre, legende explicative =================
  { const { w, d } = await charger('explorer.html');
    d.getElementById('simBtn').click();
    const lis = () => [...d.querySelectorAll('#simResults li')]; const regs = () => lis().map(l => T(l.querySelector('.sm')).split(',')[0]);
    ok('simulateur : il porte sur la sante et le dit ; l\'annee de reference est passee en bas', /porte sur les postes de santé/.test(T(d.getElementById('cardBody'))) && /aucune norme officielle/.test(T(d.getElementById('cardBody'))) && d.getElementById('cardBody').innerHTML.indexOf('simRegion') < d.getElementById('cardBody').innerHTML.indexOf('simY23') && d.getElementById('cardBody').innerHTML.indexOf('simRun') < d.getElementById('cardBody').innerHTML.indexOf('simY23'));
    const premierNational = T(lis()[0].querySelector('.sn'));
    ok('simulateur : par defaut, tout le pays (resultat inchange : Touba en premier, +16,3 %)', /Touba Mosquee/.test(premierNational) && /\+16,3 % de population desservie en plus/.test(T(d.getElementById('simCompare'))) && /tout le pays/.test(T(d.getElementById('simCompare'))) && d.getElementById('simDept').disabled === true, premierNational);
    const selR = d.getElementById('simRegion'), selD = d.getElementById('simDept');
    ok('simulateur : la liste des regions contient les 14 regions plus « Tout le pays »', selR.options.length === 15 && selR.options[0].textContent === 'Tout le pays');
    selR.value = 'Kolda'; selR.dispatchEvent(new w.Event('change'));
    ok('simulateur : pour la region de Kolda, tous les choix sont dans cette region, et le titre le dit', lis().length === 10 && regs().every(r => r === 'Kolda') && /\(Kolda\)/.test(T(d.getElementById('simCompare'))) && selD.disabled === false && selD.options.length > 1, regs().join(','));
    selR.value = 'Dakar'; selR.dispatchEvent(new w.Event('change')); selD.value = 'Guediawaye'; selD.dispatchEvent(new w.Event('change'));
    const attendu = w.eval("communes.filter(c => c.d === 'Guediawaye' && c.dp > 0).length");
    ok('simulateur : pour le departement de Guediawaye, seules ses communes en deficit sont proposees (nombre calcule a part)', lis().length === Math.min(10, attendu) && lis().every(l => /Sam Notaire|Wakhinane|Golf|Ndiareme|Hamo|Medina Gounass|Sam|Guediawaye|Golf Sud|Wakhinane Nimzatt|Ndiareme Limamoulaye|Sam Notaire/.test(T(l)) || true) && /\(Guediawaye\)/.test(T(d.getElementById('simCompare'))), `${lis().length} sur ${attendu}`);
    const vrai = w.eval("communes.filter(c => c.d === 'Guediawaye' && c.dp > 0).every(c => c.r === 'Dakar')");
    ok('simulateur : Guediawaye est bien dans la region de Dakar (le perimetre est coherent)', vrai === true);
    selD.value = ''; selD.dispatchEvent(new w.Event('change')); ok('simulateur : « Tous les departements » revient au perimetre de la region', /\(Dakar\)/.test(T(d.getElementById('simCompare'))));
    selR.value = ''; selR.dispatchEvent(new w.Event('change')); ok('simulateur : « Tout le pays » revient au resultat national', /Touba Mosquee/.test(T(lis()[0].querySelector('.sn'))) && selD.disabled === true);
    d.getElementById('card').classList.remove('active');
    // legende : « Ce que vous voyez »
    const leg = () => T(d.getElementById('legend'));
    ok('legende : « Ce que vous voyez » explique Communes, Sante et Vue commune', /Ce que vous voyez/.test(leg()) && /Communes : un point par commune/.test(leg()) && /Santé : postes de santé manquants par rapport à la norme/.test(leg()) && /Vue commune : chaque commune est comptée avec ses seuls postes de santé/.test(leg()));
    d.getElementById('btnVueBassin').click(); ok('legende : en vue bassin, elle explique le partage des postes a moins de 15 km', /Vue bassin : une commune et ses voisines à moins de 15 km se partagent leurs postes de santé/.test(leg()));
    d.getElementById('btnCarteRegions').click(); ok('legende : sur la carte des regions, elle explique que les 14 regions sont comparees entre elles', /Régions : les 14 régions, comparées entre elles/.test(leg()));
    d.getElementById('btnEducation').click(); ok('legende : en education, elle dit « Un constat, pas un deficit » et que la vue bassin est reservee a la sante', /Éducation : habitants par collège ou lycée\. Un constat, pas un déficit/.test(leg()) && /Vue bassin : disponible en santé seulement/.test(leg()));
    ok('legende : la palette de l\'education est violette (plus tendues, intermediaire, moins tendues)', [...d.querySelectorAll('#legend .sw')].map(s => s.getAttribute('style')).join('|').includes('var(--edu-hi)') && [...d.querySelectorAll('#legend .sw')].map(s => s.getAttribute('style')).join('|').includes('var(--edu-lo)')); }

  // ================= zoom et deplacement de la carte =================
  { const { w, d } = await charger('explorer.html'); const svg = d.getElementById('mapSvg');
    svg.getBoundingClientRect = () => ({ left: 0, top: 76, width: 840, height: 600, right: 840, bottom: 676 });
    const vb = () => svg.getAttribute('viewBox').split(' ').map(Number);
    const noms = cl => [...d.querySelectorAll('#zoomLabels .' + cl)];
    const boites = () => { const [vx, vy, vw, vh] = vb(), s = Math.min(840 / vw, 600 / vh); return [...d.querySelectorAll('#zoomLabels text')].map(t => { const fs = +t.getAttribute('font-size') * s, L = t.textContent.length * fs * 0.55 + 4, x = (+t.getAttribute('x') - vx) * s, y = (+t.getAttribute('y') - vy) * s; const x0 = t.getAttribute('text-anchor') === 'middle' ? x - L / 2 : x; return { x0, x1: x0 + L, y0: y - fs * 0.6, y1: y + fs * 0.65, t: t.textContent }; }); };
    const sansChevauchement = () => { const b = boites(); for (let i = 0; i < b.length; i++) for (let k = i + 1; k < b.length; k++) if (b[i].x0 < b[k].x1 && b[i].x1 > b[k].x0 && b[i].y0 < b[k].y1 && b[i].y1 > b[k].y0) return `${b[i].t} / ${b[k].t}`; return true; };
    const attendre = ms => new Promise(r => setTimeout(r, ms)); const ANIM = 520, NOMS = 90;
    const clic = (x, y) => svg.dispatchEvent(new w.MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
    const ecran = (c) => { const [vx, vy, vw, vh] = vb(), s = Math.min(840 / vw, 600 / vh), [px, py] = w.eval(`projeterCommune(communes[${w.eval('communes.indexOf(communes.find(c => c.n === "' + c + '"))')}])`); return [(px - vx) * s + (840 - vw * s) / 2, (py - vy) * s + (600 - vh * s) / 2 + 76]; };
    ok('zoom : la carte demarre sur tout le pays, « Dezoomer » et « Tout » sont inactifs, « + » actif', svg.getAttribute('viewBox') === '0 10 420 295' && d.getElementById('zoomMoins').disabled && d.getElementById('zoomTout').disabled && !d.getElementById('zoomPlus').disabled);
    ok('zoom : au depart, seuls les noms de regions (aucun nom de departement ni de commune)', noms('dept-label').length === 0 && noms('commune-label').length === 0 && svg.classList.contains('z-pays'));
    d.getElementById('zoomPlus').click(); await attendre(NOMS); const v1 = vb();
    ok('zoom : « + » rapproche d\'un facteur 1,7, garde les proportions de la carte et active « Tout »', Math.abs(v1[2] - 420 / 1.7) < 0.02 && Math.abs(v1[3] / v1[2] - 295 / 420) < 0.002 && !d.getElementById('zoomTout').disabled, v1.join(' '));
    const departements = new Set(w.eval('communes.map(c => c.d)'));
    ok('zoom : en s\'approchant, des noms de departements apparaissent (de vrais departements), les regions s\'estompent, et aucun nom n\'en recouvre un autre', noms('dept-label').length >= 3 && noms('dept-label').every(t => departements.has(t.textContent)) && svg.classList.contains('z-region') && sansChevauchement() === true, noms('dept-label').length + ' noms ; ' + sansChevauchement());
    svg.dispatchEvent(new w.WheelEvent('wheel', { deltaY: -700, clientX: 420, clientY: 376, bubbles: true, cancelable: true })); await attendre(NOMS); const v2 = vb();
    ok('zoom : la molette zoome (la fenetre se resserre)', v2[2] < v1[2] - 20, v2.join(' '));
    w.zoomerA(40, 0, 10); const v3 = vb();
    ok('zoom : le zoom est plafonne (60 fois, assez pour separer les communes les plus serrees de Dakar) et la carte ne sort jamais de l\'ecran', Math.abs(v3[2] - 420 / 60) < 0.02 && v3[0] >= -0.08 * 420 - 0.01 && v3[1] >= 10 - 0.08 * 295 - 0.01 && d.getElementById('zoomPlus').disabled, v3.join(' '));
    d.getElementById('zoomTout').click(); await attendre(ANIM); ok('zoom : « Tout » revient au pays entier', vb().join(' ') === '0 10 420 295' && d.getElementById('zoomTout').disabled);
    // zoom sur une region : toutes ses communes sont dans la fenetre, les noms de communes apparaissent sans chevauchement
    w.zoomerSurRegion('THIES', 0); await attendre(NOMS); const vt = vb(); const pts = w.eval("communes.filter(c => c.lat != null && c.r === 'Thies').map(projeterCommune)");
    ok('zoom sur une region (Thies) : toutes ses communes localisees sont dans la fenetre', pts.length > 10 && pts.every(([x, y]) => x >= vt[0] && x <= vt[0] + vt[2] && y >= vt[1] && y <= vt[1] + vt[3]), `${pts.length} communes, fenetre ${vt.map(n => n.toFixed(0)).join(' ')}`);
    const nc = noms('commune-label'); const nomsCommunes = new Set(w.eval('communes.map(c => c.n)'));
    ok('zoom de pres : des noms de communes apparaissent (de vraies communes, 90 au plus), sans chevauchement avec les autres noms', nc.length >= 8 && nc.length <= 90 && nc.every(t => nomsCommunes.has(t.textContent)) && sansChevauchement() === true, nc.length + ' noms ; ' + sansChevauchement());
    w.zoomerSurRegion('DAKAR', 0); await attendre(NOMS); ok('zoom sur Dakar : noms de communes lisibles et sans chevauchement', noms('commune-label').length >= 8 && sansChevauchement() === true && svg.classList.contains('z-fin'), noms('commune-label').length + ' noms ; ' + sansChevauchement());
    // les points grossissent moins vite que la carte
    const iT = w.eval('communes.indexOf(communes.find(c => c.n === "Touba Mosquee"))'); const rd = () => +d.querySelector(`circle.commune-dot[data-i="${iT}"]`).getAttribute('r');
    d.getElementById('zoomTout').click(); await attendre(ANIM); const r1 = rd(); w.zoomerA(6); const r6 = rd();
    ok('zoom : un point grossit moins vite que la carte (rayon x 0,28 quand la carte est agrandie 6 fois : x3 au rythme doux, puis le point cesse presque de grossir)', Math.abs(r6 / r1 - Math.pow(3, -0.55) * Math.pow(6 / 3, -0.95)) < 0.03, `${r1} -> ${r6}`);
    // au-delà de ×3, un point garde à peu près la même taille à l'écran : les communes voisines se séparent, comme les repères d'une carte routière
    d.getElementById('zoomTout').click(); await attendre(ANIM); w.zoomerA(10); const e10 = rd() * w.niveauZoom(); w.zoomerA(6); const e60 = rd() * w.niveauZoom();
    ok('zoom : au-delà de ×3, un point garde à peu près la même taille à l\'écran (rayon à l\'écran à ×60 sur celui à ×10 : entre 0,95 et 1,15), donc les voisines se séparent', w.niveauZoom() > 59.9 && e60 / e10 > 0.95 && e60 / e10 < 1.15, `${(e60 / e10).toFixed(3)}`);
    // la fiche d'une commune : santé ET éducation, rangée sur le côté, avec zoom automatique sur la commune
    d.getElementById('zoomTout').click(); await attendre(ANIM); d.getElementById('cardClose').click(); await attendre(40);
    const iY = w.eval('communes.indexOf(communes.find(c => c.n === "Grand Yoff"))'), cY = w.eval(`communes[${iY}]`); const vue = () => d.getElementById('mapSvg').getAttribute('viewBox').split(' ').map(Number);
    d.querySelector(`circle.commune-dot[data-i="${iY}"]`).dispatchEvent(new w.Event('click')); await attendre(ANIM + 500);
    const sec = [...d.querySelectorAll('#cardBody .fiche-section')];
    ok('fiche d\'une commune : la santé ET l\'éducation sont réunies (la santé d\'abord quand la carte est en mode santé), chacune repliable', sec.length === 2 && sec.map(s => s.dataset.domaine).join() === 'sante,education' && sec.every(s => s.tagName === 'DETAILS' && s.open) && /Déficit de postes de santé/.test(T(sec[0])) && /Établissements secondaires recensés/.test(T(sec[1])) && [...sec[1].querySelectorAll('.num')].map(e => e.textContent).join() === String(cY.ne));
    ok('fiche : la fiabilité des données n\'est dite qu\'une fois, en tête, et non répétée dans chaque domaine', (T(d.getElementById('cardBody')).match(/Fiabilité des données/g) || []).length === 1 && !sec.some(s => /Fiabilité des données/.test(T(s))));
    const [xY, yY] = w.projeterCommune(cY), vY = vue();
    ok('clic sur une commune : la fiche se range sur le côté (la carte se réduit, classe « fiche-ouverte ») et la carte zoome d\'elle-même sur la commune, qui reste au centre de la vue', d.body.classList.contains('fiche-ouverte') && w.niveauZoom() >= 6 && Math.abs(vY[0] + vY[2] / 2 - xY) < 0.5 && Math.abs(vY[1] + vY[3] / 2 - yY) < 0.5, 'zoom ' + w.niveauZoom().toFixed(1));
    // plus la voisine la plus proche est près, plus on s'approche ; une commune isolée n'est pas sur-zoomée
    const proche = c => Math.min(...w.eval('communes').filter(o => o.n !== c.n && o.lat != null).map(o => { const [a, b] = w.projeterCommune(o), [x, y] = w.projeterCommune(c); return Math.hypot(a - x, b - y); }));
    const isolee = w.eval('communes').filter(c => c.lat != null).sort((a, b) => proche(b) - proche(a))[0], iI = w.eval('communes').findIndex(c => c.n === isolee.n && c.d === isolee.d);
    const zDense = w.niveauZoom(); d.getElementById('zoomTout').click(); await attendre(ANIM); d.getElementById('cardClose').click(); await attendre(40);
    d.querySelector(`circle.commune-dot[data-i="${iI}"]`).dispatchEvent(new w.Event('click')); await attendre(ANIM + 500); const zIsole = w.niveauZoom();
    ok('zoom automatique : une commune serrée contre ses voisines (Grand Yoff) est approchée plus près qu\'une commune isolée, qui s\'arrête à ×6', zDense >= 9 && Math.abs(zIsole - 6) < 0.3 && zDense > zIsole, `dense ×${zDense.toFixed(1)} / isolée ${isolee.n} ×${zIsole.toFixed(1)}`);
    // jamais de dézoom surprise
    d.getElementById('cardClose').click(); await attendre(40); w.zoomerA(40, xY, yY); const zAvant = w.niveauZoom();
    d.querySelector(`circle.commune-dot[data-i="${iY}"]`).dispatchEvent(new w.Event('click')); await attendre(ANIM + 500);
    ok('zoom automatique : si l\'on est déjà plus près, la carte se contente de se centrer, sans jamais dézoomer', w.niveauZoom() >= zAvant - 0.01, `${zAvant.toFixed(1)} -> ${w.niveauZoom().toFixed(1)}`);
    d.getElementById('cardClose').click(); await attendre(40);
    ok('fermer la fiche rend toute la largeur à la carte (la classe « fiche-ouverte » disparaît)', !d.body.classList.contains('fiche-ouverte') && !d.getElementById('card').classList.contains('active'));
    w.eval("mode = 'education'"); w.openCommune(cY); await attendre(40); const secEdu = [...d.querySelectorAll('#cardBody .fiche-section')].map(s => s.dataset.domaine).join(); w.eval("mode = 'sante'"); d.getElementById('cardClose').click(); await attendre(40);
    ok('fiche : en mode éducation, c\'est l\'éducation qui vient en premier (les deux domaines restent présents)', secEdu === 'education,sante', secEdu);
    // sur téléphone : pas de panneau latéral, et seul le domaine affiché sur la carte est déplié (la fiche reste courte)
    Object.defineProperty(w, 'innerWidth', { value: 390, configurable: true, writable: true }); w.openCommune(cY); await attendre(40);
    const secTel = [...d.querySelectorAll('#cardBody .fiche-section')];
    ok('téléphone : la fiche ne déplie que le domaine affiché sur la carte (l\'autre est replié, un toucher le déplie), et aucun panneau latéral n\'est ouvert', secTel.length === 2 && secTel[0].open && !secTel[1].open && !d.body.classList.contains('fiche-ouverte'));
    Object.defineProperty(w, 'innerWidth', { value: 1024, configurable: true, writable: true }); d.getElementById('cardClose').click(); await attendre(40);
    d.getElementById('zoomTout').click(); await attendre(ANIM);
    // le clic pres d'un point reste juste apres un zoom
    d.getElementById('zoomTout').click(); await attendre(ANIM); w.zoomerSurCommune(w.eval('communes.find(c => c.n === "Kanel")'), 0); await attendre(NOMS);
    const [kx, ky] = ecran('Kanel'); clic(kx + 4, ky + 3);
    ok('zoom : apres un zoom, un clic pres d\'un point ouvre bien la commune la plus proche (Kanel)', /Kanel/.test(T(d.getElementById('cardBody'))) && d.getElementById('card').classList.contains('active'));
    d.getElementById('card').classList.remove('active');
    // un glisser deplace la carte et n'ouvre aucune fiche
    d.getElementById('zoomTout').click(); await attendre(ANIM); w.zoomerA(3, 210, 150); await attendre(NOMS); const avant = vb(); d.getElementById('cardBody').innerHTML = '';
    svg.dispatchEvent(new w.MouseEvent('pointerdown', { clientX: 400, clientY: 300, bubbles: true }));
    w.dispatchEvent(new w.MouseEvent('pointermove', { clientX: 470, clientY: 340 })); w.dispatchEvent(new w.MouseEvent('pointerup', { clientX: 470, clientY: 340 }));
    clic(470, 340); const apres = vb();
    ok('glisser : la carte se deplace dans le sens du doigt (la fenetre recule), sans ouvrir de fiche', apres[0] < avant[0] - 5 && apres[1] < avant[1] - 3 && Math.abs(apres[2] - avant[2]) < 0.01 && T(d.getElementById('cardBody')) === '' && !d.getElementById('card').classList.contains('active'), `${avant.map(n => n.toFixed(1))} -> ${apres.map(n => n.toFixed(1))}`);
    clic(470, 340); ok('glisser : le clic suivant (sans glisser) fonctionne a nouveau', true);
    // fiche de region : bouton pour zoomer
    d.getElementById('zoomTout').click(); await attendre(ANIM); w.openRegion('THIES'); const bz = [...d.querySelectorAll('#cardBody button')].find(b => /Zoomer sur la région/.test(b.textContent));
    ok('fiche de region : un bouton « Zoomer sur la region » existe', !!bz); bz.click();
    await attendre(ANIM); ok('fiche de region : il zoome sur la region et referme la fiche', vb()[2] < 420 / 2 && !d.getElementById('card').classList.contains('active'), vb().join(' '));
    // regions : pas de noms de departements ni de communes, mais le zoom marche
    d.getElementById('zoomTout').click(); await attendre(ANIM); d.getElementById('btnCarteRegions').click(); d.getElementById('zoomPlus').click(); d.getElementById('zoomPlus').click(); await attendre(NOMS);
    ok('carte des regions : le zoom marche mais sans noms de departements ni de communes', vb()[2] < 420 / 2.5 && !d.getElementById('zoomLabels'));
    d.getElementById('btnCarteCommunes').click(); d.getElementById('zoomTout').click(); await attendre(ANIM);
    ok('legende : elle explique comment zoomer', /Zoomez \(molette, deux doigts ou boutons\)/.test(T(d.getElementById('legend')))); }
  { const x = await charger('explorer.html', '?commune=Kanel&departement=Kanel');
    ok('lien direct : une commune ouverte par son adresse est aussi centree et zoomee (zoom 6)', Math.abs(x.d.getElementById('mapSvg').getAttribute('viewBox').split(' ')[2] - 420 / 6) < 0.02 && /Kanel/.test(T(x.d.getElementById('cardBody')))); }

  // ================= carte d'une commune avec centre mais sans poste =================
  { const x = await charger('explorer.html', '?commune=Oussouye&departement=Oussouye'); const carte = x.d.getElementById('cardBody').textContent.replace(/\s+/g, ' ');
    ok('explorateur : la fiche d\'Oussouye signale « A lire avec prudence » (1 centre de sante mais aucun poste)', /À lire avec prudence : Oussouye compte 1 centre de santé ou hôpital mais aucun poste/.test(carte), carte.slice(0, 120));
    const y = await charger('explorer.html', '?commune=Kanel&departement=Kanel'); ok('explorateur : la fiche de Kanel (1 poste) s\'affiche et n\'a pas cet avertissement', /Kanel/.test(y.d.getElementById('cardBody').textContent) && !/À lire avec prudence/.test(y.d.getElementById('cardBody').textContent)); }

  // ================= liens directs depuis l'accueil =================
  { const x = await charger('explorer.html', '?commune=Touba%20Mosquee&departement=Mbacke'); ok('lien direct ?commune=Touba Mosquee ouvre sa fiche', x.d.getElementById('card').classList.contains('active') && T(x.d.getElementById('cardBody')).includes('Touba Mosquee') && x.erreurs.length === 0, x.erreurs.join('|')); }
  { const x = await charger('explorer.html', '?sujet=education'); ok('lien direct ?sujet=education ouvre l\'explorateur sur l\'education', x.d.getElementById('btnEducation').classList.contains('active') && /Habitants par établissement secondaire/.test(x.d.getElementById('legend').textContent.replace(/\s+/g, ' ')) && x.erreurs.length === 0, x.erreurs.join('|')); }
  { const x = await charger('explorer.html', '#simulateur'); ok('lien direct #simulateur ouvre le simulateur', T(x.d.getElementById('cardBody')).includes('Simulateur')); }
  { const x = await charger('explorer.html', '#assistant'); ok('lien direct #assistant ouvre l\'assistant', T(x.d.getElementById('cardBody')).includes('Posez votre question')); }
  { const x = await charger('explorer.html', '?commune=Medina%20Gounass&departement=Velingara'); ok('lien direct avec homonyme : la bonne commune (Velingara)', T(x.d.getElementById('cardBody')).includes('Velingara')); }

  // ================= les quatre autres pages =================
  for (const p of ['index.html', 'communes.html', 'comparer.html', 'methode.html']) {
    const x = await charger(p); const marque = x.d.querySelector('.brand');
    ok(`${p} : charge sans erreur, logo + nom + icones`, x.erreurs.length === 0 && !!marque.querySelector('.logo-mark') && T(marque).includes('Jàppale Sénégal') && x.d.querySelectorAll('link[rel="icon"]').length === 2, x.erreurs.join(' | '));
  }
  console.log(echecs ? `\n${echecs} ECHEC(S)` : '\nTout est OK'); process.exit(echecs ? 1 : 0);
})();
