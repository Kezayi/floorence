# Bilan MVP Premium — travaux restants, non engagés

- [x] Portraits de défunts : exposition, ombres, hautes lumières, chaleur, saturation, netteté, éclairage automatique réversible et cadrage par URL, photos secondaires sélectionnables, annuler/rétablir ; résolution adaptée au zoom sur page défunt. 29 tests PASS, Deno et compilation OK ; curseurs connectés, portrait public et mobile vérifiés sans écriture réelle. admin-settings déployée seule, rejet réel des réglages invalides (400) confirmé. Aucune publication du site ; sauvegarde valide non exercée pour préserver les réglages partagés.

- [x] RIBENGA-CLÔTURE-01 : audit ciblé, corrections confirmées, 151 tests Vitest + 10 tests Edge isolés PASS, Deno du serveur réel PASS, compilation automatique OK, page/palette desktop/mobile synthétiques vérifiées ; rapport docs/conseil/RIBENGA-CLOTURE-01-RAPPORT.md. Aucune publication, aucun déploiement ni données réelles modifiées. Verdict PARTIAL.
- [ ] RIBENGA-CLÔTURE-01 réception réelle : bloquée par absence d’environnement isolé (chaque recherche écrit historique/usage sur la base partagée) et preuve séparée du typecheck frontend indisponible ; fonction hébergée non déployée. FINAL interdit sans recette connectée/mobile réelle ; autres mandats ouverts ci-dessous non engagés ici.

- [x] Clarification PIN Moov : documentation REST/status/webhook vérifiée ; aucun accusé de réception PIN documenté. Indicateur erroné ussd_push_sent=true remplacé par null, payment_request_accepted=true et pin_prompt_received=null pour les nouvelles demandes, sans réécrire l’historique. 14 tests réussis, Deno OK ; ebilling seule déployée. Deux essais Moov restent FAILED/code 2000 ; aucun paiement déclenché.
- [ ] Réception PIN Moov : régler/vérifier le solde du compte d’opération Moov puis effectuer une recette réelle ; si aucun PIN malgré absence du code 2000, faire confirmer le parcours Moov par PVit avec référence et heure. Aucune preuve de réception fournie par l’API documentée.

- [x] UX paiement : tous les codes PVit publiés et le code 3024 observé traduits, codes inconnus sans diagnostic inventé ; raisons transmises aux gestes, création/reprise mémorial, assistance, résultat et finances ; PIN uniquement chez l’opérateur, réception jamais présumée. 27 tests réussis, Deno et aperçu OK, ebilling seule déployée ; vrai refus Moov/code 2000 affiché connecté sur ordinateur/mobile sans débit.

- [x] Audit Moov Money : deux demandes acceptées puis FAILED/code 2000 en ~3 s ; numéro national, opérateur et compte Moov corrects. Contrôle connecté de la référence existante sans débit ; écran refus distinct de l'attente, pas de nouvelle demande à la réouverture ; 11 tests UI/numéro/statut et 9 tests PVit réussis.
- [ ] Recette Moov réelle : code 2000 documenté par PVit comme solde insuffisant du compte d'opération ; titulaire doit vérifier/régulariser le compte Moov dans myPVit avant un nouveau paiement. Aucun débit déclenché par l'audit.

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

- [ ] Pagination FO/BO partout où nécessaire (inventaire puis mise en œuvre).
- [ ] Réorganisation du Back-Office sans redondances (plan à valider).
