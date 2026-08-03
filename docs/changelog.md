# Journal des évolutions

## 3 août 2026

### Adhkār

- retrait des commandes d’ajout et de gestion des adhkār personnels ;
- ajout d’une collection interne d’adhkār validés, classés par matin et soir ;
- ajout d’Ayat al-Kursi avec arabe, traduction, référence et bienfait ;
- ouverture de la lecture guidée depuis la carte Adhkār du matin.
- simplification du lecteur : retrait de la phonétique et du bloc de répétition, avec compteur compact dans le bouton.
- chargement d’Ayat al-Kursi depuis la référence KFGQPC Hafs v18 `2:255`, sans copie arabe séparée.
- ajout des trois Qul dans l’ordre Al-Ikhlas, Al-Falaq et An-Nas, avec texte KFGQPC Hafs v18, traduction Hamidullah et trois répétitions chacune.

## 1 août 2026

### Adhkār

- ajout des accès Adhkār du matin et du soir dans Ressources ;
- ajout d’un espace personnel pour enregistrer un adhkār en arabe avec sa traduction française ;
- consultation, comptage et suppression des adhkār personnels stockés localement.
- configuration du nombre de répétitions pour chaque adhkār ;
- lecture guidée avec jauge globale, compteur individuel et écran de fin de session.

## 19 juillet 2026

### Interface

- activation du design system adapté à Murajaah Flash ;
- harmonisation typographique et correction des débordements mobiles ;
- navigation inférieure opaque avec quatre destinations stables ;
- Profil conservé en haut à droite ;
- simplification du Test Hifdh et suppression des blocs décoratifs redondants.

### Couleurs

- Révision ciblée en émeraude ;
- Test Hifdh en violet ;
- Bilan en bleu ;
- couleurs fonctionnelles restaurées : Acquis vert, Presque orange, À revoir rouge ;
- jauges fonctionnelles conservées même lorsqu’elles diffèrent de la couleur dominante de la page.

### Icônes

- adoption de Lucide Icons en sprite local ;
- `CirclePlus` pour Ajouter un passage ;
- `BookmarkCheck` pour Mes passages ;
- `ChartNoAxesColumnIncreasing` pour Bilan ;
- `Brain` pour Test Hifdh ;
- `CircleArrowRight` pour révéler et poursuivre vers le verset suivant.

### Bilan

- ajout du Journal de révision libre ;
- suppression individuelle d’une révision avec confirmation ;
- recalcul automatique de l’historique et des statistiques.

### Mes passages

- ajout d’une action `Trash2` sur chaque passage ;
- confirmation obligatoire avant suppression ;
- recalcul immédiat de l’Accueil, de Révision et de Progression.

### Traduction

- ajout d’un bouton `Languages` dans Révision ciblée et Test Hifdh ;
- affichage et masquage de la traduction française Muhammad Hamidullah ;
- mise à jour automatique après révélation du verset suivant ;
- chargement local et disponibilité hors ligne via le cache PWA ;
- séparation stricte entre la traduction française et le rendu KFGQPC Hafs v18.

### Ajouter un passage

- suppression complète du bloc d’enregistrement **Élan audio** ;
- conservation de la lecture des anciens audios déjà stockés ;
- simplification visuelle du sélecteur Quran ;
- ajout du choix **Aujourd’hui / Demain** pour la première révision avec l’icône `CalendarClock` ;
- conservation de la barre d’étapes de Révision dans l’en-tête ;
- placement du bouton **Traduction** à la place de la pastille du verset actif.

### Mushaf

- maintien exclusif de KFGQPC Hafs v18 ;
- aucune modification du texte coranique, des polices ou du rendu arabe pendant les refontes visuelles.
