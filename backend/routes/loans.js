const router = require('express').Router();
const auth = require('../middleware/auth');
const Loan = require('../models/Loan');
const Organization = require('../models/Organization');

router.use(auth);

function monthDiff(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

function computeLoanStats(loan) {
  const principal = Number(loan.principal || 0);
  const paidAmount = (loan.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const monthlyRate = loan.interestPeriod === 'monthly'
    ? Number(loan.interestRate || 0) / 100
    : Number(loan.interestRate || 0) / 1200;

  const now = new Date();
  const endForInterest = loan.dueDate ? new Date(loan.dueDate) : now;
  const elapsedMonths = Math.max(1, monthDiff(loan.startDate, endForInterest));

  const flatInterest = principal * monthlyRate * elapsedMonths;
  const reducingBase = principal * monthlyRate * elapsedMonths;
  const paidRatio = principal > 0 ? Math.min(1, paidAmount / principal) : 0;
  const reducingInterest = reducingBase * (1 - Math.min(0.9, paidRatio));
  const interestAccrued = loan.interestMethod === 'flat' ? flatInterest : reducingInterest;

  const totalPayable = principal + Math.max(0, interestAccrued);
  const remainingAmount = Math.max(0, totalPayable - paidAmount);

  const installmentAmount = Number(loan.installmentAmount || 0);
  const installmentsRemaining = installmentAmount > 0
    ? Math.ceil(remainingAmount / installmentAmount)
    : null;

  const progressPercent = totalPayable > 0
    ? Math.min(100, Math.round((paidAmount / totalPayable) * 100))
    : 0;

  return {
    paidAmount: Math.round(paidAmount * 100) / 100,
    interestAccrued: Math.round(interestAccrued * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    remainingAmount: Math.round(remainingAmount * 100) / 100,
    installmentsRemaining,
    progressPercent,
    elapsedMonths
  };
}

async function normalizeCounterparty(req, body) {
  const data = { ...body };
  if (data.counterpartyType === 'organization' && data.organization) {
    const org = await Organization.findOne({ _id: data.organization, user: req.user._id });
    if (!org) throw new Error('Selected organization not found');
    data.counterpartyName = data.counterpartyName || org.name;
  } else {
    data.organization = null;
  }

  if (!data.counterpartyName || !String(data.counterpartyName).trim()) {
    throw new Error('Counterparty name is required');
  }

  return data;
}

// GET /api/loans
router.get('/', async (req, res) => {
  try {
    const { month, year, status, direction, search, page = 1, limit = 200 } = req.query;
    const filter = { user: req.user._id };

    if (month && year) {
      filter.startDate = {
        $gte: new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1),
        $lte: new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59)
      };
    } else if (year) {
      filter.startDate = {
        $gte: new Date(parseInt(year, 10), 0, 1),
        $lte: new Date(parseInt(year, 10), 11, 31, 23, 59, 59)
      };
    }

    if (status) filter.status = status;
    if (direction) filter.direction = direction;
    if (search) filter.counterpartyName = { $regex: search, $options: 'i' };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [items, total] = await Promise.all([
      Loan.find(filter)
        .sort({ startDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('organization', 'name color currency'),
      Loan.countDocuments(filter)
    ]);

    const mapped = items.map(item => {
      const loan = item.toObject();
      return { ...loan, stats: computeLoanStats(loan) };
    });

    res.json({ items: mapped, total, page: parseInt(page, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Loan.findOne({ _id: req.params.id, user: req.user._id }).populate('organization', 'name color currency');
    if (!item) return res.status(404).json({ error: 'Loan not found' });
    const loan = item.toObject();
    res.json({ item: { ...loan, stats: computeLoanStats(loan) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = await normalizeCounterparty(req, req.body);
    const data = { ...body, user: req.user._id };
    const item = await Loan.create(data);
    const out = await Loan.findById(item._id).populate('organization', 'name color currency');
    const loan = out.toObject();
    res.status(201).json({ item: { ...loan, stats: computeLoanStats(loan) } });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Loan not found' });

    const normalized = await normalizeCounterparty(req, req.body);
    const allowed = [
      'direction', 'counterpartyType', 'counterpartyName', 'organization',
      'principal', 'interestRate', 'interestPeriod', 'interestMethod',
      'installmentFrequency', 'installmentAmount', 'startDate', 'dueDate',
      'status', 'currency', 'notes'
    ];

    allowed.forEach(key => {
      if (normalized[key] !== undefined) item[key] = normalized[key];
    });

    await item.save();
    const out = await Loan.findById(item._id).populate('organization', 'name color currency');
    const loan = out.toObject();
    res.json({ item: { ...loan, stats: computeLoanStats(loan) } });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, date, method, note } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }
    if (!date) return res.status(400).json({ error: 'Payment date is required' });

    const item = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Loan not found' });

    item.payments.push({ amount: Number(amount), date, method, note });

    const estimated = computeLoanStats(item.toObject());
    if (estimated.remainingAmount <= 0) item.status = 'closed';

    await item.save();
    const out = await Loan.findById(item._id).populate('organization', 'name color currency');
    const loan = out.toObject();
    res.json({ item: { ...loan, stats: computeLoanStats(loan) } });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/payments/:paymentId', async (req, res) => {
  try {
    const item = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Loan not found' });

    const payment = item.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.deleteOne();
    if (item.status === 'closed') item.status = 'active';
    await item.save();

    const out = await Loan.findById(item._id).populate('organization', 'name color currency');
    const loan = out.toObject();
    res.json({ item: { ...loan, stats: computeLoanStats(loan) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ error: 'Loan not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
