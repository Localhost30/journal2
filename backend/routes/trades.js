const express = require('express');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/trades
router.get('/', auth, async (req, res) => {
  try {
    let tradeDoc = Trade.findOne({ userId: req.user.id });
    if (!tradeDoc) {
      tradeDoc = { userId: req.user.id, trades: [] };
    }
    res.json({ trades: tradeDoc.trades || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/trades
router.put('/', auth, async (req, res) => {
  try {
    const { trades } = req.body;
    const tradeDoc = Trade.findOneAndUpdate(
      { userId: req.user.id },
      { trades: trades || [] }
    );
    res.json({ trades: tradeDoc ? tradeDoc.trades : [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
