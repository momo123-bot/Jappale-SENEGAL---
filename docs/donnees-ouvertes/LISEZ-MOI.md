# Données ouvertes de Jàppale Sénégal

Version du 7 octobre 2026 (journal des versions : `donnees/CHANGELOG_DONNEES.md`). Ces fichiers reprennent les valeurs affichées par le site, dans des formats que tout outil peut lire (JSON, CSV).

## Fichiers

- `communes.json` : une entrée par commune (553 communes).
- `schema-communes.json` : le schéma (JSON Schema) de `communes.json` : champs, types, valeurs vides permises.
- `regions.json` : le personnel de santé par région (14 régions), d'après l'annuaire des ressources humaines 2022 du Ministère de la Santé.
- `anomalies_signalees.csv` : le registre des anomalies repérées dans les couches de données (voir la page Méthode du site).

## Licence et réutilisation

Ces données dérivées sont publiées sous la licence **Open Data Commons Attribution (ODC-By 1.0)** : vous pouvez les copier, les modifier et les réutiliser, y compris à des fins commerciales, à condition de citer « Jàppale Sénégal, d'après les données de l'ANSD ». Le code est sous licence MIT.
Les données sources appartiennent à l'ANSD et à ses partenaires : leurs conditions d'utilisation continuent de s'appliquer, et la compatibilité de cette licence avec elles reste à confirmer auprès de l'ANSD (voir `donnees/LICENCE_DONNEES.md`).

Mention de source exigée par l'accord de licence de données ouvertes de l'ANSD : « Source : Agence Nationale de la Statistique et de la Démographie. Contient des informations sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD. » Pour les produits adaptés : « Ce produit a été adapté à partir des informations de l'Agence Nationale de la Statistique et de la Démographie, qui sont sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD. »

## À lire avant d'utiliser

- Le nombre de postes manquants est **un ordre de grandeur, pas une mesure** : la couche des postes de santé en compte plus que les documents du Ministère de la Santé.
- Les distances sont **à vol d'oiseau**, pas des temps de trajet.
- Le personnel de santé n'est connu qu'au niveau de la région, et il date de 2022.
- Toutes les limites sont écrites dans la page Méthode du site (`methode.html`) et dans `methodologie/LIMITES.md` du dépôt.

## Champs de `communes.json`

| Champ | Signification |
|---|---|
| `id_commune` | Identifiant stable du projet : région, département et commune en minuscules sans accents, séparés par des tirets. À remplacer par un code officiel de commune dès qu'il existera (voir l'anomalie A06). |
| `commune` | Nom de la commune (découpage du RGPH-5), écrit sans accents comme dans la source. Deux communes portent le même nom dans cinq cas : les distinguer par le département. |
| `departement` | Département. |
| `region` | Région. |
| `population_2023` | Habitants (RGPH-5, ANSD, 2023). |
| `latitude` | Degrés décimaux ; vide (null) pour deux communes non géolocalisées. |
| `longitude` | Degrés décimaux ; vide (null) pour deux communes non géolocalisées. |
| `postes_sante_existants` | Postes de santé rattachés à la commune (couche Géo Sénégal, ANSD). Le total national est un ordre de grandeur : voir les limites. |
| `postes_sante_necessaires` | Postes nécessaires selon la norme du Ministère de la Santé : 1 poste pour 10 000 habitants. |
| `postes_sante_manquants` | Postes nécessaires moins postes existants, jamais négatif. Estimation, pas une mesure. |
| `postes_sante_manquants_recale_2022` | Postes manquants si le nombre de postes de la région est ramené aux statistiques officielles de 2022 (réduction proportionnelle dans la région), arrondi à l'unité. La fourchette du manque va de postes_sante_manquants à cette valeur. Arrondi commune par commune : la somme sur les 553 communes (772) est inférieure au total non arrondi (environ 796). |
| `postes_sante_manquants_2033` | Scénario 2033 indicatif ; vide (null) si non calculable. |
| `population_2033_projection_ansd` | Population 2033 selon la projection officielle de l'ANSD (Projections démographiques 2023-2073) ; vide (null) pour 9 communes où le tableau de projections et le recensement ne s'accordent pas (anomalie A13). |
| `postes_sante_manquants_2033_projection_ansd` | Postes de santé manquants en 2033 avec la population de la projection officielle ; vide (null) si elle n'est pas utilisée. À comparer à postes_sante_manquants_2033, qui vient de l'extrapolation du site. |
| `postes_sante_manquants_vue_bassin` | Postes manquants en partageant les postes des communes situées à moins de 15 km, arrondi à l'unité ; vide si non calculable. |
| `centres_sante_departement` | Centres de santé du département (échelle département, pas commune). |
| `centres_sante_necessaires_departement` | Centres nécessaires dans le département : 1 centre pour 50 000 habitants. |
| `hopitaux_departement` | Hôpitaux du département (échelle département). Voir les limites : la couche mêle hôpitaux, annexes et établissements spécialisés. |
| `hopitaux_necessaires_departement` | Hôpitaux nécessaires dans le département : 1 hôpital pour 150 000 habitants. |
| `etablissements_secondaires` | Collèges et lycées, publics et privés, recensés dans la commune. Aucune norme officielle de densité n'a été trouvée. |
| `hopital_le_plus_proche` | Nom de l'hôpital le plus proche ; vide si non calculé. |
| `distance_hopital_km` | Distance à vol d'oiseau jusqu'à cet hôpital, en kilomètres. Ce n'est pas un temps de trajet. |
| `distance_secondaire_km` | Distance à vol d'oiseau jusqu'au collège ou lycée le plus proche, en kilomètres, arrondie à 0,1 ; 0 si la commune en compte au moins un ; vide (null) si la commune n'est pas géolocalisée. |
| `fiabilite_rattachement` | verifiee si des infrastructures ont pu être rattachées à la commune, a_confirmer sinon (deux communes). |
| `croissance` | mesuree_2013_2023 si la croissance de la commune a été mesurée entre deux recensements, sinon indicative (scénario 2033 indicatif). |

## Champs de `regions.json`

| Champ | Signification |
|---|---|
| `region` | Région. |
| `cle_region` | Clé de la région utilisée par le site (majuscules, tiret bas). |
| `annee` | Année de l'annuaire : 2022, le plus récent trouvé. |
| `population_2022` | Population de la région dans l'annuaire. |
| `medecins` | Médecins du secteur public. |
| `infirmiers_diplomes_etat` | Infirmiers diplômés d'État (IDE). |
| `sages_femmes_etat` | Sages-femmes d'État. |
| `femmes_age_reproduction` | Femmes en âge de procréer (FAR). |
| `medecins_pour_10000_habitants` | Médecins pour 10 000 habitants ; la norme est 1. |
| `ide_pour_5000_habitants` | IDE pour 5 000 habitants ; la norme est 1. |
| `sages_femmes_pour_1500_far` | Sages-femmes pour 1 500 femmes en âge de procréer ; la norme est 1. |
| `couverture_des_normes_pct` | Moyenne des trois rapports, chacun plafonné à 100 %, en pourcentage entier. |
| `postes_sante_2022` | Postes de santé publics en 2022 : population divisée par la population couverte par poste (annuaire statistique 2022 du Ministère de la Santé, tel que cité par le rapport Countdown 2030), arrondie. |
| `femmes_distance_probleme_2017_pct` | Part des femmes de 15 à 49 ans pour qui la distance à l'établissement de santé était un problème important (EDS-Continue 2017, tableau 9.14, ANSD). |
| `tbs_secondaire_16_18_pct` | Taux brut de scolarisation au secondaire (16-18 ans) dans la région, en pourcentage (RGPH-5, 2023, rapport définitif du thème II, graphique II-11). |
| `tns_secondaire_16_18_pct` | Taux net de scolarisation au secondaire (16-18 ans) dans la région, en pourcentage : part des 16-18 ans qui fréquentent le secondaire (RGPH-5, 2023, même source). Moyenne nationale : 14,0 %. |
| `femmes_interrogees_2017` | Effectif de l'échantillon de l'EDS-Continue 2017 dans la région (réduit pour Kédougou : 158, donc plus incertain). |

## Exemples

Python : `import json; communes = json.load(open("communes.json", encoding="utf-8"))`

JavaScript : `const communes = await (await fetch("communes.json")).json();`
