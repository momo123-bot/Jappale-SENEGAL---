// Vérifie l'affichage dans un vrai navigateur (Chromium) : texte très grand et contraste renforcé à 360 px, réglages de l'appareil (contraste, taille de texte du navigateur), en-tête sur téléphone, clavier, mémorisation, cibles tactiles, bouton « Haut ».
// Usage : cd tests/navigateur, npm install, puis npm run test:confort. Sortie 0 si tout est conforme, 1 sinon.
const http = require('http'), fs = require('fs'), path = require('path');
const DOCS = path.join(__dirname, '..', '..', 'docs') + path.sep;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const PAGES = [['accueil', 'index.html'], ['explorateur', 'explorer.html'], ['fiche d\'une commune', 'communes.html?commune=Touba%20Mosquee'], ['comparaison', 'comparer.html'], ['méthode', 'methode.html'], ['simulateur', 'simulateur.html'], ['à propos', 'synthese.html']];
const attendre = ms => new Promise(r => setTimeout(r, ms));
async function lancer() { try { return await require('puppeteer').launch({ headless: true }); } catch (e) { const c = require('@sparticuz/chromium'), chromium = c.default || c; return require('puppeteer-core').launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' }); } }
const DEBORD = () => { const W = innerWidth; const contenu = e => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  const f = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > W + 1 && !contenu(e) && getComputedStyle(e).position !== 'fixed'; });
  return { largeur: W, document: document.documentElement.scrollWidth, depassent: f.length, exemples: f.slice(0, 3).map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 24)) }; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DOCS, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'index.html'); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/'; const nav = await lancer(); let echecs = 0, total = 0;
  const ok = (nom, cond, detail = '') => { total++; if (!cond) echecs++; console.log(`${cond ? 'OK   ' : 'ECHEC'} ${nom}${detail ? ' ' + detail : ''}`); };
  const propre = p => p.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem('v')) { localStorage.clear(); sessionStorage.setItem('v', '1'); } } catch (e) {} });
  // 1. texte très grand + contraste renforcé + animations réduites, à 360 px de large
  for (const [nom, adresse] of PAGES) {
    const p = await nav.newPage(); await p.setViewport({ width: 360, height: 640 });
    await p.evaluateOnNewDocument(() => { try { localStorage.setItem('jappale-confort', JSON.stringify({ taille: 'tg', contraste: 'fort', mouvement: 'reduit' })); } catch (e) {} });
    await p.goto(base + adresse, { waitUntil: 'load' }); await attendre(800);
    const r = await p.evaluate(DEBORD); const c = await p.evaluate(() => { const h = document.documentElement; return { reglages: [h.getAttribute('data-taille'), h.getAttribute('data-contraste'), h.getAttribute('data-mouvement')].join('/'), corps: parseFloat(getComputedStyle(document.body).fontSize) }; });
    ok(`texte très grand, contraste renforcé, 360 px (${nom}) : la page tient dans l'écran`, r.document <= r.largeur && r.depassent === 0, JSON.stringify(r));
    ok(`texte très grand, contraste renforcé (${nom}) : les réglages sont appliqués et le corps de page est agrandi (au moins 22 px)`, c.reglages === 'tg/fort/reduit' && c.corps >= 22, `${c.reglages}, ${c.corps} px`); await p.close(); }
  // 2. clavier et mémorisation (bouton « Affichage » de l'en-tête)
  { const p = await nav.newPage(); await p.setViewport({ width: 1100, height: 800 }); await propre(p);
    await p.goto(base + 'index.html', { waitUntil: 'load' }); await attendre(600);
    await p.focus('#confortBtn'); await p.keyboard.press('Enter'); await attendre(150);
    const a = await p.evaluate(() => ({ ouvert: !document.getElementById('confortPanneau').hidden, dedans: document.getElementById('confortPanneau').contains(document.activeElement), expanded: document.getElementById('confortBtn').getAttribute('aria-expanded') }));
    await p.keyboard.press('Escape'); await attendre(150); const b = await p.evaluate(() => ({ ferme: document.getElementById('confortPanneau').hidden, focus: document.activeElement.id }));
    ok('clavier : Entrée sur « Affichage » ouvre le panneau et place le focus dedans ; Échap le ferme et rend le focus au même bouton', a.ouvert && a.dedans && a.expanded === 'true' && b.ferme && b.focus === 'confortBtn', JSON.stringify({ a, b }));
    await p.focus('#confortBtn'); await p.keyboard.press('Enter'); await p.click('button[data-reglage="taille"][data-valeur="tg"]'); await attendre(150);
    await p.goto(base + 'methode.html', { waitUntil: 'load' }); await attendre(600);
    const c = await p.evaluate(() => ({ taille: document.documentElement.getAttribute('data-taille'), corps: parseFloat(getComputedStyle(document.body).fontSize) }));
    ok('mémorisation : le texte très grand choisi sur l\'accueil est retrouvé sur une autre page', c.taille === 'tg' && c.corps >= 22, JSON.stringify(c)); await p.evaluate(() => localStorage.clear()); await p.close(); }
  // 3. cibles tactiles d'au moins 44 px (écran tactile)
  for (const [nom, adresse] of [['accueil', 'index.html'], ['fiche d\'une commune', 'communes.html?commune=Touba%20Mosquee']]) {
    const p = await nav.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await p.goto(base + adresse, { waitUntil: 'load' }); await attendre(900);
    const r = await p.evaluate(() => { const vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }; const c = [...document.querySelectorAll('button, .btn, a.lien-bouton, .chip, summary, select, input[type=text], input[type=search]')].filter(vis); const petits = c.filter(e => e.getBoundingClientRect().height < 43.5);
      return { tactile: matchMedia('(pointer: coarse)').matches, total: c.length, petits: petits.length, exemples: petits.slice(0, 4).map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 22) + ' ' + Math.round(e.getBoundingClientRect().height) + 'px') }; });
    ok(`cibles tactiles (${nom}) : tous les boutons, champs et résumés visibles font au moins 44 px de haut`, r.tactile && r.total > 3 && r.petits === 0, JSON.stringify(r)); await p.close(); }
  // 4. bouton « Haut » : n'apparaît qu'après les deux tiers d'une page longue
  { const p = await nav.newPage(); await p.setViewport({ width: 1100, height: 800 }); await p.goto(base + 'methode.html', { waitUntil: 'load' }); await attendre(600);
    const etat = async frac => { await p.evaluate(f => { document.documentElement.style.scrollBehavior = 'auto'; const reste = document.documentElement.scrollHeight - innerHeight; scrollTo(0, Math.round(reste * f)); }, frac); await attendre(350); return p.evaluate(() => { const b = document.querySelector('.haut-page'), s = getComputedStyle(b); const reste = document.documentElement.scrollHeight - innerHeight; return { progression: Math.round(scrollY / reste * 100) + ' %', visible: b.classList.contains('visible') && s.opacity === '1', tabindex: b.getAttribute('tabindex') }; }); };
    const e0 = await etat(0), e1 = await etat(0.33), e2 = await etat(0.5), e3 = await etat(0.72), e4 = await etat(1);
    ok('bouton « Haut » (page Méthode, longue) : invisible et hors du parcours clavier en haut, à un tiers et à la moitié ; visible aux deux tiers et en bas', !e0.visible && !e1.visible && !e2.visible && e0.tabindex === '-1' && e3.visible && e3.tabindex === '0' && e4.visible, JSON.stringify({ e0, e1, e2, e3, e4 }));
    await p.click('.haut-page'); let y = 99999; for (let i = 0; i < 25 && y >= 120; i++) { await attendre(200); y = await p.evaluate(() => Math.round(scrollY)); }
    ok('bouton « Haut » : un clic ramène en haut de la page', y < 120, y + ' px'); await p.close(); }
  // 5. réglages de l'appareil : si le système demande plus de contraste, il est activé d'office ; le choix explicite de la personne l'emporte
  { const p = await nav.newPage(); await p.setViewport({ width: 1100, height: 800 }); await (await p.createCDPSession()).send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: 'more' }] });   // Puppeteer ne connaît pas ce réglage système, Chromium si await propre(p);
    await p.goto(base + 'index.html', { waitUntil: 'load' }); await attendre(500);
    const a = await p.evaluate(() => ({ attr: document.documentElement.getAttribute('data-contraste'), encre: getComputedStyle(document.body).color }));
    await p.click('#confortBtn'); await attendre(150); const note = await p.evaluate(() => !!document.getElementById('confortNote') && !document.getElementById('confortNote').hidden);
    await p.click('button[data-reglage="contraste"][data-valeur="normal"]'); await attendre(150); const b = await p.evaluate(() => document.documentElement.getAttribute('data-contraste'));
    await p.goto(base + 'methode.html', { waitUntil: 'load' }); await attendre(500); const c = await p.evaluate(() => document.documentElement.getAttribute('data-contraste'));
    ok('réglages de l\'appareil : si le système demande plus de contraste, le contraste renforcé est activé d\'office (texte noir ou blanc pur) et le panneau le dit', a.attr === 'fort' && ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'].includes(a.encre) && note, JSON.stringify({ a, note }));
    ok('réglages de l\'appareil : le choix « Contraste normal » de la personne l\'emporte, et se retrouve sur une autre page', b === null && c === null, JSON.stringify({ b, c })); await p.evaluate(() => localStorage.clear()); await p.close(); }
  // 6. taille de texte choisie dans le navigateur (réglage réel de Chromium) : le texte suit, la mise en page tient à 360 px
  for (const [nom, adresse] of PAGES) {
    const p = await nav.newPage(); await p.setViewport({ width: 360, height: 640 }); const c = await p.createCDPSession(); await c.send('Page.setFontSizes', { fontSizes: { standard: 24, fixed: 13 } }); await propre(p);
    await p.goto(base + adresse, { waitUntil: 'load' }); await attendre(800);
    const r = await p.evaluate(DEBORD); const t = await p.evaluate(() => ({ racine: parseFloat(getComputedStyle(document.documentElement).fontSize), corps: parseFloat(getComputedStyle(document.body).fontSize), titre: document.querySelector('h1') ? parseFloat(getComputedStyle(document.querySelector('h1')).fontSize) : null, agrandi: document.documentElement.hasAttribute('data-agrandi') }));
    ok(`taille de texte du navigateur à 24 px, 360 px de large (${nom}) : la page tient dans l'écran`, r.document <= r.largeur && r.depassent === 0, JSON.stringify(r));
    ok(`taille de texte du navigateur à 24 px (${nom}) : le texte suit (corps au moins 24 px), le titre reste plus grand que le corps, la protection de mise en page est active`, t.racine === 24 && t.corps >= 24 && (t.titre === null || t.titre > t.corps) && t.agrandi, JSON.stringify(t)); await p.close(); }
  // 7. en-tête sur téléphone : « Affichage » et « Menu » visibles, sans débordement, de 320 à 390 px ; le panneau s'ouvre et tient dans l'écran
  for (const larg of [320, 360, 390]) {
    const p = await nav.newPage(); await p.setViewport({ width: larg, height: 700, isMobile: true, hasTouch: true }); await propre(p); await p.goto(base + 'index.html', { waitUntil: 'load' }); await attendre(700);
    const r = await p.evaluate(() => { const rect = id => { const e = document.getElementById(id), b = e.getBoundingClientRect(); return { visible: b.width > 0 && getComputedStyle(e).visibility !== 'hidden', droite: Math.round(b.right) }; }; const m = document.getElementById('menuBtn'); return { largeur: innerWidth, document: document.documentElement.scrollWidth, affichage: rect('confortBtn'), menu: rect('menuBtn'), menuTexte: m.textContent.trim(), theme: getComputedStyle(document.getElementById('themeBtn')).display }; });
    ok(`en-tête à ${larg} px : « Affichage » et « Menu » (avec son mot) sont visibles et dans l'écran, le thème est rangé dans le panneau, rien ne déborde`, r.affichage.visible && r.menu.visible && /Menu/.test(r.menuTexte) && r.affichage.droite <= r.largeur && r.menu.droite <= r.largeur && r.document <= r.largeur && r.theme === 'none', JSON.stringify(r)); await p.close(); }
  { const p = await nav.newPage(); await p.setViewport({ width: 360, height: 700, isMobile: true, hasTouch: true }); await propre(p); await p.goto(base + 'index.html', { waitUntil: 'load' }); await attendre(700);
    await p.tap('#confortBtn'); await attendre(250); const a = await p.evaluate(() => { const b = document.getElementById('confortPanneau').getBoundingClientRect(); return { ouvert: !document.getElementById('confortPanneau').hidden, gauche: Math.round(b.left), droite: Math.round(b.right), haut: Math.round(b.top), bas: Math.round(b.bottom), ecran: innerHeight }; });
    await p.tap('button[data-reglage="theme"][data-valeur="light"]'); await attendre(200); const th = await p.evaluate(() => document.documentElement.dataset.theme);
    ok('téléphone (360 px) : le toucher sur « Affichage » ouvre le panneau, entièrement dans l\'écran, et le thème clair se choisit dedans', a.ouvert && a.gauche >= 0 && a.droite <= 360 && a.haut >= 0 && th === 'light', JSON.stringify({ a, th })); await p.evaluate(() => localStorage.clear()); await p.close(); }
  // 8. l'explorateur sur téléphone : marque, « Affichage » et « Menu » tiennent dans l'écran de 320 à 480 px
  for (const larg of [320, 360, 390, 480]) {
    const p = await nav.newPage(); await p.setViewport({ width: larg, height: 700, isMobile: true, hasTouch: true }); await propre(p); await p.goto(base + 'explorer.html', { waitUntil: 'load' }); await attendre(700);
    const r = await p.evaluate(() => { const d = id => { const b = document.getElementById(id).getBoundingClientRect(); return { visible: b.width > 0, droite: Math.round(b.right) }; }; const m = document.getElementById('siteMenuBtn'); return { largeur: innerWidth, document: document.documentElement.scrollWidth, affichage: d('confortBtn'), menu: d('siteMenuBtn'), menuTexte: m.textContent.trim() }; });
    ok(`explorateur, en-tête à ${larg} px : « Affichage » et « Menu » (avec son mot) sont entièrement dans l'écran`, r.affichage.visible && r.menu.visible && /Menu/.test(r.menuTexte) && r.affichage.droite <= r.largeur && r.menu.droite <= r.largeur && r.document <= r.largeur, JSON.stringify(r)); await p.close(); }
  console.log(echecs ? `\n${echecs} ECHEC(S) sur ${total}` : `\nTout est OK (${total} mesures)`); await nav.close(); srv.close(); process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
