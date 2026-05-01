import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Settings = ({ settings, onSettingsUpdate }) => {
  const [formData, setFormData] = useState(settings || {});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put('/api/settings', formData);
      onSettingsUpdate(response.data);
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!formData.gmailEmail && !formData.office365Email && !formData.sendgridApiKey) {
      setMessage('Error: Please enter and save credentials before testing.');
      return;
    }

    const testAddress = prompt("Enter an email address to send a test message to:");
    if (!testAddress) return;

    setLoading(true);
    try {
      await axios.post('/api/settings/test-email', { email: testAddress });
      setMessage('Success: Test email sent! Check your inbox.');
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>

      {message && (
        <div className={`p-4 rounded-lg font-medium border ${message.includes('Success') || message.includes('successfully') ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Branding */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Company Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Address</label>
              <textarea
                name="companyAddress"
                value={formData.companyAddress || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Logo URL</label>
              <input
                type="url"
                name="companyLogo"
                value={formData.companyLogo || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Website</label>
              <input
                type="url"
                name="companyWebsite"
                value={formData.companyWebsite || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Currency</label>
              <select
                name="currency"
                value={formData.currency || 'USD'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="INR">INR (₹)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="MYR">MYR (RM)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Header Text</label>
              <input
                type="text"
                name="headerText"
                value={formData.headerText || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Text shown in header"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Footer Text</label>
              <input
                type="text"
                name="footerText"
                value={formData.footerText || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Text shown in footer"
              />
            </div>
          </div>
        </section>

        {/* Email Configuration */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email Configuration</h2>
            <button
              onClick={handleTestEmail}
              type="button"
              disabled={loading}
              className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md font-medium transition"
            >
              Test Connection
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Provider</label>
              <select
                name="emailProvider"
                value={formData.emailProvider || 'gmail'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="gmail">Gmail (SMTP)</option>
                <option value="sendgrid">SendGrid</option>
                <option value="office365">Office 365</option>
              </select>
            </div>

            {formData.emailProvider === 'gmail' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gmail Email</label>
                  <input
                    type="email"
                    name="gmailEmail"
                    value={formData.gmailEmail || ''}
                    onChange={handleChange}
                    placeholder="example@gmail.com"
                    autoComplete="off"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">App Password</label>
                  <input
                    type="password"
                    name="gmailPassword"
                    value={formData.gmailPassword || ''}
                    onChange={handleChange}
                    placeholder="xxxx xxxx xxxx xxxx"
                    autoComplete="new-password"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                  <p className="text-xs text-slate-500 mt-1">Use an App Password, not your login password.</p>
                </div>
              </>
            )}

            {formData.emailProvider === 'sendgrid' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">SendGrid API Key</label>
                <input
                  type="password"
                  name="sendgridApiKey"
                  value={formData.sendgridApiKey || ''}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            )}

            {formData.emailProvider === 'office365' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Office 365 Email</label>
                  <input
                    type="email"
                    name="office365Email"
                    value={formData.office365Email || ''}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Office 365 Password</label>
                  <input
                    type="password"
                    name="office365Password"
                    value={formData.office365Password || ''}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sendAssetAssignmentNotification"
                  checked={formData.sendAssetAssignmentNotification || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-slate-700 dark:text-slate-300">Send asset assignment notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sendWarrantyExpiryNotification"
                  checked={formData.sendWarrantyExpiryNotification || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-slate-700 dark:text-slate-300">Send warranty expiry notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sendReturnReminderNotification"
                  checked={formData.sendReturnReminderNotification || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-slate-700 dark:text-slate-300">Send return reminder notifications</span>
              </label>
            </div>
          </div>
        </section>

        {/* Display Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Display Settings</h2>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="enableDarkMode"
                checked={formData.enableDarkMode || false}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-slate-700 dark:text-slate-300">Enable dark mode by default</span>
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md shadow-blue-900/20 transition-all hover:scale-[1.01]"
        >
          {loading ? 'Saving Settings...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
};

export default Settings;
