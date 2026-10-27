# RIBENGA-01 — EXÉCUTION ET RECETTE PARTIELLE
**MVETT FLOORENCE · Chantier permanent 001 · 27 octobre 2026**
**Issue pivot :** https://github.com/Kezayi/floorence/issues/1
**Statut :** code modifié et commité ; recette fonctionnelle **NON ACHEVÉE** ; publication/déploiement réel **NON ATTESTÉ**.
**Intervention Lovable :** **1/5 prompts visés**, message `umsg_01m5z3bf6je8w84brngk7wykkr` (`thread_id=main`), `plan_mode=false`, `max_mode=false`, réponse `completed`, coût retourné **5 crédits Lovable**.
**GO explicite du promoteur :** « GO! », interprété dans l'échange immédiatement précédent comme GO BUILD **RIBENGA-01 seulement** ; voir le commentaire antérieur de l'Issue.

## D'où venons-nous ? — Préparation et état initial
Source : RIBENGA-00, [audit](04-RAPPORT-RIBENGA-00.md) et [décisions](02-DECISIONS.md).
Au début de l'intervention, `get_project` a retourné `c47daed0fd03f54e3ffe46d70eb7a13de1bd2828`, base Supabase activée et projet publié. Lecture ciblée des 4 fichiers de code concernés : risques d'homonymie dans la recherche et le graphe, inférences de parenté présentées avec `high`, `social-search` avec service role et seul filtre `is_hidden=false`. Les permissions déployées et données personnelles n'ont pas été inspectées.

## Où allions-nous ? — Requête exécutée
Corriger **seulement** la visibilité du contexte fourni à `social-search`, les rapprochements par nom, la déduplication du graphe et l'explicitation des hypothèses, sans migration, sans changement RLS, sans nouveau fournisseur IA, sans publication et sans refonte.

## Où sommes-nous ? — Résultat vérifié en code
Commit GitHub **[f975525676c5a07f19fcb8d9cc1ab2ce9156eb0e](https://github.com/Kezayi/floorence/commit/f975525676c5a07f19fcb8d9cc1ab2ce9156eb0e)**, vérifié via l'historique et le diff GitHub + le diff Lovable.
| Domaine | Fichier | Changement constaté |
|---|---|---|
| Confidentialité | `supabase/functions/social-search/index.ts` | Ajouts de `memorials.deleted_at IS NULL`, `guestbook_posts.editorial_hidden=false` et `deleted_at IS NULL`; filtrage en mémoire des hommages par ID de mémorial actif et publié autorisé ; relations conservées seulement si les 2 mémoriaux figurent dans l'ensemble autorisé ; erreurs de requêtes → 503 sans appel IA. |
| Homonymes | `src/lib/searchWithRelations.ts` | Suppression de la liaison « Même personne, différents mémoriaux » fondée uniquement sur l'égalité des noms. |
| Graphes | `src/components/memorial/RelationshipGraph2D.tsx` | Clé d'auteur = UUID connu, sinon `anon::post.id` ou index ; même clé pour avatar et nœud ; ne supprime plus le contributeur portant le nom d'un défunt inter-mémoriaux. |
| Inférences | `src/lib/relationshipInference.ts` et `src/components/memorial/InferredRelationships.tsx` | Constante `INFERENCE_DISCLAIMER`, explication « Hypothèse fondée sur les liens déclarés », badge hypothèse, description visible et accessible ; algorithme et `confidence` conservés. |

**Tests déclarés par Lovable :** contrôle TypeScript `tsgo --noEmit -p tsconfig.app.json` **PASS** ; recherches statiques sur chaînes à risque dans les fichiers concernés. **Non testés :** scénarios fonctionnels sur personnes homonymes, performance ou rendu du graphe, données supprimées/masquées, cas de régression des parcours, règles RLS déployées et invocation de la fonction en conditions réelles. Un test déclaré réussi n'est pas une recette intégrale.

**Aucune migration, écriture de données, lancement de paiements/SMS, ni publication manuelle demandé ou rapporté.** Le projet Lovable reste `is_published=true` mais cela **ne prouve pas** que ce nouveau commit ou la fonction `social-search` sont réellement déployés en production.

## Interdépendances, effets directs et indirects
| Chantier relié | Impact direct | Impact indirect / réserve | Preuve et état |
|---|---|---|---|
| Recherche / Maillage | Disparition des faux liens entre homonymes dans `searchWithRelations`. | Moins de liens apparents ; correctif du moteur principal utile mais autres parcours restent. | Diff vérifié ; tests fonctionnels non exécutés. |
| Lignage / Maillage / Graphe | Davantage de nœuds anonymes distincts, meilleur non-effacement par homonymie. | Densité et lisibilité potentiellement différentes ; avatar/clé doivent être vérifiés à l'affichage. | Diff vérifié ; UI non testée. |
| Modération / recherche admin / protection | Exclusion de contenus masqués/supprimés et de mémoriaux non autorisés avant envoi IA. | Réponses potentiellement plus courtes ; erreurs 503 si schéma réel non conforme ; l'envoi externe d'extraits existe toujours. | Diff vérifié ; DB et déploiement non testés. |
| Inférences / confiance | Avis de non-certitude affiché dans `InferredRelationships`. | D'autres écrans conservent des libellés catégoriques ; nécessité de vérifier le bout-en-bout. | Diff vérifié ; contrôle des autres écrans incomplet. |

## Prérequis et vérifications
- **GO BUILD ciblé** : **vérifié**, verbatim dans l'Issue.
- **Fichiers et défauts initiaux** : **vérifiés** en code.
- **Schéma des colonnes** : **attesté par Lovable depuis fichiers/types**, non vérifié sur la base déployée.
- **Non-régression TypeScript** : **vérification exécutée par Lovable et déclarée PASS** ; aucun test fonctionnel.
- **RLS et confidentialité réelle**, y compris champs éventuels dans les extraits envoyés à IA : **non vérifiées intégralement**.
- **Déploiement effectif** des changements : **non vérifié**.
- **Aucun nouveau GO** pour RIBENGA-02 à 05.

## Risques résiduels explicites
1. `src/components/memorial/RelationshipMaillage.tsx` (~ligne 85) fusionne encore des contributeurs sur leur nom : **même classe de risque subsiste ailleurs**.
2. `kinshipCalculator`, `UserRelationResult` et d'autres parcours peuvent toujours afficher des parentés catégoriques ; avertissement visible ajouté sur `InferredRelationships` seulement.
3. Le contenu des extraits d'hommages transmis au prestataire IA peut contenir des informations personnelles. L'exclusivité Floorence comme source d'analyse ne tranche pas à elle seule la question de la confidentialité des flux sortants.
4. La méthode par index pour auteur sans UUID et sans ID de contribution reste sensible au changement d'ordre des posts ; recette nécessaire.
5. Aucun contrôle fonctionnel authentifié/de production n'a été exécuté.

## Décision de passage au prochain cycle
**RIBENGA-01 : implémenté, recette partielle, non certifié prêt production.** Le Conseil recommande d'intégrer les risques résiduels liés à l'identité et à la confidentialité dans le prochain périmètre autorisé, mais aucun **GO BUILD RIBENGA-02** n'existe actuellement.

**Règle MVETT :** conserver cette pièce comme instantané daté, et inscrire chaque vérification future sans effacer les limites connues.
