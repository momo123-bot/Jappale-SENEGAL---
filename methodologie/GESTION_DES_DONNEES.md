# Gestion et stockage des données - Jàppale Sénégal

**En bref :** où sont les données (des fichiers, sans serveur), où les héberger, comment les mettre à jour et les étendre.

Cette page répond à trois questions : où sont les données aujourd'hui, où les mettre en ligne, et comment les garder à jour, y compris
quand l'ANSD nous remettra des données plus détaillées sur quelques régions.

## 1. Où sont les données aujourd'hui

| Quoi | Où | Taille | Publié avec le site ? |
|---|---|---|---|
| Données affichées par le site (553 communes, contours des régions, compléments par région) | `docs/data.js`, `docs/regions.js`, `docs/complements.js` | 251 Ko | Oui |
| Données ouvertes dérivées (JSON, schéma, registre des anomalies) | `docs/donnees-ouvertes/` | 475 Ko | Oui |
| Services de base de l'ANSD, totaux par commune (pilote) | `docs/pilote.js` | 14 Ko | Oui |
| Données de travail (sources nettoyées, résultats intermédiaires) | `donnees/` (14 fichiers CSV) | environ 2,2 Mo, dont 25 241 localités | Non : dans le dépôt, pas affichées |
| Scripts qui produisent tout | `code/` | 66 fichiers | Non : dans le dépôt |

Le site complet, tel qu'il est déployé (dossier `docs/`), pèse environ **1,8 Mo**, polices comprises. Le dépôt entier pèse environ 7,0 Mo.
**Il n'y a ni serveur, ni base de données** : les données sont des fichiers que le navigateur charge. Les 553 communes occupent 367 octets chacune
dans `data.js` (198 Ko en tout).

## 2. Ce que contiennent les données, et à qui elles appartiennent

- Ce sont des données **agrégées** (communes, régions). Aucune donnée sur des personnes, aucun cookie, aucun outil de mesure d'audience.
- Les sources sont celles de l'ANSD (recensement RGPH-5, projections, enquête de 2017), du Ministère de la Santé et de Géo Sénégal. Les droits
  d'usage sont ceux que fixe l'ANSD : le projet ne les modifie pas.
- Le site n'appelle plus aucun service extérieur pour s'afficher : les polices sont embarquées (`docs/polices/`). Les liens vers Google Maps et
  OpenStreetMap ne partent que lorsque l'on clique dessus.

## 3. Où les mettre en ligne : trois options

| Option | Avantages | Limites | À choisir quand |
|---|---|---|---|
| **A. GitHub Pages** (actuelle) | Gratuit, sans maintenance, déploiement en 5 minutes. Limites officielles : site publié de 1 Go au plus, trafic de 100 Go par mois (limite souple), 10 publications par heure. | Le site est **public** (avec un compte gratuit, le dépôt aussi) : on n'y met jamais de données confidentielles. Hébergé hors du Sénégal, hors du contrôle de l'ANSD. | Démonstration, données publiques |
| **B. Hébergement de pages statiques de l'ANSD** | Mêmes fichiers (on copie le contenu de `docs/`), maîtrise complète par l'ANSD, sauvegardes et adresse officielle. | Demande une personne qui administre le serveur. | **Recommandé pour la durée** |
| **C. Serveur et base de données** (par exemple PostgreSQL avec une interface de programmation) | Nécessaire si les données dépassent plusieurs dizaines de Mo à consulter, changent souvent, ou ont un accès réservé. | Beaucoup plus de travail : sécurité, sauvegardes, mises à jour, supervision. | Seulement si un de ces trois besoins apparaît |

Source des limites de GitHub Pages : sa documentation officielle (« GitHub Pages limits »), consultée le 8 octobre 2026 ; elles peuvent changer.

## 4. Les données détaillées remises par l'ANSD (Dakar, Diourbel, Thiès)

**Ce que nous avons reçu.** Un classeur Excel de points géoréférencés des services sociaux de base de trois régions : 6 449 établissements d'éducation, 2 902 de santé et 705 points d'eau (forages et châteaux d'eau ; aucun équipement d'assainissement), soit 0,8 Mo.

**Ce que nous publions, et ce que nous ne publions pas.** Le classeur brut n'est pas dans le dépôt : sa diffusion est à confirmer avec l'ANSD. Le dépôt contient seulement le script qui l'agrège (`code/services_sociaux_ansd.py`), les totaux par commune (`donnees/services_sociaux_ansd_commune.csv`, 142 communes) et le fichier `docs/pilote.js` (14 Ko) que la fiche d'une commune charge.

**Taille.** Nos fichiers occupent de 70 à 150 octets par ligne : 25 241 localités tiennent en 1,7 Mo, 3 771 structures en 351 Ko. Même avec 200 octets par ligne, 50 000 lignes feraient environ 10 Mo bruts (hypothèse de calcul, à confirmer sur les vraies données), et les navigateurs reçoivent les fichiers compressés. Comme on ne publie que des totaux par commune, la page reste légère quelle que soit la taille du brut.

**Procédure pour d'autres régions** (la même que pour les données actuelles) :
1. Déposer le classeur dans un dossier de travail. S'il est confidentiel, **ne pas les mettre dans le dépôt public**.
2. Relancer `python3 services_sociaux_ansd.py chemin/vers/le_classeur.xlsx` : le script s'arrête si un seul point est perdu ou si un type d'établissement est inconnu.
3. Régénérer `docs/pilote.js` avec `08_generer_donnees_maquette.py`.
4. Dater la nouvelle version dans `donnees/CHANGELOG_DONNEES.md`.
5. Lancer `python3 tests/test_chiffres_cles.py` puis `python3 tests/verifier_deploiement.py`.

**Confidentialité.** À décider avec l'ANSD **avant** toute publication : les totaux par commune peuvent aller sur le site si elle l'accepte ; les points eux-mêmes, non, tant qu'elle ne l'a pas confirmé.

## 5. Garder, mettre à jour, sauvegarder

- Chaque jeu de données est décrit et daté dans `donnees/DICTIONNAIRE_DE_DONNEES.md`, et chaque changement est noté dans `donnees/CHANGELOG_DONNEES.md`.
- Tout est dans git : l'historique est complet et un retour en arrière prend un clic.
- Mettre à jour, c'est relancer les scripts de `code/`, puis les deux commandes de vérification ci-dessus.
- Sauvegarde : l'archive de remise (un seul fichier ZIP) et l'historique git. Une copie chez l'ANSD est recommandée.
- **Responsable à nommer** : qui remet les données à jour quand la carte sanitaire 2026-2030 paraîtra ?

## 6. Ce qu'il reste à décider avec l'ANSD

L'autorisation de publier les totaux par commune, l'extension du pilote aux autres régions et aux collèges privés, le format des prochaines remises, l'hébergement durable, et la personne qui met à jour.
