# Contrôles de l'interface

Ces contrôles ouvrent chaque page du site dans un navigateur simulé (`jsdom`), cliquent, tapent, changent de thème, et vérifient ce qui s'affiche. Ils complètent `tests/test_chiffres_cles.py`, qui vérifie les chiffres.

## Lancer

Il faut Node.js 18 ou plus récent. Depuis ce dossier :

```bash
npm install
npm test
```

Durée : trois minutes environ. Rien d'autre à lancer : le second fichier démarre lui-même un petit serveur local. Le résultat attendu est `Tout est OK` à la fin de chaque fichier. En cas d'échec, une ligne `ECHEC` indique lequel, et la commande se termine avec une erreur.

## Ce qui est vérifié

| Fichier | Contrôles | Sujets |
|---|---|---|
| `01_explorateur_et_liens.test.js` | 89 | Carte de l'explorateur (551 points, couleurs, légende), fiche d'une commune, vue bassin, simulateur, assistant, panneau d'information, zoom et déplacement de la carte (noms par niveaux, sans chevauchement), page « Simuler un budget » (calcul identique à celui de l'explorateur sur 24 scénarios, périmètres, export, carte), simulateur par pays, région ou département, légende explicative, liens directs (`?commune=`, `?sujet=education`, `#simulateur`, `#assistant`), thème clair ou sombre, toucher près d'un point, commune avec un centre de santé mais sans poste |
| `02_accueil_comparer_methode.test.js` | 276 | Accueil en santé puis en éducation (carte, chiffres, liste, légende, ondes), recherche et homonymes, comparaison de communes et de régions, tableau des communes sur téléphone, page Méthode et glossaire, synthèse en une page (chaque chiffre recalculé à part, identique à la page Simuler) et réponse sur les prévisions, mémorisation du thème, thème sombre par défaut, navigation, pied de page, bouton « haut de page », images (présentes, légères, décoratives), formulaire de contact allégé (quatre champs obligatoires, y compris un envoi réel vers un faux serveur), aucune redéclaration de nom entre les scripts d'une page, cohérence des animations des cartes, assistant sur chaque page (réponses identiques à celles de l'explorateur), bouton « Afficher tous les détails », palettes, bouton flottant, centres de santé par commune, absence de symboles interdits |

## Principes

- Les valeurs attendues sont recalculées à part, sans passer par le code du site : par exemple les trois classes d'éducation (182, 187 et 182 communes), les six communes les moins bien pourvues, ou les chiffres des phrases du glossaire comparés aux données.
- Les règles d'affichage propres au téléphone (colonnes du tableau, ordre de la page, taille des points) sont vérifiées dans les fichiers de style, car un navigateur simulé n'applique pas les largeurs d'écran. Leur rendu réel a été regardé dans un vrai navigateur, ordinateur et téléphones simulés.
- Ces contrôles ne remplacent pas un essai à la main sur un vrai téléphone.

Les contrôles ci-dessus utilisent un navigateur simulé. Pour mesurer la mise en page dans un vrai navigateur (Chromium), voir `tests/navigateur/`.
