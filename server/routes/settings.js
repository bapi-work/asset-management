import express from 'express';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { sanitizePayload } from '../utils/security.js';

const router = express.Router();

// Get settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    const settingsObj = settings.toObject();
    if (req.user.role !== 'admin') {
      delete settingsObj.gmailPassword;
      delete settingsObj.office365Password;
      delete settingsObj.sendgridApiKey;
      delete settingsObj.authyApiKey;
    }
    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update settings
router.put('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const oldSettings = settings.toObject();
    Object.assign(settings, sanitizePayload(req.body));
    settings.updatedAt = new Date();
    await settings.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'settings_updated',
      entityType: 'settings',
      changes: { before: oldSettings, after: settings.toObject() }
    });

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test Email Configuration
router.post('/test-email', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email address required' });

    // Assuming settings are saved first, test them.
    // Ideally we should test the *incoming* settings, but for security/simplicity we test *saved* settings.

    await sendEmail({
      to: email,
      subject: 'Nexus Asset Manager - Test Email',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb;">Test Successful!</h2>
          <p>Your email settings are correctly configured.</p>
          <p>Time: ${new Date().toLocaleString()}</p>
          <hr style="border:0; border-top:1px solid #eee; margin: 20px 0;">
          <small style="color: #666;">Sent from Nexus Asset Management System</small>
        </div>
      `
    });

    res.json({ message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ message: `Email failed: ${error.message}` });
  }
});

export default router;
