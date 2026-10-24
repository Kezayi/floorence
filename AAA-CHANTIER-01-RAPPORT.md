# AAA-CHANTIER-01 — Rapport d’exécution

24 octobre 2026 — verdict **PARTIAL**, aucune publication du site.

## Réalisé

- `src/components/memorial/GuestbookPost.tsx` et nouveau `ReportTributeAction.tsx` : menu discret, cinq motifs, précision facultative, connexion requise, erreurs, confirmation et doublon.
- `src/lib/guestbookReports.ts` : appels serveur typés et validation des réponses ; `guestbookReports.test.ts` : quatre tests de règles.
- Nouveau `src/components/admin/GuestbookReportsQueue.tsx` et intégration dans `src/pages/admin/Moderation.tsx` : file prioritaire, compteur, historique par hommage, pagination, maintien/masquage/restauration/corbeille, motif et décisions auditées.
- `src/pages/admin/Trash.tsx` : restauration sans effacement du verrou financier.
- `src/pages/Memorial.tsx` : événements relus via RPC public, jamais insérés directement depuis une notification ; actualisation périodique. `LineageTree.tsx` et `CommunityGraph.tsx` : actualisation des données publiques.
- `AGENTS.md`, mémoire de décision produit et `roadmap.md` actualisés.

## Migration appliquée

`drizzle/migrations/0041_aaa01_post_publication_reports.sql` :

- Table `guestbook_reports`, droits explicites, RLS propriétaire/admin, aucune écriture directe client, unicité partielle compte/hommage ouvert.
- Champs `editorial_hidden`, raison/date/auteur, indépendants de `is_hidden`.
- RPC `report_guestbook_post`, `list_guestbook_reports`, `moderate_tribute_editorial` avec contrôle serveur ; décisions et audit dans une transaction.
- Trigger indépendant `aaa01_guard_editorial` : protection des champs éditoriaux, interdiction de lever le verrou financier depuis un client authentifié, préservation des masquages historiques portant une raison lors d’un déverrouillage financier.
- Filtres ajoutés aux deux RPC Livre d’Or, deux agrégations de gestes, fiche contributeur, pays/géographie et statistiques sociales ; vues `public_guestbook` et `v_social_inferences` explicitement filtrées, même pour admin/propriétaire.
- Types applicatifs automatiquement régénérés par Lovable Cloud.

**Effet immédiat sur le backend partagé signalé avant application.** Aucun UPDATE de données historiques, aucune facture, aucun paiement, aucun changement de prix/quantités/transactions. Totaux avant/après identiques : hommages, hommages publics, mémoriaux, transactions et ventilation des anciens états. Zéro signalement et zéro nouveau masque éditorial dans la base réelle à la fin des contrôles.

0035 n’a pas été réactivée : défaut `approved` et ancien guard inerte conservés. `fulfill_payment_success`, callbacks et rapprochement non modifiés : ils peuvent lever `is_hidden`, mais jamais le nouveau masque éditorial. Les quantités délivrées restent créditées selon la logique financière existante.

## Tests effectivement exécutés

- **30 assertions SQL PASS** dans PostgreSQL local jetable, avec tables et fonctions courantes copiées sans données réelles ; script conservé `supabase/tests/aaa01_post_publication.sql`, transaction annulée.
- Couverture : écrit gratuit visible ; gestes avant paiement invisibles ; signalement tiers sans masque ; doublon idempotent ; refus anonyme/autrui/créateur non habilité ; queue/admin/maintien ; refus falsification ; masque avant confirmation tardive conservé ; montant/quantité/succès/idempotence financière préservés ; restauration éditoriale sans déverrouillage financier ; RLS, vues, RPC consolidée, agrégats et corbeille ; audit.
- **15 tests Vitest PASS** : quatre signalements, trois portraits, trois géographie, cinq tarification existante (non modifiée).
- Playwright aperçu localhost : cinq menus visibles sur le mémorial Odile MBIGOU ; connexion demandée en visiteur ; formulaire avec motif rempli avec le compte authentifié sur ordinateur/mobile, sans envoi ; file admin ouverte et RPC admin lus avec compte réel. Aucun `pageerror` observé.
- Dernier contrôle automatique de compilation : `build OK`.

## Limites / réserves

1. **Pas de masquage familial automatique** : `is_master_representative` accepte un héritier déclaré ou, à défaut, le créateur ; cela n’établit pas une habilitation familiale vérifiée. Aucun nouveau rôle inventé. Les signalements restent dans la file admin.
2. **Cycle complet réel non validé** : aucun signalement artificiel ni décision sur un hommage réel n’a été créé. Les décisions ont été testées en SQL local, pas avec une file réelle non vide dans l’aperçu. Les confirmations tardives n’ont jamais été simulées dans la base partagée.
3. **RAGet/RIBENGA exclus du mandat** : corpus/recherches et fonction sociale administrateur utilisant une lecture privilégiée inchangés. Ils peuvent conserver des projections historiques désormais masquées ; ils ne sont pas des lectures publiques du Livre d’Or. Leur conformité au filtre éditorial reste à examiner sous mandat distinct. Aucune optimisation ou IA appelée.
4. Anciens hommages `is_hidden=true` non reclassifiés. Une restauration éditoriale ne débloque pas ce verrou historique ; pas de migration financière hasardeuse.
5. Ancien site publié non remplacé : ses anciens contrôles de restauration peuvent recevoir un refus de protection financière ; l’aperçu contient les nouveaux contrôles séparés. Aucun déploiement de site ou fonction Edge effectué.
6. Débordement horizontal préexistant des onglets mémoriaux observé sur mobile ; formulaire de signalement lisible, aucun travail Photo/3G engagé.

**STOP — Chantier 1 uniquement.** Aucun passage au chantier suivant ni publication.