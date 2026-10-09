"""
Analyse de sensibilité : et si le nombre de postes de santé était plus bas que dans la couche source ?

Contexte : la couche Géo Sénégal compte 2 124 "postes", une brochure du Ministère de la Santé en annonce 1 680.
Cet écart n'est pas expliqué. Ce script mesure ce que changerait un nombre de postes plus faible.

Hypothèse volontairement simple : on retire le même pourcentage de postes dans toutes les communes (arrondi).
La vraie différence n'est sans doute pas uniforme : ce test dit si les conclusions sont robustes, pas quel est le vrai chiffre.

Lancer : python3 tests/analyse_sensibilite_postes.py
"""
import csv
import importlib.util
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("m6", RACINE / "code" / "06_algorithme_arbitrage_budgetaire.py")
m6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m6)

chemin = RACINE / "donnees" / "score_final_corrige.csv"
base = m6.charger_communes(str(chemin))
with open(chemin, encoding="utf-8-sig") as f:
    lignes = {(r["region"], r["departement"], r["commune"]): r for r in csv.DictReader(f)}


def scenario(facteur):
    sortie = []
    for c in base:
        r = lignes[(c.region, c.departement, c.nom.upper())]
        deficit = max(0, int(r["besoin_poste_sante"]) - int(int(r["nb_poste_sante"]) * facteur + 0.5))
        sortie.append(type(c)(**{**c.__dict__, "deficit_poste_2023": deficit}))
    return sortie


def top(communes, n):
    return {c.nom + "|" + c.departement for c in sorted(communes, key=lambda c: -c.deficit_poste_2023)[:n]}


def choix(communes, budget):
    return {s["commune"] + "|" + s["departement"] for s in m6.selection_gloutonne(communes, budget, "2023")}


def gain(communes, budget=10):
    glouton = m6.selection_gloutonne(communes, budget, "2023")[-1]["cumul_population_gagnee"]
    simple = m6.evaluer_couverture_reelle(m6.selection_naive(communes, budget, "2023"), "2023")
    return (glouton / simple - 1) * 100


ref = scenario(1.0)
print(f"{'scénario':32}{'déficit total':>14}{'Touba':>7}{'top 10 communs':>16}{'choix algo communs':>20}{'gain à 10':>11}")
for nom, f in [("couche telle quelle", 1.0), ("moins 10 % de postes", 0.90),
               ("chiffre du Ministère (1680/2124)", 1680 / 2124), ("moins 30 % de postes", 0.70)]:
    s = scenario(f)
    touba = next(c for c in s if c.nom.upper() == "TOUBA MOSQUEE")
    print(f"{nom:32}{sum(c.deficit_poste_2023 for c in s):>14}{touba.deficit_poste_2023:>7}"
          f"{len(top(ref, 10) & top(s, 10)):>13}/10{len(choix(ref, 10) & choix(s, 10)):>17}/10{gain(s):>+10.1f} %")
