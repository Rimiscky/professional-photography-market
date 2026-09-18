# Phase 3 : import et traitement des photographies

Validation locale mise à jour le 18 septembre 2026 sur macOS, Node 26.5.0 et pnpm 11.25.0. D1 et R2 ont été testés localement. Le déploiement et l’authentification de production ne sont pas validés.

## IMPLEMENTED : vérifié localement

### Import et confidentialité

- Import HTTP authentifié, propriétaire résolu côté serveur et confirmation des droits.
- Vérification du MIME, de l’extension, de la signature, du poids et des dimensions. JPEG, PNG et WebP statiques VP8, VP8L et VP8X sont reconnus. Les tailles RIFF, les limites des blocs et la cohérence des dimensions WebP sont contrôlées ; les animations sont refusées.
- Maximum 15 Mo, minimum 640 × 640 pixels, maximum 60 millions de pixels.
- Original conservé privé dans R2, sans route de téléchargement public et sans clé objet exposée au navigateur. Le test HTTP compare son SHA-256 avant et après traitement.

### Filigranes et aperçus

- Texte plateforme ou personnalisé obligatoire, normalisation Unicode, au moins une lettre ou un chiffre visible et échappement XML. Les caractères invisibles seuls sont refusés, y compris dans le nom de plateforme.
- Six positions dont répétition, opacité de 15 à 80 %, taille de 15 à 60 %. Un ancien réglage `NONE` échoue de manière fermée et doit être réenregistré.
- Décodage et orientation par Sharp, suppression des métadonnées, quatre variantes WebP filigranées limitées à 400, 800, 1200 et 1800 pixels sur le grand côté. L’original reste intact.
- `GET /api/images/{id}/preview` ne sélectionne que le dérivé protégé. Accès propriétaire avant publication, accès public après publication, retour à un accès propriétaire après dépublication. Aucun paramètre de clé objet n’est accepté.
- Réponse `image/webp`, `nosniff`, `private, no-store` ; vérification de la clé dérivée, de la taille et des métadonnées de protection R2.

### Traitements et reprise

- Prise atomique du job avec réservation de cinq minutes. Une réservation expirée est reprise au prochain passage du consommateur. Un ancien consommateur ne peut pas finaliser à la place de son remplaçant.
- Passage `PROCESSING -> READY` après écriture des quatre objets et enregistrement transactionnel des actifs et du succès du job.
- Réconciliation après perte d’accusé de réception D1 : les objets d’une transaction réussie sont conservés. Si le résultat n’est pas connu, le moteur ne supprime pas les objets sans vérification.
- Erreur de décodage ou de stockage : `ERROR/FAILED`, diagnostic interne masqué et suppression tentée des objets non référencés de la tentative.
- Réessai propriétaire jusqu’à trois échecs consécutifs. Les expirations sont remises en file automatiquement jusqu’à cette limite. Succès et nouvel enregistrement remettent à zéro ce compteur ; le numéro de tentative reste monotone pour éviter de réutiliser une clé objet.
- Nettoyage des dérivés non référencés de plus de quinze minutes. Les originaux, actifs référencés, objets récents et objets d’une image en traitement sont préservés. Les échecs de nettoyage restent visibles et peuvent être retentés au lancement suivant.
- Sous-processus de rendu arrêté après 120 secondes, tas JavaScript limité à 256 Mo, cache Sharp de 32 Mo, un thread libvips et traitements séquentiels par consommateur. Ces réglages ne sont pas un plafond global de mémoire native de la machine.

### Édition et publication

- Modification réservée au propriétaire, bloquée pendant un job `RUNNING` ou une publication. Chaque enregistrement invalide les anciens actifs, repasse à `PROCESSING` et remet le traitement en file, y compris pour un changement de titre.
- Publication atomique : propriétaire, état autorisé, métadonnées obligatoires, droits confirmés, original privé, job réussi et actif `WATERMARKED` WebP requis. Un actif `LARGE` seul ne suffit pas. Audit uniquement si l’action réussit.
- Dépublication atomique et audit : l’aperçu public devient inaccessible aux nouvelles requêtes, puis les métadonnées et le filigrane peuvent être modifiés. Une copie déjà téléchargée par un visiteur ne peut pas être rappelée.
- Studio : suivi automatique toutes les trois secondes quand l’onglet est visible, aperçu actualisé après traitement, liste des images actualisée, publication bloquée si des changements ne sont pas enregistrés. Le formulaire attend son hydratation pour éviter de perdre une sélection de fichier précoce.
- `GET /api/images/{id}` expose uniquement l’état au propriétaire, sans clés objets ni diagnostics internes.

## PARTIAL

- Le moteur fonctionne localement via `pnpm images:process`, jusqu’à 50 jobs par invocation. Il doit encore être lancé manuellement et ne consomme pas les données distantes.
- Confidentialité vérifiée dans les routes et le stockage local. Configuration du bucket hébergé, domaines publics et passerelle d’authentification à vérifier avant production.
- Catalogue public de démonstration : les images publiées en base n’alimentent pas encore ses pages statiques.
- Tests navigateur sur Chrome desktop et émulation Pixel 7, pas sur Safari, Firefox ou appareils mobiles physiques.

## TODO

- Brancher les images publiées au catalogue public réel.
- Ajouter les quotas de stockage et la limitation de débit pour une exploitation multi-utilisateur.
- Déployer et planifier le consommateur avec des adaptateurs distants, vérifier les accès et mesurer les performances en conditions réelles.
- Superviser les erreurs de maintenance et dimensionner les processus de production.

## FUTURE

- Logo graphique personnalisé, TIFF et variantes supplémentaires.
- Paiements, facturation et livraison autorisée des originaux après achat.

## Vérifications exécutées

- `pnpm lint` : zéro erreur, six avertissements préexistants sur des balises `img` hors du module images.
- `pnpm build` et `pnpm exec tsc --noEmit --incremental false` : succès.
- `pnpm test` : quatorze tests métier et d’intégration, dont les deux régressions de la revue, la concurrence, les expirations, le nettoyage, le délai du rendu, les trois variantes WebP et la dépublication.
- `pnpm test:e2e` : deux parcours réussis, desktop et mobile émulé. Import WebP VP8L, filigrane, état et aperçu mis à jour sans rechargement, blocage des modifications non enregistrées, publication, dépublication et régénération. Pas d’erreur JavaScript de page ni de débordement horizontal dans l’éditeur et la liste.
- `pnpm test:import` : parcours HTTP JPEG vérifié lors de la première livraison ; contrôle SHA-256, retrait EXIF et refus d’accès direct à l’original. Les ajouts ultérieurs sont couverts par les tests métier et navigateur ci-dessus.

Les tests métier utilisent des données éphémères. Chaque exécution navigateur possède son dossier `.wrangler/e2e/<identifiant>` séparé. Le test HTTP manuel conserve une photographie synthétique dans le studio normal pour inspection.

Migration additive requise : `0003_tan_onslaught.sql`, via `pnpm db:migrate:local`.

[Guide local](local-development.md) et [spécification du conteneur WebP](https://developers.google.com/speed/webp/docs/riff_container).
