# FLOORENCE — Sécurité, Robustesse et Résilience (FSRR)

Version 0.1.0 — 30 octobre 2026 — **Documentation et prompts de contrôle uniquement.** Aucun audit exécuté, aucun score de sécurité attribué, aucune modification Supabase, aucune installation, aucune publication.

## Pourquoi ce référentiel

- **Sécurité :** empêcher lecture, mutation ou divulgation non autorisées des profils, mémoriaux, fichiers, relations, données de paiement et secrets.
- **Robustesse :** gérer correctement entrées invalides, erreurs de réseau, doublons, courses concurrentes, données lacunaires et réponses inattendues de l'IA.
- **Résilience :** poursuivre ou restaurer les services essentiels après panne d'Edge Function, indisponibilité du fournisseur de paiement, incident Supabase ou perte d'un déploiement.

Références méthodologiques externes : OWASP ASVS 5.0.0 https://asvs.owasp.org/ et NIST SP 800-34 Rev.1 https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final . Ces ressources constituent des **références de vérification**, pas des certifications ni des prompts originaux de prompts.chat. Les trois prompts ci-dessous sont des **créations originales adaptées à Floorence** et complètent la bibliothèque FPL existante.

## FPL-SEC-001 — Audit de sécurité à périmètre contrôlé

**Source :** principes de vérification OWASP ASVS 5.0.0 ; adaptée pour un usage Floorence, non importée textuellement de prompts.chat.  
**Objet :** identifier les risques effectivement démontrables dans les autorisations, RLS, fonctions Edge, stockage, authentification et données sensibles.  
**Prompt Floorence v1 :**

> Tu réalises une revue de sécurité de Floorence strictement non destructive. Cartographie seulement les actifs, frontières de confiance et opérations dans le périmètre autorisé : Front-Office, Back-Office, Supabase, Edge, Storage et RIBENGA. Pour chaque contrôle, écris (1) la règle attendue, (2) la preuve ou test observable, (3) la conclusion PASS / FAIL / NON TESTÉ / NON APPLICABLE, (4) l'impact métier et (5) le correctif minimal suggéré. Vérifie en priorité l'isolation entre titulaires, les autorisations du Back-Office, l'absence de service-role dans le navigateur, les règles Storage et les accès aux données mémorielles. N'utilise aucune donnée réelle hors autorisation. Ne modifie ni politique RLS ni données et ne déploie rien sans GO distinct. Ne déclare jamais Floorence « sécurisé » à partir du seul succès des tests unitaires.

**Données d'entrée :** commit/branche, description de schéma et politiques, limites d'accès, scénarios fictifs.  
**Résultat attendu :** registre des vulnérabilités classées selon gravité, exploitabilité, exposition et preuve ; propositions minimales de correction.  
**Tests de référence :** un utilisateur A ne lit pas les champs privés de B ; une identité sans rôle n'appelle pas les fonctions privilégiées ; le stockage privé refuse l'accès public ; les secrets n'apparaissent pas dans les bundles/logs.  
**Statut :** ADAPTÉ — pas d'audit lancé.

## FPL-ROB-001 — Tests de robustesse métier et technique

**Source :** principes généraux de tests de robustesse ; prompt original Floorence.  
**Objet :** préserver la cohérence sous entrées invalides, gestes simultanés et erreurs de dépendance.  
**Prompt Floorence v1 :**

> Sur une fonctionnalité Floorence explicitement désignée, décris les invariants métier et le parcours nominal avant les défaillances possibles. Construis une matrice limitée de tests : champs absents/invalides, relecture et double clic, requêtes concurrentes, timeouts, réponses incomplètes de fournisseurs, événements reçus plusieurs fois, utilisateurs sans civilité, homonymes, mémorial absent, corpus ISP tronqué. Pour chaque scénario, détermine l'état attendu, le comportement serveur, le message utilisateur et la vérification d'absence de mutation indue. Ne change pas la formule ISP, les règles de civilité immuable ou les états de paiement. Exécute seulement des tests autorisés, avec fixtures fictives, et signale précisément ce qui reste non testé.

**Données d'entrée :** fonctionnalité, invariants, contrat API et fixtures fictives.  
**Résultat attendu :** matrice et résultats d'essais reproductibles, défauts classés et correctifs limités.  
**Tests de référence :** geste compté une seule fois ; paiement confirmé de manière idempotente ; même civilité enregistrée réutilisable mais pas remplaçable ; ambiguïté ISP non convertie en classement fictif ; erreur IA ne crée pas d'assertion factuelle.  
**Statut :** ADAPTÉ — pas de tests lancés.

## FPL-RES-001 — Continuité d'activité et reprise après incident

**Source :** NIST SP 800-34 Rev.1, stratégie de continuité et plan de reprise ; prompt original Floorence.  
**Objet :** déterminer comment protéger et récupérer les fonctionnalités essentielles sans surdimensionner le MVP.  
**Prompt Floorence v1 :**

> Établis pour Floorence un plan de continuité proportionné au MVP. Identifie les services critiques : consultation des mémoriaux, gestion des hommages, authentification, paiement, RIBENGA et administration. Évalue l'impact d'une indisponibilité, les dépendances et le risque de perte de données. Propose des objectifs RTO (durée de reprise) et RPO (perte de données tolérée) à faire valider, sans les présenter comme engagements existants. Pour chaque panne simulée (hébergement web, Supabase, Edge, paiement, fournisseur d'IA), définis détection, dégradation sûre, communication, restauration et vérification post-reprise. Vérifie l'existence réelle des sauvegardes et d'un test de restauration avant de revendiquer une capacité de reprise. Aucune restauration, simulation destructive ni bascule de production sans GO spécifique.

**Données d'entrée :** architecture actuelle, offres et limites des fournisseurs, capacité de sauvegarde, contraintes de budget.  
**Résultat attendu :** tableau des services critiques, objectifs proposés, procédures de réponse, exercices non destructifs et preuves de reprise.  
**Tests de référence :** restauration testée sur environnement isolé ; absence de double débit après reprise ; indisponibilité de RIBENGA n'empêche pas les pages de mémoriaux si découplage disponible ; rollback documenté.  
**Statut :** ADAPTÉ — aucun RTO/RPO validé, aucune restauration exécutée.

## Priorités adaptées à Floorence

| Priorité | Contrôle initial | Critère de réussite | Vérification actuelle |
| --- | --- | --- | --- |
| P0 | Autorisation et isolement des profils, hommages, certificats et mémoriaux | Tests négatifs par rôles et comptes distincts | NON AUDITÉ DANS CE CHANTIER |
| P0 | Flux paiement et comptage des cierges/fleurs | Écritures uniques, origine des notifications vérifiée, pas de double comptage | NON AUDITÉ |
| P0 | Sauvegardes et restauration | Sauvegarde disponible et récupération vérifiée en environnement isolé | NON AUDITÉ |
| P1 | Dépendances Edge et fournisseur IA | Échec explicite et dégradation sûre ; pas de réponse RIBENGA inventée | NON AUDITÉ |
| P1 | Secrets, stockage, contrôle d'accès Back-Office | Contrôle de configuration et accès interdits refusés | NON AUDITÉ |
| P1 | Reprises, timeouts, concurrence et doublons | Tests reproductibles sans mutation des données réelles | NON AUDITÉ |
| P2 | Observabilité, alertes et procédure incident | Signal utile, responsable et action documentée | NON AUDITÉ |

## Gouvernance

1. Le référentiel est d'abord documentaire : ne pas injecter de prompts dans le système RIBENGA automatiquement.
2. Conserver les résultats horodatés, le SHA, l'environnement et les preuves ; une politique SQL « présente » ne vaut pas test de refus.
3. Les scénarios offensifs sont exclusivement autorisés, isolés et non destructifs. Ne jamais publier secrets ou informations sensibles dans GitHub.
4. Les contrôles n'imposent pas une infrastructure disproportionnée : le niveau doit être ajusté aux risques, données et services du MVP.
5. Les états passent de ADAPTÉ à TESTÉ puis VALIDÉ seulement après essai documenté ; PASS ne couvre que les contrôles réellement exécutés.
6. Le modèle ISP, son attribution et sa documentation originale restent inchangés.

## Suite proposée (pas commencée)

Phase 1 — **État des lieux en lecture seule** : architecture et matrice des risques.  
Phase 2 — **Tests ciblés de sécurité et robustesse** : comptes fictifs, scénarios négatifs, aucun paiement réel.  
Phase 3 — **Plan de résilience vérifiable** : paramètres sauvegardes, objectifs RTO/RPO proposés, test de restauration isolée si autorisé.  
Phase 4 — **Correctifs après validation explicite** : traiter uniquement les risques confirmés.
