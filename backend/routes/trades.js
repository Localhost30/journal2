const express = require('express');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/trades
router.get('/', auth, async (req, res) => {
  try {
    let tradeDoc = await Trade.findOne({ userId: req.user._id });
    if (!tradeDoc) {
      tradeDoc = await Trade.create({ userId: req.user._id, trades: [] });
    }
    res.json({ trades: tradeDoc.trades });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/trades
router.put('/', auth, async (req, res) => {
  try {
    const { trades } = req.body;
    const tradeDoc = await Trade.findOneAndUpdate(
      { userId: req.user._id },
      { trades },
      { upsert: true, new: true }
    );
    res.json({ trades: tradeDoc.trades });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
