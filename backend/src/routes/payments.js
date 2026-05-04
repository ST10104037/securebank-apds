/**
 * payments.routes.js — Customer payment submission
 *
 * POST /api/payments        — create a new international payment (customer only)
 * GET  /api/payments/my     — list current customer's own payments
 */

const express = require('express');
const Payment = require('../models/Payment');
const { requireCustomerAuth } = require('../middleware/auth.middleware');
const { validateBody, validate } = require('../utils/validators');

const router = express.Router();

// All payment routes require customer authentication
router.use(requireCustomerAuth);

// ─── Create Payment ───────────────────────────────────────────────────────────
router.post(
  '/',
  validateBody(['amount', 'currency', 'provider', 'payeeAccountNumber', 'payeeName', 'swiftCode']),
  async (req, res) => {
    try {
      const {
        amount,
        currency,
        provider,
        payeeAccountNumber,
        payeeName,
        swiftCode,
      } = req.body;

      // Additional amount validation (must be positive number)
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }

      // Validate payeeAccountNumber separately (same pattern as account number)
      if (!validate('accountNumber', payeeAccountNumber)) {
        return res.status(400).json({ error: 'Payee account number format is invalid' });
      }

      const payment = await Payment.create({
        customerId: req.user.id,
        customerName: req.user.fullName,
        customerAccount: req.user.accountNumber,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        provider: provider.toUpperCase(),
        payeeAccountNumber,
        payeeName,
        swiftCode: swiftCode.toUpperCase(),
        status: 'pending',
      });

      res.status(201).json({
        message: 'Payment submitted successfully',
        paymentId: payment._id,
        status: payment.status,
      });
    } catch (err) {
      console.error('Payment create error:', err);
      res.status(500).json({ error: 'Payment submission failed' });
    }
  }
);

// ─── List Customer's Own Payments ─────────────────────────────────────────────
router.get('/my', async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-customerId'); // don't expose internal Mongo ID to front end

    res.json({ payments });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to retrieve payments' });
  }
});

module.exports = router;