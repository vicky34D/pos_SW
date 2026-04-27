const db = require('./db').db;
const { seedOrganizationData } = require('./db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('password123', salt);

  const orgId = uuidv4();
  db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'Test Org');

  const userId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, org_id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, orgId, 'admin@example.com', password_hash, 'Admin User', 'Admin');

  seedOrganizationData(orgId, 'Test Org');
  console.log('Dummy admin created: admin@example.com / password123');
}

createAdmin();
