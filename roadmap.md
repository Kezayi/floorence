# Bilan MVP Premium — travaux restants, non engagés

- [x] PVit : conversion automatique retirée ; saisie +241 obligatoire dans les gestes, la création et la reprise de paiement mémoriel, numéro international préservé à l’envoi ; 16 tests frontend et 9 tests PVit réussis sans débit, contrôle Deno OK, ebilling seule déployée. Paiement réel non vérifié.

- [x] PVit : conversion automatique 06/07 remplacée à la demande du titulaire par la saisie internationale explicite ci-dessus.

- [x] Correction paiement hommage : lien scellé prioritaire même chargé tardivement, erreurs visibles, panier mixte, attente de confirmation serveur et réutilisation de référence ; 19 tests réussis, compilation automatique OK, fenêtre connectée desktop/mobile vérifiée sans débit. Aucune modification serveur ni publication.
- [x] Recette Airtel réelle réussie par le titulaire : paiement 1 400 XAF (1 cierge + 1 fleur) confirmé côté PVit (transaction PAY0711261409799, référence FLRMW6KEPWOLZ9Z) à 15:35:22 UTC, hommage publié et visible (approuvé, non masqué, 1 cierge + 1 fleur) rattaché à cette référence, aucun doublon ; tentatives antérieures en échec sans hommage lié.

- [ ] Fusion Premium : références SHA256 patch/ZIP validées ; fusion sélective des cinq composants, préserver RIBENGA-06 et les fonctions actuelles, vérifier zoom molette/pince et tests ; aucune publication, aucun changement serveur ou paiement.

- [x] Complément FIC-01 : migration 0048 appliquée et trigger ALWAYS confirmé en base ; 71 tests UI/profil/ISP et SQL transactionnels jetables réussis ; recette navigateur fictive annulation/sauvegarde/lecture seule/édition autres champs réussie, compilation automatique OK. Aucune publication, Edge inchangées, données existantes/paiements intacts. CI distante non exécutée, recette hébergée réelle non effectuée.

- [ ] Prépublication FIC-01 : correctif 0047 appliqué sans modification de lignes existantes ; SQL isolé + 114 tests Vitest + 5 simulations Edge et Deno réussis, compilation locale automatique OK ; attente preuve du typecheck frontend et compilation hébergée du nouveau commit. Publication par l'utilisateur uniquement.

- [x] FIC-01 : migration 0046 appliquée, civilité privée déclarée, complétion nouveaux/historiques, filtre ISP avant maximum BO/palette ; 62 tests + 5 simulations Edge + SQL/RLS local réussis ; social-search déployée, contrôle hébergé 401. Aucune modification d'historiques/paiements.
- [ ] FIC-01 publication du champ profil : bloquée par absence de vérification des autres changements inclus dans la version publiée ; aucune publication globale opportuniste. Recette compte réservé bloquée par absence de session disponible ; CI GitHub distante non vérifiée.

- [x] ISP uniquement : identité absente/variable rendue non calculable ; 38 tests, contrôle Deno et compilation automatique OK ; social-search seule redéployée ; recette BO/palette synthétique sans erreur, noms cliquables/UUID masqués. Aucun changement de données ni paiements, aucune publication. Compte de recette réservé sans session disponible : appel IA hébergé complet non vérifié ; exécution GitHub distante non vérifiée.

- [x] Correctif visuel strict RIBENGA : moteur avant sources dans le DOM ; rendu partagé des marqueurs internes, liens uniquement vers sources canoniques visibles ; 41 tests PASS, compilation aperçu OK, rendu desktop/mobile isolé vérifié. Recette connectée et contrôle TypeScript séparé non vérifiés.

- [x] Correctif strict RIBENGA BO : sources pertinentes structurées et validées, parcours automatiques avant exploration manuelle ; 47 tests isolés PASS sans données réelles. Contrat du fournisseur et usage connecté non vérifiés, aucune publication manuelle.

- [x] Correctif BO RIBENGA : page et palette raccordées aux parcours canoniques ; 29 tests isolés PASS et montage desktop/mobile vérifié avec réseau intercepté. Recette réelle et sécurité déployée non vérifiées ; citations IA canoniques indisponibles.

- [x] 1. Modération a posteriori : signalements, file admin, RPC/RLS et séparation éditoriale/financière implémentés ; tests SQL isolés et aperçu vérifiés.
- [ ] 1. Réserve de validation : cycle complet sur signalement réel, aucune donnée test autorisée dans la base partagée ; projections RAGet hors mandat inchangées.
- [x] 2. AAA-CHANTIER-02 implémenté dans l’aperçu : Photo, nouveaux uploads optimisés et svh ciblés ; verdict PARTIAL, rapport AAA-CHANTIER-02-RAPPORT.md.
- [ ] 2. Validation complémentaire : upload réussi connecté sans base partagée, appareils iOS/Android réels, photographies d’événements/biographie et mesure 3G du contenu complet ; bloquée par absence d’environnement isolé et d’appareils réels.
- [ ] 3. Stabilité mobile : unités svh et compression des images téléversées.
- [ ] 4. Fil d’Ariane Front-Office : mémoriaux et parcours transactionnels.
- [ ] 5. Observabilité : mesures réelles LCP/INP/CLS, consultation et alertes.
- [x] AAA-CHANTIER-03 RIBENGA : recherche lexicale multi-mots, exclusion editorial_hidden, libellés RIBENGA (aperçu seul) ; sémantique reste inactive (pas de vectorisation des requêtes).

Le mandat Chantier 2 inclut la compression et les svh ciblés ; RIBENGA/RAGet et les autres travaux restent hors périmètre.

Contraintes : préserver paiements, Memorial Master et droits Voir+ ; aucune publication ; aucun verdict PASS sans preuve.- [x] PVit v2 (production) : seule passerelle ; eBilling retiré ; webhook `pvit-webhook`, vérification de statut, tests opérateurs.
- [x] PVit — déblocage myPVit effectué : aucune IP active (185.158.133.1 et 51.79.68.133 inactives), callback vers pvit-webhook, code statut RQOUBT41PJUQALTT enregistré ; paiement réel confirmé en production.
