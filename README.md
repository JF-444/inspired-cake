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

## Espace gestion (calendrier des commandes et avis)
Ouvrir le site avec `#gestion` à la fin de l'adresse et taper la clé `ADMIN_KEY` (variable d'environnement Netlify).
- Chaque demande envoyée sur WhatsApp depuis le formulaire est aussi enregistrée comme « Demande » dans le calendrier.
- Confirmer, refuser, marquer terminée, ou ajouter une commande à la main (Instagram, téléphone…).
- Onglet Avis : supprimer un avis laissé depuis le site.
- Onglet Visites : visites par jour (30 derniers jours) et pages les plus vues, sans cookie.
- Onglet Abonnés : les inscrits à la newsletter (copier les adresses pour un envoi en Cci, ou télécharger en CSV).

Fonctions Netlify (stockage Netlify Blobs) :
- `netlify/functions/orders.mjs` : `/api/orders`
- `netlify/functions/photo.mjs` : `/api/photo` (photos d'inspiration des clients)
- `netlify/functions/reviews.mjs` : `/api/reviews`
- `netlify/functions/visit.mjs` : `/api/visit` (compteur de visites par jour)
- `netlify/functions/contacts.mjs` : `/api/contacts` (inscriptions newsletter, avec consentement)

## Commandes
Le bouton WhatsApp ouvre directement la conversation, message déjà rempli (le numéro n'est pas affiché sur la page).

## Noël
Page `#noel` : bûche, Cake de l'Avent, cupcakes de Noël. Remise fixée au 24 décembre, réservations jusqu'au 21 décembre
(constante `NOEL` dans `index.html`). Après le 24 décembre, les liens de Noël disparaissent tout seuls.

## Frais de livraison automatiques
L'adresse est recherchée avec le service public de géocodage (data.geopf.fr / IGN). La distance depuis Chanteloup-les-Vignes
(depuis le 1 rue d’Andrésy, géolocalisé au premier calcul) est estimée (vol d’oiseau × 1,3) puis convertie en zone : 5 / 10 / 15 km, au-delà point de rendez-vous.
