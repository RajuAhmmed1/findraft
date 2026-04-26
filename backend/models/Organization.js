const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: [true, 'Organization name is required'], trim: true, maxlength: 100 },
  location: { type: String, trim: true, maxlength: 200 },
  hourlyRate: { type: Number, required: [true, 'Hourly rate is required'], min: [0, 'Must be positive'] },
  currency: { type: String, default: 'USD', uppercase: true },
  taxPercent: { type: Number, default: 0, min: 0, max: 100 },
  color: { type: String, default: '#3b5bdb' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

organizationSchema.index({ user: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
