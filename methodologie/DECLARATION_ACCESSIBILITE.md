# Déclaration d'accessibilité

**En bref :** ce que le site fait pour les personnes malvoyantes ou âgées, ce qui est vérifié, ce qui ne l'est pas.

*Version du 7 octobre 2026. Projet de hackathon : ce n'est pas une publication officielle de l'ANSD.*

## Pour qui
Le site est conçu pour être utilisable par des personnes malvoyantes, malentendantes, âgées, peu à l'aise avec le numérique ou équipées d'un petit téléphone, et pas seulement par des utilisateurs jeunes et aguerris.

## À qui s'adresse quoi
- **Personnes malvoyantes ou âgées** : le bouton « Aa » (Affichage) agrandit le texte, renforce le contraste et réduit les animations ; la fiche d'une commune peut être lue à voix haute.
- **Personnes malentendantes** : le site ne contient ni son ni vidéo, donc aucune information ne leur échappe ; le bouton « Aa » ne les concerne pas directement. Toute vidéo de présentation serait sous-titrée et accompagnée d'une transcription.

## Ce qui est en place
- **Affichage** (bouton « Affichage » dans l'en-tête de chaque page, entrée « Affichage : texte, contraste, thème » dans le menu déplié, lien « Accessibilité » dans le pied de page) : texte normal, grand (125 %) ou très grand (150 %) ; contraste renforcé (noir sur blanc ou blanc sur noir, liens soulignés, contours épais) ; animations réduites, thème clair ou sombre. Le site suit aussi les réglages de l'appareil (contraste renforcé, mouvement réduit, taille de texte du navigateur). Les réglages sont mémorisés sur l'appareil quand le navigateur le permet.
- **Texte de base de 17 px** (il était de 15 px), avec un plancher de 13 px pour les petits textes.
- **Cibles tactiles d'au moins 44 px** sur les écrans tactiles.
- **Lecture à voix haute de la fiche d'une commune**, avec la voix du navigateur, en français, quand l'appareil la propose.
- **Mode d'emploi en trois étapes** sur la page d'accueil, en phrases courtes.
- **Navigation au clavier** : lien d'évitement « Aller au contenu » sur les sept pages, anneaux de focus, régions de la carte accessibles au clavier.
- **Petits écrans** : les sept pages tiennent dans 360 px de large, y compris avec le texte très grand.
- **Mouvement réduit** respecté (réglage du système et réglage du site).
- **Sept phrases clés en wolof**, relues par un locuteur de l'équipe.
- **Malentendants** : le site ne contient ni son ni vidéo ; aucune information ne passe par l'écoute. Toute vidéo de présentation devra être sous-titrée et accompagnée d'une transcription.

## Ce qui a été vérifié
- Audit automatique axe-core (WCAG 2.0 à 2.2, niveaux A et AA, plus les bonnes pratiques) sur neuf vues, en thèmes clair et sombre : aucune violation. Même audit avec texte très grand, contraste renforcé et animations réduites, plus le contraste renforcé de niveau AAA (7 pour 1) pour le texte.
- Tests dans un vrai navigateur (Chromium) : lien d'évitement au clavier, pages sans débordement à 360 px, texte très grand, mémorisation des réglages, cibles tactiles.

## Ce qui n'a PAS été vérifié
- Passage au lecteur d'écran (VoiceOver, TalkBack, NVDA).
- Le PDF téléchargé est un PDF simple non balisé (pas de structure pour les lecteurs d'écran) : le fichier Word est préférable pour ces personnes. Aucun des deux n'a été ouvert avec un lecteur d'écran.
- Essais avec des personnes malvoyantes, malentendantes ou âgées.
- Essais sur de vrais appareils, en particulier de petits téléphones anciens.
- Lecture à voix haute en wolof : elle n'existe pas.
- Alternative textuelle complète de la carte pour toutes les vues (les couleurs sont doublées de chiffres, mais ce n'est pas vérifié partout).

## Limites connues
- La lecture à voix haute dépend de la voix fournie par l'appareil et peut être de qualité variable.
- Le wolof ne couvre que sept phrases ; ni pulaar ni sérère.
- Pas de version en langue des signes.

## Signaler un problème
Aucun canal de contact n'est encore défini (le formulaire de contact du site n'envoie aucun message). À définir avec l'ANSD.
