const router = require('express').Router();
const auth = require('../middleware/auth');
const WorkLog = require('../models/WorkLog');
const Organization = require('../models/Organization');

router.use(auth);

// GET all worklogs
router.get('/', async (req, res) => {
  try {
    const { month, year, orgId, startDate, endDate, page = 1, limit = 100 } = req.query;
    const filter = { user: req.user._id };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    }
    if (orgId) filter.organization = orgId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      WorkLog.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('organization', 'name hourlyRate taxPercent currency color'),
      WorkLog.countDocuments(filter)
    ]);
    res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single worklog
router.get('/:id', async (req, res) => {
  try {
    const item = await WorkLog.findOne({ _id: req.params.id, user: req.user._id })
      .populate('organization', 'name hourlyRate taxPercent currency color');
    if (!item) return res.status(404).json({ error: 'Work log not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create worklog — snapshot rate at time of logging
router.post('/', async (req, res) => {
  try {
    const { organization: orgId, date, hours, notes } = req.body;
    const org = await Organization.findOne({ _id: orgId, user: req.user._id });
    if (!org) return res.status(400).json({ error: 'Organization not found' });

    const log = await WorkLog.create({
      user: req.user._id,
      organization: orgId,
      date,
      hours,
      notes,
      hourlyRateSnapshot: org.hourlyRate,
      taxPercentSnapshot: org.taxPercent
    });
    const populated = await WorkLog.findById(log._id).populate('organization', 'name hourlyRate taxPercent currency color');
    res.status(201).json({ item: populated });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

// PUT update worklog
router.put('/:id', async (req, res) => {
  try {
    const log = await WorkLog.findOne({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ error: 'Work log not found' });

    const { organization: orgId, date, hours, notes } = req.body;

    // Re-snapshot if org changed
    if (orgId && orgId.toString() !== log.organization.toString()) {
      const org = await Organization.findOne({ _id: orgId, user: req.user._id });
      if (!org) return res.status(400).json({ error: 'Organization not found' });
      log.hourlyRateSnapshot = org.hourlyRate;
      log.taxPercentSnapshot = org.taxPercent;
      log.organization = orgId;
    }

    if (date !== undefined) log.date = date;
    if (hours !== undefined) log.hours = hours;
    if (notes !== undefined) log.notes = notes;

    await log.save();
    const populated = await WorkLog.findById(log._id).populate('organization', 'name hourlyRate taxPercent currency color');
    res.json({ item: populated });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE worklog
router.delete('/:id', async (req, res) => {
  try {
    const item = await WorkLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Work log not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
