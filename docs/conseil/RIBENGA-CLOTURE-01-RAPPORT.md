# RIBENGA-CLÔTURE-01 — rapport de vérification

Date : 7 novembre 2026, UTC. **Verdict : PARTIAL — NO-GO pour une clôture FINAL ou une publication.**

Les corrections ciblées sont intégrées au code de l’aperçu et vérifiées isolément. Aucune publication, aucun déploiement Edge, aucune migration, aucun appel à la base partagée et aucune modification de données réelles n’ont été effectués. Les paiements et tous les autres périmètres interdits sont inchangés.

## Traçabilité

- SHA initial : `9906d9772318159c924f20e9a55b38dc9bc766c2`.
- SHA du code après corrections et tests, avant ce rapport : `efde044d32241a8ceb53360b2e8fcec9e264e19d`.
- Les écritures sont versionnées automatiquement par la plateforme ; aucun commit manuel ni commande Git modifiant l’état n’a été exécuté. Le SHA ci-dessus identifie le code vérifié, pas le commit documentaire ultérieur.
- Inventaire obtenu par `git diff 9906d9772318159c924f20e9a55b38dc9bc766c2 HEAD --name-only` ; contrôle final du statut via `git status --short`.

## Inventaire audité et invariants préservés

Page `SocialIntelligence`, palette `SocialSearchPalette`, réponse Markdown `RibengaAnswer`, explication `AdminRelationExplanation`, chaîne `social-search`, contrat `responseContract`, identité `tributeLinks`, calcul partagé `isp`, `adminRelationContext`, `relationDirection`, `tributeRelation`, `resolvedGraphs`, `relationPaths`, `RelationPathsPanel` et leurs tests. `AGENTS.md`, roadmap et règles RIBENGA/FIC-01 ont été lus.

Préservés : RIBENGA-06 ; `buildVerifiedEdges`/`findRelationPaths` ; parcours bornés et IDs de relations acceptées originaux ; `get_relation_confirmation_counts` ; relation_link canonique ; filtres sources/public/RLS ; aucune inférence de civilité ; filtre avant maximum ISP, égalités, aucun seuil >1 conditionnant le maximum ; ordre réponse automatique → relation précise → sources. Aucun ajout ECC, Vibe Guard ou FreeLLMAPI.

Les filtres du serveur écartent mémoriaux non publiés/inactifs/supprimés et hommages `is_hidden`, `editorial_hidden` ou `deleted_at`. Les tests de fixtures vérifient ces chemins, mais ne constituent pas un audit des policies réellement déployées.

## Défauts confirmés et corrections

Priorité P1 ; aucun P0 démontré par cet audit.

1. **Concurrence page/palette** : une réponse ancienne pouvait remplacer la recherche courante ou arrêter son attente. Annulation précédente et garde du contrôleur courant sur chaque écriture d’état ; nettoyage au démontage.
2. **Flux vide/interrompu** : absence de réponse ou fin avant `[DONE]` traitée comme issue normale. Erreur explicite ; les chemins ne sont pas présentés comme résultat réussi après erreur.
3. **Liens Markdown ordinaires** : une URL mémorial générée par le modèle contournait le contrôle des citations. Même liste de destinations publiques autorisées pour liens et marqueurs ; UUID masqués dans la présentation, flux brut conservé.
4. **Cible ISP erronée** : le seul mémorial avec faits était choisi même si une autre personne décédée était nommée ou homonyme. Résolution sur toute la carte visible avant le repli sur le seul mémorial avec faits.
5. **Identité variable** : un même compte portant plusieurs noms d’auteur pouvait être annoncé unique. Identité ambiguë ; première relation canonique conservée.
6. **Contexte parent/enfant et certification** : le contexte IA était symétrique et autorisait « lien certifié ». Orientation stockée explicitée ; lien déclaré accepté, confirmations non assimilées à une preuve. Correction de l’affirmation globale non fondée « données fictives ».
7. **Présentation des sélecteurs** : suffixes UUID visibles ; remplacés pour les homonymes par « Source N ». Résolution automatique limitée aux sources citées visibles ; guards sur données absentes sans assertions non-null.

La reproduction initiale nouvelle a produit 8 échecs de tests avant correction. Ce nombre compte les scénarios, pas huit catégories indépendantes de défauts.

## Matrice exigences → preuves → verdict

| Exigence | Tests / vérification | Verdict |
|---|---|---|
| Question libre, automatique avant manuel, chemins sans sélection | `RibengaQuestionFlow.test.tsx` (16), `AdminRelationExplanation.test.tsx` (19) | PASS isolé |
| Dernière recherche seule ; flux vide et partiel interrompu | `RibengaConcurrency.test.tsx` (6), page et palette | PASS isolé |
| Homonymes, identité variable, mémorial nommé sans faits | `ribengaClosure.test.ts` (3), suites tribute/ISP, Edge clôture | PASS isolé |
| Inversion parent/enfant ; contradictions ; déclaré ≠ confirmé | `relationDirection`, `relationScope`, `relationPaths`, explication ; Edge orientation | PASS isolé |
| Sources invalides/privées ; pas de preuve ni parcours inventé | contrat réponse, question libre, explication, `resolvedGraphs.ribenga.test.ts` (3), Edge clôture | PASS isolé |
| `editorial_hidden`, masqués, supprimés, mémorial privé | handler Edge réel avec client et fetch remplacés | PASS isolé |
| Citation autorisée ; aucun UUID visible/cliquable | `RibengaAnswer.test.tsx` (11), navigateur isolé | PASS isolé |
| FIC-01, filtre avant maximum, égalités, famille, sans filtre | `fic01Civility`, `ispDocSync`, 5 tests Edge FIC-01 | PASS isolé |
| Présentation desktop/mobile page et palette | Chromium 1280×1800 et 390×844, réponse avec une source et absence de preuve | PASS sur ce scénario isolé |
| Types Edge avec dépendances réelles | `deno check supabase/functions/social-search/index.ts` | PASS |
| Compilation frontend | journal automatique `build OK` du 07/11 à 17:15:03 UTC après corrections | PASS automatique ; pas de commande manuelle |
| Typecheck frontend séparé | aucun résultat indépendant accessible dans les journaux consultés | NON VÉRIFIÉ |
| Recette réellement connectée, IA hébergée et droits déployés | non exécutée : environnement partagé et écritures automatiques | BLOQUÉ |

## Commandes réellement exécutées et résultats

Baseline : même ensemble ciblé antérieur, sans les trois nouvelles suites, **11 fichiers / 138 tests PASS**. Reproduction initiale et correction intermédiaire ont échoué ; elles n’ont pas été présentées comme validations.

Commande consolidée finale :

```sh
bunx vitest run src/lib/ribengaClosure.test.ts src/lib/resolvedGraphs.ribenga.test.ts src/components/admin/RibengaConcurrency.test.tsx src/components/admin/RibengaAnswer.test.tsx src/components/admin/RibengaQuestionFlow.test.tsx src/components/admin/AdminRelationExplanation.test.tsx src/lib/ispDocSync.test.ts src/lib/fic01Civility.test.ts src/lib/tributeRelation.test.ts src/lib/relationDirection.test.ts src/lib/relationPaths.test.ts src/lib/adminRelationContext.test.ts src/lib/ribengaResponseContract.test.ts src/lib/relationScope.test.ts
```

**14 fichiers / 151 tests PASS**, 17:15:09 UTC, durée 9,30 s. Avertissements futurs React Router, pas d’échec. Il s’agit des suites RIBENGA ciblées, pas de tous les tests du projet.

```sh
deno test --allow-env --import-map=supabase/tests/ribenga-closure-import-map.json supabase/tests/ribenga_closure_edge_test.ts
deno test --allow-env --import-map=supabase/tests/fic01-import-map.json supabase/tests/fic01_edge_test.ts
```

**ÉCHEC de typage des doubles de clients** : respectivement 31 et 34 diagnostics (signatures simplifiées, `unknown`, inférences). Exécution séparée sans vérification des doubles :

```sh
deno test --no-check --allow-env --import-map=supabase/tests/ribenga-closure-import-map.json supabase/tests/ribenga_closure_edge_test.ts
deno test --no-check --allow-env --import-map=supabase/tests/fic01-import-map.json supabase/tests/fic01_edge_test.ts
deno check supabase/functions/social-search/index.ts
```

**5 + 5 tests Edge PASS**, puis **typecheck du serveur réel PASS**. Le contournement de typage est limité au harness de fixtures ; aucun succès du typage de ces harness n’est revendiqué. Total exécuté avec succès : **161 tests**, deux modes d’exécution distincts.

Compilation : lecture de `/tmp/observability/build-errors.log`, dernier résultat `build OK`. Les consignes de l’environnement interdisent de relancer manuellement builds et typechecks frontend ; `bun run build`/`tsgo` n’ont donc pas été exécutés. Le build automatique n’est pas présenté comme preuve indépendante de typecheck frontend.

Navigateur : `python3 /tmp/browser/ribenga-closure/check_ribenga.py`. Services externes bloqués, client remplacé et réponses synthétiques ; **aucune session réelle**. Quatre captures : `page-1280.png`, `palette-1280.png`, `page-390.png`, `palette-390.png` dans `/tmp/browser/ribenga-closure/`. Vérification DOM : débordement horizontal false, lien canonique `/memorial/alpha-test`, UUID visible false, aucune erreur de page. Trois captures ont été inspectées visuellement. Les premiers essais du harness ont échoué (navigation puis instances de modules incompatibles) ; corrigés dans le script temporaire, pas dans l’application. Ces captures ne prouvent pas une recette connectée.

Logs temporaires : `/tmp/ribenga-all-tests.log`, `/tmp/ribenga-edge-execution.log`, `/tmp/ribenga-fic01-execution.log`, `/tmp/ribenga-deno-check.log`, `/tmp/browser/ribenga-closure/result.log`. Ces fichiers `/tmp` ne sont pas des livrables persistants ; les résultats sont consignés ci-dessus.

## Fichiers modifiés ou ajoutés

Production : `src/pages/admin/SocialIntelligence.tsx`, `src/components/admin/SocialSearchPalette.tsx`, `src/components/admin/RibengaAnswer.tsx`, `src/components/admin/AdminRelationExplanation.tsx`, `supabase/functions/_shared/isp.ts`, `supabase/functions/social-search/index.ts`, `supabase/functions/social-search/tributeLinks.ts`.

Tests : `src/lib/ribengaClosure.test.ts`, `src/lib/resolvedGraphs.ribenga.test.ts`, `src/components/admin/RibengaConcurrency.test.tsx`, `src/components/admin/RibengaAnswer.test.tsx`, `supabase/tests/helpers/ribengaClosureClient.ts`, `supabase/tests/ribenga-closure-import-map.json`, `supabase/tests/ribenga_closure_edge_test.ts`.

Documentation : `AGENTS.md`, `roadmap.md`, ce rapport. Mémoire : garde-fous du mandat enregistrés. Aucun fichier paiement, auth/profil, prix, migration ou secret modifié.

## Risques résiduels et blocages

- **Recette connectée interdite sur base partagée** : `social-search` insère dans `social_search_history` et `ai_usage_logs` (lignes 404 et 412 au code vérifié). Une simple question change donc des données ; compte de recette seul ne suffit pas. Aucun appel hébergé ni session créée.
- Aucun déploiement Edge : les corrections serveur ne sont pas actives sur la fonction hébergée. Un aperçu local peut donc interroger une ancienne version. Ne pas confondre code testé et service déployé.
- Sortie libre IA non déterministe : les instructions d’orientation améliorées ne prouvent pas toutes les réponses du fournisseur. Chemins structurés et liens continuent à être filtrés indépendamment de sa prose.
- « Source N » ne remplace pas une identification humaine des homonymes ; aucune sélection automatique arbitraire.
- Mobile vérifié sur un seul scénario synthétique : longs chemins, clavier réel iOS/Android, gros historique et réseau 3G restent à recevoir.
- Typage des doubles Edge et typecheck frontend séparé restent des réserves explicites.

## Recette à effectuer avant FINAL

Prérequis : environnement réellement isolé avec base distincte, données de fixtures, compte admin réservé et fonction RIBENGA correspondant au SHA vérifié. Son provisionnement/déploiement doit être autorisé séparément ; aucune action sur site publié.

1. Obtenir la preuve de compilation et de typecheck frontend du SHA de recette.
2. Se connecter au compte réservé ; ouvrir page RIBENGA puis palette.
3. Question libre sur deux mémoriaux reliés : réponse → chemin automatique utilisant les IDs originaux → explorateur précis → sources ; noms seuls cliquables.
4. Comparer parent/enfant dans les deux sens ; liens opposés/contradictoires : pas de certitude, confirmations issues du RPC préservé.
5. Homonymes et noms variables : ambiguïté sans attribution arbitraire ; aucun UUID visible.
6. Sources privées, supprimées, masquées éditorialement ou inventées : aucune citation cliquable ni parcours utilisant ces sources.
7. Aucun lien/preuve ; réponse vide/interrompue ; deux questions successives rapides : message honnête, seule dernière réponse conservée.
8. ISP homme/femme/sans filtre, ex æquo, valeurs ≤1, identité absente, mémorial nommé sans hommages ; parenté non utilisée comme civilité.
9. Rejouer à 390×844 puis appareils iOS/Android, longs noms et chemins, historique, réseau contraint ; consigner captures, requêtes et résultats lus dans l’interface.

**GO de réception / FINAL** seulement si tous ces cas sont reçus réellement sur environnement isolé, types/build PASS et aucune réserve bloquante. **NO-GO** si une source privée fuit, un chemin est inventé, l’orientation est fausse, une réponse ancienne gagne, le maximum ignore l’ambiguïté, ou la recette dépend d’écritures sur la base partagée. La publication reste exclue du présent mandat même après un GO.