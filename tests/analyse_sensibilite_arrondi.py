"""
Analyse de sensibilité : et si le besoin de chaque commune n'était pas arrondi au supérieur ?

Le site calcule le besoin de postes de santé d'une commune comme ⌈population ÷ 10 000⌉ (arrondi au supérieur) : une commune de
3 000 habitants « requiert » donc un poste. Ce choix gonfle le total par rapport à d'autres conventions. Ce script mesure de combien,
et si le classement des communes change.

Conventions comparées : arrondi au supérieur (celle du site), à l'entier le plus proche, à l'inférieur, et sans arrondi.
Lancer : python3 tests/analyse_sensibilite_arrondi.py
"""
import csv
import math
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
NORME = 10_000

CONVENTIONS = {
    "arrondi au supérieur (le site)": lambda p: math.ceil(p / NORME),
    "arrondi à l'entier le plus proche": lambda p: math.floor(p / NORME + 0.5),
    "arrondi à l'inférieur": lambda p: math.floor(p / NORME),
    "sans arrondi (besoin fractionnaire)": lambda p: p / NORME,
}


def communes():
    return list(csv.DictReader(open(RACINE / "donnees" / "score_final_corrige.csv", encoding="utf-8-sig")))


def manque(lignes, besoin):
    """Retourne (total des postes manquants, nombre de communes concernées, manque par commune)."""
    par_commune = {(r["region"], r["departement"], r["commune"]): max(0, besoin(int(r["population"])) - int(r["nb_poste_sante"])) for r in lignes}
    return sum(par_commune.values()), sum(1 for v in par_commune.values() if v > 0), par_commune


def dix_premieres(par_commune):
    return {cle for cle, _ in sorted(par_commune.items(), key=lambda kv: (-kv[1], kv[0]))[:10]}


if __name__ == "__main__":
    lignes = communes(); base = manque(lignes, CONVENTIONS["arrondi au supérieur (le site)"])[2]
    print(f"{'convention':40}{'postes manquants':>18}{'communes concernées':>22}{'dix premières en commun':>26}")
    for nom, f in CONVENTIONS.items():
        total, n, par = manque(lignes, f)
        print(f"{nom:40}{round(total):>18}{n:>22}{len(dix_premieres(par) & dix_premieres(base)):>24}/10")
