import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// First-time setup - Create admin account
router.post('/setup', async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin account already exists' });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const user = new User({
      username,
      email,
      password,
      role: 'admin'
    });

    await user.save();

    // Log activity
    await AuditLog.create({
      user: user._id,
      action: 'user_created',
      entityType: 'user',
      entityId: user._id,
      entityName: `Admin: ${username}`
    });

    res.status(201).json({ message: 'Admin account created successfully' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check DB Connection State
    if (mongoose.connection.readyState !== 1) {
      if (mongoose.connection.readyState === 2) {
        return res.status(503).json({ message: 'System is initializing. Please wait a moment and try again.' });
      }
      console.error(`⚠️ DB Not Connected (State: ${mongoose.connection.readyState}).`);
      return res.status(503).json({ message: 'Database connection is currently unavailable. Please try again later.' });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Use case-insensitive regex for username matching to prevent capitalization lockouts
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials (User not found)' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials (Password incorrect)' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is inactive' });
    }

    // Check 2FA requirement
    if (user.twoFactorEnabled) {
      return res.json({
        requiresTwoFactor: true,
        tempToken: jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '5m' })
      });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    user.lastLogin = new Date();
    await user.save();

    // Log activity
    await AuditLog.create({
      user: user._id,
      action: 'user_login',
      entityType: 'user',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ message: 'Temp token and 2FA code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Temp token expired' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // In a real implementation, verify the 2FA code against Authy/TOTP
    // For now, we'll assume verification passes
    const isValid = true;

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid 2FA code' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.toJSON());
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await AuditLog.create({
      user: req.user.userId,
      action: 'user_logout',
      entityType: 'user'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Enable 2FA
router.post('/enable-2fa', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // In a real implementation, generate and return a QR code for scanning
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
