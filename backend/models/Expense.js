const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be positive'] },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Rent', 'Groceries', 'Utilities', 'Transport', 'Subscriptions', 'Healthcare', 'Entertainment', 'Clothing', 'Education', 'Dining', 'Other']
  },
  date: { type: Date, required: [true, 'Date is required'] },
  notes: { type: String, trim: true, maxlength: 500 },
  currency: { type: String, default: 'USD', uppercase: true }
}, { timestamps: true });

expenseSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
