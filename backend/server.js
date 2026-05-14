require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trades');
const settingsRoutes = require('./routes/settings');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (pour Render et monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API Routes (avant le static pour priorité)
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/settings', settingsRoutes);

// Fichiers statiques du frontend
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// SPA Fallback - renvoie toujours index.html pour les routes frontend
// Important pour la navigation dans une SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.message);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

// Connexion BD et demarrage
const PORT = process.env.PORT || 3000;

connectDB().then((connected) => {
  if (!connected) {
    console.warn('|u00A0|u00A0|u00A0|u00A0Base de donnees non disponible - mode lecture seule (donnees locales)');
  }
  app.listen(PORT, () => {
    console.log(`Serveur Trading Journal Pro sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((err) => {
  console.error('Erreur demarrage serveur:', err.message);
  // Demarrer quand meme meme si la BD est indisponible
  app.listen(PORT, () => {
    console.log(`Serveur Trading Journal Pro sur le port ${PORT} (sans BDD)`);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Exception non capturee:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Rejet non capture:', reason);
});
