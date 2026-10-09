#!/usr/bin/env python3
"""Vérifie en une commande qu'un déploiement du site Jàppale Sénégal fonctionne.

Usage :
    python3 tests/verifier_deploiement.py                      lance un petit serveur local sur le dossier docs/ et le vérifie (simule une mise en ligne)
    python3 tests/verifier_deploiement.py https://.../depot/   vérifie le site déjà en ligne (GitHub Pages ou tout autre hébergement)

Aucune installation : seulement la bibliothèque standard de Python 3. Code de sortie 0 si tout est conforme, 1 sinon.
Ce que le script contrôle : les sept pages répondent, tous les fichiers qu'elles chargent (scripts, styles, images) existent et ne sont pas vides,
les liens entre pages ne sont pas cassés, les données contiennent les 553 communes et les 14 régions.
"""
import functools
import http.server
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PAGES = ["index.html", "explorer.html", "communes.html", "comparer.html", "methode.html", "simulateur.html", "synthese.html"]
RACINE_DOCS = Path(__file__).resolve().parents[1] / "docs"


def recuperer(url):
    t = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "verifier_deploiement"}), timeout=25) as r:
            return r.status, r.read(), time.time() - t
    except urllib.error.HTTPError as e:
        return e.code, b"", time.time() - t
    except Exception as e:  # réseau coupé, adresse fausse...
        return 0, str(e).encode(), time.time() - t


def serveur_local():
    class Silencieux(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Silencieux, directory=str(RACINE_DOCS)))
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, f"http://127.0.0.1:{s.server_address[1]}/"


def main(base):
    echecs, controles, debut = [], 0, time.time()

    def ok(condition, libelle, detail=""):
        nonlocal controles
        controles += 1
        print(("OK    " if condition else "ECHEC ") + libelle + (f"  ({detail})" if detail else ""))
        if not condition:
            echecs.append(libelle)

    assets, liens = set(), set()
    for page in PAGES:
        statut, corps, duree = recuperer(base + page)
        texte = corps.decode("utf-8", "replace")
        ok(statut == 200 and "<title>" in texte and "Jàppale" in texte, f"page {page}", f"{len(corps) // 1024} Ko, {duree:.2f} s" if statut == 200 else f"code {statut}")
        for m in re.finditer(r'<(?:script|img)[^>]+src="([^"#?]+)"|<link[^>]+href="([^"#?]+\.(?:css|png|svg|ico|webp))"', texte):
            ref = m.group(1) or m.group(2)
            if not re.match(r"(https?:)?//|data:", ref):
                assets.add(ref)
        for m in re.finditer(r'<a [^>]*href="([^"#?]+\.html)', texte):
            liens.add(m.group(1))
    for ref in sorted(assets):
        statut, corps, _ = recuperer(base + ref)
        ok(statut == 200 and len(corps) > 0, f"fichier chargé : {ref}", f"code {statut}" if statut != 200 else f"{len(corps) // 1024} Ko")
    for css in sorted(r for r in assets if r.endswith(".css")):   # fichiers appelés par les feuilles de style (polices, images)
        _, corps, _ = recuperer(base + css)
        for ref in sorted(set(re.findall(r'url\(["\']?([^)"\'#?]+)', corps.decode("utf-8", "replace")))):
            if not re.match(r"(https?:)?//|data:", ref):
                statut, c2, _ = recuperer(base + urllib.parse.urljoin(css, ref))
                ok(statut == 200 and len(c2) > 0, f"fichier appelé par {css} : {ref}", f"code {statut}" if statut != 200 else f"{len(c2) // 1024} Ko")
    cassés = [l for l in sorted(liens) if recuperer(base + l)[0] != 200]
    ok(not cassés, f"liens entre pages : {len(liens)} adresses distinctes, aucune cassée", ", ".join(cassés))
    statut, corps, _ = recuperer(base + "data.js")
    try:
        texte = corps.decode("utf-8"); communes = json.loads(texte[texte.index("["):texte.rindex("]") + 1])
    except Exception:
        communes = []
    ok(len(communes) == 553, "données : 553 communes dans data.js", f"{len(communes)} trouvées")
    ok(len(set(c["r"] for c in communes)) == 14, "données : 14 régions", f"{len(set(c['r'] for c in communes))} trouvées")
    statut, corps, _ = recuperer(base + "regions.js")
    ok(statut == 200 and len(re.findall(r'"[A-Z_]+":\s*\{"d"', corps.decode("utf-8", "replace"))) == 14, "contours : 14 régions dans regions.js")
    statut, corps, _ = recuperer(base + "communes.html?commune=Oussouye")
    ok(statut == 200 and b"communes.js" in corps, "fiche d'une commune (adresse avec ?commune=Oussouye)")
    print(f"\n{controles} contrôles en {time.time() - debut:.1f} s : " + ("tout est conforme, le déploiement est réussi." if not echecs else f"{len(echecs)} échec(s)."))
    return 1 if echecs else 0


if __name__ == "__main__":
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] in ("-h", "--help")):
        sys.exit(__doc__)
    if len(sys.argv) == 2:
        adresse = sys.argv[1] if sys.argv[1].endswith("/") else sys.argv[1] + "/"
        print(f"Vérification du site en ligne : {adresse}\n"); sys.exit(main(adresse))
    srv, adresse = serveur_local()
    print(f"Serveur local sur {adresse} (dossier docs/)\n")
    try:
        sys.exit(main(adresse))
    finally:
        srv.shutdown()
