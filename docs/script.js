// Les grands nombres en police grasse : l'espace fine insécable du français est presque invisible (« 1371000 »).
// On la remplace par une espace insécable ordinaire, bien lisible, pour tous les nombres affichés par le site.
if (!window.__espaceLisible) {
  window.__espaceLisible = true;
  const toLocaleStringOriginal = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (...a) { const s = toLocaleStringOriginal.apply(this, a); return typeof s === 'string' ? s.replace(/\u202f/g, '\u00a0') : s; };
}

const communes = COMMUNES_DATA;


// ---------- carte à bulles : un point par commune ----------
// Projection validée sur les données : 537 des 551 communes localisées tombent dans leur région
// (les autres sont côtières ou frontalières, que le tracé simplifié des régions coupe).
function projeterCommune(c) { return [20 + (c.lon + 17.536) * 61.7, 20 + (16.691 - c.lat) * 61.7]; }
function rayonCommune(c) { return 0.9 + Math.sqrt(c.p) / 220; }
// Part des postes nécessaires qui manquent : indépendante de la taille de la commune.
// (Le nombre absolu donnerait une carte presque toute verte : 3 communes au-dessus de 15 postes manquants.)
function partManquante(c) { const m = vue === 'bassin' ? (c.dpb || 0) : c.dp; return c.bp > 0 ? m / c.bp : 0; }
function couleurCommune(c) {
  if (mode === 'education') {
    const k = classeEducation(c);
    return k === 'haute' ? 'var(--edu-hi)' : k === 'basse' ? 'var(--edu-lo)' : k === 'moyenne' ? 'var(--edu-mid)' : 'var(--ink-soft)';
  }
  const p = partManquante(c);
  return p >= 0.5 ? 'var(--clay)' : p >= 0.2 ? 'var(--gold)' : 'var(--bas)';
}
function infobulleCommune(c) {
  if (mode === 'education') return `${c.n} (${c.d}) : ${c.ne} ${mot(c.ne, 'établissement', 'établissements')} pour ${c.p.toLocaleString('fr-FR')} habitants`;
  const m = vue === 'bassin' ? Math.round(c.dpb || 0) : c.dp;
  return `${c.n} (${c.d}) : ${m} ${mot(m, 'poste manquant', 'postes manquants')} sur ${c.bp} requis${vue === 'bassin' ? ' (vue bassin)' : ''}`;
}

// Sur un écran étroit la carte est réduite : les points grossissent un peu pour rester visibles.
function ajusterRayonsCommunes() {
  const svg = document.getElementById('mapSvg'), largeur = svg ? svg.getBoundingClientRect().width : 0;
  const z = niveauZoom();
  // jusqu'à ×3 les points grossissent moins vite que la carte ; au-delà, ils gardent à peu près la même taille à l'écran : les communes voisines se séparent de plus en plus, comme les repères d'une carte routière
  const facteurZoom = z <= 3 ? Math.pow(z, -0.55) : Math.pow(3, -0.55) * Math.pow(z / 3, -0.95);
  const k = (largeur > 0 ? Math.min(1.7, Math.max(1, 600 / largeur)) : 1) * facteurZoom;
  document.querySelectorAll('#mapSvg circle.commune-dot, #mapSvg circle#reperCommune').forEach(p => p.setAttribute('r', (parseFloat(p.dataset.r) * k).toFixed(2)));
}
window.addEventListener('resize', ajusterRayonsCommunes);

// ---------- zoom et déplacement de la carte ----------
// Zoomer = réduire la fenêtre d'affichage (viewBox) ; déplacer = la décaler. Le clic « près d'un point » ci-dessous lit déjà le
// viewBox : il reste donc juste à tous les niveaux de zoom. Les noms apparaissent par niveaux : régions, départements, communes.
const VUE_BASE = [0, 10, 420, 295];
const ZOOM_MAX = 60;   // assez pour séparer les communes les plus serrées (Dakar : certaines sont à moins de 2 km)
const vueCarte = { x: VUE_BASE[0], y: VUE_BASE[1], w: VUE_BASE[2], h: VUE_BASE[3] };
function niveauZoom() { return VUE_BASE[2] / vueCarte.w; }
function echelleCarte() {   // pixels d'écran par unité de la carte
  const svg = document.getElementById('mapSvg'), r = svg ? svg.getBoundingClientRect() : null;
  return r && r.width > 0 && r.height > 0 ? Math.min(r.width / vueCarte.w, r.height / vueCarte.h) : 2.2 * niveauZoom();
}
function pointCarte(clientX, clientY) {
  const svg = document.getElementById('mapSvg'), r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const s = Math.min(r.width / vueCarte.w, r.height / vueCarte.h);
  return { x: vueCarte.x + (clientX - r.left - (r.width - vueCarte.w * s) / 2) / s, y: vueCarte.y + (clientY - r.top - (r.height - vueCarte.h * s) / 2) / s, s };
}
function bornerVue(v) {   // la carte ne sort pas de l'écran : le centre reste dans le pays, avec un peu de marge
  const mx = VUE_BASE[2] * 0.08, my = VUE_BASE[3] * 0.08;
  v.x = v.w >= VUE_BASE[2] ? VUE_BASE[0] : Math.min(Math.max(v.x, VUE_BASE[0] - mx), VUE_BASE[0] + VUE_BASE[2] + mx - v.w);
  v.y = v.h >= VUE_BASE[3] ? VUE_BASE[1] : Math.min(Math.max(v.y, VUE_BASE[1] - my), VUE_BASE[1] + VUE_BASE[3] + my - v.h);
  return v;
}
let majVueDemandee = false;
function appliquerVue() {
  const svg = document.getElementById('mapSvg');
  svg.setAttribute('viewBox', `${vueCarte.x.toFixed(2)} ${vueCarte.y.toFixed(2)} ${vueCarte.w.toFixed(2)} ${vueCarte.h.toFixed(2)}`);
  svg.style.setProperty('--z', niveauZoom().toFixed(3));
  document.getElementById('zoomPlus').disabled = niveauZoom() >= ZOOM_MAX - 0.01;
  document.getElementById('zoomMoins').disabled = document.getElementById('zoomTout').disabled = niveauZoom() <= 1.001;
  ajusterRayonsCommunes();
  const maj = () => { majVueDemandee = false; etiquettesZoom(); };
  if (typeof requestAnimationFrame === 'function') { if (!majVueDemandee) { majVueDemandee = true; requestAnimationFrame(maj); } } else maj();
}
function vueAutour(facteur, cx, cy) {   // nouvelle fenêtre : on zoome de `facteur` en gardant (cx, cy) immobile
  const w = Math.min(VUE_BASE[2], Math.max(VUE_BASE[2] / ZOOM_MAX, vueCarte.w / facteur)), h = w * VUE_BASE[3] / VUE_BASE[2];
  const ratio = w / vueCarte.w;
  return bornerVue({ x: cx - (cx - vueCarte.x) * ratio, y: cy - (cy - vueCarte.y) * ratio, w, h });
}
function zoomerA(facteur, cx, cy) {
  if (cx === undefined) { cx = vueCarte.x + vueCarte.w / 2; cy = vueCarte.y + vueCarte.h / 2; }
  Object.assign(vueCarte, vueAutour(facteur, cx, cy)); appliquerVue();
}
let animationVue = 0;
function allerA(cible, duree = 380) {   // glissement doux vers une fenêtre ; sans animation si le navigateur n'en a pas
  const c = bornerVue(Object.assign({}, cible)), d = Object.assign({}, vueCarte);
  if (!duree || typeof requestAnimationFrame !== 'function') { Object.assign(vueCarte, c); appliquerVue(); return; }
  const t0 = performance.now(), id = ++animationVue;
  const pas = t => {
    if (id !== animationVue) return;
    const p = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - p, 3);
    ['x', 'y', 'w', 'h'].forEach(k => { vueCarte[k] = d[k] + (c[k] - d[k]) * e; });
    appliquerVue(); if (p < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}
function reinitialiserVue(duree) { allerA({ x: VUE_BASE[0], y: VUE_BASE[1], w: VUE_BASE[2], h: VUE_BASE[3] }, duree); }
const cleRegionDe = c => c.r.toUpperCase().replace(/ /g, '_');
function zoomerSurPoints(pts, duree, zoomMin = 1.3) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  const w = Math.min(VUE_BASE[2], Math.max(bw * 1.35, bh * 1.35 * VUE_BASE[2] / VUE_BASE[3], VUE_BASE[2] / ZOOM_MAX * 2)), h = w * VUE_BASE[3] / VUE_BASE[2];
  allerA({ x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, w, h }, duree);
}
function zoomerSurRegion(cle, duree) {
  const pts = communes.filter(c => c.lat !== null && c.lat !== undefined && cleRegionDe(c) === cle).map(projeterCommune);
  if (pts.length) zoomerSurPoints(pts, duree);
}
function zoomerSurCommune(c, duree) {
  if (!c || c.lat === null || c.lat === undefined) return;
  const [x, y] = projeterCommune(c), w = VUE_BASE[2] / 6, h = w * VUE_BASE[3] / VUE_BASE[2];
  allerA({ x: x - w / 2, y: y - h / 2, w, h }, duree);
}

// Zoom automatique au clic sur une commune : assez près pour que sa voisine la plus proche soit à ~28 px, sans jamais dézoomer.
function zoomerSurCommuneProche(c, duree = 600) {
  if (!c || c.lat === null || c.lat === undefined) return;
  const [x, y] = projeterCommune(c); let plusProche = Infinity;
  communes.forEach(o => { if (o !== c && o.lat !== null && o.lat !== undefined) { const [ox, oy] = projeterCommune(o), d = Math.hypot(ox - x, oy - y); if (d < plusProche) plusProche = d; } });
  const pxBase = echelleCarte() / niveauZoom();   // pixels par unité de carte quand on voit tout le pays
  const cible = isFinite(plusProche) && plusProche > 0 ? 28 / (plusProche * pxBase) : 6;
  const z = Math.max(niveauZoom(), Math.min(ZOOM_MAX, Math.max(6, cible)));
  const w = VUE_BASE[2] / z, h = w * VUE_BASE[3] / VUE_BASE[2];
  const yCentre = y + (window.innerWidth < 900 ? 0.22 * h : 0);   // sur téléphone la fiche occupe le bas : la commune est placée dans la moitié haute
  allerA({ x: x - w / 2, y: yCentre - h / 2, w, h }, duree);
}

// noms par niveaux : régions de loin, départements en s'approchant, communes de près (les plus peuplées d'abord, sans chevauchement)
let CENTRES_DEPARTEMENTS = null;
function centresDepartements() {
  if (CENTRES_DEPARTEMENTS) return CENTRES_DEPARTEMENTS;
  const m = new Map();
  communes.filter(c => c.lat !== null && c.lat !== undefined).forEach(c => {
    const cle = c.r + '|' + c.d, [x, y] = projeterCommune(c), a = m.get(cle) || { nom: c.d, sx: 0, sy: 0, k: 0, pop: 0 };
    a.sx += x; a.sy += y; a.k++; a.pop += c.p; m.set(cle, a);
  });
  return CENTRES_DEPARTEMENTS = [...m.values()].map(a => ({ nom: a.nom, x: a.sx / a.k, y: a.sy / a.k, pop: a.pop }));
}
function placerNoms(candidats, px, groupe, classe, boites) {
  const s = echelleCarte(), pris = boites.slice(), pose = [];
  candidats.forEach(c => {
    const lx = (c.x - vueCarte.x) * s, ly = (c.y - vueCarte.y) * s, largeur = c.nom.length * px * 0.55 + 4, hauteur = px * 1.25;
    const ox = c.dx ? lx + c.dx * s : lx - largeur / 2;   // un nom centré s'étend de part et d'autre du point ; un nom décalé part du point
    const b = { x0: ox, y0: ly - hauteur / 2, x1: ox + largeur, y1: ly + hauteur / 2 };
    if (b.x0 < -4 || b.y0 < -4 || b.x1 > 4000 || pris.some(o => b.x0 < o.x1 + 2 && b.x1 > o.x0 - 2 && b.y0 < o.y1 + 1 && b.y1 > o.y0 - 1)) return;
    pris.push(b); pose.push(b);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('class', classe); t.setAttribute('x', (c.x + (c.dx || 0)).toFixed(2)); t.setAttribute('y', (c.y + px * 0.35 / s).toFixed(2));
    t.setAttribute('font-size', (px / s).toFixed(3)); t.setAttribute('stroke-width', (3 / s).toFixed(3));
    if (c.dx) t.setAttribute('text-anchor', 'start'); else t.setAttribute('text-anchor', 'middle');
    t.textContent = c.nom; groupe.appendChild(t);
  });
  return pris;
}
function etiquettesZoom() {
  const svg = document.getElementById('mapSvg'), layer = document.getElementById('regionLayer');
  if (!svg || !layer) return;
  const ancien = document.getElementById('zoomLabels'); if (ancien) ancien.remove();
  const z = niveauZoom();
  svg.classList.toggle('z-pays', z < 1.7); svg.classList.toggle('z-region', z >= 1.7 && z < 3.2); svg.classList.toggle('z-fin', z >= 3.2);
  svg.dataset.z = z.toFixed(2);
  if (carte !== 'communes') return;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('id', 'zoomLabels'); g.setAttribute('pointer-events', 'none');
  layer.appendChild(g);
  const dansFenetre = (x, y) => x >= vueCarte.x - 2 && x <= vueCarte.x + vueCarte.w + 2 && y >= vueCarte.y - 2 && y <= vueCarte.y + vueCarte.h + 2;
  let boites = [];
  if (z >= 1.7 && z < 4.6) {
    const deps = centresDepartements().filter(d => dansFenetre(d.x, d.y)).sort((a, b) => b.pop - a.pop);
    boites = placerNoms(deps, 11.5, g, 'dept-label', boites);
  }
  if (z >= 2.8) {
    const quota = Math.min(90, Math.round(8 * Math.pow(z, 1.45)));
    const cs = communes.map(c => ({ c })).filter(o => o.c.lat !== null && o.c.lat !== undefined).map(o => { const [x, y] = projeterCommune(o.c); return { nom: o.c.n, x, y, pop: o.c.p }; })
      .filter(o => dansFenetre(o.x, o.y)).sort((a, b) => b.pop - a.pop).slice(0, quota * 3);
    const s = echelleCarte();
    cs.forEach(o => { o.dx = (rayonCommune({ p: o.pop }) * Math.pow(z, -0.55) + 1.2) + 2 / s; });
    // on réserve la place des points : un nom ne doit pas cacher un autre point proche
    const nb = placerNoms(cs.slice(0, 400), 10.5, g, 'commune-label', boites);
    const nom = g.querySelectorAll('.commune-label'); for (let i = quota; i < nom.length; i++) nom[i].remove();
  }
}

(function brancherZoom() {
  const svg = document.getElementById('mapSvg');
  svg.addEventListener('wheel', e => { e.preventDefault(); const p = pointCarte(e.clientX, e.clientY); if (p) zoomerA(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y); }, { passive: false });
  const doigts = new Map(); let glisse = null, pince = null, aDeplace = false;
  const distance = () => { const [a, b] = [...doigts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const milieu = () => { const [a, b] = [...doigts.values()]; return [(a.x + b.x) / 2, (a.y + b.y) / 2]; };
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    doigts.set((e.pointerId != null ? e.pointerId : 1), { x: e.clientX, y: e.clientY });
    if (doigts.size === 1) { glisse = { x: e.clientX, y: e.clientY, vx: vueCarte.x, vy: vueCarte.y }; aDeplace = false; }
    else if (doigts.size === 2) { const [mx, my] = milieu(); pince = { d: distance(), w: vueCarte.w, p: pointCarte(mx, my) }; aDeplace = true; glisse = null; }
  });
  window.addEventListener('pointermove', e => {
    const id = (e.pointerId != null ? e.pointerId : 1); if (!doigts.has(id)) return;
    doigts.set(id, { x: e.clientX, y: e.clientY });
    if (doigts.size === 2 && pince && pince.p) {
      const f = distance() / pince.d, w = Math.min(VUE_BASE[2], Math.max(VUE_BASE[2] / ZOOM_MAX, pince.w / f)), h = w * VUE_BASE[3] / VUE_BASE[2];
      const [mx, my] = milieu(), r = svg.getBoundingClientRect(), s = Math.min(r.width / w, r.height / h);
      Object.assign(vueCarte, bornerVue({ x: pince.p.x - (mx - r.left - (r.width - w * s) / 2) / s, y: pince.p.y - (my - r.top - (r.height - h * s) / 2) / s, w, h })); appliquerVue();
    } else if (doigts.size === 1 && glisse) {
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (!aDeplace && Math.hypot(dx, dy) < 6) return;
      aDeplace = true; svg.classList.add('glisse');
      const s = echelleCarte();
      vueCarte.x = glisse.vx - dx / s; vueCarte.y = glisse.vy - dy / s; bornerVue(vueCarte); appliquerVue();
    }
  });
  const lacher = e => {
    doigts.delete((e.pointerId != null ? e.pointerId : 1)); svg.classList.remove('glisse');
    if (doigts.size === 1) { const [d] = [...doigts.values()]; glisse = { x: d.x, y: d.y, vx: vueCarte.x, vy: vueCarte.y }; pince = null; }
    if (doigts.size === 0) { glisse = null; pince = null; setTimeout(() => { aDeplace = false; }, 0); }
  };
  window.addEventListener('pointerup', lacher); window.addEventListener('pointercancel', lacher);
  // un geste de déplacement ne doit pas ouvrir une fiche : ce garde est posé AVANT celui du clic « près d'un point »
  svg.addEventListener('click', e => { if (aDeplace) { e.stopPropagation(); e.preventDefault(); aDeplace = false; } }, true);
  document.getElementById('zoomPlus').addEventListener('click', () => zoomerA(1.7));
  document.getElementById('zoomMoins').addEventListener('click', () => zoomerA(1 / 1.7));
  document.getElementById('zoomTout').addEventListener('click', () => reinitialiserVue());
  window.addEventListener('resize', () => appliquerVue());
})();

// Un point de deux pixels est presque impossible à toucher au doigt : un clic près d'un point ouvre la commune la plus proche.
document.getElementById('mapSvg').addEventListener('click', e => {
  const svg = document.getElementById('mapSvg'), r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  const s = Math.min(r.width / vw, r.height / vh);
  const x = vx + (e.clientX - r.left - (r.width - vw * s) / 2) / s, y = vy + (e.clientY - r.top - (r.height - vh * s) / 2) / s;
  let meilleur = null, dmin = (14 / s) ** 2;
  svg.querySelectorAll('circle.commune-dot').forEach(p => { const d = (p.getAttribute('cx') - x) ** 2 + (p.getAttribute('cy') - y) ** 2; if (d < dmin) { dmin = d; meilleur = p; } });
  if (meilleur) { e.stopPropagation(); openCommune(communes[+meilleur.dataset.i]); }
}, true);

// ---------- render region markers ----------
function renderRegions() {
  const layer = document.getElementById('regionLayer');
  layer.innerHTML = '';
  Object.entries(regionPoints).forEach(([key, r]) => {
    const shape = regionShapes[key];
    if (!shape) return;
    const rate = regionRate(r, mode, vue);
    const color = severityColor(rate, mode);
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('class','region-shape');
    path.setAttribute('d', shape.d);
    path.setAttribute('fill', color);
    path.setAttribute('fill-opacity', '0.82');
    if (carte === 'communes') { path.style.fill = 'var(--land)'; path.style.fillOpacity = '1'; path.setAttribute('class', 'region-shape neutre'); }   // fond neutre : les points portent l'information
    path.setAttribute('tabindex','0');
    path.setAttribute('role','button');
    path.setAttribute('aria-label', `${r.label}, ${r.nbCommunes} communes, ${r.pop.toLocaleString('fr-FR')} habitants`);
    path.dataset.key = key;
    path.addEventListener('click', () => openRegion(key));
    path.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); openRegion(key); } });
    layer.appendChild(path);
  });

  // Un point par commune, dessiné par-dessus les régions et sous les noms : les plus peuplées d'abord,
  // les petites par-dessus, pour qu'aucune ne soit cachée.
  if (carte === 'communes') {
    const groupe = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    groupe.setAttribute('id', 'communeDots');
    communes.map((c, i) => [c, i]).filter(([c]) => c.lat !== null && c.lat !== undefined).sort((a, b) => b[0].p - a[0].p).forEach(([c, i]) => {
      const [x, y] = projeterCommune(c);
      const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      point.setAttribute('class', 'commune-dot');
      point.setAttribute('cx', x.toFixed(2)); point.setAttribute('cy', y.toFixed(2)); point.dataset.r = rayonCommune(c).toFixed(2); point.dataset.i = i; point.setAttribute('r', point.dataset.r);
      point.style.fill = couleurCommune(c);
      const titre = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titre.textContent = infobulleCommune(c);
      point.appendChild(titre);
      point.addEventListener('click', () => openCommune(communes[i]));
      groupe.appendChild(point);
    });
    layer.appendChild(groupe);
    ajusterRayonsCommunes();
  }

  // Les noms sont dessinés APRES toutes les régions, pour qu'une région voisine ne
  // les recouvre jamais. Les petites régions (Dakar, Thiès, Fatick, Kaolack) ont leur
  // nom déplacé vers la mer ou une zone libre, relié par un trait fin.
  Object.entries(regionPoints).forEach(([key, r]) => {
    const shape = regionShapes[key];
    if (!shape) return;
    const pos = LABEL_POSITIONS[key] || { x: shape.cx, y: shape.cy };
    if (pos.leader) {
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('class','region-leader');
      line.setAttribute('x1', pos.leader[0]); line.setAttribute('y1', pos.leader[1]);
      line.setAttribute('x2', pos.leader[2]); line.setAttribute('y2', pos.leader[3]);
      layer.appendChild(line);
    }
    if (pos.dot) {
      const point = document.createElementNS('http://www.w3.org/2000/svg','circle');
      point.setAttribute('class','region-leader-dot');
      point.setAttribute('cx', pos.dot[0]); point.setAttribute('cy', pos.dot[1]); point.setAttribute('r', 1.8);
      layer.appendChild(point);
    }
    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('class','region-centroid-label');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y);
    label.textContent = r.label;
    label.style.pointerEvents = 'none';
    layer.appendChild(label);
  });
  etiquettesZoom();
  renderLegend();
}

// Positions d'étiquettes différentes du centre géométrique (coordonnées de la carte, 420 x 400)
const LABEL_POSITIONS = {
  DAKAR:  { x: 27,  y: 168, leader: [33, 148, 29, 160], dot: [33, 148] },
  THIES:  { x: 22,  y: 106, leader: [36, 107, 58, 122], dot: [58, 122] },
  FATICK: { x: 82,  y: 174 },
  KAOLACK:{ x: 121, y: 200 },
};

const regionPoints = {
  "DAKAR": { label:"Dakar", x:31.0, y:137.6 },
  "THIES": { label:"Thiès", x:62.5, y:131.5 },
  "DIOURBEL": { label:"Diourbel", x:105.9, y:139.9 },
  "FATICK": { label:"Fatick", x:94.9, y:159.4 },
  "KAOLACK": { label:"Kaolack", x:115.8, y:171.0 },
  "KAFFRINE": { label:"Kaffrine", x:148.1, y:173.8 },
  "KEDOUGOU": { label:"Kédougou", x:356.4, y:269.5 },
  "KOLDA": { label:"Kolda", x:185.6, y:248.6 },
  "LOUGA": { label:"Louga", x:106.5, y:80.5 },
  "MATAM": { label:"Matam", x:289.7, y:78.2 },
  "SAINT_LOUIS": { label:"Saint-Louis", x:90.1, y:55.8 },
  "SEDHIOU": { label:"Sédhiou", x:147.6, y:260.1 },
  "TAMBACOUNDA": { label:"Tambacounda", x:264.3, y:194.5 },
  "ZIGUINCHOR": { label:"Ziguinchor", x:103.4, y:268.8 },
};

// Les chiffres (population, déficits, nombre de communes...) viennent de data.js (REGION_STATS),
// généré par code/08_generer_donnees_maquette.py : rien n'est recopié à la main.
Object.keys(regionPoints).forEach(k => Object.assign(regionPoints[k], REGION_STATS[k]));

let mode = 'sante'; // 'sante' | 'education'
let vue = 'communale'; // 'communale' | 'bassin' (uniquement pertinent en mode sante)
let carte = 'communes'; // 'communes' (un point par commune) | 'regions'

// ---------- helpers ----------
function severityColor(rate, m) {
  if (m === 'education') {
    // rate = habitants pour 1000 par établissement d'éducation recensé (plus haut = plus tendu)
    if (rate > 23) return 'var(--edu-hi)';
    if (rate > 12) return 'var(--edu-mid)';
    return 'var(--edu-lo)';
  }
  // rate = déficit santé pour 100k habitants (seuils recalibrés après la correction
  // de granularité - le déficit régional ne compte plus que les postes, des valeurs
  // bien plus basses qu'avant, quand centres et hôpitaux y étaient encore inclus)
  if (rate > 4) return 'var(--clay)';
  if (rate > 2.2) return 'var(--gold)';
  return 'var(--teal)';
}

function regionRate(r, m, v) {
  if (m === 'education') {
    return r.nbEduc > 0 ? (r.pop / r.nbEduc) / 1000 : 999;
  }
  const deficit = (v === 'bassin') ? r.deficitBassin : r.deficitPoste;
  return r.pop > 0 ? (deficit / r.pop) * 100000 : 0;
}

function dansUnApercu() { try { return window.self !== window.top; } catch (e) { return true; } }

// Quand la page est affichée dans un aperçu intégré, le navigateur bloque les téléchargements :
// on propose alors le contenu à copier plutôt qu'un bouton qui échoue.
function proposerCSV(nomFichier, contenu) {
  document.getElementById('cardBody').innerHTML = `
    <div class="card-eyebrow">Export CSV</div>
    <h2 class="card-title">${nomFichier}</h2>
    <div class="provenance" style="margin-bottom:10px;">Le téléchargement direct est bloqué quand la page est affichée dans un aperçu intégré. Copiez le contenu ci-dessous et collez-le dans un fichier « ${nomFichier} » (Bloc-notes). Sur la page publiée ou en ouvrant le fichier index.html seul, le bouton télécharge directement.</div>
    <textarea id="csvTexte" class="csv-texte" readonly></textarea>
    <div class="actions">
      <button class="primary" id="csvCopier">Copier le contenu</button>
      <button class="secondary" onclick="fermerFiche()">Fermer</button>
    </div>`;
  const zone = document.getElementById('csvTexte');
  zone.value = contenu.replace('\ufeff', '');
  document.getElementById('csvCopier').addEventListener('click', (e) => {
    zone.focus(); zone.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    e.target.textContent = ok ? 'Copié' : 'Sélectionné : faites Ctrl+C';
  });
  document.getElementById('card').classList.add('active');
}

function telechargerCSV(nomFichier, entetes, lignes) {
  const esc = v => { const t = (v === null || v === undefined) ? '' : String(v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const contenu = '\ufeff' + [entetes.join(';')].concat(lignes.map(l => l.map(esc).join(';'))).join('\r\n');
  if (dansUnApercu()) { proposerCSV(nomFichier, contenu); return; }
  const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nomFichier;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Export à la française : séparateur ";" et virgule décimale, pour que les nombres soient lus comme des nombres
// dans un Excel réglé en français. (Les fichiers de donnees/ gardent le point décimal, plus adapté au code.)
const nombreFR = x => (x === null || x === undefined) ? '' : String(x).replace('.', ',');
const ENTETES_COMMUNES = ['region','departement','commune','population','postes_existants','postes_requis','deficit_postes_commune','deficit_postes_vue_bassin','centres_manquants_departement','hopitaux_manquants_departement','centres_ou_hopitaux_commune','etablissements_secondaires','campus_universites_publiques','espaces_numeriques_unchk','deficit_postes_2033_indicatif','score_combine_sante_education','donnees_confirmees','croissance_mesuree','hopital_le_plus_proche','distance_hopital_km','latitude','longitude','sources','norme_postes'];
const ligneCommune = c => {
  const v = x => (x === null || x === undefined) ? '' : x;
  return [c.r, c.d, c.n, c.p, c.np, c.bp, c.dp, nombreFR(c.dpb), c.dcd, c.dhd, c.ns, c.ne, c.nu, c.nv, v(c.dp33), nombreFR(c.sc), c.fb ? 'oui' : 'non', c.tm ? 'oui' : 'non', v(c.hp), v(c.hk), nombreFR(c.lat), nombreFR(c.lon), 'RGPH-5 2023 (ANSD) et Géo Sénégal 2023', '1 poste pour 10 000 habitants'];
};
const slug = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function exporterListeCSV(nomFichier, liste) { telechargerCSV(nomFichier, ENTETES_COMMUNES, liste.map(ligneCommune)); }
// Trois exports, trois portées : tout le pays (légende), une région (fiche région), une commune (fiche commune).
function exporterDonneesCSV() { exporterListeCSV('jappale_senegal_communes.csv', communes); }
function exporterRegionCSV(cle) { exporterListeCSV(`jappale_region_${slug(cle.replace(/_/g, ' '))}.csv`, communes.filter(c => cleRegion(c.r) === cle)); }
function exporterCommuneCSV(i) { const c = communes[i]; exporterListeCSV(`jappale_${slug(c.n)}_${slug(c.d)}.csv`, [c]); }

let legendeOuverte = false;
function basculerLegende() { legendeOuverte = !legendeOuverte; renderLegend(); }

function renderLegend() {
  renderLegendTexte();
}

function renderLegendTexte() {
  let titre, lignes, notes = [];
  if (carte === 'communes') {
    const sansPosition = communes.filter(c => c.lat === null || c.lat === undefined).length;
    if (mode === 'education') {
      titre = 'Habitants par établissement secondaire';
      lignes = [['edu-hi', 'Parmi les plus tendues'], ['edu-mid', 'Situation intermédiaire'], ['edu-lo', 'Parmi les moins tendues']];
    } else {
      titre = vue === 'bassin' ? 'Part des postes nécessaires qui manquent (vue bassin)' : 'Part des postes nécessaires qui manquent';
      lignes = [['clay', 'La moitié ou plus'], ['gold', 'Entre un cinquième et la moitié'], ['bas', "Moins d'un cinquième"]];
      if (vue === 'bassin') notes.push("Vue bassin : les postes sont partagés avec les communes à moins de 15 km (à vol d'oiseau). Repassez en vue commune : des points changent de couleur.");
    }
    notes.unshift(`Un point = une commune, sa taille suit la population. Cliquez sur un point pour sa fiche. Zoomez (molette, deux doigts ou boutons) : les noms des départements puis des communes apparaissent.${sansPosition ? ` ${sansPosition} communes sans position ne sont pas dessinées.` : ''}`);
  } else if (mode === 'education') {
    titre = 'Habitants par établissement secondaire';
    lignes = [['edu-hi', 'Parmi les plus tendues'], ['edu-mid', 'Situation intermédiaire'], ['edu-lo', 'Parmi les moins tendues']];
    notes.push('Classement relatif entre régions');
  } else {
    titre = vue === 'bassin' ? 'Postes de santé manquants (vue bassin)' : 'Postes de santé manquants pour 100 000 habitants';
    lignes = [['clay', 'Parmi les plus touchées'], ['gold', 'Situation intermédiaire'], ['teal', 'Parmi les moins touchées']];
    notes.push('Classement relatif entre régions');
    if (vue === 'bassin') notes.push("Vue bassin : la commune et ses voisines à moins de 15 km (à vol d'oiseau) partagent leurs postes. À l'échelle des régions, les totaux changent peu : la différence se lit commune par commune (recherche).");
  }
  const reperes = [
    carte === 'communes' ? 'Communes : un point par commune.' : 'Régions : les 14 régions, comparées entre elles.',
    mode === 'education' ? 'Éducation : habitants par collège ou lycée. Un constat, pas un déficit.' : 'Santé : postes de santé manquants par rapport à la norme.',
    mode === 'education' ? 'Vue bassin : disponible en santé seulement.' : (vue === 'bassin' ? 'Vue bassin : une commune et ses voisines à moins de 15 km se partagent leurs postes de santé.' : 'Vue commune : chaque commune est comptée avec ses seuls postes de santé.')
  ];
  const el = document.getElementById('legend');
  el.innerHTML = `<button class="legend-toggle" onclick="basculerLegende()" aria-expanded="${legendeOuverte}">Légende</button>
    <div class="legend-body">
      <div class="legend-title">${titre}</div>
      ${lignes.map(([couleur, texte]) => `<div><span class="sw" style="background:var(--${couleur})"></span>${texte}</div>`).join('')}
      ${notes.map(n => `<div class="legend-note" style="max-width:240px;">${n}</div>`).join('')}
      <div class="legend-sub">Ce que vous voyez</div>
      ${reperes.map(n => `<div class="legend-note" style="max-width:240px;">${n}</div>`).join('')}
    </div>`;
  el.classList.toggle('open', legendeOuverte);
}

// ---------- card ----------
function openRegion(key) {
  const r = regionPoints[key];
  const rate = regionRate(r, mode, vue).toFixed(1);
  const color = severityColor(regionRate(r, mode, vue), mode);
  if (mode === 'education') {
    document.getElementById('cardBody').innerHTML = `
      <div class="card-eyebrow">Région</div>
      <h2 class="card-title">${r.label}</h2>
      <div class="card-badge" style="--c:${color}">${r.nbCommunes} communes analysées</div>

      <div class="stat-block">
        <div class="stat-head">Établissements d'éducation secondaire recensés (collèges et lycées, publics et privés)</div>
        <div class="stat-main"><span class="num">${r.nbEduc}</span><span class="unit">établissements, région entière</span></div>
        <div class="stat-sub">
          <div><span class="lab">Population</span><span class="val">${(r.pop/1000000).toFixed(2)}M</span></div>
          <div><span class="lab">Hab. / 1000 par étab.</span><span class="val">${rate}</span></div>
          <div><span class="lab">Déficit santé</span><span class="val">${r.deficitPoste}</span></div>
        </div>
      </div>
      <div class="provenance">Enseignement supérieur public, présenté à part : ${r.nbUniv} ${mot(r.nbUniv, 'campus', 'campus')} d'université et ${r.nbEno} ${mot(r.nbEno, 'espace numérique', 'espaces numériques')} (Université numérique Cheikh Hamidou Kane).</div>
      ${fiabiliteRegion(r)}
      <div class="provenance">Tapez le nom d'une commune de cette région dans la recherche en haut pour voir son détail individuel.</div>
      <div class="actions">
        <button class="primary" onclick="document.getElementById('card').classList.remove('active'); zoomerSurRegion('${key}')">Zoomer sur la région</button>
        <button class="secondary" onclick="document.getElementById('searchInput').focus()">Chercher une commune ici</button>
        <button class="secondary" onclick="exporterRegionCSV('${key}')">Télécharger les ${r.nbCommunes} communes (CSV)</button>
      </div>
    `;
    document.getElementById('card').classList.add('active');
    return;
  }
  document.getElementById('cardBody').innerHTML = `
    <div class="card-eyebrow">Région</div>
    <h2 class="card-title">${r.label}</h2>
    <div class="card-badge" style="--c:${color}">${r.nbCommunes} communes analysées</div>

    <div class="stat-block">
      <div class="stat-head">${vue === 'bassin' ? "Déficit une fois les postes des communes voisines pris en compte (15 km)" : "Déficit de postes de santé (normes OMS/ANSD), cumulé sur la région"}</div>
      <div class="stat-main"><span class="num">${vue === 'bassin' ? Math.round(r.deficitBassin) : r.deficitPoste}</span><span class="unit">postes manquants, région entière</span></div>
      <div class="stat-sub">
        <div><span class="lab">Population</span><span class="val">${(r.pop/1000000).toFixed(2)}M</span></div>
        <div><span class="lab">Déficit / 100k hab.</span><span class="val">${rate}</span></div>
        <div><span class="lab">Structures éducation</span><span class="val">${r.nbEduc}</span></div>
      </div>
    </div>
    <div class="provenance">${vue === 'bassin' ? "Vue bassin : la capacité de chaque poste de santé est partagée entre toutes les communes à moins de 15 km qui s'appuient dessus - une zone dense n'est pas automatiquement mieux desservie si plusieurs communes se disputent les mêmes postes. Inspiré de l'indicateur APL utilisé en France pour mesurer l'accès réel aux soins." : "Les centres de santé et hôpitaux desservent un bassin de plusieurs communes ; leur déficit est calculé au niveau département et s'affiche dans la fiche de chaque commune."}</div>

    ${fiabiliteRegion(r)}
      <div class="provenance">Tapez le nom d'une commune de cette région dans la recherche en haut pour voir son détail individuel - les ${communes.length} communes du pays sont dans la base.</div>
    <div class="actions">
      <button class="primary" onclick="document.getElementById('card').classList.remove('active'); zoomerSurRegion('${key}')">Zoomer sur la région</button>
      <button class="secondary" onclick="document.getElementById('searchInput').focus()">Chercher une commune ici</button>
      <button class="secondary" onclick="exporterRegionCSV('${key}')">Télécharger les ${r.nbCommunes} communes (CSV)</button>
    </div>
  `;
  document.getElementById('card').classList.add('active');
}

const mot = (n, s, p) => (Math.abs(n) > 1 ? p : s);
const cleRegion = nom => nom.toUpperCase().replace(/ /g, '_');

// Noms portés par plusieurs communes (ex. Medina Gounass) : toujours précisés avec le département.
const nomsEnDouble = (() => { const k = {}; communes.forEach(x => { k[x.n] = (k[x.n] || 0) + 1; }); return new Set(Object.keys(k).filter(n => k[n] > 1)); })();
const nomUnique = c => nomsEnDouble.has(c.n) ? `${c.n} (${c.d})` : c.n;

// Repères pour l'éducation : rang de la commune parmi les communes à données vérifiées (même mesure que le score combiné).
const refEducation = (() => {
  const tension = communes.filter(c => c.fb === 1).map(c => c.p / (c.ne + 1)).sort((a, b) => a - b);
  const ratios = communes.filter(c => c.ne > 0).map(c => c.p / c.ne).sort((a, b) => a - b);
  return { tension, mediane: ratios[Math.floor(ratios.length / 2)] };
})();
function classeEducation(c) {
  if (c.fb !== 1) return null;
  const x = c.p / (c.ne + 1);
  const rang = refEducation.tension.filter(y => y < x).length / (refEducation.tension.length - 1) * 100;
  return rang >= 67 ? 'haute' : rang <= 33 ? 'basse' : 'moyenne';
}

function fiabiliteHTML(c) {
  const ok = c.fb === 1, mesure = c.tm === 1;
  const pill = (txt, bon) => `<span class="fiab-pill ${bon ? 'ok' : 'warn'}">${txt}</span>`;
  let html = `<div class="fiab-row"><span class="fiab-lab">Fiabilité des données</span>` +
    pill(ok ? 'Données vérifiées' : 'Donnée à confirmer', ok) +
    pill(mesure ? 'Croissance mesurée 2013-2023' : 'Scénario 2033 indicatif', mesure) + `</div>`;
  if (!ok) html += `<div class="provenance" style="margin:-4px 0 12px;">Aucune infrastructure n'a pu être rattachée à cette commune : ses postes sont peut-être sous-estimés et son déficit surestimé. À vérifier auprès de l'ANSD.</div>`;
  return html;
}
function fiabiliteRegion(r) {
  return `<div class="provenance"><strong>Fiabilité des données :</strong> ${r.nbConfirmees} ${mot(r.nbConfirmees, 'commune', 'communes')} sur ${r.nbCommunes} à données vérifiées.</div>`;
}

// Un hôpital dessert aussi les départements voisins : on montre donc l'hôpital le plus proche et le total régional.
function contexteHopital(c) {
  const reg = REGION_STATS[cleRegion(c.r)];
  const parts = [];
  if (c.hp) parts.push(`Hôpital le plus proche : ${c.hp}, à ${c.hk} km à vol d'oiseau.`);
  if (reg) parts.push(`Région de ${c.r} : ${reg.nbHopitaux} ${mot(reg.nbHopitaux, 'hôpital', 'hôpitaux')} pour ${reg.pop.toLocaleString('fr-FR')} habitants (norme : ${reg.besoinHopitaux}).`);
  parts.push(c.nh === 0 ? "« 0 » signifie aucun hôpital dans le département, pas aucun accès : un hôpital dessert aussi les départements voisins." : "Un hôpital dessert aussi les départements voisins.");
  return parts.join(' ');
}

function blocSanteCommune(c) {
  let body;
    const badgeColor = c.dp > 15 ? 'var(--clay)' : c.dp > 5 ? 'var(--gold)' : 'var(--teal)';
    const badgeText = c.dp > 15 ? 'Déficit critique' : c.dp > 5 ? 'Déficit modéré' : 'Plutôt bien desservie';
    let bassin = '';
    if (c.dpb !== null && c.dpb !== undefined) {
      const b = Math.round(c.dpb), ecart = b - c.dp;
      let phrase;
      if (ecart < 0) phrase = `${Math.abs(ecart)} ${mot(ecart, 'poste de moins', 'postes de moins')} que dans le compte de la commune seule : les communes voisines ont des postes peu sollicités, dont ${c.n} profite.`;
      else if (ecart > 0) phrase = `${ecart} ${mot(ecart, 'poste de plus', 'postes de plus')} que dans le compte de la commune seule : les postes de ${c.n} servent aussi les communes voisines, il reste moins de capacité pour ses habitants.`;
      else phrase = 'Le voisinage ne change pas la lecture de cette commune.';
      const voisines = (c.lat !== null && c.lat !== undefined)
        ? communes.filter(x => x !== c && x.lat !== null && x.lat !== undefined && haversineKm(c, x) <= 15).map(x => ({ x, d: haversineKm(c, x) })).sort((a, b) => a.d - b.d)
        : [];
      const listeVoisines = voisines.length
        ? `Communes voisines prises en compte (à moins de 15 km) : ${voisines.slice(0, 8).map(v => `${nomUnique(v.x)} (${Math.round(v.d)} km)`).join(', ')}${voisines.length > 8 ? ` et ${voisines.length - 8} autres` : ''}.`
        : "Aucune commune voisine à moins de 15 km : la vue bassin reprend le compte de la commune seule.";
      bassin = `
      <div class="stat-block">
        <div class="stat-head">Vue bassin : la commune et ses voisines à moins de 15 km (à vol d'oiseau) partagent leurs postes</div>
        <div class="stat-main"><span class="num">${b}</span><span class="unit">${mot(b, 'poste manquant', 'postes manquants')} pour les habitants de ${c.n}</span></div>
        <div class="provenance" style="margin-top:6px;">${phrase} Valeurs arrondies à l'unité.</div>
        <div class="provenance" style="margin-top:6px;">${listeVoisines}</div>
      </div>`;
    }
    body = `
      <div class="card-badge" style="--c:${badgeColor}">${badgeText}</div>
      <div class="stat-block">
        <div class="stat-head">Déficit de postes de santé (échelle commune, norme OMS/ANSD)</div>
        <div class="stat-main"><span class="num">${c.dp}</span><span class="unit">${mot(c.dp, 'poste manquant', 'postes manquants')} dans cette commune</span></div>
        <div class="stat-sub">
          <div><span class="lab">Postes existants / requis</span><span class="val">${c.np} / ${c.bp}</span></div>
          <div><span class="lab">Population</span><span class="val">${c.p.toLocaleString('fr-FR')}</span></div>
          <div><span class="lab">Scénario 2033</span><span class="val">${c.dp33}</span></div>
        </div>
        <div class="provenance" style="margin-top:8px;">Calcul (besoin théorique, norme de référence) : ⌈${c.p.toLocaleString('fr-FR')} ÷ 10 000⌉ = ${c.bp} postes requis, moins ${c.np} existants = ${c.dp}${c.np >= c.bp ? ' (aucun manque)' : ''}.</div>
      </div>
      ${bassin}
      <div class="stat-block">
        <div class="stat-head">Déficit du département ${c.d} (centres et hôpitaux - équipements de bassin, pas communaux)</div>
        <div class="stat-sub" style="grid-template-columns: 1fr 1fr;">
          <div><span class="lab">Centres de santé (existants / requis)</span><span class="val">${c.nc} / ${c.bc}</span></div>
          <div><span class="lab">Hôpitaux (existants / requis)</span><span class="val">${c.nh} / ${c.bh}</span></div>
        </div>
        <div class="stat-sub" style="grid-template-columns: 1fr 1fr; margin-top:8px; padding-top:8px;">
          <div><span class="lab">Centres manquants</span><span class="val val-etat" style="--c:${c.dcd>0?'var(--clay)':'var(--teal)'}">${c.dcd}</span></div>
          <div><span class="lab">Hôpitaux manquants</span><span class="val val-etat" style="--c:${c.dhd>0?'var(--clay)':'var(--teal)'}">${c.dhd}</span></div>
        </div>
        <div class="provenance" style="margin-top:8px;">${contexteHopital(c)}</div>
      </div>
      ${(c.np === 0 && c.ns > 0 && c.fb === 1) ? `<div class="provenance" style="margin-top:8px;"><b>À lire avec prudence :</b> ${c.n} compte ${c.ns} ${mot(c.ns, 'centre de santé ou hôpital', 'centres de santé ou hôpitaux')} mais aucun poste. Une structure de niveau supérieur la dessert sur place, donc son déficit de postes est probablement surestimé.</div>` : ''}
      <div class="provenance">Norme utilisée : 1 poste de santé / 10 000 hab. (échelle commune) ; 1 centre / 50 000 hab. et 1 hôpital / 150 000 hab. (échelle département, car ces structures desservent plusieurs communes). Sources : RGPH-5 (2023, ANSD) et infrastructures géolocalisées Géo Sénégal (2023). Distances à vol d'oiseau.</div>
      <div class="provenance" style="margin-top:8px;"><em>Aide à la priorisation statistique : ce résultat doit être complété par la concertation avec les collectivités, les services de santé et les communautés concernées.</em></div>
    `;
  return body;
}
function blocEducationCommune(c) {
  let body;
    const info = { haute: ['var(--edu-hi)', 'Parmi les plus tendues des communes'], moyenne: ['var(--edu-mid)', 'Situation intermédiaire'], basse: ['var(--edu-lo)', 'Parmi les moins tendues des communes'] }[classeEducation(c)] || ['var(--gold)', 'Donnée à confirmer'];
    const rapport = c.ne > 0 ? `1 établissement pour ${Math.round(c.p / c.ne).toLocaleString('fr-FR')} habitants` : 'Aucun établissement secondaire recensé';
    body = `
      <div class="card-badge" style="--c:${info[0]}">${info[1]}</div>
      <div class="stat-block">
        <div class="stat-head">Établissements secondaires recensés (collèges et lycées, publics et privés)</div>
        <div class="stat-main"><span class="num">${c.ne}</span><span class="unit">${mot(c.ne, 'établissement', 'établissements')} pour ${c.p.toLocaleString('fr-FR')} hab.</span></div>
        <div class="provenance" style="margin-top:6px;">${rapport}. Repère : la médiane des communes qui en ont au moins un est de 1 établissement pour ${Math.round(refEducation.mediane).toLocaleString('fr-FR')} habitants.</div>
      </div>
      ${(c.nu || c.nv) ? `<div class="provenance" style="margin-top:6px;">Enseignement supérieur public dans cette commune, présenté à part : ${c.nu ? `${c.nu} ${mot(c.nu, 'campus', 'campus')} d'université` : ''}${c.nu && c.nv ? ' et ' : ''}${c.nv ? `${c.nv} ${mot(c.nv, 'espace numérique', 'espaces numériques')}` : ''}.</div>` : ''}
      <div class="provenance">Contrairement à la santé, aucune norme officielle de densité n'est confirmée pour l'éducation à ce stade - cette valeur est un simple constat, pas un déficit normé. Couvre le secondaire uniquement, pas le primaire.</div>
    `;
  return body;
}
// Repère de la commune choisie (anneau), retiré quand la fiche se ferme
function retirerRepere() { const r = document.getElementById('reperCommune'); if (r) r.remove(); }
function repererCommune(c) {
  retirerRepere(); const g = document.getElementById('communeDots'); if (!g || !c || c.lat === null || c.lat === undefined) return;
  const [x, y] = projeterCommune(c), anneau = document.createElementNS('http://www.w3.org/2000/svg', 'circle'), base = rayonCommune(c) * 2.2 + 1.6;
  anneau.setAttribute('id', 'reperCommune'); anneau.setAttribute('cx', x.toFixed(2)); anneau.setAttribute('cy', y.toFixed(2)); anneau.dataset.r = base.toFixed(2); anneau.setAttribute('r', base.toFixed(2));
  anneau.setAttribute('fill', 'none'); anneau.setAttribute('stroke-width', '2.5'); anneau.setAttribute('vector-effect', 'non-scaling-stroke'); anneau.setAttribute('pointer-events', 'none'); anneau.style.stroke = 'var(--ink, #fff)';
  g.parentNode.appendChild(anneau); ajusterRayonsCommunes();
}
// Fermer la fiche ramène la carte à sa vue de départ et vide la recherche
function fermerFiche() {
  document.getElementById('card').classList.remove('active'); retirerRepere(); reinitialiserVue();
  const champ = document.getElementById('searchInput'); if (champ) champ.value = ''; const res = document.getElementById('searchResults'); if (res) res.classList.remove('show');
}

function openCommune(c) {
  // la fiche montre la santé ET l'éducation (le domaine affiché sur la carte d'abord) ; la fiabilité est dite une seule fois, en tête.
  // Sur téléphone, seul le premier domaine est déplié : la fiche reste courte et laisse voir la carte (un toucher déplie l'autre).
  const sections = { sante: blocSanteCommune(c), education: blocEducationCommune(c) }, titres = { sante: 'Santé', education: 'Éducation' };
  const ordre = mode === 'sante' ? ['sante', 'education'] : ['education', 'sante'];
  const body = `
    <div class="card-eyebrow">${c.d} (${c.r})</div>
    <h2 class="card-title">${c.n}</h2>
    ${fiabiliteHTML(c)}
    ` + ordre.map((k, rang) => `<details class="fiche-section" data-domaine="${k}"${rang === 0 || window.innerWidth >= 900 ? ' open' : ''}><summary>${titres[k]}</summary>${sections[k]}</details>`).join('\n    ');
  const ficheParams = new URLSearchParams({ commune: c.n });
  if (nomsEnDouble.has(c.n)) ficheParams.set('departement', c.d);
  document.getElementById('cardBody').innerHTML = body + `
    <div class="actions">
      <a class="primary" href="communes.html?${ficheParams}">Fiche complète</a>
      <button class="secondary" onclick="exporterCommuneCSV(${communes.indexOf(c)})">Télécharger cette commune (CSV)</button>
      <button class="secondary" onclick="fermerFiche()">Fermer</button>
    </div>
  `;
  if (window.innerWidth >= 900) document.body.classList.add('fiche-ouverte');   // sur grand écran la fiche se range à droite et la carte se réduit : on la mesure déjà réduite
  document.getElementById('card').classList.add('active');
  zoomerSurCommuneProche(c); repererCommune(c);
}

// ---------- simulateur budgétaire : le moteur est partagé (simulation.js), l'interface reste ici ----------
const moteurSimulation = creerMoteurSimulation({ communes });
const { haversineKm, populationNonCouverte, couvertureReelle } = moteurSimulation;
// périmètre du simulateur : tout le pays par défaut, ou une région, ou un département
let perimetreSim = null;
const reserveSim = () => moteurSimulation.reserve(perimetreSim);
const selectionGloutonne = (budget, annee) => moteurSimulation.selectionGloutonne(budget, annee, perimetreSim);
const selectionSimple = (budget, annee) => moteurSimulation.selectionSimple(budget, annee, perimetreSim);
const fmtNombre = x => Math.round(x).toLocaleString('fr-FR');
const fmtMilliers = x => (Math.round(x / 1000) * 1000).toLocaleString('fr-FR');

function openSimulator() {
  document.getElementById('cardBody').innerHTML = `
    <div class="card-eyebrow">Priorisation sous contrainte budgétaire, santé</div>
    <h2 class="card-title">Simulateur</h2>
    <p class="provenance" style="margin-top:0;"><a href="simulateur.html">Ouvrir le simulateur en pleine page</a> : plus grand, avec la carte des communes retenues.</p>
    <p class="provenance" style="margin-top:0;">Ce simulateur porte sur les postes de santé. L'éducation n'en a pas : aucune norme officielle ne permet de dire où un établissement manque.</p>
    <div class="sim-field sim-col"><label for="simRegion">Où simuler ? Région</label><select id="simRegion"></select></div>
    <div class="sim-field sim-col"><label for="simDept">Département</label><select id="simDept"></select></div>
    <div class="sim-field">
      <label for="simBudget">Nombre de structures finançables</label>
      <input type="number" id="simBudget" min="1" max="25" value="10">
    </div>
    <button class="sim-run" id="simRun">Calculer la priorité</button>
    <div class="sim-compare" id="simCompare"></div>
    <ul class="sim-list" id="simResults"></ul>
    <button class="sim-export" id="simExport">Exporter ce classement (CSV)</button>
    <div class="sim-annee"><span>Année de référence</span><div class="sim-toggle">
      <button class="active" id="simY23" data-y="2023">Population 2023</button>
      <button id="simY33" data-y="2033">Scénario 2033</button>
    </div></div>
    <div class="provenance">Distances à vol d'oiseau entre communes, rayon de 15 km (hypothèse). Pour chaque nouvelle structure, on ne compte que les habitants qui ne sont pas déjà desservis par un choix précédent : c'est ce qui la distingue d'un simple classement par déficit.</div>
  `;
  let annee = '2023';
  let dernierResultat = null;
  const run = () => {
    const budget = Math.max(1, Math.min(25, parseInt(document.getElementById('simBudget').value) || 10));
    if (!reserveSim().some(c => (annee === '2033' ? c.dp33 : c.dp) > 0)) {
      document.getElementById('simCompare').innerHTML = '<div class="provenance">Aucune commune en déficit de postes de santé sur ce périmètre.</div>';
      document.getElementById('simResults').innerHTML = ''; dernierResultat = null; return;
    }
    const res = selectionGloutonne(budget, annee);
    dernierResultat = { budget, annee, res };
    const simple = selectionSimple(budget, annee);
    const cJ = couvertureReelle(res.map(r => r.c), annee), cS = couvertureReelle(simple, annee);
    const pct = cS > 0 ? (cJ - cS) / cS * 100 : 0;
    // les premiers choix de l'algorithme sont les mêmes quel que soit le budget : on cherche à partir de quel rang il atteint la couverture du classement simple
    const rang = res.findIndex(r => r.cumul >= cS) + 1;
    const equivalent = (rang > 0 && rang < budget)
      ? `<div class="cmp-row"><span>À population desservie égale</span><b>${rang} structures au lieu de ${budget}</b></div>
         <div class="provenance" style="margin-top:2px;">Jàppale atteint au moins la couverture du classement simple avec ${Math.round((1 - rang / budget) * 100)} % de structures en moins (coût supposé identique pour chaque structure).</div>` : '';
    const choisies = new Set(res.map(r => r.c)), simples = new Set(simple);
    const retenues = res.map(r => r.c).filter(c => !simples.has(c)).map(nomUnique);
    const ecartees = simple.filter(c => !choisies.has(c)).map(nomUnique);
    document.getElementById('simCompare').innerHTML = `
      <div class="cmp-title">Jàppale contre un classement simple par déficit${perimetreSim ? ` (${perimetreSim.valeur})` : ' (tout le pays)'}</div>
      <div class="cmp-row"><span>Classement simple</span><b>environ ${fmtMilliers(cS)} hab. desservis</b></div>
      <div class="cmp-row"><span>Jàppale</span><b>environ ${fmtMilliers(cJ)} hab. desservis</b></div>
      <div class="cmp-gain">${pct >= 0.05 ? '+' + pct.toFixed(1).replace('.', ',') + ' % de population desservie en plus' : 'Aucun écart à ce budget'}</div>
      ${equivalent}
      <div class="provenance">${retenues.length ? `Jàppale écarte ${ecartees.join(', ')} (trop proche${ecartees.length > 1 ? 's' : ''} d'autres choix déjà faits, donc redondante${ecartees.length > 1 ? 's' : ''}) et retient ${retenues.join(', ')}. Estimation, même règle de calcul pour les deux méthodes.` : `À ce budget, les deux méthodes retiennent les mêmes communes. La différence apparaît quand le budget grandit : essayez 10 ou 15 structures.`}</div>`;
    document.getElementById('simResults').innerHTML = res.map((r, i) => `
      <li>
        <span><span class="sn">${i+1}. ${nomUnique(r.c)}</span><br><span class="sm">${r.c.r}, ${(annee==='2033'?r.c.dp33:r.c.dp)} postes manquants</span></span>
        <span class="sc">+${fmtMilliers(r.gain)}<br><span class="sm">cumul ${fmtMilliers(r.cumul)}</span></span>
      </li>
    `).join('');
  };
  document.getElementById('simRun').addEventListener('click', run);
  perimetreSim = null;   // chaque ouverture repart du national
  const regionsSim = [...new Set(communes.map(c => c.r))].sort((a, b) => a.localeCompare(b, 'fr'));
  const selR = document.getElementById('simRegion'), selD = document.getElementById('simDept');
  selR.innerHTML = '<option value="">Tout le pays</option>' + regionsSim.map(r => `<option value="${r}">${r}</option>`).join('');
  selD.innerHTML = '<option value="">Tous les départements</option>'; selD.disabled = true;
  selR.addEventListener('change', () => {
    const r = selR.value;
    const deps = r ? [...new Set(communes.filter(c => c.r === r).map(c => c.d))].sort((a, b) => a.localeCompare(b, 'fr')) : [];
    selD.innerHTML = '<option value="">Tous les départements</option>' + deps.map(d => `<option value="${d}">${d}</option>`).join('');
    selD.disabled = !r;
    perimetreSim = r ? { cle: 'r', valeur: r } : null;
    run();
  });
  selD.addEventListener('change', () => {
    perimetreSim = selD.value ? { cle: 'd', valeur: selD.value, region: selR.value } : (selR.value ? { cle: 'r', valeur: selR.value } : null);
    run();
  });
  document.getElementById('simExport').addEventListener('click', () => {
    if (!dernierResultat) return;
    const { budget, annee: an, res } = dernierResultat;
    telechargerCSV(`jappale_classement_${budget}_structures_${an}.csv`,
      ['rang','commune','departement','region','postes_manquants','population_desservie_en_plus','cumul','budget','annee','perimetre'],
      res.map((r, i) => [i + 1, r.c.n, r.c.d, r.c.r, an === '2033' ? r.c.dp33 : r.c.dp, Math.round(r.gain), Math.round(r.cumul), budget, an, perimetreSim ? perimetreSim.valeur : 'Sénégal']));
  });
  document.getElementById('simY23').addEventListener('click', () => {
    annee = '2023';
    document.getElementById('simY23').classList.add('active');
    document.getElementById('simY33').classList.remove('active');
    run();
  });
  document.getElementById('simY33').addEventListener('click', () => {
    annee = '2033';
    document.getElementById('simY33').classList.add('active');
    document.getElementById('simY23').classList.remove('active');
    run();
  });
  run();
  document.getElementById('card').classList.add('active');
}
document.getElementById('simBtn').addEventListener('click', openSimulator);

// ---------- assistant conversationnel : le moteur est partagé (assistant.js), l'interface reste ici ----------
const moteurAssistant = creerMoteurAssistant({ communes, regionPoints, regionRate, mot, nomUnique });
  const { normaliserTexte, trouverLieu, DEFINITIONS, definitionFiabilite, departements, perimetre, repondreAssistant } = moteurAssistant;
  // IA locale (Ollama) si elle est disponible ; sinon les réponses restent celles du moteur à règles
  const assistantIA = typeof creerAssistantLLM === 'function' ? creerAssistantLLM({ moteur: moteurAssistant, communes, regionPoints, regionRate, mot, nomUnique }) : null;

function openAbout() {
  const bloc = (titre, ...paras) => `<div class="stat-block"><div class="stat-head">${titre}</div>${paras.map(t => `<div class="provenance" style="margin-top:6px;">${t}</div>`).join('')}</div>`;
  const aConfirmer = communes.filter(c => c.fb === 0).map(c => c.n).join(' et ');
  document.getElementById('cardBody').innerHTML = `
    <div class="card-eyebrow">Transparence</div>
    <h2 class="card-title">Comprendre ces résultats</h2>
    ${bloc("Ce que c'est", "Jàppale Sénégal compare, commune par commune, les équipements recensés aux normes de référence, pour repérer les zones sous-équipées et aider à choisir où investir en premier. C'est un prototype d'aide à la décision : il ne remplace ni une étude de planification, ni une vérification sur le terrain.", 'Un mot vous échappe ? Les mots et les phrases du site sont expliqués simplement sur la page <a href="methode.html#mots">Méthode et données</a>.')}
    ${bloc("Lire la carte", "Mode Communes : chaque point est une commune. Sa taille suit la population, sa couleur la part des postes nécessaires qui manquent (bronze : la moitié ou plus). Mode Régions : les couleurs classent les régions les unes par rapport aux autres, sans seuil officiel.", "Chaque couleur a son libellé dans la légende. Cliquez sur un point, sur une région, ou cherchez une commune.")}
    ${bloc("D'où viennent les chiffres", "Population : recensement RGPH-5 (2023), ANSD. Structures de santé et d'éducation : couche géolocalisée Géo Sénégal (2023). Croissance : recensements de 2013 et 2023. Seul le fond de carte vient d'ailleurs (Natural Earth).")}
    ${bloc("Comment est calculé le déficit", "Postes requis = population ÷ 10 000, arrondie au supérieur. Déficit = postes requis moins postes existants, jamais négatif.", "Ratios de référence : 1 poste de santé pour 10 000 habitants, 1 centre pour 50 000, 1 hôpital pour 150 000 (normes de l'OMS citées par l'ANSD dans la Situation économique et sociale 2005).", "Centres et hôpitaux sont comptés par département, car ils desservent plusieurs communes : « 0 hôpital » veut dire aucun dans le département, pas aucun accès.")}
    ${bloc("Vue bassin", "La commune et ses voisines à moins de 15 km (à vol d'oiseau) se partagent leurs postes. C'est une hypothèse : elle ne tient pas compte de l'état des routes ni du temps de trajet réel. Ce n'est ni un découpage administratif, ni un bassin sanitaire officiel. Les distances sont mesurées entre les centres des communes (moyenne des positions de leurs structures recensées).", "Quel chiffre citer ? Le premier (par exemple 75 pour Touba) est le compte de la commune seule ; le second (93) tient compte des communes voisines. Citez les deux, en disant lequel est lequel.")}
    ${bloc("Scénario 2033", "Il prolonge la croissance mesurée entre 2013 et 2023, ramenée vers la moyenne nationale après cinq ans. C'est un scénario indicatif, pas une prévision officielle.")}
    ${bloc("Fiabilité", "« Données vérifiées » : des infrastructures ont pu être rattachées à la commune. « Donnée à confirmer » : aucune n'a été rattachée. La croissance est « mesurée » ou « estimée » (valeur nationale de repli).")}
    ${bloc("Limites à connaître", `Communes à confirmer : ${aConfirmer}.`, "La couche source compte 2 124 postes, contre 1 680 dans une brochure du Ministère de la Santé. Si le Ministère a raison, les déficits sont sous-estimés : avec les nombres officiels de 2022 par région (1 584 postes), le manque serait d'environ 796 au lieu de 553, et neuf des dix communes les plus touchées restent les mêmes.", "L'éducation ne couvre que le secondaire (collèges et lycées) et n'a pas de norme officielle de distance : c'est un constat, pas un déficit. La couche n'en recense que la moitié (1 342 sur 2 649 établissements), donc l'isolement est probablement surestimé. L'enseignement supérieur est présenté à part.", "Parmi les 50 hôpitaux de la couche, 6 sont privés : l'hôpital le plus proche affiché peut l'être.", "Ne sont pas évalués : le personnel, le matériel, le fonctionnement réel des structures, ni le recours aux soins privés ou traditionnels.")}
    ${bloc("Vérifier un chiffre", "Données, code, dictionnaire des colonnes, glossaire et note méthodologique sont documentés dans le dépôt du projet. Données : 2023. Calculs : octobre 2026. Version de la plateforme : 3 octobre 2026.")}
    ${bloc("Besoin de toutes les données ?", "Pour une commune ou une région, utilisez le bouton de sa fiche. Le fichier de tout le pays s'adresse aux analystes : il se trouve sur la page Méthode et données.")}
    <div class="actions">
      <a class="primary" href="methode.html">Méthode &amp; données (page complète)</a>
      <button class="secondary" onclick="fermerFiche()">Fermer</button>
    </div>`;
  document.getElementById('card').classList.add('active');
}

function openAssistant() {
  document.getElementById('cardBody').innerHTML = `
    <div class="card-eyebrow">Assistant Jàppale</div>
    <h2 class="card-title">Posez votre question</h2>
    <div class="provenance" style="margin-bottom:10px;">Je réponds à partir des données de la plateforme, sans rien inventer. Si je ne sais pas, je le dis.</div>
    <div class="provenance chat-etat" id="chatEtat" hidden></div>
    <div class="chat-suggestions">
      <button data-q="Quelle région est la plus touchée ?">Région la plus touchée</button>
      <button data-q="Les 5 communes les plus en déficit">5 communes les plus en déficit</button>
      <button data-q="Déficit de Saraya">Déficit de Saraya</button>
      <button data-q="Où sont les hôpitaux manquants ?">Hôpitaux manquants</button>
      <button data-q="Où construire en priorité avec 5 structures ?">Où construire en priorité ?</button>
      <button data-q="Quelle commune a le plus d'écoles ?">Communes avec le plus d'écoles</button>
      <button data-q="Population de Podor">Population de Podor</button>
      <button data-q="C'est quoi la vue bassin ?">C'est quoi la vue bassin ?</button>
    </div>
    <div class="chat-log" id="chatLog"></div>
    <div class="chat-input-row">
      <input id="chatInput" type="text" placeholder="Votre question…">
      <button id="chatSend">Envoyer</button>
    </div>
  `;
  const log = document.getElementById('chatLog');
  const addMsg = (text, cls) => {
    const div = document.createElement('div');
    div.className = `chat-msg ${cls}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };
  const send = (text) => {
    if (!text.trim()) return;
    addMsg(text, 'user');
    if (assistantIA) assistantIA.poser(text, addMsg);
    else setTimeout(() => addMsg(repondreAssistant(text), 'bot'), 150);
    document.getElementById('chatInput').value = '';
  };
  document.getElementById('chatSend').addEventListener('click', () => send(document.getElementById('chatInput').value));
  document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(e.target.value); });
  document.querySelectorAll('.chat-suggestions button').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
  if (assistantIA) {
    const etat = document.getElementById('chatEtat');
    assistantIA.surEtat((e, raison) => { if (!etat.isConnected) return; etat.hidden = !raison; etat.textContent = raison; etat.dataset.etat = e; });
    assistantIA.verifierConnexion();
  }
  document.getElementById('card').classList.add('active');
}
document.getElementById('askBtn').addEventListener('click', openAssistant);
document.getElementById('aboutBtn').addEventListener('click', openAbout);


const input = document.getElementById('searchInput');
const results = document.getElementById('searchResults');
input.addEventListener('focus', () => document.getElementById('card').classList.remove('active'));
input.addEventListener('input', () => {
  if (!input.value.trim() && (document.getElementById('card').classList.contains('active') || document.getElementById('reperCommune'))) fermerFiche();   // champ vidé : la carte revient à sa vue de départ
  document.getElementById('card').classList.remove('active');   // le panneau ne doit pas cacher les résultats
  // la saisie et les noms sont comparés sans accents ni majuscules : on tape « Thiès », la base écrit « Thies »
  const q = normaliserTexte(input.value.trim());
  if (q.length < 2) { results.classList.remove('show'); return; }
  // les noms qui commencent par la saisie passent devant, puis les plus peuplés : « Touba » donne d'abord Touba Mosquee
  const rang = c => { const n = normaliserTexte(c.n); return n === q ? 0 : n.startsWith(q) ? 1 : 2; };
  let matches = communes.filter(c => normaliserTexte(c.n).includes(q)).sort((a, b) => rang(a) - rang(b) || b.p - a.p).slice(0, 8);
  let viaDepartement = false;
  if (!matches.length) {
    // essai par nom de département : certains anciens noms de commune (Guédiawaye,
    // Keur Massar, Rufisque...) sont devenus des départements subdivisés en plusieurs
    // communes depuis les réformes de 2021 - on retrouve leurs communes actuelles.
    matches = communes.filter(c => c.d && normaliserTexte(c.d).includes(q)).sort((a, b) => b.p - a.p).slice(0, 8);
    viaDepartement = matches.length > 0;
  }
  if (!matches.length) {
    results.innerHTML = `<div class="result-row"><span class="rr">Aucune commune trouvée pour « ${input.value.trim()} ». Essayez un nom de commune actuel, ou vérifiez qu'il ne s'agit pas d'un ancien nom remplacé depuis une réforme administrative.</span></div>`;
    results.classList.add('show'); return;
  }
  results.innerHTML = (viaDepartement ? `<div class="result-row" style="cursor:default"><span class="rr">« ${input.value.trim()} » est un département, subdivisé en ${matches.length} commune(s) :</span></div>` : '') + matches.map(c => `
    <div class="result-row" data-i="${communes.indexOf(c)}">
      <span><span class="rn">${c.n}</span><br><span class="rr">${c.d} (${c.r}), ${c.p.toLocaleString('fr-FR')} hab.${c.fb === 0 ? ', <em>à confirmer</em>' : ''}</span></span>
      <span class="rd">${mode==='sante' ? (vue==='bassin' && c.dpb!==null && c.dpb!==undefined ? Math.round(c.dpb) : c.dp) + ' manq.' : c.ne + ' étab.'}</span>
    </div>
  `).join('');
  results.classList.add('show');
});
results.addEventListener('click', (e) => {
  const row = e.target.closest('.result-row');
  if (!row || row.dataset.i === undefined) return;
  const c = communes[parseInt(row.dataset.i, 10)];
  if (c) { openCommune(c); results.classList.remove('show'); input.value = c.n; }   // openCommune zoome déjà, en gardant la commune au-dessus de la fiche
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.pill') && !e.target.closest('#searchResults')) results.classList.remove('show');
});

// ---------- mode switch ----------
function majEtatVueSwitch() {
  document.getElementById('vueSwitch').classList.toggle('disabled', mode === 'education');
}
document.getElementById('btnSante').addEventListener('click', () => {
  mode = 'sante';
  document.getElementById('btnSante').classList.add('active');
  document.getElementById('btnEducation').classList.remove('active');
  majEtatVueSwitch();
  renderRegions();
});
document.getElementById('btnEducation').addEventListener('click', () => {
  mode = 'education';
  document.getElementById('btnEducation').classList.add('active');
  document.getElementById('btnSante').classList.remove('active');
  majEtatVueSwitch();
  renderRegions();
});

// ---------- carte switch (communes / régions) ----------
document.getElementById('btnCarteCommunes').addEventListener('click', () => {
  carte = 'communes';
  document.getElementById('btnCarteCommunes').classList.add('active');
  document.getElementById('btnCarteRegions').classList.remove('active');
  renderRegions();
});
document.getElementById('btnCarteRegions').addEventListener('click', () => {
  carte = 'regions';
  document.getElementById('btnCarteRegions').classList.add('active');
  document.getElementById('btnCarteCommunes').classList.remove('active');
  renderRegions();
});

// ---------- vue switch (communale / bassin) ----------
document.getElementById('btnVueCommunale').addEventListener('click', () => {
  vue = 'communale';
  document.getElementById('btnVueCommunale').classList.add('active');
  document.getElementById('btnVueBassin').classList.remove('active');
  renderRegions();
});
document.getElementById('btnVueBassin').addEventListener('click', () => {
  vue = 'bassin';
  document.getElementById('btnVueBassin').classList.add('active');
  document.getElementById('btnVueCommunale').classList.remove('active');
  renderRegions();
});

// ---------- theme ----------
const themeBtn = document.getElementById('themeBtn');
themeBtn.addEventListener('click', () => {
  const root = document.documentElement;
  const cur = root.getAttribute('data-theme');
  // sans thème choisi, on part du thème de l'ordinateur : sinon, en mode sombre, le premier clic « choisit » le sombre et rien ne change
  const sombre = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', sombre ? 'light' : 'dark');
  try { const tel = (navigator.maxTouchPoints > 0 || "ontouchstart" in window) && screen.width > 0 && Math.min(screen.width, screen.height) <= 640; (tel ? sessionStorage : localStorage).setItem('jappale-theme-v3', root.getAttribute('data-theme')); } catch (e) { /* stockage refusé : sans importance */ }
  if (window.__memoTheme) window.__memoTheme(root.getAttribute('data-theme'));
});

// ---------- card close ----------
document.getElementById('cardClose').addEventListener('click', fermerFiche);

renderRegions();

// ---------- liens depuis l'accueil : explorer.html?commune=Touba%20Mosquee&departement=Mbacke, ?sujet=education, #simulateur, #assistant ----------
(() => {
  const params = new URLSearchParams(location.search);
  const nom = params.get('commune');
  if (nom) {
    const cible = normaliserTexte(nom);
    const dep = params.get('departement');
    const c = communes.find(x => normaliserTexte(x.n) === cible && (!dep || normaliserTexte(x.d) === normaliserTexte(dep)));
    if (c) { openCommune(c); zoomerSurCommuneProche(c, 0); }
  }
  if (params.get('sujet') === 'education') document.getElementById('btnEducation').click();
  if (location.hash === '#simulateur') openSimulator();
  if (location.hash === '#assistant') openAssistant();
})();

// ---------- barre de navigation du site ----------
document.getElementById('siteMenuBtn').addEventListener('click', e => {
  const ouvert = document.getElementById('siteLinks').classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', ouvert);
});
// le lien « Simuler un budget » du menu mène maintenant à la page dédiée ; l'engrenage de la carte garde le simulateur compact

// Panneau latéral : sur grand écran, la fiche se range à droite et la carte se réduit pour ne pas être masquée (comme sur une carte routière).
(function () {
  const carte = document.getElementById('card');
  const maj = () => { document.body.classList.toggle('fiche-ouverte', carte.classList.contains('active') && window.innerWidth >= 900); appliquerVue(); };
  new MutationObserver(maj).observe(carte, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', maj);
})();
