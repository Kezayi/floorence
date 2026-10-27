# RIBENGA-00 — MANDAT TRANSMIS À LOVABLE
**Source** : message effectivement envoyé au connecteur Lovable, `umsg_01m5t596m6ennvde4zk91hhhnc`, `thread_id=main`, `plan_mode=true`, `max_mode=false`, `wait=false`.

**Autorisation originelle du promoteur — VERBATIM :**
> « GO pour RIBENGA-00 — Audit d'écart fonctionnel et technique
> Mode : lecture seule (Chat Gratuit) · Aucun BUILD · Floorence.Lovable.app »

## Texte transmis à Lovable (transcription du mandat)
FLOORENCE — MANDAT OFFICIEL RIBENGA-00
AUDIT D'ÉCART FONCTIONNEL ET TECHNIQUE — GO DIAGNOSTIC EXPLICITE DU PROMOTEUR
DATE : 25 octobre 2026
ENVIRONNEMENT : projet Floorence Lovable (floorence.org / aperçu Lovable), projet 2148d906-9829-472d-9b0b-8598bb512beb
MODE : CHAT GRATUIT SI DISPONIBLE · PLAN/CHAT (PAS BUILD) · CRÉDITS STRICTEMENT MINIMAUX · LECTURE SEULE · NO REGRESSION
AUCUN NOUVEAU GO BUILD. PAS DE DÉPLOIEMENT. PAS DE FICHIER plan.md.

OBJECTIF
Confronter la doctrine RIBENGA approuvée par le promoteur aux capacités EXISTANTES du code et du schéma Floorence afin de préparer un cahier des charges très ciblé. Réutiliser au maximum l'existant : ne pas reconstruire RIBENGA, le Maillage, la RAG ou le Lignage.

DOCTRINE À ÉVALUER, SANS TENTER DE L'IMPLÉMENTER
1. Principe cardinal : « Nous ne chercherons pas à construire le plus complexe, mais le plus utile au plus grand nombre, le plus juste, le plus intelligent et le plus durable. »
2. RIBENGA tire ses données d'analyse UNIQUEMENT de Floorence : aucun enrichissement Web/réseau social/base externe. Distinguer source des données et prestataire IA éventuel (flux sortants de données à vérifier). Respecter les permissions et la confidentialité ; jamais inventer un lien ou une réponse.
3. « TRIER AVANT DE TRAITER » : provenance et identité, corroboration, intégrité, cohérence, anti-poisoning des contributions, protections contre prompt injection textuelle, distinction déclarations, relations acceptées, inférences, contestations ; éviter confirmation circulaire et fausses indépendances.
4. La lecture relationnelle RIBENGA est une HYPOTHÈSE EXPLICABLE, jamais verdict psychologique/social ni affirmation juridique. Distinguer faits enregistrés et interprétations ; dire « information indisponible / non étayée » quand nécessaire, proposer uniquement alternatives étayées.
5. Chaque réponse sur les liens humains doit être accompagnée d'un FIL D'ARIANE NON LINÉAIRE, graphe relationnel lisible sur mobile, personnes représentées par portraits AUTORISÉS cliquables vers « Voir+ » ; fallback neutre si photo indisponible ; différentier liens déclarés, communautairement corroborés et inférés et donner la provenance autorisée de chaque chemin.
6. Confirmation VOLONTAIRE, DISCRÈTE, non intrusive, des relations déclarées par d'autres membres : affichages « Lien déclaré · Non confirmé » ou « Confirmé par X membres ». Un clic « Je confirme ce lien » envisagé ; absence de confirmation n'est pas un blâme. OTP téléphone éventuel prouve le contrôle du numéro, pas l'identité ou la filiation. Corroboration pondérée par proximité DOCUMENTÉE, fiabilité, diversité, indépendance, sans note publique de valeur humaine. Distinction essentielle : acceptation d'un lien entre mémoriaux, fusion/dédoublonnage de mémoriaux et confirmation communautaire d'une relation d'une personne avec un défunt ne sont PAS des mécanismes équivalents.
7. Gestes (Cierges, Fleurs) : constance, équité visible, transversalité, portée ; une moindre activité = moins de visibilité observée, jamais moins d'affection ; si contributions payantes ne pas assimiler dépense à confiance, influence ou valeur humaine.
8. Portée relationnelle : diversité de chemins, communautés, ponts/intermédiarité, géographie et générations, calcul à la demande sur sous-graphe plutôt que batch global. Ne pas présenter centralité structurelle comme causalité ou légitimité à être médiateur ; « les hommes jugent les hommes » ; la reconnaissance sociale (« frère d'une autre mère », patriarche, médiateur) n'est pas assimilable à la filiation biologique.
9. Gouvernance : aucun nouveau chantier fonctionnel avant validation des spécifications ; SEC-AUDIT-01 toujours PARTIAL (base Supabase potentiellement partagée preview/public), respecter ce gel. Toute implémentation nécessite NOUVEAU GO explicite du promoteur.

PISTES DE CODE À INSPECTER (EXISTENCE ALREADY OBSERVED, NOT PROOF OF LIVE DEPLOYMENT)
- src/lib/searchWithRelations.ts, src/pages/Search.tsx, src/components/search/RelationshipGraphSearch.tsx
- src/lib/relationshipInference.ts et src/lib/resolvedGraphs.ts
- src/components/memorial/RelationshipMaillage.tsx, RelationshipGraph2D.tsx, InferredRelationships.tsx, InferredLinkSuggestions.tsx, RequestLinkDialog.tsx
- src/components/memorial/ContributorRelationalSheet.tsx, GestureSummary.tsx, GestureButton.tsx, composants de confirmation/relation s'ils existent
- drizzle/migrations/0017, 0018, 0021, 0030, 0032, 0033, 0034 et 0042 (RAG hybride), autres schémas/politiques pertinents
- Suivre les chemins réellement utilisés par l'UI, les RPC/Edge Functions, RLS et les statuts des données. ATTENTION : une migration au dépôt ne prouve pas son déploiement effectif.
- Vérifier si « confirmations » existantes concernent exclusivement le MERGE entre mémoriaux, la validation admin ou bien le mécanisme communautaire demandé (ne pas les confondre).
- Porter attention aux déductions par simples NOMS d'auteurs, aux statuts confidence high/medium et à la logique d'identification des personnes ; débusquer les cas où des homonymes ou relations déclarées seraient pris pour preuves.
- Contrôler l'accès public aux photos, les données de profils de contributeurs et les permissions existantes, sans lire aucune donnée personnelle.

PÉRIMÈTRE STRICT
LECTURE SEULE DU CODE ET DES MÉTADONNÉES DE SCHÉMA/POLICIES SI ACCESSIBLES. Aucun SELECT de données de personnes, aucun email, SMS OTP, paiement, appel IA facturable, aucun compte, upload, essai réseau intrusif, test sur base partagée. AUCUNE MODIFICATION : ni code, fichier (y compris plan.md), DB, migration, bucket, règle RLS, configuration, rôle, secret, branch, git, déploiement ou publication. Ne pas créer un document ou un plan dans Lovable ; livrable seulement dans la réponse du CHAT. Ne pas entreprendre une investigation coûteuse au-delà d'un inventaire ciblé et représentatif. Si « chat gratuit » ne peut être garanti, minimiser les crédits, signaler consommation réelle.

LIVRABLE EN FRANÇAIS, COURT MAIS PRÉCIS
I. Synthèse exécutive : maturité réelle de RIBENGA et risque dominant.
II. MATRICE DES ÉCARTS : une ligne par capacité (sources/RAG, qualification des données, relations, confirmations communautaires, OTP, gestes, graphe photographique Voir+, inférences et statuts, provenance/traçabilité, portée/centralité, confidentialité, risques anti-manipulation). Colonnes : EXISTANT VÉRIFIÉ / PARTIEL / ABSENT / NON VÉRIFIÉ ; fichiers/RPC ou SQL précis ; écart ; réutilisation la plus sobre.
III. 3 RISQUES PRINCIPAUX (notamment hallucinations relationnelles, confidentialité, confirmation artificielle) avec preuve ou hypothèse explicite et réponse minimale possible.
IV. PROPOSITION « TRANCHE VERTICALE 01 » : un scénario unique de bout en bout (personne se déclare fils → confirmation communautaire facultative → état discret → graphe avec photo cliquable autorisée → réponse RIBENGA prudente avec provenance). Donner précisément les composants du socle réutilisables, la plus petite extension potentielle, dépendances et critères d'acceptation ; AUCUN CODE.
V. Séquencement minimal des futurs BUILDs et prérequis, avec estimation relative de complexité et consommation si possible, sans inventer un chiffrage financier.
VI. Séparer code existant, déploiement réel attesté ou inconnu et données non inspectées. Signaler ce que l'audit n'a pas pu confirmer.
VII. Confirmer : AUCUN BUILD / AUCUN FICHIER / AUCUNE MIGRATION / AUCUN TEST ACTIF / AUCUNE MUTATION / AUCUN DÉPLOIEMENT.

NE LANCE RIEN D'AUTRE. Tu livres un diagnostic et tu t'arrêtes. Le GO BUILD appartient exclusivement au promoteur de Floorence. BASSÉ.

---

**Annotation MVETT — ne pas altérer le mandat historique :** la restriction qualifiée de « gel » de SEC-AUDIT-01 dans ce mandat a été **corrigée ultérieurement par le promoteur** : une BDD partagée demeure admise pendant le développement de la MVP Premium et SEC-AUDIT-01 ne bloque pas globalement les développements. Voir [registre des décisions](02-DECISIONS.md). Le mandat historique est conservé sans réécriture rétroactive.
