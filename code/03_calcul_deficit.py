"""
Étape 3 - Calcul du déficit d'accès aux services de santé et d'éducation

Entrées :
    ../donnees/rgph5_localites_nettoye.csv       (étape 1)
    ../donnees/infrastructures_geolocalisees.csv (étape 2)
Sortie :
    ../donnees/score_deficit.csv (inclut les coordonnées, calculées comme le
    centroïde des infrastructures rattachées à chaque commune)

Règle de granularité (voir note méthodologique, section 2.1 bis) :
    - Poste de santé  : calculé au niveau COMMUNE (équipement de proximité)
    - Centre de santé : calculé au niveau DÉPARTEMENT (équipement de bassin)
    - Hôpital         : calculé au niveau DÉPARTEMENT (équipement de bassin)

Le rapprochement entre population et infrastructures se fait en DEUX temps,
parce qu'un rapprochement à un seul niveau se révèle insuffisant en
pratique (validé sur les données réelles au cours du projet) :
    1. Rapprochement du DÉPARTEMENT par similarité textuelle (ex. certains
       fichiers orthographient "Tivaouane" différemment) - sans ce premier
       niveau, toutes les communes du département concerné se retrouvent à
       tort avec un déficit de 100%, y compris des communes qui ont bel et
       bien des infrastructures recensées (cas réel rencontré : Darou
       Khoudoss, à tort compté à 0 avant cette correction).
    2. Rapprochement de la COMMUNE par similarité textuelle à l'intérieur du
       département déjà résolu, jamais à l'échelle nationale (pour éviter
       les confusions entre localités homonymes situées dans des régions
       différentes).

Éducation (voir note méthodologique) : trois comptages distincts, pour ne pas mélanger des choses différentes.
    - Secondaire : collèges + lycées, publics et privés (champ nb_infra_education). Aucune norme officielle.
    - Campus d'universités publiques (nb_univ_publiques) : la couche source "université" contient 114 lignes qui ne
      sont pas 114 universités (campus, écoles doctorales, amphithéâtres, annexes, espaces numériques, chantiers,
      établissements privés). On ne retient que les lignes étiquetées "publique", hors espaces numériques et hors
      chantiers, et on regroupe en un seul campus les lignes d'une même commune situées à moins de 1,5 km.
    - Espaces numériques ouverts de l'Université numérique Cheikh Hamidou Kane, ex-UVS (nb_espaces_uvs) : sites de
      cours en ligne et de regroupements, en service, publics, regroupés à moins de 1 km.

Dépendance : rapidfuzz (`pip install rapidfuzz`)
"""

import csv
import math
import unicodedata
import re
from collections import defaultdict
from rapidfuzz import fuzz, process

RGPH5 = "../donnees/rgph5_localites_nettoye.csv"
INFRA = "../donnees/infrastructures_geolocalisees.csv"
SORTIE = "../donnees/score_deficit.csv"

NORME_POSTE = 10_000
NORME_CENTRE = 50_000
NORME_HOPITAL = 150_000
SEUIL_RAPPROCHEMENT = 80  # score minimal (sur 100) pour accepter une correspondance approximative
RAYON_CAMPUS_KM = 1.5     # des lignes "université" d'une même commune à moins de 1,5 km forment un seul campus
RAYON_ESPACE_KM = 1.0     # idem pour les espaces numériques ouverts
MOTIF_ESPACE_NUMERIQUE = re.compile(r"\bUVS\b|VIRTUELLE|\bENO\b|ESPACE NUM")
MOTIF_CHANTIER = re.compile(r"CONSTRUCTION")


def normaliser(s):
    if s is None:
        return ""
    s = str(s).upper().strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def charger_population_par_commune(chemin):
    agg = defaultdict(int)
    with open(chemin, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            try:
                pop = int(r["POPULATION"])
            except ValueError:
                continue
            cle = (normaliser(r["Region"]), normaliser(r["Departement"]), normaliser(r["COMMUNE"]))
            agg[cle] += pop
    return agg


def charger_infrastructures(chemin):
    return list(csv.DictReader(open(chemin, encoding="utf-8-sig")))


def distance_km(a, b):
    """Distance à vol d'oiseau (haversine) entre deux points (lat, lon) en degrés."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def compter_sites(points, rayon_km):
    """Nombre de sites distincts : des points à moins de rayon_km d'un site déjà retenu comptent pour le même."""
    sites = []
    for p in sorted(points):
        if not any(distance_km(p, s) <= rayon_km for s in sites):
            sites.append(p)
    return len(sites)


# Variantes d'orthographe entre le fichier d'infrastructures et le recensement,
# validées une à une : chaque cas est dans le MÊME département, avec le même nom à
# une lettre ou un préfixe près. Sans cette table, ces communes apparaissaient avec
# 0 poste de santé alors que leurs postes existent (cas le plus marquant : Wouro
# Sidy, 52 849 habitants, 8 postes recensés sous le nom "Ouro Sidy").
# Clé : (région, département, nom dans les infrastructures) -> nom dans le recensement.
ALIAS_COMMUNES = {
    ("SAINT LOUIS", "PODOR", "MERI"): "MERY",
    ("KAOLACK", "NIORO", "PAOSKOTO"): "PAOS KOTO",
    ("THIES", "THIES", "DIENDER GUEDJI"): "DIENDER",
    ("MATAM", "KANEL", "OURO SIDY"): "WOURO SIDY",
    ("MATAM", "RANEROU FERLO", "RANEROU FERLO"): "RANEROU",
    ("KAFFRINE", "KAFFRINE", "DIOKOUL MBELBOUCK"): "DIOKOUL BELBOUCK",
    ("SEDHIOU", "SEDHIOU", "SANSAMBA"): "SAN SAMBA",
}
# Restent sans rattachement (aucune infrastructure orpheline de même nom dans leur
# département, ni sous un nom proche dans aucune des couches) : Sama Kanta Peulh (département de
# Sédhiou, 4 357 habitants) et Diouboudou (département de Goudomp, 6 959 habitants), deux collectivités
# rurales de la région de Sédhiou dont la population correspond à celle publiée par l'ANSD. Elles sont
# signalées "à confirmer" : on ne peut pas affirmer qu'elles n'ont aucune structure, seulement que la
# source n'en contient aucune sous leur nom.


def resoudre_departement(reg, dept, depts_par_region):
    candidats = list(depts_par_region.get(reg, []))
    if dept in candidats:
        return dept
    if not candidats:
        return None
    meilleur = process.extractOne(dept, candidats, scorer=fuzz.token_sort_ratio)
    return meilleur[0] if meilleur and meilleur[1] >= SEUIL_RAPPROCHEMENT else None


def resoudre_commune(reg, dept_resolu, commune, communes_par_region_dept):
    candidats = communes_par_region_dept.get((reg, dept_resolu), [])
    if commune in candidats:
        return commune
    if not candidats:
        return None
    meilleur = process.extractOne(commune, candidats, scorer=fuzz.token_sort_ratio)
    return meilleur[0] if meilleur and meilleur[1] >= SEUIL_RAPPROCHEMENT else None


if __name__ == "__main__":
    pop_par_commune = charger_population_par_commune(RGPH5)
    infra = charger_infrastructures(INFRA)

    depts_par_region = defaultdict(set)
    communes_par_region_dept = defaultdict(set)
    for (reg, dept, commune) in pop_par_commune:
        depts_par_region[reg].add(dept)
        communes_par_region_dept[(reg, dept)].add(commune)

    compte_commune = defaultdict(lambda: defaultdict(int))
    compte_departement = defaultdict(lambda: defaultdict(int))
    points_par_commune = defaultdict(list)  # pour le calcul du centroide
    universites_par_commune = defaultdict(list)  # lignes de la couche "université", comptées à part
    non_resolues = 0

    for ligne in infra:
        reg = normaliser(ligne["region"])
        dept_brut = normaliser(ligne["departement"])
        commune_brute = normaliser(ligne["commune"])

        dept_resolu = resoudre_departement(reg, dept_brut, depts_par_region)
        if dept_resolu is None:
            non_resolues += 1
            continue
        commune_resolue = ALIAS_COMMUNES.get((reg, dept_resolu, commune_brute))
        if commune_resolue is None:
            commune_resolue = resoudre_commune(reg, dept_resolu, commune_brute, communes_par_region_dept)
        elif commune_resolue not in communes_par_region_dept.get((reg, dept_resolu), set()):
            raise ValueError(f"Alias invalide : {commune_resolue} absent du departement {dept_resolu}")
        if commune_resolue is None:
            non_resolues += 1
            continue

        cle = (reg, dept_resolu, commune_resolue)
        if ligne["type_structure"] == "universite":
            universites_par_commune[cle].append(ligne)
        else:
            compte_commune[cle][ligne["type_structure"]] += 1
        compte_departement[(reg, dept_resolu)][ligne["type_structure"]] += 1
        points_par_commune[cle].append((float(ligne["latitude"]), float(ligne["longitude"])))

    print(f"Infrastructures non rapprochées à une commune connue : {non_resolues} / {len(infra)} "
          f"({non_resolues/len(infra)*100:.1f}%)")

    resultats = []
    for cle, population in pop_par_commune.items():
        reg, dept, commune = cle
        c_commune = compte_commune.get(cle, {})

        nb_poste = c_commune.get("poste_sante", 0)
        besoin_poste = math.ceil(population / NORME_POSTE)
        deficit_poste = max(0, besoin_poste - nb_poste)
        nb_educ = c_commune.get("college", 0) + c_commune.get("lycee", 0)   # secondaire : collèges + lycées

        publiques = [u for u in universites_par_commune.get(cle, [])
                     if "PUBLI" in normaliser(u.get("statut", "")) and not MOTIF_CHANTIER.search(u["nom"])]
        espaces = [u for u in publiques if MOTIF_ESPACE_NUMERIQUE.search(u["nom"])]
        campus = [u for u in publiques if not MOTIF_ESPACE_NUMERIQUE.search(u["nom"])]
        coords = lambda lignes: [(float(u["latitude"]), float(u["longitude"])) for u in lignes]
        nb_campus = compter_sites(coords(campus), RAYON_CAMPUS_KM)
        nb_espaces = compter_sites(coords(espaces), RAYON_ESPACE_KM)

        pts = points_par_commune.get(cle, [])
        if pts:
            lat = round(sum(p[0] for p in pts) / len(pts), 5)
            lon = round(sum(p[1] for p in pts) / len(pts), 5)
        else:
            lat = lon = ""

        resultats.append({
            "region": reg, "departement": dept, "commune": commune,
            "population": population, "lat": lat, "lon": lon,
            "nb_poste_sante": nb_poste, "besoin_poste_sante": besoin_poste, "deficit_poste_sante": deficit_poste,
            "nb_infra_education": nb_educ,
            "nb_univ_publiques": nb_campus, "nb_espaces_uvs": nb_espaces,
            # centres de santé et hôpitaux rattachés à la COMMUNE (pour la norme, ils ne comptent qu'à l'échelle du département) :
            # une commune avec un centre mais sans poste affiche un manque de poste alors qu'une structure de niveau supérieur la dessert
            "nb_centres_commune": c_commune.get("centre_sante", 0), "nb_hopitaux_commune": c_commune.get("hopital", 0),
        })

    pop_par_dept = defaultdict(int)
    for (reg, dept, commune), pop in pop_par_commune.items():
        pop_par_dept[(reg, dept)] += pop

    deficit_dept = {}
    for (reg, dept), pop in pop_par_dept.items():
        c_dept = compte_departement.get((reg, dept), {})
        nb_centre = c_dept.get("centre_sante", 0)
        nb_hopital = c_dept.get("hopital", 0)
        besoin_centre = math.ceil(pop / NORME_CENTRE)
        besoin_hopital = math.ceil(pop / NORME_HOPITAL)
        deficit_dept[(reg, dept)] = {
            "nb_centre_departement": nb_centre, "besoin_centre_departement": besoin_centre,
            "deficit_centre_departement": max(0, besoin_centre - nb_centre),
            "nb_hopital_departement": nb_hopital, "besoin_hopital_departement": besoin_hopital,
            "deficit_hopital_departement": max(0, besoin_hopital - nb_hopital),
        }

    for r in resultats:
        r.update(deficit_dept[(r["region"], r["departement"])])

    with open(SORTIE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(resultats[0].keys()))
        w.writeheader()
        w.writerows(resultats)

    print(f"Communes traitées : {len(resultats)}")
    print(f"Communes avec coordonnées calculées : {sum(1 for r in resultats if r['lat'] != '')}")
    touba = next((r for r in resultats if r["commune"] == "TOUBA MOSQUEE"), None)
    if touba:
        print(f"Vérification Touba : déficit postes = {touba['deficit_poste_sante']} (attendu : 75)")
    darou = next((r for r in resultats if r["commune"] == "DAROU KHOUDOSS"), None)
    if darou:
        print(f"Vérification Darou Khoudoss : {darou['nb_poste_sante']} poste(s) recensé(s) "
              f"(doit être > 0, pas 0)")
    print(f"Fichier écrit : {SORTIE}")

