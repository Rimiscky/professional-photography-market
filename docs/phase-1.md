# Phase 1 — fondations

## Réalisé

- configuration de marque et règles commerciales centralisées ;
- schéma initial de 15 tables : comptes, rôles, profils, images, actifs, licences, commandes, événements de paiement, droits de téléchargement et audit ;
- première migration Drizzle versionnée ;
- permissions RBAC et vérification de propriété côté serveur ;
- calcul de commission en unités monétaires mineures ;
- inscription orientée client ou photographe ;
- onboarding photographe en cinq étapes ;
- route onboarding protégée par authentification serveur.

## Décision d’infrastructure

La version Sites utilise D1 pour la démonstration hébergée. La cible commerciale reste PostgreSQL avec stockage S3-compatible. Le domaine et les règles métier restent indépendants de l’adaptateur de persistance.

## Limites connues

Le formulaire d’onboarding est interactif mais n’écrit pas encore dans la base. Stripe Connect est une étape future, sans collecte de coordonnées bancaires. Aucun achat, reversement ou original n’est présenté comme réellement livré.

## Critères de sortie

- compilation réussie ;
- migration générée et inspectable ;
- routes publiques et protégées distinctes ;
- aucune clé secrète dans le dépôt ;
- état implémenté/mocké documenté ;
- commits séparés par responsabilité.
