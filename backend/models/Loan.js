const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be positive']
  },
  date: { type: Date, required: [true, 'Payment date is required'] },
  method: {
    type: String,
    enum: ['cash', 'bank', 'mobile', 'card', 'other'],
    default: 'bank'
  },
  note: { type: String, trim: true, maxlength: 300 }
}, { _id: true });

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  direction: {
    type: String,
    required: [true, 'Loan direction is required'],
    enum: ['borrowed', 'lent']
  },
  counterpartyType: {
    type: String,
    required: [true, 'Counterparty type is required'],
    enum: ['person', 'organization']
  },
  counterpartyName: { type: String, required: [true, 'Counterparty name is required'], trim: true, maxlength: 120 },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  principal: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: [0.01, 'Principal amount must be positive']
  },
  interestRate: { type: Number, default: 0, min: 0, max: 500 },
  interestPeriod: {
    type: String,
    enum: ['monthly', 'annually'],
    default: 'annually'
  },
  interestMethod: {
    type: String,
    enum: ['flat', 'reducing'],
    default: 'reducing'
  },
  installmentFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually', 'custom'],
    default: 'monthly'
  },
  installmentAmount: { type: Number, default: 0, min: 0 },
  startDate: { type: Date, required: [true, 'Start date is required'] },
  dueDate: { type: Date, default: null },
  status: {
    type: String,
    enum: ['active', 'closed', 'defaulted'],
    default: 'active'
  },
  currency: { type: String, default: 'USD', uppercase: true },
  notes: { type: String, trim: true, maxlength: 800 },
  payments: [paymentSchema]
}, { timestamps: true });

loanSchema.index({ user: 1, status: 1, startDate: -1 });
loanSchema.index({ user: 1, direction: 1, startDate: -1 });

loanSchema.set('toJSON', { virtuals: true });
loanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loan', loanSchema);
