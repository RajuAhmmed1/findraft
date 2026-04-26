const router = require('express').Router();
const auth = require('../middleware/auth');
const Income = require('../models/Income');
const { buildQuery } = require('../utils/crud');
const crud = buildQuery(Income, 'user', true);

router.use(auth);

// GET /api/income — supports ?month=&year=&orgId=&startDate=&endDate=&category=
router.get('/', async (req, res) => {
  try {
    const { month, year, startDate, endDate, orgId, category, page = 1, limit = 100 } = req.query;
    const filter = { user: req.user._id };

    if (month && year) {
      filter.date = { $gte: new Date(parseInt(year), parseInt(month)-1, 1), $lte: new Date(parseInt(year), parseInt(month), 0, 23, 59, 59) };
    } else if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (year) {
      filter.date = { $gte: new Date(parseInt(year), 0, 1), $lte: new Date(parseInt(year), 11, 31, 23, 59, 59) };
    }
    if (orgId)    filter.organization = orgId;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Income.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).populate('organization', 'name color currency'),
      Income.countDocuments(filter)
    ]);
    res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', crud.getOne);

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, user: req.user._id };
    if (!data.organization) delete data.organization;
    const item = await Income.create(data);
    const out  = await Income.findById(item._id).populate('organization', 'name color currency');
    res.status(201).json({ item: out });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Income.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Not found' });
    ['amount','category','date','notes','currency'].forEach(k => { if (req.body[k] !== undefined) item[k] = req.body[k]; });
    item.organization = req.body.organization || null;
    await item.save();
    const out = await Income.findById(item._id).populate('organization', 'name color currency');
    res.json({ item: out });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', crud.remove);

module.exports = router;
