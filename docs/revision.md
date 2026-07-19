# Méthode de révision

Murajaah Flash repose sur une révision ciblée.

L’utilisateur ne révise pas tout.  
Il travaille seulement les passages où sa mémoire hésite.

## Principe

Chaque carte est construite autour de trois éléments :

```text
Verset avant → Verset cible → Verset de liaison
```

## 1. Verset avant

Le verset avant sert de déclencheur.

Il donne :

- le contexte ;
- le rythme ;
- l’élan de récitation ;
- le point de départ de la mémoire.

Dans l’app, l’audio se concentre uniquement sur ce verset.

## 2. Verset cible

Le verset cible est le passage à renforcer.

C’est souvent :

- un verset oublié ;
- un début difficile ;
- une transition fragile ;
- un passage confondu avec un autre ;
- un mutashabih qui fait hésiter.

## 3. Verset de liaison

Le verset de liaison vérifie que l’utilisateur sait continuer après le passage cible.

Objectif :

- ne pas seulement retrouver le verset ;
- garder la fluidité ;
- sécuriser l’enchaînement complet.

## Auto-évaluation

Après révélation, l’utilisateur choisit :

### Acquis

Le passage est bien passé.

La prochaine révision est espacée.

### Presque

Le passage est partiellement maîtrisé.

Il revient rapidement.

### À revoir

Le passage reste fragile.

Il peut être revu immédiatement ou très bientôt.

### Couleurs fonctionnelles

Les trois réponses gardent toujours le même code couleur :

- **Acquis** : vert ;
- **Presque** : orange ;
- **À revoir** : rouge.

Ce code est sémantique et reste identique dans Révision ciblée, Test Hifdh, les compteurs et les résumés.

## Test Hifdh

Le Test Hifdh complète la révision ciblée. L’utilisateur choisit un hizb et un nombre de questions, récite la suite d’un verset de départ, révèle le verset suivant avec `CircleArrowRight`, puis s’auto-évalue.

La page utilise le violet comme couleur principale. La jauge d’avancement reste verte et les trois états d’évaluation conservent leurs couleurs fonctionnelles.

## Traduction à la demande

Révision ciblée et Test Hifdh proposent un bouton `Languages` nommé **Traduction**. Il charge localement `data/quran-fr-hamidullah.json`, affiche la traduction française sous le verset actif et la masque au second appui.

Dans la session de Révision ciblée, la barre « Verset avant / Verset cible / Verset de liaison » reste dans l’en-tête. Le bouton **Traduction** remplace la pastille du verset actif, directement en haut du texte arabe.

L’état reste actif pendant la session et suit automatiquement le verset actuellement révélé. Cette couche française est indépendante du texte KFGQPC Hafs v18 : aucune transformation, substitution ou modification de police n’est appliquée au Mushaf.

## Difficulté automatique

L’application garde un court historique des dernières réponses du passage.

Cet historique permet d’attribuer automatiquement un niveau :

- **Très fragile** : plusieurs échecs récents ou solidité très basse ;
- **Fragile** : au moins une hésitation forte ou plusieurs réponses “Presque” ;
- **En progrès** : passage travaillé mais pas encore stable ;
- **Solide** : plusieurs réussites et peu d’hésitations récentes.

Cette logique permet à l’utilisateur de repérer rapidement les passages qui demandent le plus d’attention.

## Répétition espacée

La logique actuelle est volontairement simple.

Plus un passage est réussi, plus l’intervalle augmente.

Exemple :

```text
1er acquis  → dans 3 jours
2e acquis   → environ 7 jours
3e acquis   → environ 15 jours
puis jusqu’à 60 jours max
```

## Objectif produit

Murajaah Flash doit rester rapide.

Une bonne session doit pouvoir durer :

- 1 minute ;
- 3 minutes ;
- 5 minutes maximum dans un usage quotidien.

Le but n’est pas de remplacer une révision complète, mais de renforcer les points faibles.
