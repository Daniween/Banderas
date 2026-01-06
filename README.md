# 🏳️ Banderas Quiz

Bienvenue sur **Banderas Quiz**, une application web interactive conçue pour relever un défi personnel et ludique : **maîtriser les drapeaux des 197 pays reconnus par l'ONU.**

Ce projet est né de ma volonté personnelle d'apprendre à identifier tous les pays du monde.

## Objectifs

- **Apprendre** : Identifier les 197 drapeaux (Membres ONU + Observateurs + Kosovo + Taïwan).
- **Progresser** : Suivre ses connaissances grâce à une persistance locale.
- **S'amuser** : Trois modes de jeu (Apprentissage infini, Survie "One-pass", et par Continent).

## Stack Technique

- **Vue.js 3** (Composition API)
- **Vite** (Build tool rapide)
- **CSS Vanilla** (Design premium Glassmorphism)
- **RestCountries API** (Données en temps réel)
- **Docker** (Conteneurisation)

---

## Installation et Lancement

Pour commencer, clonez ce dépôt sur votre machine :

```bash
git clone https://github.com/votre-user/banderas-quiz.git
cd banderas-quiz
```

Vous avez deux méthodes pour lancer l'application :

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

3. **Compiler pour la production** :
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

---

Bon apprentissage !

Made with <3 by Daniween
