const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const MfaCode = require('../models/MfaCode');
const { sendMail } = require('../config/mail');

const router = express.Router();
const norm = x => (x || '').trim().toLowerCase();

// Register (force MFA setup immediately: send code, do NOT log in yet)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, username } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const emailN = norm(email);
    if (await User.findOne({ email: emailN })) return res.status(400).json({ error: 'Email already in use' });

    let uname = username ? norm(username) : undefined;
    if (uname) {
      if (!/^[a-z0-9._-]{3,30}$/.test(uname)) return res.status(400).json({ error: 'Bad username' });
      if (await User.findOne({ username: uname })) return res.status(400).json({ error: 'Username already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: emailN,
      username: uname,
      passwordHash: hash,
      role: role === 'photographer' ? 'photographer' : 'user',
      mfaEmailEnabled: true // ensure enabled
    });

    // Send MFA code and require verification before granting a session
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await MfaCode.deleteMany({ user: user._id });
    await MfaCode.create({ user: user._id, codeHash, expiresAt, attempts: 0 });
    req.session.mfaUserId = user._id.toString();

    await sendMail({
      to: user.email,
      subject: 'Verify your email — photo-marketplace',
      text: `Welcome! Your 6-digit verification code is ${code}. It expires in 10 minutes.`
    });

    // do NOT set req.session.user here
    res.json({ mfaRequired: true, signup: true });
  } catch (e) {
    console.error('[REGISTER]', e);
    res.status(500).json({ error: 'Register failed' });
  }
});


// Login (password step)
router.post('/login', async (req, res) => {
  try {
    const raw = norm(req.body.identifier ?? req.body.email);
    const password = req.body.password;
    if (!raw || !password) return res.status(400).json({ error: 'Missing fields' });

    const looksEmail = raw.includes('@');
    const user = await User.findOne(looksEmail ? { email: raw } : { $or: [{ username: raw }, { email: raw }] });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    // Email MFA (enabled by default for demo)
    if (user.mfaEmailEnabled) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await bcrypt.hash(code, 8);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await MfaCode.deleteMany({ user: user._id });
      await MfaCode.create({ user: user._id, codeHash, expiresAt, attempts: 0 });
      req.session.mfaUserId = user._id.toString();

      await sendMail({
        to: user.email,
        subject: 'Your photo-marketplace sign-in code',
        text: `Your code is ${code}. It expires in 10 minutes.`
      });

      return res.json({ mfaRequired: true });
    }

    req.session.user = { _id: user._id, name: user.name, email: user.email, username: user.username, role: user.role };
    res.json({ user: req.session.user, mfaRequired: false });
  } catch (e) {
    console.error('[LOGIN]', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify MFA code
router.post('/mfa/verify', async (req, res) => {
  try {
    const code = (req.body.code || '').trim();
    const uid = req.session.mfaUserId;
    if (!uid) return res.status(400).json({ error: 'No pending MFA' });

    const rec = await MfaCode.findOne({ user: uid });
    if (!rec) return res.status(400).json({ error: 'MFA code invalid' });
    if (rec.expiresAt < new Date()) { await rec.deleteOne(); return res.status(400).json({ error: 'MFA code expired' }); }
    if (rec.attempts >= 5) { await rec.deleteOne(); return res.status(400).json({ error: 'Too many attempts' }); }

    const ok = await bcrypt.compare(code, rec.codeHash);
    if (!ok) { rec.attempts += 1; await rec.save(); return res.status(400).json({ error: 'Incorrect code' }); }

    const user = await User.findById(uid);
    if (!user) return res.status(400).json({ error: 'User not found' });

    req.session.user = { _id: user._id, name: user.name, email: user.email, username: user.username, role: user.role };
    await rec.deleteOne();
    delete req.session.mfaUserId;

    res.json({ user: req.session.user });
  } catch (e) {
    console.error('[MFA VERIFY]', e);
    res.status(500).json({ error: 'MFA verify failed' });
  }
});

// Forgot password — send reset link
router.post('/forgot', async (req, res) => {
  try {
    const email = norm(req.body.email);
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findOne({ email });

    const token = crypto.randomUUID();
    if (user) {
      await PasswordResetToken.deleteMany({ user: user._id });
      await PasswordResetToken.create({ user: user._id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
      await sendMail({
        to: user.email,
        subject: 'Reset your photo-marketplace password',
        text: `Click to reset: ${process.env.BASE_URL}/reset.html?token=${token}`
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[FORGOT]', e);
    res.status(500).json({ error: 'Could not start reset' });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Missing fields' });

    const rec = await PasswordResetToken.findOne({ token });
    if (!rec) return res.status(400).json({ error: 'Invalid token' });
    if (rec.expiresAt < new Date()) { await rec.deleteOne(); return res.status(400).json({ error: 'Token expired' }); }

    const user = await User.findById(rec.user);
    if (!user) return res.status(400).json({ error: 'User not found' });

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await rec.deleteOne();

    res.json({ ok: true });
  } catch (e) {
    console.error('[RESET]', e);
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
router.get('/me', (req, res) => { res.json({ user: req.session?.user || null }); });

module.exports = router;
