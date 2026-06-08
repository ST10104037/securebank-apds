/**
 * Employee.js — Mongoose model for bank employees
 *
 * Security:
 *  - Password is hashed with bcrypt (salt rounds = 12) before saving
 *  - Plain password is NEVER stored
 *  - Employees are seeded by admin script — NO public registration route
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validateBody, validate } = require('../utils/validators');

const SALT_ROUNDS = 12;

const employeeSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100,
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
    role: {
      type: String,
      enum: ['employee', 'admin'],
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save hook: hash password before storing ──────────────────────────────
employeeSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// ─── Instance method: compare candidate password ─────────────────────────────
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);