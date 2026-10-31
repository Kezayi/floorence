# HCT-01 — Mandat P0 validé

Date : 31 octobre 2026

## Décision du promoteur

Accord explicite sur la priorité initiale du Haut Conseil Technique : contrôles critiques **comptes et données**, **transactions**, **sauvegardes et reprise** avant nouvelle infrastructure.

## Périmètre autorisé

Diagnostic **en lecture seule et non destructif** ; état des lieux du code, des politiques RLS visibles, des flux de paiement et gestes, des sauvegardes documentées. Tests isolés sur fixtures lorsque possible, sans toucher aux données réelles ni aux paiements réels. Constituer une matrice de preuves PASS / FAIL / NON TESTÉ et classer les risques.

## Hors périmètre sans GO distinct

Modifier des politiques RLS, schémas ou données de production ; rotation de secrets ; déploiements Edge ou web ; restauration ; simulation de panne sur production ; installations de nouveaux services ou paiements tests réels.

## Séquence

1. Comptes / contrôle d'accès / RLS / Storage.
2. Transactions / idempotence / rapprochement des gestes.
3. Sauvegardes / vérification des possibilités de restauration et proposition RTO/RPO.
4. Synthèse avec preuves, gravité et correctifs minimaux à soumettre au promoteur.

**Statut : mandat approuvé. Aucun résultat d'audit établi par ce document.**
