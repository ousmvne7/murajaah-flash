# Murajaah Flash

**Murajaah Flash** est une application PWA mobile pour renforcer les passages du Coran où la mémoire hésite et suivre les révisions libres du Hifdh.

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

L’application programme ensuite la prochaine révision avec une répétition espacée simple. Le mode **Test Hifdh** évalue un hizb, tandis que le **Bilan** conserve le journal des révisions libres.

## Points forts

- Révision ciblée des passages fragiles
- Ajout assisté depuis une base Quran intégrée
- Remplissage automatique du verset avant, cible et après
- Audio d’élan sur le verset avant
- Récitation Minshawi en ligne à 1.25x
- Répétition espacée
- Test Hifdh par hizb avec auto-évaluation
- Traduction française Hamidullah affichable à la demande en Révision et Test Hifdh
- Journal de révision libre et historique supprimable
- Bilan de fréquence par hizb
- Données locales
- Sans compte
- Format PWA
- Interface cohérente basée sur Lucide Icons

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

L’utilisateur choisit ensuite si la première révision doit commencer **aujourd’hui** ou **demain**.

### Réviser

Le mode **Réciter** se fait en trois étapes :

1. écouter ou lire le verset avant ;
2. retrouver le verset cible ;
3. continuer avec le verset de liaison.

Le bouton **Traduction** affiche ou masque sous le verset la traduction française de Muhammad Hamidullah. Le texte arabe KFGQPC Hafs v18 reste inchangé.

### Passages

La bibliothèque permet de retrouver, filtrer, modifier et supprimer après confirmation les passages enregistrés.

### Test Hifdh

Le Test Hifdh propose des questions dans un hizb sélectionné. L’utilisateur peut afficher la traduction française à la demande, récite la suite, révèle le verset avec le bouton `CircleArrowRight`, puis choisit **Acquis**, **Presque** ou **À revoir**.

### Bilan

Le Bilan enregistre les révisions libres par hizb avec leur date, leur durée et leur ressenti. Chaque entrée peut être supprimée après confirmation et les statistiques sont recalculées automatiquement.

### Profil

Le Profil affiche une vue simple de la régularité, des passages revus et des passages encore fragiles. Il centralise aussi les réglages et la gestion des données locales.

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

## Installer l’application

La PWA doit être ouverte depuis une adresse **HTTPS** (par exemple GitHub Pages) ou depuis `localhost` pendant le développement. Elle ne peut pas être installée correctement depuis un fichier ouvert en `file://`.

- **Android / Chrome** : menu Chrome → **Ajouter à l’écran d’accueil** ou **Installer l’application**.
- **iPhone / iPad** : bouton **Partager** → **Sur l’écran d’accueil** → **Ajouter**.
- **Ordinateur / Chrome ou Edge** : icône d’installation située à droite de la barre d’adresse.

Une fois installée, Murajaah Flash s’ouvre en mode autonome, sans barre d’adresse. L’interface, les données coraniques et les polices principales sont disponibles hors ligne après le premier chargement. L’audio Minshawi et les pages Mushaf non encore consultées nécessitent une connexion ; les pages Mushaf déjà ouvertes sont mises en cache.

## Documentation

Le détail complet du projet est séparé dans le dossier [`docs`](docs/).

- [`docs/product-spec.md`](docs/product-spec.md) — cahier des charges complet
- [`docs/architecture.md`](docs/architecture.md) — structure technique
- [`docs/revision.md`](docs/revision.md) — méthode de révision
- [`docs/roadmap.md`](docs/roadmap.md) — prochaines étapes
- [`docs/changelog.md`](docs/changelog.md) — évolutions récentes
- [`design.md`](design.md) — design system actif
- [`ICON_SYSTEM.md`](ICON_SYSTEM.md) — registre officiel des icônes

## Sources des textes

Murajaah Flash utilise un texte arabe Uthmani local pour préparer les trois versets de récitation.

### Texte arabe

- Source : King Fahd Glorious Qur'an Printing Complex, via les ressources KFGQPC Hafs v18 utilisées dans l’app.
- Fichier local : `data/hafsData_v18.json`
- Police : `hafs.18.ttf` et `hafs.18.woff2`
- Tajwīd : non utilisé pour l’instant, afin de ne pas mélanger les sources ou les polices.

### Bornes des hizb

- Les 60 hizb utilisent leurs vrais versets de début et de fin, et non un découpage fixe de dix pages.
- Les pages sont résolues depuis la pagination locale KFGQPC Hafs v18.
- Fichier local : `data/hizb-boundaries.json`
- Métadonnées de partition : Tanzil Quran Metadata 1.0, miroir `quran-meta` 2.4.2.

## Roadmap courte

- Finaliser les tests sur appareils iOS et Android
- Renforcer les tests des longs versets et des petits écrans
- Ajouter l’import des sauvegardes JSON
- Préparer une phase de test utilisateur

## Statut

Murajaah Flash est un prototype avancé et fonctionnel en amélioration continue.

Le projet vise une expérience simple, rapide et utile pour la révision coranique ciblée.
