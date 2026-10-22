# 🏳️ Banderas Quiz

<div align="center">

[![Vercel Deployment](https://img.shields.io/badge/vercel-deploy-black?style=for-the-badge&logo=vercel)](https://banderas-phi.vercel.app/)
[![Codacy Grade](https://img.shields.io/codacy/grade/c62e88ff237042179b3d0fe2c8f47554?style=for-the-badge&logo=codacy)](https://app.codacy.com/gh/Daniween/Banderas/dashboard)
[![CI Build](https://img.shields.io/github/actions/workflow/status/Daniween/Banderas/main.yml?branch=main&style=for-the-badge&logo=github-actions)](https://github.com/Daniween/Banderas/actions)
<br>
[![GitHub issues](https://img.shields.io/github/issues/Daniween/Banderas?style=for-the-badge)](https://github.com/Daniween/Banderas/issues)
[![GitHub stars](https://img.shields.io/github/stars/Daniween/Banderas?style=for-the-badge)](https://github.com/Daniween/Banderas/stargazers)
<br>
[![Vue.js](https://img.shields.io/badge/vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>


Bienvenue sur **Banderas Quiz**, une application web interactive conçue pour relever un défi personnel et ludique : **maîtriser les drapeaux des 197 pays reconnus par l'ONU.**

Ce projet est né de ma volonté personnelle d'apprendre à identifier tous les pays du monde.

## Objectifs

- **Apprendre** : Identifier les 197 drapeaux (Membres ONU + Observateurs + Kosovo + Taïwan).
- **Progresser** : Suivre ses connaissances grâce à une persistance locale, et ses records grâce à un compte.
- **S'amuser** : Plusieurs modes de jeu (Apprentissage infini, Survie "One-pass", par Continent, etc.).

## Stack Technique

- **Vue.js 3** (Composition API, composants chargés à la demande)
- **Vite 8** + **vite-plugin-pwa** (installable, fonctionne hors ligne)
- **Firebase** (Auth + Firestore Lite, chargé en différé) pour les comptes et le classement
- **Leaflet** (mode Carte, rendu Canvas)
- **CSS Vanilla** (design system à base de variables CSS, responsive)
- **Vitest** (tests unitaires)
- **Docker** (Conteneurisation)

Les données des pays sont **embarquées** dans l'application (`src/data/`) : aucun appel d'API au démarrage.
Elles sont générées à partir de [mledoze/countries](https://github.com/mledoze/countries) (noms, alias), [Wikidata](https://www.wikidata.org) (noms français des capitales) et [world.geo.json](https://github.com/johan/world.geo.json) (contours). Les drapeaux sont servis par [flagcdn](https://flagcdn.com).

---

## Modes de jeux
- Mode apprentissage : Les pays passent un par un jusqu'à ce que vous les connaissiez tous.
- Mode survie one-pass : Les pays passent un par un sans revenir en arrière.
- Mode capitale : Deviner la capitale du pays (en français ou en anglais : « Londres » comme « London »).
- Mode carte : Placer les pays sur la carte du monde.
- Mode entrainement : Entrainer vous sur les drapeaux que vous ne connaissez pas.
- Mode continent : Apprendre les drapeaux par continent.

---

## Installation et Lancement

Pour commencer, clonez ce dépôt sur votre machine :

```bash
git clone https://github.com/Daniween/Banderas.git
cd Banderas
```

Vous avez deux méthodes pour lancer l'application :

### Configuration (Firebase)

Pour faire fonctionner l'authentification et le classement, vous devez configurer vos identifiants Firebase :

1.  Créez un fichier `.env` à la racine du projet.
2.  Copiez le contenu de `.env.example` dans votre nouveau fichier `.env`.
3.  Remplacez les valeurs par vos propres identifiants (disponibles dans la console Firebase > Paramètres du projet).

```env
VITE_FIREBASE_API_KEY=votre_cle
VITE_FIREBASE_AUTH_DOMAIN=votre_domaine
...
```

> [!IMPORTANT]
> Ne partagez jamais votre fichier `.env`. Le projet est déjà configuré pour l'ignorer lors des commits (via `.gitignore`).

### Méthode 1 : Via NPM (Node.js)

Idéal pour le développement local.

1. **Installer les dépendances** :

   ```bash
   npm install
   ```

2. **Lancer le serveur de développement** :

   ```bash
   npm run dev
   ```

   L'application sera accessible sur `http://localhost:5173`.

3. **Lancer les tests** :

   ```bash
   npm test
   ```

4. **Compiler pour la production** :
   ```bash
   npm run build
   # Pour prévisualiser le build :
   npm run preview
   ```

### Méthode 2 : Via Docker

Idéal pour lancer l'application dans un environnement isolé et propre (conteneur Nginx).

1. **Construire l'image Docker** :

   ```bash
   docker build -t banderas-quiz .
   ```

2. **Lancer le conteneur** :
   ```bash
   docker run -p 8080:80 banderas-quiz
   ```
   L'application sera accessible sur `http://localhost:8080`.

### Mettre à jour les données des pays

```bash
npm run data
```

Régénère `src/data/countries.json` et `src/data/world.geo.json` depuis les sources (à committer ensuite).

### Firestore

Les règles de sécurité sont dans `firestore.rules` (validation des scores, pseudo de 20 caractères maximum). Pour les déployer :

```bash
firebase deploy --only firestore:rules
```

Index composites requis : `scores` (`mode` ↑, `score` ↓, `timeSeconds` ↑) pour le classement, et `scores` (`userId` ↑, `timestamp` ↓) pour le profil.

---

Bon apprentissage !

Made with <3 by Daniween
