"""
Analyse de sensibilité : et si le taux de croissance utilisé pour 2033 était différent ?

Le scénario 2033 prolonge la croissance mesurée de chaque commune entre 2013 et 2023 (voir la page « Méthode et données »).
Ce script mesure ce que changeraient d'autres hypothèses sur ce taux, pour dire si les conclusions sont robustes.

Scénarios :
  - base : taux mesuré, amorti vers la médiane nationale après 5 ans (le scénario du site)
  - médiane partout : toutes les communes croissent à la médiane nationale (2,94 % par an)
  - mesuré moins 1 point / plus 1 point : le taux mesuré de chaque commune baisse ou monte d'un point
  - extrapolation brute : le taux mesuré s'applique 10 ans, sans amortissement

À nombre de postes inchangé. Lancer : python3 tests/analyse_sensibilite_croissance.py
"""
import csv
import math
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
NORME = 10_000


def charger():
    lignes = list(csv.DictReader(open(RACINE / "donnees" / "score_final_corrige.csv", encoding="utf-8-sig")))
    croissance = [float(r["taux_croissance_annuel_pct"]) for r in csv.DictReader(open(RACINE / "donnees" / "croissance_2013_2023.csv", encoding="utf-8-sig"))]
    return lignes, sorted(croissance)[len(croissance) // 2]


def deficit(pop33, postes):
    return max(0, math.ceil(pop33 / NORME) - postes)


def scenarios():
    lignes, m = charger()
    formules = {
        "base (mesuré, amorti)": lambda p, g: p * (1 + g / 100) ** 5 * (1 + (g + m) / 200) ** 5,
        "médiane partout": lambda p, g: p * (1 + m / 100) ** 10,
        "mesuré moins 1 point": lambda p, g: p * (1 + (g - 1) / 100) ** 5 * (1 + ((g - 1) + m) / 200) ** 5,
        "mesuré plus 1 point": lambda p, g: p * (1 + (g + 1) / 100) ** 5 * (1 + ((g + 1) + m) / 200) ** 5,
        "extrapolation brute": lambda p, g: p * (1 + g / 100) ** 10,
    }
    sortie = {}
    for nom, f in formules.items():
        d = {(r["region"], r["departement"], r["commune"]): deficit(f(int(r["population"]), float(r["taux_croissance_annuel_pct"])), int(r["nb_poste_sante"])) for r in lignes}
        sortie[nom] = d
    return sortie


def top(d, n=10):
    return {cle for cle, _ in sorted(d.items(), key=lambda kv: (-kv[1], kv[0]))[:n]}


if __name__ == "__main__":
    s = scenarios(); base = s["base (mesuré, amorti)"]
    print(f"{'scénario':28}{'déficit total 2033':>20}{'écart à la base':>18}{'dix premières communes en commun':>36}")
    for nom, d in s.items():
        total = sum(d.values())
        print(f"{nom:28}{total:>20,}{(total / sum(base.values()) - 1) * 100:>16.0f} %{len(top(d) & top(base)):>30}/10".replace(",", " "))
