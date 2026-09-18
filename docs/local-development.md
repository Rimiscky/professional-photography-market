# Tester le projet en local

## Installation

Node.js 22.13 minimum et pnpm 11.25.0. Aucun compte Cloudflare ni secret de production n’est nécessaire pour les services locaux.

```bash
cd ~/CascadeProjects/professional-photography-market
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm dev
```

Sur le poste préparé le 18 septembre 2026, pnpm, les dépendances et les migrations sont déjà installés. Le serveur écoute sur http://localhost:5173.

## Parcours photographe

1. Ouvrir http://localhost:5173/signin-with-chatgpt?return_to=/studio/photos pour la connexion locale de développement.
2. Le compte local est `seedy@sites.test`. Si nécessaire, compléter le profil sur `/studio/profil`. Le test automatisé a déjà créé un profil et une photographie synthétique sur ce poste.
3. Ouvrir `/studio/photos/nouvelle`, choisir un JPEG, PNG ou WebP statique d’au moins 640 × 640 pixels, de 15 Mo maximum et de 60 millions de pixels maximum, renseigner le titre et confirmer les droits.
4. Ouvrir la photographie dans `/studio/photos`, remplir les métadonnées, choisir le texte personnalisé et ses réglages, puis enregistrer.
5. Dans un second terminal, lancer le moteur local :

```bash
cd ~/CascadeProjects/professional-photography-market
pnpm images:process
```

6. Laisser l’éditeur ouvert. L’état est actualisé automatiquement et devient `READY` et l’aperçu filigrané apparaît. La publication est alors possible si les métadonnées sont complètes.
7. Pour vérifier l’accès public, ouvrir `/api/images/IDENTIFIANT/preview` dans une fenêtre privée après publication. Avant publication, cet accès nécessite la session propriétaire.

Chaque enregistrement relance la préparation et invalide les aperçus précédents. Le moteur doit donc être relancé après un changement. Pour modifier une photographie publiée, cliquer sur « Dépublier pour modifier », enregistrer les nouveaux réglages, relancer le moteur puis republier après traitement. Le bouton de publication est désactivé tant que des changements ne sont pas enregistrés.

Le mode de connexion local est une simulation réservée au développement sur localhost. Il n’exige pas de mot de passe et ne constitue pas une validation de l’authentification hébergée.

## Tests

```bash
pnpm lint
pnpm build
pnpm exec tsc --noEmit --incremental false
pnpm test
pnpm test:e2e
# Avec pnpm dev dans un autre terminal et les migrations locales appliquées :
pnpm test:import
```

`test:import` crée une image synthétique, exécute le moteur et publie cette image localement. Il conserve le résultat pour inspection, sans écraser un profil existant. Il ne contacte pas la production.

Les tests navigateur démarrent eux-mêmes le serveur sur le port 5183 et appliquent les migrations dans un dossier `.wrangler/e2e/<identifiant>` dédié. Ils ne modifient pas la base utilisée sur le port 5173. Chrome installé sur macOS est détecté automatiquement ; sur un autre poste, installer Chromium avec `pnpm exec playwright install chromium` ou définir `PLAYWRIGHT_CHROMIUM_PATH`.

## Mise à jour et maintenance

Après récupération du code, arrêter le serveur, exécuter `pnpm install --frozen-lockfile` puis `pnpm db:migrate:local`, et redémarrer avec `pnpm dev`. La migration 0003 ajoute les réservations des jobs et le compteur d’échecs, sans supprimer les données existantes.

`pnpm images:process` récupère les réservations expirées et nettoie les dérivés abandonnés de plus de quinze minutes. Après un arrêt brutal, attendre l’expiration de cinq minutes puis relancer cette commande. Après trois échecs consécutifs, vérifier la photographie et réenregistrer ses informations avant une nouvelle tentative.

## Données et arrêt

D1 et R2 sont persistés dans `.wrangler/state/v3`. Le serveur, les migrations et le moteur utilisent les mêmes identifiants locaux. Ce dossier est ignoré par Git. Les tests `pnpm test` utilisent des données éphémères indépendantes.

Arrêter le serveur avec Ctrl+C. Pour reprendre, exécuter `pnpm dev`. Les limites connues et les états IMPLEMENTED, PARTIAL, TODO et FUTURE figurent dans [Phase 3](phase-3.md).
