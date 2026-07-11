# Murajaah Flash

**Murajaah Flash** est une application PWA minimaliste pour renforcer uniquement les passages du Coran où la mémoire hésite.

L’idée est simple : ne pas réviser tout ce que l’on maîtrise déjà, mais cibler les **passages glissants**, les transitions difficiles et les versets qui reviennent souvent en erreur.

## Résumé rapide

Murajaah Flash aide à travailler un passage en 3 temps :

1. **Verset avant** — il donne l’élan.
2. **Verset cible** — le passage à retrouver.
3. **Verset de liaison** — le verset après, pour vérifier la fluidité.

Ensuite, l’utilisateur s’auto-évalue :

- **Acquis**
- **Presque**
- **À revoir**

L’application programme ensuite la prochaine révision avec une répétition espacée simple.

## Points forts

- Révision ciblée des passages fragiles
- Ajout assisté depuis une base Quran intégrée
- Remplissage automatique du verset avant, cible et après
- Audio d’élan sur le verset avant
- Récitation Minshawi en ligne à 1.25x
- Mode Comprendre avec traduction française préremplie
- Répétition espacée
- Données locales
- Sans compte
- Format PWA

## Méthode

```text
Verset avant
     ↓
Mémoire active
     ↓
Verset cible
     ↓
Verset de liaison
     ↓
Auto-évaluation
     ↓
Prochaine révision
```

Cette logique reprend l’idée du **liage** : on ne travaille pas seulement un verset isolé, mais l’enchaînement autour du passage fragile.

## Aperçu de l’application

Screenshots à ajouter :

- Accueil
- Ajouter un passage
- Révision
- Bibliothèque
- Fin de session

> Les captures seront ajoutées dans une prochaine étape pour rendre le projet plus visuel.

## Fonctionnalités

### Accueil

L’écran d’accueil affiche la session du jour, le nombre de passages à revoir et une estimation rapide du temps nécessaire.

### Ajouter

L’utilisateur choisit une sourate et un verset cible.  
En mode **Réciter**, l’application prépare automatiquement :

- le verset avant ;
- le verset cible ;
- le verset après.

Un audio personnel peut aussi être ajouté sur le verset avant.

En mode **Comprendre**, l’utilisateur choisit uniquement le verset cible.  
La traduction française Muhammad Hamidullah est préremplie automatiquement, puis reste modifiable avant l’enregistrement.

### Réviser

Le mode **Réciter** se fait en trois étapes :

1. écouter ou lire le verset avant ;
2. retrouver le verset cible ;
3. continuer avec le verset de liaison.

Le mode **Comprendre** affiche le verset arabe, cache d’abord la traduction, puis demande à l’utilisateur de retrouver le sens du verset avant de s’auto-évaluer.

### Passages

La bibliothèque permet de retrouver, filtrer et relancer les passages enregistrés.

### Progression

L’application affiche une vue simple de la régularité, des passages revus et des passages encore fragiles.

## Installation locale

Le projet est une app web statique.

```bash
git clone https://github.com/ousmvne7/murajaah-flash.git
cd murajaah-flash
python3 -m http.server 8765
```

Puis ouvrir :

```text
http://127.0.0.1:8765/
```

## Documentation

Le détail complet du projet est séparé dans le dossier [`docs`](docs/).

- [`docs/product-spec.md`](docs/product-spec.md) — cahier des charges complet
- [`docs/architecture.md`](docs/architecture.md) — structure technique
- [`docs/revision.md`](docs/revision.md) — méthode de révision
- [`docs/roadmap.md`](docs/roadmap.md) — prochaines étapes

## Sources des textes

Murajaah Flash sépare les sources textuelles pour pouvoir remplacer une traduction sans toucher au texte arabe.

```text
TextRepository
├── KFGQPC Hafs — texte arabe Uthmani
└── Hamidullah — traduction française
```

### Texte arabe

- Source : King Fahd Glorious Qur'an Printing Complex, via les ressources KFGQPC Hafs utilisées dans l’app.
- Fichier local : `data/quran-uthmani.json`
- Police : `hafs.18.ttf`

### Traduction française

- Traduction : Muhammad Hamidullah
- Source : [QUL Resources — Muhammad Hamidullah](https://qul.tarteel.ai/resources/translation/227)
- Ressource API QUL : `quran.fr.hamidullah`
- Fichier local : `data/quran-fr-hamidullah.json`
- Format interne : `{ surah, ayah, text }`

Les données sont embarquées localement : l’application n’a pas besoin d’appeler QUL pendant l’utilisation.

Les conditions d’utilisation de QUL renvoient vers les [Terms of Service de Tarteel](https://www.tarteel.ai/terms). Toute distribution publique ou commerciale doit respecter ces conditions et les crédits de la source.

## Roadmap courte

- Ajouter des screenshots propres
- Ajouter des GIF de démonstration
- Améliorer la fin de session
- Stabiliser l’expérience sur petits écrans
- Préparer une vraie version mobile installable

## Statut

Murajaah Flash est un prototype fonctionnel en amélioration continue.

Le projet vise une expérience simple, rapide et utile pour la révision coranique ciblée.
