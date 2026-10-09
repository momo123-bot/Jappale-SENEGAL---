# Suivi des retours d'utilisateurs - Jàppale Sénégal

## En bref

- **Plus de 19 personnes réelles** ont testé le site et donné leurs remarques, de profils différents : lycéen, étudiants, grands-parents, habitants, médecin, juriste, professeurs, doctorant. Leurs noms restent confidentiels.
- Chaque remarque est notée ci-dessous avec ce que nous en avons fait : **Fait**, **Partiel**, **Non fait** ou **Écarté** (avec la raison).
- Ces retours ont fait la version V11 : un site qui se comprend sans être statisticien, qui marche sur téléphone, et qui dit ses limites.

## Dernière série (octobre 2026)

| Qui | Remarque | Statut | Ce que nous avons fait |
|---|---|---|---|
| Professeur | « Je n'ai pas le temps de tout lire : quels sont les tenants et aboutissants ? » | Fait | Une note d'une page (`NOTE_DE_PRESENTATION.md`), un README court, un résumé en tête des limites. |
| Professeur | Où et comment stocker les données, sur quelle plateforme ? | Fait | `methodologie/GESTION_DES_DONNEES.md` : où sont les données, trois options d'hébergement, plan pour les données de l'ANSD. |
| Professeur | La typographie fait « générique » | Fait | Nouvelles polices (Source Serif 4, Source Sans 3), embarquées dans le site : rien à installer. |
| Professeur | Le site ne s'est pas ouvert sur son téléphone | Partiel | Causes probables corrigées (code trop récent pour certains téléphones, carte qui disparaissait, message pour les navigateurs anciens). Pas encore revérifié sur ce téléphone. |
| Professeur | Zoomer « comme Google Maps » | Partiel | Liens « Google Maps » et « OpenStreetMap » sur chaque fiche. Intégrer Google Maps est écarté : clé payante et connexion obligatoire. |
| Membre du jury | Le jury n'est pas que technique | Fait | Présentation préparée sans jargon, avec les questions probables de chaque profil de juré. |
| Porteur du projet, sur téléphone | Recherche peu visible, titre trop long, trop de texte, explorateur qui ne revient pas en arrière, liste de 553 communes, thème qui repasse en clair, texte bleu sur fond bleu | Fait | Recherche sous le titre, titre court, blocs repliés, retour à la vue de départ, liste par 25, démarrage en sombre, contraste corrigé. |
| ANSD (débriefing) | Données détaillées pour deux ou trois régions | Fait | Données de Dakar, Diourbel et Thiès intégrées : bloc « Services de base » sur la fiche des 142 communes. |

## Journal détaillé des séries précédentes

Ce document recense les remarques reçues lors des essais (plus de 19 personnes au total) et dit ce qui en a été fait. Quatre statuts : **Fait**, **Partiel** (une partie seulement, précisée), **Non fait** (reste à faire, voir la feuille de route), **Écarté** (avec la raison).

Les limites que nous connaissons sont rassemblées dans `methodologie/LIMITES.md`.

Un point d'honnêteté : les testeurs ont essayé le site sur leurs propres téléphones et ordinateurs ; des contrôles automatiques complètent ces essais. Safari et Firefox restent à vérifier par un test automatique, et un lecteur d'écran n'a pas été essayé.

## Données et méthode

| Remarque | Statut | Ce qui a été fait ou pourquoi pas |
|---|---|---|
| Touba : 1,1 million d'habitants, un site indique 529 176 | Fait | 1 120 824 est le chiffre officiel de l'ANSD (résultats publiés le 12 juin 2024). Explication écrite sur la page Méthode. |
| Un article donne 18 032 473 habitants pour le Sénégal | Fait | C'est le résultat préliminaire d'octobre 2023, remplacé par 18 126 390 en juillet 2024. Notre total est à 0,007 % du chiffre officiel. |
| Lire le rapport de l'ANSD (PDF) | Partiel | Le site de l'ANSD interdit l'accès automatique : le rapport n'a pas été lu directement. Les chiffres de population ont été confrontés à des publications secondaires (vie-publique.sn, relais d'information). À relire à la main dans le rapport de l'ANSD. |
| Quelles sont les 2 communes « à confirmer » et pourquoi | Fait | Sama Kanta Peulh et Diouboudou, absentes de toutes les couches de Géo Sénégal. La cause n'est pas connue et n'est pas présentée comme un fait. |
| Être très exigeant sur les données, varier et confronter les sources | Partiel | Neuf vérifications écrites (page Méthode). Reste à croiser avec d'autres annuaires. |
| Universités : seulement les publiques, deux campus à Kaolack, nouvelle université de Matam | Partiel | Enseignement supérieur séparé du secondaire : 25 campus d'universités publiques, comptés par commune ; Kaolack a un campus dans chacune de ses communes. L'Université de Matam n'est pas comptée tant qu'elle n'est pas ouverte. L'étiquette « publique » vient de la source et n'a pas été vérifiée campus par campus. |
| Commune avec un centre de santé mais sans poste (Oussouye) | Fait | Signalée sur la fiche : son déficit de postes est à lire avec prudence. |
| La santé dépend de l'accessibilité (la distance à la structure) | Non fait | La vue bassin (15 km à vol d'oiseau) en donne une approximation. Un temps de trajet réel est en priorité 3 de la feuille de route. |
| Outils internationaux (PHCPI, SDG3 GAP, mécanisme GFF) | Partiel | La PHCPI a été vérifiée et située : Jàppale mesure des intrants, pas la qualité (page Méthode). SDG3 GAP et GFF n'ont pas été vérifiés. |
| Mesurer la qualité des structures, pas seulement leur nombre | Non fait | Il faudrait des données par structure. Feuille de route, priorité 7. |
| Le simulateur prend-il en charge l'éducation ? | Non fait | Non : aucune norme officielle ne permet de dire où un établissement manque. Le simulateur le dit. |

## Carte (explorer)

| Remarque | Statut | Ce qui a été fait ou pourquoi pas |
|---|---|---|
| Rien n'indique si « Communes » ou « Régions » est sélectionné | Fait | L'état actif manquait dans le style : corrigé. |
| Santé et éducation se ressemblent | Fait | L'éducation est en violet, la santé en bronze et bleu. |
| Expliquer la vue bassin, la vue commune, éducation par région | Fait | La légende contient « Ce que vous voyez » et s'adapte à chaque choix. |
| Zoomer (région, département, commune) | Fait | Molette, deux doigts, boutons, bouton « Zoomer sur la région ». Non fait : la petite carte de l'accueil n'a pas de zoom. |
| Afficher les noms des régions, puis des départements, puis des communes en zoomant | Fait | Les noms apparaissent par niveaux, sans se chevaucher. |
| Région choisie : un pourtour coloré épais, pas un carré qui déborde | Fait | Le cadre carré du navigateur est supprimé ; pourtour bronze épais. |
| Bleu trop clair en thème clair | Fait | Bleu plus foncé pour les points les moins touchés. |
| Difficile de cliquer sur la bonne commune parmi tant de points | Fait | Un clic près d'un point ouvre la commune la plus proche ; le zoom aide. |

## Fiches et pages internes

| Remarque | Statut | Ce qui a été fait ou pourquoi pas |
|---|---|---|
| Sam Notaire : la fiche mélange commune et département | Fait | Deux groupes : « cette commune seulement » puis « pour situer cette commune ». Les hôpitaux et centres sont annoncés comme ceux du département. |
| Des étiquettes ont l'allure de boutons | Partiel | Corrigé sur la fiche commune. Pas d'audit exhaustif des autres pages. |
| Page Communes : image en haut, exemples, « voir toutes les communes » déroulant | Partiel | Image d'en-tête faite. Pas d'exemples ni de liste déroulante. |
| Comparer : fluidité et image | Partiel | Image d'en-tête, passage doux d'une page à l'autre. |
| Bouton « Afficher tous les détails » sans effet | Fait | L'état du bouton suit les sections réellement ouvertes ; un texte à l'écran dit combien sont ouvertes ; la page se place sur la première. |
| Charte graphique dans les fichiers GitHub | Fait | `methodologie/CHARTE_GRAPHIQUE.md` (oubliée dans un premier temps). |

## Accueil et navigation

| Remarque | Statut | Ce qui a été fait ou pourquoi pas |
|---|---|---|
| Informations trop rapprochées, laisser respirer | Fait | Sections espacées. À confirmer visuellement. |
| Trop de texte, trop d'informations | Partiel | Textes des rubriques raccourcis, plus d'images. La page reste dense (chiffres, classement, sources). |
| Première personne : ne comprend pas ce qu'est la plateforme, besoin d'images | Partiel | Une illustration par rubrique et par chiffre, section « À propos ». Un public qui ne lit pas du tout le français n'a pas de version traduite. |
| Illustrer chaque parcours, animation avant le clic | Fait | Mosaïque de six rubriques avec image ; animations au survol, coupées si la personne préfère moins de mouvement. |
| Chiffres clés : mise en valeur au survol | Fait | Élévation, fond coloré, nombre en bronze, image qui s'incline. |
| Bouton pour remonter en haut | Fait | En bas à droite, plein et visible, apparaît après 320 px. |
| Assistant (chatbot) sur toutes les rubriques | Fait | Un panneau sur chaque page, mêmes réponses que sur la carte (vérifié mot pour mot sur 22 questions). |
| Un champ de question dans le pied de page | Partiel | Le lien du pied de page ouvre l'assistant sur place ; il n'y a pas de champ de saisie dans le pied de page lui-même. |
| En-tête qui change de couleur quand on descend | Fait | Ombre et fond plus opaque. |
| Pied de page : liens utiles, réseaux sociaux | Partiel | Liens vers l'ANSD, Géo Sénégal, Vie publique. Pas de réseaux sociaux : le projet n'a pas de compte. |
| Le site s'ouvre en clair au lieu du sombre | Fait | Le site ouvre en sombre tant qu'aucun choix n'est mémorisé. Un ancien choix « clair », resté dans le navigateur, pouvait l'emporter : la clé de mémorisation a changé, les anciens choix sont oubliés une fois. |
| Carte : en zoomant, les points se chevauchent et le zoom est limité | Fait | Mesuré dans un vrai navigateur : au zoom maximal sur Grand Yoff (Dakar), 35 paires de points se chevauchaient avec l'ancien plafond (×14). Le zoom monte maintenant à ×60 et, au-delà de ×3, les points gardent à peu près la même taille à l'écran : plus aucun chevauchement au zoom maximal. |
| Carte : le panneau d'information masque la carte ; un clic devrait zoomer sur la commune ; la fiche devrait montrer santé et éducation | Fait | Un clic zoome automatiquement sur la commune (de ×6 à ×60 selon la densité : sur les 25 communes les plus serrées du pays, aucune ne touche une voisine). Sur grand écran, la fiche est un panneau rangé à droite sous le menu et la carte se réduit ; sur téléphone, la fiche prend 52 % de l'écran au lieu de 78 %, avec un seul domaine déplié. La fiche réunit santé et éducation. |
| Le personnel de santé et d'éducation existe-t-il en données publiques ? | Fait pour la santé, par région ; non pour l'éducation | **Santé** : l'annuaire des ressources humaines 2022 du Ministère donne, par région, les effectifs de médecins, d'infirmiers et de sages-femmes et les compare aux normes officielles. Ils sont dans `donnees/personnel_sante_region_2022.csv` : Kaolack, Saint-Louis, Diourbel et Kolda sont à 50-59 % de couverture, Dakar et Ziguinchor à 100 %. Par structure ou par commune : rien de public trouvé. **Éducation** : aucun effectif ni norme publiés trouvés sur le site du Ministère ; voir l'isolement scolaire. |
| Comment faire mieux qu'un simple décompte pour l'éducation ? | Partiel | Analyse de l'isolement scolaire (distance au collège ou lycée le plus proche) et choix de sites : `tests/analyse_isolement_scolaire.py`. Écrite dans la page Méthode et dans les limites. Reste à l'afficher dans l'interface. |
| Les chiffres de Jàppale concordent-ils avec la nouvelle Carte sanitaire 2026-2030 ? | Non vérifiable | Le document officiel n'a pas été trouvé : aucun de ses chiffres n'est repris. Recoupement fait avec le rapport officiel de suivi de la carte sanitaire 2021 : hôpitaux publics (44 chez nous, 40 officiels) et postes de santé (1 531 à 1 731 officiels, 2 124 chez nous). Les écarts sont écrits dans la page Méthode et dans les limites. |
| Un testeur : le bouton « Chercher ma commune » obligeait à défiler, le titre du formulaire passant sous la barre fixe | Corrigé | Défaut reproduit dans un vrai navigateur (téléphones de 360 et 390 px de large) ; marge de défilement ajoutée sous la barre fixe ; trois mesures de contrôle ajoutées au test du navigateur. |
| Le personnel (médecins, infirmiers, enseignants) n'est pas pris en compte, seulement les structures ; un établissement recensé peut ne pas être fonctionnel (double flux, fermeture) | Partiel | Écrit comme la limite la plus importante du site (page Méthode, page À propos, `methodologie/LIMITES.md`) : des normes de personnel existent et des effectifs sont publiés par région, mais aucune liste par structure ou par commune n'a été trouvée dans nos sources. Ni intégré ni estimé. |
| Que devient le calcul à l'échelle d'un département ou d'une région ? | Fait | Réponse écrite dans la page Méthode (section « Les normes utilisées ») : on additionne les manques des communes ; comparer le total régional à la population ne verrait un manque que dans 2 régions sur 14. |
| Le chiffre de 553 dépend-il de l'arrondi ? (question posée par l'analyse du suivi) | Fait | Oui : 447 sans arrondi, 440 à l'entier le plus proche, 369 à l'inférieur ; classement inchangé. Dit sur la page Méthode, la page À propos et dans les limites ; analyse rejouable `tests/analyse_sensibilite_arrondi.py`. |
| Un visiteur ne comprend pas le contexte : pourquoi le site existe, quel public il vise, ce qu'il y cherche et ce qu'il peut en attendre | Fait | Les cartes « Pourquoi » et « Pour qui » tenaient en une ligne et se trouvaient en bas de page. Une section « À quoi sert ce site, et à qui ? » est maintenant placée sous les chiffres clés : le problème (avec l'exemple chiffré de Touba), les deux familles de publics (ceux qui choisissent où investir, ceux qui veulent vérifier), et ce qu'on y trouve. Un contrôle vérifie dans un vrai navigateur qu'elle est visible dès le deuxième écran. |
| À qui s'adresse l'outil ? Il paraît trop complexe pour un non-initié | Fait | Une page « À propos : l'essentiel en une page » donne l'essentiel en une page (situation, communes et régions prioritaires, budget de 10 postes, bases des chiffres, limites), imprimable sur une page A4 ; un bouton « Lire la synthèse en une page » est en tête de l'accueil ; trois pistes selon le profil (décideur, technicien, citoyen). |
| Sur quelle base reposent les prévisions et les scénarios ? Prévision officielle ou modèle développé ? | Fait | Une section visible de la page Méthode répond : ni prévision officielle, ni modèle économique, mais une extrapolation de tendance dont la formule est écrite. Un test Python vérifie que cette formule produit exactement les chiffres du site pour les 553 communes. Un test de sensibilité au taux de croissance donne la fourchette (920 à 1 190 postes en 2033). |
| Formulaire de contact : l'étoile des champs obligatoires est sur une ligne à part | Fait | Repéré sur une capture d'écran réelle : l'étoile faisait sa propre ligne sous le libellé. Elle est maintenant dans le libellé. |
| Explorateur : la légende cache « Dakar » et des points sur les écrans moyens | Fait | Repéré sur capture : sur un écran de 1 280 à 1 536 px la légende recouvrait Dakar et jusqu'à 37 points. La carte démarre maintenant à droite de la légende (mesuré sur 8 tailles d'écran). |
| Grands nombres illisibles en gras (« 1371000 ») | Fait | L'espace fine insécable du français est presque invisible en gras : remplacée par une espace insécable ordinaire dans tout le site. |
| Simulation : les pastilles de la carte sont petites et peu lisibles | Fait | Plus grandes, chiffre foncé sur fond orange, proportionnées au cadrage, le rang 1 au-dessus. |
| Simuler : l'année de référence et le bouton « Calculer la priorité » sont côte à côte et prêtent à confusion | Fait | L'année est un réglage : elle a son bloc (titre, explication, aspect sombre), séparé du bouton de calcul qui est seul sur sa ligne. |
| Photos : légendes trop longues | Fait | Sous chaque photo, seule la mention du crédit : « Photo : @sonatel » et « Photo : libre accès ». |
| Comparer : les étapes 1, 2, 3 ne s'animent pas comme les chiffres clés | Fait | Même comportement partout : élévation, bordure bleue, fond dégradé et accent bronze, pour les chiffres clés, les étapes, les sources, les rubriques et les photos. Les étapes sont définies une seule fois dans la feuille partagée. |
| Contact : mal présenté, trop d'informations | Fait | Deux colonnes, quatre champs obligatoires (nom, prénom, e-mail, message) ; téléphone, structure et objet sont repliés et facultatifs. |
| Page Simuler : les trois cartes de comparaison débordent, police trop grande | Fait | Cause : le composant des cartes portait le même nom (« .kpi ») que celui de la fiche d'une commune, qui l'emportait avec une police de 34 px et une grille de 4 colonnes. Il s'appelle maintenant « carte-chiffre » ; le gros chiffre est suivi d'une légende plus petite ; un contrôle mesure qu'aucun texte ne sort de son cadre de 360 à 1 920 px, et un test refuse tout sélecteur défini dans deux feuilles de style d'une même page. |
| « Synthèse » en bouton plutôt qu'en onglet du menu, et un « À propos » qui la contienne | Fait | La page s'appelle désormais « À propos : l'essentiel en une page » et n'a plus d'onglet : bouton en tête de l'accueil, lien dans la section « À quoi sert ce site », lien « À propos » du pied de page de chaque page. Le menu repasse à six liens et le champ de recherche du haut réapparaît dès 1 400 px (au lieu de 1 560 px). La section de l'accueil qui s'appelait « À propos » devient « Le projet » : un seul « À propos » dans le site. |
| Formulaire de contact non branché | Partiel (assumé) | Il n'envoie rien tant qu'aucune adresse n'est renseignée dans `docs/site.js`. À la demande de l'équipe, la phrase « Ce formulaire n'est pas encore relié à une boîte de réception » ne figure plus sur la page : elle est dans `methodologie/LIMITES.md`, à l'attention de l'organisation. Sur la page, le bouton s'appelle « Préparer mon message » et le message « Rien n'a été envoyé » s'affiche à la validation, pour qu'aucun visiteur ne croie avoir écrit à l'équipe. |
| Première carte de chiffres clés collée à gauche | Fait | Une ancienne règle retirait la marge de la première carte seulement (et de la troisième sur téléphone) : supprimée, les quatre cartes ont la même marge et sont espacées. |
| Comparer : la balance avec coche verte et croix rouge prête à confusion | Fait | Les deux symboles sont retirés et les deux pastilles sont grises et identiques : comparer des territoires n'a pas de bonne réponse. |
| Les illustrations gardent un fond blanc en thème sombre | Fait | Fonds blancs retirés (le blanc à l'intérieur des personnages est conservé) ; la tuile derrière l'image suit le thème. Les images à fond coloré gardent leur fond. |
| Crédits des images | Fait | Photo du poste de santé : @sonatel. Les illustrations et la photo du lycée sont en libre accès : aucun auteur n'est nommé, faute de mention dans les fichiers. Si une source exige une mention, il suffit de donner le nom. |
| Trop de blanc, préférence pour le thème sombre | Fait | Thème sombre par défaut, clair en un clic, choix mémorisé. |
| Mosaïque des rubriques | Fait | Six cartes. |
| Le menu en haut à droite est caché | Fait | Le mot « Menu » est écrit à côté de l'icône sur téléphone. |
| Méthode et données avant Simuler un budget | Fait | Ordre du menu modifié. |
| À propos, contact | Fait | Section « À propos » et formulaire de contact (nom, prénom, e-mail obligatoires ; téléphone, structure, objet, informations facultatifs). La réception des messages reste à configurer (voir le fichier `docs/site.js`). |
| Flash d'écran quand on passe d'une page à l'autre | Fait | Fond immédiat dans la couleur du thème, transition douce, double tampon dans le lien d'aperçu. |
| Anglais sur le site | Fait | Retiré. |
| Changer de langue (français, anglais, arabe) | Écarté | Choix assumé : le site reste en français. |
| Page dédiée au simulateur | Fait | `simulateur.html` : une vraie page (formulaire, résultats comparés, liste, carte des communes retenues, export). Le calcul est partagé avec l'explorateur et vérifié identique sur 24 scénarios. |
| Le menu « Simuler un budget » ouvrait un petit rectangle sur la carte | Fait | Le menu mène à la page dédiée. L'engrenage de la carte garde un simulateur compact, avec un lien vers la page en grand. |
| Simuler pour un pays, une région, un département | Fait | Sélecteurs de périmètre ; année de référence en bas. |
| Procédure de déploiement : varier les exemples, troisième issue | Fait | Test sur une commune au choix ; contact dans le PDF remis à l'organisation. |
| Une même commune pour investir (ex. Guédiawaye) | Fait | Simulation par département. |

## Remarques écartées

| Remarque | Raison |
|---|---|
| Outils JMP, WASH FIT et SaniPath (suggestion d'un testeur) | Vérifiés : ils portent sur l'eau, l'assainissement et l'hygiène. Peu liés à la mesure de l'accès : non retenus, notés dans la feuille de route. |
| Le bouton « actualiser » ramène à l'accueil, le retour arrière ne marche pas | Défaut du lien d'aperçu (une page qui en contient d'autres), pas du site : sur le site déployé, les deux fonctionnent. |
| Gérer la compatibilité avec les navigateurs | Trop vague pour être traitée telle quelle. Des mesures automatiques dans un vrai navigateur (Chromium) existent maintenant (`tests/navigateur/`) ; Safari, Firefox et de vrais téléphones restent à vérifier ; un testeur a vu le site fonctionner sur Chrome mobile. |
