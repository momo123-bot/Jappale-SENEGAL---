#!/usr/bin/env python3
"""Publie les données dérivées du projet en formats ouverts (JSON) et prépare les données complémentaires du site.

Sorties (toutes déterministes : relancer le script ne change rien si les données n'ont pas changé) :
  docs/donnees-ouvertes/communes.json            une ligne par commune
  docs/donnees-ouvertes/regions.json             personnel de santé par région (annuaire des ressources humaines 2022)
  docs/donnees-ouvertes/anomalies_signalees.csv  copie du registre des anomalies (donnees/anomalies_signalees.csv)
  docs/donnees-ouvertes/LISEZ-MOI.md             dictionnaire des champs, sources, limites, licence
  docs/complements.js                            personnel par région et isolement scolaire, lus par la fiche de décision

Entrées : docs/data.js (valeurs affichées par le site), donnees/score_final_corrige.csv,
donnees/infrastructures_geolocalisees.csv, donnees/personnel_sante_region_2022.csv.
Usage :  python3 code/exporter_donnees_ouvertes.py
"""
import csv
import json
import math
import re
import shutil
import unicodedata
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
DOCS = RACINE / "docs"
SORTIE = DOCS / "donnees-ouvertes"
VERSION = "7 octobre 2026"
NORME_MEDECIN, NORME_IDE, NORME_SFE = 10_000, 5_000, 1_500   # normes du Ministère de la Santé (voir la page Méthode)

# (nom du champ JSON, clé dans docs/data.js, description)
CHAMPS_COMMUNES = [
    ("id_commune", None, "Identifiant stable du projet : région, département et commune en minuscules sans accents, séparés par des tirets. À remplacer par un code officiel de commune dès qu'il existera (voir l'anomalie A06)."),
    ("commune", "n", "Nom de la commune (découpage du RGPH-5), écrit sans accents comme dans la source. Deux communes portent le même nom dans cinq cas : les distinguer par le département."),
    ("departement", "d", "Département."),
    ("region", "r", "Région."),
    ("population_2023", "p", "Habitants (RGPH-5, ANSD, 2023)."),
    ("latitude", "lat", "Degrés décimaux ; vide (null) pour deux communes non géolocalisées."),
    ("longitude", "lon", "Degrés décimaux ; vide (null) pour deux communes non géolocalisées."),
    ("postes_sante_existants", "np", "Postes de santé rattachés à la commune (couche Géo Sénégal, ANSD). Le total national est un ordre de grandeur : voir les limites."),
    ("postes_sante_necessaires", "bp", "Postes nécessaires selon la norme du Ministère de la Santé : 1 poste pour 10 000 habitants."),
    ("postes_sante_manquants", "dp", "Postes nécessaires moins postes existants, jamais négatif. Estimation, pas une mesure."),
    ("postes_sante_manquants_recale_2022", None, "Postes manquants si le nombre de postes de la région est ramené aux statistiques officielles de 2022 (réduction proportionnelle dans la région), arrondi à l'unité. La fourchette du manque va de postes_sante_manquants à cette valeur. Arrondi commune par commune : la somme sur les 553 communes (772) est inférieure au total non arrondi (environ 796)."),
    ("postes_sante_manquants_2033", "dp33", "Scénario 2033 indicatif ; vide (null) si non calculable."),
    ("population_2033_projection_ansd", "p33o", "Population 2033 selon la projection officielle de l'ANSD (Projections démographiques 2023-2073) ; vide (null) pour 9 communes où le tableau de projections et le recensement ne s'accordent pas (anomalie A13)."),
    ("postes_sante_manquants_2033_projection_ansd", "dp33o", "Postes de santé manquants en 2033 avec la population de la projection officielle ; vide (null) si elle n'est pas utilisée. À comparer à postes_sante_manquants_2033, qui vient de l'extrapolation du site."),
    ("postes_sante_manquants_vue_bassin", "dpb", "Postes manquants en partageant les postes des communes situées à moins de 15 km, arrondi à l'unité ; vide si non calculable."),
    ("centres_sante_departement", "nc", "Centres de santé du département (échelle département, pas commune)."),
    ("centres_sante_necessaires_departement", "bc", "Centres nécessaires dans le département : 1 centre pour 50 000 habitants."),
    ("hopitaux_departement", "nh", "Hôpitaux du département (échelle département). Voir les limites : la couche mêle hôpitaux, annexes et établissements spécialisés."),
    ("hopitaux_necessaires_departement", "bh", "Hôpitaux nécessaires dans le département : 1 hôpital pour 150 000 habitants."),
    ("etablissements_secondaires", "ne", "Collèges et lycées, publics et privés, recensés dans la commune. Aucune norme officielle de densité n'a été trouvée."),
    ("hopital_le_plus_proche", "hp", "Nom de l'hôpital le plus proche ; vide si non calculé."),
    ("distance_hopital_km", "hk", "Distance à vol d'oiseau jusqu'à cet hôpital, en kilomètres. Ce n'est pas un temps de trajet."),
    ("distance_secondaire_km", None, "Distance à vol d'oiseau jusqu'au collège ou lycée le plus proche, en kilomètres, arrondie à 0,1 ; 0 si la commune en compte au moins un ; vide (null) si la commune n'est pas géolocalisée."),
    ("fiabilite_rattachement", None, "verifiee si des infrastructures ont pu être rattachées à la commune, a_confirmer sinon (deux communes)."),
    ("croissance", None, "mesuree_2013_2023 si la croissance de la commune a été mesurée entre deux recensements, sinon indicative (scénario 2033 indicatif)."),
]
CHAMPS_REGIONS = [
    ("region", "Région."), ("cle_region", "Clé de la région utilisée par le site (majuscules, tiret bas)."),
    ("annee", "Année de l'annuaire : 2022, le plus récent trouvé."),
    ("population_2022", "Population de la région dans l'annuaire."), ("medecins", "Médecins du secteur public."),
    ("infirmiers_diplomes_etat", "Infirmiers diplômés d'État (IDE)."), ("sages_femmes_etat", "Sages-femmes d'État."),
    ("femmes_age_reproduction", "Femmes en âge de procréer (FAR)."),
    ("medecins_pour_10000_habitants", "Médecins pour 10 000 habitants ; la norme est 1."),
    ("ide_pour_5000_habitants", "IDE pour 5 000 habitants ; la norme est 1."),
    ("sages_femmes_pour_1500_far", "Sages-femmes pour 1 500 femmes en âge de procréer ; la norme est 1."),
    ("couverture_des_normes_pct", "Moyenne des trois rapports, chacun plafonné à 100 %, en pourcentage entier."),
    ("postes_sante_2022", "Postes de santé publics en 2022 : population divisée par la population couverte par poste (annuaire statistique 2022 du Ministère de la Santé, tel que cité par le rapport Countdown 2030), arrondie."),
    ("femmes_distance_probleme_2017_pct", "Part des femmes de 15 à 49 ans pour qui la distance à l'établissement de santé était un problème important (EDS-Continue 2017, tableau 9.14, ANSD)."),
    ("tbs_secondaire_16_18_pct", "Taux brut de scolarisation au secondaire (16-18 ans) dans la région, en pourcentage (RGPH-5, 2023, rapport définitif du thème II, graphique II-11)."),
    ("tns_secondaire_16_18_pct", "Taux net de scolarisation au secondaire (16-18 ans) dans la région, en pourcentage : part des 16-18 ans qui fréquentent le secondaire (RGPH-5, 2023, même source). Moyenne nationale : 14,0 %."),
    ("femmes_interrogees_2017", "Effectif de l'échantillon de l'EDS-Continue 2017 dans la région (réduit pour Kédougou : 158, donc plus incertain)."),
]


def norm(s):
    return re.sub(r"[^A-Z0-9]", "", unicodedata.normalize("NFD", s.upper()).encode("ascii", "ignore").decode())


def arrondi(x):
    return int(math.floor(x + 0.5))


def km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2); dp = p2 - p1; dl = math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def lire(nom):
    return list(csv.DictReader(open(RACINE / "donnees" / nom, encoding="utf-8-sig")))


def communes_site():
    d = (DOCS / "data.js").read_text(encoding="utf-8")
    return json.loads(d[d.index("["):d.rindex("]") + 1])


def isolement_par_commune():
    """{(nom, département) normalisés : km au collège ou lycée le plus proche}, 0 si la commune en compte un. Même règle que tests/analyse_isolement_scolaire.py."""
    etab = [(float(r["latitude"]), float(r["longitude"])) for r in lire("infrastructures_geolocalisees.csv")
            if r["categorie"] == "education" and r["type_structure"] in ("college", "lycee") and r["latitude"] and r["longitude"]]
    out = {}
    for r in lire("score_final_corrige.csv"):
        if not r["lat"]: continue
        lat, lon = float(r["lat"]), float(r["lon"])
        out[(norm(r["commune"]), norm(r["departement"]))] = 0.0 if int(r["nb_infra_education"]) > 0 else min(km(lat, lon, a, b) for a, b in etab)
    return out


def personnel_par_region():
    postes = {norm(r["region"]): int(r["postes_sante_2022"]) for r in lire("postes_sante_region_2022.csv")}
    eds = {norm(r["region"]): r for r in lire("eds_distance_region_2017.csv")}
    scol = {norm(r["region"]): r for r in lire("rgph5_scolarisation_secondaire_region.csv")}
    sortie = []
    for l in lire("personnel_sante_region_2022.csv"):
        pop, far = int(l["population_2022"]), int(l["femmes_age_reproduction"])
        m, i, s = int(l["medecins"]) / pop * NORME_MEDECIN, int(l["infirmiers_diplomes_etat"]) / pop * NORME_IDE, int(l["sages_femmes_etat"]) / far * NORME_SFE
        sortie.append(dict(region=l["region"].title(), cle_region=l["region"].replace("-", " ").replace(" ", "_"), annee=2022, population_2022=pop,
                           medecins=int(l["medecins"]), infirmiers_diplomes_etat=int(l["infirmiers_diplomes_etat"]), sages_femmes_etat=int(l["sages_femmes_etat"]),
                           femmes_age_reproduction=far, medecins_pour_10000_habitants=round(m, 2), ide_pour_5000_habitants=round(i, 2),
                           sages_femmes_pour_1500_far=round(s, 2), couverture_des_normes_pct=round(sum(min(1.0, x) for x in (m, i, s)) / 3 * 100),
                           postes_sante_2022=postes[norm(l["region"])], femmes_distance_probleme_2017_pct=float(eds[norm(l["region"])]["femmes_distance_probleme_pct"]), femmes_interrogees_2017=int(eds[norm(l["region"])]["femmes_interrogees"]),
                           tbs_secondaire_16_18_pct=float(scol[norm(l["region"])]["tbs_secondaire_16_18_pct"]), tns_secondaire_16_18_pct=float(scol[norm(l["region"])]["tns_secondaire_16_18_pct"])))
    return sortie


def facteurs_recalage(data):
    nous = defaultdict(int)
    for o in data: nous[norm(o["r"])] += o["np"]
    off = {norm(r["region"]): int(r["postes_sante_2022"]) for r in lire("postes_sante_region_2022.csv")}
    return {k: off[k] / nous[k] for k in off}


def identifiant(o):
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFD", f"{o['r']} {o['d']} {o['n']}".lower()).encode("ascii", "ignore").decode()).strip("-")


def construire():
    iso = isolement_par_commune(); communes = []; fac = facteurs_recalage(communes_site())
    for o in communes_site():
        d = iso.get((norm(o["n"]), norm(o["d"])))
        ligne = {}
        for nom, cle, _ in CHAMPS_COMMUNES:
            if cle: ligne[nom] = o.get(cle)
        ligne["id_commune"] = identifiant(o); ligne["postes_sante_manquants_recale_2022"] = arrondi(max(0.0, o["bp"] - o["np"] * fac[norm(o["r"])]))
        ligne["postes_sante_manquants_vue_bassin"] = None if o.get("dpb") is None else arrondi(o["dpb"])
        ligne["distance_secondaire_km"] = None if d is None else round(d, 1)
        ligne["fiabilite_rattachement"] = "verifiee" if o.get("fb") == 1 else "a_confirmer"
        ligne["croissance"] = "mesuree_2013_2023" if o.get("tm") == 1 else "indicative"
        communes.append({nom: ligne[nom] for nom, _, _ in CHAMPS_COMMUNES})
    assert len({c["id_commune"] for c in communes}) == len(communes), "identifiants de commune en double"
    return communes, personnel_par_region()


def json_lignes(objets):
    return "[\n" + ",\n".join(json.dumps(o, ensure_ascii=False) for o in objets) + "\n]\n"


def complements_js(communes, regions):
    pers = {r["cle_region"]: {"couverture": r["couverture_des_normes_pct"], "medecins": r["medecins_pour_10000_habitants"], "ide": r["ide_pour_5000_habitants"], "sfe": r["sages_femmes_pour_1500_far"]} for r in regions}
    iso = {f"{c['commune']}|{c['departement']}": c["distance_secondaire_km"] for c in communes}
    rec = {r["cle_region"]: round(facteurs_recalage(communes_site())[norm(r["region"])], 6) for r in regions}
    res = {r["cle_region"]: {"pct": r["femmes_distance_probleme_2017_pct"], "n": r["femmes_interrogees_2017"]} for r in regions}
    scol = {r["cle_region"]: {"tbs": r["tbs_secondaire_16_18_pct"], "tns": r["tns_secondaire_16_18_pct"]} for r in regions}
    nat = next(x for x in lire("rgph5_scolarisation_secondaire_region.csv") if norm(x["region"]) == "SENEGAL"); scol["NATIONAL"] = {"tbs": float(nat["tbs_secondaire_16_18_pct"]), "tns": float(nat["tns_secondaire_16_18_pct"])}
    return ("// Données complémentaires générées par code/exporter_donnees_ouvertes.py. Ne pas éditer à la main : relancer le script.\n"
            "// PERSONNEL_REGION : couverture des normes du Ministère par région (annuaire des ressources humaines 2022).\n"
            "// ISOLEMENT_SECONDAIRE : kilomètres à vol d'oiseau jusqu'au collège ou lycée le plus proche (0 si la commune en compte un ; null si non géolocalisée).\n"
            f"const PERSONNEL_REGION = {json.dumps(pers, ensure_ascii=False)};\nconst ISOLEMENT_SECONDAIRE = {json.dumps(iso, ensure_ascii=False)};\n"
            "// RECALAGE_POSTES : facteur appliqué aux postes de la couche pour retrouver le nombre officiel de 2022 dans la région (fourchette du manque de postes).\n"
            f"const RECALAGE_POSTES = {json.dumps(rec, ensure_ascii=False)};\n"
            "// SCOLARISATION_REGION : taux brut et net de scolarisation au secondaire (16-18 ans) par région et pour le pays (RGPH-5, 2023, thème II).\n"
            f"const SCOLARISATION_REGION = {json.dumps(scol, ensure_ascii=False)};\n"
            "// RESSENTI_DISTANCE_REGION : part des femmes de 15 à 49 ans pour qui la distance à l'établissement de santé est un problème important (EDS-Continue 2017, tableau 9.14) et taille de l'échantillon.\n"
            f"const RESSENTI_DISTANCE_REGION = {json.dumps(res, ensure_ascii=False)};\n")


def schema_communes(communes):
    props = {}
    for nom, _, desc in CHAMPS_COMMUNES:
        types = {"null" if c[nom] is None else "integer" if isinstance(c[nom], int) else "number" if isinstance(c[nom], float) else "string" for c in communes}
        if "integer" in types and "number" in types: types.discard("integer")
        t = sorted(types - {"null"}) + (["null"] if "null" in types else [])
        props[nom] = {"type": t[0] if len(t) == 1 else t, "description": desc}
    return {"$schema": "https://json-schema.org/draft/2020-12/schema", "title": "communes.json : une entrée par commune", "type": "array", "items": {"type": "object", "properties": props, "required": [n for n, _, _ in CHAMPS_COMMUNES], "additionalProperties": False}}


def lisez_moi():
    lignes_c = "\n".join(f"| `{n}` | {desc} |" for n, _, desc in CHAMPS_COMMUNES)
    lignes_r = "\n".join(f"| `{n}` | {desc} |" for n, desc in CHAMPS_REGIONS)
    return f"""# Données ouvertes de Jàppale Sénégal

Version du {VERSION} (journal des versions : `donnees/CHANGELOG_DONNEES.md`). Ces fichiers reprennent les valeurs affichées par le site, dans des formats que tout outil peut lire (JSON, CSV).

## Fichiers

- `communes.json` : une entrée par commune (553 communes).
- `schema-communes.json` : le schéma (JSON Schema) de `communes.json` : champs, types, valeurs vides permises.
- `regions.json` : le personnel de santé par région (14 régions), d'après l'annuaire des ressources humaines 2022 du Ministère de la Santé.
- `anomalies_signalees.csv` : le registre des anomalies repérées dans les couches de données (voir la page Méthode du site).

## Licence et réutilisation

Ces données dérivées sont publiées sous la licence **Open Data Commons Attribution (ODC-By 1.0)** : vous pouvez les copier, les modifier et les réutiliser, y compris à des fins commerciales, à condition de citer « Jàppale Sénégal, d'après les données de l'ANSD ». Le code est sous licence MIT.
Les données sources appartiennent à l'ANSD et à ses partenaires : leurs conditions d'utilisation continuent de s'appliquer, et la compatibilité de cette licence avec elles reste à confirmer auprès de l'ANSD (voir `donnees/LICENCE_DONNEES.md`).

Mention de source exigée par l'accord de licence de données ouvertes de l'ANSD : « Source : Agence Nationale de la Statistique et de la Démographie. Contient des informations sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD. » Pour les produits adaptés : « Ce produit a été adapté à partir des informations de l'Agence Nationale de la Statistique et de la Démographie, qui sont sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD. »

## À lire avant d'utiliser

- Le nombre de postes manquants est **un ordre de grandeur, pas une mesure** : la couche des postes de santé en compte plus que les documents du Ministère de la Santé.
- Les distances sont **à vol d'oiseau**, pas des temps de trajet.
- Le personnel de santé n'est connu qu'au niveau de la région, et il date de 2022.
- Toutes les limites sont écrites dans la page Méthode du site (`methode.html`) et dans `methodologie/LIMITES.md` du dépôt.

## Champs de `communes.json`

| Champ | Signification |
|---|---|
{lignes_c}

## Champs de `regions.json`

| Champ | Signification |
|---|---|
{lignes_r}

## Exemples

Python : `import json; communes = json.load(open("communes.json", encoding="utf-8"))`

JavaScript : `const communes = await (await fetch("communes.json")).json();`
"""


def ecrire():
    communes, regions = construire(); SORTIE.mkdir(exist_ok=True)
    (SORTIE / "communes.json").write_text(json_lignes(communes), encoding="utf-8")
    (SORTIE / "regions.json").write_text(json_lignes(regions), encoding="utf-8")
    (SORTIE / "schema-communes.json").write_text(json.dumps(schema_communes(communes), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    shutil.copyfile(RACINE / "donnees" / "anomalies_signalees.csv", SORTIE / "anomalies_signalees.csv")
    (SORTIE / "LISEZ-MOI.md").write_text(lisez_moi(), encoding="utf-8")
    (DOCS / "complements.js").write_text(complements_js(communes, regions), encoding="utf-8")
    return communes, regions


if __name__ == "__main__":
    c, r = ecrire()
    print(f"{len(c)} communes, {len(r)} régions ; {sum(1 for x in c if x['distance_secondaire_km'] is None)} communes sans distance (non géolocalisées)")
    print("communes à plus de 15 km d'un collège ou lycée :", sum(1 for x in c if (x['distance_secondaire_km'] or 0) > 15))
