# Correctif : « Non Autorisé » sur le moteur RAG Maillage social

## Cause confirmée

La page BackOffice > Intelligence Sociale envoie la **clé publique anonyme** comme jeton d'identité au moteur de recherche, au lieu du jeton de session de l'administrateur connecté (`src/pages/admin/SocialIntelligence.tsx`, ligne 36 : `Authorization: Bearer <clé publiable>`).

Côté serveur, la fonction `social-search` valide ce jeton comme un utilisateur réel, ne trouve aucun utilisateur, et renvoie **401 « Non autorisé »**. C'est pourquoi *toutes* les questions échouent, prédéfinies comme saisies — ce n'est pas un problème de contenu de question ni de rôle admin.

La palette de recherche rapide (`SocialSearchPalette.tsx`) fait déjà les choses correctement : elle récupère la session fraîche et envoie `access_token` + `apikey`. C'est ce modèle à répliquer.

## Correctif

1. Dans `SocialIntelligence.tsx`, remplacer l'en-tête d'autorisation par le jeton de session réel :
   - récupérer la session avant l'appel ;
   - si aucune session, afficher un message clair invitant à se reconnecter au lieu d'un « Non autorisé » opaque ;
   - envoyer `Authorization: Bearer <access_token>` **et** l'en-tête `apikey`.
2. Améliorer le message d'erreur affiché : distinguer session expirée (401), rôle insuffisant (403) et erreur moteur (5xx), afin qu'un futur incident soit lisible sans ouvrir la console.
3. Nettoyer les logs de debug résiduels (`--- HEADERS TEST ---`, `[RAG Hard-Coded]`) dans la palette, conformément à l'exigence de console propre.

## Vérification

Test en navigateur avec la session administrateur : lancer la question prédéfinie « Qui sont les personnes les plus impliquées émotionnellement ? » puis « Quel lien entre Michel et Diallo ? », et confirmer que la réponse se diffuse en flux (statut 200) sans erreur console.

## Détails techniques

- Aucun changement de base de données, de politique RLS ou de logique serveur : la fonction `social-search` valide correctement le JWT et le rôle `admin`/`moderator` via `user_roles`.
- Modifications limitées à `src/pages/admin/SocialIntelligence.tsx` et `src/components/admin/SocialSearchPalette.tsx` (logs).
