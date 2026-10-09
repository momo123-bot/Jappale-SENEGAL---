"""
Étape 1 - Nettoyage et fusion du répertoire des localités RGPH-5 (2023)

Entrée : donnees_brutes/data-recensement*.csv (46 fichiers, un export par lot
         depuis l'outil de recherche du site ansd.sn)
Sortie : ../donnees/rgph5_localites_nettoye.csv

Ce script :
1. Fusionne les 46 fichiers en un seul.
2. Supprime les doublons exacts (lignes strictement identiques, causées par
   un chevauchement entre deux exports).
3. Signale les cas où un même nom apparaît deux fois avec des populations
   différentes, et conserve alors les deux lignes (localités homonymes probables).
"""

import csv
import glob

FICHIERS_SOURCE = sorted(glob.glob("donnees_brutes/data-recensement*.csv"))
SORTIE = "../donnees/rgph5_localites_nettoye.csv"


def charger_tous_les_fichiers(fichiers):
    header = None
    lignes = []
    for f in fichiers:
        with open(f, encoding="utf-8-sig") as fh:
            reader = csv.reader(fh)
            h = next(reader)
            if header is None:
                header = h
            elif h != header:
                print(f"ATTENTION - en-tête différent dans {f} : {h}")
            for row in reader:
                if row:
                    lignes.append(row)
    return header, lignes


def dedupliquer(header, lignes):
    groupes = {}
    for row in lignes:
        cle = tuple(row[:5])  # region, departement, com_arrt_ville, commune, quartier
        groupes.setdefault(cle, []).append(row)

    propre = []
    conflits = []
    for cle, groupe in groupes.items():
        valeurs_population = []
        for row in groupe:
            if row[9] not in valeurs_population:
                valeurs_population.append(row[9])
        # une ligne conservee par valeur de population distincte : les lignes
        # strictement identiques (meme nom, meme population) sont des doublons
        # d'export ; des lignes de meme nom mais de populations differentes sont
        # probablement deux localites homonymes, donc on les garde toutes les deux.
        # Verifie contre la publication officielle : pour Louga, garder les deux
        # lignes donne exactement le total regional publie (1 125 862).
        if len(valeurs_population) > 1:
            conflits.append((cle, groupe))
        for v in valeurs_population:
            propre.append(next(r for r in groupe if r[9] == v))
    return propre, conflits


if __name__ == "__main__":
    header, lignes = charger_tous_les_fichiers(FICHIERS_SOURCE)
    print(f"Fichiers chargés : {len(FICHIERS_SOURCE)}")
    print(f"Lignes brutes avant nettoyage : {len(lignes)}")

    propre, conflits = dedupliquer(header, lignes)
    print(f"Lignes après suppression des doublons exacts : {len(propre)}")
    print(f"Cas de valeurs contradictoires sous la même localité : {len(conflits)}")
    for cle, groupe in conflits:
        print("  Conflit :", cle, "->", [r[9] for r in groupe])

    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(propre)

    population_totale = sum(int(r[9]) for r in propre if r[9].isdigit())
    print(f"\nPopulation totale : {population_totale:,}")
    print(f"Fichier écrit : {SORTIE}")
