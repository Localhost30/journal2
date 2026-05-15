require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trades');
const settingsRoutes = require('./routes/settings');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    dbConnected: true,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/settings', settingsRoutes);

// Fichiers statiques du frontend
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({ message: err.message || 'Erreur serveur interne' });
});

// Connexion BD et demarrage
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur sur le port ${PORT}`);
  });
});
