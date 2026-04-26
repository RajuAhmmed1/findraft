// Generic paginated list + CRUD helpers
// hasOrgField: pass true only for WorkLog which has an organization ref
const buildQuery = (Model, userField = 'user', hasOrgField = false) => {
  const maybePopulate = (query) =>
    hasOrgField ? query.populate('organization', 'name hourlyRate taxPercent currency color') : query;

  return {
    async list(req, res) {
      try {
        const { month, year, startDate, endDate, category, page = 1, limit = 100 } = req.query;
        const filter = { [userField]: req.user._id };

        if (month && year) {
          const start = new Date(parseInt(year), parseInt(month) - 1, 1);
          const end   = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
          filter.date = { $gte: start, $lte: end };
        } else if (startDate && endDate) {
          filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
        } else if (year) {
          filter.date = { $gte: new Date(parseInt(year), 0, 1), $lte: new Date(parseInt(year), 11, 31, 23, 59, 59) };
        }

        if (category) filter.category = category;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [items, total] = await Promise.all([
          maybePopulate(Model.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit))),
          Model.countDocuments(filter)
        ]);
        res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    async create(req, res, beforeSave) {
      try {
        const data = { ...req.body, [userField]: req.user._id };
        if (beforeSave) await beforeSave(data, req);
        const item = await Model.create(data);
        const found = await maybePopulate(Model.findById(item._id));
        res.status(201).json({ item: found || item });
      } catch (err) {
        if (err.name === 'ValidationError') {
          const msg = Object.values(err.errors)[0].message;
          return res.status(400).json({ error: msg });
        }
        res.status(500).json({ error: err.message });
      }
    },

    async update(req, res, beforeSave) {
      try {
        const item = await Model.findOne({ _id: req.params.id, [userField]: req.user._id });
        if (!item) return res.status(404).json({ error: 'Not found' });
        // Only assign fields defined in the schema — skip user/id overrides
        const allowed = Object.keys(Model.schema.paths).filter(k => !['_id','__v', userField].includes(k));
        allowed.forEach(k => { if (req.body[k] !== undefined) item[k] = req.body[k]; });
        if (beforeSave) await beforeSave(item, req);
        await item.save();
        const found = await maybePopulate(Model.findById(item._id));
        res.json({ item: found || item });
      } catch (err) {
        if (err.name === 'ValidationError') {
          const msg = Object.values(err.errors)[0].message;
          return res.status(400).json({ error: msg });
        }
        res.status(500).json({ error: err.message });
      }
    },

    async remove(req, res) {
      try {
        const item = await Model.findOneAndDelete({ _id: req.params.id, [userField]: req.user._id });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    async getOne(req, res) {
      try {
        const item = await maybePopulate(Model.findOne({ _id: req.params.id, [userField]: req.user._id }));
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json({ item });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  };
};

module.exports = { buildQuery };
