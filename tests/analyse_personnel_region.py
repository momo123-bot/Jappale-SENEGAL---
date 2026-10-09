"""
Premier éclairage sur le personnel de santé, région par région.

Source : Annuaire des statistiques sanitaires et sociales du Sénégal 2021 (Ministère de la Santé et de l'Action sociale, DPRS / DSISS),
tableaux 1 (population), 5 à 8 (personnel, source DRH / iHRIS) et 16 (structures, source DHIS2). Le fichier
`donnees/personnel_sante_region_2021.csv` a été saisi à partir du PDF ; un test automatique vérifie que chaque total correspond au
total imprimé dans l'annuaire.

Attention : ce sont les effectifs du Ministère (fonctionnaires et contractuels). Ils ne comptent ni le secteur privé, ni les autres
employeurs publics (armées, par exemple), ni les catégories d'aides-soignants. Ils servent d'éclairage régional, pas à calculer un
manque par commune.

Seuils de l'OMS : 22,8 médecins, infirmiers et sages-femmes pour 10 000 habitants (rapport sur la santé dans le monde 2006) et 44,5 (seuil
plus récent, lié aux objectifs de développement durable).
Lancer : python3 tests/analyse_personnel_region.py
"""
import csv
import unicodedata
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SEUIL_OMS_2006 = 22.8
SEUIL_OMS_RECENT = 44.5


def lignes():
    return list(csv.DictReader(open(RACINE / "donnees" / "personnel_sante_region_2021.csv", encoding="utf-8-sig")))


def _n(ligne, colonne):
    return int(ligne[colonne])


def personnel_strict(ligne):
    """Médecins + sages-femmes d'État + infirmiers diplômés d'État."""
    return _n(ligne, "medecins") + _n(ligne, "sages_femmes_etat") + _n(ligne, "infirmiers_diplomes_etat")


def personnel_elargi(ligne):
    """Indicateur strict + chirurgiens (hors dentistes) + infirmiers brevetés."""
    return personnel_strict(ligne) + _n(ligne, "chirurgiens_total") - _n(ligne, "dentistes") + _n(ligne, "infirmiers_brevetes")


def pour_10000(effectif, population):
    return effectif / population * 10000


def nom_normalise(texte):
    return "".join(c for c in unicodedata.normalize("NFD", texte.lower()) if c.isalpha())


def postes_de_la_source_par_region():
    """Nombre de postes de santé de notre couche source (Géo Sénégal), par région."""
    par = defaultdict(int)
    for r in csv.DictReader(open(RACINE / "donnees" / "score_final_corrige.csv", encoding="utf-8-sig")):
        par[nom_normalise(r["region"])] += int(r["nb_poste_sante"])
    return par


if __name__ == "__main__":
    donnees = lignes(); source = postes_de_la_source_par_region()
    print(f"{'région':14}{'population':>12}{'strict':>8}{'/10 000':>9}{'élargi':>8}{'/10 000':>9}{'postes annuaire':>17}{'postes source':>15}")
    for l in sorted(donnees, key=lambda x: -pour_10000(personnel_strict(x), _n(x, "population_2021"))):
        pop = _n(l, "population_2021")
        print(f"{l['region'].title():14}{pop:>12,}{personnel_strict(l):>8}{pour_10000(personnel_strict(l), pop):>9.1f}{personnel_elargi(l):>8}{pour_10000(personnel_elargi(l), pop):>9.1f}{_n(l, 'postes_de_sante_publics'):>17}{source[nom_normalise(l['region'])]:>15}")
    pop = sum(_n(l, "population_2021") for l in donnees); s = sum(personnel_strict(l) for l in donnees); e = sum(personnel_elargi(l) for l in donnees)
    print(f"\nPays : strict {pour_10000(s, pop):.1f} / 10 000, élargi {pour_10000(e, pop):.1f} / 10 000. Minimums de l'OMS : {SEUIL_OMS_2006} et {SEUIL_OMS_RECENT}.")
