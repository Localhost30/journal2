const { db } = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  constructor(data, { isNew = false } = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.initialCapital = data.initialCapital;
    this.currency = data.currency;
    this.resetOTP = data.resetOTP;
    this.resetOTPExpires = data.resetOTPExpires;
    this.createdAt = data.createdAt;
    this._isNew = isNew;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return row ? new User(row) : null;
  }

  static findOne({ email, _id } = {}) {
    let row;
    if (_id) {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      row = stmt.get(_id);
    } else if (email) {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      row = stmt.get(email);
    }
    return row ? new User(row) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, initialCapital, currency, resetOTP, resetOTPExpires)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.name,
      data.email,
      hashedPassword,
      data.initialCapital || 10000,
      data.currency || 'USD',
      data.resetOTP || null,
      data.resetOTPExpires || null
    );
    const user = User.findById(info.lastInsertRowid);
    return user;
  }

  static findByIdAndUpdate(id, updates) {
    const allowed = ['name', 'email', 'password', 'initialCapital', 'currency', 'resetOTP', 'resetOTPExpires'];
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  async save() {
    if (this._isNew) {
      const user = await User.create(this);
      this.id = user.id;
      this._isNew = false;
      return this;
    }
    const fields = ['name', 'email', 'password', 'initialCapital', 'currency', 'resetOTP', 'resetOTPExpires'];
    const values = [this.name, this.email, this.password, this.initialCapital, this.currency, this.resetOTP, this.resetOTPExpires];
    const stmt = db.prepare(`UPDATE users SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`);
    values.push(this.id);
    stmt.run(...values);
    return this;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

module.exports = User;
