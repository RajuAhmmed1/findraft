const User = require('../models/User');

async function bootstrapAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || 'FinDraft Admin';

  if (!adminEmail) return;

  const existing = await User.findOne({ email: adminEmail }).select('+password');

  if (existing) {
    let changed = false;

    if (existing.role !== 'admin') {
      existing.role = 'admin';
      changed = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      changed = true;
    }
    if (changed) {
      await existing.save();
      console.log(`Admin user ensured for ${adminEmail}`);
    }
    return;
  }

  if (!adminPassword) {
    console.warn('ADMIN_EMAIL is set but ADMIN_PASSWORD is missing. Skipping admin bootstrap.');
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    isActive: true
  });

  console.log(`Admin user created for ${adminEmail}`);
}

module.exports = bootstrapAdmin;