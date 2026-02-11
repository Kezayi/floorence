

# Correction du bug de flash 404 sur les espaces memoriels

## Diagnostic

Le probleme est confirme a la **ligne 455** de `Memorial.tsx`. La condition de chargement n'a jamais ete corrigee depuis le diagnostic precedent :

```text
Etat actuel (ligne 455):
  if (memorialsLoading || dbFallbackLoading)

Ce qui se passe:
  1. memorialsLoading passe a false (contexte charge)
  2. contextMemorial = null (le memorial est trouve via shareToken mais le contexte n'est pas encore pret)
  3. dbFallbackLoading = false (le useEffect n'a pas encore demarre)
  4. dbFallbackDone = false
  --> Le code saute au bloc 404 (ligne 460)
  5. Le useEffect de fallback se declenche APRES
  --> Flash 404 visible par l'utilisateur
```

## Correction (1 seule ligne a modifier)

### Fichier : `src/pages/Memorial.tsx`, ligne 455

Remplacer :
```typescript
if (memorialsLoading || dbFallbackLoading) {
```

Par :
```typescript
if (memorialsLoading || dbFallbackLoading || (!contextMemorial && !dbFallback && !dbFallbackDone)) {
```

Cette condition garantit que le skeleton reste affiche tant que :
- Le contexte charge, OU
- Le fallback DB charge, OU
- **Aucune source n'a encore trouve le memorial ET le fallback n'a pas termine**

## Impact

- **1 ligne modifiee** dans 1 fichier
- Zero risque de regression : on affiche simplement un skeleton au lieu d'un faux 404
- Compatible avec les deux routes : `/m/:token` et `/memorial/:slug`
- Les 13 liens fonctionneront sans flash 404

