/**
 * auth.routes.js — Customer & Employee authentication
 *
 * POST /api/auth/register          — customer self-registration
 * POST /api/auth/login             — customer login
 * POST /api/auth/employee/login    — employee login
 *
 * Note: Employee registration is intentionally NOT exposed as a public API.
 * Employees are seeded by an admin script only.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const { validateBody } = require('../utils/validators');

const router = express.Router();

const JWT_EXPIRES_IN = '2h';

// ─── Helper: sanitize a string for safe DB query use ─────────────────────────
// Strips any characters that are not alphanumeric, underscore, hyphen, or dot.
// Prevents NoSQL injection even after mongoSanitize middleware.
function sanitizeString(value) {
  return String(value).replace(/[^\w.\-@]/g, '').trim();
}

// ─── Customer Registration ────────────────────────────────────────────────────
router.post(
  '/register',
  validateBody(['fullName', 'idNumber', 'accountNumber', 'username', 'password']),
  async (req, res) => {
    try {
      const { fullName, idNumber, accountNumber, username, password } = req.body;

      const safeUsername = sanitizeString(username).toLowerCase();
      const safeIdNumber = sanitizeString(idNumber);
      const safeAccountNumber = sanitizeString(accountNumber);

      const existing = await Customer.findOne({
        $or: [
          { username: safeUsername },
          { idNumber: safeIdNumber },
          { accountNumber: safeAccountNumber },
        ],
      });

      if (existing) {
        return res
          .status(409)
          .json({ error: 'An account with those details already exists.' });
      }

      const customer = await Customer.create({
        fullName: fullName.trim(),
        idNumber: safeIdNumber,
        accountNumber: safeAccountNumber,
        username: safeUsername,
        password,
      });

      return res.status(201).json({
        message: 'Registration successful. Please log in.',
        customerId: customer._id,
      });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ─── Customer Login ───────────────────────────────────────────────────────────
router.post(
  '/login',
  validateBody(['username', 'accountNumber', 'password']),
  async (req, res) => {
    try {
      const { username, accountNumber, password } = req.body;

      // Sanitize before using in DB query — prevents NoSQL injection
      const safeUsername = sanitizeString(username).toLowerCase();
      const safeAccountNumber = sanitizeString(accountNumber);

      const customer = await Customer.findOne({
        username: safeUsername,
        accountNumber: safeAccountNumber,
      }).select('+password');

      if (!customer) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordMatch = await customer.comparePassword(password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        {
          id: customer._id,
          username: customer.username,
          accountNumber: customer.accountNumber,
          fullName: customer.fullName,
          role: 'customer',
        },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          fullName: customer.fullName,
          username: customer.username,
          accountNumber: customer.accountNumber,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ─── Employee Login ───────────────────────────────────────────────────────────
router.post(
  '/employee/login',
  validateBody(['username', 'password']),
  async (req, res) => {
    try {
      const { username, password } = req.body;

      // Sanitize before using in DB query
      const safeUsername = sanitizeString(username).toLowerCase();

      const employee = await Employee.findOne({
        username: safeUsername,
      }).select('+password');

      if (!employee) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordMatch = await employee.comparePassword(password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        {
          id: employee._id,
          username: employee.username,
          fullName: employee.fullName,
          role: employee.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          fullName: employee.fullName,
          username: employee.username,
          role: employee.role,
        },
      });
    } catch (err) {
      console.error('Employee login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;