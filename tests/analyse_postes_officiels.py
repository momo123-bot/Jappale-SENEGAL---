#!/usr/bin/env python3
"""Recale la couche des postes de santé sur les nombres officiels de 2022, et compare nos indicateurs de santé au ressenti de distance
des femmes (EDS-Continue 2017). Entrées : docs/data.js, donnees/postes_sante_region_2022.csv, donnees/eds_distance_region_2017.csv.

Hypothèse du recalage : dans chaque région, tous les postes de la couche sont réduits dans la même proportion, car on ne sait pas lesquels sont en trop.
Usage :  python3 tests/analyse_postes_officiels.py
"""
import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]


def norm(s):
    return re.sub(r"[^A-Z]", "", unicodedata.normalize("NFD", s.upper()).encode("ascii", "ignore").decode())


def lire(nom):
    return list(csv.DictReader(open(RACINE / "donnees" / nom, encoding="utf-8-sig")))


def communes_site():
    d = (RACINE / "docs" / "data.js").read_text(encoding="utf-8")
    return json.loads(d[d.index("["):d.rindex("]") + 1])


def postes_officiels():
    return {norm(r["region"]): int(r["postes_sante_2022"]) for r in lire("postes_sante_region_2022.csv")}


def facteurs(data=None):
    data = data or communes_site(); nous = defaultdict(int)
    for o in data: nous[norm(o["r"])] += o["np"]
    off = postes_officiels(); return {k: off[k] / nous[k] for k in off}


def deficits(recale, data=None):
    data = data or communes_site(); f = facteurs(data) if recale else None
    return [(o["n"], o["d"], norm(o["r"]), max(0.0, o["bp"] - o["np"] * (f[norm(o["r"])] if f else 1.0))) for o in data]


def scenario():
    base, cal = deficits(False), deficits(True)
    top = lambda L: [(a, b) for a, b, _, _ in sorted(L, key=lambda x: -x[3])[:10]]
    tb, tc = top(base), top(cal)
    return {"total_actuel": sum(x[3] for x in base), "total_recale": sum(x[3] for x in cal), "recouvrement": len([x for x in tb if x in tc]),
            "premier_actuel": tb[0][0], "premier_recale": tc[0][0], "postes_recales": sum(o["np"] * facteurs()[norm(o["r"])] for o in communes_site())}


def ressenti():
    return {norm(r["region"]): float(r["femmes_distance_probleme_pct"]) for r in lire("eds_distance_region_2017.csv")}


def rangs(v):
    s = sorted(v, key=lambda k: v[k]); return {k: i + 1 for i, k in enumerate(s)}


def spearman(a, b):
    ra, rb = rangs(a), rangs(b); n = len(a)
    return 1 - 6 * sum((ra[k] - rb[k]) ** 2 for k in a) / (n * (n * n - 1))


def correlations():
    data = communes_site(); sc = lire("score_final_corrige.csv"); res = ressenti(); reg = list(res)
    pop, sans, deficit, hk = defaultdict(float), defaultdict(float), defaultdict(float), defaultdict(float)
    for r in sc:
        k = norm(r["region"]); p = float(r["population"]); pop[k] += p; sans[k] += p if int(r["nb_poste_sante"]) == 0 else 0
    for o in data: k = norm(o["r"]); deficit[k] += o["dp"]; hk[k] += (o["hk"] or 0) * o["p"]
    par_poste = {norm(r["region"]): int(r["habitants_par_poste_sante"]) for r in lire("postes_sante_region_2022.csv")}
    ind = {"distance_hopital": {k: hk[k] / pop[k] for k in reg}, "population_sans_poste": {k: sans[k] / pop[k] * 100 for k in reg},
           "habitants_par_poste": {k: par_poste[k] for k in reg}, "manque_pour_100000": {k: deficit[k] / pop[k] * 1e5 for k in reg}}
    return {nom: spearman(res, v) for nom, v in ind.items()}


if __name__ == "__main__":
    s = scenario(); print(f"manque de postes : {s['total_actuel']:.1f} avec la couche, {s['total_recale']:.1f} recalée sur les nombres officiels ; postes {s['postes_recales']:.0f} ; recouvrement du top 10 : {s['recouvrement']}/10 ; premier : {s['premier_actuel']} / {s['premier_recale']}")
    for k, v in correlations().items(): print(f"corrélation de rang avec le ressenti de distance : {v:+.2f}  ({k})")
