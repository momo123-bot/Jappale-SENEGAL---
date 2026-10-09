"""
Jàppale Sénégal - Moteur de sélection d'emplacements sous contrainte budgétaire
================================================================================

Livrable L4 du dossier de soumission : algorithme de sélection d'emplacements
maximisant la population nouvellement desservie, sous contrainte d'un nombre
donné de structures finançables.

Version 3 : porte désormais exclusivement sur le déficit de POSTES DE SANTÉ,
seul niveau d'équipement pour lequel une décision "quelle commune" est
directement actionnable. Les centres de santé et hôpitaux, qui desservent un
bassin de plusieurs communes, sont calculés séparément au niveau département
(cf. note méthodologique, section sur la correction de granularité) et ne
sont plus mélangés dans le score communal - appliquer une norme de bassin à
l'échelle d'une seule commune produisait une fausse alerte ("cette commune de
10 000 habitants a besoin de son propre hôpital"), erreur corrigée ici.

Entrée : score_final_corrige.csv (553 communes, déficit de postes de santé
         2023/2033, coordonnées réelles pour 545 d'entre elles)
Sortie : classement des N meilleurs emplacements pour un budget donné, avec
         gain marginal réel (chevauchement géographique retiré).

Auteur : équipe Jàppale Sénégal - Hackathon des 20 ans de l'ANSD
"""

import csv
import math
from dataclasses import dataclass


# ----------------------------------------------------------------------------
# 1. Chargement des données
# ----------------------------------------------------------------------------

@dataclass
class Commune:
    region: str
    departement: str
    nom: str
    population: int
    deficit_poste_2023: int
    deficit_poste_2033: int
    lat: float | None
    lon: float | None


def charger_communes(chemin_csv: str) -> list[Commune]:
    communes = []
    with open(chemin_csv, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            lat = float(r["lat"]) if r["lat"] else None
            lon = float(r["lon"]) if r["lon"] else None
            communes.append(Commune(
                region=r["region"].strip(),
                departement=r["departement"].strip(),
                nom=r["commune"].strip().title(),
                population=int(r["population"]),
                deficit_poste_2023=int(r["deficit_poste_sante"]),
                deficit_poste_2033=int(r["deficit_sante_commune_2033_amorti"]),
                lat=lat, lon=lon,
            ))
    return communes


# ----------------------------------------------------------------------------
# 2. Distance réelle entre deux communes (formule de haversine)
# ----------------------------------------------------------------------------

RAYON_TERRE_KM = 6371.0


def distance_km(c1: Commune, c2: Commune) -> float:
    if c1.lat is None or c2.lat is None:
        return float("inf")  # pas de coordonnées connues -> pas de chevauchement supposé
    lat1, lon1, lat2, lon2 = map(math.radians, [c1.lat, c1.lon, c2.lat, c2.lon])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 2 * RAYON_TERRE_KM * math.asin(math.sqrt(a))


# Rayon de chalandise approximatif d'un poste de santé en zone rurale/périurbaine
# sénégalaise. Au-delà, on considère qu'il n'y a plus de chevauchement de
# desserte entre deux communes.
RAYON_CHALANDISE_KM = 15.0


def facteur_chevauchement(distance: float) -> float:
    """Retourne la part de la population d'une commune déjà 'consommée' par une
    structure voisine déjà sélectionnée, en fonction de la distance réelle.
    Décroissance linéaire : 100% de chevauchement à 0 km, 0% à 15 km ou plus."""
    if distance >= RAYON_CHALANDISE_KM:
        return 0.0
    return 1.0 - (distance / RAYON_CHALANDISE_KM)


# ----------------------------------------------------------------------------
# 3. Population non couverte estimée
# ----------------------------------------------------------------------------

NORME_POSTE = 10_000  # habitants par poste de santé (norme OMS/ANSD)


def population_non_couverte(c: Commune, annee: str = "2023") -> float:
    deficit = c.deficit_poste_2023 if annee == "2023" else c.deficit_poste_2033
    besoin_theorique = math.ceil(c.population / NORME_POSTE)
    if besoin_theorique == 0:
        return 0.0
    part_non_couverte = min(1.0, deficit / besoin_theorique)
    return c.population * part_non_couverte


# ----------------------------------------------------------------------------
# 4. Algorithme glouton de couverture maximale, avec vraie distance géographique
# ----------------------------------------------------------------------------

def selection_gloutonne(communes: list[Commune], budget: int, annee: str = "2023") -> list[dict]:
    candidats = [c for c in communes if (c.deficit_poste_2023 if annee == "2023" else c.deficit_poste_2033) > 0]
    # cle = identite de l'objet et non le nom : plusieurs communes portent le meme nom
    # (ex. Medina Gounass a Velingara et a Guediawaye)
    pool_initial = {id(c): population_non_couverte(c, annee) for c in candidats}

    selection: list[Commune] = []
    resultats = []
    cumul = 0.0
    restants = list(candidats)

    for _ in range(min(budget, len(restants))):
        meilleur = None
        meilleur_gain = -1.0
        for c in restants:
            gain = pool_initial[id(c)]
            for s in selection:
                d = distance_km(c, s)
                overlap = facteur_chevauchement(d)
                if overlap > 0:
                    gain *= (1 - overlap)
            if gain > meilleur_gain:
                meilleur_gain = gain
                meilleur = c
        if meilleur is None:
            break
        cumul += meilleur_gain
        resultats.append({
            "commune": meilleur.nom,
            "region": meilleur.region,
            "departement": meilleur.departement,
            "deficit_structures": meilleur.deficit_poste_2023 if annee == "2023" else meilleur.deficit_poste_2033,
            "gain_marginal": round(meilleur_gain),
            "cumul_population_gagnee": round(cumul),
            "coordonnees_connues": meilleur.lat is not None,
        })
        selection.append(meilleur)
        restants.remove(meilleur)

    return resultats


def evaluer_couverture_reelle(communes_selectionnees: list[Commune], annee: str = "2023") -> float:
    """Évalue la VRAIE population couverte par un ensemble de communes déjà
    choisi (quelle que soit la méthode qui les a choisies), en retirant le
    chevauchement géographique entre elles. Utilisée pour comparer
    équitablement deux méthodes de sélection différentes sur le même critère -
    sans cette fonction, un classement brut (naïf) semble artificiellement
    meilleur qu'un classement corrigé (glouton) simplement parce qu'il compte
    deux fois la population des zones qui se chevauchent."""
    total = 0.0
    deja_evaluees: list[Commune] = []
    for c in communes_selectionnees:
        gain = population_non_couverte(c, annee)
        for s in deja_evaluees:
            overlap = facteur_chevauchement(distance_km(c, s))
            if overlap > 0:
                gain *= (1 - overlap)
        total += gain
        deja_evaluees.append(c)
    return total


# ----------------------------------------------------------------------------
# 5. Comparaison avec la méthode naïve (classement statique par déficit)
# ----------------------------------------------------------------------------

def selection_naive(communes: list[Commune], budget: int, annee: str = "2023") -> list[Commune]:
    candidats = [c for c in communes if (c.deficit_poste_2023 if annee == "2023" else c.deficit_poste_2033) > 0]
    candidats.sort(key=lambda c: (c.deficit_poste_2023 if annee == "2023" else c.deficit_poste_2033), reverse=True)
    return candidats[:budget]


# ----------------------------------------------------------------------------
# 6. Exécution et validation sur les 553 communes réelles
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    communes = charger_communes("../donnees/score_final_corrige.csv")
    avec_coord = sum(1 for c in communes if c.lat is not None)
    print(f"Communes chargées : {len(communes)} (dont {avec_coord} avec coordonnées géographiques réelles)")
    print(f"Communes avec un déficit santé en 2023 : {sum(1 for c in communes if c.deficit_poste_2023 > 0)}")

    for budget in (3, 5, 10, 15, 25):
        print(f"\n{'='*76}")
        print(f"BUDGET : {budget} structures finançables (population 2023)")
        print(f"{'='*76}")

        glouton = selection_gloutonne(communes, budget, "2023")
        naif_communes = selection_naive(communes, budget, "2023")

        print(f"\n-- Méthode gloutonne (distance géographique réelle, rayon {RAYON_CHALANDISE_KM:.0f} km) --")
        for i, s in enumerate(glouton, 1):
            marque = "" if s["coordonnees_connues"] else "  [pas de coordonnées, traité isolé]"
            print(f"{i}. {s['commune']:25} ({s['departement']:15}) "
                  f"déficit={s['deficit_structures']:>3}  +{s['gain_marginal']:>8,} hab.  "
                  f"cumul={s['cumul_population_gagnee']:>9,}{marque}")

        print(f"\n-- Méthode naïve (tri par déficit brut) --")
        for i, c in enumerate(naif_communes, 1):
            print(f"{i}. {c.nom:25} ({c.departement:15}) déficit={c.deficit_poste_2023:>3}")

        # Comparaison ÉQUITABLE : les deux méthodes évaluées avec la même
        # règle de non-double-comptage géographique.
        gain_glouton = glouton[-1]['cumul_population_gagnee'] if glouton else 0
        gain_naif_reel = evaluer_couverture_reelle(naif_communes, "2023")
        print(f"\n>> Couverture réelle (chevauchement retiré pour les deux méthodes) :")
        print(f"   Glouton : {gain_glouton:>10,.0f} habitants réellement desservis")
        print(f"   Naïf    : {gain_naif_reel:>10,.0f} habitants réellement desservis")
        if gain_naif_reel > 0:
            ecart = (gain_glouton - gain_naif_reel) / gain_naif_reel * 100
            print(f"   Écart   : le glouton dessert {ecart:+.1f}% de population réelle en plus que le tri naïf.")

    print(f"\n{'='*76}")
    print("COMPARAISON HORIZON : optimiser pour 2023 vs optimiser pour 2033 (budget=5)")
    print(f"{'='*76}")
    sel_2023 = selection_gloutonne(communes, 5, "2023")
    sel_2033 = selection_gloutonne(communes, 5, "2033")
    communes_2023 = {s['commune'] for s in sel_2023}
    communes_2033 = {s['commune'] for s in sel_2033}
    print("Choisies pour 2023 :", ", ".join(sorted(communes_2023)))
    print("Choisies pour 2033 :", ", ".join(sorted(communes_2033)))
    difference = communes_2033 - communes_2023
    if difference:
        print(f"\n>> Le scénario 2033 change le choix pour : {', '.join(sorted(difference))} "
              f"- preuve concrète que l'horizon démographique modifie la décision optimale.")

