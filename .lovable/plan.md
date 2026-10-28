# Vérification en lecture seule : verrouillage du lien dans les hommages

Aucune modification proposée. Ce document contient seulement le constat. Choisissez « Skip » si vous ne voulez pas de suite.

## Conclusion

La règle existe, mais **seulement dans le navigateur**. Elle bloque le formulaire, pas l'enregistrement : le serveur ne la vérifie pas.

## 1. Écritures futures

**Côté navigateur (la règle existe) :**
- `src/pages/Memorial.tsx`, l. 410-432 : la page lit le **premier** hommage du **compte connecté** sur ce mémorial (filtre par `user_id` + `memorial_id`, le plus ancien d'abord, un seul résultat).
- Si cet hommage a un lien précis, ce lien est verrouillé. Ce filtre se fait **par compte, pas par nom**.
- `src/components/memorial/GuestbookForm.tsx`, l. 53-54 et 348-366 : le choix du lien est remplacé par « Lien verrouillé », et le lien du premier hommage est repris.

**Côté serveur (aucune vérification) :**
- `supabase/functions/publish-tribute/index.ts`, l. 56, 174 et 217 : le lien reçu (`relationLink`) est enregistré tel quel. Rien ne le compare aux hommages précédents.
- Les migrations ne contiennent aucune contrainte d'unicité ni aucun déclencheur sur `relation_link`. Je n'ai pas consulté les règles d'accès en ligne.

**Conséquence :** un envoi direct, une ancienne version de l'application en cache, ou un premier hommage sans lien précis peut encore enregistrer un lien différent.

## 2. Hommages déjà publiés

- Rien n'est réécrit ni nettoyé. Les anciens liens contradictoires (« Son Petit-fils » puis « Sa Petite-fille ») restent en base.
- Pour l'auteur, le formulaire reprend le lien du plus ancien de ses hommages sur ce mémorial.
- Je ne l'ai pas vérifié sur les vraies données, comme demandé.

## 3. Lignage

Le Lignage s'appuie sur les liens entre mémoriaux (`memorial_relations`), pas sur ce verrou. La règle ne s'applique donc pas au Lignage.

## 4. Réponses RIBENGA

- `supabase/functions/social-search/index.ts`, l. 122-128 : RIBENGA lit **tous** les hommages visibles (jusqu'à 500), avec leur `relation_link`, anciens hommages compris.
- `supabase/functions/social-search/tributeLinks.ts`, l. 10-25 : il regroupe les hommages par mémorial + **nom d'auteur normalisé**, et garde **tous les liens différents** (`links` est un ensemble).
- La personne est marquée « ambiguë » si plusieurs comptes ou des hommages anonymes portent ce nom.
- Un contributeur avec les deux libellés transmet donc les deux à RIBENGA, qui peut les présenter ensemble.

## Récapitulatif

| Aspect | État |
|---|---|
| Écritures futures, navigateur | Verrou par compte + mémorial (premier hommage) |
| Écritures futures, serveur | Aucun contrôle, règle contournable |
| Hommages déjà publiés | Contradictions conservées |
| Lignage | Non concerné |
| RIBENGA | Lit toutes les anciennes valeurs, regroupées par nom puis distinguées par compte |
