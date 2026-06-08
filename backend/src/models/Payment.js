/**
 * Payment.js — Mongoose model for international payments
 *
 * Status lifecycle: pending → verified → submitted
 * Employees verify payments; verified payments are submitted to SWIFT in bulk.
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerAccount: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be positive'],
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 3,
    },
    provider: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    payeeAccountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    payeeName: {
      type: String,
      required: true,
      trim: true,
    },
    swiftCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'submitted'],
      default: 'pending',
    },
    verifiedBy: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    submittedBy: {
      type: String,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);