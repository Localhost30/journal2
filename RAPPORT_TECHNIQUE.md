# Rapporte Technique — Trading Journal Pro

## 1. Vue d'ensemble du projet

Trading Journal Pro est une application web fullstack conçue pour les traders souhaitant suivre, analyser et optimiser leurs performances de trading sur les marchés financiers. L'application adopte une architecture **SPA (Single Page Application)** classique avec un frontend vanilla JavaScript et un backend Node.js/Express, le tout package comme application **PWA (Progressive Web App)**.

**Objectif principal** : Offrir une plateforme centralisee ou les traders peuvent enregistrer leurs transactions, calculer automatiquement leur profit et perte (P&L), analyser leurs performances par strategie et periode, et generer des rapports exportables. L'application est concue pour fonctionner en mode connecte (donnees synchronisees sur un backend) avec un mode hors-ligne degrade (localStorage) lorsque le serveur est indisponible.

---

## 2. Architecture technique

### 2.1 Architecture generale

```
+------------------+     +-------------------+     +------------------+
|   Utilisateur    | --> |   Frontend SPA    | --> |  Backend API     |
|   (Browser)      |     |   (Vanilla JS)    |     |   (Express)     |
+------------------+     +-------------------+     +------------------+
                                    |                   |
                                    |                   v
                                    |            +------------------+
                                    |            |    SQLite        |
                                    |            |   (better-       |
                                    |            |    sqlite3)      |
                                    |            +------------------+
                                    |                   |
                                    v                   v
                            +-------------------+
                            |    localStorage     |
                            |   (fallback 503)    |
                            +-------------------+
```

### 2.2 Stack technique complete

| Couche | Technologie |
|--------|-------------|
| **Frontend** | HTML5, CSS3 (variables CSS, flexbox, grid), JavaScript ES6+ (vanilla, sans framework) |
| **UI/Composants** | Composants natifs DOM, aucune librairie UI externe (hors Chart.js pour les graphiques) |
| **Graphiques** | Chart.js (CDN) — courbe d'evolution du capital, diagramme distribution gains/pertes |
| **Export** | Blob (CSV), html2pdf.js (PDF) |
| **Backend** | Node.js, Express.js |
| **Base de donnees** | SQLite via `better-sqlite3` (driver synchron, base fichier) |
| **Authentification** | JWT (jsonwebtoken), bcryptjs (hash mots de passe) |
| **Email** | Nodemailer (SMTP Gmail) pour l'OTP de reinitialisation de mot de passe |
| **Conteneurisation** | Docker (Node.js 20 Alpine + Python3 + make + g++) |
| **Reverse proxy** | Nginx (cas VPS) |
| **PM2** | Process Manager pour Node.js (cas VPS) |
| **PWA** | Service Worker (cache-first strategy), Manifest JSON |

---

## 3. Structure du projet

```
trading-journal/
|-- index.html                          # SPA unique — toutes les vues (auth + app)
|-- manifest.json                      # Manifest PWA
|-- sw.js                               # Service Worker (cache des assets statiques)
|-- js/
|   └── app.js                          # Coeur applicatif frontend (~1266 lignes)
|-- css/
|   └── style.css                       # Theme dark/light complet (~2100 lignes)
|-- images/
|   └── icon-192.svg                    # Icône applicative PWA
|-- backend/
|   |-- server.js                       # Point d'entree Express
|   |-- .env                            # Variables d'environnement
|   |-- .env.example                    # Template variables
|   |-- package.json                    # Dependances backend
|   |-- config/
|   |   |-- db.js                       # Configuration SQLite + schema
|   |   └── email.js                    # Transporteur Nodemailer pour OTP
|   |-- middleware/
|   |   └── auth.js                     # Middleware de verification JWT
|   |-- models/
|   |   |-- User.js                     # Classe modele User (acces SQLite)
|   |   └── Trade.js                    # Classe modele Trade (acces SQLite)
|   |-- data/                           # Fichier app.db (SQLite) + WAL
|   └── routes/
|       |-- auth.js                     # Endpoints auth (register, login, OTP, ...)
|       |-- trades.js                   # Endpoints CRUD trades
|       └── settings.js                 # Endpoints parametres utilisateur
|-- Dockerfile                          # Image Docker (Alpine + compilation)
|-- dockerignore                        # Exclusions Docker
|-- deploy.sh                           # Script deploiement VPS (Nginx + PM2)
|-- render.yaml                         # Configuration deploiement Render
|-- package.json                        # Scripts generaux
`-- README.md                            # Documentation projet
```

---

## 4. Frontend — Application SPA

### 4.1 Approche technique
Le frontend est un SPA "monopage" vanilla JavaScript. Toutes les vues (pages) sont definies dans le meme fichier `index.html` avec des conteneurs `<div>` separes. Le JavaScript controle l'affichage en basculant les classes CSS `hidden` ou `active`. Cette approche evite un framework JavaScript et assure une charge initiale rapide.

### 4.2 Pages/sections du frontend

| Section | Description |
|---------|-------------|
| **Vue Login** | Formulaire d'authentification (email + mot de passe), lien vers inscription, lien recuperation |
| **Vue Register** | Formulaire de creation de compte (nom, email, mot de passe) |
| **Vue Forgot Password** | Formulaire — envoie un OTP de 6 chiffres sur l'email |
| **Vue OTP Verification** | 6 champs input pour le code OTP numérique -
| **Vue Reset Password** | Formulaire de nouveau mot de passe (apres OTP verifie) |
| **Vue Principale (App)** | Header, navigation, et 3 onglets dynamiques (Trades, Analyse, Stats) |
| **Vue Profil** | Modification du profil et suppression de compte |
| **Vue Parametres** | Capital initial, devise, suppression des donnees |

### 4.3 Onglets de l'application

#### Onglet "Trades"
- Tableau des transactions avec toutes les colonnes (pair, direction, entry/exit price, P&L, strategie, timeframe, dates)
- Ajout / edition via modal interface utilisateur
- Filtres (par strategie, timeframe, date)
- Calcule automatique du P&L lorsque entryPrice, exitPrice, direction et positionSize sont fournies

#### Onglet "Analyse"
- Statistiques periodiques actives (selection du mois)
- Winrate (pourcentage de trades gagnants)
- Meilleur trade / Pire trade du mois
- Distribution par strategie (trades et P&L)
- Export vers CSV / PDF

#### Onglet "Stats"
- Capital courant vs initial
- Nombre de trades gagnants / perdants / total
- Gain moyen vs perte moyenne
- Serie gagnante la plus importante

### 4.4 Systeme de themes
- Theme **dark** (par defaut) — palette de couleurs bleus, cyan, gris fonce
- Theme **light** — palette claire alternative accessible via toggle
- Persistance dans `localStorage`

### 4.5 Gestion du mode hors-ligne
Le frontend detecte si le serveur retourne une erreur 503 (service indisponible). Dans ce cas :
1. Les appels API sont court-circuited
2. Les donnees utilisateur et trades sont lues depuis `localStorage`
3. Les modifications sont sauvegardées dans `localStorage`
4. Un indicateur visual "Mode Hors-ligne" est affiche dans l'interface

---

## 5. Backend — API Express

### 5.1 Point d'entree (server.js)
Le serveur Express est configure comme suit :
1. Validation des variables critiques au boot (`JWT_SECRET`, `JWT_EXPIRES_IN`)
2. Middleware CORS pour les requetes cross-origin
3. Parsing JSON pour les requetes entrantes
4. Routes API sous le prefixe `/api`
5. Sert le frontend via `express.static` (fichiers du parent)
6. SPA Fallback : toute route non trouvee retourne `index.html`
7. Gestion globale des erreurs

### 5.2 Routes API

#### Auth (`/api/auth`)

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/register` | POST | Creation de compte — hash du mot de passe avec bcrypt |
| `/login` | POST | Authentification — verification bcrypt, generation JWT |
| `/me` | GET | Utilisateur connecte (JWT requis) |
| `/forgot-password` | POST | Genere et envoie un OTP de 6 chiffres par email |
| `/verify-otp` | POST | Valide le code OTP et sa date d'expiration |
| `/reset-password` | POST | Nouveau mot de passe (OTP verifie prealablement) |
| `/update-profile` | PUT | MAJ du nom, email ou mot de passe |
| `/delete-account` | DELETE | Supprime compte et toutes les transactions associees |

#### Trades (`/api/trades`)

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/` | GET | Retourne toutes les transactions de l'utilisateur connecte |
| `/` | PUT | Sauvegarde complete des trades (supprime l'existant, recree tout) |

#### Settings (`/api/settings`)

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/` | GET | Retourne `initialCapital` et `currency` |
| `/` | PUT | Met a jour les parametres |

### 5.3 Middleware Auth
Le middleware `auth.js` :
1. Extrait le token du header `Authorization: Bearer <token>`
2. Verifie la validite du JWT avec `JWT_SECRET`
3. Recupere l'utilisateur dans SQLite via le decode ID
4. Attache l'utilisateur a `req.user`
5. Rejette la requete avec 401 si le token est invalide ou absent

---

## 6. Base de donnees — SQLite

### 6.1 Choix technique
SQLite a ete choisi comme replacement de MongoDB pour la simplification du deploiement (base fichier, aucun service externe) et la reduction de la complexite d'orchestration. Le driver `better-sqlite3` permet une manipulation synchron de la base, ce qui adapte la logique du backend sans promesses.

### 6.2 Schema des tables

#### Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | Identifiant unique |
| `name` | TEXT NOT NULL | Nom de l'utilisateur |
| `email` | TEXT NOT NULL UNIQUE | Email unique |
| `password` | TEXT NOT NULL | Mot de passe hashe (bcrypt) |
| `initialCapital` | REAL (def: 10000) | Capital initial de trading |
| `currency` | TEXT (def: 'USD') | Devise |
| `resetOTP` | TEXT | Code OTP temporaire |
| `resetOTPExpires` | REAL | Timestamp d'expiration de l'OTP |
| `createdAt` | DATETIME | Date de creation |

#### Table `trades`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | Identifiant enregistrement |
| `userId` | INTEGER NOT NULL | Reference vers l'utilisateur (FK) |
| `tradeId` | TEXT NOT NULL | UUID du trade |
| `pair` | TEXT | Paire de trading (ex: EUR/USD) |
| `direction` | TEXT | long ou short |
| `entryPrice` | REAL | Prix d'entree |
| `exitPrice` | REAL | Prix de sortie |
| `positionSize` | REAL | Taille de la position |
| `positionUnit` | TEXT | Unite (units, lots, usd) |
| `pnl` | REAL | Profit ou perte en chiffre absolu |
| `pnlPercent` | REAL | Profit ou perte en pourcentage |
| `entryDate` | TEXT | Date d'entree |
| `exitDate` | TEXT | Date de sortie |
| `strategy` | TEXT | Nom de la strategie |
| `timeframe` | TEXT | Timeframe (M1, H1, D1,...) |
| `notes` | TEXT | Notes personnelles |
| `createdAt` | TEXT | Date de creation |

### 6.3 Modele de donnees des trades
Les trades ne sont pas stocke's comme un objet JSON unique par utilisateur, mais comme une ligne par trade dans la table `trades`, liee via `userId`. La synchronisation est "destructive" :
- **PUT /api/trades** : supprime tous les trades existants de l'utilisateur, puis recree toutes les lignes
- Cela simplifie la logique client (pas de gestion de deltas ou de synchronisation partielle)

---

## 7. Securite

### 7.1 Authentification
- **JWT** : token signe avec un secret partage (HS256), expire apres la duree definie
- **bcrypt** : hash des mots de passe avec un cout en temps de 12 rounds
- **Token** : stocke dans `localStorage` cote client et transmis dans le header `Authorization: Bearer` pour chaque requete protegee
- **Correction anti-cors** : le backend autorise les domaines via le middleware `cors()`

### 7.2 OTP (One-Time Password)
- Code aleatoire de 6 chiffres genere via `crypto.randomInt`
- Validite de **10 minutes**
- Envoye par email SMTP (Gmail App Password)
- Verification cote serveur de l'expiration avant validation

### 7.3 Validation des entrees
- Verification de la presence des champs obligatoires
- Verification du format de l'email via expression reguliere (coté backend)
- Verification de l'unicite de l'email avant insertion

---

## 8. Deploiement

### 8.1 Via Docker
- Image basee sur `node:20-alpine`
- Installation de Python3, make, g++ necessaires pour la compilation native de `better-sqlite3`
- Le frontend est serve au meme endpoint que l'API (port 3000)
- Health check disponible sur `/health`

### 8.2 Sur Render
- Configuration via `render.yaml`
- Variables d'environnement obligatoires : `JWT_SECRET`, `JWT_EXPIRES_IN`
- HealthCheck : `/health`

### 8.3 Sur VPS (Votre propre serveur)
- Le script `deploy.sh` automatise l'installation
- Stack : Nginx (reverse proxy), PM2 (gestion Node.js), UFW (firewall)
- Le port 3000 du backend est expose en interne, Nginx redirige les requetes exterieures

---

## 9. PWA (Progressive Web App)

### 9.1 Installation
- Le fichier `manifest.json` definit l'application : nom, description, URL de demarrage, icône, orientation
- Le service worker `sw.js` permet l'installation de l'app sur l'ecran d'accueil sur mobiles
- `display: standalone` permet une experience app-like (sans barre d'adresse du navigateur)

### 9.2 Strategie de cache
Le Service Worker utilise une strategie **Cache-First** sur les fichiers statiques :
- Cached : `index.html`, `css/style.css`, `js/app.js`, `manifest.json`, icônes
- Non-cachees : les requetes API (`/api/`)
- Quand la version met à jour, le cache est nettoye et recree
- L'utilisateur peut consulter l'app hors connexion (lecture des donnees locales), mais pas sync avec le serveur

---

## 10. Fonctionnalites detaillees

### 10.1 Gestion des trades
- Ajout individuel avec formulaire modal (tous les champs d'un trade)
- Edition d'un trade existante
- Suppression d'un trade
- Vue detaillee (clic sur un trade en liste)
- Calcul automatique du P&L lorsque entryPrice, exitPrice, direction et positionSize sont fournis

### 10.2 Export de donnees
- **Export CSV** : Genere un fichier CSV cote client avec les colonnes de tous les trades, telecharge via `Blob`
- **Export PDF** : Genere un document PDF stylise de l'analyse en cours via `html2pdf.js`

### 10.3 Calculs automatiques
- **P&L en chiffre** = `exitPrice - entryPrice` (multiplie par direction et taille de position)
- **P&L en pourcentage** = `(exitPrice - entryPrice) / entryPrice` * 100 (multiplie par direction)
- **Capital courant** = `initialCapital + somme(P&L)`
- **Winrate** = `trades gagnants / total trades * 100`
- **Serie gagnante** : plus long enchainement de trades gagnants consecutifs

### 10.4 Ecoutes et signalisation en bourses
Le frontend utilise des event listeners natifs pour gerer les interactions utilisateur (formulaires, modales, navigation). L’application ne gere pas de signalisation boursiere en temps reel.
---

## 11. Conventions et contraintes

### 11.1 Originalite et simplicite
Le projet est deliberement une application **vanilla JavaScript**, notamment pour eviter toute surcharge liee a un framework. Ce choix simplifie a la fois le developpement client et la maintenance du code.

### 11.2 Synchrone vs asynchrone
Dans la construction actuelle :
- **Frontend** : mode asynchrone complet via `fetch()` et `await`
- **Backend** : le driver `better-sqlite3` permet une manipulation synchrone de l'API (le middleware Express enveloppe les appels)
- **Modele des trades** : operations DELETE + INSERT synchrones (le endpoint PUT supprime toutes les lignes avant de recreer)

---

## 12. Flux utilisateur typique

1. L'utilisateur arrive sur `index.html` → visualise la vue Login ou Register
2. Apres inscription, il se connecte → reception d'un JWT stocke dans `localStorage`
3. Il est redirige vers l'Vue Principale
4. Il ajoute un premier trade dans l'onglet "Trades" via le bouton flottant
5. Les trades sont sauvegardes dans SQLite a chaque ajout/recuperation via l'envoi au backend
6. Il consulte l'onglet "Analyse" pour voir ses performances (winrate, meilleur trade, etc.)
7. Dans l'onglet "Stats", il visualise le capital et la distribution des P&L sur graphiques interactifs
8. Il peut exporter ses donnees en CSV ou PDF
9. Il peut modifier son profil, ses parametres, ou telecharger l'application comme PWA

---

## 13. Gestion des erreurs

| Erreur | Traitement |
|--------|------------|
| 503 (Service Unavailable) | Le frontend active le mode hors-ligne et travaille avec `localStorage` |
| 401 (Unauthorized) | Le frontend redirige vers la page Login et vide le token |
| 400 (Bad Request) | Affiche un toast d'erreur avec le message du serveur |
| 500 (Internal Server Error) | Toast "Erreur serveur" generique |

---

## 14. Fichiers de configuration

### Variables d'environnement obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PORT` | Port du serveur | `3000` |
| `SQLITE_PATH` | Chemin du fichier SQLite | `./data/app.db` |
| `JWT_SECRET` | Secret pour signer les tokens | `(64 bytes base64)` |
| `JWT_EXPIRES_IN` | Duree de validite des tokens | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_SECURE` | TLS/SSL | `false` |
| `EMAIL_USER` | Email de l'expédeur | `you@gmail.com` |
| `EMAIL_PASSWORD` | Mot de passe du compte email | `16-char-app-pw` |
| `EMAIL_FROM` | Nom + Email display | `"App <a@b.com>"` |

---

## 15. Limites et considerations connues

1. **Inefficacite des mises a jour des trades** : Le endpoint PUT supprime et recree toute la collection de trades de l'utilisateur a chaque mise a jour. C'est efficace en volume faible mais pourrait devenir un bottleneck pour un grand nombre de transactions
2. **Absence de pagination** : Les trades sont retourne's en entier sans pagination sur la route GET
3. **Pas de WebSocket** : Pas de synchronisation en temps reel. Les donnees sont synchronisees uniquement sur requete explicite
4. **SQLite et Docker volumes** : Le fichier SQLite par defaut est dans le conteneur. Si le conteneur est detruit, les donnees sont perdues (sauf si un volume externe est monte sur le dossier `data/`)
5. **OTP par email seulement** : Pas d'autre canal (SMS, TOTP) pour l'authentification forte
6. **Rate limiting absent** : No protection (via `express-rate-limit` ou similaire) contre les attaques de force brute sur login/OTP
7. **Frontend monolithique** : Toute la logique client et le HTML vivent dans deux fichiers. Pour un projet s'ecriant, considerer un bundler (Vite, Webpack) et une separation plus modulaire serait une natural evolution
8. **Migrations** : Aucun systeme de migration. Les modifications du schema necessitent des ALTER TABLE manuels

---

## 16. Conclusion

Trading Journal Pro est une application de journal de trading fonctionnelle, robuste et complete pour un usage personnel ou de petite equipe. Son architecture simplifiee (SQLite, vanilla JS, Node/Express) facilite le depannage, l'extension et de la maintenance. La migration de MongoDB vers SQLite via `better-sqlite3` a reduit la complexite operationnelle tout en preservant le fonctionnement complet de l'application. La conception modulaire des routes, des modeles et des composants permet une maintenance evolutive et un deploiement rapide sur Docker, Render ou VPS.
