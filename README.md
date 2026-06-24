# Murajaah Flash

Application mobile de révision ciblée du Coran.

## Structure

- `index.html` : structure des écrans et composants.
- `css/styles.css` : identité visuelle et mise en page responsive.
- `js/app.js` : navigation, passages, audio, répétition espacée et stockage local.

## Lancer l’application

L’enregistrement au microphone demande une adresse locale ou HTTPS. Depuis le terminal VS Code :

```bash
python3 -m http.server 8000
```

Ouvrir ensuite :

```text
http://localhost:8000
```

Les passages et les audios sont sauvegardés localement dans le navigateur.
