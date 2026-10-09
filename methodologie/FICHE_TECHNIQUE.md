# Fiche technique - Jàppale Sénégal

**En bref :** chaque fichier du dépôt, ce qu'il fait et comment le relancer. Pour les personnes qui veulent vérifier ou reprendre le code.

Document de référence : quelles données, quels outils, et comment chaque
étape a été construite et vérifiée. Objectif : que n'importe quelle personne
qui reprend le projet puisse reproduire, auditer ou faire évoluer n'importe
quelle partie sans avoir à deviner comment elle a été construite.

## 1. Vue d'ensemble de la chaîne

```
Données brutes (CSV, XLSX, SHP, PDF)
        |
        v
Nettoyage + rapprochement (Python)
        |
        v
Fichiers de score (CSV) : déficit, horizon 2033, score combiné
        |
        v
   +----+----+
   |         |
Algorithme   Site web statique
(Python,     (6 pages HTML/CSS/JS,
CLI)         calcul dupliqué en JS)
```

Le calcul existe à deux endroits volontairement séparés : une version
Python (`code/06_algorithme_arbitrage_budgetaire.py`, exécutable en ligne de
commande, sert de référence et de validation) et une version JavaScript
intégrée au site (pour fonctionner dans le navigateur sans backend).
Les deux implémentent la même logique et ont été vérifiées comme produisant
des résultats cohérents.

## 2. Données sources et leur provenance exacte

| Donnée | Format | Origine | Comment obtenue |
|---|---|---|---|
| Répertoire des localités RGPH-5 (2023) | 46 fichiers CSV (25 317 lignes au total) | ansd.sn | Téléchargées manuellement par l'équipe depuis l'outil de recherche du site ANSD (accès automatisé bloqué par robots.txt) |
| Infrastructures santé (poste, centre, hôpital) | 3 shapefiles (.shp/.dbf/.shx/.prj), projection UTM zone 28N | Géo Sénégal / ANSD (2023) | Fournies par l'équipe en archives zip |
| Infrastructures éducation (collège, lycée ; la couche université est traitée à part) | 3 shapefiles, même projection | Géo Sénégal / ANSD (2023) | Fournies par l'équipe en archives zip |
| RGPHAE 2013 (population par commune d'arrondissement / communauté rurale) | 1 fichier Excel, 831 lignes, 14 blocs régionaux | ANSD, via Humanitarian Data Exchange | Téléchargé manuellement (accès automatisé refusé - protection anti-robot) |
| Normes et standards de l'École | 1 PDF, 42 pages | Ministère de l'Éducation nationale, édition 2020 | Fourni par l'équipe |
| Contour national du Sénégal | 1 GeoJSON (44 points, simplifié) | Dépôt public GitHub (glynnbird/countriesgeojson) | Téléchargé via `curl` (domaine autorisé) |
| Frontières des 14 régions | 1 GeoJSON extrait d'un jeu mondial (124 Ko après filtrage) | Natural Earth (domaine public), via GitHub (datasets/geo-ne-admin1) | Fichier mondial de 44 Mo téléchargé, puis filtré aux seules entités du Sénégal |
| Décret de création du département de Keur Massar | Texte officiel (Journal officiel) | Décret n° 2021-687 du 28 mai 2021, Journal officiel n° 7429 du 11 juin 2021 | Pour expliquer une anomalie de croissance détectée dans les données |

**Ce qui a été délibérément écarté** : les microdonnées ANADS (accès
restreint aux organismes du Système statistique national) et le fichier de
frontières communales GADM v4.1 (licence interdisant la redistribution sans
autorisation - incompatible avec un dépôt public).

## 3. Outils et bibliothèques utilisés

### Python (traitement des données et algorithme)
| Outil | Usage |
|---|---|
| `csv`, `json`, `math`, `dataclasses` (bibliothèque standard) | Lecture/écriture de fichiers, structures de données, calculs |
| `openpyxl` | Lecture du fichier Excel RGPHAE 2013 |
| `pyshp` (`shapefile`) | Lecture des fichiers `.shp` d'infrastructures |
| `pyproj` (`Transformer`) | Conversion des coordonnées UTM zone 28N vers WGS84 (latitude/longitude standard) |
| `rapidfuzz` (`fuzz`, `process`) | Rapprochement approximatif de noms de communes/départements entre fichiers qui ne s'écrivent pas toujours identiquement |
| `python-docx` | Génération et correction des documents Word (proposition, résumé, note méthodologique, etc.) |

### JavaScript (site web)
Aucun framework, aucune bibliothèque externe : JavaScript natif ("vanilla"),
choix délibéré pour que la page fonctionne hors ligne et reste conforme aux
contraintes de sécurité d'une page web publiée (pas de dépendance à un
serveur tiers). La carte est du SVG généré par calcul, pas une bibliothèque
cartographique.

Le site compte sept pages, qui partagent des fichiers communs :

| Page | Contenu | Fichiers propres |
|---|---|---|
| `index.html` (Accueil) | Carte des communes avec interrupteur Santé / Éducation, chiffres clés, liste des communes les plus touchées, recherche, assistant | `accueil.js`, `accueil.css` |
| `explorer.html` (Explorer la carte) | Carte plein écran (communes ou régions, santé ou éducation, vue commune ou bassin), fiches, simulateur, assistant | `script.js`, `style.css` |
| `communes.html` | Tableau des 553 communes (tri, filtres) et fiche d'une commune | `communes.js`, `communes.css` |
| `comparer.html` | Comparaison de 2 à 4 communes ou régions, en santé ou en éducation | `comparer.js`, `comparer.css` |
| `synthese.html` (page « À propos : l'essentiel en une page », sans onglet) | L'essentiel en une page pour les décideurs : situation, communes et régions prioritaires, budget de 10 postes, bases des chiffres, limites ; imprimable sur une page A4 | `synthese.js`, `synthese.css`, `simulation.js` |
| `simulateur.html` (Simuler un budget) | Simulation en pleine page : périmètre (pays, région, département), nombre de structures, année, comparaison avec un classement simple, liste, carte des communes retenues, export CSV | `simulateur.js`, `simulateur.css`, `simulation.js` |
| `methode.html` (Méthode et données) | Glossaire, sources, normes, limites, recoupements, données pour les analystes | `methode.js`, `methode.css` |

Communs : `data.js` (les 553 communes, produit par `code/08_generer_donnees_maquette.py`), `regions.js` (frontières des 14 régions), `site.js` (menu, recherche, thème sombre par défaut et mémorisé, bouton « Haut », formulaire de contact, outils partagés), `simulation.js` (le moteur du simulateur, partagé par l'explorateur et la page « Simuler un budget » : un seul calcul, deux écrans), `assistant.js` (le moteur de l'assistant, partagé par toutes les pages : il répond uniquement à partir des données), `assistant-page.js` (le panneau de l'assistant sur chaque page), le dossier `images/` (quatorze illustrations WebP, fonds blancs retirés pour suivre le thème clair ou sombre, et une photo, toutes de moins de 30 Ko) et les icônes.

### Outils système utilisés pendant le développement
| Outil | Usage |
|---|---|
| `unittest` (bibliothèque standard Python) | Tests automatiques des chiffres clés (dossier `tests/`) |
| Node.js + `jsdom` | Simuler un navigateur pour tester automatiquement la maquette (clics, saisie, vérification du résultat affiché) sans ouverture manuelle |
| `node --check` | Vérifier qu'un script JavaScript est syntaxiquement valide avant publication |
| LibreOffice (`soffice`, sans interface graphique) | Convertir les documents Word en PDF pour vérification visuelle |
| `pdftoppm` / `pdfinfo` (Poppler) | Convertir des pages PDF en images, compter les pages |
| `curl` | Télécharger les fichiers de frontières géographiques depuis GitHub |
| `zip` / `unzip` | Constituer l'archive du dépôt à pousser sur GitHub |

## 4. Pipeline de traitement, étape par étape

1. **Nettoyage du recensement** : fusion des 46 fichiers RGPH-5, suppression de 76 lignes en double exactes (sans ce nettoyage, Ziguinchor afficherait 27 673 habitants de trop). Un cas de valeurs contradictoires sous un même nom (Darou Mouhty) : les deux lignes sont conservées, car ce sont probablement deux localités homonymes ; cela redonne exactement le total publié pour Louga.
2. **Extraction des infrastructures** : lecture des 6 shapefiles, extraction des champs région/département/commune de rattachement (`REG`, `DEPT`, `CCRCA`) et des coordonnées brutes (UTM).
3. **Conversion de projection** : chaque point d'infrastructure converti d'UTM zone 28N vers WGS84 via `pyproj`, pour obtenir de vraies latitude/longitude.
4. **Rapprochement population ↔ infrastructures, en deux temps** (département, puis commune à l'intérieur du département) : correspondance exacte (93,9 % des 3 771 infrastructures), similarité textuelle avec `rapidfuzz` (5,0 %), et table d'alias de sept variantes d'orthographe validées une à une (1,1 %). Aucune infrastructure n'est restée non rattachée.
5. **Calcul du déficit santé** : normes OMS/ANSD appliquées au niveau commune pour les postes de santé, au niveau département (agrégation) pour les centres et hôpitaux - correction apportée après détection d'une erreur de granularité (voir note méthodologique, section 2.1 bis).
6. **Croisement RGPH-4 (2013) / RGPH-5 (2023)** : extraction de 544 entités de population 2013, rapprochement à 97,2 % avec les communes 2023, calcul d'un taux de croissance annuel réel par commune. Trois communes exclues après investigation (redécoupage administratif de 2021).
7. **Projection 2033** : taux mesuré appliqué à taux plein sur 5 ans, puis amorti vers la médiane nationale sur les 5 années suivantes, pour éviter les extrapolations mécaniques déraisonnables (cas de Sangalkam, +25 %/an mesuré).
8. **Score combiné santé/éducation** : rang percentile sur chaque volet, moyenne à poids égal, communes au rapprochement non confirmé explicitement exclues du classement.
9. **Éducation et enseignement supérieur, comptés séparément** : le secondaire est la somme des couches « collège » (481 lignes, presque toutes privées) et « lycée » (861 lignes, dont les collèges publics), soit 1 342 établissements. La couche « université » compte 114 lignes qui ne sont pas 114 universités (campus, écoles doctorales, amphithéâtres, annexes, espaces numériques, chantiers, 46 établissements privés) : on ne retient que les lignes étiquetées « publique », hors espaces numériques et hors chantiers, regroupées à moins de 1,5 km dans une même commune (25 campus dans 21 communes) ; les espaces numériques de l'Université numérique Cheikh Hamidou Kane, ex-UVS, sont comptés à part (23 sites dans 22 communes). Les centres de santé et hôpitaux sont aussi comptés par commune, pour signaler les communes servies sur place malgré l'absence de poste.
9. **Génération des coordonnées de communes** : calculées comme le centroïde (moyenne) des points d'infrastructures géolocalisées qui leur sont rattachés - une commune sans aucune infrastructure recensée n'a donc pas de coordonnées (2 communes dans ce cas : Sama Kanta Peulh et Diouboudou, signalées « à confirmer » dans l'interface).
10. **Frontières cartographiques** : contour national et 14 régions projetés en coordonnées SVG par une projection équirectangulaire simple (calculée à la main, pas de bibliothèque de projection cartographique).

## 5. Méthode de test et de vérification

Aucun résultat n'a été publié sans vérification. Concrètement :

- **Vérification des taux de correspondance** : chaque étape de rapprochement (population/infrastructures, 2013/2023) a été mesurée et affichée avant d'être acceptée - jamais supposée à 100 %.
- **Tests fonctionnels automatisés du site** (`tests/interface/`, voir son README) : `jsdom` simule un vrai navigateur et vérifie, après chaque modification, que la carte, les fiches, la recherche, le simulateur, l'assistant, la comparaison, l'interrupteur santé / éducation, le thème et les liens directs produisent le résultat attendu - pas une simple relecture visuelle du code. Les valeurs attendues (par exemple les classes d'éducation ou les chiffres du glossaire) sont recalculées à part, sans passer par le code du site.
- **Essais auprès de dix-sept personnes de profils différents** : retours oraux, puis captures d'écran du site sur ordinateur et sur téléphone. Chaque remarque a été traitée ou écartée explicitement. Exemples de changements : la carte passe avant le texte sur téléphone, l'éducation a la même place que la santé, le menu ne se cache plus sous le simulateur, le tableau des communes garde ses colonnes utiles sur téléphone, les liens importants sont de vrais boutons, un glossaire explique les mots techniques. Aucun élu, ONG ou journaliste n'a encore utilisé le site dans son travail.
- **Erreurs réelles détectées puis corrigées** : une confusion entre "Ranérou" et "Ranérou Ferlo" ; "Médina" qui pointait vers le mauvais département ; sept communes affichées à 0 poste à cause d'une orthographe différente (Wouro Sidy : 8 postes recensés sous le nom "Ouro Sidy") ; deux communes homonymes (Médina Gounass) qui s'écrasaient dans l'algorithme et dans la recherche. Chacune a été corrigée et revérifiée avant publication.
- **Suite de tests automatiques** (`tests/test_chiffres_cles.py`, 72 tests, bibliothèque standard Python `unittest`, aucune installation) : structure administrative, population totale, régions, Touba, variantes d'orthographe, conservation de la capacité, glouton jamais inférieur au classement simple, sensibilité au rayon, cohérence entre le pipeline, la maquette et `docs/`. Un test a d'ailleurs échoué lors de sa rédaction et corrigé une affirmation trop optimiste sur la stabilité au rayon de chalandise.
- **Recoupements avec des sources indépendantes** (note méthodologique, section 4.1) : structure administrative, population, croissance, normes de santé, population 2013, effectifs de structures.
- **Parité Python / JavaScript vérifiée** : les gains de l'algorithme calculés dans le navigateur coïncident à l'unité près avec ceux du script Python, pour cinq budgets.
- **Validation croisée** : les résultats de l'algorithme Python (exécuté en ligne de commande) ont été comparés à ceux de sa version JavaScript intégrée, pour s'assurer qu'ils concordent.
- **Vérification visuelle systématique** : chaque document Word généré a été converti en PDF puis en images pour une relecture visuelle avant d'être livré, pas seulement généré et transmis sans contrôle.
- **Auto-détection d'une erreur de comparaison dans l'algorithme** : la première version comparait la méthode gloutonne (chevauchement retiré) à une méthode naïve non corrigée du même chevauchement, ce qui faussait la comparaison. L'erreur a été identifiée, expliquée et corrigée avant d'être présentée comme résultat.

## 6. Fichiers de sortie et leur rôle

| Fichier | Rôle |
|---|---|
| `donnees/rgph5_localites_nettoye.csv` | Population par localité, nettoyée |
| `donnees/score_final_corrige.csv` | Déficit santé (commune + département), éducation, croissance, projection 2033 amortie, score combiné |
| `donnees/personnel_sante_region_2021.csv` | Personnel de santé et postes publics par région, saisis dans l'annuaire 2021 du Ministère de la Santé, pour l'éclairage régional de la limite « personnel » |
| `donnees/personnel_sante_region_2022.csv` | Personnel de santé par région (médecins, IDE, sages-femmes) selon l'annuaire des ressources humaines 2022, avec les normes officielles du Ministère |
| `donnees/accessibilite_bassin.csv` | Le fichier précédent enrichi de la vue bassin (capacité des postes partagée entre communes voisines) ; source de l'interface |
| `donnees/DICTIONNAIRE_DE_DONNEES.md` | Signification de chaque colonne des fichiers de données et de l'export CSV |
| `code/06_algorithme_arbitrage_budgetaire.py` | Algorithme de sélection sous contrainte budgétaire, exécutable en ligne de commande |
| `code/06_resultats_algorithme.txt` | Sortie enregistrée d'une exécution de référence de l'algorithme |
| `code/08_generer_donnees_maquette.py` | Produit `data.js` (communes et totaux régionaux) pour l'interface |
| `tests/navigateur/` | 179 mesures de mise en page dans un vrai navigateur (Chromium), en deux parties d'environ deux minutes (`npm test` ou `npm run test:1` et `npm run test:2`), dont la synthèse imprimée sur une page, facultatif | npm install, puis npm test |
| `tests/analyse_personnel_region.py` | Densité de personnel de santé par région (2,1 à 6,8 pour 10 000 habitants) comparée aux minimums de l'OMS (22,8 et 44,5), et postes de l'annuaire comparés à la couche source | python3 tests/analyse_personnel_region.py |
| `tests/analyse_personnel_normes.py` | Couverture en personnel de santé par région selon les normes officielles (médecins 1 pour 10 000, IDE 1 pour 5 000, sages-femmes 1 pour 1 500 femmes en âge de procréer) | python3 tests/analyse_personnel_normes.py |
| `tests/analyse_isolement_scolaire.py` | Isolement scolaire : distance au collège ou lycée le plus proche, et choix glouton de sites à créer (seuils 10, 15 et 20 km) | python3 tests/analyse_isolement_scolaire.py |
| `tests/analyse_sensibilite_arrondi.py` | Sensibilité du total de postes manquants à la convention d'arrondi (553, 447, 440 ou 369 selon la convention ; classement inchangé) | python3 tests/analyse_sensibilite_arrondi.py |
| `tests/analyse_sensibilite_croissance.py` | Sensibilité du déficit 2033 au taux de croissance (920 à 1 190 postes selon l'hypothèse) | python3 tests/analyse_sensibilite_croissance.py |
| `code/registre_anomalies.py` | Recalcule le registre des anomalies des couches de données et écrit `donnees/anomalies_signalees.csv` | python3 code/registre_anomalies.py |
| `code/exporter_donnees_ouvertes.py` | Publie les données dérivées en JSON (`docs/donnees-ouvertes/`) et prépare `docs/complements.js` (personnel par région, isolement scolaire) | python3 code/exporter_donnees_ouvertes.py |
| `donnees/anomalies_signalees.csv` | Registre des anomalies repérées dans les couches de l'ANSD, avec recommandations |
| `donnees/LICENCE_DONNEES.md` | Licence des données dérivées (ODC-By 1.0) et réserve sur les données sources |
| `methodologie/RETOUR_A_L_ANSD.md` | Le registre des anomalies expliqué, fiche minimale de métadonnées proposée, façon de le transmettre |
| `methodologie/PERSPECTIVES_ET_DURABILITE.md` | Ce qui est durable, comment mettre à jour, pistes de développement, ce qui n'est pas promis |
| `tests/analyse_postes_officiels.py` | Recale les postes de la couche sur les nombres officiels de 2022 (manque d'environ 796 au lieu de 553) et corrèle nos indicateurs au ressenti de distance de l'EDS-Continue 2017 | python3 tests/analyse_postes_officiels.py |
| `donnees/postes_sante_region_2022.csv` | Postes de santé publics par région en 2022 (annuaire 2022 cité par le rapport Countdown 2030) |
| `donnees/eds_distance_region_2017.csv` | Ressenti de distance aux soins par région (EDS-Continue 2017, tableau 9.14) |
| `donnees/education_moyen_secondaire_national.csv` | Indicateurs nationaux du moyen et du secondaire (recensement scolaire) |
| `tests/navigateur/audit_accessibilite.js` | Audit automatique d'accessibilité (axe-core, WCAG 2.0 à 2.2 A et AA, et bonnes pratiques) des neuf vues du site, en thèmes clair et sombre | cd tests/navigateur, npm install, npm run audit |
| `donnees/CHANGELOG_DONNEES.md` | Journal des versions des données publiées |
| `docs/donnees-ouvertes/schema-communes.json` | Schéma (JSON Schema) de communes.json |
| `docs/confort.js` et `docs/confort.css` | Réglages de confort de lecture : taille du texte, contraste renforcé, animations réduites ; mémorisés dans le navigateur | aucune |
| `tests/navigateur/verifier_confort.js` | Vérifie dans un vrai navigateur le texte très grand et le contraste renforcé à 360 px, le clavier, la mémorisation et les cibles tactiles | cd tests/navigateur, npm run test:confort |
| `methodologie/DECLARATION_ACCESSIBILITE.md` | Ce qui est en place, vérifié et non vérifié en accessibilité |
| `docs/fiche-export.js` | Fabrique dans le navigateur le PDF et le fichier Word (.docx) de la fiche de décision : aucune bibliothèque, aucun serveur, hors connexion | aucune |
| `code/projections_officielles.py` | Lit le PDF des Projections démographiques 2023-2073 de l'ANSD et le rapproche des 553 communes (règle de prudence : utilisée seulement si la population 2023 du tableau égale celle du recensement) | python3 projections_officielles.py chemin/vers/le.pdf |
| `donnees/projections_ansd_communes.csv` | Population 2023 et 2033 officielles par commune, mode de rapprochement, et si elle est utilisée |
| `donnees/rgph5_scolarisation_secondaire_region.csv` | Taux brut et net de scolarisation au secondaire par région (RGPH-5, thème II, graphique II-11) et moyenne nationale |
| `tests/verifier_deploiement.py` | Vérifie en une commande qu'un déploiement fonctionne (dossier docs ou site en ligne) : sept pages, fichiers chargés, liens, 553 communes, 14 régions ; bibliothèque standard de Python seulement | python3 tests/verifier_deploiement.py [adresse] |
| `tests/navigateur/verifier_mobiles.js` | Cinq tailles de téléphone simulées x sept pages, navigateur sans fonctions JavaScript récentes, message pour navigateur trop ancien (ne remplace pas un essai sur un vrai téléphone) | cd tests/navigateur, npm run test:mobiles |
| `docs/polices/` et `docs/polices.css` | Polices embarquées (Source Sans 3, Source Serif 4, licence SIL OFL) : aucun appel à un service extérieur | aucune |
| `methodologie/NOTE_DE_PRESENTATION.md` | Le projet en une page (lecture rapide), générée avec son PDF à partir des vrais fichiers de données | aucune |
| `methodologie/GESTION_DES_DONNEES.md` | Où sont les données, où les héberger, comment les garder à jour et les étendre | aucune |
| `code/services_sociaux_ansd.py` | Agrège par commune les services sociaux de base géoréférencés remis par l'ANSD (pilote : Dakar, Diourbel, Thiès) ; s'arrête si un point est perdu | python3 services_sociaux_ansd.py chemin/vers/le_classeur.xlsx |
| `donnees/services_sociaux_ansd_commune.csv` | Totaux par commune (142 communes) : établissements de santé, d'éducation et points d'eau, distances recalculées, comparaison avec notre couche |
| `docs/pilote.js` | Les mêmes totaux, chargés par la fiche d'une commune (14 Ko, généré par le script 08) | aucune |
| `docs/assistant-llm.js` | Assistant avec IA locale (Ollama, phi4-mini, modèle existant non entraîné sur nos données) : faits fournis au modèle, contrôle des chiffres et des lieux, réponse calculée en secours | aucune |
| `tests/interface/03_assistant_ia.test.js` et `lancer_tout.js` | 19 contrôles de l'assistant avec IA face à un faux serveur Ollama ; `npm test` lance les trois fichiers | cd tests/interface, npm run test:ia |
| `tests/ia/evaluer_assistant_ia.js` | Banc d'essai avec le vrai modèle (facultatif, Ollama requis) | node tests/ia/evaluer_assistant_ia.js |
| `methodologie/ASSISTANT_IA.md` | Mode d'emploi de l'assistant avec IA locale | aucune |
| `tests/test_chiffres_cles.py` | 72 tests automatiques des chiffres clés et de la cohérence pipeline / maquette |
| `docs/` | Site complet de sept pages (synthèse, carte, fiches, simulateur, assistant, comparaison, méthode, export CSV), autonome, sans dépendance serveur ; c'est aussi le dossier servi par GitHub Pages |
| `tests/interface/` | Contrôles automatiques de l'interface avec `jsdom` (`npm install` puis `npm test`) |
| `methodologie/GLOSSAIRE.md` | Les phrases du site et les mots techniques, expliqués simplement (même texte que la page Méthode et données) |
| `documents/Jappale_Senegal_note_methodologique.docx` | Définitions, sources, recoupements, taux de fiabilité, limites déclarées |
| `methodologie/PROCEDURE_DEPLOIEMENT.md` | Mise en ligne pas à pas, avec méthode de secours |
| `methodologie/FEUILLE_DE_ROUTE.md` | Ce qu'il reste à construire, par ordre de priorité réelle |

Ce document doit être mis à jour à chaque fois qu'un outil ou une source de
données change : c'est la référence pour savoir comment chaque résultat est obtenu.
