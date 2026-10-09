// Export de la fiche de décision en PDF et en Word (.docx), fabriqués dans le navigateur : ni serveur, ni bibliothèque, et cela marche hors connexion.
// Le PDF est un PDF simple (texte, polices standard), non balisé ; le .docx est un document Word minimal (paragraphes), ouvrable dans Word, LibreOffice et Google Docs.
(function () {
  const esp = s => String(s).replace(/[\u00A0\u2007\u2009\u202F]/g, " ").replace(/\s+/g, " ").trim();
  const slug = s => esp(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // ---------- 1. la fiche, découpée en blocs (titre, paragraphes, chiffres, listes) ----------
  function blocsFiche(section) {
    const blocs = [], nb = v => parseFloat(v);
    section.querySelectorAll(".d-marque, h2, h3, p, .d-chiffres > div, li, .d-carte").forEach(el => {
      if (el.classList.contains("d-carte")) {   // la carte : contours, position de la commune, nom
        const svg = el.querySelector("svg"); if (!svg) return; const halo = svg.querySelector(".d-halo"), nom = svg.querySelector(".d-nom"), leg = el.querySelector("figcaption");
        blocs.push({ t: "carte", vue: svg.getAttribute("viewBox").split(/\s+/).map(nb), regions: [...svg.querySelectorAll("path")].map(x => ({ d: x.getAttribute("d"), foncee: x.hasAttribute("data-region") })),
          cx: nb(halo.getAttribute("cx")), cy: nb(halo.getAttribute("cy")), nom: esp(nom.textContent), nx: nb(nom.getAttribute("x")), ny: nb(nom.getAttribute("y")), ancre: nom.getAttribute("text-anchor"), legende: leg ? esp(leg.textContent) : "", alt: svg.getAttribute("aria-label") || "" });
        return;
      }
      const zone = el.closest(".d-gauche") ? "g" : "";
      if (el.classList.contains("d-marque")) { const t = [...el.children].map(x => esp(x.textContent)).filter(Boolean).join("  -  "); if (t) blocs.push({ t: "marque", texte: t }); return; }
      if (el.parentElement.classList.contains("d-chiffres")) { const b = el.querySelector("b"), s = el.querySelector("span"); if (b && s) blocs.push({ t: "chiffre", valeur: esp(b.textContent), texte: esp(s.textContent) }); return; }
      const texte = esp(el.textContent); if (!texte) return;
      blocs.push({ t: el.tagName === "H2" ? "titre" : el.tagName === "H3" ? "sous" : el.tagName === "LI" ? (el.closest(".d-sources") ? "source" : "puce") : el.classList.contains("d-pied") ? "pied" : "para", texte, zone });
    });
    return blocs;
  }

  // ---------- 2. PDF ----------
  // largeurs des caractères ASCII 32 à 126 en Helvetica et Helvetica-Bold (millièmes de corps), pour couper les lignes
  const LN = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const LB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  const CP1252 = { 8217: 0x92, 8216: 0x91, 8220: 0x93, 8221: 0x94, 8230: 0x85, 8211: 0x96, 8212: 0x97, 339: 0x9C, 338: 0x8C, 8364: 0x80, 8226: 0x95 };
  const octet = ch => { const k = ch.charCodeAt(0); return CP1252[k] !== undefined ? CP1252[k] : (k < 256 ? k : 63); };
  const largeur = (txt, gras, taille) => { const T = gras ? LB : LN; let w = 0; for (const ch of txt) { const k = ch.charCodeAt(0); w += k >= 32 && k <= 126 ? T[k - 32] : (k >= 192 && k <= 223 ? 722 : (k === 8226 ? 350 : (k === 8217 ? 222 : 556))); } return w * taille / 1000 * 1.03; };
  function lignes(txt, gras, taille, max) {
    const sortie = []; let ligne = "";
    for (let mot of txt.split(" ")) {
      while (largeur(mot, gras, taille) > max) { let n = mot.length; while (n > 1 && largeur(mot.slice(0, n), gras, taille) > max) n--; if (ligne) { sortie.push(ligne); ligne = ""; } sortie.push(mot.slice(0, n)); mot = mot.slice(n); }
      const essai = ligne ? ligne + " " + mot : mot;
      if (largeur(essai, gras, taille) <= max) ligne = essai; else { sortie.push(ligne); ligne = mot; }
    }
    if (ligne) sortie.push(ligne); return sortie;
  }
  // tracé d'un contour (commandes M, L, Z) du repère de la carte vers le repère du PDF
  function cheminPdf(d, vue, k, x0, yHaut) {
    const f = n => (+n).toFixed(2); let o = "";
    const re = /([MLZ])\s*(-?[\d.]+)?,?(-?[\d.]+)?/g; let m;
    while ((m = re.exec(d)) !== null) {
      if (m[1] === "Z") o += "h "; else o += `${f(x0 + (m[2] - vue[0]) * k)} ${f(yHaut - (m[3] - vue[1]) * k)} ${m[1] === "M" ? "m" : "l"} `;
    }
    return o;
  }
  const cerclePdf = (cx, cy, r) => { const c = 0.5523 * r, f = n => n.toFixed(2); return `${f(cx + r)} ${f(cy)} m ${f(cx + r)} ${f(cy + c)} ${f(cx + c)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ${f(cx - c)} ${f(cy + r)} ${f(cx - r)} ${f(cy + c)} ${f(cx - r)} ${f(cy)} c ${f(cx - r)} ${f(cy - c)} ${f(cx - c)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ${f(cx + c)} ${f(cy - r)} ${f(cx + r)} ${f(cy - c)} ${f(cx + r)} ${f(cy)} c h`; };
  function fichePdfOctets(blocs, titre) {
    const MARGE = 48, HAUT = 842 - 36, BAS = 28, LARG = 595 - 2 * MARGE, pages = [[]]; let y = HAUT, zoneHaut = null;
    const carte = blocs.find(b => b.t === "carte"), LC = 170, LARG_G = carte ? LARG - LC - 14 : LARG;
    const echap = s => { let o = ""; for (const ch of s) { const b = octet(ch); o += (b === 40 || b === 41 || b === 92) ? "\\" + String.fromCharCode(b) : (b < 32 || b > 126 ? "\\" + b.toString(8).padStart(3, "0") : String.fromCharCode(b)); } return o; };
    const poser = (txt, x, taille, gras, gris) => pages[pages.length - 1].push(`BT ${gris ? "0.35 g" : "0 g"} /${gras ? "F2" : "F1"} ${taille} Tf ${x} ${y.toFixed(1)} Td (${echap(txt)}) Tj ET`);
    const saut = h => { if (y - h < BAS) { pages.push([]); y = HAUT; } };
    const bloc = (txt, o) => {
      const retrait = o.retrait || 0, ls = lignes(txt, o.gras, o.taille, (o.larg || LARG) - retrait), h = o.taille * 1.27;
      y -= o.avant || 0; saut(h * Math.min(2, ls.length));
      ls.forEach((l, i) => { saut(h); y -= h; if (i === 0 && o.puce) poser("\u2022", MARGE + 4, o.taille, false, false); poser(l, MARGE + retrait, o.taille, o.gras, o.gris); });
      y -= o.apres || 0;
    };
    const texteA = (txt, x, yy, taille, gras, gris) => pages[pages.length - 1].push(`BT ${gris ? "0.35 g" : "0 g"} /${gras ? "F2" : "F1"} ${taille} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${echap(txt)}) Tj ET`);
    const dessinerCarte = b => {   // carte à droite de la zone de gauche (titre, lieu, légende) ; la commune en point cerclé rouge, sa région en gris foncé
      const k = LC / b.vue[2], hMap = b.vue[3] * k, x0 = MARGE + LARG - LC, haut = zoneHaut === null ? y : zoneHaut, P = pages[pages.length - 1];
      P.push("q"); b.regions.forEach(r => P.push(`${r.foncee ? "0.55" : "0.87"} g 1 G 0.4 w ${cheminPdf(r.d, b.vue, k, x0, haut)} B`));
      P.push(`0.55 G 0.6 w ${x0.toFixed(2)} ${(haut - hMap).toFixed(2)} ${LC} ${hMap.toFixed(2)} re S`);
      const cx = x0 + (b.cx - b.vue[0]) * k, cy = haut - (b.cy - b.vue[1]) * k;
      P.push(`0.70 0.15 0.12 RG 1.6 w ${cerclePdf(cx, cy, 10 * k)} S`, `0.70 0.15 0.12 rg 1 G 0.8 w ${cerclePdf(cx, cy, 4 * k)} B`, "Q");
      const tl = largeur(b.nom, true, 8), nx = x0 + (b.nx - b.vue[0]) * k, tx = b.ancre === "end" ? nx - tl : nx, ty = haut - (b.ny - b.vue[1]) * k;
      texteA(b.nom, Math.max(x0 + 2, Math.min(x0 + LC - tl - 2, tx)), ty, 8, true, false);
      const leg = lignes(b.legende, false, 6.5, LC); leg.forEach((l, i) => texteA(l, x0, haut - hMap - 9 - i * 8, 6.5, false, true));
      y = Math.min(y, haut - hMap - 9 - leg.length * 8 - 6); zoneHaut = null;
    };
    const rangee = lot => {   // les chiffres clés côte à côte, dans des cases à contour, comme sur la page imprimée
      const g = 8, w = (LARG - (lot.length - 1) * g) / lot.length, cases = lot.map(c => ({ c, ls: lignes(c.texte, false, 8, w - 12) })), h = 6 + 16 * 1.15 + Math.max(...cases.map(x => x.ls.length)) * 8 * 1.3 + 6;
      saut(h + 6); const haut = y; cases.forEach((x, i) => { const x0 = MARGE + i * (w + g), P = pages[pages.length - 1]; P.push(`0 G 0.9 w ${x0.toFixed(1)} ${(haut - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`); y = haut - 6 - 16; texteA(x.c.valeur, x0 + 6, y + 3, 16, true, false); x.ls.forEach((l, j) => texteA(l, x0 + 6, haut - 6 - 16 * 1.15 - 8 - j * 8 * 1.3 + 2, 8, false, false)); });
      y = haut - h - 6;
    };
    for (let i = 0; i < blocs.length; i++) { const b = blocs[i];
      if (carte && b.zone === "g" && zoneHaut === null) zoneHaut = y;
      if (b.t === "chiffre") { const lot = []; while (i < blocs.length && blocs[i].t === "chiffre") lot.push(blocs[i++]); i--; rangee(lot); continue; }
      if (b.t === "carte") dessinerCarte(b);
      else if (b.t === "marque") bloc(b.texte, { taille: 9, gris: true, apres: 10 });
      else if (b.t === "titre") bloc(b.texte, { taille: 18, gras: true, avant: 2, apres: 3, larg: b.zone === "g" ? LARG_G : 0 });
      else if (b.t === "sous") bloc(b.texte, { taille: 11, gras: true, avant: 7, apres: 2 });
      else if (b.t === "puce") bloc(b.texte, { taille: b.zone === "g" ? 8.5 : 9.2, retrait: 14, puce: true, apres: 2, larg: b.zone === "g" ? LARG_G : 0 });
      else if (b.t === "source") bloc(b.texte, { taille: 7.3, retrait: 12, puce: true, gris: true, apres: 1 });
      else if (b.t === "pied") bloc(b.texte, { taille: 7, gris: true, avant: 6 });
      else bloc(b.texte, { taille: 9.5, apres: 3, larg: b.zone === "g" ? LARG_G : 0 });
    }
    const objets = [], kids = pages.map((_, i) => `${6 + 2 * i} 0 R`).join(" ");
    objets[1] = "<< /Type /Catalog /Pages 2 0 R /Lang (fr-FR) /ViewerPreferences << /DisplayDocTitle true >> >>";
    objets[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
    objets[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objets[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objets[5] = `<< /Title (${echap(titre || "Fiche de décision")}) /Producer (Jappale Senegal) >>`;
    pages.forEach((cmds, i) => { const flux = cmds.join("\n"); objets[6 + 2 * i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`; objets[7 + 2 * i] = `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`; });
    let sortie = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n"; const pos = [];
    for (let n = 1; n < objets.length; n++) { pos[n] = sortie.length; sortie += `${n} 0 obj\n${objets[n]}\nendobj\n`; }
    const xref = sortie.length;
    sortie += `xref\n0 ${objets.length}\n0000000000 65535 f \n` + pos.slice(1).map(p => String(p).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${objets.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const o = new Uint8Array(sortie.length); for (let i = 0; i < sortie.length; i++) o[i] = sortie.charCodeAt(i) & 255; return o;
  }

  // ---------- 3. Word (.docx) : un fichier ZIP de quelques parties XML, sans compression ----------
  const xml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function utf8(s) { const o = []; for (const ch of s) { const k = ch.codePointAt(0); if (k < 0x80) o.push(k); else if (k < 0x800) o.push(0xC0 | (k >> 6), 0x80 | (k & 63)); else if (k < 0x10000) o.push(0xE0 | (k >> 12), 0x80 | ((k >> 6) & 63), 0x80 | (k & 63)); else o.push(0xF0 | (k >> 18), 0x80 | ((k >> 12) & 63), 0x80 | ((k >> 6) & 63), 0x80 | (k & 63)); } return Uint8Array.from(o); }
  const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = o => { let c = 0xFFFFFFFF; for (let i = 0; i < o.length; i++) c = TABLE[(c ^ o[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(fichiers) {
    const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
    const morceaux = [], centre = []; let pos = 0;
    for (const f of fichiers) {
      const nom = Array.from(utf8(f.nom)), crc = crc32(f.octets), n = f.octets.length;
      const entete = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x5D47), ...u32(crc), ...u32(n), ...u32(n), ...u16(nom.length), ...u16(0), ...nom];
      centre.push([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x5D47), ...u32(crc), ...u32(n), ...u32(n), ...u16(nom.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos), ...nom]);
      morceaux.push(Uint8Array.from(entete), f.octets); pos += entete.length + n;
    }
    const cd = [].concat.apply([], centre), fin = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fichiers.length), ...u16(fichiers.length), ...u32(cd.length), ...u32(pos), ...u16(0)];
    const o = new Uint8Array(pos + cd.length + fin.length); let i = 0; for (const m of morceaux) { o.set(m, i); i += m.length; } o.set(cd, i); i += cd.length; o.set(fin, i); return o;
  }
  function cartePng(b) {   // la carte dessinée sur un canevas, puis encodée en PNG ; null si le navigateur ne sait pas dessiner (le Word se fait alors sans image)
    try {
      const L = 840, H = Math.round(L * b.vue[3] / b.vue[2]), cv = document.createElement("canvas"); cv.width = L; cv.height = H; const g = cv.getContext("2d"); if (!g) return null;
      const k = L / b.vue[2]; g.fillStyle = "#fff"; g.fillRect(0, 0, L, H); g.setTransform(k, 0, 0, k, -b.vue[0] * k, -b.vue[1] * k);
      for (const r of b.regions) { const p = new Path2D(r.d); g.fillStyle = r.foncee ? "#8c8c8c" : "#dedede"; g.fill(p); g.strokeStyle = "#fff"; g.lineWidth = 1; g.stroke(p); }
      g.strokeStyle = "#b3261e"; g.lineWidth = 2.2; g.beginPath(); g.arc(b.cx, b.cy, 10, 0, 2 * Math.PI); g.stroke();
      g.fillStyle = "#b3261e"; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(b.cx, b.cy, 4, 0, 2 * Math.PI); g.fill(); g.stroke();
      g.font = "700 19px Arial, Helvetica, sans-serif"; g.textAlign = b.ancre === "end" ? "right" : "left"; g.lineJoin = "round"; g.lineWidth = 4; g.strokeStyle = "#fff"; g.fillStyle = "#111"; g.strokeText(b.nom, b.nx, b.ny); g.fillText(b.nom, b.nx, b.ny);
      const bin = atob(cv.toDataURL("image/png").split(",")[1]), o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o;
    } catch (e) { return null; }
  }
  function ficheDocxOctets(blocs, titre) {
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", EN = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const r = (t, rpr) => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(t)}</w:t></w:r>`, p = (runs, ppr) => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${runs}</w:p>`;
    const carte = blocs.find(b => b.t === "carte"), png = carte ? cartePng(carte) : null, EMU = 360000, cx = 7 * EMU, cy = Math.round(cx * (carte ? carte.vue[3] / carte.vue[2] : 1));
    const dessin = !png ? "" : `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Carte" descr="${xml(carte.alt)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="carte.png" descr="${xml(carte.alt)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>` + (carte.legende ? p(r(carte.legende, '<w:color w:val="666666"/><w:sz w:val="14"/>')) : "");
    const corps = blocs.map(b => b.t === "carte" ? dessin : b.t === "marque" ? p(r(b.texte, '<w:color w:val="666666"/><w:sz w:val="18"/>'), '<w:spacing w:after="200"/>')
      : b.t === "titre" ? p(r(b.texte, '<w:b/><w:sz w:val="40"/>'), '<w:spacing w:before="80" w:after="80"/>')
      : b.t === "sous" ? p(r(b.texte, '<w:b/><w:sz w:val="25"/>'), '<w:keepNext/><w:spacing w:before="200" w:after="60"/>')
      : b.t === "chiffre" ? p(r(b.valeur, '<w:b/><w:sz w:val="30"/>') + r("   " + b.texte), '<w:spacing w:before="80" w:after="40"/>')
      : b.t === "puce" ? p(r("\u2022  " + b.texte), '<w:ind w:left="360" w:hanging="260"/>')
      : b.t === "source" ? p(r("\u2022  " + b.texte, '<w:color w:val="666666"/><w:sz w:val="15"/>'), '<w:ind w:left="300" w:hanging="220"/><w:spacing w:after="20"/>')
      : b.t === "pied" ? p(r(b.texte, '<w:color w:val="666666"/><w:sz w:val="16"/>'), '<w:spacing w:before="240"/>') : p(r(b.texte))).join("");
    const document_ = `${EN}<w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${corps}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const styles = `${EN}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
    const types = `${EN}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${png ? '<Default Extension="png" ContentType="image/png"/>' : ""}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
    const rels = `${EN}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    const relsDoc = `${EN}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${png ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/carte.png"/>' : ""}</Relationships>`;
    return zip([{ nom: "[Content_Types].xml", octets: utf8(types) }, { nom: "_rels/.rels", octets: utf8(rels) }, { nom: "word/document.xml", octets: utf8(document_) }, { nom: "word/styles.xml", octets: utf8(styles) }, { nom: "word/_rels/document.xml.rels", octets: utf8(relsDoc) }].concat(png ? [{ nom: "word/media/carte.png", octets: png }] : []));
  }

  // ---------- 4. téléchargement ----------
  function telecharger(octets, nom, type) {
    const url = URL.createObjectURL(new Blob([octets], { type })), a = document.createElement("a");
    a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  window.blocsFiche = blocsFiche; window.fichePdfOctets = fichePdfOctets; window.ficheDocxOctets = ficheDocxOctets; window.telechargerFiche = telecharger; window.nomFichierFiche = c => "Fiche_decision_" + slug(c.n);
})();
