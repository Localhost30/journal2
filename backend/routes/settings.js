const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', auth, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    res.json({
      settings: {
        initialCapital: user.initialCapital,
        currency: user.currency
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/settings
router.put('/', auth, async (req, res) => {
  try {
    const { initialCapital, currency } = req.body;
    const user = User.findByIdAndUpdate(
      req.user.id,
      { initialCapital, currency }
    );
    res.json({
      settings: {
        initialCapital: user.initialCapital,
        currency: user.currency
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
