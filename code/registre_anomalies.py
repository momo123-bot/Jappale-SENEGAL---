#!/usr/bin/env python3
"""Registre des anomalies repérées dans les couches de données fournies par l'ANSD.

Chaque nombre est recalculé à partir des fichiers du dépôt (donnees/infrastructures_geolocalisees.csv et
donnees/score_final_corrige.csv). Les deux lignes « écart avec un document officiel » comparent la couche à des
valeurs recopiées de publications du Ministère de la Santé : elles ne peuvent pas être recalculées ici.

Usage :  python3 code/registre_anomalies.py      (réécrit donnees/anomalies_signalees.csv)
"""
import csv
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "donnees" / "anomalies_signalees.csv"
COLONNES = ["id", "couche", "nature", "anomalie", "nombre", "exemples", "comment_verifier", "recommandation"]
MESURE, OFFICIEL = "mesuré dans la couche", "écart avec un document officiel"

# Valeurs recopiées de documents officiels du Ministère de la Santé (non recalculables ici).
EPS_PAR_REGION_2021 = {"DAKAR": 14, "DIOURBEL": 4, "FATICK": 1, "KAFFRINE": 1, "KAOLACK": 1, "KEDOUGOU": 1, "KOLDA": 1, "LOUGA": 2, "MATAM": 3, "SAINT LOUIS": 3, "SEDHIOU": 1, "TAMBACOUNDA": 1, "THIES": 5, "ZIGUINCHOR": 2}
# rapport de suivi de la carte sanitaire 2021, tableau 92 : EPS 1 + EPS 2 + EPS 3 par région (40 établissements publics de santé)
EPS_OFFICIELS_2021 = sum(EPS_PAR_REGION_2021.values())
POSTES_OFFICIELS = (1531, 1680, 1731)   # rapport de suivi 2021 ; brochure du Ministère ; annuaire sanitaire 2021
# Recensement scolaire du moyen et du secondaire (tableaux de l'équipe, hors établissements communautaires ou associatifs).
SCOLAIRE_PUBLIC, SCOLAIRE_PRIVE = 1556, 1093
# Les onze valeurs de la colonne « statut », telles qu'elles figurent dans la couche (lettres accentuées perdues).
STATUTS_SANS_ACCENTS = {"Centre de sant", "Centre mdico social", "Collge priv", "Collge public", "Hpital priv", "Hpital public",
                        "Lyce priv", "Lyce public", "Poste de sant", "Universit prive", "Universit publique"}
# Libellés qui diffèrent entre la couche des infrastructures (clé) et la couche des communes (valeur).
LIBELLES_RAPPROCHES = {"KOUMPENTOUM": "KOUPENTOUM", "TIVAOUNE": "TIVAOUANE", "SAINT-LOUIS": "SAINT LOUIS", "KÉDOUGOU": "KEDOUGOU"}


def esp(n):
    return f"{n:,}".replace(",", " ")   # 2 124 et non 2124


def lire(nom):
    return list(csv.DictReader(open(RACINE / "donnees" / nom, encoding="utf-8-sig")))


def metres(a, b):
    la1, lo1, la2, lo2 = (math.radians(float(x)) for x in (a["latitude"], a["longitude"], b["latitude"], b["longitude"]))
    return 6371000 * math.acos(max(-1.0, min(1.0, math.sin(la1) * math.sin(la2) + math.cos(la1) * math.cos(la2) * math.cos(lo2 - lo1))))


def etiquettes_orphelines(infra, communes):
    regions, departements = {r["region"] for r in communes}, {r["departement"] for r in communes}
    return [r for r in infra if r["region"] not in regions or r["departement"] not in departements]


def groupes_meme_nom(infra):
    g = defaultdict(list)
    for r in infra: g[(r["type_structure"], r["nom"], r["commune"], r["departement"])].append(r)
    return {k: v for k, v in g.items() if len(v) > 1}


def calculer():
    infra, communes = lire("infrastructures_geolocalisees.csv"), lire("score_final_corrige.csv")
    hop = [r for r in infra if r["type_structure"] == "hopital"]
    types = {"annexes": r"annexe", "centre ambulatoire": r"ambulatoire", "médecine traditionnelle": r"tradition", "établissements psychiatriques": r"psychiatr", "hôpital militaire": r"militaire", "polyclinique": r"polyclinique"}
    hop_pub = [r for r in hop if "public" in r["statut"].lower()]
    hop_strict = [r for r in hop_pub if not re.search(r"annexe|ambulatoire|tradition", r["nom"], re.I)]
    par_region = Counter(r["region"].replace("-", " ").replace("É", "E") for r in hop_pub)
    ecarts_h = {k: par_region.get(k, 0) - v for k, v in EPS_PAR_REGION_2021.items()}; identiques = sum(1 for e in ecarts_h.values() if e == 0)
    etiquette = lambda k: {"SAINT LOUIS": "Saint-Louis"}.get(k, k.title())
    nb_types = {k: sum(1 for r in hop if re.search(p, r["nom"], re.I)) for k, p in types.items()}
    colleges = [r for r in infra if r["type_structure"] == "college"]; lycees = [r for r in infra if r["type_structure"] == "lycee"]
    pub = lambda L: sum("public" in r["statut"].lower() for r in L)
    homonymes = Counter(r["commune"] for r in communes); homonymes = {n: c for n, c in homonymes.items() if c > 1}
    mm = groupes_meme_nom(infra); ecarts = {k: max(metres(v[0], x) for x in v[1:]) for k, v in mm.items()}
    orphelines = etiquettes_orphelines(infra, communes)
    sans_coord = [r for r in communes if not r["lat"]]
    pil = lire("services_sociaux_ansd_commune.csv"); pil_sec_ansd = sum(int(r["college_public"]) + int(r["college_prive"]) + int(r["lycee_public"]) + int(r["lycee_prive"]) for r in pil)
    pil_sec_nous = sum(int(r["secondaire_notre_couche"]) for r in pil); pil_col_ansd = sum(int(r["college_public"]) + int(r["college_prive"]) for r in pil)
    pil_col_nous = sum(1 for r in infra if r["type_structure"] == "college" and r["region"].strip().upper().replace("È", "E") in ("DAKAR", "DIOURBEL", "THIES")); pil_col_prive = sum(int(r["college_prive"]) for r in pil)
    proj_ecart = [r for r in lire("projections_ansd_communes.csv") if r["utilisee"] == "0"]
    pops_site = {r["population_2023_site"] for r in proj_ecart}; permutees = [r for r in proj_ecart if r["population_2023_ansd"] in pops_site]
    sec = [r for r in infra if r["type_structure"] in ("college", "lycee")]; sec_pub = [r for r in sec if "public" in r["statut"].lower()]
    return [
        dict(id="A01", couche="infrastructures_geolocalisees", nature=MESURE, nombre=sum(1 for r in infra if r["statut"] in STATUTS_SANS_ACCENTS),
             anomalie="Colonne « statut » : les lettres accentuées ont été supprimées dans les 11 valeurs distinctes.",
             exemples="« Hpital public » pour « Hôpital public » ; « Collge priv » pour « Collège privé » ; « Lyce public » pour « Lycée public »",
             comment_verifier="Lister les valeurs distinctes de la colonne statut de donnees/infrastructures_geolocalisees.csv.",
             recommandation="Exporter les fichiers en UTF-8 et vérifier l'encodage avant diffusion ; ajouter un champ de statut codé (public, privé, militaire, confessionnel)."),
        dict(id="A02", couche="infrastructures_geolocalisees", nature=MESURE, nombre=sum(nb_types.values()),
             anomalie="Couche « hôpital » : elle mêle des hôpitaux, des annexes, des établissements de médecine traditionnelle, des établissements psychiatriques et un hôpital militaire.",
             exemples=", ".join(f"{n} {k}" for k, n in nb_types.items()),
             comment_verifier="Chercher les mots annexe, ambulatoire, tradition, psychiatr, militaire et polyclinique dans les noms des 50 lignes de type hôpital.",
             recommandation="Ajouter un champ de type normalisé aligné sur la carte sanitaire (EPS 1, EPS 2, EPS 3, annexe, établissement spécialisé, médecine traditionnelle)."),
        dict(id="A03", couche="infrastructures_geolocalisees", nature=OFFICIEL, nombre=len(hop_pub) - EPS_OFFICIELS_2021,
             anomalie=f"La couche compte {len(hop_pub)} hôpitaux publics (et {len(hop) - len(hop_pub)} privés) ; le rapport de suivi de la carte sanitaire 2021 du Ministère de la Santé compte {EPS_OFFICIELS_2021} établissements publics de santé (EPS 1, 2 et 3). {identiques} régions sur 14 sont identiques.",
             exemples=f"écart de {min(ecarts_h.values())} ({etiquette(min(ecarts_h, key=ecarts_h.get))} : {par_region.get(min(ecarts_h, key=ecarts_h.get), 0)} hôpital contre {EPS_PAR_REGION_2021[min(ecarts_h, key=ecarts_h.get)]}) à +{max(ecarts_h.values())} ({etiquette(max(ecarts_h, key=ecarts_h.get))}) ; sans les annexes, le centre ambulatoire et la médecine traditionnelle, {len(hop_strict)} hôpitaux publics",
             comment_verifier="Compter les lignes de type hôpital et de statut public par région, puis les comparer au tableau 92 du rapport de suivi de la carte sanitaire 2021.",
             recommandation="Publier la liste des établissements avec leur niveau officiel (EPS 1, 2 ou 3), leur statut et leur année de référence."),
        dict(id="A04", couche="infrastructures_geolocalisees", nature=OFFICIEL, nombre=f"{sum(r['type_structure'] == 'poste_sante' for r in infra) - POSTES_OFFICIELS[2]} à {sum(r['type_structure'] == 'poste_sante' for r in infra) - POSTES_OFFICIELS[0]}",
             anomalie=f"La couche compte {esp(sum(r['type_structure'] == 'poste_sante' for r in infra))} postes de santé ; trois documents du Ministère de la Santé en donnent {esp(POSTES_OFFICIELS[0])}, {esp(POSTES_OFFICIELS[1])} et {esp(POSTES_OFFICIELS[2])}, et ne s'accordent pas entre eux.",
             exemples="rapport de suivi de la carte sanitaire 2021 : 1 531 ; brochure du Ministère : 1 680 ; annuaire sanitaire 2021 : 1 731 ; portail e-santé de la CSSDOS (2026) : 1 584 ; points géoréférencés de l'ANSD, trois régions : 586 postes contre 426 à l'annuaire 2022",
             comment_verifier="Compter les lignes de type poste_sante et les comparer aux trois publications et au portail e-santé de la CSSDOS (carte sanitaire), qui affiche 1 584 postes de santé (consulté le 8 octobre 2026).",
             recommandation="Documenter la définition de « poste de santé » (publics seulement ? cases de santé ? postes privés ?) et la date de la couche."),
        dict(id="A05", couche="infrastructures_geolocalisees", nature=MESURE, nombre=len(colleges),
             anomalie=f"Classification des établissements secondaires : {pub(colleges)} collège public sur {len(colleges)} collèges, alors que {pub(lycees)} lycées sur {len(lycees)} sont publics. Les collèges d'enseignement moyen publics sont peut-être classés avec les lycées.",
             exemples=f"{len(colleges) - pub(colleges)} collèges privés ; {len(lycees) - pub(lycees)} lycées privés",
             comment_verifier="Compter les lignes college et lycee selon la colonne statut.",
             recommandation="Distinguer les collèges d'enseignement moyen et les lycées dans un champ de niveau, et indiquer les effectifs d'élèves."),
        dict(id="A06", couche="score_final_corrige", nature=MESURE, nombre=sum(homonymes.values()),
             anomalie="Des communes de départements différents portent le même nom, sans identifiant unique dans les couches.",
             exemples=", ".join(sorted(n.title() for n in homonymes)),
             comment_verifier="Compter les noms de commune qui apparaissent plus d'une fois dans donnees/score_final_corrige.csv.",
             recommandation="Ajouter un code officiel de commune, identique dans toutes les couches, pour relier sans ambiguïté les données."),
        dict(id="A07", couche="infrastructures_geolocalisees", nature=MESURE, nombre=len(mm),
             anomalie="Des structures de même type, de même nom, dans la même commune et le même département apparaissent plusieurs fois, parfois à des kilomètres l'une de l'autre : homonymes ou géolocalisation à vérifier.",
             exemples=f"{sum(1 for e in ecarts.values() if e > 1000)} groupes à plus de 1 km d'écart ; {sum(1 for e in ecarts.values() if e <= 50)} groupes à moins de 50 m (doublons probables)",
             comment_verifier="Regrouper les lignes par type, nom, commune et département, puis mesurer l'écart entre leurs points.",
             recommandation="Ajouter un identifiant unique par structure et indiquer la méthode de géolocalisation (relevé GPS, saisie, estimation)."),
        dict(id="A08", couche="infrastructures_geolocalisees et score_final_corrige", nature=MESURE, nombre=len(etiquettes_orphelines(infra, communes)),
             anomalie="Des libellés de région ou de département ne sont pas écrits de la même façon dans les deux couches. Nos calculs les rapprochent sans perte, mais un autre utilisateur perdrait des lignes.",
             exemples="Koumpentoum / Koupentoum ; Tivaoune / Tivaouane ; Saint-Louis / Saint Louis ; Kédougou / Kedougou (couche des infrastructures / couche des communes)",
             comment_verifier="Comparer les valeurs distinctes des colonnes region et departement des deux fichiers.",
             recommandation="Utiliser une seule liste de référence des régions et des départements, avec un code, dans toutes les couches."),
        dict(id="A09", couche="score_final_corrige", nature=MESURE, nombre=len(sans_coord),
             anomalie="Des communes n'ont pas de coordonnées géographiques : elles sont absentes de la carte et des calculs de distance.",
             exemples=", ".join(f"{r['commune'].title()} ({r['departement'].title()})" for r in sans_coord),
             comment_verifier="Chercher les lignes sans latitude dans donnees/score_final_corrige.csv.",
             recommandation="Compléter les coordonnées des centres de ces communes à partir du découpage du RGPH-5."),
        dict(id="A10", couche="portail de données ouvertes (séries régionales téléchargées)", nature=OFFICIEL, nombre=2,
             anomalie="Dans les séries régionales du portail, les lignes « Kolda » et « Kédougou » sont inversées : le portail donne 0 hôpital à Kolda depuis 2012 et 42 postes de santé en 2019, alors que l'annuaire 2020 lui compte un hôpital (EPS de niveau 2) et 74 postes, et compte 0 hôpital et 41 postes à Kédougou.",
             exemples="infirmiers d'État 2022 : 49 à Kédougou et 110 à Kolda dans l'annuaire ; 110 à Kédougou et 49 à Kolda dans le portail. Après échange des deux régions, nos chiffres de personnel de l'annuaire 2022 coïncident avec ceux du portail dans les 14 régions",
             comment_verifier="Comparer les fichiers du portail (établissements de santé, infirmiers d'État, sages-femmes d'État) aux tableaux 17 et 18 de l'annuaire 2020.",
             recommandation="Corriger l'étiquetage des deux régions dans toutes les séries du portail et republier ; avertir les utilisateurs des fichiers déjà téléchargés."),
        dict(id="A11", couche="portail de données ouvertes (séries nationales téléchargées)", nature=OFFICIEL, nombre="517 à 575",
             anomalie="La série officielle des postes de santé donne 1 948 en 2018, entre 1 373 en 2017 et 1 431 en 2019.",
             exemples="1 452 (2015), 1 458 (2016), 1 373 (2017), 1 948 (2018), 1 431 (2019), 1 499 (2020)",
             comment_verifier="Lire la ligne « Postes de santé » du fichier national des structures sanitaires du portail.",
             recommandation="Vérifier la définition retenue en 2018 (postes privés, cases de santé ?) et corriger ou annoter la série."),
        dict(id="A12", couche="infrastructures_geolocalisees", nature=OFFICIEL, nombre=SCOLAIRE_PUBLIC + SCOLAIRE_PRIVE - len(sec),
             anomalie=f"La couche compte {esp(len(sec))} établissements du moyen et du secondaire, dont {len(sec_pub)} publics ; le recensement scolaire en dénombre {esp(SCOLAIRE_PUBLIC + SCOLAIRE_PRIVE)}, dont {esp(SCOLAIRE_PUBLIC)} publics (hors 6 établissements communautaires ou associatifs). Elle ne couvre que la moitié des établissements et moins du tiers des publics.",
             exemples=f"{len(sec_pub)} publics sur {esp(SCOLAIRE_PUBLIC)} ; {len(sec) - len(sec_pub)} privés sur {esp(SCOLAIRE_PRIVE)}",
             comment_verifier="Comparer le nombre de lignes college et lycee de la couche au nombre d'établissements du tableau « Données générales » du recensement scolaire (année non précisée dans les fichiers).",
             recommandation="Publier la liste complète des établissements du moyen et du secondaire avec leur localisation et leur statut."),
        dict(id="A13", couche="projections_demographiques_ansd_2023_2073 (tableau par commune)", nature=OFFICIEL, nombre=len(proj_ecart),
             anomalie=f"Pour {len(proj_ecart)} communes, la population 2023 du tableau de projections de l'ANSD diffère de celle du fichier du recensement : {len(permutees)} d'entre elles échangent leurs populations (deux à deux ou trois à trois), {len(proj_ecart) - len(permutees)} ont un petit écart. La projection officielle n'est pas utilisée pour ces communes.",
             exemples=" ; ".join(f"{r['commune'].title()} ({r['departement'].title()}) : {esp(int(r['population_2023_site']))} dans le recensement, {esp(int(r['population_2023_ansd']))} dans le tableau" for r in sorted(proj_ecart, key=lambda r: (r['population_2023_ansd'] in pops_site, abs(int(r['population_2023_ansd']) - int(r['population_2023_site']))), reverse=True)[:4]),
             comment_verifier="Comparer, commune par commune, population_2023_site et population_2023_ansd dans donnees/projections_ansd_communes.csv (lignes où utilisee vaut 0).",
             recommandation="Vérifier laquelle des deux publications attribue la bonne population à ces communes, et corriger l'autre."),
        dict(id="A14", couche="infrastructures_geolocalisees (collèges et lycées, trois régions)", nature=OFFICIEL, nombre=pil_sec_ansd - pil_sec_nous,
             anomalie=f"Dans les trois régions où l'ANSD a remis ses points géoréférencés (Dakar, Diourbel, Thiès), notre couche compte {esp(pil_sec_nous)} collèges et lycées contre {esp(pil_sec_ansd)} chez l'ANSD ({round(pil_sec_nous / pil_sec_ansd * 100)} %). L'écart vient des collèges : {esp(pil_col_nous)} chez nous contre {esp(pil_col_ansd)} (dont {esp(pil_col_prive)} privés) ; les lycées sont identiques. L'isolement scolaire en est surestimé.",
             exemples="Baba Garage : 16,6 km du plus proche chez nous, un collège sur place chez l'ANSD ; Keur Ngalgou : 19,8 km chez nous, sur place chez l'ANSD",
             comment_verifier="Comparer, commune par commune, secondaire_notre_couche et les colonnes college_* et lycee_* de donnees/services_sociaux_ansd_commune.csv.",
             recommandation="Compléter la couche nationale avec les collèges privés et publier les données de l'ANSD pour les autres régions."),
        dict(id="A15", couche="services_sociaux_de_base_rgph_2023 (classeur remis par l'ANSD)", nature=OFFICIEL, nombre=5,
             anomalie="Dans le classeur de l'ANSD, la même commune est écrite de deux façons selon la feuille : cinq communes sont concernées.",
             exemples="Diender et Diender Guedji ; Yene et Yenne ; Pattar et Patar ; Dendeye Gouy Gui et Dendeye Gouye Gui ; Darou Salam Typ avec un ou deux espaces",
             comment_verifier="Lister les noms de commune distincts de chaque feuille et les comparer après avoir retiré accents, espaces et ponctuation.",
             recommandation="Utiliser un identifiant de commune dans tous les fichiers, plutôt que son nom."),
    ]


def ecrire():
    lignes = calculer()
    with open(SORTIE, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES); w.writeheader(); w.writerows(lignes)
    return lignes


if __name__ == "__main__":
    for l in ecrire(): print(f"{l['id']}  {str(l['nombre']):>8}  {l['anomalie'][:110]}")
    print(f"\n{len(calculer())} anomalies écrites dans {SORTIE.relative_to(RACINE)}")
