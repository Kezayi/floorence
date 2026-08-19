# Correctif urgent — page blanche en production

## Constat vérifié

- Sur `https://www.floorence.org/`, seule la coquille statique de `index.html` s'affiche ("Floorence / Honorer, relier et transmettre…") : React ne monte jamais.
- L'erreur JS capturée sur le site publié est : `Cannot read properties of undefined (reading 'createContext')`.
- En preview de développement (`localhost:8080`), la page d'accueil se charge normalement, sans erreur console. Le bug est donc propre au **bundle de production**.

## Cause

Le `manualChunks` ajouté dans `vite.config.ts` lors de l'optimisation PageSpeed isole React dans un chunk `react-core`, séparé des chunks qui le consomment (`radix`, `query`, `router`, `vendor`…). À l'exécution, l'ordre d'initialisation des chunks fait qu'un module appelle `React.createContext` avant que le module React ne soit initialisé → `undefined.createContext` → crash avant tout rendu.

C'est la contrepartie du gain de bundle : le découpage est trop fin et brise le graphe d'initialisation.

## Correctif

1. **Rétablir un découpage sûr** dans `vite.config.ts` :
   - Supprimer le chunk `react-core` séparé et laisser Rollup regrouper React avec les modules qui en dépendent (comportement par défaut, sûr).
   - Conserver uniquement les découpages sans dépendance React au moment de l'init : `charts` (recharts/d3), `markdown`, `dates`, `supabase`.
   - Option retenue si le doute persiste : retirer entièrement `manualChunks` (retour au comportement Vite par défaut, déjà correct grâce au `React.lazy` par route déjà en place). La priorité est un site fonctionnel ; le gain de bundle reste assuré par le code splitting des routes.
2. **Vérification obligatoire avant clôture** :
   - Build de production local, puis service du `dist` et chargement de `/` via Playwright : zéro `pageerror`, présence de la grille des mémoriaux (pas seulement le H1 statique).
   - Contrôle d'une seconde route (`/recherche`) pour valider l'ordre des chunks lazy.
3. **Cache Service Worker** : après le correctif, s'assurer que le SW ne resserve pas l'ancien bundle cassé (bump de la clé de reset / version de cache dans `public/sw.js` si le SW met en cache les assets JS).

## Détails techniques

- Fichiers touchés : `vite.config.ts`, éventuellement `public/sw.js` (version de cache).
- Aucun changement de schéma base de données, aucune modification d'UI ni de logique métier.
- L'erreur `createContext` étant un échec d'init de chunk, aucun error boundary React ne peut l'attraper : la seule correction possible est côté bundling.
