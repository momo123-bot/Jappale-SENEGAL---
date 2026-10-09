# Jàppale Sénégal : le projet en deux minutes

*Hackathon des 20 ans de l'ANSD. Une page pour lire vite. Projet de hackathon : ce n'est pas une publication officielle de l'ANSD.*

## Le problème

Où manque-t-il un poste de santé, un hôpital ou un collège ? Les chiffres existent, mais éparpillés, difficiles à croiser, parfois en désaccord. Un maire, un journaliste ou un citoyen ne peut pas voir si sa commune est bien servie.

## Ce que fait le projet

Un site de sept pages qui croise, pour les 553 communes, la population (RGPH-5) avec les postes de santé, les hôpitaux et les collèges et lycées : manque de postes (norme : 1 pour 10 000 habitants), distance à l'hôpital, scolarisation de la région, scénario 2033. Chaque commune a une **fiche de décision d'une page** (imprimable, PDF, Word) avec carte et sources. Testé par plus de 19 personnes réelles : lycéen, grands-parents, médecin, juriste, professeurs.

## Ce que nous avons trouvé

- **Au moins 553 postes de santé manquent** aujourd'hui (environ 800 en recalant sur les nombres officiels) et **entre 898 et 1 040 en 2033** : 898 avec la projection officielle de l'ANSD, 1 040 avec notre extrapolation, probablement trop haute.

- **15 anomalies relevées** dans les données et signalées à l'ANSD, par exemple 9 communes dont la population diffère entre deux publications de l'ANSD, ou la même commune écrite de deux façons dans un même classeur.

- **Les points géoréférencés de l'ANSD (Dakar, Diourbel, Thiès)** confirment nos hôpitaux, centres de santé et lycées, mais montrent qu'il manque à notre couche les collèges privés (788 collèges et lycées contre 1 143) : l'isolement scolaire est surestimé, et aucune des 10 communes que nous donnions à plus de 15 km n'est en réalité si loin.

## Pourquoi y croire, et de quoi se méfier

Nos mesures sont recoupées avec quatre sources indépendantes : l'enquête de 2017 (corrélation +0,83 avec notre distance à l'hôpital), la scolarisation du recensement (corrélation -0,76 avec notre distance au collège ou lycée), les projections officielles et les points de l'ANSD. Ce sont des **ordres de grandeur** : notre couche ne couvre que 51 % des collèges et lycées du pays, et le personnel de santé n'est connu que par région.

## Les données

Des fichiers, sans serveur ni base de données ni donnée sur des personnes : 1,8 Mo pour le site, 7,2 Mo pour le dépôt. Les points de l'ANSD ne sont pas publiés, seulement leurs totaux par commune. Hébergement et mises à jour : *methodologie/GESTION_DES_DONNEES.md*.

## Le déployer

Quatre chemins, de 30 secondes (double-clic sur docs/index.html) à 10 minutes (hébergement de l'ANSD), et une commande qui contrôle un déploiement (69 vérifications en moins d'une seconde). La mise en ligne sur GitHub Pages reste à tester par l'équipe.

## Ce que nous demandons à l'ANSD

Les mêmes données pour les autres régions, collèges privés compris ; ce que recouvre « poste de santé » ; l'accord de publier les totaux par commune ; une réponse sur les 9 communes dont la population diffère ; le chiffre de base pour 2033.
