# MVETT FLOORENCE — CHANTIER 001 : RIBENGA
**Statut permanent : évolutif** · [Registre GitHub Issue #1](https://github.com/Kezayi/floorence/issues/1)

## Pièces documentaires
1. [01 — Délibérations, verbatims et chronologie](01-DELIBERATIONS.md)
2. [02 — Registre des décisions et des limites d'autorisation](02-DECISIONS.md)
3. [03 — Requête intégrale du GO DIAGNOSTIC RIBENGA-00](03-MANDAT-RIBENGA-00.md)
4. [04 — Restitution intégrale du rapport RIBENGA-00](04-RAPPORT-RIBENGA-00.md)

## Référentiel appliqué au premier chantier

**« Savoir d'où tu viens pour parfaire où tu vas, à partir d'où tu es. »**

| Dimension MVETT | RIBENGA — état au 27 octobre 2026 | Sources et statut |
|---|---|---|
| **Savoir d'où l'on vient — HISTORIQUE** | Discussion de la vision RIBENGA, de la portée relationnelle, des gestes Cierges/Fleurs, des confirmations communautaires, du Fil d'Ariane et de la doctrine « TRIER AVANT DE TRAITER ». Les arguments, corrections et arbitrages sont conservés avant tout GO BUILD éventuel. | [01 — Délibérations](01-DELIBERATIONS.md) et [02 — Décisions](02-DECISIONS.md). Historique rétrospectif **partiel** lorsque les transcriptions intégrales manquent ; **aucun GO BUILD d'évolution attesté dans ces débats**. |
| **Où tu vas — NOUVELLE REQUÊTE** | Préparer l'évolution de RIBENGA en intelligence relationnelle explicable, sur les données exclusivement Floorence. La requête opérationnelle explicite a été **RIBENGA-00 : audit d'écart en lecture seule** ; RIBENGA-01 a été envisagé, sans GO BUILD. | [01 — Délibérations](01-DELIBERATIONS.md), [03 — Mandat RIBENGA-00](03-MANDAT-RIBENGA-00.md), [02 — Décisions](02-DECISIONS.md). **Aucun nouveau développement autorisé.** |
| **Où tu es — AUDIT / ÉTAT DES LIEUX À DATE** | Audit RIBENGA-00 réalisé le **25 octobre 2026** : socle de recherche, graphe et inférences existants dans le code ; limites sur identité, corroboration, provenance et filtrage des contenus ; fonctionnement réel en production non vérifié. | [04 — Rapport RIBENGA-00](04-RAPPORT-RIBENGA-00.md). **État daté, non preuve de déploiement.** |

À **chaque nouvelle demande RIBENGA**, ajouter sa formulation originale (objectif), rappeler l'historique des arbitrages pertinents (origine), puis actualiser l'audit de l'état réel (présent). Ce cycle doit se répéter sans jamais clôturer définitivement le chantier.

## Interdépendances et impacts — appréciation initiale (27 octobre 2026)
**Référentiel MVETT :** [analyse transversale obligatoire dans la charte](../README.md). **Nature du relevé : identification initiale et hypothèses à confirmer** : le rapport RIBENGA-00 n'est pas un audit exhaustif des impacts inter-chantiers et n'atteste pas les conditions de production.

| Chantier ou domaine connexe | Lien et impact DIRECT possible | Impact INDIRECT possible | Appréciation / statut |
|---|---|---|---|
| **Maillage / Lignage** | Les relations, leurs statuts et les graphes partagent des mécanismes avec RIBENGA. | Erreur d'identité, d'inférence ou d'affichage répercutée sur les parcours relationnels. | **Majeur potentiel**, lien technique observé dans RIBENGA-00 ; conséquences exactes à auditer. |
| **Gestion des mémoriaux / fusion de doublons** | RIBENGA consomme des relations et des identifiants de mémoriaux, dont des projections de familles fusionnées. | Incohérences possibles en cas de fusion, révocation ou suppression d'une relation. | **Modérée à majeure, à confirmer** ; ne pas confondre confirmation communautaire et confirmation de fusion. |
| **Livre d'or, Cierges et Fleurs / paiements** | Les contributions sont des sources envisageables d'analyse de constance. | Incitations artificielles, mauvaise interprétation des dépenses ou risque de qualification erronée. | **Indéterminée**, aucune mesure de portée n'est implémentée/attestée à cette date. |
| **Recherche, RAG, modération et confidentialité** | `social-search` et le RAG manipulent des hommages et relations documentées. | Exposition potentielle de données masquées ou inférence sur des personnes sans droit d'accès. | **Majeur potentiel**, écart de filtre relevé dans le code ; impact réel non vérifié. |
| **Authentification, profils, photos, Voir+** | Toute confirmation communautaire dépend de l'identification des comptes, des permissions et de l'accès aux portraits. | Confirmations artificielles, homonymies, exposition de profils ou liens privés. | **Majeur potentiel**, contrôle des politiques réelles encore non achevé. |
| **Terres / géographie** | L'analyse sociologique pourrait réutiliser la géographie des personnes et des hommages. | Réidentification, exposition de la localisation, biais de portée géographique. | **À vérifier** ; dépendance conceptuelle, non attestée comme implémentée. |

**Important :** ces lignes ne créent pas de nouveaux chantiers GitHub et n'affirment pas qu'ils disposent déjà d'une Issue permanente. Quand des dossiers seront ouverts, établir des **renvois réciproques**. La mesure précise doit être actualisée avant un BUILD.

### Prérequis essentiels à vérifier avant toute future intervention RIBENGA dépendante
| Prérequis | Preuve nécessaire | Statut au 27/10/2026 |
|---|---|---|
| **GO BUILD explicite, délimité** | Décision du promoteur inscrite dans le chantier | **Non donné** pour RIBENGA-01 |
| **Droits d'accès applicables (profils/photos/relations)** | Vérification code + règles RLS effectives selon le changement | **Non vérifié intégralement** |
| **Qualité des identifiants / liens** | Définition et test de non-fusion des homonymes + provenance | **Écarts observés** |
| **Filtres de visibilité recherche / RAG** | Vérification/correction puis tests sur sources visibles et masquées | **Écart code identifié ; effet déployé non attesté** |
| **Schéma/permissions d'une confirmation communautaire** | Spécification + validations de sécurité et de non-régression | **Absent ou non vérifié selon fonction**, à concevoir |
| **Tests des parcours partagés** | Résultats de recette inter-chantiers enregistrés | **Non exécutés dans RIBENGA-00** |

**Interprétation :** ces statuts **ne suspendent pas toute la MVP Premium** ; ils conditionnent uniquement l'exécution des interventions qui en dépendent. La base Supabase partagée est acceptée pendant la MVP, la séparation DEV/PROD reste un jalon **avant GoLive**.

## Situation initiale
- RIBENGA : moteur de recherche et d'inférence existant ; projet d'évolution en intelligence relationnelle explicable, fondée exclusivement sur les données autorisées de Floorence.
- **RIBENGA-00** : mandat d'audit approuvé et exécuté en lecture seule ; **aucun GO BUILD** pour les évolutions proposées.
- La séparation développement privé / production publique est prévue avant GoLive ; pas de condition préalable bloquante pendant la MVP Premium.
- Les échanges sont consignés **avant** toute future réalisation technique. Les textes antérieurs dont la transcription exacte n'est pas accessible restent identifiés comme **SYNTHÈSE / À COMPLÉTER**, pas comme verbatim.

## Références
- Lovable : https://lovable.dev/projects/2148d906-9829-472d-9b0b-8598bb512beb
- Mandat audit : `umsg_01m5t596m6ennvde4zk91hhhnc` · `thread_id=main`
- Dernier commit de référence consulté : `3a781d3a1a58daeae463e3c703bd5321227b58df`
- RIBENGA-01 : fiabilisation proposée, **NON AUTORISÉE EN BUILD**.

**La chronologie est ouverte et ne doit pas être clôturée.**
