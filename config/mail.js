const nodemailer = require('nodemailer');

const isDev = process.env.NODE_ENV !== 'production';

// Create a pooled Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,                 // STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER, // your Gmail address
    pass: process.env.SMTP_PASS  // the 16-char App Password
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  connectionTimeout: 15_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000
});

/**
 * Send an email. In dev, if Gmail fails (e.g., wrong creds),
 * we log the message so you can still continue flows like MFA.
 */
async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || 'photo-marketplace <no-reply@example.com>';
  try {
    return await transporter.sendMail({ from, to, subject, text, html });
  } catch (err) {
    console.warn('[MAIL] send failed:', err.message);
    if (isDev) {
      console.log('[DEV ONLY] Email fallback (not sent):');
      console.log('TO:', to);
      console.log('SUBJECT:', subject);
      console.log('TEXT:', text);
      if (html) console.log('HTML:', html);
      return { devFallback: true };
    }
    throw err;
  }
}

module.exports = { sendMail };
