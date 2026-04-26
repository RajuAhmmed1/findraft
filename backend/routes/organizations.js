const router = require('express').Router();
const auth = require('../middleware/auth');
const Organization = require('../models/Organization');
const WorkLog = require('../models/WorkLog');

router.use(auth);

// GET all orgs for user
router.get('/', async (req, res) => {
  try {
    const orgs = await Organization.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ items: orgs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single org
router.get('/:id', async (req, res) => {
  try {
    const org = await Organization.findOne({ _id: req.params.id, user: req.user._id });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ item: org });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create org
router.post('/', async (req, res) => {
  try {
    const org = await Organization.create({ ...req.body, user: req.user._id });
    res.status(201).json({ item: org });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

// PUT update org
router.put('/:id', async (req, res) => {
  try {
    const org = await Organization.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ item: org });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE org
router.delete('/:id', async (req, res) => {
  try {
    const org = await Organization.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    // Also delete associated worklogs
    await WorkLog.deleteMany({ organization: req.params.id, user: req.user._id });
    res.json({ message: 'Organization and associated work logs deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
