const mongoose = require('mongoose');

const familyTransferSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be positive'] },
  date: { type: Date, required: [true, 'Date is required'] },
  recipient: { type: String, trim: true, maxlength: 100 },
  notes: { type: String, trim: true, maxlength: 500 },
  currency: { type: String, default: 'USD', uppercase: true }
}, { timestamps: true });

familyTransferSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('FamilyTransfer', familyTransferSchema);
