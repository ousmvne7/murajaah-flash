# Product Specification — Murajaah Flash

Ce document contient le détail complet du projet.

Le README principal reste volontairement court pour présenter rapidement l’application sur GitHub.

---

**État du document :** actualisé le 19 juillet 2026. En cas de conflit avec une ancienne section, l’état actuel décrit ci-dessous et les fichiers `design.md`, `ICON_SYSTEM.md` et `docs/architecture.md` font référence.

**Murajaah Flash** est une application mobile au format PWA pensée pour une révision coranique très ciblée.

L’objectif n’est pas de remplacer une application Quran complète.  
L’objectif est plus précis : aider l’utilisateur à renforcer les passages où sa mémoire hésite.

Murajaah Flash se concentre donc sur les **passages fragiles**, les **passages glissants**, les transitions difficiles et les endroits où l’utilisateur bloque pendant sa récitation.

## Vision du projet

La plupart des outils de mémorisation se concentrent sur l’apprentissage global, la lecture complète ou le suivi de progression général.

Murajaah Flash prend un angle différent :

> Réviser uniquement ce qui fait réellement hésiter.

L’application repose sur une idée simple :

- ne pas refaire ce qui est déjà maîtrisé ;
- isoler les passages fragiles ;
- les revoir souvent, mais rapidement ;
- renforcer les transitions par rappel actif ;
- espacer les révisions quand le passage devient solide.

## Méthode utilisée

Murajaah Flash applique une méthode de liage en 3 temps.

### 1. Verset avant

Le verset qui précède le passage difficile.

Il sert de déclencheur.  
L’utilisateur le lit ou l’écoute, puis doit réciter de mémoire ce qui vient après.

### 2. Verset cible

Le passage à renforcer.

C’est le verset ou la transition qui provoque l’hésitation.  
C’est le cœur de la carte.

### 3. Verset de liaison

Le verset qui vient juste après.

Il permet de vérifier que l’utilisateur ne sait pas seulement retrouver le verset cible, mais qu’il sait aussi continuer naturellement la récitation.

## Fonctionnalités principales

- Ajout assisté d’un passage depuis une base Quran intégrée.
- Sélection d’une sourate et d’un verset cible.
- Remplissage automatique du verset avant, du verset cible et du verset après.
- Révision en 3 étapes.
- Choix de la première révision : aujourd’hui ou demain.
- Élan audio Minshawi en ligne sur le verset avant.
- Vitesse d’écoute fixée à 1.25x pour garder l’élan.
- Lancement automatique de l’audio pendant la révision.
- Auto-évaluation : Acquis, Presque, À revoir.
- Répétition espacée simple.
- Bibliothèque des passages enregistrés.
- Recherche et filtres.
- Statistiques du jour.
- Test Hifdh par hizb avec 5, 10 ou 20 questions.
- Traduction française Hamidullah affichable et masquable dans Révision ciblée et Test Hifdh.
- Journal de révision libre par hizb.
- Suppression individuelle des entrées du Bilan avec confirmation.
- Données stockées localement dans le navigateur.
- Fonctionnement sans compte.
- Navigation basse Accueil, Révision, Test Hifdh et Bilan.

## Architecture de l’interface

L’application est organisée autour de quatre menus principaux :

1. Accueil
2. Révision ciblée
3. Test Hifdh
4. Bilan / Journal de révision

Les actions **Ajouter un passage** et **Mes passages** restent accessibles depuis l’Accueil et Révision. Le Profil est accessible en haut à droite et contient les réglages.

## 1. Accueil

L’accueil est le centre de contrôle de l’utilisateur.

Il sert à répondre rapidement à trois questions :

- Combien de passages dois-je revoir aujourd’hui ?
- Combien de temps cela va me prendre ?
- Où puis-je ajouter ou retrouver mes passages ?

### Barre supérieure

La barre supérieure contient :

- le logo **MURAJAAH FLASH** ;
- un bouton vers l’écran Progression / Réglages.

### Bloc “Salam”

Ce bloc affiche :

- la date du jour ;
- un message d’accueil ;
- la série de jours actifs.

La série est calculée à partir des jours où l’utilisateur a réellement révisé.

### Bloc “Ta session du jour”

C’est le bloc principal de l’accueil.

Il affiche :

- le nombre de passages à revoir aujourd’hui ;
- une estimation de durée ;
- une barre de progression ;
- un bouton d’action principal.

Le bouton change selon l’état de l’utilisateur :

- s’il y a des passages à revoir : **Commencer la révision** ;
- si tout est à jour : **Tout est à jour ✓** ;
- si aucun passage n’existe : **Ajoute ton premier passage**.

### Estimation de durée

L’estimation est volontairement simple.

Elle donne une idée rapide du temps nécessaire pour la session du jour.  
Le but est de rendre la révision accessible et courte.

### Barre de progression quotidienne

La barre indique la part de passages déjà révisés aujourd’hui.

Elle est basée sur :

- les passages dus aujourd’hui ;
- les passages déjà révisés aujourd’hui.

### Accès rapide

Deux cartes donnent accès aux actions importantes.

#### Ajouter

Ouvre l’écran d’ajout.

Ce bloc sert à enregistrer rapidement un nouveau passage fragile.

#### Mes passages

Ouvre la bibliothèque.

Ce bloc sert à retrouver, filtrer, modifier ou supprimer des passages.

### Bloc “Aujourd’hui”

Ce bloc contient trois statistiques :

#### Révisés

Nombre de passages travaillés aujourd’hui.

#### Passages fragiles

Nombre de passages dont le niveau de solidité est encore faible.

#### Total

Nombre total de passages enregistrés dans l’application.

### Bloc conseil

Le bloc conseil affiche un message contextuel.

Exemples :

- si aucun passage n’est ajouté : invitation à créer le premier passage ;
- si une session est disponible : rappel qu’une courte session suffit ;
- si tout est à jour : indication que l’utilisateur peut revenir demain ou ajouter un nouveau passage.

## 2. Mes passages

L’écran **Mes passages** est la bibliothèque de l’utilisateur.

Il sert à gérer tous les passages enregistrés.

### En-tête

L’en-tête affiche :

- le logo ;
- un bouton d’ajout rapide.

### Titre et compteur

L’écran affiche le nombre total de passages enregistrés.

Exemple :

```text
3 passages enregistrés.
```

### Recherche

La barre de recherche permet de retrouver un passage par :

- sourate ;
- numéro de verset ;
- texte du verset avant ;
- texte du verset cible ;
- texte du verset après ;
- note personnelle.

### Filtres

Quatre filtres sont disponibles.

#### Tous

Affiche tous les passages actifs.

#### À revoir

Affiche uniquement les passages dont la date de révision est aujourd’hui ou déjà dépassée.

#### Passages fragiles

Affiche les passages dont le niveau est encore faible.

#### Maîtrisés

Affiche les passages considérés comme solides.

### Carte passage

Chaque passage apparaît sous forme de carte.

Une carte contient :

- la sourate ;
- le numéro du verset cible ;
- le texte arabe du verset cible ;
- le statut du passage ;
- la prochaine date de révision ;
- un bouton modifier ;
- un bouton supprimer.

Le bouton `Trash2` supprime le passage après confirmation. Le passage disparaît alors de la bibliothèque, du planning de répétition et des statistiques calculées.

### Statuts possibles

#### À revoir

Le passage doit être revu aujourd’hui.

#### Fragile

Le passage existe, mais il n’est pas encore solide.

#### En progrès

Le passage commence à être renforcé.

#### Maîtrisé

Le passage a atteint un bon niveau de solidité.

## 3. Ajouter

L’écran **Ajouter** sert à créer un nouveau passage à renforcer.

L’idée principale est d’éviter le copier-coller manuel.  
L’utilisateur choisit simplement une sourate et un verset cible.

L’application prépare ensuite automatiquement :

- le verset avant ;
- le verset cible ;
- le verset après.

### En-tête

L’en-tête contient :

- le logo ;
- un bouton fermer.

### Introduction

L’écran explique à l’utilisateur :

```text
Choisis le verset cible, vérifie la séquence, puis ajoute l’audio si tu veux.
```

### Bloc “Choisis ton passage”

C’est le bloc principal de l’ajout.

Il contient :

- une explication courte ;
- un bouton **Choisir un verset** ;
- un résumé de la sélection ;
- une prévisualisation des trois versets ;
- les boutons Annuler et Utiliser ce passage.

### Sélecteur Quran

Le sélecteur Quran s’ouvre sous forme de fenêtre.

Il contient deux colonnes :

#### Colonne sourates

Permet de choisir une sourate.

#### Colonne versets

Permet de choisir le verset cible.

Une fois le verset cible confirmé, l’application récupère automatiquement :

- le verset précédent ;
- le verset cible ;
- le verset suivant.

### Règles de validation

L’application empêche certains cas impossibles.

#### Premier verset d’une sourate

Si l’utilisateur choisit le verset 1, l’application refuse l’ajout car il n’existe pas de verset avant.

#### Dernier verset d’une sourate

Si l’utilisateur choisit le dernier verset, l’application refuse l’ajout car il n’existe pas de verset après.

#### Sourate non reconnue

Si la sourate n’est pas trouvée, l’application affiche un message d’erreur.

### Prévisualisation automatique

Après sélection, l’utilisateur voit les trois versets :

1. Verset avant
2. Verset cible
3. Verset après

Il doit ensuite cliquer sur **Utiliser ce passage**.

Cette étape évite d’enregistrer un passage par erreur.

### Première révision

Après avoir choisi le verset cible, l’utilisateur planifie l’entrée du passage dans son cycle :

- **Aujourd’hui** : le passage rejoint immédiatement la session du jour ;
- **Demain** : le passage reste enregistré mais n’est proposé qu’à partir du lendemain.

Ce choix utilise un contrôle segmenté et reste masqué lors de la modification d’un passage existant afin de ne pas modifier involontairement son échéance.

### Élan audio Minshawi

Pendant la révision, l’application peut proposer une récitation de référence du verset avant.

Cette fonction s’appelle **Élan audio**.

Elle respecte une règle produit claire :

> Il donne seulement l’élan.

L’audio Minshawi est disponible uniquement sur le verset avant.  
Il ne joue pas le verset cible et ne joue pas le verset de liaison.

Objectif :

- entrer dans la récitation ;
- retrouver le rythme ;
- continuer ensuite de mémoire ;
- éviter l’écoute passive de la réponse.

Deux vitesses sont proposées :

- 1x ;
- 1.25x.

L’audio n’est pas stocké dans l’application.  
Il est lu en ligne depuis EveryAyah avec la récitation **Minshawy Murattal 128kbps**.

### Bloc “Repère personnel”

Ce bloc ajoute du contexte au passage.

#### Type d’hésitation

L’utilisateur peut choisir la nature de la difficulté :

- enchaînement ;
- début du verset ;
- confusion ;
- oubli fréquent.

#### Note courte

Une note facultative peut être ajoutée.

Exemple :

```text
Je confonds avec le verset précédent.
```

### Enregistrement

Quand l’utilisateur enregistre un passage, l’application stocke :

- un identifiant unique ;
- la sourate ;
- le numéro du verset cible ;
- le verset avant ;
- le verset cible ;
- le verset après ;
- la difficulté ;
- la note ;
- l’audio éventuel ;
- la date de création ;
- la prochaine date de révision ;
- le niveau de solidité ;
- l’intervalle de répétition ;
- le nombre de révisions.

## 4. Réviser

Le mode **Réviser** est le cœur de l’application.

Il est conçu comme un mode focus.

Quand il s’ouvre :

- la barre de navigation disparaît ;
- l’écran devient plus immersif ;
- la session se concentre uniquement sur les passages dus aujourd’hui.

## Écran d’entrée “Mes révisions”

Avant de commencer, l’utilisateur voit une étape d’introduction.

Elle affiche :

- le nombre de passages à revoir aujourd’hui ;
- une estimation de temps ;
- un bouton pour commencer la session.

Si aucun passage n’est dû, l’application indique que l’utilisateur est à jour.

## Session de révision

Chaque carte est revue en 3 étapes.

### Header de session

Le haut de l’écran contient :

- le titre **Murajaah** ;
- un bouton fermer ;
- le bouton de traduction ;
- une barre de progression ;
- le compteur de carte.

### Étape 1 — Verset avant

L’application affiche le verset avant.

L’utilisateur doit réciter de mémoire le verset cible et la liaison.

Si un audio existe, il peut être lancé pour aider au déclenchement.

À cette étape seulement, le bloc **Élan audio** peut apparaître.

Il permet d’écouter le verset avant avec Minshawi, puis de continuer de mémoire.

### Étape 2 — Verset cible

L’utilisateur révèle le verset cible.

Il vérifie s’il a retrouvé correctement le passage difficile.

À cette étape, l’application ne doit pas surcharger l’écran avec plusieurs versets affichés inutilement.

### Étape 3 — Verset de liaison

L’utilisateur révèle le verset de liaison.

Cette étape vérifie la fluidité après le passage cible.

L’objectif n’est pas seulement de reconnaître le verset, mais de savoir continuer.

### Compatibilité des anciens audios

La page Ajouter un passage ne permet plus de créer un enregistrement personnel. Si un ancien passage contient déjà un audio local, son bouton de lecture reste disponible pendant la révision afin de ne pas perdre les données existantes.

### Bouton Élan audio

Le bouton **Élan audio** est séparé de l’audio personnel.

Il utilise un fichier MP3 en ligne basé sur la référence du verset avant.

Exemple :

Si le verset cible est :

```text
Al-Baqarah — 12
```

Alors l’élan audio joue :

```text
Al-Baqarah — 11
```

Le fichier appelé suit ce format :

```text
https://everyayah.com/data/Minshawy_Murattal_128kbps/002011.mp3
```

Le bouton disparaît dès que l’utilisateur passe au verset cible.

### Bouton Révéler

Le bouton principal évolue selon l’étape.

Au début :

```text
Révéler le passage
```

Puis :

```text
Voir le verset après
```

À la fin, le bouton disparaît et laisse place à l’évaluation.

## Auto-évaluation

Après révélation complète, l’utilisateur choisit entre trois réponses.

### Acquis

Le passage a été récité correctement.

Effet :

- le niveau augmente ;
- l’intervalle de révision s’espace ;
- le passage revient plus tard.

### Presque

Le passage était proche, mais pas parfaitement fluide.

Effet :

- le niveau augmente légèrement ;
- le passage revient demain.

### À revoir

Le passage n’a pas été retrouvé correctement.

Effet :

- le niveau baisse ou reste faible ;
- l’intervalle est remis à zéro ;
- le passage revient aujourd’hui ;
- il peut être proposé dans le bouton “Revoir maintenant”.

## Répétition espacée

L’application utilise une répétition espacée simple.

### Si l’utilisateur répond “À revoir”

Le passage revient aujourd’hui.

### Si l’utilisateur répond “Presque”

Le passage revient demain.

### Si l’utilisateur répond “Acquis”

Le passage est espacé progressivement.

Règle actuelle :

- première réussite : environ 3 jours ;
- ensuite, l’intervalle augmente ;
- l’intervalle est plafonné à 60 jours.

## Fin de session

À la fin d’une session, l’utilisateur arrive sur un résumé.

Ce résumé affiche :

- le nombre de passages à revoir ;
- le nombre de passages presque réussis ;
- le nombre de passages solides ;
- une liste des prochaines révisions ;
- un bouton “Revoir maintenant” si certains passages ont été ratés ;
- un bouton retour à l’accueil.

### Revoir maintenant

Si l’utilisateur a répondu “À revoir” ou “Presque”, l’application peut proposer de refaire immédiatement ces passages.

Cela permet un rappel actif rapide pendant que l’erreur est encore fraîche.

## 5. Progression / Réglages

L’écran Progression donne une vue simple de l’état global.

### Indice de confiance

L’indice de confiance est calculé à partir du niveau de solidité des passages.

Plus les passages sont réussis, plus l’indice monte.

### Répétition intelligente

Ce bloc rappelle la logique :

- À revoir : aujourd’hui ;
- Presque : demain ;
- Acquis : espacé.

### Données locales

Ce bloc explique que les données restent sur l’appareil.

Murajaah Flash ne nécessite pas de compte.

### Exporter mes cartes

Permet d’exporter les cartes enregistrées au format JSON.

C’est utile pour :

- sauvegarder ses données ;
- transférer ses passages ;
- partager un état de test ;
- éviter de perdre son travail.

### Effacer toutes les données

Supprime les données locales de l’application.

Une confirmation est demandée avant suppression.

## 6. Test Hifdh

Le Test Hifdh évalue la capacité à poursuivre la récitation dans un hizb choisi. L’utilisateur sélectionne 5, 10 ou 20 questions, écoute le verset de départ, récite la suite, puis révèle le verset suivant.

Le bouton de révélation utilise `CircleArrowRight`. La page est dominée par le violet, sa jauge d’avancement reste verte, et les réponses conservent leurs couleurs sémantiques : Acquis vert, Presque orange, À revoir rouge.

Le bouton **Traduction**, associé à l’icône `Languages`, affiche la traduction française de Muhammad Hamidullah sous le verset courant. Après révélation de la suite, le panneau se met à jour avec le nouveau verset. Un second appui masque le panneau. Le texte et la police KFGQPC Hafs v18 ne sont jamais modifiés par cette option.

## 7. Bilan / Journal de révision

Le Bilan enregistre les révisions complètes réalisées librement en dehors de la révision ciblée.

Chaque entrée contient :

- un hizb ;
- une date ;
- une durée ;
- un ressenti ;
- une note optionnelle.

Le Bilan affiche la dernière révision, la prochaine étape, l’historique récent et la fréquence par hizb. Une entrée peut être supprimée après confirmation ; toutes les statistiques sont alors recalculées.

## Splash screen

Au lancement, l’application affiche un écran d’ouverture court.

Il contient :

- une calligraphie “Bismillah” ;
- le nom Murajaah Flash ;
- un logo simple.

Ce splash screen sert à donner une sensation d’application mobile native.

## Navigation

La navigation principale se trouve en bas de l’écran.

Elle contient :

### Accueil

Retour au tableau de bord.

### Révision

Ouvre la révision ciblée et ses outils.

### Test Hifdh

Ouvre l’évaluation par hizb.

### Bilan

Ouvre le Journal de révision libre et ses statistiques.

Pendant la révision, cette navigation disparaît pour limiter les distractions.

## Stockage des données

Murajaah Flash stocke les données dans le navigateur avec `localStorage`.

Les données enregistrées comprennent :

- les passages ;
- les statistiques d’activité ;
- les audios encodés ;
- les prochaines dates de révision ;
- les niveaux de solidité.

## Confidentialité

L’application fonctionne sans compte.

Les données restent sur l’appareil utilisé.

Avantages :

- simple à tester ;
- aucune inscription ;
- données privées ;
- fonctionnement rapide.

Limites :

- les données ne sont pas synchronisées entre appareils ;
- vider le navigateur peut supprimer les données ;
- changer de téléphone ne transfère pas automatiquement les passages ;
- les audios peuvent prendre de la place.

## Base Quran

L’application utilise une base Quran locale.

Le fichier principal est :

```text
data/hafsData_v18.json
```

Il contient :

- les sourates ;
- les versets en écriture Uthmani ;
- les noms de sourates ;
- des alias de recherche.

Le Tajwid coloré n’est pas utilisé pour l’instant : l’app reste sur KFGQPC Hafs v18 uniquement, avec `hafs.18.ttf` et `hafs.18.woff2`.

## Source audio

La fonction **Élan audio** utilise les fichiers verset par verset fournis par EveryAyah.

Récitation utilisée :

```text
Minshawy Murattal 128kbps
```

Structure utilisée :

```text
https://everyayah.com/data/Minshawy_Murattal_128kbps/SSSAAA.mp3
```

Avec :

- `SSS` : numéro de sourate sur 3 chiffres ;
- `AAA` : numéro du verset sur 3 chiffres.

Exemples :

```text
002011.mp3 = Al-Baqarah, verset 11
003014.mp3 = Ali 'Imran, verset 14
```

## Structure technique

Le projet est organisé en fichiers simples.

```text
murajaah-flash/
├── index.html
├── site.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   └── hafsData_v18.json
├── assets/
│   └── bismillah.png
└── README.md
```

### index.html

Contient la structure de l’application :

- écrans principaux ;
- navigation ;
- modales ;
- splash screen ;
- blocs de révision.

### css/styles.css

Contient toute l’identité visuelle :

- couleurs ;
- typographies ;
- cartes ;
- responsive mobile ;
- mode révision ;
- animations ;
- splash screen.

### js/app.js

Contient toute la logique :

- navigation entre écrans ;
- ajout de passages ;
- sélection Quran ;
- stockage local ;
- audio ;
- répétition espacée ;
- session de révision ;
- résumé final ;
- export et suppression.

### site.html

Site vitrine du projet.

Il sert à présenter l’application à une personne extérieure.

## Lancer le projet en local

L’application peut être ouverte directement, mais certaines fonctions comme le microphone fonctionnent mieux via un serveur local ou HTTPS.

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000
```

## Tester l’application

Scénario de test conseillé :

1. Ouvrir l’application.
2. Aller dans Ajouter.
3. Choisir une sourate et un verset cible.
4. Vérifier les trois versets proposés.
5. Ajouter un audio si besoin.
6. Enregistrer.
7. Aller dans Réviser.
8. Révéler le passage étape par étape.
9. Choisir Acquis, Presque ou À revoir.
10. Vérifier le résumé de fin de session.

## État actuel du projet

Murajaah Flash est une version prototype avancée.

Ce qui est déjà utilisable :

- ajout automatique par verset cible ;
- bibliothèque ;
- révision en trois étapes ;
- Test Hifdh par hizb ;
- Bilan et Journal de révision libre ;
- suppression individuelle des révisions ;
- répétition espacée ;
- planification de la première révision ;
- stockage local ;
- export ;
- PWA et GitHub Pages ;
- design system et registre d’icônes Lucide.

Ce qui doit encore être amélioré :

- gestion parfaite des très longs versets ;
- meilleur historique par passage ;
- système d’import après export ;
- validation de l’installation PWA sur plusieurs appareils ;
- tests utilisateurs.

## Roadmap proposée

La roadmap active est maintenue dans [`docs/roadmap.md`](roadmap.md). Elle donne la priorité à la fiabilité du Mushaf, aux tests mobiles, à l’import des sauvegardes et à la validation utilisateur.

## Philosophie produit

Murajaah Flash doit rester :

- simple ;
- rapide ;
- sobre ;
- centré sur l’action ;
- utile avant décoratif ;
- respectueux de la récitation ;
- pensé pour les passages difficiles, pas pour tout faire.

La promesse est courte :

> Ancre tes passages glissants, pas ce que tu maîtrises déjà.

## Liens

Application GitHub Pages :

```text
https://ousmvne7.github.io/murajaah-flash/
```

Repository :

```text
https://github.com/ousmvne7/murajaah-flash
```
