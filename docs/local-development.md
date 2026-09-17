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

Sur le poste préparé le 17 septembre 2026, pnpm, les dépendances et les migrations sont déjà installés. Le serveur écoute sur http://localhost:5173.

## Parcours photographe

1. Ouvrir http://localhost:5173/signin-with-chatgpt?return_to=/studio/photos pour la connexion locale de développement.
2. Le compte local est `seedy@sites.test`. Si nécessaire, compléter le profil sur `/studio/profil`. Le test automatisé a déjà créé un profil et une photographie synthétique sur ce poste.
3. Ouvrir `/studio/photos/nouvelle`, choisir un JPEG ou PNG d’au moins 640 × 640 pixels et de 15 Mo maximum, renseigner le titre et confirmer les droits.
4. Ouvrir la photographie dans `/studio/photos`, remplir les métadonnées, choisir le texte personnalisé et ses réglages, puis enregistrer.
5. Dans un second terminal, lancer le moteur local :

```bash
cd ~/CascadeProjects/professional-photography-market
pnpm images:process
```

6. Actualiser l’éditeur. L’état devient `READY` et l’aperçu filigrané apparaît. La publication est alors possible si les métadonnées sont complètes.
7. Pour vérifier l’accès public, ouvrir `/api/images/IDENTIFIANT/preview` dans une fenêtre privée après publication. Avant publication, cet accès nécessite la session propriétaire.

Chaque enregistrement relance la préparation et invalide les aperçus précédents. Le moteur doit donc être relancé après un changement. Une photographie publiée ne peut plus être modifiée dans l’éditeur actuel. Pour essayer plusieurs filigranes, le faire avant publication ou importer une nouvelle photographie.

Le mode de connexion local est une simulation réservée au développement sur localhost. Il n’exige pas de mot de passe et ne constitue pas une validation de l’authentification hébergée.

## Tests

```bash
pnpm lint
pnpm build
pnpm exec tsc --noEmit --incremental false
pnpm test
# Avec pnpm dev dans un autre terminal et les migrations locales appliquées :
pnpm test:import
```

`test:import` crée une image synthétique, exécute le moteur et publie cette image localement. Il conserve le résultat pour inspection, sans écraser un profil existant. Il ne contacte pas la production.

## Données et arrêt

D1 et R2 sont persistés dans `.wrangler/state/v3`. Le serveur, les migrations et le moteur utilisent les mêmes identifiants locaux. Ce dossier est ignoré par Git. Les tests `pnpm test` utilisent des données éphémères indépendantes.

Arrêter le serveur avec Ctrl+C. Pour reprendre, exécuter `pnpm dev`. Les limites connues et les états IMPLEMENTED, PARTIAL, TODO et FUTURE figurent dans [Phase 3](phase-3.md).
