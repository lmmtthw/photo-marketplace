const mongoose = require('mongoose');

const MfaCodeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

module.exports =
  mongoose.models.MfaCode || mongoose.model('MfaCode', MfaCodeSchema);
