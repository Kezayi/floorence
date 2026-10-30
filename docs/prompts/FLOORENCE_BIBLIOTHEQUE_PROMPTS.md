# FLOORENCE — Bibliothèque de prompts (FPL)

Version 0.1.0 — 30 octobre 2026. **Référentiel documentaire uniquement : aucun prompt n'est activé dans l'application.**

## Finalité et règles

Cette bibliothèque documente les prompts issus de sources externes, leur origine et leurs adaptations originales pour Floorence, RIBENGA, Lovable et la stratégie de la plateforme. **Aucun prompt externe ne peut supplanter l'ISP déterministe, les contrôles d'identité, les RLS Supabase, les règles de confidentialité ou les autorisations du promoteur.**

Chaque fiche a un identifiant stable, une source et sa provenance, un besoin, une adaptation, un prompt Floorence original, des critères de test et un statut. États possibles : REPÉRÉ, ADAPTÉ, TESTÉ, VALIDÉ, ACTIF, SUSPENDU, ARCHIVÉ. Les trois entrées ci-dessous sont **ADAPTÉES, NON TESTÉES ET NON ACTIVES**. Aucune copie intégrale des textes externes.

## Sommaire

| ID | Titre | Source | Usage | Statut |
| --- | --- | --- | --- | --- |
| FPL-DEV-001 | Correctif chirurgical et vérifiable | Karpathy Guidelines, @yazz4444 | Lovable, GitHub, Supabase | ADAPTÉ |
| FPL-CNS-001 | Conseil contradictoire probant | Debate Coach, prompts.chat | Décisions stratégiques | ADAPTÉ |
| FPL-ARC-001 | Architecture proportionnée | Ultrathinker, prompts.chat | Choix techniques | ADAPTÉ |

## FPL-DEV-001 — Correctif chirurgical et vérifiable

**Source vérifiée :** Karpathy Guidelines, @yazz4444, https://prompts.chat/prompts/cmny4rpjq0003jy08nopcvben_karpathy-guidelines  
**Concept source :** expliciter les hypothèses, éviter la surconception, faire des changements minimaux, vérifier les résultats.  
**Adaptation Floorence :** contrôle de consommation Lovable, distinction entre code, migration, Edge déployée, publication et recette authentifiée.

**Prompt Floorence v1 (rédaction originale)**

> Tu modifies Floorence uniquement sur le périmètre explicitement autorisé. Inspecte les fichiers concernés et identifie les invariants : comptes, mémoriaux, paiements, RLS, ISP, relations RIBENGA. Décris brièvement la cause et les critères de réussite. Modifie le minimum de lignes nécessaires, sans refactorisation adjacente. Écris et exécute les tests pertinents. N'annonce jamais « validé en production » sur la base de tests locaux ou simulés. Rends compte séparément du code, des tests, de la migration réellement appliquée, du déploiement Edge, de la publication web et de la recette authentifiée. Fournis SHA, limites et crédits effectivement observés. Aucun déploiement non autorisé.

**Entrées :** bug, reproduction, contrainte de scope, GO, version.  
**Sorties :** cause, changement précis, preuves de test et état de livraison.  
**Tests d'acceptation :** pas de mutation hors scope ; test du bug ; non-régression ; absence de fausse affirmation de succès.  
**Limite :** économie de crédits ne signifie jamais absence de contrôles critiques.  
**État : ADAPTÉ** — validation promoteur requise.

## FPL-CNS-001 — Conseil contradictoire probant

**Source vérifiée :** Debate Coach, rubrique Teaching & Instruction, https://prompts.chat/categories/teaching-instruction  
**Concept source :** préparer des arguments, objections, réfutations et conclusions fondées sur des éléments.  
**Adaptation Floorence :** priorité à l'exactitude plutôt qu'à la persuasion, critique des modèles B2B2C, partenariats et décisions de gouvernance.

**Prompt Floorence v1 (rédaction originale)**

> Agis comme un conseiller critique de Floorence. Reformule la décision et ses critères de réussite. Sépare les faits vérifiés, les hypothèses et les inconnues. Présente l'argument le plus solide en faveur de la décision et le plus solide contre elle. Teste les risques économiques, techniques, juridiques, institutionnels et réputationnels sans inventer de données. Propose les principales alternatives et leurs arbitrages, puis recommande l'option la mieux justifiée. Identifie les preuves supplémentaires nécessaires avant tout engagement irréversible. Ne favorise pas artificiellement l'option du promoteur.

**Entrées :** décision, objectifs, chiffres sourcés, contraintes.  
**Sorties :** analyse contradictoire et recommandation conditionnée par les preuves.  
**Tests d'acceptation :** au moins une objection sérieuse ; chiffres non inventés ; incertitudes signalées.  
**Limite :** une discussion contradictoire ne vaut pas audit juridique ou financier.  
**État : ADAPTÉ** — validation promoteur requise.

## FPL-ARC-001 — Architecture proportionnée

**Source vérifiée :** Ultrathinker, rubrique Agent Workflows, https://prompts.chat/categories/agent-workflows  
**Concept source :** inspecter le dépôt et ses conventions avant l'implémentation, raisonner rigoureusement sans suringénierie.  
**Adaptation Floorence :** préserver l'architecture existante, refuser l'expansion implicite des besoins et tester la réversibilité.

**Prompt Floorence v1 (rédaction originale)**

> Examine un besoin d'architecture Floorence à partir de l'existant réellement observable. Recense les parcours concernés, contrats de données, contrôles d'accès et dépendances. Distingue le besoin explicitement autorisé des idées supplémentaires. Compare une solution minimale dans l'architecture actuelle à une solution structurelle seulement si elle est justifiée. Précise coût, risques, migration, réversibilité, sécurité et critères de recette. Recommande la solution la plus simple satisfaisant tous les critères. Ne code et ne déploie rien sans GO explicite.

**Entrées :** besoin, modules concernés, contraintes, état GitHub/Supabase.  
**Sorties :** diagnostic, options comparées, choix, plan de vérification.  
**Tests d'acceptation :** pas de dépendance injustifiée ; conservation des parcours ; RLS et historiques respectés.  
**Limite :** ce prompt ne remplace pas les audits techniques effectifs.  
**État : ADAPTÉ** — validation promoteur requise.

## Gouvernance documentaire

1. Sélectionner de nouvelles sources selon un besoin réel ; ne pas importer automatiquement toute la plateforme prompts.chat.
2. Pour chaque ajout : conserver URL source, auteur lorsqu'il est établi, date consultée, licence vérifiée ou inconnue, justification et différence par rapport à la source.
3. Faire relire et tester la fiche avant de la passer à VALIDÉ ou ACTIF ; **aucune activation dans RIBENGA sans GO explicite**.
4. Versionner chaque modification ; archiver les versions utilisées dans des décisions importantes.
5. Ne jamais envoyer secrets, profils, mémoriaux ou données Supabase à une bibliothèque externe.
6. La mention de propriété intellectuelle de Michel NGWA AYI sur l'ISP reste indépendante des contributions externes. Ne pas revendiquer comme création propre le texte ou l'idée d'un auteur externe.
7. La licence doit être vérifiée pour chaque contenu externe avant toute copie ou redistribution ; les formulations originales ci-dessus ne reproduisent pas les prompts sources.

## Modèle des prochaines fiches

- Identifiant FPL-[DOMAINE]-[NUMERO], titre, version et statut
- Source externe : titre, URL, auteur, date de consultation, licence
- Problème spécifique à Floorence et raison de sélection
- Principes repris et transformations apportées
- Texte du prompt Floorence, paramètres d'entrée et résultat attendu
- Invariants, confidentialité, limitations et risques
- Cas de test, résultats et approbation du promoteur
- Historique des versions et éventuel emplacement d'activation
