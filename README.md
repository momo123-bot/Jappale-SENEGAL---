# Jàppale Sénégal (V11)

**Le problème.** Où manque-t-il un poste de santé ou un collège ? Les chiffres existent, mais éparpillés et parfois contradictoires. Un élu ne peut pas comparer, un habitant ne sait pas si sa commune est bien servie.

**Notre réponse.** Un site simple, organisé en trois rubriques (Comprendre, Explorer, Agir), qui marche sur téléphone et sans connexion : on tape le nom de sa commune, on voit ce qui manque, d'où vient le chiffre et quelles sont ses limites. Les 553 communes du Sénégal, une fiche d'une page à imprimer ou à télécharger (PDF, Word).

**Pour qui.** D'abord les décideurs qui veulent construire un poste de santé ou un établissement scolaire : ministères, partenaires au développement, collectivités (fiche de décision d'une page, simulateur de budget). Ensuite les autres élus locaux, les journalistes, les chercheurs et les enseignants. Tout habitant peut aussi vérifier la situation de sa commune. Le site ne peut pas tout montrer : il garde l'essentiel, le détail est dans la page Méthode et dans ce dépôt.

## Ce que nous avons trouvé

- **Au moins 553 postes de santé manquent** (environ 800 si l'on recale sur les nombres officiels), et entre 898 et 1 040 en 2033.
- **15 anomalies** relevées dans les données et signalées à l'ANSD (`donnees/anomalies_signalees.csv`, `methodologie/RETOUR_A_L_ANSD.md`).
- Avec les données géoréférencées que l'ANSD nous a remises (Dakar, Diourbel, Thiès) : nos hôpitaux et nos centres de santé sont confirmés, mais il manque à notre couche les collèges privés. L'isolement scolaire est donc surestimé.

## Testé par de vraies personnes

**Plus de 19 personnes réelles** ont testé le site et donné leurs remarques, de profils différents : lycéen, étudiants, grands-parents, habitants, médecin, juriste, professeurs, doctorant. Leurs noms restent confidentiels. Chaque remarque, et ce que nous en avons fait : `methodologie/SUIVI_DES_RETOURS.md`. C'est ce travail qui a fait la version V11.

## Les trois documents essentiels

| Document | Ce qu'il contient |
|---|---|
| `methodologie/METHODOLOGIE.md` | D'où viennent les chiffres et comment ils sont calculés, en une page |
| `methodologie/LIMITES.md` | Ce que les chiffres ne disent pas |
| `methodologie/PROCEDURE_DEPLOIEMENT.md` | Mettre le site en ligne en 5 minutes |

Les autres documents de `methodologie/` sont des annexes, pour qui veut vérifier un point précis.

## Voir le site, le mettre en ligne

- **Sans rien installer** : décompresser, ouvrir le dossier `docs`, double-cliquer sur `index.html`.
- **En ligne** : GitHub Pages (Settings, Pages, branche main, dossier /docs). Pas à pas : `methodologie/PROCEDURE_DEPLOIEMENT.md`.
- **Vérifier un déploiement en une commande** : `python3 tests/verifier_deploiement.py` (ou avec l'adresse du site en ligne).
- **Données ouvertes** : `docs/donnees-ouvertes/` (licence : `donnees/LICENCE_DONNEES.md`).

## Logos

Le kit complet du logo est dans le dossier `logos/` (SVG et PNG, versions fond clair, fond sombre et fond blanc, favicon, icône iPhone). `logos/LISEZMOI.txt` indique quel fichier utiliser pour quel usage. Le site utilise la variante fond blanc (`logos/fond-blanc/`) pour son icône d'onglet, et les logos horizontaux de `docs/`.

## Illustrations des rubriques

Les pages Comprendre, Explorer et Agir portent chacune une illustration décorative en dégradé (`docs/images/rubrique-*.webp`, styles dans `docs/illustrations.css`). Chacune existe en deux versions : claire (`rubrique-*.webp`) et lumineuse pour fond sombre (`rubrique-*-sombre.webp`), choisies automatiquement selon le thème. Elles ne remplacent aucune donnée, ne reçoivent aucun clic et sont masquées à l'impression. Pour les changer, remplacer les six fichiers `rubrique-*.webp` en gardant les mêmes noms. Pour les retirer, supprimer la ligne `illustrations.css` dans `index.html`, `synthese.html`, `explorer.html` et `simulateur.html`.

## L'assistant de questions

Il répond à partir des données du site. Sur un ordinateur où Ollama est installé, un modèle d'IA local (phi4-mini) rédige la réponse ; chaque chiffre et chaque lieu sont contrôlés, sinon c'est la réponse calculée qui s'affiche. C'est un modèle existant, non entraîné sur nos données. Mode d'emploi : `methodologie/ASSISTANT_IA.md`.

## Nos limites, assumées

- Ce sont des **ordres de grandeur** : notre couche d'établissements est incomplète, les distances sont à vol d'oiseau, le personnel de santé n'est connu que par région.
- Le classement des communes est solide : avec 10 % de postes en moins, les dix communes les plus touchées restent les mêmes ; avec 30 % en moins, neuf sur dix (`python3 tests/analyse_sensibilite_postes.py`).
- Les données détaillées de l'ANSD ne couvrent que **trois régions**.
- L'assistant avec IA ne fonctionne que sur un ordinateur équipé ; ailleurs, il répond par calcul.
- Pas encore essayé avec un lecteur d'écran.

Toutes les limites : `methodologie/LIMITES.md`. La suite possible : `methodologie/PERSPECTIVES_ET_DURABILITE.md`.

## Comment ce projet a été fait

Le projet a été conçu au départ par une équipe de trois personnes ; les deux autres membres ont eu des empêchements, et il est aujourd'hui porté par un seul participant officiel.
Nous avons utilisé l'IA comme outil de travail : pour écrire le code et les tests, analyser les jeux de données et rédiger les documents. Au-delà de ce que l'IA nous donne, nous vérifions toujours la source pour nous assurer de sa fiabilité : chaque chiffre est rapporté à une publication de l'ANSD ou du Ministère, et des tests automatiques contrôlent que le site affiche les bons. Les choix sont les nôtres : le sujet, les sources, les échanges avec l'ANSD, les essais auprès de plus de 19 personnes et les corrections qui en ont découlé, la validation du wolof, et la décision de publier chaque chiffre avec ses limites. Détail : `methodologie/CONTRIBUTIONS.md`.

## Sources et licences

Recensement RGPH-5 (2023), projections démographiques 2023-2073, EDS-Continue 2017 et services sociaux de base géoréférencés (ANSD) ; infrastructures géolocalisées (ANSD, Géo Sénégal) ; annuaire 2022 du Ministère de la Santé ; carte sanitaire de la CSSDOS ; contours des régions : Natural Earth. Code : licence MIT. Données : `donnees/LICENCE_DONNEES.md`.

Source : Agence Nationale de la Statistique et de la Démographie. Contient des informations sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD.
Ce produit a été adapté à partir des informations de l'Agence Nationale de la Statistique et de la Démographie, qui sont sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD.

Projet de hackathon des 20 ans de l'ANSD : ce n'est pas une publication officielle de l'ANSD, et l'ANSD ne l'a pas approuvé.
