# AAA-CHANTIER-02 — PARTIAL — 24 octobre 2026

## Modifications effectives
- `src/components/ui/Photo.tsx` : contain forcé, repli original borné (évite boucle sur URL relative indisponible), priorité haute LCP, transition réduite si demandée. Fond scene-ink existant conservé, cadres inchangés.
- `MemorialHero.tsx` : seule la diapositive active reçoit sa source ; largeur cible 600 au lieu de 800, priorité du premier portrait conservée.
- `AuthorAvatar.tsx`, `GuestbookPost.tsx`, `GuestbookForm.tsx`, `PhotoUploader.tsx`, `CreateMemorial.tsx`, `account/AvatarUpload.tsx` : adoption du Photo existant pour les affichages concernés.
- `RelationshipGraph2D.tsx` : adaptation SVG existante passe de slice à meet ; pas de changement d’identité ni de données.
- `GuestbookPost.tsx` : fenêtre photographique à hauteur réservée 70svh et plafond 95svh ; `EditMemorialDialog.tsx` : plafond 90svh. Pas de conversion globale.
- `src/lib/preparePhotoUpload.ts` : préparation navigateur partagée des nouvelles photos dans création, édition, hommages et compte. JPEG/WebP opaques >400 KiB : côté long ≤1600 px, WebP qualité 0,86 / 0,80 / 0,74, jamais d’agrandissement ni recadrage. Petits fichiers et PNG/GIF/formats spécifiques conservés. Alpha WebP conservé par retour original. Erreur de décodage : original conservé, contrôles de type/taille préexistants en amont.
- Amélioration IA automatique de PhotoUploader retirée : pas de remplacement non sollicité ni appel supplémentaire. Le bouton manuel existant reste inchangé et n’a pas été utilisé.
- `preparePhotoUpload.test.ts`, `AGENTS.md`, `roadmap.md` et mandat mémorisé actualisés. Aucune dépendance ajoutée.

## Tests réellement exécutés
- Vitest : **14/14 PASS**, 7 préparation photo, 4 signalements, 3 résolution portraits UUID.
- Build automatique : OK après modifications fonctionnelles ; contrôlé dans les journaux de l’aperçu.
- Chromium/Playwright, route publique `/m/24ca8c84` Charlotte IGOUWE : portrait chargé en contain, priorité haute ; cinq onglets effectivement cliqués, hommages et menus contextuels présents. Aucun pageerror sur cette recette.
- Captures desktop 1280×1800, petits écrans 375×812 et 360×800 examinées : portrait entier, aucun débordement photographique visible. Ce sont des tailles simulées, pas des appareils physiques ni Safari.
- Fixture navigateur utilisant le **vrai Photo** : portrait, paysage et carré chargés ; angles visibles ; photo absente et URL relative 404 donnent deux replis stables sans boucle.
- Compression réelle canvas : grandes images bruitées portrait/paysage/carré conservent dimensions relatives (1200×1600, 1600×1200, 1600×1600). Sorties 608–610 Ko / 1,19 Mo : la cible 400 Ko n’est volontairement pas forcée au détriment de qualité. Fichier JPEG invalide conservé.
- Vrai PhotoUploader monté isolément dans le navigateur : sélection d’une photo 831715 octets ; requête préparée de 64978 octets multipart, soit environ 65 Ko avec enveloppe. Requête interceptée puis interrompue **avant tout envoi au stockage**. Pas de changement de liste, bouton de nouveau disponible, zéro appel enhance-photo. Fixture sans fournisseur de toasts : message visuel d’erreur non vérifié.
- Réseau simulé : latence 400 ms, téléchargement 50 Ko/s, upload 25 Ko/s, cache désactivé. Après 15 s, capture montre encore le chargeur Vite. CLS partiel 0,0142 ; LCP observé 28 ms correspond au chargeur, **invalide comme mesure du portrait/contenu**. INP non mesuré. Aucun verdict performance 3G ni conformité AAA globale.

## Limites et réserves
- Aucun upload réussi connecté vers la base partagée : non autorisé ; succès de persistance et lectures après upload restent à valider en environnement isolé.
- Orientation EXIF appliquée par décodage navigateur, mais pas de recette EXIF dédiée ; Safari/iOS réel, Android physique et tablette non testés.
- Lignage/maillage cliqués sur un mémorial public, mais pas de recette exhaustive connectée de toutes les personnes ; vues verrouillées restent respectées.
- Biographie et calendrier actuellement textuels dans les composants examinés : pas de chemin photographique spécifique trouvé. Pas de test d’image biographique/événement distincte inventé.
- Restauration, paiement et décisions éditoriales inchangés ; tests signalements ciblés PASS, pas de nouveau signalement réel. Seule présentation photographique de GuestbookPost modifiée.
- Compression avec perte visuelle contrôlée, pas conservation bit à bit pour nouveaux JPEG/WebP ; originaux historiques jamais lus pour écriture ni retraités. Très grandes résolutions risquent un retour original selon mémoire navigateur ; cible 400 Ko non garantie.
- Aucune comparaison de hash des fichiers historiques : garantie de non-altération par absence de mutation/appel de stockage effectif durant ce chantier, pas par inventaire complet.
- Pas de service facturable supplémentaire appelé ; aucune promesse de zéro crédit Lovable.

## STOP
**PARTIAL** : intégrité visuelle et préparation locale vérifiées ; recette complète upload et performance mobile restent incomplètes.
Aucune migration, RLS, donnée, fonction serveur, configuration stockage ou RUM modifiés. Aucun paiement. Aucune publication ni déploiement. Aucun chantier suivant engagé.