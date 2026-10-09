"""
Étape 8 - Génération des données de la maquette

Entrée : ../donnees/accessibilite_bassin.csv (étape 7)
Sortie : ../maquette/data.js et ../docs/data.js (identiques)

Pourquoi ce script : jusqu'ici, les totaux par région affichés dans l'interface
étaient recopiés à la main dans le code, ce qui a déjà produit des valeurs
périmées. Désormais, tout ce que l'interface affiche (communes et totaux
régionaux) sort directement du pipeline : relancer les étapes 1 à 7 puis
celle-ci suffit à tout mettre à jour.

Champs de fiabilité ajoutés pour chaque commune :
    fb : 1 si des infrastructures ont été rattachées à la commune (coordonnées
         connues), 0 sinon ("à confirmer")
    tm : 1 si la croissance 2013-2023 a été mesurée, 0 si la médiane nationale
         a été utilisée en valeur de repli (scénario 2033 alors indicatif)

Projection officielle de l'ANSD (2023-2073), ajoutée pour comparer au scénario 2033 du site :
    p33o  : population 2033 de la commune selon la projection officielle (null si non utilisée)
    dp33o : postes de santé manquants en 2033 avec cette population (null si non utilisée)
"""

import csv
import json
import math
import os
import re
import unicodedata
from collections import defaultdict

ENTREE = "../donnees/accessibilite_bassin.csv"
INFRASTRUCTURES = "../donnees/infrastructures_geolocalisees.csv"
PROJECTIONS = "../donnees/projections_ansd_communes.csv"   # étape facultative : projections_officielles.py
NORME_POSTE = 10_000
NORME_HOPITAL = 150_000
SORTIES = ["../maquette/data.js", "../docs/data.js"]


def normaliser(s):
    s = unicodedata.normalize("NFKD", str(s).upper()).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", s)).strip()


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nom_affiche(nom):
    """HOPITAL REGIONAL DE MATAM -> Hôpital Régional de Matam"""
    petits = {"de", "du", "des", "et", "la", "le", "d"}
    mots = [m if m in petits else m.capitalize() for m in nom.lower().split()]
    return " ".join(mots).replace("Hopital", "Hôpital").replace("Regional", "Régional")


def entier(x, defaut=0):
    return int(x) if x not in (None, "") else defaut


def flottant(x):
    return float(x) if x not in (None, "") else None


if __name__ == "__main__":
    lignes = list(csv.DictReader(open(ENTREE, encoding="utf-8-sig")))
    structures = [i for i in csv.DictReader(open(INFRASTRUCTURES, encoding="utf-8-sig")) if i["type_structure"] == "hopital"]
    # La couche "hôpital" contient 50 structures, dont 6 établissements psychiatriques ou de médecine
    # traditionnelle. Ils restent comptés dans les effectifs (comme à la source), mais ne sont pas retenus
    # comme "hôpital le plus proche" : ils ne remplacent pas un hôpital général pour l'accès aux soins.
    SPECIALISES = re.compile(r"PSYCHIATR|TRADITION")
    hopitaux = [(nom_affiche(i["nom"]) if i.get("nom") else "Hôpital (nom non renseigné)", float(i["latitude"]), float(i["longitude"]), normaliser(i["region"]))
                for i in structures]
    hopitaux_generaux = [(nom_affiche(i["nom"]), float(i["latitude"]), float(i["longitude"]))
                         for i in structures if i.get("nom") and not SPECIALISES.search(i["nom"])]

    def hopital_le_plus_proche(lat, lon):
        d, nom = min((haversine_km(lat, lon, la, lo), n) for n, la, lo in hopitaux_generaux)
        return nom, round(d)

    projections = {(x["region"], x["departement"], x["commune"]): int(x["population_2033_ansd"])
                   for x in csv.DictReader(open(PROJECTIONS, encoding="utf-8-sig")) if x["utilisee"] == "1"}
    communes = []
    for r in lignes:
        p33o = projections.get((r["region"], r["departement"], r["commune"]))
        proche = hopital_le_plus_proche(float(r["lat"]), float(r["lon"])) if r["lat"] else (None, None)
        communes.append({
            "n": r["commune"].strip().title(),
            "r": r["region"].strip().title(),
            "d": r["departement"].strip().title(),
            "p": entier(r["population"]),
            "dp": entier(r["deficit_poste_sante"]),
            "np": entier(r["nb_poste_sante"]),
            "bp": entier(r["besoin_poste_sante"]),
            "nc": entier(r["nb_centre_departement"]),
            "bc": entier(r["besoin_centre_departement"]),
            "dcd": entier(r["deficit_centre_departement"]),
            "nh": entier(r["nb_hopital_departement"]),
            "bh": entier(r["besoin_hopital_departement"]),
            "dhd": entier(r["deficit_hopital_departement"]),
            "ne": entier(r["nb_infra_education"]),
            "ns": entier(r["nb_centres_commune"]) + entier(r["nb_hopitaux_commune"]),
            "nu": entier(r["nb_univ_publiques"]),
            "nv": entier(r["nb_espaces_uvs"]),
            "lat": flottant(r["lat"]),
            "lon": flottant(r["lon"]),
            "dp33": entier(r["deficit_sante_commune_2033_amorti"]) if r.get("deficit_sante_commune_2033_amorti") else None,
            "p33o": p33o,
            "dp33o": max(0, math.ceil(p33o / NORME_POSTE) - entier(r["nb_poste_sante"])) if p33o else None,
            "sc": flottant(r.get("score_combine")),
            "dpb": flottant(r.get("deficit_bassin")),
            "pab": flottant(r.get("postes_accessibles_bassin")),
            "fb": 1 if r["lat"] else 0,
            "tm": 1 if r.get("source_taux") == "mesure_reelle_2013_2023" else 0,
            "hp": proche[0],
            "hk": proche[1],
        })

    regions = defaultdict(lambda: {"pop": 0, "deficitPoste": 0, "deficitBassin": 0.0,
                                   "nbCommunes": 0, "nbEduc": 0, "nbUniv": 0, "nbEno": 0, "nbConfirmees": 0})
    for c in communes:
        cle = c["r"].upper().replace(" ", "_")
        a = regions[cle]
        a["pop"] += c["p"]
        a["deficitPoste"] += c["dp"]
        a["deficitBassin"] += c["dpb"] or 0.0
        a["nbCommunes"] += 1
        a["nbEduc"] += c["ne"]
        a["nbUniv"] += c["nu"]
        a["nbEno"] += c["nv"]
        a["nbConfirmees"] += c["fb"]
    # hôpitaux à l'échelle de la région (un hôpital dessert aussi les départements voisins)
    hopitaux_par_region = defaultdict(int)
    for _, _, _, reg in hopitaux:
        hopitaux_par_region[reg] += 1
    for c in communes:
        a = regions[c["r"].upper().replace(" ", "_")]
        a["nbHopitaux"] = hopitaux_par_region.get(normaliser(c["r"]), 0)
    for a in regions.values():
        a["deficitBassin"] = round(a["deficitBassin"], 1)
        a["besoinHopitaux"] = math.ceil(a["pop"] / NORME_HOPITAL)

    contenu = (
        "// Données générées par code/08_generer_donnees_maquette.py à partir de\n"
        "// donnees/accessibilite_bassin.csv. Ne pas éditer à la main : relancer le pipeline.\n"
        "const COMMUNES_DATA = " + json.dumps(communes, ensure_ascii=False) + ";\n"
        "const REGION_STATS = " + json.dumps(regions, ensure_ascii=False, sort_keys=True) + ";\n"
    )
    ecrits = []
    for chemin in SORTIES:
        dossier = os.path.dirname(chemin)
        # dans le depot livrable, seul docs/ existe : on n'invente pas de dossier maquette/
        if not os.path.isdir(dossier) and not chemin.startswith("../docs"):
            continue
        os.makedirs(dossier, exist_ok=True)
        ecrits.append(chemin)
        with open(chemin, "w", encoding="utf-8") as f:
            f.write(contenu)

    # Pilote ANSD (Dakar, Diourbel, Thiès) : totaux par commune des services sociaux de base géoréférencés (donnees/services_sociaux_ansd_commune.csv, produit par services_sociaux_ansd.py)
    try:
        lignes_pilote = list(csv.DictReader(open("../donnees/services_sociaux_ansd_commune.csv", encoding="utf-8-sig")))
    except FileNotFoundError:
        lignes_pilote = []
    if lignes_pilote:
        cols = ["postes", "centres_sante", "cases_sante", "hopitaux", "centres_medico_sociaux", "maternites", "cliniques_cabinets", "pharmacies", "laboratoires", "petite_enfance", "elementaire_public", "elementaire_prive",
                "college_public", "college_prive", "lycee_public", "lycee_prive", "formation", "universites", "forages", "chateaux_eau", "postes_notre_couche", "secondaire_notre_couche",
                "distance_secondaire_ansd_km", "distance_secondaire_notre_couche_km", "distance_hopital_ansd_km", "distance_hopital_notre_couche_km"]
        existantes = {f'{c["r"]}|{c["d"]}|{c["n"]}' for c in communes}; pilote = {}
        for l in lignes_pilote:
            cle = "|".join(l[x].strip().title() for x in ("region", "departement", "commune")); assert cle in existantes, cle
            pilote[cle] = [None if l[x] == "" else (float(l[x]) if "distance" in x else int(float(l[x]))) for x in cols]
        with open("../docs/pilote.js", "w", encoding="utf-8") as f:
            f.write("// Services sociaux de base géoréférencés remis par l'ANSD (pilote : Dakar, Diourbel, Thiès) : totaux par commune. Généré par code/08_generer_donnees_maquette.py\n// à partir de donnees/services_sociaux_ansd_commune.csv. Les points eux-mêmes ne sont pas publiés.\n")
            f.write("const PILOTE_COLONNES = " + json.dumps(cols) + ";\nconst PILOTE = " + json.dumps(pilote, ensure_ascii=False, separators=(",", ":")) + ";\n")
        print(f"pilote ANSD : {len(pilote)} communes écrites dans ../docs/pilote.js")
    print(f"{len(communes)} communes, {len(regions)} régions écrites dans : {', '.join(ecrits)}")
    print(f"Communes à données confirmées : {sum(c['fb'] for c in communes)} / {len(communes)}")
