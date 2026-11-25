# Mes cours — app mobile

App React Native (Expo) qui affiche et modifie les données de l'API Flask du dossier parent.

## Lancer le projet

1. **Démarrer l'API Flask** (dans le dossier `Cours_particuliers`) :
   ```
   venv\Scripts\activate
   python app.py
   ```
   Si Windows demande d'autoriser Python sur le réseau, accepte pour les **réseaux privés**.

2. **Trouver l'adresse IP du PC** : dans un terminal, `ipconfig`, puis regarde la ligne « Adresse IPv4 » de ta carte Wi-Fi (ex : `192.168.1.23`).
   Mets-la dans `mobile/config.js` :
   ```js
   export const API_URL = "http://192.168.1.23:5000";
   ```

3. **Lancer l'app** (dans le dossier `mobile`, il faut Node.js installé) :
   ```
   npm install
   npx expo start
   ```

4. Sur ton téléphone, installe **Expo Go** (App Store ou Play Store) et scanne le QR code affiché dans le terminal.
   Le téléphone et le PC doivent être sur le **même Wi-Fi**.

## Organisation du code

- `App.js` : point d'entrée, polices, thème clair/sombre, onglets, navigation entre pages
- `src/api.js` : appels à l'API Flask
- `src/tabs.js` : onglets Accueil, Planning, Élèves, Argent
- `src/pages.js` : fiche élève et page d'une séance (préparation / compte-rendu)
- `src/sheets.js` : formulaires (profil, planifier, terminer une séance, paiement)
- `src/ui.js`, `src/blocks.js` : composants réutilisables (boutons, listes à cocher, sélecteur de date…)
- `src/theme.js` : couleurs des deux thèmes, polices
- `src/format.js` : affichage des montants, durées et dates en français

## Astuces

- Le bouton lune / soleil sur l'accueil change de thème.
- Tire l'écran vers le bas pour rafraîchir.
- Appui long sur une difficulté, une ligne « à faire » ou un paiement pour le supprimer.
