"""
Étape 4 - Taux de croissance démographique réel, 2013 -> 2023

Entrées :
    donnees_brutes/projections-demographiques.xlsx (RGPHAE 2013, ANSD, via HDX)
    ../donnees/rgph5_localites_nettoye.csv          (étape 1)
Sortie :
    ../donnees/croissance_2013_2023.csv

Le fichier source utilise l'ancien découpage administratif (avant les
réformes territoriales de 2021 notamment). Trois communes sont exclues après
investigation manuelle (voir note méthodologique) car leur territoire a été
redécoupé entre 2013 et 2023, ce qui fausse le calcul de croissance :
Keur Massar, Sicap Liberté, Guinaw Rail Nord.

Dépendances : openpyxl, rapidfuzz
"""

import csv
import json
import unicodedata
import re
from collections import defaultdict
import openpyxl
from rapidfuzz import fuzz, process

FICHIER_2013 = "donnees_brutes/projections-demographiques.xlsx"
RGPH5 = "../donnees/rgph5_localites_nettoye.csv"
SORTIE = "../donnees/croissance_2013_2023.csv"

COMMUNES_EXCLUES = {"KEUR MASSAR", "SICAP LIBERTE", "GUINAW RAIL NORD"}
SEUIL_RAPPROCHEMENT = 78


def normaliser(s):
    if s is None:
        return ""
    s = str(s).upper().strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def extraire_2013(chemin):
    """Le fichier empile 14 blocs régionaux les uns sous les autres. Chaque
    ligne commençant par CA./CR./COM. est une localité de niveau fin."""
    wb = openpyxl.load_workbook(chemin, data_only=True, read_only=True)
    ws = wb["Feuil1"]
    lignes = list(ws.iter_rows(values_only=True))

    debuts_bloc = [i for i, r in enumerate(lignes) if r[0] and "PROJECTION DE LA POPULATION" in str(r[0])]
    debuts_bloc.append(len(lignes))

    entites = []
    for i in range(len(debuts_bloc) - 1):
        bloc = lignes[debuts_bloc[i]:debuts_bloc[i + 1]]
        region = None
        for r in bloc:
            if r[0] and str(r[0]).strip().upper().startswith("REGION"):
                region = str(r[0]).replace("REGION", "").replace("DE ", "").strip()
                break
        for r in bloc:
            nom = r[0]
            if not nom:
                continue
            nom = str(nom).strip()
            upper = nom.upper()
            if upper.startswith(("CA.", "CR.", "COM.")):
                nom_propre = nom.split(".", 1)[1].strip()
                pop_2013 = r[3]  # colonne "Ensemble" de l'année de base 2013
                if pop_2013 and int(pop_2013) > 0:
                    entites.append({"region": region, "nom": nom_propre, "pop_2013": int(pop_2013)})
    return entites


def charger_population_2023_par_commune(chemin):
    agg = defaultdict(int)
    with open(chemin, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            try:
                pop = int(r["POPULATION"])
            except ValueError:
                continue
            cle = (normaliser(r["Region"]), normaliser(r["COMMUNE"]))
            agg[cle] += pop
    return agg


if __name__ == "__main__":
    entites_2013 = extraire_2013(FICHIER_2013)
    print(f"Entités 2013 extraites : {len(entites_2013)}")

    pop_2023 = charger_population_2023_par_commune(RGPH5)
    par_region_2023 = defaultdict(list)
    for (reg, commune) in pop_2023:
        par_region_2023[reg].append(commune)

    resultats = []
    non_apparies = 0
    for e in entites_2013:
        reg = normaliser(e["region"])
        nom = normaliser(e["nom"])
        if nom.upper() in COMMUNES_EXCLUES:
            continue
        candidats = par_region_2023.get(reg, [])
        if not candidats:
            non_apparies += 1
            continue
        meilleur = process.extractOne(nom, candidats, scorer=fuzz.token_sort_ratio)
        if not meilleur or meilleur[1] < SEUIL_RAPPROCHEMENT:
            non_apparies += 1
            continue
        commune_2023 = meilleur[0]
        pop_2023_val = pop_2023[(reg, commune_2023)]
        taux = (pop_2023_val / e["pop_2013"]) ** (1 / 10) - 1
        resultats.append({
            "region": reg, "commune_2023": commune_2023,
            "population_2013": e["pop_2013"], "population_2023": pop_2023_val,
            "taux_croissance_annuel_pct": round(taux * 100, 2),
        })

    print(f"Communes appariées avec succès : {len(resultats)}")
    print(f"Non appariées ou exclues : {non_apparies + len(COMMUNES_EXCLUES)}")

    taux_tries = sorted(r["taux_croissance_annuel_pct"] for r in resultats)
    mediane = taux_tries[len(taux_tries) // 2]
    print(f"Taux médian national : {mediane}%/an (référence officielle : 2,9%/an)")

    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(resultats[0].keys()))
        w.writeheader()
        w.writerows(resultats)
    print(f"Fichier écrit : {SORTIE}")
