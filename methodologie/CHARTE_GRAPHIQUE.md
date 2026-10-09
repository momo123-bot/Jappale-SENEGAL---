# Charte graphique - Jàppale Sénégal

**En bref :** les couleurs, polices et règles visuelles du site.

Ce document décrit l'identité visuelle du site, pour que toute personne qui reprend le projet garde la même cohérence. Toutes les valeurs ci-dessous sont celles du code (`docs/accueil.css` et `docs/style.css`).

## Logo

| Fichier | Usage |
|---|---|
| `docs/jappale-logo-horizontal.png` | Logo horizontal pour fond clair |
| `docs/jappale-logo-horizontal-sombre.png` | Logo horizontal pour fond sombre |
| `docs/favicon.svg`, `docs/favicon.ico`, `docs/apple-touch-icon.png` | Icône d'onglet et d'écran d'accueil |

Le kit complet (toutes les variantes, avec leur mode d'emploi) est dans le dossier `logos/` à la racine du projet.

Règles : ne pas déformer le logo, laisser autour de lui un espace libre au moins égal à la hauteur de la lettre J, ne pas le placer sur un fond qui en réduit le contraste.

## Couleurs

Le site existe en deux thèmes, **sombre par défaut** (la personne peut passer au clair, son choix est mémorisé).

| Rôle | Thème clair | Thème sombre |
|---|---|---|
| Fond | `#FFFFFF` | `#0F1A2B` |
| Panneaux | `#FFFFFF` | `#15243A` |
| Texte | `#1F2A3C` | `#EAF2FD` |
| Texte secondaire | `#5A6578` | `#A3B3C9` |
| Bleu de marque | `#437FC7` | `#6DAFFE` |
| Bleu clair | `#6DAFFE` | `#8DC0FF` |
| Bronze (accent, alertes) | `#B9732F` | `#DA9A5A` |
| Terres de la carte | `#DCE8F5` | `#1B2D47` |

### Santé : bronze et bleu

| Signification sur la carte | Clair | Sombre |
|---|---|---|
| La moitié ou plus des postes nécessaires manquent | `#B9732F` | `#DA9A5A` |
| Entre un cinquième et la moitié | `#E3B484` | `#9C7550` |
| Moins d'un cinquième | `#2B63AE` | `#6DAFFE` |

### Éducation : violet

| Signification sur la carte | Clair | Sombre |
|---|---|---|
| Parmi les plus tendues | `#7B3FA0` | `#C792EA` |
| Situation intermédiaire | `#C7A6DD` | `#8F7BB5` |
| Parmi les moins tendues | `#2E8F8A` | `#4DB8AE` |

Règle : la santé et l'éducation ont des palettes différentes pour ne jamais être confondues. Une couleur ne porte jamais seule l'information : chaque carte a une légende écrite et des chiffres.

## Typographie

| Usage | Police | Repli |
|---|---|---|
| Titres | Poppins (500, 600, 700) | Segoe UI, polices système |
| Texte | Nunito Sans (400, 600, 700) | Segoe UI, polices système |
| Chiffres techniques | IBM Plex Mono | polices à chasse fixe du système |

Le site fonctionne hors connexion : si les polices ne se chargent pas, les polices du système prennent le relais sans rien casser.

Les grands nombres utilisent une espace insécable ordinaire comme séparateur de milliers (« 1 371 000 ») et non l'espace fine insécable du français : en gras, cette dernière devient presque invisible.

## Boutons et éléments cliquables

- Un **bouton plein** (fond bleu) : l'action principale d'un bloc.
- Un **lien-bouton** (cadre coloré) : un lien de navigation important.
- Un **bouton discret** (cadre, fond transparent) : une action secondaire.
- Une **étiquette de statut** (coin arrondi léger, petit point de couleur) n'est jamais cliquable : elle n'a pas l'allure d'un bouton.
- Au survol et au clavier, tout élément cliquable change visiblement (couleur, élévation).

## Illustrations

Illustrations plates, en couleurs chaudes, personnages africains, une par rubrique (carte, communes, comparaison, méthode, simulation, question, santé, éducation, habitants). Elles sont décoratives : texte alternatif vide, largeur et hauteur déclarées, chargement différé, format WebP léger (moins de 30 Ko chacune). Les fonds blancs sont retirés (transparents) et chaque image repose sur une tuile dont la couleur suit le thème (un bleu très léger sur le fond), pour qu'aucun carré blanc ne reste en thème sombre ; les images à fond coloré gardent leur fond. Les crédits sont dans `methodologie/CREDITS_IMAGES.md` et dans la section À propos de l'accueil.

## Cartes vivantes : un seul comportement

Tout bloc qui se présente comme une carte réagit de la même façon au survol et au clavier : il s'élève de 4 à 5 pixels, sa bordure devient bleue, un fond dégradé bleu et bronze apparaît, et l'accent passe au bronze (le nombre, le rond numéroté ou l'image qui s'incline). Cela concerne : les chiffres clés, les étapes numérotées (Comparer et Simuler), les sources de l'accueil, les rubriques, les cartes de la section À propos, les photos et les lignes du classement du simulateur. Un nouveau bloc de ce type doit reprendre la règle, pas inventer la sienne.

## Formulaire de contact

Deux colonnes : à gauche l'image, une phrase d'accueil et le lien vers l'assistant ; à droite le formulaire. Quatre champs obligatoires seulement (nom, prénom, e-mail, message), marqués d'une étoile bronze. Les champs facultatifs (téléphone, structure, objet) sont repliés sous une ligne « Ajouter... » pour ne pas alourdir. Une erreur colore le champ en rouge et le message dit précisément quoi remplir.

## Page « Simuler un budget »

Une vraie page, pas une fiche sur la carte : un formulaire en tête (région, département, nombre de structures, année), puis à gauche la comparaison et le classement, à droite la carte des communes retenues (pastilles numérotées, carte recadrée sur le périmètre choisi).

## Page « À propos : l'essentiel en une page »

L'essentiel en une page, pour les décideurs pressés. Tous les chiffres sont calculés à partir des données du site : rien n'est écrit à la main, donc rien ne peut se contredire. À l'impression, le menu, le pied de page, l'assistant et les boutons disparaissent, le fond devient blanc, et la page tient sur une seule feuille A4. Elle n'a pas d'onglet dans le menu (six liens) : on y accède par le bouton de l'accueil, la section « À quoi sert ce site » et le lien « À propos » du pied de page.

## Carte et fiche d'une commune

Un clic sur une commune zoome sur elle, assez près pour qu'elle ne touche pas ses voisines (de ×6 à ×60 selon la densité), sans jamais dézoomer. Sur grand écran (900 px et plus), la fiche est un panneau de 400 px rangé à droite sous le menu : la carte se réduit au lieu d'être masquée, et la recherche et les commutateurs du bas se recentrent. Sur téléphone, la fiche est une feuille en bas de l'écran, limitée à 52 % de sa hauteur, avec un seul domaine déplié. La fiche réunit toujours la santé et l'éducation (le domaine affiché sur la carte d'abord). Au-delà de ×3, la taille des points à l'écran ne grandit presque plus : c'est ce qui sépare les communes serrées.

## Animations

Discrètes et jamais imposées : élévation au survol, nombre qui change de couleur, image qui s'incline légèrement, apparition douce des blocs, passage doux d'une page à l'autre. Tout est coupé pour les personnes qui ont demandé moins de mouvement dans leur système (`prefers-reduced-motion`).

## Mise en page

- Les sections sont espacées (de 44 à 88 px selon l'écran) : la page respire.
- Le bouton « Haut » (en bas à droite, plein, bleu) apparaît après 320 px de défilement ; l'assistant est au-dessous.
- L'en-tête change d'aspect (ombre, fond plus opaque) dès que l'on descend.
- Sur téléphone, le menu affiche le mot « Menu » pour ne pas rester caché derrière une icône.
