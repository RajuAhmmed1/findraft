const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Optional: link income to a specific organization (e.g. salary from Acme Corp)
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be positive'] },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Salary', 'Freelance', 'Investment', 'Bonus', 'Rental', 'Gift', 'Other']
  },
  date: { type: Date, required: [true, 'Date is required'] },
  notes: { type: String, trim: true, maxlength: 500 },
  currency: { type: String, default: 'USD', uppercase: true }
}, { timestamps: true });

incomeSchema.index({ user: 1, date: -1 });
incomeSchema.index({ user: 1, organization: 1 });

module.exports = mongoose.model('Income', incomeSchema);
