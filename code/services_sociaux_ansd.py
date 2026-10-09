#!/usr/bin/env python3
"""Services sociaux de base géoréférencés remis par l'ANSD (pilote : Dakar, Diourbel, Thiès) : agrégation par commune.

Entrée  : le classeur Excel de l'ANSD « Données Services sociaux de base RGPH 2023 » (en argument ; trois feuilles : EDUCATION, SANTE, EAU-ASSAINISSEMENT),
          ../donnees/accessibilite_bassin.csv (les communes du site), ../docs/donnees-ouvertes/communes.json (nos distances, pour la comparaison).
Sortie  : ../donnees/services_sociaux_ansd_commune.csv (une ligne par commune des trois régions : nombre d'établissements par type, distances calculées).

Le classeur brut (6 449 + 2 902 + 705 points) n'est PAS dans le dépôt : il est remis par l'ANSD et sa diffusion est à confirmer avec elle. On ne publie que ces totaux par commune.
Rapprochement des communes : (région, département, commune) ; sinon (région, commune) si le nom est unique dans la région ; sinon la table d'alias ci-dessous
(quatre communes que l'ANSD et notre fichier écrivent différemment). Aucun point ne peut être perdu : le script vérifie que les totaux par commune redonnent ceux du classeur.
Usage :  python3 services_sociaux_ansd.py chemin/vers/Données_Services_sociaux_de_base_RGPH_2023.xlsx
"""
import csv
import json
import math
import re
import sys
import unicodedata
from collections import defaultdict

import pandas as pd

COMMUNES = "../donnees/accessibilite_bassin.csv"
OUVERTES = "../docs/donnees-ouvertes/communes.json"
SORTIE = "../donnees/services_sociaux_ansd_commune.csv"
TROIS = ("DAKAR", "DIOURBEL", "THIES")
# Écritures différentes entre le classeur de l'ANSD et notre fichier (région, nom ANSD normalisé) -> nom normalisé chez nous
ALIAS = {("DAKAR", "YENNE"): "YENE", ("DIOURBEL", "DENDEYEGOUYEGUI"): "DENDEYEGOUYGUI", ("DIOURBEL", "PATAR"): "PATTAR", ("THIES", "DIENDERGUEDJI"): "DIENDER"}
SANTE = {"postes": ["Poste de santé"], "centres_sante": ["Centre de santé"], "cases_sante": ["Case de santé"], "hopitaux": ["Hôpital public", "Hôpital privé"], "centres_medico_sociaux": ["Centre médico social"],
         "maternites": ["Maternité"], "cliniques_cabinets": ["Clinique", "Cabinet médical"], "pharmacies": ["Pharmacie"], "laboratoires": ["Laboratoire d'analyse médicale"]}
EDUCATION = {"petite_enfance": ["Ecole maternelle", "Jardin d'enfants", "Prescolaire", "Garderie d'enfants", "Case des tout-petits", "Centre d'éveil communautaire"], "elementaire_public": ["Ecole élémentaire publique"],
             "elementaire_prive": ["Ecole élémentaire privée"], "college_public": ["Collège public"], "college_prive": ["Collège privé"], "lycee_public": ["Lycée public"], "lycee_prive": ["Lycée privé"],
             "formation": ["Centre de formation", "Institut de formation"], "universites": ["Université publique", "Université privée"]}
EAU = {"forages": ["Forage"], "chateaux_eau": ["Château d'eau"]}


def norm(s):
    return re.sub(r"[^A-Z0-9]", "", unicodedata.normalize("NFD", str(s).upper()).encode("ascii", "ignore").decode())


def haversine(lat1, lon1, lat2, lon2):
    p = math.pi / 180; a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def plus_proche(lat, lon, points):
    return min((haversine(lat, lon, la, lo) for la, lo in points), default=None)


def main(xlsx):
    feuilles = {nom: pd.read_excel(xlsx, sheet_name=nom) for nom in ("EDUCATION", "SANTE", "EAU-ASSAINISSEMENT")}
    nos = [r for r in csv.DictReader(open(COMMUNES, encoding="utf-8-sig")) if norm(r["region"]) in TROIS]
    par_triplet = {(norm(r["region"]), norm(r["departement"]), norm(r["commune"])): r for r in nos}
    par_rc = defaultdict(list)
    for r in nos:
        par_rc[(norm(r["region"]), norm(r["commune"]))].append(r)
    ouvertes = {(norm(c["region"]), norm(c["departement"]), norm(c["commune"])): c for c in json.load(open(OUVERTES, encoding="utf-8"))["communes"]} if False else {}
    try:
        brut = json.load(open(OUVERTES, encoding="utf-8")); liste = brut["communes"] if isinstance(brut, dict) else brut
        ouvertes = {(norm(c["region"]), norm(c["departement"]), norm(c["commune"])): c for c in liste}
    except Exception:
        ouvertes = {}

    def trouver(region, dept, commune):
        k = (norm(region), norm(dept), norm(commune))
        if k in par_triplet: return par_triplet[k], "exact"
        cand = par_rc.get((norm(region), norm(commune)), [])
        if len(cand) == 1: return cand[0], "region+commune"
        alias = ALIAS.get((norm(region), norm(commune)))
        if alias and len(par_rc.get((norm(region), alias), [])) == 1: return par_rc[(norm(region), alias)][0], "alias"
        return None, "aucun"

    compte = defaultdict(lambda: defaultdict(int)); mode = {}; points = defaultdict(lambda: defaultdict(list)); sans = defaultdict(int)
    categories = {"SANTE": SANTE, "EDUCATION": EDUCATION, "EAU-ASSAINISSEMENT": EAU}
    for nom, df in feuilles.items():
        inverse = {t: cat for cat, types in categories[nom].items() for t in types}
        for ligne in df.itertuples(index=False):
            r, m = trouver(ligne.REGION, ligne.DEPARTEMENT, ligne.COMMUNE)
            if r is None: sans[nom] += 1; continue
            cle = (r["region"], r["departement"], r["commune"]); mode.setdefault(cle, m)
            cat = inverse.get(ligne.DESCRIPTIF)
            if cat is None: raise SystemExit(f"type inconnu dans {nom} : {ligne.DESCRIPTIF}")
            compte[cle][cat] += 1
            if cat in ("college_public", "college_prive", "lycee_public", "lycee_prive"): points[cle]["secondaire"].append((ligne.LATITUDE, ligne.LONGITUDE))
        # le total par commune doit redonner celui du classeur, moins les lignes sans commune reconnue
    ref_sec = [(float(a), float(b)) for cle in points for a, b in points[cle]["secondaire"]]
    hop = [(float(r.LATITUDE), float(r.LONGITUDE)) for r in feuilles["SANTE"].itertuples(index=False) if r.DESCRIPTIF in ("Hôpital public", "Hôpital privé")]
    colonnes = list(SANTE) + list(EDUCATION) + list(EAU)
    sortie = []
    for r in sorted(nos, key=lambda r: (r["region"], r["departement"], r["commune"])):
        cle = (r["region"], r["departement"], r["commune"]); c = compte.get(cle, {})
        lat, lon = (float(r["lat"]), float(r["lon"])) if r["lat"] not in ("", None) else (None, None)
        o = ouvertes.get((norm(r["region"]), norm(r["departement"]), norm(r["commune"])), {})
        ligne = {"region": r["region"], "departement": r["departement"], "commune": r["commune"], "population": r["population"], "postes_necessaires": r["besoin_poste_sante"], "postes_notre_couche": r["nb_poste_sante"]}
        ligne.update({k: c.get(k, 0) for k in colonnes})
        ligne["secondaire_notre_couche"] = r["nb_infra_education"]
        # même convention que notre fichier : 0 quand la commune a au moins un collège ou lycée (« sur place »), sinon distance depuis le centre de la commune au plus proche
        sec = sum(c.get(k, 0) for k in ("college_public", "college_prive", "lycee_public", "lycee_prive"))
        ligne["distance_secondaire_ansd_km"] = 0.0 if sec > 0 else ("" if lat is None or not ref_sec else round(plus_proche(lat, lon, ref_sec), 1))
        ligne["distance_secondaire_notre_couche_km"] = o.get("distance_secondaire_km", "")
        ligne["distance_hopital_ansd_km"] = "" if lat is None else round(plus_proche(lat, lon, hop), 1)
        ligne["distance_hopital_notre_couche_km"] = o.get("distance_hopital_km", "")
        ligne["appariement"] = mode.get(cle, "aucune ligne")
        sortie.append(ligne)
    # contrôle d'intégrité : rien ne se perd
    for nom, cats in (("SANTE", SANTE), ("EDUCATION", EDUCATION), ("EAU-ASSAINISSEMENT", EAU)):
        total = len(feuilles[nom]) - sans[nom]; somme = sum(l[k] for l in sortie for k in cats)
        assert somme == total, (nom, somme, total)
    with open(SORTIE, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(sortie[0])); w.writeheader(); w.writerows(sortie)
    print(f"{len(sortie)} communes des trois régions ; lignes du classeur sans commune reconnue : {dict(sans) or 'aucune'} ; modes de rapprochement : {dict(pd.Series([l['appariement'] for l in sortie]).value_counts())}")
    print("totaux :", {nom: len(df) for nom, df in feuilles.items()})


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
