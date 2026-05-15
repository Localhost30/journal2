const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chemin absolu vers le dossier data du backend
const dataDir = path.resolve(__dirname, '..', 'data');
let dbPath;

if (process.env.SQLITE_PATH) {
  // Si relatif (ex: ./data/app.db), resoudre depuis le backend, non depuis le CWD
  dbPath = path.isAbsolute(process.env.SQLITE_PATH)
    ? process.env.SQLITE_PATH
    : path.resolve(__dirname, '..', process.env.SQLITE_PATH);
} else {
  dbPath = path.join(dataDir, 'app.db');
}

// Creer le dossier data si inexistant
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Activer les contraintes de cle etrangères
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
