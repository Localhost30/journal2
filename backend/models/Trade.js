const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trades: [{
    id: String,
    pair: String,
    direction: { type: String, enum: ['long', 'short'] },
    entryPrice: Number,
    exitPrice: Number,
    positionSize: Number,
    positionUnit: { type: String, enum: ['units', 'lots', 'usd'] },
    pnl: Number,
    pnlPercent: Number,
    entryDate: String,
    exitDate: String,
    strategy: String,
    timeframe: String,
    notes: String,
    createdAt: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);
