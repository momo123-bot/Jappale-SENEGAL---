// Vérifie la mise en page dans un vrai navigateur (Chromium) : ce que les contrôles automatiques de tests/interface/ ne peuvent pas voir.
// Facultatif : depuis ce dossier, « npm install » puis « npm test » (le premier lancement télécharge Chromium). Le script est coupé en deux parties, d'environ deux minutes chacune : « npm test » les lance l'une après l'autre ; « npm run test:1 » ou « npm run test:2 » n'en lance qu'une.
// Ce script mesure, il ne juge pas le « joli » : il attrape les défauts objectifs (texte recouvert, bouton hors écran, défilement horizontal...).
const http = require('http'), fs = require('fs'), path = require('path');
const DOCS = path.resolve(process.env.DOSSIER_SITE || path.join(__dirname, '..', '..', 'docs')) + path.sep;   // DOSSIER_SITE : vérifier un autre dossier de site
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PAGES = ['index', 'synthese', 'explorer', 'communes', 'comparer', 'methode', 'simulateur'];
const PARTIE = process.argv[2] || 'tout', partie = n => PARTIE === 'tout' || PARTIE === String(n);   // node verifier_mise_en_page.js 1 | 2 | (rien : les deux)
let echecs = 0; const ok = (nom, cond, detail = '') => { if (!cond) echecs++; console.log(cond ? 'OK   ' : 'ECHEC', nom, detail); };

async function lancer() {
  try { return await require('puppeteer').launch({ headless: true }); }
  catch (e) {   // repli : Chromium embarqué, utile sur un serveur sans accès au téléchargement de Chromium
    const c = require('@sparticuz/chromium'), chromium = c.default || c;
    return require('puppeteer-core').launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
  }
}
const serveur = http.createServer((req, res) => {
  const f = path.join(DOCS, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!f.startsWith(DOCS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => serveur.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + serveur.address().port + '/';
  const nav = await lancer();
  const ouvrir = async (page, w, h, theme) => {
    const p = await nav.newPage(); await p.setViewport({ width: w, height: h, isMobile: w < 600, hasTouch: w < 600 });
    const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    if (theme === 'light') await p.evaluateOnNewDocument(() => { try { localStorage.setItem('jappale-theme-v3', 'light'); } catch (e) {} });
    await p.goto(base + page + '.html', { waitUntil: 'load' }); await attendre(700); return { p, erreurs };
  };
  if (partie(1)) {   // partie 1 : blocs 1 à 5 bis, sauf la barre du haut (erreurs de script, défilement horizontal, explorateur, nombres, contact)
  // 2 bis (largeurs 1 100 à 1 399 px). la barre du haut ne déborde pas, sur ordinateur : le bouton de thème reste à l'écran et les liens tiennent sur une ligne
  for (const w of [1100, 1200, 1280, 1366, 1399]) for (const page of PAGES.filter(p => p !== 'explorer')) {
    const { p } = await ouvrir(page, w, 800);
    const r = await p.evaluate(() => { const th = document.getElementById('themeBtn').getBoundingClientRect(), links = document.querySelector('.links'), lis = [...links.querySelectorAll('li')].filter(l => l.getBoundingClientRect().width > 0).map(l => Math.round(l.getBoundingClientRect().top)); /* seules les entrées visibles comptent : l'entrée « Affichage » du menu est masquée sur grand écran */ return { themeDansEcran: th.right <= window.innerWidth, pasDeDebordement: document.documentElement.scrollWidth <= window.innerWidth, uneLigne: getComputedStyle(links).display === 'none' || new Set(lis).size === 1 }; });
    ok(`${page} à ${w} px : la barre du haut ne déborde pas (thème à l'écran, liens sur une ligne)`, r.themeDansEcran && r.pasDeDebordement && r.uneLigne, JSON.stringify(r)); await p.close();
  }
  // 1. aucune erreur de script, thème attendu, sur les six pages, en sombre (défaut) et en clair
  for (const theme of ['dark', 'light']) for (const page of PAGES) {
    const { p, erreurs } = await ouvrir(page, 1440, 900, theme);
    const t = await p.evaluate(() => document.documentElement.dataset.theme);
    ok(`${page} (${theme}) : aucune erreur de script, thème « ${theme} »`, erreurs.length === 0 && t === theme, erreurs.join(' | ')); await p.close();
  }
  // 2. pas de défilement horizontal, sur téléphone et tablette
  for (const w of [360, 390, 768]) for (const page of PAGES) {
    const { p } = await ouvrir(page, w, 800); const d = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    ok(`${page} à ${w} px : la page ne déborde pas à droite`, d[0] <= d[1] + 1, `${d[0]} > ${d[1]}`); await p.close();
  }
  // 3. explorateur : la légende ne cache aucun nom de région ni aucun point, et les boutons de zoom restent à l'écran
  for (const [w, h] of [[1024, 768], [1180, 820], [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1707, 871], [1920, 1080]]) {
    const { p } = await ouvrir('explorer', w, h);
    const r = await p.evaluate(() => {
      const inter = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const L = document.getElementById('legend').getBoundingClientRect(), Z = document.getElementById('zoomCtl').getBoundingClientRect();
      return { noms: [...document.querySelectorAll('.region-centroid-label')].filter(t => inter(t.getBoundingClientRect(), L)).map(t => t.textContent), points: [...document.querySelectorAll('circle.commune-dot')].filter(c => inter(c.getBoundingClientRect(), L)).length, zoomDansEcran: Z.left >= 0 && Z.right <= window.innerWidth && Z.top >= 0 && Z.bottom <= window.innerHeight, zoomSurLegende: inter(Z, L) };
    });
    ok(`explorateur ${w}x${h} : la légende ne cache aucun nom de région ni aucun point ; le zoom est à l'écran et libre`, r.noms.length === 0 && r.points === 0 && r.zoomDansEcran && !r.zoomSurLegende, JSON.stringify(r)); await p.close();
  }
  for (const [w, h] of [[360, 740], [375, 667], [390, 844], [414, 896]]) {
    const { p } = await ouvrir('explorer', w, h); const r = await p.evaluate(() => ['zoomPlus', 'zoomMoins', 'zoomTout'].map(i => document.getElementById(i).getBoundingClientRect()).every(b => b.left >= 0 && b.right <= window.innerWidth && b.top >= 0 && b.bottom <= window.innerHeight));
    ok(`explorateur sur téléphone ${w}x${h} : les trois boutons de zoom sont entièrement à l'écran`, r); await p.close();
  }
  // 3 bis. explorateur : les points se séparent en zoomant, le zoom automatique sépare la commune cliquée, le panneau latéral ne masque pas la carte
  // (le navigateur sans écran n'avance les animations que lorsqu'une image est dessinée : on en demande une à chaque tour)
  const attendreVue = async p => { let prec = ''; for (let k = 0; k < 40; k++) { await p.screenshot({ clip: { x: 0, y: 0, width: 2, height: 2 } }); const z = await p.evaluate(() => { document.getAnimations().forEach(a => a.finish()); return niveauZoom().toFixed(3) + '|' + vueCarte.x.toFixed(3) + '|' + vueCarte.y.toFixed(3); }); if (z === prec) return; prec = z; await attendre(50); } };
  { const { p } = await ouvrir('explorer', 1440, 900); const [cx, cy] = await p.evaluate(() => projeterCommune(communes.find(c => c.n === 'Grand Yoff')));
    await p.evaluate((x, y) => { for (let i = 0; i < 40; i++) zoomerA(1.5, x, y); }, cx, cy); await attendreVue(p);
    const r = await p.evaluate(() => { const m = document.getElementById('mapWrap').getBoundingClientRect(); const pts = [...document.querySelectorAll('#mapSvg circle.commune-dot')].map(c => { const q = c.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, r: q.width / 2 }; }).filter(o => o.x > m.left && o.x < m.right && o.y > m.top && o.y < m.bottom); let chev = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < (pts[i].r + pts[j].r) * 0.92) chev++; return { zoom: +niveauZoom().toFixed(1), visibles: pts.length, chevauchements: chev }; });
    ok('carte : au zoom maximal sur Grand Yoff (Dakar), aucun point ne chevauche un autre (35 paires se chevauchaient avec l\'ancien zoom plafonné à ×14)', r.zoom > 59 && r.visibles >= 10 && r.chevauchements === 0, JSON.stringify(r)); await p.close(); }
  { const { p } = await ouvrir('explorer', 1440, 900); const serrees = await p.evaluate(() => { const L = communes.map((c, i) => ({ i, lat: c.lat })).filter(o => o.lat != null), xy = L.map(o => projeterCommune(communes[o.i])); return L.map((o, k) => { let nn = Infinity; for (let j = 0; j < L.length; j++) if (j !== k) nn = Math.min(nn, Math.hypot(xy[k][0] - xy[j][0], xy[k][1] - xy[j][1])); return { i: o.i, nn }; }).sort((a, c) => a.nn - c.nn).slice(0, 15).map(o => o.i); });
    const fautes = [];
    for (const i of serrees) { await p.evaluate(() => { reinitialiserVue(0); document.getElementById('cardClose').click(); }); await attendre(80); await p.evaluate(k => openCommune(communes[k]), i); await attendreVue(p);
      const r = await p.evaluate(k => { const m = document.getElementById('mapWrap').getBoundingClientRect(); const pts = [...document.querySelectorAll('#mapSvg circle.commune-dot')].map(c => { const q = c.getBoundingClientRect(); return { i: +c.dataset.i, x: q.left + q.width / 2, y: q.top + q.height / 2, r: q.width / 2 }; }); const me = pts.find(q => q.i === k); return { visible: me.x > m.left && me.x < m.right && me.y > m.top && me.y < m.bottom, touchent: pts.filter(q => q.i !== k && Math.hypot(q.x - me.x, q.y - me.y) < (me.r + q.r) * 0.92).length }; }, i);
      if (!r.visible || r.touchent) fautes.push(`commune n° ${i} : ${r.visible ? '' : 'hors vue, '}${r.touchent} voisine(s) en contact`); }
    ok('carte : un clic sur l\'une des 15 communes les plus serrées du pays zoome assez pour qu\'elle ne touche aucune voisine, et elle reste visible', fautes.length === 0, fautes.join(' ; ')); await p.close(); }
  for (const [w, h] of [[900, 800], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]]) {
    const { p } = await ouvrir('explorer', w, h); await p.evaluate(() => openCommune(communes.find(c => c.n === 'Grand Yoff'))); await attendreVue(p);
    const r = await p.evaluate(() => { const rc = e => e.getBoundingClientRect(), carte = rc(document.getElementById('card')), zone = rc(document.getElementById('mapWrap')), i = communes.findIndex(c => c.n === 'Grand Yoff'), pt = rc(document.querySelector(`#mapSvg circle.commune-dot[data-i="${i}"]`)), px = pt.left + pt.width / 2, py = pt.top + pt.height / 2, pilule = rc(document.querySelector('.pill')), bas = [...document.querySelectorAll('.bottombar > *')].map(rc), nav = rc(document.querySelector('.site-nav'));
      return { collePresDuBordDroit: Math.abs(carte.right - innerWidth) < 1.5, largeur: Math.round(carte.width), sousLeMenu: Math.abs(carte.top - nav.bottom) < 1.5 && carte.bottom <= innerHeight + 1, carteReduite: zone.right <= carte.left + 1, communeVisible: px > zone.left && px < zone.right && py > zone.top && py < zone.bottom, rechercheLibre: pilule.right <= carte.left + 1, basLibre: bas.every(b => b.right <= carte.left + 1), deuxDomaines: document.querySelectorAll('#card .fiche-section').length === 2 }; });
    ok(`panneau latéral à ${w} px : rangé à droite sous le menu, la carte se réduit, la commune reste visible, la recherche et les commutateurs du bas ne sont pas recouverts, santé et éducation présentes`, r.collePresDuBordDroit && r.largeur === 400 && r.sousLeMenu && r.carteReduite && r.communeVisible && r.rechercheLibre && r.basLibre && r.deuxDomaines, JSON.stringify(r)); await p.close(); }
  { const { p } = await ouvrir('explorer', 390, 844); await p.evaluate(() => openCommune(communes.find(c => c.n === 'Grand Yoff'))); await attendreVue(p);
    const r = await p.evaluate(() => { const carte = document.getElementById('card').getBoundingClientRect(), i = communes.findIndex(c => c.n === 'Grand Yoff'), pt = document.querySelector(`#mapSvg circle.commune-dot[data-i="${i}"]`).getBoundingClientRect(), px = pt.left + pt.width / 2, py = pt.top + pt.height / 2; return { zoom: +niveauZoom().toFixed(1), aBas: carte.bottom >= innerHeight - 1 && carte.top > innerHeight * 0.3, communeAuDessusDuPanneau: py < carte.top - 4 && px > 0 && px < innerWidth, pasDePanneauLateral: !document.body.classList.contains('fiche-ouverte') }; });
    ok('téléphone (390 px) : la fiche reste en bas de l\'écran, la carte zoome et place la commune au-dessus de la fiche, sans panneau latéral', r.zoom >= 6 && r.aBas && r.communeAuDessusDuPanneau && r.pasDePanneauLateral, JSON.stringify(r)); await p.close(); }
  // 4. nombres lisibles : aucune espace fine insécable (presque invisible en gras)
  for (const page of ['index', 'simulateur', 'communes']) {
    const { p } = await ouvrir(page, 1440, 900); const n = await p.evaluate(() => (document.body.innerText.match(/\u202f/g) || []).length);
    ok(`${page} : aucun séparateur de milliers invisible (espace fine insécable)`, n === 0, n + ' trouvée(s)'); await p.close();
  }
  // 5. formulaire de contact : l'étoile reste sur la ligne de son libellé
  { const { p } = await ouvrir('index', 1440, 900); const r = await p.evaluate(() => [...document.querySelectorAll('#contactForm .lib')].map(l => { const q = l.querySelector('.req').getBoundingClientRect(), b = l.getBoundingClientRect(); return Math.abs(q.top - b.top) < 8; }));
    ok('contact : l\'étoile des quatre champs obligatoires est sur la même ligne que son libellé', r.length === 4 && r.every(Boolean), JSON.stringify(r)); await p.close(); }
  // 5 bis. contact : sans adresse branchée, la page n'affiche aucune mention permanente, mais la vérité est dite au moment de l'action (message visible après validation)
  { const { p } = await ouvrir('index', 1440, 900); await p.evaluate(() => { const f = document.getElementById('contactForm'); f.elements.nom.value = 'Diop'; f.elements.prenom.value = 'Awa'; f.elements.email.value = 'awa@exemple.sn'; f.elements.info.value = 'Bonjour'; }); await p.click('#contactBtn'); await attendre(400);
    const r = await p.evaluate(() => { const m = document.getElementById('contactMsg'), bb = m.getBoundingClientRect(); return { aucunBandeau: document.getElementById('contactEtat') === null, visible: !m.hidden && bb.height > 10, texte: /Rien n'a été envoyé/.test(m.textContent), bouton: document.getElementById('contactBtn').textContent.trim() }; });
    ok('contact : aucune mention permanente, mais après validation le message « Rien n\'a été envoyé » est visible, et le bouton disait « Préparer mon message »', r.aucunBandeau && r.visible && r.texte && r.bouton === 'Préparer mon message', JSON.stringify(r)); await p.close(); }
  // 5 ter. accueil : « À quoi sert ce site, et à qui ? » est visible dès le deuxième écran, sur ordinateur, et ses trois cartes sont lisibles
  { const { p } = await ouvrir('index', 1440, 900); const r = await p.evaluate(() => { const s = document.getElementById('objectif'), b = s.getBoundingClientRect(); const cartes = [...s.querySelectorAll('.apropos-card')]; return { haut: Math.round(b.top + window.scrollY), ecran: window.innerHeight, cartes: cartes.length, debordent: cartes.filter(c => c.scrollWidth > c.clientWidth + 1).length }; });
    ok('accueil : « À quoi sert ce site, et à qui ? » commence avant la fin du deuxième écran (1440 x 900), avec trois cartes qui ne débordent pas', r.haut < 2 * r.ecran && r.cartes === 3 && r.debordent === 0, JSON.stringify(r)); await p.close(); }
  }
  if (partie(2)) {   // partie 2 : barre du haut (bloc 2 bis) et blocs 6 à 13 (simulation, cartes de chiffres, images, impressions, recherche, fiche de décision, wolof, 360 px, clavier)
  // 2 bis (largeurs 1 400 à 1 920 px). la barre du haut ne déborde pas, sur ordinateur : le bouton de thème reste à l'écran et les liens tiennent sur une ligne
  for (const w of [1400, 1440, 1536, 1707, 1920]) for (const page of PAGES.filter(p => p !== 'explorer')) {
    const { p } = await ouvrir(page, w, 800);
    const r = await p.evaluate(() => { const th = document.getElementById('themeBtn').getBoundingClientRect(), links = document.querySelector('.links'), lis = [...links.querySelectorAll('li')].filter(l => l.getBoundingClientRect().width > 0).map(l => Math.round(l.getBoundingClientRect().top)); /* seules les entrées visibles comptent : l'entrée « Affichage » du menu est masquée sur grand écran */ return { themeDansEcran: th.right <= window.innerWidth, pasDeDebordement: document.documentElement.scrollWidth <= window.innerWidth, uneLigne: getComputedStyle(links).display === 'none' || new Set(lis).size === 1 }; });
    ok(`${page} à ${w} px : la barre du haut ne déborde pas (thème à l'écran, liens sur une ligne)`, r.themeDansEcran && r.pasDeDebordement && r.uneLigne, JSON.stringify(r)); await p.close();
  }
  // 6. simulation : le réglage de l'année est au-dessus du bouton de calcul, jamais à côté
  { const { p } = await ouvrir('simulateur', 1440, 900); const r = await p.evaluate(() => { const b = document.querySelector('.bascule').getBoundingClientRect(), c = document.querySelector('#simForm button[type="submit"]').getBoundingClientRect(); return { dessus: b.bottom <= c.top, memeLigne: !(b.bottom <= c.top || c.bottom <= b.top) }; });
    ok('simulation : l\'année de référence est au-dessus du bouton « Calculer la priorité », pas à côté', r.dessus && !r.memeLigne, JSON.stringify(r)); await p.close(); }
  // 6 bis. cartes de chiffres : leur texte ne sort jamais de son cadre, de 360 à 1 920 px (c'était le défaut de la page Simuler)
  for (const page of ['simulateur', 'synthese']) { const fautes = [];
    for (const w of [360, 390, 414, 600, 768, 900, 1000, 1100, 1200, 1280, 1366, 1440, 1707, 1920]) { const { p } = await ouvrir(page, w, 900);
      const sorties = await p.evaluate(() => { const res = []; document.querySelectorAll('.carte-chiffre').forEach((k, i) => { const kb = k.getBoundingClientRect(), pad = parseFloat(getComputedStyle(k).paddingRight) || 0; [...k.children].forEach(e => { const r = document.createRange(); r.selectNodeContents(e); const tb = r.getBoundingClientRect(); if (tb.right > kb.right - pad + 1 || e.scrollWidth > e.clientWidth + 1) res.push(`carte ${i + 1}`); }); }); return [...new Set(res)]; });
      if (sorties.length) fautes.push(`${w}px (${sorties.join(', ')})`); await p.close(); }
    ok(`${page} : le texte des cartes de chiffres ne sort jamais de son cadre (14 largeurs, de 360 à 1 920 px)`, fautes.length === 0, fautes.join(' ; ')); }
  // 7. images : toutes se chargent, y compris en thème sombre
  for (const page of ['index', 'simulateur', 'comparer', 'communes', 'methode']) {
    const { p } = await ouvrir(page, 1440, 900); await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await attendre(1200);
    const r = await p.evaluate(() => [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src')));
    ok(`${page} : toutes les images se chargent`, r.length === 0, r.join(', ')); await p.close();
  }
  // 8 bis. la page « À propos » garde de la marge sous la feuille A4 : mise en page d'impression à la largeur d'une feuille (190 mm), contenu au plus 1 015 px sur 1 047 imprimables
  { const p = await nav.newPage(); await p.setViewport({ width: 718, height: 1047 }); await p.goto(base + 'synthese.html', { waitUntil: 'load' }); await attendre(800); await p.emulateMediaType('print'); await attendre(300);
    const h = await p.evaluate(() => Math.round(document.querySelector('main').getBoundingClientRect().bottom + window.scrollY));
    ok('page « À propos » : en mise en page d\'impression, le contenu laisse de la marge sous la feuille A4 (au plus 1 015 px sur 1 047)', h <= 1015, h + ' px'); await p.close(); }
  // 8. la synthèse s'imprime : en mode impression, le menu, le pied de page et les boutons disparaissent, le fond est blanc, le contenu reste
  { const { p } = await ouvrir('synthese', 1100, 900); await p.emulateMediaType('print'); await attendre(300);
    const r = await p.evaluate(() => { const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }; return { menuCache: !vis('.nav'), piedCache: !vis('footer'), boutonCache: !vis('#syImprimer'), suiteCachee: !vis('.sy-suite'), contenuVisible: vis('#syPhrase') && vis('#syKpis') && vis('#syCommunes') && vis('#syBudget'), fondBlanc: getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)' }; });
    ok('synthèse en mode impression : menu, pied de page, bouton et pistes disparaissent ; le contenu reste ; le fond est blanc', Object.values(r).every(Boolean), JSON.stringify(r));
    const pdf = await p.pdf({ format: 'A4', printBackground: true }); const brut = Buffer.from(pdf).toString('latin1'); const pages = (brut.match(/\/Type\s*\/Page[^s]/g) || []).length;   // Buffer.from : Puppeteer renvoie un tableau d'octets
    ok('synthèse : une fois imprimée (PDF réel, A4), elle tient sur UNE page, comme son titre le dit', pages === 1, pages + ' page(s)'); await p.close(); }
  // 9. Recherche de l'accueil (juste sous le titre) : à l'ouverture, le titre du formulaire, le champ et le bouton sont visibles sans défiler (défaut signalé par un testeur : le titre passait sous la barre fixe)
  for (const [w, h] of [[360, 640], [390, 844], [412, 915]]) {
    const { p } = await ouvrir('index', w, h); await attendre(1200);
    await attendre(600);   // plus de bouton « Chercher ma commune » en haut : la recherche est juste sous le titre, visible dès l'ouverture
    const r = await p.evaluate(() => { const barre = [...document.querySelectorAll('header, nav, .topbar, .site-header')].find(e => ['sticky', 'fixed'].includes(getComputedStyle(e).position)); const bas = barre ? Math.round(barre.getBoundingClientRect().bottom) : 0; const lab = document.querySelector('#finder label').getBoundingClientRect(); const btn = document.querySelector('#finder button[type=submit]').getBoundingClientRect(); const dessus = document.elementFromPoint(Math.round(lab.left + 20), Math.round(lab.top + lab.height / 2)); return { barreBas: bas, titreHaut: Math.round(lab.top), boutonBas: Math.round(btn.bottom), hauteur: innerHeight, titreVisible: !!dessus && !!dessus.closest('#finder') }; });
    ok(`accueil, écran ${w}x${h} : sans cliquer ni défiler, le titre du formulaire, le champ et le bouton de recherche sont visibles (la recherche est juste sous le titre)`, r.titreVisible && r.titreHaut >= r.barreBas && r.boutonBas <= r.hauteur, JSON.stringify(r)); await p.close(); }
  // 10. fiche de décision : à l'écran elle est cachée ; imprimée, elle reste seule et tient sur UNE page A4
  for (const [q, nom] of [['commune=Touba%20Mosquee', 'Touba Mosquée'], ['commune=Kanel', 'Kanel'], ['commune=Medina%20Gounass&departement=Velingara', 'Médina Gounass (Vélingara)'], ['commune=Sama%20Kanta%20Peulh', 'Sama Kanta Peulh, non géolocalisée'], ['commune=Keur%20Massar%20Nord', 'Keur Massar Nord (pilote, Dakar)'], ['commune=Baba%20Garage', 'Baba Garage (pilote, Diourbel)']]) {
    const p = await nav.newPage(); await p.setViewport({ width: 1100, height: 900 }); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(base + 'communes.html?' + q, { waitUntil: 'load' }); await attendre(900);
    const ecran = await p.evaluate(() => { const d = document.getElementById('ficheDecision'), b = document.getElementById('imprimerFiche'); return { cachee: !!d && getComputedStyle(d).display === 'none', bouton: !!b && b.getBoundingClientRect().width > 0 }; });
    await p.emulateMediaType('print'); await attendre(300);
    const imp = await p.evaluate(() => { const vis = e => !!e && getComputedStyle(e).display !== 'none'; const d = document.getElementById('ficheDecision'); return { decision: vis(d), menu: vis(document.querySelector('nav.nav')), pied: vis(document.querySelector('footer')), chiffres: vis(document.querySelector('.kpis')), texte: d ? d.innerText.length : 0 }; });
    const pdf = await p.pdf({ format: 'A4', printBackground: true }); const brut = Buffer.from(pdf).toString('latin1'); const pages = (brut.match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok(`fiche de décision (${nom}) : cachée à l'écran, bouton « Imprimer » visible`, ecran.cachee && ecran.bouton, JSON.stringify(ecran));
    ok(`fiche de décision (${nom}) : imprimée, seule la fiche reste (ni menu, ni pied de page, ni chiffres de l'écran)`, imp.decision && !imp.menu && !imp.pied && !imp.chiffres && imp.texte > 400 && erreurs.length === 0, JSON.stringify(imp) + erreurs.join('|'));
    ok(`fiche de décision (${nom}) : tient sur UNE page A4`, pages === 1, pages + ' page(s)'); await p.close(); }
  // 11. wolof : la phrase du formulaire est plus longue ; sur petit téléphone, rien ne déborde et le formulaire reste entièrement visible
  for (const [nom, ouvrirWolof] of [['accueil', async () => { const { p } = await ouvrir('index', 360, 640); await attendre(900); await p.evaluate(() => document.getElementById('langueBtn').scrollIntoView({ behavior: 'instant', block: 'center' })); await attendre(300); await p.click('#langueBtn'); await attendre(300); return p; }],   // on se place d'abord au niveau du bouton avant de cliquer

                                    ['fiche de Touba Mosquée', async () => { const p = await nav.newPage(); await p.setViewport({ width: 360, height: 640, isMobile: true, hasTouch: true }); await p.goto(base + 'communes.html?commune=Touba%20Mosquee&langue=wo', { waitUntil: 'load' }); await attendre(900); return p; }]]) {
    const p = await ouvrirWolof(); const r = await p.evaluate(() => ({ largeur: innerWidth, defil: document.documentElement.scrollWidth, wolof: document.documentElement.getAttribute('data-langue') === 'wo', depasse: [...document.querySelectorAll('.finder label, .finder button, .kpi-lab, #imprimerFiche')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > innerWidth + 1).length }));
    ok(`wolof, écran 360 px (${nom}) : aucun débordement horizontal, aucun élément traduit hors de l'écran`, r.wolof && r.defil <= r.largeur && r.depasse === 0, JSON.stringify(r)); await p.close(); }
  // 12. petits téléphones (360 px) : les sept pages tiennent dans l'écran (la barre du haut et des boutons dépassaient jusqu'à 39 px avant correction)
  for (const [nom, adresse] of [['accueil', 'index.html'], ['explorateur', 'explorer.html'], ['fiche d\'une commune', 'communes.html?commune=Touba%20Mosquee'], ['comparaison', 'comparer.html'], ['méthode', 'methode.html'], ['simulateur', 'simulateur.html'], ['à propos', 'synthese.html']]) {
    const p = await nav.newPage(); await p.setViewport({ width: 360, height: 640 }); await p.goto(base + adresse, { waitUntil: 'load' }); await attendre(900);
    const r = await p.evaluate(() => { const W = innerWidth; const contenu = e => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
      const f = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > W + 1 && !contenu(e) && getComputedStyle(e).position !== 'fixed'; }); return { largeur: W, document: document.documentElement.scrollWidth, depassent: f.length, exemples: f.slice(0, 3).map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 24)) }; });
    ok(`petit téléphone 360 px (${nom}) : la page tient dans l'écran, aucun élément ne dépasse`, r.document <= r.largeur && r.depassent === 0, JSON.stringify(r)); await p.close(); }
  // 13. clavier : le premier Tab met le focus sur le lien d'évitement (visible) ; Entrée amène au contenu principal
  for (const [nom, adresse, cible] of [['accueil', 'index.html', 'contenu'], ['explorateur', 'explorer.html', 'stage'], ['fiche d\'une commune', 'communes.html?commune=Touba%20Mosquee', 'contenu'], ['comparaison', 'comparer.html', 'contenu'], ['méthode', 'methode.html', 'contenu'], ['simulateur', 'simulateur.html', 'contenu'], ['à propos', 'synthese.html', 'contenu']]) {
    const p = await nav.newPage(); await p.setViewport({ width: 1100, height: 800 }); await p.goto(base + adresse, { waitUntil: 'domcontentloaded' }); await attendre(450);
    await p.keyboard.press('Tab'); const a1 = await p.evaluate(() => { const e = document.activeElement, b = e.getBoundingClientRect(); return { classe: e.className, texte: e.textContent.trim(), haut: Math.round(b.top), gauche: Math.round(b.left), large: Math.round(b.width) }; });
    await p.keyboard.press('Enter'); await attendre(250); const a2 = await p.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id }));
    ok(`clavier (${nom}) : le premier Tab met le focus sur « Aller au contenu », visible en haut de page`, a1.classe === 'evitement' && a1.texte === 'Aller au contenu' && a1.haut >= 0 && a1.gauche >= 0 && a1.large > 0, JSON.stringify(a1));
    ok(`clavier (${nom}) : Entrée amène au contenu principal`, a2.hash === '#' + cible && a2.focus === cible, JSON.stringify(a2)); await p.close(); }
  // 14. fiche : « Copier le lien » copie une adresse complète ; « Télécharger en PDF » et « en Word » déposent de vrais fichiers
  { const dossier = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jappale-dl-'));
    await nav.defaultBrowserContext().overridePermissions(new URL(base).origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
    const p = await nav.newPage(); await p.setViewport({ width: 1100, height: 900 }); const cdp = await p.createCDPSession(); await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dossier });
    await p.goto(base + 'communes.html?commune=Oussouye', { waitUntil: 'load' }); await attendre(900); await p.bringToFront();
    await p.evaluate(() => { const v = document.querySelector('.fiche-plus'); if (v) v.open = true; }); await p.click('#copierLien'); await attendre(300); const copie = await p.evaluate(() => navigator.clipboard.readText().catch(e => 'ERREUR ' + e.message));
    ok('fiche : « Copier le lien » copie une adresse complète de la fiche (http, avec le nom de la commune)', /^https?:\/\/[^/]+\/communes\.html\?commune=Oussouye/.test(copie), copie);
    const attendreFichier = async nom => { for (let i = 0; i < 25; i++) { const f = path.join(dossier, nom); if (fs.existsSync(f) && fs.statSync(f).size > 500 && !fs.existsSync(f + '.crdownload')) return fs.readFileSync(f); await attendre(200); } return null; };
    await p.click('#pdfFiche'); const pdf = await attendreFichier('Fiche_decision_Oussouye.pdf'); const s = pdf ? pdf.toString('latin1') : '';
    ok('fiche : « Télécharger en PDF » dépose un vrai fichier PDF d\'une page, avec le nom de la commune', !!pdf && s.startsWith('%PDF-1.4') && /startxref\r?\n\d+\r?\n%%EOF/.test(s) && s.includes('Oussouye') && (s.match(/\/Type \/Page[^s]/g) || []).length === 1 && (s.match(/h\s+B\s/g) || []).length === 15 /* 14 contours de région + le point de la commune */, pdf ? pdf.length + ' octets' : 'aucun fichier');
    await p.click('#wordFiche'); const wd = await attendreFichier('Fiche_decision_Oussouye.docx'); const z = wd ? wd.toString('latin1') : '';
    ok('fiche : « Télécharger en Word » dépose un vrai fichier .docx (archive ZIP avec word/document.xml et le nom de la commune)', !!wd && z.startsWith('PK\x03\x04') && z.includes('word/document.xml') && z.includes('[Content_Types].xml') && z.includes('Oussouye') && z.includes('word/media/carte.png') && z.includes('PNG'), wd ? wd.length + ' octets' : 'aucun fichier');
    fs.copyFileSync(path.join(dossier, 'Fiche_decision_Oussouye.pdf'), '/tmp/fiche_Oussouye_reelle.pdf'); fs.copyFileSync(path.join(dossier, 'Fiche_decision_Oussouye.docx'), '/tmp/fiche_Oussouye_reelle.docx');
    await p.close(); }
  }
  await nav.close(); serveur.close();
  console.log(echecs ? `\n${echecs} ECHEC(S)` : '\nTout est OK'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('ERREUR :', e.message); process.exit(1); });
