/**
 * seedEmployees.js — Pre-create employee accounts
 *
 * IMPORTANT: This script is the ONLY way to create employee accounts.
 * There is NO public registration endpoint for employees — by design.
 *
 * Run once: node src/utils/seedEmployees.js
 *
 * Security: passwords are hashed by the Employee model's pre-save hook
 * using bcrypt with 12 salt rounds before being stored in MongoDB.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Employee = require('../models/Employee');

const EMPLOYEES = [
  {
    fullName: 'Alice Nkosi',
    username: 'alice.nkosi',
    password: 'Employee@1234',
    role: 'employee',
  },
  {
    fullName: 'Brian Dlamini',
    username: 'brian.dlamini',
    password: 'Employee@5678',
    role: 'employee',
  },
  {
    fullName: 'Carol Admin',
    username: 'carol.admin',
    password: 'Admin@SecureB1',
    role: 'admin',
  },
];

async function seed() {
  try {
   await mongoose.connect(
  process.env.MONGO_URI || 'mongodb://localhost:27017/securebank'
);
    console.log('✅ Connected to MongoDB');

    for (const emp of EMPLOYEES) {
      const exists = await Employee.findOne({ username: emp.username });
      if (exists) {
        console.log(`⚠️  Employee '${emp.username}' already exists — skipping`);
        continue;
      }
      // Password is hashed inside the pre-save hook (bcrypt, 12 rounds)
      await Employee.create(emp);
      console.log(`✅ Created employee: ${emp.username} (role: ${emp.role})`);
    }

    console.log('\n✅ Seeding complete. Employee credentials:');
    EMPLOYEES.forEach((e) =>
      console.log(`   ${e.role.toUpperCase()}: ${e.username} / ${e.password}`)
    );
    console.log('\n⚠️  Store these credentials securely. Do not commit to git.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();