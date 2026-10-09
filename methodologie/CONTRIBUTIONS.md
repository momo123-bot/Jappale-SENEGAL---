# Contributions - Jàppale Sénégal

**En bref :** qui a fait quoi, avec quels outils. Le dépôt ne contient aucun nom de personne : les membres de l'équipe et les testeurs restent anonymes.
Dernière mise à jour : 8 octobre 2026.

## Statut officiel

Le projet a été conçu au départ par une équipe de trois personnes. Les deux autres membres ont eu des empêchements : un seul participant porte aujourd'hui le projet, officiellement inscrit au hackathon. L'organisation a donné son accord à une aide extérieure, consignée dans le journal ci-dessous.

| Qui | Ce qu'il a fait |
|---|---|
| Le participant officiel | Conception et direction du projet, choix des sources, échanges avec l'ANSD, essais auprès des utilisateurs, décisions. |
| Un contributeur | L'assistant de questions avec IA locale (`docs/assistant-llm.js`), ses contrôles (`tests/interface/03_assistant_ia.test.js`) et son banc d'essai (`tests/ia/`). |
| Plus de 19 testeurs (lycéen, étudiants, grands-parents, habitants, médecin, juriste, professeurs, doctorant) | Essais et remarques, toutes traitées ou écartées avec leur raison : `methodologie/SUIVI_DES_RETOURS.md`. Noms confidentiels. |
| ANSD | Données ouvertes, données géoréférencées de trois régions, débriefing des équipes. |

## Outils utilisés

Nous avons utilisé l'IA comme outil de travail : un assistant d'IA généraliste pour écrire le code et les tests, analyser les jeux de données et rédiger les documents ; un modèle de langage local existant (phi4-mini, par Ollama), non entraîné sur nos données, pour l'assistant de questions. Au-delà de ce que l'IA nous donne, nous vérifions toujours la source pour nous assurer de sa fiabilité. Les choix restent ceux de l'équipe.

## Journal des contributions

| Date | Nature | Apportée par | Fichiers concernés |
|---|---|---|---|
| Jusqu'au 8 octobre 2026 | Essais et retours | Plus de 19 testeurs | `methodologie/SUIVI_DES_RETOURS.md` |
| Octobre 2026 | Assistant avec IA locale | Un contributeur | `docs/assistant-llm.js`, `tests/interface/03_assistant_ia.test.js`, `tests/ia/` |
| 8 octobre 2026 | Données géoréférencées de Dakar, Diourbel et Thiès | ANSD | `donnees/services_sociaux_ansd_commune.csv` |

## Comment mettre à jour ce document

Ajouter une ligne au journal pour toute contribution au code ou aux livrables, avec sa date, sans nom de personne.
