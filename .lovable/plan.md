
# Plan d'implémentation - Suite de la Feuille de Route

## Éléments restants à traiter

Après analyse approfondie du code, voici les points de la feuille de route qui nécessitent encore une implémentation :

---

## 1. GRAPHE DE MAILLAGE - Tracer des lignes entre les nœuds vivants

**Fichier :** `src/components/memorial/RelationshipGraph2D.tsx`

**Situation actuelle :** Le graphe trace uniquement des lignes du centre (défunt) vers chaque nœud. Il ne trace pas de liens entre les personnes vivantes qui ont une relation inférée.

**Action :**
- Utiliser la fonction `inferAllRelationships` de `relationshipInference.ts` pour obtenir les liens entre auteurs
- Ajouter des lignes SVG entre les nœuds qui partagent une relation inférée (ex: Frère ↔ Sœur)
- Ces lignes seront en pointillés et plus discrètes que les liens vers le défunt

---

## 2. DÉDOUBLONNAGE RECHERCHE - Fusionner les résultats identiques

**Fichier :** `src/pages/Search.tsx`

**Situation actuelle :** La fonction `findAllMatchingPersons` peut retourner plusieurs entrées pour la même personne si elle apparaît dans plusieurs mémoriaux.

**Action :**
- Modifier la logique de `findAllMatchingPersons` pour regrouper par nom normalisé
- Créer une entrée unique par personne avec la liste de tous ses mémoriaux associés
- Afficher cette personne une seule fois dans la liste de désambiguïsation

---

## 3. NOM DE L'AUTEUR - Empêcher "Super Admin"

**Fichier :** `src/pages/CreateMemorial.tsx` + Backend

**Situation actuelle :** Aucune validation n'empêche l'utilisation du nom "Super Admin".

**Action :**
- Ajouter une validation côté client dans le formulaire de création
- Ajouter une validation côté serveur dans `publish-tribute` Edge Function
- Bloquer les noms génériques : "Super Admin", "Admin", "Administrateur", "Test", "Utilisateur"

---

## 4. COLONNE is_published - Gestion de la publication

**Base de données :** Table `memorials`

**Situation actuelle :** La table `memorials` n'a pas de colonne `is_published`. Le processus de paiement → publication n'est pas implémenté pour la création de mémoriaux.

**Action :**
- Créer une migration pour ajouter `is_published BOOLEAN DEFAULT false` à la table `memorials`
- Modifier le flux de création pour créer un mémorial en `is_published = false`
- Créer une Edge Function `publish-memorial` qui sera appelée après confirmation de paiement par le webhook EBILLING
- Mettre à jour les requêtes pour filtrer par `is_published = true` côté public

---

## 5. INTÉGRATION EBILLING POUR CRÉATION - Lier le paiement à la publication

**Fichiers :**
- `src/pages/CreateMemorial.tsx` 
- `supabase/functions/initiate-payment/index.ts`
- Nouvelle Edge Function : `supabase/functions/create-memorial/index.ts`

**Action :**
- Modifier `handleSubmit` pour :
  1. Appeler `create-memorial` pour créer le mémorial en `is_published = false`
  2. Appeler `initiate-payment` avec `paymentType: 'memorial_creation'` et `memorialId`
  3. Rediriger vers le paiement EBILLING
- Modifier le webhook pour gérer le `payment_type = 'memorial_creation'` et passer le mémorial en `is_published = true`

---

## 6. GRAPHIQUE CHIFFRE D'AFFAIRES (Admin Dashboard)

**Fichier :** `src/pages/admin/Dashboard.tsx`

**Situation actuelle :** Le Dashboard calcule déjà le chiffre d'affaires à partir des transactions complétées. Mais il n'y a pas de graphique d'évolution.

**Action :**
- Ajouter un graphique Recharts montrant l'évolution du CA sur les 30 derniers jours
- Regrouper les transactions par jour avec `created_at`
- Utiliser `<AreaChart>` ou `<BarChart>` pour la visualisation

---

## Récapitulatif des modifications

| Priorité | Élément | Type | Fichiers concernés |
|----------|---------|------|-------------------|
| 🔴 Haute | Publication conditionnelle | Migration DB + Edge Function | `memorials`, `publish-memorial`, webhook |
| 🔴 Haute | Tunnel de création + paiement | Frontend + Edge Function | `CreateMemorial.tsx`, `create-memorial` |
| 🟡 Moyenne | Graphe - liens entre vivants | Frontend | `RelationshipGraph2D.tsx` |
| 🟡 Moyenne | Dédoublonnage recherche | Frontend | `Search.tsx` |
| 🟡 Moyenne | Bloquer noms interdits | Frontend + Backend | `CreateMemorial.tsx`, `publish-tribute` |
| 🟢 Basse | Graphique CA admin | Frontend | `Dashboard.tsx` |

---

## Détails techniques

### Migration Base de Données
```sql
ALTER TABLE memorials ADD COLUMN is_published BOOLEAN DEFAULT false NOT NULL;
-- Mettre les mémoriaux existants comme publiés
UPDATE memorials SET is_published = true WHERE is_active = true;
```

### Flux de paiement pour création
```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ CreateMemorial  │────▶│ create-memorial  │────▶│ Memorial créé   │
│ (Formulaire)    │     │ (Edge Function)  │     │ is_published=   │
└─────────────────┘     └──────────────────┘     │ false           │
        │                                         └────────┬────────┘
        │                                                  │
        ▼                                                  ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ initiate-payment│────▶│ EBILLING         │────▶│ Webhook         │
│ (type: creation)│     │ (Redirection)    │     │ (Confirmation)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ is_published=   │
                                                 │ true            │
                                                 └─────────────────┘
```

---

## Ordre d'exécution recommandé

1. **Étape 1** : Migration DB (`is_published`) + Mise à jour du webhook EBILLING
2. **Étape 2** : Création de l'Edge Function `create-memorial`
3. **Étape 3** : Modification du tunnel `CreateMemorial.tsx` pour le paiement
4. **Étape 4** : Graphe de maillage (liens entre vivants)
5. **Étape 5** : Dédoublonnage de la recherche
6. **Étape 6** : Validation des noms interdits
7. **Étape 7** : Graphique du CA dans le Dashboard admin

Approuvez ce plan pour que je commence l'implémentation étape par étape.
