import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  companyName: String,
  companyAddress: String,
  contactEmail: String,
  contactNumber: String,
  companyLogo: String,
  companyWebsite: String,
  headerText: String,
  footerText: String,
  primaryColor: {
    type: String,
    default: '#2563eb'
  },
  currency: {
    type: String,
    default: 'USD'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY'
  },

  // Email Settings
  emailProvider: {
    type: String,
    enum: ['sendgrid', 'gmail', 'office365'],
    default: 'gmail'
  },
  sendgridApiKey: String,
  gmailEmail: String,
  gmailPassword: String,
  office365Email: String,
  office365Password: String,

  // Email Notifications
  sendAssetAssignmentNotification: {
    type: Boolean,
    default: true
  },
  sendWarrantyExpiryNotification: {
    type: Boolean,
    default: true
  },
  sendReturnReminderNotification: {
    type: Boolean,
    default: true
  },
  warrantyExpiryNotificationDaysBefore: {
    type: Number,
    default: 30
  },

  // 2FA Settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorProvider: {
    type: String,
    enum: ['authy', 'microsoft_authenticator', 'totp'],
    default: 'totp'
  },
  authyApiKey: String,

  // System Settings
  assetQRCodeFormat: {
    type: String,
    enum: ['asset_tag', 'asset_id', 'custom'],
    default: 'asset_tag'
  },
  enableDarkMode: {
    type: Boolean,
    default: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Settings', settingsSchema);
