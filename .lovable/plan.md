
Diagnostic critique (factuel)
- Le réglage backend est bien actif: `global_settings.is_monetized = true` en base. Donc le problème n’est pas le switch admin.
- Le FrontOffice masque/neutralise presque tout le flux geste à cause d’un bug d’identité:
  - Dans `Memorial.tsx`, `authorId` est transformé en `author-${user_id}`.
  - Mais les contrôles utilisent `user.id` brut (`userHasPosted`, `isOwner`).
  - Résultat: l’utilisateur n’est jamais reconnu comme auteur de post, donc interactions verrouillées/incohérentes.
- Le flux payant est incomplet: pas de vraie modale de paiement (téléphone/prix/CTA), alors que `ebilling` exige un `phone` en mode payant.
- Niveau produit: en l’état, l’expérience est en-dessous d’un standard “top-tier” (pas de feedback clair, logique payante invisible).

Plan de correction (intégral, en 4 blocs)
1) Corriger la logique d’identité côté FrontOffice
- Fichier: `src/pages/Memorial.tsx`, `src/components/memorial/GuestbookPost.tsx`
- Introduire une séparation explicite:
  - `authorUserId` (UUID réel, nullable) pour les règles métier.
  - `authorId` (clé UI/dédoublonnage) conservé pour graph/affichage si besoin.
- Recalculer:
  - `userHasPosted` via `authorUserId === user.id`
  - condition d’activation des gestes via `userHasPosted` (et non via identifiant transformé).
- Effet attendu: le front “voit” enfin l’état réel utilisateur + mode monétisation.

2) Implémenter un vrai flux “Geste Rituel” synchronisé backend
- Créer `GesteRituelModal` (ou équivalent) ouvert au clic cierge/fleur.
- À chaque ouverture:
  - `refetchMonetization()` obligatoire
  - état `isLoadingSettings` bloquant (aucune action avant confirmation backend).
- UI conditionnelle:
  - Mode gratuit: pas de téléphone, prix “Offert”, CTA “Offrir ce geste”.
  - Mode payant: téléphone requis, prix dynamique (`ritual_prices`), CTA paiement.
- Rendre le badge “Mode Test LAB” visible dans la modale + résumé.

3) Aligner strictement la logique Front/Backend eBilling
- Fichier: `supabase/functions/ebilling/index.ts`
- Garder la vérité serveur:
  - Si `is_monetized = false` => toujours flux gratuit (même si le front envoie un phone).
  - Si `is_monetized = true` => exiger phone + traiter paiement.
- Retourner un payload explicite (`mode`, `amount`, `unit_price`, `requires_phone`) pour que le front rende un feedback sans ambiguïté.
- Ajouter logs métier minimaux (mode, item_type, result) pour diagnostic rapide.

4) Sécuriser la table de pilotage monétisation (impact infra)
- `global_settings` a RLS désactivé actuellement (risque critique).
- Migration prévue (sans changer le schéma fonctionnel):
  - Activer RLS sur `global_settings`
  - Policy SELECT publique (lecture autorisée front)
  - Policy UPDATE/INSERT admin-only via `has_role(auth.uid(),'admin')`
- Impact code:
  - Lecture front inchangée.
  - Écriture admin inchangée si rôle admin.
  - Edge function (service role) continue de fonctionner.

Impact BDD / code existant (règle d’or respectée)
- Aucun changement destructif de structure de données.
- Changement principal: politiques d’accès (`global_settings`) + correction mapping identité.
- Composants impactés:
  - `Memorial.tsx` (source vérité userHasPosted + ouverture modale)
  - `GuestbookPost.tsx` (activation gestes cohérente)
  - `GestureSummary.tsx` (affichage prix/badge cohérent)
  - `useMonetization.ts` (gestion loading/error/refresh robuste)
  - `ebilling/index.ts` (contrat API plus explicite)

Plan de validation E2E (obligatoire)
1. Admin: activer/désactiver mode payant + modifier prix.
2. Front (même session): ouvrir un mémorial avec post utilisateur.
3. Vérifier:
   - gratuit => “Offert”, pas de téléphone, geste validé.
   - payant => prix dynamique visible, téléphone requis, badge LAB visible.
4. Vérifier rollback:
   - repasser gratuit en admin, rouvrir modale, état instantanément reflété.
5. Vérifier logs transactions (`payment_transactions`) pour les 2 modes.
