const router = require('express').Router();
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const FamilyTransfer = require('../models/FamilyTransfer');
const Organization = require('../models/Organization');
const WorkLog = require('../models/WorkLog');
const Loan = require('../models/Loan');

const isValidAvatarUrl = (value = '') => {
  if (!value) return true;
  if (value.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

router.use(auth, requireAdmin);

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
};

const loadUserDataBundle = async (userId) => {
  const [income, expenses, familyTransfers, organizations, worklogs, loans] = await Promise.all([
    Income.find({ user: userId }).sort({ date: -1 }).populate('organization', 'name'),
    Expense.find({ user: userId }).sort({ date: -1 }),
    FamilyTransfer.find({ user: userId }).sort({ date: -1 }),
    Organization.find({ user: userId }).sort({ createdAt: -1 }),
    WorkLog.find({ user: userId }).sort({ date: -1 }).populate('organization', 'name color currency'),
    Loan.find({ user: userId }).sort({ startDate: -1 }).populate('organization', 'name')
  ]);

  return {
    income,
    expenses,
    familyTransfers,
    organizations,
    worklogs,
    loans
  };
};

router.get('/overview', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalIncome,
      totalExpenses,
      totalTransfers,
      totalOrganizations,
      totalWorklogs,
      totalLoans,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      Income.countDocuments(),
      Expense.countDocuments(),
      FamilyTransfer.countDocuments(),
      Organization.countDocuments(),
      WorkLog.countDocuments(),
      Loan.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(6).select('-password')
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers: totalUsers - activeUsers,
        adminUsers,
        totalRecords: totalIncome + totalExpenses + totalTransfers + totalOrganizations + totalWorklogs + totalLoans,
        modules: {
          income: totalIncome,
          expenses: totalExpenses,
          familyTransfers: totalTransfers,
          organizations: totalOrganizations,
          worklogs: totalWorklogs,
          loans: totalLoans
        }
      },
      recentUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', [
  query('role').optional({ checkFalsy: true }).isIn(['user', 'admin']),
  query('status').optional({ checkFalsy: true }).isIn(['active', 'suspended'])
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { role = '', status = '', q = '' } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const items = await User.find(filter).sort({ createdAt: -1 }).select('-password');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/details', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data = await loadUserDataBundle(req.params.id);
    const stats = {
      income: data.income.length,
      expenses: data.expenses.length,
      familyTransfers: data.familyTransfers.length,
      organizations: data.organizations.length,
      worklogs: data.worklogs.length,
      loans: data.loans.length,
      totalIncomeAmount: data.income.reduce((sum, item) => sum + (item.amount || 0), 0),
      totalExpenseAmount: data.expenses.reduce((sum, item) => sum + (item.amount || 0), 0),
      totalFamilyAmount: data.familyTransfers.reduce((sum, item) => sum + (item.amount || 0), 0),
      totalWorkHours: data.worklogs.reduce((sum, item) => sum + (item.hours || 0), 0),
      totalWorkNet: data.worklogs.reduce((sum, item) => sum + (item.netEarnings || 0), 0),
      totalLoanPrincipal: data.loans.reduce((sum, item) => sum + (item.principal || 0), 0)
    };

    res.json({
      user,
      stats,
      recent: {
        income: data.income.slice(0, 6),
        expenses: data.expenses.slice(0, 6),
        familyTransfers: data.familyTransfers.slice(0, 6),
        organizations: data.organizations.slice(0, 6),
        worklogs: data.worklogs.slice(0, 6),
        loans: data.loans.slice(0, 6)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/export', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data = await loadUserDataBundle(req.params.id);

    res.json({
      exportedAt: new Date().toISOString(),
      user,
      data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']),
  body('defaultCurrency').optional().isLength({ min: 3, max: 3 }),
  body('theme').optional().isIn(['light', 'dark']),
  body('avatarUrl').optional({ checkFalsy: true }).custom(isValidAvatarUrl).withMessage('Avatar URL must be a valid URL or uploaded image')
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { name, email, password, role = 'user', defaultCurrency = 'USD', theme = 'light', avatarUrl = '' } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      avatarUrl: avatarUrl?.trim() || '',
      defaultCurrency: defaultCurrency.toUpperCase(),
      theme,
      isActive: true
    });

    res.status(201).json({ item: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', [
  body('name').optional().trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['user', 'admin']),
  body('isActive').optional().isBoolean(),
  body('defaultCurrency').optional().isLength({ min: 3, max: 3 }),
  body('theme').optional().isIn(['light', 'dark']),
  body('avatarUrl').optional({ checkFalsy: true }).custom(isValidAvatarUrl).withMessage('Avatar URL must be a valid URL or uploaded image'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    if (req.user._id.toString() === req.params.id && req.body.isActive === false) {
      return res.status(400).json({ error: 'You cannot suspend your own account' });
    }

    const updates = { ...req.body };
    if (updates.defaultCurrency) updates.defaultCurrency = updates.defaultCurrency.toUpperCase();
    if (updates.avatarUrl !== undefined) updates.avatarUrl = updates.avatarUrl?.trim() || '';

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (updates.email && updates.email !== user.email) {
      const exists = await User.findOne({ email: updates.email });
      if (exists) return res.status(400).json({ error: 'Email already registered' });
    }

    Object.assign(user, updates);
    if (updates.password) user.password = updates.password;
    await user.save();

    res.json({ item: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;