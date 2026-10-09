# Jàppale Sénégal - Perspectives et feuille de route

**En bref :** ce qui est fait, ce qui reste à faire, dans l'ordre.

Ce document dit ce qui est fait, ce qui reste à faire et dans quel ordre. Il est écrit pour que n'importe quelle personne qui reprend le projet sache par où commencer, et pour que les limites actuelles soient écrites noir sur blanc plutôt que découvertes.

## 1. Ce qui existe

- Une chaîne de traitement complète et reproductible (`code/01` à `code/08`), des données de référence (`donnees/`) et 72 tests automatiques (`tests/`).
- Un site web autonome de sept pages (`docs/`) : carte des communes et des régions, santé et éducation, recherche sur les 553 communes, fiches avec fiabilité, vue bassin, simulateur avec comparaison à un classement simple, comparaison de communes, assistant en français, export CSV, thème clair ou sombre, glossaire en termes simples.
- Des contrôles automatiques de l'interface (`tests/interface/`) et un glossaire (`methodologie/GLOSSAIRE.md`).
- Une note méthodologique qui documente les définitions, les recoupements avec des sources indépendantes et les limites.

## 2. Ce qui reste à faire, par ordre de priorité

### Priorité 1 - Clarifier les effectifs avec l'ANSD

Trois écarts ne sont pas expliqués à ce jour et pèsent sur les résultats :
- La couche Géo Sénégal compte 2 124 « postes » (dont 39 centres médico-sociaux), alors qu'une brochure du Ministère de la Santé annonce 1 680 postes en 2023. Si le chiffre du Ministère fait foi, les déficits de postes sont sous-estimés.
  Un test de sensibilité (`tests/analyse_sensibilite_postes.py`) montre que le classement des communes résiste : avec le chiffre du Ministère, les dix communes les plus en déficit restent les mêmes, seuls les niveaux absolus montent (neuf sur dix si l'on retire 30 % des postes).
- La couche « hôpital » compte 50 structures, dont 6 hôpitaux privés, 6 établissements psychiatriques ou de médecine traditionnelle et 4 annexes. Le périmètre à retenir pour la norme d'un hôpital pour 150 000 habitants reste à confirmer.
- Dakar compte 1 220 habitants de moins que la publication officielle, et deux communes (Sama Kanta Peulh, Diouboudou) n'ont aucune infrastructure rattachée.

### Priorité 2 - Mettre l'outil entre les mains d'utilisateurs réels

Dix-sept personnes de profils différents ont donné leur avis sur le site (oralement, puis sur des captures d'écran), et leurs remarques l'ont modifié. En revanche, aucun élu, agent de collectivité, ONG ou journaliste ne l'a encore utilisé dans son travail. Trois types de premiers utilisateurs sont visés, avec un entretien de 20 minutes chacun : un service technique ou un élu d'une commune, un responsable de programme d'ONG ou de partenaire de développement, un chercheur ou un journaliste.

### Priorité 3 - Un accès mesuré en temps de trajet

Les distances actuelles sont à vol d'oiseau, et le rayon de 15 km du partage de capacité est une hypothèse (les trois premiers choix de l'algorithme sont stables de 5 à 25 km, le reste de la sélection l'est moins). Remplacer la distance par un temps de trajet sur le réseau routier est la suite naturelle, dans l'esprit des outils d'accessibilité de l'OMS.

### Priorité 4 - Frontières communales

La carte s'arrête aux régions : aucune source de frontières communales sous licence réutilisable n'a été trouvée. La piste est une demande directe à l'ANAT (Géo Sénégal).

### Priorité 5 - Données manquantes

- Le primaire : les couches d'éducation ne couvrent que le secondaire. Une étude de l'UNICEF et de l'UIT (initiative Giga) estime qu'environ 20 % des géolocalisations d'écoles manquent aux données officielles du Sénégal.
- Les coûts unitaires et la disponibilité foncière, absents de l'algorithme, qui suppose un coût identique pour chaque structure.

### Priorité 6 - Une architecture qui dure

Le site est statique (sept pages, sans serveur), adapté à une démonstration. Pour un usage durable : une base de données, une mise à jour à chaque publication de l'ANSD, une interface de programmation pour les réutilisations.

Le financement de la maintenance est une hypothèse à tester : des entreprises utilisatrices (assurance, pharmacie, clinique, opérateur) pourraient contribuer ou s'abonner pour la maintenir. Aucune n'a encore été sollicitée.

### Priorité 7 - Pistes issues des dix-sept retours d'utilisateurs

- **Zoom sur la page d'accueil** : l'explorateur se zoome et se déplace (noms des départements puis des communes selon le niveau), mais la petite carte de l'accueil n'a pas encore cette fonction.
- **Page Communes** : exemples de communes en tête et liste complète déroulante, comme l'ont suggéré des testeurs.
- **Réception du formulaire de contact** : renseigner une adresse neutre ou un service de formulaires dans `docs/site.js` (voir les commentaires du fichier).
- **Un simulateur pour l'éducation**, une fois un critère d'accès défini avec l'ANSD et le Ministère (aujourd'hui, faute de norme, seule la santé est simulée).
- **Personnel de santé** : le niveau régional est éclairé selon les normes officielles (annuaire des ressources humaines 2022, `donnees/personnel_sante_region_2022.csv`). Reste à l'afficher sur la fiche d'une région, à signaler les « doubles déficits » (communes à fort déficit de postes dans une région sous-dotée en personnel), à calculer le personnel à prévoir pour chaque poste recommandé par le simulateur (norme de personnel par type de structure : tome 3 de la carte sanitaire), puis à demander au Ministère les effectifs par district et par structure (iHRIS).
- **Éducation** : afficher l'isolement scolaire et un simulateur d'implantation de collèges dans l'interface, et obtenir de l'Éducation nationale les effectifs d'élèves et d'enseignants par établissement.
- **Une vue « département » sur la carte**, pour les centres de santé et les hôpitaux, qui sont déjà comptés à cette échelle.
- **Vérifier campus par campus** les universités étiquetées « publiques » par la source, et intégrer les nouvelles quand elles ouvrent (Université Souleymane Niang de Matam, Université du Sénégal oriental à Tambacounda, annoncées pour l'année universitaire 2026-2027).
- **Mesurer la qualité des services**, pas seulement leur nombre. Le cadre de la PHCPI (Primary Health Care Performance Initiative, fondée par la Fondation Gates, la Banque mondiale et l'OMS) distingue les intrants, la prestation de services, les produits et les résultats ; Jàppale ne couvre qu'une partie des intrants. Les profils « Vital Signs » de la PHCPI et les enquêtes d'évaluation des établissements sont des pistes pour la qualité, sous réserve de données disponibles par structure et par commune. Un testeur a suggéré le JMP (OMS et UNICEF), WASH FIT (OMS et UNICEF) et SaniPath (Université Emory), qui portent sur l'eau, l'assainissement et l'hygiène dans les établissements de santé ou les quartiers. Peu liés à la mesure de l'accès, ils ne sont pas retenus pour l'instant ; les initiatives SDG3 GAP et GFF, citées dans les mêmes échanges, relèvent plutôt du financement et n'ont pas été vérifiées.
- **Affiner la lecture des communes sans poste mais avec un centre de santé** (les 20 communes sans poste en ont un) : une norme communale qui reconnaisse les structures de niveau supérieur.

## 3. Comment vérifier ce qui existe

Depuis la racine du dépôt :

```bash
python3 tests/test_chiffres_cles.py -v
cd tests/interface && npm install && npm test
```

Pour reproduire tous les fichiers de données depuis les données brutes, voir le README.

## 4. Le principe à ne jamais perdre de vue

Aucun chiffre n'est affiché sans que l'on sache d'où il vient, et chaque limite connue est écrite dans la documentation. Quand un test échoue, on corrige le code ou on met à jour le document, mais on ne laisse pas les deux se contredire.
