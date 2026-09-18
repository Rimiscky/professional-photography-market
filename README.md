# Objectif : Marketplace de photographies professionnelles

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
- édition protégée des métadonnées, du copyright et du filigrane ;
- règles de transition et garde-fous serveur avant publication ;
- authentification déléguée au fournisseur sécurisé de la plateforme ;
- schéma relationnel initial et migration ;
- RBAC serveur et règles métier centralisées ;
- documentation d’architecture.

### Démonstration uniquement

- photos du catalogue, favoris en mémoire ;
- ventes, statistiques et montants du studio ;
- saisie de l’onboarding.

### Non implémenté

- consommation automatique des jobs sur l’hébergement de production ;
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
pnpm db:migrate:local
pnpm dev
```

Le moteur local se lance dans un second terminal avec `pnpm images:process`. Guide complet : [Tester en local](docs/local-development.md).

## Phase 3 : état vérifié localement

| État | Périmètre |
| --- | --- |
| IMPLEMENTED | Filigrane textuel personnalisé, quatre aperçus WebP protégés, original privé, traitement D1/R2 local, transitions et publication atomiques, affichage des aperçus |
| IMPLEMENTED | Reprise après interruption, nettoyage des dérivés, import VP8/VP8L/VP8X, suivi automatique et dépublication |
| IMPLEMENTED | Tests métier, HTTP et navigateur desktop/mobile ; intégrité de l’original et contrôles d’accès |
| PARTIAL | Moteur lancé manuellement ; catalogue public de démonstration ; confidentialité de l’infrastructure distante non vérifiée |
| TODO | Catalogue réel, quotas et limitation de débit ; consommateur et planification de production |
| FUTURE | Logo graphique, TIFF, paiements et livraison autorisée des originaux |

Ces résultats ne constituent pas une validation du déploiement de production. Détails et limites : [Phase 3](docs/phase-3.md).

## Vérifications

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
# Serveur local démarré :
pnpm test:import
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
