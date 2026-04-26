const router = require('express').Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const FamilyTransfer = require('../models/FamilyTransfer');
const WorkLog = require('../models/WorkLog');

router.use(auth);

// GET /api/reports/summary?year=2024
router.get('/summary', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    // Mongoose aggregation requires explicit ObjectId cast
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const dateFilter = {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31, 23, 59, 59)
    };

    const monthlyAgg = (Model, field = 'amount') => Model.aggregate([
      { $match: { user: userId, date: dateFilter } },
      { $group: {
        _id: { month: { $month: '$date' }, year: { $year: '$date' } },
        total: { $sum: `$${field}` },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.month': 1 } }
    ]);

    const workAgg = WorkLog.aggregate([
      { $match: { user: userId, date: dateFilter } },
      { $group: {
        _id: { month: { $month: '$date' }, year: { $year: '$date' } },
        totalHours: { $sum: '$hours' },
        totalGross: { $sum: { $multiply: ['$hours', '$hourlyRateSnapshot'] } },
        totalNet: { $sum: { $multiply: ['$hours', '$hourlyRateSnapshot', { $subtract: [1, { $divide: ['$taxPercentSnapshot', 100] }] }] } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.month': 1 } }
    ]);

    const [income, expenses, family, work] = await Promise.all([
      monthlyAgg(Income),
      monthlyAgg(Expense),
      monthlyAgg(FamilyTransfer),
      workAgg
    ]);

    // Build months 1-12
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const inc = income.find(x => x._id.month === m)?.total || 0;
      const exp = expenses.find(x => x._id.month === m)?.total || 0;
      const fam = family.find(x => x._id.month === m)?.total || 0;
      const wk = work.find(x => x._id.month === m) || {};
      return {
        month: m,
        year,
        income: Math.round(inc * 100) / 100,
        expenses: Math.round(exp * 100) / 100,
        familyTransfers: Math.round(fam * 100) / 100,
        savings: Math.round((inc - exp - fam) * 100) / 100,
        workHours: Math.round((wk.totalHours || 0) * 100) / 100,
        workGross: Math.round((wk.totalGross || 0) * 100) / 100,
        workNet: Math.round((wk.totalNet || 0) * 100) / 100,
        savingsRate: inc > 0 ? Math.round(((inc - exp - fam) / inc) * 100) : 0
      };
    });

    // Totals
    const totals = months.reduce((acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      familyTransfers: acc.familyTransfers + m.familyTransfers,
      savings: acc.savings + m.savings,
      workHours: acc.workHours + m.workHours,
      workGross: acc.workGross + m.workGross,
      workNet: acc.workNet + m.workNet,
    }), { income: 0, expenses: 0, familyTransfers: 0, savings: 0, workHours: 0, workGross: 0, workNet: 0 });

    res.json({ months, totals, year });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/expenses-by-category?month=3&year=2024
router.get('/expenses-by-category', async (req, res) => {
  try {
    const { month, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59);

    const data = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/work-by-org?month=3&year=2024
router.get('/work-by-org', async (req, res) => {
  try {
    const { month, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59);

    const data = await WorkLog.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: {
        _id: '$organization',
        totalHours: { $sum: '$hours' },
        totalGross: { $sum: { $multiply: ['$hours', '$hourlyRateSnapshot'] } },
        totalNet:   { $sum: { $multiply: ['$hours', '$hourlyRateSnapshot', { $subtract: [1, { $divide: ['$taxPercentSnapshot', 100] }] }] } }
      }},
      { $lookup: { from: 'organizations', localField: '_id', foreignField: '_id', as: 'org' } },
      { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
      { $sort: { totalNet: -1 } }
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/analytics?year=2024  — insights: top org, top expense category, trend
router.get('/analytics', async (req, res) => {
  try {
    const year   = parseInt(req.query.year) || new Date().getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const dateFilter = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };

    const [topOrgs, topExpCats, monthlyIncome, monthlyExpenses] = await Promise.all([
      // Most profitable organization (by net earnings)
      WorkLog.aggregate([
        { $match: { user: userId, date: dateFilter } },
        { $group: {
          _id: '$organization',
          totalNet:   { $sum: { $multiply: ['$hours', '$hourlyRateSnapshot', { $subtract: [1, { $divide: ['$taxPercentSnapshot', 100] }] }] } },
          totalHours: { $sum: '$hours' },
          totalGross: { $sum: { $multiply: ['$hours', '$hourlyRateSnapshot'] } }
        }},
        { $lookup: { from: 'organizations', localField: '_id', foreignField: '_id', as: 'org' } },
        { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
        { $sort: { totalNet: -1 } },
        { $limit: 3 }
      ]),

      // Highest expense categories
      Expense.aggregate([
        { $match: { user: userId, date: dateFilter } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]),

      // Monthly income trend
      Income.aggregate([
        { $match: { user: userId, date: dateFilter } },
        { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]),

      // Monthly expense trend
      Expense.aggregate([
        { $match: { user: userId, date: dateFilter } },
        { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Derive insights text
    const insights = [];
    if (topOrgs.length > 0) {
      const best = topOrgs[0];
      insights.push({ type: 'top_org', title: 'Most Profitable Organization', value: best.org?.name || 'Unknown', detail: `$${Math.round(best.totalNet)} net from ${best.totalHours}h` });
    }
    if (topExpCats.length > 0) {
      const top = topExpCats[0];
      insights.push({ type: 'top_expense', title: 'Highest Expense Category', value: top._id, detail: `$${Math.round(top.total)} across ${top.count} entries` });
    }

    // Savings trend direction
    const months = Array.from({ length: 12 }, (_, i) => {
      const inc = monthlyIncome.find(x => x._id === i+1)?.total || 0;
      const exp = monthlyExpenses.find(x => x._id === i+1)?.total || 0;
      return { month: i+1, savings: inc - exp };
    }).filter(m => m.savings !== 0);

    if (months.length >= 2) {
      const first = months[0].savings, last = months[months.length-1].savings;
      const trend = last > first ? 'improving' : 'declining';
      insights.push({ type: 'trend', title: 'Savings Trend', value: trend, detail: `From $${Math.round(first)} to $${Math.round(last)}` });
    }

    res.json({ topOrgs, topExpCats, monthlyIncome, monthlyExpenses, insights, year });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
