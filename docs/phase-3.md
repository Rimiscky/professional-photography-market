# Phase 3 : import et traitement des photographies

Validation locale réalisée le 17 septembre 2026 sur macOS, Node 26.5.0 et pnpm 11.25.0. Les garanties ci-dessous ont été testées avec D1 et R2 locaux. Aucune validation de l’hébergement de production n’a été effectuée.

## IMPLEMENTED : vérifié localement

- Import HTTP authentifié, profil propriétaire résolu côté serveur et confirmation des droits.
- Validation du MIME, de l’extension, de la signature, du poids et des dimensions avant stockage. JPEG, PNG et WebP VP8, VP8L et VP8X statiques sont reconnus. Les tailles RIFF, les limites des blocs et la cohérence des dimensions sont vérifiées.
- Original conservé dans R2 avec `is_private=1`, clé générée côté serveur, sans route de téléchargement public. Le test HTTP compare son SHA-256 avant et après traitement.
- Filigrane plateforme ou texte personnalisé obligatoire, texte XML échappé, six positions dont répétition, opacité de 15 à 80 %, taille de 15 à 60 %. Un ancien réglage `NONE` provoque un échec fermé du traitement et doit être réenregistré dans l’éditeur.
- Moteur Node/Sharp séparé du Worker : décodage, orientation automatique, suppression des métadonnées et quatre variantes WebP filigranées, limitées à 400, 800, 1200 et 1800 pixels sur le grand côté. L’original reste intact.
- Prise atomique d’un job `PENDING` par un seul consommateur. Les métadonnées ne peuvent pas changer pendant `RUNNING`.
- Passage `PROCESSING -> READY` après écriture et vérification de taille des quatre objets, puis enregistrement transactionnel des actifs et du succès du job.
- En cas d’erreur de décodage ou de stockage : `ERROR/FAILED`, suppression tentée des objets de la tentative, aucun passage à `READY`. Diagnostic interne non retourné au navigateur.
- Réessai propriétaire d’un job échoué, limité à trois échecs consécutifs via l’action `retry`. Un nouvel enregistrement des métadonnées crée une nouvelle demande de traitement.
- Enregistrement des métadonnées et du filigrane : invalidation immédiate des anciens actifs en base, retour à `PROCESSING` et remise en file atomiques. Même une modification de titre déclenche actuellement une régénération.
- Publication conditionnelle et atomique : propriétaire, état autorisé, métadonnées obligatoires, confirmation des droits, original privé, job réussi et actif `WATERMARKED` WebP requis. Un actif `LARGE` seul ne suffit pas. Journal d’audit créé uniquement si la publication réussit.
- `GET /api/images/{id}/preview` sélectionne uniquement le dérivé protégé. Aperçu réservé au propriétaire avant publication, accessible sans session après publication. Aucun paramètre de clé objet n’est accepté. Réponse `image/webp`, `nosniff`, `private, no-store`.
- L’éditeur affiche l’aperçu, l’état courant après une action, les réglages, les erreurs réseau et un bouton de réessai. La liste et l’éditeur doivent être actualisés après traitement.

## PARTIAL

- Le moteur consomme réellement la file locale via `pnpm images:process`, jusqu’à 50 jobs par invocation. Il ne tourne pas automatiquement et ne traite pas les données distantes.
- La confidentialité est vérifiée au niveau des routes et du stockage local. La configuration réelle du bucket hébergé, de ses domaines publics et de la passerelle d’authentification reste à vérifier avant production.
- Le catalogue public reste une démonstration : la publication en base ne remplace pas encore ses données statiques.
- Les tests HTTP utilisent la connexion locale de développement. L’authentification de production n’a pas été testée.

## TODO

- Déployer un consommateur Node avec adaptateurs D1/R2 distants et planification, puis vérifier le parcours sur l’hébergement réel.
- Mesurer les performances et dimensionner les processus pour la charge de production.
- Superviser les erreurs de maintenance et les limites de stockage sur l’infrastructure distante.
- Compléter les quotas, la limitation de débit et le contrôle des ressources du moteur pour une exploitation multi-utilisateur.
- Alimenter le catalogue public depuis les images publiées et tester les parcours navigateur desktop/mobile de manière automatisée.

## FUTURE

- Logo graphique personnalisé, TIFF, variantes additionnelles et traitements avancés.
- Livraison autorisée des originaux après achat, paiements et facturation.

## Vérifications exécutées

- `pnpm lint` : succès, zéro erreur, six avertissements préexistants concernant les balises `img` hors du module images.
- `pnpm build` : succès Vinext/Vite.
- `pnpm exec tsc --noEmit --incremental false` : succès.
- `pnpm test` : dix tests regroupant les scénarios de rendu, formats invalides, échappement XML, positions, retrait EXIF, conservation de l’original, concurrence, isolation propriétaire, verrouillage, publication, régénération, échec du décodeur, échec de stockage et reprise.
- `pnpm test:import` : parcours HTTP réel sur localhost, création du profil si absent, import JPEG synthétique, refus sans session, publication prématurée refusée, configuration du filigrane, traitement via le script Node, aperçu WebP sans EXIF, original vérifié par SHA-256, accès direct à l’original refusé, publication et aperçu public.

Le test HTTP conserve une photographie synthétique dans le studio pour inspection. Les tests unitaires et D1/R2 utilisent un stockage éphémère séparé.

Voir [le guide local](local-development.md).

## Corrections après revue

IMPLEMENTED et vérifié : refus des filigranes sans lettre ou chiffre visible, normalisation Unicode, et réconciliation après perte d’accusé de réception D1. Un job déjà validé conserve ses objets R2. Si le résultat reste inconnu, le moteur conserve les objets pour réconciliation ultérieure.

Validation : six tests réussis, lint sans erreur, build et vérification TypeScript réussis.

## Fiabilité du moteur

IMPLEMENTED et testé localement : réservation de cinq minutes, récupération des réservations expirées à chaque lancement, protection contre un ancien consommateur qui termine après son remplaçant, arrêt des reprises automatiques après trois expirations consécutives. Le compteur des tentatives reste monotone pour garantir des clés objets distinctes ; les échecs consécutifs sont réinitialisés après succès ou nouvel enregistrement.

La commande `pnpm images:process` nettoie les objets dérivés non référencés de plus de quinze minutes. Les originaux, objets récents, actifs référencés et objets associés à un traitement en cours sont préservés. Une erreur de nettoyage reste visible et pourra être retentée au prochain lancement.

Le rendu est isolé dans un sous-processus arrêté après 120 secondes. Les images sont limitées à 60 millions de pixels, le cache Sharp à 32 Mo et le tas JavaScript à 256 Mo, avec un seul thread libvips et des jobs traités séquentiellement par consommateur. Ces réglages ne constituent pas un plafond global de mémoire native pour la machine.

Migration requise : `0003_tan_onslaught.sql`, appliquée par `pnpm db:migrate:local`. Validation : dix tests réussis, lint, build et TypeScript réussis.

## Import WebP

IMPLEMENTED : imports VP8 avec pertes, VP8L sans pertes et VP8X étendus. Treize tests réussis couvrent aussi les fichiers tronqués, tailles de blocs invalides, dimensions incohérentes, mauvais MIME et animations refusées. Les trois variantes réelles sont produites par Sharp puis décodées et transformées par le pipeline. Lint, build et TypeScript réussis.

Référence du format : [spécification du conteneur WebP](https://developers.google.com/speed/webp/docs/riff_container).
