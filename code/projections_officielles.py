#!/usr/bin/env python3
"""Projections démographiques officielles de l'ANSD (2023-2073) rapprochées des 553 communes du site.

Entrée  : le PDF « Projections démographiques 2023-2073 » de l'ANSD (en argument) ; l'outil pdftotext (poppler) doit être installé.
          ../donnees/accessibilite_bassin.csv (les 553 communes du site, étape 7)
Sortie  : ../donnees/projections_ansd_communes.csv

Le PDF contient, pour chaque commune, la population Homme / Femme / Ensemble par année, par groupes de trois années, sous la hiérarchie
région > département > arrondissement > commune. Le script lit les groupes « 2023-2025 » et « 2032-2034 ».

Rapprochement : d'abord par (région, département, commune), puis, si le nom du département diffère (orthographe), par (région, commune) quand ce nom
est unique dans la région. Règle de prudence : la projection officielle n'est UTILISÉE pour une commune que si la population 2023 du tableau est
identique à celle du recensement du site. Sinon (permutation de noms entre deux publications, ou petit écart), on garde le scénario du site.

Usage :  python3 projections_officielles.py chemin/vers/Projections-demographiques_2023-2073-.pdf
"""
import csv
import re
import subprocess
import sys
import unicodedata
from collections import defaultdict

ENTREE = "../donnees/accessibilite_bassin.csv"
SORTIE = "../donnees/projections_ansd_communes.csv"


def norm(s):
    return re.sub(r"[^A-Z0-9]", "", unicodedata.normalize("NFD", s.upper()).encode("ascii", "ignore").decode())


def nettoie(s, prefixes=()):
    s = s.upper().strip()
    for p in prefixes:
        s = re.sub(r"^" + p + r"\s+", "", s)
    s = re.sub(r"^(DE LA|DE L[’'])\s*|^(DE|DU|DES)\s+|^D[’']\s*", "", s)
    return norm(s)


def lire_projections(texte):
    """Retourne {(région, département, commune): {année: population ensemble}} pour toutes les années présentes."""
    entete = re.compile(r"^\s*(?:RGPH-5\s+)?(\d{4})\s+(\d{4})\s+(\d{4})\s*$")
    region_titre = re.compile(r"PROJECTION DE LA POPULATION DE LA REGION\s+(?:DE\s+|D[’']\s*)?([A-Z’' \-]+?)\s*-?\s*(\d{4})-(\d{4})")
    nombre = lambda s: int(s.replace(" ", "")) if re.fullmatch(r"\d[\d ]*", s.strip()) else None
    out = defaultdict(dict)
    annees = region = dept = None
    for ligne in texte.split("\n"):
        m = entete.match(ligne)
        if m:
            annees = tuple(map(int, m.groups())); continue
        m = region_titre.search(ligne)
        if m:
            region = m.group(1).strip(); continue
        cols = re.split(r"\s{2,}", ligne.strip())
        if annees and len(cols) == 10 and all(nombre(c) is not None for c in cols[1:]):
            nom, v = cols[0].strip(), [nombre(c) for c in cols[1:]]
            if nom.startswith("REGION "):
                region, dept = nom[7:].strip(), None; continue
            if nom.startswith("DEPARTEMENT"):
                dept = nom; continue
            if nom.startswith("ARRONDISSEMENT") or nom in ("ZONE URBAINE", "ZONE RURALE") or not (region and dept):
                continue
            k = (nettoie(region), nettoie(dept, ("DEPARTEMENT",)), norm(nom))
            for i, a in enumerate(annees):
                out[k][a] = v[3 * i + 2]
    return out


def main(pdf):
    texte = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    off = {k: v for k, v in lire_projections(texte).items() if 2023 in v and 2033 in v}
    par_rc = defaultdict(list)
    for k in off:
        par_rc[(k[0], k[2])].append(k)
    sortie, n_exact = [], 0
    for r in sorted(csv.DictReader(open(ENTREE, encoding="utf-8-sig")), key=lambda x: (x["region"], x["departement"], x["commune"])):
        k = (nettoie(r["region"]), nettoie(r["departement"]), norm(r["commune"])); appariement = "exact"
        if k not in off:
            cand = par_rc.get((k[0], k[2]), [])
            k, appariement = (cand[0], "region+commune") if len(cand) == 1 else (None, "aucun")
        p_site = int(r["population"])
        p23, p33 = (off[k][2023], off[k][2033]) if k else (None, None)
        utilisee = 1 if k and p23 == p_site else 0
        remarque = "" if utilisee else ("aucune correspondance dans le tableau" if not k else "population 2023 du tableau différente de celle du recensement du site : projection officielle non utilisée")
        sortie.append({"region": r["region"], "departement": r["departement"], "commune": r["commune"], "population_2023_site": p_site, "population_2023_ansd": p23 if p23 is not None else "",
                       "population_2033_ansd": p33 if p33 is not None else "", "appariement": appariement, "utilisee": utilisee, "remarque": remarque})
    with open(SORTIE, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(sortie[0])); w.writeheader(); w.writerows(sortie)
    u = [x for x in sortie if x["utilisee"]]
    print(f"{len(sortie)} communes ; projection officielle utilisée pour {len(u)} (écartées : {len(sortie) - len(u)}) ; appariement exact : {sum(1 for x in sortie if x['appariement'] == 'exact')}, région+commune : {sum(1 for x in sortie if x['appariement'] == 'region+commune')}")
    print(f"population 2033 officielle des communes utilisées : {sum(x['population_2033_ansd'] for x in u):,}".replace(",", " "), "| population totale du pays en 2033 (tableau national) : 23 504 174")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
