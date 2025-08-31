const mongoose = require('mongoose');


const UserSchema = new mongoose.Schema({
name: { type: String, required: true },
// Optional username (can enable username login later)
username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
email: { type: String, required: true, unique: true, lowercase: true, trim: true },
passwordHash: { type: String, required: true },
role: { type: String, enum: ['photographer', 'user'], default: 'user' },
// Email MFA toggle (ON by default for demo)
mfaEmailEnabled: { type: Boolean, default: true }
}, { timestamps: true });


module.exports = mongoose.models.User || mongoose.model('User', UserSchema);