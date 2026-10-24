# Chantier 3 — RIBENGA / RAGet : concertation (aucun changement)

Note : je ne peux pas consulter ChatGPT d'ici. La discussion architecte ci-dessous est la mienne, fondée sur des lectures seules (code + 3 requêtes de lecture). Aucune écriture, aucune IA appelée.

## 1. Chemins réels

- Menu : `src/lib/adminNav.ts:49` → entrée « Exploration RAGet », route `/gestion-f7x/intelligence-sociale` (`App.tsx:162`).
- Page : `src/pages/admin/SocialIntelligence.tsx` (titre « Intelligence Sociale » ligne 352 ; héberge `RAGetSourceSearch` ligne 346 et la conversation `social-search`).
- Recherche dans les sources : `src/components/admin/RAGetSourceSearch.tsx` → RPC `rag_hybrid_search` (sans vecteur de requête).
- Palette : `SocialSearchPalette.tsx:292` « Intelligence Sociale — Maillage RAG ».
- Fonction conversationnelle : `supabase/functions/social-search` (IA Gateway, payante).

## 2. Diagnostic

OBSERVÉ
- Index non vide : 243 passages, 14 mémoriaux, dernière indexation 22/10 (tribute 172, event 25, biography 20, memorial 14, relation 12).
- Vecteurs : 110/243 seulement (les nouveaux passages ne sont pas revectorisés) — et la console n'envoie jamais de vecteur : le volet sémantique est structurellement inactif.
- Mots seuls fonctionnent : « Odile » 13, « mbigou » 9, « Libreville » 12, « obseques » 11 (texte).
- Phrases échouent : « grand-mère Odile Libreville » → 0 texte et 0 variante. Cause : `websearch_to_tsquery` impose TOUS les mots (ET) et la similarité trigramme (seuil 0,60) compare la phrase entière.
- « petite-fille » → 0 : le libellé de relation n'est pas dans le texte indexé sous cette forme.
- L'écran confond « vide » et « erreur » seulement partiellement : une erreur affiche un autre message ; « Information non trouvée » = 0 ligne réelle.
- ÉCART AAA Chantier 1 : le filtre hommages de `rag_hybrid_search` exclut `is_hidden` et `deleted_at` mais PAS `editorial_hidden`. Un hommage masqué par modération resterait trouvable dans RAGet (admin seulement, mais incohérent avec la règle). Aucun hommage n'est actuellement masqué éditorialement (0 passage concerné).

HYPOTHÈSES
- Les questions tapées par l'utilisateur sont des phrases naturelles, d'où « aucun résultat ».
- Stopwords et accents gérés côté texte, mais trigramme sensible à la longueur de la requête.

INCONNU
- Requêtes exactes tapées par le promoteur ; contenu exact des passages « relation ».
- Fiabilité d'un modèle de vectorisation de requête exécutable sans coût (pas de serveur CPU disponible à ce jour).

## 3. Libellé « Intelligence Sociale » — portée exacte

Seulement deux occurrences : titre de page (`SocialIntelligence.tsx:352`) et titre de palette (`SocialSearchPalette.tsx:292`). Le menu dit déjà « Exploration RAGet ». Le pilier « Maillage » n'est pas touché. Proposition : titre « RIBENGA », sous-titre « Exploration des sources », entrée de menu « RIBENGA » ; route `/intelligence-sociale` conservée (évite les liens cassés).

## 4. Consensus / désaccords

- D'accord : corriger le lexical d'abord (gain immédiat, gratuit, mesurable).
- Désaccord motivé : « améliorer le sémantique » n'est pas faisable proprement sans service de vectorisation des requêtes. Pas de faux vecteur, pas d'API payante → le sémantique reste inactif et annoncé comme tel ; le chantier se limite au lexical + correction confidentialité.
- La revectorisation des 133 passages manquants nécessite le script local CPU (autorisation séparée, écriture en base).

## 5. Périmètre minimal proposé

1. Migration additive : remplacer `rag_hybrid_search` (même signature) en ajoutant `NOT g.editorial_hidden` au filtre hommages, et un mode « OU pondéré » : si la requête stricte (tous les mots) renvoie peu, ajouter les passages qui contiennent n'importe quel mot significatif ; trigramme évalué mot par mot (≥ 3 lettres).
2. Front : renommage RIBENGA (2 titres + menu), message clair « aucun passage » avec suggestion (« essayez un nom ou un lieu »), sémantique affichée « inactive ».
3. Aucun changement à l'indexation, aux vecteurs, à `social-search`, au reste du site.

## 6. Recette non destructive

- Test SQL en base locale jetable (schéma copié, données fictives) : phrase multi-mots trouve résultats ; hommage `editorial_hidden`/`is_hidden`/supprimé/mémorial non publié exclus ; visiteur et non-admin refusés.
- Lecture réelle (admin, aperçu) : « Odile », « grand-mère Odile Libreville », « obsèques Libreville » renvoient des passages ; aucun mot privé (email, téléphone, transaction) dans les résultats.
- Aucune écriture en base partagée hors migration de fonction ; aucun appel IA.

## 7. Prompt BUILD à soumettre au promoteur

> FLOORENCE — CHANTIER 3 RIBENGA — GO BUILD CHIRURGICAL. Projet existant, aperçu seul, pas de publication. 1) Remplacer `rag_hybrid_search` (même signature, migration additive) : exclure `editorial_hidden`, ajouter repli « OU pondéré » et trigramme mot par mot, conserver contrôle admin/modérateur, filtres publication/suppression et seuil vectoriel. 2) Renommer en « RIBENGA » le titre de la page, de la palette et l'entrée de menu, route inchangée ; ne pas toucher au Maillage. 3) Messages vide/erreur explicites ; sémantique indiquée inactive. Interdits : revectorisation, API IA, modification de l'index, de `social-search`, des prix, paiements, Photo, svh. Tests : SQL en base jetable + recette admin lecture seule dans l'aperçu. Rapport PASS/PARTIAL/BLOCKED puis STOP.
