import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

const createTransporter = async () => {
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            throw new Error('System settings not configured');
        }

        let transporterConfig = {};

        switch (settings.emailProvider) {
            case 'gmail':
                if (!settings.gmailEmail || !settings.gmailPassword) {
                    throw new Error('Gmail credentials incomplete');
                }
                transporterConfig = {
                    service: 'gmail',
                    auth: {
                        user: settings.gmailEmail,
                        pass: settings.gmailPassword // Note: App Password required for Gmail
                    }
                };
                break;

            case 'office365':
                if (!settings.office365Email || !settings.office365Password) {
                    throw new Error('Office 365 credentials incomplete');
                }
                transporterConfig = {
                    host: 'smtp.office365.com',
                    port: 587,
                    secure: false, // STARTTLS
                    auth: {
                        user: settings.office365Email,
                        pass: settings.office365Password
                    },
                    tls: { minVersion: 'TLSv1.2' }
                };
                break;

            case 'sendgrid':
                if (!settings.sendgridApiKey) {
                    throw new Error('SendGrid API Key missing');
                }
                transporterConfig = {
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'apikey',
                        pass: settings.sendgridApiKey
                    }
                };
                break;

            default:
                throw new Error(`Unsupported email provider: ${settings.emailProvider}`);
        }

        return { transporter: nodemailer.createTransport(transporterConfig), from: settings.gmailEmail || settings.office365Email || 'noreply@nexusasset.com' };
    } catch (error) {
        console.error('Email Setup Error:', error);
        throw error;
    }
};

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const { transporter, from } = await createTransporter();

        // Verify connection
        await transporter.verify();

        const info = await transporter.sendMail({
            from: `"Nexus Asset Manager" <${from}>`,
            to,
            subject,
            html
        });

        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Send Email Error:', error);
        throw error;
    }
};
