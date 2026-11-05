# Inspired Cake

Site vitrine de la pâtisserie Inspired Cake (Instagram : @inspiredcake).

Site statique : `index.html`, images dans `img/`, vidéos dans `video/`. Aucune compilation nécessaire.

## Déployer sur Netlify
1. Netlify → Add new site → Import an existing project → GitHub → ce dépôt.
2. Build command : vide. Publish directory : `.`
3. Deploy.

## Modifier les réalisations
Les réalisations, avis et tarifs sont en haut du `<script>` de `index.html` (tableaux `WORKS`, `REVIEWS`, `SIZES`, `FLAV`).
Pour ajouter une photo : la déposer dans `img/` puis ajouter une ligne dans `WORKS`.

## Avis clients
Les avis laissés sur le site sont enregistrés par la fonction `netlify/functions/reviews.mjs` (stockage Netlify Blobs), sans base de données à installer.

Pour pouvoir supprimer un avis :
1. Netlify → Site configuration → Environment variables → ajouter `ADMIN_KEY` avec un mot de passe de votre choix, puis redéployer.
2. Ouvrir le site avec `#gestion` à la fin de l'adresse, taper la clé : un bouton « Supprimer » apparaît sur chaque avis publié depuis le site.

## Commandes
Le bouton WhatsApp ouvre directement la conversation, message déjà rempli (le numéro n'est pas affiché sur la page). Le numéro est dans `index.html` (constante `WA` et liens `wa.me`).
