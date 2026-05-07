/**
 * auth.routes.js — Customer & Employee authentication
 *
 * POST /api/auth/register   — customer self-registration
 * POST /api/auth/login      — customer login
 * POST /api/auth/employee/login — employee login
 * hhh
 * Note: Employee registration is intentionally NOT exposed as a public API.
 * Employees are seeded / created by an admin script.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const { validateBody } = require('../utils/validators');

const router = express.Router();

const JWT_EXPIRES_IN = '2h'; // Short-lived tokens

// ─── Customer Registration ────────────────────────────────────────────────────
router.post(
  '/register',
  validateBody(['fullName', 'idNumber', 'accountNumber', 'username', 'password']),
  async (req, res) => {
    try {
      const { fullName, idNumber, accountNumber, username, password } = req.body;

      // Check for duplicate username / ID / account
      const existing = await Customer.findOne({
        $or: [{ username }, { idNumber }, { accountNumber }],
      });
      if (existing) {
        // Generic message — don't reveal which field matched (enumeration attack)
        return res
          .status(409)
          .json({ error: 'An account with those details already exists.' });
      }

      const customer = await Customer.create({
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        accountNumber: accountNumber.trim(),
        username: username.trim().toLowerCase(),
        password, // hashed by pre-save hook in model
      });

      res.status(201).json({
        message: 'Registration successful. Please log in.',
        customerId: customer._id,
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
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

      // select: false on password — must explicitly include it
      const customer = await Customer.findOne({
        username: username.toLowerCase(),
        accountNumber,
      }).select('+password');

      if (!customer) {
        // Consistent message — don't reveal whether username or account was wrong
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

      res.json({
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
      res.status(500).json({ error: 'Login failed' });
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

      const employee = await Employee.findOne({
        username: username.toLowerCase(),
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

      res.json({
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
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router; 