const { db } = require('../config/db');
const crypto = require('crypto');

class Trade {
  static findOne({ userId } = {}) {
    const userStmt = db.prepare('SELECT id, userId FROM trades WHERE userId = ? LIMIT 1');
    const tradeDoc = userStmt.get(userId);

    if (!tradeDoc) return null;

    const tradeItemsStmt = db.prepare('SELECT * FROM trades WHERE userId = ?');
    const rows = tradeItemsStmt.all(userId);

    return {
      id: tradeDoc.id,
      userId: tradeDoc.userId,
      trades: rows.map(row => ({
        id: row.tradeId,
        pair: row.pair,
        direction: row.direction,
        entryPrice: row.entryPrice,
        exitPrice: row.exitPrice,
        positionSize: row.positionSize,
        positionUnit: row.positionUnit,
        pnl: row.pnl,
        pnlPercent: row.pnlPercent,
        entryDate: row.entryDate,
        exitDate: row.exitDate,
        strategy: row.strategy,
        timeframe: row.timeframe,
        notes: row.notes,
        createdAt: row.createdAt
      }))
    };
  }

  static deleteOne({ userId } = {}) {
    const stmt = db.prepare('DELETE FROM trades WHERE userId = ?');
    stmt.run(userId);
    return { deletedCount: 1 };
  }

  static create({ userId, trades = [] }) {
    const insertStmt = db.prepare(`
      INSERT INTO trades (userId, tradeId, pair, direction, entryPrice, exitPrice, positionSize, positionUnit, pnl, pnlPercent, entryDate, exitDate, strategy, timeframe, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const trade of trades) {
      insertStmt.run(
        userId,
        trade.id || crypto.randomUUID(),
        trade.pair || null,
        trade.direction || null,
        trade.entryPrice || null,
        trade.exitPrice || null,
        trade.positionSize || null,
        trade.positionUnit || null,
        trade.pnl || null,
        trade.pnlPercent || null,
        trade.entryDate || null,
        trade.exitDate || null,
        trade.strategy || null,
        trade.timeframe || null,
        trade.notes || null,
        trade.createdAt || new Date().toISOString()
      );
    }

    return { userId, trades };
  }

  static findOneAndUpdate({ userId } = {}, { trades }) {
    const deleteStmt = db.prepare('DELETE FROM trades WHERE userId = ?');
    deleteStmt.run(userId);

    const insertStmt = db.prepare(`
      INSERT INTO trades (userId, tradeId, pair, direction, entryPrice, exitPrice, positionSize, positionUnit, pnl, pnlPercent, entryDate, exitDate, strategy, timeframe, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const trade of trades || []) {
      insertStmt.run(
        userId,
        trade.id || crypto.randomUUID(),
        trade.pair || null,
        trade.direction || null,
        trade.entryPrice || null,
        trade.exitPrice || null,
        trade.positionSize || null,
        trade.positionUnit || null,
        trade.pnl || null,
        trade.pnlPercent || null,
        trade.entryDate || null,
        trade.exitDate || null,
        trade.strategy || null,
        trade.timeframe || null,
        trade.notes || null,
        trade.createdAt || new Date().toISOString()
      );
    }

    return { userId, trades };
  }
}

module.exports = Trade;
