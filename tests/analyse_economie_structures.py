"""
Lecture économique de l'algorithme : à couverture égale, combien de structures économise-t-il ?

On prend la population desservie par un classement simple (les communes les plus en déficit) avec 5, 10, 15 ou 25 structures,
puis on cherche combien de structures l'algorithme Jàppale demande pour desservir au moins autant de monde.

Limites à dire : le coût est supposé identique pour chaque structure (aucun chiffre en francs CFA), et la population desservie
est une estimation du modèle. C'est un résultat de modélisation, pas une mesure de terrain.

Lancer : python3 tests/analyse_economie_structures.py
"""
import importlib.util
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("m6", RACINE / "code" / "06_algorithme_arbitrage_budgetaire.py")
m6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m6)
communes = m6.charger_communes(str(RACINE / "donnees" / "score_final_corrige.csv"))


def glouton(budget):
    return m6.selection_gloutonne(communes, budget, "2023")[-1]["cumul_population_gagnee"]


def simple(budget):
    return m6.evaluer_couverture_reelle(m6.selection_naive(communes, budget, "2023"), "2023")


print(f"{'classement simple':>20}{'population desservie':>24}{'structures avec Jàppale':>26}{'économie':>10}")
for budget in (5, 10, 15, 25):
    cible = simple(budget)
    n = next(k for k in range(1, 60) if glouton(k) >= cible)
    print(f"{budget:>14} structures{cible:>24,.0f}{n:>20} structures{(1 - n / budget) * 100:>8.0f} %")
