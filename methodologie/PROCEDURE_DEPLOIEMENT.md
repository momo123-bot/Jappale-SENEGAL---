# Procédure de déploiement - Jàppale Sénégal

**En bref :** le site se met en ligne en moins de 5 minutes, sans installation ; une commande vérifie que cela marche.

Le site est un simple dossier de fichiers (le dossier `docs/`) : pas de serveur, pas de base de données,
aucune installation. **Déployer le site, c'est publier ce dossier.** Cette procédure est écrite pour quelqu'un qui n'a
jamais vu le projet : elle ne suppose aucun compte payant ni connaissance technique au-delà d'un navigateur web.

**Résultat attendu** : un site accessible par un simple lien, avec la carte des 553 communes et six autres pages.

## Choisir son chemin

| Chemin | Pour qui | Temps | Comment |
|---|---|---|---|
| **1. Ouvrir le fichier** | Essayer tout de suite, sans internet | 30 secondes | Décompresser l'archive ZIP, ouvrir le dossier `docs`, double-cliquer sur `index.html`. |
| **2. GitHub Pages** | Un lien public gratuit | 5 minutes | Voir « Chemin 2 » ci-dessous. |
| **3. Hébergement de l'ANSD** | Mise en ligne durable | 10 minutes | Copier le **contenu** du dossier `docs/` à la racine (ou dans un sous-dossier) de tout hébergement de pages statiques (Apache, Nginx, Netlify...). Rien à configurer. HTTPS recommandé. |
| **4. Serveur local** | Développeurs | 1 minute | Avec Python 3 : `python3 -m http.server --directory docs 8000`, puis ouvrir http://localhost:8000/ |

**Dans tous les cas, vérifier en une commande** (section « Vérifier le déploiement en une commande »).

## Chemin 2 : GitHub Pages, pas à pas

### Prérequis important : le dépôt doit être PUBLIC

Avec un compte GitHub gratuit, GitHub Pages ne fonctionne que sur un dépôt
**public** (les dépôts privés exigent un abonnement payant). Si le dépôt est
privé, l'option Pages affichera un message demandant de passer à un plan payant
ou de rendre le dépôt public. Dans ce cas : **Settings > tout en bas, "Danger
Zone" > "Change visibility" > Public**, puis reprendre à l'étape 1.

Si vous ne souhaitez pas rendre public le dépôt complet de travail, utilisez le
chemin 1 ou 3 ci-dessus, qui ne dépend pas de GitHub Pages.

### Si vous partez de l'archive ZIP

Créer un dépôt public, décompresser l'archive, puis déposer son contenu avec **Add file > Upload files**. GitHub limite chaque envoi à 100 fichiers et le dépôt en compte 205 : faire trois envois (tout sauf `code`, `tests`, `docs/images` et `docs/polices` ; puis `code` et `tests` ; puis `docs/images` et `docs/polices`). Reprendre ensuite à l'étape 1.

### Étape 1 - Ouvrir les réglages du dépôt

1. Se rendre sur la page du dépôt GitHub du projet.
2. Cliquer sur l'onglet **Settings** (en haut de la page du dépôt - pas les
   réglages du compte personnel).

### Étape 2 - Activer GitHub Pages

1. Dans le menu de gauche, cliquer sur **Pages**.
2. Sous **Build and deployment**, dans le menu déroulant **Source**,
   sélectionner **Deploy from a branch**.
3. Sous **Branch**, choisir la branche **main**, puis dans le second menu
   déroulant à côté (le dossier), choisir **/docs**.
4. Cliquer sur **Save**.

### Étape 3 - Attendre et récupérer le lien

1. Patienter environ 1 à 2 minutes (GitHub prépare la page).
2. Rafraîchir la page **Settings > Pages** : un encart vert apparaît en haut,
   avec un lien du type :
   ```
   https://<nom-utilisateur>.github.io/<nom-du-depot>/
   ```
3. Cliquer sur ce lien, ou le copier dans un nouvel onglet du navigateur.

### Étape 4 - Vérifier que ça fonctionne

La page qui s'ouvre (l'accueil) doit afficher :
- Le nom **"Jàppale Sénégal"** en haut à gauche, et un menu
  (Accueil, Explorer la carte, Communes, Comparer, Méthode & données, Simuler un budget)
- Une carte du Sénégal où chaque point est une commune
- Un interrupteur **Santé | Éducation** au-dessus de la carte
- Une zone « Comment est servie votre commune ? » avec une recherche

**Test rapide de bon fonctionnement** : choisir **une commune au hasard**, soit
en cliquant sur l'un des boutons d'exemple sous la recherche, soit en tapant le
nom d'une commune de votre choix. Sa fiche doit s'afficher avec ses chiffres.
Pour un contrôle exact, voici quelques résultats attendus (un seul suffit) :

| Commune | Habitants | Postes recensés / nécessaires | Postes manquants |
|---|---|---|---|
| Kanel (Matam) | 15 244 | 1 / 2 | 1 |
| Saraya (Kédougou) | 4 385 | 0 / 1 | 1 |
| Mbour (Thiès) | 284 189 | 11 / 29 | 18 |
| Keur Massar Nord (Dakar) | 224 765 | 4 / 23 | 19 |

Ouvrir ensuite le menu **Explorer la carte** : la grande carte doit s'afficher.

Si ce test fonctionne, le déploiement est réussi.

### En cas de problème

**"404 - page not found" à l'étape 3**
→ Revenir à l'étape 2 et vérifier que le dossier sélectionné est bien
`/docs` et non `/ (root)`. Sauvegarder à nouveau.

**La page s'affiche mais reste blanche, ou la carte n'apparaît pas**
→ Ouvrir les outils de développement du navigateur (touche F12 ou clic
droit > Inspecter), onglet "Console", et regarder s'il y a un message
d'erreur en rouge. Envoyer ce message à l'équipe.

**Le lien GitHub Pages n'apparaît toujours pas après 5 minutes**
→ Aller dans l'onglet **Actions** du dépôt : une ligne doit indiquer que le
déploiement de la page ("pages build and deployment") est en cours ou
terminé. Si elle indique une erreur (croix rouge), cliquer dessus pour voir
le détail.

**Si rien ne fonctionne** : le message de remise indique le contact de l'équipe, qui renvoie aussitôt l'archive complète (ZIP) ou corrige la cause du blocage.

## Vérifier le déploiement en une commande

Depuis la racine du projet, avec Python 3 (aucune installation, aucune bibliothèque) :

```bash
python3 tests/verifier_deploiement.py                          # vérifie le dossier docs/ (simule une mise en ligne)
python3 tests/verifier_deploiement.py https://nom.github.io/depot/   # vérifie le site déjà en ligne
```

Résultat attendu : `... contrôles en ... s : tout est conforme, le déploiement est réussi.` Le script contrôle les sept pages,
tous les fichiers qu'elles chargent (scripts, styles, images), les liens entre pages, la présence des 553 communes et des
14 régions. En cas d'échec, il affiche la ligne en cause. Le test à la main (une commune au choix, sa fiche doit s'afficher)
reste décrit à l'étape 4 du chemin 2.

## Journal de déploiement : ce que nous avons testé

| Date | Chemin | Environnement | Résultat |
|---|---|---|---|
| 8 octobre 2026 | 4. Serveur local et `verifier_deploiement.py` | Archive neuve décompressée dans un dossier vide (0,1 s), Python 3 | 69 contrôles réussis en moins d'une seconde (la commande entière : 0,7 s) |
| 8 octobre 2026 | 1. Double-clic sur `docs/index.html` | Mêmes fichiers, pages ouvertes comme de simples fichiers dans Chromium | 10 contrôles sur 10 : six pages sans erreur, accueil (553 postes manquants, carte de 14 régions), fiche d'Oussouye (chiffre, fiche de décision, carte), téléchargement du PDF |
| **À compléter par l'équipe** | 2. GitHub Pages | Compte GitHub de l'équipe | Lien : ............ ; date : ............ ; durée : ...... minutes ; résultat de `verifier_deploiement.py` sur ce lien : ............ |

Les deux premiers tests ont été faits dans l'environnement de vérification du projet, pas sur un serveur de l'ANSD. Le
chemin 2 doit être testé et consigné par l'équipe avec le compte GitHub du projet : il n'a pas pu l'être ici.

## Mettre à jour le site

1. Remplacer les fichiers modifiés dans le dépôt : **Add file > Upload files**, glisser les fichiers (les dossiers gardent leurs chemins), **Commit changes**.
2. Attendre environ 2 minutes que GitHub Pages republie.
3. Recharger le site en forçant : Ctrl+Maj+R (Cmd+Maj+R sur Mac), sinon le navigateur garde l'ancienne version.
4. Relancer `python3 tests/verifier_deploiement.py https://nom.github.io/depot/`.

## Pourquoi aucun serveur

Le projet ne nécessite aucun serveur, aucune base de données, aucune installation : toutes les données (553 communes) sont
directement intégrées aux fichiers du site. C'est un choix délibéré pour que le déploiement soit le plus simple et le plus
fiable possible : pas de dépendance externe qui pourrait échouer le jour de l'évaluation. Si l'ANSD fournit des données plus
détaillées pour quelques régions, la chaîne de traitement (`code/`) les intègre et régénère `docs/data.js` : le déploiement
reste le même.

## Vérification facultative du contenu du dépôt

Pour contrôler que les chiffres annoncés correspondent bien aux données du dépôt (nécessite Python 3, aucune autre
installation), depuis la racine du dépôt :

```bash
python3 tests/test_chiffres_cles.py
```

Le résultat attendu est `OK` (72 tests).

Les contrôles de l'interface (nécessitent Node.js 18 ou plus récent) se lancent avec `cd tests/interface`, `npm install`
puis `npm test` ; le détail est dans `tests/interface/README.md`.
