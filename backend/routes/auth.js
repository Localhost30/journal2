const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendOTP } = require('../config/email');

const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    const existing = User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email }
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = User.findOne({ email });
    if (!user) {
      return res.json({ message: 'Si cet email existe, un code vous sera envoyé' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      console.error('Erreur envoi email:', emailErr);
      return res.status(500).json({ message: "Erreur lors de l'envoi de l'email. Vérifiez la configuration email." });
    }

    res.json({ message: 'Code OTP envoyé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Utilisateur introuvable' });
    }

    if (!user.resetOTP || !user.resetOTPExpires) {
      return res.status(400).json({ message: 'Aucun code OTP en attente' });
    }

    if (user.resetOTPExpires < Date.now()) {
      return res.status(400).json({ message: 'Code OTP expiré. Demandez un nouveau code.' });
    }

    if (user.resetOTP !== code) {
      return res.status(400).json({ message: 'Code OTP incorrect' });
    }

    res.json({ message: 'Code vérifié' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Utilisateur introuvable' });
    }

    if (!user.resetOTP || !user.resetOTPExpires || user.resetOTPExpires < Date.now()) {
      return res.status(400).json({ message: 'Veuillez vérifier votre code OTP primero' });
    }

    user.password = password;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/update-profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (email && email !== req.user.email) {
      const existing = User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    const user = User.findById(req.user.id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;

    await user.save();

    res.json({
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/delete-account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const Trade = require('../models/Trade');
    Trade.deleteOne({ userId: req.user.id });
    const stmt = require('../config/db').db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(req.user.id);
    res.json({ message: 'Compte supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
