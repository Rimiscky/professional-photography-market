# Phase 3 — import et stockage des images

## Implémenté

- page d’import photographe protégée ;
- aperçu local avant envoi ;
- validation côté serveur du MIME déclaré, de l’extension et de la signature réelle ;
- lecture sécurisée des dimensions JPEG, PNG et WebP VP8X ;
- limites de taille et de dimensions ;
- confirmation obligatoire des droits ;
- vérification de l’identité et du profil propriétaire ;
- clé de stockage contrôlée, indépendante du nom original ;
- original stocké dans le bucket privé ;
- métadonnées relationnelles, orientation et statut `PROCESSING` ;
- file persistante de traitements avec possibilité de nouvelle tentative ;
- nettoyage du fichier objet si l’écriture en base échoue ;
- tableau de suivi des images du photographe ;
- éditeur propriétaire des métadonnées publiques, du copyright et du texte alternatif ;
- configuration du filigrane d’aperçu sans modification de l’original ;
- transitions de statut centralisées et contrôlées ;
- publication refusée sans métadonnées obligatoires ni dérivé protégé ;
- journal d’audit lors de la publication.

## Invariant de sécurité

L’API ne reçoit jamais l’identifiant du photographe depuis le navigateur. Elle le résout depuis l’utilisateur authentifié. L’objet original utilise une clé `originals/{photographerId}/{imageId}/original.ext` et n’est relié par aucune URL publique.

La modification et la publication chargent toujours l’image avec son propriétaire en base. Un photographe ne peut donc ni modifier ni publier l’image d’un autre compte. Les coordonnées GPS et autres EXIF sensibles ne sont pas acceptés dans les métadonnées publiques.

## Partiellement implémenté

Le pipeline est créé jusqu’à la mise en file du traitement. Les jobs ne produisent pas encore les miniatures, aperçus WebP, filigranes ou métadonnées EXIF nettoyées. Les images restent donc en `PROCESSING` et ne peuvent pas être publiées. L’éditeur est opérationnel, mais son action de publication reste désactivée jusqu’au statut `READY`. Cette limite est affichée dans l’interface et n’est pas masquée comme une fonctionnalité terminée.

## Suite de la phase 3

Le moteur de traitement devra consommer un job, décoder l’original hors mémoire du Worker si nécessaire, retirer le GPS public, générer les variantes, écrire les actifs dérivés, puis passer l’image à `READY`. Une erreur devra passer le job et l’image à `FAILED/ERROR` sans exposer le diagnostic interne au client.
