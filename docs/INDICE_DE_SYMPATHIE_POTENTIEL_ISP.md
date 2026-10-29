# FLOORÉNCE — Indice de Sympathie Potentiel (ISP)

**Document de référence conceptuelle — RIBENGA**  
**Auteur et titulaire revendiqué des droits : Michel NGWA AYI, promoteur de Floorence**  
**Date de consignation : 29 octobre 2026**  
**Statut : spécification conceptuelle validée ; implémentation non autorisée par le présent document.**

> **Mention de propriété intellectuelle.** L'Indice de Sympathie Potentiel (ISP), dans sa définition, son articulation des cercles relationnels, sa méthode de calcul et son application à Floorence/RIBENGA, est revendiqué comme une création et une **propriété exclusive de Michel NGWA AYI, promoteur de Floorence**. © 2026 Michel NGWA AYI — Tous droits réservés sur les éléments susceptibles de protection. Toute utilisation, reproduction, adaptation ou exploitation par des tiers nécessite son autorisation, sous réserve du droit applicable. Cette mention consigne une revendication de titularité ; elle ne vaut pas, à elle seule, titre officiel, enregistrement ni constat juridique d'exclusivité sur une idée ou une formule mathématique.

## 1. Objet et destination

L'ISP est un indicateur de **sympathie potentielle** qu'un contributeur pourrait susciter auprès des autres membres de la communauté mémorielle d'un défunt. Il s'agit d'un outil de raisonnement interne, **exclusivement destiné à RIBENGA**.

Dans Floorence, la communauté désigne le **maillage de femmes et d'hommes autour d'un défunt**. Les manifestations rituelles y forment une donnée sociale observable : le volume total de gestes peut refléter une mobilisation et une visibilité sociales perçues autour de ce défunt, sans mesurer sa valeur humaine.

L'ISP estime non pas une affection démontrée, mais un **potentiel d'intérêt, de sympathie ou de rayonnement relationnel** suscité par la participation d'un membre. Un geste venant d'un cercle éloigné est socialement moins attendu qu'un geste de la famille proche ; le modèle lui affecte donc un poids supérieur.

## 2. Variables et formule

Pour un utilisateur `i` et un mémorial `m` :

- `G(i,m)` : nombre de gestes rituels du contributeur `i` enregistrés sur le mémorial `m` ;
- `T(m)` : nombre total de gestes rituels enregistrés sur le même mémorial ;
- `C(i,m)` : **rang d'éloignement** de son cercle relationnel, en commençant par `1` pour le cercle le plus proche ;
- `E(i,m)` : exceptionnalité structurelle, définie par la somme des coefficients de tous les cercles **plus proches** que celui du contributeur.

Formule d'exceptionnalité :

```text
E = 1 + 2 + ... + (C - 1) = C × (C - 1) / 2
```

Formule de l'ISP retenue à ce stade :

```text
ISP(i,m) = [G(i,m) × C(i,m) × (1 + E(i,m))] / T(m)
```

Le facteur `1 + E` maintient la contribution de base du cercle proche (`E = 0`) et ajoute une prime structurelle d'exceptionnalité aux cercles plus éloignés. Il ne faut pas remplacer `1 + E` par `E`, ce qui annulerait le score du cercle proche.

## 3. Référentiel relationnel dynamique

Les rangs suivants illustrent la **configuration actuelle**, et ne doivent pas être codés en dur :

| Cercle relationnel | Rang C | E = C(C−1)/2 | Multiplicateur C(1+E) |
| --- | ---: | ---: | ---: |
| Famille proche | 1 | 0 | 1 |
| Famille élargie | 2 | 1 | 4 |
| Alliés | 3 | 3 | 12 |
| Socio-cœur | 4 | 6 | 28 |
| Autres | 5 | 10 | 55 |

**Règle d'évolution :** Floorence constitue la source unique de définition **et d'ordre** des cercles. RIBENGA déduit les rangs, puis calcule automatiquement `C` et `E`. Toute création, suppression ou réorganisation de cercles entraîne un recalcul à partir du référentiel applicable, sans configuration de coefficients fixes. Ne jamais déduire le rang de l'ordre alphabétique des libellés.

## 4. Exemple illustratif

Dans une communauté ayant enregistré, à titre hypothétique, **1,1 milliard de gestes** :

| Contributeur | Cercle | Gestes | C | E | ISP |
| --- | --- | ---: | ---: | ---: | ---: |
| Janet Jackson (exemple hypothétique) | Famille proche | 1 000 000 000 | 1 | 0 | ≈ 0,9091 |
| Contributeur extérieur (exemple hypothétique) | Autres | 1 000 000 | 5 | 10 | 0,05 |

Le modèle valorise le caractère moins attendu du geste provenant de l'extérieur de la famille, sans assurer qu'un contributeur éloigné dépasse quantitativement un proche extrêmement actif.

Cet exemple est une **simulation pédagogique**, non une affirmation sur les gestes réellement accomplis par les personnes citées.

## 5. Interprétation réservée à RIBENGA

- L'ISP n'est **pas plafonné à 1**.
- **`ISP > 1`** : signal d'intérêt de **rayonnement communautaire potentiel élevé** dans le modèle ; l'hypothèse d'un ascendant psychologique peut être explorée avec précaution, mais n'est ni démontrée ni certifiée par le calcul.
- **`ISP <= 1`** : ne prouve pas l'absence de sympathie ni d'influence.
- Le calcul repose sur des **gestes observés** et une **hypothèse de moindre attente sociale liée à l'éloignement**. Il ne mesure ni les sentiments réels des tiers ni leur consentement ni la valeur d'une personne.
- Une forte quantité de gestes ne doit pas automatiquement être présentée comme une popularité attestée : le comportement peut notamment être influencé par des actes répétés d'un seul compte.

## 6. Règles de gestion validées

1. **Périmètre mémoriel.** Calculer séparément chaque `(utilisateur, mémorial)` en s'appuyant sur une définition commune des gestes effectivement comptabilisés ; ne pas mélanger plusieurs communautés.
2. **Cercle unique.** Attribuer un seul rang relationnel applicable par utilisateur et par mémorial ; éviter le double comptage et les identités incertaines.
3. **Potentiel, non certification.** Présenter le résultat comme un indicateur de sympathie potentielle, jamais comme une preuve de popularité, de valeur humaine ou de domination psychologique.
4. **Usage exclusivement interne.** L'ISP est exploité dans le raisonnement de RIBENGA, sans score public, badge, classement, compteur ou profil d'influence affiché aux membres.
5. **Évolutivité.** Aucun nombre maximal de cercles ni coefficient fixe codé en dur. Réévaluer l'indice à partir du référentiel relationnel actif et documenter la version de référentiel en cas d'analyse historique.
6. **Données insuffisantes.** Si `T(m)=0`, si le cercle du contributeur est inconnu ou si l'identité ne peut être attribuée de manière sûre, retourner « non calculable », sans inventer de valeur.
7. **Données de développement.** Les mémoriaux et gestes actuellement présents dans Floorence sont des **données de test fictives**. Ne pas interpréter un indice issu de ces données comme une mesure réelle d'une communauté.

## 7. Points techniques à vérifier avant toute implémentation

- Définir précisément les événements constituant un « geste rituel » (cierges, fleurs et autres gestes éventuels) et la gestion des événements annulés, remboursés, masqués ou révoqués.
- Identifier dans le schéma la source canonique et ordonnée des cercles, ainsi que l'association certaine entre un compte et son cercle sur chaque mémorial.
- Garantir l'absence de double comptage lorsque plusieurs hommages ou comptes de test sont concernés.
- Tester les cas de changement de référentiel, score supérieur à 1, total nul, relation inconnue, volumes extrêmes et manipulations volontaires par répétition.
- Ne pas ajouter de fonctionnalité publique ni modifier les données ou paiements pour ce seul indicateur.

## 8. Gouvernance et droits

**Paternité et titularité revendiquées : Michel NGWA AYI, promoteur de Floorence.**  
**Destination contractuelle/fonctionnelle : exploitation exclusive au sein du moteur RIBENGA de Floorence, sauf autorisation expresse du titulaire.**  
**Licence à des tiers : aucune licence implicite accordée par ce document.**

La protection juridique effective des éléments de cet indice et les éventuelles conditions de cession ou de licence devront être appréciées selon le droit applicable. Le dépôt de ce fichier dans GitHub permet de dater et de tracer l'évolution du texte au moyen de l'historique des commits, sans remplacer les formalités ou preuves juridiques éventuellement nécessaires.
