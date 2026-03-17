const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize, testConnection } = require('../config/database');
const { User } = require('../models');

// Admin user data
const adminUser = {
  name: 'Admin',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin'
};

// Seed admin user
const seedAdmin = async () => {
  try {
    await testConnection();
    console.log('✓ Database connection established\n');

    await sequelize.sync({ alter: true });
    console.log('✓ Database tables synchronized\n');

    // Check if admin exists
    const existingAdmin = await User.findOne({ where: { email: adminUser.email } });
    
    if (existingAdmin) {
      console.log('⚠ Admin user already exists!\n');
      console.log('Login with these credentials:\n');
      console.log('═══════════════════════════════════════');
      console.log(`Email: ${adminUser.email}`);
      console.log(`Password: ${adminUser.password}`);
      console.log('═══════════════════════════════════════\n');
      console.log('Steps to access Admin Dashboard:');
      console.log('1. Go to http://localhost:3000/login');
      console.log('2. Enter email: admin@example.com');
      console.log('3. Enter password: admin123');
      console.log('4. Click Login');
      console.log('5. Redirect to http://localhost:3000/dashboard');
      console.log('6. Click "Admin Dashboard" link\n');
      await sequelize.close();
      process.exit(0);
    }

    // Create admin user
    console.log('📝 Creating admin user...\n');
    const admin = await User.create(adminUser);

    console.log('✓ Admin user created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminUser.password}`);
    console.log(`Role: ${adminUser.role}`);
    console.log('═══════════════════════════════════════\n');

    console.log('Next Steps:');
    console.log('───────────────────────────────────────');
    console.log('1. Start the server:');
    console.log('   npm run dev\n');
    console.log('2. Visit login page:');
    console.log('   http://localhost:3000/login\n');
    console.log('3. Login with:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${adminUser.password}\n`);
    console.log('4. Click "Admin Dashboard" in your dashboard');
    console.log('   OR go directly to: http://localhost:3000/admin\n');
    console.log('───────────────────────────────────────\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
};

// Run the seed
seedAdmin();
