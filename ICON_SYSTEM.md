# Murajaah Flash - Icon System

**Statut :** registre actif et implante localement depuis le 19 juillet 2026.

## Bibliotheque retenue

**Lucide Icons** - https://lucide.dev/icons/

Lucide est retenue pour son dessin simple, regulier et professionnel, sa couverture fonctionnelle et son fonctionnement en SVG. Elle correspond au langage visuel actuel de Murajaah Flash et evite les icones approximatives dessinees a la main.

Implementation actuelle : sprite local verrouille dans `assets/icons/lucide.svg` pour conserver le fonctionnement hors ligne de la PWA. Ne pas charger les icones depuis un CDN en production.

## Regles globales

- Utiliser exclusivement une icone provenant de Lucide.
- Utiliser le nom exact indique dans le registre ci-dessous.
- Une fonction conserve la meme icone sur toutes les pages et dans tous ses etats.
- Un etat actif change la couleur ou le fond, jamais le pictogramme.
- Style par defaut : contour, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Tailles : 24px navigation, 20px actions, 18px metadonnees, 16px badges.
- Bouton icone seul : cible 44x44px avec `aria-label` et tooltip si le sens n'est pas immediat.
- Ne pas melanger Lucide avec des emojis, des glyphes de police ou des SVG dessines manuellement.
- Les illustrations de marque et le Mushaf ne sont pas des icones d'interface et restent hors de ce registre.

## Registre officiel

| Zone | Fonction | Icone Lucide exacte | Usage impose |
|---|---|---|---|
| Navigation | Accueil | `House` | Onglet Accueil et retour explicite a l'accueil |
| Navigation | Revision ciblee | `BookOpen` | Onglet Revision et acces au mode Revision |
| Navigation et Accueil | Test Hifdh | `Brain` | Onglet et accès au Test Hifdh |
| Navigation | Bilan / Journal | `ChartNoAxesColumnIncreasing` | Onglet Bilan et syntheses de progression |
| Navigation | Profil | `UserRound` | Acces au Profil sur toutes les pages |
| Navigation | Retour | `ArrowLeft` | Bouton retour en haut a gauche |
| Navigation | Etape suivante | `CircleArrowRight` | CTA pour avancer vers le verset ou l'etape suivante |
| Navigation | Ouvrir un detail | `ChevronRight` | Fin de ligne ou de carte ouvrant un detail |
| Navigation | Deplier | `ChevronDown` | Select, accordéon et liste deroulante |
| Global | Fermer | `X` | Modal, sheet, picker et panneau temporaire |
| Global | Ajouter | `Plus` | Action generique d'ajout |
| Global | Modifier | `Pencil` | Edition d'un passage ou d'une revision |
| Global | Enregistrer | `Save` | Sauvegarde explicite |
| Global | Supprimer | `Trash2` | Suppression d'une donnee ou d'un audio |
| Global | Rechercher | `Search` | Recherche de passage, sourate ou hizb |
| Global | Filtrer | `ListFilter` | Ouverture et identification des filtres |
| Global | Trier | `ArrowUpDown` | Changement d'ordre d'une liste |
| Global | Reglages | `Settings` | Profil, onglet Reglages uniquement |
| Global | Aide | `CircleQuestionMark` | Aide contextuelle |
| Global | Information | `Info` | Information non bloquante |
| Global | Exporter | `Download` | Export des donnees locales |
| Global | Confirmer | `Check` | Validation compacte ou confirmation de modal |
| Global | Annuler | `X` | Annulation compacte et fermeture |
| Global | Plus d'options | `Ellipsis` | Menu secondaire exceptionnel |
| Accueil | Session du jour | `CalendarCheck` | Carte de la session quotidienne |
| Accueil | Duree estimee | `Clock3` | Duree d'une session ou heure d'une action |
| Accueil | Serie actuelle | `Flame` | Nombre de jours consecutifs |
| Accueil | Commencer la revision | `Play` | Lancement d'une session |
| Accueil, Révision, Mes passages | Ajouter un passage | `CirclePlus` | Action unique d’ajout d’un passage |
| Accueil, Révision | Mes passages | `BookmarkCheck` | Passages personnels enregistrés |
| Accueil | Bilan | `ChartNoAxesColumnIncreasing` | Accès rapide au Bilan |
| Bibliotheque | Total des passages | `LibraryBig` | Statistique Total |
| Bibliotheque | Maitrise | `CircleCheckBig` | Statut Maitrise / Acquis |
| Bibliotheque | A renforcer | `CircleDashed` | Statut fragile ou presque acquis |
| Bibliotheque | A revoir | `RefreshCcw` | Statut necessitant une nouvelle revision |
| Bibliotheque | Supprimer un passage | `Trash2` | Suppression individuelle avec confirmation |
| Bibliotheque | Echeance | `ClockAlert` | Passage arrive a echeance |
| Passage | Selection coranique | `BookOpenText` | Ouverture du selecteur sourate / verset |
| Passage | Remplissage automatique | `WandSparkles` | Generation des champs depuis la selection |
| Passage | Premiere revision | `CalendarClock` | Choix entre aujourd'hui et demain |
| Passage | Enchainement | `Link2` | Type d'hesitation Enchainement |
| Passage | Debut du passage | `RotateCcw` | Type d'hesitation Debut |
| Passage | Confusion | `Copy` | Type d'hesitation versets similaires |
| Passage | Oubli frequent | `Bookmark` | Type d'hesitation Oubli frequent |
| Audio | Ecouter | `Play` | Lecture d'un audio a l'arret |
| Audio | Pause | `Pause` | Pause d'un audio en lecture |
| Audio | Volume / recitation | `Volume2` | Identification d'un contenu audio |
| Revision et Test Hifdh | Voir le verset suivant | `CircleArrowRight` | Revelation et progression vers le verset ou la suite |
| Revision et Test Hifdh | Traduction | `Languages` | Afficher ou masquer la traduction francaise du verset actif |
| Revision | Acquis | `CircleCheckBig` | Evaluation positive |
| Revision | Presque | `CircleDashed` | Evaluation intermediaire |
| Revision | A revoir | `RefreshCcw` | Evaluation negative et reprogrammation |
| Revision | Reessayer | `RotateCcw` | Revoir les passages rates maintenant |
| Revision | Session terminee | `Trophy` | Ecran de fin de session |
| Test Hifdh | Choisir un hizb | `List` | Ouverture du selecteur de hizb |
| Test Hifdh | Nombre de questions | `ListChecks` | Choix 5, 10 ou 20 questions |
| Test Hifdh | Objectif du test | `Target` | Identification du mode Test Hifdh |
| Test Hifdh | Points faibles | `TriangleAlert` | Liste des passages faibles detectes |
| Test Hifdh | Ajouter un point faible | `BookPlus` | Ajout aux passages cibles |
| Journal | Ajouter une revision | `CalendarPlus` | Creation d'une revision libre |
| Journal | Date | `CalendarDays` | Choix ou affichage de la date |
| Journal | Duree | `Timer` | Duree d'une revision libre |
| Journal | Ressenti fluide | `Smile` | Choix Fluide |
| Journal | Ressenti moyen | `Meh` | Choix Moyen |
| Journal | Ressenti difficile | `Frown` | Choix Difficile |
| Journal | Frequence | `Repeat2` | Frequence de revision par hizb |
| Journal | Prochaine etape | `ArrowRight` | Continuer avec le hizb suivant |
| Journal | Supprimer une revision | `Trash2` | Suppression individuelle avec confirmation |
| Profil | Progression | `ChartNoAxesColumnIncreasing` | Onglet et graphiques de progression |
| Profil | Memoire | `Brain` | Parametres lies a l'apprentissage |
| Profil | Confidentialite locale | `LockKeyhole` | Donnees stockees sur l'appareil |
| Profil | Effacer les donnees | `Trash2` | Reinitialisation destructive |
| Systeme | Succes | `CircleCheck` | Toast ou message de succes |
| Systeme | Avertissement | `TriangleAlert` | Alerte non destructive |
| Systeme | Erreur | `CircleX` | Erreur bloquante |
| Mushaf | Lecture du Mushaf | `BookOpen` | Identification de la vue Mushaf |
| Mushaf | Verset cible | `Focus` | Mise en evidence d'un verset dans les outils |

## Decisions d'uniformite

- `House`, `BookOpen`, `Brain` et `ChartNoAxesColumnIncreasing` sont les quatre seules icones de la navigation basse.
- `ArrowLeft` est l'unique icone de retour. Ne jamais utiliser `ChevronLeft` pour la meme action.
- `Plus` sert a l'ajout generique ; `CirclePlus` sert uniquement a l'ajout d'un passage ; `CalendarPlus` sert uniquement a l'ajout d'une revision libre.
- `CircleArrowRight` sert a reveler et poursuivre vers le verset suivant ; `Play` sert uniquement a lancer ou lire.
- `Trash2` est toujours destructif et doit etre accompagne d'une confirmation lorsque la suppression n'est pas reversible.
- `CircleCheckBig`, `CircleDashed` et `RefreshCcw` forment le trio officiel Acquis / Presque / A revoir.

## Controle avant implementation

Toutes les fonctions actuellement identifiees disposent d'une icone Lucide appropriee. Aucune exception ne necessite une icone inventee. Si une nouvelle fonction ne correspond pas clairement a une icone Lucide, l'implementation doit s'arreter et le choix doit etre valide avant ajout.
