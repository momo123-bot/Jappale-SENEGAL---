# L'assistant avec IA locale - Jàppale Sénégal

**En bref :** l'assistant « Poser une question » répond toujours à partir des données du site. Sur un ordinateur où Ollama est installé, un modèle d'IA local rédige la réponse, et chaque chiffre et chaque lieu sont contrôlés avant affichage. Ce n'est pas un modèle entraîné sur nos données : c'est un modèle existant (phi4-mini), à qui l'on donne nos faits à chaque question.

## Les deux modes

| Où | Comment l'assistant répond |
|---|---|
| Site en ligne, téléphone, ou ordinateur sans Ollama | Par calcul (moteur à règles, `docs/assistant.js`) : immédiat, sans connexion. |
| Ordinateur avec Ollama, site ouvert par http://localhost | Le modèle phi4-mini rédige la réponse à partir des faits fournis (`docs/assistant-llm.js`). |

## L'installer (une seule fois, 2,5 Go)

```bash
ollama pull phi4-mini
python3 -m http.server 8000 --directory docs
```

Ouvrir http://localhost:8000, cliquer sur « Poser une question » : l'en-tête doit afficher « IA locale : phi4-mini ». Ouvert par double-clic (`file://`), le site n'utilise pas l'IA.

## Comment l'IA est encadrée

À chaque question, la page donne au modèle la fiche du lieu cité et la réponse calculée. Avant affichage, trois contrôles : chaque nombre doit figurer dans ces faits, avec le même équipement et le même état ; le lieu nommé doit être celui de la réponse calculée. Sinon, la réponse calculée s'affiche, avec la raison. Sous chaque réponse de l'IA, « Voir la réponse calculée par la plateforme » permet de comparer.

## Ses limites

Un petit modèle peut mal relier un vrai chiffre à un mot, ce que les contrôles ne voient pas toujours. Sans carte graphique, une réponse prend de 30 secondes à plusieurs minutes : le bouton « Réponse immédiate sans IA » donne la réponse calculée tout de suite.

## Réglages et tests

- Désactiver : `?ia=non` dans l'adresse. Depuis le site en ligne : `?ia=oui`, après avoir autorisé l'adresse du site dans Ollama (`OLLAMA_ORIGINS`).
- Contrôles automatiques, sans Ollama (faux serveur) : `cd tests/interface`, `npm run test:ia`.
- Banc d'essai avec le vrai modèle : `node tests/ia/evaluer_assistant_ia.js` (à relire à la main).
