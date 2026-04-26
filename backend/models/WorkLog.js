const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  date: { type: Date, required: [true, 'Date is required'] },
  hours: { type: Number, required: [true, 'Hours are required'], min: [0.25, 'Minimum 0.25 hours'], max: [24, 'Cannot exceed 24 hours'] },
  notes: { type: String, trim: true, maxlength: 500 },
  // Snapshot at time of logging (in case hourly rate changes later)
  hourlyRateSnapshot: { type: Number },
  taxPercentSnapshot: { type: Number }
}, { timestamps: true });

workLogSchema.index({ user: 1, date: -1 });
workLogSchema.index({ user: 1, organization: 1 });

// Virtual: gross earnings
workLogSchema.virtual('grossEarnings').get(function () {
  return this.hours * (this.hourlyRateSnapshot || 0);
});

// Virtual: net earnings
workLogSchema.virtual('netEarnings').get(function () {
  const gross = this.grossEarnings;
  return gross * (1 - (this.taxPercentSnapshot || 0) / 100);
});

workLogSchema.set('toObject', { virtuals: true });
workLogSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('WorkLog', workLogSchema);
