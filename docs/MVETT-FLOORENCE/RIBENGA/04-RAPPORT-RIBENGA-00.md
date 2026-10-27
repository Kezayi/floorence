# RIBENGA-00 — RAPPORT D'AUDIT LOVABLE
*Pièce MVETT FLOORENCE · résultat de la requête `umsg_01m5t596m6ennvde4zk91hhhnc` · `thread_id=main`.*

**STATUT : réponse Lovable `completed`, coût rapporté `cost_credits=1`. Aucun GO BUILD n'en découle.**
**TRANSCRIPTION : le corps du rapport de Lovable, sans les métadonnées techniques internes de ses appels d'outil.**

---

**RIBENGA-00 — Mandat officiel — 25/10/2026 — lecture seule, restitution dans le chat**
Ce tour : une recherche ciblée dans 6 fichiers. Je n'ai lu aucune donnée de personne et fait aucun appel en base ni à une IA.
Légende : **CC** = confirmé dans le code · **INF** = déduit · **NV** = non vérifié. Le fonctionnement en production n'a jamais été attesté.

### I. Synthèse
RIBENGA a une bonne base pour **retrouver** des informations. Il n'a aucune base pour **qualifier** un lien.
- **Points solides :**
  - recherche du Back-Office sans IA, avec contrôle de visibilité à chaque recherche (0042) ;
  - le Lignage est séparé du reste (0018) ;
  - la fiche Voir+ est protégée par le serveur (0030).
- **Risque dominant :** plusieurs parcours transforment une déclaration, ou un simple nom identique, en lien affiché comme sûr. Et la recherche en langage naturel envoie des textes d'hommages à un service d'IA.

### II. Matrice des écarts
| Capacité | État | Preuve | Écart | Réutilisation la plus sobre |
|---|---|---|---|---|
| Sources et RAG | Vérifié dans le code | `rag_hybrid_search` (0032, 0042), vecteurs locaux (0033, 0034) | Recherche par le sens inactive | Garder tel quel |
| Prestataire IA externe | Partiel | `social-search` appelle l'IA Lovable (ligne 204, CC) | Des données sortent vers le prestataire. Contraire à la règle « pas d'IA externe » de RAGet | Décision du promoteur |
| Qualification des données | Partiel | 0042 filtre les contenus publiés, non masqués et acceptés. **`social-search` ne filtre que `is_hidden`** : un hommage masqué par la modération ou supprimé peut encore être lu (lignes 115 à 121, CC) | Faille de confidentialité et de modération | Aligner son filtre sur celui de 0042 |
| Relations | Partiel | `memorial_relations` : en attente → accepté par le gestionnaire (RequestLinkDialog, InferredLinkSuggestions, CC) | « Accepté » est traité comme une preuve | Ajouter un état affiché, sans changer le mode d'acceptation |
| Confirmations communautaires | Absent | Aucun libellé ni table. `memorial_merge_confirmations` sert uniquement aux fusions de mémoriaux (CC) | Mécanisme entièrement à créer | Petite table dédiée, rattachée à un lien |
| Code par SMS | Absent | Connexion par lien e-mail uniquement (CC) | — | Ne pas en faire une preuve d'identité ou de filiation |
| Gestes | Partiel | Le paiement ouvre l'accès à Voir+ (0030 : `success`, montant positif) ; les totaux servent au score de ferveur | Dépense et visibilité sont liées | Afficher la régularité, pas les montants |
| Graphe avec portraits et Voir+ | Partiel | RelationshipGraph2D, LineageNodeCard, ContributorRelationalSheet | Les réponses de RIBENGA n'ont pas de graphe | Relier les résultats au graphe existant |
| Déductions et statuts | Partiel, risqué | `relationshipInference.ts` donne un niveau « high » à partir du libellé seul (ligne 199). `searchWithRelations.ts` conclut « Même personne » quand **deux noms sont identiques**. Le graphe regroupe les personnes par nom quand il n'y a pas d'identifiant de compte (lignes 148 à 174) | Homonymes pris pour une seule personne. Déductions présentées comme certaines | Afficher « hypothèse » et ne jamais regrouper sans identifiant |
| Provenance | Partiel | Source affichée dans la recherche par mots ; aucune dans les réponses de l'IA | Pas de traçabilité | Citer les passages déjà renvoyés |
| Portée et centralité | Partiel | ShortestPath, « super-connecteurs » dans le Back-Office | Le libellé suggère une légitimité à être médiateur | Renommer, et calculer seulement à la demande |
| Confidentialité des photos et profils | Non vérifié | La vue `profiles_public` est introuvable dans `drizzle/` | Règles d'accès réelles non inspectées | Lire les règles avant tout chantier |
| Anti-manipulation | Partiel | Filtre par motifs et consignes données à l'IA (`social-search`, lignes 12 à 25 et 178) | Pas de protection contre les faux comptes ni les confirmations en boucle | À concevoir avec les confirmations |

### III. Trois risques principaux
1. **Liens inventés par le système (CC).** Mêmes noms = même personne ; libellé déclaré = niveau « high ». **Réponse minimale :** retirer le regroupement par nom et passer ces déductions en « hypothèse ».
2. **Confidentialité (CC).** `social-search` peut lire des hommages masqués par la modération ou supprimés, puis les envoyer à l'IA. **Réponse minimale :** un correctif d'une ligne de filtre, après GO.
3. **Confirmation artificielle (INF).** Sans règle d'indépendance, quelques comptes proches pourraient confirmer un faux lien. **Réponse minimale :** un compte = une confirmation ; un déclarant ne peut pas confirmer son propre lien ; pas de confirmation automatique.

### IV. Tranche verticale 01
**Scénario :** une personne se déclare fils → déclaration en attente → acceptation par le gestionnaire → confirmations facultatives → état discret → graphe → réponse prudente de RIBENGA.
- **Ce qui sert tel quel :** RequestLinkDialog, `memorial_relations`, LineageTree et LineageNodeCard, ContributorRelationalSheet (Voir+), RAGetSourceSearch, `rag_hybrid_search`.
- **Plus petite extension :**
  1. Une table de confirmations (lien, compte, date), avec règles d'accès et une fonction serveur pour confirmer ou retirer sa confirmation.
  2. Un badge « Lien déclaré · Non confirmé » ou « Confirmé par X membres » dans LineageNodeCard.
  3. Un bouton discret « Je confirme ce lien », sans relance.
  4. Dans RAGetSourceSearch, une ligne de provenance calculée sans IA.
- **Dépendances :**
  - la base est partagée : une nouvelle table prend effet immédiatement ;
  - SEC-AUDIT-01 doit être clos, ou le promoteur doit lever le gel.
- **Critères d'acceptation :**
  - aucun confirmateur n'est affiché publiquement ;
  - le déclarant ne peut pas confirmer son propre lien ;
  - un lien retiré ou refusé n'est jamais compté ;
  - la photo affichée est autorisée, avec une image neutre sinon ;
  - aucune régression sur Lignage, Maillage, Voir+ et fusion des mémoriaux ;
  - des tests serveur sur les règles d'accès.

### V. Séquencement des futurs BUILDs
| Étape | Contenu | Complexité |
|---|---|---|
| B0 | Lecture des règles d'accès photos, profils et `profiles_public` | Très faible |
| B1 | Correctifs de sécurité : filtre de `social-search`, fin du regroupement par nom, libellé « hypothèse » | Faible |
| B2 | Table et fonction de confirmation, avec tests | Moyenne |
| B3 | Badge et bouton | Faible |
| B4 | Provenance et lien vers le graphe dans RIBENGA | Moyenne |

Pas de chiffrage en crédits possible.

### VI. Ce qui est établi ou non
- **Code :** les constats CC ci-dessus.
- **Déploiement :** inconnu. Une migration présente dans le dépôt ne prouve pas son application.
- **Données :** non inspectées. Je n'ai lu ni les règles d'accès réelles, ni les données sources de `v_social_inferences`, ni le contenu des hommages.

### VII. Confirmation
**AUCUN BUILD / AUCUN FICHIER / AUCUNE MIGRATION / AUCUN TEST ACTIF / AUCUNE MUTATION / AUCUN DÉPLOIEMENT.**
Crédits consommés : non déterminés, deux lectures seulement.

---

## Annotations MVETT après réception — distinctes du rapport original
1. La réponse de l'outil indique `cost_credits=1`, alors que l'agent écrit « crédits consommés : non déterminés ».
2. **Arbitrage ultérieur du promoteur :** SEC-AUDIT-01 n'est pas un gel général des développements de la MVP Premium. Le rapport ci-dessus reste conservé **sans réécriture**.
3. **Nuance conceptuelle :** l'exclusivité de Floorence comme *source des données* ne prohibe pas en soi tout prestataire IA ; les flux sortants exigent cependant une décision d'architecture et de confidentialité.
4. **Points corroborés par lecture de code indépendante du Conseil :** regroupement par nom dans `searchWithRelations.ts` et `RelationshipGraph2D.tsx` ; niveaux `high` produits par `relationshipInference.ts` ; requête `guestbook_posts` filtrée par `is_hidden=false` dans `social-search/index.ts` ; appel externe `https://ai.gateway.lovable.dev/v1/chat/completions`. Aucune inspection de données privées et aucune certification de déploiement.
5. Ce rapport est un **diagnostic**, pas un test de production, pas une autorisation ni une implémentation.

**Voir aussi :** [Délibérations](01-DELIBERATIONS.md), [Décisions](02-DECISIONS.md), [Mandat envoyé](03-MANDAT-RIBENGA-00.md).
