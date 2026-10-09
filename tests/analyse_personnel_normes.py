"""
Couverture en personnel de santé, région par région, selon les NORMES OFFICIELLES du Sénégal.

Source : Annuaire statistique des ressources humaines 2022, Direction des ressources humaines, Ministère de la Santé et de l'Action sociale
(tableaux 2 à 5 ; base iHRIS). L'annuaire applique les normes du Plan national de développement sanitaire et social (PNDSS) :
  - 1 médecin pour 10 000 habitants ;
  - 1 infirmier diplômé d'État (IDE) pour 5 000 habitants ;
  - 1 sage-femme d'État (SFE) pour 1 500 femmes en âge de reproduction (FAR).
Le fichier `donnees/personnel_sante_region_2022.csv` a été saisi à partir du PDF ; des tests vérifient les totaux et les ratios imprimés.

Ce sont les effectifs du secteur public (Ministère, établissements publics, collectivités). Ils servent d'éclairage régional, pas à calculer
un manque par commune. L'indicateur de couverture ci-dessous est celui du projet : moyenne des trois taux de couverture, chacun plafonné à 100 %.
Lancer : python3 tests/analyse_personnel_normes.py
"""
import csv
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
NORME_MEDECIN_POUR_HABITANTS = 10_000
NORME_IDE_POUR_HABITANTS = 5_000
NORME_SFE_POUR_FAR = 1_500


def lignes():
    return list(csv.DictReader(open(RACINE / "donnees" / "personnel_sante_region_2022.csv", encoding="utf-8-sig")))


def ratios(l):
    """(médecins pour 10 000 hab., IDE pour 5 000 hab., sages-femmes pour 1 500 FAR) : 1,0 = norme atteinte."""
    return (int(l["medecins"]) / int(l["population_2022"]) * NORME_MEDECIN_POUR_HABITANTS,
            int(l["infirmiers_diplomes_etat"]) / int(l["population_2022"]) * NORME_IDE_POUR_HABITANTS,
            int(l["sages_femmes_etat"]) / int(l["femmes_age_reproduction"]) * NORME_SFE_POUR_FAR)


def couverture(l):
    return sum(min(1.0, r) for r in ratios(l)) / 3


def totaux():
    L = lignes()
    return {k: sum(int(x[k]) for x in L) for k in ("population_2022", "medecins", "infirmiers_diplomes_etat", "sages_femmes_etat", "femmes_age_reproduction")}


if __name__ == "__main__":
    L = lignes()
    print(f"{'région':14}{'médecins':>10}{'IDE':>7}{'SFE':>7}{'couverture':>12}   (1,00 = norme du PNDSS atteinte)")
    for l in sorted(L, key=couverture):
        m, i, s = ratios(l); print(f"{l['region'].title():14}{m:>10.2f}{i:>7.2f}{s:>7.2f}{couverture(l):>12.0%}")
    t = totaux(); m = t["medecins"] / t["population_2022"] * NORME_MEDECIN_POUR_HABITANTS; i = t["infirmiers_diplomes_etat"] / t["population_2022"] * NORME_IDE_POUR_HABITANTS; s = t["sages_femmes_etat"] / t["femmes_age_reproduction"] * NORME_SFE_POUR_FAR
    print(f"\nPays : médecins {m:.2f}, IDE {i:.2f}, SFE {s:.2f}")
    print("Normes atteintes -> médecins :", sum(1 for l in L if ratios(l)[0] >= 1), "régions | IDE :", sum(1 for l in L if ratios(l)[1] >= 1), "| sages-femmes :", sum(1 for l in L if ratios(l)[2] >= 1), "(sur 14)")
