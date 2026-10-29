# FIC-01 — Identité et civilité déclarée

## Source et droits

- Valeurs canoniques : `M.` ; `Mme` ; `Mlle`.
- `profiles.civility` est nullable et protégée par CHECK ; lecture/modification par titulaire via RLS existante, lecture administrateur existante.
- Aucun changement d'identité ni reprise des données historiques. La vue publique ne contient pas la civilité.
- Les comptes inscrits depuis la migration 0046 portent `civility_required=true`, fixé à l'insertion du profil et non désactivable à la mise à jour. Leur validation `profile_completed=true` exige la civilité ; le profil provisoire créé par le lien magique reste possible.
- Correctif 0047 : un compte historique sans profil est reconnu uniquement par sa date canonique `auth.users.created_at`, antérieure au 29 octobre 2026 à 09:07:02.352 UTC (migration 0046). Son profil créé tardivement reste exempt de civilité obligatoire ; un compte inconnu ou inscrit à partir de cette borne reste soumis à l'obligation. Aucun profil existant n'est modifié. Tests SQL transactionnels sur base jetable, incluant borne exacte, tentative de désactivation et isolation titulaire.
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

### État vérifié le 29 octobre 2026

- Migration 0046 réellement appliquée ; CHECK, trigger, droits propriétaire et absence de civilité dans la vue publique contrôlés en lecture seule.
- 62 tests Vitest et 5 simulations du véritable point d'entrée Edge réussis. Les doubles Edge sont exécutés sans contrôle types ; le véritable point d'entrée est contrôlé séparément par Deno avec son client réel. Contrôle TypeScript et compilation automatique réussis.
- Migration réelle + règles de validation et RLS titulaire testées en PostgreSQL jetable local. Aucun hommage/profil réel utilisé comme fixture.
- Profil historique en navigateur : invitation non bloquante, choix Mme, sauvegarde et relecture ; toutes les requêtes de service interceptées.
- Seule fonction social-search déployée, empreinte source soumise `cc540c6eb1f310670d8cd700395ad3de73fbb7c5b03b19d25fc8ec2bce67df9e` ; jeton fictif refusé en ligne (401). Pas de comparaison directe du code distant.
- Pas de session disponible pour le compte réservé : recette authentifiée hébergée non exécutée, aucun mot de passe demandé. CI GitHub écrite mais exécution distante non vérifiée.
- Le champ profil reste dans l'aperçu : publication du site non effectuée faute de vérification de la portée des autres changements déjà présents. Les filtres hébergés rendent prudemment non calculable une civilité absente.