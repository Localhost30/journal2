const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
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
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { initialCapital, currency },
      { new: true }
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
