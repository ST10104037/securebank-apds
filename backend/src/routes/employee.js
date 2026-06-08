const express = require('express');
const Payment = require('../models/Payment');
const { requireEmployeeAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireEmployeeAuth);

router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ count: payments.length, payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve payments' });
  }
});

router.get('/payments/all', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ count: payments.length, payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve payments' });
  }
});

router.patch('/payments/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending') {
      return res.status(409).json({ error: `Payment is already ${payment.status}` });
    }
    payment.status = 'verified';
    payment.verifiedBy = req.user.username;
    payment.verifiedAt = new Date();
    await payment.save();
    res.json({ message: 'Payment verified', paymentId: payment._id, status: payment.status });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/payments/submit-swift', async (req, res) => {
  try {
    const verifiedPayments = await Payment.find({ status: 'verified' });
    if (verifiedPayments.length === 0) {
      return res.status(400).json({ error: 'No verified payments to submit' });
    }
    const ids = verifiedPayments.map((p) => p._id);
    await Payment.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'submitted', submittedBy: req.user.username, submittedAt: new Date() } }
    );
    res.json({ message: `${verifiedPayments.length} payment(s) submitted to SWIFT`, submittedCount: verifiedPayments.length });
  } catch (err) {
    res.status(500).json({ error: 'SWIFT submission failed' });
  }
});

module.exports = router;