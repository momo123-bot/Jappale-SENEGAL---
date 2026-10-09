# Dictionnaire de données - Jàppale Sénégal

Ce document décrit chaque fichier de `donnees/` et chaque colonne, pour qu'une personne qui ouvre un fichier sans connaître le projet puisse le lire correctement.

**Conventions communes**
- Les noms de région, département et commune sont en majuscules sans accents dans `donnees/` (exemple : `SAINT LOUIS`, `THIES`). L'export CSV de l'interface utilise la même écriture simplifiée.
- Une cellule vide signifie « valeur inconnue », jamais zéro.
- Plusieurs communes portent le même nom : Médina Gounass (Vélingara et Guédiawaye), Missirah, Vélingara, Dinguiraye, Mlomp. Pour identifier une commune, utiliser le trio région + département + commune.
- Le poste de santé est évalué à l'échelle de la commune ; le centre de santé et l'hôpital, équipements de bassin, à l'échelle du département.

## Ordre de production

| Fichier | Produit par | Lignes | Contenu |
|---|---|---|---|
| `rgph5_localites_nettoye.csv` | `code/01` | 25 241 | Population par localité (quartier, village, hameau), recensement RGPH-5 2023, nettoyé |
| `infrastructures_geolocalisees.csv` | `code/02` | 3 771 | Une ligne par structure de santé ou d'éducation géolocalisée |
| `score_deficit.csv` | `code/03` | 553 | Une ligne par commune : déficits de santé, établissements d'éducation, coordonnées |
| `croissance_2013_2023.csv` | `code/04` | 526 | Croissance mesurée entre 2013 et 2023, pour les communes appariées |
| `score_final_corrige.csv` | `code/05` | 553 | Fichier précédent enrichi : croissance, projection 2033, score combiné, fiabilité |
| `accessibilite_bassin.csv` | `code/07` | 553 | Fichier de référence final : ajoute la vue bassin. Source de l'interface |

## accessibilite_bassin.csv (fichier de référence)

| Colonne | Signification |
|---|---|
| `region`, `departement`, `commune` | Identification administrative |
| `population` | Population résidente RGPH-5 2023, somme des localités de la commune |
| `lat`, `lon` | Coordonnées de la commune : moyenne des positions des infrastructures qui lui sont rattachées. Vide si aucune infrastructure n'est rattachée |
| `nb_poste_sante` | Postes de santé recensés dans la commune. La couche source mélange 2 085 postes de santé et 39 centres médico-sociaux, comptés ensemble |
| `besoin_poste_sante` | Postes requis : population divisée par 10 000, arrondie à l'entier supérieur |
| `deficit_poste_sante` | Postes manquants : maximum de 0 et (besoin moins existants). Échelle commune |
| `nb_infra_education` | Collèges et lycées recensés, publics et privés (le secondaire). Ne couvre ni le primaire ni l'enseignement supérieur |
| `nb_univ_publiques` | Campus d'universités publiques : lignes étiquetées « publique » dans la source, hors espaces numériques et hors chantiers, regroupées en un campus quand elles sont à moins de 1,5 km dans une même commune |
| `nb_espaces_uvs` | Espaces numériques ouverts en service de l'Université numérique Cheikh Hamidou Kane (ex-UVS), regroupés à moins de 1 km |
| `nb_centres_commune`, `nb_hopitaux_commune` | Centres de santé et hôpitaux rattachés à la commune (pour la norme, ils ne comptent qu'à l'échelle du département) |
| `nb_centre_departement`, `besoin_centre_departement`, `deficit_centre_departement` | Centres de santé du département : existants, requis (population du département divisée par 50 000, arrondie au supérieur), manquants. Même valeur pour toutes les communes d'un département |
| `nb_hopital_departement`, `besoin_hopital_departement`, `deficit_hopital_departement` | Hôpitaux du département : existants (dont 6 hôpitaux privés au niveau national), requis (population du département divisée par 150 000, arrondie au supérieur), manquants |
| `taux_croissance_annuel_pct` | Croissance annuelle 2013-2023 de la commune, en pourcentage. Si elle n'a pas pu être mesurée, taux médian national de 2,94 |
| `source_taux` | `mesure_reelle_2013_2023` si le taux est mesuré, `taux_median_national` s'il s'agit de la valeur de repli |
| `population_2033_amortie` | Population projetée en 2033 : taux plein pendant 5 ans, puis taux ramené à mi-chemin de la médiane nationale pendant 5 ans. Scénario, pas prévision officielle |
| `deficit_sante_commune_2033_amorti` | Postes manquants en 2033 avec cette population, à nombre de postes inchangé |
| `percentile_sante` | Rang de la commune (0 à 100) sur le déficit de postes rapporté à la population. Vide si la commune n'a pas de coordonnées |
| `percentile_education` | Rang (0 à 100) sur la population par établissement secondaire. Vide si la commune n'a pas de coordonnées |
| `score_combine` | Moyenne simple des deux percentiles, de 0 à 100. Vide si la commune n'a pas de coordonnées |
| `fiabilite_donnee` | `fiable` si des infrastructures sont rattachées à la commune, sinon `non fiable - rapprochement des noms non confirme` |
| `postes_accessibles_bassin` | Postes accessibles à la commune en partageant la capacité de chaque poste entre les communes situées à moins de 15 km, au prorata de la proximité. Vide sans coordonnées |
| `deficit_bassin` | Postes manquants une fois ces postes accessibles pris en compte : maximum de 0 et (besoin moins postes accessibles) |
| `ecart_vs_deficit_communal` | `deficit_poste_sante` moins `deficit_bassin`. Positif : la commune est mieux desservie que son propre territoire ne le suggère. Négatif : ses postes sont aussi sollicités par des voisins |

Les fichiers `score_deficit.csv` et `score_final_corrige.csv` contiennent les 16 ou 24 premières colonnes de ce tableau, dans le même ordre.

## infrastructures_geolocalisees.csv

| Colonne | Signification |
|---|---|
| `type_structure` | `poste_sante`, `centre_sante`, `hopital`, `college`, `lycee` ou `universite` |
| `categorie` | `sante` ou `education` |
| `statut` | Public ou privé, tel qu'il figure dans la couche source (ex. « Université publique »). Les accents de la source sont retirés |
| `region`, `departement`, `commune` | Rattachement administratif tel qu'il figure dans la couche source (l'orthographe peut différer du recensement, voir la table d'alias du script `code/03`) |
| `nom` | Nom de la structure (champ `DESIGNATIO` de la couche source). Vide pour les collèges, dont la couche n'a pas ce champ. Les caractères mal encodés à la source sont supprimés |
| `latitude`, `longitude` | Coordonnées WGS84 (degrés décimaux), converties depuis la projection UTM zone 28N d'origine |

## croissance_2013_2023.csv

| Colonne | Signification |
|---|---|
| `region`, `commune_2023` | Commune du découpage 2023 à laquelle l'entité de 2013 a été rapprochée |
| `population_2013`, `population_2023` | Population aux deux recensements |
| `taux_croissance_annuel_pct` | Taux annuel moyen : (population 2023 divisée par population 2013) puissance 1/10, moins 1, en pourcentage |

Trois entités sont exclues car leur territoire a été redécoupé entre 2013 et 2023 (Keur Massar, Sicap Liberté, Guinaw Rail Nord).

## La couche « hôpital »

Elle compte 50 structures : 44 hôpitaux publics et 6 privés selon la couche source, dont 6 établissements psychiatriques ou de médecine traditionnelle et 4 annexes d'hôpitaux (HED, HEIN). Les effectifs par département (`nb_hopital_departement`) les comptent tous, comme à la source. Pour l'« hôpital le plus proche » affiché dans l'interface, les 6 établissements psychiatriques ou de médecine traditionnelle sont écartés, car ils ne remplacent pas un hôpital général. Les distances sont à vol d'oiseau.

## Export CSV de l'interface

Trois boutons exportent le même tableau de 24 colonnes, avec trois portées : « Télécharger les 553 communes (CSV) » dans le bloc « Pour les analystes : télécharger toutes les données » de la page Méthode et données (tout le pays, `jappale_senegal_communes.csv`), « Télécharger les N communes (CSV) » sur la fiche d'une région (`jappale_region_<région>.csv`) et « Télécharger cette commune (CSV) » sur la fiche d'une commune (une seule ligne, `jappale_<commune>_<département>.csv`). Format : séparateur point-virgule, encodage UTF-8 avec BOM (les accents s'affichent correctement) et **virgule décimale**, pour que les nombres soient lus comme des nombres dans un Excel réglé en français (cela n'a pas pu être testé avec Excel). Les fichiers de `donnees/`, eux, utilisent le point décimal, plus adapté au code.

Quand la page est affichée dans un aperçu intégré (par exemple dans un outil de présentation), le navigateur bloque les téléchargements : un panneau affiche alors le contenu à copier. Sur le site publié ou en ouvrant `docs/index.html` seul, le fichier se télécharge directement.

| Colonne exportée | Correspond à |
|---|---|
| `region`, `departement`, `commune`, `population` | Identiques au fichier de référence |
| `postes_existants`, `postes_requis` | `nb_poste_sante`, `besoin_poste_sante` |
| `deficit_postes_commune` | `deficit_poste_sante` |
| `deficit_postes_vue_bassin` | `deficit_bassin` (non arrondi) |
| `centres_manquants_departement`, `hopitaux_manquants_departement` | `deficit_centre_departement`, `deficit_hopital_departement` |
| `centres_ou_hopitaux_commune` | `nb_centres_commune` + `nb_hopitaux_commune` |
| `etablissements_secondaires` | `nb_infra_education` |
| `campus_universites_publiques` | `nb_univ_publiques` |
| `espaces_numeriques_unchk` | `nb_espaces_uvs` |
| `deficit_postes_2033_indicatif` | `deficit_sante_commune_2033_amorti` |
| `score_combine_sante_education` | `score_combine` |
| `donnees_confirmees` | `oui` si des infrastructures sont rattachées, `non` sinon |
| `croissance_mesuree` | `oui` si `source_taux` vaut `mesure_reelle_2013_2023` |
| `hopital_le_plus_proche`, `distance_hopital_km` | Hôpital général le plus proche et distance à vol d'oiseau en kilomètres (vides sans coordonnées) |
| `latitude`, `longitude` | `lat`, `lon` |
| `sources`, `norme_postes` | Sources des données (RGPH-5 2023 de l'ANSD et Géo Sénégal 2023) et ratio de référence des postes de santé (1 pour 10 000 habitants), identiques sur toutes les lignes, pour que le fichier reste documenté une fois séparé de la plateforme |

Le bouton « Exporter ce classement (CSV) » du simulateur produit un fichier distinct : rang, commune, département, région, postes manquants, population desservie en plus (estimation), cumul, budget et année.

## Sources

Recensement RGPH-5 2023 (ANSD), infrastructures géolocalisées (Géo Sénégal / ANSD, 2023), RGPHAE 2013 (ANSD). Détail, recoupements et limites : `documents/Jappale_Senegal_note_methodologique.docx`.

## personnel_sante_region_2021.csv

Personnel de santé et postes de santé publics, par région (14 lignes). **Source : Annuaire des statistiques sanitaires et sociales du Sénégal 2021**, Ministère de la Santé et de l'Action sociale (DPRS / DSISS) : tableau 1 (population), tableaux 5 à 8 (personnel, source DRH / iHRIS) et tableau 16 (structures, source DHIS2). Saisi à la main à partir du PDF ; `tests/test_chiffres_cles.py` vérifie que chaque total est égal au total imprimé dans l'annuaire.

| Colonne | Contenu |
|---|---|
| `region` | Région, écrite comme dans les autres fichiers |
| `population_2021` | Population totale 2021 de l'annuaire (tableau 1) |
| `medecins` | « Total général » du tableau Médecins (tableaux 5 et 6) |
| `chirurgiens_total`, `dentistes` | Total des chirurgiens (tableau 7) et, parmi eux, les dentistes |
| `sages_femmes_etat` | Sages-femmes d'État (tableau 8) |
| `infirmiers_diplomes_etat`, `infirmiers_brevetes` | Infirmiers diplômés d'État et infirmiers brevetés (tableau 8) |
| `postes_de_sante_publics` | Postes de santé publics (tableau 16) |

À lire avec prudence : ce sont les effectifs du Ministère. Ils ne comptent ni le secteur privé, ni les autres employeurs publics, ni les aides-soignants. **Pour le personnel, ce fichier est remplacé par `personnel_sante_region_2022.csv`** : l'annuaire des ressources humaines donne des effectifs 2021 plus élevés (2 710 sages-femmes contre 2 414 ici). Ce fichier reste utilisé pour les postes de santé publics par région.

## personnel_sante_region_2022.csv

Personnel de santé par région, selon l'**Annuaire statistique des ressources humaines 2022**, Direction des ressources humaines du Ministère de la Santé et de l'Action sociale (tableaux 2 à 5, base iHRIS). Saisi à la main à partir du PDF ; `tests/test_chiffres_cles.py` vérifie les totaux et les ratios imprimés dans l'annuaire.

| Colonne | Contenu |
|---|---|
| `region` | Région, écrite comme dans les autres fichiers |
| `population_2022` | Population 2022 de l'annuaire (tableau 3) |
| `medecins` | Médecins (tableau 2) ; norme : 1 pour 10 000 habitants |
| `infirmiers_diplomes_etat` | Infirmiers diplômés d'État (tableau 2) ; norme : 1 pour 5 000 habitants |
| `sages_femmes_etat` | Sages-femmes d'État (tableau 2) ; norme : 1 pour 1 500 femmes en âge de procréer |
| `femmes_age_reproduction` | Femmes en âge de procréer (tableau 5) |

Les normes sont celles du Plan national de développement sanitaire et social, appliquées par l'annuaire. Effectifs du secteur public uniquement. Millésime 2022 : le plus récent trouvé. Le tableau des médecins de l'annuaire imprime des ratios arrondis de façon incohérente pour trois régions (Dakar, Saint-Louis, Thiès) : le projet recalcule les ratios à partir des effectifs.

## anomalies_signalees.csv

Registre des anomalies repérées dans les couches de données de l'ANSD, produit par `code/registre_anomalies.py`. Séparateur virgule, encodage UTF-8 avec marque d'ordre des octets. Une ligne par anomalie.

| Colonne | Signification |
|---|---|
| `id` | Numéro de l'anomalie (A01, A02...). |
| `couche` | Fichier de données concerné. |
| `nature` | « mesuré dans la couche » (recalculé par le script) ou « écart avec un document officiel » (valeur recopiée d'une publication du Ministère de la Santé). |
| `anomalie` | Description de l'anomalie. |
| `nombre` | Nombre de lignes ou d'éléments concernés (texte pour une fourchette). |
| `exemples` | Quelques exemples. |
| `comment_verifier` | Comment refaire le contrôle. |
| `recommandation` | Ce que nous recommandons à l'ANSD. |

## Données ouvertes (docs/donnees-ouvertes/)

Version et journal des modifications : `CHANGELOG_DONNEES.md`. Schéma de `communes.json` : `docs/donnees-ouvertes/schema-communes.json`.

`communes.json`, `regions.json` et une copie du registre, produits par `code/exporter_donnees_ouvertes.py`. Chaque champ est décrit dans `docs/donnees-ouvertes/LISEZ-MOI.md`. Licence : `LICENCE_DONNEES.md`.

## postes_sante_region_2022.csv

Postes de santé publics par région en 2022, retrouvés à partir de l'annuaire statistique 2022 du Ministère de la Santé tel que cité par le rapport Countdown 2030 Sénégal (juin 2023), tableau « population couverte par structure ». `postes_sante_2022` = `population_utilisee` divisée par `habitants_par_poste_sante`, arrondi. La somme des régions est 1 583 ; le rapport écrit 1 584. Ce fichier sert au recalage de `tests/analyse_postes_officiels.py`. À remplacer par les chiffres de l'annuaire 2022 lui-même dès qu'on l'aura en main.

## eds_distance_region_2017.csv

Part des femmes de 15 à 49 ans pour qui la distance à l'établissement de santé était un problème important, par région : EDS-Continue Sénégal 2017 (ANSD), tableau 9.14. `femmes_interrogees` est la taille de l'échantillon dans la région (158 à Kédougou : résultat plus incertain).

## education_moyen_secondaire_national.csv

Indicateurs nationaux du moyen et du secondaire, publics et privés, calculés à partir de tableaux agrégés du recensement scolaire (données générales, effectifs et groupes pédagogiques, enseignants, locaux), téléchargés par l'équipe ; ces tableaux bruts ne sont pas redistribués. L'année n'est pas précisée dans les fichiers. Les établissements communautaires ou associatifs sont exclus (voir la colonne `remarque`). Aucune ventilation par région ou par commune.

## projections_ansd_communes.csv

Projections démographiques officielles de l'ANSD (2023-2073) pour les 553 communes du site, lues dans le PDF des projections par `code/projections_officielles.py`. `population_2023_site` vient du recensement (RGPH-5) tel que le site l'utilise ; `population_2023_ansd` et `population_2033_ansd` viennent du tableau de projections (colonne « Ensemble »). `appariement` : `exact` (région, département, commune) ou `region+commune` (nom de département différent). `utilisee` vaut 1 si la population 2023 du tableau est identique à celle du site, 0 sinon (9 communes, anomalie A13) : dans ce cas la projection officielle n'est pas utilisée. La somme des 553 communes redonne le total national (18 126 390 en 2023, 23 504 174 en 2033, à quelques unités près).

## rgph5_scolarisation_secondaire_region.csv

Taux brut et net de scolarisation au secondaire (16-18 ans) par région, en pourcentage : RGPH-5 (2023), rapport définitif du thème II, graphique II-11 (page 30), lus sur le graphique et recoupés avec les extrêmes cités dans le texte. La ligne `SENEGAL` donne la moyenne nationale (tableau II-10). Chiffres régionaux : aucun détail communal.

## services_sociaux_ansd_commune.csv

Services sociaux de base géoréférencés remis par l'ANSD (RGPH-5, 2023) pour Dakar, Diourbel et Thiès, agrégés par commune (142 lignes) par `code/services_sociaux_ansd.py`. Le classeur brut (6 449 + 2 902 + 705 points) n'est pas publié. Les colonnes `population`, `postes_necessaires`, `postes_notre_couche` et `secondaire_notre_couche` viennent de notre propre fichier. Santé : `postes`, `centres_sante`, `cases_sante`, `hopitaux` (publics et privés), `centres_medico_sociaux`, `maternites`, `cliniques_cabinets`, `pharmacies`, `laboratoires`. Éducation : `petite_enfance` (maternelles, jardins d'enfants, préscolaire, garderies, cases des tout-petits, centres d'éveil), `elementaire_public`, `elementaire_prive`, `college_public`, `college_prive`, `lycee_public`, `lycee_prive`, `formation` (centres et instituts), `universites`. Eau : `forages`, `chateaux_eau`. Distances en kilomètres : `distance_secondaire_*_km` (0 quand la commune a au moins un collège ou lycée, sinon distance du centre de la commune au plus proche) et `distance_hopital_*_km` (du centre de la commune à l'hôpital le plus proche), calculées avec les points de l'ANSD (`_ansd_`) et avec notre couche (`_notre_couche_`). `appariement` : `exact`, `region+commune` ou `alias` (écritures différentes du nom de la commune). La somme de chaque thème redonne exactement le total du classeur.
