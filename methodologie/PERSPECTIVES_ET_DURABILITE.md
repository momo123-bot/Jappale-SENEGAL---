# Perspectives et durabilité

**En bref :** ce qui peut suivre le hackathon, et ce que nous ne promettons pas.

*Version du 7 octobre 2026.*

## Ce qui est déjà durable

- **Ouvert** : le code est sous licence MIT ; les données dérivées sont publiées sous licence ODC-By, dont la compatibilité avec les conditions des données sources reste à confirmer auprès de l'ANSD (voir `donnees/LICENCE_DONNEES.md`).
- **Sans serveur** : le site est statique (fichiers HTML, CSS et JavaScript). Il peut être hébergé gratuitement et fonctionne hors connexion une fois téléchargé.
- **Recalculable** : les chiffres du site viennent de scripts du dossier `code/` et de fichiers du dossier `donnees/`. Les tests automatiques refont les contrôles.
- **Limites écrites** : `methodologie/LIMITES.md` dit ce qui est fragile, pour que la personne qui reprend le projet le sache dès le départ.

## Mettre à jour : quand et comment

| Source | Rythme | Ce qu'il faut refaire |
|---|---|---|
| Recensement (RGPH-5) | environ tous les dix ans | relancer la chaîne de traitement du dossier `code/` (voir le README) |
| Couches d'infrastructures de l'ANSD | à chaque nouvelle livraison | relancer la chaîne, puis `python3 code/registre_anomalies.py` et `python3 code/exporter_donnees_ouvertes.py` |
| Annuaire des ressources humaines du Ministère de la Santé | annuel en principe ; le plus récent trouvé date de 2022 | remplacer `donnees/personnel_sante_region_2022.csv` par le nouveau millésime, puis relancer l'export |

Dans tous les cas, lancer ensuite `python3 tests/test_chiffres_cles.py` : il vérifie que les chiffres annoncés dans les documents correspondent aux données.

## Qui met à jour ?

À ce stade, **aucune structure n'est chargée de la mise à jour** : c'est la première décision à prendre avec l'ANSD. Le projet est conçu pour que n'importe quelle équipe puisse le reprendre sans nous demander la permission : licence ouverte, procédure écrite, tests.

## Pistes de développement (non réalisées)

1. **Personnel par structure ou par district**, à la place des ratios régionaux de 2022. Condition : obtenir ces données.
2. **Temps de trajet par la route**, à la place des distances à vol d'oiseau. Condition : disposer d'un réseau routier à jour.
3. **Indicateurs d'éducation** avec les effectifs d'élèves et un critère officiel de carte scolaire. Aucun critère de distance n'a été trouvé à ce jour.
4. **Suivi des anomalies avec l'ANSD**, ligne par ligne (voir `methodologie/RETOUR_A_L_ANSD.md`).
5. **Mise à jour à chaque publication** de nouvelles données.
7. **Un assistant en wolof** (texte, puis voix) qui comprend la question et répond avec des chiffres lus dans nos fichiers, jamais générés, dans des phrases écrites et relues par des locuteurs. Il suppose : (a) une compréhension de la question confirmée à l'utilisateur (indicateur, lieu, année), (b) une trentaine de phrases-modèles validées, (c) un test avec 30 à 50 questions relues par des locuteurs avant toute mise en ligne. Seul le wolof est envisagé : les ressources disponibles pour le pulaar et le sérère sont trop minces, et l'équipe n'a pas de relecteur pour le sérère. Non réalisé.
6. **Un serveur MCP (Model Context Protocol)** en lecture seule, qui interrogerait les fichiers JSON de `docs/donnees-ouvertes/` : un assistant numérique répondrait avec des chiffres vérifiés plutôt qu'en devinant. Non réalisé : il faudrait l'écrire, le tester et le documenter, et il ne remplace pas le travail d'équipes qui exposent déjà les données de l'ANSD de cette façon.

## Ce que nous ne promettons pas

- Ni calendrier de mise à jour, ni maintenance assurée après le hackathon : ce n'est pas à nous de le décider seuls.
- Ni exactitude au poste près : les chiffres sont des ordres de grandeur, avec leurs fourchettes.

**Carte sanitaire 2026-2030.** Le portail e-santé de la CSSDOS annonce une nouvelle carte sanitaire. Quand elle paraîtra, ses chiffres pourront remplacer la couche des postes de santé et les nombres officiels de postes par région (donnees/postes_sante_region_2022.csv). Si l'ANSD fournit des données détaillées pour deux ou trois régions, la chaîne de traitement (code/) peut les intégrer région par région.
