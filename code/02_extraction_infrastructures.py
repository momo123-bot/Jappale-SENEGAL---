"""
Étape 2 - Extraction des infrastructures de santé et d'éducation

Entrée : donnees_brutes/{centre_sante,poste_sante,hopital,college,lycee,universite}.zip
         (shapefiles fournis par l'ANSD / Géo Sénégal, projection UTM zone 28N)
Sortie : ../donnees/infrastructures_geolocalisees.csv

Ce script :
1. Décompresse chaque shapefile.
2. Convertit les coordonnées UTM zone 28N vers WGS84 (latitude/longitude
   standard), avec pyproj.
3. Rassemble tout dans un seul fichier avec le type de structure, la commune
   de rattachement (champ CCRCA du shapefile), le statut public ou privé (champ
   DESCRIPTIF de la couche source) et les coordonnées converties.

Dépendances : pyshp (`pip install pyshp`), pyproj (`pip install pyproj`)
"""

import csv
import re
import zipfile
import os
import shapefile
from pyproj import Transformer

DOSSIER_BRUT = "donnees_brutes"
DOSSIER_EXTRACTION = "_extraction_temp"
SORTIE = "../donnees/infrastructures_geolocalisees.csv"

FICHIERS = {
    "poste_sante": "sante",
    "centre_sante": "sante",
    "hopital": "sante",
    "college": "education",
    "lycee": "education",
    "universite": "education",
}

transformer = Transformer.from_crs("EPSG:32628", "EPSG:4326", always_xy=True)


def extraire_zip(nom):
    chemin_zip = os.path.join(DOSSIER_BRUT, f"{nom}.zip")
    chemin_dest = os.path.join(DOSSIER_EXTRACTION, nom)
    with zipfile.ZipFile(chemin_zip) as z:
        z.extractall(chemin_dest)
    # le .shp peut être directement à la racine ou dans un sous-dossier
    for racine, _, fichiers in os.walk(chemin_dest):
        for f in fichiers:
            if f.lower().endswith(".shp"):
                return os.path.join(racine, f)
    raise FileNotFoundError(f"Aucun .shp trouvé dans {chemin_zip}")


def lire_shapefile(chemin_shp, type_structure, categorie):
    sf = shapefile.Reader(chemin_shp)
    champs = [c[0] for c in sf.fields[1:]]
    idx = {nom: i for i, nom in enumerate(champs)}
    lignes = []
    for rec, forme in zip(sf.records(), sf.shapes()):
        if not forme.points:
            continue
        x, y = forme.points[0]
        lon, lat = transformer.transform(x, y)
        lignes.append({
            "type_structure": type_structure,
            "categorie": categorie,
            "region": str(rec[idx.get("REG", 0)]).strip().upper(),
            "departement": str(rec[idx.get("DEPT", 0)]).strip().upper(),
            "commune": str(rec[idx.get("CCRCA", 0)]).strip().upper(),
            # nom de la structure (champ DESIGNATIO quand il existe). Certains noms contiennent des
            # octets mal encodés à la source ("R\x90EGIONAL") : on garde uniquement l'ASCII imprimable.
            "nom": re.sub(r"[^\x20-\x7E]", "", str(rec[idx["DESIGNATIO"]])).strip().upper() if "DESIGNATIO" in idx else "",
            # statut public / privé tel qu'il figure dans la couche source (ex. "Université publique")
            "statut": re.sub(r"[^\x20-\x7E]", "", str(rec[idx["DESCRIPTIF"]])).strip() if "DESCRIPTIF" in idx else "",
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
        })
    return lignes


if __name__ == "__main__":
    toutes_lignes = []
    for nom, categorie in FICHIERS.items():
        chemin_shp = extraire_zip(nom)
        lignes = lire_shapefile(chemin_shp, nom, categorie)
        print(f"{nom:15} ({categorie:10}) : {len(lignes)} points géolocalisés")
        toutes_lignes.extend(lignes)

    print(f"\nTotal infrastructures : {len(toutes_lignes)}")

    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(toutes_lignes[0].keys()))
        w.writeheader()
        w.writerows(toutes_lignes)
    print(f"Fichier écrit : {SORTIE}")
