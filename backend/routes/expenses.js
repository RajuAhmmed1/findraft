const router = require('express').Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const { buildQuery } = require('../utils/crud');
const crud = buildQuery(Expense);

router.use(auth);

// GET /api/expenses — supports ?month=&year=&category=&startDate=&endDate=
router.get('/', async (req, res) => {
  try {
    const { month, year, startDate, endDate, category, page = 1, limit = 100 } = req.query;
    const filter = { user: req.user._id };

    if (month && year) {
      filter.date = {
        $gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        $lte: new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      };
    } else if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (year) {
      filter.date = {
        $gte: new Date(parseInt(year), 0, 1),
        $lte: new Date(parseInt(year), 11, 31, 23, 59, 59)
      };
    }
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      Expense.countDocuments(filter)
    ]);
    res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', crud.getOne);

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, user: req.user._id };
    const item = await Expense.create(data);
    res.status(201).json({ item });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Not found' });
    ['amount', 'category', 'date', 'notes', 'currency'].forEach(k => {
      if (req.body[k] !== undefined) item[k] = req.body[k];
    });
    await item.save();
    res.json({ item });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', crud.remove);

module.exports = router;
