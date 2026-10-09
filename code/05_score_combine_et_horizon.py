"""
Étape 5 - Fichier de score final : horizon 2033 amorti, coordonnées
géographiques, score combiné santé + éducation

Entrées :
    ../donnees/score_deficit.csv               (étape 3)
    ../donnees/croissance_2013_2023.csv        (étape 4)
    ../donnees/infrastructures_geolocalisees.csv (étape 2)
Sortie :
    ../donnees/score_final_corrige.csv  (fichier de référence de tout le projet)

Deux choix méthodologiques appliqués ici, documentés dans la note
méthodologique :
1. Projection démographique amortie : le taux mesuré 2013-2023 est appliqué
   à plein régime sur les 5 premières années, puis ramené progressivement
   vers le taux médian national sur les 5 années suivantes - pour éviter
   qu'un cas extrême (ex. Sangalkam, +25%/an) ne produise une projection
   déraisonnable par simple extrapolation linéaire.
2. Score combiné santé/éducation : rang percentile sur chaque volet, moyenne
   à poids égal, en excluant les communes dont les coordonnées ne sont pas
   confirmées (rapprochement non fiable, cf. étape 2).
"""

import csv
import math
from collections import defaultdict

DEFICIT = "../donnees/score_deficit.csv"
CROISSANCE = "../donnees/croissance_2013_2023.csv"
INFRA = "../donnees/infrastructures_geolocalisees.csv"
SORTIE = "../donnees/score_final_corrige.csv"

NORME_POSTE = 10_000


def charger_taux_croissance(chemin):
    taux = {}
    valeurs = []
    with open(chemin, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            cle = (r["region"], r["commune_2023"])
            taux[cle] = float(r["taux_croissance_annuel_pct"])
            valeurs.append(float(r["taux_croissance_annuel_pct"]))
    mediane = sorted(valeurs)[len(valeurs) // 2]
    return taux, mediane


def population_2033_amortie(pop_2023, taux_pct, mediane_pct):
    pop_an5 = pop_2023 * (1 + taux_pct / 100) ** 5
    taux_amorti = (taux_pct + mediane_pct) / 200  # moyenne des deux taux, en fraction
    return round(pop_an5 * (1 + taux_amorti) ** 5)


def rangs_percentiles(valeurs):
    n = len(valeurs)
    ordre = sorted(range(n), key=lambda i: valeurs[i])
    rangs = [0] * n
    for rang, idx in enumerate(ordre):
        rangs[idx] = rang / (n - 1) * 100 if n > 1 else 50
    return rangs


if __name__ == "__main__":
    lignes = list(csv.DictReader(open(DEFICIT, encoding="utf-8-sig")))
    taux_par_commune, mediane = charger_taux_croissance(CROISSANCE)
    # les coordonnees (lat/lon) sont deja calculees et incluses par l'etape 3

    print(f"Taux médian national utilisé comme valeur de repli : {mediane}%/an")

    for r in lignes:
        cle_commune = (r["region"], r["commune"])
        taux = taux_par_commune.get(cle_commune)
        source_taux = "mesure_reelle_2013_2023" if taux is not None else "taux_median_national"
        if taux is None:
            taux = mediane
        r["taux_croissance_annuel_pct"] = taux
        r["source_taux"] = source_taux

        pop_2033 = population_2033_amortie(int(r["population"]), taux, mediane)
        r["population_2033_amortie"] = pop_2033
        besoin_2033 = math.ceil(pop_2033 / NORME_POSTE)
        r["deficit_sante_commune_2033_amorti"] = max(0, besoin_2033 - int(r["nb_poste_sante"]))

        # lat/lon deja presents dans le fichier (calcules a l'etape 3) ; on
        # ne fait rien de plus ici, sauf s'assurer que la chaine vide reste
        # bien traitee comme "absent" plus loin.

    # score combine sante + education, communes fiables uniquement (avec coordonnees)
    fiables = [r for r in lignes if r["lat"]]
    sante_vals = [int(r["deficit_poste_sante"]) / max(1, int(r["population"])) * 100000 for r in fiables]
    educ_vals = [int(r["population"]) / (int(r["nb_infra_education"]) + 1) / 1000 for r in fiables]
    pct_sante = rangs_percentiles(sante_vals)
    pct_educ = rangs_percentiles(educ_vals)

    for i, r in enumerate(fiables):
        r["percentile_sante"] = round(pct_sante[i], 1)
        r["percentile_education"] = round(pct_educ[i], 1)
        r["score_combine"] = round((pct_sante[i] + pct_educ[i]) / 2, 1)
        r["fiabilite_donnee"] = "fiable"
    for r in lignes:
        if r["lat"] == "":
            r["percentile_sante"] = r["percentile_education"] = r["score_combine"] = ""
            r["fiabilite_donnee"] = "non fiable - rapprochement des noms non confirme"

    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)

    fiables_tries = sorted(fiables, key=lambda r: -r["score_combine"])
    print("\nTop 5 - score combine sante + education :")
    for r in fiables_tries[:5]:
        print(f"  {r['commune'].title():25} score={r['score_combine']}")

    print(f"\nFichier final écrit : {SORTIE}")
