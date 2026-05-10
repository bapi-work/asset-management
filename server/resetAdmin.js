import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const resetAdmin = async () => {
    try {
        // Construct MONGODB_URI (matching server.js logic)
        let mongoUri = process.env.MONGODB_URI;
        const isDefaultDockerUri = mongoUri && (mongoUri.includes('@mongodb:27017') || mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1'));

        if (process.env.MONGO_HOST && (!mongoUri || isDefaultDockerUri)) {
            const user = encodeURIComponent(process.env.MONGO_USER || 'admin');
            const pass = encodeURIComponent(process.env.MONGO_PASSWORD || 'password');
            const host = process.env.MONGO_HOST;
            const port = process.env.MONGO_PORT || '27017';
            const db = process.env.MONGO_DB || 'asset-management';
            const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
            mongoUri = `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=${authSource}`;
        } else if (!mongoUri) {
            mongoUri = 'mongodb://localhost:27017/asset-management';
        }

        // Inject credentials if the URI doesn't contain them inline
        if (mongoUri && !mongoUri.includes('@') && process.env.MONGO_USER && process.env.MONGO_PASSWORD) {
            const user = encodeURIComponent(process.env.MONGO_USER);
            const pass = encodeURIComponent(process.env.MONGO_PASSWORD);
            if (mongoUri.startsWith('mongodb+srv://')) {
                mongoUri = mongoUri.replace('mongodb+srv://', `mongodb+srv://${user}:${pass}@`);
            } else if (mongoUri.startsWith('mongodb://')) {
                mongoUri = mongoUri.replace('mongodb://', `mongodb://${user}:${pass}@`);
            }
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected.');

        const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
        const newPassword = (process.env.ADMIN_PASSWORD || 'Admin@123456').trim();

        console.log(`Searching for admin user: ${adminUsername}`);
        let user = await User.findOne({ username: adminUsername });

        if (!user) {
            console.log(`User ${adminUsername} not found. Searching for 'admin'...`);
            user = await User.findOne({ username: 'admin' });
        }

        if (!user) {
            console.log('❌ Admin user not found in database. Creating verified admin...');
            // Create new admin if completely missing
            user = new User({
                username: adminUsername,
                email: process.env.ADMIN_EMAIL || 'admin@example.com',
                password: newPassword,
                role: 'admin',
                firstName: 'System',
                lastName: 'Admin'
            });
        } else {
            console.log(`Found user: ${user.username}. Updating password...`);
            user.password = newPassword;
        }

        await user.save();
        console.log('✅ Admin password updated successfully!');
        console.log(`Username: ${user.username}`);
        console.log(`Password: ${newPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

resetAdmin();
