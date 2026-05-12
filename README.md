# Trading Journal Pro

Application professionnelle de suivi et d'analyse de trades.

## Fonctionnalités

- **Authentification** — Inscription, connexion, mot de passe oublié avec OTP
- **Gestion des trades** — Ajout, modification, suppression, filtres avancés
- **Dashboard** — Vue d'ensemble en temps réel (capital, P&L, winrate, nombre de trades)
- **Analyse mensuelle** — Performance par stratégie, meilleur/pires trades
- **Statistiques globales** — Série gagnante, gain/perte moyens, graphiques Chart.js
- **Export** — CSV et PDF
- **Profil utilisateur** — Modification nom, email, mot de passe
- **Thème** — Dark mode / Light mode
- **PWA** — Installable, fonctionne hors ligne

## Stack technique

- **Frontend** : Vanilla JS, CSS custom, Chart.js, html2pdf.js
- **Backend** : Node.js, Express, MongoDB, Mongoose
- **Auth** : JWT, bcrypt, OTP email (Nodemailer)

## Installation

```bash
# Cloner le repo
git clone <repo-url>
cd trading-journal

# Installer les dépendances
npm run setup

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos informations
```

### Configuration email (pour l'OTP)

1. Activez l'authentification 2 facteurs sur votre compte Google
2. Créez un "Mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Remplissez dans `backend/.env` :
   - `EMAIL_USER=votre-email@gmail.com`
   - `EMAIL_PASSWORD=votre-mot-de-passe-app-16-chars`

### MongoDB

Avec Docker :
```bash
docker run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:7
```

Ou installez MongoDB localement.

## Démarrage

```bash
# Lancer MongoDB (si Docker)
docker start mongodb

# Lancer le serveur
npm run dev

# Ouvrir http://localhost:3000
```

## Déploiement

### Variables d'environnement de production

```
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trading-journal
JWT_SECRET=un-secret-tres-long-et-aleatoire
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-app-password
EMAIL_FROM="Trading Journal Pro <noreply@votre-domaine.com>"
```

### Déploiement sur Railway / Render / Heroku

1. Poussez le code sur GitHub
2. Connectez le repo à votre plateforme
3. Set le build command : `cd backend && npm install`
4. Set le start command : `cd backend && node server.js`
5. Ajoutez les variables d'environnement

### Déploiement sur VPS

```bash
# Installer Node.js 18+, MongoDB, Nginx
git clone <repo-url>
cd trading-journal
npm run setup
cp backend/.env.example backend/.env
# Éditer .env

# PM2 pour la production
npm install -g pm2
pm2 start backend/server.js --name trading-journal
pm2 save
pm2 startup
```
