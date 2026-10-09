# Glossaire : les phrases et les mots de Jàppale Sénégal, en clair

Ce fichier reprend, en termes simples, les phrases les plus importantes du site et les mots plus techniques. Le même texte figure sur la page « Méthode et données » du site, dans la section « Que veulent dire les mots du site ? ».

## Les phrases du site, en clair

**« Besoin estimé aujourd'hui : 553 postes de santé supplémentaires »**

Si chaque commune avait un poste de santé pour 10 000 habitants, il faudrait 553 postes de plus que ceux recensés. C'est un besoin calculé avec une règle, pas un nombre compté sur le terrain.

**« Touba Mosquée : 75 postes manquants sur 113 nécessaires »**

Touba compte environ 1,1 million d'habitants. La règle demande 113 postes, et 38 sont recensés. Il en manque donc 75, soit 113 moins 38.

**« 93 en vue bassin »**

Les 38 postes de Touba servent aussi les communes voisines, à moins de 15 km. Quand on en tient compte, il reste moins de postes pour les habitants de Touba, et le manque monte à 93.

**« La couleur des points sur la carte (bronze, bronze clair, bleu) »**

Elle dit quelle part du besoin n'est pas couverte. Bronze : la moitié ou plus des postes nécessaires manquent. Bronze clair : entre un cinquième et la moitié. Bleu : moins d'un cinquième.

**« +16,3 % de population desservie en plus »**

Avec le même budget de 10 structures, la méthode du simulateur sert 16,3 % d'habitants de plus qu'un simple classement des communes par déficit.

**« 6 structures au lieu de 10 »**

Pour servir à peu près autant d'habitants, la méthode du simulateur a besoin de 6 structures, là où un simple classement en demande 10.

**« 215 communes sur 551 sans aucun établissement secondaire recensé »**

Dans les données utilisées, 215 communes (parmi les 551 dont les structures ont pu être rattachées) n'ont ni collège ni lycée. Ce n'est pas un déficit : il n'existe aucune norme officielle pour le secondaire, donc nous comptons seulement, sans dire combien il en manque. Le primaire n'est pas couvert, et l'enseignement supérieur est présenté à part.

**« Chiffre à confirmer : 2 124 postes de santé, ou 1 680 ? »**

Deux sources ne donnent pas le même nombre de postes de santé : 2 124 dans les données géolocalisées, 1 680 dans une brochure du Ministère. Nous n'avons pas encore expliqué cet écart. Avec le chiffre du Ministère, le manque serait plus élevé (environ 686 postes au lieu de 553), mais les 10 communes les plus touchées resteraient les mêmes.

**« Projection indicative pour 2033, à nombre de postes constant : 1 040 »**

Si la population continue de croître comme entre 2013 et 2023, et si aucun poste n'est construit, il manquerait environ 1 040 postes en 2033. C'est une projection pour réfléchir, pas une prévision officielle.

**« Données vérifiées, ou donnée à confirmer »**

Données vérifiées : des structures ont pu être rattachées à la commune. Donnée à confirmer : aucune n'a pu l'être, donc le manque est probablement surestimé. Cela ne concerne que très peu de communes (deux aujourd'hui).

## Les mots, expliqués simplement

**À nombre de postes constant**

On suppose qu'aucun nouveau poste n'est construit. Cela permet de voir ce que deviendrait le manque si rien ne change. Ce n'est pas une prévision.

**À population desservie égale**

On compare combien de structures chaque méthode demande pour servir à peu près le même nombre d'habitants. « 6 structures au lieu de 10 » veut dire que la méthode du simulateur en demande moins.

**À vol d'oiseau**

Distance en ligne droite entre deux points, comme volerait un oiseau. Elle ne tient compte ni des routes, ni des pistes, ni de la saison des pluies : le trajet réel est plus long.

**Algorithme**

Une suite d'étapes précises, que l'ordinateur suit toujours dans le même ordre. Ici : choisir la commune qui ferait servir le plus d'habitants, l'enlever du calcul, puis recommencer jusqu'à épuiser le budget.

**Algorithme glouton**

Un algorithme qui fait à chaque étape le meilleur choix du moment, sans revenir en arrière. Il est simple et rapide, mais il ne garantit pas la meilleure solution possible parmi toutes.

**ANSD**

Agence nationale de la statistique et de la démographie du Sénégal. Elle publie le recensement dont viennent nos chiffres.

**Bassin (vue bassin)**

Une commune et ses voisines situées à moins de 15 km, qui se partagent les postes de santé. Un poste proche aide une commune qui n'en a pas, mais il ne peut pas servir tout le monde : sa capacité est répartie entre les communes, selon la proximité. Ce n'est pas un découpage officiel.

**Campus (université publique)**

Un site d'enseignement supérieur public. Dans la couche source, plusieurs lignes d'une même commune situées à moins de 1,5 km (amphithéâtres, écoles doctorales, annexes) forment un seul campus. Les établissements privés et les chantiers ne sont pas comptés.

**Centre de santé, hôpital**

Ces structures servent plusieurs communes : la règle les compte par département (un centre pour 50 000 habitants, un hôpital pour 150 000). « Aucun hôpital » veut dire aucun dans le département, pas que personne n'y a accès : l'hôpital le plus proche est indiqué avec sa distance à vol d'oiseau.

**Chevauchement**

Quand deux emplacements serviraient en partie les mêmes habitants. Le simulateur réduit le gain d'une commune proche d'une commune déjà choisie, pour ne pas compter deux fois les mêmes personnes.

**Classement simple**

Choisir les communes une par une, de la plus en déficit à la moins en déficit, sans regarder si elles sont voisines. C'est la méthode à laquelle le simulateur se compare.

**Constat (éducation)**

Un chiffre compté, sans règle pour dire s'il est suffisant. Pour la santé, une norme dit combien de postes il faut. Pour les collèges et les lycées, nous n'avons trouvé aucune norme officielle : nous comptons seulement.

**Croissance mesurée ou estimée**

Mesurée : calculée à partir des deux recensements, 2013 et 2023. Estimée : quand ce calcul n'est pas possible pour une commune, on lui donne la croissance médiane du pays (2,94 % par an).

**CSV**

Un fichier de tableau très simple, que l'on ouvre dans Excel ou Google Sheets.

**Déficit (postes manquants)**

L'écart entre le nombre de postes que la norme demande et le nombre de postes recensés. C'est un besoin théorique : il dit où regarder en premier, pas ce qu'il faut construire exactement.

**Données ouvertes**

Des données que tout le monde peut consulter, télécharger et réutiliser. Les nôtres et le code qui les traite sont publics.

**ENO (espace numérique ouvert)**

Un site de l'Université numérique Cheikh Hamidou Kane, anciennement Université virtuelle du Sénégal, où les étudiants suivent des cours à distance et se retrouvent en présentiel. Ce n'est pas un campus d'université : il est compté à part.

**Estimation**

Un chiffre calculé avec des hypothèses. Il peut s'écarter de la réalité, contrairement à un chiffre compté sur le terrain.

**Fiabilité des données**

Indique si les chiffres d'une commune reposent sur des données bien reliées (« vérifiées ») ou moins sûres (« à confirmer »), et si sa croissance a été mesurée ou estimée. Ce n'est pas un jugement sur le travail de l'ANSD.

**Géo Sénégal**

Plateforme de données géographiques du Sénégal, où se trouvent les positions des postes de santé et des établissements scolaires que nous utilisons.

**Géolocalisé**

Dont on connaît la position sur la carte, grâce à sa latitude et à sa longitude.

**Homonymes**

Des communes qui portent le même nom dans des départements différents. Le site ajoute le département pour les distinguer.

**Hypothèse**

Une supposition posée pour pouvoir calculer, par exemple un rayon de 15 km autour d'un poste, ou un coût égal pour chaque structure. Elles sont toutes écrites dans cette page.

**Médiane**

La valeur du milieu : la moitié des communes est au-dessus, l'autre moitié en dessous. Elle ne se laisse pas tromper par quelques cas extrêmes.

**Norme**

Un repère officiel qui dit combien d'équipements il faut pour une population donnée. Pour les postes de santé : un pour 10 000 habitants, d'après des recommandations de l'OMS reprises par l'ANSD.

**OMS**

Organisation mondiale de la santé. Ses recommandations sont à la base des normes que reprend l'ANSD.

**Population desservie**

Les habitants qui vivent assez près d'une nouvelle structure pour en profiter. Le simulateur cherche à en servir le plus possible avec un budget donné.

**Poste de santé, centre de santé, hôpital**

Trois niveaux de structures. Le poste est la structure de base d'une commune (norme : un pour 10 000 habitants). Le centre de santé est d'un niveau supérieur et dessert plusieurs communes (un pour 50 000), l'hôpital aussi (un pour 150 000). Une commune sans poste mais avec un centre est donc servie sur place : son déficit de postes est à lire avec prudence.

**Pour 100 000 habitants (rapporté à la population)**

Permet de comparer des communes de tailles très différentes : on ramène chaque chiffre à une même population de 100 000 habitants.

**Priorisation**

Décider par quoi commencer. L'outil classe les besoins pour aider à choisir. Il ne décide pas à la place des élus.

**Projection, scénario (2033)**

Une estimation de l'avenir fondée sur ce qu'on observe aujourd'hui : ici, la croissance de la population entre 2013 et 2023, qui ralentit peu à peu vers la moyenne du pays. Ce n'est pas une prévision officielle.

**Prototype**

Une première version complète et utilisable, mais pas définitive. Elle aide à décider. Elle ne remplace ni une étude de planification, ni une vérification sur le terrain.

**Rattaché (à une commune)**

Relié à une commune. Le recensement et la liste des équipements n'ont pas de numéro commun : on les relie par le nom de la commune, avec des vérifications.

**Recoupement**

Comparer un chiffre avec une autre source indépendante pour voir si les deux concordent. Nous avons recoupé nos chiffres clés avec des publications de l'ANSD et du Ministère de la Santé.

**Reproductible**

N'importe qui peut refaire tous les calculs à partir des données de départ et retrouver les mêmes résultats.

**RGPH-5**

Le cinquième recensement général de la population et de l'habitat, réalisé en 2023. Il donne la population de chaque commune.

**RGPHAE**

Le recensement de 2013, qui comptait aussi l'agriculture et l'élevage. Nous le comparons à 2023 pour mesurer la croissance de chaque commune.

**Secondaire (enseignement)**

Les collèges et les lycées, publics et privés. Le primaire est en dessous, l'enseignement supérieur (universités) au-dessus : le site ne les mélange pas.

**Sensibilité (test de sensibilité)**

On change volontairement un chiffre incertain pour voir si les conclusions changent. Avec le nombre de postes du Ministère (1 680 au lieu de 2 124), les 10 communes les plus touchées restent les mêmes.
