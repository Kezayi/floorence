# HCT-01 — Haut Conseil Technique Floorence

Version 1.0 — 31 octobre 2026 — **Constitution méthodologique, non déploiement technique.**

## Mandat

Challenger les décisions d'architecture, de sécurité, de robustesse, de résilience, d'IA et de direction artistique de Floorence pour atteindre une qualité premium vérifiable. Le Haut Conseil est **une organisation de rôles d'analyse**, non une institution externe de personnes réellement recrutées. Ses conclusions sont des recommandations et ne remplacent ni les tests ni la validation du promoteur.

Principes : simplicité avant complexité ; preuve avant affirmation ; données avant apparence ; zéro changement silencieux ; architecture de MVP évolutive et non surdimensionnée ; séparation conseil/production.

## Composition

| Siège | Question critique | Preuve minimale requise |
|---|---|---|
| Architecture | Peut-on faire plus simple sans perdre la capacité de croissance ? | Schémas, dépendances, tests de charge ciblés |
| Sécurité | Quel utilisateur peut faire quoi, avec quelles données ? | Revue RLS, accès négatifs, secrets, contrôles de rôle |
| Robustesse | Que se passe-t-il en cas de requête concurrente, timeout, doublon ? | Tests d'idempotence, contrats API, gestion d'erreurs |
| Résilience | Si Supabase, Edge, hébergeur ou IA tombe, que restaure-t-on ? | Sauvegarde/restauration isolée, RTO/RPO validés |
| Data & IA | Peut-on prouver les réponses de RIBENGA et calculs ISP ? | Déterminisme, données sources, ambiguïtés explicites |
| DA / UI / UX | Chaque élément sert-il l'usage et la dignité mémorielle ? | Parcours mobiles, accessibilité, lisibilité, métriques |
| Exploitation | Comment sait-on que ça marche vraiment en production ? | Alertes utiles, rollback, journaux non sensibles, responsabilités |

## Charte de contradiction

1. Pour chaque décision : proposition initiale, hypothèses, meilleure objection, alternative minimale, risques, critère de validation.
2. Ne jamais assimiler nombre de tests à garantie de sécurité ; consigner tests exécutés, réussites, échecs et ce qui n'a pas été testé.
3. Les rapports de ZIP externes sont des **allégations à reproduire** ; « 204/204 tests » n'est pas un résultat confirmé du dépôt canonique.
4. Les changements sensibles (paiements, RLS, auth, données mémorielles, ISP, migration, publication) exigent un GO explicite.
5. Conserver les attributs d'identité et données protégées côté Supabase ; aucun transfert à des services IA tiers sans évaluation de conformité, confidentialité et base légale.
6. Évaluer les objectifs d'architecture par risque et charge observables ; ne pas ajouter Redis, Kubernetes, nouveaux agents ou sharding par effet de mode.
7. La direction artistique vise simplicité, fluidité, luxe sobre, utilité ; elle ne doit pas masquer un défaut fonctionnel. L'expression « penser comme Steve Jobs » désigne des principes de design, pas un test objectif ou une garantie de qualité.

## Références externes

- prompts.chat, dépôt source : https://github.com/f/prompts.chat — bibliothèque de méthodes et prompts à sélectionner, pas à injecter en bloc.
- OWASP ASVS 5.0.0 stable : https://asvs.owasp.org — grille de contrôle sécurité.
- NIST SP 800-34 Rev.1 : https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final — principes de continuité.
- FreeLLMAPI candidat : https://github.com/valorisa/FreeLLMAPI — *non installé*, mono-utilisateur et présenté par l'auteur comme expérimental.
- Autre projet distinct : https://github.com/shihabshahrier/freelm — les noms sont ambigus ; ne pas confondre les dépôts.

## Décision FreeLLM — conditionnelle

**Ne pas installer dans la production Floorence.** Aucun secret Supabase, profil, mémorial, historique RIBENGA ou token de paiement ne doit être envoyé à un proxy de modèles gratuit sans revue contractuelle, sécuritaire et technique.

Un essai éventuel pourra être réalisé **en environnement local isolé** avec cas synthétiques, sur une version épinglée du dépôt exact, après lecture de licence, dépendances, flux réseau, conditions des fournisseurs, coûts réels et risques d'exfiltration. Le service devrait être arrêté après l'évaluation ; aucune clé de fournisseur ne doit être stockée dans GitHub.

## Méthode de travail par chantier

1. Cadrage du changement et des invariants.
2. Inspection ciblée de l'état réel du dépôt et des configurations disponibles.
3. Trois positions contradictoires : proposition, objection, variante minimale.
4. Matrice de vérification, coûts, sécurité, impacts utilisateurs et retour arrière.
5. GO distinct pour modification du code ou infrastructure.
6. Validation : tests, revue sécurité ciblée, examen DA, accessibilité et recette.
7. Livraison : SHA, déploiements réellement confirmés, limites et incidents.

## Backlog recommandé

| Priorité | Thème | Résultat attendu |
|---|---|---|
| P0 | RLS, comptes, rôles, buckets, confidentialité des mémoriaux | Matrice des permissions et tests négatifs |
| P0 | Transactions, hommages et idempotence des notifications | Preuve anti-double comptage |
| P0 | Sauvegardes, restauration, historique de migration | Test de reprise sur base jetable |
| P1 | RIBENGA, ISP, dégradation en absence d'IA | Réponse prudente, valeurs exactes |
| P1 | Observabilité et journal d'incidents | Alertes exploitables sans données personnelles |
| P1 | Graph 2D, zoom, performance mobile et clavier | Parcours fluides et accessibles |
| P1 | Avis de décès — image principale seulement | Rendu harmonieux, original préservé |
| P2 | Tests de charge sur scénarios autorisés | Mesures et seuils adaptés à la réalité |

## Critères de qualité visuelle — DA Premium

- Hiérarchie visuelle nette : photo, identité, dates, informations pratiques.
- Typographie limitée, mise en page respirante, couleurs retenues, transitions non intrusives.
- Accessible au clavier ; contrastes et tailles de cibles utilisables sur mobile.
- Maillage : boutons de zoom non redondants, réinitialisation claire, zoom molette/pince prévisible, pourcentage réellement utile.
- Portraits d'avis de décès : harmonisation non destructive, ne pas déformer les visages ou altérer les carnations ; aucun filtre automatique sur pièces justificatives, avatars ou hommages.
- Mesures à obtenir : tests utilisateurs sur navigation mobile, accessibilité, temps de chargement et stabilité visuelle.

## Statut

HCT-01 **constitué dans la documentation**. Ni audit complet, ni nouvelle intégration IA, ni installation FreeLLM, ni publication, ni changement d'infrastructure effectués dans cette opération. La bibliothèque FPL et FSRR demeure autonome ; ces textes peuvent être utilisés comme référentiel pour une revue ultérieure autorisée.
