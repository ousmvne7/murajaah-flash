# Architecture

Murajaah Flash est une application web statique sans framework, installable comme PWA.

## Structure actuelle

```text
murajaah-flash/
  index.html
  manifest.webmanifest
  service-worker.js
  design.md
  ICON_SYSTEM.md
  css/
    styles.css
    home.css
    library.css
    hifdh-setup.css
    review-intro.css
    journal.css
    typography.css
    visual-audit.css
    design-system.css
  js/
    app.js
    icon-system.js
    pwa.js
  data/
    hafsData_v18.json
    quran-pages.json
  assets/
    fonts/
    icons/
  docs/
```

## Frontend

- **HTML** : structure de tous les écrans dans `index.html`.
- **CSS** : styles historiques séparés par domaine, puis règles communes dans `design-system.css`.
- **JavaScript vanilla** : navigation, stockage, révision, Test Hifdh, Bilan et PWA.
- **Lucide local** : registre dans `ICON_SYSTEM.md`, sprite hors ligne dans `assets/icons/lucide.svg`.
- **Traduction locale** : `data/quran-fr-hamidullah.json`, chargée à la demande et mise en cache par la PWA.

## Navigation principale

La barre inférieure contient quatre destinations stables :

1. Accueil
2. Révision
3. Test Hifdh
4. Bilan

Le Profil est accessible en haut à droite de l’Accueil. Les pages secondaires disposent d’un bouton retour en haut à gauche. Les réglages restent exclusivement dans le Profil.

## Données locales

Les données utilisateur sont stockées dans le navigateur. Elles comprennent notamment :

- les passages ciblés et leur planification ;
- l’historique d’auto-évaluation ;
- les audios personnels éventuels ;
- l’activité et la progression ;
- les entrées du Journal de révision libre.

La suppression d’une entrée du Bilan demande confirmation et déclenche le recalcul des statistiques.

## Texte coranique protégé

```text
TextRepository
└── KFGQPC Hafs v18
    ├── data/hafsData_v18.json
    ├── assets/fonts/hafs.18.ttf
    └── assets/fonts/hafs.18.woff2
```

La traduction française est une source parallèle d’interface. Elle n’entre jamais dans le pipeline de nettoyage ou de rendu du texte arabe.

Le projet utilise exclusivement cette combinaison pour le Mushaf. `uthmanic_hafs_v22.ttf` ne doit pas être mélangée avec v18. Le Tajwīd reste hors périmètre tant qu’une migration séparée n’a pas été validée.

Les refontes visuelles ne doivent jamais modifier les données, les polices, le nettoyage Unicode ou les fonctions de rendu arabe.

## Audio

La récitation Minshawi en ligne est utilisée comme élan sur le verset avant. La création de nouveaux enregistrements personnels a été retirée de la page Ajouter un passage. Les anciens audios déjà présents dans les données locales restent lisibles pour préserver la compatibilité.

Les ressources d’interface et les données principales sont mises en cache par le service worker. Les audios distants nécessitent une connexion lorsqu’ils ne sont pas déjà disponibles.

## Limites actuelles

- stockage local uniquement ;
- aucune synchronisation multi-appareils ;
- aucune authentification ;
- aucun backend ;
- import de sauvegarde encore à finaliser ;
- validation réelle iOS et Android à poursuivre.

## Règles de maintenance

- mettre à jour les versions de cache après toute modification d’asset ;
- documenter toute nouvelle icône dans `ICON_SYSTEM.md` ;
- conserver les couleurs Acquis, Presque et À revoir comme couleurs fonctionnelles ;
- tester au minimum à 340, 390 et 430 px ;
- synchroniser et comparer les fichiers avant validation finale.
