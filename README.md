# Mes cours : gestion de cours particuliers

Application mobile pour suivre mes cours particuliers : élèves, séances, paiements et versements de l'agence. Je l'utilise au quotidien avec mes élèves.

**Stack :** React Native (Expo) · API REST Flask · SQLite · hébergement PythonAnywhere

## Fonctionnalités

- **Élèves** : fiche par élève (niveau, matière, tarif), liste des difficultés et des choses à faire à la prochaine séance
- **Planning** : planification de séances, y compris des cours récurrents sur le même créneau
- **Séances** : préparation puis compte-rendu (ce qui a été fait, devoirs), tarif figé à la fin de la séance
- **Argent** : paiements reçus, montants dus, suivi des versements de l'agence (cours payés le mois suivant)
- **Tableau de bord** : vue d'ensemble sur l'accueil, thème clair / sombre
- **Connexion** par mot de passe avec jeton signé (itsdangerous), valable 6 mois

## Architecture

```
Cours_particuliers/
├── app.py          # API REST Flask (élèves, séances, paiements, tableau de bord)
├── schema.sql      # schéma SQLite
└── mobile/         # app React Native / Expo
    ├── App.js      # navigation, thèmes, polices
    └── src/        # onglets, pages, formulaires, composants, appels API
```

## Lancer en local

```bash
# API
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python app.py

# App mobile (dans mobile/)
npm install
npx expo start
```

Mets l'adresse de l'API dans `mobile/config.js`, puis scanne le QR code avec Expo Go. Détails dans [`mobile/README.md`](mobile/README.md).

Pour activer le mot de passe, crée un fichier `mot_de_passe.txt` à côté de `app.py` (il n'est pas versionné, comme la base de données).

## Auteure

Aya Messafri, élève ingénieure en informatique à l'INSA Lyon
