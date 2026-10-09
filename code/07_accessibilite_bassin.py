"""
Étape 7 - Accessibilité de bassin ("pépite" issue de la veille internationale)

Inspiré de l'indicateur APL (Accessibilité Potentielle Localisée) de la
DREES française : une commune n'est pas évaluée isolément, mais en tenant
compte des postes de santé situés dans un rayon raisonnable, y compris dans
les communes voisines. Une petite commune sans poste propre mais à 3 km d'un
bourg bien équipé n'est pas dans la même situation qu'une commune isolée à
30 km de tout secours - notre déficit "brut" (par commune administrative)
ne fait pourtant pas la différence entre ces deux cas. Cette étape la fait.

Entrée :
    ../donnees/score_final_corrige.csv (étape 5)
Sortie :
    ../donnees/accessibilite_bassin.csv

Méthode (corrigée après relecture critique - voir note méthodologique) :
Un même poste de santé ne peut pas être compté en entier par chaque commune
voisine qui s'en réclame : sa capacité doit être PARTAGÉE entre toutes les
communes qui s'appuient dessus, au prorata de leur proximité - exactement
comme l'indicateur APL français répartit l'offre d'un médecin entre les
patients de plusieurs communes plutôt que de la compter plusieurs fois.

Pour chaque commune A disposant de N postes de santé, chaque commune B
située dans un rayon de 15 km reçoit un poids w(B,A) qui décroît linéairement
avec la distance (1.0 à 0 km, 0.0 à 15 km ou plus). La part des postes de A
qui revient à B est : N x w(B,A) / (somme des poids de TOUTES les communes
qui se trouvent à moins de 15 km de A, elle y compris). Cette division
garantit que la somme des parts distribuées à partir des postes de A est
toujours égale à N - aucune capacité n'est inventée ni comptée deux fois.
"""

import csv
import math
from collections import defaultdict

ENTREE = "../donnees/score_final_corrige.csv"
SORTIE = "../donnees/accessibilite_bassin.csv"

RAYON_KM = 15.0
NORME_POSTE = 10_000


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, [lat1, lon1, lat2, lon2])
    a = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def poids_distance(d_km):
    if d_km >= RAYON_KM:
        return 0.0
    return 1.0 - (d_km / RAYON_KM)


if __name__ == "__main__":
    lignes = list(csv.DictReader(open(ENTREE, encoding="utf-8-sig")))
    avec_coord = [r for r in lignes if r["lat"]]
    print(f"Communes avec coordonnées (base du calcul) : {len(avec_coord)} / {len(lignes)}")

    # distances precalculees une seule fois entre chaque paire de communes avec coordonnees
    n = len(avec_coord)
    coords = [(float(r["lat"]), float(r["lon"])) for r in avec_coord]
    voisins = [[] for _ in range(n)]  # voisins[i] = liste de (j, poids) pour j a moins de 15km de i
    for i in range(n):
        for j in range(n):
            d = 0.0 if i == j else haversine(*coords[i], *coords[j])
            w = poids_distance(d)
            if w > 0:
                voisins[i].append((j, w))

    # part des postes de chaque commune A qui revient a chaque commune B, capacite partagee
    postes_recus = defaultdict(float)  # index de commune -> total recu
    for a in range(n):
        nb_postes_a = int(avec_coord[a]["nb_poste_sante"])
        if nb_postes_a == 0:
            continue
        total_poids = sum(w for (_, w) in voisins[a])  # somme des poids de tous ceux qui tirent sur A
        if total_poids == 0:
            continue
        for (b, w) in voisins[a]:
            postes_recus[b] += nb_postes_a * (w / total_poids)

    resultats = []
    idx_avec_coord = 0
    for r in lignes:
        if not r["lat"]:
            resultats.append({**r, "postes_accessibles_bassin": "", "deficit_bassin": "",
                               "ecart_vs_deficit_communal": ""})
            continue
        postes_accessibles = postes_recus.get(idx_avec_coord, 0.0)
        besoin = math.ceil(int(r["population"]) / NORME_POSTE)
        deficit_bassin = max(0, round(besoin - postes_accessibles, 1))
        ecart = int(r["deficit_poste_sante"]) - deficit_bassin
        resultats.append({
            **r,
            "postes_accessibles_bassin": round(postes_accessibles, 2),
            "deficit_bassin": deficit_bassin,
            "ecart_vs_deficit_communal": round(ecart, 1),
        })
        idx_avec_coord += 1

    # verification de conservation : la somme des postes distribues doit egaler
    # le nombre total de postes recenses (aucune capacite inventee)
    total_distribue = sum(postes_recus.values())
    total_reel = sum(int(r["nb_poste_sante"]) for r in avec_coord)
    print(f"\nVérification de conservation : {total_distribue:.1f} postes distribués "
          f"pour {total_reel} postes réels recensés (doit être quasi identique)")

    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(resultats[0].keys()))
        w.writeheader()
        w.writerows(resultats)

    avec_ecart = [r for r in resultats if r["ecart_vs_deficit_communal"] != ""]
    avec_ecart.sort(key=lambda r: -abs(float(r["ecart_vs_deficit_communal"])))

    print("\nTop 10 des communes ou la vision 'bassin' change le plus la lecture du deficit :")
    print(f"{'Commune':22}{'Deficit communal':>18}{'Deficit bassin':>16}{'Ecart':>8}")
    for r in avec_ecart[:10]:
        print(f"{r['commune'].title():22}{r['deficit_poste_sante']:>18}{r['deficit_bassin']:>16}{r['ecart_vs_deficit_communal']:>8}")

    print(f"\nFichier écrit : {SORTIE}")
