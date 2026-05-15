const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chemin absolu de la base de données
const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : path.join(dataDir, 'app.db');

// Creer le dossier data si inexistant
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Activer les contraintes de clees etrangères
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Creer les tables si elles n'existent pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    initialCapital REAL DEFAULT 10000,
    currency TEXT DEFAULT 'USD',
    resetOTP TEXT,
    resetOTPExpires REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    tradeId TEXT NOT NULL,
    pair TEXT,
    direction TEXT,
    entryPrice REAL,
    exitPrice REAL,
    positionSize REAL,
    positionUnit TEXT,
    pnl REAL,
    pnlPercent REAL,
    entryDate TEXT,
    exitDate TEXT,
    strategy TEXT,
    timeframe TEXT,
    notes TEXT,
    createdAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(userId);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

console.log('SQLite connecte :', dbPath);

const getDBStatus = () => true;
const connectDB = async () => true;

module.exports = { db, connectDB, getDBStatus };
