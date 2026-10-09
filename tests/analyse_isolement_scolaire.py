"""
Éducation : isolement des communes (distance au collège ou lycée le plus proche) et choix de sites à créer.

Faute de norme de densité et d'effectifs publics par établissement, l'éducation était un simple décompte. Cette analyse utilise ce que les
données permettent : les distances. Distance = à vol d'oiseau, entre le point de la commune et l'établissement secondaire (collège ou
lycée, public ou privé) le plus proche ; elle vaut 0 si la commune en compte un. Le seuil de 15 km est une hypothèse, testée avec 10 et 20 km.
Le choix des sites est glouton : à chaque tour, on prend la commune dont le rayon couvre le plus d'habitants encore isolés.
Limites : on ne sait pas si un établissement fonctionne ni quelle est sa capacité ; un établissement à 12 km n'est pas forcément accessible.
Lancer : python3 tests/analyse_isolement_scolaire.py
"""
import csv
import math
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]


def km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2); dp = p2 - p1; dl = math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def etablissements():
    lignes = csv.DictReader(open(RACINE / "donnees" / "infrastructures_geolocalisees.csv", encoding="utf-8-sig"))
    return [(float(r["latitude"]), float(r["longitude"])) for r in lignes if r["categorie"] == "education" and r["type_structure"] in ("college", "lycee") and r["latitude"] and r["longitude"]]


def communes():
    lignes = csv.DictReader(open(RACINE / "donnees" / "score_final_corrige.csv", encoding="utf-8-sig"))
    return [dict(nom=r["commune"], departement=r["departement"], region=r["region"], population=int(r["population"]), lat=float(r["lat"]), lon=float(r["lon"]), nb_secondaire=int(r["nb_infra_education"])) for r in lignes if r["lat"]]


def distances(C=None, E=None):
    C = C or communes(); E = E or etablissements()
    return [0.0 if c["nb_secondaire"] > 0 else min(km(c["lat"], c["lon"], a, b) for a, b in E) for c in C]


def isolement(R, C=None, D=None):
    C = C or communes(); D = D or distances(C)
    iso = [c for c, d in zip(C, D) if d > R]
    return len(iso), sum(c["population"] for c in iso)


def glouton(R, k, C=None, D=None):
    """k communes à doter d'un établissement, en priorité : [(nom, région, habitants nouvellement desservis)]."""
    C = C or communes(); D = D or distances(C)
    servis = {i for i, d in enumerate(D) if d <= R}; choix = []
    for _ in range(k):
        meilleur, gain = None, 0
        for j, cj in enumerate(C):
            g = sum(C[i]["population"] for i in range(len(C)) if i not in servis and km(cj["lat"], cj["lon"], C[i]["lat"], C[i]["lon"]) <= R)
            if g > gain: meilleur, gain = j, g
        if meilleur is None: break
        choix.append((C[meilleur]["nom"], C[meilleur]["region"], gain))
        servis |= {i for i in range(len(C)) if km(C[meilleur]["lat"], C[meilleur]["lon"], C[i]["lat"], C[i]["lon"]) <= R}
    return choix


if __name__ == "__main__":
    C = communes(); D = distances(C); total = sum(c["population"] for c in C)
    print(f"{len(C)} communes localisées, {len(etablissements())} établissements secondaires géolocalisés, {sum(1 for c in C if c['nb_secondaire'] == 0)} communes sans aucun établissement")
    for R in (10, 15, 20, 30):
        n, p = isolement(R, C, D); print(f"  à plus de {R:>2} km d'un collège ou d'un lycée : {n:>3} communes, {p:>9,} habitants ({p / total:.1%})".replace(",", " "))
    for R in (10, 15, 20):
        print(f"cinq sites à créer en priorité (rayon {R} km) :", [(n, f"{g:,}".replace(",", " ")) for n, _, g in glouton(R, 5, C, D)])
