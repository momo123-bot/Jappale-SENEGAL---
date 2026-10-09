# Retour à l'ANSD : anomalies repérées dans les couches de données

**En bref :** les anomalies relevées dans les données, signalées à l'ANSD avec la façon de les vérifier.

*Version du 7 octobre 2026.*

## Pourquoi ce document

Le thème du hackathon demande d'améliorer la production, l'accessibilité, la valorisation et l'utilisation des données de l'ANSD. En croisant le recensement (RGPH-5) avec les couches d'infrastructures de santé et d'éducation, nous avons relevé des anomalies. Les signaler fait partie de notre contribution : une donnée mieux produite améliore tous les outils qui l'utilisent, pas seulement le nôtre.

## Ce que contient le registre

Le fichier `donnees/anomalies_signalees.csv` (copie : `docs/donnees-ouvertes/anomalies_signalees.csv`) compte 15 anomalies. Chacune a un numéro, la couche concernée, sa nature (mesurée dans la couche, ou écart avec un document officiel), l'anomalie, un nombre, des exemples, la façon de la vérifier et une recommandation. Les nombres « mesurés » sont recalculés par `code/registre_anomalies.py` et contrôlés par un test automatique.

| N° | Anomalie | Nombre |
|---|---|---|
| A01 | Colonne « statut » : les lettres accentuées ont été supprimées dans les 11 valeurs distinctes. | 3771 |
| A02 | Couche « hôpital » : elle mêle des hôpitaux, des annexes, des établissements de médecine traditionnelle, des établissements psychiatriques et un hôpital militaire. | 13 |
| A03 | La couche compte 44 hôpitaux publics (et 6 privés) ; le rapport de suivi de la carte sanitaire 2021 du Ministère de la Santé compte 40 établissements publics de santé (EPS 1, 2 et 3). 8 régions sur 14 sont identiques. | 4 |
| A04 | La couche compte 2 124 postes de santé ; trois documents du Ministère de la Santé en donnent 1 531, 1 680 et 1 731, et ne s'accordent pas entre eux. | 393 à 593 |
| A05 | Classification des établissements secondaires : 1 collège public sur 481 collèges, alors que 474 lycées sur 861 sont publics. Les collèges d'enseignement moyen publics sont peut-être classés avec les lycées. | 481 |
| A06 | Des communes de départements différents portent le même nom, sans identifiant unique dans les couches. | 10 |
| A07 | Des structures de même type, de même nom, dans la même commune et le même département apparaissent plusieurs fois, parfois à des kilomètres l'une de l'autre : homonymes ou géolocalisation à vérifier. | 103 |
| A08 | Des libellés de région ou de département ne sont pas écrits de la même façon dans les deux couches. Nos calculs les rapprochent sans perte, mais un autre utilisateur perdrait des lignes. | 344 |
| A09 | Des communes n'ont pas de coordonnées géographiques : elles sont absentes de la carte et des calculs de distance. | 2 |
| A10 | Dans les séries régionales du portail, les lignes « Kolda » et « Kédougou » sont inversées : le portail donne 0 hôpital à Kolda depuis 2012 et 42 postes de santé en 2019, alors que l'annuaire 2020 lui compte un hôpital (EPS de niveau 2) et 74 postes, et compte 0 hôpital et 41 postes à Kédougou. | 2 |
| A11 | La série officielle des postes de santé donne 1 948 en 2018, entre 1 373 en 2017 et 1 431 en 2019. | 517 à 575 |
| A12 | La couche compte 1 342 établissements du moyen et du secondaire, dont 475 publics ; le recensement scolaire en dénombre 2 649, dont 1 556 publics (hors 6 établissements communautaires ou associatifs). Elle ne couvre que la moitié des établissements et moins du tiers des publics. | 1307 |
| A13 | Pour 9 communes, la population 2023 du tableau de projections de l'ANSD diffère de celle du fichier du recensement : 7 d'entre elles échangent leurs populations (deux à deux ou trois à trois), 2 ont un petit écart. La projection officielle n'est pas utilisée pour ces communes. | 9 |
| A14 | Dans les trois régions où l'ANSD a remis ses points géoréférencés (Dakar, Diourbel, Thiès), notre couche compte 788 collèges et lycées contre 1 143 chez l'ANSD (69 %). L'écart vient des collèges : 358 chez nous contre 713 (dont 357 privés) ; les lycées sont identiques. L'isolement scolaire en est surestimé. | 355 |
| A15 | Dans le classeur de l'ANSD, la même commune est écrite de deux façons selon la feuille : cinq communes sont concernées. | 5 |

## Ce que ces anomalies changent pour nos résultats

Notre calcul rapproche sans perte les libellés qui diffèrent d'une couche à l'autre (A08, vérifié par un test) et laisse de côté les deux communes non géolocalisées (A09). Les anomalies A02 et A04 jouent sur les totaux, A12 explique pourquoi l'isolement scolaire est probablement surestimé, A10 concerne les fichiers du portail et non nos calculs, A13 oppose deux publications de l'ANSD, A14 et A15 viennent du classeur de l'ANSD sur trois régions : elles sont traitées dans `methodologie/LIMITES.md` (le manque de postes de santé est un ordre de grandeur ; 23 à 25 départements sont sans hôpital selon la définition retenue).

## Fiche minimale de métadonnées proposée

Pour chaque couche d'infrastructures, nous proposons :

1. un identifiant unique de structure, et un code officiel de commune, de département et de région, identiques dans toutes les couches ;
2. un type normalisé (poste de santé, centre de santé, hôpital EPS 1, 2 ou 3, annexe, établissement spécialisé, médecine traditionnelle ; collège, lycée) ;
3. un statut codé (public, privé, militaire, confessionnel) ;
4. une date de référence et la source de chaque ligne ;
5. les coordonnées et la méthode de géolocalisation ;
6. des libellés tirés d'une liste de référence unique, en UTF-8 ;
7. pour la santé, le personnel par catégorie ; pour l'éducation, les effectifs d'élèves et d'enseignants. Nous ne savons pas si ces données existent : c'est l'objet de notre demande à l'ANSD.

## Comment transmettre ce retour

1. Envoyer à l'adresse du concours (challenge20ans@ansd.sn) le fichier du registre et ce document, avec le lien du dépôt.
2. Demander à qui adresser les futurs signalements de qualité des données.
3. Proposition : que l'ANSD réponde ligne par ligne (corrigé, expliqué, contesté). Le registre pourra être mis à jour en conséquence.

## Limites de ce registre

- Il ne couvre que les couches reçues pour le hackathon, pas l'ensemble des données de l'ANSD.
- Certaines anomalies ont peut-être une explication légitime que nous ignorons (périmètre, date de collecte) : nous les signalons, nous ne les jugeons pas.
- Les deux lignes qui comparent la couche à des documents du Ministère de la Santé (A03 et A04) utilisent des valeurs recopiées de ces documents : elles ne sont pas recalculables ici.
