# Objectif — Marketplace de photographies professionnelles

Nom provisoire et configurable pour une marketplace française permettant aux photographes de publier et licencier leurs images, et aux clients d’acheter puis télécharger les originaux de façon autorisée.

## État du produit

### Implémenté

- accueil, exploration et fiche image responsive ;
- sélection visuelle d’une licence ;
- tableau de bord studio de démonstration ;
- inscription et onboarding photographe en cinq étapes ;
- vitrine publique et édition persistante du profil photographe ;
- import authentifié et stockage privé des originaux ;
- validation de signature, format, taille, dimensions et propriété ;
- suivi des images et file persistante de traitements ;
- authentification déléguée au fournisseur sécurisé de la plateforme ;
- schéma relationnel initial et migration ;
- RBAC serveur et règles métier centralisées ;
- documentation d’architecture.

### Démonstration uniquement

- photos du catalogue, favoris en mémoire ;
- ventes, statistiques et montants du studio ;
- saisie de l’onboarding.

### Non implémenté

- upload et traitement d’images ;
- panier persistant et paiements Stripe ;
- webhooks, reversements et remboursements ;
- téléchargement d’originaux, factures et administration.

## Architecture

Le projet suit un monolithe modulaire Next.js/TypeScript. La version hébergée utilise Drizzle et D1 ; les fichiers seront placés dans un stockage objet privé. Le modèle reste séparé des adaptateurs pour permettre une migration vers PostgreSQL/S3 sur une infrastructure commerciale autonome.

Les contrôles de rôle, de propriété et de montant sont réalisés côté serveur. Les originaux ne seront jamais exposés par une URL publique permanente.

## Démarrage local

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm dev
```

## Vérifications

```bash
pnpm build
pnpm lint
```

## Structure

- `app/` : pages et routes ;
- `components/` : interface ;
- `db/` et `drizzle/` : schéma et migrations ;
- `modules/` : règles métier et autorisations ;
- `lib/` : configuration partagée ;
- `docs/` : décisions d’architecture.

Les textes de licence, taxes, factures et pages légales devront être validés avant une mise en production commerciale. Ne jamais commiter de secret, document légal privé, pièce d’identité ou photographie originale.

Voir [`docs/phase-0.md`](docs/phase-0.md), [`docs/phase-1.md`](docs/phase-1.md), [`docs/phase-2.md`](docs/phase-2.md) et [`docs/phase-3.md`](docs/phase-3.md).
