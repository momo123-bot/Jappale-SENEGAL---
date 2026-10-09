# Journal des versions des données publiées

## Version 1.2 : 8 octobre 2026

Ajouts (aucun champ existant ne change).
- `donnees/services_sociaux_ansd_commune.csv` et `docs/pilote.js` : services sociaux de base géoréférencés de l'ANSD pour Dakar, Diourbel et Thiès, totaux par commune (142 communes).
- `anomalies_signalees.csv` : 15 anomalies (A14 : collèges privés absents de notre couche dans les trois régions ; A15 : communes écrites de deux façons dans le classeur de l'ANSD).

## Version 1.1 : 8 octobre 2026

Ajouts (aucun champ existant ne change de nom ni de sens).
- `communes.json` : `population_2033_projection_ansd` et `postes_sante_manquants_2033_projection_ansd` (projection officielle de l'ANSD ; vides pour 9 communes, anomalie A13).
- `regions.json` : `tbs_secondaire_16_18_pct` et `tns_secondaire_16_18_pct` (scolarisation au secondaire, RGPH-5).
- `anomalies_signalees.csv` : 15 anomalies (A13 ajoutée) ; A04 cite le portail de la CSSDOS.

## Version 1.0 : 7 octobre 2026

Première publication des données dérivées : `communes.json` (553 communes), `regions.json` (14 régions), `schema-communes.json`, `anomalies_signalees.csv`.

- Identifiant stable `id_commune` (région, département, commune), en attendant un code officiel de commune.
- Fourchette du manque de postes de santé : `postes_sante_manquants` (couche de données) et `postes_sante_manquants_recale_2022` (nombre officiel de postes de 2022).
- Personnel de santé par région (annuaire des ressources humaines 2022), ressenti de distance (EDS-Continue 2017), postes de santé officiels de 2022.

**Règle de numérotation.** Un changement de nom ou de sens d'un champ passe à la version suivante (2.0) ; un ajout de champ ou de ligne est une version mineure (1.1) ; une correction de valeur est une révision (1.0.1). Chaque version est décrite ici avec sa date.
