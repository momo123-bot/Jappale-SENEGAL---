# Vérification dans un vrai navigateur

Les contrôles de `tests/interface/` utilisent un navigateur simulé : ils ne calculent ni la mise en page ni les polices. Ce dossier complète avec un vrai navigateur (Chromium). Il **mesure** ce qui peut l'être objectivement : texte recouvert, bouton hors écran, défilement horizontal, nombres illisibles, images qui ne se chargent pas. Il ne juge pas si le site est « joli » : cela reste un regard humain.

## Lancer

Depuis ce dossier : `npm install` (le premier lancement télécharge Chromium), puis `npm test`.
Le résultat attendu se termine par `Tout est OK`.

Pour vérifier un autre dossier de site (par exemple une ancienne version) : `DOSSIER_SITE=chemin/du/dossier npm test`.

## Ce qui est vérifié (179 mesures)

| Contrôle | Pages et tailles |
|---|---|
| Aucune erreur de script, thème attendu (sombre par défaut, clair si choisi) | les 7 pages, ordinateur |
| La page ne déborde pas à droite | les 7 pages à 360, 390 et 768 px |
| La barre du haut ne déborde pas (bouton de thème à l'écran, liens sur une ligne), de part et d'autre du seuil de 1 400 px où le champ de recherche apparaît | 6 pages, de 1 100 à 1 920 px |
| La synthèse s'imprime : menu, pied de page et boutons disparaissent, fond blanc, **elle tient sur une page A4** | synthèse, impression réelle en PDF |
| La légende de la carte ne cache aucun nom de région ni aucun point ; les boutons de zoom restent à l'écran et libres | explorateur, 8 tailles d'ordinateur et de tablette |
| Les trois boutons de zoom sont entièrement à l'écran | explorateur, 4 tailles de téléphone |
| Aucun séparateur de milliers invisible (espace fine insécable) | accueil, simulation, communes |
| L'étoile des champs obligatoires est sur la même ligne que son libellé | formulaire de contact |
| « À quoi sert ce site, et à qui ? » est visible dès le deuxième écran, et ses trois cartes ne débordent pas | accueil, 1440 x 900 |
| Au zoom maximal sur Grand Yoff (Dakar), aucun point n'en chevauche un autre (35 paires se chevauchaient avec l'ancien zoom plafonné à ×14) | explorateur |
| Un clic sur l'une des 15 communes les plus serrées du pays zoome assez pour qu'elle ne touche aucune voisine et reste visible | explorateur |
| Le panneau de la fiche est rangé à droite sous le menu, la carte se réduit, la commune reste visible, la recherche et les commutateurs du bas ne sont pas recouverts, santé et éducation présentes | explorateur, 5 largeurs de 900 à 1 920 px |
| Sur téléphone, la fiche reste en bas, la carte zoome et place la commune au-dessus d'elle | explorateur, 390 px |
| La page « À propos » garde de la marge sous la feuille A4 à l'impression | page « À propos » |
| Le texte des cartes de chiffres ne sort jamais de son cadre | simulation et synthèse, 14 largeurs de 360 à 1 920 px |
| Sans adresse branchée : aucune mention permanente sur la page, et après validation le message « Rien n'a été envoyé » est visible | formulaire de contact |
| L'année de référence est au-dessus du bouton de calcul, pas à côté | page de simulation |
| Toutes les images se chargent | accueil, simulation, comparer, communes, méthode |

## Ce que cela ne couvre pas

Safari, Firefox et les vrais téléphones : Chromium seul est utilisé. Les polices de caractères peuvent différer légèrement de celles de votre appareil, donc une mesure de largeur de texte n'est pas exacte au pixel près.
