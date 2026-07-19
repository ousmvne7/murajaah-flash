# Murajaah Flash - Design System

> Adaptation mobile de la reference Refero **Hims App - spa brochure on vellum paper**.
> Source analysee le 19 juillet 2026 : https://styles.refero.design/style/0a489bce-4f93-4b38-b612-d87b1d00999e

**Statut :** design system actif depuis le 19 juillet 2026.

## Direction

Murajaah Flash doit etre calme, simple et premium. Le contenu et les actions passent avant la decoration. La base Hims App apporte l'espace, la retenue chromatique, les surfaces claires et une hierarchie typographique forte. Elle est adaptee ici a une interface mobile de revision quotidienne, plus compacte et plus fonctionnelle.

Principes :

- une action principale evidente par ecran ;
- peu de couleurs simultanees ;
- surfaces claires, bordures fines et ombres discretes ;
- aucune decoration qui concurrence le Mushaf ou les donnees ;
- densite confortable, mais sans grands vides editoriaux inutiles ;
- composants identiques sur toutes les pages ;
- aucune modification du rendu KFGQPC Hafs v18.

## Couleurs

| Role | Valeur | Token | Usage |
|---|---:|---|---|
| Emeraude principal | `#0A5A43` | `--color-primary` | Revision ciblee, CTA principal, etat actif |
| Emeraude profond | `#073D2F` | `--color-primary-strong` | Texte ou fond renforce du mode Revision |
| Emeraude doux | `#E3F3EC` | `--color-primary-soft` | Badges et fonds d'etat legers |
| Violet Hifdh | `#5439AF` | `--color-hifdh` | Test Hifdh uniquement |
| Violet profond | `#44357D` | `--color-hifdh-strong` | Etats actifs ou contrastes du Test Hifdh |
| Violet doux | `#F0E9FF` | `--color-hifdh-soft` | Badges et fonds legers du Test Hifdh |
| Bleu Journal | `#2457C5` | `--color-journal` | Journal, Bilan et graphiques associes |
| Bleu profond | `#183F98` | `--color-journal-strong` | Etats actifs du Journal |
| Bleu doux | `#EEF4FF` | `--color-journal-soft` | Fonds et badges du Journal |
| Encre | `#172338` | `--color-ink` | Titres et texte principal |
| Texte secondaire | `#6D7B8F` | `--color-muted` | Aides, dates et metadonnees |
| Ligne | `#E6EBF1` | `--color-line` | Bordures et separateurs |
| Fond ivoire | `#F8F7F3` | `--color-canvas` | Fond global recommande |
| Surface | `#FFFFFF` | `--color-surface` | Cartes, formulaires et navigation |
| Succes | `#239B66` | `--color-success` | Acquis, validation positive |
| Attention | `#E9852D` | `--color-warning` | A renforcer, etat moyen |
| Danger | `#DD4B5C` | `--color-danger` | Suppression, erreur, a revoir |

### Regles de couleur

- Un ecran emploie une seule couleur de mode dominante.
- Le vert, le violet et le bleu ne doivent pas devenir trois decorations concurrentes.
- Les couleurs succes, attention et danger sont reservees aux statuts.
- Les statuts Acquis, Presque et A revoir conservent respectivement le vert, l'orange et le rouge, meme dans une page dominee par une autre couleur.
- Les jauges de progression conservent leur couleur fonctionnelle lorsqu'elle transmet une information essentielle.
- Les degradés decoratifs sont exclus des surfaces ordinaires.
- Un degrade peut rester sur un CTA majeur ou un hero de mode, avec deux tons d'une meme famille seulement.
- Le texte courant reste Encre ou Texte secondaire, jamais dans une couleur de mode.

## Typographie

### Familles

- Interface : `Inter`, puis `ui-sans-serif`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- Texte coranique : `KFGQPC Hafs` v18 exclusivement.
- Ne jamais appliquer Inter au Mushaf et ne jamais appliquer KFGQPC Hafs a l'interface.

### Echelle mobile

| Role | Taille | Graisse | Hauteur de ligne |
|---|---:|---:|---:|
| Micro-label | 11px | 600 | 1.35 |
| Legende | 12px | 500 | 1.4 |
| Texte secondaire | 14px | 400 | 1.45 |
| Corps | 16px | 400 | 1.5 |
| Sous-titre | 18px | 600 | 1.35 |
| Titre de bloc | 20px | 700 | 1.25 |
| Titre de page | 24px | 700 | 1.2 |
| Chiffre cle | 30px | 700 | 1.1 |

Regles : `letter-spacing: 0` partout, deux graisses dominantes par ecran, aucun texte essentiel sous 12px, aucun texte tronque sans solution de consultation.

## Espacement

**Unite de base :** 4px.

| Usage | Valeur |
|---|---:|
| Marge horizontale mobile | 16px |
| Ecart entre sections | 24px |
| Padding de carte | 16px |
| Ecart entre elements lies | 8px |
| Ecart standard | 12px |
| Ecart confortable | 16px |
| Cible tactile minimale | 44x44px |

Respecter les safe areas iOS et Android. La navigation basse reste collee au bas de l'application, opaque et toujours lisible.

## Formes et elevation

| Element | Rayon |
|---|---:|
| Carte | 8px |
| Bouton | 8px |
| Champ | 8px |
| Bouton icone | 8px |
| Modal / sheet | 8px |
| Badge ou filtre | 999px |

Ombres :

- carte standard : `0 4px 16px rgba(23, 35, 56, 0.06)` ;
- navigation : `0 -4px 18px rgba(23, 35, 56, 0.08)` ;
- modal : `0 16px 40px rgba(23, 35, 56, 0.16)`.

Les bordures fines sont preferees aux ombres fortes. Il ne faut ni verre floute, ni transparence sur la navigation, ni empilement de cartes dans des cartes.

## Composants

### Navigation basse

Quatre destinations stables : Accueil, Revision, Test Hifdh, Bilan. Fond blanc opaque, quatre colonnes egales, icone Lucide 24px et libelle 12px. L'onglet actif utilise la couleur de sa fonction sans changer d'icone.

### En-tete de page

Titre court, bouton retour de 44px a gauche sur les pages secondaires, action contextuelle a droite uniquement si necessaire. Pas de bouton Reglages hors du Profil.

### Carte

Une carte represente une information ou une action complete. Fond blanc, bordure `1px solid var(--color-line)`, rayon 8px, padding 16px. Aucun cadre decoratif imbrique.

### Boutons

- Primaire : fond de la couleur du mode, texte blanc, hauteur minimale 48px.
- Secondaire : fond blanc, bordure fine, texte Encre.
- Destructif : fond blanc ou danger doux, texte Danger.
- Icone seule : 44x44px, tooltip ou `aria-label` obligatoire.

### Traduction du verset

Le contrôle utilise l’icône Lucide `Languages` et le libellé **Traduction**. Son état actif reprend la couleur principale de la page : émeraude en Révision, violet en Test Hifdh. Le panneau français est placé sous le verset actif, en lecture gauche-droite, avec une typographie d’interface distincte de la police du Mushaf.

La traduction est facultative, masquée par défaut et ne doit jamais modifier le contenu, la police ou les signes du texte arabe KFGQPC Hafs v18.

Dans Révision ciblée, la barre d’étapes « Verset avant / cible / liaison » reste dans l’en-tête. Le contrôle **Traduction** remplace la pastille contextuelle du verset actif, en haut à droite de son bloc.

### Ajouter un passage

La sélection coranique utilise une surface blanche sobre avec un accent émeraude. Après validation du passage, un contrôle segmenté **Aujourd’hui / Demain** définit la première révision. Le bloc d’enregistrement audio personnel n’est plus affiché.

### Champs et controles

Hauteur minimale 44px, libelle persistant au-dessus, message d'erreur sous le champ. Les choix exclusifs utilisent un segmented control ou des radios. Les choix binaires utilisent une checkbox ou un switch.

### Statuts

Ne jamais transmettre un statut uniquement par la couleur. Associer texte, icone et couleur : Acquis, Presque, A revoir.

### Mushaf

Le Mushaf est une surface fonctionnelle protegee. Police et donnees officielles : `hafsData_v18.json`, `hafs.18.ttf`, `hafs.18.woff2`. Aucun filtre, nettoyage ou remplacement de glyphe non documente. Le Tajwid reste hors perimetre tant qu'il n'est pas valide separement.

Toute refonte d'interface doit exclure les donnees coraniques, les polices KFGQPC et les fonctions de rendu arabe de son perimetre.

## Mouvement

- duree standard : 160 a 220ms ;
- `ease-out` pour apparition, `ease-in` pour disparition ;
- aucune animation permanente decorative ;
- respecter `prefers-reduced-motion` ;
- aucun mouvement ne doit retarder une action de revision.

## Accessibilite

- contraste WCAG AA au minimum ;
- cible tactile de 44px ;
- focus visible ;
- nom accessible pour toute icone interactive ;
- ordre de lecture identique a l'ordre visuel ;
- interface utilisable a 200% de zoom sans perte de contenu ;
- texte arabe conserve en RTL sans modifier les donnees sources.

## A faire

- Simplifier avant d'ajouter une decoration.
- Garder une hierarchie constante entre toutes les pages.
- Employer la couleur du mode uniquement aux endroits utiles.
- Utiliser les icones definies dans `ICON_SYSTEM.md`.
- Tester a 340px, 390px et 430px de largeur.

## A eviter

- Multiplier les gradients, motifs, lueurs et illustrations.
- Utiliser de grands rayons sur chaque bloc.
- Melanger plusieurs styles d'icones.
- Ajouter une action sans libelle clair.
- Redessiner une icone a la main.
- Modifier le Mushaf pendant une refonte visuelle.

## Heritage Refero conserve

De Hims App, Murajaah Flash conserve : la respiration, la sobriete, une typographie sans serif unique, les surfaces claires, les bordures fines et une couleur d'accent controlee par contexte. Les tailles editoriales extremes, les rayons de 30 a 52px et les ombres tres diffusees ont ete remplaces par des valeurs adaptees a une application mobile operationnelle.
