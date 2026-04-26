const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/signup
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password' });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been suspended' });
    }
    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google
router.post('/google', [
  body('credential').notEmpty().withMessage('Google credential is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google auth is not configured on server' });
    }

    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email) return res.status(400).json({ error: 'Google account email not available' });

    let user = await User.findOne({ email });

    if (user && !user.isActive) {
      return res.status(403).json({ error: 'This account has been suspended' });
    }

    if (!user) {
      user = await User.create({
        name: payload?.name || email.split('@')[0],
        email,
        password: crypto.randomBytes(24).toString('hex'),
        avatarUrl: isValidAvatarUrl(payload?.picture || '') ? payload.picture : '',
      });
    } else {
      let updated = false;
      if (!user.name && payload?.name) {
        user.name = payload.name;
        updated = true;
      }
      if (!user.avatarUrl && isValidAvatarUrl(payload?.picture || '')) {
        user.avatarUrl = payload.picture;
        updated = true;
      }
      if (updated) await user.save();
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', auth, [
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('defaultCurrency').optional().isLength({ min: 3, max: 3 }),
  body('theme').optional().isIn(['light', 'dark']),
  body('avatarUrl').optional({ checkFalsy: true }).custom(isValidAvatarUrl).withMessage('Avatar URL must be a valid URL or uploaded image')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const { name, email, defaultCurrency, theme, avatarUrl, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (name) user.name = name;
    if (email) user.email = email;
    if (defaultCurrency) user.defaultCurrency = defaultCurrency.toUpperCase();
    if (theme) user.theme = theme;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl?.trim() || '';

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required to change password' });
      const ok = await user.comparePassword(currentPassword);
      if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
      user.password = newPassword;
    }

    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
