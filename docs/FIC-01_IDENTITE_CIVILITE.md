# FIC-01 — Identité et civilité déclarée

## Source et droits

- Valeurs canoniques : `M.` ; `Mme` ; `Mlle`.
- `profiles.civility` est nullable et protégée par CHECK ; lecture/modification par titulaire via RLS existante, lecture administrateur existante.
- Aucun changement d'identité ni reprise des données historiques. La vue publique ne contient pas la civilité.
- Les profils créés après migration portent `civility_required=true`, fixé à l'insertion et non désactivable à la mise à jour. Leur validation `profile_completed=true` exige la civilité ; le profil provisoire créé par le lien magique reste possible.
- Les profils historiques gardent `civility_required=false` et leur état de validation. Au retour sur `/compte` après connexion, une demande non bloquante s'affiche si la civilité manque ; mémoriaux, services et hommages antérieurs ne sont pas invalidés.
- Le titulaire choisit/modifie la civilité dans son profil. Aucune inférence depuis prénom, genre, parenté ou texte d'hommage.

## RIBENGA principal — Back-Office et palette

- Seulement pour une question ISP/sympathie/influence : hommes = `M.` ; femmes = `Mme` ou `Mlle`.
- Classement : filtre avant maximum déterministe, égalités conservées, sans exiger ISP > 1. Formule dynamique, cercles, gestes et T général inchangés.
- Une requête ambiguë hommes/femmes ne désigne pas de gagnant. Civilité manquante/invalide, plusieurs profils pour un compte, anonymat ou identité ambiguë : exclus du classement filtré, avec limites.
- Lecture serveur après validation admin/modérateur : uniquement `user_id,civility`, pour les comptes d'hommages visibles sur mémoriaux autorisés. Ni profil complet ni email transmis à l'IA. UUID de compte jamais transmis. La civilité individuelle reste serveur ; seuls groupe, faits autorisés et synthèse calculée sont transmis.
- Restitution filtrée remplacée par la réponse déterministe du serveur au moment de publier le contrat streamé ; pas de gagnant inventé par l'IA. ISP non filtré et questions de parenté inchangés.

## Vérification et exploitation

Migration additive `0046_fic01_profile_civility.sql`, types régénérés automatiquement. Contrôle modèle/documentation via `fic01Civility.test.ts` et CI ISP. Tests de migration/RLS sur base isolée uniquement, jamais de fixtures dans la base partagée.

Le site publié n'est pas automatiquement mis à jour par le déploiement Edge : le champ de profil nécessite la publication de cette version frontend. Ne publier qu'après vérification de la portée des autres changements déjà présents dans le projet.