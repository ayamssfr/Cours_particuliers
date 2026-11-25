# Mettre l'app en ligne sur PythonAnywhere

Compte : `ayamssfr`. Ton app sera à l'adresse affichée en haut de l'onglet **Web**
(normalement `https://ayamssfr.pythonanywhere.com`).

## 1. Envoyer les fichiers
1. Onglet **Files** → bouton **Upload a file** → choisis `cours.zip` (dans ton dossier `Cours_particuliers`).
2. Onglet **Consoles** → **Bash**. Tape :
   ```
   unzip cours.zip
   pip3.13 install --user --upgrade flask
   ```
   Ça crée le dossier `/home/ayamssfr/cours`.

## 2. Ajouter tes données et ton mot de passe
1. Onglet **Files** → ouvre le dossier `cours` → **Upload a file** → choisis ton `database.db`
   (dans `Cours_particuliers` sur ton PC).
2. Toujours dans `cours`, dans la case « New file », tape `mot_de_passe.txt` → **New file**.
   Écris ton mot de passe sur la première ligne, rien d'autre → **Save**.

## 3. Créer l'app web
1. Onglet **Web** → **Add a new web app** → **Next**.
2. Choisis **Manual configuration** (pas « Flask ») → **Python 3.13** → **Next**.
3. Dans la page qui s'affiche :
   - **Source code** : `/home/ayamssfr/cours`
   - **WSGI configuration file** : clique sur le lien, efface tout et colle :
     ```python
     import sys
     path = "/home/ayamssfr/cours"
     if path not in sys.path:
         sys.path.insert(0, path)
     from app import app as application
     ```
     → **Save**.
   - **Force HTTPS** : passe-le sur **Enabled**.
4. En haut de l'onglet **Web** : bouton vert **Reload**.
5. Ouvre l'adresse de ton app : l'écran du mot de passe doit s'afficher.

## 4. L'installer sur l'iPhone
Ouvre l'adresse dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.

## Une fois par mois
Onglet **Web** → bouton **Run until 1 month from today**. Sinon l'app s'arrête
(tes données restent là, il suffit de cliquer pour la relancer).

## Mettre à jour l'app plus tard
Sur le PC, dans `mobile` : `npm run build:web` (crée le dossier `web`).
Puis envoie `app.py` et/ou le contenu de `web` dans `/home/ayamssfr/cours`
(ou un nouveau zip), et clique sur **Reload**.

## En cas de problème
Onglet **Web** → lien **Error log** : la dernière erreur est en bas.
