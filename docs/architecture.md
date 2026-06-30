# Architecture

Murajaah Flash est une application web statique pensée comme une PWA.

## Structure actuelle

```text
murajaah-flash/
  index.html
  site.html
  css/
    styles.css
  js/
    app.js
  data/
    quran-simple.json
  assets/
  docs/
```

## Frontend

L’application fonctionne sans framework.

- **HTML** : structure des écrans
- **CSS** : direction artistique, responsive, composants
- **JavaScript vanilla** : navigation, logique métier, stockage local, révision

## Écrans principaux

- Accueil
- Passages
- Ajouter
- Réviser
- Progression / Réglages

## Données

Les passages sont stockés localement dans le navigateur.

Chaque passage contient notamment :

- sourate ;
- numéro du verset cible ;
- verset avant ;
- verset cible ;
- verset après ;
- type d’hésitation ;
- note courte ;
- audio éventuel ;
- prochaine date de révision ;
- niveau de solidité.

## Stockage

Le projet utilise un stockage local côté navigateur.

Objectif :

- pas de compte ;
- pas de serveur ;
- données privées sur l’appareil ;
- usage simple pour un prototype testable.

## Audio

Deux types d’audio existent :

1. **Audio personnel** : enregistré par l’utilisateur.
2. **Élan audio Minshawi** : lu en ligne pour le verset avant.

L’audio Minshawi donne uniquement l’élan.  
Il ne donne pas la réponse.

## Limites actuelles

- Données locales uniquement
- Pas de synchronisation multi-appareils
- Pas d’authentification
- Pas encore de backend
- Images Mushaf non intégrées

## Orientation future

Si le projet devient une vraie app mobile, les prochaines briques possibles sont :

- backend ;
- authentification optionnelle ;
- synchronisation cloud ;
- sauvegarde des passages ;
- vraie PWA installable ;
- packaging mobile hybride.
