/**
 * Customer.js — Mongoose model for bank customers
 *
 * Security:
 *  - Password is hashed with bcrypt (salt rounds = 12) before saving
 *  - Plain password is NEVER stored
 *  - idNumber and accountNumber are stored as-is (in a real system, encrypt with AES)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // Higher = slower hash = harder to brute-force

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100,
    },
    idNumber: {
      type: String,
      required: [true, 'ID number is required'],
      unique: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // Never include password in query results by default
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save hook: hash password before storing ──────────────────────────────
customerSchema.pre('save', async function (next) {
  // Only hash if the password field was modified (e.g., on registration or password change)
  if (!this.isModified('password')) return next();

  // bcrypt.hash automatically generates and embeds a random salt
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// ─── Instance method: compare candidate password ──────────────────────────────
customerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);