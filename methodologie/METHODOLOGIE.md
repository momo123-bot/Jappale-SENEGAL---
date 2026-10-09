# Méthodologie - Jàppale Sénégal

**En bref :** d'où viennent les chiffres et comment ils sont calculés, en une page. La version complète, avec les formules, est la page Méthode du site (`docs/methode.html`).

## Les données

| Donnée | Source | Année |
|---|---|---|
| Population des 553 communes | Recensement RGPH-5, ANSD | 2023 |
| Postes de santé, centres, hôpitaux, collèges et lycées géolocalisés | ANSD, Géo Sénégal | dernière version publiée |
| Population projetée | Projections démographiques 2023-2073, ANSD | 2033 |
| Nombres officiels de postes et de personnel | Annuaire statistique du Ministère de la Santé | 2022 |
| Services sociaux de base de Dakar, Diourbel et Thiès | ANSD (données remises pour le hackathon) | 2023 |

## Le calcul principal

- **Postes nécessaires** = population ÷ 10 000, arrondi au supérieur (norme du Ministère de la Santé : un poste pour 10 000 habitants).
- **Postes manquants** = nécessaires moins existants (zéro si la commune en a assez). Total : **au moins 553** ; sans arrondi, 447 ; recalé sur les nombres officiels de 2022, environ 800.
- **Scénario 2033** : le même calcul avec la population de 2033, à nombre de postes constant : de 898 (projection officielle de l'ANSD) à 1 040 (croissance 2013-2023 prolongée).
- **Vue bassin** : on tient compte des postes des communes voisines situées à moins de 15 km à vol d'oiseau.
- **Éducation** : distance au collège ou lycée le plus proche. Il n'existe pas de norme officielle : c'est un constat, pas un besoin chiffré.

## Les vérifications

- **Quatre recoupements avec des sources indépendantes** : l'enquête EDS de 2017 (corrélation +0,83, par région, entre notre distance à l'hôpital et la difficulté d'accès déclarée), la scolarisation du recensement (corrélation -0,76 avec notre distance au collège ou lycée), les projections officielles, et les points géoréférencés de l'ANSD (mêmes hôpitaux et mêmes centres de santé que notre couche).
- **15 anomalies** relevées dans les données et signalées à l'ANSD.
- **Des tests automatiques** vérifient que le site affiche bien les chiffres calculés.

Tout se recalcule avec les scripts du dossier `code/` ; l'ordre des étapes est dans l'annexe `methodologie/FICHE_TECHNIQUE.md`. Ce que ces chiffres ne disent pas : `methodologie/LIMITES.md`.
