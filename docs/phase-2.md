# Phase 2 — système photographe

## Implémenté

- vitrine publique responsive `/photographes/[username]` ;
- couverture, identité, badge, spécialités, portfolio et présentation ;
- accès à la gestion du profil depuis le studio ;
- page protégée `/studio/profil` ;
- validation serveur Zod du nom, identifiant, biographie, localisation et site web ;
- création ou mise à jour du compte et du profil en base ;
- contrôle de l’identité côté serveur avant toute écriture ;
- messages d’erreur français sans détail d’infrastructure.

## Sécurité

Le navigateur ne transmet jamais l’identifiant du propriétaire. L’API récupère l’utilisateur authentifié côté serveur et utilise son identifiant stable pour chercher ou créer le profil. L’e-mail et les données privées ne sont pas rendus dans la vitrine publique.

## État des données

La sauvegarde du profil est réellement branchée à la base D1 de la version hébergée. Les photographies affichées sur la vitrine restent des données de démonstration jusqu’à la phase 3 consacrée au pipeline d’images.

## Prochaine phase

La phase 3 ajoutera l’import privé, la validation des fichiers, les statuts de traitement, les métadonnées, les variantes protégées, le filigrane et la publication.
