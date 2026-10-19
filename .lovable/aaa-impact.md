# AAA — analyse d’impact avant migration

## 1. Modération a priori

La base réelle a `is_hidden DEFAULT true` (contrairement au précédent audit), mais `publish-tribute` écrit explicitement `false` en mode gratuit. Le paiement confirmé écrit également `false`. Aucun statut éditorial distinct n’existe.

Décision : ajouter un statut éditorial indépendant (`pending`, `approved`, `rejected`), conserver les hommages historiques approuvés et forcer tout nouveau dépôt à `pending` côté serveur. L’approbation reste réservée aux rôles existants admin/moderator. Le paiement, ses tarifs, son rattachement et son traitement atomique restent inchangés.

Chemins à adapter : RLS publique ; RPC du livre d’or simple/consolidé ; statistiques publiques ; profil relationnel ; récupération/index RAGet ; écran Modération ; messages de dépôt. Un paiement ne change jamais le statut éditorial. Les modifications de contenu par l’auteur remettent le texte en attente. Les anciennes écritures ne peuvent contourner le contrôle.

Recette : nouveaux dépôts pending même si approved fourni, édition non habilitée refusée, paiement indépendant, validation habilitée, exclusion publique avant approbation, historique préservé. Aucun paiement réel ni fusion.