import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Asset from '../models/Asset.js';
import AssetType from '../models/AssetType.js';
import Employee from '../models/Employee.js';
import Location from '../models/Location.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import Assignment from '../models/Assignment.js';

dotenv.config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/asset-management';

/**
 * Initialize Database - Creates collections and default data
 */
async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');

  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000
      });
      console.log('✅ MongoDB connected successfully');
    } else {
      console.log('📡 Using existing MongoDB connection...');
    }

    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('⏭️  Database already initialized. Skipping setup.');
      return;
    }

    console.log('🔄 Initializing database collections and default data...\n');

    // 1. Create default admin user
    console.log('👤 Creating default admin user...');
    const adminUser = await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@company.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      department: 'IT',
      isActive: true
    });
    console.log('✅ Admin user created:', adminUser.username);

    // 2. Create default asset types
    console.log('\n📦 Creating default asset types...');
    const assetTypes = await AssetType.insertMany([
      {
        name: 'Laptop',
        description: 'Portable computing devices',
        depreciationRate: 20,
        warrantyMonths: 24,
        isActive: true
      },
      {
        name: 'Desktop',
        description: 'Desktop computing systems',
        depreciationRate: 15,
        warrantyMonths: 36,
        isActive: true
      },
      {
        name: 'Monitor',
        description: 'Display monitors and screens',
        depreciationRate: 10,
        warrantyMonths: 24,
        isActive: true
      },
      {
        name: 'Printer',
        description: 'Printers and multifunction devices',
        depreciationRate: 15,
        warrantyMonths: 24,
        isActive: true
      },
      {
        name: 'Furniture',
        description: 'Office furniture and fixtures',
        depreciationRate: 10,
        warrantyMonths: 60,
        isActive: true
      },
      {
        name: 'Network Equipment',
        description: 'Routers, switches, and networking devices',
        depreciationRate: 12,
        warrantyMonths: 36,
        isActive: true
      },
      {
        name: 'Mobile Device',
        description: 'Smartphones and tablets',
        depreciationRate: 25,
        warrantyMonths: 24,
        isActive: true
      },
      {
        name: 'Software License',
        description: 'Software licenses and subscriptions',
        depreciationRate: 33,
        warrantyMonths: 12,
        isActive: true
      }
    ]);
    console.log(`✅ ${assetTypes.length} asset types created`);

    // 3. Create default locations
    console.log('\n📍 Creating default locations...');
    const locations = await Location.insertMany([
      {
        name: 'Main Office',
        address: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        manager: adminUser._id,
        isActive: true
      },
      {
        name: 'Remote',
        address: 'Work from Home',
        city: 'Various',
        state: 'Various',
        country: 'USA',
        manager: adminUser._id,
        isActive: true
      },
      {
        name: 'Warehouse',
        address: '456 Storage Ln',
        city: 'Newark',
        state: 'NJ',
        zipCode: '07101',
        country: 'USA',
        manager: adminUser._id,
        isActive: true
      }
    ]);
    console.log(`✅ ${locations.length} locations created`);

    // 4. Create default employees
    console.log('\n👥 Creating default employees...');
    const employees = await Employee.insertMany([
      {
        employeeId: 'EMP001',
        firstName: 'System',
        lastName: 'Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@company.com',
        phone: '555-0100',
        department: 'IT',
        position: 'System Administrator',
        manager: adminUser._id,
        location: locations[0]._id,
        isActive: true
      },
      {
        employeeId: 'EMP002',
        firstName: 'John',
        lastName: 'Manager',
        email: 'john.manager@company.com',
        phone: '555-0101',
        department: 'Operations',
        position: 'Operations Manager',
        manager: adminUser._id,
        location: locations[0]._id,
        isActive: true
      },
      {
        employeeId: 'EMP003',
        firstName: 'Jane',
        lastName: 'Employee',
        email: 'jane.employee@company.com',
        phone: '555-0102',
        department: 'Sales',
        position: 'Sales Representative',
        manager: adminUser._id,
        location: locations[0]._id,
        isActive: true
      }
    ]);
    console.log(`✅ ${employees.length} employees created`);

    // 5. Create default system settings
    console.log('\n⚙️  Creating default system settings...');
    const settings = await Settings.create({
      companyName: process.env.COMPANY_NAME || 'Your Company Name',
      companyLogo: null,
      headerText: 'Asset Management System',
      currency: process.env.CURRENCY || 'USD',
      dateFormat: 'MM/DD/YYYY',
      timeZone: process.env.TIMEZONE || 'America/New_York',
      language: 'en',
      maintenanceMode: false,
      deprecationEnabled: true,
      qrCodeEnabled: true,
      emailNotifications: true,
      auditLoggingEnabled: true,
      backupSchedule: 'daily',
      theme: 'light',
      createdBy: adminUser._id
    });
    console.log('✅ System settings created');

    // 6. Create sample assets
    console.log('\n📊 Creating sample assets...');
    const laptopType = assetTypes.find(t => t.name === 'Laptop');
    const samples = await Asset.insertMany([
      {
        assetTag: 'ASSET-001-' + new Date().getFullYear(),
        name: 'MacBook Pro 16"',
        description: 'High-performance laptop for development',
        assetType: laptopType._id,
        type: 'hardware',
        serialNumber: 'SN123456789',
        manufacturer: 'Apple',
        model: 'MacBook Pro',
        purchaseDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        purchasePrice: 2500,
        currentValue: 2000,
        status: 'available',
        location: locations[0]._id,
        condition: 'excellent',
        createdBy: adminUser._id
      },
      {
        assetTag: 'ASSET-002-' + new Date().getFullYear(),
        name: 'Dell Monitor 27"',
        description: 'UltraHD Display Monitor',
        assetType: assetTypes.find(t => t.name === 'Monitor')._id,
        type: 'hardware',
        serialNumber: 'SN987654321',
        manufacturer: 'Dell',
        model: 'U2720Q',
        purchaseDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
        purchasePrice: 600,
        currentValue: 480,
        status: 'assigned',
        location: locations[0]._id,
        assignedTo: employees[0]._id,
        condition: 'good',
        createdBy: adminUser._id
      }
    ]);
    console.log(`✅ ${samples.length} sample assets created`);

    // 7. Create audit log for initialization
    console.log('\n📋 Creating initialization audit log...');
    await AuditLog.create({
      userId: adminUser._id,
      action: 'SYSTEM_INIT',
      entityType: 'System',
      entityId: null,
      changes: {
        description: 'Database initialization completed',
        itemsCreated: {
          users: 1,
          assetTypes: assetTypes.length,
          locations: locations.length,
          employees: employees.length,
          assets: samples.length
        }
      },
      timestamp: new Date()
    });
    console.log('✅ Audit log created');

    console.log('\n🎉 Database initialization completed successfully!\n');
    console.log('📌 Default Credentials:');
    console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@company.com'}\n`);

    console.log('✨ System is ready to use!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    // DO NOT close connection here if called from server startup
    // console.log('\n📡 MongoDB connection handle maintained');
  }
}

// Run initialization
import { fileURLToPath } from 'url';

// Only run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default initializeDatabase;
